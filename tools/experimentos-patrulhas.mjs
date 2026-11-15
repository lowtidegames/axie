// Tarefa 33 — EXPERIMENTOS do idle por patrulhas: o que faria "qual trio vai para qual lugar" e "como repartir as 20
// energias" virarem estratégia que depende da conta. Só MEDE: nenhum número do jogo muda (shared/config.js intocado).
// As variantes entram como `regras` de experimento do motor (shared/batalha.js, regrasDeExperimento) ou como regra do
// próprio simulador (guardas, lugar proibido, ganho que diminui, cansaço).
//   node tools/experimentos-patrulhas.mjs --lista
//   node tools/experimentos-patrulhas.mjs --experimento hoje,v1-50 [--lutas 40] [--semente S] [--workers W]
//   node tools/experimentos-patrulhas.mjs --todos --lutas 40
// Saída: tabela no terminal + .cache/experimentos/<nome>-<lutas>.json (não commitado). Matrizes ficam em cache por chave.
// Critérios (economista, docs/ideias/jogo-idle.md §9): a) nenhum lugar é o melhor para > 40% dos trios; b) cada lugar é o
// melhor para ≥ 10%; c) ir ao lugar popular custa ≥ 10% (mediana); d) em 100 contas, ≥ 5 divisões ótimas diferentes que
// usam 3+ lugares; e) depois do rodízio, ≥ 30% das contas mudam de lugar principal; f) a–c valem com cada peso ±10%.
// Pesos dos lugares: o "cenário B" (inverso da vitória média do lugar), recalculado para cada variante.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { createHash } from 'node:crypto'
import { bateForte, montarBoneco } from '../shared/batalha.js'
import { CARTAS, TIPOS } from '../shared/config.js'
import { criarRng } from '../shared/rng.js'
import { LUGARES } from '../shared/lugares.js'
import { TATICAS, lutaAutomatica, ordemPadrao } from '../shared/tatica.js'
import { FORMACOES, MONSTROS, amplitudeDoAcaso, economiaDeHoje, mediana, pontos, sortearContas, todosOsTrios } from './simular-patrulhas.mjs'

const TIPO = Object.fromEntries(MONSTROS.map((m) => [m, montarBoneco(m).tipo]))

// ------------------------------------------------------------------ guardas e lugares das variantes

/** V3: guarda de UM elemento (roda dos tipos). Quem tem 2 monstros do elemento usa os dois; quem tem 1 repete. */
export const GUARDAS_MONO = {
  jeans: ['rasgao', 'brigao', 'rasgao'],
  seda: ['desfiado', 'desfiado', 'desfiado'],
  la: ['embolado', 'embolado', 'embolado'],
  feltro: ['cascudo', 'cascudo', 'cascudo'],
  tule: ['mudo', 'assombrado', 'mudo'],
  couro: ['mordedor', 'pisoteador', 'mordedor'],
}
/** V3 "2+1": dois do elemento + o representante do elemento que ele bate (a presa), no Back. */
const REPRESENTANTE = { jeans: 'rasgao', seda: 'desfiado', la: 'embolado', feltro: 'cascudo', tule: 'mudo', couro: 'mordedor' }
export const GUARDAS_DOIS_MAIS_UM = Object.fromEntries(TIPOS.map((t, i) => [t, [...GUARDAS_MONO[t].slice(0, 2), REPRESENTANTE[TIPOS[(i + 1) % TIPOS.length]]]]))

/** V4 e V7: o elemento de cada lugar (geografia: fica no lugar quando as guardas rodam). Em cada lugar, o que a guarda de hoje NÃO tem. */
export const ELEMENTO_DO_LUGAR = ['jeans', 'seda', 'couro', 'la', 'feltro']

/** Guarda pronta para a luta: ids na ordem Front, Middle, Back + ordens (tática e ordem de fábrica). */
function guardaPronta(guarda, tatica) {
  return { guarda: guarda.slice(), ordens: { tatica, ordem: guarda.map((id, i) => ordemPadrao(montarBoneco(id).cartas, i)) } }
}

/**
 * As "arenas" que a variante precisa medir (guarda + regras do motor) e qual arena está em cada lugar na semana 1 e na 2.
 * exp: { guardas: 'hoje'|'mono'|'2+1', regras: {...motor}, terreno: { dano?: x, escudo?: n } }
 */
export function arenasDoExperimento(exp) {
  let guardas, sem1, sem2
  if (!exp.guardas || exp.guardas === 'hoje') {
    guardas = LUGARES.map((l) => ({ guarda: l.guarda.slice(), ordens: l.ordens }))
    sem1 = [0, 1, 2, 3, 4]
    sem2 = sem1.map((l) => (l + 1) % 5) // = RODIZIO de simular-patrulhas
  } else {
    const tab = exp.guardas === 'mono' ? GUARDAS_MONO : GUARDAS_DOIS_MAIS_UM
    guardas = TIPOS.map((t) => guardaPronta(tab[t], 'rush'))
    sem1 = [0, 1, 2, 3, 4] // jeans, seda, lã, feltro, tule
    sem2 = [1, 2, 3, 4, 5] // cada lugar recebe o elemento seguinte; entra couro, sai jeans
  }
  const arenas = [], chave = new Map()
  const arenaDe = (g, l) => {
    const regras = { ...(exp.regras || {}) }
    if (exp.terreno?.dano) regras.danoPorTipo = { [ELEMENTO_DO_LUGAR[l]]: exp.terreno.dano }
    if (exp.terreno?.escudo) regras.escudoInicialPorTipo = { [ELEMENTO_DO_LUGAR[l]]: exp.terreno.escudo }
    const k = JSON.stringify([g, regras])
    if (!chave.has(k)) { chave.set(k, arenas.length); arenas.push({ ...guardas[g], regras: Object.keys(regras).length ? regras : undefined, g }) }
    return chave.get(k)
  }
  return { arenas, semana1: sem1.map((g, l) => arenaDe(g, l)), semana2: sem2.map((g, l) => arenaDe(g, l)) }
}

// ------------------------------------------------------------------ as variantes (grade enxuta)

const R = (regras) => ({ regras })
export const EXPERIMENTOS = {
  hoje: { nota: 'motor de hoje (+25%, guardas de hoje)' },
  'v1-40': { nota: 'vantagem de elemento +40%', ...R({ bonusDeTipo: 0.40 }) },
  'v1-50': { nota: 'vantagem de elemento +50%', ...R({ bonusDeTipo: 0.50 }) },
  'v1-75': { nota: 'vantagem de elemento +75%', ...R({ bonusDeTipo: 0.75 }) },
  'v2-15': { nota: 'resistência −15%', ...R({ resistencia: 0.15 }) },
  'v2-25': { nota: 'resistência −25%', ...R({ resistencia: 0.25 }) },
  'v2-40': { nota: 'resistência −40%', ...R({ resistencia: 0.40 }) },
  'v3-mono': { nota: 'guarda de um elemento só (6 guardas, rodízio)', guardas: 'mono' },
  'v3-2mais1': { nota: 'guarda 2 do elemento + 1', guardas: '2+1' },
  'v4-dano30': { nota: 'terreno: habilidade do elemento do lugar +30%', terreno: { dano: 0.30 } },
  'v4-dano60': { nota: 'terreno: habilidade do elemento do lugar +60%', terreno: { dano: 0.60 } },
  'v4-escudo': { nota: 'terreno: corpo do elemento do lugar começa com 25 de Guard', terreno: { escudo: 25 } },
  'v7-proibido': { nota: 'corpo do elemento do lugar não entra nele', proibir: true },
  'c-v1v2': { nota: '+50% e resistência −25%', ...R({ bonusDeTipo: 0.50, resistencia: 0.25 }) },
  'c-v1v2-forte': { nota: '+75% e resistência −40%', ...R({ bonusDeTipo: 0.75, resistencia: 0.40 }) },
  'c-v3v1': { nota: 'mono + vantagem +50%', guardas: 'mono', ...R({ bonusDeTipo: 0.50 }) },
  'c-v3v2': { nota: 'mono + resistência −25%', guardas: 'mono', ...R({ resistencia: 0.25 }) },
  'c-v3v1v2': { nota: 'mono + 50% + resistência −25%', guardas: 'mono', ...R({ bonusDeTipo: 0.50, resistencia: 0.25 }) },
  'c-v3v1v2-forte': { nota: 'mono + 75% + resistência −40%', guardas: 'mono', ...R({ bonusDeTipo: 0.75, resistencia: 0.40 }) },
  'c-v3v4': { nota: 'mono + terreno +30%', guardas: 'mono', terreno: { dano: 0.30 } },
  'c-v1v2v4': { nota: '+50%, resistência −25%, terreno +30%', ...R({ bonusDeTipo: 0.50, resistencia: 0.25 }), terreno: { dano: 0.30 } },
  'c-v7v1v2': { nota: 'proibido + 50% + resistência −25%', proibir: true, ...R({ bonusDeTipo: 0.50, resistencia: 0.25 }) },
  'c-v3v7': { nota: 'mono + proibido', guardas: 'mono', proibir: true },
  'c-v3v1v2v7': { nota: 'mono + 50% + resistência −25% + proibido', guardas: 'mono', proibir: true, ...R({ bonusDeTipo: 0.50, resistencia: 0.25 }) },
  // V5 e V6 mexem só na divisão das 20 energias
  'v5-n4': { nota: 'por lugar e dia: 4 primeiras vitórias 100%, depois 50%', divisao: { v5: { n: 4, fator: 0.5 } } },
  'v5-n6': { nota: 'por lugar e dia: 6 primeiras vitórias 100%, depois 50%', divisao: { v5: { n: 6, fator: 0.5 } } },
  'v5-n8': { nota: 'por lugar e dia: 8 primeiras vitórias 100%, depois 50%', divisao: { v5: { n: 8, fator: 0.5 } } },
  'v6-k5': { nota: 'cansaço: depois de 5 lutas no dia, começa com 75% da vida', divisao: { v6: { k: 5, vida: 0.75 } } },
  'v6-k7': { nota: 'cansaço: depois de 7 lutas no dia, começa com 60% da vida', divisao: { v6: { k: 7, vida: 0.60 } } },
  'v5v6': { nota: 'v5 (6 vitórias) + v6 (5 lutas, 75%)', divisao: { v5: { n: 6, fator: 0.5 }, v6: { k: 5, vida: 0.75 } } },
  'c-v3v1v2v5': { nota: 'mono + 50% + resist. −25% + v5 (6 vitórias)', guardas: 'mono', ...R({ bonusDeTipo: 0.50, resistencia: 0.25 }), divisao: { v5: { n: 6, fator: 0.5 } } },
  'c-v3v1v2v6': { nota: 'mono + 50% + resist. −25% + v6 (5 lutas, 75%)', guardas: 'mono', ...R({ bonusDeTipo: 0.50, resistencia: 0.25 }), divisao: { v6: { k: 5, vida: 0.75 } } },
  'c-v3v1v2v5v6': { nota: 'mono + 50% + resist. −25% + v5 + v6', guardas: 'mono', ...R({ bonusDeTipo: 0.50, resistencia: 0.25 }), divisao: { v5: { n: 6, fator: 0.5 }, v6: { k: 5, vida: 0.75 } } },
  'c-v3v7v5': { nota: 'mono + proibido + v5 (6 vitórias)', guardas: 'mono', proibir: true, divisao: { v5: { n: 6, fator: 0.5 } } },
  'c-v3v7v5v6': { nota: 'mono + proibido + v5 + v6', guardas: 'mono', proibir: true, divisao: { v5: { n: 6, fator: 0.5 }, v6: { k: 5, vida: 0.75 } } },
}

// ------------------------------------------------------------------ medição (pura; worker ou direto)

/** Uma luta do trio (na formação) contra uma arena. Devolve vitória, Strong dados/levados, turnos e quem começou. */
export function lutaNaArena(semente, time, tatica, arena, regrasA) {
  const regras = regrasA ? { ...(arena.regras || {}), ...regrasA } : arena.regras
  const r = lutaAutomatica({ semente, timeA: time, timeB: arena.guarda, ordensA: { tatica }, ordensB: arena.ordens, regras })
  const tipo = { A0: TIPO[time[0]], A1: TIPO[time[1]], A2: TIPO[time[2]], B0: TIPO[arena.guarda[0]], B1: TIPO[arena.guarda[1]], B2: TIPO[arena.guarda[2]] }
  let dados = 0, levados = 0
  for (const ev of r.eventos) {
    if (ev.t !== 'dano' || ev.refletido || !ev.carta || !ev.de) continue
    if (!bateForte(CARTAS[ev.carta].tipo, tipo[ev.alvo])) continue
    if (ev.de[0] === 'A') dados++
    else levados++
  }
  return { venceu: r.resultado.vencedor === 'A', dados, levados, turnos: r.resultado.turno }
}

/** Float64Array por trio: [formação][tática][arena][v, dados, levados, turnos] (somas). regrasA: cansaço do lado A. */
export function medirTriosNasArenas({ trios, lutas, semente, arenas, regrasA }) {
  const NA = arenas.length
  return trios.map((tr) => {
    const a = new Float64Array(FORMACOES.length * TATICAS.length * NA * 4)
    let k = 0
    for (const f of FORMACOES) {
      const time = f.map((i) => MONSTROS[tr[i]])
      for (const tatica of TATICAS) for (const arena of arenas) {
        let v = 0, d = 0, l = 0, t = 0
        for (let i = 0; i < lutas; i++) {
          const r = lutaNaArena(`${semente}:${i}`, time, tatica, arena, regrasA)
          if (r.venceu) v++
          d += r.dados; l += r.levados; t += r.turnos
        }
        a[k++] = v; a[k++] = d; a[k++] = l; a[k++] = t
      }
    }
    return a
  })
}

if (!isMainThread && workerData?.experimento) parentPort.postMessage(medirTriosNasArenas(workerData))

export async function medirArenas({ arenas, lutas, semente, regrasA, workers = availableParallelism(), trios = todosOsTrios() }) {
  const n = Math.max(1, Math.min(workers, trios.length))
  const casas = new Array(trios.length)
  if (n === 1) medirTriosNasArenas({ trios, lutas, semente, arenas, regrasA }).forEach((a, i) => { casas[i] = a })
  else {
    const partes = Array.from({ length: n }, () => [])
    trios.forEach((_, i) => partes[i % n].push(i))
    await Promise.all(partes.map((ix) => new Promise((ok, falha) => {
      const w = new Worker(new URL(import.meta.url), { workerData: { experimento: true, trios: ix.map((i) => trios[i]), lutas, semente, arenas, regrasA } })
      w.once('message', (res) => { res.forEach((a, j) => { casas[ix[j]] = Array.from(a) }); ok() })
      w.once('error', falha)
      w.once('exit', (c) => { if (c !== 0) falha(new Error('worker saiu com ' + c)) })
    })))
  }
  return { trios, lutas, semente, NA: arenas.length, casas: casas.map((a) => Array.from(a)) }
}

// ------------------------------------------------------------------ análise (pura)

const NK = TATICAS.length
const ix = (M, f, k, a) => ((f * NK + k) * M.NA + a) * 4

/** P[t][a][f][k] = vitória (0..1). */
export function taxasArena(M) {
  return M.casas.map((c) => Array.from({ length: M.NA }, (_, a) => FORMACOES.map((_, f) => TATICAS.map((_, k) => c[ix(M, f, k, a)] / M.lutas))))
}
/** Melhor vitória de cada trio em cada arena (melhor formação + tática). */
export const melhorPorArena = (P) => P.map((porA) => porA.map((fk) => Math.max(...fk.flat())))
const argmax = (xs) => xs.reduce((bi, x, i) => (x > xs[bi] ? i : bi), 0)

/** O trio pode ir ao lugar l? (V7: corpo do elemento do lugar não entra) */
export const podeIr = (trio, l, proibir) => !proibir || trio.every((m) => TIPO[MONSTROS[m]] !== ELEMENTO_DO_LUGAR[l])

/** Pontos por energia [trio][lugar] na semana dada. */
export function tabelaSemana(Bm, trios, semana, pesos, eco, proibir) {
  return Bm.map((porA, t) => semana.map((a, l) => (podeIr(trios[t], l, proibir) ? pontos(porA[a], pesos[l], eco) : 0)))
}

/** a, b, c numa tabela de pontos. */
export function criteriosABC(T) {
  const n = T[0].length
  const melhor = T.map(argmax)
  const conta = Array(n).fill(0)
  melhor.forEach((l) => conta[l]++)
  const fatias = conta.map((c) => c / T.length)
  const popular = argmax(conta)
  const custos = T.map((linha, t) => (linha[melhor[t]] > 0 ? 1 - linha[popular] / linha[melhor[t]] : 0))
  return {
    fatias, popular,
    a: { medido: Math.max(...fatias), ok: Math.max(...fatias) <= 0.40 },
    b: { medido: Math.min(...fatias), ok: Math.min(...fatias) >= 0.10 },
    c: { medido: mediana(custos), ok: mediana(custos) >= 0.10 },
  }
}

/** Pesos "cenário B": inverso da vitória média do lugar (semana 1), escala de hoje (mesmo ponto mediano). */
export function pesosCalibrados(P, Bm, trios, semana, eco, proibir) {
  const media = semana.map((a) => { let s = 0, n = 0; for (const t of P) for (const ks of t[a]) for (const p of ks) { s += p; n++ } return s / n })
  const base = media.map((m) => 1 / Math.max(m, 1e-6)).map((x, _, xs) => x / (1 / Math.max(media[0], 1e-6)))
  const hoje = economiaDeHoje().pesos
  const alvo = mediana(tabelaSemana(Bm, trios, semana, hoje, eco, false).map((l) => Math.max(...l)))
  const agora = mediana(tabelaSemana(Bm, trios, semana, base, eco, proibir).map((l) => Math.max(...l)))
  return { media, pesos: base.map((x) => x * (alvo / agora)) }
}

// --- divisão das 20 energias (V5: ganho que diminui por lugar; V6: cansaço por monstro)

/** Distribuição do nº de vitórias: n1 lutas com chance p1 + n2 com chance p2. */
export function distVitorias(n1, p1, n2, p2) {
  let d = [1]
  const add = (n, p) => { for (let i = 0; i < n; i++) { const nd = new Array(d.length + 1).fill(0); d.forEach((x, w) => { nd[w] += x * (1 - p); nd[w + 1] += x * p }); d = nd } }
  add(n1, p1); add(n2, p2)
  return d
}

/**
 * Pontos esperados de uma patrulha com E energias num lugar de peso w: p fresco, pt cansado (V6), teto por lugar (V5).
 * Sequência: fator (1 + bônus × p̄^(K−1)), a mesma forma de pontos(); vitória depois do teto vale `fator` (V5).
 */
export function valorPatrulha(E, p, pt, w, eco, div = {}) {
  if (E <= 0) return 0
  const k = div.v6 ? Math.min(E, div.v6.k) : E
  const d = distVitorias(k, p, E - k, div.v6 ? pt : p)
  const pm = (k * p + (E - k) * (div.v6 ? pt : p)) / E
  let ev = 0
  d.forEach((x, w2) => { ev += x * (div.v5 ? Math.min(w2, div.v5.n) + div.v5.fator * Math.max(0, w2 - div.v5.n) : w2) })
  return w * ev * (1 + eco.seqBonus * pm ** (eco.seqK - 1))
}

/**
 * Plano ótimo de uma conta: até 3 patrulhas (trios sem monstro em comum), 20 energias. Com V5, lugares diferentes.
 * Candidatos: os 4 melhores trios da conta em cada lugar. Devolve { v, patrulhas: [{ t, l, E }] }.
 */
export function planoDaConta({ Bm, Bt, trios, semana, pesos, eco, div = {}, tem, proibir, energia = 20, porLugar = 4 }) {
  const cands = []
  for (let l = 0; l < semana.length; l++) {
    const a = semana[l]
    const lista = []
    trios.forEach((tr, t) => { if (tr.every((m) => tem.has(m)) && podeIr(tr, l, proibir)) lista.push(t) })
    lista.sort((x, y) => Bm[y][a] - Bm[x][a])
    for (const t of lista.slice(0, porLugar)) {
      const val = []
      for (let E = 0; E <= energia; E++) val.push(valorPatrulha(E, Bm[t][a], Bt ? Bt[t][a] : Bm[t][a], pesos[l], eco, div))
      cands.push({ t, l, val })
    }
  }
  let best = { v: -1, patrulhas: [] }
  const disj = (x, y) => !trios[x.t].some((m) => trios[y.t].includes(m)) && (!div.v5 || x.l !== y.l)
  const n = cands.length
  for (let i = 0; i < n; i++) {
    const A = cands[i]
    if (A.val[energia] > best.v) best = { v: A.val[energia], patrulhas: [{ t: A.t, l: A.l, E: energia }] }
    for (let j = i + 1; j < n; j++) {
      const B = cands[j]
      if (!disj(A, B)) continue
      for (let ea = 1; ea < energia; ea++) { const v = A.val[ea] + B.val[energia - ea]; if (v > best.v + 1e-12) best = { v, patrulhas: [{ t: A.t, l: A.l, E: ea }, { t: B.t, l: B.l, E: energia - ea }] } }
      for (let k = j + 1; k < n; k++) {
        const C = cands[k]
        if (!disj(A, C) || !disj(B, C)) continue
        for (let ea = 1; ea < energia - 1; ea++) for (let eb = 1; ea + eb < energia; eb++) {
          const v = A.val[ea] + B.val[eb] + C.val[energia - ea - eb]
          if (v > best.v + 1e-12) best = { v, patrulhas: [{ t: A.t, l: A.l, E: ea }, { t: B.t, l: B.l, E: eb }, { t: C.t, l: C.l, E: energia - ea - eb }] }
        }
      }
    }
  }
  best.patrulhas.sort((x, y) => y.E - x.E || x.l - y.l)
  return best
}

const principal = (pl) => pl.patrulhas[0]?.l
const assinatura = (pl) => pl.patrulhas.map((p) => `L${p.l + 1}:${p.E}`).slice().sort().join(' ')

/** d, e e o "monstro obrigatório", a partir dos planos das contas nas semanas 1 e 2. */
export function criteriosDE(planos1, planos2, trios) {
  const lugaresDe = (pl) => new Set(pl.patrulhas.map((p) => p.l)).size
  const tres = planos1.filter((pl) => lugaresDe(pl) >= 3)
  const sig3 = new Set(tres.map(assinatura))
  const sig = new Set(planos1.map(assinatura))
  const mudou = planos1.filter((pl, i) => principal(pl) !== principal(planos2[i])).length / planos1.length
  const presenca = Array(MONSTROS.length).fill(0)
  let nTrios = 0
  for (const pl of planos1) for (const p of pl.patrulhas) { nTrios++; for (const m of trios[p.t]) presenca[m]++ }
  const pres = presenca.map((x) => x / Math.max(1, nTrios))
  const im = argmax(pres)
  return {
    d: { medido: sig3.size, divisoes: sig.size, contas3Lugares: tres.length / planos1.length, contas2Lugares: planos1.filter((pl) => lugaresDe(pl) >= 2).length / planos1.length, ok: sig3.size >= 5 },
    e: { medido: mudou, ok: mudou >= 0.30 },
    obrigatorio: { monstro: MONSTROS[im], presenca: pres[im], ok: pres[im] <= 0.60, todos: Object.fromEntries(MONSTROS.map((m, i) => [m, pres[i]])) },
  }
}

/** Critério g (posição e tática), como no simulador da matriz, nas arenas da semana 1. */
export function posicaoETatica(P, semana, lutas) {
  const form = [], tat = []
  let pm = 0, n = 0
  for (const porA of P) for (const a of semana) {
    const fk = porA[a]
    for (let k = 0; k < NK; k++) { const xs = fk.map((ks) => ks[k]); form.push(Math.max(...xs) - Math.min(...xs)) }
    for (const ks of fk) { tat.push(Math.max(...ks) - Math.min(...ks)); for (const p of ks) { pm += p; n++ } }
  }
  pm /= n
  return { formacao: 100 * mediana(form), formacaoAcaso: 100 * amplitudeDoAcaso(pm, FORMACOES.length, lutas), tatica: 100 * mediana(tat), taticaAcaso: 100 * amplitudeDoAcaso(pm, NK, lutas) }
}

/** Tudo de uma variante, a partir das matrizes (fresca e, se V6, cansada). */
export function analisar({ exp, M, Mt, arenas, semana1, semana2, contas }) {
  const eco = economiaDeHoje()
  const P = taxasArena(M), Bm = melhorPorArena(P)
  const Bt = Mt ? melhorPorArena(taxasArena(Mt)) : null
  const { trios } = M
  const proibir = !!exp.proibir
  const { pesos, media } = pesosCalibrados(P, Bm, trios, semana1, eco, proibir)
  const T = tabelaSemana(Bm, trios, semana1, pesos, eco, proibir)
  const abc = criteriosABC(T)
  const variacoes = []
  for (let l = 0; l < pesos.length; l++) for (const s of [1.1, 0.9]) {
    const w = pesos.slice(); w[l] *= s
    const r = criteriosABC(tabelaSemana(Bm, trios, semana1, w, eco, proibir))
    variacoes.push({ ok: r.a.ok && r.b.ok && r.c.ok, a: r.a.medido, b: r.b.medido, c: r.c.medido })
  }
  const f = { ok: variacoes.every((v) => v.ok), falhas: variacoes.filter((v) => !v.ok).length, piorA: Math.max(...variacoes.map((v) => v.a)), piorB: Math.min(...variacoes.map((v) => v.b)), piorC: Math.min(...variacoes.map((v) => v.c)) }
  const div = exp.divisao || {}
  const plano = (semana, tem) => planoDaConta({ Bm, Bt, trios, semana, pesos, eco, div, tem, proibir })
  const planos1 = contas.map((tem) => plano(semana1, tem))
  const planos2 = contas.map((tem) => plano(semana2, tem))
  const de = criteriosDE(planos1, planos2, trios)
  // efeitos na matriz: Strong por luta e turnos (semana 1)
  let d = 0, lv = 0, tu = 0, n = 0
  for (const c of M.casas) for (let f2 = 0; f2 < FORMACOES.length; f2++) for (let k = 0; k < NK; k++) for (const a of semana1) {
    const i = ix(M, f2, k, a); d += c[i + 1]; lv += c[i + 2]; tu += c[i + 3]; n += M.lutas
  }
  const pontoMedio = mediana(T.map((l) => Math.max(...l)))
  return {
    pesos, vitoriaMedia: media, ...abc, f, ...de, g: posicaoETatica(P, semana1, M.lutas), pontoMedio,
    strongDados: d / n, strongLevados: lv / n, turnosNaMatriz: tu / n,
    exemplos: planos1.slice(0, 8).map((pl) => pl.patrulhas.map((p) => ({ trio: trios[p.t].map((m) => MONSTROS[m]), lugar: p.l + 1, energia: p.E }))),
  }
}

// ------------------------------------------------------------------ efeitos colaterais: lutas espelhadas de trios sorteados

/**
 * n pares de trios sorteados (formação e tática sorteadas), cada par jogado dos dois lados com a mesma semente.
 * Com terreno, cada par usa o terreno de um lugar (rodando). Devolve turnos médios, % de quem começa, % por monstro e por elemento.
 */
export function espelhadas(exp, n = 3000, semente = 'espelho') {
  const rng = criarRng(`esp:${semente}`)
  const sorteiaTrio = () => { const ids = MONSTROS.slice(), t = []; for (let i = 0; i < 3; i++) t.push(ids.splice(rng.inteiro(ids.length), 1)[0]); return t }
  const vit = Object.fromEntries(MONSTROS.map((m) => [m, [0, 0]]))
  const vitT = Object.fromEntries(TIPOS.map((t) => [t, [0, 0]]))
  let turnos = 0, lutas = 0, comecouVenceu = 0
  for (let i = 0; i < n; i++) {
    const x = sorteiaTrio(), y = sorteiaTrio(), tx = TATICAS[rng.inteiro(3)], ty = TATICAS[rng.inteiro(3)]
    const regras = { ...(exp.regras || {}) }
    const el = ELEMENTO_DO_LUGAR[i % ELEMENTO_DO_LUGAR.length]
    if (exp.terreno?.dano) regras.danoPorTipo = { [el]: exp.terreno.dano }
    if (exp.terreno?.escudo) regras.escudoInicialPorTipo = { [el]: exp.terreno.escudo }
    const rx = Object.keys(regras).length ? regras : undefined
    for (const [A, B, ta, tb] of [[x, y, tx, ty], [y, x, ty, tx]]) {
      const r = lutaAutomatica({ semente: `${semente}:${i}`, timeA: A, timeB: B, ordensA: { tatica: ta }, ordensB: { tatica: tb }, regras: rx })
      const venc = r.resultado.vencedor
      turnos += r.resultado.turno; lutas++
      if (r.eventos[0]?.comecou === venc) comecouVenceu++
      for (const [time, lado] of [[A, 'A'], [B, 'B']]) for (const m of time) {
        vit[m][1]++; vitT[TIPO[m]][1]++
        if (venc === lado) { vit[m][0]++; vitT[TIPO[m]][0]++ }
      }
    }
  }
  const pct = (o) => Object.fromEntries(Object.entries(o).map(([k, [v, t]]) => [k, t ? v / t : NaN]))
  const pm = pct(vit), pt = pct(vitT)
  const todos = [...Object.values(pm), ...Object.values(pt)]
  return { lutas, turnos: turnos / lutas, quemComeca: comecouVenceu / lutas, porMonstro: pm, porElemento: pt, pior: { min: Math.min(...todos), max: Math.max(...todos) }, ok: Math.min(...todos) >= 0.42 && Math.max(...todos) <= 0.58 }
}

// ------------------------------------------------------------------ rodar uma variante (com cache de matriz)

function chaveDaMatriz(arenas, lutas, semente, regrasA) {
  return createHash('sha256').update(JSON.stringify({ v: 1, arenas: arenas.map((a) => [a.guarda, a.ordens.tatica, a.regras ?? null]), lutas, semente, regrasA: regrasA ?? null })).digest('hex').slice(0, 16)
}
async function matrizComCache({ arenas, lutas, semente, regrasA, workers }) {
  const k = chaveDaMatriz(arenas, lutas, semente, regrasA)
  const arq = `.cache/experimentos/matriz-${k}.json`
  if (existsSync(arq)) return JSON.parse(readFileSync(arq, 'utf8'))
  const M = await medirArenas({ arenas, lutas, semente, regrasA, workers })
  mkdirSync('.cache/experimentos', { recursive: true })
  writeFileSync(arq, JSON.stringify(M))
  return M
}

export async function rodarExperimento(nome, { lutas = 40, semente = 'patrulhas', workers = availableParallelism(), espelho = 3000 } = {}) {
  const exp = EXPERIMENTOS[nome]
  if (!exp) throw new Error('Experimento desconhecido: ' + nome)
  const { arenas, semana1, semana2 } = arenasDoExperimento(exp)
  const t0 = Date.now()
  const M = await matrizComCache({ arenas, lutas, semente, workers })
  const v6 = exp.divisao?.v6
  const Mt = v6 ? await matrizComCache({ arenas, lutas, semente, workers, regrasA: { vidaInicial: { A: [v6.vida, v6.vida, v6.vida] } } }) : null
  const contas = sortearContas(semente)
  const r = analisar({ exp, M, Mt, arenas, semana1, semana2, contas })
  r.espelho = espelhadas(exp, espelho)
  r.nome = nome; r.nota = exp.nota; r.lutas = lutas; r.segundos = (Date.now() - t0) / 1000
  r.arenas = arenas.map((a) => ({ guarda: a.guarda, tatica: a.ordens.tatica, regras: a.regras }))
  r.semana1 = semana1; r.semana2 = semana2
  return r
}

// ------------------------------------------------------------------ terminal

const ehPrincipal = isMainThread && process.argv[1]?.endsWith('experimentos-patrulhas.mjs')
if (ehPrincipal) {
  const args = process.argv.slice(2)
  const lerArg = (k, p) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : p }
  if (args.includes('--lista')) {
    for (const [k, e] of Object.entries(EXPERIMENTOS)) console.log(`${k.padEnd(16)} ${e.nota}`)
    process.exit(0)
  }
  const nomes = args.includes('--todos') ? Object.keys(EXPERIMENTOS) : String(lerArg('--experimento', 'hoje')).split(',')
  const lutas = Math.max(1, parseInt(lerArg('--lutas', '40'), 10) || 40)
  const semente = String(lerArg('--semente', 'patrulhas'))
  const workers = Math.max(1, parseInt(lerArg('--workers', String(availableParallelism())), 10) || 1)
  const espelho = Math.max(10, parseInt(lerArg('--espelho', '3000'), 10) || 3000)
  const pct = (x) => (100 * x).toFixed(1) + '%'
  const ok = (b) => (b ? 'OK ' : 'NÃO')
  mkdirSync('.cache/experimentos', { recursive: true })
  console.log('variante         a(≤40)      b(≥10)      c(≥10)      d(≥5)   e(≥30)      f      | turnos começa  pior(42–58)  posição obrig.')
  for (const nome of nomes) {
    const r = await rodarExperimento(nome, { lutas, semente, workers, espelho })
    writeFileSync(`.cache/experimentos/${nome}-${lutas}.json`, JSON.stringify(r, null, 1))
    console.log(`${nome.padEnd(16)} ${ok(r.a.ok)}${pct(r.a.medido).padStart(6)}  ${ok(r.b.ok)}${pct(r.b.medido).padStart(6)}  ${ok(r.c.ok)}${pct(r.c.medido).padStart(6)}  ${ok(r.d.ok)}${String(r.d.medido).padStart(3)}  ${ok(r.e.ok)}${pct(r.e.medido).padStart(6)}  ${ok(r.f.ok)}${r.f.falhas}/10 | ${r.espelho.turnos.toFixed(2)}  ${pct(r.espelho.quemComeca)}  ${pct(r.espelho.pior.min)}–${pct(r.espelho.pior.max)}  ${r.g.formacao.toFixed(1)}  ${r.obrigatorio.monstro} ${pct(r.obrigatorio.presenca)}  (${r.segundos.toFixed(0)} s)`)
  }
}
