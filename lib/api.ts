import { NextResponse } from "next/server";
import { z } from "zod";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

/** Business-rule failures abort updateDb; unexpected storage errors stay private. */
export async function withApiErrors(handler: () => Promise<Response>): Promise<Response> {
  try { return await handler(); }
  catch (error) {
    return error instanceof ApiRequestError
      ? apiError(error.message, error.status)
      : apiError("Не удалось сохранить изменения. Попробуйте ещё раз.", 500);
  }
}

export async function withJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  handler: (input: T) => Promise<Response> | Response,
): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Тело запроса должно содержать корректный JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((issue) => `${issue.path.join(".") || "Запрос"}: ${issue.message}`).join("; "));
  }
  return handler(parsed.data);
}

export type IdRouteContext = { params: Promise<{ id: string }> };

export async function validatedId(context: IdRouteContext) {
  return z.string().trim().min(1).max(200).safeParse((await context.params).id);
}
