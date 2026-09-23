import { NextResponse } from "next/server";
import { apiError, ApiRequestError, withApiErrors, validatedId, withJson, type IdRouteContext } from "@/lib/api";
import { ProposalActionInputSchema } from "@/lib/types";
import { updateDb } from "@/lib/store";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: IdRouteContext) {
  const id = await validatedId(context);
  if (!id.success) return apiError("Некорректный идентификатор отклика.");
  return withJson(request, ProposalActionInputSchema, ({ action }) => withApiErrors(async () => {
    const proposal = await updateDb((db) => {
      const entry = db.proposals.find((proposal) => proposal.id === id.data);
      if (!entry) throw new ApiRequestError("Отклик не найден.", 404);
      if (action === "confirmMilestone") {
        if (entry.status !== "accepted") throw new ApiRequestError("Подтвердить этап можно только для принятого отклика.");
        if (entry.milestoneConfirmed) throw new ApiRequestError("Этап уже подтверждён.");
        const team = db.teams.find((team) => team.id === entry.teamId);
        if (!team) throw new ApiRequestError("Команда не найдена.", 404);
        // The guard and both writes are serialized in the same transaction.
        entry.milestoneConfirmed = true;
        team.points += 50;
      } else {
        entry.status = action === "accept" ? "accepted" : "rejected";
      }
      return entry;
    });
    return NextResponse.json(proposal);
  }));
}
