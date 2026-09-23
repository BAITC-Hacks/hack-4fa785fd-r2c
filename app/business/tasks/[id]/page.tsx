import Link from "next/link";
import { notFound } from "next/navigation";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { BusinessProposals } from "@/components/BusinessProposals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { readDb } from "@/lib/store";
import { TaskEditor } from "@/components/TaskEditor";
import { compareCatalogTasks } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function BusinessTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tasks } = await readDb();
  const task = tasks.find((entry) => entry.id === id);
  if (!task) notFound();
  const catalog = tasks.filter((entry) => entry.status === "published").sort(compareCatalogTasks);
  return <PagePlaceholder placeholder={false} eyebrow="Кабинет бизнеса / задача" title={task.card.title.value.trim() || "Задача без названия"} description={`${task.businessName} · ${task.industry}`}
    action={<Button asChild variant="outline"><Link href="/business/tasks">К моим задачам</Link></Button>}>
    <div className="flex items-center gap-3"><Badge variant="secondary">{task.status === "published" ? "Опубликована" : "Не опубликована"}</Badge>{task.status === "published" && <Link className="text-sm text-primary underline" href={`/catalog/${task.id}`}>Открыть в каталоге</Link>}</div>
    {task.status === "published" && <p role="status" className="font-medium text-primary">Ваша задача на {catalog.findIndex((entry) => entry.id === task.id) + 1} месте из {catalog.length}</p>}
    <TaskEditor key={task.id} initialTask={task} showScoreHistory />
    <BusinessProposals key={task.id} taskId={task.id} />
  </PagePlaceholder>;
}
