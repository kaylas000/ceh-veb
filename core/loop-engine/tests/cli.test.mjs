/* Тесты cli.mjs: разбор аргументов, exit-коды, --selftest, --json, дефолтный конфиг.
 * CLI запускаем отдельным процессом — проверяем ровно то, что увидит пользователь. */
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runCommand } from "../subprocess.mjs";
import { parseArgs } from "../cli.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = resolve(HERE, "..", "..", "..");
const CLI = join(STUDIO_ROOT, "core", "loop-engine", "cli.mjs");
const TEMPLATE = join(STUDIO_ROOT, "projects", "_LOOP_TEMPLATE");
const NODE = process.execPath;

/** Запуск CLI: LOOP_ENGINE_LOG=silent, чтобы служебный лог не мешал разбирать stdout. */
function cli(args, opts = {}) {
  return runCommand(NODE, [CLI, ...args], {
    cwd: STUDIO_ROOT,
    timeoutMs: opts.timeoutMs ?? 120000,
    env: { LOOP_ENGINE_LOG: "silent", ...opts.env },
  });
}

test("parseArgs: позиционные, флаги, --key=value, булевы", () => {
  const a = parseArgs(["projects/demo", "--task", "собери hero", "--dry-run", "--iterations=4", "--json"]);
  assert.deepEqual(a._, ["projects/demo"]);
  assert.equal(a.task, "собери hero");
  assert.equal(a.dryRun, true);
  assert.equal(a.iterations, "4");
  assert.equal(a.json, true);

  const b = parseArgs(["--validator", "ceh_project", "--checks", "validate,lint-slop"]);
  assert.equal(b.validator, "ceh_project");
  assert.equal(b.checks, "validate,lint-slop");

  const c = parseArgs(["--help"]);
  assert.equal(c.help, true);
  const d = parseArgs(["-h"]);
  assert.equal(d.help, true);
});

test("--help: exit 0 и справка", () => {
  const res = cli(["--help"]);
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Universal Loop Engine/);
  assert.match(res.stdout, /--dry-run/);
  assert.match(res.stdout, /--selftest/);
});

test("без аргументов: понятная ошибка и exit 1", () => {
  const res = cli([]);
  assert.equal(res.exitCode, 1);
  assert.match(res.stderr, /нужен проект/);
});

test("--config на несуществующий файл: exit 1", () => {
  const res = cli(["projects/_LOOP_TEMPLATE", "--config", "нет-такого.yaml"]);
  assert.equal(res.exitCode, 1);
  assert.match(res.stderr, /конфиг не найден/);
});

test("dry-run шаблона: exit 0, JSON-отчёт ok=true, артефакт сохранён", () => {
  const res = cli(["projects/_LOOP_TEMPLATE", "--dry-run", "--json", "--iterations", "2", "--task", "выдай модуль"]);
  assert.equal(res.exitCode, 0, res.stderr);
  const report = JSON.parse(res.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.project, "projects/_LOOP_TEMPLATE");
  assert.ok(report.iterations >= 1);
  assert.ok(report.saved.some((p) => p.endsWith("loop-result.json")));
  assert.ok(existsSync(join(TEMPLATE, "workspace", "result.txt")));
});

test("--selftest: провал → фидбек → исправление → приёмка, exit 0", () => {
  const res = cli(["--selftest"], { timeoutMs: 180000 });
  assert.equal(res.exitCode, 0, `${res.stdout}\n${res.stderr}`);
  assert.match(res.stdout, /SELFTEST/);
  assert.match(res.stdout, /FAIL \(E-SYN\)/);
  assert.match(res.stdout, /ПРОВЕРКА ЦИКЛА: OK/);
  assert.match(res.stdout, /ИТОГ: OK/);
});

test("ceh_project на шаблоне: ворота возвращают V-xx и exit 1", () => {
  const res = cli([
    "projects/_LOOP_TEMPLATE",
    "--dry-run",
    "--validator",
    "ceh_project",
    "--checks",
    "validate",
    "--iterations",
    "1",
    "--json",
  ]);
  assert.equal(res.exitCode, 1);
  const report = JSON.parse(res.stdout);
  assert.equal(report.ok, false);
  assert.ok(report.feedback.codes.some((c) => /^V-\d{2}$/.test(c)), report.feedback.codes.join(","));
  assert.ok(report.history.length === 1);
});

test("проект без loop.config.yaml работает на дефолтах движка", () => {
  const projectDir = join(STUDIO_ROOT, "projects", "_TEMPLATE");
  const workspace = join(projectDir, "workspace");
  try {
    const res = cli([
      "projects/_TEMPLATE",
      "--dry-run",
      "--validator",
      "ceh_project",
      "--checks",
      "validate",
      "--iterations",
      "1",
      "--json",
    ]);
    assert.ok(res.exitCode === 0 || res.exitCode === 1, "ожидается корректный exit-code, а не падение");
    const report = JSON.parse(res.stdout);
    assert.equal(report.project, "projects/_TEMPLATE");
    assert.equal(report.config, "—", "конфига нет — в отчёте прочерк");
    assert.ok(report.history.length === 1);
  } finally {
    // за дефолтным прогоном остаётся рабочая зона — убираем, чтобы не мусорить в чужом проекте
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("текстовый отчёт содержит строки L-xx, блок КОНТЕКСТ и ИТОГ", () => {
  const res = cli(["projects/_LOOP_TEMPLATE", "--dry-run", "--iterations", "1", "--task", "проверка отчёта"]);
  assert.equal(res.exitCode, 0, res.stderr);
  assert.match(res.stdout, /^L-00 проект projects\/_LOOP_TEMPLATE/m);
  assert.match(res.stdout, /^L-01 итерация 1\/1/m);
  assert.match(res.stdout, /── КОНТЕКСТ ──/);
  assert.match(res.stdout, /mechanics\s+\d+ файл/);
  assert.match(res.stdout, /^ИТОГ: OK/m);
});

test("--quiet оставляет только итог", () => {
  const res = cli(["projects/_LOOP_TEMPLATE", "--dry-run", "--iterations", "1", "--quiet"]);
  assert.equal(res.exitCode, 0, res.stderr);
  assert.match(res.stdout, /^ИТОГ:/m);
  assert.ok(!res.stdout.includes("КОНТЕКСТ"));
});

test("лог идёт в stderr, отчёт — в stdout (разделение потоков)", () => {
  const res = cli(["projects/_LOOP_TEMPLATE", "--dry-run", "--iterations", "1"], { env: { LOOP_ENGINE_LOG: "info" } });
  assert.match(res.stderr, /\[loop-engine\] INFO/);
  assert.match(res.stdout, /^ИТОГ:/m);
  assert.ok(!res.stdout.includes("[loop-engine]"), "служебный лог не должен попадать в отчёт");
});
