// Porão — sessão por ASSINATURA de mensagem (decisão do dono 20/11 18:17; desenho docs/porao/desenho-abertura.md).
// NENHUMA transação, NENHUM token, nenhuma rede: só um texto que a carteira assina e o servidor confere.
//
// Desafio: PENDENTE → USADO | VENCIDO. O servidor monta a mensagem SIWS (domínio FIXO do servidor, nunca do pedido),
//   guarda-a junto com o nonce (16 bytes, 5 min) e, no "entrar", confere a assinatura contra a mensagem GUARDADA.
//   Uso único: o nonce é queimado com UPDATE condicional (1 linha) ANTES de conferir — uma tentativa por desafio,
//   certa ou errada; dois "entrar" ao mesmo tempo, só um passa.
// Sessão: NENHUMA → ATIVA → SAIU | VENCIDA. Token aleatório de 32 bytes vai só no cookie; o banco guarda o sha256.
//   Vale 7 dias e renova quando usada. Sair apaga a linha no banco.
import crypto from 'node:crypto'
import { montarMensagem, chavePublicaDe, conferirAssinatura } from './assinatura.mjs'
import { transacao, contaDaCarteira, contaConvidadaLocal, buscarConta } from './banco.mjs'

/** Limites técnicos da sessão (não são números de economia). */
export const SESSAO = Object.freeze({
  nonceBytes: 16,
  desafioMs: 5 * 60_000,
  tokenBytes: 32,
  duracaoMs: 7 * 24 * 3600_000,
  /** Renova (banco + cookie) no máximo 1 vez por minuto por sessão: não grava a cada pedido. */
  renovarAposMs: 60_000,
  /** Sessões vencidas há mais que isto somem na limpeza (no máximo 1 vez por minuto). */
  guardarVencidosMs: 24 * 3600_000,
  /** Desafios vencidos há mais que isto somem (parecer v4, M2): ~10 min depois de emitidos, não 24 h.
   *  Apagar cedo é seguro: o "entrar" só aceita desafio ainda dentro da validade. */
  guardarDesafiosVencidosMs: 5 * 60_000,
})
export const NOME_COOKIE = 'porao_sessao'
export const NOME_COOKIE_SEGURO = `__Host-${NOME_COOKIE}`

const TOKEN_VALIDO = /^[A-Za-z0-9_-]{43}$/ // 32 bytes em base64url, sem "="
const NONCE_VALIDO = /^[0-9a-f]{32}$/

const sha256 = t => crypto.createHash('sha256').update(t).digest('hex')
const ms = a => Math.floor(a)

// Local: 127.0.0.1 ou localhost (com ou sem http:// e porta). Publicado: SÓ https://<domínio>[:porta], sem caminho.
const SITE_LOCAL = /^(?:http:\/\/)?((?:127\.0\.0\.1|localhost)(?::[0-9]{1,5})?)\/?$/i
const SITE_HTTPS = /^https:\/\/([a-z0-9](?:[a-z0-9.-]{0,98}[a-z0-9])?(?::[0-9]{1,5})?)\/?$/i

/**
 * Site da mensagem: PORAO_SITE (se vier) ou 127.0.0.1:<porta>. Nunca o cabeçalho Host.
 * Recusa (erro claro, o servidor não sobe) site que não é local e não começa com https:// (parecer v4).
 */
export function siteDoServidor ({ site, porta }) {
  const s = site ?? process.env.PORAO_SITE ?? `127.0.0.1:${porta}`
  if (typeof s !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(s)) throw new Error('PORAO_SITE inválido (só ASCII, sem espaço, até 128).')
  if (!SITE_LOCAL.test(s) && !SITE_HTTPS.test(s)) {
    throw new Error('PORAO_SITE inválido: fora do 127.0.0.1/localhost ele precisa ser https://<domínio> (sem caminho). O servidor não sobe assim.')
  }
  return s
}

/** Domínio e URI da mensagem SIWS a partir do site (já conferido por siteDoServidor). */
export function origemDoSite (site) {
  const h = SITE_HTTPS.exec(site)
  if (h) return { dominio: h[1].toLowerCase(), uri: `https://${h[1].toLowerCase()}` }
  const l = SITE_LOCAL.exec(site)
  if (l) return { dominio: l[1].toLowerCase(), uri: `http://${l[1].toLowerCase()}` }
  throw new Error('PORAO_SITE inválido.')
}

/** https → cookie __Host- com Secure. */
export const siteSeguro = site => site.toLowerCase().startsWith('https://')
export const nomeDoCookie = seguro => (seguro ? NOME_COOKIE_SEGURO : NOME_COOKIE)

/**
 * Cria o desafio da carteira. dominio/uri: do servidor (origemDoSite). maxPendentes: teto GERAL de desafios ainda
 * válidos e não usados (acima → 'ocupado').
 * → { ok: true, mensagem, nonce, venceEm } | { ok: false, erro, codigo: 'carteira_invalida' | 'ocupado' }.
 */
export function criarDesafio (db, { carteira, dominio, uri, agora, maxPendentes = Infinity }) {
  if (typeof carteira !== 'string' || !chavePublicaDe(carteira)) {
    return { ok: false, erro: 'Esse endereço de carteira não é válido.', codigo: 'carteira_invalida' }
  }
  const em = ms(agora)
  if (Number.isFinite(maxPendentes)) {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM desafios WHERE vence_em > ? AND usado_em IS NULL').get(em)
    if (n >= maxPendentes) return { ok: false, erro: 'Muita gente entrando agora. Tente de novo em alguns minutos.', codigo: 'ocupado' }
  }
  const nonce = crypto.randomBytes(SESSAO.nonceBytes).toString('hex')
  const venceEm = em + SESSAO.desafioMs
  const mensagem = montarMensagem({ dominio, uri, carteira, nonce, emitida: em, vence: venceEm })
  db.prepare('INSERT INTO desafios (nonce, carteira, mensagem, vence_em, usado_em) VALUES (?, ?, ?, ?, NULL)')
    .run(nonce, carteira, mensagem, venceEm)
  return { ok: true, mensagem, nonce, venceEm }
}

const RECUSA_ENTRAR = Object.freeze({ ok: false, erro: 'Não deu para confirmar a assinatura. Peça uma mensagem nova e assine de novo.', codigo: 'assinatura_invalida' })

/**
 * Confere a assinatura e abre sessão. → { ok: true, token, conta } | RECUSA_ENTRAR (mesma resposta para todo motivo).
 */
export function entrar (db, { carteira, nonce, assinatura, agora }) {
  if (typeof nonce !== 'string' || !NONCE_VALIDO.test(nonce)) return RECUSA_ENTRAR
  if (typeof carteira !== 'string' || typeof assinatura !== 'string') return RECUSA_ENTRAR
  const em = ms(agora)
  return transacao(db, () => {
    // Queima ANTES de conferir: uma tentativa por desafio. Só 1 linha muda, ou não é o primeiro uso / venceu.
    const { changes } = db.prepare('UPDATE desafios SET usado_em = ? WHERE nonce = ? AND usado_em IS NULL AND vence_em > ?').run(em, nonce, em)
    if (changes !== 1) return RECUSA_ENTRAR
    const d = db.prepare('SELECT carteira, mensagem FROM desafios WHERE nonce = ?').get(nonce)
    if (!d || d.carteira !== carteira) return RECUSA_ENTRAR
    if (!conferirAssinatura(d.mensagem, d.carteira, assinatura)) return RECUSA_ENTRAR
    const conta = contaDaCarteira(db, d.carteira, { agora: em })
    return { ok: true, token: abrirSessao(db, conta.id, em), conta: buscarConta(db, conta.id) }
  })
}

/** Convidado em 127.0.0.1: sempre a conta convidada local padrão. → { ok: true, token, conta }. */
export function entrarConvidadoLocal (db, { agora }) {
  const em = ms(agora)
  return transacao(db, () => {
    const conta = contaConvidadaLocal(db, { agora: em })
    return { ok: true, token: abrirSessao(db, conta.id, em), conta }
  })
}

function abrirSessao (db, contaId, em) {
  const token = crypto.randomBytes(SESSAO.tokenBytes).toString('base64url')
  db.prepare('INSERT INTO sessoes (hash, conta_id, vence_em, visto_em) VALUES (?, ?, ?, ?)')
    .run(sha256(token), contaId, em + SESSAO.duracaoMs, em)
  return token
}

/**
 * Conta da sessão do token, ou null (sem token, token torto, sessão apagada ou vencida).
 * renovar: true → se passou SESSAO.renovarAposMs desde a última renovação, empurra a validade (7 dias a partir de agora).
 * → { conta, renovou } | null
 */
export function contaDaSessao (db, token, { agora, renovar = true }) {
  if (typeof token !== 'string' || !TOKEN_VALIDO.test(token)) return null
  const em = ms(agora)
  const hash = sha256(token)
  const s = db.prepare('SELECT conta_id, vence_em FROM sessoes WHERE hash = ?').get(hash)
  if (!s || !(s.vence_em > em)) return null
  const conta = buscarConta(db, s.conta_id)
  if (!conta) return null
  let renovou = false
  if (renovar && em + SESSAO.duracaoMs - s.vence_em >= SESSAO.renovarAposMs) {
    db.prepare('UPDATE sessoes SET vence_em = ?, visto_em = ? WHERE hash = ? AND vence_em > ?').run(em + SESSAO.duracaoMs, em, hash, em)
    renovou = true
  }
  return { conta, renovou }
}

/** Sair: apaga a sessão no banco (o token não volta a valer). */
export function sair (db, token) {
  if (typeof token !== 'string' || !TOKEN_VALIDO.test(token)) return
  db.prepare('DELETE FROM sessoes WHERE hash = ?').run(sha256(token))
}

/** Apaga desafios vencidos há mais de SESSAO.guardarDesafiosVencidosMs e sessões há mais de SESSAO.guardarVencidosMs. */
export function limparVencidos (db, { agora }) {
  const em = ms(agora)
  db.prepare('DELETE FROM desafios WHERE vence_em < ?').run(em - SESSAO.guardarDesafiosVencidosMs)
  db.prepare('DELETE FROM sessoes WHERE vence_em < ?').run(em - SESSAO.guardarVencidosMs)
}

/** Todos os valores do cookie `nome` no cabeçalho Cookie (na ordem), ou []. */
export function lerCookies (cabecalho, nome) {
  if (typeof cabecalho !== 'string') return []
  const achados = []
  for (const parte of cabecalho.split(';')) {
    const i = parte.indexOf('=')
    if (i < 0) continue
    if (parte.slice(0, i).trim() === nome) achados.push(parte.slice(i + 1).trim())
  }
  return achados
}

/** Valor do cookie `nome` no cabeçalho Cookie (o primeiro), ou null. Quem lê SESSÃO usa lerCookies (2+ = recusa). */
export function lerCookie (cabecalho, nome) {
  return lerCookies(cabecalho, nome)[0] ?? null
}

/** Set-Cookie da sessão (token vazio + apagar = expira na hora). */
export function linhaDoCookie (token, { seguro, apagar = false } = {}) {
  const partes = [
    `${nomeDoCookie(seguro)}=${apagar ? '' : token}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${apagar ? 0 : Math.floor(SESSAO.duracaoMs / 1000)}`,
  ]
  if (seguro) partes.push('Secure')
  return partes.join('; ')
}
