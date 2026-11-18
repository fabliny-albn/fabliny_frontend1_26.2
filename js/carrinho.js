/* carrinho.js
   Itens do carrinho salvos em loja:carrinho. O valor salvo é um objeto
   com um carrinho por dono: { visitante: [ { idProduto, quantidade } ] }. */

import { CHAVES, lerDados, gravarDados } from "./storage.js";
import { buscarProduto, obterEstoque, textoUnidades } from "./produtos.js";
import { arredondarMoeda } from "./utils.js";

const DONO_VISITANTE = "visitante";

// Lê o objeto com os carrinhos de todos os donos.
function lerCarrinhos() {
    return lerDados(CHAVES.carrinho, {});
}

// Informa de quem é o carrinho em uso.
function donoAtual() {
    return DONO_VISITANTE;
}

// Grava a lista de itens do dono atual.
function salvarItens(itens) {
    const carrinhos = lerCarrinhos();
    carrinhos[donoAtual()] = itens;
    gravarDados(CHAVES.carrinho, carrinhos);
}

// Verifica se um item salvo tem o formato esperado e um produto existente.
function itemValido(item) {
    if (!item || !buscarProduto(item.idProduto)) {
        return false;
    }
    return !isNaN(parseInt(item.quantidade, 10)) && item.quantidade > 0;
}

/**
 * Devolve os itens do carrinho atual, ignorando itens inválidos.
 * @returns {Array} lista de { idProduto, quantidade }
 */
export function obterItensCarrinho() {
    const itens = lerCarrinhos()[donoAtual()];
    if (!Array.isArray(itens)) {
        return [];
    }
    return itens.filter(itemValido);
}

/**
 * Informa quantas unidades de um produto já estão no carrinho.
 * @param {string} idProduto - id do produto
 * @returns {number} quantidade no carrinho (0 se não estiver)
 */
export function quantidadeNoCarrinho(idProduto) {
    const item = obterItensCarrinho().find((itemCarrinho) => itemCarrinho.idProduto === idProduto);
    if (!item) {
        return 0;
    }
    return item.quantidade;
}

/**
 * Calcula quantas unidades ainda podem ser adicionadas sem passar do estoque.
 * @param {string} idProduto - id do produto
 * @returns {number} unidades disponíveis para adicionar
 */
export function quantidadeDisponivel(idProduto) {
    return obterEstoque(idProduto) - quantidadeNoCarrinho(idProduto);
}

/**
 * Adiciona unidades de um produto ao carrinho, respeitando o estoque.
 * @param {string} idProduto - id do produto
 * @param {number} quantidade - unidades a adicionar
 * @returns {Object} { sucesso, mensagem }
 */
export function adicionarAoCarrinho(idProduto, quantidade) {
    const produto = buscarProduto(idProduto);
    if (!produto) {
        return { sucesso: false, mensagem: "Produto não encontrado." };
    }
    if (isNaN(quantidade) || quantidade < 1) {
        return { sucesso: false, mensagem: "Informe uma quantidade válida." };
    }
    const disponivel = quantidadeDisponivel(idProduto);
    if (quantidade > disponivel) {
        if (disponivel <= 0) {
            return { sucesso: false, mensagem: `Não há mais estoque de ${produto.nome} para adicionar.` };
        }
        return { sucesso: false, mensagem: `Só é possível adicionar mais ${textoUnidades(disponivel)} de ${produto.nome}.` };
    }

    const itens = obterItensCarrinho();
    const posicao = itens.findIndex((item) => item.idProduto === idProduto);
    if (posicao === -1) {
        itens.push({ idProduto: idProduto, quantidade: quantidade });
    } else {
        itens[posicao].quantidade += quantidade;
    }
    salvarItens(itens);
    return { sucesso: true, mensagem: `${produto.nome} adicionado ao carrinho.` };
}

/**
 * Troca a quantidade de um item do carrinho (de 1 até o estoque).
 * @param {string} idProduto - id do produto
 * @param {number} novaQuantidade - nova quantidade desejada
 * @returns {Object} { sucesso, mensagem }
 */
export function alterarQuantidade(idProduto, novaQuantidade) {
    const itens = obterItensCarrinho();
    const posicao = itens.findIndex((item) => item.idProduto === idProduto);
    if (posicao === -1) {
        return { sucesso: false, mensagem: "Item não está no carrinho." };
    }
    if (novaQuantidade < 1) {
        return { sucesso: false, mensagem: "A quantidade mínima é 1. Para tirar o item, use Remover." };
    }
    const estoque = obterEstoque(idProduto);
    if (novaQuantidade > estoque) {
        return { sucesso: false, mensagem: `Estoque máximo atingido: ${textoUnidades(estoque)}.` };
    }
    itens[posicao].quantidade = novaQuantidade;
    salvarItens(itens);
    return { sucesso: true, mensagem: "Quantidade atualizada." };
}

/**
 * Remove um produto do carrinho.
 * @param {string} idProduto - id do produto
 * @returns {Object} { sucesso, mensagem }
 */
export function removerDoCarrinho(idProduto) {
    const produto = buscarProduto(idProduto);
    const itens = obterItensCarrinho().filter((item) => item.idProduto !== idProduto);
    salvarItens(itens);
    if (!produto) {
        return { sucesso: true, mensagem: "Item removido do carrinho." };
    }
    return { sucesso: true, mensagem: `${produto.nome} removido do carrinho.` };
}

/**
 * Esvazia o carrinho atual.
 * @returns {void}
 */
export function esvaziarCarrinho() {
    salvarItens([]);
}

/**
 * Soma a quantidade de unidades no carrinho (usada no contador do menu).
 * @returns {number} total de unidades
 */
export function contarItens() {
    let total = 0;
    obterItensCarrinho().forEach((item) => {
        total += item.quantidade;
    });
    return total;
}

/**
 * Monta os itens do carrinho com os dados do produto e o subtotal.
 * @returns {Array} lista de { produto, quantidade, subtotal }
 */
export function listarItensDetalhados() {
    return obterItensCarrinho().map((item) => {
        const produto = buscarProduto(item.idProduto);
        return {
            produto: produto,
            quantidade: item.quantidade,
            subtotal: arredondarMoeda(produto.preco * item.quantidade)
        };
    });
}

/**
 * Soma os subtotais de todos os itens do carrinho.
 * @returns {number} valor total em reais
 */
export function calcularTotalCarrinho() {
    let total = 0;
    listarItensDetalhados().forEach((item) => {
        total += item.subtotal;
    });
    return arredondarMoeda(total);
}
