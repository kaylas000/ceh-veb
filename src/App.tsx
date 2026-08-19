import { Header, Footer, NoiseLayer, Marquee } from "./sections/Chrome";
import { Plate } from "./sections/Plate";
import { Library } from "./sections/Library";
import { Motion } from "./sections/Motion";
import { Rules } from "./sections/Rules";
import { Workflow } from "./sections/Workflow";
import { Control } from "./sections/Control";
import { ValidatorSection } from "./sections/ValidatorSection";
import { Projects } from "./sections/Projects";

export default function App() {
  return (
    <div className="bg-paper font-body text-ink">
      <NoiseLayer />
      <Header />
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
          ]}
          dark
        />
        <Rules />
        <Workflow />
        <Control />
        <ValidatorSection />
        <Projects />
      </main>
      <Footer />
    </div>
  );
}
