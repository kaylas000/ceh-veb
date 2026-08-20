import { GATES, ROLES, METRICS } from "../data/library";
import { Reveal, useCountUp, useInView } from "../lib/fx";
import { SectionHead } from "./Chrome";

const GATE_COLORS: Record<string, string> = { G1: "#e0a91c", G2: "#ce2c18", G3: "#5c7a99", G4: "#2e7d4f" };

function MetricCell({ v, suffix, l }: { v: number; suffix: string; l: string }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  const n = useCountUp(v, inView, 1300);
  return (
    <div ref={ref} className="min-w-0 border border-ink/20 bg-card px-4 py-4">
      <p className="font-display text-3xl leading-none text-ink sm:text-4xl">
        {n}
        <span className="text-red">{suffix}</span>
      </p>
      <p className="mt-2 font-mono text-[9px] uppercase leading-tight tracking-[0.14em] text-muted">{l}</p>
    </div>
  );
}

export function Control() {
  return (
    <section id="vorota" className="relative bg-paper">
      <div className="bg-blueprint pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        <SectionHead
          num="05"
          kicker="gates/G1–G4"
          lines={[<>Контрольные</>, <span key="g" className="text-red">ворота</span>]}
          aside={
            <Reveal>
              <p className="max-w-sm text-sm leading-relaxed text-ink/70">
                У каждых ворот: цель, условия входа, чек-лист 5–8 пунктов, выходной артефакт и критерии отказа. Без
                закрытых ворот проект не существует.
              </p>
            </Reveal>
          }
        />

        <div className="mt-10 space-y-6">
          {GATES.map((g, i) => (
            <Reveal key={g.code} delay={Math.min(i * 80, 240)}>
              <article
                className={`grid overflow-hidden border-2 border-ink bg-card transition-shadow duration-300 hover:shadow-[10px_10px_0_var(--color-ink)] lg:grid-cols-[300px_1fr] ${
                  i % 2 === 1 ? "lg:[direction:rtl]" : ""
                }`}
              >
                <div className="relative flex flex-col justify-between border-b-2 border-ink p-5 lg:border-b-0 lg:[direction:ltr]" style={{ background: GATE_COLORS[g.code] }}>
                  <div>
                    <p className="font-display text-6xl leading-none text-ink/90 sm:text-7xl">{g.code}</p>
                    <p className="mt-2 font-display text-xl uppercase tracking-wide text-ink">{g.name}</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="border-t border-ink/30 pt-2 text-[12px] leading-snug text-ink/80">
                      <span className="font-mono text-[9px] uppercase tracking-[0.18em]">вход · </span>
                      {g.input}
                    </p>
                    <p className="text-[12px] leading-snug text-ink/80">
                      <span className="font-mono text-[9px] uppercase tracking-[0.18em]">выход · </span>
                      {g.output}
                    </p>
                  </div>
                </div>
                <div className="p-5 lg:[direction:ltr] sm:p-6">
                  <p className="text-[14px] font-medium leading-snug text-ink">{g.goal}</p>
                  <ul className="mt-4 grid gap-2 md:grid-cols-2">
                    {g.checklist.map((c, ci) => (
                      <li key={ci} className="flex gap-2.5 text-[13px] leading-snug text-ink/80">
                        <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center border border-ink/40 font-mono text-[9px] text-red">
                          {ci + 1}
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-l-4 border-red bg-paper px-3 py-2 text-[12px] leading-snug text-ink/75">
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-red">отказ · </span>
                    {g.reject}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* досье */}
        <div className="mt-24">
          <SectionHead num="05.1" kicker="личный состав" lines={[<>Роли и</>, <span key="d" className="text-red">метрики</span>]} />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              {ROLES.map((r, i) => (
                <Reveal key={r.t} delay={i * 80}>
                  <div className="group h-full border-2 border-ink bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-ink">
                    <p className="font-display text-lg uppercase leading-none text-ink transition-colors group-hover:text-paper">{r.t}</p>
                    <p className="mt-3 text-[13px] leading-relaxed text-ink/70 transition-colors group-hover:text-paper/70">{r.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <div className="border-2 border-ink bg-paper-2 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">метрики успеха · ТЗ п.9</p>
                <div className="mt-4 grid grid-cols-2 gap-px border-2 border-ink bg-ink">
                  {METRICS.map((m) => (
                    <MetricCell key={m.l} v={m.v} suffix={m.suffix} l={m.l} />
                  ))}
                </div>
                <p className="mt-4 text-[12px] leading-relaxed text-ink/65">
                  Если негативный тест перестал падать — система сломана. Если проекты стали похожими — архив не работает.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
