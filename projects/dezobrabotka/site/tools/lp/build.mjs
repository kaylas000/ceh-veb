#!/usr/bin/env node
/* build-lp.mjs — генератор 45 посадочных страниц по ядру tools/lp/data.mjs.
   Node ≥18, ноль зависимостей. SEO-гейт (К-13): title 50–60, description 120–158,
   один h1, уникальные title — иначе exit 1 с отчётом. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SERVICES, CONTACTS } from "./data.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REL = "../../"; // префикс из lp/<slug>/ в корень сайта
const DOMAIN = "https://dez-obrabotka.pro";
const TODAY = "2026-08-25";

const ROOM_TYPES = ["1 комната", "1-к кв.", "2-к кв.", "3-к кв.", "Дом ≤100 м²", "Дом 100–200 м²", "Дом >200 м²"];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---- линейный коридор из lp/<slug>/ в другую LP ---- */
const lpHref = (slug) => `${REL}lp/${slug}/`;

/* ---- карта услуг для подвала (на LP — с префиксом, на главной — без) ---- */
function sitemapHtml(prefix, currentSlug) {
  const groups = SERVICES.map((s) => {
    const links = s.items.map((it) =>
      `<a href="${prefix}lp/${it.slug}/"${it.slug === currentSlug ? ' aria-current="page"' : ""}>${it.h1.replace(/ в Пензе.*$/, "")}</a>`
    ).join("\n      ");
    return `    <div class="lpg">\n      <b>${s.name}</b>\n      ${links}\n    </div>`;
  }).join("\n");
  return `<div class="lpmap">
  <span class="cblock-cap">ПОСАДОЧНЫЕ СТРАНИЦЫ ПО ЗАПРОСАМ · 45</span>
  <div class="lpmap-grid">
${groups}
  </div>
</div>`;
}

/* ---- шаблон страницы ---- */
function pageHtml(svc, it) {
  const minPrice = Math.min(...svc.price);
  const others = svc.items.filter((o) => o.slug !== it.slug);
  const url = `${DOMAIN}/lp/${it.slug}/`;
  const priceCells = svc.price.map((p, i) => `<td data-room="${ROOM_TYPES[i]}">${p.toLocaleString("ru-RU").replace(/,/g, " ")}</td>`).join("");

  const blocksHtml = it.blocks.map((b) => `
      <h2 class="lp-h2">${esc(b.h2)}</h2>
      <p class="lp-p">${esc(b.p)}</p>`).join("\n");

  const faqHtml = it.faq.map((f) => `        <details>
          <summary>${esc(f.q)}</summary>
          <p>${esc(f.a)}</p>
        </details>`).join("\n");

  const siblingsHtml = others.map((o) =>
    `        <a class="sib" href="${lpHref(o.slug)}"><span class="sib-kw">${esc(o.h1)}</span><span class="sib-more">${o.intent === "информационный" ? "разбор" : "услуга"} →</span></a>`
  ).join("\n");

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Главная", "item": `${DOMAIN}/` },
        { "@type": "ListItem", "position": 2, "name": "Услуги", "item": `${DOMAIN}/#reestr` },
        { "@type": "ListItem", "position": 3, "name": svc.name, "item": `${DOMAIN}/lp/${svc.items[0].slug}/` },
        { "@type": "ListItem", "position": 4, "name": it.h1, "item": url }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": it.h1,
      "serviceType": `Дезинсекция: ${svc.name.toLowerCase()}`,
      "provider": {
        "@type": "LocalBusiness",
        "name": "Дез Обработка — служба дезинфекции в Пензе",
        "telephone": CONTACTS.tel,
        "email": CONTACTS.email,
        "address": { "@type": "PostalAddress", "addressLocality": "Пенза", "streetAddress": "ул. Беляева, 2д", "addressRegion": "Пензенская область", "addressCountry": "RU" },
        "foundingDate": "2018"
      },
      "areaServed": "Пенза и Пензенская область",
      "offers": { "@type": "Offer", "priceCurrency": "RUB", "price": String(minPrice), "description": "Обработка от, точная смета после бесплатного осмотра" }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": it.faq.map((f) => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a }
      }))
    }
  ];

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <script>document.documentElement.classList.add("js")</script>
  <title>${esc(it.title)}</title>
  <meta name="description" content="${esc(it.desc)}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(it.title)}">
  <meta property="og:description" content="${esc(it.desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="ru_RU">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Golos+Text:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${REL}styles.css">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23F6F1E7'/%3E%3Crect x='4' y='4' width='24' height='24' fill='none' stroke='%231D3A5F' stroke-width='2'/%3E%3Cpath d='M8 22 L16 8 L24 22 Z' fill='%23D64533'/%3E%3C/svg%3E">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <a class="skip" href="#price">К ценам</a>

  <header class="topbar">
    <a class="brand" href="${REL}" aria-label="Дез Обработка — на главную">
      <span class="brand-mark" aria-hidden="true">ДЕЗ</span>
      <span class="brand-word">ОБРАБОТКА<span class="brand-dot">.</span>ПРО</span>
    </a>
    <nav class="topnav" aria-label="Разделы">
      <a href="${REL}#reestr">Услуги</a>
      <a href="${REL}#prays">Цены</a>
      <a href="${REL}#protokol">Протокол</a>
      <a href="${REL}#kontakty">Контакты</a>
    </nav>
    <a class="topbar-tel" href="tel:${CONTACTS.telRaw}">${CONTACTS.tel}</a>
  </header>

  <main class="lpwrap">
    <nav class="crumb" aria-label="Хлебные крошки">
      <a href="${REL}">Главная</a><span>›</span>
      <a href="${REL}#reestr">Услуги</a><span>›</span>
      <a href="${lpHref(svc.items[0].slug)}">${svc.name}</a><span>›</span>
      <b>${esc(it.h1)}</b>
    </nav>

    <section class="act lp-hero" aria-label="Услуга">
      <div class="formhead">
        <span>УСЛУГА · ${svc.name.toUpperCase()}</span>
        <span>ХОЛОДНЫЙ ТУМАН</span>
        <span>ВЫЕЗД ЗА 60 МИНУТ</span>
      </div>
      <h1 class="lp-h1" data-reveal><span class="mega-in">${esc(it.h1)}</span></h1>
      <p class="lede">${esc(it.lead)}</p>
      <div class="hero-cta">
        <a class="cta" href="tel:${CONTACTS.telRaw}" data-analytics-event="lp_call_specialist">
          <span class="cta-cap">Вызвать специалиста</span>
          <span class="cta-tel">${CONTACTS.tel}</span>
        </a>
        <a class="wa" href="${CONTACTS.wa}" rel="noopener" data-analytics-event="lp_whatsapp">Написать в WhatsApp</a>
      </div>
    </section>

    <section class="lp-price" id="price" aria-label="Цена">
      <h2 class="lp-h2">Стоимость по типу помещения</h2>
      <div class="table-wrap" role="region" aria-label="Цены" tabindex="0">
        <table class="ledger">
          <thead><tr><th scope="col">${ROOM_TYPES.join('</th><th scope="col">')}</th></tr></thead>
          <tbody><tr>${priceCells}</tr></tbody>
        </table>
      </div>
      <p class="lp-note">Итоговая смета — после бесплатного осмотра, цена не меняется на месте. Скидки пенсионерам. <a href="${REL}#prays">Полная ведомость по всем услугам →</a></p>
    </section>

    <section class="lp-body">
${blocksHtml}
      <h2 class="lp-h2">Подготовка</h2>
      <p class="lp-p">${esc(svc.prep)}</p>

      <h2 class="lp-h2">Протокол и гарантия</h2>
      <ol class="steps-mini">
        <li><span class="st-tx"><b>Осмотр</b> — выезд в течение часа, финальная цена до работ.</span></li>
        <li><span class="st-tx"><b>Обработка</b> — холодный туман 10–50 мкм, 40–60 минут, препараты 4-го класса.</span></li>
        <li><span class="st-tx"><b>Результат</b> — первый эффект через 24 часа, полный — до 7 дней.</span></li>
        <li><span class="st-tx"><b>Контроль</b> — 21-й день, бесплатный осмотр; гарантия до 12 месяцев по договору.</span></li>
      </ol>
      <p class="lp-note">Служба «Дез Обработка», ИП Сорокин С.А. — в Пензе с 2018 года.</p>
    </section>

    <section class="lp-faq">
      <h2 class="lp-h2">Частые вопросы</h2>
      <div class="faq">
${faqHtml}
      </div>
    </section>

    <section class="lp-sibs" aria-label="Похожие страницы">
      <span class="cblock-cap">ПО ТЕМЕ · ${svc.name.toUpperCase()}</span>
      <div class="sib-grid">
${siblingsHtml}
      </div>
    </section>
  </main>

  <footer class="footer">
    <span>© 2018–2026 · Дез Обработка · служба дезинфекции, Пенза</span>
    <nav class="footnav" aria-label="Карта страницы">
      <a href="${REL}#reestr">Услуги</a>
      <a href="${REL}#prays">Цены</a>
      <a href="${REL}#kontakty">Контакты</a>
      <a href="${REL}">Главная</a>
    </nav>
    ${sitemapHtml(REL, it.slug)}
  </footer>

  <a class="mcall" href="tel:${CONTACTS.telRaw}"><span class="mcall-cap">Вызвать специалиста</span><span class="mcall-num">${CONTACTS.tel}</span></a>

  <script src="${REL}app.js" defer></script>
</body>
</html>
`;
}

/* ---- SEO-гейт (К-13) ---- */
const problems = [];
const titles = new Set();
const pages = [];
for (const svc of SERVICES) {
  for (const it of svc.items) {
    const bad = [];
    if (it.title.length < 50 || it.title.length > 60) bad.push(`title ${it.title.length} символов (норма 50–60): «${it.title}»`);
    if (it.desc.length < 120 || it.desc.length > 158) bad.push(`desc ${it.desc.length} символов (норма 120–158)`);
    if (titles.has(it.title)) bad.push("дубликат title");
    titles.add(it.title);
    if (!it.h1.includes("Пенз")) bad.push(`h1 без города: «${it.h1}»`);
    if (bad.length) problems.push(`FAIL ${it.slug}: ${bad.join(" · ")}`);
    pages.push({ svc, it, ok: bad.length === 0 });
  }
}

console.log(`страниц в ядре: ${pages.length}`);
for (const p of problems) console.log("  " + p);
if (problems.length) { console.error(`\nSEO-гейт не пройден: ${problems.length} страниц с дефектами`); process.exit(1); }

/* ---- генерация файлов ---- */
let written = 0;
for (const { svc, it } of pages) {
  const dir = join(ROOT, "lp", it.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), pageHtml(svc, it), "utf8");
  written++;
}

/* ---- sitemap.xml ---- */
const urls = [
  `  <url><loc>${DOMAIN}/</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>`,
  ...pages.map(({ it }) => `  <url><loc>${DOMAIN}/lp/${it.slug}/</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`)
];
writeFileSync(join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`, "utf8");

/* ---- блок карты услуг для главной (без префикса ../../) ---- */
writeFileSync(join(HERE, "footer-sitemap-home.html"), sitemapHtml("", null), "utf8");

console.log(`OK: создано страниц: ${written} · sitemap.xml обновлён · блок подвала для главной: tools/lp/footer-sitemap-home.html`);
console.log("SEO-гейт пройден: title 50–60 · desc 120–158 · дубликатов нет (К-13)");
