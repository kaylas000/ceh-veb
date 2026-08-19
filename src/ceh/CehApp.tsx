import { useEffect } from "react";
import { Header, Footer, NoiseLayer, Marquee } from "../components/Chrome";
import { Plate } from "../components/Plate";
import { Conveyor } from "../components/Conveyor";
import { Archive } from "../components/Archive";
import { MotionLab } from "../components/MotionLab";
import { Regulations } from "../components/Regulations";
import { Gates } from "../components/Gates";
import { CineLine } from "../components/CineLine";
import { ProjectsHall } from "../components/ProjectsHall";
import { ValidatorLab } from "../components/ValidatorLab";
import { Dossier } from "../components/Dossier";
import { LiveProjectStrip } from "../components/LiveProjectStrip";
import { initSmooth } from "../lib/smooth";

export function CehApp() {
  useEffect(() => {
    initSmooth();
  }, []);

  return (
    <div className="bg-paper font-body text-ink">
      <Header />
      <main>
        <LiveProjectStrip />
        <Plate />
        <Marquee
          items={[
            "архив — единственный источник",
            "приём без источника — слоп",
            "ворота G1–G4",
            "validate.mjs · exit 0/1",
            "16 запретов · 7 квот",
            "easing только из реестра",
            "первый боевой проект: pcpolimer",
          ]}
        />
        <Conveyor />
        <Archive />
        <MotionLab />
        <Regulations />
        <Gates />
        <CineLine />
        <ProjectsHall />
        <ValidatorLab />
        <Marquee
          dark
          items={[
            "возврат с ворот = точечные правки",
            "не перезапуск",
            "подряд идущие проекты с совпадением осей — 0",
            "сходство по diff-projects ≤ 10%",
          ]}
          speed={30}
        />
        <Dossier />
      </main>
      <Footer />
      <NoiseLayer />
      <div className="pp-vignette" aria-hidden="true" />
    </div>
  );
}
