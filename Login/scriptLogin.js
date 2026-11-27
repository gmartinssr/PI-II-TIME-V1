// Abrir o login (inclusive pelo "Sair") encerra a sessão anterior.
sessionStorage.removeItem("usuario");

const email = document.getElementById("email");

const senha = document.getElementById("senha");

const form = document.getElementById("formLogin");

// Destaca o campo e mostra a mensagem abaixo dele.
function mostrarErro(campo, mensagem) {
    campo.classList.add("campo-erro");

    const avisoExistente = campo.parentElement.querySelector(".mensagem-erro");
    if (avisoExistente) {
        avisoExistente.textContent = mensagem;
        return;
    }

    const aviso = document.createElement("span");
    aviso.className = "mensagem-erro";
    aviso.textContent = mensagem;

    campo.parentElement.appendChild(aviso);
}

// Tira o destaque e a mensagem de erro do campo.
function removerErro(campo) {
    campo.classList.remove("campo-erro");

    const aviso = campo.parentElement.querySelector(".mensagem-erro");

    if (aviso) {
        aviso.remove();
    }
}

// Envia o login ao backend, que faz toda a validação.
form.addEventListener("submit", async function(event) {
    event.preventDefault();

    removerErro(email);
    removerErro(senha);

    try {
        const apiUrl =
            window.location.port === "3030"
                ? "http://localhost:3333/api/login"
                : "http://localhost:3000/api/login";
        // POST /api/login
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

            // A comparação usa o texto exato enviado pelo backend.
            if (resultado.mensagem === "Este email não está cadastrado no sistema.") {
                mostrarErro(email, resultado.mensagem);
            } else if (resultado.mensagem === "Senha incorreta.") {
                mostrarErro(senha, resultado.mensagem);
            }

            return;
        }

        // As outras telas leem o usuário logado daqui.
        sessionStorage.setItem("usuario", JSON.stringify(resultado.usuario));
        window.location.href = "../Dashboard/indexDashboard.html";
    } catch (error) {
        console.error("Não foi possível validar o login:", error);
        mostrarErro(email, "Não foi possível conectar ao servidor.");
    }
});