import { useEffect, useMemo, useRef, useState } from "react";
import { FS, FIXTURES } from "../data/fs";
import { validate, type Report } from "../lib/validator";
import { Reveal, Stamp, useInView, useReducedMotion } from "../lib/fx";
import { ScrollWindow } from "../components/ScrollWindow";
import { SectionHead } from "./Chrome";

type Line = { text: string; kind: "cmd" | "info" | "ok" | "fail" | "evidence" | "sum" };

function buildLines(r: Report): Line[] {
  const out: Line[] = [];
  out.push({ text: `$ node scripts/validate.mjs ${r.root}`, kind: "cmd" });
  out.push({ text: "ЦЕХ validate.mjs · node v20 · npm-зависимостей: 0", kind: "info" });
  out.push({ text: "─".repeat(46), kind: "info" });
  for (const row of r.rows) {
    out.push({ text: `${row.code}  ${row.title}  ·  ${row.status}`, kind: row.status === "OK" ? "ok" : "fail" });
    if (row.detail) out.push({ text: `     ${row.detail}`, kind: "evidence" });
    for (const e of row.evidence.slice(0, 5)) out.push({ text: `     ${e}`, kind: "evidence" });
  }
  out.push({ text: "─".repeat(46), kind: "info" });
  out.push({
    text: `ИТОГ: ${r.ok}/${r.total} · exit ${r.exitCode}${
      r.exitCode === 1 ? ` · коды: ${r.violationCodes.join(", ") || "артефакты"}` : " · нарушений нет"
    }`,
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

export function ValidatorSection() {
  const prm = useReducedMotion();
  const reports = useMemo(() => Object.fromEntries(FIXTURES.map((f) => [f.root, validate(FS, f.root)])), []);
  const [fixture, setFixture] = useState(FIXTURES[0].root);
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [file, setFile] = useState("");
  const termRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const [headRef, headIn] = useInView<HTMLDivElement>(0.2);

  const report = reports[fixture] as Report;
  const fixtureFiles = useMemo(() => Object.keys(FS).filter((p) => p.startsWith(fixture + "/")).sort(), [fixture]);

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

  /* переход из карточки проекта: выбрать фикстуру и прогнать */
  useEffect(() => {
    const onFixture = (e: Event) => {
      const root = (e as CustomEvent<string>).detail;
      if (FIXTURES.some((f) => f.root === root)) setFixture(root);
    };
    window.addEventListener("ceh:fixture", onFixture);
    return () => window.removeEventListener("ceh:fixture", onFixture);
  }, []);

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
      }, 120 + i * 100);
      timers.current.push(t);
    });
  };

  const demo = reports[FIXTURES[0].root] as Report;
  const pc = reports[FIXTURES[1].root] as Report;
  const slop = reports[FIXTURES[2].root] as Report;

  return (
    <section id="validator" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        <div ref={headRef} className={headIn ? "rv-in" : ""}>
          <SectionHead
            dark
            num="09"
            kicker="приёмочный стенд"
            lines={[<>Валидатор не</>, <span key="v" className="text-paper/50">пропускает слоп</span>]}
            aside={
              <Reveal delay={140}>
                <p className="max-w-sm text-sm leading-relaxed text-paper/70">
                  Тот же код, что в <span className="font-mono text-[13px]">scripts/validate.mjs</span>, исполняется здесь
                  против виртуального дерева репозитория. Три испытания: эталон, боевой проект и слоп-фикстура.
                </p>
              </Reveal>
            }
          />
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.5fr]">
          <div className="flex flex-col gap-4">
            {FIXTURES.map((f) => {
              const active = fixture === f.root;
              const r = reports[f.root] as Report;
              const tone = f.kind === "Негативный тест" ? "text-red" : "text-green";
              return (
                <button
                  key={f.root}
                  onClick={() => setFixture(f.root)}
                  className={`group border-2 p-5 text-left transition-all duration-200 ${
                    active ? "border-red bg-ink-2 shadow-[6px_6px_0_rgba(206,44,24,0.55)]" : "border-line-dark bg-ink-2/50 hover:border-paper/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${tone}`}>{f.kind}</span>
                    <span className={`grid h-5 w-5 place-items-center border-2 ${active ? "border-red" : "border-line-dark"}`}>
                      {active && <span className="h-2.5 w-2.5 bg-red" />}
                    </span>
                  </div>
                  <p className="mt-2 font-display text-lg uppercase leading-tight text-paper sm:text-xl">{f.label}</p>
                  <p className="mt-2 text-[12px] leading-snug text-paper/60">{f.desc}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-paper/45">
                    прогон: {r.ok}/{r.total} · exit {r.exitCode}
                  </p>
                </button>
              );
            })}

            <button
              onClick={run}
              disabled={running}
              className={`group relative mt-2 border-2 px-6 py-4 font-display text-lg uppercase tracking-[0.15em] transition-all duration-200 ${
                running
                  ? "cursor-wait border-line-dark bg-ink-2 text-paper/40"
                  : "border-red bg-red text-paper hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(206,44,24,0.55)]"
              }`}
            >
              {running ? "Прогон…" : "▶ Пуск validate.mjs"}
            </button>

            {done && (
              <div className="flex items-center gap-5 border-2 border-paper/25 bg-ink-2 p-5">
                <Stamp rot={-7} animate color={report.exitCode === 0 ? "var(--color-green)" : "var(--color-red)"}>
                  {report.exitCode === 0 ? "Принято" : "Возврат"}
                </Stamp>
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-paper/80">
                    exit {report.exitCode} · {report.ok}/{report.total}
                  </p>
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-paper/50">
                    {report.exitCode === 0
                      ? "деталь прошла все ворота — клеймо ОТК"
                      : `${report.violationCodes.length} кодов BANNED: ${report.violationCodes.join(" ")}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-[480px] flex-col border-2 border-paper/25 bg-[#14120c]">
            <div className="flex items-center justify-between border-b border-line-dark px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-green/80" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/45">протокол испытаний</span>
            </div>
            <div ref={termRef} className="term-scroll flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed sm:p-5" style={{ maxHeight: 560 }}>
              {lines.length === 0 && (
                <p className="text-paper/40">
                  <span className="text-green">$</span> стенд готов. Выберите фикстуру и нажмите «Пуск».
                  <br />
                  <span className="text-paper/35"># отчёт детерминирован: коды V-01…V-14, evidence построчно</span>
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
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/45">{file || "—"}</p>
              <ScrollWindow axis="both" className="mt-3" innerClassName="max-h-[420px]">
                <pre className="w-max min-w-full border border-line-dark bg-[#14120c] p-4 font-mono text-[11px] leading-relaxed text-paper/80">
                  {file ? FS[file] : ""}
                </pre>
              </ScrollWindow>
            </div>
          </div>
        </Reveal>

        {/* матрица */}
        <Reveal>
          <div className="mt-14">
            <h3 className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] uppercase leading-none text-paper">
              Протокол испытаний · ТЗ п.8
            </h3>
            <ScrollWindow className="mt-6 border-2 border-paper/25" fadeFrom="#16150f">
              <table className="w-max min-w-[760px] border-collapse font-mono text-[12px]">
                <thead>
                  <tr className="bg-paper/5 text-left">
                    <th className="border-b border-line-dark px-4 py-3 font-medium uppercase tracking-[0.2em] text-paper/45">проверка</th>
                    <th className="border-b border-line-dark px-4 py-3 font-medium uppercase tracking-[0.2em] text-green">demo</th>
                    <th className="border-b border-line-dark px-4 py-3 font-medium uppercase tracking-[0.2em] text-green">pcpolimer</th>
                    <th className="border-b border-line-dark px-4 py-3 font-medium uppercase tracking-[0.2em] text-red">slop-site</th>
                  </tr>
                </thead>
                <tbody>
                  {demo.rows.map((row, i) => (
                    <tr key={row.code} className="transition-colors duration-150 hover:bg-paper/5">
                      <td className="border-b border-line-dark/60 px-4 py-2.5 text-paper/85">
                        <span className="text-yellow">{row.code}</span> · {row.title}
                      </td>
                      <td className={`border-b border-line-dark/60 px-4 py-2.5 font-bold ${row.status === "OK" ? "text-green" : "text-red"}`}>{row.status}</td>
                      <td className={`border-b border-line-dark/60 px-4 py-2.5 font-bold ${pc.rows[i].status === "OK" ? "text-green" : "text-red"}`}>{pc.rows[i].status}</td>
                      <td className={`border-b border-line-dark/60 px-4 py-2.5 font-bold ${slop.rows[i].status === "OK" ? "text-green" : "text-red"}`}>{slop.rows[i].status}</td>
                    </tr>
                  ))}
                  <tr className="bg-paper/5">
                    <td className="px-4 py-3 font-bold uppercase tracking-[0.15em] text-paper">итог · exit code</td>
                    <td className="px-4 py-3 font-bold text-green">PASS · exit 0</td>
                    <td className="px-4 py-3 font-bold text-green">PASS · exit 0</td>
                    <td className="px-4 py-3 font-bold text-red">FAIL · exit 1 · {slop.violationCodes.join(" ")}</td>
                  </tr>
                </tbody>
              </table>
            </ScrollWindow>
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-paper/55">
              Негативный тест обязан падать с ≥5 нарушениями — фактически:{" "}
              <span className="text-red">{slop.total - slop.ok} проваленных V-проверок</span> и{" "}
              <span className="text-red">{slop.violationCodes.length} кодов BANNED</span>. Главный приёмочный критерий ТЗ
              выполнен: система не пропускает слоп.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
