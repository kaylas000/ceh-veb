/* ЦЕХ · Universal Loop Engine — validators/schema.mjs
   SchemaValidator: проверка JSON-артефакта по схеме. Ноль зависимостей.

   Замена JSONSchemaValidator из Python-патча (там был pydantic TypeAdapter —
   внешняя зависимость). Здесь — своё подмножество JSON Schema:
     type, enum, const, required, properties, patternProperties, additionalProperties,
     items, minItems/maxItems/uniqueItems, minimum/maximum/exclusive*, multipleOf,
     minLength/maxLength/pattern/format, minProperties/maxProperties,
     allOf/anyOf/oneOf/not, $ref (#/…), nullable (OpenAPI).

   Исправленный баг патча: при схеме-пути поле `_schema_dict` не создавалось,
   и validate() падал с AttributeError. Здесь схема резолвится лениво и единообразно.
*/

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

import { ValidatorError, createFeedback, getFirst } from "../base.mjs";
import { extractJson, stripCodeFences, truncate } from "../text.mjs";

const FORMATS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  date: /^\d{4}-\d{2}-\d{2}$/,
  "date-time": /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:?\d{2})?$/,
  uri: /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/\S+$/,
  "uri-reference": /^(\S*)$/,
  ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
  hexcolor: /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
};

function actualType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function matchesType(value, type) {
  const actual = actualType(value);
  if (type === "number") return actual === "number" || actual === "integer";
  if (type === "integer") return actual === "integer";
  if (type === "object") return actual === "object";
  return actual === type;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== "object") return Number.isNaN(a) && Number.isNaN(b);
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function resolveRef(ref, root) {
  if (typeof ref !== "string" || !ref.startsWith("#")) return null;
  const parts = ref.replace(/^#\//, "").split("/").filter(Boolean);
  let current = root;
  for (const part of parts) {
    const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
    if (current === null || typeof current !== "object" || !(key in current)) return null;
    current = current[key];
  }
  return current ?? null;
}

/**
 * Проверка значения по JSON Schema (подмножество).
 * @param {any} value
 * @param {Record<string, any>} schema
 * @param {{ root?: Record<string, any>, loc?: string, maxErrors?: number }} [opts]
 * @returns {Array<{ loc: string, msg: string, keyword: string }>}
 */
export function validateAgainstSchema(value, schema, opts = {}) {
  const root = opts.root ?? schema;
  const loc = opts.loc ?? "";
  const maxErrors = Number(opts.maxErrors ?? 50);
  /** @type {Array<{loc:string,msg:string,keyword:string}>} */
  const errors = [];

  const push = (keyword, msg, at = loc) => {
    if (errors.length < maxErrors) errors.push({ loc: at || "/", msg, keyword });
  };

  if (!schema || typeof schema !== "object") return errors;

  if (typeof schema.$ref === "string") {
    const resolved = resolveRef(schema.$ref, root);
    if (!resolved) {
      push("$ref", `не разрешена ссылка ${schema.$ref}`);
      return errors;
    }
    errors.push(...validateAgainstSchema(value, resolved, { ...opts, root, loc }));
    return errors;
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const nullable = Boolean(schema.nullable) || types.includes("null");
    if (value === null && nullable) return errors;
    if (!types.some((t) => matchesType(value, t))) {
      push("type", `ожидался тип ${types.join("|")}, получен ${actualType(value)}`);
      return errors;
    }
  } else if (value === null && schema.nullable === true) {
    return errors;
  }

  if (schema.enum !== undefined && Array.isArray(schema.enum)) {
    if (!schema.enum.some((variant) => deepEqual(value, variant))) {
      push("enum", `значение вне списка: ${JSON.stringify(schema.enum)}`);
    }
  }
  if (schema.const !== undefined && !deepEqual(value, schema.const)) {
    push("const", `ожидалось ${JSON.stringify(schema.const)}`);
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) push("minimum", `${value} < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) push("maximum", `${value} > maximum ${schema.maximum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      push("exclusiveMinimum", `${value} <= exclusiveMinimum ${schema.exclusiveMinimum}`);
    }
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      push("exclusiveMaximum", `${value} >= exclusiveMaximum ${schema.exclusiveMaximum}`);
    }
    if (schema.multipleOf !== undefined && schema.multipleOf !== 0) {
      const ratio = value / schema.multipleOf;
      if (Math.abs(ratio - Math.round(ratio)) > 1e-9) push("multipleOf", `${value} не кратно ${schema.multipleOf}`);
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) push("minLength", `длина ${value.length} < ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) push("maxLength", `длина ${value.length} > ${schema.maxLength}`);
    if (typeof schema.pattern === "string") {
      let re = null;
      try {
        re = new RegExp(schema.pattern, "u");
      } catch {
        try {
          re = new RegExp(schema.pattern);
        } catch {
          push("pattern", `некорректный паттерн ${schema.pattern}`);
        }
      }
      if (re && !re.test(value)) push("pattern", `не соответствует /${schema.pattern}/`);
    }
    if (typeof schema.format === "string" && FORMATS[schema.format]) {
      if (!FORMATS[schema.format].test(value)) push("format", `не соответствует формату ${schema.format}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) push("minItems", `элементов ${value.length} < ${schema.minItems}`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) push("maxItems", `элементов ${value.length} > ${schema.maxItems}`);
    if (schema.uniqueItems === true) {
      const seen = new Set();
      for (const item of value) {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          push("uniqueItems", "найдены дубликаты элементов");
          break;
        }
        seen.add(key);
      }
    }
    if (Array.isArray(schema.items)) {
      value.forEach((item, idx) => {
        const itemSchema = schema.items[idx] ?? schema.additionalItems;
        if (itemSchema && typeof itemSchema === "object") {
          errors.push(...validateAgainstSchema(item, itemSchema, { root, loc: `${loc}/${idx}`, maxErrors }));
        }
      });
    } else if (schema.items && typeof schema.items === "object") {
      value.forEach((item, idx) => {
        errors.push(...validateAgainstSchema(item, schema.items, { root, loc: `${loc}/${idx}`, maxErrors }));
      });
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value);
    for (const required of schema.required ?? []) {
      if (!(required in value)) push("required", `нет обязательного поля «${required}»`, `${loc}/${required}`);
    }
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) push("minProperties", `полей ${keys.length} < ${schema.minProperties}`);
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) push("maxProperties", `полей ${keys.length} > ${schema.maxProperties}`);

    const properties = schema.properties ?? {};
    const patterns = Object.entries(schema.patternProperties ?? {});
    for (const key of keys) {
      const childLoc = `${loc}/${key}`;
      if (key in properties) {
        errors.push(...validateAgainstSchema(value[key], properties[key], { root, loc: childLoc, maxErrors }));
        continue;
      }
      const matchedPattern = patterns.find(([re]) => {
        try {
          return new RegExp(re).test(key);
        } catch {
          return false;
        }
      });
      if (matchedPattern) {
        errors.push(...validateAgainstSchema(value[key], matchedPattern[1], { root, loc: childLoc, maxErrors }));
        continue;
      }
      if (schema.additionalProperties === false) push("additionalProperties", `лишнее поле «${key}»`, childLoc);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        errors.push(...validateAgainstSchema(value[key], schema.additionalProperties, { root, loc: childLoc, maxErrors }));
      }
    }
  }

  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach((sub, idx) => {
      errors.push(...validateAgainstSchema(value, sub, { root, loc, maxErrors }));
      void idx;
    });
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    const ok = schema.anyOf.some((sub) => validateAgainstSchema(value, sub, { root, loc, maxErrors }).length === 0);
    if (!ok) push("anyOf", "значение не подошло ни одной из anyOf-схем");
  }
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const matches = schema.oneOf.filter((sub) => validateAgainstSchema(value, sub, { root, loc, maxErrors }).length === 0).length;
    if (matches !== 1) push("oneOf", `oneOf: подошло схем ${matches}, нужна ровно 1`);
  }
  if (schema.not && typeof schema.not === "object") {
    if (validateAgainstSchema(value, schema.not, { root, loc, maxErrors }).length === 0) push("not", "значение не должно соответствовать схеме not");
  }

  return errors;
}

export class SchemaValidator {
  static requires = Object.freeze(["studioRoot", "projectName", "projectDir"]);

  /** @param {Record<string, any>} [opts] */
  constructor(opts = {}) {
    this.studioRoot = opts.studioRoot ? resolve(String(opts.studioRoot)) : null;
    this.projectDir = opts.projectDir ? resolve(String(opts.projectDir)) : this.studioRoot;
    this.projectName = String(opts.projectName ?? "default");
    /** Объект-схема, путь к .json или класс со статическим jsonSchema. */
    this.schemaSource = getFirst(opts, ["schema", "schemaPath", "schema_path"], null);
    this.maxErrors = Number(opts.maxErrors ?? 30);
    this.maxRawChars = Number(opts.maxRawChars ?? 2000);
    this._schema = null;
  }

  /** Ленивая загрузка схемы: объект / путь / класс со static jsonSchema. */
  loadSchema() {
    if (this._schema) return this._schema;
    const source = this.schemaSource;
    if (!source) throw new ValidatorError("schema не задана (validator.schema в конфиге)", { code: "E-CONFIG-SCHEMA" });

    if (typeof source === "object" && !Array.isArray(source)) {
      this._schema = source;
      return this._schema;
    }
    if (typeof source === "function") {
      const staticSchema = source.jsonSchema ?? source.schema ?? null;
      if (staticSchema && typeof staticSchema === "object") {
        this._schema = staticSchema;
        return this._schema;
      }
      throw new ValidatorError("класс-схема должен иметь статическое поле jsonSchema", { code: "E-CONFIG-SCHEMA" });
    }
    if (typeof source === "string") {
      const candidates = [
        isAbsolute(source) ? source : null,
        this.projectDir ? join(this.projectDir, source) : null,
        this.studioRoot ? join(this.studioRoot, source) : null,
      ].filter(Boolean);
      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          try {
            this._schema = JSON.parse(readFileSync(candidate, "utf8"));
            return this._schema;
          } catch (e) {
            throw new ValidatorError(`схема ${candidate} не JSON: ${e?.message ?? e}`, { code: "E-CONFIG-SCHEMA" });
          }
        }
      }
      throw new ValidatorError(`файл схемы не найден: ${source} (искал: ${candidates.join(", ")})`, { code: "E-CONFIG-SCHEMA" });
    }
    throw new ValidatorError(`неподдерживаемый тип схемы: ${typeof source}`, { code: "E-CONFIG-SCHEMA" });
  }

  /**
   * @param {import("../base.mjs").Artifact} artifact
   * @param {import("../base.mjs").LoopState} state
   * @returns {Promise<import("../base.mjs").Feedback>}
   */
  async validate(artifact, state) {
    const schema = this.loadSchema();
    let content = artifact?.content;

    if (typeof content === "string") {
      const jsonSource = extractJson(stripCodeFences(content));
      if (!jsonSource) {
        return createFeedback({
          ok: false,
          errors: ["ответ не содержит JSON — выдай валидный JSON-объект без пояснений"],
          codes: ["E-SCHEMA-PARSE"],
          raw: truncate(content, this.maxRawChars),
          metrics: { iteration: Number(state?.iteration ?? 0) },
        });
      }
      try {
        content = JSON.parse(jsonSource);
      } catch (e) {
        return createFeedback({
          ok: false,
          errors: [`битый JSON: ${e?.message ?? e}`],
          codes: ["E-SCHEMA-PARSE"],
          raw: truncate(jsonSource, this.maxRawChars),
          metrics: { iteration: Number(state?.iteration ?? 0) },
        });
      }
    }

    const problems = validateAgainstSchema(content, schema, { root: schema, maxErrors: this.maxErrors });
    return createFeedback({
      ok: problems.length === 0,
      errors: problems.map((p) => `${p.loc}: ${p.msg}`),
      codes: problems.length === 0 ? ["OK"] : ["E-SCHEMA"],
      raw: problems.length === 0 ? "схема соблюдена" : { problems: problems.slice(0, this.maxErrors), value: truncate(JSON.stringify(content), this.maxRawChars) },
      metrics: { iteration: Number(state?.iteration ?? 0), problems: problems.length, keywords: [...new Set(problems.map((p) => p.keyword))] },
    });
  }
}

export default SchemaValidator;
