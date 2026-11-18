/* pagina-index.js
   Página inicial: monta a vitrine de produtos. */

import { listarProdutos } from "./produtos.js";
import { iniciarPagina, exibirCatalogo } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
    iniciarPagina();
    exibirCatalogo(document.querySelector(".grade-produtos"), listarProdutos());
});
