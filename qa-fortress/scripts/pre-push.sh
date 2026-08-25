#!/bin/bash
# Pre-push: типы + unit-тесты + мёртвый код
echo "🚀 QA Fortress: Pre-push"
npx tsc --noEmit || { echo "❌ Ошибки типов"; exit 1; }
npm run test:unit -- --run || { echo "❌ Unit-тесты провалены"; exit 1; }
npx ts-prune --error
echo "✅ Pre-push пройден"
