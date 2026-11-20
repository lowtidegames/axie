// Tarefa R14 — servidor do Keepmile (jogo de reino): rotas /api/reino/..., idempotência por seq, corrida, energia de
// ranking, partida refeita pelo servidor, estrada do dia, ranking e ligas, fecho de temporada, álbum e conquistas,
// replay, chaves de emergência, migração v4 → v5 com banco usado e WAL que não cresce.
// Rodar: node --test tests/servidor/reino-api.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ALBUM, BETA, CARTAS, PARTIDA } from '../../shared/reino/config.js'
import { reproduzir } from '../../shared/reino/partida.js'
import { iniciar } from '../../server/index.mjs'
import { abrirBanco, MIGRACOES, VERSAO_DO_BANCO, LIMITE_DO_WAL_BYTES } from '../../server/db.mjs'
import { criarJogo } from '../../server/jogo.mjs'
import { cartasPorRodadas, inicioDaTemporada, ligaDe, limiarDoAlbum, liberadasPorRodadas, temporadaDoDia } from '../../server/reino/reino.mjs'

const DIA = 86_400_000
const SEGUNDA = 4 + 7 * 3142 // um dia que é segunda-feira (dia 4 da era é segunda)
const T0 = SEGUNDA * DIA + 10 * 3_600_000 // segunda, 10:00 UTC
const folga = { contasPorIp: { max: 100_000, janelaMs: 3_600_000 }, pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 1_000_000, janelaMs: 60_000 } }
const reinoFolgado = { partidasPorConta: { max: 100_000, janelaMs: 3_600_000 }, partidasPorIp: { max: 100_000, janelaMs: 3_600_000 }, replaysPorConta: { max: 100_000, janelaMs: 60_000 } }

async function subir({ dbPath = ':memory:', t = T0, reino = {}, ...resto } = {}) {
  const relogio = { t }
  const logs = []
  const s = await iniciar({ dbPath, porta: 0, agora: () => relogio.t, log: (l) => logs.push(l), limites: folga, reino: { params: reinoFolgado, ...reino }, ...resto })
  const url = `http://127.0.0.1:${s.porta}`
  async function api(metodo, caminho, token, corpo) {
    const r = await fetch(url + caminho, {
      method: metodo,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    })
    const texto = await r.text()
    let json = null
    try { json = JSON.parse(texto) } catch { /* não é JSON */ }
    return { status: r.status, json, texto }
  }
  let n = 0
  async function conta(apelido = `Rei ${++n}`) {
    const r = await api('POST', '/api/conta', null, { apelido })
    assert.equal(r.status, 201, r.texto)
    return { id: r.json.conta.id, token: r.json.token, apelido }
  }
  return { s, api, conta, relogio, logs, url }
}
const fechar = (s) => new Promise((ok) => s.servidor.close(ok))

/**
 * Jogada simples e honesta a partir das opções: prefere Tropa (subindo de nível quando dá) num terreno vazio ou no da
 * mesma carta, luta, pega o 1º espólio.
 */
function jogada(r) {
  const o = r.opcoes
  if (o.fase === 'espolio') return o.comandos.find((c) => c.tipo === 'espolio')
  if (!r.visao.cartaPosta) {
    const t = r.visao.terrenos
    const ordem = [...o.oferta].sort((a, b) => (CARTAS[b.carta].tipo === 'tropa') - (CARTAS[a.carta].tipo === 'tropa') || b.levelUp - a.levelUp)
    for (const { carta } of ordem) {
      const porDessa = o.comandos.filter((c) => c.tipo === 'por' && c.carta === carta)
      const escolha = porDessa.find((c) => t[c.terreno - 1]?.carta === carta) ?? porDessa.find((c) => !t[c.terreno - 1])
      if (escolha) return escolha
    }
  }
  return { tipo: 'batalhar' }
}
/** Termina a partida (desiste se ainda está aberta) e devolve o resultado gravado pelo servidor. */
async function terminarPartida(api, token, r) {
  if (r.status !== 'aberta') return r.resultado
  const d = await api('POST', '/api/reino/partida/desistir', token, { partida: r.id })
  assert.equal(d.status, 200, d.texto)
  return d.json.resultado
}

/** Manda comandos até a partida acabar ou até `max` comandos. Devolve a última resposta. */
async function jogar(api, token, r, max = 10_000) {
  for (let i = 0; i < max && r.status === 'aberta'; i++) {
    const res = await api('POST', '/api/reino/partida/comando', token, { partida: r.id, seq: r.seq, comando: jogada(r) })
    assert.equal(res.status, 200, res.texto)
    r = res.json
  }
  return r
}
/** Joga até vencer `n` batalhas (ou acabar). */
async function vencerBatalhas(api, token, r, n) {
  let vitorias = 0
  while (r.status === 'aberta' && vitorias < n) {
    const cmd = jogada(r)
    const res = await api('POST', '/api/reino/partida/comando', token, { partida: r.id, seq: r.seq, comando: cmd })
    assert.equal(res.status, 200, res.texto)
    r = res.json
    if (r.eventos.some((e) => e.tipo === 'batalha' && e.vitoria)) vitorias++
  }
  return r
}
const abrir = async (api, token, modo) => {
  const r = await api('POST', '/api/reino/partida', token, { modo })
  assert.equal(r.status, 201, r.texto)
  return r.json
}

// ---------------------------------------------------------------- 1. partida no servidor

describe('R14 — partida no servidor', () => {
  test('abrir, retomar, comando, repetir, desistir; a semente nunca sai', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const p = await abrir(api, a.token, 'treino')
      assert.match(p.id, /^pa_[0-9a-f]{24}$/)
      assert.equal(p.status, 'aberta')
      assert.equal(p.seq, 0)
      assert.equal(p.visao.rodada, 1)
      assert.ok(p.opcoes.comandos.length > 0)
      const linha = s.db.prepare('SELECT * FROM reino_partidas WHERE id = ?').get(p.id)
      assert.equal(linha.modo, 'treino')
      assert.deepEqual(JSON.parse(linha.liberadas), Object.keys((await import('../../shared/reino/config.js')).CARTAS).filter((id) => ALBUM.inicial.includes(id)))
      const chave = JSON.parse(linha.estado).sorteio.chave
      for (const txt of [JSON.stringify(p)]) {
        assert.ok(!txt.includes(linha.semente), 'semente na resposta')
        assert.ok(!txt.includes(chave), 'estado do sorteio na resposta')
        assert.ok(!/"sorteio"\s*:\s*\{/.test(txt))
      }
      // retomar depois de recarregar
      const g = await api('GET', '/api/reino/partida', a.token)
      assert.equal(g.status, 200)
      assert.equal(g.json.partida.id, p.id)
      assert.deepEqual(g.json.partida.visao, p.visao)
      assert.deepEqual(g.json.abertas, [{ id: p.id, modo: 'treino' }])
      assert.equal((await api('GET', '/api/reino/partida?modo=ranking', a.token)).json.partida, null)
      // um comando; repetir o mesmo seq devolve a mesma resposta sem aplicar de novo
      const cmd = jogada(p)
      const c1 = await api('POST', '/api/reino/partida/comando', a.token, { partida: p.id, seq: 0, comando: cmd })
      assert.equal(c1.status, 200, c1.texto)
      assert.equal(c1.json.seq, 1)
      const c1b = await api('POST', '/api/reino/partida/comando', a.token, { partida: p.id, seq: 0, comando: cmd })
      assert.equal(c1b.status, 200)
      assert.equal(c1b.json.repetido, true)
      const { repetido, ...semMarca } = c1b.json
      assert.deepEqual(semMarca, c1.json)
      assert.equal(s.db.prepare('SELECT seq FROM reino_partidas WHERE id = ?').get(p.id).seq, 1)
      // mesmo seq com OUTRO comando: recusa; seq à frente: recusa
      assert.equal((await api('POST', '/api/reino/partida/comando', a.token, { partida: p.id, seq: 0, comando: { tipo: 'desistir' } })).json.erro.codigo, 'SEQ_JA_USADA')
      assert.equal((await api('POST', '/api/reino/partida/comando', a.token, { partida: p.id, seq: 5, comando: { tipo: 'batalhar' } })).json.erro.codigo, 'SEQ_FORA_DE_ORDEM')
      // luta: os eventos da batalha vêm na resposta
      const lutar = await api('POST', '/api/reino/partida/comando', a.token, { partida: p.id, seq: 1, comando: { tipo: 'batalhar' } })
      assert.equal(lutar.status, 200, lutar.texto)
      const bat = lutar.json.eventos.find((e) => e.tipo === 'batalha')
      assert.ok(bat && Array.isArray(bat.eventos) && bat.eventos.length > 0)
      // tempo de cada comando fica registrado (para análise)
      assert.equal(JSON.parse(s.db.prepare('SELECT tempos FROM reino_partidas WHERE id = ?').get(p.id).tempos).length, 2)
      // desistir
      const d = await api('POST', '/api/reino/partida/desistir', a.token, { partida: p.id })
      assert.equal(d.status, 200, d.texto)
      assert.equal(d.json.status, 'terminada')
      assert.equal(d.json.resultado.motivo, 'desistiu')
      assert.equal(d.json.resultado.conta, true)
      assert.equal(d.json.opcoes, null)
      assert.equal((await api('POST', '/api/reino/partida/desistir', a.token, { partida: p.id })).json.erro.codigo, 'PARTIDA_ACABOU')
      assert.equal((await api('POST', '/api/reino/partida/comando', a.token, { partida: p.id, seq: 3, comando: { tipo: 'batalhar' } })).json.erro.codigo, 'PARTIDA_ACABOU')
      assert.equal((await api('GET', '/api/reino/partida', a.token)).json.partida, null)
      // terminada: só o necessário para refazer (sem o estado)
      const fim = s.db.prepare('SELECT * FROM reino_partidas WHERE id = ?').get(p.id)
      assert.equal(fim.estado, null)
      assert.equal(JSON.parse(fim.comandos).length, 3)
    } finally { await fechar(s) }
  })

  test('erros: sem sessão, modo, campos, comando recusado pelo motor, partida de outra conta', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta(), b = await conta()
      assert.equal((await api('POST', '/api/reino/partida', null, { modo: 'treino' })).status, 401)
      assert.equal((await api('GET', '/api/reino/perfil', null)).status, 401)
      assert.equal((await api('POST', '/api/reino/partida', a.token, { modo: 'livre' })).json.erro.codigo, 'MODO_INVALIDO')
      assert.equal((await api('POST', '/api/reino/partida', a.token, { modo: 'treino', semente: 'x' })).json.erro.codigo, 'CAMPO_DESCONHECIDO')
      assert.equal((await api('POST', '/api/reino/partida', a.token, [])).json.erro.codigo, 'CORPO_INVALIDO')
      assert.equal((await api('GET', '/api/reino/partida?modo=xis', a.token)).json.erro.codigo, 'MODO_INVALIDO')
      const p = await abrir(api, a.token, 'treino')
      assert.equal((await api('POST', '/api/reino/partida', a.token, { modo: 'treino' })).json.erro.codigo, 'PARTIDA_ABERTA')
      const errado = async (corpo, codigo, status = 400) => {
        const r = await api('POST', '/api/reino/partida/comando', a.token, corpo)
        assert.equal(r.status, status, JSON.stringify(corpo))
        assert.equal(r.json.erro.codigo, codigo, JSON.stringify(corpo))
      }
      await errado({ partida: p.id, seq: 0 }, 'CORPO_INVALIDO')
      await errado({ partida: p.id, seq: -1, comando: { tipo: 'batalhar' } }, 'CAMPO_INVALIDO')
      await errado({ partida: p.id, seq: 0.5, comando: { tipo: 'batalhar' } }, 'CAMPO_INVALIDO')
      await errado({ partida: 'pa_x', seq: 0, comando: { tipo: 'batalhar' } }, 'CAMPO_INVALIDO')
      await errado({ partida: p.id, seq: 0, comando: { tipo: 'trapacear' } }, 'CAMPO_INVALIDO')
      await errado({ partida: p.id, seq: 0, comando: { tipo: 'batalhar', pontos: 9999 } }, 'CAMPO_DESCONHECIDO')
      await errado({ partida: p.id, seq: 0, comando: { tipo: 'batalhar', carta: 'T01' } }, 'CAMPO_DESCONHECIDO')
      await errado({ partida: p.id, seq: 0, comando: { tipo: 'por', carta: 'T01', terreno: 7 } }, 'CAMPO_INVALIDO')
      await errado({ partida: p.id, seq: 0, comando: { tipo: 'por', carta: '<b>', terreno: 1 } }, 'CAMPO_INVALIDO')
      await errado({ partida: p.id, seq: 0, comando: { tipo: 'batalhar' }, pontos: 1 }, 'CAMPO_DESCONHECIDO')
      // carta fora da oferta: o motor recusa (422) e nada muda
      const fora = ['T01', 'T02', 'T04', 'T07', 'T10'].find((c) => !p.visao.oferta.some((o) => o.carta === c))
      await errado({ partida: p.id, seq: 0, comando: { tipo: 'por', carta: fora, terreno: 1 } }, 'COMANDO_RECUSADO', 422)
      await errado({ partida: p.id, seq: 0, comando: { tipo: 'espolio', indice: 0 } }, 'COMANDO_RECUSADO', 422)
      assert.equal(s.db.prepare('SELECT seq FROM reino_partidas WHERE id = ?').get(p.id).seq, 0)
      // partida de outra conta: não existe para ela
      assert.equal((await api('POST', '/api/reino/partida/comando', b.token, { partida: p.id, seq: 0, comando: { tipo: 'batalhar' } })).status, 404)
      assert.equal((await api('POST', '/api/reino/partida/desistir', b.token, { partida: p.id })).status, 404)
      assert.equal((await api('GET', `/api/reino/replay/${p.id}`, b.token)).status, 404)
      assert.equal((await api('GET', '/api/reino/replay/xis', b.token)).status, 400)
      assert.equal((await api('GET', '/api/reino/ranking?cursor=$$$', a.token)).json.erro.codigo, 'CURSOR_INVALIDO')
      assert.equal((await api('GET', `/api/reino/ranking?cursor=${Buffer.from('1:2').toString('base64url')}`, a.token)).json.erro.codigo, 'CURSOR_INVALIDO')
      assert.equal((await api('GET', '/api/reino/ranking?temporada=999999', a.token)).json.erro.codigo, 'TEMPORADA_INVALIDA')
      assert.equal((await api('GET', '/api/reino/perfil?x=1', a.token)).json.erro.codigo, 'CAMPO_DESCONHECIDO')
      assert.equal((await api('DELETE', '/api/reino/partida', a.token)).status, 405)
      assert.equal((await api('GET', '/api/reino/nada', a.token)).status, 404)
    } finally { await fechar(s) }
  })

  test('uma partida aberta por modo (treino, ranking e estrada juntas são permitidas)', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      for (const modo of ['treino', 'ranking', 'estrada']) await abrir(api, a.token, modo)
      for (const modo of ['treino', 'ranking', 'estrada']) assert.equal((await api('POST', '/api/reino/partida', a.token, { modo })).status, 409)
      const g = await api('GET', '/api/reino/partida', a.token)
      assert.equal(g.json.abertas.length, 3)
    } finally { await fechar(s) }
  })

  test('partida parada vence por tempo e conta como terminada (ranking entra na pontuação)', async () => {
    const { s, api, conta, relogio } = await subir()
    try {
      const a = await conta()
      let p = await abrir(api, a.token, 'ranking')
      p = await vencerBatalhas(api, a.token, p, 1)
      assert.equal(p.status, 'aberta')
      relogio.t += 181 * 60_000
      const g = await api('GET', '/api/reino/partida', a.token)
      assert.equal(g.json.partida, null)
      const l = s.db.prepare('SELECT * FROM reino_partidas WHERE id = ?').get(p.id)
      assert.equal(l.status, 'terminada')
      assert.equal(l.motivo, 'tempo')
      assert.equal(l.conferida, 1)
      assert.equal(l.pontos, p.visao.pontos)
      const r = await api('GET', '/api/reino/ranking', a.token)
      assert.equal(r.json.voce.pontos, Math.floor(l.pontos / 3))
    } finally { await fechar(s) }
  })

  test('teto de comandos: a partida termina sozinha (motivo teto)', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const p = await abrir(api, a.token, 'treino')
      s.db.prepare("UPDATE reino_partidas SET estado = json_set(estado, '$.comandos', ?) WHERE id = ?").run(PARTIDA.tetoComandos, p.id)
      const r = await api('POST', '/api/reino/partida/comando', a.token, { partida: p.id, seq: 0, comando: { tipo: 'batalhar' } })
      assert.equal(r.status, 409)
      assert.equal(r.json.erro.codigo, 'PARTIDA_ACABOU')
      assert.equal(s.db.prepare('SELECT motivo FROM reino_partidas WHERE id = ?').get(p.id).motivo, 'teto')
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- 5. anti-trapaça e corrida

describe('R14 — anti-trapaça', () => {
  test('partida inteira refeita pelo servidor bate com o que foi jogado', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const fim = await jogar(api, a.token, await abrir(api, a.token, 'ranking'))
      assert.equal(fim.status, 'terminada')
      assert.equal(fim.resultado.motivo, 'sem_vidas')
      const l = s.db.prepare('SELECT * FROM reino_partidas WHERE id = ?').get(fim.id)
      const r = reproduzir({ semente: l.semente, cartasLiberadas: JSON.parse(l.liberadas), comandos: JSON.parse(l.comandos), regra: l.regra }) // regra mudou (R46): partida nova nasce com a regra 2 (gravada na linha)
      assert.equal(r.ok, true)
      assert.equal(r.resultado.pontos, l.pontos)
      assert.equal(r.resultado.vencidas, l.vencidas)
      assert.equal(l.conferida, 1)
      assert.equal(fim.visao.pontos, l.pontos)
      // o replay devolve a mesma partida, passo a passo
      const rp = await api('GET', `/api/reino/replay/${fim.id}`, a.token)
      assert.equal(rp.status, 200, rp.texto)
      assert.equal(rp.json.passos.length, JSON.parse(l.comandos).length)
      assert.equal(rp.json.passos.at(-1).visao.pontos, l.pontos)
      assert.equal(rp.json.semente, l.semente) // ranking terminada: a semente já não ajuda ninguém
    } finally { await fechar(s) }
  })

  test('estado mexido no banco: a conferência não bate, a partida não conta e vai ao log', async () => {
    const { s, api, conta, logs } = await subir()
    try {
      const a = await conta()
      const p = await abrir(api, a.token, 'ranking')
      s.db.prepare("UPDATE reino_partidas SET estado = json_set(estado, '$.vencidas', 50) WHERE id = ?").run(p.id)
      const d = await api('POST', '/api/reino/partida/desistir', a.token, { partida: p.id })
      assert.equal(d.status, 200, d.texto)
      assert.equal(d.json.resultado.conta, false)
      assert.equal(s.db.prepare('SELECT conferida FROM reino_partidas WHERE id = ?').get(p.id).conferida, 0)
      assert.equal(s.db.prepare('SELECT COUNT(*) n FROM reino_pontuacao').get().n, 0)
      assert.ok(logs.some((l) => /ALERTA partida .* não bate/.test(l)))
      assert.equal((await api('GET', '/api/reino/perfil', a.token)).json.recordes.pontos, 0)
    } finally { await fechar(s) }
  })

  test('corrida: 10 comandos com o mesmo seq → 1 aplica, os outros devolvem a mesma resposta', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const p = await abrir(api, a.token, 'treino')
      const corpo = { partida: p.id, seq: 0, comando: { tipo: 'batalhar' } }
      const rs = await Promise.all(Array.from({ length: 10 }, () => api('POST', '/api/reino/partida/comando', a.token, corpo)))
      assert.ok(rs.every((r) => r.status === 200), rs.map((r) => r.status).join(','))
      assert.equal(rs.filter((r) => !r.json.repetido).length, 1)
      const base = JSON.stringify(rs.find((r) => !r.json.repetido).json)
      for (const r of rs) { const { repetido, ...x } = r.json; assert.equal(JSON.stringify(x), base) }
      const l = s.db.prepare('SELECT seq, comandos FROM reino_partidas WHERE id = ?').get(p.id)
      assert.equal(l.seq, 1)
      assert.equal(JSON.parse(l.comandos).length, 1)
    } finally { await fechar(s) }
  })

  test('corrida: 10 aberturas de ranking ao mesmo tempo com 1 de energia → 1 passa, 1 de energia gasta', async () => {
    const { s, api, conta, relogio } = await subir()
    try {
      const a = await conta()
      await api('GET', '/api/reino/perfil', a.token)
      s.db.prepare('INSERT OR REPLACE INTO reino_contas (conta_id, energia_saldo, energia_dia, criada_em) VALUES (?, 1, ?, ?)').run(a.id, Math.floor(relogio.t / DIA), relogio.t)
      const rs = await Promise.all(Array.from({ length: 10 }, () => api('POST', '/api/reino/partida', a.token, { modo: 'ranking' })))
      assert.equal(rs.filter((r) => r.status === 201).length, 1, rs.map((r) => r.status).join(','))
      assert.ok(rs.filter((r) => r.status !== 201).every((r) => r.status === 409))
      assert.equal(s.db.prepare("SELECT COUNT(*) n FROM reino_partidas WHERE modo = 'ranking'").get().n, 1)
      assert.equal(s.db.prepare('SELECT energia_saldo FROM reino_contas WHERE conta_id = ?').get(a.id).energia_saldo, 0)
      // depois de terminar, sem energia não abre
      const p = rs.find((r) => r.status === 201).json
      await api('POST', '/api/reino/partida/desistir', a.token, { partida: p.id })
      const sem = await api('POST', '/api/reino/partida', a.token, { modo: 'ranking' })
      assert.equal(sem.status, 409)
      assert.equal(sem.json.erro.codigo, 'SEM_ENERGIA')
      assert.equal(sem.json.erro.energia.atual, 0)
      assert.equal((await api('POST', '/api/reino/partida', a.token, { modo: 'treino' })).status, 201) // treino é livre
    } finally { await fechar(s) }
  })

  test('limite de partidas por conta e por IP', async () => {
    const { s, api, conta } = await subir({ reino: { params: { ...reinoFolgado, partidasPorConta: { max: 2, janelaMs: 3_600_000 } } } })
    try {
      const a = await conta()
      for (let i = 0; i < 2; i++) {
        const p = await abrir(api, a.token, 'treino')
        await api('POST', '/api/reino/partida/desistir', a.token, { partida: p.id })
      }
      const r = await api('POST', '/api/reino/partida', a.token, { modo: 'treino' })
      assert.equal(r.status, 429)
      assert.equal(r.json.erro.codigo, 'MUITAS_PARTIDAS')
    } finally { await fechar(s) }
    const b = await subir({ reino: { params: { ...reinoFolgado, partidasPorIp: { max: 3, janelaMs: 3_600_000 } } } })
    try {
      const contas = [await b.conta(), await b.conta()]
      for (const c of contas) for (const modo of ['treino', 'estrada'].slice(0, c === contas[0] ? 2 : 1)) await abrir(b.api, c.token, modo)
      assert.equal((await b.api('POST', '/api/reino/partida', contas[1].token, { modo: 'estrada' })).json.erro.codigo, 'MUITAS_PARTIDAS')
    } finally { await fechar(b.s) }
  })

  test('a visão nunca traz sorteio futuro: nada do estado do sorteio em nenhuma resposta de uma partida inteira', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      let r = await abrir(api, a.token, 'estrada')
      const l = s.db.prepare('SELECT semente FROM reino_partidas WHERE id = ?').get(r.id)
      const textos = [JSON.stringify(r)]
      for (let i = 0; i < 200 && r.status === 'aberta'; i++) {
        const chave = JSON.parse(s.db.prepare('SELECT estado FROM reino_partidas WHERE id = ?').get(r.id).estado).sorteio.chave
        for (const t of textos.splice(0)) assert.ok(!t.includes(chave) && !t.includes(l.semente))
        const res = await api('POST', '/api/reino/partida/comando', a.token, { partida: r.id, seq: r.seq, comando: jogada(r) })
        r = res.json
        textos.push(res.texto, (await api('GET', '/api/reino/partida?modo=estrada', a.token)).texto)
        assert.ok(!/"sorteio"\s*:\s*\{|"semente"/.test(res.texto))
      }
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- 2. energia de ranking

describe('R14 — energia de ranking (3 por dia, junta até 9, recarga 00:00 UTC)', () => {
  test('números vêm da seção BETA do config (PROVISÓRIOS)', () => {
    assert.deepEqual(BETA.energia, { porDia: 3, teto: 9, porPartidaDeRanking: 1 })
    assert.equal(BETA.temporadaDias, 7)
    assert.equal(BETA.melhoresQueContam, 3)
  })

  test('gasta, recarrega na virada, junta até o teto, relógio que volta não devolve', async () => {
    const { s, api, conta, relogio } = await subir()
    try {
      const a = await conta()
      const energia = async () => (await api('GET', '/api/reino/perfil', a.token)).json.energia
      assert.equal((await energia()).atual, 3)
      assert.equal((await energia()).recarregaEm, new Date((SEGUNDA + 1) * DIA).toISOString())
      const gastarUma = async () => {
        const p = await abrir(api, a.token, 'ranking')
        assert.equal((await api('POST', '/api/reino/partida/desistir', a.token, { partida: p.id })).status, 200)
        return p
      }
      const p1 = await gastarUma()
      assert.equal(p1.energia.atual, 2)
      await gastarUma(); await gastarUma()
      assert.equal((await energia()).atual, 0)
      assert.equal((await api('POST', '/api/reino/partida', a.token, { modo: 'ranking' })).json.erro.codigo, 'SEM_ENERGIA')
      // virada do dia UTC: +3
      relogio.t = (SEGUNDA + 1) * DIA + 1000
      assert.equal((await energia()).atual, 3)
      await gastarUma()
      assert.equal((await energia()).atual, 2)
      // relógio volta para ontem: não devolve nada (o dia gravado vale)
      relogio.t = (SEGUNDA + 1) * DIA - 5000
      assert.equal((await energia()).atual, 2)
      await gastarUma()
      relogio.t = (SEGUNDA + 1) * DIA + 2000
      assert.equal((await energia()).atual, 1)
      // 5 dias sem jogar: junta até 9, não mais
      relogio.t = (SEGUNDA + 6) * DIA + 1000
      assert.equal((await energia()).atual, 9)
      relogio.t = (SEGUNDA + 6) * DIA + 2000
      for (let i = 0; i < 9; i++) await gastarUma()
      assert.equal((await api('POST', '/api/reino/partida', a.token, { modo: 'ranking' })).json.erro.codigo, 'SEM_ENERGIA')
      // saldo corrompido no banco não passa do teto nem fica negativo
      s.db.prepare('UPDATE reino_contas SET energia_saldo = 999999 WHERE conta_id = ?').run(a.id)
      assert.equal((await energia()).atual, 9)
      s.db.prepare('UPDATE reino_contas SET energia_saldo = -5 WHERE conta_id = ?').run(a.id)
      assert.equal((await energia()).atual, 0)
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- 2. estrada do dia

describe('R14 — estrada do dia', () => {
  test('a mesma para duas contas, diferente amanhã, 1 tentativa por dia, semente de segredo do servidor', async () => {
    // segredo fixo: o teste não depende da sorte (com outro segredo a rodada 1 de dois dias pode coincidir por acaso)
    const { s, api, conta, relogio } = await subir({ reino: { params: reinoFolgado, segredo: 'a'.repeat(64) } })
    try {
      const a = await conta(), b = await conta()
      const pa = await abrir(api, a.token, 'estrada'), pb = await abrir(api, b.token, 'estrada')
      assert.deepEqual(pa.visao, pb.visao)
      const sem = (id) => s.db.prepare('SELECT semente, liberadas FROM reino_partidas WHERE id = ?').get(id)
      assert.equal(sem(pa.id).semente, sem(pb.id).semente)
      assert.deepEqual(JSON.parse(sem(pa.id).liberadas).sort(), ALBUM.inicial.slice().sort())
      assert.equal(sem(pa.id).semente, s.reino._interno.sementeDaEstrada(SEGUNDA))
      // nada de semente previsível (dia em texto, sha da data): é HMAC com o segredo do servidor
      assert.notEqual(sem(pa.id).semente, String(SEGUNDA))
      assert.notEqual(sem(pa.id).semente, s.reino._interno.hash(`keepmile:estrada:${SEGUNDA}`))
      // 1 tentativa: depois de desistir, não abre de novo no mesmo dia
      await api('POST', '/api/reino/partida/desistir', a.token, { partida: pa.id })
      const de = await api('POST', '/api/reino/partida', a.token, { modo: 'estrada' })
      assert.equal(de.status, 409)
      assert.equal(de.json.erro.codigo, 'ESTRADA_JA_JOGADA')
      // amanhã: outra estrada, e dá para jogar de novo (sem punir quem faltou)
      relogio.t += DIA
      const amanha = await abrir(api, a.token, 'estrada')
      assert.notEqual(sem(amanha.id).semente, sem(pa.id).semente)
      assert.notDeepEqual({ o: amanha.visao.oferta, h: amanha.visao.horda, e: amanha.visao.espolios }, { o: pa.visao.oferta, h: pa.visao.horda, e: pa.visao.espolios })
    } finally { await fechar(s) }
    // outro servidor (outro segredo): outra estrada no mesmo dia
    const x = await subir({ reino: { params: reinoFolgado, segredo: 'b'.repeat(64) } })
    const y = await subir({ reino: { params: reinoFolgado, segredo: 'c'.repeat(64) } })
    try {
      assert.notEqual(x.s.reino._interno.sementeDaEstrada(SEGUNDA), y.s.reino._interno.sementeDaEstrada(SEGUNDA))
    } finally { await fechar(x.s); await fechar(y.s) }
  })

  test('placar do dia: só terminadas e conferidas, posição da própria conta', async () => {
    // regra mudou (R16, K2): o placar do dia só aceita conta criada antes do dia e com 1 ranking terminado
    const { s, api, conta, relogio } = await subir({ t: T0 - DIA })
    try {
      const a = await conta('Ana'), b = await conta('Bia'), c = await conta('Caio')
      for (const x of [a, b, c]) await terminarPartida(api, x.token, await abrir(api, x.token, 'ranking'))
      relogio.t = T0
      const fa = await jogar(api, a.token, await abrir(api, a.token, 'estrada'))
      const pb = await vencerBatalhas(api, b.token, await abrir(api, b.token, 'estrada'), 1)
      const fb = { resultado: await terminarPartida(api, b.token, pb) }
      await abrir(api, c.token, 'estrada') // aberta: fora do placar
      const r = (await api('GET', '/api/reino/ranking', c.token)).json.estradaDoDia
      assert.equal(r.dia, new Date(SEGUNDA * DIA).toISOString().slice(0, 10))
      assert.equal(r.lista.length, 2)
      const esperado = [{ a: 'Ana', p: fa.resultado.pontos }, { a: 'Bia', p: fb.resultado.pontos }].sort((x, y) => y.p - x.p)
      assert.deepEqual(r.lista.map((l) => l.apelido), esperado.map((x) => x.a))
      assert.deepEqual(r.lista.map((l) => l.pontos), esperado.map((x) => x.p))
      assert.equal(r.voce.status, 'aberta')
      assert.equal(r.voce.posicao, null)
      const ra = (await api('GET', '/api/reino/ranking', a.token)).json.estradaDoDia
      assert.equal(ra.voce.posicao, esperado.findIndex((x) => x.a === 'Ana') + 1)
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- 3. ranking da temporada

describe('R14 — ranking da temporada', () => {
  test('temporada começa segunda 00:00 UTC e dura 7 dias', () => {
    const t = temporadaDoDia(SEGUNDA)
    assert.equal(temporadaDoDia(SEGUNDA + 6), t)
    assert.equal(temporadaDoDia(SEGUNDA + 7), t + 1)
    assert.equal(temporadaDoDia(SEGUNDA - 1), t - 1)
    assert.equal(inicioDaTemporada(t), SEGUNDA * DIA)
    assert.equal(new Date(inicioDaTemporada(t)).getUTCDay(), 1)
  })

  test('ligas: faixa fixa da bíblia pela média; os 10 primeiros são a lenda', () => {
    assert.equal(ligaDe(0, 50), 'gate')
    assert.equal(ligaDe(799, 50), 'gate')
    assert.equal(ligaDe(800, 50), 'road')
    assert.equal(ligaDe(1599, 50), 'keep')
    assert.equal(ligaDe(1600, 50), 'lord')
    assert.equal(ligaDe(2500, 11), 'crown')
    assert.equal(ligaDe(300, 10), 'legend')
    assert.equal(ligaDe(0, 1), 'gate') // sem ponto nenhum não é lenda
  })

  test('média das 3 melhores (faltando, conta 0), ordem, páginas, posição da conta', async () => {
    const { s, api, conta } = await subir({ reino: { params: { ...reinoFolgado, paginaDoRanking: 2 } } })
    try {
      const contas = []
      const somas = {}
      for (let i = 0; i < 5; i++) {
        const c = await conta(`Jogador R${i}`)
        contas.push(c)
        const pts = []
        for (let k = 0; k < (i % 3) + 1; k++) { // 1, 2, 3, 1, 2 partidas (a energia do dia é 3)
          const p = await vencerBatalhas(api, c.token, await abrir(api, c.token, 'ranking'), (i + k) % 3 + 1)
          pts.push((await terminarPartida(api, c.token, p)).pontos)
        }
        pts.sort((x, y) => y - x)
        somas[c.apelido] = pts.slice(0, 3).reduce((x, y) => x + y, 0)
      }
      const ordem = Object.entries(somas).sort((x, y) => y[1] - x[1])
      const vistos = []
      let cursor = '', paginas = 0
      do {
        const r = await api('GET', `/api/reino/ranking${cursor ? `?cursor=${cursor}` : ''}`, contas[0].token)
        assert.equal(r.status, 200, r.texto)
        assert.ok(r.json.lista.length <= 2)
        vistos.push(...r.json.lista)
        cursor = r.json.proximo
        paginas++
      } while (cursor)
      assert.equal(paginas, 3)
      assert.deepEqual(vistos.map((l) => l.posicao), [1, 2, 3, 4, 5])
      assert.deepEqual(vistos.map((l) => l.pontos), ordem.map(([, soma]) => Math.floor(soma / 3)))
      // empate de soma: quem chegou antes fica na frente (a ordem do servidor é estável)
      for (const l of vistos) assert.equal(l.liga, ligaDe(l.pontos, l.posicao))
      for (const c of contas) {
        const v = (await api('GET', '/api/reino/ranking', c.token)).json.voce
        assert.equal(v.pontos, Math.floor(somas[c.apelido] / 3))
        assert.equal(vistos[v.posicao - 1].pontos, v.pontos)
      }
      const r = (await api('GET', '/api/reino/ranking', contas[0].token)).json
      assert.equal(r.temporada.numero, temporadaDoDia(SEGUNDA))
      assert.equal(r.temporada.fechada, false)
      assert.equal(r.ligas.at(-1).id, 'legend')
      // treino e estrada não entram no ranking
      const t = await abrir(api, contas[0].token, 'treino')
      await terminarPartida(api, contas[0].token, await vencerBatalhas(api, contas[0].token, t, 3))
      assert.equal(s.db.prepare('SELECT COUNT(*) n FROM reino_pontuacao').get().n, 5)
      assert.equal((await api('GET', '/api/reino/ranking', contas[0].token)).json.voce.pontos, Math.floor(somas[contas[0].apelido] / 3))
    } finally { await fechar(s) }
  })

  test('conta sem partida de ranking: fora da lista (voce = null)', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const r = await api('GET', '/api/reino/ranking', a.token)
      assert.equal(r.json.voce, null)
      assert.deepEqual(r.json.lista, [])
      assert.equal(r.json.proximo, null)
    } finally { await fechar(s) }
  })

  test('fecho da temporada: termina as abertas, grava posição e título (só título), nada de prêmio', async () => {
    const { s, api, conta, relogio } = await subir()
    try {
      const a = await conta('Primeira'), b = await conta('Segunda')
      const pa = await vencerBatalhas(api, a.token, await abrir(api, a.token, 'ranking'), 3)
      const fa = { resultado: await terminarPartida(api, a.token, pa) }
      const pb = await vencerBatalhas(api, b.token, await abrir(api, b.token, 'ranking'), 1) // fica aberta
      assert.equal(pb.status, 'aberta')
      const temporada = temporadaDoDia(SEGUNDA)
      // segunda seguinte, antes da folga: ainda não fecha
      relogio.t = (SEGUNDA + 7) * DIA + 60_000
      await api('GET', '/api/reino/ranking', a.token)
      assert.equal(s.db.prepare('SELECT COUNT(*) n FROM reino_temporadas').get().n, 0)
      // depois da folga (prazo de partida parada): fecha
      relogio.t = (SEGUNDA + 7) * DIA + 181 * 60_000
      const r = await api('GET', `/api/reino/ranking?temporada=${temporada}`, a.token)
      assert.equal(r.json.temporada.fechada, true)
      assert.equal(s.db.prepare('SELECT motivo FROM reino_partidas WHERE id = ?').get(pb.id).motivo, 'fim_da_temporada')
      const tit = s.db.prepare('SELECT * FROM reino_titulos WHERE temporada = ? ORDER BY posicao').all(temporada)
      assert.equal(tit.length, 2)
      const ma = Math.floor(fa.resultado.pontos / 3), mb = Math.floor(pb.visao.pontos / 3)
      assert.ok(ma >= mb)
      assert.deepEqual(tit.map((x) => x.media), [ma, mb])
      const perfil = (await api('GET', '/api/reino/perfil', a.token)).json
      assert.deepEqual(perfil.titulos, [{ temporada, posicao: 1, pontos: ma, liga: ligaDe(ma, 1) }])
      // temporada nova começa vazia; fechar de novo não duplica
      assert.deepEqual((await api('GET', '/api/reino/ranking', a.token)).json.lista, [])
      s.reino._interno.fecharTemporadas()
      assert.equal(s.db.prepare('SELECT COUNT(*) n FROM reino_titulos').get().n, 2)
      // nada de prêmio, pote ou dinheiro em nenhuma tabela nem resposta
      const txt = JSON.stringify(perfil) + r.texto
      assert.ok(!/premio|prêmio|pote|token|moeda|saque/i.test(txt))
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- 4. álbum, conquistas, perfil, replay

describe('R14 — álbum, conquistas e perfil', () => {
  test('álbum: limiares da bíblia (8, +15 ×8, +30 ×9 = 398)', () => {
    assert.equal(limiarDoAlbum(0), 8)
    assert.equal(limiarDoAlbum(1), 23)
    assert.equal(limiarDoAlbum(ALBUM.ordem.length - 1), 398)
    assert.equal(cartasPorRodadas(7), 0)
    assert.equal(cartasPorRodadas(8), 1)
    assert.equal(cartasPorRodadas(398), ALBUM.ordem.length)
    assert.equal(liberadasPorRodadas(0).length, ALBUM.inicial.length)
    assert.equal(liberadasPorRodadas(10_000).length, 30)
  })

  test('rodadas vencidas somadas (treino conta) liberam cartas; a partida nova usa o álbum da conta', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const ini = (await api('GET', '/api/reino/perfil', a.token)).json
      assert.equal(ini.album.rodadasVencidas, 0)
      assert.deepEqual(ini.album.proxima, { carta: ALBUM.ordem[0], rodadas: 8, faltam: 8 })
      assert.equal(ini.conquistas.length, 30) // regra mudou (R39): 12 → 30 conquistas
      assert.ok(ini.conquistas.every((c) => !c.feita))
      s.db.prepare('INSERT INTO reino_contas (conta_id, rodadas_vencidas, energia_saldo, energia_dia, criada_em) VALUES (?, 7, 3, ?, ?)').run(a.id, SEGUNDA, T0)
      let p = await abrir(api, a.token, 'treino')
      let cartaNova = null, conquistas = []
      while (p.status === 'aberta' && !cartaNova) {
        const r = await api('POST', '/api/reino/partida/comando', a.token, { partida: p.id, seq: p.seq, comando: jogada(p) })
        p = r.json
        cartaNova = p.novidades.cartaNova ?? cartaNova
        conquistas.push(...p.novidades.conquistas)
      }
      assert.equal(cartaNova, ALBUM.ordem[0])
      assert.ok(conquistas.includes('supper'))
      const perfil = (await api('GET', '/api/reino/perfil', a.token)).json
      assert.equal(perfil.album.rodadasVencidas, 8)
      assert.ok(perfil.album.liberadas.includes(ALBUM.ordem[0]))
      assert.equal(perfil.conquistas.find((c) => c.id === 'supper').feita, true)
      await api('POST', '/api/reino/partida/desistir', a.token, { partida: p.id })
      const p2 = await abrir(api, a.token, 'treino')
      assert.ok(JSON.parse(s.db.prepare('SELECT liberadas FROM reino_partidas WHERE id = ?').get(p2.id).liberadas).includes(ALBUM.ordem[0]))
      // estrada do dia não usa o álbum da conta (é igual para todos)
      const e = await abrir(api, a.token, 'estrada')
      assert.ok(!JSON.parse(s.db.prepare('SELECT liberadas FROM reino_partidas WHERE id = ?').get(e.id).liberadas).includes(ALBUM.ordem[0]))
    } finally { await fechar(s) }
  })

  test('perfil: recorde, melhores partidas e conquistas calculadas pelo servidor (Full House, Top Brass)', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const fim = await jogar(api, a.token, await abrir(api, a.token, 'treino'))
      const p = (await api('GET', '/api/reino/perfil', a.token)).json
      assert.equal(p.recordes.pontos, fim.resultado.pontos)
      assert.equal(p.recordes.partidas, 1)
      assert.equal(p.melhores[0].id, fim.id)
      assert.equal(p.melhores[0].pontos, fim.resultado.pontos)
      // um reino cheio de uma família só (posto pelo banco, como teste do cálculo): Full House e One Big Family
      const q = await abrir(api, a.token, 'treino')
      const cheio = JSON.stringify(Array.from({ length: 6 }, () => ({ carta: 'T01', nivel: 5 })))
      s.db.prepare("UPDATE reino_partidas SET estado = json_set(estado, '$.terrenos', json(?)) WHERE id = ?").run(cheio, q.id)
      const r = await api('POST', '/api/reino/partida/comando', a.token, { partida: q.id, seq: 0, comando: { tipo: 'desistir' } })
      // (R16: a 1ª partida às vezes já ganha Top Brass de verdade — aí ela não é "nova" agora; o teste falhava ~1 em 4)
      const tinha = new Set(p.conquistas.filter((c) => c.feita).map((c) => c.id))
      assert.deepEqual(r.json.novidades.conquistas.filter((c) => ['house', 'family', 'brass'].includes(c)).sort(), ['brass', 'family', 'house'].filter((c) => !tinha.has(c)))
      const depois = (await api('GET', '/api/reino/perfil', a.token)).json
      assert.deepEqual(depois.conquistas.filter((c) => ['house', 'family', 'brass'].includes(c.id) && c.feita).length, 3)
      assert.equal(r.json.resultado.conta, true) // terrenos mexidos não mudam pontos nem rodadas
    } finally { await fechar(s) }
  })
})

describe('R14 — replay', () => {
  test('própria: sim (a estrada de hoje só depois da virada); aberta: não; alheia: só do topo e nunca a estrada de hoje', async () => {
    // regra mudou (R16, K2): contas criadas ontem (o placar do dia só aceita conta de antes do dia) e a própria
    // estrada de hoje não sai antes da virada
    const { s, api, conta, relogio } = await subir({ t: T0 - DIA, reino: { params: { ...reinoFolgado, topoComReplay: 1 } } })
    try {
      const a = await conta('Topo'), b = await conta('Meio')
      relogio.t = T0
      const ra = await vencerBatalhas(api, a.token, await abrir(api, a.token, 'ranking'), 3)
      await terminarPartida(api, a.token, ra)
      const rb = await abrir(api, b.token, 'ranking')
      await api('POST', '/api/reino/partida/desistir', b.token, { partida: rb.id })
      const tb = await abrir(api, b.token, 'treino')
      assert.equal((await api('GET', `/api/reino/replay/${tb.id}`, b.token)).json.erro.codigo, 'PARTIDA_ABERTA')
      await api('POST', '/api/reino/partida/desistir', b.token, { partida: tb.id })
      assert.equal((await api('GET', `/api/reino/replay/${tb.id}`, b.token)).status, 200)
      assert.equal((await api('GET', `/api/reino/replay/${tb.id}`, a.token)).status, 404) // treino alheio
      const doTopo = await api('GET', `/api/reino/replay/${ra.id}`, b.token)
      assert.equal(doTopo.status, 200, doTopo.texto)
      assert.equal(doTopo.json.apelido, 'Topo')
      assert.equal(doTopo.json.propria, false)
      assert.equal(typeof doTopo.json.semente, 'string')
      assert.equal((await api('GET', `/api/reino/replay/${rb.id}`, a.token)).status, 404) // não é do topo
      // estrada de hoje
      const ea = await jogar(api, a.token, await abrir(api, a.token, 'estrada'))
      const propria = await api('GET', `/api/reino/replay/${ea.id}`, a.token)
      assert.equal(propria.status, 409)
      assert.equal(propria.json.erro.codigo, 'ESTRADA_DE_HOJE')
      assert.ok(!propria.texto.includes(s.reino._interno.sementeDaEstrada(SEGUNDA)))
      assert.equal((await api('GET', `/api/reino/replay/${ea.id}`, b.token)).status, 404)
      // quem abriu a estrada de hoje e passou da meia-noite com ela aberta não vê a dos outros daquele dia
      relogio.t = (SEGUNDA + 1) * DIA - 60_000 // 23:59
      const eb = await abrir(api, b.token, 'estrada')
      relogio.t = (SEGUNDA + 1) * DIA + 60_000 // 00:01 do dia seguinte, ainda com ela aberta
      assert.equal((await api('GET', `/api/reino/replay/${ea.id}`, b.token)).status, 404)
      await api('POST', '/api/reino/partida/desistir', b.token, { partida: eb.id })
      // amanhã a estrada de ontem pode ser vista (do topo do placar), com a semente
      const ontem = await api('GET', `/api/reino/replay/${ea.id}`, b.token)
      assert.equal(ontem.status, 200, ontem.texto)
      assert.equal(ontem.json.semente, s.reino._interno.sementeDaEstrada(SEGUNDA))
      assert.equal(ontem.json.passos.at(-1).visao.pontos, ea.resultado.pontos)
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- 6. estático e modo

describe('R14 — public/reino/ e modo.json', () => {
  test('o servidor diz "servidor"; o arquivo parado diz "local"; barras repetidas não escapam', async () => {
    const { s, url } = await subir()
    try {
      for (const c of ['/public/reino/modo.json', '/public/reino//modo.json', '/public//reino/modo.json']) {
        const r = await fetch(url + c)
        assert.equal(r.status, 200, c)
        assert.deepEqual(await r.json(), { modo: 'servidor', api: '/api/reino/' }, c)
      }
      assert.deepEqual(await (await fetch(url + '/public/modo.json')).json(), { modo: 'servidor', api: '/api/' })
      assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../../public/reino/modo.json', import.meta.url), 'utf8')), { modo: 'local' })
      const pagina = await fetch(url + '/public/reino/index.html')
      assert.equal(pagina.status, 200)
      assert.match(pagina.headers.get('content-security-policy'), /default-src 'self'/)
      assert.equal((await fetch(url + '/public/reino/js/app.js')).status, 200)
      assert.equal((await fetch(url + '/shared/reino/partida.js')).status, 200)
      assert.equal((await fetch(url + '/public/reino/../../server/reino/reino.mjs')).status, 404)
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- chaves de emergência

describe('R14 — chaves de emergência nas rotas novas', () => {
  test('MANUTENCAO: tudo 503; SAVE_SO_LEITURA: POST 503 e GET sem escrever nada (nem partida parada nem fecho)', async () => {
    const { s, api, conta, relogio } = await subir()
    try {
      const a = await conta()
      const p = await abrir(api, a.token, 'ranking')
      process.env.MANUTENCAO = '1'
      try {
        for (const [m, c, corpo] of [['GET', '/api/reino/perfil'], ['GET', '/api/reino/ranking'], ['POST', '/api/reino/partida', { modo: 'treino' }]]) {
          const r = await api(m, c, a.token, corpo)
          assert.equal(r.status, 503, c)
          assert.equal(r.json.erro.codigo, 'MANUTENCAO')
        }
      } finally { delete process.env.MANUTENCAO }
      relogio.t = (SEGUNDA + 8) * DIA // partida parada e temporada acabada
      process.env.SAVE_SO_LEITURA = '1'
      try {
        const antes = s.db.prepare('SELECT total_changes() n').get().n
        for (const [c, corpo] of [['/api/reino/partida', { modo: 'treino' }], ['/api/reino/partida/comando', { partida: p.id, seq: 0, comando: { tipo: 'batalhar' } }], ['/api/reino/partida/desistir', { partida: p.id }]]) {
          const r = await api('POST', c, a.token, corpo)
          assert.equal(r.status, 503, c)
          assert.equal(r.json.erro.codigo, 'SO_LEITURA')
        }
        for (const c of ['/api/reino/perfil', '/api/reino/ranking', '/api/reino/partida', `/api/reino/replay/${p.id}`]) {
          const r = await api('GET', c, a.token)
          assert.ok([200, 409].includes(r.status), `${c} ${r.status} ${r.texto}`)
        }
        assert.equal(s.db.prepare('SELECT total_changes() n').get().n, antes, 'GET com SAVE_SO_LEITURA escreveu no banco')
        assert.equal(s.db.prepare('SELECT status FROM reino_partidas WHERE id = ?').get(p.id).status, 'aberta')
      } finally { delete process.env.SAVE_SO_LEITURA }
      // desligada a chave, o próximo pedido arruma (partida parada termina, temporada fecha)
      await api('GET', '/api/reino/perfil', a.token)
      assert.equal(s.db.prepare('SELECT status FROM reino_partidas WHERE id = ?').get(p.id).status, 'terminada')
      assert.equal(s.db.prepare('SELECT COUNT(*) n FROM reino_temporadas').get().n, 1)
    } finally { await fechar(s) }
  })
})
