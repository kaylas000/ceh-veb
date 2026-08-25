/* Генератор sitemap.xml из SEO-манифестов страниц. 0 зависимостей. */
export class SitemapGenerator {
  constructor(baseUrl) { this.baseUrl = baseUrl; }
  _priority(type) { return { landing: 1.0, product: 0.8, category: 0.7, article: 0.6, faq: 0.4 }[type] || 0.5; }
  _freq(type) { return { landing: "weekly", product: "weekly", category: "weekly", article: "monthly" }[type] || "monthly"; }
  build(entries) {
    const urls = entries.map((e) => "  <url>\n    <loc>" + this.baseUrl + e.route + "</loc>\n    <lastmod>" + e.lastmod + "</lastmod>\n    <changefreq>" + this._freq(e.type) + "</changefreq>\n    <priority>" + this._priority(e.type) + "</priority>\n  </url>").join("\n");
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "\n</urlset>";
  }
}
