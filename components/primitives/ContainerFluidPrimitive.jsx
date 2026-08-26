/* ------------------------------------------------------------------ */
/* ЦЕХ Container Queries Fluid Component Primitive (SOTA 2026)        */
/* ------------------------------------------------------------------ */

import React from "react";

export function ContainerFluidPrimitive({ children, className = "", as: Component = "div", ...props }) {
  return (
    <Component
      className={`container-card-ctx ${className}`}
      style={{
        width: "100%",
        display: "block",
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
