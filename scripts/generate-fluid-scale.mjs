#!/usr/bin/env node
/* ЦЕХ generate-fluid-scale.mjs — Расчёт макросов clamp() для типов и отступов.
   Node ≥18, ноль npm-зависимостей.
   Генерирует каноническую адаптивную шкалу типографики и отступов. */

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());

function calcClamp(minPx, maxPx, minViewport = 320, maxViewport = 1440) {
  const minRem = (minPx / 16).toFixed(3);
  const maxRem = (maxPx / 16).toFixed(3);
  const slope = (maxPx - minPx) / (maxViewport - minViewport);
  const yAxisIntersection = -minViewport * slope + minPx;
  const interceptRem = (yAxisIntersection / 16).toFixed(3);
  const vwValue = (slope * 100).toFixed(3);

  return `clamp(${minRem}rem, ${interceptRem}rem + ${vwValue}vw, ${maxRem}rem)`;
}

const typeScale = {
  sm: calcClamp(12, 14),
  base: calcClamp(14, 18),
  md: calcClamp(18, 24),
  lg: calcClamp(24, 36),
  xl: calcClamp(36, 64),
  mega: calcClamp(48, 110),
};

const spacingScale = {
  1: calcClamp(4, 8),
  2: calcClamp(8, 16),
  3: calcClamp(16, 32),
  4: calcClamp(32, 64),
  5: calcClamp(64, 128),
};

const cssOutput = `/* Автосгенерированная Fluid Clamp шкала ЦЕХ */
@layer design-tokens {
  :root {
    /* Typographic Fluid Scale */
    --font-sm: ${typeScale.sm};
    --font-base: ${typeScale.base};
    --font-md: ${typeScale.md};
    --font-lg: ${typeScale.lg};
    --font-xl: ${typeScale.xl};
    --font-mega: ${typeScale.mega};

    /* Spacing Fluid Scale */
    --space-1: ${spacingScale[1]};
    --space-2: ${spacingScale[2]};
    --space-3: ${spacingScale[3]};
    --space-4: ${spacingScale[4]};
    --space-5: ${spacingScale[5]};
  }
}
`;

const outputPath = join(root, "css-architecture", "fluid-scale.generated.css");
writeFileSync(outputPath, cssOutput, "utf8");

console.log(`[generate-fluid-scale] Успешно сгенерирована шкала: ${outputPath}`);
process.exit(0);
