import type { Proposal, Team } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusLabels: Record<Proposal["status"], string> = { pending: "На рассмотрении", accepted: "Принят", rejected: "Отклонён" };

export function ProposalCard({ proposal, team }: { proposal: Proposal; team?: Team }) {
  return (
    <Card><CardHeader><div className="flex items-center justify-between gap-4"><CardTitle>{team?.name ?? "Студенческая команда"}</CardTitle><Badge variant="secondary">{statusLabels[proposal.status]}</Badge></div></CardHeader>
      <CardContent className="space-y-4 text-sm"><p className="leading-6">{proposal.idea}</p><p className="text-muted-foreground">План: {proposal.plan}</p><p className="text-muted-foreground">Срок: {proposal.timeline}</p>
        <div className="flex gap-2"><Button disabled size="sm">Принять</Button><Button disabled size="sm" variant="outline">Отклонить</Button><Button disabled size="sm" variant="outline">Подтвердить этап</Button></div>
        <p className="text-xs text-muted-foreground">Управление откликами будет подключено на этапе реализации сценария.</p>
      </CardContent>
    </Card>
  );
}
