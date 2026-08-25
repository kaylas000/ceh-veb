# LIBRARY.md — библиотека ЦЕХа

Библиотека для агентной разработки: системы, скилы, стили и дизайны.
Сайт (`src/`) — только витрина этой библиотеки. Источник содержимого —
пакет, который собирает `src/lib/studio.ts`, развёрнутый в реальные файлы.

## Карта

```
ceh-veb/
├── systems/          — 9 систем студии: движки, валидаторы, CI, ворота
│   ├── motion/            анимации: 12 рецептов (recipe.yaml + snippet.js + demo.html)
│   ├── anti-slop/         приём без источника — слоп: BANNED, QUOTAS, lint-slop.mjs
│   ├── mobile/            Mobile-Perfect: матрица устройств, CSS-архитектура,
│   │                      валидаторы, sweep 22 вьюпорта, перф-бюджеты, PLAYBOOK
│   ├── spacing/           Spacing Control: шкала, stylelint-плагин, Box/Stack/Spacer,
│   │                      SpacingOverlay, гейт, визуальные спеки, GUIDE
│   ├── seo/               SEO-by-Design: контракты агента, анализаторы, генераторы
│   │                      JSON-LD/sitemap/robots, eslint-плагин, гейт, PLAYBOOK
│   ├── design-variance/   вариативность: StyleGenomeGenerator, уникальность
│   │                      комбинаций, реестр отпечатков, VARIANCE_PLAYBOOK
│   ├── qa-fortress/       Zero-Bug: pre-commit/pre-push, CI-гейты, a11y, e2e,
│   │                      утечки памяти, секреты, размер бандла + фикстура slop-site
│   ├── hollywood-intro/   IntroEngine.ts — кинозаставка (правила SK-06, ≤4с, skip)
│   ├── gates/             G1–G4: как проект принимается и возвращается
│   └── scripts/           validate.mjs, roulette.mjs, diff-projects.mjs (Node ≥18, 0 зависимостей)
├── skills/           — скилы для агента-дизайнера
│   ├── SKILL-INDEX.md      SK-01…SK-06: где и когда применять
│   ├── <скил>/SKILL.md     плакатная типографика, ломаная сетка, скролл-сторителлинг,
│   │                       редакционная обрезка, производственный паспорт, кинозаставка
│   ├── AGENTS.md           контракт агента: порядок чтения, жёсткие правила
│   ├── CONSTITUTION.md     К-01…К-15 — закон цеха (проверка + метод)
│   ├── ROLES.md            роли и ответственность
│   ├── BRIEF-TEMPLATE.md   шаблон брифа проекта
│   └── ai-agent-rules/     SEO_AGENT_RULES.md + seo-checklist.schema.json
├── styles/           — стили и токены (единственный источник правды)
│   ├── palettes/          ceh.json (бумага/чернила) · pcpolimer.json (графит/тепло)
│   ├── fonts/PAIRS.md     пары display+body с ролями
│   ├── textures/          film.md · grain.md · paper.md
│   ├── tokens/spacing.tokens.json   шкала отступов 0–256
│   └── motion/easing-curves.json   5 кривых: brake, snap, drag, coast, drive
├── designs/          — дизайны и референсы
│   ├── references/        INDEX.md + 7 карточек REF-01…REF-07 (стиль, техники,
│   │                      палитра, takeaway, grep по techniques)
│   └── asset-library/     manifest.json + каталоги: buttons, grids, iconSets,
│                          illustrationStyles, animationPresets
├── projects/_TEMPLATE/    SEED → DIRECTION → STRUCTURE → SOURCES → REVIEW
├── src/               — сайт студии (витрина библиотеки, работает на GitHub Pages)
└── docs/              — продакшн-билд сайта
```

## Как пользоваться агенту

1. Прочитать `skills/AGENTS.md` — контракт и порядок.
2. Взять палитру из `styles/palettes/`, шрифты из `styles/fonts/`.
3. Выбрать рецепт в `systems/motion/recipes/`, скил в `skills/`, референс в `designs/references/`.
4. Собрать проект по `projects/_TEMPLATE/` и прогнать `systems/scripts/validate.mjs`.
5. Фикстура-нарушитель (слоп) — `systems/qa-fortress/fixtures/slop-site/`: на ней и только на ней
   валидатор обязан падать (exit 1).

## Синхронизация

Библиотека и сайт — один источник. Правки данных библиотеки делаются в `src/data/*`
и `src/lib/studio.ts`, затем папки `systems/`, `skills/`, `styles/`, `designs/`
пересобираются командой пакета `src/lib/studio.ts` — расхождений между сайтом
и файлами библиотеки быть не должно.
