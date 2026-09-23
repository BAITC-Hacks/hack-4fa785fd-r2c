import { Badge } from "@/components/ui/badge";
import type { Level } from "@/lib/types";

const labels: Record<Level, string> = {
  draft: "Черновик · требует уточнения",
  workable: "Рабочая",
  ready: "Готовая",
  priority: "Приоритетная",
};

export function LevelBadge({ level }: { level: Level }) {
  return <Badge variant={level === "priority" ? "default" : level === "draft" ? "outline" : "secondary"}>{labels[level]}</Badge>;
}
