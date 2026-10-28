console.log("JavaScript da Listagem conectado!");

const busca = document.querySelector(".filtros input");
const filtroStatus = document.querySelectorAll(".filtros select")[0];
const prioridade = document.querySelectorAll(".filtros select")[1];
const tipo = document.querySelectorAll(".filtros select")[2];
const botaoFiltrar = document.querySelector(".botao-filtrar");
const semResultados = document.getElementById("sem-resultados");

const tabela = document.querySelector("tbody");
let demandas = [];


const API_URL =
    window.location.port === "3030"
        ? "http://localhost:3333/api/demandas"
        : "http://localhost:3000/api/demandas";

function renderizarDemandas() {
    tabela.innerHTML = "";

    demandas.forEach(function(demanda) {
        const linha = document.createElement("tr");

        const statusTexto = {
            aberta: "Aberta",
            andamento: "Em andamento",
            revisao: "Em revisão",
            concluida: "Concluída",
            cancelada: "Cancelada"
        };

        const prioridadeTexto = {
            critica: "Crítica",
            alta: "Alta",
            media: "Média",
            baixa: "Baixa"
        };

        const statusClasse = {
            aberta: "aberta",
            andamento: "andamento",
            revisao: "revisao",
            concluida: "concluida",
            cancelada: "cancelada"
        };

        const prioridadeClasse = {
            critica: "critica",
            alta: "alta",
            media: "media",
            baixa: "baixa"
        };

        const tipoTexto = {
            tarefa: "Tarefa",
            defeito: "Defeito",
            melhoria: "Melhoria",
            "documentação": "Documentação"
        };

        linha.innerHTML = `
            <td>#${String(demanda.id).padStart(3, "0")}</td>
            <td>${demanda.titulo}</td>
            <td>${tipoTexto[demanda.tipo] || demanda.tipo}</td>
            <td>
                <span class="badge ${prioridadeClasse[demanda.prioridade] || ""}">
                    ${prioridadeTexto[demanda.prioridade] || demanda.prioridade}
                </span>
            </td>
            <td>
                <span class="badge ${statusClasse[demanda.status] || ""}">
                    ${statusTexto[demanda.status] || demanda.status}
                </span>
            </td>
            <td>${demanda.projeto}</td>
            <td>${demanda.responsavel}</td>
            <td>${demanda.dataCriacao || "—"}</td>
            <td>${demanda.prazo}</td>
            <td class="acoes">
                <a href="../verDemanda/visualizar-demanda.html?id=${demanda.id}"
                   class="btn-detalhes">Ver</a>
                <a href="../Cadastro/Edição-de-Demandas/Cadastro e edição de demandas.html?id=${demanda.id}"
                   class="btn-editar">Editar</a>
            </td>
        `;

        tabela.appendChild(linha);
    });

    semResultados.style.display =
        demandas.length === 0 ? "block" : "none";
}


async function carregarDemandas() {
    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error("Erro ao buscar demandas.");
        }

        const dados = await resposta.json();

        demandas = dados.demandas;

        renderizarDemandas();

        atualizarCards();
    } catch (erro) {
        console.error("Erro ao carregar demandas:", erro);
        tabela.innerHTML = "";
        semResultados.textContent = "Não foi possível carregar as demandas.";
        semResultados.style.display = "block";
    }
}

carregarDemandas();

const cards = document.querySelectorAll(".card");

const totalCard = cards[0].querySelector("p");
const andamentoCard = cards[1].querySelector("p");
const concluidasCard = cards[2].querySelector("p");
const criticasCard = cards[3].querySelector("p");
const botaoLimpar = document.querySelector(".botao-limpar");

function atualizarCards() {
    const linhas = tabela.querySelectorAll("tr");

    let total = 0;
    let andamento = 0;
    let concluidas = 0;
    let criticas = 0;

    linhas.forEach(function(linha) {
        if (linha.style.display === "none") {
            return;
        }

        const statusLinha = linha.cells[4].textContent.trim();
        const prioridadeLinha = linha.cells[3].textContent.trim();

        total++;

        if (statusLinha === "Em andamento") {
            andamento++;
        }

        if (statusLinha === "Concluída") {
            concluidas++;
        }

        if (prioridadeLinha === "Crítica") {
            criticas++;
        }
    });

    totalCard.textContent = total;
    andamentoCard.textContent = andamento;
    concluidasCard.textContent = concluidas;
    criticasCard.textContent = criticas;
}

botaoLimpar.addEventListener("click", function() {
    busca.value = "";
    filtroStatus.value = "";
    prioridade.value = "";
    tipo.value = "";

    renderizarDemandas();
    atualizarCards();
});

botaoFiltrar.addEventListener("click", function() {
    const textoBusca = busca.value.trim().toLowerCase();
    const valorStatus = filtroStatus.value;
    const valorPrioridade = prioridade.value;
    const valorTipo = tipo.value;

    const linhas = tabela.querySelectorAll("tr");

    let total = 0;
    let andamento = 0;
    let concluidas = 0;
    let criticas = 0;

    linhas.forEach(function(linha) {
        const titulo = linha.cells[1].textContent.toLowerCase();
        const tipoLinha = linha.cells[2].textContent.trim();
        const prioridadeLinha = linha.cells[3].textContent.trim();
        const statusLinha = linha.cells[4].textContent.trim();

        const encontrouTitulo = titulo.includes(textoBusca);
        const encontrouStatus =
            valorStatus === "" || statusLinha === valorStatus;
        const encontrouPrioridade =
            valorPrioridade === "" || prioridadeLinha === valorPrioridade;
        const encontrouTipo =
            valorTipo === "" || tipoLinha === valorTipo;

        if (
            encontrouTitulo &&
            encontrouStatus &&
            encontrouPrioridade &&
            encontrouTipo
        ) {
            linha.style.display = "";

            total++;

            if (statusLinha === "Em andamento") {
                andamento++;
            }

            if (statusLinha === "Concluída") {
                concluidas++;
            }

            if (prioridadeLinha === "Crítica") {
                criticas++;
            }
        } else {
            linha.style.display = "none";
        }
    });

    semResultados.style.display = total === 0 ? "block" : "none";

    totalCard.textContent = total;
    andamentoCard.textContent = andamento;
    concluidasCard.textContent = concluidas;
    criticasCard.textContent = criticas;
});