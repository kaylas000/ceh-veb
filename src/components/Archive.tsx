import { useState } from "react";
import { REFERENCES, SKILLS, PAIRS, TEXTURES } from "../data/archive";
import { MaskTitle, Reveal } from "../lib/motion";

const TABS = [
  { id: "refs", label: "Референсы", count: REFERENCES.length, code: "REF" },
  { id: "skills", label: "Скилы", count: SKILLS.length, code: "SK" },
  { id: "fonts", label: "Шрифты", count: PAIRS.length, code: "PAIRS" },
  { id: "textures", label: "Текстуры", count: TEXTURES.length, code: "T" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function RefRow({ r, i }: { r: (typeof REFERENCES)[number]; i: number }) {
  return (
    <Reveal delay={Math.min(i * 70, 280)}>
      <article className="group border-2 border-ink bg-card transition-shadow duration-300 hover:shadow-[10px_10px_0_var(--color-ink)]">
        <div className="grid lg:grid-cols-[1.15fr_1fr]">
          {/* левая плита: индекс */}
          <div className="relative border-b-2 border-ink p-5 lg:border-b-0 lg:border-r-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-red">
                  {r.id} · {r.style.join(" / ")}
                </p>
                <h3 className="mt-1 font-display text-2xl uppercase leading-none text-ink sm:text-3xl">
                  {r.site}
                </h3>
              </div>
              {/* скрин ждёт куратора */}
              <div className="hatch-pending relative hidden h-16 w-24 shrink-0 border border-ink/40 sm:block">
                <span className="absolute inset-0 grid place-items-center px-1 text-center font-mono text-[8px] uppercase leading-tight tracking-wider text-ink/60">
                  скрин: ждёт куратора
                </span>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {r.techniques.map((t) => (
                <li key={t} className="flex gap-2 text-[13px] leading-snug text-ink/85">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-red" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">палитра:</span>
              {r.palette.map((c) => (
                <span key={c} className="flex items-center gap-1.5 border border-ink/25 bg-paper px-1.5 py-0.5">
                  <span className="h-3.5 w-3.5 border border-ink/20" style={{ background: c }} />
                  <span className="font-mono text-[10px] uppercase text-ink/70">{c}</span>
                </span>
              ))}
            </div>
            {r.motion.length > 0 && (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted">
                движение: {r.motion.map((m) => `M·${m}`).join(" · ")}
              </p>
            )}
          </div>
          {/* правая плита: takeaway */}
          <div className="flex flex-col justify-between gap-4 bg-ink p-5 text-paper">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">забираем →</p>
              <blockquote className="mt-3 border-l-4 border-red pl-4 font-display text-lg leading-snug sm:text-xl">
                «{r.takeaway}»
              </blockquote>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] text-paper/50">references/**/{r.id}.meta.yaml</span>
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="border border-paper/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-paper/80 transition-colors duration-200 hover:bg-paper hover:text-ink"
              >
                источник ↗
              </a>
            </div>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function SkillRow({ s, i, open, onToggle }: { s: (typeof SKILLS)[number]; i: number; open: boolean; onToggle: () => void }) {
  return (
    <Reveal delay={Math.min(i * 70, 280)}>
      <article className="border-2 border-ink bg-card">
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-200 hover:bg-paper-2"
        >
          <span className="font-mono text-xs text-red">{s.id}</span>
          <span className="font-display text-xl uppercase leading-none text-ink sm:text-2xl">{s.name}</span>
          <span className="ml-auto hidden max-w-[40%] truncate font-mono text-[10px] uppercase tracking-wider text-muted md:block">
            {s.path}
          </span>
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center border-2 border-ink font-display text-lg transition-transform duration-300 ${
              open ? "rotate-45 bg-red text-paper" : "bg-paper text-ink"
            }`}
            aria-hidden="true"
          >
            +
          </span>
        </button>
        <div
          className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="grid gap-6 border-t-2 border-ink p-5 md:grid-cols-[1.3fr_1fr]">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">когда применять</p>
                <p className="mt-1 text-sm font-medium text-ink">{s.when}</p>
                <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">нумерованные правила</p>
                <ol className="mt-2 space-y-1.5">
                  {s.rules.map((rule, ri) => (
                    <li key={ri} className="flex gap-2.5 text-[13px] leading-snug text-ink/85">
                      <span className="font-mono text-[11px] font-bold text-red">{ri + 1}</span>
                      {rule}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="space-y-5">
                <div className="border-l-4 border-yellow bg-paper p-3.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">пример</p>
                  <p className="mt-1 text-[13px] leading-snug text-ink">{s.example}</p>
                </div>
                <div className="border-l-4 border-red bg-paper p-3.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-red">частые ошибки</p>
                  <ul className="mt-1 space-y-1">
                    {s.mistakes.map((m) => (
                      <li key={m} className="text-[13px] leading-snug text-ink/85">
                        × {m}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function TextureCard({ t, i }: { t: (typeof TEXTURES)[number]; i: number }) {
  const previews: Record<string, React.CSSProperties> = {
    "T-01": {
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
    },
    "T-02": {
      backgroundImage:
        "repeating-linear-gradient(90deg, rgba(22,21,15,0.25) 0 1px, transparent 1px 37px), repeating-linear-gradient(0deg, rgba(22,21,15,0.12) 0 1px, transparent 1px 9px), radial-gradient(ellipse at center, transparent 55%, rgba(22,21,15,0.5) 100%)",
      backgroundColor: "#8d887b",
    },
    "T-03": {
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.53 0 0 0 0 0.47 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E\")",
      backgroundColor: "#e3e0d5",
    },
  };
  return (
    <Reveal delay={i * 90}>
      <article className="border-2 border-ink bg-card">
        <div className="relative h-36 overflow-hidden border-b-2 border-ink" style={previews[t.id]}>
          <span className="absolute left-3 top-3 bg-ink px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper">
            {t.id} · превью
          </span>
          <span className="absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-wider text-ink/60">
            файл добавит куратор
          </span>
        </div>
        <div className="p-4">
          <h3 className="font-display text-xl uppercase text-ink">{t.name}</h3>
          <p className="mt-0.5 font-mono text-[10px] text-red">{t.file}</p>
          <p className="mt-3 text-[13px] leading-snug text-ink/85">{t.use}</p>
          <p className="mt-3 border-t border-line pt-2 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-muted">
            рецепт: {t.recipe}
          </p>
        </div>
      </article>
    </Reveal>
  );
}

export function Archive() {
  const [tab, setTab] = useState<TabId>("refs");
  const [openSkill, setOpenSkill] = useState(0);

  return (
    <section id="arhiv" className="relative bg-paper">
      <div className="bg-blueprint pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">03 / склад материалов</p>
            <MaskTitle
              className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.95] text-ink"
              lines={[<>Архив —</>, <>единственный источник</>]}
            />
          </div>
          <Reveal delay={150}>
            <p className="max-w-sm text-sm leading-relaxed text-ink/70">
              Агент берёт материалы только отсюда. Приём без источника — слоп (К-04).
              Записи лежат в <span className="font-mono text-[13px]">references/</span>,{" "}
              <span className="font-mono text-[13px]">skills/</span>,{" "}
              <span className="font-mono text-[13px]">assets/</span> — ниже живой INDEX.md.
            </p>
          </Reveal>
        </div>

        {/* панель вкладок */}
        <div className="mt-10 flex flex-wrap gap-0 border-2 border-ink" role="tablist" aria-label="Разделы архива">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 border-r-2 border-ink px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors duration-200 last:border-r-0 sm:px-6 ${
                tab === t.id ? "bg-ink text-paper" : "bg-card text-ink hover:bg-paper-2"
              }`}
            >
              <span className={tab === t.id ? "text-yellow" : "text-red"}>{t.code}</span>
              {t.label}
              <span className={`border px-1.5 text-[10px] ${tab === t.id ? "border-paper/40" : "border-ink/30"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "refs" && (
            <div className="space-y-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                INDEX.md · поиск по техникам: скролл · 6 записей сида → куратор дольёт до 30
              </p>
              {REFERENCES.map((r, i) => (
                <RefRow key={r.id} r={r} i={i} />
              ))}
            </div>
          )}

          {tab === "skills" && (
            <div className="space-y-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                SKILL-INDEX.md · frontmatter: name + when · правила нумерованы
              </p>
              {SKILLS.map((s, i) => (
                <SkillRow key={s.id} s={s} i={i} open={openSkill === i} onToggle={() => setOpenSkill(openSkill === i ? -1 : i)} />
              ))}
            </div>
          )}

          {tab === "fonts" && (
            <div>
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                assets/fonts/PAIRS.md · 5 пар с ролями · шрифты вне пар запрещены (Q-06)
              </p>
              <div className="border-2 border-ink bg-card">
                {PAIRS.map((p, i) => (
                  <Reveal key={p.display} delay={Math.min(i * 60, 240)}>
                    <div
                      className={`grid gap-4 px-5 py-5 lg:grid-cols-[1.4fr_1fr_1.2fr] ${
                        i > 0 ? "border-t-2 border-ink" : ""
                      }`}
                    >
                      <div>
                        <p
                          className="text-3xl leading-tight text-ink"
                          style={{ fontFamily: `"${p.display}", "Russo One", sans-serif` }}
                        >
                          {p.display}
                        </p>
                        <p className="mt-1 text-lg text-ink/80" style={{ fontFamily: `"${p.body}", "Golos Text", sans-serif` }}>
                          {p.body} — набор и подписи
                        </p>
                      </div>
                      <div className="flex items-start">
                        <span className="bg-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-paper">
                          {p.role}
                        </span>
                      </div>
                      <p className="self-center text-[13px] leading-snug text-ink/75">{p.note}</p>
                    </div>
                  </Reveal>
                ))}
                <div className="hazard-thin h-2" aria-hidden="true" />
              </div>
            </div>
          )}

          {tab === "textures" && (
            <div className="grid gap-5 md:grid-cols-3">
              {TEXTURES.map((t, i) => (
                <TextureCard key={t.id} t={t} i={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
