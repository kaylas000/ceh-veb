/* Spacer: явный разделитель вместо "margin-bottom на всякий случай". */
import React from "react";
export function Spacer({ size = "4", axis = "vertical" }) {
  const v = `var(--spacing-${String(size).replace(".", "-")})`;
  return <div aria-hidden data-spacer-size={size} style={{ width: axis === "vertical" ? "100%" : v, height: axis === "vertical" ? v : "100%", flexShrink: 0 }} />;
}
