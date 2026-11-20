// H7: TRUST_PROXY_IPS aceita faixas CIDR (IPv4 e IPv6) e o servidor avisa uma vez quando chega X-Forwarded-For de conexão não confiável.
// Rodar: node --test tests/servidor/proxy-faixas.test.js
import { test, describe, after } from 'node:test'
import assert from 'node:assert/strict'
import { iniciar } from '../../server/index.mjs'
import { proxiesDoAmbiente, ipDoCliente } from '../../server/api.mjs'

const abertos = []
after(() => { for (const s of abertos) { s.servidor.closeAllConnections(); s.servidor.close() } })

const folga = { pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 100_000, janelaMs: 60_000 }, pedidosPorBloco48: { max: 100_000, janelaMs: 60_000 } }
const lista = (ips, linhas = []) => proxiesDoAmbiente({ TRUST_PROXY: '1', TRUST_PROXY_IPS: ips }, (l) => linhas.push(l))
const req = (socket, xff) => ({ socket: { remoteAddress: socket }, headers: xff === undefined ? {} : { 'x-forwarded-for': xff } })

async function subir(ips, linhas, contasPorIp = 2) {
  process.env.TRUST_PROXY = '1'; process.env.TRUST_PROXY_IPS = ips
  let s
  try { s = await iniciar({ dbPath: ':memory:', porta: 0, log: (l) => linhas.push(l), limites: { ...folga, contasPorIp: { max: contasPorIp, janelaMs: 3_600_000 } } }) } finally { delete process.env.TRUST_PROXY; delete process.env.TRUST_PROXY_IPS }
  abertos.push(s)
  const url = `http://127.0.0.1:${s.porta}`
  let n = 0
  const conta = async (xff) => {
    const headers = { 'Content-Type': 'application/json', ...(xff ? { 'X-Forwarded-For': xff } : {}) }
    const r = await fetch(`${url}/api/conta`, { method: 'POST', headers, body: JSON.stringify({ apelido: `Faixa ${ips.length} ${++n} ${Math.random().toString(36).slice(2, 6)}` }) })
    return r.status
  }
  return { conta }
}

describe('H7 — faixas CIDR em TRUST_PROXY_IPS', () => {
  test('faixa IPv4 e IPv6 aceita; vale o endereço do X-Forwarded-For quando a conexão está dentro', () => {
    const l = lista('100.64.0.0/10, fd00::/8, 192.168.1.5')
    assert.equal(l.has('100.64.0.1'), true)
    assert.equal(l.has('100.127.255.254'), true)
    assert.equal(l.has('100.128.0.1'), false)
    assert.equal(l.has('fd12:3456::1'), true)
    assert.equal(l.has('fe00::1'), false)
    assert.equal(l.has('192.168.1.5'), true)
    assert.equal(l.has('192.168.1.6'), false)
    assert.equal(ipDoCliente(req('100.64.3.4', '9.8.7.6'), l), '9.8.7.6')
    assert.equal(ipDoCliente(req('fd00:1::7', '9.8.7.6'), l), '9.8.7.6')
    assert.equal(ipDoCliente(req('::ffff:100.64.3.4', '9.8.7.6'), l), '9.8.7.6') // IPv4 mapeado em IPv6
    // mesma regra de salto: o mais à direita que não é proxy (nem da faixa)
    assert.equal(ipDoCliente(req('100.64.3.4', '1.1.1.1, 9.8.7.6, 100.64.9.9'), l), '9.8.7.6')
  })

  test('conexão fora da faixa: cabeçalho ignorado', () => {
    const l = lista('100.64.0.0/10, fd00::/8')
    assert.equal(ipDoCliente(req('203.0.113.9', '9.8.7.6'), l), '203.0.113.9')
    assert.equal(ipDoCliente(req('2001:db8::1', '9.8.7.6'), l), '2001:db8::1')
  })

  test('faixa inválida é ignorada com aviso; as boas continuam valendo', () => {
    const linhas = []
    const l = lista('10.0.0.0/33, fd00::/129, 10.0.0.0/0, lixo/8, 10.0.0.0/abc, 10.0.0.0/, 172.16.0.0/12', linhas)
    assert.equal(linhas.filter((x) => x.includes('faixa inválida')).length, 6, linhas.join('\n'))
    assert.equal(l.has('10.0.0.1'), false)
    assert.equal(l.has('172.16.5.5'), true)
  })

  test('sem TRUST_PROXY, faixa não vale (o cabeçalho continua ignorado)', () => {
    const l = proxiesDoAmbiente({ TRUST_PROXY_IPS: '127.0.0.0/8' }, () => {})
    assert.equal(ipDoCliente(req('127.0.0.1', '9.8.7.6'), l), '127.0.0.1')
  })

  test('dois visitantes atrás do mesmo proxy da faixa têm limites de conta SEPARADOS', async () => {
    const { conta } = await subir('127.0.0.0/8', [])
    assert.equal(await conta('9.9.9.1'), 201)
    assert.equal(await conta('9.9.9.1'), 201)
    assert.equal(await conta('9.9.9.1'), 429)
    assert.equal(await conta('9.9.9.2'), 201) // outro visitante: balde próprio
  })

  test('conexão fora da faixa: forjar X-Forwarded-For não foge do limite', async () => {
    const { conta } = await subir('10.0.0.0/8', [])
    const st = []
    for (let i = 0; i < 3; i++) st.push(await conta(`9.9.9.${i}`))
    assert.deepEqual(st, [201, 201, 429])
  })

  test('aviso do X-Forwarded-For de conexão não confiável: uma vez só, com o endereço da conexão e sem o conteúdo do cabeçalho', async () => {
    const linhas = []
    const { conta } = await subir('10.0.0.0/8', linhas, 1000)
    await conta() // sem cabeçalho: sem aviso
    assert.equal(linhas.filter((l) => l.includes('X-Forwarded-For de uma conexão')).length, 0)
    await conta('7.7.7.7'); await conta('7.7.7.8'); await conta('7.7.7.9')
    const avisos = linhas.filter((l) => l.includes('X-Forwarded-For de uma conexão'))
    assert.equal(avisos.length, 1, linhas.join('\n'))
    assert.ok(avisos[0].includes('127.0.0.1'))
    assert.ok(!avisos[0].includes('7.7.7.7'))
  })

  test('conexão de proxy confiável com X-Forwarded-For não gera o aviso', async () => {
    const linhas = []
    const { conta } = await subir('127.0.0.0/8', linhas, 1000)
    await conta('7.7.7.7')
    assert.equal(linhas.filter((l) => l.includes('X-Forwarded-For de uma conexão')).length, 0)
  })
})
