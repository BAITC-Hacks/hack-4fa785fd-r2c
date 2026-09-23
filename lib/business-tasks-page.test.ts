import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import BusinessTasksPage from "@/app/business/tasks/page";
import { readDb } from "./store";
import { cookies } from "next/headers";
import seed from "@/data/seed.json";
import { DatabaseSchema } from "./types";

vi.mock("./store", () => ({ readDb: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

it("shows the selected business tasks, links, scores and proposal counts", async () => {
  const db = DatabaseSchema.parse(seed);
  const selected = db.tasks[0];
  vi.mocked(readDb).mockResolvedValue(db);
  vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: encodeURIComponent(JSON.stringify({ kind: "business", businessName: selected.businessName })) }) } as unknown as Awaited<ReturnType<typeof cookies>>);
  const html = renderToStaticMarkup(await BusinessTasksPage());
  for (const task of db.tasks) {
    const link = `href="/business/tasks/${encodeURIComponent(task.id)}"`;
    if (task.businessName !== selected.businessName) { expect(html).not.toContain(link); continue; }
    expect(html).toContain(link);
    const row = html.split("<tr").find((value) => value.includes(link))!;
    expect(row).toContain(`${task.score.total} / 100`);
    expect(row).toContain(task.status === "published" ? "Опубликована" : "Черновик");
    expect(row).toContain(`>${db.proposals.filter((entry) => entry.taskId === task.id).length}</td>`);
  }
  expect(html).not.toContain("Заглушка страницы");
});
