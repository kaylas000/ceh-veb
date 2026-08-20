import { useCallback, useEffect, useRef, useState } from "react";
import { Header, Footer, NoiseLayer, Marquee, CtaBanner, MobileOrderBar } from "./sections/Chrome";
import { Plate } from "./sections/Plate";
import { Library } from "./sections/Library";
import { Motion } from "./sections/Motion";
import { Rules } from "./sections/Rules";
import { Workflow } from "./sections/Workflow";
import { Control } from "./sections/Control";
import { CineLine } from "./sections/CineLine";
import { SpacingControl } from "./sections/SpacingControl";
import { MobilePerfect } from "./sections/MobilePerfect";
import { ValidatorSection } from "./sections/ValidatorSection";
import { Projects } from "./sections/Projects";
import { Intake } from "./sections/Intake";
import { Seo } from "./sections/Seo";
import { Variance } from "./sections/Variance";
import { QaFortress } from "./sections/QaFortress";
import { IntroOverlay } from "./components/IntroOverlay";
import { PRESET_ORDER, type IntroPreset } from "./lib/intro";
import { initSmooth, destroySmooth, scrollToId } from "./lib/smooth";

const SEEN_KEY = "ceh-intro-seen";
const IDX_KEY = "ceh-intro-preset";

export default function App() {
  const [intro, setIntro] = useState<{ preset: IntroPreset; token: number } | null>(null);
  const presetIdx = useRef(0);

  const playIntro = useCallback(() => {
    const next = PRESET_ORDER[presetIdx.current % PRESET_ORDER.length];
    presetIdx.current += 1;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
      sessionStorage.setItem(IDX_KEY, String(presetIdx.current));
    } catch {
      /* приватный режим — просто показываем */
    }
    setIntro({ preset: next, token: Date.now() });
  }, []);

  /* первый визит в сессии: заставка; повторные — сразу студия (SK-06) */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      presetIdx.current = Number(sessionStorage.getItem(IDX_KEY) ?? 0) || 0;
    } catch {
      seen = false;
    }
    if (!reduced && !seen) playIntro();
  }, [playIntro]);

  useEffect(() => {
    initSmooth();
    /* перехват якорных ссылок — плавный ход через Lenis */
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.length < 2) return;
      e.preventDefault();
      scrollToId(href);
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      destroySmooth();
    };
  }, []);

  return (
    <div className="bg-paper font-body text-ink">
      <NoiseLayer />
      <Header onIntro={playIntro} />
      <main>
        <Plate />
        <Library />
        <Motion />
        <Marquee
          items={[
            "К-04: приём без источника — слоп",
            "К-05: easing только из реестра",
            "Q-01: 1–3 рецепта на страницу",
            "B-02: браузерные дефолты запрещены",
            "К-11: удачное возвращается в архив",
            "SK-06: заставка ≤4с, skip обязателен",
          ]}
          dark
        />
        <Rules />
        <Workflow />
        <Control />
        <CineLine />
        <SpacingControl />
        <MobilePerfect />
        <Marquee
          items={[
            "тап-зона ≥44px",
            "инпуты ≥16px — без iOS-зума",
            "viewport-fit=cover",
            "sweep: 22 вьюпорта",
            "перф-бюджет: LCP 2.5с",
          ]}
        />
        <ValidatorSection />
        <Projects />
        <Intake />
        <Seo />
        <Variance />
        <QaFortress />
        <CtaBanner />
      </main>
      <Footer />
      <MobileOrderBar />
      {intro && (
        <IntroOverlay
          key={intro.token}
          preset={intro.preset}
          onDone={() => setIntro(null)}
        />
      )}
    </div>
  );
}
