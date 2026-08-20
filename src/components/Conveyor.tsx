import { useState } from "react";
import { WORKFLOW, SEED_AXES } from "../data/content";
import { MaskTitle, Reveal, ScrambleText } from "../lib/motion";

function AxisDial({ label, value, roll, delay }: { label: string; value: string; roll: number; delay: number }) {
  return (
    <div className="border border-line-dark bg-ink-2">
      <div className="flex items-center justify-between border-b border-line-dark px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-2">{label}</span>
        <span className="font-mono text-[10px] text-red">ось {delay + 1}</span>
      </div>
      <div className="min-h-[76px] px-3 py-3">
        <ScrambleText
          key={`${roll}-${value}`}
          text={value}
          className="font-display text-sm leading-snug text-paper sm:text-base"
        />
      </div>
    </div>
  );
}

export function Conveyor() {
  const [roll, setRoll] = useState(47);
  const [seed, setSeed] = useState(() => pick());

  function pick() {
    const r = (arr: readonly string[]) => arr[Math.floor(Math.random() * arr.length)];
    return {
      composition: r(SEED_AXES.composition),
      motion: r(SEED_AXES.motion),
      typography: r(SEED_AXES.typography),
    };
  }

  const throwDice = () => {
    setSeed(pick());
    setRoll((n) => n + 1);
  };

  return (
    <section id="konveier" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          {/* заголовок + пайплайн */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">02 / регламент потока</p>
            <MaskTitle
              className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.95]"
              lines={[<>Конвейер</>, <span key="l2" className="text-paper/55">обязателен к вшиванию</span>]}
            />
            <Reveal delay={120}>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-paper/70">
                Порядок работы агента-дизайнера зашит в AGENTS.md. Возврат с ворот — это точечные
                правки по пунктам REVIEW.md, а не перезапуск потока. Красные плиты — контрольные
                ворота: дальше идёт только принятый артефакт.
              </p>
            </Reveal>

            <ol className="relative mt-10 space-y-0">
              <svg
                className="pointer-events-none absolute bottom-4 left-[15px] top-4 hidden h-[calc(100%-2rem)] w-[2px] sm:block"
                aria-hidden="true"
              >
                <line x1="1" y1="0" x2="1" y2="100%" stroke="var(--color-red)" strokeWidth="2" className="dash-line" />
              </svg>
              {WORKFLOW.map((w, i) => {
                const isGate = "gate" in w && w.gate;
                return (
                  <Reveal key={w.stage + i} delay={Math.min(i * 45, 300)}>
                    <li className="group relative flex items-center gap-4 border-b border-line-dark/60 py-2.5 pl-0 sm:pl-10">
                      <span
                        className={`absolute left-[8px] hidden h-4 w-4 rotate-45 border sm:block ${
                          isGate ? "border-red bg-red" : "border-paper/40 bg-ink group-hover:border-paper"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="w-8 font-mono text-[10px] text-muted-2">{String(i + 1).padStart(2, "0")}</span>
                      <span
                        className={`font-display text-base uppercase tracking-wide sm:text-lg ${
                          isGate ? "bg-red px-2 py-0.5 text-paper" : "text-paper"
                        }`}
                      >
                        {w.stage}
                      </span>
                      <span className="ml-auto hidden text-right font-mono text-[10px] uppercase tracking-wider text-muted-2 md:block">
                        {w.note}
                      </span>
                    </li>
                  </Reveal>
                );
              })}
            </ol>
          </div>

          {/* рулетка SEED */}
          <div className="lg:pt-16">
            <div className="border-2 border-paper/25 bg-ink-2/80 p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">roulette.mjs</p>
                  <h3 className="mt-1 font-display text-2xl uppercase text-paper sm:text-3xl">Бросок осей</h3>
                </div>
                <div className="border border-line-dark px-3 py-2 text-right">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-2">бросок №</p>
                  <p key={roll} className="font-display text-2xl leading-none text-yellow">
                    <ScrambleText text={String(roll)} />
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <AxisDial label="Композиция" value={seed.composition} roll={roll} delay={0} />
                <AxisDial label="Движение" value={seed.motion} roll={roll} delay={1} />
                <AxisDial label="Типографика" value={seed.typography} roll={roll} delay={2} />
              </div>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  onClick={throwDice}
                  className="group relative shrink-0 border-2 border-red bg-red px-6 py-3 font-display text-sm uppercase tracking-[0.15em] text-paper transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                  style={{ animation: "press-pulse 2.4s cubic-bezier(0.65,0,0.15,1) infinite" }}
                >
                  Дёрнуть ручку
                  <span className="ml-2 inline-block transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </button>
                <p className="font-mono text-[10px] uppercase leading-relaxed tracking-wider text-muted-2">
                  композиция × движение × типографика · подряд идущие повторы осей запрещены (К-11)
                </p>
              </div>

              <div className="term-scroll mt-6 overflow-x-auto border border-line-dark bg-ink p-3">
                <p className="whitespace-nowrap font-mono text-[11px] leading-relaxed text-paper/80">
                  <span className="text-green">$</span> node scripts/roulette.mjs --write{" "}
                  <span className="text-muted-2"># → SEED.md</span>
                  <br />
                  <span className="text-yellow">Композиция:</span> {seed.composition}
                  <br />
                  <span className="text-yellow">Движение:</span> {seed.motion}
                  <br />
                  <span className="text-yellow">Типографика:</span> {seed.typography}
                  <br />
                  <span className="text-muted-2">совпадение с броском №{roll - 1}: нет · записано</span>
                </p>
              </div>
            </div>

            <Reveal delay={150}>
              <p className="mt-5 border-l-4 border-yellow pl-4 text-sm leading-relaxed text-paper/65">
                Оси не гарантируют вкус — они гарантируют, что следующий проект не повторит
                предыдущий. Раздачу SEED дизайнер обязан отразить в DIRECTION.md: это проверит V-07.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
