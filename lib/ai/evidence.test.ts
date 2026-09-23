import { afterEach, describe, expect, it, vi } from "vitest";
import { hasEvidence, hasGroundedValue, normalizeEvidence, validateEvidence } from "./evidence";

afterEach(() => vi.restoreAllMocks());

describe("evidence grounding", () => {
  it("normalizes case and all whitespace while preserving punctuation and numbers", () => {
    expect(normalizeEvidence("  CSV\n  за\t2\u00a0месяца.  ")).toBe("csv за 2 месяца.");
    expect(hasEvidence("csv за 2 месяца", ["Доступен CSV\nза  2 месяца."])).toBe(true);
    expect(hasEvidence("CSV за 3 месяца", ["CSV за 2 месяца"])).toBe(false);
    expect(hasEvidence("CSV, за 2 месяца", ["CSV за 2 месяца"])).toBe(false);
  });

  it("supports Kazakh and English without translating a quote", () => {
    expect(hasEvidence("ҚЫРКҮЙЕК ДЕРЕКТЕРІ", ["Қыркүйек деректері бар."])).toBe(true);
    expect(hasEvidence("sales DATA", ["Sales data is available."])).toBe(true);
    expect(hasEvidence("sales data", ["Есть данные продаж"])).toBe(false);
  });

  it("rejects missing, blank, or invented quotes", () => {
    expect(hasEvidence("", ["anything"])).toBe(false);
    expect(hasEvidence(" \n ", ["anything"])).toBe(false);
    expect(hasEvidence("anything", [])).toBe(false);
    expect(hasEvidence("Budget: $1000", ["We run a cafe."])).toBe(false);
  });

  it("never constructs a quote by joining independently supplied answers", () => {
    expect(hasEvidence("sales data is available", ["sales data", "is available"])).toBe(false);
  });

  it("rejects an invented value even when its evidence quote is real", () => {
    expect(hasGroundedValue({ value: "Budget: $1000", evidence: "We run a cafe" }, ["We run a cafe"])).toBe(false);
    expect(hasGroundedValue({ value: "", evidence: "We run a cafe" }, ["We run a cafe"])).toBe(false);
    expect(hasGroundedValue({ value: "run a cafe", evidence: "We run a cafe" }, ["We run a cafe"])).toBe(false);
    expect(hasGroundedValue({ value: "we run a cafe", evidence: "We run a cafe" }, ["We run a cafe"])).toBe(true);
  });

  it("rejects a value that drops a denial from the supplied evidence", () => {
    const source = "Есть бюджет 1000 долларов? Нет, бюджета нет.";
    expect(hasGroundedValue({ value: "Есть бюджет 1000 долларов", evidence: source }, [source])).toBe(false);
    expect(hasGroundedValue({ value: source, evidence: source }, [source])).toBe(true);
  });

  it("rejects a value that drops a condition from the supplied evidence", () => {
    const source = "CSV доступен только после согласования с владельцем.";
    expect(hasGroundedValue({ value: "CSV доступен", evidence: source }, [source])).toBe(false);
    expect(hasGroundedValue({ value: source, evidence: source }, [source])).toBe(true);
  });

  it("nulls unsupported fields, preserves supported fields and does not mutate the input", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const input = {
      data: { value: "CSV for 12 weeks", evidence: "CSV for 12 weeks" },
      constraints: { value: "Budget $1000", evidence: "We run a cafe" },
      users: null,
    };
    const result = validateEvidence(input, ["We run a cafe. CSV for 12 weeks."]);
    expect(result.fields).toEqual({ data: input.data, constraints: null, users: null });
    expect(input.constraints.value).toBe("Budget $1000");
    expect(result.rejectedFields).toEqual(["constraints"]);
    expect(warn).toHaveBeenCalledWith("rejected_unsupported", { field: "constraints" });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
