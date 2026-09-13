/* ЦЕХ · Universal Loop Engine — registry.mjs
   Реестр компонентов + фабрика buildRunnerFromConfig (аналог __init__.py из патча).

   Что исправлено относительно Python-версии:
     • `read_text() if exists() << "DEFAULT TEMPLATE MISSING"` — синтаксическая ошибка (`<<`);
       здесь корректные дефолты и внятная ConfigError;
     • val_cfg.pop() мутировал конфиг вызывающего -> здесь копии, конфиг остаётся неизменным;
     • if/elif-цепочка под каждый тип валидатора -> декларативный DI: класс сам объявляет
       `static requires = [...]`, фабрика инжектит studioRoot/projectName/projectDir/workspaceDir;
     • импорт openai/anthropic на уровне модуля -> импортов SDK нет вовсе (fetch в generators/llm.mjs).
*/

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

import { ConfigError, createLoopConfig, getFirst } from "./base.mjs";
import { findProjectConfig, loadConfigFile, normalizeProjectConfig, readTextOr } from "./config.mjs";
import { DEFAULT_CONTEXT_TEMPLATE, StudioContextBuilder } from "./context-builder.mjs";
import { GENERATORS, createGeneratorFromConfig } from "./generators/index.mjs";
import { createLogger, silentLogger } from "./logger.mjs";
import { UniversalLoopRunner } from "./runner.mjs";
import { deepCopyJson, truncate } from "./text.mjs";
import { VALIDATORS } from "./validators/index.mjs";
import { ensureDir, writeArtifact } from "./workspace.mjs";

/** Единый реестр: строка из конфига → класс. */
export const REGISTRY = Object.freeze({
  generators: GENERATORS,
  validators: VALIDATORS,
  contextBuilders: Object.freeze({
    studio_default: StudioContextBuilder,
    studio: StudioContextBuilder,
    default: StudioContextBuilder,
  }),
  runners: Object.freeze({ standard: UniversalLoopRunner, default: UniversalLoopRunner }),
});

export const DEFAULT_SYSTEM_PROMPT = `Ты — senior-инженер веб-студии ЦЕХ.

Правила выдачи:
1. Читай контекст ниже: МЕХАНИКА обязательна, СКИЛЫ и РЕФЕРЕНСЫ — источник приёмов.
2. Easing — только из motion/easing-curves.json. Шрифты — только из assets/fonts/PAIRS.md.
3. Никаких клише из anti-slop/BANNED.md, никаких квот сверх anti-slop/QUOTAS.md.
4. Выдавай ТОЛЬКО артефакт: без пояснений, без «вот готовый код», без разметки вокруг.
5. Если видишь блок «ПРЕДЫДУЩАЯ ПОПЫТКА ПРОВАЛЕНА» — исправь ровно то, на что пожаловался валидатор.`;

/** Ключи секций конфига, которые не должны попадать в конструктор как opts. */
const RESERVED_KEYS = new Set([
  "type",
  "template",
  "templateFile",
  "template_file",
  "judgeGenerator",
  "judge_generator",
  "judgePromptTemplate",
  "judge_prompt_template",
  "clientFactory",
  "client_factory",
]);

/**
 * Фабрика: конфиг (dict) → готовый UniversalLoopRunner.
 * @param {Record<string, any>} config
 * @param {string} studioRoot
 * @param {{ projectDir?: string, configPath?: string|null, logger?: any, dryRun?: boolean, overrides?: Record<string, any> }} [opts]
 * @returns {UniversalLoopRunner}
 */
export function buildRunnerFromConfig(config, studioRoot, opts = {}) {
  if (!config || typeof config !== "object") throw new ConfigError("конфиг должен быть объектом", { code: "E-CONFIG" });
  const root = resolve(String(studioRoot ?? process.cwd()));
  const logger = opts.logger ?? silentLogger;
  const raw = deepCopyJson(config);
  if (opts.overrides) applyOverridesInPlace(raw, opts.overrides);

  const resolved = resolveProjectDirDetailed(raw, root, opts);
  const projectDir = resolved.dir;

  // Папка проекта — источник истины для путей (валидаторы работают с файловой системой).
  // Если папка задана явно/конфигом, а project_name в конфиге другой — берём папку и предупреждаем.
  const configuredName = getFirst(raw, ["project_name", "projectName"], null);
  if (resolved.source !== "project_name" && configuredName && String(configuredName) !== basename(projectDir)) {
    logger.warn("project_name в конфиге не совпадает с папкой проекта — беру папку", {
      config: String(configuredName),
      folder: basename(projectDir),
    });
    raw.project_name = basename(projectDir);
  }

  const norm = normalizeProjectConfig(raw, { studioRoot: root, projectDir, configPath: opts.configPath ?? null });

  const loopConfig = createLoopConfig(norm.loop);
  const workspaceDir = norm.paths.workspace;
  ensureDir(workspaceDir);

  /** Контекст DI: что фабрика может инжектить в компоненты. */
  const di = {
    studioRoot: root,
    projectName: norm.projectName,
    projectDir: norm.projectDir,
    workspaceDir,
    logger,
    loopConfig,
  };

  const contextBuilder = buildContextBuilder(norm, di, loopConfig);
  const generator = buildGenerator(norm, di);
  const validator = buildValidator(norm, di, generator);

  const runnerType = String(getFirst(raw, ["runner", "runner_type"], "standard"));
  const RunnerClass = REGISTRY.runners[runnerType];
  if (!RunnerClass) {
    throw new ConfigError(`runner «${runnerType}» неизвестен. Доступны: ${Object.keys(REGISTRY.runners).join(", ")}`, {
      code: "E-CONFIG-RUNNER",
    });
  }

  return new RunnerClass({
    generator,
    validator,
    contextBuilder,
    config: loopConfig,
    workspaceDir,
    logger,
    persistContext: Boolean(getFirst(raw, ["persist_context", "persistContext"], false)),
  });
}

/** @param {ReturnType<typeof normalizeProjectConfig>} norm */
function buildContextBuilder(norm, di, loopConfig) {
  const cfg = { ...(norm.contextBuilder ?? {}) };
  const type = String(getFirst(cfg, ["type"], "studio_default"));
  const Class = REGISTRY.contextBuilders[type];
  if (!Class) {
    throw new ConfigError(`context_builder.type «${type}» неизвестен. Доступны: ${Object.keys(REGISTRY.contextBuilders).join(", ")}`, {
      code: "E-CONFIG-CONTEXT",
    });
  }

  const inlineTemplate = getFirst(cfg, ["template"], null);
  const templateFile = getFirst(cfg, ["templateFile", "template_file"], null);
  let template = null;
  if (templateFile) {
    const abs = isAbsolute(String(templateFile)) ? String(templateFile) : resolve(norm.projectDir, String(templateFile));
    template = readTextOr(abs, null);
    if (template === null) throw new ConfigError(`шаблон контекста не найден: ${abs}`, { code: "E-CONFIG-CONTEXT" });
  } else if (typeof inlineTemplate === "string" && inlineTemplate.includes("{{")) {
    template = inlineTemplate;
  } else if (norm.paths.contextTemplate) {
    template = readTextOr(norm.paths.contextTemplate, null);
  }
  if (template === null) template = DEFAULT_CONTEXT_TEMPLATE;

  const opts = omitReserved(cfg);
  if (opts.maxTotalChars === undefined && opts.contextCharLimit === undefined) opts.maxTotalChars = loopConfig.contextCharLimit;
  if (opts.historyWindow === undefined) opts.historyWindow = loopConfig.historyWindow;
  opts.template = template;
  return instantiate(Class, opts, di);
}

/** @param {ReturnType<typeof normalizeProjectConfig>} norm */
function buildGenerator(norm, di) {
  const cfg = { ...(norm.generator ?? {}) };
  const systemPromptTemplate = readTextOr(norm.paths.systemPrompt, null);
  const base = {
    studioRoot: di.studioRoot,
    projectName: di.projectName,
    logger: di.logger,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    systemPromptTemplate,
  };

  const type = String(getFirst(cfg, ["type", "provider"], "llm")).toLowerCase();
  const known = ["llm", "openai", "anthropic", "mock"];
  if (!known.includes(type)) {
    const Class = REGISTRY.generators[type];
    if (!Class) {
      throw new ConfigError(`generator.type «${type}» неизвестен. Доступны: ${[...known, ...Object.keys(REGISTRY.generators)].join(", ")}`, {
        code: "E-CONFIG-GENERATOR",
      });
    }
    return instantiate(Class, omitReserved(cfg), base);
  }
  return createGeneratorFromConfig(cfg, base);
}

/** @param {ReturnType<typeof normalizeProjectConfig>} norm */
function buildValidator(norm, di, generator) {
  const cfg = { ...(norm.validator ?? {}) };
  const type = String(getFirst(cfg, ["type"], "node_code"));
  const Class = REGISTRY.validators[type];
  if (!Class) {
    throw new ConfigError(`validator.type «${type}» неизвестен. Доступны: ${Object.keys(REGISTRY.validators).join(", ")}`, {
      code: "E-CONFIG-VALIDATOR",
    });
  }

  const opts = omitReserved(cfg);

  // llm_judge: собираем отдельный генератор-судью (не переиспользуем основной, чтобы не зациклиться)
  if (type === "llm_judge" || type === "llmJudge") {
    const judgeCfg = getFirst(cfg, ["judgeGenerator", "judge_generator", "judge"], null);
    if (!judgeCfg) {
      throw new ConfigError("validator.judge_generator обязателен для llm_judge (модель, провайдер, ключ)", { code: "E-CONFIG-VALIDATOR" });
    }
    const judgePromptFile = getFirst(cfg, ["judgePromptFile", "judge_prompt_file"], null);
    const judgeTemplate = judgePromptFile
      ? readTextOr(isAbsolute(String(judgePromptFile)) ? String(judgePromptFile) : resolve(norm.projectDir, String(judgePromptFile)), null)
      : getFirst(cfg, ["judgePromptTemplate", "judge_prompt_template"], null);
    const judge = createGeneratorFromConfig(judgeCfg, {
      studioRoot: di.studioRoot,
      projectName: di.projectName,
      systemPrompt:
        "Ты — арт-директор веб-студии ЦЕХ. Отвечаешь СТРОГО валидным JSON без пояснений и без code-fence.",
      logger: di.logger,
    });
    opts.judge = judge;
    if (judgeTemplate) opts.template = String(judgeTemplate);
    if (typeof generator?.describe === "function" && judge === generator) {
      throw new ConfigError("judge_generator не должен совпадать с основным генератором", { code: "E-CONFIG-VALIDATOR" });
    }
  }

  return instantiate(Class, opts, di);
}

/**
 * Инстанцирование с декларативным DI: класс сам объявляет `static requires`.
 * @param {any} Class
 * @param {Record<string, any>} opts
 * @param {Record<string, any>} di
 */
export function instantiate(Class, opts = {}, di = {}) {
  const requires = Array.isArray(Class?.requires) ? Class.requires : [];
  /** @type {Record<string, any>} */
  const injected = {};
  for (const key of requires) {
    if (di[key] !== undefined && di[key] !== null) injected[key] = di[key];
  }
  // DI имеет приоритет над конфигом: пути определяет фабрика, а не yaml
  return new Class({ ...opts, ...injected });
}

function omitReserved(source) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const [key, value] of Object.entries(source ?? {})) {
    if (RESERVED_KEYS.has(key)) continue;
    // snake_case-алиасы, созданные snakeToCamelKeys, не дублируем
    if (key.includes("_") && key.replace(/_([a-z0-9])/g, (_m, c) => c.toUpperCase()) in (source ?? {})) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Определяет папку проекта: явный аргумент → project_dir в конфиге → папка конфига
 * внутри projects/ → projects/<project_name>.
 * `source` нужен, чтобы понять, можно ли переопределить project_name именем папки.
 * @returns {{ dir: string, source: 'explicit'|'config_dir'|'config_path'|'project_name'|'studio_root' }}
 */
export function resolveProjectDirDetailed(raw, studioRoot, opts = {}) {
  if (opts.projectDir) return { dir: resolve(String(opts.projectDir)), source: "explicit" };
  const configured = getFirst(raw, ["project_dir", "projectDir"], null);
  if (configured) {
    return { dir: isAbsolute(String(configured)) ? resolve(String(configured)) : resolve(studioRoot, String(configured)), source: "config_dir" };
  }
  const configPath = opts.configPath ? resolve(String(opts.configPath)) : null;
  if (configPath) {
    const dir = dirname(configPath);
    const rel = dir.slice(resolve(studioRoot).length).split(/[\\/]/).filter(Boolean);
    if (rel[0] === "projects" && rel[1]) return { dir, source: "config_path" }; // конфиг лежит внутри projects/<имя>
  }
  const projectName = getFirst(raw, ["project_name", "projectName"], null);
  if (projectName) return { dir: resolve(studioRoot, "projects", String(projectName)), source: "project_name" };
  return { dir: configPath ? dirname(configPath) : studioRoot, source: configPath ? "config_path" : "studio_root" };
}

/** Строковая версия (публичный API). */
export function resolveProjectDir(raw, studioRoot, opts = {}) {
  return resolveProjectDirDetailed(raw, studioRoot, opts).dir;
}

/** Точечные переопределения из CLI (--iterations, --dry-run, --model…). */
export function applyOverridesInPlace(raw, overrides) {
  if (!overrides || typeof overrides !== "object") return raw;
  raw.loop = raw.loop ?? {};
  raw.generator = raw.generator ?? {};
  raw.validator = raw.validator ?? {};

  if (overrides.iterations) raw.loop.max_iterations = Number(overrides.iterations);
  if (overrides.maxTotalSeconds) raw.loop.max_total_seconds = Number(overrides.maxTotalSeconds);
  if (overrides.stopOnFirstSuccess !== undefined) raw.loop.stop_on_first_success = Boolean(overrides.stopOnFirstSuccess);
  if (overrides.dryRun || overrides.provider === "mock") {
    raw.generator.type = "mock";
    if (overrides.scripted) raw.generator.scripted = overrides.scripted;
  } else {
    if (overrides.provider) {
      raw.generator.type = "llm";
      raw.generator.provider = String(overrides.provider);
      raw.generator.client = { ...(raw.generator.client ?? {}), type: String(overrides.provider) };
    }
    if (overrides.model) raw.generator.model = String(overrides.model);
    if (overrides.baseUrl) raw.generator.client = { ...(raw.generator.client ?? {}), base_url: String(overrides.baseUrl) };
    if (overrides.apiKeyEnv) raw.generator.client = { ...(raw.generator.client ?? {}), api_key_env: String(overrides.apiKeyEnv) };
    if (overrides.responseFormat) raw.generator.response_format = String(overrides.responseFormat);
  }
  if (overrides.validator) raw.validator.type = String(overrides.validator);
  if (overrides.checks) raw.validator.checks = overrides.checks;
  if (overrides.contextCharLimit) raw.loop.context_char_limit = Number(overrides.contextCharLimit);
  return raw;
}

/**
 * Удобный вход: загрузить конфиг → собрать раннер → прогнать → сохранить результат.
 * @param {string} configPath
 * @param {string | Record<string, any>} task
 * @param {string} studioRoot
 * @param {{ projectDir?: string, logger?: any, dryRun?: boolean, overrides?: Record<string, any>, save?: boolean }} [opts]
 * @returns {Promise<import("./base.mjs").LoopResult>}
 */
export async function loadConfigAndRun(configPath, task, studioRoot, opts = {}) {
  const root = resolve(String(studioRoot ?? process.cwd()));
  const absConfig = configPath ? resolve(String(configPath)) : null;
  const path = absConfig ?? (opts.projectDir ? findProjectConfig(resolve(String(opts.projectDir))) : null);
  if (!path || !existsSync(path)) {
    throw new ConfigError(`конфиг цикла не найден: ${configPath ?? opts.projectDir ?? "?"}`, { code: "E-CONFIG-MISSING" });
  }

  const config = loadConfigFile(path);
  const logger = opts.logger ?? createLogger({ level: process.env.LOOP_ENGINE_LOG ?? "info" });
  const overrides = { ...(opts.overrides ?? {}), ...(opts.dryRun ? { dryRun: true } : {}) };
  const runner = buildRunnerFromConfig(config, root, {
    projectDir: opts.projectDir ? resolve(String(opts.projectDir)) : dirname(path),
    configPath: path,
    logger,
    overrides,
  });

  const projectName = runner.contextBuilder?.projectName ?? basename(dirname(path));
  const result = await runner.run(task, root, projectName);

  if (opts.save !== false) {
    const saved = saveResult(result, { projectDir: resolve(dirname(path)), config, logger });
    result.saved = saved;
  }
  return result;
}

/**
 * Сохраняет итог прогона: workspace/loop-result.json + артефакт (файл или карта файлов).
 * @param {import("./base.mjs").LoopResult} result
 * @param {{ projectDir: string, config?: Record<string, any>, logger?: any }} opts
 * @returns {string[]} записанные пути
 */
export function saveResult(result, opts) {
  const projectDir = resolve(String(opts.projectDir));
  const outputCfg = getFirst(opts.config ?? {}, ["output"], {}) ?? {};
  const workspaceDir = resolve(projectDir, String(getFirst(outputCfg, ["workspace_dir", "workspaceDir"], "workspace")));
  ensureDir(workspaceDir);
  /** @type {string[]} */
  const written = [];

  const summary = {
    ok: result.ok,
    reason: result.reason,
    iterations: result.iterations,
    successIteration: result.successIteration ?? null,
    elapsedMs: result.elapsedMs,
    finishedAt: new Date().toISOString(),
    feedback: result.feedback
      ? { ok: result.feedback.ok, codes: result.feedback.codes, errors: result.feedback.errors, metrics: result.feedback.metrics }
      : null,
    artifact: result.artifact ? { metadata: result.artifact.metadata, chars: contentChars(result.artifact.content) } : null,
    history: (result.state?.history ?? []).map((entry) => ({
      iteration: entry.iteration,
      temperature: entry.temperature,
      elapsedMs: entry.elapsedMs,
      contextChars: entry.contextChars,
      ok: entry.feedback?.ok ?? false,
      codes: entry.feedback?.codes ?? [],
    })),
  };

  const summaryPath = join(workspaceDir, String(getFirst(outputCfg, ["summary_file", "summaryFile"], "loop-result.json")));
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  written.push(summaryPath);

  if (result.artifact) {
    if (typeof result.artifact.content === "string") {
      const outFile = resolve(workspaceDir, String(getFirst(outputCfg, ["file"], "result.txt")));
      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, result.artifact.content.endsWith("\n") ? result.artifact.content : `${result.artifact.content}\n`, "utf8");
      written.push(outFile);
    } else {
      const outDir = resolve(workspaceDir, String(getFirst(outputCfg, ["dir", "files_dir"], "out")));
      const res = writeArtifact(result.artifact, outDir, { defaultFilename: "index.html", clean: true });
      written.push(...res.files.map((f) => f.abs));
    }
  }

  opts.logger?.info?.("результат сохранён", { files: written.map((p) => truncate(p, 200)).join(", ") });
  return written;
}

function contentChars(content) {
  if (typeof content === "string") return content.length;
  if (content && typeof content === "object") {
    return Object.values(content).reduce((sum, value) => sum + String(value ?? "").length, 0);
  }
  return 0;
}
