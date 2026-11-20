// R54 — A LETRA DO JOGO em 12 idiomas (public/reino/js/letras.js + arte.js + arte-codigo.js).
// O desenho de texto roda aqui de verdade, sem navegador: uma tela de mentira (pixels RGBA na memória) recebe o MESMO código
// do jogo (arte.js), com o atlas de verdade lido do disco (PNG aberto com o zlib do Node).
//   · INGLÊS IDÊNTICO: cada frase de `reino-letras-antes.json` (tirada ANTES da mudança) sai pixel a pixel igual, em todas as fontes.
//   · toda letra da lista (latim com acento, sinais, 33 do russo) tem desenho nos dois tamanhos e nas 8 variantes de cor, largura > 0
//   · maiúscula certa (turco i→İ e ı→I; alemão ß→SS) · acento sobe e cedilha desce no máximo 2 px, sem mudar a altura da fonte
//   · frase com tailandês/vietnamita vai INTEIRA para a letra do aparelho, na cor da variante, e fica em `Letras.faltas()`
//   · quebrar (igual à quebra antiga quando cabe; hífen na palavra maior que a caixa) e caber (grande → pequena → reticências), com `Letras.estouros()`
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
const { Letras, LISTA, NOVAS, ALTURA, FOLGA, G3, G5, maiuscula, semGlifo, temGlifo, quebrarCom } = await import('../../public/reino/js/letras.js')
const VARIANTES = ['reino', 'reino-contorno', 'reino-ouro', 'reino-verde', 'mini', 'mini-contorno', 'mini-ouro', 'mini-verde']
const TINTA = { 'reino-contorno': '255,246,224', 'reino-ouro': '255,210,72', 'reino-verde': '150,240,130', 'mini-contorno': '255,246,224', 'mini-ouro': '255,210,72', 'mini-verde': '150,240,130', reino: '255,255,255', mini: '255,255,255' }
/** Desenha e conta os pixels por cor ("r,g,b" → quantos) e as linhas usadas (topo e base, contando de y = 10). */
function pintar(s, fonte, opc = {}) {
  const [c, g] = nova(400, 40), w = Arte.texto(g, s, 6, 10, { fonte, ...opc }), d = c.dados(), cores = {}
  let topo = 99, base = -99
  for (let y = 0; y < 40; y++) for (let x = 0; x < 400; x++) { const i = (y * 400 + x) * 4; if (!d[i + 3]) continue; const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; cores[k] = (cores[k] || 0) + 1; if (y - 10 < topo) topo = y - 10; if (y - 10 > base) base = y - 10 }
  return { w, cores, topo, base, textos: g.textos }
}
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

  describe('R54 — as letras novas', () => {
    test('as tabelas: cada glifo é um retângulo, sobe e desce no máximo a folga, e nenhuma letra de sempre foi mexida', () => {
      for (const t of ['reino', 'mini']) for (const [ch, gl] of Object.entries(NOVAS[t])) {
        assert.ok(gl.l.every((r) => r.length === gl.l[0].length && /^[.#]+$/.test(r)), `${t} ${ch}: linhas tortas`)
        assert.ok(gl.l.some((r) => r.includes('#')), `${t} ${ch}: vazio`)
        assert.ok(gl.c >= 0 && gl.c <= FOLGA && gl.l.length - gl.c >= ALTURA[t] && gl.l.length - gl.c - ALTURA[t] <= FOLGA, `${t} ${ch}: sobe ${gl.c}, ${gl.l.length} linhas`)
        assert.ok(!(t === 'reino' ? G5 : G3)[ch], `${t} ${ch}: já existia na fonte de sempre`)
      }
      assert.equal(crypto.createHash('sha1').update(JSON.stringify([G5, G3])).digest('hex').slice(0, 12), 'ae4f45baca7b', 'G5/G3 (as fontes do inglês, conferidas contra o arquivo de antes) não mudam')
    })
    test('toda letra da lista tem glifo nos dois tamanhos, largura > 0, e sai na cor da variante (nunca numa reserva sem cor)', () => {
      const todas = Object.values(LISTA).flat()
      assert.equal(LISTA.cirilico.length, 33); assert.equal(new Set(LISTA.cirilico).size, 33)
      for (const ch of 'ÁÀÂÃÄÅÇÉÈÊËÍÌÎÏÑÓÒÔÕÖÚÙÛÜÝŸŒÆĞŞİ¿¡«»ºª') assert.ok(LISTA.latim.includes(ch) || LISTA.sinais.includes(ch), 'a lista pedida tem ' + ch)
      Letras.limpar()
      for (const ch of todas) {
        assert.ok(temGlifo(ch, 'reino') && temGlifo(ch, 'mini'), 'tabela: ' + ch)
        for (const f of VARIANTES) {
          assert.ok(Arte.temLetra(ch, f), `${f}: ${ch}`)
          assert.ok(Arte.largura(ch, f) > 0, `${f}: largura de ${ch}`)
          const p = pintar(ch, f), tinta = Object.keys(p.cores).filter((k) => k !== '43,30,58')
          assert.deepEqual(tinta, [TINTA[f]], `${f}: ${ch} sai só na cor da variante`)
          assert.ok(p.topo >= -FOLGA - 1 && p.base <= Arte.alturaDaFonte(f) + FOLGA, `${f}: ${ch} fica entre ${p.topo} e ${p.base}`)
        }
      }
      assert.deepEqual(Letras.faltas(), [], 'nenhuma foi para a letra do aparelho')
      // a cor pedida (fontes lisas) pinta também as letras novas
      assert.deepEqual(Object.keys(pintar('AÇÃO ЩИТ', 'reino', { cor: '#FFD248' }).cores), ['255,210,72'])
      assert.deepEqual(Object.keys(pintar('AÇÃO ЩИТ', 'mini', { cor: '#96F082' }).cores), ['150,240,130'])
    })
    test('letra do russo de mesma forma usa o desenho do latim; a que é só do russo tem desenho próprio', () => {
      for (const f of VARIANTES) { assert.equal(umaFrase('АВЕКМНОРСТХ', f)[1], umaFrase('ABEKMHOPCTX', f)[1], f); assert.notEqual(umaFrase('У', f)[1], umaFrase('Y', f)[1], f) }
      assert.notEqual(umaFrase('Ё', 'reino')[1], umaFrase('Е', 'reino')[1]); assert.notEqual(umaFrase('Й', 'mini')[1], umaFrase('И', 'mini')[1])
    })
    test('a altura da linha não muda: o acento usa até 2 px acima do topo e a cedilha até 2 px abaixo da base', () => {
      const alt = { reino: 7, 'reino-contorno': 9, 'reino-ouro': 9, 'reino-verde': 9, mini: 5, 'mini-contorno': 7, 'mini-ouro': 7 }
      for (const [f, h] of Object.entries(alt)) {
        assert.equal(Arte.alturaDaFonte(f), h, f)
        const liso = pintar('AEIOU', f), ac = pintar('ÁÊÏÕÙ', f), ce = pintar('ÇŞ', f)
        assert.deepEqual([liso.topo, liso.base], [0, h - 1], f + ': sem acento, dentro da altura')
        assert.deepEqual([ac.topo, ac.base], [-2, h - 1], f + ': acento 2 px acima, base no lugar')
        assert.deepEqual([ce.topo, ce.base], [0, h + 1], f + ': cedilha 2 px abaixo')
        assert.equal(pintar('Á', f).w, pintar('A', f).w, f + ': Á tem a largura de A')
      }
      // o título guardado (tela justa) não corta o acento nem a cedilha
      const [c, g] = nova(200, 60); Arte.titulo(g, 'ÁÇ', 100, 20, 2, true)
      const d = c.dados(); let topo = 99, base = -1
      for (let y = 0; y < 60; y++) for (let x = 0; x < 200; x++) if (d[(y * 200 + x) * 4 + 3]) { if (y < topo) topo = y; if (y > base) base = y }
      assert.deepEqual([topo, base], [20 - 4, 20 + 9 * 2 + 4 - 1], 'título ×2: acento 4 px acima, cedilha 4 px abaixo')
    })
  })

  describe('R54 — maiúscula de cada idioma', () => {
    test('turco: i→İ e ı→I · alemão: ß→SS · inglês como sempre · letra + acento solto se juntam', () => {
      assert.equal(maiuscula('iyi şanslar ığ', 'tr'), 'İYİ ŞANSLAR IĞ')
      assert.equal(maiuscula('iyi', 'en'), 'IYI')
      assert.equal(maiuscula('Größe über Straße', 'de'), 'GRÖSSE ÜBER STRASSE')
      assert.equal(maiuscula('GROẞ', 'de'), 'GROSS')
      assert.equal(maiuscula('coração'), 'CORAÇÃO'); assert.equal(maiuscula('победа ёж', 'ru'), 'ПОБЕДА ЁЖ')
      assert.equal(maiuscula('café'), 'CAFÉ')
      for (const s of ['Round 12 - Level 3', "it's (1/2) <ok>", 'x3 +12%']) assert.equal(maiuscula(s), s.toUpperCase())
    })
    test('o desenho usa o idioma do módulo (Letras.idioma): em turco o "i" ganha o ponto', () => {
      assert.equal(Letras.idioma, 'en')
      const en = umaFrase('iyi', 'reino')
      Letras.idioma = 'tr'
      try { const tr = umaFrase('iyi', 'reino'); assert.notEqual(tr[1], en[1]); assert.equal(tr[1], umaFrase('İYİ', 'reino')[1]); assert.equal(umaFrase('ı', 'mini')[1], umaFrase('I', 'mini')[1]) } finally { Letras.idioma = 'en' }
      assert.equal(umaFrase('iyi', 'reino')[1], en[1])
      assert.equal(umaFrase('straße', 'reino-ouro')[1], umaFrase('STRASSE', 'reino-ouro')[1])
    })
  })

  describe('R54 — reserva honesta: a letra do aparelho', () => {
    test('frase com tailandês vai inteira para a letra do aparelho, na cor da variante, e entra em faltas()', () => {
      Letras.limpar()
      const th = 'ชนะรอบที่ 12 GOLD'
      assert.deepEqual(semGlifo('ชนะ A'), ['ช', 'น', 'ะ'])
      assert.equal(Arte.temLetra(th, 'reino-ouro'), false)
      for (const [f, tinta] of [['reino-ouro', '#FFD248'], ['reino-verde', '#96F082'], ['mini-ouro', '#FFD248'], ['reino-contorno', '#FFF6E0'], ['mini', '#FFFFFF']]) {
        const [c, g] = nova(300, 40); g.setTransform(3, 0, 0, 3, 0, 0)
        const w = Arte.texto(g, th, 4, 4, { fonte: f })
        assert.equal(w, Arte.largura(th, f), f + ': a largura devolvida é a medida')
        assert.ok(w > 20, f + ': largura ' + w)
        const cores = new Set(), d = c.dados()
        for (let i = 0; i < d.length; i += 4) if (d[i + 3]) cores.add('#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase())
        assert.deepEqual([...cores], [tinta], f + ': a frase inteira na cor da variante (nenhuma letra em pixel misturada)')
      }
      assert.deepEqual(Object.keys(pintar(th, 'reino', { cor: '#CC3C3E' }).cores), ['204,60,62'], 'a cor pedida vale na letra do aparelho')
      const fa = Letras.faltas()
      assert.equal(fa.length, 6)
      assert.ok(fa.every((f) => f.texto === th && f.idioma === 'en' && f.letras.includes('ช') && !f.letras.includes('G') && f.vezes >= 1))
      assert.deepEqual(fa.map((f) => f.fonte).sort(), ['mini', 'reino', 'reino-contorno', 'reino-ouro', 'reino-verde', 'mini-ouro'].sort())
      // vietnamita: as letras de dois acentos não têm desenho; o resto do latim tem
      assert.equal(Arte.temLetra('Tiếng Việt', 'mini'), false); assert.equal(Arte.temLetra('Coração, ¿qué? Größe İyi победа', 'mini'), true)
      // título grande com letra sem desenho: também vai para a letra do aparelho (não some)
      const [c2, g2] = nova(300, 60); Arte.titulo(g2, 'ชนะ', 150, 10, 2, true)
      assert.ok(c2.dados().some((v) => v), 'o título saiu')
      Letras.limpar(); assert.deepEqual(Letras.faltas(), [])
    })
    test('letra que falta nunca mais vira espaço em silêncio', () => {
      Letras.limpar()
      const a = umaFrase('A☃B', 'reino'), b = umaFrase('A B', 'reino')
      assert.notEqual(a[1], b[1])
      assert.deepEqual(Letras.faltas().map((f) => [f.texto, f.letras]), [['A☃B', ['☃']]])
      Letras.limpar()
    })
  })

  describe('R54 — medir, quebrar e caber', () => {
    const antiga = (s, larg, fonte) => { const pal = String(s).split(' '), out = []; let lin = ''; for (const p of pal) { const t = lin ? lin + ' ' + p : p; if (Arte.largura(t, fonte) > larg && lin) { out.push(lin); lin = p } else lin = t } if (lin) out.push(lin); return out }
    test('quebrar: igual à quebra de hoje em todo texto cuja maior palavra cabe na caixa', () => {
      let n = 0
      for (const s of ref.frases) for (const [larg, fonte] of [[46, 'mini'], [90, 'mini'], [164, 'mini-contorno'], [86, 'reino-contorno'], [120, 'reino'], [172, 'reino-ouro']]) {
        if (s.split(' ').some((p) => Arte.largura(p, fonte) > larg)) continue
        assert.deepEqual(Arte.quebrar(s, larg, fonte), antiga(s, larg, fonte), `${fonte} ${larg}: ${s}`); n++
      }
      assert.ok(n > 1500, 'comparações: ' + n)
    })
    test('quebrar: palavra maior que a caixa é cortada com hífen, cada linha cabe, nada se perde, e fica em estouros()', () => {
      Letras.limpar()
      for (const [s, larg, fonte] of [['DONAUDAMPFSCHIFFFAHRTSGESELLSCHAFT ÜBER ALLES', 60, 'mini'], ['ДОСТОПРИМЕЧАТЕЛЬНОСТЬ ЖЁЛТАЯ', 64, 'reino'], ['A SUPERCALIFRAGILISTIC B', 40, 'reino-contorno']]) {
        const lin = Arte.quebrar(s, larg, fonte)
        assert.ok(lin.length >= 3, s)
        for (const l of lin) assert.ok(Arte.largura(l, fonte) <= larg, `${l} cabe em ${larg}`)
        assert.equal(lin.map((l) => (l.endsWith('-') ? l.slice(0, -1) : l + ' ')).join('').trim(), s)
        assert.ok(lin.some((l) => l.endsWith('-')))
      }
      const e = Letras.estouros()
      assert.equal(e.length, 3); assert.ok(e.every((x) => x.feito === 'hifen' && x.largura > 0 && x.fonte && x.idioma === 'en'))
      assert.deepEqual(Arte.quebrar('CORAÇÃO VALENTE', 60, 'reino'), ['CORAÇÃO', 'VALENTE'])
      assert.deepEqual(Arte.quebrar('OUI ! NON', 500, 'reino'), ['OUI ! NON'])
      assert.deepEqual(quebrarCom((t) => t.length, 'ab cd ef', 5), ['ab cd', 'ef'], 'a conta pura mede com a régua que receber')
      Letras.limpar()
    })
    test('caber: fonte grande → pequena da mesma cor → reticências, e diz o que fez', () => {
      Letras.limpar()
      const a = Arte.caber('PLAY AGAIN', 80, 'reino-ouro'); assert.deepEqual([a.texto, a.fonte, a.feito], ['PLAY AGAIN', 'reino-ouro', 'coube']); assert.equal(a.largura, Arte.largura('PLAY AGAIN', 'reino-ouro'))
      const b = Arte.caber('JOGAR DE NOVO AGORA', 80, 'reino-ouro'); assert.deepEqual([b.texto, b.fonte, b.feito], ['JOGAR DE NOVO AGORA', 'mini-ouro', 'menor']); assert.ok(b.largura <= 80)
      const c = Arte.caber('¡JUGAR OTRA VEZ AHORA MISMO YA!', 80, 'reino-ouro'); assert.equal(c.feito, 'reticencias'); assert.equal(c.fonte, 'mini-ouro'); assert.ok(c.texto.endsWith('...') && c.largura <= 80 && c.texto.length > 8, c.texto)
      const d = Arte.caber('НАЧАТЬ ЗАНОВО ПРЯМО СЕЙЧАС', 80, 'reino-verde'); assert.equal(d.fonte, 'mini-verde'); assert.equal(d.feito, 'reticencias')
      assert.deepEqual(Object.keys(pintar(d.texto, d.fonte).cores).sort(), ['150,240,130', '43,30,58'].sort(), 'a pequena da verde é verde')
      assert.equal(pintar('...', 'mini-verde').cores['150,240,130'], 3, 'três pontos de verdade nas reticências')
      assert.equal(Arte.caber('WEITERSPIELEN', 60, 'reino').fonte, 'mini'); assert.equal(Arte.caber('X', 3, 'mini').feito, 'coube')
      assert.deepEqual(Letras.estouros().map((e) => e.feito).sort(), ['menor', 'menor', 'reticencias', 'reticencias'])
      assert.equal(Arte.medir, Arte.largura, 'uma medida só')
      Letras.limpar()
    })
  })

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
