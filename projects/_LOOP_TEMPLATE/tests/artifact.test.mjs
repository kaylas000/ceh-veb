/* Шаблон теста для артефакта цикла. ПЕРЕИМЕНУЙ/ПЕРЕПИШИ под свою задачу.
 *
 * Запускается валидатором node_code как:  node --test tests   (cwd = workspace/)
 * Переменные окружения от движка:
 *   LOOP_ENTRY        — путь артефакта относительно workspace (обычно main.mjs)
 *   LOOP_WORKSPACE    — абсолютный путь рабочей директории
 *   LOOP_PROJECT_DIR  — папка проекта
 *   LOOP_STUDIO_ROOT  — корень студии
 *   LOOP_ITERATION    — номер итерации (0-based)
 *
 * Node ≥18, ноль npm-зависимостей: только node:test + node:assert.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workspace = process.env.LOOP_WORKSPACE ?? resolve(here, "..");
const entryRel = process.env.LOOP_ENTRY ?? "main.mjs";
const entryPath = join(workspace, entryRel);

test("артефакт записан в workspace", () => {
  assert.ok(existsSync(entryPath), `нет файла ${entryPath}`);
});

test("артефакт — валидный ES-модуль с экспортами", async () => {
  const mod = await import(pathToFileURL(entryPath).href);
  assert.equal(typeof mod, "object", "импорт не вернул модуль");
  assert.ok(Object.keys(mod).length > 0, "в модуле нет ни одного именованного экспорта");
});

test("ЗАМЕНИ НА РЕАЛЬНЫЕ ПРОВЕРКИ: поведение артефакта", async () => {
  // Пример:
  //   const { hello } = await import(pathToFileURL(entryPath).href);
  //   assert.equal(hello("ЦЕХ"), "привет, ЦЕХ");
  const mod = await import(pathToFileURL(entryPath).href);
  assert.ok(mod, "модуль загружен");
});
