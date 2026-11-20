// R39 (motor) — vitória na rodada 20 e conquistas em degraus (docs/reino/r39-desenho.md).
// Rodar: node --test tests/servidor/reino-r39-motor.test.js
// O arquivo reino-r39-antes.json foi gerado com o motor do origin/main (9b5be2f "Junta R37" + docs, ANTES do R39) por:
//   GERAR_ANTES=1 node --test tests/servidor/reino-r39-motor.test.js   (com este arquivo como estava no commit 170ad03)
// Ele guarda, por semente: pontos, vencidas, rodada, motivo, quantos comandos, o hash de TODOS os eventos e do estado final
// (nada guardado na partida pode mudar) e o conjunto das 12 conquistas antigas que a regra de hoje (cópia fiel de
// server/reino/reino.mjs:439-476 do origin/main, abaixo em `regraAntiga`) dá a uma conta que joga só aquela partida.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALBUM, CARTAS, CONQUISTAS, PARTIDA } from '../../shared/reino/config.js'
import { aplicar, criarPartida, reproduzir, resistiu, resultado, visao } from '../../shared/reino/partida.js'
import { GRUPOS, LISTA, conquistasDoPasso } from '../../shared/reino/conquistas.js'
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

// ---------------------------------------------------------------- 1. o motor não mudou nada do que joga
const fotoAntes = () => JSON.parse(fs.readFileSync(ANTES, 'utf8'))

describe('R39 — partidas de robô iguais à foto de antes', () => {
  test('200 sementes: pontos, vencidas, rodada, eventos e estado final idênticos; as 12 antigas iguais à regra de hoje', () => {
    const antes = fotoAntes()
    assert.equal(antes.length, N)
    for (let i = 0; i < N; i++) {
      const tem = new Set()
      let rodadas = plano(i).rodadasAntes
      const { foto, estado } = jogar(i, ({ antes: a, depois, eventos, comandos }) => {
        const novas = conquistasDoPasso({ antes: a, depois, eventos, comandos, rodadasAntes: rodadas, tem })
        for (const id of novas) { assert.ok(!tem.has(id), `semente ${i}: ${id} repetida`); tem.add(id) }
        rodadas += eventos.filter((x) => x.tipo === 'batalha' && x.vitoria).length
      })
      const { antigas, ...semConquistas } = antes[i]
      assert.deepEqual(foto, semConquistas, `semente ${i}`)
      assert.deepEqual(ANTIGAS.filter((id) => tem.has(id)), antigas, `semente ${i}: conquistas antigas`)
      // venceu sai do número de vencidas
      const v = estado.vencidas >= 20
      assert.equal(resultado(estado).venceu, v, `semente ${i}`)
      assert.equal(visao(estado).venceu, v)
      assert.equal(visao(estado).fim.venceu, v)
    }
  })
})

// ---------------------------------------------------------------- 2. vitória na rodada 20
describe('R39 — vitória: aguentar a rodada 20', () => {
  test('config: PARTIDA.rodadaDaVitoria = 20; resistiu(vencidas)', () => {
    assert.equal(PARTIDA.rodadaDaVitoria, 20)
    assert.equal(resistiu(0), false)
    assert.equal(resistiu(19), false)
    assert.equal(resistiu(20), true)
    assert.equal(resistiu(21), true)
    for (const x of [null, undefined, '20', 20.5, NaN, Infinity]) assert.equal(resistiu(x), false, String(x))
  })

  test('venceu false com 19 e true logo depois de vencer a 20 (visão e resultado); a partida segue', () => {
    const antes = fotoAntes()
    const i = antes.findIndex((x) => x.vencidas >= 21)
    assert.ok(i >= 0, 'alguma semente passa da 20')
    let viu19 = false, virou = false
    jogar(i, ({ antes: a, depois, eventos }) => {
      if (a.vencidas === 19) { viu19 = true; assert.equal(visao(a).venceu, false); assert.equal(resultado(a).venceu, false) }
      if (a.vencidas === 19 && depois.vencidas === 20) {
        virou = true
        assert.ok(eventos.some((x) => x.tipo === 'batalha' && x.vitoria))
        assert.equal(visao(depois).venceu, true)
        assert.equal(resultado(depois).venceu, true)
        assert.equal(visao(depois).fim, null) // a partida segue: não acaba na 20
      }
    })
    assert.ok(viu19 && virou)
  })

  test('nada guardado muda: o evento fim e o estado.fim não ganham campo; reproduzir dá venceu', () => {
    let e = criarPartida({ semente: 'r39:fim' })
    const r = aplicar(e, { tipo: 'desistir' })
    assert.deepEqual(Object.keys(r.estado.fim).sort(), ['motivo', 'pontos', 'rodada', 'vencidas'])
    assert.deepEqual(Object.keys(r.eventos[0]).sort(), ['motivo', 'pontos', 'rodada', 'tipo', 'vencidas'])
    assert.equal(visao(r.estado).fim.venceu, false)
    assert.equal(resultado(r.estado).venceu, false)
    const rep = reproduzir({ semente: 'r39:fim', comandos: [{ tipo: 'desistir' }] })
    assert.equal(rep.resultado.venceu, false)
    // estado com 21 vencidas (forjado só aqui, para a conta): venceu = true
    e = { ...structuredClone(r.estado), vencidas: 21, fim: { ...r.estado.fim, vencidas: 21 } }
    assert.equal(visao(e).venceu, true)
    assert.equal(visao(e).fim.venceu, true)
    assert.equal(resultado(e).venceu, true)
  })
})

// ---------------------------------------------------------------- 3. a lista das 30
describe('R39 — LISTA das conquistas', () => {
  test('30 ids únicos em 4 grupos; as 12 antigas com os mesmos ids; degraus com a meta do config', () => {
    assert.deepEqual(GRUPOS, ['chefes', 'lutas', 'reino', 'marcos'])
    assert.equal(LISTA.length, 30)
    assert.equal(new Set(LISTA.map((c) => c.id)).size, 30)
    for (const c of LISTA) {
      assert.ok(GRUPOS.includes(c.grupo), c.id)
      assert.equal(typeof c.nome, 'string')
      assert.ok(c.nome.length > 0)
    }
    for (const id of ANTIGAS) assert.ok(LISTA.some((c) => c.id === id), id)
    for (const [id, meta] of Object.entries(CONQUISTAS.rodadasSomadas)) assert.equal(LISTA.find((c) => c.id === id).meta, meta, id)
    assert.deepEqual(Object.values(CONQUISTAS.rodadasSomadas), [25, 50, 100, 200, 400])
    assert.equal(LISTA.find((c) => c.id === 'librarian').meta, 398)
    // ES module puro: roda no navegador (sem node:)
    const fonte = fs.readFileSync(path.join(AQUI, '../../shared/reino/conquistas.js'), 'utf8')
    assert.ok(!/from ['"]node:/.test(fonte))
  })
})

// ---------------------------------------------------------------- 4. um caso por conquista nova
const base = () => criarPartida({ semente: 'r39:caso', cartasLiberadas: Object.keys(CARTAS) })
const luta = (vitoria, chefe = null, eventos = []) => ({ tipo: 'batalha', vitoria, horda: { chefe }, eventos })
/** Conquistas novas de um passo montado à mão (antes e depois são estados do motor, mexidos só no teste). */
function passo({ antes = base(), depois, eventos = [], comandos = [], rodadasAntes = 0, tem = [] } = {}) {
  return conquistasDoPasso({ antes, depois: depois ?? antes, eventos, comandos, rodadasAntes, tem: new Set(tem) })
}
const com = (e, mudar) => { const x = structuredClone(e); mudar(x); return x }
const terreno = (carta, nivel = 1) => ({ carta, nivel })

describe('R39 — cada conquista nova (definição exata no teste)', () => {
  for (const [id, meta] of Object.entries({ tally25: 25, tally50: 50, tally100: 100, tally200: 200, tally400: 400 })) {
    test(`${id}: rodadas vencidas somadas (conta) chegam a ${meta} neste passo`, () => {
      assert.ok(passo({ eventos: [luta(true)], rodadasAntes: meta - 1 }).includes(id))
      assert.ok(!passo({ eventos: [luta(true)], rodadasAntes: meta - 2 }).includes(id))
      assert.ok(!passo({ eventos: [luta(false)], rodadasAntes: meta - 1 }).includes(id))
      assert.ok(!passo({ eventos: [luta(true)], rodadasAntes: meta - 1, tem: [id] }).includes(id), 'já tinha: não repete')
    })
  }

  const familia = { shields: ['pikewall', 'T01', 'T02', 'B01'], bows: ['thornbow', 'T04', 'T06', 'B04'], dish: ['potluck', 'T07', 'T08', 'B06'], sparks: ['fizzwick', 'T10', 'T11', 'M01'] }
  for (const [id, [fam, a, b, c]] of Object.entries(familia)) {
    test(`${id}: bônus da família ${fam} ligado no reino depois do passo`, () => {
      const dois = com(base(), (x) => { x.terrenos[0] = terreno(a); x.terrenos[1] = terreno(b) })
      assert.ok(!passo({ depois: dois }).includes(id), '2 terrenos sem relíquia: não liga')
      const tres = com(dois, (x) => { x.terrenos[2] = terreno(c) })
      assert.ok(passo({ depois: tres }).includes(id))
      const banner = com(dois, (x) => { x.reliquias.push('banner') })
      assert.ok(passo({ depois: banner }).includes(id), 'Twin Banner: 2 bastam')
    })
  }

  test('mason: uma construção no nível 5', () => {
    assert.ok(passo({ depois: com(base(), (x) => { x.terrenos[0] = terreno('B01', 5) }) }).includes('mason'))
    assert.ok(!passo({ depois: com(base(), (x) => { x.terrenos[0] = terreno('B01', 4); x.terrenos[1] = terreno('T01', 5); x.terrenos[2] = terreno('M01', 5) }) }).includes('mason'))
  })

  test('spicy: uma magia no nível 5', () => {
    assert.ok(passo({ depois: com(base(), (x) => { x.terrenos[0] = terreno('M01', 5) }) }).includes('spicy'))
    assert.ok(!passo({ depois: com(base(), (x) => { x.terrenos[0] = terreno('M01', 4); x.terrenos[1] = terreno('B01', 5) }) }).includes('spicy'))
  })

  test('encore: vencer a batalha da rodada 25', () => {
    assert.ok(passo({ antes: com(base(), (x) => { x.rodada = 25; x.vencidas = 24 }), eventos: [luta(true)] }).includes('encore'))
    assert.ok(!passo({ antes: com(base(), (x) => { x.rodada = 24; x.vencidas = 23 }), eventos: [luta(true)] }).includes('encore'))
    assert.ok(!passo({ antes: com(base(), (x) => { x.rodada = 25; x.vencidas = 24 }), eventos: [luta(false)] }).includes('encore'))
  })

  test('thread: vencer uma batalha com 1 coração (vida do castelo na hora da luta)', () => {
    assert.ok(passo({ antes: com(base(), (x) => { x.vidas = 1 }), eventos: [luta(true)] }).includes('thread'))
    assert.ok(!passo({ antes: com(base(), (x) => { x.vidas = 2 }), eventos: [luta(true)] }).includes('thread'))
    assert.ok(!passo({ antes: com(base(), (x) => { x.vidas = 1 }), eventos: [luta(false)] }).includes('thread'))
  })

  test('seconds: vencer a batalha logo depois de perder a mesma rodada (a luta anterior da partida foi derrota)', () => {
    const perdeu = com(base(), (x) => { x.ultima = { rodada: 1, vitoria: false, pctHorda: 40, segundos: 10, porTempo: false, chefe: null } })
    assert.ok(passo({ antes: perdeu, eventos: [luta(true)] }).includes('seconds'))
    const ganhou = com(base(), (x) => { x.rodada = 2; x.vencidas = 1; x.ultima = { rodada: 1, vitoria: true, pctHorda: 100, segundos: 10, porTempo: false, chefe: null } })
    assert.ok(!passo({ antes: ganhou, eventos: [luta(true)] }).includes('seconds'))
    assert.ok(!passo({ antes: base(), eventos: [luta(true)] }).includes('seconds'), '1ª luta da partida')
    assert.ok(!passo({ antes: perdeu, eventos: [luta(false)] }).includes('seconds'))
  })

  test('nopatch: vencer Tick & Tock (chefe da rodada 10) sem nenhum conserto na partida', () => {
    assert.ok(passo({ eventos: [luta(true, 'niptuck')] }).includes('nopatch'))
    assert.ok(!passo({ antes: com(base(), (x) => { x.consertos = 1 }), eventos: [luta(true, 'niptuck')] }).includes('nopatch'))
    assert.ok(!passo({ eventos: [luta(true, 'gutbucket')] }).includes('nopatch'))
    assert.ok(!passo({ eventos: [luta(false, 'niptuck')] }).includes('nopatch'))
  })

  test('scratch: vencer Madame Moleworth (chefe da rodada 15) com o castelo inteiro (vidas = vidas máximas)', () => {
    assert.ok(passo({ eventos: [luta(true, 'moleworth')] }).includes('scratch'))
    assert.ok(!passo({ antes: com(base(), (x) => { x.vidas = x.vidasMax - 1 }), eventos: [luta(true, 'moleworth')] }).includes('scratch'))
    assert.ok(passo({ antes: com(base(), (x) => { x.vidas = 4; x.vidasMax = 4 }), eventos: [luta(true, 'moleworth')] }).includes('scratch'), 'com Spare Crown')
    assert.ok(!passo({ eventos: [luta(true, 'niptuck')] }).includes('scratch'))
  })

  test('pockets: 3 relíquias na partida', () => {
    assert.ok(passo({ depois: com(base(), (x) => { x.reliquias = ['bell', 'fuse', 'ledger'] }) }).includes('pockets'))
    assert.ok(!passo({ depois: com(base(), (x) => { x.reliquias = ['bell', 'fuse'] }) }).includes('pockets'))
  })

  test('grand: carta de raridade L num terreno do reino', () => {
    const lend = Object.keys(CARTAS).filter((id) => CARTAS[id].raridade === 'L')
    assert.ok(lend.length > 0)
    assert.ok(passo({ depois: com(base(), (x) => { x.terrenos[3] = terreno(lend[0]) }) }).includes('grand'))
    assert.ok(!passo({ depois: com(base(), (x) => { x.terrenos[3] = terreno('T12') }) }).includes('grand'))
  })

  test('passo vazio não dá conquista; tem pode ser lista; o que já tem não volta', () => {
    assert.deepEqual(passo({}), [])
    assert.deepEqual(conquistasDoPasso({ antes: base(), depois: base(), eventos: [luta(true)], comandos: [], rodadasAntes: 0, tem: ['supper', 'plate'] }), [])
  })
})

