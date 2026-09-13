/* ЦЕХ · Universal Loop Engine — validators/node-code.mjs
   NodeCodeValidator: синтаксис → тесты (node --test) → smoke-запуск.

   Порт PythonCodeValidator из патча (ruff/pytest) на стек цеха (Node ≥18, ноль зависимостей):
     compile(code)          -> node --check
     pytest tests/…         -> node --test workspace/tests
     smoke `python main.py` -> node workspace/main.mjs
     cwd=workspace, timeout -> то же (см. subprocess.mjs)

   Исправленные баги патча:
     • тесты искались в workspace/, а шаблон клал их в tests/ → здесь tests/ копируются в workspace;
     • «python» без fallback → здесь process.execPath (тот же node, который запустил цикл);
     • не было защиты путей → safeResolveInside (запись вне workspace невозможна);
     • subprocess с shell → здесь массив аргументов и shell:false, инъекция исключена.
*/

import { copyFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

import { createFeedback, getFirst } from "../base.mjs";
import { runCommand } from "../subprocess.mjs";
import { truncate } from "../text.mjs";
import { copyDir, ensureDir, listFiles, writeArtifact } from "../workspace.mjs";

const JS_EXT = [".mjs", ".cjs", ".js"];

export class NodeCodeValidator {
  /** DI-метка для registry.mjs. */
  static requires = Object.freeze(["studioRoot", "projectName", "projectDir", "workspaceDir"]);

  /** @param {Record<string, any>} [opts] */
  constructor(opts = {}) {
    this.studioRoot = opts.studioRoot ? resolve(String(opts.studioRoot)) : resolve(process.cwd());
    this.projectName = String(opts.projectName ?? "default");
    this.projectDir = resolve(String(opts.projectDir ?? join(this.studioRoot, "projects", this.projectName)));
    this.workspaceDir = resolve(String(opts.workspaceDir ?? join(this.projectDir, "workspace")));

    this.entry = String(getFirst(opts, ["entry", "entryFilename", "filename"], "main.mjs"));
    this.testDirs = (getFirst(opts, ["testDirs", "test_dirs"], ["tests"]) ?? []).map(String);
    this.testFile = getFirst(opts, ["testFile", "testFilename", "test_filename"], null);
    this.runTests = getFirst(opts, ["runTests", "run_tests"], true) !== false;
    this.runSmoke = getFirst(opts, ["runSmoke", "run_smoke"], true) !== false;
    this.requireTests = Boolean(getFirst(opts, ["requireTests", "require_tests"], false));
    this.copyTests = getFirst(opts, ["copyTests", "copy_tests"], true) !== false;
    this.clean = getFirst(opts, ["clean", "cleanWorkspace"], true) !== false;
    this.timeoutMs = Number(getFirst(opts, ["timeoutMs", "timeout"], 60000));
    this.smokeTimeoutMs = Number(getFirst(opts, ["smokeTimeoutMs", "smoke_timeout"], 20000));
    this.nodeBin = String(opts.nodeBin ?? process.execPath);
    this.env = opts.env && typeof opts.env === "object" ? opts.env : {};
    this.maxErrorChars = Number(opts.maxErrorChars ?? 2400);
    /** Дополнительные grep-проверки: [{ code, pattern, flags, message }]. */
    this.patterns = Array.isArray(opts.patterns) ? opts.patterns : [];
  }

  describe() {
    return { type: "node_code", entry: this.entry, workspace: this.workspaceDir, runTests: this.runTests, runSmoke: this.runSmoke, timeoutMs: this.timeoutMs };
  }

  /**
   * @param {import("../base.mjs").Artifact} artifact
   * @param {import("../base.mjs").LoopState} state
   * @returns {Promise<import("../base.mjs").Feedback>}
   */
  async validate(artifact, state) {
    const iteration = Number(state?.iteration ?? 0);
    /** @type {string[]} */
    const errors = [];
    /** @type {string[]} */
    const codes = [];
    /** @type {Record<string, any>} */
    const metrics = { iteration, workspace: this.workspaceDir };
    /** @type {Record<string, any>} */
    const raw = {};

    ensureDir(this.workspaceDir);

    // 1. Материализация артефакта (строка → entry-файл; карта → файлы)
    let written;
    try {
      written = writeArtifact(artifact, this.workspaceDir, { defaultFilename: this.entry, clean: this.clean });
    } catch (e) {
      return createFeedback({
        ok: false,
        errors: [`не удалось записать артефакт: ${e?.message ?? e}`],
        codes: ["E-PATH"],
        raw: null,
        metrics,
      });
    }
    metrics.files = written.files.map((f) => f.rel);
    metrics.chars = written.files.reduce((sum, f) => sum + f.chars, 0);

    // 2. Grep-проверки из конфига (например, запрет transition: all в сгенерированном JS)
    for (const rule of this.patterns) {
      if (!rule?.pattern) continue;
      const re = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(String(rule.pattern), rule.flags ?? "i");
      for (const file of written.files) {
        const hits = countMatches(file.abs, re);
        if (hits > 0) {
          codes.push(String(rule.code ?? "E-PATTERN"));
          errors.push(`${rule.message ?? "запрещённый паттерн"} (${file.rel}: ${hits} совпад.)`);
        }
      }
    }

    // 3. Синтаксис
    const jsFiles = written.files.filter((f) => JS_EXT.includes(extOf(f.rel))).slice(0, 12);
    const syntaxFailures = [];
    for (const file of jsFiles) {
      const res = this._syntaxCheck(file.abs);
      if (!res.ok) syntaxFailures.push(`${file.rel}: ${firstMeaningful(res.stderr) || res.error || "ошибка разбора"}`);
    }
    if (syntaxFailures.length > 0) {
      codes.push("E-SYN");
      errors.push(`Синтаксические ошибки:\n${syntaxFailures.join("\n")}`);
      raw.syntax = syntaxFailures;
      // Дальше не идём: на битом синтаксисе тесты бессмысленны.
      return createFeedback({ ok: false, errors: errors.map((e) => truncate(e, this.maxErrorChars)), codes, raw, metrics });
    }
    metrics.syntaxChecked = jsFiles.length;

    // 4. Тесты (или 5. smoke, если тестов нет)
    const testTarget = this._prepareTests();
    if (testTarget) {
      // Node ≥22 не принимает каталог как аргумент --test (трактует его как модуль),
      // поэтому передаём список файлов явно — детерминированно на любой версии.
      const res = runCommand(this.nodeBin, ["--test", ...testTarget.files], {
        cwd: this.workspaceDir,
        timeoutMs: this.timeoutMs,
        env: this._childEnv(written, iteration),
      });
      raw.tests = { argv: res.argv, exitCode: res.exitCode, timedOut: res.timedOut, stdout: truncate(res.stdout, 4000), stderr: truncate(res.stderr, 2000) };
      metrics.tests = parseTapSummary(res.stdout);
      metrics.testsTarget = testTarget.files.join(" ");
      if (res.timedOut) {
        codes.push("E-TIMEOUT");
        errors.push(`тесты не завершились за ${this.timeoutMs}ms`);
      } else if (!res.ok) {
        codes.push("E-TEST");
        errors.push(`Тесты провалены:\n${summarizeTestOutput(res.stdout, res.stderr)}`);
      }
    } else if (this.requireTests) {
      codes.push("E-NO-TESTS");
      errors.push(`тесты не найдены (искал: ${this.testDirs.join(", ")}${this.testFile ? `, ${this.testFile}` : ""})`);
    } else if (this.runSmoke && written.entry) {
      const res = runCommand(this.nodeBin, [written.entry], {
        cwd: this.workspaceDir,
        timeoutMs: this.smokeTimeoutMs,
        env: this._childEnv(written, iteration),
      });
      raw.smoke = { argv: res.argv, exitCode: res.exitCode, timedOut: res.timedOut, stderr: truncate(res.stderr, 3000), stdout: truncate(res.stdout, 1500) };
      if (res.timedOut) {
        codes.push("E-TIMEOUT");
        errors.push(`smoke-запуск не завершился за ${this.smokeTimeoutMs}ms`);
      } else if (!res.ok) {
        codes.push("E-RUN");
        errors.push(`Runtime-ошибка:\n${firstMeaningful(res.stderr) || firstMeaningful(res.stdout) || `exit ${res.exitCode}`}`);
      }
    }

    if (codes.length === 0) codes.push("OK");
    return createFeedback({
      ok: errors.length === 0,
      errors: errors.map((e) => truncate(e, this.maxErrorChars)),
      codes,
      raw,
      metrics,
    });
  }

  /** node --check; для .js с ESM-синтаксисом — повторная проверка копией как .mjs. */
  _syntaxCheck(absFile) {
    const first = runCommand(this.nodeBin, ["--check", absFile], { cwd: this.workspaceDir, timeoutMs: 20000 });
    if (first.ok) return first;
    const looksLikeEsm = /Cannot use import statement outside a module|Unexpected token 'export'|require is not defined in ES module scope/.test(
      first.stderr ?? "",
    );
    if (looksLikeEsm && extOf(absFile) === ".js") {
      const alias = `${absFile}.loopcheck.mjs`;
      try {
        copyFileSync(absFile, alias);
        return runCommand(this.nodeBin, ["--check", alias], { cwd: this.workspaceDir, timeoutMs: 20000 });
      } catch {
        return first;
      } finally {
        rmSync(alias, { force: true });
      }
    }
    return first;
  }

  /**
   * Ищет тесты проекта и возвращает список файлов для `node --test`
   * (пути относительно workspace — запуск идёт с cwd=workspace).
   * @returns {{ files: string[], abs: string[] }|null}
   */
  _prepareTests() {
    if (!this.runTests) return null;
    const asResult = (absList) => {
      const files = absList.map((abs) => toRel(this.workspaceDir, abs)).filter((rel) => !rel.startsWith(".."));
      return files.length > 0 ? { files, abs: absList } : null;
    };

    if (this.testFile) {
      const candidates = [
        resolve(this.workspaceDir, String(this.testFile)),
        resolve(this.projectDir, String(this.testFile)),
        resolve(this.projectDir, "tests", String(this.testFile)),
      ];
      for (const candidate of candidates) {
        if (!existsSync(candidate)) continue;
        if (candidate.startsWith(this.workspaceDir)) return asResult([candidate]);
        const dstDir = join(this.workspaceDir, "tests");
        copyDir(resolve(candidate, ".."), dstDir, {});
        const dst = join(dstDir, basename(candidate));
        return existsSync(dst) ? asResult([dst]) : null;
      }
      return null;
    }

    /** @type {string[]} */
    const found = [];
    for (const rel of this.testDirs) {
      const srcDir = resolve(this.projectDir, rel);
      if (!existsSync(srcDir)) continue;
      const dstDir = join(this.workspaceDir, rel);
      if (this.copyTests) copyDir(srcDir, dstDir, {});
      const targetDir = existsSync(dstDir) ? dstDir : srcDir;
      found.push(
        ...listFiles(targetDir, { maxDepth: 3 }).filter(
          (f) => /\.(test|spec)\.(mjs|cjs|js)$/.test(basename(f)) || /^test[-_.].+\.(mjs|cjs|js)$/.test(basename(f)),
        ),
      );
    }
    return asResult([...new Set(found)]);
  }

  _childEnv(written, iteration) {
    return {
      LOOP_ENTRY: written.entry ? toRel(this.workspaceDir, written.entry) : this.entry,
      LOOP_WORKSPACE: this.workspaceDir,
      LOOP_PROJECT_DIR: this.projectDir,
      LOOP_STUDIO_ROOT: this.studioRoot,
      LOOP_PROJECT: this.projectName,
      LOOP_ITERATION: String(iteration),
      NODE_ENV: "test",
      ...this.env,
    };
  }
}

/* ——— локальные хелперы ——— */

function extOf(name) {
  const base = basename(String(name));
  const idx = base.lastIndexOf(".");
  return idx < 0 ? "" : base.slice(idx).toLowerCase();
}

function toRel(root, abs) {
  return relative(resolve(root), resolve(abs)).split("\\").join("/");
}

function countMatches(absFile, re) {
  try {
    const text = readFileSync(absFile, "utf8");
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    return (text.match(new RegExp(re.source, flags)) ?? []).length;
  } catch {
    return 0;
  }
}

function firstMeaningful(text) {
  const src = String(text ?? "").trim();
  if (!src) return "";
  const lines = src.split("\n").filter((l) => l.trim() !== "");
  const interesting = lines.filter((l) => /Error|error:|SyntaxError|TypeError|AssertionError|failed|Expected|actual/.test(l));
  return (interesting.length > 0 ? interesting : lines).slice(0, 12).join("\n");
}

/** Из TAP-вывода node --test: сколько прошло/упало. */
export function parseTapSummary(stdout) {
  const src = String(stdout ?? "");
  const grab = (label) => {
    const m = new RegExp(`^#\\s*${label}\\s+(\\d+)`, "m").exec(src);
    return m ? Number(m[1]) : null;
  };
  const duration = /^#\s*duration_ms\s+([\d.]+)/m.exec(src);
  return { pass: grab("pass"), fail: grab("fail"), tests: grab("tests"), skipped: grab("skipped"), durationMs: duration ? Number(duration[1]) : null };
}

/** Сжимает вывод тестов до существенных строк (иначе фидбек раздует контекст). */
export function summarizeTestOutput(stdout, stderr) {
  const src = `${String(stdout ?? "")}\n${String(stderr ?? "")}`;
  const lines = src.split("\n");
  const keep = lines.filter((line) =>
    /^(not ok|# Subtest|# fail|# pass|Error|AssertionError|\s+at |\s+\+|\s+-|\s+code:|\s+expected|\s+actual|.*✖|.*failed)/.test(line),
  );
  const body = (keep.length > 0 ? keep : lines).filter((l) => l.trim() !== "");
  return truncate(body.slice(0, 60).join("\n"), 2400);
}

export default NodeCodeValidator;
