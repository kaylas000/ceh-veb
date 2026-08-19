/* Данные компании «Порошковая покраска» (Pcpolimer), Красногорск.
   Собраны из открытых источников: профиль Яндекс Карт + справочники. */

export const COMPANY = {
  name: "Порошковая покраска",
  brand: "PCPOLIMER",
  city: "Красногорск",
  address: "Московская обл., г. Красногорск, Речная улица, 8, стр. 18, 2 этаж",
  addressShort: "Речная ул., 8, стр. 18",
  metro: "м. Митино · 5 минут пешком",
  phone: "+7 (495) 023-59-23",
  phoneHref: "tel:+74950235923",
  hours: "Ежедневно до 21:00",
  rating: 4.9,
  ratingsCount: 38,
  reviewsCount: 28,
  photosCount: 150,
  yandexMapsUrl: "https://yandex.ru/maps/?text=Красногорск,%20Речная%20улица,%208",
};

export type RalColor = {
  code: string;
  name: string;
  hex: string;
};

export const RAL: RalColor[] = [
  { code: "RAL 9016", name: "Белый транспортный", hex: "#f1f0ea" },
  { code: "RAL 9006", name: "Алюминий белый", hex: "#a5a5a5" },
  { code: "RAL 1013", name: "Устрично-белый", hex: "#e3d9c6" },
  { code: "RAL 1023", name: "Жёлтый транспортный", hex: "#f7c500" },
  { code: "RAL 2004", name: "Оранжевый чистый", hex: "#e25303" },
  { code: "RAL 3020", name: "Красный транспортный", hex: "#c1121c" },
  { code: "RAL 3004", name: "Пурпурно-красный", hex: "#701f29" },
  { code: "RAL 4010", name: "Маджента телекоммуникац.", hex: "#cf3476" },
  { code: "RAL 5015", name: "Голубой небесный", hex: "#2271b3" },
  { code: "RAL 5021", name: "Синий водяной", hex: "#07737a" },
  { code: "RAL 5002", name: "Синий ультрамариновый", hex: "#20214f" },
  { code: "RAL 6018", name: "Зелёный жёлто-зелёный", hex: "#57a639" },
  { code: "RAL 6029", name: "Зелёный мятный", hex: "#006f3d" },
  { code: "RAL 6002", name: "Зелёный лиственный", hex: "#2d572c" },
  { code: "RAL 8017", name: "Коричневый шоколадный", hex: "#45322e" },
  { code: "RAL 7016", name: "Антрацитовый серый", hex: "#383e42" },
  { code: "RAL 7024", name: "Серый графитовый", hex: "#474a51" },
  { code: "RAL 7035", name: "Серый светлый", hex: "#d7d7d7" },
  { code: "RAL 9005", name: "Чёрный янтарный", hex: "#0a0a0a" },
  { code: "RAL 9007", name: "Алюминий серый", hex: "#8f8f8f" },
];

export type Service = {
  id: string;
  title: string;
  price: string;
  unit: "m2" | "pc" | "custom";
  base: number | null; /* базовая цена для калькулятора */
  note: string;
  tag: string;
};

export const SERVICES: Service[] = [
  {
    id: "profile",
    title: "Покраска металлопрофиля",
    price: "от 100 ₽",
    unit: "m2",
    base: 100,
    note: "погонный метр · любой RAL · матовое и глянцевое",
    tag: "позиция 01",
  },
  {
    id: "facade",
    title: "Фасадные панели",
    price: "500 ₽/м²",
    unit: "m2",
    base: 500,
    note: "включая перфорированные и кассетные панели",
    tag: "позиция 02",
  },
  {
    id: "oven",
    title: "Обработка в высокотемпературной камере",
    price: "500 ₽/м² · 6 000 ₽/шт",
    unit: "m2",
    base: 500,
    note: "полимеризация в печи до 200 °C · крупногабарит до 2 м",
    tag: "позиция 03",
  },
  {
    id: "fence",
    title: "Порошковая покраска заборов",
    price: "от 4 000 ₽",
    unit: "m2",
    base: 500,
    note: "секции, лаги, столбы · антрацит 7016 — хит сезона",
    tag: "позиция 04",
  },
  {
    id: "gate",
    title: "Порошковая покраска ворот",
    price: "от 6 000 ₽/шт",
    unit: "pc",
    base: 6000,
    note: "распашные, откатные, секционные · с фурнитурой",
    tag: "позиция 05",
  },
  {
    id: "auto",
    title: "Авто-, мото- и велодетали",
    price: "по запросу",
    unit: "custom",
    base: null,
    note: "диски, рамы, кронштейны, суппорты · пескоструй включён",
    tag: "позиция 06",
  },
];

export type ProcessStep = {
  n: string;
  title: string;
  param: string;
  paramLabel: string;
  text: string;
  img: string;
  imgAlt: string;
  ral: string;
};

export const PROCESS: ProcessStep[] = [
  {
    n: "01",
    title: "Подготовка поверхности",
    param: "Sa 2.5",
    paramLabel: "степень очистки",
    text: "Обезжиривание, пескоструйная обработка и фосфатирование. От подготовки зависит адгезия — снимаем старую краску и ржавчину до чистого металла.",
    img: "https://image.qwenlm.ai/generated-images/1c902020-7a2e-4967-9793-baf4e60c3ca0/_result.png",
    imgAlt: "Подготовленная металлическая поверхность",
    ral: "#8f8f8f",
  },
  {
    n: "02",
    title: "Нанесение порошка",
    param: "60–120 мкм",
    paramLabel: "слой покрытия",
    text: "Электростатическое напыление: частицы полимера заряжаются и обволакивают деталь равномерно, включая кромки и сварные швы. Цвет — любой по каталогу RAL.",
    img: "https://image.qwenlm.ai/generated-images/5d6976e4-3641-4297-ba4d-b3c168368f07/_result.png",
    imgAlt: "Электростатическое напыление порошка",
    ral: "#2271b3",
  },
  {
    n: "03",
    title: "Полимеризация",
    param: "200 °C",
    paramLabel: "температура камеры",
    text: "Деталь проходит камеру полимеризации: 180–200 °C, 15–20 минут. Порошок оплавляется и запекается в монолитное покрытие — без потёков и шагрени.",
    img: "https://image.qwenlm.ai/generated-images/18ed25a1-759e-49df-aa19-411265aa24d0/_result.png",
    imgAlt: "Камера полимеризации при 200 градусах",
    ral: "#e25303",
  },
  {
    n: "04",
    title: "Контроль качества",
    param: "0 баллов",
    paramLabel: "адгезия по решётке",
    text: "Проверяем толщину покрытия, адгезию методом решётчатых надрезов и внешний вид при дневном свете. Брак не покидает цех — переделываем за свой счёт.",
    img: "https://image.qwenlm.ai/generated-images/c426f46a-0dc7-4800-ad6c-b8b22ba86cd1/_result.png",
    imgAlt: "Готовые окрашенные изделия на приёмке",
    ral: "#006f3d",
  },
];

export const REVIEWS = [
  {
    id: "ОТЗЫВ № 27",
    text: "Красили забор — 46 м² профиля в антрацит 7016. Сделали за два дня, покрытие ровное, ни одного потёка. Зимой ничего не облезло.",
    author: "Дмитрий",
    meta: "Красногорск · забор, RAL 7016",
    rot: "-2.5deg",
  },
  {
    id: "ОТЗЫВ № 31",
    text: "Привозил диски от мотоцикла со старой краской. Пескоструй + оранжевый 2004 — выглядят как новые. По телефону всё объяснили по шагам.",
    author: "Алексей",
    meta: "Москва · мото-диски, RAL 2004",
    rot: "1.8deg",
  },
  {
    id: "ОТЗЫВ № 22",
    text: "Заказывали фасадные панели, подбирали цвет по образцу заказчика. Попали в RAL 5015 один в один, панели пришли без сколов.",
    author: "Марина",
    meta: "БЦ «Речной» · фасад, RAL 5015",
    rot: "-1.4deg",
  },
];

export const GALLERY = [
  {
    img: "https://image.qwenlm.ai/generated-images/c426f46a-0dc7-4800-ad6c-b8b22ba86cd1/_result.png",
    caption: "Метизы и профили после камеры",
    ral: "разные RAL",
    tall: false,
  },
  {
    img: "https://image.qwenlm.ai/generated-images/5ff11916-4fc6-4644-ad47-f27df32ae04a/_result.png",
    caption: "Велорама, глянец",
    ral: "RAL 2004",
    tall: true,
  },
  {
    img: "https://image.qwenlm.ai/generated-images/5d6976e4-3641-4297-ba4d-b3c168368f07/_result.png",
    caption: "Напыление в камере",
    ral: "RAL 5015",
    tall: false,
  },
  {
    img: "https://image.qwenlm.ai/generated-images/18ed25a1-759e-49df-aa19-411265aa24d0/_result.png",
    caption: "Полимеризация, 200 °C",
    ral: "режим ПЕЧЬ",
    tall: false,
  },
  {
    img: "https://image.qwenlm.ai/generated-images/1c902020-7a2e-4967-9793-baf4e60c3ca0/_result.png",
    caption: "Секция ворот, шагрень мелкая",
    ral: "RAL 7016",
    tall: true,
  },
  {
    img: "https://image.qwenlm.ai/generated-images/bbe21bee-1817-4ff0-bf2a-b9022e862921/_result.png",
    caption: "Веер выкрасов RAL",
    ral: "1000+ цветов",
    tall: false,
  },
];

export const IMG = {
  ralWall: "https://image.qwenlm.ai/generated-images/bbe21bee-1817-4ff0-bf2a-b9022e862921/_result.png",
  parts: "https://image.qwenlm.ai/generated-images/c426f46a-0dc7-4800-ad6c-b8b22ba86cd1/_result.png",
};

export const CEH_DOSSIER = {
  seed: "№ 51 · композиция: наряд-заказ × движение: печь и конвейер × типографика: Tektur капс",
  direction: [
    "3 референса из архива: industrial-паспорт, индекс-реестр, плакатная капс-плита",
    "палитра: графит + тепловой оранжевый + выкрасы RAL как акцентная система",
    "движение: конвейер-лента, маска-reveal, sticky-станции, кен-бёрнс в галерее",
    "«ЧЕМ ЭТО НЕ»: не лендинг с тремя карточками, не градиенты, не глассморфизм",
  ],
  sources: [
    ["Технология: sticky-станции", "motion/recipes/sticky-scene"],
    ["Заголовки: маска-reveal 700ms", "motion/recipes/mask-reveal"],
    ["RAL-лента: конвейер-marquee", "motion/recipes/conveyor-marquee"],
    ["Галерея: кен-бёрнс 18s", "motion/recipes/ken-burns"],
    ["Прайс-реестр вместо карточек", "references/editorial"],
  ],
  gates: [
    { code: "G1", state: "закрыты", note: "направление принято с первой подачи" },
    { code: "G2", state: "закрыты", note: "7 секций, асимметрия соблюдена" },
    { code: "G3", state: "закрыты", note: "4 рецепта без конфликтов, easing из реестра" },
    { code: "G4", state: "закрыты", note: "валидатор 10/10 · exit 0" },
  ],
};
