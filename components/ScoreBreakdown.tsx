import { Check, Circle } from "lucide-react";
import type { ScoreResult } from "@/lib/types";

const plannedBlocks = [
  ["Контекст и потребность", 20], ["Данные и материалы", 20], ["Ожидаемый результат", 15],
  ["Критерии успеха", 15], ["Ограничения", 10], ["Пользователи", 10], ["Связь с бизнесом", 10],
] as const;

export function ScoreBreakdown({ score }: { score?: ScoreResult }) {
  return (
    <div className="divide-y rounded-xl border bg-card px-4">
      {score ? score.blocks.map((block) => (
        <section key={block.key} className="py-3">
          <div className="flex items-center justify-between gap-3 text-sm font-medium"><span>{block.label}</span><span className="shrink-0 tabular-nums">{block.earned} / {block.max}</span></div>
          <ul className="mt-3 space-y-3">
            {block.checks.map((check) => <li key={check.id} className="flex items-start gap-2 text-xs leading-5">
              {check.passed ? <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-700" /> : <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-x-3"><span className={check.passed ? "text-foreground" : "text-muted-foreground"}>{check.label}</span><span className={check.passed ? "text-muted-foreground" : "font-semibold text-primary"}>{check.passed ? `${check.points} баллов` : `+${check.points} баллов`}</span></div>{!check.passed && <p className="mt-1 text-muted-foreground">{check.hint}</p>}</div>
            </li>)}
          </ul>
        </section>
      )) : plannedBlocks.map(([label, max]) => <div key={label} className="flex justify-between gap-4 py-3 text-sm"><span>{label}</span><span className="tabular-nums text-muted-foreground">— / {max}</span></div>)}
    </div>
  );
}
