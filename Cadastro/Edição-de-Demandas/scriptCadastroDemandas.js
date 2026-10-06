console.log("JavaScript conectado!");

const descricao = document.getElementById("descricao"); 

const contador = document.querySelector(".char-count"); 

const categoria = document.getElementById("categoria");
const projeto = document.getElementById("projeto");
const prazo = document.getElementById("prazo");
const abertura = document.getElementById("abertura");

descricao.addEventListener("input", function() { 
    contador.textContent = `${descricao.value.length} / 1000`; 
});

const titulo = document.getElementById("titulo");

const form = document.querySelector("form");

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

form.addEventListener("submit", function(event) {
    event.preventDefault();

    let erro = false;

    if (titulo.value.trim() === "") {
        mostrarErro(titulo, "O título é obrigatório.");
        erro = true;
    } else {
        removerErro(titulo);
    }

    if (descricao.value.trim() === "") {
        mostrarErro(descricao, "A descrição é obrigatória.");
        erro = true;
    } else {
        removerErro(descricao);
    }

    if (categoria.value === "") {
        mostrarErro(categoria, "Selecione uma categoria.");
        erro = true;
    } else {
        removerErro(categoria);
    }

    if (projeto.value === "") {
        mostrarErro(projeto, "Selecione um projeto.");
        erro = true;
    } else {
        removerErro(projeto);
    }

    if (prazo.value === "") {
        mostrarErro(prazo, "Informe o prazo.");
        erro = true;
    } else {
        removerErro(prazo);
    }
    if (abertura.value !== "" && prazo.value !== "" && prazo.value < abertura.value) {
        mostrarErro(prazo, "O prazo não pode ser anterior à data de abertura.");
        erro = true;
    }

    if (erro) {
        console.log("Preencha todos os campos obrigatórios.");
        return;
    }

    console.log("Formulário válido!");
});