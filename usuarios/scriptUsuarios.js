const botaoSenha = document.querySelector(".botao-senha");
const formularioSenha = document.querySelector(".form-alterar-senha");

botaoSenha.addEventListener("click", function() {

    if (formularioSenha.style.display === "none") {
        formularioSenha.style.display = "block";
    } else {
        formularioSenha.style.display = "none";
    }

});