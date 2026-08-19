import { useEffect, useRef, useState } from "react";
import { COMPANY, PROCESS, REVIEWS, GALLERY } from "../../data/company";
import { MaskLines, Reveal, Stars, useCountUp, useInView } from "../../lib/fx";

/* ---------- технология: sticky-станции ---------- */

export function Process() {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { threshold: 0.55 },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const step = PROCESS[active];

  return (
    <section id="tehnologia" className="relative bg-concrete text-ink">
      <div className="bg-grid-light pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-heat-2">03 / технология</p>
        <MaskLines
          className="mt-3 max-w-2xl font-display text-[clamp(2rem,4.6vw,3.6rem)] font-black uppercase leading-[0.94]"
          lines={[<>Четыре станции —</>, <span key="t" className="text-heat-2">ни одной пропущенной</span>]}
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.85fr_1.35fr] lg:gap-16">
          {/* закреплённая панель станции */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative overflow-hidden border-2 border-ink bg-ink text-concrete shadow-[10px_10px_0_rgba(26,27,31,0.25)]">
              <div className="diag-steel pointer-events-none absolute inset-0" aria-hidden="true" />
              <div className="relative p-6 sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog">станция</p>
                <p className="mt-1 font-display text-[clamp(4rem,9vw,7.5rem)] font-black leading-[0.85] text-heat">
                  {step.n}
                </p>
                <p className="mt-3 font-display text-xl font-bold uppercase leading-tight sm:text-2xl">{step.title}</p>
                <div className="mt-6 border-t border-steel pt-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-fog-2">{step.paramLabel}</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-amber">{step.param}</p>
                </div>
                <div className="mt-5 flex gap-1.5">
                  {PROCESS.map((s, i) => (
                    <button
                      key={s.n}
                      onClick={() =>
                        refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })
                      }
                      aria-label={`Станция ${s.n}: ${s.title}`}
                      className={`h-1.5 flex-1 transition-colors duration-300 ${i <= active ? "bg-heat" : "bg-steel"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="hazard-amber h-1.5" aria-hidden="true" />
            </div>
          </div>

          {/* шаги */}
          <div className="space-y-8 lg:space-y-28 lg:py-10">
            {PROCESS.map((s, i) => (
              <div
                key={s.n}
                data-step={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
              >
                <Reveal delay={80}>
                  <article className={`grid overflow-hidden border-2 border-ink bg-card-l transition-shadow duration-300 md:grid-cols-2 ${i % 2 === 1 ? "md:[direction:rtl]" : ""} ${active === i ? "shadow-[8px_8px_0_rgba(26,27,31,0.85)]" : ""}`}>
                    <div className="relative overflow-hidden border-b-2 border-ink md:border-b-0 md:[direction:ltr]">
                      <img src={s.img} alt={s.imgAlt} loading="lazy" className="h-56 w-full object-cover transition-transform duration-700 md:h-full" style={{ transform: active === i ? "scale(1.04)" : "scale(1)" }} />
                      <span className="absolute left-3 top-3 border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest" style={{ background: s.ral, color: "#f1f1ea", borderColor: "rgba(241,241,234,0.5)" }}>
                        {s.ral}
                      </span>
                    </div>
                    <div className="p-6 md:[direction:ltr]">
                      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-heat-2">станция {s.n} · {s.paramLabel}: {s.param}</p>
                      <h3 className="mt-2 font-display text-2xl font-black uppercase leading-none">{s.title}</h3>
                      <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">{s.text}</p>
                    </div>
                  </article>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- ОТК: рейтинг и отзывы ---------- */

export function Trust() {
  const [cntRef, cntIn] = useInView<HTMLDivElement>(0.3);
  const ratings = useCountUp(COMPANY.ratingsCount, cntIn);
  const reviews = useCountUp(COMPANY.reviewsCount, cntIn);
  const photos = useCountUp(COMPANY.photosCount, cntIn);

  return (
    <section id="otk" className="relative bg-coal text-concrete">
      <div className="bg-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-heat">04 / отдел технического контроля</p>
            <MaskLines
              className="mt-3 font-display text-[clamp(2rem,4.6vw,3.4rem)] font-black uppercase leading-[0.94]"
              lines={[<>Брак не</>, <span key="o" className="text-heat">покидает цех</span>]}
            />
          </div>
          <Reveal delay={150}>
            <p className="max-w-sm text-[14px] leading-relaxed text-fog">
              Каждая деталь проходит приёмку по чек-листу: толщина слоя, адгезия, внешний вид.
              Не прошло — переделываем за свой счёт.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          {/* рейтинг */}
          <div>
            <div ref={cntRef} className="border-2 border-steel bg-coal-2 p-6">
              <div className="flex items-end gap-4">
                <p className="font-display text-[clamp(3.6rem,8vw,5.5rem)] font-black leading-[0.85] text-concrete">
                  {COMPANY.rating}
                </p>
                <div className="pb-2">
                  <Stars value={COMPANY.rating} size={18} className="text-amber" />
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fog">рейтинг на Яндекс Картах</p>
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-3 gap-px border border-steel bg-steel">
                {[
                  [ratings, "оценок"],
                  [reviews, "отзывов"],
                  [photos, "фото работ"],
                ].map(([v, l]) => (
                  <div key={l as string} className="min-w-0 bg-coal px-2 py-3.5 text-center sm:px-3">
                    <dd className="font-display text-3xl font-black leading-none text-heat">{v}+</dd>
                    <dt className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-fog">{l}</dt>
                  </div>
                ))}
              </dl>
              <a
                href={COMPANY.yandexMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 block border-2 border-steel-2 px-4 py-3 text-center font-display text-sm font-bold uppercase tracking-[0.12em] text-concrete transition-all duration-200 hover:-translate-y-0.5 hover:border-concrete hover:bg-concrete hover:text-coal"
              >
                Отзывы на Яндекс Картах ↗
              </a>
            </div>

          </div>

          {/* отзывы */}
          <div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="font-display text-xl font-black uppercase leading-none sm:text-2xl">Что пишут заказчики</h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog-2">бирки приёмки</span>
            </div>
            <div className="space-y-5">
              {REVIEWS.map((r, i) => (
                <Reveal key={r.id} delay={i * 110}>
                  <figure
                    className="relative border-2 border-steel bg-coal-2 p-5 pl-6 transition-transform duration-300 hover:rotate-0 hover:border-steel-2"
                    style={{ transform: `rotate(${r.rot})` }}
                  >
                    <span className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-steel-2 bg-coal" aria-hidden="true" />
                    <figcaption className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-fog-2">
                      <span className="text-heat">{r.id}</span>
                      <span>{r.meta}</span>
                    </figcaption>
                    <blockquote className="mt-3 text-[14px] leading-relaxed text-concrete/90">«{r.text}»</blockquote>
                    <p className="mt-3 font-display text-sm font-bold uppercase tracking-wide text-amber">— {r.author}</p>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ---------- Галерея: свежие работы с линии ---------- */

export function Gallery() {
  return (
    <section id="raboty" className="relative bg-concrete text-ink">
      <div className="bg-grid-light pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-heat-2">05 / галерея работ</p>
            <MaskLines
              className="mt-3 font-display text-[clamp(2rem,4.6vw,3.4rem)] font-black uppercase leading-[0.94]"
              lines={[<>Свежие работы</>, <span key="g" className="text-heat-2">с линии</span>]}
            />
          </div>
          <Reveal delay={150}>
            <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              съёмка ОТК · смена 2 · без ретуши
            </p>
          </Reveal>
        </div>

        <div className="mt-10 gap-3 space-y-3 sm:columns-2 sm:gap-4 sm:space-y-4 lg:columns-3">
          {GALLERY.map((g, i) => (
            <Reveal key={g.caption + i} delay={(i % 3) * 90}>
              <figure className="group relative break-inside-avoid overflow-hidden border-2 border-ink bg-card-l transition-shadow duration-300 hover:shadow-[8px_8px_0_rgba(26,27,31,0.85)]">
                <div className={`overflow-hidden ${g.tall ? "aspect-[3/4]" : "aspect-[4/3]"}`}>
                  <img
                    src={g.img}
                    alt={g.caption}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
                  />
                </div>
                <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-coal via-coal/70 to-transparent px-3 pb-2.5 pt-8 opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-concrete">{g.caption}</span>
                  <span className="shrink-0 bg-heat px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-coal">{g.ral}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-card-l px-4 py-3">
          <a
            href={COMPANY.yandexGalleryUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft underline decoration-heat decoration-2 underline-offset-4 transition-colors hover:text-heat-2"
          >
            ещё {COMPANY.photosCount}+ фото — в профиле на Яндекс Картах
          </a>
          <a
            href={COMPANY.yandexGalleryUrl}
            target="_blank"
            rel="noreferrer"
            className="font-display text-xs font-bold uppercase tracking-[0.12em] text-heat-2 transition-colors hover:text-ink"
          >
            Смотреть все ↗
          </a>
        </div>
      </div>
      <div className="hazard h-1.5" aria-hidden="true" />
    </section>
  );
}
