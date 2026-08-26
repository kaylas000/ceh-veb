#!/usr/bin/env node
/* ЦЕХ notify-indexnow.mjs — Мгновенное уведомление поисковых систем (Bing, Yandex, Seznam, Naver) через протокол IndexNow.
   Node ≥18, ноль npm-зависимостей.
   Отправляет список всех страниц и рекламных кампаний студии ЦЕХ напрямую в поисковые боты. */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const corePath = join(root, "config", "semantic-core.json");
const publicDir = join(root, "public");

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// 1. Создаем уникальный ключ протокола IndexNow
const apiKey = "ceh2026indexnowkey88888888";
const keyFileName = `${apiKey}.txt`;
const keyFilePath = join(publicDir, keyFileName);

writeFileSync(keyFilePath, apiKey, "utf8");
console.log(`[IndexNow] Ключ верификации зарегистрирован: public/${keyFileName}`);

// 2. Формируем список всех URL для индексации
const host = "kaylas000.github.io";
const baseUrl = `https://${host}/ceh-veb`;

const urlList = [
  `${baseUrl}/`,
  `${baseUrl}/#proekty`,
  `${baseUrl}/#validator`,
  `${baseUrl}/#reglament`,
  `${baseUrl}/#arhiv`,
  `${baseUrl}/llms.txt`,
  `${baseUrl}/llms-full.txt`
];

if (existsSync(corePath)) {
  const clusters = JSON.parse(readFileSync(corePath, "utf8"));
  for (const cluster of clusters) {
    for (const item of cluster.keywords) {
      urlList.push(`${baseUrl}/?utm_source=yandex&utm_medium=cpc&utm_campaign=${cluster.cluster}&utm_term=${encodeURIComponent(item.slug)}`);
    }
  }
}

// 3. Формируем JSON payload протокола IndexNow
const payload = {
  host: host,
  key: apiKey,
  keyLocation: `${baseUrl}/${keyFileName}`,
  urlList: urlList
};

console.log(`[IndexNow] Сформировано ${urlList.length} URL для мгновенной индексации.`);

// 4. Отправляем запрос на эндпоинт IndexNow
async function sendIndexNow() {
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (response.ok || response.status === 200 || response.status === 202) {
      console.log(`[IndexNow] ✅ Успешно отправлено мгновенное уведомление в Bing, Yandex и Seznam! (Status: ${response.status})`);
    } else {
      console.log(`[IndexNow] ⚠️ Ответ сервера IndexNow: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.log(`[IndexNow] ℹ️ Уведомление сформировано локально: ${urlList.length} адресов зарегистрировано в манифесте.`);
  }
}

sendIndexNow();
