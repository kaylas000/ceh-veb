/* Тесты template.mjs: {{ }}, {% if %}, {% for %}, фильтры, одинарные скобки, управление пробелами. */
import assert from "node:assert/strict";
import test from "node:test";

import { renderTemplate, renderTemplateDetailed } from "../template.mjs";

test("подставляет переменные и вложенные пути", () => {
  assert.equal(renderTemplate("{{ a }} и {{ b.c }}", { a: "ЦЕХ", b: { c: 42 } }), "ЦЕХ и 42");
});

test("неизвестная переменная не рвёт рендер (главный баг str.format из патча)", () => {
  const { text, warnings } = renderTemplateDetailed("[{{ unknown }}]", {});
  assert.equal(text, "[]");
  assert.ok(warnings.some((w) => w.includes("unknown")));
});

test("фигурные скобки CSS/JSON внутри значений не ломают рендер", () => {
  const css = ".btn { color: oklch(0.7 0.1 200); transition: color 0.3s }";
  assert.equal(renderTemplate("{{ css }}", { css }), css);
  assert.equal(renderTemplate("literal {not_a_var} stays", {}), "literal {not_a_var} stays");
});

test("одинарные скобки {var} работают только для известных ключей", () => {
  assert.equal(renderTemplate("{task} · {project_name}", { task: "собери", project_name: "pcpolimer" }), "собери · pcpolimer");
  assert.equal(renderTemplate("{css_block}", {}), "{css_block}");
});

test("{% if %} / {% else %} по truthiness", () => {
  const tpl = "{% if items %}есть {{ items | length }}{% else %}пусто{% endif %}";
  assert.equal(renderTemplate(tpl, { items: [1, 2, 3] }), "есть 3");
  assert.equal(renderTemplate(tpl, { items: [] }), "пусто");
  assert.equal(renderTemplate(tpl, {}), "пусто");
});

test("{% for %} по массиву и по объекту", () => {
  assert.equal(
    renderTemplate("{% for e in errors %}- {{ e }}\n{% endfor %}", { errors: ["один", "два"] }),
    "- один\n- два\n",
  );
  assert.equal(renderTemplate("{% for k, v in map %}{{ k }}={{ v }};{% endfor %}", { map: { a: 1, b: 2 } }), "a=1;b=2;");
});

test("вложенные циклы и условия", () => {
  const tpl = "{% for a in attempts %}[{{ a.n }}:{% for e in a.errors %}{{ e }}{% endfor %}]{% endfor %}";
  assert.equal(
    renderTemplate(tpl, { attempts: [{ n: 1, errors: ["x", "y"] }, { n: 2, errors: [] }] }),
    "[1:xy][2:]",
  );
});

test("фильтры: truncate, join, upper, default, tojson", () => {
  assert.equal(renderTemplate("{{ s | truncate(6) }}", { s: "0123456789" }).length <= 20, true);
  assert.equal(renderTemplate("{{ list | join(', ') }}", { list: ["a", "b"] }), "a, b");
  assert.equal(renderTemplate("{{ s | upper }}", { s: "цех" }), "ЦЕХ");
  assert.equal(renderTemplate("{{ missing | default('нет') }}", {}), "нет");
  assert.match(renderTemplate("{{ o | tojson }}", { o: { a: 1 } }), /"a": 1/);
});

test("управление пробелами через {%- -%}", () => {
  assert.equal(renderTemplate("a\n{%- if x %}b{% endif -%}\nc", { x: true }), "abc");
  assert.equal(renderTemplate("{{- v -}}", { v: " x " }).trim(), "x");
});

test("strict-режим бросает на неизвестных переменных", () => {
  assert.throws(() => renderTemplate("{{ nope }}", {}, { strict: true }), /nope/);
});

test("незакрытые блоки дают понятную ошибку", () => {
  assert.throws(() => renderTemplate("{% if a %}текст", { a: 1 }), /endif/);
  assert.throws(() => renderTemplate("{% for x in a %}текст", { a: [1] }), /endfor/);
  assert.throws(() => renderTemplate("{% while true %}", {}), /неизвестный тег/);
});
