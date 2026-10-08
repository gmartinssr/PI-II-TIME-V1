"use strict";
const REGRAS = {
    titulo: { min: 5, max: 80 },
    descricao: { min: 10, max: 1000 },
    solicitante: { min: 3, max: 100 },
    anexoMaxMb: 5,
    anexoExtensoes: ["png", "jpg", "jpeg", "pdf", "doc", "docx", "xls", "xlsx", "csv"],
};


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
        abertura: valor("abertura") || hoje(), // se vazio, assume hoje
        prazo: valor("prazo"),
        anexo: obter("anexo").files?.[0] ?? null,
    };
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



const API_URL = "http://localhost:3333/api/demandas";
async function salvarDemanda(dados) {

    const { anexo, ...resto } = dados;
    const corpo = {
        ...resto,
        anexo: anexo ? { nome: anexo.name, tamanho: anexo.size } : null,
    };
    try {
        const resposta = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo),
        });
        const resultado = await resposta.json();

        if (!resposta.ok) {
            const errosServidor = (resultado.erros ?? {});
            Object.keys(errosServidor).forEach((campo) => mostrarErro(campo, errosServidor[campo]));
            return;
        }
        alert("Demanda cadastrada com sucesso!");
        window.location.href = "../../lista-demanda/tela.html";
    }
    catch {
        alert("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
    }
}

function iniciar() {
    const form = document.querySelector("form");
    if (!form)
        return;

    const abertura = obter("abertura");
    if (!abertura.value)
        abertura.value = hoje();
    iniciarContador();
    iniciarDropzone();

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