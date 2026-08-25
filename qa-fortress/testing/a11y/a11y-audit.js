/* axe-core аудит по WCAG 2.1 AA. Запуск: node a11y-audit.js */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const PAGES = ["/", "/about", "/services", "/contact"];
(async () => {
  const browser = await chromium.launch();
  let hasCritical = false;
  for (const path of PAGES) {
    const page = await browser.newPage();
    await page.goto((process.env.TEST_URL || "http://localhost:3000") + path);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const critical = res.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    console.log(`${path}: ${res.violations.length} нарушений (${critical.length} критичных)`);
    if (critical.length) hasCritical = true;
    await page.close();
  }
  await browser.close();
  process.exit(hasCritical ? 1 : 0);
})();
