import { useMemo, useState } from "react";
import { STAGES } from "../data/library";
import { SEED_AXES } from "../data/recipes";
import { Reveal, useReducedMotion, useScramble } from "../lib/fx";
import { SectionHead } from "./Chrome";

const GATE_COLORS: Record<string, string> = { G1: "#e0a91c", G2: "#ce2c18", G3: "#5c7a99", G4: "#2e7d4f" };

function Roulette() {
  const prm = useReducedMotion();
  const [seedNo, setSeedNo] = useState(52);
  const [comp, setComp] = useState(SEED_AXES.composition[0]);
  const [motion, setMotion] = useState(SEED_AXES.motion[0]);
  const [typo, setTypo] = useState(SEED_AXES.typography[0]);
  const [rolling, setRolling] = useState(false);

  const cS = useScramble(comp, false);
  const mS = useScramble(motion, false);
  const tS = useScramble(typo, false);

  const roll = useMemo(() => {
    return () => {
      if (rolling) return;
      setRolling(true);
      setSeedNo((n) => n + 1);
      if (prm) {
        setComp(SEED_AXES.composition[Math.floor(Math.random() * SEED_AXES.composition.length)]);
        setMotion(SEED_AXES.motion[Math.floor(Math.random() * SEED_AXES.motion.length)]);
        setTypo(SEED_AXES.typography[Math.floor(Math.random() * SEED_AXES.typography.length)]);
        setRolling(false);
        return;
      }
      const id = window.setInterval(() => {
        setComp(SEED_AXES.composition[Math.floor(Math.random() * SEED_AXES.composition.length)]);
        setMotion(SEED_AXES.motion[Math.floor(Math.random() * SEED_AXES.motion.length)]);
        setTypo(SEED_AXES.typography[Math.floor(Math.random() * SEED_AXES.typography.length)]);
      }, 70);
      window.setTimeout(() => {
        window.clearInterval(id);
        setComp(SEED_AXES.composition[Math.floor(Math.random() * SEED_AXES.composition.length)]);
        setMotion(SEED_AXES.motion[Math.floor(Math.random() * SEED_AXES.motion.length)]);
        setTypo(SEED_AXES.typography[Math.floor(Math.random() * SEED_AXES.typography.length)]);
        setRolling(false);
        cS.run();
        mS.run();
        tS.run();
      }, 900);
    };
  }, [rolling, prm, cS, mS, tS]);

  return (
    <div className="border-2 border-paper/25 bg-ink-2 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">roulette.mjs · раздача осей</p>
        <span className="border border-line-dark px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-paper/70">
          бросок №{seedNo}
        </span>
      </div>
      <dl className="mt-4 space-y-2.5">
        {(
          [
            ["Композиция", cS.text],
            ["Движение", mS.text],
            ["Типографика", tS.text],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line-dark pb-2.5">
            <dt className="w-28 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">{k}</dt>
            <dd className="font-display text-base uppercase leading-snug text-paper sm:text-lg">{v}</dd>
          </div>
        ))}
      </dl>
      <button
        onClick={roll}
        disabled={rolling}
        className={`mt-5 w-full border-2 px-5 py-3.5 font-display text-base font-bold uppercase tracking-[0.14em] transition-all duration-200 ${
          rolling
            ? "cursor-wait border-line-dark bg-ink text-paper/40"
            : "border-red bg-red text-paper hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(206,44,24,0.5)]"
        }`}
      >
        {rolling ? "Барабан крутится…" : "Дёрнуть ручку"}
      </button>
      <p className="mt-3 font-mono text-[10px] leading-relaxed text-paper/45">
        оси пишутся в SEED.md; V-07 проследит, чтобы они дошли до DIRECTION, а V-09 — чтобы не повторялись подряд
      </p>
    </div>
  );
}

export function Workflow() {
  return (
    <section id="konveier" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHead
              dark
              num="04"
              kicker="workflow агента"
              lines={[<>Тринадцать стадий,</>, <span key="w" className="text-paper/50">четыре ворот</span>]}
            />
            <Reveal delay={140}>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-paper/70">
                Порядок вшит в AGENTS.md. Возврат с ворот — точечные правки по пунктам REVIEW, не перезапуск (К-10).
                Пунктир — движение детали; ворота — контрольные точки.
              </p>
            </Reveal>
          </div>
          <Roulette />
        </div>

        {/* конвейер стадий */}
        <div className="relative mt-16">
          <svg className="absolute left-0 top-[22px] hidden h-[3px] w-full text-yellow/60 md:block" aria-hidden="true">
            <line x1="0" y1="1.5" x2="100%" y2="1.5" stroke="currentColor" strokeWidth="3" className="dash-line" />
          </svg>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {STAGES.map((s, i) => {
              const gate = s.gate;
              return (
                <Reveal key={s.n} as="li" delay={Math.min(i * 50, 350)}>
                  <div
                    className={`group relative h-full border-2 p-3.5 transition-all duration-300 hover:-translate-y-1 ${
                      gate
                        ? "border-transparent bg-ink-2"
                        : "border-paper/25 bg-ink-2/60 hover:border-paper/60"
                    }`}
                    style={gate ? { boxShadow: `inset 0 0 0 2px ${GATE_COLORS[gate]}` } : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-[10px] ${gate ? "text-paper/60" : "text-paper/40"}`}>
                        {s.n.padStart(2, "0")}
                      </span>
                      {gate ? (
                        <span
                          className="px-1.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-ink"
                          style={{ background: GATE_COLORS[gate] }}
                        >
                          {gate}
                        </span>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-paper/30 transition-colors group-hover:bg-yellow" aria-hidden="true" />
                      )}
                    </div>
                    <p className={`mt-2 font-display text-sm uppercase tracking-wide ${gate ? "text-paper" : "text-paper/90"}`}>
                      {s.t}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-paper/55">{s.d}</p>
                  </div>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
