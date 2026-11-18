/* pagina-loja.js
   Catálogo com busca, filtros e ordenação, tabela do carrinho,
   cupom de desconto, cálculo do frete e resumo do pedido. */

import { listarProdutos, filtrarProdutos } from "./produtos.js";
import {
    listarItensDetalhados,
    calcularTotalCarrinho,
    alterarQuantidade,
    removerDoCarrinho
} from "./carrinho.js";
import { validarCupom, calcularDesconto, calcularFrete, calcularResumo } from "./compras.js";
import { iniciarPagina, exibirCatalogo, mostrarToast, atualizarContadorCarrinho } from "./ui.js";
import { criarElemento, formatarMoeda, criarDebounce } from "./utils.js";

const ESPERA_BUSCA = 300;

// Cupom aplicado e CEP informado no carrinho desta página.
const escolhasPedido = {
    cupom: null,
    cep: ""
};

/* ---------- filtros ---------- */

// Lê os valores atuais do formulário de filtros.
function lerFiltros() {
    return {
        busca: document.getElementById("filtro-busca").value,
        categoria: document.getElementById("filtro-categoria").value,
        precoMinimo: parseFloat(document.getElementById("filtro-preco-min").value),
        precoMaximo: parseFloat(document.getElementById("filtro-preco-max").value),
        ordem: document.getElementById("filtro-ordenar").value
    };
}

// Escreve quantos produtos foram encontrados (lido pelo leitor de tela).
function informarResultado(texto) {
    document.getElementById("resultado-filtros").textContent = texto;
}

// Aplica os filtros e mostra os produtos encontrados.
function aplicarFiltros() {
    const filtros = lerFiltros();
    if (!isNaN(filtros.precoMinimo) && !isNaN(filtros.precoMaximo) && filtros.precoMinimo > filtros.precoMaximo) {
        informarResultado("O preço mínimo não pode ser maior que o preço máximo.");
        return;
    }

    const encontrados = filtrarProdutos(listarProdutos(), filtros);
    exibirCatalogo(document.querySelector(".grade-produtos"), encontrados, exibirCarrinho);

    if (encontrados.length === 1) {
        informarResultado("1 produto encontrado.");
    } else {
        informarResultado(`${encontrados.length} produtos encontrados.`);
    }
}

// Liga os eventos do formulário de filtros.
function configurarFiltros() {
    const formulario = document.querySelector(".filtros-loja");
    const buscaComEspera = criarDebounce(aplicarFiltros, ESPERA_BUSCA);

    document.getElementById("filtro-busca").addEventListener("input", buscaComEspera);
    document.getElementById("filtro-categoria").addEventListener("change", aplicarFiltros);
    document.getElementById("filtro-preco-min").addEventListener("change", aplicarFiltros);
    document.getElementById("filtro-preco-max").addEventListener("change", aplicarFiltros);
    document.getElementById("filtro-ordenar").addEventListener("change", aplicarFiltros);

    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        aplicarFiltros();
    });
}

/* ---------- carrinho ---------- */

// Avisa o resultado de uma ação no carrinho e redesenha a tabela.
// O aviso de sucesso só aparece quando avisarSucesso for true.
function tratarResultado(resultado, avisarSucesso) {
    if (!resultado.sucesso) {
        mostrarToast(resultado.mensagem, "erro");
    } else if (avisarSucesso) {
        mostrarToast(resultado.mensagem, "sucesso");
    }
    exibirCarrinho();
}

// Cria um botão pequeno da tabela do carrinho.
function criarBotaoCarrinho(texto, rotulo, classe, aoClicar) {
    const botao = criarElemento("button", "botao", texto);
    botao.type = "button";
    botao.classList.add(classe);
    botao.setAttribute("aria-label", rotulo);
    botao.addEventListener("click", aoClicar);
    return botao;
}

// Cria a célula com os botões − e + e a quantidade atual.
function criarCelulaQuantidade(item) {
    const celula = document.createElement("td");
    const controle = criarElemento("div", "controle-quantidade", "");
    const idProduto = item.produto.id;

    const botaoMenos = criarBotaoCarrinho("−", `Diminuir quantidade de ${item.produto.nome}`, "botao-secundario", () => {
        tratarResultado(alterarQuantidade(idProduto, item.quantidade - 1), false);
    });
    botaoMenos.disabled = item.quantidade <= 1;

    const valor = criarElemento("span", "valor-quantidade", `${item.quantidade}`);

    const botaoMais = criarBotaoCarrinho("+", `Aumentar quantidade de ${item.produto.nome}`, "botao-secundario", () => {
        tratarResultado(alterarQuantidade(idProduto, item.quantidade + 1), false);
    });
    botaoMais.disabled = item.quantidade >= item.produto.estoque;

    controle.append(botaoMenos, valor, botaoMais);
    celula.append(controle);
    return celula;
}

// Cria uma linha da tabela do carrinho.
function criarLinhaCarrinho(item) {
    const linha = document.createElement("tr");
    const celulaRemover = document.createElement("td");
    celulaRemover.append(criarBotaoCarrinho("Remover", `Remover ${item.produto.nome}`, "botao-perigo", () => {
        tratarResultado(removerDoCarrinho(item.produto.id), true);
    }));

    linha.append(
        criarElemento("td", "", item.produto.nome),
        criarCelulaQuantidade(item),
        criarElemento("td", "", formatarMoeda(item.produto.preco)),
        criarElemento("td", "", formatarMoeda(item.subtotal)),
        celulaRemover
    );
    return linha;
}

// Redesenha a tabela do carrinho, o total e o contador do menu.
function exibirCarrinho() {
    const corpoTabela = document.getElementById("itens-carrinho");
    const itens = listarItensDetalhados();
    corpoTabela.textContent = "";

    if (itens.length === 0) {
        const linha = document.createElement("tr");
        const celula = criarElemento("td", "carrinho-vazio", "Seu carrinho está vazio.");
        celula.setAttribute("colspan", "5");
        linha.append(celula);
        corpoTabela.append(linha);
    }
    itens.forEach((item) => {
        corpoTabela.append(criarLinhaCarrinho(item));
    });

    document.getElementById("total-carrinho").textContent = formatarMoeda(calcularTotalCarrinho());
    document.querySelector("#form-carrinho button[type=\"submit\"]").disabled = itens.length === 0;
    atualizarContadorCarrinho();
    atualizarResumo();
}

/* ---------- cupom, frete e resumo ---------- */

// Escreve uma mensagem abaixo do campo, como sucesso ou erro.
function escreverMensagem(idMensagem, texto, sucesso) {
    const mensagem = document.getElementById(idMensagem);
    mensagem.textContent = texto;
    mensagem.classList.remove("mensagem-erro", "mensagem-sucesso");
    if (texto === "") {
        return;
    }
    if (sucesso) {
        mensagem.classList.add("mensagem-sucesso");
    } else {
        mensagem.classList.add("mensagem-erro");
    }
}

// Calcula o valor do frete para o resumo; devolve -1 quando ainda não há CEP válido.
function valorDoFrete(subtotal) {
    if (escolhasPedido.cep === "") {
        return -1;
    }
    const frete = calcularFrete(escolhasPedido.cep, subtotal, escolhasPedido.cupom);
    if (!frete.sucesso) {
        return -1;
    }
    return frete.valor;
}

// Confere de novo o cupom aplicado, porque o subtotal pode ter mudado.
function revalidarCupom(subtotal) {
    if (!escolhasPedido.cupom) {
        return;
    }
    const resultado = validarCupom(escolhasPedido.cupom.codigo, subtotal);
    if (!resultado.sucesso) {
        escolhasPedido.cupom = null;
        escreverMensagem("mensagem-cupom", `Cupom removido. ${resultado.mensagem}`, false);
    }
}

// Atualiza o quadro com produtos, desconto, frete e total a pagar.
function atualizarResumo() {
    const subtotal = calcularTotalCarrinho();
    revalidarCupom(subtotal);
    const desconto = calcularDesconto(escolhasPedido.cupom, subtotal);
    let frete = valorDoFrete(subtotal);
    const textoFrete = document.getElementById("resumo-frete");

    if (frete === -1) {
        textoFrete.textContent = "Informe o CEP";
        frete = 0;
    } else if (frete === 0) {
        textoFrete.textContent = "Grátis";
    } else {
        textoFrete.textContent = formatarMoeda(frete);
    }
    if (subtotal === 0) {
        frete = 0;
    }

    const resumo = calcularResumo(subtotal, desconto, frete);
    document.getElementById("resumo-subtotal").textContent = formatarMoeda(resumo.subtotal);
    document.getElementById("resumo-desconto").textContent = `− ${formatarMoeda(resumo.desconto)}`;
    document.getElementById("resumo-total").textContent = formatarMoeda(resumo.total);
}

// Aplica o cupom digitado.
function aplicarCupom() {
    const codigo = document.getElementById("carrinho-cupom").value;
    const resultado = validarCupom(codigo, calcularTotalCarrinho());
    if (resultado.sucesso) {
        escolhasPedido.cupom = resultado.cupom;
    } else {
        escolhasPedido.cupom = null;
    }
    escreverMensagem("mensagem-cupom", resultado.mensagem, resultado.sucesso);
    atualizarResumo();
}

// Calcula o frete para o CEP digitado.
function aplicarCep() {
    const cep = document.getElementById("carrinho-cep").value;
    const resultado = calcularFrete(cep, calcularTotalCarrinho(), escolhasPedido.cupom);
    if (resultado.sucesso) {
        escolhasPedido.cep = cep;
    } else {
        escolhasPedido.cep = "";
    }
    escreverMensagem("mensagem-frete", resultado.mensagem, resultado.sucesso);
    atualizarResumo();
}

// Faz a tecla Enter no campo executar a ação, em vez de enviar o formulário.
function usarEnterNoCampo(idCampo, acao) {
    document.getElementById(idCampo).addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") {
            evento.preventDefault();
            acao();
        }
    });
}

// Liga os botões e campos de cupom e CEP.
function configurarCupomEFrete() {
    document.getElementById("aplicar-cupom").addEventListener("click", aplicarCupom);
    document.getElementById("calcular-frete").addEventListener("click", aplicarCep);
    usarEnterNoCampo("carrinho-cupom", aplicarCupom);
    usarEnterNoCampo("carrinho-cep", aplicarCep);
}

// Impede o envio do carrinho enquanto a finalização não está disponível.
function configurarFinalizacao() {
    document.getElementById("form-carrinho").addEventListener("submit", (evento) => {
        evento.preventDefault();
        mostrarToast("A finalização da compra ainda não está disponível.", "info");
    });
}

document.addEventListener("DOMContentLoaded", () => {
    iniciarPagina();
    configurarFiltros();
    configurarCupomEFrete();
    configurarFinalizacao();
    aplicarFiltros();
    exibirCarrinho();
});
