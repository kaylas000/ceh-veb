import { useEffect, useRef, useState } from "react";
import { EASING_CURVES, RECIPES, type Recipe } from "../data/recipes";
import { Reveal, useCountUp, useInView, useReducedMotion, useScramble } from "../lib/fx";
import { SectionHead } from "./Chrome";

/* ---------- стенд M-01 mask-reveal ---------- */

function MaskDemo() {
  const prm = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>(0.4, false);
  const [live, setLive] = useState(false);
  useEffect(() => setLive(prm || inView), [inView, prm]);
  const replay = () => {
    setLive(false);
    window.setTimeout(() => setLive(true), 90);
  };
  return (
    <div ref={ref}>
      {["МАСКА", "РЕЖЕТ СТРОКУ", "ПО КРОМКЕ"].map((l, i) => (
        <span key={l} className="line-mask">
          <span
            className={`font-display text-2xl uppercase leading-tight transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:text-3xl ${
              live ? "translate-y-0" : "translate-y-[112%]"
            } ${i === 1 ? "text-red" : "text-paper"}`}
            style={{ transitionDelay: `${i * 110}ms` }}
          >
            {l}
          </span>
        </span>
      ))}
      <button
        onClick={replay}
        className="mt-5 border border-paper/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/75 transition-colors duration-200 hover:bg-paper hover:text-ink"
      >
        ↻ повторить проход
      </button>
    </div>
  );
}

/* ---------- стенд M-04 scramble ---------- */

function ScrambleDemo() {
  const [play, setPlay] = useState(false);
  const s = useScramble("ПРИНУЖДЕНИЕ", play);
  return (
    <div
      className="cursor-pointer select-none"
      onMouseEnter={() => setPlay(true)}
      onClick={s.run}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && s.run()}
      aria-label="Демо скрэмбл-декодирования"
    >
      <p className="font-display text-3xl uppercase leading-none tracking-wide text-paper sm:text-4xl">{s.text}</p>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">
        навести / клик — собрать заново
      </p>
    </div>
  );
}

/* ---------- стенд M-05 counter ---------- */

function CounterDemo() {
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  const n = useCountUp(247, inView, 1600);
  const [gen, setGen] = useState(0);
  return (
    <div key={gen} ref={ref}>
      <p className="font-display text-6xl leading-none text-yellow">{n}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">деталей прошло ОТК · смена 2</p>
      <button
        onClick={() => setGen((g) => g + 1)}
        className="mt-4 border border-paper/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/75 transition-colors duration-200 hover:bg-paper hover:text-ink"
      >
        ↻ перещёлкнуть барабан
      </button>
    </div>
  );
}

/* ---------- стенд M-06 marquee ---------- */

function MarqueeDemo() {
  const [speed, setSpeed] = useState(16);
  const words = ["БЕЗ СЛОПА", "ПО ИСТОЧНИКАМ", "EXIT 0", "ПО ВОРОТАМ", "БЕЗ ДЕФОЛТОВ"];
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden}>
      {words.map((w) => (
        <span key={w + (hidden ? "b" : "a")} className="flex items-center">
          <span className="px-4 font-display text-sm uppercase tracking-widest text-paper">{w}</span>
          <span className="h-2 w-2 rotate-45 bg-red" />
        </span>
      ))}
    </div>
  );
  return (
    <div>
      <div className="marquee-paused overflow-hidden border-2 border-paper/30 bg-red/10 py-3">
        <div className="marquee-track flex w-max" style={{ ["--marquee-speed" as string]: `${speed}s` }}>
          {row(false)}
          {row(true)}
        </div>
      </div>
      <label className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">
        ход ленты
        <input
          type="range"
          min={6}
          max={40}
          value={46 - speed}
          onChange={(e) => setSpeed(46 - Number(e.target.value))}
          className="flex-1 accent-[#ce2c18]"
          aria-label="Скорость ленты"
        />
        <span className="w-14 text-right text-yellow">{speed}с</span>
      </label>
    </div>
  );
}

/* ---------- стенд M-08 печь (добыт из pcpolimer) ---------- */

function OvenDemo() {
  const prm = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  const temp = useCountUp(200, inView, 2400);
  const [secs, setSecs] = useState(15 * 60);
  useEffect(() => {
    if (prm || !inView) return;
    const id = window.setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 15 * 60)), 1000);
    return () => window.clearInterval(id);
  }, [prm, inView]);
  const ready = temp >= 195;
  const CIRC = Math.PI * 80;
  return (
    <div ref={ref} className="grid grid-cols-[110px_1fr] items-center gap-4">
      <svg viewBox="0 0 200 132" className="w-full">
        <path d="M 20 118 A 80 80 0 1 1 180 118" fill="none" stroke="#3a382e" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M 20 118 A 80 80 0 1 1 180 118"
          fill="none"
          stroke={ready ? "var(--color-red)" : "var(--color-yellow)"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${CIRC * Math.min(1, temp / 200)} ${CIRC}`}
        />
        <text x="100" y="92" textAnchor="middle" fill="#e8e6de" fontSize="36" fontFamily="Russo One, sans-serif">
          {temp}
        </text>
        <text x="100" y="114" textAnchor="middle" fill="#8a8578" fontSize="13" fontFamily="JetBrains Mono, monospace">
          °C
        </text>
      </svg>
      <div className="space-y-2 font-mono text-[11px]">
        <p className="flex items-center gap-2">
          <span className={`led-dot h-2 w-2 rounded-full ${ready ? "bg-green" : "bg-yellow"}`} />
          <span className={ready ? "text-green" : "text-yellow"}>{ready ? "полимеризация" : "нагрев"}</span>
        </p>
        <p className="text-paper/60">
          таймер цикла: {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
        </p>
        <p className="text-paper/60">слой: 80 мкм · уставка 200 °C</p>
      </div>
    </div>
  );
}

/* ---------- стенд M-09 конвейер-крюки (добыт из pcpolimer) ---------- */

const HOOK_COLORS = ["#ff6a2b", "#c1121c", "#2271b3", "#f7c500", "#006f3d", "#ff6a2b", "#8f8f8f", "#c1121c"];

function HooksDemo() {
  return (
    <div className="marquee-paused relative overflow-hidden border-2 border-paper/30 bg-ink-2 py-2">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-paper/25" />
      <div className="conveyor-track flex w-max items-start gap-8 pr-8" style={{ ["--belt-speed" as string]: "14s" }}>
        {[...HOOK_COLORS, ...HOOK_COLORS].map((c, i) => (
          <svg key={i} width="44" height="62" viewBox="-22 -2 44 64" className="shrink-0">
            <g className="hook-swing" style={{ animationDelay: `${(i % 4) * 0.7}s` }}>
              <line x1="0" y1="0" x2="0" y2="20" stroke="#8a8578" strokeWidth="2.5" />
              <path d="M -4 20 h 8 l -2.5 7 h -3 z" fill="#8a8578" />
              {i % 3 === 0 && <rect x="-18" y="27" width="36" height="10" fill={c} />}
              {i % 3 === 1 && <circle cx="0" cy="38" r="12" fill={c} />}
              {i % 3 === 2 && <path d="M -16 27 h 24 v 10 h -14 v 12 h -10 z" fill={c} />}
            </g>
          </svg>
        ))}
      </div>
    </div>
  );
}

/* ---------- карточка рецепта ---------- */

function RecipeCard({ r, demo, flip = false }: { r: Recipe; demo?: React.ReactNode; flip?: boolean }) {
  const [open, setOpen] = useState(false);
  const curve = EASING_CURVES.find((c) => r.easing.startsWith(c.name));
  return (
    <Reveal>
      <article className={`border-2 border-paper/25 bg-ink-2/70 transition-colors duration-300 hover:border-paper/50 ${r.mined ? "border-l-4 border-l-green" : ""}`}>
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full p-5 text-left">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="bg-red px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-paper">{r.id}</span>
            <h3 className="font-display text-lg uppercase tracking-wide text-paper sm:text-xl">{r.name}</h3>
            {r.cinematic && (
              <span className="border border-yellow px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-yellow">
                кинематографический
              </span>
            )}
            {r.mined && (
              <span className="border border-green px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-green">
                добыт: {r.mined.from}
              </span>
            )}
            <span className={`ml-auto font-display text-lg text-paper/50 transition-transform duration-300 ${open ? "rotate-45" : ""}`} aria-hidden="true">
              +
            </span>
          </div>
          <p className="mt-2 text-sm italic leading-snug text-paper/60">{r.feel}</p>
        </button>

        <div className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
          <div className="overflow-hidden">
            <div className={`grid gap-5 border-t border-paper/20 p-5 ${demo ? "lg:grid-cols-2" : ""}`}>
              <div>
                <div className="border border-line-dark bg-ink p-3.5 font-mono text-[11px] leading-relaxed text-paper/75">
                  <p><span className="text-paper/40">timing:</span></p>
                  <p className="pl-4"><span className="text-yellow">duration:</span> {r.duration}</p>
                  <p className="pl-4">
                    <span className="text-yellow">easing:</span> {r.easing.split(" ")[0]}{" "}
                    <span className="text-paper/40"># {curve ? curve.css : r.easing}</span>
                  </p>
                  <p className="pl-4"><span className="text-yellow">stagger:</span> {r.stagger}</p>
                  <p className="mt-1"><span className="text-paper/40">max_per_page:</span> <span className="text-red">{r.maxPerPage}</span></p>
                  <p><span className="text-paper/40">dont_combine_with:</span> {r.dontCombine}</p>
                </div>
                <p className="mt-3 text-[13px] leading-snug text-paper/80">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/40">use_when · </span>
                  {r.useWhen}
                </p>
                {r.mined && (
                  <p className="mt-3 border-l-2 border-green pl-3 text-[12px] leading-snug text-paper/65">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-green">вывод в архив · </span>
                    {r.mined.yieldNote}
                  </p>
                )}
                <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-paper/40">{r.liveNote}</p>
              </div>
              {demo && <div className="flex flex-col justify-center">{demo}</div>}
            </div>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

export function Motion() {
  return (
    <section id="dvizhenie" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHead
              dark
              num="02"
              kicker="motion-цех"
              lines={[
                <>{RECIPES.length} рецептов движения,</>,
                <span key="m" className="text-paper/50">{RECIPES.filter((r) => r.mined).length} добытых в бою</span>
              ]}
            />
            <Reveal delay={140}>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-paper/70">
                Каждый рецепт — <span className="font-mono text-[13px]">recipe.yaml + snippet.js + demo.html</span>: берётся в
                проект целиком, не переписывается. Браузерные дефолты запрещены (B-02) — кривые только из реестра.
              </p>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <div className="border-2 border-paper/25 bg-ink-2 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-yellow">motion/easing-curves.json</p>
              <ul className="mt-2 space-y-1 font-mono text-[11px] text-paper/70">
                {EASING_CURVES.map((c) => (
                  <li key={c.name} className="flex flex-wrap gap-x-2">
                    <span className="text-red">{c.name}</span>
                    <span className="text-paper/40">{c.css}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 space-y-5">
          <RecipeCard r={RECIPES[0]} demo={<MaskDemo />} />
          <RecipeCard r={RECIPES[1]} />
          <RecipeCard r={RECIPES[2]} />
          <RecipeCard r={RECIPES[3]} demo={<ScrambleDemo />} />
          <RecipeCard r={RECIPES[4]} demo={<CounterDemo />} />
          <RecipeCard r={RECIPES[5]} demo={<MarqueeDemo />} />
          <RecipeCard r={RECIPES[6]} />
          <RecipeCard r={RECIPES[7]} demo={<OvenDemo />} />
          <RecipeCard r={RECIPES[8]} demo={<HooksDemo />} />
          <RecipeCard r={RECIPES[9]} />
          <RecipeCard r={RECIPES[10]} />
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45">
          живой стенд M-10 — раздел 06 «Сборочная линия»: скролл крутит плёнку, линейка перематывает
        </p>
      </div>
    </section>
  );
}
