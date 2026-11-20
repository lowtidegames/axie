// Keepmile — palavras que não podem aparecer no apelido (troca de apelido, tarefa R22). Lista curta de propósito:
// ofensas óbvias em inglês e nomes que fingem ser da equipe. Confere sem caixa, sem espaço/_/- e com número no lugar
// da letra (4dm1n = admin). Palavra curta que aparece dentro de nome comum (ex.: "mod", "dev") fica de fora.

/** Nomes que fingem ser da equipe. */
export const EQUIPE = ['admin', 'administrador', 'moderator', 'moderador', 'staff', 'official', 'oficial', 'keepmile', 'frayz', 'support', 'suporte', 'gamemaster', 'developer', 'equipe']

/** Ofensas óbvias (inglês). */
export const OFENSAS = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'rapist', 'nazi', 'hitler', 'retard', 'porn', 'pussy', 'asshole']

const BARRADAS = [...EQUIPE, ...OFENSAS]
const NUMERO_POR_LETRA = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b' }

/** Formas de comparar: sem caixa e sem separador; e com os números trocados por letra (o 1 também como l). */
function formas(apelido) {
  const base = String(apelido).toLowerCase().replace(/[ _-]+/g, '')
  const leet = base.replace(/[0134578]/g, (d) => NUMERO_POR_LETRA[d])
  return [base, leet, base.replace(/1/g, 'l').replace(/[034578]/g, (d) => NUMERO_POR_LETRA[d])]
}

/** O apelido contém palavra barrada? */
export function apelidoBarrado(apelido) {
  const f = formas(apelido)
  return BARRADAS.some((p) => f.some((x) => x.includes(p)))
}
