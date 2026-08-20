/* ------------------------------------------------------------------ */
/* motion/easing-curves.json — браузерные дефолты запрещены (B-02)     */
/* motion/recipes/ — 9 рецептов: 6 сид + 3 добыты из боевых проектов   */
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
  mined?: { from: string; yieldNote: string };
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
    liveNote: "Живой пример — заголовки этой страницы.",
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
    liveNote: "Живой пример — коллаж в паспорте студии.",
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
    liveNote: "Живой пример — слово ЦЕХ в паспорте.",
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
    liveNote: "Живой пример — метрики в разделе «Досье».",
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
  {
    id: "M-07",
    slug: "cart-assembly",
    name: "Вагонетка-сборка",
    feel: "деталь едет по ленте под скролл, на станциях бьют штампы",
    duration: "по прогрессу скролла",
    easing: "ceh-drag",
    stagger: "станция = удар штампа",
    useWhen: "Путь изделия/заявки по этапам: ворота, статусы, пайплайн.",
    dontCombine: "sticky-scene в том же экране",
    maxPerPage: 1,
    cinematic: true,
    mined: {
      from: "ЦЕХ · паспорт студии",
      yieldNote: "Добыт при сборке конвейера G1–G4: вагонетка + прогресс-риски ворот.",
    },
    liveNote: "Живой пример — конвейер в разделе «Ворота».",
  },
  {
    id: "M-08",
    slug: "oven-telemetry",
    name: "Печь-телеметрия",
    feel: "шкала греется до рабочей температуры, LED меняет статус",
    duration: "2000–2600ms до уставки",
    easing: "ceh-drag",
    stagger: "таймер тикает 1 раз в секунду",
    useWhen: "Прибор с реальной метрикой: температура, цикл, очередь.",
    dontCombine: "counter-tick на той же шкале",
    maxPerPage: 1,
    mined: {
      from: "pcpolimer · боевой проект",
      yieldNote: "Добыт из печи полимеризации: дуга 200 °C, LED «нагрев → полимеризация», дыхание тепла.",
    },
    liveNote: "Живой пример — стенд M-08 ниже в «Добытом».",
  },
  {
    id: "M-09",
    slug: "conveyor-hooks",
    name: "Конвейер-крюки",
    feel: "детали на крюках качаются с фазовым сдвигом, лента едет",
    duration: "14–18s на цикл ленты",
    easing: "ceh-drive (лента) + ceh-drag (качание)",
    stagger: "фаза качания = 0.7s на крюк",
    useWhen: "Декоративная лента с изделиями; разделитель длинных страниц.",
    dontCombine: "conveyor-marquee вплотную",
    maxPerPage: 1,
    mined: {
      from: "pcpolimer · боевой проект",
      yieldNote: "Добыт из шапки: крюки с деталями в выбранный RAL, пауза по наведению.",
    },
    liveNote: "Живой пример — стенд M-09 ниже в «Добытом».",
  },
  {
    id: "M-10",
    slug: "timeline-scrub",
    name: "Мастер-таймлайн со скрабом",
    feel: "вся сцена — один параметр 0→1, скролл крутит плёнку с инерцией",
    duration: "по длине скролла (220–320vh)",
    easing: "демпфирование прогресса 0.11 + кривые реестра внутри сцены",
    stagger: "акт = окно прогресса, событие = пересечение отметки",
    useWhen: "Длинный нарратив из трёх и более актов: путь изделия, пайплайн, история.",
    dontCombine: "второй pin в том же экране",
    maxPerPage: 1,
    cinematic: true,
    mined: {
      from: "ЦЕХ · сборочная линия",
      yieldNote: "Добыт при сборке кинематографической сцены G1–G4: scrub + canvas-последовательность 150 кадров + trail-blur.",
    },
    liveNote: "Живой пример — раздел 06 «Сборочная линия».",
  },
  {
    id: "M-11",
    slug: "intro-assembly",
    name: "Кинозаставка-сборка",
    feel: "частицы слетаются из хаоса в слово, удар, титр, шторки открывают сайт",
    duration: "≤3.4s: загрузка 0–0.44s · сцена 0.44–2.8s · титр 2.8–3.3s · шторки 3.3–4.2s",
    easing: "ceh-brake (сборка), ceh-snap-подобный удар, ceh-drag (шторки)",
    stagger: "задержка частицы = random × 0.4 (россыпь), буквы титра — 60ms",
    useWhen: "Первый экран студии или премьеры; реплей — только по явному запросу из шапки.",
    dontCombine: "scramble-decode поверх того же слова, автозвук, второй интро на странице",
    maxPerPage: 1,
    cinematic: true,
    mined: {
      from: "ЦЕХ · заставка студии",
      yieldNote: "Добыт из живой заставки: 3 пресета (частицы/свет/кинетика) на одном таймлайне, skip + sessionStorage, Web Audio по жесту, кино-шторки.",
    },
    liveNote: "Живой пример — кнопка «▶ Интро» в шапке (первый показ раз в сессию).",
  },
];

/* ---------- рулетка SEED ---------- */

export const SEED_AXES = {
  composition: [
    "ломаная сетка с левой рейкой",
    "индекс-реестр во всю ширину",
    "плакатные развороты",
    "наряд-паспорт с левой плитой",
    "асимметричная лестница блоков",
    "колонки-описи с полями",
  ],
  motion: [
    "липкая сцена",
    "конвейер-лента",
    "кен-бёрнс на архивных фото",
    "маска-reveal строк",
    "вагонетка-сборка",
    "скрэмбл-табло",
  ],
  typography: [
    "капс 9vw, перенос по смыслу",
    "антиква в наборе, mono-подписи",
    "гигантские цифры разделов",
    "узкий брусковый капс",
    "табличный mono как графика",
    "один тезис — один экран",
  ],
};
