#!/usr/bin/env node
/* ЦЕХ roulette.mjs — раздаёт оси SEED: композиция × движение × типографика.
   Node ≥18, 0 зависимостей. Пишет SEED.md в указанный проект.
   Запуск: node scripts/roulette.mjs projects/<имя> */
import { writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const AXES = {
  composition: ["ломаная сетка с левой рейкой", "индекс-реестр во всю ширину", "плакатные развороты", "наряд-паспорт с левой плитой", "асимметричная лестница блоков"],
  motion: ["липкая сцена", "конвейер-лента", "кен-бёрнс на архивных фото", "маска-reveal строк", "вагонетка-сборка"],
  typography: ["капс 9vw, перенос по смыслу", "антиква в наборе, mono-подписи", "гигантские цифры разделов", "узкий брусковый капс", "табличный mono как графика"],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const project = process.argv[2] ?? "projects/new";
const dir = resolve(process.cwd(), project);
mkdirSync(dir, { recursive: true });

/* номер броска: следующий за максимальным в projects/ */
const taken = existsSync("projects") ? readdirSync("projects") : [];
const n = 1 + taken.length;
const seed = `# SEED.md — бросок №${n}

roulette.mjs · ${new Date().toISOString().slice(0, 10)} · оси розданы случайно

Композиция: ${pick(AXES.composition)}
Движение: ${pick(AXES.motion)}
Типографика: ${pick(AXES.typography)}
`;
writeFileSync(join(dir, "SEED.md"), seed, "utf8");
console.log(seed);
