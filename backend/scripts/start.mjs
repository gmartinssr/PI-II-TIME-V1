import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const processes = [spawn(npmCommand, ["run", "back"], {
  env: { ...process.env, PORT: "3000", SERVE_FRONTEND: "true" },
  shell: process.platform === "win32",
  stdio: "inherit",
})];

let shuttingDown = false;

function stopProcesses() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
}

for (const child of processes) {
  child.on("error", (error) => {
    console.error("Não foi possível iniciar um dos servidores:", error);
    stopProcesses();
    process.exitCode = 1;
  });

  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      process.exitCode = code ?? 1;
      stopProcesses();
    }
  });
}

process.on("SIGINT", stopProcesses);
process.on("SIGTERM", stopProcesses);
