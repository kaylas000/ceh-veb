/* Тесты text.mjs: code-fences, извлечение JSON, безопасные пути, обрезка, snake_case. */
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  extractJson,
  humanDuration,
  humanNumber,
  parseArtifactContent,
  safeResolveInside,
  snakeToCamelKeys,
  stripCodeFences,
  truncate,
} from "../text.mjs";

test("stripCodeFences снимает обёртку ```lang … ```", () => {
  assert.equal(stripCodeFences("```js\nconst a = 1;\n```"), "const a = 1;");
  assert.equal(stripCodeFences("```\nplain\n```"), "plain");
  assert.equal(stripCodeFences("const a = 1;"), "const a = 1;");
});

test("stripCodeFences не трогает текст с несколькими блоками", () => {
  const src = "пояснение\n```js\na\n```\nи ещё\n```js\nb\n```";
  assert.equal(stripCodeFences(src), src.trim());
});

test("stripCodeFences переживает оборванный вывод модели", () => {
  assert.equal(stripCodeFences("```python\nprint(1)"), "print(1)");
});

test("extractJson достаёт объект из текста с пояснениями", () => {
  const src = 'Вот результат:\n{"score": 0.9, "reasoning": "ок"}\nНадеюсь, поможет.';
  assert.deepEqual(JSON.parse(extractJson(src)), { score: 0.9, reasoning: "ок" });
});

test("extractJson учитывает скобки и кавычки внутри строк", () => {
  const src = '{"files": {"a.json": "{ not json }"}, "note": "скобки } внутри"}';
  assert.deepEqual(JSON.parse(extractJson(src)).note, "скобки } внутри");
});

test("extractJson возвращает null, если JSON нет", () => {
  assert.equal(extractJson("просто текст"), null);
});

test("safeResolveInside не выпускает запись за рабочую директорию", () => {
  const root = join(tmpdir(), "loop-engine-root");
  assert.equal(safeResolveInside("site/index.html", root), join(root, "site/index.html"));
  assert.throws(() => safeResolveInside("../../etc/passwd", root), /вне рабочей директории/);
  assert.throws(() => safeResolveInside("/etc/passwd", root), /абсолютный путь/);
  assert.throws(() => safeResolveInside("", root), /пустой путь/);
});

test("truncate режет по бюджету и сохраняет строку, если лимит не превышен", () => {
  assert.equal(truncate("abcdef", 100), "abcdef");
  const cut = truncate("a".repeat(1000), 50);
  assert.ok(cut.length <= 50 + 20);
  assert.match(cut, /обрезано/);
  assert.equal(truncate("abcdef", 0), "abcdef"); // max<=0 -> без обрезки (документировано)
});

test("snakeToCamelKeys переводит ключи и сохраняет snake-алиасы", () => {
  const out = snakeToCamelKeys({ max_iterations: 3, nested: { stop_on_first_success: true } });
  assert.equal(out.maxIterations, 3);
  assert.equal(out.max_iterations, 3);
  assert.equal(out.nested.stopOnFirstSuccess, true);
});

test("parseArtifactContent разбирает text/json/files", () => {
  assert.equal(parseArtifactContent("```js\nx\n```", { format: "text" }).content, "x");
  assert.deepEqual(parseArtifactContent('{"a":1}', { format: "json" }).content, { a: 1 });
  const files = parseArtifactContent('{"files":{"site/index.html":"<h1>ЦЕХ</h1>"}}', { format: "files" });
  assert.equal(files.format, "files");
  assert.equal(files.content["site/index.html"], "<h1>ЦЕХ</h1>");
  assert.throws(() => parseArtifactContent("нет json", { format: "json" }), /не найден JSON/);
});

test("humanNumber/humanDuration форматируют отчёт", () => {
  assert.equal(humanNumber(1234567), "1 234 567");
  assert.equal(humanDuration(950), "950ms");
  assert.equal(humanDuration(1536), "1.5s");
});
