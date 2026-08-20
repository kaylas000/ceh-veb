import { useEffect, useState } from "react";
import { Reveal, useCountUp, useInView, useScramble, Stamp } from "../lib/fx";
import { REFERENCES, SKILLS } from "../data/library";
import { RECIPES } from "../data/recipes";

function Counter({ v, l, delay }: { v: number; l: string; delay: number }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  const n = useCountUp(v, inView, 1300 + delay);
  return (
    <div ref={ref} className="min-w-0 border border-line-dark bg-ink px-3 py-3 sm:px-4">
      <p className="font-display text-3xl leading-none text-paper sm:text-4xl">{n}</p>
      <p className="mt-1.5 font-mono text-[9px] uppercase leading-tight tracking-[0.14em] text-paper/55">{l}</p>
    </div>
  );
}

/* тачка на конвейере: едет под собственной анимацией, груз меняется */
const CARGO = ["SEED.md", "DIRECTION", "STRUCTURE", "site/", "REVIEW"];

function CartBelt() {
  const [cargo, setCargo] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setCargo((c) => (c + 1) % CARGO.length), 1750);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="relative overflow-hidden border-2 border-ink bg-ink py-3">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-steel" />
      <div className="absolute inset-x-0 bottom-[10px] h-[3px] bg-steel" />
      <svg className="absolute inset-x-0 bottom-[16px] h-[3px] w-full text-yellow/70" aria-hidden="true">
        <line x1="0" y1="1.5" x2="100%" y2="1.5" stroke="currentColor" strokeWidth="3" className="dash-line" />
      </svg>
      <div className="cart-run relative h-[64px] w-24">
        <svg viewBox="0 0 96 64" className="h-full w-full">
          <path d="M 10 12 H 86 L 78 40 H 18 Z" fill="#ce2c18" stroke="#e8e6de" strokeWidth="2" />
          <circle cx="26" cy="50" r="8" fill="#16150f" stroke="#e8e6de" strokeWidth="2" />
          <circle cx="70" cy="50" r="8" fill="#16150f" stroke="#e8e6de" strokeWidth="2" />
        </svg>
        <span
          key={cargo}
          className="rv rv-in absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap border border-paper/40 bg-ink-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-yellow"
        >
          {CARGO[cargo]}
        </span>
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent" />
    </div>
  );
}

export function Plate() {
  const title = useScramble("ЦЕХ", true);

  return (
    <section id="pasport" className="relative overflow-hidden bg-paper pt-16">
      <div className="bg-blueprint pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:pb-20">
        <div className="grid gap-10 pt-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14 lg:pt-16">
          {/* левая плита */}
          <div className="min-w-0">
            <Reveal>
              <p className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                <span className="border border-ink/30 px-2 py-0.5">паспорт изделия № 0001</span>
                <span>веб-студия дизайна · архив + регламент</span>
              </p>
            </Reveal>

            <h1 className="mt-5 font-display text-[clamp(4.5rem,16vw,12rem)] leading-[0.85] tracking-tight text-ink">
              {title.text}
            </h1>

            <Reveal delay={250}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/75 sm:text-lg">
                Агент собирает сайты <span className="font-semibold text-ink">только из архива</span>: референсы с
                дословными takeaway, скилы с правилами, motion-рецепты с кривыми. Приёмка — через ворота G1–G4 и
                валидатор, который <span className="font-semibold text-red">не пропускает слоп</span>.
              </p>
            </Reveal>

            <Reveal delay={380}>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#proekty"
                  className="press-ready border-2 border-red bg-red px-6 py-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-paper transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(206,44,24,0.4)]"
                >
                  Скачать студию
                </a>
                <a
                  href="#validator"
                  className="border-2 border-ink px-6 py-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink hover:text-paper"
                >
                  Прогнать валидатор
                </a>
                <span className="flex items-center gap-2 border border-ink/25 bg-card px-3 py-2.5">
                  <span className="led-dot h-2 w-2 rounded-full bg-green shadow-[0_0_8px_rgba(46,125,79,0.9)]" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">G4: зелёно · exit 0</span>
                </span>
              </div>
            </Reveal>

            <Reveal delay={500}>
              <dl className="mt-9 grid max-w-xl grid-cols-2 gap-px border-2 border-ink bg-ink sm:grid-cols-4">
                <Counter v={REFERENCES.length} l="референсов в архиве" delay={0} />
                <Counter v={SKILLS.length} l="скилов с правилами" delay={120} />
                <Counter v={RECIPES.length} l="motion-рецептов" delay={240} />
                <Counter v={16} l="запретов BANNED" delay={360} />
              </dl>
            </Reveal>
          </div>

          {/* правая плита: паспорт */}
          <Reveal delay={300} className="lg:mt-2">
            <div className="relative border-2 border-ink bg-card shadow-[10px_10px_0_var(--color-ink)]">
              <div className="rivets pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
              <div className="relative border-b-2 border-ink bg-ink px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/70">спецификация · ТЗ «ЦЕХ» v1.0</p>
              </div>
              <dl className="relative divide-y divide-line px-5">
                {[
                  ["тип", "структурный проект-архив"],
                  ["назначение", "агент работает как дизайнер студии"],
                  ["цель", "исключить однообразный AI-слоп"],
                  ["состав", "референсы · скилы · рецепты · ассеты"],
                  ["принуждение", "гейты G1–G4 + validate.mjs"],
                  ["зависимости", "ноль npm · Node ≥18"],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[92px_1fr] gap-3 py-3">
                    <dt className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-muted">{k}</dt>
                    <dd className="text-[13px] font-medium leading-snug text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="relative flex items-center justify-between gap-4 border-t-2 border-ink px-5 py-4">
                <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.16em] text-muted">
                  приёмка: demo — зелёный
                  <br />
                  slop-фикстура — падает ≥5
                </p>
                <Stamp rot={-7} color="var(--color-green)">
                  Принято · G4
                </Stamp>
              </div>
              <div className="hazard-thin h-2" aria-hidden="true" />
            </div>
          </Reveal>
        </div>

        {/* конвейер под паспортом */}
        <Reveal delay={200} className="mt-10">
          <CartBelt />
          <div className="flex flex-wrap items-center justify-between gap-2 border border-t-0 border-ink bg-card px-4 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            <span>конвейер доставки артефактов: SEED → DIRECTION → STRUCTURE → site → REVIEW</span>
            <span className="text-red">пауза — по наведению</span>
          </div>
        </Reveal>
      </div>

      <div className="hazard h-2.5" aria-hidden="true" />
    </section>
  );
}
