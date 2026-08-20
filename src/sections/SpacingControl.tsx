import { useEffect, useRef, useState } from "react";
import { SPACING_SCALE, SEMANTIC_TOKENS, FLUID_TOKENS, isApproved } from "../data/spacing";
import { SpacingOverlay, type AuditSummary } from "../lib/spacingOverlay";
import { Box, Stack, Spacer } from "../components/primitives";
import { Reveal, useInView, useCountUp } from "../lib/fx";
import { ScrollWindow } from "../components/ScrollWindow";
import { SectionHead } from "./Chrome";

const overlay = new SpacingOverlay();

const KIND_META = {
  margin: { label: "margin", color: "#ff6a2b", hot: "rgba(255,106,43,0.85)" },
  padding: { label: "padding", color: "#2e7d4f", hot: "rgba(46,125,79,0.8)" },
  gap: { label: "gap", color: "#5c7a99", hot: "rgba(92,122,153,0.9)" },
} as const;

/* ---------- интерактивная шкала-линейка ---------- */

function ScaleRuler() {
  const [ref, inView] = useInView<HTMLDivElement>(0.2);
  const [hover, setHover] = useState<string | null>(null);
  const max = 256;

  return (
    <div ref={ref} className="border-2 border-line-dark bg-ink-2 p-4 sm:p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow">утверждённая шкала</p>
        <p className="font-mono text-[10px] text-paper/40">19 значений · всё остальное — нарушение</p>
      </div>
      <div className="mt-4 space-y-0.5">
        {SPACING_SCALE.map((s, i) => {
          const w = Math.max(2, (s.px / max) * 100);
          const active = hover === s.key;
          const approved = isApproved(s.px);
          return (
            <button
              key={s.key}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              className="group flex w-full items-center gap-3 text-left"
              title={`--spacing-${s.key.replace(".", "-")}: ${s.px}px`}
            >
              <span className={`w-9 shrink-0 font-mono text-[11px] transition-colors ${active ? "text-yellow" : "text-paper/50"}`}>
                {s.key}
              </span>
              <span className="relative h-[14px] flex-1 bg-paper/5">
                <span
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    active ? "bg-red" : approved ? "bg-paper/30" : "bg-red/60"
                  }`}
                  style={{ width: inView ? `${w}%` : "0%", transitionDelay: `${i * 22}ms` }}
                />
              </span>
              <span className={`w-12 shrink-0 text-right font-mono text-[11px] tabular-nums transition-colors ${active ? "text-paper" : "text-paper/40"}`}>
                {s.px}px
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- пульт: оверлей + аудит ---------- */

function ControlPanel() {
  const [overlayOn, setOverlayOn] = useState(false);
  const [kinds, setKinds] = useState({ margin: true, padding: true, gap: true });
  const [report, setReport] = useState<AuditSummary | null>(null);
  const [scope, setScope] = useState<"stand" | "page">("stand");
  const standRef = useRef<HTMLDivElement>(null);
  const [countRef, countIn] = useInView<HTMLDivElement>(0.3);
  const total = useCountUp(report?.total ?? 0, countIn, 900);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setOverlayOn(overlay.toggle());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      overlay.disable();
    };
  }, []);

  const toggleOverlay = () => {
    const on = overlay.toggle();
    setOverlayOn(on);
  };

  const toggleKind = (k: keyof typeof kinds) => {
    const next = { ...kinds, [k]: !kinds[k] };
    setKinds(next);
    overlay.setVisibility(k, next[k]);
  };

  const runAudit = (target: "stand" | "page") => {
    setScope(target);
    const scopeNode = target === "stand" && standRef.current ? standRef.current : document;
    setReport(overlay.audit(scopeNode));
  };

  const verdictMeta =
    report?.verdict === "clean"
      ? { text: "Идеальная консистентность", cls: "bg-green/15 text-green border-green/50" }
      : report?.verdict === "minor"
        ? { text: "Незначительные нарушения", cls: "bg-yellow/15 text-yellow border-yellow/50" }
        : { text: "Требуется ревизия отступов", cls: "bg-red/15 text-red border-red/50" };

  return (
    <div className="border-2 border-line-dark bg-ink-2 p-4 sm:p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow">пульт визуального контроля</p>
        <p className="font-mono text-[10px] text-paper/40">Ctrl+Shift+S</p>
      </div>

      {/* переключатели слоёв */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((k) => {
          const on = kinds[k];
          return (
            <button
              key={k}
              onClick={() => toggleKind(k)}
              aria-pressed={on}
              className={`flex items-center gap-2 border px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-all duration-200 ${
                on ? "border-transparent text-coal" : "border-line-dark text-paper/50 hover:text-paper"
              }`}
              style={on ? { background: KIND_META[k].color } : undefined}
            >
              <span className="h-2.5 w-2.5 border" style={{ background: on ? "var(--color-coal)" : KIND_META[k].color, borderColor: on ? "var(--color-coal)" : KIND_META[k].color }} />
              {KIND_META[k].label}
            </button>
          );
        })}
      </div>

      <button
        onClick={toggleOverlay}
        className={`mt-4 w-full border-2 px-4 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] transition-all duration-200 hover:-translate-y-0.5 ${
          overlayOn
            ? "border-red bg-red text-paper hover:shadow-[5px_5px_0_rgba(206,44,24,0.4)]"
            : "border-paper/40 text-paper hover:border-paper hover:shadow-[5px_5px_0_rgba(232,230,222,0.25)]"
        }`}
      >
        {overlayOn ? "■ Снять оверлей" : "▶ Оверлей на всю страницу"}
      </button>
      <p className="mt-2 text-center font-mono text-[10px] text-paper/40">
        {overlayOn ? "красные метки ⚠ — значения вне шкалы" : "подсветит margin · padding · gap каждого блока"}
      </p>

      {/* аудит */}
      <div className="mt-5 border-t border-line-dark pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => runAudit("stand")}
            className={`border px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
              scope === "stand" && report ? "border-green text-green" : "border-line-dark text-paper/60 hover:text-paper"
            }`}
          >
            Аудит стенда
          </button>
          <button
            onClick={() => runAudit("page")}
            className={`border px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
              scope === "page" && report ? "border-red text-red" : "border-line-dark text-paper/60 hover:text-paper"
            }`}
          >
            Аудит всей страницы
          </button>
        </div>

        {report && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <div ref={countRef as never}>
                <p className="font-display text-5xl font-black leading-none text-paper">{total}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
                  нарушений · {scope === "stand" ? "чистый стенд" : "вся страница"}
                </p>
              </div>
              <span className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider ${verdictMeta.cls}`}>
                {verdictMeta.text}
              </span>
            </div>

            {report.topOffenders.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/40">топ нарушителей</p>
                {report.topOffenders.map(([key, n]) => (
                  <div key={key} className="flex items-center justify-between gap-3 border border-line-dark bg-ink px-3 py-1.5">
                    <code className="font-mono text-[11px] text-red">{key}</code>
                    <span className="font-mono text-[11px] font-bold text-paper">×{n}</span>
                  </div>
                ))}
              </div>
            )}
            {report.total === 0 && (
              <p className="mt-3 border border-green/40 bg-green/10 px-3 py-2 font-mono text-[11px] text-green">
                ✓ Все отступы стенда лежат в утверждённой шкале.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- чистый стенд на примитивах ---------- */

function CleanStand({ innerRef }: { innerRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div ref={innerRef} className="border-2 border-line-dark bg-ink-2 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-green">стенд на примитивах Box / Stack / Spacer</p>
      <p className="mt-1 font-mono text-[10px] text-paper/40">каждый отступ — токен из шкалы, произвольные значения отклоняются</p>

      <div className="mt-4">
        <Stack gap="6">
          <Box p="4" className="border border-paper/25 bg-ink">
            <p className="font-display text-sm uppercase text-paper">Карточка · p=4 (16px)</p>
            <p className="mt-1 font-mono text-[10px] text-paper/45">внутри Stack gap=6 (24px)</p>
          </Box>
          <Box p="4" className="border border-paper/25 bg-ink">
            <p className="font-display text-sm uppercase text-paper">Вторая карточка</p>
          </Box>
          <Stack direction="horizontal" gap="3" align="center">
            <Box px="3" py="2" className="bg-yellow font-mono text-[11px] font-bold uppercase text-coal">chip</Box>
            <Box px="3" py="2" className="border border-paper/30 font-mono text-[11px] uppercase text-paper">chip</Box>
            <Spacer size="2" axis="horizontal" />
            <Box px="3" py="2" className="border border-red/60 font-mono text-[11px] uppercase text-red">после Spacer=2</Box>
          </Stack>
        </Stack>
      </div>

      <ScrollWindow className="mt-4">
        <pre className="w-max min-w-full border border-line-dark bg-[#14120c] p-3 font-mono text-[11px] leading-relaxed text-paper/75">
{`<Stack gap="6">            /* 24px — гарантированно */
  <Box p="4">…</Box>       /* 16px — из шкалы */
  <Box gap="13">…</Box>    /* ❌ console.error + data-spacing-invalid */
</Stack>`}
        </pre>
      </ScrollWindow>
    </div>
  );
}

/* ---------- секция ---------- */

export function SpacingControl() {
  const standRef = useRef<HTMLDivElement>(null);

  return (
    <section id="otstupy" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        <SectionHead
          dark
          num="07"
          kicker="spacing control · QA-модуль"
          lines={[<>Отступы —</>, <span key="s" className="text-paper/50">по шкале или никак</span>]}
          aside={
            <Reveal delay={140}>
              <p className="max-w-sm text-sm leading-relaxed text-paper/70">
                Хаотичные 13px и 15px — главный маркер разболтанной вёрстки. Модуль делает произвольные
                значения невозможными: токены, примитивы, живой оверлей и автоаудит на каждом этапе.
              </p>
            </Reveal>
          }
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <ScaleRuler />
          </Reveal>
          <Reveal delay={120}>
            <ControlPanel />
          </Reveal>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <CleanStand innerRef={standRef} />
          </Reveal>

          {/* семантика + fluid */}
          <div className="space-y-5">
            <Reveal delay={100}>
              <div className="border-2 border-line-dark bg-ink-2 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow">семантические токены</p>
                <div className="mt-3 space-y-1.5">
                  {SEMANTIC_TOKENS.slice(0, 5).map((t) => (
                    <div key={t.token} className="flex items-baseline justify-between gap-3 border-b border-line-dark/60 pb-1.5">
                      <code className="font-mono text-[11px] text-paper/80">{t.token}</code>
                      <span className="font-mono text-[10px] text-paper/40">{t.role} · {t.px}px</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={180}>
              <div className="border-2 border-line-dark bg-ink-2 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow">fluid · clamp() между 375 и 1440px</p>
                <div className="mt-3 space-y-2">
                  {FLUID_TOKENS.map((f) => (
                    <div key={f.token}>
                      <div className="flex items-baseline justify-between gap-3">
                        <code className="font-mono text-[11px] text-paper/80">{f.token}</code>
                        <span className="font-mono text-[10px] text-paper/40">{f.minPx}→{f.maxPx}px</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full bg-paper/10">
                        <div className="h-full" style={{ width: `${(f.maxPx / 256) * 100}%`, background: "linear-gradient(90deg,var(--color-green),var(--color-yellow))" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal>
          <p className="mt-6 border-l-4 border-red bg-ink-2/60 px-4 py-3 font-mono text-[11px] leading-relaxed text-paper/60">
            Пайплайн принуждения: <span className="text-paper">Figma-плагин</span> → <span className="text-paper">Stylelint no-arbitrary-values</span> →{" "}
            <span className="text-paper">Box/Stack</span> → <span className="text-paper">оверлей</span> → <span className="text-paper">автоаудит</span> →{" "}
            <span className="text-red">CI-gate блокирует PR</span>. Полные исходники — в скачиваемом архиве студии.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
