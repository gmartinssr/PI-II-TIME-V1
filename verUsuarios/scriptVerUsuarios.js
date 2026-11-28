const listaUsuarios = document.getElementById("listaUsuarios");
const campoBusca = document.getElementById("buscarUsuario");
const perfilLogado = document.getElementById("perfilLogado");
const listaHistorico = document.getElementById("listaHistorico");
const apiUrl = window.location.port === "3030"
    ? "http://localhost:3333"
    : "http://localhost:3000";

let usuarios = [];

// Classe CSS de acordo com o perfil.
function classeCargo(idPerfil) {
    if (idPerfil === 1) {
        return "administrador";
    }

    if (idPerfil === 2) {
        return "gestor";
    }

    return "usuario";
}

// Monta a tabela, aplicando o texto da busca.
function renderizarUsuarios() {
    const termo = campoBusca.value.trim().toLowerCase();
    listaUsuarios.replaceChildren();

    usuarios
        .filter((usuario) => {
            const dados = `${usuario.nome} ${usuario.usuario} ${usuario.email} ${usuario.perfil}`;
            return dados.toLowerCase().includes(termo);
        })
        .forEach((usuario) => {
            const linha = document.createElement("tr");
            const nome = document.createElement("td");
            const login = document.createElement("td");
            const email = document.createElement("td");
            const cargo = document.createElement("td");
            const etiqueta = document.createElement("span");

            nome.textContent = usuario.nome;
            login.textContent = usuario.usuario;
            email.textContent = usuario.email;
            etiqueta.className = `cargo ${classeCargo(Number(usuario.idPerfil))}`;
            etiqueta.textContent = usuario.perfil;
            cargo.appendChild(etiqueta);
            linha.append(nome, login, email, cargo);
            listaUsuarios.appendChild(linha);
        });
}

// GET /api/usuarios: carrega todos os usuários.
async function carregarUsuarios() {
    const sessao = sessionStorage.getItem("usuario");

    if (!sessao) {
        window.location.href = "../Login/indexLogin.html";
        return;
    }

    try {
        const usuarioLogado = JSON.parse(sessao);
        perfilLogado.textContent = usuarioLogado.perfil || "";

        const resposta = await fetch(`${apiUrl}/api/usuarios`);
        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.mensagem || "Não foi possível carregar os usuários.");
        }

        usuarios = resultado.usuarios;
        renderizarUsuarios();
    } catch (erro) {
        console.error("Não foi possível carregar os usuários:", erro);
        listaUsuarios.innerHTML = "<tr><td colspan=\"4\">Não foi possível carregar os usuários.</td></tr>";
    }
}

// Monta a tabela do histórico de alterações.
function renderizarHistorico(historico) {
    listaHistorico.replaceChildren();

    if (!historico || historico.length === 0) {
        listaHistorico.innerHTML = "<tr><td colspan=\"4\">Nenhuma alteração registrada até o momento.</td></tr>";
        return;
    }

    historico.forEach((item) => {
        const linha = document.createElement("tr");
        const data = document.createElement("td");
        const quem = document.createElement("td");
        const demanda = document.createElement("td");
        const mudanca = document.createElement("td");

        data.textContent = new Date(item.dataHora).toLocaleString("pt-BR");
        quem.textContent = item.usuario;
        demanda.textContent = `DEM-${String(item.idDemanda).padStart(4, "0")} - ${item.tituloDemanda}`;
        mudanca.textContent = item.descricao;

        linha.append(data, quem, demanda, mudanca);
        listaHistorico.appendChild(linha);
    });
}

// GET /api/historico: carrega as alterações (só o admin).
async function carregarHistorico() {
    const sessao = sessionStorage.getItem("usuario");
    if (!sessao) return;

    try {
        const usuarioLogado = JSON.parse(sessao);

        const resposta = await fetch(
            `${apiUrl}/api/historico?idSolicitante=${usuarioLogado.idUsuario}`
        );
        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.mensagem || "Não foi possível carregar o histórico.");
        }

        renderizarHistorico(resultado.historico);
    } catch (erro) {
        console.error("Não foi possível carregar o histórico:", erro);
        listaHistorico.innerHTML = "<tr><td colspan=\"4\">Não foi possível carregar o histórico.</td></tr>";
    }
}

campoBusca.addEventListener("input", renderizarUsuarios);
carregarUsuarios();
carregarHistorico();
