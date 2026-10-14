# Verde Vida - Loja Virtual de Plantas e Jardim

Projeto 1 da disciplina de Programação Frontend I (CST em ADS - IFSC).
Site estático de uma loja virtual fictícia de plantas, vasos e produtos
de jardinagem, construído apenas com HTML e CSS (sem JavaScript).

## Integrantes

- Fabliny Albuquerque Biano - [RA]

## Descrição da loja

A Verde Vida é uma loja fictícia de plantas ornamentais, vasos, substratos,
adubos e ferramentas de jardinagem. O site simula uma interface completa de
e-commerce: vitrine de produtos, cadastro/login/perfil de cliente, loja com
filtros e carrinho de compras, e uma área administrativa com relatórios.
Nesta primeira etapa (Parte 1), nenhum botão ou formulário executa ações de
verdade - tudo é apenas visual, com dados de exemplo escritos direto no HTML.

## Estrutura de pastas

```
verde-vida/
├── index.html         Página inicial (destaque, sobre, produtos, contato)
├── cadastro.html       Formulário de cadastro de cliente
├── login.html          Formulário de login
├── perfil.html         Edição de dados do cliente + tabela "Meus pedidos"
├── loja.html            Catálogo com filtros + carrinho de compras
├── relatorios.html       Área administrativa (relatórios de clientes e compras)
├── css/
│   ├── base.css          Reset, variáveis de cor/fonte, estilos globais
│   ├── layout.css         Estrutura: cabeçalho, menu, grids, rodapé
│   ├── componentes.css     Botões, cartões de produto, formulários, tabelas
│   ├── responsivo.css      Media queries (desktop, tablet, smartphone)
│   └── relatorios.css      Estilo exclusivo da área administrativa + impressão
├── img/                  Imagens da loja (logo, banner, produtos, etc.)
└── validacao/              print das validações
```

