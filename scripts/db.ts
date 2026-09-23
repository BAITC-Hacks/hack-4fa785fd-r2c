import { initializeDb, resetDb } from "../lib/store";

async function main(): Promise<void> {
  const action = process.argv[2];
  if (action === "init") {
    await initializeDb();
    console.log("Хранилище TaskReady готово: data/db.json");
    return;
  }
  if (action === "reset") {
    await resetDb();
    console.log("Тестовые данные TaskReady восстановлены из data/seed.json.");
    return;
  }
  throw new Error("Ожидается команда init или reset.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Не удалось подготовить хранилище.");
  process.exitCode = 1;
});
