import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { rememberRole, roleForMode } from "./role-client";

beforeEach(() => {
  const jar = new Map<string, string>();
  vi.stubGlobal("document", {
    get cookie() { return [...jar].map(([key, value]) => `${key}=${value}`).join("; "); },
    set cookie(value: string) { const pair = value.split(";")[0]; const split = pair.indexOf("="); jar.set(pair.slice(0, split), pair.slice(split + 1)); },
  });
  vi.stubGlobal("location", { protocol: "http:" });
});
afterEach(() => vi.unstubAllGlobals());

it("restores both selected profiles after switching modes", () => {
  const business = { kind: "business", businessName: "Альфа" } as const;
  const team = { kind: "team", teamId: "team-b" } as const;
  const teams = [{ id: "team-a" }, { id: "team-b" }];
  rememberRole(business); rememberRole(team);
  expect(roleForMode("business", teams)).toEqual(business);
  rememberRole(business);
  expect(roleForMode("team", teams)).toEqual(team);
});

it("uses an available team when the remembered profile disappeared, and handles an empty list", () => {
  rememberRole({ kind: "team", teamId: "removed" });
  expect(roleForMode("team", [{ id: "available" }])).toEqual({ kind: "team", teamId: "available" });
  expect(roleForMode("team", [])).toBeUndefined();
});
