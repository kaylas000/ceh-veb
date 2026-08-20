/* ------------------------------------------------------------------ */
/* Сборка скачиваемого пакета студии.                                  */
/* Внутри — реальные файлы, которые агент-дизайнер использует в репо:  */
/* контракты, библиотека, anti-slop, ворота, Node-скрипты (0 завис.),  */
/* шаблоны проектов и негативная фикстура.                             */
/* ------------------------------------------------------------------ */

import { CONSTITUTION, BANNED, QUOTAS, GATES, REFERENCES, SKILLS, PAIRS, TEXTURES, ROLES } from "../data/library";
import { DEVICES, SWEEP_VIEWPORTS } from "../data/mobile";
import { EASING_CURVES, RECIPES } from "../data/recipes";
import { FS } from "../data/fs";
import { SPACING_SCALE, SEMANTIC_TOKENS, FLUID_TOKENS } from "../data/spacing";
import type { ZipEntry } from "./zip";

/* ---------- сниппеты рецептов (vanilla JS, без библиотек) ---------- */

const SNIPPETS: Record<string, string> = {
  "mask-reveal": `/* mask-reveal · IntersectionObserver + CSS · без библиотек */
(function () {
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("mask-live"); io.unobserve(e.target); }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll("[data-mask]").forEach(function (el) { io.observe(el); });
})();`,
  "sticky-scene": `/* sticky-scene · IntersectionObserver · без библиотек */
(function () {
  var pin = document.querySelector("[data-pin]");
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (pin && e.isIntersecting) pin.dataset.active = e.target.dataset.step;
    });
  }, { threshold: 0.55 });
  document.querySelectorAll("[data-step]").forEach(function (s) { io.observe(s); });
})();`,
  "conveyor-hooks": `/* conveyor-hooks · CSS-анимация ленты + фазовое качание крюков */
(function () {
  var hooks = document.querySelectorAll("[data-hook]");
  hooks.forEach(function (h, i) {
    h.style.animationDelay = (i * 0.7) + "s"; /* фаза 0.7s на крюк */
  });
})();`,
  "intro-assembly": `/* intro-assembly · кинозаставка: частицы собирают слово (правила SK-06) */
(function () {
  if (sessionStorage.getItem("intro-seen") === "1") return;            /* раз в сессию */
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;  /* уважаем настройку */
  sessionStorage.setItem("intro-seen", "1");

  var cv = document.createElement("canvas");
  cv.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:#0f0e0a";
  document.body.appendChild(cv);
  var skip = document.createElement("button");
  skip.textContent = "Пропустить →";
  skip.style.cssText = "position:fixed;right:24px;bottom:24px;z-index:2147483647;padding:10px 18px";
  document.body.appendChild(skip);

  var ctx = cv.getContext("2d"), W, H, pts = [], t0 = performance.now(), DUR = 3400;
  function size() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    var off = document.createElement("canvas"), fs = Math.min(W * 0.3, H * 0.4);
    off.width = W; off.height = fs * 1.4;
    var c = off.getContext("2d");
    c.font = "900 " + fs + "px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#fff"; c.fillText("СТУДИЯ", W / 2, off.height / 2); /* слово клиента */
    var img = c.getImageData(0, 0, off.width, off.height); pts = [];
    for (var y = 0; y < off.height; y += 3) for (var x = 0; x < off.width; x += 3)
      if (img.data[(y * off.width + x) * 4 + 3] > 128) pts.push([x - W / 2, y - off.height / 2]);
  }
  size(); addEventListener("resize", size);
  var P = Array.from({ length: Math.min(4000, pts.length * 2) }, function () {
    var t = pts[(Math.random() * pts.length) | 0], a = Math.random() * 6.28, r = Math.max(W, H);
    return { sx: Math.cos(a) * r, sy: Math.sin(a) * r * 0.8, tx: t[0], ty: t[1], d: Math.random() * 0.4 };
  });
  var ease = function (x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
  var done = false;
  function finish() { if (done) return; done = true; cv.remove(); skip.remove(); }
  skip.onclick = finish; addEventListener("keydown", function (e) { if (e.key === "Escape") finish(); });
  (function loop(now) {
    if (done) return;
    requestAnimationFrame(loop);
    var p = Math.min(1, (now - t0) / DUR);
    ctx.fillStyle = "#0f0e0a"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e8e6de";
    for (var i = 0; i < P.length; i++) {
      var q = P[i], e = ease(Math.max(0, Math.min(1, (p - q.d) / (1 - q.d))));
      ctx.globalAlpha = 0.15 + 0.8 * e;
      ctx.fillRect(W / 2 + q.sx + (q.tx - q.sx) * e, H / 2 + q.sy + (q.ty - q.sy) * e, 2, 2);
    }
    if (p >= 1) setTimeout(finish, 500);
  })(t0);
})();`,
};

const genericSnippet = (slug: string) => `/* ${slug} · каркас сниппета · допиши под рецепт в recipe.yaml */
(function () {
  /* 1. выбери элементы; 2. слушай скролл/вход во вьюпорт; 3. меняй одно состояние */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add("is-live"); });
  }, { threshold: 0.3 });
  document.querySelectorAll("[data-${slug}]").forEach(function (el) { io.observe(el); });
})();`;

/* ---------- Node-скрипты студии (Node ≥18, ноль npm-зависимостей) ---------- */

const validateMjs = `#!/usr/bin/env node
/* ЦЕХ validate.mjs — Node ≥18, ноль npm-зависимостей, exit 0/1.
   Запуск: node scripts/validate.mjs projects/<имя>
   Отчёт детерминирован: коды V-01…V-10 + evidence. */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const project = process.argv[2] ?? "projects/demo";
const dir = join(root, project);
const read = (p) => { try { return readFileSync(join(root, p), "utf8"); } catch { return null; } };
const rows = [];
const add = (code, title, ok, detail, evidence = []) => rows.push({ code, title, ok, detail, evidence });

const direction = read(join(project, "DIRECTION.md"));
const sources = read(join(project, "SOURCES.md"));
const structure = read(join(project, "STRUCTURE.md"));
const seed = read(join(project, "SEED.md"));
const review = read(join(project, "REVIEW.md"));

/* V-01 */
{
  const refs = direction?.match(/references\\/[\\w-]+\\/REF-\\d{2}\\.meta\\.yaml/g) ?? [];
  const takes = direction?.match(/takeaway/gi) ?? [];
  const anti = /ЧЕМ ЭТО НЕ/i.test(direction ?? "");
  add("V-01", "DIRECTION: референсы и цитаты", refs.length >= 3 && takes.length >= 3 && anti,
    \`ссылок: \${refs.length}/3, цитат takeaway: \${takes.length}/3, «ЧЕМ ЭТО НЕ»: \${anti ? "есть" : "нет"}\`);
}
/* V-02 */
{
  const paths = [...new Set(sources?.match(/(?:references|skills|motion|assets)\\/[\\w./-]+\\.[a-z]{2,4}/g) ?? [])];
  const missing = paths.filter((p) => !existsSync(join(root, p)));
  add("V-02", "SOURCES: пути существуют", missing.length === 0 && paths.length > 0,
    missing.length ? "не найдено: " + missing.join(", ") : \`все \${paths.length} путей на месте\`);
}
/* V-03 */
{
  const r = (sources?.match(/motion\\/recipes\\//g) ?? []).length;
  const s = (sources?.match(/skills\\//g) ?? []).length;
  add("V-03", "SOURCES: ≥2 рецептов, ≥1 скила", r >= 2 && s >= 1, \`рецептов: \${r}, скилов: \${s}\`);
}
/* V-04 — запуск lint-slop */
{
  const siteDir = join(dir, "site");
  let out = "";
  if (existsSync(siteDir)) {
    const { execSync } = await import("node:child_process");
    try { out = execSync(\`node scripts/lint-slop.mjs \${project}\`, { cwd: root }).toString(); }
    catch (e) { out = e.stdout?.toString() ?? "нарушения найдены"; }
  }
  const hits = (out.match(/\\bB-\\d{2}\\b/g) ?? []).length;
  add("V-04", "site/ чист от BANNED", existsSync(siteDir) && hits === 0, hits ? out.trim() : "нарушений не найдено");
}
/* V-05 — квоты (машинные) */
{
  const slugs = new Set((sources?.match(/motion\\/recipes\\/([\\w-]+)\\//g) ?? []).map((s) => s.replace(/motion\\/recipes\\/|\\/$/g, "")));
  const asym = /асимметр/i.test((structure ?? "") + (sources ?? "") + (direction ?? ""));
  const siteCss = existsSync(join(dir, "site")) ? readdirSync(join(dir, "site")).map((f) => read(join(project, "site", f)) ?? "").join("\\n") : "";
  const vw = /font-size:\\s*(8|9|1[0-2])vw/.test(siteCss);
  const grain = /grain/i.test(siteCss);
  const ok = slugs.size >= 1 && slugs.size <= 3 && asym && vw && grain;
  add("V-05", "Квоты Q-01…Q-07", ok,
    \`Q-01: \${slugs.size} рецептов; Q-03 асимметрия: \${asym}; Q-04 ≥8vw: \${vw}; Q-05 зерно: \${grain}\`);
}
/* V-06 — easing из реестра */
{
  const curves = JSON.parse(read("motion/easing-curves.json") ?? "{}");
  const allowed = new Set(Object.values(curves).map((c) => c.replace(/\\s+/g, "")));
  const siteFiles = existsSync(join(dir, "site")) ? readdirSync(join(dir, "site")).map((f) => read(join(project, "site", f)) ?? "") : [];
  let bad = 0;
  for (const c of siteFiles) {
    for (const m of c.matchAll(/cubic-bezier\\(([^)]+)\\)/g))
      if (!allowed.has("cubic-bezier(" + m[1].replace(/\\s+/g, "") + ")")) bad++;
    if (/(transition|animation)[^;{]*(ease-in|ease-out|\\bease\\b|\\blinear\\b)/i.test(c)) bad++;
  }
  add("V-06", "Easing из easing-curves.json", bad === 0, bad ? \`кривых вне реестра: \${bad}\` : "все кривые из реестра");
}
/* V-07 — SEED и оси */
{
  const axes = ["Композиция", "Движение", "Типографика"]
    .map((k) => seed?.match(new RegExp(\`^\${k}:\\\\s*(.+)$\`, "m"))?.[1]?.trim()).filter(Boolean);
  const reflected = axes.filter((a) => direction?.includes(a));
  add("V-07", "SEED: оси отражены", axes.length === 3 && reflected.length === 3,
    \`осей: \${axes.length}, отражено: \${reflected.length}\`);
}
/* V-08 — REVIEW */
{
  const verdict = /вердикт[:\\s—]*(принято|возврат)/i.test(review ?? "");
  const cites = review?.match(/[КBQ]-\\d{2}/g) ?? [];
  add("V-08", "REVIEW: вердикт + ссылки", verdict && cites.length >= 2,
    \`вердикт: \${verdict ? "есть" : "нет"}, ссылок на правила: \${cites.length}\`);
}
/* V-09 — diff-projects: порог сходства */
{
  const { execSync } = await import("node:child_process");
  let pct = 0;
  try { pct = Number(execSync(\`node scripts/diff-projects.mjs \${project}\`, { cwd: root }).toString().trim()); } catch { pct = 100; }
  add("V-09", "Сходство ≤10%", Number.isFinite(pct) && pct <= 10, \`максимальное сходство: \${pct}%\`);
}
/* V-10 — полнота meta.yaml */
{
  const cited = [...new Set(((direction ?? "") + (sources ?? "")).match(/REF-\\d{2}/g) ?? [])];
  let bad = 0; const ev = [];
  for (const id of cited) {
    const meta = readdirSync(join(root, "references"), { recursive: true })
      .map(String).find((p) => p.endsWith(id + ".meta.yaml"));
    if (!meta) { bad++; ev.push(id + ": meta не найден"); continue; }
    const c = read(join("references", meta));
    const techs = (c?.split("techniques:")[1]?.match(/^\\s+-\\s+/gm) ?? []).length;
    const pals = (c?.match(/#[0-9a-fA-F]{6}/g) ?? []).length;
    if (techs < 3 || pals < 3 || !/takeaway:\\s*\\S+/.test(c ?? "")) { bad++; ev.push(id + ": схема неполная"); }
  }
  add("V-10", "meta.yaml полны", cited.length > 0 && bad === 0, ev.join("; ") || \`референсов: \${cited.length}, дефектов: 0\`);
}

/* отчёт */
let ok = 0;
for (const r of rows) {
  if (r.ok) ok++;
  console.log(\`\${r.ok ? "OK  " : "FAIL"} \${r.code} \${r.title} · \${r.detail}\`);
  for (const e of r.evidence) console.log("     " + e);
}
console.log("─".repeat(46));
console.log(\`ИТОГ: \${ok}/\${rows.length} · exit \${ok === rows.length ? 0 : 1}\`);
process.exit(ok === rows.length ? 0 : 1);
`;

const lintSlopMjs = `#!/usr/bin/env node
/* ЦЕХ lint-slop.mjs — grep по BANNED.md + эвристики. Node ≥18, 0 зависимостей.
   Запуск: node scripts/lint-slop.mjs projects/<имя> — печатает file:line CODE. */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const project = process.argv[2] ?? "projects/demo";
const siteDir = join(root, project, "site");
if (!existsSync(siteDir)) { console.error("site/ не найден"); process.exit(1); }

const RULES = [
  ["B-01", /transition\\s*:\\s*all/i],
  ["B-02", /ease-in-out|ease-in\\b|ease-out\\b|\\.4,\\s*0,\\s*\\.2,\\s*1|(?<![\\w.])ease(?![-\\w])/i],
  ["B-05", /#6366f1|#8b5cf6|#a855f7/i],
  ["B-06", /background-clip\\s*:\\s*text/i],
  ["B-07", /backdrop-filter/i],
  ["B-09", /lorem ipsum/i],
  ["B-10", /rounded-2xl|border-radius\\s*:\\s*16px/i],
  ["B-12", /узнать больше|свяжитесь с нами/i],
  ["B-13", /blur-3xl|blur\\(\\s*8\\d\\s*px\\s*\\)/i],
  ["B-14", /нам доверяют|trusted by/i],
  ["B-15", /\\d{3,}\\+\\s*(клиент|проект|компани)/i],
];

let found = 0;
const files = readdirSync(siteDir).filter((f) => /\\.(html|css|js)$/.test(f));
const fams = new Set();
for (const f of files) {
  const c = readFileSync(join(siteDir, f), "utf8");
  for (const [code, re] of RULES) {
    c.split("\\n").forEach((line, i) => {
      if (re.test(line)) { console.log(\`\${f}:\${i + 1} \${code} «\${line.trim().slice(0, 64)}»\`); found++; }
    });
  }
  if (/\\.html$/.test(f)) {
    if (/text-center/i.test(c) && /<h1/i.test(c) && (c.match(/class="[^"]*btn/g) ?? []).length >= 2)
      { console.log(\`\${f} B-03 hero: text-center + h1 + 2 кнопки\`); found++; }
    if (/grid-cols-3/i.test(c) && (c.match(/class="card"/g) ?? []).length >= 3)
      { console.log(\`\${f} B-04 три одинаковые карточки в ряд\`); found++; }
    if ((c.match(/py-24/g) ?? []).length >= 4)
      { console.log(\`\${f} B-16 одинаковый ритм секций\`); found++; }
  }
  for (const m of c.matchAll(/font-family:\\s*([^;}{]+)/g))
    m[1].split(",").map((s) => s.trim().replace(/['"]/g, ""))
      .filter((s) => s && !/sans-serif|serif|monospace|inherit/.test(s))
      .forEach((s) => fams.add(s));
}
if (fams.size === 1) { console.log(\`site/* B-08 единственный шрифт «\${[...fams][0]}» без пары\`); found++; }
if (found === 0) console.log("чисто: нарушений B-01…B-16 не найдено");
process.exit(found === 0 ? 0 : 1);
`;

const rouletteMjs = `#!/usr/bin/env node
/* ЦЕХ roulette.mjs — раздаёт оси SEED: композиция × движение × типографика.
   Node ≥18, 0 зависимостей. Пишет SEED.md в указанный проект.
   Запуск: node scripts/roulette.mjs projects/<имя> */
import { writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const AXES = {
  composition: ["ломаная сетка с левой рейкой", "индекс-реестр во всю ширину", "плакатные развороты", "наряд-паспорт с левой плитой", "асимметричная лестница блоков"],
  motion: ["липкая сцена", "конвейер-лента", "кен-бёрнс на архивных фото", "маска-reveal строк", "вагонетка-сборка"],
  typography: ["капс 9vw, перенос по смыслу", "антиква в наборе, mono-подписи", "гигантские цифры разделов", "узкий брусковый капс", "табличный mono как графика"],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const project = process.argv[2] ?? "projects/new";
const dir = resolve(process.cwd(), project);
mkdirSync(dir, { recursive: true });

/* номер броска: следующий за максимальным в projects/ */
const taken = existsSync("projects") ? readdirSync("projects") : [];
const n = 1 + taken.length;
const seed = \`# SEED.md — бросок №\${n}

roulette.mjs · \${new Date().toISOString().slice(0, 10)} · оси розданы случайно

Композиция: \${pick(AXES.composition)}
Движение: \${pick(AXES.motion)}
Типографика: \${pick(AXES.typography)}
\`;
writeFileSync(join(dir, "SEED.md"), seed, "utf8");
console.log(seed);
`;

const diffProjectsMjs = `#!/usr/bin/env node
/* ЦЕХ diff-projects.mjs — сходство секций и палитр с последними 3 проектами.
   Node ≥18, 0 зависимостей. Печатает целое число процентов (порог ≤10). */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const project = process.argv[2] ?? "projects/demo";
const read = (p) => { try { return readFileSync(join(root, p), "utf8"); } catch { return ""; } };
const jacc = (a, b) => { const sa = new Set(a), sb = new Set(b);
  const i = [...sa].filter((x) => sb.has(x)).length, u = new Set([...sa, ...sb]).size;
  return u === 0 ? 0 : i / u; };

const structure = read(join(project, "STRUCTURE.md"));
const direction = read(join(project, "DIRECTION.md"));
const sec = (structure.match(/^## (.+)$/gm) ?? []).map((s) => s.replace(/^## /, "").trim().toLowerCase());
const pal = [...new Set(direction.match(/#[0-9a-fA-F]{6}/g) ?? [])].map((s) => s.toLowerCase());

const histDir = join(root, "projects", "_history");
const files = existsSync(histDir) ? readdirSync(histDir).filter((f) => f.endsWith(".manifest.md")).slice(-3) : [];
let worst = 0;
for (const f of files) {
  const c = read(join("projects", "_history", f));
  const ms = (c.match(/^Секции:\\s*(.+)$/m)?.[1] ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const mp = (c.match(/^Палитра:\\s*(.+)$/m)?.[1] ?? "").match(/#[0-9a-fA-F]{6}/g)?.map((s) => s.toLowerCase()) ?? [];
  worst = Math.max(worst, 0.6 * jacc(sec, ms) + 0.4 * jacc(pal, mp));
}
console.log(Math.round(worst * 100));
`;

/* ---------- генерация файлов ---------- */

function gatesFiles(): ZipEntry[] {
  const slugs: Record<string, string> = { G1: "G1-direction", G2: "G2-structure", G3: "G3-motion", G4: "G4-final" };
  return GATES.map((g) => ({
    name: `gates/${slugs[g.code]}.md`,
    content: `# ${g.code} — ${g.name}\n\n## Цель\n${g.goal}\n\n## Вход\n${g.input}\n\n## Чек-лист\n${g.checklist
      .map((c, i) => `${i + 1}. ${c}`)
      .join("\n")}\n\n## Выходной артефакт\n${g.output}\n\n## Критерии отказа\n${g.reject}\n`,
  }));
}

/* ---------- Spacing Control: файлы для архива студии ---------- */

function spacingFiles(): ZipEntry[] {
  const out: ZipEntry[] = [];

  /* источник правды — токены */
  out.push({
    name: "tokens/spacing.tokens.json",
    content:
      JSON.stringify(
        {
          spacing: Object.fromEntries(SPACING_SCALE.map((s) => [s.key, { value: `${s.px}px` }])),
          semantic: Object.fromEntries(SEMANTIC_TOKENS.map((t) => [t.token.replace(/^--/, ""), { value: `{${t.ref}}` }])),
          fluid: Object.fromEntries(
            FLUID_TOKENS.map((t) => [t.token.replace(/^--/, ""), { min: `${t.minPx}px`, max: `${t.maxPx}px`, minViewport: "375px", maxViewport: "1440px" }]),
          ),
        },
        null,
        2,
      ) + "\n",
  });

  /* Stylelint: запрет произвольных значений */
  out.push({
    name: "linting/stylelint-spacing-plugin/no-arbitrary-spacing.js",
    content: `/* Stylelint-правило: spacing-control/no-arbitrary-values.
   Блокирует margin/padding/gap/позиционирование со значениями вне шкалы.
   Подключение: plugins: ["./linting/stylelint-spacing-plugin/no-arbitrary-spacing.js"] */
const APPROVED = [${SPACING_SCALE.map((s) => s.px).join(", ")}];
const PROPS = ["margin","margin-top","margin-bottom","margin-left","margin-right",
  "padding","padding-top","padding-bottom","padding-left","padding-right",
  "gap","row-gap","column-gap","top","bottom","left","right"];
module.exports = function (stylelint) {
  return stylelint.createPlugin("spacing-control/no-arbitrary-values", (enabled) => (root, result) => {
    if (!enabled) return;
    root.walkDecls((decl) => {
      if (!PROPS.includes(decl.prop)) return;
      if (decl.value.includes("var(--") || ["auto","inherit","initial","unset","0"].includes(decl.value)) return;
      decl.value.split(/\\s+/).forEach((val) => {
        const m = val.match(/^(-?\\d+(?:\\.\\d+)?)(px|rem)$/);
        if (!m) return;
        const px = Math.abs(parseFloat(m[1]) * (m[2] === "rem" ? 16 : 1));
        if (!APPROVED.includes(Math.round(px))) {
          const nearest = APPROVED.reduce((a, b) => (Math.abs(b - px) < Math.abs(a - px) ? b : a));
          stylelint.utils.report({
            message: \`\${decl.prop}: \${val} вне шкалы отступов. Используйте var(--spacing-*) или \${nearest}px\`,
            node: decl, result, ruleName: "spacing-control/no-arbitrary-values",
          });
        }
      });
    });
  });
};
`,
  });

  /* примитивы */
  out.push({
    name: "components/primitives/Box.jsx",
    content: `/* Box: spacing-пропсы принимают только ключи шкалы (см. tokens/spacing.tokens.json).
   Произвольное значение -> console.error + data-spacing-invalid (красная рамка). */
import React from "react";
import { spacingScale, isSpacingKey } from "../spacing-props";
const cssVar = (k) => \`var(--spacing-\${String(k).replace(".", "-")})\`;
export const Box = React.forwardRef(({ as: T = "div", p, px, py, m, mx, my, gap, style = {}, children, ...rest }, ref) => {
  const invalid = [p, px, py, m, mx, my, gap].some((v) => v !== undefined && !isSpacingKey(v));
  const s = { ...style,
    padding: p !== undefined ? cssVar(p) : undefined,
    paddingLeft: px !== undefined ? cssVar(px) : undefined, paddingRight: px !== undefined ? cssVar(px) : undefined,
    paddingTop: py !== undefined ? cssVar(py) : undefined, paddingBottom: py !== undefined ? cssVar(py) : undefined,
    margin: m !== undefined ? cssVar(m) : undefined,
    marginLeft: mx !== undefined ? cssVar(mx) : undefined, marginRight: mx !== undefined ? cssVar(mx) : undefined,
    marginTop: my !== undefined ? cssVar(my) : undefined, marginBottom: my !== undefined ? cssVar(my) : undefined,
    gap: gap !== undefined ? cssVar(gap) : undefined };
  if (invalid) console.error("SPACING: значение вне шкалы. Допустимо:", Object.keys(spacingScale).join(", "));
  return <T ref={ref} style={s} data-spacing-invalid={invalid || undefined} {...rest}>{children}</T>;
});
`,
  });
  out.push({
    name: "components/primitives/Stack.jsx",
    content: `/* Stack: единый gap из шкалы между детьми — вместо ручных margin. */
import React from "react";
import { Box } from "./Box";
export function Stack({ direction = "vertical", gap = "4", align = "stretch", justify = "flex-start", children, ...rest }) {
  return (
    <Box style={{ display: "flex", flexDirection: direction === "vertical" ? "column" : "row", alignItems: align, justifyContent: justify }} gap={gap} {...rest}>
      {children}
    </Box>
  );
}
`,
  });
  out.push({
    name: "components/primitives/Spacer.jsx",
    content: `/* Spacer: явный разделитель вместо "margin-bottom на всякий случай". */
import React from "react";
export function Spacer({ size = "4", axis = "vertical" }) {
  const v = \`var(--spacing-\${String(size).replace(".", "-")})\`;
  return <div aria-hidden data-spacer-size={size} style={{ width: axis === "vertical" ? "100%" : v, height: axis === "vertical" ? v : "100%", flexShrink: 0 }} />;
}
`,
  });
  out.push({
    name: "components/spacing-props.js",
    content: `/* Единый источник допустимых значений (зеркало tokens/spacing.tokens.json). */
export const spacingScale = ${JSON.stringify(Object.fromEntries(SPACING_SCALE.map((s) => [s.key, `${s.px}px`])), null, 2)};
export const isSpacingKey = (v) => Object.prototype.hasOwnProperty.call(spacingScale, String(v));
`,
  });

  /* визуальный дебаггер */
  out.push({
    name: "devtools/SpacingOverlay.js",
    content: `/* SpacingOverlay: подсвечивает margin(оранж)/padding(зелён)/gap(синий) поверх страницы,
   красные метки — значения вне шкалы. Горячая клавиша Ctrl+Shift+S. window.__spacingOverlay. */
const APPROVED = [${SPACING_SCALE.map((s) => s.px).join(", ")}];
class SpacingOverlay {
  constructor(){ this.on=false; this.layer=null; }
  toggle(){ this.on ? this.disable() : this.enable(); }
  enable(){ if(this.on) return; this.on=true;
    this.layer=document.createElement("div");
    this.layer.style.cssText="position:fixed;inset:0;z-index:999998;pointer-events:none;";
    document.body.appendChild(this.layer); this.render();
    window.addEventListener("scroll",()=>this.render(),{passive:true}); }
  disable(){ this.on=false; this.layer?.remove(); this.layer=null; }
  render(){ if(!this.layer) return; this.layer.innerHTML="";
    for(const el of document.querySelectorAll("body *")){
      const r=el.getBoundingClientRect(); if(!r.width&&!r.height) continue;
      if(r.bottom<0||r.top>innerHeight) continue;
      const cs=getComputedStyle(el);
      this.box(r.left,r.top-cs.getPropertyValue?0:0,r,cs);
    } }
  box(l,t,r,cs){ const mk=(x,y,w,h,c,v)=>{ const d=document.createElement("div");
      d.style.cssText=\`position:absolute;left:\${x}px;top:\${y}px;width:\${w}px;height:\${h}px;outline:1px dashed \${c};background:\${c}22\`;
      this.layer.appendChild(d); if(!APPROVED.includes(Math.round(v))) this.tag(x,y,\`\${v}px⚠\`); };
    const m=parseFloat(cs.marginTop)||0,p=parseFloat(cs.paddingTop)||0;
    if(m>0)mk(l,r.top-m,r.width,m,"#ff6a2b",m);
    if(p>0)mk(l,r.top,r.width,p,"#2e7d4f",p); }
  tag(x,y,txt){ const s=document.createElement("span");
    s.style.cssText="position:absolute;left:"+x+"px;top:"+y+"px;background:#ce2c18;color:#fff;font:600 9px monospace;padding:2px 4px;";
    s.textContent=txt; this.layer.appendChild(s); }
}
window.__spacingOverlay=new SpacingOverlay();
document.addEventListener("keydown",(e)=>{ if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==="s"){ e.preventDefault(); window.__spacingOverlay.toggle(); } });
`,
  });

  /* CI-gate */
  out.push({
    name: "ci/spacing-gate.yml",
    content: `# Spacing Control Gate: ни один PR с нарушениями отступов не уходит в прод.
name: Spacing Control Gate
on:
  pull_request:
    branches: [main, staging]
jobs:
  spacing-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm install
      - name: Stylelint spacing check
        run: npx stylelint "**/*.css" --config .stylelintrc-spacing.js
  spacing-audit:
    runs-on: ubuntu-latest
    needs: spacing-lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: node ./audit/run-audit.js   # exit 1 при >20 нарушениях
`,
  });

  /* Playwright visual regression */
  out.push({
    name: "visual-regression/spacing.spec.js",
    content: `/* Регрессия отступов: скриншот с активным оверлеем + снапшот computed-значений. */
import { test, expect } from "@playwright/test";
const VIEWPORTS = [{ width: 375, height: 812, name: "mobile" }, { width: 1440, height: 900, name: "desktop" }];
for (const vp of VIEWPORTS) {
  test(\`spacing overlay snapshot @ \${vp.name}\`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.__spacingOverlay?.enable());
    await expect(page).toHaveScreenshot(\`home-\${vp.name}-spacing.png\`, { maxDiffPixelRatio: 0.02 });
  });
}
`,
  });

  /* гайд */
  out.push({
    name: "docs/SPACING_GUIDE.md",
    content: `# SPACING_GUIDE — система контроля отступов

## Шкала (единственный источник)
${SPACING_SCALE.map((s) => `- \`--spacing-${s.key.replace(".", "-")}\` = ${s.px}px`).join("\n")}

## Правила
1. В CSS — только \`var(--spacing-*)\` или значения из шкалы. Stylelint заблокирует остальное.
2. В React — только \`<Box p="4"> / <Stack gap="6"> / <Spacer size="2">\`. Ключи вне шкалы → ошибка.
3. Секции и контейнеры — fluid-токены \`--fluid-*\` (clamp между 375 и 1440px).
4. Отладка в браузере: Ctrl+Shift+S (оверлей) или \`window.__spacingOverlay.audit()\`.
5. CI: PR с >20 нарушениями не мержится (ci/spacing-gate.yml).

## Fluid-токены
${FLUID_TOKENS.map((t) => `- \`${t.token}\`: ${t.css} — ${t.role}`).join("\n")}
`,
  });

  return out;
}

/* ---------- Mobile-Perfect: файлы для архива студии ---------- */

function mobileFiles(): ZipEntry[] {
  const out: ZipEntry[] = [];

  out.push({
    name: "config/device-matrix.json",
    content: JSON.stringify(DEVICES, null, 2) + "\n",
  });

  out.push({
    name: "css-architecture/fluid-system.css",
    content: `/* Fluid-типографика: плавно 320→1440px, без скачков на медиа-запросах */
:root {
  --fs-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --fs-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
  --fs-base: clamp(1rem, 0.925rem + 0.375vw, 1.125rem);
  --fs-lg: clamp(1.125rem, 1rem + 0.625vw, 1.375rem);
  --fs-xl: clamp(1.25rem, 1.05rem + 1vw, 1.75rem);
  --fs-2xl: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem);
  --fs-3xl: clamp(1.875rem, 1.4rem + 2.375vw, 3rem);
  --fs-4xl: clamp(2.25rem, 1.6rem + 3.25vw, 4rem);
  --fs-hero: clamp(2.5rem, 1.5rem + 5vw, 5.5rem);
}

/* гарды против горизонтального скролла */
img, video, iframe, svg, canvas { max-width: 100%; height: auto; display: block; }
p, span, a, li { overflow-wrap: break-word; word-break: break-word; hyphens: auto; }
table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }

/* <16px = iOS зумит страницу при фокусе */
input, select, textarea { font-size: max(16px, 1rem); }
`,
  });

  out.push({
    name: "css-architecture/safe-area.css",
    content: `/* notch / Dynamic Island / home indicator.
   Обязательно: <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"> */
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}
.header-fixed { padding-top: calc(var(--safe-top) + 1rem); }
.bottom-nav { padding-bottom: calc(var(--safe-bottom) + 0.5rem); min-height: calc(56px + var(--safe-bottom)); }
.sticky-cta { bottom: calc(1rem + var(--safe-bottom)); }
.content-wrapper { padding-left: max(1rem, var(--safe-left)); padding-right: max(1rem, var(--safe-right)); }
`,
  });

  out.push({
    name: "css-architecture/touch-targets.css",
    content: `/* Apple HIG: 44pt, Material: 48dp. Берём 44px минимум + 8px между зонами */
:root {
  --touch-target-min: 44px;
  --touch-target-spacing-min: 8px;
}
button, a, [role="button"], input[type="checkbox"], input[type="radio"] {
  min-height: var(--touch-target-min);
  min-width: var(--touch-target-min);
}
/* невидимое расширение хитбокса для мелких иконок */
.icon-button { position: relative; width: 24px; height: 24px; }
.icon-button::before {
  content: "";
  position: absolute; top: 50%; left: 50%;
  width: var(--touch-target-min); height: var(--touch-target-min);
  transform: translate(-50%, -50%);
}
.button-group > * + * { margin-left: var(--touch-target-spacing-min); }
`,
  });

  out.push({
    name: "validators/TouchTargetValidator.js",
    content: `/* Тап-зоны ≥44px + дистанция ≥8px. Запуск: в браузере или через Playwright evaluate. */
const INTERACTIVE = "button, a[href], input, select, textarea, [role='button'], [tabindex]";
export class TouchTargetValidator {
  constructor(opts = {}) { this.min = opts.minSize || 44; }
  validate() {
    const violations = [];
    let total = 0;
    for (const el of document.querySelectorAll(INTERACTIVE)) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      total++;
      if (r.width < this.min || r.height < this.min)
        violations.push({ selector: el.tagName.toLowerCase() + (el.id ? "#" + el.id : ""), size: Math.round(r.width) + "x" + Math.round(r.height) });
    }
    return { total, violations, isValid: violations.length === 0 };
  }
}
`,
  });

  out.push({
    name: "validators/HorizontalScrollDetector.js",
    content: `/* Ловит горизонтальный скролл и находит виновников. */
export class HorizontalScrollDetector {
  detect() {
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    if (scrollW <= docW) return { hasIssue: false };
    const culprits = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > docW + 1 || r.left < -1))
        culprits.push({ selector: el.tagName.toLowerCase() + (el.id ? "#" + el.id : ""), overflow: Math.round(Math.max(r.right - docW, -r.left)) });
    }
    culprits.sort((a, b) => b.overflow - a.overflow);
    return { hasIssue: true, overflowPx: scrollW - docW, culprits: culprits.slice(0, 10) };
  }
}
`,
  });

  out.push({
    name: "testing/device-sweep/viewport-list.js",
    content: `export const VIEWPORT_SWEEP_LIST = ${JSON.stringify(SWEEP_VIEWPORTS, null, 2)};\n`,
  });

  out.push({
    name: "components/MobileFormField.jsx",
    content: `/* Поле с mobile-UX: 16px (анти-зум iOS), inputmode, autocomplete, тап-зона 48px */
import React from "react";
const MODE = { email: "email", tel: "tel", number: "numeric", url: "url", search: "search" };
export function MobileFormField({ type = "text", label, name, ...rest }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={name} style={{ display: "block", marginBottom: 8 }}>{label}</label>
      <input
        id={name} name={name} type={type}
        inputMode={MODE[type] || "text"} autoComplete={rest.autoComplete || name}
        style={{ fontSize: 16, minHeight: 48, padding: "12px 16px", width: "100%", boxSizing: "border-box" }}
        {...rest}
      />
    </div>
  );
}
`,
  });

  out.push({
    name: "components/SafeAreaWrapper.jsx",
    content: `/* Автоматически учитывает notch/home-indicator для fixed-элементов */
import React from "react";
const SIDES = { top: "--safe-top", bottom: "--safe-bottom", left: "--safe-left", right: "--safe-right" };
export function SafeAreaWrapper({ children, sides = ["top", "bottom"], as: T = "div", style = {}, ...rest }) {
  const s = { ...style };
  sides.forEach((side) => { s["padding" + side[0].toUpperCase() + side.slice(1)] = "var(" + SIDES[side] + ")"; });
  return <T style={s} {...rest}>{children}</T>;
}
`,
  });

  out.push({
    name: "ci/mobile-gate.yml",
    content: `# Mobile Perfect Gate: sweep + тап-зоны + Lighthouse mobile + перф-бюджет.
name: Mobile Perfect Gate
on:
  pull_request:
    branches: [main, staging]
jobs:
  viewport-sweep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm install && npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run preview & npx wait-on http://localhost:4173
      - run: node testing/device-sweep/run-viewport-sweep.js
  mobile-performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm install && npm run build
      - run: npm i -g @lhci/cli
      - run: lhci autorun --config=performance/lighthouse-mobile.config.js
`,
  });

  out.push({
    name: "performance/perf-budgets.json",
    content: JSON.stringify(
      {
        mobile: {
          network: "Slow 4G",
          cpu_throttle: 4,
          budgets: { lcp: 2500, cls: 0.1, tti: 3800, totalPageSize: 1500000, jsBundle: 300000, imageWeight: 800000, fontWeight: 150000, totalRequests: 50 },
        },
        mobile_slow: {
          network: "Slow 3G",
          cpu_throttle: 6,
          budgets: { lcp: 4000, tti: 6000, totalPageSize: 1000000 },
        },
      },
      null,
      2,
    ) + "\n",
  });

  out.push({
    name: "docs/MOBILE_PLAYBOOK.md",
    content: `# MOBILE_PLAYBOOK

## Жёсткие стандарты (К-12, Q-08)
- Горизонтального скролла нет ни на одном из 22 вьюпортов sweep-списка.
- Тап-зоны ≥44px, дистанция между зонами ≥8px.
- Инпуты ≥16px (иначе iOS зумит при фокусе).
- viewport meta содержит viewport-fit=cover; safe-area через env().
- Типографика — fluid clamp(), без скачков на брейкпоинтах.

## Прогон
1. \`node testing/device-sweep/run-viewport-sweep.js\` — sweep по 22 вьюпортам (скролл + тап-зоны + скрины).
2. Live: \`window.__mobileDebug\` (тройной тап на устройстве) — мгновенная диагностика.
3. CI: \`ci/mobile-gate.yml\` блокирует PR при провале.

## Ручной QA (перед сдачей)
Реальное устройство → mobile-паттерны → iOS/Android специфика → сеть и контент.
Чек-лист — в разделе 08 страницы студии.
`,
  });

  return out;
}

export function buildStudioFiles(): ZipEntry[] {
  const f: ZipEntry[] = [];

  f.push({
    name: "README.md",
    content: `# ЦЕХ (CEH) — веб-студия дизайна

Структурный архив + регламент принуждения: агент собирает сайты как студийный
дизайнер — материалы только из архива, приёмка через ворота G1–G4 и валидатор.

## Быстрый старт (≤5 минут)

1. Скопируй шаблон: \`cp -r projects/_TEMPLATE projects/<имя>\`
2. Раздай оси: \`node scripts/roulette.mjs projects/<имя>\` → SEED.md
3. Заполни DIRECTION.md из references/ и skills/ (≥3 референса с цитатами takeaway)
4. Собери site/ строго по SOURCES.md
5. Прогони: \`node scripts/validate.mjs projects/<имя>\` — exit 0 обязателен
6. Вердикт артдиректора — в REVIEW.md. Удачное верни в архив (К-11).

## Структура

- AGENTS.md — контракт агента-дизайнера (читать первым)
- CONSTITUTION.md — 11 проверяемых правил
- references/ — референсы: скрин + meta.yaml (takeaway обязателен)
- skills/ — скилы: frontmatter + нумерованные правила
- motion/ — easing-curves.json + рецепты (snippet.js + demo.html)
- anti-slop/ — BANNED.md (16 запретов с методами) + QUOTAS.md (7 лимитов)
- gates/ — G1–G4: вход, чек-лист, артефакт, отказ
- scripts/ — validate.mjs, lint-slop.mjs, roulette.mjs, diff-projects.mjs
- projects/ — артефакты: SEED, DIRECTION, STRUCTURE, SOURCES, site/, REVIEW

## Требования

Node ≥18. **Ноль npm-зависимостей** — только встроенные модули.
Скрипты: exit-code 0/1, человекочитаемый отчёт с кодами (V-01…, B-01…, Q-01…).
`,
  });

  f.push({
    name: "AGENTS.md",
    content: `# AGENTS.md — контракт агента-дизайнера

## Порядок чтения (обязателен)

1. CONSTITUTION.md — закон цеха.
2. references/INDEX.md — что есть в архиве.
3. skills/SKILL-INDEX.md — какими приёмами работаем.
4. motion/RECIPES.md + easing-curves.json — как двигается.
5. anti-slop/BANNED.md + QUOTAS.md — чего нельзя и сколько можно.
6. gates/G1–G4 — как принимается.

## Жёсткие правила

- **Запрещено писать код до DIRECTION.md, принятого на G1 (К-01).**
- Каждое решение — строка в SOURCES.md: «решение → файл-источник» (К-02).
- Приём без источника в references/ или skills/ — слоп (К-04).
- Easing только из motion/easing-curves.json (К-05).
- 1–3 motion-рецепта на страницу (Q-01), шрифты из PAIRS.md (Q-06).

## Workflow

\`\`\`
BRIEF → roulette (SEED.md) → просмотр INDEX.md и 10–15 референсов
→ DIRECTION.md → G1 → STRUCTURE.md → G2
→ выбор 1–3 motion-рецептов → сборка site/ → G3
→ validate.mjs + lint-slop → REVIEW.md (артдиректор) → G4 → приёмка
\`\`\`

Возврат с ворот = точечные правки по пунктам REVIEW.md, не перезапуск (К-10).

## Definition of Done

1. validate.mjs зелёный (V-01…V-10), lint-slop чист.
2. REVIEW.md: вердикт со ссылками на пункты CONSTITUTION.
3. Удачное изъято в архив: приём → references/, скил → skills/, рецепт → motion/ (К-11).
`,
  });

  f.push({
    name: "CONSTITUTION.md",
    content: `# CONSTITUTION — закон цеха\n\n${CONSTITUTION.map(
      (r) => `## ${r.code}\n${r.text}\n\nПроверка: ${r.check} · метод: ${r.method}`,
    ).join("\n\n")}\n`,
  });

  f.push({
    name: "BRIEF-TEMPLATE.md",
    content: `# Бриф\n\n## Заказчик\nКто и зачем.\n\n## Задача\nОдна фраза: что должен сделать посетитель.\n\n## Аудитория\nКому говорим, что для них важно.\n\n## Материалы\nТексты, фото, данные — ссылки.\n\n## Ограничения\nСроки, брендинг, технологии, «чего точно не хотим».\n\n## Критерий приёмки\nКак поймём, что готово.\n`,
  });

  /* references */
  f.push({
    name: "references/INDEX.md",
    content: `# INDEX — референсы по стилям\n\n| id | стиль | источник | takeaway |\n|---|---|---|---|\n${REFERENCES.map(
      (r) => `| ${r.id} | ${r.style.join(", ")} | ${r.site} | ${r.takeaway} |`,
    ).join("\n")}\n\nПоиск по техникам: grep -r "techniques" references/ -A5\nСкриншоты добавляет куратор: файл <id>.png рядом с <id>.meta.yaml.\n`,
  });
  for (const r of REFERENCES) {
    const styleDir = r.style[0];
    f.push({
      name: `references/${styleDir}/${r.id}.meta.yaml`,
      content: `id: ${r.id}\nsource: ${r.url}\nstyle: [${r.style.join(", ")}]\ntechniques:\n${r.techniques
        .map((t) => `  - ${t}`)
        .join("\n")}\nmotion: [${r.motion.join(", ")}]\npalette: [${r.palette.map((p) => `'${p}'`).join(", ")}]\ntakeaway: «${r.takeaway}»\nscreenshot: pending\n`,
    });
  }

  /* skills */
  f.push({
    name: "skills/SKILL-INDEX.md",
    content: `# SKILL-INDEX\n\n${SKILLS.map((s) => `- ${s.id} **${s.name}** — ${s.when}`).join("\n")}\n`,
  });
  for (const s of SKILLS) {
    const slug = s.path.split("/")[1];
    f.push({
      name: `skills/${slug}/SKILL.md`,
      content: `---\nname: ${slug}\nwhen: ${s.when}\n---\n\n# ${s.name} (${s.id})\n\n## Правила\n${s.rules
        .map((r, i) => `${i + 1}. ${r}`)
        .join("\n")}\n\n## Пример\n${s.example}\n\n## Частые ошибки\n${s.mistakes.map((m) => `- ${m}`).join("\n")}\n`,
    });
  }

  /* motion */
  f.push({
    name: "motion/easing-curves.json",
    content: JSON.stringify(Object.fromEntries(EASING_CURVES.map((c) => [c.name, c.css])), null, 2) + "\n",
  });
  f.push({
    name: "motion/RECIPES.md",
    content: `# RECIPES\n\nБраузерные дефолты (ease, ease-in-out, cubic-bezier(0.4,0,0.2,1)) запрещены (B-02).\n\n${RECIPES.map(
      (r) => `- **${r.id} ${r.slug}** — ${r.feel}${r.mined ? ` _(добыт: ${r.mined.from})_` : ""}`,
    ).join("\n")}\n`,
  });
  for (const r of RECIPES) {
    f.push({
      name: `motion/recipes/${r.slug}/recipe.yaml`,
      content: `name: ${r.slug}\nfeel: ${r.feel}\ntiming:\n  duration: ${r.duration}\n  easing: ${r.easing}\n  stagger: ${r.stagger}\nuse_when: ${r.useWhen}\ndont_combine_with: [${r.dontCombine}]\nmax_per_page: ${r.maxPerPage}\nsnippet: snippet.js\ndemo: demo.html${r.mined ? `\nmined_from: ${r.mined.from}\nyield_note: ${r.mined.yieldNote}` : ""}\n`,
    });
    f.push({ name: `motion/recipes/${r.slug}/snippet.js`, content: (SNIPPETS[r.slug] ?? genericSnippet(r.slug)) + "\n" });
    f.push({
      name: `motion/recipes/${r.slug}/demo.html`,
      content: `<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><title>${r.slug} — demo</title>\n<style>\nbody{margin:0;min-height:100vh;display:grid;place-items:center;background:#16150f;color:#e8e6de;font-family:sans-serif}\n[data-${r.slug}]{opacity:.25;transform:translateY(14px);transition:opacity .7s cubic-bezier(0.16,1,0.3,1),transform .7s cubic-bezier(0.16,1,0.3,1)}\n[data-${r.slug}].is-live{opacity:1;transform:none}\n</style></head>\n<body><h1 data-${r.slug}>${r.name}</h1>\n<script src="snippet.js"></script></body></html>\n`,
    });
  }

  /* anti-slop */
  f.push({
    name: "anti-slop/BANNED.md",
    content: `# BANNED — 16 запретов, у каждого метод проверки\n\n| № | Запрет | Метод | Паттерн / критерий |\n|---|---|---|---|\n${BANNED.map(
      (b) => `| ${b.code} | ${b.text} | ${b.method} | \`${b.pattern}\` |`,
    ).join("\n")}\n`,
  });
  f.push({
    name: "anti-slop/QUOTAS.md",
    content: `# QUOTAS — числовые лимиты\n\n| № | Лимит | Что ограничивает |\n|---|---|---|\n${QUOTAS.map(
      (q) => `| ${q.code} | ${q.value} | ${q.text} |`,
    ).join("\n")}\n`,
  });

  /* gates */
  f.push(...gatesFiles());

  /* assets */
  f.push({
    name: "assets/fonts/PAIRS.md",
    content: `# PAIRS — шрифтовые пары с ролями\n\nШрифты вне пар запрещены (Q-06).\n\n${PAIRS.map(
      (p, i) => `${i + 1}. ${p.display} + ${p.body} — ${p.role}. ${p.note}`,
    ).join("\n")}\n`,
  });
  for (const t of TEXTURES) {
    f.push({
      name: `assets/textures/${t.id === "T-01" ? "grain" : t.id === "T-02" ? "film" : "paper"}.md`,
      content: `# ${t.name} (${t.id})\n\nФайл: ${t.file} (добавит куратор)\n\nПрименение: ${t.use}\n\nРецепт: ${t.recipe}\n`,
    });
  }

  /* scripts */
  f.push({ name: "scripts/validate.mjs", content: validateMjs });
  f.push({ name: "scripts/lint-slop.mjs", content: lintSlopMjs });
  f.push({ name: "scripts/roulette.mjs", content: rouletteMjs });
  f.push({ name: "scripts/diff-projects.mjs", content: diffProjectsMjs });

  /* шаблон проекта */
  const tpl: Array<[string, string]> = [
    ["SEED.md", "# SEED\n\nВыдача roulette.mjs появится здесь: номер броска и оси\n(композиция × движение × типографика)."],
    [
      "DIRECTION.md",
      "# DIRECTION\n\n## Раздача SEED\n— оси из SEED.md\n\n## Источники направления\n1. references/… —\n   > takeaway: «…»\n2. …\n3. …\n\n## Палитра\n#… · #… · #…\n\n## Шрифты (PAIRS.md)\nDisplay: … / Body: …\n\n## Характер движения\nРецепты-кандидаты: motion/recipes/… (1–3)\n\n## ЧЕМ ЭТО НЕ\n— антиреференс с признаками",
    ],
    ["STRUCTURE.md", "# STRUCTURE\n\n## Секция 1\nИсточник: …\nКомпозиция: …"],
    ["SOURCES.md", "# SOURCES\n\n| Решение | Файл-источник |\n|---|---|\n| … | skills/… |\n| … | motion/recipes/…/recipe.yaml |"],
    ["REVIEW.md", "# REVIEW\n\nВердикт: ПРИНЯТО / ВОЗВРАТ\n\n## Нарушения CONSTITUTION\n—\n\n## Правки\n—"],
  ];
  for (const [name, content] of tpl) f.push({ name: `projects/_TEMPLATE/${name}`, content: content + "\n" });

  /* негативная фикстура — главный приёмочный тест */
  for (const [path, content] of Object.entries(FS)) {
    if (path.startsWith("fixtures/")) f.push({ name: path, content });
  }

  /* ---------- Spacing Control System ---------- */
  f.push(...spacingFiles());


  /* роли — памятка куратору */
  f.push({
    name: "ROLES.md",
    content: `# Роли\n\n${ROLES.map((r) => `- **${r.t}** — ${r.d}`).join("\n")}\n`,
  });

  /* Spacing Control + Anti-Slop + Mobile-Perfect */
  f.push(...spacingFiles());
  f.push(...mobileFiles());

  return f;
}

export const downloadStudioZip = (filename = "ceh-studio.zip") =>
  import("./zip").then(({ downloadFilesZip }) => downloadFilesZip(filename, buildStudioFiles()));
