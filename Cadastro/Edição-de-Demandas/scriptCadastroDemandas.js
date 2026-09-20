console.log("JavaScript conectado!");

// Pega o campo de descrição pelo ID
const descricao = document.getElementById("descricao"); 
// "descricao" passa a referenciar o elemento <textarea>

// Pega o elemento que mostra a quantidade de caracteres
const contador = document.querySelector(".char-count"); 
// "contador" passa a referenciar o elemento com class="char-count"

// Pega os campos que serão validados
const categoria = document.getElementById("categoria");
const projeto = document.getElementById("projeto");
const prazo = document.getElementById("prazo");
const abertura = document.getElementById("abertura");

// Atualiza o contador sempre que o usuário digitar.
descricao.addEventListener("input", function() { 
    // Detecta quando ocorre um evento de input e chama a função
    contador.textContent = `${descricao.value.length} / 1000`; 
    // Pega o tamanho do texto do textarea e atualiza o contador na tela
});

// Pega o campo de título pelo ID
const titulo = document.getElementById("titulo");

// Pega o formulário da página
const form = document.querySelector("form");

// Mostra uma mensagem de erro abaixo de um campo
function mostrarErro(campo, mensagem) { //Cria uma função com os parâmetros campo e mensagem
    campo.classList.add("campo-erro"); //Adiciona a classe campo-erro ao campo recebido

    // Verifica se já existe uma mensagem para esse campo
    if (campo.parentElement.querySelector(".mensagem-erro")) {
        return;
    }

    const mensagemErro = document.createElement("span"); //cria um span novo
    mensagemErro.className = "mensagem-erro"; //chama a mensagem erro
    mensagemErro.textContent = mensagem; //mostra a mensagem

    campo.parentElement.appendChild(mensagemErro); //Adiciona a mensagem de erro ao elemento pai do campo selecionado
}

// Remove o destaque e a mensagem de erro de um campo
function removerErro(campo) { //Cria uma função para remover a mensagem de erro com o parâmetro que é o campo onde a função vai atuar
    campo.classList.remove("campo-erro"); //Remove a classe CSS campo-erro do parâmetro campo

    const mensagemErro = campo.parentElement.querySelector(".mensagem-erro"); //Dentro do elemento pai do campo parâmetro, a função irá procurar um elemento com a classe mensagem erro

    if (mensagemErro) { //Se ele achar a mensagem erro
        mensagemErro.remove(); //Ele remove a mensagem erro
    }
}

// Detecta quando o formulário é enviado e serve também para validar as informações que o user colocou
form.addEventListener("submit", function(event) {
    // Impede o envio padrão do formulário
    event.preventDefault();

    let erro = false; //Inicializa a variável que avisa se existe ou não um erro

    // Verifica se o título está vazio
    if (titulo.value.trim() === "") {
        mostrarErro(titulo, "O título é obrigatório.");
        erro = true;
    } else {
        removerErro(titulo);
    }

    // Verifica se a descrição está vazia
    if (descricao.value.trim() === "") {
        mostrarErro(descricao, "A descrição é obrigatória.");
        erro = true;
    } else {
        removerErro(descricao);
    }

    // Verifica se uma categoria foi selecionada
    if (categoria.value === "") {
        mostrarErro(categoria, "Selecione uma categoria.");
        erro = true;
    } else {
        removerErro(categoria);
    }

    // Verifica se um projeto foi selecionado
    if (projeto.value === "") {
        mostrarErro(projeto, "Selecione um projeto.");
        erro = true;
    } else {
        removerErro(projeto);
    }

    // Verifica se o prazo foi preenchido
    if (prazo.value === "") {
        mostrarErro(prazo, "Informe o prazo.");
        erro = true;
    } else {
        removerErro(prazo);
    }
    // Verifica se o prazo é anterior à data de abertura
    if (abertura.value !== "" && prazo.value !== "" && prazo.value < abertura.value) {
        mostrarErro(prazo, "O prazo não pode ser anterior à data de abertura.");
        erro = true;
    }

    // Se algum campo tiver erro, interrompe o envio
    if (erro) {
        console.log("Preencha todos os campos obrigatórios.");
        return;
    }

    console.log("Formulário válido!");
});