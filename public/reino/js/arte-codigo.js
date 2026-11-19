// Keepmile — desenho POR CÓDIGO: a queda de cada peça que faltar no atlas (bonecos cabeçudos, prédios, cenário, ícones, fonte).
// Paleta e regras de docs/reino/arte.md: contorno ameixa de 1 px, até 3 tons, luz de cima e da esquerda. Nada aqui conhece regra do jogo.

export const COR = {
  ameixa: '#2B1E3A', creme: '#FFF6E0', ouro: '#FFD248', painel: '#3A2A4E', filete: '#624C7C',
  grama: ['#7CC950', '#56A842', '#3A803C', '#285C3A'], estrada: ['#E8C48A', '#CDA068', '#A0724C', '#704C3E'],
  pedra: ['#CECAD8', '#9E98B4', '#6E668E', '#483E64'], madeira: ['#C48C54', '#96623C', '#684030'],
  azul: '#4884E8', aco: '#B0BAD2', pele: '#F2C29A', roxo: '#9248C8', lima: '#B6F03C', carmim: '#CC3C3E', verde: '#469C48',
}
export const FAMILIA_COR = {
  pikewall: { cor: '#3E6ED6', claro: '#68A0F8', escuro: '#284296' }, thornbow: { cor: '#469C48', claro: '#78C85C', escuro: '#286840' },
  potluck: { cor: '#E87E2E', claro: '#FAAA50', escuro: '#A84E24' }, fizzwick: { cor: '#AA5CE0', claro: '#D696FA', escuro: '#6C34A0' },
}
export const RARIDADE_COR = {
  C: { cor: '#96623C', claro: '#C48C54', escuro: '#684030' }, U: { cor: '#C07048', claro: '#ECA86E', escuro: '#7C4234' },
  R: { cor: '#B0BAD2', claro: '#ECF0F8', escuro: '#6C7496' }, E: { cor: '#46B4BE', claro: '#96ECE2', escuro: '#286882' },
  L: { cor: '#F4BE3C', claro: '#FFF096', escuro: '#B07024' },
}

export function tela(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const R = (g, x, y, w, h, cor) => { g.fillStyle = cor; g.fillRect(x, y, w, h) }

/** Contorno de 1 px em volta de tudo que não é transparente (por fora), na cor dada. */
export function contornar(c, cor = COR.ameixa) {
  const g = c.getContext('2d'), w = c.width, h = c.height, d = g.getImageData(0, 0, w, h), a = d.data, cheio = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) cheio[i] = a[i * 4 + 3] > 40 ? 1 : 0
  const [r, gg, b] = [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16))
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (cheio[i]) continue
    if ((x > 0 && cheio[i - 1]) || (x < w - 1 && cheio[i + 1]) || (y > 0 && cheio[i - w]) || (y < h - 1 && cheio[i + w])) { a[i * 4] = r; a[i * 4 + 1] = gg; a[i * 4 + 2] = b; a[i * 4 + 3] = 255 }
  }
  g.putImageData(d, 0, 0)
  return c
}

/** Cópia toda numa cor só (silhueta; pose "apanhou" em branco). */
export function silhueta(src, cor, sx = 0, sy = 0, w = src.width, h = src.height) {
  const c = tela(w, h), g = c.getContext('2d')
  g.drawImage(src, sx, sy, w, h, 0, 0, w, h); g.globalCompositeOperation = 'source-in'; R(g, 0, 0, w, h, cor)
  return c
}

/** Cópia multiplicada por uma cor (luz da hora), sem mexer no alfa. */
export function tingir(src, cor) {
  const c = tela(src.width, src.height), g = c.getContext('2d')
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'multiply'; R(g, 0, 0, c.width, c.height, cor)
  g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0)
  return c
}

export function espelhar(src) {
  const c = tela(src.width, src.height), g = c.getContext('2d')
  g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0)
  return c
}

// ------------------------------------------------------------------ boneco-base (quadro 48×40, pé em y=38, olha para a direita)
const QW = 48, QH = 40
const escurecer = (hex, k = 0.72) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')

const ARMAS = {
  lanca(g, x, y, p) { const d = p === 2 ? 6 : 0; if (p === 2) { R(g, x - 4, y, 20, 2, COR.madeira[1]); R(g, x + 16, y - 1, 4, 4, COR.aco) } else { R(g, x + 1 + d, y - 17, 2, 22, COR.madeira[1]); R(g, x + d, y - 21, 4, 5, COR.aco) } R(g, x - 9, y - 1, 6, 7, COR.madeira[0]); R(g, x - 7, y + 1, 2, 3, COR.aco) },
  porta(g, x, y, p) { const d = p === 2 ? 3 : 0; R(g, x + d, y - 12, 9, 20, COR.madeira[1]); R(g, x + d, y - 12, 9, 2, COR.madeira[0]); R(g, x + d + 4, y - 12, 1, 20, COR.madeira[2]); R(g, x + d + 6, y - 2, 2, 2, COR.ouro) },
  arco(g, x, y, p) { R(g, x + 3, y - 8, 2, 16, COR.madeira[1]); R(g, x + 1, y - 9, 2, 2, COR.madeira[1]); R(g, x + 1, y + 7, 2, 2, COR.madeira[1]); R(g, x + (p === 2 ? -1 : 2), y - 7, 1, 14, COR.creme); if (p !== 2) R(g, x - 2, y, 7, 1, COR.madeira[2]) },
  besta(g, x, y) { R(g, x - 2, y, 12, 2, COR.madeira[1]); R(g, x + 6, y - 5, 2, 12, COR.madeira[2]); R(g, x + 9, y, 3, 2, COR.aco) },
  frigideira(g, x, y, p) { if (p === 2) { R(g, x, y, 6, 2, COR.madeira[2]); R(g, x + 6, y - 2, 7, 6, COR.pedra[3]) } else { R(g, x + 1, y - 8, 2, 9, COR.madeira[2]); R(g, x - 2, y - 14, 8, 7, COR.pedra[3]); R(g, x - 1, y - 13, 3, 2, COR.pedra[1]) } },
  barril(g, x, y) { R(g, x - 16, y - 8, 8, 11, COR.madeira[1]); R(g, x - 16, y - 6, 8, 1, COR.pedra[3]); R(g, x - 16, y, 8, 1, COR.pedra[3]); R(g, x - 13, y - 11, 1, 3, COR.creme); R(g, x - 14, y - 13, 3, 2, COR.ouro) },
  baldes(g, x, y) { R(g, x - 13, y - 5, 20, 1, COR.madeira[2]); R(g, x - 14, y - 4, 5, 6, COR.madeira[1]); R(g, x + 4, y - 4, 5, 6, COR.madeira[1]); R(g, x - 14, y - 4, 5, 1, COR.ouro); R(g, x + 4, y - 4, 5, 1, COR.ouro) },
  torta(g, x, y, p) { const d = p === 2 ? 6 : 0; R(g, x + d, y - 4, 7, 3, COR.creme); R(g, x + d, y - 1, 7, 2, COR.madeira[0]) },
  falcao(g, x, y, p) { const u = p === 2 ? -6 : 0, d = p === 2 ? 8 : 0; R(g, x + 1 + d, y - 9 + u, 6, 5, COR.madeira[2]); R(g, x + 6 + d, y - 8 + u, 2, 2, COR.ouro); R(g, x - 1 + d, y - 6 + u, 3, 2, COR.madeira[1]) },
  clava(g, x, y, p) { if (p === 2) { R(g, x, y - 1, 9, 2, COR.madeira[2]); R(g, x + 8, y - 3, 5, 6, COR.creme) } else { R(g, x + 1, y - 9, 2, 10, COR.madeira[2]); R(g, x - 1, y - 14, 6, 6, COR.creme) } },
  funda(g, x, y, p) { R(g, x + 1, y - (p === 2 ? 2 : 8), p === 2 ? 8 : 1, p === 2 ? 1 : 8, COR.creme); R(g, x + (p === 2 ? 8 : 0), y - (p === 2 ? 4 : 11), 4, 4, COR.madeira[0]) },
  tambor(g, x, y) { R(g, x - 1, y - 2, 9, 8, COR.carmim); R(g, x - 1, y - 2, 9, 2, COR.creme); R(g, x + 2, y - 6, 1, 4, COR.madeira[0]) },
  frasco(g, x, y) { R(g, x + 1, y - 4, 5, 6, COR.lima); R(g, x + 2, y - 7, 3, 3, COR.creme) },
  nada() {},
}
const CHAPEUS = {
  elmo(g, c) { R(g, 18, 12, 13, 6, c); R(g, 19, 11, 11, 1, c); R(g, 17, 17, 15, 2, escurecer(c)); R(g, 20, 12, 5, 1, '#ECF0F8') },
  capuz(g, c) { R(g, 17, 12, 13, 7, c); R(g, 19, 10, 8, 2, c); R(g, 16, 8, 4, 3, c); R(g, 17, 18, 4, 8, c); R(g, 17, 22, 4, 4, escurecer(c)) },
  chef(g) { R(g, 19, 6, 11, 7, COR.creme); R(g, 17, 5, 15, 5, COR.creme); R(g, 19, 12, 11, 3, '#D8D2C8') },
  lenco(g, c) { R(g, 18, 12, 13, 5, c); R(g, 16, 15, 4, 6, escurecer(c)) },
  xale(g, c) { R(g, 18, 12, 13, 4, '#CECAD8'); R(g, 15, 13, 5, 5, '#CECAD8'); R(g, 17, 23, 13, 4, c) },
  gorro(g, c) { R(g, 18, 11, 13, 5, c); R(g, 28, 13, 5, 2, c); R(g, 23, 9, 3, 2, COR.ouro) },
  chifres(g) { R(g, 18, 10, 2, 5, COR.creme); R(g, 29, 10, 2, 5, COR.creme); R(g, 17, 9, 2, 2, COR.creme); R(g, 30, 9, 2, 2, COR.creme) },
  tampa(g) { R(g, 17, 11, 15, 3, COR.pedra[1]); R(g, 22, 9, 5, 2, COR.pedra[2]) },
  cartola(g) { R(g, 20, 5, 9, 8, COR.ameixa); R(g, 17, 12, 15, 2, COR.ameixa); R(g, 20, 10, 9, 1, COR.lima) },
  nada() {},
}

/** Uma pose do boneco: 0 parado · 1 passo · 2 golpe. Devolve um canvas 48×40 já contornado. */
function pose(e, p) {
  const c = tela(QW, QH), g = c.getContext('2d')
  const pele = e.pele || COR.pele, tun = e.tunica || COR.azul, inv = !!e.invasor
  const lean = p === 2 ? 2 : 0, perna = e.pernas || 4, larg = e.gordo ? 13 : 9, x0 = 24 - (larg >> 1)
  const topo = 38 - perna - 8 - 12 // topo da cabeça
  g.save(); g.translate(0, topo - 14)
  // costas (barril, baldes) atrás do corpo
  if (e.arma === 'barril' || e.arma === 'baldes') ARMAS[e.arma](g, 28 + lean, 29, p)
  g.restore()
  // pernas
  const ab = p === 1 ? 2 : p === 2 ? 3 : 0, bota = inv ? escurecer(pele, 0.6) : COR.madeira[2]
  R(g, 20 - ab, 38 - perna, 3, perna, bota); R(g, 25 + ab, 38 - perna, 3, perna, bota)
  g.save(); g.translate(lean, topo - 14)
  // corpo
  R(g, x0, 26, larg, 8, tun); R(g, x0, 32, larg, 2, escurecer(tun)); R(g, x0, 26, 2, 6, escurecer(tun, 0.86))
  if (e.avental) R(g, x0 + 3, 27, larg - 4, 6, COR.creme)
  // cabeça
  R(g, 18, 15, 13, 10, pele); R(g, 19, 14, 11, 12, pele); R(g, 18, 23, 13, 2, escurecer(pele, 0.86))
  if (inv) { R(g, 25, 19, 2, 3, COR.lima); R(g, 29, 19, 2, 3, COR.lima); R(g, 25, 23, 5, 1, COR.creme) } else { R(g, 25, 19, 2, 3, COR.ameixa); R(g, 29, 19, 1, 3, COR.ameixa); R(g, 23, 22, 2, 1, '#F09C8C') }
  ;(CHAPEUS[e.chapeu] || CHAPEUS.nada)(g, e.chapeuCor || COR.aco)
  // braço e arma
  const hx = 27 + (p === 2 ? 4 : 0), hy = 29
  if (e.arma !== 'barril' && e.arma !== 'baldes') (ARMAS[e.arma] || ARMAS.nada)(g, hx, hy, p)
  R(g, hx - 1, hy - 1, 3, 3, pele)
  g.restore()
  return contornar(c)
}

/** Ganso de corda (Clockwork Geese): bicho próprio, não é boneco. */
function ganso(p) {
  const c = tela(QW, QH), g = c.getContext('2d'), a = p === 1 ? 1 : 0, d = p === 2 ? 4 : 0
  R(g, 18, 26, 12, 8, COR.creme); R(g, 16, 28, 3, 4, COR.creme); R(g, 18, 32, 12, 2, '#D8D2C8')
  R(g, 28 + d, 17, 4, 11, COR.creme); R(g, 28 + d, 15, 6, 5, COR.creme); R(g, 34 + d, 17, 4, 2, COR.ouro); R(g, 31 + d, 16, 1, 2, COR.ameixa)
  R(g, 21 - a, 34, 2, 4, COR.ouro); R(g, 26 + a, 34, 2, 4, COR.ouro)
  R(g, 21, 21, 2, 5, COR.pedra[2]); R(g, 19, 19, 6, 3, COR.aco)
  return contornar(c)
}

const ELENCO = {
  T01: { chapeu: 'elmo', arma: 'lanca' }, T02: { chapeu: 'elmo', arma: 'porta' },
  T04: { chapeu: 'capuz', chapeuCor: '#469C48', tunica: '#96623C', arma: 'arco' }, T05: { chapeu: 'xale', chapeuCor: '#469C48', tunica: '#286840', arma: 'besta' },
  T06: { chapeu: 'gorro', chapeuCor: '#469C48', tunica: '#78C85C', arma: 'falcao' }, T07: { chapeu: 'chef', tunica: '#E87E2E', avental: true, arma: 'frigideira' },
  T08: { chapeu: 'lenco', chapeuCor: '#E87E2E', tunica: '#FAAA50', arma: 'baldes' }, T09: { chapeu: 'gorro', chapeuCor: '#E87E2E', tunica: '#A84E24', avental: true, arma: 'torta' },
  T10: { chapeu: 'capuz', chapeuCor: '#AA5CE0', tunica: '#6C34A0', arma: 'barril' },
  muncher: { invasor: true, chapeu: 'chifres', arma: 'clava' }, stilt: { invasor: true, chapeu: 'chifres', pernas: 10, arma: 'nada' },
  spud: { invasor: true, chapeu: 'chifres', arma: 'funda' }, brute: { invasor: true, chapeu: 'tampa', gordo: true, arma: 'clava' },
  bloater: { invasor: true, chapeu: 'chifres', gordo: true, tunicaCor: 1, arma: 'nada' }, mole: { invasor: true, chapeu: 'tampa', arma: 'clava' },
  drum: { invasor: true, chapeu: 'chifres', arma: 'tambor' }, quack: { invasor: true, chapeu: 'cartola', arma: 'frasco' },
}

/** As 3 poses por código de um tipo (carta de Tropa ou invasor). Sempre olhando para a direita. */
export function posesDe(tipo) {
  if (tipo === 'T11') return { parado: ganso(0), passo: ganso(1), golpe: ganso(2) }
  const e = { ...(ELENCO[tipo] || ELENCO.T01) }
  if (e.invasor) { e.pele = COR.roxo; e.tunica = '#483E64' }
  return { parado: pose(e, 0), passo: pose(e, 1), golpe: pose(e, 2) }
}

// ------------------------------------------------------------------ poses → folha de 18 quadros (o mesmo roteiro do atlas)
export const ROTEIRO = {
  idle: { quadros: [0, 1], ms: [520, 520], loop: true }, walk: { quadros: [2, 3, 4, 5, 6, 7], ms: [90, 90, 90, 90, 90, 90], loop: true },
  attack: { quadros: [8, 9, 10, 11], ms: [120, 70, 90, 110], loop: false, impacto: 1 }, hit: { quadros: [12, 13], ms: [60, 130], loop: false },
  fall: { quadros: [14, 15, 16, 17], ms: [100, 170, 90, 90], loop: false },
}
function pontilhar(c, passo) {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height)
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if ((x + y * passo) % (passo + 1)) d.data[(y * c.width + x) * 4 + 3] = 0
  g.putImageData(d, 0, 0)
}
/**
 * Poses soltas (parado obrigatório; passo, golpe e apanhou opcionais) → peça animada como as do atlas.
 * `w,h` = quadro; `ax,ay` = âncora (pé); as poses entram com o pé na âncora. `esquerda`: a peça final olha para a esquerda.
 */
export function folhaDePoses(poses, { w = QW, h = QH, ax = 24, ay = 38, esquerda = false, lento = 1 } = {}) {
  const c = tela(w * 18, h), g = c.getContext('2d')
  g.imageSmoothingEnabled = false
  const P = poses.parado, S = poses.passo || P, G = poses.golpe || P, A = poses.apanhou || P
  const px = (img) => ax - (img.ancoraX ?? img.width / 2), py = (img) => ay - (img.ancoraY ?? img.height - 2)
  const por = (i, img, { dx = 0, dy = 0, rot = 0, sy = 1 } = {}) => {
    g.save(); g.beginPath(); g.rect(i * w, 0, w, h); g.clip()
    g.translate(i * w + ax + dx, ay + dy); g.rotate(rot); g.scale(1, sy); g.translate(-ax, -ay)
    g.drawImage(img, Math.round(px(img)), Math.round(py(img))); g.restore()
  }
  por(0, P); por(1, P, { sy: (h - 3) / (h - 2) })
  por(2, S, { rot: 0.05 }); por(3, P, { dy: -1 }); por(4, S, { rot: -0.03, dy: -1 }); por(5, S, { rot: -0.05 }); por(6, P, { dy: -1 }); por(7, S, { rot: 0.03, dy: -1 })
  por(8, P, { dx: -3, sy: 0.94 }); por(9, G, { dx: poses.golpe ? 2 : 5, rot: poses.golpe ? 0 : 0.16 }); por(10, G, { dx: poses.golpe ? 3 : 6, rot: poses.golpe ? 0 : 0.16 }); por(11, P, { dx: 1 })
  { const b = silhueta(A, '#FFFFFF'); b.ancoraX = A.ancoraX; b.ancoraY = A.ancoraY; por(12, b, { dx: -1 }) }
  por(13, A, { dx: -3, rot: -0.12 })
  por(14, A, { dx: -3, rot: -0.6 }); por(15, A, { dx: -6, dy: -4, rot: -1.45 })
  for (const [i, passo] of [[16, 1], [17, 2]]) { const t = tela(w, h), tg = t.getContext('2d'); tg.drawImage(c, 15 * w, 0, w, h, 0, 0, w, h); pontilhar(t, passo); g.drawImage(t, i * w, 0) }
  let img = c, quadros = Array.from({ length: 18 }, (_, i) => [i * w, 0, w, h]), ancX = ax
  if (esquerda) { img = espelhar(c); quadros = quadros.map(([x]) => [c.width - x - w, 0, w, h]); ancX = w - ax }
  const anim = {}
  for (const [k, a] of Object.entries(ROTEIRO)) anim[k] = { ...a, ms: a.ms.map((m) => Math.round(m * lento)) }
  return { img, quadros, variantes: null, anim, w, h, ax: ancX, ay, olhaEsquerda: esquerda, codigo: true }
}

// ------------------------------------------------------------------ prédios, magias e terreno por código
function casa(g, x, y, w, h, parede, telhado) {
  R(g, x, y + h * 0.4 | 0, w, h - (h * 0.4 | 0), parede); R(g, x, y + h - 3, w, 3, escurecer(parede))
  for (let i = 0; i < (h * 0.4 | 0) + 2; i++) R(g, x - 3 + i, y + (h * 0.4 | 0) - i, w + 6 - i * 2, 1, i < 2 ? escurecer(telhado) : telhado)
  R(g, x + (w >> 1) - 3, y + h - 10, 6, 10, COR.madeira[2]); R(g, x + 3, y + (h * 0.5 | 0), 4, 4, COR.ouro)
}
/** Prédio 80×72 (âncora 40,70) na cor da família, com um sinal do efeito. */
export function predioPorCodigo(familia, efeito) {
  const c = tela(80, 72), g = c.getContext('2d'), f = FAMILIA_COR[familia] || FAMILIA_COR.pikewall
  casa(g, 22, 30, 36, 40, efeito === 'reducao' ? COR.pedra[1] : COR.madeira[0], f.cor)
  R(g, 55, 16, 1, 16, COR.madeira[2]); R(g, 56, 16, 8, 5, f.claro)
  if (efeito === 'torre' || efeito === 'bis') { R(g, 12, 18, 12, 52, COR.madeira[1]); R(g, 10, 14, 16, 5, f.cor); R(g, 15, 26, 5, 6, COR.ouro) }
  if (efeito === 'curaSeg' || efeito === 'dano') { R(g, 28, 18, 5, 12, COR.pedra[2]); R(g, 29, 12, 3, 4, '#ECF0F8') }
  if (efeito === 'pavio') { R(g, 60, 58, 9, 12, COR.madeira[2]); R(g, 63, 54, 2, 4, COR.ouro) }
  contornar(c, escurecer(f.escuro, 0.7))
  return { img: c, quadros: [[0, 0, 80, 72]], anim: { n1: { quadros: [0], ms: [1000], loop: true } }, niveis: null, w: 80, h: 72, ax: 40, ay: 70, codigo: true }
}
const MAGIA = {
  barril(g) { R(g, 8, 14, 12, 16, COR.madeira[1]); R(g, 8, 17, 12, 2, COR.pedra[3]); R(g, 8, 25, 12, 2, COR.pedra[3]); R(g, 13, 9, 2, 5, COR.creme); R(g, 12, 6, 4, 3, COR.ouro) },
  piche(g) { R(g, 3, 25, 22, 5, COR.ameixa); R(g, 6, 23, 14, 2, COR.ameixa); R(g, 8, 25, 5, 1, COR.pedra[2]) },
  abelhas(g) { R(g, 8, 12, 12, 16, COR.ouro); R(g, 8, 16, 12, 2, COR.madeira[1]); R(g, 8, 22, 12, 2, COR.madeira[1]); R(g, 12, 24, 4, 4, COR.ameixa); R(g, 22, 8, 3, 2, COR.ouro); R(g, 3, 10, 3, 2, COR.ouro) },
  corneta(g) { R(g, 13, 16, 2, 14, COR.madeira[2]); R(g, 6, 8, 14, 5, COR.ouro); R(g, 18, 6, 5, 9, COR.ouro); R(g, 4, 9, 3, 3, COR.madeira[0]) },
  repeteco(g) { R(g, 6, 18, 16, 10, COR.pedra[2]); R(g, 4, 16, 20, 3, COR.pedra[1]); R(g, 9, 13, 10, 3, '#FAAA50'); R(g, 12, 6, 2, 5, '#ECF0F8') },
  laco(g) { for (const x of [4, 10, 16, 21]) { R(g, x, 20, 2, 10, '#286840'); R(g, x - 2, 22, 6, 2, '#469C48'); R(g, x + 1, 18, 2, 2, COR.carmim) } },
  levanta(g) { R(g, 5, 24, 18, 4, COR.creme); R(g, 9, 18, 10, 6, '#FAAA50'); R(g, 12, 14, 4, 4, COR.carmim) },
  finale(g) { R(g, 12, 12, 4, 18, COR.carmim); R(g, 12, 16, 4, 2, COR.creme); R(g, 11, 6, 6, 6, COR.ouro); R(g, 13, 2, 2, 4, COR.creme) },
}
/** Adereço da Magia no terreno, 28×32 (âncora 14,30). */
export function magiaPorCodigo(efeito) {
  const c = tela(28, 32), g = c.getContext('2d')
  ;(MAGIA[efeito] || MAGIA.barril)(g)
  contornar(c)
  return { img: c, quadros: [[0, 0, 28, 32]], anim: { idle: { quadros: [0], ms: [1000], loop: true } }, w: 28, h: 32, ax: 14, ay: 30, codigo: true }
}
/** Placa do terreno vazio, 56×48 (âncora 28,45), com o número. */
export function terrenoVazioPorCodigo(desenharNumero) {
  const c = tela(56 * 6, 48), g = c.getContext('2d'), anim = {}
  for (let k = 0; k < 6; k++) {
    const x = k * 56
    for (let i = 0; i < 52; i += 6) R(g, x + 2 + i, 44, 3, 1, COR.creme)
    R(g, x + 27, 30, 2, 15, COR.madeira[2]); R(g, x + 21, 22, 14, 10, COR.madeira[0]); R(g, x + 21, 30, 14, 2, COR.madeira[1])
    desenharNumero(g, String(k + 1), x + 28, 24)
    anim['plot' + (k + 1)] = { quadros: [k], ms: [1000], loop: true }
  }
  return { img: c, quadros: Array.from({ length: 6 }, (_, k) => [k * 56, 0, 56, 48]), anim, w: 56, h: 48, ax: 28, ay: 45, codigo: true }
}
export function bandeiraPorCodigo() {
  const c = tela(16 * 4, 24), g = c.getContext('2d'), anim = {}
  Object.keys(FAMILIA_COR).forEach((f, i) => {
    R(g, i * 16 + 3, 2, 1, 22, COR.madeira[2]); R(g, i * 16 + 4, 3, 9, 6, FAMILIA_COR[f].cor); R(g, i * 16 + 4, 3, 9, 1, FAMILIA_COR[f].claro); R(g, i * 16 + 10, 5, 3, 2, 'rgba(0,0,0,0)')
    anim[f] = { quadros: [i], ms: [1000], loop: true }
  })
  contornar(c)
  return { img: c, quadros: [0, 1, 2, 3].map((i) => [i * 16, 0, 16, 24]), anim, w: 16, h: 24, ax: 3, ay: 23, codigo: true }
}
/** Rachaduras por cima de uma peça de castelo (estados rachado e muito rachado). */
export function racharCastelo(src, nivel) {
  const c = tela(src.width, src.height), g = c.getContext('2d')
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'
  const risco = (x, y, n) => { for (let i = 0; i < n; i++) { R(g, x, y, 2, 3, COR.ameixa); x += (i % 2 ? -2 : 3); y += 3 } }
  risco(src.width * 0.3 | 0, src.height * 0.35 | 0, 6); risco(src.width * 0.62 | 0, src.height * 0.5 | 0, 5)
  if (nivel > 1) { risco(src.width * 0.48 | 0, src.height * 0.22 | 0, 9); risco(src.width * 0.75 | 0, src.height * 0.3 | 0, 7); R(g, src.width * 0.18 | 0, src.height * 0.12 | 0, 8, 7, 'rgba(43,30,58,0.55)') }
  return c
}

// ------------------------------------------------------------------ cenário por código (os mesmos planos e medidas do atlas)
export const HORAS_CODIGO = {
  morning: { ceu: ['#4C9CE8', '#6CB4F0', '#94CCF4', '#C4E4F8'], longe: '#8CA4D8', astro: '#FFF6C8', luz: { ambiente: '#FFFFF8', filete: '#FFF8D2', sombra: { alfa: 0.26, dx: 2, estica: 1 }, vinheta: 0.14 } },
  afternoon: { ceu: ['#6058C0', '#B06CA8', '#F09078', '#FCCC84'], longe: '#B08CA4', astro: '#FFE890', luz: { ambiente: '#FFE8CE', filete: '#FFDE8C', sombra: { alfa: 0.28, dx: 6, estica: 1.6 }, vinheta: 0.2 } },
  'boss-night': { ceu: ['#141432', '#1E2050', '#2C306C', '#40488C'], longe: '#343C74', astro: '#E8F0FF', luz: { ambiente: '#969CD8', filete: '#96CEFF', sombra: { alfa: 0.38, dx: -3, estica: 1.2 }, vinheta: 0.3 } },
}
const TERRENOS_PC = [1, 2, 3, 4, 5, 6].map((n) => ({ n, x: 84 + (n - 1) * 61, largura: 61, base_predio: 148, estrada: [152, 200], sentido: 1 }))
const TERRENOS_CEL = [
  { n: 1, x: 62, largura: 62, base_predio: 248, estrada: [251, 269], sentido: 1 }, { n: 2, x: 124, largura: 62, base_predio: 248, estrada: [251, 269], sentido: 1 },
  { n: 3, x: 118, largura: 62, base_predio: 180, estrada: [183, 201], sentido: -1 }, { n: 4, x: 56, largura: 62, base_predio: 180, estrada: [183, 201], sentido: -1 },
  { n: 5, x: 38, largura: 56, base_predio: 112, estrada: [115, 133], sentido: 1 }, { n: 6, x: 92, largura: 56, base_predio: 112, estrada: [115, 133], sentido: 1 },
]
function salpicar(g, x, y, w, h, cores, n, semente) {
  let s = semente
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const px = x + (s >>> 8) % w; s = (Math.imul(s, 1664525) + 1013904223) >>> 0; R(g, px, y + (s >>> 8) % h, 1 + (s & 1), 1, cores[(s >>> 4) % cores.length]) }
}
function ceu(g, w, h, hr) {
  const faixa = Math.ceil(h / hr.ceu.length)
  hr.ceu.forEach((cor, i) => { R(g, 0, i * faixa, w, faixa, cor); if (i) for (let x = 0; x < w; x += 2) R(g, x + (i & 1), i * faixa - 1, 1, 1, cor) })
  R(g, w * 0.2 | 0, h * 0.25 | 0, 12, 12, hr.astro); R(g, (w * 0.2 | 0) - 1, (h * 0.25 | 0) + 2, 14, 8, hr.astro); R(g, (w * 0.2 | 0) + 2, (h * 0.25 | 0) - 1, 8, 14, hr.astro)
}
function morros(g, w, h, cor, passo, alt, semente) {
  let s = semente
  for (let x = 0; x < w; x++) { const y = Math.round(h - alt * (0.55 + 0.45 * Math.sin((x / w) * Math.PI * 2 * passo + semente))); R(g, x, y, 1, h - y, cor); s++ }
}
function chao(g, w, h, noite) {
  const gr = noite ? ['#3C6C6C', '#2C5460', '#20404C', '#183040'] : COR.grama
  R(g, 0, 0, w, h, gr[1]); salpicar(g, 0, 0, w, h, [gr[0], gr[2]], w * h / 30 | 0, 7)
  return gr
}
function estrada(g, x, y, w, h, noite) {
  const e = noite ? ['#8C84A4', '#6C6890', '#4C4870', '#343058'] : COR.estrada
  R(g, x, y, w, h, e[1]); R(g, x, y, w, 1, e[0]); R(g, x, y + h - 1, w, 1, e[2]); salpicar(g, x, y + 1, w, h - 2, [e[0], e[2]], w * h / 14 | 0, 11)
}
/** Cenário inteiro por código, no formato do atlas: planos com quadro, posição e paralaxe. */
export function cenarioPorCodigo(tipo, hora) {
  const hr = HORAS_CODIGO[hora], noite = hora === 'boss-night', pc = tipo === 'pc'
  const W = pc ? 640 : 180, planos = []
  const novo = (nome, w, h, x, y, par, rep, fazer) => { const c = tela(w, h); fazer(c.getContext('2d')); planos.push({ nome, img: c, quadro: [0, 0, w, h], x, y, paralaxe: par, repete_x: rep }) }
  novo('sky', W, pc ? 132 : 120, pc ? -80 : 0, 0, 0, false, (g) => ceu(g, W, pc ? 132 : 120, hr))
  novo('far', W, 69, pc ? -80 : 0, pc ? 45 : 27, 0.1, pc, (g) => { morros(g, W, 69, hr.longe, pc ? 3 : 1, 50, 2); morros(g, W, 69, escurecer(hr.longe, 0.86), pc ? 5 : 2, 26, 5) })
  novo('mid', W, 80, pc ? -80 : 0, pc ? 48 : 32, 0.3, pc, (g) => { const v = noite ? '#284858' : '#56A842'; morros(g, W, 80, escurecer(v, 0.8), pc ? 6 : 2, 34, 1); morros(g, W, 80, v, pc ? 4 : 1, 20, 3) })
  if (pc) {
    novo('ground', W, 170, -80, 118, 1, true, (g) => { chao(g, W, 170, noite); estrada(g, 0, 34, W, 48, noite) })
    novo('front', W, 40, -80, 236, 1.3, true, (g) => { for (let x = 10; x < W; x += 74) { R(g, x, 22, 30, 18, COR.grama[3]); R(g, x + 6, 14, 18, 10, COR.grama[3]) } })
  } else {
    novo('ground', W, 300, 0, 70, 1, false, (g) => {
      chao(g, W, 300, noite)
      for (const [y, x0, x1] of [[181, 0, 180], [113, 0, 180], [45, 0, 180]]) { estrada(g, x0, y, x1 - x0, 18, noite); R(g, 0, y + 18, W, 6, noite ? '#483E64' : COR.pedra[2]); R(g, 0, y + 18, W, 1, noite ? '#6E668E' : COR.pedra[0]) }
      for (const [x, y] of [[160, 113], [4, 45]]) for (let i = 0; i < 86; i += 4) { R(g, x, y + i, 16, 3, COR.madeira[0]); R(g, x, y + i + 3, 16, 1, COR.madeira[2]) }
    })
  }
  const nuvem = tela(56 * 3 + 2, 22), ng = nuvem.getContext('2d'), cn = noite ? '#5C64A0' : hora === 'afternoon' ? '#FCC8A0' : '#FFFFFF'
  for (let i = 0; i < 3; i++) { R(ng, i * 57 + 8, 10, 40 - i * 6, 8, cn); R(ng, i * 57 + 16, 5, 20 - i * 3, 6, cn); R(ng, i * 57 + 4, 14, 48 - i * 6, 4, cn) }
  return { planos, nuvens: [0, 1, 2].map((i) => [i * 57, 0, 56, 22]), nuvemImg: nuvem, luz: hr.luz, codigo: true }
}
export const GEOMETRIA = {
  pc: { referencia: [480, 270], largura_dos_planos: 640, portao: [24, 152], castelo: [446, 156], terrenos: TERRENOS_PC },
  celular: { referencia: [180, 370], largura_dos_planos: 180, portao: [10, 270], castelo: [142, 114], terrenos: TERRENOS_CEL, escadas: [{ de: 2, para: 3, x: [160, 176], y: [183, 269] }, { de: 4, para: 5, x: [4, 20], y: [115, 201] }], mesa_y: 282 },
  rodadas: { 1: 'morning', 2: 'morning', 3: 'afternoon', 4: 'afternoon', 5: 'boss-night' },
}

// ------------------------------------------------------------------ fonte "Reino 5×7" e mini 3×5 por código
const G5 = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#', B: '####./#...#/#...#/####./#...#/#...#/####.', C: '.####/#..../#..../#..../#..../#..../.####', D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '####/#.../#.../###./#.../#.../####', F: '####/#.../#.../###./#.../#.../#...', G: '.####/#..../#..../#..##/#...#/#...#/.####', H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '###/.#./.#./.#./.#./.#./###', J: '..##/...#/...#/...#/...#/#..#/.##.', K: '#...#/#..#./#.#../##.../#.#../#..#./#...#', L: '#.../#.../#.../#.../#.../#.../####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', N: '#...#/##..#/#.#.#/#.#.#/#..##/#...#/#...#', O: '.###./#...#/#...#/#...#/#...#/#...#/.###.', P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#', R: '####./#...#/#...#/####./#.#../#..#./#...#', S: '.####/#..../#..../.###./....#/....#/####.', T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.', V: '#...#/#...#/#...#/#...#/.#.#./.#.#./..#..', W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#', X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..', Z: '#####/....#/...#./..#../.#.../#..../#####',
  0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', 1: '.#./##./.#./.#./.#./.#./###', 2: '.###./#...#/....#/...#./..#../.#.../#####', 3: '####./....#/....#/.###./....#/....#/####.',
  4: '...#./..##./.#.#./#..#./#####/...#./...#.', 5: '#####/#..../####./....#/....#/#...#/.###.', 6: '.###./#..../#..../####./#...#/#...#/.###.', 7: '#####/....#/...#./..#../..#../..#../..#..',
  8: '.###./#...#/#...#/.###./#...#/#...#/.###.', 9: '.###./#...#/#...#/.####/....#/....#/.###.',
  ' ': '.../.../.../.../.../.../...', '.': './././././#/#', ',': '../../../../../.#/#.', '!': '#/#/#/#/#/./#', '?': '.###./#...#/....#/...#./..#../...../..#..', ':': '././#/././#/.',
  '-': '..../..../..../####/..../..../....', '+': '...../..#../..#../#####/..#../..#../.....', '/': '....#/....#/...#./..#../.#.../#..../#....', '%': '##..#/##..#/...#./..#../.#.../#..##/#..##',
  x: '...../...../#...#/.#.#./..#../.#.#./#...#', '>': '#.../.#../..#./...#/..#./.#../#...', '<': '...#/..#./.#../#.../.#../..#./...#', '(': '.#/#./#./#./#./#./.#', ')': '#./.#/.#/.#/.#/.#/#.',
  "'": '#/#/././././.', '=': '..../..../####/..../####/..../....', '*': '...../#.#.#/.###./#####/.###./#.#.#/.....', '&': '.##../#..#./#..#./.##../#.#.#/#..#./.##.#',
}
const G3 = {
  A: '.#./#.#/###/#.#/#.#', B: '##./#.#/##./#.#/##.', C: '.##/#../#../#../.##', D: '##./#.#/#.#/#.#/##.', E: '###/#../##./#../###', F: '###/#../##./#../#..', G: '.##/#../#.#/#.#/.##', H: '#.#/#.#/###/#.#/#.#',
  I: '#/#/#/#/#', J: '..#/..#/..#/#.#/.#.', K: '#.#/#.#/##./#.#/#.#', L: '#../#../#../#../###', M: '#...#/##.##/#.#.#/#...#/#...#', N: '#..#/##.#/#.##/#..#/#..#', O: '.#./#.#/#.#/#.#/.#.', P: '##./#.#/##./#../#..',
  Q: '.#./#.#/#.#/.#./..#', R: '##./#.#/##./#.#/#.#', S: '.##/#../.#./..#/##.', T: '###/.#./.#./.#./.#.', U: '#.#/#.#/#.#/#.#/###', V: '#.#/#.#/#.#/#.#/.#.', W: '#...#/#...#/#.#.#/##.##/#...#', X: '#.#/#.#/.#./#.#/#.#',
  Y: '#.#/#.#/.#./.#./.#.', Z: '###/..#/.#./#../###', 0: '###/#.#/#.#/#.#/###', 1: '.#/##/.#/.#/.#', 2: '##./..#/.#./#../###', 3: '##./..#/.#./..#/##.', 4: '#.#/#.#/###/..#/..#', 5: '###/#../##./..#/##.',
  6: '.##/#../###/#.#/###', 7: '###/..#/.#./.#./.#.', 8: '###/#.#/###/#.#/###', 9: '###/#.#/###/..#/##.', ' ': '../../../../..', '!': '#/#/#/./#', '+': '.../.#./###/.#./...', '-': '.../.../###/.../...', x: '.../#.#/.#./#.#/...',
  '.': './././././#'.slice(0, 9), ':': './#/./#/.', '/': '..#/..#/.#./#../#..', '%': '#.#/..#/.#./#../#.#', "'": '#/#/././.', '&': '.#./#.#/.#./#.#/.##', '?': '##./..#/.#./.../.#.',
}
function folhaFonte(tab, alt, cor, contorno) {
  const chaves = Object.keys(tab), borda = contorno ? 1 : 0
  let wTot = 0; const lin = chaves.map((k) => { const l = tab[k].split('/'); wTot += l[0].length + 1 + borda * 2; return l })
  const c = tela(wTot, alt + borda * 2), g = c.getContext('2d'), glifos = {}
  let x = 0
  lin.forEach((l, i) => {
    const w = l[0].length
    g.fillStyle = cor
    for (let y = 0; y < l.length && y < alt; y++) for (let k = 0; k < w; k++) if (l[y][k] === '#') g.fillRect(x + borda + k, borda + y, 1, 1)
    glifos[chaves[i]] = [x, 0, w + borda * 2, alt + borda * 2]
    x += w + 1 + borda * 2
  })
  if (contorno) {
    // contorno glifo a glifo (os vizinhos na folha não se tocam: há 1 px de folga entre eles)
    contornar(c)
  }
  return { img: c, glifos, altura: alt + borda * 2, espaco: contorno ? -1 : 1 }
}
export function fontesPorCodigo() {
  return {
    reino: folhaFonte(G5, 7, COR.creme, false), 'reino-contorno': folhaFonte(G5, 7, COR.creme, true), 'reino-ouro': folhaFonte(G5, 7, COR.ouro, true),
    mini: folhaFonte(G3, 5, COR.creme, false), 'mini-contorno': folhaFonte(G3, 5, COR.creme, true),
  }
}

// ------------------------------------------------------------------ ícones 11×11 e peças de interface por código
const IC = {
  life: '.##...##./####.####/#########/#########/.#######./..#####../...###.../....#....', gold: '..#####../.#######./###.#.###/###.#.###/###.#.###/.#######./..#####..',
  round: '....#..../...###.../..#####../.#######./..#####../...###.../....#....', speed: '#...#..../##..##.../###.###../#######../###.###../##..##.../#...#....',
  play: '.#....../.###..../.#####../.#######/.#####../.###..../.#......', pause: '.##..##./.##..##./.##..##./.##..##./.##..##./.##..##./.##..##.',
  'sound-on': '...#...../..##..#../####...#./####.#.#./####...#./..##..#../...#.....', 'sound-off': '...#...../..##.#.#./####..#../####.#.#./####...../..##...../...#.....',
  loot: '.#######./#########/#.#####.#/####.####/#########/#########/.#######.', boss: '#.......#/##.....##/#########/#.##.##.#/#########/.#.#.#.#./..#####..',
  shield: '#########/#########/#########/#########/.#######./..#####../....#....', horn: '#.......#/##.....##/.##...##./.#######./..#####../..#.#.#../...###...',
  troop: '.......##/......##./.....##../#...##.../.#.##..../..##...../.#..#....', building: '....#..../...###.../..#####../.#######./.##...##./.##.#.##./.##.#.##.',
  magic: '....#..../....#..../.#######./..#####../...###.../..##.##../.#.....#.', reroll: '..####.#./.#....##./#....###./#......../#.......#/.#.....#./..#####..',
  up: '....#..../...###.../..#####../.#######./...###.../...###.../...###...', pudding: '....#..../...###.../..#####../.#######./.#######./#########/#########',
}
export function iconesPorCodigo() {
  const nomes = Object.keys(IC), c = tela(12 * (nomes.length + 3), 11), g = c.getContext('2d'), quadros = {}
  const cores = { life: COR.carmim, gold: COR.ouro, boss: COR.roxo, shield: COR.azul, horn: COR.roxo, up: COR.ouro, pudding: '#FAAA50' }
  nomes.forEach((n, i) => {
    const l = IC[n].split('/')
    g.fillStyle = cores[n] || COR.creme
    l.forEach((s, y) => { for (let x = 0; x < s.length; x++) if (s[x] === '#') g.fillRect(i * 12 + 1 + x, 1 + y + (9 - l.length >> 1), 1, 1) })
    quadros[n] = [i * 12, 0, 11, 11]
  })
  const j = nomes.length
  { const l = IC.life.split('/'); g.fillStyle = COR.pedra[3]; l.forEach((s, y) => { for (let x = 0; x < s.length; x++) if (s[x] === '#') g.fillRect(j * 12 + 1 + x, 1 + y, 1, 1) }); quadros['life-empty'] = [j * 12, 0, 11, 11] }
  contornar(c)
  R(g, (j + 1) * 12, 0, 5, 5, COR.ameixa); R(g, (j + 1) * 12 + 1, 1, 3, 3, COR.ouro); quadros['pin-on'] = [(j + 1) * 12, 0, 5, 5]
  R(g, (j + 2) * 12, 0, 5, 5, COR.ameixa); R(g, (j + 2) * 12 + 1, 1, 3, 3, COR.pedra[2]); quadros['pin-off'] = [(j + 2) * 12, 0, 5, 5]
  return { img: c, quadros }
}
/** Botão 3 tons que afunda 2 px (solto e apertado), em qualquer largura. */
export function botaoPorCodigo(w, h, cor) {
  const c = tela(w * 2 + 1, h), g = c.getContext('2d'), esc = escurecer(cor, 0.62), cla = escurecer(cor, 1.25)
  for (const [x, ap] of [[0, 0], [w + 1, 2]]) {
    R(g, x, ap, w, h - ap, COR.ameixa); R(g, x + 1, ap + 1, w - 2, h - 2 - ap, esc); R(g, x + 1, ap + 1, w - 2, h - 6, cor); R(g, x + 2, ap + 1, w - 4, 1, cla)
  }
  return { img: c, solto: [0, 0, w, h], apertado: [w + 1, 0, w, h] }
}
/** Moldura de carta 56×78 por código (raridade = material). */
export function molduraPorCodigo(rar) {
  const c = tela(56, 78), g = c.getContext('2d'), m = RARIDADE_COR[rar] || RARIDADE_COR.C
  R(g, 0, 0, 56, 78, COR.ameixa); R(g, 1, 1, 54, 76, m.cor); R(g, 1, 1, 54, 1, m.claro); R(g, 1, 76, 54, 1, m.escuro); R(g, 3, 3, 50, 72, m.escuro); R(g, 4, 4, 48, 70, COR.creme)
  R(g, 4, 62, 48, 12, '#F0E2C0')
  return c
}
