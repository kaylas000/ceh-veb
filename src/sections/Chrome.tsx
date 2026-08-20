import type { ReactNode } from "react";
import { useInView } from "../lib/fx";
import { ScrollWindow } from "../components/ScrollWindow";
import { ORDER_MAX_URL, ORDER_TG_URL } from "../data/contacts";

const NAV = [
  { href: "#arhiv", label: "Архив" },
  { href: "#dvizhenie", label: "Движение" },
  { href: "#reglament", label: "Регламент" },
  { href: "#konveier", label: "Конвейер" },
  { href: "#vorota", label: "Ворота" },
  { href: "#mobilnost", label: "Мобильность" },
  { href: "#validator", label: "Валидатор" },
  { href: "#seo", label: "SEO" },
  { href: "#proekty", label: "Проекты" },
  { href: "#priemka", label: "Приёмка" },
  { href: "#genom", label: "Геном" },
  { href: "#qa", label: "QA" },
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
          href={ORDER_MAX_URL}
          target="_blank"
          rel="noreferrer"
          className="press-ready ml-auto flex shrink-0 items-center gap-2 border-2 border-red bg-red px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-paper transition-all duration-200 hover:bg-transparent hover:text-red md:ml-0"
          title="Заказать сайт — написать в MAX"
        >
          <span>Заказать сайт</span>
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
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1fr_1.2fr_0.8fr]">
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
              {["Node ≥18", "0 npm-зависимостей", "exit 0/1", "V-01…V-14", "B-01…B-16", "Q-01…Q-10"].map((t) => (
                <span key={t} className="border border-line-dark px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-paper/60">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">структура поставки</p>
            <ScrollWindow className="mt-3" fadeFrom="#1e1d16">
              <pre className="w-max min-w-full border border-line-dark bg-ink-2 p-4 font-mono text-[11px] leading-relaxed text-paper/70">
                {TREE}
              </pre>
            </ScrollWindow>
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">заказ сайта</p>
            <OrderButtons className="mt-4" />
            <p className="mt-4 text-[12px] leading-relaxed text-paper/60">
              Бриф и оценка — бесплатно. Напишите, что за задача — ответим направлением и сроками в тот же день.
            </p>
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
  /* заголовок раскрывается сам — не зависит от внешнего Reveal */
  const [ref, inView] = useInView<HTMLDivElement>(0.2);
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div ref={ref} className={`min-w-0 ${inView ? "rv-in" : ""}`}>
        <p className={`font-mono text-[11px] uppercase tracking-[0.25em] ${dark ? "text-red" : "text-red"}`}>
          {num} / {kicker}
        </p>
        <div
          className={`mt-3 font-display text-[clamp(1.9rem,5vw,3.9rem)] uppercase leading-[0.95] ${
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

/* ---------- заказ сайта: иконки и кнопки ---------- */



export function OrderButtons({
  tone = "light",
  size = "md",
  className = "",
}: {
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const pad = size === "lg" ? "px-7 py-3.5" : size === "sm" ? "px-3.5 py-2" : "px-5 py-2.5";
  const base = `inline-flex flex-col items-center justify-center border-2 transition-all duration-200 hover:-translate-y-0.5 ${pad}`;
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <a
        href={ORDER_MAX_URL}
        target="_blank"
        rel="noreferrer"
        title="Разработка сайта под ключ — написать в MAX"
        className={`${base} ${
          tone === "dark"
            ? "border-yellow bg-yellow text-ink hover:shadow-[6px_6px_0_rgba(224,169,28,0.45)]"
            : "border-red bg-red text-paper hover:shadow-[6px_6px_0_rgba(206,44,24,0.4)]"
        }`}
      >
        <span className={`font-display font-bold uppercase tracking-[0.12em] ${size === "lg" ? "text-sm" : "text-[12px]"}`}>Заказать сайт</span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] opacity-80">написать в MAX</span>
      </a>
      <a
        href={ORDER_TG_URL}
        target="_blank"
        rel="noreferrer"
        title="Разработка сайта под ключ — написать в Telegram"
        className={`${base} ${
          tone === "dark"
            ? "border-paper/50 text-paper hover:border-paper hover:bg-paper hover:text-ink"
            : "border-ink text-ink hover:bg-ink hover:text-paper"
        }`}
      >
        <span className={`font-display font-bold uppercase tracking-[0.12em] ${size === "lg" ? "text-sm" : "text-[12px]"}`}>Заказать сайт</span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] opacity-80">написать в Telegram</span>
      </a>
    </div>
  );
}

/* ---------- финальный CTA-баннер ---------- */

export function CtaBanner() {
  return (
    <section id="zakaz" className="relative overflow-hidden bg-red text-paper">
      <div className="hazard h-2.5" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-20">
        <p className="pointer-events-none absolute -right-6 top-1/2 hidden -translate-y-1/2 select-none font-display text-[16rem] leading-none text-paper/10 lg:block" aria-hidden="true">
          ЦЕХ
        </p>
        <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-paper/80">приём заявок открыт</p>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,5vw,3.6rem)] uppercase leading-[0.98]">
              Нужен сайт, где у каждого
              <br />
              решения есть источник?
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-paper/85">
              Работаем по цеховому регламенту: раздача осей, референсы с takeaway, ворота G1–G4 и валидатор,
              который не пропускает шаблонность. Бриф и оценка — бесплатно, ответ — в день обращения.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/70">
              <span>01 · бриф за 10 минут</span>
              <span>02 · направление за 1 день</span>
              <span>03 · сдача по G4</span>
            </div>
          </div>
          <div className="border-2 border-paper/60 bg-ink/25 p-5 backdrop-blur-[2px] sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/80">прямая связь с цехом</p>
            <OrderButtons tone="dark" size="lg" className="mt-4" />
            <p className="mt-4 border-t border-paper/30 pt-3 font-mono text-[10px] leading-relaxed text-paper/70">
              MAX — быстрее · Telegram — если удобнее · приложите ссылку или скрин того, что не нравится — начнём с «чем это НЕ»
            </p>
          </div>
        </div>
      </div>
      <div className="hazard h-2.5" aria-hidden="true" />
    </section>
  );
}

/* ---------- мобильная плашка заказа ---------- */

export function MobileOrderBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line-dark bg-ink px-2.5 pt-2.5 md:hidden"
      style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto grid max-w-[480px] grid-cols-2 gap-2.5">
        <a
          href={ORDER_MAX_URL}
          target="_blank"
          rel="noreferrer"
          title="Заказать сайт — написать в MAX"
          className="flex flex-col items-center justify-center border-2 border-red bg-red py-2.5 text-paper active:translate-y-px"
        >
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.1em]">Заказать сайт</span>
          <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.14em] opacity-80">в MAX</span>
        </a>
        <a
          href={ORDER_TG_URL}
          target="_blank"
          rel="noreferrer"
          title="Заказать сайт — написать в Telegram"
          className="flex flex-col items-center justify-center border-2 border-paper/40 py-2.5 text-paper active:translate-y-px"
        >
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.1em]">Заказать сайт</span>
          <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.14em] opacity-80">в Telegram</span>
        </a>
      </div>
    </div>
  );
}
