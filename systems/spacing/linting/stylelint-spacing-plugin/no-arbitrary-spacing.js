/* Stylelint-правило: spacing-control/no-arbitrary-values.
   Блокирует margin/padding/gap/позиционирование со значениями вне шкалы.
   Подключение: plugins: ["./linting/stylelint-spacing-plugin/no-arbitrary-spacing.js"] */
const APPROVED = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 256];
const PROPS = ["margin","margin-top","margin-bottom","margin-left","margin-right",
  "padding","padding-top","padding-bottom","padding-left","padding-right",
  "gap","row-gap","column-gap","top","bottom","left","right"];
module.exports = function (stylelint) {
  return stylelint.createPlugin("spacing-control/no-arbitrary-values", (enabled) => (root, result) => {
    if (!enabled) return;
    root.walkDecls((decl) => {
      if (!PROPS.includes(decl.prop)) return;
      if (decl.value.includes("var(--") || ["auto","inherit","initial","unset","0"].includes(decl.value)) return;
      decl.value.split(/\s+/).forEach((val) => {
        const m = val.match(/^(-?\d+(?:\.\d+)?)(px|rem)$/);
        if (!m) return;
        const px = Math.abs(parseFloat(m[1]) * (m[2] === "rem" ? 16 : 1));
        if (!APPROVED.includes(Math.round(px))) {
          const nearest = APPROVED.reduce((a, b) => (Math.abs(b - px) < Math.abs(a - px) ? b : a));
          stylelint.utils.report({
            message: `${decl.prop}: ${val} вне шкалы отступов. Используйте var(--spacing-*) или ${nearest}px`,
            node: decl, result, ruleName: "spacing-control/no-arbitrary-values",
          });
        }
      });
    });
  });
};
