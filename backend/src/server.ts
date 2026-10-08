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

// Dashboard
app.get("/api/dashboard", (_request, response) => {
  const total = demandas.length;

  const abertas = demandas.filter(
    (demanda) => demanda.status === "aberta"
  ).length;

  const andamento = demandas.filter(
    (demanda) => demanda.status === "andamento"
  ).length;

  const revisao = demandas.filter(
    (demanda) => demanda.status === "revisao"
  ).length;

  const concluidas = demandas.filter(
    (demanda) => demanda.status === "concluida"
  ).length;

  const canceladas = demandas.filter(
    (demanda) => demanda.status === "cancelada"
  ).length;

  const prioridades = {
  critica: demandas.filter(
    (demanda) => demanda.prioridade === "critica"
  ).length,

  alta: demandas.filter(
    (demanda) => demanda.prioridade === "alta"
  ).length,

  media: demandas.filter(
    (demanda) => demanda.prioridade === "media"
  ).length,

  baixa: demandas.filter(
    (demanda) => demanda.prioridade === "baixa"
  ).length
};

const tipos = {
  tarefa: demandas.filter(
    (demanda) => demanda.tipo === "tarefa"
  ).length,

  defeito: demandas.filter(
    (demanda) => demanda.tipo === "defeito"
  ).length,

  melhoria: demandas.filter(
    (demanda) => demanda.tipo === "melhoria"
  ).length,

  documentacao: demandas.filter(
    (demanda) => demanda.tipo === "documentação"
  ).length
};

const criticasAbertas = demandas.filter(
  (demanda) =>
    demanda.status === "aberta" &&
    demanda.prioridade === "critica"
);

const hoje = new Date();
const limitePrazo = new Date(hoje);
limitePrazo.setDate(hoje.getDate() + 7);

const proximasDoPrazo = demandas.filter((demanda) => {
  const prazo = new Date(demanda.prazo);

  return prazo >= hoje && prazo <= limitePrazo;
});

  response.status(200).json({
    total,
    status: {
      abertas,
      andamento,
      revisao,
      concluidas,
      canceladas
    },
    prioridades,
    tipos,
    criticasAbertas,
    proximasDoPrazo
  });
});

const demandas = [
  {
    id: 1,
    titulo: "Corrigir erro de Login",
    status: "aberta",
    prioridade: "critica",
    tipo: "defeito",
    prazo: "2026-10-10",
    projeto: "Sistema de Gestão",
    responsavel: "joaoSM"
  },
  {
    id: 2,
    titulo: "Criar Dashboard",
    status: "andamento",
    prioridade: "alta",
    tipo: "tarefa",
    prazo: "2026-10-08",
    projeto: "Construção de Site",
    responsavel: "vitorZGB"
  },
  {
    id: 3,
    titulo: "Documentar API",
    status: "aberta",
    prioridade: "media",
    tipo: "documentação",
    prazo: "2026-10-09",
    projeto: "Manutenção de Sistema",
    responsavel: "guilhermeBM"
  },
  {
    id: 4,
    titulo: "Ajustar formulário",
    status: "revisao",
    prioridade: "alta",
    tipo: "melhoria",
    prazo: "2026-10-11",
    projeto: "Criação de Aplicativo",
    responsavel: "mariaOS"
  },
  {
    id: 5,
    titulo: "Falha no servidor",
    status: "aberta",
    prioridade: "critica",
    tipo: "defeito",
    prazo: "2026-10-07",
    projeto: "Portal Web",
    responsavel: "lucasMF"
  }
];

// Lista Demandas

app.get("/api/demandas", (_request, response) => {

  let resultado = [...demandas];

  const {
    status,
    prioridade,
    tipo,
    busca,
    ordenar,
    ordem
  } = _request.query;

  if (typeof status === "string") {
    resultado = resultado.filter(
      (demanda) => demanda.status === status.toLowerCase()
    );
  }

  if (typeof prioridade === "string") {
    resultado = resultado.filter(
      (demanda) => demanda.prioridade === prioridade.toLowerCase()
    );
  }

  if (typeof tipo === "string") {
    resultado = resultado.filter(
      (demanda) => demanda.tipo === tipo.toLowerCase()
    );
  }

  if (typeof busca === "string" && busca.trim() !== "") {
    const textoBusca = busca.trim().toLowerCase();

    resultado = resultado.filter(
      (demanda) =>
        demanda.titulo.toLowerCase().includes(textoBusca)
    );
  }

  if (typeof ordenar === "string") {

    const direcao = ordem === "desc" ? -1 : 1;

    resultado.sort((a, b) => {

      if (ordenar === "id") {
        return (a.id - b.id) * direcao;
      }

      if (ordenar === "titulo") {
        return a.titulo.localeCompare(b.titulo) * direcao;
      }

      if (ordenar === "prazo") {
        return (
          (new Date(a.prazo).getTime() -
            new Date(b.prazo).getTime()) * direcao
        );
      }

      if (ordenar === "prioridade") {
        const pesoPrioridade: Record<string, number> = {
          critica: 4,
          alta: 3,
          media: 2,
          baixa: 1
        };
        return (
          (pesoPrioridade[a.prioridade] -
            pesoPrioridade[b.prioridade]) * direcao
        );
      }

      return 0;
    });
  }

  response.status(200).json({
    total: resultado.length,
    demandas: resultado
  });
});

// Cadastro Demandas

 
type StatusDemanda = "aberta" | "andamento" | "revisao" | "concluida" | "cancelada";
type Prioridade = "baixa" | "media" | "alta" | "critica";
type Tipo = "tarefa" | "defeito" | "melhoria" | "documentação";
 
interface Anexo {
  nome: string;
  tamanho: number; 
}
 

interface Demanda {
  id: number;
  titulo: string;
  status: StatusDemanda;
  prioridade: Prioridade;
  tipo: Tipo; 
  prazo: string; 
  projeto: string;
  responsavel: string;
  descricao?: string;
  solicitante?: string;
  abertura?: string;
  anexo?: Anexo | null;
}
 

type NovaDemanda = Omit<Demanda, "id" | "status">;
 
type CampoCadastro =
  | "titulo" | "descricao" | "categoria" | "projeto" | "prioridade"
  | "responsavel" | "solicitante" | "abertura" | "prazo" | "anexo";
type ErrosCadastro = Partial<Record<CampoCadastro, string>>;
 
type ResultadoValidacao =
  | { ok: true; dados: NovaDemanda }
  | { ok: false; erros: ErrosCadastro };
 
const REGRAS = {
  titulo: { min: 5, max: 80 },
  descricao: { min: 10, max: 1000 },
  projeto: { max: 100 },
  solicitante: { min: 3, max: 100 },
  anexoMaxMb: 5,
  anexoExtensoes: ["png", "jpg", "jpeg", "pdf", "doc", "docx", "xls", "xlsx", "csv"],
};
 
const PRIORIDADES: Prioridade[] = ["baixa", "media", "alta", "critica"];
const TIPOS: Tipo[] = ["tarefa", "defeito", "melhoria", "documentação"];
 


function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}
 
function dataDeHoje(): string {
  return new Date().toLocaleDateString("sv-SE"); 
}
 

function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}
 
function proximoId(): number {
  return demandas.reduce((maior, d) => Math.max(maior, d.id), 0) + 1;
}


function validarDemanda(corpo: unknown): ResultadoValidacao {
  const body = (typeof corpo === "object" && corpo !== null ? corpo : {}) as Record<string, unknown>;
  const erros: ErrosCadastro = {};
 
  const titulo = texto(body.titulo);
  const descricao = texto(body.descricao);
  const categoria = texto(body.categoria).toLowerCase();
  const projeto = texto(body.projeto);
  const prioridade = (texto(body.prioridade).toLowerCase() || "baixa");
  const responsavel = texto(body.responsavel);
  const solicitante = texto(body.solicitante);
  const abertura = texto(body.abertura) || dataDeHoje();
  const prazo = texto(body.prazo);
 

  if (!titulo) {
    erros.titulo = "Informe o título da demanda.";
  } else if (titulo.length < REGRAS.titulo.min) {
    erros.titulo = `O título precisa ter pelo menos ${REGRAS.titulo.min} caracteres.`;
  } else if (titulo.length > REGRAS.titulo.max) {
    erros.titulo = `O título não pode ter mais de ${REGRAS.titulo.max} caracteres.`;
  }
 

  if (!descricao) {
    erros.descricao = "Descreva a demanda.";
  } else if (descricao.length < REGRAS.descricao.min) {
    erros.descricao = `A descrição precisa ter pelo menos ${REGRAS.descricao.min} caracteres.`;
  } else if (descricao.length > REGRAS.descricao.max) {
    erros.descricao = `A descrição não pode ter mais de ${REGRAS.descricao.max} caracteres.`;
  }
 

  if (!categoria) {
    erros.categoria = "Selecione uma categoria.";
  } else if (!TIPOS.includes(categoria as Tipo)) {
    erros.categoria = "Categoria inválida.";
  }
 
  if (!projeto) {
    erros.projeto = "Selecione o projeto relacionado.";
  } else if (projeto.length > REGRAS.projeto.max) {
    erros.projeto = `O projeto não pode ter mais de ${REGRAS.projeto.max} caracteres.`;
  }
 

  if (!PRIORIDADES.includes(prioridade as Prioridade)) {
    erros.prioridade = "Prioridade inválida.";
  }
 

  if (solicitante && solicitante.length < REGRAS.solicitante.min) {
    erros.solicitante = `O nome precisa ter pelo menos ${REGRAS.solicitante.min} caracteres.`;
  } else if (solicitante.length > REGRAS.solicitante.max) {
    erros.solicitante = `O nome não pode ter mais de ${REGRAS.solicitante.max} caracteres.`;
  }
 

  if (!dataValida(abertura)) {
    erros.abertura = "Data de abertura inválida.";
  } else if (abertura > dataDeHoje()) {
    erros.abertura = "A data de abertura não pode ser no futuro.";
  }
 
  if (!prazo) {
    erros.prazo = "Informe o prazo.";
  } else if (!dataValida(prazo)) {
    erros.prazo = "Prazo inválido.";
  } else if (!erros.abertura && prazo < abertura) {
    erros.prazo = "O prazo não pode ser anterior à data de abertura.";
  }
 

  let anexo: Anexo | null = null;
  if (body.anexo !== null && body.anexo !== undefined) {
    const a = body.anexo as Record<string, unknown>;
    const nome = texto(a.nome);
    const tamanho = typeof a.tamanho === "number" ? a.tamanho : NaN;
    const extensao = nome.split(".").pop()?.toLowerCase() ?? "";
 
    if (!nome || Number.isNaN(tamanho) || tamanho < 0) {
      erros.anexo = "Anexo inválido.";
    } else if (!REGRAS.anexoExtensoes.includes(extensao)) {
      erros.anexo = `Tipo de arquivo não permitido (.${extensao}).`;
    } else if (tamanho / (1024 * 1024) > REGRAS.anexoMaxMb) {
      erros.anexo = `O arquivo deve ter no máximo ${REGRAS.anexoMaxMb} MB.`;
    } else {
      anexo = { nome, tamanho };
    }
  }
 
  if (Object.keys(erros).length > 0) {
    return { ok: false, erros };
  }
 
  return {
    ok: true,
    dados: {
      titulo,
      descricao,
      tipo: categoria as Tipo,
      projeto,
      prioridade: prioridade as Prioridade,
      responsavel: responsavel || "Não atribuído",
      solicitante,
      abertura,
      prazo,
      anexo,
    },
  };
}
 

app.options("/api/demandas", (_request, response) => {
  response.sendStatus(204);
});
 
app.post("/api/demandas", (request, response) => {
  const resultado = validarDemanda(request.body);
 
  if (!resultado.ok) {
    response.status(400).json({ valido: false, erros: resultado.erros });
    return;
  }
 
  const novaDemanda: Demanda = {
    id: proximoId(),
    ...resultado.dados,
    status: "aberta", 
  };
 
  demandas.push(novaDemanda);
 
  response.status(201).json({
    valido: true,
    mensagem: "Demanda cadastrada com sucesso.",
    demanda: novaDemanda,
  });
});
 

const STATUS_VALIDOS: StatusDemanda[] = ["aberta", "andamento", "revisao", "concluida", "cancelada"];
 
app.options("/api/demandas/:id/status", (_request, response) => {
  response.sendStatus(204);
});
 
app.patch("/api/demandas/:id/status", (request, response) => {
  const id = Number(request.params.id);
  const demanda = demandas.find((d) => d.id === id);
 
  if (!demanda) {
    response.status(404).json({ valido: false, erro: "Demanda não encontrada." });
    return;
  }
 
  const corpo = (request.body ?? {}) as { status?: unknown };
  const status = texto(corpo.status).toLowerCase();
 
  if (!STATUS_VALIDOS.includes(status as StatusDemanda)) {
    response.status(400).json({ valido: false, erro: "Status inválido." });
    return;
  }
 
  demanda.status = status as StatusDemanda;
 
  response.status(200).json({ valido: true, demanda });
});

//Visualizar demanda

app.get("/api/demandas/:id", (request, response) => {
    const id = Number(request.params.id);

    const demanda = demandas.find((d) => d.id === id);

    if (!demanda) {
        response.status(404).json({
            valido: false,
            erro: "Demanda não encontrada."
        });

        return;
    }

    response.status(200).json({
        valido: true,
        demanda
    });
});

interface Comentario {
  id: number;
  demandaId: number;
  autor: string;
  texto: string;
  criadoEm: string;
}

const comentarios: Comentario[] = [
  {
    id: 1,
    demandaId: 1,
    autor: "joaoSM",
    texto: "O erro acontece somente quando a senha está incorreta.",
    criadoEm: "2026-10-08"
  },
  {
    id: 2,
    demandaId: 1,
    autor: "guilhermeBM",
    texto: "Vou verificar a validação do formulário.",
    criadoEm: "2026-10-08"
  },
  {
    id: 3,
    demandaId: 2,
    autor: "vitorZGB",
    texto: "Dashboard em desenvolvimento.",
    criadoEm: "2026-10-07"
  }
];

function proximoIdComentario(): number {
  return comentarios.reduce((maior, comentario) => Math.max(maior, comentario.id), 0) + 1;
}

app.get("/api/demandas/:id/comentarios", (request, response) => {
  const demandaId = Number(request.params.id);

  const demanda = demandas.find((d) => d.id === demandaId);

  if (!demanda) {
    response.status(404).json({
      valido: false,
      erro: "Demanda não encontrada."
    });
    return;
  }

  const resultado = comentarios.filter(
    (comentario) => comentario.demandaId === demandaId
  );

  response.status(200).json({
    total: resultado.length,
    comentarios: resultado
  });
});

app.post("/api/demandas/:id/comentarios", (request, response) => {
  const id = Number(request.params.id);

  if (Number.isNaN(id)) {
    response.status(400).json({
      valido: false,
      erro: "ID inválido."
    });
    return;
  }

  const demanda = demandas.find((d) => d.id === id);

  if (!demanda) {
    response.status(404).json({
      valido: false,
      erro: "Demanda não encontrada."
    });
    return;
  }

  const corpo = request.body as {
    autor?: unknown;
    texto?: unknown;
  };

  const autor = texto(corpo.autor);
  const textoComentario = texto(corpo.texto);

  if (!autor || !textoComentario) {
    response.status(400).json({
      valido: false,
      erro: "Os campos 'autor' e 'texto' são obrigatórios."
    });
    return;
  }

  const novoComentario: Comentario = {
    id: proximoIdComentario(),
    demandaId: id,
    autor,
    texto: textoComentario,
    criadoEm: new Date().toISOString()
  };

  comentarios.push(novoComentario);

  response.status(201).json({
    valido: true,
    mensagem: "Comentário adicionado com sucesso.",
    comentario: novoComentario
  });
});
 