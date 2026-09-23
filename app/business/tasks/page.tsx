import Link from "next/link";
import { cookies } from "next/headers";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { LevelBadge } from "@/components/LevelBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readDb } from "@/lib/store";
import { RoleSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BusinessTasksPage() {
  const [db, cookieStore] = await Promise.all([readDb(), cookies()]);
  let businessName = "Кофейня «Дала»";
  let isBusiness = true;
  const saved = cookieStore.get("taskready-role")?.value;
  if (saved) {
    try {
      const parsed = RoleSchema.safeParse(JSON.parse(decodeURIComponent(saved)));
      if (parsed.success) {
        const role = parsed.data;
        if (role.kind === "business") businessName = role.businessName;
        else if (db.teams.some((team) => team.id === role.teamId)) isBusiness = false;
      }
    } catch { /* Use the same default business as the role switcher. */ }
  }
  const tasks = db.tasks.filter((task) => task.businessName === businessName)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const proposalCounts = new Map<string, number>();
  for (const proposal of db.proposals) proposalCounts.set(proposal.taskId, (proposalCounts.get(proposal.taskId) ?? 0) + 1);

  return <PagePlaceholder placeholder={false} eyebrow="Кабинет бизнеса" title="Мои задачи" description={isBusiness ? `${businessName} · Черновики и опубликованные задачи` : "Выберите роль бизнеса в шапке, чтобы открыть список его задач."}
    action={isBusiness ? <Button asChild><Link href="/business/new">Создать задачу <span aria-hidden="true">+</span></Link></Button> : undefined}>
    {isBusiness && (tasks.length ? <div className="overflow-hidden rounded-xl border bg-card">
      <Table><TableHeader><TableRow><TableHead className="pl-5">Название</TableHead><TableHead>Статус</TableHead><TableHead>Рейтинг</TableHead><TableHead>Уровень</TableHead><TableHead className="pr-5 text-right">Отклики</TableHead></TableRow></TableHeader>
        <TableBody>{tasks.map((task) => <TableRow key={task.id}>
          <TableCell className="max-w-md py-5 pl-5"><Link className="font-medium text-primary hover:underline" href={`/business/tasks/${encodeURIComponent(task.id)}`}>{task.card.title.value.trim() || "Задача без названия"}</Link></TableCell>
          <TableCell><Badge variant="secondary">{task.status === "published" ? "Опубликована" : "Черновик"}</Badge></TableCell>
          <TableCell className="tabular-nums">{task.score.total} / 100</TableCell>
          <TableCell><LevelBadge level={task.score.level} /></TableCell>
          <TableCell className="pr-5 text-right tabular-nums">{proposalCounts.get(task.id) ?? 0}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </div> : <div className="rounded-xl border border-dashed p-10 text-center"><h2 className="text-xl font-semibold">У вас пока нет задач</h2><p className="mt-3 text-sm text-muted-foreground">Создайте первую задачу, чтобы начать работу с командами.</p></div>)}
  </PagePlaceholder>;
}
