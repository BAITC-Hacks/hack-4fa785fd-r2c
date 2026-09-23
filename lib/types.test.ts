import { describe, expect, it } from "vitest";
import {
  AnalyzeDraftInputSchema,
  AnalyzeDraftResultSchema,
  BuildCardResultSchema,
  CardSchema,
  CatalogQuerySchema,
  CreateProposalInputSchema,
  IsoDateTimeSchema,
  RoleSchema,
  analyzeDraftJsonSchema,
  buildCardJsonSchema,
  fieldKeys,
} from "./types";

const questions = ["data", "expectedResult", "successCriteria"].map(
  (field, index) => ({
    id: `question-${index + 1}`,
    field,
    question: "Какие сведения вы можете уточнить?",
    why: "Эти сведения помогут команде понять задачу.",
  }),
);

describe("shared contract", () => {
  it("rejects unknown API input keys", () => {
    expect(
      AnalyzeDraftInputSchema.safeParse({
        draftText: "Описание задачи",
        industry: "Образование",
        score: 100,
      }).success,
    ).toBe(false);
  });

  it("requires every card field and rejects unknown fields", () => {
    const card = Object.fromEntries(
      fieldKeys.map((field) => [
        field,
        { value: "", confirmed: false, source: "user_edited" },
      ]),
    );
    expect(CardSchema.safeParse(card).success).toBe(true);
    expect(CardSchema.safeParse({ ...card, extra: {} }).success).toBe(false);
    const withoutTitle = { ...card };
    delete withoutTitle.title;
    expect(CardSchema.safeParse(withoutTitle).success).toBe(false);
  });

  it("requires between three and six clarification questions", () => {
    const result = { extracted: {}, missing: fieldKeys, questions };
    expect(AnalyzeDraftResultSchema.safeParse(result).success).toBe(true);
    expect(
      AnalyzeDraftResultSchema.safeParse({
        ...result,
        questions: questions.slice(0, 2),
      }).success,
    ).toBe(false);
    expect(
      AnalyzeDraftResultSchema.safeParse({
        ...result,
        questions: [...questions, ...questions, questions[0]],
      }).success,
    ).toBe(false);
  });

  it("represents missing LLM facts as null in a complete structured card", () => {
    const card = Object.fromEntries(fieldKeys.map((field) => [field, null]));
    expect(BuildCardResultSchema.safeParse(card).success).toBe(true);
    expect(BuildCardResultSchema.safeParse({}).success).toBe(false);
    expect(buildCardJsonSchema.required).toEqual([...fieldKeys]);
    expect(buildCardJsonSchema.additionalProperties).toBe(false);
    expect(analyzeDraftJsonSchema.required).toEqual([
      "extracted",
      "missing",
      "questions",
    ]);
  });

  it("only accepts HTTP or HTTPS prototype URLs", () => {
    const proposal = {
      teamId: "team-1",
      idea: "Идея решения",
      plan: "План работы",
      timeline: "Одна неделя",
      prototypeUrl: "https://example.com/prototype",
    };
    expect(CreateProposalInputSchema.safeParse(proposal).success).toBe(true);
    for (const prototypeUrl of ["javascript:alert(1)", "file:///tmp/demo", ""]) {
      expect(
        CreateProposalInputSchema.safeParse({ ...proposal, prototypeUrl }).success,
      ).toBe(false);
    }
  });

  it("validates dates, role cookies, and empty catalog filters", () => {
    expect(IsoDateTimeSchema.safeParse("2026-09-23T12:00:00.000Z").success).toBe(
      true,
    );
    expect(IsoDateTimeSchema.safeParse("yesterday").success).toBe(false);
    expect(
      RoleSchema.safeParse({ kind: "team", teamId: "team-1" }).success,
    ).toBe(true);
    expect(
      RoleSchema.safeParse({ kind: "team", businessName: "Компания" }).success,
    ).toBe(false);
    expect(
      CatalogQuerySchema.parse({ industry: "", level: "", teamId: "" }),
    ).toEqual({ industry: undefined, level: undefined, teamId: undefined });
    expect(CatalogQuerySchema.safeParse({ level: "unknown" }).success).toBe(false);
  });
});
