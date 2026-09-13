# AGENTS.md — контракт агента-дизайнера

## Порядок чтения (обязателен)

1. CONSTITUTION.md — закон цеха (К-01…К-21).
2. references/INDEX.md — что есть в архиве.
3. skills/SKILL-INDEX.md — какими приёмами работаем (SK-01…SK-15).
4. motion/RECIPES.md + easing-curves.json — как двигается.
5. anti-slop/BANNED.md + QUOTAS.md — чего нельзя и сколько можно.
6. gates/G1–G4 — как принимается.
7. core/loop-engine/README.md — цикл принуждения (К-21).

## Жёсткие правила

- **Итерации «сборка → ворота» гоняются циклом, а не вручную (К-21): проект не сдаётся, пока
  `node core/loop-engine/cli.mjs projects/<имя> --validator ceh_project` не вернул exit 0.**
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
→ сборка site/ → G3 → ЦИКЛ (К-21): validate.mjs + lint-slop + lint-copy + lint-marketing
→ REVIEW.md (артдиректор) → G4 → приёмка
```

Возврат с ворот = точечные правки по пунктам REVIEW.md, не перезапуск (К-10).

### Цикл принуждения (К-21)

Ворота G3 прогоняет универсальный цикл, а не память агента:

```bash
node core/loop-engine/cli.mjs projects/<имя> --validator ceh_project
```

- `exit 0` — закон исполнен: ворота зелёные, evidence прогона сохранён в `projects/<имя>/workspace/loop-result.json`.
- `exit 1` — в `feedback.codes` коды `V-xx`/`B-xx`/`M-xx`: это список точечных правок по К-10, а не повод начинать заново.
- В сессии с агентом — одна итерация (`--iterations 1`): сборка уже на диске, цикл нужен как проверка.
  Автономный прогон — генератор `llm` (ключ только из переменных окружения, например `OPENAI_API_KEY`)
  и повтор до `max_iterations`: коды нарушений возвращаются в задачу блоком «ПРЕДЫДУЩАЯ ПОПЫТКА ПРОВАЛЕНА».
- Контекст цикл собирает из архива: `CONSTITUTION.md`, `anti-slop/BANNED.md` + `QUOTAS.md`, `AGENTS.md`,
  `gates/G1–G4`, `skills/`, `references/`, `motion/`, досье проекта (`SEED/DIRECTION/STRUCTURE/SOURCES/…`)
  и `projects/_history/` как few-shot.
- Все проекты цеха разом проверяет гейт `npm run gate` (core/loop-engine/gate.mjs) — это CI-слой К-15,
  он гоняет тот же цикл по `exit 0` без ключей и сети.
- Вердикт в REVIEW.md и приёмка на G4 остаются за человеком: цикл подтверждает исполнимость закона,
  но не оценивает вкус (К-09).

## Definition of Done

1. Цикл сошёлся: `node core/loop-engine/cli.mjs projects/<имя> --validator ceh_project` → exit 0 (validate.mjs V-01…V-17 зелёный, линтеры чисты), evidence сохранён в `workspace/loop-result.json`.
2. REVIEW.md: вердикт со ссылками на пункты CONSTITUTION.
3. Удачное изъято в архив: приём → references/, скил → skills/, рецепт → motion/ (К-11).
