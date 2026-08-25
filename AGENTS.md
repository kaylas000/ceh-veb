# AGENTS.md — контракт агента-дизайнера

## Порядок чтения (обязателен)

1. CONSTITUTION.md — закон цеха (К-01…К-18).
2. references/INDEX.md — что есть в архиве.
3. skills/SKILL-INDEX.md — какими приёмами работаем (SK-01…SK-15).
4. motion/RECIPES.md + easing-curves.json — как двигается.
5. anti-slop/BANNED.md + QUOTAS.md — чего нельзя и сколько можно.
6. gates/G1–G4 — как принимается.

## Жёсткие правила

- **Запрещено писать код до DIRECTION.md и MARKETING.md, принятых на G1 (К-01, К-16).**
- Каждое решение — строка в SOURCES.md: «решение → файл-источник» (К-02).
- Приём без источника в references/ или skills/ — слоп (К-04).
- Easing только из motion/easing-curves.json (К-05).
- 1–3 motion-рецепта на страницу (Q-01), шрифты из PAIRS.md (Q-06).
- Запрещены клише B-17, кнопки без отклика B-18/B-20 и текст без типографики B-23.

## Workflow

```
BRIEF → roulette (SEED.md) → просмотр INDEX.md и референсов
→ MARKETING.md + COPYWRITING.md → DIRECTION.md → G1
→ STRUCTURE.md → G2 → выбор motion-рецептов
→ сборка site/ → G3 → validate.mjs + lint-slop + lint-copy + lint-marketing
→ REVIEW.md (артдиректор) → G4 → приёмка
```

Возврат с ворот = точечные правки по пунктам REVIEW.md, не перезапуск (К-10).

## Definition of Done

1. validate.mjs зелёный (V-01…V-15), линтеры чисты.
2. REVIEW.md: вердикт со ссылками на пункты CONSTITUTION.
3. Удачное изъято в архив: приём → references/, скил → skills/, рецепт → motion/ (К-11).
