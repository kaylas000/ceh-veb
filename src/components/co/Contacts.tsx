import { CEH_DOSSIER, COMPANY } from "../../data/company";
import { MaskLines, Reveal } from "../../lib/fx";

/* ---------- стилизованная мини-карта ---------- */

function MiniMap() {
  return (
    <div className="relative overflow-hidden border-2 border-ink bg-card-l">
      <svg viewBox="0 0 640 420" className="block w-full" role="img" aria-label="Схема проезда: Московская область, Красногорск, Речная улица, 8">
        <rect width="640" height="420" fill="#e7e7e2" />
        {/* река */}
        <path d="M -20 300 C 140 250, 220 340, 380 300 S 620 240, 700 280 L 700 460 L -20 460 Z" fill="#c8d4d8" />
        <path d="M -20 300 C 140 250, 220 340, 380 300 S 620 240, 700 280" fill="none" stroke="#9fb4bb" strokeWidth="3" />
        {/* улицы */}
        {[60, 150, 250].map((y) => (
          <line key={y} x1="0" y1={y} x2="640" y2={y - 26} stroke="#c6c6bc" strokeWidth="14" />
        ))}
        {[120, 300, 470].map((x) => (
          <line key={x} x1={x} y1="0" x2={x + 40} y2="420" stroke="#c6c6bc" strokeWidth="12" />
        ))}
        <line x1="0" y1="196" x2="640" y2="170" stroke="#b5b5aa" strokeWidth="20" />
        {/* Речная улица */}
        <line x1="40" y1="150" x2="600" y2="128" stroke="#dcdcd4" strokeWidth="22" />
        <text x="70" y="140" fontFamily="JetBrains Mono, monospace" fontSize="13" fill="#555963" transform="rotate(-2 70 140)">
          РЕЧНАЯ УЛИЦА
        </text>
        {/* маркер */}
        <g className="hook-swing" style={{ transformOrigin: "330px 150px", animationDuration: "4s" }}>
          <path d="M 330 186 L 312 150 A 22 22 0 1 1 348 150 Z" fill="#ff6a2b" stroke="#1a1b1f" strokeWidth="3" />
          <circle cx="330" cy="148" r="8" fill="#1a1b1f" />
        </g>
        <rect x="362" y="120" width="196" height="44" fill="#1a1b1f" />
        <text x="378" y="140" fontFamily="JetBrains Mono, monospace" fontSize="13" fontWeight="700" fill="#f1f1ea">
          РЕЧНАЯ, 8
        </text>
        <text x="378" y="156" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#9aa1ad">
          ПОРОШКОВАЯ ПОКРАСКА
        </text>
        {/* компас */}
        <g transform="translate(596, 46)">
          <circle r="18" fill="none" stroke="#1a1b1f" strokeWidth="2" />
          <path d="M 0 -12 L 5 6 L 0 2 L -5 6 Z" fill="#ff6a2b" />
          <text y="32" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#555963">С</text>
        </g>
      </svg>
      <a
        href={COMPANY.yandexMapsUrl}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-3 right-3 border-2 border-ink bg-concrete px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-heat hover:text-concrete"
      >
        Яндекс Карты ↗
      </a>
    </div>
  );
}

/* ---------- контакты ---------- */

export function Contacts() {
  return (
    <section id="kontakty" className="relative bg-concrete text-ink">
      <div className="bg-grid-light pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-heat-2">06 / контакты</p>
        <MaskLines
          className="mt-3 font-display text-[clamp(2rem,4.6vw,3.6rem)] font-black uppercase leading-[0.94]"
          lines={[<>Привозите деталь —</>, <span key="k" className="text-heat-2">заберёте окрашенной</span>]}
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:gap-12">
          <div className="flex flex-col gap-5">
            <Reveal>
              <div className="border-2 border-ink bg-ink p-6 text-concrete shadow-[8px_8px_0_rgba(26,27,31,0.25)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog">диспетчер цеха · ежедневно до 21:00</p>
                <div className="mt-3 flex flex-col gap-2.5">
                  {[
                    { n: COMPANY.phone, h: COMPANY.phoneHref, tag: "основной" },
                    { n: COMPANY.phone2, h: COMPANY.phone2Href, tag: "второй" },
                  ].map((p) => (
                    <a
                      key={p.n}
                      href={p.h}
                      className="group flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border border-steel bg-coal-2 px-4 py-3 transition-colors duration-200 hover:border-heat hover:bg-heat/10"
                    >
                      <span className="font-display text-[clamp(1.25rem,2.6vw,1.9rem)] font-black leading-none tracking-tight text-concrete transition-colors group-hover:text-heat">
                        {p.n}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog-2 group-hover:text-heat">{p.tag} ↗</span>
                    </a>
                  ))}
                </div>
                <p className="mt-3 font-mono text-[11px] text-fog">смета по фото детали — за час в рабочее время</p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="grid gap-px border-2 border-ink bg-ink sm:grid-cols-2">
                {[
                  ["адрес", COMPANY.addressShort, "Красногорск · Московская область"],
                  ["режим", "ежедневно", "до 21:00"],
                ].map(([l, v, d]) => (
                  <div key={l} className="bg-card-l p-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-soft">{l}</p>
                    <p className="mt-1.5 font-display text-lg font-bold uppercase leading-tight">{v}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-soft">{d}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={180}>
              <p className="border-l-4 border-heat bg-card-l p-4 text-[13px] leading-relaxed text-ink-soft">
                Полный адрес: {COMPANY.address}. Работаем ежедневно до 21:00 — привозите деталь, заберёте окрашенной.
              </p>
            </Reveal>
          </div>

          <Reveal delay={140}>
            <MiniMap />
            <p className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              <span>схема проезда · не масштаб</span>
              <span>{COMPANY.addressShort}</span>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- паспорт сборки ЦЕХ + подвал ---------- */

export function CehDossier() {
  return (
    <section className="relative bg-coal text-concrete">
      <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-20 sm:px-6">
        <div className="border-2 border-steel bg-coal-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-steel px-5 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-fog">
              Паспорт сборки · сайт собран в цехе <span className="text-heat">ЦЕХ v1.0</span>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog-2">проект pcpolimer · бросок SEED № 51</p>
          </div>
          <div className="grid gap-px bg-steel md:grid-cols-4">
            <div className="bg-coal-2 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-heat">SEED · оси</p>
              <p className="mt-2 text-[13px] leading-relaxed text-concrete/85">{CEH_DOSSIER.seed}</p>
            </div>
            <div className="bg-coal-2 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-heat">G1 · направление</p>
              <ul className="mt-2 space-y-1.5">
                {CEH_DOSSIER.direction.map((d) => (
                  <li key={d} className="flex gap-2 text-[12px] leading-snug text-concrete/80">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 bg-heat" /> {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-coal-2 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-heat">источники решений</p>
              <ul className="mt-2 space-y-1.5 font-mono text-[11px]">
                {CEH_DOSSIER.sources.map(([what, src]) => (
                  <li key={src} className="text-concrete/80">
                    <span className="text-fog-2">→</span> {what}
                    <span className="block pl-3 text-[10px] text-heat-2">{src}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative bg-coal-2 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-heat">ворота G1–G4</p>
              <ul className="mt-2 space-y-1.5">
                {CEH_DOSSIER.gates.map((g) => (
                  <li key={g.code} className="flex items-center gap-2 font-mono text-[11px] text-concrete/80">
                    <span className="text-ok">■</span> {g.code} {g.state}
                    <span className="text-[10px] text-fog-2">· {g.note}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-steel pt-3 font-mono text-[10px] leading-relaxed text-fog-2">
                validate.mjs: V-01…V-10 <span className="text-ok">OK</span> · lint-slop чист · <span className="text-ok">exit 0</span>
              </p>
              <div className="pointer-events-none absolute -right-2 -top-4 text-ok">
                <span className="rubber-stamp inline-block text-sm" style={{ ["--stamp-rot" as string]: "8deg" }}>
                  Принято
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Foot() {
  return (
    <footer className="relative border-t-2 border-steel bg-coal text-concrete">
      <div className="hazard h-2" aria-hidden="true" />
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center bg-heat font-display text-[11px] font-bold text-coal">PC</span>
            <span className="font-display text-sm tracking-[0.22em]">POLIMER · ПОРОШКОВАЯ ПОКРАСКА</span>
          </div>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-fog">
            Цех полимерных покрытий в Красногорске: пескоструй, электростатическое напыление,
            камера до 200 °C и контроль ОТК на каждой партии.
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-2">цех</p>
          <ul className="mt-3 space-y-2 text-[13px]">
            <li>{COMPANY.address}</li>
            <li>{COMPANY.hours}</li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-2">связь</p>
          <a href={COMPANY.phoneHref} className="mt-3 block font-display text-lg font-bold text-concrete transition-colors hover:text-heat">
            {COMPANY.phone}
          </a>
          <a href={COMPANY.phone2Href} className="mt-1 block font-display text-base text-fog transition-colors hover:text-heat">
            {COMPANY.phone2}
          </a>
          <a href={COMPANY.yandexMapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-mono text-[11px] uppercase tracking-wider text-fog underline decoration-heat underline-offset-4 transition-colors hover:text-concrete">
            профиль на Яндекс Картах ↗
          </a>
        </div>
      </div>
      <div className="border-t border-steel">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-fog-2 sm:px-6">
          <span>© 2026 Pcpolimer · Красногорск</span>
          <span>рейтинг {COMPANY.rating} ★ · {COMPANY.ratingsCount} оценок · собрано по воротам ЦЕХа</span>
        </div>
      </div>
    </footer>
  );
}
