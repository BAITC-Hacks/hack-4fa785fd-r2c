import { randomUUID } from "node:crypto";
import { calculateScore } from "@/lib/scoring";
import { compareCatalogTasks } from "@/lib/catalog";
import { NextResponse } from "next/server";
import { apiError, withApiErrors, withJson } from "@/lib/api";
import { readDb, updateDb } from "@/lib/store";
import { recommendTasks } from "@/lib/recommend";
import { CatalogQuerySchema, CreateTaskInputSchema, TaskSchema } from "@/lib/types";

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
    .sort(compareCatalogTasks);
  const team = db.teams.find((entry) => entry.id === teamId);
  return NextResponse.json({ tasks, recommended: team ? recommendTasks(published, team) : [] });
}

export async function POST(request: Request) {
  return withJson(request, CreateTaskInputSchema, (input) => withApiErrors(async () => {
    const task = await updateDb((db) => {
      const now = new Date().toISOString();
      const score = calculateScore(input.card);
      const created = TaskSchema.parse({
        ...input, id: randomUUID(), status: "draft", score, tags: [],
        createdAt: now, scoreHistory: [{ at: now, total: score.total }],
      });
      db.tasks.push(created);
      return created;
    });
    return NextResponse.json(task, { status: 201 });
  }));
}
