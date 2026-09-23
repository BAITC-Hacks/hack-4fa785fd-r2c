import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Polling avoids native fs.watch/EMFILE failures in restricted development environments.
// Override WATCHPACK_POLLING=false to use native watchers where supported.
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, WATCHPACK_POLLING: process.env.WATCHPACK_POLLING ?? "1000" },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error("Не удалось запустить Next.js:", error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" || signal === "SIGTERM" ? 0 : 1);
});
