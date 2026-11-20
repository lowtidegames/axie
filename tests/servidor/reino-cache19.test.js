// R19 — replay guardado como texto (memória contada de verdade) · placar do dia D só com ranking terminado ATÉ o fim de D.
// Só limites técnicos do servidor e ordem do placar; nenhuma regra de jogo nem número de economia muda.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { CARTAS } from '../../shared/reino/config.js'
import { iniciar } from '../../server/index.mjs'

const DIA = 86_400_000
const SEGUNDA = 4 + 7 * 3142 // um dia que é segunda-feira
const T0 = SEGUNDA * DIA + 10 * 3_600_000 // segunda, 10:00 UTC
const folga = { contasPorIp: { max: 100_000, janelaMs: 3_600_000 }, pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 1_000_000, janelaMs: 60_000 } }
const reinoFolgado = {
  partidasPorConta: { max: 100_000, janelaMs: 3_600_000 }, partidasPorIp: { max: 100_000, janelaMs: 3_600_000 },
  replaysPorConta: { max: 100_000, janelaMs: 60_000 }, replaysPorIp: { max: 100_000, janelaMs: 60_000 },
}

async function subir({ t = T0, params = {} } = {}) {
  const relogio = { t }
  const s = await iniciar({ dbPath: ':memory:', porta: 0, agora: () => relogio.t, log: () => {}, limites: folga, reino: { params: { ...reinoFolgado, ...params } } })
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
const abrir = async (api, token, modo) => {
  const r = await api('POST', '/api/reino/partida', token, { modo })
  assert.equal(r.status, 201, r.texto)
  return r.json
}
async function jogar(api, token, r, max = 10_000) {
  for (let i = 0; i < max && r.status === 'aberta'; i++) {
    const res = await api('POST', '/api/reino/partida/comando', token, { partida: r.id, seq: r.seq, comando: jogada(r) })
    assert.equal(res.status, 200, res.texto)
    r = res.json
  }
  return r
}
const desistir = async (api, token, id) => {
  const d = await api('POST', '/api/reino/partida/desistir', token, { partida: id })
  assert.equal(d.status, 200, d.texto)
  return d.json
}

/**
 * Memória presa no cache, medida sem depender do GC: anda por tudo que cada replay guardado prende e soma o texto.
 * Qualquer objeto além da casca da entrada e da lista de passos é falha: objeto montado ocupa ~6,7x o tamanho do seu
 * texto (prova do B0) e não pode ficar preso.
 */
function memoriaDoCache(valores) {
  let texto = 0, contados = 0
  const objetosPresos = []
  for (const v of valores) {
    contados += v.bytes
    for (const [k, x] of Object.entries(v)) {
      if (k === 'bytes') { assert.equal(typeof x, 'number'); continue }
      const lista = k === 'passos' && Array.isArray(x) ? x : [x]
      for (const t of lista) {
        if (typeof t === 'string') texto += t.length
        else objetosPresos.push(k)
      }
    }
  }
  return { texto, contados, objetosPresos }
}

describe('R19 — cache de replay guardado como texto', () => {
  test('cache de replay cheio não passa de N MB de memória (só texto preso; tamanho contado = tamanho guardado)', async () => {
    const TETO = 60_000 // N = 0,06 MB (o real é replayCacheBytes, 32 MB; aqui pequeno para encher e esvaziar)
    const { s, api, conta } = await subir({ params: { replayCacheBytes: TETO } })
    try {
      const a = await conta()
      const ids = []
      for (let i = 0; i < 12; i++) {
        const r = await jogar(api, a.token, await abrir(api, a.token, 'treino'), 8)
        if (r.status === 'aberta') await desistir(api, a.token, r.id)
        ids.push(r.id)
      }
      const paginas = {}
      for (const id of ids) {
        const x = await api('GET', `/api/reino/replay/${id}`, a.token)
        assert.equal(x.status, 200, x.texto)
        paginas[id] = x.texto
      }
      const { partidas, bytes } = s.reino._interno.replaysGuardados()
      assert.ok(partidas >= 1 && partidas < ids.length, `o cache não encheu e esvaziou (${partidas} de ${ids.length})`)
      const m = memoriaDoCache(s.reino._interno.replaysGuardadosValores())
      assert.deepEqual(m.objetosPresos, [], 'replay guardado prende objetos montados')
      assert.equal(m.contados, bytes)
      assert.equal(m.texto, bytes, 'o tamanho contado não é o tamanho do texto guardado')
      assert.ok(m.texto <= TETO, `texto guardado ${m.texto} B passa de ${TETO} B`)
      // servido do texto guardado: a mesma resposta de antes
      for (const id of ids) {
        const x = await api('GET', `/api/reino/replay/${id}`, a.token)
        assert.equal(x.texto, paginas[id])
      }
    } finally { await fechar(s) }
  })
})
