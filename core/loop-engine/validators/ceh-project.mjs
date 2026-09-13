/* ЦЕХ · Universal Loop Engine — validators/ceh-project.mjs
   CehProjectValidator: прогоняет СУЩЕСТВУЮЩИЕ скрипты приёмки цеха как валидатор цикла.

   Это главный валидатор для проектов sites/: он превращает ворота G3/G4 и К-09
   («проект не принимается без зелёного validate.mjs») в автоматический feedback,
   который возвращается модели на следующей итерации.

   Существующие scripts/ НЕ изменяются — вызываются отдельным процессом (child_process,
   shell:false), ровно как предписывал Python-патч («не ломай существующие studio/scripts/»).

   Форматы отчётов, которые мы разбираем:
     validate.mjs      «OK  V-01 заголовок · деталь» / «FAIL V-04 …» / «ИТОГ: 17/17 · exit 0»
     lint-slop.mjs     «index.html:12 B-01 «transition: all»», «site/* B-08 …», «чисто: …»
     lint-copy.mjs     «site/index.html:12 B-17 сообщение -> "строка"»
     lint-marketing    «  M-02: сообщение»
*/

import { relative, resolve } from "node:path";

import { createFeedback, getFirst } from "../base.mjs";
import { runCommand } from "../subprocess.mjs";
import { truncate } from "../text.mjs";
import { writeArtifact } from "../workspace.mjs";

/** Реестр проверок: имя → скрипт цеха + режим разбора отчёта. */
export const CEH_CHECKS = Object.freeze({
  validate: { script: "scripts/validate.mjs", title: "validate.mjs · V-01…V-17 (К-09)", mode: "validate" },
  "lint-slop": { script: "scripts/lint-slop.mjs", title: "BANNED B-01…B-16 (К-04)", mode: "codes" },
  "lint-copy": { script: "scripts/lint-copy.mjs", title: "редполитика B-17/B-18/B-21/B-23", mode: "codes" },
  "lint-marketing": { script: "scripts/lint-marketing.mjs", title: "маркетинг-архитектура M-01…M-05 (К-16)", mode: "codes" },
  "lint-contrast": { script: "scripts/lint-contrast.mjs", title: "контраст WCAG AA (Q-12, К-14)", mode: "codes" },
  typographer: { script: "scripts/typographer.mjs", title: "русская типографика (V-13)", mode: "exit" },
  "lint-style-archetype": { script: "scripts/lint-style-archetype.mjs", title: "архетип стиля (V-17, К-20)", mode: "exit" },
  "lint-video-engine": { script: "scripts/lint-video-engine.mjs", title: "code-video детерминизм (V-15, К-19)", mode: "exit" },
});

export const DEFAULT_CHECKS = Object.freeze(["validate", "lint-slop", "lint-copy", "lint-marketing"]);

const VALIDATE_ROW = /^(OK|FAIL)\s+([A-Z]{1,2}-\d{2})\s+(.*?)\s+·\s+(.*)$/;
const VALIDATE_TOTAL = /ИТОГ:\s*(\d+)\s*\/\s*(\d+)/;
/* Три формы строк линтеров цеха:
     index.html:12 B-01 «transition: all»        (файл:строка код сообщение)
     site/* B-08 единственный шрифт «Inter»      (файл код сообщение)
     M-02: страница без точки конверсии          (код сообщение) */
const CODE_WITH_LINE = /^([\w./*-]+):(\d+)\s+([A-Z]{1,2}-\d{2})\b[:\s]*(.*)$/;
const CODE_WITH_FILE = /^([\w./*-]+)\s+([A-Z]{1,2}-\d{2})\b[:\s]*(.*)$/;
const CODE_ONLY = /^([A-Z]{1,2}-\d{2})\b[:\s]*(.*)$/;

export class CehProjectValidator {
  static requires = Object.freeze(["studioRoot", "projectName", "projectDir", "workspaceDir"]);

  /** @param {Record<string, any>} [opts] */
  constructor(opts = {}) {
    this.studioRoot = opts.studioRoot ? resolve(String(opts.studioRoot)) : resolve(process.cwd());
    this.projectName = String(opts.projectName ?? "default");
    this.projectDir = resolve(String(opts.projectDir ?? resolve(this.studioRoot, "projects", this.projectName)));
    this.workspaceDir = resolve(String(opts.workspaceDir ?? resolve(this.projectDir, "workspace")));

    const rawChecks = getFirst(opts, ["checks"], DEFAULT_CHECKS) ?? DEFAULT_CHECKS;
    this.checks = (Array.isArray(rawChecks) ? rawChecks : [rawChecks]).map(String).filter(Boolean);
    this.ignoreCodes = (getFirst(opts, ["ignoreCodes", "ignore_codes"], []) ?? []).map(String);
    this.timeoutMs = Number(getFirst(opts, ["timeoutMs", "timeout"], 120000));
    this.nodeBin = String(opts.nodeBin ?? process.execPath);
    this.maxRawChars = Number(getFirst(opts, ["maxRawChars", "max_raw_chars"], 8000));
    this.maxErrors = Number(getFirst(opts, ["maxErrors", "max_errors"], 25));

    /** Запись артефакта перед проверкой. По умолчанию — только в workspace (безопасно). */
    this.materialize = Boolean(getFirst(opts, ["materialize"], false));
    this.materializeTarget = String(getFirst(opts, ["materializeTarget", "materialize_target"], "workspace"));
    this.materializeFile = getFirst(opts, ["materializeFile", "materialize_file"], null);
    /** Явный предохранитель: писать в projects/<name>/ (а не в workspace). */
    this.allowProjectWrites = Boolean(getFirst(opts, ["allowProjectWrites", "allow_project_writes"], false));
  }

  describe() {
    return {
      type: "ceh_project",
      project: toRel(this.studioRoot, this.projectDir),
      checks: this.checks,
      ignoreCodes: this.ignoreCodes,
      materialize: this.materialize ? this.materializeTarget : false,
      timeoutMs: this.timeoutMs,
    };
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
    const metrics = { iteration, project: toRel(this.studioRoot, this.projectDir), checks: {} };
    /** @type {string[]} */
    const rawChunks = [];

    const unknown = this.checks.filter((name) => !CEH_CHECKS[name]);
    if (unknown.length > 0) {
      return createFeedback({
        ok: false,
        errors: [`неизвестные проверки: ${unknown.join(", ")}. Доступны: ${Object.keys(CEH_CHECKS).join(", ")}`],
        codes: ["E-CONFIG-CHECK"],
        raw: null,
        metrics,
      });
    }

    // 0. Материализация артефакта (если включена)
    if (this.materialize) {
      const guard = this._materializeGuard();
      if (guard) {
        return createFeedback({ ok: false, errors: [guard], codes: ["E-WRITE-GUARD"], raw: null, metrics });
      }
      try {
        const target = this.materializeTarget === "project" ? this.projectDir : this.workspaceDir;
        const written = writeArtifact(artifact, target, { defaultFilename: String(this.materializeFile ?? "site/index.html"), clean: false });
        metrics.materialized = written.files.map((f) => `${this.materializeTarget}:${f.rel}`);
      } catch (e) {
        return createFeedback({
          ok: false,
          errors: [`не удалось записать артефакт перед проверкой: ${e?.message ?? e}`],
          codes: ["E-PATH"],
          raw: null,
          metrics,
        });
      }
    }

    const projectArg = toRel(this.studioRoot, this.projectDir);

    // 1. Прогон проверок
    for (const name of this.checks) {
      const check = CEH_CHECKS[name];
      const res = runCommand(this.nodeBin, [check.script, projectArg], { cwd: this.studioRoot, timeoutMs: this.timeoutMs });
      const parsed = check.mode === "validate" ? parseValidateReport(res.stdout) : parseCodeLines(res.stdout, res.stderr, name);

      const failedCodes = parsed.codes.filter((code) => !this.ignoreCodes.includes(code));
      const ok = res.ok && (check.mode === "exit" || failedCodes.length === 0);

      metrics.checks[name] = {
        ok,
        title: check.title,
        exitCode: res.exitCode,
        timedOut: res.timedOut,
        durationMs: res.durationMs,
        passed: parsed.passed,
        total: parsed.total,
        codes: parsed.codes,
        ignored: parsed.codes.filter((code) => this.ignoreCodes.includes(code)),
      };

      if (res.error) {
        codes.push("E-CHECK-RUN");
        errors.push(`${name}: ${res.error} (argv: ${res.argv.join(" ")})`);
      }
      if (res.timedOut) {
        codes.push("E-TIMEOUT");
        errors.push(`${name}: таймаут ${this.timeoutMs}ms`);
      }
      if (!ok && !res.timedOut) {
        codes.push(...(failedCodes.length > 0 ? failedCodes : [`FAIL-${name.toUpperCase()}`]));
        if (parsed.rows.length > 0) errors.push(...parsed.rows.map((row) => `${name}: ${row}`));
        else errors.push(`${name}: ${check.title} — провал (exit ${res.exitCode})\n${firstLines(`${res.stdout}\n${res.stderr}`, 8)}`);
      }
      rawChunks.push(`### ${name} (exit ${res.exitCode})\n${truncate(`${res.stdout}${res.stderr ? `\n[stderr]\n${res.stderr}` : ""}`, 4000)}`);
    }

    const checkedCount = this.checks.length;
    const passedCount = Object.values(metrics.checks).filter((c) => c.ok).length;
    metrics.passedChecks = passedCount;
    metrics.totalChecks = checkedCount;

    const uniqueCodes = [...new Set(codes)];
    return createFeedback({
      ok: errors.length === 0 && passedCount === checkedCount,
      errors: [...new Set(errors)].slice(0, this.maxErrors),
      codes: uniqueCodes.length === 0 ? ["OK"] : uniqueCodes,
      raw: truncate(rawChunks.join("\n\n"), this.maxRawChars, { mode: "middle" }),
      metrics,
    });
  }

  _materializeGuard() {
    if (this.materializeTarget === "project" && !this.allowProjectWrites) {
      return (
        "validator.materialize_target=project требует явного validator.allow_project_writes: true — " +
        "движок отказывается писать в projects/ без подтверждения (защита от порчи принятых проектов)"
      );
    }
    return null;
  }
}

/**
 * Разбор отчёта validate.mjs: строки OK/FAIL + итог.
 * @param {string} stdout
 * @returns {{ rows: string[], codes: string[], passed: number|null, total: number|null }}
 */
export function parseValidateReport(stdout) {
  const src = String(stdout ?? "");
  /** @type {string[]} */
  const rows = [];
  /** @type {string[]} */
  const codes = [];
  let lastFailRow = -1;
  for (const line of src.split("\n")) {
    const m = VALIDATE_ROW.exec(line.trim());
    if (m) {
      const [, status, code, title, detail] = m;
      if (status === "FAIL") {
        rows.push(`${code} ${title} · ${detail}`);
        codes.push(code);
        lastFailRow = rows.length - 1;
      } else {
        lastFailRow = -1;
      }
      continue;
    }
    // evidence-строки validate.mjs печатаются ПОСЛЕ строки вердикта (отступ ≥3 пробелов)
    if (/^\s{3,}\S/.test(line) && lastFailRow >= 0) {
      rows[lastFailRow] += ` | ${line.trim()}`;
    }
  }
  const total = VALIDATE_TOTAL.exec(src);
  return {
    rows,
    codes: [...new Set(codes)],
    passed: total ? Number(total[1]) : null,
    total: total ? Number(total[2]) : null,
  };
}

/**
 * Универсальный разбор «file:line CODE message» для линтеров цеха.
 * @param {string} stdout
 * @param {string} stderr
 * @param {string} checkName
 */
export function parseCodeLines(stdout, stderr, checkName) {
  const src = `${String(stdout ?? "")}\n${String(stderr ?? "")}`;
  /** @type {string[]} */
  const rows = [];
  /** @type {string[]} */
  const codes = [];
  for (const rawLine of src.split("\n")) {
    const line = rawLine.trim();
    if (!line || /^(OK|FAIL|ИТОГ|чисто:|\[lint-)/.test(line)) continue;

    const withLine = CODE_WITH_LINE.exec(line);
    if (withLine) {
      const [, file, lineNo, code, message] = withLine;
      codes.push(code);
      rows.push(`${code} ${file}:${lineNo} · ${message || "нарушение"}`);
      continue;
    }
    const withFile = CODE_WITH_FILE.exec(line);
    if (withFile) {
      const [, file, code, message] = withFile;
      codes.push(code);
      rows.push(`${code} ${file} · ${message || "нарушение"}`);
      continue;
    }
    const codeOnly = CODE_ONLY.exec(line);
    if (codeOnly) {
      const [, code, message] = codeOnly;
      codes.push(code);
      rows.push(`${code} · ${message || line}`);
    }
  }
  // если скрипт упал, но кодов не напечатал — берём первые строки вывода
  if (rows.length === 0 && /наруш|error|ошибк/i.test(src)) {
    rows.push(`${checkName}: ${firstLines(src, 6)}`);
  }
  return { rows, codes: [...new Set(codes)], passed: null, total: null };
}

function firstLines(text, count) {
  return String(text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, count)
    .join("\n");
}

function toRel(root, abs) {
  return relative(resolve(root), resolve(abs)).split("\\").join("/");
}

export default CehProjectValidator;
