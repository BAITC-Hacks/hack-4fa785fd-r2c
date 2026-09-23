import Link from "next/link";
import type { Task } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LevelBadge } from "@/components/LevelBadge";

export function TaskCard({ task, href = `/catalog/${task.id}` }: { task: Task; href?: string }) {
  return (
    <Card className={task.score.level === "priority" ? "border-primary/50" : undefined}>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3"><Badge variant="outline">{task.industry}</Badge><span className="text-sm font-semibold tabular-nums">{task.score.total} / 100</span></div>
        <CardTitle className="text-lg leading-6"><Link className="hover:underline" href={href}>{task.card.title.value || "Задача без названия"}</Link></CardTitle>
        <p className="text-sm text-muted-foreground">{task.businessName}</p>
      </CardHeader>
      <CardContent className="space-y-4"><p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{task.card.need.value || task.draftText}</p><LevelBadge level={task.score.level} /></CardContent>
    </Card>
  );
}
