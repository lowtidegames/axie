// Testes do sorteio do Frayz: SHA-256 (shared/sha256.js) e gerador em modo contador (shared/rng.js).
// Parecer de segurança nº 1, achado A1: o sorteio antigo guardava só 32 bits (mulberry32) e era descoberto por força bruta.
// Rodar: npm test  (ou: node --test tests/servidor/rng.test.js)
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { sha256, sha256Hex, utf8 } from '../../shared/sha256.js'
import { criarRng, embaralhar, estadoDaSemente, inteiroEm, passo, passoU32 } from '../../shared/rng.js'
import { criarLuta } from '../../shared/batalha.js'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const hexNode = (b) => createHash('sha256').update(b).digest('hex')

// O hash de semente ANTIGO (32 bits), copiado aqui só para provar que o par abaixo colidia.
function hashAntigo32(semente) {
  const s = String(semente)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16
  return h >>> 0
}

describe('SHA-256 (shared/sha256.js)', () => {
  test('vetores oficiais: "", "abc", 448 bits e 1 milhão de "a"', () => {
    assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    assert.equal(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'), '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1')
    assert.equal(sha256Hex(new Uint8Array(1_000_000).fill(0x61)), 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0')
  })
  test('igual ao do Node em 200 entradas aleatórias de tamanhos variados (inclui as bordas de bloco)', () => {
    const tamanhos = [0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129]
    for (let i = 0; i < 200; i++) {
      const n = i < tamanhos.length ? tamanhos[i] : randomBytes(2).readUInt16BE(0) % 3000
      const b = new Uint8Array(randomBytes(n))
      assert.equal(sha256Hex(b), hexNode(b), `tamanho ${n}`)
      assert.equal(sha256(b).length, 32)
    }
  })
  test('texto entra em UTF-8 igual ao do Node (acentos, emoji, metade solta de par)', () => {
    for (const s of ['Lã', 'Véu de Tule', 'boneco 🧵 de pano', 'ação · ñ · 漢字', 'x\ud800y']) {
      assert.deepEqual(Array.from(utf8(s)), Array.from(Buffer.from(s, 'utf8')), s)
      assert.equal(sha256Hex(s), hexNode(Buffer.from(s, 'utf8')), s)
    }
  })
})

describe('sorteio em modo contador (A1)', () => {
  test('o estado é { chave de 256 bits, contador, sobra }, em JSON, e a chave é o SHA-256 da semente', () => {
    const s = estadoDaSemente('frayz')
    assert.deepEqual(Object.keys(s).sort(), ['chave', 'contador', 'sobra'])
    assert.match(s.chave, /^[0-9a-f]{64}$/)
    assert.equal(s.chave, sha256Hex('frayz'))
    assert.equal(s.contador, 0)
    assert.deepEqual(s.sobra, [])
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s)
    const e = criarLuta({ semente: 'luta-x', timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['assombrado', 'mordedor', 'desfiado'] })
    assert.equal(typeof e.rng, 'object', 'o estado do sorteio da luta não pode ser um número de 32 bits')
    assert.match(e.rng.chave, /^[0-9a-f]{64}$/)
    assert.equal(e.rng.chave, sha256Hex('luta-x'))
  })
  test('a chave depende de TODA a semente: trocar qualquer letra muda ~metade dos 256 bits', () => {
    const base = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
    const bits = (hex) => BigInt('0x' + hex).toString(2).padStart(256, '0')
    const b0 = bits(estadoDaSemente(base).chave)
    for (let i = 0; i < base.length; i++) {
      const outra = base.slice(0, i) + (base[i] === 'z' ? 'y' : 'z') + base.slice(i + 1)
      const b1 = bits(estadoDaSemente(outra).chave)
      let dif = 0
      for (let k = 0; k < 256; k++) if (b0[k] !== b1[k]) dif++
      assert.ok(dif > 80 && dif < 176, `posição ${i}: só ${dif} bits mudaram`)
    }
  })
  test('duas sementes que COLIDIAM no hash antigo de 32 bits agora dão baralhos diferentes', () => {
    const a = 'luta:512789', b = 'luta:749192'
    assert.equal(hashAntigo32(a), hashAntigo32(b), 'o par colidia no sorteio antigo')
    const times = { timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['assombrado', 'mordedor', 'desfiado'] }
    const la = criarLuta({ semente: a, ...times }), lb = criarLuta({ semente: b, ...times })
    const ordem = (e, t) => e.times[t].baralho.concat(e.times[t].mao).map((c) => e.cartas[c].carta + '/' + e.cartas[c].dono)
    assert.notDeepEqual(ordem(la, 'A').concat(ordem(la, 'B')), ordem(lb, 'A').concat(ordem(lb, 'B')))
    assert.notEqual(la.rng.chave, lb.rng.chave)
  })
  test('cada bloco SHA-256(chave || contador) dá 8 números; a sequência bate com o SHA-256 do Node', () => {
    let s = estadoDaSemente('bloco')
    const saidas = []
    for (let i = 0; i < 16; i++) { const r = passoU32(s); s = r.s; saidas.push(r.u32) }
    assert.equal(s.contador, 2)
    for (let c = 0; c < 2; c++) {
      const msg = Buffer.alloc(40)
      Buffer.from(sha256Hex('bloco'), 'hex').copy(msg, 0)
      msg.writeUInt32BE(Math.floor(c / 2 ** 32), 32)
      msg.writeUInt32BE(c >>> 0, 36)
      const d = createHash('sha256').update(msg).digest()
      for (let k = 0; k < 8; k++) assert.equal(saidas[c * 8 + k], d.readUInt32BE(k * 4))
    }
  })
  test('passo é puro e o estado volta igual pelo JSON no meio de um bloco', () => {
    let s = estadoDaSemente('json')
    for (let i = 0; i < 5; i++) s = passo(s).s
    assert.deepEqual(passo(s), passo(s))
    const copia = JSON.parse(JSON.stringify(s))
    const a = [], b = []
    let x = s, y = copia
    for (let i = 0; i < 30; i++) { const r1 = passo(x), r2 = passo(y); x = r1.s; y = r2.s; a.push(r1.valor); b.push(r2.valor) }
    assert.deepEqual(a, b)
    for (const v of a) assert.ok(v >= 0 && v < 1)
  })
  test('inteiro em faixa SEM viés: qui-quadrado com 60.000 amostras em 2, 3, 5, 7 e 18', () => {
    // valores críticos do qui-quadrado com p = 0,001 (gl = n − 1)
    const critico = { 2: 10.83, 3: 13.82, 5: 18.47, 7: 22.46, 18: 40.79 }
    for (const n of [2, 3, 5, 7, 18]) {
      const r = criarRng(`qui:${n}`), cont = new Array(n).fill(0), N = 60000
      for (let i = 0; i < N; i++) { const v = r.inteiro(n); assert.ok(Number.isInteger(v) && v >= 0 && v < n); cont[v]++ }
      const esp = N / n
      const qui = cont.reduce((s, c) => s + (c - esp) ** 2 / esp, 0)
      assert.ok(qui < critico[n], `faixa ${n}: qui-quadrado ${qui.toFixed(2)} ≥ ${critico[n]} (${cont.join(',')})`)
    }
  })
  test('inteiro em faixa grande não puxa para os menores (o "% n" direto puxaria)', () => {
    // n = 3·2^30: com "u32 % n", os valores abaixo de 2^30 sairiam com chance 1/2 em vez de 1/3
    const n = 3 * 2 ** 30, r = criarRng('faixa-grande'), N = 30000
    let baixos = 0
    for (let i = 0; i < N; i++) { const v = r.inteiro(n); assert.ok(v >= 0 && v < n); if (v < 2 ** 30) baixos++ }
    assert.ok(Math.abs(baixos / N - 1 / 3) < 0.02, `fração baixa ${(baixos / N).toFixed(3)}`)
    assert.throws(() => inteiroEm(estadoDaSemente('x'), 0))
    assert.throws(() => inteiroEm(estadoDaSemente('x'), 1.5))
  })
  test('embaralhar (Fisher–Yates) dá as 24 ordens de 4 cartas por igual', () => {
    const r = criarRng('fy'), cont = new Map(), N = 48000
    for (let i = 0; i < N; i++) {
      const k = embaralhar([0, 1, 2, 3], (n) => r.inteiro(n)).join('')
      cont.set(k, (cont.get(k) || 0) + 1)
    }
    assert.equal(cont.size, 24)
    const esp = N / 24
    let qui = 0
    for (const c of cont.values()) qui += (c - esp) ** 2 / esp
    assert.ok(qui < 49.73, `qui-quadrado ${qui.toFixed(2)}`) // gl 23, p = 0,001
  })
  test('mesma semente → mesma sequência; sementes diferentes → sequências diferentes', () => {
    const a = criarRng('x'), b = criarRng('x'), c = criarRng('y')
    const sa = [], sb = [], sc = []
    for (let i = 0; i < 50; i++) { sa.push(a.inteiro(1000)); sb.push(b.inteiro(1000)); sc.push(c.inteiro(1000)) }
    assert.deepEqual(sa, sb)
    assert.notDeepEqual(sa, sc)
  })
  test('nenhum Math.random, Date.now, relógio ou biblioteca de cripto em NENHUM arquivo de shared/', () => {
    const pasta = path.join(RAIZ, 'shared')
    const arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith('.js'))
    assert.ok(arquivos.includes('sha256.js') && arquivos.includes('rng.js'))
    for (const f of arquivos) {
      const src = fs.readFileSync(path.join(pasta, f), 'utf8')
      assert.ok(!/Math\.random|Date\.now|new Date|performance\.now|crypto|require\(/.test(src), f)
    }
  })
})
