// R39 (servidor) — vitória na rodada 20 (`venceu`) e as 30 conquistas (docs/reino/r39-desenho.md).
// O servidor usa shared/reino/conquistas.js; `venceu` sai do número de vencidas JÁ conferido; conquista nunca vem da tela.
// Rodar: node --test tests/servidor/reino-r39.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { ALBUM, CARTAS } from '../../shared/reino/config.js'
import { LISTA } from '../../shared/reino/conquistas.js'
import { iniciar } from '../../server/index.mjs'
import { abrirBanco, MIGRACOES, VERSAO_DO_BANCO } from '../../server/db.mjs'
import { temporadaDoDia } from '../../server/reino/reino.mjs'
import { criarJogo } from '../../server/jogo.mjs'

const DIA = 86_400_000
const HORA = 3_600_000
const SEGUNDA = 4 + 7 * 3142
const T0 = SEGUNDA * DIA + 10 * HORA // segunda, 10:00 UTC
const folga = { contasPorIp: { max: 100_000, janelaMs: 3_600_000 }, pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 1_000_000, janelaMs: 60_000 } }
const reinoFolgado = {
  partidasPorConta: { max: 100_000, janelaMs: 3_600_000 }, partidasPorIp: { max: 100_000, janelaMs: 3_600_000 },
  replaysPorConta: { max: 100_000, janelaMs: 60_000 }, replaysPorIp: { max: 100_000, janelaMs: 60_000 },
}

async function subir({ t = T0, dbPath = ':memory:' } = {}) {
  const relogio = { t }
  const s = await iniciar({ dbPath, porta: 0, agora: () => relogio.t, log: () => {}, limites: folga, reino: { params: reinoFolgado } })
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
  return { s, api, conta, relogio }
}
const fechar = (s) => new Promise((ok) => s.servidor.close(ok))
const abrir = async (api, token, modo) => {
  const r = await api('POST', '/api/reino/partida', token, { modo })
  assert.equal(r.status, 201, r.texto)
  return r.json
}
/** Joga como as outras baterias: põe tropa primeiro, sobe nível, pega o 1º espólio, luta. */
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
const cmd = (api, token, p, comando) => api('POST', '/api/reino/partida/comando', token, { partida: p.id, seq: p.seq, comando })

/** Partida terminada gravada direto no banco (como o servidor grava). */
function gravarTerminada(db, { id, conta, modo = 'treino', dia, vencidas, pontos = vencidas * 100, conferida = 1, quando }) {
  db.prepare(`INSERT INTO reino_partidas (id, conta_id, modo, dia, temporada, semente, liberadas, comandos, tempos, seq, status, motivo, pontos, vencidas, rodada,
               conferida, criada_em, tocada_em, terminada_em) VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', 0, 'terminada', 'sem_vidas', ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, conta, modo, dia, temporadaDoDia(dia), 'cd'.repeat(16), JSON.stringify(ALBUM.inicial), pontos, vencidas, vencidas + 1, conferida, quando, quando, quando)
}
const pid = (k) => `pa_${String(k).padStart(2, '0').repeat(12)}`

// ---------------------------------------------------------------- perfil
describe('R39 — perfil', () => {
  test('perfil.conquistas tem as 30 da LISTA, na ordem, todas por fazer; recordes.vitorias = 0', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const p = (await api('GET', '/api/reino/perfil', a.token)).json
      assert.equal(p.conquistas.length, 30)
      assert.deepEqual(p.conquistas.map((c) => c.id), LISTA.map((c) => c.id))
      assert.ok(p.conquistas.every((c) => c.feita === false && c.quando === null))
      assert.equal(p.recordes.vitorias, 0)
    } finally { await fechar(s) }
  })

  test('partida antiga com 21 vencidas → venceu: true (melhores, recordes.vitorias, replay, última); não conferida não conta', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const dia = Math.floor(T0 / DIA)
      // (segurança R39: vitória em treino não entra em recordes.vitorias; esta partida é de ranking)
      gravarTerminada(s.db, { id: pid(1), conta: a.id, modo: 'ranking', dia, vencidas: 21, quando: T0 - 3000 })
      gravarTerminada(s.db, { id: pid(2), conta: a.id, dia, vencidas: 14, quando: T0 - 2000 }) // R42 (a regra mudou: decisão de 20/11 10:10, vitória 20 → 15, Encore! 25 → 17, último degrau 400 → 300): a partida que NÃO venceu tinha 19 vencidas, agora 14
      gravarTerminada(s.db, { id: pid(3), conta: a.id, dia, vencidas: 30, conferida: 0, quando: T0 - 1000 })
      const p = (await api('GET', '/api/reino/perfil', a.token)).json
      assert.equal(p.recordes.vitorias, 1)
      const m = Object.fromEntries(p.melhores.map((x) => [x.id, x.venceu]))
      assert.deepEqual(m, { [pid(1)]: true, [pid(2)]: false })
      const rp = await api('GET', `/api/reino/replay/${pid(1)}`, a.token)
      assert.equal(rp.status, 200, rp.texto)
      assert.equal(rp.json.resultado.venceu, true)
      assert.equal((await api('GET', `/api/reino/replay/${pid(2)}`, a.token)).json.resultado.venceu, false)
      const ult = (await api('GET', '/api/reino/partida/ultima', a.token)).json.partida
      assert.equal(ult.id, pid(3))
      assert.equal(ult.resultado.conta, false)
      assert.equal(ult.resultado.venceu, false, 'refeita não bateu: não venceu')
    } finally { await fechar(s) }
  })
})

describe('R39 — recordes.vitorias (achado da segurança)', () => {
  test('recordes.vitorias não desce quando treinos além do teto são apagados (vitória em treino não entra)', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const dia = Math.floor(T0 / DIA)
      gravarTerminada(s.db, { id: pid(90), conta: a.id, modo: 'ranking', dia, vencidas: 22, quando: T0 - 500_000 })
      gravarTerminada(s.db, { id: pid(91), conta: a.id, modo: 'estrada', dia, vencidas: 20, quando: T0 - 499_000 })
      for (let k = 0; k < 110; k++) gravarTerminada(s.db, { id: `pa_t${String(k).padStart(23, '0')}`, conta: a.id, dia, vencidas: 20, pontos: 100 + k, quando: T0 - 400_000 + k })
      const antes = (await api('GET', '/api/reino/perfil', a.token)).json.recordes.vitorias
      assert.equal(antes, 2)
      const p = await abrir(api, a.token, 'treino')
      assert.equal((await api('POST', '/api/reino/partida/desistir', a.token, { partida: p.id })).status, 200)
      assert.ok(s.db.prepare("SELECT COUNT(*) n FROM reino_partidas WHERE conta_id = ? AND modo = 'treino'").get(a.id).n < 111, 'teto apagou treinos')
      assert.equal((await api('GET', '/api/reino/perfil', a.token)).json.recordes.vitorias, 2)
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- partida e placares
describe('R39 — venceu na partida e nos placares da estrada', () => {
  test('Partida: visao.venceu e resultado.venceu (terminada); aberta tem resultado null', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const p = await abrir(api, a.token, 'treino')
      assert.equal(p.visao.venceu, false)
      assert.equal(p.resultado, null)
      const d = await api('POST', '/api/reino/partida/desistir', a.token, { partida: p.id })
      assert.equal(d.status, 200, d.texto)
      assert.equal(d.json.resultado.venceu, false)
      assert.equal(d.json.visao.fim.venceu, false)
      // forjando o estado gravado (só o teste mexe no banco): 20 vencidas → a próxima resposta diz venceu
      const q = await abrir(api, a.token, 'treino')
      s.db.prepare("UPDATE reino_partidas SET estado = json_set(estado, '$.vencidas', 20) WHERE id = ?").run(q.id)
      const r = await api('POST', '/api/reino/partida/desistir', a.token, { partida: q.id })
      assert.equal(r.json.visao.venceu, true)
      // a conferência refaz pela semente: as 20 forjadas não batem, então não conta e não venceu
      assert.equal(r.json.resultado.conta, false)
      assert.equal(r.json.resultado.venceu, false)
    } finally { await fechar(s) }
  })

  test('estradaDoDia.lista[].venceu e estradaDeOntem.lista[].venceu', async () => {
    const { s, api, conta, relogio } = await subir({ t: T0 - 2 * DIA })
    try {
      const a = await conta('Forte')
      const b = await conta('Fraco')
      relogio.t = T0
      const hoje = Math.floor(T0 / DIA)
      for (const [k, x] of [[10, a], [11, b]]) gravarTerminada(s.db, { id: pid(k), conta: x.id, modo: 'ranking', dia: hoje - 2, vencidas: 1, quando: T0 - 2 * DIA + 1000 })
      gravarTerminada(s.db, { id: pid(20), conta: a.id, modo: 'estrada', dia: hoje, vencidas: 22, quando: T0 - 1000 })
      gravarTerminada(s.db, { id: pid(21), conta: b.id, modo: 'estrada', dia: hoje, vencidas: 3, quando: T0 - 900 })
      gravarTerminada(s.db, { id: pid(22), conta: a.id, modo: 'estrada', dia: hoje - 1, vencidas: 20, quando: T0 - DIA })
      const r = (await api('GET', '/api/reino/ranking', b.token)).json
      assert.deepEqual(r.estradaDoDia.lista.map((l) => [l.apelido, l.venceu]), [['Forte', true], ['Fraco', false]])
      assert.deepEqual(r.estradaDeOntem.lista.map((l) => [l.apelido, l.venceu]), [['Forte', true]])
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- conquistas pelo servidor
describe('R39 — conquistas novas calculadas pelo servidor', () => {
  test('degrau: conta com 24 rodadas somadas vence 1 → Tally Stick (com data); o perfil mostra feita', async () => {
    const { s, api, conta, relogio } = await subir()
    try {
      const a = await conta()
      s.db.prepare('INSERT INTO reino_contas (conta_id, rodadas_vencidas, energia_saldo, energia_dia, criada_em) VALUES (?, 24, 3, ?, ?)').run(a.id, SEGUNDA, T0)
      let p = await abrir(api, a.token, 'treino')
      const ganhas = []
      relogio.t += 60_000
      while (p.status === 'aberta' && !ganhas.includes('tally25')) {
        const r = await cmd(api, a.token, p, jogada(p))
        assert.equal(r.status, 200, r.texto)
        p = r.json
        ganhas.push(...p.novidades.conquistas)
      }
      assert.ok(ganhas.includes('tally25'), ganhas.join(','))
      assert.ok(!ganhas.includes('tally50'))
      const perfil = (await api('GET', '/api/reino/perfil', a.token)).json
      assert.deepEqual(perfil.conquistas.find((c) => c.id === 'tally25'), { id: 'tally25', feita: true, quando: new Date(relogio.t).toISOString() })
    } finally { await fechar(s) }
  })

  test('reino: família ligada, construção e magia no nível 5, carta L e 3 relíquias (estado do servidor)', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const q = await abrir(api, a.token, 'treino')
      const terrenos = [{ carta: 'T01', nivel: 1 }, { carta: 'T02', nivel: 1 }, { carta: 'B01', nivel: 5 }, { carta: 'M08', nivel: 5 }, null, null]
      s.db.prepare("UPDATE reino_partidas SET estado = json_set(estado, '$.terrenos', json(?), '$.reliquias', json(?)) WHERE id = ?")
        .run(JSON.stringify(terrenos), JSON.stringify(['bell', 'fuse', 'ledger']), q.id)
      const r = await api('POST', '/api/reino/partida/desistir', a.token, { partida: q.id })
      assert.equal(r.status, 200, r.texto)
      assert.deepEqual(r.json.novidades.conquistas.filter((c) => ['shields', 'mason', 'spicy', 'grand', 'pockets', 'brass'].includes(c)).sort(),
        ['brass', 'grand', 'mason', 'pockets', 'shields', 'spicy'])
      const perfil = (await api('GET', '/api/reino/perfil', a.token)).json
      assert.equal(perfil.conquistas.filter((c) => c.feita).length, r.json.novidades.conquistas.length)
    } finally { await fechar(s) }
  })

  test('conquista nunca vem da tela: campo a mais no comando é recusado e nada é ganho', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const p = await abrir(api, a.token, 'treino')
      const r = await cmd(api, a.token, p, { tipo: 'desistir', conquista: 'grand' })
      assert.equal(r.status, 400, r.texto)
      const r2 = await api('POST', '/api/reino/partida/comando', a.token, { partida: p.id, seq: 0, comando: { tipo: 'desistir' }, conquistas: ['grand'] })
      assert.equal(r2.status, 400, r2.texto)
      const perfil = (await api('GET', '/api/reino/perfil', a.token)).json
      assert.ok(perfil.conquistas.every((c) => !c.feita))
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- migração v8
describe('R39 — migração v8 (só dados)', () => {
  test('v7 usado → v8: liga tally25–200 e encore sem data, mantém as 12 com data; cópia antes; 2º boot não muda nada', async () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'keepmile-v7-'))
    const arq = path.join(pasta, 'v7.db')
    const db7 = abrirBanco(arq, { migracoes: MIGRACOES.slice(0, 7), agora: () => T0 })
    const jogo = criarJogo(db7, { agora: () => T0, log: () => {} })
    const vet = jogo.criarConta('Veterana Oito')
    const nova = jogo.criarConta('Novata Oito')
    const trapaca = jogo.criarConta('Torta Oito')
    const dia = Math.floor(T0 / DIA)
    const antigas = ['supper', 'road', 'plate', 'last', 'house', 'brass', 'family', 'penny', 'double', 'mole', 'pudding', 'librarian']
    const quando = Object.fromEntries(antigas.map((id, i) => [id, T0 - (i + 1) * HORA]))
    const ins = db7.prepare('INSERT INTO reino_contas (conta_id, rodadas_vencidas, partidas, recorde, energia_saldo, energia_dia, conquistas, conquistas_quando, criada_em) VALUES (?, ?, ?, ?, 3, ?, ?, ?, ?)')
    ins.run(vet.conta.id, 230, 12, 2600, dia, JSON.stringify(antigas), JSON.stringify(quando), T0 - 30 * DIA)
    ins.run(nova.conta.id, 3, 1, 300, dia, '["supper"]', JSON.stringify({ supper: T0 - HORA }), T0 - DIA)
    ins.run(trapaca.conta.id, 60, 3, 0, dia, '[]', '{}', T0 - DIA)
    gravarTerminada(db7, { id: pid(1), conta: vet.conta.id, modo: 'ranking', dia, vencidas: 26, quando: T0 - 5 * HORA })
    gravarTerminada(db7, { id: pid(2), conta: vet.conta.id, dia, vencidas: 12, quando: T0 - 4 * HORA })
    gravarTerminada(db7, { id: pid(3), conta: trapaca.conta.id, dia, vencidas: 40, conferida: 0, quando: T0 - 4 * HORA })
    assert.equal(db7.prepare('PRAGMA user_version').get().user_version, 7)
    db7.close()

    let foto
    const { s, api } = await subir({ dbPath: arq, t: T0 + 60_000 })
    try {
      assert.equal(VERSAO_DO_BANCO, 8)
      assert.equal(s.db.prepare('PRAGMA user_version').get().user_version, 8)
      const copias = fs.readdirSync(path.join(pasta, 'copias')).filter((n) => n.startsWith('v7.db.v7.'))
      assert.equal(copias.length, 1, copias.join(','))
      const c = new DatabaseSync(path.join(pasta, 'copias', copias[0]), { readOnly: true })
      assert.equal(c.prepare('PRAGMA user_version').get().user_version, 7)
      assert.equal(JSON.parse(c.prepare('SELECT conquistas FROM reino_contas WHERE conta_id = ?').get(vet.conta.id).conquistas).length, 12)
      c.close()

      const p = (await api('GET', '/api/reino/perfil', vet.token)).json
      const por = Object.fromEntries(p.conquistas.map((x) => [x.id, x]))
      assert.equal(p.conquistas.length, 30)
      for (const id of antigas) assert.deepEqual(por[id], { id, feita: true, quando: new Date(quando[id]).toISOString() }, id)
      for (const id of ['tally25', 'tally50', 'tally100', 'tally200', 'encore']) assert.deepEqual(por[id], { id, feita: true, quando: null }, id)
      assert.equal(por.tally400.feita, false)
      for (const id of ['thread', 'seconds', 'nopatch', 'scratch', 'shields', 'bows', 'dish', 'sparks', 'mason', 'spicy', 'pockets', 'grand']) assert.equal(por[id].feita, false, `${id}: luta só vale daqui para frente`)
      assert.equal(p.recordes.vitorias, 1)
      assert.equal(p.album.rodadasVencidas, 230)

      const pn = (await api('GET', '/api/reino/perfil', nova.token)).json
      assert.deepEqual(pn.conquistas.filter((x) => x.feita).map((x) => x.id), ['supper'])
      const pt = (await api('GET', '/api/reino/perfil', trapaca.token)).json
      assert.deepEqual(pt.conquistas.filter((x) => x.feita).map((x) => x.id), ['tally25', 'tally50'], 'encore só por partida conferida')
      foto = s.db.prepare('SELECT * FROM reino_contas ORDER BY conta_id').all()
    } finally { await fechar(s) }

    // 2º boot: nada a migrar, nenhuma cópia nova, nada muda
    const s2 = await subir({ dbPath: arq, t: T0 + 120_000 })
    try {
      assert.equal(s2.s.db.prepare('PRAGMA user_version').get().user_version, 8)
      assert.deepEqual(s2.s.db.prepare('SELECT * FROM reino_contas ORDER BY conta_id').all(), foto)
      assert.equal(fs.readdirSync(path.join(pasta, 'copias')).length, 1)
    } finally { await fechar(s2.s) }
  })

  test('a migração v8 rodada de novo no mesmo banco não muda nada (idempotente)', () => {
    const db = abrirBanco(':memory:', { migracoes: MIGRACOES.slice(0, 7) })
    try {
      const jogo = criarJogo(db, { agora: () => T0, log: () => {} })
      const { conta } = jogo.criarConta('Repete Oito')
      db.prepare("INSERT INTO reino_contas (conta_id, rodadas_vencidas, energia_saldo, energia_dia, conquistas, conquistas_quando, criada_em) VALUES (?, 120, 3, 0, '[\"tally25\",\"supper\"]', ?, ?)")
        .run(conta.id, JSON.stringify({ tally25: T0, supper: T0 }), T0)
      MIGRACOES[7](db, { agora: () => T0 })
      const uma = db.prepare('SELECT conquistas, conquistas_quando FROM reino_contas').get()
      assert.deepEqual(JSON.parse(uma.conquistas), ['tally25', 'supper', 'tally50', 'tally100'])
      assert.deepEqual(JSON.parse(uma.conquistas_quando), { tally25: T0, supper: T0 })
      MIGRACOES[7](db, { agora: () => T0 })
      assert.deepEqual(db.prepare('SELECT conquistas, conquistas_quando FROM reino_contas').get(), uma)
    } finally { db.close() }
  })

  test('v8 sobe com 1 conta de conquistas estragado e não mexe nela', () => {
    const db = abrirBanco(':memory:', { migracoes: MIGRACOES.slice(0, 7) })
    const avisos = []
    const logAntes = console.log
    try {
      const jogo = criarJogo(db, { agora: () => T0, log: () => {} })
      const ins = db.prepare('INSERT INTO reino_contas (conta_id, rodadas_vencidas, energia_saldo, energia_dia, conquistas, criada_em) VALUES (?, 300, 3, 0, ?, ?)')
      const ids = []
      for (const [k, txt] of [['Quebrada Um', '[supper'], ['Quebrada Dois', '{}'], ['Quebrada Tres', 'null'], ['Inteira', '[]']]) {
        const { conta } = jogo.criarConta(k)
        ins.run(conta.id, txt, T0)
        ids.push([conta.id, txt])
      }
      console.log = (...x) => avisos.push(x.join(' '))
      MIGRACOES[7](db, { agora: () => T0 })
      console.log = logAntes
      const ler = (id) => db.prepare('SELECT conquistas FROM reino_contas WHERE conta_id = ?').get(id).conquistas
      for (const [id, txt] of ids.slice(0, 3)) assert.equal(ler(id), txt, 'estragada fica como estava')
      assert.deepEqual(JSON.parse(ler(ids[3][0])), ['tally25', 'tally50', 'tally100', 'tally200', 'tally400']) // R42 (a regra mudou: decisão de 20/11 10:10, vitória 20 → 15, Encore! 25 → 17, último degrau 400 → 300): 300 rodadas somadas já ligam o último degrau
      assert.equal(avisos.length, 3, avisos.join('\n'))
      for (const a of avisos) assert.ok(/AVISO/.test(a) && !/Quebrada/.test(a), a)
    } finally { console.log = logAntes; db.close() }
  })

  test('banco novo nasce na v8', () => {
    const db = abrirBanco(':memory:')
    try { assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8) } finally { db.close() }
  })
})
