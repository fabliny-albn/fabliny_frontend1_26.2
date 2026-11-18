/* storage.js
   Único ponto de acesso ao localStorage da loja.
   Cada valor é guardado dentro de um "pacote" com a versão do esquema:
   { versao: 1, dados: ... }. Se o dado estiver ausente, corrompido,
   de outra versão ou de outro tipo, a leitura devolve o valor padrão. */

const VERSAO_ESQUEMA = 1;

/** Nomes das chaves usadas no localStorage. */
export const CHAVES = {
    clientes: "loja:clientes",
    compras: "loja:compras",
    sessao: "loja:sessao",
    carrinho: "loja:carrinho",
    contadores: "loja:contadores",
    mensagens: "loja:mensagens",
    tema: "loja:tema",
    estoque: "loja:estoque",
    tentativas: "loja:tentativas"
};

// Descobre o tipo de um valor lido do JSON (array, objeto, texto, número...).
function tipoDoValor(valor) {
    if (valor === undefined) {
        return "indefinido";
    }
    if (valor === null) {
        return "nulo";
    }
    if (Array.isArray(valor)) {
        return "array";
    }
    const primeiroCaractere = JSON.stringify(valor)[0];
    switch (primeiroCaractere) {
        case "{":
            return "objeto";
        case "\"":
            return "texto";
        case "t":
        case "f":
            return "booleano";
        default:
            return "numero";
    }
}

// Devolve uma cópia do valor padrão, para ninguém alterar o original.
function copiarValor(valor) {
    if (valor === undefined) {
        return undefined;
    }
    return JSON.parse(JSON.stringify(valor));
}

/**
 * Lê um valor do localStorage; devolve o padrão se ele faltar ou estiver inválido.
 * @param {string} chave - uma das CHAVES
 * @param {*} valorPadrao - valor usado quando não há dado válido
 * @returns {*} o dado guardado ou uma cópia do valor padrão
 */
export function lerDados(chave, valorPadrao) {
    let texto;
    try {
        texto = localStorage[chave];
    } catch (erro) {
        return copiarValor(valorPadrao);
    }
    if (!texto) {
        return copiarValor(valorPadrao);
    }

    let pacote;
    try {
        pacote = JSON.parse(texto);
    } catch (erro) {
        return copiarValor(valorPadrao);
    }

    // Verifica a versão do esquema e se o tipo do dado é o esperado
    if (tipoDoValor(pacote) !== "objeto" || pacote.versao !== VERSAO_ESQUEMA) {
        return copiarValor(valorPadrao);
    }
    if (tipoDoValor(pacote.dados) !== tipoDoValor(valorPadrao)) {
        return copiarValor(valorPadrao);
    }
    return pacote.dados;
}

/**
 * Grava um valor no localStorage junto com a versão do esquema.
 * @param {string} chave - uma das CHAVES
 * @param {*} dados - valor que pode ser convertido em JSON
 * @returns {boolean} true se gravou, false se o navegador recusou
 */
export function gravarDados(chave, dados) {
    const pacote = { versao: VERSAO_ESQUEMA, dados: dados };
    try {
        localStorage.setItem(chave, JSON.stringify(pacote));
        return true;
    } catch (erro) {
        return false;
    }
}

/**
 * Avança um contador de loja:contadores e devolve o novo número.
 * O número nunca volta atrás, mesmo que registros sejam excluídos.
 * @param {string} nomeContador - ex.: "clientes" ou "compras"
 * @returns {number} o próximo número da sequência
 */
export function proximoNumero(nomeContador) {
    const contadores = lerDados(CHAVES.contadores, {});
    let atual = parseInt(contadores[nomeContador], 10);
    if (isNaN(atual)) {
        atual = 0;
    }
    atual++;
    contadores[nomeContador] = atual;
    gravarDados(CHAVES.contadores, contadores);
    return atual;
}

/**
 * Apaga uma chave do localStorage.
 * @param {string} chave - uma das CHAVES
 * @returns {boolean} true se apagou, false se houve erro
 */
export function removerDados(chave) {
    try {
        localStorage.removeItem(chave);
        return true;
    } catch (erro) {
        return false;
    }
}
