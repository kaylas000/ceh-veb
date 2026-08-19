import { useRef, useState } from "react";
import { MaskTitle, Reveal, Stamp } from "../lib/motion";
import { downloadBuildZip } from "../lib/zip";

/* CSS-мокап первого экрана боевого проекта */
function SiteMock() {
  return (
    <div className="overflow-hidden border-2 border-paper/25 bg-[#101114]">
      <div className="flex items-center gap-1.5 border-b border-line-dark px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red/80" />
        <span className="h-2 w-2 rounded-full bg-yellow/80" />
        <span className="h-2 w-2 rounded-full bg-green/80" />
        <span className="ml-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-2">#/pcpolimer · живой сайт</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="bg-heat px-1.5 py-0.5 font-display text-[8px] font-bold text-coal">PC</span>
            <span className="font-display text-[9px] tracking-[0.2em] text-paper/70">POLIMER</span>
          </div>
          <p className="mt-3 font-display text-lg font-black uppercase leading-[0.95] text-paper">
            Порошковая
            <br />
            <span className="text-heat">покраска</span>
            <br />
            металла
          </p>
          <div className="mt-3 inline-block bg-heat px-2.5 py-1 font-display text-[8px] font-bold uppercase text-coal">
            Рассчитать стоимость
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {["200 °C", "60–120", "1000+", "100 ₽"].map((v) => (
              <span key={v} className="border border-line-dark bg-coal-2 px-1 py-1 text-center font-mono text-[7px] text-paper/60">
                {v}
              </span>
            ))}
          </div>
        </div>
        <div className="border border-steel bg-coal-2 p-2.5">
          <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-muted-2">печь полимеризации</p>
          <p className="mt-1 font-display text-xl font-black leading-none text-paper">
            200<span className="text-[10px] text-muted-2">°C</span>
          </p>
          <div className="mt-2 h-1 w-full bg-line-dark">
            <div className="heat-breathe h-full w-4/5 bg-heat" />
          </div>
          <div className="mt-2 flex items-center gap-1">
            <span className="led-dot h-1.5 w-1.5 rounded-full bg-green" />
            <span className="font-mono text-[7px] uppercase text-paper/50">полимеризация</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t border-line-dark bg-coal-2 px-3 py-1.5">
        {["#ff6a2b", "#c1121c", "#2271b3", "#f7c500", "#383e42", "#006f3d", "#0a0a0a"].map((c) => (
          <span key={c} className="h-2 w-2 border border-steel-2" style={{ background: c }} />
        ))}
        <span className="ml-auto font-mono text-[7px] uppercase tracking-wider text-muted-2">RAL-лента · 20 выкрасов</span>
      </div>
    </div>
  );
}

const AXES = [
  { k: "Композиция", v: "наряд-паспорт с левой плитой" },
  { k: "Движение", v: "sticky-станции + конвейер-лента" },
  { k: "Типографика", v: "Tektur-капс + моно-метки" },
];

const YIELDS = [
  { to: "references/REF-07", what: "6 техник + takeaway + палитра сайта" },
  { to: "skills/SK-05", what: "новый скил «производственный паспорт»" },
  { to: "projects/pcpolimer/", what: "SEED · DIRECTION · SOURCES · REVIEW" },
];

export function ProjectsHall() {
  const [dlOpen, setDlOpen] = useState(false);
  const [zipState, setZipState] = useState<"idle" | "busy" | "done">("idle");
  const zipTimer = useRef<number | null>(null);

  const handleZip = async () => {
    if (zipState === "busy") return;
    setZipState("busy");
    try {
      await downloadBuildZip("ceh-pcpolimer-site.zip");
      setZipState("done");
    } catch (e) {
      console.error(e);
      setZipState("idle");
    }
    if (zipTimer.current) window.clearTimeout(zipTimer.current);
    zipTimer.current = window.setTimeout(() => setZipState("idle"), 6000);
  };

  return (
    <section id="proekty" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red">08 / боевые проекты</p>
            <MaskTitle
              className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.95]"
              lines={[<>Библиотека</>, <span key="b" className="text-paper/55">наполняется боем</span>]}
            />
          </div>
          <Reveal delay={140}>
            <p className="max-w-sm text-sm leading-relaxed text-paper/70">
              Каждый принятый сайт уходит в архив: скриншоты и takeaway — в{" "}
              <span className="font-mono text-[13px]">references/</span>, новые приёмы — в{" "}
              <span className="font-mono text-[13px]">skills/</span>. Так ЦЕХ перестаёт быть теорией.
            </p>
          </Reveal>
        </div>

        {/* карточка первого боевого проекта */}
        <Reveal>
          <article className="mt-12 border-2 border-paper/25 bg-ink-2/70">
            <div className="grid lg:grid-cols-[1.25fr_1fr]">
              <div className="border-b-2 border-paper/25 p-5 sm:p-6 lg:border-b-0 lg:border-r-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="bg-red px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-paper">PRJ-01</span>
                  <h3 className="font-display text-xl uppercase tracking-wide text-paper sm:text-2xl">
                    Порошковая покраска · Pcpolimer
                  </h3>
                  <span className="border border-green px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-green">
                    принят G4
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-paper/70">
                  Промышленный цех в Красногорске: открытие — наряд-заказ и живая печь вместо hero, фирменный акцент —
                  рабочая палитра RAL, прайс как наряд-строки с калькулятором.
                </p>
                <div className="mt-5">
                  <SiteMock />
                </div>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button
                    onClick={handleZip}
                    disabled={zipState === "busy"}
                    className={`border-2 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-[0.12em] transition-all duration-200 ${
                      zipState === "done"
                        ? "border-green bg-green text-coal"
                        : "border-yellow bg-yellow text-ink hover:-translate-y-0.5 hover:shadow-[5px_5px_0_rgba(224,169,28,0.5)]"
                    } ${zipState === "busy" ? "cursor-wait opacity-70" : ""}`}
                    title="Скачать готовый сайт: файл ceh-pcpolimer-site.zip"
                  >
                    ↓ {zipState === "busy" ? "Упаковываю…" : zipState === "done" ? "✓ ZIP отдан" : "Скачать архив (ZIP)"}
                  </button>
                  <a
                    href="#/pcpolimer"
                    className="border-2 border-paper/35 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-paper transition-colors duration-200 hover:bg-paper hover:text-ink"
                  >
                    Открыть живой сайт →
                  </a>
                  <a
                    href="#validator"
                    className="border-2 border-paper/35 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-paper transition-colors duration-200 hover:bg-paper hover:text-ink"
                  >
                    Прогон валидатора
                  </a>
                  <button
                    onClick={() => setDlOpen((v) => !v)}
                    aria-expanded={dlOpen}
                    className="border-2 border-paper/35 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-paper transition-colors duration-200 hover:bg-paper hover:text-ink"
                  >
                    {dlOpen ? "Свернуть" : "Как собрать"}
                  </button>
                </div>
                {zipState === "done" && (
                  <p className="mt-3 border border-green/40 bg-green/10 px-4 py-2.5 font-mono text-[11px] leading-relaxed text-green">
                    ✓ файл ceh-pcpolimer-site.zip у вас: внутри index.html + папка assets/. Распакуйте и залейте на
                    GitHub Pages / Netlify / Vercel — сайт заработает сразу.
                  </p>
                )}
                {dlOpen && (
                  <div className="mt-4 border border-line-dark bg-[#14120c] p-4 font-mono text-[11px] leading-relaxed text-paper/75">
                    <p className="text-yellow"># готовый сайт — чистая статика в папке dist/ (теперь она попадает и в репозиторий)</p>
                    <p className="mt-1.5">npm install</p>
                    <p>npm run build <span className="text-muted-2"># → dist/index.html + dist/assets/</span></p>
                    <p className="mt-1.5 text-muted-2">
                      # GitHub Pages: назовите репозиторий <span className="text-paper/70">&lt;ник&gt;.github.io</span> и
                      залейте содержимое dist/ в корень — или бросьте dist/ в Netlify/Vercel одним перетаскиванием.
                    </p>
                  </div>
                )}
              </div>

              {/* паспорт проекта */}
              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">раздача SEED · бросок №51</p>
                  <dl className="mt-2.5 space-y-2">
                    {AXES.map((a) => (
                      <div key={a.k} className="flex flex-wrap items-baseline gap-x-3 border-b border-line-dark pb-2">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2">{a.k}</dt>
                        <dd className="font-display text-sm uppercase text-paper">{a.v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow">проект вернул в архив</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {YIELDS.map((y) => (
                      <li key={y.to} className="flex flex-wrap gap-x-2 font-mono text-[11px] text-paper/75">
                        <span className="text-green">+ {y.to}</span>
                        <span className="text-muted-2">— {y.what}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto flex items-center gap-5 border-t border-line-dark pt-4">
                  <Stamp rot={-6} color="var(--color-green)">
                    Принято · G4
                  </Stamp>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-paper/80">validate: 10/10 · exit 0</p>
                    <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-2">
                      V-01…V-10 зелёные · 3 рецепта (Q-01) · сходство с историей 0% (V-09)
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
            <a href="#validator" className="group block border-2 border-paper/25 bg-ink-2/50 p-5 transition-colors duration-200 hover:border-green/70">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-green">контрольный · позитивный</span>
                <span className="font-mono text-[10px] text-muted-2 transition-colors group-hover:text-green">на стенд →</span>
              </div>
              <p className="mt-2 font-display text-lg uppercase text-paper">projects/demo</p>
              <p className="mt-1.5 text-[12px] leading-snug text-paper/60">
                Эталонная сборка по воротам G1–G4. Обязана выходить зелёной: 10/10, exit 0.
              </p>
            </a>
          </Reveal>
          <Reveal delay={160}>
            <a href="#validator" className="group block border-2 border-paper/25 bg-ink-2/50 p-5 transition-colors duration-200 hover:border-red/70">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-red">контрольный · негативный</span>
                <span className="font-mono text-[10px] text-muted-2 transition-colors group-hover:text-red">на стенд →</span>
              </div>
              <p className="mt-2 font-display text-lg uppercase text-paper">fixtures/slop-site</p>
              <p className="mt-1.5 text-[12px] leading-snug text-paper/60">
                Нарочито шаблонный сайт. Обязан падать с ≥5 нарушениями — система не пропускает слоп.
              </p>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
