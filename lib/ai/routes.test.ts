import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as analyzePost } from "@/app/api/ai/analyze/route";
import { POST as buildCardPost } from "@/app/api/ai/build-card/route";
import {
  AnalyzeDraftResponseSchema,
  ApiErrorResponseSchema,
  BuildCardResponseSchema,
  BuildCardResultSchema,
  fieldKeys,
  type AiDebug,
  type AnalyzeDraftResponse,
  type BuildCardResponse,
} from "../types";
import { analyzeDraft } from "./analyze";
import { buildCard } from "./buildCard";
import { AiPersistenceError } from "./provider";

vi.mock("./analyze", () => ({ analyzeDraft: vi.fn() }));
vi.mock("./buildCard", () => ({ buildCard: vi.fn() }));

const debug: AiDebug = {
  id: "route-test:local:1",
  at: "2026-09-23T12:00:00.000Z",
  provider: "local",
  prompt: "Используй только сведения пользователя.",
  input: { draftText: "Нужен отчёт о продажах." },
  rawOutput: "{}",
  validation: { success: true, errors: [] },
  rejectedFields: [],
};
const analysis: AnalyzeDraftResponse = {
  extracted: {},
  missing: [...fieldKeys],
  questions: (["data", "expectedResult", "successCriteria"] as const).map((field, index) => ({
    id: `question-${index + 1}`,
    field,
    question: "Какие сведения по этому разделу вы можете предоставить?",
    why: "Это поможет команде уточнить задачу.",
  })),
  debug,
};
const built: BuildCardResponse = {
  card: BuildCardResultSchema.parse(Object.fromEntries(fieldKeys.map((field) => [field, null]))),
  debug,
};
const validInputs = {
  analyze: { draftText: "  Нужен отчёт о продажах.  ", industry: "  Розничная торговля  " },
  "build-card": {
    draftText: "  Нужен отчёт о продажах.  ",
    answers: [{ questionId: "question-1", field: "data", answer: "  CSV за 8 недель.  " }],
  },
};

function request(operation: string, body: unknown, raw = false) {
  return new Request(`http://localhost/api/ai/${operation}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? String(body) : JSON.stringify(body),
  });
}
async function expectError(response: Response, status: number) {
  expect(response.status).toBe(status);
  const body = ApiErrorResponseSchema.parse(await response.json());
  expect(body.error.trim().length).toBeGreaterThan(0);
  return body;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(analyzeDraft).mockResolvedValue(structuredClone(analysis));
  vi.mocked(buildCard).mockResolvedValue(structuredClone(built));
});

describe.each(["analyze", "build-card"] as const)("POST /api/ai/%s", (operation) => {
  const handler = operation === "analyze" ? analyzePost : buildCardPost;

  it("rejects malformed JSON before calling AI", async () => {
    await expectError(await handler(request(operation, "{broken", true)), 400);
    expect(analyzeDraft).not.toHaveBeenCalled();
    expect(buildCard).not.toHaveBeenCalled();
  });

  it.each([
    ["empty required text", { draftText: "   " }],
    ["unknown fields", { unexpected: "not allowed" }],
  ])("rejects %s before calling AI", async (_label, override) => {
    await expectError(await handler(request(operation, { ...validInputs[operation], ...override })), 400);
    expect(analyzeDraft).not.toHaveBeenCalled();
    expect(buildCard).not.toHaveBeenCalled();
  });

  it("returns a schema-valid success and passes normalized inputs to AI", async () => {
    const response = await handler(request(operation, validInputs[operation]));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    if (operation === "analyze") {
      expect(AnalyzeDraftResponseSchema.parse(await response.json())).toEqual(analysis);
      expect(analyzeDraft).toHaveBeenCalledExactlyOnceWith("Нужен отчёт о продажах.", "Розничная торговля");
      expect(buildCard).not.toHaveBeenCalled();
    } else {
      expect(BuildCardResponseSchema.parse(await response.json())).toEqual(built);
      expect(buildCard).toHaveBeenCalledExactlyOnceWith("Нужен отчёт о продажах.", [
        { questionId: "question-1", field: "data", answer: "CSV за 8 недель." },
      ]);
      expect(analyzeDraft).not.toHaveBeenCalled();
    }
  });

  it("returns a clear 500 when debug data cannot be persisted", async () => {
    const failure = new AiPersistenceError();
    vi.mocked(analyzeDraft).mockRejectedValue(failure);
    vi.mocked(buildCard).mockRejectedValue(failure);
    const body = await expectError(await handler(request(operation, validInputs[operation])), 500);
    expect(body.error).toBe(failure.message);
  });

  it("returns a generic 500 without leaking internal errors", async () => {
    const internalMessage = "private filesystem path /secrets/provider-key";
    vi.mocked(analyzeDraft).mockRejectedValue(new Error(internalMessage));
    vi.mocked(buildCard).mockRejectedValue(new Error(internalMessage));
    const body = await expectError(await handler(request(operation, validInputs[operation])), 500);
    expect(body.error).not.toContain(internalMessage);
    expect(body.error).not.toContain("/secrets");
  });

  it("does not send malformed AI results as a successful response", async () => {
    vi.mocked(analyzeDraft).mockResolvedValue({ ...analysis, questions: [] });
    vi.mocked(buildCard).mockResolvedValue({ ...built, card: {} } as BuildCardResponse);
    await expectError(await handler(request(operation, validInputs[operation])), 500);
  });
});

describe("operation-specific AI inputs", () => {
  it.each([{}, { industry: "   " }])("rejects missing or blank industry: %j", async (override) => {
    await expectError(await analyzePost(request("analyze", { draftText: "Нужен отчёт.", ...override })), 400);
    expect(analyzeDraft).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    "not an array",
    [{ questionId: "q-1", field: "unknown", answer: "Ответ пользователя" }],
    [{ questionId: "q-1", field: "data", answer: "   " }],
    [{ questionId: "q-1", field: "data", answer: "CSV за 8 недель", extra: true }],
    [{ field: "data", answer: "CSV за 8 недель" }],
  ])("rejects missing or invalid answers: %j", async (answers) => {
    await expectError(await buildCardPost(request("build-card", { draftText: "Нужен отчёт.", answers })), 400);
    expect(buildCard).not.toHaveBeenCalled();
  });

  it("accepts an empty answers array when only the draft is available", async () => {
    const response = await buildCardPost(request("build-card", { draftText: "Нужен отчёт.", answers: [] }));
    expect(response.status).toBe(200);
    expect(buildCard).toHaveBeenCalledExactlyOnceWith("Нужен отчёт.", []);
  });
});
