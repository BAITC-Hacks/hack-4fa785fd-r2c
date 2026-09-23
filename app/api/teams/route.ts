import { NextResponse } from "next/server";
import { readDb } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDb();
  return NextResponse.json([...db.teams].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "ru")));
}
