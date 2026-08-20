import { useEffect, useState } from "react";

/* Мини-роутер по hash: '#/pcpolimer' — боевой проект, всё остальное — ЦЕХ */

export type Route = "ceh" | "pcpolimer";

function parse(hash: string): Route {
  return hash.startsWith("#/pcpolimer") ? "pcpolimer" : "ceh";
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onHash = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}
