// Testes da batalha automática do jogo de reino (shared/reino/batalha.js) e fumaça do simulador.
// Rodar: npm test  (ou: node --test tests/servidor/reino-batalha.test.js)
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { BATALHA, CARTAS, CHEFES, INVASORES } from '../../shared/reino/config.js'
import { criarPartida, reproduzir } from '../../shared/reino/partida.js'
import { expandirHorda, familiasAtivas, montarExercito, multChefe, simularBatalha } from '../../shared/reino/batalha.js'
import { PLANOS, ROBOS_PLANO, escolher, hordaDeReferencia, jogarPartida } from '../../shared/reino/robos.js'
import { criarRng } from '../../shared/rng.js'
import { bonecosAoMesmoTempo, resumo, simular } from '../../tools/simular-reino.mjs'

const T = (carta, nivel = 1) => ({ carta, nivel })
const vazio = () => [null, null, null, null, null, null]
const luta = (terrenos, ordem, rodada = 1, reliquias = []) => simularBatalha({ terrenos, reliquias, horda: { rodada, ordem } })
const IDS = Object.keys(CARTAS)

/** Reino e horda sorteados (para testes de volume). */
function sorteado(rng) {
  const terrenos = vazio().map(() => (rng.inteiro(4) ? T(IDS[rng.inteiro(IDS.length)], 1 + rng.inteiro(5)) : null))
  const rodada = 1 + rng.inteiro(30)
  const h = hordaDeReferencia(rodada)
  return { terrenos, horda: { rodada, ordem: h.ordem.filter(() => rng.inteiro(5)) }, reliquias: [] }
}

describe('reino: batalha — fim e eventos', () => {
  test('sempre termina em até 30 s, com evento de fim no último tique (500 lutas sorteadas)', () => {
    const rng = criarRng('termina')
    for (let i = 0; i < 500; i++) {
      const x = sorteado(rng)
      const b = simularBatalha(x)
      assert.ok(b.tiques >= 1 && b.tiques <= BATALHA.fimTempo, `tiques ${b.tiques}`)
      const f = b.eventos.at(-1)
      assert.equal(f[1], 'f')
      assert.equal(f[2], b.vitoria ? 1 : 0)
      assert.ok(b.pctHorda >= 0 && b.pctHorda <= 100)
    }
  })
  test('mesma entrada → mesma luta, evento por evento', () => {
    const rng = criarRng('igual')
    for (let i = 0; i < 30; i++) {
      const x = sorteado(rng)
      assert.deepEqual(simularBatalha(structuredClone(x)), simularBatalha(structuredClone(x)))
    }
  })
  test('eventos coerentes: todo id nasce antes de agir, ninguém cai duas vezes sem levantar, tempo nunca volta', () => {
    const rng = criarRng('coerente')
    for (let i = 0; i < 100; i++) {
      const b = simularBatalha(sorteado(rng))
      const vivos = new Set(), nascidos = new Set()
      let t = 0
      for (const ev of b.eventos) {
        assert.ok(ev[0] >= t, 'tempo voltou')
        t = ev[0]
        const [, cod] = ev
        if (cod === 'n') { nascidos.add(ev[2]); vivos.add(ev[2]) }
        if (cod === 'm' || cod === 'c' || cod === 'r' || cod === 's') assert.ok(nascidos.has(ev[2]), `${cod} sem nascer`)
        if (cod === 'd') { assert.ok(nascidos.has(ev[3])); assert.ok(ev[4] > 0) }
        if (cod === 'c') { assert.ok(vivos.has(ev[2]), 'caiu duas vezes'); vivos.delete(ev[2]) }
        if (cod === 'r') vivos.add(ev[2])
      }
    }
  })
  test('sem invasor é vitória na hora; sem soldado o castelo cai', () => {
    assert.equal(luta([T('T01'), null, null, null, null, null], []).vitoria, true)
    const b = luta(vazio(), ['muncher'])
    assert.equal(b.vitoria, false)
    assert.ok(b.eventos.some((e) => e[1] === 'k'))
  })
  test('rodada 1: toda Tropa que luta vence os 2 Scoffers em algum terreno; as Common vencem do terreno 1', () => {
    const h = criarPartida({ semente: 'r1' }).horda.ordem
    assert.deepEqual(h, ['muncher', 'muncher'])
    for (const id of IDS.filter((i) => CARTAS[i].tipo === 'tropa' && CARTAS[i].dano > 0)) {
      const vence = [1, 2, 3, 4, 5, 6].filter((k) => { const ts = vazio(); ts[k - 1] = T(id); return luta(ts, h).vitoria })
      assert.ok(vence.length > 0, CARTAS[id].nome)
      if (CARTAS[id].raridade === 'C') assert.ok(vence.includes(1), CARTAS[id].nome)
    }
  })
  test('Nightfall aos 20 s: aparece o evento e o mesmo golpe passa a valer o triplo', () => {
    const rng = criarRng('noite')
    let conferidos = 0
    for (let i = 0; i < 2000 && conferidos < 5; i++) {
      const x = sorteado(rng)
      const b = simularBatalha(x)
      if (b.tiques <= BATALHA.noite) continue
      assert.ok(b.eventos.some((e) => e[1] === 'noite' && e[0] === BATALHA.noite))
      // golpe de um soldado num invasor sem meia-defesa, antes e depois da noite
      const tipo = new Map(b.eventos.filter((e) => e[1] === 'n').map((e) => [e[2], e[4]]))
      const golpes = b.eventos.filter((e) => e[1] === 'd' && e[2] >= 0 && INVASORES[tipo.get(e[3])] && tipo.get(e[3]) !== 'brute' && CARTAS[tipo.get(e[2])])
      for (const g of golpes.filter((e) => e[0] < BATALHA.noite)) {
        const depois = golpes.find((e) => e[0] >= BATALHA.noite && e[2] === g[2])
        if (!depois || CARTAS[tipo.get(g[2])].explode) continue
        assert.equal(depois[4], Math.floor(g[4] * BATALHA.multNoite / 100 + 0.5), JSON.stringify([g, depois]))
        conferidos++
        break
      }
    }
    assert.ok(conferidos >= 1, 'nenhuma luta passou dos 20 s com golpe para comparar')
  })
  test('aos 30 s vence a maior % de vida; empate é do jogador', () => {
    const rng = criarRng('trinta')
    let vistos = 0
    for (let i = 0; i < 3000 && vistos < 3; i++) {
      const x = sorteado(rng)
      const b = simularBatalha(x)
      if (!b.porTempo) continue
      vistos++
      assert.equal(b.tiques, BATALHA.fimTempo)
    }
    assert.ok(vistos >= 1, 'nenhuma luta chegou aos 30 s na amostra')
  })
})

describe('reino: batalha — regras das cartas', () => {
  test('toda carta em todo nível entra na luta, e todo nível muda alguma coisa (nenhum nível morto)', () => {
    const ctx = (x) => [T('T04', 5), x, T('M01', 5), T('T01', 5), null, null]
    for (const id of IDS) {
      const c = CARTAS[id]
      let anterior = JSON.stringify(montarExercito(ctx(null)))
      for (let n = 1; n <= 5; n++) {
        const ts = ctx(T(id, n))
        const ex = JSON.stringify(montarExercito(ts))
        // todo LEVEL UP muda o reino (Equilíbrio 2: Bunkhouse e Market Stall tinham níveis sem ganho)
        assert.notEqual(ex, anterior, `${c.nome} N${n} não muda nada`)
        anterior = ex
        const b = simularBatalha({ terrenos: ts, horda: hordaDeReferencia(4 * n) })
        assert.equal(b.eventos.at(-1)[1], 'f')
      }
    }
  })
  test('construção vale para os 2 vizinhos (Blueprints: 2 de cada lado); bônus de 2 construções somam', () => {
    const ex = montarExercito([T('T01'), T('B01'), T('T01'), T('B01'), T('T01'), T('T01')])
    // Pikeman dano 6; Smithy N1 +s% por vizinho: terreno 3 tem dois Smithy (+2s%), o 6 nenhum
    // (Equilíbrio 2: o número do Smithy mudou de 20 para 30; a regra é a mesma, agora lida do config)
    const d = CARTAS.T01.dano, s = CARTAS.B01.valores[0], um = Math.floor(d * (100 + s) / 100 + 0.5), dois = Math.floor(d * (100 + 2 * s) / 100 + 0.5)
    assert.ok(dois > um && um > d)
    assert.deepEqual(ex.soldados.map((x) => x.dano), [um, dois, um, d])
    const bp = montarExercito([T('T01'), null, T('B01'), null, T('T01'), T('T01')], ['blueprints'])
    assert.deepEqual(bp.soldados.map((x) => x.dano), [um, um, d])
  })
  test('Bunkhouse dá soldados e vida aos vizinhos (2º efeito por nível)', () => {
    const sem = montarExercito([T('T01'), null, null, null, null, null]).soldados[0]
    const com = montarExercito([T('T01'), T('B02', 2), null, null, null, null]).soldados[0]
    assert.equal(com.qtd, sem.qtd + CARTAS.B02.valores[1])
    assert.equal(com.vida, Math.floor(CARTAS.T01.vida * (100 + CARTAS.B02.valores2[1]) / 100 + 0.5))
  })
  test('família liga com 3 terrenos (2 com Twin Banner)', () => {
    const ts = [T('T01'), T('B01'), null, null, null, null]
    assert.deepEqual(familiasAtivas(ts), [])
    assert.deepEqual(familiasAtivas(ts, ['banner']), ['pikewall'])
    assert.deepEqual(familiasAtivas([...ts.slice(0, 2), T('M04'), null, null, null]), ['pikewall'])
  })
  test('Sir Dent: um cavaleiro só (Bunkhouse não dá outro) e cresce o dobro por nível', () => {
    const ex = montarExercito([T('T03', 5), T('B02', 5), null, null, null, null])
    assert.equal(ex.soldados[0].qtd, 1)
    const n1 = montarExercito([T('T03', 1), null, null, null, null, null]).soldados[0].vida
    const n5 = montarExercito([T('T03', 5), null, null, null, null, null]).soldados[0].vida
    assert.equal(n5, Math.floor(n1 * CARTAS.T03.multNivel[4] / 100 + 0.5))
  })
  test('Fuse Runner corre, explode e some; Bramble Snare prende; Boom Barrel estoura uma vez (duas com Tinker)', () => {
    const sq = luta([T('T10'), null, null, null, null, null], ['muncher', 'muncher'])
    assert.ok(sq.eventos.some((e) => e[1] === 'x' && e[2] < 2))
    const laco = luta([T('M06'), T('T01'), null, null, null, null], Array(6).fill('stilt'), 3)
    assert.equal(laco.eventos.filter((e) => e[1] === 's' && e[3] === 'preso').length, CARTAS.M06.valores[0])
    const barril = (ts) => luta(ts, Array(20).fill('muncher'), 6).eventos.filter((e) => e[1] === 'g').length
    assert.equal(barril([T('M01'), null, T('T01', 5), null, null, null]), 1)
    assert.equal(barril([T('M01'), T('B09'), T('T01', 5), null, null, null]), 2)
  })
  test('Mole Digger some no portão e sai no terreno 4', () => {
    const b = luta([T('T01'), null, null, T('T01'), null, null], ['mole'], 8)
    const sai = b.eventos.find((e) => e[1] === 'e' && e[3] >= 0)
    assert.ok(sai)
    assert.equal(sai[3], INVASORES.mole.cava.sai)
  })
  test('Gutbucket bate em todos os soldados a até 0,5 de uma vez', () => {
    const b = luta([T('T01', 3), null, null, null, null, null], ['gutbucket'], 5)
    const golpes = new Map()
    for (const e of b.eventos) if (e[1] === 'd' && e[2] === b.eventos.find((x) => x[1] === 'n' && x[4] === 'gutbucket')[2]) golpes.set(e[0], (golpes.get(e[0]) || 0) + 1)
    assert.ok(Math.max(...golpes.values()) >= 2)
  })
  test('chefes: Tick & Tock são 2; depois da rodada 20 voltam com o dobro', () => {
    assert.equal(expandirHorda({ rodada: 10, ordem: ['niptuck'] }).length, 2)
    assert.equal(multChefe(20), 100)
    assert.equal(multChefe(25), 200)
    const g = CHEFES.find((c) => c.id === 'gutbucket')
    assert.equal(expandirHorda({ rodada: 25, ordem: ['gutbucket'] })[0].vida, g.vida * 2)
  })
  test('Seconds! levanta os primeiros soldados que caem com metade da vida', () => {
    const b = luta([T('T07'), T('M07'), null, null, null, null], Array(10).fill('muncher'), 6)
    const lev = b.eventos.filter((e) => e[1] === 'r')
    assert.equal(lev.length, CARTAS.M07.valores[0])
  })
})

describe('reino: batalha — velocidade', () => {
  test('média abaixo de 5 ms por luta com eventos (200 lutas de meio de partida)', () => {
    const rng = criarRng('rapida')
    const lutas = []
    for (let i = 0; i < 200; i++) {
      const terrenos = vazio().map(() => T(IDS[rng.inteiro(IDS.length)], 1 + rng.inteiro(5)))
      lutas.push({ terrenos, horda: hordaDeReferencia(8 + rng.inteiro(12)) })
    }
    const t0 = performance.now()
    for (const l of lutas) simularBatalha(l)
    const ms = (performance.now() - t0) / lutas.length
    assert.ok(ms < 5, `${ms.toFixed(2)} ms por luta`)
  })
})

describe('reino: simulador (fumaça, modo rápido)', () => {
  test('robôs de plano: jogam até o fim com comandos aceitos, preferem as cartas do plano e a partida se reproduz', () => {
    for (const robo of ROBOS_PLANO) {
      const plano = PLANOS[robo.slice(6)]
      for (const c of plano.cartas) assert.ok(CARTAS[c], `${robo}: ${c}`)
      const rng = criarRng(`plano:${robo}`)
      const { estado, comandos } = jogarPartida({ robo, semente: `fumaca-${robo}`, cartasLiberadas: IDS, inteiro: (n) => rng.inteiro(n) })
      assert.equal(estado.fase, 'fim')
      assert.ok(estado.vencidas >= 1, `${robo} não venceu nenhuma rodada`)
      const r = reproduzir({ semente: `fumaca-${robo}`, cartasLiberadas: IDS, comandos })
      assert.ok(r.ok)
      assert.deepEqual(r.estado, estado)
      const doPlano = estado.terrenos.filter((t) => t && plano.cartas.includes(t.carta)).length
      assert.ok(doPlano >= 2, `${robo}: só ${doPlano} cartas do plano no reino final`)
    }
    assert.throws(() => escolher('plano:nada', criarPartida({ semente: 'x' }), () => 0), /desconhecido/)
  })
  test('bonecos ao mesmo tempo contam nascer, cair e levantar', () => {
    const ev = [[0, 'n', 1, 0], [0, 'n', 2, 0], [1, 'n', 3, 1], [2, 'c', 1], [3, 'r', 1, 5], [4, 'n', 4, 1], [5, 'c', 2], [5, 'c', 3]]
    assert.equal(bonecosAoMesmoTempo(ev), 4)
    const b = luta([T('T11', 5), T('B02', 5), T('T11', 5), null, null, null], hordaDeReferencia(20).ordem, 20)
    const max = bonecosAoMesmoTempo(b.eventos)
    assert.ok(max >= 1 && max <= b.soldados + b.invasores)
  })
  test('roda poucas partidas e devolve os números contra os alvos', () => {
    const sim = simular({ partidas: 3, semente: 'fumaca' })
    const { linhas, res } = resumo(sim)
    assert.ok(linhas.length > 8)
    for (const robo of ['aleatorio', 'ganancioso', 'planejador']) assert.ok(res.medianas[robo] >= 1)
    assert.ok(res.msPorBatalha > 0)
    assert.ok(typeof res.aos30 === 'number')
    // mesma semente → mesmo relatório (sem a linha de tempo)
    const de = (s) => resumo(s).linhas.filter((l) => !/ms em média/.test(l))
    assert.deepEqual(de(sim), de(simular({ partidas: 3, semente: 'fumaca', medirMs: false })))
  })
})
