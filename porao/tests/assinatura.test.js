// Porão — tarefa 3 da abertura (docs/porao/desenho-abertura.md): base58 e conferência da assinatura
// de mensagem (Ed25519, carteira Solana). Nenhuma rede, nenhuma transação.
// Rodar: node --test porao/tests/assinatura.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { codificar, decodificar, MAX_ENTRADA } from '../comum/base58.js'
import { montarMensagem, chavePublicaDe, conferirAssinatura } from '../servidor/assinatura.mjs'

const hex = (h) => new Uint8Array(Buffer.from(h, 'hex'))
const texto = (s) => new Uint8Array(Buffer.from(s, 'utf8'))

describe('base58 (alfabeto Bitcoin/Solana)', () => {
  const vetores = [
    ['', ''],
    ['00', '1'],
    ['000000', '111'],
    ['00000000000000000000', '1111111111'],
    ['61', '2g'],
    ['626262', 'a3gV'],
    ['636363', 'aPEr'],
    ['516b6fcd0f', 'ABnLTmg'],
    [Buffer.from('Hello World!').toString('hex'), '2NEpo7TZRRrLZSi2U'],
    [Buffer.from('The quick brown fox jumps over the lazy dog').toString('hex'),
      '7DdiPPYtxLjCD3wA1po2rvZHTDYjkZYiEtazrfiwJcwnKCizhGFhBGHeRdx'],
    ['00eb15231dfceb60925886b67d065299925915aeb172c06647', '1NS17iag9jJgTHD1VXjvLCEnZuQ3rJDE9L'],
    ['00'.repeat(32), '1'.repeat(32)], // programa do sistema da Solana
  ]
  for (const [h, b58] of vetores) {
    test(`vetor ${h.slice(0, 16) || '(vazio)'} ↔ ${b58 || '(vazio)'}`, () => {
      assert.equal(codificar(hex(h)), b58)
      assert.deepEqual(decodificar(b58), hex(h))
    })
  }

  test('ida e volta com zeros à esquerda e bytes aleatórios', () => {
    for (let i = 0; i < 200; i++) {
      const zeros = i % 5
      const b = new Uint8Array(zeros + (i % 70))
      crypto.randomFillSync(b, zeros)
      assert.deepEqual(decodificar(codificar(b)), b)
    }
  })

  test('recusa 0 O I l, espaço, acento e caracteres fora do alfabeto', () => {
    for (const s of ['0', 'O', 'I', 'l', 'abc0', '1O1', 'I11', 'l2g', ' 2g', '2g ', '2g\n', 'ã', '+', '/', '=', '-', '\u0000']) {
      assert.equal(decodificar(s), null, JSON.stringify(s))
    }
  })

  test('recusa o que não é texto e entrada grande demais sem travar', () => {
    for (const v of [null, undefined, 1, {}, [], new Uint8Array(2)]) assert.equal(decodificar(v), null)
    const t0 = Date.now()
    assert.equal(decodificar('2'.repeat(MAX_ENTRADA + 1)), null)
    assert.equal(decodificar('2'.repeat(1_000_000)), null)
    assert.ok(Date.now() - t0 < 200)
    assert.ok(typeof decodificar('2'.repeat(MAX_ENTRADA)) === 'object')
    assert.throws(() => codificar(new Uint8Array(MAX_ENTRADA + 1)), RangeError)
    assert.throws(() => codificar('abc'), TypeError)
  })
})

// RFC 8032, seção 7.1, TEST 1 (mensagem vazia)
const RFC_PUB = 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'
const RFC_SIG = 'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b'

function parGerado () {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const cru = publicKey.export({ format: 'der', type: 'spki' }).subarray(12)
  return { carteira: codificar(new Uint8Array(cru)), privateKey }
}
const assinar = (msg, privateKey) => codificar(new Uint8Array(crypto.sign(null, Buffer.from(msg, 'utf8'), privateKey)))

describe('assinatura de mensagem (Ed25519)', () => {
  test('RFC 8032 teste 1: chave pública, assinatura, mensagem vazia', () => {
    const carteira = codificar(hex(RFC_PUB))
    assert.deepEqual(chavePublicaDe(carteira), hex(RFC_PUB))
    assert.equal(conferirAssinatura('', carteira, codificar(hex(RFC_SIG))), true)
    assert.equal(conferirAssinatura(new Uint8Array(0), carteira, codificar(hex(RFC_SIG))), true)
    assert.equal(conferirAssinatura('x', carteira, codificar(hex(RFC_SIG))), false)
  })

  test('par gerado na hora confere com a mensagem do login', () => {
    const { carteira, privateKey } = parGerado()
    const msg = montarMensagem({ dominio: '127.0.0.1:4900', uri: 'http://127.0.0.1:4900', carteira, nonce: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', emitida: 1_763_673_420_000, vence: 1_763_673_720_000 })
    assert.equal(conferirAssinatura(msg, carteira, assinar(msg, privateKey)), true)
  })

  test('1 bit trocado na mensagem ou na assinatura = falso', () => {
    const { carteira, privateKey } = parGerado()
    const msg = 'Entrar no Porão\nteste'
    const sig = decodificar(assinar(msg, privateKey))
    const m = Buffer.from(msg, 'utf8')
    for (let i = 0; i < m.length * 8; i += 7) {
      const m2 = new Uint8Array(m); m2[i >> 3] ^= 1 << (i & 7)
      assert.equal(conferirAssinatura(m2, carteira, codificar(sig)), false)
    }
    for (let i = 0; i < 512; i += 5) {
      const s2 = new Uint8Array(sig); s2[i >> 3] ^= 1 << (i & 7)
      assert.equal(conferirAssinatura(msg, carteira, codificar(s2)), false)
    }
    // assinatura de outra carteira
    const outro = parGerado()
    assert.equal(conferirAssinatura(msg, outro.carteira, codificar(sig)), false)
  })

  test('chave de 31/33 bytes e assinatura de 63/65 bytes = falso; chavePublicaDe = null', () => {
    const { carteira, privateKey } = parGerado()
    const msg = 'oi'
    const sig = decodificar(assinar(msg, privateKey))
    const pub = decodificar(carteira)
    const c31 = codificar(pub.subarray(0, 31))
    const c33 = codificar(Uint8Array.from([...pub, 7]))
    assert.equal(chavePublicaDe(c31), null)
    assert.equal(chavePublicaDe(c33), null)
    assert.equal(conferirAssinatura(msg, c31, codificar(sig)), false)
    assert.equal(conferirAssinatura(msg, c33, codificar(sig)), false)
    assert.equal(conferirAssinatura(msg, carteira, codificar(sig.subarray(0, 63))), false)
    assert.equal(conferirAssinatura(msg, carteira, codificar(Uint8Array.from([...sig, 0]))), false)
    assert.equal(conferirAssinatura(msg, carteira, codificar(sig)), true)
  })

  test('lixo de todo tipo = falso, sem lançar erro', () => {
    const { carteira, privateKey } = parGerado()
    const sig = assinar('oi', privateKey)
    const lixos = [null, undefined, 0, 1n, '', '0OIl', '!!!', {}, [], () => 1, Symbol('x'), new Uint8Array(64), 'x'.repeat(100000)]
    for (const l of lixos) {
      assert.doesNotThrow(() => conferirAssinatura(l, carteira, sig))
      assert.doesNotThrow(() => conferirAssinatura('oi', l, sig))
      assert.doesNotThrow(() => conferirAssinatura('oi', carteira, l))
      assert.equal(conferirAssinatura('oi', l, sig), false)
      assert.equal(conferirAssinatura('oi', carteira, l), false)
      if (typeof l !== 'string' && !(l instanceof Uint8Array)) assert.equal(conferirAssinatura(l, carteira, sig), false)
      assert.equal(chavePublicaDe(l), null)
    }
    // 64 zeros como assinatura e 32 zeros como chave (ponto inválido/fraco)
    assert.equal(conferirAssinatura('oi', '1'.repeat(32), codificar(new Uint8Array(64))), false)
  })
})

describe('mensagem do login', () => {
  const base = { dominio: '127.0.0.1:4900', uri: 'http://127.0.0.1:4900', carteira: codificar(hex(RFC_PUB)), nonce: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', emitida: Date.UTC(2026, 10, 20, 21, 17, 0), vence: Date.UTC(2026, 10, 20, 21, 22, 0) }

  // Regra mudou (parecer v4, M1): o texto agora é SIWS — 1ª linha "<domínio> wants you to sign in...", frase na 4ª.
  test('texto fixo e sério, linhas com \\n, com site, carteira, nonce e horas', () => {
    const m = montarMensagem(base)
    const linhas = m.split('\n')
    assert.equal(linhas[0], '127.0.0.1:4900 wants you to sign in with your Solana account:')
    assert.ok(!m.includes('\r'))
    assert.ok(m.includes('127.0.0.1:4900'))
    assert.ok(m.includes(base.carteira))
    assert.ok(m.includes(base.nonce))
    assert.ok(m.includes('2026-11-20T21:17:00.000Z'))
    assert.ok(m.includes('2026-11-20T21:22:00.000Z'))
    assert.equal(linhas[3], 'Entrar no Porao. Isto nao e uma transacao e nao gasta nada.')
    assert.equal(montarMensagem(base), m) // mesma entrada, mesmo texto
  })

  test('mensagem toda em ASCII imprimível + \\n (carteira física com visor pequeno)', () => {
    const m = montarMensagem(base)
    assert.match(m, /^[\x20-\x7e\n]+$/)
    assert.throws(() => montarMensagem({ ...base, dominio: 'porão.local', uri: 'http://porão.local' }), TypeError)
    assert.throws(() => montarMensagem({ ...base, nonce: 'ação' }), TypeError)
  })

  test('recusa campo vazio, com quebra de linha ou carteira inválida (não monta mensagem torta)', () => {
    for (const ruim of [
      { dominio: '' }, { dominio: 'a\nb' }, { dominio: 'a b' },
      { carteira: 'abc' }, { carteira: '0OIl' }, { carteira: base.carteira + '\nx' },
      { nonce: '' }, { nonce: 'a\nb' }, { nonce: 'x'.repeat(200) },
      { emitida: 'ontem' }, { vence: NaN }, { vence: base.emitida }, { vence: base.emitida - 1 },
    ]) {
      assert.throws(() => montarMensagem({ ...base, ...ruim }), TypeError, JSON.stringify(ruim))
    }
  })
})

// Chave de ORDEM PEQUENA: com ela, uma assinatura forjada (ex.: 64 zeros) confere para várias mensagens
// sem ninguém ter chave privada (achado: Node 22 + chave 32 zeros + assinatura 64 zeros + "oi" = true).
// A conta de curva abaixo é independente do código: prova que cada chave recusada tem ordem que divide 8.
const P = 2n ** 255n - 19n
const mod = (a) => ((a % P) + P) % P
function pot (b, e) { let r = 1n; b = mod(b); while (e > 0n) { if (e & 1n) r = mod(r * b); b = mod(b * b); e >>= 1n } return r }
const inv = (a) => pot(a, P - 2n)
const D = mod(-121665n * inv(121666n))
function ponto (bytes) { // decodifica (x, y); null se não estiver na curva
  const b = Buffer.from(bytes); const sinal = b[31] >> 7; b[31] &= 0x7f
  const y = BigInt('0x' + Buffer.from(b).reverse().toString('hex'))
  const yy = mod(y * y); const alvo = mod(mod(yy - 1n) * inv(mod(D * yy + 1n)))
  let x = pot(alvo, (P + 3n) / 8n)
  if (mod(x * x - alvo) !== 0n) x = mod(x * pot(2n, (P - 1n) / 4n))
  if (mod(x * x - alvo) !== 0n) return null
  if ((x & 1n) !== BigInt(sinal)) x = mod(-x)
  return [x, mod(y)]
}
function soma ([x1, y1], [x2, y2]) {
  const t = mod(D * x1 * x2 * y1 * y2)
  return [mod((x1 * y2 + y1 * x2) * inv(mod(1n + t))), mod((y1 * y2 + x1 * x2) * inv(mod(1n - t)))]
}
const vezes8 = (p) => { let q = p; for (let i = 0; i < 3; i++) q = soma(q, q); return q }

const ORDEM_PEQUENA = [
  '0100000000000000000000000000000000000000000000000000000000000000',
  'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  '0000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000080',
  '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05',
  '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc85',
  'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a',
  'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac03fa',
  'edffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f', // y = p (não canônico de 0)
  'eeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f', // y = p+1 (não canônico de 1)
]

describe('chave de ordem pequena (assinatura forjável)', () => {
  test('a lista é mesmo de ordem pequena (conta de curva independente)', () => {
    for (const h of ORDEM_PEQUENA.slice(0, 8)) {
      const pt = ponto(hex(h))
      assert.ok(pt, h)
      assert.deepEqual(vezes8(pt), [0n, 1n], h)
    }
    // uma chave de verdade NÃO é de ordem pequena
    assert.notDeepEqual(vezes8(ponto(hex(RFC_PUB))), [0n, 1n])
  })

  test('chavePublicaDe recusa e conferirAssinatura dá falso, até com assinatura forjada', () => {
    const zeros64 = codificar(new Uint8Array(64))
    for (const h of ORDEM_PEQUENA) {
      const c = codificar(hex(h))
      assert.equal(chavePublicaDe(c), null, h)
      for (const m of ['oi', '', 'Entrar no Porao', 'a', 'b', 'c', 'd']) assert.equal(conferirAssinatura(m, c, zeros64), false, h + ' ' + m)
    }
    assert.throws(() => montarMensagem({ dominio: 'x', uri: 'http://x', carteira: '1'.repeat(32), nonce: 'n1234567', emitida: 1, vence: 2 }), TypeError)
  })
})

// Consertos do parecer de segurança v4 (login do Porão), M1: mensagem no formato SIWS (Sign In With Solana,
// CAIP-122). As carteiras (Phantom, Solflare, Backpack) reconhecem esse texto e comparam o <domínio> da 1ª linha com
// a origem do site que pediu a assinatura: é ISSO que barra o revezamento (site falso pedindo para assinar a nossa).
describe('consertos v4 — mensagem SIWS', () => {
  const carteira = codificar(hex(RFC_PUB))
  const nonce = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
  const emitida = Date.UTC(2026, 10, 20, 21, 17, 0)
  const vence = Date.UTC(2026, 10, 20, 21, 22, 0)
  // Mesma gramática do leitor público de mensagens SIWS (wallet-standard, parseSignInMessageText), reescrita aqui.
  const LEITOR_SIWS = new RegExp('^(?<domain>[^\\n]+?) wants you to sign in with your Solana account:\\n(?<address>[^\\n]+)(?:\\n|$)' +
    '(?:\\n(?<statement>[\\S\\s]*?)(?:\\n|$))??(?:\\nURI: (?<uri>[^\\n]+))?(?:\\nVersion: (?<version>[^\\n]+))?' +
    '(?:\\nChain ID: (?<chainId>[^\\n]+))?(?:\\nNonce: (?<nonce>[^\\n]+))?(?:\\nIssued At: (?<issuedAt>[^\\n]+))?' +
    '(?:\\nExpiration Time: (?<expirationTime>[^\\n]+))?\\n*$')

  test('mensagem_no_formato_siws_com_dominio_do_servidor', () => {
    const m = montarMensagem({ dominio: 'porao.exemplo.test', uri: 'https://porao.exemplo.test', carteira, nonce, emitida, vence })
    assert.equal(m, [
      'porao.exemplo.test wants you to sign in with your Solana account:',
      carteira,
      '',
      'Entrar no Porao. Isto nao e uma transacao e nao gasta nada.',
      '',
      'URI: https://porao.exemplo.test',
      'Version: 1',
      'Chain ID: mainnet',
      `Nonce: ${nonce}`,
      'Issued At: 2026-11-20T21:17:00.000Z',
      'Expiration Time: 2026-11-20T21:22:00.000Z',
    ].join('\n'))
    const g = LEITOR_SIWS.exec(m)?.groups
    assert.ok(g, 'o leitor SIWS reconhece a mensagem')
    assert.equal(g.domain, 'porao.exemplo.test')
    assert.equal(g.address, carteira)
    assert.equal(g.statement, 'Entrar no Porao. Isto nao e uma transacao e nao gasta nada.')
    assert.equal(g.uri, 'https://porao.exemplo.test')
    assert.equal(g.version, '1')
    assert.equal(g.chainId, 'mainnet')
    assert.equal(g.nonce, nonce)
    assert.equal(g.expirationTime, '2026-11-20T21:22:00.000Z')
    assert.match(m, /^[\x20-\x7e\n]+$/) // só ASCII
    // local: domínio com porta, URI http
    const local = montarMensagem({ dominio: '127.0.0.1:4900', uri: 'http://127.0.0.1:4900', carteira, nonce, emitida, vence })
    assert.equal(LEITOR_SIWS.exec(local)?.groups.domain, '127.0.0.1:4900')
  })

  test('SIWS: nonce alfanumérico com 8 ou mais; domínio sem esquema; URI = esquema + o mesmo domínio', () => {
    const base = { dominio: 'porao.exemplo.test', uri: 'https://porao.exemplo.test', carteira, nonce, emitida, vence }
    for (const ruim of [
      { nonce: 'abc1234' }, { nonce: 'a1b2-c3d4e5' }, { nonce: 'a1b2c3d4 ' },
      { dominio: 'https://porao.exemplo.test' }, { dominio: 'porao.exemplo.test/x' }, { dominio: '' },
      { dominio: 'porao.exemplo.test wants you' },
      { uri: 'https://outro.exemplo.test' }, { uri: 'ftp://porao.exemplo.test' }, { uri: 'https://porao.exemplo.test/x' },
      { site: 'porao.exemplo.test', dominio: undefined },
    ]) {
      assert.throws(() => montarMensagem({ ...base, ...ruim }), TypeError, JSON.stringify(ruim))
    }
    assert.doesNotThrow(() => montarMensagem({ ...base, nonce: 'abcd1234' }))
  })
})
