const email = document.getElementById("email");

const senha = document.getElementById("senha");

const form = document.getElementById("formLogin");

function mostrarErro(campo, mensagem) {
    campo.classList.add("campo-erro");

    const mensagemAtual = campo.parentElement.querySelector(".mensagem-erro");
    if (mensagemAtual) {
        mensagemAtual.textContent = mensagem;
        return;
    }

    const mensagemErro = document.createElement("span");
    mensagemErro.className = "mensagem-erro";
    mensagemErro.textContent = mensagem;

    campo.parentElement.appendChild(mensagemErro);
}

function removerErro(campo) {
    campo.classList.remove("campo-erro");

    const mensagemErro = campo.parentElement.querySelector(".mensagem-erro");

    if (mensagemErro) {
        mensagemErro.remove();
    }
}

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    removerErro(email);
    removerErro(senha);

    try {
        const apiUrl =
            window.location.port === "3030"
                ? "http://localhost:3333/api/login"
                : "http://localhost:3000/api/login";
        const resposta = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email.value,
                senha: senha.value,
            }),
        });
        const resultado = await resposta.json();

        if (!resposta.ok) {
            if (resultado.erros?.email) {
                mostrarErro(email, resultado.erros.email);
            }

            if (resultado.erros?.senha) {
                mostrarErro(senha, resultado.erros.senha);
            }

            if (resultado.mensagem === "Este email não está cadastrado no sistema.") {
                mostrarErro(email, resultado.mensagem);
            } else if (resultado.mensagem === "Senha incorreta.") {
                mostrarErro(senha, resultado.mensagem);
            }

            return;
        }

        sessionStorage.setItem("usuario", JSON.stringify(resultado.usuario));
        window.location.href = "../Dashboard/indexDashboard.html";
    } catch (error) {
        console.error("Não foi possível validar o login:", error);
        mostrarErro(email, "Não foi possível conectar ao servidor.");
    }
});