// Tarefa 29 — motor do idle por patrulhas: lutaAutomatica (shared/tatica.js), lugares com guarda fixa e vantagens
// (shared/lugares.js), e as contas puras do simulador da matriz (tools/simular-patrulhas.mjs). Sem tela, sem banco.
// Rodar: npm test  (ou: node --test tests/servidor/patrulhas.test.js)
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { aplicarNoLugar, montarBoneco, reproduzir } from '../../shared/batalha.js'
import { BONECOS_PRONTOS, CARTAS, ECONOMIA_DO_BETA } from '../../shared/config.js'
import { criarRng } from '../../shared/rng.js'
import { SEGURANCA, TATICAS, lutaAutomatica, ordemPadrao, ordemRuim } from '../../shared/tatica.js'
import { LUGARES, lugar, vantagens } from '../../shared/lugares.js'
import { FASES } from '../../public/js/aventura-dados.js'
import {
  FORMACOES, MONSTROS, criterioG, criteriosABC, criteriosDE, economiaDeHoje, medirMatriz, planoOtimo, pontos, sortearContas, todosOsTrios,
} from '../../tools/simular-patrulhas.mjs'

const IDS = Object.keys(BONECOS_PRONTOS)
const trio = (rng) => { const ids = IDS.slice(), t = []; for (let i = 0; i < 3; i++) t.push(ids.splice(rng.inteiro(ids.length), 1)[0]); return t }

describe('tarefa 29 — lutaAutomatica', () => {
  test('mesma entrada → mesma saída (resultado, comandos e eventos)', () => {
    const rng = criarRng('t29-det')
    for (let i = 0; i < 20; i++) {
      const lug = LUGARES[i % LUGARES.length]
      const ent = { semente: `det${i}`, timeA: trio(rng), timeB: lug.guarda, ordensA: { tatica: TATICAS[i % 3] }, ordensB: lug.ordens }
      const a = lutaAutomatica(ent), b = lutaAutomatica(structuredClone(ent))
      assert.deepEqual(a, b)
      assert.ok(a.eventos.length > 0 && a.comandos.length > 0)
    }
  })

  test('reproduzir com os comandos devolve o mesmo resultado', () => {
    const rng = criarRng('t29-replay')
    for (let i = 0; i < 60; i++) {
      const lug = LUGARES[i % LUGARES.length]
      const timeA = trio(rng)
      const r = lutaAutomatica({ semente: `rep${i}`, timeA, timeB: lug.guarda, ordensA: { tatica: TATICAS[(i + 1) % 3] }, ordensB: lug.ordens })
      const rep = reproduzir({ semente: `rep${i}`, timeA, timeB: lug.guarda, comandos: r.comandos })
      assert.equal(rep.ok, true)
      assert.deepEqual(rep.resultado, r.resultado)
      assert.equal(rep.estado.eventos.length, r.eventos.length)
    }
  })

  test('sempre termina (300 lutas, todas as táticas, ordem boa e ruim, sem registro também)', () => {
    const rng = criarRng('t29-fim')
    for (let i = 0; i < 300; i++) {
      const tA = trio(rng), tB = trio(rng)
      const ordem = (t) => t.map((id, k) => (i % 2 ? ordemRuim : ordemPadrao)(montarBoneco(id).cartas, k))
      const r = lutaAutomatica({ semente: i, timeA: tA, timeB: tB, ordensA: { tatica: TATICAS[i % 3], ordem: ordem(tA) }, ordensB: { tatica: TATICAS[(i + 2) % 3] }, registro: i % 3 !== 0 })
      assert.ok(r.resultado && ['A', 'B'].includes(r.resultado.vencedor))
    }
  })

  test('respeita Off e as regras de segurança (nunca troca sozinho, autodano nunca leva a 0, Current Step só com a Frente baixa)', () => {
    const rng = criarRng('t29-off')
    for (let i = 0; i < 120; i++) {
      const tA = trio(rng), lug = LUGARES[i % LUGARES.length]
      const parteOff = ['cabeca', 'bracos', 'pernas'][i % 3]
      const ordem = tA.map((id, k) => ordemPadrao(montarBoneco(id).cartas, k).filter((c) => CARTAS[c].parte !== parteOff))
      const r = lutaAutomatica({ semente: `off${i}`, timeA: tA, timeB: lug.guarda, ordensA: { tatica: TATICAS[i % 3], ordem }, ordensB: lug.ordens })
      // refaz passo a passo para olhar o estado antes de cada comando
      const rep = reproduzir({ semente: `off${i}`, timeA: tA, timeB: lug.guarda, comandos: [] })
      const e = rep.estado
      for (const cmd of r.comandos) {
        assert.notEqual(cmd.tipo, 'trocar', 'nunca usa trocar')
        if (cmd.tipo === 'jogar') {
          const inst = e.cartas[cmd.carta], def = CARTAS[inst.carta], u = e.bonecos[inst.dono]
          if (cmd.time === 'A') assert.notEqual(def.parte, parteOff, `jogou carta Off: ${inst.carta}`)
          for (const ef of def.efeitos) {
            if (ef.tipo === 'autoDano') assert.ok(u.vida > ef.valor, `autodano levaria a 0 (${inst.carta})`)
            if (ef.tipo === 'trocaComAlvo') {
              const f = e.times[cmd.time].lugares.map((id) => e.bonecos[id]).find((b) => b.estado === 'vivo')
              assert.ok(f && f.vida / f.vidaMax < SEGURANCA.trocaSeFrenteAbaixoDe, 'Current Step com a Frente forte')
            }
          }
        }
        assert.equal(aplicarNoLugar(e, cmd).ok, true)
      }
      assert.ok(e.fim)
    }
  })
})

describe('tarefa 29 — lugares com guarda fixa', () => {
  test('5 lugares, ids neutros, guardas = trios da Aventura, ordens válidas e fixas', () => {
    assert.deepEqual(LUGARES.map((l) => l.id), ['lugar1', 'lugar2', 'lugar3', 'lugar4', 'lugar5'])
    LUGARES.forEach((l, i) => {
      assert.equal(l.guarda.length, 3)
      for (const m of l.guarda) assert.ok(BONECOS_PRONTOS[m], 'monstro pronto: ' + m)
      assert.deepEqual(l.guarda.slice().sort(), FASES[i].time.slice().sort(), 'mesmo trio da fase ' + (i + 1))
      assert.ok(TATICAS.includes(l.ordens.tatica))
      l.ordens.ordem.forEach((cartas, k) => assert.deepEqual(cartas.slice().sort(), montarBoneco(l.guarda[k]).cartas.slice().sort()))
      assert.ok(Object.isFrozen(l) && Object.isFrozen(l.guarda))
      assert.equal(lugar(l.id), l)
    })
    assert.throws(() => lugar('lugar9'))
  })

  test('lugares.js não guarda número de economia (pesos e energia ficam fora)', () => {
    assert.equal(Object.keys(LUGARES[0]).sort().join(','), 'guarda,id,ordens')
    assert.ok(ECONOMIA_DO_BETA.energiaPorDia > 0)
  })
})

describe('tarefa 29 — vantagens (Strong vs / Weak to)', () => {
  // tabela da seção 3 de docs/ideias/jogo-idle.md, nos tipos do motor:
  // Bloom=jeans · Tide=seda · Stone=la · Gale=feltro · Mist=tule · Ember=couro
  const BATE_FORTE_EM = {
    rasgao: ['seda'], brigao: ['seda', 'tule'], mordedor: ['jeans'], pisoteador: ['seda', 'la', 'jeans'], desfiado: ['la'],
    embolado: ['feltro'], cascudo: ['tule'], assombrado: ['couro'], mudo: ['la', 'feltro'],
  }
  const TIPO_UM = { jeans: 'rasgao', seda: 'desfiado', la: 'embolado', feltro: 'cascudo', tule: 'assombrado', couro: 'mordedor' }

  test('cada monstro bate forte nos elementos da tabela do documento', () => {
    for (const [m, tipos] of Object.entries(BATE_FORTE_EM)) {
      for (const [tipo, alvo] of Object.entries(TIPO_UM)) {
        const v = vantagens([m, m, m], [alvo, alvo, alvo])[0]
        assert.equal(v.forte, tipos.includes(tipo) ? 3 : 0, `${m} contra ${tipo}`)
      }
    }
  })

  test('Cindertusk em Thornwood (lugar 3): Strong vs 3, Weak to 0; em Crownhold (lugar 5): Strong vs 2', () => {
    const [c] = vantagens(['pisoteador', 'rasgao', 'mudo'], lugar('lugar3').guarda)
    assert.equal(c.forte, 3)
    assert.equal(c.fraco, 0)
    const [c5] = vantagens(['pisoteador', 'rasgao', 'mudo'], lugar('lugar5').guarda)
    assert.equal(c5.forte, 2) // Ramblehorn (Bloom) e Ripplance (Tide); o outro Cindertusk é Ember
  })

  test('Wispurr em Stonebridge (lugar 4): bate forte no Cindertusk, apanha forte do Breezle', () => {
    const g = lugar('lugar4').guarda
    const [w] = vantagens(['assombrado', 'rasgao', 'mudo'], g)
    assert.equal(w.forte, 1)
    assert.deepEqual(w.forteEm.map((j) => g[j]), ['pisoteador'])
    assert.equal(w.fraco, 1)
    assert.deepEqual(w.apanhaDe.map((j) => g[j]), ['cascudo'])
  })

  test('habilidade sem dano não conta (Wispurr só bate com Mist; Véu não conta)', () => {
    const v = vantagens(['assombrado', 'assombrado', 'assombrado'], ['mordedor', 'mordedor', 'mordedor'])
    assert.equal(v[0].forte, 3)
    const s = vantagens(['mordedor', 'mordedor', 'mordedor'], ['assombrado', 'assombrado', 'assombrado'])
    assert.equal(s[0].fraco, 3)
    assert.equal(s[0].forte, 0)
  })
})

describe('tarefa 29 — simulador da matriz (contas puras)', () => {
  test('84 trios e 6 formações', () => {
    assert.equal(todosOsTrios().length, 84)
    assert.equal(new Set(FORMACOES.map((f) => f.join(''))).size, 6)
    assert.equal(MONSTROS.length, 9)
  })

  test('pesos e sequência lidos do simulador de economia; pontos = peso × (p + bônus × p³)', () => {
    const eco = economiaDeHoje()
    assert.equal(eco.pesos.length, LUGARES.length)
    assert.equal(eco.seqK, 3)
    assert.ok(Math.abs(pontos(0.5, 2, eco) - 2 * (0.5 + eco.seqBonus * 0.125)) < 1e-12)
  })

  test('matriz pequena é determinística (mesma semente → mesmas somas)', async () => {
    const trios = todosOsTrios().slice(0, 2)
    const a = await medirMatriz({ lutas: 1, semente: 't29', workers: 1, trios })
    const b = await medirMatriz({ lutas: 1, semente: 't29', workers: 1, trios })
    assert.deepEqual(a.casas.map((x) => Array.from(x)), b.casas.map((x) => Array.from(x)))
    assert.equal(a.casas[0].length, FORMACOES.length * TATICAS.length * LUGARES.length * 4)
  })

  test('critérios a–c: tabela com lugar dominante reprova; tabela espalhada aprova', () => {
    const dominante = Array.from({ length: 10 }, () => [1, 1, 1, 1, 2])
    const r = criteriosABC(dominante)
    assert.equal(r.a.ok, false); assert.equal(r.b.ok, false)
    const espalhada = Array.from({ length: 10 }, (_, t) => [0, 1, 2, 3, 4].map((l) => (l === t % 5 ? 2 : 1)))
    const s = criteriosABC(espalhada)
    assert.equal(s.a.ok, true); assert.equal(s.b.ok, true); assert.equal(s.c.ok, true)
    assert.ok(Math.abs(s.c.medido - 0.5) < 1e-12)
  })

  test('critérios d–e: plano ótimo põe as 20 energias no melhor par trio × lugar da conta', () => {
    const trios = [[0, 1, 2], [3, 4, 5]]
    const T = [[1, 2, 0, 0, 0], [0, 0, 0, 0, 3]]
    assert.deepEqual(planoOtimo(T, trios, new Set([0, 1, 2])), { v: 2, t: 0, l: 1 })
    assert.deepEqual(planoOtimo(T, trios, new Set([0, 1, 2, 3, 4, 5])), { v: 3, t: 1, l: 4 })
    const contas = sortearContas('x', 10)
    assert.equal(contas.length, 10)
    for (const c of contas) assert.ok(c.size >= 1 && c.size <= 9)
    const r = criteriosDE(T, [[2, 1, 0, 0, 0], [3, 0, 0, 0, 0]], trios, [new Set([0, 1, 2]), new Set([3, 4, 5])])
    assert.equal(r.d.medido, 2)
    assert.equal(r.e.medido, 1)
  })

  test('critério g mede amplitude entre formações e entre táticas', () => {
    const P = [Array.from({ length: LUGARES.length }, () => FORMACOES.map((_, f) => TATICAS.map((_, k) => 0.3 + 0.1 * (f === 0) + 0.05 * k)))]
    const g = criterioG(P, 400)
    assert.ok(Math.abs(g.formacao - 10) < 1e-9)
    assert.ok(Math.abs(g.tatica - 10) < 1e-9)
    assert.ok(g.formacaoAcaso > 0 && g.taticaAcaso > 0)
  })
})
