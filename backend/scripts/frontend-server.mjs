import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.FRONT_PORT) || 3030;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function getFilePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const requestedPath = pathname === "/" ? "Login/indexLogin.html" : pathname.slice(1);
  const filePath = path.resolve(frontendRoot, requestedPath);
  const relativePath = path.relative(frontendRoot, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return filePath;
}

const server = http.createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Método não permitido");
    return;
  }

  const filePath = getFilePath(request.url || "/");
  if (!filePath) {
    response.writeHead(403);
    response.end("Acesso negado");
    return;
  }

  try {
    const content = await readFile(filePath);
    const contentType = contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    if (request.method === "HEAD") {
      response.end();
    } else {
      response.end(content);
    }
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      response.writeHead(404);
      response.end("Arquivo não encontrado");
      return;
    }

    console.error("Não foi possível servir o frontend:", error);
    response.writeHead(500);
    response.end("Erro interno do servidor");
  }
});

server.listen(port, () => {
  console.log(`Frontend executando em: http://localhost:${port}`);
  console.log(`Acesse o frontend em: http://localhost:${port}`);
});

server.on("error", (error) => {
  console.error("Não foi possível iniciar o servidor frontend:", error);
  process.exitCode = 1;
});
