// Tarefa 33 — regras de EXPERIMENTO do motor (só o simulador usa) e as contas puras de tools/experimentos-patrulhas.mjs.
// O que se prova: sem `regras`, a luta é bit a bit a de antes (assinatura gravada ANTES da mudança no motor); com
// `regras`, cada parâmetro faz o que diz e o replay refaz a mesma luta.
// Rodar: npm test  (ou: node --test tests/servidor/experimentos.test.js)
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { bateForte, criarLuta, regrasDeExperimento, reproduzir } from '../../shared/batalha.js'
import { BONECOS_PRONTOS, BONUS_DE_TIPO, CARTAS } from '../../shared/config.js'
import { criarRng } from '../../shared/rng.js'
import { LUGARES } from '../../shared/lugares.js'
import { TATICAS, lutaAutomatica } from '../../shared/tatica.js'
import {
  EXPERIMENTOS, GUARDAS_MONO, arenasDoExperimento, criteriosABC, distVitorias, espelhadas, medirArenas, planoDaConta, podeIr, valorPatrulha,
} from '../../tools/experimentos-patrulhas.mjs'
import { MONSTROS, economiaDeHoje, pontos, todosOsTrios } from '../../tools/simular-patrulhas.mjs'

const IDS = Object.keys(BONECOS_PRONTOS)
const sorteiaTrio = (rng) => { const ids = IDS.slice(), t = []; for (let k = 0; k < 3; k++) t.push(ids.splice(rng.inteiro(ids.length), 1)[0]); return t }

/** 200 lutas automáticas fixas → sha256 de resultado + comandos + eventos. */
function assinaturaDe200(regras) {
  const rng = criarRng('ouro-t33')
  const h = createHash('sha256')
  for (let i = 0; i < 200; i++) {
    const t = sorteiaTrio(rng), lug = LUGARES[i % 5]
    const ent = { semente: `ouro${i}`, timeA: t, timeB: lug.guarda, ordensA: { tatica: TATICAS[i % 3] }, ordensB: lug.ordens }
    if (regras !== undefined) ent.regras = regras
    const r = lutaAutomatica(ent)
    h.update(JSON.stringify([r.resultado, r.comandos, r.eventos]))
  }
  return h.digest('hex')
}
// gravada com o motor de origin/main ANTES da tarefa 33 (bb85cc6)
const OURO = '909c8defc29d35ffd7bdfc8a7e33fc46b68687943625d16f69e08b4463f0aba1'

describe('tarefa 33 — padrão inalterado', () => {
  test('sem regras: as mesmas 200 lutas de antes da mudança (resultado, comandos e eventos)', () => {
    assert.equal(assinaturaDe200(undefined), OURO)
  })
  test('regras null ou {} ou iguais às de hoje (+25%, resistência 0): mesma luta', () => {
    assert.equal(assinaturaDe200(null), OURO)
    assert.equal(assinaturaDe200({}), OURO)
    assert.equal(assinaturaDe200({ bonusDeTipo: BONUS_DE_TIPO, resistencia: 0 }), OURO)
  })
  test('sem regras o estado nem ganha a chave', () => {
    const e = criarLuta({ semente: 's', timeA: IDS.slice(0, 3), timeB: IDS.slice(3, 6) })
    assert.equal('regras' in e, false)
  })
})

describe('tarefa 33 — parâmetros de experimento', () => {
  const golpesFortes = (regras, n = 60) => {
    let soma = 0, qtd = 0
    for (let i = 0; i < n; i++) {
      const r = lutaAutomatica({ semente: `forte${i}`, timeA: ['desfiado', 'mudo', 'assombrado'], timeB: ['embolado', 'embolado', 'embolado'], regras })
      for (const ev of r.eventos) if (ev.t === 'dano' && ev.carta && !ev.refletido && bateForte(CARTAS[ev.carta].tipo, 'la') && !ev.critico) { soma += ev.bruto; qtd++ }
    }
    return soma / qtd
  }
  test('bonusDeTipo maior → golpe forte mais forte (seda bate forte em lã)', () => {
    const hoje = golpesFortes(undefined), maior = golpesFortes({ bonusDeTipo: 0.75 })
    assert.ok(maior > hoje * 1.25, `${maior} vs ${hoje}`)
  })
  test('resistencia: corpo de lã apanha menos de feltro (lã bate forte em feltro)', () => {
    const dano = (regras) => {
      let s = 0
      for (let i = 0; i < 40; i++) {
        const r = lutaAutomatica({ semente: `res${i}`, timeA: ['cascudo', 'cascudo', 'cascudo'], timeB: ['embolado', 'embolado', 'embolado'], regras })
        for (const ev of r.eventos) if (ev.t === 'dano' && ev.carta === 'feltro_pesado' && !ev.critico) s += ev.bruto
      }
      return s
    }
    assert.ok(bateForte('la', 'feltro'))
    const hoje = dano(undefined), resist = dano({ resistencia: 0.4 })
    assert.ok(resist < hoje * 0.8, `${resist} vs ${hoje}`)
  })
  test('danoPorTipo (terreno) aumenta o dano só daquele elemento', () => {
    const e1 = criarLuta({ semente: 't', timeA: ['rasgao', 'rasgao', 'rasgao'], timeB: ['embolado', 'embolado', 'embolado'], regras: { danoPorTipo: { jeans: 0.5 } } })
    assert.deepEqual(e1.regras.danoPorTipo, { jeans: 0.5 })
    let a = 0, b = 0
    for (let i = 0; i < 30; i++) {
      for (const [regras, add] of [[undefined, (x) => { a += x }], [{ danoPorTipo: { jeans: 0.5 } }, (x) => { b += x }]]) {
        const r = lutaAutomatica({ semente: `ter${i}`, timeA: ['rasgao', 'rasgao', 'rasgao'], timeB: ['embolado', 'embolado', 'embolado'], regras })
        for (const ev of r.eventos) if (ev.t === 'dano' && ev.de?.[0] === 'A' && ev.turno <= 2 && !ev.critico) add(ev.bruto)
      }
    }
    assert.ok(b > a * 1.3, `${b} vs ${a}`)
  })
  test('escudoInicialPorTipo e vidaInicial valem no começo da luta', () => {
    const e = criarLuta({ semente: 'x', timeA: ['embolado', 'rasgao', 'mudo'], timeB: ['cascudo', 'mudo', 'mudo'], regras: { escudoInicialPorTipo: { la: 25 }, vidaInicial: { A: [0.5, 1, 0.75] } } })
    assert.equal(e.bonecos.A0.escudo, 25)
    assert.equal(e.bonecos.A1.escudo, 0)
    assert.equal(e.bonecos.A0.vida, Math.round(e.bonecos.A0.vidaMax * 0.5))
    assert.equal(e.bonecos.A1.vida, e.bonecos.A1.vidaMax)
    assert.equal(e.bonecos.A2.vida, Math.round(e.bonecos.A2.vidaMax * 0.75))
    assert.equal(e.bonecos.B0.vida, e.bonecos.B0.vidaMax)
  })
  test('replay com as mesmas regras refaz a luta', () => {
    const regras = { bonusDeTipo: 0.5, resistencia: 0.25, danoPorTipo: { seda: 0.3 }, escudoInicialPorTipo: { tule: 25 }, vidaInicial: { A: [0.75, 0.75, 0.75] } }
    const rng = criarRng('t33-rep')
    for (let i = 0; i < 30; i++) {
      const timeA = sorteiaTrio(rng), lug = LUGARES[i % 5]
      const r = lutaAutomatica({ semente: `r${i}`, timeA, timeB: lug.guarda, ordensA: { tatica: TATICAS[i % 3] }, ordensB: lug.ordens, regras })
      const rep = reproduzir({ semente: `r${i}`, timeA, timeB: lug.guarda, comandos: r.comandos, regras })
      assert.equal(rep.ok, true)
      assert.deepEqual(rep.resultado, r.resultado)
    }
  })
  test('regras inválidas são recusadas', () => {
    for (const ruim of [{ bonus: 1 }, { bonusDeTipo: -1 }, { resistencia: 1 }, { danoPorTipo: { fogo: 0.1 } }, { vidaInicial: { A: [1, 1] } }, { vidaInicial: { C: [1, 1, 1] } }, { escudoInicialPorTipo: { la: 9999 } }, []]) {
      assert.throws(() => regrasDeExperimento(ruim), undefined, JSON.stringify(ruim))
    }
    assert.equal(regrasDeExperimento(undefined), null)
  })
})

describe('tarefa 33 — contas do simulador de experimentos', () => {
  const eco = economiaDeHoje()
  test('as variantes montam arenas válidas (mono: um elemento por guarda; terreno fica no lugar quando as guardas rodam)', () => {
    for (const [nome, exp] of Object.entries(EXPERIMENTOS)) {
      const { arenas, semana1, semana2 } = arenasDoExperimento(exp)
      assert.equal(semana1.length, 5, nome); assert.equal(semana2.length, 5, nome)
      for (const a of [...semana1, ...semana2]) assert.ok(arenas[a] && arenas[a].guarda.length === 3, nome)
      assert.notDeepEqual(semana1.map((a) => arenas[a].guarda), semana2.map((a) => arenas[a].guarda), nome)
    }
    for (const g of Object.values(GUARDAS_MONO)) assert.equal(new Set(g.map((id) => criarLuta({ semente: 1, timeA: g, timeB: g }).bonecos.A0.tipo)).size, 1)
    const t = arenasDoExperimento(EXPERIMENTOS['v4-dano30'])
    assert.deepEqual(t.arenas[t.semana1[0]].regras, t.arenas[t.semana2[0]].regras)
  })
  test('medirArenas sem regras = a matriz do simulador de hoje (mesmas sementes)', async () => {
    const { arenas } = arenasDoExperimento(EXPERIMENTOS.hoje)
    const M = await medirArenas({ arenas, lutas: 2, semente: 'x', workers: 1, trios: todosOsTrios().slice(0, 2) })
    const { medirTrios } = await import('../../tools/simular-patrulhas.mjs')
    const velho = medirTrios({ trios: todosOsTrios().slice(0, 2), lutas: 2, semente: 'x' })
    assert.deepEqual(M.casas, velho.map((a) => Array.from(a)))
  })
  test('distVitorias soma 1 e tem a média certa', () => {
    const d = distVitorias(5, 0.6, 3, 0.2)
    assert.ok(Math.abs(d.reduce((s, x) => s + x, 0) - 1) < 1e-12)
    assert.ok(Math.abs(d.reduce((s, x, w) => s + x * w, 0) - (3 + 0.6)) < 1e-12)
  })
  test('valorPatrulha sem V5/V6 é linear e bate com pontos()', () => {
    for (const p of [0.2, 0.5, 0.9]) for (const E of [1, 7, 20]) assert.ok(Math.abs(valorPatrulha(E, p, p, 1.3, eco) - E * pontos(p, 1.3, eco)) < 1e-9)
  })
  test('plano: pontos lineares → tudo num trio só; com teto por lugar (V5) → reparte em lugares diferentes', () => {
    const trios = [[0, 1, 2], [3, 4, 5], [6, 7, 8]]
    const Bm = [[0.9, 0.8, 0.7, 0.6, 0.5], [0.5, 0.85, 0.6, 0.5, 0.5], [0.5, 0.5, 0.8, 0.5, 0.5]]
    const base = { Bm, Bt: null, trios, semana: [0, 1, 2, 3, 4], pesos: [1, 1, 1, 1, 1], eco, tem: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]) }
    const lin = planoDaConta(base)
    assert.equal(lin.patrulhas.length, 1); assert.equal(lin.patrulhas[0].E, 20)
    const v5 = planoDaConta({ ...base, div: { v5: { n: 4, fator: 0.5 } } })
    assert.equal(v5.patrulhas.length, 3)
    assert.equal(new Set(v5.patrulhas.map((p) => p.l)).size, 3)
    assert.equal(v5.patrulhas.reduce((s, p) => s + p.E, 0), 20)
    const v6 = planoDaConta({ ...base, Bt: Bm.map((l) => l.map((p) => p * 0.3)), div: { v6: { k: 5, vida: 0.75 } } })
    assert.ok(v6.patrulhas.length >= 2)
  })
  test('lugar proibido (V7) tira o trio daquele lugar; critérios a–c numa tabela de brinquedo', () => {
    const t = MONSTROS.indexOf('rasgao')
    assert.equal(podeIr([t, 1, 2].filter((x, i, a) => a.indexOf(x) === i), 0, true), false) // lugar 1 = jeans
    assert.equal(podeIr([t], 0, false), true)
    const T = [[2, 1, 1, 1, 1], [1, 2, 1, 1, 1], [1, 1, 2, 1, 1], [1, 1, 1, 2, 1], [1, 1, 1, 1, 2]]
    const r = criteriosABC(T)
    assert.equal(r.a.ok, true); assert.equal(r.b.ok, true); assert.equal(r.c.ok, true)
  })
  test('espelhadas: as duas ordens de cada par contam (lutas = 2 × pares)', () => {
    const r = espelhadas({}, 10, 'teste')
    assert.equal(r.lutas, 20)
    assert.ok(r.quemComeca >= 0 && r.quemComeca <= 1)
  })
})
