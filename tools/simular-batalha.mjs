// Frayz — simulador de lutas em lote (sem tela). Mede o equilíbrio dos números PROVISÓRIOS de shared/config.js.
//   node tools/simular-batalha.mjs [--lutas N] [--semente S] [--duelo N] [--robos planejador,planejador]
// Padrão: 10.000 lutas planejador × planejador com times sorteados (3 bonecos prontos diferentes por time,
// ordem sorteada) + um duelo planejador × ganancioso (lados alternados, padrão N/5 lutas, mín. 200).
// ALERTA: carta ou tipo com taxa de vitória acima de 55% ou abaixo de 45%.
import { criarLuta } from '../shared/batalha.js'
import { BONECOS_PRONTOS, CARTAS, NOMES_DOS_TIPOS, TIPOS } from '../shared/config.js'
import { criarRng } from '../shared/rng.js'
import { jogarTurno } from '../shared/robos.js'

export function lerArgs(argv) {
  const o = { lutas: 10000, semente: 'frayz', duelo: null, robos: ['planejador', 'planejador'] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = argv[i + 1]
    if (a === '--lutas') { o.lutas = Math.max(1, parseInt(v, 10) || 1); i++ }
    else if (a === '--semente') { o.semente = String(v); i++ }
    else if (a === '--duelo') { o.duelo = Math.max(0, parseInt(v, 10) || 0); i++ }
    else if (a === '--robos') { o.robos = String(v).split(','); i++ }
  }
  if (o.duelo === null) o.duelo = Math.max(200, Math.round(o.lutas / 5))
  return o
}

const IDS = Object.keys(BONECOS_PRONTOS)

export function sortearTime(rng) {
  const ids = IDS.slice(), t = []
  for (let i = 0; i < 3; i++) t.push(ids.splice(rng.inteiro(ids.length), 1)[0])
  return t
}

/** Roda uma luta de robôs até o fim. Devolve o estado final e as viradas pelo Último Fio. */
export function rodarLuta({ semente, timeA, timeB, roboA, roboB }) {
  const e = criarLuta({ semente, timeA, timeB })
  e.registro = false
  let virada = false
  for (let g = 0; g < 200 && !e.fim; g++) {
    const t = e.vez
    jogarTurno(e, t === 'A' ? roboA : roboB)
  }
  if (!e.fim) throw new Error(`Luta não terminou (semente ${semente})`)
  // virada pelo Último Fio: o time vencedor jogou carta com um boneco que estava no Último Fio
  for (const b of Object.values(e.bonecos)) if (b.time === e.fim.vencedor && b.cartasNoFio > 0) virada = true
  return { e, virada }
}

function conta() { return { v: 0, n: 0 } }
const pct = (c) => (c.n ? (100 * c.v) / c.n : 0)

export function simular({ lutas, semente, duelo, robos }) {
  const rng = criarRng(`sim:${semente}`)
  const porCarta = {}, porTipo = {}, porBoneco = {}
  for (const k of Object.keys(CARTAS)) porCarta[k] = conta()
  for (const k of TIPOS) porTipo[k] = conta()
  for (const k of IDS) porBoneco[k] = conta()
  let somaTurnos = 0, tesoura = 0, desempate = 0, comecouVenceu = 0, viradas = 0
  const duracoes = {}
  for (let i = 0; i < lutas; i++) {
    const timeA = sortearTime(rng), timeB = sortearTime(rng)
    const { e, virada } = rodarLuta({ semente: `${semente}:${i}`, timeA, timeB, roboA: robos[0], roboB: robos[1 % robos.length] })
    const f = e.fim
    somaTurnos += f.turno
    duracoes[f.turno] = (duracoes[f.turno] || 0) + 1
    if (f.motivo === 'tesoura' || f.turno >= 12) tesoura++
    if (f.motivo === 'desempate') desempate++
    if (f.vencedor === e.comecou) comecouVenceu++
    if (virada) viradas++
    // taxas: cada item conta uma vez por time; item presente nos DOIS times (espelho) não conta
    const itens = (t, tipoItem) => {
      const s = new Set()
      for (const id of e.times[t].lugares) {
        const b = e.bonecos[id]
        if (tipoItem === 'tipo') s.add(b.tipo)
        else if (tipoItem === 'boneco') s.add(b.pronto)
      }
      if (tipoItem === 'carta') for (const c of Object.values(e.cartas)) if (c.dono[0] === t) s.add(c.carta)
      return s
    }
    for (const [tabela, tipoItem] of [[porCarta, 'carta'], [porTipo, 'tipo'], [porBoneco, 'boneco']]) {
      const a = itens('A', tipoItem), b = itens('B', tipoItem)
      for (const k of a) if (!b.has(k)) { tabela[k].n++; if (f.vencedor === 'A') tabela[k].v++ }
      for (const k of b) if (!a.has(k)) { tabela[k].n++; if (f.vencedor === 'B') tabela[k].v++ }
    }
  }
  // duelo planejador × ganancioso, lados alternados
  let planVenceu = 0
  for (let i = 0; i < duelo; i++) {
    const planA = i % 2 === 0
    const timeA = sortearTime(rng), timeB = sortearTime(rng)
    const { e } = rodarLuta({ semente: `${semente}:duelo:${i}`, timeA, timeB, roboA: planA ? 'planejador' : 'ganancioso', roboB: planA ? 'ganancioso' : 'planejador' })
    if ((e.fim.vencedor === 'A') === planA) planVenceu++
  }
  return {
    lutas, duelo,
    duracaoMedia: somaTurnos / lutas,
    duracoes,
    pctTesoura: (100 * tesoura) / lutas,
    pctDesempate: (100 * desempate) / lutas,
    pctComecouVenceu: (100 * comecouVenceu) / lutas,
    pctViradaUltimoFio: (100 * viradas) / lutas,
    pctPlanejador: duelo ? (100 * planVenceu) / duelo : null,
    porCarta, porTipo, porBoneco,
  }
}

function imprimir(r, o) {
  const f1 = (x) => x.toFixed(1)
  const alerta = (c) => (c.n && (pct(c) > 55 || pct(c) < 45) ? '  ALERTA' : '')
  const linhas = []
  linhas.push(`Frayz — simulador de batalha (números PROVISÓRIOS)`)
  linhas.push(`lutas: ${r.lutas} (${o.robos.join(' × ')}) · semente: ${o.semente}`)
  linhas.push(`duração média: ${f1(r.duracaoMedia)} turnos · por turno: ${Object.entries(r.duracoes).map(([k, v]) => `${k}:${v}`).join(' ')}`)
  linhas.push(`decididas pela Tesoura (queda pela Tesoura ou fim no turno 12): ${f1(r.pctTesoura)}% · desempate por sorteio: ${f1(r.pctDesempate)}%`)
  linhas.push(`quem começa vence: ${f1(r.pctComecouVenceu)}%${r.pctComecouVenceu < 47 || r.pctComecouVenceu > 53 ? '  ALERTA' : ''}`)
  linhas.push(`vencedor jogou carta no Último Fio (virada): ${f1(r.pctViradaUltimoFio)}%`)
  if (r.pctPlanejador !== null) linhas.push(`planejador × ganancioso: planejador vence ${f1(r.pctPlanejador)}% (${r.duelo} lutas)${r.pctPlanejador <= 58 ? '  ALERTA' : ''}`)
  linhas.push('', 'por tipo (tronco):')
  for (const k of TIPOS) linhas.push(`  ${NOMES_DOS_TIPOS[k].padEnd(8)} ${f1(pct(r.porTipo[k])).padStart(5)}%  (${r.porTipo[k].n})${alerta(r.porTipo[k])}`)
  linhas.push('', 'por carta:')
  for (const k of Object.keys(CARTAS).sort((a, b) => pct(r.porCarta[b]) - pct(r.porCarta[a]))) {
    linhas.push(`  ${CARTAS[k].nome.padEnd(20)} ${f1(pct(r.porCarta[k])).padStart(5)}%  (${r.porCarta[k].n})${alerta(r.porCarta[k])}`)
  }
  linhas.push('', 'por boneco pronto:')
  for (const k of IDS.slice().sort((a, b) => pct(r.porBoneco[b]) - pct(r.porBoneco[a]))) {
    linhas.push(`  ${k.padEnd(12)} ${f1(pct(r.porBoneco[k])).padStart(5)}%  (${r.porBoneco[k].n})${alerta(r.porBoneco[k])}`)
  }
  console.log(linhas.join('\n'))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const o = lerArgs(process.argv.slice(2))
  const t0 = performance.now()
  const r = simular(o)
  imprimir(r, o)
  console.log(`\n(${((performance.now() - t0) / 1000).toFixed(1)} s)`)
}
