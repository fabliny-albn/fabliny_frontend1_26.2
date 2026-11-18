/* data/produtos.js
   Catálogo fixo da loja. O estoque daqui é o estoque inicial; depois das
   vendas, o estoque atualizado fica salvo em loja:estoque. */

/** Nome de exibição de cada categoria (iguais às opções do filtro da loja). */
export const nomesCategorias = {
    plantas: "Plantas",
    vasos: "Vasos",
    insumos: "Ferramentas e insumos"
};

/** Lista dos 12 produtos da loja. */
export const produtos = [
    {
        id: "P01",
        nome: "Suculenta Echeveria",
        categoria: "plantas",
        descricao: "Suculenta de fácil cuidado, ideal para ambientes internos com boa luz indireta.",
        preco: 24.9,
        imagem: "img/prod-suculenta.png",
        textoAlternativo: "Vaso pequeno com suculenta Echeveria",
        estoque: 15
    },
    {
        id: "P02",
        nome: "Samambaia Americana",
        categoria: "plantas",
        descricao: "Folhagem exuberante, gosta de ambientes úmidos e sombra parcial.",
        preco: 39.9,
        imagem: "img/prod-samambaia.png",
        textoAlternativo: "Samambaia americana em vaso de cerâmica",
        estoque: 8
    },
    {
        id: "P03",
        nome: "Jiboia (Pothos)",
        categoria: "plantas",
        descricao: "Planta trepadeira resistente, perfeita para prateleiras e suportes suspensos.",
        preco: 29.9,
        imagem: "img/prod-jiboia.png",
        textoAlternativo: "Jiboia (Pothos) com folhas pendentes em vaso",
        estoque: 12
    },
    {
        id: "P04",
        nome: "Espada-de-São-Jorge",
        categoria: "plantas",
        descricao: "Planta resistente e de baixa manutenção, símbolo de proteção no jardim.",
        preco: 34.5,
        imagem: "img/prod-espada-sao-jorge.png",
        textoAlternativo: "Espada-de-São-Jorge em vaso de barro",
        estoque: 10
    },
    {
        id: "P05",
        nome: "Orquídea Phalaenopsis",
        categoria: "plantas",
        descricao: "Flores delicadas e duradouras, ótima opção de presente.",
        preco: 59.9,
        imagem: "img/prod-orquidea.png",
        textoAlternativo: "Orquídea Phalaenopsis rosa em vaso transparente",
        estoque: 5
    },
    {
        id: "P06",
        nome: "Cacto Mandacaru Mini",
        categoria: "plantas",
        descricao: "Precisa de pouca água e muita luz solar direta, ótimo para quem viaja bastante.",
        preco: 19.9,
        imagem: "img/prod-cacto.png",
        textoAlternativo: "Mini cacto mandacaru em vaso pequeno",
        estoque: 20
    },
    {
        id: "P07",
        nome: "Terrário de Vidro",
        categoria: "vasos",
        descricao: "Mini jardim fechado, de baixa manutenção e grande efeito decorativo.",
        preco: 79.9,
        imagem: "img/prod-terrario.png",
        textoAlternativo: "Terrário de vidro com pequenas plantas dentro",
        estoque: 3
    },
    {
        id: "P08",
        nome: "Vaso de Cerâmica Pequeno",
        categoria: "vasos",
        descricao: "Vaso de cerâmica com furo de drenagem, tamanho ideal para suculentas.",
        preco: 22,
        imagem: "img/prod-vaso-ceramica.png",
        textoAlternativo: "Vaso de cerâmica vazio na cor marrom",
        estoque: 25
    },
    {
        id: "P09",
        nome: "Regador de Metal",
        categoria: "insumos",
        descricao: "Regador compacto com bico fino, ideal para vasos pequenos e médios.",
        preco: 32,
        imagem: "img/prod-regador.png",
        textoAlternativo: "Regador de metal pequeno",
        estoque: 7
    },
    {
        id: "P10",
        nome: "Adubo Orgânico 1kg",
        categoria: "insumos",
        descricao: "Adubo natural rico em nutrientes, indicado para todas as espécies.",
        preco: 18.5,
        imagem: "img/prod-adubo.png",
        textoAlternativo: "Pacote de adubo orgânico de um quilo",
        estoque: 30
    },
    {
        id: "P11",
        nome: "Substrato para Vasos",
        categoria: "insumos",
        descricao: "Mistura balanceada de terra, areia e matéria orgânica, pronta pra uso.",
        preco: 15.9,
        imagem: "img/prod-substrato.png",
        textoAlternativo: "Pacote de substrato para vasos",
        estoque: 30
    },
    {
        id: "P12",
        nome: "Kit de Jardinagem Básico",
        categoria: "insumos",
        descricao: "Pá, tesoura de poda e luva, tudo que você precisa pra começar a cuidar das plantas.",
        preco: 44.9,
        imagem: "img/prod-kit-jardinagem.png",
        textoAlternativo: "Kit básico de jardinagem com ferramentas pequenas",
        estoque: 6
    }
];
