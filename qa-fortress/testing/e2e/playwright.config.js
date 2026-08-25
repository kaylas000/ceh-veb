import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./specs", fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: process.env.TEST_URL || "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
});
