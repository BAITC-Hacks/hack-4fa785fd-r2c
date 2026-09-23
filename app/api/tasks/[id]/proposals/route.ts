import { NextResponse } from "next/server";
import { apiError, notImplemented, validatedId, withJson, type IdRouteContext } from "@/lib/api";
import { readDb } from "@/lib/store";
import { CreateProposalInputSchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: IdRouteContext) {
  const id = await validatedId(context);
  if (!id.success) return apiError("Некорректный идентификатор задачи.");
  const db = await readDb();
  if (!db.tasks.some((task) => task.id === id.data)) return apiError("Задача не найдена.", 404);
  const proposals = db.proposals.filter((proposal) => proposal.taskId === id.data).map((proposal) => ({
    ...proposal,
    team: db.teams.find((team) => team.id === proposal.teamId),
  }));
  return NextResponse.json(proposals);
}

export async function POST(request: Request, context: IdRouteContext) {
  if (!(await validatedId(context)).success) return apiError("Некорректный идентификатор задачи.");
  return withJson(request, CreateProposalInputSchema, () => notImplemented());
}
