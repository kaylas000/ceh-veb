#!/usr/bin/env node
/* ЦЕХ generate-style-options.mjs — Генератор 3 вариантов дизайна под тему.
   Node ≥18, ноль npm-зависимостей.
   Создает STYLE_OPTIONS.md с 3 принципиально разборными стилистическими путями. */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const projectArg = process.argv[2] ?? "projects/demo";
const industryArg = process.argv.includes("--industry") 
  ? process.argv[process.argv.indexOf("--industry") + 1]
  : "B2B / Промышленность / Услуги";

const projectDir = join(root, projectArg);

if (!existsSync(projectDir)) {
  console.error(`Ошибка: Директория проекта ${projectArg} не найдена.`);
  process.exit(1);
}

const archetypesPath = join(root, "config", "style-archetypes.json");
const archetypes = JSON.parse(readFileSync(archetypesPath, "utf8"));

// Выбираем 3 случайных уникальных архетипа
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const selected = shuffle(archetypes).slice(0, 3);
const options = ["A", "B", "C"];

let mdContent = `# STYLE_OPTIONS.md — Варианты стилистического развития проекта

> Отрасль: **${industryArg}**
> Арт-директор на Воротах G1 выбирает один из 3 вариантов выполнения команды:
> \`node scripts/apply-style-variant.mjs ${projectArg} --variant A|B|C\`

---
`;

selected.forEach((arch, idx) => {
  const optLetter = options[idx];
  mdContent += `
## Вариант ${optLetter}: ${arch.name} (${arch.id})

- **Эстетический характер**: ${arch.description}
- **Типографическая пара**: Display: \`${arch.fonts.display}\` · Body: \`${arch.fonts.body}\`
- **Палитра OKLCH**:
  - Surface: \`${arch.oklchPalette.bgSurface}\`
  - Text: \`${arch.oklchPalette.textMain}\`
  - Primary Accent: \`${arch.oklchPalette.brandPrimary}\`
  - Highlight Accent: \`${arch.oklchPalette.brandAccent}\`
- **Кодовое видео и кинематика**: Рецепты \`${arch.motionRecipes.join("` + `")}\` + детерминированный кадровый таймлайн.
- **Текстура**: \`${arch.texture}\`

### Команда утверждения на G1:
\`node scripts/apply-style-variant.mjs ${projectArg} --variant ${optLetter}\`

---
`;
});

const outputPath = join(projectDir, "STYLE_OPTIONS.md");
writeFileSync(outputPath, mdContent, "utf8");

console.log(`[generate-style-options] Успешно созданы 3 варианта дизайна: ${outputPath}`);
process.exit(0);
