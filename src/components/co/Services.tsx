import { useMemo, useState } from "react";
import { COMPANY, SERVICES, type RalColor, type Service } from "../../data/company";
import { MaskLines, Reveal, useCountUp, useInView } from "../../lib/fx";

const UNIT_LABEL: Record<Service["unit"], string> = {
  pc: "шт",
  m: "пог. м",
  m2: "м²",
};

const PRESETS: Record<Service["unit"], number[]> = {
  m: [10, 25, 50],
  m2: [12, 24, 46],
  pc: [1, 2, 4],
};

function hasBulkDiscount(svc: Service, q: number): boolean {
  if (svc.unit === "m2") return q > 20;
  if (svc.unit === "m") return q > 50;
  if (svc.unit === "pc") return q > 5;
  return false;
}

function Calculator({ selected }: { selected: RalColor }) {
  const [svcId, setSvcId] = useState("profile");
  const [qty, setQty] = useState(25);
  const [metallic, setMetallic] = useState(false);
  const svc = SERVICES.find((s) => s.id === svcId)!;
  const unitLabel = UNIT_LABEL[svc.unit];

  const total = useMemo(() => {
    const q = Math.max(1, qty);
    let v = svc.base * q;
    if (metallic) v *= 1.15;
    if (hasBulkDiscount(svc, q)) v *= svc.unit === "pc" ? 0.95 : 0.9;
    return Math.round(v / 10) * 10;
  }, [svc, qty, metallic]);

  const [resRef, resIn] = useInView<HTMLDivElement>(0.3);
  const shown = useCountUp(total, resIn, 900);

  return (
    <div ref={resRef} className="border-2 border-steel-2 bg-coal-2 shadow-[10px_10px_0_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b-2 border-steel px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fog">Калькулятор · наряд</span>
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber">
          <span className="led-dot h-2 w-2 rounded-full bg-amber" /> расчёт
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog-2">
            позиция прайса · <span className="text-heat">{svc.price}</span>
          </p>
          <div className="term-scroll mt-2 grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSvcId(s.id)}
                className={`min-w-0 break-words border px-2.5 py-2 text-left font-mono text-[11px] leading-tight transition-colors duration-200 ${
                  svcId === s.id
                    ? "border-heat bg-heat/15 text-concrete"
                    : "border-steel text-fog hover:border-steel-2 hover:text-concrete"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog-2">объём, {unitLabel}</p>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="mt-2 w-full border-2 border-steel bg-coal px-3 py-2.5 font-mono text-lg font-bold text-concrete outline-none transition-colors focus:border-heat"
              aria-label={`Объём в ${unitLabel}`}
            />
          </div>
          <div className="flex gap-1.5 pb-1">
            {PRESETS[svc.unit].map((q) => (
              <button
                key={q}
                onClick={() => setQty(q)}
                className={`border px-2 py-1 font-mono text-[10px] transition-colors ${
                  qty === q ? "border-heat text-heat" : "border-steel text-fog hover:border-heat hover:text-heat"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog-2">покрытие</p>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => setMetallic(false)}
              className={`flex-1 border px-2 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors duration-200 ${
                !metallic ? "border-heat bg-heat/15 text-concrete" : "border-steel text-fog hover:text-concrete"
              }`}
            >
              стандарт RAL
            </button>
            <button
              onClick={() => setMetallic(true)}
              className={`flex-1 border px-2 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors duration-200 ${
                metallic ? "border-heat bg-heat/15 text-concrete" : "border-steel text-fog hover:text-concrete"
              }`}
            >
              металлик +15%
            </button>
          </div>
          <p className="mt-2 flex items-center gap-2 font-mono text-[10px] text-fog-2">
            <span className="h-3 w-3 border border-steel-2" style={{ background: selected.hex }} />
            цвет: {selected.code} — {metallic ? "металлик" : "стандарт"}
          </p>
        </div>

        <div className="border-t-2 border-steel pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog-2">ориентировочно</p>
          <p className="mt-1 font-display text-4xl font-black leading-none text-heat">
            {shown.toLocaleString("ru-RU")} ₽
          </p>
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-fog-2">
            {svc.base} ₽ × {Math.max(1, qty)} {unitLabel}
            {metallic ? " × 1.15 (металлик)" : ""}
            {hasBulkDiscount(svc, Math.max(1, qty)) ? ` × ${svc.unit === "pc" ? "0.95" : "0.9"} (партия)` : ""}
          </p>
          <a
            href={COMPANY.phoneHref}
            className="mt-4 block border-2 border-heat bg-heat px-4 py-3 text-center font-display text-sm font-bold uppercase tracking-[0.08em] text-coal transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(255,106,43,0.4)]"
          >
            Уточнить · {COMPANY.phone}
          </a>
          <p className="mt-2.5 text-center font-mono text-[10px] text-fog-2">
            второй номер:{" "}
            <a href={COMPANY.phone2Href} className="text-fog underline decoration-steel-2 underline-offset-2 transition-colors hover:text-heat">
              {COMPANY.phone2}
            </a>
          </p>
          <p className="mt-1.5 text-center font-mono text-[10px] text-fog-2">
            итог зависит от сложности изделия и объёма партии
          </p>
        </div>
      </div>
    </div>
  );
}

export function Services({ selected }: { selected: RalColor }) {
  return (
    <section id="prays" className="relative bg-coal text-concrete">
      <div className="bg-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-heat">02 / прайс-лист</p>
            <MaskLines
              className="mt-3 font-display text-[clamp(2rem,4.6vw,3.6rem)] font-black uppercase leading-[0.94]"
              lines={[<>Цены — как</>, <span key="p" className="text-fog">наряд-заказ</span>]}
            />
          </div>
          <Reveal delay={150}>
            <p className="max-w-sm text-[14px] leading-relaxed text-fog">
              Двенадцать позиций без мелкого шрифта. Покрытие стойко к коррозии, влаге, реагентам и
              не выцветает. Точную смету считаем по чертежу или фото — по телефонам{" "}
              <a href={COMPANY.phoneHref} className="text-concrete underline decoration-heat underline-offset-4">
                {COMPANY.phone}
              </a>{" "}
              и{" "}
              <a href={COMPANY.phone2Href} className="text-concrete underline decoration-heat underline-offset-4">
                {COMPANY.phone2}
              </a>.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          {/* реестр позиций */}
          <div className="border-2 border-steel">
            {SERVICES.map((s, i) => (
              <Reveal key={s.id} delay={Math.min(i * 40, 280)}>
                <div
                  className={`group grid gap-3 px-5 py-4 transition-colors duration-200 hover:bg-coal-3 sm:grid-cols-[52px_1fr_auto] sm:items-center sm:gap-5 ${
                    i > 0 ? "border-t-2 border-steel" : ""
                  }`}
                >
                  <span className="font-mono text-xs text-heat">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-display text-base font-bold uppercase leading-tight transition-colors duration-200 group-hover:text-heat sm:text-lg">
                      {s.title}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-fog-2">{s.note}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-display text-xl font-black leading-none text-concrete transition-colors duration-200 group-hover:text-heat sm:text-2xl">
                      {s.price}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-fog-2">{s.tag}</p>
                  </div>
                </div>
              </Reveal>
            ))}
            <div className="hazard h-2" aria-hidden="true" />
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog-2">
                полимеризация в печи до 200 °C — в каждой цене
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                партии — скидка до 10%
              </span>
            </div>
          </div>

          {/* калькулятор */}
          <div id="kalkulator" className="lg:sticky lg:top-24 lg:self-start">
            <Calculator selected={selected} />
          </div>
        </div>
      </div>
    </section>
  );
}
