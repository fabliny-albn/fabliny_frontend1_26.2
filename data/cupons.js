/* data/cupons.js
   Cupons de desconto e faixas de CEP usadas no cálculo do frete. */

/**
 * Cupons aceitos na loja.
 * tipo "percentual": desconto de "valor" % sobre o subtotal;
 * tipo "fixo": desconto de "valor" reais;
 * tipo "frete": zera o frete.
 */
export const cupons = [
    {
        codigo: "VERDE10",
        tipo: "percentual",
        valor: 10,
        compraMinima: 50,
        validade: "2027-12-31",
        descricao: "10% de desconto em compras a partir de R$ 50,00"
    },
    {
        codigo: "PLANTA15",
        tipo: "fixo",
        valor: 15,
        compraMinima: 100,
        validade: "2027-06-30",
        descricao: "R$ 15,00 de desconto em compras a partir de R$ 100,00"
    },
    {
        codigo: "FRETEGRATIS",
        tipo: "frete",
        valor: 0,
        compraMinima: 80,
        validade: "2027-12-31",
        descricao: "Frete grátis em compras a partir de R$ 80,00"
    },
    {
        codigo: "BEMVINDO20",
        tipo: "percentual",
        valor: 20,
        compraMinima: 30,
        validade: "2026-01-31",
        descricao: "20% de desconto (cupom vencido, usado para teste)"
    }
];

/** Acima deste subtotal o frete é grátis. */
export const valorFreteGratis = 199;

/** Faixas de CEP (somente números) e o valor do frete de cada uma. */
export const faixasCep = [
    { inicio: 88000000, fim: 89999999, regiao: "Santa Catarina", valor: 12.9 },
    { inicio: 80000000, fim: 87999999, regiao: "Paraná", valor: 18.9 },
    { inicio: 90000000, fim: 99999999, regiao: "Rio Grande do Sul", valor: 19.9 },
    { inicio: 1000000, fim: 79999999, regiao: "Demais regiões do Brasil", valor: 29.9 }
];
