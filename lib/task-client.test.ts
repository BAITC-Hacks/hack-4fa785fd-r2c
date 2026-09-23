import { afterEach, expect, it, vi } from "vitest";
import seed from "../data/seed.json";
import { TaskSchema } from "./types";
import { publishTask, saveTaskCard } from "./task-client";

afterEach(() => vi.unstubAllGlobals());

it("sends the complete card and returns the server rating; surfaces saving errors", async () => {
  const task = TaskSchema.parse(seed.tasks[0]);
  const card = { ...task.card, title: { value: "Новое название", confirmed: false, source: "user_edited" as const } };
  const serverTask = { ...task, card, score: { ...task.score, total: 37, potential: 91, level: "draft" as const } };
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(serverTask))
    .mockResolvedValueOnce(Response.json({ error: "Не удалось сохранить карточку." }, { status: 500 }));
  vi.stubGlobal("fetch", fetchMock);
  const result = await saveTaskCard(task.id, card);
  expect(result.score).toEqual(serverTask.score);
  expect(fetchMock).toHaveBeenCalledWith(`/api/tasks/${task.id}`, {
    cache: "no-store", method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card }),
  });
  await expect(saveTaskCard(task.id, card)).rejects.toThrow("Не удалось сохранить карточку.");
});

it("publishes and returns rank and destination only for a valid successful response", async () => {
  const task = TaskSchema.parse(seed.tasks[0]);
  const published = { ...task, status: "published", position: 2, total: 6 };
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(published))
    .mockResolvedValueOnce(Response.json({ error: "Укажите название." }, { status: 400 }))
    .mockResolvedValueOnce(Response.json({ ...published, position: 0 }));
  vi.stubGlobal("fetch", fetchMock);
  const result = await publishTask(task.id);
  expect(result.task.position).toBe(2);
  expect(result.task.total).toBe(6);
  expect(result.href).toBe(`/business/tasks/${task.id}`);
  expect(fetchMock).toHaveBeenCalledWith(`/api/tasks/${task.id}/publish`, { cache: "no-store", method: "POST" });
  await expect(publishTask(task.id)).rejects.toThrow("Укажите название.");
  await expect(publishTask(task.id)).rejects.toThrow("Сервер вернул некорректные данные.");
});
