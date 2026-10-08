//Prioridades - Numero
const prioridadeCritica = document.getElementById("prioridade-critica");
const prioridadeAlta = document.getElementById("prioridade-alta");
const prioridadeMedia = document.getElementById("prioridade-media");
const prioridadeBaixa = document.getElementById("prioridade-baixa");

//Prioridades - Barra
const barraCritica = document.getElementById("barra-critica");
const barraAlta = document.getElementById("barra-alta");
const barraMedia = document.getElementById("barra-media");
const barraBaixa = document.getElementById("barra-baixa");

//Tipo - Numero
const tipoTarefa = document.getElementById("tipo-tarefa");
const tipoDefeito = document.getElementById("tipo-defeito");
const tipoMelhoria = document.getElementById("tipo-melhoria");
const tipoDocumentacao = document.getElementById("tipo-documentacao");

//Tipo - Barra
const barraTarefa = document.getElementById("barra-tarefa");
const barraDefeito = document.getElementById("barra-defeito");
const barraMelhoria = document.getElementById("barra-melhoria");
const barraDocumentacao = document.getElementById("barra-documentacao");

//Cards de demandas
const criticasAbertas = document.getElementById("criticas-abertas");
const proximasDoPrazo = document.getElementById("proximas-ao-prazo");

//Buscar do Backend
fetch("http://localhost:3333/api/dashboard")
    .then(response => response.json())
    .then(dados => {
        console.log("Dados recebidos do backend:", dados);

        //Painel de Controle
        total.textContent = dados.total;
        

        abertas.textContent = dados.status.abertas;
        andamento.textContent = dados.status.andamento;
        revisao.textContent = dados.status.revisao;
        concluidas.textContent = dados.status.concluidas;
        canceladas.textContent = dados.status.canceladas;

        //Prioridade
        prioridadeCritica.textContent = dados.prioridades.critica;
        prioridadeAlta.textContent = dados.prioridades.alta;
        prioridadeMedia.textContent = dados.prioridades.media;
        prioridadeBaixa.textContent = dados.prioridades.baixa;

        barraCritica.style.width = `${(dados.prioridades.critica / dados.total) * 100}%`;
        barraAlta.style.width = `${(dados.prioridades.alta / dados.total) * 100}%`;
        barraMedia.style.width = `${(dados.prioridades.media / dados.total) * 100}%`;
        barraBaixa.style.width = `${(dados.prioridades.baixa / dados.total) * 100}%`;

        //Tipo
        tipoTarefa.textContent = dados.tipos.tarefa;
        tipoDefeito.textContent = dados.tipos.defeito;
        tipoMelhoria.textContent = dados.tipos.melhoria;
        tipoDocumentacao.textContent = dados.tipos.documentacao;

        barraTarefa.style.width = `${(dados.tipos.tarefa / dados.total) * 100}%`;
        barraDefeito.style.width = `${(dados.tipos.defeito / dados.total) * 100}%`;
        barraMelhoria.style.width = `${(dados.tipos.melhoria / dados.total) * 100}%`;
        barraDocumentacao.style.width = `${(dados.tipos.documentacao / dados.total) * 100}%`;


        criticasAbertas.innerHTML = "";

        dados.criticasAbertas.forEach(demanda => {
            criticasAbertas.innerHTML += `
                <div class="demanda-alerta">
                    <p>#${String(demanda.id).padStart(3, "0")} - ${demanda.titulo}</p>
                    <p>Crítica</p>
                </div>
            `;
        });

        proximasDoPrazo.innerHTML = "";

        dados.proximasDoPrazo.forEach(demanda => {
            const data = new Date(demanda.prazo);

            const dataFormatada = data.toLocaleDateString("pt-BR");

            proximasDoPrazo.innerHTML += `
                <div class="demanda-alerta">
                    <p>#${String(demanda.id).padStart(3, "0")} - ${demanda.titulo}</p>
                    <p>${dataFormatada}</p>
                </div>
            `;
        });
    })
    .catch(erro => {
        console.error("Erro ao carregar o Dashboard:", erro);
    });