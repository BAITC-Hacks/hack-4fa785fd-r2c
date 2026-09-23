import { afterEach, expect, it, vi } from "vitest";
import seed from "../data/seed.json";
import { TaskSchema, fieldKeys } from "./types";
import { calculateScore } from "./scoring";
import { saveTaskCard } from "./task-client";
import { confirmNonemptyFields, editCardField, levelUpgradeMessage } from "./card-confirmation";

afterEach(() => vi.unstubAllGlobals());

it("previews without awarding points and confirms nonempty fields in one PATCH using the server score", async () => {
  const task = TaskSchema.parse(seed.tasks.find((entry) => entry.score.total === 100));
  const card = { ...task.card };
  for (const key of fieldKeys) card[key] = { ...card[key], confirmed: false };
  card.title = { ...card.title, value: "   " };
  expect(calculateScore(card)).toMatchObject({ total: 0, potential: 100 });
  const confirmed = confirmNonemptyFields(card);
  expect(confirmed.title.confirmed).toBe(false);
  expect(card.data.confirmed).toBe(false);
  expect(confirmed.data.source).toBe(card.data.source);
  const saved = { ...task, card: confirmed, score: calculateScore(confirmed) };
  const fetchMock = vi.fn().mockResolvedValue(Response.json(saved));
  vi.stubGlobal("fetch", fetchMock);
  const result = await saveTaskCard(task.id, confirmed);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(`/api/tasks/${task.id}`, expect.objectContaining({ method: "PATCH", body: JSON.stringify({ card: confirmed }) }));
  expect(result.score).toEqual(saved.score);
  expect(levelUpgradeMessage("workable", "ready")).toBe("Задача стала Готовой!");
});

it("confirms a manual edit, removes stale evidence, and does not confirm an empty field", () => {
  const task = TaskSchema.parse(seed.tasks[0]);
  const edited = editCardField(task.card, "data", "CSV с 1200 заказами за 6 месяцев");
  expect(edited.data).toEqual({ value: "CSV с 1200 заказами за 6 месяцев", source: "user_edited", confirmed: true });
  expect(calculateScore(edited).blocks.find((block) => block.key === "data")?.earned).toBe(20);
  const cleared = editCardField(edited, "data", " \n ");
  expect(cleared.data).toEqual({ value: " \n ", source: "user_edited", confirmed: false });
  expect(calculateScore(cleared).blocks.find((block) => block.key === "data")?.earned).toBe(0);
  expect(levelUpgradeMessage("ready", "workable")).toBe("");
});
