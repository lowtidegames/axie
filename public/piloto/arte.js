// Piloto — ARTE PROVISÓRIA desenhada por código, em pixel art (a arte de verdade vem depois por gerador de imagens).
// Regras (docs/ideias/piloto-monstros.md §9): quadro de monstro 64×64 virado para a direita; contorno de 1 px em #2B1E3A;
// por dentro, linhas no tom mais escuro da própria cor; luz de cima à esquerda; até 3 tons por material.
// Troca fácil: public/piloto/arte/manifesto.json. Se um item tiver PNG listado, a tela usa o PNG; senão, o desenho daqui.
// Formato do manifesto (caminhos relativos a public/piloto/arte/; qualquer chave pode faltar):
//   { monsters: { <id>: { idle, attack } }, arena, nest, map, egg: { whole, cracked, open }, places: { 1..5 }, elements: { <tipo> } }
// Os monstros são montados por PARTES (corpo com pontos de encaixe + cabeça, braços, pernas e marca), então o filhote
// do ovo sai com as partes que herdou.
import { BONECOS_PRONTOS, PARTES, CARTAS } from '../../shared/config.js'
import { ELEMENTOS } from './tema.js'

export const PLUM = '#2B1E3A'
export const CREME = '#F7F1E3'
export const PALETA = { madeira: '#6B4A3A', ceu: '#8FD3F0', folhagem: '#3E6B48', pedra: '#C9C2B8' }

// ------------------------------------------------------------------ cores
const h2r = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const r2h = (r) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
export const misturar = (a, b, t) => { const x = h2r(a), y = h2r(b); return r2h(x.map((v, i) => v + (y[i] - v) * t)) }
/** Rampa de 3 tons + linha interna, a partir da cor do material. */
export function rampa(cor, claro, escuro) {
  return { linha: misturar(cor, PLUM, 0.62), escuro: escuro ?? misturar(cor, PLUM, 0.32), base: cor, claro: claro ?? misturar(cor, '#FFFFFF', 0.4) }
}
const RAMPA = {}
for (const [k, v] of Object.entries(ELEMENTOS)) RAMPA[k] = rampa(v.cor, v.claro, v.escuro)
export const rampaDoElemento = (t) => RAMPA[t] ?? rampa('#888888')
const R_CREME = rampa(CREME, '#FFFFFF', '#D9CDB4')
const R_CARVAO = rampa('#4A3A4E', '#6E5C70', '#33263A')
const R_PEDRA = rampa(PALETA.pedra, '#E8E3DC', '#9A9188')
const R_MADEIRA = rampa(PALETA.madeira, '#8E6A52', '#4E3428')

// ------------------------------------------------------------------ máscaras (pixel inteiro → dentro?)
const E = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1
const R = (x0, y0, w, h) => (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h
const U = (...m) => (x, y) => m.some((f) => f(x, y))
const D = (a, b) => (x, y) => a(x, y) && !b(x, y)
function dentroPoli(px, py, p) {
  let d = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) d = !d
  }
  return d
}
const P = (pts) => (x, y) => dentroPoli(x + 0.5, y + 0.5, pts)
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}
/** Tubo ao longo de pontos [x, y, raio]. */
const T = (pts) => (x, y) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay, ar] = pts[i], [bx, by, br] = pts[i + 1]
    const d = distSeg(x + 0.5, y + 0.5, ax, ay, bx, by)
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy
    const t = l ? Math.max(0, Math.min(1, ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / l)) : 0
    if (d <= ar + (br - ar) * t) return true
  }
  return false
}

// ------------------------------------------------------------------ grade de pixels
export class Grade {
  constructor(w, h) { this.w = w; this.h = h; this.c = new Array(w * h).fill(null); this.a = new Float32Array(w * h) }
  tem(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.c[y * this.w + x] !== null }
  p(x, y, cor, alfa = 1) {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.c[y * this.w + x] = cor; this.a[y * this.w + x] = alfa
  }
  /** Pinta uma forma com sombra (baixo-direita), luz (cima-esquerda) e linha interna onde encosta no que já existe. */
  forma(m, r, o = {}) {
    const lista = []
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (m(x, y)) { lista.push(x, y); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    if (!lista.length) return
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, grande = Math.min(bw, bh) >= 9
    const lx = o.luz?.[0] ?? 0.34, ly = o.luz?.[1] ?? 0.3, lr = o.luzRaio ?? 0.24
    const alfa = o.alfa ?? 1
    for (let i = 0; i < lista.length; i += 2) {
      const x = lista[i], y = lista[i + 1]
      const borda = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(([dx, dy]) => !m(x + dx, y + dy))
      let cor = r.base
      if (o.linha !== false && borda.some(([dx, dy]) => this.tem(x + dx, y + dy))) cor = r.linha
      else if (!m(x + 1, y + 1) || (grande && !m(x + 2, y + 2))) cor = r.escuro
      else if (o.semLuz !== true && ((x - x0) / bw - lx) ** 2 + ((y - y0) / bh - ly) ** 2 < lr * lr) cor = r.claro
      this.p(x, y, cor, alfa)
    }
  }
  /** Só preenche, uma cor. */
  chapa(m, cor, alfa = 1) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (m(x, y)) this.p(x, y, cor, alfa) }
  linhaPx(x0, y0, x1, y1, cor, alfa = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) { this.p(x0, y0, cor, alfa); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx } if (e2 <= dx) { err += dx; y0 += sy } }
  }
  /** Contorno de 1 px em ameixa por fora de tudo. */
  contorno(cor = PLUM) {
    const add = []
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.tem(x, y)) continue
      if (this.tem(x - 1, y) || this.tem(x + 1, y) || this.tem(x, y - 1) || this.tem(x, y + 1)) add.push(x, y)
    }
    for (let i = 0; i < add.length; i += 2) this.p(add[i], add[i + 1], cor)
  }
  /** Canvas do tamanho da grade. */
  canvas() {
    const cv = criarCanvas(this.w, this.h)
    const cx = cv.getContext('2d')
    const img = cx.createImageData(this.w, this.h)
    for (let i = 0; i < this.c.length; i++) {
      if (this.c[i] === null) continue
      const [r, g, b] = h2r(this.c[i])
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = Math.round(this.a[i] * 255)
    }
    cx.putImageData(img, 0, 0)
    return cv
  }
}
export function criarCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c
}

// olho fofo: 2×3 ameixa com brilho creme
function olho(g, x, y, { grande = false, brilho = CREME, cor = PLUM } = {}) {
  const w = grande ? 3 : 2, h = grande ? 4 : 3
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.p(x + i, y + j, cor)
  g.p(x, y, brilho)
  if (grande) g.p(x + 1, y, brilho)
}

// ------------------------------------------------------------------ CORPOS (com pontos de encaixe)
// Cada corpo devolve { desenhar(g, r, k), encaixe: { cabeca, bracoF, bracoT, pernas, marca } } — k = deslocamento da pose
const CORPOS = {
  // Cobblepup — corpo redondo de pedra com musgo
  tr_la_embolada: {
    encaixe: { cabeca: [35, 23], bracoF: [41, 38], bracoT: [20, 37], pernas: [30, 47], marca: [30, 41], tipo: 'bola' },
    desenhar(g, r, k) {
      g.forma(E(30 + k, 37, 13.5, 12), r)
      g.chapa(U(E(22 + k, 30, 3.5, 2), E(26 + k, 28, 2.5, 1.5)), ELEMENTOS.jeans.escuro)
      g.p(21 + k, 29, ELEMENTOS.jeans.cor); g.p(25 + k, 27, ELEMENTOS.jeans.cor)
    },
  },
  // Snapcoal — lagarto baixo, peito de rocha com rachaduras de brasa e cauda
  tr_couro_curtido: {
    encaixe: { cabeca: [45, 37], bracoF: [36, 37], bracoT: [28, 36], pernas: [28, 49], marca: [26, 35], tipo: 'baixo' },
    desenhar(g, r, k) {
      g.forma(U(E(28 + k, 44, 15, 8.5), P([[16 + k, 41], [3 + k, 47], [6 + k, 49], [17 + k, 49]])), r)
      g.forma(E(31 + k, 48, 9, 3.5), rampa(ELEMENTOS.couro.claro), { semLuz: true, linha: false })
      for (const [x, y] of [[22, 42], [23, 43], [24, 43], [33, 41], [34, 42], [29, 45]]) g.p(x + k, y, '#FFD27A')
    },
  },
  // Breezle — bola fofa de penas douradas
  tr_feltro_duro: {
    encaixe: { cabeca: [33, 24], bracoF: [42, 37], bracoT: [22, 36], pernas: [32, 51], marca: [35, 44], tipo: 'bola' },
    desenhar(g, r, k) {
      g.forma(U(E(32 + k, 40, 13, 12.5), ...[22, 27, 32, 37, 42].map((x) => E(x + k, 51, 3, 2.5))), r)
      g.forma(E(35 + k, 43, 7, 7), rampa(ELEMENTOS.feltro.claro, '#FFFBE0'), { linha: false })
      for (const [x, y] of [[33, 40], [37, 41], [34, 45], [38, 46]]) g.p(x + k, y, ELEMENTOS.feltro.cor)
    },
  },
  // Burrlet — barril de casca com folhas, de quatro
  tr_jeans_rebitado: {
    encaixe: { cabeca: [44, 35], bracoF: [36, 34], bracoT: [27, 34], pernas: [28, 49], marca: [24, 42], tipo: 'baixo' },
    desenhar(g, r, k) {
      g.forma(E(29 + k, 42, 15, 9.5), r)
      for (const x of [20, 26, 32]) g.linhaPx(x + k, 38, x + 1 + k, 49, r.escuro)
      g.chapa(U(E(18 + k, 38, 2.5, 1.5), E(31 + k, 35, 2, 1.2)), ELEMENTOS.jeans.claro)
    },
  },
  // Wispurr — corpo fino, meio transparente, flutuando
  tr_tule_rasgado: {
    encaixe: { cabeca: [34, 21], bracoF: [27, 33], bracoT: [24, 30], pernas: [29, 45], marca: [33, 37], tipo: 'flutua' },
    desenhar(g, r, k) { g.forma(E(30 + k, 36, 9, 11), r, { alfa: 0.92 }) },
  },
  // Ripplance — de pé em curva de "S", peitoral de concha perolada
  tr_seda_bordada: {
    encaixe: { cabeca: [36, 16], bracoF: [37, 32], bracoT: [24, 30], pernas: [28, 46], marca: [33, 35], tipo: 'pe' },
    desenhar(g, r, k) {
      g.forma(P([[26 + k, 24], [36 + k, 23], [39 + k, 32], [36 + k, 44], [27 + k, 48], [22 + k, 40], [24 + k, 31]]), r)
      g.forma(E(33 + k, 36, 4.5, 7), rampa('#F4DCE6', '#FFFFFF', '#D6B3C6'))
      for (const y of [32, 36, 40]) g.linhaPx(30 + k, y, 36 + k, y, '#D6B3C6')
    },
  },
}

// ------------------------------------------------------------------ CABEÇAS (centro no encaixe; virada para a direita)
const CABECAS = {
  // Rock Cap — boné de pedra com aba
  cab_gorro(g, [x, y], r, at) {
    g.forma(E(x, y + 2, 9, 8), r)
    g.forma(U(P([[x - 9, y], [x - 7, y - 6], [x - 2, y - 9], [x + 4, y - 8], [x + 8, y - 4], [x + 9, y - 1]]), R(x - 2, y - 1, 15, 3)), R_PEDRA)
    olho(g, x + 3, y + 2); olho(g, x + 7, y + 2)
    g.p(x + 4, y + 7, PLUM); g.p(x + 5, y + 7, PLUM); g.p(x + 6, y + 7, PLUM)
    if (at) { g.p(x + 5, y + 8, PLUM); g.p(x + 5, y + 6, '#E58A8A') }
    g.p(x + 1, y + 6, '#E8A07A'); g.p(x + 10, y + 5, '#E8A07A')
  },
  // Coal Jaw — mandíbula enorme de dentes de carvão
  cab_ziper(g, [x, y], r, at) {
    const ab = at ? 3 : 0
    g.forma(U(E(x, y - 1, 9, 6.5), E(x + 7, y, 6, 4)), r)
    g.forma(P([[x - 6, y + 2 + ab], [x + 14, y + 2 + ab], [x + 12, y + 7 + ab], [x - 3, y + 8 + ab]]), R_CARVAO)
    if (at) g.chapa(R(x - 2, y + 3, 14, ab), '#7A1F2A')
    for (let i = 0; i < 4; i++) { g.p(x + 1 + i * 3, y + 3, CREME); g.p(x + 2 + i * 3, y + 1 + ab, CREME) }
    olho(g, x + 2, y - 4, { grande: true })
    g.linhaPx(x, y - 6, x + 5, y - 7, PLUM)
    g.p(x + 12, y - 2, PLUM)
  },
  // Storm Brow — cara de coruja com sobrancelhas de pena
  cab_feltro(g, [x, y], r, at) {
    g.forma(U(E(x, y, 11, 9.5), P([[x - 9, y - 4], [x - 12, y - 13], [x - 4, y - 8]]), P([[x + 5, y - 7], [x + 11, y - 14], [x + 10, y - 3]])), r)
    g.forma(U(E(x + 1, y + 1, 5, 5), E(x + 7, y + 1, 4.5, 5)), rampa('#FFF4C8', '#FFFFFF', '#E8D79A'), { linha: false })
    olho(g, x - 1, y, { grande: true }); olho(g, x + 6, y, { grande: true })
    g.chapa(U(P([[x - 4, y - 4], [x + 3, y - 2], [x + 3, y - 4], [x - 3, y - 6]]), P([[x + 4, y - 2], [x + 11, y - 5], [x + 10, y - 7], [x + 4, y - 4]])), r.linha)
    g.chapa(P([[x + 3, y + 4], [x + 6, y + 4], [x + 4, y + 7 + (at ? 1 : 0)]]), '#F08A3C')
  },
  // Burr Head — cabeça redonda de carrapichos, presinhas brancas
  cab_botao(g, [x, y], r, at) {
    const bolas = [[-7, -4], [-3, -8], [2, -8], [6, -5], [-8, 1], [-6, 6]]
    g.forma(U(E(x, y, 8.5, 8), ...bolas.map(([a, b]) => E(x + a, y + b, 2.6, 2.6))), r)
    for (const [a, b] of bolas) { g.p(x + a, y + b - 1, r.claro); g.p(x + a + 1, y + b + 1, r.linha) }
    g.forma(E(x + 6, y + 3, 4, 3.2), rampa('#C9A27A', '#E8CBA6', '#8E6A52'))
    g.p(x + 9, y + 2, PLUM)
    g.chapa(U(P([[x + 4, y + 5 + (at ? 1 : 0)], [x + 6, y + 5], [x + 5, y + 9]]), P([[x + 7, y + 5], [x + 9, y + 5 + (at ? 1 : 0)], [x + 9, y + 8]])), CREME)
    olho(g, x + 2, y - 2)
  },
  // Veil Face — capuz de névoa com orelhas de gato e olhos que brilham
  cab_veu(g, [x, y], r, at) {
    g.forma(U(E(x, y, 9.5, 8.5), P([[x - 8, y - 3], [x - 6, y - 13], [x - 2, y - 7]]), P([[x + 2, y - 7], [x + 7, y - 13], [x + 8, y - 3]])), r, { alfa: 0.95 })
    g.chapa(E(x + 2, y + 1, 6, 5), '#3A2A55')
    g.chapa(U(R(x, y - 1, 2, 3), R(x + 4, y - 1, 2, 3)), '#FFF3A8')
    g.p(x, y - 1, '#FFFFFF'); g.p(x + 4, y - 1, '#FFFFFF')
    if (at) g.chapa(R(x + 2, y + 3, 2, 2), '#FFF3A8')
    g.p(x - 5, y - 9, r.claro); g.p(x + 6, y - 9, r.claro)
  },
  // Wave Crest — cabeça de cavalo-marinho com crista de onda e espuma
  cab_desfiada(g, [x, y], r, at) {
    g.forma(P([[x - 7, y + 1], [x - 9, y - 7], [x - 6, y - 12], [x, y - 13], [x + 5, y - 10], [x + 1, y - 9], [x - 3, y - 8], [x - 3, y - 3]]), rampa(ELEMENTOS.seda.claro, '#E6F4FF', ELEMENTOS.seda.cor))
    for (const [a, b] of [[-6, -12], [-1, -13], [0, -12], [4, -10], [-7, -11]]) g.p(x + a, y + b, CREME)
    g.forma(U(E(x, y + 1, 7, 6), T([[x + 4, y + 2, 2.8], [x + 12, y + 3 + (at ? 1 : 0), 2]])), r)
    olho(g, x + 2, y - 1)
    g.p(x + 13, y + 3, PLUM)
  },
}

// ------------------------------------------------------------------ BRAÇOS (f = da frente; senão, o de trás, mais escuro)
const escurecer = (r) => rampa(r.escuro, r.base, r.linha)
const BRACOS = {
  // Slab Arms — braços largos de laje
  br_abraco(g, [x, y], r, f, at) {
    const k = at && f ? 3 : 0
    g.forma(f ? P([[x - 2, y - 3], [x + 5 + k, y - 1], [x + 7 + k, y + 8], [x + 1 + k, y + 10], [x - 3, y + 4]]) : P([[x + 2, y - 3], [x - 5, y - 1], [x - 7, y + 8], [x - 1, y + 9], [x + 3, y + 3]]), f ? r : escurecer(r))
  },
  // Ember Whip — dois chicotes de brasa saindo dos ombros
  br_cadarco(g, [x, y], r, f, at) {
    const k = at && f ? 6 : 0
    const pts = f ? [[x, y, 2.2], [x + 3, y - 6, 1.8], [x + 9 + k, y - 9 + k / 2, 1.5], [x + 14 + k, y - 6 + k, 1.3]] : [[x, y, 2], [x - 3, y - 6, 1.7], [x - 1, y - 12, 1.4], [x + 4, y - 14, 1.2]]
    g.forma(T(pts), f ? r : escurecer(r), { semLuz: true })
    const [ex, ey] = pts[pts.length - 1]
    g.chapa(U(E(ex, ey, 2.2, 2.2), P([[ex - 2, ey], [ex + 1, ey - 5], [ex + 2, ey]])), '#FFD27A')
    g.p(ex, ey, '#FFF3C0')
  },
  // Tailwind Wings — asas douradas com laços de vento
  br_cruz(g, [x, y], r, f, at) {
    const s = f ? 1 : -1, k = at && f ? 3 : 0
    const asa = P([[x, y - 2], [x + s * (10 + k), y - 9 - k], [x + s * (15 + k), y - 6 - k], [x + s * 14, y - 1], [x + s * 12, y + 2], [x + s * 9, y + 4], [x + s * 5, y + 6], [x, y + 5]])
    g.forma(asa, f ? r : escurecer(r))
    for (const t of [5, 9, 12]) g.linhaPx(x + s * t, y + 5 - t / 3, x + s * (t + 2), y - 2 - t / 3, (f ? r : escurecer(r)).linha)
    if (f) { g.linhaPx(x + 12, y + 7, x + 17, y + 5, CREME); g.linhaPx(x + 17, y + 5, x + 19, y + 8, CREME) }
  },
  // Thorn Vines — cipós com espinhos saindo dos ombros
  br_rasgado(g, [x, y], r, f, at) {
    const k = at && f ? 5 : 0
    const pts = f ? [[x, y, 2], [x + 3, y - 7, 1.7], [x + 9 + k, y - 11, 1.5], [x + 14 + k, y - 9 + k / 2, 1.2]] : [[x, y, 1.8], [x - 2, y - 7, 1.6], [x + 1, y - 13, 1.3], [x + 5, y - 15, 1]]
    g.forma(T(pts), f ? r : escurecer(r), { semLuz: true })
    for (let i = 1; i < pts.length; i++) { const [a, b] = pts[i]; g.p(a, b - 3, CREME); g.p(a + 2, b - 2, CREME) }
    if (f) g.chapa(E(pts[2][0] - 1, pts[2][1] + 3, 2, 1.2), ELEMENTOS.jeans.claro)
  },
  // Mist Wings — asas de mariposa lilás meio transparentes (as duas atrás do corpo)
  br_nevoa(g, [x, y], r, f, at) {
    const s = f ? 0 : -3
    g.forma(U(E(x - 7 + s, y - 4, 10, 7), E(x - 5 + s, y + 8, 7, 5)), f ? rampa(ELEMENTOS.tule.claro, '#F2EAFF', ELEMENTOS.tule.cor) : escurecer(r), { alfa: 0.7 })
    g.chapa(U(E(x - 9 + s, y - 5, 2, 2), E(x - 6 + s, y + 8, 1.5, 1.5)), f ? '#FFF3A8' : ELEMENTOS.tule.cor, 0.85)
  },
  // Lance Fin — barbatanas compridas como agulhas
  br_agulha(g, [x, y], r, f, at) {
    const k = at && f ? 5 : 0
    g.forma(f ? P([[x - 2, y - 2], [x + 18 + k, y - 7], [x + 3, y + 3]]) : P([[x + 1, y - 2], [x - 12, y - 7], [x - 1, y + 2]]), f ? rampa(ELEMENTOS.seda.claro, '#E6F4FF', ELEMENTOS.seda.cor) : escurecer(r))
  },
}

// ------------------------------------------------------------------ PERNAS (o encaixe é o topo das pernas)
const PERNAS = {
  // Boulder Roll — metade de baixo é uma pedra que rola
  pe_novelo(g, [x, y], r) {
    const rr = rampa(misturar(r.base, PLUM, 0.12), r.claro, r.escuro)
    g.forma(E(x, y + 4, 11, 9), rr)
    g.linhaPx(x - 6, y + 6, x - 2, y + 9, rr.linha); g.linhaPx(x + 3, y + 7, x + 7, y + 4, rr.linha)
  },
  // Magma Hooves — cascos pretos com lava nas frestas
  pe_tamanco(g, [x, y], r) {
    for (const dx of [-9, 6]) {
      g.forma(R(x + dx - 3, y - 2, 7, 6), r, { semLuz: true })
      g.forma(R(x + dx - 4, y + 4, 9, 6), R_CARVAO, { semLuz: true })
      g.p(x + dx - 1, y + 6, '#FF8A3C'); g.p(x + dx + 2, y + 8, '#FF8A3C'); g.p(x + dx, y + 7, '#FFD27A')
    }
  },
  // Breeze Talons — garrinhas leves com penas-fita
  pe_remendo(g, [x, y], r) {
    for (const dx of [-4, 4]) {
      g.forma(R(x + dx - 1, y, 3, 6), r, { semLuz: true })
      g.chapa(U(R(x + dx - 2, y + 6, 6, 2), R(x + dx + 3, y + 7, 1, 2), R(x + dx - 2, y + 7, 1, 2)), '#F08A3C')
    }
    g.linhaPx(x - 4, y + 2, x - 9, y + 4, CREME)
  },
  // Root Claws — patas curtas com garras de raiz
  pe_rebite(g, [x, y], r) {
    const rp = rampa('#7A5A3A', '#A07A52', '#53392A')
    for (const dx of [-11, -4, 6, 12]) {
      g.forma(R(x + dx - 2, y - 3, 5, 9), dx === -4 || dx === 12 ? escurecer(rp) : rp, { semLuz: true })
      g.chapa(U(R(x + dx - 3, y + 6, 2, 1), R(x + dx + 2, y + 6, 2, 1)), r.base)
    }
  },
  // Wisp Tail — sem pernas: cauda de fumaça enrolada
  pe_ultimo(g, [x, y], r) {
    g.forma(T([[x, y - 2, 6], [x - 2, y + 4, 4.2], [x - 5, y + 9, 3], [x - 2, y + 13, 2.2], [x + 3, y + 13, 1.6]]), rampa(ELEMENTOS.tule.claro, '#F2EAFF', ELEMENTOS.tule.cor), { alfa: 0.8 })
  },
  // Current Flippers — cauda enrolada de cavalo-marinho
  pe_cetim(g, [x, y], r) {
    g.forma(T([[x, y - 3, 5], [x - 2, y + 4, 4], [x, y + 10, 3.2], [x + 6, y + 12, 2.6], [x + 9, y + 9, 2.2], [x + 7, y + 6, 1.8], [x + 4, y + 8, 1.4]]), r)
  },
}

// ------------------------------------------------------------------ MARCAS (emblema pequeno)
const MARCAS = {
  bo_pe_de_chumbo(g, [x, y]) { // Rooted: runa de raiz
    const c = '#5E3E26'
    g.linhaPx(x, y - 3, x, y + 3, c); g.linhaPx(x, y + 1, x - 3, y + 4, c); g.linhaPx(x, y + 1, x + 3, y + 4, c); g.linhaPx(x, y - 1, x - 2, y - 3, c)
  },
  bo_espinho(g, [x, y]) { // Spiked Hide: fileira de espinhos de obsidiana nas costas
    for (const dx of [-9, -3, 3]) g.forma(P([[x + dx - 3, y + 3], [x + dx, y - 4], [x + dx + 3, y + 3]]), R_CARVAO, { semLuz: true })
  },
  bo_remendo_vivo(g, [x, y]) { // Mending Moss: tufo de musgo com folhinha
    g.chapa(E(x, y, 3, 2), PALETA.folhagem); g.chapa(E(x - 1, y - 1, 1.5, 1), ELEMENTOS.jeans.cor)
    g.p(x + 2, y - 3, ELEMENTOS.jeans.claro); g.p(x + 3, y - 4, ELEMENTOS.jeans.claro); g.p(x + 2, y - 2, ELEMENTOS.jeans.cor)
  },
  bo_agulha_afiada(g, [x, y]) { // Keen Claws: runa de três arranhões, verde-claro
    for (const dx of [-3, 0, 3]) g.linhaPx(x + dx - 1, y - 3, x + dx + 1, y + 3, '#C8FF9A')
  },
  bo_rancor(g, [x, y]) { // Last Roar: coroinha de chama lilás
    g.chapa(P([[x - 4, y + 2], [x - 4, y - 2], [x - 2, y], [x, y - 4], [x + 2, y], [x + 4, y - 2], [x + 4, y + 2]]), '#E6B8FF')
    g.p(x, y - 1, '#FFFFFF')
  },
  bo_olho_de_vidro(g, [x, y]) { // Hawk Eye: brasão de olho
    g.chapa(E(x, y, 3.5, 2.2), CREME); g.chapa(R(x - 1, y - 1, 2, 2), PLUM); g.p(x - 1, y - 1, '#8CC8FF')
  },
}

// ------------------------------------------------------------------ montar um monstro
const idDe = (g) => String(g).split('@')[0]
const genericoCabeca = (g, [x, y], r) => { g.forma(E(x, y, 8, 7), r); olho(g, x + 3, y - 1) }
const genericoBraco = (g, [x, y], r, f) => g.forma(T([[x, y, 2], [x + (f ? 7 : -7), y + 5, 1.6]]), f ? r : escurecer(r))
const genericaPerna = (g, [x, y], r) => { for (const dx of [-5, 5]) g.forma(R(x + dx - 2, y, 4, 9), r, { semLuz: true }) }

/** Grade 64×64 do monstro, montado pelas partes. partes: { tronco, cabeca, bracos, pernas, bordado } (id ou 'id@raridade'). */
export function gradeDoMonstro(partes, pose = 'idle', so = null) {
  const ve = (slot) => !so || so.includes(slot)
  const g = new Grade(64, 64)
  const ids = Object.fromEntries(Object.entries(partes).map(([k, v]) => [k, idDe(v)]))
  const tronco = PARTES[ids.tronco]
  const corpo = CORPOS[ids.tronco] ?? CORPOS.tr_la_embolada
  const at = pose === 'attack'
  const k = at ? 2 : 0
  const ramp = (slot) => rampaDoElemento(PARTES[ids[slot]]?.carta ? CARTAS[PARTES[ids[slot]].carta].tipo : tronco.tipo)
  const enc = corpo.encaixe
  const mv = ([x, y], dx = 0, dy = 0) => [x + k + dx, y + dy]
  const braco = BRACOS[ids.bracos] ?? genericoBraco
  if (ve('bracos')) braco(g, mv(enc.bracoT), ramp('bracos'), false, at)
  if (ve('pernas')) (PERNAS[ids.pernas] ?? genericaPerna)(g, enc.pernas, ramp('pernas'))
  if (ve('tronco')) corpo.desenhar(g, rampaDoElemento(tronco.tipo), k)
  const marca = PARTES[ids.bordado]?.bordado && ve('bordado') && ve('tronco') ? MARCAS[ids.bordado] : null
  if (ve('cabeca')) (CABECAS[ids.cabeca] ?? genericoCabeca)(g, mv(enc.cabeca, at ? 2 : 0, at ? 1 : 0), ramp('cabeca'), at)
  if (marca && ids.bordado !== 'bo_espinho') marca(g, mv(enc.marca))
  if (ve('bracos')) braco(g, mv(enc.bracoF), ramp('bracos'), true, at)
  if (marca && ids.bordado === 'bo_espinho') marca(g, mv(enc.marca))
  g.contorno()
  return g
}


// ------------------------------------------------------------------ OVO (3 estados)
export function gradeDoOvo(estado = 'whole') {
  const g = new Grade(64, 64)
  const casca = rampa(CREME, '#FFFFFF', '#D9CDB4')
  const pintas = [['jeans', 26, 30], ['seda', 37, 24], ['la', 39, 41], ['feltro', 27, 45], ['tule', 33, 35], ['couro', 22, 38]]
  if (estado === 'open') {
    g.forma(P([[16, 46], [18, 40], [22, 43], [26, 38], [30, 43], [34, 38], [38, 43], [42, 39], [46, 44], [48, 46], [45, 55], [32, 59], [19, 55]]), casca)
    g.forma(P([[6, 30], [10, 22], [16, 20], [14, 26], [18, 28]]), casca)
    g.forma(P([[48, 24], [54, 20], [58, 26], [52, 30]]), casca)
    g.forma(P([[10, 52], [14, 49], [15, 54]]), casca); g.forma(P([[50, 54], [54, 50], [56, 55]]), casca)
    for (const [t, x, y] of [['la', 39, 50], ['feltro', 25, 50], ['couro', 13, 25]]) g.chapa(E(x, y, 2, 1.6), ELEMENTOS[t].cor)
  } else {
    g.forma(P([[32, 8], [40, 11], [46, 20], [49, 33], [48, 46], [42, 55], [32, 59], [22, 55], [16, 46], [15, 33], [18, 20], [24, 11]]), casca, { luz: [0.32, 0.25], luzRaio: 0.2 })
    for (const [t, x, y] of pintas) { g.chapa(E(x, y, 3.2, 2.7), ELEMENTOS[t].cor); g.p(x - 1, y - 1, ELEMENTOS[t].claro); g.p(x + 1, y + 1, ELEMENTOS[t].escuro) }
    if (estado === 'cracked') {
      const z = [[17, 36], [21, 33], [24, 37], [28, 32], [32, 37], [36, 31], [40, 36], [44, 32], [48, 35]]
      for (let i = 0; i < z.length - 1; i++) g.linhaPx(z[i][0], z[i][1], z[i + 1][0], z[i + 1][1], PLUM)
      for (let i = 1; i < z.length - 1; i += 2) g.p(z[i][0], z[i][1] + 1, '#FFF3A8')
      g.linhaPx(28, 32, 26, 25, PLUM); g.linhaPx(40, 36, 42, 44, PLUM)
    }
  }
  g.contorno()
  return g
}

// ------------------------------------------------------------------ ÍCONES 16×16
const ICONE_ELEMENTO = {
  jeans(g, r) { g.forma(P([[2, 13], [4, 6], [9, 2], [14, 2], [13, 8], [8, 12]]), r); g.linhaPx(3, 13, 11, 5, r.linha); g.p(12, 1, CREME) },
  seda(g, r) { g.forma(U(E(8, 10, 5, 4.5), P([[4, 9], [8, 1], [12, 9]])), r); g.p(6, 8, '#FFFFFF'); g.p(6, 9, '#FFFFFF') },
  la(g, r) { g.forma(E(8, 9, 6.5, 5.5), r); g.p(6, 7, r.claro); g.p(10, 11, r.linha); g.p(11, 10, r.linha) },
  feltro(g, r) { g.forma(P([[3, 14], [6, 7], [11, 2], [14, 3], [12, 9], [6, 13]]), r); g.linhaPx(3, 14, 12, 4, r.linha) },
  tule(g, r) { g.forma(U(E(5, 10, 3.5, 3), E(10, 9, 4, 3.5), E(8, 6, 3.5, 3)), r) },
  couro(g, r) { g.forma(P([[8, 1], [12, 6], [13, 10], [11, 14], [5, 14], [3, 10], [4, 6], [6, 8]]), r); g.chapa(E(8, 11, 2, 2.5), '#FFD27A') },
}
export function gradeDoIconeElemento(tipo) {
  const g = new Grade(16, 16)
  ICONE_ELEMENTO[tipo]?.(g, rampaDoElemento(tipo))
  g.contorno()
  return g
}
/** Ícone da habilidade: medalha da cor do elemento com o desenho do que ela faz (ataque, Guard, cura, apoio). */
export function gradeDoIconeHabilidade(cartaId) {
  const c = CARTAS[cartaId]
  const g = new Grade(16, 16)
  const r = rampaDoElemento(c.tipo)
  g.forma(E(8, 8, 7, 7), r, { linha: false })
  const ef = c.efeitos.map((x) => x.tipo)
  const cor = CREME
  if (ef.includes('dano')) {
    if (c.alvo === 'inimigo') { g.linhaPx(4, 11, 11, 4, cor); g.p(11, 5, cor); g.p(10, 4, cor); g.p(12, 4, cor); g.p(11, 3, cor) } // Reach: lança
    else if (c.alvo === 'todos') { for (const y of [5, 8, 11]) g.linhaPx(4, y, 11, y - 1, cor) }
    else { g.chapa(P([[4, 4], [12, 8], [4, 12], [7, 8]]), cor) } // golpe
  } else if (ef.includes('escudo')) g.chapa(P([[4, 4], [12, 4], [12, 8], [8, 13], [4, 8]]), cor)
  else if (ef.includes('cura')) { g.chapa(R(7, 4, 3, 9), cor); g.chapa(R(4, 7, 9, 3), cor) }
  else if (ef.includes('veu')) { g.chapa(E(8, 8, 4, 4), cor); g.chapa(E(10, 7, 3, 3), r.base) }
  else { g.chapa(P([[5, 3], [11, 8], [5, 13]]), cor); g.p(4, 8, cor) } // apoio: seta
  g.contorno()
  return g
}

// ------------------------------------------------------------------ MARCADORES DO MAPA 32×32
const LUGARES = {
  1(g) { // poço da vila com bandeirinhas
    g.forma(E(16, 18, 9, 7), R_PEDRA); g.chapa(E(16, 17, 6, 4), '#2E6FB8'); g.p(14, 16, '#8CC8FF')
    g.forma(R(6, 6, 2, 10), R_MADEIRA, { semLuz: true }); g.forma(R(24, 6, 2, 10), R_MADEIRA, { semLuz: true }); g.forma(R(5, 4, 22, 3), R_MADEIRA, { semLuz: true })
    ;['#F05A3C', '#E8C547', '#2E8BEA', '#4CB944'].forEach((c, i) => g.chapa(P([[8 + i * 4, 7], [12 + i * 4, 7], [10 + i * 4, 11]]), c))
  },
  2(g) { // moinho de água
    g.forma(R(4, 10, 16, 16), rampa('#E8DCC4', '#FFFFFF', '#BFAF92')); g.forma(P([[2, 11], [12, 3], [22, 11]]), rampa('#C8553D'))
    g.forma(E(23, 19, 7, 7), R_MADEIRA); g.chapa(E(23, 19, 3, 3), '#4E3428'); g.chapa(R(9, 17, 4, 9), '#4E3428')
    g.chapa(R(16, 26, 14, 3), '#2E8BEA')
  },
  3(g) { // portão de espinhos na borda da mata
    g.forma(E(9, 13, 8, 9), rampa(PALETA.folhagem)); g.forma(E(24, 13, 7, 9), rampa(PALETA.folhagem))
    g.forma(R(6, 20, 3, 9), R_MADEIRA, { semLuz: true }); g.forma(R(23, 20, 3, 9), R_MADEIRA, { semLuz: true })
    for (const x of [10, 14, 18]) g.forma(P([[x - 2, 28], [x, 18], [x + 2, 28]]), rampa(ELEMENTOS.jeans.escuro), { semLuz: true })
  },
  4(g) { // torre de vigia de pedra
    g.forma(R(10, 8, 12, 20), R_PEDRA); g.forma(U(R(8, 5, 16, 4), R(8, 3, 3, 2), R(14, 3, 4, 2), R(21, 3, 3, 2)), R_PEDRA)
    g.chapa(R(14, 12, 4, 5), PLUM); g.chapa(R(14, 21, 4, 7), '#4E3428'); g.chapa(P([[22, 4], [22, -2 + 3], [28, 3]]), '#F05A3C')
  },
  5(g) { // castelo
    g.forma(R(4, 14, 24, 14), R_PEDRA); g.forma(R(11, 6, 10, 10), R_PEDRA)
    for (const x of [4, 9, 14, 19, 24]) g.forma(R(x, 11, 3, 3), R_PEDRA, { semLuz: true })
    g.forma(P([[10, 7], [16, 0], [22, 7]]), rampa('#2E8BEA')); g.chapa(R(14, 20, 4, 8), '#4E3428'); g.chapa(P([[16, 0], [16, -1 + 1], [21, 1]]), '#E8C547')
  },
}
export function gradeDoLugar(n) { const g = new Grade(32, 32); LUGARES[n]?.(g); g.contorno(); return g }

// ------------------------------------------------------------------ cache + manifesto (PNG por cima do desenho por código)
const cache = new Map()
const MANIFESTO = { m: null, imgs: new Map() }
function img(rel) {
  if (!rel || typeof rel !== 'string') return null
  return MANIFESTO.imgs.get(rel) ?? null
}
/** Lê public/piloto/arte/manifesto.json e carrega os PNG listados. Nunca falha: o que faltar cai para o código. */
export async function carregarManifesto(base = new URL('./arte/', import.meta.url)) {
  try {
    const r = await fetch(new URL('manifesto.json', base))
    MANIFESTO.m = r.ok ? await r.json() : {}
  } catch { MANIFESTO.m = {} }
  const m = MANIFESTO.m || {}
  const lista = []
  const add = (v) => { if (typeof v === 'string' && /\.png$/i.test(v) && !/^[a-z]+:|^\/|\.\./i.test(v)) lista.push(v) }
  for (const v of Object.values(m.monsters ?? {})) { add(v?.idle); add(v?.attack) }
  add(m.arena); add(m.nest); add(m.map)
  for (const v of Object.values(m.egg ?? {})) add(v)
  for (const v of Object.values(m.places ?? {})) add(v)
  for (const v of Object.values(m.elements ?? {})) add(v)
  await Promise.all(lista.map((rel) => new Promise((ok) => {
    const im = new Image()
    im.onload = () => { MANIFESTO.imgs.set(rel, im); ok() }
    im.onerror = () => ok()
    im.src = new URL(rel, base).href
  })))
  return MANIFESTO.m
}
export const manifesto = () => MANIFESTO.m ?? {}
function guardar(chave, fazer) { if (!cache.has(chave)) cache.set(chave, fazer()); return cache.get(chave) }

/** Imagem 64×64 do monstro (PNG do manifesto se houver para o id pronto; senão o desenho por partes). */
export function monstro(def, pose = 'idle') {
  const pronto = typeof def === 'string' ? def : def?.pronto
  const png = pronto ? img(manifesto().monsters?.[pronto]?.[pose === 'attack' ? 'attack' : 'idle']) : null
  if (png) return png
  const partes = typeof def === 'string' ? BONECOS_PRONTOS[def].partes : def.partes
  const chave = 'm:' + JSON.stringify(partes) + pose
  return guardar(chave, () => gradeDoMonstro(partes, pose).canvas())
}
/** O monstro só com as partes já reveladas (cena do ovo): ex. ['pernas', 'bracos']. */
export function monstroEmPartes(partes, slots) {
  return guardar('mp:' + JSON.stringify(partes) + slots.join(','), () => gradeDoMonstro(partes, 'idle', slots).canvas())
}
export function ovo(estado = 'whole') { return img(manifesto().egg?.[estado]) ?? guardar('ovo:' + estado, () => gradeDoOvo(estado).canvas()) }
export function iconeElemento(tipo) { return img(manifesto().elements?.[tipo]) ?? guardar('el:' + tipo, () => gradeDoIconeElemento(tipo).canvas()) }
export function iconeHabilidade(id) { return guardar('hab:' + id, () => gradeDoIconeHabilidade(id).canvas()) }
export function lugar(n) { return img(manifesto().places?.[String(n)]) ?? guardar('lug:' + n, () => gradeDoLugar(n).canvas()) }
export const pngDe = (chave) => img(manifesto()[chave])
/** A marca sozinha, num quadro 16×16 (cena do ovo: a runa que acende dentro da casca). */
export function marcaSozinha(boId) {
  return guardar('marca:' + boId, () => {
    const g = new Grade(16, 16)
    ;(MARCAS[idDe(boId)] ?? (() => {}))(g, [8, 8])
    return g.canvas()
  })
}
/** Jeito do corpo ('bola', 'baixo', 'flutua', 'pe'): a tela usa para o monstro que flutua balançar. */
export function formaDoCorpo(partes) {
  return CORPOS[idDe(partes?.tronco ?? '')]?.encaixe.tipo ?? 'bola'
}
/** dataURL de um canvas (para <img> no HTML). */
export function url(cv) {
  if (cv && cv.src) return cv.src
  return guardar('url:' + (cv.__id ??= Math.random().toString(36).slice(2)), () => cv.toDataURL('image/png'))
}
