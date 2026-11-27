const botaoSenha = document.querySelector(".botao-senha");
const formularioSenha = document.querySelector(".form-alterar-senha");
const senhaAtual = document.getElementById("senhaAtual");
const novaSenha = document.getElementById("novaSenha");
const confirmarSenha = document.getElementById("confirmarSenha");
const mensagemSenhaAtual = document.getElementById("mensagemSenhaAtual");
const mensagemNovaSenha = document.getElementById("mensagemNovaSenha");
const mensagemConfirmarSenha = document.getElementById("mensagemConfirmarSenha");
const mensagemFormulario = document.getElementById("mensagemFormulario");
const linkUsuarios = document.getElementById("linkUsuarios");
const avisoUsuarios = document.getElementById("avisoUsuarios");

const apiUrl = window.location.port === "3030"
    ? "http://localhost:3333"
    : "http://localhost:3000";

let idPerfilLogado = null;

// Abre e fecha o formulário de troca de senha.
botaoSenha.addEventListener("click", function() {

    if (formularioSenha.style.display === "none") {
        formularioSenha.style.display = "block";
    } else {
        formularioSenha.style.display = "none";
    }

});

// Apaga os erros do formulário.
function limparMensagens() {
    [senhaAtual, novaSenha, confirmarSenha].forEach((campo) => {
        campo.classList.remove("campo-invalido");
    });

    [mensagemSenhaAtual, mensagemNovaSenha, mensagemConfirmarSenha].forEach((mensagem) => {
        mensagem.textContent = "";
    });
    mensagemFormulario.textContent = "";
    mensagemFormulario.className = "mensagem-formulario";
}

// Mostra o erro no campo indicado.
function mostrarErro(campo, mensagem) {
    campo.classList.add("campo-invalido");
    document.getElementById(`mensagem${campo.id[0].toUpperCase()}${campo.id.slice(1)}`).textContent = mensagem;
}

// Mensagem geral do formulário, de sucesso ou erro.
function avisarFormulario(mensagem, tipo) {
    mensagemFormulario.textContent = mensagem;
    mensagemFormulario.className = `mensagem-formulario ${tipo}`;
}

// PATCH /api/usuarios/:id/senha: troca a senha do usuário logado.
formularioSenha.addEventListener("submit", async function(event) {
    event.preventDefault();
    limparMensagens();

    const sessao = sessionStorage.getItem("usuario");

    if (!sessao) {
        avisarFormulario("Sua sessão não foi encontrada. Faça login novamente.", "erro");
        window.location.href = "../Login/indexLogin.html";
        return;
    }

    let usuarioLogado;

    try {
        usuarioLogado = JSON.parse(sessao);
    } catch (erro) {
        console.error("Os dados da sessão são inválidos:", erro);
        avisarFormulario("Sua sessão é inválida. Faça login novamente.", "erro");
        return;
    }

    if (novaSenha.value !== confirmarSenha.value) {
        mostrarErro(confirmarSenha, "A nova senha e a confirmação precisam ser iguais.");
        return;
    }

    try {
        const resposta = await fetch(`${apiUrl}/api/usuarios/${usuarioLogado.idUsuario}/senha`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                senhaAtual: senhaAtual.value,
                novaSenha: novaSenha.value,
                confirmarSenha: confirmarSenha.value
            })
        });
        const resultado = await resposta.json();

        if (!resposta.ok) {
            if (resposta.status === 401) {
                mostrarErro(senhaAtual, resultado.mensagem);
            } else if (resultado.mensagem?.includes("senha")) {
                mostrarErro(novaSenha, resultado.mensagem);
            } else {
                avisarFormulario(resultado.mensagem || "Não foi possível alterar a senha.", "erro");
            }
            return;
        }

        formularioSenha.reset();
        avisarFormulario("Senha alterada com sucesso.", "sucesso");
    } catch (erro) {
        console.error("Não foi possível alterar a senha:", erro);
        avisarFormulario("Não foi possível conectar ao servidor.", "erro");
    }
});

// Só o administrador pode abrir a lista de usuários.
linkUsuarios.addEventListener("click", function(evento) {
    if (idPerfilLogado === 1) {
        avisoUsuarios.textContent = "";
    } else {
        evento.preventDefault();
        avisoUsuarios.textContent = "Apenas o Administrador pode acessar a lista de usuários.";
    }
});

// GET /api/usuarios/:id: preenche os dados do perfil.
async function carregarPerfil() {
    const sessao = sessionStorage.getItem("usuario");

    if (!sessao) {
        window.location.href = "../Login/indexLogin.html";
        return;
    }

    try {
        const usuarioLogado = JSON.parse(sessao);
        const resposta = await fetch(`${apiUrl}/api/usuarios/${usuarioLogado.idUsuario}`);
        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.mensagem || "Não foi possível carregar o perfil.");
        }

        const usuario = resultado.usuario;
        document.querySelector("#nome span").textContent = usuario.nome;
        document.querySelector("#email span").textContent = usuario.email;
        document.querySelector("#usuario span").textContent = usuario.usuario;
        document.querySelector("#cargo span").textContent = usuario.perfil;
        idPerfilLogado = Number(usuario.idPerfil);
    } catch (erro) {
        console.error("Não foi possível carregar o perfil:", erro);
    }
}

carregarPerfil();