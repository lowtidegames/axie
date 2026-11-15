// Motor — os 5 lugares da estrada (idle por patrulhas), cada um com GUARDA FIXA. Desenho: docs/ideias/jogo-idle.md (N2, N4).
// Só dados de luta (quem guarda, em que posição, com que tática e ordem). NENHUM número de economia aqui: o peso de
// cada lugar e a regra da sequência são da economia (docs/ideias/economia-do-pote.md) e não moram neste arquivo.
// Ids neutros (lugar1..lugar5): os nomes de tela ficam fora do motor. Os trios são os de public/js/aventura-dados.js
// (= docs/ideias/piloto-monstros.md §8); a ordem na lista é a posição: 1º = Front, 2º = Middle, 3º = Back.
//
// API:
//   LUGARES                    → [{ id, guarda: [3 ids], ordens: { tatica, ordem: [[cartas]×3] } }]
//   lugar(id)                  → o lugar (lança erro se não existe)
//   vantagens(trio, guarda)    → por monstro do trio: contra quantos da guarda bate forte e de quantos apanha forte
import { bateForte, montarBoneco } from './batalha.js'
import { CARTAS } from './config.js'
import { TATICAS, ordemPadrao } from './tatica.js'

// Guarda (Front, Middle, Back) e tática de cada lugar; a ordem das habilidades é a de fábrica do escolhedor.
// Os trios são os da Aventura; a FORMAÇÃO e a TÁTICA mudam muito a força da guarda (vitória média do jogador de 20% a 67%
// no mesmo lugar). Regra usada: entre as 18 (6 formações × 3 táticas), a que deixa a vitória média do jogador mais perto
// da escada que o economista mediu para as fases (58 · 52 · 41 · 33 · 31%, docs/ideias/economia-do-pote.md §5), para os
// pesos de hoje serem medidos com a dificuldade para a qual foram feitos (escolha feita numa medição curta, 84 trios × 12
// lutas). Na matriz inteira (tools/simular-patrulhas.mjs, 400 lutas por casa, todas as formações e táticas do jogador)
// a vitória média ficou 54,5 · 58,0 · 43,8 · 35,1 · 44,9%: a escada não sobe sempre (o 5 não fica tão duro com este trio).
const GUARDAS = [
  { id: 'lugar1', guarda: ['embolado', 'mudo', 'mordedor'], tatica: 'rush' },
  { id: 'lugar2', guarda: ['assombrado', 'brigao', 'cascudo'], tatica: 'guard' },
  { id: 'lugar3', guarda: ['desfiado', 'rasgao', 'embolado'], tatica: 'guard' },
  { id: 'lugar4', guarda: ['assombrado', 'cascudo', 'pisoteador'], tatica: 'rush' },
  { id: 'lugar5', guarda: ['brigao', 'desfiado', 'pisoteador'], tatica: 'focus' },
]

export const LUGARES = Object.freeze(GUARDAS.map((g) => {
  if (!TATICAS.includes(g.tatica)) throw new Error('tática desconhecida: ' + g.tatica)
  const ordem = g.guarda.map((id, i) => ordemPadrao(montarBoneco(id).cartas, i))
  return Object.freeze({ id: g.id, guarda: Object.freeze(g.guarda.slice()), ordens: Object.freeze({ tatica: g.tatica, ordem: Object.freeze(ordem) }) })
}))

export function lugar(id) {
  const l = LUGARES.find((x) => x.id === id)
  if (!l) throw new Error('Lugar desconhecido: ' + id)
  return l
}

const ehDano = (carta) => CARTAS[carta].efeitos.some((x) => x.tipo === 'dano')

/**
 * "Strong vs / Weak to" da folha de ordens, pela regra do motor (bateForte: elemento da HABILIDADE contra o do CORPO).
 * trio e guarda: listas de bonecos (id pronto ou { partes }). Só habilidades de dano contam.
 * Devolve, para cada monstro do trio: { forte, fraco, forteEm: [índices da guarda], apanhaDe: [índices da guarda] }.
 */
export function vantagens(trio, guarda) {
  const fichas = (lista) => lista.map((d) => {
    const f = montarBoneco(d)
    return { tipo: f.tipo, tiposDeDano: [...new Set(f.cartas.filter(ehDano).map((c) => CARTAS[c].tipo))] }
  })
  const meus = fichas(trio), deles = fichas(guarda)
  return meus.map((m) => {
    const forteEm = [], apanhaDe = []
    deles.forEach((g, j) => {
      if (m.tiposDeDano.some((t) => bateForte(t, g.tipo))) forteEm.push(j)
      if (g.tiposDeDano.some((t) => bateForte(t, m.tipo))) apanhaDe.push(j)
    })
    return { forte: forteEm.length, fraco: apanhaDe.length, forteEm, apanhaDe }
  })
}
