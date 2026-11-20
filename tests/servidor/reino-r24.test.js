// R24 — 3 achados da segurança: conta nova passa pela lista de barrados; a lista compara na mesma forma do apelido único
// (l/I/1 e rn/m juntos); o cursor do ranking não decide a posição nem quem leva o id da partida.
// Rodar: node --test tests/servidor/reino-r24.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { CARTAS } from '../../shared/reino/config.js'
import { iniciar } from '../../server/index.mjs'
import { apelidoBarrado } from '../../server/reino/apelidos-barrados.mjs'

const DIA = 86_400_000
const HORA = 3_600_000
const T0 = (4 + 7 * 3142) * DIA + 10 * HORA
const folga = { contasPorIp: { max: 100_000, janelaMs: 3_600_000 }, pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 1_000_000, janelaMs: 60_000 } }
const reinoFolgado = {
  partidasPorConta: { max: 100_000, janelaMs: 3_600_000 }, partidasPorIp: { max: 100_000, janelaMs: 3_600_000 },
  replaysPorConta: { max: 100_000, janelaMs: 60_000 }, replaysPorIp: { max: 100_000, janelaMs: 60_000 },
  apelidoPorConta: { max: 100_000, janelaMs: 3_600_000 }, apelidoPorIp: { max: 100_000, janelaMs: 3_600_000 },
}

async function subir({ params = {} } = {}) {
  const s = await iniciar({ dbPath: ':memory:', porta: 0, agora: () => T0, log: () => {}, limites: folga, reino: { params: { ...reinoFolgado, ...params } } })
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
  return { s, api, conta, fechar: () => new Promise((ok) => s.servidor.close(ok)) }
}

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
async function jogarUmPouco(api, token, comandos) {
  let r = (await api('POST', '/api/reino/partida', token, { modo: 'ranking' })).json
  for (let i = 0; i < comandos && r.status === 'aberta'; i++) {
    const res = await api('POST', '/api/reino/partida/comando', token, { partida: r.id, seq: r.seq, comando: jogada(r) })
    assert.equal(res.status, 200, res.texto)
    r = res.json
  }
  if (r.status === 'aberta') assert.equal((await api('POST', '/api/reino/partida/desistir', token, { partida: r.id })).status, 200)
}

const EQUIPE_E_OFENSA = ['Keepmile', 'Moderador', 'Suporte Oficial', 'Admin', 'Ádmin', 'Equipe Frayz', 'nazi', 'Hitler', 'Support', 'Dev', 'GM 7', 'Owner', 'The Owner']
const PARECIDOS = ['ADMlN', 'Adrnin', 'Keeprnile', 'OFFlClAL', 'Equlpe', 'Hltler', 'Supp0rt']
const INOCENTES = ['Rei 1', 'Ilha Bela', 'Marina', 'Clara', 'Lucas', 'Leonardo']
const CONTEM_OFENSA_CURTA = ['Nazira', 'Scunthorpe', 'Yoshito'] // nazi, cunt, shit dentro de nome comum

describe('R24 1 — conta nova passa pela lista de barrados', () => {
  test('conta nova com nome barrado → 400 APELIDO_BARRADO', async () => {
    const { api, fechar } = await subir()
    try {
      for (const ruim of [...EQUIPE_E_OFENSA, ...PARECIDOS]) {
        const r = await api('POST', '/api/conta', null, { apelido: ruim })
        assert.equal(r.status, 400, `${ruim}: ${r.texto}`)
        assert.equal(r.json.erro.codigo, 'APELIDO_BARRADO', ruim)
      }
      for (const bom of [...INOCENTES, ...CONTEM_OFENSA_CURTA]) assert.equal((await api('POST', '/api/conta', null, { apelido: bom })).status, 201, bom)
    } finally { await fechar() }
  })
})

describe('R24 2 — a lista compara na forma do apelido único (l/I/1, rn/m)', () => {
  test('letras parecidas não escapam da lista; nomes comuns passam', () => {
    for (const ruim of PARECIDOS) assert.equal(apelidoBarrado(ruim), true, ruim)
    for (const bom of INOCENTES) assert.equal(apelidoBarrado(bom), false, bom)
  })

  test('ofensa curta barra só como palavra inteira; dentro de nome comum passa', () => {
    for (const bom of CONTEM_OFENSA_CURTA) assert.equal(apelidoBarrado(bom), false, bom)
    for (const ruim of ['nazi', 'Nazi Boy', 'NaziBoy', 'x_nazi', 'N4zi', 'shit123', 'F u c k', 'sh1t', 'Dev', 'dev_ana', 'GM 7']) assert.equal(apelidoBarrado(ruim), true, ruim)
    for (const bom of ['Devon', 'Sigma', 'Downer']) assert.equal(apelidoBarrado(bom), false, bom)
  })

  test('troca de apelido também barra os parecidos e deixa os comuns', async () => {
    const { api, conta, fechar } = await subir()
    try {
      const a = await conta()
      for (const ruim of PARECIDOS) {
        const r = await api('POST', '/api/reino/apelido', a.token, { apelido: ruim })
        assert.equal(r.json?.erro?.codigo, 'APELIDO_BARRADO', ruim)
      }
      for (const bom of ['Marina', 'Leonardo', 'Nazira']) assert.equal((await api('POST', '/api/reino/apelido', (await conta()).token, { apelido: bom })).status, 200, bom)
    } finally { await fechar() }
  })
})

describe('R24 3 — cursor do ranking', () => {
  test('cursor forjado não numera errado nem entrega id de partida de fora do topo', async () => {
    const { s, api, conta, fechar } = await subir({ params: { topoComReplay: 3, paginaDoRanking: 5 } })
    try {
      for (let i = 0; i < 8; i++) await jogarUmPouco(api, (await conta('Jog ' + i)).token, 4 + i)
      const eu = await conta('Olheiro')
      const todas = s.db.prepare('SELECT conta_id, soma, quando FROM reino_pontuacao ORDER BY soma DESC, quando ASC, conta_id ASC').all()
      assert.equal(todas.length, 8)
      const forjar = (l, posicao) => Buffer.from(`${l.soma}:${l.quando}:${l.conta_id}:${posicao}`).toString('base64url')

      // depois do 5º, dizendo "posição 0": tem que vir 6, 7, 8 e nenhum id de partida
      let r = await api('GET', '/api/reino/ranking?cursor=' + forjar(todas[4], 0), eu.token)
      assert.equal(r.status, 200, r.texto)
      assert.deepEqual(r.json.lista.map((l) => l.posicao), [6, 7, 8])
      assert.deepEqual(r.json.lista.map((l) => l.partida), [null, null, null])

      // depois do 1º, dizendo "posição 900": tem que vir 2..6, com id só para 2 e 3 (topo = 3)
      r = await api('GET', '/api/reino/ranking?cursor=' + forjar(todas[0], 900), eu.token)
      assert.deepEqual(r.json.lista.map((l) => l.posicao), [2, 3, 4, 5, 6])
      assert.deepEqual(r.json.lista.map((l) => l.partida !== null), [true, true, false, false, false])

      // o cursor de verdade continua igual
      const p1 = (await api('GET', '/api/reino/ranking', eu.token)).json
      assert.deepEqual(p1.lista.map((l) => l.posicao), [1, 2, 3, 4, 5])
      const p2 = (await api('GET', '/api/reino/ranking?cursor=' + p1.proximo, eu.token)).json
      assert.deepEqual(p2.lista.map((l) => l.posicao), [6, 7, 8])
    } finally { await fechar() }
  })
})
