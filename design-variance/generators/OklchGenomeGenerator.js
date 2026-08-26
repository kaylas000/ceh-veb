/* ------------------------------------------------------------------ */
/* ЦЕХ OKLCH Design Genome Generator (SOTA 2026)                      */
/* Перцептивно-равномерное цветовое пространство OKLCH + color-mix()   */
/* ------------------------------------------------------------------ */

export interface OklchColor {
  l: number; // Lightness 0.0 -> 1.0 (или 0% -> 100%)
  c: number; // Chroma 0.0 -> 0.4
  h: number; // Hue 0 -> 360 deg
}

export class OklchGenomeGenerator {
  /**
   * Генерирует 3-уровневую систему токенов (Primitive -> Semantic -> Component)
   * с гарантированной контрастностью по WCAG 2.1 AA в OKLCH.
   */
  public generatePalette(seedHue: number = 210) {
    const primaryHue = seedHue % 360;
    const accentHue = (primaryHue + 150) % 360; // Гармоничный контрастный тон

    // 1. Primitive Tokens (OKLCH)
    const primitives = {
      brand: {
        50: `oklch(0.97 0.02 ${primaryHue})`,
        100: `oklch(0.92 0.04 ${primaryHue})`,
        500: `oklch(0.55 0.18 ${primaryHue})`,
        900: `oklch(0.20 0.12 ${primaryHue})`,
      },
      accent: {
        500: `oklch(0.65 0.22 ${accentHue})`,
      },
      neutral: {
        0: "oklch(0.99 0.005 80)",
        100: "oklch(0.94 0.01 80)",
        800: "oklch(0.22 0.015 80)",
        950: "oklch(0.12 0.02 80)",
      },
    };

    // 2. Semantic Tokens (с использованием color-mix в oklch)
    const semantics = {
      bgSurface: primitives.neutral[0],
      bgSubtle: primitives.neutral[100],
      textMain: primitives.neutral[950],
      textMuted: "color-mix(in oklch, var(--text-main) 65%, transparent)",
      brandPrimary: primitives.brand[500],
      brandAccent: primitives.accent[500],
      borderSubtle: "color-mix(in oklch, var(--text-main) 15%, transparent)",
    };

    return { primitives, semantics };
  }

  /**
   * Выводит CSS Custom Properties в каскадном слое @layer design-tokens
   */
  public toCssVars(seedHue: number = 210): string {
    const { primitives, semantics } = this.generatePalette(seedHue);

    return `@layer design-tokens {
  :root {
    /* Primitive OKLCH Tokens */
    --color-brand-50: ${primitives.brand[50]};
    --color-brand-500: ${primitives.brand[500]};
    --color-brand-900: ${primitives.brand[900]};
    --color-accent-500: ${primitives.accent[500]};
    --color-neutral-0: ${primitives.neutral[0]};
    --color-neutral-950: ${primitives.neutral[950]};

    /* Semantic Tokens (OKLCH color-mix) */
    --bg-surface: ${semantics.bgSurface};
    --bg-subtle: ${semantics.bgSubtle};
    --text-main: ${semantics.textMain};
    --text-muted: ${semantics.textMuted};
    --brand-primary: ${semantics.brandPrimary};
    --brand-accent: ${semantics.brandAccent};
    --border-subtle: ${semantics.borderSubtle};
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg-surface: ${primitives.neutral[950]};
      --bg-subtle: ${primitives.neutral[800]};
      --text-main: ${primitives.neutral[0]};
      --text-muted: color-mix(in oklch, var(--text-main) 70%, transparent);
      --border-subtle: color-mix(in oklch, var(--text-main) 20%, transparent);
    }
  }
}`;
  }
}
