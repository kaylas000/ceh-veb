#!/usr/bin/env node
/* ЦЕХ diff-projects.mjs — сходство секций и палитр с последними 3 проектами.
   Node ≥18, 0 зависимостей. Печатает целое число процентов (порог ≤10). */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";

const root = resolve(process.cwd());
const project = process.argv[2] ?? "projects/demo";
const projName = basename(project);
const read = (p) => { try { return readFileSync(join(root, p), "utf8"); } catch { return ""; } };
const jacc = (a, b) => { const sa = new Set(a), sb = new Set(b);
  const i = [...sa].filter((x) => sb.has(x)).length, u = new Set([...sa, ...sb]).size;
  return u === 0 ? 0 : i / u; };

const structure = read(join(project, "STRUCTURE.md"));
const direction = read(join(project, "DIRECTION.md"));
const sec = (structure.match(/^## (.+)$/gm) ?? []).map((s) => s.replace(/^## /, "").trim().toLowerCase());
const pal = [...new Set(direction.match(/#[0-9a-fA-F]{6}/g) ?? [])].map((s) => s.toLowerCase());

const histDir = join(root, "projects", "_history");
const files = existsSync(histDir) ? readdirSync(histDir)
  .filter((f) => f.endsWith(".manifest.md") && f !== `${projName}.manifest.md`)
  .slice(-3) : [];

let worst = 0;
for (const f of files) {
  const c = read(join("projects", "_history", f));
  const ms = (c.match(/^Секции:\s*(.+)$/m)?.[1] ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const mp = (c.match(/^Палитра:\s*(.+)$/m)?.[1] ?? "").match(/#[0-9a-fA-F]{6}/g)?.map((s) => s.toLowerCase()) ?? [];
  worst = Math.max(worst, 0.6 * jacc(sec, ms) + 0.4 * jacc(pal, mp));
}
console.log(Math.round(worst * 100));
