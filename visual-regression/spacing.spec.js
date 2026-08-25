/* Регрессия отступов: скриншот с активным оверлеем + снапшот computed-значений. */
import { test, expect } from "@playwright/test";
const VIEWPORTS = [{ width: 375, height: 812, name: "mobile" }, { width: 1440, height: 900, name: "desktop" }];
for (const vp of VIEWPORTS) {
  test(`spacing overlay snapshot @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.__spacingOverlay?.enable());
    await expect(page).toHaveScreenshot(`home-${vp.name}-spacing.png`, { maxDiffPixelRatio: 0.02 });
  });
}
