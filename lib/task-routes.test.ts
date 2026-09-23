import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createTask, GET as getCatalog } from "@/app/api/tasks/route";
import { PATCH as updateTask } from "@/app/api/tasks/[id]/route";
import { POST as publishTask } from "@/app/api/tasks/[id]/publish/route";
import { POST as createProposal } from "@/app/api/tasks/[id]/proposals/route";
import { PATCH as changeProposal } from "@/app/api/proposals/[id]/route";
import { createStore } from "./store";
import { calculateScore } from "./scoring";
import { ApiErrorResponseSchema, CardSchema, ProposalSchema, TaskSchema, fieldKeys, type Card, type Database, type Proposal, type Task } from "./types";

const state = vi.hoisted(() => ({ store: undefined as ReturnType<typeof import("./store").createStore> | undefined }));
vi.mock("./store", async (importOriginal) => {
  const real = await importOriginal<typeof import("./store")>();
  return {
    ...real,
    readDb: () => state.store!.readDb(),
    updateDb: (mutator: Parameters<typeof real.updateDb>[0]) => state.store!.updateDb(mutator),
  };
});

let directory: string;
function emptyCard(): Card {
  return CardSchema.parse(Object.fromEntries(fieldKeys.map((key) => [key, {
    value: key === "title" ? "Задача кофейни" : "", confirmed: false, source: "user_edited",
  }])));
}
function dataCard() {
  const card = emptyCard();
  card.data = { value: "CSV с 1200 заказами за 6 месяцев", confirmed: true, source: "user_answer" };
  return card;
}
function req(method: string, body?: unknown) {
  return new Request("http://localhost/api/tasks", {
    method, headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const taskInput = () => ({ businessName: "  Кофейня  ", industry: " Общепит ", draftText: " Анализ заказов ", card: dataCard() });
const proposalInput = (teamId = "team-a") => ({ teamId, idea: "Собрать отчёт", plan: "Проверить CSV", timeline: "2 недели", prototypeUrl: "https://example.com/demo" });
async function givenTask(overrides: Partial<Task> = {}) {
  const card = overrides.card ?? emptyCard();
  const task = TaskSchema.parse({
    id: "task-a", businessName: "Кофейня", industry: "Общепит", draftText: "Нужен отчёт",
    card, status: "draft", score: calculateScore(card), tags: ["аналитика"],
    createdAt: "2020-01-01T00:00:00.000Z", scoreHistory: [{ at: "2020-01-01T00:00:00.000Z", total: calculateScore(card).total }],
    ...overrides,
  });
  await state.store!.updateDb((db) => { db.tasks.push(task); });
  return task;
}
async function givenProposal(overrides: Partial<Proposal> = {}) {
  const proposal = ProposalSchema.parse({
    ...proposalInput(), id: "proposal-a", taskId: "task-a", status: "pending", milestoneConfirmed: false,
    createdAt: "2020-01-01T00:00:00.000Z", ...overrides,
  });
  await state.store!.updateDb((db) => { db.proposals.push(proposal); });
  return proposal;
}
async function expectError(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(ApiErrorResponseSchema.parse(await response.json()).error.length).toBeGreaterThan(0);
}

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "taskready-api-"));
  const seed: Database = {
    tasks: [], proposals: [], aiLogs: [],
    teams: ["team-a", "team-b"].map((id) => ({ id, name: id, interests: [], skills: [], technologies: [], points: 100 })),
  };
  await writeFile(path.join(directory, "seed.json"), JSON.stringify(seed));
  state.store = createStore(directory);
  await state.store.initializeDb();
});
afterEach(async () => { vi.restoreAllMocks(); await rm(directory, { recursive: true, force: true }); });

describe("task mutations with the real store in a temporary directory", () => {
  it("POST /api/tasks persists a draft, server score and initial history", async () => {
    const response = await createTask(req("POST", taskInput()));
    expect(response.status).toBe(201);
    const task = TaskSchema.parse(await response.json());
    expect(task).toMatchObject({ businessName: "Кофейня", industry: "Общепит", draftText: "Анализ заказов", status: "draft", tags: [] });
    expect(task.score.total).toBe(20);
    expect(task.publishedAt).toBeUndefined();
    expect(task.scoreHistory).toEqual([{ at: task.createdAt, total: 20 }]);
    expect((await state.store!.readDb()).tasks).toEqual([task]);
  });

  it("PATCH /api/tasks/:id replaces the entire card and appends a recalculated history entry", async () => {
    const original = await givenTask({ card: dataCard(), status: "published", publishedAt: "2020-01-02T00:00:00.000Z" });
    const card = emptyCard();
    const response = await updateTask(req("PATCH", { card }), ctx(original.id));
    expect(response.status).toBe(200);
    const task = TaskSchema.parse(await response.json());
    expect(task.card).toEqual(card);
    expect(task.score.total).toBe(0);
    expect(task.scoreHistory).toHaveLength(2);
    expect(task.scoreHistory[0]).toEqual(original.scoreHistory[0]);
    expect(task.scoreHistory[1].total).toBe(0);
    expect(task).toMatchObject({ status: "published", publishedAt: original.publishedAt, createdAt: original.createdAt, tags: original.tags });
    expect((await state.store!.readDb()).tasks[0]).toEqual(task);
  });

  it("POST /publish allows score zero and returns the same global position as the catalog", async () => {
    await givenTask({ id: "old", status: "published", publishedAt: "2020-01-02T00:00:00.000Z" });
    await givenTask({ id: "high", card: dataCard(), status: "published", publishedAt: "2020-01-03T00:00:00.000Z" });
    await givenTask({ id: "hidden", card: dataCard() });
    await givenTask();
    const response = await publishTask(req("POST"), ctx("task-a"));
    expect(response.status).toBe(200);
    const { position, total, ...task } = await response.json();
    TaskSchema.parse(task);
    expect(task).toMatchObject({ status: "published", score: { total: 0 } });
    expect(task.publishedAt).toBeTruthy();
    expect({ position, total }).toEqual({ position: 2, total: 3 });
    const catalog = await (await getCatalog(new Request("http://localhost/api/tasks"))).json();
    expect(catalog.tasks.map((entry: Task) => entry.id)).toEqual(["high", "task-a", "old"]);
    const repeated = await (await publishTask(req("POST"), ctx("task-a"))).json();
    expect(repeated.publishedAt).toBe(task.publishedAt);
    expect(repeated.scoreHistory).toEqual(task.scoreHistory);
    expect((await state.store!.readDb()).tasks.find((entry) => entry.id === "task-a")).toEqual(task);
  });

  it("rejects publication without a nonblank title without writing the database", async () => {
    const card = emptyCard(); card.title.value = " \n ";
    await givenTask({ card });
    const before = await readFile(path.join(directory, "db.json"), "utf8");
    await expectError(await publishTask(req("POST"), ctx("task-a")), 400);
    expect(await readFile(path.join(directory, "db.json"), "utf8")).toBe(before);
  });

  it("returns a safe JSON 500 when saving fails", async () => {
    vi.spyOn(state.store!, "updateDb").mockRejectedValueOnce(new Error("secret internal path"));
    const response = await createTask(req("POST", taskInput()));
    expect(response.status).toBe(500);
    expect((await response.json()).error).not.toContain("secret internal path");
    expect((await state.store!.readDb()).tasks).toEqual([]);
  });
});

describe("proposal mutations", () => {
  it("POST /proposals accepts unlimited proposals including duplicates on a low-score published task", async () => {
    await givenTask({ status: "published", publishedAt: "2020-01-02T00:00:00.000Z" });
    const responses = await Promise.all(Array.from({ length: 4 }, () => createProposal(req("POST", proposalInput()), ctx("task-a"))));
    const ids = new Set<string>();
    for (const response of responses) {
      expect(response.status).toBe(201);
      const proposal = ProposalSchema.parse(await response.json());
      expect(proposal).toMatchObject({ ...proposalInput(), taskId: "task-a", status: "pending", milestoneConfirmed: false });
      ids.add(proposal.id);
    }
    expect(ids.size).toBe(4);
    expect((await state.store!.readDb()).proposals).toHaveLength(4);
  });

  it("rejects proposals on a draft", async () => {
    await givenTask();
    await expectError(await createProposal(req("POST", proposalInput()), ctx("task-a")), 400);
    expect((await state.store!.readDb()).proposals).toEqual([]);
  });

  it("rejects proposals from a nonexistent team", async () => {
    await givenTask({ status: "published" });
    await expectError(await createProposal(req("POST", proposalInput("missing")), ctx("task-a")), 404);
    expect((await state.store!.readDb()).proposals).toEqual([]);
  });

  it("PATCH /api/proposals/:id accepts multiple teams and rejects only the selected proposal", async () => {
    await givenTask({ status: "published" });
    await givenProposal();
    await givenProposal({ id: "proposal-b", teamId: "team-b" });
    for (const id of ["proposal-a", "proposal-b"]) {
      const response = await changeProposal(req("PATCH", { action: "accept" }), ctx(id));
      expect(response.status).toBe(200);
      expect(ProposalSchema.parse(await response.json()).status).toBe("accepted");
    }
    const response = await changeProposal(req("PATCH", { action: "reject" }), ctx("proposal-a"));
    expect(response.status).toBe(200);
    expect(ProposalSchema.parse(await response.json()).status).toBe("rejected");
    const db = await state.store!.readDb();
    expect(db.proposals.map((entry) => entry.status)).toEqual(["rejected", "accepted"]);
    expect(db.teams.map((entry) => entry.points)).toEqual([100, 100]);
  });

  it.each(["pending", "rejected"] as const)("does not confirm a milestone for %s", async (status) => {
    await givenTask({ status: "published" }); await givenProposal({ status });
    const before = await state.store!.readDb();
    await expectError(await changeProposal(req("PATCH", { action: "confirmMilestone" }), ctx("proposal-a")), 400);
    expect(await state.store!.readDb()).toEqual(before);
  });

  it("credits exactly +50 for concurrent confirmations and never resets the award on status changes", async () => {
    await givenTask({ status: "published" }); await givenProposal({ status: "accepted" });
    const confirm = () => changeProposal(req("PATCH", { action: "confirmMilestone" }), ctx("proposal-a"));
    const responses = await Promise.all([confirm(), confirm()]);
    expect(responses.map((entry) => entry.status).sort()).toEqual([200, 400]);
    const successful = responses.find((entry) => entry.status === 200)!;
    expect(ProposalSchema.parse(await successful.json()).milestoneConfirmed).toBe(true);
    let db = await state.store!.readDb();
    expect(db.proposals[0].milestoneConfirmed).toBe(true);
    expect(db.teams.map((entry) => entry.points)).toEqual([150, 100]);
    await changeProposal(req("PATCH", { action: "reject" }), ctx("proposal-a"));
    await changeProposal(req("PATCH", { action: "accept" }), ctx("proposal-a"));
    await expectError(await confirm(), 400);
    db = await state.store!.readDb();
    expect(db.teams[0].points).toBe(150);
  });

  it("does not mark a milestone when the referenced team is missing", async () => {
    await givenTask({ status: "published" }); await givenProposal({ status: "accepted", teamId: "missing" });
    await expectError(await changeProposal(req("PATCH", { action: "confirmMilestone" }), ctx("proposal-a")), 404);
    expect((await state.store!.readDb()).proposals[0].milestoneConfirmed).toBe(false);
  });
});

const mutations = [
  { name: "create task", run: (request: Request) => createTask(request), body: () => ({ ...taskInput(), status: "published" }) },
  { name: "update task", run: (request: Request) => updateTask(request, ctx("task-a")), body: () => ({ card: {} }) },
  { name: "create proposal", run: (request: Request) => createProposal(request, ctx("task-a")), body: () => ({ ...proposalInput(), prototypeUrl: "javascript:alert(1)" }) },
  { name: "change proposal", run: (request: Request) => changeProposal(request, ctx("proposal-a")), body: () => ({ action: "unknown" }) },
];
describe.each(mutations)("input validation: $name", ({ run, body }) => {
  it("rejects invalid schema without modifying data", async () => {
    const before = await state.store!.readDb();
    await expectError(await run(req("POST", body())), 400);
    expect(await state.store!.readDb()).toEqual(before);
  });
  it("rejects malformed JSON", async () => {
    await expectError(await run(new Request("http://localhost/api", { method: "POST", body: "{broken" })), 400);
  });
});

const idMutations = [
  { name: "update task", run: (id: string) => updateTask(req("PATCH", { card: emptyCard() }), ctx(id)) },
  { name: "publish task", run: (id: string) => publishTask(req("POST"), ctx(id)) },
  { name: "create proposal", run: (id: string) => createProposal(req("POST", proposalInput()), ctx(id)) },
  { name: "change proposal", run: (id: string) => changeProposal(req("PATCH", { action: "accept" }), ctx(id)) },
];
describe.each(idMutations)("ID validation: $name", ({ run }) => {
  it("returns 404 for an absent record", async () => { await expectError(await run("missing"), 404); });
  it("returns 400 for a blank ID", async () => { await expectError(await run("  "), 400); });
});
