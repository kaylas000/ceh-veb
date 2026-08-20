import { useEffect, useRef, useState } from "react";
import { Reveal, useReducedMotion } from "../lib/fx";
import { scrollToY } from "../lib/smooth";
import { SectionHead } from "./Chrome";

/* ------------------------------------------------------------------ */
/* 06 / Сборочная линия — кинематографическая сцена по канону          */
/* видеопродакшена:                                                    */
/*   · master-timeline: вся сцена = одна функция прогресса 0→1         */
/*   · scroll-scrub с демпфированием (инерция, как плёнка)             */
/*   · canvas-последовательность 150 кадров + trail = motion blur      */
/*   · постобработка: виньетка в кадре, сканлайны, зерно страницы      */
/*   · state machine штампа ОТК: idle → charge → strike → done         */
/*   · HUD-линейка: клик/драг перематывает таймлайн                    */
/* ------------------------------------------------------------------ */

const ACTS = [
  { t: "АКТ 1", s: "Загрузка заготовок", d: "SEED и DIRECTION ложатся на ленту. Оси розданы roulette.mjs — назад не сдвинуть.", from: 0.0, to: 0.3 },
  { t: "АКТ 2", s: "Обработка резцом", d: "Дизайнер снимает лишнее строго по SOURCES.md: каждый рез имеет источник в архиве.", from: 0.34, to: 0.62 },
  { t: "АКТ 3", s: "Контроль и приёмка", d: "validate.mjs прогоняет деталь сквозь V-01…V-14. Без клейма ОТК деталь не покидает цех.", from: 0.66, to: 0.95 },
];

const GATES = [
  { code: "G1", hit: 0.16 },
  { code: "G2", hit: 0.38 },
  { code: "G3", hit: 0.6 },
  { code: "G4", hit: 0.82 },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const bump = (p: number, a: number, b: number) => {
  if (p <= a || p >= b) return 0;
  const m = (a + b) / 2;
  return p < m ? (p - a) / (m - a) : (b - p) / (b - m);
};
const win = (p: number, a: number, b: number) => {
  const fadeIn = ramp(p, a, a + 0.05);
  const fadeOut = 1 - ramp(p, b, b + 0.06);
  return Math.min(fadeIn, fadeOut);
};

/* ---------- отрисовка кадра ---------- */

function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  t: number,
  hits: number[],
) {
  /* trail вместо clearRect — накопление кадров даёт смаз движения */
  ctx.fillStyle = "rgba(21,19,13,0.32)";
  ctx.fillRect(0, 0, w, h);

  const railY = h * 0.76;
  ctx.lineCap = "round";

  /* рельсы и ролики */
  ctx.strokeStyle = "rgba(232,230,222,0.22)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.02, railY);
  ctx.lineTo(w * 0.98, railY);
  ctx.stroke();

  for (let i = 0; i < 10; i++) {
    const x = w * (0.06 + i * 0.098);
    const r = h * 0.026;
    const ang = p * 10 + i;
    ctx.strokeStyle = "rgba(232,230,222,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, railY + r + 4, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(ang) * r * 0.8, railY + r + 4 - Math.sin(ang) * r * 0.8);
    ctx.lineTo(x + Math.cos(ang) * r * 0.8, railY + r + 4 + Math.sin(ang) * r * 0.8);
    ctx.stroke();
  }

  /* пунктир ленты */
  ctx.strokeStyle = "rgba(224,169,28,0.5)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([14, 18]);
  ctx.lineDashOffset = -((p * w * 2.4) % 32);
  ctx.beginPath();
  ctx.moveTo(w * 0.02, railY + h * 0.075);
  ctx.lineTo(w * 0.98, railY + h * 0.075);
  ctx.stroke();
  ctx.setLineDash([]);

  /* маховики */
  const flywheel = (cx: number, cy: number, r: number, ang: number) => {
    ctx.strokeStyle = "rgba(232,230,222,0.32)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const a = ang + (k * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(206,44,24,0.85)";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  };
  flywheel(w * 0.15, h * 0.24, h * 0.13, p * Math.PI * 7);
  flywheel(w * 0.285, h * 0.31, h * 0.075, -p * Math.PI * 10);

  /* пресс (АКТ 2) */
  const env2 = bump(p, 0.34, 0.62);
  const px = w * 0.55;
  ctx.strokeStyle = "rgba(232,230,222,0.3)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(px - w * 0.07, h * 0.16);
  ctx.lineTo(px - w * 0.07, railY);
  ctx.moveTo(px + w * 0.07, h * 0.16);
  ctx.lineTo(px + w * 0.07, railY);
  ctx.moveTo(px - w * 0.09, h * 0.16);
  ctx.lineTo(px + w * 0.09, h * 0.16);
  ctx.stroke();
  const piston = env2 * h * 0.2;
  ctx.fillStyle = "rgba(92,122,153,0.9)";
  ctx.fillRect(px - w * 0.028, h * 0.17, w * 0.056, h * 0.1 + piston);
  ctx.fillStyle = "rgba(206,44,24,0.9)";
  ctx.fillRect(px - w * 0.045, h * 0.27 + piston, w * 0.09, h * 0.035);
  if (env2 > 0.72 && Math.floor(t * 24) % 2 === 0) {
    ctx.strokeStyle = "rgba(255,207,110,0.9)";
    ctx.lineWidth = 2;
    const sy = h * 0.315 + piston;
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.5;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * w * 0.05, sy + Math.sin(a) * h * 0.03);
      ctx.lineTo(px + Math.cos(a) * w * 0.085, sy + Math.sin(a) * h * 0.06);
      ctx.stroke();
    }
  }

  /* печь (АКТ 3) */
  const env3 = ramp(p, 0.66, 0.8);
  const ox = w * 0.845;
  ctx.strokeStyle = "rgba(232,230,222,0.3)";
  ctx.lineWidth = 3.5;
  ctx.strokeRect(w * 0.77, h * 0.4, w * 0.15, railY - h * 0.4);
  if (env3 > 0.01) {
    const pulse = 0.8 + 0.2 * Math.sin(t * 3.2);
    const g = ctx.createRadialGradient(ox, railY, 4, ox, railY, h * 0.22);
    g.addColorStop(0, `rgba(255,106,43,${0.55 * env3 * pulse})`);
    g.addColorStop(1, "rgba(255,106,43,0)");
    ctx.fillStyle = g;
    ctx.fillRect(w * 0.7, h * 0.3, w * 0.28, railY - h * 0.28);
    /* дым */
    for (let k = 0; k < 3; k++) {
      const k01 = (p * 2.2 + k * 0.33) % 1;
      ctx.fillStyle = `rgba(232,230,222,${(1 - k01) * 0.16 * env3})`;
      ctx.beginPath();
      ctx.arc(ox + Math.sin((k01 + k) * 5) * w * 0.012, h * 0.4 - k01 * h * 0.24, 3 + k01 * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* тень заготовки */
  const wpx = w * (0.05 + p * 0.68);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.ellipse(wpx, railY + 5, w * 0.045, h * 0.012, 0, 0, Math.PI * 2);
  ctx.fill();

  /* вспышки на воротах */
  const now = performance.now();
  for (const ht of hits) {
    const dt = now - ht;
    if (dt < 380) {
      const gx = w * (0.05 + GATES[hits.indexOf(ht)].hit * 0.68);
      const a = 1 - dt / 380;
      ctx.strokeStyle = `rgba(255,207,110,${a})`;
      ctx.lineWidth = 2.5;
      for (let k = 0; k < 8; k++) {
        const ang = (k * Math.PI) / 4 + dt * 0.01;
        ctx.beginPath();
        ctx.moveTo(gx + Math.cos(ang) * w * 0.012, railY - h * 0.16 + Math.sin(ang) * h * 0.02);
        ctx.lineTo(gx + Math.cos(ang) * w * 0.03, railY - h * 0.16 + Math.sin(ang) * h * 0.05);
        ctx.stroke();
      }
    }
  }

  /* тахометр прогресса */
  const dx = w * 0.36;
  const dy = h * 0.12;
  const dr = h * 0.065;
  ctx.strokeStyle = "rgba(232,230,222,0.3)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(dx, dy, dr, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();
  const na = Math.PI * 0.75 + p * Math.PI * 1.5;
  ctx.strokeStyle = "rgba(206,44,24,0.95)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(dx, dy);
  ctx.lineTo(dx + Math.cos(na) * dr * 0.82, dy + Math.sin(na) * dr * 0.82);
  ctx.stroke();

  /* виньетка кадра */
  const v = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.25, w / 2, h * 0.45, h * 0.95);
  v.addColorStop(0, "rgba(10,9,6,0)");
  v.addColorStop(1, "rgba(10,9,6,0.42)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/* ---------- сцена ---------- */

function Scene() {
  const prm = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wpRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const spdRef = useRef<HTMLSpanElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const actRefs = useRef<Array<HTMLDivElement | null>>([]);
  const gateRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lampRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const scrubbing = useRef(false);
  const [machine, setMachine] = useState<"idle" | "charge" | "strike" | "done">("idle");
  const machineRef = useRef(machine);
  machineRef.current = machine;

  useEffect(() => {
    if (prm) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = wrap.clientWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#15130d";
      ctx.fillRect(0, 0, W, H);
    };
    resize();
    window.addEventListener("resize", resize);

    let inView = false;
    const io = new IntersectionObserver((es) => {
      inView = es.some((e) => e.isIntersecting);
    }, { threshold: 0 });
    io.observe(wrap);

    const hits: number[] = [0, 0, 0, 0];
    const prevGate = [false, false, false, false];
    let cur = 0;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!inView) return;
      const dt = Math.min(64, now - last);
      last = now;

      const rect = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      const target = clamp01(-rect.top / Math.max(1, total));
      cur += (target - cur) * 0.11; /* демпфирование scrub */
      const p = cur;
      const v = (target - p) / Math.max(1, dt);

      drawFrame(ctx, W, H, p, now / 1000, hits);

      /* DOM-слой */
      if (wpRef.current) wpRef.current.style.left = `${5 + p * 68}%`;
      if (frameRef.current) frameRef.current.textContent = `${String(Math.min(149, Math.round(p * 149))).padStart(3, "0")}/149`;
      if (pctRef.current) pctRef.current.textContent = `${Math.round(p * 100)}%`;
      if (spdRef.current) spdRef.current.textContent = `${Math.round(Math.abs(v) * 2400)} мм/с`;
      if (playRef.current) playRef.current.style.left = `${p * 100}%`;
      ACTS.forEach((a, i) => {
        const el = actRefs.current[i];
        if (el) el.style.opacity = win(p, a.from, a.to).toFixed(3);
      });
      GATES.forEach((g, i) => {
        const on = p >= g.hit;
        const el = gateRefs.current[i];
        if (el) el.dataset.on = on ? "1" : "0";
        const lamp = lampRefs.current[i];
        if (lamp) lamp.dataset.on = on ? "1" : "0";
        if (on && !prevGate[i]) {
          hits[i] = performance.now();
          stageRef.current?.classList.remove("shake-once");
          void stageRef.current?.offsetWidth;
          stageRef.current?.classList.add("shake-once");
        }
        prevGate[i] = on;
      });

      /* машина штампа ОТК */
      if (p > 0.95 && machineRef.current === "idle") setMachine("charge");
      if (p < 0.88 && machineRef.current === "done") setMachine("idle");
    };
    raf = requestAnimationFrame(loop);

    /* перемотка по HUD */
    const track = trackRef.current;
    const scrubTo = (clientX: number) => {
      if (!track) return;
      const r = track.getBoundingClientRect();
      const f = clamp01((clientX - r.left) / r.width);
      const top = wrap.getBoundingClientRect().top + window.scrollY + f * (wrap.offsetHeight - window.innerHeight);
      scrollToY(top, true); /* immediate: scrub без боя с Lenis */
    };
    const onDown = (e: PointerEvent) => {
      scrubbing.current = true;
      track?.setPointerCapture(e.pointerId);
      scrubTo(e.clientX);
    };
    const onMove = (e: PointerEvent) => {
      if (scrubbing.current) scrubTo(e.clientX);
    };
    const onUp = () => {
      scrubbing.current = false;
    };
    track?.addEventListener("pointerdown", onDown);
    track?.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerup", onUp);
      track?.removeEventListener("pointerdown", onDown);
      track?.removeEventListener("pointermove", onMove);
    };
  }, [prm]);

  /* тайминги машины штампа */
  useEffect(() => {
    if (machine !== "charge") return;
    const t = window.setTimeout(() => setMachine("strike"), 420);
    return () => window.clearTimeout(t);
  }, [machine]);
  useEffect(() => {
    if (machine !== "strike") return;
    const t = window.setTimeout(() => setMachine("done"), 360);
    return () => window.clearTimeout(t);
  }, [machine]);

  /* ---------- reduced motion: статичная раскадровка ---------- */
  if (prm) {
    return (
      <section id="linia" className="relative bg-ink text-paper">
        <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/45">
            режим без движения · раскадровка сцены
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {ACTS.map((a, i) => (
              <div key={a.t} className="border-2 border-paper/25 bg-ink-2 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">{a.t}</p>
                <p className="mt-2 font-display text-xl uppercase text-paper">{a.s}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-paper/60">{a.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-4 border-2 border-paper/25 bg-ink-2 p-5">
            <span className="rubber-stamp text-sm text-green">Принято · ОТК</span>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">
              G1–G4 пройдены · клеймо поставлено · деталь отгружена
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* ---------- живая сцена ---------- */
  return (
    <section id="linia" className="relative bg-ink text-paper">
      <div ref={wrapRef} className="relative" style={{ height: "320vh" }}>
        <div ref={stageRef} className="sticky top-0 h-screen overflow-hidden bg-[#15130d]">
          <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />

          {/* слой 1: canvas-последовательность */}
          <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />

          {/* слой 2: ворота */}
          {GATES.map((g) => (
            <div
              key={g.code}
              ref={(el) => {
                gateRefs.current[GATES.indexOf(g)] = el;
              }}
              data-on="0"
              className="group absolute bottom-[24%] top-[30%] z-10 w-9"
              style={{ left: `${5 + g.hit * 68}%` }}
            >
              <div className="mx-auto h-full w-[3px] bg-paper/25 transition-colors duration-300 group-data-[on='1']:bg-yellow" />
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 border border-paper/30 bg-ink-2 px-1.5 py-0.5 font-mono text-[10px] font-bold text-paper/70 transition-colors duration-300 group-data-[on='1']:border-yellow group-data-[on='1']:text-yellow">
                {g.code}
              </span>
              <span className="rubber-stamp stamp-anim absolute top-[34%] left-1/2 hidden -translate-x-1/2 text-[10px] text-green group-data-[on='1']:block">
                ок
              </span>
            </div>
          ))}

          {/* слой 3: заготовка */}
          <div ref={wpRef} className="absolute top-[63%] z-20 w-[128px] will-change-[left] sm:w-[150px]" style={{ left: "5%" }}>
            <svg viewBox="0 0 150 66" className="w-full">
              <rect x="8" y="10" width="134" height="34" rx="3" fill="#e8e6de" stroke="#16150f" strokeWidth="2.5" />
              <rect x="8" y="10" width="134" height="9" fill="#ce2c18" />
              <text x="75" y="36" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="700" fill="#16150f">
                ДЕТАЛЬ №47
              </text>
              <circle cx="30" cy="54" r="8" fill="#16150f" stroke="#e8e6de" strokeWidth="2.5" />
              <circle cx="120" cy="54" r="8" fill="#16150f" stroke="#e8e6de" strokeWidth="2.5" />
            </svg>
            {(machine === "strike" || machine === "done") && (
              <span className="rubber-stamp stamp-anim absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-green sm:text-xs">
                Принято · ОТК
              </span>
            )}
          </div>

          {/* телеметрия */}
          <div className="absolute left-4 top-16 z-30 hidden border-2 border-paper/25 bg-ink/85 p-3.5 font-mono text-[11px] backdrop-blur-[2px] sm:block lg:top-20">
            <p className="text-[9px] uppercase tracking-[0.25em] text-paper/45">телеметрия линии</p>
            <p className="mt-2 flex gap-2"><span className="w-20 text-paper/45">КАДР</span><span ref={frameRef} className="font-bold text-yellow">000/149</span></p>
            <p className="mt-1 flex gap-2"><span className="w-20 text-paper/45">ПРОГРЕСС</span><span ref={pctRef} className="font-bold text-paper">0%</span></p>
            <p className="mt-1 flex gap-2"><span className="w-20 text-paper/45">ЛЕНТА</span><span ref={spdRef} className="font-bold text-paper">0 мм/с</span></p>
            <p className="mt-2 flex items-center gap-2">
              {GATES.map((g, i) => (
                <span key={g.code} className="flex items-center gap-1">
                  <span
                    ref={(el) => {
                      lampRefs.current[i] = el;
                    }}
                    data-on="0"
                    className="h-2 w-2 rounded-full bg-paper/20 transition-colors duration-300 data-[on='1']:bg-green data-[on='1']:shadow-[0_0_8px_rgba(46,125,79,0.9)]"
                  />
                  <span className="text-[9px] text-paper/45">{g.code}</span>
                </span>
              ))}
            </p>
            <p className={`mt-2 border-t border-line-dark pt-2 text-[9px] uppercase tracking-[0.2em] ${machine === "done" ? "text-green" : machine === "idle" ? "text-paper/45" : "text-yellow"}`}>
              пульт ОТК: {machine === "idle" ? "ожидание" : machine === "charge" ? "замах…" : machine === "strike" ? "удар!" : "принято"}
            </p>
          </div>

          {/* акты */}
          <div className="pointer-events-none absolute inset-x-0 top-[14%] z-20 mx-auto max-w-[1400px] px-4 sm:px-6">
            {ACTS.map((a, i) => (
              <div
                key={a.t}
                ref={(el) => {
                  actRefs.current[i] = el;
                }}
              className="absolute inset-x-4 min-w-0 sm:inset-x-auto sm:right-6 sm:max-w-[26rem]"
              style={{ opacity: 0 }}              >
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-yellow">{a.t} · {a.s}</p>
                <p className="mt-2 min-w-0 break-words font-display text-[clamp(1.15rem,3vw,2.2rem)] uppercase leading-[1.05] text-paper">
                  {a.d}
                </p>
              </div>
            ))}
          </div>

          {/* слой 4: HUD-линейка перемотки */}
          <div className="absolute inset-x-0 bottom-0 z-30 border-t-2 border-paper/25 bg-ink/90 px-4 pb-3 pt-2.5 backdrop-blur-[2px] sm:px-6">
            <div
              ref={trackRef}
              className="relative h-10 cursor-ew-resize touch-none select-none"
              role="slider"
              aria-label="Перемотка таймлайна сборочной линии"
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-paper/20" />
              {GATES.map((g) => (
                <span key={g.code} className="absolute top-1/2 h-3.5 w-[3px] -translate-y-1/2 bg-yellow/80" style={{ left: `${g.hit * 100}%` }} />
              ))}
              <div ref={playRef} className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: "0%" }}>
                <span className="block h-5 w-5 rotate-45 border-2 border-ink bg-red shadow-[0_0_12px_rgba(206,44,24,0.7)]" />
              </div>
              <div className="absolute inset-x-0 top-0 flex justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-paper/45">
                {ACTS.map((a) => (
                  <span key={a.t}>{a.t}: {a.s}</span>
                ))}
              </div>
              <div className="absolute inset-x-0 bottom-0 flex justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-paper/35">
                <span>G1</span><span>G2</span><span>G3</span><span>G4</span>
              </div>
            </div>
            <p className="mt-1.5 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-paper/40">
              scrub: клик или драг по линейке — перемотка · скролл — воспроизведение
            </p>
          </div>

          <div className="scanline pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

export function CineLine() {
  return (
    <>
      {/* вступление перед пином */}
      <section className="relative border-b-2 border-line-dark bg-ink text-paper">
        <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-4 pb-10 pt-16 sm:px-6">
          <SectionHead
            dark
            num="06"
            kicker="сборочная линия · рецепт M-10"
            lines={[<>Деталь проходит</>, <span key="l" className="text-paper/50">ворота на плёнке</span>]}
            aside={
              <Reveal delay={140}>
                <p className="max-w-sm text-sm leading-relaxed text-paper/70">
                  Одна сцена — один таймлайн на 150 кадров. Скролл крутит плёнку с инерцией, ворота бьют штампы,
                  ОТК ставит клеймо. Линейка внизу перематывает монтаж.
                </p>
              </Reveal>
            }
          />
        </div>
      </section>
      <Scene />
    </>
  );
}
