import type { z } from "zod";
import { ApiErrorResponseSchema } from "./types";

export async function requestJson<T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = ApiErrorResponseSchema.safeParse(payload);
    throw new Error(error.success ? error.data.error : "Не удалось выполнить запрос. Попробуйте ещё раз.");
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new Error("Сервер вернул некорректные данные. Обновите страницу.");
  return parsed.data;
}
