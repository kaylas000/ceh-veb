/* Тесты validators/llm-judge.mjs: разбор вердикта, порог, устойчивые ошибки. */
import assert from "node:assert/strict";
import test from "node:test";

import { createArtifact, createLoopState } from "../base.mjs";
import { MockGenerator } from "../generators/mock.mjs";
import { LlmJudgeValidator } from "../validators/llm-judge.mjs";

const state = () => createLoopState({ projectName: "demo", taskInput: { goal: "собери hero" } });
const judge = (scripted) => new MockGenerator({ scripted });

test("вердикт выше порога -> OK, ниже -> E-JUDGE-SCORE с причинами", async () => {
  const good = new LlmJudgeValidator({ judge: judge(['{"score": 0.92, "reasoning": "механика соблюдена", "fixes": []}']) });
  const okFb = await good.validate(createArtifact("<h1>ЦЕХ</h1>"), state());
  assert.equal(okFb.ok, true);
  assert.equal(okFb.metrics.score, 0.92);

  const bad = new LlmJudgeValidator({
    judge: judge(['{"score": 0.41, "reasoning": "клише и easing по умолчанию", "fixes": ["убрать ease-in-out", "взять easing из реестра"]}']),
  });
  const badFb = await bad.validate(createArtifact("<h1>ЦЕХ</h1>"), state());
  assert.equal(badFb.ok, false);
  assert.deepEqual(badFb.codes, ["E-JUDGE-SCORE"]);
  assert.match(badFb.errors[0], /0\.41 < порога 0\.8/);
  assert.ok(badFb.errors.some((e) => /easing из реестра/.test(e)), "fixs судьи должны попадать в фидбек");
});

test("JSON с пояснениями вокруг и шкала 0..100 приводятся корректно", async () => {
  const v = new LlmJudgeValidator({ judge: judge(['Оценка:\n```json\n{"score": 88, "reasoning": "хорошо"}\n```']) });
  const fb = await v.validate(createArtifact("x"), state());
  assert.equal(fb.ok, true);
  assert.equal(fb.metrics.score, 0.88);
});

test("судья без JSON -> E-JUDGE-PARSE с actionable-текстом", async () => {
  const v = new LlmJudgeValidator({ judge: judge(["мне понравилось, принимай"]) });
  const fb = await v.validate(createArtifact("x"), state());
  assert.equal(fb.ok, false);
  assert.deepEqual(fb.codes, ["E-JUDGE-PARSE"]);
  assert.match(fb.errors[0], /строго JSON|формат/i);
});

test("битый JSON и отсутствие score -> отдельные коды", async () => {
  const broken = new LlmJudgeValidator({ judge: judge(['{"score": 0.9,']) });
  const fb1 = await broken.validate(createArtifact("x"), state());
  assert.equal(fb1.ok, false);
  assert.deepEqual(fb1.codes, ["E-JUDGE-PARSE"]);

  const noScore = new LlmJudgeValidator({ judge: judge(['{"verdict": "pass"}']) });
  const fb2 = await noScore.validate(createArtifact("x"), state());
  assert.equal(fb2.ok, false);
  assert.deepEqual(fb2.codes, ["E-JUDGE-SCHEMA"]);
  assert.match(fb2.errors[0], /нет числового «score»/);
});

test("настраиваемые score_key, порог и рубрика", async () => {
  const v = new LlmJudgeValidator({
    judge: judge(['{"quality": 0.55}']),
    scoreKey: "quality",
    passThreshold: 0.5,
    rubric: "1. только квоты цеха",
  });
  const fb = await v.validate(createArtifact("x"), state());
  assert.equal(fb.ok, true);
  assert.equal(fb.metrics.threshold, 0.5);
});

test("падение судьи не рвёт цикл: фидбек с кодом ошибки", async () => {
  const failing = {
    generate() {
      throw new Error("сеть недоступна");
    },
  };
  const v = new LlmJudgeValidator({ judge: failing });
  const fb = await v.validate(createArtifact("x"), state());
  assert.equal(fb.ok, false);
  assert.match(fb.errors[0], /судья не смог ответить/);
});

test("конструктор требует генератор-судью и запрещает раннер", () => {
  assert.throws(() => new LlmJudgeValidator({}), /нужен judge-генератор/);
  assert.throws(() => new LlmJudgeValidator({ judge: { run() {}, generate() {} } }), /рекурсия запрещена/);
});
