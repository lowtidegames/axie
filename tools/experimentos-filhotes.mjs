// Tarefa 35 — patrulhas com CONTAS REALISTAS (filhotes de cruzamento de verdade). Só MEDE: nenhum número do jogo muda
// (shared/config.js intocado; o motor só é chamado com as `regras` de experimento da tarefa 33).
//   node tools/experimentos-filhotes.mjs [--workers W] [--semente S] [--rapido]
// Pergunta: com filhotes de partes misturadas, a melhor estratégia (qual trio vai a qual lugar, como repartir as 20
// energias) passa a depender da conta? Mede os critérios a–f do economista POR CONTA, a "receita da internet", a
// robustez dos pesos, o cruzamento de propósito contra o cruzamento ao acaso e os efeitos colaterais.
//
// Gerador de contas (puro, determinístico; testes em tests/servidor/filhotes.test.js):
//   prontoComGenes(nome, rng, id)          → boneco de origem com as faces do pronto e forros sorteados (gerarBonecoInicial)
//   gerarConta(semente, { modo })          → { id, bonecos, cruzamentos, alvo? } — 6 a 9 prontos + 2 a 4 costuras
//       modo 'acaso' (pais ao acaso) · 'proposito' (pais que dão o filhote que mais bate forte na guarda de um lugar)
//   gerarContaMadura(semente)              → 10 a 15 monstros, metade filhotes, a maior parte deles de 2ª geração
//   chaveDoMonstro(boneco) · defDoMonstro(chave) · copiasDaConta(conta) → Map chave → cópias
//   notaContraGuarda(chances, guarda)      → quanto o filhote esperado bate forte na guarda (conta exata pelas chances)
//
// Medição: triagem (1 formação de fábrica, rush, poucas lutas) de TODOS os trios de cada conta; os melhores de cada
// lugar (e os 4 melhores trios só de prontos) vão à medição completa (18 formações × táticas em 2 etapas e depois
// lutas novas na melhor, para a vitória não sair inflada pelo "máximo de 18"). Cansaço: a mesma melhor formação com
// 75% da vida. Resultados em .cache/filhotes/ (não commitado).
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { createHash } from 'node:crypto'
import { bateForte, montarBoneco } from '../shared/batalha.js'
import { BONECOS_PRONTOS, CARTAS, PARTES, RARIDADES } from '../shared/config.js'
import { PARTES_DO_BONECO, abrirCasulo, chancesDaCostura, costurar, gerarBonecoInicial, podeCosturar } from '../shared/costura.js'
import { criarRng } from '../shared/rng.js'
import { LUGARES } from '../shared/lugares.js'
import { TATICAS, lutaAutomatica } from '../shared/tatica.js'
import { FORMACOES, economiaDeHoje, mediana, pontos } from './simular-patrulhas.mjs'
import { planoDaConta, valorPatrulha } from './experimentos-patrulhas.mjs'

export const PRONTOS = Object.keys(BONECOS_PRONTOS)
const ehDano = (id) => CARTAS[id].efeitos.some((x) => x.tipo === 'dano')

// ------------------------------------------------------------------ gerador de contas (puro)

/** Boneco de origem com as faces do pronto `nome` e os forros sorteados como em gerarBonecoInicial. */
export function prontoComGenes(nome, rng, id) {
  if (!BONECOS_PRONTOS[nome]) throw new Error('Pronto desconhecido: ' + nome)
  const b = gerarBonecoInicial(rng, { id })
  for (const p of PARTES_DO_BONECO) b.partes[p].face = BONECOS_PRONTOS[nome].partes[p]
  b.pronto = nome
  return b
}

/** Chave de luta do monstro: as 5 faces (o que luta). Dois bonecos com as mesmas faces são cópias. */
export const chaveDoMonstro = (b) => PARTES_DO_BONECO.map((p) => b.partes[p].face).join('|')
export const defDoMonstro = (chave) => { const g = chave.split('|'); return { partes: Object.fromEntries(PARTES_DO_BONECO.map((p, i) => [p, g[i]])) } }
const CHAVE_DO_PRONTO = new Map(PRONTOS.map((n) => [PARTES_DO_BONECO.map((p) => BONECOS_PRONTOS[n].partes[p]).join('|'), n]))
export const nomeDaChave = (k) => CHAVE_DO_PRONTO.get(k) ?? null

/** Map chave → cópias (só bonecos ativos). `filtro(b)` opcional (ex.: só prontos). */
export function copiasDaConta(conta, filtro = () => true) {
  const m = new Map()
  for (const b of conta.bonecos) if (b.estado !== 'aposentado' && filtro(b)) { const k = chaveDoMonstro(b); m.set(k, (m.get(k) ?? 0) + 1) }
  return m
}

/** Guarda de um lugar: tipos dos corpos e tipos das habilidades de dano (com repetição). */
function fichaDaGuarda(l) {
  const fs = LUGARES[l].guarda.map((id) => montarBoneco(id))
  return { corpos: fs.map((f) => f.tipo), dano: fs.flatMap((f) => f.cartas.filter(ehDano).map((c) => CARTAS[c].tipo)) }
}
const GUARDAS = LUGARES.map((_, l) => fichaDaGuarda(l))

/**
 * Nota esperada do filhote contra uma guarda, pelas chances exatas da costura (só as FACES lutam):
 * corpo: +1 por habilidade de dano da guarda que ele resiste (o corpo vence aquele elemento), −1 por uma que bate forte nele;
 * cabeça, braços, pernas: +1 por corpo da guarda em que a habilidade de dano bate forte.
 */
export function notaContraGuarda(chances, guarda) {
  let s = 0
  for (const x of chances.tronco.face) {
    const t = PARTES[x.id].tipo
    let v = 0
    for (const d of guarda.dano) { if (bateForte(d, t)) v -= 1; if (bateForte(t, d)) v += 1 }
    s += x.chance * v
  }
  for (const p of ['cabeca', 'bracos', 'pernas']) for (const x of chances[p].face) {
    const c = PARTES[x.id].carta
    if (!ehDano(c)) continue
    let v = 0
    for (const g of guarda.corpos) if (bateForte(CARTAS[c].tipo, g)) v += 1
    s += x.chance * v
  }
  return s
}

function paresPermitidos(bonecos, filtro = () => true) {
  const out = []
  for (let i = 0; i < bonecos.length; i++) for (let j = i + 1; j < bonecos.length; j++) {
    if (!filtro(bonecos[i], bonecos[j])) continue
    if (podeCosturar(bonecos[i], bonecos[j]).ok) out.push([i, j])
  }
  return out
}

function melhorParPara(bonecos, l, filtro) {
  let best = null
  for (const [i, j] of paresPermitidos(bonecos, filtro)) {
    const n = notaContraGuarda(chancesDaCostura(bonecos[i], bonecos[j]), GUARDAS[l])
    if (!best || n > best.n + 1e-12) best = { i, j, n }
  }
  return best
}

function costurarNaConta(bonecos, i, j, semente, idFilho) {
  const r = costurar({ semente, paiA: bonecos[i], paiB: bonecos[j], idFilho })
  if (!r.ok) throw new Error(`costura recusada (${r.codigo}): ${r.motivo}`)
  bonecos[i] = r.pais[0]; bonecos[j] = r.pais[1]
  const filho = abrirCasulo(r.filho)
  bonecos.push(filho)
  return { pais: [r.pais[0].id, r.pais[1].id], filho: filho.id }
}

/**
 * Conta realista: 6 a 9 prontos sorteados (com repetição; cada cópia com forros próprios) e 2 a 4 costuras de verdade.
 * O sorteio dos prontos e do número de costuras é o mesmo em qualquer modo (contas "gêmeas" para comparar).
 * modo 'acaso': cada costura escolhe um par permitido ao acaso. modo 'proposito': escolhe um lugar-alvo (o lugar
 * em que o melhor par dá a maior nota) e a cada costura usa o par de maior notaContraGuarda para esse lugar.
 */
export function gerarConta(semente, { modo = 'acaso', minProntos = 6, maxProntos = 9, minCostura = 2, maxCostura = 4 } = {}) {
  const rng = criarRng(`conta:${semente}`)
  const n = minProntos + rng.inteiro(maxProntos - minProntos + 1)
  const bonecos = []
  for (let j = 0; j < n; j++) bonecos.push(prontoComGenes(PRONTOS[rng.inteiro(PRONTOS.length)], rng, `${semente}.p${j}`))
  const nc = minCostura + rng.inteiro(maxCostura - minCostura + 1)
  const escolha = criarRng(`pares:${semente}`)
  const cruzamentos = []
  let alvo = null
  if (modo === 'proposito') {
    let best = null
    for (let l = 0; l < LUGARES.length; l++) { const m = melhorParPara(bonecos, l); if (m && (!best || m.n > best.n + 1e-12)) best = { ...m, l } }
    alvo = best.l
  }
  for (let c = 0; c < nc; c++) {
    let i, j
    if (modo === 'proposito') ({ i, j } = melhorParPara(bonecos, alvo))
    else if (modo === 'acaso') { const ps = paresPermitidos(bonecos); [i, j] = ps[escolha.inteiro(ps.length)] }
    else throw new Error('modo desconhecido: ' + modo)
    cruzamentos.push(costurarNaConta(bonecos, i, j, `${semente}:c${c}`, `${semente}.f${c}`))
  }
  return { id: String(semente), modo, alvo, bonecos, cruzamentos }
}

/**
 * Conta madura: 10 a 15 monstros; metade (arredondada para baixo) são filhotes: 2 de 1ª geração (prontos × prontos)
 * e o resto de 2ª geração (um pai de 1ª geração e o outro qualquer que possa). Pais ao acaso entre os pares permitidos.
 */
export function gerarContaMadura(semente) {
  const rng = criarRng(`madura:${semente}`)
  const m = 10 + rng.inteiro(6)
  const f = Math.floor(m / 2), g1 = 2, g2 = f - g1, np = m - f
  const bonecos = []
  for (let j = 0; j < np; j++) bonecos.push(prontoComGenes(PRONTOS[rng.inteiro(PRONTOS.length)], rng, `${semente}.p${j}`))
  const cruzamentos = []
  for (let c = 0; c < g1; c++) {
    const ps = paresPermitidos(bonecos, (a, b) => (a.geracao ?? 0) === 0 && (b.geracao ?? 0) === 0)
    const [i, j] = ps[rng.inteiro(ps.length)]
    cruzamentos.push(costurarNaConta(bonecos, i, j, `${semente}:m${c}`, `${semente}.f${c}`))
  }
  for (let c = 0; c < g2; c++) {
    const ps = paresPermitidos(bonecos, (a, b) => ((a.geracao ?? 0) === 1 || (b.geracao ?? 0) === 1) && (a.geracao ?? 0) < 2 && (b.geracao ?? 0) < 2)
    const [i, j] = ps[rng.inteiro(ps.length)]
    cruzamentos.push(costurarNaConta(bonecos, i, j, `${semente}:n${c}`, `${semente}.g${c}`))
  }
  return { id: String(semente), modo: 'madura', alvo: null, bonecos, cruzamentos }
}

// ------------------------------------------------------------------ regimes de luta e medição (pura; worker ou direto)

export const REGIMES = {
  hoje: undefined,
  o1: { bonusDeTipo: 0.75, resistencia: 0.40 },
  o2: { resistencia: 0.40 },
}
export const VIDA_CANSADO = 0.75
export const OPCOES = {
  hoje: { nota: 'regras de hoje (+25%, sem resistência, sem cansaço)', regime: 'hoje', div: {} },
  o1: { nota: 'opção 1: +75%, resistência 40%, cansaço depois de 5 lutas (75% da vida)', regime: 'o1', div: { v6: { k: 5, vida: VIDA_CANSADO } } },
  'o1-sem-cansaco': { nota: 'opção 1 sem cansaço: +75%, resistência 40%', regime: 'o1', div: {} },
  o2: { nota: 'opção 2: só resistência 40% + cansaço depois de 5 lutas', regime: 'o2', div: { v6: { k: 5, vida: VIDA_CANSADO } } },
}

const vence = (semente, time, tatica, a, regras) => lutaAutomatica({ semente, timeA: time, timeB: LUGARES[a].guarda, ordensA: { tatica }, ordensB: LUGARES[a].ordens, regras, registro: false }).resultado.vencedor === 'A'
const cansado = (regras) => ({ ...(regras || {}), vidaInicial: { A: [VIDA_CANSADO, VIDA_CANSADO, VIDA_CANSADO] } })

/** Regimes em que a triagem roda (a opção 2 fica entre os dois; os candidatos são a união). */
export const REGIMES_DA_TRIAGEM = ['hoje', 'o1']

/**
 * Triagem de um trio: vitória MÉDIA nas 6 formações (tática rush, L lutas cada), por regime e lugar.
 * A média das formações erra menos que o máximo (medido nos 84 trios de prontos: perde 0,8 ponto contra 8 do máximo).
 * Devolve { regime: [5 taxas] }.
 */
export function triarTrio(defs, { L, semente }) {
  const out = {}
  for (const r of REGIMES_DA_TRIAGEM) {
    out[r] = LUGARES.map((_, a) => {
      let v = 0
      for (const f of FORMACOES) { const time = f.map((i) => defs[i]); for (let i = 0; i < L; i++) if (vence(`${semente}:T:${i}`, time, 'rush', a, REGIMES[r])) v++ }
      return v / (L * FORMACOES.length)
    })
  }
  return out
}

/**
 * Medição completa de um trio num regime, nos 5 lugares. Etapa A: 18 configurações × LA lutas; etapa B: as `topB`
 * melhores + LB lutas; escolhe a melhor (A+B) e mede LF lutas NOVAS nela (p) e, se pedir, cansado (pt).
 * Devolve { p: [5], pt: [5]|null, cfg: [5 × [f, k]], mediaA: [5] }.
 */
export function medirTrio(defs, regime, { LA, LB, LF, topB, semente, comCansaco }) {
  const regras = REGIMES[regime]
  const out = { p: [], pt: comCansaco ? [] : null, cfg: [], mediaA: [] }
  for (let a = 0; a < LUGARES.length; a++) {
    const notas = []
    let soma = 0
    for (let f = 0; f < FORMACOES.length; f++) for (let k = 0; k < TATICAS.length; k++) {
      const time = FORMACOES[f].map((i) => defs[i])
      let v = 0
      for (let i = 0; i < LA; i++) if (vence(`${semente}:A:${i}`, time, TATICAS[k], a, regras)) v++
      notas.push({ f, k, v }); soma += v
    }
    out.mediaA.push(soma / (notas.length * LA))
    notas.sort((x, y) => y.v - x.v || x.f * 3 + x.k - (y.f * 3 + y.k))
    const top = notas.slice(0, topB)
    for (const n of top) {
      const time = FORMACOES[n.f].map((i) => defs[i])
      for (let i = 0; i < LB; i++) if (vence(`${semente}:B:${i}`, time, TATICAS[n.k], a, regras)) n.v++
    }
    top.sort((x, y) => y.v - x.v || x.f * 3 + x.k - (y.f * 3 + y.k))
    const { f, k } = top[0]
    const time = FORMACOES[f].map((i) => defs[i])
    let v = 0, vt = 0
    for (let i = 0; i < LF; i++) {
      if (vence(`${semente}:F:${i}`, time, TATICAS[k], a, regras)) v++
      if (comCansaco && vence(`${semente}:F:${i}`, time, TATICAS[k], a, cansado(regras))) vt++
    }
    out.p.push(v / LF); out.cfg.push([f, k])
    if (comCansaco) out.pt.push(vt / LF)
  }
  return out
}

/**
 * Força de UM monstro: time X = [monstro, 2 prontos sorteados] contra time Y = 3 prontos sorteados (formação e tática
 * sorteadas), cada par jogado dos dois lados com a mesma semente. Devolve a vitória de X (0..1) e, se `extra`, turnos e
 * quantas vezes quem começou venceu.
 */
export function forcaDoMonstro(def, regime, { n, semente, extra = false }) {
  const rng = criarRng(`forca:${semente}`)
  let v = 0, lutas = 0, turnos = 0, comecou = 0
  for (let i = 0; i < n; i++) {
    const ids = PRONTOS.slice(), y = []
    for (let k = 0; k < 3; k++) y.push(ids.splice(rng.inteiro(ids.length), 1)[0])
    const ids2 = PRONTOS.slice(), comp = []
    for (let k = 0; k < 2; k++) comp.push(ids2.splice(rng.inteiro(ids2.length), 1)[0])
    const pos = rng.inteiro(3)
    const x = comp.slice(); x.splice(pos, 0, def)
    const tx = TATICAS[rng.inteiro(3)], ty = TATICAS[rng.inteiro(3)]
    for (const [A, B, ta, tb, lado] of [[x, y, tx, ty, 'A'], [y, x, ty, tx, 'B']]) {
      const r = lutaAutomatica({ semente: `${semente}:${i}`, timeA: A, timeB: B, ordensA: { tatica: ta }, ordensB: { tatica: tb }, regras: REGIMES[regime], registro: extra })
      lutas++
      if (r.resultado.vencedor === lado) v++
      if (extra) { turnos += r.resultado.turno; if (r.eventos[0]?.comecou === r.resultado.vencedor) comecou++ }
    }
  }
  return { v: v / lutas, lutas, turnos: extra ? turnos / lutas : null, quemComeca: extra ? comecou / lutas : null }
}

/** Luta espelhada entre dois trios quaisquer (defs), formação e tática dadas. */
export function espelho(x, y, tx, ty, regime, semente) {
  const out = []
  for (const [A, B, ta, tb] of [[x, y, tx, ty], [y, x, ty, tx]]) {
    const r = lutaAutomatica({ semente, timeA: A, timeB: B, ordensA: { tatica: ta }, ordensB: { tatica: tb }, regras: REGIMES[regime] })
    out.push({ vencedor: r.resultado.vencedor, turnos: r.resultado.turno, comecou: r.eventos[0]?.comecou })
  }
  return out
}

function trabalho({ tipo, itens, cfg }) {
  if (tipo === 'triagem') return itens.map((defs) => triarTrio(defs, cfg))
  if (tipo === 'completo') return itens.map(([defs, regime]) => medirTrio(defs, regime, { ...cfg, comCansaco: regime !== 'hoje' }))
  if (tipo === 'forca') return itens.map(([def, regime, sem]) => forcaDoMonstro(def, regime, { ...cfg, semente: sem }))
  if (tipo === 'espelho') return itens.map(([x, y, tx, ty, regime, sem]) => espelho(x, y, tx, ty, regime, sem))
  throw new Error('trabalho desconhecido ' + tipo)
}

if (!isMainThread && workerData?.filhotes) parentPort.postMessage(trabalho(workerData))

/** Roda `tipo` sobre `itens` em W workers (resultado na mesma ordem; não depende de W). */
export async function emParalelo(tipo, itens, cfg, workers = availableParallelism()) {
  const n = Math.max(1, Math.min(workers, itens.length))
  if (n <= 1) return trabalho({ tipo, itens, cfg })
  const partes = Array.from({ length: n }, () => [])
  itens.forEach((_, i) => partes[i % n].push(i))
  const out = new Array(itens.length)
  await Promise.all(partes.map((ix) => new Promise((ok, falha) => {
    const w = new Worker(new URL(import.meta.url), { workerData: { filhotes: true, tipo, itens: ix.map((i) => itens[i]), cfg } })
    w.once('message', (res) => { res.forEach((x, j) => { out[ix[j]] = x }); ok() })
    w.once('error', falha)
    w.once('exit', (c) => { if (c !== 0) falha(new Error('worker saiu com ' + c)) })
  })))
  return out
}

// ------------------------------------------------------------------ trios das contas

/** Todos os trios de chaves distintas da conta (chaves ordenadas). */
export function triosDaConta(tem) {
  const ks = [...tem.keys()].sort()
  const out = []
  for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) for (let c = b + 1; c < ks.length; c++) out.push([ks[a], ks[b], ks[c]])
  return out
}
export const chaveDoTrio = (t) => t.join('#')

// ------------------------------------------------------------------ análise (pura)

const argmax = (xs) => xs.reduce((bi, x, i) => (x > xs[bi] ? i : bi), 0)
const quantil = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); if (!s.length) return NaN; const i = (s.length - 1) * q; const lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo) }

/** Pesos "cenário B" (inverso da vitória média do lugar nos 84 trios de prontos), na escala de hoje. */
export function pesosDoRegime(medidas84, eco) {
  const media = LUGARES.map((_, l) => medidas84.reduce((s, m) => s + m.mediaA[l], 0) / medidas84.length)
  const base = media.map((m) => (1 / Math.max(m, 1e-6)) / (1 / Math.max(media[0], 1e-6)))
  const hoje = economiaDeHoje().pesos
  const melhor = (w) => mediana(medidas84.map((m) => Math.max(...m.p.map((p, l) => pontos(p, w[l], eco)))))
  const k = melhor(hoje) / melhor(base)
  return { media, pesos: base.map((x) => x * k) }
}

/** a, b, c POR CONTA: tabela T[conta][lugar] = pontos por energia do melhor trio da conta naquele lugar. */
export function criteriosPorConta(T) {
  const n = T[0].length
  const melhor = T.map(argmax)
  const conta = Array(n).fill(0)
  melhor.forEach((l) => conta[l]++)
  const fatias = conta.map((c) => c / T.length)
  const popular = argmax(conta)
  const custos = T.map((linha, c) => (linha[melhor[c]] > 0 ? 1 - linha[popular] / linha[melhor[c]] : 0))
  return {
    fatias, popular, melhor,
    foraDaModa: melhor.filter((l) => l !== popular).length,
    a: { medido: Math.max(...fatias), ok: Math.max(...fatias) <= 0.40 },
    b: { medido: Math.min(...fatias), ok: Math.min(...fatias) >= 0.10 },
    c: { medido: mediana(custos), entreQuemPerde: mediana(custos.filter((_, c) => melhor[c] !== popular)), ok: mediana(custos) >= 0.10 },
  }
}

const assinatura = (pl) => pl.patrulhas.map((p) => `L${p.l + 1}:${p.E}`).sort().join(' ')

/**
 * Melhor uso de uma "receita" (lugares e energias fixos) com os trios da própria conta. Patrulha que a conta não
 * consegue montar (falta monstro sem repetir) fica de fora e a energia dela vai para a patrulha de mais energia montada.
 */
export function valorDaReceita(receita, { Bm, Bt, trios, pesos, eco, div, tem, semana, porLugar = 6 }) {
  const copias = (m) => tem.get(m) ?? 0
  const listas = receita.map(({ l }) => {
    const a = semana[l]
    return trios.map((tr, t) => t).filter((t) => trios[t].every((m) => copias(m) > 0)).sort((x, y) => Bm[y][a] - Bm[x][a]).slice(0, porLugar)
  })
  const val = (l, E, t) => { const a = semana[l]; return valorPatrulha(E, Bm[t][a], Bt ? Bt[t][a] : Bm[t][a], pesos[l], eco, div) }
  let best = 0
  const escolha = []
  const fechar = () => {
    const montadas = receita.map((s, i) => ({ ...s, t: escolha[i] })).filter((s) => s.t !== null)
    if (!montadas.length) return
    const sobra = receita.reduce((x, s, i) => x + (escolha[i] === null ? s.E : 0), 0)
    const im = montadas.reduce((bi, s, i) => (s.E > montadas[bi].E ? i : bi), 0)
    const v = montadas.reduce((x, s, i) => x + val(s.l, s.E + (i === im ? sobra : 0), s.t), 0)
    if (v > best) best = v
  }
  const rec = (s, usados) => {
    if (s === receita.length) { fechar(); return }
    let coube = false
    for (const t of listas[s]) {
      const uso = new Map(usados)
      let ok = true
      for (const m of trios[t]) { const u = (uso.get(m) ?? 0) + 1; if (u > copias(m)) { ok = false; break } uso.set(m, u) }
      if (ok) { coube = true; escolha[s] = t; rec(s + 1, uso) }
    }
    if (!coube) { escolha[s] = null; rec(s + 1, usados) } // só fica de fora quando nenhum trio cabe
  }
  rec(0, new Map())
  return best
}

/**
 * Tudo de uma opção num conjunto de contas. contas: [{ tem: Map, trios: [chaves], filhote: Set de chaves }].
 * med(regime, chaveDoTrio) → medição completa. Devolve critérios a–f por conta, (i), (ii), d, e e mais.
 */
export function analisarOpcao({ opcao, contas, med, pesos, eco = economiaDeHoje(), extraK = [] }) {
  const { regime, div } = OPCOES[opcao]
  const sem1 = [0, 1, 2, 3, 4], sem2 = sem1.map((l) => (l + 1) % 5)
  const locais = contas.map((c) => {
    const ms = c.trios.map((t) => med(regime, chaveDoTrio(t)))
    return { ...c, Bm: ms.map((m) => m.p), Bt: div.v6 ? ms.map((m) => m.pt) : null }
  })
  const tabela = (w, semana = sem1) => locais.map((c) => w.map((wl, l) => Math.max(0, ...c.Bm.map((p) => pontos(p[semana[l]], wl, eco)))))
  const abc = criteriosPorConta(tabela(pesos))
  const variacoes = []
  for (let l = 0; l < pesos.length; l++) for (const s of [1.1, 0.9]) {
    const w = pesos.slice(); w[l] *= s
    const r = criteriosPorConta(tabela(w))
    variacoes.push({ lugar: l + 1, fator: s, ok: r.a.ok && r.b.ok && r.c.ok, a: r.a.medido, b: r.b.medido, c: r.c.medido, foraDaModa: r.foraDaModa })
  }
  const f = { ok: variacoes.every((v) => v.ok), falhas: variacoes.filter((v) => !v.ok).length, piorA: Math.max(...variacoes.map((v) => v.a)), piorB: Math.min(...variacoes.map((v) => v.b)), piorC: Math.min(...variacoes.map((v) => v.c)) }
  const plano = (c, semana, d = div) => planoDaConta({ Bm: c.Bm, Bt: c.Bt, trios: c.trios, semana, pesos, eco, div: d, tem: c.tem })
  const planos1 = locais.map((c) => plano(c, sem1))
  const planos2 = locais.map((c) => plano(c, sem2))
  const lugaresDe = (pl) => new Set(pl.patrulhas.map((p) => p.l)).size
  const cem = planos1.slice(0, 100)
  const d = { medido: new Set(cem.filter((pl) => lugaresDe(pl) >= 3).map(assinatura)).size, todas: new Set(planos1.filter((pl) => lugaresDe(pl) >= 3).map(assinatura)).size, contas3: planos1.filter((pl) => lugaresDe(pl) >= 3).length / planos1.length }
  d.ok = d.medido >= 5
  const mudou = planos1.filter((pl, i) => pl.patrulhas[0]?.l !== planos2[i].patrulhas[0]?.l).length / planos1.length
  const e = { medido: mudou, ok: mudou >= 0.30 }
  // (ii) a receita da internet: o plano da conta mediana, cada conta com os próprios trios
  const ordem = planos1.map((pl, i) => [pl.v, i]).sort((x, y) => x[0] - y[0])
  const im = ordem[ordem.length >> 1][1]
  const receita = planos1[im].patrulhas.map(({ l, E }) => ({ l, E }))
  const custosRec = locais.map((c, i) => 1 - valorDaReceita(receita, { ...c, pesos, eco, div, semana: sem1 }) / planos1[i].v)
  // a mesma conta com a receita MAIS COMUM (o plano ótimo que mais contas têm)
  const contagem = new Map()
  planos1.forEach((pl, i) => { const s = assinatura(pl); if (!contagem.has(s)) contagem.set(s, { n: 0, i }); contagem.get(s).n++ })
  const moda = [...contagem.values()].sort((x, y) => y.n - x.n || x.i - y.i)[0]
  const receitaModa = planos1[moda.i].patrulhas.map(({ l, E }) => ({ l, E }))
  const custosModa = locais.map((c, i) => 1 - valorDaReceita(receitaModa, { ...c, pesos, eco, div, semana: sem1 }) / planos1[i].v)
  const usaFilhote =planos1.filter((pl, i) => pl.patrulhas.some((p) => locais[i].trios[p.t].some((k) => locais[i].filhote.has(k)))).length / planos1.length
  const cansacoK = {}
  for (const k of extraK) {
    if (!div.v6) break
    const dk = { v6: { k, vida: div.v6.vida } }
    const pk = locais.map((c) => plano(c, sem1, dk))
    const livre = locais.map((c) => plano(c, sem1, {}))
    cansacoK[k] = { perda: locais.map((c, i) => 1 - pk[i].v / planoDaConta({ Bm: c.Bm, Bt: null, trios: c.trios, semana: sem1, pesos, eco, div: {}, tem: c.tem }).v), contas3: pk.filter((pl) => lugaresDe(pl) >= 3).length / pk.length, livre: livre.map((pl) => pl.v), valor: pk.map((pl) => pl.v) }
  }
  return {
    opcao, pesos, ...abc, f, d, e, variacoes, planos1, receita: { conta: im, plano: receita, custos: custosRec, mediana: mediana(custosRec), p75: quantil(custosRec, 0.75), dezPorCento: custosRec.filter((x) => x >= 0.10).length / custosRec.length },
    receitaModa: { plano: receitaModa, contas: moda.n, mediana: mediana(custosModa), p75: quantil(custosModa, 0.75), dezPorCento: custosModa.filter((x) => x >= 0.10).length / custosModa.length },
    usaFilhote, valorPlano: planos1.map((pl) => pl.v), cansacoK, locais,
    tamanhos: locais.map((c) => [...c.tem.values()].reduce((s, x) => s + x, 0)),
  }
}

/** Valor marginal de cada monstro (tirar 1 cópia): 1 − plano sem ele / plano com ele. */
export function valoresMarginais(A, { eco = economiaDeHoje() } = {}) {
  const { div } = OPCOES[A.opcao]
  const out = []
  A.locais.forEach((c, i) => {
    const base = A.planos1[i].v
    for (const [k, n] of c.tem) {
      const tem = new Map(c.tem); tem.set(k, n - 1)
      const v = planoDaConta({ Bm: c.Bm, Bt: c.Bt, trios: c.trios, semana: [0, 1, 2, 3, 4], pesos: A.pesos, eco, div, tem }).v
      out.push({ chave: k, filhote: c.filhote.has(k), valor: base > 0 ? 1 - v / base : 0 })
    }
  })
  return out
}

export { quantil }

// ------------------------------------------------------------------ efeitos colaterais: o melhor filhote possível

/** Partes trocáveis de cada lugar do corpo (ordem fixa da config). */
const IDS_DO_SLOT = Object.fromEntries(PARTES_DO_BONECO.map((p) => [p, Object.keys(PARTES).filter((k) => PARTES[k].slot === p)]))
export const comRaridade = (def, rar) => ({ partes: Object.fromEntries(PARTES_DO_BONECO.map((p) => [p, `${def.partes[p].split('@')[0]}@${rar}`])) })

/** Subida de encosta: troca uma parte por vez (tudo Comum) enquanto a força sobe. */
async function melhorArranjo(inicios, regime, { n, passos, semente, workers }) {
  let melhor = null
  for (const ini of inicios) {
    let atual = comRaridade(ini, 'comum')
    let va = forcaDoMonstro(atual, regime, { n, semente }).v
    for (let s = 0; s < passos; s++) {
      const viz = []
      for (const p of PARTES_DO_BONECO) for (const id of IDS_DO_SLOT[p]) {
        if (atual.partes[p].startsWith(id + '@')) continue
        viz.push({ partes: { ...atual.partes, [p]: `${id}@comum` } })
      }
      const fs = await emParalelo('forca', viz.map((d) => [d, regime, semente]), { n }, workers)
      const i = argmax(fs.map((x) => x.v))
      if (fs[i].v <= va) break
      atual = viz[i]; va = fs[i].v
    }
    if (!melhor || va > melhor.v) melhor = { def: atual, v: va }
  }
  return melhor
}

// ------------------------------------------------------------------ rodar tudo (terminal)

function cacheDe(nome, cfg) {
  const h = createHash('sha256').update(JSON.stringify({ v: 1, nome, cfg })).digest('hex').slice(0, 12)
  const arq = `.cache/filhotes/${nome}-${h}.json`
  const mapa = existsSync(arq) ? new Map(Object.entries(JSON.parse(readFileSync(arq, 'utf8')))) : new Map()
  return { mapa, salvar: () => { mkdirSync('.cache/filhotes', { recursive: true }); writeFileSync(arq, JSON.stringify(Object.fromEntries(mapa))) } }
}

async function medirComCache(nome, tipo, chaves, itemDe, cfg, workers) {
  const c = cacheDe(nome, cfg)
  const faltam = [...new Set(chaves)].filter((k) => !c.mapa.has(k))
  for (let i = 0; i < faltam.length; i += 4000) {
    const lote = faltam.slice(i, i + 4000)
    const res = await emParalelo(tipo, lote.map(itemDe), cfg, workers)
    lote.forEach((k, j) => c.mapa.set(k, res[j]))
    c.salvar()
    console.error(`  ${nome}: ${Math.min(i + 4000, faltam.length)}/${faltam.length}`)
  }
  return c.mapa
}

export async function rodarTudo({ semente = 'fil35', workers = availableParallelism(), rapido = false } = {}) {
  const N = rapido ? { real: 24, mad: 12, prop: 12 } : { real: 200, mad: 100, prop: 100 }
  const cfgT = { L: rapido ? 1 : 4, semente }
  const cfgC = rapido ? { LA: 1, LB: 4, LF: 8, topB: 2, semente } : { LA: 3, LB: 8, LF: 32, topB: 3, semente }
  const K = 4
  const eco = economiaDeHoje()
  const t0 = Date.now()
  const reais = Array.from({ length: N.real }, (_, i) => gerarConta(`r${i}`))
  const props = Array.from({ length: N.prop }, (_, i) => gerarConta(`r${i}`, { modo: 'proposito' }))
  const madas = Array.from({ length: N.mad }, (_, i) => gerarContaMadura(`m${i}`))
  const ehPronto = (k) => CHAVE_DO_PRONTO.has(k)
  const prep = (conta, filtro) => { const tem = copiasDaConta(conta, filtro); return { conta, tem, todos: triosDaConta(tem), filhote: new Set([...tem.keys()].filter((k) => !ehPronto(k))) } }
  const C = {
    prontos: reais.map((c) => prep(c, (b) => (b.geracao ?? 0) === 0)),
    realistas: reais.map((c) => prep(c)),
    maduras: madas.map((c) => prep(c)),
    proposito: props.map((c) => prep(c)),
  }
  // 1. os 84 trios de prontos: medição completa nos 3 regimes
  const chavesProntos = [...CHAVE_DO_PRONTO.keys()].sort()
  const t84 = []
  for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) for (let c = b + 1; c < 9; c++) t84.push([chavesProntos[a], chavesProntos[b], chavesProntos[c]])
  const defsDe = (kt) => kt.split('#').map(defDoMonstro)
  const regimes = Object.keys(REGIMES)
  const chaveMed = (r, kt) => `${r}@${kt}`
  const pedirCompleto = (lista) => medirComCache('completo', 'completo', lista, (k) => { const i = k.indexOf('@'); return [defsDe(k.slice(i + 1)), k.slice(0, i)] }, cfgC, workers)
  console.error('1. trios de prontos')
  let MED = await pedirCompleto(regimes.flatMap((r) => t84.map((t) => chaveMed(r, chaveDoTrio(t)))))
  // 2. triagem dos trios com filhote
  const comFilhote = new Set()
  for (const nome of ['realistas', 'maduras', 'proposito']) for (const c of C[nome]) for (const t of c.todos) if (t.some((k) => !ehPronto(k))) comFilhote.add(chaveDoTrio(t))
  console.error(`2. triagem: ${comFilhote.size} trios com filhote`)
  const TRI = await medirComCache('triagem', 'triagem', [...comFilhote], (kt) => defsDe(kt), cfgT, workers)
  // 3. candidatos de cada conta: K melhores da triagem em cada lugar e regime + os K melhores trios só de prontos
  const pedidos = []
  for (const nome of Object.keys(C)) for (const c of C[nome]) {
    const ks = new Set()
    const comuns = c.todos.filter((t) => t.every(ehPronto)).map(chaveDoTrio)
    if (nome === 'prontos') comuns.forEach((k) => ks.add(k))
    else {
      for (const r of regimes) for (let a = 0; a < 5; a++) comuns.slice().sort((x, y) => MED.get(chaveMed(r, y)).p[a] - MED.get(chaveMed(r, x)).p[a] || (x < y ? -1 : 1)).slice(0, K).forEach((k) => ks.add(k))
      const comF = c.todos.map(chaveDoTrio).filter((k) => TRI.has(k))
      for (const r of REGIMES_DA_TRIAGEM) for (let a = 0; a < 5; a++) comF.slice().sort((x, y) => TRI.get(y)[r][a] - TRI.get(x)[r][a] || (x < y ? -1 : 1)).slice(0, K).forEach((k) => ks.add(k))
    }
    c.trios = [...ks].sort().map((k) => k.split('#'))
    for (const k of ks) for (const r of regimes) pedidos.push(chaveMed(r, k))
  }
  console.error(`3. medição completa: ${new Set(pedidos).size} (trio, regime)`)
  MED = await pedirCompleto(pedidos)
  const med = (r, kt) => MED.get(chaveMed(r, kt))
  // 4. pesos por regime (cenário B nos 84 trios de prontos) e análise de cada opção em cada conjunto de contas
  const pesos = Object.fromEntries(regimes.map((r) => [r, pesosDoRegime(t84.map((t) => med(r, chaveDoTrio(t))), eco)]))
  const R = {}
  for (const nome of Object.keys(C)) {
    R[nome] = {}
    const contas = C[nome].filter((c) => c.trios.length > 0)
    for (const op of Object.keys(OPCOES)) R[nome][op] = analisarOpcao({ opcao: op, contas, med, pesos: pesos[OPCOES[op].regime].pesos, eco, extraK: op === 'o1' || op === 'o2' ? [5, 6, 7, 10] : [] })
  }
  // 4b. diagnóstico: vitória média do MELHOR trio de cada conta em cada lugar, e os critérios com pesos pelo inverso dela
  const diag = {}
  for (const nome of ['prontos', 'realistas', 'maduras']) {
    diag[nome] = {}
    for (const op of Object.keys(OPCOES)) {
      const A = R[nome][op]
      const melhorP = [0, 1, 2, 3, 4].map((l) => A.locais.reduce((s, c) => s + Math.max(0, ...c.Bm.map((p) => p[l])), 0) / A.locais.length)
      const cru = melhorP.map((m) => 1 / Math.max(m, 1e-6))
      const w = cru.map((x) => (x / cru[0]) * A.pesos[0])
      const B = analisarOpcao({ opcao: op, contas: C[nome].filter((c) => c.trios.length > 0), med, pesos: w, eco })
      diag[nome][op] = { melhorP, pesos: w, a: B.a, b: B.b, c: B.c, d: B.d, e: B.e, f: B.f, fatias: B.fatias, foraDaModa: B.foraDaModa, receita: B.receita.mediana }
    }
  }
  // 5. (iv) de propósito × ao acaso (as contas gêmeas: mesmos prontos, mesmo número de costuras)
  const iv = {}
  for (const op of Object.keys(OPCOES)) {
    const P = R.proposito[op], A = R.realistas[op], B = R.prontos[op]
    const n = P.locais.length
    const linhaT = (X, i, l) => Math.max(0, ...X.locais[i].Bm.map((p) => pontos(p[l], X.pesos[l], eco)))
    const g = { prop: [], acaso: [], alvoProp: [], alvoAcaso: [], melhor: 0 }
    for (let i = 0; i < n; i++) {
      const base = B.valorPlano[i], alvo = P.locais[i].conta.alvo
      g.prop.push(P.valorPlano[i] / base - 1); g.acaso.push(A.valorPlano[i] / base - 1)
      const tb = linhaT(B, i, alvo)
      g.alvoProp.push(linhaT(P, i, alvo) / tb - 1); g.alvoAcaso.push(linhaT(A, i, alvo) / tb - 1)
      if (P.valorPlano[i] > A.valorPlano[i] + 1e-9) g.melhor++
    }
    iv[op] = { planoProp: mediana(g.prop), planoAcaso: mediana(g.acaso), alvoProp: mediana(g.alvoProp), alvoAcaso: mediana(g.alvoAcaso), propGanha: g.melhor / n, alvos: [0, 1, 2, 3, 4].map((l) => P.locais.filter((c) => c.conta.alvo === l).length) }
  }
  // 6. efeitos colaterais
  console.error('6. efeitos colaterais')
  const filhotes = [...new Set([...C.realistas, ...C.maduras].flatMap((c) => [...c.filhote]))].sort()
  const forca = {}
  for (const r of regimes) {
    const fs = await emParalelo('forca', filhotes.map((k) => [defDoMonstro(k), r, `${semente}:fv`]), { n: rapido ? 4 : 20 }, workers)
    const ordem = fs.map((x, i) => [x.v, i]).sort((x, y) => y[0] - x[0])
    const top = ordem.slice(0, 3).map(([, i]) => defDoMonstro(filhotes[i]))
    const busca = await melhorArranjo(top, r, { n: rapido ? 6 : 60, passos: rapido ? 1 : 4, semente: `${semente}:sobe`, workers })
    const nConf = rapido ? 40 : 1000
    const lista = [busca.def, defDoMonstro(filhotes[ordem[0][1]]), ...PRONTOS.map((p) => ({ partes: BONECOS_PRONTOS[p].partes }))]
    const conf = await emParalelo('forca', lista.map((d) => [d, r, `${semente}:conf`]), { n: nConf }, workers)
    // raridade: os mesmos filhotes todos Comuns e todos Lendários, mesmas sementes
    const amostra = filhotes.slice(0, rapido ? 4 : 60)
    const rc = await emParalelo('forca', amostra.flatMap((k) => [[comRaridade(defDoMonstro(k), 'comum'), r, `${semente}:rar`], [comRaridade(defDoMonstro(k), 'lendaria'), r, `${semente}:rar`]]), { n: rapido ? 10 : 100 }, workers)
    const dif = amostra.map((_, i) => rc[2 * i + 1].v - rc[2 * i].v)
    forca[r] = {
      geradosP90: quantil(fs.map((x) => x.v), 0.9), geradosMax: ordem[0][0], melhorGerado: { chave: filhotes[ordem[0][1]], v: conf[1].v },
      melhorPossivel: { partes: busca.def.partes, v: conf[0].v }, prontos: Object.fromEntries(PRONTOS.map((p, i) => [p, conf[i + 2].v])),
      raridade: { media: dif.reduce((s, x) => s + x, 0) / dif.length, mediana: mediana(dif) },
    }
  }
  // duração e quem começa: trios sorteados das contas realistas, espelhados
  const er = criarRng(`${semente}:esp`)
  const nE = rapido ? 40 : 1500
  const esp = {}
  for (const r of regimes) {
    const itens = [], filh = []
    for (let i = 0; i < nE; i++) {
      const pega = () => { const c = C.realistas[er.inteiro(C.realistas.length)]; const ks = [...c.tem.keys()], t = []; for (let k = 0; k < 3; k++) t.push(ks.splice(er.inteiro(ks.length), 1)[0]); return t }
      const x = pega(), y = pega()
      filh.push([x.filter((k) => !ehPronto(k)).length, y.filter((k) => !ehPronto(k)).length])
      itens.push([x.map(defDoMonstro), y.map(defDoMonstro), TATICAS[er.inteiro(3)], TATICAS[er.inteiro(3)], r, `${semente}:e${i}`])
    }
    const res = await emParalelo('espelho', itens, {}, workers)
    let turnos = 0, n = 0, comecou = 0, fv = 0, fn = 0
    res.forEach((par, i) => par.forEach((x, lado) => {
      turnos += x.turnos; n++; if (x.comecou === x.vencedor) comecou++
      const [fx, fy] = filh[i]
      if ((fx > 0) !== (fy > 0)) { fn++; const ladoF = (fx > 0) === (lado === 0) ? 'A' : 'B'; if (x.vencedor === ladoF) fv++ }
    }))
    esp[r] = { turnos: turnos / n, quemComeca: comecou / n, timeComFilhote: fn ? fv / fn : NaN, lutas: n }
  }
  // 7. valor marginal (preço relativo)
  const marg = {}
  for (const op of Object.keys(OPCOES)) {
    const vs = valoresMarginais(R.realistas[op], { eco })
    const pr = vs.filter((x) => !x.filhote).map((x) => x.valor), fi = vs.filter((x) => x.filhote).map((x) => x.valor)
    const media = (xs) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length)
    marg[op] = { prontoMedia: media(pr), filhoteMedia: media(fi), prontoMediana: mediana(pr), filhoteMediana: mediana(fi), p90: quantil(vs.map((x) => x.valor), 0.9), p10: quantil(vs.map((x) => x.valor), 0.1), zero: vs.filter((x) => x.valor <= 1e-9).length / vs.length }
  }
  return { N, cfgT, cfgC, K, pesos, R, diag, iv, forca, esp, marg, C, segundos: (Date.now() - t0) / 1000 }
}

const ehPrincipal = isMainThread && process.argv[1]?.endsWith('experimentos-filhotes.mjs')
if (ehPrincipal) {
  const args = process.argv.slice(2)
  const lerArg = (k, p) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : p }
  const rapido = args.includes('--rapido')
  const workers = Math.max(1, parseInt(lerArg('--workers', String(availableParallelism())), 10) || 1)
  const semente = String(lerArg('--semente', 'fil35'))
  const out = await rodarTudo({ semente, workers, rapido })
  const pct = (x) => (100 * x).toFixed(1) + '%'
  const ok = (b) => (b ? 'APROVADO ' : 'REPROVADO')
  console.log(`Contas: ${out.N.real} realistas (6–9 prontos + 2–4 costuras), ${out.N.mad} maduras (10–15, metade filhotes), ${out.N.prop} de propósito (gêmeas das primeiras). ${out.segundos.toFixed(0)} s`)
  for (const nome of Object.keys(out.R)) {
    console.log(`\n== ${nome}`)
    for (const [op, r] of Object.entries(out.R[nome])) {
      console.log(`${op.padEnd(15)} a ${ok(r.a.ok)} ${pct(r.a.medido)} · b ${ok(r.b.ok)} ${pct(r.b.medido)} · c ${ok(r.c.ok)} ${pct(r.c.medido)} · d ${ok(r.d.ok)} ${r.d.medido} (${pct(r.d.contas3)} usam 3) · e ${ok(r.e.ok)} ${pct(r.e.medido)} · f ${ok(r.f.ok)} ${r.f.falhas}/10 (pior a ${pct(r.f.piorA)}, b ${pct(r.f.piorB)}, c ${pct(r.f.piorC)})`)
      console.log(`${''.padEnd(15)} fatias ${r.fatias.map(pct).join(' ')} · (i) fora da moda ${r.foraDaModa}/${r.locais.length} · (ii) receita custa ${pct(r.receita.mediana)} (p75 ${pct(r.receita.p75)}; ≥10%: ${pct(r.receita.dezPorCento)}) · receita mais comum (${r.receitaModa.plano.map((p) => `L${p.l + 1}:${p.E}`).join(' ')}, ${r.receitaModa.contas} contas) custa ${pct(r.receitaModa.mediana)} (p75 ${pct(r.receitaModa.p75)}; ≥10%: ${pct(r.receitaModa.dezPorCento)}) · plano usa filhote ${pct(r.usaFilhote)} · pesos ${r.pesos.map((x) => x.toFixed(2)).join(' ')}`)
      for (const [k, v] of Object.entries(r.cansacoK)) console.log(`${''.padEnd(15)} cansaço K=${k}: perda mediana ${pct(mediana(v.perda))} · 3 lugares ${pct(v.contas3)}`)
    }
  }
  console.log('\nDiagnóstico: vitória do melhor trio da conta por lugar; critérios com pesos pelo inverso dela')
  for (const [nome, ops] of Object.entries(out.diag)) for (const [op, r] of Object.entries(ops)) console.log(`${nome.padEnd(10)} ${op.padEnd(15)} melhor p ${r.melhorP.map(pct).join(' ')} · pesos ${r.pesos.map((x) => x.toFixed(2)).join(' ')} · a ${ok(r.a.ok)} ${pct(r.a.medido)} · b ${ok(r.b.ok)} ${pct(r.b.medido)} · c ${ok(r.c.ok)} ${pct(r.c.medido)} · d ${r.d.medido} · e ${pct(r.e.medido)} · f ${r.f.falhas}/10 (pior b ${pct(r.f.piorB)}) · fora da moda ${r.foraDaModa} · receita ${pct(r.receita)} · fatias ${r.fatias.map(pct).join(' ')}`)
  console.log('\n(iv) de propósito × ao acaso (mediana do ganho sobre a mesma conta só com prontos)')
  for (const [op, v] of Object.entries(out.iv)) console.log(`${op.padEnd(15)} plano: propósito ${pct(v.planoProp)} · acaso ${pct(v.planoAcaso)} · no lugar-alvo: propósito ${pct(v.alvoProp)} · acaso ${pct(v.alvoAcaso)} · propósito melhor em ${pct(v.propGanha)} · alvos ${v.alvos.join('/')}`)
  console.log('\nEfeitos colaterais')
  for (const [r, f] of Object.entries(out.forca)) console.log(`${r.padEnd(6)} melhor gerado ${pct(f.melhorGerado.v)} · melhor possível ${pct(f.melhorPossivel.v)} (${Object.values(f.melhorPossivel.partes).map((g) => g.split('@')[0]).join(', ')}) · prontos ${pct(Math.min(...Object.values(f.prontos)))}–${pct(Math.max(...Object.values(f.prontos)))} · lendária − comum ${(100 * f.raridade.media).toFixed(1)} pts · turnos ${out.esp[r].turnos.toFixed(2)} · quem começa ${pct(out.esp[r].quemComeca)} · time com filhote × sem ${pct(out.esp[r].timeComFilhote)}`)
  console.log('\nValor marginal de um monstro (plano sem 1 cópia), contas realistas')
  for (const [op, m] of Object.entries(out.marg)) console.log(`${op.padEnd(15)} média: pronto ${pct(m.prontoMedia)} · filhote ${pct(m.filhoteMedia)} · p90 ${pct(m.p90)} · vale 0: ${pct(m.zero)}`)
  console.log('\nCansaço por tamanho de conta (perda mediana do plano contra o mesmo plano sem cansaço)')
  for (const nome of ['prontos', 'realistas', 'maduras']) for (const op of ['o1', 'o2']) {
    const r = out.R[nome][op]
    const faixas = [[6, 7], [8, 9], [10, 12], [13, 99]]
    const txt = Object.entries(r.cansacoK).map(([k, v]) => `K=${k}: ` + faixas.map(([a, b]) => { const xs = v.perda.filter((_, i) => r.tamanhos[i] >= a && r.tamanhos[i] <= b); return xs.length ? `${a}–${b > 50 ? '+' : b} ${pct(mediana(xs))} (${xs.length})` : null }).filter(Boolean).join(' · '))
    console.log(`${nome} ${op}: ${txt.join(' | ')}`)
  }
  mkdirSync('.cache/filhotes', { recursive: true })
  const resumo = { ...out, C: undefined, R: Object.fromEntries(Object.entries(out.R).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([o, r]) => [o, { ...r, locais: undefined, melhor: undefined, cansacoK: Object.fromEntries(Object.entries(r.cansacoK).map(([kk, x]) => [kk, { perda: mediana(x.perda), contas3: x.contas3 }])), planos1: r.planos1.map((pl) => pl.patrulhas.map((p) => ({ l: p.l, E: p.E }))) }]))])) }
  writeFileSync(`.cache/filhotes/relatorio${rapido ? '-rapido' : ''}.json`, JSON.stringify(resumo, null, 1))
}
