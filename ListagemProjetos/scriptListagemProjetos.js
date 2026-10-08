const campoBusca = document.getElementById("campo-busca");
const mensagemVazia = document.getElementById("sem-resultado");
const projetos = [
    { id: 1, nome: "Sistema Workflow", demandas: 12, status: "Em andamento" },
    { id: 2, nome: "API de Música", demandas: 8, status: "Em andamento" },
    { id: 3, nome: "Assistente Virtual com IA", demandas: 24, status: "Em andamento" },
    { id: 4, nome: "Plataforma de E-commerce", demandas: 16, status: "Em andamento" },
    { id: 5, nome: "Plataforma de Integração de APIs", demandas: 20, status: "Em andamento" },
    { id: 6, nome: "Plataforma de Networking", demandas: 10, status: "Em andamento" }
];
const listaLinhas = document.getElementById("linhas-projetos");

function renderizar(lista) {
    listaLinhas.innerHTML = "";

    lista.forEach(function (projeto) {
        listaLinhas.innerHTML += `
            <article class="linha">
                <span class="linha__nome">${projeto.nome}</span>

                <span class="linha__demandas">${projeto.demandas} demandas</span>

                <span class="status status--andamento">${projeto.status}</span>

                <div class="linha__acoes">
                    <a class="btn btn--secundario" href="demandas.html?projeto=${projeto.id}">
                        Ver demandas
                    </a>
                    <a class="btn btn--principal" href="projeto.html?id=${projeto.id}">
                        Acessar projeto
                    </a>
                </div>
            </article>
        `;
    });
}


renderizar(projetos);

function normalizar(valor) {
    return valor
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

campoBusca.addEventListener("input", function () {
    const texto = normalizar(campoBusca.value);

    const filtrados = projetos.filter(function (projeto) {
        return normalizar(projeto.nome).includes(texto);
    });

    renderizar(filtrados);
    mensagemVazia.hidden = filtrados.length > 0;
});










