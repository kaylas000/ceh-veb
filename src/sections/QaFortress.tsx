import { useRef, useState } from "react";
import { FS } from "../data/fs";
import {
  DEFENSE_LAYERS,
  SECRET_PATTERNS,
  scanFixtureMarkup,
  scanLiveA11y,
  scanLiveBundle,
  scanLiveLinks,
  scanSecrets,
  type Finding,
} from "../lib/qaFortress";
import { Reveal, useInView, useReducedMotion } from "../lib/fx";
import { SectionHead } from "./Chrome";

const FIXTURES = [
  { id: "projects/demo", label: "projects/demo" },
  { id: "projects/pcpolimer", label: "projects/pcpolimer" },
  { id: "fixtures/slop-site", label: "fixtures/slop-site" },
];

const filesOf = (root: string) => Object.entries(FS).filter(([p]) => p.startsWith(root + "/"));
const htmlOf = (root: string) => filesOf(root).find(([p]) => p.endsWith(".html"))?.[1] ?? "";

type LineKind = "head" | "ok" | "crit" | "warn" | "info";
interface TLine {
  text: string;
  kind: LineKind;
}

const KIND_CLS: Record<LineKind, string> = {
  head: "text-yellow font-bold",
  ok: "text-green",
  crit: "text-red",
  warn: "text-yellow",
  info: "text-paper/55",
};

const CHECKLIST: Array<{ title: string; items: string[] }> = [
  {
    title: "перед коммитом",
    items: ["npm run lint — 0 ошибок", "npm run type-check — 0 ошибок", "нет console.log и закомментированного кода", "нет хардкод-секретов"],
  },
  {
    title: "перед PR",
    items: ["npm run build — без warning'ов", "unit-тесты зелёные, coverage не упал", "проверено вручную в браузере", "component + a11y тест для новых компонентов"],
  },
  {
    title: "перед мержем",
    items: ["все CI-джобы зелёные", "E2E на критичный путь добавлен", "SEO-манифест заполнен", "ревьюер одобрил, конфликтов нет"],
  },
];

function Funnel() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const max = 100;
  return (
    <div ref={ref} className="border-2 border-paper/25 bg-ink-2 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">воронка стоимости бага</p>
      <p className="mt-1 text-[12px] leading-relaxed text-paper/55">
        Чем позже поймана ошибка — тем дороже исправление. Слой L0 ловит за 0.1s и 1×, прод — за 100×.
      </p>
      <div className="mt-4 space-y-1.5">
        {DEFENSE_LAYERS.map((l, i) => (
          <div key={l.code} className="flex items-center gap-3">
            <span className="w-8 shrink-0 font-mono text-[10px] text-paper/45">{l.code}</span>
            <div className="h-4 flex-1 bg-ink">
              <div
                className="h-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  width: inView ? `${(l.cost / max) * 100}%` : "0%",
                  transitionDelay: `${i * 60}ms`,
                  background: l.cost >= 50 ? "var(--color-red)" : l.cost >= 10 ? "var(--color-yellow)" : "var(--color-green)",
                }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-[10px] font-bold text-paper/80">×{l.cost}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QaFortress() {
  const prm = useReducedMotion();
  const [activeLayer, setActiveLayer] = useState(-1);
  const [lines, setLines] = useState<TLine[]>([]);
  const [running, setRunning] = useState(false);
  const [fixture, setFixture] = useState("fixtures/slop-site");
  const [verdict, setVerdict] = useState<null | { pass: boolean; crit: number; warn: number }>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const fixtureLabel = FIXTURES.find((f) => f.id === fixture)?.label ?? fixture;

  const push = (l: TLine) => setLines((prev) => [...prev, l]);
  const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, prm ? 0 : ms));

  const printFindings = (findings: Finding[]) => {
    const crit = findings.filter((f) => f.sev === "critical");
    const warn = findings.filter((f) => f.sev === "warning");
    for (const f of findings) {
      push({
        text: `  ${f.sev === "critical" ? "✗" : "⚠"} [${f.code}] ${f.msg}${f.where ? ` · ${f.where}` : ""}`,
        kind: f.sev === "critical" ? "crit" : f.sev === "info" ? "info" : "warn",
      });
    }
    if (findings.length === 0) push({ text: "  ✓ нарушений не найдено", kind: "ok" });
    return { crit: crit.length, warn: warn.length };
  };

  const run = async () => {
    if (running) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(true);
    setVerdict(null);
    setLines([]);
    let crit = 0;
    let warn = 0;

    push({ text: "🏰 QA FORTRESS — полный аудит", kind: "head" });
    push({ text: "принцип: чем дешевле проверка — тем раньше срабатывает", kind: "info" });

    /* ── Группа A: фикстура ── */
    push({ text: `══ Группа A · фикстура ${fixtureLabel} ══`, kind: "head" });
    const files = filesOf(fixture);

    setActiveLayer(1);
    push({ text: "L1 · сканер секретов (gitleaks)…", kind: "info" });
    await sleep(380);
    const secrets = scanSecrets(files, true);
    const r1 = printFindings(secrets);
    crit += r1.crit;
    warn += r1.warn;

    setActiveLayer(3);
    push({ text: "L3 · разметка / синтаксис…", kind: "info" });
    await sleep(380);
    const markup = scanFixtureMarkup(htmlOf(fixture), `${fixtureLabel}/index.html`);
    const r2 = printFindings(markup);
    crit += r2.crit;
    warn += r2.warn;

    /* ── Группа B: живая страница ── */
    push({ text: "══ Группа B · живая страница студии ══", kind: "head" });

    setActiveLayer(5);
    push({ text: "L5 · a11y-аудит DOM (axe-lite)…", kind: "info" });
    await sleep(420);
    const a11y = scanLiveA11y();
    const r3 = printFindings(a11y);
    crit += r3.crit;
    warn += r3.warn;

    push({ text: "L5 · ссылки и якоря…", kind: "info" });
    await sleep(320);
    const links = scanLiveLinks();
    const r4 = printFindings(links);
    crit += r4.crit;
    warn += r4.warn;

    setActiveLayer(6);
    push({ text: "L6 · bundle-бюджет…", kind: "info" });
    await sleep(380);
    const b = scanLiveBundle();
    push({
      text: `  ${b.pageOk ? "✓" : "✗"} страница: ${b.totalKb}KB / бюджет ${b.pageBudgetKb}KB`,
      kind: b.pageOk ? "ok" : "crit",
    });
    push({
      text: `  ${b.jsOk ? "✓" : "✗"} JS: ${b.jsKb}KB / бюджет ${b.jsBudgetKb}KB`,
      kind: b.jsOk ? "ok" : "crit",
    });
    push({ text: `  · css ${b.cssKb}KB · шрифты ${b.fontKb}KB · изображения ${b.imgKb}KB`, kind: "info" });
    if (!b.pageOk) crit++;
    if (!b.jsOk) crit++;

    /* ── вердикт ── */
    push({ text: "════════════════════════════════", kind: "head" });
    const pass = crit === 0;
    push({
      text: pass
        ? `✅ QA PASSED · критичных: 0 · предупреждений: ${warn}`
        : `❌ QA FAILED · критичных: ${crit} · предупреждений: ${warn}`,
      kind: pass ? "ok" : "crit",
    });
    setVerdict({ pass, crit, warn });
    setActiveLayer(-1);
    setRunning(false);
  };

  return (
    <section id="qa" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <SectionHead
          dark
          num="14"
          kicker="qa fortress · тотальная валидация"
          lines={[<>Крепость из 8 слоёв:</>, <span key="q" className="text-paper/50">ошибка не проскочит</span>]}
          aside={
            <Reveal delay={140}>
              <p className="max-w-sm text-sm leading-relaxed text-paper/70">
                От опечатки в IDE до сломанной кнопки на проде — каждый слой ловит то, что пропустил предыдущий.
                Аудит ниже — живой: он реально сканирует фикстуру и эту страницу.
              </p>
            </Reveal>
          }
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.4fr]">
          {/* башня обороны */}
          <div className="space-y-2">
            {DEFENSE_LAYERS.map((l, i) => {
              const active = activeLayer === i;
              return (
                <Reveal key={l.code} delay={Math.min(i * 50, 300)}>
                  <div
                    className={`flex items-center gap-4 border-2 px-4 py-3 transition-all duration-300 ${
                      active
                        ? "border-red bg-red/15 shadow-[4px_4px_0_rgba(206,44,24,0.5)]"
                        : "border-paper/20 bg-ink-2/60"
                    }`}
                  >
                    <span
                      className={`grid h-10 w-12 shrink-0 place-items-center font-display text-sm ${
                        active ? "bg-red text-paper" : "bg-ink text-paper/70"
                      }`}
                    >
                      {l.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-display text-sm uppercase tracking-wide ${active ? "text-paper" : "text-paper/85"}`}>
                        {l.name}
                      </p>
                      <p className="truncate font-mono text-[10px] text-paper/45">{l.tools}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-[10px] font-bold text-yellow">{l.speed}</p>
                      <p className="font-mono text-[9px] text-paper/40">×{l.cost}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
            <Reveal delay={200}>
              <Funnel />
            </Reveal>
          </div>

          {/* терминал аудита */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-3 border-2 border-paper/25 bg-ink-2 p-4">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50" htmlFor="qa-fixture">
                фикстура
              </label>
              <select
                id="qa-fixture"
                value={fixture}
                onChange={(e) => setFixture(e.target.value)}
                className="border border-line-dark bg-ink px-3 py-2 font-mono text-sm text-yellow outline-none transition-colors focus:border-yellow"
              >
                {FIXTURES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <button
                onClick={run}
                disabled={running}
                className={`ml-auto border-2 px-6 py-2.5 font-display text-sm font-bold uppercase tracking-[0.12em] transition-all duration-200 ${
                  running
                    ? "cursor-wait border-paper/30 text-paper/40"
                    : "border-red bg-red text-paper hover:-translate-y-0.5 hover:shadow-[5px_5px_0_rgba(206,44,24,0.4)]"
                }`}
              >
                {running ? "идёт прогон…" : "▶ прогнать аудит"}
              </button>
            </div>

            <div
              ref={termRef}
              className="term-scroll min-h-[380px] flex-1 overflow-y-auto border-2 border-t-0 border-paper/25 bg-[#14120c] p-4 font-mono text-[12px] leading-relaxed"
            >
              {lines.length === 0 && (
                <p className="text-paper/40">
                  <span className="text-green">$</span> крепость готова. Выбери фикстуру и запусти прогон —
                  слои слева будут загораться по мере проверок.
                  <br />
                  <span className="text-paper/30"># slop-site обязан упасть, demo и pcpolimer — пройти</span>
                </p>
              )}
              {lines.map((l, i) => (
                <p key={i} className={`whitespace-pre-wrap break-words ${KIND_CLS[l.kind]}`}>
                  {l.text}
                </p>
              ))}
              {running && <span className="inline-block h-4 w-2.5 animate-pulse bg-green align-middle" />}
            </div>

            {verdict && (
              <div
                className={`flex flex-wrap items-center gap-4 border-2 border-t-0 px-4 py-3 ${
                  verdict.pass ? "border-green bg-green/10" : "border-red bg-red/10"
                }`}
              >
                <span
                  className={`font-display text-lg uppercase tracking-[0.1em] ${verdict.pass ? "text-green" : "text-red"}`}
                >
                  {verdict.pass ? "✓ QA PASSED" : "✗ QA FAILED"}
                </span>
                <span className="font-mono text-[11px] text-paper/60">
                  критичных: <b className={verdict.crit ? "text-red" : "text-green"}>{verdict.crit}</b> · предупреждений:{" "}
                  <b className={verdict.warn ? "text-yellow" : "text-green"}>{verdict.warn}</b>
                </span>
                {!verdict.pass && (
                  <span className="ml-auto font-mono text-[10px] uppercase text-red">PR заблокирован гейтом</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* чек-лист разработчика */}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {CHECKLIST.map((c, i) => (
            <Reveal key={c.title} delay={i * 90}>
              <div className="h-full border-2 border-paper/25 bg-ink-2 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">{c.title}</p>
                <ul className="mt-3 space-y-2">
                  {c.items.map((it) => (
                    <li key={it} className="flex gap-2.5 text-[12px] leading-snug text-paper/75">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center border border-paper/30 font-mono text-[9px] text-green">
                        ✓
                      </span>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <p className="mt-6 border-l-2 border-red pl-4 font-mono text-[11px] leading-relaxed text-paper/50">
            Секрет, оставленный в slop-фикстуре (<span className="text-paper/70">AKIA…EXAMPLE</span>), и пустые ссылки{" "}
            <span className="text-paper/70">href="#"</span> — намеренные: крепость обязана их ловить. Сравни прогон на{" "}
            slop-site и на demo.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
