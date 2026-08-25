# ЦЕХ (CEH) — веб-студия дизайна

Структурный архив + регламент принуждения: агент собирает сайты как студийный
дизайнер — материалы только из архива, приёмка через ворота G1–G4 и валидатор.

## Быстрый старт (≤5 минут)

1. Скопируй шаблон: `cp -r projects/_TEMPLATE projects/<имя>`
2. Раздай оси: `node scripts/roulette.mjs projects/<имя>` → SEED.md
3. Заполни DIRECTION.md из references/ и skills/ (≥3 референса с цитатами takeaway)
4. Собери site/ строго по SOURCES.md
5. Прогони: `node scripts/validate.mjs projects/<имя>` — exit 0 обязателен
6. Вердикт артдиректора — в REVIEW.md. Удачное верни в архив (К-11).

## Структура

- AGENTS.md — контракт агента-дизайнера (читать первым)
- CONSTITUTION.md — 11 проверяемых правил
- references/ — референсы: скрин + meta.yaml (takeaway обязателен)
- skills/ — скилы: frontmatter + нумерованные правила
- motion/ — easing-curves.json + рецепты (snippet.js + demo.html)
- anti-slop/ — BANNED.md (16 запретов с методами) + QUOTAS.md (7 лимитов)
- gates/ — G1–G4: вход, чек-лист, артефакт, отказ
- scripts/ — validate.mjs, lint-slop.mjs, roulette.mjs, diff-projects.mjs
- projects/ — артефакты: SEED, DIRECTION, STRUCTURE, SOURCES, site/, REVIEW

## Требования

Node ≥18. **Ноль npm-зависимостей** — только встроенные модули.
Скрипты: exit-code 0/1, человекочитаемый отчёт с кодами (V-01…, B-01…, Q-01…).
