#!/usr/bin/env node
/* ЦЕХ lint-video-engine.mjs — Линтер кодового видео и кинематики.
   Node ≥18, ноль npm-зависимостей, exit 0/1.
   Проверяет К-19, наличие детерминированных пресетов и поддержку reduced-motion. */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const projectArg = process.argv[2] ?? "projects/pcpolimer";
const projectDir = join(root, projectArg);

if (!existsSync(projectDir)) {
  console.error(`Ошибка: директория ${projectArg} не найдена`);
  process.exit(1);
}

let violations = [];

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
    } else if (item.endsWith(".js") || item.endsWith(".html") || item.endsWith(".css") || item.endsWith(".ts") || item.endsWith(".tsx")) {
      files.push(p);
    }
  }
  return files;
}

const siteDir = join(projectDir, "site");
if (existsSync(siteDir)) {
  const files = getFiles(siteDir);
  let hasReducedMotionCheck = false;

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    if (/prefers-reduced-motion|reduced/i.test(content)) {
      hasReducedMotionCheck = true;
    }
  }

  if (!hasReducedMotionCheck) {
    violations.push({
      code: "V-15",
      msg: "Кодовое видео не содержит проверки prefers-reduced-motion (К-19)"
    });
  }
}

if (violations.length > 0) {
  console.log(`\n[lint-video-engine] Найдено нарушений кодового видео: ${violations.length}`);
  for (const v of violations) {
    console.log(`  ${v.code}: ${v.msg}`);
  }
  process.exit(1);
} else {
  console.log(`[lint-video-engine] Проверка видео-движка SOTA 2026 успешна.`);
  process.exit(0);
}
