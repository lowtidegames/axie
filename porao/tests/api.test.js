// Porão — tarefa 5: servidor HTTP (porao/servidor/index.mjs). Rodar: node --test porao/tests/api.test.js
import { test, describe, beforeEach, afterEach, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { iniciarServidor } from '../servidor/index.mjs'

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'porao-api-'))
let srv, porta, n = 0
let relogio = 1_700_000_000_000 // relógio do servidor nos testes (avança só quando o teste manda)
const passar = ms => { relogio += ms }
const chave = () => `chave-teste-${++n}-${Math.random().toString(36).slice(2, 10)}`

/** Pedido cru (permite Host/Origin/caminho estranhos, que o fetch não deixa). */
function pedir(metodo, caminho, { corpo, headers = {}, json = true, porta: p = porta, semMarca = false } = {}) {
  return new Promise((resolve, reject) => {
    const bruto = corpo === undefined ? undefined : (typeof corpo === 'string' ? corpo : JSON.stringify(corpo))
    const h = { ...(bruto !== undefined && json ? { 'Content-Type': 'application/json' } : {}), ...(!semMarca && caminho.startsWith('/api/') ? { 'X-Porao': '1' } : {}), ...headers }
    if (bruto !== undefined) h['Content-Length'] = Buffer.byteLength(bruto)
    const req = http.request({ host: '127.0.0.1', port: p, method: metodo, path: caminho, headers: h }, res => {
      const partes = []
      res.on('data', c => partes.push(c))
      res.on('end', () => {
        const texto = Buffer.concat(partes).toString('utf8')
        let j = null
        try { j = JSON.parse(texto) } catch { /* não é JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, texto, json: j })
      })
    })
    req.on('error', reject)
    if (bruto !== undefined) req.write(bruto)
    req.end()
  })
}
const post = (caminho, corpo, headers = {}) => pedir('POST', caminho, { corpo, headers })

// Servidor e banco NOVOS a cada teste (um teste não gasta o caixa do outro).
beforeEach(async () => { relogio = Date.now(); srv = await iniciarServidor({ porta: 0, caminhoBanco: path.join(pasta, `p${++n}.db`), agora: () => relogio }); porta = srv.porta })
afterEach(async () => { await srv.fechar() })
after(() => { fs.rmSync(pasta, { recursive: true, force: true }) })

describe('tarefa 5 — servidor HTTP do porão', () => {
  test('fluxo completo: estado → imprimir → lançar → tapete', async () => {
    const e0 = await pedir('GET', '/api/estado')
    assert.equal(e0.status, 200)
    assert.equal(e0.json.ok, true)
    assert.ok(!e0.texto.toLowerCase().includes('semente'))
    assert.equal(e0.headers['x-content-type-options'], 'nosniff')
    const i = await post('/api/imprimir', {}, { 'Idempotency-Key': chave() })
    assert.equal(i.status, 200, i.texto)
    assert.equal(i.json.ok, true)
    assert.equal(i.json.acao, 'imprimir')
    const carta = i.json.estado.cartas[0]
    assert.ok(carta)
    const l = await post('/api/lancar', { cartaId: carta.id }, { 'Idempotency-Key': chave() })
    assert.equal(l.status, 200, l.texto)
    const projeto = l.json.resultado.projeto
    assert.ok(projeto)
    passar(10 * 60_000)
    const t = await post(`/api/projeto/${projeto.id}/tapete`, {}, { 'Idempotency-Key': chave() })
    assert.equal(t.status, 200, t.texto)
    assert.equal(t.json.ok, true)
    // recusa de regra vira 4xx com erro em português
    const r = await post('/api/luxo/nao_existe', {}, { 'Idempotency-Key': chave() })
    assert.equal(r.status, 400)
    assert.equal(r.json.ok, false)
    assert.equal(r.json.codigo, 'recusado')
  })

  test('chave repetida não conta duas vezes (cabeçalho e campo do corpo)', async () => {
    const k = chave()
    const a = await post('/api/imprimir', {}, { 'Idempotency-Key': k })
    assert.equal(a.status, 200, a.texto)
    const antes = (await pedir('GET', '/api/estado')).json.estado.contagem?.impressoes
    const b = await post('/api/imprimir', {}, { 'Idempotency-Key': k })
    assert.equal(b.status, 200)
    assert.equal(b.json.repetido, true)
    assert.deepEqual(b.json.resultado, a.json.resultado)
    assert.equal((await pedir('GET', '/api/estado')).json.estado.contagem?.impressoes, antes)
    const cartaId = a.json.estado.cartas[0].id
    const k2 = chave()
    const c = await post('/api/lancar', { cartaId, chave: k2 })
    const d = await post('/api/lancar', { cartaId, chave: k2 })
    assert.equal(c.status, 200, c.texto)
    assert.equal(d.status, 200, d.texto)
    assert.equal(d.json.repetido, true)
    assert.equal((await pedir('GET', '/api/estado')).json.estado.projetos.length, 1)
    const sem = await post('/api/imprimir', {})
    assert.equal(sem.status, 400)
    assert.equal(sem.json.codigo, 'chave_invalida')
  })

  test('corpo grande, JSON quebrado e tipo errado são recusados', async () => {
    const grande = await post('/api/imprimir', { lixo: 'x'.repeat(20_000) }, { 'Idempotency-Key': chave() })
    assert.equal(grande.status, 413)
    const quebrado = await pedir('POST', '/api/imprimir', { corpo: '{nao e json', headers: { 'Idempotency-Key': chave() } })
    assert.equal(quebrado.status, 400)
    assert.equal(quebrado.json.ok, false)
    const lista = await post('/api/imprimir', [1, 2], { 'Idempotency-Key': chave() })
    assert.equal(lista.status, 400)
    const tipo = await pedir('POST', '/api/imprimir', { corpo: '{}', json: false, headers: { 'Idempotency-Key': chave(), 'Content-Type': 'text/plain' } })
    assert.equal(tipo.status, 415)
    const id = await post('/api/projeto/abc/tapete', {}, { 'Idempotency-Key': chave() })
    assert.equal(id.status, 404)
    const missao = await post('/api/missao', {}, { 'Idempotency-Key': chave() })
    assert.equal(missao.status, 404)
  })

  test('estáticos: tela e comum servidos; ../, servidor, dados e nomes.local.json recusados', async () => {
    const raiz = await pedir('GET', '/')
    assert.equal(raiz.status, 200)
    assert.match(raiz.headers['content-type'], /text\/html/)
    const js = await pedir('GET', '/comum/regras.js')
    assert.equal(js.status, 200)
    assert.match(js.headers['content-type'], /javascript/)
    assert.ok((await pedir('GET', '/estilo.css')).headers['content-type'].startsWith('text/css'))
    for (const c of [
      '/../servidor/jogo.mjs', '/%2e%2e/servidor/jogo.mjs', '/comum/../servidor/banco.mjs', '/comum/%2e%2e/servidor/banco.mjs',
      '/servidor/jogo.mjs', '/porao/servidor/jogo.mjs', '/dados/porao-teste.db', '/nomes.local.json', '/comum/../nomes.local.json',
      '/%2e%2e/%2e%2e/package.json', '/comum/%00.js', '/..%5cservidor%5cjogo.mjs', '/comum\\..\\servidor\\jogo.mjs',
    ]) {
      const r = await pedir('GET', c)
      assert.ok([400, 403, 404].includes(r.status), `${c} -> ${r.status}`)
      assert.ok(!r.texto.includes('abrirBancoPorao'), c)
    }
  })

  test('Origin ou Host de outro site é recusado', async () => {
    const o = await post('/api/imprimir', {}, { 'Idempotency-Key': chave(), Origin: 'http://malvado.example' })
    assert.equal(o.status, 403)
    const h = await pedir('GET', '/api/estado', { headers: { Host: 'malvado.example' } })
    assert.equal(h.status, 403)
    const ok = await post('/api/imprimir', {}, { 'Idempotency-Key': chave(), Origin: `http://localhost:${porta}` })
    assert.equal(ok.status, 200, ok.texto)
    const ok2 = await pedir('GET', '/api/estado', { headers: { Origin: `http://127.0.0.1:${porta}` } })
    assert.equal(ok2.status, 200)
  })

  test('SAVE_SO_LEITURA recusa POST (lido a cada pedido); MANUTENCAO recusa tudo menos estáticos', async () => {
    try {
      process.env.SAVE_SO_LEITURA = '1'
      const p = await post('/api/imprimir', {}, { 'Idempotency-Key': chave() })
      assert.equal(p.status, 503)
      assert.equal(p.json.ok, false)
      assert.equal((await pedir('GET', '/api/estado')).status, 200)
      delete process.env.SAVE_SO_LEITURA
      assert.equal((await post('/api/imprimir', {}, { 'Idempotency-Key': chave() })).status, 200)
      process.env.MANUTENCAO = '1'
      const e = await pedir('GET', '/api/estado')
      assert.equal(e.status, 503)
      assert.match(e.json.erro, /manuten/i)
      assert.equal((await post('/api/imprimir', {}, { 'Idempotency-Key': chave() })).status, 503)
      assert.equal((await pedir('GET', '/')).status, 200)
    } finally {
      delete process.env.SAVE_SO_LEITURA
      delete process.env.MANUTENCAO
    }
  })

  test('limite de pedidos: passou do máximo, 429', async () => {
    const s2 = await iniciarServidor({ porta: 0, caminhoBanco: path.join(pasta, 'l.db'), limitePedidos: { max: 5, janelaMs: 60_000 } })
    try {
      const st = []
      for (let i = 0; i < 8; i++) st.push((await pedir('GET', '/api/estado', { porta: s2.porta })).status)
      assert.deepEqual(st.slice(0, 5), [200, 200, 200, 200, 200])
      assert.equal(st[7], 429)
    } finally { await s2.fechar() }
  })

  test('recusa ligar fora de 127.0.0.1', async () => {
    for (const host of ['0.0.0.0', '::', '192.168.0.10', 'localhost', '']) {
      await assert.rejects(() => iniciarServidor({ porta: 0, host, caminhoBanco: ':memory:' }), /127\.0\.0\.1/)
    }
  })
})

describe('P8 — segurança', () => {
  test('SAVE_SO_LEITURA: GET /api/estado não muda o save', async () => {
    const lerSave = () => srv.db.prepare('SELECT estado, atualizado_em FROM save').all()
    const nDiario = () => srv.db.prepare('SELECT COUNT(*) AS n FROM diario').get().n
    assert.equal((await post('/api/imprimir', {}, { 'Idempotency-Key': chave() })).status, 200)
    await pedir('GET', '/api/estado') // aqui pode gravar
    try {
      process.env.SAVE_SO_LEITURA = '1'
      passar(30_000)
      const antes = JSON.stringify(lerSave()); const d = nDiario()
      const r = await pedir('GET', '/api/estado')
      assert.equal(r.status, 200)
      assert.equal(r.json.ok, true)
      assert.equal(JSON.stringify(lerSave()), antes)
      assert.equal(nDiario(), d)
    } finally { delete process.env.SAVE_SO_LEITURA }
  })

  test('toda rota /api exige o cabeçalho X-Porao: 1 (GET e POST)', async () => {
    const g = await pedir('GET', '/api/estado', { semMarca: true })
    assert.equal(g.status, 403)
    assert.equal(g.json.ok, false)
    const p = await pedir('POST', '/api/imprimir', { corpo: {}, semMarca: true, headers: { 'Idempotency-Key': chave() } })
    assert.equal(p.status, 403)
    const errado = await pedir('GET', '/api/estado', { semMarca: true, headers: { 'X-Porao': '0' } })
    assert.equal(errado.status, 403)
    assert.equal((await pedir('GET', '/api/estado')).status, 200)
    assert.equal((await pedir('GET', '/')).status, 200) // estáticos não precisam
  })

  test('link simbólico para fora da pasta não é servido', async () => {
    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'porao-link-'))
    const tela = path.join(raiz, 'tela'); const fora = path.join(raiz, 'fora')
    fs.mkdirSync(tela); fs.mkdirSync(fora)
    fs.writeFileSync(path.join(tela, 'index.html'), '<p>ola</p>')
    fs.writeFileSync(path.join(fora, 'segredo.html'), 'SEGREDO')
    fs.symlinkSync(path.join(fora, 'segredo.html'), path.join(tela, 'link.html'))
    fs.symlinkSync(fora, path.join(tela, 'pasta'))
    const s2 = await iniciarServidor({ porta: 0, caminhoBanco: path.join(raiz, 'l.db'), pastas: { tela, comum: tela, arte: tela } })
    try {
      assert.equal((await pedir('GET', '/', { porta: s2.porta })).status, 200)
      for (const c of ['/link.html', '/pasta/segredo.html']) {
        const r = await pedir('GET', c, { porta: s2.porta })
        assert.equal(r.status, 404, c)
        assert.ok(!r.texto.includes('SEGREDO'))
      }
    } finally { await s2.fechar(); fs.rmSync(raiz, { recursive: true, force: true }) }
  })
})
