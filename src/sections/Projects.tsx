import { useMemo } from "react";
import { buildStudioFiles, downloadStudioZip } from "../lib/studio";
import { downloadFilesZip } from "../lib/zip";
import { FS } from "../data/fs";
import { Reveal, Stamp, useInView } from "../lib/fx";
import { SectionHead } from "./Chrome";

const CYCLE = [
  { n: "1", t: "Скачай студию", d: "ЦЕХ целиком: AGENTS.md, скилы, рецепты, валидатор, шаблоны — один ZIP.", hl: true },
  { n: "2", t: "Проект в корне", d: "Скопируй projects/_TEMPLATE/, запусти roulette.mjs — оси в SEED.md." },
  { n: "3", t: "Агент берёт библиотеку", d: "Приёмы только из references/ и skills/, слоп режет validate.mjs — обязательно." },
  { n: "4", t: "Верни удачное", d: "Новые блоки и скилы оседают в архиве — и здесь появляется блок проекта.", hl: true },
];

const YIELDS = [
  { to: "references/REF-07", what: "6 техник + takeaway + палитра сайта" },
  { to: "skills/SK-05", what: "новый скил «производственный паспорт»" },
  { to: "motion/M-08, M-09", what: "печь-телеметрия и конвейер-крюки" },
  { to: "projects/pcpolimer/", what: "SEED · DIRECTION · SOURCES · REVIEW" },
];

function siteFiles(root: string) {
  return Object.entries(FS)
    .filter(([p]) => p.startsWith(root + "/site/"))
    .map(([p, content]) => ({ name: p.replace(root + "/", ""), content }));
}

export function Projects() {
  const studioCount = useMemo(() => buildStudioFiles().length, []);
  const [headRef, headIn] = useInView<HTMLDivElement>(0.2);

  const download = async (btn: HTMLButtonElement, fn: () => Promise<number>, idle: string) => {
    if (!btn || btn.dataset.busy === "1") return;
    btn.dataset.busy = "1";
    btn.textContent = "Упаковка…";
    try {
      await fn();
      btn.textContent = "✓ Отдано — смотри загрузки";
    } catch {
      btn.textContent = "Ошибка — попробуй ещё раз";
    }
    window.setTimeout(() => {
      btn.dataset.busy = "0";
      btn.textContent = idle;
    }, 6000);
  };

  return (
    <section id="proekty" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        <div ref={headRef} className={headIn ? "rv-in" : ""}>
          <SectionHead
            dark
            num="10"
            kicker="цикл студии"
            lines={[<>Библиотека</>, <span key="p" className="text-paper/50">наполняется боем</span>]}
            aside={
              <Reveal delay={140}>
                <p className="max-w-sm text-sm leading-relaxed text-paper/70">
                  Скачай ЦЕХ, положи в корень репозитория агента — и каждый принятый сайт будет возвращать находки в
                  архив: приёмы, скилы, рецепты. Так студия растёт.
                </p>
              </Reveal>
            }
          />
        </div>

        {/* цикл */}
        <div className="mt-12 grid gap-0 border-2 border-paper/25 sm:grid-cols-2 lg:grid-cols-4">
          {CYCLE.map((c, i) => (
            <Reveal key={c.n} delay={i * 90}>
              <div
                className={`relative h-full border-paper/25 p-5 sm:p-6 ${i > 0 ? "border-t-2 sm:border-t-0 sm:border-l-2" : ""} ${
                  c.hl ? "bg-ink-2" : "bg-ink-2/50"
                }`}
              >
                <p className={`font-display text-5xl leading-none ${c.hl ? "text-yellow" : "text-paper/25"}`}>{c.n}</p>
                <p className="mt-3 font-display text-lg uppercase tracking-wide text-paper">{c.t}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-paper/60">{c.d}</p>
                {i < CYCLE.length - 1 && (
                  <span className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-yellow sm:block" aria-hidden="true">
                    →
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        {/* скачать студию */}
        <Reveal>
          <div className="mt-6 flex flex-col items-stretch gap-5 border-2 border-yellow bg-yellow/10 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">скачать студию · ceh-studio.zip</p>
              <p className="mt-2 text-sm leading-relaxed text-paper/80">
                Внутри <span className="font-bold text-paper">{studioCount} файлов</span>: контракты агента, конституция,
                библиотека (референсы, скилы, 9 рецептов с сниппетами), anti-slop, ворота G1–G4, Node-скрипты с нулём
                зависимостей, шаблон проекта и слоп-фикстура для приёмки.
              </p>
            </div>
            <button
              onClick={(e) => download(e.currentTarget, () => downloadStudioZip("ceh-studio.zip"), `↓ Скачать студию (${studioCount} файлов)`)}
              className="press-ready shrink-0 border-2 border-yellow bg-yellow px-8 py-4 font-display text-base font-bold uppercase tracking-[0.12em] text-ink transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(224,169,28,0.45)]"
            >
              ↓ Скачать студию ({studioCount} файлов)
            </button>
          </div>
        </Reveal>

        {/* боевой проект */}
        <Reveal>
          <article className="mt-6 border-2 border-paper/25 bg-ink-2/70">
            <div className="grid lg:grid-cols-[1.25fr_1fr]">
              <div className="border-b-2 border-paper/25 p-5 sm:p-6 lg:border-b-0 lg:border-r-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="bg-red px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-paper">PRJ-01</span>
                  <h3 className="font-display text-xl uppercase tracking-wide text-paper sm:text-2xl">
                    Порошковая покраска · Pcpolimer
                  </h3>
                  <span className="border border-green px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-green">
                    принят G4 · exit 0
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-paper/70">
                  Промышленный цех в Красногорске: открытие — наряд-заказ и живая печь вместо hero, фирменный акцент —
                  рабочая палитра RAL, прайс как наряд-строки. Первый проект, собранный из этого архива.
                </p>
                <div className="mt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">раздача SEED · бросок №51</p>
                  <dl className="mt-2 space-y-1.5">
                    {[
                      ["Композиция", "наряд-паспорт с левой плитой"],
                      ["Движение", "липкие станции + конвейер-лента"],
                      ["Типографика", "Tektur-капс + моно-метки"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex flex-wrap items-baseline gap-x-3 border-b border-line-dark pb-1.5">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">{k}</dt>
                        <dd className="font-display text-sm uppercase text-paper">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button
                    onClick={(e) =>
                      download(
                        e.currentTarget,
                        () => downloadFilesZip("ceh-pcpolimer-site.zip", siteFiles("projects/pcpolimer")),
                        "↓ Скачать сайт (ZIP)",
                      )
                    }
                    className="border-2 border-heat bg-heat px-5 py-2.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-coal transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_rgba(255,106,43,0.5)]"
                  >
                    ↓ Скачать сайт (ZIP)
                  </button>
                  <a
                    href="#validator"
                    onClick={() => window.dispatchEvent(new CustomEvent("ceh:fixture", { detail: "projects/pcpolimer" }))}
                    className="border-2 border-paper/35 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-paper transition-colors duration-200 hover:bg-paper hover:text-ink"
                  >
                    Прогон валидатора
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-green">проект вернул в архив (К-11)</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {YIELDS.map((y) => (
                      <li key={y.to} className="flex flex-wrap gap-x-2 font-mono text-[11px] text-paper/75">
                        <span className="text-green">+ {y.to}</span>
                        <span className="text-paper/45">— {y.what}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-4 border-t border-line-dark pt-4">
                  <Stamp rot={-6} color="var(--color-green)">
                    Принято · G4
                  </Stamp>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-paper/80">validate: 10/10 · exit 0</p>
                    <p className="mt-1 font-mono text-[10px] leading-relaxed text-paper/45">
                      V-01…V-14 зелёные · 3 рецепта (Q-01) · сходство с историей 0% (V-09)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </Reveal>

        {/* контрольные фикстуры */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Reveal delay={80}>
            <div className="group h-full border-2 border-paper/25 bg-ink-2/50 p-5 transition-colors duration-200 hover:border-green/70">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-green">контрольный · позитивный</span>
              </div>
              <p className="mt-2 font-display text-lg uppercase text-paper">projects/demo</p>
              <p className="mt-1.5 text-[12px] leading-snug text-paper/60">
                Эталонная сборка по воротам G1–G4. Обязана выходить зелёной: 10/10, exit 0.
              </p>
              <button
                onClick={(e) =>
                  download(
                    e.currentTarget,
                    () => downloadFilesZip("ceh-demo-site.zip", siteFiles("projects/demo")),
                    "↓ Скачать демо-сайт",
                  )
                }
                className="mt-4 border-2 border-green/60 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-green transition-colors duration-200 hover:bg-green hover:text-ink"
              >
                ↓ Скачать демо-сайт
              </button>
            </div>
          </Reveal>
          <Reveal delay={160}>
            <a href="#validator" className="group block h-full border-2 border-paper/25 bg-ink-2/50 p-5 transition-colors duration-200 hover:border-red/70">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-red">контрольный · негативный</span>
                <span className="font-mono text-[10px] text-paper/45 transition-colors group-hover:text-red">на стенд →</span>
              </div>
              <p className="mt-2 font-display text-lg uppercase text-paper">fixtures/slop-site</p>
              <p className="mt-1.5 text-[12px] leading-snug text-paper/60">
                Нарочито шаблонный сайт. Обязан падать с ≥5 нарушениями — система не пропускает слоп. Падает с 9.
              </p>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
