/* ЦЕХ · Universal Loop Engine — validators/python-code.mjs
   PythonCodeValidator — прямой порт одноимённого валидатора из Python-патча
   (syntax → ruff → pytest → smoke), но вызываемый из Node-цикла через subprocess.

   Нужен только если проект генерирует Python-артефакты. В цехе Python-файлов нет,
   поэтому валидатор опционален и в шаблоне не включён; при отсутствии ruff/pytest
   он не падает, а честно пишет «пропущено» в metrics (graceful degradation).
*/

import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { createFeedback, getFirst } from "../base.mjs";
import { hasExecutable, resolvePythonBin, runCommand } from "../subprocess.mjs";
import { truncate } from "../text.mjs";
import { copyDir, ensureDir, writeArtifact } from "../workspace.mjs";

export const DEFAULT_RUFF_ARGS = Object.freeze([
  "check",
  "--select=E,F,W,I,N,UP,B,C4,PL,RUF,SIM,T20,PIE,PT,TRY",
  "--output-format=concise",
]);

export class PythonCodeValidator {
  static requires = Object.freeze(["studioRoot", "projectName", "projectDir", "workspaceDir"]);

  /** @param {Record<string, any>} [opts] */
  constructor(opts = {}) {
    this.studioRoot = opts.studioRoot ? resolve(String(opts.studioRoot)) : resolve(process.cwd());
    this.projectName = String(opts.projectName ?? "default");
    this.projectDir = resolve(String(opts.projectDir ?? join(this.studioRoot, "projects", this.projectName)));
    this.workspaceDir = resolve(String(opts.workspaceDir ?? join(this.projectDir, "workspace")));

    this.entry = String(getFirst(opts, ["entry", "filename"], "main.py"));
    this.testFile = getFirst(opts, ["testFile", "testFilename", "test_filename"], "test_generated.py");
    this.testDirs = (getFirst(opts, ["testDirs", "test_dirs"], ["tests"]) ?? []).map(String);
    this.ruffArgs = (getFirst(opts, ["ruffArgs", "ruff_args"], DEFAULT_RUFF_ARGS) ?? []).map(String);
    this.runLint = getFirst(opts, ["runLint", "run_lint"], true) !== false;
    this.requireLint = Boolean(getFirst(opts, ["requireLint", "require_lint"], false));
    this.timeoutMs = Number(getFirst(opts, ["timeoutMs", "timeout"], 60000));
    this.pythonBin = opts.pythonBin ?? null; // null → автоопределение python3/python
    this.maxErrorChars = Number(opts.maxErrorChars ?? 2400);
  }

  describe() {
    return { type: "python_code", entry: this.entry, workspace: this.workspaceDir, ruffArgs: this.ruffArgs, pythonBin: this.pythonBin ?? "auto" };
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

    const python = this.pythonBin ?? resolvePythonBin();
    if (!python) {
      return createFeedback({
        ok: false,
        errors: ["python3 не найден в PATH — валидатор python_code неприменим (возьми node_code или schema)"],
        codes: ["E-PY-MISSING"],
        raw: null,
        metrics,
      });
    }
    metrics.pythonBin = python;

    ensureDir(this.workspaceDir);
    let written;
    try {
      written = writeArtifact(artifact, this.workspaceDir, { defaultFilename: this.entry, clean: true });
    } catch (e) {
      return createFeedback({ ok: false, errors: [`не удалось записать артефакт: ${e?.message ?? e}`], codes: ["E-PATH"], raw: null, metrics });
    }
    metrics.files = written.files.map((f) => f.rel);

    const pyFiles = written.files.filter((f) => f.rel.endsWith(".py")).slice(0, 12);
    const mainFile = pyFiles.find((f) => f.rel === this.entry)?.abs ?? pyFiles[0]?.abs ?? null;

    // 1. Синтаксис (аналог compile(code, "<generated>", "exec"))
    if (mainFile) {
      const res = runCommand(python, ["-m", "py_compile", mainFile], { cwd: this.workspaceDir, timeoutMs: 20000 });
      raw.pyCompile = { exitCode: res.exitCode, stderr: truncate(res.stderr, 2000) };
      if (!res.ok) {
        codes.push("E-PY-SYN");
        errors.push(`SyntaxError:\n${firstMeaningful(res.stderr)}`);
        return createFeedback({ ok: false, errors: errors.map((e) => truncate(e, this.maxErrorChars)), codes, raw, metrics });
      }
    }

    // 2. Ruff (если установлен; иначе — честный пропуск)
    if (this.runLint) {
      if (hasExecutable("ruff")) {
        const res = runCommand("ruff", [...this.ruffArgs, ...pyFiles.map((f) => f.abs)], { cwd: this.workspaceDir, timeoutMs: 30000 });
        raw.ruff = { exitCode: res.exitCode, stdout: truncate(res.stdout, 3000) };
        if (!res.ok) {
          codes.push("E-PY-LINT");
          errors.push(`Lint (ruff):\n${truncate(res.stdout.trim() || res.stderr.trim(), 2000)}`);
        }
      } else {
        raw.ruff = "ruff не установлен — проверка пропущена";
        metrics.ruffSkipped = true;
        if (this.requireLint) {
          codes.push("E-PY-LINT-MISSING");
          errors.push("ruff не установлен, а validator.require_lint=true");
        }
      }
    }

    // 3. Pytest или smoke
    const testTarget = this._findTests();
    if (testTarget && hasExecutable(python, ["-m", "pytest", "--version"])) {
      const res = runCommand(python, ["-m", "pytest", testTarget.rel, "-q", "--tb=short", "-x"], {
        cwd: this.workspaceDir,
        timeoutMs: this.timeoutMs,
        env: { PYTHONPATH: this.workspaceDir, LOOP_ITERATION: String(iteration), LOOP_PROJECT: this.projectName },
      });
      raw.pytest = { exitCode: res.exitCode, stdout: truncate(res.stdout, 4000), stderr: truncate(res.stderr, 1500) };
      metrics.testsTarget = testTarget.rel;
      if (res.timedOut) {
        codes.push("E-TIMEOUT");
        errors.push(`pytest не завершился за ${this.timeoutMs}ms`);
      } else if (!res.ok) {
        codes.push("E-PY-TEST");
        errors.push(`Тесты провалены:\n${truncate((res.stdout || res.stderr).trim(), 2000)}`);
      }
    } else if (mainFile) {
      const res = runCommand(python, [mainFile], { cwd: this.workspaceDir, timeoutMs: 30000, env: { PYTHONPATH: this.workspaceDir } });
      raw.smoke = { exitCode: res.exitCode, stderr: truncate(res.stderr, 3000) };
      if (!res.ok) {
        codes.push("E-PY-RUN");
        errors.push(`Runtime-ошибка:\n${firstMeaningful(res.stderr) || `exit ${res.exitCode}`}`);
      }
    }

    if (codes.length === 0) codes.push("OK");
    return createFeedback({ ok: errors.length === 0, errors: errors.map((e) => truncate(e, this.maxErrorChars)), codes, raw, metrics });
  }

  _findTests() {
    if (!this.testFile) return null;
    const inWorkspace = resolve(this.workspaceDir, String(this.testFile));
    if (existsSync(inWorkspace)) return { rel: String(this.testFile), abs: inWorkspace };
    for (const rel of this.testDirs) {
      const srcDir = resolve(this.projectDir, rel);
      if (!existsSync(srcDir)) continue;
      const dstDir = join(this.workspaceDir, rel);
      copyDir(srcDir, dstDir, { extensions: [".py", ".txt", ".json", ".cfg", ".ini"] });
      const found = join(dstDir, basename(String(this.testFile)));
      if (existsSync(found)) return { rel: join(rel, basename(String(this.testFile))), abs: found };
    }
    const direct = resolve(this.projectDir, String(this.testFile));
    if (existsSync(direct)) {
      copyDir(this.projectDir, this.workspaceDir, { extensions: [".py"] });
      return { rel: String(this.testFile), abs: join(this.workspaceDir, String(this.testFile)) };
    }
    return null;
  }
}

function firstMeaningful(text) {
  const src = String(text ?? "").trim();
  if (!src) return "";
  return src.split("\n").filter((l) => l.trim() !== "").slice(0, 12).join("\n");
}

export default PythonCodeValidator;
