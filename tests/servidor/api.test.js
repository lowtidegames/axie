// Testes do servidor do protótipo (server/): conta de teste, coleção, luta decidida no servidor, costura, aposentar,
// e os ATAQUES de quem trapaceia (cada um prova a recusa). Sobe o servidor de verdade numa porta livre, banco em memória.
// Rodar: npm test  (ou: node --test tests/servidor/api.test.js)
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { reproduzir } from '../../shared/batalha.js'
import { BONECOS_PRONTOS } from '../../shared/config.js'
import { PARAMS_COSTURA, PARTES_DO_BONECO, chancesDaCostura } from '../../shared/costura.js'
import { iniciar } from '../../server/index.mjs'
import { abrirBanco, MIGRACOES, VERSAO_DO_BANCO } from '../../server/db.mjs'
import { criarTratador, chaveDoIp } from '../../server/api.mjs'
import { ErroDoJogo } from '../../server/jogo.mjs'

// ---------------------------------------------------------------- servidor de teste (relógio controlado)

const relogio = { t: 1_900_000_000_000 }
const agora = () => relogio.t
const logs = []
let app, base

before(async () => {
  app = await iniciar({ dbPath: ':memory:', porta: 0, agora, log: (l) => logs.push(l), limites: { contasPorIp: { max: 10_000, janelaMs: 3_600_000 }, pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 100_000, janelaMs: 60_000 } } })
  base = `http://127.0.0.1:${app.porta}`
})
after(() => { app.servidor.closeAllConnections(); app.servidor.close() })

async function api(metodo, caminho, { token, corpo, cru, tipo = 'application/json', cabecalhos = {} } = {}) {
  const headers = { ...cabecalhos }
  if (token) headers.Authorization = `Bearer ${token}`
  let body
  if (cru !== undefined) { body = cru; headers['Content-Type'] = tipo } else if (corpo !== undefined) { body = JSON.stringify(corpo); headers['Content-Type'] = tipo }
  const r = await fetch(base + caminho, { method: metodo, headers, body })
  const texto = await r.text()
  let json = null
  try { json = JSON.parse(texto) } catch { /* não é JSON */ }
  return { status: r.status, json, texto, headers: r.headers }
}

let apelidos = 0
async function novaConta() {
  const r = await api('POST', '/api/conta', { corpo: { apelido: `Jogador ${++apelidos}` } })
  assert.equal(r.status, 201, r.texto)
  const e = await api('GET', '/api/estado', { token: r.json.token })
  assert.equal(e.status, 200)
  return { token: r.json.token, conta: r.json.conta, bonecos: e.json.bonecos }
}

const timeDe = (c, i = 0) => c.bonecos.slice(i, i + 3).map((b) => b.id)
const linhaDaLuta = (id) => app.db.prepare('SELECT * FROM lutas WHERE id = ?').get(id)
const estadoInterno = (id) => JSON.parse(linhaDaLuta(id).estado)

/** Varre a resposta de luta ABERTA: nada de semente, sorteio, mão do rival nem ordem de baralho. */
function semSegredo(texto, lutaId) {
  const linha = linhaDaLuta(lutaId)
  const e = JSON.parse(linha.estado)
  assert.ok(!texto.includes(linha.semente), 'a semente vazou')
  const o = JSON.parse(texto)
  const chaves = []
  ;(function andar(x) { if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) { chaves.push(k); andar(v) } })(o)
  assert.ok(!chaves.includes('semente'), 'campo semente na resposta')
  assert.ok(!chaves.includes('rng'), 'estado do sorteio na resposta')
  const visoes = [o.visao, o.erro?.luta?.visao].filter(Boolean)
  // carta já mostrada na mesa (jogada ou descartada como fiapo) é pública: quem prestou atenção sabe o que ela é
  const publicas = new Set(e.eventos.filter((ev) => ev.t === 'carta' || ev.t === 'fiapo').map((ev) => ev.carta))
  for (const v of visoes) {
    assert.equal(typeof v.times.B.mao, 'number', 'mão do rival aberta')
    assert.equal(typeof v.times.B.baralho, 'number', 'baralho do rival aberto')
    assert.equal(typeof v.times.A.baralho, 'number', 'ordem do meu baralho aberta')
    for (const cid of e.times.B.mao) if (!publicas.has(cid)) assert.equal(v.cartas[cid]?.carta, undefined, `carta ${cid} da mão do rival vazou`)
    for (const cid of e.times.B.baralho) if (!publicas.has(cid)) assert.equal(v.cartas[cid]?.carta, undefined, `carta ${cid} do baralho do rival vazou`)
    for (const ev of [...v.eventos, ...(o.eventos ?? [])]) if (ev.t === 'compra' && ev.time === 'B') assert.equal(ev.carta, undefined, 'compra do rival vazou')
    // tarefa 13 (motor 2): a mesa vem na visão; a do rival (e a minha) só tem carta já jogada, nunca carta escondida
    assert.ok(Array.isArray(v.times.B.mesa) && Array.isArray(v.times.A.mesa), 'mesa fora da visão')
    for (const k of ['A', 'B']) for (const cid of v.times[k].mesa) assert.ok(publicas.has(cid), `carta ${cid} na mesa de ${k} sem ter sido jogada`)
  }
}

/** Cliente robô honesto: só olha a resposta (visão + validos) e manda um comando por vez. */
async function jogarAteOFim(token, luta) {
  let r = luta, n = 0, turno = r.visao.turno, noTurno = 0
  while (r.status === 'aberta') {
    assert.ok(++n < 500, 'luta não acabou')
    if (r.visao.turno !== turno) { turno = r.visao.turno; noTurno = 0 }
    const jogar = r.validos.find((c) => c.tipo === 'jogar') ?? r.validos.find((c) => c.tipo === 'fiapo')
    const comando = noTurno < 6 && jogar ? jogar : { tipo: 'passar' }
    noTurno++
    const res = await api('POST', `/api/luta/${r.id}/comando`, { token, corpo: { seq: r.seq, comando } })
    assert.equal(res.status, 200, res.texto)
    if (res.json.status === 'aberta') semSegredo(res.texto, r.id)
    r = res.json
  }
  return r
}

// ---------------------------------------------------------------- fluxo feliz

describe('fluxo feliz', () => {
  test('conta → estado → luta livre até o fim por cliente honesto → replay bate com reproduzir', async () => {
    const c = await novaConta()
    assert.match(c.token, /^[A-Za-z0-9_-]{43}$/)
    assert.equal(c.bonecos.length, 9)
    const linhaConta = app.db.prepare('SELECT * FROM contas WHERE id = ?').get(c.conta.id)
    assert.notEqual(linhaConta.token_hash, c.token, 'token guardado em claro')
    assert.ok(!JSON.stringify(linhaConta).includes(c.token))

    const nova = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', time: timeDe(c), robo: 'planejador' } })
    assert.equal(nova.status, 201, nova.texto)
    semSegredo(nova.texto, nova.json.id)
    assert.equal(nova.json.voce, 'A')
    assert.equal(nova.json.visao.vez, 'A')
    assert.ok(nova.json.prazo > agora())

    const est = await api('GET', '/api/estado', { token: c.token })
    assert.equal(est.json.lutaAberta, nova.json.id)
    assert.equal(est.json.bonecos.filter((b) => b.ocupado).length, 3)

    const fim = await jogarAteOFim(c.token, nova.json)
    assert.equal(fim.status, 'encerrada')
    assert.ok(['A', 'B'].includes(fim.resultado.vencedor))

    const rep = await api('GET', `/api/luta/${fim.id}/replay`, { token: c.token })
    assert.equal(rep.status, 200, rep.texto)
    assert.equal(typeof rep.json.semente, 'string')
    const refeita = reproduzir(rep.json)
    assert.equal(refeita.ok, true)
    assert.deepEqual(refeita.resultado, rep.json.resultado)
    assert.deepEqual(refeita.resultado, fim.resultado)

    // bonecos liberados e com a luta registrada (Pontos de Costura, lutas) + livro-razão
    const depois = await api('GET', '/api/estado', { token: c.token })
    assert.equal(depois.json.lutaAberta, null)
    for (const id of timeDe(c)) {
      const b = depois.json.bonecos.find((x) => x.id === id)
      assert.equal(b.ocupado, false)
      assert.equal(b.lutas, 1)
      assert.equal(b.pontosDeCostura, PARAMS_COSTURA.desgaste.pontosPorLuta)
      const h = await api('GET', `/api/boneco/${id}`, { token: c.token })
      assert.deepEqual(h.json.historico.map((x) => x.tipo), ['nasceu', 'lutou'])
      assert.equal(h.json.historico[1].luta, fim.id)
    }
  })

  test('conta nova: 9 bonecos, face = boneco pronto, forro sorteado pelo servidor (muda de conta para conta)', async () => {
    const a = await novaConta(), b = await novaConta()
    const prontos = Object.keys(BONECOS_PRONTOS)
    assert.deepEqual(a.bonecos.map((x) => x.pronto), prontos)
    for (const x of a.bonecos) {
      for (const p of PARTES_DO_BONECO) assert.equal(x.partes[p].face, BONECOS_PRONTOS[x.pronto].partes[p])
      assert.equal(x.voltasUsadas, 0)
      assert.equal(x.estado, 'ativo')
    }
    const forros = (c) => JSON.stringify(c.bonecos.map((x) => PARTES_DO_BONECO.map((p) => x.partes[p].forro)))
    assert.notEqual(forros(a), forros(b))
    // estado só traz o que é do jogador
    const idsA = new Set(a.bonecos.map((x) => x.id))
    assert.ok(b.bonecos.every((x) => !idsA.has(x.id)))
    const est = await api('GET', '/api/estado', { token: a.token })
    assert.ok(!est.texto.includes('token_hash') && !est.texto.includes(a.token))
    // nascimento no livro-razão, sem a semente na resposta
    const h = await api('GET', `/api/boneco/${a.bonecos[0].id}`, { token: a.token })
    assert.equal(h.json.historico[0].tipo, 'nasceu')
    assert.equal(h.json.historico[0].semente, undefined)
  })

  test('Aventura: fase 1 abre luta com rival do servidor; fase inexistente e robô escolhido são recusados', async () => {
    const c = await novaConta()
    const errada = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'aventura', fase: 99, time: timeDe(c) } })
    assert.equal(errada.status, 400); assert.equal(errada.json.erro.codigo, 'FASE_INVALIDA')
    const comRobo = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'aventura', fase: 1, robo: 'ganancioso', time: timeDe(c) } })
    assert.equal(comRobo.status, 400)
    const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'aventura', fase: 1, time: timeDe(c) } })
    assert.equal(r.status, 201, r.texto)
    assert.equal(r.json.modo, 'aventura'); assert.equal(r.json.fase, 1)
    const fim = await jogarAteOFim(c.token, r.json)
    assert.equal(fim.status, 'encerrada')
  })

  test('desistir encerra a luta (rival vence), libera os bonecos e solta o replay', async () => {
    const c = await novaConta()
    const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(c) } })
    const d = await api('POST', `/api/luta/${r.json.id}/desistir`, { token: c.token })
    assert.equal(d.status, 200, d.texto)
    assert.equal(d.json.status, 'encerrada')
    assert.equal(d.json.resultado.vencedor, 'B')
    const rep = await api('GET', `/api/luta/${r.json.id}/replay`, { token: c.token })
    assert.equal(rep.status, 200)
    assert.equal(rep.json.desistiu, true)
    const de2 = await api('POST', `/api/luta/${r.json.id}/desistir`, { token: c.token })
    assert.equal(de2.status, 409)
  })

  test('relógio do turno: prazo estourado passa a vez (fica no replay) e o comando atrasado é recusado', async () => {
    const c = await novaConta()
    const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(c) } })
    const turno = r.json.visao.turno
    relogio.t = r.json.prazo + 60_000 // o jogador sumiu
    const atrasado = await api('POST', `/api/luta/${r.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: { tipo: 'passar' } } })
    assert.equal(atrasado.status, 409, atrasado.texto)
    assert.ok(['TEMPO_ESGOTADO', 'LUTA_ACABOU'].includes(atrasado.json.erro.codigo))
    semSegredo(atrasado.texto, r.json.id)
    const v = await api('GET', `/api/luta/${r.json.id}`, { token: c.token })
    assert.ok(v.json.visao.turno > turno || v.json.status === 'encerrada')
    assert.equal(v.json.seq, 0, 'passe por tempo não conta como comando do jogador')
    const e = estadoInterno(r.json.id)
    assert.ok(e.comandos.some((x) => x.tipo === 'passar' && x.time === 'A'))
    if (v.json.status === 'aberta') {
      assert.ok(v.json.prazo + 1500 >= agora(), 'prazo novo ficou para trás')
      await api('POST', `/api/luta/${r.json.id}/desistir`, { token: c.token })
    }
  })

  test('costura no servidor: chances = motor, filho nasce no banco, Carretel sobe, livro-razão', async () => {
    const c = await novaConta()
    const [a, b] = [c.bonecos[0], c.bonecos[1]]
    const ch = await api('GET', `/api/costura/chances?a=${a.id}&b=${b.id}`, { token: c.token })
    assert.equal(ch.status, 200, ch.texto)
    assert.deepEqual(ch.json.chances, chancesDaCostura({ ...a, ocupado: false }, { ...b, ocupado: false }))
    assert.equal(typeof ch.json.custo, 'number')
    assert.equal(ch.json.pode.ok, true)
    const r = await api('POST', '/api/costura', { token: c.token, corpo: { a: a.id, b: b.id, pedido: 'pedido-costura-1' } })
    assert.equal(r.status, 201, r.texto)
    assert.match(r.json.filho.id, /^bo_[0-9a-f]{24}$/)
    assert.deepEqual(r.json.filho.pais, [a.id, b.id])
    assert.equal(r.json.custo, ch.json.custo)
    const est = await api('GET', '/api/estado', { token: c.token })
    assert.equal(est.json.bonecos.length, 10)
    assert.equal(est.json.bonecos.find((x) => x.id === a.id).voltasUsadas, 1)
    assert.equal(est.json.bonecos.find((x) => x.id === b.id).voltasUsadas, 1)
    const hf = await api('GET', `/api/boneco/${r.json.filho.id}`, { token: c.token })
    assert.equal(hf.json.historico[0].tipo, 'nasceu')
    assert.equal(hf.json.historico[0].origem, 'costura')
    const ha = await api('GET', `/api/boneco/${a.id}`, { token: c.token })
    assert.equal(ha.json.historico.at(-1).tipo, 'costurou')
    // pai e filho não costuram
    const pf = await api('POST', '/api/costura', { token: c.token, corpo: { a: a.id, b: r.json.filho.id, pedido: 'pedido-costura-2' } })
    assert.equal(pf.status, 409); assert.equal(pf.json.erro.codigo, 'PARENTES')
  })

  test('aposentar: cedo demais recusa; no limite aposenta e ele não luta nem costura mais', async () => {
    const c = await novaConta()
    const [x, y, z, w] = c.bonecos
    const cedo = await api('POST', `/api/boneco/${x.id}/aposentar`, { token: c.token })
    assert.equal(cedo.status, 409); assert.equal(cedo.json.erro.codigo, 'AINDA_NAO')
    app.db.prepare("UPDATE bonecos SET dados = json_set(dados, '$.pontosDeCostura', ?) WHERE id = ?").run(PARAMS_COSTURA.desgaste.limite, x.id)
    const noLimite = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', time: [x.id, y.id, z.id] } })
    assert.equal(noLimite.status, 409); assert.equal(noLimite.json.erro.codigo, 'BONECO_NAO_PODE_LUTAR')
    const ap = await api('POST', `/api/boneco/${x.id}/aposentar`, { token: c.token })
    assert.equal(ap.status, 200, ap.texto)
    assert.equal(ap.json.boneco.estado, 'aposentado')
    assert.ok(ap.json.retalhos > 0)
    const luta = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', time: [x.id, y.id, z.id] } })
    assert.equal(luta.status, 409); assert.equal(luta.json.erro.codigo, 'BONECO_APOSENTADO')
    const cos = await api('POST', '/api/costura', { token: c.token, corpo: { a: x.id, b: w.id, pedido: 'pedido-aposentado' } })
    assert.equal(cos.status, 409); assert.equal(cos.json.erro.codigo, 'APOSENTADO')
    const de2 = await api('POST', `/api/boneco/${x.id}/aposentar`, { token: c.token })
    assert.equal(de2.status, 409)
    const h = await api('GET', `/api/boneco/${x.id}`, { token: c.token })
    assert.equal(h.json.historico.at(-1).tipo, 'aposentou')
  })
})

// ---------------------------------------------------------------- ataques

describe('ataques (cada um prova a recusa)', () => {
  test('mandar resultado, vencedor, dano ou semente no corpo da luta: recusado', async () => {
    const c = await novaConta()
    for (const extra of [{ resultado: { vencedor: 'A' } }, { vencedor: 'A' }, { dano: 9999 }, { semente: 'minha' }, { timeB: ['rasgao', 'rasgao', 'rasgao'] }, { __proto__x: 1 }]) {
      const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', time: timeDe(c), ...extra } })
      assert.equal(r.status, 400, JSON.stringify(extra))
      assert.equal(r.json.erro.codigo, 'CAMPO_DESCONHECIDO')
    }
    const proto = await api('POST', '/api/luta', { token: c.token, cru: `{"modo":"livre","time":${JSON.stringify(timeDe(c))},"__proto__":{"semente":"x"}}` })
    assert.equal(proto.status, 400)
    const luta = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(c) } })
    assert.equal(luta.status, 201)
    for (const extra of [{ vencedor: 'A' }, { dano: 999 }, { semente: 'x' }, { estado: {} }]) {
      const r = await api('POST', `/api/luta/${luta.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: { tipo: 'passar' }, ...extra } })
      assert.equal(r.status, 400); assert.equal(r.json.erro.codigo, 'CAMPO_DESCONHECIDO')
      const r2 = await api('POST', `/api/luta/${luta.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: { tipo: 'jogar', carta: 'Ac0', ...extra } } })
      assert.equal(r2.status, 400)
    }
    assert.equal(linhaDaLuta(luta.json.id).seq, 0)
    await api('POST', `/api/luta/${luta.json.id}/desistir`, { token: c.token })
  })

  test('jogar carta fora da mão (do rival ou do meu baralho) e jogar fora do turno: recusado pelo motor', async () => {
    const c = await novaConta()
    const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(c) } })
    const e = estadoInterno(r.json.id)
    const doRival = e.times.B.mao[0]
    const meuForaDaMao = Object.keys(e.cartas).find((k) => k.startsWith('A') && !e.times.A.mao.includes(k))
    for (const carta of [doRival, meuForaDaMao, 'Ac99']) {
      const x = await api('POST', `/api/luta/${r.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: { tipo: 'jogar', carta } } })
      assert.equal(x.status, 422, x.texto); assert.equal(x.json.erro.codigo, 'CARTA_FORA_DA_MAO')
    }
    const fora = await api('POST', `/api/luta/${r.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: { tipo: 'passar', time: 'B' } } })
    assert.equal(fora.status, 409); assert.equal(fora.json.erro.codigo, 'FORA_DO_TURNO')
    const adiantado = await api('POST', `/api/luta/${r.json.id}/comando`, { token: c.token, corpo: { seq: 5, comando: { tipo: 'passar' } } })
    assert.equal(adiantado.status, 409); assert.equal(adiantado.json.erro.codigo, 'SEQ_INVALIDA')
    assert.equal(JSON.stringify(estadoInterno(r.json.id)), JSON.stringify(e), 'estado mudou com comando recusado')
    await api('POST', `/api/luta/${r.json.id}/desistir`, { token: c.token })
  })

  test('tipos errados no comando: recusados antes do motor', async () => {
    const c = await novaConta()
    const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(c) } })
    const ruins = [
      { seq: '0', comando: { tipo: 'passar' } }, { seq: -1, comando: { tipo: 'passar' } }, { seq: 1e308, comando: { tipo: 'passar' } },
      { seq: 0.5, comando: { tipo: 'passar' } }, { seq: 0, comando: 'passar' }, { seq: 0, comando: [] }, { seq: 0, comando: { tipo: 'roubar' } },
      { seq: 0, comando: { tipo: 'jogar', carta: 5 } }, { seq: 0, comando: { tipo: 'jogar', carta: 'Ac0', alvo: 'B9' } },
      { seq: 0, comando: { tipo: 'trocar', a: 'A0', b: { x: 1 } } }, { seq: 0 }, [], 'texto', null,
    ]
    for (const corpo of ruins) {
      const x = await api('POST', `/api/luta/${r.json.id}/comando`, { token: c.token, corpo })
      assert.equal(x.status, 400, `${JSON.stringify(corpo)} → ${x.texto}`)
    }
    assert.equal(linhaDaLuta(r.json.id).seq, 0)
    await api('POST', `/api/luta/${r.json.id}/desistir`, { token: c.token })
  })

  test('usar boneco de outra conta no time: recusado (como se não existisse)', async () => {
    const a = await novaConta(), b = await novaConta()
    const r = await api('POST', '/api/luta', { token: a.token, corpo: { modo: 'livre', time: [a.bonecos[0].id, a.bonecos[1].id, b.bonecos[0].id] } })
    assert.equal(r.status, 404); assert.equal(r.json.erro.codigo, 'BONECO_NAO_ENCONTRADO')
    const rep = await api('POST', '/api/luta', { token: a.token, corpo: { modo: 'livre', time: [a.bonecos[0].id, a.bonecos[0].id, a.bonecos[1].id] } })
    assert.equal(rep.status, 400)
    const outro = await api('GET', `/api/boneco/${b.bonecos[0].id}`, { token: a.token })
    assert.equal(outro.status, 404)
    const ap = await api('POST', `/api/boneco/${b.bonecos[0].id}/aposentar`, { token: a.token })
    assert.equal(ap.status, 404)
    assert.equal(app.db.prepare('SELECT COUNT(*) n FROM lutas WHERE conta_id = ?').get(a.conta.id).n, 0)
  })

  test('duas lutas abertas: a segunda é recusada; em corrida só uma abre', async () => {
    const c = await novaConta()
    const corrida = await Promise.all([0, 3, 6].map((i) => api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(c, i) } })))
    assert.deepEqual(corrida.map((x) => x.status).sort(), [201, 409, 409])
    assert.ok(corrida.filter((x) => x.status === 409).every((x) => x.json.erro.codigo === 'LUTA_ABERTA'))
    assert.equal(app.db.prepare("SELECT COUNT(*) n FROM lutas WHERE conta_id = ? AND status = 'aberta'").get(c.conta.id).n, 1)
    const est = await api('GET', '/api/estado', { token: c.token })
    assert.equal(est.json.bonecos.filter((b) => b.ocupado).length, 3)
    const aberta = corrida.find((x) => x.status === 201).json
    await api('POST', `/api/luta/${aberta.id}/desistir`, { token: c.token })
  })

  test('boneco ocupado numa luta não costura', async () => {
    const c = await novaConta()
    const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(c) } })
    const x = await api('POST', '/api/costura', { token: c.token, corpo: { a: c.bonecos[0].id, b: c.bonecos[5].id, pedido: 'pedido-ocupado' } })
    assert.equal(x.status, 409); assert.equal(x.json.erro.codigo, 'OCUPADO')
    await api('POST', `/api/luta/${r.json.id}/desistir`, { token: c.token })
  })

  test('repetir o mesmo comando (replay de requisição) não aplica duas vezes; seq já usada com outro comando é recusada', async () => {
    const c = await novaConta()
    const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(c) } })
    const cmd = r.json.validos.find((x) => x.tipo === 'jogar') ?? { tipo: 'passar' }
    const um = await api('POST', `/api/luta/${r.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: cmd } })
    assert.equal(um.status, 200, um.texto)
    const nA = estadoInterno(r.json.id).comandos.filter((x) => x.time === 'A').length
    const dois = await api('POST', `/api/luta/${r.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: cmd } })
    assert.equal(dois.status, 200)
    assert.equal(dois.json.repetido, true)
    assert.equal(dois.json.seq, um.json.seq)
    assert.deepEqual(dois.json.visao, um.json.visao)
    assert.equal(estadoInterno(r.json.id).comandos.filter((x) => x.time === 'A').length, nA)
    assert.equal(linhaDaLuta(r.json.id).seq, 1)
    const outro = await api('POST', `/api/luta/${r.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: { tipo: 'passar' } } })
    if (cmd.tipo !== 'passar') { assert.equal(outro.status, 409); assert.equal(outro.json.erro.codigo, 'SEQ_JA_USADA') }
    await api('POST', `/api/luta/${r.json.id}/desistir`, { token: c.token })
  })

  test('20 pedidos simultâneos do mesmo comando: aplica uma vez só', async () => {
    const c = await novaConta()
    const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(c) } })
    const antes = estadoInterno(r.json.id).comandos.length
    const cmd = r.json.validos.find((x) => x.tipo === 'jogar') ?? { tipo: 'passar' }
    const todos = await Promise.all(Array.from({ length: 20 }, () => api('POST', `/api/luta/${r.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: cmd } })))
    assert.ok(todos.every((x) => x.status === 200), todos.map((x) => x.status).join(','))
    assert.equal(todos.filter((x) => !x.json.repetido).length, 1)
    assert.equal(linhaDaLuta(r.json.id).seq, 1)
    const e = estadoInterno(r.json.id)
    assert.equal(e.comandos.slice(antes).filter((x) => x.time === 'A' && x.tipo === cmd.tipo).length, 1)
    assert.equal(app.db.prepare('SELECT COUNT(*) n FROM luta_respostas WHERE luta_id = ?').get(r.json.id).n, 1)
    await api('POST', `/api/luta/${r.json.id}/desistir`, { token: c.token })
  })

  test('ler luta, mandar comando ou pedir replay de outra conta: 404', async () => {
    const a = await novaConta(), b = await novaConta()
    const r = await api('POST', '/api/luta', { token: a.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(a) } })
    for (const [m, p, corpo] of [['GET', `/api/luta/${r.json.id}`], ['GET', `/api/luta/${r.json.id}/replay`], ['POST', `/api/luta/${r.json.id}/comando`, { seq: 0, comando: { tipo: 'passar' } }], ['POST', `/api/luta/${r.json.id}/desistir`]]) {
      const x = await api(m, p, { token: b.token, corpo })
      assert.equal(x.status, 404, `${m} ${p}`)
      assert.ok(!x.texto.includes(linhaDaLuta(r.json.id).semente))
    }
    await api('POST', `/api/luta/${r.json.id}/desistir`, { token: a.token })
    const rep = await api('GET', `/api/luta/${r.json.id}/replay`, { token: b.token })
    assert.equal(rep.status, 404)
  })

  test('replay de luta aberta: recusado, sem vazar a semente', async () => {
    const c = await novaConta()
    const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(c) } })
    const rep = await api('GET', `/api/luta/${r.json.id}/replay`, { token: c.token })
    assert.equal(rep.status, 409); assert.equal(rep.json.erro.codigo, 'LUTA_ABERTA')
    semSegredo(rep.texto, r.json.id)
    const ver = await api('GET', `/api/luta/${r.json.id}`, { token: c.token })
    assert.equal(ver.status, 200)
    semSegredo(ver.texto, r.json.id)
    await api('POST', `/api/luta/${r.json.id}/desistir`, { token: c.token })
  })

  test('costurar boneco alheio: 404; chances de boneco alheio: 404', async () => {
    const a = await novaConta(), b = await novaConta()
    const x = await api('POST', '/api/costura', { token: a.token, corpo: { a: a.bonecos[0].id, b: b.bonecos[0].id, pedido: 'pedido-alheio' } })
    assert.equal(x.status, 404)
    const ch = await api('GET', `/api/costura/chances?a=${a.bonecos[0].id}&b=${b.bonecos[0].id}`, { token: a.token })
    assert.equal(ch.status, 404)
    const ruim = await api('GET', `/api/costura/chances?a=${a.bonecos[0].id}&b=${a.bonecos[1].id}&semente=1`, { token: a.token })
    assert.equal(ruim.status, 400)
    assert.equal(app.db.prepare('SELECT COUNT(*) n FROM bonecos WHERE conta_id = ?').get(a.conta.id).n, 9)
  })

  test('costurar o mesmo par em corrida (mesmo pedido): só um filho nasce, Carretel sobe uma vez', async () => {
    const c = await novaConta()
    const [a, b] = c.bonecos
    const corpo = { a: a.id, b: b.id, pedido: 'pedido-corrida-1' }
    const todos = await Promise.all(Array.from({ length: 10 }, () => api('POST', '/api/costura', { token: c.token, corpo })))
    assert.ok(todos.every((x) => x.status === 201 || x.status === 200), todos.map((x) => x.status).join(','))
    assert.equal(new Set(todos.map((x) => x.json.filho.id)).size, 1)
    assert.equal(app.db.prepare('SELECT COUNT(*) n FROM bonecos WHERE conta_id = ?').get(c.conta.id).n, 10)
    const est = await api('GET', '/api/estado', { token: c.token })
    assert.equal(est.json.bonecos.find((x) => x.id === a.id).voltasUsadas, 1)
    assert.equal(est.json.bonecos.find((x) => x.id === b.id).voltasUsadas, 1)
    const outro = await api('POST', '/api/costura', { token: c.token, corpo: { a: a.id, b: c.bonecos[2].id, pedido: 'pedido-corrida-1' } })
    assert.equal(outro.status, 409); assert.equal(outro.json.erro.codigo, 'PEDIDO_JA_USADO')
  })

  test('Carretel na última volta: 5 costuras diferentes em corrida → só uma passa', async () => {
    const c = await novaConta()
    const [a, ...resto] = c.bonecos
    app.db.prepare("UPDATE bonecos SET dados = json_set(dados, '$.voltasUsadas', ?) WHERE id = ?").run(PARAMS_COSTURA.carretelVoltas - 1, a.id)
    const todos = await Promise.all(resto.slice(0, 5).map((b, i) => api('POST', '/api/costura', { token: c.token, corpo: { a: a.id, b: b.id, pedido: `pedido-carretel-${i}` } })))
    assert.equal(todos.filter((x) => x.status === 201).length, 1, todos.map((x) => x.status).join(','))
    assert.ok(todos.filter((x) => x.status !== 201).every((x) => x.json.erro.codigo === 'CARRETEL_CHEIO'))
    assert.equal(app.db.prepare('SELECT COUNT(*) n FROM bonecos WHERE conta_id = ?').get(c.conta.id).n, 10)
  })

  test('corpo gigante (413), JSON inválido (400), tipo de conteúdo errado (415), GET com corpo (400)', async () => {
    const c = await novaConta()
    const gigante = await api('POST', '/api/conta', { cru: JSON.stringify({ apelido: 'x'.repeat(200_000) }) })
    assert.equal(gigante.status, 413); assert.equal(gigante.json.erro.codigo, 'CORPO_GRANDE')
    const quebrado = await api('POST', '/api/luta', { token: c.token, cru: '{"modo":"livre",' })
    assert.equal(quebrado.status, 400); assert.equal(quebrado.json.erro.codigo, 'JSON_INVALIDO')
    const texto = await api('POST', '/api/luta', { token: c.token, cru: JSON.stringify({ modo: 'livre', time: timeDe(c) }), tipo: 'text/plain' })
    assert.equal(texto.status, 415)
    for (const apelido of ['', 'ab', 'x'.repeat(21), '<script>', 5, null]) {
      const r = await api('POST', '/api/conta', { corpo: { apelido } })
      assert.equal(r.status, 400, String(apelido))
    }
    assert.equal(app.db.prepare("SELECT COUNT(*) n FROM lutas WHERE conta_id = ?").get(c.conta.id).n, 0)
  })

  test('sem token, token errado, token fora do formato: 401', async () => {
    for (const cab of [{}, { Authorization: `Bearer ${randomBytes(32).toString('base64url')}` }, { Authorization: 'Bearer abc' }, { Authorization: 'Basic eDp5' }]) {
      for (const [m, p] of [['GET', '/api/estado'], ['POST', '/api/luta'], ['GET', '/api/costura/chances?a=1&b=2']]) {
        const r = await api(m, p, { cabecalhos: cab, corpo: m === 'POST' ? { modo: 'livre', time: [] } : undefined })
        assert.equal(r.status, 401, `${m} ${p} ${JSON.stringify(cab)}`)
        assert.equal(r.json.erro.codigo, 'SEM_SESSAO')
      }
    }
  })

  test('cabeçalhos de segurança, sem CORS, rota e método desconhecidos', async () => {
    const r = await api('GET', '/api/estado', { cabecalhos: { Origin: 'https://malvado.example' } })
    assert.match(r.headers.get('content-security-policy'), /default-src 'self'/)
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(r.headers.get('x-frame-options'), 'DENY')
    assert.equal(r.headers.get('access-control-allow-origin'), null)
    const pagina = await api('GET', '/')
    assert.equal(pagina.status, 200)
    assert.match(pagina.headers.get('content-security-policy'), /default-src 'self'/)
    const motor = await api('GET', '/shared/batalha.js')
    assert.equal(motor.status, 200)
    for (const p of ['/../package.json', '/shared/../server/db.mjs', '/%2e%2e/package.json']) assert.equal((await api('GET', p)).status, 404, p)
    assert.equal((await api('OPTIONS', '/api/estado')).status, 405)
    assert.equal((await api('DELETE', '/api/estado')).status, 405)
    assert.equal((await api('GET', '/api/nada')).status, 404)
  })

  test('log não leva token', async () => {
    const c = await novaConta()
    await api('GET', '/api/estado', { token: c.token })
    assert.ok(logs.length > 0)
    assert.ok(logs.every((l) => !l.includes(c.token)))
  })
})

// ---------------------------------------------------------------- limites, erro interno, banco

describe('limites e erros', () => {
  test('limite de criação de conta por IP e de pedidos por conta', async () => {
    let t = 1_000
    const s = await iniciar({ dbPath: ':memory:', porta: 0, agora: () => t, log: () => {}, limites: { contasPorIp: { max: 2, janelaMs: 60_000 }, pedidosPorConta: { max: 3, janelaMs: 60_000 } } })
    const url = `http://127.0.0.1:${s.porta}`
    // regra mudou (tarefa 13, A10): apelido é único — cada conta pede um apelido diferente
    let k = 0
    const criar = () => fetch(url + '/api/conta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apelido: `Teste ${++k}` }) })
    const r1 = await criar(), r2 = await criar(), r3 = await criar()
    assert.deepEqual([r1.status, r2.status, r3.status], [201, 201, 429])
    const { token } = await r1.json()
    const st = []
    for (let i = 0; i < 4; i++) st.push((await fetch(url + '/api/estado', { headers: { Authorization: `Bearer ${token}` } })).status)
    assert.deepEqual(st, [200, 200, 200, 429])
    t += 61_000
    assert.equal((await criar()).status, 201)
    assert.equal((await fetch(url + '/api/estado', { headers: { Authorization: `Bearer ${token}` } })).status, 200)
    s.servidor.closeAllConnections(); s.servidor.close()
  })

  test('IPv6 conta pelo /64; IPv4 mapeado vira IPv4', () => {
    assert.equal(chaveDoIp('2001:db8:1:2:aaaa::1'), chaveDoIp('2001:db8:1:2:bbbb::9'))
    assert.notEqual(chaveDoIp('2001:db8:1:2::1'), chaveDoIp('2001:db8:1:3::1'))
    assert.equal(chaveDoIp('::ffff:10.0.0.1'), '10.0.0.1')
    assert.equal(chaveDoIp('::1'), '0:0:0:0::/64')
  })

  test('erro interno não vaza pilha nem mensagem', async () => {
    const segredo = 'caminho/secreto/do/servidor.mjs:42'
    const jogo = { contaPorToken: () => ({ id: 1 }), estado: () => { throw new Error(segredo) } }
    const tratar = criarTratador({ jogo, log: () => {} })
    const s = createServer(tratar)
    await new Promise((ok) => s.listen(0, '127.0.0.1', ok))
    const r = await fetch(`http://127.0.0.1:${s.address().port}/api/estado`, { headers: { Authorization: `Bearer ${'a'.repeat(43)}` } })
    const t = await r.text()
    assert.equal(r.status, 500)
    assert.ok(!t.includes(segredo) && !t.includes('at ') && !t.includes('Error'))
    assert.ok(ErroDoJogo)
    s.closeAllConnections(); s.close()
  })
})

describe('banco', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'frayz-banco-'))

  test('banco usado: reabre com os dados, mesma versão, sem migrar de novo', async () => {
    const arq = path.join(pasta, 'usado.db')
    const s1 = await iniciar({ dbPath: arq, porta: 0, log: () => {} })
    const r = await fetch(`http://127.0.0.1:${s1.porta}/api/conta`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"apelido":"Antigo"}' })
    const { token } = await r.json()
    s1.servidor.closeAllConnections(); await new Promise((ok) => s1.servidor.close(ok))
    const s2 = await iniciar({ dbPath: arq, porta: 0, log: () => {} })
    assert.equal(s2.db.prepare('PRAGMA user_version').get().user_version, VERSAO_DO_BANCO)
    const e = await fetch(`http://127.0.0.1:${s2.porta}/api/estado`, { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(e.status, 200)
    assert.equal((await e.json()).bonecos.length, 9)
    assert.equal(fs.existsSync(path.join(pasta, 'copias')), false, 'copiou sem migração pendente')
    s2.servidor.closeAllConnections(); await new Promise((ok) => s2.servidor.close(ok))
  })

  test('migração pendente num banco com dados: copia antes; banco de outro modo: recusa', () => {
    const arq = path.join(pasta, 'migra.db')
    abrirBanco(arq).close()
    const extra = 'CREATE TABLE teste_extra (x INTEGER);'
    const db = abrirBanco(arq, { migracoes: [...MIGRACOES, extra], agora: () => 123 })
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, VERSAO_DO_BANCO + 1)
    db.close()
    const copias = fs.readdirSync(path.join(pasta, 'copias'))
    // regra mudou (tarefa 13): o banco atual é a versão VERSAO_DO_BANCO (era 1), e a cópia leva a versão de antes da migração
    assert.ok(copias.some((n) => n.startsWith(`migra.db.v${VERSAO_DO_BANCO}.123`)), copias.join(','))
    assert.throws(() => abrirBanco(arq, { modo: 'producao', migracoes: [...MIGRACOES, extra] }), /modo/)
    assert.throws(() => abrirBanco(arq), /mais novo/)
  })
})

// ---------------------------------------------------------------- tarefa 13: servidor rodada 2 (parecer de segurança nº 1)

/** Põe bonecos a mais na coleção direto no banco (cópias dos dados de um boneco da conta). */
function encherColecao(contaId, vivos, aposentados) {
  const modelo = app.db.prepare('SELECT dados FROM bonecos WHERE conta_id = ? ORDER BY n LIMIT 1').get(contaId).dados
  const ins = app.db.prepare(`INSERT INTO bonecos (id, conta_id, dados, estado, ocupado_por, versao, criado_em, n)
    VALUES (?, ?, ?, ?, NULL, 0, ?, (SELECT COALESCE(MAX(n), 0) + 1 FROM bonecos WHERE conta_id = ?))`)
  for (let i = 0; i < vivos + aposentados; i++) ins.run(`bo_${randomBytes(12).toString('hex')}`, contaId, modelo, i < vivos ? 'ativo' : 'aposentado', agora(), contaId)
}

describe('tarefa 13 — coleção, luta e Aventura', () => {
  test('A3: coleção no teto (60 vivos + 300 aposentados): estado em tamanho limitado, resto pelo cursor, costura recusada', async () => {
    const c = await novaConta()
    encherColecao(c.conta.id, 60 - 9, 300)
    const est = await api('GET', '/api/estado', { token: c.token })
    assert.equal(est.status, 200)
    assert.equal(est.json.bonecos.length, 50, 'estado devolveu a coleção inteira')
    assert.ok(est.texto.length < 40 * 1024, `estado com ${est.texto.length} bytes`)
    assert.deepEqual(est.json.colecao, { total: 360, vivos: 60, aposentados: 300, maxVivos: 60 })
    assert.equal(typeof est.json.proximo, 'string')
    // páginas pelo cursor: ordem estável, sem repetir nem faltar
    const ids = est.json.bonecos.map((b) => b.id)
    let cursor = est.json.proximo, paginas = 1
    while (cursor) {
      const p = await api('GET', `/api/bonecos?cursor=${cursor}&limite=50`, { token: c.token })
      assert.equal(p.status, 200, p.texto)
      assert.ok(p.json.bonecos.length <= 50)
      ids.push(...p.json.bonecos.map((b) => b.id))
      cursor = p.json.proximo
      assert.ok(++paginas < 20)
    }
    assert.equal(ids.length, 360); assert.equal(new Set(ids).size, 360)
    const ordem = app.db.prepare('SELECT id FROM bonecos WHERE conta_id = ? ORDER BY n').all(c.conta.id).map((x) => x.id)
    assert.deepEqual(ids, ordem)
    const primeira = await api('GET', '/api/bonecos?limite=5', { token: c.token })
    assert.deepEqual(primeira.json.bonecos.map((b) => b.id), ordem.slice(0, 5))
    for (const q of ['limite=51', 'limite=0', 'limite=abc', 'cursor=%25%25', `cursor=${Buffer.from('x:1').toString('base64url')}`, 'outra=1']) {
      const r = await api('GET', `/api/bonecos?${q}`, { token: c.token })
      assert.equal(r.status, 400, q)
    }
    // a página de outra conta não vem pelo cursor
    const d = await novaConta()
    const alheia = await api('GET', `/api/bonecos?cursor=${est.json.proximo}`, { token: d.token })
    assert.equal(alheia.json.bonecos.length, 0)
    // costura no teto: 409 COLECAO_CHEIA, nada nasce
    const [a, b] = c.bonecos
    const cheia = await api('POST', '/api/costura', { token: c.token, corpo: { a: a.id, b: b.id, pedido: 'pedido-teto-1' } })
    assert.equal(cheia.status, 409, cheia.texto); assert.equal(cheia.json.erro.codigo, 'COLECAO_CHEIA')
    assert.equal(app.db.prepare('SELECT COUNT(*) n FROM bonecos WHERE conta_id = ?').get(c.conta.id).n, 360)
    // aposentado não conta: com um vivo a menos, a costura passa
    app.db.prepare("UPDATE bonecos SET estado = 'aposentado' WHERE id = ?").run(ordem.at(-301))
    const passa = await api('POST', '/api/costura', { token: c.token, corpo: { a: a.id, b: b.id, pedido: 'pedido-teto-2' } })
    assert.equal(passa.status, 201, passa.texto)
  })

  test('A4: luta inteira grava menos de 2 KB por comando; encerrada, não sobra resposta guardada; repetir o último comando dá a mesma resposta', async () => {
    const c = await novaConta()
    const nova = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'planejador', time: timeDe(c) } })
    let r = nova.json, turno = r.visao.turno, noTurno = 0
    const tamanhos = []
    const tamanho = app.db.prepare('SELECT LENGTH(luta_id) + 8 + LENGTH(comando) + LENGTH(resposta) b FROM luta_respostas WHERE luta_id = ? AND seq = ?')
    let ultima = null, ultimoCorpo = null
    while (r.status === 'aberta') {
      assert.ok(tamanhos.length < 500)
      if (r.visao.turno !== turno) { turno = r.visao.turno; noTurno = 0 }
      const jogar = r.validos.find((x) => x.tipo === 'jogar') ?? r.validos.find((x) => x.tipo === 'fiapo')
      const comando = noTurno++ < 6 && jogar ? jogar : { tipo: 'passar' }
      const corpo = { seq: r.seq, comando }
      const res = await api('POST', `/api/luta/${r.id}/comando`, { token: c.token, corpo })
      assert.equal(res.status, 200, res.texto)
      const linha = tamanho.get(r.id, r.seq)
      if (res.json.status === 'aberta') {
        tamanhos.push(linha.b)
        // repetir o último comando de uma luta aberta: a mesma resposta, com repetido
        if (tamanhos.length % 7 === 0) {
          const de2 = await api('POST', `/api/luta/${r.id}/comando`, { token: c.token, corpo })
          assert.equal(de2.status, 200)
          assert.equal(de2.json.repetido, true)
          assert.deepEqual({ ...de2.json, repetido: undefined }, { ...res.json, repetido: undefined })
        }
      }
      ultima = res.json; ultimoCorpo = corpo
      r = res.json
    }
    const media = tamanhos.reduce((x, y) => x + y, 0) / tamanhos.length
    assert.ok(tamanhos.length > 5)
    assert.ok(media < 2048, `média de ${media.toFixed(0)} bytes por comando`)
    assert.equal(app.db.prepare('SELECT COUNT(*) n FROM luta_respostas WHERE luta_id = ?').get(r.id).n, 0, 'sobrou resposta guardada')
    // o replay fica inteiro
    const rep = await api('GET', `/api/luta/${r.id}/replay`, { token: c.token })
    assert.deepEqual(reproduzir(rep.json).resultado, rep.json.resultado)
    // repetir o comando que encerrou: devolve o fim; outro seq antigo: 409 LUTA_ACABOU
    const fimDe2 = await api('POST', `/api/luta/${r.id}/comando`, { token: c.token, corpo: ultimoCorpo })
    assert.equal(fimDe2.status, 200, fimDe2.texto)
    assert.equal(fimDe2.json.repetido, true)
    assert.deepEqual({ ...fimDe2.json, repetido: undefined }, { ...ultima, repetido: undefined })
    const velho = await api('POST', `/api/luta/${r.id}/comando`, { token: c.token, corpo: { seq: 0, comando: { tipo: 'passar' } } })
    assert.equal(velho.status, 409)
  })

  test('A7: conta nova não abre a fase 2; vencer a fase 1 libera a 2 (e só ela); perder não libera', async () => {
    const c = await novaConta()
    const est = await api('GET', '/api/estado', { token: c.token })
    assert.equal(est.json.faseLiberada, 1)
    const f2 = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'aventura', fase: 2, time: timeDe(c) } })
    assert.equal(f2.status, 409, f2.texto); assert.equal(f2.json.erro.codigo, 'FASE_BLOQUEADA')
    const f5 = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'aventura', fase: 5, time: timeDe(c) } })
    assert.equal(f5.json.erro.codigo, 'FASE_BLOQUEADA')
    // perder (desistir) a fase 1 não libera nada
    const perde = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'aventura', fase: 1, time: timeDe(c) } })
    await api('POST', `/api/luta/${perde.json.id}/desistir`, { token: c.token })
    assert.equal((await api('GET', '/api/estado', { token: c.token })).json.faseLiberada, 1)
    // vencer a fase 1: banco de teste deixa o rival com 1 de vida; cliente honesto joga até o fim
    let venceu = false
    for (let i = 0; i < 6 && !venceu; i++) {
      const l = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'aventura', fase: 1, time: timeDe(c, 3 * (i % 3)) } })
      assert.equal(l.status, 201, l.texto)
      app.db.prepare("UPDATE lutas SET estado = json_set(estado, '$.bonecos.B0.vida', 1, '$.bonecos.B1.vida', 1, '$.bonecos.B2.vida', 1) WHERE id = ?").run(l.json.id)
      const ver = await api('GET', `/api/luta/${l.json.id}`, { token: c.token })
      const fim = await jogarAteOFim(c.token, ver.json)
      venceu = fim.resultado.vencedor === 'A'
    }
    assert.ok(venceu, 'não venceu a fase 1')
    assert.equal((await api('GET', '/api/estado', { token: c.token })).json.faseLiberada, 2)
    const abre2 = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'aventura', fase: 2, time: timeDe(c) } })
    assert.equal(abre2.status, 201, abre2.texto)
    await api('POST', `/api/luta/${abre2.json.id}/desistir`, { token: c.token })
    const f3 = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'aventura', fase: 3, time: timeDe(c) } })
    assert.equal(f3.json.erro.codigo, 'FASE_BLOQUEADA')
  })

  test('motor 2: replay devolve a versão com que a luta nasceu; o comando 41 do turno volta 422 TETO_DE_COMANDOS', async () => {
    const c = await novaConta()
    const l = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', robo: 'ganancioso', time: timeDe(c) } })
    assert.equal(linhaDaLuta(l.json.id).versao_motor, 2)
    // 40 comandos já feitos neste turno (banco de teste): o 41º é recusado pela rota com o código do motor
    app.db.prepare("UPDATE lutas SET estado = json_set(estado, '$.comandosNoTurno', 40) WHERE id = ?").run(l.json.id)
    const carta = estadoInterno(l.json.id).times.A.mao[0]
    const x = await api('POST', `/api/luta/${l.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: { tipo: 'jogar', carta } } })
    assert.equal(x.status, 422, x.texto); assert.equal(x.json.erro.codigo, 'TETO_DE_COMANDOS')
    const v = await api('GET', `/api/luta/${l.json.id}`, { token: c.token })
    assert.deepEqual(v.json.validos, [{ tipo: 'passar', time: 'A' }])
    const passa = await api('POST', `/api/luta/${l.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: { tipo: 'passar' } } })
    assert.equal(passa.status, 200, passa.texto)
    await api('POST', `/api/luta/${l.json.id}/desistir`, { token: c.token })
    const rep = await api('GET', `/api/luta/${l.json.id}/replay`, { token: c.token })
    assert.equal(rep.json.versaoDoMotor, 2)
    app.db.prepare('UPDATE lutas SET versao_motor = 1 WHERE id = ?').run(l.json.id) // luta "de antes": o replay diz a versão dela
    const rep1 = await api('GET', `/api/luta/${l.json.id}/replay`, { token: c.token })
    assert.equal(rep1.json.versaoDoMotor, 1)
  })
})

describe('tarefa 13 — luta parada (abandono), relógio próprio', () => {
  let s, url, t = 2_000_000_000_000
  before(async () => {
    s = await iniciar({ dbPath: ':memory:', porta: 0, agora: () => t, log: () => {} })
    url = `http://127.0.0.1:${s.porta}`
  })
  after(() => { s.servidor.closeAllConnections(); s.servidor.close() })
  const pedir = async (metodo, caminho, token, corpo) => {
    const r = await fetch(url + caminho, { method: metodo, headers: { Authorization: `Bearer ${token}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined })
    return { status: r.status, json: await r.json() }
  }
  let n = 0
  async function conta() {
    const r = await fetch(url + '/api/conta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apelido: `Parado ${++n}` }) })
    const { token, conta: c } = await r.json()
    return { token, id: c.id, bonecos: (await pedir('GET', '/api/estado', token)).json.bonecos.map((b) => b.id) }
  }

  test('31 min sem pedido do dono: o próximo pedido de QUALQUER rota encerra como derrota por abandono (com desgaste)', async () => {
    const c = await conta()
    const l = await pedir('POST', '/api/luta', c.token, { modo: 'livre', robo: 'ganancioso', time: c.bonecos.slice(0, 3) })
    assert.equal(l.status, 201)
    t += 31 * 60_000
    const est = await pedir('GET', '/api/estado', c.token)
    assert.equal(est.json.lutaAberta, null, 'a luta parada continuou aberta')
    const v = await pedir('GET', `/api/luta/${l.json.id}`, c.token)
    assert.equal(v.json.status, 'encerrada')
    assert.equal(v.json.resultado.vencedor, 'B'); assert.equal(v.json.resultado.motivo, 'abandono')
    for (const id of c.bonecos.slice(0, 3)) {
      const b = est.json.bonecos.find((x) => x.id === id)
      assert.equal(b.ocupado, false); assert.equal(b.lutas, 1)
    }
  })

  test('abrir outra luta depois de 31 min parada: a velha vira abandono e a nova abre', async () => {
    const c = await conta()
    const l = await pedir('POST', '/api/luta', c.token, { modo: 'livre', robo: 'ganancioso', time: c.bonecos.slice(0, 3) })
    t += 31 * 60_000
    const outra = await pedir('POST', '/api/luta', c.token, { modo: 'livre', robo: 'ganancioso', time: c.bonecos.slice(3, 6) })
    assert.equal(outra.status, 201, JSON.stringify(outra.json))
    const velha = s.db.prepare('SELECT status, resultado FROM lutas WHERE id = ?').get(l.json.id)
    assert.equal(velha.status, 'encerrada'); assert.equal(JSON.parse(velha.resultado).motivo, 'abandono')
  })

  test('pedido do dono na luta renova a contagem; 29 min não é abandono, 31 min é', async () => {
    const c = await conta()
    const l = await pedir('POST', '/api/luta', c.token, { modo: 'livre', robo: 'ganancioso', time: c.bonecos.slice(0, 3) })
    t += 5_000
    await pedir('GET', `/api/luta/${l.json.id}`, c.token)
    assert.equal(s.db.prepare('SELECT tocada_em FROM lutas WHERE id = ?').get(l.json.id).tocada_em, t)
    s.db.prepare('UPDATE lutas SET tocada_em = ? WHERE id = ?').run(t - 29 * 60_000, l.json.id)
    assert.equal((await pedir('GET', '/api/estado', c.token)).json.lutaAberta, l.json.id)
    s.db.prepare('UPDATE lutas SET tocada_em = ? WHERE id = ?').run(t - 31 * 60_000, l.json.id)
    assert.equal((await pedir('GET', '/api/estado', c.token)).json.lutaAberta, null)
  })
})

// ---------------------------------------------------------------- parecer de segurança nº 2 (rodada 2 do servidor)

describe('parecer nº 2 — S2-2: luta encerrada guarda só o replay; teto de lutas guardadas por conta', () => {
  test('luta encerrada: o banco cresce pouco por luta (só comandos), e ler a luta depois do fim mostra o mesmo de quando acabou', async () => {
    const c = await novaConta()
    // tamanho do banco compactado (VACUUM: sem páginas livres), para medir só o que fica guardado
    const tamanho = () => { app.db.exec('VACUUM'); return app.db.prepare('PRAGMA page_count').get().page_count * app.db.prepare('PRAGMA page_size').get().page_size }
    const fins = []
    // aquece (páginas novas das tabelas) antes de medir
    for (let i = 0; i < 2; i++) {
      const l = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', time: timeDe(c), robo: 'planejador' } })
      fins.push(await jogarAteOFim(c.token, l.json))
    }
    const antes = tamanho(), n = 12
    for (let i = 0; i < n; i++) {
      const l = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', time: timeDe(c, 3 * (i % 3)), robo: i % 2 ? 'planejador' : 'ganancioso' } })
      assert.equal(l.status, 201, l.texto)
      fins.push(await jogarAteOFim(c.token, l.json))
    }
    const kbPorLuta = (tamanho() - antes) / n / 1024
    const estadoMedio = app.db.prepare("SELECT AVG(LENGTH(estado)) m FROM lutas WHERE conta_id = ? AND status = 'encerrada'").get(c.conta.id).m
    console.log(`S2-2: ${kbPorLuta.toFixed(2)} KB de banco por luta encerrada; estado guardado ${(estadoMedio / 1024).toFixed(2)} KB`)
    assert.ok(estadoMedio < 1024, `estado guardado da luta encerrada: ${estadoMedio} bytes`)
    assert.ok(kbPorLuta < 3.5, `${kbPorLuta.toFixed(2)} KB por luta`)
    // a luta refeita pelo motor é a mesma de quando acabou: mesma visão, mesmos eventos, mesmo resultado
    for (const fim of fins) {
      const v = await api('GET', `/api/luta/${fim.id}`, { token: c.token })
      assert.equal(v.status, 200, v.texto)
      assert.deepEqual(v.json.visao, fim.visao)
      assert.deepEqual(v.json.resultado, fim.resultado)
      const rep = await api('GET', `/api/luta/${fim.id}/replay`, { token: c.token })
      assert.deepEqual(reproduzir(rep.json).resultado, fim.resultado)
    }
  })

  test('desistência: ler a luta encerrada depois mostra o mesmo fim (o fim que não é comando volta do resultado)', async () => {
    const c = await novaConta()
    const l = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', time: timeDe(c), robo: 'planejador' } })
    const p = await api('POST', `/api/luta/${l.json.id}/comando`, { token: c.token, corpo: { seq: 0, comando: { tipo: 'passar' } } })
    assert.equal(p.status, 200, p.texto)
    const d = await api('POST', `/api/luta/${l.json.id}/desistir`, { token: c.token })
    assert.equal(d.status, 200, d.texto)
    const v = await api('GET', `/api/luta/${l.json.id}`, { token: c.token })
    assert.deepEqual(v.json.visao, d.json.visao)
    assert.equal(v.json.resultado.motivo, 'desistiu')
    assert.equal(JSON.parse(linhaDaLuta(l.json.id).estado).times, undefined, 'luta encerrada ainda guarda o estado inteiro')
  })

  test('teto de lutas encerradas por conta: as mais antigas saem do banco (replay 404); as últimas ficam', async () => {
    let t = 2_100_000_000_000
    const s = await iniciar({ dbPath: ':memory:', porta: 0, agora: () => t, log: () => {}, limites: { lutasEncerradasPorConta: 3 } })
    try {
      const u = `http://127.0.0.1:${s.porta}`
      const pedir = async (m, p, token, corpo) => {
        const r = await fetch(u + p, { method: m, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo ? { 'Content-Type': 'application/json' } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined })
        return { status: r.status, json: await r.json() }
      }
      const { token } = (await pedir('POST', '/api/conta', null, { apelido: 'Guardador' })).json
      const time = (await pedir('GET', '/api/estado', token)).json.bonecos.slice(0, 3).map((b) => b.id)
      const ids = []
      for (let i = 0; i < 5; i++) {
        t += 1000
        const l = await pedir('POST', '/api/luta', token, { modo: 'livre', robo: 'ganancioso', time })
        assert.equal(l.status, 201, JSON.stringify(l.json))
        assert.equal((await pedir('POST', `/api/luta/${l.json.id}/desistir`, token)).status, 200)
        ids.push(l.json.id)
      }
      assert.equal(s.db.prepare("SELECT COUNT(*) n FROM lutas WHERE status = 'encerrada'").get().n, 3)
      for (const id of ids.slice(0, 2)) assert.equal((await pedir('GET', `/api/luta/${id}/replay`, token)).status, 404)
      for (const id of ids.slice(2)) assert.equal((await pedir('GET', `/api/luta/${id}/replay`, token)).status, 200)
    } finally { s.servidor.closeAllConnections(); s.servidor.close() }
  })
})

describe('rodada 1 — URL ilegível', () => {
  test('GET http://[ : 400 sem linha de ERRO no log', async () => {
    const net = await import('node:net')
    const antes = logs.length
    const resposta = await new Promise((ok, falha) => {
      const so = net.connect(app.porta, '127.0.0.1', () => so.write('GET http://[ HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n'))
      let dados = ''
      so.on('data', (d) => { dados += d })
      so.on('end', () => ok(dados))
      so.on('error', falha)
    })
    assert.match(resposta, /^HTTP\/1\.1 400/)
    assert.ok(!logs.slice(antes).some((l) => l.startsWith('ERRO')), logs.slice(antes).join('\n'))
  })
})
