import type { Level } from "./types";

export const levelLabels: Record<Level, string> = {
  draft: "Черновик · требует уточнения",
  workable: "Рабочая",
  ready: "Готовая",
  priority: "Приоритетная",
};

export function getLevel(total: number): Level {
  if (total < 40) return "draft";
  if (total < 70) return "workable";
  if (total < 90) return "ready";
  return "priority";
}
