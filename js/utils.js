/* utils.js
   Funções de apoio usadas em várias páginas: validações, máscaras,
   formatação de moeda e data, normalização de texto e criação de elementos. */

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatadorData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const formatadorDataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

/* ---------- textos ---------- */

/**
 * Remove tudo o que não for número de um texto.
 * @param {string} texto - texto digitado
 * @returns {string} somente os dígitos
 */
export function somenteDigitos(texto) {
    return `${texto}`.replace(/\D/g, "");
}

/**
 * Deixa o texto em minúsculas, sem acentos e sem espaços nas pontas.
 * @param {string} texto - texto original
 * @returns {string} texto normalizado para comparações
 */
export function normalizarTexto(texto) {
    return `${texto}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Troca os caracteres especiais do HTML pelas entidades correspondentes.
 * @param {string} texto - texto original
 * @returns {string} texto seguro para exibir como HTML
 */
export function escaparHtml(texto) {
    const original = `${texto}`;
    let resultado = "";
    for (let i = 0; i < original.length; i++) {
        switch (original[i]) {
            case "&":
                resultado += "&amp;";
                break;
            case "<":
                resultado += "&lt;";
                break;
            case ">":
                resultado += "&gt;";
                break;
            case "\"":
                resultado += "&quot;";
                break;
            case "'":
                resultado += "&#39;";
                break;
            default:
                resultado += original[i];
        }
    }
    return resultado;
}

/**
 * Cria um elemento HTML com classe e texto (o texto entra via textContent).
 * @param {string} tag - nome da tag, ex.: "p"
 * @param {string} classe - classe CSS ("" para nenhuma)
 * @param {string} texto - conteúdo de texto ("" para nenhum)
 * @returns {HTMLElement} o elemento criado
 */
export function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) {
        elemento.classList.add(classe);
    }
    if (texto) {
        elemento.textContent = texto;
    }
    return elemento;
}

/**
 * Acrescenta um par termo/descrição (dt e dd) a uma lista dl.
 * @param {HTMLElement} lista - elemento dl
 * @param {string} termo - texto do dt
 * @param {string} descricao - texto do dd
 * @returns {void}
 */
export function adicionarDefinicao(lista, termo, descricao) {
    lista.append(criarElemento("dt", "", termo), criarElemento("dd", "", descricao));
}

/**
 * Monta um código com prefixo e zeros à esquerda, ex.: C001, CP012.
 * @param {string} prefixo - letras iniciais
 * @param {number} numero - número sequencial
 * @param {number} tamanho - quantidade mínima de dígitos
 * @returns {string} o código montado
 */
export function gerarCodigo(prefixo, numero, tamanho) {
    const numeroTexto = `${numero}`;
    let zeros = "";
    for (let i = numeroTexto.length; i < tamanho; i++) {
        zeros += "0";
    }
    return prefixo + zeros + numeroTexto;
}

/* ---------- moeda e datas ---------- */

/**
 * Formata um número como moeda brasileira (R$).
 * @param {number} valor - valor em reais
 * @returns {string} ex.: "R$ 24,90"
 */
export function formatarMoeda(valor) {
    return formatadorMoeda.format(valor);
}

/**
 * Arredonda um valor para 2 casas decimais.
 * @param {number} valor - valor em reais
 * @returns {number} valor arredondado
 */
export function arredondarMoeda(valor) {
    return parseFloat(valor.toFixed(2));
}

/**
 * Formata uma data no padrão brasileiro (dd/mm/aaaa).
 * @param {string|number} data - data em texto ISO ou em milissegundos
 * @returns {string} a data formatada
 */
export function formatarData(data) {
    return formatadorData.format(new Date(data));
}

/**
 * Formata data e hora no padrão brasileiro (dd/mm/aaaa hh:mm).
 * @param {string|number} data - data em texto ISO ou em milissegundos
 * @returns {string} a data e hora formatadas
 */
export function formatarDataHora(data) {
    return formatadorDataHora.format(new Date(data));
}

/* ---------- máscaras ---------- */

/**
 * Aplica a máscara 000.000.000-00 enquanto o CPF é digitado.
 * @param {string} valor - texto digitado
 * @returns {string} CPF com pontos e traço
 */
export function mascararCpf(valor) {
    const digitos = somenteDigitos(valor).slice(0, 11);
    let resultado = "";
    for (let i = 0; i < digitos.length; i++) {
        if (i === 3 || i === 6) {
            resultado += ".";
        }
        if (i === 9) {
            resultado += "-";
        }
        resultado += digitos[i];
    }
    return resultado;
}

/**
 * Separa o número do cartão em grupos de 4 dígitos enquanto ele é digitado.
 * @param {string} valor - texto digitado
 * @returns {string} número com espaços, ex.: "4111 1111 1111 1111"
 */
export function mascararCartao(valor) {
    const digitos = somenteDigitos(valor).slice(0, 19);
    let resultado = "";
    for (let i = 0; i < digitos.length; i++) {
        if (i > 0 && i % 4 === 0) {
            resultado += " ";
        }
        resultado += digitos[i];
    }
    return resultado;
}

/**
 * Aplica a máscara MM/AA na validade do cartão.
 * @param {string} valor - texto digitado
 * @returns {string} validade com a barra
 */
export function mascararValidade(valor) {
    const digitos = somenteDigitos(valor).slice(0, 4);
    if (digitos.length <= 2) {
        return digitos;
    }
    return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
}

/**
 * Formata um CEP salvo só com números, ex.: 88000-000.
 * @param {string} cep - CEP com 8 dígitos
 * @returns {string} CEP com traço
 */
export function formatarCep(cep) {
    const digitos = somenteDigitos(cep);
    if (digitos.length !== 8) {
        return digitos;
    }
    return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

/**
 * Formata um telefone salvo só com números, ex.: (48) 99999-0000.
 * @param {string} telefone - 10 ou 11 dígitos
 * @returns {string} telefone formatado para exibição
 */
export function formatarTelefone(telefone) {
    const digitos = somenteDigitos(telefone);
    if (digitos.length < 10) {
        return digitos;
    }
    let resultado = "(";
    for (let i = 0; i < digitos.length; i++) {
        if (i === 2) {
            resultado += ") ";
        }
        if (i === digitos.length - 4) {
            resultado += "-";
        }
        resultado += digitos[i];
    }
    return resultado;
}

/* ---------- validações ---------- */

/**
 * Verifica se o e-mail tem um formato válido (nome@dominio.ext).
 * @param {string} email - e-mail digitado
 * @returns {boolean} true se o formato for válido
 */
export function validarEmail(email) {
    const texto = `${email}`.trim();
    let quantidadeArrobas = 0;
    let posicaoArroba = -1;
    for (let i = 0; i < texto.length; i++) {
        if (texto[i] === " ") {
            return false;
        }
        if (texto[i] === "@") {
            quantidadeArrobas++;
            posicaoArroba = i;
        }
    }
    if (quantidadeArrobas !== 1 || posicaoArroba === 0) {
        return false;
    }

    // O domínio precisa ter um ponto, que não pode estar nas pontas
    const dominio = texto.slice(posicaoArroba + 1);
    if (!dominio.includes(".") || dominio.includes("..")) {
        return false;
    }
    if (dominio[0] === "." || dominio[dominio.length - 1] === ".") {
        return false;
    }
    return true;
}

// Calcula um dígito verificador do CPF a partir dos primeiros dígitos.
function calcularDigitoCpf(digitos, quantidade) {
    let soma = 0;
    for (let i = 0; i < quantidade; i++) {
        soma += parseInt(digitos[i], 10) * (quantidade + 1 - i);
    }
    const resto = soma % 11;
    if (resto < 2) {
        return 0;
    }
    return 11 - resto;
}

// Verifica se todos os caracteres do texto são iguais (ex.: 11111111111).
function todosIguais(texto) {
    for (let i = 1; i < texto.length; i++) {
        if (texto[i] !== texto[0]) {
            return false;
        }
    }
    return true;
}

/**
 * Verifica o CPF pelos dígitos verificadores (aceita com ou sem máscara).
 * @param {string} cpf - CPF digitado
 * @returns {boolean} true se o CPF for válido
 */
export function validarCpf(cpf) {
    const digitos = somenteDigitos(cpf);
    if (digitos.length !== 11 || todosIguais(digitos)) {
        return false;
    }
    const primeiroDigito = calcularDigitoCpf(digitos, 9);
    const segundoDigito = calcularDigitoCpf(digitos, 10);
    return primeiroDigito === parseInt(digitos[9], 10) && segundoDigito === parseInt(digitos[10], 10);
}

/**
 * Verifica o telefone: só números, 10 ou 11 dígitos, DDD de 11 a 99
 * e, com 11 dígitos, o terceiro dígito precisa ser 9.
 * @param {string} telefone - telefone digitado
 * @returns {boolean} true se o telefone for válido
 */
export function validarTelefone(telefone) {
    const texto = `${telefone}`;
    if (somenteDigitos(texto) !== texto) {
        return false;
    }
    if (texto.length !== 10 && texto.length !== 11) {
        return false;
    }
    const ddd = parseInt(texto.slice(0, 2), 10);
    if (ddd < 11) {
        return false;
    }
    if (texto.length === 11 && texto[2] !== "9") {
        return false;
    }
    return true;
}

/**
 * Verifica o número do cartão com o algoritmo de Luhn.
 * @param {string} numero - número do cartão (com ou sem espaços)
 * @returns {boolean} true se o número passar na verificação
 */
export function validarCartaoLuhn(numero) {
    const digitos = somenteDigitos(numero);
    if (digitos.length < 13 || digitos.length > 19) {
        return false;
    }
    let soma = 0;
    let dobrar = false;
    // Percorre da direita para a esquerda, dobrando um dígito sim, outro não
    for (let i = digitos.length - 1; i >= 0; i--) {
        let valor = parseInt(digitos[i], 10);
        if (dobrar) {
            valor = valor * 2;
            if (valor > 9) {
                valor -= 9;
            }
        }
        soma += valor;
        dobrar = !dobrar;
    }
    return soma % 10 === 0;
}

/**
 * Verifica a validade do cartão (MM/AA): mês de 1 a 12 e ainda não vencida.
 * O cartão vale até o último dia do mês informado.
 * @param {string} validade - validade digitada
 * @returns {boolean} true se a validade for aceita
 */
export function validarValidadeCartao(validade) {
    const digitos = somenteDigitos(validade);
    if (digitos.length !== 4) {
        return false;
    }
    const mes = parseInt(digitos.slice(0, 2), 10);
    const ano = 2000 + parseInt(digitos.slice(2), 10);
    if (mes < 1 || mes > 12) {
        return false;
    }
    // O primeiro dia do mês seguinte marca o fim da validade
    const fimDaValidade = new Date(ano, mes, 1);
    return Date.now() < fimDaValidade;
}

/**
 * Verifica o código de segurança do cartão (3 ou 4 números).
 * @param {string} cvv - código digitado
 * @returns {boolean} true se o código for válido
 */
export function validarCvv(cvv) {
    const texto = `${cvv}`;
    if (somenteDigitos(texto) !== texto) {
        return false;
    }
    return texto.length === 3 || texto.length === 4;
}

/**
 * Informa quais tipos de caractere aparecem na senha.
 * @param {string} senha - senha digitada
 * @returns {Object} { minusculas, maiusculas, numeros, simbolos } (true/false)
 */
export function analisarSenha(senha) {
    const resultado = { minusculas: false, maiusculas: false, numeros: false, simbolos: false };
    for (let i = 0; i < senha.length; i++) {
        const caractere = senha[i];
        if (caractere >= "a" && caractere <= "z") {
            resultado.minusculas = true;
        } else if (caractere >= "A" && caractere <= "Z") {
            resultado.maiusculas = true;
        } else if (caractere >= "0" && caractere <= "9") {
            resultado.numeros = true;
        } else {
            resultado.simbolos = true;
        }
    }
    return resultado;
}

/**
 * Calcula a força da senha de 0 a 5 pontos e o texto correspondente.
 * @param {string} senha - senha digitada
 * @returns {Object} { pontos, texto, nivel } com nivel "fraca", "media" ou "forte"
 */
export function calcularForcaSenha(senha) {
    const tipos = analisarSenha(senha);
    let pontos = 0;
    if (senha.length >= 8) {
        pontos++;
    }
    if (senha.length >= 12) {
        pontos++;
    }
    if (tipos.minusculas && tipos.maiusculas) {
        pontos++;
    }
    if (tipos.numeros) {
        pontos++;
    }
    if (tipos.simbolos) {
        pontos++;
    }

    if (pontos <= 2) {
        return { pontos: pontos, texto: "Senha fraca", nivel: "fraca" };
    }
    if (pontos === 3) {
        return { pontos: pontos, texto: "Senha média", nivel: "media" };
    }
    return { pontos: pontos, texto: "Senha forte", nivel: "forte" };
}

/**
 * Cria uma função que só executa depois de um tempo sem novas chamadas.
 * @param {Function} funcao - função a ser executada
 * @param {number} espera - tempo de espera em milissegundos
 * @returns {Function} a nova função com espera
 */
export function criarDebounce(funcao, espera) {
    let temporizador = null;
    return function () {
        clearTimeout(temporizador);
        temporizador = setTimeout(funcao, espera);
    };
}
