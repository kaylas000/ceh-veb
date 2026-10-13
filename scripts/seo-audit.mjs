#!/usr/bin/env node
/* ЦЕХ seo-audit.mjs — SEO-аудит сайта проекта. Node ≥18, 0 npm-зависимостей, exit 0/1.
   Запуск: node scripts/seo-audit.mjs projects/<имя>
   Прогоняет по всем страницам site/ (кроме 404.html):
     — MetaTagValidator (title 50–60, description 120–158, slug, Schema.org, OG-image)
     — ContentSEOAnalyzer (плотность ключа, читаемость, H2, тонкий контент)
     — правила SEO-манифеста SEO.md (сверка длины title/description, canonical/og:url без .html,
       og:image, один H1, JSON-LD, noindex)
   Служебные HTML-комментарии (блоки-памятки вида <!-- ==== … -->) игнорируются при извлечении,
   но их наличие фиксируется как замечание. */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateSEOManifest } from "../analyzers/MetaTagValidator.js";
import { ContentSEOAnalyzer } from "../analyzers/ContentSEOAnalyzer.js";

const root = resolve(process.cwd());
const project = process.argv[2] ?? "projects/ивакуатор";
const dir = join(root, project);
const siteDir = join(dir, "site");
const seoMdPath = join(dir, "SEO.md");

/* ---------- утилиты ---------- */
const grab = (html, re) => { const m = html.match(re); return m ? m[1].trim() : ""; };
const grabAll = (html, re) => [...html.matchAll(re)].map((m) => m[1].trim());
const jsonLdTypes = (html) =>
  grabAll(html, /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    .flatMap((j) => {
      try {
        const d = JSON.parse(j);
        return [
          d["@type"],
          ...(d["@graph"] ?? []).map((x) => x["@type"]),
          ...(Array.isArray(d) ? d.map((x) => x["@type"]) : []),
        ].filter(Boolean);
      } catch { return []; }
    });
const fade = (kw) => kw.replace(/^(срочный|срочно)\s+/i, "").replace(/\s+срочно$/i, "");

/* ---------- манифест SEO.md (если есть) ---------- */
const manifest = new Map();
if (existsSync(seoMdPath)) {
  const md = readFileSync(seoMdPath, "utf8");
  for (const m of md.matchAll(/^\|\s*`?(\/[^`]*?)`?\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gm)) {
    manifest.set(m[1], { t: +m[2], d: +m[3] });
  }
}
const urlToFile = (u) => (u === "/" ? "index.html" : u.replace(/^\//, "") + ".html");

/* ---------- сбор по страницам ---------- */
if (!existsSync(siteDir)) { console.error(`SEO-AUDIT: нет каталога site/ в ${project}`); process.exit(1); }

const files = readdirSync(siteDir).filter((f) => f.endsWith(".html") && f !== "404.html").sort();
const analyzer = new ContentSEOAnalyzer();
const pages = [];

for (const file of files) {
  let html = readFileSync(join(siteDir, file), "utf8");
  const memo = /<!--[^]*?ШАБЛОН[^]*?-->/i.test(html) || /<!--\s*={10,}[^]*?={10,}\s*-->/s.test(html);
  html = html.replace(/<!--[\s\S]*?-->/g, ""); // комментарии не являются видимым контентом

  const slug = file.replace(/\.html$/, "");
  const url = slug === "index" ? "/" : "/" + slug;
  const title = grab(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = grab(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const h1s = grabAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map((h) => h.replace(/<[^>]*>/g, "").trim());
  const canonical = grab(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  const ogUrl = grab(html, /property=["']og:url["'][^>]+content=["']([^"']*)["']/i);
  const ogImage = grab(html, /property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  const types = jsonLdTypes(html);
  const internalLinks = (html.match(/<a[^>]+href="\/(?!\/)/g) ?? []).length;

  const kw = fade((title.split(/[—–,]/)[0] || "").trim().toLowerCase());
  const meta = validateSEOManifest({
    title, meta_description: description, h1: h1s[0] || "", url_slug: slug,
    structured_data_type: types, internal_links_planned: internalLinks, og_image: ogImage,
  });
  const content = analyzer.analyze(html, kw, ["эвакуатор"]);

  const extra = [];
  if (title.length < 50 || title.length > 60) extra.push(`title ${title.length} (правило 50–60)`);
  if (h1s.length !== 1) extra.push(`H1 на странице: ${h1s.length}`);
  if (h1s[0] && title && h1s[0].toLowerCase().trim() === title.toLowerCase().trim()) extra.push("H1 = title (дубль)");
  if (canonical.includes(".html")) extra.push("canonical с .html");
  if (ogUrl.includes(".html")) extra.push("og:url с .html");
  if (!/photo-og\.jpg/.test(ogImage)) extra.push(`og:image = ${ogImage ? ogImage.split("/").pop() : "нет"}`);
  if (!types.length) extra.push("нет JSON-LD");
  if (/noindex/i.test(html)) extra.push("noindex на индексируемой странице");
  if (memo) extra.push("служебный комментарий-памятка в head");

  const mf = manifest.get(url);
  if (!manifest.size) { /* SEO.md нет — сверку пропускаем */ }
  else if (!mf) extra.push("нет строки в SEO.md");
  else {
    if (mf.t !== title.length) extra.push(`title-манифест ${mf.t} vs факт ${title.length}`);
    if (mf.d !== description.length) extra.push(`desc-манифест ${mf.d} vs факт ${description.length}`);
  }

  pages.push({ file, url, kw, title, meta, content, extra });
}

/* ---------- отчёт ---------- */
const failKey = (p) =>
  p.meta.errors.length || p.extra.length ||
  p.content.issues.some((i) => i.severity === "high" || i.severity === "critical");

let fails = 0;
console.log("SEO-AUDIT " + project + " · " + pages.length + " страниц\n");
for (const p of pages) {
  const bad = failKey(p);
  if (bad) fails++;
  console.log(`— ${p.url}  [meta:${p.meta.isValid ? "OK" : "ERR"} / content:${p.content.score}]  kw=«${p.kw}»`);
  if (p.content.issues.length)
    console.log(`   контент: ${p.content.issues.map((i) => `${i.type}(${i.severity})·${i.message}`).join("; ")}`);
  if (p.meta.errors.length) console.log(`   meta ERR: ${p.meta.errors.join("; ")}`);
  if (p.meta.warnings.length) console.log(`   meta WARN: ${p.meta.warnings.join("; ")}`);
  if (p.extra.length) console.log(`   правила/SEO.md: ${p.extra.join("; ")}`);
}

const avg = (pages.reduce((s, p) => s + p.content.score, 0) / pages.length).toFixed(1);
console.log(`\nИТОГО: ${pages.length} страниц, с замечаниями — ${fails} | средний content-score: ${avg}`);
console.log(fails ? "СТАТУС: FAIL (exit 1)" : "СТАТУС: OK (exit 0)");
process.exit(fails ? 1 : 0);