import { BuildCardInputSchema, BuildCardResultSchema, buildCardJsonSchema, fieldKeys, type BuildCardInput, type BuildCardResult } from "../types";
import { BUILD_CARD_PROMPT } from "./prompts";
import { hasGroundedValue, validateEvidence } from "./evidence";
import { detectLanguage, isUnknownAnswer, localBuildCard } from "./local";
import { runStructured } from "./provider";

export function validateBuiltCard(value: BuildCardResult, input: BuildCardInput) {
  const checked = validateEvidence(value, [input.draftText, ...input.answers.map((answer) => answer.answer)]);
  const rejectedFields = [...checked.rejectedFields];
  const latestAnswers = new Map(input.answers.map((answer) => [answer.field, answer.answer]));
  for (const field of fieldKeys) {
    const candidate = checked.fields[field];
    const latestAnswer = latestAnswers.get(field);
    if (candidate && (isUnknownAnswer(candidate.value)
      || (latestAnswer !== undefined && (isUnknownAnswer(latestAnswer) || !hasGroundedValue(candidate, [latestAnswer]))))) {
      checked.fields[field] = null;
      rejectedFields.push(field);
    }
  }
  return { result: checked.fields, rejectedFields, errors: rejectedFields.map((field) => `rejected_unsupported:${field}`) };
}

export async function buildCard(draftText: string, answers: BuildCardInput["answers"]) {
  const input = BuildCardInputSchema.parse({ draftText, answers });
  const { result, debug } = await runStructured({
    operation: "build-card",
    prompt: `${BUILD_CARD_PROMPT}\nЯзык ответа: ${detectLanguage(input.draftText)}.`,
    input,
    schema: BuildCardResultSchema,
    jsonSchema: buildCardJsonSchema,
    fallback: () => localBuildCard(input.draftText, input.answers),
    validate: (value) => validateBuiltCard(value, input),
  });
  return { card: result, debug };
}
