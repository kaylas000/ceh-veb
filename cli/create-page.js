#!/usr/bin/env node
/* CLI-генератор страниц: не пустит дальше без SEO-манифеста. Node ≥18.
   Запуск: node cli/create-page.js --type=article --title="…" --desc="…" --h1="…" --kw="…"
   (интерактивная версия — через inquirer; здесь минимальный форс-вариант без зависимостей) */
import { readFileSync, writeFileSync } from "node:fs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? ""]; }));
const required = ["type", "title", "desc", "h1", "kw"];
const missing = required.filter((k) => !args[k]);
if (missing.length) { console.error("❌ Не заполнены обязательные SEO-поля: " + missing.join(", ")); process.exit(1); }
if (args.title.length < 30 || args.title.length > 60) { console.error("❌ Title должен быть 30-60 символов"); process.exit(1); }
if (args.desc.length < 120 || args.desc.length > 158) { console.error("❌ Description должен быть 120-158 символов"); process.exit(1); }
if (args.h1.toLowerCase() === args.title.toLowerCase()) { console.error("❌ H1 не должен дублировать title"); process.exit(1); }

const slug = args.kw.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const manifest = { url_slug: slug, title: args.title, meta_description: args.desc, h1: args.h1, primary_keyword: args.kw, content_type: args.type, structured_data_type: [args.type === "article" ? "Article" : "LocalBusiness"], internal_links_planned: [] };
writeFileSync("src/pages/" + slug + ".seo-manifest.json", JSON.stringify(manifest, null, 2));
console.log("✅ Манифест сохранён: src/pages/" + slug + ".seo-manifest.json");
console.log("⚠️  Добавьте ≥2 внутренние ссылки в internal_links_planned");
