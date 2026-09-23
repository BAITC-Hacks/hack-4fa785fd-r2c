"use client";

import { useMemo, useState } from "react";
import { TaskCard } from "@/components/TaskCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Level, Task, TaskRecommendation } from "@/lib/types";

const levels: { value: Level; label: string }[] = [
  { value: "draft", label: "Черновик · требует уточнения" },
  { value: "workable", label: "Рабочая" },
  { value: "ready", label: "Готовая" },
  { value: "priority", label: "Приоритетная" },
];

export function CatalogBrowser({ tasks, recommended }: { tasks: Task[]; recommended: TaskRecommendation[] }) {
  const [industry, setIndustry] = useState("");
  const [level, setLevel] = useState<Level | "">("");
  const industries = useMemo(() => [...new Set(tasks.map((task) => task.industry).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru")), [tasks]);
  const filteredTasks = useMemo(() => tasks
    .filter((task) => (!industry || task.industry === industry) && (!level || task.score.level === level))
    .sort((a, b) => b.score.total - a.score.total || Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt)), [tasks, industry, level]);

  return <div className="space-y-8">
    {recommended.length > 0 && <Card className="border-primary/20 bg-secondary/35 shadow-none">
      <CardHeader><CardTitle className="text-base">Рекомендовано выбранной команде</CardTitle><p className="text-sm leading-6 text-muted-foreground">Это предложения по совпадению интересов и навыков. Остальные задачи доступны ниже.</p></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{recommended.map(({ task, reason, matches }) => <div key={task.id} className="space-y-2"><TaskCard task={task} /><p className="px-1 text-xs leading-5 text-muted-foreground">{reason} Совпадения: {matches.join(", ")}</p></div>)}</CardContent>
    </Card>}

    <section aria-labelledby="all-tasks-heading" className="space-y-5">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div><h2 id="all-tasks-heading" className="text-xl font-semibold">Все опубликованные задачи</h2><p className="mt-2 text-sm text-muted-foreground">Сначала задачи с высоким рейтингом; при равенстве выше новые.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><label htmlFor="industry-filter" className="text-sm font-medium">Отрасль</label><select id="industry-filter" value={industry} onChange={(event) => setIndustry(event.target.value)} className="h-10 w-full min-w-48 rounded-md border bg-card px-3 text-sm"><option value="">Все отрасли</option>{industries.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></div>
          <div className="space-y-2"><label htmlFor="level-filter" className="text-sm font-medium">Уровень готовности</label><select id="level-filter" value={level} onChange={(event) => setLevel(event.target.value as Level | "")} className="h-10 w-full min-w-52 rounded-md border bg-card px-3 text-sm"><option value="">Все уровни</option>{levels.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">Показано задач: {filteredTasks.length}</p>
      {filteredTasks.length > 0 ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredTasks.map((task) => <TaskCard key={task.id} task={task} />)}</div> : <Card className="border-dashed shadow-none"><CardContent className="flex min-h-48 items-center justify-center p-8 text-center text-sm text-muted-foreground">По выбранным фильтрам задач нет. Измените отрасль или уровень готовности.</CardContent></Card>}
    </section>
  </div>;
}
