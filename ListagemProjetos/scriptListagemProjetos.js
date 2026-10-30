const API_URL =
    window.location.port === "3030"
        ? "http://localhost:3333/api"
        : "http://localhost:3000/api";

const PAGINA_LOGIN = "../Login/indexLogin.html";

const campoBusca = document.getElementById("campo-busca");
const mensagemVazia = document.getElementById("sem-resultado");
const listaLinhas = document.getElementById("linhas-projetos");

const SITUACOES = {
    andamento: { texto: "Em andamento", classe: "status--andamento" },
    "sem-demandas": { texto: "Sem demandas", classe: "status--aberta" },
    concluido: { texto: "Concluído", classe: "status--concluida" },
    inativo: { texto: "Inativo", classe: "status--cancelada" }
};

let projetos = [];

function obterUsuario() {
    try {
        const salvo = sessionStorage.getItem("usuario");
        const usuario = salvo ? JSON.parse(salvo) : null;
        return usuario && usuario.idUsuario ? usuario : null;
    } catch {
        return null;
    }
}

function irParaLogin() {
    sessionStorage.removeItem("usuario");
    window.location.href = PAGINA_LOGIN;
}

function normalizar(valor) {
    return valor
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    elemento.className = classe;
    if (texto !== undefined) {
        elemento.textContent = texto;
    }
    return elemento;
}

function criarLinha(projeto) {
    const situacao = SITUACOES[projeto.situacao] || SITUACOES.andamento;
    const rotuloDemandas = projeto.demandas === 1 ? "demanda" : "demandas";

    const linha = criarElemento("article", "linha");

    linha.appendChild(criarElemento("span", "linha__nome", projeto.nome));
    linha.appendChild(
        criarElemento("span", "linha__demandas", `${projeto.demandas} ${rotuloDemandas}`)
    );
    linha.appendChild(
        criarElemento("span", `status ${situacao.classe}`, situacao.texto)
    );

    const acoes = criarElemento("div", "linha__acoes");

    const acessar = criarElemento("a", "btn btn--principal", "Acessar projeto");
    acessar.href = `../Projects/indexKanban.html?id=${projeto.id}`;

    acoes.appendChild(acessar);
    linha.appendChild(acoes);

    return linha;
}

function renderizar(lista) {
    listaLinhas.replaceChildren(...lista.map(criarLinha));
    mensagemVazia.textContent = "Nenhum projeto encontrado.";
    mensagemVazia.hidden = lista.length > 0;
}

function mostrarErro(mensagem) {
    listaLinhas.replaceChildren();
    mensagemVazia.textContent = mensagem;
    mensagemVazia.hidden = false;
}

async function carregarProjetos() {
    const usuario = obterUsuario();

    if (!usuario) {
        irParaLogin();
        return;
    }

    try {
        const resposta = await fetch(
            `${API_URL}/projetos/listagem?idUsuario=${encodeURIComponent(usuario.idUsuario)}`
        );

        if (resposta.status === 401) {
            irParaLogin();
            return;
        }

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.valido) {
            mostrarErro(resultado.mensagem || "Não foi possível carregar os projetos.");
            return;
        }

        projetos = resultado.projetos;
        renderizar(projetos);

    } catch (erro) {
        console.error("Erro ao carregar projetos:", erro);
        mostrarErro("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
    }
}

campoBusca.addEventListener("input", function () {
    const texto = normalizar(campoBusca.value);

    const filtrados = projetos.filter(function (projeto) {
        return normalizar(projeto.nome).includes(texto);
    });

    renderizar(filtrados);
});

document.addEventListener("DOMContentLoaded", carregarProjetos);