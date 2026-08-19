import { useRoute } from "./lib/router";
import { CehApp } from "./ceh/CehApp";
import { PcpolimerApp } from "./co/PcpolimerApp";

export default function App() {
  const route = useRoute();
  return route === "pcpolimer" ? <PcpolimerApp /> : <CehApp />;
}
