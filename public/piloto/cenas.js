// Piloto — cenários desenhados por código em pixel art: arena de lado (com o sol do Sundown), mapa de cima (a estrada)
// e o ninho da cena do ovo. Cada cena aceita o PNG do manifesto (arte/manifesto.json: arena, map, nest) por cima do desenho.
import { CREME, Grade, PALETA, PLUM, misturar, rampa, pngDe, criarCanvas } from './arte.js'
import { ELEMENTOS } from './tema.js'

const E = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1
const R = (x0, y0, w, h) => (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h
const U = (...m) => (x, y) => m.some((f) => f(x, y))
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}
const T = (pts, r) => (x, y) => { for (let i = 0; i < pts.length - 1; i++) if (distSeg(x + 0.5, y + 0.5, ...pts[i], ...pts[i + 1]) <= r) return true; return false }
const ruido = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s) }

// ------------------------------------------------------------------ ARENA
export const CHAO = 64 // faixa de chão embaixo (padrão)
const ARENA_PNG = { chao: 46, grama: 30 } // no arena.png do manifesto: altura do gramado e a faixa lisa do pé (em px da arte)
/** Onde fica cada lugar (0 Front, 1 Middle, 2 Back) de cada lado: { x, y } dos pés, em pixels da arena.
 *  `cunha` (telas estreitas): Front no meio, Middle atrás em cima, Back atrás embaixo — os 3 cabem grandes em 180 px. */
export function lugaresDaArena(LW, LH, { chao = CHAO, cunha = false } = {}) {
  const meio = LW / 2, topo = LH - chao
  const out = { A: [], B: [] }
  if (cunha) {
    const pts = [[30, LH - 58], [meio - 30, LH - 100], [meio - 30, LH - 16]]
    for (const [dx, y] of pts) { out.A.push({ x: Math.round(meio - dx), y }); out.B.push({ x: Math.round(meio + dx), y }) }
    return out
  }
  const passo = Math.min(56, Math.floor((meio - 34) / 2.6))
  for (let i = 0; i < 3; i++) {
    const dx = 30 + passo * i, y = topo + Math.round(chao * 0.72) - i * 9
    out.A.push({ x: Math.round(meio - dx), y }); out.B.push({ x: Math.round(meio + dx), y })
  }
  return out
}

/** Frente da arena (sem céu): colinas, castelo, bandeirinhas, cerca, chão com marcas de posição. Transparente em cima. */
export function frenteDaArena(LW, LH, { chao: CH = CHAO, cunha = false } = {}) {
  const g = new Grade(LW, LH)
  const chao = LH - CH
  // colinas ao longe e o castelinho
  const colina = (x, y) => y > chao - 22 - 10 * Math.sin(x / 37) - 6 * Math.sin(x / 13 + 1) && y < chao
  g.chapa(colina, '#7FBF7A')
  const colina2 = (x, y) => y > chao - 10 - 6 * Math.sin(x / 23 + 2) && y < chao
  g.chapa(colina2, '#5FA35E')
  const cx = Math.round(LW * 0.72), cy = chao - 40
  g.chapa(E(cx + 6, cy + 18, 40, 14), '#6FB06A')
  g.forma(U(R(cx - 8, cy, 28, 14), R(cx - 2, cy - 8, 8, 10), R(cx + 12, cy - 6, 6, 8)), rampa('#D6CFC4', '#F2EDE6', '#A79E92'), { semLuz: true })
  for (let x = cx - 8; x < cx + 20; x += 4) g.p(x, cy - 1, '#A79E92')
  g.chapa((x, y) => y >= cy - 14 && y < cy - 8 && Math.abs(x - (cx + 2)) <= (y - (cy - 14)), '#2E8BEA')
  g.chapa((x, y) => y >= cy - 11 && y < cy - 6 && Math.abs(x - (cx + 15)) <= (y - (cy - 11)), '#F05A3C')
  g.chapa(R(cx + 3, cy + 8, 3, 6), '#6B4A3A')
  // nuvens
  for (const [x, y, w] of [[0.12, 22, 18], [0.42, 14, 24], [0.86, 30, 16]]) {
    g.forma(U(E(LW * x, y, w, 5), E(LW * x - w / 2, y + 2, w / 2, 4), E(LW * x + w / 2, y + 1, w / 2, 5)), rampa('#FFFFFF', '#FFFFFF', '#DDEBF2'), { linha: false, semLuz: true })
  }
  // bandeirinhas num cordão que cai em curva
  const cores = ['#F05A3C', '#E8C547', '#4CB944', '#2E8BEA', '#A98BE8']
  const y0 = 34
  for (let x = 0; x < LW; x++) { const y = Math.round(y0 + 10 * Math.sin((Math.PI * x) / LW)); g.p(x, y, PLUM) }
  for (let x = 6, i = 0; x < LW - 4; x += 14, i++) {
    const y = Math.round(y0 + 10 * Math.sin((Math.PI * x) / LW)) + 1
    g.chapa((px, py) => py >= y && py < y + 7 && px >= x - 3 + (py - y) / 2 && px <= x + 3 - (py - y) / 2, cores[i % cores.length])
  }
  // cerca de madeira
  const cerca = chao - 8
  const madeira = rampa(PALETA.madeira, '#8E6A52', '#4E3428')
  g.forma(U(R(0, cerca, LW, 2), R(0, cerca + 5, LW, 2)), madeira, { semLuz: true, linha: false })
  for (let x = 4; x < LW; x += 18) g.forma(R(x, cerca - 4, 3, 13), madeira, { semLuz: true, linha: false })
  // chão: grama com listras, tufos e 3 marcas claras de posição de cada lado
  g.chapa(R(0, chao, LW, CH), '#5FB85A')
  for (let y = chao; y < LH; y++) for (let x = 0; x < LW; x++) {
    if (((x + Math.floor(y / 2) * 3) % 24) < 12 && y > chao + 2) g.p(x, y, '#58AE53')
    if (ruido(x, y) > 0.985) { g.p(x, y, '#3E8A40'); g.p(x, y - 1, '#3E8A40') }
    else if (ruido(x + 7, y) > 0.992) g.p(x, y, '#F7F1E3')
  }
  g.chapa(R(0, chao, LW, 1), '#3E8A40')
  const lug = lugaresDaArena(LW, LH, { chao: CH, cunha })
  for (const lado of ['A', 'B']) for (const p of lug[lado]) g.chapa(E(p.x, p.y - 1, 17, 4), '#7ED07A')
  return g.canvas()
}

const cacheFrente = new Map()
/** Desenha a arena no contexto: céu (azul → laranja no Sundown), sol na altura `sol` (0 = alto, 1 = no horizonte) e a frente. */
export function desenharArena(cx, LW, LH, { sol = 0, laranja = 0, chao: CH = CHAO, cunha = false } = {}) {
  const chao = LH - CH
  const topo = misturar('#5FB6E8', '#E8835A', laranja), baixo = misturar(PALETA.ceu, '#FFC27A', laranja)
  const faixas = 8
  for (let i = 0; i < faixas; i++) {
    cx.fillStyle = misturar(topo, baixo, i / (faixas - 1))
    const y0 = Math.floor((i * chao) / faixas)
    cx.fillRect(0, y0, LW, Math.ceil(chao / faixas) + 1)
  }
  // sol: desce do alto até encostar no horizonte das colinas
  const sx = Math.round(LW * 0.83), sy = Math.round(26 + sol * (chao - 40 - 26)), r = 11
  cx.fillStyle = misturar('#FFF3A8', '#FFB347', laranja)
  for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); cx.fillRect(sx - w, sy + y, 2 * w + 1, 1) }
  cx.fillStyle = misturar('#FFFFFF', '#FFE0A0', laranja)
  cx.fillRect(sx - 5, sy - 6, 4, 2)
  const png = pngDe('arena')
  if (png) {
    // arte de verdade (céu opaco): cobre a largura com o pé no chão. Se a tela pede mais chão do que a arte tem (formação em
    // cunha do celular), a arte sobe e a grama do pé dela se repete embaixo. O Sundown entra por cima: sol e tinta laranja.
    const k = Math.max(1, Math.floor(LW / png.width)) || 1
    const w = png.width * k, h = png.height * k, x0 = Math.round((LW - w) / 2)
    const sobe = Math.max(0, CH - ARENA_PNG.chao * k)
    cx.drawImage(png, x0, LH - h - sobe, w, h)
    const faixa = ARENA_PNG.grama
    for (let y = LH - sobe; y < LH; y += faixa * k) cx.drawImage(png, 0, png.height - faixa, png.width, faixa, x0, y, w, faixa * k)
    if (sol > 0.02) {
      const py = Math.round(30 + sol * (chao - 30 - 30))
      cx.fillStyle = misturar('#FFF3A8', '#FFB347', laranja)
      for (let y = -r; y <= r; y++) { const ww = Math.round(Math.sqrt(r * r - y * y)); cx.fillRect(sx - ww, py + y, 2 * ww + 1, 1) }
    }
    if (laranja > 0) { cx.fillStyle = `rgba(240, 120, 50, ${(0.3 * laranja).toFixed(3)})`; cx.fillRect(0, 0, LW, LH) }
    return
  }
  const chave = LW + 'x' + LH + 'x' + CH + cunha
  if (!cacheFrente.has(chave)) cacheFrente.set(chave, frenteDaArena(LW, LH, { chao: CH, cunha }))
  cx.drawImage(cacheFrente.get(chave), 0, 0)
}

// ------------------------------------------------------------------ MAPA de cima (384×216)
// Onde fica cada lugar (1..5), o ninho e o caminho da patrulha. Há duas geometrias: a do mapa desenhado por código e a do
// map.png do manifesto (se a arte do mapa mudar, ajuste só `png`; o manifesto também pode trazer "mapPlaces": [[x, y]×5]).
export const MAPA = {
  w: 384, h: 216,
  lugares: [[52, 176], [118, 128], [196, 158], [262, 92], [334, 44]], ninho: [20, 196],
  png: {
    lugares: [[30, 116], [76, 152], [128, 106], [330, 150], [336, 52]], ninho: [214, 190],
    caminhos: { 1: [[214, 190], [214, 142], [60, 142], [34, 124]], 2: [[214, 190], [214, 142], [96, 142]], 3: [[214, 190], [214, 142], [128, 142], [128, 118]], 4: [[214, 190], [214, 142], [296, 142], [316, 150]], 5: [[214, 190], [214, 142], [296, 142], [316, 150]] },
  },
}
/** A geometria que vale agora (com ou sem PNG do mapa): { comPng, lugares, ninho, caminho(n) }. */
export function geometriaDoMapa(extra = null) {
  const comPng = !!pngDe('map')
  if (!comPng) return { comPng, lugares: MAPA.lugares, ninho: MAPA.ninho, caminho: (n) => [MAPA.ninho, ...MAPA.lugares.slice(0, n)] }
  const ok = Array.isArray(extra) && extra.length === 5 && extra.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))
  return { comPng, lugares: ok ? extra : MAPA.png.lugares, ninho: MAPA.png.ninho, caminho: (n) => (ok ? [MAPA.png.ninho, extra[n - 1]] : MAPA.png.caminhos[n]) }
}
export function desenharMapa() {
  const png = pngDe('map')
  if (png) { const cv = criarCanvas(MAPA.w, MAPA.h); cv.getContext('2d').drawImage(png, 0, 0, MAPA.w, MAPA.h); return cv }
  const { w, h } = MAPA
  const g = new Grade(w, h)
  g.chapa(R(0, 0, w, h), '#6CC067')
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = ruido(x >> 2, y >> 2)
    if (n > 0.8) g.p(x, y, '#63B55E')
    if (ruido(x, y) > 0.993) g.p(x, y, '#F7F1E3')
  }
  // colina do castelo
  g.forma(E(334, 50, 46, 30), rampa('#7FCF78', '#9BE08F', '#5FA35E'), { linha: false })
  // rio
  const rio = [[150, -4], [170, 40], [230, 70], [262, 92], [300, 130], [330, 170], [360, 222]]
  g.forma(T(rio, 9), rampa('#2E8BEA', '#8CC8FF', '#1D5AA8'), { linha: false })
  for (let i = 0; i < 40; i++) { const t = i / 40, k = Math.floor(t * (rio.length - 1)), f = t * (rio.length - 1) - k; const [ax, ay] = rio[k], [bx, by] = rio[k + 1]; g.p(ax + (bx - ax) * f + 2, ay + (by - ay) * f - 2, '#E6F4FF') }
  // mata (borda com espinhos)
  for (let i = 0; i < 26; i++) {
    const x = 160 + ruido(i, 3) * 90, y = 180 + ruido(i, 9) * 40
    g.forma(E(x, y, 9, 8), rampa(PALETA.folhagem, '#5A8F62', '#2C4E34'))
  }
  for (let i = 0; i < 14; i++) { const x = 20 + ruido(i, 5) * 110, y = 10 + ruido(i, 7) * 80; g.forma(E(x, y, 8, 7), rampa(PALETA.folhagem, '#5A8F62', '#2C4E34')) }
  // estrada de terra ligando os 5 lugares
  const L = MAPA.lugares
  const estrada = [[-6, 200], ...L, [400, 30]]
  g.forma(T(estrada, 5), rampa('#D9B77E', '#EAD2A2', '#B08A52'), { linha: false, semLuz: true })
  g.chapa(T(estrada, 1), '#C9A46A')
  // ponte de pedra sobre o rio (lugar 4)
  g.forma(R(252, 86, 22, 12), rampa(PALETA.pedra, '#E8E3DC', '#9A9188'), { semLuz: true })
  g.contorno()
  return g.canvas()
}

// ------------------------------------------------------------------ NINHO (cena do ovo), tamanho livre
export function desenharNinho(LW, LH) {
  const g = new Grade(LW, LH)
  const tabua = rampa(PALETA.madeira, '#8E6A52', '#4E3428')
  const lx = Math.round(LW * 0.18)
  for (let x = 0; x < LW; x += 24) g.chapa(R(x, 0, 23, LH), misturar(PALETA.madeira, '#000000', (x / 24) % 2 ? 0.06 : 0))
  // luz quente da lanterna nas tábuas (anéis opacos, sem transparência)
  g.chapa(E(lx, 50, 58, 48), '#7A5642'); g.chapa(E(lx, 48, 40, 33), '#86604A'); g.chapa(E(lx, 46, 24, 20), '#946C52')
  for (let x = 23; x < LW; x += 24) g.chapa(R(x, 0, 1, LH), '#4E3428')
  g.forma(R(0, 18, LW, 8), tabua, { linha: false })
  g.chapa(R(lx, 26, 1, 12), PLUM)
  g.forma(R(lx - 6, 38, 13, 16), rampa('#E8C547', '#FFF3A8', '#B08A22'))
  g.chapa(R(lx - 3, 41, 7, 10), '#FFF3A8')
  // mesa e ninho de palha
  const mesa = LH - 46
  g.forma(R(0, mesa, LW, 10), tabua)
  g.forma(R(0, mesa + 10, LW, LH - mesa - 10), rampa('#4E3428'), { linha: false, semLuz: true })
  const nx = Math.round(LW / 2)
  g.forma(E(nx, mesa - 2, 54, 14), rampa('#D9B24A', '#F2D27A', '#A8822E'))
  for (let i = 0; i < 70; i++) {
    const a = ruido(i, 1) * Math.PI, rr = 30 + ruido(i, 2) * 22
    const x = nx + Math.cos(a) * rr * (ruido(i, 3) > 0.5 ? 1 : -1), y = mesa - 6 + ruido(i, 4) * 12
    g.linhaPx(x, y, x + (ruido(i, 5) - 0.5) * 10, y + 2, ruido(i, 6) > 0.5 ? '#A8822E' : '#F2D27A')
  }
  g.contorno()
  const cv = g.canvas()
  const png = pngDe('nest')
  if (png) { const k = Math.max(1, Math.floor(LW / png.width)); cv.getContext('2d').drawImage(png, Math.round((LW - png.width * k) / 2), LH - png.height * k, png.width * k, png.height * k) }
  return cv
}
export const ninhoTopo = (LH) => LH - 46 - 2 // y do fundo do ninho (onde o ovo pousa)
export { ELEMENTOS, CREME }
