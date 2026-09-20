console.log("JavaScript da Listagem conectado!");

const busca = document.querySelector(".filtros input");
const status = document.querySelectorAll(".filtros select")[0];
const prioridade = document.querySelectorAll(".filtros select")[1];
const tipo = document.querySelectorAll(".filtros select")[2];
const botaoFiltrar = document.querySelector(".botao-filtrar");
const semResultados = document.getElementById("sem-resultados");

const tabela = document.querySelector("tbody");
const linhas = tabela.querySelectorAll("tr");

const cards = document.querySelectorAll(".card");

const totalCard = cards[0].querySelector("p");
const andamentoCard = cards[1].querySelector("p");
const concluidasCard = cards[2].querySelector("p");
const criticasCard = cards[3].querySelector("p");
const botaoLimpar = document.querySelector(".botao-limpar");

function atualizarCards() {

    let total = 0;
    let andamento = 0;
    let concluidas = 0;
    let criticas = 0;

    linhas.forEach(function(linha) {

        if (linha.style.display === "none") {
            return;
        }

        const statusLinha = linha.cells[4].textContent;
        const prioridadeLinha = linha.cells[3].textContent;

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
    status.value = "";
    prioridade.value = "";
    tipo.value = "";

    linhas.forEach(function(linha) {
        linha.style.display = "";
    });

    semResultados.style.display = "none";

    atualizarCards();

});

botaoFiltrar.addEventListener("click", function() {

    const textoBusca = busca.value.trim().toLowerCase();
    const valorStatus = status.value;
    const valorPrioridade = prioridade.value;
    const valorTipo = tipo.value;

    let total = 0;
    let andamento = 0;
    let concluidas = 0;
    let criticas = 0;

    linhas.forEach(function(linha) {

        const titulo = linha.cells[1].textContent.toLowerCase();
        const tipoLinha = linha.cells[2].textContent;
        const prioridadeLinha = linha.cells[3].textContent;
        const statusLinha = linha.cells[4].textContent;

        const encontrouTitulo = titulo.includes(textoBusca);
        const encontrouStatus = valorStatus === "" || statusLinha === valorStatus;
        const encontrouPrioridade = valorPrioridade === "" || prioridadeLinha === valorPrioridade;
        const encontrouTipo = valorTipo === "" || tipoLinha === valorTipo;
        

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

    if (total === 0) {
        semResultados.style.display = "block";
    } else {
        semResultados.style.display = "none";
    }

    totalCard.textContent = total;
    andamentoCard.textContent = andamento;
    concluidasCard.textContent = concluidas;
    criticasCard.textContent = criticas;

});

atualizarCards();