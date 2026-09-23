import { expect, it } from "vitest";
import seed from "../data/seed.json";
import { TaskSchema, type Task } from "./types";
import { projectCatalogPosition } from "./catalog";

const base = TaskSchema.parse(seed.tasks[0]);
function task(id: string, total: number, publishedAt: string, status: Task["status"] = "published"): Task {
  return { ...base, id, status, publishedAt: status === "published" ? publishedAt : undefined, score: { ...base.score, total } };
}

it("projects published improvements without duplicates, using publication time and stable ties", () => {
  const current = task("current", 73, "2026-09-23T10:00:00Z");
  const newer = task("newer", 80, "2026-09-23T11:00:00Z");
  const older = task("older", 80, "2026-09-23T09:00:00Z");
  const draft = task("draft", 100, "", "draft");
  expect(projectCatalogPosition(current, 7, [current, newer, older, draft])).toEqual({ position: 2, total: 3 });
  const sameTime = task("same-time", 80, current.publishedAt!);
  expect(projectCatalogPosition(current, 7, [sameTime, current])).toEqual({ position: 2, total: 2 });
  expect(current.score.total).toBe(73);
  expect(projectCatalogPosition(current, 50, [newer, current])).toEqual({ position: 1, total: 2 });
});

it("adds a draft as a new publication and distinguishes empty from unavailable catalogs", () => {
  const draft = task("draft", 73, "", "draft");
  const now = "2026-09-23T12:00:00Z";
  const older = task("older", 80, "2026-09-23T11:00:00Z");
  expect(projectCatalogPosition(draft, 7, [older], now)).toEqual({ position: 1, total: 2 });
  expect(projectCatalogPosition(draft, 7, [], now)).toEqual({ position: 1, total: 1 });
  expect(projectCatalogPosition(draft, 7)).toBeNull();
  expect(draft.publishedAt).toBeUndefined();
});
