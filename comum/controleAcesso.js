// Controle de acesso das páginas. Deve ser carregado no <head>, antes de tudo,
// para barrar quem entra direto pelo link, e não só pelos botões do sistema.
//
// Página liberada para qualquer usuário logado:
//   <script src="../comum/controleAcesso.js"></script>
//
// Página restrita a alguns perfis (ids separados por vírgula):
//   <script src="../comum/controleAcesso.js" data-perfis="1"></script>
//
// Perfis: 1 = Administrador, 2 = Líder de Projeto.
//
// O acesso por projeto (Kanban) é conferido pelo backend.
(function () {
    "use strict";

    const script = document.currentScript;

    // Os caminhos partem da pasta deste arquivo, então funcionam em qualquer página.
    const paginaLogin = new URL("../Login/indexLogin.html", script.src).href;
    const paginaInicial = new URL("../Dashboard/indexDashboard.html", script.src).href;

    const perfisPermitidos = script.dataset.perfis
        ? script.dataset.perfis.split(",").map(Number)
        : null;

    function obterUsuario() {
        try {
            const usuario = JSON.parse(sessionStorage.getItem("usuario"));
            return usuario && usuario.idUsuario ? usuario : null;
        } catch {
            return null;
        }
    }

    // Esconde a página e interrompe o carregamento antes de redirecionar.
    // O replace impede que o botão "Voltar" retorne para a página bloqueada.
    function bloquear(destino, mensagem) {
        document.documentElement.style.display = "none";

        if (mensagem) {
            alert(mensagem);
        }

        window.stop();
        window.location.replace(destino);
    }

    function verificarAcesso() {
        const usuario = obterUsuario();

        if (!usuario) {
            bloquear(paginaLogin);
            return;
        }

        if (perfisPermitidos && !perfisPermitidos.includes(Number(usuario.idPerfil))) {
            bloquear(paginaInicial, "Você não tem permissão para acessar esta página.");
        }
    }

    verificarAcesso();

    // O navegador pode restaurar a página da memória ao usar "Voltar",
    // sem executar os scripts de novo. Aqui a conferência é refeita.
    window.addEventListener("pageshow", function (evento) {
        if (evento.persisted) {
            verificarAcesso();
        }
    });
})();
