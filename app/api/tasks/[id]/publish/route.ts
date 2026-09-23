import { apiError, notImplemented, validatedId, type IdRouteContext } from "@/lib/api";

export async function POST(_request: Request, context: IdRouteContext) {
  if (!(await validatedId(context)).success) return apiError("Некорректный идентификатор задачи.");
  return notImplemented();
}
