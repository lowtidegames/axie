// R39 (motor) — vitória na rodada 20 e conquistas em degraus (docs/reino/r39-desenho.md).
// Rodar: node --test tests/servidor/reino-r39-motor.test.js
// O arquivo reino-r39-antes.json foi gerado com o motor do origin/main (9b5be2f "Junta R37" + docs, ANTES do R39) por:
//   GERAR_ANTES=1 node --test tests/servidor/reino-r39-motor.test.js
// Ele guarda, por semente: pontos, vencidas, rodada, motivo, quantos comandos, o hash de TODOS os eventos e do estado final
// (nada guardado na partida pode mudar) e o conjunto das 12 conquistas antigas que a regra de hoje (cópia fiel de
// server/reino/reino.mjs:439-476 do origin/main, abaixo em `regraAntiga`) dá a uma conta que joga só aquela partida.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALBUM, CARTAS, PARTIDA } from '../../shared/reino/config.js'
import { aplicar, criarPartida } from '../../shared/reino/partida.js'
import { escolher } from '../../shared/reino/robos.js'
import { criarRng } from '../../shared/rng.js'
import { cartasPorRodadas } from '../../server/reino/reino.mjs'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const ANTES = path.join(AQUI, 'reino-r39-antes.json')
const N = 200
const ANTIGAS = ['supper', 'road', 'plate', 'last', 'house', 'brass', 'family', 'penny', 'double', 'mole', 'pudding', 'librarian']
const hash = (x) => crypto.createHash('sha256').update(x).digest('hex').slice(0, 24)

// ---------------------------------------------------------------- a regra de HOJE (antes do R39), congelada para a foto
const CHEFE_CONQUISTA_ANTIGA = { gutbucket: 'road', niptuck: 'double', moleworth: 'mole', gobble: 'pudding' }
function contarSoldadosAntigo(eventos) {
  const soldados = new Set(), vivos = new Set()
  let quedas = 0
  for (const x of eventos ?? []) {
    if (x[1] === 'n' && x[3] === 0) { soldados.add(x[2]); vivos.add(x[2]) } else if (x[1] === 'c' && vivos.has(x[2])) { vivos.delete(x[2]); quedas++ } else if (x[1] === 'r' && soldados.has(x[2])) vivos.add(x[2])
  }
  return { quedas, vivos: vivos.size }
}
/** reino.mjs:439-476 (origin/main antes do R39), sem o banco: devolve { ganhou, vitorias }. */
function regraAntiga({ antes, depois, eventos, cmds, rodadas, tem }) {
  const ganhou = []
  const marcar = (id) => { if (!tem.has(id)) { tem.add(id); ganhou.push(id) } }
  let vitorias = 0
  for (const ev of eventos) {
    if (ev.tipo !== 'batalha' || !ev.vitoria) continue
    vitorias++
    marcar('supper')
    if (ev.horda?.chefe && CHEFE_CONQUISTA_ANTIGA[ev.horda.chefe]) marcar(CHEFE_CONQUISTA_ANTIGA[ev.horda.chefe])
    const { quedas, vivos } = contarSoldadosAntigo(ev.eventos)
    if (quedas === 0) marcar('plate')
    if (vivos === 1) marcar('last')
    if (antes.rodada === 10 && !cmds.some((x) => x.tipo === 'sortear')) marcar('penny')
  }
  const t = depois.terrenos
  if (t.every(Boolean)) {
    marcar('house')
    if (new Set(t.map((x) => CARTAS[x.carta].familia)).size === 1) marcar('family')
  }
  if (t.some((x) => x && x.nivel >= PARTIDA.nivelMax)) marcar('brass')
  if (vitorias && cartasPorRodadas(rodadas + vitorias) >= ALBUM.ordem.length) marcar('librarian')
  return { ganhou, vitorias }
}

// ---------------------------------------------------------------- as partidas de robô
/** Semente i: robô (aleatório, ganancioso ou planejador), álbum (inicial ou completo) e rodadas já somadas da conta. */
function plano(i) {
  const robo = i % 10 < 6 ? 'aleatorio' : i % 10 < 8 ? 'ganancioso' : 'planejador'
  return { robo, album: i % 2 ? 'completo' : 'inicial', rodadasAntes: i % 7 === 0 ? 390 : 0 }
}

/**
 * Joga a partida da semente i com eventos; a cada passo chama `porPasso({ antes, depois, eventos, comandos })`.
 * Devolve a foto (o que não pode mudar) e o estado final.
 */
function jogar(i, porPasso = () => {}) {
  const { robo, album } = plano(i)
  const rng = criarRng(`r39:robo:${i}`)
  let e = criarPartida({ semente: `r39:${i}`, cartasLiberadas: album === 'completo' ? Object.keys(CARTAS) : ALBUM.inicial })
  const comandos = []
  const h = crypto.createHash('sha256')
  for (let g = 0; g < PARTIDA.tetoComandos && e.fase !== 'fim'; g++) {
    const c = escolher(robo, e, (n) => rng.inteiro(n))
    const r = aplicar(e, c, { eventos: true })
    assert.equal(r.ok, true, JSON.stringify(c))
    comandos.push(c)
    h.update(JSON.stringify(r.eventos)).update('\n')
    porPasso({ antes: e, depois: r.estado, eventos: r.eventos, comandos: comandos.slice() })
    e = r.estado
  }
  const foto = {
    motivo: e.fim?.motivo ?? null, pontos: e.fim?.pontos ?? null, vencidas: e.vencidas, rodada: e.rodada, comandos: comandos.length,
    eventos: h.digest('hex').slice(0, 24), estado: hash(JSON.stringify(e)),
  }
  return { foto, estado: e }
}

if (process.env.GERAR_ANTES) {
  const lista = []
  for (let i = 0; i < N; i++) {
    const tem = new Set()
    let rodadas = plano(i).rodadasAntes
    const { foto } = jogar(i, ({ antes, depois, eventos, comandos }) => {
      const r = regraAntiga({ antes, depois, eventos, cmds: comandos, rodadas, tem })
      rodadas += r.vitorias
    })
    lista.push({ ...foto, antigas: ANTIGAS.filter((id) => tem.has(id)) })
  }
  fs.writeFileSync(ANTES, '[\n' + lista.map((x) => JSON.stringify(x)).join(',\n') + '\n]\n')
}

describe('R39 — a foto de antes existe', () => {
  test('200 sementes gravadas', () => {
    const antes = JSON.parse(fs.readFileSync(ANTES, 'utf8'))
    assert.equal(antes.length, N)
  })
})
