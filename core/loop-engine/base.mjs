/* ЦЕХ · Universal Loop Engine — base.mjs
   Контракты цикла: Artifact, Feedback, LoopState, LoopConfig + ошибки.
   Node ≥18, ноль npm-зависимостей, только встроенные модули.

   Движок НЕ импортирует ничего из src/, scripts/, validators/ на уровне модуля:
   все связи — через аргументы конструкторов (DI) и child_process в рантайме.
   Это гарантирует, что сборка сайта (vite build / tsc --noEmit) не затрагивается.

   Соответствие Python-патчу:
     pydantic BaseModel  -> plain object + фабрика с валидацией (createFeedback/createArtifact)
     Protocol[T]         -> JSDoc @typedef (в JS типизация структурная от природы)
     dataclass           -> фабрика createLoopConfig/createLoopState
     Feedback.success    -> Feedback.ok (термин отчётов validate.mjs: «OK/FAIL»)
*/

/**
 * Артефакт — то, что произвёл генератор.
 * `content`: строка (код/текст/JSON) либо карта файлов `{ "site/index.html": "..." }`.
 * @typedef {Object} Artifact
 * @property {string | Record<string, string>} content
 * @property {Record<string, any>} metadata
 */

/**
 * Feedback — вердикт валидатора.
 * @typedef {Object} Feedback
 * @property {boolean} ok            успех (в Python-патче: `success`)
 * @property {string[]} errors       человекочитаемые ошибки (уходят обратно в контекст)
 * @property {string[]} codes        машинные коды (E-SYN, V-04, B-01, E-SCHEMA…)
 * @property {any} raw               сырой вывод валидатора (обрезанный)
 * @property {Record<string, any>} metrics  метрики (длительность, exit code, счёт…)
 */

/**
 * Запись истории одной итерации.
 * @typedef {Object} HistoryEntry
 * @property {number} iteration
 * @property {number} temperature
 * @property {Artifact} artifact
 * @property {Feedback} feedback
 * @property {number} elapsedMs
 * @property {number} contextChars
 */

/**
 * Состояние цикла (mutable, передаётся в генератор/валидатор/билдер контекста).
 * @typedef {Object} LoopState
 * @property {number} iteration
 * @property {number} temperature
 * @property {HistoryEntry[]} history
 * @property {any} taskInput
 * @property {string} studioRoot
 * @property {string} projectName
 * @property {string | null} workspaceDir
 * @property {number} startedAtMs
 */

/**
 * Протоколы (structural subtyping — наследование не навязывается):
 * @typedef {{ generate(context: string, state: LoopState): (Promise<Artifact>|Artifact) }} Generator
 * @typedef {{ validate(artifact: Artifact, state: LoopState): (Promise<Feedback>|Feedback) }} Validator
 * @typedef {{ build(task: string, state: LoopState, studioRoot: string): (Promise<string>|string) }} ContextBuilder
 */

/**
 * Итог прогона (в отличие от Python-патча не бросаем исключение по умолчанию:
 * репозиторий живёт по правилу «exit-code 0/1 + человекочитаемый отчёт»).
 * @typedef {Object} LoopResult
 * @property {boolean} ok
 * @property {Artifact | null} artifact
 * @property {Feedback | null} feedback
 * @property {LoopState} state
 * @property {number} iterations
 * @property {number} elapsedMs
 * @property {string} reason
 */

/** Базовая ошибка движка. Всегда несёт машинный `code`. */
export class LoopError extends Error {
  /**
   * @param {string} message
   * @param {{ code?: string, cause?: unknown, details?: Record<string, any> }} [opts]
   */
  constructor(message, opts = {}) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = new.target.name;
    /** @type {string} */
    this.code = opts.code ?? "E-LOOP";
    /** @type {Record<string, any>} */
    this.details = opts.details ?? {};
  }
}

/** Ошибка конфигурации/фабрики (неверный тип, отсутствующий ключ, кривой YAML). */
export class ConfigError extends LoopError {
  constructor(message, opts = {}) {
    super(message, { code: opts.code ?? "E-CONFIG", ...opts });
  }
}

/** Ошибка генератора (нет ключа, таймаут, 4xx/5xx, битый ответ). */
export class GeneratorError extends LoopError {
  constructor(message, opts = {}) {
    super(message, { code: opts.code ?? "E-GEN", ...opts });
  }
}

/** Ошибка валидатора (инфраструктурная: не запустился subprocess, битая схема…). */
export class ValidatorError extends LoopError {
  constructor(message, opts = {}) {
    super(message, { code: opts.code ?? "E-VAL", ...opts });
  }
}

/** Исчерпан бюджет цикла (итерации или wall-clock). */
export class BudgetError extends LoopError {
  constructor(message, opts = {}) {
    super(message, { code: opts.code ?? "E-BUDGET", ...opts });
  }
}

/** Значения по умолчанию для LoopConfig. */
export const DEFAULT_LOOP_CONFIG = Object.freeze({
  maxIterations: 5,
  temperatureSchedule: Object.freeze([0.3, 0.1, 0.0]),
  stopOnFirstSuccess: true,
  /** Лимит контекста в символах (~4 символа на токен → 120k ≈ 30k токенов). */
  contextCharLimit: 120_000,
  /** Сколько последних провалов рендерить в блок «PREVIOUS ATTEMPT FAILED». */
  historyWindow: 1,
  /** Общий wall-clock бюджет прогона, сек. 0 = без лимита. */
  maxTotalSeconds: 1800,
  /** Бросить LoopError вместо возврата LoopResult{ok:false}. */
  throwOnFailure: false,
  /** Писать артефакты/фидбеки итераций в workspace/iterations/. */
  persistIterations: true,
});

/**
 * Читает первое присутствующее поле (поддержка snake_case из YAML и camelCase из JS).
 * @param {Record<string, any> | null | undefined} obj
 * @param {string[]} names
 * @param {any} [fallback]
 */
export function getFirst(obj, names, fallback = undefined) {
  if (!obj || typeof obj !== "object") return fallback;
  for (const name of names) {
    if (obj[name] !== undefined && obj[name] !== null) return obj[name];
  }
  return fallback;
}

/**
 * Температура i-й итерации: последнее значение расписания «залипает».
 * (В Python-патче расписание читалось генератором из предыдущего артефакта —
 *  это давало сдвиг на одну итерацию; здесь температуру ставит раннер.)
 * @param {number[]} schedule
 * @param {number} iteration
 * @returns {number}
 */
export function temperatureForIteration(schedule, iteration) {
  const list = Array.isArray(schedule) && schedule.length > 0 ? schedule : [DEFAULT_LOOP_CONFIG.temperatureSchedule[0]];
  const idx = Math.min(Math.max(iteration, 0), list.length - 1);
  return Number(list[idx]);
}

/**
 * @param {string | Record<string, string>} content
 * @param {Record<string, any>} [metadata]
 * @returns {Artifact}
 */
export function createArtifact(content, metadata = {}) {
  if (content === null || content === undefined) {
    throw new LoopError("Artifact.content не может быть пустым", { code: "E-ARTIFACT" });
  }
  const isMap = typeof content === "object";
  if (!isMap && typeof content !== "string") {
    throw new LoopError(`Artifact.content: ожидалась строка или карта файлов, получено ${typeof content}`, {
      code: "E-ARTIFACT",
    });
  }
  return {
    content,
    metadata: { ...metadata, kind: isMap ? "files" : "text" },
  };
}

/**
 * @param {Partial<Feedback> & { ok: boolean }} input
 * @returns {Feedback}
 */
export function createFeedback(input) {
  const errors = (input.errors ?? []).map((e) => (typeof e === "string" ? e : String(e))).filter(Boolean);
  const codes = (input.codes ?? []).map((c) => String(c)).filter(Boolean);
  return {
    ok: Boolean(input.ok),
    errors,
    codes: codes.length > 0 ? codes : [input.ok ? "OK" : "E-FAIL"],
    raw: input.raw === undefined ? null : input.raw,
    metrics: { ...(input.metrics ?? {}) },
  };
}

/**
 * Нормализует пользовательский конфиг цикла.
 * @param {Record<string, any>} [input]
 * @returns {Required<typeof DEFAULT_LOOP_CONFIG>}
 */
export function createLoopConfig(input = {}) {
  const maxIterations = Number(getFirst(input, ["maxIterations", "max_iterations"], DEFAULT_LOOP_CONFIG.maxIterations));
  if (!Number.isFinite(maxIterations) || maxIterations < 1) {
    throw new ConfigError(`loop.max_iterations должен быть целым ≥ 1, получено: ${input?.max_iterations ?? input?.maxIterations}`);
  }

  const rawSchedule = getFirst(input, ["temperatureSchedule", "temperature_schedule"], [...DEFAULT_LOOP_CONFIG.temperatureSchedule]);
  const temperatureSchedule = (Array.isArray(rawSchedule) ? rawSchedule : [rawSchedule]).map((t) => {
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0 || n > 2) throw new ConfigError(`loop.temperature_schedule: недопустимая температура ${t}`);
    return n;
  });

  const contextCharLimit = Number(
    getFirst(input, ["contextCharLimit", "context_char_limit", "contextTokenLimit", "context_token_limit"], DEFAULT_LOOP_CONFIG.contextCharLimit),
  );

  return {
    maxIterations: Math.floor(maxIterations),
    temperatureSchedule: temperatureSchedule.length > 0 ? temperatureSchedule : [0.3],
    stopOnFirstSuccess: Boolean(getFirst(input, ["stopOnFirstSuccess", "stop_on_first_success"], DEFAULT_LOOP_CONFIG.stopOnFirstSuccess)),
    contextCharLimit: Number.isFinite(contextCharLimit) && contextCharLimit > 0 ? Math.floor(contextCharLimit) : DEFAULT_LOOP_CONFIG.contextCharLimit,
    historyWindow: Math.max(0, Math.floor(Number(getFirst(input, ["historyWindow", "history_window"], DEFAULT_LOOP_CONFIG.historyWindow)))),
    maxTotalSeconds: Math.max(0, Number(getFirst(input, ["maxTotalSeconds", "max_total_seconds"], DEFAULT_LOOP_CONFIG.maxTotalSeconds)) || 0),
    throwOnFailure: Boolean(getFirst(input, ["throwOnFailure", "throw_on_failure"], DEFAULT_LOOP_CONFIG.throwOnFailure)),
    persistIterations: Boolean(getFirst(input, ["persistIterations", "persist_iterations"], DEFAULT_LOOP_CONFIG.persistIterations)),
  };
}

/**
 * @param {{ taskInput?: any, studioRoot?: string, projectName?: string, workspaceDir?: string|null, iteration?: number }} [init]
 * @returns {LoopState}
 */
export function createLoopState(init = {}) {
  return {
    iteration: init.iteration ?? 0,
    temperature: 0,
    history: [],
    taskInput: init.taskInput ?? null,
    studioRoot: init.studioRoot ?? "",
    projectName: init.projectName ?? "default",
    workspaceDir: init.workspaceDir ?? null,
    startedAtMs: Date.now(),
  };
}

/**
 * Цель задачи в человекочитаемом виде (taskInput может быть строкой или объектом).
 * @param {any} taskInput
 * @returns {string}
 */
export function taskGoal(taskInput) {
  if (typeof taskInput === "string") return taskInput;
  if (taskInput && typeof taskInput === "object") {
    const goal = getFirst(taskInput, ["goal", "task", "brief", "prompt"]);
    if (typeof goal === "string" && goal.trim()) return goal.trim();
    try {
      return JSON.stringify(taskInput, null, 2);
    } catch {
      return String(taskInput);
    }
  }
  return String(taskInput ?? "");
}

/** JSON-безопасная копия (для записи истории на диск). */
export function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}
