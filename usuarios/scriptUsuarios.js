const botaoSenha = document.querySelector(".botao-senha");
const formularioSenha = document.querySelector(".form-alterar-senha");
const senhaAtual = document.getElementById("senhaAtual");
const novaSenha = document.getElementById("novaSenha");
const confirmarSenha = document.getElementById("confirmarSenha");
const mensagemSenhaAtual = document.getElementById("mensagemSenhaAtual");
const mensagemNovaSenha = document.getElementById("mensagemNovaSenha");
const mensagemConfirmarSenha = document.getElementById("mensagemConfirmarSenha");
const mensagemFormulario = document.getElementById("mensagemFormulario");

const apiUrl = window.location.port === "3030"
    ? "http://localhost:3333"
    : "http://localhost:3000";

botaoSenha.addEventListener("click", function() {

    if (formularioSenha.style.display === "none") {
        formularioSenha.style.display = "block";
    } else {
        formularioSenha.style.display = "none";
    }

});

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

function mostrarErro(campo, mensagem) {
    campo.classList.add("campo-invalido");
    document.getElementById(`mensagem${campo.id[0].toUpperCase()}${campo.id.slice(1)}`).textContent = mensagem;
}

function mostrarMensagemFormulario(mensagem, tipo) {
    mensagemFormulario.textContent = mensagem;
    mensagemFormulario.className = `mensagem-formulario ${tipo}`;
}

formularioSenha.addEventListener("submit", async function(event) {
    event.preventDefault();
    limparMensagens();

    const usuarioSalvo = sessionStorage.getItem("usuario");

    if (!usuarioSalvo) {
        mostrarMensagemFormulario("Sua sessão não foi encontrada. Faça login novamente.", "erro");
        window.location.href = "../Login/indexLogin.html";
        return;
    }

    let usuarioLogado;

    try {
        usuarioLogado = JSON.parse(usuarioSalvo);
    } catch (erro) {
        console.error("Os dados da sessão são inválidos:", erro);
        mostrarMensagemFormulario("Sua sessão é inválida. Faça login novamente.", "erro");
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
                mostrarMensagemFormulario(resultado.mensagem || "Não foi possível alterar a senha.", "erro");
            }
            return;
        }

        formularioSenha.reset();
        mostrarMensagemFormulario("Senha alterada com sucesso.", "sucesso");
    } catch (erro) {
        console.error("Não foi possível alterar a senha:", erro);
        mostrarMensagemFormulario("Não foi possível conectar ao servidor.", "erro");
    }
});

async function carregarPerfil() {
    const usuarioSalvo = sessionStorage.getItem("usuario");

    if (!usuarioSalvo) {
        window.location.href = "../Login/indexLogin.html";
        return;
    }

    try {
        const usuarioLogado = JSON.parse(usuarioSalvo);
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
    } catch (erro) {
        console.error("Não foi possível carregar o perfil:", erro);
    }
}

carregarPerfil();