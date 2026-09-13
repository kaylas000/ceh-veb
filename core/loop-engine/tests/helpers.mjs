/* Общие хелперы тестов движка (не тест-файл: не собирается node --test). */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * writeFileSync, который сначала создаёт родительские каталоги.
 * @param {string} path
 * @param {string} content
 */
export function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, String(content), "utf8");
  return path;
}
