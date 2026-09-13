/* Тесты гейта К-21 (core/loop-engine/gate.mjs): разбор аргументов, выбор проектов,
 * конфиг цикла, отчёт в стиле цеха, прогон через настоящий ceh_project и CLI.
 *
 * Правила: фикстуры — только в mkdtempSync(tmpdir()) с rmSync в finally; дочерние
 * процессы — только через runCommand (он снимает NODE_TEST_CONTEXT, иначе дочерний
 * `node --test` молчал бы); интеграционные прогоны покрываются skip-гардом, если
 * проект в репозитории не найден.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  EVIDENCE_FILE,
  GATE_ID,
  STATUS_MARK,
  formatGateReport,
  gateConfig,
  parseGateArgs,
  resolveProjectArg,
  runGate,
  selectProjects,
  splitChecks,
} from "../gate.mjs";
import { runCommand } from "../subprocess.mjs";
import { DEFAULT_CHECKS } from "../validators/index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = resolve(HERE, "..", "..", "..");
const GATE = join(STUDIO_ROOT, "core", "loop-engine", "gate.mjs");
const PCPOLIMER = join(STUDIO_ROOT, "projects", "pcpolimer");
const NODE = process.execPath;

const BROKEN_CODES = [
  "V-01", "V-02", "V-03", "V-04", "V-05", "V-07", "V-08", "V-10", "V-12", "V-15", "V-17", "B-01", "M-01", "M-02",
];

/** Битый проект: inline `transition: all`, ни meta, ни досье — ворота обязаны зашуметь. */
const BROKEN_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Лазерная резка металла</title>
<style>
.hero-card { transition: all 600ms cubic-bezier(0.16, 1, 0.3, 1); }
</style>
</head>
<body>
<main>
<section class="hero">
<h1>Лазерная резка листового металла</h1>
<p>Точность реза 0,1 мм. Срок партии — 24 часа.</p>
<a class="link" href="#zayavka">Оставить чертёж на расчёт</a>
</section>
</main>
</body>
</html>
`;

/** Временный корень студии: projects/ с нужными каталогами. */
function tempRoot(setup) {
  const root = mkdtempSync(join(tmpdir(), "ceh-gate-"));
  mkdirSync(join(root, "projects"), { recursive: true });
  setup(root);
  return root;
}

/** Каталог проекта внутри временного корня (с site/ по умолчанию). */
function project(root, name, { site = true, files = {} } = {}) {
  const dir = join(root, "projects", name);
  if (site) mkdirSync(join(dir, "site"), { recursive: true });
  else mkdirSync(dir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
  return dir;
}

/** Запуск CLI гейта: служебный лог по умолчанию на уровне warn, как у пользователя. */
function gate(args, opts = {}) {
  return runCommand(NODE, [GATE, ...args], {
    cwd: STUDIO_ROOT,
    timeoutMs: opts.timeoutMs ?? 240000,
    env: { LOOP_ENGINE_LOG: "warn", ...opts.env },
  });
}

/* ———————————————————————————————— parseGateArgs ———————————————————————————————— */

test("parseGateArgs: позиционные проекты идут в порядке перечисления", () => {
  const a = parseGateArgs(["projects/pcpolimer", "dezobrabotka"]);
  assert.deepEqual(a.projects, ["projects/pcpolimer", "dezobrabotka"]);
  assert.deepEqual(a._, ["projects/pcpolimer", "dezobrabotka"], "совместимость с parseArgs движка");
});

test("parseGateArgs: --project повторяемый и в форме --project=<путь>", () => {
  const a = parseGateArgs(["--project", "one", "--project=two", "--project", "three"]);
  assert.deepEqual(a.projects, ["one", "two", "three"]);
  const dup = parseGateArgs(["dup", "--project", "dup", "--project=dup"]);
  assert.deepEqual(dup.projects, ["dup", "dup", "dup"], "дедупликация — по пути в runGate, не в парсере");
});

test("parseGateArgs: --checks через запятую с пробелами и в форме --checks=", () => {
  const a = parseGateArgs(["--checks", " validate , lint-slop ,lint-copy "]);
  assert.deepEqual(a.checks, ["validate", "lint-slop", "lint-copy"]);
  const b = parseGateArgs(["--checks=validate,validate"]);
  assert.deepEqual(b.checks, ["validate"], "дубли check-схлепываются");
  assert.deepEqual(splitChecks(true), [...DEFAULT_CHECKS], "флаг без значения — дефолтный список");
});

test("parseGateArgs: флаги и kebab → snake_case", () => {
  const a = parseGateArgs(["--json", "--quiet", "--keep-workspace", "--help"]);
  assert.equal(a.json, true);
  assert.equal(a.quiet, true);
  assert.equal(a.keep_workspace, true, "имя ключа в snake_case");
  assert.equal(a.help, true);
  assert.equal(parseGateArgs(["-h"]).help, true, "короткая форма справки");
  const withValue = parseGateArgs(["--json=true", "--quiet=0"]);
  assert.equal(withValue.json, true);
  assert.equal(withValue.quiet, false);
  assert.equal(parseGateArgs(["--log-level", "debug"]).log_level, "debug");
});

test("parseGateArgs: неизвестная опция и опция без значения бросают E-CONFIG-GATE", () => {
  assert.throws(() => parseGateArgs(["--bogus"]), (e) => e.code === "E-CONFIG-GATE" && /неизвестные опции/.test(e.message));
  assert.throws(() => parseGateArgs(["--project"]), /--project требует значение/);
  assert.throws(() => parseGateArgs(["--checks"]), /--checks требует список/);
  assert.throws(() => parseGateArgs(["--json=может-быть"]), /не принимает значение/);
});

test("parseGateArgs: пустой ввод — дефолты гейта", () => {
  const a = parseGateArgs([]);
  assert.deepEqual(a.projects, []);
  assert.deepEqual(a.checks, [...DEFAULT_CHECKS]);
  assert.equal(a.json, false);
  assert.equal(a.quiet, false);
  assert.equal(a.keep_workspace, false);
  assert.equal(a.help, false);
  assert.equal(a.log_level, null);
});

/* ———————————————————————————————— selectProjects ———————————————————————————————— */

test("selectProjects: каталоги на «_» — служебные, гейт их не принимает", () => {
  const root = tempRoot((r) => {
    project(r, "_TEMPLATE");
    project(r, "_history", { site: false });
    project(r, "alpha");
  });
  try {
    const list = selectProjects(join(root, "projects"));
    assert.deepEqual(list.map((p) => p.name), ["alpha"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("selectProjects: hasSite — есть ли у проекта каталог site/", () => {
  const root = tempRoot((r) => {
    project(r, "with-site");
    project(r, "without-site", { site: false });
    project(r, "file-only-site", { site: false, files: { "site.html": "<html></html>" } });
  });
  try {
    const list = selectProjects(join(root, "projects"));
    assert.deepEqual(Object.fromEntries(list.map((p) => [p.name, p.hasSite])), {
      "file-only-site": false,
      "with-site": true,
      "without-site": false,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("selectProjects: сортировка по имени и относительный path для отчёта", () => {
  const root = tempRoot((r) => {
    project(r, "zulu");
    project(r, "alpha");
    project(r, "Mike");
  });
  try {
    const list = selectProjects(join(root, "projects"));
    assert.deepEqual(list.map((p) => p.name), ["Mike", "alpha", "zulu"], "детерминированный порядок без локали");
    assert.deepEqual(list.map((p) => p.path), ["projects/Mike", "projects/alpha", "projects/zulu"]);
    assert.ok(list.every((p) => isAbsolute(p.absPath)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function isAbsolute(p) {
  return p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p);
}

test("selectProjects: несуществующий или пустой корень — пустой список", () => {
  assert.deepEqual(selectProjects(join(tmpdir(), "ceh-gate-net-tut-net")), []);
  const root = tempRoot(() => {});
  try {
    assert.deepEqual(selectProjects(join(root, "projects")), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("selectProjects: в реальном projects/ нет имён на «_» и приняты оба проекта", { skip: !existsSync(PCPOLIMER) }, () => {
  const list = selectProjects();
  assert.ok(list.length >= 2, `ожидали не меньше 2 проектов, нашли ${list.length}`);
  assert.ok(list.every((p) => !p.name.startsWith("_")), "служебные каталоги не попадают в гейт");
  assert.ok(list.some((p) => p.name === "pcpolimer" && p.hasSite), "projects/pcpolimer со site/ в списке");
  assert.equal(list.find((p) => p.name === "_TEMPLATE"), undefined);
});

/* ———————————————————————————————— resolveProjectArg ———————————————————————————————— */

test("resolveProjectArg: абсолютный путь возвращается как есть", () => {
  const root = tempRoot((r) => project(r, "abs-project"));
  try {
    const abs = resolve(root, "projects", "abs-project");
    assert.equal(resolveProjectArg(abs, STUDIO_ROOT), abs);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolveProjectArg: голое имя проекта раскрывается в projects/<имя>", () => {
  assert.equal(resolveProjectArg("pcpolimer", STUDIO_ROOT), join(STUDIO_ROOT, "projects", "pcpolimer"));
  assert.equal(resolveProjectArg("pcpolimer/", STUDIO_ROOT), join(STUDIO_ROOT, "projects", "pcpolimer"), "хвостовой слэш не мешает");
});

test("resolveProjectArg: относительный путь — от корня студии; пустая строка → null", () => {
  assert.equal(resolveProjectArg("projects/pcpolimer", STUDIO_ROOT), join(STUDIO_ROOT, "projects", "pcpolimer"));
  assert.equal(resolveProjectArg("", STUDIO_ROOT), null);
  assert.equal(resolveProjectArg("   ", STUDIO_ROOT), null);
  assert.equal(resolveProjectArg(undefined, STUDIO_ROOT), null);
});

/* ———————————————————————————————— gateConfig ———————————————————————————————— */

test("gateConfig: детерминизм и независимость прогонов", () => {
  const a = gateConfig();
  const b = gateConfig();
  assert.equal(JSON.stringify(a), JSON.stringify(b), "конфиг гейта не должен зависеть от вызова");
  a.loop.max_iterations = 99;
  a.validator.checks.push("мусор");
  assert.equal(gateConfig().loop.max_iterations, 1, "мутация прошлого конфига не течёт в следующий");
});

test("gateConfig: одна итерация, mock-генератор, ceh_project, evidence в loop-result.json", () => {
  const c = gateConfig();
  assert.equal(c.loop.max_iterations, 1);
  assert.equal(c.loop.stop_on_first_success, true);
  assert.equal(c.loop.persist_iterations, false, "гейт не плодит workspace/iterations/");
  assert.equal(c.loop.throw_on_failure, false, "вердикт — отчёт и exit code, а не исключение");
  assert.equal(c.generator.type, "mock", "никаких обращений к LLM");
  assert.equal(c.validator.type, "ceh_project");
  assert.equal(c.validator.materialize, false, "валидатор читает проект с диска, ничего не пишет");
  assert.equal(c.validator.allow_project_writes, false, "принятые проекты под защитой");
  assert.deepEqual(c.validator.checks, [...DEFAULT_CHECKS]);
  assert.equal(c.context_builder.type, "studio_default");
  assert.equal(c.context_builder.include.examples, false, "few-shot чужим кодом гейту не нужен");
  assert.equal(c.output.summary_file, EVIDENCE_FILE);
});

test("gateConfig: перечисления --checks/--iterations и имя проекта прокидываются", () => {
  const c = gateConfig({ checks: ["validate", "lint-slop"], iterations: 2, projectName: "pcpolimer", task: "свой текст задачи" });
  assert.deepEqual(c.validator.checks, ["validate", "lint-slop"]);
  assert.equal(c.loop.max_iterations, 2);
  assert.equal(c.project_name, "pcpolimer");
  assert.equal(c.task, "свой текст задачи");
  assert.equal(gateConfig({ iterations: 0 }).loop.max_iterations, 1, "итераций меньше одной не бывает");
});

/* ———————————————————————————————— formatGateReport ———————————————————————————————— */

test("formatGateReport: зелёный прогон — шапка, колонки, разделитель и ИТОГ exit 0", () => {
  const report = {
    gate: GATE_ID,
    ok: true,
    total: 2,
    checked: 2,
    ok_count: 2,
    failed: 0,
    errored: 0,
    skipped: 0,
    violations: [],
    ms: 1200,
    entries: [
      { path: "projects/alpha", status: "ok", ms: 200, codes: [], errors: [] },
      { path: "projects/pcpolimer", status: "ok", ms: 1000, codes: [], errors: [] },
    ],
  };
  const out = formatGateReport(report);
  const lines = out.trimEnd().split("\n");
  assert.equal(lines[0], `ГЕЙТ ${GATE_ID} · цикл принуждения · проектов проверено 2`);
  assert.ok(lines[1].startsWith("OK   projects/alpha"), lines[1]);
  assert.ok(lines[1].endsWith("200ms"), lines[1]);
  assert.ok(lines[2].endsWith("1000ms"), lines[2]);
  assert.equal(new Set(lines.slice(1, 3).map((l) => l.length)).size, 1, "колонки выровнены");
  assert.match(lines[3], /^─{40,}$/);
  assert.equal(lines[4], "ИТОГ: OK 2/2 проектов прошли цикл · exit 0");
  assert.ok(!/LOOP_ENGINE_LOG/.test(out), "в зелёном отчёте подсказок не нужно");
});

test("formatGateReport: красный прогон — коды нарушений в строке проекта и в ИТОГЕ", () => {
  const report = {
    gate: GATE_ID,
    ok: false,
    total: 1,
    checked: 1,
    ok_count: 0,
    failed: 1,
    errored: 0,
    skipped: 0,
    violations: ["V-01", "B-01"],
    entries: [{ path: "projects/fix", status: "fail", ms: 42, codes: ["V-01", "B-01"], errors: ["validate: V-01 DIRECTION: референсы и цитаты", "вторая строка"] }],
  };
  const lines = formatGateReport(report).trimEnd().split("\n");
  assert.ok(lines[1].startsWith("FAIL projects/fix"), lines[1]);
  assert.ok(lines[1].includes("V-01,B-01"), lines[1]);
  assert.ok(lines[1].endsWith("42ms"), lines[1]);
  assert.equal(lines[2], "      · validate: V-01 DIRECTION: референсы и цитаты");
  assert.equal(lines[3], "      · вторая строка");
  assert.equal(lines[lines.length - 1], "ИТОГ: FAIL 1/1 · нарушения: V-01,B-01 · exit 1");
});

test("formatGateReport: SKIP не влияет на итог — exit 0", () => {
  const report = {
    gate: GATE_ID,
    ok: true,
    total: 2,
    checked: 1,
    ok_count: 2,
    failed: 0,
    errored: 0,
    skipped: 1,
    violations: [],
    entries: [
      { path: "projects/alpha", status: "skipped", ms: 0, codes: [], errors: [] },
      { path: "projects/pcpolimer", status: "ok", ms: 300, codes: [], errors: [] },
    ],
  };
  const out = formatGateReport(report);
  const skipLine = out.trimEnd().split("\n")[1];
  assert.ok(skipLine.startsWith("SKIP projects/alpha"), skipLine);
  assert.ok(skipLine.includes("нет site/"), skipLine);
  assert.ok(skipLine.endsWith("0ms"), skipLine);
  assert.match(out, /ИТОГ: OK 2\/2 проектов прошли цикл · exit 0/);
  assert.equal(STATUS_MARK.skipped, "SKIP");
});

test("formatGateReport: ERR — машинный код, подсказка про лог и exit 1", () => {
  const report = {
    gate: GATE_ID,
    ok: false,
    total: 1,
    checked: 1,
    ok_count: 0,
    failed: 0,
    errored: 1,
    skipped: 0,
    violations: ["E-PROJECT-MISSING"],
    entries: [{ path: "projects/nope", status: "error", ms: 0, codes: ["E-PROJECT-MISSING"], errors: ["каталог проекта не найден: /tmp/nope"] }],
  };
  const out = formatGateReport(report);
  const errLine = out.trimEnd().split("\n")[1];
  assert.ok(errLine.startsWith("ERR  projects/nope"), errLine);
  assert.ok(errLine.includes("E-PROJECT-MISSING"), errLine);
  assert.match(out, /· каталог проекта не найден: \/tmp\/nope/);
  assert.match(out, /ИТОГ: FAIL 1\/1 · нарушения: E-PROJECT-MISSING · exit 1/);
});

test("formatGateReport: --quiet оставляет шапку и итог, пустой отчёт не роняет форматтер", () => {
  const report = {
    gate: GATE_ID,
    ok: true,
    total: 0,
    checked: 0,
    ok_count: 0,
    failed: 0,
    errored: 0,
    skipped: 0,
    violations: [],
    entries: [],
  };
  const lines = formatGateReport(report, { quiet: true }).trimEnd().split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /проектов проверено 0/);
  assert.match(lines[1], /ИТОГ: OK 0\/0 проектов прошли цикл · exit 0/);
  const full = formatGateReport(report).trimEnd().split("\n");
  assert.equal(full.length, 3, "пустой отчёт: шапка + разделитель + итог, без строк проектов");
  assert.match(full[1], /^─{40,}$/);
});

/* ———————————————————————————————— runGate ———————————————————————————————— */

test("runGate: несуществующий каталог → status error с кодом E-PROJECT-MISSING", async () => {
  const root = tempRoot(() => {});
  try {
    const report = await runGate({ projectsRoot: join(root, "projects"), projectArgs: [join(root, "projects", "net-tut")] });
    assert.equal(report.total, 1);
    assert.equal(report.entries[0].status, "error");
    assert.deepEqual(report.entries[0].codes, ["E-PROJECT-MISSING"]);
    assert.equal(report.entries[0].ms, 0);
    assert.equal(report.ok, false);
    assert.deepEqual(report.violations, ["E-PROJECT-MISSING"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runGate: проект без site/ → skipped, ms 0, ворота не запускаются", async () => {
  const root = tempRoot((r) => {
    project(r, "bez-site", { site: false, files: { "DIRECTION.md": "# нет сборки\n" } });
  });
  try {
    const report = await runGate({ projectsRoot: join(root, "projects") });
    assert.equal(report.entries.length, 1);
    assert.equal(report.entries[0].status, "skipped");
    assert.equal(report.entries[0].ms, 0);
    assert.equal(report.entries[0].iterations, 0);
    assert.equal(report.entries[0].evidence, null);
    assert.equal(report.ok, true, "skip — не нарушение");
    assert.equal(report.checked, 0);
    assert.equal(existsSync(join(root, "projects", "bez-site", "workspace")), false, "skip не создаёт workspace/");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runGate: пустые projects/ — итог OK 0/0 и exit-семантика ok", async () => {
  const root = tempRoot(() => {});
  try {
    const report = await runGate({ projectsRoot: join(root, "projects") });
    assert.deepEqual(report.entries, []);
    assert.equal(report.total, 0);
    assert.equal(report.ok, true);
    assert.equal(report.violations.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runGate: projects/pcpolimer проходит цикл → ok, evidence сохранён", { skip: !existsSync(join(PCPOLIMER, "site")) }, async () => {
  const report = await runGate({ projectsRoot: join(STUDIO_ROOT, "projects"), projectArgs: ["pcpolimer"] });
  const entry = report.entries[0];
  assert.equal(report.total, 1);
  assert.equal(entry.status, "ok", `ожидали ok, получили ${entry.status}: ${(entry.codes ?? []).join(",")}`);
  assert.equal(entry.iterations, 1, "гейт — ровно одна итерация цикла");
  assert.deepEqual(entry.codes, []);
  assert.equal(report.ok, true);
  assert.equal(report.violations.length, 0);
  assert.match(String(entry.evidence), new RegExp(`workspace/${EVIDENCE_FILE}$`));
  rmSync(join(PCPOLIMER, "workspace"), { recursive: true, force: true });
});

test("runGate: workspace/ создаётся только на прогон — без --keep-workspace его нет", async () => {
  const root = tempRoot((r) => {
    project(r, "broken", { files: { "site/index.html": BROKEN_HTML } });
    project(r, "had-workspace", { files: { "site/index.html": BROKEN_HTML, "EVIDENCE.txt": "ручная заметка\n" } });
    mkdirSync(join(r, "projects", "had-workspace", "workspace"), { recursive: true });
    writeFileSync(join(r, "projects", "had-workspace", "workspace", "keep.txt"), "не трогать\n", "utf8");
  });
  try {
    const projectsRoot = join(root, "projects");
    const report = await runGate({ projectsRoot, projectArgs: [join(projectsRoot, "broken"), join(projectsRoot, "had-workspace")] });
    assert.deepEqual(report.entries.map((e) => e.status), ["fail", "fail"]);
    assert.deepEqual(report.entries.map((e) => e.path), ["projects/broken", "projects/had-workspace"], "в отчёте — имя проекта, а не ../../../tmp/…");
    assert.equal(existsSync(join(projectsRoot, "broken", "workspace")), false, "созданный прогоном workspace/ убран");
    assert.equal(report.entries[0].workspaceKept, false);
    assert.equal(readFileSync(join(projectsRoot, "had-workspace", "workspace", "keep.txt"), "utf8").trim(), "не трогать", "чужой workspace/ не трогаем");
    assert.equal(report.entries[1].workspacePreexisting, true);
    assert.equal(report.entries[1].workspaceKept, true);

    const kept = await runGate({ projectsRoot, projectArgs: ["broken"], keepWorkspace: true });
    assert.equal(kept.entries[0].status, "fail");
    assert.equal(existsSync(join(projectsRoot, "broken", "workspace", EVIDENCE_FILE)), true, "--keep-workspace оставляет evidence");
    const evidence = JSON.parse(readFileSync(join(projectsRoot, "broken", "workspace", EVIDENCE_FILE), "utf8"));
    assert.equal(evidence.ok, false);
    assert.ok(evidence.feedback.codes.includes("B-01"), "evidence несёт коды ворот");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runGate: битый проект → fail с кодами V-xx/B-xx/M-xx (ворота цеха, не заглушка)", async () => {
  const root = tempRoot((r) => {
    project(r, "broken", { files: { "site/index.html": BROKEN_HTML } });
  });
  try {
    const report = await runGate({ projectsRoot: join(root, "projects") });
    assert.equal(report.ok, false);
    assert.equal(report.failed, 1);
    assert.deepEqual(report.entries[0].codes, BROKEN_CODES);
    assert.deepEqual(report.violations, BROKEN_CODES);
    assert.ok(report.entries[0].errors.length > 0, "для точечных правок (К-10) отдаём текст нарушений");
    assert.ok(report.entries[0].ms > 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/* ———————————————————————————————————— CLI ———————————————————————————————————— */

test("CLI: --help → exit 0 и справка по опциям", () => {
  const res = gate(["--help"]);
  assert.equal(res.exitCode, 0, res.stderr);
  assert.match(res.stdout, new RegExp(`ГЕЙТ ${GATE_ID} · цикл принуждения`));
  assert.match(res.stdout, /--keep-workspace/);
  assert.match(res.stdout, /loop-result\.json/);
  assert.equal(res.stderr, "");
});

test("CLI: неизвестная опция → exit 1, ошибка в stderr, stdout чист", () => {
  const res = gate(["--cheques", "validate"]);
  assert.equal(res.exitCode, 1);
  assert.match(res.stderr, /неизвестные опции: --cheques/);
  assert.equal(res.stdout, "");
});

test("CLI: прогон всех проектов → exit 0, пустой stderr на уровне warn", () => {
  const res = gate([]);
  assert.equal(res.exitCode, 0, `${res.stdout}\n${res.stderr}`);
  assert.equal(res.stderr, "", "на warn гейт молчит: служебный лог не должен пачкать приёмку");
  assert.match(res.stdout, /^ГЕЙТ К-21 · цикл принуждения · проектов проверено \d+$/m);
  assert.match(res.stdout, /^ИТОГ: OK \d+\/\d+ проектов прошли цикл · exit 0$/m);
  assert.ok(!res.stdout.includes("workspace/"), "в отчёте не осталось упоминаний убранной рабочей зоны");
});

test("CLI: --json — машиночитаемый отчёт {gate, ok, failed, entries[]}", () => {
  const res = gate(["--json"]);
  assert.equal(res.exitCode, 0, res.stderr);
  const report = JSON.parse(res.stdout);
  assert.equal(report.gate, GATE_ID);
  assert.equal(report.ok, true);
  assert.equal(report.failed, 0);
  assert.ok(Array.isArray(report.entries) && report.entries.length > 0);
  for (const entry of report.entries) {
    assert.ok(["ok", "fail", "skipped", "error"].includes(entry.status), `неизвестный статус ${entry.status}`);
    assert.equal(typeof entry.ms, "number");
  }
});

test("CLI: дубль проекта не удваивает запись; --quiet оставляет две строки", () => {
  const res = gate(["projects/pcpolimer", "--project", "pcpolimer", "--project=projects/pcpolimer", "--json"]);
  assert.equal(res.exitCode, 0, res.stderr);
  const report = JSON.parse(res.stdout);
  assert.equal(report.entries.length, 1, "дедупликация по разрешённому пути");
  assert.equal(report.entries[0].name, "pcpolimer");

  const quiet = gate(["projects/pcpolimer", "--quiet"]);
  assert.equal(quiet.exitCode, 0, quiet.stderr);
  assert.equal(quiet.stdout.trimEnd().split("\n").length, 2);
  assert.match(quiet.stdout, /ИТОГ: OK 1\/1 проектов прошли цикл · exit 0/);
});
