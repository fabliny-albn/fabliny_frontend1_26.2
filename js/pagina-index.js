/* pagina-index.js
   Página inicial: monta a vitrine de produtos e cuida do formulário
   de contato (as mensagens ficam em loja:mensagens para a administração). */

import { listarProdutos } from "./produtos.js";
import { validarNome, validarTextoMensagem, salvarMensagemContato } from "./clientes.js";
import { usuarioLogado } from "./auth.js";
import { iniciarPagina, exibirCatalogo, validarFormulario, corrigirAoDigitar, mostrarToast } from "./ui.js";
import { validarEmail } from "./utils.js";

// Regra do e-mail do contato (só o formato).
function validarEmailContato(valor) {
    if (!validarEmail(valor)) {
        return "Informe um e-mail válido, como nome@exemplo.com.";
    }
    return "";
}

// Liga a validação e o envio do formulário de contato.
function configurarContato() {
    const nome = document.getElementById("contato-nome");
    const email = document.getElementById("contato-email");
    const mensagem = document.getElementById("contato-mensagem");
    const regras = [
        { entrada: nome, validar: validarNome },
        { entrada: email, validar: validarEmailContato },
        { entrada: mensagem, validar: validarTextoMensagem }
    ];

    // Cliente conectado já começa com o nome e o e-mail preenchidos
    const usuario = usuarioLogado();
    if (usuario) {
        nome.value = usuario.nome;
        email.value = usuario.email;
    }

    corrigirAoDigitar(regras);
    document.getElementById("form-contato").addEventListener("submit", (evento) => {
        evento.preventDefault();
        if (!validarFormulario(regras)) {
            return;
        }
        const resultado = salvarMensagemContato({ nome: nome.value, email: email.value, mensagem: mensagem.value });
        if (!resultado.sucesso) {
            mostrarToast(resultado.mensagem, "erro");
            return;
        }
        mostrarToast(resultado.mensagem, "sucesso");
        mensagem.value = "";
    });
}

document.addEventListener("DOMContentLoaded", () => {
    iniciarPagina();
    exibirCatalogo(document.querySelector(".grade-produtos"), listarProdutos());
    configurarContato();
});
