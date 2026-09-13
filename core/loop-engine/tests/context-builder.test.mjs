/* Тесты context-builder.mjs: чтение архива, бюджеты, кэш, блок обратной связи, graceful. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { writeFile } from "./helpers.mjs";

import { createArtifact, createFeedback, createLoopState } from "../base.mjs";
import { DEFAULT_CONTEXT_TEMPLATE, SECTION_ORDER, StudioContextBuilder, stringifyArtifact } from "../context-builder.mjs";

const STUDIO_ROOT = resolve(new URL("..", import.meta.url).pathname, "..", "..");

function miniStudio() {
  const root = mkdtempSync(join(tmpdir(), "loop-studio-"));
  writeFile(join(root, "CONSTITUTION.md"), "# К-01\nКод не пишется до DIRECTION.md\n", { flag: "w" });
  writeFile(join(root, "anti-slop", "BANNED.md"), "# B-01\ntransition: all запрещён\n", { flag: "w" });
  writeFile(join(root, "skills", "SKILL-INDEX.md"), "# SK-01 broken-grid\n", { flag: "w" });
  writeFile(join(root, "skills", "broken-grid", "SKILL.md"), "## Правила\n1. асимметрия\n", { flag: "w" });
  writeFile(join(root, "motion", "easing-curves.json"), '{"ceh-out":"cubic-bezier(0.16,1,0.3,1)"}\n', { flag: "w" });
  writeFile(join(root, "gates", "G1-direction.md"), "# G1\nвход: DIRECTION.md\n", { flag: "w" });
  return root;
}

test("собирает секции из архива цеха: механика, скилы, motion, gates", () => {
  const builder = new StudioContextBuilder({ studioRoot: STUDIO_ROOT, projectName: "pcpolimer" });
  const ctx = builder.build("собери hero-секцию", createLoopState({ projectName: "pcpolimer" }), STUDIO_ROOT);

  assert.match(ctx, /МЕХАНИКА И ПРАВИЛА/);
  assert.match(ctx, /CONSTITUTION|К-01/);
  assert.match(ctx, /BANNED|B-01/);
  assert.match(ctx, /СКИЛЫ/);
  assert.match(ctx, /ФАЙЛ: skills\/SKILL-INDEX\.md/);
  assert.match(ctx, /easing-curves\.json/);
  assert.match(ctx, /ЗАДАЧА\s+собери hero-секцию/);
  assert.match(ctx, /Проект: pcpolimer/);

  const info = builder.describe();
  assert.ok(info.totalChars > 1000);
  assert.ok(info.sections.some((s) => s.name === "mechanics"));
  assert.ok(ctx.length <= builder.maxTotalChars + 4000, "бюджет контекста превышен");
});

test("порядок секций: механика раньше примеров (приоритет обрезки)", () => {
  const builder = new StudioContextBuilder({ studioRoot: STUDIO_ROOT, projectName: "pcpolimer" });
  const ctx = builder.build("задача", createLoopState({ projectName: "pcpolimer" }), STUDIO_ROOT);
  assert.ok(ctx.indexOf("МЕХАНИКА") < ctx.indexOf("СКИЛЫ"));
  assert.ok(SECTION_ORDER[0] === "mechanics");
  assert.ok(SECTION_ORDER[SECTION_ORDER.length - 1] === "examples");
});

test("отсутствующие каталоги переживаются gracefully (warning, а не исключение)", () => {
  const root = miniStudio();
  try {
    const builder = new StudioContextBuilder({ studioRoot: root, projectName: "ghost" });
    const ctx = builder.build("задача", createLoopState({ projectName: "ghost" }), root);
    assert.match(ctx, /К-01/); // CONSTITUTION.md есть
    assert.ok(!ctx.includes("references/"), "несуществующий каталог не должен появляться");
    assert.ok(builder.describe().warnings.some((w) => /не найден/.test(w)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("полностью пустая студия -> контекст всё равно собирается", () => {
  const root = mkdtempSync(join(tmpdir(), "loop-empty-"));
  try {
    const builder = new StudioContextBuilder({ studioRoot: root, projectName: "empty" });
    const ctx = builder.build("задача", createLoopState({ projectName: "empty" }), root);
    assert.match(ctx, /ЗАДАЧА/);
    assert.ok(ctx.length > 10);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("блок PREVIOUS ATTEMPT FAILED появляется только после провала", () => {
  const root = miniStudio();
  try {
    const builder = new StudioContextBuilder({ studioRoot: root, projectName: "demo" });
    const state = createLoopState({ projectName: "demo" });
    assert.ok(!builder.build("задача", state, root).includes("ПРЕДЫДУЩАЯ ПОПЫТКА"));

    state.iteration = 1;
    state.history.push({
      iteration: 0,
      temperature: 0.3,
      elapsedMs: 10,
      contextChars: 100,
      artifact: createArtifact("export const a = (;"),
      feedback: createFeedback({ ok: false, errors: ["main.mjs: SyntaxError: Unexpected token"], codes: ["E-SYN"], raw: "stderr…" }),
    });

    const ctx = builder.build("задача", state, root);
    assert.match(ctx, /ПРЕДЫДУЩАЯ ПОПЫТКА ПРОВАЛЕНА/);
    assert.match(ctx, /Unexpected token/);
    assert.match(ctx, /export const a = \(/);
    assert.match(ctx, /E-SYN/);
    assert.match(ctx, /ИСПРАВЛЕННЫЙ вариант/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("history_window ограничивает число показанных провалов", () => {
  const root = miniStudio();
  try {
    const state = createLoopState({ projectName: "demo" });
    for (let i = 0; i < 4; i += 1) {
      state.history.push({
        iteration: i,
        temperature: 0,
        elapsedMs: 1,
        contextChars: 1,
        artifact: createArtifact(`попытка ${i}`),
        feedback: createFeedback({ ok: false, errors: [`ошибка ${i}`], codes: ["E-SYN"] }),
      });
    }
    const one = new StudioContextBuilder({ studioRoot: root, projectName: "demo", historyWindow: 1 });
    const ctx1 = one.build("задача", state, root);
    assert.match(ctx1, /ошибка 3/);
    assert.ok(!ctx1.includes("ошибка 0"));

    const all = new StudioContextBuilder({ studioRoot: root, projectName: "demo", historyWindow: 0 });
    const ctxAll = all.build("задача", state, root);
    assert.match(ctxAll, /ошибка 0/);
    assert.match(ctxAll, /ошибка 3/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("свой шаблон проекта рендерится вместо дефолтного", () => {
  const root = miniStudio();
  try {
    const template = "ЗАДАЧА: {{ task }}\nПРОЕКТ: {{ project_name }}\nПРАВИЛА:\n{{ mechanics | truncate(120) }}\nИТЕР: {{ iteration }}";
    const builder = new StudioContextBuilder({ studioRoot: root, projectName: "demo", template });
    const ctx = builder.build("собери сайт", createLoopState({ projectName: "demo" }), root);
    assert.match(ctx, /^ЗАДАЧА: собери сайт/);
    assert.match(ctx, /ПРОЕКТ: demo/);
    assert.match(ctx, /ИТЕР: 1/);
    assert.ok(ctx.length < template.length + 400);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("бюджет: max_total_chars подрезает хвостовые секции, механика выживает", () => {
  const root = miniStudio();
  try {
    // раздуваем skills, чтобы резать было что
    writeFile(join(root, "skills", "big", "SKILL.md"), "x".repeat(40000), { flag: "w" });
    const builder = new StudioContextBuilder({
      studioRoot: root,
      projectName: "demo",
      maxTotalChars: 6000,
      maxCharsPerFile: 20000,
      maxCharsPerSection: 40000,
    });
    const ctx = builder.build("задача", createLoopState({ projectName: "demo" }), root);
    assert.ok(ctx.length <= 6000 + 500, `контекст ${ctx.length} больше бюджета`);
    assert.match(ctx, /К-01/, "механика обязана остаться");
    assert.ok(builder.describe().warnings.some((w) => /бюджет контекста/.test(w)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("кэш экземпляра: повторный build не читает диск снова, clearCache сбрасывает", () => {
  const root = miniStudio();
  try {
    const builder = new StudioContextBuilder({ studioRoot: root, projectName: "demo" });
    const first = builder.build("задача", createLoopState({ projectName: "demo" }), root);
    const cacheSize = builder._contentCache.size;
    assert.ok(cacheSize > 0);
    const second = builder.build("задача", createLoopState({ projectName: "demo" }), root);
    assert.equal(second, first);
    assert.equal(builder._contentCache.size, cacheSize, "кэш не должен расти на повторе");

    writeFile(join(root, "CONSTITUTION.md"), "# К-01 ОБНОВЛЕНО\n", "utf8");
    assert.equal(builder.build("задача", createLoopState({ projectName: "demo" }), root), second, "кэш держит старое");
    builder.clearCache();
    assert.match(builder.build("задача", createLoopState({ projectName: "demo" }), root), /ОБНОВЛЕНО/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("флаги include_skills/include_mechanics из патча работают", () => {
  const root = miniStudio();
  try {
    const builder = new StudioContextBuilder({ studioRoot: root, projectName: "demo", includeSkills: false, includeMechanics: false });
    const ctx = builder.build("задача", createLoopState({ projectName: "demo" }), root);
    assert.ok(!ctx.includes("SKILL-INDEX"));
    assert.ok(!ctx.includes("К-01"));
    assert.match(ctx, /ЗАДАЧА/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("docs по умолчанию выключены, включаются флагом", () => {
  const builder = new StudioContextBuilder({ studioRoot: STUDIO_ROOT, projectName: "pcpolimer" });
  assert.equal(builder.include.docs, false);
  const withDocs = new StudioContextBuilder({ studioRoot: STUDIO_ROOT, projectName: "pcpolimer", include: { docs: true } });
  assert.equal(withDocs.include.docs, true);
  const ctx = withDocs.build("задача", createLoopState({ projectName: "pcpolimer" }), STUDIO_ROOT);
  assert.match(ctx, /ПЛЕЙБУКИ/);
});

test("не тащит node_modules, .git и site/ текущего проекта", () => {
  const builder = new StudioContextBuilder({ studioRoot: STUDIO_ROOT, projectName: "pcpolimer" });
  const ctx = builder.build("задача", createLoopState({ projectName: "pcpolimer" }), STUDIO_ROOT);
  assert.ok(!ctx.includes("node_modules/"));
  assert.ok(!ctx.includes(".git/"));
  assert.ok(!ctx.includes("ФАЙЛ: projects/pcpolimer/site/"), "site/ проекта не должен попадать в dossier");
});

test("stringifyArtifact рендерит и строку, и карту файлов", () => {
  assert.equal(stringifyArtifact(createArtifact("код")), "код");
  const map = stringifyArtifact(createArtifact({ "site/index.html": "<h1>ЦЕХ</h1>" }));
  assert.match(map, /ФАЙЛ: site\/index\.html/);
  assert.match(map, /<h1>ЦЕХ<\/h1>/);
});

test("дефолтный шаблон движка рендерится без warnings о неизвестных переменных", () => {
  const root = miniStudio();
  try {
    const builder = new StudioContextBuilder({ studioRoot: root, projectName: "demo", template: DEFAULT_CONTEXT_TEMPLATE });
    builder.build("задача", createLoopState({ projectName: "demo" }), root);
    const unknown = builder.describe().warnings.filter((w) => /неизвестная переменная/.test(w));
    assert.deepEqual(unknown, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
