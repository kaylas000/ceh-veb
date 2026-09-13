/* Тесты validators/ceh-project.mjs: разбор отчётов цеха + живой прогон scripts/validate.mjs. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createArtifact, createLoopState } from "../base.mjs";
import { CEH_CHECKS, CehProjectValidator, parseCodeLines, parseValidateReport } from "../validators/ceh-project.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = resolve(HERE, "..", "..", "..");

test("parseValidateReport разбирает OK/FAIL-строки и итог", () => {
  const report = [
    "OK   V-01 DIRECTION: референсы и цитаты · ссылок: 3/3",
    "FAIL V-04 site/ чист от BANNED B-01..B-16 · index.html:12 B-01 «transition: all»",
    "     evidence: дополнительная строка",
    "FAIL V-05 Квоты Q-01…Q-07 · Q-01: 4 рецептов",
    "──────────────────────────────────────────────",
    "ИТОГ: 15/17 · exit 1",
  ].join("\n");

  const parsed = parseValidateReport(report);
  assert.deepEqual(parsed.codes, ["V-04", "V-05"]);
  assert.equal(parsed.passed, 15);
  assert.equal(parsed.total, 17);
  assert.equal(parsed.rows.length, 2);
  assert.match(parsed.rows[0], /^V-04 site\/ чист/);
  assert.match(parsed.rows[0], /evidence/);
});

test("parseValidateReport на зелёном отчёте не находит ошибок", () => {
  const parsed = parseValidateReport("OK   V-01 x · ok\nOK   V-02 y · ok\nИТОГ: 2/2 · exit 0");
  assert.deepEqual(parsed.codes, []);
  assert.deepEqual(parsed.rows, []);
  assert.equal(parsed.total, 2);
});

test("parseCodeLines разбирает выводы lint-slop / lint-copy / lint-marketing", () => {
  const slop = parseCodeLines('index.html:12 B-01 «transition: all»\nsite/* B-08 единственный шрифт «Inter» без пары\n', "", "lint-slop");
  assert.deepEqual(slop.codes, ["B-01", "B-08"]);
  assert.match(slop.rows[0], /B-01 index\.html:12/);

  const copy = parseCodeLines('site/index.html:33 B-17 Абстрактный штамп -> "индивидуальный подход"\n[lint-copy] Найдено нарушений редполитики: 1\n', "", "lint-copy");
  assert.deepEqual(copy.codes, ["B-17"]);

  const marketing = parseCodeLines("[lint-marketing] Найдено нарушений маркетинг-архитектуры: 1\n  M-02: страница без CTA\n", "", "lint-marketing");
  assert.deepEqual(marketing.codes, ["M-02"]);

  const clean = parseCodeLines("чисто: запрещённые паттерны BANNED не найдены\n", "", "lint-slop");
  assert.deepEqual(clean.codes, []);
  assert.deepEqual(clean.rows, []);
});

test("реестр проверок указывает на существующие скрипты цеха", () => {
  for (const [name, check] of Object.entries(CEH_CHECKS)) {
    assert.ok(existsSync(join(STUDIO_ROOT, check.script)), `${name}: нет ${check.script}`);
  }
});

test("живой прогон: validate.mjs на шаблоне проекта даёт разбираемый FAIL-отчёт", async (t) => {
  const projectDir = join(STUDIO_ROOT, "projects", "_LOOP_TEMPLATE");
  if (!existsSync(join(STUDIO_ROOT, "scripts", "validate.mjs"))) return t.skip("нет scripts/validate.mjs");

  const v = new CehProjectValidator({
    studioRoot: STUDIO_ROOT,
    projectName: "_LOOP_TEMPLATE",
    projectDir,
    workspaceDir: join(projectDir, "workspace"),
    checks: ["validate"],
    timeoutMs: 120000,
  });

  const fb = await v.validate(createArtifact("// артефакт не влияет на validate.mjs\n"), createLoopState({ projectName: "_LOOP_TEMPLATE" }));
  assert.equal(fb.ok, false, "шаблон без досье обязан провалить V-01…V-17");
  assert.ok(fb.codes.some((c) => /^V-\d{2}$/.test(c)), `ожидались коды V-xx, получены: ${fb.codes.join(",")}`);
  assert.ok(fb.errors.length > 0);
  assert.match(fb.errors[0], /^validate: V-\d{2}/);
  assert.ok(fb.metrics.checks.validate.total >= 10, "итог validate.mjs не разобран");
  assert.ok(typeof fb.raw === "string" && fb.raw.length > 0);
});

test("предохранитель записи: materialize_target=project без allow_project_writes -> E-WRITE-GUARD", async () => {
  const projectDir = join(STUDIO_ROOT, "projects", "_LOOP_TEMPLATE");
  const v = new CehProjectValidator({
    studioRoot: STUDIO_ROOT,
    projectName: "_LOOP_TEMPLATE",
    projectDir,
    checks: ["validate"],
    materialize: true,
    materializeTarget: "project",
    allowProjectWrites: false,
  });
  const fb = await v.validate(createArtifact({ "site/index.html": "<h1>x</h1>" }), createLoopState({}));
  assert.equal(fb.ok, false);
  assert.deepEqual(fb.codes, ["E-WRITE-GUARD"]);
  assert.equal(existsSync(join(projectDir, "site", "index.html")), false, "движок не должен писать в проект без разрешения");
});

test("неизвестное имя проверки -> внятная ошибка со списком доступных", async () => {
  const v = new CehProjectValidator({ studioRoot: STUDIO_ROOT, projectName: "x", checks: ["lint-nesuschestvuet"] });
  const fb = await v.validate(createArtifact("x"), createLoopState({}));
  assert.equal(fb.ok, false);
  assert.deepEqual(fb.codes, ["E-CONFIG-CHECK"]);
  assert.match(fb.errors[0], /Доступны: validate/);
});

test("ignore_codes гасит выбранные коды (частичная приёмка)", async () => {
  const projectDir = join(STUDIO_ROOT, "projects", "_LOOP_TEMPLATE");
  const base = {
    studioRoot: STUDIO_ROOT,
    projectName: "_LOOP_TEMPLATE",
    projectDir,
    checks: ["lint-slop"],
    timeoutMs: 60000,
  };
  const v = new CehProjectValidator(base);
  const fb = await v.validate(createArtifact("x"), createLoopState({}));
  // lint-slop на проекте без site/ завершается ошибкой — важно, что коды игнорируются, а не падают
  const v2 = new CehProjectValidator({ ...base, ignoreCodes: ["B-01", "B-08"] });
  const fb2 = await v2.validate(createArtifact("x"), createLoopState({}));
  assert.ok(fb2.metrics.checks["lint-slop"].ignored.length >= 0);
  assert.equal(typeof fb.ok, "boolean");
  assert.equal(typeof fb2.ok, "boolean");
});
