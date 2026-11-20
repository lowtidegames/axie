// Tarefa 17 (parecer de segurança nº 2, rodada 3): S3-1 relógio que volta na virada do dia não devolve energia;
// S3-2 lista do proxy com IPv4 mapeado em maiúsculas; energia mostrada sempre entre 0 e o máximo.
// Rodar: node --test tests/servidor/tarefa17.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { abrirBanco } from '../../server/db.mjs'
import { criarJogo } from '../../server/jogo.mjs'
import { proxiesDoAmbiente, ipDoCliente } from '../../server/api.mjs'

const DIA = 86_400_000
const T0 = 1_900_000_000_000 + 5 * 3_600_000 // meio de um dia UTC
const viradaDepois = (t) => (Math.floor(t / DIA) + 1) * DIA

let nApelido = 0
function preparar(t = T0) {
  const relogio = { t }
  const db = abrirBanco(':memory:', { modo: 'teste', agora: () => relogio.t })
  const jogo = criarJogo(db, { agora: () => relogio.t, log: () => {} })
  const { conta: c } = jogo.criarConta(`Relogio ${++nApelido}`)
  const ids = jogo.estado(c.id).bonecos.map((b) => b.id)
  return { relogio, db, jogo, c, ids }
}
/** Tenta abrir (e desistir de) uma luta da Aventura; devolve true se abriu. */
function abrir(jogo, contaId, ids) {
  try {
    const l = jogo.novaLuta(contaId, { modo: 'aventura', fase: 1, time: ids.slice(0, 3) })
    jogo.desistir(contaId, l.id)
    return true
  } catch (e) {
    if (e.codigo !== 'SEM_ENERGIA') throw e
    return false
  }
}

describe('tarefa 17 — S3-1: relógio que volta na virada não devolve energia', () => {
  test('conta em 20/20 gastos; relógio volta 1 dia → continua sem energia (tela e abertura)', () => {
    const { relogio, jogo, c, ids } = preparar()
    for (let i = 0; i < 20; i++) assert.ok(abrir(jogo, c.id, ids))
    assert.equal(jogo.estado(c.id).energia.atual, 0)
    relogio.t = T0 - DIA
    assert.equal(jogo.estado(c.id).energia.atual, 0, 'a tela devolveu energia com o relógio voltando')
    assert.equal(abrir(jogo, c.id, ids), false, 'abriu luta com o relógio voltando')
    relogio.t = T0
    assert.equal(abrir(jogo, c.id, ids), false)
    // a virada de verdade (dia seguinte ao gravado) continua recarregando
    relogio.t = viradaDepois(T0)
    assert.equal(jogo.estado(c.id).energia.atual, 20)
    assert.ok(abrir(jogo, c.id, ids))
  })

  test('dois processos com relógios 1 s diferentes na meia-noite UTC, alternando: no máximo 20 aberturas', () => {
    const virada = viradaDepois(T0)
    const { db, c, ids } = preparar(virada - 500)
    const atrasado = criarJogo(db, { agora: () => virada - 500, log: () => {} })
    const adiantado = criarJogo(db, { agora: () => virada + 500, log: () => {} })
    let abertas = 0
    for (let i = 0; i < 60; i++) if (abrir(i % 2 ? atrasado : adiantado, c.id, ids)) abertas++
    assert.ok(abertas <= 20, `abriu ${abertas} lutas num dia de 20`)
  })
})

describe('tarefa 17 — energia mostrada fica entre 0 e o máximo', () => {
  test('energia_gasta estranha no banco (negativa ou enorme): tela entre 0 e 20, e o servidor não deixa passar de 20', () => {
    const { db, jogo, c, ids } = preparar()
    abrir(jogo, c.id, ids) // grava o dia de hoje
    db.prepare('UPDATE contas SET energia_gasta = -50 WHERE id = ?').run(c.id)
    const e = jogo.estado(c.id).energia
    assert.equal(e.atual, 20, `mostrou ${e.atual} com máximo ${e.maximo}`)
    let abertas = 0
    for (let i = 0; i < 40; i++) if (abrir(jogo, c.id, ids)) abertas++
    assert.equal(abertas, 20, 'o número da tela é o que o servidor deixa')
    db.prepare('UPDATE contas SET energia_gasta = 999 WHERE id = ?').run(c.id)
    assert.equal(jogo.estado(c.id).energia.atual, 0)
  })
})

describe('tarefa 17 — S3-2: lista do proxy com IPv4 mapeado em maiúsculas ou hexa', () => {
  test('lista do proxy com ::FFFF: maiúsculo (e ::ffff:a00:1) vale o IPv4 do socket', () => {
    for (const item of ['::FFFF:10.0.0.1', '::ffff:a00:1', '::FFFF:A00:1', '0:0:0:0:0:FFFF:10.0.0.1']) {
      const linhas = []
      const p = proxiesDoAmbiente({ TRUST_PROXY: '1', TRUST_PROXY_IPS: item }, (l) => linhas.push(l))
      assert.ok(p.has('10.0.0.1'), `${item} → ${[...p].join(',')} ${linhas.join(' ')}`)
      for (const socket of ['10.0.0.1', '::ffff:10.0.0.1']) {
        const req = { socket: { remoteAddress: socket }, headers: { 'x-forwarded-for': '9.8.7.6' } }
        assert.equal(ipDoCliente(req, p), '9.8.7.6', `${item} / socket ${socket}`)
      }
    }
  })

  test('X-Forwarded-For com IPv4 mapeado em hexa ou maiúsculas vira o IPv4', () => {
    const p = proxiesDoAmbiente({ TRUST_PROXY: '1', TRUST_PROXY_IPS: '10.0.0.1' }, () => {})
    for (const xff of ['::FFFF:9.8.7.6', '::ffff:908:706']) {
      const req = { socket: { remoteAddress: '10.0.0.1' }, headers: { 'x-forwarded-for': xff } }
      assert.equal(ipDoCliente(req, p), '9.8.7.6', xff)
    }
  })
})
