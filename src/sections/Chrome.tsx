import type { ReactNode } from "react";
import { useInView } from "../lib/fx";

const NAV = [
  { href: "#arhiv", label: "Архив" },
  { href: "#dvizhenie", label: "Движение" },
  { href: "#reglament", label: "Регламент" },
  { href: "#konveier", label: "Конвейер" },
  { href: "#vorota", label: "Ворота" },
  { href: "#mobilnost", label: "Мобильность" },
  { href: "#validator", label: "Валидатор" },
  { href: "#proekty", label: "Проекты" },
];

export function Header({ onIntro }: { onIntro?: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b-2 border-ink bg-ink text-paper">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <a href="#pasport" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center bg-red font-display text-lg leading-none text-paper">Ц</span>
          <span className="font-display text-base tracking-[0.3em] text-paper">ЦЕХ</span>
        </a>
        {onIntro && (
          <button
            onClick={onIntro}
            title="Повторить кинозаставку студии (пресеты меняются по кругу)"
            className="flex shrink-0 items-center gap-1.5 border-2 border-red px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-red transition-colors duration-200 hover:bg-red hover:text-paper"
          >
            <svg width="9" height="10" viewBox="0 0 10 12" aria-hidden="true">
              <path d="M1 1l8 5-8 5z" fill="currentColor" />
            </svg>
            <span className="hidden sm:inline">Интро</span>
          </button>
        )}
        <nav className="term-scroll hidden flex-1 items-center gap-1 overflow-x-auto md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="shrink-0 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/70 transition-colors duration-200 hover:bg-paper hover:text-ink"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden shrink-0 items-center gap-2 border border-line-dark px-2.5 py-1.5 lg:flex">
          <span className="led-dot h-2 w-2 rounded-full bg-green shadow-[0_0_8px_rgba(46,125,79,0.9)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-paper/80">архив: 7 реф · 6 скилов · 11 рецептов</span>
        </div>
        <a
          href="#proekty"
          className="ml-auto shrink-0 border-2 border-yellow px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-yellow transition-colors duration-200 hover:bg-yellow hover:text-ink md:ml-0"
          title="Скачать студию архивом"
        >
          ↓ Студия
        </a>
      </div>
    </header>
  );
}

export function Marquee({
  items,
  dark = false,
  speed = 26,
}: {
  items: string[];
  dark?: boolean;
  speed?: number;
}) {
  return (
    <div
      className={`marquee-paused overflow-hidden border-y-2 py-2.5 ${
        dark ? "border-ink bg-ink text-paper" : "border-red bg-red text-paper"
      }`}
    >
      <div className="marquee-track flex w-max items-center" style={{ ["--marquee-speed" as string]: `${speed}s` }}>
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
            {items.map((t, i) => (
              <span key={t + i} className="flex items-center">
                <span className="px-5 font-mono text-[11px] uppercase tracking-[0.22em]">{t}</span>
                <span className={`h-2 w-2 rotate-45 ${dark ? "bg-yellow" : "bg-ink"}`} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function NoiseLayer() {
  return (
    <>
      <div className="noise-layer" aria-hidden="true" />
      <div className="pp-vignette" aria-hidden="true" />
    </>
  );
}

const TREE = `CEH/
├─ AGENTS.md  CONSTITUTION.md  README.md  BRIEF-TEMPLATE.md
├─ references/   INDEX.md + <style>/<id>.png + <id>.meta.yaml
├─ skills/       SKILL-INDEX.md + <name>/SKILL.md
├─ motion/       RECIPES.md, easing-curves.json, recipes/<name>/…
├─ assets/       images/, textures/, fonts/PAIRS.md
├─ anti-slop/    BANNED.md, QUOTAS.md
├─ gates/        G1-direction.md … G4-final.md
├─ scripts/      validate.mjs, lint-slop.mjs, roulette.mjs, diff-projects.mjs
└─ projects/     <project>/{SEED, DIRECTION, STRUCTURE, SOURCES, site/, REVIEW}`;

export function Footer() {
  return (
    <footer className="relative border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center bg-red font-display text-lg leading-none text-paper">Ц</span>
              <span className="font-display text-base tracking-[0.3em]">ЦЕХ</span>
            </div>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-paper/65">
              Веб-студия дизайна: архив референсов, скилов и motion-рецептов + регламент,
              который не даёт агенту скатиться в однообразный AI-слоп.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Node ≥18", "0 npm-зависимостей", "exit 0/1", "V-01…V-10", "B-01…B-16", "Q-01…Q-07"].map((t) => (
                <span key={t} className="border border-line-dark px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-paper/60">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">структура поставки</p>
            <pre className="term-scroll mt-3 overflow-x-auto border border-line-dark bg-ink-2 p-4 font-mono text-[11px] leading-relaxed text-paper/70">
              {TREE}
            </pre>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line-dark pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
          <span>ЦЕХ v1.0 · этап 0 завершён · куратор: долей скриншоты до 30</span>
          <span>собрано по ТЗ «ЦЕХ» · G4: зелёно</span>
        </div>
      </div>
      <div className="hazard h-2" aria-hidden="true" />
    </footer>
  );
}

export function SectionHead({
  num,
  kicker,
  lines,
  aside,
  dark = false,
}: {
  num: string;
  kicker: string;
  lines: ReactNode[];
  aside?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className={`font-mono text-[11px] uppercase tracking-[0.25em] ${dark ? "text-red" : "text-red"}`}>
          {num} / {kicker}
        </p>
        <div
          className={`mt-3 font-display text-[clamp(2.1rem,5vw,3.9rem)] uppercase leading-[0.95] ${
            dark ? "text-paper" : "text-ink"
          }`}
        >
          {lines.map((l, i) => (
            <span key={i} className="line-mask">
              <span style={{ ["--rv-delay" as string]: `${i * 110}ms` }}>{l}</span>
            </span>
          ))}
        </div>
      </div>
      {aside}
    </div>
  );
}
