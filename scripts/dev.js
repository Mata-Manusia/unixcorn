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

const procs = [
  run("web", "npm", ["run", "dev"], path.join(root, "apps/web"), "35"),
  run(
    "daemon",
    "go",
    ["run", "./cmd/daemon"],
    path.join(root, "apps/daemon"),
    "36"
  ),
];

process.on("SIGINT", () => {
  procs.forEach((p) => p.kill());
  process.exit(0);
});
