import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSchema, type Database } from "./types";

// Share queues across store instances and Next.js development module reloads.
// This coordinates one Node.js process only, as required by this JSON-file MVP.
const globalStore = globalThis as typeof globalThis & {
  __taskReadyStoreQueues?: Map<string, Promise<void>>;
};
const queues = (globalStore.__taskReadyStoreQueues ??= new Map());

async function readValidated(file: string): Promise<Database> {
  return DatabaseSchema.parse(JSON.parse(await readFile(file, "utf8")));
}

/** An isolated data directory also lets tests avoid the application's real DB. */
export function createStore(directory: string) {
  const dataDirectory = path.resolve(directory);
  const databasePath = path.join(dataDirectory, "db.json");
  const seedPath = path.join(dataDirectory, "seed.json");

  function serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = (queues.get(databasePath) ?? Promise.resolve()).then(operation);
    // A rejected operation must not poison subsequent reads, updates, or reset.
    const settled = result.then(() => undefined, () => undefined);
    queues.set(databasePath, settled);
    void settled.then(() => {
      if (queues.get(databasePath) === settled) queues.delete(databasePath);
    });
    return result;
  }

  async function writeAtomic(database: Database): Promise<void> {
    const validated = DatabaseSchema.parse(database);
    await mkdir(dataDirectory, { recursive: true });
    const temporaryPath = path.join(dataDirectory, `.db-${process.pid}-${randomUUID()}.tmp`);
    try {
      await writeFile(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      // Renaming within this directory exposes either the old or complete new file.
      await rename(temporaryPath, databasePath);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  async function readOrInitialize(): Promise<Database> {
    try {
      return await readValidated(databasePath);
    } catch (error) {
      // Invalid JSON, schema violations, and permission failures preserve the DB.
      // Only explicit reset is allowed to replace existing, damaged data.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const seed = await readValidated(seedPath);
      await writeAtomic(seed);
      return seed;
    }
  }

  function initializeDb(): Promise<void> {
    return serialized(async () => { await readOrInitialize(); });
  }

  function readDb(): Promise<Database> {
    return serialized(readOrInitialize);
  }

  /** Mutate a private snapshot; validate the complete result before saving. */
  function updateDb<T>(mutator: (database: Database) => T | Promise<T>): Promise<T> {
    return serialized(async () => {
      const database = await readOrInitialize();
      const result = await mutator(database);
      await writeAtomic(database);
      return result;
    });
  }

  function resetDb(): Promise<void> {
    return serialized(async () => writeAtomic(await readValidated(seedPath)));
  }

  return { initializeDb, readDb, updateDb, resetDb };
}

export const { initializeDb, readDb, updateDb, resetDb } = createStore(
  path.join(process.cwd(), "data"),
);
