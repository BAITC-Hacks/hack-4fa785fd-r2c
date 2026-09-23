import { NextResponse } from "next/server";
import { apiError, notImplemented, withJson } from "@/lib/api";
import { readDb } from "@/lib/store";
import { recommendTasks } from "@/lib/recommend";
import { CatalogQuerySchema, CreateTaskInputSchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const parsed = CatalogQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return apiError("Проверьте отрасль, уровень готовности и идентификатор команды.");
  const { industry, level, teamId } = parsed.data;
  const db = await readDb();
  const published = db.tasks.filter((task) => task.status === "published");
  const tasks = published
    .filter((task) => (!industry || task.industry === industry) && (!level || task.score.level === level))
    .sort((a, b) => b.score.total - a.score.total || Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt));
  const team = db.teams.find((entry) => entry.id === teamId);
  return NextResponse.json({ tasks, recommended: team ? recommendTasks(published, team) : [] });
}

export async function POST(request: Request) {
  return withJson(request, CreateTaskInputSchema, () => notImplemented());
}
