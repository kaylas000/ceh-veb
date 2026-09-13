/* Тесты registry.mjs: фабрика из конфига, DI, переопределения CLI, сохранение результата. */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { writeFile } from "./helpers.mjs";

import { ConfigError } from "../base.mjs";
import { loadConfigFile } from "../config.mjs";
import { silentLogger } from "../logger.mjs";
import {
  DEFAULT_SYSTEM_PROMPT,
  REGISTRY,
  applyOverridesInPlace,
  buildRunnerFromConfig,
  instantiate,
  loadConfigAndRun,
  resolveProjectDir,
  saveResult,
} from "../registry.mjs";
import { StudioContextBuilder } from "../context-builder.mjs";
import { MockGenerator } from "../generators/mock.mjs";
import { NodeCodeValidator, SchemaValidator } from "../validators/index.mjs";
import { UniversalLoopRunner } from "../runner.mjs";

const STUDIO_ROOT = resolve(new URL("..", import.meta.url).pathname, "..", "..");
const TEMPLATE_DIR = join(STUDIO_ROOT, "projects", "_LOOP_TEMPLATE");

function miniProject(configExtra = {}) {
  const root = mkdtempSync(join(tmpdir(), "loop-reg-"));
  const projectDir = join(root, "projects", "demo");
  writeFile(join(projectDir, "prompts", "system.md"), "# sys {{ project_name }} :: {{ task }}", { flag: "w" });
  writeFile(join(projectDir, "prompts", "context-template.md"), "TASK {{ task }}\n{% if mechanics %}M{{ mechanics }}{% endif %}", { flag: "w" });
  const config = {
    project_name: "demo",
    loop: { max_iterations: 2, temperature_schedule: [0.5, 0] },
    generator: { type: "mock", model: "mock-test" },
    validator: { type: "node_code", entry: "main.mjs" },
    context_builder: { type: "studio_default" },
    ...configExtra,
  };
  return { root, projectDir, config };
}

test("реестр содержит все компоненты из архитектуры", () => {
  assert.deepEqual(Object.keys(REGISTRY), ["generators", "validators", "contextBuilders", "runners"]);
  for (const key of ["llm", "mock"]) assert.ok(REGISTRY.generators[key], key);
  for (const key of ["ceh_project", "node_code", "python_code", "json_schema", "llm_judge"]) assert.ok(REGISTRY.validators[key], key);
  assert.equal(REGISTRY.contextBuilders.studio_default, StudioContextBuilder);
  assert.equal(REGISTRY.runners.standard, UniversalLoopRunner);
});

test("buildRunnerFromConfig собирает раннер и инжектит пути (DI по static requires)", () => {
  const { root, projectDir, config } = miniProject();
  try {
    const runner = buildRunnerFromConfig(config, root, { projectDir, logger: silentLogger });
    assert.ok(runner instanceof UniversalLoopRunner);
    assert.ok(runner.generator instanceof MockGenerator);
    assert.ok(runner.validator instanceof NodeCodeValidator);
    assert.ok(runner.contextBuilder instanceof StudioContextBuilder);

    assert.equal(runner.validator.studioRoot, root);
    assert.equal(runner.validator.projectDir, projectDir);
    assert.equal(runner.validator.workspaceDir, join(projectDir, "workspace"));
    assert.equal(runner.contextBuilder.projectName, "demo");
    assert.equal(runner.config.maxIterations, 2);
    assert.deepEqual(runner.config.temperatureSchedule, [0.5, 0]);
    assert.ok(existsSync(join(projectDir, "workspace")), "workspace должен создаваться автоматически");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("промпты проекта подхватываются: system.md в генератор, context-template.md в билдер", async () => {
  const { root, projectDir, config } = miniProject();
  try {
    const runner = buildRunnerFromConfig({ ...config, generator: { type: "llm", provider: "openai", model: "m" } }, root, {
      projectDir,
      logger: silentLogger,
    });
    assert.equal(runner.generator.systemPromptTemplate, "# sys {{ project_name }} :: {{ task }}");
    assert.equal(runner.generator.systemPrompt, DEFAULT_SYSTEM_PROMPT);
    const rendered = runner.generator._resolveSystemPrompt({ taskInput: { goal: "собери hero" }, projectName: "demo", iteration: 0 });
    assert.equal(rendered, "# sys demo :: собери hero");
    assert.match(runner.contextBuilder.template, /^TASK \{\{ task \}\}/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("project_name в конфиге проигрывает имени папки (с предупреждением)", () => {
  const { root, projectDir, config } = miniProject({ project_name: "совсем-другое" });
  try {
    const warnings = [];
    const runner = buildRunnerFromConfig(config, root, {
      projectDir,
      logger: { ...silentLogger, warn: (msg, meta) => warnings.push([msg, meta]) },
    });
    assert.equal(runner.contextBuilder.projectName, basename(projectDir));
    assert.ok(warnings.some(([msg]) => /не совпадает/.test(msg)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("неизвестные типы дают ConfigError со списком доступных", () => {
  const { root, projectDir, config } = miniProject();
  try {
    assert.throws(
      () => buildRunnerFromConfig({ ...config, validator: { type: "магия" } }, root, { projectDir, logger: silentLogger }),
      (e) => e instanceof ConfigError && e.code === "E-CONFIG-VALIDATOR" && /json_schema/.test(e.message),
    );
    assert.throws(
      () => buildRunnerFromConfig({ ...config, generator: { type: "голубь" } }, root, { projectDir, logger: silentLogger }),
      (e) => e.code === "E-CONFIG-GENERATOR",
    );
    assert.throws(
      () => buildRunnerFromConfig({ ...config, context_builder: { type: "нет" } }, root, { projectDir, logger: silentLogger }),
      (e) => e.code === "E-CONFIG-CONTEXT",
    );
    assert.throws(
      () => buildRunnerFromConfig({ ...config, runner: "турбо" }, root, { projectDir, logger: silentLogger }),
      (e) => e.code === "E-CONFIG-RUNNER",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("json_schema-валидатор получает путь схемы относительно проекта", async () => {
  const { root, projectDir } = miniProject({
    validator: { type: "json_schema", schema: "schema.json" },
  });
  try {
    writeFile(join(projectDir, "schema.json"), JSON.stringify({ type: "object", required: ["title"] }), "utf8");
    const runner = buildRunnerFromConfig(
      {
        project_name: "demo",
        generator: { type: "mock", scripted: ['{"title": "ЦЕХ"}'] },
        validator: { type: "json_schema", schema: "schema.json" },
      },
      root,
      { projectDir, logger: silentLogger },
    );
    assert.ok(runner.validator instanceof SchemaValidator);
    const result = await runner.run("собери JSON", root, "demo");
    assert.equal(result.ok, true, JSON.stringify(result.feedback?.errors));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("llm_judge без judge_generator -> ConfigError", () => {
  const { root, projectDir, config } = miniProject({ validator: { type: "llm_judge" } });
  try {
    assert.throws(
      () => buildRunnerFromConfig(config, root, { projectDir, logger: silentLogger }),
      (e) => e.code === "E-CONFIG-VALIDATOR" && /judge_generator/.test(e.message),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("llm_judge с mock-судьёй собирается и работает", async () => {
  const { root, projectDir } = miniProject();
  const config = {
    project_name: "demo",
    generator: { type: "mock", scripted: ["артефакт"] },
    validator: {
      type: "llm_judge",
      pass_threshold: 0.7,
      judge_generator: { type: "mock", scripted: ['{"score": 0.95, "reasoning": "принято"}'] },
    },
  };
  try {
    const runner = buildRunnerFromConfig(config, root, { projectDir, logger: silentLogger });
    const result = await runner.run("оцени артефакт", root, "demo");
    assert.equal(result.ok, true, JSON.stringify(result.feedback?.errors));
    assert.equal(result.feedback.metrics.score, 0.95);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyOverridesInPlace: --dry-run, --iterations, --model, --validator, --checks", () => {
  const raw = { generator: { type: "llm", model: "gpt-4o" }, validator: { type: "ceh_project" }, loop: {} };
  applyOverridesInPlace(raw, { dryRun: true, iterations: 7 });
  assert.equal(raw.generator.type, "mock");
  assert.equal(raw.loop.max_iterations, 7);

  const raw2 = { generator: {}, validator: {}, loop: {} };
  applyOverridesInPlace(raw2, { provider: "anthropic", model: "claude", baseUrl: "https://x/v1", apiKeyEnv: "K", responseFormat: "files" });
  assert.equal(raw2.generator.provider, "anthropic");
  assert.equal(raw2.generator.model, "claude");
  assert.equal(raw2.generator.client.base_url, "https://x/v1");
  assert.equal(raw2.generator.client.api_key_env, "K");
  assert.equal(raw2.generator.response_format, "files");

  const raw3 = { generator: {}, validator: {}, loop: {} };
  applyOverridesInPlace(raw3, { validator: "node_code", checks: ["validate", "lint-slop"] });
  assert.equal(raw3.validator.type, "node_code");
  assert.deepEqual(raw3.validator.checks, ["validate", "lint-slop"]);
});

test("resolveProjectDir: явный аргумент → project_dir → папка конфига → projects/<name>", () => {
  const root = mkdtempSync(join(tmpdir(), "loop-dir-"));
  try {
    const explicit = join(root, "projects", "a");
    assert.equal(resolveProjectDir({}, root, { projectDir: explicit }), explicit);
    assert.equal(resolveProjectDir({ project_dir: "projects/b" }, root, {}), join(root, "projects", "b"));
    const cfgPath = join(root, "projects", "c", "loop.config.yaml");
    writeFile(cfgPath, "project_name: c\n", { flag: "w" });
    assert.equal(resolveProjectDir({ project_name: "other" }, root, { configPath: cfgPath }), join(root, "projects", "c"));
    assert.equal(resolveProjectDir({ project_name: "d" }, root, {}), join(root, "projects", "d"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("instantiate: DI-ключи из static requires перекрывают конфиг", () => {
  class Demo {
    static requires = ["studioRoot", "projectName"];
    constructor(opts) {
      this.opts = opts;
    }
  }
  const instance = instantiate(Demo, { studioRoot: "/from/yaml", extra: 1 }, { studioRoot: "/from/factory", projectName: "demo" });
  assert.equal(instance.opts.studioRoot, "/from/factory");
  assert.equal(instance.opts.projectName, "demo");
  assert.equal(instance.opts.extra, 1);
});

test("loadConfigAndRun на реальном шаблоне (офлайн) + saveResult пишет evidence", async () => {
  const result = await loadConfigAndRun(join(TEMPLATE_DIR, "loop.config.yaml"), "выдай ES-модуль с hello()", STUDIO_ROOT, {
    projectDir: TEMPLATE_DIR,
    dryRun: true,
    logger: silentLogger,
  });
  assert.equal(result.ok, true, JSON.stringify(result.feedback?.errors));
  assert.ok(result.iterations >= 1);
  assert.ok(Array.isArray(result.saved) && result.saved.length >= 2);

  const workspace = join(TEMPLATE_DIR, "workspace");
  const summary = JSON.parse(readFileSync(join(workspace, "loop-result.json"), "utf8"));
  assert.equal(summary.ok, true);
  assert.ok(Array.isArray(summary.history));
  assert.ok(existsSync(join(workspace, "result.txt")));
});

test("saveResult для карты файлов раскладывает их в workspace/out", () => {
  const dir = mkdtempSync(join(tmpdir(), "loop-save-"));
  try {
    const paths = saveResult(
      {
        ok: true,
        reason: "успех",
        iterations: 1,
        elapsedMs: 5,
        state: { history: [] },
        feedback: { ok: true, codes: ["OK"], errors: [], metrics: {} },
        artifact: { content: { "site/index.html": "<h1>ЦЕХ</h1>\n", "site/styles.css": ".a{color:red}\n" }, metadata: {} },
      },
      { projectDir: dir, config: {}, logger: silentLogger },
    );
    assert.ok(paths.some((p) => p.endsWith("loop-result.json")));
    assert.ok(existsSync(join(dir, "workspace", "out", "site", "index.html")));
    assert.equal(readFileSync(join(dir, "workspace", "out", "site", "styles.css"), "utf8"), ".a{color:red}\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("реальный шаблон проекта собирается фабрикой без переопределений", () => {
  const config = loadConfigFile(join(TEMPLATE_DIR, "loop.config.yaml"));
  const runner = buildRunnerFromConfig(config, STUDIO_ROOT, { projectDir: TEMPLATE_DIR, logger: silentLogger });
  const info = runner.describe();
  assert.equal(info.generator.provider, "mock");
  assert.equal(info.validator.type, "node_code");
  assert.equal(info.config.maxIterations, 3);
  assert.equal(info.workspaceDir, join(TEMPLATE_DIR, "workspace"));
});
