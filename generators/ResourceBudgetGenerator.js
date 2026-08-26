/* ------------------------------------------------------------------ */
/* ЦЕХ ResourceBudgetGenerator.js — SRI Hasher & Performance Budget    */
/* Node ≥18, ноль npm-зависимостей                                    */
/* ------------------------------------------------------------------ */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

export class ResourceBudgetGenerator {
  /**
   * Вычисляет Subresource Integrity (SRI) sha384 хэш для безопасности активов
   */
  static generateSriHash(fileContent) {
    const hash = createHash("sha384").update(fileContent).digest("base64");
    return `sha384-${hash}`;
  }

  /**
   * Проверяет файл стиля или скрипта против весового бюджета (Q-10: Bundle ≤300KB)
   */
  static checkBudget(filePath, maxKb = 300) {
    if (!existsSync(filePath)) {
      return { ok: false, sizeKb: 0, msg: "Файл не найден" };
    }

    const content = readFileSync(filePath);
    const sizeKb = Number((content.length / 1024).toFixed(2));
    const ok = sizeKb <= maxKb;

    return {
      ok,
      sizeKb,
      sri: this.generateSriHash(content),
      msg: ok
        ? `Размер ${sizeKb}KB находится в бюджете (≤${maxKb}KB)`
        : `Превышен бюджет: ${sizeKb}KB > ${maxKb}KB`,
    };
  }
}
