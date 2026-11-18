/* compras.js
   Cupons, frete, finalização e registro das compras (loja:compras). */

import { cupons, faixasCep, valorFreteGratis } from "../data/cupons.js";
import { arredondarMoeda, formatarMoeda, formatarData, somenteDigitos } from "./utils.js";

/* ---------- cupons ---------- */

// Procura o cupom pelo código, sem diferenciar maiúsculas.
function buscarCupom(codigo) {
    const procurado = `${codigo}`.trim().toLowerCase();
    return cupons.find((cupom) => cupom.codigo.toLowerCase() === procurado);
}

// Verifica se o cupom já passou da data de validade (vale até o fim do dia).
function cupomVencido(cupom) {
    return Date.parse(`${cupom.validade}T23:59:59`) < Date.now();
}

/**
 * Confere se o cupom existe, está no prazo e se a compra atinge o mínimo.
 * @param {string} codigo - código digitado
 * @param {number} subtotal - soma dos produtos do carrinho
 * @returns {Object} { sucesso, mensagem, cupom }
 */
export function validarCupom(codigo, subtotal) {
    if (`${codigo}`.trim() === "") {
        return { sucesso: false, mensagem: "Digite o código do cupom.", cupom: null };
    }
    const cupom = buscarCupom(codigo);
    if (!cupom) {
        return { sucesso: false, mensagem: "Cupom não encontrado. Confira o código digitado.", cupom: null };
    }
    if (cupomVencido(cupom)) {
        return {
            sucesso: false,
            mensagem: `O cupom ${cupom.codigo} venceu em ${formatarData(`${cupom.validade}T12:00:00`)}.`,
            cupom: null
        };
    }
    if (subtotal < cupom.compraMinima) {
        return {
            sucesso: false,
            mensagem: `O cupom ${cupom.codigo} vale para compras a partir de ${formatarMoeda(cupom.compraMinima)}.`,
            cupom: null
        };
    }
    return { sucesso: true, mensagem: `Cupom ${cupom.codigo} aplicado: ${cupom.descricao}.`, cupom: cupom };
}

/**
 * Calcula o desconto do cupom sobre o subtotal.
 * @param {Object|null} cupom - cupom aplicado ou null
 * @param {number} subtotal - soma dos produtos
 * @returns {number} valor do desconto em reais
 */
export function calcularDesconto(cupom, subtotal) {
    if (!cupom) {
        return 0;
    }
    switch (cupom.tipo) {
        case "percentual":
            return arredondarMoeda(subtotal * cupom.valor / 100);
        case "fixo":
            if (cupom.valor > subtotal) {
                return subtotal;
            }
            return cupom.valor;
        default:
            return 0;
    }
}

/* ---------- frete ---------- */

/**
 * Calcula o frete pela faixa do CEP; é grátis acima do valor definido
 * ou com cupom de frete grátis.
 * @param {string} cep - CEP digitado (com ou sem traço)
 * @param {number} subtotal - soma dos produtos
 * @param {Object|null} cupom - cupom aplicado ou null
 * @returns {Object} { sucesso, mensagem, valor }
 */
export function calcularFrete(cep, subtotal, cupom) {
    const digitos = somenteDigitos(cep);
    if (digitos.length !== 8) {
        return { sucesso: false, mensagem: "Informe um CEP com 8 números.", valor: 0 };
    }
    const numero = parseInt(digitos, 10);
    const faixa = faixasCep.find((item) => numero >= item.inicio && numero <= item.fim);
    if (!faixa) {
        return { sucesso: false, mensagem: "Não entregamos neste CEP.", valor: 0 };
    }
    if (cupom && cupom.tipo === "frete") {
        return { sucesso: true, mensagem: `Entrega para ${faixa.regiao}: frete grátis pelo cupom.`, valor: 0 };
    }
    if (subtotal >= valorFreteGratis) {
        return {
            sucesso: true,
            mensagem: `Entrega para ${faixa.regiao}: frete grátis em compras a partir de ${formatarMoeda(valorFreteGratis)}.`,
            valor: 0
        };
    }
    return { sucesso: true, mensagem: `Entrega para ${faixa.regiao}: ${formatarMoeda(faixa.valor)}.`, valor: faixa.valor };
}

/**
 * Junta subtotal, desconto e frete no total do pedido.
 * @param {number} subtotal - soma dos produtos
 * @param {number} desconto - desconto do cupom
 * @param {number} frete - valor do frete
 * @returns {Object} { subtotal, desconto, frete, total }
 */
export function calcularResumo(subtotal, desconto, frete) {
    return {
        subtotal: subtotal,
        desconto: desconto,
        frete: frete,
        total: arredondarMoeda(subtotal - desconto + frete)
    };
}
