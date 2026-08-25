/* Проверка размера бандла (gzip) против бюджета */
import fs from "fs"; import path from "path"; import zlib from "zlib";
export function analyzeBundle(distDir, budgets) {
  const results = [];
  const walk = (dir) => fs.readdirSync(dir).forEach((item) => {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) return walk(full);
    if (!item.endsWith(".js")) return;
    const gz = zlib.gzipSync(fs.readFileSync(full)).length;
    const base = item.replace(/\.[a-f0-9]{8,}\./, ".");
    const budget = Object.entries(budgets).find(([p]) => base.includes(p))?.[1];
    results.push({ file: base, gzip: gz, budget, ok: budget ? gz <= budget : true });
  });
  walk(distDir);
  return { files: results, passed: results.every((r) => r.ok) };
}
