import { NextResponse } from "next/server";
import { apiError, ApiRequestError, withApiErrors, validatedId, type IdRouteContext } from "@/lib/api";
import { updateDb } from "@/lib/store";
import { compareCatalogTasks } from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(_request: Request, context: IdRouteContext) {
  const id = await validatedId(context);
  if (!id.success) return apiError("Некорректный идентификатор задачи.");
  return withApiErrors(async () => {
    const result = await updateDb((db) => {
      const task = db.tasks.find((entry) => entry.id === id.data);
      if (!task) throw new ApiRequestError("Задача не найдена.", 404);
      if (!task.card.title.value.trim()) throw new ApiRequestError("Укажите название задачи перед публикацией.");
      task.status = "published";
      // Retrying publication does not make an existing task artificially newer.
      task.publishedAt ??= new Date().toISOString();
      const catalog = db.tasks.filter((entry) => entry.status === "published").sort(compareCatalogTasks);
      return { ...task, position: catalog.findIndex((entry) => entry.id === task.id) + 1, total: catalog.length };
    });
    return NextResponse.json(result);
  });
}
