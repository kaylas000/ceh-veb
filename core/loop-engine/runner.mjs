/* ЦЕХ · Universal Loop Engine — runner.mjs
   UniversalLoopRunner: BUILD CONTEXT → GENERATE → VALIDATE → FEEDBACK → повтор.

   Раннер ничего не знает ни про SQL, ни про Python, ни про сайты: только
   Generator + Validator + ContextBuilder + LoopConfig (как и требовал патч).

   Отличия от Python-версии (исправленные баги):
     • температура ставилась генератором из прошлого артефакта (сдвиг на итерацию)
       -> state.temperature задаёт раннер по расписанию ДО вызова генератора;
     • stop_on_first_success игнорировался -> здесь учитывается;
     • RuntimeError при исчерпании итераций -> LoopResult{ok:false} + throwOnFailure по желанию
       (правило цеха: exit-code 0/1 и человекочитаемый отчёт, а не стектрейс);
     • добавлены: wall-clock бюджет, перехват ошибок генератора/валидатора (цикл не рвётся),
       персист итераций в workspace/iterations/ (evidence), хук onIteration.
*/

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  BudgetError,
  ConfigError,
  createFeedback,
  createLoopConfig,
  createLoopState,
  taskGoal,
  temperatureForIteration,
  toPlainJson,
} from "./base.mjs";
import { silentLogger } from "./logger.mjs";
import { humanDuration, humanNumber, truncate } from "./text.mjs";
import { writeArtifact } from "./workspace.mjs";

/** Фатальные ошибки генератора: повторять итерацию бессмысленно. */
const FATAL_GENERATOR_CODES = new Set(["E-GEN-KEY", "E-GEN-AUTH", "E-GEN-CLIENT", "E-GEN-FETCH", "E-GEN-MOCK"]);

export class UniversalLoopRunner {
  /**
   * @param {Object} deps
   * @param {import("./base.mjs").Generator} deps.generator
   * @param {import("./base.mjs").Validator} deps.validator
   * @param {import("./base.mjs").ContextBuilder} deps.contextBuilder
   * @param {Record<string, any>} [deps.config]
   * @param {string|null} [deps.workspaceDir]
   * @param {any} [deps.logger]
   * @param {(payload: any) => (void|Promise<void>)} [deps.onIteration]
   */
  constructor(deps = {}) {
    const { generator, validator, contextBuilder } = deps;
    if (!generator || typeof generator.generate !== "function") {
      throw new ConfigError("раннеру нужен generator с методом generate(context, state)", { code: "E-CONFIG-GENERATOR" });
    }
    if (!validator || typeof validator.validate !== "function") {
      throw new ConfigError("раннеру нужен validator с методом validate(artifact, state)", { code: "E-CONFIG-VALIDATOR" });
    }
    if (!contextBuilder || typeof contextBuilder.build !== "function") {
      throw new ConfigError("раннеру нужен contextBuilder с методом build(task, state, studioRoot)", { code: "E-CONFIG-CONTEXT" });
    }

    this.generator = generator;
    this.validator = validator;
    this.contextBuilder = contextBuilder;
    this.config = createLoopConfig(deps.config ?? {});
    this.workspaceDir = deps.workspaceDir ? resolve(String(deps.workspaceDir)) : null;
    this.logger = deps.logger ?? silentLogger;
    this.onIteration = typeof deps.onIteration === "function" ? deps.onIteration : null;
    this.persistContext = deps.persistContext ?? false;
  }

  describe() {
    return {
      config: { ...this.config },
      generator: this.generator.describe?.() ?? { type: this.generator.constructor?.name },
      validator: this.validator.describe?.() ?? { type: this.validator.constructor?.name },
      contextBuilder: this.contextBuilder.describe?.() ?? { type: this.contextBuilder.constructor?.name },
      workspaceDir: this.workspaceDir,
    };
  }

  /**
   * Прогон цикла.
   * @param {string | Record<string, any>} taskInput
   * @param {string} studioRoot
   * @param {string} [projectName]
   * @returns {Promise<import("./base.mjs").LoopResult>}
   */
  async run(taskInput, studioRoot, projectName = "default") {
    const root = resolve(String(studioRoot ?? process.cwd()));
    const started = Date.now();

    const taskData = normalizeTask(taskInput, projectName);
    const state = createLoopState({ taskInput: taskData, studioRoot: root, projectName: String(taskData.project_name ?? projectName) });
    /** @type {any} */
    state.maxIterations = this.config.maxIterations;
    const goal = taskGoal(taskData);

    if (this.workspaceDir) {
      state.workspaceDir = this.workspaceDir;
      mkdirSync(this.workspaceDir, { recursive: true });
    }

    this.logger.info("цикл запущен", {
      project: state.projectName,
      goal: truncate(goal, 120),
      maxIterations: this.config.maxIterations,
      generator: this.generator.describe?.().model ?? this.generator.constructor?.name,
      validator: this.validator.describe?.().type ?? this.validator.constructor?.name,
    });

    /** @type {import("./base.mjs").Artifact|null} */
    let bestArtifact = null;
    /** @type {import("./base.mjs").Feedback|null} */
    let bestFeedback = null;
    /** @type {import("./base.mjs").Feedback|null} */
    let lastFeedback = null;
    /** @type {number|null} */
    let successIteration = null;
    let reason = "итерации исчерпаны";

    for (let i = 0; i < this.config.maxIterations; i += 1) {
      state.iteration = i;
      state.temperature = temperatureForIteration(this.config.temperatureSchedule, i);
      const iterationStarted = Date.now();
      const label = `[${i + 1}/${this.config.maxIterations}]`;

      // 1. КОНТЕКСТ
      /** @type {string} */
      let context = "";
      try {
        context = String((await this.contextBuilder.build(goal, state, root)) ?? "");
      } catch (error) {
        lastFeedback = feedbackFromError(error, "E-CTX", "сборка контекста упала");
        state.history.push(makeEntry(i, state.temperature, null, lastFeedback, Date.now() - iterationStarted, 0));
        reason = "ошибка сборки контекста (дальнейшие итерации бессмысленны)";
        this.logger.error(`${label} контекст не собран`, { code: lastFeedback.codes.join(","), error: lastFeedback.errors[0] });
        break;
      }

      // 2. ГЕНЕРАЦИЯ
      /** @type {import("./base.mjs").Artifact|null} */
      let artifact = null;
      try {
        artifact = await this.generator.generate(context, state);
        artifact.metadata = { ...artifact.metadata, temperature: state.temperature, iteration: i, contextChars: context.length };
      } catch (error) {
        const code = error?.code ?? "E-GEN";
        lastFeedback = feedbackFromError(error, code, "генератор не выдал артефакт");
        state.history.push(makeEntry(i, state.temperature, null, lastFeedback, Date.now() - iterationStarted, context.length));
        this.logger.error(`${label} генератор упал`, { code, error: truncate(lastFeedback.errors[0] ?? "", 200) });
        if (FATAL_GENERATOR_CODES.has(code)) {
          reason = `фатальная ошибка генератора (${code})`;
          break;
        }
        continue;
      }

      // 3. ВАЛИДАЦИЯ
      try {
        lastFeedback = createFeedback(await this.validator.validate(artifact, state));
      } catch (error) {
        lastFeedback = feedbackFromError(error, error?.code ?? "E-VAL", "валидатор упал (инфраструктурная ошибка)");
      }

      const elapsedMs = Date.now() - iterationStarted;
      const entry = makeEntry(i, state.temperature, artifact, lastFeedback, elapsedMs, context.length);
      state.history.push(entry);

      if (this.config.persistIterations && this.workspaceDir) this._persist(entry, context);

      this.logger.info(`${label} итерация завершена`, {
        ok: lastFeedback.ok,
        codes: lastFeedback.codes.join(","),
        contextChars: humanNumber(context.length),
        duration: humanDuration(elapsedMs),
      });
      if (!lastFeedback.ok) {
        this.logger.warn(`${label} провал`, { errors: truncate((lastFeedback.errors ?? []).join(" | "), 300) });
      }

      if (this.onIteration) {
        try {
          await this.onIteration({ ...entry, contextChars: context.length, state });
        } catch (error) {
          this.logger.warn("хук onIteration упал (цикл продолжается)", { error: String(error?.message ?? error) });
        }
      }

      // 4. УСПЕХ
      if (lastFeedback.ok) {
        bestArtifact = artifact;
        bestFeedback = lastFeedback;
        if (successIteration === null) successIteration = i + 1;
        if (this.config.stopOnFirstSuccess) {
          reason = `успех на итерации ${i + 1}`;
          break;
        }
        this.logger.info(`${label} успех (stop_on_first_success=false — продолжаем по конфигу)`);
      }

      // 5. БЮДЖЕТ
      if (this.config.maxTotalSeconds > 0 && (Date.now() - started) / 1000 > this.config.maxTotalSeconds) {
        reason = `исчерпан бюджет времени ${this.config.maxTotalSeconds}s`;
        this.logger.warn(reason);
        break;
      }
    }

    const ok = Boolean(bestArtifact);
    if (ok && successIteration !== null && !this.config.stopOnFirstSuccess) {
      reason = `успех на итерации ${successIteration} (прогон продолжен по stop_on_first_success=false)`;
    }
    const finalFeedback = ok ? bestFeedback : lastFeedback;

    const result = {
      ok,
      artifact: bestArtifact,
      feedback: finalFeedback,
      state,
      iterations: state.history.length,
      successIteration,
      elapsedMs: Date.now() - started,
      reason: ok ? reason : reason === "итерации исчерпаны" ? `провал после ${state.history.length} итераций` : reason,
    };

    this.logger.info("цикл завершён", {
      ok: result.ok,
      iterations: result.iterations,
      duration: humanDuration(result.elapsedMs),
      reason: result.reason,
    });

    if (!result.ok && this.config.throwOnFailure) {
      const codes = finalFeedback?.codes?.join(",") ?? "E-LOOP";
      const errors = (finalFeedback?.errors ?? []).slice(0, 5);
      throw new BudgetError(
        `цикл не сошёлся за ${this.config.maxIterations} итераций (${codes}): ${errors.join(" | ") || result.reason}`,
        {
          code: codes.includes("E-BUDGET") ? "E-BUDGET" : "E-LOOP-EXHAUSTED",
          details: { iterations: result.iterations, codes: finalFeedback?.codes ?? [] },
        },
      );
    }

    return result;
  }

  /** Кладёт артефакт + фидбек итерации в workspace/iterations/iter-NN/. */
  _persist(entry, context) {
    const dir = join(/** @type {string} */ (this.workspaceDir), "iterations", `iter-${String(entry.iteration + 1).padStart(2, "0")}`);
    try {
      mkdirSync(dir, { recursive: true });
      if (entry.artifact) {
        writeArtifact(entry.artifact, dir, { defaultFilename: "artifact.txt", clean: true });
      }
      writeFileSync(
        join(dir, "feedback.json"),
        `${JSON.stringify({ iteration: entry.iteration, temperature: entry.temperature, elapsedMs: entry.elapsedMs, feedback: toPlainJson(entry.feedback) }, null, 2)}\n`,
        "utf8",
      );
      if (this.persistContext) writeFileSync(join(dir, "context.txt"), truncate(context, 400000), "utf8");
    } catch (error) {
      this.logger.warn("не удалось сохранить итерацию", { dir, error: String(error?.message ?? error) });
    }
  }
}

/** Приводит task к объекту {goal, project_name, …}. */
function normalizeTask(taskInput, projectName) {
  if (typeof taskInput === "string") return { goal: taskInput.trim(), project_name: projectName };
  if (taskInput && typeof taskInput === "object") {
    const copy = { ...taskInput };
    if (!("goal" in copy) && !("task" in copy)) copy.goal = "";
    copy.project_name = copy.project_name ?? projectName;
    return copy;
  }
  return { goal: String(taskInput ?? ""), project_name: projectName };
}

function makeEntry(iteration, temperature, artifact, feedback, elapsedMs, contextChars) {
  return { iteration, temperature, artifact, feedback, elapsedMs, contextChars };
}

function feedbackFromError(error, code, fallbackMessage) {
  const message = error?.message ? String(error.message) : String(error ?? fallbackMessage);
  return createFeedback({
    ok: false,
    errors: [`${fallbackMessage}: ${truncate(message, 800)}`],
    codes: [code],
    raw: error?.details ?? null,
    metrics: { errorName: error?.name ?? "Error" },
  });
}

/** Существует ли workspace (для внешних вызовов). */
export function workspaceExists(dir) {
  return Boolean(dir) && existsSync(resolve(String(dir)));
}

export default UniversalLoopRunner;
