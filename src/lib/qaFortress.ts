/* ------------------------------------------------------------------ */
/* QA Fortress — многослойная оборона от ошибок.                       */
/* Живые сканеры: секреты, разметка, ссылки, a11y, bundle-бюджет.      */
/* Ноль зависимостей — чистый DOM + регулярки.                         */
/* ------------------------------------------------------------------ */

export interface Finding {
  sev: "critical" | "warning" | "info";
  code: string;
  msg: string;
  where?: string;
}

export interface Layer {
  code: string;
  name: string;
  tools: string;
  speed: string;
  cost: number;
}

/* 8 слоёв обороны: чем дешевле проверка — тем раньше срабатывает */
export const DEFENSE_LAYERS: Layer[] = [
  { code: "L0", name: "IDE", tools: "ESLint · TS server · Stylelint", speed: "0.1s", cost: 1 },
  { code: "L1", name: "Pre-commit", tools: "gitleaks · lint-staged · prettier", speed: "2–5s", cost: 2 },
  { code: "L2", name: "Pre-push", tools: "tsc --noEmit · vitest · ts-prune", speed: "10–30s", cost: 5 },
  { code: "L3", name: "CI Fast", tools: "lint · build · unit + coverage 80%", speed: "1–3 мин", cost: 10 },
  { code: "L4", name: "CI Medium", tools: "component-тесты · RTL", speed: "3–8 мин", cost: 25 },
  { code: "L5", name: "CI Slow", tools: "E2E ×5 браузеров · axe a11y · ссылки · W3C", speed: "10–20 мин", cost: 50 },
  { code: "L6", name: "Deploy Gate", tools: "npm audit · Snyk · лицензии · Lighthouse ≥95", speed: "перед продом", cost: 75 },
  { code: "L7", name: "Runtime", tools: "Sentry · ErrorBoundary · алерты", speed: "24/7", cost: 100 },
];

/* ---------- сканер секретов ---------- */

export const SECRET_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "AWS Access Key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Private Key", re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: "JWT Token", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_.-]*/ },
  { name: "Slack Token", re: /xox[baprs]-[0-9a-zA-Z]{10,48}/ },
  { name: "Hardcoded Password", re: /password['":\s=]+['"][^'"]{6,}['"]/i },
  { name: "Generic API Key", re: /api[_-]?key['":\s=]+['"][0-9a-zA-Z]{20,}['"]/i },
  { name: "DB Connection", re: /\b(mongodb|postgres|mysql):\/\/[^\s'"]+/i },
];

export function scanSecrets(files: Array<[string, string]>, includeFixtures = false): Finding[] {
  const out: Finding[] = [];
  for (const [path, content] of files) {
    if (!includeFixtures && (path.includes(".example") || path.includes("/fixtures/"))) continue;
    for (const p of SECRET_PATTERNS) {
      if (p.re.test(content)) {
        out.push({ sev: "critical", code: "SEC-01", msg: `паттерн «${p.name}»`, where: path });
      }
    }
  }
  return out;
}

/* ---------- сканер разметки фикстуры ---------- */

export function scanFixtureMarkup(html: string, path: string): Finding[] {
  const out: Finding[] = [];
  if (!/<html[^>]*\slang=/i.test(html)) {
    out.push({ sev: "warning", code: "MKP-01", msg: "нет атрибута lang у <html>", where: path });
  }
  const empties = (html.match(/href="#"/g) ?? []).length;
  if (empties > 0) {
    out.push({ sev: "critical", code: "LNK-01", msg: `пустых ссылок href="#": ${empties}`, where: path });
  }
  const imgsNoAlt = (html.match(/<img(?![^>]*\salt=)[^>]*>/gi) ?? []).length;
  if (imgsNoAlt > 0) {
    out.push({ sev: "warning", code: "A11Y-01", msg: `изображений без alt: ${imgsNoAlt}`, where: path });
  }
  /* грубая проверка парности ключевых тегов */
  for (const tag of ["div", "section", "header", "footer", "main"]) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, "gi")) ?? []).length;
    const close = (html.match(new RegExp(`</${tag}>`, "gi")) ?? []).length;
    if (open !== close) {
      out.push({ sev: "critical", code: "MKP-02", msg: `непарный тег <${tag}>: ${open} откр. / ${close} закр.`, where: path });
    }
  }
  const ids = html.match(/\sid="([^"]+)"/g)?.map((s) => s.slice(4, -1)) ?? [];
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) {
    out.push({ sev: "warning", code: "MKP-03", msg: `дубли id: ${[...new Set(dupes)].join(", ")}`, where: path });
  }
  return out;
}

/* ---------- живые ссылки на странице ---------- */

export function scanLiveLinks(): Finding[] {
  const out: Finding[] = [];
  let internal = 0;
  let external = 0;
  for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
    const href = a.getAttribute("href") ?? "";
    if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      external++;
      continue;
    }
    if (href.startsWith("#") && href.length > 1) {
      internal++;
      const target = document.getElementById(href.slice(1));
      if (!target) {
        out.push({ sev: "critical", code: "LNK-02", msg: `якорь ${href} не имеет цели`, where: a.textContent?.trim().slice(0, 24) || "(без текста)" });
      }
    } else if (href === "#" || href === "") {
      out.push({ sev: "critical", code: "LNK-01", msg: "пустая ссылка href=\"#\"", where: a.textContent?.trim().slice(0, 24) || "(без текста)" });
    }
  }
  out.push({ sev: "info", code: "LNK-OK", msg: `внутренних якорей: ${internal}, внешних: ${external}` });
  return out;
}

/* ---------- живой a11y-аудит DOM ---------- */

function accessibleName(el: Element): boolean {
  return Boolean(
    el.textContent?.trim() ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.getAttribute("title"),
  );
}

export function scanLiveA11y(): Finding[] {
  const out: Finding[] = [];
  const visible = (el: Element) => {
    const he = el as HTMLElement;
    return he.offsetParent !== null || he.getClientRects().length > 0;
  };

  /* изображения без alt */
  for (const img of Array.from(document.querySelectorAll("img"))) {
    if (!img.hasAttribute("alt")) {
      out.push({ sev: "warning", code: "A11Y-01", msg: "изображение без alt", where: img.getAttribute("src")?.slice(0, 40) });
    }
  }
  /* интерактивные без имени */
  for (const el of Array.from(document.querySelectorAll("button, a[href], [role='button']"))) {
    if (!visible(el)) continue;
    if (!accessibleName(el)) {
      out.push({ sev: "critical", code: "A11Y-02", msg: `${el.tagName.toLowerCase()} без доступного имени` });
    }
  }
  /* поля без label */
  for (const el of Array.from(document.querySelectorAll("input, select, textarea"))) {
    if (!visible(el)) continue;
    if (el.getAttribute("type") === "hidden") continue;
    const id = el.id;
    const hasLabel = (id && document.querySelector(`label[for="${id}"]`)) ||
      el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") ||
      el.closest("label");
    if (!hasLabel) {
      out.push({ sev: "warning", code: "A11Y-03", msg: "поле без label / aria-label", where: id || el.getAttribute("name") || el.getAttribute("type") || undefined });
    }
  }
  /* дубли id */
  const ids = Array.from(document.querySelectorAll("[id]")).map((e) => e.id);
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dupes.length) {
    out.push({ sev: "warning", code: "A11Y-04", msg: `дубли id: ${dupes.slice(0, 3).join(", ")}` });
  }
  return out;
}

/* ---------- живой bundle-бюджет ---------- */

export interface BundleReport {
  totalKb: number;
  jsKb: number;
  cssKb: number;
  fontKb: number;
  imgKb: number;
  pageBudgetKb: number;
  jsBudgetKb: number;
  pageOk: boolean;
  jsOk: boolean;
}

export function scanLiveBundle(): BundleReport {
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  let js = 0, css = 0, font = 0, img = 0;
  for (const e of entries) {
    const size = e.transferSize || e.encodedBodySize || 0;
    if (/\.js(\?|$)/.test(e.name) || e.initiatorType === "script") js += size;
    else if (/\.css(\?|$)/.test(e.name) || e.initiatorType === "link" || e.initiatorType === "css") css += size;
    else if (/\.(woff2?|ttf|otf)(\?|$)/.test(e.name)) font += size;
    else if (/\.(png|jpe?g|webp|avif|svg|gif)(\?|$)/.test(e.name) || e.initiatorType === "img") img += size;
  }
  const kb = (n: number) => Math.round(n / 1024);
  const totalKb = kb(js + css + font + img);
  const jsKb = kb(js);
  const pageBudgetKb = 1500;
  const jsBudgetKb = 300;
  return {
    totalKb, jsKb, cssKb: kb(css), fontKb: kb(font), imgKb: kb(img),
    pageBudgetKb, jsBudgetKb,
    pageOk: totalKb <= pageBudgetKb,
    jsOk: jsKb <= jsBudgetKb,
  };
}
