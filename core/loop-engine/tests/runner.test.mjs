/* Тесты runner.mjs: сходимость цикла, расписание температур, budget, персист, throw_on_failure. */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { BudgetError, createArtifact, createFeedback } from "../base.mjs";
import { MockGenerator } from "../generators/mock.mjs";
import { silentLogger } from "../logger.mjs";
import { UniversalLoopRunner } from "../runner.mjs";

/** Валидатор-стаб: принимает только строку, содержащую маркер. */
function stubValidator(marker, calls = []) {
  return {
    describe: () => ({ type: "stub" }),
    validate(artifact) {
      const content = String(artifact.content ?? "");
      calls.push(content);
      const ok = content.includes(marker);
      return createFeedback({
        ok,
        errors: ok ? [] : [`нет маркера «${marker}» в артефакте`],
        codes: ok ? ["OK"] : ["E-STUB"],
        raw: content.slice(0, 80),
        metrics: { len: content.length },
      });
    },
  };
}

function contextBuilderSpy(seen = []) {
  return {
    describe: () => ({ type: "spy" }),
    build(task, state, studioRoot) {
      seen.push({ task, iteration: state.iteration, temperature: state.temperature, history: state.history.length, studioRoot });
      return `TASK=${task} ITER=${state.iteration} HIST=${state.history.length}`;
    },
  };
}

test("цикл сходится: провал → фидбек → успех (3 итерации)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "loop-run-"));
  try {
    const seen = [];
    const runner = new UniversalLoopRunner({
      generator: new MockGenerator({ scripted: ["раз", "два", "GOOD маркер"] }),
      validator: stubValidator("маркер"),
      contextBuilder: contextBuilderSpy(seen),
      config: { max_iterations: 5, temperature_schedule: [0.4, 0.2, 0.0] },
      workspaceDir: join(dir, "workspace"),
      logger: silentLogger,
    });

    const result = await runner.run("собери артефакт", dir, "demo");
    assert.equal(result.ok, true);
    assert.equal(result.iterations, 3);
    assert.equal(result.successIteration, 3);
    assert.equal(result.artifact.content, "GOOD маркер");
    assert.match(result.reason, /успех на итерации 3/);

    // история и расписание температур
    assert.deepEqual(
      result.state.history.map((h) => h.temperature),
      [0.4, 0.2, 0],
    );
    assert.deepEqual(
      result.state.history.map((h) => h.feedback.ok),
      [false, false, true],
    );
    // билдер контекста видел растущую историю
    assert.deepEqual(seen.map((s) => s.history), [0, 1, 2]);
    assert.equal(seen[2].task, "собери артефакт");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("исчерпание итераций: LoopResult{ok:false}, а не исключение", async () => {
  const runner = new UniversalLoopRunner({
    generator: new MockGenerator({ scripted: ["плохо"] }),
    validator: stubValidator("маркер"),
    contextBuilder: contextBuilderSpy(),
    config: { max_iterations: 2 },
    logger: silentLogger,
  });
  const result = await runner.run("задача", tmpdir(), "demo");
  assert.equal(result.ok, false);
  assert.equal(result.iterations, 2);
  assert.equal(result.artifact, null);
  assert.match(result.reason, /провал после 2 итераций/);
  assert.deepEqual(result.feedback.codes, ["E-STUB"]);
});

test("throw_on_failure: true -> BudgetError с кодами", async () => {
  const runner = new UniversalLoopRunner({
    generator: new MockGenerator({ scripted: ["плохо"] }),
    validator: stubValidator("маркер"),
    contextBuilder: contextBuilderSpy(),
    config: { max_iterations: 1, throw_on_failure: true },
    logger: silentLogger,
  });
  await assert.rejects(() => runner.run("задача", tmpdir(), "demo"), (e) => e instanceof BudgetError && e.code === "E-LOOP-EXHAUSTED");
});

test("stop_on_first_success: false -> прогон продолжается, возвращается успешный артефакт", async () => {
  const runner = new UniversalLoopRunner({
    generator: new MockGenerator({ scripted: ["GOOD маркер", "плохо", "плохо"] }),
    validator: stubValidator("маркер"),
    contextBuilder: contextBuilderSpy(),
    config: { max_iterations: 3, stop_on_first_success: false },
    logger: silentLogger,
  });
  const result = await runner.run("задача", tmpdir(), "demo");
  assert.equal(result.ok, true);
  assert.equal(result.iterations, 3);
  assert.equal(result.successIteration, 1);
  assert.equal(result.artifact.content, "GOOD маркер");
  assert.match(result.reason, /stop_on_first_success=false/);
});

test("фатальная ошибка генератора (нет ключа) прерывает цикл сразу", async () => {
  const { LlmGenerator } = await import("../generators/llm.mjs");
  const generator = new LlmGenerator({ provider: "openai", apiKey: "", apiKeyEnv: "DEFINITELY_NOT_SET_KEY", maxRetries: 0 });
  const runner = new UniversalLoopRunner({
    generator,
    validator: stubValidator("маркер"),
    contextBuilder: contextBuilderSpy(),
    config: { max_iterations: 5 },
    logger: silentLogger,
  });
  const result = await runner.run("задача", tmpdir(), "demo");
  assert.equal(result.ok, false);
  assert.equal(result.iterations, 1);
  assert.match(result.reason, /фатальная ошибка генератора \(E-GEN-KEY\)/);
});

test("падение валидатора не рвёт цикл: E-VAL и следующая итерация", async () => {
  let calls = 0;
  const runner = new UniversalLoopRunner({
    generator: new MockGenerator({ scripted: ["a", "GOOD маркер"] }),
    validator: {
      validate() {
        calls += 1;
        if (calls === 1) throw new Error("сломался subprocess");
        return createFeedback({ ok: true, errors: [], codes: ["OK"] });
      },
    },
    contextBuilder: contextBuilderSpy(),
    config: { max_iterations: 3 },
    logger: silentLogger,
  });
  const result = await runner.run("задача", tmpdir(), "demo");
  assert.equal(result.ok, true);
  assert.equal(result.iterations, 2);
  assert.deepEqual(result.state.history[0].feedback.codes, ["E-VAL"]);
  assert.match(result.state.history[0].feedback.errors[0], /сломался subprocess/);
});

test("ошибка сборки контекста прерывает прогон (детерминированная)", async () => {
  const runner = new UniversalLoopRunner({
    generator: new MockGenerator({}),
    validator: stubValidator("маркер"),
    contextBuilder: {
      build() {
        throw new Error("шаблон не найден");
      },
    },
    config: { max_iterations: 4 },
    logger: silentLogger,
  });
  const result = await runner.run("задача", tmpdir(), "demo");
  assert.equal(result.ok, false);
  assert.equal(result.iterations, 1);
  assert.deepEqual(result.feedback.codes, ["E-CTX"]);
});

test("персист итераций: workspace/iterations/iter-NN/{artifact.txt,feedback.json}", async () => {
  const dir = mkdtempSync(join(tmpdir(), "loop-persist-"));
  try {
    const workspace = join(dir, "workspace");
    const runner = new UniversalLoopRunner({
      generator: new MockGenerator({ scripted: ["плохо", "GOOD маркер"] }),
      validator: stubValidator("маркер"),
      contextBuilder: contextBuilderSpy(),
      config: { max_iterations: 3, persist_iterations: true },
      workspaceDir: workspace,
      logger: silentLogger,
    });
    const result = await runner.run("задача", dir, "demo");
    assert.equal(result.ok, true);

    const iter1 = join(workspace, "iterations", "iter-01");
    const iter2 = join(workspace, "iterations", "iter-02");
    assert.ok(existsSync(join(iter1, "artifact.txt")));
    assert.ok(existsSync(join(iter2, "feedback.json")));
    const fb = JSON.parse(readFileSync(join(iter2, "feedback.json"), "utf8"));
    assert.equal(fb.iteration, 1);
    assert.equal(fb.feedback.ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("хук onIteration вызывается на каждой итерации и его падение не ломает цикл", async () => {
  const events = [];
  const runner = new UniversalLoopRunner({
    generator: new MockGenerator({ scripted: ["плохо", "GOOD маркер"] }),
    validator: stubValidator("маркер"),
    contextBuilder: contextBuilderSpy(),
    config: { max_iterations: 3 },
    logger: silentLogger,
    onIteration: (entry) => {
      events.push(entry.iteration);
      if (entry.iteration === 0) throw new Error("хук упал");
    },
  });
  const result = await runner.run("задача", tmpdir(), "demo");
  assert.deepEqual(events, [0, 1]);
  assert.equal(result.ok, true);
});

test("бюджет времени останавливает прогон", async () => {
  const runner = new UniversalLoopRunner({
    generator: new MockGenerator({ scripted: ["плохо"], latencyMs: 30 }),
    validator: stubValidator("маркер"),
    contextBuilder: contextBuilderSpy(),
    config: { max_iterations: 50, max_total_seconds: 0.05 },
    logger: silentLogger,
  });
  const result = await runner.run("задача", tmpdir(), "demo");
  assert.equal(result.ok, false);
  assert.ok(result.iterations < 50);
  assert.match(result.reason, /бюджет времени/);
});

test("task-объект нормализуется, project_name подставляется", async () => {
  const seen = [];
  const runner = new UniversalLoopRunner({
    generator: new MockGenerator({ scripted: ["GOOD маркер"] }),
    validator: stubValidator("маркер"),
    contextBuilder: contextBuilderSpy(seen),
    config: { max_iterations: 1 },
    logger: silentLogger,
  });
  const result = await runner.run({ goal: "цель из объекта", extra: 1 }, tmpdir(), "pcpolimer");
  assert.equal(result.state.projectName, "pcpolimer");
  assert.equal(result.state.taskInput.extra, 1);
  assert.equal(seen[0].task, "цель из объекта");
});

test("раннер требует все три контракта (Generator/Validator/ContextBuilder)", () => {
  assert.throws(() => new UniversalLoopRunner({}), /generator/);
  assert.throws(
    () => new UniversalLoopRunner({ generator: new MockGenerator({}) }),
    /validator/,
  );
  assert.throws(
    () => new UniversalLoopRunner({ generator: new MockGenerator({}), validator: stubValidator("x") }),
    /contextBuilder/,
  );
});

test("createArtifact отклоняет пустой и нестроковый content", () => {
  assert.throws(() => createArtifact(null), /не может быть пустым/);
  assert.throws(() => createArtifact(42), /ожидалась строка или карта/);
  assert.equal(createArtifact("текст").metadata.kind, "text");
  assert.equal(createArtifact({ "a.txt": "x" }).metadata.kind, "files");
});
