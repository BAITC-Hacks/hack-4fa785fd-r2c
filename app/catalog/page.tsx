import { cookies } from "next/headers";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { readDb } from "@/lib/store";
import { recommendTasks } from "@/lib/recommend";
import { RoleSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const [db, cookieStore] = await Promise.all([readDb(), cookies()]);
  const published = db.tasks.filter((task) => task.status === "published");
  let teamId: string | undefined;
  const savedRole = cookieStore.get("taskready-role")?.value;
  if (savedRole) {
    try {
      const parsedRole = RoleSchema.safeParse(JSON.parse(decodeURIComponent(savedRole)));
      if (parsedRole.success) {
        const role = parsedRole.data;
        if (role.kind === "team" && db.teams.some((team) => team.id === role.teamId)) teamId = role.teamId;
      }
    } catch { /* Fall back to the unrestricted catalogue if the demo role cookie is malformed. */ }
  }
  const selectedTeam = db.teams.find((team) => team.id === teamId);
  const tasks = [...published].sort((a, b) => b.score.total - a.score.total || Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt));
  const recommended = selectedTeam ? recommendTasks(published, selectedTeam) : [];

  return <PagePlaceholder placeholder={false} eyebrow="Для студенческих команд" title="Каталог задач" description="Изучите задачи бизнеса и выберите ту, которой хотите предложить решение.">
    {!selectedTeam && <p className="placeholder-notice">Вы видите весь каталог. Выберите команду в переключателе роли выше, чтобы получить персональные рекомендации.</p>}
    {selectedTeam && <p className="text-sm text-muted-foreground">Команда: <strong className="font-medium text-foreground">{selectedTeam.name}</strong></p>}
    <CatalogBrowser tasks={tasks} recommended={recommended} />
  </PagePlaceholder>;
}
