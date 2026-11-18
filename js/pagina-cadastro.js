/* pagina-cadastro.js
   Página de cadastro: validação dos campos, máscara do CPF,
   telefone só com números, indicador de força da senha e gravação. */

import {
    validarNome,
    validarEmailUnico,
    validarTelefoneCliente,
    validarCpfUnico,
    validarSenha,
    validarConfirmacao,
    cadastrarCliente
} from "./clientes.js";
import { protegerSenha, guardarAviso } from "./auth.js";
import { iniciarPagina, validarFormulario, corrigirAoDigitar, mostrarToast } from "./ui.js";
import { mascararCpf, somenteDigitos, calcularForcaSenha } from "./utils.js";

// Atualiza a barra e o texto do indicador de força da senha.
function atualizarForcaSenha(senha) {
    const barra = document.getElementById("nivel-forca");
    const texto = document.getElementById("texto-forca");
    barra.classList.remove("forca-fraca", "forca-media", "forca-forte");

    if (senha === "") {
        barra.style.width = "0";
        texto.textContent = "";
        return;
    }
    const forca = calcularForcaSenha(senha);
    barra.style.width = `${forca.pontos * 20}%`;
    barra.classList.add(`forca-${forca.nivel}`);
    texto.textContent = forca.texto;
}

// Liga as máscaras e o indicador de força aos campos.
function configurarCamposAoVivo() {
    const cpf = document.getElementById("cad-cpf");
    const telefone = document.getElementById("cad-telefone");
    const senha = document.getElementById("cad-senha");

    cpf.addEventListener("input", () => {
        cpf.value = mascararCpf(cpf.value);
    });
    telefone.addEventListener("input", () => {
        telefone.value = somenteDigitos(telefone.value);
    });
    senha.addEventListener("input", () => {
        atualizarForcaSenha(senha.value);
    });
}

// Monta a lista de regras de validação, na ordem dos campos do formulário.
function criarRegras() {
    const senha = document.getElementById("cad-senha");
    return [
        { entrada: document.getElementById("cad-nome"), validar: validarNome },
        { entrada: document.getElementById("cad-email"), validar: (valor) => validarEmailUnico(valor, "") },
        { entrada: document.getElementById("cad-telefone"), validar: validarTelefoneCliente },
        { entrada: document.getElementById("cad-cpf"), validar: validarCpfUnico },
        { entrada: senha, validar: validarSenha },
        { entrada: document.getElementById("cad-confirmar-senha"), validar: (valor) => validarConfirmacao(senha.value, valor) }
    ];
}

// Valida, protege a senha com hash e grava o novo cliente.
async function enviarCadastro(evento, regras) {
    evento.preventDefault();
    if (!validarFormulario(regras)) {
        return;
    }
    const botao = evento.target.querySelector("button[type=\"submit\"]");
    botao.disabled = true;

    const senhaProtegida = await protegerSenha(document.getElementById("cad-senha").value);
    const resultado = cadastrarCliente({
        nome: document.getElementById("cad-nome").value,
        email: document.getElementById("cad-email").value,
        telefone: document.getElementById("cad-telefone").value,
        cpf: document.getElementById("cad-cpf").value
    }, senhaProtegida);

    if (!resultado.sucesso) {
        botao.disabled = false;
        mostrarToast(resultado.mensagem, "erro");
        return;
    }
    guardarAviso(`Cadastro realizado! Seu ID de cliente é ${resultado.cliente.id}. Faça login para continuar.`);
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    iniciarPagina();
    const regras = criarRegras();
    configurarCamposAoVivo();
    corrigirAoDigitar(regras);
    document.getElementById("form-cadastro").addEventListener("submit", (evento) => {
        enviarCadastro(evento, regras);
    });
});
