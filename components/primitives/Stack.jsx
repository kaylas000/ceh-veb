/* Stack: единый gap из шкалы между детьми — вместо ручных margin. */
import React from "react";
import { Box } from "./Box";
export function Stack({ direction = "vertical", gap = "4", align = "stretch", justify = "flex-start", children, ...rest }) {
  return (
    <Box style={{ display: "flex", flexDirection: direction === "vertical" ? "column" : "row", alignItems: align, justifyContent: justify }} gap={gap} {...rest}>
      {children}
    </Box>
  );
}
