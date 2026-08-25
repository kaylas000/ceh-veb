/* ------------------------------------------------------------------ */
/* ЦЕХ Code-Video Engine — Deterministic Frame Engine                 */
/* Детерминированный движок виртуализации времени без джиттера кадров */
/* ------------------------------------------------------------------ */

export interface FrameContext {
  /** Абсолютный номер кадра (0, 1, 2, ... N-1) */
  frame: number;
  /** Каноническая частота кадров (по умолчанию 60) */
  fps: number;
  /** Точное математическое время в секундах = frame / fps */
  time: number;
  /** Нормализованный прогресс таймлайна от 0.0 до 1.0 */
  progress: number;
  /** Общее количество кадров на таймлайне */
  totalFrames: number;
  /** Размеры области отрисовки и коэффициент плотности пикселей */
  viewport: {
    w: number;
    h: number;
    dpr: number;
  };
}

export type FrameRenderCallback = (
  ctx: CanvasRenderingContext2D | WebGL2RenderingContext,
  env: FrameContext
) => void;

export interface EngineConfig {
  fps?: number;
  totalFrames?: number;
  durationMs?: number;
  loop?: boolean;
}

export class DeterministicFrameEngine {
  public fps: number;
  public totalFrames: number;
  private currentFrame = 0;
  private isPlaying = false;
  private rafId: number | null = null;
  private renderCallbacks: Set<FrameRenderCallback> = new Set();

  constructor(config: EngineConfig = {}) {
    this.fps = config.fps || 60;
    if (config.totalFrames) {
      this.totalFrames = config.totalFrames;
    } else if (config.durationMs) {
      this.totalFrames = Math.round((config.durationMs / 1000) * this.fps);
    } else {
      this.totalFrames = 204; // ~3.4 сек при 60fps (канон SK-06)
    }
  }

  public subscribe(fn: FrameRenderCallback): () => void {
    this.renderCallbacks.add(fn);
    return () => this.renderCallbacks.delete(fn);
  }

  public getContext(
    frame: number,
    w: number,
    h: number,
    dpr: number = 1
  ): FrameContext {
    const clampedFrame = Math.min(
      Math.max(0, frame),
      this.totalFrames - 1
    );
    return {
      frame: clampedFrame,
      fps: this.fps,
      time: clampedFrame / this.fps,
      progress: this.totalFrames > 1 ? clampedFrame / (this.totalFrames - 1) : 0,
      totalFrames: this.totalFrames,
      viewport: { w, h, dpr },
    };
  }

  /**
   * Воспроизводит один конкретный дискретный кадр
   */
  public renderFrame(
    canvasCtx: CanvasRenderingContext2D | WebGL2RenderingContext,
    frame: number,
    w: number,
    h: number,
    dpr: number = 1
  ): FrameContext {
    const env = this.getContext(frame, w, h, dpr);
    for (const callback of this.renderCallbacks) {
      callback(canvasCtx, env);
    }
    return env;
  }

  /**
   * Воспроизведение в реальном времени с виртуализированным шагом кадра
   */
  public play(
    canvasCtx: CanvasRenderingContext2D | WebGL2RenderingContext,
    w: number,
    h: number,
    dpr: number = 1,
    onComplete?: () => void
  ): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    let lastTime = performance.now();
    const frameInterval = 1000 / this.fps;
    let accumulatedTime = 0;

    const tick = (now: number) => {
      if (!this.isPlaying) return;

      const delta = now - lastTime;
      lastTime = now;
      accumulatedTime += delta;

      while (accumulatedTime >= frameInterval) {
        this.renderFrame(canvasCtx, this.currentFrame, w, h, dpr);
        this.currentFrame++;
        accumulatedTime -= frameInterval;

        if (this.currentFrame >= this.totalFrames) {
          this.isPlaying = false;
          if (onComplete) onComplete();
          return;
        }
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public seek(frame: number): void {
    this.currentFrame = Math.min(Math.max(0, frame), this.totalFrames - 1);
  }

  public reset(): void {
    this.pause();
    this.currentFrame = 0;
  }
}
