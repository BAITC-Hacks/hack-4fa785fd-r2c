import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "./store";
import { DatabaseSchema, type Database } from "./types";

const seed: Database = {
  tasks: [],
  teams: [{
    id: "test-team", name: "Тестовая команда", interests: ["Аналитика"],
    skills: ["SQL"], technologies: ["TypeScript"], points: 0,
  }],
  proposals: [],
  aiLogs: [],
};

describe("JSON store (isolated temporary directory)", () => {
  let directory: string;
  let databasePath: string;
  let seedPath: string;
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "taskready-store-"));
    databasePath = path.join(directory, "db.json");
    seedPath = path.join(directory, "seed.json");
    await writeFile(seedPath, JSON.stringify(seed), "utf8");
    store = createStore(directory);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("creates a validated DB from seed on the first read", async () => {
    expect(await store.readDb()).toEqual(seed);
    expect(JSON.parse(await readFile(databasePath, "utf8"))).toEqual(seed);
  });

  it("initialization preserves existing data and does not rewrite its file", async () => {
    const existing = structuredClone(seed);
    existing.teams[0].points = 50;
    const original = JSON.stringify(existing);
    await writeFile(databasePath, original, "utf8");
    await Promise.all(Array.from({ length: 8 }, () => store.initializeDb()));
    expect(await readFile(databasePath, "utf8")).toBe(original);
    expect((await store.readDb()).teams[0].points).toBe(50);
  });

  it.each(["{broken JSON", JSON.stringify({ teams: [] })])(
    "preserves an invalid existing DB instead of replacing it: %s",
    async (original) => {
      await writeFile(databasePath, original, "utf8");
      await expect(store.initializeDb()).rejects.toThrow();
      await expect(store.readDb()).rejects.toThrow();
      await expect(store.updateDb(() => undefined)).rejects.toThrow();
      expect(await readFile(databasePath, "utf8")).toBe(original);
    },
  );

  it("rejects a missing or invalid seed without creating a DB", async () => {
    await rm(seedPath);
    await expect(store.initializeDb()).rejects.toMatchObject({ code: "ENOENT" });
    await writeFile(seedPath, JSON.stringify({ teams: [] }), "utf8");
    await expect(store.initializeDb()).rejects.toThrow();
    await expect(readFile(databasePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("provides private read snapshots and returns asynchronous mutator results", async () => {
    const snapshot = await store.readDb();
    snapshot.teams[0].points = 999;
    expect((await store.readDb()).teams[0].points).toBe(0);
    const result = await store.updateDb(async (database) => {
      database.teams[0].points += 50;
      return { teamId: database.teams[0].id, points: database.teams[0].points };
    });
    expect(result).toEqual({ teamId: "test-team", points: 50 });
    expect((await store.readDb()).teams[0].points).toBe(50);
  });

  it("serializes concurrent writes across store instances without lost updates", async () => {
    const otherStore = createStore(path.join(directory, "."));
    await Promise.all(Array.from({ length: 40 }, (_, index) => {
      const instance = index % 2 === 0 ? store : otherStore;
      return instance.updateDb(async (database) => {
        const previous = database.teams[0].points;
        await Promise.resolve();
        database.teams[0].points = previous + 1;
      });
    }));
    expect((await store.readDb()).teams[0].points).toBe(40);
    expect((await readdir(directory)).sort()).toEqual(["db.json", "seed.json"]);
    expect(DatabaseSchema.parse(JSON.parse(await readFile(databasePath, "utf8"))))
      .toEqual(await store.readDb());
  });

  it("keeps queued reads and writes ordered across module reloads", async () => {
    let release!: () => void;
    let entered!: () => void;
    const enteredPromise = new Promise<void>((resolve) => { entered = resolve; });
    const releasePromise = new Promise<void>((resolve) => { release = resolve; });
    const first = store.updateDb(async (database) => {
      entered();
      await releasePromise;
      database.teams[0].points += 50;
    });
    await enteredPromise;
    vi.resetModules();
    const reloadedStore = (await import("./store")).createStore(directory);
    const second = reloadedStore.updateDb((database) => { database.teams[0].points += 50; });
    const queuedRead = reloadedStore.readDb();
    release();
    await Promise.all([first, second]);
    expect((await queuedRead).teams[0].points).toBe(100);
  });

  it("keeps the prior file and recovers after a mutator throws", async () => {
    await store.initializeDb();
    const original = await readFile(databasePath, "utf8");
    await expect(store.updateDb((database) => {
      database.teams[0].points = 100;
      throw new Error("Test mutation failed");
    })).rejects.toThrow("Test mutation failed");
    expect(await readFile(databasePath, "utf8")).toBe(original);
    await store.updateDb((database) => { database.teams[0].points += 50; });
    expect((await store.readDb()).teams[0].points).toBe(50);
  });

  it("validates updates before writing and recovers from schema errors", async () => {
    await store.initializeDb();
    const original = await readFile(databasePath, "utf8");
    await expect(store.updateDb((database) => { database.teams[0].points = -1; }))
      .rejects.toThrow();
    expect(await readFile(databasePath, "utf8")).toBe(original);
    await store.updateDb((database) => { database.teams[0].points = 50; });
    expect((await store.readDb()).teams[0].points).toBe(50);
    expect((await readdir(directory)).sort()).toEqual(["db.json", "seed.json"]);
  });

  it("reset restores seed, including after explicit recovery of a corrupted DB", async () => {
    await store.updateDb((database) => { database.teams[0].points = 100; });
    await store.resetDb();
    expect(await store.readDb()).toEqual(seed);
    await writeFile(databasePath, "{corrupted", "utf8");
    await store.resetDb();
    expect(await store.readDb()).toEqual(seed);
  });

  it("reset refuses an invalid seed and preserves current data", async () => {
    await store.updateDb((database) => { database.teams[0].points = 50; });
    const original = await readFile(databasePath, "utf8");
    await writeFile(seedPath, JSON.stringify({ teams: [] }), "utf8");
    await expect(store.resetDb()).rejects.toThrow();
    expect(await readFile(databasePath, "utf8")).toBe(original);
  });

  it("reset is serialized between earlier and later updates", async () => {
    const before = store.updateDb((database) => { database.teams[0].points = 100; });
    const reset = store.resetDb();
    const after = store.updateDb((database) => { database.teams[0].points += 50; });
    await Promise.all([before, reset, after]);
    expect((await store.readDb()).teams[0].points).toBe(50);
  });
});
