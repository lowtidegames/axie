// Idle por patrulhas — a MATRIZ trio × lugar (docs/ideias/jogo-idle.md N3 e §9, critérios do economista). Só MEDE.
//   node tools/simular-patrulhas.mjs [--lutas N] [--semente S] [--rapido] [--workers W]
// Casa = trio (84 = 9 monstros prontos, 3 a 3) × formação (6 permutações) × tática do trio (3) × lugar (5, guarda fixa
// de shared/lugares.js). N lutas por casa (padrão 400), semente fixa, as mesmas sementes em todas as casas.
// Os dois lados usam o escolhedor (shared/tatica.js, lutaAutomatica). Nenhum número muda: os pesos dos lugares e a
// sequência (3 vitórias = +50%) são LIDOS do conjunto R2 de tools/simular-economia.mjs (docs/ideias/economia-do-pote.md).
// Pontos por energia de um trio num lugar = peso × (p + bônus × p^3), p = vitória na MELHOR formação+tática do trio
// ali (a mesma conta do simulador de economia). Saída: tabela no terminal + .cache/patrulhas.json (não commitado).
// Cenário B (só para comparar, nada é gravado): pesos ∝ 1 / vitória média do lugar, na escala de hoje.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { mkdirSync, writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { montarBoneco, bateForte, reproduzir } from '../shared/batalha.js'
import { BONECOS_PRONTOS, CARTAS } from '../shared/config.js'
import { criarRng } from '../shared/rng.js'
import { LUGARES } from '../shared/lugares.js'
import { TATICAS, lutaAutomatica } from '../shared/tatica.js'
import { CONJUNTOS } from './simular-economia.mjs'

export const MONSTROS = Object.keys(BONECOS_PRONTOS)
export const FORMACOES = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]

/** Os 84 trios (índices em MONSTROS, crescentes). */
export function todosOsTrios(n = MONSTROS.length) {
  const out = []
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) out.push([a, b, c])
  return out
}

/** Pesos de hoje (R2) e regra da sequência, lidos do simulador de economia. */
export function economiaDeHoje() {
  const R = CONJUNTOS.R2.RESULTADO
  return { pesos: R.fases.map((f) => f.peso), seqK: R.seqK, seqBonus: R.seqBonus }
}

// ------------------------------------------------------------------ medição (pura; roda em worker ou direto)

const TIPO = Object.fromEntries(MONSTROS.map((m) => [m, montarBoneco(m).tipo]))

/** Uma luta do trio (já na formação) contra a guarda do lugar. Devolve vitória, Strong dados/levados e turnos. */
export function lutaDaCasa(semente, time, tatica, lug) {
  const r = lutaAutomatica({ semente, timeA: time, timeB: lug.guarda, ordensA: { tatica }, ordensB: lug.ordens })
  const tipo = { A0: TIPO[time[0]], A1: TIPO[time[1]], A2: TIPO[time[2]], B0: TIPO[lug.guarda[0]], B1: TIPO[lug.guarda[1]], B2: TIPO[lug.guarda[2]] }
  let dados = 0, levados = 0
  for (const ev of r.eventos) {
    if (ev.t !== 'dano' || ev.refletido || !ev.carta || !ev.de) continue
    if (!bateForte(CARTAS[ev.carta].tipo, tipo[ev.alvo])) continue
    if (ev.de[0] === 'A') dados++
    else levados++
  }
  return { venceu: r.resultado.vencedor === 'A', dados, levados, turnos: r.resultado.turno }
}

/**
 * Mede as casas pedidas. trios: lista de trios (índices); devolve um Float64Array por trio com
 * [formação][tática][lugar][v, dados, levados, turnos] (somas).
 */
export function medirTrios({ trios, lutas, semente }) {
  const out = []
  for (const tr of trios) {
    const a = new Float64Array(FORMACOES.length * TATICAS.length * LUGARES.length * 4)
    let k = 0
    for (const f of FORMACOES) {
      const time = f.map((i) => MONSTROS[tr[i]])
      for (const tatica of TATICAS) {
        for (const lug of LUGARES) {
          let v = 0, d = 0, l = 0, t = 0
          for (let i = 0; i < lutas; i++) {
            const r = lutaDaCasa(`${semente}:${i}`, time, tatica, lug)
            if (r.venceu) v++
            d += r.dados; l += r.levados; t += r.turnos
          }
          a[k++] = v; a[k++] = d; a[k++] = l; a[k++] = t
        }
      }
    }
    out.push(a)
  }
  return out
}

if (!isMainThread && workerData?.patrulhas) {
  parentPort.postMessage(medirTrios(workerData))
}

/** Mede a matriz inteira, repartida em workers. Devolve { trios, lutas, semente, casas: [Float64Array por trio] }. */
export async function medirMatriz({ lutas, semente, workers = availableParallelism(), trios = todosOsTrios() }) {
  const n = Math.max(1, Math.min(workers, trios.length))
  const partes = Array.from({ length: n }, () => [])
  trios.forEach((t, i) => partes[i % n].push(i))
  const casas = new Array(trios.length)
  if (n === 1) medirTrios({ trios, lutas, semente }).forEach((a, i) => { casas[i] = a })
  else {
    await Promise.all(partes.map((idx) => new Promise((ok, falha) => {
      const w = new Worker(new URL(import.meta.url), { workerData: { patrulhas: true, trios: idx.map((i) => trios[i]), lutas, semente } })
      w.once('message', (res) => { res.forEach((a, j) => { casas[idx[j]] = a }); ok() })
      w.once('error', falha)
      w.once('exit', (c) => { if (c !== 0) falha(new Error('worker saiu com ' + c)) })
    })))
  }
  return { trios, lutas, semente, casas }
}

// ------------------------------------------------------------------ análise (pura)

const NL = () => LUGARES.length
const idx = (f, k, l) => ((f * TATICAS.length + k) * NL() + l) * 4
export const mediana = (xs) => { const s = xs.slice().sort((a, b) => a - b); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN }

/** p[t][l][f][k] = % de vitória (0..1). */
export function taxas(M) {
  return M.casas.map((a) => Array.from({ length: NL() }, (_, l) => FORMACOES.map((_, f) => TATICAS.map((_, k) => a[idx(f, k, l)] / M.lutas))))
}

/** Melhor formação+tática de cada trio em cada lugar: { p, f, k }. */
export function melhores(P) {
  return P.map((porLugar) => porLugar.map((fk) => {
    let best = { p: -1, f: 0, k: 0 }
    fk.forEach((ks, f) => ks.forEach((p, k) => { if (p > best.p) best = { p, f, k } }))
    return best
  }))
}

export const pontos = (p, peso, eco) => peso * (p + eco.seqBonus * p ** eco.seqK)

/** Pontos por energia [trio][lugar] com pesos dados; guarda[l] = qual guarda está no lugar l (rodízio). */
export function tabelaDePontos(B, pesos, eco, guarda = LUGARES.map((_, l) => l)) {
  return B.map((porLugar) => pesos.map((w, l) => pontos(porLugar[guarda[l]].p, w, eco)))
}

const argmax = (xs) => xs.reduce((bi, x, i) => (x > xs[bi] ? i : bi), 0)

/** Critérios a, b, c para uma tabela de pontos. */
export function criteriosABC(T) {
  const nT = T.length, n = T[0].length
  const melhor = T.map(argmax)
  const conta = Array(n).fill(0)
  melhor.forEach((l) => conta[l]++)
  const fatias = conta.map((c) => c / nT)
  const popular = argmax(conta)
  const custos = T.map((linha, t) => 1 - linha[popular] / linha[melhor[t]])
  const custosFora = custos.filter((_, t) => melhor[t] !== popular)
  return {
    fatias, popular, melhor,
    a: { medido: Math.max(...fatias), ok: Math.max(...fatias) <= 0.40 },
    b: { medido: Math.min(...fatias), ok: Math.min(...fatias) >= 0.10 },
    c: { medido: mediana(custos), entreQuemPerde: mediana(custosFora), ok: mediana(custos) >= 0.10 },
  }
}

/** 100 contas sorteadas (9 a 15 monstros dos 9 prontos, com repetição). Devolve os tipos que cada uma tem. */
export function sortearContas(semente, n = 100) {
  const rng = criarRng(`contas:${semente}`)
  const out = []
  for (let i = 0; i < n; i++) {
    const tam = 9 + rng.inteiro(7)
    const tem = new Set()
    for (let j = 0; j < tam; j++) tem.add(rng.inteiro(MONSTROS.length))
    out.push(tem)
  }
  return out
}

/**
 * Plano ótimo de 20 energias de uma conta: até 3 patrulhas (trios sem monstro repetido de tipo).
 * Pontos são lineares na energia, então o ótimo põe as 20 no melhor par trio × lugar (as outras patrulhas ficam com 0).
 */
export function planoOtimo(T, trios, tem) {
  let best = null
  trios.forEach((tr, t) => {
    if (!tr.every((m) => tem.has(m))) return
    T[t].forEach((v, l) => { if (!best || v > best.v) best = { v, t, l } })
  })
  return best
}

/** Critérios d e e (contas) para uma tabela de pontos e a mesma com as guardas em rodízio. */
export function criteriosDE(T, Trod, trios, contas) {
  const planos = contas.map((tem) => planoOtimo(T, trios, tem))
  const distintos = new Set(planos.map((p) => `${p.t}@${p.l}`))
  const lugaresDistintos = new Set(planos.map((p) => p.l))
  const depois = contas.map((tem) => planoOtimo(Trod, trios, tem))
  const mudou = planos.filter((p, i) => p.l !== depois[i].l).length / contas.length
  const mudouPlano = planos.filter((p, i) => p.l !== depois[i].l || p.t !== depois[i].t).length / contas.length
  return {
    d: { medido: distintos.size, lugaresDistintos: lugaresDistintos.size, ok: distintos.size >= 5 },
    e: { medido: mudou, mudouPlano, ok: mudou >= 0.30 },
  }
}

/** Ruído esperado: amplitude (máx − mín) de m taxas binomiais iguais (mesma p) com N lutas. Mediana de 2000 sorteios. */
export function amplitudeDoAcaso(p, m, N, semente = 'ruido') {
  const rng = criarRng(`${semente}:${p}:${m}:${N}`)
  const sd = Math.sqrt(Math.max(p * (1 - p), 1e-9) / N)
  const xs = []
  for (let s = 0; s < 2000; s++) {
    let mx = -Infinity, mn = Infinity
    for (let j = 0; j < m; j++) {
      const u1 = Math.max(rng.proximo(), 1e-12), u2 = rng.proximo()
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      const x = p + sd * z
      if (x > mx) mx = x
      if (x < mn) mn = x
    }
    xs.push(mx - mn)
  }
  return mediana(xs)
}

/** Critério g: amplitude de vitória (pontos percentuais) entre formações e entre táticas. */
export function criterioG(P, lutas) {
  const form = [], tat = []
  let pMedio = 0, n = 0
  for (const porLugar of P) for (const fk of porLugar) {
    for (let k = 0; k < TATICAS.length; k++) { const xs = fk.map((ks) => ks[k]); form.push(Math.max(...xs) - Math.min(...xs)) }
    for (const ks of fk) { tat.push(Math.max(...ks) - Math.min(...ks)); for (const p of ks) { pMedio += p; n++ } }
  }
  pMedio /= n
  return {
    formacao: 100 * mediana(form), formacaoAcaso: 100 * amplitudeDoAcaso(pMedio, FORMACOES.length, lutas),
    tatica: 100 * mediana(tat), taticaAcaso: 100 * amplitudeDoAcaso(pMedio, TATICAS.length, lutas),
  }
}

/** Rodízio simples de exemplo: o lugar l recebe a guarda do lugar l+1 (o 5º recebe a do 1º); o peso fica no lugar. */
export const RODIZIO = LUGARES.map((_, l) => (l + 1) % LUGARES.length)

/** Todos os critérios com um conjunto de pesos. */
export function criterios(M, pesos, eco, { contas = sortearContas(M.semente) } = {}) {
  const P = taxas(M), B = melhores(P)
  const T = tabelaDePontos(B, pesos, eco)
  const abc = criteriosABC(T)
  const de = criteriosDE(T, tabelaDePontos(B, pesos, eco, RODIZIO), M.trios, contas)
  // f: cada peso ±10%, um de cada vez (10 variações); a–c têm de valer em todas
  const variacoes = []
  for (let l = 0; l < pesos.length; l++) for (const s of [1.1, 0.9]) {
    const w = pesos.slice(); w[l] *= s
    const r = criteriosABC(tabelaDePontos(B, w, eco))
    variacoes.push({ lugar: l + 1, fator: s, a: r.a.medido, b: r.b.medido, c: r.c.medido, ok: r.a.ok && r.b.ok && r.c.ok })
  }
  const f = {
    ok: variacoes.every((v) => v.ok), falhas: variacoes.filter((v) => !v.ok).length,
    piorA: Math.max(...variacoes.map((v) => v.a)), piorB: Math.min(...variacoes.map((v) => v.b)), piorC: Math.min(...variacoes.map((v) => v.c)),
  }
  const pontoMedio = mediana(T.map((linha) => Math.max(...linha)))
  return { pesos, ...abc, ...de, f, variacoes, pontoMedio }
}

/** Pesos B: inverso da vitória média de cada lugar (todas as casas), na escala de hoje (mesma média de pontos do melhor lugar). */
export function pesosB(M, pesosHoje, eco) {
  const P = taxas(M), B = melhores(P)
  const media = LUGARES.map((_, l) => { let s = 0, n = 0; for (const t of P) for (const ks of t[l]) for (const p of ks) { s += p; n++ } return s / n })
  const cru = media.map((m) => 1 / Math.max(m, 1e-6))
  const base = cru.map((x) => x / cru[0])
  const alvo = mediana(tabelaDePontos(B, pesosHoje, eco).map((l) => Math.max(...l)))
  const agora = mediana(tabelaDePontos(B, base, eco).map((l) => Math.max(...l)))
  const k = alvo / agora
  return { media, relativos: base, pesos: base.map((x) => x * k) }
}

/** Resumo por lugar: vitória média, vitória média na melhor config, Strong dados/levados por luta, turnos. */
export function resumoPorLugar(M) {
  const P = taxas(M), B = melhores(P)
  return LUGARES.map((lug, l) => {
    let v = 0, d = 0, lv = 0, t = 0, n = 0
    for (const a of M.casas) for (let f = 0; f < FORMACOES.length; f++) for (let k = 0; k < TATICAS.length; k++) {
      const i = idx(f, k, l); v += a[i]; d += a[i + 1]; lv += a[i + 2]; t += a[i + 3]; n += M.lutas
    }
    return { lugar: lug.id, guarda: lug.guarda, vitoria: v / n, vitoriaMelhor: B.reduce((s, b) => s + b[l].p, 0) / B.length, strongDados: d / n, strongLevados: lv / n, turnos: t / n }
  })
}

/** Item 5 (piloto): os 2 lugares e 6 monstros com a diferença mais clara entre trio certo e trio errado. */
export function escolhaDoPiloto(M) {
  const B = melhores(taxas(M))
  const pos = new Map(M.trios.map((t, i) => [t.join(','), i]))
  const n = MONSTROS.length
  let melhor = null
  const seis = (function* () {
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) for (let f = e + 1; f < n; f++) yield [a, b, c, d, e, f]
  })()
  for (const s of seis) {
    const tri = todosOsTrios(6).map((t) => t.map((i) => s[i]))
    const ts = tri.map((t) => pos.get(t.join(','))).filter((x) => x !== undefined)
    if (ts.length !== 20) continue
    for (let x = 0; x < LUGARES.length; x++) for (let y = x + 1; y < LUGARES.length; y++) {
      const tx = ts.reduce((bi, t) => (B[t][x].p > B[bi][x].p ? t : bi), ts[0])
      const ty = ts.reduce((bi, t) => (B[t][y].p > B[bi][y].p ? t : bi), ts[0])
      if (tx === ty) continue
      const gap = Math.min(B[tx][x].p - B[tx][y].p, B[ty][y].p - B[ty][x].p)
      const ok = B[tx][x].p >= 0.70 && B[tx][y].p <= 0.40 && B[ty][y].p >= 0.70 && B[ty][x].p <= 0.40
      const score = (ok ? 1 : 0) * 10 + gap
      if (!melhor || score > melhor.score) {
        melhor = { score, ok, gap, lugares: [LUGARES[x].id, LUGARES[y].id], monstros: s.map((i) => MONSTROS[i]),
          trioX: { trio: M.trios[tx].map((i) => MONSTROS[i]), formacao: FORMACOES[B[tx][x].f], tatica: TATICAS[B[tx][x].k], noX: B[tx][x].p, noY: B[tx][y].p },
          trioY: { trio: M.trios[ty].map((i) => MONSTROS[i]), formacao: FORMACOES[B[ty][y].f], tatica: TATICAS[B[ty][y].k], noY: B[ty][y].p, noX: B[ty][x].p } }
      }
    }
  }
  return melhor
}

/** Tempo por luta automática (com eventos, como o servidor rodaria): média e pior caso em ms. */
export function medirTempo(n = 2000, semente = 'tempo') {
  const trios = todosOsTrios()
  let soma = 0, pior = 0
  for (let i = 0; i < n; i++) {
    const tr = trios[i % trios.length].map((x) => MONSTROS[x]), lug = LUGARES[i % LUGARES.length]
    const t0 = performance.now()
    const r = lutaAutomatica({ semente: `${semente}:${i}`, timeA: tr, timeB: lug.guarda, ordensA: { tatica: TATICAS[i % 3] }, ordensB: lug.ordens })
    const dt = performance.now() - t0
    soma += dt; if (dt > pior) pior = dt
    if (i === 0 && !reproduzir({ semente: `${semente}:${i}`, timeA: tr, timeB: lug.guarda, comandos: r.comandos }).ok) throw new Error('replay falhou')
  }
  return { media: soma / n, pior }
}

// ------------------------------------------------------------------ terminal

const ehPrincipal = isMainThread && process.argv[1]?.endsWith('simular-patrulhas.mjs')
if (ehPrincipal) {
  const args = process.argv.slice(2)
  const lerArg = (k, p) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : p }
  const rapido = args.includes('--rapido')
  const LUTAS = Math.max(1, parseInt(lerArg('--lutas', rapido ? '6' : '400'), 10) || 400)
  const SEMENTE = String(lerArg('--semente', 'patrulhas'))
  const WORKERS = Math.max(1, parseInt(lerArg('--workers', String(availableParallelism())), 10) || 1)
  const eco = economiaDeHoje()
  const pct = (x) => (100 * x).toFixed(1) + '%'
  const f2 = (x) => x.toFixed(2)
  const t0 = Date.now()
  console.log(`Patrulhas — matriz trio × lugar: ${todosOsTrios().length} trios × ${FORMACOES.length} formações × ${TATICAS.length} táticas × ${LUGARES.length} lugares × ${LUTAS} lutas (semente "${SEMENTE}", ${WORKERS} workers)`)
  const M = await medirMatriz({ lutas: LUTAS, semente: SEMENTE, workers: WORKERS })
  const seg = (Date.now() - t0) / 1000
  const total = M.trios.length * FORMACOES.length * TATICAS.length * LUGARES.length * LUTAS
  console.log(`${total.toLocaleString('pt-BR')} lutas em ${seg.toFixed(1)} s\n`)

  const resumo = resumoPorLugar(M)
  console.log('Lugar   guarda (Front, Middle, Back)          vitória média · na melhor config · Strong dados/levados por luta · turnos')
  for (const r of resumo) console.log(`${r.lugar}  ${r.guarda.join(', ').padEnd(36)}  ${pct(r.vitoria).padStart(6)} · ${pct(r.vitoriaMelhor).padStart(6)} · ${f2(r.strongDados)} / ${f2(r.strongLevados)} · ${f2(r.turnos)}`)

  const A = criterios(M, eco.pesos, eco)
  const pb = pesosB(M, eco.pesos, eco)
  const Bc = criterios(M, pb.pesos, eco)
  const G = criterioG(taxas(M), LUTAS)
  const linha = (nome, c) => {
    console.log(`\n${nome} — pesos ${c.pesos.map(f2).join(' · ')} · sequência ${eco.seqK} vitórias = +${eco.seqBonus * 100}%`)
    console.log(`   melhor lugar por trio: ${c.fatias.map((x, l) => `L${l + 1} ${pct(x)}`).join(' · ')} (popular: L${c.popular + 1}) · ponto mediano por energia ${f2(c.pontoMedio)}`)
    const ok = (b) => (b ? 'APROVADO ' : 'REPROVADO')
    console.log(`   a) nenhum lugar > 40% dos trios ........ ${ok(c.a.ok)} ${pct(c.a.medido)}`)
    console.log(`   b) cada lugar ≥ 10% dos trios .......... ${ok(c.b.ok)} ${pct(c.b.medido)}`)
    console.log(`   c) lugar popular custa ≥ 10% (mediana).. ${ok(c.c.ok)} ${pct(c.c.medido)} (só quem não tem o popular como melhor: ${pct(c.c.entreQuemPerde || 0)})`)
    console.log(`   d) ≥ 5 planos ótimos em 100 contas ..... ${ok(c.d.ok)} ${c.d.medido} planos (${c.d.lugaresDistintos} lugares distintos)`)
    console.log(`   e) rodízio muda ≥ 30% das contas ....... ${ok(c.e.ok)} ${pct(c.e.medido)} mudam de lugar (${pct(c.e.mudouPlano)} mudam de plano)`)
    console.log(`   f) a–c valem com pesos ±10% ............ ${ok(c.f.ok)} ${c.f.falhas}/10 variações falham · pior a ${pct(c.f.piorA)} · pior b ${pct(c.f.piorB)} · pior c ${pct(c.f.piorC)}`)
  }
  linha('PESOS DE HOJE', A)
  linha(`CENÁRIO B (inverso da vitória média: ${pb.media.map(pct).join(' · ')})`, Bc)
  console.log(`\n   g) posição: melhor − pior formação (mesmo trio, lugar e tática), mediana: ${G.formacao.toFixed(1)} pontos (acaso com ${LUTAS} lutas: ${G.formacaoAcaso.toFixed(1)})`)
  console.log(`      tática: melhor − pior tática (mesmo trio, lugar e formação), mediana: ${G.tatica.toFixed(1)} pontos (acaso: ${G.taticaAcaso.toFixed(1)})`)

  const pil = escolhaDoPiloto(M)
  console.log(`\n5. Piloto: lugares ${pil.lugares.join(' e ')} · monstros ${pil.monstros.join(', ')} · ${pil.ok ? 'atinge 70/40 nos dois sentidos' : 'NÃO atinge 70/40'} (folga ${(100 * pil.gap).toFixed(1)} pontos)`)
  console.log(`   melhor trio para ${pil.lugares[0]}: ${pil.trioX.trio.join(', ')} (formação ${pil.trioX.formacao.join('')}, ${pil.trioX.tatica}) → ${pct(pil.trioX.noX)} lá · ${pct(pil.trioX.noY)} no ${pil.lugares[1]}`)
  console.log(`   melhor trio para ${pil.lugares[1]}: ${pil.trioY.trio.join(', ')} (formação ${pil.trioY.formacao.join('')}, ${pil.trioY.tatica}) → ${pct(pil.trioY.noY)} lá · ${pct(pil.trioY.noX)} no ${pil.lugares[0]}`)

  const tempo = medirTempo(rapido ? 200 : 2000)
  console.log(`\n6. Tempo por luta automática (com eventos, 1 núcleo): média ${tempo.media.toFixed(3)} ms · pior ${tempo.pior.toFixed(2)} ms`)

  mkdirSync('.cache', { recursive: true })
  const P = taxas(M), Bm = melhores(P)
  writeFileSync('.cache/patrulhas.json', JSON.stringify({
    lutas: LUTAS, semente: SEMENTE, segundos: seg, economia: eco, resumo, hoje: { ...A, melhor: undefined }, cenarioB: { ...pb, ...Bc, melhor: undefined }, g: G, piloto: pil, tempo,
    trios: M.trios.map((t, ti) => ({ trio: t.map((i) => MONSTROS[i]), melhorPorLugar: Bm[ti].map((b) => ({ p: b.p, formacao: FORMACOES[b.f], tatica: TATICAS[b.k] })), taxas: P[ti] })),
  }, null, 1))
  console.log(`\nJSON em .cache/patrulhas.json (${((Date.now() - t0) / 1000).toFixed(1)} s no total)`)
}
