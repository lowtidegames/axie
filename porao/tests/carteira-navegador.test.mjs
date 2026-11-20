// Teste da carteira no navegador (porao/tela/carteira-navegador.js) e da sessão em porao/tela/api.js,
// com uma "janela" mínima falsa (EventTarget + CustomEvent do Node 22). Rodar: node --test porao/tests/carteira-navegador.test.mjs
//
// Se porao/comum/base58.js (tarefa 3 da abertura) ainda não existir, um gancho de carga põe no lugar
// um base58 mínimo SÓ para este teste. Quando o arquivo existir, o de verdade é usado.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { register } from 'node:module'

const B58_REAL = new URL('../comum/base58.js', import.meta.url)
if (!fs.existsSync(B58_REAL)) {
  const reserva = `
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    export function codificar(b) {
      b = Uint8Array.from(b); let n = 0n; for (const x of b) n = n * 256n + BigInt(x);
      let s = ''; while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; }
      for (const x of b) { if (x !== 0) break; s = '1' + s; } return s;
    }`
  const alvo = B58_REAL.href
  const gancho = `
    export async function resolve(esp, ctx, prox) {
      let url = null;
      try { url = new URL(esp, ctx.parentURL).href; } catch { /* não é caminho */ }
      if (url === ${JSON.stringify(alvo)}) return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(reserva)}), shortCircuit: true };
      return prox(esp, ctx);
    }`
  register('data:text/javascript,' + encodeURIComponent(gancho))
}

const { iniciarCarteiras, carteiraServe } = await import('../tela/carteira-navegador.js')
const { criarApi } = await import('../tela/api.js')
const B58 = await import('../comum/base58.js')
const b58 = B58.codificar ?? B58.encode ?? B58.paraBase58 ?? B58.codificarBase58

/** Carteira Standard de mentira com par ed25519 do crypto.subtle. */
async function carteiraFalsa({ nome = 'Falsa', comAssinar = true, cadeia = 'solana:devnet', trocarTexto = false } = {}) {
  const sutil = globalThis.crypto.subtle
  const par = await sutil.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
  const chave = new Uint8Array(await sutil.exportKey('raw', par.publicKey))
  const conta = { address: b58(chave), publicKey: chave, chains: [cadeia], features: ['solana:signMessage'] }
  const features = { 'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [conta] }) } }
  if (comAssinar) {
    features['solana:signMessage'] = {
      version: '1.0.0',
      async signMessage({ message }) {
        const assinada = trocarTexto ? new TextEncoder().encode(new TextDecoder().decode(message) + ' extra') : message
        const signature = new Uint8Array(await sutil.sign({ name: 'Ed25519' }, par.privateKey, assinada))
        return [{ signedMessage: assinada, signature }]
      },
    }
  }
  return { w: { version: '1.0.0', name: nome, icon: 'data:image/svg+xml,x', chains: [cadeia], accounts: [], features }, par, chave }
}

function registrarPeloEvento(janela, w) {
  janela.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: ({ register }) => register(w) }))
}

describe('carteira-navegador', () => {
  test('anuncia app-ready com { register }', () => {
    const janela = new EventTarget()
    let recebido = null
    janela.addEventListener('wallet-standard:app-ready', (ev) => { recebido = ev.detail })
    iniciarCarteiras(janela)
    assert.equal(typeof recebido?.register, 'function')
  })

  test('carteira registrada pelo evento aparece na lista, conecta e assina (assinatura confere)', async () => {
    const janela = new EventTarget()
    const vigia = iniciarCarteiras(janela)
    const { w, par, chave } = await carteiraFalsa({ nome: 'Boa' })
    registrarPeloEvento(janela, w)
    const lista = vigia.listarCarteiras()
    assert.deepEqual(lista.map((c) => c.nome), ['Boa'])
    assert.equal(lista[0].icone, 'data:image/svg+xml,x')
    const s = await lista[0].conectar()
    assert.equal(s.carteira, b58(chave))
    const msg = 'Porão\nCarteira: x\nNúmero: 1'
    const assinatura = await s.assinar(msg)
    assert.equal(typeof assinatura, 'string')
    // confere de novo com a chave (assinatura em base58 → precisa decodificar: confere pela própria carteira)
    const sig = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, par.privateKey, new TextEncoder().encode(msg)))
    assert.equal(assinatura, b58(sig)) // ed25519 é determinística
  })

  test('carteira que já estava esperando app-ready também entra', async () => {
    const janela = new EventTarget()
    const { w } = await carteiraFalsa({ nome: 'Cedo' })
    janela.addEventListener('wallet-standard:app-ready', (ev) => ev.detail.register(w))
    const vigia = iniciarCarteiras(janela)
    assert.deepEqual(vigia.listarCarteiras().map((c) => c.nome), ['Cedo'])
  })

  test('carteira sem solana:signMessage é ignorada; sem cadeia solana também', async () => {
    const janela = new EventTarget()
    const vigia = iniciarCarteiras(janela)
    registrarPeloEvento(janela, (await carteiraFalsa({ nome: 'SemAssinar', comAssinar: false })).w)
    registrarPeloEvento(janela, (await carteiraFalsa({ nome: 'OutraRede', cadeia: 'eip155:1' })).w)
    assert.deepEqual(vigia.listarCarteiras(), [])
    assert.equal(carteiraServe({ features: {} }), false)
  })

  test('signedMessage diferente da pedida é recusada', async () => {
    const janela = new EventTarget()
    const vigia = iniciarCarteiras(janela)
    registrarPeloEvento(janela, (await carteiraFalsa({ nome: 'Trapaceira', trocarTexto: true })).w)
    const s = await vigia.listarCarteiras()[0].conectar()
    await assert.rejects(s.assinar('texto pedido'), /diferente/)
  })

  test('reserva: phantom.solana, solflare e backpack entram; objeto de rede EVM nunca', async () => {
    const { chave, par } = await carteiraFalsa()
    const prov = {
      publicKey: { toBytes: () => chave },
      connect: async () => ({ publicKey: { toBytes: () => chave } }),
      signMessage: async (m) => ({ signature: new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, par.privateKey, m)) }),
    }
    const janela = new EventTarget()
    janela.phantom = { solana: prov }
    janela.solflare = prov
    janela.backpack = prov
    janela.ethereum = { request: () => { throw new Error('não pode ser usado') } }
    const lista = iniciarCarteiras(janela).listarCarteiras()
    assert.deepEqual(lista.map((c) => c.nome), ['Phantom', 'Solflare', 'Backpack'])
    const s = await lista[0].conectar()
    assert.equal(s.carteira, b58(chave))
    assert.equal(typeof (await s.assinar('oi')), 'string')
    const fonte = fs.readFileSync(new URL('../tela/carteira-navegador.js', import.meta.url), 'utf8')
    assert.ok(!/ethereum/i.test(fonte), 'carteira-navegador.js não pode citar window.ethereum')
  })

  test('mesma carteira pelo padrão e pela reserva aparece uma vez só', async () => {
    const janela = new EventTarget()
    const { w } = await carteiraFalsa({ nome: 'Phantom' })
    janela.phantom = { solana: { connect: async () => ({}), signMessage: async () => ({}) } }
    const vigia = iniciarCarteiras(janela)
    registrarPeloEvento(janela, w)
    const lista = vigia.listarCarteiras()
    assert.equal(lista.length, 1)
    assert.equal(lista[0].origem, 'padrao')
  })
})

describe('api.js: sessão', () => {
  function respostaJson(status, corpo) {
    return new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })
  }

  test('401 dispara sem-sessao e NÃO cai no modo falso; toda chamada leva X-Porao: 1', async () => {
    const janela = new EventTarget()
    const pedidos = []
    const antigo = globalThis.fetch
    globalThis.fetch = async (url, init) => { pedidos.push({ url, init }); return respostaJson(401, { ok: false, erro: 'sem sessão', codigo: 'sem_sessao' }) }
    try {
      let avisos = 0
      janela.addEventListener('sem-sessao', () => { avisos++ })
      const api = await criarApi({ busca: '', base: 'http://x', janela })
      assert.equal(api.modo, 'servidor')
      assert.equal(pedidos[0].url, 'http://x/api/sessao')
      const avisosDaSonda = avisos
      const r = await api.estado()
      assert.equal(r.ok, false)
      assert.equal(r.codigo, 'sem_sessao')
      const s = await api.sessao()
      assert.equal(s.semSessao, true)
      assert.equal(avisos - avisosDaSonda, 2)
      for (const p of pedidos) assert.equal(p.init.headers['X-Porao'], '1')
    } finally { globalThis.fetch = antigo }
  })

  test('rotas e corpos da sessão', async () => {
    const janela = new EventTarget()
    const pedidos = []
    const antigo = globalThis.fetch
    globalThis.fetch = async (url, init) => { pedidos.push({ url, metodo: init?.method || 'GET', corpo: init?.body && JSON.parse(init.body), h: init?.headers }); return respostaJson(200, { ok: true, conta: null }) }
    try {
      const api = await criarApi({ busca: '', janela })
      pedidos.length = 0
      await api.sessao()
      await api.desafio('CARTEIRA')
      await api.entrar({ carteira: 'CARTEIRA', nonce: 'n1', assinatura: 'sig', extra: 'não vai' })
      await api.convidado()
      await api.sair()
      await api.apelido('Zé')
      assert.deepEqual(pedidos.map((p) => `${p.metodo} ${p.url}`), [
        'GET /api/sessao', 'POST /api/sessao/desafio', 'POST /api/sessao/entrar',
        'POST /api/sessao/convidado', 'POST /api/sessao/sair', 'POST /api/apelido',
      ])
      assert.deepEqual(pedidos[1].corpo, { carteira: 'CARTEIRA' })
      assert.deepEqual(pedidos[2].corpo, { carteira: 'CARTEIRA', nonce: 'n1', assinatura: 'sig' })
      assert.deepEqual(pedidos[5].corpo, { apelido: 'Zé' })
      for (const p of pedidos) assert.equal(p.h['X-Porao'], '1')
    } finally { globalThis.fetch = antigo }
  })

  test('servidor que não responde → modo falso', async () => {
    const antigo = globalThis.fetch
    globalThis.fetch = async () => { throw new TypeError('sem rede') }
    try {
      const api = await criarApi({ busca: '', janela: new EventTarget() })
      assert.equal(api.modo, 'falso')
    } finally { globalThis.fetch = antigo }
  })

  test('?falso=1: carteira de teste aparece na lista, assina e entra; nonce não serve duas vezes', async () => {
    const janela = new EventTarget()
    const api = await criarApi({ busca: '?falso=1', janela })
    assert.equal(api.modo, 'falso')
    const vigia = iniciarCarteiras(janela)
    const c = vigia.listarCarteiras().find((x) => x.nome === 'Carteira de teste')
    assert.ok(c, 'carteira de teste na lista')
    assert.deepEqual(await api.sessao(), { ok: true, conta: null })
    const s = await c.conectar()
    const d = await api.desafio(s.carteira)
    assert.equal(d.ok, true)
    assert.match(d.mensagem, /NÃO é uma transação/)
    const assinatura = await s.assinar(d.mensagem)
    const e = await api.entrar({ carteira: s.carteira, nonce: d.nonce, assinatura })
    assert.equal(e.ok, true)
    assert.equal(e.conta.tipo, 'carteira')
    assert.equal((await api.entrar({ carteira: s.carteira, nonce: d.nonce, assinatura })).ok, false)
    const d2 = await api.desafio(s.carteira)
    assert.equal((await api.entrar({ carteira: s.carteira, nonce: d2.nonce, assinatura })).ok, false, 'assinatura de outra mensagem')
    assert.equal((await api.apelido('Dev Zé')).conta.apelido, 'Dev Zé')
    await api.sair()
    assert.equal((await api.sessao()).conta, null)
  })
})
