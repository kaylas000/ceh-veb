import { useState } from "react";
import { Head } from "./components/co/Head";
import { Ral } from "./components/co/Ral";
import { Services } from "./components/co/Services";
import { Process, Trust } from "./components/co/Process";
import { Contacts, CehDossier, Foot } from "./components/co/Contacts";
import { RAL } from "./data/company";

export default function App() {
  /* выбранный цвет RAL: палитра → конвейер печи → калькулятор */
  const [selected, setSelected] = useState(RAL[4]); /* RAL 2004 · оранжевый чистый */

  return (
    <div className="min-h-screen bg-coal text-concrete">
      <div className="noise-layer" aria-hidden="true" />
      <div className="pp-vignette" aria-hidden="true" />
      <Head selected={selected} />
      <main>
        <Ral selected={selected} onSelect={setSelected} />
        <Services selected={selected} />
        <Process />
        <Trust />
        <Contacts />
        <CehDossier />
      </main>
      <Foot />
    </div>
  );
}
