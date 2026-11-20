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

/** FUMACINHA DE BAIXA (R28): 5 quadros de 16×20, pé em (8, 18), 60 ms cada = 300 ms. Pequena (cabe dentro do boneco), sobe 8 px e
 *  some em pontilhado: marca que um representante saiu sem cobrir o golpe do vizinho. */
export function fumacinha(claro, sombra, faisca = null) {
  const W = 16, H = 20, N = 5, c = tela(W * N, H), g = c.getContext('2d')
  const B = [[-3, 0, 3], [3, -1, 3], [0, -3, 3]]
  for (let f = 0; f < N; f++) {
    const ox = f * W + 8, sobe = [0, 2, 4, 6, 8][f], abre = [0.6, 1, 1.1, 1.2, 1.3][f], enc = [1, 1, 0.8, 0.6, 0.4][f], furos = f >= 4 ? 2 : f >= 3 ? 1 : 0
    g.save(); g.beginPath(); g.rect(f * W, 0, W, H); g.clip()
    for (let pass = 0; pass < 2; pass++) for (let b = 0; b < B.length; b++) {
      const [bx, by, br] = B[b], r = Math.max(1, Math.round(br * enc)), x = ox + Math.round(bx * abre), y = 15 + by - sobe
      if (pass === 0) bola(g, x + 1, y + 1, r, sombra, furos, f); else bola(g, x, y, Math.max(1, r - 1), claro, furos, f)
    }
    if (faisca && f < 3) { g.fillStyle = faisca; for (let k = 0; k < 3; k++) g.fillRect(ox + (k - 1) * (3 + f), 9 - f * 2 - (k & 1) * 2, 1, 1) }
    g.restore()
  }
  return peca(c, W, H, N, 60, 8, 18)
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

/** ARMA QUE VARRE: arco de aço (fio claro, lâmina cinza) com sombra ameixa atrás, de cima para baixo, virado para a direita.
 *  3 quadros de 26×36, punho em (3, 18): sobe armado → corta na frente → some embaixo em pontilhado. */
export function varrida(fio = '#FFFFFF', lamina = '#CECAD8', sombra = '#2B1E3A') {
  const W = 26, H = 36, N = 3, c = tela(W * N, H), g = c.getContext('2d')
  for (let f = 0; f < N; f++) {
    const a0 = [-1.25, -0.7, 0.15][f], a1 = [0.0, 0.85, 1.2][f], R = 12
    for (let pass = 0; pass < 2; pass++) for (let y = -R - 1; y <= R + 1; y++) for (let x = -3; x <= R + 1; x++) {
      const d = Math.sqrt(x * x + y * y), a = Math.atan2(y, x)
      if (a < a0 || a > a1) continue
      const gro = Math.max(1, 3.4 * (a - a0) / (a1 - a0)) // grossa na ponta que corta, fina no rabo
      if (pass === 0) { if (d > R + 1 || d < R - gro - 1) continue; if (f === 2 && ((x + y) & 1)) continue; g.fillStyle = sombra; g.fillRect(f * W + 4 + x, 18 + y, 1, 1); continue }
      if (d > R || d < R - gro) continue
      if (f === 2 && ((x + y) & 1)) continue
      g.fillStyle = d > R - 1.4 ? fio : lamina; g.fillRect(f * W + 4 + x, 18 + y, 1, 1)
    }
  }
  return peca(c, W, H, N, 44, 3, 18)
}

/** MOLDURA da cena de batalha, do próprio castelo: muro de pedra em volta, cantos de madeira com tacha de ouro e duas flâmulas do
 *  reino penduradas nos lados. Fina no celular (não rouba espaço). Uma tela do tamanho da cena, feita uma vez. */
export function moldura(w, h, fina) {
  const c = tela(w, h), g = c.getContext('2d'), T = fina ? 3 : 5, Q = T + (fina ? 2 : 4)
  const pedra = (x, y, lw, lh, deitada) => {
    g.fillStyle = '#9E98B4'; g.fillRect(x, y, lw, lh)
    const passo = fina ? 9 : 12
    if (deitada) { g.fillStyle = '#CECAD8'; g.fillRect(x, y, lw, 1); g.fillStyle = '#6E668E'; g.fillRect(x, y + lh - 1, lw, 1); for (let i = 0; i < lw; i += passo) g.fillRect(x + i + ((y > 0) ? passo >> 1 : 0), y + 1, 1, lh - 1) } else { g.fillStyle = '#CECAD8'; g.fillRect(x, y, 1, lh); g.fillStyle = '#6E668E'; g.fillRect(x + lw - 1, y, 1, lh); for (let i = 0; i < lh; i += passo) g.fillRect(x + 1, y + i + ((x > 0) ? passo >> 1 : 0), lw - 1, 1) }
  }
  pedra(0, 0, w, T, true); pedra(0, h - T, w, T, true); pedra(0, 0, T, h, false); pedra(w - T, 0, T, h, false)
  g.fillStyle = '#2B1E3A'; g.fillRect(T, T, w - 2 * T, 1); g.fillRect(T, h - T - 1, w - 2 * T, 1); g.fillRect(T, T, 1, h - 2 * T); g.fillRect(w - T - 1, T, 1, h - 2 * T)
  for (const [x, y] of [[0, 0], [w - Q, 0], [0, h - Q], [w - Q, h - Q]]) { // cantos de madeira
    g.fillStyle = '#2B1E3A'; g.fillRect(x, y, Q, Q); g.fillStyle = '#96623C'; g.fillRect(x + 1, y + 1, Q - 2, Q - 2); g.fillStyle = '#C48C54'; g.fillRect(x + 1, y + 1, Q - 2, 1); g.fillStyle = '#684030'; g.fillRect(x + 1, y + Q - 2, Q - 2, 1)
    g.fillStyle = '#FFD248'; g.fillRect(x + (Q >> 1) - 1, y + (Q >> 1) - 1, 2, 2)
  }
  const fw = fina ? 5 : 8, fh = fina ? 9 : 14, fy = Math.round(h * (fina ? 0.2 : 0.3))
  for (const lado of [0, 1]) { // flâmulas do reino nos lados
    const x = lado ? w - T - 1 - fw : T + 1
    g.fillStyle = '#2B1E3A'; g.fillRect(x - 1, fy - 2, fw + 2, 3); g.fillStyle = '#C48C54'; g.fillRect(x - 1, fy - 1, fw + 2, 1)
    for (let yy = 0; yy < fh; yy++) { const corte = yy > fh - 1 - (fw >> 1) ? yy - (fh - 1 - (fw >> 1)) : 0; g.fillStyle = '#2B1E3A'; g.fillRect(x - 1 + corte, fy + 1 + yy, fw + 2 - corte * 2, 1); if (fw - corte * 2 > 0) { g.fillStyle = yy < 2 ? '#8CB4FF' : '#4884E8'; g.fillRect(x + corte, fy + 1 + yy, fw - corte * 2, 1) } }
    g.fillStyle = '#FFD248'; g.fillRect(x + (fw >> 1), fy + 4, 1, fina ? 2 : 3)
  }
  return c
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

// ---------------------------------------------------------------- R29 — RISCOS DOS GESTOS em pixel (2 tons + contorno ameixa, com ponta)
/** Pinta numa tela e devolve a mesma figura com contorno escuro de 1 px em volta. */
function comContorno(w, h, pinta, cor = '#2B1E3A') {
  const a = tela(w, h); pinta(a.getContext('2d'))
  const d = tela(w, h), gd = d.getContext('2d'); gd.drawImage(a, 0, 0); gd.globalCompositeOperation = 'source-in'; gd.fillStyle = cor; gd.fillRect(0, 0, w, h)
  const o = tela(w, h), go = o.getContext('2d'); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) go.drawImage(d, dx, dy); go.drawImage(a, 0, 0)
  return o
}
function folha(W, H, N, ms, ay, pinta) {
  const c = tela(W * N, H), g = c.getContext('2d')
  for (let f = 0; f < N; f++) g.drawImage(comContorno(W, H, (q) => pinta(q, f)), f * W, 0)
  return peca(c, W, H, N, ms, 0, ay)
}
const px = (g, x, y, cor, pont = false) => { if (pont && ((x + y) & 1)) return; g.fillStyle = cor; g.fillRect(Math.round(x), Math.round(y), 1, 1) }
/** Reta em pixel que AFINA até a ponta: grossa (2 px, tom de baixo) na base, 1 px claro na ponta. */
function farpa(g, x0, y0, x1, y1, claro, tom, pont = false) {
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))))
  for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; px(g, x, y, claro, pont); if (k < n * 0.6) px(g, x, y + 1, tom, pont) }
}
/** MORDIDA: duas arcadas com dentes que se fecham (aberta → quase → fechada com estalo). 3 quadros de 16×18, boca em (0, 9). */
export function mordida(claro = '#FFFFFF', tom = '#CECAD8', estalo = '#FFD248') {
  return folha(16, 18, 3, 35, 9, (g, f) => {
    const ab = [4, 2, 0][f]
    for (let x = 0; x <= 10; x++) {
      const X = 2 + x, arco = ab ? Math.round(Math.sin(x / 10 * Math.PI) * 2) : 0, gro = x < 8 ? 2 : 1
      for (const s of [-1, 1]) {
        const borda = 9 + s * (ab + 1 + arco) // a beira de dentro da arcada
        for (let q = 0; q < gro; q++) px(g, X, borda + s * q, q === gro - 1 && gro > 1 ? tom : claro)
        if (x % 3 === (s < 0 ? 1 : 2) && x < 9) { px(g, X, borda - s, claro); if (ab > 1) px(g, X, borda - s * 2, claro) } // dente (ponta para dentro)
      }
    }
    if (f === 2) { px(g, 14, 7, estalo); px(g, 15, 9, estalo); px(g, 14, 11, estalo) }
  })
}
/** LASCA DA PORTADA: a quina da porta bate e solta três lascas de madeira com ponta. 3 quadros de 16×20, quina em (0, 10). */
export function lasca(claro = '#FFF6E0', madeira = '#C48C54', escuro = '#96623C') {
  return folha(16, 20, 3, 35, 10, (g, f) => {
    const alt = [16, 12, 6][f], d = [2, 4, 7][f], L = [3, 5, 6][f]
    for (let y = 10 - alt / 2; y < 10 + alt / 2; y++) { px(g, 1, y, claro, f === 2); px(g, 2, y, madeira, f === 2) }
    for (const [dy, i] of [[-0.75, 0], [0, 1], [0.75, 2]]) farpa(g, 3 + d, 10 + dy * d + (i - 1) * 2, 3 + d + L, 10 + dy * (d + L) + (i - 1) * 2, claro, i === 1 ? madeira : escuro, f === 2 && i !== 1)
  })
}
/** RISCO RETO com ponta (estocada e investida): lâmina de 2 tons que estica e some. 3 quadros de 20×7, punho em (0, 3). */
export function risco(claro = '#FFFFFF', tom = '#CECAD8') {
  return folha(20, 7, 3, 35, 3, (g, f) => {
    const L = [12, 16, 13][f], x0 = [1, 2, 6][f]
    for (let x = 0; x < L; x++) { px(g, x0 + x, 3, f === 2 ? tom : claro, f === 2 && x < 4); if (x < L - 4) px(g, x0 + x, 4, tom, f === 2) }
    px(g, x0 + L, 3, claro); if (f < 2) { px(g, x0 + L - 2, 2, claro); px(g, x0 + L - 3, 2, tom) } // ponta de lança
  })
}
/** RASTRO DA INVESTIDA: três riscos de velocidade com ponta para trás e bolinhas de poeira no chão. 3 quadros de 22×18, corpo em (0, 9), aponta para a ESQUERDA do quadro espelhado (desenhe virado). */
export function rastro(claro = '#FFFFFF', tom = '#CECAD8', po = '#E8C48A', po2 = '#CDA068') {
  return folha(22, 18, 3, 35, 9, (g, f) => {
    const L = [[10, 14, 8], [13, 18, 10], [8, 12, 6]][f], d = [1, 3, 7][f]
    ;[3, 8, 12].forEach((y, i) => { for (let x = 0; x < L[i]; x++) { px(g, d + x, y, x > L[i] - 4 ? tom : claro, f === 2); if (x < L[i] * 0.4) px(g, d + x, y + 1, tom, f === 2) } })
    for (let k = 0; k < 3; k++) { const x = 2 + k * 5 + f * 2, y = 16 - (f === 2 ? 1 + (k & 1) : 0), r = f === 0 ? 1 : 2; for (let a = 0; a < r; a++) for (let b = 0; b < r; b++) px(g, x + a, y - b, b ? po : po2, f === 2) }
  })
}
/** ONDA DA BARRIGADA: dois arcos de baque que abrem para a frente. 3 quadros de 14×18, barriga em (0, 9). */
export function onda(claro = '#FFF6E0', tom = '#C9C4DA') {
  return folha(14, 18, 3, 35, 9, (g, f) => {
    for (let o = 0; o <= Math.min(1, f); o++) { const r = [4, 7, 9][f] - o * 4, cx = [1, 2, 3][f]; if (r < 2) continue; for (let a = -1.05; a <= 1.05; a += 0.12) { const x = cx + Math.cos(a) * r, y = 9 + Math.sin(a) * r * 0.85; px(g, x, y, o ? tom : claro, f === 2); if (!o && Math.abs(a) < 0.5) px(g, x - 1, y, tom, f === 2) } }
  })
}
/** PRIMEIRA FILEIRA do cenário (R32), para a base da tela quando a cena desce no celular: cerca viva em 2 tons com topo recortado,
 *  flores, pedras e tufos de capim, por código (o mesmo desenho sempre). Uma tela de w × h. */
export function frenteBaixa(w, h) {
  const c = tela(w, h), g = c.getContext('2d'), R = (a, b, cw, ch, cor) => { g.fillStyle = cor; g.fillRect(a, b, cw, ch) }
  for (let x = 0; x < w; x++) { // cerca viva: topo ondulado com folhas soltas
    const topo = 5 + Math.round(Math.sin(x / 9) * 1.5 + Math.sin(x / 3.1) * 1)
    R(x, topo, 1, 1, '#2B1E3A'); R(x, topo + 1, 1, 2, '#6FBF4E'); R(x, topo + 3, 1, h - topo - 3, '#3F8A44')
    for (let y = topo + 4; y < h; y++) if (((x * 7 + y * 13) % 11) === 0) R(x, y, 1, 1, '#2F6E3C'); else if (((x * 5 + y * 3) % 17) === 0) R(x, y, 1, 1, '#6FBF4E')
    if (rnd(x + 40) > 0.86) R(x, topo - 1, 1, 1, '#6FBF4E')
  }
  for (let k = 0; k < 9; k++) { // flores (miolo de ouro, pétalas creme ou rosa) e pedras com luz em cima
    const x = 6 + Math.round(rnd(k + 3) * (w - 14)), y = 11 + Math.round(rnd(k + 9) * (h - 16))
    if (k % 3 === 2) { R(x - 1, y, 5, 3, '#2B1E3A'); R(x, y, 3, 2, '#9E98B4'); R(x, y, 2, 1, '#CECAD8') }
    else { const p = k & 1 ? '#FFF6E0' : '#F58CC4'; R(x, y + 1, 1, 3, '#2F6E3C'); R(x - 1, y, 3, 1, p); R(x, y - 1, 1, 3, p); R(x, y, 1, 1, '#FFD248') }
  }
  return c
}
/** FOGO DE ARTIFÍCIO da festa (R44): um estouro GRANDE em pixel, 14 quadros de 60 ms (840 ms). Sobe um risco, estala um miolo claro,
 *  ABRE em 12 pétalas grossas (risco de 2 px, cabeça de 3×3 com luz) com 6 por dentro (2ª cor), segura aberto, e depois as faíscas
 *  PESAM e CAEM com rastro, sumindo aos poucos (metade, depois um terço). Tudo com sombra ameixa (lê-se no céu claro e no escurecido).
 *  `cores` = [miolo, fora, dentro]; `R` = raio do anel aberto; centro em (ax, ay). `faiscas` = partículas do estouro no pico (18). */
export const FOGO_FAISCAS = 18
export function fogo(cores, R = 28) {
  const [miolo, fora, dentro] = cores, N = 14, Q = Math.round(R * 0.6), W = R * 2 + 14, H = R * 2 + 14 + Q, c = tela(W * N, H), g = c.getContext('2d'), SOMBRA = '#2B1E3A'
  for (let f = 0; f < N; f++) {
    const cx = f * W + (W >> 1), cy = R + 7
    g.save(); g.beginPath(); g.rect(f * W, 0, W, H); g.clip()
    for (const som of [1, 0]) { // 1ª passada: a sombra (1 px para baixo e para a direita); 2ª: a cor
      const P = (x, y, s, cor) => { g.fillStyle = som ? SOMBRA : cor; g.fillRect(Math.round(x - s / 2) + som, Math.round(y - s / 2) + som, s, s) }
      const risco = (x0, y0, x1, y1, s, cor) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let k = 0; k <= n; k++) P(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, s, cor) }
      if (f === 0) { risco(cx, cy + 16, cx, cy + 6, 1, fora); P(cx, cy + 4, 2, miolo); continue } // o risco que sobe
      const t = Math.min(1, (f - 1) / 6), r = R * (1 - (1 - t) ** 2.2), cai = f > 7 ? (f - 7) * (f - 7) * (Q / 36) : 0
      if (f <= 3) { const rm = [0, 5, 4, 2][f]; if (som) bola(g, cx + 1, cy + 1, rm, SOMBRA); else { bola(g, cx, cy, rm, f === 1 ? miolo : fora, f === 3 ? 1 : 0, f); if (f < 3) bola(g, cx, cy, rm - 2, '#FFFFFF') } if (f === 1) { risco(cx - 8, cy, cx + 8, cy, 1, miolo); risco(cx, cy - 8, cx, cy + 8, 1, miolo) } } // o estalo do miolo
      for (let i = 0; i < 6; i++) { // pétalas de dentro: mais curtas, somem antes
        if (f < 2 || f > 10 || (f >= 9 && (i & 1))) continue
        const a = (i / 6) * 6.2832 + 0.3, dx = Math.cos(a), dy = Math.sin(a), ri = r * 0.5, x = cx + dx * ri, y = cy + dy * ri + cai * 0.7
        if (f < 7) risco(cx + dx * ri * 0.55, cy + dy * ri * 0.55, x, y, 1, dentro)
        P(x, y, 2, dentro)
      }
      for (let i = 0; i < 12; i++) { // pétalas de fora: abrem, seguram, pesam e caem deixando rastro
        if (f < 2 || (f === 12 && i % 2) || (f === 13 && i % 3)) continue
        const a = (i / 12) * 6.2832 + 0.13, dx = Math.cos(a), dy = Math.sin(a), x = cx + dx * r, y = cy + dy * r + cai
        if (f < 9) { const de = r * (f < 4 ? 0.35 : f < 6 ? 0.55 : f < 8 ? 0.72 : 0.86); risco(cx + dx * de, cy + dy * de + cai, x, y, f < 8 ? 2 : 1, f < 6 ? fora : dentro) } // a pétala (encurta quando o anel já abriu)
        else risco(x - dx * 1.5, y - (f < 12 ? 7 : 4), x, y, 1, f < 11 ? fora : dentro) // caindo: o rastro fica para cima
        P(x, y, f < 11 ? 3 : 2, fora)
        if (!som && f < 12) { g.fillStyle = miolo; g.fillRect(Math.round(x - 1.5), Math.round(y - 1.5), f < 8 ? 2 : 1, f < 8 ? 2 : 1) } // a luz na cabeça
      }
      if (!som && f >= 4 && f <= 11) for (let k = 0; k < 3; k++) { // brilhos que piscam dentro do anel
        const a = rnd(f * 7 + k + R) * 6.2832, d = R * (0.2 + rnd(f * 3 + k) * 0.6), x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d + cai * 0.5)
        g.fillStyle = miolo; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3)
      }
    }
    g.restore()
  }
  return { ...peca(c, W, H, N, 60, W >> 1, R + 7), raio: R, faiscas: FOGO_FAISCAS }
}
export { tela, rnd }
