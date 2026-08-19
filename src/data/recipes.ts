/* ------------------------------------------------------------------ */
/* motion/easing-curves.json — браузерные дефолты запрещены (B-02)     */
/* ------------------------------------------------------------------ */

export interface Curve {
  name: string;
  css: string;
  feel: string;
}

export const EASING_CURVES: Curve[] = [
  { name: "ceh-brake", css: "cubic-bezier(0.16, 1, 0.3, 1)", feel: "жёсткий разгон, тормоз в упор — reveal, маски" },
  { name: "ceh-snap", css: "cubic-bezier(0.34, 1.56, 0.64, 1)", feel: "пружинный довесок — штампы, переключатели" },
  { name: "ceh-drag", css: "cubic-bezier(0.65, 0, 0.15, 1)", feel: "тяжёлый ход, мягкая остановка — счётчики, панели" },
  { name: "ceh-coast", css: "cubic-bezier(0.33, 0.01, 0.16, 1)", feel: "долгий накат — кен-бёрнс, фоны" },
  { name: "ceh-drive", css: "cubic-bezier(0, 0, 1, 1)", feel: "равномерный ход конвейера; не путать с браузерным linear" },
];

/* ------------------------------------------------------------------ */
/* motion/recipes — 6 рецептов (MVP)                                   */
/* ------------------------------------------------------------------ */

export interface Recipe {
  id: string;
  slug: string;
  name: string;
  feel: string;
  duration: string;
  easing: string;
  stagger: string;
  useWhen: string;
  dontCombine: string;
  maxPerPage: number;
  cinematic?: boolean;
  liveNote: string;
}

export const RECIPES: Recipe[] = [
  {
    id: "M-01",
    slug: "mask-reveal",
    name: "Маска-reveal",
    feel: "строка выезжает из-под невидимой кромки, как лист из лотка",
    duration: "700ms",
    easing: "ceh-brake",
    stagger: "80–120ms между строками",
    useWhen: "Заголовки секций, плакатные строки, индексы.",
    dontCombine: "scramble-decode на том же элементе",
    maxPerPage: 6,
    cinematic: true,
    liveNote: "Живой пример — заголовки этого сайта и демо-плакат ниже.",
  },
  {
    id: "M-02",
    slug: "ken-burns",
    name: "Кен-бёрнс",
    feel: "фото медленно дышит: масштаб и сдвиг, камера наблюдает",
    duration: "12–18s, alternate",
    easing: "ceh-coast",
    stagger: "—",
    useWhen: "Единственное фото в секции; архивные сканы.",
    dontCombine: "параллакс на том же фото",
    maxPerPage: 2,
    cinematic: true,
    liveNote: "Живой пример — коллаж в паспорте и демо-кадр ниже.",
  },
  {
    id: "M-03",
    slug: "sticky-scene",
    name: "Липкая сцена",
    feel: "сцена закреплена, мир прокручивается сквозь неё",
    duration: "по шагам скролла",
    easing: "ceh-drag (смена состояний)",
    stagger: "один шаг = одна смена состояния",
    useWhen: "Нарратив ≥5 шагов: процесс, ворота, данные.",
    dontCombine: "параллакс внутри сцены",
    maxPerPage: 1,
    cinematic: true,
    liveNote: "Живой пример — раздел «Регламент»: левая плита закреплена.",
  },
  {
    id: "M-04",
    slug: "scramble-decode",
    name: "Скрэмбл-декодирование",
    feel: "надпись собирается из технического шума, как табло",
    duration: "800–1000ms",
    easing: "ceh-brake (огибающая)",
    stagger: "2 кадра на символ",
    useWhen: "Один главный заголовок, коды, номера бросков.",
    dontCombine: "mask-reveal на том же элементе",
    maxPerPage: 3,
    liveNote: "Живой пример — слово ЦЕХ в паспорте; наведите на плашку ниже.",
  },
  {
    id: "M-05",
    slug: "counter-tick",
    name: "Механический счётчик",
    feel: "цифры докручиваются, как барабан одометра",
    duration: "1200ms",
    easing: "ceh-drag",
    stagger: "120ms между разрядами",
    useWhen: "Метрики с реальным источником цифры (иначе B-15).",
    dontCombine: "count-up без источника",
    maxPerPage: 4,
    liveNote: "Живой пример — метрики успеха в разделе «Досье».",
  },
  {
    id: "M-06",
    slug: "conveyor-marquee",
    name: "Конвейер-marquee",
    feel: "лента едет без остановки, пауза — по наведению",
    duration: "22–30s на цикл",
    easing: "ceh-drive",
    stagger: "—",
    useWhen: "Разделители, бегущие коды правил, списки техник.",
    dontCombine: "две ленты навстречу в одном экране",
    maxPerPage: 2,
    liveNote: "Живой пример — ленты-разделители между разделами.",
  },
];
