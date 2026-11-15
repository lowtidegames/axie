// Frayz — gerador de números com semente (determinístico).
// Mesma semente → mesma sequência, sempre. O estado é um único inteiro de 32 bits (cabe no JSON).
// Algoritmo: mulberry32 (domínio público). A semente em texto vira número por um hash simples (FNV-1a + mistura).

/** Semente (texto ou número) → inteiro sem sinal de 32 bits. */
export function hashSemente(semente) {
  const s = String(semente)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** Um passo do mulberry32: recebe o estado e devolve { s: novo estado, valor: número em [0, 1) }. */
export function passo(estado) {
  const s = (estado + 0x6d2b79f5) >>> 0
  let t = s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return { s, valor: ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** Gerador com estado guardado num objeto (para ferramentas como o simulador). */
export function criarRng(semente) {
  let s = typeof semente === 'number' && Number.isInteger(semente) ? semente >>> 0 : hashSemente(semente)
  return {
    proximo() { const r = passo(s); s = r.s; return r.valor },
    inteiro(n) { const r = passo(s); s = r.s; return Math.floor(r.valor * n) },
    get estado() { return s },
  }
}

/** Embaralha (Fisher–Yates) usando uma função que devolve [0, 1). Devolve um NOVO array. */
export function embaralhar(lista, sortear) {
  const a = lista.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(sortear() * (i + 1))
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}
