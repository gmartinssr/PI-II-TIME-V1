import { spawn } from "node:child_process";

// "npm start": sobe o backend na porta 3000 servindo também as telas.
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const servidores = [spawn(npmCommand, ["run", "back"], {
  env: { ...process.env, PORT: "3000", SERVE_FRONTEND: "true" },
  shell: process.platform === "win32",
  stdio: "inherit",
})];

let encerrando = false;

// Encerra os servidores uma única vez.
function encerrar() {
  if (encerrando) {
    return;
  }

  encerrando = true;
  for (const servidor of servidores) {
    if (!servidor.killed) {
      servidor.kill("SIGINT");
    }
  }
}

for (const servidor of servidores) {
  servidor.on("error", (error) => {
    console.error("Não foi possível iniciar um dos servidores:", error);
    encerrar();
    process.exitCode = 1;
  });

  servidor.on("exit", (code) => {
    if (!encerrando && code !== 0) {
      process.exitCode = code ?? 1;
      encerrar();
    }
  });
}

process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
