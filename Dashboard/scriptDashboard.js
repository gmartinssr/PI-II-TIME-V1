// Elementos que vão receber os números e as barras.
// Os do resumo (total, abertas, andamento...) não estão aqui, ver o TODO abaixo
const prioridadeCritica = document.getElementById("prioridade-critica");
const prioridadeAlta = document.getElementById("prioridade-alta");
const prioridadeMedia = document.getElementById("prioridade-media");
const prioridadeBaixa = document.getElementById("prioridade-baixa");

const barraCritica = document.getElementById("barra-critica");
const barraAlta = document.getElementById("barra-alta");
const barraMedia = document.getElementById("barra-media");
const barraBaixa = document.getElementById("barra-baixa");

const tipoTarefa = document.getElementById("tipo-tarefa");
const tipoDefeito = document.getElementById("tipo-defeito");
const tipoMelhoria = document.getElementById("tipo-melhoria");
const tipoDocumentacao = document.getElementById("tipo-documentacao");

const barraTarefa = document.getElementById("barra-tarefa");
const barraDefeito = document.getElementById("barra-defeito");
const barraMelhoria = document.getElementById("barra-melhoria");
const barraDocumentacao = document.getElementById("barra-documentacao");

const criticasAbertas = document.getElementById("criticas-abertas");
const proximasDoPrazo = document.getElementById("proximas-ao-prazo");

// Porcentagem usada na largura das barras. Com total 0 devolve 0
// pra não dividir por zero
function calcularPorcentagem(valor, total) {
    if (total === 0) {
        return 0;
    }

    return (valor / total) * 100;
}

// GET /api/dashboard: preenche os totais, as barras e as listas de alerta.
// TODO: a URL está fixa na porta 3000. Nas outras telas escolho 3333 quando
// o front roda na 3030, aqui falta isso
fetch("http://localhost:3000/api/dashboard")
    .then(response => response.json())
    .then(dados => {
        console.log("Dados recebidos do backend:", dados);

        // TODO: total, abertas, andamento etc. não foram declarados com getElementById.
        // Funcionam porque o navegador cria uma variável global pra cada id do HTML,
        // mas é frágil. Melhor declarar lá em cima como os outros
        total.textContent = dados.total;

        abertas.textContent = dados.status.abertas;
        andamento.textContent = dados.status.andamento;
        revisao.textContent = dados.status.revisao;
        concluidas.textContent = dados.status.concluidas;
        canceladas.textContent = dados.status.canceladas;

        prioridadeCritica.textContent = dados.prioridades.critica;
        prioridadeAlta.textContent = dados.prioridades.alta;
        prioridadeMedia.textContent = dados.prioridades.media;
        prioridadeBaixa.textContent = dados.prioridades.baixa;

        // A barra mostra a fatia em relação ao total geral de demandas
        barraCritica.style.width =
            `${calcularPorcentagem(dados.prioridades.critica, dados.total)}%`;

        barraAlta.style.width =
            `${calcularPorcentagem(dados.prioridades.alta, dados.total)}%`;

        barraMedia.style.width =
            `${calcularPorcentagem(dados.prioridades.media, dados.total)}%`;

        barraBaixa.style.width =
            `${calcularPorcentagem(dados.prioridades.baixa, dados.total)}%`;

        tipoTarefa.textContent = dados.tipos.tarefa;
        tipoDefeito.textContent = dados.tipos.defeito;
        tipoMelhoria.textContent = dados.tipos.melhoria;
        tipoDocumentacao.textContent = dados.tipos.documentacao;

        barraTarefa.style.width =
            `${calcularPorcentagem(dados.tipos.tarefa, dados.total)}%`;

        barraDefeito.style.width =
            `${calcularPorcentagem(dados.tipos.defeito, dados.total)}%`;

        barraMelhoria.style.width =
            `${calcularPorcentagem(dados.tipos.melhoria, dados.total)}%`;

        barraDocumentacao.style.width =
            `${calcularPorcentagem(dados.tipos.documentacao, dados.total)}%`;

        // Limpa a lista antes de montar, senão duplicaria se rodasse de novo.
        // O id aparece com 3 dígitos (#007)
        criticasAbertas.innerHTML = "";

        dados.criticasAbertas.forEach(demanda => {
            criticasAbertas.innerHTML += `
                <div class="demanda-alerta">
                    <p>#${String(demanda.id).padStart(3, "0")} - ${demanda.titulo}</p>
                    <p>Crítica</p>
                </div>
            `;
        });

        // TODO: confirmar se a data bate com a da tela de demandas.
        // Se o backend manda só "AAAA-MM-DD", o new Date pode mostrar um dia
        // a menos por causa do fuso
        proximasDoPrazo.innerHTML = "";

        dados.proximasDoPrazo.forEach(demanda => {
            const data = new Date(demanda.prazo);

            const prazo = data.toLocaleDateString("pt-BR");

            proximasDoPrazo.innerHTML += `
                <div class="demanda-alerta">
                    <p>#${String(demanda.id).padStart(3, "0")} - ${demanda.titulo}</p>
                    <p>${prazo}</p>
                </div>
            `;
        });
    })
    .catch(erro => {
        // Por enquanto o erro só vai pro console, a tela fica com os "-"
        console.error("Erro ao carregar o Dashboard:", erro);
    });