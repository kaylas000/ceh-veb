import { FILE_TREE } from "../data/content";
import { scrollToId } from "../lib/smooth";

const NAV = [
  { href: "#pasport", label: "Паспорт" },
  { href: "#konveier", label: "Конвейер" },
  { href: "#arhiv", label: "Архив" },
  { href: "#dvizhenie", label: "Движение" },
  { href: "#reglament", label: "Регламент" },
  { href: "#vorota", label: "Ворота" },
  { href: "#liniya", label: "Монтаж" },
  { href: "#validator", label: "Валидатор" },
  { href: "#dose", label: "Досье" },
];

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b-2 border-ink bg-ink text-paper">
      <div className="mx-auto flex h-[58px] max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <a
          href="#pasport"
          onClick={(e) => {
            e.preventDefault();
            scrollToId("#pasport");
          }}
          className="flex items-center gap-2.5 shrink-0"
        >
          <span className="grid h-8 w-8 place-items-center bg-red font-display text-lg leading-none text-paper">
            Ц
          </span>
          <span className="hidden font-display text-sm tracking-[0.22em] sm:block">ЦЕХ</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-2 lg:block">
            / архив + принуждение
          </span>
        </a>
        <nav className="term-scroll flex flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap">
          {NAV.map((n, i) => (
            <a
              key={n.href}
              href={n.href}
              onClick={(e) => {
                e.preventDefault();
                scrollToId(n.href);
              }}
              className="group px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-paper/70 transition-colors duration-200 hover:bg-paper hover:text-ink"
            >
              <span className="mr-1 text-red group-hover:text-red">{String(i + 1).padStart(2, "0")}</span>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden shrink-0 items-center gap-2 border border-line-dark px-2.5 py-1.5 xl:flex">
          <span className="led-dot h-2 w-2 rounded-full bg-green shadow-[0_0_8px_rgba(46,125,79,0.9)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-paper/80">
            G4: зелёно · exit 0
          </span>
        </div>
        <a
          href="#/pcpolimer"
          className="shrink-0 border-2 border-red bg-red px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-paper transition-all duration-200 hover:bg-transparent hover:text-red"
          title="Боевой проект студии — сайт порошковой покраски"
        >
          PCPOLIMER →
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
  const row = (ariaHidden: boolean) => (
    <div
      aria-hidden={ariaHidden}
      className="flex shrink-0 items-center"
    >
      {items.map((it, i) => (
        <span key={i} className="flex items-center">
          <span className="px-5 font-mono text-xs uppercase tracking-[0.2em]">{it}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" className={dark ? "text-red" : "text-red"}>
            <rect x="1.5" y="1.5" width="7" height="7" fill="currentColor" transform="rotate(45 5 5)" />
          </svg>
        </span>
      ))}
    </div>
  );
  return (
    <div
      className={`marquee-paused overflow-hidden border-y-2 py-2.5 ${
        dark ? "border-ink bg-ink text-paper" : "border-red bg-red text-paper"
      }`}
    >
      <div className="marquee-track flex w-max" style={{ ["--marquee-speed" as string]: `${speed}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t-2 border-ink bg-ink text-paper">
      <div className="hazard h-3" aria-hidden="true" />
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">Структура поставки</p>
          <pre className="term-scroll mt-4 overflow-x-auto border border-line-dark bg-ink-2 p-4 font-mono text-[11px] leading-relaxed text-paper/80">
            {FILE_TREE}
          </pre>
        </div>
        <div className="flex flex-col justify-between gap-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">Колофон</p>
            <ul className="mt-4 space-y-2 font-mono text-xs text-paper/75">
              <li>· ТЗ «ЦЕХ» v1.0 — часть 1 + промпт строителя (часть 2)</li>
              <li>· Node ≥18 · ноль npm-зависимостей · exit-code 0/1</li>
              <li>· validate.mjs детерминирован: отчёты V-01…V-10</li>
              <li>· скриншоты референсов и файлы текстур дольёт куратор</li>
            </ul>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="font-display text-4xl leading-none text-paper sm:text-5xl">
              ЦЕХ<span className="text-red">·</span>CEH
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-2">
              цех 3 · линия принуждения · смена ночная
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-line-dark py-3 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-2">
        архив принуждает — слоп не проходит
      </div>
    </footer>
  );
}

export function NoiseLayer() {
  return <div className="noise-layer" aria-hidden="true" />;
}
