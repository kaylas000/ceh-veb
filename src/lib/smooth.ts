/* Плавный скролл (Lenis) — обязателен для «плёночного» ощущения.
   Единая точка: все программные прокрутки идут через scrollToY/scrollToId,
   иначе raf-цикл Lenis будет спорить с window.scrollTo. */

import Lenis from "lenis";

let lenis: Lenis | null = null;
let rafId = 0;

export function initSmooth(): void {
  if (lenis || typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  lenis = new Lenis({
    duration: 1.15,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  const raf = (time: number) => {
    lenis?.raf(time);
    rafId = requestAnimationFrame(raf);
  };
  rafId = requestAnimationFrame(raf);
}

export function destroySmooth(): void {
  cancelAnimationFrame(rafId);
  lenis?.destroy();
  lenis = null;
}

/** immediate=true — жёсткий прыжок (для scrub-перемотки) */
export function scrollToY(y: number, immediate = false): void {
  if (lenis) {
    lenis.scrollTo(y, { immediate, duration: immediate ? 0 : 1.2 });
  } else {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: y, behavior: immediate || reduce ? "auto" : "smooth" });
  }
}

export function scrollToId(id: string): void {
  const el = document.getElementById(id.replace(/^#/, ""));
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, { offset: -70, duration: 1.2 });
  } else {
    el.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }
}
