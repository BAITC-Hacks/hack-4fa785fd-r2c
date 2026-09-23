import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { ProposalForm } from "@/components/ProposalForm";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { ScoreMeter } from "@/components/ScoreMeter";
import { LevelBadge } from "@/components/LevelBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readDb } from "@/lib/store";
import { RoleSchema, fieldKeys } from "@/lib/types";

export const dynamic = "force-dynamic";

const sections: { title: string; fields: (typeof fieldKeys)[number][] }[] = [
  { title: "Контекст и потребность", fields: ["context", "need"] },
  { title: "Пользователи и данные", fields: ["users", "data"] },
  { title: "Результат и критерии успеха", fields: ["expectedResult", "successCriteria"] },
  { title: "Ограничения и взаимодействие", fields: ["constraints", "contact", "interactionFormat"] },
];

const fieldLabels: Record<(typeof fieldKeys)[number], string> = {
  title: "Название", context: "Контекст", need: "Потребность", users: "Пользователи", data: "Данные и материалы",
  constraints: "Ограничения", expectedResult: "Ожидаемый результат", successCriteria: "Критерии успеха",
  contact: "Контакт", interactionFormat: "Формат взаимодействия",
};

export default async function CatalogTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [db, cookieStore] = await Promise.all([readDb(), cookies()]);
  const task = db.tasks.find((entry) => entry.id === id && entry.status === "published");
  if (!task) notFound();

  let selectedTeamId: string | undefined;
  const savedRole = cookieStore.get("taskready-role")?.value;
  if (savedRole) {
    try {
      const parsedRole = RoleSchema.safeParse(JSON.parse(decodeURIComponent(savedRole)));
      if (parsedRole.success) {
        const role = parsedRole.data;
        if (role.kind === "team" && db.teams.some((team) => team.id === role.teamId)) selectedTeamId = role.teamId;
      }
    } catch { /* The proposal form will ask the visitor to choose a team. */ }
  }

  return <PagePlaceholder placeholder={false} eyebrow="Открытый каталог / задача" title={task.card.title.confirmed ? task.card.title.value : "Задача для команды"} description={task.businessName + " · " + task.industry}
    action={<Button asChild variant="outline"><Link href="/catalog">Вернуться в каталог</Link></Button>}>
    {task.score.level === "draft" && <div className="rounded-lg border border-amber-400/40 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-950">Черновик · требует уточнения. Задача остаётся открытой для откликов.</div>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
      <div className="space-y-6">
        <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>О задаче</CardTitle><LevelBadge level={task.score.level} /></div><p className="text-sm text-muted-foreground">Опубликована {new Date(task.publishedAt ?? task.createdAt).toLocaleDateString("ru-RU")}</p></CardHeader><CardContent className="space-y-6">
          {sections.filter((section) => section.fields.some((field) => task.card[field].confirmed && task.card[field].value.trim())).map((section) => <section key={section.title} className="space-y-4 border-b pb-5 last:border-0 last:pb-0"><h2 className="text-sm font-semibold">{section.title}</h2>{section.fields.map((field) => task.card[field].confirmed && task.card[field].value.trim() && <div key={field}><h3 className="text-xs font-medium text-muted-foreground">{fieldLabels[field]}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{task.card[field].value}</p></div>)}</section>)}
          {task.tags.length > 0 && <div className="flex flex-wrap gap-2">{task.tags.map((tag) => <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{tag}</span>)}</div>}
        </CardContent></Card>
        <ProposalForm taskId={task.id} teams={db.teams} selectedTeamId={selectedTeamId} />
      </div>
      <Card className={task.score.level === "priority" ? "border-primary/40 bg-primary/[0.025] lg:sticky lg:top-6" : "lg:sticky lg:top-6"}><CardHeader><CardTitle>Готовность задачи</CardTitle></CardHeader><CardContent className="space-y-5"><ScoreMeter score={task.score} /><div><h2 className="mb-3 text-sm font-semibold">Расшифровка</h2><ScoreBreakdown score={task.score} task={task} catalog={db.tasks} /></div></CardContent></Card>
    </div>
  </PagePlaceholder>;
}
