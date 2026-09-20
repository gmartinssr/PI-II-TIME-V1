console.log("JavaScript do Login conectado!");

// Pega o campo de email pelo ID
const email = document.getElementById("email");

// Pega o campo de senha pelo ID
const senha = document.getElementById("senha");

// Pega o formulário pelo ID
const form = document.getElementById("formLogin");

//Reutilizando as funções inicialmente criadas no JavaScript do cadastro de demandas
function mostrarErro(campo, mensagem) {
    campo.classList.add("campo-erro");

    if (campo.parentElement.querySelector(".mensagem-erro")) {
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

//Validações dos campos do login
form.addEventListener("submit", function(event) {

    event.preventDefault();

    let erro = false;

    // Verifica se o email está vazio
    if (email.value.trim() === "") {
        mostrarErro(email, "O email é obrigatório.");
        erro = true;
    } else {
        removerErro(email);
    }

    // Verifica se o formato do email é válido
    if (email.value.trim() !== "" && !email.value.includes("@")) {
        mostrarErro(email, "Digite um email válido.");
        erro = true;
    }

    // Verifica se a senha está vazia
    if (senha.value.trim() === "") {
        mostrarErro(senha, "A senha é obrigatória.");
        erro = true;
    } else {
        removerErro(senha);
    }

    // Se encontrou algum erro, interrompe
    if (erro) {
        console.log("Existem campos inválidos.");
        return;
    }

    console.log("Login válido!");

    // Redireciona para o Dashboard
    window.location.href = "indexDashboard.html";
});