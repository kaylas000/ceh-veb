#!/usr/bin/env node
/* ЦЕХ apply-style-variant.mjs — Применение утверждённого варианта стиля.
   Node ≥18, ноль npm-зависимостей.
   Записывает выбор в DIRECTION.md и зашивает OKLCH токены в CSS проекта. */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const projectArg = process.argv[2] ?? "projects/demo";
const variantArg = process.argv.includes("--variant") 
  ? process.argv[process.argv.indexOf("--variant") + 1].toUpperCase()
  : "A";

const projectDir = join(root, projectArg);
const optionsPath = join(projectDir, "STYLE_OPTIONS.md");

if (!existsSync(optionsPath)) {
  console.error(` Ошибка: STYLE_OPTIONS.md не найден в ${projectArg}. Сначала запустите generate-style-options.mjs`);
  process.exit(1);
}

const optionsContent = readFileSync(optionsPath, "utf8");
const variantMatch = optionsContent.match(new RegExp(`## Вариант ${variantArg}: ([^\\n]+) \\((ARCH-\\d{2})\\)`));

if (!variantMatch) {
  console.error(` Ошибка: Вариант ${variantArg} не найден в STYLE_OPTIONS.md`);
  process.exit(1);
}

const archName = variantMatch[1];
const archId = variantMatch[2];

const archetypesPath = join(root, "config", "style-archetypes.json");
const archetypes = JSON.parse(readFileSync(archetypesPath, "utf8"));
const arch = archetypes.find((a) => a.id === archId);

// 1. Записываем выбор в DIRECTION.md
const directionPath = join(projectDir, "DIRECTION.md");
let directionContent = existsSync(directionPath) ? readFileSync(directionPath, "utf8") : "# DIRECTION.md\n";

directionContent += `\n\n## Утвержденный Вариант Стиля (К-20)\n- **Архетип**: ${archName} (${archId})\n- **Шрифты**: ${arch.fonts.display} + ${arch.fonts.body}\n- **Motion**: ${arch.motionRecipes.join(", ")}\n`;
writeFileSync(directionPath, directionContent, "utf8");

// 2. Зашиваем OKLCH CSS токены в site/styles.css если существует
const siteCssPath = join(projectDir, "site", "styles.css");
if (existsSync(siteCssPath)) {
  let cssContent = readFileSync(siteCssPath, "utf8");
  const oklchBlock = `
/* --- Стилистический геном ${archId} (${archName}) --- */
@layer design-tokens {
  :root {
    --bg-surface: ${arch.oklchPalette.bgSurface};
    --bg-subtle: ${arch.oklchPalette.bgSubtle};
    --text-main: ${arch.oklchPalette.textMain};
    --brand-primary: ${arch.oklchPalette.brandPrimary};
    --brand-accent: ${arch.oklchPalette.brandAccent};
  }
}
`;
  writeFileSync(siteCssPath, oklchBlock + "\n" + cssContent, "utf8");
}

console.log(`[apply-style-variant] Успешно применен Вариант ${variantArg} (${archName}) к проекту ${projectArg}`);
process.exit(0);
