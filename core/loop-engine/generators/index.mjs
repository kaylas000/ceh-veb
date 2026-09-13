/* ЦЕХ · Universal Loop Engine — generators/index.mjs
   Реестр генераторов + фабрика из конфига. */

import { ConfigError, getFirst } from "../base.mjs";
import { LlmGenerator } from "./llm.mjs";
import { MockGenerator } from "./mock.mjs";

/** @type {Record<string, any>} */
export const GENERATORS = Object.freeze({
  llm: LlmGenerator,
  openai: LlmGenerator,
  anthropic: LlmGenerator,
  mock: MockGenerator,
});

/**
 * Создаёт генератор из секции `generator:` конфига.
 * @param {Record<string, any>} config
 * @param {{ studioRoot?: string, projectName?: string, systemPrompt?: string|null, logger?: any }} [ctx]
 */
export function createGeneratorFromConfig(config = {}, ctx = {}) {
  const type = String(getFirst(config, ["type", "provider"], "llm")).toLowerCase();

  if (type === "mock" || getFirst(config, ["dryRun", "dry_run"], false) === true) {
    return new MockGenerator({
      model: getFirst(config, ["model"], "mock-1"),
      scripted: getFirst(config, ["scripted"], null),
      fromFile: getFirst(config, ["fromFile", "from_file"], null),
      cycle: Boolean(getFirst(config, ["cycle"], false)),
      latencyMs: Number(getFirst(config, ["latencyMs", "latency_ms"], 0)),
      systemPrompt: ctx.systemPrompt ?? "mock",
    });
  }

  if (type === "llm" || type === "openai" || type === "anthropic") {
    const provider = type === "llm" ? String(getFirst(config, ["provider"], "openai")).toLowerCase() : type;
    const clientSpec = getFirst(config, ["client"], {}) ?? {};
    return new LlmGenerator({
      provider: String(getFirst(clientSpec, ["provider"], provider)).toLowerCase(),
      baseUrl: getFirst(clientSpec, ["baseUrl", "base_url"], getFirst(config, ["baseUrl", "base_url"], null)) ?? undefined,
      apiKeyEnv: getFirst(clientSpec, ["apiKeyEnv", "api_key_env"], getFirst(config, ["apiKeyEnv", "api_key_env"], null)) ?? undefined,
      apiKey: getFirst(clientSpec, ["apiKey", "api_key"], getFirst(config, ["apiKey", "api_key"], null)) ?? undefined,
      model: getFirst(config, ["model"], getFirst(clientSpec, ["model"], null)) ?? undefined,
      systemPrompt: ctx.systemPrompt ?? undefined,
      systemPromptTemplate: ctx.systemPromptTemplate ?? null,
      maxTokens: getFirst(config, ["maxTokens", "max_tokens"], 8192),
      timeoutMs: getFirst(config, ["timeoutMs", "timeout_ms"], 180000),
      maxRetries: getFirst(config, ["maxRetries", "max_retries"], 2),
      responseFormat: getFirst(config, ["responseFormat", "response_format"], "text"),
      jsonMode: Boolean(getFirst(config, ["jsonMode", "json_mode"], false)),
      extraBody: getFirst(config, ["extraBody", "extra_body"], {}),
      extraHeaders: getFirst(config, ["extraHeaders", "extra_headers"], {}),
      clientFactory: getFirst(config, ["clientFactory", "client_factory"], null) ?? undefined,
      client: typeof clientSpec === "object" && clientSpec !== null && !("type" in clientSpec) && Object.keys(clientSpec).length > 0 ? clientSpec : null,
      logger: ctx.logger ?? null,
    });
  }

  throw new ConfigError(`generator.type «${type}» неизвестен. Доступны: ${Object.keys(GENERATORS).join(", ")}`, {
    code: "E-CONFIG-GENERATOR",
  });
}

export { LlmGenerator, MockGenerator };
