import { useEffect, useRef, useState, type ReactNode } from "react";

/* Окно с внутренним боковым скроллом и живой подсказкой:
   градиент справа, пока есть куда скроллить; гаснет у края. */
export function ScrollWindow({
  children,
  className = "",
  innerClassName = "",
  axis = "x",
  fadeFrom = "#14120c",
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  axis?: "x" | "both";
  fadeFrom?: string;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const check = () => {
      const hasMore =
        el.scrollWidth > el.clientWidth + 4 && el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      setMore(hasMore);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={innerRef}
        className={`term-scroll ${axis === "x" ? "overflow-x-auto" : "overflow-auto"} ${innerClassName}`}
        tabIndex={0}
        role="region"
        aria-label="Область с прокруткой"
      >
        {children}
      </div>
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l to-transparent transition-opacity duration-300 ${
          more ? "opacity-100" : "opacity-0"
        }`}
        style={{ ["--tw-gradient-from" as string]: fadeFrom }}
        aria-hidden="true"
      />
      <span
        className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 border border-paper/25 bg-ink/85 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-paper/70 transition-opacity duration-300 ${
          more ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      >
        скролл →
      </span>
    </div>
  );
}
