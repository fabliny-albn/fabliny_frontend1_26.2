/* pagina-perfil.js
   Página de perfil: só abre com login. Carrega e edita os dados do cliente
   (ID e CPF não mudam), troca a senha e exclui a conta. */

import {
    validarNome,
    validarEmailUnico,
    validarTelefoneCliente,
    validarSenha,
    validarConfirmacao,
    houveAlteracao,
    atualizarCliente,
    excluirCliente
} from "./clientes.js";
import { exigirLogin, usuarioLogado, conferirSenha, protegerSenha, encerrarSessao } from "./auth.js";
import { apagarCarrinhoCliente } from "./carrinho.js";
import {
    iniciarPagina,
    atualizarMenu,
    validarFormulario,
    corrigirAoDigitar,
    mostrarErroCampo,
    mostrarToast,
    abrirDialogo,
    fecharDialogo
} from "./ui.js";
import { criarElemento, mascararCpf, somenteDigitos } from "./utils.js";

/* ---------- dados do formulario ---------- */

// Preenche o formulário com os dados salvos do cliente.
function preencherFormulario(cliente) {
    document.getElementById("perfil-id").value = cliente.id;
    document.getElementById("perfil-nome").value = cliente.nome;
    document.getElementById("perfil-email").value = cliente.email;
    document.getElementById("perfil-telefone").value = cliente.telefone;
    document.getElementById("perfil-cpf").value = mascararCpf(cliente.cpf);
    document.getElementById("perfil-senha-atual").value = "";
    document.getElementById("perfil-senha").value = "";
    document.getElementById("perfil-confirmar-senha").value = "";
    document.getElementById("titulo-pedidos").textContent = `Histórico de pedidos de ${cliente.nome}`;
}

// Monta as regras de validação, na ordem dos campos.
function criarRegras() {
    const novaSenha = document.getElementById("perfil-senha");
    return [
        { entrada: document.getElementById("perfil-nome"), validar: validarNome },
        {
            entrada: document.getElementById("perfil-email"),
            validar: (valor) => validarEmailUnico(valor, usuarioLogado().id)
        },
        { entrada: document.getElementById("perfil-telefone"), validar: validarTelefoneCliente },
        {
            entrada: document.getElementById("perfil-senha-atual"),
            validar: (valor) => {
                if (novaSenha.value !== "" && valor === "") {
                    return "Informe a senha atual para trocar a senha.";
                }
                return "";
            }
        },
        {
            entrada: novaSenha,
            validar: (valor) => {
                if (valor === "") {
                    return "";
                }
                return validarSenha(valor);
            }
        },
        {
            entrada: document.getElementById("perfil-confirmar-senha"),
            validar: (valor) => {
                if (novaSenha.value === "" && valor === "") {
                    return "";
                }
                return validarConfirmacao(novaSenha.value, valor);
            }
        }
    ];
}

// Lê os campos editáveis. O CPF não é lido: vale sempre o que está salvo.
function lerDadosFormulario() {
    return {
        nome: document.getElementById("perfil-nome").value,
        email: document.getElementById("perfil-email").value,
        telefone: document.getElementById("perfil-telefone").value
    };
}

// Confere a senha atual e gera o hash da nova; devolve null se a senha atual estiver errada.
async function prepararNovaSenha(cliente) {
    const campoAtual = document.getElementById("perfil-senha-atual");
    const correta = await conferirSenha(cliente, campoAtual.value);
    if (!correta) {
        mostrarErroCampo(campoAtual, "A senha atual está incorreta.");
        campoAtual.focus();
        return null;
    }
    return protegerSenha(document.getElementById("perfil-senha").value);
}

// Valida e salva as alterações do perfil.
async function salvarPerfil(evento, regras) {
    evento.preventDefault();
    const cliente = usuarioLogado();
    if (!cliente) {
        window.location.reload();
        return;
    }
    if (!validarFormulario(regras)) {
        return;
    }

    const dados = lerDadosFormulario();
    const trocarSenha = document.getElementById("perfil-senha").value !== "";
    if (!houveAlteracao(cliente, dados, trocarSenha)) {
        mostrarToast("Nenhuma alteração para salvar.", "info");
        return;
    }

    let senhaProtegida = null;
    if (trocarSenha) {
        senhaProtegida = await prepararNovaSenha(cliente);
        if (senhaProtegida === null) {
            return;
        }
    }

    const resultado = atualizarCliente(cliente.id, dados, senhaProtegida);
    if (!resultado.sucesso) {
        mostrarToast(resultado.mensagem, "erro");
        return;
    }
    mostrarToast(resultado.mensagem, "sucesso");
    atualizarMenu();
    preencherFormulario(usuarioLogado());
}

/* ---------- exclusao da conta ---------- */

// Exclui a conta do cliente conectado e volta para o início.
function excluirConta() {
    const cliente = usuarioLogado();
    if (!cliente || !excluirCliente(cliente.id)) {
        fecharDialogo();
        mostrarToast("Não foi possível excluir a conta.", "erro");
        return;
    }
    apagarCarrinhoCliente(cliente.id);
    encerrarSessao("Sua conta foi excluída. Esperamos ver você de novo!");
    window.location.href = "index.html";
}

// Abre o diálogo pedindo a confirmação da exclusão.
function confirmarExclusao() {
    const conteudo = criarElemento("div", "", "");
    const texto = criarElemento("p", "", "Tem certeza? Esta ação não pode ser desfeita: o seu cadastro será apagado e a sessão encerrada.");
    const acoes = criarElemento("div", "acoes-dialogo", "");

    const botaoCancelar = criarElemento("button", "botao", "Cancelar");
    botaoCancelar.type = "button";
    botaoCancelar.classList.add("botao-secundario");
    botaoCancelar.addEventListener("click", fecharDialogo);

    const botaoExcluir = criarElemento("button", "botao", "Sim, excluir minha conta");
    botaoExcluir.type = "button";
    botaoExcluir.classList.add("botao-perigo");
    botaoExcluir.addEventListener("click", excluirConta);

    acoes.append(botaoCancelar, botaoExcluir);
    conteudo.append(texto, acoes);
    abrirDialogo("Excluir conta", conteudo);
}

/* ---------- inicio ---------- */

// Liga o formulário, o telefone só com números e o botão de exclusão.
function configurarPerfil(usuario) {
    const regras = criarRegras();
    const telefone = document.getElementById("perfil-telefone");
    telefone.addEventListener("input", () => {
        telefone.value = somenteDigitos(telefone.value);
    });
    corrigirAoDigitar(regras);
    document.getElementById("form-perfil").addEventListener("submit", (evento) => {
        salvarPerfil(evento, regras);
    });

    // A conta de administrador não pode ser excluída por aqui
    if (usuario.perfil === "administrador") {
        document.getElementById("area-excluir-conta").hidden = true;
    } else {
        document.getElementById("botao-excluir-conta").addEventListener("click", confirmarExclusao);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const usuario = exigirLogin("", "Faça login para acessar o seu perfil.");
    if (!usuario) {
        return;
    }
    iniciarPagina();
    preencherFormulario(usuario);
    configurarPerfil(usuario);
    document.querySelector("main").hidden = false;
});
