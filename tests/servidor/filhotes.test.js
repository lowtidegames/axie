// Tarefa 35 — gerador de CONTAS REALISTAS do simulador de patrulhas (tools/experimentos-filhotes.mjs).
// O que se prova: o gerador é determinístico (mesma semente → mesma conta, bit a bit); cada filhote sai de uma costura
// de verdade (shared/costura.js) e é válido para o motor; as contas gêmeas (ao acaso × de propósito) têm os mesmos
// prontos; o cruzamento de propósito escolhe o par de maior nota; e as contas puras da análise fazem o que dizem.
// Rodar: npm test  (ou: node --test tests/servidor/filhotes.test.js)
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { bateForte, montarBoneco } from '../../shared/batalha.js'
import { BONECOS_PRONTOS, CARTAS } from '../../shared/config.js'
import { PARTES_DO_BONECO, chancesDaCostura, paraLuta, podeCosturar, validarBoneco } from '../../shared/costura.js'
import { criarRng } from '../../shared/rng.js'
import { LUGARES } from '../../shared/lugares.js'
import {
  PRONTOS, chaveDoMonstro, copiasDaConta, criteriosPorConta, defDoMonstro, gerarConta, gerarContaMadura, nomeDaChave,
  notaContraGuarda, prontoComGenes, triosDaConta, valorDaReceita,
} from '../../tools/experimentos-filhotes.mjs'
import { economiaDeHoje } from '../../tools/simular-patrulhas.mjs'

const SEMENTES = Array.from({ length: 12 }, (_, i) => `t${i}`)
const ehDano = (id) => CARTAS[id].efeitos.some((x) => x.tipo === 'dano')

/** Confere um filhote contra os pais que estão na conta (antes da costura os pais tinham 1 volta a menos). */
function conferirFilhote(conta, f) {
  assert.equal(validarBoneco(f).ok, true, `filhote inválido: ${f.id}`)
  assert.equal(f.pais.length, 2)
  const pais = f.pais.map((id) => conta.bonecos.find((b) => b.id === id))
  assert.ok(pais.every(Boolean), 'os dois pais estão na conta')
  assert.equal(f.geracao, Math.max(pais[0].geracao ?? 0, pais[1].geracao ?? 0) + 1)
  assert.equal(f.casulo?.aberto, true, 'casulo aberto')
  for (const p of PARTES_DO_BONECO) {
    const genes = pais.flatMap((b) => [b.partes[p].face, b.partes[p].forro])
    assert.ok(genes.includes(f.partes[p].face), `face de ${p} vem de um dos pais`)
    assert.ok(genes.includes(f.partes[p].forro), `forro de ${p} vem de um dos pais`)
  }
  const ficha = montarBoneco(paraLuta(f)) // o motor aceita o filhote
  assert.equal(ficha.cartas.length, 3)
}

describe('gerador de contas realistas', () => {
  test('determinístico: a mesma semente dá a mesma conta; sementes diferentes, contas diferentes', () => {
    for (const s of SEMENTES.slice(0, 4)) {
      assert.deepEqual(gerarConta(s), gerarConta(s))
      assert.deepEqual(gerarConta(s, { modo: 'proposito' }), gerarConta(s, { modo: 'proposito' }))
      assert.deepEqual(gerarContaMadura(s), gerarContaMadura(s))
    }
    assert.notDeepEqual(gerarConta('t0').bonecos.map(chaveDoMonstro), gerarConta('t1').bonecos.map(chaveDoMonstro))
  })

  test('6 a 9 prontos e 2 a 4 costuras de verdade; filhotes válidos pelo motor; Carretel conta as voltas', () => {
    for (const s of SEMENTES) {
      const c = gerarConta(s)
      const prontos = c.bonecos.filter((b) => (b.geracao ?? 0) === 0)
      const filhotes = c.bonecos.filter((b) => (b.geracao ?? 0) > 0)
      assert.ok(prontos.length >= 6 && prontos.length <= 9, `prontos: ${prontos.length}`)
      assert.ok(c.cruzamentos.length >= 2 && c.cruzamentos.length <= 4)
      assert.equal(filhotes.length, c.cruzamentos.length)
      for (const b of prontos) { assert.equal(validarBoneco(b).ok, true); assert.ok(nomeDaChave(chaveDoMonstro(b)), 'pronto tem as faces de um pronto') }
      for (const f of filhotes) conferirFilhote(c, f)
      assert.equal(c.bonecos.reduce((x, b) => x + (b.voltasUsadas ?? 0), 0), 2 * c.cruzamentos.length)
      assert.deepEqual(c.cruzamentos.map((x) => x.filho), filhotes.map((f) => f.id))
    }
  })

  test('conta madura: 10 a 15 monstros, metade filhotes, 2 de 1ª geração e o resto de 2ª', () => {
    for (const s of SEMENTES) {
      const c = gerarContaMadura(s)
      const n = c.bonecos.length
      const g = (k) => c.bonecos.filter((b) => (b.geracao ?? 0) === k).length
      assert.ok(n >= 10 && n <= 15, `tamanho ${n}`)
      assert.equal(g(1) + g(2), Math.floor(n / 2))
      assert.equal(g(1), 2)
      assert.ok(g(2) >= g(1), 'a maior parte é de 2ª geração')
      for (const f of c.bonecos.filter((b) => (b.geracao ?? 0) > 0)) conferirFilhote(c, f)
    }
  })

  test('contas gêmeas: ao acaso e de propósito têm os mesmos prontos e o mesmo número de costuras', () => {
    for (const s of SEMENTES.slice(0, 6)) {
      const a = gerarConta(s), p = gerarConta(s, { modo: 'proposito' })
      const prontos = (c) => c.bonecos.filter((b) => (b.geracao ?? 0) === 0).map((b) => [b.id, b.partes])
      assert.deepEqual(prontos(a), prontos(p))
      assert.equal(a.cruzamentos.length, p.cruzamentos.length)
      assert.ok(Number.isInteger(p.alvo) && p.alvo >= 0 && p.alvo < LUGARES.length)
    }
  })

  test('de propósito: a 1ª costura usa o par permitido de maior nota contra a guarda do lugar-alvo', () => {
    for (const s of SEMENTES.slice(0, 4)) {
      const p = gerarConta(s, { modo: 'proposito' })
      // refaz os prontos da conta (antes de costurar) com o mesmo sorteio
      const rng = criarRng(`conta:${s}`)
      const n = 6 + rng.inteiro(4)
      const antes = []
      for (let j = 0; j < n; j++) antes.push(prontoComGenes(PRONTOS[rng.inteiro(PRONTOS.length)], rng, `${s}.p${j}`))
      const guarda = { corpos: LUGARES[p.alvo].guarda.map((id) => montarBoneco(id).tipo), dano: LUGARES[p.alvo].guarda.flatMap((id) => montarBoneco(id).cartas.filter(ehDano).map((c) => CARTAS[c].tipo)) }
      let melhor = -Infinity
      for (let i = 0; i < antes.length; i++) for (let j = i + 1; j < antes.length; j++) if (podeCosturar(antes[i], antes[j]).ok) melhor = Math.max(melhor, notaContraGuarda(chancesDaCostura(antes[i], antes[j]), guarda))
      const [ia, ib] = p.cruzamentos[0].pais.map((id) => antes.findIndex((b) => b.id === id))
      assert.ok(Math.abs(notaContraGuarda(chancesDaCostura(antes[ia], antes[ib]), guarda) - melhor) < 1e-12)
    }
  })

  test('notaContraGuarda: filhote certo (pais com genes iguais) dá a conta feita à mão', () => {
    const rng = criarRng('nota')
    for (const nome of PRONTOS) {
      const a = prontoComGenes(nome, rng, 'a'), b = prontoComGenes(nome, rng, 'b')
      for (const x of [a, b]) for (const p of PARTES_DO_BONECO) x.partes[p].forro = x.partes[p].face
      const f = montarBoneco(nome)
      for (const l of LUGARES) {
        const fichas = l.guarda.map((id) => montarBoneco(id))
        const dano = fichas.flatMap((g) => g.cartas.filter(ehDano).map((c) => CARTAS[c].tipo))
        let esperado = 0
        for (const d of dano) esperado += (bateForte(f.tipo, d) ? 1 : 0) - (bateForte(d, f.tipo) ? 1 : 0)
        for (const c of f.cartas.filter(ehDano)) for (const g of fichas) if (bateForte(CARTAS[c].tipo, g.tipo)) esperado++
        const guarda = { corpos: fichas.map((g) => g.tipo), dano }
        assert.ok(Math.abs(notaContraGuarda(chancesDaCostura(a, b), guarda) - esperado) < 1e-12, `${nome} em ${l.id}`)
      }
    }
  })

  test('chave do monstro: cópias contam juntas e a definição volta igual para o motor', () => {
    const c = gerarConta('t3')
    const tem = copiasDaConta(c)
    assert.equal([...tem.values()].reduce((s, x) => s + x, 0), c.bonecos.length)
    for (const k of tem.keys()) assert.equal(Object.values(montarBoneco(defDoMonstro(k)).partes).join('|'), k)
    for (const nome of PRONTOS) {
      const k = chaveDoMonstro({ partes: Object.fromEntries(PARTES_DO_BONECO.map((p) => [p, { face: BONECOS_PRONTOS[nome].partes[p] }])) })
      assert.equal(nomeDaChave(k), nome)
      assert.deepEqual(montarBoneco(defDoMonstro(k)), { ...montarBoneco(nome), pronto: null })
    }
    const n = tem.size
    assert.equal(triosDaConta(tem).length, (n * (n - 1) * (n - 2)) / 6)
  })
})

describe('contas puras da análise', () => {
  test('critérios por conta: fatias, moda, contas fora da moda e custo do lugar popular', () => {
    const T = [[10, 5, 1], [10, 8, 1], [2, 9, 1], [1, 1, 4]]
    const r = criteriosPorConta(T)
    assert.deepEqual(r.fatias, [0.5, 0.25, 0.25])
    assert.equal(r.popular, 0)
    assert.equal(r.foraDaModa, 2)
    // custos: 0, 0, 1 − 1/4 = 0,75, 1 − 2/9 ≈ 0,78 → mediana (0 + 0,75) / 2
    assert.ok(Math.abs(r.c.medido - 0.375) < 1e-12)
    assert.equal(r.a.ok, false)
  })

  test('receita: usa os trios da própria conta; patrulha impossível passa a energia para a principal', () => {
    const eco = economiaDeHoje()
    const trios = [['a', 'b', 'c'], ['d', 'e', 'f'], ['a', 'd', 'g']]
    const Bm = [[0.9, 0.2], [0.3, 0.8], [0.5, 0.5]]
    const pesos = [1, 1], semana = [0, 1]
    const tem = new Map([['a', 1], ['b', 1], ['c', 1], ['d', 1], ['e', 1], ['f', 1], ['g', 1]])
    const receita = [{ l: 0, E: 12 }, { l: 1, E: 8 }]
    const v = valorDaReceita(receita, { Bm, Bt: null, trios, pesos, eco, div: {}, tem, semana })
    const pts = (E, p) => E * (p + eco.seqBonus * p ** eco.seqK)
    assert.ok(Math.abs(v - (pts(12, 0.9) + pts(8, 0.8))) < 1e-9)
    // sem 'e' não há 'def'; 'adg' e 'abc' dividem o 'a': a melhor saída é 'abc' no lugar 0 com as 20 energias
    const tem2 = new Map(tem); tem2.set('e', 0)
    const v2 = valorDaReceita(receita, { Bm, Bt: null, trios, pesos, eco, div: {}, tem: tem2, semana })
    assert.ok(Math.abs(v2 - pts(20, 0.9)) < 1e-9)
  })
})
