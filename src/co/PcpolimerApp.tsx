import { useRef, useState } from "react";
import { Head } from "../components/co/Head";
import { Ral } from "../components/co/Ral";
import { Services } from "../components/co/Services";
import { Process, Trust, Gallery } from "../components/co/Process";
import { Contacts, CehDossier, Foot } from "../components/co/Contacts";
import { RAL } from "../data/company";
import { downloadBuildZip } from "../lib/zip";

export function PcpolimerApp() {
  /* выбранный цвет RAL: палитра → конвейер печи → калькулятор */
  const [selected, setSelected] = useState(RAL[4]); /* RAL 2004 · оранжевый чистый */

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
        <button
          onClick={handleZip}
          disabled={zipState === "busy"}
          className="shrink-0 border border-steel-2 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-concrete transition-colors duration-200 hover:border-heat hover:bg-heat hover:text-coal disabled:cursor-wait disabled:opacity-60"
          title="Скачать архив сайта (ZIP)"
        >
          {zipState === "busy" ? "…" : zipState === "done" ? "✓ отдан" : "↓ ZIP"}
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
