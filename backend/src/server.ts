import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { iniciarPool, testarPool } from "./bd.js"; 
import oracledb from "oracledb";

const app = express();
const port = Number(process.env.PORT) || 3333;
const serveFrontend = process.env.SERVE_FRONTEND === "true";

app.use(express.json());
app.use((_request, response, next) => {
    const origem = _request.headers.origin;

    const origensPermitidas = [
        "http://localhost:3030",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000"
    ];

    if (origem && origensPermitidas.includes(origem)) {
        response.setHeader("Access-Control-Allow-Origin", origem);
    }

    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );

    if (_request.method === "OPTIONS") {
        return response.sendStatus(204);
    }

    next();
});

app.options("/api/login", (_request, response) => {
  response.sendStatus(204);
});


app.post("/api/login", async (request, response) => {
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
        response.status(400).json({
            valido: false,
            erros
        });
        return;
    }

    let conexao: oracledb.Connection | undefined;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const resultado = await conexao.execute(
            `SELECT
                u.id_usuario AS "idUsuario",
                u.nome AS "nome",
                u.email AS "email",
                u.senha AS "senha",
                u.ativo AS "ativo",
                u.id_perfil AS "idPerfil",
                p.tipo AS "perfil"
             FROM usuario u
             INNER JOIN perfil p
                ON p.id_perfil = u.id_perfil
             WHERE LOWER(u.email) = LOWER(:email)`,
            {
                email: (email as string).trim()
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        interface UsuarioLogin {
            idUsuario: number;
            nome: string;
            email: string;
            senha: string;
            ativo: number;
            idPerfil: number;
            perfil: string;
        }

        const usuario = (resultado.rows?.[0] as UsuarioLogin | undefined);

        if (!usuario) {
            response.status(404).json({
                valido: false,
                mensagem: "Este email não está cadastrado no sistema."
            });
            return;
        }

        if (Number(usuario.ativo) !== 1) {
            response.status(403).json({
                valido: false,
                mensagem: "Este usuário está inativo no sistema."
            });
            return;
        }

        if (usuario.senha !== senha) {
            response.status(401).json({
                valido: false,
                mensagem: "Senha incorreta."
            });
            return;
        }

        response.status(200).json({
            valido: true,
            mensagem: "Login realizado com sucesso.",
            usuario: {
                idUsuario: usuario.idUsuario,
                nome: usuario.nome,
                email: usuario.email,
                idPerfil: usuario.idPerfil,
                perfil: usuario.perfil
            }
        });

    } catch (erro) {
        console.error("Erro ao realizar login:", erro);

        response.status(500).json({
            valido: false,
            mensagem: "Erro interno ao realizar login."
        });

    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
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
app.get("/api/dashboard", async (_request, response) => {
    let conexao: oracledb.Connection | undefined;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        // Total de demandas
        const resultadoTotal = await conexao.execute(
            `SELECT COUNT(*) AS TOTAL FROM demanda`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const total = Number(
            (resultadoTotal.rows?.[0] as { TOTAL: number })?.TOTAL ?? 0
        );

        // Quantidade por status
        const resultadoStatus = await conexao.execute(
            `SELECT LOWER(s.nome) AS NOME, COUNT(*) AS QUANTIDADE
             FROM demanda d
             JOIN status s ON s.id_status = d.id_status
             GROUP BY LOWER(s.nome)`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const statusBanco = {
            abertas: 0,
            andamento: 0,
            revisao: 0,
            concluidas: 0,
            canceladas: 0
        };

        for (const linha of (resultadoStatus.rows ?? []) as {
            NOME: string;
            QUANTIDADE: number;
        }[]) {
            const quantidade = Number(linha.QUANTIDADE);

            switch (linha.NOME) {
                case "aberta":
                    statusBanco.abertas = quantidade;
                    break;
                case "em andamento":
                    statusBanco.andamento = quantidade;
                    break;
                case "em revisão":
                    statusBanco.revisao = quantidade;
                    break;
                case "concluída":
                    statusBanco.concluidas = quantidade;
                    break;
                case "cancelada":
                    statusBanco.canceladas = quantidade;
                    break;
            }
        }

        // Quantidade por prioridade
        const resultadoPrioridades = await conexao.execute(
            `SELECT LOWER(p.nome) AS NOME, COUNT(*) AS QUANTIDADE
             FROM demanda d
             JOIN prioridade p ON p.id_prioridade = d.id_prioridade
             GROUP BY LOWER(p.nome)`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const prioridades = {
            critica: 0,
            alta: 0,
            media: 0,
            baixa: 0
        };

        for (const linha of (resultadoPrioridades.rows ?? []) as {
            NOME: string;
            QUANTIDADE: number;
        }[]) {
            const quantidade = Number(linha.QUANTIDADE);

            switch (linha.NOME) {
                case "crítica":
                    prioridades.critica = quantidade;
                    break;
                case "alta":
                    prioridades.alta = quantidade;
                    break;
                case "média":
                    prioridades.media = quantidade;
                    break;
                case "baixa":
                    prioridades.baixa = quantidade;
                    break;
            }
        }

        // Quantidade por tipo
        const resultadoTipos = await conexao.execute(
            `SELECT LOWER(t.nome) AS NOME, COUNT(*) AS QUANTIDADE
             FROM demanda d
             JOIN tipo_demanda t ON t.id_tipo = d.id_tipo
             GROUP BY LOWER(t.nome)`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const tipos = {
            tarefa: 0,
            defeito: 0,
            melhoria: 0,
            documentacao: 0
        };

        for (const linha of (resultadoTipos.rows ?? []) as {
            NOME: string;
            QUANTIDADE: number;
        }[]) {
            const quantidade = Number(linha.QUANTIDADE);

            switch (linha.NOME) {
                case "tarefa":
                    tipos.tarefa = quantidade;
                    break;
                case "defeito":
                    tipos.defeito = quantidade;
                    break;
                case "melhoria":
                    tipos.melhoria = quantidade;
                    break;
                case "documentação":
                    tipos.documentacao = quantidade;
                    break;
            }
        }

        // Demandas críticas ainda abertas
        const resultadoCriticas = await conexao.execute(
            `SELECT
                d.id_demanda AS "id",
                d.titulo AS "titulo",
                TO_CHAR(d.prazo, 'YYYY-MM-DD') AS "prazo"
             FROM demanda d
             JOIN status s ON s.id_status = d.id_status
             JOIN prioridade p ON p.id_prioridade = d.id_prioridade
             WHERE LOWER(s.nome) = 'aberta'
               AND LOWER(p.nome) = 'crítica'
             ORDER BY d.prazo ASC NULLS LAST`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const criticasAbertas = (resultadoCriticas.rows ?? []) as {
            id: number;
            titulo: string;
            prazo: string | null;
        }[];

        // Demandas com prazo entre hoje e os próximos 7 dias
        const resultadoPrazos = await conexao.execute(
            `SELECT
                d.id_demanda AS "id",
                d.titulo AS "titulo",
                TO_CHAR(d.prazo, 'YYYY-MM-DD') AS "prazo"
             FROM demanda d
             WHERE d.prazo >= TRUNC(SYSDATE)
               AND d.prazo < TRUNC(SYSDATE) + 8
             ORDER BY d.prazo ASC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const proximasDoPrazo = (resultadoPrazos.rows ?? []) as {
            id: number;
            titulo: string;
            prazo: string | null;
        }[];

        // Resposta compatível com o scriptDashboard.js
        response.status(200).json({
            total,
            status: statusBanco,
            prioridades,
            tipos,
            criticasAbertas,
            proximasDoPrazo
        });

    } catch (erro) {
        console.error("Erro ao consultar o Dashboard:", erro);

        response.status(500).json({
            erro: "Erro interno ao consultar o Dashboard."
        });

    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
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
    responsavel: "joaoSM",
    dataCriacao: "2026-05-10"
  },
  {
    id: 2,
    titulo: "Criar Dashboard",
    status: "andamento",
    prioridade: "alta",
    tipo: "tarefa",
    prazo: "2026-10-08",
    projeto: "Construção de Site",
    responsavel: "vitorZGB",
    dataCriacao: "2026-05-08"
  },
  {
    id: 3,
    titulo: "Documentar API",
    status: "aberta",
    prioridade: "media",
    tipo: "documentação",
    prazo: "2026-10-09",
    projeto: "Manutenção de Sistema",
    responsavel: "guilhermeBM",
    dataCriacao: "2026-05-09"
  },
  {
    id: 4,
    titulo: "Ajustar formulário",
    status: "revisao",
    prioridade: "alta",
    tipo: "melhoria",
    prazo: "2026-10-11",
    projeto: "Criação de Aplicativo",
    responsavel: "mariaOS",
    dataCriacao: "2026-05-10"
  },
  {
    id: 5,
    titulo: "Falha no servidor",
    status: "aberta",
    prioridade: "critica",
    tipo: "defeito",
    prazo: "2026-10-07",
    projeto: "Portal Web",
    responsavel: "lucasMF",
    dataCriacao: "2026-09-07"
  }
];

// Lista Demandas

interface DemandaBanco {
    id: number;
    titulo: string;
    descricao: string;
    status: string;
    prioridade: string;
    tipo: string;
    prazo: string | null;
    projeto: string;
    responsavel: string | null;
    dataCriacao: string;
}

app.get("/api/demandas", async (_request, response) => {
    let conexao: oracledb.Connection | undefined;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const {
            status,
            prioridade,
            tipo,
            busca,
            ordenar,
            ordem
        } = _request.query;

        const condicoes: string[] = [];
        const binds: Record<string, string> = {};

        // Filtro por status
        const statusBanco: Record<string, string> = {
            aberta: "Aberta",
            andamento: "Em andamento",
            revisao: "Em revisão",
            concluida: "Concluída",
            cancelada: "Cancelada"
        };

        if (typeof status === "string") {
            const valor = statusBanco[status.toLowerCase()];

            if (!valor) {
                response.status(400).json({
                    valido: false,
                    erro: "Status inválido."
                });
                return;
            }

            condicoes.push("LOWER(s.nome) = LOWER(:status)");
            binds.status = valor;
        }

        // Filtro por prioridade
        const prioridadeBanco: Record<string, string> = {
            baixa: "Baixa",
            media: "Média",
            alta: "Alta",
            critica: "Crítica"
        };

        if (typeof prioridade === "string") {
            const valor = prioridadeBanco[prioridade.toLowerCase()];

            if (!valor) {
                response.status(400).json({
                    valido: false,
                    erro: "Prioridade inválida."
                });
                return;
            }

            condicoes.push("LOWER(p.nome) = LOWER(:prioridade)");
            binds.prioridade = valor;
        }

        // Filtro por tipo
        const tipoBanco: Record<string, string> = {
            tarefa: "Tarefa",
            defeito: "Defeito",
            melhoria: "Melhoria",
            "documentação": "Documentação"
        };

        if (typeof tipo === "string") {
            const valor = tipoBanco[tipo.toLowerCase()];

            if (!valor) {
                response.status(400).json({
                    valido: false,
                    erro: "Tipo de demanda inválido."
                });
                return;
            }

            condicoes.push("LOWER(td.nome) = LOWER(:tipo)");
            binds.tipo = valor;
        }

        // Busca por título ou descrição
        if (typeof busca === "string" && busca.trim() !== "") {
            condicoes.push(
                "(LOWER(d.titulo) LIKE :busca OR LOWER(d.descricao) LIKE :busca)"
            );

            binds.busca = `%${busca.trim().toLowerCase()}%`;
        }

        // Colunas permitidas para ordenação
        const colunasOrdenacao: Record<string, string> = {
            id: "d.id_demanda",
            titulo: "d.titulo",
            prazo: "d.prazo",
            prioridade: `
                CASE LOWER(p.nome)
                    WHEN 'baixa' THEN 1
                    WHEN 'média' THEN 2
                    WHEN 'alta' THEN 3
                    WHEN 'crítica' THEN 4
                END
            `
        };

        const coluna = typeof ordenar === "string"
            ? colunasOrdenacao[ordenar]
            : undefined;

        if (typeof ordenar === "string" && !coluna) {
            response.status(400).json({
                valido: false,
                erro: "Campo de ordenação inválido."
            });
            return;
        }

        const direcao = ordem === "desc" ? "DESC" : "ASC";

        const orderBy = coluna
            ? `ORDER BY ${coluna} ${direcao}`
            : "ORDER BY d.id_demanda ASC";

        const where = condicoes.length > 0
            ? `WHERE ${condicoes.join(" AND ")}`
            : "";

        const sql = `
            SELECT
                d.id_demanda AS "id",
                d.titulo AS "titulo",
                d.descricao AS "descricao",

                CASE LOWER(s.nome)
                    WHEN 'aberta' THEN 'aberta'
                    WHEN 'em andamento' THEN 'andamento'
                    WHEN 'em revisão' THEN 'revisao'
                    WHEN 'concluída' THEN 'concluida'
                    WHEN 'cancelada' THEN 'cancelada'
                END AS "status",

                CASE LOWER(p.nome)
                    WHEN 'baixa' THEN 'baixa'
                    WHEN 'média' THEN 'media'
                    WHEN 'alta' THEN 'alta'
                    WHEN 'crítica' THEN 'critica'
                END AS "prioridade",

                LOWER(td.nome) AS "tipo",
                TO_CHAR(d.prazo, 'YYYY-MM-DD') AS "prazo",
                pr.nome AS "projeto",
                u.nome AS "responsavel",
                TO_CHAR(d.data_criacao, 'YYYY-MM-DD') AS "dataCriacao"

            FROM demanda d

            INNER JOIN status s
                ON s.id_status = d.id_status

            INNER JOIN prioridade p
                ON p.id_prioridade = d.id_prioridade

            INNER JOIN tipo_demanda td
                ON td.id_tipo = d.id_tipo

            INNER JOIN projeto pr
                ON pr.id_projeto = d.id_projeto

            LEFT JOIN usuario u
                ON u.id_usuario = d.id_responsavel

            ${where}
            ${orderBy}
        `;

        const resultado = await conexao.execute<DemandaBanco>(
            sql,
            binds,
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const demandas = (resultado.rows ?? []).map((linha) => ({
            ...linha,
            responsavel: linha.responsavel ?? "Não atribuído"
        }));

        response.status(200).json({
            total: demandas.length,
            demandas
        });

    } catch (erro) {
        console.error("Erro ao listar demandas:", erro);

        response.status(500).json({
            valido: false,
            erro: "Erro interno ao consultar as demandas."
        });

    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
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
    dataCriacao: string;
    descricao?: string;
    solicitante?: string;
    abertura?: string;
    anexo?: Anexo | null;
}
 

type NovaDemanda = Omit<Demanda, "id" | "status" | "dataCriacao">;
 
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
      dataCriacao: dataDeHoje(),
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

app.put("/api/demandas/:id", (Request, Response) => {
  const id = Number(Request.params.id);
  if (isNaN(id)) {
    return Response.status(400).json({mensagem: "O ID precisa ser um numero."})
  }

  const index = demandas.findIndex((d) => d.id === id);

  if (index === -1) {
    return Response.status(404).json({mensagem: "Demanda nao encontrada"}); 
  }

  const validacoes = validarDemanda(Request.body);
  if(!validacoes.ok) {
    return Response.status(400).json({validado: false, erros: validacoes.erros});
  }  

  demandas[index] = {
    ...demandas[index],
    ...validacoes.dados,
  };

  Response.status(200).json({
    valido: true,
    mensagem: "Demanda atualizada com sucesso.",
    demanda: demandas[index],
  });
});

//Banco 
async function iniciarServidor() {
    try {
        await iniciarPool();
        await testarPool();

    } catch (erro) {
        console.error("Falha ao iniciar ou testar o pool Oracle:");
        console.error(erro);
    }
}

iniciarServidor();
 