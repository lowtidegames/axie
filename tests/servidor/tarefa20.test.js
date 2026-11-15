// Tarefa 20 (modo servidor da ponte): o servidor serve a tela no mesmo desenho de pastas do server/dev.mjs
// (/ → /public/, só public/ e shared/), avisa a tela que é servidor (public/modo.json), abre o casulo do filho
// costurado (rota nova) e não cai com energia_dia absurdo no banco (baixo da rodada 4 do parecer nº 2).
// Rodar: node --test tests/servidor/tarefa20.test.js
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { iniciar } from '../../server/index.mjs'
import { abrirBanco } from '../../server/db.mjs'
import { criarJogo } from '../../server/jogo.mjs'

let s, base
const folga = { pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 100_000, janelaMs: 60_000 }, contasPorIp: { max: 1000, janelaMs: 60_000 } }
before(async () => { s = await iniciar({ dbPath: ':memory:', porta: 0, log: () => {}, limites: folga }); base = `http://127.0.0.1:${s.porta}` })
after(() => s.servidor.close())

async function api(metodo, caminho, { token, corpo } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (corpo !== undefined) headers['Content-Type'] = 'application/json'
  const r = await fetch(base + caminho, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo), redirect: 'manual' })
  const txt = await r.text()
  let json = null
  try { json = JSON.parse(txt) } catch { /* não é JSON */ }
  return { status: r.status, headers: r.headers, json, txt }
}
let n = 0
const novaConta = async () => (await api('POST', '/api/conta', { corpo: { apelido: `Ponte ${++n}` } })).json

describe('tarefa 20 — o servidor serve a tela (mesmo desenho do server/dev.mjs)', () => {
  test('/ leva a /public/; a página, a ponte e o motor chegam; nada fora de public/ e shared/', async () => {
    const raiz = await api('GET', '/')
    assert.equal(raiz.status, 302)
    assert.equal(raiz.headers.get('location'), '/public/')
    const pagina = await api('GET', '/public/')
    assert.equal(pagina.status, 200)
    assert.match(pagina.headers.get('content-type'), /text\/html/)
    assert.match(pagina.txt, /js\/app\.js/)
    assert.match(pagina.headers.get('content-security-policy'), /default-src 'self'/)
    for (const p of ['/public/js/ponte.js', '/public/js/app.js', '/public/css/frayz.css', '/shared/batalha.js', '/shared/config.js']) assert.equal((await api('GET', p)).status, 200, p)
    // endereço antigo (sem /public/) vai para o mesmo desenho de pastas, como no server/dev.mjs
    const velho = await api('GET', '/arte.html?x=1')
    assert.equal(velho.status, 302)
    assert.equal(velho.headers.get('location'), '/public/arte.html?x=1')
    for (const p of ['/docs/decisions.md', '/tests/servidor/api.test.js', '/.git/HEAD', '/server/db.mjs', '/package.json', '/CLAUDE.md', '/public/../package.json',
      '/public/%2e%2e/server/db.mjs', '/shared/../server/db.mjs', '/public/js/', '/dados/frayz-teste.db', '/tools/verde.mjs']) {
      assert.equal((await api('GET', p)).status, 404, p)
    }
    assert.equal((await api('POST', '/public/')).status, 405)
  })

  test('public/modo.json: arquivo parado diz "local"; o servidor responde "servidor" (a ponte escolhe o modo sem pedido com 404)', async () => {
    const arquivo = JSON.parse(await readFile(new URL('../../public/modo.json', import.meta.url), 'utf8'))
    assert.equal(arquivo.modo, 'local')
    const r = await api('GET', '/public/modo.json')
    assert.equal(r.status, 200)
    assert.equal(r.json.modo, 'servidor')
    assert.equal(r.json.api, '/api/')
    assert.equal(r.headers.get('cache-control'), 'no-store')
    // em manutenção a tela continua sabendo que é servidor (e a API diz MANUTENCAO)
    process.env.MANUTENCAO = '1'
    try {
      assert.equal((await api('GET', '/public/modo.json')).json.modo, 'servidor')
      assert.equal((await api('GET', '/api/estado')).json.erro.codigo, 'MANUTENCAO')
    } finally { delete process.env.MANUTENCAO }
  })
})

describe('tarefa 20 — abrir o casulo do filho costurado (POST /api/boneco/:id/casulo)', () => {
  test('o filho nasce com o casulo fechado; o dono abre (uma vez basta; repetir não muda nada)', async () => {
    const c = await novaConta()
    const ids = (await api('GET', '/api/estado', { token: c.token })).json.bonecos.map((b) => b.id)
    const cos = await api('POST', '/api/costura', { token: c.token, corpo: { a: ids[0], b: ids[1], pedido: 'casulo-teste-1' } })
    assert.equal(cos.status, 201)
    const filho = cos.json.filho
    assert.equal(filho.casulo.aberto, false)
    const r = await api('POST', `/api/boneco/${filho.id}/casulo`, { token: c.token })
    assert.equal(r.status, 200)
    assert.equal(r.json.boneco.casulo.aberto, true)
    assert.deepEqual(r.json.boneco.partes, filho.partes, 'abrir o casulo não muda as partes')
    const de = await api('GET', `/api/boneco/${filho.id}`, { token: c.token })
    assert.equal(de.json.boneco.casulo.aberto, true)
    const outra = await api('POST', `/api/boneco/${filho.id}/casulo`, { token: c.token })
    assert.equal(outra.status, 200)
    assert.equal(outra.json.boneco.casulo.aberto, true)
    // boneco sem casulo (de origem): nada muda
    const semCasulo = await api('POST', `/api/boneco/${ids[2]}/casulo`, { token: c.token })
    assert.equal(semCasulo.status, 200)
    assert.equal(semCasulo.json.boneco.casulo, null)
  })

  test('só o dono abre; corpo e id conferidos; só leitura não grava', async () => {
    const a = await novaConta(), b = await novaConta()
    const ids = (await api('GET', '/api/estado', { token: a.token })).json.bonecos.map((x) => x.id)
    const filho = (await api('POST', '/api/costura', { token: a.token, corpo: { a: ids[0], b: ids[1], pedido: 'casulo-teste-2' } })).json.filho
    const alheio = await api('POST', `/api/boneco/${filho.id}/casulo`, { token: b.token })
    assert.equal(alheio.status, 404)
    assert.equal(alheio.json.erro.codigo, 'BONECO_NAO_ENCONTRADO')
    assert.equal((await api('POST', `/api/boneco/${filho.id}/casulo`)).status, 401)
    assert.equal((await api('POST', '/api/boneco/nada/casulo', { token: a.token })).status, 400)
    const comCorpo = await api('POST', `/api/boneco/${filho.id}/casulo`, { token: a.token, corpo: { aberto: true } })
    assert.equal(comCorpo.status, 400)
    assert.equal(comCorpo.json.erro.codigo, 'CAMPO_DESCONHECIDO')
    assert.equal((await api('GET', `/api/boneco/${filho.id}/casulo`, { token: a.token })).status, 405)
    process.env.SAVE_SO_LEITURA = '1'
    try {
      const r = await api('POST', `/api/boneco/${filho.id}/casulo`, { token: a.token })
      assert.equal(r.status, 503)
      assert.equal(r.json.erro.codigo, 'SO_LEITURA')
    } finally { delete process.env.SAVE_SO_LEITURA }
    assert.equal((await api('GET', `/api/boneco/${filho.id}`, { token: a.token })).json.boneco.casulo.aberto, false)
  })
})

describe('tarefa 20 — baixo da rodada 4: energia_dia corrompido', () => {
  test('energia_dia absurdo no banco não derruba o estado', () => {
    const db = abrirBanco(':memory:', { modo: 'teste' })
    const jogo = criarJogo(db, { log: () => {} })
    const { conta } = jogo.criarConta('Banco Mexido')
    for (const dia of [1e9, 1e12, Number.MAX_SAFE_INTEGER]) {
      db.prepare('UPDATE contas SET energia_dia = ?, energia_gasta = 3 WHERE id = ?').run(dia, conta.id)
      const e = jogo.estado(conta.id)
      assert.ok(Number.isFinite(Date.parse(e.energia.recarregaEm)), `recarregaEm legível com energia_dia=${dia}: ${e.energia.recarregaEm}`)
      assert.ok(Date.parse(e.energia.recarregaEm) <= Date.now() + 2 * 86_400_000, 'o dia mostrado fica no máximo em amanhã')
      assert.ok(e.energia.atual >= 0 && e.energia.atual <= e.energia.maximo)
    }
  })
})
