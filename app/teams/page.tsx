import { PagePlaceholder } from "@/components/PagePlaceholder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readDb } from "@/lib/store";

export default async function TeamsPage() {
  const { teams } = await readDb();
  const sorted = [...teams].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "ru"));
  return (
    <PagePlaceholder eyebrow="Студенческие команды" title="Рейтинг команд" description="Баллы за прогресс отражают подтверждённые бизнесом этапы работы. Здесь показаны синтетические профили из начальных данных.">
      <Card className="py-0 shadow-none"><CardContent className="px-0"><Table><TableHeader><TableRow><TableHead className="w-20 pl-6">Место</TableHead><TableHead>Команда</TableHead><TableHead>Навыки и технологии</TableHead><TableHead className="pr-6 text-right">Баллы</TableHead></TableRow></TableHeader><TableBody>{sorted.length ? sorted.map((team, index) => <TableRow key={team.id}><TableCell className="py-5 pl-6 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</TableCell><TableCell><p className="font-medium">{team.name}</p><p className="mt-1 text-xs text-muted-foreground">{team.interests.join(" · ")}</p></TableCell><TableCell><div className="flex flex-wrap gap-1.5">{[...new Set([...team.skills, ...team.technologies])].map((skill) => <Badge key={skill} variant="outline" className="font-normal">{skill}</Badge>)}</div></TableCell><TableCell className="pr-6 text-right text-base font-semibold tabular-nums">{team.points}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Профили команд ещё не добавлены.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
      <div className="grid grid-cols-2 gap-6"><p className="placeholder-notice">Подтверждение этапа будет добавлять выбранной команде +50 баллов. Сейчас начисление из интерфейса не подключено.</p><p className="placeholder-notice">Рейтинг команд и рейтинг готовности задач — отдельные показатели. Выбор исполнителя всегда остаётся за бизнесом.</p></div>
    </PagePlaceholder>
  );
}
