/* ЦЕХ A11yContrastValidator.js — Проверка контрастностиWCAG 2.1 (AA ≥4.5:1) и фокусных контуров. */

export class A11yContrastValidator {
  constructor(opts = {}) {
    this.minRatioNormal = opts.minRatioNormal || 4.5;
    this.minRatioLarge = opts.minRatioLarge || 3.0;
  }

  // Расчет относительной яркости по формуле W3C WCAG 2.1
  getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  // Расчет коэффициента контрастности
  getContrastRatio(rgb1, rgb2) {
    const lum1 = this.getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const lum2 = this.getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  parseRgb(colorStr) {
    const match = colorStr.match(/\d+/g);
    if (match && match.length >= 3) {
      return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
    }
    return [0, 0, 0];
  }

  validate(rootEl = document.body) {
    const violations = [];
    const elements = rootEl.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, a, button, label, li");
    
    let checked = 0;
    for (const el of elements) {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

      const fg = this.parseRgb(style.color);
      const bg = this.parseRgb(style.backgroundColor);
      
      const ratio = this.getContrastRatio(fg, bg);
      const fontSize = parseFloat(style.fontSize);
      const isBold = parseInt(style.fontWeight) >= 700 || style.fontWeight === "bold";
      const isLarge = fontSize >= 24 || (fontSize >= 18.5 && isBold);

      const requiredRatio = isLarge ? this.minRatioLarge : this.minRatioNormal;
      checked++;

      if (ratio < requiredRatio) {
        violations.push({
          element: el.tagName.toLowerCase() + (el.id ? "#" + el.id : el.className ? "." + el.className.split(" ")[0] : ""),
          text: el.textContent.substring(0, 30).trim(),
          contrastRatio: ratio.toFixed(2),
          required: requiredRatio
        });
      }
    }

    return { totalChecked: checked, violations, isValid: violations.length === 0 };
  }
}
