"use client";

import { useEffect, useState } from "react";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requestJson } from "@/lib/client-api";
import { TeamsResponseSchema, type Team } from "@/lib/types";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    requestJson("/api/teams", TeamsResponseSchema, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setTeams(data); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Не удалось загрузить команды."); });
    return () => controller.abort();
  }, [revision]);
  return <PagePlaceholder placeholder={false} eyebrow="Студенческие команды" title="Рейтинг команд" description="Баллы за прогресс отражают подтверждённые бизнесом этапы работы. За каждый этап — +50 баллов."
    action={<Button variant="outline" onClick={() => { setError(""); setRevision((value) => value + 1); }}>Обновить</Button>}>
    {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {teams === null && !error && <p role="status" className="text-sm text-muted-foreground">Загружаем рейтинг…</p>}
    {teams !== null && <Card className="py-0 shadow-none"><CardContent className="px-0"><Table><TableHeader><TableRow><TableHead className="w-20 pl-6">Место</TableHead><TableHead>Команда</TableHead><TableHead>Навыки и технологии</TableHead><TableHead className="pr-6 text-right">Баллы</TableHead></TableRow></TableHeader><TableBody>{teams.length ? teams.map((team, index) => <TableRow key={team.id}><TableCell className="py-5 pl-6 tabular-nums text-muted-foreground">{index + 1}</TableCell><TableCell><p className="font-medium">{team.name}</p><p className="mt-1 text-xs text-muted-foreground">{team.interests.join(" · ")}</p></TableCell><TableCell><div className="flex flex-wrap gap-1.5">{[...new Set([...team.skills, ...team.technologies])].map((skill) => <Badge key={skill} variant="outline" className="font-normal">{skill}</Badge>)}</div></TableCell><TableCell className="pr-6 text-right text-base font-semibold tabular-nums">{team.points}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Профили команд ещё не добавлены.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>}
    <p className="text-sm text-muted-foreground">Рейтинг команд и готовность задач — отдельные показатели. Выбор исполнителя остаётся за бизнесом.</p>
  </PagePlaceholder>;
}
