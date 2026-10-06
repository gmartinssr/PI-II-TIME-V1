import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT) || 3333;
const serveFrontend = process.env.SERVE_FRONTEND === "true";

app.use(express.json());
app.use((_request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "http://localhost:3030");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  next();
});

app.options("/api/login", (_request, response) => {
  response.sendStatus(204);
});

app.post("/api/login", (request, response) => {
  const { email, senha } = request.body as {
    email?: unknown;
    senha?: unknown;
  };

  const erros: { email?: string; senha?: string } = {};

  if (typeof email !== "string") {
    erros.email = "O email é obrigatório.";
  } else {
    erros.email = validarEmail(email);
  }

  if (typeof senha !== "string" || senha.trim() === "") {
    erros.senha = "A senha é obrigatória.";
  } else {
    erros.senha = validarSenha(senha);
  }

  if (!erros.email) {
    delete erros.email;
  }
  if (!erros.senha) {
    delete erros.senha;
  }

  if (Object.keys(erros).length > 0) {
    response.status(400).json({ valido: false, erros });
    return;
  }

  response.status(200).json({
    valido: true,
    mensagem: "Dados de login válidos.",
  });
});

if (serveFrontend) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const frontendRoot = express.static(projectRoot);

  app.use(frontendRoot);
  app.get("/", (_request, response) => {
    response.redirect("/Login/indexLogin.html");
  });
} else {
  app.get("/", (_request, response) => {
    response.status(200).json({
      message: "Backend funcionando",
    });
  });
}

function validarEmail(email: string): string | undefined {
  const emailNormalizado = email.trim().toLowerCase();
  if (emailNormalizado === "") {
    return "O email é obrigatório.";
  }
  if (emailNormalizado.length < 6) {
    return "O email deve ter no mínimo 6 caracteres.";
  }
  if (emailNormalizado.length > 254) {
    return "O email não pode ter mais de 254 caracteres.";
  }
  if (/\s/.test(emailNormalizado)) {
    return "O email não pode conter espaços.";
  }

  const partes = emailNormalizado.split("@");
  if (partes.length !== 2) {
    return "O email deve conter um único caractere @.";
  }

  const [usuario, dominio] = partes;
  if (!usuario) {
    return "Informe a parte do email antes do @.";
  }
  if (!dominio) {
    return "Informe o domínio depois do @, como exemplo.com.";
  }
  if (usuario.startsWith(".") || usuario.endsWith(".") || usuario.includes("..")) {
    return "A parte antes do @ possui uma sequência de pontos inválida.";
  }
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(usuario)) {
    return "A parte antes do @ contém caracteres inválidos.";
  }
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dominio)) {
    return "O domínio deve estar no formato exemplo.com.";
  }

  const extensoesReconhecidas = [
    "com",
    "com.br",
    "net",
    "net.br",
    "org",
    "org.br",
    "edu",
    "edu.br",
    "gov",
    "gov.br",
    "io",
    "dev",
    "app",
  ];

  if (!extensoesReconhecidas.some((extensao) => dominio.endsWith(`.${extensao}`))) {
    return "O domínio informado não é reconhecido. Use .com, .com.br, .org, .net, .edu, .gov, .io, .dev ou .app.";
  }

  return undefined;
}

function validarSenha(senha: string): string | undefined {
  const erros: string[] = [];

  if (senha.length < 6) {
    erros.push("A senha deve ter no mínimo 6 caracteres.");
  }
  if (!/[A-Z]/.test(senha)) {
    erros.push("A senha deve conter pelo menos uma letra maiúscula.");
  }
  if (!/[a-z]/.test(senha)) {
    erros.push("A senha deve conter pelo menos uma letra minúscula.");
  }
  if (!/[0-9]/.test(senha)) {
    erros.push("A senha deve conter pelo menos um número.");
  }
  if (!/[._@!$#]/.test(senha)) {
    erros.push("A senha deve conter pelo menos um caractere especial: . _ @ ! $ ou #.");
  }
  if (!/^[A-Za-z0-9._@!$#]+$/.test(senha)) {
    erros.push("A senha contém caracteres não permitidos. Use somente letras, números e . _ @ ! $ #.");
  }

  return erros.length > 0 ? erros.join(" ") : undefined;
}

const server = app.listen(port, () => {
  const endereco = `http://localhost:${port}`;
  console.log(
    serveFrontend
      ? `Servidor completo executando em: ${endereco}`
      : `Servidor backend executando em: ${endereco}`,
  );
});

server.on("error", (error) => {
  console.error("Não foi possível iniciar o servidor backend:", error);
  process.exitCode = 1;
});
