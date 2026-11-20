// Keepmile — A INTERFACE em pixel, desenhada no mesmo canvas da cena (HUD, mão de 3 cartas, espólios, resumo da luta, avisos, fim),
// com um botão de verdade (transparente, com foco de teclado) por cima de cada coisa tocável. Só mostra o modelo `M` que o app monta
// a partir de `visao`/`opcoes`/eventos do motor; quem manda comando é o app. Nenhum número de regra nasce aqui.
import * as Arte from './arte.js'
import { T } from './textos.js'

export function criarInterface(C, CONFIG, camada, aoTocar) {
  const g = C.g, COR = Arte.COR
  const M = {
    fase: 'carta', vidas: 3, vidasMax: 3, ouro: 0, rodada: 1, proximoChefe: null, mao: [], sel: -1, cartaPosta: false, maoT0: 0, primeira: false,
    sortear: { custo: 0, pode: false }, consertar: { custo: 0, pode: false, visivel: false, destaque: false }, armado: null, trocar: 0,
    espolios: [], espolioPode: [], espolioDesc: [], info: null, infoSel: null, forca: null, vel: 1, mudo: false, aviso: null, vitoria: null, derrota: null, chefe: null, fim: null, arrasto: null,
    apertado: null, selo: null, brinde: null, hordaN: 0, hordaChefe: null, pulsaLutar: false, chances: [], reliquias: [], resumo: null, familias: [],
  }
  const UI = { M, L: {}, botoes: [], desenhou: new Set() }
  const el = new Map()
  const viu = (t) => UI.desenhou.add(t)

  // ---------------------------------------------------------------- medidas (px de arte da tela)
  function medir() {
    const cel = C.tipo === 'celular', VW = C.VW, VH = C.VH, bs = C.e === 1 ? 2 : 1, L = { cel, bs }, hmin = 44 / C.css
    const bw = cel ? 36 : 60
    const bq = Math.max(22 * bs, Math.ceil(hmin)) // botão do HUD: 44 px de toque mesmo quando a tela encolhe o desenho
    L.lutar = { x: VW - (bw + 2) * bs, y: 2 * bs, w: bw * bs, h: 26 * bs }
    L.som = { x: L.lutar.x - bq - 2 * bs, y: 2 * bs, w: bq, h: 26 * bs }
    L.menu = { x: L.som.x - bq - 2 * bs, y: 2 * bs, w: bq, h: 26 * bs }
    // toque nas vidas e nos pinos do chefe (explicam em 1 linha)
    L.vidas = { x: 0, y: 0, w: Math.max(44 * bs, hmin), h: Math.max(15 * bs, hmin) }
    L.pinos = { x: 0, y: L.vidas.h, w: 48 * bs, h: Math.max(14 * bs, hmin) }
    const vao = cel ? 0 : 4, larg = 56 * 3 + vao * 2, x0 = Math.floor((VW - larg) / 2), yc = cel ? VH - 78 : VH - 80
    L.cartas = [0, 1, 2].map((i) => ({ x: x0 + i * (56 + vao), y: yc, w: 56, h: 78 }))
    L.mesa = cel ? { x: 0, y: VH - 88, w: VW, h: 88 } : { x: x0 - 6, y: yc - 6, w: larg + 12, h: 86 }
    if (cel) { const y = Math.max(44 * bs, Math.ceil(L.pinos.y + L.pinos.h)); L.sortear = { x: 3 * bs, y, w: 34 * bs, h: 26 * bs }; L.consertar = { x: 40 * bs, y, w: 34 * bs, h: 26 * bs } } else { L.sortear = { x: x0 - 42 * bs, y: VH - 2 - 28 * bs, w: 34 * bs, h: 26 * bs }; L.consertar = { x: x0 - 80 * bs, y: VH - 2 - 28 * bs, w: 34 * bs, h: 26 * bs } }
    // chances do sorteio: uma linha junto do botão de sortear
    L.odds = cel ? { x: 3, y: L.sortear.y + 28 * bs + 1 } : { x: 6, y: L.sortear.y - 9 }
    L.faixa = cel ? { x: 0, y: VH - 88, w: VW, h: 0 } : { x: 6, y: L.odds.y - 50, w: x0 - 14, h: 48 }
    L.lutar2 = cel ? { x: Math.floor(VW / 2) - 48, y: VH - 34, w: 96, h: 26 } : { x: Math.floor(VW / 2) - 48, y: VH - 44, w: 96, h: 26 }
    L.premios = cel ? { x: Math.floor(VW / 2) - 78, y: VH - 84, w: 156, h: 46 } : { x: VW - 124, y: VH - 66, w: 120, h: 60 }
    L.ganhe = cel ? { x: 0, y: VH - 78 - hmin, w: VW, h: hmin } : L.premios
    L.resumo = cel ? L.mesa : { x: 4, y: VH - 66, w: VW - 132, h: 60 }
    // escolha do espólio: 3 cartões no meio (PC: mais afastados, com o texto embaixo de cada um)
    if (cel) { const ey = Math.floor(VH * 0.36), ex = Math.floor((VW - (56 * 3 + 8)) / 2); L.espolio = [0, 1, 2].map((i) => ({ x: ex + i * 60, y: ey, w: 56, h: 78 })); L.passo = 60 } else {
      const passo = Math.min(130, Math.floor((VW - 8) / 3)), ey = Math.max(58, Math.floor(VH * 0.3) - 6); L.passo = passo
      L.espolio = [0, 1, 2].map((i) => ({ x: Math.floor(VW / 2) + (i - 1) * passo - 28, y: ey, w: 56, h: 78 }))
    }
    // fim de partida: placa embaixo, tela cheia
    if (cel) { L.fimPainel = { x: 0, y: VH - 100, w: VW, h: 100 }; L.fimBotoes = [{ x: 4, y: VH - 29, w: VW - 72, h: 26 }, { x: VW - 64, y: VH - 29, w: 60, h: 26 }] } else {
      const pw = Math.min(VW - 8, 420), px = (VW - pw) >> 1
      L.fimPainel = { x: px, y: VH - 112, w: pw, h: 110 }; L.fimBotoes = [{ x: px + 118, y: VH - 32, w: 150, h: 26 }, { x: px + 276, y: VH - 32, w: Math.min(80, pw - 284), h: 26 }]
    }
    UI.L = L
    return L
  }
  function hordaRet() {
    const p = C.pos(-34, -1), w = Math.max(30, 44 / C.css), a1 = C.areaDoTerreno(1)
    let x = Math.max(0, Math.round(p.x) - 20); if (x + w > a1.x) x = Math.max(0, a1.x - w)
    let y = Math.round(p.y) - 50, h = 50
    const hud = UI.L.pinos.y + UI.L.pinos.h; if (y < hud) { h -= Math.ceil(hud) - y; y = Math.ceil(hud) }
    for (let k = 2; k <= 6; k++) { const a = C.areaDoTerreno(k); if (x < a.x + a.w && x + w > a.x && y < a.y + a.h && y + h > a.y) { const topo = Math.ceil(a.y + a.h); h -= topo - y; y = topo } } // nunca por cima do terreno de cima
    return { x, y, w, h }
  }

  // ---------------------------------------------------------------- botões de verdade por cima do desenho
  function lista() {
    const L = UI.L, b = [], f = M.fase
    const add = (id, r, rotulo, dados = {}, extra = {}) => b.push({ id, r, rotulo, dados, ...extra })
    if (f === 'fim') { add('denovo', L.fimBotoes[0], T.deNovo); add('postar', L.fimBotoes[1], T.postar); add('menu', L.menu, T.aria.menu); return b }
    if (f === 'chefe' || f === 'derrota') { add('seguir', { x: 0, y: 0, w: C.VW, h: C.VH }, T.aria.seguir); return b }
    add('menu', L.menu, T.aria.menu); add('som', L.som, T.aria.som)
    if (f === 'luta') { add('vel', L.lutar, T.aria.vel(M.vel)); return b }
    if (f === 'vitoria') { if (M.vitoria?.pronto) M.espolios.forEach((e, i) => add('espolio' + i, L.espolio[i], T.aria.espolio(nomeEspolio(e)), { espolio: i }, { desliga: !M.espolioPode[i] })); return b }
    for (let k = 1; k <= 6; k++) { const a = C.areaDoTerreno(k); add('terreno' + k, { x: Math.max(0, a.x), y: a.y, w: Math.min(a.w, C.VW - Math.max(0, a.x)), h: a.h }, T.aria.terreno(k), { terreno: k }) }
    if (f === 'terreno') { add('voltar', L.lutar2, T.voltar); return b }
    add('lutar', L.lutar, T.aria.lutar)
    if (!M.cartaPosta) {
      M.mao.forEach((c, i) => add('carta' + i, L.cartas[i], T.aria.carta(CONFIG.CARTAS[c.carta].nome), { carta: c.carta, indice: i }, { arrasta: true }))
      add('sortear', L.sortear, T.aria.sortear(M.sortear.custo), { custo: M.sortear.custo }, { desliga: !M.sortear.pode })
    } else add('lutar2', L.lutar2, T.aria.lutar)
    if (M.consertar.visivel) add('consertar', L.consertar, T.aria.consertar(M.consertar.custo), { custo: M.consertar.custo }, { desliga: !M.consertar.pode })
    // um toque no item explica em 1 linha: vidas, pinos do chefe, a horda no portão e a linha "WIN:"
    add('dica-vidas', L.vidas, T.aria.vidas); add('dica-pinos', L.pinos, T.aria.pinos)
    if (M.hordaN) { const r = hordaRet(); if (r.h >= 44 / C.css - 0.01) add('horda', r, T.aria.horda) }
    if (M.espolios.length) add('dica-ganhe', M.cartaPosta ? L.premios : L.ganhe, T.aria.ganhe)
    return b
  }
  /** Refaz a lista de botões (chamar quando o modelo muda; não a cada quadro). */
  UI.mudou = () => {
    medir()
    const b = UI.botoes = lista(), e = C.css, vistos = new Set()
    for (const x of b) {
      vistos.add(x.id)
      let d = el.get(x.id)
      if (!d) {
        d = document.createElement('button'); d.type = 'button'; d.className = 'km-toque'; d.id = 'bt-' + x.id; el.set(x.id, d)
        d.addEventListener('click', (ev) => { if (d.dataset.arrastou === '1') { d.dataset.arrastou = ''; return } aoTocar(x.id, JSON.parse(d.dataset.dados || '{}'), ev) })
        d.addEventListener('pointerdown', (ev) => { M.apertado = x.id; aoTocar('aperta:' + x.id, JSON.parse(d.dataset.dados || '{}'), ev) })
        d.addEventListener('pointerenter', () => aoTocar('entra:' + x.id, JSON.parse(d.dataset.dados || '{}')))
        d.addEventListener('pointerleave', () => { if (M.apertado === x.id) M.apertado = null; aoTocar('sai:' + x.id, {}) })
        d.addEventListener('focus', () => aoTocar('entra:' + x.id, JSON.parse(d.dataset.dados || '{}')))
      }
      // toque de 44 px no mínimo, sem sair da tela
      let w = x.r.w * e, h = x.r.h * e, px = x.r.x * e, py = x.r.y * e
      if (w < 44) { px -= (44 - w) / 2; w = 44 } if (h < 44) { py -= (44 - h) / 2; h = 44 }
      px = Math.max(0, Math.min(px, innerWidth - w)); py = Math.max(0, Math.min(py, innerHeight - h))
      d.style.cssText = `left:${px}px;top:${py}px;width:${w}px;height:${h}px`
      d.setAttribute('aria-label', x.rotulo); d.dataset.dados = JSON.stringify(x.dados)
      for (const [k, v] of Object.entries(x.dados)) d.dataset[k] = v
      d.disabled = !!x.desliga; d.classList.toggle('km-arrasta', !!x.arrasta)
      if (d.parentNode !== camada) camada.appendChild(d)
    }
    for (const [id, d] of el) if (!vistos.has(id) && d.parentNode) { if (document.activeElement === d) d.blur(); d.remove() }
    // a ordem na página segue a lista (Tab anda na ordem certa)
    b.forEach((x, i) => { const d = el.get(x.id); if (camada.children[i] !== d) camada.insertBefore(d, camada.children[i] || null) })
  }
  addEventListener('pointerup', () => { M.apertado = null })
  UI.botao = (id) => el.get(id)

  // ---------------------------------------------------------------- peças
  const nomeEspolio = (e) => e.tipo === 'carta' ? CONFIG.CARTAS[e.carta].nome : e.reliquia ? CONFIG.RELIQUIAS[e.reliquia].nome : e.tipo === 'promocao' ? CONFIG.ESPOLIOS.promocao.nome : `${e.ouro} ${T.ouro}`
  UI.nomeEspolio = nomeEspolio
  function bt(cor, r, id, desligado = false) {
    const ap = M.apertado === id && !desligado
    g.globalAlpha = desligado ? 0.5 : 1
    return Arte.botao(g, cor, r.x, r.y, r.w, 26, ap)
  }
  /** Botão pequeno do HUD em espaço ×bs. */
  function hudBt(cor, r, id, desenho, desligado = false) {
    const bs = UI.L.bs
    g.save(); g.scale(bs, bs)
    const q = { x: r.x / bs, y: r.y / bs, w: r.w / bs, h: 26 }, d = bt(cor, q, id, desligado)
    desenho(q.x, q.y + d, q.w)
    g.restore(); g.globalAlpha = 1
  }
  function quebrar(s, larg, fonte = 'mini') {
    const pal = String(s).split(' '), out = []; let lin = ''
    for (const p of pal) { const t = lin ? lin + ' ' + p : p; if (Arte.largura(t, fonte) > larg && lin) { out.push(lin); lin = p } else lin = t }
    if (lin) out.push(lin); return out
  }
  UI.quebrar = quebrar
  const moldura = (x, y, w, h, cor = COR.ouro, claro = '#FFF096') => { g.fillStyle = cor; g.fillRect(x, y, w, 2); g.fillRect(x, y + h - 2, w, 2); g.fillRect(x, y, 2, h); g.fillRect(x + w - 2, y, 2, h); g.fillStyle = claro; g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h) }
  const barra = (x, y, w, h, pct, cor) => { g.fillStyle = COR.ameixa; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = '#4E3A66'; g.fillRect(x, y, w, h); g.fillStyle = cor; g.fillRect(x, y, Math.round((w * Math.max(0, Math.min(100, pct))) / 100), h) }
  function premio(e, x, y, pode = true) {
    // cartão de espólio 56×78: a carta de verdade, ou painel com o ícone do tipo; relíquia com moldura de ouro e o ícone dela
    g.globalAlpha = pode ? 1 : 0.45
    if (e.tipo === 'carta') Arte.carta(g, e.carta, 1, x, y); else {
      Arte.painel(g, x, y, 56, 78)
      const nome = e.tipo === 'promocao' ? 'Promotion' : 'Purse'
      if (e.reliquia) { moldura(x, y, 56, 78); g.fillStyle = COR.ameixa; g.fillRect(x + 12, y + 7, 32, 32); g.fillStyle = '#4E3A66'; g.fillRect(x + 13, y + 8, 30, 30); Arte.reliquia(g, e.reliquia, x + 15, y + 10, 2) } else if (!Arte.ui(g, 'loot.' + nome, x + 6, y + 4)) Arte.icone(g, e.tipo === 'promocao' ? 'up' : 'gold', x + 22, y + 20)
      g.fillStyle = COR.painel; g.fillRect(x + 4, y + 44, 48, 30)
      const lin = e.reliquia ? quebrar(CONFIG.RELIQUIAS[e.reliquia].nome, 46) : e.tipo === 'promocao' ? [T.maisNivel] : [`+${e.ouro} ${T.ouro}`, ...quebrar(T.bolsaChance(CONFIG.PARTIDA.bolsa.chanceReliquia), 46)]
      lin.slice(0, 3).forEach((s, i) => Arte.texto(g, s, x + 28, y + 50 + i * 7 + (lin.length === 1 ? 6 : lin.length === 2 ? 3 : 0), { fonte: 'mini', cor: e.reliquia || (e.tipo === 'bolsa' && i === 0) ? COR.ouro : COR.creme, alinhar: 'centro' }))
    }
    g.globalAlpha = 1
  }

  // ---------------------------------------------------------------- HUD
  function hud(agora) {
    const L = UI.L, bs = L.bs, HW = C.VW / bs
    g.save(); g.scale(bs, bs)
    let x = 3
    for (let i = 0; i < M.vidasMax; i++) { const some = M.vidaSome && M.vidaSome.i === i && agora < M.vidaSome.ate; Arte.icone(g, i < M.vidas || (some && ((agora >> 7) & 1)) ? 'life' : 'life-empty', x, 3); x += 12 }
    Arte.icone(g, 'gold', x + 3, 3); Arte.texto(g, String(M.ouro), x + 16, 4, { fonte: 'reino-ouro' })
    if (L.cel || (M.fase !== 'vitoria' && M.fase !== 'chefe')) Arte.texto(g, `${T.rodada} ${M.rodada}`, L.cel ? 3 : Math.floor(HW / 2), L.cel ? 17 : 4, { fonte: 'reino-contorno', alinhar: L.cel ? 'esquerda' : 'centro' })
    // pinos até o chefe (ciclo de 5 rodadas) + a cara dele, que pisca quando está avisado
    if (M.proximoChefe) {
      const px = 3, py = L.cel ? 29 : 17, n = ((M.rodada - 1) % CONFIG.HORDA.chefeACada) + 1
      for (let i = 0; i < CONFIG.HORDA.chefeACada; i++) Arte.icone(g, i < n ? 'pin-on' : 'pin-off', px + i * 6, py + 3)
      if (!M.proximoChefe.avisado || C.menos || ((agora >> 8) & 1) || M.fase === 'luta') Arte.icone(g, 'boss', px + 32, py)
    }
    // famílias no reino: quadradinho da cor + quantos terrenos / quantos ligam o bônus (pino de ouro quando está ligado); depois as relíquias
    if (M.familias && M.fase !== 'luta') {
      let fx = 50; const fy = L.cel ? 31 : 19
      for (const f of M.familias) {
        g.fillStyle = COR.ameixa; g.fillRect(fx, fy - 1, 7, 7); g.fillStyle = Arte.FAMILIA_COR[f.id].cor; g.fillRect(fx + 1, fy, 5, 5); g.fillStyle = Arte.FAMILIA_COR[f.id].claro; g.fillRect(fx + 1, fy, 5, 1)
        fx += 9 + Arte.texto(g, `${f.n}/${f.precisa}`, fx + 9, fy - 1, { fonte: 'mini-contorno' }) + 4
        if (f.ligada) { Arte.icone(g, 'pin-on', fx - 3, fy); fx += 5 }
      }
      if (!L.cel) for (const r of M.reliquias) { if (fx + 14 > HW / 2 - 30) break; Arte.reliquia(g, r, fx, fy - 4); fx += 14 }
    }
    // abertura: o logo do jogo no céu até a 1ª carta ser posta
    if (M.primeira && M.fase === 'carta') { if (L.cel) Arte.logo(g, 'small', HW - 37, 32, C.menos ? -1 : agora); else Arte.logo(g, 'small', Math.floor(HW / 2), 16, C.menos ? -1 : agora); viu('logo') }
    if (M.fase === 'luta' && M.forca) {
      const w = L.cel ? 58 : 110, bx = L.cel ? HW - w - 16 : Math.floor(HW / 2) - (w >> 1), by = L.cel ? 32 : 18, tot = Math.max(1, M.forca.aliados + M.forca.inimigos), meio = Math.round(w * M.forca.aliados / tot)
      Arte.icone(g, 'shield', bx - 13, by - 3); Arte.icone(g, 'horn', bx + w + 2, by - 3)
      g.fillStyle = COR.ameixa; g.fillRect(bx - 1, by - 1, w + 2, 7); g.fillStyle = COR.azul; g.fillRect(bx, by, meio, 5); g.fillStyle = COR.roxo; g.fillRect(bx + meio, by, w - meio, 5)
      g.fillStyle = '#68A0F8'; g.fillRect(bx, by, meio, 1); g.fillStyle = COR.creme; g.fillRect(bx + meio - 1, by - 2, 2, 9)
      Arte.texto(g, String(M.forca.aliados), bx, by + 8, { fonte: 'mini-contorno' }); Arte.texto(g, String(M.forca.inimigos), bx + w, by + 8, { fonte: 'mini-contorno', alinhar: 'direita' })
    }
    g.restore()
    if (M.fase === 'chefe' || M.fase === 'derrota') return
    hudBt('plum', L.menu, 'menu', (x0, y0, w) => { g.fillStyle = COR.creme; for (let i = 0; i < 3; i++) g.fillRect(x0 + 6, y0 + 7 + i * 4, w - 12, 2) })
    hudBt('plum', L.som, 'som', (x0, y0, w) => Arte.icone(g, M.mudo ? 'sound-off' : 'sound-on', x0 + ((w - 11) >> 1), y0 + 6))
    if (M.fase === 'luta') hudBt('green', L.lutar, 'vel', (x0, y0, w) => { Arte.icone(g, 'speed', x0 + (w >> 1) - 12, y0 + 6); Arte.texto(g, 'x' + M.vel, x0 + (w >> 1) + 1, y0 + 7, { fonte: 'reino', cor: COR.creme }) })
    else if (M.fase === 'carta') {
      const pulsa = M.pulsaLutar && !C.menos ? Math.round(Math.abs(Math.sin(agora / 240)) * 2) : 0
      hudBt('green', { ...L.lutar, y: L.lutar.y - pulsa }, 'lutar', (x0, y0, w) => Arte.texto(g, T.lutar, x0 + (w >> 1), y0 + 7, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' }))
      if (M.pulsaLutar && C.menos) { moldura(L.lutar.x - 1, L.lutar.y - 1, L.lutar.w + 2, 26 * bs + 2); viu('lutarFixo') } // Reduced motion: destaque parado
    }
  }
  function ouroBt(r, id, icone, st, agora) {
    const bs = UI.L.bs, armado = M.armado === id
    g.save(); g.scale(bs, bs)
    const q = { x: r.x / bs, y: r.y / bs, w: r.w / bs, h: 26 }
    const d = bt(armado ? 'green' : 'plum', q, id, !st.pode)
    if (armado) Arte.texto(g, T.confirma, q.x + (q.w >> 1), q.y + 6 + d, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' }); else Arte.icone(g, icone, q.x + 3, q.y + 5 + d)
    if (armado) Arte.texto(g, String(st.custo), q.x + (q.w >> 1), q.y + 12 + d, { fonte: 'mini', cor: COR.ouro, alinhar: 'centro' }); else { Arte.texto(g, String(st.custo), q.x + 16, q.y + 7 + d, { fonte: 'reino', cor: st.pode ? COR.ouro : COR.pedra[1] }) }
    g.globalAlpha = 1
    if (st.destaque && !armado && (C.menos || ((agora >> 8) & 1))) { moldura(q.x - 1, q.y - 1, q.w + 2, 28); viu('consertoDestaque') }
    g.restore()
  }
  /** As chances de raridade do sorteio, numa linha junto do botão de sortear (números do config). */
  function chances() {
    const o = UI.L.odds; let x = o.x
    const cabe = UI.L.cel || o.x + Arte.largura(T.chances, 'mini-contorno') + 3 + M.chances.length * 23 < UI.L.cartas[0].x - 2
    if (cabe) x += Arte.texto(g, T.chances, x, o.y, { fonte: 'mini-contorno' }) + 3; else x = 2
    for (const c of M.chances) {
      g.fillStyle = COR.ameixa; g.fillRect(x, o.y, 7, 7); g.fillStyle = c.cor; g.fillRect(x + 1, o.y + 1, 5, 5); g.fillStyle = c.claro; g.fillRect(x + 1, o.y + 1, 5, 1)
      x += 8 + Arte.texto(g, c.chance + '%', x + 8, o.y, { fonte: 'mini-contorno' }) + 3
    }
    if (M.chances.length) viu('chances')
  }

  // ---------------------------------------------------------------- mão, mesa, faixa de informação
  function mesa() { const L = UI.L; if (!L.cel) return; g.fillStyle = COR.ameixa; g.fillRect(0, L.mesa.y - 1, C.VW, 1); g.fillStyle = COR.painel; g.fillRect(0, L.mesa.y, C.VW, L.mesa.h); g.fillStyle = COR.filete; g.fillRect(0, L.mesa.y, C.VW, 1) }
  /** Linhas de informação: no celular numa caixa logo acima da mesa; no PC à esquerda da mão. Linha que começa com "#" sai em ouro. */
  function faixa(linhas) {
    const L = UI.L, f = L.faixa
    if (L.cel) {
      const h = linhas.length * 7 + 3, y = f.y - h
      g.fillStyle = COR.ameixa; g.fillRect(0, y - 1, C.VW, 1); g.fillStyle = COR.painel; g.fillRect(0, y, C.VW, h)
      linhas.forEach((s, i) => Arte.texto(g, s.replace(/^#/, ''), C.VW >> 1, y + 2 + i * 7, { fonte: 'mini', cor: s[0] === '#' ? COR.ouro : COR.creme, alinhar: 'centro' }))
    } else linhas.forEach((s, i) => Arte.texto(g, s.replace(/^#/, ''), f.x, f.y + f.h - (linhas.length - i) * 8, { fonte: s[0] === '#' && Arte.temFonte('mini-ouro') ? 'mini-ouro' : 'mini-contorno' }))
  }
  /** Quebra cada linha de informação na largura que há (mantendo o "#" de ouro). */
  function linhasQueCabem(linhas, max) {
    const larg = UI.L.cel ? C.VW - 8 : Math.max(100, UI.L.faixa.w), out = []
    for (const s of linhas) { const ouro = s[0] === '#'; for (const q of quebrar(ouro ? s.slice(1) : s, larg)) out.push((ouro ? '#' : '') + q) }
    return out.slice(0, max)
  }
  function premios(grande) {
    const L = UI.L, p = L.premios
    if (!M.espolios.length) return
    if (!grande) { faixa(['#' + quebrar(`${T.ganhe} ${M.espolios.map(nomeEspolio).join(' / ')}`, C.VW - 6)[0]]); viu('ganhe'); return }
    Arte.painel(g, p.x, p.y, p.w, p.h)
    Arte.texto(g, T.ganhe, p.x + 6, p.y + 5, { fonte: 'mini', cor: COR.ouro })
    M.espolios.forEach((e, i) => {
      const passo = Math.floor((p.w - 8) / 3), x = p.x + 4 + i * passo, lin = quebrar(nomeEspolio(e), passo - 2)
      if (e.reliquia) Arte.reliquia(g, e.reliquia, x + (passo >> 1) - 6, p.y + 12); else Arte.icone(g, e.tipo === 'carta' ? { tropa: 'troop', construcao: 'building', magia: 'magic' }[CONFIG.CARTAS[e.carta].tipo] : e.tipo === 'promocao' ? 'up' : 'gold', x + (passo >> 1) - 5, p.y + 13)
      lin.slice(0, 3).forEach((s, j) => Arte.texto(g, s, x + (passo >> 1), p.y + 26 + j * 6, { fonte: 'mini', cor: e.reliquia ? COR.ouro : COR.creme, alinhar: 'centro' }))
    })
    viu('ganhe')
  }
  function mao(agora) {
    const L = UI.L
    M.mao.forEach((c, i) => {
      if (M.arrasto && M.arrasto.indice === i && M.arrasto.moveu) return
      const r = L.cartas[i], dt = agora - M.maoT0 - i * 90
      if (dt < 0) return
      let y = r.y + (C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 220) * 60))
      const sel = M.sel === i
      if (sel) y -= 9
      else if (M.primeira && M.sel < 0 && i === 1 && !C.menos) y -= Math.round(Math.abs(Math.sin(agora / 300)) * 4) // a do meio balança: "toque em mim"
      if (sel) { g.fillStyle = COR.ouro; g.fillRect(r.x - 2, y - 2, 60, 82); g.fillStyle = '#FFF096'; g.fillRect(r.x - 1, y - 1, 58, 80) }
      Arte.carta(g, c.carta, c.nivel, r.x, y)
      if (c.sobe) { const q = C.menos ? 0 : (agora / 120) | 0; if (!Arte.ui(g, 'level-up', r.x + 5, y - 9, q)) Arte.texto(g, T.sobe, r.x + 28, y - 8, { fonte: 'reino-ouro', alinhar: 'centro' }) }
    })
  }
  /** RESUMO DA LUTA (ao vivo e no fim): contagem dos dois lados, dano por terreno em colunas e o MVP. Só mostra o que os eventos do motor disseram. */
  function resumo(r, comGanhe) {
    const R = M.resumo; if (!R) return
    const cel = UI.L.cel
    if (!cel) Arte.painel(g, r.x, r.y, r.w, r.h)
    const x0 = r.x + 5, y0 = r.y + 4, xr = r.x + r.w - 5, H = cel ? 26 : 20
    Arte.icone(g, 'shield', x0, y0 - 1); Arte.texto(g, `${R.aliados}/${R.aliadosTotal}`, x0 + 13, y0, { fonte: 'reino-contorno' })
    Arte.icone(g, 'horn', xr - 11, y0 - 1); Arte.texto(g, `${R.inimigos}/${R.inimigosTotal}`, xr - 13, y0, { fonte: 'reino-contorno', alinhar: 'direita' })
    Arte.texto(g, T.resumo.dano, r.x + (r.w >> 1), y0 + 2, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' })
    const passo = Math.min(cel ? 24 : 30, Math.floor((r.w - 10) / 7)), bx = cel ? r.x + ((r.w - passo * 7) >> 1) : x0, by = y0 + 18, max = Math.max(1, ...R.dano)
    for (let n = 0; n < 7; n++) {
      const k = n < 6 ? n + 1 : 0, id = R.cartas[k], v = R.dano[k], cx = bx + n * passo + (passo >> 1), mvp = R.mvp === k && v > 0
      const h = v > 0 ? Math.max(2, Math.round((H * v) / max)) : 0, cor = mvp ? COR.ouro : k === 0 ? '#CECAD8' : id ? Arte.FAMILIA_COR[CONFIG.CARTAS[id].familia].cor : '#4E3A66'
      g.fillStyle = COR.ameixa; g.fillRect(cx - 7, by + H, 14, 1)
      if (h) { g.fillStyle = COR.ameixa; g.fillRect(cx - 7, by + H - h - 1, 14, h + 1); g.fillStyle = cor; g.fillRect(cx - 6, by + H - h, 12, h); g.fillStyle = '#FFF6E0'; g.globalAlpha = 0.35; g.fillRect(cx - 6, by + H - h, 12, 1); g.globalAlpha = 1 }
      if (v > 0) Arte.texto(g, String(v), cx, by + H - h - 7, { fonte: mvp && Arte.temFonte('mini-ouro') ? 'mini-ouro' : 'mini-contorno', alinhar: 'centro' })
      Arte.texto(g, mvp ? T.resumo.mvp : k === 0 ? 'MAG' : String(k), cx, by + H + 3, { fonte: 'mini', cor: mvp ? COR.ouro : id || (k === 0 && v > 0) ? COR.creme : COR.pedra[2], alinhar: 'centro' })
    }
    const nomeMvp = R.mvp > 0 ? CONFIG.CARTAS[R.cartas[R.mvp]]?.nome : R.mvp === 0 ? T.resumo.magia : null
    if (nomeMvp) { const s = `${T.resumo.mvp}: ${nomeMvp} ${R.dano[R.mvp]}`; if (cel) Arte.texto(g, s, r.x + (r.w >> 1), by + H + 11, { fonte: 'mini', cor: COR.ouro, alinhar: 'centro' }); else quebrar(s, r.w - passo * 7 - 14).slice(0, 3).forEach((q, i) => Arte.texto(g, q, bx + passo * 7 + 4, by + 4 + i * 7, { fonte: 'mini', cor: COR.ouro })) }
    if (cel && comGanhe && M.espolios.length) Arte.texto(g, quebrar(`${T.ganhe} ${M.espolios.map(nomeEspolio).join(' / ')}`, r.w - 6)[0], r.x + (r.w >> 1), r.y + r.h - 9, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' })
    viu('resumo')
  }

  // ---------------------------------------------------------------- camadas de momento
  const escurecer = (a) => { g.globalAlpha = a; g.fillStyle = '#1C1230'; g.fillRect(0, 0, C.VW, C.VH); g.globalAlpha = 1 }
  /** O que cada espólio faz, antes de escolher: celular na mesa (3 blocos), PC embaixo de cada cartão. */
  function descricoes() {
    const L = UI.L
    if (!M.espolioDesc.length) return
    if (L.cel) {
      let y = L.mesa.y + 4
      Arte.texto(g, T.pegue, C.VW >> 1, y, { fonte: 'reino-contorno', alinhar: 'centro' }); y += 12
      for (const d of M.espolioDesc) {
        const junto = `${d.titulo}: ${d.texto}`, lin = Arte.largura(junto, 'mini') <= C.VW - 8 ? [junto] : [d.titulo, ...quebrar(d.texto, C.VW - 8).slice(0, 2)]
        lin.forEach((s, i) => {
          if (i === 0) { const t = lin.length === 1 ? d.titulo + ':' : d.titulo, w = Arte.largura(lin[0], 'mini'), x = (C.VW - w) >> 1; Arte.texto(g, t, x, y, { fonte: 'mini', cor: COR.ouro }); if (lin.length === 1) Arte.texto(g, d.texto, x + Arte.largura(t + ' ', 'mini') + 1, y, { fonte: 'mini', cor: COR.creme }) } else Arte.texto(g, s, C.VW >> 1, y, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' })
          y += 6
        })
        y += 3
      }
    } else M.espolioDesc.forEach((d, i) => { const r = L.espolio[i]; quebrar(d.texto, L.passo - 6).slice(0, 3).forEach((s, j) => Arte.texto(g, s, r.x + 28, r.y + 82 + j * 7, { fonte: 'mini-contorno', alinhar: 'centro' })) })
    viu('espolioDesc')
  }
  function vitoria(agora) {
    const v = M.vitoria, L = UI.L, dt = agora - v.t0, cx = C.VW >> 1, ey = L.espolio[0].y
    escurecer(Math.min(0.5, dt / 600))
    const k = L.cel ? 2 : 3, pop = C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 180) * 10), ty = ey - (L.cel ? 62 : 56) - pop
    if (v.chefe) {
      // chefe caído: título com o nome dele em ouro e o selo
      const lin = quebrar(T.caiu(v.chefeNome), (C.VW - 8) / 2, 'reino-ouro')
      lin.slice(0, 2).forEach((s, i) => Arte.titulo(g, s, cx, ty - (lin.length > 1 ? 12 : 0) + i * 19, 2, true))
      Arte.fimPeca(g, 'selo_chefe', cx - 12, ty - (lin.length > 1 ? 38 : 27), C.menos ? 0 : dt)
      viu('chefeCaiu')
    } else Arte.titulo(g, T.vitoria, cx, ty, k, true)
    Arte.icone(g, 'gold', cx - 20, ey - 30); Arte.texto(g, '+' + v.ouroMostra, cx - 6, ey - 29, { fonte: 'reino-ouro' })
    if (v.selo) Arte.texto(g, v.selo, cx, ey - 16, { fonte: 'mini-contorno', alinhar: 'centro' })
    if (!v.pronto) return
    M.espolios.forEach((e, i) => {
      const r = L.espolio[i], t = agora - v.prontoT0 - i * 110; if (t < 0) return
      const y = r.y + (C.menos ? 0 : Math.round(Math.max(0, 1 - t / 200) * 30)) - (M.apertado === 'espolio' + i ? -2 : 0)
      premio(e, r.x, y, M.espolioPode[i])
    })
    if (L.cel && v.mvp) Arte.texto(g, v.mvp, cx, ey + 83, { fonte: 'mini-contorno', alinhar: 'centro' })
    descricoes()
  }
  function derrota(agora) {
    const d = M.derrota, dt = agora - d.t0, cx = C.VW >> 1, y = Math.floor(C.VH * (UI.L.cel ? 0.26 : 0.16))
    escurecer(Math.min(0.45, dt / 600))
    g.fillStyle = COR.carmim; const w = Arte.largura(T.derrota, 'reino-contorno') * 3 + 16; g.fillRect(cx - (w >> 1), y - 4, w, 34); g.fillStyle = '#7C2030'; g.fillRect(cx - (w >> 1), y + 28, w, 2)
    Arte.titulo(g, T.derrota, cx, y, 3)
    let yy = y + 38
    quebrar(d.linha, C.VW - 16, 'reino-contorno').forEach((s) => { Arte.texto(g, s, cx, yy, { fonte: 'reino-contorno', alinhar: 'centro' }); yy += 11 })
    // "quase": quanto da horda caiu (número do motor), em barra e por extenso
    if (d.pct != null) {
      const bw = Math.min(140, C.VW - 30), cheio = C.menos ? d.pct : Math.min(d.pct, Math.round((d.pct * Math.max(0, dt - 300)) / 700))
      yy += 3; barra(cx - (bw >> 1), yy, bw, 6, cheio, COR.ouro); yy += 10
      Arte.texto(g, T.quase(d.pct), cx, yy, { fonte: 'reino-ouro', alinhar: 'centro' }); yy += 14; viu('quase')
    }
    for (let i = 0; i < M.vidasMax; i++) Arte.icone(g, i < M.vidas ? 'life' : 'life-empty', cx - M.vidasMax * 7 + i * 14, yy)
    yy += 16
    Arte.texto(g, d.deNovo ? T.deNovoMais : T.semVidas, cx, yy, { fonte: 'reino-contorno', alinhar: 'centro' })
  }
  function chefe(agora) {
    const c = M.chefe, dt = agora - c.t0, cx = C.VW >> 1, cy = Math.floor(C.VH * 0.5), def = CONFIG.CHEFES.find((x) => x.id === c.id)
    const nome = quebrar(def.nome, (C.VW - 12) / 2, 'reino-contorno') // o título sai em ×2: quebra na metade da largura (nome comprido não corta)
    if (c.curto) {
      // repetição na mesma partida: versão curta, só a faixa com o nome
      escurecer(0.3)
      g.globalAlpha = 0.85; g.fillStyle = '#1C1230'; g.fillRect(0, cy - 26, C.VW, nome.length * 20 + 22); g.globalAlpha = 1
      g.fillStyle = COR.carmim; g.fillRect(0, cy - 27, C.VW, 2); g.fillRect(0, cy - 5 + nome.length * 20, C.VW, 2)
      if (!Arte.ui(g, 'label-boss', cx - 11, cy - 21)) Arte.texto(g, T.chefe, cx, cy - 20, { fonte: 'reino-ouro', alinhar: 'centro' })
      nome.forEach((s, i) => Arte.titulo(g, s, cx, cy - 6 + i * 20, 2, true))
      viu('chefeCurto'); return
    }
    escurecer(Math.min(0.6, dt / 400))
    const p = Arte.unidade(c.id), entra = C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 500) * (C.VW * 0.7)), k = C.e >= 2 && UI.L.cel ? 1.5 : 1
    g.globalAlpha = 0.5; g.fillStyle = COR.carmim; g.fillRect(0, cy - 44, C.VW, 2); g.fillRect(0, cy + 24, C.VW, 2); g.globalAlpha = 1
    Arte.desenhar(g, p, (p.variantes?.[0] || p.quadros)[Arte.quadroDe(p.anim.idle, C.menos ? 0 : dt)], cx - entra, cy + 22, p.olhaEsquerda, null, k)
    if (!Arte.ui(g, 'label-boss', cx - 11, cy - 62 - (p.h * k - p.h))) Arte.texto(g, T.chefe, cx, cy - 62, { fonte: 'reino-ouro', alinhar: 'centro' })
    nome.forEach((s, i) => Arte.titulo(g, s, cx, cy + 32 + i * 20, 2, true))
    quebrar(def.texto, C.VW - 16).forEach((s, i) => Arte.texto(g, s, cx, cy + 36 + nome.length * 20 + i * 8, { fonte: 'mini-contorno', alinhar: 'centro' }))
    viu('chefe')
  }
  /** FIM DA PARTIDA: tela cheia composta. Em cima o número grande contando sobre o reino iluminado; embaixo a placa com pontos,
   *  recorde (de PONTOS), média das 3 melhores, liga provisória, barra da próxima carta do álbum e os dois botões. */
  function fim(agora) {
    const f = M.fim, L = UI.L, dt = agora - f.t0, P = L.fimPainel, b0 = L.fimBotoes[0], b1 = L.fimBotoes[1], ouro = f.novoRecorde && f.contou
    const faixaRecorde = (cx, y) => {
      if (!f.contou) return
      if (f.novoRecorde) { if (!Arte.fimPeca(g, 'faixa_recorde', cx - 46, y, C.menos ? 0 : agora)) { g.fillStyle = COR.carmim; g.fillRect(cx - 46, y + 2, 93, 14); Arte.texto(g, T.recorde, cx, y + 5, { fonte: 'reino-ouro', alinhar: 'centro' }) } viu('fimRecorde') }
    }
    const numeros = (x, y, w) => {
      const cols = [[T.pontos, f.pontos, true], [T.melhor, f.recorde, f.novoRecorde], [T.media, f.media, false]]
      cols.forEach(([rot, v, o], i) => { const cx = x + Math.round((w * (i * 2 + 1)) / 6); Arte.texto(g, String(v), cx, y, { fonte: o ? 'reino-ouro' : 'reino-contorno', alinhar: 'centro' }); Arte.texto(g, rot, cx, y + 11, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' }) })
      const d = f.pontos - f.recordeAntes, s = f.recordeAntes === 0 ? T.primeira : d > 0 ? T.recordeMais(d) : d === 0 ? T.recordeIgual : T.recordeFalta(-d)
      Arte.texto(g, quebrar(s, w - 4)[0], x + (w >> 1), y + 20, { fonte: 'mini', cor: d > 0 ? COR.ouro : COR.creme, alinhar: 'centro' })
      viu('fimNumeros')
    }
    const liga = (x, y, w) => {
      if (!Arte.liga(g, f.liga.nome, x, y)) { g.fillStyle = COR.ameixa; g.fillRect(x + 3, y + 3, 21, 24); Arte.icone(g, 'shield', x + 8, y + 9) }
      Arte.texto(g, f.liga.nome, x + 31, y + 1, { fonte: 'reino-contorno' })
      { const sobra = w - 33 - Arte.largura(f.liga.nome, 'reino-contorno'), marca = Arte.largura(T.provisorio, 'mini') <= sobra ? T.provisorio : T.beta // a liga do beta é PROVISÓRIA: está escrito ao lado do nome
        Arte.texto(g, marca, x + w, y + 3, { fonte: 'mini', cor: COR.ouro, alinhar: 'direita' }); f.ligaMarca = marca }
      barra(x + 32, y + 13, w - 34, 4, f.liga.pct, COR.ouro)
      Arte.texto(g, f.liga.proxima ? T.ligaProxima(f.liga.proxima, f.liga.falta) : T.ligaTopo, x + 31, y + 21, { fonte: 'mini', cor: COR.creme })
      viu('fimLiga')
    }
    const album = (x, y, w) => {
      Arte.icone(g, 'loot', x, y - 2)
      Arte.texto(g, f.album ? T.proximaCarta(f.album.falta) : T.todasCartas, x + 14, y - 1, { fonte: 'mini', cor: COR.creme })
      barra(x + 14, y + 6, w - 16, 3, f.album ? f.album.pct : 100, '#7CC950')
      viu('fimAlbum')
    }
    const botoes = () => {
      if (dt < 0) return
      let d = bt('green', b0, 'denovo'); Arte.texto(g, T.deNovo, b0.x + (b0.w >> 1), b0.y + 7 + d, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' })
      d = bt('plum', b1, 'postar'); Arte.texto(g, T.postar, b1.x + (b1.w >> 1), b1.y + 7 + d, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' })
      g.globalAlpha = 1
    }
    if (L.cel) {
      // em cima, à esquerda do castelo: título, número grande e a faixa do recorde; o reino inteiro fica à vista no meio
      const topo = Math.max(0, C.oyBase >> 1), cx = Math.min(54, (C.VW >> 1) - 36)
      Arte.texto(g, T.fim, cx, topo + 4, { fonte: 'reino-contorno', alinhar: 'centro' })
      Arte.titulo(g, String(f.mostra), cx, topo + 13, 4, ouro)
      Arte.texto(g, T.aguentou, cx, topo + 50, { fonte: 'mini-contorno', alinhar: 'centro' })
      faixaRecorde(Math.max(47, cx), topo + 58)
      g.fillStyle = COR.ameixa; g.fillRect(0, P.y - 1, P.w, 1); g.fillStyle = COR.painel; g.fillRect(0, P.y, P.w, P.h); g.fillStyle = COR.filete; g.fillRect(0, P.y, P.w, 1)
      numeros(0, P.y + 4, P.w)
      liga(4, P.y + 31, P.w - 8)
      album(36, P.y + 62, P.w - 40)
    } else {
      const cx = P.x + 58
      Arte.painel(g, P.x, P.y, P.w, P.h)
      Arte.texto(g, T.fim, cx, P.y + 5, { fonte: 'reino-contorno', alinhar: 'centro' })
      Arte.titulo(g, String(f.mostra), cx, P.y + 15, 4, ouro)
      Arte.texto(g, T.aguentou, cx, P.y + 53, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' })
      faixaRecorde(cx, P.y + 62)
      const mx = P.x + 118, mw = P.w - 126, meio = Math.floor(mw * 0.52)
      numeros(mx, P.y + 6, mw)
      liga(mx, P.y + 36, meio - 6)
      album(mx + meio, P.y + 46, mw - meio)
    }
    botoes()
    hudBt('plum', L.menu, 'menu', (x0, y0, w) => { g.fillStyle = COR.creme; for (let i = 0; i < 3; i++) g.fillRect(x0 + 6, y0 + 7 + i * 4, w - 12, 2) })
    viu('fim')
  }
  function aviso(agora) {
    const a = M.aviso; if (!a || agora > a.t0 + a.ms || agora < a.t0) return
    const dt = agora - a.t0, cx = C.VW >> 1, y = Math.floor(C.VH * (UI.L.cel ? 0.24 : 0.2)) - (C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 150) * 8))
    if (dt > a.ms - 200 && ((agora >> 6) & 1) && !C.menos) return
    const k = a.k || 2, lin = quebrar(a.texto, (C.VW - 8) / k, 'reino-contorno')
    lin.forEach((s, i) => Arte.titulo(g, s, cx, y + i * 10 * k, k, a.ouro))
    if (a.sub) quebrar(a.sub, C.VW - 12).forEach((s, i) => Arte.texto(g, s, cx, y + lin.length * 10 * k + 3 + i * 7, { fonte: 'mini-contorno', alinhar: 'centro' }))
  }
  /** Aviso pequeno em placa (conquista, carta nova, relíquia): sempre abaixo do HUD, nunca por cima dele. */
  function brinde(agora) {
    const b = M.brinde; if (!b || agora > b.t0 + b.ms || agora < b.t0) return
    const L = UI.L, dt = agora - b.t0, cel = L.cel, hudFim = Math.ceil((L.pinos.y + L.pinos.h) / 1) + 2
    const canto = !cel && M.fase === 'vitoria' // PC na escolha do espólio: a placa vai para o canto livre de baixo (nunca por cima dos 3 espólios)
    const w = canto ? L.premios.w : Math.min(C.VW - 8, 150)
    const x = canto ? L.premios.x : cel || M.fase === 'fim' ? (C.VW - w) >> 1 : 4
    const y = canto ? L.premios.y + 15 : M.fase === 'fim' ? L.fimPainel.y - 34 : cel ? (M.fase === 'carta' || M.fase === 'terreno' ? L.odds.y + 10 : M.fase === 'luta' ? Math.max(48, hudFim) : L.mesa.y - 34) : Math.max(32, hudFim)
    M.brindeRet = { x, y, w, h: 30 }
    const desce = C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 200) * 20)
    Arte.painel(g, x, y - desce, w, 30)
    const ic = b.icone
    if (ic?.tipo === 'conquista' && Arte.conquista(g, ic.nome, x + 4, y + 4 - desce)) { /* medalha */ } else if (ic?.tipo === 'reliquia') Arte.reliquia(g, ic.id, x + 6, y + 8 - desce); else Arte.icone(g, ic?.tipo === 'carta' ? 'loot' : 'pudding', x + 8, y + 9 - desce)
    Arte.texto(g, b.titulo, x + 27, y + 6 - desce, { fonte: 'mini', cor: COR.ouro })
    Arte.texto(g, b.texto, x + 27, y + 15 - desce, { fonte: Arte.largura(b.texto, 'reino') > w - 32 ? 'mini' : 'reino', cor: COR.creme })
    viu('brinde')
  }

  /** Por cima do mundo, ainda com a câmera: selo de LEVEL UP com "antes > depois", contagem da horda no portão, "REPLACE?". */
  C.depoisDoMundo = (gg, t) => {
    const agora = performance.now()
    if (M.trocar && (M.fase === 'carta' || M.fase === 'terreno')) { const p = C.centroDoTerreno(M.trocar); Arte.texto(gg, T.trocar, p.x, p.base - 44, { fonte: 'reino-ouro', alinhar: 'centro' }); viu('trocar') }
    if ((M.fase === 'carta') && M.hordaN) {
      const p = C.pos(-34, -1), b = C.menos ? 0 : Math.round(Math.abs(Math.sin(agora / 400)) * 2)
      Arte.icone(gg, 'horn', Math.max(1, Math.round(p.x) - 14), Math.round(p.y) - 46 - b); Arte.texto(gg, 'x' + M.hordaN, Math.max(13, Math.round(p.x) - 2), Math.round(p.y) - 44 - b, { fonte: 'reino-contorno' })
      if (M.hordaChefe) if (!Arte.ui(gg, 'label-boss', Math.max(1, Math.round(p.x) - 14), Math.round(p.y) - 60 - b)) Arte.texto(gg, T.chefe, Math.max(1, Math.round(p.x) - 14), Math.round(p.y) - 58 - b, { fonte: 'reino-ouro' })
    }
    if (M.selo && agora < M.selo.ate) {
      const p = C.centroDoTerreno(M.selo.terreno), sobe = C.menos ? 0 : Math.round(Math.min(1, (agora - M.selo.t0) / 300) * 8), q = C.menos ? 0 : (agora / 120) | 0
      if (!Arte.ui(gg, 'level-up', Math.round(p.x) - 23, p.base - 50 - sobe, q)) Arte.texto(gg, T.sobe, p.x, p.base - 50 - sobe, { fonte: 'reino-ouro', alinhar: 'centro' })
      if (M.selo.linha) { const w = Arte.largura(M.selo.linha, 'reino-ouro'), x = Math.max(2 + (w >> 1), Math.min(C.VW - 2 - (w >> 1), Math.round(p.x))); gg.fillStyle = COR.ameixa; gg.globalAlpha = 0.8; gg.fillRect(x - (w >> 1) - 3, p.base - 37 - sobe, w + 6, 12); gg.globalAlpha = 1; Arte.texto(gg, M.selo.linha, x, p.base - 35 - sobe, { fonte: 'reino-ouro', alinhar: 'centro' }); viu('nivelAntesDepois') }
    }
  }

  /** Começo do quadro (antes do mundo): zera as etiquetas do que foi desenhado. */
  UI.novoQuadro = () => UI.desenhou.clear()
  /** Um quadro da interface (depois do mundo). */
  UI.desenhar = (agora) => {
    const L = UI.L, f = M.fase
    g.setTransform(C.e, 0, 0, C.e, 0, 0); g.imageSmoothingEnabled = false
    if (f === 'fim') { fim(agora); aviso(agora); brinde(agora); return }
    if (f === 'carta') {
      mesa()
      const sel = M.sel >= 0 && M.mao[M.sel] && M.infoSel
      if (!M.cartaPosta) {
        if (!L.cel) premios(true)
        mao(agora)
        if (sel) { faixa(linhasQueCabem(M.infoSel, 6)); viu('infoCarta') } else if (M.info) { faixa(linhasQueCabem(M.info, 7)); viu('info') } else if (L.cel) premios(false)
        ouroBt(L.sortear, 'sortear', 'reroll', M.sortear, agora)
        chances()
      } else {
        premios(true)
        if (M.info) { faixa(linhasQueCabem(M.info, 7)); viu('info') }
        const r = L.lutar2, pulsa = C.menos ? 0 : Math.round(Math.abs(Math.sin(agora / 240)) * 2)
        const d = bt('green', { ...r, y: r.y - pulsa }, 'lutar2'); Arte.texto(g, T.lutar, r.x + (r.w >> 1), r.y + 7 + d - pulsa, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' }); g.globalAlpha = 1
        if (C.menos) { moldura(r.x - 2, r.y - 2, r.w + 4, 30); Arte.icone(g, 'play', r.x - 14, r.y + 8); viu('lutarFixo') } // Reduced motion: contorno de ouro e seta parados no lugar do pulso
      }
      if (M.consertar.visivel) ouroBt(L.consertar, 'consertar', 'life', M.consertar, agora)
    } else if (f === 'luta') { mesa(); resumo(L.resumo, true); if (!L.cel) premios(true) } else if (f === 'terreno') {
      mesa(); faixa(['#' + T.escolhaTerreno, ...(M.info || [])])
      const r = L.lutar2, d = bt('plum', r, 'voltar'); Arte.texto(g, T.voltar, r.x + (r.w >> 1), r.y + 7 + d, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' }); g.globalAlpha = 1
    } else if (f === 'vitoria') { mesa(); if (!L.cel || !M.vitoria.pronto) resumo(L.resumo, false); vitoria(agora) } else if (f === 'derrota') { mesa(); derrota(agora); resumo(L.resumo, false) } else if (f === 'chefe') { mesa(); chefe(agora) }
    hud(agora); aviso(agora); brinde(agora)
    if (M.arrasto?.moveu) { const c = M.mao[M.arrasto.indice]; if (c) Arte.carta(g, c.carta, c.nivel, Math.round(M.arrasto.x - 28), Math.round(M.arrasto.y - 50)) }
  }
  medir()
  return UI
}
