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
  const [prm, setPrm] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPrm(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return prm;
}

/* ---------- in-view observer (callback ref) ---------- */

export function useInView<T extends HTMLElement>(
  threshold = 0.2,
  once = true,
): [(el: T | null) => void, boolean] {
  const [inView, setInView] = useState(false);
  const ioRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback(
    (el: T | null) => {
      ioRef.current?.disconnect();
      ioRef.current = null;
      if (!el) return;
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              setInView(true);
              if (once) io.unobserve(e.target);
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
  return [setRef, inView];
}

/* ---------- <Reveal> — scroll reveal ---------- */

export function Reveal({
  children,
  className = "",
  delay = 0,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.12);
  return (
    <div
      ref={ref}
      className={`rv ${inView ? "rv-in" : ""} ${className}`}
      style={{ ...style, ["--rv-delay" as string]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- section title with line-mask reveal ---------- */

export function MaskTitle({
  lines,
  className = "",
}: {
  lines: ReactNode[];
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className={`${inView ? "rv-in" : ""} ${className}`}>
      {lines.map((l, i) => (
        <span key={i} className="line-mask">
          <span style={{ ["--rv-delay" as string]: `${i * 100}ms` }}>{l}</span>
        </span>
      ))}
    </div>
  );
}

/* ---------- scramble-decode (recipe M-04) ---------- */

const SCRAMBLE_CHARS = "ЖДЗКЦШФ#/\\×+=1470";

export function useScramble(target: string, play: boolean, speed = 24) {
  const prm = useReducedMotion();
  const [text, setText] = useState(target);
  const busy = useRef(false);

  const run = useCallback(() => {
    if (prm) {
      setText(target);
      return;
    }
    if (busy.current) return;
    busy.current = true;
    let frame = 0;
    const total = target.length;
    const tick = () => {
      frame += 1;
      const revealed = Math.floor(frame / 2);
      let out = "";
      for (let i = 0; i < total; i++) {
        const ch = target[i];
        if (ch === " " || ch === "·") {
          out += ch;
        } else if (i < revealed) {
          out += ch;
        } else {
          out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      setText(out);
      if (revealed <= total) {
        window.setTimeout(tick, speed);
      } else {
        setText(target);
        busy.current = false;
      }
    };
    tick();
  }, [target, prm, speed]);

  useEffect(() => {
    if (play) run();
  }, [play, run]);

  return { text, run };
}

export function ScrambleText({
  text,
  className = "",
  trigger = "view",
}: {
  text: string;
  className?: string;
  trigger?: "view" | "hover";
}) {
  const [ref, inView] = useInView<HTMLSpanElement>(0.5);
  const [nonce, setNonce] = useState(0);
  const play = trigger === "view" ? inView : nonce > 0;
  const s = useScramble(nonce > 0 ? text : text, play);
  return (
    <span
      ref={ref}
      className={`${className} ${trigger === "hover" ? "cursor-pointer" : ""}`}
      onMouseEnter={() => trigger === "hover" && setNonce((n) => n + 1)}
    >
      {s.text}
    </span>
  );
}

/* ---------- mechanical counter (recipe M-05) ---------- */

export function TickCounter({
  value,
  suffix = "",
  className = "",
  duration = 1300,
}: {
  value: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const prm = useReducedMotion();
  const [ref, inView] = useInView<HTMLSpanElement>(0.5);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prm) {
      setN(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      setN(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, prm, duration]);
  return (
    <span ref={ref} className={className}>
      {n}
      {suffix}
    </span>
  );
}

/* ---------- rubber stamp ---------- */

export function Stamp({
  children,
  color = "var(--color-red)",
  rot = -8,
  className = "",
  blend = true,
}: {
  children: ReactNode;
  color?: string;
  rot?: number;
  className?: string;
  blend?: boolean;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  return (
    <div
      ref={ref}
      className={`stamp-el ${inView ? "rv-in" : ""} ${className}`}
      style={{ color, ["--stamp-rot" as string]: `${rot}deg` }}
    >
      <span
        className="rubber-stamp text-[0.8rem] sm:text-base"
        style={blend ? undefined : { mixBlendMode: "normal" }}
      >
        {children}
      </span>
    </div>
  );
}
