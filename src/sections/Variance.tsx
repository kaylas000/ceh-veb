import { useMemo, useState } from "react";
import {
  ASSET_LIBRARY,
  CATEGORY_LABEL,
  MOOD_DICTIONARY,
  calculateCombinatorics,
  generateUniqueGenome,
  registerGenome,
  type Genome,
} from "../lib/genome";
import { Reveal } from "../lib/fx";
import { SectionHead } from "./Chrome";

const MOODS = Object.keys(MOOD_DICTIONARY);
const INDUSTRIES = ["индустрия", "saas", "мода", "медиа", "финансы", "образование", "wellness", "ивенты"];

/* ---------- мини-превью: геном → живой макет через CSS-переменные ---------- */

function GenomePreview({ g }: { g: Genome }) {
  const radius = g.radius;
  const btn = g.button.dimensions;
  const isGhost = btn.fill === "transparent";
  const cols = Number(g.grid.dimensions.columns) > 7 ? 3 : 2;
  return (
    <div
      className="overflow-hidden border-2"
      style={
        {
          "--g-primary": g.colors.primary,
          "--g-accent": g.colors.accent,
          "--g-paper": g.colors.paper,
          "--g-ink": g.colors.ink,
          background: "var(--g-paper)",
          borderColor: "var(--g-ink)",
        } as React.CSSProperties
      }
    >
      {/* hero */}
      <div style={{ background: "var(--g-primary)", padding: "20px 18px" }}>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--g-paper)", opacity: 0.7 }}>
          {g.sectionOrder[0]} · {g.grid.name}
        </p>
        <p className="mt-1 font-display text-xl leading-tight" style={{ color: "var(--g-paper)" }}>
          Заголовок проекта
        </p>
        <button
          className="mt-3 cursor-default border-2 px-4 py-2 font-display text-[11px] uppercase tracking-[0.1em]"
          style={{
            borderRadius: radius,
            background: isGhost ? "transparent" : "var(--g-accent)",
            borderColor: isGhost ? "var(--g-accent)" : "transparent",
            color: isGhost ? "var(--g-accent)" : "var(--g-ink)",
          }}
        >
          {g.button.name}
        </button>
      </div>
      {/* секции по порядку */}
      <div style={{ padding: "16px 18px" }}>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {g.sectionOrder.slice(1).map((s) => (
            <div
              key={s}
              className="border p-2.5 font-mono text-[9px] uppercase tracking-[0.12em]"
              style={{ background: "#ffffff", borderColor: "var(--g-ink)", borderRadius: radius, color: "var(--g-ink)" }}
            >
              {s}
            </div>
          ))}
        </div>
        {/* палитра */}
        <div className="mt-3 flex gap-1.5">
          {[g.colors.primary, g.colors.secondary, g.colors.accent, g.colors.neutral].map((c, i) => (
            <span key={i} className="h-7 flex-1 border" style={{ background: c, borderColor: "var(--g-ink)" }} title={c} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- строка ассета ---------- */

function AssetRow({ label, opt, accent }: { label: string; opt: Genome["button"]; accent: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-dark py-2 last:border-b-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/45">{label}</span>
      <span className="min-w-0 text-right">
        <span className="font-display text-sm text-paper">{opt.name}</span>
        <span className="ml-2 font-mono text-[9px] text-paper/40">{opt.note}</span>
      </span>
    </div>
  );
}

export function Variance() {
  const [brief, setBrief] = useState("Современный и дорогой сайт для индустриального бренда, без излишней игривости");
  const [moods, setMoods] = useState<string[]>(["современный", "дорогой"]);
  const [industry, setIndustry] = useState<string[]>(["индустрия"]);
  const [projectId, setProjectId] = useState("prj-042");
  const [genome, setGenome] = useState<Genome | null>(null);
  const [registered, setRegistered] = useState(false);

  const combinatorics = useMemo(() => calculateCombinatorics(), []);

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const forge = () => {
    const g = generateUniqueGenome(projectId.trim() || "prj", moods, industry);
    setGenome(g);
    setRegistered(false);
  };

  const save = () => {
    if (!genome) return;
    registerGenome(genome);
    setRegistered(true);
  };

  return (
    <section id="genom" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <SectionHead
          dark
          num="13"
          kicker="design variance engine"
          lines={[<>Геном-станок:</>, <span key="v" className="text-paper/50">один бриф — новая ДНК</span>]}
          aside={
            <Reveal delay={140}>
              <p className="max-w-sm text-sm leading-relaxed text-paper/70">
                Конечный каталог скиллов × бесконечные комбинации. Seed от ID проекта делает результат
                воспроизводимым, а реестр отпечатков не даёт двум клиентам получить одинаковый дизайн.
              </p>
            </Reveal>
          }
        />

        {/* комбинаторика */}
        <Reveal delay={120}>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-2 border-paper/25 bg-ink-2 px-5 py-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">масштаб вариативности</span>
            <span className="font-display text-2xl text-paper">
              {combinatorics.toLocaleString("ru-RU")}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/50">
              уникальных комбинаций из {Object.values(ASSET_LIBRARY).reduce((s, p) => s + p.length, 0)} активов
            </span>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr]">
          {/* левая колонка: ввод */}
          <div className="space-y-6">
            <Reveal>
              <div className="border-2 border-paper/25 bg-ink-2 p-5">
                <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow" htmlFor="genome-brief">
                  01 · бриф (извлекаем mood-слова)
                </label>
                <textarea
                  id="genome-brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  rows={3}
                  className="mt-3 w-full resize-none border border-line-dark bg-ink p-3 text-sm text-paper outline-none transition-colors focus:border-yellow"
                />
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="border-2 border-paper/25 bg-ink-2 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">02 · mood-слова (вектор дизайна)</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => toggle(moods, m, setMoods)}
                      className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all duration-200 ${
                        moods.includes(m)
                          ? "border-yellow bg-yellow text-ink"
                          : "border-paper/30 text-paper/60 hover:border-paper/70 hover:text-paper"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">03 · индустрия</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {INDUSTRIES.map((i) => (
                    <button
                      key={i}
                      onClick={() => toggle(industry, i, setIndustry)}
                      className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all duration-200 ${
                        industry.includes(i)
                          ? "border-red bg-red text-paper"
                          : "border-paper/30 text-paper/60 hover:border-paper/70 hover:text-paper"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="ID проекта (seed)"
                  aria-label="ID проекта (seed для генерации генома)"
                  className="w-44 border border-line-dark bg-ink p-3 font-mono text-sm text-yellow outline-none transition-colors focus:border-yellow"
                />
                <button
                  onClick={forge}
                  className="press-ready border-2 border-red bg-red px-7 py-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-paper transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(206,44,24,0.4)]"
                >
                  Выковать ДНК
                </button>
              </div>
            </Reveal>
          </div>

          {/* правая колонка: геном */}
          <div>
            {!genome ? (
              <Reveal delay={100}>
                <div className="grid h-full min-h-[320px] place-items-center border-2 border-dashed border-paper/25 bg-ink-2/50 p-8 text-center">
                  <div>
                    <p className="font-display text-3xl uppercase text-paper/25">ДНК не выкована</p>
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/40">
                      задай mood → выкуй → утверди
                    </p>
                  </div>
                </div>
              </Reveal>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-paper/25 bg-ink-2 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-lg uppercase text-paper">{genome.projectId}</p>
                    <span className="font-mono text-[10px] text-paper/45">seed {genome.seed}</span>
                  </div>
                  <div className="mt-1">
                    {genome.moods.length ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-yellow">
                        mood: {genome.moods.join(" · ")}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/40">mood: не задан</span>
                    )}
                  </div>
                  <div className="mt-3">
                    <AssetRow label={CATEGORY_LABEL.buttons} opt={genome.button} accent={genome.colors.accent} />
                    <AssetRow label={CATEGORY_LABEL.grids} opt={genome.grid} accent={genome.colors.accent} />
                    <AssetRow label={CATEGORY_LABEL.iconSets} opt={genome.iconSet} accent={genome.colors.accent} />
                    <AssetRow label={CATEGORY_LABEL.illustrationStyles} opt={genome.illustration} accent={genome.colors.accent} />
                    <AssetRow label={CATEGORY_LABEL.animationPresets} opt={genome.animation} accent={genome.colors.accent} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-dark pt-3">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/45">гармония</span>
                    <span className="border border-yellow/50 px-2 py-0.5 font-mono text-[10px] uppercase text-yellow">
                      {genome.colors.harmonyType}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/45">hue {genome.colors.baseHue}°</span>
                    {genome.colors.baseHue >= 220 && genome.colors.baseHue <= 260 ? (
                      <span className="font-mono text-[9px] uppercase text-red">AI-диапазон!</span>
                    ) : (
                      <span className="font-mono text-[9px] uppercase text-green">вне AI-диапазона</span>
                    )}
                  </div>
                </div>

                <GenomePreview g={genome} />

                {/* уникальность */}
                <div
                  className={`border-2 p-4 ${
                    genome.uniqueness.conflictLevel === "high"
                      ? "border-red bg-red/10"
                      : genome.uniqueness.conflictLevel === "moderate"
                        ? "border-yellow bg-yellow/10"
                        : "border-green bg-green/10"
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/70">уникальность комбинации</p>
                  <p
                    className={`mt-1 font-display text-lg uppercase ${
                      genome.uniqueness.conflictLevel === "high"
                        ? "text-red"
                        : genome.uniqueness.conflictLevel === "moderate"
                          ? "text-yellow"
                          : "text-green"
                    }`}
                  >
                    {genome.uniqueness.conflictLevel === "high"
                      ? "конфликт — замени 2 элемента"
                      : genome.uniqueness.conflictLevel === "moderate"
                        ? `частичное сходство (${genome.uniqueness.matches.length})`
                        : "полностью уникально"}
                  </p>
                  {genome.uniqueness.matches.length > 0 && (
                    <p className="mt-1 font-mono text-[10px] text-paper/50">
                      пересекается с: {genome.uniqueness.matches.map((m) => `${m.projectId} (${m.count}/4)`).join(", ")}
                    </p>
                  )}
                </div>

                <button
                  onClick={save}
                  disabled={registered}
                  className={`w-full border-2 px-6 py-3 font-display text-sm font-bold uppercase tracking-[0.12em] transition-all duration-200 ${
                    registered
                      ? "cursor-default border-green bg-green/15 text-green"
                      : "border-paper/40 text-paper hover:border-paper hover:bg-paper hover:text-ink"
                  }`}
                >
                  {registered ? "✓ зарегистрировано в реестре" : "зарегистрировать в реестр"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
