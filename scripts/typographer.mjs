#!/usr/bin/env node
/* ЦЕХ typographer.mjs — Автотипограф и валидатор русской типографики.
   Node ≥18, ноль npm-зависимостей, exit 0/1.
   Вставляет &nbsp; после коротких предлогов (в, на, с, к, о, по, за, из, от...),
   заменяет дефисы-тире на длинное тире «—» в текстовых узлах. */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const projectArg = process.argv[2] ?? "projects/pcpolimer";
const fixMode = process.argv.includes("--fix");
const projectDir = join(root, projectArg);

if (!existsSync(projectDir)) {
  console.error(`Ошибка: директория ${projectArg} не найдена`);
  process.exit(1);
}

const prepositions = ["в", "на", "с", "к", "о", "по", "за", "из", "от", "до", "не", "ни", "для", "при", "без", "об", "во", "со", "ко", "из-за", "из-под"];

function processTextNode(text) {
  let updated = text;

  // 1. Неразрывные пробелы после предлогов
  for (const prep of prepositions) {
    const regex = new RegExp(`(\\b${prep})\\s+([a-zA-Zа-яА-Я0-9Ёё]+)`, "gi");
    updated = updated.replace(regex, "$1&nbsp;$2");
  }

  // 2. Дефис между пробелами на длинное тире
  updated = updated.replace(/(\s)-(\s)/g, "$1—$2");

  return updated;
}

function processContent(content, isHtml) {
  if (!isHtml) {
    return processTextNode(content);
  }

  // Для HTML обрабатываем только текст между тегами >...<
  return content.replace(/(>)([^<]+)(<)/g, (match, open, textNode, close) => {
    return open + processTextNode(textNode) + close;
  });
}

function getFiles(dir) {
  let files = [];
  if (!existsSync(dir)) return files;
  const list = readdirSync(dir);
  for (const item of list) {
    const p = join(dir, item);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (item !== "node_modules" && !item.startsWith(".")) {
        files = files.concat(getFiles(p));
      }
    } else if (item.endsWith(".html") || item.endsWith(".md")) {
      files.push(p);
    }
  }
  return files;
}

const files = getFiles(projectDir);
let changedCount = 0;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const isHtml = file.endsWith(".html");
  const formatted = processContent(content, isHtml);

  if (content !== formatted) {
    changedCount++;
    if (fixMode) {
      writeFileSync(file, formatted, "utf8");
      console.log(`[typographer] Исправлен файл: ${file.replace(root + "/", "")}`);
    } else {
      console.log(`[typographer] Требуется типографирование: ${file.replace(root + "/", "")}`);
    }
  }
}

if (changedCount > 0 && !fixMode) {
  console.log(`\n[typographer] Найдено файлов с нетипографированным текстом: ${changedCount}. Запустите с --fix для исправления.`);
  process.exit(1);
} else {
  console.log(`[typographer] Типографика чиста и соответствует стандарту.`);
  process.exit(0);
}
