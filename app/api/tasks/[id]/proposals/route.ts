import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { apiError, ApiRequestError, withApiErrors, validatedId, withJson, type IdRouteContext } from "@/lib/api";
import { readDb, updateDb } from "@/lib/store";
import { CreateProposalInputSchema, ProposalSchema } from "@/lib/types";

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
  const id = await validatedId(context);
  if (!id.success) return apiError("Некорректный идентификатор задачи.");
  return withJson(request, CreateProposalInputSchema, (input) => withApiErrors(async () => {
    const proposal = await updateDb((db) => {
      const task = db.tasks.find((entry) => entry.id === id.data);
      if (!task) throw new ApiRequestError("Задача не найдена.", 404);
      if (task.status !== "published") throw new ApiRequestError("Отклик доступен только для опубликованной задачи.");
      if (!db.teams.some((team) => team.id === input.teamId)) throw new ApiRequestError("Команда не найдена.", 404);
      const created = ProposalSchema.parse({
        ...input, id: randomUUID(), taskId: task.id, status: "pending",
        milestoneConfirmed: false, createdAt: new Date().toISOString(),
      });
      db.proposals.push(created);
      return created;
    });
    return NextResponse.json(proposal, { status: 201 });
  }));
}
