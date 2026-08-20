/* ------------------------------------------------------------------ */
/* Mobile-Perfect: матрица устройств, sweep-список, перф-бюджет,      */
/* fluid-шкала и ручной чек-лист.                                      */
/* ------------------------------------------------------------------ */

export const TOUCH_MIN = 44;
export const TOUCH_SPACING_MIN = 8;
export const INPUT_FONT_MIN = 16;

export interface Device {
  name: string;
  w: number;
  h: number;
  dpr: number;
  os: string;
  notch?: boolean;
  reason: string;
}

export const DEVICES: Device[] = [
  { name: "iPhone SE", w: 375, h: 667, dpr: 2, os: "iOS", reason: "самый маленький актуальный экран iOS" },
  { name: "iPhone 14 Pro", w: 393, h: 852, dpr: 3, os: "iOS", notch: true, reason: "Dynamic Island + safe area" },
  { name: "Galaxy S21", w: 360, h: 800, dpr: 3, os: "Android", reason: "самый частый Android-профиль" },
  { name: "Galaxy A · бюджет", w: 360, h: 780, dpr: 2, os: "Android", reason: "слабое железо — перф-тест" },
  { name: "iPad Mini", w: 768, h: 1024, dpr: 2, os: "iPadOS", reason: "пограничная зона mobile/tablet" },
  { name: "iPad Pro 12.9", w: 1024, h: 1366, dpr: 2, os: "iPadOS", reason: "планшет ≠ растянутый mobile" },
  { name: "Xiaomi Redmi", w: 393, h: 851, dpr: 2.75, os: "Android", reason: "лидер бюджетного сегмента" },
  { name: "Z Fold · открыт", w: 717, h: 512, dpr: 2, os: "Android", reason: "складной, необычное соотношение" },
];

export interface SweepVp {
  w: number;
  h: number;
  label: string;
  group: "android" | "ios" | "tablet" | "exotic";
}

export const SWEEP_VIEWPORTS: SweepVp[] = [
  { w: 320, h: 568, label: "min-android", group: "android" },
  { w: 360, h: 640, label: "android-small", group: "android" },
  { w: 360, h: 740, label: "android-common", group: "android" },
  { w: 360, h: 800, label: "galaxy-s21", group: "android" },
  { w: 393, h: 851, label: "xiaomi-redmi", group: "android" },
  { w: 412, h: 915, label: "pixel-7", group: "android" },
  { w: 320, h: 480, label: "iphone-4", group: "ios" },
  { w: 375, h: 667, label: "iphone-se", group: "ios" },
  { w: 375, h: 812, label: "iphone-x", group: "ios" },
  { w: 390, h: 844, label: "iphone-12", group: "ios" },
  { w: 393, h: 852, label: "iphone-14-pro", group: "ios" },
  { w: 428, h: 926, label: "pro-max", group: "ios" },
  { w: 430, h: 932, label: "iphone-15-pm", group: "ios" },
  { w: 768, h: 1024, label: "ipad-mini-p", group: "tablet" },
  { w: 1024, h: 768, label: "ipad-mini-l", group: "tablet" },
  { w: 820, h: 1180, label: "ipad-air-p", group: "tablet" },
  { w: 1180, h: 820, label: "ipad-air-l", group: "tablet" },
  { w: 1024, h: 1366, label: "ipad-pro-p", group: "tablet" },
  { w: 717, h: 512, label: "fold-open", group: "exotic" },
  { w: 280, h: 653, label: "fold-closed", group: "exotic" },
  { w: 320, h: 1000, label: "narrow-tall", group: "exotic" },
  { w: 500, h: 320, label: "wide-short", group: "exotic" },
];

export const BREAKPOINTS = [
  { key: "xs", px: 320, note: "минимум" },
  { key: "sm", px: 375, note: "iPhone SE" },
  { key: "md", px: 428, note: "большие iPhone" },
  { key: "lg", px: 768, note: "планшет portrait" },
  { key: "xl", px: 1024, note: "планшет landscape" },
  { key: "xxl", px: 1440, note: "десктоп" },
];

/* fluid-типографика: та же формула, что в css-architecture/fluid-system.css */
export const FLUID_SCALE = [
  { token: "--fs-hero", min: 40, max: 88 },
  { token: "--fs-4xl", min: 36, max: 64 },
  { token: "--fs-3xl", min: 30, max: 48 },
  { token: "--fs-2xl", min: 24, max: 36 },
  { token: "--fs-xl", min: 20, max: 28 },
  { token: "--fs-base", min: 16, max: 18 },
  { token: "--fs-sm", min: 14, max: 16 },
];

export const fluidValue = (min: number, max: number, vw: number): number =>
  Math.round(Math.min(max, Math.max(min, min + ((max - min) * (vw - 320)) / (1440 - 320))));

export const PERF_BUDGET = [
  { metric: "LCP", limit: "2 500 мс", slow: "4 000 мс" },
  { metric: "CLS", limit: "0.1", slow: "0.25" },
  { metric: "TTI", limit: "3 800 мс", slow: "6 000 мс" },
  { metric: "вес страницы", limit: "1.5 МБ", slow: "1.0 МБ" },
  { metric: "JS-бандл", limit: "300 КБ", slow: "—" },
  { metric: "изображения", limit: "800 КБ", slow: "—" },
  { metric: "шрифты", limit: "150 КБ", slow: "—" },
  { metric: "запросы", limit: "50", slow: "—" },
];

export const MANUAL_CHECKS: Array<{ group: string; items: string[] }> = [
  {
    group: "Реальное устройство",
    items: [
      "iPhone (Safari): bounce-scroll, клавиатура не перекрывает поля",
      "Бюджетный Android: системный размер шрифта не ломает макет",
      "Одной рукой: большой палец достаёт до ключевых CTA снизу",
      "Landscape: ничего не обрезано, видео не растянуто",
    ],
  },
  {
    group: "Mobile-паттерны",
    items: [
      "Клавиатура открыта → страница скроллится к активному полю",
      "Фиксированная шапка не перекрывает контент при прыжке к якорю",
      "Модалка закрывается свайпом или явной кнопкой",
      "Двойной тап не зумит там, где не задумано",
    ],
  },
  {
    group: "iOS / Android",
    items: [
      "Инпуты не вызывают автозум при фокусе (≥16px)",
      "Safe area для Dynamic Island учтена",
      "Системный жест «назад» не конфликтует со свайпами сайта",
      "Momentum-scroll плавный, где нужно",
    ],
  },
  {
    group: "Сеть и контент",
    items: [
      "Проверено на реальном 3G/4G, не только офисной сети",
      "Длинные имена не переполняют кнопки и карточки",
      "Пустые состояния продуманы на 320px",
      "Ошибки форм видны без скролла",
    ],
  },
];
