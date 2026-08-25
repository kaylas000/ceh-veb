#!/usr/bin/env node
/* ЦЕХ validate.mjs — Node ≥18, ноль npm-зависимостей, exit 0/1.
   Запуск: node scripts/validate.mjs projects/<имя>
   Отчёт детерминирован: коды V-01…V-10 + evidence. */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const project = process.argv[2] ?? "projects/demo";
const dir = join(root, project);
const read = (p) => { try { return readFileSync(join(root, p), "utf8"); } catch { return null; } };

/* Каноническая раскладка студии: и репозиторий, и скачанный пакет
   имеют одинаковые пути в корне (references/, skills/, motion/, …). */
const readLib = (p) => read(p);
const listLib = (p) => (existsSync(join(root, p)) ? readdirSync(join(root, p), { recursive: true }) : []);

const rows = [];
const add = (code, title, ok, detail, evidence = []) => rows.push({ code, title, ok, detail, evidence });

const direction = read(join(project, "DIRECTION.md"));
const sources = read(join(project, "SOURCES.md"));
const structure = read(join(project, "STRUCTURE.md"));
const seed = read(join(project, "SEED.md"));
const review = read(join(project, "REVIEW.md"));

/* V-01 */
{
  const refs = direction?.match(/references\/[\w-]+\/REF-\d{2}\.meta\.yaml/g) ?? [];
  const takes = direction?.match(/takeaway/gi) ?? [];
  const anti = /ЧЕМ ЭТО НЕ/i.test(direction ?? "");
  add("V-01", "DIRECTION: референсы и цитаты", refs.length >= 3 && takes.length >= 3 && anti,
    `ссылок: ${refs.length}/3, цитат takeaway: ${takes.length}/3, «ЧЕМ ЭТО НЕ»: ${anti ? "есть" : "нет"}`);
}
/* V-02 */
{
  const paths = [...new Set(sources?.match(/(?:references|skills|motion|assets)\/[\w./-]+\.[a-z]{2,4}/g) ?? [])];
  const missing = paths.filter((p) => !existsSync(join(root, p)));
  add("V-02", "SOURCES: пути существуют", missing.length === 0 && paths.length > 0,
    missing.length ? "не найдено: " + missing.join(", ") : `все ${paths.length} путей на месте`);
}
/* V-03 */
{
  const r = (sources?.match(/motion\/recipes\//g) ?? []).length;
  const s = (sources?.match(/skills\//g) ?? []).length;
  add("V-03", "SOURCES: ≥2 рецептов, ≥1 скила", r >= 2 && s >= 1, `рецептов: ${r}, скилов: ${s}`);
}
/* V-04 — запуск lint-slop */
{
  const siteDir = join(dir, "site");
  let out = "";
  if (existsSync(siteDir)) {
    const { execSync } = await import("node:child_process");
    try { out = execSync(`node scripts/lint-slop.mjs ${project}`, { cwd: root }).toString(); }
    catch (e) { out = e.stdout?.toString() ?? "нарушения найдены"; }
  }
  /* считаем только строки отчёта «file:line B-XX», а не упоминание кодов в тексте */
  const hits = (out.match(/[^ ]+[.](?:html|css|js):[0-9]+[ ]+B-[0-9]{2}(?![0-9])/gi) ?? []).length;
  add("V-04", "site/ чист от BANNED", existsSync(siteDir) && hits === 0, hits ? out.trim() : "нарушений не найдено");
}
/* V-05 — квоты (машинные) */
{
  const slugs = new Set((sources?.match(/motion\/recipes\/([\w-]+)\//g) ?? []).map((s) => s.replace(/motion\/recipes\/|\/$/g, "")));
  const asym = /асимметр/i.test((structure ?? "") + (sources ?? "") + (direction ?? ""));
  const siteCss = existsSync(join(dir, "site")) ? readdirSync(join(dir, "site")).map((f) => read(join(project, "site", f)) ?? "").join("\n") : "";
  const vw = /font-size:\s*(8|9|1[0-2])vw/.test(siteCss);
  const grain = /grain/i.test(siteCss);
  const ok = slugs.size >= 1 && slugs.size <= 3 && asym && vw && grain;
  add("V-05", "Квоты Q-01…Q-07", ok,
    `Q-01: ${slugs.size} рецептов; Q-03 асимметрия: ${asym}; Q-04 ≥8vw: ${vw}; Q-05 зерно: ${grain}`);
}
/* V-06 — easing из реестра */
{
  const curves = JSON.parse(readLib("motion/easing-curves.json") ?? "{}");
  const allowed = new Set(Object.values(curves).map((c) => c.replace(/\s+/g, "")));
  const siteFiles = existsSync(join(dir, "site")) ? readdirSync(join(dir, "site")).map((f) => read(join(project, "site", f)) ?? "") : [];
  let bad = 0;
  for (const c of siteFiles) {
    for (const m of c.matchAll(/cubic-bezier\(([^)]+)\)/g))
      if (!allowed.has("cubic-bezier(" + m[1].replace(/\s+/g, "") + ")")) bad++;
    if (/(transition|animation)[^;{]*(ease-in|ease-out|\bease\b|\blinear\b)/i.test(c)) bad++;
  }
  add("V-06", "Easing из easing-curves.json", bad === 0, bad ? `кривых вне реестра: ${bad}` : "все кривые из реестра");
}
/* V-07 — SEED и оси */
{
  const axes = ["Композиция", "Движение", "Типографика"]
    .map((k) => seed?.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1]?.trim()).filter(Boolean);
  const reflected = axes.filter((a) => direction?.includes(a));
  add("V-07", "SEED: оси отражены", axes.length === 3 && reflected.length === 3,
    `осей: ${axes.length}, отражено: ${reflected.length}`);
}
/* V-08 — REVIEW */
{
  const verdict = /вердикт[:\s—]*(принято|возврат)/i.test(review ?? "");
  const cites = review?.match(/[КBQ]-\d{2}/g) ?? [];
  add("V-08", "REVIEW: вердикт + ссылки", verdict && cites.length >= 2,
    `вердикт: ${verdict ? "есть" : "нет"}, ссылок на правила: ${cites.length}`);
}
/* V-09 — diff-projects: порог сходства */
{
  const { execSync } = await import("node:child_process");
  let pct = 0;
  try { pct = Number(execSync(`node scripts/diff-projects.mjs ${project}`, { cwd: root }).toString().trim()); } catch { pct = 100; }
  add("V-09", "Сходство ≤10%", Number.isFinite(pct) && pct <= 10, `максимальное сходство: ${pct}%`);
}
/* V-10 — полнота meta.yaml */
{
  const cited = [...new Set(((direction ?? "") + (sources ?? "")).match(/REF-\d{2}/g) ?? [])];
  let bad = 0; const ev = [];
  for (const id of cited) {
    const meta = listLib("references")
      .map(String).find((p) => p.endsWith(id + ".meta.yaml"));
    if (!meta) { bad++; ev.push(id + ": meta не найден"); continue; }
    const c = readLib(join("references", meta));
    const techs = (c?.split("techniques:")[1]?.match(/^\s+-\s+/gm) ?? []).length;
    const pals = (c?.match(/#[0-9a-fA-F]{6}/g) ?? []).length;
    if (techs < 3 || pals < 3 || !/takeaway:\s*\S+/.test(c ?? "")) { bad++; ev.push(id + ": схема неполная"); }
  }
  add("V-10", "meta.yaml полны", cited.length > 0 && bad === 0, ev.join("; ") || `референсов: ${cited.length}, дефектов: 0`);
}

/* отчёт */
let ok = 0;
for (const r of rows) {
  if (r.ok) ok++;
  console.log(`${r.ok ? "OK  " : "FAIL"} ${r.code} ${r.title} · ${r.detail}`);
  for (const e of r.evidence) console.log("     " + e);
}
console.log("─".repeat(46));
console.log(`ИТОГ: ${ok}/${rows.length} · exit ${ok === rows.length ? 0 : 1}`);
process.exit(ok === rows.length ? 0 : 1);
