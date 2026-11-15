// Frayz — RIG dos bonecos de pano amaldiçoados: desenho por código, em CAMADAS, animado.
// Nenhum arquivo de imagem e nenhuma arte de terceiros. Aqui não há regra nem número de jogo: só desenho.
// Os dados (lista de partes, tipo de cada parte) vêm de './ponte.js'.
//
// COMO É MONTADO
//   Espaço de desenho: 240 unidades = altura do boneco em pé. O pé fica em (0, 0); y cresce para baixo (a cabeça está em y negativo).
//   Cada parte é uma CAMADA (um canvas guardado em cache por parte + raridade + escala + lado da luz):
//   pernas (2) · tronco (com bordado, remendos e troféus) · braços (2) · cabeça (base + frente) · e, por cima, o que é vivo:
//   rosto (olhos de botão, sobrancelhas, boca), fio da maldição, fiapos, fio do alto, dedal.
//   As poses só mexem em transformações dessas camadas (girar, esticar, amassar, dobrar em fatias) — nunca redesenham o pano.
//
// FONTE DE CAMADA (para trocar o desenho por código por outra arte sem refazer poses, animação nem cena)
//   registrarFonteDeCamada(idDaParte, fonte)   // idDaParte: 'cab_ziper', 'tr_jeans_rebitado', 'br_agulha', 'pe_tamanco', 'bo_espinho'...
//   fonte(pedido) → camada
//     pedido = { id, slot, lado, escala, luz, fio, raridade, remendos, trofeus }
//       lado:   -1 = membro do lado esquerdo da tela, +1 = do lado direito (0 para cabeça, tronco e bordado)
//       escala: px do canvas por unidade de desenho (peça o canvas neste tamanho; a fonte pode devolver outro e dizer qual em `escala`)
//       luz:    +1 = vela em cima à esquerda (time A); -1 = a camada será ESPELHADA na tela (time B): a luz tem de vir do outro lado
//       fio:    cor do pesponto (raridade ou Fio de Ouro)
//     camada = {
//       canvas,            // HTMLCanvasElement, ImageBitmap ou <img> já carregada
//       escala,            // px do canvas por unidade
//       pivo: { x, y },    // em PX do canvas: o ponto de encaixe da camada
//                          //   cabeça → PESCOÇO · tronco → meio da BASE (entre os quadris) · braço → OMBRO · perna → QUADRIL · bordado → centro
//       encaixes: { ... }  // em UNIDADES, relativos ao pivô (x para a direita, y para baixo). Tudo opcional (há padrão):
//                          //   tronco: pescoco, ombroE, ombroD, quadrilE, quadrilD, peito (de onde sai o fio da maldição), bordado (centro do emblema)
//                          //   cabeça: topo (onde o fio do alto e o dedal encostam)
//                          //   braço:  mao, juntas [{x,y}...] (onde o braço dobra, do ombro para a mão; sem juntas = rígido)
//                          //   perna:  pe (onde a sola toca o chão; pe.y = altura do quadril), juntas
//       rosto,             // só cabeça, opcional: { G:{x,y,r,cor}, P:{x,y,r,cor}, boca:{x,y,l,tipo,ang}, ... } (ver CABECAS). Sem `rosto`, a tela não desenha rosto vivo.
//       frente,            // só cabeça, opcional: outro canvas do mesmo tamanho, desenhado por cima do rosto (aba do gorro, véu)
//       costuras,          // opcional (interno): linhas de pesponto para o brilho da Linha e do Fio de Ouro
//     }
//   Trocar a fonte NÃO muda poses, animação, cena nem efeitos: eles só usam `canvas`, `pivo` e `encaixes`.
import { CARTAS, PARTES } from './ponte.js'

export const ALTURA_BASE = 240
export const POSES = ['parado', 'preparo', 'golpe', 'golpeado', 'escudo', 'ultimoFio', 'caido', 'vitoria']
const TAU = Math.PI * 2
const TINTA = '#140C1F', LINHO = '#F2E6C9', MALDICAO = '#FF4D8D', ENCHIMENTO = '#EFE4CB'
const ACO = '#C9D0D8', ACO_ESC = '#77808E', MADEIRA = '#B07A45', VINHO = '#7A2E4E', CARMIM = '#C7354A'
export const FIO_RARIDADE = { comum: '#E8D9B5', incomum: '#7BD88F', rara: '#5BB8FF', lendaria: '#FFC857', ouro: '#FFC857' }
export const TEC = {
  jeans: { base: '#3F6FB5', claro: '#7FA6DE', escuro: '#27477A' },
  seda: { base: '#D65DB1', claro: '#F5A6DA', escuro: '#8E2F74' },
  la: { base: '#D9C9A3', claro: '#F4EACD', escuro: '#9C8A60' },
  feltro: { base: '#5E9C76', claro: '#8FC4A1', escuro: '#3A6A4D' },
  tule: { base: '#B9A7E8', claro: '#E2DAFA', escuro: '#7B69B5' },
  couro: { base: '#8B5A2B', claro: '#BD8A58', escuro: '#55331A' },
}
// panos dos remendos (Pontos de Costura): sempre nesta ordem e nestes lugares; nenhum usa cor de raridade
const PANO_REMENDO = ['#CDBE9B', '#9C7F5A', '#8A4B5E', '#5F627C', '#B8A07E']

// ------------------------------------------------------------------ números, sementes e curvas

const limita = (v, a, b) => (v < a ? a : v > b ? b : v)
const mix = (a, b, t) => a + (b - a) * t
const trecho = (p, a, b) => limita((p - a) / (b - a), 0, 1)
function hash(txt) { let h = 2166136261; for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function rng(seed) {
  let s = (seed >>> 0) || 1
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const novoCanvas = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h)); return cv }

/** Curva suave (Catmull-Rom) pelos pontos de controle → polilinha densa. Ponto repetido = canto mais duro. */
function suave(ctrl, fechado = true, passos = 8) {
  const n = ctrl.length, out = []
  const P = (i) => (fechado ? ctrl[((i % n) + n) % n] : ctrl[limita(i, 0, n - 1)])
  const m = fechado ? n : n - 1
  for (let i = 0; i < m; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2)
    for (let k = 0; k < passos; k++) {
      const t = k / passos, t2 = t * t, t3 = t2 * t
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ])
    }
  }
  if (!fechado) out.push([ctrl[n - 1][0], ctrl[n - 1][1]])
  return out
}
function caminho(pts, fechado = true) {
  const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1])
  if (fechado) p.closePath()
  return p
}
/** Forma fechada: pontos densos + caminho + caixa. */
function forma(bruto) {
  const pts = []
  for (const q of bruto) { const u = pts[pts.length - 1]; if (!u || Math.abs(u[0] - q[0]) + Math.abs(u[1] - q[1]) > 0.45) pts.push(q) }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
  for (const q of pts) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1] }
  return { pts, p: caminho(pts, true), bb: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } }
}
const curvaFechada = (ctrl, passos = 8) => forma(suave(ctrl, true, passos))
/** Almofada encaroçada: superelipse com caroços, que pode cair embaixo (queda) e alargar embaixo (pera). */
function bolha(cx, cy, rx, ry, R, o = {}) {
  const n = o.n ?? 12, car = o.caroco ?? 0.05, q = o.quad ?? 2, ctrl = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2 + (o.giro ?? 0), ca = Math.cos(a), sa = Math.sin(a)
    const k = Math.pow(Math.pow(Math.abs(ca), q) + Math.pow(Math.abs(sa), q), -1 / q) * (1 + (R() - 0.5) * 2 * car)
    let x = ca * rx * k, y = sa * ry * k
    if (o.pera) x *= 1 + o.pera * (y / ry)
    if (o.queda && sa > 0) y += o.queda * sa * sa
    ctrl.push([cx + x, cy + y])
  }
  return forma(suave(ctrl, true, o.passos ?? 8))
}
/** Tubo mole ao longo de uma espinha (pontos de controle), com largura que muda e pontas redondas. */
function tubo(ctrl, larg, passos = 8) {
  const esp = suave(ctrl, false, passos), n = esp.length, E = [], D = []
  const w = typeof larg === 'function' ? larg : (t) => mix(larg[0], larg[1], t)
  let d0 = null, d1 = null
  for (let i = 0; i < n; i++) {
    const a = esp[Math.max(0, i - 1)], b = esp[Math.min(n - 1, i + 1)]
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l
    const h = w(i / (n - 1)) / 2
    E.push([esp[i][0] - dy * h, esp[i][1] + dx * h]); D.push([esp[i][0] + dy * h, esp[i][1] - dx * h])
    if (i === 0) d0 = [dx, dy]; if (i === n - 1) d1 = [dx, dy]
  }
  const pts = [...E]
  const arco = (c, r, a0) => { for (let k = 1; k < 6; k++) { const a = a0 - (Math.PI * k) / 6; pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]) } }
  arco(esp[n - 1], w(1) / 2, Math.atan2(d1[0], -d1[1]))
  for (let i = n - 1; i >= 0; i--) pts.push(D[i])
  arco(esp[0], w(0) / 2, Math.atan2(-d0[0], d0[1]))
  const f = forma(pts); f.esp = esp
  return f
}
/** Polilinha fechada recuada para dentro (para o pesponto acompanhar a borda). */
function recuar(pts, d) {
  const n = pts.length, out = []
  let A = 0
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1] }
  const s = A > 0 ? 1 : -1
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 2 + n) % n], b = pts[(i + 2) % n]
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
    out.push([pts[i][0] - (dy / l) * d * s, pts[i][1] + (dx / l) * d * s])
  }
  return out
}
const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU) }
function traco(c, pts, cor, lw, fechar = false) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); if (fechar) c.closePath()
  c.strokeStyle = cor; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke()
}
function arcoQ(c, a, b, e, cor, lw) { c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(b[0], b[1], e[0], e[1]); c.strokeStyle = cor; c.lineWidth = lw; c.lineCap = 'round'; c.stroke() }
function misturaCor(a, b, t) {
  const h = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]
  const x = h(a), y = h(b)
  return '#' + x.map((v, i) => Math.round(mix(v, y[i], t)).toString(16).padStart(2, '0')).join('')
}

// ------------------------------------------------------------------ tecidos: azulejo de textura em escala fixa

const U = 48 // lado do azulejo, em unidades
const cacheAzulejo = new Map()
function azulejo(tipo, ts) {
  const chave = tipo + '|' + ts.toFixed(3)
  let cv = cacheAzulejo.get(chave)
  if (cv) return cv
  const px = Math.max(8, Math.round(U * ts))
  cv = novoCanvas(px, px)
  const c = cv.getContext('2d'); c.scale(px / U, px / U)
  const R = rng(hash('tecido' + tipo))
  const rep = (fn) => { for (const dx of [-U, 0, U]) for (const dy of [-U, 0, U]) { c.save(); c.translate(dx, dy); fn(); c.restore() } }
  const T = TEC[tipo]
  c.fillStyle = T ? T.base : tipo; c.fillRect(0, 0, U, U)
  c.lineCap = 'round'
  if (tipo === 'jeans') { // sarja em diagonal + fios claros da trama
    for (let k = -U; k < U * 2; k += 4) {
      c.strokeStyle = 'rgba(255,255,255,0.13)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(k, 0); c.lineTo(k - U, U); c.stroke()
      c.strokeStyle = 'rgba(16,22,60,0.2)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(k + 2, 0); c.lineTo(k + 2 - U, U); c.stroke()
    }
    const marcas = []; for (let i = 0; i < 26; i++) marcas.push([R() * U, R() * U, 2.5 + R() * 4])
    rep(() => { c.strokeStyle = 'rgba(225,238,255,0.2)'; c.lineWidth = 0.9; for (const [x, y, l] of marcas) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + l); c.stroke() } })
  } else if (tipo === 'seda') { // faixas de brilho + trama finíssima
    const g = c.createLinearGradient(0, 0, U, U)
    for (const [t, a] of [[0, 0], [0.16, 0], [0.25, 0.34], [0.31, 0.06], [0.5, 0], [0.66, 0], [0.75, 0.34], [0.81, 0.06], [1, 0]]) g.addColorStop(t, `rgba(255,240,252,${a})`)
    c.fillStyle = g; c.fillRect(0, 0, U, U)
    const g2 = c.createLinearGradient(0, 0, U, U)
    for (const [t, a] of [[0, 0.16], [0.12, 0], [0.38, 0], [0.5, 0.16], [0.62, 0], [0.88, 0], [1, 0.16]]) g2.addColorStop(t, `rgba(90,10,70,${a})`)
    c.fillStyle = g2; c.fillRect(0, 0, U, U)
    c.strokeStyle = 'rgba(120,20,90,0.09)'; c.lineWidth = 0.6
    for (let y = 1; y < U; y += 2) { c.beginPath(); c.moveTo(0, y); c.lineTo(U, y); c.stroke() }
  } else if (tipo === 'la') { // pontos de tricô em V
    const cw = 6, ch = 4.8
    for (let y = -ch; y < U + ch; y += ch) for (let x = 0; x < U; x += cw) {
      c.strokeStyle = 'rgba(105,84,44,0.46)'; c.lineWidth = 1.35; c.beginPath(); c.moveTo(x + 0.7, y + 0.5); c.lineTo(x + 3, y + 4.3); c.lineTo(x + 5.3, y + 0.5); c.stroke()
      c.strokeStyle = 'rgba(255,251,234,0.55)'; c.lineWidth = 0.85; c.beginPath(); c.moveTo(x + 1.3, y + 1.9); c.lineTo(x + 3, y + 5.2); c.lineTo(x + 4.7, y + 1.9); c.stroke()
    }
  } else if (tipo === 'feltro') { // fosco salpicado
    const fib = []; for (let i = 0; i < 300; i++) fib.push([R() * U, R() * U, R() * TAU, 1.2 + R() * 2.8, R()])
    rep(() => { c.lineWidth = 0.75; for (const [x, y, a, l, k] of fib) { c.strokeStyle = k < 0.5 ? 'rgba(235,255,225,0.24)' : 'rgba(14,44,28,0.28)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke() } })
    c.fillStyle = 'rgba(255,255,240,0.2)'; for (let i = 0; i < 40; i++) { circ(c, R() * U, R() * U, 0.45); c.fill() }
  } else if (tipo === 'tule') { // rede translúcida: o enchimento aparece por baixo
    c.fillStyle = 'rgba(239,228,203,0.3)'; c.fillRect(0, 0, U, U)
    for (let k = -U; k <= U * 2; k += 6) {
      c.strokeStyle = 'rgba(70,50,150,0.22)'; c.lineWidth = 1.5
      c.beginPath(); c.moveTo(k + 0.9, 0); c.lineTo(k + 0.9 - U, U); c.stroke(); c.beginPath(); c.moveTo(k + 0.9 - U, 0); c.lineTo(k + 0.9, U); c.stroke()
      c.strokeStyle = 'rgba(255,255,255,0.62)'; c.lineWidth = 0.85
      c.beginPath(); c.moveTo(k, 0); c.lineTo(k - U, U); c.stroke(); c.beginPath(); c.moveTo(k - U, 0); c.lineTo(k, U); c.stroke()
    }
  } else if (tipo === 'couro') { // manchas, poros e rachaduras
    const man = []; for (let i = 0; i < 12; i++) man.push([R() * U, R() * U, 6 + R() * 9, R() < 0.5])
    rep(() => { for (const [x, y, r, esc] of man) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, esc ? 'rgba(40,18,4,0.22)' : 'rgba(255,214,160,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2) } })
    c.fillStyle = 'rgba(36,16,4,0.34)'; for (let i = 0; i < 130; i++) { circ(c, R() * U, R() * U, 0.42); c.fill() }
    const rach = []; for (let i = 0; i < 7; i++) { let x = R() * U, y = R() * U; const l = [[x, y]]; for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 9; y += (R() - 0.3) * 7; l.push([x, y]) } rach.push(l) }
    rep(() => { for (const l of rach) { traco(c, l.map((q) => [q[0] + 0.5, q[1] + 0.6]), 'rgba(255,220,170,0.14)', 0.7); traco(c, l, 'rgba(34,14,2,0.5)', 0.85) } })
  }
  if (cacheAzulejo.size > 60) cacheAzulejo.clear()
  cacheAzulejo.set(chave, cv)
  return cv
}

// ------------------------------------------------------------------ "assar" uma camada: contexto, pano, pesponto, materiais

/** Contexto do assado atual: s (px por unidade), ts (px da textura por unidade), L (+1 luz normal, -1 camada que será espelhada),
 *  fria (time B: mais lua, menos vela), fio (cor do pesponto), costuras (linhas de pesponto guardadas para o brilho). */
let B = null
const esp = (w, minPx = 1.25) => Math.max(w, minPx / B.s) // espessura que não some em tamanho pequeno

function padrao(c, tipo) {
  const p = c.createPattern(azulejo(tipo, B.ts), 'repeat')
  const k = 1 / B.s
  p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0])) // 1 px do azulejo = 1 px da tela: a textura não estica com o boneco
  return p
}
function deslocado(p, dx, dy, bb) {
  const q = new Path2D(); q.rect(bb.x - 60, bb.y - 60, bb.w + 120, bb.h + 120); q.addPath(p, new DOMMatrix([1, 0, 0, 1, dx, dy])); return q
}
/** Volume em 3 camadas dentro do recorte já ativo: sombra embaixo/direita, luz quente em cima/esquerda, filete frio de lua na borda. */
function volume(c, f, forca = 1) {
  const L = B.L, bb = f.bb, fria = B.fria
  // sombra de baixo para cima (assenta a peça)
  let g = c.createLinearGradient(0, bb.y + bb.h * 0.35, 0, bb.y + bb.h)
  g.addColorStop(0, 'rgba(20,12,31,0)'); g.addColorStop(1, `rgba(20,12,31,${0.3 * forca})`)
  c.fillStyle = g; c.fillRect(bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4)
  // sombra embaixo/direita em 3 degraus (crescente recortado)
  const k = Math.min(1, Math.max(bb.w, bb.h) / 60)
  for (const [m, a] of [[1, 0.1], [0.62, 0.1], [0.3, 0.1]]) { c.fillStyle = `rgba(20,12,31,${a * forca})`; c.fill(deslocado(f.p, -7 * L * m * k, -8 * m * k, bb), 'evenodd') }
  // luz quente em cima/esquerda (vela)
  const lq = fria ? 0.62 : 1
  g = c.createRadialGradient(bb.x + bb.w * (0.5 - 0.24 * L), bb.y + bb.h * 0.26, 1, bb.x + bb.w * (0.5 - 0.1 * L), bb.y + bb.h * 0.42, Math.max(bb.w, bb.h) * 0.72)
  g.addColorStop(0, `rgba(255,232,180,${0.3 * lq * forca})`); g.addColorStop(0.55, `rgba(255,214,150,${0.09 * lq * forca})`); g.addColorStop(1, 'rgba(255,214,150,0)')
  c.fillStyle = g; c.fillRect(bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4)
  for (const [m, a] of [[1, 0.13], [0.5, 0.1]]) { c.fillStyle = `rgba(255,218,150,${a * lq * forca})`; c.fill(deslocado(f.p, 4 * L * m * k, 4.5 * m * k, bb), 'evenodd') }
  // filete frio de lua na borda direita
  c.fillStyle = `rgba(160,205,255,${(fria ? 0.62 : 0.34) * forca})`; c.fill(deslocado(f.p, -esp(2.3, 1.1) * L, -0.6, bb), 'evenodd')
  if (fria) { c.fillStyle = `rgba(140,190,255,${0.12 * forca})`; c.fill(deslocado(f.p, -6 * L * k, -1.5, bb), 'evenodd') }
  // borda afundada (peça estufada)
  c.lineJoin = 'round'; c.strokeStyle = 'rgba(20,12,31,0.1)'; c.lineWidth = 11; c.stroke(f.p); c.lineWidth = 5; c.stroke(f.p)
}
const TRACEJADO = [3.4, 3.9, 2.9, 3.6, 3.8, 4.2, 3.1, 3.5]
function tracejar(c, k = 1) { c.setLineDash(TRACEJADO.map((v) => v * k)) }
/** Pesponto ao longo de uma polilinha (fechada ou não): sombra do fio + fio na cor da raridade. Guarda a linha para o brilho. */
function pesponto(c, pts, o = {}) {
  const lw = esp(o.larg ?? 1.5, 1.05), k = Math.max(1, 0.62 / B.s) * (o.passo ?? 1)
  const p = caminho(pts, o.fechado ?? true)
  c.save()
  c.lineCap = 'round'; c.lineJoin = 'round'; tracejar(c, k)
  c.translate(0.5 * B.L, 0.7); c.strokeStyle = 'rgba(20,12,31,0.5)'; c.lineWidth = lw + 0.5; c.stroke(p); c.translate(-0.5 * B.L, -0.7)
  c.strokeStyle = o.cor ?? B.fio; c.lineWidth = lw; c.stroke(p)
  c.restore()
  if (!o.cor || o.brilha) B.costuras.push({ p, lw, k, m: c.getTransform() })
}
/** Pinta uma forma com o tecido do tipo (ou cor chapada '#rrggbb'): textura fixa, volume, pesponto e contorno. */
function pano(c, f, tipo, o = {}) {
  const T = TEC[tipo]
  c.save()
  c.fillStyle = T ? padrao(c, tipo) : tipo
  if (o.alfa != null) c.globalAlpha = o.alfa
  c.fill(f.p)
  c.clip(f.p)
  if (o.tinta) { c.fillStyle = o.tinta; c.fillRect(f.bb.x - 2, f.bb.y - 2, f.bb.w + 4, f.bb.h + 4) }
  if (o.dentro) o.dentro(c)
  volume(c, f, o.volume ?? 1)
  // franzido: o pesponto puxa o pano em alguns pontos
  if (!o.semPesponto && !o.liso && f.pts.length > 30) {
    const R = rng(Math.round(f.bb.x * 13 + f.bb.y * 7 + f.bb.w * 31) + 5), n = f.pts.length, rec = recuar(f.pts, 1)
    c.strokeStyle = 'rgba(20,12,31,0.2)'; c.lineWidth = 1.1; c.lineCap = 'round'
    for (let i = Math.floor(R() * 7); i < n; i += 7 + Math.floor(R() * 6)) {
      const a = f.pts[i], l = 4.5 + R() * 5
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + (rec[i][0] - a[0]) * l, a[1] + (rec[i][1] - a[1]) * l); c.stroke()
    }
  }
  c.restore()
  if (!o.semPesponto && Math.min(f.bb.w, f.bb.h) >= 13) pesponto(c, recuar(f.pts, o.recuo ?? (tipo === 'couro' ? 4.8 : 4.2)), { larg: tipo === 'couro' ? 2.1 : 1.5, passo: tipo === 'couro' ? 1.35 : 1, cor: o.fio })
  if (o.contorno !== 0) { c.lineJoin = 'round'; c.lineWidth = esp(o.contorno ?? 2.5, o.contorno && o.contorno < 2 ? 1 : 1.5); c.strokeStyle = TINTA; c.stroke(f.p) }
}
const dentro = (c, f, fn) => { c.save(); c.clip(f.p); fn(); c.restore() }

/** Costura decorativa aberta (não acompanha borda): linha de pontos na cor da raridade. */
const costura = (c, pts, o = {}) => pesponto(c, pts, { fechado: false, ...o })
/** Ponto em X (linha grossa). */
function xis(c, x, y, r, cor = TINTA, lw = 2.4, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot)
  traco(c, [[-r, -r], [r, r]], cor, esp(lw, 1.1)); traco(c, [[r, -r], [-r, r]], cor, esp(lw, 1.1))
  c.restore()
}
/** Rebite / cabeça de metal. */
function rebite(c, x, y, r) {
  const g = c.createRadialGradient(x - r * 0.35 * B.L, y - r * 0.4, r * 0.1, x, y, r)
  g.addColorStop(0, '#F3F6FA'); g.addColorStop(0.6, ACO); g.addColorStop(1, ACO_ESC)
  c.fillStyle = g; circ(c, x, y, r); c.fill(); c.strokeStyle = TINTA; c.lineWidth = esp(1.2, 0.9); c.stroke()
  c.fillStyle = 'rgba(20,12,31,0.45)'; circ(c, x + 0.1, y + 0.2, r * 0.3); c.fill()
}
/** Haste de aço (agulha, alfinete). */
function haste(c, a, b, lw = 3) {
  traco(c, [a, b], TINTA, esp(lw + 2.2, 1.6)); traco(c, [a, b], ACO, lw)
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * lw * 0.24 * B.L, ny = (dx / l) * lw * 0.24 * B.L
  traco(c, [[a[0] + dx * 0.08 + nx, a[1] + dy * 0.08 + ny], [a[0] + dx * 0.9 + nx, a[1] + dy * 0.9 + ny]], 'rgba(255,255,255,0.85)', Math.max(0.7, lw * 0.3))
}
/** Fio solto assado (parado): contorno + cor. */
function fioAssado(c, pts, cor, lw = 1.4) { const d = suave(pts, false, 6); traco(c, d, TINTA, esp(lw + 1.6, 1.3)); traco(c, d, cor, esp(lw, 0.8)) }
/** Tufo de enchimento escapando. */
function tufo(c, x, y, r, R) {
  const f = bolha(x, y, r, r * 0.9, R, { caroco: 0.16, n: 9 })
  c.fillStyle = ENCHIMENTO; c.fill(f.p)
  dentro(c, f, () => { c.fillStyle = 'rgba(20,12,31,0.16)'; c.fill(deslocado(f.p, -2.2 * B.L, -2.4, f.bb), 'evenodd'); c.fillStyle = 'rgba(255,255,255,0.5)'; circ(c, x - r * 0.3 * B.L, y - r * 0.3, r * 0.4); c.fill() })
  c.strokeStyle = TINTA; c.lineWidth = esp(1.5, 1); c.lineJoin = 'round'; c.stroke(f.p)
}
/** Remendo (Ponto de Costura): quadradinho torto de outro pano, preso com pontos grandes. i = 0..4 (cor e forma fixas). */
function remendo(c, x, y, i, rot = 0, tam = 15) {
  const R = rng(900 + i * 77), j = () => (R() - 0.5) * 3.2, h = tam / 2
  c.save(); c.translate(x, y); c.rotate(rot + (R() - 0.5) * 0.5)
  const f = curvaFechada([[-h + j(), -h + j()], [-h + j(), -h + j()], [h + j(), -h + j()], [h + j(), -h + j()], [h + j(), h + j()], [h + j(), h + j()], [-h + j(), h + j()], [-h + j(), h + j()]], 3)
  const cor = PANO_REMENDO[i % 5]
  c.fillStyle = cor; c.fill(f.p)
  dentro(c, f, () => {
    if (i % 5 === 4) { c.fillStyle = 'rgba(60,30,40,0.38)'; for (let a = -h; a < h; a += 5) for (let b = -h; b < h; b += 5) if (((a + b + 100) / 5) % 2 < 1) c.fillRect(a, b, 2.5, 2.5), c.fillRect(a + 2.5, b + 2.5, 2.5, 2.5) }
    else { c.strokeStyle = 'rgba(20,12,31,0.16)'; c.lineWidth = 0.7; for (let a = -h; a < h; a += 2.2) { c.beginPath(); c.moveTo(a, -h); c.lineTo(a, h); c.stroke() } }
    c.fillStyle = 'rgba(20,12,31,0.2)'; c.fill(deslocado(f.p, -2.4 * B.L, -2.6, f.bb), 'evenodd')
    c.fillStyle = 'rgba(255,240,210,0.22)'; c.fill(deslocado(f.p, 1.8 * B.L, 2, f.bb), 'evenodd')
  })
  c.strokeStyle = TINTA; c.lineWidth = esp(1.5, 1); c.lineJoin = 'round'; c.stroke(f.p)
  // pontos grandes atravessando a borda
  const fio = i % 5 === 2 || i % 5 === 3 ? LINHO : TINTA
  c.strokeStyle = fio; c.lineWidth = esp(1.5, 0.95); c.lineCap = 'round'
  for (let k = 0; k < 4; k++) for (const t of [-0.5, 0, 0.5]) {
    const a = (k * Math.PI) / 2; c.save(); c.rotate(a); c.beginPath(); c.moveTo(t * tam * 0.72, -h - 2.2); c.lineTo(t * tam * 0.72 + 0.8, -h + 2.6); c.stroke(); c.restore()
  }
  c.restore()
}

// ------------------------------------------------------------------ rosto vivo: olhos de botão, sobrancelhas e bocas
// O rosto é desenhado a cada quadro por cima da cabeça guardada, com poucos traços, para a expressão poder mudar aos poucos.

const CORES_BOTAO = {
  osso: ['#FFF8E4', '#DCCBA3', '#8F7D55'],
  carvao: ['#6A5290', '#2E1F45', '#140C1F'],
  cereja: ['#EE7B8E', '#A8324C', '#5E1A2C'],
  madeira: ['#DDAE75', '#A06B38', '#5A3718'],
  perola: ['#FFFFFF', '#DAD3EE', '#8E86AE'],
}
const cacheOlho = new Map()
/** Bitmap de um olho de botão: aro, furos com linha cruzada e brilho pequeno. */
function olhoBotao(r, cor, L, s) {
  const chave = `${r}|${cor}|${L}|${s}`
  let e = cacheOlho.get(chave)
  if (e) return e
  const m = r + 4.5, cv = novoCanvas(m * 2 * s, m * 2 * s), c = cv.getContext('2d')
  c.scale(s, s); c.translate(m, m)
  const [cl, md, es] = CORES_BOTAO[cor] ?? CORES_BOTAO.osso
  c.fillStyle = 'rgba(20,12,31,0.4)'; circ(c, 1.5 * L, 2.1, r + 1.4); c.fill()
  c.fillStyle = TINTA; circ(c, 0, 0, r + Math.max(1.6, 1.3 / s)); c.fill()
  const g = c.createRadialGradient(-r * 0.35 * L, -r * 0.42, r * 0.08, 0, 0, r)
  g.addColorStop(0, cl); g.addColorStop(0.68, md); g.addColorStop(1, es)
  c.fillStyle = g; circ(c, 0, 0, r); c.fill()
  c.strokeStyle = es; c.globalAlpha = 0.75; c.lineWidth = Math.max(0.9, r * 0.09); circ(c, 0, 0, r * 0.7); c.stroke(); c.globalAlpha = 1
  c.strokeStyle = 'rgba(20,12,31,0.3)'; c.lineWidth = r * 0.22; c.beginPath()
  if (L > 0) c.arc(0, 0, r * 0.87, 0.15, 1.75); else c.arc(0, 0, r * 0.87, Math.PI - 1.75, Math.PI - 0.15)
  c.stroke()
  const h = r * 0.27, fio = cor === 'carvao' ? LINHO : cor === 'osso' || cor === 'perola' ? CARMIM : TINTA
  c.fillStyle = TINTA; for (const [dx, dy] of [[-h, -h], [h, -h], [-h, h], [h, h]]) { circ(c, dx, dy, Math.max(0.9, r * 0.12)); c.fill() }
  const lw = Math.max(1.3, r * 0.17, 0.9 / s)
  traco(c, [[-h, -h], [h, h]], TINTA, lw + 1.2); traco(c, [[h, -h], [-h, h]], TINTA, lw + 1.2)
  traco(c, [[-h, -h], [h, h]], fio, lw); traco(c, [[h, -h], [-h, h]], fio, lw)
  c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.ellipse(-r * 0.44 * L, -r * 0.5, r * 0.22, r * 0.12, -0.7 * L, 0, TAU); c.fill()
  e = { cv, m }
  if (cacheOlho.size > 240) cacheOlho.clear()
  cacheOlho.set(chave, e)
  return e
}
function porOlho(c, o, x, y, rot, L, s) {
  const e = olhoBotao(o.r, o.cor ?? 'osso', L, s)
  c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.drawImage(e.cv, -e.m, -e.m, e.m * 2, e.m * 2); c.restore()
}
/** Olho em X costurado (caído). */
function olhoX(c, x, y, r, s) {
  const lw = Math.max(4.2, 1.9 / s)
  traco(c, [[x - r, y - r], [x + r, y + r]], TINTA, lw); traco(c, [[x + r, y - r], [x - r, y + r]], TINTA, lw)
  c.strokeStyle = 'rgba(242,230,201,0.75)'; c.lineWidth = Math.max(1.1, 0.7 / s); c.lineCap = 'round'
  for (const [dx, dy] of [[-0.55, -0.55], [0.55, 0.55], [0.55, -0.55], [-0.55, 0.55]]) { c.beginPath(); c.moveTo(x + dx * r - dy * 1.6, y + dy * r + dx * 1.6); c.lineTo(x + dx * r + dy * 1.6, y + dy * r - dx * 1.6); c.stroke() }
}
/** Sobrancelha de linha grossa. dir = +1 se o nariz está à direita do olho. raiva: 1 = bem bravo, 0 = neutro, < 0 = assustado. */
function sobrancelha(c, ex, ey, r, dir, raiva, s, esc = 1) {
  const lw = Math.max(6.2 * esc, 2.3 / s)
  const x0 = ex - dir * (r + 5), y0 = ey - r - 5.5 - Math.max(0, raiva) * 1.5 + Math.min(0, raiva) * -3
  const x1 = ex + dir * (r * 0.85 + 3), y1 = ey - r * 0.72 + raiva * r * 0.62 - 2.5
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 2.2
  c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.strokeStyle = TINTA; c.lineWidth = lw; c.stroke()
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * lw * 0.36, ny = (dx / l) * lw * 0.36
  c.strokeStyle = 'rgba(242,230,201,0.6)'; c.lineWidth = Math.max(1.1, 0.7 / s)
  c.beginPath(); for (const t of [0.25, 0.5, 0.75]) { const x = x0 + dx * t, y = y0 + dy * t - 1.1; c.moveTo(x - nx, y - ny); c.lineTo(x + nx, y + ny) } c.stroke()
}
/** Lábios: linha do meio e as duas bordas conforme abertura (abre), curva (+ sorriso, - bravo) e torto. */
function labios(m, e, N = 12) {
  const hl = m.l / 2, yF = -e.curva * m.l * 0.15, yC = e.curva * m.l * 0.09, H = m.l * (m.alt ?? 0.5)
  const up = [], lo = [], mid = []
  for (let i = 0; i <= N; i++) {
    const u = -1 + (2 * i) / N, x = u * hl
    const b = yF * u * u + yC * (1 - u * u) - e.torto * u * m.l * 0.08
    const ar = Math.pow(1 - u * u, 0.7) * e.abre * H
    mid.push([x, b]); up.push([x, b - ar * 0.4]); lo.push([x, b + ar * 0.6])
  }
  return { up, lo, mid }
}
const GOELA = '#2A0F1E'
function goela(c, up, lo, s, brilho = 0) {
  const p = caminho([...up, ...lo.slice().reverse()])
  c.fillStyle = GOELA; c.fill(p)
  if (brilho > 0) { c.save(); c.clip(p); c.fillStyle = `rgba(255,77,141,${0.3 * brilho})`; const a = lo[Math.floor(lo.length / 2)]; c.beginPath(); c.ellipse(a[0], a[1], 14, 6, 0, 0, TAU); c.fill(); c.restore() }
  return p
}
const BOCAS = {
  /** linha costurada com pontos atravessados; aberta, os pontos esticam como cordas */
  pontos(c, m, e, s) {
    const { up, lo, mid } = labios(m, e), n = Math.max(4, Math.round(m.l / 8.5)), ab = e.abre > 0.07
    if (ab) {
      const p = goela(c, up, lo, s, e.abre)
      c.strokeStyle = 'rgba(242,230,201,0.78)'; c.lineWidth = Math.max(1, 0.8 / s); c.lineCap = 'round'
      c.beginPath(); for (let i = 1; i < n; i++) { if (e.abre > 0.6 && i % 3 === 1) continue; const k = Math.round((i / n) * 12); c.moveTo(up[k][0], up[k][1]); c.lineTo(lo[k][0] + (i % 2 ? 1.6 : -1.6), lo[k][1]) } c.stroke()
      c.strokeStyle = TINTA; c.lineWidth = Math.max(2.3, 1.3 / s); c.lineJoin = 'round'; c.stroke(p)
    } else {
      traco(c, mid, TINTA, Math.max(3.3, 1.6 / s))
      c.beginPath(); for (let i = 0; i <= n; i++) { const q = mid[Math.round((i / n) * 12)]; c.moveTo(q[0] - 1.1, q[1] - 4.4); c.lineTo(q[0] + 1.1, q[1] + 4.4) } c.lineWidth = Math.max(2, 1.1 / s); c.stroke()
    }
    if (m.presa) { // dente de feltro torto
      const q = (ab ? lo : mid)[9]
      c.fillStyle = LINHO; c.strokeStyle = TINTA; c.lineWidth = Math.max(1.3, 0.9 / s); c.lineJoin = 'round'
      c.beginPath(); c.moveTo(q[0] - 4.4, q[1] + 0.8); c.lineTo(q[0] + 0.8, q[1] - 9.5); c.lineTo(q[0] + 4.4, q[1] + 0.8); c.closePath(); c.fill(); c.stroke()
    }
  },
  /** zíper de metal: fechado, os dentes se cruzam; aberto, viram duas fileiras e aparece a goela com o brilho da maldição */
  ziper(c, m, e, s, t) {
    const N = 24, { up, lo, mid } = labios(m, e, N), ab = e.abre > 0.05, fita = Math.max(8.5, 3.2 / s)
    if (ab) { traco(c, up, TINTA, fita * 0.75); traco(c, lo, TINTA, fita * 0.75); goela(c, up, lo, s, 1) } else traco(c, mid, TINTA, fita)
    c.fillStyle = ACO; c.strokeStyle = 'rgba(20,12,31,0.55)'; c.lineWidth = 0.5
    const d = Math.max(2.5, 1.2 / s)
    c.beginPath()
    for (let i = 1; i < N; i++) {
      if (!ab) { const q = mid[i]; c.rect(q[0] - d / 2, q[1] + (i % 2 ? -3.5 : 0.4), d, 3.1) } else {
        c.rect(up[i][0] - d / 2, up[i][1] - 0.6, d, 3.6); c.rect(lo[i][0] - d / 2 + 1.4, lo[i][1] - 3.1, d, 3.6)
      }
    }
    c.fill()
    const q = mid[N]
    c.save(); c.translate(q[0] - 1.5, q[1]); c.strokeStyle = TINTA; c.lineWidth = Math.max(1.3, 0.9 / s); c.lineJoin = 'round'
    c.fillStyle = ACO; c.beginPath(); c.roundRect(-5, -5.5, 10, 11, 2.4); c.fill(); c.stroke()
    c.rotate(0.18 + Math.sin(t / 520) * 0.14 + (e.balanco ?? 0))
    c.beginPath(); c.arc(0, 8, 2.8, 0, TAU); c.stroke()
    c.fillStyle = '#E3E8EE'; c.beginPath(); c.roundRect(-4.4, 10, 8.8, 18, 3.2); c.fill(); c.stroke()
    c.fillStyle = TINTA; circ(c, 0, 22.5, 1.7); c.fill()
    c.restore()
  },
  /** dentes de feltro cerrados em grade; abertos, viram duas fileiras */
  dentes(c, m, e, s) {
    const { mid } = labios(m, e, 12), h = 11 + e.abre * 21, tb = 5.6, ab = e.abre > 0.1
    const up = mid.map((q) => [q[0], q[1] - h / 2]), lo = mid.map((q) => [q[0], q[1] + h / 2])
    const p = caminho([...up, ...lo.slice().reverse()])
    c.fillStyle = ab ? GOELA : LINHO; c.fill(p)
    c.lineJoin = 'round'; c.lineCap = 'round'
    if (ab) { c.fillStyle = LINHO; c.fill(caminho([...up, ...up.map((q) => [q[0], q[1] + tb]).reverse()])); c.fill(caminho([...lo.map((q) => [q[0], q[1] - tb]), ...lo.slice().reverse()])) }
    c.strokeStyle = TINTA; c.lineWidth = Math.max(1.2, 0.8 / s)
    c.beginPath()
    for (let i = 1; i < 12; i++) {
      if (!ab) { c.moveTo(up[i][0], up[i][1]); c.lineTo(lo[i][0] + (i % 2 ? 0.8 : -0.8), lo[i][1]) } else {
        c.moveTo(up[i][0], up[i][1]); c.lineTo(up[i][0], up[i][1] + tb); c.moveTo(lo[i][0] + 2, lo[i][1] - tb); c.lineTo(lo[i][0] + 2, lo[i][1])
      }
    }
    c.stroke()
    if (!ab) traco(c, mid.map((q, i) => [q[0], q[1] + (i % 2 ? 0.7 : -0.7)]), TINTA, Math.max(1.5, 0.9 / s))
    c.strokeStyle = TINTA; c.lineWidth = Math.max(2.5, 1.4 / s); c.stroke(p)
  },
  /** queixo saltado com duas presas quadradas de feltro */
  presas(c, m, e, s) {
    const { up, lo, mid } = labios(m, e), ab = e.abre > 0.07
    if (ab) { const p = goela(c, up, lo, s, e.abre * 0.6); c.strokeStyle = TINTA; c.lineWidth = Math.max(2.4, 1.3 / s); c.lineJoin = 'round'; c.stroke(p) } else traco(c, mid, TINTA, Math.max(3.6, 1.7 / s))
    const b = ab ? lo : mid
    c.fillStyle = LINHO; c.strokeStyle = TINTA; c.lineWidth = Math.max(1.4, 0.9 / s); c.lineJoin = 'round'
    for (const [k, alt] of [[3, 11], [9, 9]]) { const q = b[k]; c.beginPath(); c.moveTo(q[0] - 5.2, q[1] + 1); c.lineTo(q[0] - 4.2, q[1] - alt); c.lineTo(q[0] + 3.6, q[1] - alt - 1); c.lineTo(q[0] + 5.2, q[1] + 1); c.closePath(); c.fill(); c.stroke() }
  },
  /** rasgo no pano, com a borda desfiada */
  rasgo(c, m, e, s) {
    const { up, lo } = labios(m, { ...e, abre: 0.2 + e.abre * 0.8 })
    for (let i = 1; i < 12; i++) { up[i][1] += i % 2 ? -2.4 : 1.3; lo[i][1] += i % 2 ? 2.6 : -1.1 }
    const p = goela(c, up, lo, s, e.abre)
    c.strokeStyle = TINTA; c.lineWidth = Math.max(2.1, 1.2 / s); c.lineJoin = 'round'; c.stroke(p)
    c.strokeStyle = LINHO; c.lineWidth = Math.max(1.1, 0.75 / s); c.lineCap = 'round'
    c.beginPath()
    for (const [k, dx] of [[3, -2], [8, 2.4]]) { c.moveTo(up[k][0], up[k][1] - 3); c.lineTo(lo[k][0] + dx, lo[k][1] + 3.4) }
    for (const [q, d] of [[up[0], -1], [up[12], 1]]) for (const a of [-0.5, 0.1, 0.7]) { c.moveTo(q[0], q[1]); c.lineTo(q[0] + d * 6 * Math.cos(a), q[1] + 6 * Math.sin(a)) }
    c.stroke()
  },
  /** boca oca de assombração: um "o" escuro que vira uivo */
  oco(c, m, e, s) {
    const rx = (m.l / 2) * (1 - 0.12 * e.abre) * (1 + 0.5 * Math.max(0, e.curva)), ry = 4.6 + e.abre * 14 - Math.max(0, e.curva) * 1.5
    c.beginPath()
    if (e.curva > 0.3) { c.moveTo(-rx, -2); c.quadraticCurveTo(0, ry * 2.2, rx, -3.5 - e.torto * 3); c.quadraticCurveTo(0, ry * 0.5, -rx, -2) } else c.ellipse(0, ry * 0.25, rx, ry, 0, 0, TAU)
    c.fillStyle = '#1F0A18'; c.fill(); c.strokeStyle = TINTA; c.lineWidth = Math.max(2.1, 1.2 / s); c.lineJoin = 'round'; c.stroke()
    c.strokeStyle = 'rgba(242,230,201,0.55)'; c.lineWidth = Math.max(1, 0.7 / s); c.lineCap = 'round'
    c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.3; c.moveTo(Math.cos(a) * (rx + 1.5), ry * 0.25 + Math.sin(a) * (ry + 1.5)); c.lineTo(Math.cos(a) * (rx + 4.5), ry * 0.25 + Math.sin(a) * (ry + 4.5)) } c.stroke()
  },
  /** boca fechada com X grossos; com força, os pontos esticam e uma linha escapa */
  costurada(c, m, e, s, t) {
    const { up, lo, mid } = labios(m, { ...e, abre: e.abre * 0.36 }), ab = e.abre > 0.1
    if (ab) { const p = goela(c, up, lo, s, e.abre); c.strokeStyle = TINTA; c.lineWidth = Math.max(2, 1.2 / s); c.lineJoin = 'round'; c.stroke(p) } else traco(c, mid, TINTA, Math.max(3, 1.5 / s))
    const lw = Math.max(2.7, 1.3 / s)
    c.beginPath()
    for (const k of [1, 3.5, 6, 8.5, 11]) {
      const i = Math.floor(k), f = k - i, q = [mix(mid[i][0], mid[Math.min(12, i + 1)][0], f), mix(mid[i][1], mid[Math.min(12, i + 1)][1], f)], h = 6.2 + e.abre * 3.4
      c.moveTo(q[0] - 4.3, q[1] - h); c.lineTo(q[0] + 4.3, q[1] + h); c.moveTo(q[0] + 4.3, q[1] - h); c.lineTo(q[0] - 4.3, q[1] + h)
    }
    c.strokeStyle = TINTA; c.lineWidth = lw; c.lineCap = 'round'; c.stroke()
    const q = mid[12], b = Math.sin(t / 640) * 2
    c.beginPath(); c.moveTo(q[0], q[1]); c.quadraticCurveTo(q[0] + 7 + b, q[1] + 8, q[0] + 3 + b * 1.6, q[1] + 17); c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, 0.9 / s); c.lineCap = 'round'; c.stroke()
  },
}

/** Fios soltos vivos, em lote (poucas chamadas de desenho): cada um balança com o tempo; arr empurra a ponta.
 *  lista: [x, y, ângulo, comprimento, cor, fase]. Um traço escuro para todos e depois um traço por cor. */
function fiosVivos(c, lista, t, arr, s, lw) {
  if (!lista.length) return
  const todos = new Path2D(), porCor = new Map()
  for (const [x, y, ang, comp, cor, fase] of lista) {
    const b = Math.sin(t / 900 + fase) * 0.24 + Math.sin(t / 370 + fase * 1.7) * 0.08
    const a1 = ang + b * 0.5, a2 = ang + b * 1.7
    const x1 = x + Math.cos(a1) * comp * 0.5, y1 = y + Math.sin(a1) * comp * 0.5
    const x2 = x1 + Math.cos(a2) * comp * 0.55 + arr, y2 = y1 + Math.sin(a2) * comp * 0.55 + Math.abs(arr) * 0.25
    let p = porCor.get(cor); if (!p) { p = new Path2D(); porCor.set(cor, p) }
    for (const q of [todos, p]) { q.moveTo(x, y); q.quadraticCurveTo(x1, y1, x2, y2) }
  }
  c.lineCap = 'round'; c.strokeStyle = TINTA; c.lineWidth = Math.max(lw + 1.7, 1.5 / s); c.stroke(todos)
  c.lineWidth = Math.max(lw, 0.85 / s)
  for (const [cor, p] of porCor) { c.strokeStyle = cor; c.stroke(p) }
}

// ------------------------------------------------------------------ cabeças (8). Pivô = pescoço (0,0); o centro da cabeça fica perto de (0,-55).
// rosto: G = olho grande, P = olho pequeno (o que salta), boca. `frente` é desenhada por cima do rosto. `fios` são cabelos vivos.

const CABECAS = {
  cab_botao: { // Botão Torto: um olho enorme que passa da borda, nó de saco no cocuruto, sorriso costurado com um dente
    rosto: { G: { x: -33, y: -63, r: 25, cor: 'osso' }, P: { x: 28, y: -58, r: 10, cor: 'carvao' }, boca: { x: 6, y: -24, l: 44, tipo: 'pontos', ang: -0.1, presa: 1 } },
    remendo: [30, -92, 0.3],
    base(c, o) {
      const no = curvaFechada([[-9, -104], [-17, -118], [-13, -130], [-2, -123], [8, -132], [14, -120], [8, -105]])
      pano(c, no, o.tipo, { semPesponto: true, contorno: 2.2 })
      pano(c, bolha(0, -56, 58, 54, o.R, { caroco: 0.045, queda: 4, n: 13 }), o.tipo)
      for (const [cor, lw] of [[TINTA, esp(3.4, 1.5)], [LINHO, esp(1.5, 0.8)]]) for (const dy of [0, 3.4]) arcoQ(c, [-12, -106.5 + dy], [0, -101.5 + dy], [11, -107.5 + dy], cor, lw)
      costura(c, suave([[7, -103], [11, -92], [6, -81], [10, -72]], false, 5), { larg: 1.7 })
      xis(c, 42, -36, 4.6, TINTA, 2.3, 0.2); xis(c, 47, -27, 3.4, TINTA, 2, -0.3)
    },
  },
  cab_brim: { // Testa de Brim: testa enorme e reforçada, que faz sombra nos olhos; queixo pequeno e dentes cerrados
    rosto: { G: { x: -26, y: -50, r: 14.5, cor: 'osso' }, P: { x: 25, y: -50, r: 9.5, cor: 'cereja' }, boca: { x: 0, y: -21, l: 46, tipo: 'dentes' }, sobrDy: -4 },
    remendo: [-30, -98, -0.2],
    base(c, o) {
      pano(c, curvaFechada([[0, -113], [34, -110], [58, -92], [61, -66], [50, -38], [31, -12], [0, -4], [-31, -12], [-50, -38], [-61, -66], [-58, -92], [-34, -110]]), o.tipo)
      // amassados de tanta testada
      c.strokeStyle = 'rgba(20,12,31,0.3)'; c.lineWidth = 1.3; c.lineCap = 'round'
      for (const [x, y, a] of [[12, -104, 0.4], [20, -101, 0.5], [-8, -106, -0.3]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); c.stroke() }
    },
    frente(c, o) { // a placa da testa: brim dobrado, rebitado, com a beira de baixo em V (cara de bravo)
      const f = curvaFechada([[-65, -87], [-44, -99], [0, -103], [44, -99], [65, -87], [67, -72], [42, -67], [0, -58], [-42, -67], [-67, -72]])
      pano(c, f, o.tipo, { tinta: 'rgba(20,16,60,0.26)', recuo: 3.6 })
      costura(c, suave([[-56, -84], [-30, -91], [0, -93], [30, -91], [56, -84]], false, 5), { larg: 1.5 })
      rebite(c, -56, -77, 3.6); rebite(c, 56, -77, 3.6)
      c.strokeStyle = 'rgba(225,238,255,0.4)'; c.lineWidth = 1.1; c.lineCap = 'round'
      for (const [x, y] of [[-8, -84], [-2, -80], [6, -85], [14, -79]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5, y - 3); c.stroke() }
    },
  },
  cab_ziper: { // Boca de Zíper: cabeça larga partida ao meio por um zíper de ponta a ponta, com o puxador pendurado
    rosto: { G: { x: -27, y: -82, r: 12.5, cor: 'osso' }, P: { x: 23, y: -81, r: 8, cor: 'osso' }, boca: { x: 0, y: -42, l: 112, tipo: 'ziper', alt: 0.36 } },
    remendo: [38, -90, 0.25],
    base(c, o) {
      const f = bolha(0, -56, 63, 54, o.R, { caroco: 0.04, quad: 2.4, n: 14 })
      pano(c, f, o.tipo)
      // costura alta no cocuruto (vergão) com pontos grossos atravessados
      const v = suave([[-32, -100], [-11, -107.5], [11, -107.5], [32, -100]], false, 6)
      traco(c, v, 'rgba(20,12,31,0.5)', esp(2.6, 1.2))
      for (let i = 2; i < v.length; i += 4) { const q = v[i], alto = 11 - Math.abs(q[0]) * 0.12; for (const [cor, lw] of [[TINTA, esp(3.6, 1.7)], [B.fio, esp(1.8, 0.95)]]) { c.beginPath(); c.moveTo(q[0] - 3.4, q[1] + 3); c.quadraticCurveTo(q[0] - 0.6, q[1] - alto * 2 + 3, q[0] + 3.4, q[1] + 3); c.strokeStyle = cor; c.lineWidth = lw; c.lineCap = 'round'; c.stroke() } }
      // papada: a parte de baixo é mais escura (mandíbula)
      dentro(c, f, () => { c.fillStyle = 'rgba(20,12,31,0.16)'; c.fillRect(-70, -39, 140, 44) })
    },
  },
  cab_desfiada: { // Cabeça Desfiada: saco rasgado em cima, enchimento escapando e fios que voam como cabelo
    rosto: { G: { x: -26, y: -60, r: 16, cor: 'osso' }, P: { x: 27, y: -49, r: 10, cor: 'perola' }, boca: { x: 2, y: -20, l: 40, tipo: 'rasgo', ang: 0.06 } },
    remendo: [-34, -30, 0.5],
    fios: [[-42, -96, -2.62, 30, 'claro'], [-33, -101, -2.3, 28, 'linho'], [-22, -100, -1.98, 18, 'base'], [-10, -105, -1.72, 17, 'claro'], [1, -102, -1.52, 15, 'linho'], [12, -105, -1.34, 17, 'base'], [23, -100, -1.08, 19, 'claro'], [33, -102, -0.78, 28, 'linho'], [42, -96, -0.5, 29, 'base']],
    base(c, o) {
      const R = o.R
      for (const [x, y, r] of [[-22, -99, 12], [4, -105, 14], [27, -99, 11]]) tufo(c, x, y, r, R)
      const lados = suave([[-50, -91], [-57, -70], [-55, -40], [-41, -14], [-14, -3], [14, -3], [41, -14], [55, -40], [57, -70], [50, -91]], false, 8)
      const topo = []; const n = 9
      for (let i = 1; i < n; i++) topo.push([50 - (100 * i) / n, -92 - (i % 2 ? 12 + R() * 6 : -1) - Math.sin((i / n) * Math.PI) * 7])
      pano(c, forma([...lados, ...topo]), o.tipo, { semPesponto: true })
      costura(c, suave([[-44, -84], [-51, -68], [-49, -41], [-36, -18], [-12, -8], [12, -8], [36, -18], [49, -41], [51, -68], [44, -84]], false, 6))
      // fiapos curtos na beira rasgada
      const T = TEC[o.tipo]
      for (let i = 0; i < 8; i++) { const x = -42 + i * 12 + R() * 4; fioAssado(c, [[x, -96], [x + (R() - 0.5) * 6, -104], [x + (R() - 0.5) * 12, -110 - R() * 6]], i % 2 ? T.claro : LINHO, 1.2) }
      // linha frouxa do olho caído
      arcoQ(c, [27, -64], [33, -60], [29, -56], TINTA, esp(1.5, 0.9))
    },
  },
  cab_gorro: { // Cabeça de Gorro: gorro de lã enterrado até os olhos, pompom torto e dois cordões
    rosto: { G: { x: -25, y: -51, r: 13.5, cor: 'osso' }, P: { x: 24, y: -50, r: 8.5, cor: 'madeira' }, boca: { x: 1, y: -20, l: 32, tipo: 'pontos', ang: 0.05 }, sobrDy: 1.5 },
    remendo: [34, -28, -0.3],
    base(c, o) {
      const R = o.R
      // cordões com pompom na ponta, atrás da cabeça
      for (const [L, y1] of [[-1, -22], [1, -30]]) {
        fioAssado(c, [[L * 55, -73], [L * 62, -54], [L * 60, y1]], TEC.la.escuro, 2.4)
        const p = bolha(L * 60, y1 + 5, 7, 7, R, { caroco: 0.22, n: 14 }); pano(c, p, o.tipo, { semPesponto: true, contorno: 1.8, tinta: 'rgba(90,60,20,0.3)' })
      }
      pano(c, bolha(0, -52, 55, 50, R, { caroco: 0.045, queda: 3 }), o.tipo)
    },
    frente(c, o) {
      const R = o.R
      const pom = bolha(11, -114, 13, 12, R, { caroco: 0.24, n: 18, passos: 4 })
      pano(c, pom, o.tipo, { semPesponto: true, contorno: 2.2, tinta: 'rgba(255,250,235,0.2)' })
      dentro(c, pom, () => { c.strokeStyle = 'rgba(105,84,44,0.5)'; c.lineWidth = 1; for (let a = 0; a < TAU; a += 0.42) { c.beginPath(); c.moveTo(11 + Math.cos(a) * 4, -114 + Math.sin(a) * 4); c.lineTo(11 + Math.cos(a) * 14, -114 + Math.sin(a) * 14); c.stroke() } })
      const dome = curvaFechada([[-56, -68], [-55, -89], [-36, -104], [0, -109], [36, -104], [55, -89], [56, -68], [0, -64]])
      pano(c, dome, o.tipo, { tinta: 'rgba(110,70,30,0.34)', semPesponto: true })
      dentro(c, dome, () => { c.strokeStyle = 'rgba(60,36,12,0.34)'; c.lineWidth = 1.6; for (let i = -4; i <= 4; i++) arcoQ(c, [i * 14, -64], [i * 12, -92], [i * 5 + 4, -111], 'rgba(60,36,12,0.34)', 1.6) })
      // aba dobrada, caída sobre as sobrancelhas (um lado mais baixo)
      const aba = curvaFechada([[-60, -83], [-30, -89], [0, -90], [30, -89], [60, -83], [62, -67], [34, -65], [0, -63], [-34, -65], [-62, -64]])
      pano(c, aba, o.tipo, { tinta: 'rgba(110,70,30,0.2)', recuo: 3.4 })
      dentro(c, aba, () => { for (let x = -58; x < 62; x += 6.5) traco(c, [[x, -93], [x + 1.5, -61]], 'rgba(60,36,12,0.3)', 1.5) })
    },
  },
  cab_feltro: { // Cascudo: cara de buldogue de feltro grosso — aba dobrada sobre a testa, papadas caídas dos dois lados, pálpebra pesada e queixo saltado com duas presas
    rosto: { G: { x: -24, y: -69, r: 13, cor: 'osso' }, P: { x: 24, y: -68, r: 9.5, cor: 'carvao' }, boca: { x: 0, y: -27, l: 42, tipo: 'presas', ang: 0 }, palpebra: 0.42 },
    remendo: [40, -52, 0.2],
    base(c, o) {
      const f = curvaFechada([[0, -106], [34, -104], [56, -90], [59, -64], [63, -36], [59, -12], [45, 1], [31, -5], [22, -19], [0, -13], [-22, -19], [-31, -5], [-45, 1], [-59, -12], [-63, -36], [-59, -64], [-56, -90], [-34, -104]], 7)
      pano(c, f, o.tipo)
      for (const L of [-1, 1]) { arcoQ(c, [L * 31, -46], [L * 47, -38], [L * 51, -17], 'rgba(14,44,28,0.5)', esp(1.8, 1)); arcoQ(c, [L * 25, -25], [L * 30, -14], [L * 38, -8], 'rgba(14,44,28,0.4)', esp(1.5, 0.9)) }
      pano(c, curvaFechada([[-24, -37], [-27, -22], [-16, -9], [0, -6], [16, -9], [27, -22], [24, -37], [0, -33]]), o.tipo, { tinta: 'rgba(14,44,28,0.26)', recuo: 3.2 })
    },
    frente(c, o) { // a aba de feltro grosso dobrada sobre a testa, presa por um alamar de madeira
      const t = curvaFechada([[-64, -96], [-58, -106], [-30, -110.5], [0, -111.5], [30, -110.5], [58, -106], [64, -96], [71, -88], [60, -86], [30, -92], [0, -89], [-30, -92], [-60, -86], [-71, -88]], 6)
      pano(c, t, o.tipo, { tinta: 'rgba(14,44,28,0.34)', semPesponto: true })
      for (let x = -52; x <= 52; x += 8.6) traco(c, [[x, -99.5], [x + 0.6, -91 - Math.abs(x) * 0.02]], B.fio, esp(1.7, 1))
      c.save(); c.translate(3, -101.5); c.rotate(-0.12)
      const al = curvaFechada([[-11, 0], [-7, -4], [7, -4], [11, 0], [7, 4], [-7, 4]], 5); pano(c, al, MADEIRA, { semPesponto: true, contorno: 1.8 })
      c.fillStyle = TINTA; circ(c, -3, 0, 1.2); c.fill(); circ(c, 3, 0, 1.2); c.fill(); traco(c, [[-3, 0], [3, 0]], LINHO, esp(1.2, 0.8))
      c.restore()
    },
  },
  cab_veu: { // Rosto de Véu: cabeça pálida debaixo de um véu de tule que cai até os ombros; os olhos acendem atrás da rede
    rosto: { G: { x: -22, y: -58, r: 14, cor: 'perola', brilha: 1 }, P: { x: 22, y: -56, r: 9.5, cor: 'perola', brilha: 1 }, boca: { x: 1, y: -21, l: 19, tipo: 'oco' }, sobreTudo: 1, sobrEsc: 0.8 },
    remendo: [-36, -24, -0.4],
    base(c, o) {
      const R = o.R
      const veu = curvaFechada([[0, -111], [40, -104], [62, -79], [69, -42], [76, -2], [62, -6], [47, 2], [31, -6], [15, 1], [0, -7], [-15, 1], [-31, -6], [-47, 2], [-62, -6], [-76, -2], [-69, -42], [-62, -79], [-40, -104]], 7)
      pano(c, veu, 'tule', { tinta: 'rgba(60,40,110,0.42)', semPesponto: true, contorno: 2.2 })
      dentro(c, veu, () => { for (const x of [-52, -34, 34, 52]) arcoQ(c, [x * 0.7, -90], [x, -40], [x * 1.12, 2], 'rgba(20,12,31,0.22)', 1.6) })
      pano(c, bolha(0, -55, 50, 47, R, { caroco: 0.04, queda: 3 }), o.tipo, { tinta: 'rgba(239,228,203,0.28)' })
    },
    frente(c, o) {
      const f = curvaFechada([[0, -108], [38, -101], [57, -79], [63, -52], [61, -37], [50, -31], [38, -38], [25, -31], [12, -38], [0, -31], [-12, -38], [-25, -31], [-38, -38], [-50, -31], [-61, -37], [-63, -52], [-57, -80], [-38, -103]], 7)
      pano(c, f, 'tule', { alfa: 0.44, semPesponto: true, contorno: 0, volume: 0.6 })
      c.lineJoin = 'round'; c.strokeStyle = 'rgba(20,12,31,0.6)'; c.lineWidth = esp(1.5, 1); c.stroke(f.p)
      costura(c, suave([[-57, -42], [-50, -35.5], [-38, -42.5], [-25, -35.5], [-12, -42.5], [0, -35.5], [12, -42.5], [25, -35.5], [38, -42.5], [50, -35.5], [57, -42]], false, 4), { larg: 1.3 })
      // alfinete de pérola prendendo o véu no cocuruto
      haste(c, [-12, -110], [6, -98], 1.6); c.fillStyle = '#F6F2FF'; circ(c, -13, -111, 4.2); c.fill(); c.strokeStyle = TINTA; c.lineWidth = esp(1.3, 0.9); c.stroke()
      c.fillStyle = 'rgba(255,255,255,0.9)'; circ(c, -14.2, -112.4, 1.2); c.fill()
    },
  },
  cab_abafada: { // Boca Costurada: bochechas estufadas segurando o grito, boca fechada com X grossos e dois tufos de tule armado, um maior que o outro
    rosto: { G: { x: -25, y: -64, r: 16, cor: 'osso' }, P: { x: 24, y: -62, r: 10.5, cor: 'cereja' }, boca: { x: 0, y: -27, l: 54, tipo: 'costurada' } },
    remendo: [-2, -92, 0.15],
    base(c, o) {
      const R = o.R
      const tufoDeTule = (x, y, r, n) => {
        const pts = []; for (let i = 0; i < 72; i++) { const a = (i / 72) * TAU, k = r * (0.82 + 0.2 * Math.abs(Math.sin(a * n / 2))); pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k]) }
        const f = forma(pts); pano(c, f, o.tipo, { semPesponto: true, contorno: 2.2, tinta: 'rgba(60,40,110,0.34)' })
        dentro(c, f, () => { for (let i = 0; i < n; i++) { const a = (i / n) * TAU + 0.3; traco(c, [[x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25], [x + Math.cos(a) * r, y + Math.sin(a) * r]], 'rgba(20,12,31,0.3)', 1.3) } })
        pano(c, bolha(x, y, r * 0.3, r * 0.3, R, { caroco: 0.1, n: 8 }), o.tipo, { semPesponto: true, contorno: 1.8, tinta: 'rgba(255,255,255,0.2)' })
      }
      tufoDeTule(-45, -90, 19, 9); tufoDeTule(43, -95, 15, 8)
      pano(c, bolha(0, -52, 51, 49, R, { caroco: 0.04, pera: 0.2, queda: 2 }), o.tipo)
      for (const [x, y] of [[-33, -86], [31, -88]]) { arcoQ(c, [x - 5, y - 5], [x, y + 2], [x + 6, y - 4], TINTA, esp(3, 1.4)); arcoQ(c, [x - 5, y - 5], [x, y + 2], [x + 6, y - 4], LINHO, esp(1.4, 0.8)) }
      for (const L of [-1, 1]) arcoQ(c, [L * 40, -40], [L * 50, -28], [L * 38, -16], 'rgba(20,12,31,0.28)', 1.6)
    },
  },
}

/** Desenha o rosto vivo no espaço da cabeça (pivô no pescoço). Q = pose; cab = definição; fr = camada "frente" (ou null). */
function desenharRosto(c, cab, Q, t, s, L, fr, tipoCab) {
  const ro = cab.rosto
  if (!ro) { if (fr) fr(); return }
  const { G, P } = ro, meio = (G.x + P.x) / 2
  const frente = () => { if (fr) fr() }
  // olhos
  if (Q.xis > 0.5) { olhoX(c, G.x, G.y, G.r * 0.62, s); olhoX(c, P.x, P.y, P.r * 0.95, s) } else {
    for (const o of [G, P]) if (o.brilha) { c.fillStyle = 'rgba(232,224,255,0.1)'; circ(c, o.x, o.y, o.r * 2.3); c.fill(); c.fillStyle = 'rgba(236,228,255,0.12)'; circ(c, o.x, o.y, o.r * 1.8); c.fill(); c.fillStyle = 'rgba(240,234,255,0.16)'; circ(c, o.x, o.y, o.r * 1.4); c.fill() }
    porOlho(c, G, G.x, G.y, 0.25, L, s)
    if (Q.solto > 0.02) {
      c.fillStyle = '#1F0A18'; circ(c, P.x, P.y, P.r * 0.74); c.fill(); c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, 1 / s); c.stroke()
      const comp = Q.solto * (P.r * 2.2 + 7), ang = Q.soltoAng
      const bx = P.x + Math.sin(ang) * comp + Q.soltoTreme, by = P.y + Math.cos(ang) * comp - Q.soltoSalto * 13
      c.beginPath(); c.moveTo(P.x, P.y); c.quadraticCurveTo(P.x + (bx - P.x) * 0.2 - 3, P.y + (by - P.y) * 0.6, bx, by - P.r * 0.5)
      c.strokeStyle = TINTA; c.lineWidth = Math.max(2.6, 1.5 / s); c.lineCap = 'round'; c.stroke(); c.strokeStyle = CARMIM; c.lineWidth = Math.max(1.2, 0.8 / s); c.stroke()
      porOlho(c, P, bx, by, 0.6 + ang * 1.5, L, s)
    } else porOlho(c, P, P.x, P.y, -0.5, L, s)
    if (ro.palpebra) { // pálpebra pesada (feltro escuro)
      c.fillStyle = misturaCor(TEC[tipoCab]?.escuro ?? '#3A6A4D', TINTA, 0.25); c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, 1 / s); c.lineJoin = 'round'
      for (const o of [G, P]) {
        if (o === P && Q.solto > 0.02) continue
        const r = o.r + 2, dy = -r + 2 * r * (ro.palpebra + Math.max(0, Q.sobr - 0.75) * 0.3), a = Math.asin(limita(dy / r, -1, 1))
        c.save(); c.translate(o.x, o.y); c.rotate((o.x < meio ? 1 : -1) * 0.22); c.beginPath(); c.arc(0, 0, r, Math.PI - a, TAU + a); c.closePath(); c.fill(); c.stroke(); c.restore()
      }
    }
  }
  if (!ro.sobreTudo) frente()
  // sobrancelhas (caído não tem)
  if (Q.xis < 0.5 && ro.sobr !== false) {
    const dy = ro.sobrDy ?? 0, k = ro.sobrEsc ?? 1
    sobrancelha(c, G.x, G.y + dy, G.r, G.x < meio ? 1 : -1, Q.sobr, s, k)
    if (!(Q.solto > 0.02)) sobrancelha(c, P.x, P.y + dy, P.r, P.x < meio ? 1 : -1, Q.sobr * 0.9 + 0.1 + Q.sobrP, s, k * 0.9)
    else sobrancelha(c, P.x, P.y + dy - 2, P.r, P.x < meio ? 1 : -1, -0.5, s, k * 0.9)
  }
  // boca
  const m = ro.boca
  c.save(); c.translate(m.x, m.y); c.rotate((m.ang ?? 0) + Q.bocaGiro)
  BOCAS[m.tipo](c, m, Q, s, t)
  c.restore()
  if (ro.sobreTudo) frente()
}
/** O rosto está na expressão padrão do "parado"? (então dá para usar o bitmap guardado) */
const rostoPadrao = (Q) => Q.sobr === 0.8 && Q.abre === 0 && Q.curva === -0.55 && Q.torto === 0.25 && Q.solto === 0 && Q.xis === 0 && Q.sobrP === 0 && Q.bocaGiro === 0
/** O brilho que passa num botão de vez em quando (a cada 4–7 s, conforme a semente do boneco). */
function brilhoDoBotao(c, ro, Q, t, semente) {
  if (!(t > 0)) return
  const per = 4000 + (semente % 3000), f = (t % per) / 480
  if (f >= 1) return
  const o = Math.floor(t / per) % 2 || Q.solto > 0.02 ? ro.G : ro.P, x = o.x + (f * 2.6 - 1.3) * o.r
  c.save(); circ(c, o.x, o.y, o.r); c.clip(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,250,225,${0.6 * Math.sin(f * Math.PI)})`
  c.beginPath(); c.moveTo(x - o.r * 0.3, o.y - o.r - 1); c.lineTo(x + o.r * 0.25, o.y - o.r - 1); c.lineTo(x - o.r * 0.15, o.y + o.r + 1); c.lineTo(x - o.r * 0.7, o.y + o.r + 1); c.closePath(); c.fill(); c.restore()
}

// ------------------------------------------------------------------ troncos (12). Pivô = meio da base (0,0); topo perto de y = -74.

/** Almofada do tronco: cai um pouco embaixo, um ombro mais baixo, sempre torta. */
function corpo(R, p = {}) {
  const { lt = 30, lm = 37, lb = 42, h = 74, d = 0 } = p, j = () => (R() - 0.5) * 3.4
  return curvaFechada([
    [-lt * 0.4 + d, -h + j()], [lt * 0.42 + d, -h - 1.5 + j()], [lt + d * 0.8, -h + 10 + j()], [lm + d * 0.4, -h * 0.56 + j()],
    [lb + 1, -19 + j()], [lb * 0.86, -3 + j()], [lb * 0.4, 5 + j()], [-lb * 0.3, 6.5 + j()], [-lb * 0.84, -1 + j()], [-lb - 2, -17 + j()], [-lm + d * 0.4, -h * 0.55 + j()], [-lt + d * 0.8, -h + 13 + j()],
  ])
}
/** A costura do peito, de onde escapa o fio da maldição. */
function peito(c, x = -15, y = -61) {
  const g = c.createRadialGradient(x, y, 0.5, x, y, 12); g.addColorStop(0, 'rgba(255,77,141,0.62)'); g.addColorStop(1, 'rgba(255,77,141,0)')
  c.fillStyle = g; circ(c, x, y, 12); c.fill()
  const p = [[x - 1.6, y - 7.5], [x + 0.9, y - 2.5], [x - 0.7, y + 3], [x + 1.7, y + 9]]
  traco(c, p, TINTA, esp(3.4, 1.6)); traco(c, p, 'rgba(255,120,170,0.9)', esp(1.1, 0.7))
  for (const yy of [y - 5, y + 0.5, y + 6]) traco(c, [[x - 4.8, yy - 1.3], [x + 5, yy + 1.3]], LINHO, esp(1.5, 0.95))
}
const TRONCOS = {
  tr_jeans_rebitado: { // jardineira pesada: alças, peitilho e cós rebitados
    base(c, o) {
      const f = corpo(o.R, { lt: 34, lm: 40, lb: 44, h: 76 }); pano(c, f, o.tipo)
      dentro(c, f, () => {
        for (const L of [-1, 1]) pano(c, curvaFechada([[L * 31, -82], [L * 19, -82], [L * 15, -47], [L * 26, -47]], 4), o.tipo, { tinta: 'rgba(16,22,60,0.28)', recuo: 2.4, contorno: 1.5 })
        c.fillStyle = 'rgba(16,22,60,0.24)'; c.fillRect(-50, -11, 100, 20)
        costura(c, suave([[-40, -11], [0, -8], [40, -11]], false, 6)); costura(c, suave([[-40, -7.5], [0, -4.5], [40, -7.5]], false, 6))
        for (const x of [-24, 0, 24]) { c.fillStyle = 'rgba(16,22,60,0.3)'; c.fillRect(x - 2.2, -13, 4.4, 9) }
      })
      for (const L of [-1, 1]) rebite(c, L * 20.5, -50, 3.2)
      rebite(c, -33, -6, 2.4); rebite(c, 33, -6, 2.4)
      c.lineJoin = 'round'; c.lineWidth = esp(2.5, 1.5); c.strokeStyle = TINTA; c.stroke(f.p)
      peito(c)
    },
  },
  tr_jeans_surrado: { // magro e gasto: joelheira puída, barra desfiada
    barra: { l: 30, y: 2 },
    base(c, o) {
      const R = o.R
      for (let i = 0; i < 10; i++) { const x = -30 + i * 6.6 + R() * 2; fioAssado(c, [[x, -1], [x + (R() - 0.5) * 4, 6], [x + (R() - 0.5) * 7, 10 + R() * 5]], i % 3 ? TEC.jeans.claro : LINHO, 1.2) }
      const f = corpo(R, { lt: 28, lm: 33, lb: 37, h: 72 }); pano(c, f, o.tipo, { dentro: (c) => { c.fillStyle = 'rgba(225,238,255,0.2)'; c.beginPath(); c.ellipse(4, -34, 22, 28, 0.2, 0, TAU); c.fill() } })
      dentro(c, f, () => {
        for (const [x, y, a] of [[22, -52, 0.3], [-22, -16, -0.2]]) {
          c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = 'rgba(239,228,203,0.85)'; c.beginPath(); c.ellipse(0, 0, 9, 5.5, 0, 0, TAU); c.fill()
          c.strokeStyle = 'rgba(39,71,122,0.75)'; c.lineWidth = 0.9; for (let k = -4; k <= 4; k += 1.9) { c.beginPath(); c.moveTo(-8, k); c.lineTo(8, k + 0.6); c.stroke() }
          c.strokeStyle = TINTA; c.lineWidth = esp(1.1, 0.8); c.beginPath(); c.ellipse(0, 0, 9, 5.5, 0, 0, TAU); c.stroke(); c.restore()
        }
      })
      peito(c)
    },
  },
  tr_seda_bordada: { // vestidinho de seda: barra larga com renda e ramos bordados
    barra: { l: 38, y: 3 },
    base(c, o) {
      for (let i = 0; i < 9; i++) { const x = -36 + i * 9; c.fillStyle = LINHO; circ(c, x, 3.5 - Math.abs(i - 4) * 0.9, 5.2); c.fill(); c.strokeStyle = TINTA; c.lineWidth = esp(1.4, 1); c.stroke(); c.fillStyle = TINTA; circ(c, x, 5 - Math.abs(i - 4) * 0.9, 1); c.fill() }
      const f = corpo(o.R, { lt: 27, lm: 34, lb: 45, h: 74 }); pano(c, f, o.tipo)
      dentro(c, f, () => {
        c.fillStyle = 'rgba(90,10,70,0.3)'; c.beginPath(); c.moveTo(-60, -12); c.quadraticCurveTo(0, -6, 60, -12); c.lineTo(60, 12); c.lineTo(-60, 12); c.closePath(); c.fill()
        c.strokeStyle = LINHO; c.lineWidth = esp(1.2, 0.8); c.lineCap = 'round'
        for (let i = 0; i < 6; i++) { const x = -34 + i * 13.5, y = -15 + Math.abs(i - 2.5) * 0.4; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 3, y - 9, x + 10, y - 8, x + 9, y - 2); c.stroke(); c.fillStyle = LINHO; circ(c, x + 9, y - 2, 1.5); c.fill() }
        costura(c, suave([[-44, -12], [0, -6.5], [44, -12]], false, 6))
      })
      peito(c)
    },
  },
  tr_seda_rota: { // seda em farrapos: barra em tiras, rasgo com enchimento escapando
    barra: { l: 28, y: -3 },
    base(c, o) {
      const R = o.R
      const lados = suave([[-30, -62], [-10, -73], [12, -74], [32, -64], [36, -40], [36, -8]], false, 8), baixo = []
      for (let i = 0; i <= 8; i++) baixo.push([36 - i * 9, i % 2 ? -3 - R() * 3 : 7 + R() * 5])
      const f = forma([...lados, ...baixo, ...suave([[-37, -8], [-35, -40], [-30, -62]], false, 8).slice(0, -1)])
      pano(c, f, o.tipo, { semPesponto: true })
      costura(c, suave([[-25, -58], [-9, -68], [11, -69], [27, -60], [31, -40], [31, -12]], false, 6)); costura(c, suave([[-32, -12], [-30, -40], [-26, -57]], false, 6))
      tufo(c, 25, -16, 6, R)
      c.fillStyle = GOELA; c.beginPath(); c.moveTo(13, -27); c.lineTo(20, -22); c.lineTo(18, -17); c.lineTo(27, -10); c.lineTo(31, -3); c.lineTo(23, -8); c.lineTo(19, -13); c.lineTo(14, -18); c.closePath(); c.fill(); c.strokeStyle = TINTA; c.lineWidth = esp(1.3, 0.9); c.lineJoin = 'round'; c.stroke()
      tufo(c, 21, -15, 3.6, R)
      for (const [x, y] of [[15, -22], [22, -12]]) traco(c, [[x - 4, y + 2.5], [x + 4, y - 2.5]], LINHO, esp(1.3, 0.9))
      peito(c)
    },
  },
  tr_la_embolada: { // bola gorda de lã cheia de bolinhas
    barra: { l: 38, y: 3 },
    base(c, o) {
      const R = o.R, f = corpo(R, { lt: 36, lm: 47, lb: 49, h: 75 }); pano(c, f, o.tipo)
      const rec = recuar(f.pts, 1)
      for (let i = 0; i < f.pts.length; i += 3) { const a = f.pts[i], ox = a[0] - rec[i][0], oy = a[1] - rec[i][1]; traco(c, [[a[0] - ox, a[1] - oy], [a[0] + ox * 2.8, a[1] + oy * 2.8]], TEC.la.claro, 1.2) }
      dentro(c, f, () => {
        for (let i = 0; i < 15; i++) { const x = -36 + R() * 72, y = -66 + R() * 62, r = 2 + R() * 2; if (Math.hypot(x - 3, y + 31) < 21) continue; c.fillStyle = TEC.la.claro; circ(c, x, y, r); c.fill(); c.strokeStyle = 'rgba(105,84,44,0.7)'; c.lineWidth = 0.9; c.stroke(); c.fillStyle = 'rgba(20,12,31,0.2)'; circ(c, x + 0.9 * B.L, y + 1.1, r * 0.6); c.fill() }
      })
      peito(c)
    },
  },
  tr_la_tricotada: { // suéter: gola rolê, barra canelada, duas tranças
    base(c, o) {
      const f = corpo(o.R, { lt: 30, lm: 37, lb: 41, h: 74 }); pano(c, f, o.tipo)
      dentro(c, f, () => {
        c.fillStyle = 'rgba(105,84,44,0.2)'; c.fillRect(-50, -12, 100, 22)
        for (let x = -42; x < 44; x += 5) traco(c, [[x, -12], [x + 0.6, 8]], 'rgba(60,36,12,0.36)', 1.4)
        traco(c, [[-44, -12], [44, -12]], 'rgba(60,36,12,0.4)', 1.5)
        for (const L of [-1, 1]) for (let y = -62; y < -16; y += 9) {
          c.strokeStyle = 'rgba(60,36,12,0.48)'; c.lineWidth = 1.8; c.lineCap = 'round'
          c.beginPath(); c.moveTo(L * 26 - 4, y); c.bezierCurveTo(L * 26 - 4, y + 5, L * 26 + 4, y + 4, L * 26 + 4, y + 9); c.moveTo(L * 26 + 4, y); c.bezierCurveTo(L * 26 + 4, y + 5, L * 26 - 4, y + 4, L * 26 - 4, y + 9); c.stroke()
        }
      })
      const g = tubo([[-20, -70], [0, -74], [20, -71]], [13, 13]); pano(c, g, o.tipo, { tinta: 'rgba(105,84,44,0.16)', recuo: 3 })
      dentro(c, g, () => { for (let x = -24; x < 26; x += 4.6) traco(c, [[x, -82], [x + 0.5, -62]], 'rgba(60,36,12,0.34)', 1.3) })
      peito(c, -15, -57)
    },
  },
  tr_feltro_duro: { // caixote de feltro: reto, cantos duros, ponto caseado na beira e tachas nos cantos
    barra: { l: 32, y: 0 },
    base(c, o) {
      const f = curvaFechada([[-37, -71], [-37, -71], [0, -75], [37, -73], [37, -73], [40, -38], [37, 0], [37, 0], [0, 3], [-37, 1], [-37, 1], [-41, -38]], 6)
      pano(c, f, o.tipo, { semPesponto: true })
      const n = f.pts.length, rec = recuar(f.pts, 1)
      for (let i = 0; i < n; i += 3) { const a = f.pts[i]; traco(c, [[a[0], a[1]], [a[0] + (rec[i][0] - a[0]) * 5.5, a[1] + (rec[i][1] - a[1]) * 5.5]], B.fio, esp(1.6, 1)) }
      B.costuras.push({ p: caminho(recuar(f.pts, 2.5)), lw: esp(2.4, 1.2), k: 1, m: c.getTransform() })
      for (const [x, y] of [[-29, -62], [29, -64], [-29, -8], [29, -8]]) { c.fillStyle = misturaCor(TEC.feltro.escuro, TINTA, 0.35); c.fillRect(x - 3.6, y - 3.6, 7.2, 7.2); c.strokeStyle = TINTA; c.lineWidth = esp(1.2, 0.9); c.strokeRect(x - 3.6, y - 3.6, 7.2, 7.2); xis(c, x, y, 1.7, LINHO, 1.1) }
      c.lineJoin = 'round'; c.lineWidth = esp(2.5, 1.5); c.strokeStyle = TINTA; c.stroke(f.p)
      peito(c)
    },
  },
  tr_feltro_manchado: { // feijão torto, com manchas de chá e um respingo
    base(c, o) {
      const R = o.R, f = corpo(R, { lt: 29, lm: 38, lb: 42, h: 72, d: -4 })
      pano(c, f, o.tipo, { dentro: (c) => {
        for (const [x, y, rx, ry] of [[-22, -18, 13, 9], [25, -50, 9, 12], [18, -8, 8, 5], [-28, -52, 5, 4]]) { const m = bolha(x, y, rx, ry, R, { caroco: 0.2, n: 9 }); c.fillStyle = 'rgba(46,28,8,0.3)'; c.fill(m.p); c.strokeStyle = 'rgba(46,28,8,0.34)'; c.lineWidth = 1.2; c.stroke(m.p) }
        c.strokeStyle = 'rgba(46,28,8,0.3)'; c.lineWidth = 2; c.beginPath(); c.ellipse(-8, -56, 9, 7, 0.3, 0.4, 5.6); c.stroke()
        traco(c, [[25, -38], [26, -27], [24.5, -22]], 'rgba(46,28,8,0.3)', 2.4)
      } })
      peito(c, -17, -60)
    },
  },
  tr_tule_rasgado: { // fiapo de tronco com saiote de tiras de tule e um rasgo
    barra: { l: 26, y: 2 },
    base(c, o) {
      const R = o.R
      for (let i = 0; i < 7; i++) { const a = -1.15 + i * 0.38 + (R() - 0.5) * 0.1, x0 = Math.sin(a) * 24, x1 = Math.sin(a) * (40 + R() * 10), y1 = 4 + Math.cos(a) * 6 + R() * 5
        pano(c, curvaFechada([[x0 - 6, -24], [x0 + 6, -24], [x1 + 4, y1 - 8], [x1, y1 + 2], [x1 - 5, y1 - 7]], 4), 'tule', { semPesponto: true, contorno: 1.8, alfa: 0.9, tinta: i % 2 ? 'rgba(60,40,110,0.3)' : 'rgba(255,255,255,0.12)' }) }
      const f = corpo(R, { lt: 25, lm: 30, lb: 34, h: 72 }); pano(c, f, o.tipo)
      c.fillStyle = GOELA; c.beginPath(); c.moveTo(12, -66); c.lineTo(19, -52); c.lineTo(14, -50); c.lineTo(22, -34); c.lineTo(17, -33); c.lineTo(11, -48); c.lineTo(16, -52); c.closePath(); c.fill(); c.strokeStyle = TINTA; c.lineWidth = esp(1.3, 0.9); c.lineJoin = 'round'; c.stroke()
      for (const [x, y] of [[15, -58], [17, -42]]) traco(c, [[x - 4.5, y + 1.5], [x + 4.5, y - 1.5]], LINHO, esp(1.3, 0.9))
      traco(c, [[-31, -22], [0, -19], [31, -22]], 'rgba(60,40,110,0.5)', 2)
      peito(c)
    },
  },
  tr_tule_armado: { // sino de crinolina: cintura fina de espartilho e saia armada em arcos, com a barra em bicos
    barra: { l: 44, y: 2 },
    base(c, o) {
      const f = curvaFechada([[-10, -74], [10, -75], [26, -66], [29, -48], [40, -26], [52, -6], [45, 5], [27, 1], [9, 7], [-9, 1], [-27, 7], [-45, 2], [-53, -7], [-40, -27], [-30, -48], [-27, -64]], 7)
      pano(c, f, o.tipo)
      dentro(c, f, () => {
        for (const [y, w] of [[-30, 44], [-17, 52], [-4, 58]]) arcoQ(c, [-w, y - 3], [0, y + 6], [w, y - 3], 'rgba(60,40,110,0.55)', 2.4)
        for (const x of [-30, -15, 0, 15, 30]) arcoQ(c, [x * 0.55, -44], [x * 0.9, -20], [x * 1.25, 6], 'rgba(60,40,110,0.38)', 1.5)
        c.fillStyle = 'rgba(60,40,110,0.34)'; c.beginPath(); c.moveTo(-40, -74); c.lineTo(40, -74); c.lineTo(36, -44); c.quadraticCurveTo(0, -40, -36, -44); c.closePath(); c.fill()
        costura(c, suave([[-30, -45], [0, -41.5], [30, -45]], false, 6))
        for (let y = -68; y < -48; y += 6.5) { traco(c, [[16, y], [24, y + 5]], LINHO, esp(1.2, 0.8)); traco(c, [[24, y], [16, y + 5]], LINHO, esp(1.2, 0.8)) }
      })
      peito(c)
    },
  },
  tr_couro_curtido: { // colete de couro grosso: carcela com pontos de sela, tachas e cinto de fivela
    base(c, o) {
      const f = corpo(o.R, { lt: 33, lm: 39, lb: 44, h: 75 }); pano(c, f, o.tipo)
      dentro(c, f, () => {
        c.fillStyle = 'rgba(40,18,4,0.22)'; c.fillRect(24, -80, 30, 90)
        traco(c, [[24, -78], [25, 8]], 'rgba(20,12,31,0.5)', 1.6)
        costura(c, [[28.5, -70], [29.5, -12]], { larg: 2.2, passo: 1.4 })
        c.fillStyle = 'rgba(40,18,4,0.42)'; c.beginPath(); c.moveTo(-50, -11); c.quadraticCurveTo(0, -6, 50, -11); c.lineTo(50, -1); c.quadraticCurveTo(0, 4, -50, -1); c.closePath(); c.fill()
        c.strokeStyle = 'rgba(20,12,31,0.6)'; c.lineWidth = 1.3; c.stroke()
        for (const x of [-34, -27]) { c.fillStyle = TINTA; circ(c, x, -6, 1.2); c.fill() }
      })
      for (const y of [-60, -44, -28]) rebite(c, 34.5, y, 2.5)
      c.strokeStyle = TINTA; c.lineWidth = esp(3.8, 1.8); c.strokeRect(-19, -10.5, 11, 10); c.strokeStyle = ACO; c.lineWidth = esp(1.8, 1); c.strokeRect(-19, -10.5, 11, 10); traco(c, [[-13.5, -5.5], [-8, -5.5]], ACO, esp(1.6, 0.9))
      c.lineJoin = 'round'; c.lineWidth = esp(2.5, 1.5); c.strokeStyle = TINTA; c.stroke(f.p)
      peito(c)
    },
  },
  tr_couro_rachado: { // couro velho: rachaduras fundas, bandoleira atravessada e uma lasca levantando no ombro
    barra: { l: 31, y: 2 },
    base(c, o) {
      const R = o.R
      pano(c, tubo([[26, -64], [40, -73], [47, -62]], [11, 4]), o.tipo, { semPesponto: true, contorno: 2.2, tinta: 'rgba(255,214,160,0.16)' })
      const f = corpo(R, { lt: 30, lm: 35, lb: 39, h: 73, d: 2 }); pano(c, f, o.tipo)
      dentro(c, f, () => {
        for (const l of [[[-24, -30], [-19, -18], [-25, -8], [-20, 4]], [[20, -44], [15, -34], [22, -26], [18, -14], [24, -4]], [[-4, -72], [-1, -62], [-6, -55]]]) { traco(c, l.map((q) => [q[0] + 1, q[1] + 0.8]), 'rgba(255,214,160,0.3)', 1.1); traco(c, l, 'rgba(20,8,2,0.75)', 2) }
        pano(c, curvaFechada([[24, -78], [36, -70], [-30, -4], [-40, -14]], 3), o.tipo, { tinta: 'rgba(40,18,4,0.36)', recuo: 2.2, contorno: 1.6 })
      })
      rebite(c, -27, -17, 2.6)
      c.lineJoin = 'round'; c.lineWidth = esp(2.5, 1.5); c.strokeStyle = TINTA; c.stroke(f.p)
      peito(c, -16, -58)
    },
  },
}

// ------------------------------------------------------------------ bordados (8): emblema em ponto cheio. Centro (0,0), cabe num raio de 19.

function cetim(c, p, cor, ang = 0.6) {
  c.save(); c.translate(0.9 * B.L, 1.2); c.fillStyle = 'rgba(20,12,31,0.4)'; c.fill(p); c.restore()
  c.fillStyle = cor; c.fill(p)
  c.save(); c.clip(p); c.rotate(ang); c.lineWidth = 0.8
  for (let k = -32; k < 32; k += 2.5) { c.strokeStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.moveTo(k, -32); c.lineTo(k, 32); c.stroke(); c.strokeStyle = 'rgba(20,12,31,0.24)'; c.beginPath(); c.moveTo(k + 1.25, -32); c.lineTo(k + 1.25, 32); c.stroke() }
  c.restore()
  c.strokeStyle = TINTA; c.lineWidth = esp(1.5, 1); c.lineJoin = 'round'; c.stroke(p)
}
const BORDADOS_DESENHO = {
  espinho(c) { // espinheiro: três espinhos compridos e tortos
    const p = new Path2D(); const pts = [[0, -19], [4, -5], [17, -11], [8, 1], [19, 9], [5, 7], [3, 18], [-2, 8], [-13, 15], [-8, 3], [-19, -2], [-6, -4], [-11, -15], [-2, -8]]
    p.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) p.lineTo(q[0], q[1]); p.closePath()
    cetim(c, p, '#8FA05A', 0.3); c.fillStyle = '#4C5A2A'; circ(c, 0.5, 1, 3); c.fill()
  },
  remendo_vivo(c) { // cruz de remendo com um coração que bate
    const p = new Path2D(); p.roundRect(-6.5, -18, 13, 36, 2.5); p.roundRect(-18, -6.5, 36, 13, 2.5)
    cetim(c, p, '#D8CBA8', 0.15)
    c.strokeStyle = TINTA; c.lineWidth = esp(1.1, 0.8); c.setLineDash([2.4, 2.4]); c.strokeRect(-4, -15.5, 8, 31); c.strokeRect(-15.5, -4, 31, 8); c.setLineDash([])
    const h = new Path2D(); h.moveTo(0, 6); h.bezierCurveTo(-11, -2, -6, -9, 0, -3.5); h.bezierCurveTo(6, -9, 11, -2, 0, 6); h.closePath()
    c.fillStyle = '#D9606A'; c.fill(h); c.strokeStyle = TINTA; c.lineWidth = esp(1.3, 0.9); c.stroke(h)
  },
  botao_reserva(c) { // bolsinho com um botão de reserva pendurado pela linha
    const p = new Path2D(); p.roundRect(-15, -9, 30, 26, 6)
    c.fillStyle = 'rgba(20,12,31,0.36)'; c.fill(p); c.strokeStyle = LINHO; c.lineWidth = esp(1.5, 1); c.setLineDash([3, 2.6]); c.stroke(p); c.setLineDash([])
    arcoQ(c, [-9, -17], [3, -22], [4, -10], LINHO, esp(1.2, 0.8))
    c.fillStyle = TINTA; circ(c, 3, -3, 11.6); c.fill()
    const g = c.createRadialGradient(0, -6, 1, 3, -3, 10); g.addColorStop(0, '#FFF8E4'); g.addColorStop(1, '#C4B289'); c.fillStyle = g; circ(c, 3, -3, 10); c.fill()
    c.strokeStyle = '#8F7D55'; c.lineWidth = 1; circ(c, 3, -3, 6.8); c.stroke()
    c.fillStyle = TINTA; for (const [dx, dy] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) { circ(c, 3 + dx, -3 + dy, 1.2); c.fill() }
    traco(c, [[0.4, -5.6], [5.6, -0.4]], CARMIM, 1.3); traco(c, [[5.6, -5.6], [0.4, -0.4]], CARMIM, 1.3)
  },
  agulha_afiada(c) { // duas agulhas cruzadas e a linha passando pelos furos
    arcoQ(c, [-13, -14], [0, 16], [13, -14], TINTA, esp(3, 1.4)); arcoQ(c, [-13, -14], [0, 16], [13, -14], CARMIM, esp(1.4, 0.8))
    for (const L of [-1, 1]) { haste(c, [L * 15, -17], [-L * 14, 18], 2.8); c.strokeStyle = TINTA; c.lineWidth = esp(1.3, 0.9); c.beginPath(); c.ellipse(L * 13.4, -15, 1.3, 3, -L * 0.7, 0, TAU); c.stroke() }
  },
  pe_de_chumbo(c) { // peso de chumbo com argola
    c.strokeStyle = TINTA; c.lineWidth = esp(4.4, 2); circ(c, 0, -13, 5); c.stroke(); c.strokeStyle = '#9AA2AE'; c.lineWidth = esp(2, 1); c.stroke()
    const p = new Path2D(); p.moveTo(-9, -9); p.lineTo(9, -9); p.lineTo(16, 16); p.lineTo(-16, 16); p.closePath()
    cetim(c, p, '#7C8492', 1.2)
    traco(c, [[-9.5, -1], [-12, 9]], 'rgba(255,255,255,0.55)', esp(1.6, 0.9))
    traco(c, [[-5, 8], [5, 8]], TINTA, esp(1.6, 1)); traco(c, [[-5, 3], [5, 3]], TINTA, esp(1.6, 1))
  },
  olho_de_vidro(c) { // olho de vidro bordado
    const p = new Path2D(); p.moveTo(-19, 0); p.quadraticCurveTo(0, -18, 19, 0); p.quadraticCurveTo(0, 18, -19, 0); p.closePath()
    cetim(c, p, '#EFE4CB', 1.57)
    const g = c.createRadialGradient(-2 * B.L, -3, 1, 0, 0, 9); g.addColorStop(0, '#C3D6CF'); g.addColorStop(1, '#4E6E72'); c.fillStyle = g; circ(c, 0, 0, 8.6); c.fill(); c.strokeStyle = TINTA; c.lineWidth = esp(1.3, 0.9); c.stroke()
    c.fillStyle = TINTA; circ(c, 0, 0, 4); c.fill(); c.fillStyle = '#fff'; circ(c, -2.6 * B.L, -3, 1.8); c.fill()
    for (const x of [-12, -6, 0, 6, 12]) traco(c, [[x, -8 + Math.abs(x) * 0.45 - 1], [x * 1.15, -13 + Math.abs(x) * 0.5]], TINTA, esp(1.3, 0.9))
  },
  rancor(c) { // marca de raiva: quatro garras em volta de um nó
    const p = new Path2D()
    for (let i = 0; i < 4; i++) { const a = (Math.PI / 2) * i + 0.25, q = (r, d) => [Math.cos(a + d) * r, Math.sin(a + d) * r]
      p.moveTo(...q(4, 0)); p.quadraticCurveTo(...q(13, 0.55), ...q(19.5, 0.2)); p.quadraticCurveTo(...q(11, -0.35), ...q(4, 0)) }
    cetim(c, p, CARMIM, 0.8)
  },
  bolso_de_linha(c) { // bolso com um carretel espiando, a linha escapando
    c.fillStyle = MADEIRA; c.strokeStyle = TINTA; c.lineWidth = esp(1.4, 0.95); c.beginPath(); c.roundRect(-8, -19, 16, 5, 1.6); c.fill(); c.stroke()
    c.fillStyle = MALDICAO; c.fillRect(-6, -14, 12, 9); c.strokeStyle = 'rgba(120,10,60,0.6)'; c.lineWidth = 0.8; for (let y = -12.5; y < -5; y += 2) { c.beginPath(); c.moveTo(-6, y); c.lineTo(6, y + 0.7); c.stroke() }
    c.strokeStyle = TINTA; c.lineWidth = esp(1.4, 0.95); c.strokeRect(-6, -14, 12, 9)
    const p = new Path2D(); p.moveTo(-16, -7); p.lineTo(16, -7); p.lineTo(15, 10); p.quadraticCurveTo(0, 20, -15, 10); p.closePath()
    cetim(c, p, '#5A4378', 0)
    c.strokeStyle = LINHO; c.lineWidth = esp(1.4, 0.95); c.setLineDash([3, 2.6]); c.beginPath(); c.moveTo(-12.5, -3.5); c.lineTo(12.5, -3.5); c.lineTo(11.8, 8); c.quadraticCurveTo(0, 15.5, -11.8, 8); c.closePath(); c.stroke(); c.setLineDash([])
    arcoQ(c, [6, -12], [15, -16], [18, -6], TINTA, esp(2.6, 1.3)); arcoQ(c, [6, -12], [15, -16], [18, -6], MALDICAO, esp(1.2, 0.8))
  },
}

// ------------------------------------------------------------------ braços (8). Pivô = ombro (0,0); o braço cai para baixo e para fora. L = -1 esquerdo, +1 direito.

const E = (pts, L) => pts.map((q) => [q[0] * L, q[1]])
/** Luva de pano com polegar. */
function mao(c, x, y, r, tipo, R, L, o = {}) {
  pano(c, bolha(x - L * r * 0.82, y - r * 0.15, r * 0.44, r * 0.52, R, { caroco: 0.08, n: 8 }), tipo, { semPesponto: true, contorno: 2, ...o })
  pano(c, bolha(x, y, r, r * 0.95, R, { caroco: 0.07, n: 10 }), tipo, { recuo: 3.2, ...o })
}
const JUNTAS_BRACO = (L) => [{ x: L * 4, y: 12 }, { x: L * 8, y: 24 }, { x: L * 11, y: 36 }]
const BRACOS = {
  br_rasgado: { // manga grossa de brim com um rasgão: o enchimento estufa para fora, a barra desfia
    base(c, o) {
      const L = o.lado, R = o.R
      tufo(c, L * 20.5, 25, 8.4, R); tufo(c, L * 24.5, 35, 6, R)
      pano(c, curvaFechada(E([[17, 34], [27, 40], [30, 51], [23, 46], [18, 42]], L), 5), o.tipo, { semPesponto: true, contorno: 2, tinta: 'rgba(225,238,255,0.22)' })
      for (let i = 0; i < 5; i++) { const x = L * (8 + i * 3.4); fioAssado(c, [[x, 44], [x + (R() - 0.5) * 3, 51], [x + (R() - 0.5) * 6, 56 + R() * 4]], i % 2 ? TEC.jeans.claro : LINHO, 1.2) }
      mao(c, L * 15, 55, 10, o.tipo, R, L)
      const a = tubo(E([[0, -1], [6, 16], [11, 32], [14, 46]], L), [22, 19]); pano(c, a, o.tipo)
      dentro(c, a, () => {
        const pts = []; for (let i = 0; i <= 6; i++) pts.push([L * (-2 + i * 4.6), 26 + (i % 2 ? -3.6 : 2.4)])
        for (let i = 6; i >= 0; i--) pts.push([L * (-2 + i * 4.6), 35 + (i % 2 ? 3.4 : -1.6)])
        c.fillStyle = GOELA; c.fill(caminho(pts)); c.strokeStyle = TINTA; c.lineWidth = esp(1.3, 0.9); c.lineJoin = 'round'; c.stroke(caminho(pts))
        tufo(c, L * 13, 31, 5.6, R)
      })
      for (const [x, y] of [[4, 24], [9, 39]]) traco(c, [[L * x - 3.6, y + 1.8], [L * x + 3.6, y - 1.8]], LINHO, esp(1.4, 0.9))
    },
  },
  br_cadarco: { // ombreira de couro e um cadarço comprido com nó no cotovelo e laçada na ponta
    juntas: (L) => [{ x: L * 7, y: 14 }, { x: L * 10, y: 28 }, { x: L * 12, y: 42 }], mao: (L) => ({ x: L * 17, y: 58 }),
    base(c, o) {
      const L = o.lado, R = o.R, cor = '#6B4322'
      const cordao = (pts, lw = 4.6) => { const d = suave(pts, false, 8); traco(c, d, TINTA, esp(lw + 3, 2.2)); traco(c, d, cor, lw); c.strokeStyle = 'rgba(255,214,160,0.5)'; c.lineWidth = 1; for (let i = 2; i < d.length - 1; i += 3) { c.beginPath(); c.moveTo(d[i][0] - 1.6, d[i][1] - 1.2); c.lineTo(d[i][0] + 1.6, d[i][1] + 1.2); c.stroke() } }
      c.save(); c.translate(L * 17, 59); c.rotate(L * 0.3)
      c.beginPath(); c.ellipse(0, 0, 9, 12.5, 0, 0, TAU); c.strokeStyle = TINTA; c.lineWidth = esp(7.6, 3.4); c.stroke(); c.strokeStyle = cor; c.lineWidth = 4.6; c.stroke()
      c.strokeStyle = 'rgba(255,214,160,0.5)'; c.lineWidth = 1; for (let a = 0; a < TAU; a += 0.5) { c.beginPath(); c.moveTo(Math.cos(a) * 8, Math.sin(a) * 11.5); c.lineTo(Math.cos(a + 0.14) * 10, Math.sin(a + 0.14) * 13.5); c.stroke() }
      c.restore()
      cordao(E([[4, 8], [13, 22], [8, 34], [14, 47]], L))
      cordao(E([[9, 30], [2, 38], [4, 47]], L), 3.6)
      for (const [x, y, a] of [[4, 49, 0.1]]) { c.save(); c.translate(L * x, y); c.rotate(a * L); c.fillStyle = ACO; c.strokeStyle = TINTA; c.lineWidth = esp(1.2, 0.9); c.beginPath(); c.roundRect(-2.2, -1, 4.4, 8.5, 1.5); c.fill(); c.stroke(); c.restore() }
      const no = bolha(L * 9.6, 29.5, 6, 5.4, R, { caroco: 0.1, n: 9 }); c.fillStyle = cor; c.fill(no.p); c.strokeStyle = TINTA; c.lineWidth = esp(2, 1.3); c.stroke(no.p)
      arcoQ(c, [L * 6.5, 28], [L * 9.5, 31.5], [L * 12.5, 28.5], 'rgba(255,214,160,0.55)', 1.1)
      pano(c, bolha(L * 2.5, 3.5, 12, 10.5, R, { caroco: 0.06, n: 10 }), o.tipo, { recuo: 3.2 })
    },
  },
  br_agulha: { // braço fino de seda; o da frente empunha uma agulha maior que ele, o outro traz a linha enrolada no pulso
    base(c, o) {
      const L = o.lado, R = o.R
      if (L > 0) { // agulha por trás da mão
        haste(c, [10, 64], [31, -30], 3.2)
        c.strokeStyle = TINTA; c.lineWidth = esp(1.5, 1); c.beginPath(); c.ellipse(29.4, -22, 1.5, 4.4, 0.35, 0, TAU); c.stroke()
        fioAssado(c, [[29.6, -20], [40, -4], [34, 20], [24, 44]], CARMIM, 1.4)
      }
      const a = tubo(E([[0, -1], [5, 16], [10, 32], [13, 45]], L), [15, 11]); pano(c, a, o.tipo)
      mao(c, L * 14, 52, 8.6, o.tipo, R, L)
      if (L < 0) { for (const y of [36, 39.5, 43]) arcoQ(c, [L * 5.5, y - 1.5], [L * 11, y + 2.4], [L * 16.5, y - 1], CARMIM, esp(1.6, 0.9)); fioAssado(c, [[L * 16, 42], [L * 22, 50], [L * 19, 60]], CARMIM, 1.3) }
    },
  },
  br_cetim: { // manga bufante, antebraço fino e um laço de fita enorme no pulso
    base(c, o) {
      const L = o.lado, R = o.R
      const a = tubo(E([[4, 10], [9, 28], [13, 46]], L), [10, 8.5]); pano(c, a, o.tipo, { recuo: 2.6 })
      mao(c, L * 14, 53, 7.8, o.tipo, R, L)
      const b = bolha(L * 4, 7, 15.5, 13.5, R, { caroco: 0.08, n: 11 }); pano(c, b, o.tipo)
      dentro(c, b, () => { for (const x of [-6, 0, 6]) arcoQ(c, [L * (4 + x), -6], [L * (4 + x * 1.5), 8], [L * (4 + x * 0.8), 20], 'rgba(90,10,70,0.3)', 1.3) })
      // laço
      const fita = (pts) => { const f = curvaFechada(pts, 5); c.fillStyle = VINHO; c.fill(f.p); dentro(c, f, () => { c.fillStyle = 'rgba(255,200,230,0.26)'; c.fill(deslocado(f.p, 1.6 * B.L, 1.8, f.bb), 'evenodd'); c.fillStyle = 'rgba(20,12,31,0.25)'; c.fill(deslocado(f.p, -2 * B.L, -2.2, f.bb), 'evenodd') }); c.strokeStyle = TINTA; c.lineWidth = esp(1.6, 1.1); c.lineJoin = 'round'; c.stroke(f.p) }
      const x = L * 12.5, y = 42
      fita([[x - 2, y + 2], [x - 6, y + 12], [x - 9, y + 20], [x - 3.5, y + 18], [x + 1, y + 4]]); fita([[x + 1, y + 2], [x + 7, y + 10], [x + 10, y + 17], [x + 4.5, y + 17], [x - 1, y + 4]])
      fita([[x, y], [x - 9, y - 9], [x - 17, y - 5], [x - 15, y + 5], [x - 7, y + 4]]); fita([[x, y], [x + 9, y - 9], [x + 17, y - 6], [x + 16, y + 4], [x + 7, y + 4]])
      fita([[x - 3.6, y - 3.4], [x + 3.6, y - 3.4], [x + 3.6, y + 3.6], [x - 3.6, y + 3.6]])
    },
  },
  br_abraco: { // braços compridos de lã que arrastam no chão, com mãozonas felpudas
    juntas: (L) => [{ x: L * 5, y: 14 }, { x: L * 10, y: 30 }, { x: L * 14, y: 46 }, { x: L * 15, y: 62 }, { x: L * 12, y: 78 }], mao: (L) => ({ x: L * 5, y: 96 }),
    base(c, o) {
      const L = o.lado, R = o.R
      const a = tubo(E([[0, -1], [9, 24], [16, 50], [14, 74], [7, 90]], L), [21, 17]); pano(c, a, o.tipo)
      dentro(c, a, () => { for (const y of [40, 44.5]) arcoQ(c, [L * 4, y], [L * 14, y + 4], [L * 24, y - 1], 'rgba(60,36,12,0.3)', 1.4) })
      const m = bolha(L * 5, 96, 15, 12.5, R, { caroco: 0.2, n: 16, passos: 4 }); pano(c, m, o.tipo, { semPesponto: true, tinta: 'rgba(255,250,235,0.18)' })
      pano(c, bolha(L * -8, 90, 6, 6.5, R, { caroco: 0.2, n: 10, passos: 4 }), o.tipo, { semPesponto: true, contorno: 2, tinta: 'rgba(255,250,235,0.18)' })
      for (const x of [-2, 4, 10]) arcoQ(c, [L * (5 + x), 100], [L * (5 + x * 1.1), 104], [L * (5 + x * 1.2), 107.5], TINTA, esp(1.5, 1))
    },
  },
  br_cruz: { // braço de feltro com fileira de ponto cruz e mão chata, quadrada, com um X bordado
    base(c, o) {
      const L = o.lado, R = o.R
      const a = tubo(E([[0, -1], [6, 16], [11, 32], [14, 44]], L), [19, 16]); pano(c, a, o.tipo)
      dentro(c, a, () => { for (let i = 0; i < 4; i++) { const q = a.esp[Math.round(4 + i * 5.5)]; xis(c, q[0], q[1], 2.6, 'rgba(20,12,31,0.6)', 1.5) } })
      c.save(); c.translate(L * 16, 56); c.rotate(L * 0.14)
      const m = curvaFechada([[-13, -11], [-13, -11], [13, -12], [13, -12], [14, 11], [14, 11], [-13, 12], [-13, 12]], 4); pano(c, m, o.tipo, { recuo: 3 })
      xis(c, 0.5, 0, 6.2, TINTA, 4.4); xis(c, 0.5, 0, 6.2, LINHO, 2.2)
      c.restore()
    },
  },
  br_alfinete: { // bracinho de feltro que termina num alfineteiro espetado de alfinetes
    mao: (L) => ({ x: L * 17, y: 56 }),
    base(c, o) {
      const L = o.lado, R = o.R, bx = L * 17, by = 56
      const cab = ['#F6F2FF', CARMIM, '#3A2752', '#F6F2FF', CARMIM, '#3A2752', '#F6F2FF', CARMIM]
      for (let i = 0; i < 8; i++) {
        const ang = Math.PI / 2 - L * (-0.5 + i * 0.42) - L * 0.4, l = 22 + (i % 3) * 4 + R() * 3
        const x1 = bx + Math.cos(ang) * l, y1 = by + Math.sin(ang) * l
        haste(c, [bx + Math.cos(ang) * 8, by + Math.sin(ang) * 8], [x1, y1], 1.5)
        c.fillStyle = cab[i]; circ(c, x1, y1, 3.2); c.fill(); c.strokeStyle = TINTA; c.lineWidth = esp(1.3, 0.9); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.7)'; circ(c, x1 - 1 * B.L, y1 - 1, 0.9); c.fill()
      }
      const a = tubo(E([[0, -1], [5, 15], [10, 30], [14, 43]], L), [14, 11]); pano(c, a, o.tipo)
      const b = bolha(bx, by, 14.5, 13.5, R, { caroco: 0.05, n: 11 }); pano(c, b, o.tipo, { recuo: 3.2 })
      dentro(c, b, () => { for (let k = 0; k < 6; k++) { const an = (k / 6) * Math.PI; arcoQ(c, [bx - Math.cos(an) * 15, by - Math.sin(an) * 14], [bx, by], [bx + Math.cos(an) * 15, by + Math.sin(an) * 14], 'rgba(14,44,28,0.3)', 1.2) } })
      c.fillStyle = misturaCor(TEC.feltro.escuro, TINTA, 0.3); circ(c, bx, by, 2.6); c.fill(); c.strokeStyle = TINTA; c.lineWidth = esp(1, 0.8); c.stroke()
    },
  },
  br_nevoa: { // manga de tule em três babados, larga como um sino; a mãozinha quase some lá dentro
    juntas: (L) => [{ x: L * 4, y: 14 }, { x: L * 8, y: 30 }, { x: L * 11, y: 46 }], mao: (L) => ({ x: L * 14, y: 64 }),
    base(c, o) {
      const L = o.lado, R = o.R
      mao(c, L * 14, 63, 6.6, 'tule', R, L, { tinta: 'rgba(239,228,203,0.3)' })
      const babado = (y0, y1, w0, w1, x0, x1, tinta) => {
        const n = Math.max(3, Math.round(w1 / 9)), pts = [[x0 - w0 / 2, y0], [x0, y0 - 2.5], [x0 + w0 / 2, y0], [x1 + w1 / 2 + 2, y1 - 6]]
        for (let i = 0; i <= n; i++) { const x = x1 + w1 / 2 - (w1 * i) / n; pts.push([x, y1 + (i % 2 ? -4 : 2)]) }
        pts.push([x1 - w1 / 2 - 2, y1 - 6])
        pano(c, curvaFechada(pts.map((q) => [q[0] * 1, q[1]]), 5), 'tule', { alfa: 0.92, tinta, recuo: 3, contorno: 2.2 })
      }
      babado(34, 66, 30, 50, L * 9, L * 15, 'rgba(60,40,110,0.36)')
      babado(16, 44, 24, 38, L * 5, L * 10, 'rgba(60,40,110,0.18)')
      babado(-4, 24, 20, 28, L * 1, L * 5, 'rgba(255,255,255,0.14)')
    },
  },
}

// ------------------------------------------------------------------ pernas (8). Pivô = quadril (0,0); a sola toca o chão em y = 58. L = lado (o pé vira para fora).

const JUNTAS_PERNA = (L) => [{ x: 0, y: 13 }, { x: L * 1, y: 27 }]
const PERNAS = {
  pe_rebite: { // calça de brim boca de sino, com rebites e a barra larga dobrada (avesso claro); o pé redondo mal aparece
    base(c, o) {
      const L = o.lado, R = o.R
      pano(c, bolha(L * 7, 51.5, 15, 7, R, { caroco: 0.06, n: 10, quad: 2.5 }), o.tipo, { recuo: 3 })
      const a = tubo(E([[0, 0], [1, 20], [3, 44]], L), (t) => (t < 0.55 ? mix(27, 22, t / 0.55) : mix(22, 35, (t - 0.55) / 0.45))); pano(c, a, o.tipo)
      costura(c, E([[-8, 6], [-6.5, 20], [-7, 33]], L))
      rebite(c, L * 8.5, 9, 2.7); rebite(c, L * 8, 23, 2.7)
      const b = tubo(E([[-14, 43.5], [3, 47.5], [20, 42.5]], L), [10.5, 10.5]); pano(c, b, o.tipo, { tinta: 'rgba(225,238,255,0.24)', semPesponto: true, contorno: 2.2 })
      dentro(c, b, () => { for (const x of [-11, -5, 1, 7, 13]) traco(c, [[L * x, 39], [L * x + 0.5, 53]], 'rgba(16,22,60,0.3)', 1) })
    },
  },
  pe_tamanco: { // canela fina e um tamanco de madeira pesado, de bico redondo e salto de bloco
    juntas: (L) => [{ x: 0, y: 13 }, { x: L * 1, y: 26 }],
    base(c, o) {
      const L = o.lado, R = o.R
      const a = tubo(E([[0, 0], [1, 20], [1, 40]], L), [15, 13]); pano(c, a, o.tipo)
      const t = curvaFechada(E([[-15, 41], [-5, 37], [7, 38], [18, 42], [24, 47], [23, 54], [18, 58], [18, 58], [5, 58], [5, 58], [3, 53], [-4, 53], [-5, 58], [-5, 58], [-16, 58], [-16, 58], [-17, 48]], L), 5)
      pano(c, t, MADEIRA, { semPesponto: true, dentro: (c) => { c.strokeStyle = 'rgba(70,35,10,0.42)'; c.lineWidth = 1.1; for (let k = 0; k < 5; k++) arcoQ(c, [L * -18, 41 + k * 4], [L * 4, 38 + k * 4.4], [L * 26, 43 + k * 4], 'rgba(70,35,10,0.42)', 1.1) } })
      const s = tubo(E([[-11, 42.5], [1, 37.5], [13, 41]], L), [8, 8]); pano(c, s, o.tipo, { recuo: 2.2, contorno: 2 })
      rebite(c, L * -6, 40.5, 1.7); rebite(c, L * 8, 39.5, 1.7)
    },
  },
  pe_sola: { // botina de cano largo com alça de puxar, cadarço cruzado e plataforma grossa de borracha com salto e dentes
    base(c, o) {
      const L = o.lado, R = o.R
      c.strokeStyle = TINTA; c.lineWidth = esp(5.4, 2.4); c.beginPath(); c.ellipse(L * -11, -4, 4, 5.5, 0, 0, TAU); c.stroke(); c.strokeStyle = TEC[o.tipo]?.escuro ?? TINTA; c.lineWidth = esp(2.6, 1.2); c.stroke()
      const dentes = []; for (let i = 0; i <= 5; i++) dentes.push([L * (4 + i * 4.8), i % 2 ? 58 : 55])
      const fs = forma([[L * -19, 47], [L * 29, 47], [L * 30, 55], ...dentes.reverse(), [L * 2, 52], [L * -5, 52], [L * -6, 58], [L * -19, 58]])
      c.fillStyle = '#2B2130'; c.fill(fs.p); dentro(c, fs, () => { c.fillStyle = 'rgba(160,205,255,0.24)'; c.fill(deslocado(fs.p, -1.8 * B.L, -0.5, fs.bb), 'evenodd'); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(-40, 47, 80, 2.4) })
      c.strokeStyle = TINTA; c.lineWidth = esp(2.5, 1.5); c.lineJoin = 'round'; c.stroke(fs.p)
      pano(c, curvaFechada(E([[-16, 48], [-14, 38], [8, 37], [23, 40], [28, 48], [28, 48], [-16, 48], [-16, 48]], L), 5), o.tipo, { recuo: 3 })
      const a = tubo(E([[0, 0], [0, 19], [1, 38]], L), [26, 27]); pano(c, a, o.tipo)
      for (const y of [11, 20, 29]) for (const [cor, lw] of [[TINTA, esp(3.2, 1.6)], [LINHO, esp(1.5, 0.9)]]) { traco(c, [[L * 1 - 6.5, y], [L * 1 + 6.5, y + 6]], cor, lw); traco(c, [[L * 1 + 6.5, y], [L * 1 - 6.5, y + 6]], cor, lw) }
      pano(c, tubo(E([[-13, 2], [0, -1], [13, 2]], L), [7, 7]), o.tipo, { tinta: 'rgba(40,18,4,0.3)', semPesponto: true, contorno: 2 })
    },
  },
  pe_cetim: { // perninha fina na ponta do pé: sapatilha de cetim, fitas cruzadas e um lacinho
    base(c, o) {
      const L = o.lado, R = o.R
      const a = tubo(E([[0, 0], [1, 22], [2, 44]], L), [12, 8]); pano(c, a, o.tipo, { recuo: 2.8 })
      pano(c, curvaFechada(E([[-6, 41], [1, 38], [8, 41], [11, 50], [9, 58], [5, 58.5], [0, 54], [-5, 48]], L), 6), o.tipo, { tinta: 'rgba(90,10,70,0.3)', recuo: 2.4 })
      for (const [y0, y1] of [[36, 27], [27, 18], [36, 18]]) { const p = [[L * 1 - 5.5, y0], [L * 1 + 6, y1 + (y0 - y1) * 0.5 - 4]]; traco(c, p, TINTA, esp(3.4, 1.6)); traco(c, p, VINHO, esp(1.8, 1)) }
      for (const [y0, y1] of [[36, 27], [27, 18]]) { const p = [[L * 1 + 5.5, y0], [L * 1 - 6, y1 + 0.5]]; traco(c, p, TINTA, esp(3.4, 1.6)); traco(c, p, VINHO, esp(1.8, 1)) }
      const x = L * 6.5, y = 17
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + d * 8, y - 7, x + d * 8.5, y + 2); c.quadraticCurveTo(x + d * 4, y + 3, x, y); c.fillStyle = VINHO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = esp(1.4, 1); c.lineJoin = 'round'; c.stroke() }
      c.fillStyle = VINHO; circ(c, x, y, 2.2); c.fill(); c.stroke()
    },
  },
  pe_novelo: { // perninha que termina num novelo de lã, com a ponta do fio arrastando
    juntas: (L) => [{ x: 0, y: 12 }, { x: L * 1, y: 24 }],
    base(c, o) {
      const L = o.lado, R = o.R
      fioAssado(c, E([[10, 52], [22, 57], [30, 53], [36, 57]], L), TEC.la.claro, 1.8)
      const a = tubo(E([[0, 0], [1, 14], [2, 30]], L), [13, 11]); pano(c, a, o.tipo, { recuo: 3 })
      const b = bolha(L * 3, 42.5, 17, 15.5, R, { caroco: 0.035, n: 12 }); pano(c, b, o.tipo, { semPesponto: true, tinta: 'rgba(255,250,235,0.12)' })
      dentro(c, b, () => { c.lineWidth = 1.5; for (let k = 0; k < 7; k++) { c.strokeStyle = k % 2 ? 'rgba(60,36,12,0.5)' : 'rgba(255,251,234,0.6)'; c.beginPath(); c.ellipse(L * 3, 42.5, 19, 5 + k * 2.6, L * (0.5 + k * 0.33), 0, TAU); c.stroke() } })
    },
  },
  pe_rolo: { // a perna É um carretel de madeira com a lã enrolada
    juntas: () => [],
    base(c, o) {
      const L = o.lado, R = o.R
      fioAssado(c, E([[9, 38], [17, 44], [14, 52], [19, 57]], L), TEC.la.claro, 1.8)
      const m = curvaFechada([[-11, 8], [0, 9.5], [11, 8], [12.5, 28], [11, 49], [0, 50.5], [-11, 49], [-12.5, 28]], 6)
      pano(c, m, o.tipo, { semPesponto: true, dentro: (c) => { c.lineWidth = 1.3; for (let y = 10; y < 52; y += 3.3) { c.strokeStyle = 'rgba(60,36,12,0.5)'; c.beginPath(); c.moveTo(-14, y); c.quadraticCurveTo(0, y + 2.6, 14, y + 0.6); c.stroke() } } })
      for (const [y, w, h] of [[4, 31, 8.5], [53.5, 33, 9]]) {
        const f = curvaFechada([[-w / 2, y - h / 2], [-w / 2, y - h / 2], [w / 2, y - h / 2], [w / 2, y - h / 2], [w / 2 + 1, y + h / 2], [w / 2 + 1, y + h / 2], [-w / 2 - 1, y + h / 2], [-w / 2 - 1, y + h / 2]], 4)
        pano(c, f, MADEIRA, { semPesponto: true, dentro: (c) => { for (const dy of [-1.6, 1.4]) arcoQ(c, [-w / 2, y + dy], [0, y + dy + 1.4], [w / 2, y + dy], 'rgba(70,35,10,0.4)', 1) } })
      }
    },
  },
  pe_remendo: { // perna gorda de feltro toda remendada, com atadura e um remendo descolando
    base(c, o) {
      const L = o.lado, R = o.R
      pano(c, curvaFechada(E([[10, 9], [21, 5], [24, 15], [13, 18]], L), 4), 'jeans', { semPesponto: true, contorno: 2 })
      for (const pts of [[[11, 25], [20, 21], [27, 23]], [[11, 29], [21, 31], [26, 37]]]) { const t = tubo(E(pts, L), [5.4, 4.2]); c.fillStyle = '#E4D9BE'; c.fill(t.p); c.strokeStyle = TINTA; c.lineWidth = esp(1.6, 1.1); c.lineJoin = 'round'; c.stroke(t.p) }
      pano(c, bolha(L * 4, 50.5, 17, 8.5, R, { caroco: 0.06, n: 10, quad: 2.6 }), o.tipo, { recuo: 3 })
      const a = tubo(E([[0, 0], [1, 22], [2, 44]], L), [25, 24]); pano(c, a, o.tipo)
      dentro(c, a, () => {
        c.save(); c.translate(L * -3, 10); c.rotate(0.2 * L); const p1 = curvaFechada([[-7, -6], [-7, -6], [7, -7], [7, -7], [8, 6], [8, 6], [-7, 7], [-7, 7]], 3); pano(c, p1, 'couro', { semPesponto: true, contorno: 1.5 }); for (const [x, y] of [[-7, -3], [-7, 3], [7.5, -3], [7.5, 3], [-3, -6.5], [3, -6.5], [-3, 6.5], [3, 6.5]]) traco(c, [[x - 1.6, y - 1.6], [x + 1.6, y + 1.6]], LINHO, esp(1.3, 0.9)); c.restore()
        c.save(); c.translate(L * 5, 36); c.rotate(-0.25 * L); const p2 = curvaFechada([[-6, -5], [-6, -5], [6, -6], [6, -6], [7, 5], [7, 5], [-6, 6], [-6, 6]], 3); pano(c, p2, 'la', { semPesponto: true, contorno: 1.5 }); xis(c, 0, 0, 3, TINTA, 1.5); c.restore()
        for (const dy of [0, 4.6]) { traco(c, [[L * -14, 21 + dy], [L * 16, 26 + dy]], TINTA, esp(5.6, 2.2)); traco(c, [[L * -14, 21 + dy], [L * 16, 26 + dy]], '#E4D9BE', 3.6) }
      })
    },
  },
  pe_ultimo: { // a perna vai afinando e se desfaz em fios soltos que mal tocam o chão
    juntas: (L) => [{ x: 0, y: 10 }, { x: L * 1, y: 20 }],
    base(c, o) {
      const L = o.lado, R = o.R, T = TEC[o.tipo]
      for (let i = 0; i < 7; i++) {
        const x0 = L * 3 + (i - 3) * 1.5, a = (i - 3) * 0.2 + L * 0.12
        fioAssado(c, [[x0, 28], [x0 + a * 22 + (R() - 0.5) * 6, 38], [x0 + a * 12 + (R() - 0.5) * 10, 48], [x0 + a * 46, 57.5 - R() * 3]], i % 2 ? T.claro : LINHO, 1.4)
      }
      fioAssado(c, E([[2, 56], [10, 52], [14, 57], [8, 58]], L), LINHO, 1.2)
      const a = tubo(E([[0, 0], [2, 16], [3, 31]], L), [19, 6]); pano(c, a, o.tipo, { recuo: 3.4 })
      for (const y of [22, 27]) traco(c, [[L * 2.5 - 4.5, y], [L * 2.5 + 4.5, y + 1]], TINTA, esp(1.5, 1))
    },
  },
}

// ------------------------------------------------------------------ fontes de camada (uma por parte) e cache

const CAIXA = { cabeca: [-100, -150, 100, 34], tronco: [-64, -88, 64, 26], pernas: [-46, -12, 46, 72], bordado: [-25, -25, 25, 25] }
const caixaDoBraco = (L) => (L < 0 ? [-70, -46, 38, 116] : [-38, -46, 70, 116])
const ENCAIXES_TRONCO = { pescoco: { x: 0, y: -70 }, ombroE: { x: -36, y: -60 }, ombroD: { x: 36, y: -62 }, quadrilE: { x: -17, y: -4 }, quadrilD: { x: 17, y: -4 }, peito: { x: -15, y: -61 }, bordado: { x: 3, y: -31 } }
const tipoDaParte = (id) => { const p = PARTES[id]; return p ? p.tipo ?? CARTAS[p.carta]?.tipo ?? null : null }

/** Roda fn com o contexto de assado armado. Devolve as costuras guardadas. */
function emAssado(pd, fn) {
  const ant = B
  B = { s: pd.escala, ts: Math.max(pd.escala, 0.7), L: pd.luz ?? 1, fria: (pd.luz ?? 1) < 0, fio: pd.fio ?? FIO_RARIDADE.comum, costuras: [] }
  try { fn(); return B.costuras } finally { B = ant }
}
/** Assa uma camada num canvas: caixa = [x0, y0, x1, y1] em unidades, relativa ao pivô. */
function assar(caixa, pd, fn) {
  const [x0, y0, x1, y1] = caixa, s = pd.escala
  // willReadFrequently: o canvas assado é lido UMA vez por aparar(); na memória comum a leitura não espera a placa de vídeo
  // (sem isso, cada leitura custava ~3 ms e abrir a luta travava a tela 100–200 ms bem quando a música começa)
  const cv = novoCanvas((x1 - x0) * s, (y1 - y0) * s), c = cv.getContext('2d', { willReadFrequently: true })
  c.setTransform(s, 0, 0, s, -x0 * s, -y0 * s)
  const costuras = emAssado(pd, () => fn(c))
  return { canvas: cv, escala: s, pivo: { x: -x0 * s, y: -y0 * s }, costuras }
}

/** Recorta a camada na caixa do que foi de fato desenhado: menos pixels para pintar a cada quadro.
 *  Lê os pixels UMA vez, ao assar (nunca por quadro); o canvas lido é descartado e fica só o recorte. */
function aparar(cam) {
  const cv = cam.canvas, W = cv.width, H = cv.height
  const limites = (c2) => {
    const d = c2.getContext('2d').getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1
    for (let y = 0, i = 3; y < H; y++) for (let x = 0; x < W; x++, i += 4) if (d[i] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    return [x0, y0, x1, y1]
  }
  let [x0, y0, x1, y1] = limites(cv)
  if (cam.frente) { const b = limites(cam.frente); x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]) }
  if (x1 < x0) { x0 = y0 = 0; x1 = y1 = 1 }
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 2)
  const corta = (src) => { const n = novoCanvas(x1 - x0 + 1, y1 - y0 + 1); n.getContext('2d').drawImage(src, -x0, -y0); return n }
  cam.canvas = corta(cv); if (cam.frente) cam.frente = corta(cam.frente)
  cam.pivo = { x: cam.pivo.x - x0, y: cam.pivo.y - y0 }; cam.corte = { x: x0, y: y0 }
  return cam
}

/** A fonte de camada padrão de cada parte: o desenho por código deste arquivo. */
function fonteDeCodigo(id) {
  const desenha = desenhoDaParte(id)
  return (pd) => aparar(desenha(pd))
}
function desenhoDaParte(id) {
  const slot = PARTES[id].slot
  return (pd) => {
    const R = rng(hash(id + '|' + pd.lado)), o = { tipo: pd.tipo, R, lado: pd.lado }
    if (slot === 'cabeca') {
      const d = CABECAS[id], cam = assar(CAIXA.cabeca, pd, (c) => d.base(c, o))
      if (d.frente) { const fr = assar(CAIXA.cabeca, pd, (c) => d.frente(c, { ...o, R: rng(hash(id + 'frente')) })); cam.frente = fr.canvas; cam.costuras.push(...fr.costuras) }
      cam.rosto = d.rosto; cam.fios = d.fios; cam.encaixes = { topo: d.topo ?? { x: 0, y: -104 }, remendo: d.remendo }
      return cam
    }
    if (slot === 'tronco') { const d = TRONCOS[id], cam = assar(CAIXA.tronco, pd, (c) => d.base(c, o)); cam.encaixes = { ...ENCAIXES_TRONCO, ...(d.encaixes ?? {}) }; cam.barra = d.barra; return cam }
    if (slot === 'bracos') { const d = BRACOS[id], L = pd.lado, cam = assar(caixaDoBraco(L), pd, (c) => d.base(c, o)); cam.encaixes = { mao: d.mao?.(L) ?? { x: L * 15, y: 54 }, juntas: d.juntas?.(L) ?? JUNTAS_BRACO(L) }; return cam }
    if (slot === 'pernas') { const d = PERNAS[id], L = pd.lado, cam = assar(CAIXA.pernas, pd, (c) => d.base(c, o)); cam.encaixes = { pe: { x: L * 4, y: 58 }, juntas: d.juntas?.(L) ?? JUNTAS_PERNA(L) }; return cam }
    const cam = assar(CAIXA.bordado, pd, (c) => BORDADOS_DESENHO[PARTES[id].bordado](c)); cam.encaixes = {}; return cam
  }
}
TRONCOS.tr_la_tricotada.encaixes = { peito: { x: -15, y: -57 } }
TRONCOS.tr_feltro_manchado.encaixes = { peito: { x: -17, y: -60 } }
TRONCOS.tr_couro_rachado.encaixes = { peito: { x: -16, y: -58 } }

const FONTES = new Map()
let geracao = 0
/** Troca a fonte de camada de uma parte (ver o formato no topo do arquivo). fonte = null volta ao desenho por código. */
export function registrarFonteDeCamada(idDaParte, fonte) {
  if (typeof fonte === 'function') FONTES.set(idDaParte, fonte); else FONTES.delete(idDaParte)
  CACHE.clear(); geracao++
}
function normalizar(cam, slot, L) {
  const e = cam.escala
  cam.x0 = -cam.pivo.x / e; cam.y0 = -cam.pivo.y / e; cam.w = cam.canvas.width / e; cam.h = cam.canvas.height / e
  const en = cam.encaixes ?? (cam.encaixes = {})
  if (slot === 'tronco') for (const k in ENCAIXES_TRONCO) en[k] ??= ENCAIXES_TRONCO[k]
  if (slot === 'cabeca') en.topo ??= { x: 0, y: -104 }
  if (slot === 'bracos') { en.mao ??= { x: L * 15, y: 54 }; en.juntas ??= [] }
  if (slot === 'pernas') { en.pe ??= { x: L * 4, y: 58 }; en.juntas ??= [] }
  return cam
}
const CACHE = new Map()
function obterCamada(id, lado, s, luz, fio, raridade) {
  const chave = `${id}|${lado}|${s}|${luz}|${fio}|${geracao}`
  let cam = CACHE.get(chave)
  if (cam) return cam
  const slot = PARTES[id].slot, fonte = FONTES.get(id) ?? fonteDeCodigo(id)
  cam = normalizar(fonte({ id, slot, lado, escala: s, luz, fio, raridade, tipo: tipoDaParte(id) }), slot, lado)
  if (CACHE.size > 420) { let n = 80; for (const k of CACHE.keys()) { CACHE.delete(k); if (--n <= 0) break } }
  CACHE.set(chave, cam)
  return cam
}
function quantizar(s) { s = limita(s, 0.2, 3.2); const p = s <= 0.5 ? 0.05 : s <= 1.2 ? 0.1 : 0.2; return Math.round(Math.ceil(s / p - 1e-6) * p * 1000) / 1000 }

/** Camada só com as costuras acesas: 'aura' (brilho da Linha, rosa) ou 'ouro' (brilho que corre no Fio de Ouro / Lendária). */
function brilhoDe(cam, modo) {
  const nome = '_' + modo
  if (cam[nome] !== undefined) return cam[nome]
  if (!cam.costuras || !cam.costuras.length) return (cam[nome] = null)
  const cv = novoCanvas(cam.canvas.width, cam.canvas.height), c = cv.getContext('2d'), aura = modo === 'aura', cor = aura ? MALDICAO : '#FFF6D2'
  c.lineCap = 'round'; c.lineJoin = 'round'
  for (const k of cam.costuras) {
    c.setTransform(1, 0, 0, 1, -(cam.corte?.x ?? 0), -(cam.corte?.y ?? 0)); c.transform(k.m.a, k.m.b, k.m.c, k.m.d, k.m.e, k.m.f); c.setLineDash(TRACEJADO.map((v) => v * k.k))
    c.shadowColor = aura ? MALDICAO : '#FFC857'; c.shadowBlur = (aura ? 7 : 5) * cam.escala
    c.strokeStyle = cor; c.lineWidth = k.lw * (aura ? 1.5 : 1.3); c.stroke(k.p); if (aura) c.stroke(k.p)
  }
  c.setTransform(1, 0, 0, 1, 0, 0); c.shadowBlur = 0; c.shadowColor = 'transparent'; c.setLineDash([])
  c.globalCompositeOperation = 'destination-in'; c.drawImage(cam.canvas, 0, 0)
  return (cam[nome] = cv)
}

// ------------------------------------------------------------------ poses: só números (transformações das camadas e do rosto)

const facil = {
  sai: (t) => 1 - (1 - t) * (1 - t),
  sai3: (t) => 1 - Math.pow(1 - t, 3),
  entra: (t) => t * t,
  vai: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  volta: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) },
  quica: (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375 },
}
const ORDEM = {
  padrao: ['bD', 'pE', 'pD', 'tr', 'bE', 'fio', 'cb'],
  frente: ['pE', 'pD', 'tr', 'fio', 'bD', 'bE', 'cb'], // os dois braços na frente do tronco
  vitoria: ['bD', 'pE', 'pD', 'tr', 'fio', 'cb', 'bE'], // o braço erguido passa na frente da cabeça
  caido: ['pE', 'bD', 'tr', 'fio', 'bE', 'cb', 'pD'],
}
const novoQ = () => ({
  x: 0, y: 0, rot: 0, ex: 1, ey: 1, tr: 0, try: 0, tex: 1, tey: 1, cb: 0, cbx: 0, cby: 0, cex: 1, cey: 1,
  aE: 0, aD: 0, cE: 0, cD: 0, pE: 0, pD: 0, kE: 0, kD: 0,
  sobr: 0.8, sobrP: 0, abre: 0, curva: -0.55, torto: 0.25, bocaGiro: 0, solto: 0, soltoAng: 0, soltoTreme: 0, soltoSalto: 0, xis: 0,
  tremeX: 0, fioAlto: 0, balanco: 0, rotTopo: 0, dedal: 0, dedalY: 0, desmonte: 0, botaoNoChao: 0, arrasto: 0, fioPeso: 0, sombra: 1, ordem: ORDEM.padrao,
})
// Para onde cada camada vai quando o boneco desmonta no pano (espaço da raiz; d = atraso para cair "mole", em cascata).
const MONTE = {
  pE: { x: -24, y: -11, r: 1.5, c: 0.2, d: 0 },
  pD: { x: 6, y: -10, r: -1.42, c: -0.25, d: 0.05 },
  tr: { x: -8, y: -24, r: -1.3, sx: 0.78, sy: 0.95, d: 0.1 },
  bE: { x: -18, y: -9, r: 1.52, c: 0.25, d: 0.16 },
  bD: { x: -16, y: -42, r: -1.72, c: -0.6, d: 0.2 },
  cb: { x: -26, y: -52, r: 1.45, sx: 1, sy: 1, d: 0.24 },
}
const POSE_FN = {
  /** respira (±1,5% em 2,4 s), a cabeça balança, os braços vão atrás */
  parado(Q, p, t) {
    const r = Math.sin((t / 2400) * TAU), r2 = Math.sin((t / 2400) * TAU - 1.1)
    Q.ey = 1 + 0.015 * r; Q.ex = 1 - 0.009 * r
    Q.cb = 0.014 * Math.sin((t / 3300) * TAU + 0.7); Q.cby = -0.6 * r2
    Q.aE = 0.04 * r2; Q.aD = -0.04 * Math.sin((t / 2400) * TAU - 1.9)
  },
  /** encolhe antes do golpe: amassa, inclina para trás e arma o braço acima da cabeça */
  preparo(Q, p) {
    const e = facil.sai3(p)
    Q.ey = 1 - 0.15 * e; Q.ex = 1 + 0.1 * e; Q.rot = -0.1 * e; Q.x = -5 * e
    Q.aD = -2.45 * e; Q.cD = 0.55 * e; Q.aE = -0.5 * e; Q.cE = -0.35 * e
    Q.cb = -0.07 * e; Q.cby = 3 * e; Q.pE = 0.1 * e; Q.pD = -0.06 * e
    Q.sobr = 1; Q.curva = -0.75; Q.arrasto = 6 * e
  },
  /** estica e avança: o braço desce de cima para a frente; volta com sobra (braços, cabeça e fios chegam atrasados) */
  golpe(Q, p) {
    const av = (q) => facil.sai3(trecho(q, 0, 0.36)) * (1 - facil.vai(trecho(q, 0.5, 0.86)))
    const A = av(p), Ab = av(p - 0.06), Ac = av(p - 0.12), fim = Math.sin(Math.PI * trecho(p, 0.8, 1))
    const voa = Math.sin(Math.PI * trecho(p, 0, 0.36)), bate = Math.sin(Math.PI * trecho(p, 0.34, 0.52))
    const arma = 1 - facil.sai(trecho(p, 0, 0.22)) // o que sobra da pose "preparo" (o golpe começa armado)
    Q.x = 46 * A - 4 * fim - 5 * arma; Q.y = -7 * voa; Q.rot = 0.2 * A - 0.05 * fim - 0.1 * arma
    Q.ex = 1 + 0.13 * voa - 0.09 * bate + 0.1 * arma; Q.ey = 1 - 0.07 * voa + 0.07 * bate - 0.15 * arma
    Q.aD = -2.45 * arma - 1.5 * Ab * (1 - arma) + 0.3 * fim; Q.cD = 0.55 * arma - 0.4 * voa * (1 - arma) + 0.45 * bate + 0.25 * fim
    Q.aE = -0.5 * arma + 0.95 * Ac - 0.2 * fim; Q.cE = -0.35 * arma + 0.5 * voa - 0.2 * fim
    Q.cb = -0.07 * arma + 0.15 * Ab - 0.1 * fim; Q.cbx = 5 * Ab; Q.cby = 3 * arma
    Q.pE = 0.1 * arma + 0.4 * A; Q.pD = -0.06 * arma - 0.32 * A; Q.kD = -0.2 * A
    Q.abre = Math.min(1, A * 1.4); Q.sobr = 1; Q.curva = mix(-0.25, -0.75, arma); Q.arrasto = -34 * (A - Ac) + 6 * arma
    if (arma > 0.5) Q.ordem = ORDEM.padrao
  },
  /** amassa, recua, treme (até 6 px, ~120 ms); o olho pequeno salta e fica pendurado um instante */
  golpeado(Q, p, t, rig, menos) {
    const k = 1 - facil.sai(trecho(p, 0, 0.9)), kb = 1 - facil.sai(trecho(p - 0.07, 0, 0.9)), bate = Math.sin(Math.PI * trecho(p, 0, 0.32))
    const m = Math.exp(-5 * p) * Math.sin(p * 26)
    Q.x = -17 * k; Q.rot = -0.17 * k + 0.03 * m; Q.ey = 1 - 0.17 * bate; Q.ex = 1 + 0.12 * bate
    if (!menos && p < 0.36) Q.tremeX = Math.sin(p * 55) * 6 * (1 - p / 0.36)
    Q.aE = 1.05 * kb + 0.2 * m; Q.aD = -1.05 * kb - 0.2 * m; Q.cE = -0.5 * kb; Q.cD = 0.5 * kb
    Q.cb = -0.26 * kb + 0.1 * m; Q.cbx = -4 * k; Q.pE = -0.15 * k; Q.pD = -0.25 * k
    Q.solto = facil.sai(trecho(p, 0, 0.1)) * (1 - facil.entra(trecho(p, 0.62, 0.95))); Q.soltoSalto = Math.max(0, 1 - p / 0.16); Q.soltoAng = 0.5 * m + 0.25 * k
    Q.sobr = mix(0.8, -0.6, Math.min(1, k * 1.6)); Q.abre = 0.6 * Math.min(1, k * 1.5); Q.curva = -0.9; Q.arrasto = 16 * k
  },
  /** cruza os braços e o dedal desce na cabeça (quica uma vez) */
  escudo(Q, p) {
    const ag = facil.sai3(trecho(p, 0, 0.3)), cai = facil.entra(trecho(p, 0.05, 0.45)), b = trecho(p, 0.45, 0.78), bate = Math.sin(Math.PI * trecho(p, 0.45, 0.62))
    Q.dedal = 1; Q.dedalY = -120 * (1 - cai) - 9 * Math.abs(Math.sin(b * Math.PI * 2)) * (1 - b)
    Q.ey = 1 - 0.05 * ag - 0.07 * bate; Q.ex = 1 + 0.04 * ag + 0.05 * bate; Q.cey = 1 - 0.07 * bate; Q.cby = 2 * bate
    Q.aE = -0.95 * ag; Q.cE = -0.75 * ag; Q.aD = 0.95 * ag; Q.cD = 0.75 * ag
    Q.sobr = 0.95; Q.curva = -0.65; Q.ordem = ORDEM.frente
  },
  /** cai, e um fio vindo do alto o segura: pendurado, balançando como pêndulo de 1,2 s, um olho pendurado pela linha */
  ultimoFio(Q, p, t, rig, menos) {
    const cai = facil.entra(trecho(p, 0, 0.3)), puxa = facil.volta(trecho(p, 0.3, 0.72)), solta = 1 - trecho(p, 0.3, 0.5)
    const w = (t / 1200) * TAU, s1 = Math.sin(w), s2 = Math.sin(w - 0.8), s3 = Math.sin(w - 1.7)
    const amp = puxa * (1 + 1.2 * (1 - trecho(p, 0.55, 1)))
    Q.y = 30 * cai * solta - 21 * puxa; Q.ey = 1 - 0.24 * cai * solta + 0.035 * puxa; Q.ex = 1 + 0.1 * cai * solta - 0.02 * puxa
    Q.fioAlto = trecho(p, 0.22, 0.34); Q.balanco = 10 * s1 * amp; Q.rotTopo = 0.075 * s2 * amp; Q.tey = 1 + 0.04 * puxa
    Q.cb = 0.1 * puxa + 0.04 * s2 * amp + 0.3 * cai * solta; Q.cby = 2 * puxa; Q.tr = -0.06 * puxa + 0.05 * s3 * amp
    Q.aE = -0.2 * puxa + 0.5 * cai * solta + 0.13 * s3 * amp; Q.aD = 0.2 * puxa - 0.5 * cai * solta + 0.13 * s3 * amp
    Q.cE = 0.14 * s3 * amp; Q.cD = 0.14 * s3 * amp
    Q.pE = -0.02 * puxa + 0.12 * s3 * amp; Q.pD = 0.06 * puxa + 0.12 * s3 * amp; Q.kE = 0.16 * s3 * amp + 0.1 * puxa; Q.kD = 0.16 * s3 * amp - 0.1 * puxa
    Q.solto = Math.max(puxa, trecho(p, 0.05, 0.2)); Q.soltoAng = -0.35 * s3 * amp - Q.cb; Q.soltoTreme = menos ? 0 : Math.sin(t / 37) * 0.9
    Q.sobr = -0.15; Q.abre = 0.22; Q.curva = -0.9; Q.torto = -0.3; Q.fioPeso = 0.6 * puxa; Q.sombra = 1 - 0.35 * puxa
  },
  /** desmonta mole no pano; olhos em X */
  caido(Q, p) {
    const d = Math.sin(Math.PI * trecho(p, 0, 0.3))
    Q.desmonte = p; Q.xis = p > 0.2 ? 1 : 0; Q.ey = 1 - 0.14 * d; Q.ex = 1 + 0.08 * d
    Q.abre = 0.12 + 0.3 * Math.sin(Math.PI * Math.min(1, p * 2)); Q.curva = -0.2; Q.torto = 0.6
    Q.fioPeso = facil.sai(p); Q.sombra = 1 + 0.3 * p; Q.botaoNoChao = trecho(p, 0.25, 0.8); Q.ordem = p > 0.3 ? ORDEM.caido : ORDEM.padrao
  },
  /** pulinho torto e braço para cima; depois fica acenando o punho */
  vitoria(Q, p, t) {
    const prep = Math.sin(Math.PI * trecho(p, 0, 0.16)), pulo = Math.sin(Math.PI * trecho(p, 0.14, 0.62)), pousa = Math.sin(Math.PI * trecho(p, 0.62, 0.82))
    const sobe = facil.volta(trecho(p, 0.1, 0.5)), fica = trecho(p, 0.82, 1), resp = Math.sin((t / 2400) * TAU), acena = Math.sin(t / 170)
    Q.y = -26 * pulo; Q.rot = -0.11 * pulo + 0.035 * fica
    Q.ey = 1 - 0.1 * prep + 0.07 * pulo - 0.1 * pousa + 0.015 * resp * fica; Q.ex = 1 + 0.07 * prep - 0.05 * pulo + 0.08 * pousa
    Q.aE = 2.3 * sobe + 0.1 * acena * fica; Q.cE = -0.3 * sobe + 0.12 * acena * fica; Q.aD = -0.4 * sobe - 0.25 * pulo; Q.cD = 0.3 * pulo
    Q.pE = 0.3 * pulo; Q.pD = -0.3 * pulo; Q.kE = 0.3 * pulo; Q.kD = -0.3 * pulo; Q.cb = 0.1 * sobe
    Q.sobr = 0.8 - 0.45 * sobe; Q.curva = mix(-0.55, 1, limita(sobe, 0, 1)); Q.torto = 0.25 + 0.6 * sobe; Q.abre = 0.5 * limita(sobe, 0, 1)
    Q.ordem = sobe > 0.45 ? ORDEM.vitoria : ORDEM.padrao
  },
}
// Qual número do repouso mole é a curva de cada membro (assada no bitmap do membro).
const CURVA_DE_REPOUSO = { bE: 'cE', bD: 'cD', pE: 'kE', pD: 'kD' }
// "Menos animação": cada pose vira um quadro parado (sem tremida, sem pêndulo); a tela troca de pose esmaecendo.
const PASSO_CALMO = { preparo: () => 1, golpe: (p) => (p < 0.62 ? 0.4 : 1), golpeado: (p) => (p < 0.62 ? 0.22 : 1), escudo: () => 1, ultimoFio: () => 1, caido: () => 1, vitoria: () => 1 }

// ------------------------------------------------------------------ desenho das camadas

/** Desenha uma camada; com curva, dobra em fatias ao longo das juntas (membro mole). */
function mole(ctx, cv, cm, curva) {
  const jt = cm.encaixes.juntas
  if (!jt || !jt.length || Math.abs(curva) < 0.012) { ctx.drawImage(cv, cm.x0, cm.y0, cm.w, cm.h); return }
  const n = jt.length, da = curva / n, e = cm.escala, H = cv.height, sobra = 2 + Math.ceil(Math.abs(da) * 15 * e)
  ctx.save()
  let sy = 0
  for (let i = 0; i <= n; i++) {
    const fim = i < n ? limita(Math.round((jt[i].y - cm.y0) * e), sy, H) : H, sh = Math.min(H - sy, fim - sy + (i < n ? sobra : 0))
    if (sh > 0) ctx.drawImage(cv, 0, sy, cv.width, sh, cm.x0, cm.y0 + sy / e, cm.w, sh / e)
    if (i < n) { ctx.translate(jt[i].x, jt[i].y); ctx.rotate(da); ctx.translate(-jt[i].x, -jt[i].y) }
    sy = fim
  }
  ctx.restore()
}
let sombraCv = null
function sombraDeContato() {
  if (sombraCv) return sombraCv
  sombraCv = novoCanvas(160, 40); const c = sombraCv.getContext('2d'); c.scale(1, 0.25)
  const g = c.createRadialGradient(80, 80, 6, 80, 80, 78); g.addColorStop(0, 'rgba(20,12,31,0.72)'); g.addColorStop(0.6, 'rgba(20,12,31,0.36)'); g.addColorStop(1, 'rgba(20,12,31,0)')
  c.fillStyle = g; c.fillRect(0, 0, 160, 160)
  return sombraCv
}
const cacheDedal = new Map()
function dedal(s, L) {
  const chave = s + '|' + L
  let d = cacheDedal.get(chave)
  if (d) return d
  d = normalizar(aparar(assar([-38, -58, 38, 14], { escala: s, luz: L }, (c) => {
    const f = curvaFechada([[-25, 3], [-26, -9], [-24, -30], [-19, -45], [-9, -53.5], [0, -55], [9, -53.5], [19, -45], [24, -30], [26, -9], [25, 3], [0, 7.5]], 8)
    pano(c, f, '#A9B1BE', { semPesponto: true, dentro: (c) => {
      for (let y = -47, i = 0; y < -14; y += 5.6, i++) for (let x = -24 + (i % 2) * 2.8; x < 26; x += 5.6) { c.fillStyle = 'rgba(20,12,31,0.34)'; circ(c, x, y, 1.35); c.fill(); c.fillStyle = 'rgba(255,255,255,0.45)'; circ(c, x + 0.6 * B.L, y + 0.75, 0.6); c.fill() }
      c.fillStyle = 'rgba(255,255,255,0.42)'; c.beginPath(); c.ellipse(-12 * B.L, -28, 3.6, 18, 0.1 * B.L, 0, TAU); c.fill()
      arcoQ(c, [-26, -12], [0, -7.5], [26, -12], 'rgba(20,12,31,0.5)', 1.4)
    } })
    pano(c, tubo([[-24.5, -2.5], [0, 2.5], [24.5, -2.5]], [7.5, 7.5]), '#D5DBE3', { semPesponto: true, contorno: 2.2 })
  })), 'dedal', 0)
  if (cacheDedal.size > 12) cacheDedal.clear()
  cacheDedal.set(chave, d)
  return d
}
/** O fio da maldição: escapa da costura do peito e ondula. */
function fioDaMaldicao(c, ax, ay, t, Q, s, forca) {
  const w = (f, ph) => Math.sin(t / f + ph), a = Q.arrasto, g = Q.fioPeso
  const x1 = ax - 12 + 2.5 * w(610, 0.4) + a * 0.3, y1 = ay - 16 + 3 * w(830, 1.9) + g * 18
  const x2 = ax - 30 + 5 * w(740, 2.2) + a * 0.8, y2 = ay + 8 + 6 * w(520, 0.7) + g * 22
  const x3 = ax - 50 + 8 * w(900, 3.1) + a * 1.3, y3 = ay - 10 + 9 * w(660, 4.4) + g * 40
  const x4 = x3 - 9 + 4 * w(480, 1.3) + a * 0.4, y4 = y3 - 9 + 5 * w(570, 2.6) + g * 12
  c.beginPath(); c.moveTo(ax, ay); c.bezierCurveTo(x1, y1, x2, y2, x3, y3); c.quadraticCurveTo(x3 - 7, y3 + 2, x4, y4); c.lineCap = 'round'; c.lineJoin = 'round'
  c.strokeStyle = 'rgba(20,12,31,0.55)'; c.lineWidth = Math.max(3, 1.9 / s); c.stroke()
  c.globalCompositeOperation = 'lighter'
  c.strokeStyle = `rgba(255,77,141,${0.24 + 0.22 * forca})`; c.lineWidth = Math.max(5, 3 / s); c.stroke()
  c.globalCompositeOperation = 'source-over'
  c.strokeStyle = '#FF7CAB'; c.lineWidth = Math.max(1.7, 1.15 / s); c.stroke()
}

function ler(partes) {
  const o = {}
  for (const slot of ['tronco', 'cabeca', 'bracos', 'pernas', 'bordado']) {
    const [id, rar] = String(partes[slot] ?? '').split('@')
    if (!PARTES[id] || PARTES[id].slot !== slot) throw new Error(`Parte desconhecida em ${slot}: ${partes[slot]}`)
    o[slot] = { id, rar: FIO_RARIDADE[rar] ? rar : 'comum' }
  }
  return o
}

class Rig {
  constructor(partes, o = {}) {
    this.P = ler(partes)
    this.remendos = limita(Math.round(o.remendos ?? 0), 0, 5)
    this.trofeus = (o.trofeus ?? []).filter((t) => TEC[t]).slice(0, 12)
    this.ouro = !!o.fioDeOuro
    this.brilhaOuro = this.ouro || Object.values(this.P).some((p) => p.rar === 'lendaria')
    this.semente = hash(String(o.semente ?? Object.values(partes).join('|')))
    const R = rng(this.semente)
    this.incl = (R() < 0.5 ? -1 : 1) * (0.055 + R() * 0.05) // cabeça inclinada de 3° a 6°
    this.ombro = R() < 0.5 ? -1 : 1; this.ombroDy = 2.5 + R() * 2.5 // um ombro mais baixo
    this.fase = Math.floor(R() * 6000)
    // repouso MOLE (estável por boneco): braços em arco, pernas um pouco abertas e tortas, tronco inclinado
    this.rep = { aE: 0.15 + R() * 0.12, aD: -(0.13 + R() * 0.12), cE: -(0.3 + R() * 0.2), cD: 0.28 + R() * 0.2, pE: 0.07 + R() * 0.07, pD: -(0.06 + R() * 0.07), kE: -(0.1 + R() * 0.1), kD: 0.1 + R() * 0.1, tr: (R() - 0.5) * 0.08 }
    const tb = TEC[tipoDaParte(this.P.bracos.id)] ?? TEC.la, tp = TEC[tipoDaParte(this.P.pernas.id)] ?? TEC.la, tc = TEC[tipoDaParte(this.P.cabeca.id)] ?? TEC.la
    // fiapos soltos nas juntas: [onde, dx, dy, ângulo, comprimento, cor, fase]
    this.fiapos = [
      ['bE', -7, -4, -2.5 + R() * 0.5, 8 + R() * 4, tb.claro, R() * 6], ['bD', 7, -5, -0.8 + R() * 0.5, 7 + R() * 4, LINHO, R() * 6],
      ['cb', -17, 0, 2.7 + R() * 0.4, 7 + R() * 3, tc.claro, R() * 6], ['pE', -10, 3, 2.6 + R() * 0.4, 7 + R() * 4, LINHO, R() * 6], ['pD', 10, 2, 0.4 + R() * 0.4, 8 + R() * 4, tp.claro, R() * 6],
    ]
    this.corDoFiapo = misturaCor(tb.claro, LINHO, 0.5)
    this._cams = new Map()
  }

  /** Caixa em que todo boneco cabe (fios soltos podem passar 8%). */
  caixa(altura) { return { largura: altura * 0.72, altura } }

  /** As camadas deste boneco numa escala e num lado da luz (guardadas). */
  camadas(s, luz) {
    const chave = s + '|' + luz + '|' + geracao
    let C = this._cams.get(chave)
    if (C) return C
    const P = this.P, fio = (slot) => (this.ouro ? FIO_RARIDADE.ouro : FIO_RARIDADE[P[slot].rar])
    const g = (slot, lado) => obterCamada(P[slot].id, lado, s, luz, fio(slot), P[slot].rar)
    C = { tr: g('tronco', 0), cb: g('cabeca', 0), bE: g('bracos', -1), bD: g('bracos', 1), pE: g('pernas', -1), pD: g('pernas', 1), bo: g('bordado', 0), s, luz }
    C.extra = this._extras(C, s, luz)
    if (this._cams.size > 5) this._cams.clear()
    this._cams.set(chave, C)
    return C
  }

  /** O rosto da pose "parado" guardado num bitmap (olhos, frente da cabeça, sobrancelhas e boca): 1 desenho por quadro em vez de dezenas. */
  _rostoParado(C, tipoCab) {
    if (C.rosto) return C.rosto
    const cb = C.cb, m = 18, s = C.s, x0 = cb.x0 - m, y0 = cb.y0 - m
    const cv = novoCanvas((cb.w + 2 * m) * s, (cb.h + 2 * m) * s), c = cv.getContext('2d', { willReadFrequently: true })
    c.setTransform(s, 0, 0, s, -x0 * s, -y0 * s)
    desenharRosto(c, cb, novoQ(), 0, s, C.luz, cb.frente ? () => c.drawImage(cb.frente, cb.x0, cb.y0, cb.w, cb.h) : null, tipoCab)
    return (C.rosto = normalizar(aparar({ canvas: cv, escala: s, pivo: { x: -x0 * s, y: -y0 * s } }), 'rosto', 0))
  }

  /** Uma camada pronta para pintar com UM desenho: a parte + o brilho da Linha (nível 0..4) + o remendo dela
   *  (+ o bordado e os troféus, no tronco; + a frente e o rosto parado, na cabeça). Guardada por boneco; refaz quando o nível muda. */
  _composta(C, key, nivel, comRosto, tipoCab) {
    if (C.nivel !== nivel) { C.comp = new Map(); C.nivel = nivel }
    const ch = comRosto ? 'cb+rosto' : key
    let o = C.comp.get(ch)
    if (o) return o
    const cm = C[key], s = C.s, pecas = []
    const peca = (b, img = b.canvas, dx = 0, dy = 0, alfa = 1, modo = 'source-over') => { const k = s / b.escala; pecas.push([img, Math.round(b.pivo.x * k - dx * s), Math.round(b.pivo.y * k - dy * s), alfa, modo, k]) }
    peca(cm)
    if (nivel > 0) { const g = brilhoDe(cm, 'aura'); if (g) peca(cm, g, 0, 0, 0.2 * nivel, 'lighter') }
    if (key === 'tr') { const b = cm.encaixes.bordado; peca(C.bo, C.bo.canvas, b.x, b.y) }
    if (C.extra[key]) peca(C.extra[key])
    if (key === 'cb') { if (comRosto) peca(this._rostoParado(C, tipoCab)); else if (cm.frente && !cm.rosto) peca(cm, cm.frente) }
    if (pecas.length === 1 && cm.escala === s) o = cm // nada a juntar: pinta a parte como veio
    else {
      let ox = 0, oy = 0, w = 0, h = 0
      for (const [, x, y] of pecas) { ox = Math.max(ox, x); oy = Math.max(oy, y) }
      for (const [img, x, y, , , k] of pecas) { w = Math.max(w, ox - x + Math.ceil(img.width * k)); h = Math.max(h, oy - y + Math.ceil(img.height * k)) }
      const cv = novoCanvas(w, h), c = cv.getContext('2d')
      for (const [img, x, y, alfa, modo, k] of pecas) { c.globalAlpha = alfa; c.globalCompositeOperation = modo; if (k === 1) c.drawImage(img, ox - x, oy - y); else c.drawImage(img, ox - x, oy - y, img.width * k, img.height * k) }
      o = { canvas: cv, escala: s, pivo: { x: ox, y: oy }, x0: -ox / s, y0: -oy / s, w: w / s, h: h / s, encaixes: cm.encaixes }
    }
    // membros: a curva do repouso mole fica assada aqui (o membro parado sai com UM desenho; as poses dobram por cima)
    const rc = CURVA_DE_REPOUSO[key] ? this.rep[CURVA_DE_REPOUSO[key]] : 0, jt = cm.encaixes.juntas
    if (rc && jt && jt.length && o.x0 != null) {
      const m = 34, cv = novoCanvas(o.canvas.width + 2 * m * s, o.canvas.height + 2 * m * s), c = cv.getContext('2d', { willReadFrequently: true }), px = Math.round(-o.x0 * s + m * s), py = Math.round(-o.y0 * s + m * s)
      c.setTransform(s, 0, 0, s, px, py); mole(c, o.canvas, o, rc)
      const da = rc / jt.length, co = Math.cos(da), si = Math.sin(da), jt2 = []
      let M = [1, 0, 0, 1, 0, 0]
      for (const j of jt) {
        jt2.push({ x: M[0] * j.x + M[2] * j.y + M[4], y: M[1] * j.x + M[3] * j.y + M[5] })
        const N = [co, si, -si, co, j.x - co * j.x + si * j.y, j.y - si * j.x - co * j.y]
        M = [M[0] * N[0] + M[2] * N[1], M[1] * N[0] + M[3] * N[1], M[0] * N[2] + M[2] * N[3], M[1] * N[2] + M[3] * N[3], M[0] * N[4] + M[2] * N[5] + M[4], M[1] * N[4] + M[3] * N[5] + M[5]]
      }
      o = normalizar(aparar({ canvas: cv, escala: s, pivo: { x: px, y: py }, encaixes: { ...cm.encaixes, juntas: jt2 } }), 'membro', 0)
      o.dobrado = true
    }
    C.comp.set(ch, o)
    return o
  }

  /** Remendos (sempre nos mesmos lugares) e retalhos de troféu (na barra do tronco): camadas por cima das partes. */
  _extras(C, s, luz) {
    const n = this.remendos, X = {}, pd = { escala: s, luz }
    const sobre = (cm, caixa, fn) => { // desenha por cima de uma parte e recorta pelo contorno dela
      const e = assar(caixa, pd, fn), c = e.canvas.getContext('2d')
      if (cm.corte && cm.escala === s) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-in'; c.drawImage(cm.canvas, cm.corte.x, cm.corte.y); c.globalCompositeOperation = 'source-over' }
      return e
    }
    const fecha = (e) => normalizar(aparar(e), 'extra', 0)
    if (n >= 1 || this.trofeus.length) {
      const e = sobre(C.tr, CAIXA.tronco, (c) => { if (n >= 1) remendo(c, -23, -17, 0, -0.2, 17); if (n >= 5) remendo(c, 23, -53, 4, 0.3, 14.5) })
      if (this.trofeus.length) {
        const c = e.canvas.getContext('2d'), b = C.tr.barra ?? { l: 34, y: 2 }
        c.setTransform(s, 0, 0, s, e.pivo.x, e.pivo.y)
        emAssado(pd, () => this.trofeus.forEach((tipo, i) => {
          const u = ((i + 0.5) / 12) * 2 - 1
          c.save(); c.translate(u * b.l, b.y - u * u * 6 + 2); c.rotate((i % 2 ? 0.16 : -0.13) + u * 0.25)
          pano(c, curvaFechada([[-3.1, -3.8], [-3.1, -3.8], [3.1, -3.8], [3.1, -3.8], [3.4, 4.2], [3.4, 4.2], [-3.4, 4.2], [-3.4, 4.2]], 2), tipo, { semPesponto: true, contorno: 1.3, volume: 0.7 })
          traco(c, [[-1.7, -3.6], [1.7, -2.3]], LINHO, esp(1.1, 0.8))
          c.restore()
        }))
      }
      X.tr = fecha(e)
    }
    if (n >= 2) { const r = C.cb.encaixes.remendo ?? [30, -92, 0.3]; X.cb = fecha(sobre(C.cb, CAIXA.cabeca, (c) => remendo(c, r[0], r[1], 1, r[2], 17))) }
    if (n >= 3) X.bE = fecha(sobre(C.bE, caixaDoBraco(-1), (c) => remendo(c, -3, 9, 2, 0.4, 13.5)))
    if (n >= 4) X.pD = fecha(sobre(C.pD, CAIXA.pernas, (c) => remendo(c, 0.5, 15, 3, -0.3, 13.5)))
    return X
  }

  /** Desenha o boneco. (x, y) = ponto do pé no chão; altura em px; estado: ver o contrato no topo. */
  desenhar(ctx, x, y, altura, tempoMs = 0, estado = {}) {
    const nome = POSE_FN[estado.pose] ? estado.pose : 'parado'
    const menos = !!estado.menosAnimacao, luz = estado.lado === 'B' ? -1 : 1
    let p = limita(estado.progresso ?? 1, 0, 1)
    if (menos && PASSO_CALMO[nome]) p = PASSO_CALMO[nome](p)
    const k = altura / ALTURA_BASE, m = ctx.getTransform()
    const s = quantizar(Math.hypot(m.a, m.b) * k)
    const C = this.camadas(s, luz), t = menos ? 0 : tempoMs + this.fase
    const Q = novoQ(); POSE_FN[nome](Q, p, t, this, menos)
    const forca = limita(estado.brilhoDaLinha ?? 0, 0, 1)
    const en = C.tr.encaixes, hipY = -C.pE.encaixes.pe.y, trY = hipY - en.quadrilE.y

    // onde fica cada camada, no espaço da raiz (pé em 0,0)
    const rp = this.rep, T = { x: 0, y: trY + Q.try, r: Q.tr + rp.tr, sx: Q.tex, sy: Q.tey }
    const pt = (a, dx = 0, dy = 0) => { const cx = a.x * T.sx, cy = a.y * T.sy, co = Math.cos(T.r), si = Math.sin(T.r); return [T.x + cx * co - cy * si + dx, T.y + cx * si + cy * co + dy] }
    const oE = pt(en.ombroE, 0, this.ombro < 0 ? this.ombroDy : 0), oD = pt(en.ombroD, 0, this.ombro > 0 ? this.ombroDy : 0), pc = pt(en.pescoco, Q.cbx, Q.cby)
    const cam = {
      tr: T,
      cb: { x: pc[0], y: pc[1], r: Q.tr + this.incl + Q.cb, sx: Q.cex, sy: Q.cey },
      bE: { x: oE[0], y: oE[1], r: Q.tr * 0.5 + rp.aE + Q.aE, c: Q.cE }, bD: { x: oD[0], y: oD[1], r: Q.tr * 0.5 + rp.aD + Q.aD, c: Q.cD },
      pE: { x: en.quadrilE.x, y: hipY, r: rp.pE + Q.pE, c: Q.kE }, pD: { x: en.quadrilD.x, y: hipY, r: rp.pD + Q.pD, c: Q.kD },
    }
    if (Q.desmonte > 0) for (const key in MONTE) {
      const h = MONTE[key], a = cam[key], e = facil.quica(trecho(Q.desmonte, h.d, h.d + 0.7))
      a.x = mix(a.x, h.x, e); a.y = mix(a.y, h.y, e); a.r = mix(a.r, h.r, e)
      if (h.sx != null) { a.sx = mix(a.sx ?? 1, h.sx, e); a.sy = mix(a.sy ?? 1, h.sy, e) }
      if (h.c != null) a.c = mix(a.c, h.c, e)
    }

    ctx.save()
    ctx.translate(x + Q.tremeX, y)
    if (!estado.semSombra) {
      const sw = altura * 0.66 * (1 + 0.3 * Q.desmonte) * Q.sombra, sh = altura * 0.105
      ctx.globalAlpha = limita(0.95 * (Q.sombra > 1 ? 1 : Q.sombra), 0, 1)
      ctx.drawImage(sombraDeContato(), -sw / 2 + Q.x * k * luz * 0.85, -sh / 2 + altura * 0.004, sw, sh); ctx.globalAlpha = 1
    }
    ctx.scale(k * luz, k)
    ctx.translate(Q.x, Q.y)
    const Lp = Math.max(ALTURA_BASE * 1.15, estado.fioAteY != null ? (y - estado.fioAteY) / k : ALTURA_BASE * 1.9)
    if (Q.balanco) { ctx.translate(0, -Lp); ctx.rotate(Q.balanco / (Lp - 190)); ctx.translate(0, Lp) }
    if (Q.fioAlto > 0) { // o fio que vem do alto
      ctx.globalAlpha = Q.fioAlto; ctx.lineCap = 'round'
      const tp = C.cb.encaixes.topo, r = cam.cb.r, co = Math.cos(r), si = Math.sin(r), ty = tp.y + 12
      let hx = cam.cb.x + tp.x * co - ty * si, hy = cam.cb.y + tp.x * si + ty * co
      if (Q.rotTopo) { const c2 = Math.cos(Q.rotTopo), s2 = Math.sin(Q.rotTopo), dx = hx, dy = hy + 205; hx = dx * c2 - dy * s2; hy = dx * s2 + dy * c2 - 205 }
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(0, -Lp); ctx.strokeStyle = TINTA; ctx.lineWidth = Math.max(3.6, 2.4 / s); ctx.stroke()
      if (estado.fioAteY == null) { const g = ctx.createLinearGradient(0, -Lp, 0, -Lp + 70); g.addColorStop(0, 'rgba(242,230,201,0)'); g.addColorStop(1, LINHO); ctx.strokeStyle = g } else ctx.strokeStyle = LINHO
      ctx.lineWidth = Math.max(1.8, 1.2 / s); ctx.stroke(); ctx.globalAlpha = 1
    }
    if (Q.rotTopo) { ctx.translate(0, -205); ctx.rotate(Q.rotTopo); ctx.translate(0, 205) }
    ctx.rotate(Q.rot); ctx.scale(Q.ex, Q.ey)

    // brilho que corre devagar pela costura (Fio de Ouro e Lendária)
    let faixa = null
    if (this.brilhaOuro && !menos) {
      const f = (t % 4600) / 2300
      if (f < 1) { const bx = -150 + f * 300; faixa = new Path2D(); faixa.moveTo(bx + 22, -270); faixa.lineTo(bx + 62, -270); faixa.lineTo(bx - 22, 30); faixa.lineTo(bx - 62, 30); faixa.closePath() }
    }
    const por = (a) => { ctx.translate(a.x, a.y); ctx.rotate(a.r); if (a.sx != null) ctx.scale(a.sx, a.sy) }
    // cada camada sai num bitmap só: parte + brilho da Linha (no nível de agora) + remendo (+ bordado no tronco, + rosto parado na cabeça)
    const nivel = Math.ceil(forca * 4 - 0.001), parado = !!C.cb.rosto && rostoPadrao(Q), tipoCab = tipoDaParte(this.P.cabeca.id)
    const camada = (key) => {
      const a = cam[key], cm = this._composta(C, key, nivel, key === 'cb' && parado, tipoCab), curva = a.c ?? 0
      ctx.save(); por(a); mole(ctx, cm.canvas, cm, curva); ctx.restore()
      if (faixa) { const base = C[key], g = brilhoDe(base, 'ouro'); if (g) { ctx.save(); ctx.clip(faixa); por(a); ctx.globalCompositeOperation = 'lighter'; mole(ctx, g, base, curva + (cm.dobrado ? this.rep[CURVA_DE_REPOUSO[key]] : 0)); ctx.restore() } }
    }
    for (const key of Q.ordem) {
      if (key === 'fio') {
        // fiapos soltos nas juntas e o fio da maldição
        fiosVivos(ctx, this.fiapos.map(([onde, dx, dy, ang, comp, , fase]) => [cam[onde].x + dx, cam[onde].y + dy, ang + Q.fioPeso * (Math.PI / 2 - ang) * 0.5, comp, this.corDoFiapo, fase]), t, Q.arrasto * 0.25, s, 1.2)
        const a = pt(en.peito)
        fioDaMaldicao(ctx, a[0], a[1], t, Q, s, forca * (menos ? 0.8 : 0.7 + 0.3 * Math.sin(t / 430)))
      } else if (key === 'cb') {
        camada('cb')
        ctx.save(); por(cam.cb)
        const cb = C.cb
        if (cb.rosto && !parado) desenharRosto(ctx, cb, Q, t, s, luz, cb.frente ? () => ctx.drawImage(cb.frente, cb.x0, cb.y0, cb.w, cb.h) : null, tipoCab)
        if (cb.rosto && Q.xis < 0.5) brilhoDoBotao(ctx, cb.rosto, Q, t, this.semente)
        if (cb.fios) { const T2 = TEC[tipoCab] ?? TEC.la, baixo = Math.PI / 2 - cam.cb.r
          fiosVivos(ctx, cb.fios.map(([fx, fy, ang, comp, cor], i) => [fx, fy, ang + Q.fioPeso * (baixo - ang) * 0.75, comp, cor === 'linho' ? LINHO : T2[cor], i * 1.37]), t, Q.arrasto * 0.5, s, 1.9) }
        ctx.restore()
      } else camada(key)
    }
    if (Q.dedal > 0) { // o dedal desce na cabeça
      const d = dedal(s, luz), tp = C.cb.encaixes.topo
      ctx.save(); por(cam.cb); ctx.translate(tp.x + 2, tp.y + 17 + Q.dedalY); ctx.rotate(-0.13 - this.incl); ctx.drawImage(d.canvas, d.x0, d.y0, d.w, d.h); ctx.restore()
    }
    if (Q.botaoNoChao > 0 && C.cb.rosto) { // o botão que se soltou rola pelo pano
      const o = C.cb.rosto.P, e = facil.quica(Q.botaoNoChao)
      porOlho(ctx, o, mix(30, 72, e), -o.r - 1 - 14 * Math.abs(Math.sin(Q.botaoNoChao * Math.PI * 2)) * (1 - Q.botaoNoChao), Q.botaoNoChao * 5, luz, s)
    }
    ctx.restore()
  }
}

/** Cria o rig de um boneco. partes: { tronco, cabeca, bracos, pernas, bordado } ('id@raridade'). opcoes: { remendos, trofeus, fioDeOuro, semente }. */
export function criarRig(partes, opcoes) { return new Rig(partes, opcoes) }

// ------------------------------------------------------------------ retrato, silhueta, parte sozinha e ícones

const densidade = () => Math.min(2, globalThis.devicePixelRatio || 1)
function tela(wPx, hPx, d) { const cv = novoCanvas(wPx * d, hPx * d); cv.style.width = wPx + 'px'; cv.style.height = hPx + 'px'; const c = cv.getContext('2d'); c.scale(d, d); return [cv, c] }
function fundoRedondo(c, tam, cor = '#2A1B3D') {
  const r = tam / 2
  const g = c.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r); g.addColorStop(0, '#4A3466'); g.addColorStop(1, cor)
  c.fillStyle = g; circ(c, r, r, r - 1); c.fill()
  c.strokeStyle = 'rgba(242,230,201,0.5)'; c.lineWidth = Math.max(1, tam / 44); c.setLineDash([tam / 16, tam / 22]); c.lineCap = 'round'; circ(c, r, r, r - tam / 14); c.stroke(); c.setLineDash([])
  c.strokeStyle = TINTA; c.lineWidth = Math.max(1.2, tam / 36); circ(c, r, r, r - 1); c.stroke()
}

/** Rosto e ombros, parado, para carta e listas. opcoes: as do rig + { fundo: false para transparente, lado, densidade }. */
export function retrato(partes, tamanhoPx, opcoes = {}) {
  const [cv, c] = tela(tamanhoPx, tamanhoPx, opcoes.densidade ?? densidade())
  if (opcoes.fundo !== false) fundoRedondo(c, tamanhoPx)
  c.save(); circ(c, tamanhoPx / 2, tamanhoPx / 2, tamanhoPx / 2 - (opcoes.fundo !== false ? 1.5 : 0)); c.clip()
  const k = tamanhoPx / 150 // enquadra 150 unidades: do alto da cabeça até o peito
  criarRig(partes, opcoes).desenhar(c, tamanhoPx / 2, 252 * k, ALTURA_BASE * k, 0, { pose: 'parado', menosAnimacao: true, lado: opcoes.lado, semSombra: true })
  c.restore()
  return cv
}

/** Contorno preto chapado do boneco inteiro (para conferir se as partes se reconhecem só pela silhueta). */
export function silhueta(partes, alturaPx, opcoes = {}) {
  const w = alturaPx * 0.92, h = alturaPx * 1.12
  const [cv, c] = tela(w, h, opcoes.densidade ?? densidade())
  criarRig(partes, opcoes).desenhar(c, w / 2, h - alturaPx * 0.03, alturaPx, 0, { pose: opcoes.pose ?? 'parado', progresso: 1, menosAnimacao: true, lado: opcoes.lado, semSombra: true })
  c.globalCompositeOperation = 'source-in'; c.fillStyle = TINTA; c.fillRect(0, 0, w, h)
  return cv
}

const VISTA = { cabeca: { cx: 0, cy: -58, tam: 156 }, tronco: { cx: 0, cy: -36, tam: 106 }, bracos: { cx: 0, cy: 34, tam: 146 }, pernas: { cx: 0, cy: 29, tam: 96 }, bordado: { cx: 0, cy: 0, tam: 50 } }
/** A parte sozinha, grande, centrada em (cx, cy), cabendo em tamanhoPx — para a arte da carta. idDaParte pode trazer '@raridade'. */
export function desenharParte(ctx, idDaParte, cx, cy, tamanhoPx) {
  const [id, rar] = String(idDaParte).split('@'), def = PARTES[id]
  if (!def) return
  const v = VISTA[def.slot], k = tamanhoPx / v.tam, m = ctx.getTransform(), s = quantizar(Math.hypot(m.a, m.b) * k)
  const fio = FIO_RARIDADE[rar] ?? FIO_RARIDADE.comum, g = (lado) => obterCamada(id, lado, s, 1, fio, rar ?? 'comum')
  const des = (cm) => ctx.drawImage(cm.canvas, cm.x0, cm.y0, cm.w, cm.h)
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-v.cx, -v.cy)
  if (def.slot === 'cabeca') { const cm = g(0); ctx.rotate(-0.06); des(cm); desenharRosto(ctx, cm, novoQ(), 0, s, 1, cm.frente ? () => ctx.drawImage(cm.frente, cm.x0, cm.y0, cm.w, cm.h) : null, tipoDaParte(id))
    if (cm.fios) { const T2 = TEC[tipoDaParte(id)] ?? TEC.la; fiosVivos(ctx, cm.fios.map(([fx, fy, ang, comp, cor], i) => [fx, fy, ang, comp, cor === 'linho' ? LINHO : T2[cor], i * 1.37]), 0, 0, s, 1.9) } }
  else if (def.slot === 'bracos') { for (const L of [-1, 1]) { ctx.save(); ctx.translate(L * 30, 0); ctx.rotate(-L * 0.12); des(g(L)); ctx.restore() } }
  else if (def.slot === 'pernas') { for (const L of [-1, 1]) { ctx.save(); ctx.translate(L * 19, 0); des(g(L)); ctx.restore() } }
  else des(g(0))
  ctx.restore()
}

const cacheIcone = new Map()
function iconeEmCache(chave, tam, fn) {
  const d = densidade(), ch = chave + '|' + tam + '|' + d
  let cv = cacheIcone.get(ch)
  if (cv) return cv
  let c; [cv, c] = tela(tam, tam, d)
  const s = (tam / 40) * d
  c.setTransform(s, 0, 0, s, tam * d / 2, tam * d / 2) // espaço de 40 unidades, centro em (0,0)
  emAssado({ escala: s, luz: 1, fio: LINHO }, () => fn(c))
  if (cacheIcone.size > 200) cacheIcone.clear()
  cacheIcone.set(ch, cv)
  return cv
}
// Cada tecido tem cor, padrão E forma própria (para quem não distingue cores):
// jeans = bolso com rebite · seda = laço de fita · lã = novelo · feltro = disco picotado · tule = roseta de bicos · couro = etiqueta furada
const FORMA_DO_TIPO = {
  jeans: (c) => { pano(c, curvaFechada([[-14, -15], [-14, -15], [14, -15], [14, -15], [15, 3], [0, 17], [0, 17], [-15, 3]], 5), 'jeans', { recuo: 3.4 }); costura(c, suave([[-10, -6], [0, -1], [10, -6]], false, 5)); rebite(c, -10.5, -11.5, 2.4); rebite(c, 10.5, -11.5, 2.4) },
  seda: (c) => { for (const L of [-1, 1]) pano(c, curvaFechada(E([[1, 0], [9, -12], [18, -13], [17, 12], [9, 11]], L), 6), 'seda', { recuo: 3 }); pano(c, bolha(0, 0, 5.5, 7, rng(3), { caroco: 0.05 }), 'seda', { semPesponto: true, tinta: 'rgba(90,10,70,0.3)', contorno: 2 }) },
  la: (c) => { fioAssado(c, [[10, 12], [16, 17], [12, 19], [18, 18]], TEC.la.claro, 1.8); const b = bolha(0, 0, 16, 16, rng(5), { caroco: 0.03 }); pano(c, b, 'la', { semPesponto: true }); dentro(c, b, () => { c.lineWidth = 1.5; for (let k = 0; k < 6; k++) { c.strokeStyle = k % 2 ? 'rgba(60,36,12,0.5)' : 'rgba(255,251,234,0.6)'; c.beginPath(); c.ellipse(0, 0, 18, 4 + k * 2.6, 0.5 + k * 0.36, 0, TAU); c.stroke() } }) },
  feltro: (c) => { const pts = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU, r = i % 2 ? 17 : 14.2; pts.push([Math.cos(a) * r, Math.sin(a) * r]) } pano(c, forma(pts), 'feltro', { semPesponto: true }); pesponto(c, bolha(0, 0, 10.5, 10.5, rng(2), { caroco: 0 }).pts); xis(c, 0, 0, 3.4, TINTA, 2) },
  tule: (c) => { const pts = []; for (let i = 0; i < 64; i++) { const a = (i / 64) * TAU, r = 14 + 3.2 * Math.abs(Math.sin(a * 4)); pts.push([Math.cos(a) * r, Math.sin(a) * r]) } pano(c, forma(pts), 'tule', { semPesponto: true }); pesponto(c, bolha(0, 0, 9.5, 9.5, rng(2), { caroco: 0 }).pts); c.fillStyle = '#F6F2FF'; circ(c, 0, 0, 2.6); c.fill(); c.strokeStyle = TINTA; c.lineWidth = esp(1.2, 0.9); c.stroke() },
  couro: (c) => { c.save(); c.rotate(-0.2); pano(c, curvaFechada([[-12, -16], [-12, -16], [5, -16], [14, -7], [14, 16], [14, 16], [-12, 16], [-12, 16]], 5), 'couro', { recuo: 3.6 }); c.fillStyle = TINTA; circ(c, 6, -8.5, 3); c.fill(); c.strokeStyle = ACO; c.lineWidth = esp(1.3, 0.9); c.stroke(); c.restore() },
}
/** Ícone do tipo (tecido): cor + padrão + forma própria. */
export function iconeDoTipo(tipo, tamanhoPx) { return iconeEmCache('tipo' + tipo, tamanhoPx, (c) => (FORMA_DO_TIPO[tipo] ?? FORMA_DO_TIPO.la)(c)) }

/** Padrão do tecido para preencher molduras de carta e painéis (a textura não estica). */
export function padraoDoTecido(ctx, tipo) {
  const m = ctx.getTransform(), e = Math.max(0.5, Math.min(3, Math.hypot(m.a, m.b)))
  const p = ctx.createPattern(azulejo(tipo, Math.round(e * 100) / 100), 'repeat')
  p.setTransform(new DOMMatrix([1 / e, 0, 0, 1 / e, 0, 0]))
  return p
}

/** Ícone do bordado (passiva). Aceita o id da passiva ('espinho') ou o da parte ('bo_espinho'). */
export function iconeDoBordado(idPassiva, tamanhoPx) {
  const id = BORDADOS_DESENHO[idPassiva] ? idPassiva : PARTES[idPassiva]?.bordado
  return iconeEmCache('bordado' + id, tamanhoPx, (c) => {
    const b = bolha(0, 0, 18.5, 18.5, rng(9), { caroco: 0.02 })
    pano(c, b, '#3A2752', { recuo: 3, fio: LINHO, volume: 0.7 })
    c.scale(0.68, 0.68); if (BORDADOS_DESENHO[id]) BORDADOS_DESENHO[id](c)
  })
}

/** Ícone do lugar da parte na carta: 'cabeca' | 'bracos' | 'pernas' (desenho de linha de bordar, cor de linho). */
export function iconeDoLugar(lugar, tamanhoPx) {
  return iconeEmCache('lugar' + lugar, tamanhoPx, (c) => {
    const cheio = (f) => { c.fillStyle = LINHO; c.fill(f.p); dentro(c, f, () => { c.fillStyle = 'rgba(20,12,31,0.18)'; c.fill(deslocado(f.p, -2.2, -2.6, f.bb), 'evenodd') }); c.strokeStyle = TINTA; c.lineWidth = esp(2.4, 1.3); c.lineJoin = 'round'; c.stroke(f.p) }
    if (lugar === 'cabeca') {
      cheio(bolha(0, 1, 16, 14.5, rng(4), { caroco: 0.04 }))
      c.fillStyle = TINTA; circ(c, -6, -1.5, 5); c.fill(); circ(c, 6.5, -0.5, 2.6); c.fill(); c.fillStyle = LINHO; circ(c, -7.2, -2.8, 1.3); c.fill()
      traco(c, [[-5, 8.5], [6, 8]], TINTA, esp(1.8, 1.1)); for (const x of [-2.5, 1, 4.5]) traco(c, [[x, 6.5], [x + 0.4, 10.5]], TINTA, esp(1.4, 0.9))
    } else if (lugar === 'bracos') {
      cheio(tubo([[-12, -13], [-2, -4], [5, 5]], [10, 8.5])); cheio(bolha(9, 9.5, 7.6, 7, rng(6), { caroco: 0.05 })); cheio(bolha(3.5, 12.5, 3.2, 3.6, rng(7), { caroco: 0.05 }))
      traco(c, [[-9, -6], [-4, -11]], TINTA, esp(1.4, 0.9))
    } else {
      cheio(tubo([[-3, -15], [-3, -2], [-2, 7]], [11, 10])); cheio(curvaFechada([[-9, 6], [4, 5], [13, 8], [14, 14], [14, 14], [-9, 14], [-9, 14]], 5))
      traco(c, [[-8, 5.5], [3.5, 5]], TINTA, esp(1.4, 0.9))
    }
  })
}
