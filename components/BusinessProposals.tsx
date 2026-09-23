"use client";

import { useEffect, useState } from "react";
import { ProposalCard } from "@/components/ProposalCard";
import { Button } from "@/components/ui/button";
import { requestJson } from "@/lib/client-api";
import { ProposalSchema, TaskProposalsResponseSchema, type ProposalActionInput, type ProposalWithTeam } from "@/lib/types";

export function BusinessProposals({ taskId }: { taskId: string }) {
  const [proposals, setProposals] = useState<ProposalWithTeam[] | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const url = `/api/tasks/${encodeURIComponent(taskId)}/proposals`;

  useEffect(() => {
    const controller = new AbortController();
    requestJson(url, TaskProposalsResponseSchema, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setProposals(data); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Не удалось загрузить отклики."); });
    return () => controller.abort();
  }, [url, revision]);

  async function act(id: string, action: ProposalActionInput["action"]) {
    if (pending) return;
    setPending(id); setError("");
    try {
      const updated = await requestJson(`/api/proposals/${encodeURIComponent(id)}`, ProposalSchema, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      setProposals((current) => current?.map((entry) => entry.id === id ? { ...entry, ...updated } : entry) ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось обновить отклик."); }
    finally { setPending(null); }
  }

  return <section className="space-y-4" aria-labelledby="proposals-heading" aria-busy={pending !== null}>
    <div className="flex items-center justify-between gap-4"><h2 id="proposals-heading" className="text-xl font-semibold">Отклики команд{proposals ? ` · ${proposals.length}` : ""}</h2><Button size="sm" variant="outline" disabled={pending !== null} onClick={() => { setError(""); setRevision((value) => value + 1); }}>Обновить</Button></div>
    <p className="text-sm text-muted-foreground">Вы можете принять одну, несколько или ни одной команды. За подтверждённый этап команда получает +50 баллов.</p>
    {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {proposals === null && !error && <p role="status" className="text-sm text-muted-foreground">Загружаем отклики…</p>}
    {proposals?.length === 0 && <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Откликов пока нет.</p>}
    {proposals?.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} team={proposal.team} busy={pending !== null} onAction={(action) => void act(proposal.id, action)} />)}
    {pending && <p role="status" className="text-sm text-muted-foreground">Сохраняем решение…</p>}
  </section>;
}
