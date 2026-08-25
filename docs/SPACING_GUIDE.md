# SPACING_GUIDE — система контроля отступов

## Шкала (единственный источник)
- `--spacing-0` = 0px
- `--spacing-0-5` = 2px
- `--spacing-1` = 4px
- `--spacing-1-5` = 6px
- `--spacing-2` = 8px
- `--spacing-3` = 12px
- `--spacing-4` = 16px
- `--spacing-5` = 20px
- `--spacing-6` = 24px
- `--spacing-8` = 32px
- `--spacing-10` = 40px
- `--spacing-12` = 48px
- `--spacing-16` = 64px
- `--spacing-20` = 80px
- `--spacing-24` = 96px
- `--spacing-32` = 128px
- `--spacing-40` = 160px
- `--spacing-48` = 192px
- `--spacing-64` = 256px

## Правила
1. В CSS — только `var(--spacing-*)` или значения из шкалы. Stylelint заблокирует остальное.
2. В React — только `<Box p="4"> / <Stack gap="6"> / <Spacer size="2">`. Ключи вне шкалы → ошибка.
3. Секции и контейнеры — fluid-токены `--fluid-*` (clamp между 375 и 1440px).
4. Отладка в браузере: Ctrl+Shift+S (оверлей) или `window.__spacingOverlay.audit()`.
5. CI: PR с >20 нарушениями не мержится (ci/spacing-gate.yml).

## Fluid-токены
- `--fluid-section-py`: clamp(3rem, 1.9rem + 4.5vw, 8rem) — вертикаль секций
- `--fluid-container-px`: clamp(1rem, 0.3rem + 2.8vw, 2.5rem) — поле контейнера
- `--fluid-card-gap`: clamp(1rem, 0.6rem + 1.6vw, 2rem) — зазор карточек
- `--fluid-heading-gap`: clamp(1.5rem, 1rem + 2vw, 3rem) — заголовок → контент
