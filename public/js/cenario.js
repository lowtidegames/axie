// Frayz — CENÁRIO: a luta acontece em cima da mesa de costura de uma bruxa, num sótão, à noite.
// Três planos: (1) o sótão no escuro — vigas, janela redonda com a lua, prateleira com potes de botões;
// (2) a borda da mesa com objetos gigantes — máquina de costura em silhueta, vela acesa, alfineteiro, carretéis;
// (3) o pano de retalhos onde se luta, com 3 círculos bordados por lado e o nome do lugar bordado.
// Luz quente da vela no lado A, luz fria da lua no lado B. Por cima de tudo: a TESOURA enorme pendurada por um fio.
// Só desenho: nenhuma regra e nenhum número de jogo (o degrau da Tesoura e de quem é a vez chegam prontos em `estado`).
// O que não muda (inclusive o clarão da vela e a vinheta) fica guardado num canvas; por quadro só se desenha a chama,
// a poeira, os círculos acesos de quem tem a vez e a tesoura.
//
// cenario.desenhar(ctx, largura, altura, tempoMs, estado)
//   estado: { formato: 'pc' | 'celular', turno, tesoura: { degrau: 0..3, cortando, progresso: 0..1 }, vezDe: 'A' | 'B', menosAnimacao, semFrente }
//   Com `semFrente: true` a tesoura e a poeira da frente NÃO são desenhadas: chame cenario.desenharFrente(...)
//   depois de desenhar os bonecos, para a tesoura passar na frente deles.
// cenario.lugares(largura, altura, formato) → { A: [frente, meio, tras], B: [...] }, cada um { x, y, altura } (pé do boneco e altura dele)

const TAU = Math.PI * 2
const TINTA = '#140C1F', NOITE = '#1B1226', PANO_ESCURO = '#2A1B3D', PANO_CLARO = '#3A2752', BORDA = '#5A4378', LINHO = '#F2E6C9', LINHO_APAGADO = '#B9A98C', OURO = '#FFC857', CHAMA = '#FF9F1C', MALDICAO = '#FF4D8D'
const limita = (v, a, b) => (v < a ? a : v > b ? b : v)
const mix = (a, b, t) => a + (b - a) * t
const trecho = (p, a, b) => limita((p - a) / (b - a), 0, 1)
const vai = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
function hash(txt) { let h = 2166136261; for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU) }
function linha(c, pts, cor, lw) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.strokeStyle = cor; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke() }
const NOMES = ['FRENTE', 'MEIO', 'TRÁS']
const TAM = [1, 0.94, 0.88] // Frente inteiro, Meio 94%, Trás 88%

// ------------------------------------------------------------------ onde ficam os bonecos

/** Posições dos pés e altura de cada boneco. Bonecos nunca se tapam (cada um tem a sua caixa de 0,72 da altura). */
function lugares(W, H, formato) {
  const out = { A: [], B: [] }
  if (formato === 'celular') { // em pé: rival em cima, jogador embaixo; a Frente no meio, mais baixa e maior; Meio e Trás nas pontas
    const h = Math.min(W / 2.45, H * 0.285)
    const col = [0.5, 0.18, 0.82]
    for (let i = 0; i < 3; i++) {
      out.A.push({ x: W * col[i], y: H * [0.918, 0.874, 0.868][i], altura: h * TAM[i] })
      out.B.push({ x: W * (1 - col[i]), y: H * [0.455, 0.402, 0.396][i], altura: h * TAM[i] })
    }
  } else { // PC: times lado a lado; a Frente mais perto do centro, mais baixa e maior
    const h = Math.min(W / 4.8, H * 0.5), base = H - Math.max(40, h * 0.2), folga = h * 0.03
    let d = h * 0.2
    for (let i = 0; i < 3; i++) {
      const meia = h * TAM[i] * 0.36
      d += meia
      out.A.push({ x: W / 2 - d, y: base - h * 0.052 * i, altura: h * TAM[i] })
      out.B.push({ x: W / 2 + d, y: base - h * 0.052 * i, altura: h * TAM[i] })
      d += meia + folga
    }
  }
  for (const t of ['A', 'B']) out[t].forEach((l, i) => { l.nome = NOMES[i]; l.rx = l.altura * 0.34; l.ry = l.altura * (formato === 'celular' ? 0.1 : 0.085) })
  return out
}

// ------------------------------------------------------------------ peças do ateliê (desenhadas uma vez, no canvas guardado)

/** Luz de borda numa silhueta já recortada: quente de um lado, fria do outro. */
function bordaDeLuz(c, p, bb, quente = 0.3, fria = 0.3, d = 3) {
  c.save(); c.clip(p)
  const q1 = new Path2D(); q1.rect(bb[0] - 50, bb[1] - 50, bb[2] + 100, bb[3] + 100); q1.addPath(p, new DOMMatrix([1, 0, 0, 1, d, d * 0.8]))
  c.fillStyle = `rgba(255,170,70,${quente})`; c.fill(q1, 'evenodd')
  const q2 = new Path2D(); q2.rect(bb[0] - 50, bb[1] - 50, bb[2] + 100, bb[3] + 100); q2.addPath(p, new DOMMatrix([1, 0, 0, 1, -d, d * 0.3]))
  c.fillStyle = `rgba(150,200,255,${fria})`; c.fill(q2, 'evenodd')
  c.restore()
}

/** Máquina de costura antiga em silhueta. (x, y) = canto de baixo à esquerda; h = altura; a agulha fica à direita. */
function maquina(c, x, y, h, quente, fria) {
  const w = h * 1.34, X = (u) => x + u * w, Y = (v) => y - v * h
  const p = new Path2D()
  // base com pés
  p.moveTo(X(0.02), Y(0)); p.lineTo(X(0.02), Y(0.1)); p.quadraticCurveTo(X(0.02), Y(0.14), X(0.07), Y(0.14)); p.lineTo(X(0.12), Y(0.14))
  // coluna e braço
  p.bezierCurveTo(X(0.1), Y(0.4), X(0.08), Y(0.62), X(0.14), Y(0.8)); p.bezierCurveTo(X(0.2), Y(0.95), X(0.4), Y(0.93), X(0.6), Y(0.9))
  p.bezierCurveTo(X(0.78), Y(0.9), X(0.9), Y(0.86), X(0.9), Y(0.74)); p.lineTo(X(0.9), Y(0.44)); p.quadraticCurveTo(X(0.9), Y(0.39), X(0.86), Y(0.39))
  p.lineTo(X(0.78), Y(0.39)); p.quadraticCurveTo(X(0.75), Y(0.39), X(0.75), Y(0.44)); p.lineTo(X(0.75), Y(0.62))
  p.bezierCurveTo(X(0.66), Y(0.66), X(0.5), Y(0.68), X(0.38), Y(0.64)); p.bezierCurveTo(X(0.33), Y(0.5), X(0.34), Y(0.3), X(0.36), Y(0.14))
  p.lineTo(X(0.94), Y(0.14)); p.quadraticCurveTo(X(0.99), Y(0.14), X(0.99), Y(0.1)); p.lineTo(X(0.99), Y(0)); p.closePath()
  // volante
  p.moveTo(X(0.1) + h * 0.15, Y(0.66)); p.arc(X(0.1), Y(0.66), h * 0.15, 0, TAU)
  const g = c.createLinearGradient(0, Y(1), 0, Y(0)); g.addColorStop(0, '#1A1128'); g.addColorStop(1, '#100A1A')
  c.fillStyle = g; c.fill(p)
  bordaDeLuz(c, p, [x - h * 0.2, y - h, w + h * 0.4, h], quente, fria, Math.max(2, h * 0.012))
  // agulha, calcador, pino com carretel e a linha
  const lw = Math.max(1.2, h * 0.012)
  linha(c, [[X(0.82), Y(0.39)], [X(0.82), Y(0.19)]], '#8E98A6', lw); linha(c, [[X(0.86), Y(0.39)], [X(0.86), Y(0.24)], [X(0.8), Y(0.17)], [X(0.88), Y(0.17)]], '#3B3350', lw * 1.4)
  linha(c, [[X(0.5), Y(0.92)], [X(0.5), Y(1.04)]], '#3B3350', lw * 1.5)
  c.fillStyle = '#5A3C48'; c.fillRect(X(0.47), Y(1.02), w * 0.06, h * 0.09); c.fillStyle = '#2A1D2C'; c.fillRect(X(0.455), Y(1.035), w * 0.09, h * 0.018); c.fillRect(X(0.455), Y(0.94), w * 0.09, h * 0.018)
  c.beginPath(); c.moveTo(X(0.53), Y(0.98)); c.bezierCurveTo(X(0.66), Y(1.0), X(0.82), Y(0.98), X(0.84), Y(0.86)); c.strokeStyle = 'rgba(242,230,201,0.34)'; c.lineWidth = Math.max(0.8, h * 0.006); c.stroke()
  // arabesco gasto no braço e raios do volante
  c.strokeStyle = 'rgba(255,200,87,0.16)'; c.lineWidth = Math.max(1, h * 0.01); c.lineCap = 'round'
  c.beginPath(); c.moveTo(X(0.3), Y(0.8)); c.bezierCurveTo(X(0.36), Y(0.86), X(0.44), Y(0.74), X(0.5), Y(0.8)); c.bezierCurveTo(X(0.56), Y(0.86), X(0.62), Y(0.74), X(0.68), Y(0.79)); c.stroke()
  c.strokeStyle = 'rgba(150,200,255,0.12)'; circ(c, X(0.1), Y(0.66), h * 0.1); c.stroke()
  for (let i = 0; i < 4; i++) { const a = i * (Math.PI / 4) + 0.3; linha(c, [[X(0.1) - Math.cos(a) * h * 0.1, Y(0.66) - Math.sin(a) * h * 0.1], [X(0.1) + Math.cos(a) * h * 0.1, Y(0.66) + Math.sin(a) * h * 0.1]], 'rgba(150,200,255,0.08)', lw) }
}

/** Carretel de linha gigante (de pé ou deitado). (x, y) = meio da base. */
function carretel(c, x, y, h, cor, R, deitado = false, brilha = false) {
  const w = h * 0.74
  c.save(); c.translate(x, y); if (deitado) { c.translate(0, -w * 0.5); c.rotate(Math.PI / 2 + 0.06); c.translate(0, h * 0.5) }
  const madeira = (yy, alt) => { const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#7A5230'); g.addColorStop(0.5, '#5E3E26'); g.addColorStop(1, '#33212A'); c.fillStyle = g; c.beginPath(); c.roundRect(-w / 2, yy, w, alt, alt * 0.3); c.fill(); c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, h * 0.03); c.stroke() }
  const g = c.createLinearGradient(-w * 0.36, 0, w * 0.36, 0); g.addColorStop(0, cor); g.addColorStop(0.35, cor); g.addColorStop(1, TINTA)
  c.fillStyle = g; c.beginPath(); c.roundRect(-w * 0.36, -h * 0.86, w * 0.72, h * 0.72, w * 0.08); c.fill()
  c.save(); c.beginPath(); c.roundRect(-w * 0.36, -h * 0.86, w * 0.72, h * 0.72, w * 0.08); c.clip()
  c.strokeStyle = 'rgba(20,12,31,0.34)'; c.lineWidth = Math.max(0.8, h * 0.014)
  for (let k = -h * 0.86; k < -h * 0.12; k += h * 0.05) { c.beginPath(); c.moveTo(-w * 0.4, k); c.lineTo(w * 0.4, k + h * 0.03); c.stroke() }
  c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(-w * 0.3, -h, w * 0.12, h)
  c.restore()
  c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, h * 0.03); c.beginPath(); c.roundRect(-w * 0.36, -h * 0.86, w * 0.72, h * 0.72, w * 0.08); c.stroke()
  madeira(-h, h * 0.15); madeira(-h * 0.15, h * 0.15)
  if (brilha) { const gl = c.createRadialGradient(0, -h * 0.5, 1, 0, -h * 0.5, h * 0.9); gl.addColorStop(0, 'rgba(255,77,141,0.26)'); gl.addColorStop(1, 'rgba(255,77,141,0)'); c.fillStyle = gl; c.fillRect(-h, -h * 1.4, h * 2, h * 1.8) }
  c.restore()
  void R
}

/** Alfineteiro "morro": almofada gorda em gomos, espetada de alfinetes e uma agulha com linha. (x, y) = meio da base. */
function alfineteiro(c, x, y, h, R) {
  const w = h * 1.5
  for (let i = 0; i < 9; i++) { // alfinetes atrás
    const a = -Math.PI * (0.12 + 0.76 * (i / 8)) + (R() - 0.5) * 0.14, l = h * (0.34 + R() * 0.3), bx = x + Math.cos(a) * w * 0.34, by = y - h * 0.5 + Math.sin(a) * h * 0.4
    const ex = bx + Math.cos(a) * l, ey = by + Math.sin(a) * l
    linha(c, [[bx, by], [ex, ey]], '#8E98A6', Math.max(1, h * 0.016))
    c.fillStyle = ['#E2DAFA', '#8A4B5E', '#B9A98C', '#5F627C'][i % 4]; circ(c, ex, ey, Math.max(2, h * 0.045)); c.fill(); c.strokeStyle = TINTA; c.lineWidth = Math.max(1, h * 0.014); c.stroke()
  }
  const p = new Path2D(); p.moveTo(x - w / 2, y); p.bezierCurveTo(x - w * 0.6, y - h * 0.62, x - w * 0.3, y - h * 0.98, x, y - h); p.bezierCurveTo(x + w * 0.3, y - h * 0.98, x + w * 0.6, y - h * 0.62, x + w / 2, y); p.closePath()
  const g = c.createRadialGradient(x - w * 0.2, y - h * 0.75, h * 0.05, x, y - h * 0.4, w * 0.7); g.addColorStop(0, '#7A4458'); g.addColorStop(0.6, '#55304A'); g.addColorStop(1, '#2C1A33')
  c.fillStyle = g; c.fill(p)
  c.save(); c.clip(p); c.strokeStyle = 'rgba(20,12,31,0.5)'; c.lineWidth = Math.max(1.2, h * 0.02)
  for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(x, y - h * 1.02); c.quadraticCurveTo(x + i * w * 0.2, y - h * 0.5, x + i * w * 0.15, y + 2); c.stroke() }
  c.restore()
  bordaDeLuz(c, p, [x - w, y - h * 1.2, w * 2, h * 1.4], 0.2, 0.34, Math.max(2, h * 0.03))
  c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, h * 0.025); c.lineJoin = 'round'; c.stroke(p)
  c.fillStyle = '#B9A98C'; circ(c, x, y - h, Math.max(2.5, h * 0.05)); c.fill(); c.stroke()
  // agulha grande com linha da maldição
  linha(c, [[x + w * 0.12, y - h * 0.8], [x + w * 0.42, y - h * 1.5]], TINTA, Math.max(2.4, h * 0.04)); linha(c, [[x + w * 0.12, y - h * 0.8], [x + w * 0.42, y - h * 1.5]], '#C9D0D8', Math.max(1.2, h * 0.02))
  c.beginPath(); c.moveTo(x + w * 0.405, y - h * 1.44); c.bezierCurveTo(x + w * 0.7, y - h * 1.2, x + w * 0.5, y - h * 0.5, x + w * 0.74, y - h * 0.04); c.strokeStyle = 'rgba(255,77,141,0.7)'; c.lineWidth = Math.max(1, h * 0.014); c.stroke()
}

/** Pote de vidro com botões. (x, y) = meio da base. */
function pote(c, x, y, w, h, R) {
  const p = new Path2D(); p.roundRect(x - w / 2, y - h, w, h, w * 0.18)
  c.fillStyle = 'rgba(120,140,190,0.1)'; c.fill(p)
  c.save(); c.clip(p)
  const cores = ['#6B5A80', '#7A4458', '#8F7D55', '#4A5A70', '#5E6E58', '#9A8FB0']
  for (let i = 0; i < 26; i++) { const bx = x - w * 0.42 + R() * w * 0.84, by = y - R() * R() * h * 0.74, r = w * (0.08 + R() * 0.07); c.fillStyle = cores[Math.floor(R() * cores.length)]; circ(c, bx, by, r); c.fill(); c.strokeStyle = 'rgba(20,12,31,0.6)'; c.lineWidth = 0.8; c.stroke(); c.fillStyle = 'rgba(20,12,31,0.55)'; circ(c, bx - r * 0.25, by, r * 0.14); c.fill(); circ(c, bx + r * 0.25, by, r * 0.14); c.fill() }
  c.fillStyle = 'rgba(180,215,255,0.16)'; c.fillRect(x + w * 0.22, y - h, w * 0.1, h); c.fillStyle = 'rgba(255,190,110,0.1)'; c.fillRect(x - w * 0.4, y - h, w * 0.08, h)
  c.restore()
  c.strokeStyle = 'rgba(190,200,235,0.34)'; c.lineWidth = 1.2; c.stroke(p)
  c.fillStyle = '#3B2A30'; c.beginPath(); c.roundRect(x - w * 0.42, y - h - w * 0.16, w * 0.84, w * 0.2, w * 0.05); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 1.2; c.stroke()
}

/** Janela redonda do sótão com a lua. */
function janela(c, x, y, r) {
  c.save()
  const ceu = c.createRadialGradient(x + r * 0.2, y - r * 0.15, r * 0.1, x, y, r); ceu.addColorStop(0, '#3E4A8C'); ceu.addColorStop(0.6, '#262C60'); ceu.addColorStop(1, '#181A3C')
  circ(c, x, y, r); c.fillStyle = ceu; c.fill(); c.clip()
  const R = rng(77)
  c.fillStyle = 'rgba(226,218,250,0.8)'; for (let i = 0; i < 9; i++) { circ(c, x - r + R() * r * 2, y - r + R() * r * 1.4, 0.6 + R() * 0.9); c.fill() }
  // lua com halo
  const lx = x + r * 0.26, ly = y - r * 0.2, lr = r * 0.42
  const halo = c.createRadialGradient(lx, ly, lr * 0.8, lx, ly, lr * 2.6); halo.addColorStop(0, 'rgba(200,220,255,0.38)'); halo.addColorStop(1, 'rgba(200,220,255,0)')
  c.fillStyle = halo; c.fillRect(x - r, y - r, r * 2, r * 2)
  const lua = c.createRadialGradient(lx - lr * 0.3, ly - lr * 0.3, lr * 0.1, lx, ly, lr); lua.addColorStop(0, '#FBF8FF'); lua.addColorStop(1, '#C9CDEA')
  c.fillStyle = lua; circ(c, lx, ly, lr); c.fill()
  c.fillStyle = 'rgba(150,160,205,0.4)'; for (const [dx, dy, k] of [[-0.2, 0.1, 0.2], [0.3, -0.25, 0.13], [0.15, 0.4, 0.1], [-0.42, -0.3, 0.08]]) { circ(c, lx + dx * lr, ly + dy * lr, k * lr); c.fill() }
  // nuvem fina passando
  c.fillStyle = 'rgba(24,26,60,0.5)'; c.beginPath(); c.ellipse(x - r * 0.1, y + r * 0.12, r * 0.9, r * 0.11, -0.12, 0, TAU); c.fill()
  c.restore()
  // caixilho em cruz e aro de madeira
  const lw = Math.max(2.5, r * 0.09)
  linha(c, [[x - r, y], [x + r, y]], '#1E1426', lw); linha(c, [[x, y - r], [x, y + r]], '#1E1426', lw)
  linha(c, [[x - r, y - lw * 0.3], [x + r, y - lw * 0.3]], 'rgba(170,205,255,0.26)', Math.max(1, lw * 0.22))
  c.strokeStyle = '#1E1426'; c.lineWidth = lw * 1.9; circ(c, x, y, r + lw * 0.6); c.stroke()
  c.strokeStyle = 'rgba(170,205,255,0.3)'; c.lineWidth = Math.max(1, lw * 0.3); c.beginPath(); c.arc(x, y, r + lw * 0.05, Math.PI * 0.75, Math.PI * 1.75); c.stroke()
  c.strokeStyle = TINTA; c.lineWidth = Math.max(1.2, lw * 0.3); circ(c, x, y, r + lw * 1.5); c.stroke()
}

/** O pano de retalhos, em perspectiva. geo: { y0, y1, xe0, xd0, xe1, xd1 } (beira de trás e beira da frente). */
function panoDeRetalhos(c, geo, R, linhas, colunas, esc) {
  const { y0, y1, xe0, xd0, xe1, xd1 } = geo
  const P = (u, v) => { const k = Math.pow(v, 1.22); return [mix(mix(xe0, xe1, k), mix(xd0, xd1, k), u), mix(y0, y1, k)] }
  const cores = ['#2A1B3D', '#33214A', '#3A2752', '#2B2247', '#3A2440', '#2D2A4C', '#332038', '#2F2E44']
  const vs = [0]; for (let i = 1; i < linhas; i++) vs.push(i / linhas + (R() - 0.5) * 0.05); vs.push(1)
  const retalhos = []
  for (let i = 0; i < linhas; i++) {
    const n = colunas + (i % 2), us = [0]
    for (let j = 1; j < n; j++) us.push(j / n + (R() - 0.5) * 0.06); us.push(1)
    for (let j = 0; j < n; j++) {
      const jt = () => (R() - 0.5) * 0.012
      const q = [P(us[j] + jt(), vs[i] + jt()), P(us[j + 1] + jt(), vs[i] + jt()), P(us[j + 1] + jt(), vs[i + 1] + jt()), P(us[j] + jt(), vs[i + 1] + jt())]
      retalhos.push({ q, cor: cores[Math.floor(R() * cores.length)], tipo: Math.floor(R() * 5), v: vs[i] })
    }
  }
  const caminho = (q) => { const p = new Path2D(); p.moveTo(q[0][0], q[0][1]); for (let k = 1; k < 4; k++) p.lineTo(q[k][0], q[k][1]); p.closePath(); return p }
  for (const r of retalhos) {
    const p = caminho(r.q); c.fillStyle = r.cor; c.fill(p); c.strokeStyle = r.cor; c.lineWidth = 1; c.stroke(p)
    c.save(); c.clip(p)
    const x0 = Math.min(r.q[0][0], r.q[3][0]), x1 = Math.max(r.q[1][0], r.q[2][0]), ya = r.q[0][1] - 4, yb = r.q[2][1] + 4, k = (0.6 + r.v * 0.9) * esc
    c.lineWidth = Math.max(0.8, 1 * k)
    if (r.tipo === 1) { c.strokeStyle = 'rgba(242,230,201,0.06)'; for (let y = ya; y < yb; y += 6 * k) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke() } }
    else if (r.tipo === 2) { c.fillStyle = 'rgba(242,230,201,0.075)'; for (let y = ya, a = 0; y < yb; y += 9 * k, a++) for (let x = x0 + (a % 2) * 7 * k; x < x1; x += 14 * k) { c.beginPath(); c.ellipse(x, y, 1.7 * k, 1.1 * k, 0, 0, TAU); c.fill() } }
    else if (r.tipo === 3) { c.strokeStyle = 'rgba(20,12,31,0.2)'; for (let x = x0 - (yb - ya); x < x1; x += 9 * k) { c.beginPath(); c.moveTo(x, ya); c.lineTo(x + (yb - ya), yb); c.stroke() } }
    else if (r.tipo === 4) { c.strokeStyle = 'rgba(242,230,201,0.05)'; for (let x = x0; x < x1; x += 11 * k) { c.beginPath(); c.moveTo(x, ya); c.lineTo(x, yb); c.stroke() } for (let y = ya; y < yb; y += 8 * k) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke() } }
    c.restore()
  }
  // costuras entre os retalhos: sulco escuro + pesponto de linho dos dois lados
  for (const r of retalhos) {
    const p = caminho(r.q), k = (0.6 + r.v * 0.9) * esc
    c.strokeStyle = 'rgba(20,12,31,0.6)'; c.lineWidth = Math.max(1.4, 2.2 * k); c.lineJoin = 'round'; c.stroke(p)
    const m = [(r.q[0][0] + r.q[2][0]) / 2, (r.q[0][1] + r.q[2][1]) / 2], dentro = r.q.map((a) => [a[0] + (m[0] - a[0]) * 0.06 + Math.sign(m[0] - a[0]) * 2.5 * k, a[1] + (m[1] - a[1]) * 0.1 + Math.sign(m[1] - a[1]) * 2 * k])
    c.save(); c.setLineDash([4.5 * k, 3.6 * k]); c.lineCap = 'round'; c.strokeStyle = 'rgba(242,230,201,0.17)'; c.lineWidth = Math.max(0.9, 1.25 * k); c.stroke(caminho(dentro)); c.restore()
  }
  return P
}

/** Círculo bordado de um lugar + o nome bordado embaixo. */
function lugarBordado(c, l, esc, corFio, nome) {
  const { x, y, rx, ry } = l
  c.save()
  c.fillStyle = 'rgba(20,12,31,0.34)'; c.beginPath(); c.ellipse(x, y + ry * 0.12, rx * 1.06, ry * 1.1, 0, 0, TAU); c.fill()
  const g = c.createRadialGradient(x, y, rx * 0.1, x, y, rx); g.addColorStop(0, 'rgba(90,67,120,0.5)'); g.addColorStop(1, 'rgba(58,39,82,0.36)')
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill()
  c.strokeStyle = 'rgba(20,12,31,0.7)'; c.lineWidth = Math.max(1.2, 1.6 * esc); c.stroke()
  // anel em ponto cheio: traços curtos atravessados
  c.strokeStyle = corFio; c.lineWidth = Math.max(1, 1.5 * esc); c.lineCap = 'round'
  const n = Math.max(24, Math.round(rx / (2.4 * esc)))
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, ca = Math.cos(a), sa = Math.sin(a); c.beginPath(); c.moveTo(x + ca * rx * 0.86, y + sa * ry * 0.84); c.lineTo(x + ca * rx * 0.95 + sa * 1.2 * esc, y + sa * ry * 0.94); c.stroke() }
  c.setLineDash([4 * esc, 3.2 * esc]); c.globalAlpha = 0.7; c.beginPath(); c.ellipse(x, y, rx * 0.74, ry * 0.72, 0, 0, TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = 1
  // nome bordado (letras em ponto atrás)
  const px = Math.max(8, Math.round(l.altura * 0.075))
  c.font = `800 ${px}px "Lilita One", "Nunito", "Trebuchet MS", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
  try { c.letterSpacing = Math.max(1, px * 0.16) + 'px' } catch { /* navegador antigo */ }
  const ty = y + ry + px * 0.9
  c.fillStyle = 'rgba(20,12,31,0.55)'; c.fillText(nome, x + 0.6, ty + 1)
  c.fillStyle = corFio; c.globalAlpha = 0.34; c.fillText(nome, x, ty); c.globalAlpha = 0.95
  c.setLineDash([1.7 * esc, 1.2 * esc]); c.lineWidth = Math.max(0.7, 0.85 * esc); c.strokeStyle = corFio; c.strokeText(nome, x, ty)
  c.restore()
}

// ------------------------------------------------------------------ a tesoura (duas metades guardadas; por quadro só giram)

function metadeDaTesoura(L, lado, e) {
  const cv = document.createElement('canvas'); const w = L * 1.1, h = L * 2
  cv.width = Math.ceil(w * e); cv.height = Math.ceil(h * e)
  const c = cv.getContext('2d'); c.scale(e, e); c.translate(w / 2, L * 0.82); c.scale(lado, 1) // pino em (w/2, 0.82 L); lâmina para baixo
  const lw = Math.max(1.6, L * 0.02)
  // cabo: haste e argola esmaltada
  c.save(); c.translate(-L * 0.19, -L * 0.52); c.rotate(0.3)
  c.beginPath(); c.ellipse(0, 0, L * 0.125, L * 0.185, 0, 0, TAU)
  c.strokeStyle = TINTA; c.lineWidth = L * 0.085 + lw * 2; c.stroke()
  const ge = c.createLinearGradient(-L * 0.2, -L * 0.2, L * 0.2, L * 0.2); ge.addColorStop(0, '#6A4E8C'); ge.addColorStop(0.5, '#3A2752'); ge.addColorStop(1, '#22163A')
  c.strokeStyle = ge; c.lineWidth = L * 0.085; c.stroke()
  c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = L * 0.016; c.beginPath(); c.ellipse(0, 0, L * 0.15, L * 0.21, 0, Math.PI * 1.05, Math.PI * 1.6); c.stroke()
  c.restore()
  const haste = new Path2D(); haste.moveTo(L * 0.05, L * 0.02); haste.lineTo(-L * 0.015, -L * 0.06); haste.quadraticCurveTo(-L * 0.06, -L * 0.2, -L * 0.1, -L * 0.36); haste.lineTo(-L * 0.185, -L * 0.33); haste.quadraticCurveTo(-L * 0.13, -L * 0.14, -L * 0.07, L * 0.02); haste.closePath()
  c.fillStyle = '#3A2752'; c.fill(haste); c.strokeStyle = TINTA; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(haste)
  // lâmina de aço
  const lam = new Path2D(); lam.moveTo(-L * 0.05, -L * 0.03); lam.lineTo(-L * 0.018, L); lam.quadraticCurveTo(L * 0.14, L * 0.58, L * 0.155, L * 0.06); lam.quadraticCurveTo(L * 0.145, -L * 0.05, L * 0.06, -L * 0.07); lam.closePath()
  const ga = c.createLinearGradient(-L * 0.05, 0, L * 0.155, 0); ga.addColorStop(0, '#F3F6FA'); ga.addColorStop(0.3, '#C9D0D8'); ga.addColorStop(1, '#6E7888')
  c.fillStyle = ga; c.fill(lam)
  c.save(); c.clip(lam)
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.moveTo(-L * 0.05, -L * 0.03); c.lineTo(-L * 0.018, L); c.lineTo(L * 0.004, L * 0.9); c.lineTo(-L * 0.012, -L * 0.03); c.closePath(); c.fill() // fio da lâmina
  c.fillStyle = 'rgba(160,200,255,0.3)'; c.beginPath(); c.moveTo(L * 0.05, L * 0.1); c.lineTo(L * 0.075, L * 0.1); c.lineTo(L * 0.03, L * 0.8); c.lineTo(L * 0.016, L * 0.8); c.closePath(); c.fill()
  c.fillStyle = 'rgba(20,12,31,0.22)'; c.fillRect(-L * 0.1, -L * 0.1, L * 0.3, L * 0.17)
  c.restore()
  c.strokeStyle = TINTA; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(lam)
  // recorta na caixa do desenho (uma leitura de pixels, só aqui, ao criar)
  const d = c.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0
  for (let y = 0, i = 3; y < cv.height; y++) for (let x = 0; x < cv.width; x++, i += 4) if (d[i] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(cv.width - 1, x1 + 2); y1 = Math.min(cv.height - 1, y1 + 2)
  const rec = document.createElement('canvas'); rec.width = x1 - x0 + 1; rec.height = y1 - y0 + 1; rec.getContext('2d').drawImage(cv, -x0, -y0)
  return { cv: rec, w: rec.width / e, h: rec.height / e, px: w / 2 - x0 / e, py: L * 0.82 - y0 / e }
}

// ------------------------------------------------------------------ o cenário

export function criarCenario(opcoes = {}) {
  const semente = hash(String(opcoes.semente ?? 'atelie'))
  const nomes = opcoes.nomes ?? NOMES
  let fundo = null, chaveFundo = '', geo = null
  let tesoura = null, chaveTesoura = ''
  let degrau = 0, vez = 0.5, tAnt = null
  const motas = Array.from({ length: 26 }, (_, i) => { const R = rng(semente + i * 31); return { u: R(), v: R(), f1: 2600 + R() * 3000, f2: 3400 + R() * 3600, p1: R() * TAU, p2: R() * TAU, r: 0.7 + R() * 1.3, sobe: 0.004 + R() * 0.01, frente: i < 6 } })

  /** Desenha tudo o que não muda num canvas do tamanho da tela. */
  function assarFundo(W, H, formato, e) {
    const cv = document.createElement('canvas'); cv.width = Math.round(W * e); cv.height = Math.round(H * e)
    const c = cv.getContext('2d'); c.scale(e, e)
    const R = rng(semente), cel = formato === 'celular', L = lugares(W, H, formato)
    const hor = cel ? H * 0.158 : H * 0.5 // beira de trás da mesa
    const u = cel ? Math.min(W, H) / 360 : H / 480 // unidade de detalhe
    const G = { W, H, cel, hor, u }

    // ---- plano 1: o sótão
    let g = c.createLinearGradient(0, 0, 0, hor); g.addColorStop(0, '#120B1C'); g.addColorStop(1, '#241733')
    c.fillStyle = g; c.fillRect(0, 0, W, hor + 2)
    // tábuas da parede
    const nt = cel ? 9 : 17
    for (let i = 0; i <= nt; i++) { const x = (W * i) / nt + (R() - 0.5) * 6 * u; c.fillStyle = `rgba(20,12,31,${0.25 + R() * 0.2})`; c.fillRect(x, 0, Math.max(1.2, 1.6 * u), hor); c.fillStyle = 'rgba(242,230,201,0.022)'; c.fillRect(x + 2 * u, 0, (W / nt) * (0.3 + R() * 0.5), hor) }
    for (let i = 0; i < (cel ? 3 : 7); i++) { const x = R() * W, y = R() * hor * 0.9; c.strokeStyle = 'rgba(20,12,31,0.4)'; c.lineWidth = 1.2 * u; c.beginPath(); c.ellipse(x, y, 3 * u, 5 * u, 0, 0, TAU); c.stroke() }
    // luz fria da lua na parede (da direita) e quente da vela (da esquerda)
    const jx = cel ? W * 0.8 : W * 0.755, jy = cel ? hor * 0.5 : H * 0.185, jr = cel ? hor * 0.36 : H * 0.13
    const vx = cel ? W * 0.065 : (L.A[2].x + L.A[2].altura * 0.36 + L.A[1].x - L.A[1].altura * 0.36) / 2, vyBase = cel ? H * 0.588 : hor + H * 0.012, vAlt = cel ? H * 0.105 : H * 0.24
    G.vela = { x: vx, base: vyBase, alt: vAlt, larg: (cel ? 15 : 22) * u }
    g = c.createRadialGradient(jx, jy, jr * 0.5, jx, jy, cel ? W * 0.7 : H * 0.95); g.addColorStop(0, 'rgba(120,150,235,0.3)'); g.addColorStop(0.5, 'rgba(90,110,200,0.1)'); g.addColorStop(1, 'rgba(90,110,200,0)')
    c.fillStyle = g; c.fillRect(0, 0, W, hor + 2)
    if (!cel) { g = c.createRadialGradient(vx, vyBase - vAlt, 4, vx, vyBase - vAlt, H * 0.8); g.addColorStop(0, 'rgba(255,159,28,0.26)'); g.addColorStop(0.5, 'rgba(255,130,40,0.08)'); g.addColorStop(1, 'rgba(255,130,40,0)'); c.fillStyle = g; c.fillRect(0, 0, W, hor + 2) }
    // vigas do telhado (duas águas) e viga de cima
    const viga = (x0, y0, x1, y1, lw) => { linha(c, [[x0, y0], [x1, y1]], '#0E0816', lw); linha(c, [[x0 + lw * 0.2, y0 - lw * 0.32], [x1 + lw * 0.2, y1 - lw * 0.32]], 'rgba(255,170,90,0.07)', lw * 0.16); linha(c, [[x0 - lw * 0.1, y0 + lw * 0.36], [x1 - lw * 0.1, y1 + lw * 0.36]], 'rgba(20,12,31,0.6)', lw * 0.2) }
    if (cel) { viga(-10, hor * 0.9, W * 0.36, -hor * 0.3, 11 * u); viga(W + 10, hor * 0.62, W * 0.62, -hor * 0.3, 11 * u) } else {
      viga(-20, hor * 0.86, W * 0.33, -H * 0.1, 26 * u); viga(W + 20, hor * 0.74, W * 0.6, -H * 0.12, 26 * u); viga(W * 0.16, H * 0.035, W * 0.84, H * 0.02, 18 * u)
      c.fillStyle = 'rgba(8,4,14,0.55)'; c.beginPath(); c.moveTo(-20, hor * 0.86); c.lineTo(W * 0.33, -H * 0.1); c.lineTo(-20, -H * 0.1); c.closePath(); c.fill()
      c.beginPath(); c.moveTo(W + 20, hor * 0.74); c.lineTo(W * 0.6, -H * 0.12); c.lineTo(W + 20, -H * 0.12); c.closePath(); c.fill()
    }
    janela(c, jx, jy, jr)
    // facho da lua descendo para a mesa (para o lado B)
    c.save(); c.globalCompositeOperation = 'lighter'
    g = c.createLinearGradient(jx, jy, cel ? W * 0.55 : W * 0.66, cel ? H * 0.5 : H); g.addColorStop(0, 'rgba(150,180,255,0.16)'); g.addColorStop(1, 'rgba(150,180,255,0)')
    c.fillStyle = g; c.beginPath(); c.moveTo(jx - jr * 0.9, jy - jr * 0.2); c.lineTo(jx + jr * 0.9, jy + jr * 0.3)
    if (cel) { c.lineTo(W * 1.02, H * 0.5); c.lineTo(W * 0.3, H * 0.52) } else { c.lineTo(W * 1.0, H * 1.02); c.lineTo(W * 0.5, H * 1.02) }
    c.closePath(); c.fill(); c.restore()
    // prateleira com potes de botões e pano dobrado
    if (!cel) {
      const px0 = W * 0.44, px1 = W * 0.635, py = H * 0.2
      c.fillStyle = 'rgba(8,4,14,0.4)'; c.fillRect(px0 - 2, py + 9 * u, px1 - px0 + 4, 12 * u)
      let x = px0 + 16 * u
      for (const [w, h] of [[26, 40], [20, 28], [30, 46], [18, 24]]) { pote(c, x + (w * u) / 2, py, w * u, h * u, R); x += (w + 9) * u }
      for (let i = 0; i < 3; i++) { c.fillStyle = ['#3A2440', '#2D2A4C', '#4A3040'][i]; c.beginPath(); c.roundRect(px1 - 40 * u, py - (8 + i * 7.4) * u, 32 * u - i * 2 * u, 7 * u, 3 * u); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 1.1 * u; c.stroke() }
      c.fillStyle = '#2A1D24'; c.fillRect(px0, py, px1 - px0, 7 * u); c.strokeStyle = TINTA; c.lineWidth = 1.4 * u; c.strokeRect(px0, py, px1 - px0, 7 * u)
      c.fillStyle = 'rgba(255,170,90,0.12)'; c.fillRect(px0, py, px1 - px0, 1.6 * u)
      for (const bx of [px0 + 14 * u, px1 - 14 * u]) { c.fillStyle = '#1A1020'; c.beginPath(); c.moveTo(bx - 3 * u, py + 7 * u); c.lineTo(bx + 3 * u, py + 7 * u); c.lineTo(bx - 3 * u, py + 22 * u); c.closePath(); c.fill() }
      // varal de retalhos entre a viga e a prateleira
      const va = [[W * 0.2, H * 0.1], [W * 0.31, H * 0.165], [W * 0.43, H * 0.135]]
      c.beginPath(); c.moveTo(va[0][0], va[0][1]); c.quadraticCurveTo(va[1][0], va[1][1] + 14 * u, va[2][0], va[2][1]); c.strokeStyle = 'rgba(242,230,201,0.28)'; c.lineWidth = 1.1 * u; c.stroke()
      for (let i = 1; i < 7; i++) { const t = i / 7, x2 = (1 - t) * (1 - t) * va[0][0] + 2 * (1 - t) * t * va[1][0] + t * t * va[2][0], y2 = (1 - t) * (1 - t) * va[0][1] + 2 * (1 - t) * t * (va[1][1] + 14 * u) + t * t * va[2][1]
        c.fillStyle = ['#4A3466', '#55304A', '#3E4468', '#5A4A3C', '#3F4F48', '#4A3466'][i - 1]; c.beginPath(); c.moveTo(x2 - 7 * u, y2); c.lineTo(x2 + 7 * u, y2 + 1.5 * u); c.lineTo(x2 + (R() - 0.5) * 3 * u, y2 + 17 * u); c.closePath(); c.fill(); c.strokeStyle = 'rgba(20,12,31,0.8)'; c.lineWidth = 1 * u; c.stroke() }
    }

    // ---- plano 2: a mesa e os objetos gigantes na borda de trás
    const geoPano = cel ? { y0: hor + H * 0.012, y1: H * 1.02, xe0: W * 0.02, xd0: W * 0.98, xe1: -W * 0.03, xd1: W * 1.03 } : { y0: hor + H * 0.05, y1: H * 1.06, xe0: W * 0.065, xd0: W * 0.935, xe1: -W * 0.06, xd1: W * 1.06 }
    g = c.createLinearGradient(0, hor, 0, H); g.addColorStop(0, '#3A2630'); g.addColorStop(0.2, '#2C1C28'); g.addColorStop(1, '#1E1220')
    c.fillStyle = g; c.fillRect(0, hor, W, H - hor)
    for (let i = 0; i < 9; i++) { const y = hor + 2 + R() * (geoPano.y0 - hor + 8 * u); c.strokeStyle = `rgba(20,12,31,${0.25 + R() * 0.25})`; c.lineWidth = 1 * u; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(W * 0.3, y + (R() - 0.5) * 4 * u, W * 0.7, y + (R() - 0.5) * 4 * u, W, y + (R() - 0.5) * 3 * u); c.stroke() }
    c.fillStyle = 'rgba(255,170,90,0.22)'; c.fillRect(0, hor, W * 0.5, 1.6 * u); c.fillStyle = 'rgba(150,190,255,0.2)'; c.fillRect(W * 0.5, hor, W * 0.5, 1.6 * u)
    c.fillStyle = 'rgba(8,4,14,0.6)'; c.fillRect(0, hor - 5 * u, W, 5 * u)
    if (cel) {
      maquina(c, W * 0.2, hor + 2, hor * 0.8, 0.22, 0.2)
      carretel(c, W * 0.62, hor + 3, hor * 0.42, '#5F627C', R)
    } else {
      maquina(c, W * 0.105, hor + H * 0.02, H * 0.335, 0.26, 0.2)
      alfineteiro(c, W * 0.585, hor + H * 0.03, H * 0.125, R)
      carretel(c, W * 0.885, hor + H * 0.03, H * 0.16, '#8A4B5E', R); carretel(c, W * 0.945, hor + H * 0.036, H * 0.125, '#5F627C', R)
      carretel(c, W * 0.835, hor + H * 0.045, H * 0.1, MALDICAO, R, true, true)
      // dedal esquecido e botões soltos na madeira
      c.fillStyle = '#8E98A6'; c.beginPath(); c.roundRect(W * 0.665, hor - H * 0.02, 16 * u, 22 * u, [8 * u, 8 * u, 2 * u, 2 * u]); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 1.4 * u; c.stroke()
      c.fillStyle = 'rgba(20,12,31,0.35)'; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { circ(c, W * 0.665 + (3.5 + b * 4.5) * u, hor - H * 0.02 + (5 + a * 4.5) * u, 0.9 * u); c.fill() }
    }

    // ---- plano 3: o pano de retalhos
    const sob = c.createLinearGradient(0, geoPano.y0 - 10 * u, 0, geoPano.y0 + 8 * u); sob.addColorStop(0, 'rgba(8,4,14,0)'); sob.addColorStop(1, 'rgba(8,4,14,0.5)')
    c.fillStyle = sob; c.fillRect(0, geoPano.y0 - 10 * u, W, 18 * u)
    const P = panoDeRetalhos(c, geoPano, R, cel ? 7 : 4, cel ? 4 : 8, u)
    // barra do pano na beira de trás: franja em bicos
    c.fillStyle = '#241733'; c.beginPath(); c.moveTo(geoPano.xe0, geoPano.y0 + 1)
    const nb = cel ? 22 : 44; for (let i = 0; i <= nb; i++) { const x = mix(geoPano.xe0, geoPano.xd0, i / nb); c.lineTo(x, geoPano.y0 - (i % 2 ? 4.5 * u : 0)) }
    c.lineTo(geoPano.xd0, geoPano.y0 + 1); c.closePath(); c.fill(); c.strokeStyle = 'rgba(20,12,31,0.8)'; c.lineWidth = 1.2 * u; c.stroke()
    // costura do meio (divide os dois lados): fita com zigue-zague
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'
    const meio = []
    if (cel) { const ym = H * 0.565; for (let i = 0; i <= 40; i++) meio.push([W * (i / 40), ym + Math.sin(i * 0.5) * 1.2 * u]) } else for (let i = 0; i <= 30; i++) meio.push(P(0.5, i / 30))
    linha(c, meio, 'rgba(20,12,31,0.55)', 9 * u); linha(c, meio, 'rgba(90,67,120,0.55)', 6.5 * u)
    c.setLineDash([3.2 * u, 3.2 * u]); linha(c, meio.map((q, i) => (cel ? [q[0], q[1] + (i % 2 ? 2 : -2) * u] : [q[0] + (i % 2 ? 2 : -2) * u * (0.6 + (i / 30) * 0.9), q[1]])), 'rgba(242,230,201,0.5)', 1.3 * u); c.setLineDash([])
    c.restore()
    // luz no pano: vela quente no lado A, lua fria no lado B
    c.save(); c.globalCompositeOperation = 'lighter'
    if (cel) {
      g = c.createRadialGradient(W * 0.12, H * 0.66, 10, W * 0.3, H * 0.8, H * 0.5); g.addColorStop(0, 'rgba(255,150,40,0.3)'); g.addColorStop(0.5, 'rgba(255,130,40,0.11)'); g.addColorStop(1, 'rgba(255,130,40,0)')
      c.fillStyle = g; c.fillRect(0, hor, W, H - hor)
      g = c.createRadialGradient(W * 0.8, H * 0.2, 10, W * 0.6, H * 0.34, H * 0.42); g.addColorStop(0, 'rgba(120,160,255,0.26)'); g.addColorStop(0.55, 'rgba(110,150,255,0.09)'); g.addColorStop(1, 'rgba(110,150,255,0)')
      c.fillStyle = g; c.fillRect(0, hor, W, H - hor)
    } else {
      g = c.createRadialGradient(W * 0.14, hor + H * 0.1, 10, W * 0.24, H * 0.8, W * 0.44); g.addColorStop(0, 'rgba(255,150,40,0.34)'); g.addColorStop(0.5, 'rgba(255,130,40,0.12)'); g.addColorStop(1, 'rgba(255,130,40,0)')
      c.fillStyle = g; c.fillRect(0, hor, W, H - hor)
      g = c.createRadialGradient(W * 0.8, hor + H * 0.06, 10, W * 0.76, H * 0.8, W * 0.44); g.addColorStop(0, 'rgba(120,160,255,0.28)'); g.addColorStop(0.5, 'rgba(110,150,255,0.1)'); g.addColorStop(1, 'rgba(110,150,255,0)')
      c.fillStyle = g; c.fillRect(0, hor, W, H - hor)
    }
    c.restore()
    // os três círculos bordados de cada lado, com o nome
    for (const t of ['A', 'B']) [...L[t]].sort((a, b) => a.y - b.y).forEach((l) => lugarBordado(c, l, u, t === 'A' ? 'rgba(255,222,170,0.82)' : 'rgba(214,226,255,0.82)', nomes[NOMES.indexOf(l.nome)] ?? l.nome))
    // miudezas esquecidas no pano
    const miudo = cel ? [[0.93, 0.6], [0.3, 0.585], [0.64, 0.545]] : [[0.5, 0.7], [0.035, 0.93], [0.97, 0.9]]
    miudo.forEach(([mx, my], i) => { const x = W * mx, y = H * my, r = (5 + i * 1.2) * u; c.fillStyle = 'rgba(8,4,14,0.5)'; c.beginPath(); c.ellipse(x + 1.5 * u, y + 2 * u, r, r * 0.5, 0, 0, TAU); c.fill(); c.fillStyle = ['#8F7D55', '#6B5A80', '#7A4458'][i]; c.beginPath(); c.ellipse(x, y, r, r * 0.5, 0, 0, TAU); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 1.2 * u; c.stroke(); c.fillStyle = TINTA; circ(c, x - r * 0.25, y, 0.9 * u); c.fill(); circ(c, x + r * 0.25, y, 0.9 * u); c.fill() })
    if (cel) { carretel(c, W * 0.945, H * 0.625, H * 0.07, '#8A4B5E', R); carretel(c, W * 0.86, H * 0.628, H * 0.05, MALDICAO, R, true, true) }
    // castiçal (a vela e a chama são desenhadas a cada quadro)
    { const v = G.vela, w = v.larg
      c.fillStyle = 'rgba(8,4,14,0.55)'; c.beginPath(); c.ellipse(v.x + w * 0.2, v.base + w * 0.12, w * 1.5, w * 0.34, 0, 0, TAU); c.fill()
      c.fillStyle = '#2A1D2C'; c.beginPath(); c.ellipse(v.x, v.base, w * 1.25, w * 0.34, 0, 0, TAU); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 1.5 * u; c.stroke()
      c.fillStyle = 'rgba(255,170,90,0.22)'; c.beginPath(); c.ellipse(v.x, v.base - w * 0.05, w * 1.1, w * 0.22, 0, Math.PI, TAU); c.fill()
      c.strokeStyle = '#2A1D2C'; c.lineWidth = 3.4 * u; c.beginPath(); c.arc(v.x + w * 1.5, v.base - w * 0.25, w * 0.42, 0, TAU); c.stroke(); c.strokeStyle = TINTA; c.lineWidth = 1 * u; c.beginPath(); c.arc(v.x + w * 1.5, v.base - w * 0.25, w * 0.42 + 1.9 * u, 0, TAU); c.stroke() }
    // clarão parado da vela (a parte que pisca é pequena e fica por quadro) e vinheta — tudo assado aqui
    { const v = G.vela, fy = v.base - v.alt - v.larg * 0.8, r = cel ? H * 0.3 : H * 0.6
      c.save(); c.globalCompositeOperation = 'lighter'
      g = c.createRadialGradient(v.x, fy, 2, v.x, fy, r); g.addColorStop(0, 'rgba(255,170,60,0.26)'); g.addColorStop(0.35, 'rgba(255,140,40,0.1)'); g.addColorStop(1, 'rgba(255,130,40,0)')
      c.fillStyle = g; c.fillRect(v.x - r, fy - r, r * 2, r * 2); c.restore() }
    c.save(); c.translate(W / 2, H / 2); c.scale(W / 2, H / 2)
    g = c.createRadialGradient(0, -0.05, 0.45, 0, 0, 1.42); g.addColorStop(0, 'rgba(8,4,14,0)'); g.addColorStop(0.6, 'rgba(8,4,14,0.16)'); g.addColorStop(1, 'rgba(8,4,14,0.72)')
    c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore()
    return { cv, G, L }
  }

  function prepararFundo(ctx, W, H, formato) {
    const m = ctx.getTransform(), e = limita(Math.hypot(m.a, m.b), 0.5, 2)
    const chave = `${W}x${H}|${formato}|${e.toFixed(2)}`
    if (chave !== chaveFundo) { fundo = assarFundo(W, H, formato, e); chaveFundo = chave; geo = fundo.G }
    return e
  }

  /** A vela: corpo (encurta um pouco a cada turno, só enfeite), chama e clarão quente. */
  function desenharVela(ctx, t, turno, menos) {
    const v = geo.vela, u = geo.u, w = v.larg
    const alt = v.alt * limita(1 - 0.035 * Math.max(0, (turno ?? 1) - 1), 0.5, 1), topo = v.base - alt
    const pisca = menos ? 0 : Math.sin(t / 830) * 0.5 + Math.sin(t / 310 + 1.3) * 0.3 + Math.sin(t / 127 + 0.4) * 0.2 // devagar, nunca flash
    const corpo = ctx.createLinearGradient(v.x - w / 2, 0, v.x + w / 2, 0); corpo.addColorStop(0, '#F4E9CC'); corpo.addColorStop(0.45, '#E2D2AC'); corpo.addColorStop(1, '#8E7A66')
    ctx.fillStyle = corpo; ctx.beginPath(); ctx.roundRect(v.x - w / 2, topo, w, alt, [w * 0.2, w * 0.2, 2, 2]); ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5 * u; ctx.stroke()
    ctx.fillStyle = '#F4E9CC'; for (const [dx, h2] of [[-0.34, 0.2], [0.1, 0.34], [0.36, 0.13]]) { ctx.beginPath(); ctx.roundRect(v.x + dx * w - w * 0.09, topo + w * 0.1, w * 0.18, alt * h2, w * 0.09); ctx.fill() }
    const gl = ctx.createLinearGradient(0, topo, 0, topo + alt * 0.45); gl.addColorStop(0, 'rgba(255,190,90,0.55)'); gl.addColorStop(1, 'rgba(255,190,90,0)')
    ctx.fillStyle = gl; ctx.fillRect(v.x - w / 2, topo, w, alt * 0.45)
    linha(ctx, [[v.x, topo], [v.x + 0.6 * u, topo - 5 * u]], TINTA, 1.6 * u)
    // chama e um halo pequeno que pisca devagar (o clarão grande está assado no fundo)
    const fh = w * (1.45 + 0.1 * pisca), fx = v.x + pisca * 0.9 * u, fy = topo - 4 * u
    const r = (geo.cel ? geo.H * 0.085 : geo.H * 0.17) * (1 + 0.05 * pisca)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.72 + 0.12 * pisca
    ctx.drawImage(halo('255,170,70'), fx - r, fy - fh * 0.45 - r, r * 2, r * 2)
    ctx.restore()
    const chama = (k, cor) => { ctx.beginPath(); ctx.moveTo(fx - w * 0.3 * k, fy - fh * 0.18); ctx.bezierCurveTo(fx - w * 0.36 * k, fy - fh * 0.62 * k, fx - w * 0.05 + pisca * u, fy - fh * 0.74 * k, fx + pisca * 1.4 * u, fy - fh * k); ctx.bezierCurveTo(fx + w * 0.1, fy - fh * 0.7 * k, fx + w * 0.38 * k, fy - fh * 0.5 * k, fx + w * 0.3 * k, fy - fh * 0.18); ctx.quadraticCurveTo(fx, fy + fh * 0.1 * k, fx - w * 0.3 * k, fy - fh * 0.18); ctx.fillStyle = cor; ctx.fill() }
    chama(1, CHAMA); chama(0.72, OURO); chama(0.4, '#FFF6D8')
  }

  const halos = new Map()
  /** Halo redondo macio (bitmap pequeno, guardado), para pintar com soma de luz. */
  function halo(rgb) {
    let cv = halos.get(rgb)
    if (cv) return cv
    cv = document.createElement('canvas'); cv.width = cv.height = 96
    const c = cv.getContext('2d'), g = c.createRadialGradient(48, 48, 1, 48, 48, 47)
    g.addColorStop(0, `rgba(${rgb},0.6)`); g.addColorStop(0.35, `rgba(${rgb},0.24)`); g.addColorStop(1, `rgba(${rgb},0)`)
    c.fillStyle = g; c.fillRect(0, 0, 96, 96)
    halos.set(rgb, cv)
    return cv
  }
  /** A vez: os três círculos bordados de quem joga acendem (quente no lado A, frio no lado B). */
  function desenharVez(ctx, t, menos) {
    const pulso = menos ? 0.85 : 0.78 + 0.22 * Math.sin(t / 620)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (const [time, peso, rgb] of [['A', 1 - vez, '255,190,110'], ['B', vez, '150,190,255']]) {
      const a = (peso - 0.5) * 2
      if (a < 0.04) continue
      ctx.globalAlpha = a * pulso
      for (const l of fundo.L[time]) ctx.drawImage(halo(rgb), l.x - l.rx * 1.25, l.y - l.ry * 1.5, l.rx * 2.5, l.ry * 3)
    }
    ctx.restore()
  }

  function desenharPoeira(ctx, W, H, t, frente, menos) {
    const tt = menos ? 0 : t
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (const m of motas) {
      if (m.frente !== frente) continue
      const x = (m.u + Math.sin(tt / m.f1 + m.p1) * 0.03 + 1) % 1, y = (((m.v - (tt / 1000) * m.sobe) % 1) + 1) % 1
      const px = x * W, py = y * H * (frente ? 1 : 0.86), quente = (geo.cel ? py > H * 0.5 : px < W * 0.5)
      const a = (0.2 + 0.3 * (0.5 + 0.5 * Math.sin(tt / m.f2 + m.p2))) * (frente ? 0.5 : 1)
      ctx.fillStyle = quente ? `rgba(255,200,130,${a})` : `rgba(190,210,255,${a})`
      circ(ctx, px, py, m.r * geo.u * (frente ? 2.6 : 1)); ctx.fill()
    }
    ctx.restore()
  }

  function desenharTesoura(ctx, W, H, t, est, menos) {
    const cel = geo.cel, ts = est.tesoura ?? {}, m = ctx.getTransform(), e = limita(Math.hypot(m.a, m.b), 0.5, 2)
    const Lb = cel ? H * 0.125 : H * 0.3 // comprimento da lâmina
    const chave = `${Math.round(Lb)}|${e.toFixed(2)}`
    if (chave !== chaveTesoura) { tesoura = { a: metadeDaTesoura(Lb, 1, e), b: metadeDaTesoura(Lb, -1, e), Lb }; chaveTesoura = chave }
    const cx = W / 2, passo = cel ? H * 0.024 : H * 0.05, ponta0 = cel ? H * 0.09 : H * 0.265
    // repouso: pendurada, descendo um degrau por vez, balançando
    const bal = menos ? 0 : Math.sin((t / 3400) * TAU) * (0.035 + 0.022 * degrau) + Math.sin((t / 1300) * TAU + 1) * 0.008 * degrau
    let py = ponta0 + degrau * passo - Lb, px = cx, rot = 0.1 + bal * 1.6, abre = 0.16 + 0.085 * degrau + (menos ? 0 : Math.sin(t / 900) * 0.02 * degrau), esc = 1, snip = 0
    const ancora = { x: cx - (cel ? 2 : 6), y: -H * 0.5 }
    let fioAlfa = 1
    if (ts.cortando) { // o corte: desce, abre bem, fecha de uma vez (sem flash), e volta
      let p = limita(ts.progresso ?? 0, 0, 1)
      if (menos) p = p < 0.62 ? 0.44 : 1
      const desce = vai(trecho(p, 0, 0.3)), volta = vai(trecho(p, 0.62, 1)), k = desce * (1 - volta)
      const fecha = trecho(p, 0.3, 0.4)
      const alvoX = cel ? W * 0.83 : cx, alvoY = cel ? H * 0.565 : H * 0.36, alvoRot = cel ? 1.42 : 0, alvoEsc = cel ? 2.3 : 1.5
      px = mix(px, alvoX, k); py = mix(py, alvoY, k); rot = mix(rot, alvoRot, k); esc = mix(1, alvoEsc, k)
      abre = mix(abre, 1.05 * (1 - fecha * fecha) + 0.02, k)
      snip = p >= 0.38 && p < 0.62 ? 1 - trecho(p, 0.38, 0.62) : 0
      fioAlfa = 1 - k
    }
    // o fio que a segura (amarrado numa argola)
    const co = Math.cos(rot), si = Math.sin(rot), lx = -Lb * 0.2 * esc, ly = -Lb * 0.7 * esc, ax = px + lx * co - ly * si, ay = py + lx * si + ly * co
    if (fioAlfa > 0.02) { ctx.globalAlpha = fioAlfa; linha(ctx, [[ax, ay], [ancora.x + bal * 30, -4]], TINTA, 3 * geo.u); linha(ctx, [[ax, ay], [ancora.x + bal * 30, -4]], LINHO_APAGADO, 1.3 * geo.u); ctx.globalAlpha = 1 }
    // sombra da tesoura no pano durante o corte
    if (ts.cortando && esc > 1.05) { ctx.fillStyle = `rgba(8,4,14,${0.3 * (esc - 1)})`; ctx.beginPath(); ctx.ellipse(px + (cel ? -Lb * esc * 0.5 : 0), cel ? py + Lb * 0.5 : py + Lb * esc * 1.05, (cel ? Lb * esc * 0.6 : Lb * 0.5), Lb * 0.13, 0, 0, TAU); ctx.fill() }
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.scale(esc, esc)
    for (const [mt, ang] of [[tesoura.b, abre / 2], [tesoura.a, -abre / 2]]) { ctx.save(); ctx.rotate(ang); ctx.drawImage(mt.cv, -mt.px, -mt.py, mt.w, mt.h); ctx.restore() }
    // parafuso
    const rp = Lb * 0.042; ctx.fillStyle = '#E3E8EE'; circ(ctx, 0, 0, rp); ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = Math.max(1.4, Lb * 0.016); ctx.stroke(); linha(ctx, [[-rp * 0.6, -rp * 0.3], [rp * 0.6, rp * 0.3]], TINTA, Math.max(1, Lb * 0.012))
    // o "tchic": riscos curtos de linha cortada perto das pontas (nada de clarão)
    if (snip > 0) {
      ctx.globalAlpha = snip; ctx.lineCap = 'round'
      for (let i = 0; i < 7; i++) { const a = Math.PI / 2 + (i - 3) * 0.36, r0 = Lb * (0.16 + (1 - snip) * 0.24), r1 = r0 + Lb * 0.13; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Lb + Math.sin(a) * r0 * 0.6); ctx.lineTo(Math.cos(a) * r1, Lb + Math.sin(a) * r1 * 0.6); ctx.strokeStyle = TINTA; ctx.lineWidth = 3.4 * geo.u / esc; ctx.stroke(); ctx.strokeStyle = LINHO; ctx.lineWidth = 1.5 * geo.u / esc; ctx.stroke() }
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  const cenario = {
    lugares,
    /** Fundo, mesa, pano, vela e poeira. Sem `semFrente`, desenha também a frente (tesoura e vinheta). */
    desenhar(ctx, largura, altura, tempoMs = 0, estado = {}) {
      const formato = estado.formato === 'celular' ? 'celular' : 'pc', menos = !!estado.menosAnimacao
      prepararFundo(ctx, largura, altura, formato)
      // estados que mudam aos poucos (degrau da tesoura e de quem é a vez)
      const dt = tAnt == null ? 0 : limita(tempoMs - tAnt, 0, 100); tAnt = tempoMs
      const alvoD = limita(estado.tesoura?.degrau ?? 0, 0, 3), alvoV = estado.vezDe === 'B' ? 1 : estado.vezDe === 'A' ? 0 : 0.5
      const k = menos || dt === 0 ? 1 : 1 - Math.exp(-dt / 260)
      degrau += (alvoD - degrau) * (menos ? 1 : k); vez += (alvoV - vez) * (menos ? 1 : k)
      if (Math.abs(alvoD - degrau) < 0.002) degrau = alvoD
      ctx.drawImage(fundo.cv, 0, 0, largura, altura)
      desenharVela(ctx, tempoMs, estado.turno, menos)
      desenharVez(ctx, tempoMs, menos)
      desenharPoeira(ctx, largura, altura, tempoMs, false, menos)
      if (!estado.semFrente) cenario.desenharFrente(ctx, largura, altura, tempoMs, estado)
    },
    /** O que passa na FRENTE dos bonecos: a tesoura pendurada e a poeira de perto. */
    desenharFrente(ctx, largura, altura, tempoMs = 0, estado = {}) {
      const formato = estado.formato === 'celular' ? 'celular' : 'pc', menos = !!estado.menosAnimacao
      prepararFundo(ctx, largura, altura, formato)
      desenharTesoura(ctx, largura, altura, tempoMs, estado, menos)
      desenharPoeira(ctx, largura, altura, tempoMs, true, menos)
    },
    /** Onde a vela e a ponta da tesoura estão (para som e efeitos da tela, se quiser). */
    pontos(largura, altura, formato) { const cel = formato === 'celular'; return { centro: { x: largura / 2, y: cel ? altura * 0.565 : altura * 0.62 } } },
  }
  return cenario
}
