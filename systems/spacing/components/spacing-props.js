/* Единый источник допустимых значений (зеркало tokens/spacing.tokens.json). */
export const spacingScale = {
  "0": "0px",
  "1": "4px",
  "2": "8px",
  "3": "12px",
  "4": "16px",
  "5": "20px",
  "6": "24px",
  "8": "32px",
  "10": "40px",
  "12": "48px",
  "16": "64px",
  "20": "80px",
  "24": "96px",
  "32": "128px",
  "40": "160px",
  "48": "192px",
  "64": "256px",
  "0.5": "2px",
  "1.5": "6px"
};
export const isSpacingKey = (v) => Object.prototype.hasOwnProperty.call(spacingScale, String(v));
