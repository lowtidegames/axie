// Frayz — apelido (parecer de segurança nº 1, achado A10).
// Forma de MOSTRAR: NFKC (letra larga, ligadura e afins viram a letra comum), sem espaço nas pontas, espaços seguidos viram um.
// Forma de COMPARAR (única no banco): a de mostrar, em minúsculas. "Ana", " ANA " e "Ａｎａ" são o mesmo apelido.
// Aceita só letras do alfabeto latino (com acento), números 0–9, espaço, ponto, traço e _ — letra de outro alfabeto
// que imita a latina (о cirílico, α grego...) é recusada, assim como acento solto empilhado.

/** Forma de mostrar. */
export function limparApelido(s) {
  return String(s).normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

/** Forma de comparar (vai para o índice único). */
export function chaveDoApelido(s) {
  return limparApelido(s).toLowerCase()
}

// cada caractere: letra que é do alfabeto latino, ou 0-9, espaço, ponto, traço, _
const PERMITIDO = /^(?:(?=\p{L})\p{Script=Latin}|[0-9 ._-])+$/u
const TEM_LETRA_OU_NUMERO = /[\p{L}0-9]/u

/** O apelido já limpo segue a regra? (tamanho conferido por quem chama) */
export function apelidoPermitido(limpo) {
  return PERMITIDO.test(limpo) && TEM_LETRA_OU_NUMERO.test(limpo)
}
