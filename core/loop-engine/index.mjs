/* ЦЕХ · Universal Loop Engine — index.mjs
   Публичный API (аналог __init__.py из патча).

   Быстрый старт:
     import { loadConfigAndRun } from "./core/loop-engine/index.mjs";
     const result = await loadConfigAndRun("projects/my/loop.config.yaml", "задача", studioRoot);
     process.exit(result.ok ? 0 : 1);

   Ручная сборка:
     import { UniversalLoopRunner, StudioContextBuilder, LlmGenerator, NodeCodeValidator, createLoopConfig }
       from "./core/loop-engine/index.mjs";
*/

export {
  BudgetError,
  ConfigError,
  DEFAULT_LOOP_CONFIG,
  GeneratorError,
  LoopError,
  ValidatorError,
  createArtifact,
  createFeedback,
  createLoopConfig,
  createLoopState,
  getFirst,
  taskGoal,
  temperatureForIteration,
  toPlainJson,
} from "./base.mjs";

export { findProjectConfig, loadConfigFile, normalizeProjectConfig, parseSimpleYaml, readTextOr } from "./config.mjs";

export { DEFAULT_CONTEXT_TEMPLATE, SECTION_ORDER, StudioContextBuilder, stringifyArtifact } from "./context-builder.mjs";

export { GENERATORS, LlmGenerator, MockGenerator, createGeneratorFromConfig } from "./generators/index.mjs";

export { createLogger, silentLogger } from "./logger.mjs";

export { REGISTRY, applyOverridesInPlace, buildRunnerFromConfig, instantiate, loadConfigAndRun, resolveProjectDir, saveResult } from "./registry.mjs";

export { UniversalLoopRunner } from "./runner.mjs";

export { renderTemplate, renderTemplateDetailed } from "./template.mjs";

export {
  extractJson,
  humanDuration,
  humanNumber,
  parseArtifactContent,
  safeResolveInside,
  snakeToCamelKeys,
  stripCodeFences,
  truncate,
} from "./text.mjs";

export { hasExecutable, resolvePythonBin, runCommand } from "./subprocess.mjs";

export {
  CEH_CHECKS,
  CehProjectValidator,
  DEFAULT_CHECKS,
  LlmJudgeValidator,
  NodeCodeValidator,
  PythonCodeValidator,
  SchemaValidator,
  VALIDATORS,
  parseCodeLines,
  parseValidateReport,
  validateAgainstSchema,
} from "./validators/index.mjs";

export { cleanManifestFiles, copyDir, ensureDir, listFiles, writeArtifact } from "./workspace.mjs";
