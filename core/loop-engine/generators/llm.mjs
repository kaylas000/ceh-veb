/* ЦЕХ · Universal Loop Engine — generators/llm.mjs
   LlmGenerator: адаптер над LLM. Ноль npm-зависимостей — только встроенный fetch (Node ≥18).

   Почему не openai/anthropic SDK: (1) закон цеха — ноль зависимостей; (2) Python-патч
   требовал «не импортировать SDK на уровне модуля» — здесь их вообще нет в графе импортов.

   Провайдеры:
     • openai     — любой OpenAI-совместимый эндпоинт (OpenAI, OpenRouter, vLLM, Ollama, LM Studio…)
     • anthropic  — Messages API
     • sdk-клиент — можно передать готовый клиент (clientFactory/client):
                    .chat.completions.create(...)  → openai-стиль
                    .messages.create(...)          → anthropic-стиль
                    .complete(messages, opts)      → свой адаптер

   Температура берётся из state.temperature (её ставит раннер по расписанию).
   В Python-патче генератор доставал температуру из метаданных ПРЕДЫДУЩЕГО артефакта —
   это давало сдвиг на итерацию; здесь сдвига нет.
*/

import { GeneratorError, createArtifact, getFirst, taskGoal } from "../base.mjs";
import { renderTemplate } from "../template.mjs";
import { parseArtifactContent } from "../text.mjs";

const DEFAULTS = Object.freeze({
  openai: { baseUrl: "https://api.openai.com/v1", apiKeyEnv: "OPENAI_API_KEY", model: "gpt-4o-mini" },
  anthropic: { baseUrl: "https://api.anthropic.com", apiKeyEnv: "ANTHROPIC_API_KEY", model: "claude-3-5-sonnet-latest" },
});

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export class LlmGenerator {
  /** DI-метка: что подставляет registry.mjs. */
  static requires = Object.freeze(["studioRoot", "projectName", "systemPrompt"]);

  /** @param {Record<string, any>} [opts] */
  constructor(opts = {}) {
    this.provider = String(opts.provider ?? "openai").toLowerCase();
    const preset = DEFAULTS[this.provider] ?? DEFAULTS.openai;

    this.baseUrl = String(getFirst(opts, ["baseUrl", "base_url"], process.env.CEH_LLM_BASE_URL ?? preset.baseUrl)).replace(/\/+$/, "");
    this.apiKeyEnv = String(getFirst(opts, ["apiKeyEnv", "api_key_env"], preset.apiKeyEnv));
    this.apiKey = getFirst(opts, ["apiKey", "api_key"], null) ?? process.env[this.apiKeyEnv] ?? null;
    this.model = String(
      getFirst(opts, ["model"], process.env.CEH_LLM_MODEL ?? preset.model),
    );
    this.systemPrompt = String(
      getFirst(opts, ["systemPrompt", "system_prompt"], "Ты — senior-инженер веб-студии ЦЕХ. Выдавай ТОЛЬКО запрошенный артефакт: без пояснений, без разметки вокруг."),
    );
    /**
     * Шаблон системного промпта (prompts/system.md). Рендерится на КАЖДОЙ итерации
     * с {{ task }}, {{ project_name }}, {{ iteration }}, {{ temperature }} — в отличие
     * от патча, где system.md читался один раз и плейсхолдеры оставались сырыми.
     * @type {string|null}
     */
    this.systemPromptTemplate = getFirst(opts, ["systemPromptTemplate", "system_prompt_template"], null);
    this.maxTokens = Number(getFirst(opts, ["maxTokens", "max_tokens"], 8192));
    this.timeoutMs = Number(getFirst(opts, ["timeoutMs", "timeout_ms"], 180000));
    this.maxRetries = Number(getFirst(opts, ["maxRetries", "max_retries"], 2));
    this.retryBaseMs = Number(getFirst(opts, ["retryBaseMs", "retry_base_ms"], 700));
    this.responseFormat = String(getFirst(opts, ["responseFormat", "response_format"], "text"));
    this.jsonMode = Boolean(getFirst(opts, ["jsonMode", "json_mode"], false));
    this.extraBody = getFirst(opts, ["extraBody", "extra_body"], {}) ?? {};
    this.extraHeaders = getFirst(opts, ["extraHeaders", "extra_headers"], {}) ?? {};
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch?.bind(globalThis) ?? null;

    /** Патч-совместимость: ленивая инициализация клиента без импортных сайд-эффектов. */
    this._clientFactory = typeof opts.clientFactory === "function" ? opts.clientFactory : typeof opts.client === "function" ? opts.client : null;
    this._client = opts.client && typeof opts.client === "object" ? opts.client : null;
    this._logger = opts.logger ?? null;
  }

  /** Ленивый клиент: создаётся при первом обращении (не на этапе импорта/сборки). */
  get client() {
    if (this._client) return this._client;
    if (this._clientFactory) {
      this._client = this._clientFactory();
      return this._client;
    }
    this._client = { kind: "fetch", provider: this.provider, baseUrl: this.baseUrl };
    return this._client;
  }

  /** Сводка без секретов (API-ключ никогда не логируется). */
  describe() {
    return {
      provider: this.provider,
      model: this.model,
      baseUrl: this.baseUrl,
      apiKeyEnv: this.apiKeyEnv,
      apiKeyPresent: Boolean(this.apiKey),
      maxTokens: this.maxTokens,
      responseFormat: this.responseFormat,
      timeoutMs: this.timeoutMs,
    };
  }

  /**
   * Контракт Generator: (context, state) -> Artifact.
   * @param {string} context
   * @param {import("../base.mjs").LoopState} state
   * @returns {Promise<import("../base.mjs").Artifact>}
   */
  async generate(context, state) {
    const started = Date.now();
    const temperature = Number.isFinite(state?.temperature) ? Number(state.temperature) : 0;
    const payload = this._buildPayload(context, temperature, state);
    const client = this.client;

    let lastError = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      if (attempt > 0) {
        const delay = this._backoffMs(attempt, lastError?.retryAfterMs);
        this._logger?.warn?.(`повтор ${attempt}/${this.maxRetries} через ${delay}ms`, { code: lastError?.code });
        await sleep(delay);
      }
      try {
        const raw = client && client.kind !== "fetch" ? await this._callSdkClient(client, payload) : await this._callHttp(payload);
        const text = String(raw.content ?? "");
        if (!text.trim()) {
          throw new GeneratorError("модель вернула пустой ответ", { code: "E-GEN-EMPTY", details: { raw: raw.usage ?? null } });
        }
        let parsed;
        try {
          parsed = parseArtifactContent(text, { format: this.responseFormat });
        } catch (e) {
          throw new GeneratorError(`ответ модели не разобран как ${this.responseFormat}: ${e?.message ?? e}`, {
            code: "E-GEN-PARSE",
            details: { snippet: text.slice(0, 400) },
          });
        }
        return createArtifact(parsed.content, {
          provider: this.provider,
          model: this.model,
          iteration: Number(state?.iteration ?? 0),
          temperature,
          latencyMs: Date.now() - started,
          promptChars: String(context ?? "").length,
          usage: raw.usage ?? null,
          finishReason: raw.finishReason ?? null,
          attempts: attempt + 1,
          responseFormat: parsed.format,
        });
      } catch (error) {
        lastError = error;
        const retryable = Boolean(error?.retryable) || RETRYABLE_STATUS.has(Number(error?.status));
        if (!retryable || attempt === this.maxRetries) break;
      }
    }

    if (lastError instanceof GeneratorError) throw lastError;
    throw new GeneratorError(`генератор не смог получить ответ: ${lastError?.message ?? lastError}`, {
      code: lastError?.code ?? "E-GEN",
      cause: lastError,
    });
  }

  /** Системный промпт: шаблон (если задан) рендерится под текущую задачу и итерацию. */
  _resolveSystemPrompt(state) {
    if (!this.systemPromptTemplate || typeof this.systemPromptTemplate !== "string") return this.systemPrompt;
    return renderTemplate(this.systemPromptTemplate, {
      task: taskGoal(state?.taskInput),
      goal: taskGoal(state?.taskInput),
      project_name: state?.projectName ?? "",
      iteration: Number(state?.iteration ?? 0) + 1,
      temperature: Number(state?.temperature ?? 0),
    });
  }

  _buildPayload(context, temperature, state) {
    const system = this._resolveSystemPrompt(state);
    if (this.provider === "anthropic") {
      return {
        provider: "anthropic",
        body: {
          model: this.model,
          max_tokens: this.maxTokens,
          temperature,
          system,
          messages: [{ role: "user", content: String(context ?? "") }],
          ...this.extraBody,
        },
      };
    }
    const body = {
      model: this.model,
      temperature,
      max_tokens: this.maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: String(context ?? "") },
      ],
      ...this.extraBody,
    };
    if (this.jsonMode && !("response_format" in body)) body.response_format = { type: "json_object" };
    return { provider: "openai", body };
  }

  /** Вызов через внешний SDK-клиент (если передан) — движок сам его не импортирует. */
  async _callSdkClient(client, payload) {
    if (typeof client?.complete === "function") {
      const res = await client.complete(payload.body.messages, { ...payload.body, provider: payload.provider });
      return normalizeSdkResult(res);
    }
    if (payload.provider === "anthropic" && typeof client?.messages?.create === "function") {
      const res = await client.messages.create(payload.body);
      return normalizeSdkResult(res);
    }
    if (typeof client?.chat?.completions?.create === "function") {
      const openaiBody = { ...payload.body };
      if (payload.provider === "anthropic") {
        openaiBody.messages = [
          { role: "system", content: payload.body.system },
          ...payload.body.messages,
        ];
        delete openaiBody.system;
      }
      const res = await client.chat.completions.create(openaiBody);
      return normalizeSdkResult(res);
    }
    throw new GeneratorError("переданный клиент не поддерживает ни .chat.completions.create, ни .messages.create, ни .complete", {
      code: "E-GEN-CLIENT",
    });
  }

  /** Вызов по HTTP встроенным fetch. */
  async _callHttp(payload) {
    if (!this.fetchImpl) throw new GeneratorError("в этой среде нет fetch (нужен Node ≥18)", { code: "E-GEN-FETCH" });
    if (!this.apiKey) {
      throw new GeneratorError(
        `нет API-ключа: установи переменную ${this.apiKeyEnv} (или передай generator.api_key в конфиге). Для офлайн-прогона используй --dry-run`,
        { code: "E-GEN-KEY" },
      );
    }

    const url =
      payload.provider === "anthropic" ? `${this.baseUrl.replace(/\/v1$/, "")}/v1/messages` : `${this.baseUrl}/chat/completions`;
    const headers = { "content-type": "application/json", ...this.extraHeaders };
    if (payload.provider === "anthropic") {
      headers["x-api-key"] = this.apiKey;
      headers["anthropic-version"] = headers["anthropic-version"] ?? "2023-06-01";
    } else {
      headers.authorization = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    /** @type {Response} */
    let response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload.body),
        signal: controller.signal,
      });
    } catch (e) {
      if (e?.name === "AbortError") {
        throw new GeneratorError(`таймаут запроса ${this.timeoutMs}ms к ${url}`, { code: "E-GEN-TIMEOUT", retryable: true });
      }
      throw new GeneratorError(`сетевая ошибка запроса к ${url}: ${e?.message ?? e}`, { code: "E-GEN-NETWORK", retryable: true, cause: e });
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text().catch(() => "");
    if (!response.ok) {
      const retryAfter = Number(response.headers?.get?.("retry-after") ?? 0);
      const err = new GeneratorError(
        `LLM HTTP ${response.status} ${response.statusText}: ${text.slice(0, 400)}`,
        {
          code: response.status === 401 || response.status === 403 ? "E-GEN-AUTH" : "E-GEN-HTTP",
          details: { status: response.status, url },
        },
      );
      err.status = response.status;
      err.retryable = RETRYABLE_STATUS.has(response.status);
      err.retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined;
      throw err;
    }

    /** @type {any} */
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new GeneratorError(`ответ не JSON: ${text.slice(0, 200)}`, { code: "E-GEN-PARSE", cause: e });
    }
    return normalizeSdkResult(data);
  }

  _backoffMs(attempt, retryAfterMs) {
    if (retryAfterMs) return Math.min(retryAfterMs, 30000);
    const base = this.retryBaseMs * 2 ** (attempt - 1);
    return Math.min(15000, Math.round(base + Math.random() * base * 0.25));
  }
}

/** Приводит ответ OpenAI/Anthropic/своего адаптера к {content, usage, finishReason}. */
function normalizeSdkResult(res) {
  if (!res || typeof res !== "object") return { content: String(res ?? ""), usage: null, finishReason: null };
  // OpenAI-стиль
  const choice = res.choices?.[0];
  if (choice?.message?.content !== undefined) {
    return {
      content: typeof choice.message.content === "string" ? choice.message.content : JSON.stringify(choice.message.content),
      usage: res.usage ?? null,
      finishReason: choice.finish_reason ?? null,
    };
  }
  // Anthropic-стиль
  if (Array.isArray(res.content)) {
    const text = res.content
      .map((block) => (typeof block === "string" ? block : block?.text ?? ""))
      .join("");
    return { content: text, usage: res.usage ?? null, finishReason: res.stop_reason ?? null };
  }
  // свой адаптер
  if (typeof res.content === "string") return { content: res.content, usage: res.usage ?? null, finishReason: res.finishReason ?? null };
  if (typeof res.text === "string") return { content: res.text, usage: res.usage ?? null, finishReason: res.finishReason ?? null };
  return { content: JSON.stringify(res), usage: null, finishReason: null };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default LlmGenerator;
