// Porão — regra do apelido de dev (abertura, decisão do dono 20/11 18:17). Puro: serve ao servidor e à tela.
// validarApelido(texto) → { ok, apelido, chave, erro }
//   apelido: o texto como fica gravado (sem espaço nas pontas, forma NFC);
//   chave: minúsculas e sem acento — é ela que precisa ser única (contas.apelido_chave UNIQUE);
//   erro: chave de texto de nomes.js ('apelido.erro.curto' | 'apelido.erro.feio'); 'apelido.erro.usado' vem do servidor.
// Letras: só do alfabeto latino, com ou sem acento (sem acento a chave fica só a-z, 0-9 e _). Outros alfabetos
// são recusados: letra que parece latina e não é (cirílico) deixaria dois apelidos iguais na tela.
// O filtro de palavrão é SIMPLES (o desenho aceita): troca leet (0→o 1→i 3→e 4→a 5→s @→a), aceita letra repetida
// e procura uma lista curta em português. Palavra curta só conta inteira (entre _), para não pegar "computador".

/** Limites técnicos do apelido (não é número de economia). */
export const APELIDO = Object.freeze({ minimo: 3, maximo: 20 })

export const ERROS_DO_APELIDO = Object.freeze({
  curto: 'apelido.erro.curto',
  feio: 'apelido.erro.feio',
  usado: 'apelido.erro.usado',
})

const LEET = Object.freeze({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', '@': 'a' })

/** Aparecendo em qualquer lugar do apelido (já sem leet e sem letra repetida). */
const PALAVROES_EM_QUALQUER_LUGAR = Object.freeze([
  'porra', 'caralh', 'buceta', 'merda', 'foder', 'fodid', 'fodase', 'cuzao', 'arrombad', 'piroca',
  'xoxota', 'punhet', 'bosta', 'putari', 'babaca', 'otario', 'vagabunda', 'viadinh', 'boquete',
])
/** Só como parte inteira (separada por _ ou no começo/fim). */
const PALAVROES_INTEIROS = Object.freeze([
  'puta', 'puto', 'cu', 'fdp', 'pqp', 'vsf', 'tnc', 'vtnc', 'foda', 'viado', 'rola', 'pinto', 'cacete',
])

// Cada letra da palavra pode vir repetida ("merrrda"), mas nunca some: "porra" exige 2 r, e "porao" passa.
const elastica = p => [...p].map(c => `${c}+`).join('')
const SOLTA = new RegExp(PALAVROES_EM_QUALQUER_LUGAR.map(elastica).join('|'))
const INTEIRA = new RegExp(`^(?:${PALAVROES_INTEIROS.map(elastica).join('|')})$`)

/** Minúsculas, sem acento. Devolve null se sobrar algo fora de a-z, 0-9 e _. */
export function chaveDoApelido(texto) {
  if (typeof texto !== 'string') return null
  const s = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return /^[a-z0-9_]*$/.test(s) ? s : null
}

function temPalavrao(chave) {
  const limpa = chave.replace(/[01345@]/g, c => LEET[c])
  if (SOLTA.test(limpa.replaceAll('_', ''))) return true
  return limpa.split('_').some(parte => INTEIRA.test(parte))
}

const recusa = erro => ({ ok: false, apelido: null, chave: null, erro })

export function validarApelido(texto) {
  if (typeof texto !== 'string') return recusa(ERROS_DO_APELIDO.curto)
  const apelido = texto.trim().normalize('NFC')
  const tamanho = [...apelido].length
  if (tamanho < APELIDO.minimo) return recusa(ERROS_DO_APELIDO.curto)
  if (tamanho > APELIDO.maximo) return recusa(ERROS_DO_APELIDO.feio)
  // Cada caractere (já em NFC) tem de ser 1 letra latina (com acento composto), número ou _: nada de acento solto.
  if (!/^[A-Za-z0-9_À-ÖØ-öø-ÿ]+$/u.test(apelido)) return recusa(ERROS_DO_APELIDO.feio)
  const chave = chaveDoApelido(apelido)
  if (chave === null || [...chave].length !== tamanho) return recusa(ERROS_DO_APELIDO.feio)
  if (temPalavrao(chave)) return recusa(ERROS_DO_APELIDO.feio)
  return { ok: true, apelido, chave, erro: null }
}
