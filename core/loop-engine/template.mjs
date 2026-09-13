/* ЦЕХ · Universal Loop Engine — template.mjs
   Мини-рендерер шаблонов в Jinja-подобном синтаксисе. Ноль зависимостей.

   Зачем свой, а не jinja2/nunjucks: закон цеха — «Node ≥18, ноль npm-зависимостей».

   Поддерживается:
     {{ var }}  {{ obj.prop }}  {{ list | join(", ") }}  {{ text | truncate(400) }}
     {% if var %} … {% else %} … {% endif %}
     {% for item in list %} … {% endfor %}
     {%- … -%} / {{- … -}}  — управление пробелами
     {var}                   — одинарные скобки (совместимость с .format() из Python-патча)

   Ключевое отличие от str.format() (баг Python-патча): неизвестные переменные и
   «чужие» фигурные скобки (CSS/JS/JSON внутри вставленных файлов) НЕ ломают рендер —
   они остаются как есть, а пропуск попадает в warnings.
*/

import { truncate as truncateText } from "./text.mjs";

/* Три вида токенов: {{ выражение }}, {% тег %}, {# комментарий #} (каждый с флагами «-»). */
const TOKEN_RE = /\{\{(-?)([\s\S]*?)(-?)\}\}|\{%(-?)([\s\S]*?)(-?)%\}|\{#(-?)([\s\S]*?)(-?)#\}/g;

/** @param {unknown} value */
export function isTruthy(value) {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(/** @type {object} */ (value)).length > 0;
  return Boolean(value);
}

/**
 * Разрешает путь `a.b.c` по стеку областей видимости.
 * @param {Array<Record<string, any>>} scopes
 * @param {string} path
 * @returns {{ found: boolean, value: any }}
 */
function resolvePath(scopes, path) {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return { found: false, value: undefined };
  for (let s = scopes.length - 1; s >= 0; s -= 1) {
    const scope = scopes[s];
    if (!scope || !(parts[0] in scope)) continue;
    let cur = scope[parts[0]];
    let ok = true;
    for (let i = 1; i < parts.length; i += 1) {
      if (cur === null || cur === undefined || typeof cur !== "object" || !(parts[i] in cur)) {
        ok = false;
        break;
      }
      cur = cur[parts[i]];
    }
    if (ok) return { found: true, value: cur };
  }
  return { found: false, value: undefined };
}

/** Разбивает строку по разделителю верхнего уровня (с учётом кавычек и скобок). */
function splitTopLevel(input, separators) {
  const parts = [];
  let depth = 0;
  let quote = "";
  let current = "";
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote) {
      current += ch;
      if (ch === "\\" && quote === '"' && i + 1 < input.length) {
        current += input[i + 1];
        i += 1;
      } else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
    if (depth === 0 && separators.includes(ch)) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/**
 * Вычисляет выражение: литерал, путь или путь с фильтрами.
 * @param {Array<Record<string, any>>} scopes
 * @param {string} expr
 * @param {string[]} warnings
 */
function evalExpression(scopes, expr, warnings) {
  const raw = expr.trim();
  if (!raw) return "";
  const pieces = splitTopLevel(raw, ["|"]);
  let value = evalAtom(scopes, pieces[0].trim(), warnings);
  for (const piece of pieces.slice(1)) {
    const filterSrc = piece.trim();
    if (!filterSrc) continue;
    const call = /^([a-zA-Z_][\w-]*)\s*(?:\(([\s\S]*)\))?$/.exec(filterSrc);
    if (!call) {
      warnings.push(`фильтр не распознан: ${filterSrc}`);
      continue;
    }
    const name = call[1];
    const args = call[2] ? splitTopLevel(call[2], [","]).map((a) => evalAtom(scopes, a.trim(), warnings)) : [];
    value = applyFilter(name, value, args, warnings);
  }
  return value;
}

/** @param {Array<Record<string, any>>} scopes */
function evalAtom(scopes, atom, warnings) {
  const src = atom.trim();
  if (!src) return "";
  if (/^".*"$/s.test(src) && src.length >= 2) {
    try {
      return JSON.parse(src);
    } catch {
      return src.slice(1, -1);
    }
  }
  if (/^'.*'$/s.test(src) && src.length >= 2) return src.slice(1, -1).replace(/''/g, "'");
  if (/^[-+]?\d+$/.test(src)) return Number(src);
  if (/^[-+]?\d*\.\d+$/.test(src)) return Number(src);
  if (src === "true") return true;
  if (src === "false") return false;
  if (src === "null" || src === "none" || src === "None") return null;
  if (/^[a-zA-Z_][\w.]*$/.test(src)) {
    const res = resolvePath(scopes, src);
    if (!res.found) {
      warnings.push(`неизвестная переменная: ${src}`);
      return "";
    }
    return res.value;
  }
  warnings.push(`выражение не поддержано: ${src}`);
  return "";
}

function applyFilter(name, value, args, warnings) {
  switch (name) {
    case "upper":
      return String(value ?? "").toUpperCase();
    case "lower":
      return String(value ?? "").toLowerCase();
    case "trim":
      return String(value ?? "").trim();
    case "length":
    case "count":
      if (Array.isArray(value) || typeof value === "string") return value.length;
      if (value && typeof value === "object") return Object.keys(value).length;
      return 0;
    case "join": {
      const sep = args.length > 0 ? String(args[0]) : ", ";
      if (Array.isArray(value)) return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v ?? ""))).join(sep);
      if (value && typeof value === "object") return Object.entries(value).map(([k, v]) => `${k}${sep}${v}`).join("\n");
      return String(value ?? "");
    }
    case "truncate": {
      const max = Number(args[0] ?? 400);
      return truncateText(String(value ?? ""), max);
    }
    case "default": {
      const fallback = args.length > 0 ? args[0] : "";
      return isTruthy(value) ? value : fallback;
    }
    case "tojson":
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    case "keys":
      return value && typeof value === "object" ? Object.keys(value) : [];
    case "items":
      return value && typeof value === "object" ? Object.entries(value) : [];
    default:
      warnings.push(`неизвестный фильтр: ${name}`);
      return value;
  }
}

/** Токенизация с учётом управления пробелами (`-`). */
function tokenize(src) {
  const tokens = [];
  let last = 0;
  let trimNext = false;
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(src)) !== null) {
    let text = src.slice(last, m.index);
    const isExpr = m[2] !== undefined;
    const isComment = m[8] !== undefined;
    const trimLeft = (isExpr ? m[1] : isComment ? m[7] : m[4]) === "-";
    const trimRight = (isExpr ? m[3] : isComment ? m[9] : m[6]) === "-";
    if (trimNext) text = text.replace(/^\s+/, "");
    if (trimLeft) text = text.replace(/\s+$/, "");
    if (text.length > 0) tokens.push({ type: "text", value: text });
    // комментарии в вывод не попадают (иначе {% for %} внутри пояснения ломал бы парсер)
    if (!isComment) tokens.push({ type: isExpr ? "expr" : "tag", value: (isExpr ? m[2] : m[5]).trim() });
    last = m.index + m[0].length;
    trimNext = trimRight;
  }
  let tail = src.slice(last);
  if (trimNext) tail = tail.replace(/^\s+/, "");
  if (tail.length > 0) tokens.push({ type: "text", value: tail });
  return tokens;
}

/**
 * Рекурсивный разбор токенов в AST.
 * @param {Array<{type:string,value:string}>} tokens
 * @param {number} start
 * @param {string[]} terminators
 */
function parseNodes(tokens, start, terminators) {
  /** @type {Array<any>} */
  const nodes = [];
  let i = start;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === "text") {
      nodes.push({ kind: "text", text: token.value });
      i += 1;
      continue;
    }
    if (token.type === "expr") {
      nodes.push({ kind: "expr", expr: token.value });
      i += 1;
      continue;
    }
    const head = /^([a-zA-Z_]+)\s*([\s\S]*)$/.exec(token.value);
    const keyword = head ? head[1] : "";
    const rest = head ? head[2].trim() : "";
    if (terminators.includes(keyword)) return { nodes, next: i, endTag: keyword };

    if (keyword === "if") {
      const body = parseNodes(tokens, i + 1, ["else", "elif", "endif"]);
      let elseNodes = [];
      let next = body.next;
      if (body.endTag === "else") {
        const alt = parseNodes(tokens, body.next + 1, ["endif"]);
        elseNodes = alt.nodes;
        next = alt.next;
      } else if (body.endTag === "elif") {
        // elif -> вложенный if в else-ветке
        const elifToken = tokens[body.next];
        const elifRest = /^elif\s+([\s\S]*)$/.exec(elifToken.value)?.[1] ?? "";
        const nested = parseNodes([{ type: "tag", value: `if ${elifRest}` }, ...tokens.slice(body.next + 1)], 0, ["endif"]);
        elseNodes = nested.nodes;
        next = body.next + 1 + (nested.next ?? 0);
        // пропускаем до endif исходного потока
        while (next < tokens.length && !(tokens[next].type === "tag" && /^endif\b/.test(tokens[next].value))) next += 1;
      }
      if (next >= tokens.length || !/^endif\b/.test(tokens[next]?.value ?? "")) {
        throw new Error("шаблон: незакрытый {% if %} (ожидался {% endif %})");
      }
      nodes.push({ kind: "if", expr: rest, body: body.nodes, else: elseNodes });
      i = next + 1;
      continue;
    }

    if (keyword === "for") {
      const forMatch = /^([a-zA-Z_][\w]*)\s*(?:,\s*([a-zA-Z_][\w]*)\s*)?in\s+([\s\S]+)$/.exec(rest);
      if (!forMatch) throw new Error(`шаблон: неразобранный {% for %}: ${token.value}`);
      const body = parseNodes(tokens, i + 1, ["endfor"]);
      if (body.endTag !== "endfor") throw new Error("шаблон: незакрытый {% for %} (ожидался {% endfor %})");
      nodes.push({
        kind: "for",
        valueName: forMatch[2] ? forMatch[2] : forMatch[1],
        keyName: forMatch[2] ? forMatch[1] : null,
        expr: forMatch[3].trim(),
        body: body.nodes,
      });
      i = body.next + 1;
      continue;
    }

    throw new Error(`шаблон: неизвестный тег {% ${keyword} %}`);
  }
  if (terminators.length > 0) return { nodes, next: i, endTag: "" };
  return { nodes, next: i, endTag: "" };
}

/**
 * Рендер AST.
 * @param {Array<any>} nodes
 * @param {Array<Record<string, any>>} scopes
 * @param {{ singleBrace: boolean, strict: boolean }} opts
 * @param {string[]} warnings
 */
function renderNodes(nodes, scopes, opts, warnings) {
  let out = "";
  for (const node of nodes) {
    if (node.kind === "text") {
      out += opts.singleBrace ? renderSingleBrace(node.text, scopes, opts, warnings) : node.text;
      continue;
    }
    if (node.kind === "expr") {
      const value = evalExpression(scopes, node.expr, warnings);
      out += stringify(value);
      continue;
    }
    if (node.kind === "if") {
      const branch = isTruthy(evalExpression(scopes, node.expr, warnings)) ? node.body : node.else;
      out += renderNodes(branch, scopes, opts, warnings);
      continue;
    }
    if (node.kind === "for") {
      const source = evalExpression(scopes, node.expr, warnings);
      const entries = Array.isArray(source)
        ? source.map((v, idx) => [idx, v])
        : source && typeof source === "object"
          ? Object.entries(source)
          : [];
      if (entries.length === 0 && warnings.length >= 0) {
        const res = resolvePath(scopes, node.expr);
        if (!res.found) warnings.push(`цикл по неизвестной переменной: ${node.expr}`);
      }
      for (const [key, value] of entries) {
        const scope = node.keyName ? { [node.keyName]: key, [node.valueName]: value } : { [node.valueName]: value, loop: { index: key } };
        out += renderNodes(node.body, [...scopes, scope], opts, warnings);
      }
      continue;
    }
  }
  return out;
}

/** Подстановка `{var}` — только для известных ключей, иначе текст остаётся нетронутым. */
function renderSingleBrace(text, scopes, opts, warnings) {
  return text.replace(/\{([a-zA-Z_][\w.]*)\}/g, (whole, path) => {
    const res = resolvePath(scopes, path);
    if (!res.found) return whole; // никакой KeyError: чужие скобки (CSS/JSON) живут дальше
    if (typeof res.value === "object") return stringify(res.value);
    return String(res.value ?? "");
  });
}

function stringify(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Рендер с подробностями.
 * @param {string} source
 * @param {Record<string, any>} vars
 * @param {{ singleBrace?: boolean, strict?: boolean }} [opts]
 * @returns {{ text: string, warnings: string[] }}
 */
export function renderTemplateDetailed(source, vars = {}, opts = {}) {
  const options = { singleBrace: opts.singleBrace !== false, strict: Boolean(opts.strict) };
  const warnings = [];
  if (typeof source !== "string" || source.length === 0) return { text: "", warnings };
  const tokens = tokenize(source);
  const parsed = parseNodes(tokens, 0, []);
  const text = renderNodes(parsed.nodes, [vars ?? {}], options, warnings);
  if (options.strict && warnings.length > 0) {
    throw new Error(`шаблон: ${warnings.join("; ")}`);
  }
  return { text, warnings: [...new Set(warnings)] };
}

/**
 * Основной API: шаблон + переменные → строка.
 * @param {string} source
 * @param {Record<string, any>} vars
 * @param {{ singleBrace?: boolean, strict?: boolean }} [opts]
 * @returns {string}
 */
export function renderTemplate(source, vars = {}, opts = {}) {
  return renderTemplateDetailed(source, vars, opts).text;
}
