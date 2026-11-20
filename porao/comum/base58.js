// Porão — base58 no alfabeto do Bitcoin/Solana (sem 0, O, I, l). ESM puro, sem dependências:
// usado pelo servidor (Node) e pelo navegador. Cada "1" no começo do texto = um byte zero no começo.
// decodificar NUNCA lança erro: texto inválido, fora do alfabeto ou grande demais devolve null.
// MAX_ENTRADA limita o tamanho (bytes em codificar, caracteres em decodificar) para a conta, que é
// quadrática, nunca travar o servidor com um pedido gigante. Chave Solana = 32 bytes (até 44 letras),
// assinatura = 64 bytes (até 88 letras); 256 sobra com folga.

export const ALFABETO = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
export const MAX_ENTRADA = 256

const VALOR = new Int16Array(128).fill(-1)
for (let i = 0; i < ALFABETO.length; i++) VALOR[ALFABETO.charCodeAt(i)] = i

export function codificar (bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('base58: esperava Uint8Array')
  if (bytes.length > MAX_ENTRADA) throw new RangeError('base58: entrada grande demais')
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++
  // dígitos na base 58, do menos significativo para o mais significativo
  const digitos = []
  for (let i = zeros; i < bytes.length; i++) {
    let resto = bytes[i]
    for (let j = 0; j < digitos.length; j++) {
      resto += digitos[j] << 8
      digitos[j] = resto % 58
      resto = (resto / 58) | 0
    }
    while (resto > 0) { digitos.push(resto % 58); resto = (resto / 58) | 0 }
  }
  let saida = '1'.repeat(zeros)
  for (let k = digitos.length - 1; k >= 0; k--) saida += ALFABETO[digitos[k]]
  return saida
}

export function decodificar (texto) {
  if (typeof texto !== 'string' || texto.length > MAX_ENTRADA) return null
  let zeros = 0
  while (zeros < texto.length && texto.charCodeAt(zeros) === 49) zeros++ // '1'
  // bytes na base 256, do menos significativo para o mais significativo
  const bytes = []
  for (let i = zeros; i < texto.length; i++) {
    const c = texto.charCodeAt(i)
    const v = c < 128 ? VALOR[c] : -1
    if (v < 0) return null
    let resto = v
    for (let j = 0; j < bytes.length; j++) {
      resto += bytes[j] * 58
      bytes[j] = resto & 0xff
      resto >>= 8
    }
    while (resto > 0) { bytes.push(resto & 0xff); resto >>= 8 }
  }
  const saida = new Uint8Array(zeros + bytes.length)
  for (let k = 0; k < bytes.length; k++) saida[saida.length - 1 - k] = bytes[k]
  return saida
}
