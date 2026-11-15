// Piloto — a "roupa" do tema de monstros elementais: ids do config → nome, texto e cor em inglês.
// Desenho: docs/ideias/piloto-monstros.md §2–§5. NENHUM número escrito aqui: todo número sai de shared/config.js
// (os textos usam os mesmos campos {i.campo} do config, preenchidos com o valor do config, como o textoDaCarta do motor).
import { BONUS_DE_TIPO, BORDADOS, CARTAS, PARTES, RARIDADES, REGRAS, TIPOS } from '../../shared/config.js'
import { PARAMS_COSTURA } from '../../shared/costura.js'
import { SEGURANCA } from './tatica.js'

// ------------------------------------------------------------------ elementos (a roda do motor não muda)
export const ELEMENTOS = {
  jeans: { nome: 'Bloom', cor: '#4CB944', escuro: '#2E7D3A', claro: '#9BE07A', frase: 'Bloom drinks Tide' },
  seda: { nome: 'Tide', cor: '#2E8BEA', escuro: '#1D5AA8', claro: '#8CC8FF', frase: 'Tide wears down Stone' },
  la: { nome: 'Stone', cor: '#B07A4A', escuro: '#7A5232', claro: '#D8AC78', frase: 'Stone blocks Gale' },
  feltro: { nome: 'Gale', cor: '#E8C547', escuro: '#B08A22', claro: '#FFF0A0', frase: 'Gale blows away Mist' },
  tule: { nome: 'Mist', cor: '#A98BE8', escuro: '#7357B8', claro: '#DCCBFF', frase: 'Mist smothers Ember' },
  couro: { nome: 'Ember', cor: '#F05A3C', escuro: '#A8331F', claro: '#FFA27A', frase: 'Ember burns Bloom' },
}
export const RODA = TIPOS.slice() // cada um bate forte no seguinte
export const bateEm = (tipo) => TIPOS[(TIPOS.indexOf(tipo) + 1) % TIPOS.length]
export const apanhaDe = (tipo) => TIPOS[(TIPOS.indexOf(tipo) + TIPOS.length - 1) % TIPOS.length]
export const BONUS_FORTE_PCT = Math.round(BONUS_DE_TIPO * 100)

// raridade: nunca a cor de um elemento (moldura e gema)
export const RARIDADE = {
  comum: { nome: 'Common', cor: '#C9C2B8' },
  incomum: { nome: 'Uncommon', cor: '#7FE0C8' },
  rara: { nome: 'Rare', cor: '#E2559B' },
  lendaria: { nome: 'Legendary', cor: '#FFB347' },
}
for (const k of Object.keys(RARIDADES)) if (!RARIDADE[k]) throw new Error('raridade sem roupa: ' + k)

// ------------------------------------------------------------------ monstros
export const MONSTROS = {
  rasgao: { nome: 'Burrlet' },
  brigao: { nome: 'Ramblehorn' },
  mordedor: { nome: 'Snapcoal' },
  pisoteador: { nome: 'Cindertusk' },
  desfiado: { nome: 'Ripplance' },
  embolado: { nome: 'Cobblepup' },
  cascudo: { nome: 'Breezle' },
  assombrado: { nome: 'Wispurr' },
  mudo: { nome: 'Lanternewt' },
}

// ------------------------------------------------------------------ partes (nome e apelido)
export const PARTES_EN = {
  cab_botao: ['Burr Head', 'Burr'], cab_brim: ['Ram Horns', 'Ram'], cab_ziper: ['Coal Jaw', 'Coal'], cab_desfiada: ['Wave Crest', 'Crest'],
  cab_gorro: ['Rock Cap', 'Rock'], cab_feltro: ['Storm Brow', 'Owl'], cab_veu: ['Veil Face', 'Veil'], cab_abafada: ['Lamp Snout', 'Lamp'],
  br_rasgado: ['Thorn Vines', 'Lash'], br_cadarco: ['Ember Whip', 'Whip'], br_agulha: ['Lance Fin', 'Lance'], br_cetim: ['Riptide Fins', 'Rip'],
  br_abraco: ['Slab Arms', 'Hug'], br_cruz: ['Tailwind Wings', 'Wing'], br_alfinete: ['Dart Feathers', 'Dart'], br_nevoa: ['Mist Wings', 'Haze'],
  pe_rebite: ['Root Claws', 'Root'], pe_tamanco: ['Magma Hooves', 'Stomp'], pe_sola: ['Ash Paws', 'Ash'], pe_cetim: ['Current Flippers', 'Flip'],
  pe_novelo: ['Boulder Roll', 'Roll'], pe_rolo: ['Quake Feet', 'Quake'], pe_remendo: ['Breeze Talons', 'Talon'], pe_ultimo: ['Wisp Tail', 'Wisp'],
  tr_jeans_rebitado: ['Bramble Torso'], tr_jeans_surrado: ['Sprout Torso'], tr_couro_curtido: ['Coal Torso'], tr_couro_rachado: ['Spark Torso'],
  tr_seda_bordada: ['Shell Torso'], tr_seda_rota: ['Reef Torso'], tr_la_embolada: ['Boulder Torso'], tr_la_tricotada: ['Pebble Torso'],
  tr_feltro_duro: ['Plume Torso'], tr_feltro_manchado: ['Feather Torso'], tr_tule_rasgado: ['Wisp Torso'], tr_tule_armado: ['Lantern Torso'],
  bo_espinho: ['Spiked Hide'], bo_remendo_vivo: ['Mending Moss'], bo_botao_reserva: ['Lucky Scale'], bo_agulha_afiada: ['Keen Claws'],
  bo_pe_de_chumbo: ['Rooted'], bo_olho_de_vidro: ['Hawk Eye'], bo_rancor: ['Last Roar'], bo_bolso_de_linha: ['Glow Pouch'],
}
for (const k of Object.keys(PARTES)) if (!PARTES_EN[k]) throw new Error('parte sem roupa: ' + k)
export const SLOT_EN = { cabeca: 'Head', bracos: 'Arms', pernas: 'Legs', tronco: 'Body', bordado: 'Mark' }
export const nomeDaParte = (id) => PARTES_EN[id]?.[0] ?? id
export const apelidoDaParte = (id) => PARTES_EN[id]?.[1] ?? ''
/** Cor (elemento) da parte: a parte segue o elemento da habilidade que traz; o corpo, o seu tipo; a marca, a do corpo. */
export function elementoDaParte(id, tipoDoCorpo) {
  const p = PARTES[id]
  if (!p) return tipoDoCorpo
  if (p.carta) return CARTAS[p.carta].tipo
  if (p.tipo) return p.tipo
  return tipoDoCorpo
}
/** Nome do filhote pelos apelidos das partes (cabeça-braços-pernas), como o motor monta o nome. */
export function nomePorApelidos(partes) {
  const id = (g) => String(g).split('@')[0]
  return ['cabeca', 'bracos', 'pernas'].map((s) => (partes[s] ? apelidoDaParte(id(partes[s])) : null)).filter(Boolean).join('-')
}

// ------------------------------------------------------------------ marcas e habilidades (modelos de texto em inglês)
export const MARCAS = {
  espinho: { nome: 'Spiked Hide', texto: 'Deals {valor} damage back to whoever hits it with a skill.' },
  remendo_vivo: { nome: 'Mending Moss', texto: "Heals {valor} at the start of each of its team's turns." },
  botao_reserva: { nome: 'Lucky Scale', texto: 'The first hit it takes deals {valor} less.' },
  agulha_afiada: { nome: 'Keen Claws', texto: '+{valor%} damage with Arms skills.' },
  pe_de_chumbo: { nome: 'Rooted', texto: "Takes {valor} less per hit and can't be pushed or pulled." },
  olho_de_vidro: { nome: 'Hawk Eye', texto: '+{valor}% crit chance.' },
  rancor: { nome: 'Last Roar', texto: '+{valor%} damage while in Last Stand.' },
  bolso_de_linha: { nome: 'Glow Pouch', texto: 'When it falls for good, its team gains {valor} Glow.' },
}
export const HABILIDADES = {
  botaozada: { nome: 'Thorn Bash', texto: '{0.valor} damage to the Front.' },
  testada_de_brim: { nome: 'Bramble Ram', texto: '{0.valor} damage to the Front; it takes {1.valor}.' },
  rasgo: { nome: 'Thorn Lash', texto: '{0.valor} damage and Exposed on the target for {1.turnos} turns.' },
  rebite_solto: { nome: 'Root Breaker', texto: "Breaks the target's Guard, then {1.valor} damage." },
  mordida_de_ziper: { nome: 'Cinder Bite', texto: '{0.valor} damage; +{0.bonusFioSolto%} if the target is Exposed.' },
  laco_de_cadarco: { nome: 'Ember Whip', texto: 'Reach; {0.valor} damage and pulls the target one spot forward.' },
  pisao_de_tamanco: { nome: 'Magma Stomp', texto: '{0.valor} damage; +{0.bonusSeMenosVida} if it has less HP than the target.' },
  sola_grossa: { nome: 'Ash Guard', texto: 'Guard {0.valor} on itself.' },
  desfiar: { nome: 'Tidal Crash', texto: '{0.valor} damage to every standing enemy.' },
  agulha_longa: { nome: 'Water Lance', texto: 'Reach; {0.valor} damage anywhere.' },
  lacada_fina: { nome: 'Riptide', texto: 'Reach; {0.valor} damage; +{0.bonusTras} if the target is in the Back.' },
  passo_de_cetim: { nome: 'Current Step', texto: 'Swaps places with an ally and readies {1.qtd} more skill.' },
  gorro_felpudo: { nome: 'Stone Ward', texto: 'Guard {0.valor} on every ally.' },
  abraco_apertado: { nome: 'Bulwark Hug', texto: 'Guard {0.valor} on itself and {1.valor} on a neighbor.' },
  novelo_rolante: { nome: 'Rolling Boulder', texto: '{0.valor} damage and pushes the target one spot back.' },
  rolo_de_la: { nome: 'Quake Stomp', texto: '{0.valor} damage; the rival loses {1.valor} stored Glow.' },
  feltro_pesado: { nome: 'Downdraft', texto: '{0.valor} damage; it heals {1.valor}.' },
  ponto_cruz: { nome: 'Tailwind', texto: 'Readies {0.qtd} more skill; +{0.linhaSeMesmoTipo} Glow if it matches its element.' },
  alfinete_de_feltro: { nome: 'Gust Dart', texto: 'Reach; {0.valor} damage.' },
  remendo_rapido: { nome: 'Soothing Breeze', texto: 'Heals {0.valor} on an ally.' },
  veu_de_tule: { nome: 'Mist Veil', texto: 'The next attack against it misses (guaranteed).' },
  grito_abafado: { nome: 'Fading Howl', texto: '+{0.valor} Glow now; it loses {1.valor} HP.' },
  nevoa_de_tule: { nome: 'Haze Bolt', texto: 'Reach; {0.valor} damage and Exposed on the target for {1.turnos} turns.' },
  ultimo_ponto: { nome: 'Final Wisp', texto: 'Only below {c.limite%} HP or in Last Stand: {0.valor} damage.' },
}
for (const k of Object.keys(CARTAS)) if (!HABILIDADES[k]) throw new Error('habilidade sem roupa: ' + k)
for (const k of Object.keys(BORDADOS)) if (!MARCAS[k]) throw new Error('marca sem roupa: ' + k)

function preencher(modelo, achar) {
  return modelo.replace(/\{([\w.]+?)(%?)\}/g, (_, chave, pct) => {
    const v = achar(chave)
    if (typeof v !== 'number') throw new Error(`Texto com campo desconhecido: {${chave}}`)
    return pct ? `${Math.round(v * 100)}%` : String(v)
  })
}
/** Texto da habilidade com os números do config (mesmos campos do motor). */
export function textoDaHabilidade(id) {
  const c = CARTAS[id]
  return preencher(HABILIDADES[id].texto, (k) => {
    const [a, b] = k.split('.')
    if (a === 'c') return c.condicao?.[b]
    return c.efeitos[Number(a)]?.[b]
  })
}
export function textoDaMarca(id) {
  const b = BORDADOS[id]
  return preencher(MARCAS[id].texto, (k) => b[k])
}
export const nomeDaHabilidade = (id) => HABILIDADES[id]?.nome ?? id
export const SLOT_DA_HABILIDADE = (id) => SLOT_EN[CARTAS[id].parte]

// ------------------------------------------------------------------ equivalentes (textos de regra com números do config)
export const TERMOS = {
  glow: `Glow: ${REGRAS.linhaPorTurno} orbs each turn, up to ${REGRAS.linhaMaxima}. Each skill spends its cost.`,
  guard: 'Guard: absorbs damage before HP.',
  veil: 'Veil: the next attack against it misses.',
  exposed: `Exposed: takes +${Math.round(REGRAS.fioSoltoBonus * 100)}% damage.`,
  lastStand: 'Last Stand: at 0 HP for the first time it stays up until the end of its next turn. It can’t be targeted and only uses its Legs skill.',
  sundown: `Sundown: from turn ${REGRAS.tesouraInicio}, everyone loses ${Math.round(REGRAS.tesouraCorte * 100)}% of max HP each turn.`,
  nightfall: `Nightfall: after turn ${REGRAS.turnoFinal}, the team with the higher total HP % wins.`,
  strong: `Strong!: +${BONUS_FORTE_PCT}% damage when the skill's element beats the target's.`,
  crit: `Critical: +${Math.round(REGRAS.critico * 100)}% damage. Crit % is the chance.`,
  decidido: 'The result is decided when the fight starts.',
}
export const SOL = { desceDe: REGRAS.tesouraInicio - 3, encosta: REGRAS.tesouraInicio, final: REGRAS.turnoFinal }
export const POSICAO_EN = ['Front', 'Middle', 'Back']
export const TATICAS_EN = {
  rush: { nome: 'Rush', texto: 'Attacks first. Reach skills hit the enemy Front.' },
  focus: { nome: 'Focus', texto: 'Attacks first. Reach skills hit the enemy with the lowest HP %.' },
  guard: { nome: 'Guard', texto: `If an ally is at ${Math.round(SEGURANCA.defesaSeAliadoAte * 100)}% HP or less, Guard, Veil and heals come first.` },
}
export const CLUTCHES = PARAMS_COSTURA.carretelVoltas
export const ORDEM_DO_OVO = PARAMS_COSTURA.ordemDeRevelacao // mark, legs, arms, head, body
