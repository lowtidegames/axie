// Tarefa R14 — banco do Keepmile: migração v4 → v5 com banco usado (cópia antes), banco em arquivo sem WAL crescendo
// (lição S2-1) e o jogo antigo funcionando no mesmo banco.
// Rodar: node --test tests/servidor/reino-api-banco.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { iniciar } from '../../server/index.mjs'
import { abrirBanco, MIGRACOES, VERSAO_DO_BANCO } from '../../server/db.mjs'
import { criarJogo } from '../../server/jogo.mjs'

const T0 = 1_960_000_000_000
const folga = { contasPorIp: { max: 100_000, janelaMs: 3_600_000 }, pedidosPorConta: { max: 1_000_000, janelaMs: 60_000 }, pedidosPorIp: { max: 1_000_000, janelaMs: 60_000 } }
const reinoFolgado = { partidasPorConta: { max: 100_000, janelaMs: 3_600_000 }, partidasPorIp: { max: 100_000, janelaMs: 3_600_000 } }

async function subir(dbPath, t = T0) {
  const s = await iniciar({ dbPath, porta: 0, agora: () => t, log: () => {}, limites: folga, reino: { params: reinoFolgado } })
  const url = `http://127.0.0.1:${s.porta}`
  const api = async (metodo, caminho, token, corpo) => {
    const r = await fetch(url + caminho, {
      method: metodo,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    })
    return { status: r.status, json: await r.json() }
  }
  return { s, api }
}
const fechar = (s) => new Promise((ok) => s.servidor.close(ok))

describe('R14 — migração v4 → v5', () => {
  test('banco usado da v4 (contas, bonecos, luta encerrada): cópia antes, v5 depois, jogo antigo e Keepmile funcionam', async () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'keepmile-v4-'))
    const arq = path.join(pasta, 'v4.db')
    // banco "usado" na v4, com o jogo antigo de verdade
    const db4 = abrirBanco(arq, { migracoes: MIGRACOES.slice(0, 4), agora: () => T0 })
    const jogo = criarJogo(db4, { agora: () => T0, log: () => {} })
    const { conta, token } = jogo.criarConta('Veterana')
    const ids = jogo.estado(conta.id).bonecos.map((b) => b.id)
    const luta = jogo.novaLuta(conta.id, { modo: 'livre', time: ids.slice(0, 3), robo: 'ganancioso' })
    jogo.desistir(conta.id, luta.id)
    assert.equal(db4.prepare('PRAGMA user_version').get().user_version, 4)
    db4.close()

    const { s, api } = await subir(arq, T0 + 60_000)
    try {
      // regra mudou (R16, K1): entrou a v6 (resposta guardada na partida); a v4 migra até ela, com a cópia da v4 antes
      // regra mudou (R22): entrou a v7 (troca de apelido e data das conquistas); a v4 migra até ela, com a cópia da v4 antes
      // regra mudou (R39): entrou a v8 (só dados: conquistas de degrau)
      assert.equal(VERSAO_DO_BANCO, 9) // regra mudou (R46): entrou a v9 (regra de cada partida)
      assert.equal(s.db.prepare('PRAGMA user_version').get().user_version, 9) // regra mudou (R46): entrou a v9 (regra de cada partida)
      // cópia ANTES da migração, com a versão de antes no nome e os dados de antes dentro
      const copias = fs.readdirSync(path.join(pasta, 'copias')).filter((n) => n.startsWith('v4.db.v4.'))
      assert.equal(copias.length, 1, copias.join(','))
      const c = new DatabaseSync(path.join(pasta, 'copias', copias[0]), { readOnly: true })
      assert.equal(c.prepare('PRAGMA user_version').get().user_version, 4)
      assert.equal(c.prepare('SELECT apelido FROM contas').get().apelido, 'Veterana')
      assert.equal(c.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name LIKE 'reino_%'").get().n, 0)
      c.close()
      // segredo da estrada do dia criado na migração
      assert.match(s.db.prepare("SELECT valor FROM meta WHERE chave = 'reino_segredo'").get().valor, /^[0-9a-f]{64}$/)
      // jogo antigo: mesma sessão, mesmos bonecos, luta encerrada com replay
      const est = await api('GET', '/api/estado', token)
      assert.equal(est.status, 200)
      assert.equal(est.json.conta.apelido, 'Veterana')
      assert.equal(est.json.colecao.total, 9)
      assert.equal((await api('GET', `/api/luta/${luta.id}/replay`, token)).status, 200)
      // Keepmile com a mesma conta
      const p = await api('POST', '/api/reino/partida', token, { modo: 'ranking' })
      assert.equal(p.status, 201, JSON.stringify(p.json))
      assert.equal(p.json.energia.atual, 2)
      assert.equal((await api('GET', '/api/reino/perfil', token)).json.apelido, 'Veterana')
    } finally { await fechar(s) }
    // reabrir não migra de novo nem faz outra cópia
    const { s: s2 } = await subir(arq, T0 + 120_000)
    try {
      assert.equal(fs.readdirSync(path.join(pasta, 'copias')).length, 1)
      assert.equal(s2.db.prepare("SELECT COUNT(*) n FROM reino_partidas WHERE status = 'aberta'").get().n, 1)
    } finally { await fechar(s2) }
  })

  test('banco novo nasce direto na v5 (sem cópia: não havia dados)', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'keepmile-novo-'))
    const db = abrirBanco(path.join(pasta, 'novo.db'))
    try {
      assert.equal(db.prepare('PRAGMA user_version').get().user_version, VERSAO_DO_BANCO)
      for (const t of ['reino_contas', 'reino_partidas', 'reino_pontuacao', 'reino_temporadas', 'reino_titulos']) {
        assert.equal(db.prepare('SELECT COUNT(*) n FROM sqlite_master WHERE type = ? AND name = ?').get('table', t).n, 1, t)
      }
      assert.equal(fs.existsSync(path.join(pasta, 'copias')), false)
    } finally { db.close() }
  })
})

describe('R14 — banco em arquivo: o WAL não cresce (lição S2-1)', () => {
  test('600 comandos de partida em arquivo: -wal até 8 MB e nenhuma transação presa', async () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'keepmile-wal-'))
    const arq = path.join(pasta, 'wal.db')
    const { s, api } = await subir(arq)
    try {
      const r = await api('POST', '/api/conta', null, { apelido: 'Gasta Banco' })
      const token = r.json.token
      let n = 0
      while (n < 600) {
        let p = (await api('POST', '/api/reino/partida', token, { modo: 'treino' })).json
        while (p.status === 'aberta' && n < 600) {
          const o = p.opcoes
          // sortear e lutar bastante: muitas escritas por partida
          const cmd = o.fase === 'espolio' ? o.comandos.find((c) => c.tipo === 'espolio')
            : (!p.visao.cartaPosta && o.comandos.find((c) => c.tipo === 'por' && !p.visao.terrenos[c.terreno - 1])) || { tipo: 'batalhar' }
          const res = await api('POST', '/api/reino/partida/comando', token, { partida: p.id, seq: p.seq, comando: cmd })
          assert.equal(res.status, 200, JSON.stringify(res.json))
          p = res.json
          n++
        }
        if (p.status === 'aberta') await api('POST', '/api/reino/partida/desistir', token, { partida: p.id })
        await api('GET', '/api/reino/ranking', token)
        await api('GET', '/api/reino/perfil', token)
      }
      const mb = fs.statSync(`${arq}-wal`).size / 1048576
      console.log(`R14: WAL depois de 600 comandos do Keepmile: ${mb.toFixed(2)} MB`)
      assert.ok(mb <= 8, `WAL com ${mb.toFixed(1)} MB`)
      assert.equal(s.db.isTransaction, false)
    } finally { await fechar(s) }
  })
})
