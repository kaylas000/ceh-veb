/* Тесты validators/schema.mjs: подмножество JSON Schema (замена pydantic из патча). */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { writeFile } from "./helpers.mjs";

import { createArtifact, createLoopState } from "../base.mjs";
import { SchemaValidator, validateAgainstSchema } from "../validators/schema.mjs";

const state = () => createLoopState({ projectName: "demo" });

test("type/required/properties: принимает валидное, отвергает неполное", () => {
  const schema = {
    type: "object",
    required: ["title", "sections"],
    properties: {
      title: { type: "string", minLength: 3 },
      sections: { type: "array", minItems: 1, items: { type: "string" } },
      cta: { type: "string", enum: ["Заявка", "Расчёт"] },
    },
    additionalProperties: false,
  };
  assert.deepEqual(validateAgainstSchema({ title: "ЦЕХ", sections: ["hero"], cta: "Заявка" }, schema), []);
  const bad = validateAgainstSchema({ title: "Ц", sections: [], cta: "Купить", extra: 1 }, schema);
  const keywords = bad.map((e) => e.keyword);
  assert.ok(keywords.includes("minLength"));
  assert.ok(keywords.includes("minItems"));
  assert.ok(keywords.includes("enum"));
  assert.ok(keywords.includes("additionalProperties"));
});

test("числа, паттерны, форматы, вложенность", () => {
  const schema = {
    type: "object",
    properties: {
      vw: { type: "number", minimum: 8, maximum: 20 },
      color: { type: "string", pattern: "^#[0-9a-f]{6}$" },
      email: { type: "string", format: "email" },
      meta: { type: "object", required: ["lang"], properties: { lang: { type: "string", enum: ["ru", "en"] } } },
    },
  };
  assert.deepEqual(validateAgainstSchema({ vw: 9, color: "#0f1115", email: "a@b.co", meta: { lang: "ru" } }, schema), []);
  const bad = validateAgainstSchema({ vw: 4, color: "black", email: "нет", meta: { lang: "de" } }, schema);
  assert.equal(bad.length, 4);
  assert.ok(bad.some((e) => e.loc === "/meta/lang"));
});

test("$ref, allOf/anyOf/oneOf/not, nullable", () => {
  const schema = {
    definitions: { id: { type: "string", pattern: "^REF-\\d{2}$" } },
    type: "object",
    properties: {
      ref: { $ref: "#/definitions/id" },
      either: { anyOf: [{ type: "string" }, { type: "number" }] },
      exactly: { oneOf: [{ type: "integer" }, { minimum: 100 }] },
      notBool: { not: { type: "boolean" } },
      maybe: { type: "string", nullable: true },
    },
  };
  assert.deepEqual(validateAgainstSchema({ ref: "REF-07", either: 5, notBool: "x", maybe: null }, schema), []);
  const bad = validateAgainstSchema({ ref: "REF-X", either: true, notBool: false, maybe: null }, schema);
  assert.ok(bad.some((e) => e.keyword === "pattern"));
  assert.ok(bad.some((e) => e.keyword === "anyOf"));
  assert.ok(bad.some((e) => e.keyword === "not"));
});

test("битый $ref сообщается внятно", () => {
  const bad = validateAgainstSchema({ a: 1 }, { properties: { a: { $ref: "#/definitions/nope" } } });
  assert.ok(bad.some((e) => e.keyword === "$ref" && /не разрешена/.test(e.msg)));
});

test("SchemaValidator принимает JSON из строки, снимая code-fence", async () => {
  const v = new SchemaValidator({ schema: { type: "object", required: ["title"], properties: { title: { type: "string" } } } });
  const ok = await v.validate(createArtifact('```json\n{"title": "ЦЕХ"}\n```'), state());
  assert.equal(ok.ok, true);
  const bad = await v.validate(createArtifact('{"oops": 1}'), state());
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.codes, ["E-SCHEMA"]);
  assert.match(bad.errors[0], /title/);
});

test("SchemaValidator: не-JSON и пустой ответ -> E-SCHEMA-PARSE", async () => {
  const v = new SchemaValidator({ schema: { type: "object" } });
  const bad = await v.validate(createArtifact("простой текст без JSON"), state());
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.codes, ["E-SCHEMA-PARSE"]);
});

test("SchemaValidator грузит схему из файла (относительно проекта и корня студии)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "loop-schema-"));
  try {
    const projectDir = join(dir, "projects", "demo");
    writeFile(join(projectDir, "schema.json"), JSON.stringify({ type: "object", required: ["a"] }), { flag: "w" });
    const v = new SchemaValidator({ schema: "schema.json", studioRoot: dir, projectDir });
    const bad = await v.validate(createArtifact('{"b":1}'), state());
    assert.equal(bad.ok, false);
    const ok = await v.validate(createArtifact('{"a":1}'), state());
    assert.equal(ok.ok, true);

    const missing = new SchemaValidator({ schema: "nope.json", studioRoot: dir, projectDir });
    await assert.rejects(() => missing.validate(createArtifact("{}"), state()), /не найден|E-CONFIG-SCHEMA|схем/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SchemaValidator без схемы -> понятная ошибка, а не AttributeError (баг патча)", async () => {
  const v = new SchemaValidator({});
  await assert.rejects(() => v.validate(createArtifact("{}"), state()), /schema не задана/);
});
