import { z } from "zod";
import { requestJson } from "./client-api";
import { TaskSchema, type Card } from "./types";

const PublishedSchema = TaskSchema.extend({ position: z.number().int().positive(), total: z.number().int().positive() });

export function saveTaskCard(id: string, card: Card) {
  return requestJson(`/api/tasks/${encodeURIComponent(id)}`, TaskSchema, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card }),
  });
}

export async function publishTask(id: string) {
  const task = await requestJson(`/api/tasks/${encodeURIComponent(id)}/publish`, PublishedSchema, { method: "POST" });
  return { task, href: `/business/tasks/${encodeURIComponent(task.id)}` };
}
