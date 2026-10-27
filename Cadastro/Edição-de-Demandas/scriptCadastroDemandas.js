"use strict";
const REGRAS = {
    titulo: { min: 5, max: 80 },
    descricao: { min: 10, max: 1000 },
    solicitante: { min: 3, max: 100 },
    anexoMaxMb: 5,
    anexoExtensoes: ["png", "jpg", "jpeg", "pdf", "doc", "docx", "xls", "xlsx", "csv"],
};

// Obtém o ID da demanda a partir dos parâmetros de busca da URL (ex: ?id=2)
const urlParams = new URLSearchParams(window.location.search);
const demandaId = urlParams.get("id");

function obter(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Elemento #${id} não encontrado no HTML`);
    return el;
}

function hoje() {
    return new Date().toLocaleDateString("sv-SE");
}

function coletarDados() {
    const valor = (id) => obter(id).value.trim();
    const prioridadeMarcada = document.querySelector('input[name="prioridade"]:checked');
    return {
        titulo: valor("titulo"),
        descricao: valor("descricao"),
        categoria: valor("categoria"),
        projeto: valor("projeto"),
        prioridade: (prioridadeMarcada?.value ?? "baixa"),
        responsavel: valor("responsavel"),
        solicitante: valor("solicitante"),
        abertura: valor("abertura") || hoje(),
        prazo: valor("prazo"),
        anexo: obter("anexo").files?.[0] ?? null,
    };
}

function preencherFormulario(demanda) {
    obter("titulo").value = demanda.titulo || "";
    obter("descricao").value = demanda.descricao || "";
    obter("categoria").value = demanda.tipo || "";
    obter("projeto").value = demanda.projeto || "";
    obter("responsavel").value = demanda.responsavel || "";
    obter("solicitante").value = demanda.solicitante || "";
    obter("abertura").value = demanda.abertura || demanda.dataCriacao || hoje();
    obter("prazo").value = demanda.prazo || "";

    // Seleciona a opção de rádio correspondente à prioridade
    if (demanda.prioridade) {
        const radio = document.querySelector(`input[name="prioridade"][value="${demanda.prioridade}"]`);
        if (radio) radio.checked = true;
    }

    // Atualiza o contador de caracteres da descrição após preencher
    const textarea = obter("descricao");
    const contador = document.querySelector(".char-count");
    if (contador && textarea) {
        contador.textContent = `${textarea.value.length} / ${textarea.maxLength}`;
    }
}

function validarDemanda(d) {
    const erros = {};

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
    else if (d.prazo < d.abertura) {
        erros.prazo = "O prazo não pode ser anterior à data de abertura.";
    }

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

function validarCampo(campo) {
    const erros = validarDemanda(coletarDados());
    mostrarErro(campo, erros[campo]);
}

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
    zona.addEventListener("drop", (e) => {
        e.preventDefault();
        zona.classList.remove("dragover");
        if (e.dataTransfer?.files.length) {
            inputArquivo.files = e.dataTransfer.files;
            validarCampo("anexo");
        }
    });
}

const API_BASE_URL =
    window.location.port === "3030"
        ? "http://localhost:3333/api/demandas"
        : "http://localhost:3000/api/demandas";

// Busca os dados da demanda quando estiver no modo de edição
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

async function salvarDemanda(dados) {
    const { anexo, ...resto } = dados;
    const corpo = {
        ...resto,
        anexo: anexo ? { nome: anexo.name, tamanho: anexo.size } : null,
    };

    // Configura dinamicamente a rota e o método (POST para cadastro, PUT para edição)
    const url = demandaId ? `${API_BASE_URL}/${demandaId}` : API_BASE_URL;
    const metodo = demandaId ? "PUT" : "POST";

    try {
        const resposta = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo),
        });
        const resultado = await resposta.json();

        if (!resposta.ok) {
            const errosServidor = (resultado.erros ?? {});
            Object.keys(errosServidor).forEach((campo) => mostrarErro(campo, errosServidor[campo]));
            return;
        }

        const mensagemSucesso = demandaId 
            ? "Demanda atualizada com sucesso!" 
            : "Demanda cadastrada com sucesso!";
            
        alert(mensagemSucesso);
        window.location.href = "../../lista-demanda/tela.html";
    }
    catch {
        alert("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
    }
}

async function iniciar() {
    const form = document.querySelector("form");
    if (!form)
        return;

    const abertura = obter("abertura");
    if (!abertura.value)
        abertura.value = hoje();
        
    iniciarContador();
    iniciarDropzone();

    // Se houver um ID na URL, altera o título da tela e carrega os dados
    if (demandaId) {
        const tituloPagina = document.querySelector("h1");
        if (tituloPagina) tituloPagina.textContent = "Editar Demanda";
        
        await carregarDadosDemanda(demandaId);
    }

    const campos = [
        "titulo", "descricao", "categoria", "projeto",
        "solicitante", "abertura", "prazo", "anexo",
    ];
    campos.forEach((campo) => {
        const el = obter(campo);
        el.addEventListener("blur", () => validarCampo(campo));
        el.addEventListener("change", () => validarCampo(campo));
    });

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

document.addEventListener("DOMContentLoaded", iniciar);