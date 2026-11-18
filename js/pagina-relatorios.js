/* pagina-relatorios.js
   Área administrativa: só abre para o perfil administrador. A verificação
   roda antes de qualquer dado ser montado; o conteúdo começa com hidden.
   Monta os indicadores, os relatórios de clientes e de compras, as
   mensagens de contato, a impressão e a exportação CSV. */

import { exigirLogin, usuarioLogado } from "./auth.js";
import { iniciarPagina, mostrarToast, abrirDialogo, fecharDialogo } from "./ui.js";
import {
    listarSomenteClientes,
    alterarSituacaoCliente,
    listarMensagens,
    marcarMensagemLida
} from "./clientes.js";
import {
    STATUS_COMPRA,
    listarCompras,
    alterarStatusCompra,
    criarDetalhesCompra,
    resumirProdutos,
    nomeFormaPagamento
} from "./compras.js";
import { textoUnidades } from "./produtos.js";
import {
    filtrarClientes,
    colunaBuscada,
    ordenarPorCampo,
    paginar,
    criarCelulaDestacada,
    filtrarCompras,
    somarCompras,
    contarUnidades,
    calcularIndicadores,
    gerarCsvCompras
} from "./relatorios.js";
import {
    criarElemento,
    adicionarDefinicao,
    formatarMoeda,
    formatarData,
    formatarHora,
    formatarDataHora,
    mascararCpf,
    formatarTelefone,
    criarDebounce
} from "./utils.js";

const POR_PAGINA = 10;
const ESPERA_BUSCA = 300;

// Nomes das situações do cliente para exibição.
const NOMES_SITUACAO = {
    ativo: "Ativo",
    bloqueado: "Bloqueado"
};

// Ordenação e página atual do relatório de clientes.
const estadoClientes = {
    campo: "id",
    crescente: true,
    pagina: 1
};

// Último resultado da busca de compras (usado na exportação CSV).
const estadoCompras = {
    resultado: []
};

/* ---------- apoio ---------- */

// Escreve "1 cliente" ou "N clientes", no singular ou no plural.
function textoQuantidade(quantidade, singular, plural) {
    if (quantidade === 1) {
        return `1 ${singular}`;
    }
    return `${quantidade} ${plural}`;
}

// Cria uma linha com uma única célula de aviso ocupando todas as colunas.
function criarLinhaAviso(texto, colunas) {
    const linha = document.createElement("tr");
    const celula = criarElemento("td", "carrinho-vazio", texto);
    celula.setAttribute("colspan", `${colunas}`);
    linha.append(celula);
    return linha;
}

// Cria uma célula com um botão de ação.
function criarCelulaBotao(texto, rotulo, aoClicar) {
    const celula = criarElemento("td", "coluna-acoes", "");
    const botao = criarElemento("button", "botao", texto);
    botao.type = "button";
    botao.classList.add("botao-secundario");
    botao.setAttribute("aria-label", rotulo);
    botao.addEventListener("click", aoClicar);
    celula.append(botao);
    return celula;
}

/* ---------- cabecalho, rodape e impressao ---------- */

// Escreve a data e a hora de emissão e o administrador responsável.
function atualizarEmissao(administrador) {
    const agora = Date.now();
    const quando = `${formatarData(agora)} às ${formatarHora(agora)}`;
    document.getElementById("emissao-relatorio").textContent =
        `Relatório emitido em: ${quando} por ${administrador.nome}`;
    document.getElementById("rodape-emissao").textContent =
        `Emitido em ${quando}. Administrador(a) responsável: ${administrador.nome}.`;
}

// Atualiza a emissão e abre a janela de impressão do navegador.
function imprimirRelatorio() {
    const administrador = usuarioLogado();
    if (!administrador) {
        window.location.reload();
        return;
    }
    atualizarEmissao(administrador);
    window.print();
}

/* ---------- indicadores ---------- */

// Mostra a lista dos 5 produtos mais vendidos.
function exibirMaisVendidos(maisVendidos) {
    const lista = document.getElementById("mais-vendidos");
    lista.textContent = "";
    if (maisVendidos.length === 0) {
        lista.append(criarElemento("li", "", "Nenhuma venda registrada ainda."));
        return;
    }
    maisVendidos.forEach((produto) => {
        lista.append(criarElemento("li", "", `${produto.nome}: ${textoUnidades(produto.quantidade)}`));
    });
}

// Desenha o gráfico de barras; a largura de cada barra é proporcional à maior venda.
function exibirGraficoVendas(vendasPorDia) {
    const grafico = document.getElementById("grafico-vendas");
    let maior = 0;
    vendasPorDia.forEach((dia) => {
        if (dia.valor > maior) {
            maior = dia.valor;
        }
    });

    grafico.textContent = "";
    vendasPorDia.forEach((dia) => {
        const item = criarElemento("li", "linha-grafico", "");
        const trilho = criarElemento("div", "trilho-barra", "");
        const barra = criarElemento("div", "barra-grafico", "");
        let largura = 0;
        if (maior > 0) {
            largura = parseInt(dia.valor / maior * 100, 10);
        }
        barra.style.width = `${largura}%`;
        trilho.append(barra);
        item.append(
            criarElemento("span", "rotulo-barra", dia.data.slice(0, 5)),
            trilho,
            criarElemento("span", "valor-barra", formatarMoeda(dia.valor))
        );
        grafico.append(item);
    });
}

// Calcula e mostra todos os indicadores do painel.
function exibirIndicadores() {
    const indicadores = calcularIndicadores(listarSomenteClientes(), listarCompras());
    document.getElementById("indicador-clientes").textContent = `${indicadores.totalClientes}`;
    document.getElementById("indicador-compras").textContent = `${indicadores.totalCompras}`;
    document.getElementById("indicador-faturamento").textContent = formatarMoeda(indicadores.faturamento);
    document.getElementById("indicador-ticket").textContent = formatarMoeda(indicadores.ticketMedio);
    exibirMaisVendidos(indicadores.maisVendidos);
    exibirGraficoVendas(indicadores.vendasPorDia);
}

/* ---------- relatorio de clientes ---------- */

// Lê o termo e o critério da busca de clientes.
function lerBuscaClientes() {
    return {
        termo: document.getElementById("busca-cliente-termo").value,
        criterio: document.getElementById("busca-cliente-criterio").value
    };
}

// Devolve o termo para destacar na coluna, ou "" se a coluna não foi buscada.
function termoDaColuna(busca, campo) {
    if (colunaBuscada(busca.criterio, campo)) {
        return busca.termo;
    }
    return "";
}

// Bloqueia ou desbloqueia o cliente e mantém o foco no botão da linha.
function trocarSituacao(cliente) {
    let novaSituacao = "bloqueado";
    if (cliente.situacao === "bloqueado") {
        novaSituacao = "ativo";
    }
    const resultado = alterarSituacaoCliente(cliente.id, novaSituacao);
    if (!resultado.sucesso) {
        mostrarToast(resultado.mensagem, "erro");
        return;
    }
    mostrarToast(resultado.mensagem, "sucesso");
    exibirClientes();
    const botao = document.getElementById(`situacao-${cliente.id}`);
    if (botao) {
        botao.focus();
    }
}

// Cria uma linha do relatório de clientes, destacando o termo buscado.
function criarLinhaCliente(cliente, busca) {
    const linha = document.createElement("tr");
    let textoBotao = "Bloquear";
    if (cliente.situacao === "bloqueado") {
        textoBotao = "Desbloquear";
        linha.classList.add("cliente-bloqueado");
    }
    const celulaAcao = criarCelulaBotao(textoBotao, `${textoBotao} ${cliente.nome}`, () => {
        trocarSituacao(cliente);
    });
    celulaAcao.querySelector("button").id = `situacao-${cliente.id}`;

    linha.append(
        criarCelulaDestacada(cliente.id, termoDaColuna(busca, "id"), false),
        criarCelulaDestacada(cliente.nome, termoDaColuna(busca, "nome"), false),
        criarCelulaDestacada(cliente.email, termoDaColuna(busca, "email"), false),
        criarCelulaDestacada(mascararCpf(cliente.cpf), termoDaColuna(busca, "cpf"), true),
        criarElemento("td", "", formatarTelefone(cliente.telefone)),
        criarElemento("td", "", NOMES_SITUACAO[cliente.situacao]),
        celulaAcao
    );
    return linha;
}

// Cria um botão da paginação.
function criarBotaoPagina(texto, desabilitado, novaPagina) {
    const botao = criarElemento("button", "botao", texto);
    botao.type = "button";
    botao.classList.add("botao-secundario");
    botao.disabled = desabilitado;
    botao.addEventListener("click", () => {
        estadoClientes.pagina = novaPagina;
        exibirClientes();
    });
    return botao;
}

// Mostra os botões "Anterior" e "Próxima" e a página atual.
function exibirPaginacao(pagina) {
    const paginacao = document.getElementById("paginacao-clientes");
    paginacao.textContent = "";
    paginacao.append(
        criarBotaoPagina("Anterior", pagina.pagina <= 1, pagina.pagina - 1),
        criarElemento("span", "pagina-atual", `Página ${pagina.pagina} de ${pagina.totalPaginas}`),
        criarBotaoPagina("Próxima", pagina.pagina >= pagina.totalPaginas, pagina.pagina + 1)
    );
}

// Filtra, ordena e pagina os clientes e redesenha a tabela.
function exibirClientes() {
    const busca = lerBuscaClientes();
    const todos = listarSomenteClientes();
    const encontrados = filtrarClientes(todos, busca.termo, busca.criterio);
    const ordenados = ordenarPorCampo(encontrados, estadoClientes.campo, estadoClientes.crescente);
    const pagina = paginar(ordenados, estadoClientes.pagina, POR_PAGINA);
    estadoClientes.pagina = pagina.pagina;

    const corpoTabela = document.getElementById("lista-clientes");
    corpoTabela.textContent = "";
    if (pagina.itens.length === 0) {
        corpoTabela.append(criarLinhaAviso("Nenhum cliente encontrado.", 7));
    }
    pagina.itens.forEach((cliente) => {
        corpoTabela.append(criarLinhaCliente(cliente, busca));
    });

    document.getElementById("total-clientes").textContent =
        `${textoQuantidade(encontrados.length, "registro encontrado", "registros encontrados")} ` +
        `(total de ${textoQuantidade(todos.length, "cliente cadastrado", "clientes cadastrados")}).`;
    exibirPaginacao(pagina);
}

// Ordena pela coluna clicada; um novo clique na mesma coluna inverte a ordem.
function ordenarClientes(evento) {
    const campo = evento.currentTarget.value;
    if (estadoClientes.campo === campo) {
        estadoClientes.crescente = !estadoClientes.crescente;
    } else {
        estadoClientes.campo = campo;
        estadoClientes.crescente = true;
    }
    estadoClientes.pagina = 1;

    // Marca no cabeçalho a coluna e o sentido da ordenação (lido pelo leitor de tela)
    document.querySelectorAll("#relatorio-clientes th[aria-sort]").forEach((cabecalho) => {
        const campoColuna = cabecalho.children[0].value;
        let ordem = "none";
        if (campoColuna === estadoClientes.campo && estadoClientes.crescente) {
            ordem = "ascending";
        } else if (campoColuna === estadoClientes.campo) {
            ordem = "descending";
        }
        cabecalho.setAttribute("aria-sort", ordem);
    });
    exibirClientes();
}

// Liga a busca ao vivo e a ordenação pelos cabeçalhos.
function configurarClientes() {
    const novaBusca = () => {
        estadoClientes.pagina = 1;
        exibirClientes();
    };
    document.getElementById("busca-cliente-termo").addEventListener("input", criarDebounce(novaBusca, ESPERA_BUSCA));
    document.getElementById("busca-cliente-criterio").addEventListener("change", novaBusca);
    document.getElementById("form-busca-clientes").addEventListener("submit", (evento) => {
        evento.preventDefault();
        novaBusca();
    });
    document.querySelectorAll(".botao-ordenar").forEach((botao) => {
        botao.addEventListener("click", ordenarClientes);
    });
}

/* ---------- relatorio de compras ---------- */

// Lê os filtros da busca de compras.
function lerFiltrosCompras() {
    return {
        id: document.getElementById("busca-compra-id").value,
        cliente: document.getElementById("busca-compra-cliente").value,
        produto: document.getElementById("busca-compra-produto").value,
        dataInicio: document.getElementById("busca-compra-data-inicio").value,
        dataFim: document.getElementById("busca-compra-data-fim").value,
        valorMinimo: parseFloat(document.getElementById("busca-compra-valor-min").value),
        valorMaximo: parseFloat(document.getElementById("busca-compra-valor-max").value)
    };
}

// Confere se os intervalos de data e de valor fazem sentido.
function validarIntervalos(filtros) {
    if (filtros.dataInicio !== "" && filtros.dataFim !== "" && filtros.dataInicio > filtros.dataFim) {
        return "A data inicial não pode ser depois da data final.";
    }
    if (!isNaN(filtros.valorMinimo) && !isNaN(filtros.valorMaximo) && filtros.valorMinimo > filtros.valorMaximo) {
        return "O valor mínimo não pode ser maior que o valor máximo.";
    }
    return "";
}

// Cria uma linha do relatório de compras.
function criarLinhaCompra(compra) {
    const linha = document.createElement("tr");
    if (compra.status === "Cancelado") {
        linha.classList.add("compra-cancelada");
    }
    linha.append(
        criarElemento("td", "", compra.id),
        criarElemento("td", "", compra.nomeCliente),
        criarElemento("td", "", resumirProdutos(compra)),
        criarElemento("td", "", `${contarUnidades(compra)}`),
        criarElemento("td", "", formatarMoeda(compra.total)),
        criarElemento("td", "", formatarDataHora(compra.dataHora)),
        criarElemento("td", "", compra.status),
        criarCelulaBotao("Detalhes", `Ver detalhes da compra ${compra.id}`, () => {
            abrirDetalhesCompra(compra.id);
        })
    );
    return linha;
}

// Aplica os filtros combinados e redesenha a tabela e o somatório.
function exibirCompras() {
    const filtros = lerFiltrosCompras();
    const aviso = document.getElementById("total-compras");
    const erro = validarIntervalos(filtros);
    if (erro !== "") {
        aviso.textContent = erro;
        return;
    }

    const resultado = filtrarCompras(listarCompras(), filtros);
    estadoCompras.resultado = resultado;
    const corpoTabela = document.getElementById("lista-compras");
    corpoTabela.textContent = "";
    if (resultado.length === 0) {
        corpoTabela.append(criarLinhaAviso("Nenhuma compra encontrada.", 8));
    }
    resultado.forEach((compra) => {
        corpoTabela.append(criarLinhaCompra(compra));
    });

    const soma = formatarMoeda(somarCompras(resultado));
    document.getElementById("total-resultado").textContent = soma;
    aviso.textContent = `${textoQuantidade(resultado.length, "compra encontrada", "compras encontradas")}. Total sem as canceladas: ${soma}.`;
}

// Apaga todos os filtros e mostra todas as compras.
function limparFiltrosCompras() {
    const campos = [
        "busca-compra-id",
        "busca-compra-cliente",
        "busca-compra-produto",
        "busca-compra-data-inicio",
        "busca-compra-data-fim",
        "busca-compra-valor-min",
        "busca-compra-valor-max"
    ];
    campos.forEach((id) => {
        document.getElementById(id).value = "";
    });
    exibirCompras();
    document.getElementById("busca-compra-id").focus();
}

// Gera o arquivo CSV do resultado filtrado no momento do clique no link.
function exportarCsv(evento) {
    if (estadoCompras.resultado.length === 0) {
        evento.preventDefault();
        mostrarToast("Não há compras no resultado para exportar.", "info");
        return;
    }
    const conteudo = gerarCsvCompras(estadoCompras.resultado, nomeFormaPagamento);
    const arquivo = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
    evento.currentTarget.href = URL.createObjectURL(arquivo);
    mostrarToast(`CSV com ${textoQuantidade(estadoCompras.resultado.length, "compra", "compras")} gerado.`, "sucesso");
}

// Liga os filtros (ao vivo), o botão de limpar e a exportação.
function configurarCompras() {
    const buscaComEspera = criarDebounce(exibirCompras, ESPERA_BUSCA);
    document.querySelectorAll("#form-busca-compras input").forEach((campo) => {
        campo.addEventListener("input", buscaComEspera);
    });
    document.getElementById("form-busca-compras").addEventListener("submit", (evento) => {
        evento.preventDefault();
        exibirCompras();
    });
    document.getElementById("limpar-filtros-compras").addEventListener("click", limparFiltrosCompras);
    document.getElementById("exportar-csv").addEventListener("click", exportarCsv);
}

/* ---------- detalhes e status da compra ---------- */

// Salva o novo status e atualiza a tabela e os indicadores.
function salvarStatus(idCompra, novoStatus) {
    const resultado = alterarStatusCompra(idCompra, novoStatus);
    if (!resultado.sucesso) {
        mostrarToast(resultado.mensagem, "erro");
        return;
    }
    mostrarToast(resultado.mensagem, "sucesso");
    fecharDialogo();
    exibirCompras();
    exibirIndicadores();
}

// Cria o campo para escolher o novo status e o botão de salvar.
function criarAlteracaoStatus(compra) {
    const area = criarElemento("div", "", "");
    const campo = criarElemento("div", "campo", "");
    const rotulo = criarElemento("label", "", "Alterar status");
    rotulo.setAttribute("for", "novo-status");
    const seletor = document.createElement("select");
    seletor.id = "novo-status";
    STATUS_COMPRA.forEach((status) => {
        const opcao = criarElemento("option", "", status);
        opcao.value = status;
        seletor.append(opcao);
    });
    seletor.value = compra.status;
    const ajuda = criarElemento("small", "ajuda", "Cancelar devolve os itens ao estoque e não pode ser desfeito.");
    campo.append(rotulo, seletor, ajuda);

    const acoes = criarElemento("div", "acoes-dialogo", "");
    const botao = criarElemento("button", "botao", "Salvar status");
    botao.type = "button";
    botao.addEventListener("click", () => {
        salvarStatus(compra.id, seletor.value);
    });
    acoes.append(botao);
    area.append(campo, acoes);
    return area;
}

// Abre o diálogo com os dados da compra e a alteração de status.
function abrirDetalhesCompra(idCompra) {
    const compra = listarCompras().find((item) => item.id === idCompra);
    if (!compra) {
        mostrarToast("Compra não encontrada.", "erro");
        return;
    }
    const conteudo = criarElemento("div", "", "");
    const dados = criarElemento("dl", "dados-compra", "");
    adicionarDefinicao(dados, "Cliente", `${compra.nomeCliente} (${compra.idCliente})`);
    adicionarDefinicao(dados, "E-mail", compra.emailCliente);
    adicionarDefinicao(dados, "Data", formatarDataHora(compra.dataHora));
    adicionarDefinicao(dados, "Status", compra.status);
    conteudo.append(dados, criarDetalhesCompra(compra));

    if (compra.status === "Cancelado") {
        conteudo.append(criarElemento("p", "aviso-formulario", "Compra cancelada: os itens já voltaram para o estoque."));
    } else {
        conteudo.append(criarAlteracaoStatus(compra));
    }
    abrirDialogo(`Compra ${compra.id}`, conteudo);
}

/* ---------- mensagens de contato ---------- */

// Marca a mensagem como lida e redesenha a lista.
function lerMensagem(mensagem) {
    if (!marcarMensagemLida(mensagem.id)) {
        mostrarToast("Não foi possível marcar a mensagem como lida.", "erro");
        return;
    }
    mostrarToast(`Mensagem de ${mensagem.nome} marcada como lida.`, "sucesso");
    exibirMensagens();
}

// Cria uma linha da tabela de mensagens.
function criarLinhaMensagem(mensagem) {
    const linha = document.createElement("tr");
    let situacao = "Lida";
    let celulaAcao = criarElemento("td", "coluna-acoes", "—");
    if (!mensagem.lida) {
        situacao = "Nova";
        linha.classList.add("mensagem-nova");
        celulaAcao = criarCelulaBotao("Marcar como lida", `Marcar como lida a mensagem de ${mensagem.nome}`, () => {
            lerMensagem(mensagem);
        });
    }
    linha.append(
        criarElemento("td", "", formatarDataHora(mensagem.dataHora)),
        criarElemento("td", "", mensagem.nome),
        criarElemento("td", "", mensagem.email),
        criarElemento("td", "", mensagem.mensagem),
        criarElemento("td", "", situacao),
        celulaAcao
    );
    return linha;
}

// Lista as mensagens de contato, com o total de não lidas.
function exibirMensagens() {
    const mensagens = listarMensagens();
    const corpoTabela = document.getElementById("lista-mensagens");
    let naoLidas = 0;
    corpoTabela.textContent = "";
    if (mensagens.length === 0) {
        corpoTabela.append(criarLinhaAviso("Nenhuma mensagem recebida.", 6));
    }
    mensagens.forEach((mensagem) => {
        if (!mensagem.lida) {
            naoLidas++;
        }
        corpoTabela.append(criarLinhaMensagem(mensagem));
    });
    document.getElementById("total-mensagens").textContent =
        `${textoQuantidade(mensagens.length, "mensagem", "mensagens")}, ` +
        `${textoQuantidade(naoLidas, "não lida", "não lidas")}.`;
}

/* ---------- inicio ---------- */

document.addEventListener("DOMContentLoaded", () => {
    const usuario = exigirLogin("administrador", "Acesso restrito: entre com uma conta de administrador para ver os relatórios.");
    if (!usuario) {
        return;
    }
    iniciarPagina();
    atualizarEmissao(usuario);
    document.getElementById("imprimir-relatorio").addEventListener("click", imprimirRelatorio);
    configurarClientes();
    configurarCompras();
    exibirIndicadores();
    exibirClientes();
    exibirCompras();
    exibirMensagens();
    document.querySelector("main").hidden = false;
});
