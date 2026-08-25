# QA_PLAYBOOK — QA Fortress

## 8 слоёв обороны (от быстрого к медленному)
| Слой | Инструменты | Скорость | Стоимость бага |
|---|---|---|---|
| L0 IDE | ESLint, TS server, Stylelint | 0.1s | ×1 |
| L1 Pre-commit | gitleaks, lint-staged, prettier | 2–5s | ×2 |
| L2 Pre-push | tsc, vitest, ts-prune | 10–30s | ×5 |
| L3 CI Fast | lint, build, unit+coverage 80% | 1–3 мин | ×10 |
| L4 CI Medium | component-тесты RTL | 3–8 мин | ×25 |
| L5 CI Slow | E2E ×5 браузеров, axe, ссылки, W3C | 10–20 мин | ×50 |
| L6 Deploy Gate | npm audit, Snyk, лицензии, Lighthouse ≥95 | перед продом | ×75 |
| L7 Runtime | Sentry, ErrorBoundary, алерты | 24/7 | ×100 |

## Принцип
Чем дешевле проверка — тем раньше она должна сработать.
Опечатку ловит линтер за 0.1s, а не E2E за 15 минут.

## Пороги
- Coverage: lines 80% / functions 80% / branches 75%
- Bundle: страница ≤1.5MB gzip, JS ≤300KB
- A11y: 0 критичных (WCAG 2.1 AA)
- Секреты: 0 (gitleaks)
- PR не мержится без зелёного CI
