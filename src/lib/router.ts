import { useEffect, useState } from "react";

/* Мини-роутер по hash:
   '#/pcpolimer' — боевой проект Pcpolimer (порошковая покраска),
   '#/banki' — боевой проект Все-Банки (финансовая витрина),
   всё остальное — ЦЕХ (студийный портал)
*/

export type Route = "ceh" | "pcpolimer" | "banki";

function parse(hash: string): Route {
  if (hash.startsWith("#/pcpolimer")) return "pcpolimer";
  if (hash.startsWith("#/banki")) return "banki";
  return "ceh";
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
