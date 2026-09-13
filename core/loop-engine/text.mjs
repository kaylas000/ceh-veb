/* ЦЕХ · Universal Loop Engine — text.mjs
   Текстовые утилиты: снятие code-fences, извлечение JSON, безопасные пути,
   обрезка по бюджету, snake_case → camelCase для конфигов.
   Node ≥18, ноль npm-зависимостей. */

import { resolve, relative, sep, isAbsolute } from "node:path";

/**
 * Снимает внешние code-fences, если ВЕСЬ текст — один огороженный блок.
 * LLM почти всегда оборачивает код в ```lang … ``` — валидатор от этого падает.
 * @param {string} text
 * @returns {string}
 */
export function stripCodeFences(text) {
  if (typeof text !== "string") return "";
  const trimmed = text.trim();
  const m = /^```[a-zA-Z0-9_+-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```$/.exec(trimmed);
  if (m) return m[1].replace(/^\s*\n/, "").replace(/\n\s*$/, "");
  // вариант без закрывающего fence (обрыв вывода)
  const open = /^```[a-zA-Z0-9_+-]*[ \t]*\r?\n([\s\S]*)$/.exec(trimmed);
  if (open && !open[1].includes("```")) return open[1].trim();
  return trimmed;
}

/**
 * Достаёт первый JSON-объект/массив из текста (LLM любит пояснения вокруг JSON).
 * @param {string} text
 * @returns {string|null} JSON-строка или null
 */
export function extractJson(text) {
  const src = stripCodeFences(String(text ?? ""));
  if (!src) return null;
  const firstObj = src.indexOf("{");
  const firstArr = src.indexOf("[");
  const candidates = [firstObj, firstArr].filter((i) => i >= 0).sort((a, b) => a - b);
  for (const start of candidates) {
    const open = src[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < src.length; i += 1) {
      const ch = src[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === open) depth += 1;
      else if (ch === close) {
        depth -= 1;
        if (depth === 0) return src.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Безопасный относительный путь внутри root.
 * Защита от `../../etc/passwd` и абсолютных путей в карте файлов артефакта.
 * @param {string} candidate
 * @param {string} root
 * @returns {string} абсолютный путь внутри root
 * @throws {Error} при попытке выйти за root
 */
export function safeResolveInside(candidate, root) {
  const raw = String(candidate ?? "").trim();
  if (!raw) throw new Error("пустой путь файла");
  if (isAbsolute(raw) || /^[a-zA-Z]:[\\/]/.test(raw)) throw new Error(`абсолютный путь запрещён: ${raw}`);
  if (raw.includes("\0")) throw new Error("путь содержит NUL");
  const rootResolved = resolve(root);
  const target = resolve(rootResolved, raw);
  if (target !== rootResolved && !target.startsWith(rootResolved + sep)) {
    throw new Error(`путь вне рабочей директории: ${raw}`);
  }
  return target;
}

/** Относительный путь в posix-нотации (для отчётов и логов). */
export function toRelPosix(absPath, root) {
  const rel = relative(resolve(root), resolve(absPath));
  return rel.split(sep).join("/");
}

/**
 * Обрезка строки по бюджету.
 * @param {string} text
 * @param {number} max
 * @param {{ mode?: 'head'|'middle', marker?: string }} [opts]
 */
export function truncate(text, max, opts = {}) {
  const src = String(text ?? "");
  if (!Number.isFinite(max) || max <= 0 || src.length <= max) return src;
  const marker = opts.marker ?? "…[обрезано]";
  if (opts.mode === "middle") {
    const half = Math.max(0, Math.floor((max - marker.length) / 2));
    return `${src.slice(0, half)}${marker}${src.slice(src.length - half)}`;
  }
  return `${src.slice(0, Math.max(0, max - marker.length))}${marker}`;
}

/** `1234567` → `1 234 567` (неразрывные пробелы не используем — отчёт в терминал). */
export function humanNumber(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** `1536` → `1.5s`, `45000` → `45.0s`, `950` → `950ms`. */
export function humanDuration(ms) {
  const n = Number(ms ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "0ms";
  if (n < 1000) return `${Math.round(n)}ms`;
  return `${(n / 1000).toFixed(1)}s`;
}

/** Рекурсивно переименовывает snake_case-ключи объекта в camelCase. */
export function snakeToCamelKeys(value) {
  if (Array.isArray(value)) return value.map(snakeToCamelKeys);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  /** @type {Record<string, any>} */
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    const camel = key.replace(/_([a-z0-9])/g, (_m, c) => c.toUpperCase());
    out[camel] = snakeToCamelKeys(val);
    if (camel !== key) out[key] = out[camel]; // snake_case-алиас: конфиги читаются в обеих нотациях
  }
  return out;
}

/** Глубокая копия JSON-совместимых данных (функции/undefined отбрасываются). */
export function deepCopyJson(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(deepCopyJson);
  /** @type {Record<string, any>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "function" || typeof v === "undefined") continue;
    out[k] = deepCopyJson(v);
  }
  return out;
}

/**
 * Разбирает артефакт из сырого ответа модели.
 * @param {string} raw
 * @param {{ format?: 'text'|'json'|'files', language?: string }} [opts]
 * @returns {{ content: string | Record<string, string>, format: 'text'|'json'|'files' }}
 */
export function parseArtifactContent(raw, opts = {}) {
  const format = opts.format ?? "text";
  const text = stripCodeFences(String(raw ?? ""));
  if (format === "text") return { content: text, format };
  const jsonSource = extractJson(text);
  if (!jsonSource) throw new Error("в ответе не найден JSON-блок");
  const parsed = JSON.parse(jsonSource);
  if (format === "json") return { content: parsed, format };
  // format === 'files'
  const files = parsed?.files ?? parsed;
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw new Error('карта файлов должна быть объектом {"путь": "содержимое"} или {"files": {…}}');
  }
  /** @type {Record<string, string>} */
  const map = {};
  for (const [path, content] of Object.entries(files)) {
    if (typeof content !== "string") throw new Error(`содержимое файла ${path} не строка`);
    map[path] = content;
  }
  return { content: map, format: "files" };
}
