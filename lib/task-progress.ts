import type { FieldKey, ScoreResult, Task } from "./types";
import { compareCatalogTasks } from "./catalog";

const checkFields: Record<string, FieldKey> = {
  context: "context", need: "need", data: "data", result: "expectedResult",
  success: "successCriteria", constraints: "constraints", users: "users",
  contact: "contact", interaction: "interactionFormat",
};

export function getNextStep(preview: ScoreResult, confirmedTotal: number) {
  const grouped = new Map<FieldKey, { field: FieldKey; points: number; hints: string[] }>();
  for (const check of preview.blocks.flatMap((block) => block.checks)) {
    const field = checkFields[check.id.split(".")[0]];
    if (check.passed || !field) continue;
    const entry = grouped.get(field) ?? { field, points: 0, hints: [] };
    entry.points += check.points;
    entry.hints.push(check.hint.replace(" и подтвердите поле", "").replace(/ \(\+\d+\)/g, ""));
    grouped.set(field, entry);
  }
  const nextLevel = confirmedTotal < 40 ? { target: 40, name: "Рабочей" }
    : confirmedTotal < 70 ? { target: 70, name: "Готовой" }
      : confirmedTotal < 90 ? { target: 90, name: "Приоритетной" } : null;
  const candidates = [...grouped.values()].sort((a, b) => b.points - a.points);
  const step = candidates.find((entry) => nextLevel && confirmedTotal + entry.points >= nextLevel.target) ?? candidates[0];
  if (!step) return null;
  return { ...step, levelName: nextLevel && confirmedTotal + step.points >= nextLevel.target ? nextLevel.name : null };
}

/** Only observed positions, never a simulated publication or a stale score. */
export function observedPosition(task: Task, catalog?: Task[]) {
  if (task.status !== "published" || !catalog) return null;
  const sorted = catalog.filter((entry) => entry.status === "published").slice().sort(compareCatalogTasks);
  const index = sorted.findIndex((entry) => entry.id === task.id && entry.score.total === task.score.total);
  return index < 0 ? null : index + 1;
}
