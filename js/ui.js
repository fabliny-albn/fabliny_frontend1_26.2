/* ui.js
   Partes de interface usadas em várias páginas: avisos (toasts),
   diálogo, contador do carrinho no menu e exibição do catálogo. */

import { criarElemento } from "./utils.js";
import { criarCartaoProduto, criarDetalhesProduto } from "./produtos.js";
import { adicionarAoCarrinho, contarItens, quantidadeDisponivel } from "./carrinho.js";

const TEMPO_TOAST = 4000;

/* ---------- toasts ---------- */

// Devolve a área dos toasts, criando-a na primeira vez.
function obterAreaToasts() {
    let area = document.getElementById("area-toasts");
    if (!area) {
        area = criarElemento("div", "area-toasts", "");
        area.id = "area-toasts";
        area.setAttribute("role", "status");
        area.setAttribute("aria-live", "polite");
        document.body.append(area);
    }
    return area;
}

/**
 * Mostra um aviso temporário no canto da tela.
 * @param {string} mensagem - texto do aviso
 * @param {string} tipo - "sucesso", "erro" ou "info"
 * @returns {void}
 */
export function mostrarToast(mensagem, tipo) {
    const toast = criarElemento("p", "toast", mensagem);
    if (tipo === "erro") {
        toast.classList.add("toast-erro");
    } else if (tipo === "info") {
        toast.classList.add("toast-info");
    }
    obterAreaToasts().append(toast);
    setTimeout(() => {
        toast.remove();
    }, TEMPO_TOAST);
}

/* ---------- dialogo ---------- */

// Devolve o diálogo único da página, criando-o na primeira vez.
function obterDialogo() {
    let dialogo = document.getElementById("dialogo-geral");
    if (dialogo) {
        return dialogo;
    }

    dialogo = criarElemento("dialog", "dialogo", "");
    dialogo.id = "dialogo-geral";
    dialogo.setAttribute("aria-labelledby", "titulo-dialogo");

    const conteudo = criarElemento("div", "conteudo-dialogo", "");
    const cabecalho = criarElemento("div", "cabecalho-dialogo", "");
    const titulo = criarElemento("h2", "", "");
    titulo.id = "titulo-dialogo";
    const botaoFechar = criarElemento("button", "botao-fechar-dialogo", "×");
    botaoFechar.type = "button";
    botaoFechar.setAttribute("aria-label", "Fechar");
    botaoFechar.addEventListener("click", () => {
        dialogo.close();
    });
    cabecalho.append(titulo, botaoFechar);

    const corpo = criarElemento("div", "corpo-dialogo", "");
    conteudo.append(cabecalho, corpo);
    dialogo.append(conteudo);

    // Fecha ao clicar fora do conteúdo (no fundo escurecido)
    dialogo.addEventListener("click", (evento) => {
        if (evento.target === dialogo) {
            dialogo.close();
        }
    });

    document.body.append(dialogo);
    return dialogo;
}

/**
 * Abre o diálogo modal com um título e um conteúdo.
 * @param {string} titulo - título exibido no topo
 * @param {HTMLElement} conteudo - elemento colocado no corpo do diálogo
 * @returns {void}
 */
export function abrirDialogo(titulo, conteudo) {
    const dialogo = obterDialogo();
    dialogo.querySelector("#titulo-dialogo").textContent = titulo;
    const corpo = dialogo.querySelector(".corpo-dialogo");
    corpo.textContent = "";
    corpo.append(conteudo);
    dialogo.showModal();
}

/**
 * Fecha o diálogo modal, se estiver aberto.
 * @returns {void}
 */
export function fecharDialogo() {
    const dialogo = document.getElementById("dialogo-geral");
    if (dialogo) {
        dialogo.close();
    }
}

/* ---------- contador do carrinho ---------- */

// Cria o item "Carrinho" com o contador no fim do menu principal.
function criarItemCarrinho(listaMenu) {
    const item = document.createElement("li");
    const link = criarElemento("a", "link-carrinho", "Carrinho ");
    link.href = "loja.html#carrinho";
    const contador = criarElemento("span", "contador-carrinho", "0");
    contador.id = "contador-carrinho";
    const textoLeitor = criarElemento("span", "somente-leitor-de-tela", " itens");
    link.append(contador, textoLeitor);
    item.append(link);
    listaMenu.append(item);
    return contador;
}

/**
 * Atualiza o número de itens mostrado no menu (cria o item se faltar).
 * @returns {void}
 */
export function atualizarContadorCarrinho() {
    const listaMenu = document.querySelector(".menu-principal ul");
    if (!listaMenu) {
        return;
    }
    let contador = document.getElementById("contador-carrinho");
    if (!contador) {
        contador = criarItemCarrinho(listaMenu);
    }
    contador.textContent = `${contarItens()}`;
}

/**
 * Prepara as partes comuns da página (por enquanto, o contador do carrinho).
 * @returns {void}
 */
export function iniciarPagina() {
    atualizarContadorCarrinho();
}

/* ---------- catalogo ---------- */

// Tenta adicionar ao carrinho e avisa o resultado; devolve se deu certo.
function tratarAdicao(idProduto, quantidade, aoMudarCarrinho) {
    const resultado = adicionarAoCarrinho(idProduto, quantidade);
    if (!resultado.sucesso) {
        mostrarToast(resultado.mensagem, "erro");
        return false;
    }
    mostrarToast(resultado.mensagem, "sucesso");
    atualizarContadorCarrinho();
    if (aoMudarCarrinho) {
        aoMudarCarrinho();
    }
    return true;
}

// Abre o diálogo com os detalhes do produto e o seletor de quantidade.
function abrirDetalhes(produto, aoMudarCarrinho) {
    const disponivel = quantidadeDisponivel(produto.id);
    const detalhes = criarDetalhesProduto(produto, disponivel, (quantidade) => {
        if (tratarAdicao(produto.id, quantidade, aoMudarCarrinho)) {
            fecharDialogo();
        }
    });
    abrirDialogo(produto.nome, detalhes);
}

/**
 * Exibe os cartões dos produtos dentro da grade.
 * @param {HTMLElement} grade - elemento com a classe grade-produtos
 * @param {Array} lista - produtos a exibir
 * @param {Function} aoMudarCarrinho - chamada depois de adicionar (opcional)
 * @returns {void}
 */
export function exibirCatalogo(grade, lista, aoMudarCarrinho) {
    grade.textContent = "";
    if (lista.length === 0) {
        grade.append(criarElemento("p", "mensagem-vazia", "Nenhum produto encontrado."));
        return;
    }
    lista.forEach((produto) => {
        const cartao = criarCartaoProduto(
            produto,
            () => {
                tratarAdicao(produto.id, 1, aoMudarCarrinho);
            },
            () => {
                abrirDetalhes(produto, aoMudarCarrinho);
            }
        );
        grade.append(cartao);
    });
}
