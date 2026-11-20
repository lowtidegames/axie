// Piloto — as REGRAS PROVISÓRIAS, SÓ do piloto. É O ÚNICO LUGAR destes números: a luta e as telas leem DAQUI.
// Decisões do dono: 15/11 14:04 (elemento pesa e monstro cansa) e 15/11 15:10 (cansaço depois de 7 lutas no dia).
// Entram no motor só pelo parâmetro opcional `regras` (shared/batalha.js, regrasDeExperimento); shared/config.js,
// o servidor e o jogo antigo NÃO mudam.

/** Luta: golpe Strong +75% (o jogo de sempre: +25%) e o corpo recebe 40% menos dano do elemento que ele vence. */
export const REGRAS_PILOTO = Object.freeze({ bonusDeTipo: 0.75, resistencia: 0.4 })

/** Cansaço: depois de `lutasPorDia` lutas no dia, o monstro começa as lutas seguintes com `vida` da vida máxima. */
export const CANSACO = Object.freeze({ lutasPorDia: 7, vida: 0.75 })

/** Pontos de uma vitória no lugar n (1..5): lugar mais difícil vale mais. Derrota vale 0. PROVISÓRIO, só do piloto. */
export const pontosDaVitoria = (n) => n

/** O monstro com `lutasHoje` lutas feitas no dia começa a próxima cansado? */
export const cansado = (lutasHoje) => lutasHoje >= CANSACO.lutasPorDia

/**
 * As `regras` de uma luta do piloto para o motor. `lutasHoje`: lutas já feitas no dia por cada monstro do time
 * (Front, Middle, Back), contadas ANTES desta luta. A guarda nunca cansa.
 */
export function regrasDaLuta(lutasHoje = [0, 0, 0]) {
  const vidas = lutasHoje.map((n) => (cansado(n) ? CANSACO.vida : 1))
  return vidas.some((v) => v < 1) ? { ...REGRAS_PILOTO, vidaInicial: { A: vidas } } : { ...REGRAS_PILOTO }
}
