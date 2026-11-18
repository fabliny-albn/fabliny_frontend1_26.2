/* compras.js
   Cupons, frete, registro das compras (loja:compras) com baixa no
   estoque e montagem dos detalhes de uma compra. */

import { cupons, faixasCep, valorFreteGratis } from "../data/cupons.js";
import { CHAVES, lerDados, gravarDados, proximoNumero } from "./storage.js";
import { buscarProduto, alterarEstoque, textoUnidades } from "./produtos.js";
import {
    arredondarMoeda,
    formatarMoeda,
    formatarData,
    formatarCep,
    somenteDigitos,
    gerarCodigo,
    criarElemento,
    adicionarDefinicao
} from "./utils.js";

// Nomes das formas de pagamento para exibição.
const NOMES_PAGAMENTO = {
    pix: "Pix",
    cartao: "Cartão de crédito",
    boleto: "Boleto bancário"
};

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

/* ---------- estoque ---------- */

// Descreve o problema de estoque de um item do carrinho ("" se estiver tudo certo).
function problemaDeEstoque(item) {
    const produto = buscarProduto(item.idProduto);
    if (!produto) {
        return "Um dos produtos do carrinho não está mais à venda. Remova-o para continuar.";
    }
    if (produto.estoque <= 0) {
        return `${produto.nome} está esgotado. Remova-o do carrinho para continuar.`;
    }
    if (item.quantidade > produto.estoque) {
        return `Estoque insuficiente de ${produto.nome}: restam só ${textoUnidades(produto.estoque)}.`;
    }
    return "";
}

/**
 * Confere se todos os itens ainda têm estoque suficiente.
 * @param {Array} itens - lista de { idProduto, quantidade }
 * @returns {string} mensagem do primeiro problema encontrado, ou ""
 */
export function verificarEstoque(itens) {
    const problemas = [];
    itens.forEach((item) => {
        const problema = problemaDeEstoque(item);
        if (problema !== "") {
            problemas.push(problema);
        }
    });
    if (problemas.length === 0) {
        return "";
    }
    return problemas[0];
}

/* ---------- registro das compras ---------- */

/**
 * Lista todas as compras registradas.
 * @returns {Array} lista de compras
 */
export function listarCompras() {
    return lerDados(CHAVES.compras, []);
}

// Lê o número sequencial do ID da compra (CP012 vira 12).
function numeroDaCompra(compra) {
    return parseInt(compra.id.slice(2), 10);
}

/**
 * Lista as compras de um cliente, da mais recente para a mais antiga.
 * @param {string} idCliente - id do cliente
 * @returns {Array} compras do cliente
 */
export function listarComprasDoCliente(idCliente) {
    const compras = listarCompras().filter((compra) => compra.idCliente === idCliente);
    compras.sort((compraA, compraB) => numeroDaCompra(compraB) - numeroDaCompra(compraA));
    return compras;
}

// Copia os itens com o nome e o preço do produto no momento da compra.
function copiarItens(itens) {
    return itens.map((item) => {
        const produto = buscarProduto(item.idProduto);
        return {
            idProduto: produto.id,
            nome: produto.nome,
            precoUnitario: produto.preco,
            quantidade: item.quantidade
        };
    });
}

// Soma preço unitário vezes quantidade de todos os itens.
function somarItens(itensCompra) {
    let total = 0;
    itensCompra.forEach((item) => {
        total += item.precoUnitario * item.quantidade;
    });
    return arredondarMoeda(total);
}

// Calcula de novo os valores do pedido, conferindo o cupom e o CEP.
function calcularValores(itensCompra, codigoCupom, cep) {
    const subtotal = somarItens(itensCompra);
    let cupom = null;
    if (codigoCupom !== "") {
        const resultadoCupom = validarCupom(codigoCupom, subtotal);
        if (!resultadoCupom.sucesso) {
            return { sucesso: false, mensagem: resultadoCupom.mensagem, valores: null, cupom: null };
        }
        cupom = resultadoCupom.cupom;
    }
    const frete = calcularFrete(cep, subtotal, cupom);
    if (!frete.sucesso) {
        return { sucesso: false, mensagem: frete.mensagem, valores: null, cupom: null };
    }
    const valores = calcularResumo(subtotal, calcularDesconto(cupom, subtotal), frete.valor);
    return { sucesso: true, mensagem: "", valores: valores, cupom: cupom };
}

// Dá baixa no estoque de cada item vendido.
function baixarEstoque(itensCompra) {
    itensCompra.forEach((item) => {
        alterarEstoque(item.idProduto, -item.quantidade);
    });
}

/**
 * Confere estoque, cupom e frete, registra a compra em loja:compras
 * e dá baixa no estoque.
 * @param {Object} pedido - { cliente, itens, codigoCupom, entrega, pagamento }
 * @returns {Object} { sucesso, mensagem, compra }
 */
export function registrarCompra(pedido) {
    if (pedido.itens.length === 0) {
        return { sucesso: false, mensagem: "O carrinho está vazio.", compra: null };
    }
    const problema = verificarEstoque(pedido.itens);
    if (problema !== "") {
        return { sucesso: false, mensagem: problema, compra: null };
    }
    const itensCompra = copiarItens(pedido.itens);
    const calculo = calcularValores(itensCompra, pedido.codigoCupom, pedido.entrega.cep);
    if (!calculo.sucesso) {
        return { sucesso: false, mensagem: calculo.mensagem, compra: null };
    }

    let codigoCupom = "";
    if (calculo.cupom) {
        codigoCupom = calculo.cupom.codigo;
    }
    const compra = {
        id: gerarCodigo("CP", proximoNumero("compras"), 3),
        idCliente: pedido.cliente.id,
        nomeCliente: pedido.cliente.nome,
        emailCliente: pedido.cliente.email,
        itens: itensCompra,
        subtotal: calculo.valores.subtotal,
        desconto: calculo.valores.desconto,
        cupom: codigoCupom,
        frete: calculo.valores.frete,
        total: calculo.valores.total,
        pagamento: {
            forma: pedido.pagamento.forma,
            finalCartao: pedido.pagamento.finalCartao
        },
        entrega: JSON.parse(JSON.stringify(pedido.entrega)),
        dataHora: new Date().toUTCString(),
        status: "Pago"
    };

    const lista = listarCompras();
    lista.push(compra);
    if (!gravarDados(CHAVES.compras, lista)) {
        return { sucesso: false, mensagem: "Não foi possível registrar a compra neste navegador.", compra: null };
    }
    baixarEstoque(itensCompra);
    return { sucesso: true, mensagem: `Compra ${compra.id} registrada com sucesso!`, compra: compra };
}

/* ---------- exibicao das compras ---------- */

/**
 * Monta o nome da forma de pagamento (no cartão, com o final do número).
 * @param {Object} pagamento - { forma, finalCartao }
 * @returns {string} ex.: "Cartão de crédito final 1111"
 */
export function nomeFormaPagamento(pagamento) {
    const nome = NOMES_PAGAMENTO[pagamento.forma];
    if (!nome) {
        return pagamento.forma;
    }
    if (pagamento.forma === "cartao" && pagamento.finalCartao) {
        return `${nome} final ${pagamento.finalCartao}`;
    }
    return nome;
}

/**
 * Monta o endereço de entrega em uma linha.
 * @param {Object} entrega - { cep, logradouro, numero, complemento, bairro, cidade, uf }
 * @returns {string} endereço completo
 */
export function textoEndereco(entrega) {
    let endereco = `${entrega.logradouro}, ${entrega.numero}`;
    if (entrega.complemento !== "") {
        endereco += ` (${entrega.complemento})`;
    }
    return `${endereco} - ${entrega.bairro}, ${entrega.cidade}/${entrega.uf} - CEP ${formatarCep(entrega.cep)}`;
}

/**
 * Junta os nomes dos produtos da compra separados por vírgula.
 * @param {Object} compra - compra registrada
 * @returns {string} ex.: "Samambaia Americana, Vaso de Cerâmica"
 */
export function resumirProdutos(compra) {
    let nomes = "";
    compra.itens.forEach((item, posicao) => {
        if (posicao > 0) {
            nomes += ", ";
        }
        nomes += item.nome;
    });
    return nomes;
}

/**
 * Cria o bloco com os itens, valores, pagamento e entrega de uma compra.
 * @param {Object} compra - compra registrada
 * @returns {HTMLElement} o elemento com os detalhes
 */
export function criarDetalhesCompra(compra) {
    const detalhes = criarElemento("div", "detalhes-compra", "");

    const listaItens = document.createElement("ul");
    compra.itens.forEach((item) => {
        const texto = `${textoUnidades(item.quantidade)} de ${item.nome} (${formatarMoeda(item.precoUnitario)} cada)`;
        listaItens.append(criarElemento("li", "", texto));
    });

    let rotuloDesconto = "Desconto";
    if (compra.cupom !== "") {
        rotuloDesconto = `Desconto (cupom ${compra.cupom})`;
    }
    let textoFrete = formatarMoeda(compra.frete);
    if (compra.frete === 0) {
        textoFrete = "Grátis";
    }

    const valores = document.createElement("dl");
    adicionarDefinicao(valores, "Produtos", formatarMoeda(compra.subtotal));
    adicionarDefinicao(valores, rotuloDesconto, `− ${formatarMoeda(compra.desconto)}`);
    adicionarDefinicao(valores, "Frete", textoFrete);
    adicionarDefinicao(valores, "Total", formatarMoeda(compra.total));
    adicionarDefinicao(valores, "Pagamento", nomeFormaPagamento(compra.pagamento));
    adicionarDefinicao(valores, "Entrega", textoEndereco(compra.entrega));

    detalhes.append(listaItens, valores);
    return detalhes;
}
