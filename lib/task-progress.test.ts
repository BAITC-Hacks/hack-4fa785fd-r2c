import { expect, it } from "vitest";
import seed from "../data/seed.json";
import { TaskSchema } from "./types";
import { calculateScore } from "./scoring";
import { getNextStep, observedPosition } from "./task-progress";

it("groups missing checks for one field and suggests a reachable next level", () => {
  const full = TaskSchema.parse(seed.tasks.find((entry) => entry.score.total === 100));
  const card = { ...full.card, successCriteria: { ...full.card.successCriteria, value: "", confirmed: false } };
  const score = calculateScore(card);
  expect(score.total).toBe(85);
  expect(getNextStep(score, score.total)).toMatchObject({ field: "successCriteria", points: 15, levelName: "Приоритетной" });
  expect(getNextStep(calculateScore(full.card), 100)).toBeNull();
});

it("reports only observed published positions with the matching saved score", () => {
  const current = TaskSchema.parse(seed.tasks.find((entry) => entry.status === "published"));
  const lower = { ...current, id: "lower", score: { ...current.score, total: -1 } };
  expect(observedPosition(current, [lower, current])).toBe(1);
  expect(observedPosition(current, [{ ...current, score: { ...current.score, total: current.score.total + 1 } }])).toBeNull();
  expect(observedPosition({ ...current, status: "draft" }, [current])).toBeNull();
  expect(observedPosition(current)).toBeNull();
});
