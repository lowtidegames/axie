// Frayz — SHA-256 pequeno, síncrono, em JavaScript puro (sem dependências).
// Roda igual no Node e no navegador: o motor da luta (importado pela tela) usa este arquivo para o sorteio.
// Conferido contra os vetores oficiais (FIPS 180-4) e contra a implementação do Node em tests/servidor/rng.test.js.
//
// API:
//   sha256(bytes: Uint8Array)        → Uint8Array(32)
//   sha256Hex(texto | Uint8Array)    → texto de 64 letras hex (texto entra em UTF-8)
//   utf8(texto)                      → Uint8Array
//   compressao(h, w)                 → aplica um bloco (16 palavras em w[0..15]) ao estado h (8 palavras), no lugar

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])
export const H0 = Object.freeze([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])

/** Um bloco de 512 bits: w tem pelo menos 64 posições (as 16 primeiras são o bloco; o resto é usado como rascunho). */
export function compressao(h, w) {
  for (let i = 16; i < 64; i++) {
    const a = w[i - 15], b = w[i - 2]
    const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3)
    const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10)
    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
  }
  let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7]
  for (let i = 0; i < 64; i++) {
    const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))
    const ch = (e & f) ^ (~e & g)
    const t1 = (hh + S1 + ch + K[i] + w[i]) | 0
    const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))
    const maj = (a & b) ^ (a & c) ^ (b & c)
    const t2 = (S0 + maj) | 0
    hh = g; g = f; f = e; e = (d + t1) | 0
    d = c; c = b; b = a; a = (t1 + t2) | 0
  }
  h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0
  h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0
}

/** Texto → bytes UTF-8 (sem depender de TextEncoder). */
export function utf8(texto) {
  const s = String(texto), out = []
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i)
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1)
      if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++ }
    }
    if (c >= 0xd800 && c <= 0xdfff) c = 0xfffd // metade solta de par: vira o caractere de troca (como o UTF-8 padrão)
    if (c < 0x80) out.push(c)
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
  }
  return Uint8Array.from(out)
}

/** SHA-256 de bytes → 32 bytes. */
export function sha256(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('sha256 espera Uint8Array')
  const n = bytes.length
  const total = Math.ceil((n + 9) / 64) * 64
  const m = new Uint8Array(total)
  m.set(bytes)
  m[n] = 0x80
  const bits = n * 8
  const dv = new DataView(m.buffer)
  dv.setUint32(total - 8, Math.floor(bits / 0x100000000))
  dv.setUint32(total - 4, bits >>> 0)
  const h = Int32Array.from(H0), w = new Int32Array(64)
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getInt32(off + i * 4)
    compressao(h, w)
  }
  const out = new Uint8Array(32), dvo = new DataView(out.buffer)
  for (let i = 0; i < 8; i++) dvo.setInt32(i * 4, h[i])
  return out
}

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))
export const paraHex = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i++) s += HEX[bytes[i]]; return s }

/** SHA-256 de um texto (UTF-8) ou de bytes → 64 letras hex. */
export function sha256Hex(entrada) {
  return paraHex(sha256(entrada instanceof Uint8Array ? entrada : utf8(entrada)))
}
