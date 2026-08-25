/* Генератор robots.txt с безопасными дефолтами. 0 зависимостей. */
export class RobotsGenerator {
  constructor(baseUrl) { this.baseUrl = baseUrl; }
  generate() {
    return "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /*?*sort=\nDisallow: /*?*filter=\n\nSitemap: " + this.baseUrl + "/sitemap.xml\n";
  }
}
