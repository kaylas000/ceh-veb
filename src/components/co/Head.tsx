import { useEffect, useState } from "react";
import { COMPANY, RAL, type RalColor } from "../../data/company";
import { MaskLines, Reveal, Stars, useCountUp, useInView, useReducedMotion } from "../../lib/fx";
import { useZipDownload, zipLabel } from "../../lib/zip";

const NAV = [
  { href: "#palitra", label: "Палитра", n: "01" },
  { href: "#prays", label: "Прайс", n: "02" },
  { href: "#tehnologia", label: "Технология", n: "03" },
  { href: "#otk", label: "ОТК", n: "04" },
  { href: "#raboty", label: "Работы", n: "05" },
  { href: "#kontakty", label: "Контакты", n: "06" },
];

/* ---------- конвейер с крюками ---------- */

function HookPart({ color, kind }: { color: string; kind: number }) {
  return (
    <g className="hook-swing" style={{ animationDelay: `${kind * 0.7}s` }}>
      <line x1="0" y1="0" x2="0" y2="26" stroke="#8f96a3" strokeWidth="2.5" />
      <path d="M -5 26 h 10 l -3 8 h -4 z" fill="#8f96a3" />
      {kind % 4 === 0 && <rect x="-26" y="34" width="52" height="12" rx="2" fill={color} />}
      {kind % 4 === 1 && <path d="M -22 34 h 30 v 12 h -18 v 16 h -12 z" fill={color} />}
      {kind % 4 === 2 && (
        <>
          <circle cx="0" cy="50" r="17" fill={color} />
          <circle cx="0" cy="50" r="6.5" fill="#17181c" />
        </>
      )}
      {kind % 4 === 3 && <path d="M -24 34 h 48 v 8 h -18 v 14 h 18 v 8 h -48 v -8 h 18 v -14 h -18 z" fill={color} />}
    </g>
  );
}

function Conveyor({ color }: { color: string }) {
  const colors = [color, "#383e42", color, "#f7c500", "#2271b3", color, "#c1121c", "#8f8f8f"];
  return (
    <div className="relative mt-5 overflow-hidden border-t border-steel pt-3">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-steel-2" />
      <div className="conveyor-track flex w-max items-start gap-10 pr-10" style={{ ["--belt-speed" as string]: "16s" }}>
        {[...colors, ...colors].map((c, i) => (
          <svg key={i} width="56" height="78" viewBox="-28 -2 56 80" className="shrink-0">
            <HookPart color={c} kind={i} />
          </svg>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-coal to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-coal to-transparent" />
    </div>
  );
}

/* ---------- печь полимеризации ---------- */

function OvenPanel({ selected }: { selected: RalColor }) {
  const prm = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const temp = useCountUp(200, inView, 2600);
  const [secs, setSecs] = useState(14 * 60 + 32);
  useEffect(() => {
    if (prm || !inView) return;
    const id = window.setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 14 * 60 + 32)), 1000);
    return () => window.clearInterval(id);
  }, [prm, inView]);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const ready = temp >= 195;

  const CIRC = Math.PI * 80;
  const frac = Math.min(1, temp / 200);

  return (
    <div ref={ref} className="relative border-2 border-steel bg-coal-2 shadow-[10px_10px_0_rgba(0,0,0,0.35)]">
      {/* шапка печи */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b-2 border-steel px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fog">Печь полимеризации · камера 2</span>
        <span className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest ${ready ? "text-ok" : "text-amber"}`}>
          <span className={`led-dot h-2 w-2 rounded-full ${ready ? "bg-ok shadow-[0_0_8px_rgba(76,154,99,0.9)]" : "bg-amber shadow-[0_0_8px_rgba(255,179,92,0.9)]"}`} />
          {ready ? "полимеризация" : "нагрев"}
        </span>
      </div>

      <div className="scanline relative grid gap-3 overflow-hidden p-4 sm:grid-cols-[150px_1fr] sm:gap-4 sm:p-5">
        <div className="heat-breathe pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_100%,rgba(255,106,43,0.16),transparent_70%)]" />
        {/* шкала */}
        <div className="relative mx-auto w-[118px] sm:w-[150px]">
          <svg viewBox="0 0 200 132" className="h-auto w-full">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const a = Math.PI * (1 + t);
              const x1 = 100 + Math.cos(a) * 70;
              const y1 = 118 + Math.sin(a) * 70;
              const x2 = 100 + Math.cos(a) * 82;
              const y2 = 118 + Math.sin(a) * 82;
              return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4b505c" strokeWidth="2.5" />;
            })}
            <path d="M 20 118 A 80 80 0 1 1 180 118" fill="none" stroke="#2b2e37" strokeWidth="10" strokeLinecap="round" />
            <path
              d="M 20 118 A 80 80 0 1 1 180 118"
              fill="none"
              stroke={ready ? "var(--color-heat)" : "var(--color-amber)"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${CIRC * frac} ${CIRC}`}
              style={{ transition: prm ? "none" : "stroke-dasharray 0.25s linear" }}
            />
            <text x="100" y="92" textAnchor="middle" fill="#f1f1ea" fontSize="34" fontFamily="Tektur, sans-serif" fontWeight="700">
              {temp}
            </text>
            <text x="100" y="114" textAnchor="middle" fill="#9aa1ad" fontSize="13" fontFamily="JetBrains Mono, monospace">
              °C
            </text>
          </svg>
        </div>
        {/* телеметрия */}
        <div className="relative grid grid-cols-2 gap-2 font-mono text-[11px]">
          <div className="border border-steel bg-coal px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-fog-2">таймер цикла</p>
            <p className="mt-1 text-lg font-bold text-concrete">{mm}:{ss}</p>
          </div>
          <div className="border border-steel bg-coal px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-fog-2">слой</p>
            <p className="mt-1 text-lg font-bold text-concrete">80 мкм</p>
          </div>
          <div className="col-span-2 min-w-0 border border-steel bg-coal px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-fog-2">в камере сейчас</p>
            <p className="mt-1 flex min-w-0 items-center gap-2.5 text-sm font-bold text-concrete">
              <span className="h-4 w-4 shrink-0 border border-steel-2" style={{ background: selected.hex }} />
              <span className="min-w-0 break-words">{selected.code} · {selected.name}</span>
            </p>
          </div>
        </div>
      </div>

      <Conveyor color={selected.hex} />
      <div className="hazard h-1.5" aria-hidden="true" />
    </div>
  );
}

/* ---------- шапка + паспорт заказа ---------- */

export function Head({ selected }: { selected: RalColor }) {
  const prm = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const zip = useZipDownload();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header id="pasport" className="relative bg-coal text-concrete">
      <div className="bg-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="heat-glow pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* ---------- МОБИЛЬНАЯ ШАПКА: один ряд + выезжающее меню ---------- */}
      <div className="fixed inset-x-0 top-[34px] z-50 lg:hidden">
        <div className="border-b border-steel/70 bg-coal/95 backdrop-blur-sm">
          <div className="flex h-14 items-center gap-2.5 px-3.5">
            <a href="#pasport" className="flex min-w-0 items-center gap-2" onClick={() => setMenuOpen(false)}>
              <span className="grid h-8 w-8 shrink-0 place-items-center bg-heat font-display text-[11px] font-bold leading-none text-coal">PC</span>
              <span className="truncate font-display text-[12px] tracking-[0.16em] text-concrete">POLIMER</span>
            </a>
            <a
              href={COMPANY.phoneHref}
              className="ml-auto grid h-9 w-9 shrink-0 place-items-center border border-steel-2 text-heat transition-colors hover:bg-heat hover:text-coal"
              aria-label={`Позвонить: ${COMPANY.phone}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4.5 4.5c0 8.3 6.7 15 15 15l1.8-3.6-4-2-1.9 1.9c-3-1.2-5-3.2-6.2-6.2l1.9-1.9-2-4z" strokeLinejoin="round" />
              </svg>
            </a>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
              className="grid h-9 w-9 shrink-0 place-items-center border border-steel-2 transition-colors hover:border-concrete"
            >
              <span className="flex flex-col gap-[5px]">
                <span className={`block h-0.5 w-5 bg-concrete transition-transform duration-300 ${menuOpen ? "translate-y-[3.5px] rotate-45" : ""}`} />
                <span className={`block h-0.5 w-5 bg-concrete transition-transform duration-300 ${menuOpen ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
              </span>
            </button>
          </div>
          <div className="border-t border-steel/50 bg-coal/95 px-3.5 py-1.5">
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-fog">
              <span className="text-heat">цех:</span> {COMPANY.address} · {COMPANY.hours}
            </p>
          </div>
        </div>

        {/* выезжающее меню */}
        <div
          className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ gridTemplateRows: menuOpen ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <nav className="border-b-2 border-steel bg-coal-2/95 px-4 pb-5 pt-1 shadow-[0_18px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between border-b border-steel/50 py-3.5 font-display text-lg font-bold uppercase tracking-wide text-concrete transition-colors active:text-heat"
                >
                  {n.label}
                  <span className="font-mono text-[11px] text-heat">{n.n} →</span>
                </a>
              ))}
              <a
                href="#kalkulator"
                onClick={() => setMenuOpen(false)}
                className="mt-4 block border-2 border-heat bg-heat px-4 py-3.5 text-center font-display text-base font-bold uppercase tracking-[0.12em] text-coal"
              >
                Рассчитать стоимость
              </a>
              <button
                onClick={() => {
                  zip.run();
                  setMenuOpen(false);
                }}
                className="mt-2 block w-full border-2 border-amber px-4 py-3.5 text-center font-display text-base font-bold uppercase tracking-[0.12em] text-amber"
              >
                {zipLabel(zip.state)}
              </button>
              <div className="mt-4 space-y-1 font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-fog">
                <p>{COMPANY.address}</p>
                <p>{COMPANY.hours}</p>
                <a href={COMPANY.phoneHref} className="block font-bold text-concrete">{COMPANY.phone}</a>
                <a href={COMPANY.phone2Href} className="block text-concrete">{COMPANY.phone2}</a>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* ---------- ДЕСКТОПНАЯ ШАПКА: служебная строка + навигация ---------- */}
      <div
        className={`fixed inset-x-0 top-[34px] z-40 hidden border-b border-steel/70 bg-coal/95 shadow-[0_2px_16px_rgba(0,0,0,0.35)] backdrop-blur-sm lg:block ${
          scrolled && !prm ? "-translate-y-9" : ""
        }`}
        style={{ transition: "transform 0.5s cubic-bezier(0.65, 0, 0.15, 1)" }}
      >
        {/* верхняя техническая строка */}
        <div className="border-b border-steel/60">
          <div className="mx-auto flex h-9 max-w-[1400px] items-center gap-4 px-6 font-mono text-[10px] uppercase tracking-[0.18em] text-fog">
            <span className="shrink-0 text-heat">Pcpolimer</span>
            <span className="shrink-0 text-concrete">{COMPANY.address}</span>
            <span className="hidden shrink-0 xl:inline">{COMPANY.hours}</span>
            <span className="ml-auto flex shrink-0 items-center gap-3">
              <a href={COMPANY.phoneHref} className="text-concrete transition-colors hover:text-heat">
                {COMPANY.phone}
              </a>
              <span className="hidden text-steel-2 sm:inline" aria-hidden="true">·</span>
              <a href={COMPANY.phone2Href} className="hidden text-concrete transition-colors hover:text-heat sm:inline">
                {COMPANY.phone2}
              </a>
            </span>
          </div>
        </div>

        {/* навигация */}
        <nav>
          <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-1 px-6">
            <a href="#pasport" className="mr-4 flex shrink-0 items-center gap-2">
              <span className="grid h-7 w-7 place-items-center bg-heat font-display text-[10px] font-bold leading-none text-coal">PC</span>
              <span className="font-display text-[13px] tracking-[0.2em] text-concrete">POLIMER</span>
            </a>
            <div className="flex flex-1 items-center gap-1">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className="group shrink-0 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fog transition-colors duration-200 hover:bg-concrete hover:text-coal"
                >
                  <span className="mr-1 text-heat group-hover:text-heat-2">{n.n}</span>
                  {n.label}
                </a>
              ))}
            </div>
            <a
              href="#kalkulator"
              className="press-ready ml-2 shrink-0 border-2 border-heat bg-heat px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-coal transition-colors duration-200 hover:bg-transparent hover:text-heat"
            >
              Рассчитать
            </a>
            <button
              onClick={zip.run}
              disabled={zip.state === "busy"}
              className="ml-1 shrink-0 border-2 border-amber px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-amber transition-colors duration-200 hover:bg-amber hover:text-coal disabled:cursor-wait disabled:opacity-60"
              title="Скачать готовый сайт архивом ZIP"
            >
              {zip.state === "busy" ? "Упаковка…" : zip.state === "done" ? "✓ Скачано" : "↓ ZIP"}
            </button>
          </div>
        </nav>
      </div>

      {/* паспорт заказа */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 pb-10 pt-[96px] sm:px-6 sm:pt-[100px] lg:pb-20 lg:pt-[136px]">
        <div className="grid items-start gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <Reveal>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-fog sm:text-[11px] sm:tracking-[0.22em]">
                <span className="border border-steel-2 px-2 py-0.5">Наряд № 2026-0218</span>
                <span className="hidden min-[360px]:inline">цех полимерных покрытий · Красногорск</span>
              </p>
            </Reveal>

            <h1 className="mt-4 sm:mt-6">
              <MaskLines
                className="font-display text-[clamp(1.62rem,7.2vw,5.6rem)] font-black uppercase leading-[0.94] tracking-tight break-words"
                lines={[
                  <>Порошковая</>,
                  <span key="p" className="text-heat">покраска</span>,
                  <>металла</>,
                ]}
                stagger={130}
              />
            </h1>

            <Reveal delay={380}>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-fog sm:mt-6 sm:text-lg">
                Полимерное покрытие в <span className="font-semibold text-concrete">любой цвет каталога RAL</span> — от
                профиля до ворот. Печь до 200&nbsp;°C, слой 60–120&nbsp;мкм, приёмка деталей ежедневно.
              </p>
            </Reveal>

            <Reveal delay={460}>
              <div className="mt-5 flex flex-col items-stretch gap-2.5 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <a
                  href="#kalkulator"
                  className="border-2 border-heat bg-heat px-6 py-3 text-center font-display text-sm font-bold uppercase tracking-[0.12em] text-coal transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(255,106,43,0.4)] sm:py-3.5"
                >
                  Рассчитать стоимость
                </a>
                <a
                  href="#palitra"
                  className="border-2 border-steel-2 px-6 py-3 text-center font-display text-sm font-bold uppercase tracking-[0.12em] text-concrete transition-all duration-200 hover:-translate-y-0.5 hover:border-concrete hover:bg-concrete hover:text-coal sm:py-3.5"
                >
                  Палитра RAL
                </a>
                <span className="flex items-center justify-center gap-2 border border-steel bg-coal-2/70 px-3 py-2.5 sm:justify-start">
                  <Stars value={COMPANY.rating} className="text-amber" />
                  <span className="font-mono text-xs font-bold text-concrete">{COMPANY.rating}</span>
                  <span className="font-mono text-[10px] text-fog">{COMPANY.ratingsCount} оценок</span>
                </span>
              </div>
            </Reveal>

            <Reveal delay={540}>
              <dl className="mt-7 grid max-w-xl grid-cols-2 gap-px border-2 border-steel bg-steel sm:mt-10 sm:grid-cols-4">
                {[
                  ["200 °C", "камера полимеризации"],
                  ["60–120", "мкм слой"],
                  ["1000+", "цветов RAL"],
                  ["от 100 ₽", "цена погонного метра"],
                ].map(([v, l]) => (
                  <div key={l} className="min-w-0 bg-coal-2 px-3 py-2.5 sm:px-3.5 sm:py-3">
                    <dt className="font-display text-base font-bold leading-none text-concrete sm:text-lg">{v}</dt>
                    <dd className="mt-1.5 font-mono text-[8px] uppercase leading-tight tracking-[0.12em] text-fog-2 sm:text-[9px] sm:tracking-[0.14em]">{l}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <Reveal delay={250} className="min-w-0 lg:mt-4">
            <OvenPanel selected={selected} />
            <p className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fog-2">
              <span className="min-w-0">цвет на линии — ваш выбор из палитры</span>
              <a href="#palitra" className="shrink-0 text-heat transition-colors hover:text-amber">сменить ↓</a>
            </p>
          </Reveal>
        </div>
      </div>

      {/* RAL-лента */}
      <div className="marquee-paused relative z-10 overflow-hidden border-y-2 border-steel bg-coal-2 py-2.5">
        <div className="marquee-track flex w-max items-center" style={{ ["--marquee-speed" as string]: "38s" }}>
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
              {RAL.map((c) => (
                <span key={c.code + dup} className="flex items-center">
                  <span className="ml-5 h-3 w-3 border border-steel-2" style={{ background: c.hex }} />
                  <span className="px-2 font-mono text-[11px] uppercase tracking-[0.18em] text-fog">{c.code}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
