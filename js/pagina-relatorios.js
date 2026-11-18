/* pagina-relatorios.js
   Área administrativa: só abre para o perfil administrador. A verificação
   roda antes de qualquer dado ser montado; o conteúdo começa com hidden. */

import { exigirLogin } from "./auth.js";
import { iniciarPagina } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
    const usuario = exigirLogin("administrador", "Acesso restrito: entre com uma conta de administrador para ver os relatórios.");
    if (!usuario) {
        return;
    }
    iniciarPagina();
    document.querySelector("main").hidden = false;
});
