/* ------------------------------------------------------------------ */
/* Живой аудит мобильной адаптации по текущему DOM:                    */
/* тап-зоны ≥44px, горизонтальный скролл (+ виновники),                */
/* инпуты ≥16px (защита от iOS-зума), viewport meta.                   */
/* ------------------------------------------------------------------ */

import { TOUCH_MIN, INPUT_FONT_MIN } from "../data/mobile";

export interface TouchViolation {
  selector: string;
  size: string;
}

export interface ScrollCulprit {
  selector: string;
  overflow: number;
}

const INTERACTIVE = "button, a[href], input, select, textarea, [role='button'], [tabindex]";

function selectorOf(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls =
    typeof el.className === "string" && el.className.trim()
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
      : "";
  return `${tag}${id}${cls}`;
}

export function auditTouchTargets(): { total: number; violations: TouchViolation[] } {
  const violations: TouchViolation[] = [];
  let total = 0;
  for (const el of Array.from(document.querySelectorAll(INTERACTIVE))) {
    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.bottom < 0 || r.top > window.innerHeight) continue; /* только видимые */
    total++;
    if (r.width < TOUCH_MIN || r.height < TOUCH_MIN) {
      violations.push({ selector: selectorOf(el), size: `${Math.round(r.width)}×${Math.round(r.height)}` });
    }
  }
  return { total, violations };
}

/* элемент внутри контейнера с overflow (marquee, конвейер, таблицы, терминал) —
   он намеренно ограничен, не считаем его виновником перелива страницы */
function inOverflowContainer(el: Element): boolean {
  let p = el.parentElement;
  while (p && p !== document.body) {
    const ox = window.getComputedStyle(p).overflowX;
    if (ox === "hidden" || ox === "auto" || ox === "scroll" || ox === "clip") return true;
    p = p.parentElement;
  }
  return false;
}

export function detectHorizontalScroll(): {
  hasIssue: boolean;
  overflowPx: number;
  culprits: ScrollCulprit[];
} {
  const docW = document.documentElement.clientWidth;
  const scrollW = document.documentElement.scrollWidth;
  const culprits: ScrollCulprit[] = [];
  /* сканируем ВСЕ видимые элементы: ловим и скролл, и обрезанный (clip) перелив */
  for (const el of Array.from(document.querySelectorAll("body *"))) {
    const cs = window.getComputedStyle(el);
    if (cs.position === "fixed") continue; /* noise, виньетка, шапка */
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.bottom < 0 || r.top > window.innerHeight) continue; /* только во вьюпорте */
    if (inOverflowContainer(el)) continue;
    if (r.right > docW + 1) {
      culprits.push({ selector: selectorOf(el), overflow: Math.round(r.right - docW) });
    }
  }
  culprits.sort((a, b) => b.overflow - a.overflow);
  const hasIssue = scrollW > docW || culprits.length > 0;
  return { hasIssue, overflowPx: Math.max(scrollW - docW, culprits[0]?.overflow ?? 0), culprits: culprits.slice(0, 6) };
}

export function auditInputFonts(): { total: number; tooSmall: number } {
  let total = 0;
  let tooSmall = 0;
  for (const el of Array.from(document.querySelectorAll("input, select, textarea"))) {
    total++;
    const fs = parseFloat(window.getComputedStyle(el).fontSize);
    if (fs < INPUT_FONT_MIN) tooSmall++;
  }
  return { total, tooSmall };
}

export function checkViewportMeta(): { pass: boolean; content: string } {
  const meta = document.querySelector('meta[name="viewport"]');
  const content = meta?.getAttribute("content") ?? "";
  return {
    pass: content.includes("width=device-width") && content.includes("viewport-fit=cover"),
    content: content || "мета-тег отсутствует",
  };
}

export interface MobileAuditResult {
  touch: ReturnType<typeof auditTouchTargets>;
  scroll: ReturnType<typeof detectHorizontalScroll>;
  fonts: ReturnType<typeof auditInputFonts>;
  viewport: ReturnType<typeof checkViewportMeta>;
  touchDevice: boolean;
}

export function runMobileAudit(): MobileAuditResult {
  return {
    touch: auditTouchTargets(),
    scroll: detectHorizontalScroll(),
    fonts: auditInputFonts(),
    viewport: checkViewportMeta(),
    touchDevice: window.matchMedia("(pointer: coarse)").matches,
  };
}
