import { NextResponse } from "next/server";
import { apiError, withJson } from "@/lib/api";
import { buildCard } from "@/lib/ai/buildCard";
import { BuildCardInputSchema, BuildCardResponseSchema } from "@/lib/types";
import { AiPersistenceError } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return withJson(request, BuildCardInputSchema, async ({ draftText, answers }) => {
    try {
      const result = BuildCardResponseSchema.parse(await buildCard(draftText, answers));
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return apiError(error instanceof AiPersistenceError ? error.message : "Не удалось собрать карточку. Попробуйте ещё раз.", 500);
    }
  });
}
