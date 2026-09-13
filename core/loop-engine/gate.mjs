#!/usr/bin/env node
/* ЦЕХ · Universal Loop Engine — gate.mjs
   Единый вход гейта К-21: принуждение закона «циклом, а не памятью агента».

   Гейт берёт КАЖДЫЙ проект из projects/ и прогоняет по ОДНОЙ итерации цикла
   (Generate → Validate → Loop) с валидатором ceh_project: тот читает проект с диска
   и запускает НАСТОЯЩИЕ скрипты приёмки (scripts/validate.mjs V-01…V-17 + линтеры).
   Никаких ключей, никакой сети, ни одного вызова LLM: генератор — mock,
   dryRun — true. Гейт ничего не собирает и не правит: он только выносит вердикт.

   Запуск:
     node core/loop-engine/gate.mjs                       # все проекты projects/
     node core/loop-engine/gate.mjs projects/pcpolimer    # точечно (позиционно или --project)
     node core/loop-engine/gate.mjs --checks validate,lint-slop --json
     npm run gate

   Уборка: цикл пишет evidence в projects/<имя>/workspace/ — если workspace/ не было до
   прогона, гейт удаляет его целиком (в принятых проектах не остаётся ничего); если он
   был — остаётся только loop-result.json поверх уже существующей рабочей зоны. --keep-workspace
   оставляет созданное (для разбора полётов в CI).

   Отчёт — в stdout (OK/FAIL/SKIP/ERR + коды V-xx/B-xx/M-xx + миллисекунды),
   служебный лог — в stderr (LOOP_ENGINE_LOG=debug|info|warn|error|silent).
   Exit 0 — все проверенные проекты прошли цикл; exit 1 — есть fail/error.
   Node ≥18, ноль npm-зависимостей, только встроенные модули.
*/

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { LoopError } from "./base.mjs";
import { DEFAULT_CHECKS } from "./validators/index.mjs";
import { createLogger, silentLogger } from "./logger.mjs";
import { buildRunnerFromConfig, saveResult } from "./registry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Корень студии: gate.mjs живёт в core/loop-engine/, значит студия — на два уровня выше. */
export const STUDIO_ROOT = resolve(HERE, "..", "..");

/** Имя гейта в отчётах (ровно как закон в CONSTITUTION.md). */
export const GATE_ID = "К-21";

/** Каталог принятых проектов относительно корня студии. */
export const PROJECTS_DIRNAME = "projects";

/** Каталоги, начинающиеся с «_», — служебные (_TEMPLATE, _history): гейт их не принимает. */
export const INTERNAL_PREFIX = "_";

/** Итог гейта: workspace-артефакт цикла (evidence) + его имя. */
export const EVIDENCE_FILE = "loop-result.json";

const HELP = `ГЕЙТ ${GATE_ID} · цикл принуждения (core/loop-engine/)

  node core/loop-engine/gate.mjs [проект…] [опции]

Аргументы
  <проект…>               projects/<имя>, голое имя (<имя>) или абсолютный путь;
                          повторяются и дедуплицируются по пути (дубль не удваивает запись)

Опции
  --project <путь>        то же, что позиционный аргумент (повторяемая)
  --checks a,b            проверки ceh_project (по умолчанию: ${DEFAULT_CHECKS.join(",")})
  --json                  машиночитаемый отчёт {gate, ok, failed, entries[]} вместо текстового
  --quiet                 только шапка и ИТОГ (служебный лог выключается)
  --keep-workspace        не убирать projects/<имя>/workspace/, созданный прогоном
  --log-level <уровень>   debug|info|warn|error|silent (по умолчанию warn; или LOOP_ENGINE_LOG)
  -h, --help              эта справка

Семантика
  exit 0 — закон ${GATE_ID} исполнен: цикл сошёлся у всех проверенных проектов;
  exit 1 — есть FAIL/ERR: коды V-xx/B-xx/M-xx = список точечных правок (К-10);
  SKIP   — в проекте нет site/: ворота не запускать (ms 0), на итог не влияет;
  evidence прогона — projects/<имя>/workspace/${EVIDENCE_FILE} (в git не попадает).

Примеры
  npm run gate
  node core/loop-engine/gate.mjs projects/pcpolimer --checks validate,lint-slop
  node core/loop-engine/gate.mjs --json > /tmp/gate.json
`;

/**
 * Одна запись отчёта гейта (проект → вердикт цикла).
 * @typedef {Object} GateEntry
 * @property {string} name                       имя проекта (имя папки)
 * @property {string} path                        имя проекта для отчёта: projects/<имя> (или абсолютный путь, если проект вне студии)
 * @property {string} absPath                     абсолютный путь к папке проекта
 * @property {'ok'|'fail'|'skipped'|'error'} status
 * @property {boolean} hasSite                    есть ли каталог site/ (иначе ворота не запускаются)
 * @property {number} ms                          длительность прогона (0 для skip)
 * @property {string[]} codes                     коды нарушений (V-xx/B-xx/M-xx/E-xx); пусто — если чисто
 * @property {string[]} errors                    человекочитаемые ошибки (для точечных правок, К-10)
 * @property {number} iterations                  сколько итераций сделал цикл
 * @property {string} reason                      вердикт раннера (человекочитаемый)
 * @property {string|null} evidence               путь к workspace/loop-result.json (evidence прогона), если он сохранён
 * @property {boolean} evidenceKept               evidence уцелел после уборки (--keep-workspace или свой workspace/)
 * @property {boolean} workspacePreexisting       workspace/ был в проекте до прогона (его не трогаем)
 * @property {boolean} workspaceKept              workspace/ оставлен после прогона (--keep-workspace или был заранее)
 */

/**
 * Полный итог прогона гейта.
 * @typedef {Object} GateReport
 * @property {string} gate
 * @property {boolean} ok                          true, если нет fail и error
 * @property {number} total                         всего проектов в поле зрения гейта
 * @property {number} checked                       сколько реально прогнано через цикл
 * @property {number} ok_count                      сколько прошли (в том числе skip)
 * @property {number} failed                        сколько вернули fail
 * @property {number} errored                       сколько упали инфраструктурно
 * @property {number} skipped                       сколько пропущено (нет site/)
 * @property {number} ms                            wall-clock всего прогона
 * @property {string[]} violations                  уникальные коды нарушений по всем проектам
 * @property {GateEntry[]} entries                  записи по проектам (отсортированы)
 * @property {string} projectsRoot                  каталог проектов, который смотрел гейт
 */

/**
 * Опции гейта, собранные из argv (parseGateArgs).
 * @typedef {Object} GateOptions
 * @property {string[]} projects                   позиции + --project (в порядке встречи, дедуп — по пути)
 * @property {string[]} checks                     список проверок ceh_project
 * @property {boolean} json                        машиночитаемый отчёт
 * @property {boolean} quiet                       только шапка и итог
 * @property {boolean} keep_workspace               не убирать созданный workspace/
 * @property {boolean} help                        справка
 * @property {string|null} log_level                уровень службы лога
 * @property {string[]} _                          то же, что projects (совместимость с parseArgs движка)
 */

/** Флаги гейта: значение не обязательно (в форме --flag=значение принимаются true/false/1/0). */
const BOOLEAN_OPTIONS = new Set(["json", "quiet", "keep-workspace", "keep_workspace", "help", "h"]);

/**
 * Разбор argv гейта: позиционные проекты, повторяемый --project (в т.ч. --project=<путь>),
 * --checks a,b (пробелы допустимы), булевы флаги, kebab → snake_case.
 * Неизвестная опция — ошибка (гейт не должен молча проглатывать опечатку в приёмке).
 * @param {string[]} argv
 * @returns {GateOptions}
 * @throws {LoopError} E-CONFIG-GATE
 */
export function parseGateArgs(argv) {
  const args = Array.isArray(argv) ? argv.map((a) => String(a)) : [];
  /** @type {string[]} */
  const projects = [];
  /** @type {string[]} */
  const checks = [];
  const flags = { json: false, quiet: false, keep_workspace: false, help: false };
  /** @type {string|null} */
  let logLevel = null;
  /** @type {string[]} */
  const unknown = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-h") {
      flags.help = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      projects.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const eq = body.indexOf("=");
    const rawKey = eq >= 0 ? body.slice(0, eq) : body;
    const inlineValue = eq >= 0 ? body.slice(eq + 1) : null;

    if (rawKey === "help") {
      flags.help = true;
      continue;
    }
    if (rawKey === "project") {
      const value = inlineValue !== null ? inlineValue : nextValue(args, i, arg, `опция --project требует значение: --project projects/<имя>`);
      if (value.trim() !== "") projects.push(value.trim());
      if (inlineValue === null) i += 1;
      continue;
    }
    if (rawKey === "checks") {
      const value = inlineValue !== null ? inlineValue : nextValue(args, i, arg, `опция --checks требует список: --checks ${DEFAULT_CHECKS.join(",")}`);
      checks.push(...splitChecks(value));
      if (inlineValue === null) i += 1;
      continue;
    }
    if (rawKey === "log-level") {
      const value = inlineValue !== null ? inlineValue : nextValue(args, i, arg, `опция --log-level требует значение: --log-level warn`);
      logLevel = String(value).trim() || null;
      if (inlineValue === null) i += 1;
      continue;
    }
    if (BOOLEAN_OPTIONS.has(rawKey)) {
      if (inlineValue !== null && isTruthyFlagValue(inlineValue) === null) {
        throw gateError(`флаг --${rawKey} не принимает значение «${inlineValue}» (ожидались true/false/1/0)`);
      }
      flags[/** @type {keyof typeof flags} */ (toSnake(rawKey))] = inlineValue === null ? true : isTruthyFlagValue(inlineValue);
      continue;
    }
    unknown.push(arg);
  }

  if (unknown.length > 0) {
    throw gateError(
      `неизвестные опции: ${unknown.join(", ")}. Доступны: --project, --checks, --json, --quiet, --keep-workspace, --log-level, --help`,
    );
  }

  return {
    projects,
    checks: dedupeStrings(checks.length > 0 ? checks : [...DEFAULT_CHECKS]),
    json: flags.json,
    quiet: flags.quiet,
    keep_workspace: flags.keep_workspace,
    help: flags.help,
    log_level: logLevel,
    _: projects,
  };
}

/**
 * Следующий аргумент как значение опции (`--flag <значение>`).
 * @param {string[]} args @param {number} i @param {string} flag @param {string} [message]
 */
function nextValue(args, i, flag, message = null) {
  const next = args[i + 1];
  if (next === undefined || next.startsWith("--")) {
    throw gateError(message ?? `опция ${flag} требует значение`);
  }
  return next;
}

/** Значение булева флага в форме --flag=<значение>. */
function isTruthyFlagValue(value) {
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return null;
}

/** kebab-case → snake_case (ключи конфига движка живут в snake_case). */
function toSnake(key) {
  return String(key).replace(/-/g, "_");
}

/** @param {string} message */
function gateError(message) {
  return new LoopError(message, { code: "E-CONFIG-GATE" });
}

/**
 * Разбирает значение --checks: через запятую, с пробелами вокруг элементов.
 * Принимает уже разобранный список (из parseGateArgs) без изменений.
 * @param {string | string[] | boolean | null | undefined} raw
 * @returns {string[]}
 */
export function splitChecks(raw) {
  if (raw === undefined || raw === null || raw === true || raw === false) return [...DEFAULT_CHECKS];
  const list = Array.isArray(raw) ? raw : String(raw).split(",");
  return dedupeStrings(list.map((item) => String(item).trim()).filter(Boolean));
}

/** @param {string[]} list */
function dedupeStrings(list) {
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  for (const item of list) {
    const key = String(item);
    if (key === "" || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * Разрешает аргумент проекта в абсолютный путь:
 * абсолютный путь — как есть; «projects/<имя>» — от корня студии; голое имя — projects/<имя>.
 * @param {string} arg
 * @param {string} [studioRoot]
 * @returns {string|null} null — для пустого ввода; иначе путь (существование проверяет вызывающий)
 */
export function resolveProjectArg(arg, studioRoot = STUDIO_ROOT) {
  const raw = String(arg ?? "").trim();
  if (raw === "") return null;
  const root = resolve(String(studioRoot ?? STUDIO_ROOT));
  const cleaned = raw.replace(/[\\/]+$/, "");
  if (isAbsolute(cleaned)) return resolve(cleaned);

  const direct = resolve(root, cleaned);
  if (existsSync(direct)) return direct;

  const inProjects = resolve(root, PROJECTS_DIRNAME, cleaned);
  if (existsSync(inProjects)) return inProjects;

  // несуществующий путь: держим его относительно корня студии — чтобы в отчёте было видно «projects/x»
  return direct;
}

/**
 * Каталог проектов: передан явно → берём его; иначе projects/ внутри studioRoot.
 * @param {{ projectsRoot?: string, studioRoot?: string }} [opts]
 * @returns {string}
 */
export function resolveProjectsRoot(opts = {}) {
  if (opts.projectsRoot) return resolve(String(opts.projectsRoot));
  return resolve(String(opts.studioRoot ?? STUDIO_ROOT), PROJECTS_DIRNAME);
}

/**
 * Список проектов гейта: все каталоги projects/, кроме служебных (имя начинается с «_»),
 * отсортированы по имени; для каждого — признак hasSite (есть каталог site/).
 * @param {string} [projectsRoot]
 * @returns {Array<{ name: string, path: string, absPath: string, hasSite: boolean }>}
 */
export function selectProjects(projectsRoot = resolve(STUDIO_ROOT, PROJECTS_DIRNAME)) {
  const root = resolve(String(projectsRoot));
  if (!existsSync(root) || !isDirectory(root)) return [];
  /** @type {Array<{ name: string, path: string, absPath: string, hasSite: boolean }>} */
  const out = [];
  let names = [];
  try {
    names = readdirSync(root);
  } catch {
    return [];
  }
  for (const name of names) {
    if (name.startsWith(INTERNAL_PREFIX)) continue;
    const absPath = resolve(root, name);
    if (!isDirectory(absPath)) continue;
    out.push({ name, path: displayPath(absPath, root, STUDIO_ROOT), absPath, hasSite: isDirectory(join(absPath, "site")) });
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** @param {string} abs */
function isDirectory(abs) {
  try {
    return statSync(abs).isDirectory();
  } catch {
    return false;
  }
}

/** Путь относительно корня студии (в отчётах и как аргумент скриптов цеха). */
function relFromStudio(abs, studioRoot = STUDIO_ROOT) {
  const rel = relative(resolve(studioRoot), resolve(abs)).split(sep).join("/");
  return rel === "" ? basename(resolve(abs)) : rel;
}

/**
 * Имя проекта для отчёта: «projects/<имя>», когда проект внутри папки проектов (или внутри
 * студии); иначе — абсолютный путь, чтобы в отчёте не было «../../../»-шума без смысла.
 * @param {string} abs @param {string} projectsRoot @param {string} studioRoot
 */
function displayPath(abs, projectsRoot, studioRoot) {
  const target = resolve(abs);
  const candidates = [dirname(resolve(projectsRoot)), resolve(studioRoot)];
  for (const base of candidates) {
    const rel = relative(base, target);
    if (rel === "") return basename(target);
    if (!rel.startsWith("..") && !isAbsolute(rel)) return rel.split(sep).join("/");
  }
  return target;
}

/**
 * Конфиг гейта: одна детерминированная итерация цикла с mock-генератором и ceh_project.
 * Ключи API не нужны, LLM не вызывается никогда; валидатор читает проект с диска.
 *
 * @param {{ checks?: string[], iterations?: number, projectName?: string, task?: string }} [opts]
 * @returns {Record<string, any>} глубокая копия — мутация конфига одним прогоном не влияет на другой
 */
export function gateConfig(opts = {}) {
  const iterations = Math.max(1, Math.floor(Number(opts.iterations ?? 1) || 1));
  const checks = splitChecks(opts.checks);
  return {
    ...(opts.projectName ? { project_name: String(opts.projectName) } : {}),
    task: String(
      opts.task ??
        `Гейт ${GATE_ID}: проверить ворота цеха у проекта — цикл читает проект с диска, ничего не генерирует.`,
    ),
    loop: {
      max_iterations: iterations,
      temperature_schedule: [0],
      stop_on_first_success: true,
      persist_iterations: false,
      history_window: 0,
      max_total_seconds: 0,
      throw_on_failure: false,
      context_char_limit: 200_000,
    },
    generator: { type: "mock", model: `gate-${GATE_ID}`, latency_ms: 0, cycle: false },
    validator: {
      type: "ceh_project",
      checks,
      ignore_codes: [],
      materialize: false,
      allow_project_writes: false,
      timeout_ms: 120_000,
    },
    context_builder: {
      type: "studio_default",
      include: {
        mechanics: true,
        gates: true,
        skills: true,
        references: true,
        motion: true,
        dossier: true,
        docs: false,
        examples: false,
      },
    },
    output: { summary_file: EVIDENCE_FILE, file: "mock-artifact.txt" },
  };
}

/**
 * Разрешение аргумента проекта внутри гейта: сначала обычные правила resolveProjectArg,
 * затем голое имя ищется в переданном projectsRoot (гейт умеет ходить и в чужой projects/).
 * @param {string} arg @param {string} studioRoot @param {string} projectsRoot
 * @returns {string|null}
 */
function resolveWantedProject(arg, studioRoot, projectsRoot) {
  const abs = resolveProjectArg(arg, studioRoot);
  if (!abs) return null;
  if (existsSync(abs)) return abs;
  const raw = String(arg).trim().replace(/[\\/]+$/, "");
  if (raw === "" || isAbsolute(raw) || raw.includes("/") || raw.includes("\\")) return abs;
  const inProjectsRoot = resolve(projectsRoot, raw);
  return existsSync(inProjectsRoot) ? inProjectsRoot : abs;
}

/**
 * Прогон гейта: одна итерация цикла на каждый проект с site/.
 *
 * @param {{
 *   projectsRoot?: string,
 *   studioRoot?: string,
 *   projectArgs?: string[],
 *   checks?: string[],
 *   keepWorkspace?: boolean,
 *   logger?: any,
 *   overrides?: Record<string, any>,
 *   configFactory?: (opts: any) => Record<string, any>,
 * }} [opts]
 * @returns {Promise<GateReport>}
 */
export async function runGate(opts = {}) {
  const studioRoot = resolve(String(opts.studioRoot ?? STUDIO_ROOT));
  const projectsRoot = resolveProjectsRoot({ projectsRoot: opts.projectsRoot, studioRoot });
  const logger = opts.logger ?? silentLogger;
  const keepWorkspace = Boolean(opts.keepWorkspace);
  const checks = splitChecks(opts.checks);
  const configFactory = opts.configFactory ?? gateConfig;

  const known = selectProjects(projectsRoot);
  /** @type {GateEntry[]} */
  const entries = [];

  /** @param {{ name: string, path: string, absPath: string, hasSite: boolean }} project */
  const runOne = async (project) => {
    const workspaceDir = join(project.absPath, "workspace");
    const workspacePreexisting = existsSync(workspaceDir);

    if (!project.hasSite) {
      return {
        name: project.name,
        path: project.path,
        absPath: project.absPath,
        status: /** @type {"skipped"} */ ("skipped"),
        hasSite: false,
        ms: 0,
        codes: [],
        errors: [],
        iterations: 0,
        reason: "нет site/ — ворота не запускать",
        evidence: null,
        evidenceKept: false,
        workspacePreexisting,
        workspaceKept: workspacePreexisting,
      };
    }

    const startedAt = Date.now();
    const config = configFactory({ checks, iterations: 1, projectName: project.name });
    const overrides = { dryRun: true, validator: "ceh_project", checks, iterations: 1, ...(opts.overrides ?? {}) };

    let runner;
    try {
      runner = buildRunnerFromConfig(config, studioRoot, {
        projectDir: project.absPath,
        configPath: null,
        logger,
        overrides,
      });
    } catch (error) {
      const code = error?.code ?? "E-GATE-RUNNER";
      return finish(project, {
        status: "error",
        codes: [String(code)],
        errors: [String(error?.message ?? error)],
        reason: `сборка цикла не удалась (${code})`,
        ms: Date.now() - startedAt,
        iterations: 0,
      }, workspaceDir, workspacePreexisting, keepWorkspace);
    }

    /** @type {import("./base.mjs").LoopResult} */
    let result;
    try {
      result = await runner.run(String(config.task ?? ""), studioRoot, project.name);
    } catch (error) {
      const code = error?.code ?? "E-GATE-RUN";
      return finish(project, {
        status: "error",
        codes: [String(code)],
        errors: [String(error?.message ?? error)],
        reason: `цикл упал (${code})`,
        ms: Date.now() - startedAt,
        iterations: 0,
      }, workspaceDir, workspacePreexisting, keepWorkspace);
    }

    const feedback = result.feedback ?? null;
    const codes = (feedback?.codes ?? []).map(String).filter((code) => code && code !== "OK");
    const failedHard = codes.length === 1 && ["E-CHECK-RUN", "E-CONFIG-CHECK"].includes(codes[0]);
    const status = result.ok ? "ok" : failedHard ? "error" : "fail";

    // Evidence прогона (требование К-21): workspace/loop-result.json пишется персистом движка.
    const evidencePath = join(workspaceDir, EVIDENCE_FILE);
    try {
      saveResult(result, { projectDir: project.absPath, config, logger });
    } catch (error) {
      logger.warn?.("evidence прогона не сохранён", { project: project.path, error: String(error?.message ?? error) });
    }
    const evidenceWritten = existsSync(evidencePath);

    const entry = {
      name: project.name,
      path: project.path,
      absPath: project.absPath,
      status: /** @type {"ok"|"fail"|"error"} */ (status),
      hasSite: true,
      ms: Number(result.elapsedMs ?? Date.now() - startedAt),
      codes: status === "ok" ? [] : dedupeStrings(codes),
      errors: status === "ok" ? [] : [...new Set((feedback?.errors ?? []).map(String))].slice(0, 12),
      iterations: Number(result.iterations ?? 0),
      reason: String(result.reason ?? ""),
      evidence: evidenceWritten ? relFromStudio(evidencePath, studioRoot) : null,
      evidenceKept: false,
      workspacePreexisting,
      workspaceKept: workspacePreexisting || keepWorkspace,
    };

    if (!workspacePreexisting && !keepWorkspace) removeWorkspace(workspaceDir, logger);
    else entry.evidenceKept = evidenceWritten && existsSync(evidencePath);
    return entry;
  };

  /** @param {any} partial */
  const finish = (project, partial, workspaceDir, workspacePreexisting, keep) => {
    const entry = {
      name: project.name,
      path: project.path,
      absPath: project.absPath,
      hasSite: project.hasSite,
      codes: [],
      errors: [],
      iterations: 0,
      reason: "",
      evidence: null,
      evidenceKept: false,
      ms: 0,
      ...partial,
      workspacePreexisting,
      workspaceKept: workspacePreexisting || keep,
    };
    if (!workspacePreexisting && !keep) removeWorkspace(workspaceDir, logger);
    return entry;
  };

  if (Array.isArray(opts.projectArgs) && opts.projectArgs.length > 0) {
    /** @type {Map<string, { name: string, path: string, absPath: string, hasSite: boolean } | { missingAbs: string }>} */
    const wanted = new Map();
    for (const arg of opts.projectArgs) {
      const abs = resolveWantedProject(arg, studioRoot, projectsRoot);
      if (!abs) continue;
      const key = resolve(abs);
      if (wanted.has(key)) continue; // дубль проекта не удваивает запись
      if (!existsSync(key) || !isDirectory(key)) {
        wanted.set(key, { missingAbs: key });
        continue;
      }
      const found = known.find((p) => p.absPath === key);
      wanted.set(
        key,
        found ?? { name: basename(key), path: displayPath(key, projectsRoot, studioRoot), absPath: key, hasSite: isDirectory(join(key, "site")) },
      );
    }
    for (const value of wanted.values()) {
      if ("missingAbs" in value) {
        entries.push({
          name: basename(value.missingAbs),
          path: displayPath(value.missingAbs, projectsRoot, studioRoot),
          absPath: value.missingAbs,
          status: "error",
          hasSite: false,
          ms: 0,
          codes: ["E-PROJECT-MISSING"],
          errors: [`каталог проекта не найден: ${value.missingAbs}`],
          iterations: 0,
          reason: "каталог проекта не найден",
          evidence: null,
          evidenceKept: false,
          workspacePreexisting: false,
          workspaceKept: false,
        });
        continue;
      }
      entries.push(await runOne(value));
    }
  } else {
    for (const project of known) entries.push(await runOne(project));
  }

  const violations = dedupeStrings(entries.flatMap((entry) => (entry.status === "ok" || entry.status === "skipped" ? [] : entry.codes)));
  const failed = entries.filter((e) => e.status === "fail").length;
  const errored = entries.filter((e) => e.status === "error").length;
  const skipped = entries.filter((e) => e.status === "skipped").length;
  const passed = entries.filter((e) => e.status === "ok" || e.status === "skipped").length;
  const total = entries.length;

  return {
    gate: GATE_ID,
    ok: failed === 0 && errored === 0,
    total,
    checked: total - skipped,
    ok_count: passed,
    failed,
    errored,
    skipped,
    violations,
    entries,
    ms: entries.reduce((sum, entry) => sum + (Number(entry.ms) || 0), 0),
    projectsRoot: relFromStudio(projectsRoot, studioRoot),
  };
}

/** Убирает рабочую зону, СОЗДАННУЮ прогоном (чужой workspace/ не трогаем). */
function removeWorkspace(workspaceDir, logger) {
  if (!existsSync(workspaceDir)) return false;
  try {
    rmSync(workspaceDir, { recursive: true, force: true });
    logger.debug?.("workspace/ после прогона убран", { dir: workspaceDir });
    return true;
  } catch (error) {
    logger.warn?.("не удалось убрать workspace/ после прогона", { dir: workspaceDir, error: String(error?.message ?? error) });
    return false;
  }
}

/**
 * Отчёт гейта в стиле цеха: шапка, строки OK/FAIL/SKIP/ERR по колонкам, разделитель, ИТОГ.
 * @param {GateReport} report
 * @param {{ quiet?: boolean, width?: number }} [opts]
 * @returns {string}
 */
export function formatGateReport(report, opts = {}) {
  const width = Number(opts.width ?? 80);
  const lines = [];
  const total = Number(report.total ?? report.entries?.length ?? 0);
  lines.push(`ГЕЙТ ${report.gate ?? GATE_ID} · цикл принуждения · проектов проверено ${total}`);

  if (opts.quiet) {
    lines.push(summaryLine(report));
    return `${lines.join("\n")}\n`;
  }

  const paths = (report.entries ?? []).map((entry) => String(entry.path).length);
  const nameWidth = Math.max(10, ...paths);
  for (const entry of report.entries ?? []) {
    const mark = STATUS_MARK[entry.status] ?? "ERR ";
    const timing = `${String(entry.ms ?? 0)}ms`;
    const tail = entry.codes && entry.codes.length > 0 ? entry.codes.join(",") : entry.status === "skipped" ? "нет site/" : "—";
    lines.push(`${mark} ${String(entry.path).padEnd(nameWidth)}  ${tail.padEnd(36)} ${timing.padStart(7)}`);
    for (const err of (entry.errors ?? []).slice(0, 3)) {
      lines.push(`      · ${firstLine(err)}`);
    }
    if (entry.status === "error" && !(entry.errors ?? []).length) {
      lines.push(`      · детали: LOOP_ENGINE_LOG=debug · evidence: ${String(entry.path)}/workspace/${EVIDENCE_FILE}`);
    }
  }

  lines.push("─".repeat(width));
  lines.push(summaryLine(report));
  return `${lines.join("\n")}\n`;
}

/** @type {Record<string, string>} */
export const STATUS_MARK = Object.freeze({
  ok: "OK  ",
  fail: "FAIL",
  skipped: "SKIP",
  error: "ERR ",
});

/** @param {GateReport} report */
function summaryLine(report) {
  if (report.ok) {
    return `ИТОГ: OK ${report.ok_count}/${report.total} проектов прошли цикл · exit 0`;
  }
  const bad = Number(report.failed ?? 0) + Number(report.errored ?? 0);
  const codes = (report.violations ?? []).join(",");
  return `ИТОГ: FAIL ${bad}/${report.total} · нарушения: ${codes || "см. вывод валидатора"} · exit 1`;
}

/** @param {string} text */
function firstLine(text) {
  return String(text ?? "").split("\n")[0].trim();
}

/**
 * Точка входа CLI: аргументы → прогон → отчёт → exit code.
 * @param {string[]} argv
 * @param {{ stdout?: { write(chunk: string): void }, stderr?: { write(chunk: string): void } }} [io]
 * @returns {Promise<number>} 0 — закон исполнен, 1 — есть fail/error
 */
export async function main(argv, io = {}) {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;
  /** @type {GateOptions} */
  let opts;
  try {
    opts = parseGateArgs(argv);
  } catch (error) {
    err.write(`${error?.message ?? error}\n`);
    return 1;
  }
  if (opts.help) {
    out.write(HELP);
    return 0;
  }

  const level = opts.quiet ? "silent" : String(opts.log_level ?? process.env.LOOP_ENGINE_LOG ?? "warn");
  const logger = opts.quiet ? silentLogger : createLogger({ name: `gate:${GATE_ID}`, level });
  const report = await runGate({
    projectArgs: opts.projects,
    checks: opts.checks,
    keepWorkspace: opts.keep_workspace,
    logger,
  });

  if (opts.json) {
    out.write(`${JSON.stringify(toGateJson(report), null, 2)}\n`);
    return report.ok ? 0 : 1;
  }
  out.write(formatGateReport(report, { quiet: opts.quiet }));
  return report.ok ? 0 : 1;
}

/**
 * Машиночитаемый отчёт: { gate, ok, failed, entries[] }.
 * @param {GateReport} report
 */
export function toGateJson(report) {
  return {
    gate: report.gate ?? GATE_ID,
    ok: Boolean(report.ok),
    total: report.total,
    checked: report.checked,
    failed: report.failed,
    errored: report.errored,
    skipped: report.skipped,
    ok_count: report.ok_count,
    violations: report.violations,
    durationMs: report.ms,
    projectsRoot: report.projectsRoot,
    entries: (report.entries ?? []).map((entry) => ({
      name: entry.name,
      path: entry.path,
      status: entry.status,
      has_site: entry.hasSite,
      ms: entry.ms,
      iterations: entry.iterations,
      codes: entry.codes,
      errors: entry.errors,
      reason: entry.reason,
      evidence: entry.evidence ?? null,
      evidence_kept: Boolean(entry.evidenceKept),
      workspace_preexisting: entry.workspacePreexisting,
      workspace_kept: entry.workspaceKept,
    })),
  };
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`FATAL ${error?.code ?? "E-GATE"}: ${error?.message ?? error}\n`);
      process.exit(1);
    });
}
