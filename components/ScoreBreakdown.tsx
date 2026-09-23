import type { ScoreResult } from "@/lib/types";

const plannedBlocks = [
  ["Контекст и потребность", 20], ["Данные и материалы", 20], ["Ожидаемый результат", 15],
  ["Критерии успеха", 15], ["Ограничения", 10], ["Пользователи", 10], ["Связь с бизнесом", 10],
] as const;

export function ScoreBreakdown({ score }: { score?: ScoreResult }) {
  return (
    <div className="divide-y">
      {score ? score.blocks.map((block) => (
        <details key={block.key} className="py-3">
          <summary className="cursor-pointer text-sm font-medium">{block.label}<span className="float-right tabular-nums">{block.earned} / {block.max}</span></summary>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">{block.checks.map((check) => <li key={check.id}>{check.passed ? "Выполнено" : "Нужно уточнить"}: {check.label} ({check.points} б.){!check.passed && ` — ${check.hint}`}</li>)}</ul>
        </details>
      )) : plannedBlocks.map(([label, max]) => <div key={label} className="flex justify-between gap-4 py-3 text-sm"><span>{label}</span><span className="tabular-nums text-muted-foreground">— / {max}</span></div>)}
    </div>
  );
}
