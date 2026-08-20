import { useEffect, useMemo, useState } from "react";
import { Reveal, useCountUp, useInView, useScramble, Stamp } from "../lib/fx";
import { OrderButtons } from "./Chrome";
import { REFERENCES, SKILLS, CONSTITUTION, BANNED, QUOTAS } from "../data/library";
import { RECIPES } from "../data/recipes";
import { FS } from "../data/fs";
import { validate } from "../lib/validator";

/* ---------- счётчик ---------- */
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

/* ---------- 7 систем принуждения ---------- */
const SYSTEMS = [
  { code: "SYS-1", name: "Архив", note: "референсы · скилы · ассеты", href: "#arhiv" },
  { code: "SYS-2", name: "Motion", note: "11 рецептов · кривые", href: "#dvizhenie" },
  { code: "SYS-3", name: "Spacing", note: "шкала 19 · оверлей", href: "#otstupy" },
  { code: "SYS-4", name: "Mobile", note: "sweep 22 вьюпорта", href: "#mobilnost" },
  { code: "SYS-5", name: "SEO", note: "манифест · JSON-LD", href: "#seo" },
  { code: "SYS-6", name: "Genome", note: "ДНК · уникальность", href: "#genom" },
  { code: "SYS-7", name: "QA Fortress", note: "8 слоёв обороны", href: "#qa" },
];

function SystemBoard() {
  return (
    <div className="grid grid-cols-2 gap-px border-2 border-ink bg-ink sm:grid-cols-4 lg:grid-cols-7">
      {SYSTEMS.map((s, i) => (
        <Reveal key={s.code} delay={i * 70}>
          <a
            href={s.href}
            className="group flex h-full min-h-[92px] flex-col justify-between bg-card p-3 transition-colors duration-200 hover:bg-ink"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors group-hover:text-paper/50">
                {s.code}
              </span>
              <span className="led-dot h-2 w-2 rounded-full bg-green shadow-[0_0_8px_rgba(46,125,79,0.9)]" />
            </div>
            <div>
              <p className="font-display text-sm leading-tight text-ink transition-colors group-hover:text-paper">{s.name}</p>
              <p className="mt-1 font-mono text-[8px] uppercase leading-snug tracking-[0.08em] text-muted transition-colors group-hover:text-paper/50">
                {s.note}
              </p>
            </div>
          </a>
        </Reveal>
      ))}
    </div>
  );
}

/* ---------- живая валидационная полоса ---------- */
function LiveValidation() {
  const demo = useMemo(() => validate(FS, "projects/demo"), []);
  const slop = useMemo(() => validate(FS, "fixtures/slop-site"), []);
  return (
    <div className="grid gap-px border-2 border-ink bg-ink sm:grid-cols-2">
      <div className="flex items-center gap-3 bg-card px-4 py-3">
        <span className="led-dot h-2.5 w-2.5 shrink-0 rounded-full bg-green shadow-[0_0_10px_rgba(46,125,79,0.9)]" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-green">
            projects/demo · PASS · exit 0
          </p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
            {demo.ok}/{demo.total} проверок зелёные
          </p>
        </div>
        <span className="ml-auto hidden font-display text-2xl text-green sm:block">{demo.ok}/{demo.total}</span>
      </div>
      <div className="flex items-center gap-3 bg-card px-4 py-3">
        <span className="led-dot h-2.5 w-2.5 shrink-0 rounded-full bg-red shadow-[0_0_10px_rgba(206,44,24,0.9)]" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-red">
            fixtures/slop-site · FAIL · exit 1
          </p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
            {slop.total - slop.ok} провалов · {slop.violationCodes.length} кодов BANNED
          </p>
        </div>
        <span className="ml-auto hidden font-display text-2xl text-red sm:block">✕</span>
      </div>
    </div>
  );
}

/* ---------- конвейер ---------- */
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
  const demo = useMemo(() => validate(FS, "projects/demo"), []);

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
                <span>веб-студия дизайна · {SYSTEMS.length} систем принуждения</span>
              </p>
            </Reveal>

            <h1 className="mt-5 font-display text-[clamp(4.5rem,16vw,12rem)] leading-[0.85] tracking-tight text-ink">
              {title.text}
            </h1>

            <Reveal delay={250}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/75 sm:text-lg">
                Агент собирает сайты <span className="font-semibold text-ink">только из архива</span>. Семь систем —
                отступы, мобильность, SEO, вариативность, QA — и валидатор на{" "}
                <span className="font-semibold text-ink">14 проверок</span>, который{" "}
                <span className="font-semibold text-red">физически не пропускает слоп</span>.
              </p>
            </Reveal>

            <Reveal delay={380}>
              <div className="mt-7">
                <OrderButtons size="lg" />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href="#proekty"
                    className="border-2 border-ink px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink hover:text-paper"
                  >
                    ↓ Скачать студию
                  </a>
                  <a
                    href="#validator"
                    className="border-2 border-ink/40 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink hover:text-ink"
                  >
                    Прогнать валидатор
                  </a>
                </div>
              </div>
            </Reveal>

            {/* живая валидация */}
            <Reveal delay={480}>
              <div className="mt-8">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                  валидатор сейчас · два контрольных прогона
                </p>
                <LiveValidation />
              </div>
            </Reveal>
          </div>

          {/* правая плита: паспорт */}
          <Reveal delay={300} className="lg:mt-2">
            <div className="relative border-2 border-ink bg-card shadow-[10px_10px_0_var(--color-ink)]">
              <div className="rivets pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
              <div className="relative border-b-2 border-ink bg-ink px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/70">спецификация · ТЗ «ЦЕХ» v2.0</p>
              </div>
              <dl className="relative divide-y divide-line px-5">
                {[
                  ["тип", "студия-архив + регламент принуждения"],
                  ["систем", `${SYSTEMS.length} — от архива до QA Fortress`],
                  ["проверок", `${demo.total} — V-01…V-14 в validate.mjs`],
                  ["правил", `${CONSTITUTION.length} — конституция К-01…К-15`],
                  ["запретов", `${BANNED.length} — BANNED с grep-паттернами`],
                  ["квот", `${QUOTAS.length} — числовые допуски Q-01…Q-10`],
                  ["принуждение", "ворота G1–G4 + ci-гейты + runtime"],
                  ["зависимости", "ноль npm · Node ≥18"],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[92px_1fr] gap-3 py-2.5">
                    <dt className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-muted">{k}</dt>
                    <dd className="text-[13px] font-medium leading-snug text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="relative flex items-center justify-between gap-4 border-t-2 border-ink px-5 py-4">
                <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.16em] text-muted">
                  приёмка: demo — {demo.ok}/{demo.total}
                  <br />
                  slop — падает, ≥5 нарушений
                </p>
                <Stamp rot={-7} color="var(--color-green)">
                  Принято · G4
                </Stamp>
              </div>
              <div className="hazard-thin h-2" aria-hidden="true" />
            </div>
          </Reveal>
        </div>

        {/* доска систем */}
        <Reveal delay={200} className="mt-10">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
              {SYSTEMS.length} систем в строю · все онлайн
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-green">status: operational</p>
          </div>
          <SystemBoard />
        </Reveal>

        {/* счётчики */}
        <Reveal delay={280} className="mt-6">
          <dl className="grid grid-cols-2 gap-px border-2 border-ink bg-ink sm:grid-cols-3 lg:grid-cols-6">
            <Counter v={REFERENCES.length} l="референсов" delay={0} />
            <Counter v={SKILLS.length} l="скилов" delay={90} />
            <Counter v={RECIPES.length} l="рецептов" delay={180} />
            <Counter v={demo.total} l="проверок" delay={270} />
            <Counter v={CONSTITUTION.length} l="правил" delay={360} />
            <Counter v={QUOTAS.length} l="квот" delay={450} />
          </dl>
        </Reveal>

        {/* конвейер */}
        <Reveal delay={200} className="mt-6">
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
