import { ROLES, STAGES, METRICS } from "../data/content";
import { MaskTitle, Reveal, TickCounter } from "../lib/motion";

export function Dossier() {
  return (
    <section id="dose" className="relative bg-paper">
      <div className="bg-blueprint pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">09 / личный состав</p>
        <MaskTitle
          className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.95] text-ink"
          lines={[<>Кто стоит у станка</>]}
        />

        {/* роли — досье */}
        <div className="mt-10 border-2 border-ink bg-card">
          {ROLES.map((r, i) => (
            <Reveal key={r.name} delay={Math.min(i * 70, 280)}>
              <div
                className={`group grid gap-3 px-5 py-5 transition-colors duration-200 hover:bg-paper-2 lg:grid-cols-[220px_150px_1fr_170px] lg:gap-6 ${
                  i > 0 ? "border-t-2 border-ink" : ""
                }`}
              >
                <p className="font-display text-xl uppercase leading-tight text-ink sm:text-2xl">{r.name}</p>
                <p className="font-mono text-[11px] leading-relaxed text-red">{r.file}</p>
                <p className="max-w-xl text-[13px] leading-relaxed text-ink/80">{r.duty}</p>
                <p className="self-center">
                  <span className="inline-block rotate-[-3deg] border-2 border-steel/70 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-steel transition-transform duration-200 group-hover:rotate-0">
                    {r.stamp}
                  </span>
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* этапы */}
        <div className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h3 className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] uppercase leading-none text-ink">
              Этапы развёртывания
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">этап 0 закрыт строителем</p>
          </div>
          <div className="relative mt-8">
            <div className="absolute left-0 right-0 top-[26px] hidden h-0.5 bg-ink/20 lg:block" aria-hidden="true" />
            <div className="grid gap-6 lg:grid-cols-3">
              {STAGES.map((s, i) => (
                <Reveal key={s.n} delay={i * 120}>
                  <div className={`relative border-2 border-ink p-5 ${s.done ? "bg-ink text-paper" : "bg-card text-ink"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`grid h-[52px] w-[52px] place-items-center border-2 font-display text-2xl ${s.done ? "border-red bg-red text-paper" : "border-ink bg-paper text-ink"}`}>
                        {s.n}
                      </span>
                      <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${s.done ? "text-green" : "text-red"}`}>
                        {s.done ? "● закрыт" : "○ в работе"}
                      </span>
                    </div>
                    <p className="mt-4 font-display text-lg uppercase">{s.name}</p>
                    <ul className="mt-3 space-y-1.5">
                      {s.items.map((it) => (
                        <li key={it} className={`flex gap-2 text-[13px] leading-snug ${s.done ? "text-paper/80" : "text-ink/80"}`}>
                          <span className={s.done ? "text-green" : "text-red"}>{s.done ? "✓" : "→"}</span>
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        {/* метрики */}
        <div className="mt-20">
          <h3 className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] uppercase leading-none text-ink">
            Метрики успеха
          </h3>
          <div className="mt-8 grid border-2 border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((m, i) => (
              <div key={m.label} className={`p-6 ${i > 0 ? "border-t border-line-dark sm:border-t-0 sm:border-l" : ""}`}>
                <p className="font-display text-[clamp(2.6rem,5vw,4rem)] leading-none text-paper">
                  <TickCounter value={m.value} suffix={m.suffix} />
                </p>
                <div className="mt-3 h-1.5 w-full bg-line-dark">
                  <div className="h-full bg-red" style={{ width: `${Math.max(m.value, 3)}%` }} />
                </div>
                <p className="mt-3 text-sm font-semibold leading-snug text-paper/85">{m.label}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2">{m.note}</p>
              </div>
            ))}
          </div>
          <Reveal delay={120}>
            <p className="mt-6 max-w-2xl border-l-4 border-red pl-4 text-sm leading-relaxed text-ink/75">
              Система считается живой, пока негативный тест падает в ста случаях из ста.
              Если slop-фикстур когда-нибудь пройдёт валидатор — правила устарели, и куратор
              обязан пересобрать BANNED и QUOTAS под новые штампы слопогенераторов.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
