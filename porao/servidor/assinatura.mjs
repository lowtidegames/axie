// Porão — login por ASSINATURA de mensagem (decisão do dono 20/11 18:17; desenho em
// docs/porao/desenho-abertura.md). Carteira Solana = chave pública Ed25519 de 32 bytes em base58.
// Aqui NÃO há rede, NÃO há transação e NÃO há token: só montar o texto que a carteira assina e
// conferir a assinatura com node:crypto. Quem guarda o nonce, a validade e o uso único é a sessão.
import crypto from 'node:crypto'
import { decodificar } from '../comum/base58.js'

// Cabeçalho DER (SPKI) de uma chave pública Ed25519; depois dele vêm os 32 bytes da chave.
const SPKI_ED25519 = Buffer.from('302a300506032b6570032100', 'hex')

// Só ASCII imprimível: carteiras físicas com visor pequeno exibem mal (ou recusam) texto fora do ASCII.
const SO_ASCII = /^[\x21-\x7e]+$/
const MAX_CAMPO = 128

function campo (nome, v) {
  if (typeof v !== 'string' || v.length === 0 || v.length > MAX_CAMPO || !SO_ASCII.test(v)) {
    throw new TypeError(`montarMensagem: ${nome} inválido`)
  }
  return v
}

function hora (nome, v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new TypeError(`montarMensagem: ${nome} inválido`)
  return new Date(v).toISOString()
}

// Formato SIWS (Sign In With Solana, CAIP-122; mesma ordem de campos do padrão público das carteiras):
//   <domínio> wants you to sign in with your Solana account:\n<carteira>\n\n<frase>\n\nURI: ...\nVersion: 1\n
//   Chain ID: mainnet\nNonce: ...\nIssued At: <ISO>\nExpiration Time: <ISO>
// A carteira (Phantom, Solflare, Backpack) reconhece esse texto e compara o <domínio> com a origem do site que pediu
// a assinatura: é ela que barra o revezamento (site falso mostrando a nossa mensagem). O servidor não tem como saber
// quem mostrou o texto. Login NÃO toca a rede: "Chain ID" é só o rótulo que o padrão pede.
export const FRASE_SIWS = 'Entrar no Porao. Isto nao e uma transacao e nao gasta nada.'
const DOMINIO_VALIDO = /^[a-z0-9.-]{1,100}(:[0-9]{1,5})?$/ // host[:porta], sem esquema, sem caminho
const NONCE_SIWS = /^[A-Za-z0-9]{8,128}$/ // padrão: alfanumérico, no mínimo 8

// Texto fixo, em ASCII, linhas separadas por \n. emitida e vence em ms (relógio do servidor).
// dominio e uri vêm SÓ do servidor (nunca do pedido nem do cabeçalho Host); uri = http(s)://<dominio>.
export function montarMensagem ({ dominio, uri, carteira, nonce, emitida, vence } = {}) {
  campo('dominio', dominio)
  if (!DOMINIO_VALIDO.test(dominio)) throw new TypeError('montarMensagem: dominio inválido')
  campo('uri', uri)
  if (uri !== `https://${dominio}` && uri !== `http://${dominio}`) throw new TypeError('montarMensagem: uri inválida')
  campo('carteira', carteira)
  if (!chavePublicaDe(carteira)) throw new TypeError('montarMensagem: carteira inválida')
  campo('nonce', nonce)
  if (!NONCE_SIWS.test(nonce)) throw new TypeError('montarMensagem: nonce inválido')
  const e = hora('emitida', emitida)
  const v = hora('vence', vence)
  if (!(vence > emitida)) throw new TypeError('montarMensagem: vence precisa ser depois de emitida')
  return [
    `${dominio} wants you to sign in with your Solana account:`,
    carteira,
    '',
    FRASE_SIWS,
    '',
    `URI: ${uri}`,
    'Version: 1',
    'Chain ID: mainnet',
    `Nonce: ${nonce}`,
    `Issued At: ${e}`,
    `Expiration Time: ${v}`,
  ].join('\n')
}

// Chaves de ORDEM PEQUENA (e as formas não canônicas delas): com uma delas, uma assinatura forjada
// (ex.: 64 zeros) confere em várias mensagens sem ninguém ter a chave privada — o Node aceita.
// Comparação ignora o bit de sinal (último byte & 0x7f), como no libsodium. Prova no teste.
const ORDEM_PEQUENA = [
  '0100000000000000000000000000000000000000000000000000000000000000',
  'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  '0000000000000000000000000000000000000000000000000000000000000000',
  '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05',
  'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a',
  'edffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  'eeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
].map((h) => Buffer.from(h, 'hex'))

function ordemPequena (chave) {
  return ORDEM_PEQUENA.some((r) => {
    for (let i = 0; i < 31; i++) if (chave[i] !== r[i]) return false
    return (chave[31] & 0x7f) === r[31]
  })
}

// Carteira em base58 → os 32 bytes da chave pública, ou null se não for exatamente 32 bytes
// (ou se for chave de ordem pequena, que não pertence a ninguém e aceita assinatura forjada).
export function chavePublicaDe (carteiraBase58) {
  const b = decodificar(carteiraBase58)
  return b && b.length === 32 && !ordemPequena(b) ? b : null
}

// true só se a assinatura (64 bytes em base58) da mensagem (texto UTF-8 ou bytes) é desta carteira.
// Nunca lança erro: qualquer entrada torta devolve false.
export function conferirAssinatura (mensagem, carteiraBase58, assinaturaBase58) {
  try {
    let msg
    if (typeof mensagem === 'string') msg = Buffer.from(mensagem, 'utf8')
    else if (mensagem instanceof Uint8Array) msg = mensagem
    else return false
    const chave = chavePublicaDe(carteiraBase58)
    if (!chave) return false
    const assinatura = decodificar(assinaturaBase58)
    if (!assinatura || assinatura.length !== 64) return false
    const objetoChave = crypto.createPublicKey({
      key: Buffer.concat([SPKI_ED25519, chave]),
      format: 'der',
      type: 'spki',
    })
    return crypto.verify(null, msg, objetoChave, assinatura) === true
  } catch {
    return false
  }
}
