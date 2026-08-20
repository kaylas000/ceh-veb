/* ------------------------------------------------------------------ */
/* Виртуальная файловая система ЦЕХ.                                   */
/* На ней in-browser validate.mjs прогоняет два приёмо-сдаточных теста:*/
/*   позитивный  — projects/demo        (обязан пройти, exit 0)        */
/*   негативный  — fixtures/slop-site   (обязан упасть, ≥5 нарушений)  */
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

const ref03 = `id: REF-03
source: https://basecamp.com
style: [poster, illustration]
techniques:
  - манифест: один тезис на экран
  - рисованная графика вместо стока
  - красный — единственный акцент на белом
motion: [mask-reveal, conveyor-marquee]
palette: ['#F5F2EA', '#1E1E1E', '#D6362B', '#3E7C4F']
takeaway: «Один тезис — один экран; иллюстрация обязана продолжать фразу, а не украшать её.»
screenshot: pending`;

const ref04 = `id: REF-04
source: https://bruno-simon.com
style: [play, canvas]
techniques:
  - навигация — игровая сцена, а не меню
  - физика как feedback на курсор
  - звуковые акценты только по действию пользователя
motion: [sticky-scene]
palette: ['#14120E', '#F2B705', '#E8E4DA']
takeaway: «Интерактив оправдан, когда у курсора есть масса и инерция, а не когда всё прыгает.»
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

const ref06 = `id: REF-06
source: https://fontsinuse.com
style: [archive, ledger]
techniques:
  - реестр вместо витрины: фильтры важнее украшений
  - каждая запись содержит живой образец набора
  - моноширинные метаданные держат ритм страницы
motion: [conveyor-marquee]
palette: ['#F7F5F0', '#191919', '#0B66C3']
takeaway: «Архив живёт плотностью записей, а не декором обложки.»
screenshot: pending`;

const maskRevealRecipe = `name: mask-reveal
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

const maskRevealSnippet = `/* mask-reveal · vanilla JS + IntersectionObserver · без библиотек */
(function () {
  var LINES = document.querySelectorAll("[data-mask]");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("mask-live");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  LINES.forEach(function (el) { io.observe(el); });
})();`;

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

const stickySnippet = `/* sticky-scene · vanilla JS · без библиотек */
(function () {
  var steps = document.querySelectorAll("[data-step]");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var pin = document.querySelector("[data-pin]");
      if (!pin || !e.isIntersecting) return;
      pin.dataset.active = e.target.dataset.step;
    });
  }, { threshold: 0.55 });
  steps.forEach(function (s) { io.observe(s); });
})();`;

const easingJson = `{
  "ceh-brake": "cubic-bezier(0.16, 1, 0.3, 1)",
  "ceh-snap": "cubic-bezier(0.34, 1.56, 0.64, 1)",
  "ceh-drag": "cubic-bezier(0.65, 0, 0.15, 1)",
  "ceh-coast": "cubic-bezier(0.33, 0.01, 0.16, 1)",
  "ceh-drive": "cubic-bezier(0, 0, 1, 1)"
}`;

/* ---------------- projects/demo (позитивный тест) ---------------- */

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
<title>ЦЕХ — демо-сборка, бросок 47</title>
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

/* ---------------- fixtures/slop-site (негативный тест) ---------------- */

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
.btn { transition: all 0.3s ease-in-out; border-radius: 16px; }
.card { border-radius: 16px; transition: all 0.2s ease; }
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

/* ---------------- projects/pcpolimer (боевой проект) ---------------- */

const ref07 = `id: REF-07
source: https://pcpolimer.example
style: [industrial, poster, ledger]
techniques:
  - наряд-заказ и живая печь вместо hero
  - акцент — рабочая палитра RAL, не градиент
  - прайс как наряд-строки + калькулятор
  - sticky-станции в технологии
motion: [mask-reveal, sticky-scene, conveyor-marquee, ken-burns, counter-tick]
palette: ['#17181C', '#FF6A2B', '#E7E7E2', '#FFB35C']
takeaway: «Открывай промышленную тему её артефактом — нарядом и печью, акцент бери из палитры отрасли.»
screenshot: pending`;

const pcSeed = `# SEED.md — бросок №51

roulette.mjs · seed 20260218-51 · повтор осей с броском №50: нет

Композиция: наряд-паспорт с левой плитой
Движение: sticky-станции + конвейер-лента
Типографика: Tektur-капс + моно-метки`;

const pcDirection = `# DIRECTION — «Pcpolimer: порошковая покраска»

Проект: pcpolimer · Бросок SEED: №51

## Раздача SEED
- Композиция: наряд-паспорт с левой плитой
- Движение: sticky-станции + конвейер-лента
- Типографика: Tektur-капс + моно-метки

## Источники направления
1. references/industrial/REF-07.meta.yaml
   > takeaway: «Открывай промышленную тему её артефактом — нарядом и печью, акцент бери из палитры отрасли.»
2. references/editorial/REF-02.meta.yaml
   > takeaway: «Заменяй сетку карточек плотным индексом: имя проекта крупнее превью.»
3. references/poster-type/REF-05.meta.yaml
   > takeaway: «Набирай заголовок как плакат: размер до 10vw, перенос по смыслу, а не по ширине.»

## Палитра (из REF-07)
#17181C · #FF6A2B · #E7E7E2 · #FFB35C

## Шрифты (assets/fonts/PAIRS.md)
Display: Tektur — капс, коды, шкалы.
Body: Golos Text — набор и подписи.

## Характер движения
Рецепты: motion/recipes/sticky-scene/recipe.yaml, motion/recipes/mask-reveal/recipe.yaml, motion/recipes/conveyor-marquee/recipe.yaml.
Easing — только из motion/easing-curves.json: ceh-brake, ceh-drag.

## ЧЕМ ЭТО НЕ
- НЕ «лендинг с центрированным hero и тремя карточками» (B-03, B-04).
- НЕ «тёмная тема с неоновым градиентом» (B-05, B-06).
- НЕ «стеклянные панели с блюром» (B-07).`;

const pcStructure = `# STRUCTURE — pcpolimer

## Наряд
Паспорт заказа, печь, счётчики. Асимметричная композиция: наряд слева, печь справа.
Источник: skills/industrial-passport/SKILL.md, REF-07.

## Палитра
Выкрасы RAL, выбор цвета. Источник: REF-07.

## Прайс
Наряд-строки + калькулятор. Источник: REF-02.

## Технология
Sticky-станции. Источник: REF-05, skills/scroll-story/SKILL.md.

## Галерея
Masonry с RAL-тегами. Источник: skills/crop/SKILL.md.`;

const pcSources = `# SOURCES — pcpolimer

| Решение | Файл-источник |
|---|---|
| Композиция «наряд-паспорт с левой плитой» | skills/industrial-passport/SKILL.md |
| Капс Tektur, перенос по смыслу | skills/poster-type/SKILL.md |
| Sticky-станции технологии | motion/recipes/sticky-scene/recipe.yaml |
| Заголовки: маска-reveal | motion/recipes/mask-reveal/recipe.yaml |
| RAL-лента и конвейер | motion/recipes/conveyor-marquee/recipe.yaml |
| Зерно поверх сборки | assets/textures/grain.md |
| Пара шрифтов (Tektur + Golos Text) | assets/fonts/PAIRS.md |
| Палитра и наряд-строки | references/industrial/REF-07.meta.yaml |
| Индекс прайса | references/editorial/REF-02.meta.yaml |
| Плакатный капс | references/poster-type/REF-05.meta.yaml |`;

const pcReview = `# REVIEW — pcpolimer

Вердикт: ПРИНЯТО

## Проверки
- К-02: каждая ключевая секция имеет строку в SOURCES.md — выполнено.
- К-05: easing ceh-brake и ceh-drag из easing-curves.json — выполнено.
- B-03, B-04: центрированного hero и ряда одинаковых карточек нет — выполнено.
- Q-04: заголовок 9vw на наряде — выполнено.

## Правки
Нет. Принято, ворота G4 закрыты.

Артдиректор: агент-артдиректор · бросок №51`;

const pcHtml = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Pcpolimer — порошковая покраска металла</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<main>
  <section class="order">
    <p class="doc">Наряд № 2026-0218 · цех полимерных покрытий</p>
    <h1 class="poster">Порошковая<br>покраска<br>металла</h1>
    <p class="note">Полимерное покрытие в любой цвет каталога RAL. Печь до 200 °C, слой 60–120 мкм.</p>
  </section>
  <section class="tech">
    <div class="tech-pin">
      <p class="station">Станция 1 / Подготовка</p>
      <p class="station">Станция 2 / Напыление</p>
      <p class="station">Станция 3 / Полимеризация</p>
    </div>
    <ol class="steps">
      <li>Пескоструй до чистой поверхности</li>
      <li>Электростатическое напыление</li>
      <li>Камера 200 °C, 15 минут</li>
    </ol>
  </section>
  <footer class="colophon">
    <p>Источники: REF-07 pcpolimer · REF-02 pentagram.com · REF-05 readymag.com</p>
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
}
body { margin: 0; background: var(--coal); color: var(--concrete); font-family: "Golos Text", sans-serif; }
.poster {
  font-family: "Tektur", "Golos Text", sans-serif;
  font-size: 9vw;
  line-height: 0.92;
  margin: 0;
  text-transform: uppercase;
}
.order { display: grid; grid-template-columns: 7fr 4fr; gap: 2rem; padding: 8vh 4vw; }
.note { grid-column: 9 / 12; align-self: end; max-width: 26ch; }
.tech { display: grid; grid-template-columns: 1fr 1fr; }
.tech-pin { position: sticky; top: 0; height: 100vh; }
.station {
  opacity: 0.25;
  transform: translateY(12px);
  transition: opacity 0.6s var(--brake), transform 0.6s var(--brake);
}
.grain {
  position: fixed; inset: 0;
  opacity: 0.05; pointer-events: none;
  background-image: url("../assets/textures/grain.png");
}
.colophon { padding: 4vh 4vw; border-top: 2px solid var(--concrete); }`;

/* ---------------- сборка FS ---------------- */

export const FS: FS = {
  "references/INDEX.md": "# INDEX — референсы по стилям\n\n| id | стиль | сайт | техники |\n|---|---|---|---|\n| REF-01 | scroll-story | pudding.cool | sticky-сцена, шаги |\n| REF-02 | editorial, index | pentagram.com | индекс, hover-превью |\n| REF-03 | poster | basecamp.com | тезис-экран, графика |\n| REF-04 | play | bruno-simon.com | сцена-навигация |\n| REF-05 | poster-type | readymag.com | капс 10vw |\n| REF-06 | archive | fontsinuse.com | реестр, фильтры |",
  "references/scroll-story/REF-01.meta.yaml": ref01,
  "references/editorial/REF-02.meta.yaml": ref02,
  "references/poster/REF-03.meta.yaml": ref03,
  "references/play/REF-04.meta.yaml": ref04,
  "references/poster-type/REF-05.meta.yaml": ref05,
  "references/archive/REF-06.meta.yaml": ref06,
  "skills/SKILL-INDEX.md": "# SKILL-INDEX\n\n- poster-type — плакатная типографика\n- broken-grid — ломаная сетка\n- scroll-story — скролл-сторителлинг\n- crop — редакционная обрезка",
  "skills/poster-type/SKILL.md": "---\nname: poster-type\nwhen: заголовок работает как изображение\n---\nПравила см. в SKILL-INDEX и на странице «Архив».",
  "skills/broken-grid/SKILL.md": "---\nname: broken-grid\nwhen: страница длиннее трёх секций\n---\nПравила см. в SKILL-INDEX и на странице «Архив».",
  "skills/scroll-story/SKILL.md": "---\nname: scroll-story\nwhen: нарратив из пяти и более шагов\n---\nПравила см. в SKILL-INDEX и на странице «Архив».",
  "skills/crop/SKILL.md": "---\nname: crop\nwhen: фото без арт-дирекшна\n---\nПравила см. в SKILL-INDEX и на странице «Архив».",
  "motion/RECIPES.md": "# RECIPES\n\nM-01 mask-reveal · M-02 ken-burns · M-03 sticky-scene · M-04 scramble-decode · M-05 counter-tick · M-06 conveyor-marquee",
  "motion/easing-curves.json": easingJson,
  "motion/recipes/mask-reveal/recipe.yaml": maskRevealRecipe,
  "motion/recipes/mask-reveal/snippet.js": maskRevealSnippet,
  "motion/recipes/sticky-scene/recipe.yaml": stickyRecipe,
  "motion/recipes/sticky-scene/snippet.js": stickySnippet,
  "assets/fonts/PAIRS.md": "# PAIRS\n\n1. Russo One + Golos Text — заводская табличка\n2. Unbounded + PT Sans — широкий плакат\n3. Yeseva One + Jost — редакционный контраст\n4. Tektur + IBM Plex Sans — приборная панель\n5. Cormorant Garamond + Rubik — архивная опись",
  "assets/textures/grain.md": "# Зерно (T-01)\n\nSVG feTurbulence поверх страницы, opacity 4–6%, multiply. Файл grain.png добавит куратор.",
  "anti-slop/BANNED.md": "# BANNED\n\n16 запретов, у каждого — метод проверки. Полный текст — на странице «Регламент».",
  "anti-slop/QUOTAS.md": "# QUOTAS\n\nQ-01…Q-07 — числовые лимиты. Полный текст — на странице «Регламент».",
  "projects/demo/SEED.md": demoSeed,
  "projects/demo/DIRECTION.md": demoDirection,
  "projects/demo/STRUCTURE.md": demoStructure,
  "projects/demo/SOURCES.md": demoSources,
  "projects/demo/REVIEW.md": demoReview,
  "projects/demo/site/index.html": demoHtml,
  "projects/demo/site/styles.css": demoCss,
  "projects/_history/2025-09-avtoperevozki.manifest.md": hist1,
  "projects/_history/2025-10-pekarnya.manifest.md": hist2,
  "projects/_history/2025-11-kovorking.manifest.md": hist3,
  "fixtures/slop-site/DIRECTION.md": slopDirection,
  "fixtures/slop-site/SOURCES.md": slopSources,
  "fixtures/slop-site/site/index.html": slopHtml,
  "fixtures/slop-site/site/styles.css": slopCss,
  /* ---------- projects/pcpolimer (боевой проект) ---------- */
  "skills/industrial-passport/SKILL.md":
    "---\nname: industrial-passport\nwhen: промышленная тема, первый экран — артефакт профессии\n---\nПравила см. в SKILL-INDEX и на странице «Архив».",
  "motion/recipes/conveyor-marquee/recipe.yaml":
    "name: conveyor-marquee\nfeel: лента тянет содержимое, как конвейер\ntiming:\n  duration: 26s/цикл\n  easing: ceh-drive\n  stagger: равномерный\nuse_when: RAL-ленты, бегущие индексы\ndont_combine_with: [параллакс ленты]\nmax_per_page: 2\nsnippet: snippet.js\ndemo: demo.html",
  "references/industrial/REF-07.meta.yaml": ref07,
  "projects/pcpolimer/SEED.md": pcSeed,
  "projects/pcpolimer/DIRECTION.md": pcDirection,
  "projects/pcpolimer/STRUCTURE.md": pcStructure,
  "projects/pcpolimer/SOURCES.md": pcSources,
  "projects/pcpolimer/REVIEW.md": pcReview,
  "projects/pcpolimer/site/index.html": pcHtml,
  "projects/pcpolimer/site/styles.css": pcCss,
};

export const FIXTURES = [
  {
    root: "projects/demo",
    label: "projects/demo",
    kind: "Позитивный тест" as const,
    desc: "Демо-проект, прошедший G1–G4. Обязан выйти зелёным: 10/10, exit 0.",
  },
  {
    root: "fixtures/slop-site",
    label: "fixtures/slop-site",
    kind: "Негативный тест" as const,
    desc: "Нарочито шаблонный сайт. Обязан упасть с ≥5 нарушениями: система не пропускает слоп.",
  },
  {
    root: "projects/pcpolimer",
    label: "projects/pcpolimer",
    kind: "Боевой проект" as const,
    desc: "Первый реальный сайт студии. Прошёл G1–G4 и валидатор: 10/10, exit 0.",
  },
];

export const COLLAGE_URL =
  "https://qwenlm.ai/generated-images/e79474ea-15d4-4e7e-aa33-b1d23a75ea97/_result.png";
