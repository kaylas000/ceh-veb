import { COMPANY, RAL } from "../data/company";

/* Полоса «боевой проект в эфире» — первый экран после шапки ЦЕХа.
   Вся полоса — ссылка на живой сайт студии: #/pcpolimer */

export function LiveProjectStrip() {
  return (
    <a
      href="#/pcpolimer"
      className="group relative block bg-ink pt-[58px] text-paper"
      aria-label="Открыть боевой проект студии — сайт порошковой покраски Pcpolimer"
    >
      <div className="hazard h-2" aria-hidden="true" />
      <div className="relative overflow-hidden">
        {/* бегущий пунктир по нижней кромке */}
        <svg className="absolute inset-x-0 bottom-0 h-[3px] w-full text-heat/70" aria-hidden="true">
          <line x1="0" y1="1.5" x2="100%" y2="1.5" stroke="currentColor" strokeWidth="3" className="dash-line" />
        </svg>
        <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-4 px-4 py-5 sm:px-6 lg:flex-nowrap">
          {/* шильдик */}
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center bg-heat font-display text-2xl font-black leading-none text-coal transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110">
              ПР
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-fog">
                боевой проект студии · принят G4
                <span className="led-dot inline-block h-2 w-2 rounded-full bg-green shadow-[0_0_8px_rgba(46,125,79,0.9)]" />
                <span className="text-green">в эфире</span>
              </p>
              <p className="mt-1 truncate font-display text-[clamp(1.35rem,3.2vw,2.3rem)] font-black uppercase leading-none tracking-tight text-paper transition-colors duration-200 group-hover:text-heat">
                Порошковая покраска
              </p>
            </div>
          </div>

          {/* палитра проекта + адрес */}
          <div className="hidden min-w-0 items-center gap-5 md:flex">
            <div className="flex items-center gap-1">
              {RAL.slice(0, 7).map((c) => (
                <span
                  key={c.code}
                  className="h-6 w-4 border border-paper/25 transition-transform duration-200 group-hover:-translate-y-0.5"
                  style={{ background: c.hex, transitionDelay: `${RAL.indexOf(c) * 30}ms` }}
                  title={c.code}
                />
              ))}
              <span className="ml-1 font-mono text-[9px] uppercase tracking-wider text-fog-2">+993 RAL</span>
            </div>
            <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-fog lg:inline">
              {COMPANY.addressShort} · {COMPANY.phone}
            </span>
          </div>

          {/* призыв */}
          <div className="ml-auto flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
            <span className="inline-flex items-center justify-center gap-3 border-2 border-heat bg-heat px-6 py-3 font-display text-base font-black uppercase tracking-[0.14em] text-coal transition-all duration-200 group-hover:gap-5 group-hover:shadow-[6px_6px_0_rgba(255,106,43,0.45)]">
              Открыть сайт
              <span aria-hidden="true">→</span>
            </span>
            <span className="text-center font-mono text-[9px] uppercase tracking-[0.18em] text-fog-2 sm:text-right">
              адрес: добавьте <span className="text-amber">#/pcpolimer</span> к странице
            </span>
          </div>
        </div>
      </div>
      <div className="hazard h-2" aria-hidden="true" />
    </a>
  );
}
