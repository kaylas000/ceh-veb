/* Автоматически учитывает notch/home-indicator для fixed-элементов */
import React from "react";
const SIDES = { top: "--safe-top", bottom: "--safe-bottom", left: "--safe-left", right: "--safe-right" };
export function SafeAreaWrapper({ children, sides = ["top", "bottom"], as: T = "div", style = {}, ...rest }) {
  const s = { ...style };
  sides.forEach((side) => { s["padding" + side[0].toUpperCase() + side.slice(1)] = "var(" + SIDES[side] + ")"; });
  return <T style={s} {...rest}>{children}</T>;
}
