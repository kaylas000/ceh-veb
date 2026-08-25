# LIBRARY.md — карта папок веб-студии ЦЕХ

Это студия для агентной разработки: папки механизмов, скилов, скриптов
и дизайнов — в корне репозитория. Сайт (`src/`) — только витрина этих папок.

## Папки

| папка | что внутри |
|---|---|
| `references/` | дизайны-референсы: 7 карточек (REF-01…REF-07) — стиль, техники, палитра, takeaway |
| `skills/` | скилы (SK-01…SK-06): плакатная типографика, ломаная сетка, скролл-сторителлинг, обрезка фото, производственный паспорт, кинозаставка |
| `motion/` | механизмы движения: easing-curves.json + 12 рецептов (recipe.yaml, snippet.js, demo.html) |
| `anti-slop/` | защита от слопа: BANNED.md (16 запретов), QUOTAS.md (7 квот) |
| `tokens/` | токены: spacing.tokens.json (шкала отступов) |
| `assets/` | шрифты (PAIRS.md), текстуры (film/grain/paper) |
| `gates/` | ворота приёмки G1–G4: вход, чек-лист, артефакт, отказ |
| `scripts/` | скрипты: validate.mjs, lint-slop.mjs, roulette.mjs, diff-projects.mjs |
| `qa-fortress/` | Zero-Bug: CI-гейты, pre-commit/pre-push, a11y, e2e, валидаторы |
| `design-variance/` | генератор дизайн-генома, проверка уникальности, каталог активов |
| `components/` | примитивы (Box/Stack/Spacer), мобильные и SEO-компоненты |
| `validators/` | TouchTargetValidator, HorizontalScrollDetector |
| `ci/` | гейты GitHub Actions (mobile, seo, spacing) |
| `config/` | матрица устройств |
| `css-architecture/` | fluid-система, safe-area, touch-targets |
| `generators/` | JSON-LD, sitemap, robots, structured-data |
| `linting/` | eslint-seo-плагин, stylelint-spacing-плагин |
| `ai-agent-rules/` | SEO-правила агента + чек-лист-схема |
| `projects/` | проекты: `_TEMPLATE` (каркас) и `pcpolimer` (PRJ-01, 10/10) |
| `fixtures/` | негативная фикстура slop-site — валидатор обязан на ней падать |

## Корневые документы

- `AGENTS.md` — контракт агента-дизайнера (читать первым)
- `CONSTITUTION.md` — закон цеха: правила К-01…К-15 с проверками
- `ROLES.md` — роли (агент, артдиректор, куратор)
- `BRIEF-TEMPLATE.md` — шаблон брифа
- `README.md` — быстрый старт (5 минут)

## Как работает агент

```
cp -r projects/_TEMPLATE projects/<имя> → node scripts/roulette.mjs → SEED.md
→ DIRECTION.md (≥3 референса из references/) → site/ по SOURCES.md
→ node scripts/validate.mjs projects/<имя> (exit 0 обязателен) → REVIEW.md
```
