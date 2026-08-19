import { CONSTITUTION, BANNED, QUOTAS } from "../data/content";
import { MaskTitle, Reveal, Stamp } from "../lib/motion";

function MethodBadge({ m }: { m: string }) {
  const kind = m.includes("+") ? "mix" : m === "grep" ? "grep" : "ad";
  const cls =
    kind === "grep"
      ? "border-red/60 text-red"
      : kind === "ad"
        ? "border-steel/60 text-steel"
        : "border-yellow/70 text-[#8a6a10]";
  return (
    <span className={`inline-block border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${cls}`}>
      {m}
    </span>
  );
}

export function Regulations() {
  return (
    <section id="reglament" className="relative bg-paper">
      <div className="bg-blueprint pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        {/* липкая сцена M-03: левая плита закреплена */}
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.35fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">05 / конституция</p>
            <MaskTitle
              className="mt-3 font-display text-[clamp(2.4rem,5.5vw,4.4rem)] uppercase leading-[0.92] text-ink"
              lines={[<>Закон</>, <>цеха</>]}
            />
            <Reveal delay={120}>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/70">
                Одиннадцать нумерованных правил. Каждое проверяемо: валидатором, артдиректором
                или обоими сразу. Нарушение без фикса — возврат на G4.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className="mt-7 inline-block">
                <Stamp rot={-6} color="var(--color-green)">
                  Утверждено · v1.0
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
                    </div>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* BANNED */}
        <div className="mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">anti-slop/BANNED.md</p>
              <h3 className="mt-2 font-display text-[clamp(1.8rem,4vw,3rem)] uppercase leading-none text-ink">
                Чёрный список · 16 пунктов
              </h3>
            </div>
            <Reveal>
              <p className="max-w-sm text-sm leading-relaxed text-ink/70">
                У каждого запрета — метод проверки: grep-паттерн или критерий артдиректора.
                lint-slop.mjs идёт по этому списку и возвращает file:line.
              </p>
            </Reveal>
          </div>

          <div className="mt-8 border-2 border-ink bg-card">
            <div className="hidden grid-cols-[70px_1fr_150px_220px] gap-4 border-b-2 border-ink bg-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/70 md:grid">
              <span>код</span>
              <span>запрет</span>
              <span>метод</span>
              <span>паттерн / критерий</span>
            </div>
            {BANNED.map((b, i) => (
              <Reveal key={b.code} delay={Math.min(i * 30, 180)}>
                <div className="grid gap-2 border-b border-line px-4 py-3.5 transition-colors duration-200 last:border-b-0 hover:bg-paper md:grid-cols-[70px_1fr_150px_220px] md:gap-4">
                  <span className="font-mono text-xs font-bold text-red">{b.code}</span>
                  <span className="text-sm font-medium leading-snug text-ink">{b.text}</span>
                  <span><MethodBadge m={b.method} /></span>
                  <span className="break-words font-mono text-[11px] leading-snug text-muted">{b.pattern}</span>
                </div>
              </Reveal>
            ))}
            <div className="hazard-thin h-2" aria-hidden="true" />
          </div>
        </div>

        {/* QUOTAS */}
        <div className="mt-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">anti-slop/QUOTAS.md</p>
          <h3 className="mt-2 font-display text-[clamp(1.8rem,4vw,3rem)] uppercase leading-none text-ink">
            Квоты · числовые лимиты
          </h3>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4">
            {QUOTAS.map((q, i) => (
              <Reveal key={q.code} delay={Math.min(i * 60, 300)}>
                <div
                  className={`group h-full border-2 border-ink bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-ink ${
                    i > 0 ? "sm:-ml-0.5" : ""
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-red transition-colors group-hover:text-yellow">
                    {q.code}
                  </p>
                  <p className="mt-2 font-display text-4xl leading-none text-ink transition-colors duration-300 group-hover:text-paper sm:text-5xl">
                    {q.value}
                  </p>
                  <p className="mt-3 text-[13px] font-medium leading-snug text-ink/75 transition-colors duration-300 group-hover:text-paper/75">
                    {q.text}
                  </p>
                </div>
              </Reveal>
            ))}
            <Reveal delay={360}>
              <div className="flex h-full flex-col justify-center border-2 border-ink bg-ink p-5 text-paper">
                <p className="font-display text-lg uppercase leading-snug">
                  Квота — не совет.
                  <br />
                  <span className="text-red">Квота — допуск.</span>
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2">
                  проверяет validate.mjs · код V-05
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
