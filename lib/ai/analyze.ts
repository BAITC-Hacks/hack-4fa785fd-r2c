import {
  AnalyzeDraftInputSchema,
  AnalyzeDraftResultSchema,
  AnalyzeDraftStructuredResultSchema,
  analyzeDraftJsonSchema,
  fieldKeys,
  type AnalyzeDraftStructuredResult,
} from "../types";
import { normalizeEvidence, validateEvidence } from "./evidence";
import { detectLanguage, fieldWeights, isUnknownAnswer, localAnalyze, prioritizedMissing, questionsFor } from "./local";
import { ANALYZE_PROMPT } from "./prompts";
import { runStructured } from "./provider";

export function validateAnalysis(value: AnalyzeDraftStructuredResult, draftText: string) {
  const checked = validateEvidence(value.extracted, [draftText]);
  const rejectedFields = [...checked.rejectedFields];
  for (const field of fieldKeys) {
    if (checked.fields[field] && isUnknownAnswer(checked.fields[field].value)) {
      checked.fields[field] = null;
      rejectedFields.push(field);
    }
  }
  const errors = rejectedFields.map((field) => `rejected_unsupported:${field}`);
  const missing = fieldKeys.filter((field) => checked.fields[field] === null);
  const language = detectLanguage(draftText);
  const candidate = [...value.questions].sort((a, b) => fieldWeights[b.field] - fieldWeights[a.field]);
  const requiredMissing = prioritizedMissing(missing).slice(0, candidate.length);
  const unique = (values: string[]) => new Set(values).size === values.length;
  const useful = candidate.length >= 3 && candidate.length <= 6
    && unique(candidate.map((question) => question.id))
    && unique(candidate.map((question) => question.field))
    && unique(candidate.map((question) => normalizeEvidence(question.question)))
    && candidate.every((question) => question.question.trim().length >= 15 && question.why.trim().length >= 10)
    && requiredMissing.every((field) => candidate.some((question) => question.field === field))
    && detectLanguage(candidate.map((question) => `${question.question} ${question.why}`).join(" ")) === language;
  if (!useful) errors.push("questions_replaced: use unique questions about the highest-priority missing fields in the input language");
  return {
    result: { extracted: checked.fields, missing, questions: useful ? candidate : questionsFor(missing, language) },
    rejectedFields,
    errors,
  };
}

export async function analyzeDraft(draftText: string, industry: string) {
  const input = AnalyzeDraftInputSchema.parse({ draftText, industry });
  const { result, debug } = await runStructured({
    operation: "analyze",
    prompt: `${ANALYZE_PROMPT}\nЯзык ответа: ${detectLanguage(input.draftText)}.`,
    input,
    schema: AnalyzeDraftStructuredResultSchema,
    jsonSchema: analyzeDraftJsonSchema,
    fallback: () => localAnalyze(input.draftText),
    validate: (value) => validateAnalysis(value, input.draftText),
  });
  const extracted = Object.fromEntries(Object.entries(result.extracted).filter(([, field]) => field !== null));
  return { ...AnalyzeDraftResultSchema.parse({ ...result, extracted }), debug };
}
