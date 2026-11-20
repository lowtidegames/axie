// R31 — a Partida de /api/reino traz as chances VERDADEIRAS do motor (visao.chances e visao.chanceReliquia), sem campo de entrada novo.
// Rodar: node --test tests/servidor/reino-r31.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { ALBUM, CARTAS, PARTIDA, RARIDADES } from '../../shared/reino/config.js'
import { chancesReais } from '../../shared/reino/partida.js'
import { iniciar } from '../../server/index.mjs'

const DIA = 86_400_000
const HORA = 3_600_000
const T0 = (4 + 7 * 3142) * DIA + 10 * HORA
const folga = { contasPorIp: { max: 100_000, janelaMs: 3_600_000 }, pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 1_000_000, janelaMs: 60_000 } }
const reinoFolgado = {
  partidasPorConta: { max: 100_000, janelaMs: 3_600_000 }, partidasPorIp: { max: 100_000, janelaMs: 3_600_000 },
  replaysPorConta: { max: 100_000, janelaMs: 60_000 }, replaysPorIp: { max: 100_000, janelaMs: 60_000 },
}

async function subir() {
  const s = await iniciar({ dbPath: ':memory:', porta: 0, agora: () => T0, log: () => {}, limites: folga, reino: { params: reinoFolgado } })
  const url = `http://127.0.0.1:${s.porta}`
  async function api(metodo, caminho, token, corpo) {
    const r = await fetch(url + caminho, {
      method: metodo,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    })
    const texto = await r.text()
    return { status: r.status, json: JSON.parse(texto), texto }
  }
  const conta = async (apelido) => (await api('POST', '/api/conta', null, { apelido })).json.token
  return { api, conta, fechar: () => new Promise((ok) => s.servidor.close(ok)) }
}

const mapa = (l) => Object.fromEntries(l.map((r) => [r.id, r.chance]))
const tropas = ALBUM.inicial.filter((id) => CARTAS[id].tipo === 'tropa' && CARTAS[id].dano > 0)

/** Joga até a rodada 2 (põe uma Tropa, luta, pega o espólio de ouro). */
async function ateRodada2(api, token, r) {
  for (let i = 0; i < 40 && r.status === 'aberta' && r.visao.rodada === 1; i++) {
    const o = r.opcoes
    const cmd = o.fase === 'espolio' ? (o.comandos.find((c) => c.tipo === 'espolio' && r.visao.espolios[c.indice].tipo === 'bolsa') ?? o.comandos.find((c) => c.tipo === 'espolio'))
      : !r.visao.cartaPosta ? o.comandos.find((c) => c.tipo === 'por' && CARTAS[c.carta].tipo === 'tropa' && !r.visao.terrenos[c.terreno - 1]) ?? { tipo: 'batalhar' }
        : { tipo: 'batalhar' }
    const res = await api('POST', '/api/reino/partida/comando', token, { partida: r.id, seq: r.seq, comando: cmd })
    assert.equal(res.status, 200, res.texto)
    r = res.json
  }
  return r
}

describe('R31 — chances verdadeiras na Partida do servidor', () => {
  test('ranking, treino e estrada: visao.chances = chancesReais das cartas da mão (álbum inicial: 50/50, o resto 0); chanceReliquia do motor', async () => {
    const { api, conta, fechar } = await subir()
    try {
      const token = await conta('Chance Um')
      for (const modo of ['treino', 'estrada', 'ranking']) {
        const r = await api('POST', '/api/reino/partida', token, { modo })
        assert.equal(r.status, 201, r.texto)
        const v = r.json.visao
        assert.deepEqual(v.chances, chancesReais(tropas), modo)
        assert.deepEqual(mapa(v.chances), { C: 50, U: 50, R: 0, E: 0, L: 0 }, modo)
        assert.equal(v.chances.reduce((s, x) => s + x.chance, 0), 100)
        assert.deepEqual(v.chances.map((x) => x.nome), RARIDADES.map((x) => x.nome))
        assert.equal(v.chanceReliquia, PARTIDA.bolsa.chanceReliquia)
        const g = await api('GET', `/api/reino/partida?modo=${modo}`, token)
        assert.deepEqual(g.json.partida.visao.chances, v.chances, `GET ${modo}`)
        if (modo === 'ranking') {
          const r2 = await ateRodada2(api, token, r.json)
          assert.equal(r2.visao.rodada, 2)
          assert.deepEqual(r2.visao.chances, chancesReais(ALBUM.inicial))
        }
        assert.equal((await api('POST', '/api/reino/partida/desistir', token, { partida: r.json.id })).status, 200)
      }
    } finally { await fechar() }
  })
  test('campo de entrada novo continua recusado (nada de "chances" vindo da tela)', async () => {
    const { api, conta, fechar } = await subir()
    try {
      const token = await conta('Chance Dois')
      const r = await api('POST', '/api/reino/partida', token, { modo: 'treino', chances: [{ id: 'L', chance: 100 }] })
      assert.equal(r.status, 400, r.texto)
    } finally { await fechar() }
  })
})
