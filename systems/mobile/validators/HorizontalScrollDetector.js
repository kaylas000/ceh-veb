/* Ловит горизонтальный скролл и находит виновников. */
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
