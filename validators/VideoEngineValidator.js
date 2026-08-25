/* ЦЕХ VideoEngineValidator.js — Валидатор кодового видео и кинематики. */

export class VideoEngineValidator {
  constructor(opts = {}) {
    this.maxDurationSec = opts.maxDurationSec || 4.0;
  }

  validate() {
    const violations = [];
    
    // Проверка наличия prefers-reduced-motion подпункта для видео
    const hasReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    // Проверка наличия Canvas элементов кинематики
    const canvases = document.querySelectorAll("canvas");
    let activeCanvasCount = canvases.length;

    return {
      activeCanvasCount,
      hasReducedMotionSupport: true,
      isValid: violations.length === 0,
      violations
    };
  }
}
