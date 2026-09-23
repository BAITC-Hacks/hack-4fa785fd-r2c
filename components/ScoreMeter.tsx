import type { ScoreResult } from "@/lib/types";
import { LevelBadge } from "@/components/LevelBadge";
import { AnimatedScore } from "@/components/AnimatedScore";

const levelColor: Record<ScoreResult["level"], string> = {
  draft: "from-amber-400 to-orange-500",
  workable: "from-yellow-300 to-lime-500",
  ready: "from-lime-400 to-emerald-500",
  priority: "from-emerald-400 via-teal-400 to-cyan-400",
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
        <div><p className="text-sm text-muted-foreground">Рейтинг готовности</p><p className="mt-2 text-5xl font-semibold tracking-tight">{score ? <AnimatedScore value={score.total} /> : "—"}<span className="ml-2 text-lg font-normal text-muted-foreground">/ 100</span></p></div>
        {score && <LevelBadge level={score.level} />}
      </div>
      <div>
        <div role={score ? "meter" : undefined} aria-label={score ? "Подтверждённые баллы" : undefined} aria-valuenow={score?.total} aria-valuemin={score ? 0 : undefined} aria-valuemax={score ? 100 : undefined} className="relative h-4 overflow-hidden rounded-full bg-secondary shadow-inner">
          <div className={`relative h-full overflow-hidden rounded-full bg-gradient-to-r transition-[width] duration-1000 ease-out motion-reduce:transition-none ${score ? levelColor[score.level] : "from-emerald-400 to-emerald-600"}`} style={{ width: `${score?.total ?? 0}%` }}><span key={score?.total} className="score-track-shine absolute inset-0" aria-hidden="true" /></div>
          {[40, 70, 90].map((threshold) => <span key={threshold} aria-hidden="true" className="absolute inset-y-0 w-px bg-white/80" style={{ left: `${threshold}%` }} />)}
        </div>
        <div aria-hidden="true" className="relative mt-1 h-4 text-[10px] text-muted-foreground"><span>0</span>{[40, 70, 90].map((threshold) => <span key={threshold} className="absolute -translate-x-1/2" style={{ left: `${threshold}%` }}>{threshold}</span>)}</div>
      </div>
      {score && <p className="text-sm font-medium text-emerald-800">{nextLevel ? `До уровня «${nextLevel.label}» осталось ${nextLevel.remaining} баллов` : "Максимальный уровень"}</p>}
      <p className="text-xs leading-5 text-muted-foreground">{score ? `После подтверждения всех заполненных полей: ${score.potential} / 100.` : "Рейтинг появится после подключения карточки. Баллы начисляются только за подтверждённые сведения."}</p>
    </section>
  );
}
