import { useState } from "react";
import { Head } from "../components/co/Head";
import { Ral } from "../components/co/Ral";
import { Services } from "../components/co/Services";
import { Process, Trust, Gallery } from "../components/co/Process";
import { Contacts, CehDossier, Foot } from "../components/co/Contacts";
import { RAL } from "../data/company";
import { useZipDownload, zipLabel } from "../lib/zip";

export function PcpolimerApp() {
  /* выбранный цвет RAL: палитра → конвейер печи → калькулятор */
  const [selected, setSelected] = useState(RAL[4]); /* RAL 2004 · оранжевый чистый */
  const zip = useZipDownload();

  return (
    <div className="min-h-screen bg-coal text-concrete">
      {/* служебная планка студии */}
      <div className="fixed inset-x-0 top-0 z-[70] flex h-[34px] items-center justify-between gap-3 border-b border-steel bg-[#101114] px-3 sm:px-4">
        <a
          href="#/"
          className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fog transition-colors hover:text-heat"
        >
          <span className="grid h-4 w-4 shrink-0 place-items-center bg-heat font-display text-[8px] font-bold leading-none text-coal">Ц</span>
          <span className="truncate">← ЦЕХ · веб-студия</span>
        </a>
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-fog-2 md:block">
          боевой проект PRJ-01 · принят G4
        </span>
        <button
          onClick={zip.run}
          disabled={zip.state === "busy"}
          className="flex shrink-0 items-center gap-2 border-2 border-heat bg-heat px-3 py-1 font-display text-[11px] font-black uppercase tracking-[0.1em] text-coal transition-all duration-200 hover:-translate-y-px hover:shadow-[3px_3px_0_rgba(255,106,43,0.4)] disabled:cursor-wait disabled:opacity-70"
          title="Скачать готовый сайт архивом ZIP"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M12 3v12m0 0 5-5m-5 5-5-5M4 21h16" strokeLinecap="square" />
          </svg>
          {zipLabel(zip.state)}
        </button>
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
