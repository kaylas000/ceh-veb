/* ЦЕХ · Universal Loop Engine — generators/mock.mjs
   MockGenerator: детерминированный офлайн-генератор.

   Зачем: (1) self-test и CI без сети и без ключей; (2) --dry-run для проверки
   связки «контекст → валидатор → фидбек» до подключения настоящей модели;
   (3) демонстрация цикла: scripted-ответы могут сначала «ошибиться», потом исправиться.
*/

import { readFileSync, existsSync } from "node:fs";
import { GeneratorError, createArtifact, taskGoal } from "../base.mjs";

export class MockGenerator {
  static requires = Object.freeze(["studioRoot", "projectName"]);

  /**
   * @param {Record<string, any>} [opts]
   * @param {(context: string, state: any) => (string|object)} [opts.scripted] массив строк/объектов или функция
   */
  constructor(opts = {}) {
    this.provider = "mock";
    this.model = String(opts.model ?? "mock-1");
    this.scripted = opts.scripted ?? null;
    this.fromFile = opts.fromFile ?? null;
    this.cycle = Boolean(opts.cycle);
    this.latencyMs = Number(opts.latencyMs ?? 0);
    this.systemPrompt = String(opts.systemPrompt ?? "mock");
    this._calls = 0;
    this._fileCache = null;
  }

  describe() {
    return { provider: "mock", model: this.model, scripted: Array.isArray(this.scripted) ? this.scripted.length : typeof this.scripted };
  }

  /**
   * @param {string} context
   * @param {import("../base.mjs").LoopState} state
   * @returns {Promise<import("../base.mjs").Artifact>}
   */
  async generate(context, state) {
    const started = Date.now();
    if (this.latencyMs > 0) await new Promise((r) => setTimeout(r, this.latencyMs));
    this._calls += 1;

    const content = this._pick(context, state);
    if (content === null || content === undefined) {
      throw new GeneratorError("MockGenerator: нечего вернуть (пустой scripted)", { code: "E-GEN-MOCK" });
    }
    const isMap = typeof content === "object";
    return createArtifact(isMap ? content : String(content), {
      provider: "mock",
      model: this.model,
      iteration: Number(state?.iteration ?? 0),
      temperature: Number(state?.temperature ?? 0),
      latencyMs: Date.now() - started,
      promptChars: String(context ?? "").length,
      calls: this._calls,
      responseFormat: isMap ? "files" : "text",
    });
  }

  _pick(context, state) {
    const iteration = Number(state?.iteration ?? 0);

    if (typeof this.scripted === "function") return this.scripted(context, state);

    if (Array.isArray(this.scripted) && this.scripted.length > 0) {
      const idx = this.cycle ? iteration % this.scripted.length : Math.min(iteration, this.scripted.length - 1);
      const item = this.scripted[idx];
      return typeof item === "function" ? item(context, state) : item;
    }

    if (this.fromFile) {
      if (this._fileCache === null) {
        if (!existsSync(this.fromFile)) throw new GeneratorError(`MockGenerator: файл не найден ${this.fromFile}`, { code: "E-GEN-MOCK" });
        this._fileCache = readFileSync(this.fromFile, "utf8");
      }
      return this._fileCache;
    }

    // Режим по умолчанию: «эхо задачи» — позволяет гонять цикл офлайн и видеть контекст в артефакте.
    return [
      `// mock-артефакт · итерация ${iteration + 1} · temperature ${Number(state?.temperature ?? 0)}`,
      `// задача: ${taskGoal(state?.taskInput).slice(0, 200)}`,
      `// символов контекста: ${String(context ?? "").length}`,
      "export const status = 'mock';",
    ].join("\n");
  }
}

export default MockGenerator;
