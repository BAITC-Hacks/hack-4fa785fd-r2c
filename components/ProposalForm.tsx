"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorResponseSchema, CreateProposalInputSchema, ProposalSchema, type Team } from "@/lib/types";

export function ProposalForm({ taskId, teams, selectedTeamId }: { taskId: string; teams: Team[]; selectedTeamId?: string }) {
  const [teamId, setTeamId] = useState(selectedTeamId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const parsed = CreateProposalInputSchema.safeParse({
      teamId,
      idea: form.get("idea"),
      plan: form.get("plan"),
      timeline: form.get("timeline"),
      prototypeUrl: form.get("prototypeUrl"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Проверьте заполнение формы.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/tasks/" + encodeURIComponent(taskId) + "/proposals", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const apiError = ApiErrorResponseSchema.safeParse(payload);
        throw new Error(apiError.success ? apiError.data.error : "Не удалось отправить отклик. Попробуйте ещё раз.");
      }
      ProposalSchema.parse(payload);
      setSubmitted(true);
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось отправить отклик.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) return <Card className="border-primary/25 bg-secondary/35"><CardContent className="flex items-start gap-3 p-6"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /><div><h2 className="font-semibold">Отклик отправлен</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Бизнес рассмотрит идею и план и сам решит, с какой командой работать.</p></div></CardContent></Card>;

  return <Card><CardHeader><CardTitle>Предложить решение</CardTitle><CardDescription>Опишите подход и отправьте отклик бизнесу. Команду выбирает сам бизнес.</CardDescription></CardHeader>
    <CardContent><form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2"><Label htmlFor="proposal-team">Команда</Label><select id="proposal-team" required value={teamId} onChange={(event) => setTeamId(event.target.value)} className="h-10 w-full rounded-md border bg-card px-3 text-sm"><option value="" disabled>Выберите команду</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="proposal-idea">Идея решения</Label><Textarea id="proposal-idea" name="idea" required minLength={1} rows={3} placeholder="Как ваш подход поможет решить задачу?" /></div>
      <div className="space-y-2"><Label htmlFor="proposal-plan">План работы</Label><Textarea id="proposal-plan" name="plan" required minLength={1} rows={4} placeholder="Основные этапы и ожидаемый результат" /></div>
      <div className="space-y-2"><Label htmlFor="proposal-timeline">Срок</Label><Input id="proposal-timeline" name="timeline" required placeholder="Например, 3 недели" /></div>
      <div className="space-y-2"><Label htmlFor="proposal-prototype">Ссылка на прототип</Label><Input id="proposal-prototype" name="prototypeUrl" type="url" required placeholder="https://example.com/prototype" /></div>
      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending || teams.length === 0}>{pending ? "Отправляем…" : <>Отправить отклик <Send /></>}</Button>
      {teams.length === 0 && <p className="text-xs text-muted-foreground">Пока нет доступных профилей команд.</p>}
    </form></CardContent>
  </Card>;
}
