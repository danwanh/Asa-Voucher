import type { ZodType, ZodTypeDef } from "zod";

// Output type T, any input (the model reply is untrusted JSON).
type OutputSchema<T> = ZodType<T, ZodTypeDef, unknown>;
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

// Provider errors worth retrying on another model (overloaded, rate-limited, server error).
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

class AttemptError extends Error {
  constructor(public readonly reason: "timeout" | "network" | "status" | "invalid_output", public readonly status?: number) {
    super(reason);
  }
}

export function isAiConfigured() {
  return Boolean(env.AI_API_KEY);
}

function getModels(preferredModel?: string) {
  const fallbacks = (env.AI_FALLBACK_MODELS ?? "").split(",").map((model) => model.trim()).filter(Boolean);
  return [...new Set([preferredModel, env.AI_MODEL, ...fallbacks].filter((model): model is string => Boolean(model)))];
}

export type GenerateJsonOptions = {
  /** Tried before AI_MODEL, e.g. a faster model for latency-sensitive features. */
  preferredModel?: string;
};

async function callModel<T>(model: string, systemPrompt: string, userPrompt: string, schema: OutputSchema<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${env.AI_BASE_URL.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      signal: controller.signal
    });
  } catch (error) {
    throw new AttemptError(error instanceof Error && error.name === "AbortError" ? "timeout" : "network");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw new AttemptError("status", response.status);

  try {
    const body = (await response.json()) as ChatCompletionResponse;
    const content = body.choices?.[0]?.message?.content ?? "";
    // Some models wrap JSON in ```json fences even in JSON mode.
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return schema.parse(JSON.parse(cleaned));
  } catch {
    throw new AttemptError("invalid_output");
  }
}

/**
 * Calls an OpenAI-compatible chat completion API and returns the reply parsed as JSON
 * and validated against `schema`. Tries AI_MODEL first, then each AI_FALLBACK_MODELS entry
 * when the provider is overloaded or the reply is unusable.
 */
export async function generateJson<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: OutputSchema<T>,
  options: GenerateJsonOptions = {}
): Promise<T> {
  if (!env.AI_API_KEY) {
    throw new HttpError(503, "Tính năng AI chưa được cấu hình", "AI_NOT_CONFIGURED");
  }

  let lastError: AttemptError | undefined;
  for (const model of getModels(options.preferredModel)) {
    try {
      return await callModel(model, systemPrompt, userPrompt, schema);
    } catch (error) {
      lastError = error instanceof AttemptError ? error : new AttemptError("network");
      console.error(JSON.stringify({ event: "ai.attempt_failed", model, reason: lastError.reason, status: lastError.status }));
      // A non-retryable status (bad key, bad request, unknown model) will fail the same way on every model.
      const retryable = lastError.reason !== "status" || RETRYABLE_STATUSES.has(lastError.status ?? 0) || lastError.status === 404;
      if (!retryable) break;
    }
  }

  if (lastError?.status === 429) {
    throw new HttpError(429, "Dịch vụ AI đang quá tải, vui lòng thử lại sau", "AI_RATE_LIMITED");
  }
  if (lastError?.reason === "invalid_output") {
    throw new HttpError(502, "AI trả về kết quả không hợp lệ, vui lòng thử lại", "AI_UNAVAILABLE");
  }
  throw new HttpError(502, "Dịch vụ AI đang quá tải hoặc không phản hồi, vui lòng thử lại sau ít phút", "AI_UNAVAILABLE");
}
