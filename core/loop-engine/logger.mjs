/* ЦЕХ · Universal Loop Engine — logger.mjs
   Структурированный логгер на node:util (никакого print в библиотеке движка).
   Уровни: debug|info|warn|error|silent, переключается LOOP_ENGINE_LOG.
   Пишет в stderr, чтобы stdout оставался под человекочитаемым отчётом (как в scripts/*.mjs). */

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40, silent: 99 });

/**
 * @typedef {Object} Logger
 * @property {(msg: string, meta?: Record<string, any>) => void} debug
 * @property {(msg: string, meta?: Record<string, any>) => void} info
 * @property {(msg: string, meta?: Record<string, any>) => void} warn
 * @property {(msg: string, meta?: Record<string, any>) => void} error
 * @property {(code: string) => Logger} child
 * @property {string} levelName
 */

/**
 * @param {{ name?: string, level?: string, stream?: { write(chunk: string): void } }} [opts]
 * @returns {Logger}
 */
export function createLogger(opts = {}) {
  const name = opts.name ?? "loop-engine";
  const levelName = String(opts.level ?? process.env.LOOP_ENGINE_LOG ?? "info").toLowerCase();
  const threshold = LEVELS[levelName] ?? LEVELS.info;
  const stream = opts.stream ?? process.stderr;

  /**
   * @param {string} level
   * @param {string} msg
   * @param {Record<string, any>} [meta]
   */
  const write = (level, msg, meta) => {
    if ((LEVELS[level] ?? 0) < threshold) return;
    const metaPart =
      meta && Object.keys(meta).length > 0
        ? " · " +
          Object.entries(meta)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
            .join(" ")
        : "";
    stream.write(`[${name}] ${level.toUpperCase().padEnd(5)} ${msg}${metaPart}\n`);
  };

  /** @type {Logger} */
  const logger = {
    debug: (msg, meta) => write("debug", msg, meta),
    info: (msg, meta) => write("info", msg, meta),
    warn: (msg, meta) => write("warn", msg, meta),
    error: (msg, meta) => write("error", msg, meta),
    child: (code) => createLogger({ name: `${name}:${code}`, level: levelName, stream }),
    levelName,
  };
  return logger;
}

/** Молчаливый логгер (для тестов и библиотечного использования без шума). */
export const silentLogger = Object.freeze({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
  levelName: "silent",
});

export { LEVELS as LOG_LEVELS };
