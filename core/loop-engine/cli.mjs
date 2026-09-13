#!/usr/bin/env node
/* ЦЕХ · Universal Loop Engine — cli.mjs
   Точка входа цикла: контекст → генерация → валидация → фидбек → повтор.

   Запуск:
     node core/loop-engine/cli.mjs projects/<имя> --task "…" [--dry-run] [--iterations 3]
     node core/loop-engine/cli.mjs --selftest        # офлайн-прогон движка без сети и ключей

   Node ≥18, ноль npm-зависимостей. Отчёт — в stdout (коды L-xx / V-xx / B-xx / E-xx),
   служебный лог — в stderr (LOOP_ENGINE_LOG=debug|info|warn|error|silent). Exit 0/1.
*/

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ConfigError, LoopError } from "./base.mjs";
import { findProjectConfig, loadConfigFile } from "./config.mjs";
import { createLogger } from "./logger.mjs";
import { buildRunnerFromConfig, saveResult } from "./registry.mjs";
import { humanDuration, humanNumber, truncate } from "./text.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = resolve(HERE, "..", "..");

const HELP = `Universal Loop Engine · ЦЕХ

  node core/loop-engine/cli.mjs <проект> [опции]

Аргументы
  <проект>                папка проекта (projects/<имя>) или путь к конфигу

Опции
  --task "текст"          задача цикла (по умолчанию — из конфига: task/goal)
  --task-file <путь>      взять задачу из файла
  --config <путь>         конфиг (поиск: loop.config.yaml|yml|json, config.yaml|yml|json)
  --iterations N          переопределить loop.max_iterations
  --max-total-seconds N   общий бюджет времени
  --dry-run               mock-генератор: без сети и без ключей (проверка связки)
  --provider <p>          openai | anthropic | mock
  --model <id>            модель генератора
  --base-url <url>        OpenAI-совместимый эндпоинт (OpenRouter, vLLM, Ollama…)
  --api-key-env <NAME>    переменная окружения с ключом
  --response-format <f>   text | json | files
  --validator <тип>       ceh_project | node_code | python_code | json_schema | llm_judge
  --checks a,b            список проверок для ceh_project (validate,lint-slop,…)
  --json                  JSON-отчёт в stdout вместо текстового
  --quiet                 только итоговая строка
  --log-level <уровень>   debug|info|warn|error|silent (или LOOP_ENGINE_LOG)
  --selftest              офлайн-демонстрация цикла (2 итерации, mock, node_code)
  -h, --help              эта справка

Примеры
  node core/loop-engine/cli.mjs projects/_LOOP_TEMPLATE --dry-run --task "собери hero-секцию"
  node core/loop-engine/cli.mjs projects/pcpolimer --validator ceh_project --checks validate,lint-slop
  OPENAI_API_KEY=… node core/loop-engine/cli.mjs projects/my --provider openai --model gpt-4o-mini
`;

/** Разбор argv без внешних библиотек. */
export function parseArgs(argv) {
  /** @type {Record<string, any>} */
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = String(argv[i]);
    if (!arg.startsWith("--")) {
      if (arg === "-h" || arg === "--help") opts.help = true;
      else opts._.push(arg);
      continue;
    }
    const [rawKey, inlineValue] = arg.replace(/^--/, "").split("=");
    const key = rawKey.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
    const next = argv[i + 1];
    const takesValue = !["dryRun", "json", "quiet", "help", "selftest"].includes(key);
    if (inlineValue !== undefined) {
      opts[key] = inlineValue;
    } else if (takesValue && next !== undefined && !next.startsWith("--")) {
      opts[key] = next;
      i += 1;
    } else {
      opts[key] = true;
    }
  }
  return opts;
}

/** @param {string[]} argv */
export async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const logger = createLogger({ level: String(opts.logLevel ?? process.env.LOOP_ENGINE_LOG ?? "info") });

  if (opts.selftest) return runSelfTest(logger, opts);

  const positional = String(opts._[0] ?? "").trim();
  if (!positional) {
    process.stderr.write("нужен проект: node core/loop-engine/cli.mjs projects/<имя> --task \"…\" (--help)\n");
    return 1;
  }

  const projectDir = resolveProjectArg(positional);
  const explicitConfig = Boolean(opts.config);
  const configPath = opts.config ? resolve(String(opts.config)) : findProjectConfig(projectDir);
  if (explicitConfig && (!configPath || !existsSync(configPath))) {
    process.stderr.write(`указанный конфиг не найден: ${opts.config}\n`);
    return 1;
  }

  // Конфига в проекте может не быть (разовый прогон чужого проекта воротами) —
  // тогда работаем на дефолтах движка, а --validator/--provider их переопределяют.
  const usingDefaults = !configPath || !existsSync(configPath);
  if (usingDefaults) logger.info("конфиг проекта не найден — использую дефолты движка", { project: rel(projectDir) });
  let config;
  try {
    config = usingDefaults ? defaultConfig(projectDir) : loadConfigFile(configPath);
  } catch (e) {
    return fail(e, logger, opts);
  }

  const task = resolveTask(opts, configPath, projectDir, config);
  const overrides = buildOverrides(opts);

  let runner;
  try {
    runner = buildRunnerFromConfig(config, STUDIO_ROOT, { projectDir, configPath, logger, overrides });
  } catch (e) {
    return fail(e, logger, opts);
  }

  const projectName = runner.contextBuilder?.projectName ?? basename(projectDir);
  const lines = [];
  const startedAt = Date.now();

  if (!opts.json && !opts.quiet) {
    lines.push(
      `L-00 проект ${rel(projectDir)} · задача «${truncate(taskGoalText(task), 90)}» · генератор ${describeGen(runner.generator)} · валидатор ${describeVal(runner.validator)}`,
    );
  }

  let result;
  try {
    result = await runner.run(task, STUDIO_ROOT, projectName);
  } catch (e) {
    return fail(e, logger, opts);
  }

  const saved = opts.save === false ? [] : safeSave(result, projectDir, config, logger);

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(toReportJson(result, saved, { configPath, projectDir, task }), null, 2)}\n`);
    return result.ok ? 0 : 1;
  }

  for (const entry of result.state.history) {
    const fb = entry.feedback;
    lines.push(
      `L-${String(entry.iteration + 1).padStart(2, "0")} итерация ${entry.iteration + 1}/${result.state.maxIterations ?? "?"} · temp ${entry.temperature.toFixed(2)}` +
        ` · контекст ${humanNumber(entry.contextChars)} симв. · ${humanDuration(entry.elapsedMs)}` +
        ` · ${fb?.ok ? "OK" : `FAIL (${(fb?.codes ?? []).join(",")})`}`,
    );
    for (const err of (fb?.errors ?? []).slice(0, opts.quiet ? 0 : 3)) {
      lines.push(`     ${truncate(err.split("\n")[0], 160)}`);
    }
  }

  const ctxInfo = runner.contextBuilder?.describe?.();
  if (ctxInfo && !opts.quiet) {
    lines.push("── КОНТЕКСТ ──");
    for (const section of ctxInfo.sections) {
      lines.push(`   ${section.name.padEnd(11)} ${String(section.files).padStart(3)} файл(ов) · ${humanNumber(section.chars)} симв.${section.truncated ? " · обрезано" : ""}`);
    }
    for (const warning of ctxInfo.warnings.slice(0, 4)) lines.push(`   ! ${warning}`);
  }

  lines.push("─".repeat(58));
  lines.push(
    `ИТОГ: ${result.ok ? "OK " : "FAIL"} ${result.reason} · ${result.iterations} итераций · ${humanDuration(Date.now() - startedAt)} · exit ${result.ok ? 0 : 1}`,
  );
  if (saved.length > 0 && !opts.quiet) lines.push(`Сохранено: ${saved.map((p) => rel(p)).join(", ")}`);
  if (!result.ok && result.feedback?.errors?.length) {
    lines.push("Последние ошибки:");
    for (const err of result.feedback.errors.slice(0, 8)) lines.push(`  • ${truncate(err, 220)}`);
  }

  process.stdout.write(`${lines.join("\n")}\n`);
  return result.ok ? 0 : 1;
}

/* ——— вспомогательное ——— */

function resolveProjectArg(positional) {
  const abs = isAbsolute(positional) ? resolve(positional) : resolve(STUDIO_ROOT, positional);
  if (existsSync(abs)) {
    // если указали сам конфиг — проект = его папка
    if (abs.endsWith(".yaml") || abs.endsWith(".yml") || abs.endsWith(".json")) return dirname(abs);
    return abs;
  }
  return abs;
}

/** Конфиг по умолчанию для разового прогона проекта без loop.config.yaml. */
function defaultConfig(projectDir) {
  return {
    project_name: basename(projectDir),
    loop: { max_iterations: 3, temperature_schedule: [0.3, 0.1, 0.0], stop_on_first_success: true },
    generator: { type: "mock" }, // --provider/--model/--dry-run переопределят
    validator: { type: "node_code" }, // --validator переопределит
    context_builder: { type: "studio_default" },
  };
}

function resolveTask(opts, configPath, projectDir, config) {
  if (opts.taskFile) {
    const path = isAbsolute(String(opts.taskFile)) ? String(opts.taskFile) : resolve(projectDir, String(opts.taskFile));
    if (!existsSync(path)) throw new ConfigError(`файл задачи не найден: ${path}`, { code: "E-CONFIG-TASK" });
    return readFileSync(path, "utf8").trim();
  }
  if (typeof opts.task === "string" && opts.task.trim()) return opts.task.trim();
  const fromConfig = config?.task ?? config?.goal ?? config?.brief;
  if (typeof fromConfig === "string" && fromConfig.trim()) return fromConfig.trim();
  if (Array.isArray(opts._) && opts._.length > 1) return opts._.slice(1).join(" ").trim();
  return "Собери артефакт проекта по его досье (SEED/DIRECTION/STRUCTURE) с учётом механики цеха.";
}

function buildOverrides(opts) {
  /** @type {Record<string, any>} */
  const overrides = {};
  if (opts.iterations) overrides.iterations = Number(opts.iterations);
  if (opts.maxTotalSeconds) overrides.maxTotalSeconds = Number(opts.maxTotalSeconds);
  if (opts.dryRun) overrides.dryRun = true;
  if (opts.provider) overrides.provider = String(opts.provider);
  if (opts.model) overrides.model = String(opts.model);
  if (opts.baseUrl) overrides.baseUrl = String(opts.baseUrl);
  if (opts.apiKeyEnv) overrides.apiKeyEnv = String(opts.apiKeyEnv);
  if (opts.responseFormat) overrides.responseFormat = String(opts.responseFormat);
  if (opts.validator) overrides.validator = String(opts.validator);
  if (opts.checks) overrides.checks = String(opts.checks).split(",").map((s) => s.trim()).filter(Boolean);
  if (opts.contextCharLimit) overrides.contextCharLimit = Number(opts.contextCharLimit);
  return overrides;
}

function safeSave(result, projectDir, config, logger) {
  try {
    return saveResult(result, { projectDir, config, logger });
  } catch (e) {
    logger.warn("не удалось сохранить результат", { error: String(e?.message ?? e) });
    return [];
  }
}

function fail(error, logger, opts) {
  const code = error?.code ?? "E-LOOP";
  const message = error?.message ?? String(error);
  if (opts.json) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: { code, message } }, null, 2)}\n`);
  } else {
    process.stdout.write(`ИТОГ: FAIL ${code} · ${truncate(message, 400)} · exit 1\n`);
  }
  logger.error("провал запуска цикла", { code, message: truncate(message, 300) });
  if (!(error instanceof LoopError)) logger.debug("стек", { stack: truncate(error?.stack ?? "", 1200) });
  return 1;
}

function describeGen(generator) {
  const d = generator?.describe?.();
  if (!d) return generator?.constructor?.name ?? "?";
  return d.provider === "mock" ? `mock/${d.model}` : `${d.provider}/${d.model}${d.apiKeyPresent === false ? " (НЕТ КЛЮЧА)" : ""}`;
}

function describeVal(validator) {
  const d = validator?.describe?.();
  return d?.type ?? validator?.constructor?.name ?? "?";
}

function taskGoalText(task) {
  if (typeof task === "string") return task;
  return String(task?.goal ?? JSON.stringify(task));
}

function rel(path) {
  if (!path) return "—";
  const rel = resolve(String(path)).slice(STUDIO_ROOT.length).replace(/^[\\/]+/, "");
  return rel || ".";
}

function toReportJson(result, saved, meta) {
  return {
    ok: result.ok,
    reason: result.reason,
    iterations: result.iterations,
    successIteration: result.successIteration ?? null,
    elapsedMs: result.elapsedMs,
    project: rel(meta.projectDir),
    config: rel(meta.configPath),
    task: taskGoalText(meta.task),
    feedback: result.feedback ?? null,
    artifact: result.artifact
      ? {
          metadata: result.artifact.metadata,
          content: typeof result.artifact.content === "string" ? result.artifact.content : Object.keys(result.artifact.content),
        }
      : null,
    history: result.state.history.map((entry) => ({
      iteration: entry.iteration,
      temperature: entry.temperature,
      contextChars: entry.contextChars,
      elapsedMs: entry.elapsedMs,
      ok: entry.feedback?.ok ?? false,
      codes: entry.feedback?.codes ?? [],
      errors: entry.feedback?.errors ?? [],
    })),
    saved: saved.map((p) => rel(p)),
  };
}

/**
 * Офлайн-самопроверка движка: mock-генератор сначала «ошибается», потом исправляется.
 * Сеть и API-ключи не нужны — можно гонять в CI.
 * @returns {Promise<number>}
 */
async function runSelfTest(logger, opts) {
  const projectDir = resolve(STUDIO_ROOT, "projects", "_LOOP_TEMPLATE");
  const configPath = findProjectConfig(projectDir);
  if (!configPath) {
    process.stderr.write(`selftest: не найден конфиг в ${rel(projectDir)}\n`);
    return 1;
  }
  const config = loadConfigFile(configPath);
  const broken = "// намеренно битый код для проверки цикла\nexport const broken = (;\n";
  const fixed = "export const hello = (name = 'ЦЕХ') => `привет, ${name}`;\n\nif (import.meta.url === `file://${process.argv[1]}`) {\n  process.stdout.write(`${hello()}\\n`);\n}\n";

  const runner = buildRunnerFromConfig(config, STUDIO_ROOT, {
    projectDir,
    configPath,
    logger,
    overrides: { dryRun: true, scripted: [broken, fixed], iterations: Number(opts.iterations ?? 3), validator: "node_code" },
  });

  const result = await runner.run("самопроверка движка: выдай валидный ES-модуль", STUDIO_ROOT, basename(projectDir));
  const saved = safeSave(result, projectDir, config, logger);

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(toReportJson(result, saved, { configPath, projectDir, task: "selftest" }), null, 2)}\n`);
    return result.ok ? 0 : 1;
  }

  const lines = ["── SELFTEST (офлайн, mock-генератор) ──"];
  for (const entry of result.state.history) {
    lines.push(
      `L-${String(entry.iteration + 1).padStart(2, "0")} temp ${entry.temperature.toFixed(2)} · контекст ${humanNumber(entry.contextChars)} симв. · ${
        entry.feedback?.ok ? "OK" : `FAIL (${(entry.feedback?.codes ?? []).join(",")})`
      } · ${humanDuration(entry.elapsedMs)}`,
    );
  }
  lines.push("─".repeat(58));
  lines.push(`ИТОГ: ${result.ok ? "OK " : "FAIL"} ${result.reason} · итераций ${result.iterations} · exit ${result.ok ? 0 : 1}`);
  const expectedFailThenPass = result.state.history.length >= 2 && result.state.history[0].feedback?.ok === false && result.ok === true;
  lines.push(`ПРОВЕРКА ЦИКЛА: ${expectedFailThenPass ? "OK  провал → фидбек → исправление → приёмка" : "FAIL цикл не сошёлся так, как ожидалось"}`);
  process.stdout.write(`${lines.join("\n")}\n`);
  return expectedFailThenPass ? 0 : 1;
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`FATAL ${error?.code ?? "E-LOOP"}: ${error?.message ?? error}\n`);
      process.exit(1);
    });
}
