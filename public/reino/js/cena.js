// Keepmile — A CENA: o reino desenhado no canvas (planos com paralaxe, terrenos, prédios, bonecos em lote, efeitos, números de dano).
// Não conhece regra: recebe o que mostrar. Régua: docs/reino/arte.md (câmera, hora do dia, peso do golpe, limites de partícula/tremida/flash).
import * as Arte from './arte.js'

const MAXU = 320, MAXP = 60, MAXE = 28, MAXN = 8
const ANIMS = ['idle', 'walk', 'attack', 'hit', 'fall']
export const AN = { idle: 0, walk: 1, attack: 2, hit: 3, fall: 4 }

export function criarCena(canvas, CONFIG) {
  const g = canvas.getContext('2d', { alpha: false })
  const C = {
    g, tipo: 'celular', e: 2, VW: 180, VH: 370, ox: 0, oy: 0, geo: null, pts: [], tiers: [],
    menos: false, limite: 40,
    terrenos: Array(6).fill(null), vidas: 3, vidasMax: 3,
    hora: 'morning', horaDe: 'morning', mix: 1, noite: 0,
    cam: { x: 0, alvo: 0, zoom: 1, fx: 0, fy: 0, zoomAte: 0 }, trem: { px: 0, ate: 0, x: 0, y: 0 },
    flashes: [], flashAte: 0, flashCor: '#FFF6E0', tremidaMax: 0, picoParticulas: 0, brancos: [],
    relogio: 0, // ms visuais (animações)
    destaque: null, // { terrenos: Set, vizinhos: Set, forte: n }
    pulo: new Float64Array(7), casteloTreme: 0, dessatura: 0,
    // bonecos (estrutura de vetores: nada de objeto por quadro)
    n: 0, lado: new Uint8Array(MAXU), peca: new Array(MAXU), vari: new Uint8Array(MAXU), x0: new Float32Array(MAXU), v: new Float32Array(MAXU), t0: new Float32Array(MAXU),
    lane: new Float32Array(MAXU), dxe: new Float32Array(MAXU), hp: new Int32Array(MAXU), hpMax: new Int32Array(MAXU), est: new Uint8Array(MAXU), anim: new Uint8Array(MAXU),
    animT: new Float64Array(MAXU), dir: new Int8Array(MAXU), k: new Float32Array(MAXU), barra: new Uint8Array(MAXU), preso: new Float32Array(MAXU), sx: new Float32Array(MAXU), sy: new Float32Array(MAXU), tier: new Uint8Array(MAXU),
    ordem: new Uint16Array(MAXU), tb: 0,
    // partículas, efeitos animados, números
    pn: 0, px: new Float32Array(MAXP), py: new Float32Array(MAXP), pvx: new Float32Array(MAXP), pvy: new Float32Array(MAXP), pvida: new Float32Array(MAXP), pcor: new Uint8Array(MAXP), ptam: new Uint8Array(MAXP),
    ef: Array.from({ length: MAXE }, () => ({ p: null, x: 0, y: 0, t0: 0, flip: false, ate: 0, anim: null })),
    num: Array.from({ length: MAXN }, () => ({ x: 0, y: 0, t0: -1e9, s: '', ouro: false })),
    proj: Array.from({ length: 12 }, () => ({ x0: 0, y0: 0, x1: 0, y1: 0, t0: -1e9, tipo: 0 })),
  }
  const CORES_P = ['#FFF6E0', '#E8C48A', '#FFD248', '#CC3C3E', '#4884E8', '#9248C8', '#7CC950', '#E0489B', '#CECAD8']
  const P = { x: 0, y: 0, tier: 0, sent: 1 }
  let vinheta = null

  // ---------------------------------------------------------------- medidas
  C.ajustar = (vw, vh) => {
    C.tipo = vh > vw ? 'celular' : 'pc'
    C.geo = Arte.geometria(C.tipo)
    const [rw, rh] = C.geo.referencia
    // celular: a tela lógica inteira (180×370). PC: câmera perto — basta caber 400×225; o resto a câmera percorre na luta
    C.e = Math.max(1, Math.floor(C.tipo === 'celular' ? Math.min(vw / rw, vh / rh) : Math.min(vw / 400, vh / 225)))
    C.VW = Math.ceil(vw / C.e); C.VH = Math.ceil(vh / C.e)
    canvas.width = C.VW * C.e; canvas.height = C.VH * C.e
    canvas.style.width = C.VW * C.e + 'px'; canvas.style.height = C.VH * C.e + 'px'
    C.ox = Math.floor((C.VW - (C.tipo === 'celular' ? rw : 500)) / 2)
    C.oy = C.oyBase = C.tipo === 'celular' ? C.VH - rh : C.VH - 270; C.camY = 0
    C.camMin = C.tipo === 'celular' ? 0 : Math.min(0, C.ox + C.geo.portao[0] - 30); C.camMax = C.tipo === 'celular' ? 0 : Math.max(0, C.ox + C.geo.castelo[0] + 50 - C.VW)
    C.limite = (C.tipo === 'celular' ? 40 : 60) >> (C.menos ? 1 : 0)
    caminho(); vinheta = null
  }
  function caminho() {
    const T = C.geo.terrenos, pts = [], esc = C.geo.escadas || []
    const yc = (t) => (t.estrada[0] + t.estrada[1]) / 2, ini = (t) => t.x - t.sentido * t.largura / 2, fim = (t) => t.x + t.sentido * t.largura / 2
    const tiersY = [...new Set(T.map(yc))].sort((a, b) => a - b)
    C.tiers = tiersY
    const tier = (t) => tiersY.indexOf(yc(t))
    pts.push([-60, ini(T[0]) - T[0].sentido * T[0].largura * 0.6, yc(T[0]), tier(T[0]), T[0].sentido])
    for (let k = 0; k < 6; k++) {
      const t = T[k], prox = T[k + 1], sobe = prox && esc.find((s) => s.de === k + 1), subiu = k > 0 && esc.find((s) => s.de === k)
      if (!subiu) pts.push([k * 100, ini(t), yc(t), tier(t), t.sentido])
      if (sobe) {
        const ex = (sobe.x[0] + sobe.x[1]) / 2
        pts.push([k * 100 + 80, ini(t) + t.sentido * t.largura * 0.8, yc(t), tier(t), t.sentido])
        pts.push([k * 100 + 90, ex, yc(t), tier(t), t.sentido])
        pts.push([k * 100 + 110, ex, yc(prox), tier(prox), prox.sentido])
        pts.push([k * 100 + 120, ini(prox) + prox.sentido * prox.largura * 0.2, yc(prox), tier(prox), prox.sentido])
      }
    }
    pts.push([600, fim(T[5]), yc(T[5]), tier(T[5]), T[5].sentido])
    C.pts = pts
    const t0 = T[0]; C.meiaFaixa = (t0.estrada[1] - t0.estrada[0]) / 2 - 2
  }
  /** Posição do motor (centésimos de terreno) + fileira (−1..1) → ponto da tela de arte (sem câmera). Resultado em P. */
  function pos(xe, lane) {
    const pts = C.pts
    let i = 1
    while (i < pts.length - 1 && pts[i][0] < xe) i++
    const a = pts[i - 1], b = pts[i], f = Math.max(-0.5, Math.min(1.2, (xe - a[0]) / (b[0] - a[0])))
    P.x = C.ox + a[1] + (b[1] - a[1]) * f
    P.y = C.oy + a[2] + (b[2] - a[2]) * f + lane * C.meiaFaixa
    P.tier = f < 0.5 ? a[3] : b[3]
    P.sent = a[1] === b[1] ? b[4] : (b[1] > a[1] ? 1 : -1)
    return P
  }
  C.pos = (xe, lane = 0) => { const p = pos(xe, lane); return { x: p.x - C.cam.x, y: p.y, tier: p.tier } }
  /** Retângulo (em px de arte da tela) de um terreno 1..6, para o toque. */
  C.areaDoTerreno = (k) => {
    const t = C.geo.terrenos[k - 1]; let w = t.largura
    for (const o of C.geo.terrenos) if (o !== t && o.base_predio === t.base_predio) w = Math.min(w, Math.abs(o.x - t.x)) // vizinhos do mesmo patamar não se sobrepõem
    return { x: C.ox + t.x - w / 2 - C.cam.x, y: C.oyBase + t.base_predio - 34, w, h: Math.min(t.estrada[1] - t.base_predio + 36, C.VH - 80 - (C.oyBase + t.base_predio - 34)) }
  }
  C.centroDoTerreno = (k) => { const t = C.geo.terrenos[k - 1]; return { x: C.ox + t.x - C.cam.x, y: C.oy + (t.estrada[0] + t.estrada[1]) / 2, base: C.oy + t.base_predio } }

  // ---------------------------------------------------------------- bonecos
  C.limparBonecos = () => { C.n = 0; ordenar = true }
  /** Fileira e desvio de um soldado j de n no terreno (a mesma conta parado e na luta). */
  C.formacao = (j, n) => {
    const R = Math.min(n, C.tipo === 'pc' ? 4 : 3), row = j % R, col = Math.floor(j / R), cols = Math.ceil(n / R), passo = Math.min(24, 78 / cols)
    return { lane: R === 1 ? 0 : ((row / (R - 1)) * 2 - 1) * 0.9, dxe: (col - (cols - 1) / 2) * passo + (row % 2 ? passo * 0.35 : -passo * 0.15) }
  }
  C.nascer = (lado, tipo, x, hp, lane, dxe, grande = 1) => {
    const i = C.n; if (i >= MAXU) return -1
    const p = Arte.unidade(tipo)
    C.lado[i] = lado; C.peca[i] = p; C.vari[i] = p.variantes ? (i * 7 + 3) % p.variantes.length : 0
    C.x0[i] = x; C.v[i] = 0; C.t0[i] = C.tb; C.lane[i] = lane; C.dxe[i] = dxe; C.hp[i] = hp; C.hpMax[i] = hp; C.est[i] = 1
    C.anim[i] = 0; C.animT[i] = C.relogio - (i * 137) % 900; C.dir[i] = lado ? 1 : -1; C.k[i] = grande; C.barra[i] = p.barra ? 1 : 0; C.preso[i] = -1
    C.n = i + 1; ordenar = true
    return i
  }
  let ordenar = false
  C.tocarAnim = (i, a) => { if (C.est[i] !== 1 && a !== AN.fall) return; C.anim[i] = a; C.animT[i] = C.relogio }
  C.xDe = (i) => C.x0[i] + C.v[i] * Math.max(0, C.tb - C.t0[i])
  C.telaDe = (i) => ({ x: C.sx[i] - C.cam.x, y: C.sy[i] })

  // ---------------------------------------------------------------- efeitos
  const vivos = () => { let n = 0; for (let i = 0; i < MAXP; i++) if (C.pvida[i] > 0) n++; for (const e of C.ef) if (e.ate > C.relogio) n++; return n }
  C.particula = (x, y, vx, vy, vida, cor, tam = 1) => {
    if (vivos() >= C.limite) return
    for (let i = 0; i < MAXP; i++) if (C.pvida[i] <= 0) { C.px[i] = x; C.py[i] = y; C.pvx[i] = vx; C.pvy[i] = vy; C.pvida[i] = vida; C.pcor[i] = cor; C.ptam[i] = tam; return }
  }
  C.estouro = (x, y, n, cor, forca = 40) => { for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + i, f = forca * (0.5 + ((i * 37) % 10) / 20); C.particula(x, y, Math.cos(a) * f, Math.sin(a) * f - forca * 0.6, 380 + (i % 4) * 60, cor, 1 + (i & 1)) } }
  /** Efeito animado do atlas (dust, spark, slash, explosion, heal, level-ring, confetti…). Sem a peça: partículas simples. */
  C.efeito = (nome, x, y, flip = false, anim = 'play') => {
    const p = Arte.peca(nome)
    if (!p) { C.estouro(x, y - 4, nome === 'explosion' ? 10 : nome === 'confetti' ? 8 : 4, nome === 'explosion' ? 2 : nome === 'heal' ? 6 : 1, nome === 'explosion' ? 70 : 36); return }
    if (vivos() >= C.limite) return
    const a = p.anim[anim] || p.anim.play
    for (const e of C.ef) if (e.ate <= C.relogio) { e.p = p; e.x = x; e.y = y; e.t0 = C.relogio; e.flip = flip; e.anim = a; e.ate = C.relogio + Arte.duracao(a); return }
  }
  C.numero = (x, y, s, ouro = false) => {
    let alvo = C.num[0]
    for (const n of C.num) if (n.t0 < alvo.t0) alvo = n
    if (C.relogio - alvo.t0 < 500 && !ouro) return // 8 ao mesmo tempo, no máximo
    alvo.x = x; alvo.y = y; alvo.t0 = C.relogio; alvo.s = s; alvo.ouro = ouro
  }
  C.projetil = (x0, y0, x1, y1, tipo = 0) => { let a = C.proj[0]; for (const p of C.proj) if (p.t0 < a.t0) a = p; a.x0 = x0; a.y0 = y0; a.x1 = x1; a.y1 = y1; a.t0 = C.relogio; a.tipo = tipo }
  /** Tremida: no máximo 6 px e 120 ms. Com "Reduced motion" não treme. */
  C.tremer = (px, ms = 100) => { if (C.menos) return; C.trem.px = Math.min(6, px); C.trem.ate = performance.now() + Math.min(120, ms) }
  /** Clarão: no máximo 3 por segundo, nunca a tela toda branca. Com "Reduced motion" não pisca. Devolve se piscou. */
  C.flash = (cor = '#FFF6E0', ms = 120) => {
    if (C.menos) return false
    const agora = performance.now()
    while (C.flashes.length && agora - C.flashes[0] > 5000) C.flashes.shift()
    if (C.flashes.filter((t) => agora - t < 1000).length >= 3) return false
    C.flashes.push(agora); C.flashAte = agora + ms; C.flashCor = cor; C.flashMs = ms
    return true
  }
  /** O quadro branco de "apanhou" conta como clarão pequeno: também no máximo 3 por segundo. */
  C.podeBranco = () => {
    if (C.menos) return false
    const agora = performance.now()
    while (C.brancos.length && agora - C.brancos[0] > 1000) C.brancos.shift()
    if (C.brancos.length >= 3) return false
    C.brancos.push(agora); return true
  }
  C.zoom = (x, y, ms) => { if (C.menos) return; C.cam.zoom = (C.e + 1) / C.e; C.cam.fx = x; C.cam.fy = y; C.cam.zoomAte = performance.now() + ms }
  C.mudarHora = (h, jaJa = false) => { if (h === C.hora) return; C.horaDe = C.hora; C.hora = h; C.mix = jaJa ? 1 : 0 }

  // ---------------------------------------------------------------- desenho
  function plano(p, alfa) {
    const [qx, qy, qw, qh] = p.quadro
    let x = Math.round(C.ox + p.x - C.cam.x * p.paralaxe + C.trem.x * Math.min(1, p.paralaxe)), y = C.oy + p.y + Math.round(C.trem.y * Math.min(1, p.paralaxe))
    if (p.nome === 'sky') { x = Math.round(C.ox + p.x); y = C.oy }
    g.globalAlpha = alfa
    if (p.repete_x) { x = ((x % qw) + qw) % qw - qw; for (; x < C.VW; x += qw) g.drawImage(p.img, qx, qy, qw, qh, x, y, qw, qh) } else {
      g.drawImage(p.img, qx, qy, qw, qh, x, y, qw, qh)
      if (x > 0) g.drawImage(p.img, qx, qy, 1, qh, 0, y, x, qh)
      if (x + qw < C.VW) g.drawImage(p.img, qx + qw - 1, qy, 1, qh, x + qw, y, C.VW - x - qw, qh)
    }
    if (p.nome === 'sky' && y > 0) { g.fillStyle = corDoTopo(p); g.fillRect(0, 0, C.VW, y) }
    if (p.nome === 'ground' && y + qh < C.VH) for (let yy = y + qh; yy < C.VH; yy += 40) for (let xx = ((x % qw) + qw) % qw - qw; xx < C.VW; xx += qw) g.drawImage(p.img, qx, qy + qh - 40, qw, 40, xx, yy, qw, 40)
  }
  /** Cor mais comum da 1ª linha do céu (sem pegar estrela), para completar o céu acima do plano. */
  function corDoTopo(p) {
    if (p.topo) return p.topo
    const d = p.img.getContext('2d').getImageData(p.quadro[0], p.quadro[1], p.quadro[2], 1).data, cont = {}
    let melhor = '#000', n = 0
    for (let i = 0; i < d.length; i += 4) { const k = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`; cont[k] = (cont[k] || 0) + 1; if (cont[k] > n) { n = cont[k]; melhor = k } }
    return (p.topo = melhor)
  }
  function nuvens(cen, alfa) {
    if (!cen.nuvens.length) return
    g.globalAlpha = alfa
    for (let i = 0; i < 4; i++) {
      const q = cen.nuvens[i % cen.nuvens.length], vel = C.menos ? 0 : (3 + i) / 1000
      const x = ((i * 173 + C.relogioReal * vel) % (C.VW + 80)) - 60, y = C.oy + 8 + ((i * 53) % 34) + (C.tipo === 'celular' ? 18 : 22)
      g.drawImage(cen.nuvemImg, q[0], q[1], q[2], q[3], Math.round(x), y, q[2], q[3])
    }
  }
  function fazerVinheta() {
    const c = Arte.Cod.tela(C.VW, C.VH), vg = c.getContext('2d'), d = vg.createImageData(C.VW, C.VH), a = d.data
    for (let y = 0; y < C.VH; y++) for (let x = 0; x < C.VW; x++) {
      const dx = (x / C.VW - 0.5) * 2, dy = (y / C.VH - 0.5) * 2, r = Math.sqrt(dx * dx + dy * dy) / 1.414
      let n = Math.floor((r - 0.55) * 14); if (n < 0) continue
      const meio = n & 1; n = (n >> 1) + (meio && ((x + y) & 1) ? 1 : 0) // degraus pontilhados, nunca degradê liso
      const i = (y * C.VW + x) * 4; a[i] = 43; a[i + 1] = 30; a[i + 2] = 58; a[i + 3] = Math.min(255, n * 64)
    }
    vg.putImageData(d, 0, 0); return c
  }
  const quadroDaPeca = (p, animNome, ms, vari = 0) => { const a = p.anim[animNome] || Object.values(p.anim)[0]; return (p.variantes ? p.variantes[vari] : p.quadros)[Arte.quadroDe(a, ms)] }

  function moveis(tier, tinta, t) {
    const T = C.geo.terrenos, cx = Math.round(C.cam.x - C.trem.x), ty = Math.round(C.trem.y)
    const yTier = C.tiers[tier]
    if (tier === C.tiers.length - 1) { const p = Arte.peca('gate'); if (p) Arte.desenhar(g, p, p.quadros[0], C.ox + C.geo.portao[0] - cx, C.oy + C.geo.portao[1] + ty, false, tinta) }
    if (tier === 0) {
      const p = Arte.peca('castle')
      if (p) { const est = p.estados?.[Math.max(1, Math.min(3, C.vidas))] || 'whole', q = p.quadros[p.anim[est].quadros[0]]; const tr = C.casteloTreme > t && !C.menos ? Math.round(Math.sin(t / 18) * 2) : 0; Arte.desenhar(g, p, q, C.ox + C.geo.castelo[0] - cx + tr, C.oy + C.geo.castelo[1] + ty, false, tinta) }
    }
    for (let k = 0; k < 6; k++) {
      const tr = T[k]; if ((tr.estrada[0] + tr.estrada[1]) / 2 !== yTier) continue
      const X = Math.round(C.ox + tr.x - cx), Y = C.oy + tr.base_predio + ty, t0 = C.terrenos[k], pul = C.pulo[k + 1] > t ? -Math.round(4 * Math.sin(((C.pulo[k + 1] - t) / 300) * Math.PI)) : 0
      if (!t0) { const p = Arte.peca('plot-empty'); if (p) Arte.desenhar(g, p, quadroDaPeca(p, 'plot' + (k + 1), C.menos ? 0 : t), X, Y + 3, false, tinta); continue }
      const c = CONFIG.CARTAS[t0.carta], fam = CONFIG.FAMILIAS[c.familia].nome
      const fl = Arte.peca('plot-flag'); if (fl && fl.anim[fam]) Arte.desenhar(g, fl, quadroDaPeca(fl, fam, C.menos ? 0 : t + k * 90), X - (tr.largura >> 1) + 4, Y + 2, false, tinta)
      if (c.tipo === 'construcao') { const p = Arte.predio(t0.carta), an = p.niveis ? p.niveis[t0.nivel] : Object.keys(p.anim)[0]; Arte.desenhar(g, p, quadroDaPeca(p, an, C.menos ? 0 : t), X + 2, Y + 2 + pul, false, tinta) }
      if (c.tipo === 'magia') { const p = Arte.magia(t0.carta), est = C.magiaAnim?.[k + 1]; Arte.desenhar(g, p, quadroDaPeca(p, est?.nome || 'idle', est ? t - est.t0 : (C.menos ? 0 : t)), X + 2, C.oy + tr.estrada[0] + 9 + ty + pul, false, tinta) }
      for (let i = 0; i < 5; i++) Arte.icone(g, i < t0.nivel ? 'pin-on' : 'pin-off', X - 14 + i * 6, Y - 2)
    }
  }
  function destaques(t) {
    const d = C.destaque; if (!d) return
    const pisca = C.menos ? 1 : 0.55 + 0.45 * Math.sin(t / 160)
    for (let k = 1; k <= 6; k++) {
      const a = C.areaDoTerreno(k), viz = d.vizinhos?.has(k), alvo = d.terrenos?.has(k)
      if (!alvo && !viz) continue
      const x = Math.round(a.x) + 1, y = Math.round(a.y), w = a.w - 2, h = a.h
      if (alvo) {
        g.globalAlpha = k === d.forte ? 1 : 0.35 + 0.4 * pisca; g.fillStyle = '#FFD248'
        for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { g.fillRect(sx > 0 ? cx : cx - 7, sy > 0 ? cy : cy - 2, 7, 2); g.fillRect(sx > 0 ? cx : cx - 2, sy > 0 ? cy : cy - 7, 2, 7) }
        g.globalAlpha = 0.10 + 0.08 * pisca; g.fillRect(x, y, w, h); g.globalAlpha = 1
        if (k === d.forte || d.sobe?.has(k)) { const b = C.menos ? 0 : Math.round(Math.abs(Math.sin(t / 220)) * 5); g.save(); g.translate(x + (w >> 1), y - 6 - b); if (!d.sobe?.has(k)) g.scale(1, -1); Arte.icone(g, 'up', -5, -5); g.restore() }
      }
      if (viz) { const b = C.menos ? 0 : Math.round(Math.abs(Math.sin(t / 200 + k)) * 3); g.globalAlpha = 1; Arte.icone(g, 'up', x + (w >> 1) - 5, y + 6 - b); Arte.texto(g, '+', x + (w >> 1) + 7, y + 8 - b, { fonte: 'reino-ouro' }) }
    }
    g.globalAlpha = 1
  }

  function bonecos(tier, tinta) {
    const sh = Arte.peca('shadow'), cen = Arte.cenario(C.tipo, C.hora), cx = Math.round(C.cam.x - C.trem.x), ty = Math.round(C.trem.y)
    g.globalAlpha = cen.luz.sombra.alfa
    for (let o = 0; o < C.n; o++) {
      const i = C.ordem[o]; if (C.tier[i] !== tier || C.est[i] === 0 || C.est[i] >= 3) continue
      const X = Math.round(C.sx[i]) - cx + cen.luz.sombra.dx, Y = Math.round(C.sy[i]) + ty
      if (sh) { const q = sh.quadros[C.peca[i].w > 100 ? 3 : C.peca[i].w > 60 ? 1 : 0]; g.drawImage(sh.img, q[0], q[1], q[2], q[3], X - (q[2] >> 1), Y - 3, q[2], q[3]) } else { g.fillStyle = '#2B1E3A'; g.fillRect(X - 7, Y - 1, 14, 2); g.fillRect(X - 5, Y - 2, 10, 4) }
    }
    g.globalAlpha = 1
    for (let o = 0; o < C.n; o++) {
      const i = C.ordem[o]; if (C.tier[i] !== tier || C.est[i] === 0 || C.est[i] >= 3) continue
      const p = C.peca[i]
      let an = C.anim[i], ms = C.relogio - C.animT[i], a = p.anim[ANIMS[an]]
      if (!a.loop && ms >= Arte.duracao(a)) {
        if (an === AN.fall) { C.est[i] = 4; continue }
        an = C.anim[i] = C.v[i] !== 0 ? AN.walk : AN.idle; a = p.anim[ANIMS[an]]; ms = C.relogio - C.animT[i]
      } else if (an <= AN.walk) { const quer = C.v[i] !== 0 ? AN.walk : AN.idle; if (quer !== an) { an = C.anim[i] = quer; a = p.anim[ANIMS[an]] } }
      if (C.menos && an === AN.idle) ms = 0
      const qs = p.variantes ? p.variantes[C.vari[i]] : p.quadros
      const flip = (C.dir[i] * C.sentido[i] < 0) !== p.olhaEsquerda
      const X = Math.round(C.sx[i]) - cx, Y = Math.round(C.sy[i]) + ty
      Arte.desenhar(g, p, qs[Arte.quadroDe(a, ms)], X, Y, flip, tinta, C.k[i])
      if (C.barra[i] && C.hp[i] < C.hpMax[i]) { const w = p.w > 100 ? 40 : 24, yb = Y - p.ay - 1 + (p.w > 100 ? 14 : 8); g.fillStyle = '#2B1E3A'; g.fillRect(X - (w >> 1) - 1, yb - 1, w + 2, 5); g.fillStyle = '#CC3C3E'; g.fillRect(X - (w >> 1), yb, Math.max(0, Math.round(w * C.hp[i] / C.hpMax[i])), 3) }
      if (C.preso[i] > C.tb) { g.fillStyle = '#286840'; g.fillRect(X - 6, Y - 4, 12, 2); g.fillStyle = '#469C48'; g.fillRect(X - 4, Y - 7, 2, 4); g.fillRect(X + 2, Y - 8, 2, 5) }
    }
  }
  C.sentido = new Int8Array(MAXU)

  function atualizarBonecos() {
    for (let i = 0; i < C.n; i++) {
      if (C.est[i] === 0 || C.est[i] >= 3) continue
      const p = pos(C.xDe(i) + C.dxe[i], C.lane[i])
      C.sx[i] = p.x; C.sy[i] = p.y; C.tier[i] = p.tier; C.sentido[i] = p.sent
    }
    if (ordenar) for (let i = 0; i < C.n; i++) C.ordem[i] = i
    if (ordenar || (C.quadro & 7) === 0) { // inserção: quase sempre já está em ordem
      for (let a = 1; a < C.n; a++) { const v = C.ordem[a], y = C.sy[v]; let b = a - 1; while (b >= 0 && C.sy[C.ordem[b]] > y) { C.ordem[b + 1] = C.ordem[b]; b-- } C.ordem[b + 1] = v }
      ordenar = false
    }
  }
  C.quadro = 0; C.relogioReal = 0

  /** Um quadro do mundo. `dtAnim` = ms de animação que passaram (0 = parado). */
  C.desenhar = (agora, dtReal, dtAnim) => {
    C.quadro++; C.relogio += dtAnim; C.relogioReal += C.menos ? 0 : dtReal
    const t = C.relogio
    // câmera e tremida
    if (C.trem.ate > agora && !C.menos) { const k = C.trem.px; C.trem.x = Math.round(Math.sin(agora / 11) * k); C.trem.y = Math.round(Math.cos(agora / 13) * k * 0.6); C.tremidaMax = Math.max(C.tremidaMax, Math.abs(C.trem.x), Math.abs(C.trem.y)) } else { C.trem.x = 0; C.trem.y = 0 }
    if (C.menos) C.cam.x = 0; else { const d = C.cam.alvo - C.cam.x, passo = 24 * dtReal / 1000; C.cam.x += Math.abs(d) <= passo ? d : Math.sign(d) * passo }
    if (C.cam.zoom !== 1 && agora > C.cam.zoomAte) C.cam.zoom = 1
    { // na luta do PC o mundo desce um pouco: mais céu, menos grama vazia onde ficava a mão
      const pc = C.tipo === 'pc', alvoY = pc && C.fimDeJogo ? -36 : pc && C.emLuta && !C.menos ? Math.min(34, Math.max(0, C.VH - 215 - C.oyBase)) : 0, d = alvoY - C.camY, passo = C.menos ? 1e9 : 70 * dtReal / 1000
      C.camY += Math.abs(d) <= passo ? d : Math.sign(d) * passo; C.oy = C.oyBase + Math.round(C.camY)
    }
    if (C.mix < 1) C.mix = Math.min(1, C.mix + dtReal / 2000)
    atualizarBonecos()
    const cen = Arte.cenario(C.tipo, C.hora), de = C.mix < 1 ? Arte.cenario(C.tipo, C.horaDe) : null
    const escuro = (c) => parseInt(c.luz.ambiente.slice(1, 3), 16) + parseInt(c.luz.ambiente.slice(3, 5), 16) < 400
    const tinta = escuro(C.mix >= 0.5 ? cen : de) ? (C.mix >= 0.5 ? cen : de).luz.ambiente : null
    g.setTransform(C.e, 0, 0, C.e, 0, 0); g.imageSmoothingEnabled = false
    if (C.cam.zoom !== 1) { const z = C.cam.zoom; g.translate(C.cam.fx, C.cam.fy); g.scale(z, z); g.translate(-C.cam.fx, -C.cam.fy) }
    const frente = []
    const camadas = (c, alfa) => { for (const p of c.planos) { if (p.nome === 'front') { frente.push(p, alfa); continue } plano(p, alfa); if (p.nome === 'sky') nuvens(c, alfa) } }
    if (de) camadas(de, 1)
    camadas(cen, de ? C.mix : 1)
    g.globalAlpha = 1
    for (let tier = 0; tier < C.tiers.length; tier++) { moveis(tier, tinta, t); if (tier === C.tiers.length - 1 && C.antesDosBonecos) C.antesDosBonecos(g, t); bonecos(tier, tinta) }
    destaques(agora)
    // projéteis (só desenho: o tiro já acertou)
    for (const p of C.proj) {
      const f = (t - p.t0) / 130; if (f < 0 || f > 1) continue
      const x = p.x0 + (p.x1 - p.x0) * f - Math.round(C.cam.x), y = p.y0 + (p.y1 - p.y0) * f - Math.sin(f * 3.14) * 10
      const ar = Arte.peca(p.tipo === 1 ? 'spud' : 'arrow')
      if (ar) Arte.desenhar(g, ar, ar.quadros[0], Math.round(x), Math.round(y), p.x1 < p.x0); else { g.fillStyle = '#FFF6E0'; g.fillRect(Math.round(x) - 3, Math.round(y), 6, 1) }
    }
    // efeitos animados e partículas
    let np = 0
    for (const e of C.ef) { if (e.ate <= t) continue; np++; Arte.desenhar(g, e.p, e.p.quadros[Arte.quadroDe(e.anim, t - e.t0)], Math.round(e.x - C.cam.x + C.trem.x), Math.round(e.y + C.trem.y), e.flip) }
    const s = dtAnim / 1000
    for (let i = 0; i < MAXP; i++) {
      if (C.pvida[i] <= 0) continue
      np++; C.pvida[i] -= dtAnim; C.px[i] += C.pvx[i] * s; C.py[i] += C.pvy[i] * s; C.pvy[i] += 160 * s
      g.fillStyle = CORES_P[C.pcor[i]]; g.fillRect(Math.round(C.px[i] - C.cam.x), Math.round(C.py[i]), C.ptam[i], C.ptam[i])
    }
    if (np > C.picoParticulas) C.picoParticulas = np
    for (let i = 0; i < frente.length; i += 2) plano(frente[i], frente[i + 1])
    g.globalAlpha = 1
    // números de dano: creme com contorno; forte em ouro com "!"; sobem 10 px e somem em 500 ms
    for (const n of C.num) {
      const f = (t - n.t0) / 500; if (f < 0 || f >= 1) continue
      if (f > 0.75 && ((C.quadro >> 1) & 1) && !C.menos) continue
      Arte.texto(g, n.s, n.x - C.cam.x, n.y - Math.round(f * 10), { fonte: n.ouro ? 'reino-ouro' : 'reino-contorno', alinhar: 'centro' })
    }
    if (C.depoisDoMundo) C.depoisDoMundo(g, t)
    g.setTransform(C.e, 0, 0, C.e, 0, 0)
    if (C.noite > 0) { g.globalAlpha = C.noite * 0.38; g.fillStyle = '#141432'; g.fillRect(0, 0, C.VW, C.VH); g.globalAlpha = 1 }
    if (!vinheta) vinheta = fazerVinheta()
    g.globalAlpha = Math.min(1, (de ? de.luz.vinheta * (1 - C.mix) + cen.luz.vinheta * C.mix : cen.luz.vinheta) * 2.6 + (C.emLuta ? 0.12 : 0)); g.drawImage(vinheta, 0, 0); g.globalAlpha = 1
    if (C.flashAte > agora) { g.globalAlpha = 0.32 * ((C.flashAte - agora) / C.flashMs); g.fillStyle = C.flashCor; g.fillRect(0, 0, C.VW, C.VH); g.globalAlpha = 1 }
  }
  return C
}
