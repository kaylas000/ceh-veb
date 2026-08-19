import { useState } from "react";
import { Head } from "../components/co/Head";
import { Ral } from "../components/co/Ral";
import { Services } from "../components/co/Services";
import { Process, Trust, Gallery } from "../components/co/Process";
import { Contacts, CehDossier, Foot } from "../components/co/Contacts";
import { RAL } from "../data/company";

export function PcpolimerApp() {
  /* выбранный цвет RAL: палитра → конвейер печи → калькулятор */
  const [selected, setSelected] = useState(RAL[4]); /* RAL 2004 · оранжевый чистый */

  return (
    <div className="min-h-screen bg-coal text-concrete">
      {/* служебная планка студии */}
      <div className="fixed inset-x-0 top-0 z-[70] flex h-[30px] items-center justify-between gap-3 border-b border-steel bg-[#101114] px-4">
        <a
          href="#/"
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fog transition-colors hover:text-heat"
        >
          <span className="grid h-4 w-4 place-items-center bg-heat font-display text-[8px] font-bold leading-none text-coal">Ц</span>
          ← ЦЕХ · веб-студия
        </a>
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-fog-2 sm:block">
          боевой проект PRJ-01 · принят G4
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog-2">сборка: dist/</span>
      </div>

      <div className="noise-layer" aria-hidden="true" />
      <div className="pp-vignette" aria-hidden="true" />
      <Head selected={selected} />
      <main>
        <Ral selected={selected} onSelect={setSelected} />
        <Services selected={selected} />
        <Process />
        <Trust />
        <Gallery />
        <Contacts />
        <CehDossier />
      </main>
      <Foot />
    </div>
  );
}
