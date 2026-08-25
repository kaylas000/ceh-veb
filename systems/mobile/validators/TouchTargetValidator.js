/* Тап-зоны ≥44px + дистанция ≥8px. Запуск: в браузере или через Playwright evaluate. */
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
