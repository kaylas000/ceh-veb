#!/bin/bash
# Pre-commit: секреты + lint-staged + синтаксис
echo "🔒 QA Fortress: Pre-commit"
npx gitleaks protect --staged --verbose || { echo "❌ СЕКРЕТЫ В КОДЕ"; exit 1; }
npx lint-staged || { echo "❌ Линтинг не пройден"; exit 1; }
for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx)$'); do
  node --check "$file" 2>/dev/null || { echo "❌ Синтаксис: $file"; exit 1; }
done
echo "✅ Pre-commit пройден"
