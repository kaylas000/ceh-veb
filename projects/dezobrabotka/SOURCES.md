# SOURCES.md — PRJ-02 · Дез Обработка

| Решение | Файл-источник |
|---|---|
| Hero как учётная карточка-журнал, плотность записей вместо декора | references/archive/REF-06.meta.yaml |
| Услуги как индекс-реестр: имя крупнее превью, строка раскрывается | references/editorial/REF-02.meta.yaml |
| Протокол — sticky-сцена, шаг текста = ровно одно состояние прибора | references/scroll-story/REF-01.meta.yaml |
| Постерный капс 9vw, перенос по смыслу, офсетный фон | references/poster-type/REF-05.meta.yaml |
| Ломаная сетка с рейкой: сдвиги 4/8 и 7/5, одна асимметрия на секцию | skills/broken-grid/SKILL.md |
| Формуляр профессии вместо hero, цифры как на шильдике, сквозной параметр-штамп | skills/industrial-passport/SKILL.md |
| Scroll-story: ≥5 состояний процесса, активный шаг светится, прошлые гаснут | skills/scroll-story/SKILL.md |
| Заголовки и телефон выезжают из-под кромки (ось SEED), ceh-brake 700ms | motion/recipes/mask-reveal/recipe.yaml |
| Механический пересчёт итога прайса и 4 счётчиков с источником цифры | motion/recipes/counter-tick/recipe.yaml |
| Лента районов Пензы, цикл 26s, пауза по наведению | motion/recipes/conveyor-marquee/recipe.yaml |
| Кривые ceh-brake / ceh-drag / ceh-drive — единственные easing проекта | motion/easing-curves.json |
| Пара шрифтов №1 «заводская табличка»: Russo One + Golos Text с ролями | assets/fonts/PAIRS.md |
| Зерно на весь сайт: SVG feTurbulence baseFrequency 0.8, opacity 5%, multiply | assets/textures/grain.md |
| Кинозаставка первого визита: линия → слово из частиц → штамп → титр → шторки, пропуск и один показ за сессию | skills/cinema-intro/SKILL.md |
| Живой прибор «генератор тумана» в hero: feTurbulence-облако два слоя, LED | skills/industrial-passport/SKILL.md |

## Motion-карта (G3, Q-01: 3 рецепта = допустимый максимум)

- mask-reveal → все h2 и телефон-строка; не накладывается с другими рецептами
  на одном элементе (dont_combine_with соблюдён).
- counter-tick → только окно итога калькулятора + 4 счётчика hero/протокола
  (max_per_page: 4 соблюдено); каждая цифра имеет источник (прейскурант, FAQ).
- conveyor-marquee → одна лента районов в контактах (max_per_page: 2, две ленты
  навстречу не используются).
- Все cubic-bezier — из motion/easing-curves.json; prefers-reduced-motion
  отключает проходы (переходы сводятся к мгновенным).
| Семантическое ядро как данные: 45 ключей со slug/интентом/мета до вёрстки | templates/seo-brief/TEMPLATE.md |
| Генератор страниц zero-dep с гейтом качества и exit-кодом | scripts/validate.mjs |
| Навигационная карта LP в подвале: плотные индексы строк, 44px-цели | skills/broken-grid/SKILL.md |
| Тексты посадочных: цифры с источником, отказ от клише | skills/industrial-passport/SKILL.md |
