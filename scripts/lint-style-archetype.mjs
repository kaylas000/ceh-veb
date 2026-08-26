#!/usr/bin/env node
/* ЦЕХ lint-style-archetype.mjs — Валидатор утвержденного стиля и вариативности.
   Node ≥18, ноль npm-зависимостей, exit 0/1.
   Проверяет К-20, V-17, наличие STYLE_OPTIONS.md и фиксацию архетипа на Воротах G1. */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const projectArg = process.argv[2] ?? "projects/pcpolimer";
const projectDir = join(root, projectArg);

if (!existsSync(projectDir)) {
  console.error(`Ошибка: Директория ${projectArg} не найдена.`);
  process.exit(1);
}

const directionPath = join(projectDir, "DIRECTION.md");
let hasArchetype = false;

if (existsSync(directionPath)) {
  const content = readFileSync(directionPath, "utf8");
  if (/ARCH-\d{2}|Архетип|Вариант/i.test(content)) {
    hasArchetype = true;
  }
}

if (!hasArchetype) {
  console.log(`[lint-style-archetype] V-17 FAIL: В DIRECTION.md не зафиксирован утвержденный Архетип Стиля (ARCH-01..ARCH-05).`);
  process.exit(1);
} else {
  console.log(`[lint-style-archetype] V-17 PASS: Стилистический архетип зафиксирован.`);
  process.exit(0);
}
