import { NextResponse } from "next/server";
import { apiError, withJson } from "@/lib/api";
import { analyzeDraft } from "@/lib/ai/analyze";
import { AnalyzeDraftInputSchema, AnalyzeDraftResponseSchema } from "@/lib/types";
import { AiPersistenceError } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return withJson(request, AnalyzeDraftInputSchema, async ({ draftText, industry }) => {
    try {
      const result = AnalyzeDraftResponseSchema.parse(await analyzeDraft(draftText, industry));
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return apiError(error instanceof AiPersistenceError ? error.message : "Не удалось проанализировать черновик. Попробуйте ещё раз.", 500);
    }
  });
}
