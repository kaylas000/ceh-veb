/* Тесты validators/node-code.mjs: синтаксис, тесты, smoke, защита путей. */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { writeFile } from "./helpers.mjs";

import { createArtifact, createLoopState } from "../base.mjs";
import { parseTapSummary, summarizeTestOutput } from "../validators/node-code.mjs";
import { NodeCodeValidator } from "../validators/node-code.mjs";

function sandbox() {
  const studioRoot = mkdtempSync(join(tmpdir(), "loop-node-"));
  const projectDir = join(studioRoot, "projects", "demo");
  const workspaceDir = join(projectDir, "workspace");
  return { studioRoot, projectDir, workspaceDir };
}

const state = () => createLoopState({ projectName: "demo", iteration: 0 });

test("валидный модуль проходит (smoke, без тестов)", async (t) => {
  const { studioRoot, projectDir, workspaceDir } = sandbox();
  try {
    const v = new NodeCodeValidator({ studioRoot, projectDir, workspaceDir, entry: "main.mjs" });
    const fb = await v.validate(createArtifact("export const hello = (n = 'ЦЕХ') => `привет, ${n}`;\n"), state());
    assert.equal(fb.ok, true, JSON.stringify(fb.errors));
    assert.deepEqual(fb.codes, ["OK"]);
    assert.ok(existsSync(join(workspaceDir, "main.mjs")));
    assert.equal(fb.metrics.syntaxChecked, 1);
    t.assert.ok(fb.raw.smoke?.exitCode === 0);
  } finally {
    rmSync(studioRoot, { recursive: true, force: true });
  }
});

test("синтаксическая ошибка -> E-SYN и содержательный текст", async () => {
  const { studioRoot, projectDir, workspaceDir } = sandbox();
  try {
    const v = new NodeCodeValidator({ studioRoot, projectDir, workspaceDir });
    const fb = await v.validate(createArtifact("export const broken = (;\n"), state());
    assert.equal(fb.ok, false);
    assert.deepEqual(fb.codes, ["E-SYN"]);
    assert.match(fb.errors[0], /main\.mjs/);
  } finally {
    rmSync(studioRoot, { recursive: true, force: true });
  }
});

test("code-fence от модели не ломает валидацию (снимается генератором/артефактом)", async () => {
  const { studioRoot, projectDir, workspaceDir } = sandbox();
  try {
    const v = new NodeCodeValidator({ studioRoot, projectDir, workspaceDir });
    const fb = await v.validate(createArtifact("export const a = 1;\n"), state());
    assert.equal(fb.ok, true);
  } finally {
    rmSync(studioRoot, { recursive: true, force: true });
  }
});

test("тесты проекта копируются в workspace и запускаются через node --test", async () => {
  const { studioRoot, projectDir, workspaceDir } = sandbox();
  try {
    writeFile(
      join(projectDir, "tests", "artifact.test.mjs"),
      [
        'import assert from "node:assert/strict";',
        'import test from "node:test";',
        'import { pathToFileURL } from "node:url";',
        'import { join } from "node:path";',
        "",
        "test('экспорт работает', async () => {",
        "  const ws = process.env.LOOP_WORKSPACE;",
        "  const entry = process.env.LOOP_ENTRY ?? 'main.mjs';",
        "  const mod = await import(pathToFileURL(join(ws, entry)).href);",
        "  assert.equal(mod.hello('ЦЕХ'), 'привет, ЦЕХ');",
        "});",
        "",
      ].join("\n"),
      { flag: "w" },
    );
    const v = new NodeCodeValidator({ studioRoot, projectDir, workspaceDir });

    const ok = await v.validate(createArtifact("export const hello = (n) => `привет, ${n}`;\n"), state());
    assert.equal(ok.ok, true, JSON.stringify(ok.errors));
    assert.equal(ok.metrics.tests.fail, 0);
    assert.equal(ok.metrics.tests.pass, 1);
    assert.ok(existsSync(join(workspaceDir, "tests", "artifact.test.mjs")));

    const bad = await v.validate(createArtifact("export const hello = (n) => `ошибка, ${n}`;\n"), state());
    assert.equal(bad.ok, false);
    assert.ok(bad.codes.includes("E-TEST"));
    assert.match(bad.errors[0], /Тесты провалены/);
  } finally {
    rmSync(studioRoot, { recursive: true, force: true });
  }
});

test("require_tests: нет тестов -> E-NO-TESTS", async () => {
  const { studioRoot, projectDir, workspaceDir } = sandbox();
  try {
    const v = new NodeCodeValidator({ studioRoot, projectDir, workspaceDir, requireTests: true });
    const fb = await v.validate(createArtifact("export const a = 1;\n"), state());
    assert.equal(fb.ok, false);
    assert.ok(fb.codes.includes("E-NO-TESTS"));
  } finally {
    rmSync(studioRoot, { recursive: true, force: true });
  }
});

test("карта файлов пишется по путям, а выход за workspace блокируется", async () => {
  const { studioRoot, projectDir, workspaceDir } = sandbox();
  try {
    const v = new NodeCodeValidator({ studioRoot, projectDir, workspaceDir, entry: "site/app.mjs" });
    const good = await v.validate(
      createArtifact({ "site/app.mjs": "export const a = 1;\n", "site/styles.css": ".x{color:oklch(0.7 0.1 200)}\n" }),
      state(),
    );
    assert.equal(good.ok, true, JSON.stringify(good.errors));
    assert.ok(existsSync(join(workspaceDir, "site", "app.mjs")));

    const evil = await v.validate(createArtifact({ "../../escape.mjs": "export const a = 1;\n" }), state());
    assert.equal(evil.ok, false);
    assert.deepEqual(evil.codes, ["E-PATH"]);
    assert.match(evil.errors[0], /вне рабочей директории|не удалось записать/);
    assert.equal(existsSync(join(studioRoot, "escape.mjs")), false);
  } finally {
    rmSync(studioRoot, { recursive: true, force: true });
  }
});

test("grep-проверки из конфига (patterns) ловят запрещённое", async () => {
  const { studioRoot, projectDir, workspaceDir } = sandbox();
  try {
    const v = new NodeCodeValidator({
      studioRoot,
      projectDir,
      workspaceDir,
      runSmoke: false,
      patterns: [{ code: "B-01", pattern: "transition:\\s*all", message: "transition: all запрещён" }],
    });
    const fb = await v.validate(createArtifact("const css = 'transition: all .3s';\nexport default css;\n"), state());
    assert.equal(fb.ok, false);
    assert.ok(fb.codes.includes("B-01"));
    assert.match(fb.errors[0], /запрещён/);
  } finally {
    rmSync(studioRoot, { recursive: true, force: true });
  }
});

test("runtime-ошибка в smoke -> E-RUN", async () => {
  const { studioRoot, projectDir, workspaceDir } = sandbox();
  try {
    const v = new NodeCodeValidator({ studioRoot, projectDir, workspaceDir });
    const fb = await v.validate(createArtifact("export const a = 1;\nthrow new Error('взрыв');\n"), state());
    assert.equal(fb.ok, false);
    assert.ok(fb.codes.includes("E-RUN"));
    assert.match(fb.errors[0], /взрыв/);
  } finally {
    rmSync(studioRoot, { recursive: true, force: true });
  }
});

test("parseTapSummary и summarizeTestOutput", () => {
  const tap = "# Subtest: ok\nok 1 - x\n# pass 2\n# fail 1\n# duration_ms 12.5\n";
  assert.deepEqual(parseTapSummary(tap), { pass: 2, fail: 1, tests: null, skipped: null, durationMs: 12.5 });
  const summary = summarizeTestOutput("not ok 1 - boom\nAssertionError: x\nмусор\n", "");
  assert.match(summary, /not ok 1/);
  assert.match(summary, /AssertionError/);
  assert.ok(summary.length < 2500);
});
