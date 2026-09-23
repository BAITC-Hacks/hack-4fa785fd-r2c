import Link from "next/link";
import { notFound } from "next/navigation";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { BusinessProposals } from "@/components/BusinessProposals";
import { ScoreMeter } from "@/components/ScoreMeter";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readDb } from "@/lib/store";
import { fieldKeys, type FieldKey } from "@/lib/types";

export const dynamic = "force-dynamic";
const labels: Record<FieldKey, string> = {
  title: "Название", context: "Контекст", need: "Потребность", users: "Пользователи", data: "Данные и материалы",
  constraints: "Ограничения", expectedResult: "Ожидаемый результат", successCriteria: "Критерии успеха",
  contact: "Контакт", interactionFormat: "Формат взаимодействия",
};

export default async function BusinessTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tasks } = await readDb();
  const task = tasks.find((entry) => entry.id === id);
  if (!task) notFound();
  return <PagePlaceholder placeholder={false} eyebrow="Кабинет бизнеса / задача" title={task.card.title.value.trim() || "Задача без названия"} description={`${task.businessName} · ${task.industry}`}
    action={<Button asChild variant="outline"><Link href="/business/tasks">К моим задачам</Link></Button>}>
    <div className="flex items-center gap-3"><Badge variant="secondary">{task.status === "published" ? "Опубликована" : "Не опубликована"}</Badge>{task.status === "published" && <Link className="text-sm text-primary underline" href={`/catalog/${task.id}`}>Открыть в каталоге</Link>}</div>
    <div className="grid grid-cols-[1.5fr_1fr] items-start gap-6"><div className="space-y-6">
      <Card><CardHeader><CardTitle>Сведения о задаче</CardTitle></CardHeader><CardContent><dl className="divide-y">{fieldKeys.map((key) => <div key={key} className="grid grid-cols-[160px_1fr] gap-4 py-3 text-sm"><dt className="font-medium">{labels[key]}</dt><dd className="space-y-1"><p className="whitespace-pre-wrap break-words">{task.card[key].value.trim() || "Не заполнено"}</p><p className="text-xs text-muted-foreground">{task.card[key].confirmed ? "Подтверждено" : "Не подтверждено"}</p>{task.card[key].evidence && <blockquote className="border-l-2 pl-3 text-xs text-muted-foreground">{task.card[key].evidence}</blockquote>}</dd></div>)}</dl></CardContent></Card>
      <BusinessProposals key={task.id} taskId={task.id} />
    </div><Card className="sticky top-6"><CardContent className="space-y-6"><ScoreMeter score={task.score} /><div><h2 className="mb-2 text-sm font-semibold">Из чего складывается рейтинг</h2><ScoreBreakdown score={task.score} /></div></CardContent></Card></div>
  </PagePlaceholder>;
}
