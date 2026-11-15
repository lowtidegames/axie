// Frayz — Costura (cruzamento), genes, desgaste e Carretel. Lógica pura e determinística:
// sem banco, sem rede, sem tela, sem dinheiro. Todo sorteio sai de shared/rng.js, em ordem fixa.
// Entradas nunca são mudadas: toda função devolve cópias. Tudo é JSON puro.
//
// Modelo do boneco (genes):
//   {
//     id, nome?,
//     partes: { tronco|cabeca|bracos|pernas|bordado: { face: 'id@raridade', forro: 'id@raridade' } },
//       face  = dominante, visível, é a que LUTA
//       forro = recessivo, escondido ("olhar o avesso")
//     voltasUsadas,      // Carretel: costuras já feitas por ele
//     pontosDeCostura,   // desgaste (1 por luta); só visual até o limite
//     pais: [idA, idB] | [], geracao, estado: 'ativo'|'aposentado', ocupado: false,
//     lutas, vitorias, maiorGolpe,   // para o Mural
//     casulo?: { ordem: [partes], aberto }   // só no filho recém-costurado
//   }
//
// API pública:
//   PARAMS_COSTURA                                  → parâmetros (PROVISÓRIOS; o diretor move para shared/config.js)
//   gerarBonecoInicial(rng, opcoes?)               → boneco de origem
//   chancesDaCostura(paiA, paiB)                    → { parte: { face: [{gene, raridade, chance}], forro: [...], raridadeDaFace: {...} } }
//   costurar({ semente, paiA, paiB, idFilho? })     → { ok, filho, pais: [A, B], custo, sorteios } | { ok:false, codigo, motivo }
//   podeCosturar(paiA, paiB)                        → { ok } | { ok:false, codigo, motivo }
//   custoDaCostura(paiA, paiB)                      → número (só calcula; nada é cobrado aqui)
//   abrirCasulo(boneco)                             → cópia com o casulo aberto
//   olharOAvesso(boneco)                            → { parte: 'id@raridade' } (os forros)
//   registrarLuta(boneco, { venceu?, maiorGolpe? }) → cópia com +Pontos de Costura (não muda força)
//   nivelDeRemendo(boneco)                          → 0..PARAMS_COSTURA.desgaste.niveisDeRemendo (só visual)
//   podeAposentar(boneco)                           → boolean
//   aposentar(boneco)                               → { ok, boneco, retalhos, mural } | { ok:false, codigo, motivo }
//   paraLuta(boneco)                                → { nome?, partes } que criarLuta/montarBoneco aceitam (só as faces)
//   validarBoneco(boneco)                           → { ok } | { ok:false, codigo, motivo }
import { montarBoneco } from './batalha.js'
import { PARTES, RARIDADES } from './config.js'
import { criarRng } from './rng.js'

export const PARTES_DO_BONECO = ['tronco', 'cabeca', 'bracos', 'pernas', 'bordado']

// ---------------------------------------------------------------------------------------------
// Parâmetros — TODOS PROVISÓRIOS. Só viram regra depois do simulador (tools/simular-costura.mjs),
// do economista e do "sim" do dono. Aqui só até o diretor mover para shared/config.js.
// ---------------------------------------------------------------------------------------------
export const PARAMS_COSTURA = {
  // Genes (desenho aprovado, docs/ideias/batalha-e-criaturas.md §4)
  chanceDoPaiA: 0.5, // PROVISÓRIO — cada parte vem de A ou de B
  chanceDaFace: 0.7, // PROVISÓRIO — do pai escolhido: 70% a face, 30% o forro
  // forro do filho: sorteado em partes iguais entre as 4 opções dos pais (face A, forro A, face B, forro B)

  // Chances de raridade do boneco de ORIGEM (publicáveis; somam 1). Face e forro sorteados à parte, parte a parte.
  chancesDeRaridade: { comum: 0.60, incomum: 0.25, rara: 0.12, lendaria: 0.03 }, // PROVISÓRIO

  // Carretel: quantas costuras cada boneco pode fazer na vida
  carretelVoltas: 5, // PROVISÓRIO (proposta da economia: 5)

  // Custo (só calculado; não há moeda aqui): base × multiplicador ^ (voltas já usadas por A + por B)
  custo: { base: 4, multiplicadorPorVolta: 1.25, casas: 2 }, // PROVISÓRIO (unidade da economia, a definir)

  // Parentes próximos não costuram entre si (regra PROVISÓRIA)
  parentes: {
    paiEFilho: true, // um é pai do outro
    irmaos: 'umPaiEmComum', // 'umPaiEmComum' (meio-irmãos também) · 'mesmosPais' (só irmãos inteiros) · false
  },

  // Ordem em que o casulo abre na tela (o tronco por último: é o que define o tipo)
  ordemDeRevelacao: ['bordado', 'pernas', 'bracos', 'cabeca', 'tronco'], // PROVISÓRIO

  // Desgaste (Pontos de Costura). Não muda força.
  desgaste: {
    pontosPorLuta: 1, // PROVISÓRIO
    limite: 1200, // PROVISÓRIO (proposta da economia: 1.200 lutas)
    niveisDeRemendo: 5, // PROVISÓRIO — 0..5 remendos visíveis
    lutaDepoisDoLimite: false, // PROVISÓRIO — no limite ele só pode se aposentar
  },

  // Aposentadoria: Retalhos Honrados por FACE, pela raridade (o forro não conta)
  retalhosPorRaridade: { comum: 1, incomum: 2, rara: 3, lendaria: 5 }, // PROVISÓRIO
}

// ---------------------------------------------------------------------------------------------
// ajudas
// ---------------------------------------------------------------------------------------------

const recusa = (codigo, motivo) => ({ ok: false, codigo, motivo })
const copiar = (x) => JSON.parse(JSON.stringify(x))
const raridadeDe = (gene) => String(gene).split('@')[1] ?? 'comum'
const idDe = (gene) => String(gene).split('@')[0]

function lerGene(gene, parte) {
  if (typeof gene !== 'string' || !gene.includes('@')) return `gene sem raridade em ${parte}`
  const [id, rar] = gene.split('@')
  const p = PARTES[id]
  if (!p) return `parte desconhecida em ${parte}: ${id}`
  if (p.slot !== parte) return `a parte ${id} não serve em ${parte}`
  if (!RARIDADES[rar]) return `raridade desconhecida: ${rar}`
  return null
}

/** Confere a forma do boneco (sem mudar nada). */
export function validarBoneco(b) {
  if (!b || typeof b !== 'object' || !b.partes || typeof b.partes !== 'object') return recusa('BONECO_INVALIDO', 'Boneco inválido.')
  if (typeof b.id !== 'string' || !b.id) return recusa('BONECO_INVALIDO', 'Boneco sem identificação.')
  for (const p of PARTES_DO_BONECO) {
    const g = b.partes[p]
    if (!g || typeof g !== 'object') return recusa('BONECO_INVALIDO', `Boneco sem a parte ${p}.`)
    const erro = lerGene(g.face, p) ?? lerGene(g.forro, p)
    if (erro) return recusa('BONECO_INVALIDO', `Boneco inválido: ${erro}.`)
  }
  for (const k of ['voltasUsadas', 'pontosDeCostura']) {
    if (!Number.isSafeInteger(b[k] ?? 0) || (b[k] ?? 0) < 0) return recusa('BONECO_INVALIDO', `Boneco inválido: ${k}.`)
  }
  if (b.estado !== undefined && b.estado !== 'ativo' && b.estado !== 'aposentado') return recusa('BONECO_INVALIDO', 'Estado do boneco inválido.')
  return { ok: true }
}

function sortearRaridade(rng, tabela) {
  const r = rng.proximo()
  let soma = 0
  const ordem = Object.keys(tabela)
  for (const k of ordem) { soma += tabela[k]; if (r < soma) return k }
  return ordem[ordem.length - 1]
}

function idsDoSlot(parte) {
  return Object.keys(PARTES).filter((k) => PARTES[k].slot === parte) // ordem fixa da config
}

function novoBoneco({ id, nome, partes, pais = [], geracao = 0 }) {
  const b = { id, partes, voltasUsadas: 0, pontosDeCostura: 0, pais, geracao, estado: 'ativo', ocupado: false, lutas: 0, vitorias: 0, maiorGolpe: 0 }
  if (typeof nome === 'string' && nome) b.nome = nome.slice(0, 40)
  return b
}

// ---------------------------------------------------------------------------------------------
// boneco de origem
// ---------------------------------------------------------------------------------------------

/**
 * Boneco de origem: para cada parte (ordem fixa), sorteia id da face, raridade da face, id do forro, raridade do forro.
 * rng: objeto de criarRng (ou uma semente). opcoes: { id, nome, chancesDeRaridade, partesFixas: { parte: 'id' } }
 */
export function gerarBonecoInicial(rng, opcoes = {}) {
  const r = rng && typeof rng.proximo === 'function' ? rng : criarRng(rng ?? 'origem')
  const tabela = opcoes.chancesDeRaridade ?? PARAMS_COSTURA.chancesDeRaridade
  const partes = {}
  for (const p of PARTES_DO_BONECO) {
    const ids = idsDoSlot(p)
    const fixo = opcoes.partesFixas?.[p]
    const idFace = ids[r.inteiro(ids.length)]
    const rarFace = sortearRaridade(r, tabela)
    const idForro = ids[r.inteiro(ids.length)]
    const rarForro = sortearRaridade(r, tabela)
    partes[p] = { face: `${fixo ?? idFace}@${rarFace}`, forro: `${idForro}@${rarForro}` }
  }
  const id = typeof opcoes.id === 'string' && opcoes.id ? opcoes.id : `org_${(r.inteiro(0x7fffffff) >>> 0).toString(36)}`
  return novoBoneco({ id, nome: opcoes.nome, partes })
}

// ---------------------------------------------------------------------------------------------
// chances (o que a tela mostra ANTES de confirmar) — batem com o sorteio de costurar()
// ---------------------------------------------------------------------------------------------

function somarEm(mapa, gene, chance) { mapa.set(gene, (mapa.get(gene) ?? 0) + chance) }

function listar(mapa) {
  return [...mapa.entries()]
    .map(([gene, chance]) => ({ gene, id: idDe(gene), raridade: raridadeDe(gene), chance }))
    .sort((a, b) => b.chance - a.chance || (a.gene < b.gene ? -1 : a.gene > b.gene ? 1 : 0))
}

/** Para cada parte: resultados possíveis da FACE e do FORRO do filho, com a chance exata de cada um. */
export function chancesDaCostura(paiA, paiB) {
  for (const b of [paiA, paiB]) { const v = validarBoneco(b); if (!v.ok) throw new Error(v.motivo) }
  const pA = PARAMS_COSTURA.chanceDoPaiA, pB = 1 - pA
  const fc = PARAMS_COSTURA.chanceDaFace, fr = 1 - fc
  const saida = {}
  for (const p of PARTES_DO_BONECO) {
    const a = paiA.partes[p], b = paiB.partes[p]
    const face = new Map(), forro = new Map()
    somarEm(face, a.face, pA * fc)
    somarEm(face, a.forro, pA * fr)
    somarEm(face, b.face, pB * fc)
    somarEm(face, b.forro, pB * fr)
    for (const g of [a.face, a.forro, b.face, b.forro]) somarEm(forro, g, 0.25)
    const listaFace = listar(face)
    const raridadeDaFace = {}
    for (const k of Object.keys(RARIDADES)) raridadeDaFace[k] = 0
    for (const x of listaFace) raridadeDaFace[x.raridade] += x.chance
    saida[p] = { face: listaFace, forro: listar(forro), raridadeDaFace }
  }
  return saida
}

// ---------------------------------------------------------------------------------------------
// costura
// ---------------------------------------------------------------------------------------------

/** Custo da costura (só o número; nada é cobrado aqui). */
export function custoDaCostura(paiA, paiB) {
  const { base, multiplicadorPorVolta, casas } = PARAMS_COSTURA.custo
  const voltas = (paiA?.voltasUsadas ?? 0) + (paiB?.voltasUsadas ?? 0)
  const f = 10 ** casas
  return Math.round(base * multiplicadorPorVolta ** voltas * f) / f
}

function parentesProximos(a, b) {
  const regra = PARAMS_COSTURA.parentes
  const pa = Array.isArray(a.pais) ? a.pais : [], pb = Array.isArray(b.pais) ? b.pais : []
  if (regra.paiEFilho && (pa.includes(b.id) || pb.includes(a.id))) return 'Um é pai do outro.'
  if (regra.irmaos && pa.length && pb.length) {
    if (regra.irmaos === 'umPaiEmComum' && pa.some((x) => pb.includes(x))) return 'São irmãos.'
    if (regra.irmaos === 'mesmosPais' && pa.length === pb.length && pa.every((x) => pb.includes(x))) return 'São irmãos.'
  }
  return null
}

/** Confere se A e B podem costurar agora (sem sortear nada). */
export function podeCosturar(paiA, paiB) {
  for (const b of [paiA, paiB]) { const v = validarBoneco(b); if (!v.ok) return v }
  if (paiA.id === paiB.id) return recusa('MESMO_BONECO', 'Escolha dois bonecos diferentes.')
  for (const b of [paiA, paiB]) {
    if (b.estado === 'aposentado') return recusa('APOSENTADO', `${b.nome ?? b.id} está aposentado e não costura mais.`)
    if (b.ocupado) return recusa('OCUPADO', `${b.nome ?? b.id} está em uso agora.`)
    if ((b.voltasUsadas ?? 0) >= PARAMS_COSTURA.carretelVoltas) return recusa('CARRETEL_CHEIO', `O Carretel de ${b.nome ?? b.id} acabou.`)
  }
  const par = parentesProximos(paiA, paiB)
  if (par) return recusa('PARENTES', `Parentes próximos não costuram: ${par}`)
  return { ok: true }
}

/**
 * Costura A + B. Ordem fixa de sorteios, parte a parte (PARTES_DO_BONECO): 1) de qual pai (A se < chanceDoPaiA);
 * 2) face ou forro desse pai (face se < chanceDaFace); 3) forro do filho: inteiro 0..3 → [faceA, forroA, faceB, forroB].
 * Sempre 3 sorteios por parte (15 no total). Os pais voltam com +1 volta usada no Carretel.
 */
export function costurar({ semente, paiA, paiB, idFilho } = {}) {
  if (!(typeof semente === 'string' && semente.length > 0 && semente.length <= 200) && !Number.isSafeInteger(semente)) {
    return recusa('SEMENTE_INVALIDA', 'Semente inválida.')
  }
  const pode = podeCosturar(paiA, paiB)
  if (!pode.ok) return pode
  const rng = criarRng(`costura:${semente}`)
  const partes = {}, sorteios = []
  for (const p of PARTES_DO_BONECO) {
    const a = paiA.partes[p], b = paiB.partes[p]
    const r1 = rng.proximo(), r2 = rng.proximo(), r3 = rng.inteiro(4)
    const dePai = r1 < PARAMS_COSTURA.chanceDoPaiA ? 'A' : 'B'
    const lado = r2 < PARAMS_COSTURA.chanceDaFace ? 'face' : 'forro'
    const face = (dePai === 'A' ? a : b)[lado]
    const opcoes = [a.face, a.forro, b.face, b.forro]
    const forro = opcoes[r3]
    partes[p] = { face, forro }
    sorteios.push({ parte: p, face: { dePai, lado, gene: face }, forro: { dePai: r3 < 2 ? 'A' : 'B', lado: r3 % 2 === 0 ? 'face' : 'forro', gene: forro } })
  }
  const id = typeof idFilho === 'string' && idFilho ? idFilho : `cos_${(rng.inteiro(0x7fffffff) >>> 0).toString(36)}`
  const custo = custoDaCostura(paiA, paiB)
  const filho = novoBoneco({ id, partes, pais: [paiA.id, paiB.id], geracao: Math.max(paiA.geracao ?? 0, paiB.geracao ?? 0) + 1 })
  filho.casulo = { ordem: PARAMS_COSTURA.ordemDeRevelacao.slice(), aberto: false }
  const novoA = copiar(paiA), novoB = copiar(paiB)
  novoA.voltasUsadas = (novoA.voltasUsadas ?? 0) + 1
  novoB.voltasUsadas = (novoB.voltasUsadas ?? 0) + 1
  return { ok: true, filho, pais: [novoA, novoB], custo, sorteios }
}

/** A tela terminou de abrir o casulo. */
export function abrirCasulo(boneco) {
  const b = copiar(boneco)
  if (b.casulo) b.casulo.aberto = true
  return b
}

/** "Olhar o avesso": os forros (recessivos). */
export function olharOAvesso(boneco) {
  const v = validarBoneco(boneco)
  if (!v.ok) throw new Error(v.motivo)
  return Object.fromEntries(PARTES_DO_BONECO.map((p) => [p, boneco.partes[p].forro]))
}

// ---------------------------------------------------------------------------------------------
// desgaste e aposentadoria
// ---------------------------------------------------------------------------------------------

/** Pontos de Costura chegaram ao limite? */
export function podeAposentar(boneco) {
  return boneco?.estado !== 'aposentado' && (boneco?.pontosDeCostura ?? 0) >= PARAMS_COSTURA.desgaste.limite
}

/** 0..niveisDeRemendo — só visual. */
export function nivelDeRemendo(boneco) {
  const { limite, niveisDeRemendo } = PARAMS_COSTURA.desgaste
  const pts = Math.max(0, boneco?.pontosDeCostura ?? 0)
  return Math.min(niveisDeRemendo, Math.floor((pts * niveisDeRemendo) / limite))
}

/** Soma uma luta: Pontos de Costura, lutas, vitórias e maior golpe. Não muda força. Lança erro se não pode lutar. */
export function registrarLuta(boneco, { venceu = false, maiorGolpe = 0 } = {}) {
  podeLutarOuErro(boneco)
  const b = copiar(boneco)
  const { pontosPorLuta, limite } = PARAMS_COSTURA.desgaste
  b.pontosDeCostura = Math.min(limite, (b.pontosDeCostura ?? 0) + pontosPorLuta)
  b.lutas = (b.lutas ?? 0) + 1
  if (venceu) b.vitorias = (b.vitorias ?? 0) + 1
  const g = Number.isFinite(maiorGolpe) ? Math.max(0, Math.round(maiorGolpe)) : 0
  b.maiorGolpe = Math.max(b.maiorGolpe ?? 0, g)
  return b
}

/** Aposenta: muda o estado, devolve Retalhos Honrados (pelas faces) e o registro para o Mural. */
export function aposentar(boneco) {
  const v = validarBoneco(boneco)
  if (!v.ok) return v
  if (boneco.estado === 'aposentado') return recusa('APOSENTADO', 'Ele já está aposentado.')
  if (boneco.ocupado) return recusa('OCUPADO', 'Ele está em uso agora.')
  if (!podeAposentar(boneco)) return recusa('AINDA_NAO', 'Ainda não chegou a hora de se aposentar.')
  let retalhos = 0
  for (const p of PARTES_DO_BONECO) retalhos += PARAMS_COSTURA.retalhosPorRaridade[raridadeDe(boneco.partes[p].face)] ?? 0
  const b = copiar(boneco)
  b.estado = 'aposentado'
  delete b.casulo
  const ficha = montarBoneco(paraLutaSemTrava(b))
  const mural = {
    id: b.id, nome: ficha.nome, partes: ficha.partes, geracao: b.geracao ?? 0, pais: (b.pais ?? []).slice(),
    lutas: b.lutas ?? 0, vitorias: b.vitorias ?? 0, maiorGolpe: b.maiorGolpe ?? 0, voltasUsadas: b.voltasUsadas ?? 0,
  }
  return { ok: true, boneco: b, retalhos, mural }
}

// ---------------------------------------------------------------------------------------------
// luta
// ---------------------------------------------------------------------------------------------

function podeLutarOuErro(boneco) {
  const v = validarBoneco(boneco)
  if (!v.ok) throw new Error(v.motivo)
  if (boneco.estado === 'aposentado') throw new Error(`${boneco.nome ?? boneco.id} está aposentado e não luta mais.`)
  if (!PARAMS_COSTURA.desgaste.lutaDepoisDoLimite && (boneco.pontosDeCostura ?? 0) >= PARAMS_COSTURA.desgaste.limite) {
    throw new Error(`${boneco.nome ?? boneco.id} chegou ao limite de remendos: só pode se aposentar.`)
  }
}

function paraLutaSemTrava(boneco) {
  const d = { partes: Object.fromEntries(PARTES_DO_BONECO.map((p) => [p, boneco.partes[p].face])) }
  if (typeof boneco.nome === 'string' && boneco.nome) d.nome = boneco.nome
  return d
}

/** Definição que criarLuta/montarBoneco aceitam (só as faces). Lança erro se ele não pode lutar. */
export function paraLuta(boneco) {
  podeLutarOuErro(boneco)
  return paraLutaSemTrava(boneco)
}
