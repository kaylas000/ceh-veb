# G4 — Финал

## Цель
Принимается только то, что прошло валидатор и арт-директора.

## Вход
Сборка готова

## Чек-лист
1. validate.mjs зелёный (V-01…V-10)
2. lint-slop чист (B-01…B-16)
3. diff-projects: сходство ≤10%
4. REVIEW.md: вердикт со ссылками на правила
5. Удачное изъято в архив (К-11)
6. Цикл сошёлся (К-21): `node core/loop-engine/cli.mjs projects/<имя> --validator ceh_project` → exit 0, evidence в `workspace/loop-result.json`

## Выходной артефакт
REVIEW.md + принятый проект

## Критерии отказа
Любое нарушение CONSTITUTION без фикса — возврат.
