# SOURCES.md — PRJ-01 · Pcpolimer

Каждая строка: решение → источник. Приём без источника — слоп (К-04).

## Композиция

| решение | источник |
|---|---|
| наряд-заказ и живая печь вместо hero | references/industrial/REF-07.meta.yaml · skills/industrial-passport/SKILL.md |
| заголовок-плакат, капс 9vw, перенос по смыслу | references/poster-type/REF-05.meta.yaml · skills/poster-type/SKILL.md |
| sticky-станции: один параметр на шаг | references/scroll-story/REF-01.meta.yaml |
| асимметричная сетка 5/7 с разрывом колонок | skills/industrial-passport/SKILL.md |

## Движение

| рецепт | источник | применение |
|---|---|---|
| oven-telemetry | motion/recipes/oven-telemetry/recipe.yaml | телеметрия печи: температура, таймер 14:32 |
| conveyor-hooks | motion/recipes/conveyor-hooks/recipe.yaml | лента под нарядом, фаза 0.7s на крюк |
| counter-tick | motion/recipes/counter-tick/recipe.yaml | механический пересчёт калькулятора и счётчиков |

Кривые — motion/easing-curves.json (ceh-brake, ceh-snap, ceh-drag). Браузерные дефолты запрещены (К-05).

## Стили

| решение | источник |
|---|---|
| шрифтовая пара Tektur + Golos Text (display/body) | assets/fonts/PAIRS.md |
| зерно плёнки и бумажные текстуры | assets/textures/grain.md |
| палитра графит/тепло + RAL | references/industrial/REF-07.meta.yaml (palette) |
| шкала отступов 0–256, примитивы Box/Stack | tokens/spacing.tokens.json |

## Производственный контракт (PRJ-01, принят G4)

Валидация: scripts/validate.mjs → 10/10, exit 0. Сборка на воротах: G1 (DIRECTION) → G2 (STRUCTURE) → G3 (motion, 3 рецепта) → G4 (REVIEW).
