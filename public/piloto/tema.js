// Piloto — a "roupa" do tema de monstros elementais: ids do config → nome, texto e cor em inglês.
// Desenho: docs/ideias/piloto-monstros.md §2–§5. NENHUM número escrito aqui: todo número sai do motor (shared/).
import { PARTES, RARIDADES, TIPOS } from '../../shared/config.js'
import { PARAMS_COSTURA } from '../../shared/costura.js'

// ------------------------------------------------------------------ elementos (a roda do motor não muda)
export const ELEMENTOS = {
  jeans: { nome: 'Bloom', cor: '#4CB944', escuro: '#2E7D3A', claro: '#9BE07A', frase: 'Bloom drinks Tide' },
  seda: { nome: 'Tide', cor: '#2E8BEA', escuro: '#1D5AA8', claro: '#8CC8FF', frase: 'Tide wears down Stone' },
  la: { nome: 'Stone', cor: '#B07A4A', escuro: '#7A5232', claro: '#D8AC78', frase: 'Stone blocks Gale' },
  feltro: { nome: 'Gale', cor: '#E8C547', escuro: '#B08A22', claro: '#FFF0A0', frase: 'Gale blows away Mist' },
  tule: { nome: 'Mist', cor: '#A98BE8', escuro: '#7357B8', claro: '#DCCBFF', frase: 'Mist smothers Ember' },
  couro: { nome: 'Ember', cor: '#F05A3C', escuro: '#A8331F', claro: '#FFA27A', frase: 'Ember burns Bloom' },
}
for (const t of TIPOS) if (!ELEMENTOS[t]) throw new Error('elemento sem roupa: ' + t)

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
/** Nome do filhote pelos apelidos das partes (cabeça-braços-pernas), como o motor monta o nome. */
export function nomePorApelidos(partes) {
  const id = (g) => String(g).split('@')[0]
  return ['cabeca', 'bracos', 'pernas'].map((s) => (partes[s] ? apelidoDaParte(id(partes[s])) : null)).filter(Boolean).join('-')
}

export const POSICAO_EN = ['Front', 'Middle', 'Back']
export const CLUTCHES = PARAMS_COSTURA.carretelVoltas
export const ORDEM_DAS_PARTES = ['tronco', 'cabeca', 'bracos', 'pernas', 'bordado']

// ------------------------------------------------------------------ NOMES do jogo e dos lugares (PROVISÓRIOS: o dono troca)
// Todo nome de jogo/lugar que aparece na tela sai DAQUI. Para trocar um nome, mude só este bloco.
export const NOMES = {
  jogo: 'The Lantern Road',
  lugares: { 1: 'Hollyfield', 2: 'Millbrook', 3: 'Thornwood Edge', 4: 'Stonebridge Watch', 5: 'Crownhold Keep' },
}
export const nomeDoLugar = (n) => NOMES.lugares[n] ?? `Place ${n}`

// Os dois avisos que ficam (curtos, sem promessa de ganho)
export const AVISOS = {
  regras: 'Pilot — numbers are being tested.',
  decidido: 'The result of each fight is decided when it starts.',
}
