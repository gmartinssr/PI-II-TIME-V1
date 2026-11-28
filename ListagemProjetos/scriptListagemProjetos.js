// Mesma regra das outras telas: porta 3030 usa o backend de teste (3333).
// Aqui a URL vai só até /api porque esta tela chama /projetos/listagem
const API_URL =
    window.location.port === "3030"
        ? "http://localhost:3333/api"
        : "http://localhost:3000/api";

const PAGINA_LOGIN = "../Login/indexLogin.html";

const campoBusca = document.getElementById("campo-busca");
const mensagemVazia = document.getElementById("sem-resultado");
const listaLinhas = document.getElementById("linhas-projetos");

// Traduz a situação que vem do backend para o texto e a cor da etiqueta.
// "sem-demandas" usa a cor azul (status--aberta)
const SITUACOES = {
    andamento: { texto: "Em andamento", classe: "status--andamento" },
    "sem-demandas": { texto: "Sem demandas", classe: "status--aberta" },
    concluido: { texto: "Concluído", classe: "status--concluida" },
    inativo: { texto: "Inativo", classe: "status--cancelada" }
};

// Guarda a lista completa pra busca filtrar sem pedir de novo pro servidor
let projetos = [];

// Lê o usuário logado salvo na sessão.
// Devolve null se não tiver nada ou se o JSON estiver quebrado
function obterUsuario() {
    try {
        const salvo = sessionStorage.getItem("usuario");
        const usuario = salvo ? JSON.parse(salvo) : null;
        return usuario && usuario.idUsuario ? usuario : null;
    } catch {
        return null;
    }
}

// Limpa a sessão e volta para o login.
function irParaLogin() {
    sessionStorage.removeItem("usuario");
    window.location.href = PAGINA_LOGIN;
}

// Deixa o texto sem acento e em minúsculas pra busca achar "Sistema"
// mesmo digitando "sístema". O NFD separa a letra do acento
// e o replace apaga só os acentos
function normalizar(valor) {
    return valor
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// Cria um elemento com classe e texto.
function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    elemento.className = classe;
    if (texto !== undefined) {
        elemento.textContent = texto;
    }
    return elemento;
}

// Monta a linha de um projeto.
// Uso textContent (e não innerHTML), então o nome do projeto
// aparece como texto puro, sem risco de rodar HTML digitado por alguém.
// Se a situação vier desconhecida, cai em "Em andamento"
function criarLinha(projeto) {
    const situacao = SITUACOES[projeto.situacao] || SITUACOES.andamento;
    const palavra = projeto.demandas === 1 ? "demanda" : "demandas";

    const linha = criarElemento("article", "linha");

    linha.appendChild(criarElemento("span", "linha__nome", projeto.nome));
    linha.appendChild(
        criarElemento("span", "linha__demandas", `${projeto.demandas} ${palavra}`)
    );
    linha.appendChild(
        criarElemento("span", `status ${situacao.classe}`, situacao.texto)
    );

    const acoes = criarElemento("div", "linha__acoes");

    // O ?id= leva o kanban a abrir o projeto certo
    const acessar = criarElemento("a", "btn btn--principal", "Acessar projeto");
    acessar.href = `../Projects/indexKanban.html?id=${projeto.id}`;

    acoes.appendChild(acessar);
    linha.appendChild(acoes);

    return linha;
}

// Desenha a lista de projetos na tela.
// O replaceChildren troca tudo de uma vez, então não acumula linha repetida.
// A mensagem de "nenhum projeto" só aparece se a lista estiver vazia
function renderizar(lista) {
    listaLinhas.replaceChildren(...lista.map(criarLinha));
    mensagemVazia.textContent = "Nenhum projeto encontrado.";
    mensagemVazia.hidden = lista.length > 0;
}

// Mostra uma mensagem no lugar da lista.
function mostrarErro(mensagem) {
    listaLinhas.replaceChildren();
    mensagemVazia.textContent = mensagem;
    mensagemVazia.hidden = false;
}

// GET /api/projetos/listagem: projetos que o usuário pode ver.
// Sem usuário na sessão ou com erro 401, manda pro login.
// Qualquer outro problema vira mensagem na própria lista
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

// Filtra os projetos pelo nome enquanto a pessoa digita.
// A busca é feita na lista que já está na memória
campoBusca.addEventListener("input", function () {
    const texto = normalizar(campoBusca.value);

    const filtrados = projetos.filter(function (projeto) {
        return normalizar(projeto.nome).includes(texto);
    });

    renderizar(filtrados);
});

document.addEventListener("DOMContentLoaded", carregarProjetos);