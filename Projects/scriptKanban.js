

const API_URL = "http://localhost:3333/api/demandas";


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

// Usado só se o servidor estiver desligado, para você ver o quadro funcionando.
const DEMANDAS_EXEMPLO = [
  { id: 1, titulo: "Corrigir erro de Login", status: "aberta", prioridade: "critica", tipo: "defeito", prazo: "2026-10-10", projeto: "Sistema de Gestão", responsavel: "joaoSM" },
  { id: 2, titulo: "Criar Dashboard", status: "andamento", prioridade: "alta", tipo: "tarefa", prazo: "2026-10-08", projeto: "Construção de Site", responsavel: "vitorZGB" },
  { id: 3, titulo: "Documentar API", status: "aberta", prioridade: "media", tipo: "documentação", prazo: "2026-10-09", projeto: "Manutenção de Sistema", responsavel: "guilhermeBM" },
  { id: 4, titulo: "Ajustar formulário", status: "revisao", prioridade: "alta", tipo: "melhoria", prazo: "2026-10-11", projeto: "Criação de Aplicativo", responsavel: "mariaOS" },
  { id: 5, titulo: "Falha no servidor", status: "aberta", prioridade: "critica", tipo: "defeito", prazo: "2026-10-07", projeto: "Portal Web", responsavel: "lucasMF" },
];

// ---------- 2. ESTADO ----------
// A tela é sempre desenhada a partir dessas variáveis.
// Para mudar algo: altere o estado e chame render().

let demandas = [];
let modoExemplo = false;
let projetoSelecionado = "todos";
let idArrastado = null; // id do card que está sendo arrastado agora

const seletorProjeto = document.querySelector(".seletor-projeto");
const colunas = document.querySelectorAll(".kanban-coluna");

// ---------- 3. FUNÇÕES AUXILIARES ----------

function hoje() {
  return new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD
}

// "2026-10-10" -> "10/10/2026" (sem usar Date, para não ter erro de fuso horário)
function formatarData(data) {
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

// Cria um elemento já com classe e texto. Usamos textContent (e nunca innerHTML)
// para que um título como "<script>..." não seja interpretado como código.
function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// ---------- 4. COMUNICAÇÃO COM O BACKEND ----------

async function carregarDemandas() {
  try {
    const resposta = await fetch(API_URL);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    demandas = dados.demandas;
  } catch (erro) {
    console.warn("Não foi possível carregar do servidor:", erro);
    modoExemplo = true;
    demandas = structuredClone(DEMANDAS_EXEMPLO);
    mostrarAviso("Servidor indisponível: mostrando dados de exemplo. Mudanças não serão salvas.", true);
  }
}

async function salvarStatus(id, status) {
  const resposta = await fetch(`${API_URL}/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
}

// ---------- 5. CRIAR O CARD ----------

function criarCard(demanda) {
  const card = criar("article", "kanban-card");
  card.dataset.id = demanda.id;
  card.dataset.prioridade = demanda.prioridade;
  card.draggable = true;
  if (demanda.descricao) card.title = demanda.descricao; // aparece ao passar o mouse

  card.appendChild(criar("h3", "card-titulo", demanda.titulo));

  const etiquetas = criar("div", "card-etiquetas");
  etiquetas.appendChild(
    criar("span", "etiqueta prioridade", NOMES_PRIORIDADE[demanda.prioridade] ?? demanda.prioridade)
  );
  etiquetas.appendChild(criar("span", "etiqueta", primeiraMaiuscula(demanda.tipo)));
  card.appendChild(etiquetas);

  card.appendChild(criar("p", "card-projeto", demanda.projeto));

  // Rodapé: avatar + responsável + prazo + botões de mover
  const rodape = criar("div", "card-rodape");

  const semResponsavel = !demanda.responsavel || demanda.responsavel === "Não atribuído";
  rodape.appendChild(criar("span", "card-avatar", semResponsavel ? "?" : demanda.responsavel.charAt(0).toUpperCase()));
  rodape.appendChild(criar("span", "card-responsavel", semResponsavel ? "Não atribuído" : demanda.responsavel));

  const atrasado = demanda.prazo < hoje() && demanda.status !== "concluida";
  rodape.appendChild(
    criar("span", atrasado ? "card-prazo atrasado" : "card-prazo", formatarData(demanda.prazo))
  );

  const posicao = COLUNAS.indexOf(demanda.status);
  const botoes = criar("div", "card-mover");
  botoes.appendChild(criarBotaoMover(demanda, posicao - 1, "‹"));
  botoes.appendChild(criarBotaoMover(demanda, posicao + 1, "›"));
  rodape.appendChild(botoes);

  card.appendChild(rodape);

  // Eventos de arrastar
  card.addEventListener("dragstart", (evento) => {
    idArrastado = demanda.id;
    evento.dataTransfer.effectAllowed = "move";
    evento.dataTransfer.setData("text/plain", String(demanda.id)); // exigido pelo Firefox
    // adiado para a "sombra" do arrasto sair com a aparência normal
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
    botao.style.visibility = "hidden"; // não existe coluna nesse lado
    return botao;
  }

  botao.setAttribute("aria-label", `Mover para ${NOMES_COLUNA[destino]}`);
  botao.title = `Mover para ${NOMES_COLUNA[destino]}`;
  botao.addEventListener("click", () => moverDemanda(demanda.id, destino));
  return botao;
}

// ---------- 6. DESENHAR O QUADRO ----------

function render() {
  colunas.forEach((coluna) => {
    const status = coluna.dataset.status;
    const area = coluna.querySelector(".kanban-cards");
    const contador = coluna.querySelector(".kanban-coluna-topo span");

    const daColuna = demandas.filter(
      (d) =>
        d.status === status &&
        (projetoSelecionado === "todos" || d.projeto === projetoSelecionado)
    );

    area.replaceChildren(...daColuna.map(criarCard)); // sem argumentos = esvazia (ativa o "Nenhuma demanda")
    contador.textContent = daColuna.length;
  });
}

function preencherProjetos() {
  const projetos = [...new Set(demandas.map((d) => d.projeto))].sort((a, b) => a.localeCompare(b));

  seletorProjeto.replaceChildren(
    new Option("Todos os projetos", "todos"),
    ...projetos.map((projeto) => new Option(projeto, projeto))
  );
  seletorProjeto.value = projetoSelecionado;
}

// ---------- 7. MOVER UM CARD ----------
// idAntes = id do card que ficará logo abaixo dele (null = vai para o fim da coluna)

async function moverDemanda(id, novoStatus, idAntes = null) {
  const demanda = demandas.find((d) => d.id === id);
  if (!demanda) return;

  const mudouDeColuna = demanda.status !== novoStatus;
  const backup = { lista: [...demandas], status: demanda.status }; // para desfazer se falhar

  // Tira da posição antiga e coloca na nova
  demandas = demandas.filter((d) => d.id !== id);
  demanda.status = novoStatus;

  const indice = idAntes === null ? -1 : demandas.findIndex((d) => d.id === idAntes);
  if (indice === -1) {
    demandas.push(demanda);
  } else {
    demandas.splice(indice, 0, demanda);
  }

  render(); // a tela muda na hora (não espera o servidor)

  if (!mudouDeColuna || modoExemplo) return;

  try {
    await salvarStatus(id, novoStatus);
  } catch (erro) {
    console.error("Erro ao salvar o status:", erro);
    demandas = backup.lista;
    demanda.status = backup.status;
    render();
    mostrarAviso("Não foi possível salvar a mudança. O card voltou para a coluna anterior.", true);
  }
}

// ---------- 8. ARRASTAR E SOLTAR ----------

// Descobre sobre qual card o mouse está, para inserir o card arrastado antes dele.
function cardSeguinte(area, mouseY) {
  const cards = [...area.querySelectorAll(".kanban-card:not(.arrastando)")];

  return (
    cards.find((card) => {
      const caixa = card.getBoundingClientRect();
      return mouseY < caixa.top + caixa.height / 2; // mouse acima do meio do card
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

    // Mouse passando por cima com um card: avisa o navegador que aqui pode soltar
    coluna.addEventListener("dragover", (evento) => {
      if (idArrastado === null) return;
      evento.preventDefault(); // sem isso o navegador não permite o "drop"
      evento.dataTransfer.dropEffect = "move";
      coluna.classList.add("alvo");
    });

    // Saiu da coluna (ignora quando só passou de um elemento filho para outro)
    coluna.addEventListener("dragleave", (evento) => {
      if (!coluna.contains(evento.relatedTarget)) {
        coluna.classList.remove("alvo");
      }
    });

    // Soltou o card
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

// ---------- 9. INICIALIZAÇÃO ----------

async function iniciar() {
  await carregarDemandas();
  preencherProjetos();
  configurarColunas();
  render();

  seletorProjeto.addEventListener("change", () => {
    projetoSelecionado = seletorProjeto.value;
    render();
  });
}

iniciar();