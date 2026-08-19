import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  /* относительные пути к ассетам: сборка работает на любом хосте
     и на любой глубине URL (GitHub Pages, Netlify, Vercel, подпапки) */
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
