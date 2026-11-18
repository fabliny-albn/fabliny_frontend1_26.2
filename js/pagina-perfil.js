/* pagina-perfil.js
   Página de perfil do cliente: só abre com login. */

import { exigirLogin } from "./auth.js";
import { iniciarPagina } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
    const usuario = exigirLogin("", "Faça login para acessar o seu perfil.");
    if (!usuario) {
        return;
    }
    iniciarPagina();
    document.querySelector("main").hidden = false;
});
