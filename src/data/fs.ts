/* ------------------------------------------------------------------ */
/* Виртуальная файловая система ЦЕХ.                                   */
/* in-browser validate.mjs прогоняет три приёмо-сдаточных теста:       */
/*   projects/demo        — эталон, обязан пройти (exit 0)             */
/*   projects/pcpolimer   — боевой проект, обязан пройти (exit 0)      */
/*   fixtures/slop-site   — обязан упасть с ≥5 нарушениями             */
/* ------------------------------------------------------------------ */

export type FS = Record<string, string>;

const ref01 = `id: REF-01
source: https://pudding.cool
style: [scroll-story, editorial]
techniques:
  - sticky-сцена занимает не меньше 70vh, шаги-абзацы справа
  - один график — один инсайт на шаг
  - активный шаг подсвечивается, сцена меняет одно состояние
motion: [sticky-scene, mask-reveal]
palette: ['#F6F1E7', '#1D3A5F', '#D64533']
takeaway: «Закрепи сцену на весь экран и меняй в ней ровно одно состояние на шаг текста.»
screenshot: pending`;

const ref02 = `id: REF-02
source: https://www.pentagram.com
style: [editorial, index]
techniques:
  - проект — строка индекса, а не карточка
  - превью разворачивается на всю ширину при hover
  - чёрный/белый плюс один акцент на весь сайт
motion: [mask-reveal]
palette: ['#111111', '#F4F2ED', '#E03A24']
takeaway: «Заменяй сетку карточек плотным индексом: имя проекта крупнее превью.»
screenshot: pending`;

const ref05 = `id: REF-05
source: https://readymag.com
style: [poster-type]
techniques:
  - капс до 10vw работает как изображение
  - сетка с сознательным разрывом колонок
  - чистый офсетный фон без градиентов
motion: [mask-reveal, scramble-decode]
palette: ['#101010', '#EFEBE2', '#0B66C3']
takeaway: «Набирай заголовок как плакат: размер до 10vw, перенос по смыслу, а не по ширине.»
screenshot: pending`;

const easingJson = `{
  "ceh-brake": "cubic-bezier(0.16, 1, 0.3, 1)",
  "ceh-snap": "cubic-bezier(0.34, 1.56, 0.64, 1)",
  "ceh-drag": "cubic-bezier(0.65, 0, 0.15, 1)",
  "ceh-coast": "cubic-bezier(0.33, 0.01, 0.16, 1)",
  "ceh-drive": "cubic-bezier(0, 0, 1, 1)"
}`;

const maskRecipe = `name: mask-reveal
feel: строка выезжает из-под невидимой кромки, как лист из лотка
timing:
  duration: 700ms
  easing: ceh-brake            # cubic-bezier(0.16, 1, 0.3, 1)
  stagger: 80-120ms
use_when: заголовки секций, плакатные строки, индексы
dont_combine_with: [scramble-decode]
max_per_page: 6
snippet: snippet.js
demo: demo.html`;

const stickyRecipe = `name: sticky-scene
feel: сцена закреплена, мир прокручивается сквозь неё
timing:
  duration: по шагам скролла
  easing: ceh-drag             # cubic-bezier(0.65, 0, 0.15, 1)
  stagger: один шаг — одна смена состояния
use_when: нарратив из пяти и более шагов
dont_combine_with: [параллакс внутри сцены]
max_per_page: 1
snippet: snippet.js
demo: demo.html`;

const hooksRecipe = `name: conveyor-hooks
feel: детали на крюках качаются с фазовым сдвигом, лента едет
timing:
  duration: 14-18s на цикл ленты
  easing: ceh-drive + ceh-drag
  stagger: фаза качания 0.7s на крюк
use_when: декоративная лента с изделиями, разделитель длинных страниц
dont_combine_with: [conveyor-marquee вплотную]
max_per_page: 1
snippet: snippet.js
demo: demo.html
mined_from: pcpolimer`;

/* ---------------- projects/demo ---------------- */

const demoSeed = `# SEED.md — бросок №47

roulette.mjs · seed 20260212-47 · повтор осей с броском №46: нет

Композиция: ломаная сетка с левой рейкой
Движение: липкая сцена
Типографика: капс 9vw, перенос по смыслу`;

const demoDirection = `# DIRECTION — «ЦЕХ: демо-сборка»

Проект: demo · Бросок SEED: №47

## Раздача SEED
- Композиция: ломаная сетка с левой рейкой
- Движение: липкая сцена
- Типографика: капс 9vw, перенос по смыслу

## Источники направления
1. references/scroll-story/REF-01.meta.yaml
   > takeaway: «Закрепи сцену на весь экран и меняй в ней ровно одно состояние на шаг текста.»
2. references/editorial/REF-02.meta.yaml
   > takeaway: «Заменяй сетку карточек плотным индексом: имя проекта крупнее превью.»
3. references/poster-type/REF-05.meta.yaml
   > takeaway: «Набирай заголовок как плакат: размер до 10vw, перенос по смыслу, а не по ширине.»

## Палитра (из REF-01, REF-02, REF-05)
#E8E6DE · #16150F · #CE2C18 · #E0A91C

## Шрифты (assets/fonts/PAIRS.md, пара 1)
Display: Russo One — капс, штампы, индексы.
Body: Golos Text — набор и подписи.

## Характер движения
Рецепты-кандидаты: motion/recipes/sticky-scene/recipe.yaml, motion/recipes/mask-reveal/recipe.yaml.
Easing — только из motion/easing-curves.json: ceh-brake, ceh-drag.

## ЧЕМ ЭТО НЕ
- НЕ «лендинг с центрированным hero и тремя карточками» (B-03, B-04).
- НЕ «тёмная тема с неоновым акцентом и глассморфизмом» (B-07).
- НЕ «градиентные заголовки и фиолетовые переливы» (B-05, B-06).`;

const demoStructure = `# STRUCTURE — demo

## Плита
Табличка проекта, индекс, статус. Источник: skills/poster-type/SKILL.md.
Композиция асимметричная: табличка на 7 колонок слева, индекс справа в поле.

## Манифест
Один тезис на экран: «Архив принуждает». Источник: REF-03.

## Архив
Плотный индекс записей вместо карточек. Источник: REF-02, REF-06.

## Сцены
Липкая сцена с шагами G1–G4. Источник: REF-01, skills/scroll-story/SKILL.md.

## Колофон
Состав сборки, источники, бросок.`;

const demoSources = `# SOURCES — demo

| Решение | Файл-источник |
|---|---|
| Композиция «ломаная сетка с левой рейкой» | skills/broken-grid/SKILL.md |
| Капс 9vw, перенос по смыслу | skills/poster-type/SKILL.md |
| Липкая сцена с шагами G1–G4 | motion/recipes/sticky-scene/recipe.yaml |
| Заголовки: маска-reveal | motion/recipes/mask-reveal/recipe.yaml |
| Зерно поверх сборки | assets/textures/grain.md |
| Пара шрифтов (Russo One + Golos Text) | assets/fonts/PAIRS.md |
| Палитра и индекс-реестр | references/editorial/REF-02.meta.yaml |
| Сцена-шаблон и шаги | references/scroll-story/REF-01.meta.yaml |
| Плакатный капс | references/poster-type/REF-05.meta.yaml |`;

const demoReview = `# REVIEW — demo

Вердикт: ПРИНЯТО

## Проверки
- К-02: каждая ключевая секция имеет строку в SOURCES.md — выполнено.
- К-05: easing ceh-brake и ceh-drag взяты из easing-curves.json — выполнено.
- B-03, B-04: центрированного hero и ряда одинаковых карточек нет — выполнено.
- Q-04: заголовок 9vw на плите — выполнено.

## Правки
Нет. Принято с первой подачи, ворота G4 закрыты.

Артдиректор: агент-артдиректор · бросок №47`;

const demoHtml = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ЦЕХ — демо-сборка, бросок 47</title>
<meta name="description" content="Демо-проект студии ЦЕХ: сборка по воротам G1–G4 из архива референсов, скилов и motion-рецептов. Валидатор V-01…V-14 зелёный.">
<link rel="canonical" href="https://ceh.studio/projects/demo/">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<header class="rail">
  <p class="idx">ЦЕХ / DEMO</p>
  <p class="idx">бросок 47</p>
</header>
<main>
  <section class="plate">
    <h1 class="poster">ЦЕХ<br>НЕ ПРОЩАЕТ<br>ОШИБОК</h1>
    <p class="note">Демо-сборка по воротам G1–G4. Каждое решение имеет источник в архиве.</p>
  </section>
  <section class="scene">
    <div class="scene-pin">
      <p class="step on">G1 Направление</p>
      <p class="step">G2 Структура</p>
      <p class="step">G3 Движение</p>
      <p class="step">G4 Финал</p>
    </div>
    <ol class="steps">
      <li>SEED: оси розданы roulette.mjs, бросок 47</li>
      <li>DIRECTION: три референса, три цитаты takeaway</li>
      <li>STRUCTURE: ломаная сетка, индекс вместо карточек</li>
      <li>SOURCES: два рецепта, два скила, зерно</li>
    </ol>
  </section>
  <footer class="colophon">
    <p>Источники: REF-01 pudding.cool · REF-02 pentagram.com · REF-05 readymag.com</p>
  </footer>
</main>
</body>
</html>`;

const demoCss = `/* demo · бросок 47 · кривые только из motion/easing-curves.json */
:root {
  --paper: #e8e6de;
  --ink: #16150f;
  --red: #ce2c18;
  --yellow: #e0a91c;
  --brake: cubic-bezier(0.16, 1, 0.3, 1);   /* ceh-brake */
  --drag: cubic-bezier(0.65, 0, 0.15, 1);   /* ceh-drag */
}
body { margin: 0; background: var(--paper); color: var(--ink); font-family: "Golos Text", sans-serif; }
.poster {
  font-family: "Russo One", "Golos Text", sans-serif;
  font-size: 9vw;
  line-height: 0.92;
  margin: 0;
  text-transform: uppercase;
}
.rail { display: grid; grid-template-columns: repeat(12, 1fr); padding: 1rem 4vw; }
.plate { display: grid; grid-template-columns: 7fr 4fr; gap: 2rem; padding: 6vh 4vw; }
.note { grid-column: 9 / 12; align-self: end; max-width: 24ch; }
.scene { display: grid; grid-template-columns: 1fr 1fr; }
.scene-pin { position: sticky; top: 0; height: 100vh; }
.step {
  opacity: 0.25;
  transform: translateY(12px);
  transition: opacity 0.6s var(--brake), transform 0.6s var(--brake);
}
.step.on { opacity: 1; transform: none; }
.grain {
  position: fixed; inset: 0;
  opacity: 0.05; pointer-events: none;
  background-image: url("../assets/textures/grain.png");
}
.colophon { padding: 4vh 4vw; border-top: 2px solid var(--ink); }`;

/* ---------------- projects/pcpolimer ---------------- */

const pcSeed = `# SEED.md — бросок №51

roulette.mjs · seed 20260303-51 · повтор осей: нет

Композиция: наряд-паспорт с левой плитой
Движение: липкие станции + конвейер-лента
Типографика: Tektur-капс + моно-метки`;

const pcDirection = `# DIRECTION — «Порошковая покраска · Pcpolimer»

Проект: pcpolimer · Бросок SEED: №51 · цех полимерных покрытий, Красногорск

## Раздача SEED
- Композиция: наряд-паспорт с левой плитой
- Движение: липкие станции + конвейер-лента
- Типографика: Tektur-капс + моно-метки

## Источники направления
1. references/scroll-story/REF-01.meta.yaml
   > takeaway: «Закрепи сцену на весь экран и меняй в ней ровно одно состояние на шаг текста.»
2. references/editorial/REF-02.meta.yaml
   > takeaway: «Заменяй сетку карточек плотным индексом: имя проекта крупнее превью.»
3. references/poster-type/REF-05.meta.yaml
   > takeaway: «Набирай заголовок как плакат: размер до 10vw, перенос по смыслу, а не по ширине.»

## Палитра (из REF-01, REF-02, REF-05)
#17181C · #FF6A2B · #E7E7E2 · #FFB35C

## Шрифты (assets/fonts/PAIRS.md)
Display: Tektur — капс-плиты, шильдики (пара 4).
Body: Golos Text — набор и подписи (пара 1).

## Характер движения
Рецепты-кандидаты: motion/recipes/sticky-scene/recipe.yaml, motion/recipes/mask-reveal/recipe.yaml, motion/recipes/conveyor-hooks/recipe.yaml.
Easing — только из motion/easing-curves.json: ceh-brake, ceh-drag, ceh-drive.

## ЧЕМ ЭТО НЕ
- НЕ «лендинг с центрированным hero и тремя карточками» (B-03, B-04).
- НЕ «градиентные заголовки и фиолетовые переливы» (B-05, B-06).
- НЕ «прайс из одинаковых карточек» (B-04) — прайс собран наряд-строками.`;

const pcStructure = `# STRUCTURE — pcpolimer

## Паспорт
Наряд-заказ, телеметрия печи, конвейер. Источник: skills/industrial-passport/SKILL.md.
Композиция асимметричная: паспорт на 7 колонок слева, печь справа в поле.

## Палитра
Выкрасы RAL, клик ставит цвет на конвейер. Источник: REF-02.

## Прайс
Наряд-строки + калькулятор. Источник: REF-02, skills/broken-grid/SKILL.md.

## Технология
Липкие станции: номер + параметр. Источник: REF-01, skills/scroll-story/SKILL.md.

## Контакты
Адрес, телефоны, схема проезда. Источник: бриф куратора.`;

const pcSources = `# SOURCES — pcpolimer

| Решение | Файл-источник |
|---|---|
| Открытие «производственный паспорт» | skills/industrial-passport/SKILL.md |
| Липкие станции в технологии | motion/recipes/sticky-scene/recipe.yaml |
| Заголовки: маска-reveal | motion/recipes/mask-reveal/recipe.yaml |
| Конвейер с крюками | motion/recipes/conveyor-hooks/recipe.yaml |
| Зерно поверх сборки | assets/textures/grain.md |
| Пара шрифтов (Tektur + Golos Text) | assets/fonts/PAIRS.md |
| Палитра и индекс-реестр | references/editorial/REF-02.meta.yaml |
| Сцена-шаблон и шаги | references/scroll-story/REF-01.meta.yaml |`;

const pcReview = `# REVIEW — pcpolimer

Вердикт: ПРИНЯТО

## Проверки
- К-02: каждая ключевая секция имеет строку в SOURCES.md — выполнено.
- К-05: easing ceh-brake, ceh-drag, ceh-drive из easing-curves.json — выполнено.
- B-03, B-04: центрированного hero и ряда одинаковых карточек нет — выполнено.
- Q-01: 3 рецепта (лимит 1–3) — выполнено.
- Q-04: заголовок 9vw в паспорте — выполнено.

## Правки
Нет. Принято с первой подачи. В архив возвращены: REF-07, SK-05, M-08, M-09 (К-11).

Артдиректор: агент-артдиректор · бросок №51`;

const pcHtml = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Порошковая покраска — Pcpolimer, Красногорск</title>
<meta name="description" content="Порошковая покраска металла в любой цвет RAL: печь 200 °C, слой 60–120 мкм, ежедневно до 21:00. Расчёт по фото детали — в день обращения.">
<link rel="canonical" href="https://pcpolimer.ru/">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<header class="passport">
  <p class="order">Наряд № 2026-0218 · цех полимерных покрытий</p>
  <h1 class="poster">Порошковая<br>покраска<br>металла</h1>
  <dl class="spec">
    <div><dt>печь</dt><dd>200 °C</dd></div>
    <div><dt>слой</dt><dd>60–120 мкм</dd></div>
    <div><dt>каталог</dt><dd>1000+ RAL</dd></div>
    <div><dt>профиль</dt><dd>от 100 ₽/м</dd></div>
  </dl>
</header>
<main>
  <section class="price">
    <h2 class="plate-title">Прайс — наряд-строки</h2>
    <ul class="lines">
      <li><span>Металлические профили</span><b>от 100 ₽/м</b></li>
      <li><span>Фасадные панели</span><b>500 ₽/м²</b></li>
      <li><span>Заборы</span><b>от 4000 ₽/м</b></li>
      <li><span>Ворота</span><b>от 6000 ₽/шт</b></li>
      <li><span>Пескоструйная обработка</span><b>500 ₽/м²</b></li>
    </ul>
  </section>
  <section class="tech">
    <div class="pin">
      <p class="num">03</p>
      <p>печь · 200 °C</p>
    </div>
    <ol class="steps">
      <li>Подготовка: дробеструй до Sa 2.5</li>
      <li>Напыление: электростатика, 60–120 мкм</li>
      <li>Полимеризация: 200 °C, 15 минут</li>
      <li>ОТК: адгезия 0 баллов по ГОСТ</li>
    </ol>
  </section>
  <footer class="colophon">
    <p>Московская область, Красногорск, Речная улица, 8</p>
    <p>ежедневно до 21:00 · +7 (925) 333-86-66 · +7 (936) 333-86-66</p>
  </footer>
</main>
</body>
</html>`;

const pcCss = `/* pcpolimer · бросок 51 · кривые только из motion/easing-curves.json */
:root {
  --coal: #17181c;
  --heat: #ff6a2b;
  --concrete: #e7e7e2;
  --amber: #ffb35c;
  --brake: cubic-bezier(0.16, 1, 0.3, 1);   /* ceh-brake */
  --drag: cubic-bezier(0.65, 0, 0.15, 1);   /* ceh-drag */
  --drive: cubic-bezier(0, 0, 1, 1);        /* ceh-drive */
}
body { margin: 0; background: var(--coal); color: var(--concrete); font-family: "Golos Text", sans-serif; }
.poster {
  font-family: "Tektur", "Golos Text", sans-serif;
  font-size: 9vw;
  line-height: 0.92;
  margin: 0;
  text-transform: uppercase;
}
.passport { display: grid; grid-template-columns: 7fr 4fr; gap: 2rem; padding: 8vh 4vw; }
.spec { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #343842; }
.spec div { background: var(--coal); padding: 0.75rem; }
.price .lines li {
  display: flex; justify-content: space-between;
  border-top: 1px solid #343842; padding: 0.8rem 4vw;
  transition: background 0.3s var(--brake);
}
.tech { display: grid; grid-template-columns: 1fr 1fr; }
.tech .pin { position: sticky; top: 0; height: 100vh; }
.tech .num { font-family: "Tektur", sans-serif; font-size: 8vw; color: var(--heat); }
.grain {
  position: fixed; inset: 0; opacity: 0.05; pointer-events: none;
  background-image: url("../assets/textures/grain.png");
}
.colophon { padding: 4vh 4vw; border-top: 2px solid var(--heat); }`;

/* ---------------- fixtures/slop-site ---------------- */

const slopDirection = `# DIRECTION

Современный стильный сайт для стартапа. Чисто, минималистично, с градиентами.

Источники: references/scroll-story/REF-01.meta.yaml`;

const slopSources = `# SOURCES

| Решение | Файл-источник |
|---|---|
| Hero | motion/recipes/aurora-float/recipe.yaml |
| Карточки | assets/icons/pack.md |`;

const slopHtml = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<!-- FIXME: не коммить! apiKey = "AKIAIOSFODNN7EXAMPLE" -->
<title>NimbusFlow — облачные решения</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<section class="hero">
  <div class="text-center">
    <h1>Управляйте облаком легко</h1>
    <p>NimbusFlow — современная платформа для вашей команды</p>
    <a class="btn primary" href="#">Начать бесплатно</a>
    <a class="btn ghost" href="#">Узнать больше</a>
  </div>
</section>
<section class="features py-24">
  <div class="grid grid-cols-3">
    <div class="card"><h3>Быстро</h3><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>
    <div class="card"><h3>Удобно</h3><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>
    <div class="card"><h3>Надёжно</h3><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>
  </div>
</section>
<section class="stats py-24 text-center">
  <h2>🚀 Нам доверяют</h2>
  <p>500+ клиентов по всему миру</p>
</section>
<section class="glass py-24">
  <div class="glass-card">Стеклянная панель с блюром</div>
</section>
<footer class="py-24 text-center">
  <a href="#">Свяжитесь с нами</a>
</footer>
</body>
</html>`;

const slopCss = `body { font-family: "Inter", sans-serif; margin: 0; }
h1 {
  font-size: 64px;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.btn { transition: all 0.3s ease-in-out; border-radius: 16px; margin: 7px auto 21px; padding: 11px 27px; }
.card { border-radius: 16px; transition: all 0.2s ease; padding: 13px 15px; }
.features { padding: 13px 15px; gap: 18px; }
input { font-size: 14px; }
.glass-card { backdrop-filter: blur(80px); background: rgba(99, 102, 241, 0.35); }
@keyframes floaty { from { transform: translateY(0); } to { transform: translateY(-10px); } }
.hero { animation: floaty 4s ease-in-out infinite; }`;

/* ---------------- последние три проекта (для V-09) ---------------- */

const hist1 = `Секции: Услуги, Цены, Автопарк, Отзывы, Контакты
Палитра: #0b3d2e, #f2c14e, #f4f4f2
Оси: индекс-реестр · конвейер-marquee · редакционная пара`;

const hist2 = `Секции: Меню, О пекарне, Доставка, Заказ
Палитра: #5a2a1e, #f0e0c8, #c96f2f
Оси: манифест · кен-бёрнс · антиква в наборе`;

const hist3 = `Секции: Пространства, Тарифы, Сообщество, Бронь
Палитра: #1d3a5f, #d64533, #f6f1e7
Оси: плакатные развороты · скрэмбл · капс 10vw`;

/* ---------------- сборка FS ---------------- */

export const FS: FS = {
  "references/INDEX.md": "# INDEX — референсы по стилям\n\n| id | стиль | сайт | техники |\n|---|---|---|---|\n| REF-01 | scroll-story | pudding.cool | sticky-сцена, шаги |\n| REF-02 | editorial, index | pentagram.com | индекс, hover-превью |\n| REF-05 | poster-type | readymag.com | капс 10vw |",
  "references/scroll-story/REF-01.meta.yaml": ref01,
  "references/editorial/REF-02.meta.yaml": ref02,
  "references/poster-type/REF-05.meta.yaml": ref05,
  "skills/SKILL-INDEX.md": "# SKILL-INDEX\n\n- poster-type — плакатная типографика\n- broken-grid — ломаная сетка\n- scroll-story — скролл-сторителлинг\n- crop — редакционная обрезка\n- industrial-passport — производственный паспорт",
  "skills/poster-type/SKILL.md": "---\nname: poster-type\nwhen: заголовок работает как изображение\n---\nПравила — в SKILL-INDEX.",
  "skills/broken-grid/SKILL.md": "---\nname: broken-grid\nwhen: страница длиннее трёх секций\n---\nПравила — в SKILL-INDEX.",
  "skills/scroll-story/SKILL.md": "---\nname: scroll-story\nwhen: нарратив из пяти и более шагов\n---\nПравила — в SKILL-INDEX.",
  "skills/industrial-passport/SKILL.md": "---\nname: industrial-passport\nwhen: промышленная тема, открытие артефактом профессии\n---\nПравила — в SKILL-INDEX. Добыт из pcpolimer.",
  "motion/RECIPES.md": "# RECIPES\n\nM-01 mask-reveal · M-02 ken-burns · M-03 sticky-scene · M-04 scramble-decode · M-05 counter-tick · M-06 conveyor-marquee · M-07 cart-assembly · M-08 oven-telemetry · M-09 conveyor-hooks",
  "motion/easing-curves.json": easingJson,
  "motion/recipes/mask-reveal/recipe.yaml": maskRecipe,
  "motion/recipes/sticky-scene/recipe.yaml": stickyRecipe,
  "motion/recipes/conveyor-hooks/recipe.yaml": hooksRecipe,
  "assets/fonts/PAIRS.md": "# PAIRS\n\n1. Russo One + Golos Text — заводская табличка\n2. Unbounded + PT Sans — широкий плакат\n3. Yeseva One + Jost — редакционный контраст\n4. Tektur + IBM Plex Sans — приборная панель\n5. Cormorant Garamond + Rubik — архивная опись",
  "assets/textures/grain.md": "# Зерно (T-01)\n\nSVG feTurbulence поверх страницы, opacity 4–6%, multiply.",
  "projects/demo/SEED.md": demoSeed,
  "projects/demo/DIRECTION.md": demoDirection,
  "projects/demo/STRUCTURE.md": demoStructure,
  "projects/demo/SOURCES.md": demoSources,
  "projects/demo/REVIEW.md": demoReview,
  "projects/demo/site/index.html": demoHtml,
  "projects/demo/site/styles.css": demoCss,
  "projects/pcpolimer/SEED.md": pcSeed,
  "projects/pcpolimer/DIRECTION.md": pcDirection,
  "projects/pcpolimer/STRUCTURE.md": pcStructure,
  "projects/pcpolimer/SOURCES.md": pcSources,
  "projects/pcpolimer/REVIEW.md": pcReview,
  "projects/pcpolimer/site/index.html": pcHtml,
  "projects/pcpolimer/site/styles.css": pcCss,
  "projects/_history/2025-09-avtoperevozki.manifest.md": hist1,
  "projects/_history/2025-10-pekarnya.manifest.md": hist2,
  "projects/_history/2025-11-kovorking.manifest.md": hist3,
  "fixtures/slop-site/DIRECTION.md": slopDirection,
  "fixtures/slop-site/SOURCES.md": slopSources,
  "fixtures/slop-site/site/index.html": slopHtml,
  "fixtures/slop-site/site/styles.css": slopCss,
};

export interface Fixture {
  root: string;
  label: string;
  kind: "Позитивный тест" | "Боевой проект" | "Негативный тест";
  desc: string;
}

export const FIXTURES: Fixture[] = [
  {
    root: "projects/demo",
    label: "projects/demo",
    kind: "Позитивный тест",
    desc: "Эталонная сборка по воротам G1–G4. Обязана выйти зелёной: 10/10, exit 0.",
  },
  {
    root: "projects/pcpolimer",
    label: "projects/pcpolimer",
    kind: "Боевой проект",
    desc: "Первый проект, собранный из архива. Проходит валидатор и возвращает находки в библиотеку.",
  },
  {
    root: "fixtures/slop-site",
    label: "fixtures/slop-site",
    kind: "Негативный тест",
    desc: "Нарочито шаблонный сайт. Обязан упасть с ≥5 нарушениями: система не пропускает слоп.",
  },
];
