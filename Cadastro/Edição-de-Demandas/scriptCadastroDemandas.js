"use strict";
//Limites usados na validação do Frontend. Backend também valida
//se for alterado nessa parte, conferir lá para não ficar diferente.
const REGRAS = {
    titulo: { min: 5, max: 80 },
    descricao: { min: 10, max: 1000 },
    solicitante: { min: 3, max: 100 },
    anexoMaxMb: 5,
    anexoExtensoes: ["png", "jpg", "jpeg", "pdf", "doc", "docx", "xls", "xlsx", "csv"],
};

// Se a URL tiver ?id=2, a tela abre em modo edição.
// Sem id, é um cadastro novo.
const urlParams = new URLSearchParams(window.location.search);
const demandaId = urlParams.get("id");

//Atalho para buscar elemento pelo id. Se esquecer de colocar o id no HTML,
//da erro em vez de dar "null" lá na frente 
function obter(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Elemento #${id} não encontrado no HTML`);
    return el;
}

// O locale "sv-SE" já retorna a data no formato AAAA-MM-DD,
// que é o formato utilizado pelo input type="date".
function hoje() {
    return new Date().toLocaleDateString("sv-SE");
}

// Pega todas as informações preenchidas pelo usuário e organiza em um único objeto.
// Caso a data de abertura não tenha sido informada, considera a data de hoje.
function coletarDados() {
    const valor = (id) => obter(id).value.trim();
    const prioridadeMarcada = document.querySelector('input[name="prioridade"]:checked');
    return {
        titulo: valor("titulo"),
        descricao: valor("descricao"),
        categoria: valor("categoria"),
        projeto: valor("projeto"),
        // Se por algum motivo nenhum radio estiver marcado, cai em "baixa"
        prioridade: (prioridadeMarcada?.value ?? "baixa"),
        responsavel: valor("responsavel"),
        solicitante: valor("solicitante"),
        abertura: valor("abertura") || hoje(),
        prazo: valor("prazo"),
        // Só pega o primeiro arquivo, o input não aceita múltiplos
        anexo: obter("anexo").files?.[0] ?? null,
    };
}

// Preenche os campos do formulário com as informações de uma demanda já existente.
// Essa função é utilizada quando o usuário deseja editar uma demanda.
function preencherFormulario(demanda) {
    obter("titulo").value = demanda.titulo || "";
    obter("descricao").value = demanda.descricao || "";
    // Aqui o campo recebe o valor de "tipo" que veio da API.
    // Verificar se esse é realmente o nome utilizado pelo backend.
    obter("categoria").value = demanda.tipo || "";
    obter("projeto").value = demanda.projeto || "";
    obter("responsavel").value = demanda.responsavel || "";
    obter("solicitante").value = demanda.solicitante || "";
    obter("abertura").value = demanda.abertura || demanda.dataCriacao || hoje();
    obter("prazo").value = demanda.prazo || "";


    // Seleciona automaticamente a prioridade que já estava cadastrada.
    if (demanda.prioridade) {
        const radio = document.querySelector(`input[name="prioridade"][value="${demanda.prioridade}"]`);
        if (radio) radio.checked = true;
    }

    // Atualiza o contador manualmente, porque mudar o .value por código
    // não dispara o evento "input" do textarea
    const textarea = obter("descricao");
    const contador = document.querySelector(".char-count");
    if (contador && textarea) {
        contador.textContent = `${textarea.value.length} / ${textarea.maxLength}`;
    }
}

// Confere se os dados da demanda estão corretos e retorna os campos que precisam de atenção.
// Se não encontrar nenhum problema, retorna um objeto vazio e permite salvar.
function validarDemanda(d) {
    const erros = {};

    // Verifica primeiro se o título foi preenchido e depois se atende ao tamanho mínimo.
    if (!d.titulo) {
        erros.titulo = "Informe o título da demanda.";
    }
    else if (d.titulo.length < REGRAS.titulo.min) {
        erros.titulo = `O título precisa ter pelo menos ${REGRAS.titulo.min} caracteres.`;
    }

    if (!d.descricao) {
        erros.descricao = "Descreva a demanda.";
    }
    else if (d.descricao.length < REGRAS.descricao.min) {
        erros.descricao = `A descrição precisa ter pelo menos ${REGRAS.descricao.min} caracteres.`;
    }

    if (!d.categoria)
        erros.categoria = "Selecione uma categoria.";
    if (!d.projeto)
        erros.projeto = "Selecione o projeto relacionado.";

    if (d.solicitante && d.solicitante.length < REGRAS.solicitante.min) {
        erros.solicitante = `O nome precisa ter pelo menos ${REGRAS.solicitante.min} caracteres.`;
    }

    if (d.abertura > hoje()) {
        erros.abertura = "A data de abertura não pode ser no futuro.";
    }
    if (!d.prazo) {
        erros.prazo = "Informe o prazo.";
    }
    // Compara as datas para garantir que o prazo não seja anterior à data de abertura.
    // Como estão no formato AAAA-MM-DD, a comparação pode ser feita diretamente.
    else if (d.prazo < d.abertura) {
        erros.prazo = "O prazo não pode ser anterior à data de abertura.";
    }

    // Como o anexo não é obrigatório, só verifica se o usuário selecionou algum arquivo.
    if (d.anexo) {
        const extensao = d.anexo.name.split(".").pop()?.toLowerCase() ?? "";
        const tamanhoMb = d.anexo.size / (1024 * 1024);
        if (!REGRAS.anexoExtensoes.includes(extensao)) {
            erros.anexo = `Tipo de arquivo não permitido (.${extensao}).`;
        }
        else if (tamanhoMb > REGRAS.anexoMaxMb) {
            erros.anexo = `O arquivo deve ter no máximo ${REGRAS.anexoMaxMb} MB.`;
        }
    }
    return erros;
}

// Exibe uma mensagem de erro abaixo do campo ou remove a mensagem, 
// caso não exista mais nenhum problema.
function mostrarErro(campo, mensagem) {
    const input = document.getElementById(campo);
    const container = input?.closest(".field, .dropzone");
    if (!input || !container)
        return;
    // Remove a mensagem anterior para evitar que vários erros apareçam ao mesmo tempo.
    container.querySelector(".error-message")?.remove();
    container.classList.toggle("has-error", Boolean(mensagem));
    // Informa aos leitores de tela se o campo está com erro.
    input.setAttribute("aria-invalid", String(Boolean(mensagem)));
    if (mensagem) {
        const span = document.createElement("span");
        span.className = "error-message";
        span.setAttribute("role", "alert");
        span.textContent = mensagem; 
        container.appendChild(span);
    }
}

// Verifica se os dados do formulário estão corretos e exibe o erro correspondente ao campo informado.
// Dessa forma, as regras de validação ficam concentradas em um único lugar.
function validarCampo(campo) {
    const erros = validarDemanda(coletarDados());
    mostrarErro(campo, erros[campo]);
}

// Atualiza a quantidade de caracteres da descrição conforme o usuário digita.
function iniciarContador() {
    const textarea = obter("descricao");
    const contador = document.querySelector(".char-count");
    if (!contador)
        return;
    const atualizar = () => {
        contador.textContent = `${textarea.value.length} / ${textarea.maxLength}`;
    };
    textarea.addEventListener("input", atualizar);
    atualizar();
}

// Permite que o usuário adicione um arquivo arrastando ele até a área indicada.
function iniciarDropzone() {
    const zona = document.querySelector(".dropzone");
    const inputArquivo = obter("anexo");
    if (!zona)
        return;
    zona.addEventListener("dragover", (e) => {
        e.preventDefault(); 
        zona.classList.add("dragover");
    });
    zona.addEventListener("dragleave", () => zona.classList.remove("dragover"));
    // Impede que o navegador abra o arquivo automaticamente ao arrastá-lo até a área.
    // Isso permite que o arquivo seja solto normalmente.
    zona.addEventListener("drop", (e) => {
        e.preventDefault();
        zona.classList.remove("dragover");
        if (e.dataTransfer?.files.length) {
        // Coloca o arquivo selecionado no campo de anexo.
        // Assim, o restante do código funciona da mesma forma que quando o arquivo
        // é escolhido pelo botão de selecionar arquivo.
            inputArquivo.files = e.dataTransfer.files;
            validarCampo("anexo");
        }
    });
}

// Define qual endereço do backend será utilizado de acordo com a porta em que o front-end está rodando.
// Na porta 3030, utiliza o backend de teste (3333). Nas demais, utiliza o backend normal (3000).
const API_BASE_URL =
    window.location.port === "3030"
        ? "http://localhost:3333/api/demandas"
        : "http://localhost:3000/api/demandas";

// Busca uma demanda pelo seu ID e coloca as informações encontradas nos campos do formulário.
// Essa função é utilizada quando o usuário está editando uma demanda existente.
async function carregarDadosDemanda(id) {
    try {
        const resposta = await fetch(`${API_BASE_URL}/${id}`);
        const resultado = await resposta.json();

        if (resposta.ok && resultado.valido) {
            preencherFormulario(resultado.demanda);
        } else {
            alert(resultado.erro || "Não foi possível carregar os dados da demanda.");
        }
    } catch {
        alert("Erro ao tentar carregar a demanda para edição.");
    }
}

// Salva as informações da demanda, tanto para um novo cadastro quanto para uma edição.
// Utiliza POST para cadastrar uma nova demanda e PUT para atualizar uma já existente.
async function salvarDemanda(dados) {
    // Recupera as informações do usuário que estão salvas no sessionStorage.
    // Caso não encontre o usuário, interrompe o processo, pois não será possível
    // identificar quem está criando a demanda.
    const usuarioSalvo = sessionStorage.getItem("usuario");

    if (!usuarioSalvo) {
        alert("Sua sessão não foi encontrada. Faça login novamente.");
        return;
    }

    let usuario;

    try {
        usuario = JSON.parse(usuarioSalvo);
    } catch {
        alert("Os dados da sessão são inválidos. Faça login novamente.");
        return;
    }

    if (!usuario?.idUsuario) {
        alert("Não foi possível identificar o usuário logado.");
        return;
    }

    // Por enquanto, o arquivo não é enviado ao servidor.
    // Apenas o nome e o tamanho do arquivo são enviados.
    // Para enviar o arquivo completo, será necessário utilizar FormData no lugar do JSON.
    const { anexo, ...resto } = dados;

    const corpo = {
        ...resto,
        idCriador: usuario.idUsuario,
        anexo: anexo
            ? {
                nome: anexo.name,
                tamanho: anexo.size,
            }
            : null,
    };

    const url = demandaId
        ? `${API_BASE_URL}/${demandaId}`
        : API_BASE_URL;

    const metodo = demandaId ? "PUT" : "POST";

    try {
        const resposta = await fetch(url, {
            method: metodo,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(corpo),
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            // Verifica se o servidor retornou algum erro específico para os campos do formulário.
            // Se encontrar, mostra cada mensagem no campo correspondente.
            // Caso contrário, exibe uma mensagem de erro geral.
            const errosServidor = resultado.erros ?? {};

            Object.keys(errosServidor).forEach((campo) => {
                mostrarErro(campo, errosServidor[campo]);
            });

            if (Object.keys(errosServidor).length === 0) {
                alert(
                    resultado.mensagem ||
                    resultado.erro ||
                    "Não foi possível salvar a demanda."
                );
            }

            return;
        }

        const mensagemSucesso = demandaId
            ? "Demanda atualizada com sucesso!"
            : "Demanda cadastrada com sucesso!";

        alert(mensagemSucesso);

        window.location.href = "../../lista-demanda/tela.html";
    } catch (erro) {
        console.error("Erro ao salvar demanda:", erro);

        alert(
            "Não foi possível conectar ao servidor. " +
            "Verifique se o backend está rodando."
        );
    }
}

// Solicita a confirmação do usuário antes de excluir a demanda.
// Envia o ID do usuário junto com a solicitação para que o backend
// possa verificar se ele tem permissão para realizar a exclusão.
async function excluirDemanda() {
    const confirmou = confirm(
        "Tem certeza que deseja excluir esta demanda? Essa ação não pode ser desfeita."
    );

    if (!confirmou) return;

    const usuarioSalvo = sessionStorage.getItem("usuario");

    if (!usuarioSalvo) {
        alert("Sua sessão não foi encontrada. Faça login novamente.");
        return;
    }

    let usuario;

    try {
        usuario = JSON.parse(usuarioSalvo);
    } catch {
        alert("Os dados da sessão são inválidos. Faça login novamente.");
        return;
    }

    if (!usuario?.idUsuario) {
        alert("Não foi possível identificar o usuário logado.");
        return;
    }

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/${demandaId}?idUsuario=${usuario.idUsuario}`,
            { method: "DELETE" }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            alert(resultado.mensagem || "Não foi possível excluir a demanda.");
            return;
        }

        alert("Demanda excluída com sucesso!");
        window.location.href = "../../lista-demanda/tela.html";
    } catch (erro) {
        console.error("Erro ao excluir demanda:", erro);
        alert("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
    }
}

// Executa assim que a página é aberta e prepara todos os elementos do formulário.
async function iniciar() {
    const form = document.querySelector("form");
    if (!form)
        return;

    const abertura = obter("abertura");
    if (!abertura.value)
        abertura.value = hoje();
        
    iniciarContador();
    iniciarDropzone();

    // Carrega primeiro a lista de responsáveis e projetos.
    // Isso é necessário para que as opções já estejam disponíveis
    // quando os dados de uma demanda forem preenchidos na edição.
    await carregarResponsaveis();
    await carregarProjetos();

    // Se estiver editando uma demanda, atualiza o título da página,
    // exibe o botão de excluir e carrega as informações já cadastradas.
    if (demandaId) {
        const tituloPagina = document.querySelector("h1");
        if (tituloPagina) tituloPagina.textContent = "Editar Demanda";
        
        const botaoExcluir = obter("btn-excluir");
        botaoExcluir.style.display = "";
        botaoExcluir.addEventListener("click", excluirDemanda);

        await carregarDadosDemanda(demandaId);
    }

    const campos = [
        "titulo", "descricao", "categoria", "projeto",
        "solicitante", "abertura", "prazo", "anexo",
    ];
    // Verifica os campos sempre que o usuário sair deles ou alterar alguma informação.
    campos.forEach((campo) => {
        const el = obter(campo);
        el.addEventListener("blur", () => validarCampo(campo));
        el.addEventListener("change", () => validarCampo(campo));
    });

    // Antes de enviar o formulário, verifica se todos os campos estão preenchidos corretamente.
    // Se encontrar algum erro, direciona o usuário para o primeiro campo com problema
    // e impede o envio das informações ao servidor.
    form.addEventListener("submit", async (evento) => {
        evento.preventDefault(); 
        const dados = coletarDados();
        const erros = validarDemanda(dados);
        
        campos.forEach((campo) => mostrarErro(campo, erros[campo]));
        
        const primeiroInvalido = campos.find((campo) => erros[campo]);
        if (primeiroInvalido) {
            obter(primeiroInvalido).focus();
            return;
        }
        await salvarDemanda(dados);
    });
}

// Busca os responsáveis disponíveis no servidor e preenche a lista de opções do formulário.
// O valor de cada opção é o idUsuario, pois é essa informação que o backend espera receber.
async function carregarResponsaveis() {
    const select = obter("responsavel");

    try {
        const resposta = await fetch(
            API_BASE_URL.replace("/demandas", "/responsaveis")
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível consultar os responsáveis.");
        }

        const resultado = await resposta.json();

        resultado.responsaveis.forEach((responsavel) => {
            const opcao = document.createElement("option");

            opcao.value = responsavel.idUsuario;
            opcao.textContent = responsavel.nome;

            select.appendChild(opcao);
        });

    } catch (erro) {
        console.error("Erro ao carregar responsáveis:", erro);
        alert("Não foi possível carregar a lista de responsáveis.");
    }
}

// Busca os projetos disponíveis e preenche o campo de seleção.
// Nesse caso, o valor utilizado é o nome do projeto, e não seu ID.
// Se o backend passar a utilizar o ID futuramente, será necessário ajustar essa função
// e também a função preencherFormulario.
async function carregarProjetos() {
    const select = obter("projeto");

    try {
        const resposta = await fetch(
            API_BASE_URL.replace("/demandas", "/projetos")
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível consultar os projetos.");
        }

        const resultado = await resposta.json();

        select.innerHTML = '<option value="">Selecione</option>';

        resultado.projetos.forEach((projeto) => {
            const opcao = document.createElement("option");

            opcao.value = projeto.nome;  
            opcao.textContent = projeto.nome;

            select.appendChild(opcao);
        });

    } catch (erro) {
        console.error("Erro ao carregar projetos:", erro);

        select.innerHTML = '<option value="">Erro ao carregar projetos</option>';

        alert("Não foi possível carregar a lista de projetos.");
    }
}

document.addEventListener("DOMContentLoaded", iniciar);