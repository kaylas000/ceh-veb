import { useEffect, useRef, useState } from "react";
import { RECIPES, EASING_CURVES, type Recipe } from "../data/recipes";
import { MaskTitle, Reveal, useInView, useReducedMotion, useScramble } from "../lib/motion";
import { COLLAGE_URL } from "../data/fixtures";

/* ---------- стенд-обёртка ---------- */

function Bench({
  r,
  demo,
  flip = false,
}: {
  r: Recipe;
  demo: React.ReactNode;
  flip?: boolean;
}) {
  const curve = EASING_CURVES.find((c) => c.name === r.easing);
  return (
    <Reveal>
      <article className="border-2 border-paper/25 bg-ink-2/70">
        <div className={`grid ${flip ? "lg:grid-cols-[1fr_1.25fr]" : "lg:grid-cols-[1.25fr_1fr]"}`}>
          {/* спецификация */}
          <div className={`border-paper/25 p-5 sm:p-6 ${flip ? "lg:order-2 lg:border-l-2" : "lg:border-r-2"}`}>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="bg-red px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-paper">
                {r.id}
              </span>
              <h3 className="font-display text-xl uppercase tracking-wide text-paper sm:text-2xl">{r.name}</h3>
              {r.cinematic && (
                <span className="border border-yellow px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-yellow">
                  кинематографический
                </span>
              )}
            </div>
            <p className="mt-3 text-sm italic leading-snug text-paper/60">{r.feel}</p>
            <div className="mt-4 border border-line-dark bg-ink p-3.5 font-mono text-[11px] leading-relaxed text-paper/75">
              <p><span className="text-muted-2">timing:</span></p>
              <p className="pl-4"><span className="text-yellow">duration:</span> {r.duration}</p>
              <p className="pl-4">
                <span className="text-yellow">easing:</span> {r.easing}{" "}
                <span className="text-muted-2"># {curve ? curve.css : ""}</span>
              </p>
              <p className="pl-4"><span className="text-yellow">stagger:</span> {r.stagger}</p>
              <p className="mt-1"><span className="text-muted-2">max_per_page:</span> <span className="text-red">{r.maxPerPage}</span></p>
              <p><span className="text-muted-2">dont_combine_with:</span> {r.dontCombine}</p>
            </div>
            <p className="mt-4 text-[13px] leading-snug text-paper/80">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-2">use_when · </span>
              {r.useWhen}
            </p>
          </div>
          {/* демо */}
          <div className="relative flex min-h-[280px] flex-col border-t-2 border-paper/25 bg-ink lg:border-t-0">
            <div className="flex items-center justify-between border-b border-line-dark px-4 py-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-2">
                испытательный стенд {r.id}
              </span>
              <span className="led-dot h-1.5 w-1.5 rounded-full bg-green" />
            </div>
            <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">{demo}</div>
            <div className="border-t border-line-dark px-4 py-2 font-mono text-[9px] uppercase tracking-wider text-muted-2">
              {r.liveNote}
            </div>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

/* ---------- демо M-01 mask-reveal ---------- */

function MaskDemo() {
  const prm = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>(0.5, false);
  const [live, setLive] = useState(false);
  useEffect(() => {
    setLive(prm ? true : inView);
  }, [inView, prm]);
  const replay = () => {
    setLive(false);
    window.setTimeout(() => setLive(true), 80);
  };
  const lines = ["МАСКА", "РЕЖЕТ СТРОКУ", "ПО КРОМКЕ"];
  return (
    <div ref={ref} className={live ? "mask-live" : ""}>
      {lines.map((l, i) => (
        <span key={l} className="mask-line">
          <span
            className="mask-inner font-display text-[clamp(1.6rem,3.6vw,2.6rem)] uppercase leading-[1.04] text-paper"
            style={{ ["--m-delay" as string]: `${i * 110}ms`, color: i === 1 ? "var(--color-red)" : undefined }}
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

/* ---------- демо M-03 sticky-scene (мини) ---------- */

const STEPS = [
  { t: "Загрузка заготовок", d: "Бриф и SEED.md ложатся на стол. Оси розданы — назад не сдвинуть." },
  { t: "Обработка резцом", d: "Дизайнер снимает лишнее по SOURCES.md: каждый рез имеет источник." },
  { t: "Контроль ОТК", d: "validate.mjs прогоняет деталь сквозь V-01…V-10. Без клейма не выходит." },
  { t: "Отгрузка", d: "REVIEW.md подписан артдиректором. Деталь уходит в принятые проекты." },
];

function StickyMini() {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLLIElement | null>>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActive(idx);
          }
        }
      },
      { threshold: 0.65 },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
      <div className="sm:sticky sm:top-24 sm:self-start">
        <div className="border-2 border-paper/30 bg-ink-2 p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-2">закреплённая сцена</p>
          <p className="mt-2 font-display text-2xl uppercase leading-none text-red">
            Шаг {active + 1}/4
          </p>
          <p className="mt-2 font-display text-base uppercase text-paper">{STEPS[active].t}</p>
          <div className="mt-3 flex gap-1">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 transition-colors duration-300 ${i <= active ? "bg-red" : "bg-line-dark"}`} />
            ))}
          </div>
        </div>
      </div>
      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li
            key={s.t}
            data-idx={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`border p-3.5 transition-all duration-500 ${
              i === active ? "border-red bg-paper/5 opacity-100" : "border-line-dark opacity-40"
            }`}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-yellow">{String(i + 1).padStart(2, "0")} · {s.t}</p>
            <p className="mt-1.5 text-[13px] leading-snug text-paper/75">{s.d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- демо M-04 scramble ---------- */

function ScrambleDemo() {
  const [play, setPlay] = useState(false);
  const s = useScramble("ПРИНУЖДЕНИЕ", play);
  return (
    <div
      className="cursor-pointer select-none"
      onMouseEnter={() => setPlay(true)}
      onClick={() => s.run()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && s.run()}
      aria-label="Демо скрэмбл-декодирования: наведите или нажмите"
    >
      <p className="font-display text-[clamp(1.7rem,4vw,3rem)] uppercase leading-none tracking-wide text-paper">
        {s.text}
      </p>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-2">
        навести / клик — собрать заново · 2 кадра на символ
      </p>
    </div>
  );
}

/* ---------- демо M-05 counter ---------- */

function CounterDemo() {
  const [gen, setGen] = useState(0);
  return (
    <div key={gen}>
      <div className="grid grid-cols-3 gap-3">
        {[
          { v: 30, l: "референсов к v1" },
          { v: 6, l: "рецептов сида" },
          { v: 10, l: "V-проверок" },
        ].map((c) => (
          <CounterCell key={c.l} v={c.v} l={c.l} />
        ))}
      </div>
      <button
        onClick={() => setGen((g) => g + 1)}
        className="mt-5 border border-paper/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/75 transition-colors duration-200 hover:bg-paper hover:text-ink"
      >
        ↻ перещёлкнуть барабан
      </button>
    </div>
  );
}

function CounterCell({ v, l }: { v: number; l: string }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.5);
  const prm = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prm) {
      setN(v);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1200);
      setN(Math.round((1 - Math.pow(1 - p, 4)) * v));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, v, prm]);
  return (
    <div ref={ref} className="border border-line-dark bg-ink-2 px-3 py-4 text-center">
      <p className="font-display text-4xl leading-none text-yellow">{n}</p>
      <p className="mt-2 font-mono text-[9px] uppercase leading-snug tracking-[0.14em] text-muted-2">{l}</p>
    </div>
  );
}

/* ---------- демо M-06 marquee ---------- */

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
      <label className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-2">
        ход конвейера
        <input
          type="range"
          min={6}
          max={40}
          value={46 - speed}
          onChange={(e) => setSpeed(46 - Number(e.target.value))}
          className="flex-1 accent-[#ce2c18]"
          aria-label="Скорость ленты"
        />
        <span className="w-14 text-right text-yellow">{speed}с/цикл</span>
      </label>
      <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-muted-2">наведение — пауза (цеховой стоп-кран)</p>
    </div>
  );
}

/* ---------- секция ---------- */

export function MotionLab() {
  return (
    <section id="dvizhenie" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">04 / motion-цех</p>
            <MaskTitle
              className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.95]"
              lines={[<>Шесть рецептов,</>, <span key="x" className="text-paper/55">ни одного дефолта</span>]}
            />
          </div>
          <Reveal delay={140}>
            <div className="max-w-sm border border-line-dark bg-ink-2 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-yellow">motion/easing-curves.json</p>
              <ul className="mt-2 space-y-1 font-mono text-[11px] text-paper/70">
                {EASING_CURVES.map((c) => (
                  <li key={c.name} className="flex flex-wrap gap-x-2">
                    <span className="text-red">{c.name}</span>
                    <span className="text-muted-2">{c.css}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 space-y-6">
          <Bench r={RECIPES[0]} demo={<MaskDemo />} />
          <Bench
            r={RECIPES[1]}
            flip
            demo={
              <div className="relative overflow-hidden border-2 border-paper/30">
                <div className="relative aspect-[16/8] overflow-hidden">
                  <img src={COLLAGE_URL} alt="Коллаж под кен-бёрнс: камера медленно дышит" className="kenburns-img absolute inset-0 h-full w-full object-cover" />
                </div>
                <span className="absolute bottom-2 left-2 bg-ink/85 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-paper/85">
                  12–18с · ceh-coast · alternate
                </span>
              </div>
            }
          />
          <Bench r={RECIPES[2]} demo={<StickyMini />} />
          <Bench r={RECIPES[3]} flip demo={<ScrambleDemo />} />
          <Bench r={RECIPES[4]} demo={<CounterDemo />} />
          <Bench r={RECIPES[5]} flip demo={<MarqueeDemo />} />
        </div>
      </div>
    </section>
  );
}

