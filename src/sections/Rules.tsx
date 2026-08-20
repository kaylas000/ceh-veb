import { useState } from "react";
import { CONSTITUTION, BANNED, QUOTAS } from "../data/library";
import { Reveal, Stamp, useInView } from "../lib/fx";
import { SectionHead } from "./Chrome";

function MethodBadge({ m }: { m: string }) {
  const kind = m.includes("+") ? "mix" : m === "grep" ? "grep" : "ad";
  const cls =
    kind === "grep"
      ? "border-red/60 text-red"
      : kind === "ad"
        ? "border-steel/70 text-steel"
        : "border-yellow/70 text-[#8a6a10]";
  return (
    <span className={`inline-block border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${cls}`}>{m}</span>
  );
}

/* маппинг правила → слой принуждения */
function enforcement(code: string): string {
  const n = parseInt(code.split("-")[1], 10);
  if (n <= 9) return "ворота G1–G4 + validate.mjs";
  if (n === 10) return "регламент возврата";
  if (n === 11) return "приёмка куратора";
  if (n === 12) return "mobile-аудит + sweep";
  if (n === 13) return "seo-gate в CI";
  if (n === 14) return "геном-станок + реестр";
  return "qa fortress + ci-гейты";
}

export function Rules() {
  const [headRef, headIn] = useInView<HTMLDivElement>(0.3);
  const [openBan, setOpenBan] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyPattern = (code: string, pattern: string) => {
    navigator.clipboard?.writeText(pattern).catch(() => {});
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <section id="reglament" className="relative bg-paper">
      <div className="bg-blueprint pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        {/* липкая сцена M-03 */}
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.35fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div ref={headRef} className={headIn ? "rv-in" : ""}>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">03 / конституция</p>
              <div className="mt-3 font-display text-[clamp(2.4rem,5.5vw,4.2rem)] uppercase leading-[0.92] text-ink">
                <span className="line-mask"><span>Закон</span></span>
                <span className="line-mask"><span style={{ ["--rv-delay" as string]: "110ms" }}>цеха</span></span>
              </div>
            </div>
            <Reveal delay={120}>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/70">
                {CONSTITUTION.length} нумерованных правил — от «код не пишется до DIRECTION» до «ошибки ловятся на
                самом дешёвом слое». Каждое проверяемо и привязано к конкретному механизму принуждения. Нарушение без
                фикса — возврат на G4.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className="mt-7 inline-block">
                <Stamp rot={-6} color="var(--color-green)">
                  Утверждено · v2.0
                </Stamp>
              </div>
            </Reveal>
            <div className="mt-8 hidden items-center gap-3 border-t-2 border-ink pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted lg:flex">
              <span className="led-dot h-2 w-2 rounded-full bg-red" />
              раздел закреплён — рецепт M-03 в действии
            </div>
          </div>

          <ol className="border-t-2 border-ink">
            {CONSTITUTION.map((r, i) => (
              <Reveal key={r.code} delay={Math.min(i * 40, 200)}>
                <li className="group grid gap-3 border-b-2 border-ink py-5 pl-1 transition-colors duration-300 hover:bg-card sm:grid-cols-[86px_1fr] sm:gap-5 sm:pl-3">
                  <span className="font-display text-2xl leading-none text-red sm:text-3xl">{r.code}</span>
                  <div>
                    <p className="text-[15px] font-semibold leading-snug text-ink">{r.text}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                        проверка: <span className="text-ink/70">{r.check}</span>
                      </span>
                      <MethodBadge m={r.method} />
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-steel">
                        ⚙ {enforcement(r.code)}
                      </span>
                    </div>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* BANNED — интерактивный grep-терминал */}
        <div className="mt-24">
          <SectionHead
            num="03.1"
            kicker="anti-slop/BANNED.md"
            lines={[<>Чёрный список ·</>, <span key="b" className="text-red">{BANNED.length} пунктов</span>]}
            aside={
              <Reveal>
                <p className="max-w-sm text-sm leading-relaxed text-ink/70">
                  У каждого запрета — метод проверки. Клик по строке раскрывает grep-паттерн; клик по паттерну
                  копирует его в буфер. lint-slop.mjs идёт по этому списку и возвращает file:line.
                </p>
              </Reveal>
            }
          />
          <div className="mt-8 border-2 border-ink bg-ink">
            <div className="flex items-center justify-between border-b-2 border-line-dark px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/70">$ lint-slop.mjs --watch</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow" />
                <span className="h-2.5 w-2.5 rounded-full bg-green" />
              </span>
            </div>
            {BANNED.map((b, i) => {
              const open = openBan === b.code;
              return (
                <Reveal key={b.code} delay={Math.min(i * 30, 180)}>
                  <button
                    onClick={() => setOpenBan(open ? null : b.code)}
                    className={`block w-full border-b border-line-dark px-4 py-3.5 text-left transition-colors duration-200 last:border-b-0 ${
                      open ? "bg-ink-2" : "hover:bg-ink-2/60"
                    }`}
                    aria-expanded={open}
                  >
                    <div className="grid items-center gap-2 md:grid-cols-[70px_1fr_150px_28px] md:gap-4">
                      <span className="font-mono text-xs font-bold text-red">{b.code}</span>
                      <span className="text-sm font-medium leading-snug text-paper">{b.text}</span>
                      <span><MethodBadge m={b.method} /></span>
                      <span className={`hidden font-mono text-paper/50 transition-transform duration-200 md:block ${open ? "rotate-90" : ""}`}>›</span>
                    </div>
                    {open && (
                      <div className="mt-3 md:pl-[86px]">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            copyPattern(b.code, b.pattern);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              copyPattern(b.code, b.pattern);
                            }
                          }}
                          className="inline-block cursor-copy border border-line-dark bg-[#14120c] px-3 py-1.5 font-mono text-[11px] text-yellow transition-colors hover:border-yellow"
                          title="клик — скопировать паттерн"
                        >
                          {copied === b.code ? "✓ скопировано" : `grep -E "${b.pattern}"`}
                        </span>
                      </div>
                    )}
                  </button>
                </Reveal>
              );
            })}
            <div className="hazard-thin h-2" aria-hidden="true" />
          </div>
        </div>

        {/* QUOTAS — шкалы-допуски */}
        <div className="mt-24">
          <SectionHead num="03.2" kicker="anti-slop/QUOTAS.md" lines={[<>Квоты —</>, <span key="q" className="text-red">числовые допуски</span>]} />
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-5">
            {QUOTAS.map((q, i) => {
              /* условная «заполненность» шкалы для визуального ритма */
              const fill = [60, 40, 75, 90, 50, 100, 35, 80, 70, 55][i % 10];
              return (
                <Reveal key={q.code} delay={Math.min(i * 50, 300)}>
                  <div className="group relative h-full overflow-hidden border-2 border-ink bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-ink">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-red transition-colors group-hover:text-yellow">{q.code}</p>
                    <p className="mt-2 font-display text-3xl leading-none text-ink transition-colors duration-300 group-hover:text-paper">
                      {q.value}
                    </p>
                    <p className="mt-2.5 text-[12px] font-medium leading-snug text-ink/75 transition-colors duration-300 group-hover:text-paper/75">
                      {q.text}
                    </p>
                    {/* шкала допуска */}
                    <div className="mt-3 h-1.5 w-full bg-ink/10 transition-colors group-hover:bg-paper/15">
                      <div
                        className="h-full bg-red transition-all duration-500 group-hover:bg-yellow"
                        style={{ width: `${fill}%` }}
                      />
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <Reveal delay={360}>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-ink px-5 py-4 text-paper">
              <p className="font-display text-base uppercase leading-snug">
                Квота — не совет. <span className="text-red">Квота — допуск.</span>
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/50">
                проверяет validate.mjs · V-05 + V-12…V-14
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
