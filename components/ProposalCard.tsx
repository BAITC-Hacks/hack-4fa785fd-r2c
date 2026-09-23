import type { Proposal, ProposalActionInput, Team } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusLabels: Record<Proposal["status"], string> = { pending: "На рассмотрении", accepted: "Принят", rejected: "Отклонён" };

export function ProposalCard({ proposal, team, busy = false, onAction }: {
  proposal: Proposal; team?: Team; busy?: boolean; onAction: (action: ProposalActionInput["action"]) => void;
}) {
  return (
    <Card><CardHeader><div className="flex items-center justify-between gap-4"><CardTitle>{team?.name ?? "Студенческая команда"}</CardTitle><Badge variant="secondary">{statusLabels[proposal.status]}</Badge></div></CardHeader>
      <CardContent className="space-y-4 text-sm"><p className="whitespace-pre-wrap leading-6">{proposal.idea}</p><p className="whitespace-pre-wrap text-muted-foreground">План: {proposal.plan}</p><p className="text-muted-foreground">Срок: {proposal.timeline}</p>
        <a href={proposal.prototypeUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-primary underline">Открыть прототип</a>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || proposal.status === "accepted"} size="sm" onClick={() => onAction("accept")}>Принять</Button>
          <Button disabled={busy || proposal.status === "rejected"} size="sm" variant="outline" onClick={() => onAction("reject")}>Отклонить</Button>
          {proposal.status === "accepted" && !proposal.milestoneConfirmed && <Button disabled={busy} size="sm" variant="outline" onClick={() => onAction("confirmMilestone")}>Подтвердить этап · +50</Button>}
        </div>
        {proposal.milestoneConfirmed && <p className="text-sm text-emerald-700">Этап подтверждён · +50 баллов начислено</p>}
      </CardContent>
    </Card>
  );
}
