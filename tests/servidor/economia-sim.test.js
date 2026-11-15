// Invariantes do simulador da economia do pote (tools/simular-economia.mjs).
// Os números do simulador são PROPOSTA; estes testes provam as REGRAS do pote, que valem para qualquer número:
// o pote nunca paga mais do que recebeu, nada fica negativo, o dinheiro fecha e a simulação é repetível pela semente.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { simular, verificarContas, CENARIOS, Insolvencia, CONJUNTOS, VARIACOES, conjunto, fatoresResultado, comparar } from '../../tools/simular-economia.mjs'

const ESCALA = 0.2 // rápido; a escala não muda as regras
const EPS = 1e-6
const resultados = {}
for (const nome of Object.keys(CENARIOS)) resultados[nome] = simular(nome, { semente: 42, escala: ESCALA, registro: true })

test('os 3 cenários obrigatórios + estresse de bots terminam sem insolvência, com 6 temporadas', () => {
  for (const nome of ['ENCHENTE', 'ESTAVEL', 'FUGA', 'ESTRESSE_BOTS']) {
    const r = resultados[nome]
    assert.ok(r, nome)
    assert.equal(r.temporadas.length, 6, nome)
    assert.equal(r.invariantesChecados, 180, `${nome}: invariante checado todo dia`)
    assert.ok(r.temporadas.every((t) => t.pagouMaisQueEntrou === false), `${nome}: pote pagou mais do que entrou`)
  }
})

test('o pote nunca fica negativo e a reserva nunca fica negativa, em nenhum dia', () => {
  for (const [nome, r] of Object.entries(resultados)) {
    assert.equal(r.registro.length, 180)
    for (const d of r.registro) {
      assert.ok(d.pote >= -EPS, `${nome} dia ${d.dia}: pote ${d.pote}`)
      assert.ok(d.reserva >= -EPS, `${nome} dia ${d.dia}: reserva ${d.reserva}`)
    }
  }
})

test('total pago pelo pote ≤ total recebido pelo pote + reserva usada (todo dia)', () => {
  for (const [nome, r] of Object.entries(resultados)) {
    for (const d of r.registro) {
      assert.ok(d.pagoPote <= d.entrouPote + d.reservaParaPote - d.poteParaReserva + EPS, `${nome} dia ${d.dia}`)
      assert.ok(d.pagoPote <= d.entrouPote + d.reservaParaPote + EPS, `${nome} dia ${d.dia}`)
    }
  }
})

test('saque nunca passa do dinheiro de fora que entrou (ninguém tira o que não foi posto)', () => {
  for (const [nome, r] of Object.entries(resultados)) {
    for (const d of r.registro) assert.ok(d.sacadoLiq <= d.externo + EPS, `${nome} dia ${d.dia}`)
  }
})

test('determinismo: mesma semente = mesmo resultado; semente diferente = resultado diferente', () => {
  const a = simular('FUGA', { semente: 7, escala: ESCALA })
  const b = simular('FUGA', { semente: 7, escala: ESCALA })
  const c = simular('FUGA', { semente: 8, escala: ESCALA })
  assert.deepEqual(a.temporadas, b.temporadas)
  assert.deepEqual(a.contas, b.contas)
  assert.notDeepEqual(a.temporadas, c.temporadas)
})

test('o verificador pega cada furo de conta (não é um teste que sempre passa)', () => {
  const ok = { poteAventura: 60, poteRanking: 10, reserva: 15, entrouPote: 100, entrouReserva: 20, reservaParaPote: 5, poteParaReserva: 0, pagoPote: 35, estudio: 30, sacadoLiq: 20, externo: 150, receita: 150 }
  // 150 = estúdio 30 + pote 70 + reserva 15 + saldos 15 + sacado 20
  assert.equal(verificarContas(ok, 15), null)
  assert.match(verificarContas({ ...ok, poteAventura: -1, pagoPote: 96 }, 86), /pote negativo/)
  assert.match(verificarContas({ ...ok, reserva: -1 }, 31), /reserva negativa/)
  assert.match(verificarContas({ ...ok, pagoPote: 200 }, 15), /pagou mais/)
  assert.match(verificarContas({ ...ok, pagoPote: 34 }, 15), /pote não fecha/)
  assert.match(verificarContas({ ...ok, entrouReserva: 25 }, 15), /reserva não fecha/)
  assert.match(verificarContas(ok, 15, true), /saldo de jogador negativo/)
  assert.match(verificarContas(ok, 16), /dinheiro não fecha/)
})

test('Insolvencia é o erro que a simulação lança quando a conta não fecha', () => {
  assert.ok(new Insolvencia('x') instanceof Error)
})

test('na FUGA o jogo encolhe mas continua pagando só o que tem (ativos caem ≥ 60% do pico)', () => {
  const t = resultados.FUGA.temporadas
  const pico = Math.max(...t.map((x) => x.ativosMax))
  assert.ok(t[5].ativos <= pico * 0.4, `fim ${t[5].ativos} × pico ${pico}`)
  assert.ok(t.every((x) => x.reserva >= 0))
})

test('estresse: com ~30% de contas-bot, a fazenda não leva mais de 35% do pote', () => {
  const r = resultados.ESTRESSE_BOTS
  const tot = Object.values(r.porTipo).reduce((s, v) => s + v.contas, 0)
  const pesoBots = r.porTipo.bot.contas / tot
  const pctMedio = r.temporadas.slice(1).reduce((s, x) => s + x.pctBots, 0) / 5
  assert.ok(pesoBots > 0.25 && pesoBots < 0.4, `peso ${pesoBots}`)
  assert.ok(pctMedio < 0.35, `bots levaram ${pctMedio}`)
})

// ───────── Rodada 2: os MESMOS invariantes valem para TODO conjunto de números (R1, cada caminho isolado, R2 e variações) ─────────
const TODOS = [...Object.keys(CONJUNTOS), ...Object.keys(VARIACOES), 'R2+BOT_FORTE', 'R2+SEM_ANTIBOT']

test('rodada 2: todo conjunto, nos 4 cenários, passa nos invariantes todo dia (pote nunca paga mais do que entrou)', () => {
  for (const nome of TODOS) {
    const params = conjunto(nome)
    for (const cen of Object.keys(CENARIOS)) {
      const r = simular(cen, { semente: 42, escala: ESCALA, registro: true, params })
      const ctx = `${nome} / ${cen}`
      assert.equal(r.temporadas.length, 6, ctx)
      assert.equal(r.invariantesChecados, 180, ctx)
      assert.ok(r.temporadas.every((t) => t.pagouMaisQueEntrou === false), `${ctx}: pote pagou mais do que entrou`)
      assert.equal(r.resumo.potePagouMais, false, ctx)
      for (const d of r.registro) {
        assert.ok(d.pote >= -EPS && d.reserva >= -EPS, `${ctx} dia ${d.dia}: pote/reserva negativos`)
        assert.ok(d.pagoPote <= d.entrouPote + d.reservaParaPote - d.poteParaReserva + EPS, `${ctx} dia ${d.dia}: pagou mais`)
        assert.ok(d.sacadoLiq <= d.externo + EPS, `${ctx} dia ${d.dia}: sacou mais do que entrou de fora`)
      }
    }
  }
})

test('rodada 2: o conjunto R1 é exatamente a proposta da rodada 1 (nada mudou por baixo)', () => {
  for (const cen of ['ESTAVEL', 'ESTRESSE_BOTS']) {
    const a = simular(cen, { semente: 42, escala: ESCALA })
    const b = simular(cen, { semente: 42, escala: ESCALA, params: conjunto('R1') })
    assert.deepEqual(a.temporadas, b.temporadas, cen)
    assert.deepEqual(a.contas, b.contas, cen)
  }
})

test('rodada 2: determinismo do R2 (mesma semente = mesmo resultado)', () => {
  const a = simular('ESTRESSE_BOTS', { semente: 7, escala: ESCALA, params: conjunto('R2') })
  const b = simular('ESTRESSE_BOTS', { semente: 7, escala: ESCALA, params: conjunto('R2') })
  assert.deepEqual(a.temporadas, b.temporadas)
  assert.deepEqual(a.resumo, b.resumo)
})

test('rodada 2: farmador entra de graça (não põe dinheiro para entrar) e o anti-bot do R2 segura bots abaixo de 10% do pote', () => {
  const r = simular('ESTRESSE_BOTS', { semente: 42, escala: 0.5, params: conjunto('R2') })
  assert.ok(r.resumo.pctBots < 0.10, `bots levaram ${r.resumo.pctBots}`)
  const sem = simular('ESTRESSE_BOTS', { semente: 42, escala: 0.5, params: conjunto('A_GRATIS') })
  assert.ok(sem.resumo.pctBots > r.resumo.pctBots, 'sem anti-bot, a entrada de graça tem de deixar os bots levarem mais')
  const e = simular('ESTAVEL', { semente: 42, escala: 0.5, params: conjunto('R2') })
  assert.ok(e.porTipo.farmador.pos < e.porTipo.farmador.contas * 0.5, 'farmador quase não põe dinheiro de fora')
})

test('rodada 2: ganho por resultado usa as taxas medidas no motor — bom > mediano > bot simples', () => {
  const f = fatoresResultado(CONJUNTOS.R2.RESULTADO)
  assert.equal(f.mediano, 1)
  assert.ok(f.bom > 1.2 && f.fraco < 0.8, JSON.stringify(f))
})

test('rodada 2: --comparar devolve uma linha por conjunto × cenário com as colunas pedidas', () => {
  const linhas = comparar(['R1', 'R2'], { semente: 42, escala: ESCALA })
  assert.equal(linhas.length, 8)
  for (const l of linhas) {
    for (const k of ['farmMediano', 'farmTop25', 'pctComTime', 'donoPaybackDias', 'baleiaMediana', 'baleiaTop10', 'pctBots', 'mercadoPct', 'caixaEstudio']) assert.ok(k in l, k)
    assert.equal(l.potePagouMais, false)
  }
})
