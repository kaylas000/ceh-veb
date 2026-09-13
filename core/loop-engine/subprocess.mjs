/* ЦЕХ · Universal Loop Engine — subprocess.mjs
   Обёртка над node:child_process для валидаторов.

   Правила:
     • shell: false — аргументы передаются массивом, инъекция команд невозможна;
     • timeout + SIGKILL — сбежавший pytest/vite не держит цикл вечно;
     • вывод обрезается — иначе Feedback раздует контекст следующей итерации.
*/

import { spawnSync } from "node:child_process";

/**
 * @typedef {Object} CommandResult
 * @property {boolean} ok         exit code 0 и не было таймаута
 * @property {number|null} exitCode
 * @property {string} stdout
 * @property {string} stderr
 * @property {boolean} timedOut
 * @property {string|null} signal
 * @property {number} durationMs
 * @property {string[]} argv
 * @property {string|null} error  инфраструктурная ошибка (ENOENT и т.п.)
 */

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string, timeoutMs?: number, env?: Record<string,string>, maxOutputChars?: number, input?: string }} [opts]
 * @returns {CommandResult}
 */
export function runCommand(command, args = [], opts = {}) {
  const timeoutMs = Number(opts.timeoutMs ?? 60000);
  const maxOutputChars = Number(opts.maxOutputChars ?? 32000);
  const argv = [command, ...args.map(String)];
  const started = Date.now();

  /** @type {import("node:child_process").SpawnSyncReturns<string>} */
  let res;
  try {
    res = spawnSync(command, args.map(String), {
      cwd: opts.cwd,
      timeout: timeoutMs > 0 ? timeoutMs : undefined,
      killSignal: "SIGKILL",
      encoding: "utf8",
      shell: false,
      env: childEnv(opts.env),
      input: opts.input,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (e) {
    return {
      ok: false,
      exitCode: null,
      stdout: "",
      stderr: "",
      timedOut: false,
      signal: null,
      durationMs: Date.now() - started,
      argv,
      error: `не удалось запустить: ${e?.message ?? e}`,
    };
  }

  const timedOut = res?.error?.code === "ETIMEDOUT" || res?.signal === "SIGKILL" && res?.error?.code === "ETIMEDOUT";
  const infraError = res?.error && res.error.code !== "ETIMEDOUT" ? `${res.error.code ?? ""} ${res.error.message ?? ""}`.trim() : null;

  return {
    ok: !timedOut && !infraError && res.status === 0,
    exitCode: typeof res?.status === "number" ? res.status : null,
    stdout: clip(res?.stdout ?? "", maxOutputChars),
    stderr: clip(res?.stderr ?? "", maxOutputChars),
    timedOut: Boolean(timedOut),
    signal: res?.signal ?? null,
    durationMs: Date.now() - started,
    argv,
    error: infraError ?? (timedOut ? `таймаут ${timeoutMs}ms` : null),
  };
}

/**
 * Окружение для дочернего процесса.
 *
 * Обязательно вычищаем NODE_TEST_CONTEXT: если цикл запущен из-под `node --test`,
 * дочерний `node --test`/pytest наследует роль «child» и уводит весь вывод в поток
 * родителя — валидатор получил бы пустой stdout и ложный вердикт.
 * @param {Record<string, string> | undefined} extra
 */
export function childEnv(extra) {
  const env = { ...process.env, ...(extra ?? {}) };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_TEST_FRAME;
  return env;
}

/** Доступен ли исполняемый файл в PATH (для ruff/pytest/python3). */
export function hasExecutable(command, probeArgs = ["--version"]) {
  const res = runCommand(command, probeArgs, { timeoutMs: 8000 });
  return !res.error && res.exitCode !== null;
}

/** Имя python-интерпретатора: python3 → python (первый доступный). */
export function resolvePythonBin(preferred = ["python3", "python"]) {
  for (const candidate of preferred) {
    if (hasExecutable(candidate)) return candidate;
  }
  return null;
}

function clip(text, max) {
  const src = String(text ?? "");
  if (src.length <= max) return src;
  const head = Math.floor(max * 0.7);
  const tail = max - head - 24;
  return `${src.slice(0, head)}\n…[обрезано ${src.length - max} симв.]…\n${src.slice(src.length - Math.max(0, tail))}`;
}
