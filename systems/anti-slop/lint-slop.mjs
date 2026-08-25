#!/usr/bin/env node
/* ЦЕХ lint-slop.mjs — grep по BANNED.md + эвристики. Node ≥18, 0 зависимостей.
   Запуск: node scripts/lint-slop.mjs projects/<имя> — печатает file:line CODE. */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const project = process.argv[2] ?? "projects/demo";
const siteDir = join(root, project, "site");
if (!existsSync(siteDir)) { console.error("site/ не найден"); process.exit(1); }

const RULES = [
  ["B-01", /transition\s*:\s*all/i],
  ["B-02", /ease-in-out|ease-in\b|ease-out\b|\.4,\s*0,\s*\.2,\s*1|(?<![\w.])ease(?![-\w])/i],
  ["B-05", /#6366f1|#8b5cf6|#a855f7/i],
  ["B-06", /background-clip\s*:\s*text/i],
  ["B-07", /backdrop-filter/i],
  ["B-09", /lorem ipsum/i],
  ["B-10", /rounded-2xl|border-radius\s*:\s*16px/i],
  ["B-12", /узнать больше|свяжитесь с нами/i],
  ["B-13", /blur-3xl|blur\(\s*8\d\s*px\s*\)/i],
  ["B-14", /нам доверяют|trusted by/i],
  ["B-15", /\d{3,}\+\s*(клиент|проект|компани)/i],
];

let found = 0;
const files = readdirSync(siteDir).filter((f) => /\.(html|css|js)$/.test(f));
const fams = new Set();
for (const f of files) {
  const c = readFileSync(join(siteDir, f), "utf8");
  for (const [code, re] of RULES) {
    c.split("\n").forEach((line, i) => {
      if (re.test(line)) { console.log(`${f}:${i + 1} ${code} «${line.trim().slice(0, 64)}»`); found++; }
    });
  }
  if (/\.html$/.test(f)) {
    if (/text-center/i.test(c) && /<h1/i.test(c) && (c.match(/class="[^"]*btn/g) ?? []).length >= 2)
      { console.log(`${f} B-03 hero: text-center + h1 + 2 кнопки`); found++; }
    if (/grid-cols-3/i.test(c) && (c.match(/class="card"/g) ?? []).length >= 3)
      { console.log(`${f} B-04 три одинаковые карточки в ряд`); found++; }
    if ((c.match(/py-24/g) ?? []).length >= 4)
      { console.log(`${f} B-16 одинаковый ритм секций`); found++; }
  }
  for (const m of c.matchAll(/font-family:\s*([^;}{]+)/g))
    m[1].split(",").map((s) => s.trim().replace(/['"]/g, ""))
      .filter((s) => s && !/sans-serif|serif|monospace|inherit/.test(s))
      .forEach((s) => fams.add(s));
}
if (fams.size === 1) { console.log(`site/* B-08 единственный шрифт «${[...fams][0]}» без пары`); found++; }
if (found === 0) console.log("чисто: запрещённые паттерны BANNED не найдены");
process.exit(found === 0 ? 0 : 1);
