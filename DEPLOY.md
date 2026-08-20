# Деплой ЦЕХа на GitHub Pages

## Что уже настроено

- `.gitignore` больше не блокирует `dist/` — собранная версия попадает в репозиторий.
- `.github/workflows/deploy.yml` — автоматически собирает проект и публикует его на GitHub Pages при каждом пуше в `main`.
- `vite.config.js` — `base: "./"`, относительные пути работают на любом хосте.

## Пошаговая заливка (впервые)

1. **Создай пустой репозиторий на GitHub** (без README, без .gitignore).

2. **Залей локальный проект:**
   ```bash
   git init
   git add .
   git commit -m "ЦЕХ — веб-студия дизайна: архив + 7 систем принуждения"
   git branch -M main
   git remote add origin https://github.com/ТВОЙ_ЛОГИН/ТВОЙ_РЕПО.git
   git push -u origin main
   ```

3. **Включи GitHub Pages через Actions:**
   - Открой репозиторий → **Settings** → **Pages**.
   - В блоке **Build and deployment** → **Source** выбери **GitHub Actions**.

4. **Дождись первого прогона:**
   - Вкладка **Actions** → появится workflow «Deploy to GitHub Pages».
   - Когда он станет зелёным (~1–2 мин), сайт будет по адресу:
     `https://ТВОЙ_ЛОГИН.github.io/ТВОЙ_РЕПО/`

## Обновление сайта

Просто запушь изменения в `main` — workflow сам пересоберёт и опубликует:
```bash
git add .
git commit -m "обновление"
git push
```

## Локальный запуск

```bash
npm install
npm run dev      # разработка
npm run build    # production-сборка в dist/
```
