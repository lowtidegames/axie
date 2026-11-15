// Frayz — apelido (parecer de segurança nº 1, achado A10; nº 2, achado S2-5).
// Forma de MOSTRAR: NFKC (letra larga, ligadura e afins viram a letra comum), sem espaço nas pontas, espaços seguidos viram um.
// Aceita só letras A–Z (maiúsculas e minúsculas), as letras acentuadas comuns do português (e ñ, ü...), números 0–9,
// espaço, ponto, traço e _. Letra parecida de fora dessa lista (о cirílico, α grego, İ/ı turcos, ɑ, ᴀ, ǀ, ß...) é recusada.
// Forma de COMPARAR (única no banco): sem acento e sem caixa, e com as letras que se confundem na tela juntas
// (I, l e 1 valem o mesmo; O e 0 também). "Ana", " ANA ", "Âna" e "Ａｎａ" são o mesmo apelido; "lana" e "Iana" também.

/** Forma de mostrar. */
export function limparApelido(s) {
  return String(s).normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

/**
 * Forma de comparar (vai para o índice único). Desde a v4 (tarefa 16): "rn" vale "m" (na tela parecem iguais) e
 * ponto, traço, _ e espaço nas PONTAS não contam (".Ana_" é "Ana").
 */
export function chaveDoApelido(s) {
  return chaveDoApelidoV3(s).replace(/rn/g, 'm').replace(/^[ ._-]+|[ ._-]+$/g, '')
}

/** Forma de comparar da migração v3 (congelada: migração antiga não muda). */
export function chaveDoApelidoV3(s) {
  return limparApelido(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[i1]/g, 'l').replace(/0/g, 'o')
}

/** Forma de comparar da migração v2 (congelada: migração antiga não muda). */
export function chaveDoApelidoV2(s) {
  return limparApelido(s).toLowerCase()
}

const ACENTUADAS = 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ'
const PERMITIDO = new RegExp(`^[A-Za-z0-9 ._\\-${ACENTUADAS}]+$`)
const TEM_LETRA_OU_NUMERO = new RegExp(`[A-Za-z0-9${ACENTUADAS}]`)

/** O apelido já limpo segue a regra? (tamanho conferido por quem chama) */
export function apelidoPermitido(limpo) {
  return PERMITIDO.test(limpo) && TEM_LETRA_OU_NUMERO.test(limpo)
}

/**
 * Apelido antigo fora da regra de hoje → forma válida (para a migração): tira acento das letras de fora da lista,
 * troca o resto por espaço. Sobrou pouco (menos de `min` letras) → "Jogador <id>". Até `max` letras.
 */
export function apelidoValido(antigo, id, { min = 3, max = 20 } = {}) {
  const limpo = limparApelido(antigo)
  if (limpo.length >= min && limpo.length <= max && apelidoPermitido(limpo)) return limpo
  const base = [...limpo.normalize('NFD').replace(/\p{M}/gu, '')]
    .map((c) => (PERMITIDO.test(c) ? c : ' ')).join('').replace(/ +/g, ' ').trim().slice(0, max).trimEnd()
  return base.length >= min && apelidoPermitido(base) ? base : `Jogador ${id}`
}
