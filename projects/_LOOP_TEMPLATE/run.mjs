#!/usr/bin/env node
/* ЦЕХ · точка входа проекта в Universal Loop Engine.
 *
 * Скопируй папку (cp -r projects/_LOOP_TEMPLATE projects/<имя>), поправь
 * loop.config.yaml и prompts/, затем:
 *
 *   node run.mjs "твоя задача"              # по конфигу (по умолчанию mock — офлайн)
 *   node run.mjs "твоя задача" --dry-run    # принудительно без сети и ключей
 *   node run.mjs --iterations 5 --json      # переопределить итерации, отчёт в JSON
 *
 * Полный набор опций: node core/loop-engine/cli.mjs --help
 * Exit code: 0 — артефакт принят валидатором, 1 — цикл не сошёлся.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfigAndRun } from "../../core/loop-engine/index.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const studioRoot = resolve(here, "..", "..");
const argv = process.argv.slice(2);
const task = argv.filter((a) => !a.startsWith("--")).join(" ").trim();

const result = await loadConfigAndRun(resolve(here, "loop.config.yaml"), task, studioRoot, {
  projectDir: here,
  dryRun: argv.includes("--dry-run"),
  json: argv.includes("--json"),
  overrides: {
    iterations: Number(argv.find((a) => a.startsWith("--iterations"))?.split(/[=\s]/)[1] ?? 0) || undefined,
    validator: argv.find((a) => a.startsWith("--validator"))?.split(/[=\s]/)[1],
  },
});

process.stderr.write(`${result.ok ? "✅" : "💥"} ${result.reason} · итераций: ${result.iterations} · ${(result.elapsedMs / 1000).toFixed(1)}s\n`);
process.stderr.write(`💾 сохранено: ${(result.saved ?? []).map((p) => p.replace(`${studioRoot}/`, "")).join(", ") || "—"}\n`);
if (!task) process.stderr.write("ℹ️  задача не передана — взята из loop.config.yaml (task:)\n");

process.exit(result.ok ? 0 : 1);
