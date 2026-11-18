/* relatorios.js
   Buscas, ordenação, paginação, indicadores e exportação da área administrativa.
   As funções recebem as listas prontas e devolvem novas listas ou valores,
   sem mexer no localStorage. */

import {
    normalizarTexto,
    somenteDigitos,
    criarElemento,
    arredondarMoeda,
    formatarData,
    formatarDataHora,
    mascararCpf,
    formatarTelefone
} from "./utils.js";

const UM_DIA = 24 * 60 * 60 * 1000;

/* ---------- destaque do termo buscado ---------- */

// Procura o termo dentro do texto e devolve a posição inicial (-1 se não achar).
function procurarPosicao(texto, termo) {
    if (termo === "") {
        return -1;
    }
    for (let i = 0; i + termo.length <= texto.length; i++) {
        if (texto.slice(i, i + termo.length) === termo) {
            return i;
        }
    }
    return -1;
}

// Localiza o termo comparando só os números (para o CPF com ou sem máscara).
function localizarNumeros(texto, termo) {
    const numerosTermo = somenteDigitos(termo);
    const posicoes = [];
    let numeros = "";
    for (let i = 0; i < texto.length; i++) {
        if (somenteDigitos(texto[i]) !== "") {
            numeros += texto[i];
            posicoes.push(i);
        }
    }
    const inicio = procurarPosicao(numeros, numerosTermo);
    if (inicio === -1) {
        return null;
    }
    return { inicio: posicoes[inicio], fim: posicoes[inicio + numerosTermo.length - 1] + 1 };
}

/**
 * Localiza o termo no texto, sem diferenciar maiúsculas e acentos.
 * @param {string} texto - texto exibido
 * @param {string} termo - termo buscado
 * @param {boolean} compararNumeros - true para comparar só os números (CPF)
 * @returns {Object|null} { inicio, fim } no texto exibido, ou null
 */
export function localizarTermo(texto, termo, compararNumeros) {
    if (compararNumeros) {
        return localizarNumeros(texto, termo);
    }
    const termoNormalizado = normalizarTexto(termo);
    const inicio = procurarPosicao(normalizarTexto(texto), termoNormalizado);
    if (inicio === -1) {
        return null;
    }
    // Os textos salvos não têm espaços nas pontas e a normalização só tira
    // os acentos, então a posição encontrada vale também para o texto exibido
    return { inicio: inicio, fim: inicio + termoNormalizado.length };
}

/**
 * Cria uma célula de tabela com o termo encontrado dentro de <mark>.
 * @param {string} texto - texto da célula
 * @param {string} termo - termo buscado ("" para não destacar)
 * @param {boolean} compararNumeros - true para comparar só os números
 * @returns {HTMLElement} o td montado
 */
export function criarCelulaDestacada(texto, termo, compararNumeros) {
    const celula = document.createElement("td");
    let posicao = null;
    if (`${termo}`.trim() !== "") {
        posicao = localizarTermo(texto, termo, compararNumeros);
    }
    if (!posicao) {
        celula.textContent = texto;
        return celula;
    }
    const destaque = criarElemento("mark", "", texto.slice(posicao.inicio, posicao.fim));
    celula.append(texto.slice(0, posicao.inicio), destaque, texto.slice(posicao.fim));
    return celula;
}

/* ---------- clientes ---------- */

// Monta os textos de um cliente do jeito que aparecem na tabela.
function textosDoCliente(cliente) {
    return {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        cpf: mascararCpf(cliente.cpf),
        telefone: formatarTelefone(cliente.telefone),
        situacao: cliente.situacao
    };
}

// Verifica se um campo do cliente combina com o termo.
function campoCombina(textos, campo, termo) {
    if (campo === "cpf") {
        return somenteDigitos(termo) !== "" && localizarTermo(textos.cpf, termo, true) !== null;
    }
    return localizarTermo(textos[campo], termo, false) !== null;
}

/**
 * Filtra os clientes pelo termo (busca parcial, sem acentos e sem maiúsculas).
 * @param {Array} lista - clientes
 * @param {string} termo - termo digitado
 * @param {string} criterio - "todos", "nome", "id", "email" ou "cpf"
 * @returns {Array} clientes encontrados
 */
export function filtrarClientes(lista, termo, criterio) {
    if (`${termo}`.trim() === "") {
        return lista.slice();
    }
    let campos = [criterio];
    if (criterio === "todos") {
        campos = ["nome", "id", "email", "cpf"];
    }
    return lista.filter((cliente) => {
        const textos = textosDoCliente(cliente);
        const encontrado = campos.find((campo) => campoCombina(textos, campo, termo));
        return encontrado !== undefined;
    });
}

/**
 * Informa se o termo deve ser destacado em uma coluna, conforme o critério.
 * @param {string} criterio - critério escolhido
 * @param {string} campo - coluna da tabela
 * @returns {boolean} true se a coluna participa da busca
 */
export function colunaBuscada(criterio, campo) {
    if (criterio === "todos") {
        return campo === "nome" || campo === "id" || campo === "email" || campo === "cpf";
    }
    return criterio === campo;
}

/**
 * Ordena uma cópia da lista pelo campo, sem diferenciar acentos e maiúsculas.
 * @param {Array} lista - registros
 * @param {string} campo - nome do campo
 * @param {boolean} crescente - true para A-Z, false para Z-A
 * @returns {Array} nova lista ordenada
 */
export function ordenarPorCampo(lista, campo, crescente) {
    const copia = lista.slice();
    copia.sort((registroA, registroB) => {
        const valorA = normalizarTexto(registroA[campo]);
        const valorB = normalizarTexto(registroB[campo]);
        let resultado = 0;
        if (valorA < valorB) {
            resultado = -1;
        } else if (valorA > valorB) {
            resultado = 1;
        }
        if (!crescente) {
            resultado = -resultado;
        }
        return resultado;
    });
    return copia;
}

/**
 * Separa uma página da lista.
 * @param {Array} lista - registros
 * @param {number} pagina - página desejada (começa em 1)
 * @param {number} tamanho - registros por página
 * @returns {Object} { itens, pagina, totalPaginas }
 */
export function paginar(lista, pagina, tamanho) {
    let totalPaginas = parseInt((lista.length + tamanho - 1) / tamanho, 10);
    if (totalPaginas < 1) {
        totalPaginas = 1;
    }
    let paginaValida = pagina;
    if (paginaValida > totalPaginas) {
        paginaValida = totalPaginas;
    }
    if (paginaValida < 1) {
        paginaValida = 1;
    }
    const inicio = (paginaValida - 1) * tamanho;
    return { itens: lista.slice(inicio, inicio + tamanho), pagina: paginaValida, totalPaginas: totalPaginas };
}

/* ---------- compras ---------- */

// Verifica se o texto contém o termo, sem acentos e sem maiúsculas.
function contemTermo(texto, termo) {
    return normalizarTexto(texto).includes(normalizarTexto(termo));
}

// Verifica se a compra atende aos filtros de texto (ID, cliente e produto).
function atendeTextos(compra, filtros) {
    if (filtros.id !== "" && !contemTermo(compra.id, filtros.id)) {
        return false;
    }
    if (filtros.cliente !== "") {
        const textoCliente = `${compra.idCliente} ${compra.nomeCliente} ${compra.emailCliente}`;
        if (!contemTermo(textoCliente, filtros.cliente)) {
            return false;
        }
    }
    if (filtros.produto !== "") {
        const item = compra.itens.find((itemCompra) => contemTermo(itemCompra.nome, filtros.produto));
        if (!item) {
            return false;
        }
    }
    return true;
}

// Verifica se a compra está dentro do período e da faixa de valores.
function atendeFaixas(compra, filtros) {
    const momento = Date.parse(compra.dataHora);
    if (filtros.dataInicio !== "" && momento < Date.parse(`${filtros.dataInicio}T00:00:00`)) {
        return false;
    }
    if (filtros.dataFim !== "" && momento > Date.parse(`${filtros.dataFim}T23:59:59`)) {
        return false;
    }
    if (!isNaN(filtros.valorMinimo) && compra.total < filtros.valorMinimo) {
        return false;
    }
    if (!isNaN(filtros.valorMaximo) && compra.total > filtros.valorMaximo) {
        return false;
    }
    return true;
}

/**
 * Filtra as compras com todos os filtros combinados.
 * @param {Array} lista - compras
 * @param {Object} filtros - { id, cliente, produto, dataInicio, dataFim, valorMinimo, valorMaximo }
 * @returns {Array} compras encontradas, da mais recente para a mais antiga
 */
export function filtrarCompras(lista, filtros) {
    const resultado = lista.filter((compra) => atendeTextos(compra, filtros) && atendeFaixas(compra, filtros));
    resultado.sort((compraA, compraB) => Date.parse(compraB.dataHora) - Date.parse(compraA.dataHora));
    return resultado;
}

/**
 * Soma o total das compras que não foram canceladas.
 * @param {Array} lista - compras
 * @returns {number} soma em reais
 */
export function somarCompras(lista) {
    let soma = 0;
    lista.forEach((compra) => {
        if (compra.status !== "Cancelado") {
            soma += compra.total;
        }
    });
    return arredondarMoeda(soma);
}

/**
 * Soma as unidades de todos os itens de uma compra.
 * @param {Object} compra - compra registrada
 * @returns {number} total de unidades
 */
export function contarUnidades(compra) {
    let unidades = 0;
    compra.itens.forEach((item) => {
        unidades += item.quantidade;
    });
    return unidades;
}

/* ---------- indicadores ---------- */

// Soma as unidades vendidas de cada produto e devolve os 5 mais vendidos.
function calcularMaisVendidos(compras) {
    const vendidos = {};
    compras.forEach((compra) => {
        compra.itens.forEach((item) => {
            if (!vendidos[item.idProduto]) {
                vendidos[item.idProduto] = { nome: item.nome, quantidade: 0 };
            }
            vendidos[item.idProduto].quantidade += item.quantidade;
        });
    });
    const lista = [];
    for (const idProduto in vendidos) {
        lista.push(vendidos[idProduto]);
    }
    lista.sort((produtoA, produtoB) => produtoB.quantidade - produtoA.quantidade);
    return lista.slice(0, 5);
}

// Soma as vendas de cada um dos últimos 7 dias (do mais antigo para hoje).
function calcularVendasPorDia(compras) {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
        dias.push({ data: formatarData(Date.now() - i * UM_DIA), valor: 0 });
    }
    compras.forEach((compra) => {
        const dia = dias.find((item) => item.data === formatarData(compra.dataHora));
        if (dia) {
            dia.valor = arredondarMoeda(dia.valor + compra.total);
        }
    });
    return dias;
}

/**
 * Calcula os indicadores do painel (as compras canceladas ficam de fora
 * do faturamento, do ticket médio, dos mais vendidos e do gráfico).
 * @param {Array} clientes - clientes (sem o administrador)
 * @param {Array} compras - todas as compras
 * @returns {Object} { totalClientes, totalCompras, faturamento, ticketMedio, maisVendidos, vendasPorDia }
 */
export function calcularIndicadores(clientes, compras) {
    const validas = compras.filter((compra) => compra.status !== "Cancelado");
    const faturamento = somarCompras(validas);
    let ticketMedio = 0;
    if (validas.length > 0) {
        ticketMedio = arredondarMoeda(faturamento / validas.length);
    }
    return {
        totalClientes: clientes.length,
        totalCompras: compras.length,
        faturamento: faturamento,
        ticketMedio: ticketMedio,
        maisVendidos: calcularMaisVendidos(validas),
        vendasPorDia: calcularVendasPorDia(validas)
    };
}

/* ---------- exportacao CSV ---------- */

// Coloca o campo entre aspas e dobra as aspas que existirem dentro dele.
function escaparCampoCsv(valor) {
    const texto = `${valor}`;
    let resultado = "\"";
    for (let i = 0; i < texto.length; i++) {
        if (texto[i] === "\"") {
            resultado += "\"\"";
        } else {
            resultado += texto[i];
        }
    }
    return resultado + "\"";
}

// Escreve o valor com 2 casas e vírgula decimal (ex.: 24,90), como o Excel brasileiro espera.
function numeroCsv(valor) {
    const texto = valor.toFixed(2);
    let resultado = "";
    for (let i = 0; i < texto.length; i++) {
        if (texto[i] === ".") {
            resultado += ",";
        } else {
            resultado += texto[i];
        }
    }
    return resultado;
}

// Junta os campos de uma linha separados por ponto e vírgula.
function montarLinhaCsv(campos) {
    let linha = "";
    campos.forEach((campo, posicao) => {
        if (posicao > 0) {
            linha += ";";
        }
        linha += escaparCampoCsv(campo);
    });
    return linha + "\r\n";
}

/**
 * Gera o conteúdo CSV (com BOM do UTF-8) das compras informadas.
 * @param {Array} compras - compras do resultado filtrado
 * @param {Function} nomePagamento - função que devolve o nome da forma de pagamento
 * @returns {string} texto do arquivo CSV
 */
export function gerarCsvCompras(compras, nomePagamento) {
    let csv = "\uFEFF" + montarLinhaCsv([
        "ID", "Data", "Cliente", "E-mail", "Produtos", "Unidades",
        "Subtotal", "Desconto", "Frete", "Total", "Pagamento", "Status"
    ]);
    compras.forEach((compra) => {
        let produtos = "";
        compra.itens.forEach((item, posicao) => {
            if (posicao > 0) {
                produtos += ", ";
            }
            produtos += `${item.quantidade}x ${item.nome}`;
        });
        csv += montarLinhaCsv([
            compra.id,
            formatarDataHora(compra.dataHora),
            compra.nomeCliente,
            compra.emailCliente,
            produtos,
            contarUnidades(compra),
            numeroCsv(compra.subtotal),
            numeroCsv(compra.desconto),
            numeroCsv(compra.frete),
            numeroCsv(compra.total),
            nomePagamento(compra.pagamento),
            compra.status
        ]);
    });
    return csv;
}
