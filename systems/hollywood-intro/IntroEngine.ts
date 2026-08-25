/* ------------------------------------------------------------------ */
/* Кинозаставка студии (рецепт M-11 · скил SK-06).                     */
/* Vanilla canvas + Web Audio: ноль зависимостей.                      */
/* Архитектура по спеке «голливудских заставок»:                       */
/*   · единый master-таймлайн (загрузка → пресет → титр → шторки)      */
/*   · пресеты: SBR-01 сборка частиц / LUM-02 свет / TYP-03 кинетика   */
/*   · адаптивное качество (частицы, dpr)                              */
/*   · skip (кнопка + ESC), звук только по жесту, sessionStorage       */
/*   · prefers-reduced-motion → заставка не показывается               */
/* ------------------------------------------------------------------ */

export type IntroPreset = "assembly" | "light" | "type";

export const PRESET_ORDER: IntroPreset[] = ["assembly", "light", "type"];

export const PRESET_META: Record<IntroPreset, { code: string; name: string }> = {
  assembly: { code: "SBR-01", name: "Сборка частиц" },
  light: { code: "LUM-02", name: "Проявление светом" },
  type: { code: "TYP-03", name: "Кинетика шрифта" },
};

export type IntroPhase = "loading" | "main" | "titr" | "curtain";

interface EngineOpts {
  preset: IntroPreset;
  onPhase: (p: IntroPhase) => void;
  onProgress: (v: number) => void;
  onDone: () => void;
}

interface Particle {
  sx: number; sy: number;
  tx: number; ty: number;
  mx: number; my: number;
  delay: number;
  size: number;
  color: string;
}

interface Mote { x: number; y: number; v: number; r: number; a: number }

/* ---------- easing из реестра (К-05): никаких браузерных дефолтов ---------- */

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInOutDrag = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const SCRAMBLE = "▚▞#/\\|<>-_=+*%ЦЕХАР0123456789";

const COLORS = {
  bg: "#0f0e0a",
  paper: "#e8e6de",
  red: "#ce2c18",
  yellow: "#e0a91c",
  fog: "#7a766a",
};

export class IntroEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private w = 0;
  private h = 0;
  private raf = 0;
  private t0 = 0;
  private readonly dur = 3400; /* ≤4 секунд по SK-06 */
  private progress = 0;
  private finished = false;
  private destroyed = false;

  private particles: Particle[] = [];
  private motes: Mote[] = [];
  private wordmark: HTMLCanvasElement | null = null;
  private wmScale = 1;

  private phase: IntroPhase = "loading";
  private marks = { impact: false, whoosh: false, whooshPlayed: false };
  private shake = 0;

  private ac: AudioContext | null = null;
  soundOn = false;

  constructor(private opts: EngineOpts) {}

  /* ---------- запуск ---------- */

  async start(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) return;

    /* реальная загрузка шрифта с ограничением — интро не зависнет */
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('900 100px "Russo One"'),
          document.fonts.load('700 24px "JetBrains Mono"'),
        ]),
        new Promise((r) => window.setTimeout(r, 900)),
      ]);
    } catch {
      /* нет FontFace API — рисуем системным */
    }

    this.resize();
    window.addEventListener("resize", this.resize);
    this.t0 = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private resize = (): void => {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.isMobile() ? 1.5 : 1.75);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.buildWordmark();
    this.buildPreset();
  };

  private isMobile(): boolean {
    return /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 640;
  }

  private qualityCount(): number {
    const cores = navigator.hardwareConcurrency || 4;
    if (this.isMobile() || cores < 4) return 1600;
    if (cores >= 8) return 6400;
    return 3800;
  }

  /* ---------- безопасная зона: слово не залазит на верхнюю/нижнюю плашки ---------- */

  /* верхняя плашка «ЦЕХ · премьера» + нижний прогресс/skip — резервируем место */
  private get safeTop(): number {
    return this.isMobile() ? 70 : 64;
  }
  private get safeBottom(): number {
    return this.isMobile() ? 116 : 128;
  }
  /* доступная высота между плашками */
  private get availH(): number {
    return Math.max(240, this.h - this.safeTop - this.safeBottom);
  }
  /* центр слова — в середине безопасной зоны */
  private wordCY(): number {
    return this.safeTop + this.availH * 0.47;
  }
  /* размер слова — ограничен и по ширине, и по высоте зоны */
  private wordFS(): number {
    return Math.min(this.w * 0.3, this.availH * 0.55);
  }

  /* ---------- данные пресетов ---------- */

  private buildWordmark(): void {
    const off = document.createElement("canvas");
    const fs = this.wordFS();
    off.width = Math.round(this.w * 1.1);
    off.height = Math.round(fs * 1.5);
    const c = off.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, off.width, off.height);
    c.font = `900 ${fs}px "Russo One", sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#fff";
    c.fillText("ЦЕХ", off.width / 2, off.height / 2);
    this.wordmark = off;
    this.wmScale = Math.min(1, (this.w * 0.86) / off.width);

    /* выборка точек логотипа */
    const step = this.isMobile() ? 4 : 3;
    const img = c.getImageData(0, 0, off.width, off.height);
    const pts: Array<[number, number]> = [];
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        if (img.data[(y * off.width + x) * 4 + 3] > 128) pts.push([x, y]);
      }
    }
    /* россыпь → частицы (пересобираются при resize) */
    const count = Math.min(this.qualityCount(), Math.max(600, pts.length));
    const cx = this.w / 2;
    const cy = this.wordCY();
    const R = Math.max(this.w, this.h) * 0.72;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const pt = pts[(Math.random() * pts.length) | 0];
      const tx = cx + (pt[0] - off.width / 2) * this.wmScale;
      const ty = cy + (pt[1] - off.height / 2) * this.wmScale;
      const ang = Math.random() * Math.PI * 2;
      const rad = R * (0.55 + Math.random() * 0.6);
      const roll = Math.random();
      this.particles.push({
        sx: cx + Math.cos(ang) * rad,
        sy: cy + Math.sin(ang) * rad * 0.8,
        tx,
        ty,
        mx: (cx + tx) / 2 + (Math.random() - 0.5) * this.w * 0.2,
        my: (cy + ty) / 2 + (Math.random() - 0.5) * this.h * 0.2,
        delay: Math.random() * 0.4,
        size: 0.9 + Math.random() * 1.7,
        color: roll < 0.7 ? COLORS.paper : roll < 0.85 ? COLORS.yellow : COLORS.red,
      });
    }
    /* пылинки для светового пресета */
    this.motes = Array.from({ length: this.isMobile() ? 60 : 130 }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      v: 0.15 + Math.random() * 0.5,
      r: 0.6 + Math.random() * 1.6,
      a: 0.1 + Math.random() * 0.3,
    }));
  }

  private buildPreset(): void {
    /* данные собираются в buildWordmark; здесь точка расширения */
  }

  /* ---------- master-таймлайн ---------- */

  private loop = (now: number): void => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    const p = clamp01((now - this.t0) / this.dur);
    this.progress = p;
    this.opts.onProgress(p);

    const nextPhase: IntroPhase = p < 0.13 ? "loading" : p < 0.82 ? "main" : p < 0.97 ? "titr" : "curtain";
    if (nextPhase !== this.phase) {
      this.phase = nextPhase;
      this.opts.onPhase(nextPhase);
      if (nextPhase === "curtain" && !this.marks.whoosh) {
        this.marks.whoosh = true;
        this.playWhoosh();
      }
    }

    this.draw(now / 1000, p);

    /* удар на сборке — один раз */
    if (this.opts.preset === "assembly" && p > 0.72 && !this.marks.impact) {
      this.marks.impact = true;
      this.shake = 7;
      this.playImpact();
    }
    this.shake *= 0.86;

    if (p >= 1 && !this.finished) this.finish();
  };

  skip(): void {
    if (this.finished) return;
    this.t0 = performance.now() - this.dur; /* таймлайн в конец */
  }

  private finish(): void {
    this.finished = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.opts.onPhase("curtain");
    this.playWhoosh();
    /* шторки и вызов onDone ведёт оверлей — у него вся хореография перехода */
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    if (this.ac) {
      this.ac.close().catch(() => undefined);
      this.ac = null;
    }
  }

  /* ---------- отрисовка кадра ---------- */

  private draw(t: number, p: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { w, h } = this;

    ctx.save();
    if (this.shake > 0.3) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(-10, -10, w + 20, h + 20);

    /* faint blueprint grid */
    ctx.strokeStyle = "rgba(232,230,222,0.045)";
    ctx.lineWidth = 1;
    const grid = 56;
    ctx.beginPath();
    for (let x = (w % grid) / 2; x < w; x += grid) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = (h % grid) / 2; y < h; y += grid) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    if (this.phase === "loading") this.drawLoading(ctx, p, t);
    else if (this.phase === "main" || this.phase === "titr" || this.phase === "curtain") {
      const mp = clamp01((p - 0.13) / (0.82 - 0.13));
      if (this.opts.preset === "assembly") this.drawAssembly(ctx, mp, t, p);
      else if (this.opts.preset === "light") this.drawLight(ctx, mp, t);
      else this.drawType(ctx, mp, t);
    }

    /* телеметрия кадра */
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillStyle = "rgba(122,118,106,0.9)";
    ctx.textAlign = "left";
    ctx.fillText(`КАДР ${String(Math.min(120, Math.round(p * 120))).padStart(3, "0")}/120`, 20, h - 52);
    ctx.fillText(`ПРЕСЕТ ${PRESET_META[this.opts.preset].code}`, 20, h - 34);

    /* виньетка */
    const v = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.25, w / 2, h * 0.5, h * 0.95);
    v.addColorStop(0, "rgba(8,7,5,0)");
    v.addColorStop(1, "rgba(8,7,5,0.5)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  private drawLoading(ctx: CanvasRenderingContext2D, p: number, t: number): void {
    const lp = clamp01(p / 0.13);
    const { w, h } = this;
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = COLORS.fog;
    ctx.textAlign = "center";
    ctx.fillText("ЗАГРУЗКА АРХИВА" + "·".repeat(1 + (Math.floor(t * 3) % 3)), w / 2, h * 0.56);
    ctx.fillStyle = "rgba(232,230,222,0.15)";
    ctx.fillRect(w / 2 - 120, h * 0.6, 240, 3);
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(w / 2 - 120, h * 0.6, 240 * easeInOutDrag(lp), 3);
  }

  /* SBR-01: частицы собирают слово */
  private drawAssembly(ctx: CanvasRenderingContext2D, mp: number, t: number, p: number): void {
    const { w, h } = this;
    ctx.globalCompositeOperation = "lighter";
    for (const pt of this.particles) {
      const local = clamp01((mp - pt.delay) / (1 - pt.delay));
      const e = easeOutExpo(local);
      const wob = 1 - e;
      const bx = (1 - e) * (1 - e) * pt.sx + 2 * (1 - e) * e * (pt.mx + Math.sin(t * 2 + pt.delay * 20) * 26 * wob) + e * e * pt.tx;
      const by = (1 - e) * (1 - e) * pt.sy + 2 * (1 - e) * e * (pt.my + Math.cos(t * 1.7 + pt.delay * 17) * 26 * wob) + e * e * pt.ty;
      ctx.globalAlpha = 0.12 + 0.78 * e;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(bx, by, pt.size * (1.6 - 0.6 * e), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    /* красная рейка под словом после сборки */
    if (p > 0.7) {
      const rp = easeInOutDrag(clamp01((p - 0.7) / 0.14));
      const lw = this.w * 0.34 * rp;
      const wmH = this.wordmark ? this.wordmark.height * this.wmScale : this.h * 0.28;
      ctx.fillStyle = COLORS.red;
      ctx.fillRect(w / 2 - lw / 2, this.wordCY() + wmH / 2 + this.h * 0.045, lw, 5);
    }
  }

  /* LUM-02: свет проявляет слово */
  private drawLight(ctx: CanvasRenderingContext2D, mp: number, t: number): void {
    const { w, h } = this;
    if (!this.wordmark) return;

    const sweep = easeInOutDrag(mp);
    const wmW = this.wordmark.width * this.wmScale;
    const wmH = this.wordmark.height * this.wmScale;
    const x0 = (w - wmW) / 2;
    const y0 = this.wordCY() - wmH / 2;
    const revealY = y0 + wmH * sweep;

    /* конус света */
    const coneH = h * 0.62;
    const g = ctx.createLinearGradient(w / 2, -coneH * 0.2, w / 2, coneH);
    g.addColorStop(0, `rgba(255,214,140,${0.34 * Math.min(1, mp * 4)})`);
    g.addColorStop(1, "rgba(255,214,140,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w / 2 - w * 0.02, -10);
    ctx.lineTo(w / 2 + w * 0.02, -10);
    ctx.lineTo(w / 2 + w * 0.24, coneH);
    ctx.lineTo(w / 2 - w * 0.24, coneH);
    ctx.closePath();
    ctx.fill();

    /* пылинки в луче */
    for (const m of this.motes) {
      m.y -= m.v;
      if (m.y < -4) m.y = h + 4;
      ctx.globalAlpha = m.a * Math.min(1, mp * 3);
      ctx.fillStyle = COLORS.paper;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* слово, проявленное до линии света */
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, revealY);
    ctx.clip();
    ctx.drawImage(this.wordmark, x0, y0, wmW, wmH);
    ctx.restore();

    /* кромка проявления */
    ctx.fillStyle = `rgba(255,224,160,${0.75 * Math.sin(Math.min(1, mp * 3) * Math.PI)})`;
    ctx.fillRect(x0 - 10, revealY - 1.5, wmW + 20, 3);

    /* блик у источника */
    const flare = ctx.createRadialGradient(w / 2, 0, 2, w / 2, 0, w * 0.16);
    flare.addColorStop(0, "rgba(255,236,190,0.9)");
    flare.addColorStop(1, "rgba(255,236,190,0)");
    ctx.fillStyle = flare;
    ctx.fillRect(w / 2 - w * 0.16, -w * 0.08, w * 0.32, w * 0.24);
    void t;
  }

  /* TYP-03: кинетика шрифта — все строки в безопасной зоне между плашками */
  private drawType(ctx: CanvasRenderingContext2D, mp: number, t: number): void {
    const { w } = this;
    const word = "ВЕБ-СТУДИЯ";
    const topLine = this.safeTop + 36;
    const cy = this.wordCY();
    const subLine = this.safeTop + this.availH * 0.86;
    ctx.textBaseline = "middle";

    /* строка студии: буквы влетают (над словом) */
    const lineP = clamp01(mp / 0.34);
    ctx.font = `700 ${Math.min(w * 0.045, 34)}px "JetBrains Mono", monospace`;
    ctx.textAlign = "left";
    const cw = ctx.measureText("М").width * 1.15;
    const startX = w / 2 - (word.length * cw) / 2;
    for (let i = 0; i < word.length; i++) {
      const lp = easeOutBack(clamp01((lineP - i * 0.06) / 0.3));
      if (lp <= 0) continue;
      ctx.globalAlpha = Math.min(1, lp);
      ctx.fillStyle = COLORS.paper;
      ctx.fillText(word[i], startX + i * cw + (1 - lp) * 46, topLine);
    }
    ctx.globalAlpha = 1;

    /* ЦЕХ — удар по центру зоны */
    const hitP = clamp01((mp - 0.36) / 0.22);
    if (hitP > 0) {
      const e = easeOutBack(hitP);
      const fs = this.wordFS();
      ctx.save();
      ctx.translate(w / 2, cy);
      ctx.scale(1.7 - 0.7 * e, 1.7 - 0.7 * e);
      ctx.globalAlpha = Math.min(1, hitP * 2.5);
      ctx.font = `900 ${fs}px "Russo One", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = COLORS.paper;
      ctx.fillText("ЦЕХ", 0, 0);
      ctx.restore();
      /* кольцо удара */
      if (hitP < 1) {
        ctx.strokeStyle = `rgba(206,44,24,${1 - hitP})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(w / 2, cy, fs * (0.35 + hitP * 1.1), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    /* подпись-скрэмбл (под словом) */
    const subP = clamp01((mp - 0.62) / 0.34);
    if (subP > 0) {
      const finalText = "ДИЗАЙН · АРХИВ · ПРИНУЖДЕНИЕ";
      const settled = Math.floor(subP * finalText.length * 1.2);
      let out = "";
      for (let i = 0; i < finalText.length; i++) {
        out += finalText[i] === " " || i < settled ? finalText[i] : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
      }
      ctx.font = `700 ${Math.min(w * 0.03, 20)}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = COLORS.yellow;
      ctx.fillText(out, w / 2, subLine);
      void t;
    }
  }

  /* ---------- звук: Web Audio, только по жесту ---------- */

  toggleSound(): boolean {
    this.soundOn = !this.soundOn;
    if (this.soundOn && !this.ac) {
      try {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        this.ac = Ctor ? new Ctor() : null;
      } catch {
        this.ac = null;
      }
    }
    if (this.soundOn && this.ac && this.ac.state === "suspended") {
      this.ac.resume().catch(() => undefined);
    }
    return this.soundOn;
  }

  private playImpact(): void {
    if (!this.soundOn || !this.ac) return;
    const ac = this.ac;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(130, t0);
    osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.22);
    g.gain.setValueAtTime(0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.32);

    const buf = ac.createBuffer(1, ac.sampleRate * 0.14, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ac.createBufferSource();
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const ng = ac.createGain();
    ng.gain.value = 0.22;
    src.buffer = buf;
    src.connect(lp).connect(ng).connect(ac.destination);
    src.start(t0);
  }

  private playWhoosh(): void {
    if (!this.soundOn || !this.ac || this.marks.whooshPlayed) return;
    this.marks.whooshPlayed = true;
    const ac = this.ac;
    const t0 = ac.currentTime;
    const buf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(380, t0);
    bp.frequency.exponentialRampToValueAtTime(2600, t0 + 0.5);
    bp.Q.value = 1.1;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t0);
  }
}


