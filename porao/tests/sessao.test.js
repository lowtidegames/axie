// Porão — abertura, tarefa 4: sessão por ASSINATURA de mensagem (decisão do dono 20/11 18:17; nenhuma transação,
// nenhum token). Desenho: docs/porao/desenho-abertura.md. Rodar: node --test porao/tests/sessao.test.js
// Par Ed25519 gerado no próprio teste com node:crypto (nada de chave fixa, nada de rede).
import { test, describe, beforeEach, afterEach, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { iniciarServidor } from '../servidor/index.mjs'
import { codificar } from '../comum/base58.js'
import { SESSAO, NOME_COOKIE, NOME_COOKIE_SEGURO } from '../servidor/sessao.mjs'

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'porao-sessao-'))
let srv, porta, n = 0
let relogio = 1_700_000_000_000
const passar = ms => { relogio += ms }
const chave = () => `chave-sessao-${++n}-${Math.random().toString(36).slice(2, 10)}`

function parGerado () {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const cru = publicKey.export({ format: 'der', type: 'spki' }).subarray(12)
  return {
    carteira: codificar(cru),
    assinar: texto => codificar(crypto.sign(null, Buffer.from(texto, 'utf8'), privateKey)),
  }
}

function pedir (metodo, caminho, { corpo, cookie, headers = {}, porta: p = porta, ip } = {}) {
  return new Promise((resolve, reject) => {
    const bruto = corpo === undefined ? undefined : JSON.stringify(corpo)
    const h = { 'X-Porao': '1', ...(bruto !== undefined ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bruto) } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers }
    const req = http.request({ host: '127.0.0.1', port: p, method: metodo, path: caminho, headers: h, ...(ip ? { localAddress: ip } : {}) }, res => {
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
const post = (caminho, corpo = {}, o = {}) => pedir('POST', caminho, { corpo, ...o })
/** "nome=valor" do Set-Cookie (para mandar de volta no Cookie). */
const cookieDe = r => String((r.headers['set-cookie'] || [])[0] || '').split(';')[0]
const tokenDe = r => cookieDe(r).split('=').slice(1).join('=')
const sha256 = t => crypto.createHash('sha256').update(t).digest('hex')

async function entrarCom (par, { porta: p = porta } = {}) {
  const d = await post('/api/sessao/desafio', { carteira: par.carteira }, { porta: p })
  assert.equal(d.status, 200, d.texto)
  const e = await post('/api/sessao/entrar', { carteira: par.carteira, nonce: d.json.nonce, assinatura: par.assinar(d.json.mensagem) }, { porta: p })
  return { d, e }
}

beforeEach(async () => { relogio = 1_700_000_000_000; srv = await iniciarServidor({ porta: 0, caminhoBanco: path.join(pasta, `s${++n}.db`), agora: () => relogio }); porta = srv.porta })
afterEach(async () => { await srv.fechar() })
after(() => { fs.rmSync(pasta, { recursive: true, force: true }) })

describe('tarefa 4 — sessão por assinatura', () => {
  test('caminho inteiro: desafio → assinar → entrar → jogar → sair', async () => {
    const par = parGerado()
    const d = await post('/api/sessao/desafio', { carteira: par.carteira })
    assert.equal(d.status, 200, d.texto)
    assert.match(d.json.nonce, /^[0-9a-f]{32}$/) // 16 bytes
    assert.equal(d.json.venceEm, relogio + 5 * 60_000)
    // site fixo do servidor, nunca do pedido
    assert.ok(d.json.mensagem.includes(`Site: 127.0.0.1:${porta}\n`), d.json.mensagem)
    assert.ok(d.json.mensagem.includes(`Carteira: ${par.carteira}\n`))
    assert.ok(d.json.mensagem.includes(`Numero de uso unico: ${d.json.nonce}\n`))
    assert.match(d.json.mensagem, /nao e uma transacao/)

    const e = await post('/api/sessao/entrar', { carteira: par.carteira, nonce: d.json.nonce, assinatura: par.assinar(d.json.mensagem) })
    assert.equal(e.status, 200, e.texto)
    assert.equal(e.json.ok, true)
    assert.equal(e.json.conta.tipo, 'carteira')
    assert.equal(e.json.conta.carteiraCurta, `${par.carteira.slice(0, 4)}…${par.carteira.slice(-4)}`)
    assert.ok(!e.texto.includes(par.carteira), 'carteira inteira não volta para a tela')
    assert.ok(!e.texto.includes(tokenDe(e)), 'token só no cookie')
    const cookie = cookieDe(e)
    assert.ok(cookie.startsWith(`${NOME_COOKIE}=`))

    const s = await pedir('GET', '/api/sessao', { cookie })
    assert.equal(s.status, 200)
    assert.equal(s.json.conta.tipo, 'carteira')

    const i = await post('/api/imprimir', {}, { cookie, headers: { 'Idempotency-Key': chave() } })
    assert.equal(i.status, 200, i.texto)
    const contaId = srv.db.prepare('SELECT id FROM contas WHERE carteira = ?').get(par.carteira).id
    assert.notEqual(contaId, 1)
    // o progresso foi para a conta da carteira, não para a convidada local
    assert.equal(JSON.parse(srv.db.prepare('SELECT estado FROM saves WHERE conta_id = ?').get(contaId).estado).contagem.impressoes, 1)
    assert.ok(!(JSON.parse(srv.db.prepare('SELECT estado FROM saves WHERE conta_id = 1').get().estado).contagem.impressoes >= 1))
    const est = await pedir('GET', '/api/estado', { cookie })
    assert.equal(est.status, 200)
    assert.equal(est.json.estado.conta.tipo, 'carteira')

    const sair = await post('/api/sessao/sair', {}, { cookie })
    assert.equal(sair.status, 200)
    assert.match(String(sair.headers['set-cookie']), /Max-Age=0/)
    assert.equal((await pedir('GET', '/api/estado', { cookie })).status, 401)
    assert.equal((await pedir('GET', '/api/sessao', { cookie })).json.conta, null)

    // voltar com a mesma carteira cai na mesma conta (progresso guardado)
    const { e: e2 } = await entrarCom(par)
    assert.equal(e2.status, 200)
    const est2 = await pedir('GET', '/api/estado', { cookie: cookieDe(e2) })
    assert.equal(est2.json.estado.contagem.impressoes, 1)
  })

  test('nonce repetido → 401 (uso único)', async () => {
    const par = parGerado()
    const { d, e } = await entrarCom(par)
    assert.equal(e.status, 200, e.texto)
    const deNovo = await post('/api/sessao/entrar', { carteira: par.carteira, nonce: d.json.nonce, assinatura: par.assinar(d.json.mensagem) })
    assert.equal(deNovo.status, 401)
    assert.equal(deNovo.json.codigo, 'assinatura_invalida')
    assert.equal(deNovo.headers['set-cookie'], undefined)
  })

  test('nonce vencido (5 min) → 401', async () => {
    const par = parGerado()
    const d = await post('/api/sessao/desafio', { carteira: par.carteira })
    passar(5 * 60_000)
    const e = await post('/api/sessao/entrar', { carteira: par.carteira, nonce: d.json.nonce, assinatura: par.assinar(d.json.mensagem) })
    assert.equal(e.status, 401)
    assert.equal(e.json.codigo, 'assinatura_invalida')
  })

  test('nonce de outra carteira → 401, e o nonce fica queimado', async () => {
    const a = parGerado(); const b = parGerado()
    const d = await post('/api/sessao/desafio', { carteira: a.carteira })
    // B assina a mensagem de A com a própria chave e diz que é B
    const e = await post('/api/sessao/entrar', { carteira: b.carteira, nonce: d.json.nonce, assinatura: b.assinar(d.json.mensagem) })
    assert.equal(e.status, 401)
    // e nem A consegue mais usar o mesmo nonce (uma tentativa por desafio)
    const e2 = await post('/api/sessao/entrar', { carteira: a.carteira, nonce: d.json.nonce, assinatura: a.assinar(d.json.mensagem) })
    assert.equal(e2.status, 401)
    assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n, 0)
  })

  test('assinatura de outra mensagem (mesma carteira) → 401: confere contra a mensagem GUARDADA', async () => {
    const par = parGerado()
    const d = await post('/api/sessao/desafio', { carteira: par.carteira })
    const outra = d.json.mensagem.replace(`127.0.0.1:${porta}`, 'site-malvado.example')
    const e = await post('/api/sessao/entrar', { carteira: par.carteira, nonce: d.json.nonce, assinatura: par.assinar(outra) })
    assert.equal(e.status, 401)
    // e o pedido não consegue trocar a mensagem guardada (campo extra é ignorado)
    const d2 = await post('/api/sessao/desafio', { carteira: par.carteira, site: 'site-malvado.example' })
    assert.ok(d2.json.mensagem.includes(`Site: 127.0.0.1:${porta}\n`))
    const e2 = await post('/api/sessao/entrar', { carteira: par.carteira, nonce: d2.json.nonce, assinatura: par.assinar(outra), mensagem: outra })
    assert.equal(e2.status, 401)
  })

  test('o site da mensagem não vem do cabeçalho Host (localhost dá a mesma mensagem)', async () => {
    const par = parGerado()
    const d = await post('/api/sessao/desafio', { carteira: par.carteira }, { headers: { Host: `localhost:${porta}` } })
    assert.equal(d.status, 200)
    assert.ok(d.json.mensagem.includes(`Site: 127.0.0.1:${porta}\n`))
  })

  test('entradas tortas: carteira inválida, chave fraca, assinatura curta → 400/401 sem erro 500', async () => {
    for (const carteira of ['', 'x', 42, null, '1'.repeat(32), 'O0Il'.repeat(11)]) {
      const d = await post('/api/sessao/desafio', { carteira })
      assert.equal(d.status, 400, String(carteira))
      assert.equal(d.json.codigo, 'carteira_invalida')
    }
    const par = parGerado()
    const d = await post('/api/sessao/desafio', { carteira: par.carteira })
    for (const assinatura of ['', 'abc', 42, null, codificar(Buffer.alloc(63, 1))]) {
      const e = await post('/api/sessao/entrar', { carteira: par.carteira, nonce: d.json.nonce, assinatura })
      assert.equal(e.status, 401, String(assinatura))
    }
    for (const nonce of ['', 'naoexiste', 7, null, 'f'.repeat(32)]) {
      const e = await post('/api/sessao/entrar', { carteira: par.carteira, nonce, assinatura: par.assinar('x') })
      assert.equal(e.status, 401, String(nonce))
    }
  })

  test('UPDATE condicional: dois "entrar" com o mesmo nonce, só um vira sessão', async () => {
    const par = parGerado()
    const d = await post('/api/sessao/desafio', { carteira: par.carteira })
    const corpo = { carteira: par.carteira, nonce: d.json.nonce, assinatura: par.assinar(d.json.mensagem) }
    const [r1, r2] = await Promise.all([post('/api/sessao/entrar', corpo), post('/api/sessao/entrar', corpo)])
    assert.deepEqual([r1.status, r2.status].sort(), [200, 401])
    assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n, 1)
    assert.ok(srv.db.prepare('SELECT usado_em FROM desafios WHERE nonce = ?').get(d.json.nonce).usado_em)
  })

  test('cookie: HttpOnly, SameSite=Strict, Path=/, Max-Age 7 dias; banco guarda só o sha256 do token de 32 bytes', async () => {
    const { e } = await entrarCom(parGerado())
    const linha = String(e.headers['set-cookie'][0])
    assert.match(linha, /; HttpOnly/)
    assert.match(linha, /; SameSite=Strict/)
    assert.match(linha, /; Path=\//)
    assert.match(linha, new RegExp(`; Max-Age=${7 * 24 * 3600}(;|$)`))
    assert.doesNotMatch(linha, /Secure|Domain=/i) // http://127.0.0.1 não tem Secure
    const token = tokenDe(e)
    assert.equal(Buffer.from(token, 'base64url').length, 32)
    const hashes = srv.db.prepare('SELECT hash FROM sessoes').all().map(l => l.hash)
    assert.deepEqual(hashes, [sha256(token)])
    assert.ok(!JSON.stringify(srv.db.prepare('SELECT * FROM sessoes').all()).includes(token))
    assert.equal(SESSAO.duracaoMs, 7 * 24 * 3600 * 1000)
  })

  test('sessão vence em 7 dias sem uso e renova quando usada', async () => {
    const { e } = await entrarCom(parGerado())
    const cookie = cookieDe(e)
    passar(6 * 24 * 3600_000)
    const r = await pedir('GET', '/api/estado', { cookie })
    assert.equal(r.status, 200)
    assert.match(String(r.headers['set-cookie']), /Max-Age=604800/) // renovou
    passar(6 * 24 * 3600_000) // 12 dias desde a entrada, 6 desde o último uso
    assert.equal((await pedir('GET', '/api/estado', { cookie })).status, 200)
    passar(7 * 24 * 3600_000 + 1)
    const v = await pedir('GET', '/api/estado', { cookie })
    assert.equal(v.status, 401)
    assert.equal(v.json.codigo, 'sem_sessao')
  })

  test('sair apaga a sessão no banco (o mesmo token não volta a valer)', async () => {
    const { e } = await entrarCom(parGerado())
    const cookie = cookieDe(e)
    assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM sessoes WHERE hash = ?').get(sha256(tokenDe(e))).n, 1)
    assert.equal((await post('/api/sessao/sair', {}, { cookie })).status, 200)
    assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM sessoes WHERE hash = ?').get(sha256(tokenDe(e))).n, 0)
    const i = await post('/api/imprimir', {}, { cookie, headers: { 'Idempotency-Key': chave() } })
    assert.equal(i.status, 401)
    // sair sem sessão não quebra
    assert.equal((await post('/api/sessao/sair', {})).status, 200)
  })

  test('sem sessão → 401 sem_sessao em todas as rotas do jogo (e cookie inventado também)', async () => {
    const rotas = [
      ['GET', '/api/estado'], ['POST', '/api/imprimir'], ['POST', '/api/fundir'], ['POST', '/api/lancar'],
      ['POST', '/api/projeto/1/tapete'], ['POST', '/api/batida'], ['POST', '/api/luxo/abc'], ['POST', '/api/contrato'],
      ['POST', '/api/contrato/1/resposta'], ['POST', '/api/prestigio'], ['POST', '/api/apelido'],
    ]
    const antes = srv.db.prepare('SELECT * FROM saves ORDER BY conta_id').all()
    for (const cookie of [undefined, `${NOME_COOKIE}=inventado`, `${NOME_COOKIE}=${crypto.randomBytes(32).toString('base64url')}`]) {
      for (const [m, c] of rotas) {
        const r = await pedir(m, c, { cookie, ...(m === 'POST' ? { corpo: {}, headers: { 'Idempotency-Key': chave() } } : {}) })
        assert.equal(r.status, 401, `${m} ${c} ${cookie}`)
        assert.equal(r.json.codigo, 'sem_sessao')
      }
    }
    assert.deepEqual(srv.db.prepare('SELECT * FROM saves ORDER BY conta_id').all(), antes)
    const s = await pedir('GET', '/api/sessao')
    assert.equal(s.status, 200)
    assert.equal(s.json.conta, null)
  })

  test('convidado em 127.0.0.1 cai na conta local padrão (sempre a mesma)', async () => {
    const c1 = await post('/api/sessao/convidado')
    assert.equal(c1.status, 200, c1.texto)
    assert.equal(c1.json.conta.tipo, 'convidado')
    const c2 = await post('/api/sessao/convidado')
    const id = t => srv.db.prepare('SELECT conta_id FROM sessoes WHERE hash = ?').get(sha256(t)).conta_id
    const local = srv.db.prepare('SELECT id FROM contas WHERE local_padrao = 1').get().id
    assert.equal(id(tokenDe(c1)), local)
    assert.equal(id(tokenDe(c2)), local)
    assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM contas').get().n, 1)
    assert.equal((await post('/api/imprimir', {}, { cookie: cookieDe(c1), headers: { 'Idempotency-Key': chave() } })).status, 200)
  })

  test('apelido pela sessão: cedo, longo (>20 → apelido.erro.feio), certo, uma vez só', async () => {
    const c = await post('/api/sessao/convidado')
    const cookie = cookieDe(c)
    const cedo = await post('/api/apelido', { apelido: 'golpista_bom' }, { cookie })
    assert.equal(cedo.status, 409)
    assert.equal(cedo.json.codigo, 'apelido_cedo')
    const longo = await post('/api/apelido', { apelido: 'a'.repeat(21) }, { cookie })
    assert.equal(longo.status, 400)
    assert.equal(longo.json.chaveTexto, 'apelido.erro.feio')
    // 1º tapete
    const ci = (await post('/api/imprimir', {}, { cookie, headers: { 'Idempotency-Key': chave() } })).json.estado.cartas[0].id
    const pid = (await post('/api/lancar', { cartaId: ci }, { cookie, headers: { 'Idempotency-Key': chave() } })).json.resultado.projeto.id
    passar(10 * 60_000)
    assert.equal((await post(`/api/projeto/${pid}/tapete`, {}, { cookie, headers: { 'Idempotency-Key': chave() } })).status, 200)
    const ok = await post('/api/apelido', { apelido: 'golpista_bom' }, { cookie })
    assert.equal(ok.status, 200, ok.texto)
    assert.equal(ok.json.apelido, 'golpista_bom')
    const deNovo = await post('/api/apelido', { apelido: 'outro_nome' }, { cookie })
    assert.equal(deNovo.status, 409)
    assert.equal(deNovo.json.codigo, 'apelido_definido')
  })

  test('SAVE_SO_LEITURA e MANUTENCAO barram contas, sessões e apelidos novos', async () => {
    const par = parGerado()
    const c = await post('/api/sessao/convidado')
    const cookie = cookieDe(c)
    const d = await post('/api/sessao/desafio', { carteira: par.carteira })
    const contas = () => srv.db.prepare('SELECT COUNT(*) AS n FROM contas').get().n
    const sessoes = () => srv.db.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n
    const n0 = [contas(), sessoes()]
    for (const [chaveEnv, codigo] of [['SAVE_SO_LEITURA', 'so_leitura'], ['MANUTENCAO', 'manutencao']]) {
      try {
        process.env[chaveEnv] = '1'
        for (const [cam, corpo] of [
          ['/api/sessao/desafio', { carteira: par.carteira }],
          ['/api/sessao/entrar', { carteira: par.carteira, nonce: d.json.nonce, assinatura: par.assinar(d.json.mensagem) }],
          ['/api/sessao/convidado', {}],
          ['/api/apelido', { apelido: 'golpista_bom' }],
        ]) {
          const r = await post(cam, corpo, { cookie })
          assert.equal(r.status, 503, `${chaveEnv} ${cam}`)
          assert.equal(r.json.codigo, codigo)
          assert.equal(r.headers['set-cookie'], undefined)
        }
        assert.deepEqual([contas(), sessoes()], n0)
      } finally { delete process.env[chaveEnv] }
    }
    // desligou: o mesmo desafio ainda vale (não foi queimado enquanto estava barrado)
    const e = await post('/api/sessao/entrar', { carteira: par.carteira, nonce: d.json.nonce, assinatura: par.assinar(d.json.mensagem) })
    assert.equal(e.status, 200, e.texto)
  })

  test('limite de pedidos: desafio por IP passa do máximo → 429', async () => {
    const s2 = await iniciarServidor({ porta: 0, caminhoBanco: path.join(pasta, 'lim.db'), limiteDesafio: { max: 3, janelaMs: 60_000 } })
    try {
      const par = parGerado()
      const st = []
      for (let i = 0; i < 5; i++) st.push((await post('/api/sessao/desafio', { carteira: par.carteira }, { porta: s2.porta })).status)
      assert.deepEqual(st, [200, 200, 200, 429, 429])
    } finally { await s2.fechar() }
  })

  test('PORAO_SITE https: site da mensagem vem dele e o cookie vira __Host- com Secure', async () => {
    const s2 = await iniciarServidor({ porta: 0, caminhoBanco: path.join(pasta, 'https.db'), site: 'https://porao.exemplo.test' })
    try {
      const par = parGerado()
      const { d, e } = await entrarCom(par, { porta: s2.porta })
      assert.ok(d.json.mensagem.includes('Site: https://porao.exemplo.test\n'))
      assert.equal(e.status, 200, e.texto)
      const linha = String(e.headers['set-cookie'][0])
      assert.ok(linha.startsWith(`${NOME_COOKIE_SEGURO}=`))
      assert.equal(NOME_COOKIE_SEGURO, `__Host-${NOME_COOKIE}`)
      assert.match(linha, /; Secure/)
      assert.match(linha, /; Path=\//)
      assert.doesNotMatch(linha, /Domain=/i)
      // o cookie sem o prefixo não vale nesse modo
      const sem = await pedir('GET', '/api/estado', { porta: s2.porta, cookie: `${NOME_COOKIE}=${tokenDe(e)}` })
      assert.equal(sem.status, 401)
      assert.equal((await pedir('GET', '/api/estado', { porta: s2.porta, cookie: cookieDe(e) })).status, 200)
      // publicado, a conta convidada LOCAL não é de todo mundo: convidado recusado até haver desenho próprio
      const conv = await post('/api/sessao/convidado', {}, { porta: s2.porta })
      assert.equal(conv.status, 403)
      assert.equal(conv.json.codigo, 'convidado_so_local')
      assert.equal(conv.headers['set-cookie'], undefined)
    } finally { await s2.fechar() }
  })

  test('PORAO_SITE é lido do ambiente quando a opção não vem', async () => {
    try {
      process.env.PORAO_SITE = 'https://outro.exemplo.test'
      const s2 = await iniciarServidor({ porta: 0, caminhoBanco: path.join(pasta, 'env.db') })
      try {
        const d = await post('/api/sessao/desafio', { carteira: parGerado().carteira }, { porta: s2.porta })
        assert.ok(d.json.mensagem.includes('Site: https://outro.exemplo.test\n'))
      } finally { await s2.fechar() }
    } finally { delete process.env.PORAO_SITE }
  })
})
