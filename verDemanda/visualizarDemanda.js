"use strict";

const API_DEMANDAS =
    window.location.port === "3030"
        ? "http://localhost:3333/api/demandas"
        : "http://localhost:3000/api/demandas";

const parametros = new URLSearchParams(window.location.search);
const demandaId = parametros.get("id");

// Converte a data para DD/MM/AAAA.
function formatarData(data) {
    if (!data) return "-";
    const partes = data.split("T")[0].split("-");
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return data;
}

// Tamanho do anexo em KB ou MB.
function formatarTamanho(bytes) {
    if (!bytes || isNaN(bytes)) return "";
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
}

// Classe CSS do selo de status.
function classeDoStatus(status) {
    const mapa = {
        aberta: "status-aberto",
        andamento: "status-andamento",
        revisao: "status-revisao",
        concluida: "status-concluida",
        cancelada: "status-cancelada"
    };
    return mapa[status?.toLowerCase()] || "status-aberto";
}

// Classe e nome exibido de cada prioridade.
function dadosPrioridade(prioridade) {
    const chave = prioridade?.toLowerCase();
    const mapa = {
        baixa: { classe: "priority-baixa", label: "Baixa" },
        media: { classe: "priority-media", label: "Média" },
        alta: { classe: "priority-alta", label: "Alta" },
        critica: { classe: "priority-critica", label: "Crítica" }
    };
    return mapa[chave] || { classe: "priority-baixa", label: prioridade || "Baixa" };
}

// Preenche a tela com os dados da demanda.
function mostrarDemanda(demanda) {
    const codigo = document.querySelector(".record-id");
    const titulo = document.querySelector(".title-bar-main h2");
    
    if (codigo) {
        codigo.textContent = `DEM-${String(demanda.id).padStart(4, "0")}`;
    }
    if (titulo) {
        titulo.textContent = demanda.titulo || "Sem título";
    }

    const botaoEditar = document.querySelector(".title-bar-actions .btn-primary");
    if (botaoEditar) {
        botaoEditar.href = `../Cadastro/Edição-de-Demandas/Cadastro e edição de demandas.html?id=${demanda.id}`;
    }

    const seloTopo = document.querySelector(".title-bar-actions .status-badge");
    if (seloTopo) {
        const classeStatus = classeDoStatus(demanda.status);
        seloTopo.className = `status-badge ${classeStatus}`;
        seloTopo.textContent = demanda.status ? demanda.status.toUpperCase() : "ABERTA";
    }

    const descricao = document.querySelector(".description-text");
    if (descricao) {
        descricao.textContent = demanda.descricao || "Nenhuma descrição informada.";
    }

    const listaAnexos = document.querySelector(".attachment-list");
    if (listaAnexos) {
        if (demanda.anexo && demanda.anexo.nome) {
            listaAnexos.innerHTML = `
                <li class="attachment-item">
                    <span class="attachment-icon">📎</span>
                    <span class="attachment-name">${demanda.anexo.nome}</span>
                    <span class="attachment-size">${formatarTamanho(demanda.anexo.tamanho)}</span>
                </li>
            `;
        } else {
            listaAnexos.innerHTML = `
                <li class="attachment-item">
                    <span class="attachment-name" style="color: var(--ink-soft);">Nenhum anexo disponível.</span>
                </li>
            `;
        }
    }

    const linhas = document.querySelectorAll(".detail-sidebar .info-row");
    if (linhas.length >= 8) {
        const seloLateral = linhas[0].querySelector(".status-badge");
        if (seloLateral) {
            seloLateral.className = `status-badge ${classeDoStatus(demanda.status)}`;
            seloLateral.textContent = demanda.status || "Aberta";
        }

        const etiqueta = linhas[1].querySelector(".priority-tag");
        if (etiqueta) {
            const info = dadosPrioridade(demanda.prioridade);
            etiqueta.className = `priority-tag ${info.classe}`;
            etiqueta.innerHTML = `<span class="dot"></span>${info.label}`;
        }

        const categoria = linhas[2].querySelector(".info-value");
        if (categoria) categoria.textContent = demanda.tipo || "-";

        const projeto = linhas[3].querySelector(".info-value");
        if (projeto) projeto.textContent = demanda.projeto || "-";

        const responsavel = linhas[4].querySelector(".info-value");
        if (responsavel) responsavel.textContent = demanda.responsavel || "Não atribuído";

        const solicitante = linhas[5].querySelector(".info-value");
        if (solicitante) solicitante.textContent = demanda.solicitante || "-";

        const abertura = linhas[6].querySelector(".info-value");
        if (abertura) abertura.textContent = formatarData(demanda.abertura || demanda.dataCriacao);

        const prazo = linhas[7].querySelector(".info-value");
        if (prazo) prazo.textContent = formatarData(demanda.prazo);
    }
}

// GET /api/demandas/:id
async function carregarDemanda() {
    if (!demandaId) {
        alert("ID da demanda não foi informado na URL.");
        window.location.href = "../lista-demanda/tela.html";
        return;
    }

    try {
        const resposta = await fetch(`${API_DEMANDAS}/${demandaId}`);
        const resultado = await resposta.json();

        if (resposta.ok && resultado.valido) {
            mostrarDemanda(resultado.demanda);
        } else {
            alert(resultado.erro || "Não foi possível carregar as informações da demanda.");
        }
    } catch (erro) {
        console.error("Erro na requisição da demanda:", erro);
        alert("Erro ao conectar com o servidor. Verifique se o backend está executando.");
    }
}

// Monta a lista de comentários.
function renderizarComentarios(comentarios) {
    const container = document.getElementById("lista-comentarios");
    if (!container) return;

    if (!comentarios || comentarios.length === 0) {
        container.innerHTML = `<p style="font-size: 13px; color: var(--ink-soft); margin: 0 0 12px 0;">Nenhum comentário cadastrado até o momento.</p>`;
        return;
    }

    container.innerHTML = comentarios
        .map((comentario) => {
            const dataFormatada = comentario.data;

            return `
            <div class="attachment-item" style="flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; width: 100%; font-size: 12px; color: var(--ink-soft);">
                    <strong>${comentario.usuario}</strong>
                    <span>${dataFormatada}</span>
                </div>
                <p style="margin: 4px 0 0; font-size: 13px; color: var(--ink); white-space: pre-wrap;">${comentario.texto}</p>
            </div>
        `;
        })
        .join("");
}

// GET /api/demandas/:id/comentarios
async function carregarComentarios() {
    if (!demandaId) return;

    try {
        const resposta = await fetch(`${API_DEMANDAS}/${demandaId}/comentarios`);
        const resultado = await resposta.json();

        if (resposta.ok) {
            renderizarComentarios(resultado.comentarios);
        }
    } catch (erro) {
        console.error("Erro ao carregar comentários:", erro);
    }
}

// POST /api/demandas/:id/comentarios: envia um novo comentário.
function ligarComentarios() {
    const form = document.getElementById("form-comentario");
    const textarea = document.getElementById("texto-comentario");

    if (!form || !textarea) return;

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const texto = textarea.value.trim();
        if (!texto) return;

        const usuario = JSON.parse(sessionStorage.getItem("usuario"));

        if (!usuario || !usuario.idUsuario) {
            alert("Não foi possível identificar o usuário logado.");
            return;
        }

        try {
            const resposta = await fetch(`${API_DEMANDAS}/${demandaId}/comentarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    texto: texto,
                    idUsuario: usuario.idUsuario
                })
            });

            const resultado = await resposta.json();

            if (resposta.ok && resultado.valido) {
                textarea.value = "";
                await carregarComentarios();
            } else {
                alert(resultado.mensagem || "Não foi possível adicionar o comentário.");
                console.error("Erro retornado pelo servidor:", resultado);
            }
        } catch (erro) {
            console.error("Erro ao enviar comentário:", erro);
            alert("Falha na conexão ao tentar salvar o comentário.");
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    carregarDemanda();
    carregarComentarios();
    ligarComentarios();
});