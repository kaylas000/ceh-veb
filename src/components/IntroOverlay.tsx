import { useEffect, useRef, useState } from "react";
import { IntroEngine, PRESET_META, type IntroPhase, type IntroPreset } from "../lib/intro";

/* Кинозаставка студии: канвас-движок + skip/звук + шторки к сайту.
   Правила SK-06: ≤4с, skip с первой секунды (и ESC), один показ за сессию,
   prefers-reduced-motion не доходит сюда (фильтр в App). */

export function IntroOverlay({ preset, onDone }: { preset: IntroPreset; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IntroEngine | null>(null);
  const [phase, setPhase] = useState<IntroPhase>("loading");
  const [prog, setProg] = useState(0);
  const [sound, setSound] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [curtain, setCurtain] = useState<"none" | "closed" | "open">("none");

  /* хореография перехода: шторки закрывают сцену, затем открывают сайт */
  useEffect(() => {
    if (phase !== "curtain") return;
    setCurtain("closed");
    const t1 = window.setTimeout(() => setCurtain("open"), 520);
    const t2 = window.setTimeout(() => onDone(), 1500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new IntroEngine({
      preset,
      onPhase: setPhase,
      onProgress: setProg,
      onDone,
    });
    engineRef.current = engine;
    void engine.start(canvas);

    const skipTimer = window.setTimeout(() => setShowSkip(true), 650);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") engine.skip();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(skipTimer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-[#0f0e0a]" role="dialog" aria-label="Заставка студии ЦЕХ">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* верхняя плашка */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6">
        <p className="border border-paper/20 bg-ink/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-paper/70 backdrop-blur-[2px]">
          ЦЕХ · премьера
        </p>
        <p className="border border-paper/20 bg-ink/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-yellow backdrop-blur-[2px]">
          {PRESET_META[preset].code} · {PRESET_META[preset].name}
        </p>
      </div>

      {/* титр */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-[18%] z-10 text-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          phase === "titr" ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-paper/80 sm:text-sm">
          веб-студия дизайна
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-paper/40">
          архив · скилы · валидатор
        </p>
      </div>

      {/* прогресс */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="h-[3px] flex-1 bg-paper/15">
            <div className="h-full bg-red transition-[width] duration-150" style={{ width: `${prog * 100}%` }} />
          </div>
          <span className="w-12 text-right font-mono text-[10px] tabular-nums text-paper/50">
            {Math.round(prog * 100)}%
          </span>
        </div>
      </div>

      {/* управление */}
      <div
        className={`absolute bottom-10 right-4 z-10 flex items-center gap-2.5 transition-opacity duration-500 sm:bottom-12 sm:right-6 ${
          showSkip ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          onClick={() => setSound(engineRef.current?.toggleSound() ?? false)}
          aria-pressed={sound}
          title={sound ? "Выключить звук" : "Включить звук (синтез, без файлов)"}
          className={`grid h-10 w-10 place-items-center border transition-colors duration-200 ${
            sound ? "border-yellow bg-yellow/15 text-yellow" : "border-paper/30 text-paper/60 hover:border-paper/70 hover:text-paper"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
            {sound ? (
              <>
                <path d="M16 9a4 4 0 0 1 0 6" strokeLinecap="round" />
                <path d="M18.5 6.5a8 8 0 0 1 0 11" strokeLinecap="round" />
              </>
            ) : (
              <path d="M16 9l6 6M22 9l-6 6" strokeLinecap="round" />
            )}
          </svg>
        </button>
        <button
          onClick={() => engineRef.current?.skip()}
          className="border border-paper/30 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-paper/80 transition-all duration-200 hover:border-red hover:bg-red hover:text-paper"
        >
          Пропустить →
        </button>
      </div>

      {/* кино-шторки: закрывают сцену, затем открывают сайт */}
      <div
        className={`absolute inset-y-0 left-0 z-20 w-1/2 border-r-4 border-red bg-[#131109] transition-transform duration-[700ms] ease-[cubic-bezier(0.65,0,0.15,1)] ${
          curtain === "none" ? "-translate-x-[103%]" : curtain === "closed" ? "translate-x-0" : "-translate-x-[103%]"
        }`}
        style={{ transitionDuration: curtain === "open" ? "900ms" : "500ms" }}
      >
        <div className="hazard float-right h-full" aria-hidden="true" style={{ width: 10 }} />
      </div>
      <div
        className={`absolute inset-y-0 right-0 z-20 w-1/2 border-l-4 border-red bg-[#131109] transition-transform duration-[700ms] ease-[cubic-bezier(0.65,0,0.15,1)] ${
          curtain === "none" ? "translate-x-[103%]" : curtain === "closed" ? "translate-x-0" : "translate-x-[103%]"
        }`}
        style={{ transitionDuration: curtain === "open" ? "900ms" : "500ms" }}
      >
        <div className="hazard float-left h-full" aria-hidden="true" style={{ width: 10 }} />
      </div>
    </div>
  );
}
