/* auth.js
   Senha com hash SHA-256 e salt, conta de administrador inicial, login
   com bloqueio após 3 falhas (loja:tentativas), sessão com expiração por
   inatividade (loja:sessao) e proteção das páginas restritas.

   O objeto salvo em loja:sessao pode ter:
   idUsuario, perfil, inicio e expiraEm (usuário conectado),
   aviso (mensagem a mostrar na próxima página) e
   emailLembrado (preenchido quando "Lembrar de mim" é marcado). */

import { CHAVES, lerDados, gravarDados } from "./storage.js";
import { buscarClientePorEmail, buscarClientePorId, adicionarAdministrador, existeAdministrador } from "./clientes.js";

const TEMPO_SESSAO = 30 * 60 * 1000;
const TEMPO_BLOQUEIO = 60 * 1000;
const LIMITE_TENTATIVAS = 3;
const MENSAGEM_LOGIN_INVALIDO = "E-mail ou senha inválidos.";
const AVISO_SESSAO_EXPIRADA = "Sua sessão expirou por inatividade. Entre novamente.";
const DIGITOS_HEXA = "0123456789abcdef";

const EMAIL_ADMINISTRADOR = "admin@verdevida.exemplo.com.br";
const SENHA_ADMINISTRADOR = "Admin2026";

// Páginas aceitas no parâmetro "retorno" do login.
const PAGINAS_DO_SITE = [
    "index.html",
    "loja.html",
    "loja.html#carrinho",
    "cadastro.html",
    "perfil.html",
    "relatorios.html"
];

/* ---------- hash da senha ---------- */

// Converte uma lista de bytes em texto hexadecimal (2 caracteres por byte).
function bytesParaHexa(bytes) {
    let texto = "";
    for (let i = 0; i < bytes.length; i++) {
        texto += DIGITOS_HEXA[parseInt(bytes[i] / 16, 10)] + DIGITOS_HEXA[bytes[i] % 16];
    }
    return texto;
}

// Gera um salt aleatório de 16 bytes.
function gerarSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bytesParaHexa(bytes);
}

// Calcula o SHA-256 do salt junto com a senha.
async function gerarHash(senha, salt) {
    const dados = new TextEncoder().encode(salt + senha);
    const resumo = await crypto.subtle.digest("SHA-256", dados);
    return bytesParaHexa(new Uint8Array(resumo));
}

/**
 * Gera um salt novo e o hash da senha, para guardar no lugar da senha.
 * @param {string} senha - senha digitada
 * @returns {Promise<Object>} { senhaHash, salt }
 */
export async function protegerSenha(senha) {
    const salt = gerarSalt();
    const senhaHash = await gerarHash(senha, salt);
    return { senhaHash: senhaHash, salt: salt };
}

/**
 * Confere se a senha digitada gera o mesmo hash guardado no cliente.
 * @param {Object} cliente - cliente com senhaHash e salt
 * @param {string} senha - senha digitada
 * @returns {Promise<boolean>} true se a senha estiver certa
 */
export async function conferirSenha(cliente, senha) {
    const senhaHash = await gerarHash(senha, cliente.salt);
    return senhaHash === cliente.senhaHash;
}

/**
 * Cria a conta de administrador na primeira execução da loja.
 * @returns {Promise<void>}
 */
export async function garantirAdministrador() {
    if (existeAdministrador()) {
        return;
    }
    const senhaProtegida = await protegerSenha(SENHA_ADMINISTRADOR);
    adicionarAdministrador({
        id: "ADM01",
        nome: "Administrador Verde Vida",
        email: EMAIL_ADMINISTRADOR,
        telefone: "4833330000",
        cpf: "",
        perfil: "administrador",
        situacao: "ativo",
        senhaHash: senhaProtegida.senhaHash,
        salt: senhaProtegida.salt,
        criadoEm: new Date().toUTCString()
    });
}

/* ---------- tentativas e bloqueio do login ---------- */

// Lê o controle de tentativas: { falhas, bloqueadoAte }.
function lerTentativas() {
    return lerDados(CHAVES.tentativas, { falhas: 0, bloqueadoAte: 0 });
}

// Soma uma falha; na terceira, bloqueia o login por 60 segundos.
function registrarFalha() {
    const tentativas = lerTentativas();
    tentativas.falhas++;
    if (tentativas.falhas >= LIMITE_TENTATIVAS) {
        tentativas.falhas = 0;
        tentativas.bloqueadoAte = Date.now() + TEMPO_BLOQUEIO;
    }
    gravarDados(CHAVES.tentativas, tentativas);
}

/**
 * Informa quantos segundos faltam para o login ser liberado.
 * @returns {number} segundos restantes (0 se não estiver bloqueado)
 */
export function tempoRestanteBloqueio() {
    const restante = lerTentativas().bloqueadoAte - Date.now();
    if (restante <= 0) {
        return 0;
    }
    return parseInt((restante + 999) / 1000, 10);
}

/* ---------- sessao ---------- */

// Lê o objeto da sessão ({} quando não há nada salvo).
function lerSessao() {
    return lerDados(CHAVES.sessao, {});
}

// Grava o objeto da sessão.
function gravarSessao(sessao) {
    gravarDados(CHAVES.sessao, sessao);
}

// Inicia a sessão do usuário que acabou de entrar.
function iniciarSessao(cliente) {
    const sessao = lerSessao();
    const agora = Date.now();
    sessao.idUsuario = cliente.id;
    sessao.perfil = cliente.perfil;
    sessao.inicio = agora;
    sessao.expiraEm = agora + TEMPO_SESSAO;
    gravarSessao(sessao);
}

/**
 * Encerra a sessão (o carrinho e o e-mail lembrado continuam salvos).
 * @param {string} aviso - mensagem para a próxima página ("" para nenhuma)
 * @returns {void}
 */
export function encerrarSessao(aviso) {
    const sessao = lerSessao();
    delete sessao.idUsuario;
    delete sessao.perfil;
    delete sessao.inicio;
    delete sessao.expiraEm;
    if (aviso) {
        sessao.aviso = aviso;
    }
    gravarSessao(sessao);
}

/**
 * Devolve o usuário conectado, ou null se não houver sessão válida.
 * Sessão vencida ou usuário bloqueado/excluído encerram a sessão.
 * @returns {Object|null} o cliente conectado
 */
export function usuarioLogado() {
    const sessao = lerSessao();
    if (!sessao.idUsuario) {
        return null;
    }
    if (Date.now() > sessao.expiraEm) {
        encerrarSessao(AVISO_SESSAO_EXPIRADA);
        return null;
    }
    const cliente = buscarClientePorId(sessao.idUsuario);
    if (!cliente) {
        encerrarSessao("");
        return null;
    }
    if (cliente.situacao === "bloqueado") {
        encerrarSessao("Sua conta foi bloqueada. Entre em contato com a loja.");
        return null;
    }
    return cliente;
}

/**
 * Adia a expiração da sessão por mais 30 minutos (chamada a cada interação).
 * @returns {void}
 */
export function renovarSessao() {
    const sessao = lerSessao();
    if (!sessao.idUsuario || Date.now() > sessao.expiraEm) {
        return;
    }
    sessao.expiraEm = Date.now() + TEMPO_SESSAO;
    gravarSessao(sessao);
}

/**
 * Verifica se a sessão venceu e, se venceu, faz o logout com aviso.
 * @returns {boolean} true se a sessão acabou de expirar
 */
export function verificarExpiracao() {
    const sessao = lerSessao();
    if (sessao.idUsuario && Date.now() > sessao.expiraEm) {
        encerrarSessao(AVISO_SESSAO_EXPIRADA);
        return true;
    }
    return false;
}

/* ---------- avisos entre paginas e e-mail lembrado ---------- */

/**
 * Guarda uma mensagem para ser mostrada na próxima página aberta.
 * @param {string} texto - mensagem
 * @returns {void}
 */
export function guardarAviso(texto) {
    const sessao = lerSessao();
    sessao.aviso = texto;
    gravarSessao(sessao);
}

/**
 * Devolve a mensagem guardada e a apaga, para não aparecer de novo.
 * @returns {string} a mensagem ou ""
 */
export function retirarAviso() {
    const sessao = lerSessao();
    const aviso = sessao.aviso;
    if (!aviso) {
        return "";
    }
    delete sessao.aviso;
    gravarSessao(sessao);
    return aviso;
}

/**
 * Guarda o e-mail para preencher o login da próxima vez (nunca a senha).
 * @param {string} email - e-mail digitado
 * @returns {void}
 */
export function lembrarEmail(email) {
    const sessao = lerSessao();
    sessao.emailLembrado = `${email}`.trim().toLowerCase();
    gravarSessao(sessao);
}

/**
 * Esquece o e-mail lembrado.
 * @returns {void}
 */
export function esquecerEmail() {
    const sessao = lerSessao();
    delete sessao.emailLembrado;
    gravarSessao(sessao);
}

/**
 * Devolve o e-mail lembrado.
 * @returns {string} o e-mail ou ""
 */
export function obterEmailLembrado() {
    const email = lerSessao().emailLembrado;
    if (!email) {
        return "";
    }
    return email;
}

/* ---------- login ---------- */

/**
 * Faz o login comparando o hash da senha; conta as falhas e bloqueia após 3.
 * @param {string} email - e-mail digitado
 * @param {string} senha - senha digitada
 * @returns {Promise<Object>} { sucesso, mensagem, usuario }
 */
export async function fazerLogin(email, senha) {
    await garantirAdministrador();
    if (tempoRestanteBloqueio() > 0) {
        return { sucesso: false, mensagem: "Login bloqueado temporariamente.", usuario: null };
    }

    const cliente = buscarClientePorEmail(email);
    let senhaCorreta = false;
    if (cliente) {
        senhaCorreta = await conferirSenha(cliente, senha);
    }
    if (!senhaCorreta) {
        registrarFalha();
        return { sucesso: false, mensagem: MENSAGEM_LOGIN_INVALIDO, usuario: null };
    }
    if (cliente.situacao === "bloqueado") {
        return { sucesso: false, mensagem: "Esta conta está bloqueada. Entre em contato com a loja.", usuario: null };
    }

    gravarDados(CHAVES.tentativas, { falhas: 0, bloqueadoAte: 0 });
    iniciarSessao(cliente);
    return { sucesso: true, mensagem: "", usuario: cliente };
}

/* ---------- protecao de paginas ---------- */

/**
 * Descobre o nome do arquivo da página aberta (ex.: "loja.html").
 * @returns {string} nome da página
 */
export function paginaAtual() {
    const caminho = window.location.pathname;
    let inicioNome = 0;
    for (let i = 0; i < caminho.length; i++) {
        if (caminho[i] === "/") {
            inicioNome = i + 1;
        }
    }
    const nome = caminho.slice(inicioNome);
    if (nome === "") {
        return "index.html";
    }
    return nome;
}

/**
 * Aceita o retorno só se for uma página do próprio site.
 * @param {string} retorno - valor do parâmetro "retorno"
 * @returns {string} a página válida ou ""
 */
export function validarRetorno(retorno) {
    const pagina = PAGINAS_DO_SITE.find((nome) => nome === retorno);
    if (!pagina) {
        return "";
    }
    return pagina;
}

/**
 * Exige login (e um perfil, se informado); senão, manda para o login.
 * @param {string} perfilExigido - "administrador" ou "" para qualquer usuário
 * @param {string} mensagem - aviso mostrado na página de login
 * @returns {Object|null} o usuário, ou null quando houve redirecionamento
 */
export function exigirLogin(perfilExigido, mensagem) {
    const usuario = usuarioLogado();
    if (usuario && (perfilExigido === "" || usuario.perfil === perfilExigido)) {
        return usuario;
    }
    // Mantém o aviso de sessão expirada, se ele já estiver guardado
    if (!lerSessao().aviso) {
        guardarAviso(mensagem);
    }
    window.location.replace(`login.html?retorno=${paginaAtual()}`);
    return null;
}
