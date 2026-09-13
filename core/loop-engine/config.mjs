/* ЦЕХ · Universal Loop Engine — config.mjs
   Загрузка декларативного конфига цикла: JSON + подмножество YAML. Ноль зависимостей
   (в Python-патче здесь был PyYAML — в цехе npm-зависимости запрещены, поэтому
   парсер свой, детерминированный и покрытый тестами).

   Поддерживается: вложенные карты по отступам, последовательности («- item»,
   «- key: value»), flow-списки [a, b], flow-карты {a: 1}, блочные скаляры | и >,
   комментарии #, кавычки " и ', числа/булевы/null.
   Не поддерживается (осознанно): якоря/алиасы, многострочные ключи, сложные теги.

   Отладка: node core/loop-engine/config.mjs <путь-к-конфигу> — печатает разобранный JSON.
*/

import { existsSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ConfigError, getFirst } from "./base.mjs";
import { snakeToCamelKeys } from "./text.mjs";

/**
 * @typedef {{ indent: number, text: string, lineNo: number }} YamlNode
 */

/** Удаляет комментарий `#…` вне кавычек. */
function stripComment(line) {
  let single = false;
  let double = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (single) {
      if (ch === "'") {
        if (line[i + 1] === "'") i += 1;
        else single = false;
      }
      continue;
    }
    if (double) {
      if (ch === "\\") i += 1;
      else if (ch === '"') double = false;
      continue;
    }
    if (ch === "'") {
      single = true;
      continue;
    }
    if (ch === '"') {
      double = true;
      continue;
    }
    if (ch === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

/** Разбивает flow-последовательность/карту по запятым верхнего уровня. */
function splitFlow(input) {
  /** @type {string[]} */
  const parts = [];
  let depth = 0;
  let quote = "";
  let current = "";
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote) {
      current += ch;
      if (ch === "\\" && quote === '"') {
        current += input[i + 1] ?? "";
        i += 1;
      } else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "[" || ch === "{") depth += 1;
    if (ch === "]" || ch === "}") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim() !== "") parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

/** Снимает кавычки с ключа. */
function unquoteKey(key) {
  const k = String(key ?? "").trim();
  if (k.length >= 2 && ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'")))) {
    return k.slice(1, -1);
  }
  return k;
}

const KEY_RE = /^("(?:[^"\\]|\\.)*"|'[^']*'|[^:\s][^:]*):(?:\s+([\s\S]*))?$/;
const BLOCK_SCALAR_STYLES = new Set(["|", "|-", "|+", ">", ">-", ">+"]);

/**
 * Парсер подмножества YAML: текст → JS-значение.
 * @param {string} text
 * @returns {any}
 */
export function parseSimpleYaml(text) {
  const rawLines = String(text ?? "").split(/\r?\n/);
  /** @type {YamlNode[]} */
  const nodes = [];

  rawLines.forEach((rawLine, idx) => {
    const line = stripComment(rawLine);
    if (line.trim() === "" || line.trim() === "---" || line.trim() === "...") return;
    const indentStr = line.slice(0, line.length - line.trimStart().length);
    if (indentStr.includes("\t")) {
      throw new ConfigError(`YAML строка ${idx + 1}: табуляция в отступе запрещена (только пробелы)`, { code: "E-CONFIG-YAML" });
    }
    nodes.push({ indent: indentStr.length, text: line.trim(), lineNo: idx + 1 });
  });

  const fail = (message, node) => {
    throw new ConfigError(`YAML строка ${node?.lineNo ?? "?"}: ${message}`, { code: "E-CONFIG-YAML" });
  };

  /** @param {string} src @param {YamlNode} node */
  const parseScalar = (src, node) => {
    const s = String(src ?? "").trim();
    if (s === "" || s === "~" || s === "null" || s === "Null" || s === "NULL") return null;
    if (s === "true" || s === "True" || s === "TRUE" || s === "yes" || s === "on") return true;
    if (s === "false" || s === "False" || s === "FALSE" || s === "no" || s === "off") return false;
    if (s.startsWith("[") && s.endsWith("]")) return splitFlow(s.slice(1, -1)).map((item) => parseScalar(item, node));
    if (s.startsWith("{") && s.endsWith("}")) {
      /** @type {Record<string, any>} */
      const map = {};
      for (const item of splitFlow(s.slice(1, -1))) {
        const colon = item.indexOf(":");
        if (colon < 0) fail(`flow-карта: нет «:» в «${item}»`, node);
        map[unquoteKey(item.slice(0, colon))] = parseScalar(item.slice(colon + 1), node);
      }
      return map;
    }
    if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
      try {
        return JSON.parse(s);
      } catch {
        return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, "\n");
      }
    }
    if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
    if (/^[-+]?\d+$/.test(s)) return Number(s);
    if (/^[-+]?(\d+\.\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return Number(s);
    if (/^[-+]?\d+[eE][-+]?\d+$/.test(s)) return Number(s);
    return s;
  };

  /** Блочный скаляр (| или >): читается из сырых строк, чтобы сохранить пустые строки и комментарии. */
  const readBlockScalar = (list, cursor, parentIndent, style, keyLineNo) => {
    /** @type {string[]} */
    const collected = [];
    let lineIdx = keyLineNo; // 0-based индекс первой строки ПОСЛЕ ключа
    let blockIndent = null;
    while (lineIdx < rawLines.length) {
      const raw = rawLines[lineIdx];
      const isBlank = raw.trim() === "";
      const indent = raw.length - raw.trimStart().length;
      if (!isBlank && indent <= parentIndent) break;
      if (blockIndent === null && !isBlank) blockIndent = indent;
      collected.push(isBlank ? "" : raw.slice(blockIndent ?? indent));
      lineIdx += 1;
    }
    while (collected.length > 0 && collected[collected.length - 1] === "") collected.pop();

    let value;
    if (style.startsWith(">")) {
      value = collected.reduce((acc, line) => (line === "" ? `${acc}\n` : acc === "" ? line : `${acc.replace(/\n$/, "")} ${line}`), "");
    } else {
      value = collected.join("\n");
    }
    if (!style.endsWith("-")) value += "\n";

    const next = list.findIndex((n, idx) => idx >= cursor && n.lineNo > lineIdx);
    return { value, next: next === -1 ? list.length : next };
  };

  /** @param {YamlNode[]} list */
  const parseBlock = (list, i, indent) => {
    if (i >= list.length) return [null, i];
    const first = list[i];
    if (first.indent < indent) return [null, i];
    if (first.text === "-" || first.text.startsWith("- ")) return parseSequence(list, i, first.indent);
    return parseMapping(list, i, first.indent);
  };

  /** @param {YamlNode[]} list */
  function parseMapping(list, i, indent) {
    /** @type {Record<string, any>} */
    const map = {};
    let cursor = i;
    while (cursor < list.length) {
      const node = list[cursor];
      if (node.indent < indent) break;
      if (node.indent > indent) fail(`лишний отступ (ожидалось ${indent}, найдено ${node.indent})`, node);
      if (node.text === "-" || node.text.startsWith("- ")) break;

      const m = KEY_RE.exec(node.text);
      if (!m) fail(`ожидалось «ключ: значение», найдено «${node.text}»`, node);
      const key = unquoteKey(m[1]);
      if (Object.prototype.hasOwnProperty.call(map, key)) fail(`дублирующийся ключ «${key}»`, node);
      const rest = (m[2] ?? "").trim();
      cursor += 1;

      if (BLOCK_SCALAR_STYLES.has(rest)) {
        const block = readBlockScalar(list, cursor, indent, rest, node.lineNo);
        map[key] = block.value;
        cursor = block.next;
        continue;
      }
      if (rest === "") {
        if (cursor < list.length && list[cursor].indent > indent) {
          const [value, next] = parseBlock(list, cursor, list[cursor].indent);
          map[key] = value;
          cursor = next;
        } else {
          map[key] = null;
        }
        continue;
      }
      map[key] = parseScalar(rest, node);
    }
    return [map, cursor];
  }

  /** @param {YamlNode[]} list */
  function parseSequence(list, i, indent) {
    /** @type {any[]} */
    const out = [];
    let cursor = i;
    while (cursor < list.length) {
      const node = list[cursor];
      if (node.indent !== indent) break;
      if (!(node.text === "-" || node.text.startsWith("- "))) break;
      const rest = node.text === "-" ? "" : node.text.slice(2).trim();
      cursor += 1;

      if (rest === "") {
        if (cursor < list.length && list[cursor].indent > indent) {
          const [value, next] = parseBlock(list, cursor, list[cursor].indent);
          out.push(value);
          cursor = next;
        } else {
          out.push(null);
        }
        continue;
      }

      // элемент-карта: «- key: value» (+ продолжение более глубоким отступом)
      if (KEY_RE.test(rest) && !rest.startsWith("[") && !rest.startsWith("{")) {
        /** @type {YamlNode[]} */
        const virtual = [{ indent: indent + 2, text: rest, lineNo: node.lineNo }];
        while (cursor < list.length && list[cursor].indent > indent) {
          virtual.push(list[cursor]);
          cursor += 1;
        }
        const [value] = parseMapping(virtual, 0, indent + 2);
        out.push(value);
        continue;
      }
      out.push(parseScalar(rest, node));
    }
    return [out, cursor];
  }

  if (nodes.length === 0) return {};
  const [value, next] = parseBlock(nodes, 0, nodes[0].indent);
  if (next < nodes.length) fail(`не разобрано: «${nodes[next].text}»`, nodes[next]);
  return value ?? {};
}

/**
 * Загружает конфиг из файла (.json / .yaml / .yml).
 * @param {string} filePath
 * @returns {Record<string, any>}
 */
export function loadConfigFile(filePath) {
  const abs = isAbsolute(String(filePath)) ? String(filePath) : resolve(process.cwd(), String(filePath));
  if (!existsSync(abs)) throw new ConfigError(`конфиг не найден: ${abs}`, { code: "E-CONFIG-MISSING" });
  const text = readFileSync(abs, "utf8");
  const ext = abs.slice(abs.lastIndexOf(".") + 1).toLowerCase();
  /** @type {any} */
  let parsed;
  if (ext === "json") {
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new ConfigError(`JSON-конфиг не разобран (${abs}): ${e?.message ?? e}`, { code: "E-CONFIG-JSON" });
    }
  } else {
    try {
      parsed = parseSimpleYaml(text);
    } catch (e) {
      if (e instanceof ConfigError) throw e;
      throw new ConfigError(`YAML-конфиг не разобран (${abs}): ${e?.message ?? e}`, { code: "E-CONFIG-YAML" });
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ConfigError(`конфиг ${abs} должен быть картой ключей`, { code: "E-CONFIG-SCHEMA" });
  }
  return parsed;
}

/** Ищет конфиг проекта: loop.config.yaml → .yml → .json → config.yaml → … */
export function findProjectConfig(projectDir) {
  const candidates = ["loop.config.yaml", "loop.config.yml", "loop.config.json", "config.yaml", "config.yml", "config.json"];
  for (const name of candidates) {
    const path = join(projectDir, name);
    if (existsSync(path)) return path;
  }
  return null;
}

/** Читает текстовый файл или возвращает fallback (без исключений). */
export function readTextOr(filePath, fallback = null) {
  try {
    if (!filePath || !existsSync(filePath)) return fallback;
    return readFileSync(filePath, "utf8");
  } catch {
    return fallback;
  }
}

/**
 * Нормализация конфига проекта: пути, имя, snake_case → camelCase.
 * @param {Record<string, any>} raw
 * @param {{ studioRoot: string, projectDir: string, configPath?: string|null }} ctx
 */
export function normalizeProjectConfig(raw, ctx) {
  const studioRoot = resolve(ctx.studioRoot);
  const projectDir = isAbsolute(ctx.projectDir) ? resolve(ctx.projectDir) : resolve(studioRoot, ctx.projectDir);
  const projectName = String(getFirst(raw, ["project_name", "projectName"], basename(projectDir)));

  const promptsRel = String(getFirst(raw, ["prompts_dir", "promptsDir"], "prompts"));
  const promptsDir = isAbsolute(promptsRel) ? promptsRel : join(projectDir, promptsRel);

  const toAbs = (value, base) => (isAbsolute(String(value)) ? String(value) : resolve(base, String(value)));

  const resolvePrompt = (configured, names) => {
    if (configured) return toAbs(configured, projectDir);
    for (const name of names) {
      const candidate = join(promptsDir, name);
      if (existsSync(candidate)) return candidate;
    }
    return null;
  };

  return {
    raw,
    studioRoot,
    projectDir,
    projectName,
    promptsDir,
    paths: {
      systemPrompt: resolvePrompt(getFirst(raw, ["system_prompt", "systemPrompt"]), ["system.md", "system.txt", "system-prompt.md"]),
      contextTemplate: resolvePrompt(getFirst(raw, ["context_template", "contextTemplate"]), [
        "context-template.md",
        "context_template.md",
        "context.md",
      ]),
      workspace: toAbs(getFirst(raw, ["workspace_dir", "workspaceDir"], "workspace"), projectDir),
      config: ctx.configPath ?? null,
    },
    loop: snakeToCamelKeys(getFirst(raw, ["loop"], {}) ?? {}),
    generator: snakeToCamelKeys(getFirst(raw, ["generator"], {}) ?? {}),
    validator: snakeToCamelKeys(getFirst(raw, ["validator"], {}) ?? {}),
    contextBuilder: snakeToCamelKeys(getFirst(raw, ["context_builder", "contextBuilder"], {}) ?? {}),
    output: snakeToCamelKeys(getFirst(raw, ["output"], {}) ?? {}),
  };
}

/* Отладочный CLI: напечатать разобранный конфиг. */
const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) {
  const target = process.argv[2];
  if (!target) {
    process.stderr.write("использование: node core/loop-engine/config.mjs <конфиг.yaml|конфиг.json>\n");
    process.exit(1);
  }
  const path = existsSync(target) && !existsSync(join(target, "loop.config.yaml")) ? target : findProjectConfig(resolve(target)) ?? target;
  try {
    process.stdout.write(`${JSON.stringify(loadConfigFile(path), null, 2)}\n`);
  } catch (e) {
    process.stderr.write(`${e?.message ?? e}\n`);
    process.exit(1);
  }
}
