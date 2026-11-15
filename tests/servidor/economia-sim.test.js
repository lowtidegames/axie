// Invariantes do simulador da economia do pote (tools/simular-economia.mjs).
// Os números do simulador são PROPOSTA; estes testes provam as REGRAS do pote, que valem para qualquer número:
// o pote nunca paga mais do que recebeu, nada fica negativo, o dinheiro fecha e a simulação é repetível pela semente.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { simular, verificarContas, CENARIOS, Insolvencia } from '../../tools/simular-economia.mjs'

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
