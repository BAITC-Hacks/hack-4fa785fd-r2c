import { fieldKeys, type ExtractedField, type FieldKey } from "../types";

export function normalizeEvidence(text: string): string {
  return text.toLowerCase().replace(/\s+/gu, " ").trim();
}

/** Exact substring after case/whitespace normalization; no semantic inference. */
export function hasEvidence(evidence: string, sources: readonly string[]): boolean {
  const quote = normalizeEvidence(evidence);
  return quote.length > 0 && sources.some((source) => normalizeEvidence(source).includes(quote));
}

export function hasGroundedValue(field: ExtractedField, sources: readonly string[]): boolean {
  const value = normalizeEvidence(field.value);
  return value.length > 0
    && hasEvidence(field.evidence, sources)
    && normalizeEvidence(field.evidence) === value;
}

/** A true quote with an unrelated invented value must also be rejected. */
export function validateEvidence<T extends Partial<Record<FieldKey, ExtractedField | null>>>(
  fields: T,
  sources: readonly string[],
): { fields: { [Key in keyof T]: T[Key] | null }; rejectedFields: FieldKey[] } {
  const result: { [Key in keyof T]: T[Key] | null } = { ...fields };
  const rejectedFields: FieldKey[] = [];
  for (const key of fieldKeys) {
    const field = fields[key];
    if (field && !hasGroundedValue(field, sources)) {
      rejectedFields.push(key);
      // Preserve the complete nullable shape of buildCard results.
      Object.assign(result, { [key]: null });
      console.warn("rejected_unsupported", { field: key });
    }
  }
  return { fields: result, rejectedFields };
}
