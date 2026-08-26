#!/usr/bin/env node
/* ЦЕХ generate-ads.mjs — Генератор кампаний Яндекс.Директ из semantic-core.json
   Node ≥18, ноль npm-зависимостей.
   Формирует готовую таблицу CSV для Директ Коммандера с заголовками, текстами и UTM. */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const corePath = join(root, "config", "semantic-core.json");
const outputDir = join(root, "assets", "campaigns");

if (!existsSync(corePath)) {
  console.error(" Ошибка: config/semantic-core.json не найден");
  process.exit(1);
}

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const clusters = JSON.parse(readFileSync(corePath, "utf8"));
const rows = [
  ["Фраза (с минус-словами)", "Заголовок 1", "Заголовок 2", "Текст", "Ссылка", "Отображаемая ссылка", "Заголовок быстрой ссылки 1", "Ссылка быстрой ссылки 1"]
];

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

let totalAds = 0;

for (const cluster of clusters) {
  for (const item of cluster.keywords) {
    const kw = item.kw;
    const title1 = capitalize(kw).slice(0, 56);
    const title2 = `Гарантия 12 мес по договору`;
    const text = `Профессиональное уничтожение ${cluster.name.toLowerCase()} за 1 выезд. Холодный туман. Выезд по Пензе за 30 мин!`;
    const utmUrl = `https://dez-obrabotka.pro/lp/${item.slug}/?utm_source=yandex&utm_medium=cpc&utm_campaign=${cluster.cluster}&utm_term=${encodeURIComponent(item.slug)}`;
    const displayUrl = item.slug.slice(0, 30);

    rows.push([
      kw,
      title1,
      title2,
      text,
      utmUrl,
      displayUrl,
      "Цены и прайс",
      `${utmUrl}#prays`
    ]);

    totalAds++;
  }
}

const csvContent = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\n");
const csvPath = join(outputDir, "direct_campaign.csv");

writeFileSync(csvPath, "\uFEFF" + csvContent, "utf8"); // UTF-8 с BOM для MS Excel

console.log(`[generate-ads] Сформирована кампания на ${totalAds} объявлений: ${csvPath}`);
process.exit(0);
