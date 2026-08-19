import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cpSync, mkdirSync } from "node:fs";

/* После каждой сборки дублируем dist/ в docs/ — GitHub Pages умеет
   публиковать сайт прямо из папки /docs ветки main (Settings → Pages →
   Branch: main → /docs). Никаких Actions не нужно. */
const publishDocs = {
  name: "ceh-publish-docs",
  writeBundle() {
    try {
      mkdirSync("docs", { recursive: true });
      cpSync("dist", "docs", { recursive: true });
    } catch (e) {
      console.warn("[ceh-publish-docs] не удалось скопировать dist → docs:", e?.message);
    }
  },
};

export default defineConfig({
  /* относительные пути к ассетам — сборка работает на любом хосте
     и на любой глубине URL (GitHub Pages /docs, подпапки, Netlify) */
  base: "./",
  plugins: [react(), tailwindcss(), publishDocs],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
