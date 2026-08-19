import { GATES } from "../data/content";
import { MaskTitle, Reveal } from "../lib/motion";

export function Gates() {
  return (
    <section id="vorota" className="relative bg-paper-2">
      <div className="bg-blueprint pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">06 / контрольные ворота</p>
            <MaskTitle
              className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.95] text-ink"
              lines={[<>Четыре шлюза</>, <>между идеей и приёмкой</>]}
            />
          </div>
          <Reveal delay={140}>
            <p className="max-w-sm text-sm leading-relaxed text-ink/70">
              Дальше идёт только принятый артефакт. Возврат — точечные правки по пунктам
              REVIEW.md, без перезапуска потока.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 space-y-5">
          {GATES.map((g, gi) => {
            const dark = gi % 2 === 1;
            return (
              <Reveal key={g.code}>
                <article
                  className={`grid overflow-hidden border-2 border-ink lg:grid-cols-[280px_1fr] ${
                    dark ? "bg-ink text-paper" : "bg-card text-ink"
                  }`}
                >
                  {/* пульт ворот */}
                  <div className={`relative flex flex-col justify-between border-b-2 border-ink p-6 lg:border-b-0 lg:border-r-2 ${dark ? "border-paper/20" : ""}`}>
                    <div>
                      <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${dark ? "text-yellow" : "text-red"}`}>
                        ворота {gi + 1} / 4
                      </p>
                      <p className="mt-2 font-display text-7xl leading-none lg:text-8xl">
                        {g.code}
                      </p>
                      <p className={`mt-3 font-display text-xl uppercase tracking-wide ${dark ? "text-paper/85" : "text-ink/85"}`}>
                        {g.name}
                      </p>
                    </div>
                    {/* шлюз-индикатор */}
                    <div className="mt-6 flex items-end gap-1.5" aria-hidden="true">
                      {GATES.map((_, bi) => (
                        <span
                          key={bi}
                          className={`w-6 transition-all duration-500 ${bi <= gi ? "h-8 bg-red" : dark ? "h-8 bg-line-dark" : "h-8 bg-line"}`}
                          style={{ transitionDelay: `${bi * 90}ms` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* тело */}
                  <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.25fr] lg:gap-10 lg:p-8">
                    <div className="space-y-4">
                      <div>
                        <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${dark ? "text-muted-2" : "text-muted"}`}>цель</p>
                        <p className="mt-1 text-sm font-medium leading-snug">{g.goal}</p>
                      </div>
                      <div>
                        <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${dark ? "text-muted-2" : "text-muted"}`}>вход</p>
                        <p className="mt-1 text-sm leading-snug">{g.input}</p>
                      </div>
                      <div>
                        <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${dark ? "text-muted-2" : "text-muted"}`}>выходной артефакт</p>
                        <p className={`mt-1 inline-block px-2 py-1 font-mono text-xs font-bold ${dark ? "bg-red text-paper" : "bg-ink text-paper"}`}>
                          {g.output}
                        </p>
                      </div>
                      <div className={`border-l-4 border-red pl-3 ${dark ? "text-paper/75" : "text-ink/80"}`}>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-red">отказ, если</p>
                        <p className="mt-1 text-[13px] leading-snug">{g.reject}</p>
                      </div>
                    </div>

                    <div>
                      <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${dark ? "text-muted-2" : "text-muted"}`}>
                        чек-лист ядра · {g.checklist.length} пунктов
                      </p>
                      <ul className="mt-3 space-y-2">
                        {g.checklist.map((c, ci) => (
                          <li key={ci} className="group/item flex items-start gap-3">
                            <span
                              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border font-mono text-[10px] font-bold transition-colors duration-200 ${
                                dark
                                  ? "border-paper/40 text-paper/0 group-hover/item:bg-red group-hover/item:text-paper"
                                  : "border-ink/40 text-ink/0 group-hover/item:bg-red group-hover/item:text-paper"
                              }`}
                            >
                              ✓
                            </span>
                            <span className={`text-[13px] leading-snug ${dark ? "text-paper/85" : "text-ink/85"}`}>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
