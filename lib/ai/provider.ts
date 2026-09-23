import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import { updateDb } from "../store";
import { AiDebugSchema, type AiDebug, type AiProvider, type FieldKey } from "../types";

export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const PROVIDER_TIMEOUT_MS = 12_000;
export const INVALID_OUTPUT_RETRIES = 1;
export const PROVIDER_TEMPERATURE = 0.1;
type RemoteProvider = Exclude<AiProvider, "local">;

export interface StructuredRequest<T> {
  operation: "analyze" | "build-card";
  prompt: string;
  input: unknown;
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  fallback: () => unknown;
  validate: (value: T) => { result: T; rejectedFields: FieldKey[]; errors: string[] };
}

export class AiPersistenceError extends Error {
  constructor() {
    super("Не удалось сохранить журнал ИИ. Проверьте доступ к локальному хранилищу.");
    this.name = "AiPersistenceError";
  }
}
export class AiProcessingError extends Error {
  constructor() {
    super("Не удалось подготовить корректный ответ ИИ. Попробуйте ещё раз.");
    this.name = "AiProcessingError";
  }
}
class ProviderTimeoutError extends Error {
  constructor() { super("provider_timeout"); this.name = "ProviderTimeoutError"; }
}

export function createRemoteClient(provider: RemoteProvider): OpenAI {
  const apiKey = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.NVIDIA_API_KEY;
  if (!apiKey?.trim()) throw new Error(`Не задан ключ провайдера ${provider}.`);
  return new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: provider === "nvidia" ? NVIDIA_BASE_URL : "https://api.openai.com/v1",
    timeout: PROVIDER_TIMEOUT_MS,
    // SDK retries would multiply the deadline; retry invalid output explicitly below.
    maxRetries: 0,
  });
}

async function withDeadline<T>(request: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ProviderTimeoutError());
      controller.abort();
    }, PROVIDER_TIMEOUT_MS);
  });
  try {
    return await Promise.race([Promise.resolve().then(() => request(controller.signal)), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function stringify(value: unknown): string {
  try { return JSON.stringify(value) ?? ""; } catch { return "[unserializable]"; }
}
function redact(text: string): string {
  let safe = text;
  for (const secret of [process.env.OPENAI_API_KEY, process.env.NVIDIA_API_KEY]) {
    if (!secret?.trim()) continue;
    for (const representation of [secret, secret.trim(), JSON.stringify(secret).slice(1, -1)]) {
      safe = safe.split(representation).join("[REDACTED]");
    }
  }
  return safe;
}
function errorDetails(error: unknown): { code: string; rawOutput: string } {
  if (error instanceof ProviderTimeoutError || (error instanceof Error && error.name === "APIConnectionTimeoutError")) {
    return { code: "provider_timeout:12000ms", rawOutput: "" };
  }
  if (error && typeof error === "object") {
    const status = "status" in error && typeof error.status === "number" ? error.status : undefined;
    // Do not record request headers, SDK instances, or an error message that might echo a key.
    const rawOutput = "error" in error ? stringify(error.error) : "";
    return { code: status ? `provider_http_error:${status}` : "provider_error", rawOutput };
  }
  return { code: "provider_error", rawOutput: "" };
}
function validateOutput<T>(options: StructuredRequest<T>, value: unknown) {
  const parsed = options.schema.safeParse(value);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.issues.map((issue) => `schema_validation:${issue.path.join(".")}:${issue.message}`) };
  }
  try {
    const checked = options.validate(parsed.data);
    const final = options.schema.safeParse(checked.result);
    if (!final.success) return { ok: false as const, errors: ["post_validation_error"] };
    return { ok: true as const, ...checked, result: final.data };
  } catch {
    return { ok: false as const, errors: ["post_validation_error"] };
  }
}

/** All remote attempts are saved. Returned debug belongs to the provider that supplied the result. */
export async function runStructured<T>(options: StructuredRequest<T>): Promise<{ result: T; debug: AiDebug }> {
  const callId = `${options.operation}:${randomUUID()}`;
  async function record(provider: AiProvider, attempt: number, prompt: string, rawOutput: string, errors: string[], rejectedFields: FieldKey[] = []) {
    const debug = AiDebugSchema.parse({
      id: `${callId}:${provider}:${attempt}`,
      at: new Date().toISOString(),
      provider,
      prompt: redact(prompt),
      input: JSON.parse(redact(stringify(options.input))),
      rawOutput: redact(rawOutput),
      validation: { success: errors.length === 0, errors: errors.map(redact) },
      rejectedFields,
    });
    try {
      await updateDb((db) => { db.aiLogs.push(debug); });
    } catch {
      // Storage failure must not cause another paid request or hide missing audit data.
      throw new AiPersistenceError();
    }
    return debug;
  }

  for (const provider of ["openai", "nvidia"] as const) {
    const prefix = provider === "openai" ? "OPENAI" : "NVIDIA";
    if (!process.env[`${prefix}_API_KEY`]?.trim()) continue;
    const model = process.env[`${prefix}_MODEL`]?.trim();
    if (!model) {
      await record(provider, 0, options.prompt, "", [`configuration_error:${prefix}_MODEL`]);
      continue;
    }
    const client = createRemoteClient(provider);
    for (let attempt = 0; attempt <= INVALID_OUTPUT_RETRIES; attempt++) {
      const prompt = attempt === 0 ? options.prompt : `${options.prompt}\nThe previous response did not match the schema. Return one complete JSON object matching the supplied JSON Schema, without Markdown.`;
      let completion: OpenAI.Chat.Completions.ChatCompletion;
      try {
        completion = await withDeadline((signal) => client.chat.completions.create({
          model,
          temperature: PROVIDER_TEMPERATURE,
          stream: false,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: stringify(options.input) },
          ],
          ...(provider === "openai"
            ? { response_format: { type: "json_schema" as const, json_schema: { name: `taskready_${options.operation.replaceAll("-", "_")}`, strict: true, schema: options.jsonSchema } } }
            : { nvext: { guided_json: options.jsonSchema } }),
        }, { signal, timeout: PROVIDER_TIMEOUT_MS, maxRetries: 0 }));
      } catch (error) {
        const details = errorDetails(error);
        await record(provider, attempt + 1, prompt, details.rawOutput, [details.code]);
        break;
      }
      const choice = completion?.choices?.[0];
      const content = choice?.message?.content;
      const refusal = choice?.message?.refusal;
      const rawOutput = typeof content === "string" ? content : typeof refusal === "string" ? refusal : stringify(completion);
      if (choice?.message?.refusal || choice?.finish_reason === "content_filter") {
        await record(provider, attempt + 1, prompt, rawOutput, ["provider_refusal"]);
        break;
      }
      if (choice?.finish_reason !== "stop") {
        await record(provider, attempt + 1, prompt, rawOutput, ["incomplete_response"]);
        continue;
      }
      let value: unknown;
      try { value = JSON.parse(rawOutput); } catch {
        await record(provider, attempt + 1, prompt, rawOutput, ["invalid_json"]);
        continue;
      }
      const validated = validateOutput(options, value);
      if (!validated.ok) {
        await record(provider, attempt + 1, prompt, rawOutput, validated.errors);
        continue;
      }
      // Evidence violations drop unsupported fields; audit data keeps the reasons.
      const debug = await record(provider, attempt + 1, prompt, rawOutput, validated.errors, validated.rejectedFields);
      return { result: validated.result, debug };
    }
  }

  const fallback = options.fallback();
  const validated = validateOutput(options, fallback);
  if (!validated.ok) {
    await record("local", 1, options.prompt, stringify(fallback), validated.errors);
    throw new AiProcessingError();
  }
  const debug = await record("local", 1, options.prompt, stringify(fallback), validated.errors, validated.rejectedFields);
  return { result: validated.result, debug };
}
