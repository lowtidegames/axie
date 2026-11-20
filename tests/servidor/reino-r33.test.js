// R33 — o Perfil de /api/reino diz o prazo da conta: conta.diasSemUsoAtePerder, lido da MESMA constante que vence a sessão
// (PARAMS_SERVIDOR.validadeDaSessaoH). Só leitura; sem rota nova, sem entrada nova.
// Rodar: node --test tests/servidor/reino-r33.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { PARAMS_SERVIDOR } from '../../server/api.mjs'
import { iniciar } from '../../server/index.mjs'

const DIA = 86_400_000
const HORA = 3_600_000
const T0 = (4 + 7 * 3143) * DIA + 10 * HORA

async function subir(limites = {}) {
  let t = T0
  const s = await iniciar({ dbPath: ':memory:', porta: 0, agora: () => t, log: () => {}, limites })
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
  return { api, conta, andar: (ms) => { t += ms }, fechar: () => new Promise((ok) => s.servidor.close(ok)) }
}

describe('R33 — prazo da conta no Perfil', () => {
  test('GET perfil e POST apelido trazem conta.diasSemUsoAtePerder = validadeDaSessaoH / 24 (30 hoje)', async () => {
    const { api, conta, fechar } = await subir()
    try {
      const token = await conta('Prazo Um')
      const p = await api('GET', '/api/reino/perfil', token)
      assert.equal(p.status, 200, p.texto)
      assert.deepEqual(p.json.conta, { diasSemUsoAtePerder: PARAMS_SERVIDOR.validadeDaSessaoH / 24 })
      assert.equal(p.json.conta.diasSemUsoAtePerder, 30)
      const a = await api('POST', '/api/reino/apelido', token, { apelido: 'Prazo Dois' })
      assert.equal(a.status, 200, a.texto)
      assert.deepEqual(a.json.conta, p.json.conta)
    } finally { await fechar() }
  })

  test('o campo acompanha a constante: validadeDaSessaoH 240 → 10 dias, e a sessão vence mesmo depois disso', async () => {
    const { api, conta, andar, fechar } = await subir({ validadeDaSessaoH: 240 })
    try {
      const token = await conta('Prazo Tres')
      const p = await api('GET', '/api/reino/perfil', token)
      assert.equal(p.status, 200, p.texto)
      assert.equal(p.json.conta.diasSemUsoAtePerder, 10)
      andar(10 * DIA + 2 * 60_000)
      const depois = await api('GET', '/api/reino/perfil', token)
      assert.equal(depois.status, 401, depois.texto)
    } finally { await fechar() }
  })

  test('o campo é só leitura: mandar "conta" na troca de apelido é recusado', async () => {
    const { api, conta, fechar } = await subir()
    try {
      const token = await conta('Prazo Quatro')
      const a = await api('POST', '/api/reino/apelido', token, { apelido: 'Prazo Cinco', conta: { diasSemUsoAtePerder: 999 } })
      assert.equal(a.status, 400, a.texto)
    } finally { await fechar() }
  })
})
