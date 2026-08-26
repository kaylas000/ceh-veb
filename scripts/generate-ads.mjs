#!/usr/bin/env node
/* ЦЕХ generate-ads.mjs — Генератор кампаний Яндекс.Директ для веб-студии ЦЕХ.
   Node ≥18, ноль npm-зависимостей.
   Служба генерации объявлений из config/semantic-core.json под домен https://kaylas000.github.io/ceh-veb/ */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const corePath = join(root, "config", "semantic-core.json");
const outputDir = join(root, "assets", "campaigns");

const DOMAIN = process.env.DOMAIN || "https://kaylas000.github.io/ceh-veb/";

if (!existsSync(corePath)) {
  console.error(" Ошибка: config/semantic-core.json не найден");
  process.exit(1);
}

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const clusters = JSON.parse(readFileSync(corePath, "utf8"));
const rows = [
  ["Фраза (с минус-словами)", "Заголовок 1", "Заголовок 2", "Текст", "Ссылка", "Отображаемая ссылка", "Быстрая ссылка 1", "Ссылка БС 1", "Быстрая ссылка 2", "Ссылка БС 2"]
];

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

let totalAds = 0;

for (const cluster of clusters) {
  for (const item of cluster.keywords) {
    const kw = item.kw;
    const title1 = capitalize(kw).slice(0, 56);
    const title2 = `Веб-студия ЦЕХ · 16 ворот QA`;
    const text = `Сборка сайтов без слопа. Регламент К-01..К-20. Приёмка по 16 машинным проверкам. Узнайте смету!`;
    const baseUrl = DOMAIN.endsWith("/") ? DOMAIN : DOMAIN + "/";
    const utmUrl = `${baseUrl}?utm_source=yandex&utm_medium=cpc&utm_campaign=${cluster.cluster}&utm_term=${encodeURIComponent(item.slug)}`;
    const displayUrl = item.slug.slice(0, 30);

    rows.push([
      kw,
      title1,
      title2,
      text,
      utmUrl,
      displayUrl,
      "Наши проекты",
      `${utmUrl}#proekty`,
      "Валидатор качества",
      `${utmUrl}#validator`
    ]);

    totalAds++;
  }
}

const csvContent = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\n");
const csvPath = join(outputDir, "ceh_web_studio_direct.csv");

writeFileSync(csvPath, "\uFEFF" + csvContent, "utf8");

console.log(`[generate-ads] Сформирована кампания под домен ${DOMAIN} (${totalAds} объявлений): ${csvPath}`);
process.exit(0);
