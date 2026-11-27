"use strict";
// Limites da validação. O backend tem os mesmos: ao mudar aqui, mude lá.
const REGRAS = {
    titulo: { min: 5, max: 80 },
    descricao: { min: 10, max: 1000 },
    solicitante: { min: 3, max: 100 },
    anexoMaxMb: 5,
    anexoExtensoes: ["png", "jpg", "jpeg", "pdf", "doc", "docx", "xls", "xlsx", "csv"],
};

// Com ?id= na URL a tela abre em modo de edição.
const parametros = new URLSearchParams(window.location.search);
const demandaId = parametros.get("id");

// Busca um elemento pelo id e avisa se ele não existir no HTML.
function pegar(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Elemento #${id} não encontrado no HTML`);
    return el;
}

// Data de hoje no formato AAAA-MM-DD, usado pelo input de data.
function hoje() {
    return new Date().toLocaleDateString("sv-SE");
}

// Junta em um objeto o que foi preenchido.
function lerFormulario() {
    const valor = (id) => pegar(id).value.trim();
    const marcada = document.querySelector('input[name="prioridade"]:checked');
    return {
        titulo: valor("titulo"),
        descricao: valor("descricao"),
        categoria: valor("categoria"),
        projeto: valor("projeto"),
        prioridade: (marcada?.value ?? "baixa"),
        responsavel: valor("responsavel"),
        solicitante: valor("solicitante"),
        abertura: valor("abertura") || hoje(),
        prazo: valor("prazo"),
        anexo: pegar("anexo").files?.[0] ?? null,
    };
}

// Preenche o formulário com a demanda que está sendo editada.
function preencherFormulario(demanda) {
    pegar("titulo").value = demanda.titulo || "";
    pegar("descricao").value = demanda.descricao || "";
    pegar("categoria").value = demanda.tipo || "";
    pegar("projeto").value = demanda.projeto || "";
    pegar("responsavel").value = demanda.responsavel || "";
    pegar("solicitante").value = demanda.solicitante || "";
    pegar("abertura").value = demanda.abertura || demanda.dataCriacao || hoje();
    pegar("prazo").value = demanda.prazo || "";

    if (demanda.prioridade) {
        const radio = document.querySelector(`input[name="prioridade"][value="${demanda.prioridade}"]`);
        if (radio) radio.checked = true;
    }

    const textarea = pegar("descricao");
    const contador = document.querySelector(".char-count");
    if (contador && textarea) {
        contador.textContent = `${textarea.value.length} / ${textarea.maxLength}`;
    }
}

// Retorna os erros por campo. Objeto vazio significa que pode salvar.
function validarDemanda(demanda) {
    const erros = {};

    if (!demanda.titulo) {
        erros.titulo = "Informe o título da demanda.";
    }
    else if (demanda.titulo.length < REGRAS.titulo.min) {
        erros.titulo = `O título precisa ter pelo menos ${REGRAS.titulo.min} caracteres.`;
    }

    if (!demanda.descricao) {
        erros.descricao = "Descreva a demanda.";
    }
    else if (demanda.descricao.length < REGRAS.descricao.min) {
        erros.descricao = `A descrição precisa ter pelo menos ${REGRAS.descricao.min} caracteres.`;
    }

    if (!demanda.categoria)
        erros.categoria = "Selecione uma categoria.";
    if (!demanda.projeto)
        erros.projeto = "Selecione o projeto relacionado.";

    if (demanda.solicitante && demanda.solicitante.length < REGRAS.solicitante.min) {
        erros.solicitante = `O nome precisa ter pelo menos ${REGRAS.solicitante.min} caracteres.`;
    }

    if (demanda.abertura > hoje()) {
        erros.abertura = "A data de abertura não pode ser no futuro.";
    }
    if (!demanda.prazo) {
        erros.prazo = "Informe o prazo.";
    }
    else if (demanda.prazo < demanda.abertura) {
        erros.prazo = "O prazo não pode ser anterior à data de abertura.";
    }

    if (demanda.anexo) {
        const extensao = demanda.anexo.name.split(".").pop()?.toLowerCase() ?? "";
        const tamanhoMb = demanda.anexo.size / (1024 * 1024);
        if (!REGRAS.anexoExtensoes.includes(extensao)) {
            erros.anexo = `Tipo de arquivo não permitido (.${extensao}).`;
        }
        else if (tamanhoMb > REGRAS.anexoMaxMb) {
            erros.anexo = `O arquivo deve ter no máximo ${REGRAS.anexoMaxMb} MB.`;
        }
    }
    return erros;
}

// Mostra ou remove o erro abaixo de um campo.
function mostrarErro(campo, mensagem) {
    const input = document.getElementById(campo);
    const container = input?.closest(".field, .dropzone");
    if (!input || !container)
        return;
    container.querySelector(".error-message")?.remove();
    container.classList.toggle("has-error", Boolean(mensagem));
    input.setAttribute("aria-invalid", String(Boolean(mensagem)));
    if (mensagem) {
        const span = document.createElement("span");
        span.className = "error-message";
        span.setAttribute("role", "alert");
        span.textContent = mensagem; 
        container.appendChild(span);
    }
}

// Valida um campo específico.
function validarCampo(campo) {
    const erros = validarDemanda(lerFormulario());
    mostrarErro(campo, erros[campo]);
}

// Contador de caracteres da descrição.
function iniciarContador() {
    const textarea = pegar("descricao");
    const contador = document.querySelector(".char-count");
    if (!contador)
        return;
    const atualizar = () => {
        contador.textContent = `${textarea.value.length} / ${textarea.maxLength}`;
    };
    textarea.addEventListener("input", atualizar);
    atualizar();
}

// Permite anexar arrastando o arquivo.
function iniciarDropzone() {
    const zona = document.querySelector(".dropzone");
    const inputArquivo = pegar("anexo");
    if (!zona)
        return;
    zona.addEventListener("dragover", (e) => {
        e.preventDefault(); 
        zona.classList.add("dragover");
    });
    zona.addEventListener("dragleave", () => zona.classList.remove("dragover"));
    zona.addEventListener("drop", (e) => {
        e.preventDefault();
        zona.classList.remove("dragover");
        if (e.dataTransfer?.files.length) {
            inputArquivo.files = e.dataTransfer.files;
            validarCampo("anexo");
        }
    });
}

const API_DEMANDAS =
    window.location.port === "3030"
        ? "http://localhost:3333/api/demandas"
        : "http://localhost:3000/api/demandas";

// GET /api/demandas/:id: carrega a demanda para edição.
async function carregarDemanda(id) {
    try {
        const resposta = await fetch(`${API_DEMANDAS}/${id}`);
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

// POST /api/demandas cadastra; PUT /api/demandas/:id edita.
async function salvarDemanda(dados) {
    const sessao = sessionStorage.getItem("usuario");

    if (!sessao) {
        alert("Sua sessão não foi encontrada. Faça login novamente.");
        return;
    }

    let usuario;

    try {
        usuario = JSON.parse(sessao);
    } catch {
        alert("Os dados da sessão são inválidos. Faça login novamente.");
        return;
    }

    if (!usuario?.idUsuario) {
        alert("Não foi possível identificar o usuário logado.");
        return;
    }

    // O arquivo não é enviado, só o nome e o tamanho.
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
        ? `${API_DEMANDAS}/${demandaId}`
        : API_DEMANDAS;

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
            const errosApi = resultado.erros ?? {};

            Object.keys(errosApi).forEach((campo) => {
                mostrarErro(campo, errosApi[campo]);
            });

            if (Object.keys(errosApi).length === 0) {
                alert(
                    resultado.mensagem ||
                    resultado.erro ||
                    "Não foi possível salvar a demanda."
                );
            }

            return;
        }

        window.location.href = "../../lista-demanda/tela.html";
    } catch (erro) {
        console.error("Erro ao salvar demanda:", erro);

        alert(
            "Não foi possível conectar ao servidor. " +
            "Verifique se o backend está rodando."
        );
    }
}

// DELETE /api/demandas/:id: o backend confere a permissão.
async function excluirDemanda() {
    const confirmou = confirm(
        "Tem certeza que deseja excluir esta demanda? Essa ação não pode ser desfeita."
    );

    if (!confirmou) return;

    const sessao = sessionStorage.getItem("usuario");

    if (!sessao) {
        alert("Sua sessão não foi encontrada. Faça login novamente.");
        return;
    }

    let usuario;

    try {
        usuario = JSON.parse(sessao);
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
            `${API_DEMANDAS}/${demandaId}?idUsuario=${usuario.idUsuario}`,
            { method: "DELETE" }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            alert(resultado.mensagem || "Não foi possível excluir a demanda.");
            return;
        }

        window.location.href = "../../lista-demanda/tela.html";
    } catch (erro) {
        console.error("Erro ao excluir demanda:", erro);
        alert("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
    }
}

// Prepara o formulário quando a página abre.
async function iniciar() {
    const form = document.querySelector("form");
    if (!form)
        return;

    const abertura = pegar("abertura");
    if (!abertura.value)
        abertura.value = hoje();
        
    iniciarContador();
    iniciarDropzone();

    // As listas precisam estar prontas antes de preencher a edição.
    await carregarResponsaveis();
    await carregarProjetos();

    if (demandaId) {
        const tituloPagina = document.querySelector("h1");
        if (tituloPagina) tituloPagina.textContent = "Editar Demanda";
        
        const botaoExcluir = pegar("btn-excluir");
        botaoExcluir.style.display = "";
        botaoExcluir.addEventListener("click", excluirDemanda);

        await carregarDemanda(demandaId);
    }

    const campos = [
        "titulo", "descricao", "categoria", "projeto",
        "solicitante", "abertura", "prazo", "anexo",
    ];
    campos.forEach((campo) => {
        const el = pegar(campo);
        el.addEventListener("blur", () => validarCampo(campo));
        el.addEventListener("change", () => validarCampo(campo));
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault(); 
        const dados = lerFormulario();
        const erros = validarDemanda(dados);
        
        campos.forEach((campo) => mostrarErro(campo, erros[campo]));
        
        const invalido = campos.find((campo) => erros[campo]);
        if (invalido) {
            pegar(invalido).focus();
            return;
        }
        await salvarDemanda(dados);
    });
}

// GET /api/responsaveis: o valor de cada opção é o idUsuario.
async function carregarResponsaveis() {
    const select = pegar("responsavel");

    try {
        const resposta = await fetch(
            API_DEMANDAS.replace("/demandas", "/responsaveis")
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

// GET /api/projetos: o valor de cada opção é o nome do projeto.
async function carregarProjetos() {
    const select = pegar("projeto");

    try {
        const resposta = await fetch(
            API_DEMANDAS.replace("/demandas", "/projetos")
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