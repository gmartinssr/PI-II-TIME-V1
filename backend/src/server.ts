import express from "express";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.get("/", (_request, response) => {
  response.status(200).json({
    message: "Backend funcionando",
  });
});

const server = app.listen(port, () => {
  console.log(`Servidor backend executando na porta ${port}`);
});

server.on("error", (error) => {
  console.error("Não foi possível iniciar o servidor backend:", error);
  process.exitCode = 1;
});
