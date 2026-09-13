/* ЦЕХ · Universal Loop Engine — validators/llm-judge.mjs
   LlmJudgeValidator: вторая модель оценивает артефакт по рубрике и возвращает
   строгий JSON {"score": 0..1, "reasoning": "…"}.

   Отличия от патча: JSON из ответа судьи извлекается устойчиво (модель любит
   добавлять пояснения вокруг), порог и ключ настраиваются, а при ошибке разбора
   фидбек содержит actionable-текст, а не «parse error».
*/

import { createFeedback, getFirst } from "../base.mjs";
import { stringifyArtifact } from "../context-builder.mjs";
import { extractJson, truncate } from "../text.mjs";
import { renderTemplate } from "../template.mjs";

export const DEFAULT_JUDGE_TEMPLATE = `Ты — арт-директор веб-студии ЦЕХ. Оцени артефакт по критериям и верни СТРОГО JSON.

## ЗАДАЧА
{{ task }}

## КРИТЕРИИ ОЦЕНКИ
{{ rubric }}

## АРТЕФАКТ
{{ artifact }}

{% if previous_errors %}## НА ЧТО ЖАЛОВАЛСЯ ВАЛИДАТОР РАНЬШЕ
{% for err in previous_errors %}- {{ err }}
{% endfor %}{% endif %}

## ФОРМАТ ОТВЕТА (только JSON, без пояснений и без code-fence)
{"score": 0.0, "verdict": "pass|fail", "reasoning": "1–3 предложения", "fixes": ["что исправить"]}
`;

export const DEFAULT_RUBRIC = `1. Соответствие задаче: артефакт решает ровно то, что просят.
2. Механика цеха: соблюдены CONSTITUTION (К-01…К-20), BANNED (B-01…B-23), QUOTAS (Q-01…Q-12).
3. Источники: приёмы опираются на skills/ и references/, easing — из motion/easing-curves.json.
4. Ремесло: нет сгенерированного мусора, клише, lorem ipsum, кнопок без отклика.
5. Пригодность: артефакт можно принять без ручной переработки.`;

export class LlmJudgeValidator {
  /** registry инжектит готовый генератор-судью. */
  static requires = Object.freeze(["judge"]);

  /** @param {Record<string, any>} [opts] */
  constructor(opts = {}) {
    this.judge = opts.judge ?? null;
    this.template = String(getFirst(opts, ["template", "judgePromptTemplate", "judge_prompt_template"], DEFAULT_JUDGE_TEMPLATE));
    this.rubric = String(getFirst(opts, ["rubric"], DEFAULT_RUBRIC));
    this.passThreshold = Number(getFirst(opts, ["passThreshold", "pass_threshold"], 0.8));
    this.scoreKey = String(getFirst(opts, ["scoreKey", "score_key"], "score"));
    this.maxArtifactChars = Number(getFirst(opts, ["maxArtifactChars", "max_artifact_chars"], 24000));
    this.maxRawChars = Number(getFirst(opts, ["maxRawChars", "max_raw_chars"], 2000));
    if (!this.judge || typeof this.judge.generate !== "function") {
      throw new TypeError("LlmJudgeValidator: нужен judge-генератор с методом generate() (validator.judge_generator в конфиге)");
    }
    if (typeof this.judge.run === "function") {
      throw new TypeError("LlmJudgeValidator: judge не должен быть раннером цикла (рекурсия запрещена)");
    }
  }

  describe() {
    return { type: "llm_judge", passThreshold: this.passThreshold, scoreKey: this.scoreKey, judge: this.judge?.describe?.() ?? null };
  }

  /**
   * @param {import("../base.mjs").Artifact} artifact
   * @param {import("../base.mjs").LoopState} state
   * @returns {Promise<import("../base.mjs").Feedback>}
   */
  async validate(artifact, state) {
    const iteration = Number(state?.iteration ?? 0);
    const prompt = renderTemplate(this.template, {
      task: String(state?.taskInput?.goal ?? state?.taskInput ?? "").slice(0, 4000),
      rubric: this.rubric,
      artifact: truncate(stringifyArtifact(artifact), this.maxArtifactChars),
      project_name: state?.projectName ?? "",
      iteration: iteration + 1,
      previous_errors: previousErrors(state),
    });

    let verdictArtifact;
    try {
      verdictArtifact = await this.judge.generate(prompt, state);
    } catch (e) {
      return createFeedback({
        ok: false,
        errors: [`судья не смог ответить: ${e?.message ?? e}`],
        codes: [e?.code ?? "E-JUDGE"],
        raw: null,
        metrics: { iteration },
      });
    }

    const text = typeof verdictArtifact?.content === "string" ? verdictArtifact.content : JSON.stringify(verdictArtifact?.content ?? "");
    const jsonSource = extractJson(text);
    if (!jsonSource) {
      return createFeedback({
        ok: false,
        errors: ["судья не вернул JSON — просим формат {\"score\": 0..1, \"reasoning\": \"…\"}; оценка не принята"],
        codes: ["E-JUDGE-PARSE"],
        raw: truncate(text, this.maxRawChars),
        metrics: { iteration },
      });
    }

    /** @type {any} */
    let verdict;
    try {
      verdict = JSON.parse(jsonSource);
    } catch (e) {
      return createFeedback({
        ok: false,
        errors: [`JSON судьи битый: ${e?.message ?? e}`],
        codes: ["E-JUDGE-PARSE"],
        raw: truncate(jsonSource, this.maxRawChars),
        metrics: { iteration },
      });
    }

    const rawScore = verdict?.[this.scoreKey] ?? verdict?.score ?? null;
    // Number(null) === 0 — поэтому null/пустую строку отдельно считаем «оценки нет»
    const score =
      typeof rawScore === "number"
        ? rawScore
        : typeof rawScore === "string" && rawScore.trim() !== ""
          ? Number(rawScore)
          : Number.NaN;
    if (!Number.isFinite(score)) {
      return createFeedback({
        ok: false,
        errors: [`в вердикте судьи нет числового «${this.scoreKey}» (получено: ${JSON.stringify(rawScore)})`],
        codes: ["E-JUDGE-SCHEMA"],
        raw: truncate(jsonSource, this.maxRawChars),
        metrics: { iteration },
      });
    }

    // Модели иногда выдают 0..100 — приводим к 0..1 детерминированно.
    const normalized = score > 1 ? score / 100 : score;
    const reasoning = String(verdict?.reasoning ?? verdict?.comment ?? "").trim();
    const fixes = Array.isArray(verdict?.fixes) ? verdict.fixes.map(String).filter(Boolean) : [];
    const ok = normalized >= this.passThreshold;

    return createFeedback({
      ok,
      errors: ok ? [] : [`оценка судьи ${normalized.toFixed(2)} < порога ${this.passThreshold}${reasoning ? `: ${reasoning}` : ""}`, ...(fixes.length > 0 ? fixes : [])],
      codes: ok ? ["OK"] : ["E-JUDGE-SCORE"],
      raw: { score: normalized, verdict: verdict?.verdict ?? null, reasoning: truncate(reasoning, 800), fixes },
      metrics: { iteration, score: normalized, threshold: this.passThreshold, judgeModel: verdictArtifact?.metadata?.model ?? null },
    });
  }
}

function previousErrors(state) {
  const history = Array.isArray(state?.history) ? state.history : [];
  const failed = history.filter((h) => h?.feedback && h.feedback.ok === false);
  const last = failed[failed.length - 1];
  return (last?.feedback?.errors ?? []).slice(0, 10);
}

export default LlmJudgeValidator;
