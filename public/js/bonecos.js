// Frayz — os bonecos de pano amaldiçoados, DESENHADOS POR CÓDIGO (nenhum arquivo de imagem, nenhuma arte de terceiros).
// Cada boneco é montado pelas PARTES do config: tronco (tecido do tipo), cabeça, braços, pernas e bordado.
// Cada parte tem desenho próprio; o tecido de cada peça é o do tipo da carta que ela carrega (retalhos de tipos
// diferentes = boneco costurado de pedaços). A cor da linha de costura é a da RARIDADE da parte (só ela tem cor de destaque).
// Espaço do desenho: 160 × 232, de frente, pé no chão em y = 214. Os desenhos ficam em cache (bitmap) por tamanho/estado.
import { CARTAS, PARTES } from './ponte.js'

export const SW = 160
export const SH = 232
const TINTA = '#1d1020'
const FIO_RARIDADE = { comum: '#e6dcc0', incomum: '#58d47e', rara: '#4db3ff', lendaria: '#ffcb3a' }
const TEC = {
  jeans: { luz: '#74a3d9', base: '#3f72ad', sombra: '#27487a' },
  seda: { luz: '#f6b2e0', base: '#b8498f', sombra: '#772563' },
  la: { luz: '#f3e7c9', base: '#cdb98d', sombra: '#957f52' },
  feltro: { luz: '#aac4a0', base: '#728f6e', sombra: '#475f4a' },
  tule: { luz: '#ece6ff', base: '#b3a9e8', sombra: '#766abf' },
  couro: { luz: '#bd8156', base: '#7d4b2b', sombra: '#46281a' },
}

// ------------------------------------------------------------------ ferramentas pequenas

function rng(seed) {
  let s = (seed | 0) || 1
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const hash = (txt) => { let h = 7; for (let i = 0; i < txt.length; i++) h = (Math.imul(h, 31) + txt.charCodeAt(i)) | 0; return h }
const tipoDaParte = (id) => { const p = PARTES[id]; return p.tipo ?? CARTAS[p.carta].tipo }

function blob(cx, cy, rx, ry, seed = 1, wob = 0.08, n = 11) {
  const r = rng(seed), pts = []
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 1 + (r() - 0.5) * wob * 2; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]) }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const p = new Path2D(); const m0 = mid(pts[n - 1], pts[0]); p.moveTo(m0[0], m0[1])
  for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]) }
  p.closePath(); return { p, bb: { x: cx - rx - 2, y: cy - ry - 2, w: rx * 2 + 4, h: ry * 2 + 4 } }
}
function patch(x, y, w, h, rd, j, seed) {
  const R = rng(seed), J = () => (R() - 0.5) * j, p = new Path2D()
  const x0 = x + J(), y0 = y + J(), x1 = x + w + J(), y1 = y + J(), x2 = x + w + J(), y2 = y + h + J(), x3 = x + J(), y3 = y + h + J()
  p.moveTo(x0 + rd, y0); p.lineTo(x1 - rd, y1); p.quadraticCurveTo(x1, y1, x1, y1 + rd); p.lineTo(x2, y2 - rd)
  p.quadraticCurveTo(x2, y2, x2 - rd, y2); p.lineTo(x3 + rd, y3); p.quadraticCurveTo(x3, y3, x3, y3 - rd); p.lineTo(x0, y0 + rd)
  p.quadraticCurveTo(x0, y0, x0 + rd, y0); p.closePath(); return { p, bb: { x: x - 3, y: y - 3, w: w + 6, h: h + 6 } }
}
/** Tubo que segue uma curva (a → c, controle b), com largura que muda de w0 a w1. */
function tubo(a, b, cc, w0, w1, n = 16) {
  const L = [], R = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t
    const x = u * u * a[0] + 2 * u * t * b[0] + t * t * cc[0], y = u * u * a[1] + 2 * u * t * b[1] + t * t * cc[1]
    const dx = 2 * u * (b[0] - a[0]) + 2 * t * (cc[0] - b[0]), dy = 2 * u * (b[1] - a[1]) + 2 * t * (cc[1] - b[1])
    const l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * t) / 2
    L.push([x - (dy / l) * w, y + (dx / l) * w]); R.push([x + (dy / l) * w, y - (dx / l) * w])
  }
  const p = new Path2D(); p.moveTo(L[0][0], L[0][1])
  for (const q of L) p.lineTo(q[0], q[1])
  for (let i = R.length - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1])
  p.closePath()
  const xs = [...L, ...R].map((q) => q[0]), ys = [...L, ...R].map((q) => q[1])
  const x = Math.min(...xs), y = Math.min(...ys)
  return { p, bb: { x: x - 2, y: y - 2, w: Math.max(...xs) - x + 4, h: Math.max(...ys) - y + 4 }, ponto: (t) => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * cc[0], u * u * a[1] + 2 * u * t * b[1] + t * t * cc[1]] } }
}
const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2) }
function linha(c, pts, cor, lw, fechar = false) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]); if (fechar) c.closePath()
  c.strokeStyle = cor; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke()
}
function curva(c, a, b, e, cor, lw) {
  c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(b[0], b[1], e[0], e[1]); c.strokeStyle = cor; c.lineWidth = lw; c.lineCap = 'round'; c.stroke()
}

// ------------------------------------------------------------------ tecidos (textura de cada tipo)

const TEXTURA = {
  jeans(c, bb, T, R, forte) {
    c.lineWidth = 1
    for (let k = -bb.h; k < bb.w; k += forte ? 3.4 : 3.2) {
      c.strokeStyle = 'rgba(255,255,255,0.13)'; c.beginPath(); c.moveTo(bb.x + k, bb.y); c.lineTo(bb.x + k + bb.h, bb.y + bb.h); c.stroke()
      c.strokeStyle = 'rgba(10,20,50,0.18)'; c.beginPath(); c.moveTo(bb.x + k + 1.6, bb.y); c.lineTo(bb.x + k + bb.h + 1.6, bb.y + bb.h); c.stroke()
    }
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 1.2
    for (let i = 0; i < 9; i++) { const x = bb.x + R() * bb.w, y = bb.y + R() * bb.h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3 + R() * 4, y - 2 + R() * 4); c.stroke() }
  },
  seda(c, bb, T, R) {
    const g = c.createLinearGradient(bb.x, bb.y, bb.x + bb.w, bb.y + bb.h * 0.6)
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.32, 'rgba(255,255,255,0.45)'); g.addColorStop(0.42, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,230,250,0.28)'); g.addColorStop(0.82, 'rgba(255,255,255,0)')
    c.fillStyle = g; c.fillRect(bb.x, bb.y, bb.w, bb.h)
    c.strokeStyle = 'rgba(80,0,60,0.2)'; c.lineWidth = 1
    for (let i = 0; i < 4; i++) { const y = bb.y + (bb.h * (i + 0.5)) / 4; c.beginPath(); c.moveTo(bb.x, y); c.bezierCurveTo(bb.x + bb.w * 0.3, y - 5, bb.x + bb.w * 0.6, y + 6, bb.x + bb.w, y); c.stroke() }
  },
  la(c, bb, T, R, forte) {
    const pas = forte ? 5 : 5.2
    c.lineWidth = 1.5; c.lineCap = 'round'
    for (let y = bb.y; y < bb.y + bb.h; y += pas) {
      for (let x = bb.x; x < bb.x + bb.w; x += pas) {
        c.strokeStyle = 'rgba(80,60,30,0.38)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + pas / 2, y + pas * 0.8); c.lineTo(x + pas, y); c.stroke()
        c.strokeStyle = 'rgba(255,248,225,0.45)'; c.beginPath(); c.moveTo(x, y + 1.2); c.lineTo(x + pas / 2, y + pas * 0.8 + 1.2); c.lineTo(x + pas, y + 1.2); c.stroke()
      }
    }
  },
  feltro(c, bb, T, R) {
    c.lineWidth = 1
    for (let i = 0; i < Math.min(260, bb.w * bb.h * 0.02); i++) {
      const x = bb.x + R() * bb.w, y = bb.y + R() * bb.h, a = R() * 6.28, l = 1.5 + R() * 2.5
      c.strokeStyle = R() < 0.5 ? 'rgba(255,255,230,0.38)' : 'rgba(20,40,20,0.3)'
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke()
    }
  },
  tule(c, bb, T, R, forte) {
    const s = forte ? 5 : 5.6, h = s * 0.866
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1
    for (let row = 0, y = bb.y; y < bb.y + bb.h + h; row++, y += h) {
      for (let x = bb.x - s; x < bb.x + bb.w + s; x += s * 1.5 * 2) {
        const ox = x + (row % 2 ? s * 1.5 : 0)
        c.beginPath(); c.moveTo(ox, y); c.lineTo(ox + s * 0.5, y - h * 0.5); c.lineTo(ox + s * 1.5, y - h * 0.5); c.lineTo(ox + s * 2, y); c.stroke()
      }
    }
    c.strokeStyle = 'rgba(70,50,140,0.22)'
    for (let k = 0; k < 6; k++) { const x = bb.x + R() * bb.w, y = bb.y + R() * bb.h; c.beginPath(); c.arc(x, y, 1.6, 0, 6.3); c.stroke() }
  },
  couro(c, bb, T, R, forte) {
    c.lineWidth = 1.1; c.strokeStyle = 'rgba(25,10,0,0.5)'
    for (let i = 0; i < Math.max(5, Math.min(14, bb.w * bb.h * 0.0025)); i++) {
      let x = bb.x + R() * bb.w, y = bb.y + R() * bb.h; c.beginPath(); c.moveTo(x, y)
      for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 11; y += (R() - 0.35) * 8; c.lineTo(x, y) }
      c.stroke()
    }
    c.fillStyle = 'rgba(255,230,190,0.2)'
    for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(bb.x + R() * bb.w, bb.y + R() * bb.h, 0.8, 0, 6.3); c.fill() }
    const g = c.createLinearGradient(bb.x, bb.y, bb.x + bb.w * 0.5, bb.y + bb.h * 0.5)
    g.addColorStop(0, 'rgba(255,220,170,0.28)'); g.addColorStop(0.4, 'rgba(255,220,170,0)'); c.fillStyle = g; c.fillRect(bb.x, bb.y, bb.w, bb.h)
  },
}

/** Pinta um caminho com o tecido do tipo, sombra de borda, costura (cor da raridade) e contorno de tinta. */
function tecido(c, tipo, forma, fio, seed = 3, o = {}) {
  const T = TEC[tipo], { p, bb } = forma
  c.save()
  if (tipo === 'tule') { c.fillStyle = '#efe6cc'; c.fill(p) } // enchimento aparece por baixo do tule
  c.save(); c.clip(p)
  if (tipo === 'tule') c.globalAlpha = o.ficha ? 0.92 : 0.8
  const g = c.createLinearGradient(bb.x, bb.y, bb.x + bb.w * 0.8, bb.y + bb.h)
  g.addColorStop(0, T.luz); g.addColorStop(0.5, T.base); g.addColorStop(1, T.sombra)
  c.fillStyle = g; c.fillRect(bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4)
  c.globalAlpha = 1
  TEXTURA[tipo](c, bb, T, rng(seed), o.forte)
  c.lineWidth = 8; c.strokeStyle = 'rgba(10,0,20,0.3)'; c.stroke(p)
  if (!o.semCostura) { c.setLineDash([4.5, 3.5]); c.lineWidth = 3.4; c.strokeStyle = fio; c.stroke(p); c.setLineDash([]) }
  c.restore()
  c.lineWidth = o.contorno ?? 2.6; c.strokeStyle = TINTA; c.lineJoin = 'round'; c.stroke(p)
  c.restore()
}

// ------------------------------------------------------------------ rosto

function xis(c, x, y, r) { linha(c, [[x - r, y - r], [x + r, y + r]], '#120912', 3); linha(c, [[x + r, y - r], [x - r, y + r]], '#120912', 3) }

function olhoBotao(c, x, y, r, rot, est, lado, brilho = false) {
  const fioOlho = lado === 'D' ? '#b3122e' : '#26121a'
  if (est === 'caido' || (est === 'fio' && lado === 'E')) { xis(c, x, y, r * 0.8); return }
  if (est === 'fio') r *= 1.25
  if (brilho) { const g = c.createRadialGradient(x, y, r * 0.5, x, y, r * 2.6); g.addColorStop(0, 'rgba(255,250,200,0.8)'); g.addColorStop(1, 'rgba(255,250,200,0)'); c.fillStyle = g; circ(c, x, y, r * 2.6); c.fill() }
  c.fillStyle = '#120912'; circ(c, x, y, r + 2.6); c.fill()
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r)
  g.addColorStop(0, '#fbf4de'); g.addColorStop(1, '#c9b98f'); c.fillStyle = g; circ(c, x, y, r); c.fill()
  c.strokeStyle = '#6b5834'; c.lineWidth = 1.4; circ(c, x, y, r); c.stroke()
  c.strokeStyle = 'rgba(90,70,30,0.5)'; c.lineWidth = 1; circ(c, x, y, r * 0.66); c.stroke()
  c.save(); c.translate(x, y); c.rotate(rot)
  const h = r * 0.3
  linha(c, [[-h, -h], [h, h]], fioOlho, Math.max(1.6, r * 0.2)); linha(c, [[h, -h], [-h, h]], fioOlho, Math.max(1.6, r * 0.2))
  c.fillStyle = '#0c060a'; for (const [dx, dy] of [[-h, -h], [h, -h], [-h, h], [h, h]]) { circ(c, dx, dy, Math.max(1, r * 0.14)); c.fill() }
  c.restore()
}
function sobrancelha(c, x0, y0, x1, y1, esp = 5) {
  esp += 1.6
  linha(c, [[x0, y0], [x1, y1]], '#150a17', esp)
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy)
  c.strokeStyle = 'rgba(230,220,190,0.75)'; c.lineWidth = 1.4
  for (let t = 0.15; t < 1; t += 0.22) { const x = x0 + dx * t, y = y0 + dy * t; c.beginPath(); c.moveTo(x - (dy / l) * 2.6, y + (dx / l) * 2.6); c.lineTo(x + (dy / l) * 2.6, y - (dx / l) * 2.6); c.stroke() }
}
/** Boca de zíper: fechada (dentes miúdos) ou aberta (goela com dentes e língua). */
function bocaZiper(c, x, y, w, aberta, est, tilt = 0, lingua = true) {
  c.save(); c.translate(x, y); c.rotate(tilt)
  if (est === 'fio') { c.fillStyle = '#12060c'; c.beginPath(); c.ellipse(0, 2, 7, 9, 0, 0, 6.3); c.fill(); c.restore(); return }
  if (est === 'caido') { c.strokeStyle = '#120912'; c.lineWidth = 3; c.beginPath(); c.moveTo(-w / 2, 0); for (let i = 0; i <= 6; i++) c.lineTo(-w / 2 + (w * i) / 6, i % 2 ? 3 : -3); c.stroke(); c.restore(); return }
  if (aberta > 0) {
    c.fillStyle = '#16060c'; c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(0, -aberta * 0.5, w / 2, 0); c.quadraticCurveTo(0, aberta * 1.4, -w / 2, 0); c.fill()
    if (lingua) { c.fillStyle = '#c44a5c'; c.beginPath(); c.ellipse(0, aberta * 0.5, w * 0.2, aberta * 0.28, 0, 0, 6.3); c.fill() }
    c.fillStyle = '#efe6cf'; c.strokeStyle = '#1d1020'; c.lineWidth = 1
    const n = Math.max(4, Math.round(w / 8))
    for (let i = 0; i < n; i++) {
      const tx = -w / 2 + ((i + 0.5) * w) / n
      c.beginPath(); c.moveTo(tx - 3.4, -aberta * 0.1 - Math.abs(tx) * 0.02); c.lineTo(tx + 3.4, -aberta * 0.1 - Math.abs(tx) * 0.02); c.lineTo(tx, aberta * 0.42); c.closePath(); c.fill(); c.stroke()
      c.beginPath(); c.moveTo(tx - 3, aberta * 0.5); c.lineTo(tx + 3, aberta * 0.5); c.lineTo(tx, aberta * 0.5 - aberta * 0.33); c.closePath(); c.fill(); c.stroke()
    }
  } else {
    linha(c, [[-w / 2, 0], [w / 2, 0]], '#120912', 4.2)
    c.fillStyle = '#d8cfb4'
    for (let tx = -w / 2 + 3; tx < w / 2 - 2; tx += 4.4) { c.fillRect(tx, -3.4, 2.4, 2.6); c.fillRect(tx + 2.2, 0.8, 2.4, 2.6) }
  }
  // cursor do zíper (dourado) pendurado na ponta
  c.fillStyle = '#e1b341'; c.strokeStyle = '#6e4d12'; c.lineWidth = 1.2
  c.beginPath(); c.roundRect(w / 2 - 7, -5, 9, 8, 2); c.fill(); c.stroke()
  c.beginPath(); c.roundRect(w / 2 - 4, 3, 5, 9, 2); c.fill(); c.stroke()
  c.fillStyle = '#6e4d12'; circ(c, w / 2 - 1.5, 8, 1.2); c.fill()
  c.restore()
}
function bocaCosturada(c, x, y, w, est) {
  c.save(); c.translate(x, y)
  linha(c, [[-w / 2, 0], [w / 2, 0]], '#150a17', 3.6)
  const n = 6
  for (let i = 0; i < n; i++) { const tx = -w / 2 + ((i + 0.5) * w) / n; linha(c, [[tx - 4, -6], [tx + 4, 6]], '#2a1520', 3); linha(c, [[tx + 4, -6], [tx - 4, 6]], '#2a1520', 3) }
  c.restore()
}

function rostoBase(c, o, est) {
  const olhoE = o.olhoE, olhoD = o.olhoD
  if (o.antes) o.antes()
  olhoBotao(c, olhoE.x, olhoE.y, olhoE.r, olhoE.rot ?? 0.3, est, 'E', o.brilho)
  olhoBotao(c, olhoD.x, olhoD.y, olhoD.r, olhoD.rot ?? -0.2, est, 'D', o.brilho)
  if (est !== 'caido') {
    const b = o.brows
    sobrancelha(c, b[0], b[1], b[2], b[3], o.espBrow ?? 5); sobrancelha(c, b[4], b[5], b[6], b[7], o.espBrow ?? 5)
  }
  if (o.boca) o.boca()
}

// ------------------------------------------------------------------ cabeças (8)

function orelhas(c, tipo, fio, seed) {
  for (const lado of [-1, 1]) { const f = blob(80 + lado * 38, 56, 9, 12, seed + lado, 0.1); tecido(c, tipo, f, fio, seed, { semCostura: true, contorno: 2.2 }) }
}

const CABECAS = {
  cab_botao(c, t, fio, est, S) {
    orelhas(c, t, fio, S); const h = blob(80, 56, 38, 34, S, 0.05); tecido(c, t, h, fio, S)
    rostoBase(c, { olhoE: { x: 63, y: 51, r: 17, rot: 0.5 }, olhoD: { x: 102, y: 60, r: 6, rot: -0.4 }, brows: [43, 33, 74, 42, 118, 38, 94, 51],
      boca: () => bocaZiper(c, 80, 79, 38, 3, est, -0.1) }, est)
    linha(c, [[94, 52], [110, 68]], '#150a17', 2.6); linha(c, [[110, 52], [94, 68]], '#150a17', 2.6) // cicatriz em X
  },
  cab_brim(c, t, fio, est, S) {
    orelhas(c, t, fio, S); const h = patch(42, 24, 76, 64, 22, 3, S); tecido(c, t, h, fio, S)
    const sob = patch(43, 37, 74, 14, 5, 1.5, S + 1); tecido(c, t, sob, fio, S + 2, { contorno: 2.2 })
    c.fillStyle = '#c8ccd2'; c.strokeStyle = '#2a2c30'; c.lineWidth = 1.2; for (const x of [50, 110]) { circ(c, x, 44, 3.2); c.fill(); c.stroke() }
    rostoBase(c, { olhoE: { x: 63, y: 62, r: 8.5, rot: 0.2 }, olhoD: { x: 97, y: 63, r: 7, rot: 0.6 }, brows: [46, 49, 72, 56, 114, 49, 90, 57], espBrow: 6,
      boca: () => bocaZiper(c, 80, 79, 40, 5, est, 0.05, false) }, est)
    const cu = patch(96, 70, 16, 12, 3, 1.5, S + 9); tecido(c, 'la', cu, '#e6dcc0', S, { contorno: 1.6 }) // band-aid de feltro na bochecha
  },
  cab_ziper(c, t, fio, est, S) {
    orelhas(c, t, fio, S); const h = blob(80, 56, 38, 33, S, 0.05); tecido(c, t, h, fio, S)
    rostoBase(c, { olhoE: { x: 64, y: 43, r: 7.5, rot: 0.3 }, olhoD: { x: 96, y: 45, r: 6.5, rot: -0.4 }, brows: [48, 31, 72, 38, 112, 33, 90, 40],
      boca: () => bocaZiper(c, 80, 68, 58, 22, est, -0.05) }, est)
  },
  cab_desfiada(c, t, fio, est, S) {
    const r = rng(S)
    for (let i = 0; i < 9; i++) { // fios soltos saindo do topo
      const x = 52 + i * 7, a = (i - 4) * 0.16
      const col = i % 3 === 0 ? TEC[t].luz : i % 3 === 1 ? '#efe6cf' : TEC[t].base
      c.beginPath(); c.moveTo(x, 34); c.bezierCurveTo(x + a * 60, 8 - r() * 14, x + a * 100 + 10, 0 + r() * 12, x + a * 150 + 6, 4 + r() * 18)
      c.strokeStyle = TINTA; c.lineWidth = 3.6; c.lineCap = 'round'; c.stroke(); c.strokeStyle = col; c.lineWidth = 2; c.stroke()
    }
    orelhas(c, t, fio, S); const h = blob(80, 58, 37, 32, S, 0.09); tecido(c, t, h, fio, S)
    for (let i = 0; i < 5; i++) { const x = 52 + i * 14; linha(c, [[x, 30], [x + 3, 36], [x - 1, 41]], 'rgba(255,255,255,0.65)', 1.4) }
    // olho direito pendurado por um fio
    linha(c, [[104, 50], [108, 62], [106, 74]], '#150a17', 2.4)
    rostoBase(c, { olhoE: { x: 62, y: 52, r: 9, rot: 0.3 }, olhoD: { x: 106, y: 78, r: 8, rot: -0.5 }, brows: [46, 41, 72, 49, 116, 42, 94, 50],
      boca: () => bocaZiper(c, 78, 79, 36, 7, est, 0.1) }, est)
  },
  cab_gorro(c, t, fio, est, S) {
    orelhas(c, t, fio, S); const h = blob(80, 58, 38, 32, S, 0.05); tecido(c, 'feltro', h, fio, S)
    rostoBase(c, { olhoE: { x: 63, y: 64, r: 8.5, rot: 0.3 }, olhoD: { x: 98, y: 66, r: 7, rot: -0.3 }, brows: [48, 56, 71, 62, 112, 57, 90, 63], espBrow: 4.5,
      boca: () => bocaZiper(c, 80, 81, 34, 4, est, -0.06) }, est)
    const dome = blob(80, 42, 42, 28, S + 3, 0.04, 9); tecido(c, t, dome, fio, S + 3)
    const aba = patch(38, 38, 84, 16, 7, 2, S + 4); tecido(c, t, aba, fio, S + 5, { forte: true })
    linha(c, [[46, 38], [46, 54]], 'rgba(60,40,10,0.5)', 1.4); linha(c, [[114, 38], [114, 54]], 'rgba(60,40,10,0.5)', 1.4)
    const pom = blob(80, 13, 12, 11, S + 8, 0.2, 12); tecido(c, t, pom, fio, S + 8, { semCostura: true })
    c.strokeStyle = 'rgba(255,248,225,0.7)'; c.lineWidth = 1.4; for (let a = 0; a < 6.3; a += 0.8) { c.beginPath(); c.moveTo(80 + Math.cos(a) * 9, 13 + Math.sin(a) * 8); c.lineTo(80 + Math.cos(a) * 14, 13 + Math.sin(a) * 13); c.stroke() }
  },
  cab_feltro(c, t, fio, est, S) {
    orelhas(c, t, fio, S); const h = patch(41, 22, 78, 68, 12, 2.5, S); tecido(c, t, h, fio, S)
    // parafuso e X de pano na testa
    linha(c, [[72, 28], [88, 40]], '#e9e1c8', 2.4); linha(c, [[88, 28], [72, 40]], '#e9e1c8', 2.4)
    c.fillStyle = '#9aa0a6'; c.strokeStyle = '#2a2c30'; c.lineWidth = 1.2; for (const x of [49, 111]) { circ(c, x, 31, 3.4); c.fill(); c.stroke() }
    rostoBase(c, { olhoE: { x: 63, y: 55, r: 7, rot: 0.3 }, olhoD: { x: 98, y: 56, r: 6.5, rot: -0.2 }, brows: [46, 43, 76, 52, 114, 43, 85, 52], espBrow: 7,
      boca: () => bocaZiper(c, 80, 77, 44, 0, est, 0) }, est)
    // pálpebras pesadas (feltro mais escuro)
    c.fillStyle = 'rgba(30,45,30,0.65)'; for (const [x, y, d] of [[63, 50, 1], [98, 51, -1]]) { c.beginPath(); c.moveTo(x - 10, y - 4 * d); c.lineTo(x + 10, y + 3 * d); c.lineTo(x + 10, y - 9); c.lineTo(x - 10, y - 9); c.closePath(); c.fill() }
  },
  cab_veu(c, t, fio, est, S) {
    orelhas(c, 'tule', fio, S); const h = blob(80, 56, 36, 33, S, 0.05); tecido(c, 'tule', h, fio, S, { ficha: true })
    rostoBase(c, { olhoE: { x: 64, y: 54, r: 8, rot: 0.3 }, olhoD: { x: 98, y: 56, r: 7, rot: -0.3 }, brows: [48, 43, 73, 51, 112, 44, 90, 52], brilho: true,
      boca: () => bocaZiper(c, 80, 78, 34, 4, est, 0.08) }, est)
    // o véu cobre a cabeça toda, com bainha de bicos
    const v = new Path2D()
    v.moveTo(34, 52); v.bezierCurveTo(34, 12, 126, 12, 126, 52); v.lineTo(132, 104)
    for (let i = 0; i < 6; i++) { const x0 = 132 - i * 17, x1 = x0 - 17; v.quadraticCurveTo((x0 + x1) / 2, 118, x1, 104) }
    v.closePath()
    c.save(); c.globalAlpha = 0.52; tecido(c, 'tule', { p: v, bb: { x: 28, y: 8, w: 110, h: 112 } }, fio, S + 5, { contorno: 1.8, ficha: false }); c.restore()
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(48, 28); c.quadraticCurveTo(70, 18, 92, 20); c.stroke()
  },
  cab_abafada(c, t, fio, est, S) {
    orelhas(c, t, fio, S); const h = blob(80, 56, 37, 33, S, 0.06); tecido(c, t, h, fio, S)
    rostoBase(c, { olhoE: { x: 62, y: 49, r: 10, rot: 0.3 }, olhoD: { x: 99, y: 51, r: 9, rot: -0.2 }, brows: [44, 34, 74, 43, 116, 35, 88, 44], espBrow: 6,
      boca: () => { bocaCosturada(c, 80, 76, 44, est); linha(c, [[100, 82], [100, 94]], '#e9e1c8', 1.6) } }, est)
  },
}

// ------------------------------------------------------------------ braços (8)  (lado: -1 esquerdo, +1 direito)

function mao(c, tipo, fio, x, y, r, S) { const m = blob(x, y, r, r * 0.92, S, 0.1, 9); tecido(c, tipo, m, fio, S, { contorno: 2.2 }); return m }

const BRACOS = {
  br_rasgado(c, lado, t, fio, S) {
    const sx = lado < 0 ? 38 : 122, a = tubo([sx, 100], [sx + lado * 14, 125], [sx + lado * 20, 154], 20, 17); tecido(c, t, a, fio, S)
    const x = sx + lado * 15, y = 128
    c.save(); c.clip(a.p)
    c.fillStyle = '#16060c'; c.beginPath(); c.moveTo(x - 14, y - 2); for (let i = 0; i <= 5; i++) c.lineTo(x - 14 + i * 6, y + (i % 2 ? 6 : -4)); for (let i = 5; i >= 0; i--) c.lineTo(x - 14 + i * 6, y + 8 + (i % 2 ? 4 : -2)); c.closePath(); c.fill()
    c.restore()
    c.fillStyle = '#f3ecda'; c.strokeStyle = TINTA; c.lineWidth = 1.2; for (const [dx, dy, r] of [[-5, 4, 4], [3, 6, 5], [9, 3, 3.4]]) { circ(c, x + dx, y + dy, r); c.fill(); c.stroke() }
    curva(c, [x + 4, y + 10], [x + lado * 6, y + 26], [x - lado * 2, y + 36], '#efe6cf', 1.8)
    mao(c, t, fio, sx + lado * 21, 157, 10.5, S + 1)
  },
  br_cadarco(c, lado, t, fio, S) {
    const sx = lado < 0 ? 38 : 122, a = tubo([sx, 100], [sx + lado * 24, 118], [sx + lado * 14, 150], 12, 10); tecido(c, t, a, fio, S, { semCostura: true })
    c.save(); c.clip(a.p); c.strokeStyle = 'rgba(255,235,200,0.5)'; c.lineWidth = 1.4
    for (let i = 0; i < 12; i++) { const [x, y] = a.ponto(i / 11); c.beginPath(); c.moveTo(x - 6, y - 3); c.lineTo(x + 6, y + 3); c.stroke() }
    c.restore()
    // pontas de cadarço com ponteira, uma delas laçando
    const [hx, hy] = [sx + lado * 14, 152]
    curva(c, [hx, hy], [hx + lado * 22, hy + 6], [hx + lado * 12, hy + 26], '#8a5a34', 5); curva(c, [hx, hy], [hx - lado * 14, hy + 10], [hx - lado * 4, hy + 30], '#8a5a34', 5)
    c.fillStyle = '#b9bec6'; c.strokeStyle = '#2a2c30'; c.lineWidth = 1; for (const [x, y] of [[hx + lado * 12, hy + 28], [hx - lado * 4, hy + 32]]) { c.beginPath(); c.roundRect(x - 2, y - 2, 4, 8, 1.5); c.fill(); c.stroke() }
    c.fillStyle = '#8a5a34'; c.strokeStyle = TINTA; c.lineWidth = 2; circ(c, hx, hy, 6); c.fill(); c.stroke() // nó
  },
  br_agulha(c, lado, t, fio, S) {
    const sx = lado < 0 ? 38 : 122, a = tubo([sx, 100], [sx + lado * 14, 124], [sx + lado * 20, 148], 14, 11); tecido(c, t, a, fio, S)
    const m = mao(c, t, fio, sx + lado * 21, 153, 9.5, S + 1)
    // agulha comprida na mão, com fio saindo do buraco
    const ax = sx + lado * 21, ay = 150, tx = ax + lado * 20, ty = ay - 66
    linha(c, [[ax - lado * 3, ay + 8], [tx, ty]], TINTA, 5.5); linha(c, [[ax - lado * 3, ay + 8], [tx, ty]], '#d6dce4', 3)
    linha(c, [[ax - lado * 2, ay + 4], [ax + lado * 12, ay - 30]], 'rgba(255,255,255,0.9)', 1)
    c.strokeStyle = TINTA; c.lineWidth = 2; c.beginPath(); c.ellipse(tx - lado * 1, ty + 9, 1.8, 4.4, lado * 0.3, 0, 6.3); c.stroke()
    curva(c, [tx, ty + 9], [tx + lado * 20, ty + 40], [ax + lado * 20, ay + 40], '#e8344f', 2.2)
    void m
  },
  br_cetim(c, lado, t, fio, S) {
    const sx = lado < 0 ? 38 : 122, a = tubo([sx, 100], [sx + lado * 14, 126], [sx + lado * 20, 150], 17, 13); tecido(c, t, a, fio, S)
    mao(c, t, fio, sx + lado * 21, 157, 9.5, S + 1)
    const bx = sx + lado * 19, by = 143
    c.fillStyle = '#e8344f'; c.strokeStyle = TINTA; c.lineWidth = 1.8
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + d * 18, by - 14, bx + d * 16, by + 6); c.quadraticCurveTo(bx + d * 8, by + 2, bx, by); c.fill(); c.stroke() }
    circ(c, bx, by, 3.8); c.fill(); c.stroke()
    linha(c, [[bx - 2, by + 3], [bx - 6, by + 18]], '#e8344f', 3); linha(c, [[bx + 2, by + 3], [bx + 6, by + 16]], '#e8344f', 3)
  },
  br_abraco(c, lado, t, fio, S) {
    const sx = lado < 0 ? 38 : 122, a = tubo([sx, 100], [sx + lado * 34, 150], [sx + lado * 8, 205], 19, 14); tecido(c, t, a, fio, S)
    // mãos peludas de lã que se agarram
    const m = blob(sx + lado * 8, 207, 11, 10, S + 1, 0.2, 12); tecido(c, t, m, fio, S + 1, { semCostura: true, contorno: 2.2 })
    c.strokeStyle = 'rgba(255,248,225,0.7)'; c.lineWidth = 1.4; for (let k = 0; k < 8; k++) { const ang = k * 0.8; c.beginPath(); c.moveTo(sx + lado * 8 + Math.cos(ang) * 9, 207 + Math.sin(ang) * 8); c.lineTo(sx + lado * 8 + Math.cos(ang) * 13, 207 + Math.sin(ang) * 12); c.stroke() }
  },
  br_cruz(c, lado, t, fio, S) {
    const sx = lado < 0 ? 38 : 122, a = tubo([sx, 100], [sx + lado * 14, 125], [sx + lado * 20, 150], 19, 16); tecido(c, t, a, fio, S)
    c.save(); c.clip(a.p); c.strokeStyle = 'rgba(30,50,30,0.7)'; c.lineWidth = 1.5
    for (let i = 0; i < 6; i++) { const [x, y] = a.ponto(i / 5.2 + 0.04); for (const d of [-5, 5]) { c.beginPath(); c.moveTo(x + d - 2, y - 2); c.lineTo(x + d + 2, y + 2); c.moveTo(x + d + 2, y - 2); c.lineTo(x + d - 2, y + 2); c.stroke() } }
    c.restore()
    const m = patch(sx + lado * 20 - 12, 148, 24, 22, 6, 1.5, S + 2); tecido(c, t, m, fio, S + 2, { contorno: 2.2 })
    linha(c, [[sx + lado * 20 - 6, 154], [sx + lado * 20 + 6, 166]], '#f4efe0', 3); linha(c, [[sx + lado * 20 + 6, 154], [sx + lado * 20 - 6, 166]], '#f4efe0', 3)
  },
  br_alfinete(c, lado, t, fio, S) {
    const sx = lado < 0 ? 38 : 122, a = tubo([sx, 100], [sx + lado * 14, 124], [sx + lado * 20, 148], 13, 10); tecido(c, t, a, fio, S)
    const bx = sx + lado * 22, by = 160
    const r = rng(S)
    for (let i = 0; i < 8; i++) { // alfinetes de cabeça colorida espetados em volta
      const ang = -2.6 + i * 0.52, x0 = bx + Math.cos(ang) * 8, y0 = by + Math.sin(ang) * 8, x1 = bx + Math.cos(ang) * 24, y1 = by + Math.sin(ang) * 24
      linha(c, [[x0, y0], [x1, y1]], '#cfd5dc', 1.8)
      c.fillStyle = ['#e8344f', '#ffd23a', '#4db3ff', '#7ee08a'][i % 4]; c.strokeStyle = TINTA; c.lineWidth = 1.2; circ(c, x1, y1, 3 + r() * 0.8); c.fill(); c.stroke()
    }
    const f = blob(bx, by, 13, 12, S + 3, 0.05, 9); tecido(c, t, f, fio, S + 3, { contorno: 2.2 })
  },
  br_nevoa(c, lado, t, fio, S) {
    const sx = lado < 0 ? 38 : 122, a = tubo([sx, 104], [sx + lado * 12, 128], [sx + lado * 18, 152], 9, 7); tecido(c, t, a, fio, S, { ficha: true })
    for (const [dx, dy, r] of [[0, 4, 17], [lado * 8, 24, 15], [lado * 12, 44, 12], [lado * 18, 62, 8]]) {
      const b = blob(sx + dx, 104 + dy, r, r * 0.9, S + dy, 0.12, 9); c.save(); c.globalAlpha = 0.72; tecido(c, 'tule', b, fio, S + dy, { contorno: 1.8 }); c.restore()
    }
    mao(c, 'tule', fio, sx + lado * 19, 160, 7.5, S + 9)
  },
}

// ------------------------------------------------------------------ pernas (8)  (x: centro da perna)

function bota(c, tipo, fio, x, lado, S, larg = 28, alt = 16) {
  const f = blob(x + lado * 3, 207, larg / 2, alt / 2, S, 0.08, 9); tecido(c, tipo, f, fio, S, { contorno: 2.4 }); return f
}
const PERNAS = {
  pe_rebite(c, x, lado, t, fio, S) {
    const a = tubo([x, 148], [x, 176], [x + lado * 2, 204], 25, 22); tecido(c, t, a, fio, S)
    bota(c, t, fio, x, lado, S + 1, 32, 18)
    c.fillStyle = '#c8ccd2'; c.strokeStyle = '#2a2c30'; c.lineWidth = 1.2
    for (const [dx, y] of [[-6, 158], [6, 158], [-6, 176], [6, 176], [0, 196]]) { circ(c, x + dx, y, 2.8); c.fill(); c.stroke() }
  },
  pe_tamanco(c, x, lado, t, fio, S) {
    const a = tubo([x, 148], [x, 170], [x, 193], 17, 15); tecido(c, t, a, fio, S)
    // tamanco de madeira: bico redondo, salto de bloco
    const p = new Path2D(); const x0 = x - 15 + lado * 2, x1 = x + 17 + lado * 6
    p.moveTo(x0, 194); p.quadraticCurveTo(x0 + 8, 186, x0 + 16, 190); p.lineTo(x1 - 4, 192); p.quadraticCurveTo(x1 + 4, 194, x1, 206); p.lineTo(x1 - 7, 214); p.lineTo(x1 - 12, 207); p.lineTo(x0 + 14, 207); p.lineTo(x0 + 10, 214); p.lineTo(x0, 214); p.closePath()
    c.save(); c.fillStyle = '#b57c3e'; c.fill(p); c.clip(p); c.strokeStyle = 'rgba(70,35,10,0.45)'; c.lineWidth = 1.2
    for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(x0, 193 + k * 4); c.bezierCurveTo(x0 + 14, 190 + k * 4, x0 + 24, 196 + k * 4, x1, 192 + k * 4); c.stroke() }
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x0, 208, 60, 8); c.restore()
    c.strokeStyle = TINTA; c.lineWidth = 2.4; c.lineJoin = 'round'; c.stroke(p)
    c.strokeStyle = fio; c.lineWidth = 2; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(x - 10, 196); c.quadraticCurveTo(x, 192, x + 10, 195); c.stroke(); c.setLineDash([])
  },
  pe_sola(c, x, lado, t, fio, S) {
    const a = tubo([x, 148], [x, 175], [x, 200], 27, 25); tecido(c, t, a, fio, S)
    const f = blob(x + lado * 4, 200, 19, 11, S + 1, 0.05, 9); tecido(c, t, f, fio, S + 1, { contorno: 2.4 })
    const s = patch(x - 17 + lado * 4, 205, 40, 10, 3, 1, S + 2) // sola grossa de borracha com sulcos
    c.save(); c.fillStyle = '#2c2321'; c.fill(s.p); c.clip(s.p); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1.4
    for (let k = 0; k < 9; k++) { c.beginPath(); c.moveTo(x - 17 + k * 4.6, 205); c.lineTo(x - 15 + k * 4.6, 216); c.stroke() }
    c.restore(); c.strokeStyle = TINTA; c.lineWidth = 2.4; c.stroke(s.p)
    for (const y of [168, 178]) linha(c, [[x - 8, y], [x + 8, y + 5]], '#e9e1c8', 2) // cadarço cruzado
    for (const y of [168, 178]) linha(c, [[x + 8, y], [x - 8, y + 5]], '#e9e1c8', 2)
  },
  pe_cetim(c, x, lado, t, fio, S) {
    const a = tubo([x, 148], [x, 175], [x + lado * 2, 200], 13, 10); tecido(c, t, a, fio, S)
    const p = new Path2D(); const bx = x + lado * 2
    p.moveTo(bx - 8, 196); p.quadraticCurveTo(bx + 4, 192, bx + 8, 197); p.quadraticCurveTo(bx + 22 + lado * 8, 206, bx + 34 * (lado || 1) * 0.6 + lado * 12, 212)
    p.quadraticCurveTo(bx, 218, bx - 12, 212); p.quadraticCurveTo(bx - 14, 204, bx - 8, 196); p.closePath()
    tecido(c, t, { p, bb: { x: bx - 16, y: 190, w: 54, h: 30 } }, fio, S + 1, { contorno: 2.4 })
    for (const [x0, y0, x1, y1] of [[0, 180, 7, 168], [0, 170, 7, 182], [0, 191, 7, 180]]) linha(c, [[bx + x0 - 4, y0], [bx + x1 + 2, y1]], '#e8344f', 2) // fitas cruzadas
  },
  pe_novelo(c, x, lado, t, fio, S) {
    const a = tubo([x, 148], [x, 172], [x, 194], 12, 10); tecido(c, t, a, fio, S)
    const b = blob(x, 199, 17, 16, S + 1, 0.04, 12); tecido(c, t, b, fio, S + 1, { forte: true, contorno: 2.4 })
    c.save(); c.clip(b.p); c.strokeStyle = 'rgba(70,50,20,0.55)'; c.lineWidth = 1.4
    for (let k = -2; k < 4; k++) { c.beginPath(); c.ellipse(x, 199, 20, 8 + k * 4, 0.5 + k * 0.28, 0, 6.3); c.stroke() }
    c.restore()
    curva(c, [x + 12, 207], [x + 30 * (lado || 1), 218], [x + 40 * (lado || 1), 208], '#efe6cf', 2.2)
  },
  pe_rolo(c, x, lado, t, fio, S) {
    // carretel gigante: tampas de madeira e linha enrolada
    const corpo = patch(x - 12, 150, 24, 54, 3, 0.8, S); tecido(c, t, corpo, fio, S, { forte: true, semCostura: true })
    c.save(); c.clip(corpo.p); c.strokeStyle = 'rgba(70,50,20,0.55)'; c.lineWidth = 1.3
    for (let y = 154; y < 204; y += 4) { c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x + 12, y + 1.4); c.stroke() }
    c.restore()
    for (const y of [148, 204]) {
      c.fillStyle = '#b57c3e'; c.strokeStyle = TINTA; c.lineWidth = 2.2; c.beginPath(); c.ellipse(x, y, 17, 5.5, 0, 0, 6.3); c.fill(); c.stroke()
      c.strokeStyle = 'rgba(70,35,10,0.5)'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, 10, 3, 0, 0, 6.3); c.stroke()
    }
    c.strokeStyle = TINTA; c.lineWidth = 2.4; c.stroke(corpo.p)
  },
  pe_remendo(c, x, lado, t, fio, S) {
    const a = tubo([x, 148], [x, 176], [x, 204], 23, 21); tecido(c, t, a, fio, S)
    bota(c, t, fio, x, lado, S + 1, 30, 17)
    const p1 = patch(x - 9, 158, 15, 14, 2, 2, S + 3); tecido(c, 'jeans', p1, '#e6dcc0', S + 3, { contorno: 1.8 })
    const p2 = patch(x - 2, 180, 14, 13, 2, 2, S + 4); tecido(c, 'couro', p2, '#e6dcc0', S + 4, { contorno: 1.8 })
    linha(c, [[x - 8, 190], [x + 10, 196]], '#d8d2c0', 5); linha(c, [[x - 8, 190], [x + 10, 196]], 'rgba(0,0,0,0.25)', 1.4) // fita
  },
  pe_ultimo(c, x, lado, t, fio, S) {
    const a = tubo([x, 148], [x + lado * 2, 170], [x + lado * 3, 190], 20, 8); tecido(c, t, a, fio, S)
    const r = rng(S)
    for (let i = 0; i < 6; i++) { // a perna desfia até o chão
      const x0 = x + lado * 3 + (i - 2.5) * 1.8, ang = (i - 2.5) * 0.14 + lado * 0.1
      c.beginPath(); c.moveTo(x0, 188); c.bezierCurveTo(x0 + ang * 60, 200, x0 - ang * 40 + r() * 8, 208, x0 + ang * 130, 214 - r() * 3)
      c.strokeStyle = TINTA; c.lineWidth = 3.2; c.lineCap = 'round'; c.stroke(); c.strokeStyle = i % 2 ? TEC[t].luz : '#efe6cf'; c.lineWidth = 1.6; c.stroke()
    }
  },
}

// ------------------------------------------------------------------ tronco (12) e detalhes por tronco

const DETALHE_TRONCO = {
  tr_jeans_rebitado(c, S) { c.fillStyle = '#c8ccd2'; c.strokeStyle = '#2a2c30'; c.lineWidth = 1.2; for (const [x, y] of [[48, 96], [112, 96], [48, 148], [112, 148]]) { circ(c, x, y, 3.4); c.fill(); c.stroke() } },
  tr_jeans_surrado(c, S) { for (const [x, y] of [[52, 140], [104, 108]]) { c.fillStyle = '#f3ecda'; c.beginPath(); c.ellipse(x, y, 8, 5, 0.4, 0, 6.3); c.fill(); for (let k = -3; k <= 3; k++) linha(c, [[x + k * 2.2 - 3, y - 4], [x + k * 2.2 + 3, y + 5]], 'rgba(40,60,100,0.8)', 1) } },
  tr_seda_bordada(c, S) { for (let i = 0; i < 5; i++) { const x = 50 + i * 15; c.fillStyle = '#ffe28a'; circ(c, x, 152, 2.4); c.fill(); curva(c, [x - 6, 150], [x, 144], [x + 6, 150], '#ffe28a', 1.4) } },
  tr_seda_rota(c, S) { linha(c, [[46, 100], [60, 110], [52, 122], [68, 130]], '#2a0d24', 3); for (let i = 0; i < 6; i++) linha(c, [[48 + i * 4, 98 + i * 3], [44 + i * 4, 106 + i * 3]], 'rgba(255,255,255,0.5)', 1) },
  tr_la_embolada(c, S) { const r = rng(S); c.fillStyle = 'rgba(255,248,225,0.8)'; c.strokeStyle = 'rgba(100,80,40,0.6)'; c.lineWidth = 1; for (let i = 0; i < 9; i++) { const x = 48 + r() * 64, y = 94 + r() * 60; circ(c, x, y, 2.5 + r() * 2); c.fill(); c.stroke() } },
  tr_la_tricotada(c, S) { c.strokeStyle = 'rgba(90,70,35,0.5)'; c.lineWidth = 2; for (const x of [58, 80, 102]) { c.beginPath(); c.moveTo(x, 94); for (let y = 94; y < 152; y += 8) c.bezierCurveTo(x - 6, y + 2, x + 6, y + 6, x, y + 8); c.stroke() } },
  tr_feltro_duro(c, S) { c.fillStyle = '#9aa0a6'; c.strokeStyle = '#2a2c30'; c.lineWidth = 1.2; for (const [x, y] of [[47, 95], [113, 95], [47, 149], [113, 149]]) { c.beginPath(); c.rect(x - 3, y - 3, 6, 6); c.fill(); c.stroke() } },
  tr_feltro_manchado(c, S) { c.fillStyle = 'rgba(30,20,10,0.35)'; for (const [x, y, rx, ry] of [[56, 138, 10, 7], [108, 104, 8, 10], [96, 146, 6, 4]]) { c.beginPath(); c.ellipse(x, y, rx, ry, 0.5, 0, 6.3); c.fill() } },
  tr_tule_rasgado(c, S) { c.fillStyle = '#16060c'; c.beginPath(); c.moveTo(100, 94); c.lineTo(108, 112); c.lineTo(102, 114); c.lineTo(112, 134); c.lineTo(106, 136); c.lineTo(96, 112); c.lineTo(104, 108); c.closePath(); c.fill() },
  tr_tule_armado(c, S) { c.strokeStyle = 'rgba(40,30,90,0.6)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(46, 100); c.quadraticCurveTo(80, 90, 114, 100); c.moveTo(46, 150); c.quadraticCurveTo(80, 160, 114, 150); c.moveTo(44, 100); c.lineTo(44, 150); c.moveTo(116, 100); c.lineTo(116, 150); c.stroke() },
  tr_couro_curtido(c, S) { c.fillStyle = '#d9c9a0'; c.strokeStyle = '#4b3a18'; c.lineWidth = 1.2; for (const [x, y] of [[48, 96], [112, 96], [48, 148], [112, 148], [80, 96]]) { circ(c, x, y, 2.6); c.fill(); c.stroke() } },
  tr_couro_rachado(c, S) { linha(c, [[60, 92], [66, 108], [58, 120], [68, 134], [62, 150]], '#1b0b00', 2.6); linha(c, [[100, 94], [96, 112], [104, 126]], '#1b0b00', 2.2); for (const [x, y] of [[66, 108], [58, 120], [68, 134]]) linha(c, [[x - 5, y - 2], [x + 5, y + 2]], 'rgba(235,225,200,0.75)', 1.4) },
}

function tronco(c, id, tipo, fio, S) {
  const f = patch(38, 86, 84, 72, 17, 4, S); tecido(c, tipo, f, fio, S)
  c.save(); c.clip(f.p); DETALHE_TRONCO[id]?.(c, S); c.restore()
  // zíper-cicatriz da barriga (costura grossa) para cara de boneco remendado
  c.strokeStyle = 'rgba(15,5,20,0.55)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(80, 150); c.lineTo(80, 158); c.stroke()
}

// ------------------------------------------------------------------ bordados (8): emblema no peito, em linha de bordar

function satin(c, forma, cor, ang = 0.7) {
  c.save(); c.clip(forma); c.strokeStyle = cor; c.lineWidth = 1.9; const d = 3.2
  c.translate(80, 125); c.rotate(ang)
  for (let k = -30; k < 30; k += d) { c.beginPath(); c.moveTo(k, -30); c.lineTo(k, 30); c.stroke() }
  c.restore()
}
const BORDADOS_DESENHO = {
  espinho(c) { // três espinhos de cacto bordados
    const p = new Path2D(); p.moveTo(80, 104); p.lineTo(86, 124); p.lineTo(98, 112); p.lineTo(92, 130); p.lineTo(104, 134); p.lineTo(88, 138); p.lineTo(92, 148); p.lineTo(80, 140); p.lineTo(68, 148); p.lineTo(72, 138); p.lineTo(56, 134); p.lineTo(68, 130); p.lineTo(62, 112); p.lineTo(74, 124); p.closePath()
    satin(c, p, '#7ee08a'); c.strokeStyle = '#1d4a24'; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke(p)
  },
  remendo_vivo(c) { // cruz de remendo com coração
    const p = new Path2D(); p.rect(72, 106, 16, 40); p.rect(60, 118, 40, 16)
    satin(c, p, '#7ee08a', 0.2); c.strokeStyle = '#f4efe0'; c.lineWidth = 2; c.setLineDash([3, 3]); c.stroke(p); c.setLineDash([])
    c.fillStyle = '#ff6b8a'; c.beginPath(); c.moveTo(80, 130); c.bezierCurveTo(70, 122, 72, 114, 80, 120); c.bezierCurveTo(88, 114, 90, 122, 80, 130); c.fill()
  },
  botao_reserva(c) { // botão de reserva dentro de um bolsinho bordado
    const p = patch(62, 108, 36, 34, 6, 0, 5).p
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fill(p); c.strokeStyle = '#f4efe0'; c.lineWidth = 2; c.setLineDash([3, 3]); c.stroke(p); c.setLineDash([])
    olhoBotao(c, 80, 125, 10, 0.5, 'vivo', 'D'); curva(c, [80, 135], [90, 146], [98, 142], '#f4efe0', 1.6)
  },
  agulha_afiada(c) { // duas agulhas cruzadas
    for (const s of [-1, 1]) { linha(c, [[80 - s * 22, 106], [80 + s * 22, 146]], TINTA, 6); linha(c, [[80 - s * 22, 106], [80 + s * 22, 146]], '#d6dce4', 3.4) ; c.strokeStyle = TINTA; c.lineWidth = 1.6; c.beginPath(); c.ellipse(80 - s * 20, 109, 1.8, 3.8, s * 0.5, 0, 6.3); c.stroke() }
    curva(c, [60, 108], [80, 150], [100, 112], '#e8344f', 1.8)
  },
  pe_de_chumbo(c) { // peso de chumbo (trapézio) com argola
    const p = new Path2D(); p.moveTo(68, 112); p.lineTo(92, 112); p.lineTo(102, 144); p.lineTo(58, 144); p.closePath()
    c.fillStyle = '#8b919a'; c.fill(p); satin(c, p, '#6b717a', 0.4); c.strokeStyle = '#1d1020'; c.lineWidth = 2.2; c.lineJoin = 'round'; c.stroke(p)
    c.strokeStyle = '#1d1020'; c.lineWidth = 3; circ(c, 80, 106, 7); c.stroke(); c.strokeStyle = '#8b919a'; c.lineWidth = 1.4; circ(c, 80, 106, 7); c.stroke()
    linha(c, [[66, 120], [72, 120]], 'rgba(255,255,255,0.6)', 2)
  },
  olho_de_vidro(c) { // olho de vidro bordado
    const p = new Path2D(); p.moveTo(54, 126); p.quadraticCurveTo(80, 100, 106, 126); p.quadraticCurveTo(80, 152, 54, 126); p.closePath()
    c.fillStyle = '#f4efe0'; c.fill(p); c.strokeStyle = '#1d1020'; c.lineWidth = 2.4; c.stroke(p)
    const g = c.createRadialGradient(77, 123, 1, 80, 126, 13); g.addColorStop(0, '#9be3ff'); g.addColorStop(1, '#1f5f8f'); c.fillStyle = g; circ(c, 80, 126, 13); c.fill()
    c.fillStyle = '#0a0a14'; circ(c, 80, 126, 6); c.fill(); c.fillStyle = '#fff'; circ(c, 76, 121, 2.6); c.fill()
  },
  rancor(c) { // sinal de raiva (veias saltadas) bordado em vermelho
    const p = new Path2D(); for (let i = 0; i < 4; i++) { const a = (Math.PI / 2) * i + 0.2; p.moveTo(80 + Math.cos(a) * 6, 126 + Math.sin(a) * 6); p.quadraticCurveTo(80 + Math.cos(a + 0.5) * 22, 126 + Math.sin(a + 0.5) * 22, 80 + Math.cos(a + 0.2) * 30, 126 + Math.sin(a + 0.2) * 30); p.quadraticCurveTo(80 + Math.cos(a - 0.4) * 18, 126 + Math.sin(a - 0.4) * 18, 80 + Math.cos(a) * 6, 126 + Math.sin(a) * 6) }
    c.fillStyle = '#e8344f'; c.fill(p); c.strokeStyle = '#4a0612'; c.lineWidth = 2; c.stroke(p)
  },
  bolso_de_linha(c) { // bolso com carretel de linha espiando
    c.fillStyle = '#b57c3e'; c.strokeStyle = TINTA; c.lineWidth = 2; c.beginPath(); c.roundRect(72, 96, 16, 8, 2); c.fill(); c.stroke()
    c.fillStyle = '#e8344f'; c.beginPath(); c.rect(73, 104, 14, 12); c.fill(); c.strokeStyle = TINTA; c.stroke()
    const b = patch(58, 112, 44, 34, 8, 0, 4).p; c.fillStyle = 'rgba(30,15,40,0.4)'; c.fill(b); c.strokeStyle = '#f4efe0'; c.lineWidth = 2; c.setLineDash([3, 3]); c.stroke(b); c.setLineDash([])
    linha(c, [[58, 122], [102, 122]], '#f4efe0', 2)
  },
}

// ------------------------------------------------------------------ montagem do boneco inteiro

function leitor(partes) {
  const o = {}
  for (const [slot, ref] of Object.entries(partes)) { const [id, rar] = String(ref).split('@'); o[slot] = { id, rar: rar || 'comum' } }
  return o
}

// Remendos de desgaste (Pontos de Costura): o nível 0..5 vem de nivelDeRemendo(); aqui só se desenha (nível n = n remendos).
const REMENDOS = [
  { x: 44, y: 126, w: 20, h: 17, tipo: 'jeans', rot: -0.12 },
  { x: 94, y: 96, w: 19, h: 17, tipo: 'feltro', rot: 0.1 },
  { x: 52, y: 160, w: 17, h: 15, tipo: 'couro', rot: 0.08 },
  { x: 92, y: 168, w: 17, h: 15, tipo: 'la', rot: -0.1 },
  { x: 100, y: 128, w: 17, h: 15, tipo: 'seda', rot: 0.14 },
]
function remendos(c, nivel) {
  for (let i = 0; i < Math.min(nivel, REMENDOS.length); i++) {
    const r = REMENDOS[i]
    c.save(); c.translate(r.x + r.w / 2, r.y + r.h / 2); c.rotate(r.rot); c.translate(-(r.x + r.w / 2), -(r.y + r.h / 2))
    const f = patch(r.x, r.y, r.w, r.h, 2, 2, 31 + i * 7)
    tecido(c, r.tipo, f, '#f4efe0', 17 + i, { contorno: 1.9 })
    c.strokeStyle = '#f4efe0'; c.lineWidth = 1.6; c.lineCap = 'round'
    c.beginPath(); c.moveTo(r.x + 4, r.y + 4); c.lineTo(r.x + r.w - 4, r.y + r.h - 4); c.moveTo(r.x + r.w - 4, r.y + 4); c.lineTo(r.x + 4, r.y + r.h - 4); c.stroke()
    c.restore()
  }
}

/** Desenha o boneco no espaço 160×232 (a tela escala). est: 'vivo' | 'fio' | 'caido'. remendo: 0..5 (desgaste). */
export function desenharBoneco(c, partes, est = 'vivo', remendo = 0) {
  const P = leitor(partes), S = (id) => Math.abs(hash(id)) % 9973 + 1
  const trTipo = tipoDaParte(P.tronco.id)
  const fio = (s) => FIO_RARIDADE[P[s].rar] ?? FIO_RARIDADE.comum
  c.save()
  // sombra no chão
  const sg = c.createRadialGradient(80, 214, 4, 80, 214, 56); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = sg; c.beginPath(); c.ellipse(80, 214, 56, 9, 0, 0, 6.3); c.fill()
  for (const [x, lado] of [[62, -1], [98, 1]]) PERNAS[P.pernas.id](c, x, lado, tipoDaParte(P.pernas.id), fio('pernas'), S(P.pernas.id) + (lado > 0 ? 7 : 0))
  tronco(c, P.tronco.id, trTipo, fio('tronco'), S(P.tronco.id))
  BORDADOS_DESENHO[PARTES[P.bordado.id].bordado](c)
  for (const lado of [-1, 1]) BRACOS[P.bracos.id](c, lado, tipoDaParte(P.bracos.id), fio('bracos'), S(P.bracos.id) + (lado > 0 ? 5 : 0))
  remendos(c, remendo)
  CABECAS[P.cabeca.id](c, tipoDaParte(P.cabeca.id), fio('cabeca'), est, S(P.cabeca.id))
  c.restore()
}

// ------------------------------------------------------------------ bitmaps em cache

const cacheSprites = new Map()
/** Bitmap do boneco (com a escala de tela embutida). Variantes: vivo · fio (pendurado) · caido (apagado). */
export function spriteDoBoneco(partes, est, escala, remendo = 0) {
  const chave = `${Object.values(partes).join('|')}|${est}|${escala.toFixed(2)}|${remendo}`
  let s = cacheSprites.get(chave)
  if (s) return s
  const cv = document.createElement('canvas'); cv.width = Math.ceil(SW * escala); cv.height = Math.ceil(SH * escala)
  const c = cv.getContext('2d'); c.scale(escala, escala)
  if (est === 'fio') { c.translate(0, -10) }
  desenharBoneco(c, partes, est, remendo)
  if (est === 'fio') { // o fio que o segura
    c.setTransform(escala, 0, 0, escala, 0, 0)
    linha(c, [[80, -2], [80, 16]], TINTA, 4.4); linha(c, [[80, -2], [80, 16]], '#efe6cf', 2.2)
  }
  if (est === 'caido') { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(70,56,84,0.5)'; c.fillRect(0, 0, cv.width, cv.height) }
  if (cacheSprites.size > 160) cacheSprites.clear()
  cacheSprites.set(chave, cv)
  return cv
}

const cacheMini = new Map()
/** Carinha (cabeça) do boneco como bitmap pequeno — para a carta mostrar de quem ela é. */
export function miniatura(partes, px) {
  const chave = `${partes.cabeca}|${partes.tronco}|${px}`
  let m = cacheMini.get(chave)
  if (m) return m
  const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(px)
  const c = cv.getContext('2d'); const esc = px / 112
  c.scale(esc, esc); c.translate(-24, -8)
  const P = leitor(partes), S = Math.abs(hash(P.cabeca.id)) % 9973 + 1
  CABECAS[P.cabeca.id](c, tipoDaParte(P.cabeca.id), FIO_RARIDADE[P.cabeca.rar] ?? FIO_RARIDADE.comum, 'vivo', S)
  cacheMini.set(chave, cv)
  return cv
}

const cacheTipo = new Map()
/** Ícone de textura do tipo (bitmap redondo com costura). */
export function iconeDoTipo(tipo, px) {
  const chave = `${tipo}|${px}`
  let m = cacheTipo.get(chave)
  if (m) return m
  const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(px)
  const c = cv.getContext('2d'); const e = px / 40; c.scale(e, e)
  const f = blob(20, 20, 17.5, 17.5, 4, 0.03, 12)
  tecido(c, tipo, f, '#f4efe0', 11, { forte: true, contorno: 2.4 })
  cacheTipo.set(chave, cv)
  return cv
}

/** Retalho de tecido do tipo, retangular, para fundo de faixa de carta (data URL em cache). */
const cacheFaixa = new Map()
export function faixaDoTipo(tipo) {
  let u = cacheFaixa.get(tipo)
  if (u) return u
  const cv = document.createElement('canvas'); cv.width = 160; cv.height = 44
  const c = cv.getContext('2d')
  const f = patch(0, 0, 160, 44, 0, 0, 2)
  tecido(c, tipo, { p: f.p, bb: { x: 0, y: 0, w: 160, h: 44 } }, '#f4efe0', 21, { forte: true, semCostura: true, contorno: 0 })
  u = cv.toDataURL(); cacheFaixa.set(tipo, u); return u
}

/** Ícone do bordado (peito do boneco recortado) para fichas. */
export function iconeDoBordado(idPassiva, px) {
  const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(px)
  const c = cv.getContext('2d'); const e = px / 64; c.scale(e, e); c.translate(-48, -93)
  BORDADOS_DESENHO[idPassiva](c)
  return cv
}

export const FIOS = FIO_RARIDADE
export { TEC }
