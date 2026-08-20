import { RAL, type RalColor } from "../../data/company";
import { MaskLines, Reveal, useInView } from "../../lib/fx";

export function Ral({
  selected,
  onSelect,
}: {
  selected: RalColor;
  onSelect: (c: RalColor) => void;
}) {
  const [gridRef, gridIn] = useInView<HTMLDivElement>(0.1);

  return (
    <section id="palitra" className="relative bg-concrete text-ink">
      <div className="bg-grid-light pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.5fr] lg:gap-16">
          {/* левая плита */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-heat-2">01 / палитра</p>
            <MaskLines
              className="mt-3 font-display text-[clamp(2rem,4.6vw,3.4rem)] font-black uppercase leading-[0.94]"
              lines={[<>Любой цвет</>, <span key="r" className="text-heat-2">по каталогу RAL</span>]}
            />
            <Reveal delay={150}>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-soft">
                Держим веера RAL Classic и Design, колеруем по образцу заказчика. Матовые, глянцевые,
                муар и металлики — выбирайте цвет прямо здесь: он встанет на конвейер печи.
              </p>
            </Reveal>

            {/* выбор */}
            <Reveal delay={220}>
              <div className="mt-7 border-2 border-ink bg-card-l shadow-[8px_8px_0_rgba(26,27,31,0.9)]">
                <div className="flex items-stretch">
                  <div className="w-24 shrink-0 transition-colors duration-500" style={{ background: selected.hex }} />
                  <div className="flex-1 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">ваш выбор · на линии</p>
                    <p className="mt-1 font-display text-xl font-bold uppercase leading-none">{selected.code}</p>
                    <p className="mt-1 text-[13px] text-ink-soft">{selected.name}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {["мат", "глянец", "муар"].map((f) => (
                        <span key={f} className="border border-ink/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-soft">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="border-t-2 border-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                  подберём по образцу за 1 день
                </div>
              </div>
            </Reveal>


          </div>

          {/* сетка выкрасов */}
          <div>
            <div ref={gridRef} className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-2.5">
              {RAL.map((c, i) => {
                const active = selected.code === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => onSelect(c)}
                    aria-pressed={active}
                    title={`${c.code} — ${c.name}`}
                    className={`rv ${gridIn ? "rv-in" : ""} group relative aspect-square border-2 transition-all duration-300 ${
                      active
                        ? "z-10 -translate-y-1.5 scale-[1.04] border-ink shadow-[6px_6px_0_rgba(26,27,31,0.85)]"
                        : "border-ink/25 hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_rgba(26,27,31,0.35)]"
                    }`}
                    style={{ background: c.hex, ["--rv-delay" as string]: `${Math.min(i * 45, 500)}ms` }}
                  >
                    <span
                      className={`absolute inset-x-0 bottom-0 flex items-center justify-between px-1.5 py-1 font-mono text-[8px] uppercase tracking-wider transition-opacity duration-200 sm:text-[9px] ${
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      style={{
                        background: "rgba(26,27,31,0.78)",
                        color: "#f1f1ea",
                      }}
                    >
                      {c.code.replace("RAL ", "")}
                      {active && <span className="text-heat">✓</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              <span>клик по выкрасу ставит цвет на конвейер</span>
              <span>показаны 20 из 1000+ · полный каталог — в цехе</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
