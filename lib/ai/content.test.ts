import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import {
  AnalyzeDraftResponseSchema,
  AnalyzeDraftStructuredResultSchema,
  BuildCardResponseSchema,
  BuildCardResultSchema,
  fieldKeys,
  type AiDebug,
  type FieldKey,
} from "../types";
import { detectLanguage, extractLabeledFields, localAnalyze, localBuildCard, questionsFor } from "./local";
import { analyzeDraft, validateAnalysis } from "./analyze";
import { buildCard, validateBuiltCard } from "./buildCard";

const runner = vi.hoisted(() => vi.fn());
vi.mock("./provider", () => ({ runStructured: runner }));

type MockOptions = {
  prompt: string;
  input: unknown;
  schema: z.ZodType;
  fallback: () => unknown;
  validate: (value: unknown) => { result: unknown; rejectedFields: FieldKey[]; errors: string[] };
};

beforeEach(() => {
  runner.mockReset();
  runner.mockImplementation(async (options: MockOptions) => {
    const raw = options.fallback();
    const checked = options.validate(options.schema.parse(raw));
    const debug: AiDebug = {
      id: "test-debug", at: "2026-09-23T00:00:00.000Z", provider: "local", prompt: options.prompt,
      input: options.input, rawOutput: JSON.stringify(raw),
      validation: { success: true, errors: checked.errors }, rejectedFields: checked.rejectedFields,
    };
    return { result: checked.result, debug };
  });
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("local fallback", () => {
  it.each([
    ["Клиенты редко возвращаются", "ru"],
    ["Клиенттер қайта келмейді", "kk"],
    ["Customers rarely return", "en"],
  ] as const)("detects language for %s and returns valid localized questions", (text, language) => {
    expect(detectLanguage(text)).toBe(language);
    const result = AnalyzeDraftStructuredResultSchema.parse(localAnalyze(text));
    expect(result.questions).toHaveLength(6);
    expect(result.questions.map((question) => question.field).slice(0, 3)).toEqual(["data", "expectedResult", "successCriteria"]);
    expect(result.questions.every((question) => detectLanguage(`${question.question} ${question.why}`) === language)).toBe(true);
    expect(Object.values(result.extracted).every((value) => value === null)).toBe(true);
  });

  it("extracts only explicit labeled fields and keeps their text verbatim", () => {
    const draft = "Мы — кафе, сроки не определены.\nНазвание: Возврат клиентов\nДанные: CSV за 12 недель\nОжидаемый результат: Дашборд для управляющего\nКонтакт: Не знаю";
    const fields = extractLabeledFields(draft);
    expect(fields.title).toEqual({ value: "Возврат клиентов", evidence: "Возврат клиентов" });
    expect(fields.data).toEqual({ value: "CSV за 12 недель", evidence: "CSV за 12 недель" });
    expect(fields.expectedResult?.value).toBe("Дашборд для управляющего");
    expect(fields.constraints).toBeNull();
    expect(fields.context).toBeNull();
    expect(fields.contact).toBeNull();
  });

  it("supports explicit Kazakh and English labels", () => {
    expect(extractLabeledFields("Деректер: 100 тапсырыс\nКүтілетін нәтиже: Бақылау тақтасы").data?.value).toBe("100 тапсырыс");
    expect(extractLabeledFields("Data: 100 orders\nExpected result: Dashboard").expectedResult?.value).toBe("Dashboard");
  });

  it("asks about missing fields and supplies verification questions when fewer than three are missing", () => {
    const partial = localAnalyze("Data: CSV for 12 weeks\nExpected result: Dashboard");
    expect(partial.missing).not.toContain("data");
    expect(partial.questions[0].field).toBe("successCriteria");
    expect(partial.questions.some((question) => question.field === "data")).toBe(false);
    const oneMissing = questionsFor(["title"], "en");
    expect(oneMissing).toHaveLength(3);
    expect(oneMissing[0].field).toBe("title");
    expect(oneMissing[1].question).toContain("still accurate");
    const complete = questionsFor([], "ru");
    expect(complete).toHaveLength(3);
    expect(complete.every((question) => question.question.includes("Актуальны"))).toBe(true);
  });

  it("copies field answers verbatim, gives the latest answer precedence, and leaves unknowns null", () => {
    const card = localBuildCard("Данные: Старый CSV", [
      { questionId: "q1", field: "data", answer: "Новый Excel за 6 месяцев" },
      { questionId: "q2", field: "constraints", answer: "За 3 недели" },
      { questionId: "q3", field: "constraints", answer: "Не знаю" },
    ]);
    expect(BuildCardResultSchema.safeParse(card).success).toBe(true);
    expect(card.data).toEqual({ value: "Новый Excel за 6 месяцев", evidence: "Новый Excel за 6 месяцев" });
    expect(card.constraints).toBeNull();
    expect(card.contact).toBeNull();
  });
});

describe("analysis and card validation", () => {
  it("rejects unsupported fields, recomputes missing, and repairs question priorities", () => {
    const result = localAnalyze("Клиенты редко возвращаются");
    result.extracted.data = { value: "CSV за 12 недель", evidence: "Есть данные" };
    result.missing = [];
    result.questions = questionsFor(["title", "contact", "users"], "ru", 3);
    const checked = validateAnalysis(result, "Клиенты редко возвращаются");
    expect(checked.result.extracted.data).toBeNull();
    expect(checked.result.missing).toEqual([...fieldKeys]);
    expect(checked.rejectedFields).toEqual(["data"]);
    expect(checked.errors).toContain("rejected_unsupported:data");
    expect(checked.result.questions[0].field).toBe("data");
  });

  it("keeps useful model questions in priority order", () => {
    const result = localAnalyze("We run a cafe");
    const specific = "Which sales records can your cafe provide, and for what period?";
    result.questions = result.questions.slice(0, 3).reverse();
    result.questions[2].question = specific;
    const checked = validateAnalysis(result, "We run a cafe");
    expect(checked.result.questions).toHaveLength(3);
    expect(checked.result.questions[0].question).toBe(specific);
    expect(checked.errors).toEqual([]);
  });

  it("replaces duplicate IDs, duplicate questions, and wrong-language questions", () => {
    for (const problem of ["id", "question", "language"]) {
      const result = localAnalyze("We run a cafe");
      if (problem === "id") result.questions[1].id = result.questions[0].id;
      if (problem === "question") result.questions[1].question = result.questions[0].question;
      if (problem === "language") result.questions = questionsFor([...fieldKeys], "ru");
      const checked = validateAnalysis(result, "We run a cafe");
      expect(checked.errors.some((error) => error.startsWith("questions_replaced"))).toBe(true);
      expect(new Set(checked.result.questions.map((question) => question.id)).size).toBe(checked.result.questions.length);
      expect(detectLanguage(checked.result.questions[0].question)).toBe("en");
    }
  });

  it("discards unknown answers even if a provider emits them as extracted values", () => {
    const card = extractLabeledFields("Data: Sales CSV");
    card.constraints = { value: "Не знаю", evidence: "Не знаю" };
    const checked = validateBuiltCard(card, { draftText: "Data: Sales CSV", answers: [{ questionId: "q", field: "constraints", answer: "Не знаю" }] });
    expect(checked.result.constraints).toBeNull();
    expect(checked.rejectedFields).toEqual(["constraints"]);
  });

  it("rejects an old fact when the user has supplied a newer answer for that field", () => {
    const card = extractLabeledFields("Data: Old CSV");
    const checked = validateBuiltCard(card, {
      draftText: "Data: Old CSV",
      answers: [
        { questionId: "q1", field: "data", answer: "CSV for 12 weeks" },
        { questionId: "q2", field: "data", answer: "Excel for 6 months" },
      ],
    });
    expect(checked.result.data).toBeNull();
    expect(checked.errors).toContain("rejected_unsupported:data");
  });
});

describe("content provider integration", () => {
  it("supplies a strict structured schema and returns partial public extracted fields", async () => {
    const result = await analyzeDraft("Данные: CSV за 12 недель", "Кафе");
    expect(AnalyzeDraftResponseSchema.safeParse(result).success).toBe(true);
    expect(result.extracted).toEqual({ data: { value: "CSV за 12 недель", evidence: "CSV за 12 недель" } });
    expect(result.missing).not.toContain("data");
    const options = runner.mock.calls[0][0];
    expect(options.operation).toBe("analyze");
    expect(options.jsonSchema.additionalProperties).toBe(false);
    expect(options.schema).toBe(AnalyzeDraftStructuredResultSchema);
    expect(options.prompt).not.toContain("CSV за 12 недель");
    expect(options.input).toEqual({ draftText: "Данные: CSV за 12 недель", industry: "Кафе" });
  });

  it("builds a complete nullable card with debug, without inventing other fields", async () => {
    const result = await buildCard("Мы — кафе", [{ questionId: "q", field: "data", answer: "Excel за 6 месяцев" }]);
    expect(BuildCardResponseSchema.safeParse(result).success).toBe(true);
    expect(Object.keys(result.card)).toEqual([...fieldKeys]);
    expect(result.card.data?.value).toBe("Excel за 6 месяцев");
    expect(result.card.expectedResult).toBeNull();
    expect(result.debug.provider).toBe("local");
    expect(runner.mock.calls[0][0].operation).toBe("build-card");
  });

  it("validates user input before invoking any provider", async () => {
    await expect(analyzeDraft("  ", "Кафе")).rejects.toThrow();
    await expect(buildCard("Кафе", [{ questionId: "q", field: "data", answer: " " }])).rejects.toThrow();
    expect(runner).not.toHaveBeenCalled();
  });
});
