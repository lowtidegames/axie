// Piloto — medição do escolhedor da luta automática (public/piloto/tatica.js). Só LÊ o motor; não muda nada.
//   node tools/simular-piloto.mjs [--lutas N] [--semente S]
// Mede (docs/ideias/piloto-monstros.md §6):
//   1. escolhedor (ordem de fábrica, Rush) × robô planejador, com o MESMO trio dos dois lados (alvo ≥ 45%);
//   2. ordem boa (fábrica) × ordem ruim (o contrário), mesmo trio e mesma tática (alvo ≥ 5 pontos);
//   3. cada tática × cada tática (mesmo trio, ordem de fábrica);
//   4. duração média em turnos e em ações (jogadas de carta) das lutas escolhedor × escolhedor;
//   5. o trio do piloto (jogador × rival) com os dois lados no escolhedor.
// Lados alternados (metade das lutas o escolhedor é A, metade B), semente fixa: mesmo resultado sempre.
import { criarLuta } from '../shared/batalha.js'
import { BONECOS_PRONTOS } from '../shared/config.js'
import { criarRng } from '../shared/rng.js'
import { jogarTurno } from '../shared/robos.js'
import { TATICAS, cartasDoMonstro, jogarTurnoEscolhedor, ordemPadrao, ordemRuim } from '../public/piloto/tatica.js'

const args = process.argv.slice(2)
const lerArg = (n, p) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : p }
const LUTAS = Math.max(2, parseInt(lerArg('--lutas', '2000'), 10) || 2000)
const SEMENTE = String(lerArg('--semente', 'piloto'))
const IDS = Object.keys(BONECOS_PRONTOS)

function sortearTrio(rng) {
  const ids = IDS.slice(), t = []
  for (let i = 0; i < 3; i++) t.push(ids.splice(rng.inteiro(ids.length), 1)[0])
  return t
}

/** Plano do escolhedor para o time t do estado inicial. */
function plano(e, t, tatica, ordem = ordemPadrao) {
  const o = {}
  e.times[t].lugares.forEach((id, i) => { o[id] = ordem(cartasDoMonstro(e, id), i) })
  return { tatica, ordem: o }
}

/** lado: { tipo: 'escolhedor', tatica, ordem } | { tipo: 'robo', nome } */
function luta(semente, trioA, trioB, ladoA, ladoB) {
  const e = criarLuta({ semente, timeA: trioA, timeB: trioB })
  e.registro = false
  const planos = { A: ladoA.tipo === 'escolhedor' ? plano(e, 'A', ladoA.tatica, ladoA.ordem) : null, B: ladoB.tipo === 'escolhedor' ? plano(e, 'B', ladoB.tatica, ladoB.ordem) : null }
  const lado = { A: ladoA, B: ladoB }
  for (let g = 0; g < 400 && !e.fim; g++) {
    const t = e.vez
    if (lado[t].tipo === 'escolhedor') jogarTurnoEscolhedor(e, planos[t])
    else jogarTurno(e, lado[t].nome)
  }
  if (!e.fim) throw new Error('luta sem fim: ' + semente)
  const acoes = e.comandos.filter((c) => c.tipo === 'jogar').length
  return { vencedor: e.fim.vencedor, turnos: e.fim.turno, acoes, motivo: e.fim.motivo }
}

/** N lutas X × Y com o mesmo trio, lados alternados. Devolve % de vitória de X e médias. */
function duelo(nome, X, Y, { mesmoTrio = true, trios = null } = {}) {
  const rng = criarRng(`piloto:${SEMENTE}:${nome}`)
  let v = 0, turnos = 0, acoes = 0
  const motivos = {}
  for (let i = 0; i < LUTAS; i++) {
    const tA = trios ? trios[0] : sortearTrio(rng)
    const tB = trios ? trios[1] : mesmoTrio ? tA : sortearTrio(rng)
    const xEhA = i % 2 === 0
    const r = xEhA ? luta(`${SEMENTE}:${nome}:${i}`, tA, tB, X, Y) : luta(`${SEMENTE}:${nome}:${i}`, tB, tA, Y, X)
    if (r.vencedor === (xEhA ? 'A' : 'B')) v++
    turnos += r.turnos; acoes += r.acoes
    motivos[r.motivo] = (motivos[r.motivo] || 0) + 1
  }
  return { pct: (100 * v) / LUTAS, turnos: turnos / LUTAS, acoes: acoes / LUTAS, motivos }
}

const f1 = (x) => x.toFixed(1)
const t0 = Date.now()
const esc = (tatica = 'rush', ordem = ordemPadrao) => ({ tipo: 'escolhedor', tatica, ordem })

console.log(`Piloto — medição do escolhedor (${LUTAS} lutas por linha, semente "${SEMENTE}")\n`)
const p = duelo('vsPlanejador', esc('rush'), { tipo: 'robo', nome: 'planejador' })
console.log(`1. escolhedor (fábrica, Rush) × planejador, mesmo trio: ${f1(p.pct)}% de vitória ${p.pct >= 45 ? '(meta ≥ 45%: OK)' : '(ABAIXO da meta de 45%: o rival do piloto usa o escolhedor)'}`)
for (const tt of ['focus', 'guard']) {
  const q = duelo('vsPlanejador-' + tt, esc(tt), { tipo: 'robo', nome: 'planejador' })
  console.log(`   (com ${tt}: ${f1(q.pct)}%)`)
}
const o = duelo('ordem', esc('rush', ordemPadrao), esc('rush', ordemRuim))
console.log(`2. ordem boa × ordem ruim (Rush, mesmo trio): ${f1(o.pct)}% → diferença ${f1(2 * o.pct - 100)} pontos ${2 * o.pct - 100 >= 5 ? '(meta ≥ 5: OK)' : '(ABAIXO de 5 pontos: a ordem pesa pouco)'}`)
for (const tt of ['focus', 'guard']) {
  const q = duelo('ordem-' + tt, esc(tt, ordemPadrao), esc(tt, ordemRuim))
  console.log(`   (com ${tt}: ${f1(q.pct)}% → ${f1(2 * q.pct - 100)} pontos)`)
}
console.log('3. tática × tática (% de vitória da linha contra a coluna, mesmo trio):')
console.log('          ' + TATICAS.map((t) => t.padStart(8)).join(''))
let soma = { turnos: 0, acoes: 0, n: 0 }
for (const a of TATICAS) {
  const linha = []
  for (const b of TATICAS) {
    const r = duelo(`tat-${a}-${b}`, esc(a), esc(b))
    linha.push(a === b ? '      —' : (f1(r.pct) + '%').padStart(8))
    soma.turnos += r.turnos; soma.acoes += r.acoes; soma.n++
  }
  console.log('   ' + a.padEnd(7) + linha.join(''))
}
console.log(`4. duração média (escolhedor × escolhedor): ${f1(soma.turnos / soma.n)} turnos · ${f1(soma.acoes / soma.n)} ações`)
const piloto = duelo('trioDoPiloto', esc('rush'), esc('rush'), { trios: [['embolado', 'mordedor', 'cascudo'], ['rasgao', 'assombrado', 'desfiado']] })
console.log(`5. trio do piloto (Cobblepup, Snapcoal, Breezle × Burrlet, Wispurr, Ripplance), Rush × Rush: jogador vence ${f1(piloto.pct)}% · ${f1(piloto.turnos)} turnos · ${f1(piloto.acoes)} ações · fins: ${JSON.stringify(piloto.motivos)}`)
console.log(`\n(${((Date.now() - t0) / 1000).toFixed(1)} s)`)
