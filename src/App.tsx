import { useEffect } from "react";
import { Header, Footer, NoiseLayer, Marquee } from "./components/Chrome";
import { Plate } from "./components/Plate";
import { Conveyor } from "./components/Conveyor";
import { Archive } from "./components/Archive";
import { MotionLab } from "./components/MotionLab";
import { Regulations } from "./components/Regulations";
import { Gates } from "./components/Gates";
import { CineLine } from "./components/CineLine";
import { ValidatorLab } from "./components/ValidatorLab";
import { Dossier } from "./components/Dossier";
import { initSmooth } from "./lib/smooth";

const CODES_TAPE = [
  "К-04: приём без источника — слоп",
  "V-01…V-10",
  "G1 → G2 → G3 → G4",
  "B-02: дефолтный easing запрещён",
  "Q-01: 1–3 рецепта на страницу",
  "exit 0 / exit 1",
  "takeaway цитируется дословно",
  "К-11: повтор осей запрещён",
];

const TECHNIQUES_TAPE = [
  "sticky-сцена ≥70vh",
  "капс 9vw",
  "маска-reveal 700ms",
  "индекс вместо карточек",
  "зерно 5% multiply",
  "ceh-brake (0.16, 1, 0.3, 1)",
  "перенос по смыслу",
  "один тезис — экран",
  "ломаная сетка 12 колонок",
  "кен-бёрнс 18s",
];

const CINE_TAPE = [
  "master timeline 0→1",
  "pin + scrub · демпфирование 0.11",
  "150 кадров · процедурная плёнка",
  "trail вместо clearRect = motion blur",
  "lenis: плавный ход ленты",
  "state machine: idle → charge → strike",
  "виртуализация: рендер только во вьюпорте",
  "vignette + grain = постобработка",
];

export default function App() {
  useEffect(() => {
    initSmooth();
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <NoiseLayer />
      <div className="pp-vignette" aria-hidden="true" />
      <Header />
      <main>
        <Plate />
        <Marquee items={CODES_TAPE} speed={30} />
        <Conveyor />
        <Archive />
        <Marquee items={TECHNIQUES_TAPE} dark speed={34} />
        <MotionLab />
        <Regulations />
        <Gates />
        <Marquee items={CINE_TAPE} dark speed={28} />
        <CineLine />
        <ValidatorLab />
        <Dossier />
      </main>
      <Footer />
    </div>
  );
}
