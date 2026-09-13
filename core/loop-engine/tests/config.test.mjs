/* Тесты config.mjs: парсер подмножества YAML, загрузка файла, нормализация путей. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { writeFile } from "./helpers.mjs";

import { ConfigError } from "../base.mjs";
import { findProjectConfig, loadConfigFile, normalizeProjectConfig, parseSimpleYaml } from "../config.mjs";

test("разбирает вложенные карты по отступам", () => {
  const out = parseSimpleYaml(`
project_name: "pcpolimer"
loop:
  max_iterations: 5
  temperature_schedule: [0.3, 0.1, 0.0]
  stop_on_first_success: true
generator:
  client:
    type: "openai"
    api_key_env: OPENAI_API_KEY
    base_url: https://api.openai.com/v1
`);
  assert.equal(out.project_name, "pcpolimer");
  assert.deepEqual(out.loop.temperature_schedule, [0.3, 0.1, 0.0]);
  assert.equal(out.loop.stop_on_first_success, true);
  assert.equal(out.generator.client.api_key_env, "OPENAI_API_KEY");
  assert.equal(out.generator.client.base_url, "https://api.openai.com/v1");
});

test("списки: блочные, flow, и элементы-карты", () => {
  const out = parseSimpleYaml(`
checks:
  - validate
  - lint-slop
inline: [a, b, 3]
people:
  - name: "арт-директор"
    role: gate
  - name: инженер
    role: build
`);
  assert.deepEqual(out.checks, ["validate", "lint-slop"]);
  assert.deepEqual(out.inline, ["a", "b", 3]);
  assert.deepEqual(out.people, [
    { name: "арт-директор", role: "gate" },
    { name: "инженер", role: "build" },
  ]);
});

test("комментарии и кавычки", () => {
  const out = parseSimpleYaml(`
# комментарий строки
a: 1 # хвостовой комментарий
b: "строка # не комментарий"
c: 'одинарные'
d: ~
e: null
f: true
g: -12
h: 1.5e3
`);
  assert.deepEqual(out, { a: 1, b: "строка # не комментарий", c: "одинарные", d: null, e: null, f: true, g: -12, h: 1500 });
});

test("блочные скаляры | и >", () => {
  const out = parseSimpleYaml(`
literal: |
  строка 1
  строка 2
folded: >
  одна
  две
after: 1
`);
  assert.equal(out.literal, "строка 1\nстрока 2\n");
  assert.equal(out.folded, "одна две\n");
  assert.equal(out.after, 1);
});

test("пустой ключ без детей = null, а не падение", () => {
  assert.deepEqual(parseSimpleYaml("a:\nb: 1"), { a: null, b: 1 });
  assert.deepEqual(parseSimpleYaml(""), {});
});

test("ошибки YAML содержат номер строки", () => {
  assert.throws(() => parseSimpleYaml("a: 1\n\tb: 2"), (e) => e instanceof ConfigError && /строка 2/.test(e.message) && /табуляция/.test(e.message));
  assert.throws(() => parseSimpleYaml("a: 1\na: 2"), (e) => e instanceof ConfigError && /дублирующийся ключ/.test(e.message));
  assert.throws(() => parseSimpleYaml("a: 1\n  b: 2"), (e) => e instanceof ConfigError && /отступ/.test(e.message));
});

test("loadConfigFile читает JSON и YAML, ругается на отсутствующий файл", () => {
  const dir = mkdtempSync(join(tmpdir(), "loop-cfg-"));
  try {
    const yamlPath = join(dir, "loop.config.yaml");
    writeFile(yamlPath, "project_name: demo\nloop:\n  max_iterations: 2\n", "utf8");
    assert.equal(loadConfigFile(yamlPath).loop.max_iterations, 2);

    const jsonPath = join(dir, "loop.config.json");
    writeFile(jsonPath, JSON.stringify({ project_name: "json-demo" }), "utf8");
    assert.equal(loadConfigFile(jsonPath).project_name, "json-demo");

    assert.throws(() => loadConfigFile(join(dir, "nope.yaml")), (e) => e.code === "E-CONFIG-MISSING");
    writeFile(join(dir, "bad.json"), "{oops", "utf8");
    assert.throws(() => loadConfigFile(join(dir, "bad.json")), (e) => e.code === "E-CONFIG-JSON");
    assert.equal(findProjectConfig(dir), yamlPath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("normalizeProjectConfig резолвит пути и переводит snake_case", () => {
  const dir = mkdtempSync(join(tmpdir(), "loop-norm-"));
  try {
    writeFile(join(dir, "prompts", "system.md"), "", { flag: "w" });
    const norm = normalizeProjectConfig(
      { project_name: "demo", loop: { max_iterations: 4 }, generator: { max_tokens: 100 }, context_builder: { include_skills: false } },
      { studioRoot: dir, projectDir: join(dir, "projects", "demo") },
    );
    assert.equal(norm.projectName, "demo");
    assert.equal(norm.projectDir, join(dir, "projects", "demo"));
    assert.equal(norm.loop.maxIterations, 4);
    assert.equal(norm.generator.maxTokens, 100);
    assert.equal(norm.contextBuilder.includeSkills, false);
    assert.equal(norm.paths.workspace, join(dir, "projects", "demo", "workspace"));
    assert.equal(norm.paths.systemPrompt, null); // prompts/ не создан -> null, без падения
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("реальный конфиг шаблона разбирается и совпадает с ожиданиями", () => {
  const path = findProjectConfig(new URL("../../../projects/_LOOP_TEMPLATE", import.meta.url).pathname);
  assert.ok(path, "loop.config.yaml шаблона не найден");
  const cfg = loadConfigFile(path);
  assert.equal(cfg.generator.type, "mock");
  assert.equal(cfg.validator.type, "node_code");
  assert.equal(cfg.context_builder.type, "studio_default");
  assert.ok(Array.isArray(cfg.loop.temperature_schedule));
  assert.equal(cfg.context_builder.include.docs, false);
});
