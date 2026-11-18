/* ui.js
   Partes de interface usadas em várias páginas: avisos (toasts), diálogo,
   menu dinâmico, contador do carrinho, erros de formulário e catálogo. */

import { criarElemento } from "./utils.js";
import { criarCartaoProduto, criarDetalhesProduto } from "./produtos.js";
import { adicionarAoCarrinho, contarItens, quantidadeDisponivel } from "./carrinho.js";
import {
    usuarioLogado,
    encerrarSessao,
    renovarSessao,
    verificarExpiracao,
    retirarAviso,
    garantirAdministrador,
    paginaAtual
} from "./auth.js";

const TEMPO_TOAST = 4000;
const INTERVALO_VERIFICACAO_SESSAO = 15000;

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

/* ---------- menu dinamico ---------- */

// Cria um item de menu com link; marca aria-current na página aberta.
function criarItemLink(texto, endereco) {
    const item = document.createElement("li");
    const link = criarElemento("a", "", texto);
    link.href = endereco;
    if (endereco === paginaAtual()) {
        link.setAttribute("aria-current", "page");
    }
    item.append(link);
    return item;
}

// Cria o item "Carrinho" com o contador de unidades.
function criarItemCarrinho() {
    const item = document.createElement("li");
    const link = criarElemento("a", "link-carrinho", "Carrinho ");
    link.href = "loja.html#carrinho";
    const contador = criarElemento("span", "contador-carrinho", "0");
    contador.id = "contador-carrinho";
    const textoLeitor = criarElemento("span", "somente-leitor-de-tela", " itens");
    link.append(contador, textoLeitor);
    item.append(link);
    return item;
}

// Pega só o primeiro nome, para a saudação do menu.
function primeiroNome(nomeCompleto) {
    let nome = "";
    let i = 0;
    while (i < nomeCompleto.length && nomeCompleto[i] !== " ") {
        nome += nomeCompleto[i];
        i++;
    }
    return nome;
}

// Cria o botão "Sair", que encerra a sessão e volta para o início.
function criarItemSair() {
    const item = document.createElement("li");
    const botao = criarElemento("button", "botao-menu", "Sair");
    botao.type = "button";
    botao.addEventListener("click", () => {
        encerrarSessao("Você saiu da sua conta. Seu carrinho continua salvo.");
        window.location.href = "index.html";
    });
    item.append(botao);
    return item;
}

// Monta o menu conforme o visitante, o cliente ou o administrador.
function montarMenu(usuario) {
    const listaMenu = document.querySelector(".menu-principal ul");
    if (!listaMenu) {
        return;
    }
    listaMenu.textContent = "";
    listaMenu.append(criarItemLink("Início", "index.html"), criarItemLink("Loja", "loja.html"));

    if (!usuario) {
        listaMenu.append(criarItemLink("Entrar", "login.html"), criarItemLink("Cadastrar", "cadastro.html"));
    } else {
        const saudacao = document.createElement("li");
        saudacao.append(criarElemento("span", "saudacao-menu", `Olá, ${primeiroNome(usuario.nome)}`));
        listaMenu.append(saudacao, criarItemLink("Meu perfil", "perfil.html"));
        if (usuario.perfil === "administrador") {
            listaMenu.append(criarItemLink("Relatórios", "relatorios.html"));
        }
        listaMenu.append(criarItemSair());
    }
    listaMenu.append(criarItemCarrinho());
}

// Mostra o bloco "Administração" do rodapé só para o administrador.
function ajustarRodape(usuario) {
    const blocoAdmin = document.querySelector(".bloco-admin");
    if (blocoAdmin) {
        blocoAdmin.hidden = !(usuario && usuario.perfil === "administrador");
    }
}

/**
 * Atualiza o número de unidades mostrado no menu.
 * @returns {void}
 */
export function atualizarContadorCarrinho() {
    const contador = document.getElementById("contador-carrinho");
    if (contador) {
        contador.textContent = `${contarItens()}`;
    }
}

/**
 * Atualiza o menu e o rodapé de acordo com o usuário conectado.
 * @returns {void}
 */
export function atualizarMenu() {
    const usuario = usuarioLogado();
    montarMenu(usuario);
    ajustarRodape(usuario);
    atualizarContadorCarrinho();
}

/* ---------- sessao ---------- */

// Renova a sessão a cada interação e confere de tempos em tempos se ela expirou.
function acompanharSessao() {
    document.addEventListener("click", renovarSessao);
    document.addEventListener("keydown", renovarSessao);
    document.addEventListener("submit", renovarSessao);
    setInterval(() => {
        // Ao expirar, recarrega a página: o aviso aparece e as páginas restritas redirecionam
        if (verificarExpiracao()) {
            window.location.reload();
        }
    }, INTERVALO_VERIFICACAO_SESSAO);
}

/**
 * Prepara as partes comuns da página: conta do administrador, menu,
 * rodapé, contador do carrinho, aviso pendente e controle da sessão.
 * @returns {void}
 */
export function iniciarPagina() {
    garantirAdministrador();
    atualizarMenu();
    const aviso = retirarAviso();
    if (aviso) {
        mostrarToast(aviso, "info");
    }
    acompanharSessao();
}

/* ---------- erros de formulario ---------- */

/**
 * Mostra uma mensagem de erro logo abaixo do campo.
 * @param {HTMLElement} entrada - input, select ou textarea
 * @param {string} mensagem - texto do erro
 * @returns {void}
 */
export function mostrarErroCampo(entrada, mensagem) {
    const campo = entrada.parentElement;
    let erro = campo.querySelector(".mensagem-erro");
    if (!erro) {
        erro = criarElemento("small", "mensagem-erro", "");
        erro.id = `erro-${entrada.id}`;
        campo.append(erro);
    }
    erro.textContent = mensagem;
    entrada.setAttribute("aria-invalid", "true");
    entrada.setAttribute("aria-describedby", erro.id);
}

/**
 * Remove a mensagem de erro do campo.
 * @param {HTMLElement} entrada - input, select ou textarea
 * @returns {void}
 */
export function limparErroCampo(entrada) {
    const erro = entrada.parentElement.querySelector(".mensagem-erro");
    if (erro) {
        erro.remove();
    }
    entrada.removeAttribute("aria-invalid");
    entrada.removeAttribute("aria-describedby");
}

// Valida um campo com a sua regra; devolve true se estiver certo.
function validarCampo(regra) {
    const mensagem = regra.validar(regra.entrada.value);
    if (mensagem !== "") {
        mostrarErroCampo(regra.entrada, mensagem);
        return false;
    }
    limparErroCampo(regra.entrada);
    return true;
}

/**
 * Valida todos os campos e leva o foco ao primeiro inválido.
 * @param {Array} regras - lista de { entrada, validar }, onde validar devolve a mensagem ou ""
 * @returns {boolean} true se todos estiverem certos
 */
export function validarFormulario(regras) {
    let primeiroInvalido = null;
    regras.forEach((regra) => {
        if (!validarCampo(regra) && primeiroInvalido === null) {
            primeiroInvalido = regra.entrada;
        }
    });
    if (primeiroInvalido !== null) {
        primeiroInvalido.focus();
        return false;
    }
    return true;
}

/**
 * Valida de novo, enquanto o usuário digita, os campos que estão com erro.
 * @param {Array} regras - lista de { entrada, validar }
 * @returns {void}
 */
export function corrigirAoDigitar(regras) {
    regras.forEach((regra) => {
        regra.entrada.addEventListener("input", () => {
            if (regra.entrada.getAttribute("aria-invalid") === "true") {
                validarCampo(regra);
            }
        });
    });
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
