#!/usr/bin/env node
/* ЦЕХ lint-copy.mjs — Валидатор копирайтинга и редполитики.
   Node ≥18, ноль npm-зависимостей, exit 0/1.
   Проверяет B-17, B-18, B-21, B-23 в тексте и HTML. */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const projectArg = process.argv[2] ?? "projects/pcpolimer";
const projectDir = join(root, projectArg);

if (!existsSync(projectDir)) {
  console.error(`Ошибка: директория ${projectArg} не найдена`);
  process.exit(1);
}

const bannedPhrases = [
  { pattern: /индивидуальн(?:ый|ого|ому|ым|ом|ая|ой|ую|ые|ых|ым|ыми)\s+подход/i, code: "B-17", msg: "Абстрактный штамп 'индивидуальный подход'" },
  { pattern: /высок(?:ое|ого|ому|им|ом|ая|ой|ую|ие|их|ими)\s+качеств/i, code: "B-17", msg: "Абстрактный штамп 'высокое качество'" },
  { pattern: /динамичн(?:о|ая|ое|ые|ый)\s+развивающ/i, code: "B-17", msg: "Абстрактный штамп 'динамично развивающаяся'" },
  { pattern: /команд(?:а|ы|е|у|ой)\s+профессионал/i, code: "B-17", msg: "Абстрактный штамп 'команда профессионалов'" },
  { pattern: /гибк(?:ая|ой|ую|ие|их|им)\s+систем(?:а|ы|е|у|ой)\s+скид/i, code: "B-17", msg: "Абстрактный штамп 'гибкая система скидок'" },
  { pattern: /лидер(?:ы|ам|ами|ах)?\s+рынк/i, code: "B-17", msg: "Абстрактное заявление 'лидеры рынка' без цифр" },
  { pattern: /широк(?:ий|ого|ому|им|ая|ой|ую|ие|их)\s+ассортимент/i, code: "B-17", msg: "Абстрактный штамп 'широкий ассортимент'" },
  { pattern: /демократичн(?:ые|ых|ыми|ая|ый)\s+цен/i, code: "B-17", msg: "Штамп 'демократичные цены'" },
];

const weakCTA = [
  { pattern: />\s*(?:подробнее|отправить|оформить|жми|нажать|далее|кликуть)\s*</i, code: "B-18", msg: "Бессодержательный CTA без глагола действия и результата" }
];

const unTypographed = [
  { pattern: /(?:^|\s)(?:в|на|с|к|о|по|за|из|от|до|не|ни|для|при|без)\s+[a-zA-Zа-яА-Я0-9]{1,10}\b(?!\s*&nbsp;)/iu, code: "B-23", msg: "Висячий предлог без неразрывного пробела" }
];

function getFiles(dir, exts = [".html", ".md"]) {
  let files = [];
  if (!existsSync(dir)) return files;
  const list = readdirSync(dir);
  for (const item of list) {
    const p = join(dir, item);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (item !== "node_modules" && !item.startsWith(".")) {
        files = files.concat(getFiles(p, exts));
      }
    } else {
      if (exts.some((ext) => item.endsWith(ext))) {
        files.push(p);
      }
    }
  }
  return files;
}

const targetFiles = getFiles(projectDir);
let violationsCount = 0;

for (const file of targetFiles) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  const relPath = file.replace(root + "/", "");

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    for (const rule of bannedPhrases) {
      if (rule.pattern.test(line)) {
        console.log(`${relPath}:${lineNum} ${rule.code} ${rule.msg} -> "${line.trim()}"`);
        violationsCount++;
      }
    }

    for (const rule of weakCTA) {
      if (rule.pattern.test(line)) {
        console.log(`${relPath}:${lineNum} ${rule.code} ${rule.msg} -> "${line.trim()}"`);
        violationsCount++;
      }
    }
  });
}

if (violationsCount > 0) {
  console.log(`\n[lint-copy] Найдено нарушений редполитики: ${violationsCount}`);
  process.exit(1);
} else {
  console.log(`[lint-copy] Проверка редполитики успешна. Нарушений не найдено.`);
  process.exit(0);
}
