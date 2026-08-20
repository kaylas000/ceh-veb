/* ------------------------------------------------------------------ */
/* Компонентные примитивы: Box / Stack / Spacer.                        */
/* spacing-пропсы принимают ТОЛЬКО ключи из шкалы токенов.              */
/* Произвольное значение → console.error + красная рамка (data-атрибут).*/
/* ------------------------------------------------------------------ */

import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { SPACING_SCALE, isApproved } from "../data/spacing";

const VALID_KEYS = new Set(SPACING_SCALE.map((s) => s.key));

function resolveSpacing(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  const key = String(value);
  if (!VALID_KEYS.has(key)) {
    // eslint-disable-next-line no-console
    console.error(
      `❌ SPACING: значение "${key}" не в шкале токенов. Допустимо: ${[...VALID_KEYS].join(", ")}`,
    );
  }
  return `var(--spacing-${key.replace(".", "-")})`;
}

export interface SpacingProps {
  p?: string | number;
  px?: string | number;
  py?: string | number;
  m?: string | number;
  mx?: string | number;
  my?: string | number;
  gap?: string | number;
}

interface BoxProps extends SpacingProps {
  as?: keyof HTMLElementTagNameMap;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  onClick?: () => void;
  title?: string;
}

export const Box = forwardRef<HTMLElement, BoxProps>(function Box(
  { as = "div", p, px, py, m, mx, my, gap, style, children, className, onClick, title },
  ref,
) {
  const invalid = [p, px, py, m, mx, my, gap].some(
    (v) => v !== undefined && !VALID_KEYS.has(String(v)),
  );

  const computed: CSSProperties = {
    ...style,
    padding: resolveSpacing(p),
    paddingLeft: resolveSpacing(px),
    paddingRight: resolveSpacing(px),
    paddingTop: resolveSpacing(py),
    paddingBottom: resolveSpacing(py),
    margin: resolveSpacing(m),
    marginLeft: resolveSpacing(mx),
    marginRight: resolveSpacing(mx),
    marginTop: resolveSpacing(my),
    marginBottom: resolveSpacing(my),
    gap: resolveSpacing(gap),
  };

  const Tag = as as any;
  return (
    <Tag
      ref={ref}
      className={className}
      style={computed}
      data-spacing-invalid={invalid || undefined}
      onClick={onClick}
      title={title}
    >
      {children}
    </Tag>
  );
});

/**
 * Stack — гарантирует одинаковый зазор между детьми.
 * Никаких ручных margin на каждом ребёнке: только gap из шкалы.
 */
export function Stack({
  direction = "vertical",
  gap = "4",
  align = "stretch",
  justify = "flex-start",
  className = "",
  children,
}: {
  direction?: "vertical" | "horizontal";
  gap?: string | number;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  className?: string;
  children: ReactNode;
}) {
  return (
    <Box
      className={className}
      style={{
        display: "flex",
        flexDirection: direction === "vertical" ? "column" : "row",
        alignItems: align,
        justifyContent: justify,
      }}
      gap={gap}
    >
      {children}
    </Box>
  );
}

/** Spacer — явный, видимый в коде разделитель вместо «margin-bottom на всякий случай». */
export function Spacer({ size = "4", axis = "vertical" }: { size?: string | number; axis?: "vertical" | "horizontal" }) {
  const val = resolveSpacing(size) ?? "16px";
  return (
    <div
      aria-hidden="true"
      data-spacer-size={size}
      style={{
        width: axis === "vertical" ? "100%" : val,
        height: axis === "vertical" ? val : "100%",
        flexShrink: 0,
      }}
    />
  );
}

/** Проверка произвольного px-значения (для аудита). */
export const isSpacingApproved = isApproved;
