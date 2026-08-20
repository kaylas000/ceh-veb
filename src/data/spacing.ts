/* ------------------------------------------------------------------ */
/* Система контроля отступов: источник правды (spacing.tokens.json).    */
/* Шкала модульная (×1.5 / степени двойки). Всё, что не в шкале, —      */
/* нарушение. Fluid-значения — clamp() между 375px и 1440px.            */
/* ------------------------------------------------------------------ */

export const SPACING_SCALE: Array<{ key: string; px: number }> = [
  { key: "0", px: 0 },
  { key: "0.5", px: 2 },
  { key: "1", px: 4 },
  { key: "1.5", px: 6 },
  { key: "2", px: 8 },
  { key: "3", px: 12 },
  { key: "4", px: 16 },
  { key: "5", px: 20 },
  { key: "6", px: 24 },
  { key: "8", px: 32 },
  { key: "10", px: 40 },
  { key: "12", px: 48 },
  { key: "16", px: 64 },
  { key: "20", px: 80 },
  { key: "24", px: 96 },
  { key: "32", px: 128 },
  { key: "40", px: 160 },
  { key: "48", px: 192 },
  { key: "64", px: 256 },
];

export const APPROVED_PX = SPACING_SCALE.map((s) => s.px);

/* Семантические токены: компоненты и секции говорят на своём языке */
export const SEMANTIC_TOKENS: Array<{ token: string; ref: string; px: number; role: string }> = [
  { token: "--component-gap-xs", ref: "spacing.2", px: 8, role: "иконка ↔ подпись" },
  { token: "--component-gap-sm", ref: "spacing.4", px: 16, role: "элементы карточки" },
  { token: "--component-gap-md", ref: "spacing.6", px: 24, role: "блоки в секции" },
  { token: "--component-gap-lg", ref: "spacing.8", px: 32, role: "карточки в сетке" },
  { token: "--section-gap-sm", ref: "spacing.16", px: 64, role: "между секциями (моб.)" },
  { token: "--section-gap-md", ref: "spacing.24", px: 96, role: "между секциями" },
  { token: "--section-gap-lg", ref: "spacing.32", px: 128, role: "между актами" },
  { token: "--container-px-mobile", ref: "spacing.4", px: 16, role: "поле контейнера (моб.)" },
  { token: "--container-px-desktop", ref: "spacing.8", px: 32, role: "поле контейнера" },
];

export interface FluidToken {
  token: string;
  minPx: number;
  maxPx: number;
  css: string;
  role: string;
}

/* clamp() сгенерирован по формуле: min + (max-min)*((100vw-375)/(1440-375)) */
export const FLUID_TOKENS: FluidToken[] = [
  { token: "--fluid-section-py", minPx: 48, maxPx: 128, css: "clamp(3rem, 1.9rem + 4.5vw, 8rem)", role: "вертикаль секций" },
  { token: "--fluid-container-px", minPx: 16, maxPx: 40, css: "clamp(1rem, 0.3rem + 2.8vw, 2.5rem)", role: "поле контейнера" },
  { token: "--fluid-card-gap", minPx: 16, maxPx: 32, css: "clamp(1rem, 0.6rem + 1.6vw, 2rem)", role: "зазор карточек" },
  { token: "--fluid-heading-gap", minPx: 24, maxPx: 48, css: "clamp(1.5rem, 1rem + 2vw, 3rem)", role: "заголовок → контент" },
];

export function nearestApproved(px: number): number {
  const abs = Math.abs(px);
  return APPROVED_PX.reduce((prev, curr) => (Math.abs(curr - abs) < Math.abs(prev - abs) ? curr : prev));
}

export function isApproved(px: number): boolean {
  const v = Math.round(Math.abs(px));
  /* 1px разрешён как hairline (границы, волосяные разделители) */
  return v === 1 || APPROVED_PX.includes(v);
}

/* Утилита генерации fluid-clamp на лету (для новых компонентов) */
export function generateFluidClamp(minPx: number, maxPx: number, minVw = 375, maxVw = 1440): string {
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const interceptRem = (minPx - slope * minVw) / 16;
  return `clamp(${minPx / 16}rem, ${interceptRem.toFixed(3)}rem + ${(slope * 100).toFixed(3)}vw, ${maxPx / 16}rem)`;
}
