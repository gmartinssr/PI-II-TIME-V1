"use strict";

// Define a URL base da API dinamicamente dependendo da porta usada no navegador
const API_BASE_URL =
    window.location.port === "3030"
        ? "http://localhost:3333/api/demandas"
        : "http://localhost:3000/api/demandas";

// Obtém o parâmetro 'id' da URL (ex: ?id=1)
const urlParams = new URLSearchParams(window.location.search);
const demandaId = urlParams.get("id");

/**
 * Converte datas do formato AAAA-MM-DD para DD/MM/AAAA
 */
function formatarData(dataString) {
    if (!dataString) return "-";
    const partes = dataString.split("T")[0].split("-");
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataString;
}

/**
 * Converte bytes em uma string legível em KB ou MB
 */
function formatarTamanho(bytes) {
    if (!bytes || isNaN(bytes)) return "";
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Retorna a classe CSS correspondente para cada status da demanda
 */
function obterClasseStatus(status) {
    const mapa = {
        aberta: "status-aberto",
        andamento: "status-andamento",
        revisao: "status-revisao",
        concluida: "status-concluida",
        cancelada: "status-cancelada"
    };
    return mapa[status?.toLowerCase()] || "status-aberto";
}

/**
 * Retorna o mapa de classes e rótulos legíveis para prioridades
 */
function obterInfoPrioridade(prioridade) {
    const p = prioridade?.toLowerCase();
    const mapa = {
        baixa: { classe: "priority-baixa", label: "Baixa" },
        media: { classe: "priority-media", label: "Média" },
        alta: { classe: "priority-alta", label: "Alta" },
        critica: { classe: "priority-critica", label: "Crítica" }
    };
    return mapa[p] || { classe: "priority-baixa", label: prioridade || "Baixa" };
}

/**
 * Atualiza os elementos da interface com os dados retornados do servidor
 */
function renderizarDemanda(demanda) {
    // 1. Identificador e Título principal
    const elRecordId = document.querySelector(".record-id");
    const elTitulo = document.querySelector(".title-bar-main h2");
    
    if (elRecordId) {
        elRecordId.textContent = `DEM-${String(demanda.id).padStart(4, "0")}`;
    }
    if (elTitulo) {
        elTitulo.textContent = demanda.titulo || "Sem título";
    }

    // 2. Link dinâmico do botão Editar
    const btnEditar = document.querySelector(".title-bar-actions .btn-primary");
    if (btnEditar) {
        btnEditar.href = `../Cadastro/Edição-de-Demandas/Cadastro e edição de demandas.html?id=${demanda.id}`;
    }

    // 3. Status badge no topo
    const statusHeader = document.querySelector(".title-bar-actions .status-badge");
    if (statusHeader) {
        const classeStatus = obterClasseStatus(demanda.status);
        statusHeader.className = `status-badge ${classeStatus}`;
        statusHeader.textContent = demanda.status ? demanda.status.toUpperCase() : "ABERTA";
    }

    // 4. Descrição detalhada
    const elDescricao = document.querySelector(".description-text");
    if (elDescricao) {
        elDescricao.textContent = demanda.descricao || "Nenhuma descrição informada.";
    }

    // 5. Lista de Anexos
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

    // 6. Painel Lateral (Sidebar)
    const infoRows = document.querySelectorAll(".detail-sidebar .info-row");
    if (infoRows.length >= 8) {
        // Status na Sidebar
        const statusBadgeSide = infoRows[0].querySelector(".status-badge");
        if (statusBadgeSide) {
            statusBadgeSide.className = `status-badge ${obterClasseStatus(demanda.status)}`;
            statusBadgeSide.textContent = demanda.status || "Aberta";
        }

        // Prioridade
        const priorityTag = infoRows[1].querySelector(".priority-tag");
        if (priorityTag) {
            const infoP = obterInfoPrioridade(demanda.prioridade);
            priorityTag.className = `priority-tag ${infoP.classe}`;
            priorityTag.innerHTML = `<span class="dot"></span>${infoP.label}`;
        }

        // Categoria / Tipo
        const elCategoria = infoRows[2].querySelector(".info-value");
        if (elCategoria) elCategoria.textContent = demanda.tipo || "-";

        // Projeto
        const elProjeto = infoRows[3].querySelector(".info-value");
        if (elProjeto) elProjeto.textContent = demanda.projeto || "-";

        // Responsável
        const elResponsavel = infoRows[4].querySelector(".info-value");
        if (elResponsavel) elResponsavel.textContent = demanda.responsavel || "Não atribuído";

        // Solicitante
        const elSolicitante = infoRows[5].querySelector(".info-value");
        if (elSolicitante) elSolicitante.textContent = demanda.solicitante || "-";

        // Data de Abertura
        const elAbertura = infoRows[6].querySelector(".info-value");
        if (elAbertura) elAbertura.textContent = formatarData(demanda.abertura || demanda.dataCriacao);

        // Prazo
        const elPrazo = infoRows[7].querySelector(".info-value");
        if (elPrazo) elPrazo.textContent = formatarData(demanda.prazo);
    }
}

/**
 * Busca a demanda no servidor através do ID da URL
 */
async function carregarDemanda() {
    if (!demandaId) {
        alert("ID da demanda não foi informado na URL.");
        window.location.href = "../lista-demanda/tela.html";
        return;
    }

    try {
        const resposta = await fetch(`${API_BASE_URL}/${demandaId}`);
        const resultado = await resposta.json();

        if (resposta.ok && resultado.valido) {
            renderizarDemanda(resultado.demanda);
        } else {
            alert(resultado.erro || "Não foi possível carregar as informações da demanda.");
        }
    } catch (erro) {
        console.error("Erro na requisição da demanda:", erro);
        alert("Erro ao conectar com o servidor. Verifique se o backend está executando.");
    }
}

/**
 * Renderiza a lista de comentários recebida do backend
 */
function renderizarComentarios(comentarios) {
    const container = document.getElementById("lista-comentarios");
    if (!container) return;

    if (!comentarios || comentarios.length === 0) {
        container.innerHTML = `<p style="font-size: 13px; color: var(--ink-soft); margin: 0 0 12px 0;">Nenhum comentário cadastrado até o momento.</p>`;
        return;
    }

    container.innerHTML = comentarios
        .map((c) => {
            const dataFormatada = c.data;

            return `
            <div class="attachment-item" style="flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; width: 100%; font-size: 12px; color: var(--ink-soft);">
                    <strong>${c.usuario}</strong>
                    <span>${dataFormatada}</span>
                </div>
                <p style="margin: 4px 0 0; font-size: 13px; color: var(--ink); white-space: pre-wrap;">${c.texto}</p>
            </div>
        `;
        })
        .join("");
}

/**
 * Busca os comentários associados à demanda atual
 */
async function carregarComentarios() {
    if (!demandaId) return;

    try {
        const resposta = await fetch(`${API_BASE_URL}/${demandaId}/comentarios`);
        const resultado = await resposta.json();

        if (resposta.ok) {
            renderizarComentarios(resultado.comentarios);
        }
    } catch (erro) {
        console.error("Erro ao carregar comentários:", erro);
    }
}

/**
 * Inicializa os ouvintes de evento do formulário para adicionar novos comentários
 */
function iniciarFormularioComentario() {
    const form = document.getElementById("form-comentario");
    const textarea = document.getElementById("texto-comentario");

    if (!form || !textarea) return;

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const texto = textarea.value.trim();
        if (!texto) return;

        // Recupera o usuário autenticado
        const usuario = JSON.parse(sessionStorage.getItem("usuario"));

        if (!usuario || !usuario.idUsuario) {
            alert("Não foi possível identificar o usuário logado.");
            return;
        }

        try {
            const resposta = await fetch(`${API_BASE_URL}/${demandaId}/comentarios`, {
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

// Executado assim que o DOM estiver completamente carregado
document.addEventListener("DOMContentLoaded", () => {
    carregarDemanda();
    carregarComentarios();
    iniciarFormularioComentario();
});