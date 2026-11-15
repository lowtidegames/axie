// Tarefa 13 (parecer de segurança nº 1): limites (A5, A9), apelido (A10), chaves de emergência e sessão.
// Cada servidor de teste tem relógio próprio e banco próprio (em memória ou arquivo em pasta temporária).
// Rodar: npm test  (ou: node --test tests/servidor/api-limites.test.js)
import { test, describe, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { iniciar } from '../../server/index.mjs'
import { abrirBanco } from '../../server/db.mjs'
import { criarLimite, criarLimitesNoBanco, chaveDoIp, chaveDoBloco48 } from '../../server/api.mjs'

const abertos = []
after(() => { for (const s of abertos) { s.servidor.closeAllConnections(); s.servidor.close() } })

async function subir(opcoes = {}) {
  const s = await iniciar({ dbPath: ':memory:', porta: 0, log: () => {}, ...opcoes })
  abertos.push(s)
  const url = `http://127.0.0.1:${s.porta}`
  async function api(metodo, caminho, { token, corpo, cabecalhos = {} } = {}) {
    const headers = { ...cabecalhos }
    if (token) headers.Authorization = `Bearer ${token}`
    if (corpo !== undefined) headers['Content-Type'] = 'application/json'
    const r = await fetch(url + caminho, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) })
    const texto = await r.text()
    let json = null
    try { json = JSON.parse(texto) } catch { /* não é JSON */ }
    return { status: r.status, json, texto }
  }
  return { s, api }
}
const fechar = async (s) => { s.servidor.closeAllConnections(); await new Promise((ok) => s.servidor.close(ok)); abertos.splice(abertos.indexOf(s), 1) }
const folga = { pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 100_000, janelaMs: 60_000 }, pedidosPorBloco48: { max: 100_000, janelaMs: 60_000 } }

describe('A5 — IP do cliente atrás de proxy', () => {
  test('sem TRUST_PROXY, X-Forwarded-For é ignorado (trocar o cabeçalho não dá balde novo)', async () => {
    delete process.env.TRUST_PROXY
    const { api } = await subir({ limites: { ...folga, contasPorIp: { max: 2, janelaMs: 3_600_000 } } })
    const st = []
    for (let i = 0; i < 3; i++) st.push((await api('POST', '/api/conta', { corpo: { apelido: `Sem Proxy ${i}` }, cabecalhos: { 'X-Forwarded-For': `9.9.9.${i}` } })).status)
    assert.deepEqual(st, [201, 201, 429])
  })

  // regra mudou (S2-4, parecer nº 2): TRUST_PROXY=1 só vale com a lista TRUST_PROXY_IPS (aqui, o proxy é o 127.0.0.1 do teste)
  test('com TRUST_PROXY=1 (lido no arranque): vale o endereço mais à direita que não é o do proxy; o que o cliente põe à esquerda não muda nada', async () => {
    process.env.TRUST_PROXY = '1'; process.env.TRUST_PROXY_IPS = '127.0.0.1'
    let api
    try { ({ api } = await subir({ limites: { ...folga, contasPorIp: { max: 2, janelaMs: 3_600_000 } } })) } finally { delete process.env.TRUST_PROXY; delete process.env.TRUST_PROXY_IPS }
    const criar = (xff, i) => api('POST', '/api/conta', { corpo: { apelido: `Proxy ${xff.length} ${i}` }, cabecalhos: xff ? { 'X-Forwarded-For': xff } : {} })
    assert.equal((await criar('1.1.1.1, 9.9.9.1', 1)).status, 201)
    assert.equal((await criar('2.2.2.2, 9.9.9.1', 2)).status, 201) // inventar a esquerda não troca de balde
    assert.equal((await criar('9.9.9.1', 3)).status, 429)
    assert.equal((await criar('9.9.9.2', 4)).status, 201) // outro jogador atrás do mesmo proxy: balde próprio
    assert.equal((await criar('9.9.9.3, 127.0.0.1', 5)).status, 201) // o endereço do próprio proxy é pulado
    assert.equal((await criar('9.9.9.3, lixo', 6)).status, 201) // lixo não é IP: pulado
    assert.equal((await criar('9.9.9.3', 7)).status, 429)
    assert.equal((await criar('', 8)).status, 201) // sem cabeçalho: o do socket
  })

  test('IPv6 contado também pelo bloco /48 (65.536 /64 dentro de um /48 não abrem 65.536 baldes)', async () => {
    assert.equal(chaveDoBloco48('2001:db8:1:2::1'), chaveDoBloco48('2001:0db8:0001:ffff:1::9'))
    assert.notEqual(chaveDoBloco48('2001:db8:1::1'), chaveDoBloco48('2001:db8:2::1'))
    assert.equal(chaveDoBloco48('10.0.0.1'), null)
    assert.equal(chaveDoBloco48('::ffff:10.0.0.1'), null)
    assert.notEqual(chaveDoIp('2001:db8:1:2::1'), chaveDoIp('2001:db8:1:3::1'))
    process.env.TRUST_PROXY = '1'; process.env.TRUST_PROXY_IPS = '127.0.0.1' // regra mudou (S2-4): proxy só com a lista
    let api
    try { ({ api } = await subir({ limites: { ...folga, contasPorIp: { max: 5, janelaMs: 3_600_000 }, contasPorBloco48: { max: 3, janelaMs: 3_600_000 } } })) } finally { delete process.env.TRUST_PROXY; delete process.env.TRUST_PROXY_IPS }
    const st = []
    for (let i = 1; i <= 4; i++) st.push((await api('POST', '/api/conta', { corpo: { apelido: `Seis ${i}` }, cabecalhos: { 'X-Forwarded-For': `2001:db8:1:${i}::1` } })).status)
    assert.deepEqual(st, [201, 201, 201, 429])
    assert.equal((await api('POST', '/api/conta', { corpo: { apelido: 'Seis 5' }, cabecalhos: { 'X-Forwarded-For': '2001:db8:2:1::1' } })).status, 201)
  })
})

describe('A5/A9 — limites guardados no banco', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'frayz-limites-'))

  test('reiniciar o servidor não zera o limite de criação de conta', async () => {
    const arq = path.join(pasta, 'reinicio.db')
    const limites = { ...folga, contasPorIp: { max: 2, janelaMs: 3_600_000 } }
    const um = await subir({ dbPath: arq, limites })
    assert.equal((await um.api('POST', '/api/conta', { corpo: { apelido: 'Antes 1' } })).status, 201)
    assert.equal((await um.api('POST', '/api/conta', { corpo: { apelido: 'Antes 2' } })).status, 201)
    await fechar(um.s)
    const dois = await subir({ dbPath: arq, limites })
    const r = await dois.api('POST', '/api/conta', { corpo: { apelido: 'Depois 1' } })
    assert.equal(r.status, 429, r.texto); assert.equal(r.json.erro.codigo, 'MUITAS_CONTAS')
    await fechar(dois.s)
  })

  test('limite de pedidos por conta também sobrevive a reinício', async () => {
    const arq = path.join(pasta, 'reinicio-pedidos.db')
    const limites = { ...folga, pedidosPorConta: { max: 3, janelaMs: 60_000 } }
    const um = await subir({ dbPath: arq, limites })
    const { token } = (await um.api('POST', '/api/conta', { corpo: { apelido: 'Pedinte' } })).json
    for (let i = 0; i < 3; i++) assert.equal((await um.api('GET', '/api/estado', { token })).status, 200)
    await fechar(um.s)
    const dois = await subir({ dbPath: arq, limites })
    assert.equal((await dois.api('GET', '/api/estado', { token })).status, 429)
    await fechar(dois.s)
  })

  const medir = (contar, n = 2000) => {
    const t0 = performance.now()
    for (let i = 0; i < n; i++) contar()
    return (performance.now() - t0) / n
  }

  test('70 mil chaves no limite em memória não deixam o pedido lento', () => {
    const t = 1_000
    const contar = criarLimite({ max: 600, janelaMs: 60_000 }, () => t)
    for (let i = 0; i < 70_000; i++) contar(chaveDoIp(`2001:db8:1:${i.toString(16)}::1`))
    const ms = medir(() => contar('1.2.3.4'))
    assert.ok(ms < 0.05, `${ms.toFixed(3)} ms por pedido só no limite`)
  })

  // regra mudou (S2-3, parecer nº 2): a limpeza não para no primeiro lote — apaga em lotes, em laço, até acabar
  // (antes: 1 lote por minuto, e a tabela crescia mais rápido do que a limpeza)
  test('70 mil chaves no limite do banco não deixam o pedido lento; limpeza por idade em lotes até acabar', async () => {
    let t = 1_000_000
    const db = abrirBanco(':memory:')
    const contar = criarLimitesNoBanco(db, () => t, { intervaloMs: 60_000, lote: 1000, idadeMaxMs: 3_600_000 })
    const cfg = { max: 600, janelaMs: 60_000 }
    db.exec('BEGIN')
    for (let i = 0; i < 70_000; i++) contar(`ip:${chaveDoIp(`2001:db8:1:${i.toString(16)}::1`)}`, cfg)
    db.exec('COMMIT')
    const ms = medir(() => contar('ip:1.2.3.4', cfg))
    assert.ok(ms < 0.2, `${ms.toFixed(3)} ms por pedido só no limite`)
    assert.equal(contar('ip:1.2.3.4', cfg), false) // 2001 pedidos na janela: passou do máximo
    // depois da idade máxima: a limpeza apaga todas as velhas (em lotes de 1000, num laço)
    t += 3_600_001
    const t0 = performance.now()
    contar('ip:5.6.7.8', cfg)
    const msLimpeza = performance.now() - t0
    assert.equal(db.prepare('SELECT COUNT(*) n FROM limites').get().n, 1) // 70.001 chaves velhas apagadas, 1 chave nova
    assert.ok(msLimpeza < 2000, `limpeza de 70 mil chaves: ${msLimpeza.toFixed(0)} ms`)
    db.prepare('INSERT INTO limites (chave, inicio, n) VALUES (?, ?, 1)').run('ip:velha', t - 3_600_001)
    contar('ip:5.6.7.8', cfg) // dentro do intervalo: não limpa de novo
    assert.equal(db.prepare('SELECT COUNT(*) n FROM limites').get().n, 2)
    t += 60_000
    contar('ip:5.6.7.8', cfg)
    assert.equal(db.prepare('SELECT COUNT(*) n FROM limites').get().n, 1)
    db.close()
  })

  test('pedido HTTP com 70 mil chaves no banco de limites continua rápido', async () => {
    const { s, api } = await subir({ limites: folga })
    const { token } = (await api('POST', '/api/conta', { corpo: { apelido: 'Rapido' } })).json
    const medirHttp = async () => { const t0 = performance.now(); for (let i = 0; i < 40; i++) await api('GET', '/api/estado', { token }); return (performance.now() - t0) / 40 }
    const antes = await medirHttp()
    const ins = s.db.prepare('INSERT INTO limites (chave, inicio, n) VALUES (?, ?, 1)')
    s.db.exec('BEGIN')
    for (let i = 0; i < 70_000; i++) ins.run(`ip:2001:db8:1:${i.toString(16)}::/64`, Date.now())
    s.db.exec('COMMIT')
    const depois = await medirHttp()
    assert.ok(depois < antes * 3 + 5, `antes ${antes.toFixed(2)} ms, depois ${depois.toFixed(2)} ms por pedido`)
  })
})

describe('A10 — apelido', () => {
  test('normaliza, compara sem maiúsculas e recusa letra de outro alfabeto', async () => {
    const { api } = await subir({ limites: { ...folga, contasPorIp: { max: 1000, janelaMs: 3_600_000 } } })
    const ok = await api('POST', '/api/conta', { corpo: { apelido: '  Ana   Souza ' } })
    assert.equal(ok.status, 201, ok.texto)
    assert.equal(ok.json.conta.apelido, 'Ana Souza')
    for (const repetido of ['ana souza', 'ANA SOUZA', 'Ana  Souza', 'Ａna Souza' /* A largo */]) {
      const r = await api('POST', '/api/conta', { corpo: { apelido: repetido } })
      assert.equal(r.status, 409, `${repetido} → ${r.texto}`); assert.equal(r.json.erro.codigo, 'APELIDO_EM_USO')
    }
    for (const ruim of ['Аna Souza' /* А cirílico */, 'Jоhn' /* о cirílico */, 'Ωmega', 'á́́b', 'Ana 😀', '...', '---', 'Ana​Souza']) {
      const r = await api('POST', '/api/conta', { corpo: { apelido: ruim } })
      assert.equal(r.status, 400, `${ruim} → ${r.texto}`); assert.equal(r.json.erro.codigo, 'APELIDO_INVALIDO')
    }
    for (const bom of ['Zé_do-Pão.1', 'Çaçá Ñandú', 'ana.souza']) {
      const r = await api('POST', '/api/conta', { corpo: { apelido: bom } })
      assert.equal(r.status, 201, `${bom} → ${r.texto}`)
    }
  })

  test('mesmo apelido em corrida: só uma conta nasce', async () => {
    const { s, api } = await subir({ limites: { ...folga, contasPorIp: { max: 1000, janelaMs: 3_600_000 } } })
    const todos = await Promise.all(Array.from({ length: 8 }, (_, i) => api('POST', '/api/conta', { corpo: { apelido: i % 2 ? 'Gêmeo' : 'GÊMEO' } })))
    assert.equal(todos.filter((r) => r.status === 201).length, 1)
    assert.ok(todos.filter((r) => r.status !== 201).every((r) => r.json.erro.codigo === 'APELIDO_EM_USO'))
    assert.equal(s.db.prepare('SELECT COUNT(*) n FROM contas').get().n, 1)
  })
})

describe('chaves de emergência (lidas a cada pedido)', () => {
  test('MANUTENCAO=1: toda /api/* responde 503; arquivos estáticos continuam; desligar volta na hora', async () => {
    const { api } = await subir({ limites: folga })
    const { token } = (await api('POST', '/api/conta', { corpo: { apelido: 'Manutenção' } })).json
    try {
      process.env.MANUTENCAO = '1'
      for (const [m, p, corpo] of [['GET', '/api/estado'], ['POST', '/api/luta', { modo: 'livre', time: [] }], ['GET', '/api/nada'], ['POST', '/api/conta', { apelido: 'Outra Conta' }]]) {
        const r = await api(m, p, { token, corpo })
        assert.equal(r.status, 503, `${m} ${p}`); assert.equal(r.json.erro.codigo, 'MANUTENCAO')
      }
      assert.equal((await api('GET', '/')).status, 200)
      assert.equal((await api('GET', '/shared/batalha.js')).status, 200)
    } finally { delete process.env.MANUTENCAO }
    assert.equal((await api('GET', '/api/estado', { token })).status, 200)
  })

  test('SAVE_SO_LEITURA=1: todo POST 503 SO_LEITURA, todo GET funciona; desligar volta na hora', async () => {
    const { s, api } = await subir({ limites: folga })
    const { token } = (await api('POST', '/api/conta', { corpo: { apelido: 'Leitor' } })).json
    const time = (await api('GET', '/api/estado', { token })).json.bonecos.slice(0, 3).map((b) => b.id)
    try {
      process.env.SAVE_SO_LEITURA = '1'
      for (const [p, corpo] of [['/api/luta', { modo: 'livre', time }], ['/api/conta', { apelido: 'Nova No Leitor' }], ['/api/sair', undefined]]) {
        const r = await api('POST', p, { token, corpo })
        assert.equal(r.status, 503, p); assert.equal(r.json.erro.codigo, 'SO_LEITURA')
      }
      const g = await api('GET', '/api/estado', { token })
      assert.equal(g.status, 200)
      assert.equal(s.db.prepare('SELECT COUNT(*) n FROM lutas').get().n, 0)
    } finally { delete process.env.SAVE_SO_LEITURA }
    assert.equal((await api('POST', '/api/luta', { token, corpo: { modo: 'livre', time } })).status, 201)
  })
})

describe('sessão', () => {
  test('validade de 720 h renovada a cada uso; parada mais que isso → 401 SESSAO_VENCIDA (relógio injetado)', async () => {
    let t = 3_000_000_000_000
    const { api } = await subir({ agora: () => t, limites: folga })
    const { token } = (await api('POST', '/api/conta', { corpo: { apelido: 'Viajante' } })).json
    t += 719 * 3_600_000
    assert.equal((await api('GET', '/api/estado', { token })).status, 200)
    t += 719 * 3_600_000 // 1438 h desde a criação, mas só 719 h desde o último uso
    assert.equal((await api('GET', '/api/estado', { token })).status, 200)
    t += 721 * 3_600_000
    const r = await api('GET', '/api/estado', { token })
    assert.equal(r.status, 401); assert.equal(r.json.erro.codigo, 'SESSAO_VENCIDA')
    assert.equal((await api('GET', '/api/estado', { token })).json.erro.codigo, 'SESSAO_VENCIDA')
  })

  test('POST /api/sair invalida o token (e só o dele)', async () => {
    const { api } = await subir({ limites: folga })
    const a = (await api('POST', '/api/conta', { corpo: { apelido: 'Saidor' } })).json
    const b = (await api('POST', '/api/conta', { corpo: { apelido: 'Ficador' } })).json
    assert.equal((await api('POST', '/api/sair')).status, 401)
    const corpoRuim = await api('POST', '/api/sair', { token: a.token, corpo: { tudo: true } })
    assert.equal(corpoRuim.status, 400)
    const s = await api('POST', '/api/sair', { token: a.token })
    assert.equal(s.status, 200, s.texto)
    const r = await api('GET', '/api/estado', { token: a.token })
    assert.equal(r.status, 401); assert.equal(r.json.erro.codigo, 'SEM_SESSAO')
    assert.equal((await api('GET', '/api/estado', { token: b.token })).status, 200)
  })
})

// ---------------------------------------------------------------- parecer de segurança nº 2 (rodada 2 do servidor)

describe('parecer nº 2 — S2-1: o arquivo -wal não cresce sem fim', () => {
  test('banco em arquivo: 3.000 pedidos sem sessão não deixam o WAL passar de 8 MB', async () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'frayz-wal-'))
    const arq = path.join(pasta, 'wal.db')
    const { s, api } = await subir({ dbPath: arq, limites: folga })
    try {
      for (let i = 0; i < 3000; i++) await api('GET', '/api/nada')
      const mb = fs.statSync(`${arq}-wal`).size / 1048576
      console.log(`S2-1: WAL depois de 3.000 pedidos: ${mb.toFixed(2)} MB`)
      assert.ok(mb <= 8, `WAL com ${mb.toFixed(1)} MB`)
      assert.equal(s.db.isTransaction, false)
    } finally { await fechar(s) }
  })
})

describe('parecer nº 2 — S2-3: tabela de limites', () => {
  test('limpeza: cada tipo de chave sai com a janela dele (a de 1 min não espera a de 1 h)', () => {
    let t = 5_000_000
    const db = abrirBanco(':memory:')
    const contar = criarLimitesNoBanco(db, () => t, { intervaloMs: 60_000, lote: 100, janelas: { conta: 60_000, nova: 3_600_000 } })
    const ins = db.prepare('INSERT INTO limites (chave, inicio, n) VALUES (?, ?, 1)')
    for (let i = 0; i < 350; i++) ins.run(`conta:${i}`, t - 61_000)
    ins.run('nova:1.2.3.4', t - 61_000)
    contar('ip:9.9.9.9', { max: 10, janelaMs: 60_000 })
    const chaves = db.prepare('SELECT chave FROM limites ORDER BY chave').all().map((x) => x.chave)
    assert.deepEqual(chaves, ['ip:9.9.9.9', 'nova:1.2.3.4'])
    db.close()
  })

  test('IPv6: recusado no /48, nem cria a chave do /64 (girar o /64 não enche a tabela)', async () => {
    const { s, api } = await subir({ proxies: ['127.0.0.1'], limites: { ...folga, pedidosPorBloco48: { max: 3, janelaMs: 60_000 } } })
    const st = []
    for (let i = 1; i <= 20; i++) st.push((await api('GET', '/api/nada', { cabecalhos: { 'X-Forwarded-For': `2001:db8:7:${i.toString(16)}::1` } })).status)
    assert.deepEqual(st, [404, 404, 404, ...Array(17).fill(429)])
    assert.equal(s.db.prepare("SELECT COUNT(*) n FROM limites WHERE chave LIKE 'ip:%'").get().n, 3)
  })
})

describe('parecer nº 2 — S2-6: SAVE_SO_LEITURA não grava nem o limite', () => {
  test('com SAVE_SO_LEITURA=1 o GET não toca na tabela de limites; o limite continua valendo (em memória)', async () => {
    const { s, api } = await subir({ limites: { ...folga, pedidosPorIp: { max: 8, janelaMs: 60_000 } } })
    const { token } = (await api('POST', '/api/conta', { corpo: { apelido: 'So Leitura' } })).json
    const foto = () => JSON.stringify(s.db.prepare('SELECT * FROM limites ORDER BY chave').all())
    const antes = foto()
    const st = []
    try {
      process.env.SAVE_SO_LEITURA = '1'
      for (let i = 0; i < 9; i++) st.push((await api('GET', '/api/estado', { token })).status)
    } finally { delete process.env.SAVE_SO_LEITURA }
    assert.deepEqual(st, [...Array(8).fill(200), 429])
    assert.equal(foto(), antes)
  })
})

describe('parecer nº 2 — S2-4: X-Forwarded-For só do proxy da lista', () => {
  test('TRUST_PROXY=1 sem TRUST_PROXY_IPS: o cabeçalho é ignorado e o boot avisa no log', async () => {
    const linhas = []
    process.env.TRUST_PROXY = '1'
    let api
    try { ({ api } = await subir({ log: (l) => linhas.push(l), limites: { ...folga, contasPorIp: { max: 2, janelaMs: 3_600_000 } } })) } finally { delete process.env.TRUST_PROXY }
    assert.ok(linhas.some((l) => /TRUST_PROXY_IPS/.test(l)), linhas.join('\n'))
    const st = []
    for (let i = 0; i < 3; i++) st.push((await api('POST', '/api/conta', { corpo: { apelido: `Sem Lista ${i}` }, cabecalhos: { 'X-Forwarded-For': `9.9.8.${i}` } })).status)
    assert.deepEqual(st, [201, 201, 429])
  })

  test('conexão que não vem de um IP da lista: o cabeçalho é ignorado', async () => {
    process.env.TRUST_PROXY = '1'; process.env.TRUST_PROXY_IPS = '10.20.30.40'
    let api
    try { ({ api } = await subir({ limites: { ...folga, contasPorIp: { max: 2, janelaMs: 3_600_000 } } })) } finally { delete process.env.TRUST_PROXY; delete process.env.TRUST_PROXY_IPS }
    const st = []
    for (let i = 0; i < 3; i++) st.push((await api('POST', '/api/conta', { corpo: { apelido: `Fora Lista ${i}` }, cabecalhos: { 'X-Forwarded-For': `9.9.7.${i}` } })).status)
    assert.deepEqual(st, [201, 201, 429])
  })
})

describe('parecer nº 2 — S2-5: apelido sem letras parecidas', () => {
  test('letras parecidas de dentro do latino são recusadas; o resto compara sem acento, sem caixa e com I/l/1 e O/0 juntos', async () => {
    const { api } = await subir({ limites: { ...folga, contasPorIp: { max: 1000, janelaMs: 3_600_000 } } })
    const criar = (apelido) => api('POST', '/api/conta', { corpo: { apelido } })
    for (const nome of ['Ina', 'lana', 'José', 'STRASSE', 'Bob0']) assert.equal((await criar(nome)).status, 201, nome)
    for (const ruim of ['İna', 'ına', 'ɑna', 'ᴀna', 'ǀana', 'Straße', 'Æon', 'Øle']) {
      const r = await criar(ruim)
      assert.equal(r.status, 400, `${ruim} → ${r.texto}`); assert.equal(r.json.erro.codigo, 'APELIDO_INVALIDO')
    }
    for (const igual of ['INA', 'Iana', 'Lana', '1ana', 'Jose', 'JOSÉ', 'jóse', 'strasse', 'BobO', 'bobo']) {
      const r = await criar(igual)
      assert.equal(r.status, 409, `${igual} → ${r.texto}`); assert.equal(r.json.erro.codigo, 'APELIDO_EM_USO')
    }
  })
})
