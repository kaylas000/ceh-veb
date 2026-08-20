import { useEffect, useRef, useState } from "react";
import { MaskTitle, Reveal, useReducedMotion } from "../lib/motion";
import { scrollToY } from "../lib/smooth";

/* ------------------------------------------------------------------ */
/* МОНТАЖНАЯ ЛИНИЯ — длинная кинематографическая сцена.                */
/* Архитектура по канону видеопродакшена:                              */
/*  · master-timeline 0→1, привязанный к скроллу (pin + scrub)         */
/*  · демпфирование progress (инерция ≈ scrub:1)                       */
/*  · процедурная image-sequence: 150 кадров на canvas                 */
/*  · trail-накопление = motion blur, виньетка = постобработка         */
/*  · state machine штампа ОТК: idle → charge → strike → done          */
/*  · рендер только пока секция во вьюпорте (виртуализация)            */
/* ------------------------------------------------------------------ */

const FRAMES = 150;

const ACTS = [
  {
    n: "I",
    t: "Заготовка",
    d: "Бриф и SEED.md ложатся на ленту. Оси розданы roulette.mjs — назад их не сдвинуть.",
    from: 0.03,
    to: 0.3,
  },
  {
    n: "II",
    t: "Обработка",
    d: "G1 и G2 режут лишнее: направление и структура проходят ворота по чек-листу.",
    from: 0.34,
    to: 0.68,
  },
  {
    n: "III",
    t: "Контроль",
    d: "G3 и G4: движение сверено с easing-curves.json, валидатор зелёный, ОТК ставит клеймо.",
    from: 0.72,
    to: 0.97,
  },
];

const GATES = [
  { code: "G1", hit: 0.4 },
  { code: "G2", hit: 0.54 },
  { code: "G3", hit: 0.76 },
  { code: "G4", hit: 0.9 },
];

const LABELS = [
  { text: "SEED.md", sub: "заготовка", from: 0, to: 0.36 },
  { text: "DIRECTION.md", sub: "направление", from: 0.36, to: 0.56 },
  { text: "SOURCES.md + site/", sub: "сборка", from: 0.56, to: 0.78 },
  { text: "REVIEW.md", sub: "exit 0", from: 0.78, to: 1.02 },
];

type PressState = "idle" | "charge" | "strike" | "done";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const winOpacity = (from: number, to: number, p: number, f = 0.035) =>
  Math.min(smoothstep(from - f, from + f, p), 1 - smoothstep(to - f, to + f, p));

/* ---------- процедурный кадр «плёнки» ---------- */

function drawFrame(canvas: HTMLCanvasElement, p: number, hardClear: boolean, dpr: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  if (w === 0 || h === 0) return;

  /* trail-накопление: полупрозрачная заливка вместо clearRect = motion blur */
  ctx.fillStyle = hardClear ? "#14120c" : "rgba(20,18,12,0.42)";
  ctx.fillRect(0, 0, w, h);

  /* чертёжная сетка */
  ctx.strokeStyle = "rgba(232,230,222,0.045)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < w; x += 44 * dpr) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y < h; y += 44 * dpr) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  /* конвейерная лента */
  const by = h * 0.74;
  ctx.strokeStyle = "rgba(232,230,222,0.35)";
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(0, by);
  ctx.lineTo(w, by);
  ctx.moveTo(0, by + 13 * dpr);
  ctx.lineTo(w, by + 13 * dpr);
  ctx.stroke();
  const off = (p * w * 3) % (44 * dpr);
  ctx.strokeStyle = "rgba(232,230,222,0.16)";
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  for (let x = -off; x < w; x += 44 * dpr) {
    ctx.moveTo(x, by + 2 * dpr);
    ctx.lineTo(x + 11 * dpr, by + 11 * dpr);
  }
  ctx.stroke();

  /* маховик */
  gear(ctx, w * 0.85, h * 0.24, Math.min(w, h) * 0.15, 14, p * Math.PI * 4, dpr);
  gear(ctx, w * 0.68, h * 0.13, Math.min(w, h) * 0.07, 10, -p * Math.PI * 6.4, dpr);

  /* пресс-виброузел */
  const px = w * 0.3;
  const vib = Math.sin(p * Math.PI * 14) * 5 * dpr;
  const ramY = h * 0.16 + vib + Math.sin(p * Math.PI * 6) * h * 0.045;
  ctx.strokeStyle = "rgba(232,230,222,0.22)";
  ctx.lineWidth = 1.5 * dpr;
  ctx.strokeRect(px - 26 * dpr, h * 0.05, 52 * dpr, h * 0.42);
  ctx.beginPath();
  ctx.moveTo(px, h * 0.05);
  ctx.lineTo(px, ramY);
  ctx.stroke();
  ctx.fillStyle = "#2f2c22";
  ctx.fillRect(px - 34 * dpr, ramY, 68 * dpr, 24 * dpr);
  ctx.strokeStyle = "rgba(232,230,222,0.5)";
  ctx.strokeRect(px - 34 * dpr, ramY, 68 * dpr, 24 * dpr);

  /* тахометр прогресса */
  const gx = w * 0.11;
  const gy = h * 0.3;
  const gR = Math.min(w, h) * 0.09;
  const a0 = Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  ctx.lineWidth = 3 * dpr;
  ctx.strokeStyle = "rgba(232,230,222,0.18)";
  ctx.beginPath();
  ctx.arc(gx, gy, gR, a0, a0 + sweep);
  ctx.stroke();
  ctx.strokeStyle = "#e0a91c";
  ctx.beginPath();
  ctx.arc(gx, gy, gR, a0, a0 + Math.max(0.001, sweep * p));
  ctx.stroke();
  const na = a0 + sweep * p;
  ctx.strokeStyle = "#ce2c18";
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + Math.cos(na) * gR * 0.8, gy + Math.sin(na) * gR * 0.8);
  ctx.stroke();
  ctx.fillStyle = "rgba(232,230,222,0.55)";
  ctx.font = `${11 * dpr}px "JetBrains Mono", monospace`;
  ctx.fillText(`${Math.round(p * 100)}%`, gx - 12 * dpr, gy + gR + 18 * dpr);

  /* телеметрия кадра */
  const frame = Math.round(p * (FRAMES - 1));
  ctx.fillStyle = "rgba(224,169,28,0.85)";
  ctx.font = `500 ${11 * dpr}px "JetBrains Mono", monospace`;
  ctx.fillText(`КАДР ${String(frame).padStart(3, "0")}/${FRAMES - 1}`, 14 * dpr, h - 96 * dpr);
  ctx.fillStyle = "rgba(232,230,222,0.35)";
  ctx.fillText(`p=${p.toFixed(3)} · scrub · trail=blur`, 14 * dpr, h - 80 * dpr);

  /* виньетка (постобработка) */
  const vg = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(8,7,5,0.52)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

function gear(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  teeth: number,
  angle: number,
  dpr: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.lineWidth = 2 * dpr;
  ctx.strokeStyle = "rgba(232,230,222,0.4)";
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const b0 = (i / teeth) * Math.PI * 2;
    const b1 = ((i + 0.45) / teeth) * Math.PI * 2;
    ctx.moveTo(Math.cos(b0) * R, Math.sin(b0) * R);
    ctx.lineTo(Math.cos(b0) * (R + 9 * dpr), Math.sin(b0) * (R + 9 * dpr));
    ctx.lineTo(Math.cos(b1) * (R + 9 * dpr), Math.sin(b1) * (R + 9 * dpr));
    ctx.lineTo(Math.cos(b1) * R, Math.sin(b1) * R);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(224,169,28,0.55)";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const b = (i / 4) * Math.PI * 2;
    ctx.moveTo(Math.cos(b) * R * 0.22, Math.sin(b) * R * 0.22);
    ctx.lineTo(Math.cos(b) * R * 0.92, Math.sin(b) * R * 0.92);
  }
  ctx.stroke();
  ctx.restore();
}

/* ---------- state machine штампа ОТК ---------- */

function usePress(armed: boolean, prm: boolean) {
  const [state, setState] = useState<PressState>("idle");
  const [shaking, setShaking] = useState(false);
  const [splats, setSplats] = useState<Array<{ id: number; x: number; y: number; s: number; sx: number; sy: number }>>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const strike = () => {
    if (state !== "idle" || !armed) return;
    if (prm) {
      setState("done");
      return;
    }
    setState("charge");
    timers.current.push(
      window.setTimeout(() => setState("strike"), 540),
      window.setTimeout(() => {
        setState("done");
        setShaking(true);
        setSplats(
          Array.from({ length: 14 }, (_, i) => ({
            id: Date.now() + i,
            x: 34 + Math.random() * 32,
            y: 34 + Math.random() * 32,
            s: 3 + Math.random() * 7,
            sx: (Math.random() - 0.5) * 150,
            sy: (Math.random() - 0.5) * 120,
          })),
        );
        timers.current.push(window.setTimeout(() => setShaking(false), 400));
        timers.current.push(window.setTimeout(() => setSplats([]), 800));
      }, 690),
    );
  };

  return { state, strike, shaking, splats };
}

function PressPanel({
  state,
  armed,
  strike,
  prm,
}: {
  state: PressState;
  armed: boolean;
  strike: () => void;
  prm: boolean;
}) {
  const leds: Array<{ k: PressState | "ready"; label: string }> = [
    { k: "ready", label: "Готов" },
    { k: "charge", label: "Заряд" },
    { k: "strike", label: "Удар" },
    { k: "done", label: "Клеймо" },
  ];
  const active = (k: string) =>
    (k === "ready" && armed && state === "idle") || (k !== "ready" && state === k);
  const color = (k: string) =>
    k === "strike" ? "bg-red" : k === "charge" ? "bg-yellow" : "bg-green";
  return (
    <div className="border-2 border-paper/30 bg-ink-2/95 p-3.5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm uppercase tracking-wider text-paper">Штамп ОТК</p>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-2">state machine</span>
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-1.5">
        {leds.map((l) => (
          <div key={l.k} className="flex flex-col items-center gap-1 border border-line-dark bg-ink px-1 py-1.5">
            <span
              className={`h-2 w-2 rounded-full ${active(l.k) ? `${color(l.k)} ${prm ? "" : "led-dot"}` : "bg-line-dark"}`}
            />
            <span className={`font-mono text-[8px] uppercase tracking-wider ${active(l.k) ? "text-paper" : "text-muted-2"}`}>
              {l.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 h-2 border border-line-dark bg-ink">
        <div
          className={`h-full transition-all duration-500 ${
            state === "strike" ? "bg-red" : state === "done" ? "bg-green" : "bg-yellow"
          }`}
          style={{
            width: state === "idle" ? (armed ? "12%" : "0%") : state === "charge" ? "66%" : "100%",
            transitionTimingFunction: "cubic-bezier(0.65, 0, 0.15, 1)",
          }}
        />
      </div>
      <button
        onClick={strike}
        disabled={!armed || state !== "idle"}
        className={`mt-3 w-full border-2 px-3 py-2.5 font-display text-sm uppercase tracking-[0.12em] transition-all duration-200 ${
          armed && state === "idle"
            ? "press-ready border-red bg-red text-paper hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(206,44,24,0.5)]"
            : "cursor-not-allowed border-line-dark bg-ink text-muted-2"
        }`}
      >
        {state === "idle" && !armed && "Лента идёт — жди G4"}
        {state === "idle" && armed && "Ударить штамп"}
        {state === "charge" && "Заряд…"}
        {state === "strike" && "Удар!"}
        {state === "done" && "Клеймо поставлено"}
      </button>
    </div>
  );
}

/* ---------- сцена ---------- */

export function CineLine() {
  const prm = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const workpieceRef = useRef<HTMLDivElement>(null);
  const actRefs = useRef<Array<HTMLDivElement | null>>([]);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const gateRefs = useRef<Array<{ ram: HTMLDivElement | null; mark: HTMLDivElement | null }>>([]);
  const hudRef = useRef<HTMLDivElement>(null);
  const pRef = useRef(0);
  const targetRef = useRef(0);
  const armedRef = useRef(false);
  const [armed, setArmed] = useState(false);
  const dragRef = useRef(false);

  const press = usePress(armed, prm);

  /* master loop: scroll → target → демпфирование → кадры + DOM */
  useEffect(() => {
    const cv = canvasRef.current;
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    if (!cv || !stage || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    const sizeCanvas = () => {
      cv.width = Math.round(stage.clientWidth * dpr);
      cv.height = Math.round(stage.clientHeight * dpr);
    };

    const applyDom = (p: number) => {
      if (playheadRef.current) playheadRef.current.style.left = `${p * 100}%`;
      if (workpieceRef.current) workpieceRef.current.style.left = `${5 + p * 65}%`;
      actRefs.current.forEach((el, i) => {
        if (el) el.style.opacity = String(winOpacity(ACTS[i].from, ACTS[i].to, p));
      });
      labelRefs.current.forEach((el, i) => {
        if (el) el.style.opacity = String(winOpacity(LABELS[i].from, LABELS[i].to, p));
      });
      gateRefs.current.forEach((g, i) => {
        const local = clamp01((p - (GATES[i].hit - 0.05)) / 0.1);
        const ram = Math.sin(local * Math.PI);
        if (g.ram) g.ram.style.transform = `translateY(${ram * 46}vh)`;
        if (g.mark) g.mark.style.opacity = String(local > 0.55 ? clamp01((local - 0.55) / 0.2) : 0);
      });
      if (p > 0.96 && !armedRef.current) {
        armedRef.current = true;
        setArmed(true);
      }
    };

    sizeCanvas();

    if (prm) {
      drawFrame(cv, 0.62, true, dpr);
      applyDom(0.96);
      armedRef.current = true;
      setArmed(true);
      const onR = () => {
        sizeCanvas();
        drawFrame(cv, 0.62, true, dpr);
      };
      window.addEventListener("resize", onR);
      return () => window.removeEventListener("resize", onR);
    }

    let raf = 0;
    let started = false;
    let alive = true;

    const onScroll = () => {
      const r = wrap.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      targetRef.current = total > 0 ? clamp01(-r.top / total) : 0;
    };
    onScroll();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = targetRef.current;
      let p = pRef.current;
      p += (t - p) * 0.11; /* демпфирование ≈ scrub:1 */
      if (Math.abs(t - p) < 0.0004) p = t;
      pRef.current = p;
      applyDom(p);
      drawFrame(cv, p, false, dpr);
    };
    const start = () => {
      if (started || !alive) return;
      started = true;
      drawFrame(cv, pRef.current, true, dpr);
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      started = false;
      cancelAnimationFrame(raf);
    };

    /* виртуализация: рендерим только пока секция во вьюпорте */
    const io = new IntersectionObserver(
      (es) => (es[0].isIntersecting ? start() : stop()),
      { threshold: 0 },
    );
    io.observe(wrap);
    const ro = new ResizeObserver(() => {
      sizeCanvas();
      drawFrame(cv, pRef.current, true, dpr);
    });
    ro.observe(stage);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      alive = false;
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [prm]);

  /* перемотка таймлайна кликом/драгом по HUD */
  const scrubTo = (clientX: number) => {
    const hud = hudRef.current;
    const wrap = wrapRef.current;
    if (!hud || !wrap) return;
    const r = hud.getBoundingClientRect();
    const p = clamp01((clientX - r.left) / r.width);
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    const total = wrap.offsetHeight - window.innerHeight;
    scrollToY(top + p * total, true);
  };

  const legend = ["pin + scrub", "кадры 000–149", "trail = blur", "lenis", "vignette + grain", "state machine"];

  return (
    <section id="liniya" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* заголовок секции */}
      <div className="relative mx-auto max-w-[1400px] px-4 pt-20 sm:px-6 lg:pt-24">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">07 / монтажная линия</p>
            <MaskTitle
              className="mt-3 font-display text-[clamp(2.4rem,6vw,4.8rem)] uppercase leading-[0.92]"
              lines={[<>Скролл —</>, <span key="p" className="text-paper/55">это плёнка</span>]}
            />
          </div>
          <Reveal delay={140}>
            <div className="max-w-md lg:justify-self-end">
              <p className="text-sm leading-relaxed text-paper/75">
                Секция смонтирована как видео: единый <span className="text-yellow">master-timeline 0→1</span> на{" "}
                {prm ? "одном кадре" : "300vh скролла"} (pin + scrub с демпфированием),{" "}
                <span className="text-yellow">{FRAMES - 1} кадров</span> процедурной image-sequence на canvas,
                trail-накопление вместо clearRect — это motion blur. Ворота G1–G4 бьют по ленте в своих таймкодах.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {legend.map((l) => (
                  <span key={l} className="border border-line-dark bg-ink-2 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-2">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* сама лента */}
      <div ref={wrapRef} className={`relative ${prm ? "mt-10 h-auto pb-16" : "mt-10 h-[300vh]"}`}>
        <div
          ref={stageRef}
          className={`${prm ? "relative mx-4 h-[560px] border-2 border-paper/25 sm:mx-6" : "sticky top-0 h-screen overflow-hidden"} ${
            press.shaking ? "stage-shake" : ""
          }`}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

          {/* верхний HUD */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4 sm:p-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-yellow">Монтажная линия · master timeline</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-paper/40">
                {prm ? "режим: prefers-reduced-motion · стоп-кадр" : "rec ● 24 fps · scrub 0.11"}
              </p>
            </div>
            <div className="flex items-center gap-2 border border-line-dark bg-ink/80 px-2.5 py-1.5">
              <span className="led-dot h-2 w-2 rounded-full bg-red" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-paper/80">
                {press.state === "done" ? "exit 0" : armed ? "G4 близко" : "лента идёт"}
              </span>
            </div>
          </div>

          {/* титры актов */}
          {ACTS.map((a, i) => (
            <div
              key={a.n}
              ref={(el) => {
                actRefs.current[i] = el;
              }}
              className="pointer-events-none absolute left-4 top-[16%] z-10 max-w-[300px] sm:left-6 sm:top-[14%]"
              style={{ opacity: 0 }}
            >
              <p className="font-display text-[11px] uppercase tracking-[0.3em] text-red">Акт {a.n}</p>
              <p className="mt-1.5 font-display text-3xl uppercase leading-none text-paper sm:text-4xl">{a.t}</p>
              <p className="mt-2.5 border-l-2 border-yellow pl-3 text-[12.5px] leading-snug text-paper/70">{a.d}</p>
            </div>
          ))}

          {/* ворота-штамповщики */}
            {!prm &&
            GATES.map((g) => (              <div key={g.code} className="absolute bottom-[26%] top-0 z-10 w-9" style={{ left: `${5 + g.hit * 65}%` }}>
                <div className="absolute inset-0 border-x border-paper/10" />
                <div
                  ref={(el) => {
                    const idx = GATES.indexOf(g);
                    const cur = gateRefs.current[idx] ?? { ram: null, mark: null };
                    gateRefs.current[idx] = { ...cur, ram: el };
                  }}
                  className="absolute inset-x-0 top-0 h-14 border-2 border-paper/30 bg-ink-3 will-change-transform"
                >
                  <div className="hazard-thin absolute inset-x-0 bottom-0 h-1.5" />
                  <span className="absolute inset-0 grid place-items-center font-display text-xs text-paper/70">{g.code}</span>
                </div>
                <div
                  ref={(el) => {
                    const idx = GATES.indexOf(g);
                    const cur = gateRefs.current[idx] ?? { ram: null, mark: null };
                    gateRefs.current[idx] = { ...cur, mark: el };
                  }}
                  className="absolute -bottom-9 left-1/2 -translate-x-1/2 rotate-[-8deg] border-2 border-red px-1.5 py-0.5 font-display text-xs uppercase text-red"
                  style={{ opacity: 0 }}
                >
                  {g.code} ✓
                </div>
              </div>
            ))}

          {/* заготовка на ленте */}
          <div
            ref={workpieceRef}
            className="absolute top-[63%] z-10 w-[132px] will-change-[left] sm:w-[150px]"
            style={{ left: "5%" }}
          >
            <div className="relative border-2 border-yellow bg-ink-2 px-3 py-2.5 shadow-[5px_5px_0_rgba(0,0,0,0.4)]">
              {LABELS.map((l, i) => (
                <div
                  key={l.text}
                  ref={(el) => {
                    labelRefs.current[i] = el;
                  }}
                  className={i === 0 ? "" : "absolute inset-0 px-3 py-2.5"}
                  style={{ opacity: i === 0 ? 1 : 0 }}
                >
                  <p className="truncate font-mono text-[11px] font-bold text-yellow">{l.text}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-2">{l.sub}</p>
                </div>
              ))}
              {/* клеймо */}
              {(press.state === "strike" || press.state === "done") && (
                <div className="stamp-slam pointer-events-none absolute -right-6 -top-7 z-20">
                  <span className="rubber-stamp inline-block px-2 py-1 text-[11px] text-red" style={{ ["--stamp-rot" as string]: "-10deg", mixBlendMode: "normal" }}>
                    Принято · ОТК
                  </span>
                </div>
              )}
            </div>
            <div className="mt-1 flex justify-between px-1">
              {GATES.map((g) => (
                <span key={g.code} className="h-1.5 w-1.5 rotate-45 bg-yellow/70" />
              ))}
            </div>
          </div>

          {/* брызги краски */}
          {press.splats.map((s) => (
            <span
              key={s.id}
              className="splat pointer-events-none absolute z-20 rounded-full bg-red"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.s,
                height: s.s,
                ["--sx" as string]: `${s.sx}px`,
                ["--sy" as string]: `${s.sy}px`,
              }}
            />
          ))}

          {/* пульт штампа */}
          <div className="absolute bottom-[86px] right-3 z-20 w-[218px] sm:bottom-[92px] sm:right-5 sm:w-[240px]">
            <PressPanel state={press.state} armed={armed} strike={press.strike} prm={prm} />
          </div>

          {/* HUD-таймлайн (скраб) */}
          <div className="absolute inset-x-0 bottom-0 z-20 border-t-2 border-paper/25 bg-ink">
            <div
              ref={hudRef}
              onPointerDown={(e) => {
                if (prm) return;
                dragRef.current = true;
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                scrubTo(e.clientX);
              }}
              onPointerMove={(e) => {
                if (dragRef.current && !prm) scrubTo(e.clientX);
              }}
              onPointerUp={() => {
                dragRef.current = false;
              }}
              className={`relative mx-3 my-3 h-9 select-none border border-line-dark bg-ink-2 sm:mx-5 ${prm ? "" : "cursor-ew-resize"}`}
              role="slider"
              aria-label="Перемотка монтажного таймлайна"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pRef.current * 100)}
            >
              {/* акты */}
              <div className="absolute inset-0 flex">
                {[30, 38, 32].map((w, i) => (
                  <div key={i} className="flex items-center justify-center border-r border-line-dark last:border-r-0" style={{ width: `${w}%` }}>
                    <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-paper/35">Акт {ACTS[i].n}</span>
                  </div>
                ))}
              </div>
              {/* риски ворот */}
              {GATES.map((g) => (
                <span key={g.code} className="absolute top-0 h-full w-px bg-red/70" style={{ left: `${g.hit * 100}%` }} />
              ))}
              {/* плейхед */}
              <div ref={playheadRef} className="absolute -bottom-1.5 -top-1.5 z-10 w-[2px] bg-yellow" style={{ left: "0%" }}>
                <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-yellow" />
              </div>
            </div>
            <p className="pb-2.5 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-muted-2">
              {prm ? "лента зафиксирована (reduced motion)" : "кликни или тяни — перемотать таймлайн"}
            </p>
          </div>
        </div>

        {/* статичная раскадровка для prefers-reduced-motion */}
        {prm && (
          <div className="mx-4 mt-6 grid gap-3 sm:mx-6 sm:grid-cols-3">
            {ACTS.map((a) => (
              <div key={a.n} className="border border-paper/25 bg-ink-2 p-4">
                <p className="font-display text-[11px] uppercase tracking-[0.3em] text-red">Акт {a.n}</p>
                <p className="mt-1 font-display text-xl uppercase text-paper">{a.t}</p>
                <p className="mt-2 text-[12.5px] leading-snug text-paper/70">{a.d}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
