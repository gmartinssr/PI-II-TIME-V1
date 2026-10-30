const API_URL =
    window.location.port === "3030"
        ? "http://localhost:3333/api"
        : "http://localhost:3000/api";

const PAGINA_LOGIN = "../Login/indexLogin.html";
const PAGINA_PROJETOS = "../ListagemProjetos/indexListagemProjetos.html";

const COLUNAS = ["aberta", "andamento", "revisao", "concluida"];

const NOMES_COLUNA = {
  aberta: "A Fazer",
  andamento: "Em Andamento",
  revisao: "Em Revisão",
  concluida: "Concluídas",
};

const NOMES_PRIORIDADE = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const idProjeto = Number(new URLSearchParams(window.location.search).get("id"));

let demandas = [];
let nomeProjeto = "";
let idArrastado = null;

const seletorProjeto = document.querySelector(".seletor-projeto");
const colunas = document.querySelectorAll(".kanban-coluna");

function obterUsuario() {
  try {
    const salvo = sessionStorage.getItem("usuario");
    const usuario = salvo ? JSON.parse(salvo) : null;
    return usuario && usuario.idUsuario ? usuario : null;
  } catch {
    return null;
  }
}

const usuarioLogado = obterUsuario();

function irParaLogin() {
  sessionStorage.removeItem("usuario");
  window.location.href = PAGINA_LOGIN;
}

function hoje() {
  return new Date().toLocaleDateString("sv-SE");
}

function formatarData(data) {
  if (!data) return "Sem prazo";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function primeiraMaiuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mostrarAviso(mensagem, erro = false) {
  const aviso = document.createElement("div");
  aviso.className = erro ? "kanban-aviso erro" : "kanban-aviso";
  aviso.setAttribute("role", "status");
  aviso.textContent = mensagem;
  document.body.appendChild(aviso);
  setTimeout(() => aviso.remove(), 5000);
}

function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

async function carregarKanban() {
  let resposta;

  try {
    resposta = await fetch(
      `${API_URL}/projetos/${idProjeto}/kanban?idUsuario=${encodeURIComponent(usuarioLogado.idUsuario)}`
    );
  } catch (erro) {
    console.error("Falha de rede:", erro);
    mostrarAviso("Não foi possível conectar ao servidor. Verifique se o backend está rodando.", true);
    return;
  }

  if (resposta.status === 401) {
    irParaLogin();
    return;
  }

  let resultado;

  try {
    resultado = await resposta.json();
  } catch (erro) {
    console.error("Resposta não é JSON. Status:", resposta.status, erro);
    mostrarAviso(
      `O servidor respondeu algo inesperado (HTTP ${resposta.status}). Reinicie o backend para carregar as rotas novas.`,
      true
    );
    return;
  }

  if (!resposta.ok || !resultado.valido) {
    mostrarAviso(resultado.mensagem || "Não foi possível carregar o projeto.", true);

    if (resposta.status === 403 || resposta.status === 404) {
      setTimeout(() => {
        window.location.href = PAGINA_PROJETOS;
      }, 2500);
    }
    return;
  }

  nomeProjeto = resultado.projeto.nome;
  demandas = resultado.demandas;
}

async function carregarSeletor() {
  try {
    const resposta = await fetch(
      `${API_URL}/projetos/listagem?idUsuario=${encodeURIComponent(usuarioLogado.idUsuario)}`
    );

    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const resultado = await resposta.json();

    seletorProjeto.replaceChildren(
      ...resultado.projetos.map((projeto) => new Option(projeto.nome, projeto.id))
    );
    seletorProjeto.value = String(idProjeto);
  } catch (erro) {
    console.error("Erro ao carregar projetos:", erro);
    seletorProjeto.replaceChildren(new Option(nomeProjeto || "Projeto", idProjeto));
  }
}

async function salvarStatus(id, status) {
  let resposta;

  try {
    resposta = await fetch(`${API_URL}/demandas/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, idUsuario: usuarioLogado.idUsuario }),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor.");
  }

  if (!resposta.ok) {
    const resultado = await resposta.json().catch(() => ({}));
    throw new Error(resultado.erro || "Não foi possível salvar a mudança.");
  }
}

function criarCard(demanda) {
  const card = criar("article", "kanban-card");
  card.dataset.id = demanda.id;
  card.dataset.prioridade = demanda.prioridade;
  card.draggable = true;
  if (demanda.descricao) card.title = demanda.descricao;

  card.appendChild(criar("h3", "card-titulo", demanda.titulo));

  const etiquetas = criar("div", "card-etiquetas");
  etiquetas.appendChild(
    criar("span", "etiqueta prioridade", NOMES_PRIORIDADE[demanda.prioridade] ?? demanda.prioridade)
  );
  etiquetas.appendChild(criar("span", "etiqueta", primeiraMaiuscula(demanda.tipo)));
  card.appendChild(etiquetas);

  card.appendChild(criar("p", "card-projeto", demanda.projeto));

  const rodape = criar("div", "card-rodape");

  const semResponsavel = !demanda.responsavel || demanda.responsavel === "Não atribuído";
  rodape.appendChild(criar("span", "card-avatar", semResponsavel ? "?" : demanda.responsavel.charAt(0).toUpperCase()));
  rodape.appendChild(criar("span", "card-responsavel", semResponsavel ? "Não atribuído" : demanda.responsavel));

  const atrasado = Boolean(demanda.prazo) && demanda.prazo < hoje() && demanda.status !== "concluida";
  rodape.appendChild(
    criar("span", atrasado ? "card-prazo atrasado" : "card-prazo", formatarData(demanda.prazo))
  );

  const posicao = COLUNAS.indexOf(demanda.status);
  const botoes = criar("div", "card-mover");
  botoes.appendChild(criarBotaoMover(demanda, posicao - 1, "‹"));
  botoes.appendChild(criarBotaoMover(demanda, posicao + 1, "›"));
  rodape.appendChild(botoes);

  card.appendChild(rodape);

  card.addEventListener("dragstart", (evento) => {
    idArrastado = demanda.id;
    evento.dataTransfer.effectAllowed = "move";
    evento.dataTransfer.setData("text/plain", String(demanda.id));

    setTimeout(() => card.classList.add("arrastando"), 0);
  });

  card.addEventListener("dragend", finalizarArrasto);

  return card;
}

function criarBotaoMover(demanda, novaPosicao, simbolo) {
  const botao = criar("button", "", simbolo);
  botao.type = "button";

  const destino = COLUNAS[novaPosicao];
  if (!destino) {
    botao.style.visibility = "hidden";
    return botao;
  }

  botao.setAttribute("aria-label", `Mover para ${NOMES_COLUNA[destino]}`);
  botao.title = `Mover para ${NOMES_COLUNA[destino]}`;
  botao.addEventListener("click", () => moverDemanda(demanda.id, destino));
  return botao;
}

function render() {
  colunas.forEach((coluna) => {
    const status = coluna.dataset.status;
    const area = coluna.querySelector(".kanban-cards");
    const contador = coluna.querySelector(".kanban-coluna-topo span");

    const daColuna = demandas.filter((d) => d.status === status);

    area.replaceChildren(...daColuna.map(criarCard));
    contador.textContent = daColuna.length;
  });
}

async function moverDemanda(id, novoStatus, idAntes = null) {
  const demanda = demandas.find((d) => d.id === id);
  if (!demanda) return;

  const mudouDeColuna = demanda.status !== novoStatus;
  const backup = { lista: [...demandas], status: demanda.status };

  demandas = demandas.filter((d) => d.id !== id);
  demanda.status = novoStatus;

  const indice = idAntes === null ? -1 : demandas.findIndex((d) => d.id === idAntes);
  if (indice === -1) {
    demandas.push(demanda);
  } else {
    demandas.splice(indice, 0, demanda);
  }

  render();

  if (!mudouDeColuna) return;

  try {
    await salvarStatus(id, novoStatus);
  } catch (erro) {
    console.error("Erro ao salvar o status:", erro);
    demandas = backup.lista;
    demanda.status = backup.status;
    render();
    mostrarAviso(`${erro.message} O card voltou para a coluna anterior.`, true);
  }
}

function cardSeguinte(area, mouseY) {
  const cards = [...area.querySelectorAll(".kanban-card:not(.arrastando)")];

  return (
    cards.find((card) => {
      const caixa = card.getBoundingClientRect();
      return mouseY < caixa.top + caixa.height / 2;
    }) ?? null
  );
}

function finalizarArrasto() {
  idArrastado = null;
  document.querySelectorAll(".arrastando").forEach((el) => el.classList.remove("arrastando"));
  colunas.forEach((coluna) => coluna.classList.remove("alvo"));
}

function configurarColunas() {
  colunas.forEach((coluna) => {
    const status = coluna.dataset.status;
    const area = coluna.querySelector(".kanban-cards");

    coluna.addEventListener("dragover", (evento) => {
      if (idArrastado === null) return;
      evento.preventDefault();
      evento.dataTransfer.dropEffect = "move";
      coluna.classList.add("alvo");
    });

    coluna.addEventListener("dragleave", (evento) => {
      if (!coluna.contains(evento.relatedTarget)) {
        coluna.classList.remove("alvo");
      }
    });

    coluna.addEventListener("drop", (evento) => {
      evento.preventDefault();
      if (idArrastado === null) return;

      const id = idArrastado;
      const seguinte = cardSeguinte(area, evento.clientY);
      const idAntes = seguinte ? Number(seguinte.dataset.id) : null;

      finalizarArrasto();
      moverDemanda(id, status, idAntes);
    });
  });
}

async function iniciar() {
  if (!usuarioLogado) {
    irParaLogin();
    return;
  }

  if (!Number.isInteger(idProjeto) || idProjeto <= 0) {
    window.location.href = PAGINA_PROJETOS;
    return;
  }

  configurarColunas();

  await carregarKanban();
  await carregarSeletor();
  render();

  seletorProjeto.addEventListener("change", () => {
    window.location.search = `?id=${encodeURIComponent(seletorProjeto.value)}`;
  });
}

iniciar();