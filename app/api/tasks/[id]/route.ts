import { apiError, notImplemented, validatedId, withJson, type IdRouteContext } from "@/lib/api";
import { UpdateTaskInputSchema } from "@/lib/types";

export async function PATCH(request: Request, context: IdRouteContext) {
  if (!(await validatedId(context)).success) return apiError("Некорректный идентификатор задачи.");
  return withJson(request, UpdateTaskInputSchema, () => notImplemented());
}
