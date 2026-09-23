import Link from "next/link";
import { cookies } from "next/headers";
import { readDb } from "@/lib/store";
import { RoleSchema } from "@/lib/types";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export default async function BusinessTasksPage() {
  const [db, cookieStore] = await Promise.all([readDb(), cookies()]);
  let businessName = "Кофейня «Дала»";
  try {
    const role = RoleSchema.safeParse(JSON.parse(decodeURIComponent(cookieStore.get("taskready-role")?.value ?? "")));
    if (role.success && role.data.kind === "business") businessName = role.data.businessName;
  } catch { /* Default demo business. */ }
  const tasks = db.tasks.filter((task) => task.businessName === businessName).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <PagePlaceholder placeholder={false} eyebrow="Кабинет бизнеса" title="Мои задачи" description={businessName}
    action={<Button asChild><Link href="/business/new">Создать задачу</Link></Button>}>
    {tasks.length ? <div className="grid gap-4 md:grid-cols-2">{tasks.map((task) => <div key={task.id} className="space-y-2"><p className="text-xs text-muted-foreground">{task.status === "published" ? "Опубликована" : "Черновик · не опубликован"}</p><TaskCard task={task} href={`/business/tasks/${task.id}`} /></div>)}</div> : <p className="rounded-lg border p-6">У этого бизнеса пока нет задач.</p>}
  </PagePlaceholder>;
}
