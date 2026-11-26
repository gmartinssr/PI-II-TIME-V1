// Elementos que o script usa. Os ids vêm do indexLogin.html
const email = document.getElementById("email");

const senha = document.getElementById("senha");

const form = document.getElementById("formLogin");

// Pinta o campo de vermelho e mostra a mensagem embaixo dele.
// Se já tem uma mensagem ali, só troca o texto (senão empilharia erro em cima de erro).
function mostrarErro(campo, mensagem) {
    campo.classList.add("campo-erro");

    // O span vai dentro da div do campo (.Email ou .Senha), por isso parentElement
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

// Faz o contrário: tira a borda vermelha e apaga a mensagem, se existir
function removerErro(campo) {
    campo.classList.remove("campo-erro");

    const mensagemErro = campo.parentElement.querySelector(".mensagem-erro");

    if (mensagemErro) {
        mensagemErro.remove();
    }
}

// Roda quando clica em Entrar (ou aperta Enter).
// Aqui não tem validação no front: o que digitou vai direto pro backend,
// que responde se está certo ou o que deu errado.
form.addEventListener("submit", async function(event) {
    // Sem isso a página recarregaria e perderia o controle do fluxo
    event.preventDefault();

    // Limpa os erros da tentativa anterior antes de tentar de novo
    removerErro(email);
    removerErro(senha);

    try {
        // Mesma lógica das outras telas: porta 3030 usa o backend de teste (3333),
        // qualquer outra usa o normal (3000)
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

        // Login recusado: mostra o erro no campo certo
        if (!resposta.ok) {
            // Erros por campo (ex: email vazio ou formato inválido)
            if (resultado.erros?.email) {
                mostrarErro(email, resultado.erros.email);
            }

            if (resultado.erros?.senha) {
                mostrarErro(senha, resultado.erros.senha);
            }

            // Erros de credencial vêm como texto em "mensagem".
            // Atenção: compara com o texto exato, então se o backend mudar
            // a frase, o erro deixa de aparecer na tela.
            if (resultado.mensagem === "Este email não está cadastrado no sistema.") {
                mostrarErro(email, resultado.mensagem);
            } else if (resultado.mensagem === "Senha incorreta.") {
                mostrarErro(senha, resultado.mensagem);
            }

            return;
        }

        // Deu certo: guarda o usuário na sessão. As outras telas leem daqui
        // (o formulário de demandas usa o idUsuario pra saber quem é o criador).
        // O sessionStorage some quando fecha a aba.
        sessionStorage.setItem("usuario", JSON.stringify(resultado.usuario));
        window.location.href = "../Dashboard/indexDashboard.html";
    } catch (error) {
        // Cai aqui se o backend estiver desligado ou a rede falhar
        console.error("Não foi possível validar o login:", error);
        mostrarErro(email, "Não foi possível conectar ao servidor.");
    }
});