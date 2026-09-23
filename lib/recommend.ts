import type { Task, TaskRecommendation, Team } from "./types";

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/** Recommendations are a separate list and never restrict the main catalog. */
export function recommendTasks(tasks: Task[], team: Team): TaskRecommendation[] {
  const preferences = [...new Set([...team.interests, ...team.skills, ...team.technologies])];
  return tasks
    .filter((task) => task.status === "published" && task.score.total >= 40)
    .map((task) => {
      const topics = new Set([task.industry, ...task.tags].map(normalized));
      const matches = preferences.filter((preference) => topics.has(normalized(preference)));
      return { task, matches, reason: `Совпадают интересы, навыки или технологии: ${matches.join(", ")}.` };
    })
    .filter((recommendation) => recommendation.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length || b.task.score.total - a.task.score.total || b.task.createdAt.localeCompare(a.task.createdAt));
}
