#!/usr/bin/env node
/* ЦЕХ lint-marketing.mjs — Валидатор маркетинговой логики и воронок.
   Node ≥18, ноль npm-зависимостей, exit 0/1.
   Проверяет К-16, B-25, наличие MARKETING.md и атрибутов конверсии. */

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

// 1. Проверка наличия MARKETING.md или секции Маркетинг в DIRECTION.md
const marketingMdPath = join(projectDir, "MARKETING.md");
const directionMdPath = join(projectDir, "DIRECTION.md");

let hasMarketingStrategy = false;
if (existsSync(marketingMdPath)) {
  const content = readFileSync(marketingMdPath, "utf8");
  if (/UVP|Ценностное предложение/i.test(content) && /JTBD|Целевая аудитория/i.test(content)) {
    hasMarketingStrategy = true;
  }
} else if (existsSync(directionMdPath)) {
  const content = readFileSync(directionMdPath, "utf8");
  if (/маркетинг|uvp|конверси/i.test(content)) {
    hasMarketingStrategy = true;
  }
}

if (!hasMarketingStrategy) {
  violations.push({
    code: "M-01",
    msg: "Отсутствует MARKETING.md (или маркетинг-раздел в DIRECTION.md) с описанием UVP и JTBD (К-16)"
  });
}

// 2. Проверка HTML файлов на data-analytics-event или аналитические атрибуты
function getHtmlFiles(dir) {
  let files = [];
  if (!existsSync(dir)) return files;
  const list = readdirSync(dir);
  for (const item of list) {
    const p = join(dir, item);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (item !== "node_modules" && item !== "tools" && !item.startsWith(".")) {
        files = files.concat(getHtmlFiles(p));
      }
    } else if (item.endsWith(".html")) {
      files.push(p);
    }
  }
  return files;
}

const siteDir = join(projectDir, "site");
if (existsSync(siteDir)) {
  const htmlFiles = getHtmlFiles(siteDir);
  for (const file of htmlFiles) {
    const content = readFileSync(file, "utf8");
    const relFile = file.replace(root + "/", "");
    const is404 = relFile.endsWith("404.html");
    
    // Проверка кнопок и ссылок-CTA
    const buttons = content.match(/<(?:button|a)[^>]*class="[^"]*(?:btn|cta|button)[^"]*"[^>]*>/gi) ?? [];
    let unTrackedCount = 0;
    for (const btn of buttons) {
      if (!/data-analytics-event|data-cta|onclick|id="cta-/i.test(btn)) {
        unTrackedCount++;
      }
    }

    if (unTrackedCount > 0) {
      violations.push({
        code: "B-25",
        msg: `${relFile}: найдено ${unTrackedCount} CTA-кнопок без атрибута отслеживания data-analytics-event`
      });
    }

    // Проверка наличия хоть одного CTA элемента (пропускаем 404)
    if (!is404) {
      const hasFormOrCta = /<form|<button|class="[^"]*cta[^"]*"/i.test(content);
      if (!hasFormOrCta) {
        violations.push({
          code: "M-02",
          msg: `${relFile}: страница не содержит ни одной точки конверсии (формы или CTA)`
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.log(`\n[lint-marketing] Найдено нарушений маркетинг-архитектуры: ${violations.length}`);
  for (const v of violations) {
    console.log(`  ${v.code}: ${v.msg}`);
  }
  process.exit(1);
} else {
  console.log(`[lint-marketing] Проверка маркетинговой воронки успешна.`);
  process.exit(0);
}
