import type { FS } from "../data/fs";
import { APPROVED_PX } from "../data/spacing";
import { SECRET_PATTERNS } from "./qaFortress";

/* ------------------------------------------------------------------ */
/* validate.mjs (in-browser port) — проверки V-01…V-10                 */
/* детерминирован, exit-code 0/1, человекочитаемый отчёт               */
/* ------------------------------------------------------------------ */

export type Status = "OK" | "FAIL";

export interface CheckRow {
  code: string;
  title: string;
  status: Status;
  detail: string;
  evidence: string[];
}

export interface Report {
  root: string;
  rows: CheckRow[];
  ok: number;
  total: number;
  exitCode: 0 | 1;
  violationCodes: string[];
}

const GENERIC_FAMILIES = new Set([
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "inherit",
]);

function siteEntries(fs: FS, root: string): Array<[string, string]> {
  const prefix = root + "/site/";
  return Object.entries(fs)
    .filter(([p]) => p.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b));
}

function lineHits(content: string, re: RegExp): Array<{ n: number; text: string }> {
  const out: Array<{ n: number; text: string }> = [];
  content.split("\n").forEach((line, i) => {
    if (re.test(line)) out.push({ n: i + 1, text: line.trim().slice(0, 72) });
  });
  return out;
}

function parseFamilies(fs: FS, root: string): Set<string> {
  const fams = new Set<string>();
  for (const [, content] of siteEntries(fs, root)) {
    const re = /font-family:\s*([^;}{]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      m[1]
        .split(",")
        .map((s) => s.trim().replace(/['"]/g, ""))
        .filter((s) => s && !GENERIC_FAMILIES.has(s))
        .forEach((s) => fams.add(s));
    }
  }
  return fams;
}

function pairFamilies(fs: FS): Set<string> {
  const fams = new Set<string>();
  const pairs = fs["assets/fonts/PAIRS.md"] ?? "";
  const re = /^\d+\.\s+(.+?)\s*\+\s*(.+?)\s*—/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pairs)) !== null) {
    fams.add(m[1].trim());
    fams.add(m[2].trim());
  }
  return fams;
}

/* ---------------- lint-slop: запреты B-01…B-16 ---------------- */

export interface Violation {
  code: string;
  file: string;
  line: number;
  snippet: string;
}

const LINE_RULES: Array<{ code: string; re: RegExp }> = [
  { code: "B-01", re: /transition\s*:\s*all/i },
  { code: "B-02", re: /ease-in-out|ease-in\b|ease-out\b|cubic-bezier\(\s*0?\.4\s*,\s*0\s*,\s*0?\.2\s*,\s*1\s*\)|(?<![\w.])ease(?![-\w])/i },
  { code: "B-05", re: /#6366f1|#8b5cf6|#a855f7/i },
  { code: "B-06", re: /background-clip\s*:\s*text/i },
  { code: "B-07", re: /backdrop-filter/i },
  { code: "B-09", re: /lorem ipsum/i },
  { code: "B-10", re: /rounded-2xl|border-radius\s*:\s*16px/i },
  { code: "B-11", re: /<h[1-3][^>]*>[^<]*[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u },
  { code: "B-13", re: /blur-3xl|blur\(\s*8\d\s*px\s*\)/i },
  { code: "B-14", re: /нам доверяют|trusted by/i },
  { code: "B-15", re: /\d{3,}\+\s*(клиент|проект|компани)/i },
  { code: "B-12", re: /узнать больше|свяжитесь с нами/i },
];

export function lintSlop(fs: FS, root: string): Violation[] {
  const out: Violation[] = [];
  const entries = siteEntries(fs, root);
  const families = parseFamilies(fs, root);

  for (const [path, content] of entries) {
    const short = path.slice(root.length + 1);
    for (const rule of LINE_RULES) {
      for (const hit of lineHits(content, rule.re)) {
        out.push({ code: rule.code, file: short, line: hit.n, snippet: hit.text });
      }
    }
    if (/\.html$/.test(path)) {
      const btns = (content.match(/class="[^"]*btn/g) ?? []).length;
      const h1 = lineHits(content, /<h1/i)[0];
      if (/text-center/i.test(content) && h1 && btns >= 2) {
        out.push({ code: "B-03", file: short, line: h1.n, snippet: "hero: text-center + h1 + две кнопки" });
      }
      const cards = (content.match(/class="card"/g) ?? []).length;
      const grid3 = lineHits(content, /grid-cols-3/i)[0];
      if (grid3 && cards >= 3) {
        out.push({ code: "B-04", file: short, line: grid3.n, snippet: `grid-cols-3 + ${cards} одинаковые .card` });
      }
      const py = (content.match(/py-24/g) ?? []).length;
      if (py >= 4) {
        out.push({ code: "B-16", file: short, line: 1, snippet: `py-24 ×${py}: одинаковый ритм секций` });
      }
    }
  }

  if (families.size === 1) {
    const only = [...families][0];
    out.push({ code: "B-08", file: "site/*", line: 0, snippet: `единственный шрифт «${only}» без пары из PAIRS.md` });
  }
  return out;
}

/* ---------------- основной прогон V-01…V-10 ---------------- */

export function validate(fs: FS, root: string): Report {
  const rows: CheckRow[] = [];
  const read = (p: string) => fs[`${root}/${p}`];

  const direction = read("DIRECTION.md");
  const sources = read("SOURCES.md");
  const structure = read("STRUCTURE.md");
  const seed = read("SEED.md");
  const review = read("REVIEW.md");

  /* V-01 */
  {
    const refs = direction ? (direction.match(/references\/[\w-]+\/REF-\d{2}\.meta\.yaml/g) ?? []) : [];
    const takeaways = direction ? (direction.match(/takeaway/gi) ?? []) : [];
    const anti = direction ? /ЧЕМ ЭТО НЕ/i.test(direction) : false;
    const ok = !!direction && refs.length >= 3 && takeaways.length >= 3 && anti;
    rows.push({
      code: "V-01",
      title: "DIRECTION: референсы и цитаты",
      status: !direction ? "FAIL" : ok ? "OK" : "FAIL",
      detail: !direction
        ? "DIRECTION.md не найден"
        : `ссылок на references/: ${refs.length} (нужно ≥3); цитат takeaway: ${takeaways.length} (нужно ≥3); раздел «ЧЕМ ЭТО НЕ»: ${anti ? "есть" : "нет"}`,
      evidence: !direction ? ["артефакт отсутствует — код до направления запрещён (К-01)"] : [],
    });
  }

  /* V-02 */
  {
    const paths = sources
      ? [...new Set(sources.match(/(?:references|skills|motion|assets)\/[\w./-]+\.[a-z]{2,4}/g) ?? [])]
      : [];
    const missing = paths.filter((p) => !(p in fs));
    rows.push({
      code: "V-02",
      title: "SOURCES: пути существуют на диске",
      status: !sources ? "FAIL" : missing.length === 0 && paths.length > 0 ? "OK" : "FAIL",
      detail: !sources
        ? "SOURCES.md не найден"
        : missing.length === 0
          ? `все ${paths.length} путей-источников на месте`
          : `не найдено ${missing.length} из ${paths.length} путей`,
      evidence: !sources ? ["артефакт отсутствует"] : missing.map((p) => `отсутствует: ${p}`),
    });
  }

  /* V-03 */
  {
    const recipes = sources ? (sources.match(/motion\/recipes\//g) ?? []).length : 0;
    const skills = sources ? (sources.match(/skills\//g) ?? []).length : 0;
    rows.push({
      code: "V-03",
      title: "SOURCES: ≥2 рецептов и ≥1 скила",
      status: recipes >= 2 && skills >= 1 ? "OK" : "FAIL",
      detail: `motion-рецептов: ${recipes} (нужно ≥2); скилов: ${skills} (нужно ≥1)`,
      evidence: [],
    });
  }

  /* V-04 — lint-slop */
  const violations = lintSlop(fs, root);
  {
    const codes = [...new Set(violations.map((v) => v.code))].sort();
    rows.push({
      code: "V-04",
      title: "site/ чист от паттернов BANNED",
      status: violations.length === 0 ? "OK" : "FAIL",
      detail:
        violations.length === 0
          ? "нарушений B-01…B-16 не найдено"
          : `нарушений: ${violations.length}, кодов: ${codes.length} (${codes.join(", ")})`,
      evidence: violations.slice(0, 14).map((v) => `${v.file}${v.line ? ":" + v.line : ""} ${v.code} «${v.snippet}»`),
    });
  }

  /* V-05 — квоты */
  {
    const ev: string[] = [];
    let allOk = true;
    const mark = (ok: boolean, s: string) => {
      ev.push(`${ok ? "·" : "×"} ${s}`);
      if (!ok) allOk = false;
    };

    const slugs = [
      ...new Set(
        sources
          ?.match(/motion\/recipes\/([\w-]+)\//g)
          ?.map((s) => s.replace(/motion\/recipes\/|\/$/g, "")) ?? [],
      ),
    ];
    mark(slugs.length >= 1 && slugs.length <= 3, `Q-01 рецептов на страницу: ${slugs.length} (лимит 1–3)${slugs.length ? " [" + slugs.join(", ") + "]" : ""}`);

    const reveals = sources ? (sources.match(/reveal/gi) ?? []).length : 0;
    const sections = structure ? (structure.match(/^## /gm) ?? []).length : 0;
    mark(reveals <= sections, `Q-02 reveal-приёмов: ${reveals} при ${sections} секциях (≤1 на секцию)`);

    const asym = /асимметр/i.test(`${structure ?? ""} ${sources ?? ""} ${direction ?? ""}`);
    mark(asym, `Q-03 асимметричная композиция: ${asym ? "зафиксирована" : "не найдена"} (нужно ≥1)`);

    const vw = siteEntries(fs, root).some(([, c]) => /font-size:\s*(8|9|1[0-2])vw/.test(c));
    mark(vw, `Q-04 заголовок ≥8vw: ${vw ? "есть" : "не найден"}`);

    const grain = siteEntries(fs, root).some(([, c]) => /grain/i.test(c));
    mark(grain, `Q-05 текстура из assets/: ${grain ? "подключена" : "нет"}`);

    const fams = parseFamilies(fs, root);
    const allowed = pairFamilies(fs);
    const outside = [...fams].filter((f) => !allowed.has(f));
    mark(outside.length === 0 && fams.size > 0, `Q-06 шрифты из PAIRS.md: ${fams.size ? [...fams].join(", ") : "не заданы"}${outside.length ? ` — вне пар: ${outside.join(", ")}` : ""}`);

    ev.push("· Q-07 акцентные цвета ≤2 — проверяет арт-директор (вне машинного контура)");
    rows.push({
      code: "V-05",
      title: "Квоты Q-01…Q-07",
      status: allOk && sources ? "OK" : "FAIL",
      detail: allOk && sources ? "все машинные квоты соблюдены" : "есть превышения или нет SOURCES.md",
      evidence: ev,
    });
  }

  /* V-06 — easing */
  {
    let curves: Record<string, string> = {};
    try {
      curves = JSON.parse(fs["motion/easing-curves.json"] ?? "{}") as Record<string, string>;
    } catch {
      curves = {};
    }
    const allowed = new Set(Object.values(curves).map((c) => c.replace(/\s+/g, "")));
    const ev: string[] = [];
    let bad = 0;
    for (const [path, content] of siteEntries(fs, root)) {
      const short = path.slice(root.length + 1);
      const re = /cubic-bezier\(([^)]+)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const norm = `cubic-bezier(${m[1].replace(/\s+/g, "")})`;
        if (!allowed.has(norm)) {
          bad++;
          ev.push(`${short} кривая вне easing-curves.json: cubic-bezier(${m[1]})`);
        }
      }
      for (const hit of lineHits(content, /(transition|animation)[^;{]*(ease-in|ease-out|(?<![\w.])ease(?![-\w])|(?<![\w-])linear(?![-\w]))/i)) {
        bad++;
        ev.push(`${short}:${hit.n} дефолтный easing «${hit.text}»`);
      }
    }
    rows.push({
      code: "V-06",
      title: "Easing из easing-curves.json",
      status: bad === 0 ? "OK" : "FAIL",
      detail: bad === 0 ? `все кривые сверены с easing-curves.json (${allowed.size} именованных)` : `кривых вне реестра: ${bad}`,
      evidence: ev.slice(0, 8),
    });
  }

  /* V-07 — SEED и оси */
  {
    const axes: string[] = [];
    if (seed) {
      for (const key of ["Композиция", "Движение", "Типографика"]) {
        const m = seed.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
        if (m) axes.push(m[1].trim());
      }
    }
    const reflected = axes.filter((a) => direction?.includes(a));
    const ok = !!seed && axes.length === 3 && reflected.length === 3;
    rows.push({
      code: "V-07",
      title: "SEED существует, оси отражены",
      status: ok ? "OK" : "FAIL",
      detail: !seed
        ? "SEED.md не найден — бросок roulette.mjs не зафиксирован"
        : `осей в SEED: ${axes.length}; отражено в DIRECTION: ${reflected.length} из ${axes.length}`,
      evidence: ok ? [] : axes.filter((a) => !direction?.includes(a)).map((a) => `ось не отражена: ${a}`),
    });
  }

  /* V-08 — REVIEW */
  {
    const verdict = review ? /вердикт[:\s—]*(принято|возврат)/i.test(review) : false;
    const cites = review ? (review.match(/[КBQ]-\d{2}/g) ?? []) : [];
    const ok = verdict && cites.length >= 2;
    rows.push({
      code: "V-08",
      title: "REVIEW: вердикт со ссылками на правила",
      status: ok ? "OK" : "FAIL",
      detail: !review
        ? "REVIEW.md не найден"
        : `вердикт: ${verdict ? "есть" : "не читается"}; ссылок на правила: ${cites.length} (нужно ≥2)`,
      evidence: [],
    });
  }

  /* V-09 — diff-projects */
  {
    const manifests = Object.entries(fs)
      .filter(([p]) => p.startsWith("projects/_history/") && p.endsWith(".manifest.md"))
      .map(([p, c]) => ({ p, c }));
    if (!structure) {
      rows.push({
        code: "V-09",
        title: "Сходство с последними 3 проектами ≤10%",
        status: "FAIL",
        detail: "нет STRUCTURE.md — сравнивать не с чем",
        evidence: [],
      });
    } else {
      const sec = (structure.match(/^## (.+)$/gm) ?? []).map((s) => s.replace(/^## /, "").trim().toLowerCase());
      const pal = [...new Set((direction ?? "").match(/#[0-9a-fA-F]{6}/g) ?? [])].map((s) => s.toLowerCase());
      const jacc = (a: string[], b: string[]) => {
        const sa = new Set(a);
        const sb = new Set(b);
        const inter = [...sa].filter((x) => sb.has(x)).length;
        const uni = new Set([...sa, ...sb]).size;
        return uni === 0 ? 0 : inter / uni;
      };
      let worst = 0;
      let worstP = "";
      for (const { p, c } of manifests) {
        const ms = (c.match(/^Секции:\s*(.+)$/m)?.[1] ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        const mp = (c.match(/^Палитра:\s*(.+)$/m)?.[1] ?? "").match(/#[0-9a-fA-F]{6}/g)?.map((s) => s.toLowerCase()) ?? [];
        const sim = 0.6 * jacc(sec, ms) + 0.4 * jacc(pal, mp);
        if (sim > worst) {
          worst = sim;
          worstP = p;
        }
      }
      const pct = Math.round(worst * 100);
      rows.push({
        code: "V-09",
        title: "Сходство с последними 3 проектами ≤10%",
        status: pct <= 10 ? "OK" : "FAIL",
        detail: `максимальное сходство: ${pct}% (${worstP || "история пуста"})`,
        evidence: manifests.map(({ p }) => `сравнено с ${p}`),
      });
    }
  }

  /* V-10 — полнота meta.yaml */
  {
    const cited = [...new Set(`${direction ?? ""} ${sources ?? ""}`.match(/REF-\d{2}/g) ?? [])];
    const ev: string[] = [];
    let bad = 0;
    if (cited.length === 0) {
      bad = 1;
      ev.push("в DIRECTION/SOURCES нет ни одного REF-XX");
    }
    for (const id of cited) {
      const path = Object.keys(fs).find((k) => k.endsWith(`/${id}.meta.yaml`));
      if (!path) {
        bad++;
        ev.push(`${id}: meta.yaml не найден в references/`);
        continue;
      }
      const c = fs[path];
      const techBlock = c.split(/^techniques:/m)[1]?.split(/^[a-z_]+:/m)[0] ?? "";
      const techs = (techBlock.match(/^\s+-\s+/gm) ?? []).length;
      const pals = (c.match(/#[0-9a-fA-F]{6}/g) ?? []).length;
      const take = /takeaway:\s*\S+/.test(c);
      const has = (k: string) => new RegExp(`^${k}:`, "m").test(c);
      const problems: string[] = [];
      if (!has("id")) problems.push("нет id");
      if (!has("source")) problems.push("нет source");
      if (!has("style")) problems.push("нет style");
      if (techs < 3) problems.push(`techniques: ${techs} (<3)`);
      if (pals < 3) problems.push(`palette: ${pals} (<3)`);
      if (!take) problems.push("пустой takeaway");
      if (problems.length) {
        bad++;
        ev.push(`${id}: ${problems.join("; ")}`);
      } else {
        ev.push(`${id}: схема валидна (techniques ${techs}, palette ${pals})`);
      }
    }
    rows.push({
      code: "V-10",
      title: "meta.yaml использованных референсов полны",
      status: bad === 0 ? "OK" : "FAIL",
      detail: `использовано референсов: ${cited.length}; дефектных meta: ${bad}`,
      evidence: ev,
    });
  }

  /* V-11 — Spacing Control: отступы в site/ лежат в утверждённой шкале.
     1px разрешён как hairline (границы/разделители), 0 — тривиально. */
  {
    const approved = new Set([...APPROVED_PX, 1]);
    /* только свойства ритма (margin, padding, gap и их варианты); позиционные top/left не проверяем */
    const SPACING_DECL = /((?:margin|padding)(?:-(?:top|bottom|left|right|inline|block))?|(?:row-|column-)?gap)\s*:\s*([^;}]+)/gi;
    const ev: string[] = [];
    let bad = 0;
    for (const [path, content] of siteEntries(fs, root)) {
      const short = path.slice(root.length + 1);
      let m: RegExpExecArray | null;
      SPACING_DECL.lastIndex = 0;
      while ((m = SPACING_DECL.exec(content)) !== null) {
        const pxValues = m[2].match(/(-?\d+(?:\.\d+)?)px/g) ?? [];
        for (const pv of pxValues) {
          const px = Math.abs(parseFloat(pv));
          if (!approved.has(Math.round(px))) {
            bad++;
            if (ev.length < 6) ev.push(`${short}: ${m[1]}: ${pv} — вне шкалы`);
          }
        }
      }
    }
    rows.push({
      code: "V-11",
      title: "Spacing Control: отступы в шкале",
      status: bad === 0 ? "OK" : "FAIL",
      detail: bad === 0 ? "все px-отступы (margin/padding/gap) из утверждённой шкалы" : `значений вне шкалы: ${bad}`,
      evidence: bad > 6 ? [...ev, `…и ещё ${bad - 6}`] : ev,
    });
  }

  /* V-12 — Mobile-Perfect: viewport-fit=cover и инпуты ≥16px в site/ */
  {
    const ev: string[] = [];
    let bad = 0;
    const entries = siteEntries(fs, root);
    const htmlEntry = entries.find(([p]) => p.endsWith(".html"));
    if (!htmlEntry) {
      bad++;
      ev.push("нет index.html — проверять нечего");
    } else {
      const vp = /name="viewport"[^>]*content="([^"]*)"/i.exec(htmlEntry[1])?.[1] ?? "";
      if (!vp.includes("viewport-fit=cover")) {
        bad++;
        ev.push("viewport meta без viewport-fit=cover — safe-area не сработает");
      }
    }
    for (const [p, c] of entries) {
      if (!p.endsWith(".css")) continue;
      const short = p.slice(root.length + 1);
      for (const m of c.matchAll(/(?:input|select|textarea)[^{]*\{[^}]*font-size:\s*(\d+(?:\.\d+)?)px/gi)) {
        if (parseFloat(m[1]) < 16) {
          bad++;
          ev.push(`${short}: input font-size ${m[1]}px < 16 (iOS-зум)`);
        }
      }
    }
    rows.push({
      code: "V-12",
      title: "Mobile: viewport-fit и инпуты ≥16px",
      status: bad === 0 ? "OK" : "FAIL",
      detail: bad === 0 ? "viewport-fit=cover на месте, инпуты ≥16px" : `нарушений: ${bad}`,
      evidence: ev,
    });
  }

  /* V-13 — SEO-by-Default: title, description, один h1, lang, canonical */
  {
    const ev: string[] = [];
    let bad = 0;
    const htmlEntry = siteEntries(fs, root).find(([p]) => p.endsWith(".html"));
    if (!htmlEntry) {
      bad++;
      ev.push("нет index.html — проверять нечего");
    } else {
      const html = htmlEntry[1];
      if (!/<title>[^<]+<\/title>/i.test(html)) {
        bad++;
        ev.push("отсутствует <title>");
      }
      if (!/<meta[^>]*name=["']description["']/i.test(html)) {
        bad++;
        ev.push("отсутствует meta description");
      }
      if (!/<link[^>]*rel=["']canonical["']/i.test(html)) {
        bad++;
        ev.push("отсутствует canonical");
      }
      if (!/<html[^>]*lang=["'][a-z]{2}/i.test(html)) {
        bad++;
        ev.push("отсутствует атрибут lang");
      }
      const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
      if (h1Count === 0) {
        bad++;
        ev.push("нет ни одного h1");
      } else if (h1Count > 1) {
        bad++;
        ev.push(`несколько h1: ${h1Count} (разрешён один)`);
      }
    }
    rows.push({
      code: "V-13",
      title: "SEO: title, description, h1, lang, canonical",
      status: bad === 0 ? "OK" : "FAIL",
      detail: bad === 0 ? "SEO-база на месте: title, description, 1×h1, lang, canonical" : `нарушений: ${bad}`,
      evidence: ev,
    });
  }

  /* V-14 — QA Fortress: секреты и пустые ссылки в site/ */
  {
    const ev: string[] = [];
    let bad = 0;
    for (const [p, c] of siteEntries(fs, root)) {
      const short = p.slice(root.length + 1);
      for (const sp of SECRET_PATTERNS) {
        if (sp.re.test(c)) {
          bad++;
          ev.push(`${short}: секрет «${sp.name}»`);
        }
      }
      const empties = (c.match(/href="#"/g) ?? []).length;
      if (empties > 0) {
        bad++;
        ev.push(`${short}: пустых ссылок href="#": ${empties}`);
      }
    }
    rows.push({
      code: "V-14",
      title: "QA: секреты и пустые ссылки",
      status: bad === 0 ? "OK" : "FAIL",
      detail: bad === 0 ? "чисто: нет секретов и битых ссылок" : `нарушений: ${bad}`,
      evidence: ev.slice(0, 6),
    });
  }

  const okCount = rows.filter((r) => r.status === "OK").length;
  const violationCodes = [...new Set(violations.map((v) => v.code))].sort();
  return {
    root,
    rows,
    ok: okCount,
    total: rows.length,
    exitCode: okCount === rows.length ? 0 : 1,
    violationCodes,
  };
}
