/* pagina-loja.js
   Catálogo com busca, filtros e ordenação, tabela do carrinho,
   cupom de desconto, cálculo do frete, resumo do pedido e finalização
   da compra em etapas (resumo, entrega, pagamento e confirmação). */

import { listarProdutos, filtrarProdutos } from "./produtos.js";
import {
    obterItensCarrinho,
    listarItensDetalhados,
    calcularTotalCarrinho,
    alterarQuantidade,
    removerDoCarrinho,
    esvaziarCarrinho
} from "./carrinho.js";
import {
    validarCupom,
    calcularDesconto,
    calcularFrete,
    calcularResumo,
    verificarEstoque,
    registrarCompra,
    nomeFormaPagamento,
    textoEndereco
} from "./compras.js";
import { usuarioLogado, guardarAviso } from "./auth.js";
import {
    iniciarPagina,
    exibirCatalogo,
    mostrarToast,
    atualizarContadorCarrinho,
    validarFormulario,
    corrigirAoDigitar
} from "./ui.js";
import {
    criarElemento,
    adicionarDefinicao,
    formatarMoeda,
    formatarData,
    criarDebounce,
    somenteDigitos,
    mascararCartao,
    mascararValidade,
    validarCartaoLuhn,
    validarValidadeCartao,
    validarCvv
} from "./utils.js";

const ESPERA_BUSCA = 300;
const DIAS_VENCIMENTO_BOLETO = 3;
const UM_DIA = 24 * 60 * 60 * 1000;

// Nomes das etapas da finalização, na ordem (usados nos ids do HTML).
const ETAPAS = ["resumo", "entrega", "pagamento", "confirmacao"];

// Textos de orientação de cada forma de pagamento.
const INFORMACOES_PAGAMENTO = {
    pix: "Pagamento simulado: ao confirmar, o Pix é aprovado na hora.",
    cartao: "Pagamento simulado: a loja guarda só os 4 últimos dígitos do cartão.",
    boleto: `Pagamento simulado: o boleto vence em ${DIAS_VENCIMENTO_BOLETO} dias.`
};

// Cupom aplicado e CEP informado no carrinho desta página.
const escolhasPedido = {
    cupom: null,
    cep: ""
};

// Andamento da finalização: etapa aberta, regras dos campos, entrega e pagamento.
const finalizacao = {
    etapa: 0,
    regrasEntrega: [],
    regrasCartao: [],
    entrega: null,
    pagamento: null
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
    exibirCatalogo(document.querySelector(".grade-produtos"), encontrados, carrinhoMudou);

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

// Calcula subtotal, desconto, frete e total com o cupom e o CEP escolhidos.
function calcularValoresPedido() {
    const subtotal = calcularTotalCarrinho();
    revalidarCupom(subtotal);
    const desconto = calcularDesconto(escolhasPedido.cupom, subtotal);
    let frete = valorDoFrete(subtotal);
    if (frete === -1 || subtotal === 0) {
        frete = 0;
    }
    return calcularResumo(subtotal, desconto, frete);
}

// Monta o texto do frete para os resumos.
function textoDoFrete() {
    const frete = valorDoFrete(calcularTotalCarrinho());
    if (frete === -1) {
        return "Informe o CEP";
    }
    if (frete === 0) {
        return "Grátis";
    }
    return formatarMoeda(frete);
}

// Atualiza o quadro com produtos, desconto, frete e total a pagar.
function atualizarResumo() {
    const resumo = calcularValoresPedido();
    document.getElementById("resumo-subtotal").textContent = formatarMoeda(resumo.subtotal);
    document.getElementById("resumo-desconto").textContent = `− ${formatarMoeda(resumo.desconto)}`;
    document.getElementById("resumo-frete").textContent = textoDoFrete();
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

/* ---------- finalizacao: resumo e confirmacao ---------- */

// Preenche uma lista dl com produtos, desconto, frete e total a pagar.
function preencherResumoPedido(idLista) {
    const lista = document.getElementById(idLista);
    const resumo = calcularValoresPedido();
    let rotuloDesconto = "Desconto";
    if (escolhasPedido.cupom) {
        rotuloDesconto = `Desconto (cupom ${escolhasPedido.cupom.codigo})`;
    }
    lista.textContent = "";
    adicionarDefinicao(lista, "Produtos", formatarMoeda(resumo.subtotal));
    adicionarDefinicao(lista, rotuloDesconto, `− ${formatarMoeda(resumo.desconto)}`);
    adicionarDefinicao(lista, "Frete", textoDoFrete());
    adicionarDefinicao(lista, "Total a pagar", formatarMoeda(resumo.total));
}

// Monta a tabela de produtos e o resumo da primeira etapa.
function preencherEtapaResumo() {
    const corpoTabela = document.getElementById("itens-checkout");
    corpoTabela.textContent = "";
    listarItensDetalhados().forEach((item) => {
        const linha = document.createElement("tr");
        linha.append(
            criarElemento("td", "", item.produto.nome),
            criarElemento("td", "", `${item.quantidade}`),
            criarElemento("td", "", formatarMoeda(item.produto.preco)),
            criarElemento("td", "", formatarMoeda(item.subtotal))
        );
        corpoTabela.append(linha);
    });
    preencherResumoPedido("resumo-pedido");
}

// Mostra na última etapa os valores, o endereço e a forma de pagamento.
function preencherEtapaConfirmacao() {
    preencherResumoPedido("resumo-confirmacao");
    document.getElementById("confirmar-entrega").textContent = textoEndereco(finalizacao.entrega);
    document.getElementById("confirmar-pagamento").textContent = nomeFormaPagamento(finalizacao.pagamento);
}

// Mostra a etapa escolhida, marca o passo atual e leva o foco ao título.
function irParaEtapa(indice) {
    finalizacao.etapa = indice;
    ETAPAS.forEach((nome, posicao) => {
        document.getElementById(`etapa-${nome}`).hidden = posicao !== indice;
        const passo = document.getElementById(`passo-${nome}`);
        passo.classList.toggle("passo-concluido", posicao < indice);
        if (posicao === indice) {
            passo.setAttribute("aria-current", "step");
        } else {
            passo.removeAttribute("aria-current");
        }
    });
    if (indice === 0) {
        preencherEtapaResumo();
    }
    if (indice === ETAPAS.length - 1) {
        preencherEtapaConfirmacao();
    }
    document.querySelector(`#etapa-${ETAPAS[indice]} h3`).focus();
}

/* ---------- finalizacao: entrega ---------- */

// Lê o valor de um campo pelo id.
function valorDoCampo(id) {
    return document.getElementById(id).value;
}

// Exige um texto com uma quantidade mínima de caracteres.
function exigirTexto(valor, minimo, mensagem) {
    if (`${valor}`.trim().length < minimo) {
        return mensagem;
    }
    return "";
}

// Valida o CEP da entrega e mostra o frete da região.
function validarCepEntrega(valor) {
    const resultado = calcularFrete(valor, calcularTotalCarrinho(), escolhasPedido.cupom);
    const aviso = document.getElementById("frete-checkout");
    if (!resultado.sucesso) {
        aviso.textContent = "";
        return resultado.mensagem;
    }
    aviso.textContent = resultado.mensagem;
    return "";
}

// Monta as regras dos campos do endereço, na ordem do formulário.
function criarRegrasEntrega() {
    return [
        { entrada: document.getElementById("checkout-cep"), validar: validarCepEntrega },
        {
            entrada: document.getElementById("checkout-rua"),
            validar: (valor) => exigirTexto(valor, 3, "Informe a rua ou avenida.")
        },
        {
            entrada: document.getElementById("checkout-numero"),
            validar: (valor) => exigirTexto(valor, 1, "Informe o número (ou S/N, se não houver).")
        },
        {
            entrada: document.getElementById("checkout-bairro"),
            validar: (valor) => exigirTexto(valor, 2, "Informe o bairro.")
        },
        {
            entrada: document.getElementById("checkout-cidade"),
            validar: (valor) => exigirTexto(valor, 2, "Informe a cidade.")
        },
        {
            entrada: document.getElementById("checkout-uf"),
            validar: (valor) => exigirTexto(valor, 2, "Escolha o estado.")
        }
    ];
}

// Lê o endereço digitado, sem espaços sobrando nas pontas.
function lerEntrega() {
    return {
        cep: somenteDigitos(valorDoCampo("checkout-cep")),
        logradouro: valorDoCampo("checkout-rua").trim(),
        numero: valorDoCampo("checkout-numero").trim(),
        complemento: valorDoCampo("checkout-complemento").trim(),
        bairro: valorDoCampo("checkout-bairro").trim(),
        cidade: valorDoCampo("checkout-cidade").trim(),
        uf: valorDoCampo("checkout-uf")
    };
}

// Valida o endereço; se estiver certo, guarda a entrega e usa o CEP no frete.
function confirmarEntrega() {
    if (!validarFormulario(finalizacao.regrasEntrega)) {
        return false;
    }
    finalizacao.entrega = lerEntrega();
    document.getElementById("carrinho-cep").value = finalizacao.entrega.cep;
    aplicarCep();
    return true;
}

/* ---------- finalizacao: pagamento ---------- */

// Informa a forma de pagamento marcada ("pix", "cartao" ou "boleto").
function formaEscolhida() {
    return document.querySelector("input[name=\"pagamento\"]:checked").value;
}

// Mostra os campos do cartão só quando o cartão está marcado.
function atualizarFormaPagamento() {
    const forma = formaEscolhida();
    document.getElementById("dados-cartao").hidden = forma !== "cartao";
    document.getElementById("info-pagamento").textContent = INFORMACOES_PAGAMENTO[forma];
}

// Monta as regras dos campos do cartão.
function criarRegrasCartao() {
    return [
        {
            entrada: document.getElementById("cartao-numero"),
            validar: (valor) => {
                if (!validarCartaoLuhn(valor)) {
                    return "Número de cartão inválido. Confira os dígitos.";
                }
                return "";
            }
        },
        {
            entrada: document.getElementById("cartao-nome"),
            validar: (valor) => exigirTexto(valor, 3, "Informe o nome como está impresso no cartão.")
        },
        {
            entrada: document.getElementById("cartao-validade"),
            validar: (valor) => {
                if (!validarValidadeCartao(valor)) {
                    return "Informe a validade no formato MM/AA, com o cartão ainda dentro do prazo.";
                }
                return "";
            }
        },
        {
            entrada: document.getElementById("cartao-cvv"),
            validar: (valor) => {
                if (!validarCvv(valor)) {
                    return "O CVV tem 3 ou 4 números.";
                }
                return "";
            }
        }
    ];
}

// Aplica as máscaras dos campos do cartão enquanto o cliente digita.
function configurarMascarasCartao() {
    const numero = document.getElementById("cartao-numero");
    const validade = document.getElementById("cartao-validade");
    const cvv = document.getElementById("cartao-cvv");
    numero.addEventListener("input", () => {
        numero.value = mascararCartao(numero.value);
    });
    validade.addEventListener("input", () => {
        validade.value = mascararValidade(validade.value);
    });
    cvv.addEventListener("input", () => {
        cvv.value = somenteDigitos(cvv.value);
    });
}

// Valida o pagamento; do cartão, guarda só os 4 últimos dígitos.
function confirmarPagamento() {
    const forma = formaEscolhida();
    if (forma !== "cartao") {
        finalizacao.pagamento = { forma: forma, finalCartao: "" };
        return true;
    }
    if (!validarFormulario(finalizacao.regrasCartao)) {
        return false;
    }
    const digitos = somenteDigitos(valorDoCampo("cartao-numero"));
    finalizacao.pagamento = { forma: "cartao", finalCartao: digitos.slice(digitos.length - 4) };
    return true;
}

// Apaga os dados do cartão dos campos depois da compra.
function limparCartao() {
    const campos = ["cartao-numero", "cartao-nome", "cartao-validade", "cartao-cvv"];
    campos.forEach((id) => {
        document.getElementById(id).value = "";
    });
}

/* ---------- finalizacao: fluxo ---------- */

// Abre a finalização, se houver cliente conectado e estoque para todos os itens.
function abrirFinalizacao(evento) {
    evento.preventDefault();
    const usuario = usuarioLogado();
    if (!usuario) {
        guardarAviso("Entre na sua conta para finalizar a compra. O seu carrinho continua guardado.");
        window.location.href = "login.html?retorno=loja.html%23carrinho";
        return;
    }
    if (usuario.perfil === "administrador") {
        mostrarToast("A conta de administrador não faz compras. Entre com uma conta de cliente.", "info");
        return;
    }
    const problema = verificarEstoque(obterItensCarrinho());
    if (problema !== "") {
        mostrarToast(problema, "erro");
        exibirCarrinho();
        return;
    }

    const campoCep = document.getElementById("checkout-cep");
    if (campoCep.value === "") {
        campoCep.value = escolhasPedido.cep;
    }
    document.getElementById("form-carrinho").hidden = true;
    document.getElementById("finalizacao").hidden = false;
    irParaEtapa(0);
}

// Fecha a finalização e volta a mostrar o carrinho.
function fecharFinalizacao() {
    document.getElementById("finalizacao").hidden = true;
    document.getElementById("form-carrinho").hidden = false;
    exibirCarrinho();
}

// Volta uma etapa; na primeira, volta para o carrinho.
function voltarEtapa() {
    if (finalizacao.etapa === 0) {
        fecharFinalizacao();
        document.querySelector("#form-carrinho button[type=\"submit\"]").focus();
        return;
    }
    irParaEtapa(finalizacao.etapa - 1);
}

// Confere o estoque de novo antes de sair do resumo.
function confirmarResumo() {
    const problema = verificarEstoque(obterItensCarrinho());
    if (problema !== "") {
        mostrarToast(problema, "erro");
        fecharFinalizacao();
        return false;
    }
    return true;
}

// Avança depois de validar a etapa atual; na última, conclui a compra.
function avancarEtapa(evento) {
    evento.preventDefault();
    switch (finalizacao.etapa) {
        case 0:
            if (confirmarResumo()) {
                irParaEtapa(1);
            }
            break;
        case 1:
            if (confirmarEntrega()) {
                irParaEtapa(2);
            }
            break;
        case 2:
            if (confirmarPagamento()) {
                irParaEtapa(3);
            }
            break;
        default:
            concluirCompra();
    }
}

// Limpa o cupom e o CEP do carrinho depois da compra.
function limparEscolhas() {
    escolhasPedido.cupom = null;
    escolhasPedido.cep = "";
    document.getElementById("carrinho-cupom").value = "";
    document.getElementById("carrinho-cep").value = "";
    escreverMensagem("mensagem-cupom", "", false);
    escreverMensagem("mensagem-frete", "", false);
}

// Monta a frase sobre o pagamento para a tela final.
function textoPagamentoConfirmado(compra) {
    const total = formatarMoeda(compra.total);
    const vencimentoBoleto = formatarData(Date.now() + DIAS_VENCIMENTO_BOLETO * UM_DIA);
    switch (compra.pagamento.forma) {
        case "cartao":
            return `Pagamento de ${total} aprovado no cartão de crédito final ${compra.pagamento.finalCartao} (simulação).`;
        case "boleto":
            return `Boleto de ${total} gerado (simulação). Pague até ${vencimentoBoleto}.`;
        default:
            return `Pagamento de ${total} via Pix aprovado (simulação).`;
    }
}

// Mostra a tela final com o número do pedido.
function mostrarConfirmacao(compra) {
    document.getElementById("finalizacao").hidden = true;
    document.getElementById("codigo-pedido").textContent = compra.id;
    document.getElementById("detalhes-pagamento").textContent = textoPagamentoConfirmado(compra);
    const confirmacao = document.getElementById("confirmacao-compra");
    confirmacao.hidden = false;
    exibirCarrinho();
    confirmacao.focus();
}

// Registra a compra, esvazia o carrinho e mostra a confirmação.
function concluirCompra() {
    const usuario = usuarioLogado();
    if (!usuario) {
        window.location.href = "login.html?retorno=loja.html%23carrinho";
        return;
    }
    let codigoCupom = "";
    if (escolhasPedido.cupom) {
        codigoCupom = escolhasPedido.cupom.codigo;
    }
    const resultado = registrarCompra({
        cliente: usuario,
        itens: obterItensCarrinho(),
        codigoCupom: codigoCupom,
        entrega: finalizacao.entrega,
        pagamento: finalizacao.pagamento
    });
    if (!resultado.sucesso) {
        mostrarToast(resultado.mensagem, "erro");
        fecharFinalizacao();
        return;
    }

    esvaziarCarrinho();
    limparEscolhas();
    limparCartao();
    mostrarToast(resultado.mensagem, "sucesso");
    // O catálogo é refeito para mostrar o estoque já com a baixa
    aplicarFiltros();
    mostrarConfirmacao(resultado.compra);
}

// Esconde a tela final e volta para o catálogo.
function voltarAoCatalogo() {
    document.getElementById("confirmacao-compra").hidden = true;
    document.getElementById("form-carrinho").hidden = false;
    document.getElementById("filtro-busca").focus();
}

// Chamada quando um produto é adicionado pelo catálogo.
function carrinhoMudou() {
    if (!document.getElementById("finalizacao").hidden) {
        mostrarToast("O carrinho mudou. Confira os itens antes de finalizar a compra.", "info");
        fecharFinalizacao();
        return;
    }
    document.getElementById("confirmacao-compra").hidden = true;
    document.getElementById("form-carrinho").hidden = false;
    exibirCarrinho();
}

// Liga o carrinho, as etapas da finalização e os botões da tela final.
function configurarFinalizacao() {
    finalizacao.regrasEntrega = criarRegrasEntrega();
    finalizacao.regrasCartao = criarRegrasCartao();
    configurarMascarasCartao();
    corrigirAoDigitar(finalizacao.regrasEntrega);
    corrigirAoDigitar(finalizacao.regrasCartao);

    document.querySelectorAll("input[name=\"pagamento\"]").forEach((opcao) => {
        opcao.addEventListener("change", atualizarFormaPagamento);
    });
    atualizarFormaPagamento();

    document.querySelectorAll("#form-checkout .botao-voltar").forEach((botao) => {
        botao.addEventListener("click", voltarEtapa);
    });
    document.getElementById("form-carrinho").addEventListener("submit", abrirFinalizacao);
    document.getElementById("form-checkout").addEventListener("submit", avancarEtapa);
    document.getElementById("continuar-comprando").addEventListener("click", voltarAoCatalogo);
    document.getElementById("ver-pedidos").addEventListener("click", () => {
        window.location.href = "perfil.html";
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
