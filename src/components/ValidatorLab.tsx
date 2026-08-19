import { useEffect, useMemo, useRef, useState } from "react";
import { FS, FIXTURES } from "../data/fixtures";
import { validate, type Report } from "../lib/validator";
import { MaskTitle, Reveal, Stamp, useReducedMotion } from "../lib/motion";

type Line = { text: string; kind: "cmd" | "info" | "ok" | "fail" | "evidence" | "sum" };

function buildLines(r: Report): Line[] {
  const out: Line[] = [];
  out.push({ text: `$ node scripts/validate.mjs ${r.root}`, kind: "cmd" });
  out.push({ text: `ЦЕХ validate.mjs · node v20.11 · npm-зависимостей: 0`, kind: "info" });
  out.push({ text: "─".repeat(46), kind: "info" });
  for (const row of r.rows) {
    out.push({
      text: `${row.code}  ${row.title}  ·  ${row.status}`,
      kind: row.status === "OK" ? "ok" : "fail",
    });
    if (row.detail) out.push({ text: `     ${row.detail}`, kind: "evidence" });
    for (const e of row.evidence.slice(0, 6)) out.push({ text: `     ${e}`, kind: "evidence" });
  }
  out.push({ text: "─".repeat(46), kind: "info" });
  out.push({
    text: `ИТОГ: ${r.ok}/${r.total} · exit ${r.exitCode}${r.exitCode === 1 ? ` · коды нарушений: ${r.violationCodes.join(", ") || "артефакты"}` : " · нарушений нет"}`,
    kind: "sum",
  });
  return out;
}

const KIND_CLS: Record<Line["kind"], string> = {
  cmd: "text-yellow",
  info: "text-paper/45",
  ok: "text-green",
  fail: "text-red",
  evidence: "text-paper/55",
  sum: "text-paper font-bold",
};

export function ValidatorLab() {
  const prm = useReducedMotion();
  const demo = useMemo(() => validate(FS, "projects/demo"), []);
  const slop = useMemo(() => validate(FS, "fixtures/slop-site"), []);
  const reports: Record<string, Report> = useMemo(
    () => Object.fromEntries(FIXTURES.map((f) => [f.root, validate(FS, f.root)])),
    [],
  );

  const [fixture, setFixture] = useState(FIXTURES[0].root);
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [file, setFile] = useState<string>("");
  const termRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const fixtureMeta = FIXTURES.find((f) => f.root === fixture)!;
  const report = reports[fixture];
  const fixtureFiles = useMemo(
    () => Object.keys(FS).filter((p) => p.startsWith(fixture + "/")).sort(),
    [fixture],
  );

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
    setFile(fixtureFiles[0] ?? "");
    setLines([]);
    setDone(false);
  }, [fixture, fixtureFiles]);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = () => {
    if (running) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const all = buildLines(report);
    setRunning(true);
    setDone(false);
    setLines([]);
    if (prm) {
      setLines(all);
      setRunning(false);
      setDone(true);
      return;
    }
    all.forEach((l, i) => {
      const t = window.setTimeout(() => {
        setLines((prev) => [...prev, l]);
        if (i === all.length - 1) {
          setRunning(false);
          setDone(true);
        }
      }, 120 + i * 110);
      timers.current.push(t);
    });
  };

  return (
    <section id="validator" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">08 / приёмочный стенд</p>
            <MaskTitle
              className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.95]"
              lines={[<>Валидатор</>, <span key="v" className="text-paper/55">не пропускает слоп</span>]}
            />
          </div>
          <Reveal delay={140}>
            <p className="max-w-sm text-sm leading-relaxed text-paper/70">
              Пор validate.mjs исполняется прямо в браузере против виртуального дерева
              репозитория. Два обязательных испытания: позитивное и негативное (ТЗ п.8).
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.5fr]">
          {/* пульт */}
          <div className="flex flex-col gap-4">
            {FIXTURES.map((f) => {
              const active = fixture === f.root;
              const r = reports[f.root];
              return (
                <button
                  key={f.root}
                  onClick={() => setFixture(f.root)}
                  className={`group border-2 p-5 text-left transition-all duration-200 ${
                    active
                      ? "border-red bg-ink-2 shadow-[6px_6px_0_rgba(206,44,24,0.55)]"
                      : "border-line-dark bg-ink-2/50 hover:border-paper/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${f.kind === "Негативный тест" ? "text-red" : "text-green"}`}>
                      {f.kind}
                    </span>
                    <span className={`grid h-5 w-5 place-items-center border-2 ${active ? "border-red" : "border-line-dark"}`}>
                      {active && <span className="h-2.5 w-2.5 bg-red" />}
                    </span>
                  </div>
                  <p className="mt-2 font-display text-lg uppercase leading-tight text-paper sm:text-xl">{f.label}</p>
                  <p className="mt-2 text-[12px] leading-snug text-paper/60">{f.desc}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-2">
                    последний прогон: {r.ok}/{r.total} · exit {r.exitCode}
                  </p>
                </button>
              );
            })}

            <button
              onClick={run}
              disabled={running}
              className={`group relative mt-2 border-2 px-6 py-4 font-display text-lg uppercase tracking-[0.15em] transition-all duration-200 ${
                running
                  ? "cursor-wait border-line-dark bg-ink-2 text-muted-2"
                  : "border-red bg-red text-paper hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(206,44,24,0.55)]"
              }`}
            >
              {running ? "Прогон…" : "▶ Пуск validate.mjs"}
            </button>

            {done && (
              <div className="flex items-center gap-5 border-2 border-paper/25 bg-ink-2 p-5">
                <Stamp rot={-7} blend={false} color={report.exitCode === 0 ? "var(--color-green)" : "var(--color-red)"}>
                  {report.exitCode === 0 ? "Принято" : "Возврат"}
                </Stamp>
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-paper/80">
                    exit {report.exitCode} · {report.ok}/{report.total}
                  </p>
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-2">
                    {report.exitCode === 0
                      ? "деталь прошла все ворота — клеймо ОТК"
                      : `${report.violationCodes.length} кодов BANNED в сборке: ${report.violationCodes.join(" ")}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* терминал */}
          <div className="flex min-h-[480px] flex-col border-2 border-paper/25 bg-[#14120c]">
            <div className="flex items-center justify-between border-b border-line-dark px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-green/80" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-2">
                протокол испытаний · {fixtureMeta.label}
              </span>
            </div>
            <div ref={termRef} className="term-scroll flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed sm:p-5" style={{ maxHeight: 560 }}>
              {lines.length === 0 && (
                <p className="text-paper/40">
                  <span className="text-green">$</span> стенд готов. Выберите фикстуру и нажмите «Пуск».
                  <br />
                  <span className="text-muted-2"># отчёт детерминирован: коды V-01…V-10, evidence построчно</span>
                </p>
              )}
              {lines.map((l, i) => (
                <p key={i} className={`whitespace-pre-wrap break-words ${KIND_CLS[l.kind]}`}>
                  {l.text}
                </p>
              ))}
              {running && <span className="inline-block h-4 w-2.5 animate-pulse bg-green align-middle" />}
            </div>
          </div>
        </div>

        {/* браузер файлов */}
        <Reveal>
          <div className="mt-10 grid border-2 border-paper/25 bg-ink-2/60 lg:grid-cols-[300px_1fr]">
            <div className="border-b border-line-dark p-4 lg:border-b-0 lg:border-r">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">дерево фикстуры</p>
              <ul className="mt-3 space-y-1">
                {fixtureFiles.map((p) => (
                  <li key={p}>
                    <button
                      onClick={() => setFile(p)}
                      className={`w-full truncate px-2 py-1.5 text-left font-mono text-[11px] transition-colors duration-150 ${
                        file === p ? "bg-red text-paper" : "text-paper/65 hover:bg-paper/10 hover:text-paper"
                      }`}
                    >
                      {p.replace(fixture + "/", "└ ")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 sm:p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-2">{file || "—"}</p>
              <pre className="term-scroll mt-3 max-h-[420px] overflow-auto border border-line-dark bg-[#14120c] p-4 font-mono text-[11px] leading-relaxed text-paper/80">
                {file ? FS[file] : ""}
              </pre>
            </div>
          </div>
        </Reveal>

        {/* матрица протокола */}
        <Reveal>
          <div className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h3 className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] uppercase leading-none text-paper">
                Протокол испытаний · ТЗ п.8
              </h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-2">
                детерминировано · оба прогона зафиксированы
              </p>
            </div>
            <div className="term-scroll mt-6 overflow-x-auto border-2 border-paper/25">
              <table className="w-full min-w-[680px] border-collapse font-mono text-[12px]">
                <thead>
                  <tr className="bg-paper/5 text-left">
                    <th className="border-b border-line-dark px-4 py-3 font-medium uppercase tracking-[0.2em] text-muted-2">проверка</th>
                    <th className="border-b border-line-dark px-4 py-3 font-medium uppercase tracking-[0.2em] text-green">projects/demo</th>
                    <th className="border-b border-line-dark px-4 py-3 font-medium uppercase tracking-[0.2em] text-red">fixtures/slop-site</th>
                  </tr>
                </thead>
                <tbody>
                  {demo.rows.map((row, i) => {
                    const s = slop.rows[i];
                    return (
                      <tr key={row.code} className="transition-colors duration-150 hover:bg-paper/5">
                        <td className="border-b border-line-dark/60 px-4 py-2.5 text-paper/85">
                          <span className="text-yellow">{row.code}</span> · {row.title}
                        </td>
                        <td className={`border-b border-line-dark/60 px-4 py-2.5 font-bold ${row.status === "OK" ? "text-green" : "text-red"}`}>
                          {row.status}
                        </td>
                        <td className={`border-b border-line-dark/60 px-4 py-2.5 font-bold ${s.status === "OK" ? "text-green" : "text-red"}`}>
                          {s.status}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-paper/5">
                    <td className="px-4 py-3 font-bold uppercase tracking-[0.15em] text-paper">итог · exit code</td>
                    <td className="px-4 py-3 font-bold text-green">PASS · exit 0 · {demo.ok}/{demo.total}</td>
                    <td className="px-4 py-3 font-bold text-red">
                      FAIL · exit 1 · {slop.ok}/{slop.total} · {slop.violationCodes.join(" ")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-paper/55">
              Негативный тест обязан падать со счётом ≥5 нарушений — фактически:{" "}
              <span className="text-red">{10 - slop.ok} проваленных проверок V-кода</span> и{" "}
              <span className="text-red">{slop.violationCodes.length} кодов BANNED</span> ({slop.violationCodes.join(", ")}).
              Главный приёмочный критерий ТЗ выполнен: система не пропускает слоп.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
