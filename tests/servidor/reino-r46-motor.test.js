// R46 (motor) — a REVANCHE: depois de uma derrota que não acaba a partida volta a MESMA horda, com UMA troca grátis de 2
// terrenos e a dica (docs/reino/r46-desenho.md). Rodar: node --test tests/servidor/reino-r46-motor.test.js
//
// O arquivo reino-r46-antes.json foi gerado com o motor ANTES do R46 (commit próprio, antes de mexer em partida.js) por:
//   GERAR_ANTES=1 node --test tests/servidor/reino-r46-motor.test.js
// Por semente: os comandos que os robôs mandaram, todos os eventos (os da luta por dentro só pelo hash), o resultado e o
// estado final inteiros. Partidas de regra 1 (sem `regra`, a de hoje) precisam sair iguais, byte a byte.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALBUM, CARTAS, PARTIDA } from '../../shared/reino/config.js'
import * as motor from '../../shared/reino/partida.js'
import { escolher } from '../../shared/reino/robos.js'
import { simularBatalha } from '../../shared/reino/batalha.js'
import { conquistasDoPasso } from '../../shared/reino/conquistas.js'
import { criarRng } from '../../shared/rng.js'

const { aplicar, criarPartida, reproduzir, resultado } = motor
const AQUI = path.dirname(fileURLToPath(import.meta.url))
const ANTES = path.join(AQUI, 'reino-r46-antes.json')
const N_FOTO = 24
const hash = (x) => crypto.createHash('sha256').update(x).digest('hex').slice(0, 24)

// ---------------------------------------------------------------- as partidas de robô
const ROBOS = ['aleatorio', 'ganancioso', 'planejador']
/** Semente i: robô e álbum (inicial ou completo). */
function plano(i) {
  return { robo: ROBOS[i % 3], album: Math.floor(i / 3) % 2 ? 'completo' : 'inicial', semente: `r46:${i}` }
}
const cartasDo = (album) => (album === 'completo' ? Object.keys(CARTAS) : ALBUM.inicial)

/** Os eventos de um comando, guardáveis: a luta por dentro vira hash (o resto fica inteiro). */
const eventosGuardados = (evs) => evs.map((ev) => (ev.tipo === 'batalha' ? { ...ev, eventos: hash(JSON.stringify(ev.eventos)) } : ev))

/** Joga a partida da semente i com um robô (regra opcional) e devolve comandos, eventos, estado e resultado. */
function jogar(i, { regra } = {}) {
  const { robo, album, semente } = plano(i)
  const rng = criarRng(`r46:robo:${i}`)
  let e = criarPartida({ semente, cartasLiberadas: cartasDo(album), ...(regra === undefined ? {} : { regra }) })
  const comandos = [], eventos = []
  for (let g = 0; g < PARTIDA.tetoComandos && e.fase !== 'fim'; g++) {
    const c = escolher(robo, e, (n) => rng.inteiro(n))
    const r = aplicar(e, c, { eventos: true })
    assert.equal(r.ok, true, JSON.stringify(c))
    comandos.push(c)
    eventos.push(eventosGuardados(r.eventos))
    e = r.estado
  }
  return { comandos, eventos, estado: e, resultado: resultado(e) }
}

const derrotasNoMeio = (eventos) => eventos.filter((evs) => evs.some((x) => x.tipo === 'batalha' && !x.vitoria) && !evs.some((x) => x.tipo === 'fim')).length

if (process.env.GERAR_ANTES) {
  const lista = []
  for (let i = 0; i < N_FOTO; i++) {
    const { robo, album, semente } = plano(i)
    const j = jogar(i)
    lista.push({ semente, robo, album, derrotasNoMeio: derrotasNoMeio(j.eventos), comandos: j.comandos, eventos: j.eventos, resultado: j.resultado, estado: j.estado })
  }
  fs.writeFileSync(ANTES, '[\n' + lista.map((x) => JSON.stringify(x)).join(',\n') + '\n]\n')
}

// ---------------------------------------------------------------- 1. regra 1 (sem `regra`) igual à foto, byte a byte
const fotoAntes = () => JSON.parse(fs.readFileSync(ANTES, 'utf8'))

/** Refaz os comandos guardados com `aplicar` (com eventos) e devolve o mesmo formato da foto. */
function refazer(semente, album, comandos, extra = {}) {
  let e = criarPartida({ semente, cartasLiberadas: cartasDo(album), ...extra })
  const eventos = []
  for (const c of comandos) {
    const r = aplicar(e, c, { eventos: true })
    assert.equal(r.ok, true, JSON.stringify(c))
    eventos.push(eventosGuardados(r.eventos))
    e = r.estado
  }
  return { eventos, estado: e, resultado: resultado(e) }
}

describe('R46 — regra 1 igual ao motor de antes', () => {
  test('foto: 24 sementes, com derrotas no meio; eventos, resultado e estado final idênticos (sem regra e com regra: 1)', () => {
    const antes = fotoAntes()
    assert.equal(antes.length, N_FOTO)
    assert.ok(antes.filter((x) => x.derrotasNoMeio >= 2).length >= 20, 'a foto precisa de partidas com derrotas no meio')
    for (const f of antes) {
      for (const extra of [{}, { regra: 1 }]) {
        const r = refazer(f.semente, f.album, f.comandos, extra)
        assert.equal(JSON.stringify(r.eventos), JSON.stringify(f.eventos), `${f.semente} ${JSON.stringify(extra)}: eventos`)
        assert.equal(JSON.stringify(r.estado), JSON.stringify(f.estado), `${f.semente} ${JSON.stringify(extra)}: estado`)
        assert.deepEqual(r.resultado, f.resultado)
        const rp = reproduzir({ semente: f.semente, cartasLiberadas: cartasDo(f.album), comandos: f.comandos, ...extra })
        assert.equal(rp.ok, true)
        assert.equal(JSON.stringify(rp.estado), JSON.stringify(f.estado), `${f.semente}: reproduzir`)
        assert.equal('revanche' in motor.visao(rp.estado), false, 'visao da regra 1 sem o campo revanche')
      }
    }
  })

  test('os robôs de hoje jogam igual à foto (partida sem regra)', () => {
    for (const f of fotoAntes().slice(0, 12)) {
      const i = Number(f.semente.split(':')[1])
      const j = jogar(i)
      assert.deepEqual(j.comandos, f.comandos, f.semente)
      assert.equal(JSON.stringify(j.estado), JSON.stringify(f.estado), f.semente)
    }
  })
})

// ---------------------------------------------------------------- 2. config e regra da partida
describe('R46 — config e regra', () => {
  test('config: PARTIDA.regra = 2 e PARTIDA.trocasNaRevanche = 1', () => {
    assert.equal(PARTIDA.regra, 2)
    assert.equal(PARTIDA.trocasNaRevanche, 1)
  })

  test('criarPartida grava a regra 2; regra inválida é recusada; sem regra (ou estado guardado sem o campo) vale 1', () => {
    const e2 = criarPartida({ semente: 'r46:x', regra: 2 })
    assert.equal(e2.regra, 2)
    assert.deepEqual(motor.visao(e2).revanche, { troca: false, dica: null })
    for (const regra of [0, 3, 1.5, '2', null, -1]) assert.throws(() => criarPartida({ semente: 'r46:x', regra }), /Regra/, String(regra))
    const e1 = criarPartida({ semente: 'r46:x' })
    assert.equal('regra' in e1, false)
    assert.equal(JSON.stringify(criarPartida({ semente: 'r46:x', regra: 1 })), JSON.stringify(e1))
    const r = reproduzir({ semente: 'r46:x', comandos: [], regra: 7 })
    assert.equal(r.ok, false)
    assert.equal(r.erro, 'criar')
  })
})

// ---------------------------------------------------------------- 3. regra 2: a mesma horda, a mesma mão, o mesmo espólio
/** Joga com um robô na regra 2; na revanche, `troca(e)` diz o comando de troca (ou null para não trocar). */
function jogarR2(i, { robo, album, troca = () => null, ate = () => false } = {}) {
  const p = plano(i)
  robo ??= p.robo; album ??= p.album
  const rng = criarRng(`r46:robo2:${i}`)
  let e = criarPartida({ semente: p.semente, cartasLiberadas: cartasDo(album), regra: 2 })
  const passos = []
  for (let g = 0; g < PARTIDA.tetoComandos && e.fase !== 'fim'; g++) {
    let c = e.revanche?.troca ? troca(e) : null
    c ??= escolher(robo, e, (n) => rng.inteiro(n))
    const r = aplicar(e, c, { eventos: true })
    assert.equal(r.ok, true, `${p.semente}: ${JSON.stringify(c)} ${r.erro}`)
    passos.push({ antes: e, comando: c, depois: r.estado, eventos: r.eventos })
    e = r.estado
    if (ate(passos.at(-1))) break
  }
  return { estado: e, passos, comandos: passos.map((x) => x.comando), semente: p.semente, album }
}
const perdeuESegue = (x) => x.comando.tipo === 'batalhar' && !!x.depois.ultima && !x.depois.ultima.vitoria && x.depois.fase !== 'fim'
const semRegra = (e) => { const x = structuredClone(e); delete x.regra; delete x.revanche; return x }
const trocaDaDica = (e) => (e.revanche.dica ? { tipo: 'trocar', ...e.revanche.dica } : null)

describe('R46 — regra 2: a derrota traz a MESMA horda', () => {
  test('40 sementes: mesma horda; mão, espólio e sorteio iguais aos da regra 1 no mesmo ponto', () => {
    let derrotas = 0
    for (let i = 0; i < 40; i++) {
      const { passos } = jogarR2(i)
      for (const x of passos.filter(perdeuESegue)) {
        derrotas++
        const um = aplicar(semRegra(x.antes), { tipo: 'batalhar' }, { eventos: false })
        assert.equal(um.ok, true)
        const d = x.depois
        assert.deepEqual(d.horda, x.antes.horda, 'a mesma horda volta')
        assert.deepEqual(d.oferta, um.estado.oferta, 'mesma mão')
        assert.deepEqual(d.espolios, um.estado.espolios, 'mesmo espólio')
        assert.deepEqual(d.sorteio, um.estado.sorteio, 'o sorteio andou igual')
        assert.deepEqual(d.levelUp, um.estado.levelUp)
        // tirando horda, regra e revanche, o estado é o da regra 1
        const a = semRegra(d), b = structuredClone(um.estado)
        delete a.horda; delete b.horda
        assert.deepEqual(a, b)
        assert.equal(d.revanche.troca, true)
        assert.deepEqual(d.revanche.dica, motor.dicaDaTroca(d))
        assert.deepEqual(motor.visao(d).revanche, { troca: true, dica: d.revanche.dica })
      }
    }
    assert.ok(derrotas >= 60, `derrotas no meio: ${derrotas}`)
  })
})

// ---------------------------------------------------------------- 4. o comando trocar
/** Primeira revanche (com troca) da semente i: o estado logo depois da derrota. */
function primeiraRevanche(i, extra = {}) {
  const j = jogarR2(i, { ...extra, ate: perdeuESegue })
  const x = j.passos.at(-1)
  assert.ok(perdeuESegue(x), `semente ${i} sem derrota no meio`)
  return { estado: x.depois, comandos: j.comandos, semente: j.semente, album: j.album }
}

describe('R46 — comando trocar', () => {
  test('troca na revanche: evento, terrenos trocados, troca e dica desligadas; opcoes e visao acompanham', () => {
    const { estado: e } = primeiraRevanche(1)
    const o = motor.opcoes(e)
    const trocas = o.comandos.filter((c) => c.tipo === 'trocar')
    const esperado = []
    for (let a = 1; a <= PARTIDA.terrenos; a++) for (let b = a + 1; b <= PARTIDA.terrenos; b++) if (e.terrenos[a - 1] || e.terrenos[b - 1]) esperado.push({ tipo: 'trocar', a, b })
    assert.deepEqual(trocas, esperado)
    assert.ok(trocas.length >= 5)
    const { a, b } = trocas[0]
    const r = aplicar(e, { tipo: 'trocar', a, b })
    assert.equal(r.ok, true)
    assert.deepEqual(r.eventos, [{ tipo: 'troca', a, b }])
    assert.deepEqual(r.estado.terrenos[a - 1], e.terrenos[b - 1])
    assert.deepEqual(r.estado.terrenos[b - 1], e.terrenos[a - 1])
    assert.deepEqual(r.estado.revanche, { troca: false, dica: null })
    assert.deepEqual(motor.visao(r.estado).revanche, { troca: false, dica: null })
    assert.equal(r.estado.comandos, e.comandos + 1)
    assert.equal(motor.opcoes(r.estado).comandos.some((c) => c.tipo === 'trocar'), false)
    // segunda troca recusada
    const r2 = aplicar(r.estado, { tipo: 'trocar', a, b })
    assert.equal(r2.ok, false)
    assert.equal(r2.erro, 'sem_troca')
    // o recebido não muda
    assert.equal(e.revanche.troca, true)
  })

  test('troca com terrenos ruins é recusada e não gasta a troca', () => {
    const { estado: e } = primeiraRevanche(1)
    const vazios = e.terrenos.map((t, k) => (t ? 0 : k + 1)).filter(Boolean)
    const ruins = [{}, { a: 1 }, { a: 1, b: 1 }, { a: 0, b: 2 }, { a: 1, b: 7 }, { a: 1.5, b: 2 }, { a: '1', b: '2' }, { a: 2, b: -1 }, { a: null, b: 3 }]
    if (vazios.length >= 2) ruins.push({ a: vazios[0], b: vazios[1] })
    for (const x of ruins) {
      const r = aplicar(e, { tipo: 'trocar', ...x })
      assert.equal(r.ok, false, JSON.stringify(x))
      assert.ok(typeof r.motivo === 'string' && r.motivo.length > 0)
    }
    const ocupado = e.terrenos.findIndex(Boolean) + 1
    const outro = ocupado === 1 ? 2 : 1
    assert.equal(aplicar(e, { tipo: 'trocar', a: Math.max(ocupado, outro), b: Math.min(ocupado, outro) }).ok, true, 'a ordem dos dois não importa')
  })

  test('troca fora da revanche recusada (começo da partida) e partida de regra 1 recusa trocar', () => {
    const e2 = criarPartida({ semente: 'r46:fora', regra: 2 })
    const r = aplicar(e2, { tipo: 'trocar', a: 1, b: 2 })
    assert.deepEqual([r.ok, r.erro], [false, 'sem_troca'])
    assert.equal(motor.opcoes(e2).comandos.some((c) => c.tipo === 'trocar'), false)
    // regra 1 no ponto em que a regra 2 teria revanche: recusa
    const { estado: e } = primeiraRevanche(4)
    const r1 = aplicar(semRegra(e), { tipo: 'trocar', a: 1, b: 2 })
    assert.deepEqual([r1.ok, r1.erro], [false, 'sem_troca'])
    assert.equal(motor.opcoes(semRegra(e)).comandos.some((c) => c.tipo === 'trocar'), false)
    const e1 = criarPartida({ semente: 'r46:fora' })
    assert.deepEqual([aplicar(e1, { tipo: 'trocar', a: 1, b: 2 }).erro], ['sem_troca'])
  })

  test('troca depois de batalhar recusada (vitória sem trocar); a derrota seguinte dá outra revanche', () => {
    let vitorias = 0, outra = 0
    for (let i = 0; i < 60 && (vitorias < 3 || outra < 1); i++) {
      const { passos } = jogarR2(i, { robo: 'ganancioso' })
      for (const x of passos) {
        if (x.comando.tipo !== 'batalhar' || !x.antes.revanche?.troca) continue
        assert.equal(x.depois.revanche.troca, perdeuESegue(x))
        if (x.depois.ultima.vitoria) {
          vitorias++
          assert.deepEqual(x.depois.revanche, { troca: false, dica: null })
          const r = aplicar(x.depois, { tipo: 'trocar', a: 1, b: 2 })
          assert.deepEqual([r.ok, r.erro], [false, 'sem_troca'])
        } else if (x.depois.fase !== 'fim') outra++
      }
    }
    assert.ok(vitorias >= 3, `vitórias na revanche sem trocar: ${vitorias}`)
    assert.ok(outra >= 1, `derrota seguida de derrota: ${outra}`)
  })

  test('a troca não muda a mão, o espólio nem o sorteio; pôr carta, sortear e consertar não gastam a troca', () => {
    const { estado: e } = primeiraRevanche(2)
    const ocupado = e.terrenos.findIndex(Boolean) + 1
    const outro = ocupado === 1 ? 2 : 1
    const r = aplicar(e, { tipo: 'trocar', a: ocupado, b: outro })
    assert.equal(r.ok, true)
    for (const k of ['oferta', 'espolios', 'sorteio', 'horda', 'ouro', 'vidas']) assert.deepEqual(r.estado[k], e[k], k)
    const p = aplicar(e, motor.opcoes(e).comandos.find((c) => c.tipo === 'por'))
    assert.equal(p.ok, true)
    assert.equal(p.estado.revanche.troca, true)
    assert.equal(aplicar(p.estado, { tipo: 'trocar', a: ocupado, b: outro }).ok, true)
  })
})

// ---------------------------------------------------------------- 5. a dica
/** A conta bruta: as 15 trocas (a<b) testadas, sem dois vazios; a 1ª que vence. */
function dicaBruta(e) {
  for (let a = 1; a <= PARTIDA.terrenos; a++) {
    for (let b = a + 1; b <= PARTIDA.terrenos; b++) {
      if (!e.terrenos[a - 1] && !e.terrenos[b - 1]) continue
      const t = e.terrenos.slice(); const x = t[a - 1]; t[a - 1] = t[b - 1]; t[b - 1] = x
      if (simularBatalha({ terrenos: t, reliquias: e.reliquias, horda: e.horda, eventos: false }).vitoria) return { a, b }
    }
  }
  return null
}

describe('R46 — dicaDaTroca', () => {
  test('200 sementes: a dica guardada = dicaDaTroca = a conta bruta das 15 trocas', () => {
    let com = 0, sem = 0
    for (let i = 0; i < 200; i++) {
      const robo = ['ganancioso', 'planejador', 'aleatorio'][i % 3]
      const { estado: e } = primeiraRevanche(i, { robo, album: i % 2 ? 'completo' : 'inicial' })
      const bruta = dicaBruta(e)
      assert.deepEqual(e.revanche.dica, bruta, `semente ${i}`)
      assert.deepEqual(motor.dicaDaTroca(e), bruta, `semente ${i}`)
      if (bruta) {
        com++
        const r = aplicar(aplicar(e, { tipo: 'trocar', ...bruta }).estado, { tipo: 'batalhar' })
        assert.equal(r.estado.ultima.vitoria, true, `semente ${i}: a dica vence`)
      } else sem++
    }
    assert.ok(com >= 20 && sem >= 20, `com dica ${com}, sem dica ${sem}`)
  })
})

// ---------------------------------------------------------------- 6. replay de regra 2 e conquista seconds
describe('R46 — replay da regra 2 e Back on Your Feet', () => {
  test('partidas de regra 2 com trocas: reproduzir dá o mesmo estado, duas vezes; sem a regra não reproduz igual', () => {
    let trocas = 0
    for (let i = 0; i < 12; i++) {
      const j = jogarR2(i, { troca: (e) => trocaDaDica(e) ?? (i % 2 && (e.terrenos[0] || e.terrenos[5]) ? { tipo: 'trocar', a: 1, b: 6 } : null) })
      trocas += j.comandos.filter((c) => c.tipo === 'trocar').length
      const args = { semente: j.semente, cartasLiberadas: cartasDo(j.album), comandos: j.comandos, regra: 2 }
      const r1 = reproduzir(args), r2 = reproduzir(structuredClone(args))
      assert.equal(r1.ok, true)
      assert.equal(JSON.stringify(r1.estado), JSON.stringify(j.estado), `semente ${i}`)
      assert.equal(JSON.stringify(r2.estado), JSON.stringify(r1.estado))
      assert.deepEqual(r1.resultado, resultado(j.estado))
      if (j.comandos.some((c) => c.tipo === 'trocar')) {
        const sem = reproduzir({ ...args, regra: undefined })
        assert.equal(sem.ok, false, `semente ${i}: regra 1 recusa a troca`)
        assert.equal(sem.erro, 'sem_troca')
      }
    }
    assert.ok(trocas >= 10, `trocas: ${trocas}`)
  })

  test('partida aberta no meio da revanche: reproduzir até ali dá o mesmo estado (com a dica) que o jogo', () => {
    let cortes = 0
    for (let i = 0; i < 8; i++) {
      const j = jogarR2(i)
      j.passos.forEach((x, k) => {
        if (!x.depois.revanche.troca) return
        const r = reproduzir({ semente: j.semente, cartasLiberadas: cartasDo(j.album), comandos: j.comandos.slice(0, k + 1), regra: 2 })
        assert.equal(r.ok, true)
        assert.equal(JSON.stringify(r.estado), JSON.stringify(x.depois), `semente ${i}, comando ${k}`)
        cortes++
      })
    }
    assert.ok(cortes >= 20, `cortes: ${cortes}`)
  })

  test('seconds sai depois de vencer a revanche (com a troca da dica)', () => {
    let achou = 0
    for (let i = 0; i < 30 && achou < 3; i++) {
      const j = jogarR2(i, { troca: trocaDaDica })
      let trocou = false
      for (let k = 0; k < j.passos.length; k++) {
        const x = j.passos[k]
        if (x.comando.tipo === 'trocar') trocou = true
        if (x.comando.tipo !== 'batalhar') continue
        const venceuARevanche = trocou && x.depois.ultima.vitoria
        trocou = false
        if (!venceuARevanche) continue
        assert.equal(x.antes.ultima.vitoria, false)
        assert.deepEqual(x.antes.horda, j.passos.findLast((y, n) => n < k && y.comando.tipo === 'batalhar').antes.horda, 'a horda vencida é a mesma da derrota')
        const ganhou = conquistasDoPasso({ antes: x.antes, depois: x.depois, eventos: x.eventos, comandos: j.comandos.slice(0, k + 1) })
        assert.ok(ganhou.includes('seconds'), `semente ${i}: ${ganhou}`)
        achou++
      }
    }
    assert.ok(achou >= 3, `revanches vencidas com a troca: ${achou}`)
  })
})

// ---------------------------------------------------------------- 7. custo: refazer uma partida longa
describe('R46 — custo do replay', () => {
  test('refazer uma partida longa de regra 2 leva no máximo o dobro da regra 1', () => {
    // a mais longa da foto (regra 1) e a mesma semente/robô jogada na regra 2, trocando pela dica
    const f = fotoAntes().reduce((m, x) => (x.comandos.length > m.comandos.length ? x : m))
    const i = Number(f.semente.split(':')[1])
    const j = jogarR2(i, { troca: trocaDaDica })
    const derrotas = j.passos.filter(perdeuESegue).length
    assert.ok(derrotas >= 3, `derrotas no meio na regra 2: ${derrotas}`)
    const medir = (args) => {
      const t = []
      for (let k = 0; k < 5; k++) { const t0 = process.hrtime.bigint(); assert.equal(reproduzir(args).ok, true); t.push(Number(process.hrtime.bigint() - t0) / 1e6) }
      return t.sort((a, b) => a - b)[2]
    }
    const t1 = medir({ semente: f.semente, cartasLiberadas: cartasDo(f.album), comandos: f.comandos })
    const t2 = medir({ semente: j.semente, cartasLiberadas: cartasDo(j.album), comandos: j.comandos, regra: 2 })
    // as duas partidas não têm o mesmo tamanho: a conta é por luta
    const lutas1 = f.comandos.filter((c) => c.tipo === 'batalhar').length, lutas2 = j.comandos.filter((c) => c.tipo === 'batalhar').length
    const porLuta1 = t1 / lutas1, porLuta2 = t2 / lutas2
    console.log(`R46 replay: regra 1 ${t1.toFixed(1)} ms (${lutas1} lutas, ${porLuta1.toFixed(2)} ms/luta) · regra 2 ${t2.toFixed(1)} ms (${lutas2} lutas, ${derrotas} revanches, ${porLuta2.toFixed(2)} ms/luta)`)
    assert.ok(porLuta2 <= 2 * porLuta1 + 1, `regra 2 ${porLuta2.toFixed(2)} ms/luta contra ${porLuta1.toFixed(2)} da regra 1`)
  })
})
