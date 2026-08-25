# LIBRARY.md — карта папок веб-студии ЦЕХ

Это студия для агентной разработки: папки механизмов, скилов, скриптов
и дизайнов — в корне репозитория. Сайт (`src/`) — только витрина этих папок.

## Папки

| папка | что внутри |
|---|---|
| `references/` | дизайны-референсы: 7 карточек (REF-01…REF-07) — стиль, техники, палитра, takeaway |
| `skills/` | скилы (SK-01…SK-15): плакатная типографика, ломаная сетка, скролл-сторителлинг, UX-states, калькулятор ценности, инженерный копирайтинг и др. |
| `motion/` | механизмы движения: easing-curves.json + 12 рецептов (recipe.yaml, snippet.js, demo.html) |
| `anti-slop/` | защита от слопа: BANNED.md (25 запретов), QUOTAS.md (14 квот) |
| `tokens/` | токены: spacing.tokens.json (шкала отступов) |
| `assets/` | шрифты (PAIRS.md), текстуры (film/grain/paper) |
| `gates/` | ворота приёмки G1–G4: вход, чек-лист, артефакт, отказ |
| `scripts/` | скрипты: validate.mjs, lint-slop.mjs, lint-copy.mjs, lint-marketing.mjs, typographer.mjs, lint-contrast.mjs, roulette.mjs, diff-projects.mjs |
| `qa-fortress/` | Zero-Bug: CI-гейты, pre-commit/pre-push, a11y, e2e, валидаторы |
| `design-variance/` | генератор дизайн-генома, проверка уникальности, каталог активов |
| `components/` | примитивы (Box/Stack/Spacer), мобильные и SEO-компоненты |
| `validators/` | TouchTargetValidator, HorizontalScrollDetector, A11yContrastValidator |
| `ci/` | гейты GitHub Actions (mobile, seo, spacing) |
| `config/` | матрица устройств |
| `css-architecture/` | fluid-система, safe-area, touch-targets |
| `generators/` | JSON-LD, sitemap, robots, structured-data |
| `linting/` | eslint-seo-плагин, stylelint-spacing-плагин |
| `ai-agent-rules/` | SEO-правила агента + чек-лист-схема |
| `projects/` | проекты: `_TEMPLATE` (каркас) и примеры |
| `fixtures/` | негативная фикстура slop-site — валидатор обязан на ней падать |

## Корневые документы

- `AGENTS.md` — контракт агента-дизайнера (читать первым)
- `CONSTITUTION.md` — закон цеха: правила К-01…К-18 с проверками
- `ROLES.md` — роли (агент, маркетолог, артдиректор, куратор)
- `BRIEF-TEMPLATE.md` — шаблон брифа
- `README.md` — быстрый старт
