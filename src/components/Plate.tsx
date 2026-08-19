import { Reveal, ScrambleText, Stamp, TickCounter } from "../lib/motion";
import { COLLAGE_URL } from "../data/fixtures";

const PASSPORT: Array<[string, string]> = [
  ["Название", "ЦЕХ (CEH)"],
  ["Тип", "структурный проект-архив + регламент принуждения агента"],
  ["Назначение", "агент собирает сайты как дизайнер студии: материалы — только из архива, приёмка — через контрольные ворота"],
  ["Цель качества", "исключить однообразный AI-слоп: самоповтор, дефолтные паттерны, «центрированный hero + три карточки»"],
  ["Не является", "компонентной библиотекой · генератором сайтов · CMS"],
];

export function Plate() {
  return (
    <section id="pasport" className="relative overflow-hidden bg-paper">
      <div className="bg-blueprint pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* служебная строка */}
      <div className="relative border-b-2 border-ink">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted sm:px-6">
          <span>УТВЕРЖДАЮ: куратор-человек</span>
          <span className="hidden sm:inline">ТЗ v1.0 · лист 1 / 1</span>
          <span>хранить вечно · не копировать слепо</span>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-[1400px] gap-8 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:gap-12 lg:pt-14">
        {/* левая колонна: имя */}
        <div className="flex flex-col justify-between gap-10">
          <div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-red">
              <span className="inline-block h-2 w-2 bg-red" />
              структурный архив студии
              <span className="hidden h-px flex-1 bg-ink/30 sm:block" />
            </div>
            <h1 className="mt-4 font-display leading-[0.86] text-ink">
              <ScrambleText
                text="ЦЕХ"
                className="block text-[clamp(6rem,22vw,19rem)] tracking-tight"
              />
              <span className="mt-2 block max-w-xl text-[clamp(1.05rem,2.4vw,1.7rem)] leading-snug">
                АРХИВ, КОТОРЫЙ{" "}
                <span className="bg-ink px-2 text-paper">ПРИНУЖДАЕТ</span>{" "}
                ДЕЛАТЬ НЕШАБЛОННО
              </span>
            </h1>
          </div>

          <Reveal delay={120}>
            <dl className="relative border-2 border-ink bg-card">
              <div className="absolute -top-3 left-5 bg-red px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-paper">
                паспорт изделия
              </div>
              {PASSPORT.map(([k, v], i) => (
                <div
                  key={k}
                  className={`grid grid-cols-[110px_1fr] gap-3 px-4 py-3 sm:grid-cols-[150px_1fr] ${
                    i > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <dt className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-muted">
                    {k}
                  </dt>
                  <dd className="text-[13px] font-medium leading-snug text-ink sm:text-sm">{v}</dd>
                </div>
              ))}
              <div className="hazard-thin h-2" aria-hidden="true" />
            </dl>
          </Reveal>
        </div>

        {/* правая колонна: коллаж + счётчики */}
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden border-2 border-ink shadow-[8px_8px_0_var(--color-ink)]">
            <div className="relative aspect-[16/10] overflow-hidden bg-paper-2">
              <img
                src={COLLAGE_URL}
                alt="Конструктивистский коллаж: шестерни, диагональные балки, красные клинья на чертёжной бумаге"
                className="kenburns-img absolute inset-0 h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 border-[6px] border-paper/40 mix-blend-overlay" />
            </div>
            <div className="absolute left-3 top-3">
              <Stamp rot={-10}>Архив</Stamp>
            </div>
            <div className="absolute bottom-3 right-3">
              <Stamp rot={7} color="var(--color-green)">
                Регламент
              </Stamp>
            </div>
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-ink/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/80">
              <span>лист А-1 · коллаж цеховой</span>
              <span>рецепт M-02: кен-бёрнс</span>
            </div>
          </div>

          <div className="grid grid-cols-3 border-2 border-ink bg-ink text-paper">
            {[
              { v: 30, s: "", l: "референсов в архиве", sub: "MVP: 6 · сид залит" },
              { v: 16, s: "", l: "запретов BANNED", sub: "у каждого — метод" },
              { v: 10, s: "", l: "проверок V-кода", sub: "exit 0 / 1" },
            ].map((c, i) => (
              <div key={c.l} className={`px-3 py-4 sm:px-4 ${i > 0 ? "border-l border-line-dark" : ""}`}>
                <TickCounter
                  value={c.v}
                  suffix={c.s}
                  className="font-display text-3xl leading-none text-paper sm:text-4xl"
                />
                <p className="mt-2 font-mono text-[9px] uppercase leading-snug tracking-[0.14em] text-muted-2">
                  {c.l}
                </p>
                <p className="mt-1 hidden font-mono text-[9px] text-red sm:block">{c.sub}</p>
              </div>
            ))}
          </div>

          <Reveal delay={80}>
            <p className="border-l-4 border-red pl-4 text-sm leading-relaxed text-ink/80">
              Принуждение держится на трёх опорах: обязательные артефакты, которые невозможно
              заполнить без чтения архива; контрольные ворота{" "}
              <span className="font-semibold">G1–G4</span>; и скрипт{" "}
              <span className="font-mono text-[13px]">validate.mjs</span>, блокирующий приёмку.
            </p>
          </Reveal>
        </div>
      </div>

      {/* нижняя техническая линейка */}
      <div className="relative border-t-2 border-ink">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-1 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted sm:px-6">
          <span>масштаб 1:1</span>
          <span className="tick-ruler inline-block h-2 w-24 text-ink/50" />
          <span>допуск ±0 шаблонов</span>
          <span className="tick-ruler inline-block h-2 w-24 text-ink/50" />
          <span>шероховатость Ra 3.2</span>
          <span className="hidden tick-ruler h-2 w-24 text-ink/50 md:inline-block" />
          <span className="hidden md:inline">контроль: арtdиректор + скрипт</span>
        </div>
      </div>
    </section>
  );
}
