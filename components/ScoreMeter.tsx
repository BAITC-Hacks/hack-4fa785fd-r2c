import type { ScoreResult } from "@/lib/types";
import { LevelBadge } from "@/components/LevelBadge";

const levelColor: Record<ScoreResult["level"], string> = {
  draft: "bg-amber-500",
  workable: "bg-yellow-500",
  ready: "bg-emerald-500",
  priority: "bg-emerald-700",
};

export function ScoreMeter({ score }: { score?: ScoreResult }) {
  const nextLevel = score && (score.total < 40
    ? { label: "Рабочая", remaining: 40 - score.total }
    : score.total < 70
      ? { label: "Готовая", remaining: 70 - score.total }
      : score.total < 90
        ? { label: "Приоритетная", remaining: 90 - score.total }
        : null);
  return (
    <section aria-label="Рейтинг готовности" className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-sm text-muted-foreground">Рейтинг готовности</p><p className="mt-2 text-5xl font-semibold tracking-tight">{score ? score.total : "—"}<span className="ml-2 text-lg font-normal text-muted-foreground">/ 100</span></p></div>
        {score && <LevelBadge level={score.level} />}
      </div>
      <div role={score ? "meter" : undefined} aria-label={score ? "Подтверждённые баллы" : undefined} aria-valuenow={score?.total} aria-valuemin={score ? 0 : undefined} aria-valuemax={score ? 100 : undefined} className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full transition-[width] duration-300 ${score ? levelColor[score.level] : "bg-primary"}`} style={{ width: `${score?.total ?? 0}%` }} />
      </div>
      {score && <p className="text-sm font-medium text-emerald-800">{nextLevel ? `До уровня «${nextLevel.label}» осталось ${nextLevel.remaining} баллов` : "Максимальный уровень"}</p>}
      <p className="text-xs leading-5 text-muted-foreground">{score ? `После подтверждения всех заполненных полей: ${score.potential} / 100.` : "Рейтинг появится после подключения карточки. Баллы начисляются только за подтверждённые сведения."}</p>
    </section>
  );
}
