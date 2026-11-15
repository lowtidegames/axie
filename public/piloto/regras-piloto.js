// Piloto — as REGRAS PROVISÓRIAS de luta, SÓ do piloto (decisão do dono 15/11/2026 14:04, opção 1 de
// docs/ideias/experimentos-patrulhas.md: "elemento pesa e monstro cansa, números provisórios só no piloto").
// É O ÚNICO LUGAR destes números: a luta, a folha de ordens, a ficha, a tela da luta e os textos leem DAQUI.
// Entram no motor só pelo parâmetro opcional `regras` (shared/batalha.js, regrasDeExperimento); shared/config.js, o
// servidor e o jogo antigo NÃO mudam.

/** Regras de luta do piloto: golpe Strong +75% (o jogo de sempre: +25%) e o corpo recebe 40% menos dano do elemento que ele vence. */
export const REGRAS_PILOTO = Object.freeze({ bonusDeTipo: 0.75, resistencia: 0.4 })

/** Cansaço: depois de `lutasPorDia` lutas no dia do piloto, o monstro começa as lutas seguintes com `vida` da vida máxima. */
export const CANSACO = Object.freeze({ lutasPorDia: 5, vida: 0.75 })

export const PCT_FORTE = Math.round(REGRAS_PILOTO.bonusDeTipo * 100)
export const PCT_RESISTE = Math.round(REGRAS_PILOTO.resistencia * 100)
export const PCT_CANSADO = Math.round(CANSACO.vida * 100)

/** O monstro com `lutasHoje` lutas feitas no dia começa a próxima cansado? */
export const cansado = (lutasHoje) => lutasHoje >= CANSACO.lutasPorDia

/**
 * As `regras` de uma luta do piloto para o motor. `lutasHoje`: lutas já feitas no dia por cada monstro do trio
 * (Front, Middle, Back), contadas ANTES desta luta. A guarda nunca cansa.
 */
export function regrasDaLuta(lutasHoje = [0, 0, 0]) {
  const vidas = lutasHoje.map((n) => (cansado(n) ? CANSACO.vida : 1))
  return vidas.some((v) => v < 1) ? { ...REGRAS_PILOTO, vidaInicial: { A: vidas } } : { ...REGRAS_PILOTO }
}

/**
 * Para a folha de ordens: em que luta de uma patrulha de `n` lutas o monstro passa a lutar cansado.
 * Devolve 0 se já começa cansado, null se não cansa nesta patrulha, ou k (1..n−1): "fica cansado depois da luta k".
 */
export function cansaDepoisDa(lutasHoje, n) {
  if (cansado(lutasHoje)) return 0
  const k = CANSACO.lutasPorDia - lutasHoje
  return k < n ? k : null
}
