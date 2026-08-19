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

/* ---------- in-view (callback ref, безопасен для полиморфных тегов) ---------- */

export function useInView<T extends Element>(
  threshold = 0.18,
  once = true,
): [(el: T | null) => void, boolean] {
  const [inView, setInView] = useState(false);
  const elRef = useRef<T | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);

  const cb = useCallback(
    (el: T | null) => {
      ioRef.current?.disconnect();
      elRef.current = el;
      if (!el) return;
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              setInView(true);
              if (once) io.disconnect();
            } else if (!once) {
              setInView(false);
            }
          }
        },
        { threshold },
      );
      ioRef.current = io;
      io.observe(el);
    },
    [threshold, once],
  );

  useEffect(() => () => ioRef.current?.disconnect(), []);
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
  as?: "div" | "li" | "article" | "figure" | "section" | "span" | "a";
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
  stagger = 110,
}: {
  lines: ReactNode[];
  className?: string;
  stagger?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className={`${inView ? "rv-in" : ""} ${className}`}>
      {lines.map((l, i) => (
        <span key={i} className="line-mask">
          <span style={{ "--rv-delay": `${i * stagger}ms` } as CSSProperties}>{l}</span>
        </span>
      ))}
    </div>
  );
}

/* ---------- счётчик (рецепт M-05) ---------- */

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

  const run = useCallback(() => {
    if (prm) {
      setText(finalText);
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
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
  }, [finalText, prm]);

  useEffect(() => {
    if (play) run();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [play, run]);

  return { text, run };
}

/* ---------- резиновый штамп ---------- */

export function Stamp({
  children,
  rot = -8,
  color = "var(--color-red)",
  className = "",
  animate = false,
}: {
  children: ReactNode;
  rot?: number;
  color?: string;
  className?: string;
  animate?: boolean;
}) {
  return (
    <span
      className={`rubber-stamp inline-block text-sm sm:text-base ${animate ? "stamp-anim" : ""} ${className}`}
      style={{ color, ["--stamp-rot" as string]: `${rot}deg` }}
    >
      {children}
    </span>
  );
}
