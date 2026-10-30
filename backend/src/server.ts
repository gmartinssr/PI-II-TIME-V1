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
                p.tipo AS "perfil",
                SUBSTR(u.email, 1, INSTR(u.email, '@') - 1) AS "usuario"
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
            usuario: string;
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
                usuario: usuario.usuario,
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

interface UsuarioPublico {
    idUsuario: number;
    nome: string;
    email: string;
    usuario: string;
    idPerfil: number;
    perfil: string;
}

const consultaUsuarios = `
    SELECT
        u.id_usuario AS "idUsuario",
        u.nome AS "nome",
        u.email AS "email",
        SUBSTR(u.email, 1, INSTR(u.email, '@') - 1) AS "usuario",
        u.id_perfil AS "idPerfil",
        p.tipo AS "perfil"
    FROM usuario u
    INNER JOIN perfil p
        ON p.id_perfil = u.id_perfil
`;

app.get("/api/usuarios", async (_request, response) => {
    let conexao: oracledb.Connection | undefined;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const resultado = await conexao.execute(
            `${consultaUsuarios} ORDER BY u.nome`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        response.status(200).json({
            usuarios: resultado.rows as UsuarioPublico[]
        });
    } catch (erro) {
        console.error("Erro ao consultar usuários:", erro);
        response.status(500).json({
            mensagem: "Erro interno ao consultar usuários."
        });
    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
});

app.get("/api/usuarios/:id", async (request, response) => {
    const idUsuario = Number(request.params.id);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        response.status(400).json({
            mensagem: "O ID do usuário é inválido."
        });
        return;
    }

    let conexao: oracledb.Connection | undefined;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const resultado = await conexao.execute(
            `${consultaUsuarios} WHERE u.id_usuario = :idUsuario`,
            { idUsuario },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const usuario = resultado.rows?.[0] as UsuarioPublico | undefined;

        if (!usuario) {
            response.status(404).json({
                mensagem: "Usuário não encontrado."
            });
            return;
        }

        response.status(200).json({ usuario });
    } catch (erro) {
        console.error("Erro ao consultar o perfil do usuário:", erro);
        response.status(500).json({
            mensagem: "Erro interno ao consultar o perfil do usuário."
        });
    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
});

app.patch("/api/usuarios/:id/senha", async (request, response) => {
    const idUsuario = Number(request.params.id);
    const { senhaAtual, novaSenha, confirmarSenha } = request.body as {
        senhaAtual?: unknown;
        novaSenha?: unknown;
        confirmarSenha?: unknown;
    };

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        response.status(400).json({
            mensagem: "O ID do usuário é inválido."
        });
        return;
    }

    if (
        typeof senhaAtual !== "string" ||
        typeof novaSenha !== "string" ||
        typeof confirmarSenha !== "string" ||
        senhaAtual === "" ||
        novaSenha === "" ||
        confirmarSenha === ""
    ) {
        response.status(400).json({
            mensagem: "Preencha todos os campos de senha."
        });
        return;
    }

    if (novaSenha !== confirmarSenha) {
        response.status(400).json({
            mensagem: "A nova senha e a confirmação precisam ser iguais."
        });
        return;
    }

    const erroSenha = validarSenha(novaSenha);
    if (erroSenha) {
        response.status(400).json({
            mensagem: erroSenha
        });
        return;
    }

    let conexao: oracledb.Connection | undefined;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const resultado = await conexao.execute(
            `SELECT senha AS "senha"
             FROM usuario
             WHERE id_usuario = :idUsuario`,
            { idUsuario },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const usuario = resultado.rows?.[0] as { senha: string } | undefined;

        if (!usuario) {
            response.status(404).json({
                mensagem: "Usuário não encontrado."
            });
            return;
        }

        if (usuario.senha !== senhaAtual) {
            response.status(401).json({
                mensagem: "A senha atual está incorreta."
            });
            return;
        }

        await conexao.execute(
            `UPDATE usuario
             SET senha = :novaSenha
             WHERE id_usuario = :idUsuario`,
            { novaSenha, idUsuario }
        );
        await conexao.commit();

        response.status(200).json({
            mensagem: "Senha alterada com sucesso."
        });
    } catch (erro) {
        console.error("Erro ao alterar a senha:", erro);
        response.status(500).json({
            mensagem: "Erro interno ao alterar a senha."
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
  | "responsavel" | "solicitante" | "abertura" | "prazo" | "anexo"
  | "idCriador";
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
      responsavel,
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
 
const nomesProjetos: Record<string, string> = {
  workflow: "Sistema de Gestão"
};

app.get("/api/projetos", async (_request, response) => {
    let conexao: oracledb.Connection | undefined;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const resultado = await conexao.execute(
            `SELECT
                id_projeto AS "idProjeto",
                nome       AS "nome"
             FROM projeto
             WHERE ativo = 1
             ORDER BY nome`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        response.status(200).json({
            projetos: resultado.rows
        });

    } catch (erro) {
        console.error("Erro ao consultar projetos:", erro);

        response.status(500).json({
            mensagem: "Erro ao consultar projetos."
        });

    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
});

app.get("/api/responsaveis", async (_request, response) => {
    let conexao: oracledb.Connection | undefined;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const resultado = await conexao.execute(
            `SELECT
                id_usuario AS "idUsuario",
                nome AS "nome"
             FROM usuario
             WHERE ativo = 1
             ORDER BY nome`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        response.status(200).json({
            responsaveis: resultado.rows
        });

    } catch (erro) {
        console.error("Erro ao consultar responsáveis:", erro);

        response.status(500).json({
            mensagem: "Erro ao consultar responsáveis."
        });

    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
});

const nomesPrioridades: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica"
};

const nomesTipos: Record<Tipo, string> = {
  tarefa: "Tarefa",
  defeito: "Defeito",
  melhoria: "Melhoria",
  documentação: "Documentação"
};

async function buscarIdPorNome(
  conexao: oracledb.Connection,
  tabela: "projeto" | "prioridade" | "tipo_demanda" | "usuario",
  colunaId: string,
  colunaBusca: string,
  valor: string
): Promise<number | null> {
  const resultado = await conexao.execute(
    `SELECT ${colunaId} AS "id"
     FROM ${tabela}
     WHERE LOWER(${colunaBusca}) = LOWER(:valor)`,
    { valor },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const registro = resultado.rows?.[0] as { id: number } | undefined;
  return registro ? Number(registro.id) : null;
}

app.post("/api/demandas", async (request, response) => {
  const resultado = validarDemanda(request.body);
 
  if (!resultado.ok) {
    response.status(400).json({ valido: false, erros: resultado.erros });
    return;
  }

  const corpo = request.body as Record<string, unknown>;
  const idCriador = Number(corpo.idCriador);
  const dados = resultado.dados;
  const erros: ErrosCadastro = {};

  if (!Number.isInteger(idCriador) || idCriador <= 0) {
    erros.idCriador = "Não foi possível identificar o usuário criador.";
  }

  if (Object.keys(erros).length > 0) {
    response.status(400).json({ valido: false, erros });
    return;
  }

  let conexao: oracledb.Connection | undefined;

  try {
    const pool = await iniciarPool();
    conexao = await pool.getConnection();

    const projetoBusca = nomesProjetos[dados.projeto.toLowerCase()] ?? dados.projeto;
    const idProjeto = await buscarIdPorNome(
      conexao,
      "projeto",
      "id_projeto",
      "nome",
      projetoBusca
    );
    const idPrioridade = await buscarIdPorNome(
      conexao,
      "prioridade",
      "id_prioridade",
      "nome",
      nomesPrioridades[dados.prioridade]
    );
    const idTipo = await buscarIdPorNome(
      conexao,
      "tipo_demanda",
      "id_tipo",
      "nome",
      nomesTipos[dados.tipo]
    );

    let idResponsavel: number | null = null;

    if (dados.responsavel) {
        const resultadoResponsavel = await conexao.execute(
            `SELECT id_usuario AS "id"
            FROM usuario
            WHERE id_usuario = :idResponsavel
              AND ativo = 1`,
            { idResponsavel: Number(dados.responsavel) },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const registro = resultadoResponsavel.rows?.[0] as
            { id: number } | undefined;

        idResponsavel = registro ? Number(registro.id) : null;
    }

    const idCriadorExiste = await buscarIdPorNome(
      conexao,
      "usuario",
      "id_usuario",
      "id_usuario",
      String(idCriador)
    );

    if (idProjeto === null) {
      erros.projeto = "Projeto não encontrado no banco de dados.";
    }
    if (idPrioridade === null) {
      erros.prioridade = "Prioridade não encontrada no banco de dados.";
    }
    if (idTipo === null) {
      erros.categoria = "Categoria não encontrada no banco de dados.";
    }
    if (dados.responsavel && idResponsavel === null) {
        erros.responsavel = "Responsável não encontrado ou usuário inativo.";
    }
    if (idCriadorExiste === null) {
      erros.idCriador = "Usuário criador não encontrado no banco de dados.";
    }

    if (Object.keys(erros).length > 0) {
      response.status(400).json({ valido: false, erros });
      return;
    }

    const insercao = await conexao.execute(
      `INSERT INTO demanda (
         titulo,
         descricao,
         data_criacao,
         prazo,
         id_projeto,
         id_prioridade,
         id_tipo,
         id_criador,
         id_responsavel
       ) VALUES (
         :titulo,
         :descricao,
         TO_TIMESTAMP(:abertura, 'YYYY-MM-DD'),
         TO_DATE(:prazo, 'YYYY-MM-DD'),
         :idProjeto,
         :idPrioridade,
         :idTipo,
         :idCriador,
         :idResponsavel
       )
       RETURNING id_demanda INTO :idDemanda`,
      {
        titulo: dados.titulo,
        descricao: dados.descricao,
        abertura: dados.abertura,
        prazo: dados.prazo,
        idProjeto,
        idPrioridade,
        idTipo,
        idCriador,
        idResponsavel,
        idDemanda: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    await conexao.commit();

    const idDemanda = Number((insercao.outBinds as { idDemanda: number[] }).idDemanda[0]);
    response.status(201).json({
      valido: true,
      mensagem: "Demanda cadastrada com sucesso.",
      demanda: {
        id: idDemanda,
        titulo: dados.titulo,
        descricao: dados.descricao,
        projeto: projetoBusca,
        prioridade: dados.prioridade,
        tipo: dados.tipo,
        prazo: dados.prazo,
        status: "aberta",
        idCriador,
        idResponsavel
      }
    });
  } catch (erro) {
    if (conexao) {
      await conexao.rollback();
    }

    console.error("Erro ao cadastrar demanda no banco de dados:", erro);
    response.status(500).json({
      valido: false,
      mensagem: "Erro interno ao cadastrar a demanda."
    });
  } finally {
    if (conexao) {
      await conexao.close();
    }
  }
});
 

const STATUS_VALIDOS: StatusDemanda[] = ["aberta", "andamento", "revisao", "concluida", "cancelada"];
 
app.options("/api/demandas/:id/status", (_request, response) => {
  response.sendStatus(204);
});
 
//Visualizar demanda
app.get("/api/demandas/:id", async (request, response) => {
    const id = Number(request.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        response.status(400).json({
            valido: false,
            erro: "ID da demanda inválido."
        });
        return;
    }

    let conexao: oracledb.Connection | undefined;
    interface DemandaDetalhe {
      id: number;
      titulo: string;
      descricao: string;
      status: string;
      prioridade: string;
      tipo: string;
      categoria: string;
      prazo: string | null;
      abertura: string;
      projeto: string;
      responsavel: number | null;
      idCriador: number;
      solicitante: string;
      nomeResponsavel: string | null;
    }
    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const resultado = await conexao.execute(
            `SELECT
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
                LOWER(td.nome) AS "categoria",

                TO_CHAR(d.prazo, 'YYYY-MM-DD') AS "prazo",
                TO_CHAR(d.data_criacao, 'YYYY-MM-DD') AS "abertura",

                pr.nome AS "projeto",

                d.id_responsavel AS "responsavel",
                d.id_criador AS "idCriador",

                uc.nome AS "solicitante",
                ur.nome AS "nomeResponsavel"

            FROM demanda d

            INNER JOIN status s
                ON s.id_status = d.id_status

            INNER JOIN prioridade p
                ON p.id_prioridade = d.id_prioridade

            INNER JOIN tipo_demanda td
                ON td.id_tipo = d.id_tipo

            INNER JOIN projeto pr
                ON pr.id_projeto = d.id_projeto

            INNER JOIN usuario uc
                ON uc.id_usuario = d.id_criador

            LEFT JOIN usuario ur
                ON ur.id_usuario = d.id_responsavel

            WHERE d.id_demanda = :id`,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const demanda = resultado.rows?.[0] as DemandaDetalhe | undefined;

        if (!demanda) {
            response.status(404).json({
                valido: false,
                erro: "Demanda não encontrada."
            });
            return;
        }

        response.status(200).json({
            valido: true,
            demanda: {
                ...demanda,
                responsavel: demanda.responsavel
                    ? String(demanda.responsavel)
                    : ""
            }
        });

    } catch (erro) {
        console.error("Erro ao visualizar demanda:", erro);

        response.status(500).json({
            valido: false,
            erro: "Erro interno ao consultar a demanda."
        });

    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
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


app.get("/api/demandas/:id/comentarios", async (request, response) => {
    const idDemanda = Number(request.params.id);

    if (!Number.isInteger(idDemanda) || idDemanda <= 0) {
        return response.status(400).json({
            valido: false,
            mensagem: "ID da demanda inválido."
        });
    }

    let conexao;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const resultado = await conexao.execute(
            `SELECT
                c.id_comentario AS "id",
                c.texto AS "texto",
                TO_CHAR(c.data_hora, 'DD/MM/YYYY HH24:MI') AS "data",
                c.id_usuario AS "idUsuario",
                u.nome AS "usuario"
             FROM comentario c
             INNER JOIN usuario u
                ON u.id_usuario = c.id_usuario
             WHERE c.id_demanda = :idDemanda
             ORDER BY c.data_hora ASC`,
            { idDemanda },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return response.status(200).json({
            valido: true,
            comentarios: resultado.rows
        });

    } catch (erro) {
        console.error("Erro ao buscar comentários:", erro);

        return response.status(500).json({
            valido: false,
            mensagem: "Erro ao buscar comentários."
        });

    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
});



app.post("/api/demandas/:id/comentarios", async (request, response) => {
    const idDemanda = Number(request.params.id);
    const { texto, idUsuario } = request.body;

    if (!Number.isInteger(idDemanda) || idDemanda <= 0) {
        return response.status(400).json({
            valido: false,
            mensagem: "ID da demanda inválido."
        });
    }

    if (!texto || typeof texto !== "string" || !texto.trim()) {
        return response.status(400).json({
            valido: false,
            mensagem: "O comentário não pode estar vazio."
        });
    }

    const usuarioId = Number(idUsuario);

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        return response.status(400).json({
            valido: false,
            mensagem: "Usuário inválido."
        });
    }

    let conexao;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const resultado = await conexao.execute(
            `INSERT INTO comentario (
                texto,
                id_demanda,
                id_usuario
            ) VALUES (
                :texto,
                :idDemanda,
                :idUsuario
            )
            RETURNING id_comentario INTO :idComentario`,
            {
                texto: texto.trim(),
                idDemanda,
                idUsuario: usuarioId,
                idComentario: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER
                }
            },
            { autoCommit: true }
        );

        const idComentario = (resultado.outBinds as {
            idComentario: number[]
        }).idComentario[0];

        return response.status(201).json({
            valido: true,
            mensagem: "Comentário adicionado com sucesso.",
            id: idComentario
        });

    } catch (erro) {
        console.error("Erro ao adicionar comentário:", erro);

        return response.status(500).json({
            valido: false,
            mensagem: "Erro ao adicionar comentário."
        });

    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
});

interface DemandaAtual {
  idPrioridade: number;
  prioridade: string;
  prazo: string | null;
  idResponsavel: number | null;
  responsavel: string | null;
  status: string;
}

async function verificarAcessoProjeto(
    conexao: oracledb.Connection,
    idUsuario: number,
    idProjeto: number
): Promise<{ idPerfil: number; permitido: boolean } | null> {
    const resultado = await conexao.execute<{ idPerfil: number; vinculos: number }>(
        `SELECT
            u.id_perfil AS "idPerfil",
            (SELECT COUNT(*)
               FROM projeto_usuario pu
              WHERE pu.id_projeto = :idProjeto
                AND pu.id_usuario = u.id_usuario) AS "vinculos"
         FROM usuario u
         WHERE u.id_usuario = :idUsuario
           AND u.ativo = 1`,
        { idProjeto, idUsuario },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const linha = resultado.rows?.[0];

    if (!linha) {
        return null;
    }

    const idPerfil = Number(linha.idPerfil);

    return {
        idPerfil,
        permitido: idPerfil === 1 || Number(linha.vinculos) > 0
    };
}

const ID_STATUS: Record<StatusDemanda, number> = {
    aberta: 1,
    andamento: 2,
    revisao: 3,
    concluida: 4,
    cancelada: 5
};

const STATUS_POR_ID: Record<number, StatusDemanda> = {
    1: "aberta",
    2: "andamento",
    3: "revisao",
    4: "concluida",
    5: "cancelada"
};

const NOME_STATUS: Record<StatusDemanda, string> = {
    aberta: "Aberta",
    andamento: "Em andamento",
    revisao: "Em revisão",
    concluida: "Concluída",
    cancelada: "Cancelada"
};

const TRANSICOES: Record<StatusDemanda, StatusDemanda[]> = {
    aberta: ["andamento", "cancelada"],
    andamento: ["revisao", "cancelada"],
    revisao: ["concluida", "andamento", "cancelada"],
    concluida: [],
    cancelada: []
};

app.patch("/api/demandas/:id/status", async (request, response) => {
    const id = Number(request.params.id);
    const corpo = (request.body ?? {}) as { status?: unknown; idUsuario?: unknown };
    const idUsuario = Number(corpo.idUsuario);
    const novoStatus = texto(corpo.status).toLowerCase() as StatusDemanda;

    if (!Number.isInteger(id) || id <= 0) {
        response.status(400).json({ valido: false, erro: "ID da demanda inválido." });
        return;
    }

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        response.status(400).json({ valido: false, erro: "Usuário inválido." });
        return;
    }

    if (!STATUS_VALIDOS.includes(novoStatus)) {
        response.status(400).json({ valido: false, erro: "Status inválido." });
        return;
    }

    let conexao: oracledb.Connection | undefined;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const consulta = await conexao.execute<{
            idProjeto: number;
            idStatus: number;
        }>(
            `SELECT
                id_projeto AS "idProjeto",
                id_status AS "idStatus"
             FROM demanda
             WHERE id_demanda = :id
             FOR UPDATE`,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const demanda = consulta.rows?.[0];

        if (!demanda) {
            response.status(404).json({ valido: false, erro: "Demanda não encontrada." });
            return;
        }

        const acesso = await verificarAcessoProjeto(
            conexao,
            idUsuario,
            Number(demanda.idProjeto)
        );

        if (!acesso) {
            response.status(401).json({
                valido: false,
                erro: "Usuário não encontrado ou inativo."
            });
            return;
        }

        if (!acesso.permitido) {
            response.status(403).json({
                valido: false,
                erro: "Você não faz parte do projeto desta demanda."
            });
            return;
        }

        const ehAdmin = acesso.idPerfil === 1;
        const ehLider = acesso.idPerfil === 2;

        if (novoStatus === "cancelada" && !ehAdmin && !ehLider) {
            response.status(403).json({
                valido: false,
                erro: "Apenas Administrador ou Líder de Projeto podem cancelar demandas."
            });
            return;
        }

        const statusAtual = STATUS_POR_ID[Number(demanda.idStatus)];

        if (statusAtual === "cancelada") {
            response.status(409).json({
                valido: false,
                erro: "Demandas canceladas não podem ser movidas."
            });
            return;
        }

        if (statusAtual === novoStatus) {
            response.status(200).json({
                valido: true,
                mensagem: "A demanda já está neste status.",
                demanda: { id, status: novoStatus }
            });
            return;
        }

        await conexao.execute(
            `UPDATE demanda
                SET id_status = :idStatus,
                    data_ultima_atualizacao = SYSTIMESTAMP
              WHERE id_demanda = :id`,
            { idStatus: ID_STATUS[novoStatus], id }
        );

        await conexao.execute(
            `INSERT INTO historico_alteracao
                (tipo_alteracao, valor_anterior, valor_novo, id_demanda, id_usuario)
             VALUES
                (:tipo, :anterior, :novo, :id, :idUsuario)`,
            {
                tipo: novoStatus === "cancelada" ? "CANCELAMENTO" : "STATUS",
                anterior: NOME_STATUS[statusAtual],
                novo: NOME_STATUS[novoStatus],
                id,
                idUsuario
            }
        );

        await conexao.commit();

        response.status(200).json({
            valido: true,
            mensagem: "Status atualizado com sucesso.",
            demanda: { id, status: novoStatus }
        });

    } catch (erro) {
        if (conexao) {
            try { await conexao.rollback(); } catch { }
        }

        console.error("Erro ao atualizar status:", erro);

        response.status(500).json({
            valido: false,
            erro: "Erro interno ao atualizar o status."
        });

    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
});

app.put("/api/demandas/:id", async (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ valido: false, erro: "ID da demanda inválido." });
    return;
  }

  const validacao = validarDemanda(request.body);
  if (!validacao.ok) {
    response.status(400).json({ valido: false, erros: validacao.erros });
    return;
  }

  const dados = validacao.dados;

  const idUsuario = Number((request.body as Record<string, unknown>).idCriador);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    response.status(400).json({
      valido: false,
      erros: { idCriador: "Não foi possível identificar o usuário logado." }
    });
    return;
  }

  let conexao: oracledb.Connection | undefined;

  try {
    const pool = await iniciarPool();
    conexao = await pool.getConnection();

    const consultaAtual = await conexao.execute<DemandaAtual>(
      `SELECT
          d.id_prioridade AS "idPrioridade",
          p.nome          AS "prioridade",
          TO_CHAR(d.prazo, 'YYYY-MM-DD') AS "prazo",
          d.id_responsavel AS "idResponsavel",
          ur.nome         AS "responsavel",
          LOWER(s.nome)   AS "status"
       FROM demanda d
       INNER JOIN prioridade p ON p.id_prioridade = d.id_prioridade
       INNER JOIN status s     ON s.id_status = d.id_status
       LEFT JOIN usuario ur    ON ur.id_usuario = d.id_responsavel
       WHERE d.id_demanda = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const atual = consultaAtual.rows?.[0];

    if (!atual) {
      response.status(404).json({ valido: false, erro: "Demanda não encontrada." });
      return;
    }

    if (atual.status === "cancelada") {
      response.status(409).json({
        valido: false,
        erro: "Demandas canceladas não podem ser editadas."
      });
      return;
    }

    const erros: ErrosCadastro = {};

    const idProjeto = await buscarIdPorNome(
      conexao, "projeto", "id_projeto", "nome", dados.projeto
    );
    const idPrioridade = await buscarIdPorNome(
      conexao, "prioridade", "id_prioridade", "nome", nomesPrioridades[dados.prioridade]
    );
    const idTipo = await buscarIdPorNome(
      conexao, "tipo_demanda", "id_tipo", "nome", nomesTipos[dados.tipo]
    );

    let idResponsavel: number | null = null;
    let nomeResponsavel: string | null = null;

    if (dados.responsavel) {
      const idInformado = Number(dados.responsavel);

      if (!Number.isInteger(idInformado) || idInformado <= 0) {
        erros.responsavel = "Responsável inválido.";
      } else {
        const consultaResp = await conexao.execute<{ id: number; nome: string }>(
          `SELECT id_usuario AS "id", nome AS "nome"
           FROM usuario
           WHERE id_usuario = :idInformado AND ativo = 1`,
          { idInformado },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const registro = consultaResp.rows?.[0];

        if (registro) {
          idResponsavel = Number(registro.id);
          nomeResponsavel = registro.nome;
        } else {
          erros.responsavel = "Responsável não encontrado ou usuário inativo.";
        }
      }
    }

    const consultaEditor = await conexao.execute(
      `SELECT 1 AS "ok" FROM usuario WHERE id_usuario = :idUsuario AND ativo = 1`,
      { idUsuario },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!consultaEditor.rows?.[0]) {
      erros.idCriador = "Usuário logado não encontrado ou inativo.";
    }

    if (idProjeto === null)    erros.projeto = "Projeto não encontrado no banco de dados.";
    if (idPrioridade === null) erros.prioridade = "Prioridade não encontrada no banco de dados.";
    if (idTipo === null)       erros.categoria = "Categoria não encontrada no banco de dados.";

    if (Object.keys(erros).length > 0) {
      response.status(400).json({ valido: false, erros });
      return;
    }

    await conexao.execute(
      `UPDATE demanda
          SET titulo = :titulo,
              descricao = :descricao,
              prazo = TO_DATE(:prazo, 'YYYY-MM-DD'),
              id_projeto = :idProjeto,
              id_prioridade = :idPrioridade,
              id_tipo = :idTipo,
              id_responsavel = :idResponsavel,
              data_ultima_atualizacao = SYSTIMESTAMP
        WHERE id_demanda = :id`,
      {
        titulo: dados.titulo,
        descricao: dados.descricao,
        prazo: dados.prazo,
        idProjeto,
        idPrioridade,
        idTipo,
        idResponsavel,
        id
      }
    );

    const registrarHistorico = async (
      tipoAlteracao: "PRIORIDADE" | "PRAZO" | "RESPONSAVEL",
      valorAnterior: string | null,
      valorNovo: string | null
    ) => {
      await conexao!.execute(
        `INSERT INTO historico_alteracao
           (tipo_alteracao, valor_anterior, valor_novo, id_demanda, id_usuario)
         VALUES
           (:tipoAlteracao, :valorAnterior, :valorNovo, :id, :idUsuario)`,
        { tipoAlteracao, valorAnterior, valorNovo, id, idUsuario }
      );
    };

    if (Number(atual.idPrioridade) !== idPrioridade) {
      await registrarHistorico("PRIORIDADE", atual.prioridade, nomesPrioridades[dados.prioridade]);
    }

    if (atual.prazo !== dados.prazo) {
      await registrarHistorico("PRAZO", atual.prazo, dados.prazo);
    }

    const idRespAtual = atual.idResponsavel === null ? null : Number(atual.idResponsavel);
    if (idRespAtual !== idResponsavel) {
      await registrarHistorico("RESPONSAVEL", atual.responsavel, nomeResponsavel);
    }

    await conexao.commit();

    response.status(200).json({
      valido: true,
      mensagem: "Demanda atualizada com sucesso.",
      demanda: {
        id,
        titulo: dados.titulo,
        descricao: dados.descricao,
        projeto: dados.projeto,
        prioridade: dados.prioridade,
        tipo: dados.tipo,
        prazo: dados.prazo,
        status: atual.status,
        idResponsavel
      }
    });

  } catch (erro) {
    if (conexao) {
      try { await conexao.rollback(); } catch { }
    }

    console.error("Erro ao atualizar demanda:", erro);
    response.status(500).json({
      valido: false,
      mensagem: "Erro interno ao atualizar a demanda."
    });

  } finally {
    if (conexao) {
      await conexao.close();
    }
  }
});

interface DemandaKanban {
    id: number;
    titulo: string;
    descricao: string;
    status: string;
    prioridade: string;
    tipo: string;
    prazo: string | null;
    projeto: string;
    responsavel: string | null;
}

app.get("/api/projetos/listagem", async (request, response) => {
    const idUsuario = Number(request.query.idUsuario);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        response.status(400).json({
            valido: false,
            mensagem: "Usuário inválido."
        });
        return;
    }

    let conexao: oracledb.Connection | undefined;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const consultaUsuario = await conexao.execute<{ idPerfil: number }>(
            `SELECT id_perfil AS "idPerfil"
             FROM usuario
             WHERE id_usuario = :idUsuario
               AND ativo = 1`,
            { idUsuario },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const usuario = consultaUsuario.rows?.[0];

        if (!usuario) {
            response.status(401).json({
                valido: false,
                mensagem: "Usuário não encontrado ou inativo."
            });
            return;
        }

        const ehAdmin = Number(usuario.idPerfil) === 1;

        const filtro = ehAdmin
            ? ""
            : `WHERE EXISTS (
                   SELECT 1
                   FROM projeto_usuario pu
                   WHERE pu.id_projeto = pr.id_projeto
                     AND pu.id_usuario = :idUsuario
               )`;

        const binds: Record<string, number> = ehAdmin ? {} : { idUsuario };

        const resultado = await conexao.execute<{
            id: number;
            nome: string;
            ativo: number;
            demandas: number;
            pendentes: number;
        }>(
            `SELECT
                pr.id_projeto AS "id",
                pr.nome AS "nome",
                pr.ativo AS "ativo",
                COUNT(d.id_demanda) AS "demandas",
                COUNT(CASE WHEN d.id_status IN (1, 2, 3) THEN 1 END) AS "pendentes"
             FROM projeto pr
             LEFT JOIN demanda d
                ON d.id_projeto = pr.id_projeto
             ${filtro}
             GROUP BY pr.id_projeto, pr.nome, pr.ativo
             ORDER BY pr.nome`,
            binds,
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const projetos = (resultado.rows ?? []).map((linha) => {
            const demandas = Number(linha.demandas);
            const pendentes = Number(linha.pendentes);

            let situacao = "andamento";

            if (Number(linha.ativo) !== 1) {
                situacao = "inativo";
            } else if (demandas === 0) {
                situacao = "sem-demandas";
            } else if (pendentes === 0) {
                situacao = "concluido";
            }

            return {
                id: Number(linha.id),
                nome: linha.nome,
                demandas,
                situacao
            };
        });

        response.status(200).json({
            valido: true,
            ehAdmin,
            projetos
        });

    } catch (erro) {
        console.error("Erro ao listar projetos:", erro);

        response.status(500).json({
            valido: false,
            mensagem: "Erro interno ao consultar os projetos."
        });

    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
});

app.get("/api/projetos/:id/kanban", async (request, response) => {
    const idProjeto = Number(request.params.id);
    const idUsuario = Number(request.query.idUsuario);

    if (!Number.isInteger(idProjeto) || idProjeto <= 0) {
        response.status(400).json({
            valido: false,
            mensagem: "Projeto inválido."
        });
        return;
    }

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        response.status(400).json({
            valido: false,
            mensagem: "Usuário inválido."
        });
        return;
    }

    let conexao: oracledb.Connection | undefined;

    try {
        const pool = await iniciarPool();
        conexao = await pool.getConnection();

        const acesso = await verificarAcessoProjeto(conexao, idUsuario, idProjeto);

        if (!acesso) {
            response.status(401).json({
                valido: false,
                mensagem: "Usuário não encontrado ou inativo."
            });
            return;
        }

        if (!acesso.permitido) {
            response.status(403).json({
                valido: false,
                mensagem: "Você não faz parte deste projeto."
            });
            return;
        }

        const consultaProjeto = await conexao.execute<{ id: number; nome: string }>(
            `SELECT id_projeto AS "id", nome AS "nome"
             FROM projeto
             WHERE id_projeto = :idProjeto`,
            { idProjeto },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const projeto = consultaProjeto.rows?.[0];

        if (!projeto) {
            response.status(404).json({
                valido: false,
                mensagem: "Projeto não encontrado."
            });
            return;
        }

        const resultado = await conexao.execute<DemandaKanban>(
            `SELECT
                d.id_demanda AS "id",
                d.titulo AS "titulo",
                d.descricao AS "descricao",

                CASE d.id_status
                    WHEN 1 THEN 'aberta'
                    WHEN 2 THEN 'andamento'
                    WHEN 3 THEN 'revisao'
                    WHEN 4 THEN 'concluida'
                END AS "status",

                CASE d.id_prioridade
                    WHEN 1 THEN 'baixa'
                    WHEN 2 THEN 'media'
                    WHEN 3 THEN 'alta'
                    WHEN 4 THEN 'critica'
                END AS "prioridade",

                LOWER(td.nome) AS "tipo",
                TO_CHAR(d.prazo, 'YYYY-MM-DD') AS "prazo",
                pr.nome AS "projeto",
                u.nome AS "responsavel"

             FROM demanda d
             INNER JOIN tipo_demanda td ON td.id_tipo = d.id_tipo
             INNER JOIN projeto pr ON pr.id_projeto = d.id_projeto
             LEFT JOIN usuario u ON u.id_usuario = d.id_responsavel
             WHERE d.id_projeto = :idProjeto
               AND d.id_status <> 5
             ORDER BY d.prazo ASC NULLS LAST, d.id_demanda ASC`,
            { idProjeto },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const demandasProjeto = (resultado.rows ?? []).map((linha) => ({
            ...linha,
            responsavel: linha.responsavel ?? "Não atribuído"
        }));

        response.status(200).json({
            valido: true,
            projeto: { id: Number(projeto.id), nome: projeto.nome },
            demandas: demandasProjeto
        });

    } catch (erro) {
        console.error("Erro ao carregar o Kanban:", erro);

        response.status(500).json({
            valido: false,
            mensagem: "Erro interno ao carregar o Kanban."
        });

    } finally {
        if (conexao) {
            await conexao.close();
        }
    }
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
 