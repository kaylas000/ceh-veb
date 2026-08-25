/* Box: spacing-пропсы принимают только ключи шкалы (см. tokens/spacing.tokens.json).
   Произвольное значение -> console.error + data-spacing-invalid (красная рамка). */
import React from "react";
import { spacingScale, isSpacingKey } from "../spacing-props";
const cssVar = (k) => `var(--spacing-${String(k).replace(".", "-")})`;
export const Box = React.forwardRef(({ as: T = "div", p, px, py, m, mx, my, gap, style = {}, children, ...rest }, ref) => {
  const invalid = [p, px, py, m, mx, my, gap].some((v) => v !== undefined && !isSpacingKey(v));
  const s = { ...style,
    padding: p !== undefined ? cssVar(p) : undefined,
    paddingLeft: px !== undefined ? cssVar(px) : undefined, paddingRight: px !== undefined ? cssVar(px) : undefined,
    paddingTop: py !== undefined ? cssVar(py) : undefined, paddingBottom: py !== undefined ? cssVar(py) : undefined,
    margin: m !== undefined ? cssVar(m) : undefined,
    marginLeft: mx !== undefined ? cssVar(mx) : undefined, marginRight: mx !== undefined ? cssVar(mx) : undefined,
    marginTop: my !== undefined ? cssVar(my) : undefined, marginBottom: my !== undefined ? cssVar(my) : undefined,
    gap: gap !== undefined ? cssVar(gap) : undefined };
  if (invalid) console.error("SPACING: значение вне шкалы. Допустимо:", Object.keys(spacingScale).join(", "));
  return <T ref={ref} style={s} data-spacing-invalid={invalid || undefined} {...rest}>{children}</T>;
});
