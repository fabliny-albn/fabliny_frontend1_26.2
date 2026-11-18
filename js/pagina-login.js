/* pagina-login.js
   Página de login: validação, mensagem genérica de erro, contagem regressiva
   do bloqueio, "Lembrar de mim" e volta para a página de origem. */

import {
    fazerLogin,
    tempoRestanteBloqueio,
    validarRetorno,
    lembrarEmail,
    esquecerEmail,
    obterEmailLembrado,
    guardarAviso
} from "./auth.js";
import { iniciarPagina, validarFormulario, corrigirAoDigitar } from "./ui.js";
import { validarEmail } from "./utils.js";

// Lê o parâmetro "retorno" da URL e aceita só páginas do site.
function obterRetorno() {
    const parametros = new URLSearchParams(window.location.search);
    const retorno = parametros.get("retorno");
    if (!retorno) {
        return "";
    }
    return validarRetorno(retorno);
}

// Escolhe a página de destino depois do login.
function escolherDestino(usuario) {
    const retorno = obterRetorno();
    if (retorno !== "") {
        return retorno;
    }
    if (usuario.perfil === "administrador") {
        return "relatorios.html";
    }
    return "index.html";
}

// Regra do e-mail no login (só o formato).
function validarEmailLogin(valor) {
    if (!validarEmail(valor)) {
        return "Informe um e-mail válido.";
    }
    return "";
}

// Regra da senha no login (só se foi preenchida).
function validarSenhaLogin(valor) {
    if (valor === "") {
        return "Informe a senha.";
    }
    return "";
}

// Prepara o formulário de login e o controle do bloqueio.
function configurarLogin() {
    const formulario = document.getElementById("form-login");
    const email = document.getElementById("login-email");
    const senha = document.getElementById("login-senha");
    const lembrar = document.getElementById("login-lembrar");
    const botao = formulario.querySelector("button[type=\"submit\"]");
    const mensagem = document.getElementById("mensagem-login");
    const textoBotao = botao.textContent;
    const regras = [
        { entrada: email, validar: validarEmailLogin },
        { entrada: senha, validar: validarSenhaLogin }
    ];
    let temporizador = null;

    function mostrarMensagem(texto) {
        mensagem.textContent = texto;
        mensagem.hidden = texto === "";
    }

    // Atualiza o botão a cada segundo enquanto o login estiver bloqueado.
    function atualizarBloqueio() {
        const restante = tempoRestanteBloqueio();
        if (restante > 0) {
            botao.disabled = true;
            botao.textContent = `Aguarde ${restante} s`;
            return;
        }
        clearInterval(temporizador);
        temporizador = null;
        botao.disabled = false;
        botao.textContent = textoBotao;
        mostrarMensagem("");
    }

    function iniciarContagem() {
        if (temporizador !== null || tempoRestanteBloqueio() === 0) {
            return;
        }
        mostrarMensagem("Muitas tentativas sem sucesso. O login foi bloqueado por 60 segundos.");
        atualizarBloqueio();
        temporizador = setInterval(atualizarBloqueio, 1000);
    }

    async function enviar(evento) {
        evento.preventDefault();
        if (!validarFormulario(regras)) {
            return;
        }
        botao.disabled = true;
        const resultado = await fazerLogin(email.value, senha.value);
        botao.disabled = false;

        if (!resultado.sucesso) {
            senha.value = "";
            mostrarMensagem(resultado.mensagem);
            iniciarContagem();
            return;
        }
        if (lembrar.checked) {
            lembrarEmail(email.value);
        } else {
            esquecerEmail();
        }
        guardarAviso(`Olá, ${resultado.usuario.nome}! Login realizado com sucesso.`);
        window.location.href = escolherDestino(resultado.usuario);
    }

    // Preenche o e-mail lembrado (a senha nunca é lembrada)
    const emailLembrado = obterEmailLembrado();
    if (emailLembrado !== "") {
        email.value = emailLembrado;
        lembrar.checked = true;
    }

    corrigirAoDigitar(regras);
    formulario.addEventListener("submit", enviar);
    iniciarContagem();
}

document.addEventListener("DOMContentLoaded", () => {
    iniciarPagina();
    configurarLogin();
});
