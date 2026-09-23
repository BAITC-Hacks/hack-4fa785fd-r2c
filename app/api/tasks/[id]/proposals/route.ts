import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { apiError, validatedId, withJson, type IdRouteContext } from "@/lib/api";
import { readDb, updateDb } from "@/lib/store";
import { CreateProposalInputSchema, type Proposal } from "@/lib/types";

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

  return withJson(request, CreateProposalInputSchema, async (input) => {
    const result = await updateDb((db) => {
      const task = db.tasks.find((entry) => entry.id === id.data);
      if (!task || task.status !== "published") return { error: "Опубликованная задача не найдена.", status: 404 as const };
      if (!db.teams.some((team) => team.id === input.teamId)) return { error: "Команда не найдена.", status: 404 as const };

      const proposal: Proposal = {
        ...input,
        id: randomUUID(),
        taskId: task.id,
        status: "pending",
        milestoneConfirmed: false,
        createdAt: new Date().toISOString(),
      };
      db.proposals.push(proposal);
      return { proposal };
    });

    if ("error" in result) return apiError(result.error, result.status);
    return NextResponse.json(result.proposal, { status: 201 });
  });
}
