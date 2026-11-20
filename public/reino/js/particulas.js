// Keepmile — DESENHO DE EFEITO POR CÓDIGO, em pixel na grade do jogo (sem arte nova): fumaça da queda, anel do estouro, rastro do
// golpe, marca de lado no chão, tocha e flâmula. Cada folha é feita UMA vez e sai no mesmo formato das peças do atlas
// ({ img, quadros, anim, w, h, ax, ay }), para a cena desenhar como qualquer outra.
const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const peca = (img, w, h, n, ms, ax, ay, loop = false) => ({ img, quadros: Array.from({ length: n }, (_, i) => [i * w, 0, w, h]), variantes: null, anim: { play: { quadros: Array.from({ length: n }, (_, i) => i), ms: Array(n).fill(ms), loop } }, w, h, ax, ay })
/** Pseudo-sorteio fixo (o mesmo desenho sempre). */
const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

function bola(g, cx, cy, r, cor, furos = 0, fase = 0) {
  g.fillStyle = cor
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y > r * r + r * 0.6) continue
    if (furos === 1 && ((cx + x + cy + y + fase) & 1)) continue // pontilhado: dissolve sem degradê
    if (furos === 2 && (((cx + x) & 1) || ((cy + y + fase) & 1))) continue
    g.fillRect(cx + x, cy + y, 1, 1)
  }
}

/** Nuvem de fumaça da queda: 8 quadros de 32×44, pé em (16, 40). Estoura baixa e larga, sobe, afina e some em pontilhado. */
export function fumaca(claro, sombra, faisca = null, semente = 1) {
  const W = 32, H = 44, N = 8, c = tela(W * N, H), g = c.getContext('2d')
  const B = [[-7, 0, 5], [6, -1, 5], [0, -5, 6], [-3, 2, 4], [4, 3, 4], [9, -6, 3], [-9, -5, 3]]
  for (let f = 0; f < N; f++) {
    const ox = f * W + 16, sobe = [0, 3, 7, 11, 15, 19, 22, 25][f], abre = [0.55, 1, 1.12, 1.2, 1.26, 1.3, 1.34, 1.38][f], enc = [1, 1.15, 1, 0.86, 0.72, 0.58, 0.44, 0.3][f], furos = f >= 6 ? 2 : f >= 4 ? 1 : 0
    g.save(); g.beginPath(); g.rect(f * W, 0, W, H); g.clip()
    for (let pass = 0; pass < 2; pass++) for (let b = 0; b < B.length; b++) {
      if (f >= 5 && b >= 5) continue
      const [bx, by, br] = B[b], r = Math.max(1, Math.round(br * enc)), x = ox + Math.round(bx * abre + (rnd(b + semente) - 0.5) * f), y = 34 + by - Math.round(sobe * (0.8 + rnd(b * 3 + semente) * 0.5))
      if (pass === 0) bola(g, x + 1, y + 1, r, sombra, furos, f); else bola(g, x - (r > 2 ? 1 : 0), y - (r > 2 ? 1 : 0), Math.max(1, r - 1), claro, furos, f)
    }
    if (faisca && f < 5) { g.fillStyle = faisca; for (let k = 0; k < 5; k++) { const a = rnd(k + 9 + semente) * 6.28, d = 4 + f * 3.2; g.fillRect(ox + Math.round(Math.cos(a) * d), 30 - f * 2 + Math.round(Math.sin(a) * d * 0.7), f < 2 ? 2 : 1, f < 2 ? 2 : 1) } }
    g.restore()
  }
  return peca(c, W, H, N, 70, 16, 40)
}

/** Anel de choque no chão (elipse achatada que abre e afina): 5 quadros de 72×32, centro em (36, 16). */
export function anel(cor, cor2) {
  const W = 72, H = 32, N = 5, c = tela(W * N, H), g = c.getContext('2d')
  for (let f = 0; f < N; f++) {
    const rx = [8, 16, 24, 30, 34][f], ry = Math.round(rx * 0.42), gr = [3, 3, 2, 1, 1][f], cx = f * W + 36, cy = 16
    for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 1; x <= rx + 1; x++) {
      const d = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2), larg = gr / rx
      if (d > 1 || d < 1 - larg * 2) continue
      if (f === N - 1 && ((x + y) & 1)) continue
      g.fillStyle = d > 1 - larg ? cor : cor2; g.fillRect(cx + x, cy + y, 1, 1)
    }
  }
  return peca(c, W, H, N, 55, 36, 16)
}

/** Rastro do golpe (meia-lua que varre de cima para baixo, virada para a direita): 3 quadros de 22×26, punho em (2, 13). */
export function varrida(cor = '#FFF6E0', cor2 = '#FFD248') {
  const W = 22, H = 26, N = 3, c = tela(W * N, H), g = c.getContext('2d')
  for (let f = 0; f < N; f++) {
    const a0 = [-1.35, -0.75, 0.05][f], a1 = [0.2, 0.95, 1.3][f], R = 16, gro = [3, 3, 2][f]
    for (let y = -R; y <= R; y++) for (let x = -2; x <= R; x++) {
      const d = Math.sqrt(x * x + y * y), a = Math.atan2(y, x)
      if (a < a0 || a > a1 || d > R || d < R - Math.max(1, gro * 1.7 * (a - a0) / (a1 - a0))) continue
      if (f === 2 && ((x + y) & 1)) continue
      g.fillStyle = d > R - 1.5 ? cor : cor2; g.fillRect(f * W + 3 + x, 13 + y, 1, 1)
    }
  }
  return peca(c, W, H, N, 45, 2, 13)
}

/** Marca de lado no chão (elipse cheia, pontilhada na borda): de relance diz quem é de quem, sem sujar o boneco. */
export function marca(cor, w = 18, h = 7) {
  const c = tela(w, h), g = c.getContext('2d'), rx = w / 2, ry = h / 2
  g.fillStyle = cor
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = ((x + 0.5 - rx) / rx) ** 2 + ((y + 0.5 - ry) / ry) ** 2
    if (d > 1 || (d > 0.62 && ((x + y) & 1))) continue
    g.fillRect(x, y, 1, 1)
  }
  return c
}

/** Chama da tocha (4 quadros de 7×10, pé em (3, 9)) e o clarão pontilhado em volta dela. */
export function chama() {
  const W = 7, H = 10, N = 4, c = tela(W * N, H), g = c.getContext('2d')
  const F = [['..o..', '.oyo.', '.oyo.', 'oywyo', 'oywyo', '.oyo.'], ['.o...', '.oo..', '.oyo.', 'oywyo', 'oywyo', '.oyo.'], ['...o.', '..oo.', '.oyo.', 'oywyo', 'oyyyo', '.oyo.'], ['..o..', '..o..', '.oyo.', 'oyyyo', 'oywyo', '.oyo.']]
  const K = { o: '#E87E2E', y: '#FFD248', w: '#FFF6E0' }
  F.forEach((q, f) => q.forEach((l, y) => [...l].forEach((ch, x) => { if (K[ch]) { g.fillStyle = K[ch]; g.fillRect(f * W + 1 + x, 2 + y, 1, 1) } })))
  return peca(c, W, H, N, 110, 3, 9, true)
}
export function clarao(cor, r = 22) {
  const c = tela(r * 2, r * 2), g = c.getContext('2d')
  g.fillStyle = cor
  for (let y = 0; y < r * 2; y++) for (let x = 0; x < r * 2; x++) {
    const d = Math.hypot(x - r + 0.5, (y - r + 0.5) * 1.5) / r
    if (d > 1) continue
    const n = d < 0.45 ? 1 : d < 0.72 ? ((x + y) & 1) : ((x & 1) && (y & 1)) // 3 degraus pontilhados
    if (n) g.fillRect(x, y, 1, 1)
  }
  return c
}

/** Flâmula comprida num mastro (4 quadros de 14×26, pé em (2, 25)), ondulando; a cor é a do reino. */
export function flamula(cor, claro, escuro) {
  const W = 14, H = 26, N = 4, c = tela(W * N, H), g = c.getContext('2d')
  for (let f = 0; f < N; f++) {
    const ox = f * W
    g.fillStyle = '#2B1E3A'; g.fillRect(ox + 1, 1, 3, 25); g.fillStyle = '#96623C'; g.fillRect(ox + 2, 2, 1, 23); g.fillStyle = '#FFD248'; g.fillRect(ox + 1, 0, 3, 2)
    for (let x = 0; x < 9; x++) {
      const dy = Math.round(Math.sin((x + f * 2.2) * 0.9) * 1.2), alt = 7 - Math.floor(x * 0.6)
      g.fillStyle = '#2B1E3A'; g.fillRect(ox + 4 + x, 2 + dy, 1, alt + 2)
      g.fillStyle = cor; g.fillRect(ox + 4 + x, 3 + dy, 1, alt); g.fillStyle = claro; g.fillRect(ox + 4 + x, 3 + dy, 1, 1); if (alt > 2) { g.fillStyle = escuro; g.fillRect(ox + 4 + x, 2 + dy + alt, 1, 1) }
    }
  }
  return peca(c, W, H, N, 140, 2, 25, true)
}

/** Faixas de luz (raios de sol em diagonal ou luz rasante), pontilhadas: uma tela do tamanho da cena, feita uma vez. */
export function raios(w, h, cor, { inclina = 0.55, faixas = 3, largura = 0.09, x0 = 0.08, passo = 0.3 } = {}) {
  const c = tela(w, h), g = c.getContext('2d')
  g.fillStyle = cor
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x - y * inclina) / w
    for (let k = 0; k < faixas; k++) {
      const d = Math.abs(u - (x0 + k * passo)) / (largura * (1 + k * 0.25))
      if (d > 1) continue
      if (d < 0.5 ? ((x + y) & 1) === 0 : ((x & 1) === 0 && (y & 1) === 0)) g.fillRect(x, y, 1, 1)
      break
    }
  }
  return c
}

/** Névoa baixa: faixa pontilhada que repete na horizontal. */
export function nevoa(w, h, cor) {
  const c = tela(w, h), g = c.getContext('2d')
  g.fillStyle = cor
  for (let x = 0; x < w; x++) {
    const topo = Math.round(h * 0.45 + Math.sin(x / w * 6.283 * 2) * h * 0.22 + Math.sin(x / w * 6.283 * 5) * h * 0.1)
    for (let y = topo; y < h; y++) { const f = (y - topo) / (h - topo); if (f > 0.5 ? ((x + y) & 1) : ((x & 1) && (y & 1))) g.fillRect(x, y, 1, 1) }
  }
  return c
}

/** Cópia de uma região da folha com as cores ACALMADAS (menos saturação, puxada para a névoa) e tingidas pela luz do trecho. */
export function graduar(g, x, y, w, h, { sat = 1, nev = null, qNev = 0, mult = null, val = 1 }) {
  const d = g.getImageData(x, y, w, h), a = d.data
  const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)), N = nev ? hex(nev) : [0, 0, 0], M = mult ? hex(mult).map((v) => v / 255) : [1, 1, 1]
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] < 8) continue
    const l = a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11
    for (let k = 0; k < 3; k++) { let v = l + (a[i + k] - l) * sat; v = v + (N[k] - v) * qNev; a[i + k] = Math.max(0, Math.min(255, Math.round(v * M[k] * val))) }
  }
  g.putImageData(d, x, y)
}
export { tela, rnd }
