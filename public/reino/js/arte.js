// Keepmile — CAMADA DE ARTE: usa o atlas (arte/atlas.json) quando a peça existe e cai no desenho por código, peça por peça.
// Toda peça sai no mesmo formato: { img, quadros, variantes, anim, w, h, ax, ay, olhaEsquerda }.
import * as Cod from './arte-codigo.js'

const BASE = new URL('../', import.meta.url)
const A = { atlas: null, folhas: {}, pecas: new Map(), porNome: {}, fontes: {}, icones: null, prov: {}, origem: {}, cenarios: {}, botoes: {}, cartas: new Map(), cores: new Map() }
export const origem = A.origem // id → 'atlas' | 'provisoria' | 'codigo' (para o relato e o teste)
const FUCSIA = { cor: '#E0489B', claro: '#F58CC4', escuro: '#9C2C6E' } // decisão de cor: roxo é só do invasor; Fizzwick é rosa-fúcsia
export const FAMILIA_COR = { ...Cod.FAMILIA_COR, fizzwick: FUCSIA }
export const COR = Cod.COR

function imagem(url) {
  return new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url })
}
function emTela(img) { const c = Cod.tela(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0); return c }

/** Troca o roxo da família (matiz 255°–300°) por rosa-fúcsia dentro dos retângulos dados. */
function trocarRoxo(c, rets) {
  const g = c.getContext('2d')
  for (const [x, y, w, h] of rets) {
    const d = g.getImageData(x, y, w, h), a = d.data
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] < 8) continue
      const r = a[i] / 255, gg = a[i + 1] / 255, b = a[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), dl = mx - mn
      if (dl < 0.12) continue
      let hh = mx === r ? ((gg - b) / dl) % 6 : mx === gg ? (b - r) / dl + 2 : (r - gg) / dl + 4
      hh = (hh * 60 + 360) % 360
      if (hh < 252 || hh > 302) continue
      const l = (mx + mn) / 2, s = dl / (1 - Math.abs(2 * l - 1)), H = 327 / 60, C = (1 - Math.abs(2 * l - 1)) * Math.min(1, s * 1.05), X = C * (1 - Math.abs(H % 2 - 1)), m = l - C / 2
      a[i] = Math.round((C + m) * 255); a[i + 1] = Math.round(m * 255); a[i + 2] = Math.round((X + m) * 255) // matiz 327° cai entre magenta e vermelho: (C, 0, X)
    }
    g.putImageData(d, x, y)
  }
}

const NOME_FAMILIA = { Pikewall: 'pikewall', Thornbow: 'thornbow', Potluck: 'potluck', Fizzwick: 'fizzwick' }

function doAtlas(id, p) {
  const img = A.folhas[p.folha]
  if (!img) return null
  const anim = {}
  for (const [k, a] of Object.entries(p.animacoes || {})) anim[k] = a
  return { img, quadros: p.quadros, variantes: p.variantes?.length ? p.variantes : null, anim, w: p.tamanho[0], h: p.tamanho[1], ax: p.ancora[0], ay: p.ancora[1], olhaEsquerda: p.olha === 'esquerda', niveis: p.niveis || null, estados: p.estados || null, barra: !!p.barra_vida }
}

/** Carrega tudo. Nunca falha: sem atlas (ou sem uma folha) cada peça cai no código. */
export async function carregar(CONFIG) {
  A.config = CONFIG
  let atlas = null
  try { const r = await fetch(new URL('arte/atlas.json', BASE)); if (r.ok) atlas = await r.json() } catch { /* sem atlas: tudo por código */ }
  if (atlas && atlas.pecas && atlas.folhas) {
    A.atlas = atlas
    const nomes = Object.keys(atlas.folhas)
    const imgs = await Promise.all(nomes.map((n) => imagem(new URL('arte/' + atlas.folhas[n].arquivo, BASE))))
    nomes.forEach((n, i) => { if (imgs[i]) A.folhas[n] = emTela(imgs[i]) })
    // Fizzwick em rosa-fúcsia: troca de paleta na carga (não mexe nos arquivos)
    for (const [id, p] of Object.entries(atlas.pecas)) {
      if (p.familia !== 'Fizzwick' || !A.folhas[p.folha]) continue
      const rets = [...p.quadros, ...(p.variantes || []).flat()]
      trocarRoxo(A.folhas[p.folha], rets)
    }
    if (A.folhas[atlas.cartas?.folha]) for (const c of Object.values(atlas.cartas.piloto || {})) if (c.familia === 'Fizzwick') trocarRoxo(A.folhas[atlas.cartas.folha], [[c.quadro[0], c.quadro[1], c.quadro[2], 16]])
    const fl = atlas.pecas['plot-flag']
    if (fl && A.folhas[fl.folha] && fl.animacoes?.Fizzwick) trocarRoxo(A.folhas[fl.folha], fl.animacoes.Fizzwick.quadros.map((i) => fl.quadros[i]))
    for (const [id, p] of Object.entries(atlas.pecas)) A.porNome[p.nome] = id
  }
  const provs = ['castelo', 'portao', 'quartel', 'moinho', 'tenda', 'ferraria', 'torre-mago', 'bruto', 'chefe', 'cavaleiro', 'mago']
  const pi = await Promise.all(provs.map((n) => imagem(new URL(`arte-provisoria/${n}.png`, BASE))))
  provs.forEach((n, i) => { if (pi[i]) A.prov[n] = emTela(pi[i]) })
  // fontes e ícones
  const fc = Cod.fontesPorCodigo()
  for (const nome of Object.keys(fc)) {
    const f = atlas?.fontes?.[nome], img = f && A.folhas[f.folha]
    A.fontes[nome] = img ? { img, glifos: f.glifos, altura: f.altura, espaco: f.espaco } : fc[nome]
    A.origem['fonte:' + nome] = img ? 'atlas' : 'codigo'
  }
  const ic = Cod.iconesPorCodigo(), ia = atlas?.icones, iimg = ia && A.folhas[ia.folha]
  A.icones = { cod: ic, img: iimg, quadros: iimg ? ia.quadros : {} }
  A.origem.icones = iimg ? 'atlas' : 'codigo'
  return A
}

const pecaAtlas = (id) => { const p = A.atlas?.pecas?.[id]; return p ? doAtlas(id, p) : null }
function guardada(chave, fazer) { if (!A.pecas.has(chave)) A.pecas.set(chave, fazer()); return A.pecas.get(chave) }
function marca(id, de) { A.origem[id] = de }

const PROV_UNIDADE = { T03: ['cavaleiro', 26, 28, false], T12: ['mago', 32, 32, false], brute: ['bruto', 43, 42, true], bloater: ['bruto', 43, 42, true] }
/** Peça animada de uma Tropa (id da carta), invasor ou chefe (id do motor). */
export function unidade(id) {
  return guardada('u:' + id, () => {
    const C = A.config, nome = C.CARTAS[id]?.nome || C.INVASORES[id]?.nome || C.CHEFES.find((c) => c.id === id)?.nome
    const pa = pecaAtlas(id) || (nome && A.porNome[nome] ? pecaAtlas(A.porNome[nome]) : null)
    if (pa && pa.anim.idle) { marca(id, 'atlas'); return pa }
    const chefe = C.CHEFES.find((c) => c.id === id)
    if (chefe && A.prov.chefe) {
      marca(id, 'provisoria')
      const p = A.prov.chefe; p.ancoraX = 36; p.ancoraY = 70
      const f = Cod.folhaDePoses({ parado: p }, { w: 112, h: 92, ax: 54, ay: 90, esquerda: false, lento: 1.5 }); f.barra = true; f.olhaEsquerda = true; return f
    }
    const pv = PROV_UNIDADE[id]
    if (pv && A.prov[pv[0]]) {
      marca(id, 'provisoria')
      const p = A.prov[pv[0]]; p.ancoraX = p.width / 2; p.ancoraY = p.height - 1
      const grande = pv[0] === 'bruto'
      const f = Cod.folhaDePoses({ parado: p }, grande ? { w: 72, h: 56, ax: 36, ay: 54, lento: 1.25 } : { w: 48, h: 40, ax: 24, ay: 38 })
      f.olhaEsquerda = pv[3]; f.barra = grande; return f
    }
    marca(id, 'codigo')
    const inv = !!C.INVASORES[id] || !!chefe
    return Cod.folhaDePoses(Cod.posesDe(id), { esquerda: inv })
  })
}

const PROV_PREDIO = { B02: 'quartel', B03: 'ferraria', B05: 'tenda', B07: 'tenda', B08: 'moinho', B09: 'torre-mago', B10: 'ferraria' }
export function predio(id) {
  return guardada('p:' + id, () => {
    const pa = pecaAtlas(id)
    if (pa) { marca(id, 'atlas'); return pa }
    const pv = A.prov[PROV_PREDIO[id]], c = A.config.CARTAS[id]
    if (pv) { marca(id, 'provisoria'); return { img: pv, quadros: [[0, 0, pv.width, pv.height]], anim: { n1: { quadros: [0], ms: [1000], loop: true } }, w: pv.width, h: pv.height, ax: pv.width >> 1, ay: pv.height - 3, niveis: null } }
    marca(id, 'codigo'); return Cod.predioPorCodigo(c.familia, c.efeito)
  })
}
export function magia(id) {
  return guardada('m:' + id, () => {
    const pa = pecaAtlas(id)
    if (pa) { marca(id, 'atlas'); return pa }
    marca(id, 'codigo'); return Cod.magiaPorCodigo(A.config.CARTAS[id].efeito)
  })
}
/** Peças fixas do reino e efeitos: castle, gate, plot-empty, plot-flag, dust, spark, slash, arrow, heal, coin, level-ring, confetti, shadow, explosion, smoke… */
export function peca(id) {
  return guardada('x:' + id, () => {
    const pa = pecaAtlas(id)
    if (pa) { marca(id, 'atlas'); return pa }
    marca(id, id === 'castle' || id === 'gate' ? 'provisoria' : 'codigo')
    if (id === 'castle' && A.prov.castelo) {
      const b = A.prov.castelo, c = Cod.tela(b.width * 3, b.height), g = c.getContext('2d')
      g.drawImage(b, 0, 0); g.drawImage(Cod.racharCastelo(b, 1), b.width, 0); g.drawImage(Cod.racharCastelo(b, 2), b.width * 2, 0)
      const q = (i) => ({ quadros: [i], ms: [1000], loop: true })
      return { img: c, quadros: [0, 1, 2].map((i) => [i * b.width, 0, b.width, b.height]), anim: { whole: q(0), cracked: q(1), ruined: q(2) }, estados: { 3: 'whole', 2: 'cracked', 1: 'ruined' }, w: b.width, h: b.height, ax: b.width >> 1, ay: b.height - 3 }
    }
    if (id === 'gate' && A.prov.portao) { const b = A.prov.portao; return { img: b, quadros: [[0, 0, b.width, b.height]], anim: { idle: { quadros: [0], ms: [1000], loop: true } }, w: b.width, h: b.height, ax: b.width >> 1, ay: b.height - 3 } }
    if (id === 'plot-empty') return Cod.terrenoVazioPorCodigo((g, s, x, y) => texto(g, s, x, y, { fonte: 'mini', cor: COR.ameixa, alinhar: 'centro' }))
    if (id === 'plot-flag') { const f = Cod.bandeiraPorCodigo(); f.anim = { Pikewall: f.anim.pikewall, Thornbow: f.anim.thornbow, Potluck: f.anim.potluck, Fizzwick: f.anim.fizzwick }; return f }
    return null // efeitos sem peça: a cena desenha partículas simples por código
  })
}

// ------------------------------------------------------------------ variações de folha (noite, espelhada), feitas só quando pedidas
const VARS = new WeakMap()
export function folhaVar(img, tinta, flip) {
  if (!tinta && !flip) return img
  let m = VARS.get(img); if (!m) VARS.set(img, m = {})
  const k = (tinta || '') + (flip ? 'F' : '')
  if (!m[k]) { let c = tinta ? Cod.tingir(img, tinta) : img; if (flip) c = Cod.espelhar(c); m[k] = c }
  return m[k]
}
/** Desenha o quadro `q` ([x,y,w,h]) da peça com o pé em (X, Y). `flip` espelha; `tinta` multiplica pela luz; `k` amplia. */
export function desenhar(g, p, q, X, Y, flip = false, tinta = null, k = 1) {
  const img = folhaVar(p.img, tinta, flip), w = q[2], h = q[3]
  const sx = flip ? img.width - q[0] - w : q[0], ax = flip ? w - 1 - p.ax : p.ax
  if (k === 1) g.drawImage(img, sx, q[1], w, h, X - ax, Y - p.ay, w, h)
  else g.drawImage(img, sx, q[1], w, h, X - ax * k, Y - p.ay * k, w * k, h * k)
}
/** Índice do quadro de uma animação no tempo `ms` desde o começo. Fora do fim de uma não-cíclica: o último. */
export function quadroDe(a, ms) {
  const n = a.quadros.length
  let tot = a.total; if (!tot) { tot = 0; for (let i = 0; i < n; i++) tot += a.ms[i]; a.total = tot }
  if (a.loop) ms %= tot; else if (ms >= tot) return a.quadros[n - 1]
  for (let i = 0; i < n; i++) { ms -= a.ms[i]; if (ms < 0) return a.quadros[i] }
  return a.quadros[n - 1]
}
export function duracao(a) { if (!a.total) quadroDe(a, 0); return a.total }

// ------------------------------------------------------------------ texto em pixel
function fonteCor(nome, cor) {
  const f = A.fontes[nome]
  if (!cor) return f
  const k = nome + cor
  if (!A.cores.has(k)) A.cores.set(k, { ...f, img: Cod.silhueta(f.img, cor) })
  return A.cores.get(k)
}
export function largura(s, fonte = 'reino') {
  const f = A.fontes[fonte]; let w = 0
  for (const ch of String(s).toUpperCase()) { const q = f.glifos[ch] || f.glifos[ch.toLowerCase()] || f.glifos[' ']; w += q[2] + f.espaco }
  return w - f.espaco
}
/** Escreve em pixel. `cor` só vale nas fontes sem contorno (reino, mini). Devolve a largura. */
export function texto(g, s, x, y, { fonte = 'reino', cor = null, alinhar = 'esquerda' } = {}) {
  s = String(s).toUpperCase()
  const f = fonteCor(fonte, fonte === 'reino' || fonte === 'mini' ? cor : null), w = largura(s, fonte)
  if (alinhar === 'centro') x -= w >> 1; else if (alinhar === 'direita') x -= w
  x = Math.round(x); y = Math.round(y)
  for (const ch of s) {
    const q = f.glifos[ch] || f.glifos[ch.toLowerCase()] || f.glifos[' ']
    if (ch !== ' ') {
      const src = f.img === A.fontes[fonte].img ? q : q
      g.drawImage(f.img, src[0], src[1], src[2], src[3], x, y, src[2], src[3])
    }
    x += q[2] + f.espaco
  }
  return w
}
/** Texto com contorno em qualquer tamanho inteiro `k` (títulos grandes). */
export function titulo(g, s, x, y, k = 2, ouro = false) {
  const fonte = ouro ? 'reino-ouro' : 'reino-contorno', w = largura(s, fonte), c = Cod.tela(w + 2, A.fontes[fonte].altura)
  texto(c.getContext('2d'), s, 0, 0, { fonte })
  g.drawImage(c, 0, 0, c.width, c.height, Math.round(x - (w * k) / 2), Math.round(y), c.width * k, c.height * k)
  return w * k
}

// ------------------------------------------------------------------ ícones, botões, painel
export function icone(g, nome, x, y) {
  const q = A.icones.quadros[nome]
  if (q) { g.drawImage(A.icones.img, q[0], q[1], q[2], q[3], x, y, q[2], q[3]); return }
  const c = A.icones.cod.quadros[nome]; if (c) g.drawImage(A.icones.cod.img, c[0], c[1], c[2], c[3], x, y, c[2], c[3])
}
const BOTAO_COR = { green: '#56A842', red: '#CC3C3E', plum: '#4E3A66' }
/** Botão em pixel de qualquer largura (3 fatias do atlas, ou por código). Devolve o deslocamento do conteúdo (2 se apertado). */
export function botao(g, cor, x, y, w, h = 26, apertado = false) {
  const ip = A.atlas?.interface, img = ip && A.folhas[ip.folha], largo = ip?.pecas?.['button-wide-' + cor], peq = ip?.pecas?.['button-' + cor]
  const p = img && (w > 30 && largo ? largo : peq)
  if (p && h === p.solto[3]) {
    const q = apertado ? p.apertado : p.solto, a = p.fatias ? p.fatias[0] : 6, b = p.fatias ? p.fatias[2] : 6
    g.drawImage(img, q[0], q[1], a, q[3], x, y, a, h); g.drawImage(img, q[0] + q[2] - b, q[1], b, q[3], x + w - b, y, b, h)
    g.drawImage(img, q[0] + a, q[1], q[2] - a - b, q[3], x + a, y, w - a - b, h)
  } else {
    const k = `b${cor}${w}x${h}`; if (!A.botoes[k]) A.botoes[k] = Cod.botaoPorCodigo(w, h, BOTAO_COR[cor] || BOTAO_COR.plum)
    const b = A.botoes[k], q = apertado ? b.apertado : b.solto
    g.drawImage(b.img, q[0], q[1], q[2], q[3], x, y, w, h)
  }
  return apertado ? 2 : 0
}
export function painel(g, x, y, w, h) {
  const p = A.atlas?.interface?.pecas?.panel, img = p && A.folhas[A.atlas.interface.folha]
  if (img) {
    const [qx, qy, qw, qh] = p.quadro, b = p.borda
    const xs = [[qx, b, x], [qx + b, qw - 2 * b, x + b, w - 2 * b], [qx + qw - b, b, x + w - b]], ys = [[qy, b, y], [qy + b, qh - 2 * b, y + b, h - 2 * b], [qy + qh - b, b, y + h - b]]
    for (const [sx, sw, dx, dw = sw] of xs) for (const [sy, sh, dy, dh = sh] of ys) g.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
  } else { g.fillStyle = COR.ameixa; g.fillRect(x, y, w, h); g.fillStyle = COR.filete; g.fillRect(x + 1, y + 1, w - 2, h - 2); g.fillStyle = COR.painel; g.fillRect(x + 2, y + 2, w - 4, h - 4) }
}
/** Peça solta da interface do atlas (label-boss, label-new, level-up, loot.Card…). Devolve false se não houver. */
export function ui(g, nome, x, y, quadro = 0) {
  const ip = A.atlas?.interface, img = ip && A.folhas[ip.folha]
  let p = img && nome.split('.').reduce((o, k) => o?.[k], ip.pecas)
  if (!p) return false
  if (p.quadros) p = p.quadros[quadro % p.quadros.length]
  g.drawImage(img, p[0], p[1], p[2], p[3], x, y, p[2], p[3]); return p
}

// ------------------------------------------------------------------ cartas 56×78
const RAR_NOME = { C: 'Common', U: 'Uncommon', R: 'Rare', E: 'Epic', L: 'Legendary' }
const SELO = { tropa: 'troop', construcao: 'building', magia: 'magic' }
function quebrarNome(nome) {
  if (largura(nome, 'mini') <= 46) return [nome]
  const p = nome.split(' '); if (p.length < 2) return [nome]
  let melhor = [nome], dif = 1e9
  for (let i = 1; i < p.length; i++) { const a = p.slice(0, i).join(' '), b = p.slice(i).join(' '), d = Math.abs(largura(a, 'mini') - largura(b, 'mini')); if (d < dif) { dif = d; melhor = [a, b] } }
  return melhor
}
/** Face da carta sem pinos nem número (guardada). */
function faceBase(id) {
  if (A.cartas.has(id)) return A.cartas.get(id)
  const c = Cod.tela(56, 78), g = c.getContext('2d'), ac = A.atlas?.cartas, img = ac && A.folhas[ac.folha], C = A.config.CARTAS[id]
  if (img && ac.piloto?.[id]) { const q = ac.piloto[id].quadro; g.drawImage(img, q[0], q[1], 56, 78, 0, 0, 56, 78); marca('carta:' + id, 'atlas') } else {
    const m = img && ac.molduras?.[RAR_NOME[C.raridade]]
    if (m) g.drawImage(img, m[0], m[1], 56, 78, 0, 0, 56, 78); else g.drawImage(Cod.molduraPorCodigo(C.raridade), 0, 0)
    marca('carta:' + id, m ? 'atlas+codigo' : 'codigo')
    const f = FAMILIA_COR[C.familia]
    g.fillStyle = f.cor; g.fillRect(4, 4, 48, 15); g.fillStyle = f.claro; g.fillRect(4, 4, 48, 1); g.fillStyle = f.escuro; g.fillRect(4, 18, 48, 1)
    const lin = quebrarNome(C.nome)
    lin.forEach((s, i) => texto(g, s, 28, lin.length === 1 ? 9 : 6 + i * 6, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' }))
    // ilustração: céu e chão em degraus + a peça
    const noite = C.tipo === 'magia'
    g.fillStyle = noite ? '#2C306C' : '#94CCF4'; g.fillRect(4, 19, 48, 36); g.fillStyle = noite ? '#40488C' : '#C4E4F8'; g.fillRect(4, 40, 48, 8)
    g.fillStyle = noite ? '#285C3A' : '#56A842'; g.fillRect(4, 48, 48, 7); g.fillStyle = noite ? '#3A803C' : '#7CC950'; g.fillRect(4, 48, 48, 1)
    g.save(); g.beginPath(); g.rect(4, 19, 48, 36); g.clip()
    if (C.tipo === 'tropa') { const p = unidade(id); desenhar(g, p, (p.variantes?.[0] || p.quadros)[p.anim.idle.quadros[0]], 28, 53) } else if (C.tipo === 'construcao') { const p = predio(id), a = p.anim.n1 || Object.values(p.anim)[0]; desenhar(g, p, p.quadros[a.quadros[0]], 28, 66) } else { const p = magia(id), a = p.anim.idle || Object.values(p.anim)[0]; desenhar(g, p, p.quadros[a.quadros[0]], 28, 52) }
    g.restore()
    g.fillStyle = COR.ameixa; g.fillRect(4, 55, 48, 1)
    g.fillStyle = COR.painel; g.fillRect(5, 57, 13, 13); icone(g, SELO[C.tipo], 6, 58)
  }
  A.cartas.set(id, c)
  return c
}
/** O número de força da carta num nível (o que ela dá), só com dados do config. */
export function forcaDaCarta(id, nivel) {
  const C = A.config.CARTAS[id], i = Math.max(0, Math.min(4, nivel - 1))
  if (C.tipo === 'tropa') return 'x' + C.qtd[i]
  const v = C.valores[i]
  if (C.tipo === 'construcao') return C.efeito === 'curaSeg' ? `+${v}/S` : C.efeito === 'soldados' || C.efeito === 'ouro' ? `+${v}` : C.efeito === 'torre' ? `+${C.valores2[i]}%` : C.efeito === 'pavio' ? String(v) : `${C.efeito === 'reducao' ? '-' : '+'}${v}%`
  return ['piche', 'corneta', 'repeteco', 'finale'].includes(C.efeito) ? v + '%' : String(v)
}
/** Desenha a carta `id` no nível dado com o canto em (x, y). `silhueta`: só o vulto (carta ainda não liberada). */
export function carta(g, id, nivel, x, y, { silhueta = false } = {}) {
  const base = faceBase(id)
  if (silhueta) { const k = 'sil:' + id; if (!A.cartas.has(k)) A.cartas.set(k, Cod.silhueta(base, '#4E3A66')); g.drawImage(A.cartas.get(k), x, y); return }
  g.drawImage(base, x, y)
  const ac = A.atlas?.cartas, pinos = ac?.pinos || [[14, 70], [20, 70], [26, 70], [32, 70], [38, 70]], tf = ac?.texto_forca || [34, 57]
  for (let i = 0; i < 5; i++) icone(g, i < nivel ? 'pin-on' : 'pin-off', x + pinos[i][0], y + pinos[i][1])
  texto(g, forcaDaCarta(id, nivel), x + tf[0], y + tf[1] + 2, { fonte: 'reino', cor: COR.ameixa, alinhar: 'centro' })
}
export function costas(g, x, y) {
  const ac = A.atlas?.cartas, img = ac && A.folhas[ac.folha]
  if (img && ac.costas) g.drawImage(img, ac.costas[0], ac.costas[1], 56, 78, x, y, 56, 78); else { g.fillStyle = COR.ameixa; g.fillRect(x, y, 56, 78); g.fillStyle = COR.painel; g.fillRect(x + 2, y + 2, 52, 74) }
}

// ------------------------------------------------------------------ cenário
/** Geometria (terrenos, portão, castelo, escadas) de 'pc' ou 'celular'. */
export function geometria(tipo) { const c = A.atlas?.cenarios?.[tipo]; return c?.terrenos?.length === 6 ? c : Cod.GEOMETRIA[tipo] }
export function horaDaRodada(r) { const t = A.atlas?.cenarios?.rodadas || Cod.GEOMETRIA.rodadas; return t[((r - 1) % 5) + 1] || 'morning' }
/** Planos, nuvens e luz de uma hora. */
export function cenario(tipo, hora) {
  return guardada(`c:${tipo}:${hora}`, () => {
    const h = A.atlas?.cenarios?.[tipo]?.horas?.[hora], img = h && A.folhas[h.folha]
    if (!img) { marca(`cena:${tipo}:${hora}`, 'codigo'); return Cod.cenarioPorCodigo(tipo, hora) }
    marca(`cena:${tipo}:${hora}`, 'atlas')
    return { planos: h.planos.map((p) => ({ ...p, img })), nuvens: h.nuvens || [], nuvemImg: img, luz: h.luz }
  })
}
export const temAtlas = () => !!A.atlas
export { Cod }
