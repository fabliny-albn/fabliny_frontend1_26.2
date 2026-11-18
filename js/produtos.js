/* produtos.js
   Leitura do catálogo com o estoque atualizado, filtros, ordenação
   e montagem dos elementos de produto (cartão e detalhes). */

import { produtos, nomesCategorias } from "../data/produtos.js";
import { CHAVES, lerDados, gravarDados } from "./storage.js";
import { criarElemento, formatarMoeda, normalizarTexto } from "./utils.js";

/**
 * Devolve o estoque atual de um produto (o salvo ou, se não houver, o inicial).
 * @param {string} idProduto - id do produto, ex.: "P01"
 * @returns {number} quantidade em estoque
 */
export function obterEstoque(idProduto) {
    const estoqueSalvo = lerDados(CHAVES.estoque, {});
    if (estoqueSalvo[idProduto] !== undefined) {
        return estoqueSalvo[idProduto];
    }
    const produto = produtos.find((item) => item.id === idProduto);
    if (!produto) {
        return 0;
    }
    return produto.estoque;
}

/**
 * Soma unidades ao estoque salvo (ou tira, com valor negativo), sem ficar abaixo de zero.
 * @param {string} idProduto - id do produto
 * @param {number} diferenca - unidades a somar (negativo para dar baixa)
 * @returns {boolean} true se gravou
 */
export function alterarEstoque(idProduto, diferenca) {
    const estoqueSalvo = lerDados(CHAVES.estoque, {});
    let novoEstoque = obterEstoque(idProduto) + diferenca;
    if (novoEstoque < 0) {
        novoEstoque = 0;
    }
    estoqueSalvo[idProduto] = novoEstoque;
    return gravarDados(CHAVES.estoque, estoqueSalvo);
}

/**
 * Lista todos os produtos com o estoque atualizado.
 * @returns {Array} cópia da lista de produtos
 */
export function listarProdutos() {
    const lista = JSON.parse(JSON.stringify(produtos));
    lista.forEach((produto) => {
        produto.estoque = obterEstoque(produto.id);
    });
    return lista;
}

/**
 * Procura um produto pelo id.
 * @param {string} idProduto - id do produto
 * @returns {Object|undefined} o produto encontrado ou undefined
 */
export function buscarProduto(idProduto) {
    return listarProdutos().find((produto) => produto.id === idProduto);
}

// Verifica se um produto atende à busca, à categoria e à faixa de preço.
function atendeFiltros(produto, filtros, termo) {
    if (termo !== "") {
        const textoProduto = normalizarTexto(`${produto.nome} ${produto.descricao}`);
        if (!textoProduto.includes(termo)) {
            return false;
        }
    }
    if (filtros.categoria !== "todas" && produto.categoria !== filtros.categoria) {
        return false;
    }
    if (!isNaN(filtros.precoMinimo) && produto.preco < filtros.precoMinimo) {
        return false;
    }
    if (!isNaN(filtros.precoMaximo) && produto.preco > filtros.precoMaximo) {
        return false;
    }
    return true;
}

// Compara dois produtos pelo nome, sem diferenciar acentos e maiúsculas.
function compararNomes(produtoA, produtoB) {
    const nomeA = normalizarTexto(produtoA.nome);
    const nomeB = normalizarTexto(produtoB.nome);
    if (nomeA < nomeB) {
        return -1;
    }
    if (nomeA > nomeB) {
        return 1;
    }
    return 0;
}

// Ordena uma cópia da lista; "relevancia" mantém a ordem original.
function ordenarProdutos(lista, ordem) {
    const copia = lista.slice();
    switch (ordem) {
        case "menor-preco":
            copia.sort((produtoA, produtoB) => produtoA.preco - produtoB.preco);
            break;
        case "maior-preco":
            copia.sort((produtoA, produtoB) => produtoB.preco - produtoA.preco);
            break;
        case "nome":
            copia.sort(compararNomes);
            break;
    }
    return copia;
}

/**
 * Filtra e ordena a lista de produtos.
 * @param {Array} lista - produtos a filtrar
 * @param {Object} filtros - { busca, categoria, precoMinimo, precoMaximo, ordem }
 * @returns {Array} nova lista filtrada e ordenada
 */
export function filtrarProdutos(lista, filtros) {
    const termo = normalizarTexto(filtros.busca);
    const resultado = lista.filter((produto) => atendeFiltros(produto, filtros, termo));
    return ordenarProdutos(resultado, filtros.ordem);
}

/**
 * Monta o texto "N unidade(s)" no singular ou no plural.
 * @param {number} quantidade - número de unidades
 * @returns {string} texto com a quantidade
 */
export function textoUnidades(quantidade) {
    if (quantidade === 1) {
        return "1 unidade";
    }
    return `${quantidade} unidades`;
}

/**
 * Cria o cartão de um produto (mesmo visual do HTML original).
 * @param {Object} produto - produto do catálogo
 * @param {Function} aoAdicionar - chamada ao clicar em "Adicionar ao carrinho"
 * @param {Function} aoVerDetalhes - chamada ao clicar em "Ver detalhes"
 * @returns {HTMLElement} o elemento article do cartão
 */
export function criarCartaoProduto(produto, aoAdicionar, aoVerDetalhes) {
    const cartao = criarElemento("article", "cartao-produto", "");

    const imagem = document.createElement("img");
    imagem.src = produto.imagem;
    imagem.alt = produto.textoAlternativo;
    imagem.setAttribute("loading", "lazy");

    const info = criarElemento("div", "info-produto", "");
    const titulo = criarElemento("h3", "", produto.nome);
    const descricao = criarElemento("p", "descricao-produto", produto.descricao);
    const preco = criarElemento("p", "preco-produto", formatarMoeda(produto.preco));

    const botaoAdicionar = criarElemento("button", "botao", "Adicionar ao carrinho");
    botaoAdicionar.type = "button";
    botaoAdicionar.classList.add("botao-bloco");
    if (produto.estoque <= 0) {
        botaoAdicionar.textContent = "Esgotado";
        botaoAdicionar.disabled = true;
    }
    botaoAdicionar.addEventListener("click", aoAdicionar);

    const botaoDetalhes = criarElemento("button", "botao", "Ver detalhes");
    botaoDetalhes.type = "button";
    botaoDetalhes.classList.add("botao-secundario");
    botaoDetalhes.classList.add("botao-bloco");
    botaoDetalhes.setAttribute("aria-label", `Ver detalhes de ${produto.nome}`);
    botaoDetalhes.addEventListener("click", aoVerDetalhes);

    info.append(titulo, descricao, preco, botaoAdicionar, botaoDetalhes);
    cartao.append(imagem, info);
    return cartao;
}

// Cria o campo de quantidade e o botão de adicionar dos detalhes.
function criarSeletorQuantidade(disponivel, aoAdicionar) {
    const area = criarElemento("div", "", "");

    const campo = criarElemento("div", "campo", "");
    const rotulo = criarElemento("label", "", "Quantidade");
    rotulo.setAttribute("for", "quantidade-detalhe");
    const entrada = document.createElement("input");
    entrada.type = "number";
    entrada.id = "quantidade-detalhe";
    entrada.min = "1";
    entrada.max = `${disponivel}`;
    entrada.step = "1";
    entrada.value = "1";
    const erro = criarElemento("small", "mensagem-erro", "");
    erro.id = "erro-quantidade-detalhe";
    erro.hidden = true;
    campo.append(rotulo, entrada, erro);

    const botao = criarElemento("button", "botao", "Adicionar ao carrinho");
    botao.type = "button";
    botao.classList.add("botao-bloco");
    botao.addEventListener("click", () => {
        const quantidade = parseInt(entrada.value, 10);
        if (isNaN(quantidade) || quantidade < 1 || quantidade > disponivel) {
            erro.textContent = `Escolha uma quantidade entre 1 e ${disponivel}.`;
            erro.hidden = false;
            entrada.setAttribute("aria-invalid", "true");
            entrada.setAttribute("aria-describedby", erro.id);
            entrada.focus();
            return;
        }
        aoAdicionar(quantidade);
    });

    area.append(campo, botao);
    return area;
}

/**
 * Cria o conteúdo do diálogo de detalhes de um produto.
 * @param {Object} produto - produto do catálogo
 * @param {number} disponivel - quantas unidades ainda podem ir para o carrinho
 * @param {Function} aoAdicionar - recebe a quantidade escolhida
 * @returns {HTMLElement} o elemento com os detalhes
 */
export function criarDetalhesProduto(produto, disponivel, aoAdicionar) {
    const detalhes = criarElemento("div", "detalhes-produto", "");

    const imagem = document.createElement("img");
    imagem.src = produto.imagem;
    imagem.alt = produto.textoAlternativo;

    const info = criarElemento("div", "", "");
    const categoria = criarElemento("p", "categoria-produto", nomesCategorias[produto.categoria]);
    const descricao = criarElemento("p", "", produto.descricao);
    const preco = criarElemento("p", "preco-produto", formatarMoeda(produto.preco));
    const estoque = criarElemento("p", "estoque-produto", `Estoque disponível: ${textoUnidades(produto.estoque)}`);
    info.append(categoria, descricao, preco, estoque);

    if (produto.estoque <= 0) {
        info.append(criarElemento("p", "aviso-estoque", "Produto esgotado no momento."));
    } else if (disponivel <= 0) {
        info.append(criarElemento("p", "aviso-estoque", "Você já colocou no carrinho toda a quantidade disponível deste produto."));
    } else {
        info.append(criarSeletorQuantidade(disponivel, aoAdicionar));
    }

    detalhes.append(imagem, info);
    return detalhes;
}
