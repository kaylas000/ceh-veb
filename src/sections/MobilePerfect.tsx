import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEVICES,
  SWEEP_VIEWPORTS,
  BREAKPOINTS,
  FLUID_SCALE,
  PERF_BUDGET,
  MANUAL_CHECKS,
  TOUCH_MIN,
  fluidValue,
} from "../data/mobile";
import { runMobileAudit, type MobileAuditResult } from "../lib/mobileAudit";
import { Reveal } from "../lib/fx";
import { ScrollWindow } from "../components/ScrollWindow";
import { SectionHead } from "./Chrome";

type Dev = { name: string; w: number; h: number; dpr: number; os: string; notch?: boolean; reason: string };

/* ---------- симулятор устройства ---------- */

function DeviceSim() {
  const [dev, setDev] = useState<Dev>(DEVICES[0]);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(300);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el);
    setStageW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  /* рамка не шире сцены — на мобильных в том числе */
  const scale = Math.min(380 / dev.h, (stageW - 24) / dev.w, 0.6);
  const cols = dev.w < 560 ? 1 : dev.w < 900 ? 2 : 3;
  const compact = dev.w < 700;

  return (
    <div>
      {/* выбор устройства */}
      <div className="flex flex-wrap gap-1.5">
        {DEVICES.map((d) => (
          <button
            key={d.name}
            onClick={() => setDev(d)}
            className={`border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-all duration-200 ${
              dev.name === d.name
                ? "border-yellow bg-yellow font-bold text-ink"
                : "border-paper/25 text-paper/60 hover:border-paper/60 hover:text-paper"
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* сцена с рамкой */}
      <div ref={stageRef} className="mt-5 flex min-h-[420px] items-center justify-center overflow-hidden border-2 border-paper/20 bg-[#101014] py-6">
        <div
          className="relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: dev.w * scale, height: dev.h * scale }}
        >
          <div
            className="absolute left-0 top-0 overflow-hidden rounded-[18px] border-[3px] border-paper/40 bg-ink shadow-[0_0_40px_rgba(0,0,0,0.6)]"
            style={{ width: dev.w, height: dev.h, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            {/* notch / dynamic island */}
            {dev.notch && (
              <div className="absolute left-1/2 top-2 z-20 h-[22px] w-[34%] -translate-x-1/2 rounded-full bg-black" />
            )}
            {/* safe-area top */}
            <div className="absolute inset-x-0 top-0 z-10 border-b border-dashed border-red/50 bg-red/10" style={{ height: dev.notch ? 30 : 12 }} />

            {/* каркас сайта: рефлоу под ширину */}
            <div className="flex h-full flex-col gap-3 px-4" style={{ paddingTop: dev.notch ? 40 : 22, paddingBottom: 26 }}>
              <div className="flex items-center justify-between">
                <div className="h-4 w-12 bg-red" />
                {compact ? (
                  <div className="flex flex-col gap-[3px]">
                    <span className="h-[2px] w-5 bg-paper/70" />
                    <span className="h-[2px] w-5 bg-paper/70" />
                    <span className="h-[2px] w-5 bg-paper/70" />
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <span className="h-2.5 w-10 bg-paper/40" />
                    <span className="h-2.5 w-10 bg-paper/40" />
                    <span className="h-2.5 w-10 bg-paper/40" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="h-6 w-[86%] bg-paper/85" />
                <div className="h-6 w-[58%] bg-paper/85" />
                <div className="h-2.5 w-[70%] bg-paper/30" />
                <div className="flex gap-2 pt-1">
                  <div className="h-8 w-24 bg-yellow" />
                  <div className="h-8 w-20 border border-paper/40" />
                </div>
              </div>
              <div className="grid flex-1 gap-3 transition-all duration-500" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex min-h-0 flex-col gap-1.5 border border-paper/25 bg-paper/5 p-2.5">
                    <div className="h-10 w-full bg-steel/40" />
                    <div className="h-2 w-[80%] bg-paper/50" />
                    <div className="h-2 w-[60%] bg-paper/30" />
                    <div className="mt-auto h-2 w-[40%] bg-red/70" />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-paper/25" />
                <div className="h-2 w-[92%] bg-paper/25" />
                <div className="h-2 w-[64%] bg-paper/25" />
              </div>
            </div>

            {/* home indicator + safe-area bottom */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-center border-t border-dashed border-red/50 bg-red/10 pb-1.5" style={{ height: 22 }}>
              <div className="h-1 w-[30%] rounded-full bg-paper/60" />
            </div>
          </div>
        </div>
      </div>

      {/* телеметрия */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border border-paper/20 bg-ink-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/60">
        <span className="font-bold text-yellow">{dev.name}</span>
        <span>{dev.w}×{dev.h}</span>
        <span>dpr {dev.dpr}</span>
        <span>сетка: {cols} кол.</span>
        <span className="text-green">safe-area учтена</span>
      </div>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-paper/40">{dev.reason}</p>

      {/* sweep-матрица */}
      <div className="mt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">
          sweep: {SWEEP_VIEWPORTS.length} вьюпортов одним прогоном — клик ставит в рамку
        </p>
        <div className="term-scroll mt-2 flex gap-1.5 overflow-x-auto pb-2">
          {SWEEP_VIEWPORTS.map((v) => {
            const active = dev.name === v.label;
            const tone =
              v.group === "android" ? "text-green" : v.group === "ios" ? "text-steel" : v.group === "tablet" ? "text-yellow" : "text-red";
            return (
              <button
                key={v.label}
                onClick={() => setDev({ name: v.label, w: v.w, h: v.h, dpr: 2, os: "sweep", reason: `sweep-прогон: ${v.w}×${v.h}` })}
                className={`shrink-0 border px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors duration-150 ${
                  active ? "border-yellow bg-yellow text-ink" : `border-paper/20 text-paper/55 hover:border-paper/50 ${tone}`
                }`}
              >
                {v.label} · {v.w}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- живой аудит ---------- */

function Led({ ok, warn }: { ok: boolean; warn?: boolean }) {
  const color = ok ? "bg-green shadow-[0_0_8px_rgba(46,125,79,0.9)]" : warn ? "bg-yellow shadow-[0_0_8px_rgba(224,169,28,0.9)]" : "bg-red shadow-[0_0_8px_rgba(206,44,24,0.9)]";
  return <span className={`led-dot mt-1 h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

function AuditPanel() {
  const [res, setRes] = useState<MobileAuditResult | null>(null);
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    window.setTimeout(() => {
      setRes(runMobileAudit());
      setBusy(false);
    }, 350);
  };

  useEffect(() => {
    const t = window.setTimeout(run, 900);
    return () => window.clearTimeout(t);
  }, []);

  const criticalOk = res ? !res.scroll.hasIssue && res.viewport.pass && res.fonts.tooSmall === 0 : true;

  return (
    <div className="flex h-full flex-col border-2 border-paper/25 bg-ink-2/70">
      <div className="flex items-center justify-between gap-3 border-b border-line-dark px-5 py-3.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/60">аудит живой страницы</p>
        <button
          onClick={run}
          disabled={busy}
          className="border-2 border-yellow px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-yellow transition-colors duration-200 hover:bg-yellow hover:text-ink disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "скан…" : "▷ прогнать"}
        </button>
      </div>

      <div className="flex-1 space-y-4 px-5 py-4">
        {!res && <p className="font-mono text-[11px] text-paper/40">инициализация сканера…</p>}
        {res && (
          <>
            <div className="flex gap-3">
              <Led ok={!res.scroll.hasIssue} />
              <div>
                <p className="text-[13px] font-semibold text-paper">Горизонтальный скролл</p>
                <p className="font-mono text-[10px] leading-relaxed text-paper/50">
                  {res.scroll.hasIssue
                    ? `+${res.scroll.overflowPx}px · виновники: ${res.scroll.culprits.map((c) => `${c.selector}(+${c.overflow})`).join(", ")}`
                    : "scrollWidth ≤ clientWidth — чисто"}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Led ok={res.viewport.pass} />
              <div>
                <p className="text-[13px] font-semibold text-paper">viewport meta + viewport-fit</p>
                <p className="font-mono text-[10px] leading-relaxed text-paper/50">{res.viewport.content}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Led ok={res.fonts.tooSmall === 0} />
              <div>
                <p className="text-[13px] font-semibold text-paper">Инпуты ≥16px (анти-зум iOS)</p>
                <p className="font-mono text-[10px] leading-relaxed text-paper/50">
                  полей: {res.fonts.total} · нарушений: {res.fonts.tooSmall}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Led ok={res.touch.violations.length === 0} warn={!res.touchDevice && res.touch.violations.length > 0} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-paper">
                  Тап-зоны ≥{TOUCH_MIN}px {!res.touchDevice && <span className="text-yellow">· десктоп: предупреждения</span>}
                </p>
                <p className="font-mono text-[10px] leading-relaxed text-paper/50">
                  элементов: {res.touch.total} · мало: {res.touch.violations.length}
                </p>
                {res.touch.violations.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {res.touch.violations.slice(0, 3).map((v) => (
                      <li key={v.selector} className="truncate font-mono text-[9px] text-red">
                        {v.selector} · {v.size}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div
        className={`border-t-2 px-5 py-3 font-display text-sm uppercase tracking-[0.14em] ${
          criticalOk ? "border-green/60 text-green" : "border-red/60 text-red"
        }`}
      >
        {criticalOk ? "✓ критичные проверки пройдены" : "✕ требуется доработка"}
      </div>
    </div>
  );
}

/* ---------- fluid-типографика ---------- */

function FluidDemo() {
  const [vw, setVw] = useState(375);
  const hero = fluidValue(40, 88, vw);

  return (
    <div className="border-2 border-paper/25 bg-ink-2/70 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/60">fluid clamp · без скачков на брейкпоинтах</p>
        <p className="font-mono text-[10px] text-yellow">вьюпорт: {vw}px</p>
      </div>

      <p className="mt-4 font-display leading-none text-paper transition-all duration-200" style={{ fontSize: hero }}>
        ЦЕХ
      </p>

      <input
        type="range"
        min={320}
        max={1440}
        step={5}
        value={vw}
        onChange={(e) => setVw(Number(e.target.value))}
        aria-label="Ширина вьюпорта для fluid-демо"
        className="mt-4 w-full accent-[#e0a91c]"
      />
      <div className="relative mt-1 h-4">
        {BREAKPOINTS.map((b) => (
          <span
            key={b.key}
            className="absolute -translate-x-1/2 font-mono text-[8px] uppercase text-paper/40"
            style={{ left: `${((b.px - 320) / (1440 - 320)) * 100}%` }}
            title={`${b.key} · ${b.px}px · ${b.note}`}
          >
            {b.key}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 border-t border-line-dark pt-3 font-mono text-[10px]">
        {FLUID_SCALE.slice(0, 5).map((f) => (
          <div key={f.token} className="contents">
            <span className="text-paper/50">{f.token}</span>
            <span className="text-paper/35">{f.min}–{f.max}</span>
            <span className="text-right font-bold text-yellow">{fluidValue(f.min, f.max, vw)}px</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- safe area ---------- */

function SafeAreaDemo() {
  return (
    <div className="flex h-full flex-col gap-4 border-2 border-paper/25 bg-ink-2/70 p-5 sm:flex-row sm:p-6">
      <div className="relative mx-auto h-[260px] w-[132px] shrink-0 rounded-[16px] border-[3px] border-paper/40 bg-[#101014] sm:mx-0">
        <div className="absolute left-1/2 top-1.5 h-[14px] w-[38%] -translate-x-1/2 rounded-full bg-black" />
        <div className="heat-breathe absolute inset-x-0 top-0 flex h-[26px] items-center justify-center border-b border-dashed border-red/60 bg-red/15 font-mono text-[7px] uppercase tracking-wider text-red">
          inset-top
        </div>
        <div className="absolute inset-x-2 top-[34px] bottom-[30px] space-y-1.5">
          <div className="h-2.5 w-3/4 bg-paper/70" />
          <div className="h-1.5 w-full bg-paper/25" />
          <div className="h-1.5 w-5/6 bg-paper/25" />
          <div className="h-6 w-20 bg-yellow" />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-[24px] items-center justify-center border-t border-dashed border-red/60 bg-red/15 font-mono text-[7px] uppercase tracking-wider text-red">
          inset-bottom
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/60">safe-area · notch и home indicator</p>
        <ScrollWindow className="mt-3">
          <pre className="w-max min-w-full border border-line-dark bg-[#14120c] p-3 font-mono text-[10px] leading-relaxed text-paper/75">
{`.header-fixed {
  padding-top: calc(env(safe-area-inset-top) + 1rem);
}
.sticky-cta {
  bottom: calc(1rem + env(safe-area-inset-bottom));
}`}
          </pre>
        </ScrollWindow>
        <p className="mt-3 text-[12px] leading-relaxed text-paper/55">
          Обязательно <span className="font-mono text-[11px] text-yellow">viewport-fit=cover</span> в мета-теге — без него{" "}
          <span className="font-mono text-[11px]">env()</span> возвращает ноль, и контент прячется под Dynamic Island.
        </p>
      </div>
    </div>
  );
}

/* ---------- чек-лист + перф-бюджет ---------- */

function ManualChecklist() {
  const all = useMemo(() => MANUAL_CHECKS.flatMap((g) => g.items), []);
  const [done, setDone] = useState<Set<string>>(new Set());
  const toggle = (item: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  const pct = Math.round((done.size / all.length) * 100);

  return (
    <div className="border-2 border-paper/25 bg-ink-2/70 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/60">ручной QA · то, что автоматика не ловит</p>
        <span className={`font-mono text-[10px] font-bold ${pct === 100 ? "text-green" : "text-yellow"}`}>{done.size}/{all.length}</span>
      </div>
      <div className="mt-2 h-1 bg-paper/10">
        <div className="h-full bg-yellow transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {MANUAL_CHECKS.map((g) => (
          <div key={g.group}>
            <p className="font-display text-xs uppercase tracking-[0.14em] text-paper/80">{g.group}</p>
            <ul className="mt-2 space-y-1.5">
              {g.items.map((item) => {
                const checked = done.has(item);
                return (
                  <li key={item}>
                    <button onClick={() => toggle(item)} className="flex w-full items-start gap-2.5 text-left" aria-pressed={checked}>
                      <span
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center border font-mono text-[10px] transition-colors duration-150 ${
                          checked ? "border-green bg-green text-ink" : "border-paper/35 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className={`text-[12px] leading-snug transition-colors duration-150 ${checked ? "text-paper/40 line-through" : "text-paper/75"}`}>
                        {item}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className={`mt-4 border-t border-line-dark pt-3 font-mono text-[10px] uppercase tracking-[0.2em] ${pct === 100 ? "text-green" : "text-paper/40"}`}>
        {pct === 100 ? "✓ чек-лист закрыт — можно сдавать" : "остановка процесса, пока не закрыто (гейт 11.3)"}
      </p>
    </div>
  );
}

function PerfBudget() {
  return (
    <div className="border-2 border-paper/25 bg-ink-2/70 p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/60">перф-бюджет · Slow 4G / CPU×4</p>
      <table className="mt-3 w-full font-mono text-[11px]">
        <thead>
          <tr className="border-b border-line-dark text-left text-[9px] uppercase tracking-[0.2em] text-paper/40">
            <th className="pb-2 font-medium">метрика</th>
            <th className="pb-2 font-medium">mobile</th>
            <th className="pb-2 font-medium">Slow 3G</th>
          </tr>
        </thead>
        <tbody>
          {PERF_BUDGET.map((b) => (
            <tr key={b.metric} className="border-b border-line-dark/50 transition-colors duration-150 hover:bg-paper/5">
              <td className="py-1.5 text-paper/75">{b.metric}</td>
              <td className="py-1.5 font-bold text-yellow">{b.limit}</td>
              <td className="py-1.5 text-paper/45">{b.slow}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] leading-relaxed text-paper/50">
        Красивая адаптация бесполезна, если сайт грузится 10 секунд на 3G. Превышение бюджета = блокировка релиза в{" "}
        <span className="font-mono text-[10px] text-paper/70">ci/mobile-gate.yml</span>.
      </p>
    </div>
  );
}

/* ---------- секция ---------- */

export function MobilePerfect() {
  return (
    <section id="mobilnost" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        <SectionHead
          dark
          num="08"
          kicker="Mobile-Perfect · QA-модуль"
          lines={[<>Адаптация — не финальная</>, <span key="m" className="text-paper/50">проверка, а архитектура</span>]}
          aside={
            <Reveal delay={140}>
              <p className="max-w-sm text-sm leading-relaxed text-paper/70">
                Матрица из 22 вьюпортов, тап-зоны ≥44px, инпуты ≥16px, safe-area и перф-бюджет — проверяются на каждом
                шаге, а не «перед сдачей».
              </p>
            </Reveal>
          }
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Reveal>
            <DeviceSim />
          </Reveal>
          <Reveal delay={120}>
            <AuditPanel />
          </Reveal>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <FluidDemo />
          </Reveal>
          <Reveal delay={120}>
            <SafeAreaDemo />
          </Reveal>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <ManualChecklist />
          </Reveal>
          <Reveal delay={120}>
            <PerfBudget />
          </Reveal>
        </div>
      </div>
      <div className="hazard h-2.5" aria-hidden="true" />
    </section>
  );
}
