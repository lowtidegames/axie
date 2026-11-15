// Frayz — gerador de números com semente (determinístico), à prova de força bruta.
// Mesma semente → mesma sequência, sempre, no Node e no navegador.
//
// Como funciona (parecer de segurança nº 1, achado A1): SHA-256 em modo contador.
//   chave  = SHA-256(semente em texto, UTF-8)                       → 256 bits; depende de toda a semente
//   bloco  = SHA-256(chave (32 bytes) || contador (8 bytes, big-endian))  → 8 números de 32 bits
// Quem vê as saídas não recupera a chave (seria quebrar o SHA-256), ao contrário de geradores comuns
// (mulberry32, xoshiro, sfc...), cujo estado sai das próprias saídas.
// O estado é JSON puro: { chave: '<64 hex>', contador: n, sobra: [números do bloco ainda não usados] }.
// Nunca vai para a tela (visaoDoTime apaga): quem tem a chave prevê todo sorteio da luta.
//
// API:
//   estadoDaSemente(semente)  → estado
//   passoU32(estado)          → { s: novo estado, u32 }         (o estado recebido não muda)
//   passo(estado)             → { s: novo estado, valor: [0, 1) }
//   inteiroEm(estado, n)      → { s: novo estado, valor: inteiro em [0, n) } sem viés (rejeição)
//   criarRng(semente)         → { proximo(), inteiro(n), estado }  (estado guardado num objeto; ferramentas)
//   embaralhar(lista, inteiro) → NOVO array (Fisher–Yates; inteiro(n) devolve [0, n))
import { H0, compressao, sha256Hex } from './sha256.js'

const DOIS32 = 0x100000000
const w = new Int32Array(64)
const h = new Int32Array(8)

/** Semente (texto ou número) → estado inicial. */
export function estadoDaSemente(semente) {
  return { chave: sha256Hex(String(semente)), contador: 0, sobra: [] }
}

function conferir(estado) {
  if (!estado || typeof estado.chave !== 'string' || !/^[0-9a-f]{64}$/.test(estado.chave) ||
    !Number.isSafeInteger(estado.contador) || estado.contador < 0 || !Array.isArray(estado.sobra)) {
    throw new Error('Estado do sorteio inválido')
  }
}

/** SHA-256(chave || contador): 40 bytes cabem num bloco só. Devolve 8 números de 32 bits. */
function bloco(chave, contador) {
  for (let i = 0; i < 8; i++) w[i] = parseInt(chave.slice(i * 8, i * 8 + 8), 16) | 0
  w[8] = Math.floor(contador / DOIS32) | 0
  w[9] = contador | 0
  w[10] = 0x80000000 | 0 // fim da mensagem
  for (let i = 11; i < 15; i++) w[i] = 0
  w[15] = 40 * 8 // tamanho em bits
  h.set(H0)
  compressao(h, w)
  const out = new Array(8)
  for (let i = 0; i < 8; i++) out[i] = h[i] >>> 0
  return out
}

/** Um número de 32 bits. Não muda o estado recebido. */
export function passoU32(estado) {
  conferir(estado)
  if (estado.sobra.length > 0) {
    return { s: { chave: estado.chave, contador: estado.contador, sobra: estado.sobra.slice(1) }, u32: estado.sobra[0] >>> 0 }
  }
  const b = bloco(estado.chave, estado.contador)
  return { s: { chave: estado.chave, contador: estado.contador + 1, sobra: b.slice(1) }, u32: b[0] }
}

/** Número em [0, 1). */
export function passo(estado) {
  const r = passoU32(estado)
  return { s: r.s, valor: r.u32 / DOIS32 }
}

/** Inteiro em [0, n), sem viés: descarta o pedaço do fim que não fecha uma volta inteira de n. */
export function inteiroEm(estado, n) {
  if (!Number.isInteger(n) || n < 1 || n > DOIS32) throw new Error(`Faixa inválida para sorteio: ${n}`)
  const limite = DOIS32 - (DOIS32 % n) // aceita [0, limite): múltiplo exato de n
  let s = estado
  for (;;) {
    const r = passoU32(s)
    s = r.s
    if (r.u32 < limite) return { s, valor: r.u32 % n }
  }
}

/** Gerador com estado guardado num objeto (simuladores, costura, testes). */
export function criarRng(semente) {
  let s = estadoDaSemente(semente)
  return {
    proximo() { const r = passo(s); s = r.s; return r.valor },
    inteiro(n) { const r = inteiroEm(s, n); s = r.s; return r.valor },
    get estado() { return { chave: s.chave, contador: s.contador, sobra: s.sobra.slice() } },
  }
}

/** Embaralha (Fisher–Yates) com uma função inteiro(n) → [0, n). Devolve um NOVO array. */
export function embaralhar(lista, inteiro) {
  const a = lista.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = inteiro(i + 1)
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}
