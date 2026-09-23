import type { Task } from "./types";

/** Shared by the catalog and publication position; newer publications win ties. */
export function compareCatalogTasks(a: Task, b: Task): number {
  return b.score.total - a.score.total
    || Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt);
}
