/* ------------------------------------------------------------------ */
/* SpacingOverlay — визуальный дебаггер + автоаудитор отступов.        */
/* Рисует margin / padding / gap прямо поверх страницы и помечает      */
/* всё, что не входит в утверждённую шкалу.                            */
/* ------------------------------------------------------------------ */

import { APPROVED_PX, isApproved, nearestApproved } from "../data/spacing";

export interface SpacingViolation {
  selector: string;
  property: string;
  value: number;
  nearest: number;
}

export interface AuditSummary {
  total: number;
  violations: SpacingViolation[];
  topOffenders: Array<[string, number]>;
  verdict: "clean" | "minor" | "major";
}

const SPACING_PROPS = [
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
] as const;

function selectorOf(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const cls = el.className && typeof el.className === "string" ? `.${el.className.trim().split(/\s+/)[0]}` : "";
  return tag + cls;
}

export class SpacingOverlay {
  private layer: HTMLElement | null = null;
  private enabled = false;
  private show = { margin: true, padding: true, gap: true };
  private raf = 0;
  private onResize = () => this.schedule();

  setVisibility(kind: "margin" | "padding" | "gap", on: boolean): void {
    this.show[kind] = on;
    this.render();
  }

  get enabledState(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled ? this.disable() : this.enable();
    return this.enabled;
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.ensureLayer();
    this.render();
    window.addEventListener("resize", this.onResize);
    window.addEventListener("scroll", this.onScroll, { passive: true });
  }

  disable(): void {
    this.enabled = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("scroll", this.onScroll);
    this.layer?.remove();
    this.layer = null;
  }

  private onScroll = () => this.schedule();

  private schedule(): void {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.render());
  }

  private ensureLayer(): void {
    if (this.layer) return;
    const el = document.createElement("div");
    el.setAttribute("data-spacing-overlay", "");
    el.style.cssText =
      "position:fixed;inset:0;z-index:120;pointer-events:none;overflow:hidden;";
    document.body.appendChild(el);
    this.layer = el;
  }

  /** Отрисовка оверлея для элементов, видимых во вьюпорте */
  render(): void {
    if (!this.enabled || !this.layer) return;
    const layer = this.layer;
    layer.innerHTML = "";

    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const all = document.querySelectorAll<HTMLElement>(
      "body *:not(script):not(style):not([data-spacing-overlay])",
    );

    let drawn = 0;
    const MAX = 140;

    for (const el of all) {
      if (drawn >= MAX) break;
      if (el.closest("[data-spacing-overlay]")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom < -40 || rect.top > vh + 40 || rect.right < -40 || rect.left > vw + 40) continue;

      const cs = window.getComputedStyle(el);

      if (this.show.margin) this.drawSides(el, cs, rect, "margin");
      if (this.show.padding) this.drawSides(el, cs, rect, "padding");
      if (this.show.gap && (cs.display === "flex" || cs.display === "grid")) {
        const gap = parseFloat(cs.rowGap || "0");
        if (gap > 0) this.drawLabel(rect.left, rect.top, `gap ${gap}px`, isApproved(gap), "gap");
      }
      drawn++;
    }
  }

  private drawSides(
    _el: HTMLElement,
    cs: CSSStyleDeclaration,
    rect: DOMRect,
    kind: "margin" | "padding",
  ): void {
    const m = (p: string) => parseFloat(cs.getPropertyValue(p) || "0");
    /* [x, y, w, h, толщина значения] */
    const sides: Array<[number, number, number, number, number]> = [];

    if (kind === "margin") {
      const t = m("margin-top"), b = m("margin-bottom"), l = m("margin-left"), r = m("margin-right");
      if (t > 0) sides.push([rect.left, rect.top - t, rect.width, t, t]);
      if (b > 0) sides.push([rect.left, rect.bottom, rect.width, b, b]);
      if (l > 0) sides.push([rect.left - l, rect.top, l, rect.height, l]);
      if (r > 0) sides.push([rect.right, rect.top, r, rect.height, r]);
    } else {
      const t = m("padding-top"), b = m("padding-bottom"), l = m("padding-left"), r = m("padding-right");
      if (t > 0) sides.push([rect.left, rect.top, rect.width, t, t]);
      if (b > 0) sides.push([rect.left, rect.bottom - b, rect.width, b, b]);
      if (l > 0) sides.push([rect.left, rect.top, l, rect.height, l]);
      if (r > 0) sides.push([rect.right - r, rect.top, r, rect.height, r]);
    }

    const isM = kind === "margin";
    for (const [x, y, w, h, val] of sides) {
      const box = document.createElement("div");
      box.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;
        background:${isM ? "rgba(255,106,43,0.22)" : "rgba(46,125,79,0.18)"};
        outline:1px dashed ${isM ? "rgba(255,106,43,0.7)" : "rgba(46,125,79,0.6)"};`;
      this.layer?.appendChild(box);
      if (!isApproved(val)) {
        this.drawLabel(x + 2, y, `${isM ? "M" : "P"} ${val}px ⚠`, false, kind);
      }
    }
  }

  private drawLabel(x: number, y: number, text: string, valid: boolean, kind: string): void {
    const chip = document.createElement("span");
    const bg = !valid ? "#ce2c18" : kind === "gap" ? "#5c7a99" : "#16150f";
    chip.style.cssText = `position:absolute;left:${Math.max(2, x)}px;top:${Math.max(2, y)}px;
      background:${bg};color:#e8e6de;font:600 9px/1 "JetBrains Mono",monospace;
      letter-spacing:0.04em;padding:3px 5px;border-radius:2px;white-space:nowrap;`;
    chip.textContent = text;
    this.layer?.appendChild(chip);
  }

  /* ---------------- автоаудит ---------------- */

  audit(scope: ParentNode = document): AuditSummary {
    const violations: SpacingViolation[] = [];
    const all = scope.querySelectorAll<HTMLElement>("body *");

    for (const el of all) {
      if (el.closest("[data-spacing-overlay]")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const cs = window.getComputedStyle(el);

      for (const prop of SPACING_PROPS) {
        const val = parseFloat(cs[prop]);
        if (Number.isFinite(val) && val > 0 && !isApproved(val)) {
          violations.push({
            selector: selectorOf(el),
            property: prop,
            value: Math.round(val * 10) / 10,
            nearest: nearestApproved(val),
          });
        }
      }
      if (cs.display === "flex" || cs.display === "grid") {
        for (const g of ["rowGap", "columnGap"] as const) {
          const gv = parseFloat(cs[g]);
          if (Number.isFinite(gv) && gv > 0 && !isApproved(gv)) {
            violations.push({ selector: selectorOf(el), property: g, value: gv, nearest: nearestApproved(gv) });
          }
        }
      }
    }

    /* топ нарушителей: «свойство: значение» × количество */
    const counts = new Map<string, number>();
    for (const v of violations) {
      const key = `${v.property}: ${v.value}px`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const topOffenders = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    const total = violations.length;
    return {
      total,
      violations,
      topOffenders,
      verdict: total === 0 ? "clean" : total < 20 ? "minor" : "major",
    };
  }
}

export { APPROVED_PX };
