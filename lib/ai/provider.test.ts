import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AiDebug, Database } from "../types";

const state = vi.hoisted(() => ({
  complete: vi.fn(),
  persist: vi.fn(),
  logs: [] as AiDebug[],
  clients: [] as { apiKey: string; baseURL: string; timeout: number; maxRetries: number }[],
  requests: [] as { provider: string; body: Record<string, unknown>; options: { signal: AbortSignal } }[],
}));
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat: { completions: { create: (body: Record<string, unknown>, options: { signal: AbortSignal }) => Promise<unknown> } };
    constructor(config: { apiKey: string; baseURL: string; timeout: number; maxRetries: number }) {
      state.clients.push(config);
      const provider = config.baseURL.includes("nvidia") ? "nvidia" : "openai";
      this.chat = { completions: { create(body, options) {
        state.requests.push({ provider, body, options });
        return state.complete(provider, body, options);
      } } };
    }
  },
}));
vi.mock("../store", () => ({
  updateDb: (mutator: (db: Database) => unknown) => state.persist(mutator),
}));

import { AiPersistenceError, AiProcessingError, NVIDIA_BASE_URL, PROVIDER_TIMEOUT_MS, runStructured, type StructuredRequest } from "./provider";

const schema = z.strictObject({ value: z.string().nullable() });
function request(): StructuredRequest<z.infer<typeof schema>> {
  return {
    operation: "analyze",
    prompt: "Extract only user facts. Return JSON.",
    input: { draftText: "Known user fact" },
    schema,
    jsonSchema: z.toJSONSchema(schema),
    fallback: () => ({ value: null }),
    validate: (result) => ({ result, rejectedFields: [], errors: [] }),
  };
}
function completion(content = '{"value":"Known user fact"}', finish_reason = "stop", refusal: string | null = null) {
  return { choices: [{ message: { content, refusal }, finish_reason }] };
}
function configureBoth() {
  vi.stubEnv("OPENAI_API_KEY", "test-openai-secret-key");
  vi.stubEnv("OPENAI_MODEL", "test-openai-model");
  vi.stubEnv("NVIDIA_API_KEY", "test-nvidia-secret-key");
  vi.stubEnv("NVIDIA_MODEL", "test-nvidia-model");
}

beforeEach(() => {
  vi.resetAllMocks();
  state.logs.length = 0;
  state.clients.length = 0;
  state.requests.length = 0;
  for (const name of ["OPENAI_API_KEY", "OPENAI_MODEL", "NVIDIA_API_KEY", "NVIDIA_MODEL"]) vi.stubEnv(name, "");
  state.persist.mockImplementation(async (mutator: (db: Database) => unknown) => mutator({ tasks: [], teams: [], proposals: [], aiLogs: state.logs }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("structured provider chain", () => {
  it("works without keys and logs local output without constructing an SDK client", async () => {
    const output = await runStructured(request());
    expect(output.result).toEqual({ value: null });
    expect(output.debug.provider).toBe("local");
    expect(state.clients).toHaveLength(0);
    expect(state.logs).toEqual([output.debug]);
    expect(output.debug).toMatchObject({ prompt: request().prompt, input: request().input, rawOutput: '{"value":null}', validation: { success: true, errors: [] } });
  });

  it("uses low temperature, strict JSON Schema and no implicit SDK retries", async () => {
    configureBoth();
    state.complete.mockResolvedValue(completion());
    const output = await runStructured(request());
    expect(output.debug.provider).toBe("openai");
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0].body).toMatchObject({
      model: "test-openai-model", temperature: 0.1, stream: false,
      response_format: { type: "json_schema", json_schema: { strict: true, schema: request().jsonSchema } },
      messages: [{ role: "system", content: request().prompt }, { role: "user", content: JSON.stringify(request().input) }],
    });
    expect(state.clients[0]).toMatchObject({ timeout: 12_000, maxRetries: 0 });
    expect(state.logs[0].rawOutput).toBe('{"value":"Known user fact"}');
  });

  it("moves immediately to NVIDIA after an HTTP failure and sends guided JSON Schema", async () => {
    configureBoth();
    state.complete.mockRejectedValueOnce({ status: 429, error: { message: "rate limited" } }).mockResolvedValueOnce(completion());
    const output = await runStructured(request());
    expect(output.debug.provider).toBe("nvidia");
    expect(state.requests.map((r) => r.provider)).toEqual(["openai", "nvidia"]);
    expect(state.clients[1].baseURL).toBe(NVIDIA_BASE_URL);
    expect(state.requests[1].body).toMatchObject({ nvext: { guided_json: request().jsonSchema }, temperature: 0.1 });
    expect(state.logs[0].validation.errors).toEqual(["provider_http_error:429"]);
    expect(state.logs.map((log) => log.provider)).toEqual(["openai", "nvidia"]);
  });

  it("retries malformed JSON exactly once and records both raw outputs", async () => {
    configureBoth();
    state.complete.mockResolvedValueOnce(completion("not json")).mockResolvedValueOnce(completion());
    const output = await runStructured(request());
    expect(output.debug.provider).toBe("openai");
    expect(state.requests.map((r) => r.provider)).toEqual(["openai", "openai"]);
    expect(state.logs[0]).toMatchObject({ rawOutput: "not json", validation: { success: false, errors: ["invalid_json"] } });
    expect(state.logs[1].prompt).toContain("previous response");
  });

  it("falls through both invalid providers to local with at most four remote attempts", async () => {
    configureBoth();
    state.complete.mockResolvedValue(completion('{"unexpected":true}'));
    const output = await runStructured(request());
    expect(output.debug.provider).toBe("local");
    expect(state.requests.map((r) => r.provider)).toEqual(["openai", "openai", "nvidia", "nvidia"]);
    expect(state.logs.map((log) => log.provider)).toEqual(["openai", "openai", "nvidia", "nvidia", "local"]);
    for (const log of state.logs.slice(0, 4)) expect(log.validation.errors.join()).toContain("schema_validation");
  });

  it("aborts an unresponsive provider at 12 seconds before trying NVIDIA", async () => {
    vi.useFakeTimers();
    configureBoth();
    state.complete.mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce(completion());
    const pending = runStructured(request());
    await vi.advanceTimersByTimeAsync(PROVIDER_TIMEOUT_MS - 1);
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0].options.signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const output = await pending;
    expect(state.requests[0].options.signal.aborted).toBe(true);
    expect(output.debug.provider).toBe("nvidia");
    expect(state.logs[0].validation.errors).toEqual(["provider_timeout:12000ms"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("logs refusal and goes to the next provider without a JSON retry", async () => {
    configureBoth();
    state.complete.mockResolvedValueOnce(completion("", "stop", "refused")).mockResolvedValueOnce(completion());
    await runStructured(request());
    expect(state.requests.map((r) => r.provider)).toEqual(["openai", "nvidia"]);
    expect(state.logs[0].validation.errors).toEqual(["provider_refusal"]);
  });

  it("treats truncated output as invalid and retries once", async () => {
    configureBoth();
    state.complete.mockResolvedValueOnce(completion('{"value":', "length")).mockResolvedValueOnce(completion());
    await runStructured(request());
    expect(state.logs[0].validation.errors).toEqual(["incomplete_response"]);
    expect(state.requests).toHaveLength(2);
  });

  it("records unsupported evidence and returns only the sanitized result", async () => {
    configureBoth();
    state.complete.mockResolvedValue(completion('{"value":"invented"}'));
    const input = request();
    input.validate = () => ({ result: { value: null }, rejectedFields: ["data"], errors: ["rejected_unsupported:data"] });
    const output = await runStructured(input);
    expect(output.result).toEqual({ value: null });
    expect(output.debug).toMatchObject({ rejectedFields: ["data"], validation: { success: false, errors: ["rejected_unsupported:data"] } });
    expect(state.requests).toHaveLength(1);
  });

  it("does not send paid fallback requests when debug persistence fails", async () => {
    configureBoth();
    state.complete.mockResolvedValue(completion());
    state.persist.mockRejectedValue(new Error("disk failure"));
    await expect(runStructured(request())).rejects.toBeInstanceOf(AiPersistenceError);
    expect(state.requests).toHaveLength(1);
  });

  it("redacts configured API keys from debug input, prompt and raw error body", async () => {
    configureBoth();
    state.complete.mockRejectedValueOnce({ status: 401, error: { message: "invalid test-openai-secret-key" } }).mockResolvedValueOnce(completion());
    const input = request();
    input.input = { draftText: "test-nvidia-secret-key" };
    input.prompt = "test-openai-secret-key";
    await runStructured(input);
    const serialized = JSON.stringify(state.logs);
    expect(serialized).not.toContain("test-openai-secret-key");
    expect(serialized).not.toContain("test-nvidia-secret-key");
    expect(serialized).toContain("[REDACTED]");
  });

  it("logs missing model configuration, skips the remote call, and stays usable", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-secret-key");
    const output = await runStructured(request());
    expect(output.debug.provider).toBe("local");
    expect(state.complete).not.toHaveBeenCalled();
    expect(state.logs[0].validation.errors).toEqual(["configuration_error:OPENAI_MODEL"]);
  });

  it("rejects invalid local fallback and logs the validation failure", async () => {
    const input = request();
    input.fallback = () => ({ unexpected: 1 });
    await expect(runStructured(input)).rejects.toBeInstanceOf(AiProcessingError);
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].validation.success).toBe(false);
  });
});
