import { NextResponse } from "next/server";
import { apiError, ApiRequestError, withApiErrors, validatedId, withJson, type IdRouteContext } from "@/lib/api";
import { UpdateTaskInputSchema } from "@/lib/types";
import { updateDb } from "@/lib/store";
import { calculateScore } from "@/lib/scoring";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: IdRouteContext) {
  const id = await validatedId(context);
  if (!id.success) return apiError("Некорректный идентификатор задачи.");
  return withJson(request, UpdateTaskInputSchema, ({ card }) => withApiErrors(async () => {
    const task = await updateDb((db) => {
      const entry = db.tasks.find((task) => task.id === id.data);
      if (!entry) throw new ApiRequestError("Задача не найдена.", 404);
      entry.card = card;
      entry.score = calculateScore(card);
      entry.scoreHistory.push({ at: new Date().toISOString(), total: entry.score.total });
      return entry;
    });
    return NextResponse.json(task);
  }));
}
