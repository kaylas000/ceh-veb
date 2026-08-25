# SEO_PLAYBOOK — SEO-by-Default

## Принцип
SEO вшивается ДО кода, а не докручивается после. Три уровня принуждения:
1. **Агент** — SEO_AGENT_RULES.md в контексте любой кодогенерации.
2. **Код** — SEOHead/SemanticHeading/SEOImage бросают ошибки в dev.
3. **CI** — seo-gate.yml + Lighthouse SEO ≥ 0.95 блокируют деплой.

## Поток
1. `node cli/create-page.js --type=article --title=… --desc=… --h1=… --kw=…`
2. Заполнить контент (≥300 слов, keyword в первых 100 словах).
3. Прогнать ContentSEOAnalyzer — score ≥ 75.
4. Сгенерировать sitemap.xml + robots.txt.
5. CI: SEO-гейт зелёный → деплой.

## Жёсткие пороги
- Lighthouse SEO ≥ 0.95 · LCP < 2.5s · CLS < 0.1
- title 50-60 · description 120-158 · один H1 · alt у всех img
- ≥2 внутренние ссылки на страницу, без orphan
