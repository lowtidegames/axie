// R54 — A LETRA DO JOGO em 12 idiomas (public/reino/js/letras.js + arte.js + arte-codigo.js).
// O desenho de texto roda aqui de verdade, sem navegador: uma tela de mentira (pixels RGBA na memória) recebe o MESMO código
// do jogo (arte.js), com o atlas de verdade lido do disco (PNG aberto com o zlib do Node).
//   · INGLÊS IDÊNTICO: cada frase de `reino-letras-antes.json` (tirada ANTES da mudança) sai pixel a pixel igual, em todas as fontes.
// Regravar a referência (só quando a regra mudar, dizendo qual):  REINO_LETRAS_GRAVAR=1 node tests/servidor/reino-letras.test.js
// Rodar: node --test tests/servidor/reino-letras.test.js
import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import * as CONFIG from '../../shared/reino/config.js'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(AQUI, '..', '..')
const ANTES = path.join(AQUI, 'reino-letras-antes.json')

// ------------------------------------------------------------------ tela de mentira (só o que o desenho de texto usa)
function cor(s) {
  if (s[0] === '#') { const h = s.length === 4 ? s.replace(/[0-9a-f]/gi, '$&$&') : s; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(255) }
  const m = /rgba?\(([^)]+)\)/.exec(s); if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], Math.round((p[3] ?? 1) * 255)] }
  throw new Error('cor desconhecida na tela de mentira: ' + s)
}
class Contexto {
  constructor(c) { this.canvas = c; this.fillStyle = '#000000'; this.strokeStyle = '#000000'; this.globalCompositeOperation = 'source-over'; this.globalAlpha = 1; this.imageSmoothingEnabled = true; this.m = [1, 0, 0]; this.pilha = []; this.font = '10px sans-serif'; this.lineWidth = 1; this.textos = [] }
  get d() { return this.canvas.dados() }
  save() { this.pilha.push([this.m.slice(), this.fillStyle, this.globalCompositeOperation, this.globalAlpha]) }
  restore() { const p = this.pilha.pop(); if (p) [this.m, this.fillStyle, this.globalCompositeOperation, this.globalAlpha] = p }
  scale(x, y) { if (x !== y) throw new Error('escala torta'); this.m = [this.m[0] * x, this.m[1], this.m[2]] }
  translate(x, y) { this.m = [this.m[0], this.m[1] + x * this.m[0], this.m[2] + y * this.m[0]] }
  setTransform(a, b, c, d, e, f) { this.m = [a, e, f] }
  getTransform() { return { a: this.m[0], b: 0, c: 0, d: this.m[0], e: this.m[1], f: this.m[2] } }
  ponto(x, y, r, g, b, a) {
    const c = this.canvas; if (x < 0 || y < 0 || x >= c.width || y >= c.height) return
    const d = this.d, i = (y * c.width + x) * 4, op = this.globalCompositeOperation
    if (op === 'source-in') { const da = d[i + 3], na = Math.round((a * da) / 255); d[i] = na ? r : 0; d[i + 1] = na ? g : 0; d[i + 2] = na ? b : 0; d[i + 3] = na; return }
    if (op !== 'source-over') throw new Error('composição não feita na tela de mentira: ' + op)
    if (a === 0) return
    if (a === 255 || d[i + 3] === 0) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; return }
    const sa = a / 255, da = d[i + 3] / 255, oa = sa + da * (1 - sa)
    d[i] = Math.round((r * sa + d[i] * da * (1 - sa)) / oa); d[i + 1] = Math.round((g * sa + d[i + 1] * da * (1 - sa)) / oa); d[i + 2] = Math.round((b * sa + d[i + 2] * da * (1 - sa)) / oa); d[i + 3] = Math.round(oa * 255)
  }
  ret(x, y, w, h) { const [k, tx, ty] = this.m; return [Math.round(x * k + tx), Math.round(y * k + ty), Math.round(w * k), Math.round(h * k)] }
  fillRect(x, y, w, h) { const [r, g, b, a] = cor(this.fillStyle), [X, Y, W, H] = this.ret(x, y, w, h); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) this.ponto(X + i, Y + j, r, g, b, a) }
  clearRect(x, y, w, h) { const [X, Y, W, H] = this.ret(x, y, w, h), c = this.canvas, d = this.d; for (let j = Math.max(0, Y); j < Math.min(c.height, Y + H); j++) d.fill(0, (j * c.width + Math.max(0, X)) * 4, (j * c.width + Math.min(c.width, X + W)) * 4) }
  drawImage(img, ...a) {
    let sx = 0, sy = 0, sw = img.width, sh = img.height, dx, dy, dw, dh
    if (a.length === 2) [dx, dy, dw, dh] = [a[0], a[1], sw, sh]; else if (a.length === 4) [dx, dy, dw, dh] = a; else [sx, sy, sw, sh, dx, dy, dw, dh] = a
    const [X, Y, W, H] = this.ret(dx, dy, dw, dh), s = img.dados(), iw = img.width
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const u = sx + Math.floor(((i + 0.5) * sw) / W), v = sy + Math.floor(((j + 0.5) * sh) / H)
      if (u < 0 || v < 0 || u >= iw || v >= img.height) { if (this.globalCompositeOperation === 'source-in') this.ponto(X + i, Y + j, 0, 0, 0, 0); continue }
      const p = (v * iw + u) * 4; this.ponto(X + i, Y + j, s[p], s[p + 1], s[p + 2], s[p + 3])
    }
  }
  getImageData(x, y, w, h) { const c = this.canvas, d = this.d, o = new Uint8ClampedArray(w * h * 4); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (x + i < 0 || y + j < 0 || x + i >= c.width || y + j >= c.height) continue; const p = ((y + j) * c.width + x + i) * 4; o.set(d.subarray(p, p + 4), (j * w + i) * 4) } return { data: o, width: w, height: h } }
  putImageData(im, x, y) { const c = this.canvas, d = this.d; for (let j = 0; j < im.height; j++) for (let i = 0; i < im.width; i++) { if (x + i < 0 || y + j < 0 || x + i >= c.width || y + j >= c.height) continue; const p = (j * im.width + i) * 4, q = ((y + j) * c.width + x + i) * 4, al = im.data[p + 3]; d[q] = al ? im.data[p] : 0; d[q + 1] = al ? im.data[p + 1] : 0; d[q + 2] = al ? im.data[p + 2] : 0; d[q + 3] = al } }
  // letra do aparelho: aqui não há fonte de sistema; a tela de mentira só anota o pedido e pinta um bloco (o teste de tela vê a letra de verdade)
  measureText(s) { const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] || 10); return { width: [...String(s)].length * px * 0.6, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2 } }
  fillText(s, x, y) { this.textos.push({ s, x, y, cor: this.fillStyle, font: this.font }); const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] || 10); this.fillRect(x, y - px * 0.7, this.measureText(s).width, px * 0.7) }
  strokeText(s, x, y) { this.textos.push({ s, x, y, contorno: this.strokeStyle, font: this.font }) }
}
class Tela {
  constructor(w = 300, h = 150) { this._w = w; this._h = h; this._d = null; this.style = {}; this.className = '' }
  get width() { return this._w } set width(v) { this._w = v; this._d = null; this._g = null }
  get height() { return this._h } set height(v) { this._h = v; this._d = null; this._g = null }
  dados() { return (this._d ||= new Uint8ClampedArray(this._w * this._h * 4)) }
  getContext() { return (this._g ||= new Contexto(this)) }
  setAttribute() {}
}
function abrirPng(buf) {
  let p = 8, w = 0, h = 0, tipo = 0; const partes = []
  while (p < buf.length) {
    const n = buf.readUInt32BE(p), nome = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + n)
    if (nome === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); tipo = d[9]; if (d[8] !== 8 || (tipo !== 6 && tipo !== 2)) throw new Error('PNG fora do esperado (8 bits, RGB ou RGBA)') } else if (nome === 'IDAT') partes.push(d)
    p += 12 + n
  }
  const bpp = tipo === 6 ? 4 : 3, cru = zlib.inflateSync(Buffer.concat(partes)), lin = w * bpp, o = new Uint8ClampedArray(w * h * 4), at = new Uint8Array(lin), an = new Uint8Array(lin)
  for (let y = 0; y < h; y++) {
    const f = cru[y * (lin + 1)], s = cru.subarray(y * (lin + 1) + 1, (y + 1) * (lin + 1))
    for (let i = 0; i < lin; i++) {
      const a = i >= bpp ? at[i - bpp] : 0, b = an[i], c = i >= bpp ? an[i - bpp] : 0
      let v = s[i]
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
      at[i] = v
    }
    for (let x = 0; x < w; x++) { const al = bpp === 4 ? at[x * 4 + 3] : 255, q = (y * w + x) * 4; o[q] = al ? at[x * bpp] : 0; o[q + 1] = al ? at[x * bpp + 1] : 0; o[q + 2] = al ? at[x * bpp + 2] : 0; o[q + 3] = al }
    an.set(at)
  }
  return { w, h, o }
}
globalThis.document = { createElement: (tag) => { if (tag !== 'canvas') throw new Error('só canvas na tela de mentira'); return new Tela() } }
globalThis.Image = class {
  set src(u) { queueMicrotask(() => { try { const { w, h, o } = abrirPng(fs.readFileSync(fileURLToPath(u))); this.width = w; this.height = h; this.dados = () => o; this.onload?.() } catch { this.onerror?.() } }) }
}
const buscarDeVerdade = globalThis.fetch
globalThis.fetch = async (u, ...r) => {
  if (!String(u).startsWith('file:')) return buscarDeVerdade(u, ...r)
  try { const t = fs.readFileSync(fileURLToPath(String(u)), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(t), text: async () => t } } catch { return { ok: false, status: 404 } }
}

const Arte = await import('../../public/reino/js/arte.js')
const FONTES = ['reino', 'reino-contorno', 'reino-ouro', 'reino-verde', 'mini', 'mini-contorno', 'mini-ouro', 'dano-g', 'dano-g-ouro']
const sha = (c) => crypto.createHash('sha1').update(c.dados()).digest('hex').slice(0, 10)
const nova = (w, h) => { const c = new Tela(w, h); return [c, c.getContext('2d')] }

/** Desenha a frase numa tela folgada (6 px de margem) e devolve [largura, resumo dos pixels]. O MESMO roteiro roda no teste de tela (Chrome). */
function umaFrase(s, fonte, opc = {}) {
  const w = Arte.largura(s, fonte), k = opc.k || 1, [c, g] = nova(w * k + 12, 16 * k + 12)
  const x = opc.alinhar === 'centro' ? 6 + ((w * k) >> 1) : opc.alinhar === 'direita' ? 6 + w * k : 6
  Arte.texto(g, s, x, 6, { fonte, ...opc })
  return [w, sha(c)]
}
function umTitulo(s, k, ouro) { const [c, g] = nova(Arte.largura(s, 'reino-contorno') * k + 12, 11 * k + 12); Arte.titulo(g, s, c.width >> 1, 6, k, ouro); return sha(c) }
/** Toda a referência: por fonte, por frase; mais cor, alinhamento, ampliação e títulos numa amostra. */
function tirar(frases) {
  const r = { fontes: {}, cor: [], alinhar: [], titulo: [] }
  for (const f of FONTES) r.fontes[f] = frases.map((s) => umaFrase(s, f))
  frases.forEach((s, i) => {
    if (i % 4 === 0) r.cor.push([umaFrase(s, 'reino', { cor: '#FFD248' })[1], umaFrase(s, 'mini', { cor: '#96F082' })[1], umaFrase(s, 'reino', { cor: '#CC3C3E', k: 2 })[1]])
    if (i % 5 === 0) r.alinhar.push([umaFrase(s, 'reino-contorno', { alinhar: 'centro' })[1], umaFrase(s, 'mini-ouro', { alinhar: 'direita' })[1], umaFrase(s, 'reino-ouro', { alinhar: 'centro', k: 3 })[1]])
    if (i % 6 === 0) r.titulo.push([umTitulo(s, 2, false), umTitulo(s, 3, true), umTitulo(s, 2, 'reino-verde')])
  })
  return r
}
/** As frases de hoje (inglês): tudo que está entre aspas em textos.js (com 12 no lugar dos números), os nomes do config e uma lista de aperto. */
function frasesDeHoje() {
  const fonte = fs.readFileSync(path.join(RAIZ, 'public/reino/js/textos.js'), 'utf8'), fr = new Set()
  for (const m of fonte.matchAll(/'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
    const t = (m[1] ?? m[2]).replace(/\$\{[^}]*\}/g, '12').replace(/\\(.)/g, '$1')
    if (t.length > 1 && /^[\x20-\x7e]+$/.test(t) && !/[;"#$@[\\\]^_`{|}~]/.test(t)) fr.add(t)
  }
  const nomes = (o) => Object.values(o || {}).forEach((v) => { if (v && typeof v.nome === 'string') fr.add(v.nome); if (v && typeof v.texto === 'string' && /^[\x20-\x7e]+$/.test(v.texto) && !/[;"#$@[\\\]^_`{|}~]/.test(v.texto)) fr.add(v.texto) })
  for (const k of ['CARTAS', 'INVASORES', 'CHEFES', 'RELIQUIAS', 'FAMILIAS', 'RARIDADES']) nomes(CONFIG[k])
  for (const s of ['0123456789', 'ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm nopqrstuvwxyz', ".,!?:-+/%x><()'=*&", 'A, B, C. D: E!', '+12 GOLD', '100% x3', "IT'S (1/2) <OK> = 5 * 2", 'Round 12 - Level 3', 'x', ' ', '', 'A  B', 'WIN, THEN PICK 1 OF 3!']) fr.add(s)
  return [...fr]
}

if (process.env.REINO_LETRAS_GRAVAR) {
  await Arte.carregar(CONFIG)
  const frases = frasesDeHoje()
  fs.writeFileSync(ANTES, JSON.stringify({ nota: 'Desenho do texto em inglês ANTES da R54 (atlas de verdade): [largura, resumo sha1 dos pixels RGBA] por fonte e frase. Roteiro: umaFrase/umTitulo/tirar do teste.', origem: FONTES.map((f) => Arte.origem['fonte:' + f] || '-'), frases, ...tirar(frases) }) + '\n')
  console.log(`referência gravada: ${frases.length} frases × ${FONTES.length} fontes em ${path.relative(RAIZ, ANTES)}`)
} else {
  const ref = JSON.parse(fs.readFileSync(ANTES, 'utf8'))
  before(async () => { await Arte.carregar(CONFIG) })

  describe('R54 — inglês idêntico (pixel a pixel) ao de antes da mudança', () => {
    test('a referência é grande e veio do atlas de verdade', () => {
      assert.ok(ref.frases.length >= 150, 'frases: ' + ref.frases.length)
      assert.deepEqual(FONTES.map((f) => Arte.origem['fonte:' + f] || '-'), ref.origem)
      assert.ok(ref.origem.slice(0, 7).every((o) => o === 'atlas'), 'as fontes do jogo vêm do atlas')
    })
    test('cada frase, em cada fonte: mesma largura e mesmos pixels', () => {
      const agora = tirar(ref.frases), ruins = []
      for (const f of FONTES) ref.frases.forEach((s, i) => { const a = agora.fontes[f][i], b = ref.fontes[f][i]; if (a[0] !== b[0] || a[1] !== b[1]) ruins.push(`${f}: "${s}" ${b} -> ${a}`) })
      assert.deepEqual(ruins.slice(0, 8), [], `${ruins.length} frase(s) mudaram`)
      assert.deepEqual(agora.cor, ref.cor, 'cor (reino e mini pintadas, ampliada)')
      assert.deepEqual(agora.alinhar, ref.alinhar, 'alinhamento e ampliação')
      assert.deepEqual(agora.titulo, ref.titulo, 'títulos ×2 e ×3 (creme, ouro, verde)')
    })
  })
}
