import type { Task } from "./types";

/** Shared by the catalog and publication position; newer publications win ties. */
export function compareCatalogTasks(a: Task, b: Task): number {
  return b.score.total - a.score.total
    || Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt);
}

/** Preview one improvement against the unfiltered published catalog. */
export function projectCatalogPosition(task: Task, extraPoints: number, catalog?: Task[], publishedAt = new Date().toISOString()) {
  if (!catalog) return null;
  const projected: Task = {
    ...task,
    status: "published",
    publishedAt: task.publishedAt ?? publishedAt,
    score: { ...task.score, total: Math.min(100, task.score.total + extraPoints) },
  };
  // Replace in place to preserve the catalog's stable order for exact ties.
  const candidates = catalog.filter((entry) => entry.status === "published")
    .map((entry) => entry.id === task.id ? projected : entry);
  if (!candidates.some((entry) => entry.id === task.id)) candidates.push(projected);
  candidates.sort(compareCatalogTasks);
  return { position: candidates.findIndex((entry) => entry.id === task.id) + 1, total: candidates.length };
}
