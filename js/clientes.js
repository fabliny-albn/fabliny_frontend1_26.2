/* clientes.js
   Cadastro, consulta e validação dos clientes (loja:clientes).
   O CPF e o telefone são guardados só com números e o e-mail em minúsculas.
   A senha nunca é guardada: só o hash e o salt gerados em auth.js. */

import { CHAVES, lerDados, gravarDados, proximoNumero } from "./storage.js";
import {
    gerarCodigo,
    somenteDigitos,
    validarEmail,
    validarCpf,
    validarTelefone,
    analisarSenha
} from "./utils.js";

/* ---------- leitura e gravacao ---------- */

/**
 * Lista todos os usuários salvos (clientes e administrador).
 * @returns {Array} lista de clientes
 */
export function listarClientes() {
    return lerDados(CHAVES.clientes, []);
}

/**
 * Grava a lista completa de clientes.
 * @param {Array} lista - lista de clientes
 * @returns {boolean} true se gravou
 */
export function salvarClientes(lista) {
    return gravarDados(CHAVES.clientes, lista);
}

/**
 * Procura um cliente pelo id (ex.: C001).
 * @param {string} id - id do cliente
 * @returns {Object|undefined} o cliente ou undefined
 */
export function buscarClientePorId(id) {
    return listarClientes().find((cliente) => cliente.id === id);
}

/**
 * Procura um cliente pelo e-mail, sem diferenciar maiúsculas.
 * @param {string} email - e-mail procurado
 * @returns {Object|undefined} o cliente ou undefined
 */
export function buscarClientePorEmail(email) {
    const procurado = `${email}`.trim().toLowerCase();
    return listarClientes().find((cliente) => cliente.email === procurado);
}

// Procura um cliente pelo CPF (com ou sem máscara).
function buscarClientePorCpf(cpf) {
    const procurado = somenteDigitos(cpf);
    return listarClientes().find((cliente) => cliente.cpf === procurado);
}

/* ---------- validacoes (devolvem "" quando esta tudo certo) ---------- */

/**
 * Valida o nome: pelo menos 3 caracteres, com nome e sobrenome.
 * @param {string} nome - nome digitado
 * @returns {string} mensagem de erro ou ""
 */
export function validarNome(nome) {
    const texto = `${nome}`.trim();
    if (texto.length < 3) {
        return "Informe o nome com pelo menos 3 caracteres.";
    }
    if (!texto.includes(" ")) {
        return "Informe nome e sobrenome.";
    }
    return "";
}

/**
 * Valida o formato do e-mail e se ele já pertence a outro cliente.
 * @param {string} email - e-mail digitado
 * @param {string} idIgnorado - id do próprio cliente ("" no cadastro)
 * @returns {string} mensagem de erro ou ""
 */
export function validarEmailUnico(email, idIgnorado) {
    if (!validarEmail(email)) {
        return "Informe um e-mail válido, como nome@exemplo.com.";
    }
    const existente = buscarClientePorEmail(email);
    if (existente && existente.id !== idIgnorado) {
        return "Este e-mail já está cadastrado.";
    }
    return "";
}

/**
 * Valida o telefone (somente números, com DDD).
 * @param {string} telefone - telefone digitado
 * @returns {string} mensagem de erro ou ""
 */
export function validarTelefoneCliente(telefone) {
    if (!validarTelefone(telefone)) {
        return "Informe só números, com DDD: 10 ou 11 dígitos (celular com 9 depois do DDD).";
    }
    return "";
}

/**
 * Valida o CPF (dígitos verificadores) e se ele já está cadastrado.
 * @param {string} cpf - CPF digitado
 * @returns {string} mensagem de erro ou ""
 */
export function validarCpfUnico(cpf) {
    if (!validarCpf(cpf)) {
        return "CPF inválido. Confira os números digitados.";
    }
    if (buscarClientePorCpf(cpf)) {
        return "Este CPF já está cadastrado.";
    }
    return "";
}

/**
 * Valida a senha: mínimo de 8 caracteres, com letras e números.
 * @param {string} senha - senha digitada
 * @returns {string} mensagem de erro ou ""
 */
export function validarSenha(senha) {
    if (senha.length < 8) {
        return "A senha precisa ter pelo menos 8 caracteres.";
    }
    const tipos = analisarSenha(senha);
    if (!(tipos.minusculas || tipos.maiusculas) || !tipos.numeros) {
        return "A senha precisa ter letras e números.";
    }
    return "";
}

/**
 * Confere se a confirmação é igual à senha.
 * @param {string} senha - senha digitada
 * @param {string} confirmacao - senha repetida
 * @returns {string} mensagem de erro ou ""
 */
export function validarConfirmacao(senha, confirmacao) {
    if (confirmacao === "") {
        return "Repita a senha.";
    }
    if (senha !== confirmacao) {
        return "As senhas não são iguais.";
    }
    return "";
}

/* ---------- cadastro ---------- */

/**
 * Valida tudo de novo e grava um novo cliente com id sequencial.
 * @param {Object} dados - { nome, email, telefone, cpf }
 * @param {Object} senhaProtegida - { senhaHash, salt } gerados em auth.js
 * @returns {Object} { sucesso, mensagem, cliente }
 */
export function cadastrarCliente(dados, senhaProtegida) {
    const erros = [
        validarNome(dados.nome),
        validarEmailUnico(dados.email, ""),
        validarTelefoneCliente(dados.telefone),
        validarCpfUnico(dados.cpf)
    ].filter((mensagem) => mensagem !== "");
    if (erros.length > 0) {
        return { sucesso: false, mensagem: erros[0], cliente: null };
    }

    const cliente = {
        id: gerarCodigo("C", proximoNumero("clientes"), 3),
        nome: dados.nome.trim(),
        email: dados.email.trim().toLowerCase(),
        telefone: somenteDigitos(dados.telefone),
        cpf: somenteDigitos(dados.cpf),
        perfil: "cliente",
        situacao: "ativo",
        senhaHash: senhaProtegida.senhaHash,
        salt: senhaProtegida.salt,
        criadoEm: new Date().toUTCString()
    };
    const lista = listarClientes();
    lista.push(cliente);
    if (!salvarClientes(lista)) {
        return { sucesso: false, mensagem: "Não foi possível salvar o cadastro neste navegador.", cliente: null };
    }
    return { sucesso: true, mensagem: "Cadastro realizado com sucesso!", cliente: cliente };
}

/**
 * Verifica se já existe uma conta de administrador.
 * @returns {boolean} true se existir
 */
export function existeAdministrador() {
    const administrador = listarClientes().find((cliente) => cliente.perfil === "administrador");
    return administrador !== undefined;
}

/**
 * Grava a conta de administrador, se ela ainda não existir.
 * @param {Object} administrador - dados completos da conta
 * @returns {void}
 */
export function adicionarAdministrador(administrador) {
    if (existeAdministrador()) {
        return;
    }
    const lista = listarClientes();
    lista.push(administrador);
    salvarClientes(lista);
}
