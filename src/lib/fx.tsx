import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/* ---------- prefers-reduced-motion ---------- */

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ---------- in-view ---------- */

export function useInView<T extends Element>(
  threshold = 0.18,
  once = true,
): [(el: T | null) => void, boolean] {
  const [inView, setInView] = useState(false);
  const elRef = useRef<T | null>(null);
  const cb = useCallback(
    (el: T | null) => {
      elRef.current = el;
    },
    [],
  );
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    /* страховка: если IO молчит, а элемент реально во вьюпорте — показываем.
       Ниже fold не трогаем, чтобы не ломать скролл-появления. */
    const inViewport = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.95 && r.bottom > 0;
    };
    const fallback = window.setInterval(() => {
      if (inViewport()) {
        setInView(true);
        window.clearInterval(fallback);
      }
    }, 400);
    const fallbackStop = window.setTimeout(() => window.clearInterval(fallback), 4000);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            window.clearInterval(fallback);
            window.clearTimeout(fallbackStop);
            if (once) io.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => {
      window.clearInterval(fallback);
      window.clearTimeout(fallbackStop);
      io.disconnect();
    };
  }, [threshold, once]);
  return [cb, inView];
}

/* ---------- scroll reveal ---------- */

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "article" | "figure" | "section" | "span";
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.12);
  return (
    <Tag
      ref={ref as never}
      className={`rv ${inView ? "rv-in" : ""} ${className}`}
      style={{ "--rv-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/* ---------- маска-строки (рецепт M-01) ---------- */

export function MaskLines({
  lines,
  className = "",
  lineClassName = "",
  stagger = 110,
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  stagger?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className={`${inView ? "rv-in" : ""} ${className}`}>
      {lines.map((l, i) => (
        <span key={i} className="line-mask">
          <span className={lineClassName} style={{ "--rv-delay": `${i * stagger}ms` } as CSSProperties}>
            {l}
          </span>
        </span>
      ))}
    </div>
  );
}

/* ---------- счётчик ---------- */

export function useCountUp(target: number, run: boolean, duration = 1400): number {
  const prm = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (prm) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setValue(Math.round((1 - Math.pow(1 - p, 4)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, duration, prm]);
  return value;
}

/* ---------- скрэмбл-декодирование (рецепт M-04) ---------- */

const GLYPHS = "▚▞#/\\|<>-_=+*%ЦЕХРК0123456789";

export function useScramble(finalText: string, play: boolean) {
  const prm = useReducedMotion();
  const [text, setText] = useState(finalText);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!play || prm) {
      setText(finalText);
      return;
    }
    let frame = 0;
    const total = finalText.length * 2 + 8;
    const tick = () => {
      frame++;
      const settled = Math.floor((frame / total) * finalText.length * 1.25);
      let out = "";
      for (let i = 0; i < finalText.length; i++) {
        const ch = finalText[i];
        if (ch === " " || i < settled) out += ch;
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setText(out);
      if (frame < total) timer.current = window.setTimeout(tick, 34);
      else setText(finalText);
    };
    tick();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [play, finalText, prm]);
  return text;
}

/* ---------- звёзды рейтинга ---------- */

export function Stars({ value = 5, size = 14, className = "" }: { value?: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`Рейтинг ${value} из 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z"
            fill={i < Math.round(value) ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
            opacity={i < Math.round(value) ? 1 : 0.4}
          />
        </svg>
      ))}
    </span>
  );
}
