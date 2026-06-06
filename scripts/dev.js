#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

function run(name, cmd, args, cwd, color) {
  const prefix = `\x1b[${color}m[${name}]\x1b[0m`;
  const proc = spawn(cmd, args, { cwd, shell: true });

  proc.stdout.on("data", (d) =>
    process.stdout.write(`${prefix} ${d.toString()}`)
  );
  proc.stderr.on("data", (d) =>
    process.stderr.write(`${prefix} ${d.toString()}`)
  );
  proc.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${prefix} exited with code ${code}`);
    }
  });

  return proc;
}

// Auto-restart wrapper with exponential backoff
function runWithRestart(name, cmd, args, cwd, color) {
  const prefix = `\x1b[${color}m[${name}]\x1b[0m`;
  let restartCount = 0;
  let lastRestartTime = Date.now();

  function start() {
    const proc = spawn(cmd, args, { cwd, shell: true });

    proc.stdout.on("data", (d) =>
      process.stdout.write(`${prefix} ${d.toString()}`)
    );
    proc.stderr.on("data", (d) =>
      process.stderr.write(`${prefix} ${d.toString()}`)
    );

    proc.on("exit", (code, signal) => {
      // Killed intentionally (SIGINT/SIGTERM) — don't restart
      if (signal === "SIGINT" || signal === "SIGTERM" || signal === "SIGKILL") return;

      const now = Date.now();
      const elapsed = now - lastRestartTime;

      // Reset counter if last crash was >30s ago
      if (elapsed > 30000) restartCount = 0;
      lastRestartTime = now;
      restartCount++;

      // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
      const delay = Math.min(1000 * Math.pow(2, restartCount - 1), 15000);

      if (restartCount > 10) {
        console.error(`${prefix} \x1b[31mCrashed ${restartCount} times. Stopping auto-restart.\x1b[0m`);
        return;
      }

      console.log(`${prefix} \x1b[33mCrashed (exit ${code}). Restarting in ${delay / 1000}s... [attempt ${restartCount}]\x1b[0m`);
      setTimeout(start, delay);
    });

    return proc;
  }

  return start();
}

const webProc = run("web", "npm", ["run", "dev"], path.join(root, "apps/web"), "35");
runWithRestart(
  "daemon",
  "go",
  ["run", "./cmd/daemon"],
  path.join(root, "apps/daemon"),
  "36"
);

process.on("SIGINT", () => {
  webProc.kill();
  process.exit(0);
});
