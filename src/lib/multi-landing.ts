/* ------------------------------------------------------------------ */
/* ЦЕХ Multi-Landing Dynamic Keyword Replacement Engine               */
/* Мгновенная подмена контекста страницы по utm_term / kw             */
/* ------------------------------------------------------------------ */

export interface DynamicContent {
  h1: string;
  title: string;
  description: string;
  priceMin: number;
}

export class MultiLandingEngine {
  /**
   * Считывает URL-параметры utm_term или kw и динамически подменяет заголовки на странице
   */
  public static applyDynamicContext(): void {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const term = urlParams.get("utm_term") || urlParams.get("kw");

    if (!term) return;

    const formattedKw = decodeURIComponent(term).replace(/-/g, " ");
    const capitalized = formattedKw.charAt(0).toUpperCase() + formattedKw.slice(1);

    // 1. Динамическая подмена H1
    const h1Element = document.querySelector("h1, .lp-h1, .mega");
    if (h1Element) {
      h1Element.textContent = capitalized;
    }

    // 2. Динамическая подмена document.title
    document.title = `${capitalized} — Официальная служба в Пензе`;

    // 3. Динамическая подмена CTA-событий аналитики
    const ctaButtons = document.querySelectorAll(".cta, button[type='submit']");
    ctaButtons.forEach((btn) => {
      btn.setAttribute("data-analytics-event", `ad_conversion_${term}`);
    });

    console.log(`[MultiLandingEngine] Динамически подменен контент под запрос: "${capitalized}"`);
  }
}
