const listaUsuarios = document.getElementById("listaUsuarios");
const campoBusca = document.getElementById("buscarUsuario");
const perfilLogado = document.getElementById("perfilLogado");
const apiUrl = window.location.port === "3030"
    ? "http://localhost:3333"
    : "http://localhost:3000";

let usuarios = [];

function classeCargo(idPerfil) {
    if (idPerfil === 1) {
        return "administrador";
    }

    if (idPerfil === 2) {
        return "gestor";
    }

    return "usuario";
}

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
            const identificador = document.createElement("td");
            const email = document.createElement("td");
            const cargo = document.createElement("td");
            const cargoEtiqueta = document.createElement("span");

            nome.textContent = usuario.nome;
            identificador.textContent = usuario.usuario;
            email.textContent = usuario.email;
            cargoEtiqueta.className = `cargo ${classeCargo(Number(usuario.idPerfil))}`;
            cargoEtiqueta.textContent = usuario.perfil;
            cargo.appendChild(cargoEtiqueta);
            linha.append(nome, identificador, email, cargo);
            listaUsuarios.appendChild(linha);
        });
}

async function carregarUsuarios() {
    const usuarioSalvo = sessionStorage.getItem("usuario");

    if (!usuarioSalvo) {
        window.location.href = "../Login/indexLogin.html";
        return;
    }

    try {
        const usuarioLogado = JSON.parse(usuarioSalvo);
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

campoBusca.addEventListener("input", renderizarUsuarios);
carregarUsuarios();
