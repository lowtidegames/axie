// Keepmile — A INTERFACE em pixel, desenhada no mesmo canvas da cena (HUD, mão de 3 cartas, espólios, resumo da luta, avisos, fim),
// com um botão de verdade (transparente, com foco de teclado) por cima de cada coisa tocável. Só mostra o modelo `M` que o app monta
// a partir de `visao`/`opcoes`/eventos do motor; quem manda comando é o app. Nenhum número de regra nasce aqui.
import * as Arte from './arte.js'
import { desenharMedalha } from './telas.js'
import { T } from './textos.js'

export function criarInterface(C, CONFIG, camada, aoTocar) {
  const g = C.g, COR = Arte.COR
  const M = {
    fase: 'carta', vidas: 3, vidasMax: 3, ouro: 0, rodada: 1, proximoChefe: null, mao: [], sel: -1, cartaPosta: false, maoT0: 0, primeira: false,
    sortear: { custo: 0, pode: false }, consertar: { custo: 0, pode: false, visivel: false, destaque: false }, armado: null, trocar: 0,
    espolios: [], espolioPode: [], espolioDesc: [], info: null, infoSel: null, forca: null, vel: 1, mudo: false, aviso: null, vitoria: null, derrota: null, chefe: null, fim: null, arrasto: null,
    apertado: null, selo: null, brinde: null, hordaN: 0, hordaChefe: null, pulsaLutar: false, chances: [], reliquias: [], resumo: null, familias: [],
    status: null, replay: null, modoRot: null, // modo servidor: aviso curto (rede, erro do contrato), replay em curso e o rótulo do modo
  }
  const UI = { M, L: {}, botoes: [], desenhou: new Set(), letra: {} }
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
    if (cel) { const y = Math.max(44 * bs, Math.ceil(L.pinos.y + L.pinos.h + Math.max(0, (hmin - 26 * bs) / 2))); L.sortear = { x: 3 * bs, y, w: 34 * bs, h: 26 * bs }; L.consertar = { x: 40 * bs, y, w: 34 * bs, h: 26 * bs } } else { L.sortear = { x: x0 - 42 * bs, y: VH - 2 - 28 * bs, w: 34 * bs, h: 26 * bs }; L.consertar = { x: x0 - 80 * bs, y: VH - 2 - 28 * bs, w: 34 * bs, h: 26 * bs } }
    // chances do sorteio junto do botão de sortear, com o NOME de cada raridade (não só a cor): quebram em linhas na largura que há.
    // Tela pequena: a letra miúda nunca desce de ~8 px de tela (passa para a letra maior).
    L.letraGrande = 5 * C.css < 7.9
    { const fonte = L.letraGrande ? 'reino-contorno' : 'mini-contorno', alt = L.letraGrande ? 10 : 8, max = cel ? VW - 4 : Math.max(60, x0 - 10), ox = cel ? 3 : 6
      const itens = [{ s: T.chances, w: Arte.largura(T.chances, fonte) + 4 }, ...M.chances.map((c) => { const t = `${c.nome} ${c.chance}%`; return { s: t, c, w: 9 + Arte.largura(t, fonte) + 5 } })]
      // R38 — no CELULAR as chances nunca descem para cima dos terrenos 5 e 6 (a seta do terreno vazio): só a ÚLTIMA linha fica debaixo
      // do botão de sortear (largura inteira, colada nele); as outras sobem para o LADO do botão (à direita dele e do conserto, se houver)
      // Tela baixa (o botão já encosta nos terrenos de cima): nem a última linha cabe debaixo dele — todas ficam ao lado.
      const lado = cel ? (M.consertar?.visivel ? L.consertar.x + L.consertar.w : L.sortear.x + L.sortear.w) + 3 * bs - ox : 0
      const teto = cel ? Math.min(C.topoDoVazio(5), C.topoDoVazio(6)) : 1e9, fundoBt = L.sortear.y + 26 * bs, embaixo = fundoBt + alt <= teto
      const quebra = (n) => { const linhas = [[]]; let x = 0; for (const it of itens) { if (x + it.w - (it.c ? 5 : 4) > (linhas.length < n ? max - lado : max) && linhas.at(-1).length) { linhas.push([]); x = 0 } linhas.at(-1).push({ ...it, x }); x += it.w } return linhas }
      let linhas = quebra(cel && !embaixo ? 99 : 1); for (let n = 2; cel && embaixo && linhas.length > n - 1 && n <= 8; n++) linhas = quebra(n)
      L.odds = cel ? { x: ox, y: (embaixo ? fundoBt + alt : Math.min(teto, fundoBt)) - linhas.length * alt } : { x: ox, y: L.sortear.y - 1 - linhas.length * alt }
      L.odds.dx = linhas.map((_, i) => (cel && (!embaixo || i < linhas.length - 1) ? lado : 0))
      L.odds.linhas = linhas; L.odds.fonte = fonte; L.odds.alt = alt; L.odds.h = linhas.length * alt }
    L.faixa = cel ? { x: 0, y: VH - 88, w: VW, h: 0 } : { x: 6, y: L.odds.y - 50, w: x0 - 14, h: 48 }
    L.lutar2 = cel ? { x: 4, y: VH - 30, w: VW - 8, h: 26 } : { x: Math.floor(VW / 2) - 48, y: VH - 44, w: 96, h: 26 }
    L.voltar = cel ? { x: 64, y: VH - 30, w: VW - 68, h: 26 } : L.lutar2
    L.premios = cel ? { x: 2, y: VH - 87, w: VW - 4, h: 55 } : { x: VW - 124, y: VH - 66, w: 120, h: 60 }
    L.ganhe = cel ? { x: 0, y: VH - 78 - hmin, w: VW, h: hmin } : L.premios
    L.resumo = cel ? L.mesa : { x: 4, y: VH - 66, w: VW - 132, h: 60 }
    // escolha do espólio: 3 cartões no meio (PC: mais afastados, com o texto embaixo de cada um)
    if (cel) { const ey = Math.floor(VH * 0.36), ex = Math.floor((VW - (56 * 3 + 8)) / 2); L.espolio = [0, 1, 2].map((i) => ({ x: ex + i * 60, y: ey, w: 56, h: 78 })); L.passo = 60 } else {
      const passo = Math.min(130, Math.floor((VW - 8) / 3)), ey = Math.max(58, Math.floor(VH * 0.3) - 6); L.passo = passo
      L.espolio = [0, 1, 2].map((i) => ({ x: Math.floor(VW / 2) + (i - 1) * passo - 28, y: ey, w: 56, h: 78 }))
    }
    // fim de partida: placa embaixo, tela cheia
    if (cel) { L.fimPainel = { x: 0, y: VH - 139, w: VW, h: 139 }; L.fimBotoes = [{ x: 4, y: VH - 29, w: VW - 72, h: 26 }, { x: VW - 64, y: VH - 29, w: 60, h: 26 }] } else {
      const pw = Math.min(VW - 8, 420), px = (VW - pw) >> 1
      L.fimPainel = { x: px, y: VH - 98, w: pw, h: 96 }; L.fimBotoes = [{ x: px + 8, y: VH - 34, w: 196, h: 26 }, { x: px + 214, y: VH - 34, w: pw - 222, h: 26 }]
    }
    // replay (modo servidor): a faixa de baixo com a carta do passo, o texto e os botões (SKIP TO FIGHT; no fim WATCH AGAIN e BACK)
    { const R = cel ? L.mesa : { x: (VW - 250) >> 1, y: VH - 90, w: 250, h: 88 }, by = cel ? VH - 30 : VH - 32
      L.replay = { R, carta: { x: R.x + 4, y: cel ? VH - 83 : R.y + 5 }, pular: { x: R.x + 64, y: by, w: R.w - 68, h: 26 }, rever: { x: R.x + 4, y: by, w: Math.floor((R.w - 12) * 0.6), h: 26 }, voltar: { x: R.x + 8 + Math.floor((R.w - 12) * 0.6), y: by, w: R.w - 12 - Math.floor((R.w - 12) * 0.6), h: 26 } } }
    UI.L = L
    return L
  }
  /** RELÍQUIAS NO HUD (celular e PC): ícones pequenos; um toque mostra o efeito de uma por vez. Devolve o retângulo em px de arte
   *  ({ x, y, w } da fileira de ícones, `passo`, e `toque` = o retângulo do botão) ou null. */
  function reliquiasRet() {
    const n = M.reliquias.length, f = M.fase
    if (!n || f === 'chefe' || f === 'derrota' || f === 'fim') return null
    const L = UI.L, bs = L.bs, hmin = 44 / C.css, w = n * 14 * bs
    let fx = 50; for (const fa of M.familias || []) fx += 9 + Arte.largura(`${fa.n}/${fa.precisa}`, 'mini-contorno') + 4 + (fa.ligada ? 5 : 0)
    if (L.cel) {
      // no céu, logo abaixo dos botões do topo, à direita; na luta desce para baixo da barra de força
      const topo = Math.ceil(L.menu.y + 26 * bs + Math.max(0, (hmin - 26 * bs) / 2)) + 1
      let y = f === 'luta' ? Math.max(topo, 50 * bs) : topo
      const x = C.VW - 2 * bs - w
      if (f !== 'luta' && fx * bs + 2 > x && y < 40 * bs) y = Math.max(topo, 40 * bs) // as famílias chegaram até aqui: desce uma linha
      return { x, y: y + 1, w, passo: 14 * bs, toque: { x: Math.max(0, Math.min(x, C.VW - Math.max(w, hmin))), y, w: Math.max(w, hmin), h: Math.max(15 * bs, hmin) } }
    }
    const x = (f === 'luta' ? 50 : fx) * bs, lim = Math.floor(C.VW / 2) - 70 * bs, cabem = Math.max(1, Math.min(n, Math.floor((lim - x) / (14 * bs))))
    return { x, y: 15 * bs, w: cabem * 14 * bs, passo: 14 * bs, cabem, toque: { x, y: 15 * bs - 1, w: cabem * 14 * bs, h: 15 * bs } }
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
    if (M.replay) { // assistindo: sair, som, velocidade; entre as lutas, pular para a próxima; no fim, ver de novo ou voltar
      add('sair-replay', L.menu, T.srv.replay.sair); add('som', L.som, T.aria.som); add('vel', L.lutar, T.aria.vel(M.vel))
      if (M.replay.fim) { add('rever', L.replay.rever, T.srv.replay.rever); add('voltar-replay', L.replay.voltar, T.srv.replay.voltar) } else if (f === 'replay' && M.replay.pular) add('pular-luta', L.replay.pular, T.srv.replay.pular)
      return b
    }
    if (f === 'fim') { if (!M.fim?.contou) { add('seguir', { x: 0, y: 0, w: C.VW, h: C.VH }, T.aria.pular); return b } add('denovo', L.fimBotoes[0], T.deNovo); add('postar', L.fimBotoes[1], T.postar); add('menu', L.menu, T.aria.menu); return b }
    if (f === 'chefe' || f === 'derrota') { add('seguir', { x: 0, y: 0, w: C.VW, h: C.VH }, T.aria.seguir); return b }
    if (f === 'vitoria' && M.vitoria?.reino && !M.vitoria.pronto) { add('seguir', { x: 0, y: 0, w: C.VW, h: C.VH }, T.aria.pular); return b } // R39: a festa do reino pula com um toque
    add('menu', L.menu, T.aria.menu); add('som', L.som, T.aria.som)
    { const rr = reliquiasRet(); if (rr) add('reliquias', rr.toque, T.aria.reliquias) }
    if (f === 'luta') { add('vel', L.lutar, T.aria.vel(M.vel)); return b }
    if (f === 'vitoria') { if (M.vitoria?.pronto) M.espolios.forEach((e, i) => add('espolio' + i, L.espolio[i], T.aria.espolio(nomeEspolio(e)), { espolio: i }, { desliga: !M.espolioPode[i] })); return b }
    // tela baixa (320×568): o toque do terreno começa abaixo do botão de sortear/consertar quando os dois se encontram
    const tampa = L.cel && f === 'carta' ? [M.cartaPosta ? null : L.sortear, M.consertar.visivel ? L.consertar : null].filter(Boolean) : []
    for (let k = 1; k <= 6; k++) {
      const a = C.areaDoTerreno(k), x = Math.max(0, a.x), w = Math.min(a.w, C.VW - x); let y = a.y, h = a.h
      for (const r of tampa) { const fim = r.y + r.h + Math.max(0, (44 / C.css - r.h) / 2) + 1; if (x < r.x + r.w && x + w > r.x && y < fim && h - (fim - y) >= 44 / C.css) { h -= fim - y; y = fim } }
      add('terreno' + k, { x, y, w, h }, T.aria.terreno(k), { terreno: k })
    }
    if (f === 'terreno') { add('voltar', L.voltar, T.voltar); return b }
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
      w = Math.min(w, innerWidth); h = Math.min(h, innerHeight)
      px = Math.max(0, Math.min(px, innerWidth - w)); py = Math.max(0, Math.min(py, innerHeight - h))
      d.style.cssText = `left:${px}px;top:${py}px;width:${w}px;height:${h}px`
      d.setAttribute('aria-label', x.rotulo); d.dataset.dados = JSON.stringify(x.dados)
      for (const [k, v] of Object.entries(x.dados)) d.dataset[k] = v
      d.disabled = !!x.desliga; d.classList.toggle('km-arrasta', !!x.arrasta)
      if (d.parentNode !== camada) camada.appendChild(d)
    }
    for (const [id, d] of el) if (!vistos.has(id) && d.parentNode) { if (document.activeElement === d) { d.blur(); UI.querFoco = true } d.remove() }
    // a ordem na página segue a lista (Tab anda na ordem certa)
    b.forEach((x, i) => { const d = el.get(x.id); if (camada.children[i] !== d) camada.insertBefore(d, camada.children[i] || null) })
    // o botão que tinha o foco saiu com a fase: o foco vai para o controle principal da fase nova (nunca fica no BODY)
    if (UI.querFoco) { const d = el.get(principal()); if (d && d.parentNode && !d.disabled) { UI.querFoco = false; d.focus({ preventScroll: true }) } }
  }
  /** O controle principal de cada fase (para onde o foco do teclado vai). */
  function principal() {
    const f = M.fase
    if (M.replay) return 'sair-replay'
    if (f === 'carta') return M.cartaPosta ? 'lutar2' : 'carta0'
    if (f === 'luta') return 'vel'
    if (f === 'vitoria') { const i = M.espolioPode.findIndex(Boolean); return M.vitoria?.pronto && i >= 0 ? 'espolio' + i : '' }
    if (f === 'terreno') { const ts = C.destaque?.terrenos ? [...C.destaque.terrenos].sort() : []; return ts.length ? 'terreno' + ts[0] : 'voltar' }
    if (f === 'fim') return M.fim?.contou ? 'denovo' : 'seguir'
    return 'seguir'
  }
  UI.focar = () => { UI.querFoco = true; UI.mudou() }
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
      const lin = e.reliquia ? quebrar(CONFIG.RELIQUIAS[e.reliquia].nome, 46) : e.tipo === 'promocao' ? [T.maisNivel] : [`+${e.ouro} ${T.ouro}`] // R31: bolsa sem relíquia = só o ouro (a chance já foi sorteada)
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
    if (L.cel || (M.fase !== 'vitoria' && M.fase !== 'chefe')) {
      const s = `${T.rodada} ${M.rodada}`, w = Arte.largura(s, 'reino-contorno'), rx = L.cel ? 3 : Math.floor(HW / 2) - (w >> 1), ry = L.cel ? 17 : 4
      Arte.texto(g, s, rx, ry, { fonte: 'reino-contorno' })
      // estrada de um amigo: a meta a bater fica à vista ao lado da rodada
      if (M.desafio && M.desafio.rodadas != null) { Arte.texto(g, T.bater(M.desafio.rodadas), rx + w + 5, ry + 1, { fonte: Arte.temFonte('mini-ouro') ? 'mini-ouro' : 'mini-contorno' }); viu('desafio') } else if (M.modoRot) { Arte.texto(g, M.modoRot, rx + w + 5, ry + 1, { fonte: Arte.temFonte('mini-ouro') ? 'mini-ouro' : 'mini-contorno' }); viu('modo') } // modo servidor: TRAINING / RANKED / DAILY ROAD / REPLAY
    }
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
    }
    { // relíquias que o jogador tem: ícones pequenos (a acesa é a que a faixa de informação está explicando)
      const rr = reliquiasRet()
      if (rr) {
        const x0 = rr.x / bs, y0 = rr.y / bs, n = rr.cabem ?? M.reliquias.length, nova = M.relNova && agora - M.relNova < 1600
        if (L.cel) { g.fillStyle = COR.ameixa; g.globalAlpha = 0.55; g.fillRect(x0 - 2, y0 - 1, n * 14 + 2, 15); g.globalAlpha = 1 }
        for (let i = 0; i < n; i++) {
          const acesa = M.relSel === i
          if (acesa && (C.menos || !nova || ((agora >> 7) & 1))) { g.fillStyle = COR.ouro; g.fillRect(x0 + i * 14 - 1, y0 - 1, 15, 15); g.fillStyle = COR.ameixa; g.fillRect(x0 + i * 14, y0, 13, 13) }
          Arte.reliquia(g, M.reliquias[i], x0 + i * 14, y0)
        }
        viu('reliquiasHud')
      }
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
    metaDoReino(HW)
    g.restore()
    if (M.fase === 'chefe' || M.fase === 'derrota') return
    if (M.replay) hudBt('red', L.menu, 'sair-replay', (x0, y0, w) => Arte.texto(g, 'X', x0 + (w >> 1), y0 + 7, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' }))
    else hudBt('plum', L.menu, 'menu', (x0, y0, w) => { g.fillStyle = COR.creme; for (let i = 0; i < 3; i++) g.fillRect(x0 + 6, y0 + 7 + i * 4, w - 12, 2) })
    hudBt('plum', L.som, 'som', (x0, y0, w) => Arte.icone(g, M.mudo ? 'sound-off' : 'sound-on', x0 + ((w - 11) >> 1), y0 + 6))
    if (M.fase === 'luta' || M.fase === 'replay') hudBt('green', L.lutar, 'vel', (x0, y0, w) => { Arte.icone(g, 'speed', x0 + (w >> 1) - 12, y0 + 6); Arte.texto(g, 'x' + M.vel, x0 + (w >> 1) + 1, y0 + 7, { fonte: 'reino', cor: COR.creme }) })
    else if (M.fase === 'carta') {
      const pulsa = M.pulsaLutar && !C.menos ? Math.round(Math.abs(Math.sin(agora / 240)) * 2) : 0
      hudBt('green', { ...L.lutar, y: L.lutar.y - pulsa }, 'lutar', (x0, y0, w) => Arte.texto(g, T.lutar, x0 + (w >> 1), y0 + 7, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' }))
      if (M.pulsaLutar && C.menos) { moldura(L.lutar.x - 1, L.lutar.y - 1, L.lutar.w + 2, 26 * bs + 2); viu('lutarFixo') } // Reduced motion: destaque parado
    }
  }
  /** R39 — A META DA PARTIDA à vista na fase de carta: "HOLD TO ROUND 20" (letra miúda, no céu, fora do caminho do HUD); depois de
   *  vencer, no MESMO lugar, o selo de ouro "HELD". Celular: à direita dos botões de sortear/consertar, abaixo das relíquias. PC:
   *  centrado sob a rodada (sob o logo, na abertura). Desenhado dentro do espaço ×bs do HUD. */
  function metaDoReino(HW) {
    UI.metaRet = null
    if (!M.meta || M.fase !== 'carta' || M.replay) return
    const L = UI.L, bs = L.bs, s = M.venceu ? T.resistiu : T.meta(M.meta), fo = M.venceu && Arte.temFonte('mini-ouro') ? 'mini-ouro' : 'mini-contorno', w = Arte.largura(s, fo)
    const x = L.cel ? Math.min(Math.ceil((L.consertar.x + L.consertar.w) / bs) + 4, Math.floor(HW) - w - 6) : Math.floor(HW / 2) - (w >> 1), y = L.cel ? Math.ceil(L.sortear.y / bs) + 17 : M.primeira ? 30 : 15
    if (M.venceu) { g.fillStyle = COR.ameixa; g.fillRect(x - 4, y - 3, w + 8, 12); g.fillStyle = COR.ouro; g.fillRect(x - 4, y - 3, w + 8, 1); g.fillRect(x - 4, y + 8, w + 8, 1); g.fillRect(x - 5, y - 2, 1, 10); g.fillRect(x + w + 4, y - 2, 1, 10) }
    Arte.texto(g, s, x, y, { fonte: fo })
    UI.metaRet = { x: (x - 5) * bs, y: (y - 3) * bs, w: (w + 10) * bs, h: 12 * bs, texto: s }
    viu(M.venceu ? 'resistiu' : 'meta')
  }
  function ouroBt(r, id, icone, st, agora, nome) {
    const bs = UI.L.bs, armado = M.armado === id
    g.save(); g.scale(bs, bs)
    const q = { x: r.x / bs, y: r.y / bs, w: r.w / bs, h: 26 }
    const d = bt(armado ? 'green' : 'plum', q, id, !st.pode)
    if (armado) { Arte.texto(g, T.confirma, q.x + (q.w >> 1), q.y + 6 + d, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' }); Arte.texto(g, String(st.custo), q.x + (q.w >> 1), q.y + 12 + d, { fonte: 'mini', cor: COR.ouro, alinhar: 'centro' }) } else {
      // o nome do botão em cima ("REROLL"), o ícone e o preço embaixo
      Arte.texto(g, nome, q.x + (q.w >> 1), q.y + 3 + d, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' }); viu('nome:' + id)
      const wc = Arte.largura(String(st.custo), 'reino'), x0 = q.x + ((q.w - 13 - wc) >> 1)
      Arte.icone(g, icone, x0, q.y + 9 + d); Arte.texto(g, String(st.custo), x0 + 13, q.y + 11 + d, { fonte: 'reino', cor: st.pode ? COR.ouro : COR.pedra[1] })
    }
    g.globalAlpha = 1
    if (st.destaque && !armado) {
      // ouro parado e vida perdida: o conserto chama a atenção (mais forte na última vida: pisca mais depressa e ganha a seta)
      if (C.menos || ((agora >> (st.forte ? 7 : 8)) & 1)) moldura(q.x - 1, q.y - 1, q.w + 2, 28)
      if (st.forte) { const b = C.menos ? 0 : Math.round(Math.abs(Math.sin(agora / 200)) * 3); g.save(); g.translate(q.x + (q.w >> 1), q.y + 34 + b); Arte.icone(g, 'up', -5, -5); g.restore() }
      viu('consertoDestaque'); if (st.forte) viu('consertoForte')
    }
    g.restore()
  }
  /** As chances de raridade do sorteio junto do botão de sortear: quadradinho da cor + NOME + % (números do motor/servidor; só as que podem sair). */
  function chances() {
    const o = UI.L.odds; if (!M.chances.length || !o.linhas) return
    if (UI.L.cel) { g.fillStyle = COR.ameixa; g.globalAlpha = 0.5; o.linhas.forEach((lin, i) => { const x0 = o.dx[i] ? o.x + o.dx[i] - 2 : 0; g.fillRect(x0, o.y + i * o.alt, C.VW - x0, o.alt) }); g.globalAlpha = 1 } // (a tira escura acompanha cada linha: nada por cima do botão nem dos terrenos)
    o.linhas.forEach((lin, i) => {
      const y = o.y + i * o.alt + (UI.L.cel ? 1 : 0)
      for (const it of lin) {
        let x = o.x + (o.dx[i] || 0) + it.x
        if (it.c) { g.fillStyle = COR.ameixa; g.fillRect(x, y, 7, 7); g.fillStyle = it.c.cor; g.fillRect(x + 1, y + 1, 5, 5); g.fillStyle = it.c.claro; g.fillRect(x + 1, y + 1, 5, 1); x += 9 }
        Arte.texto(g, it.s, x, y, { fonte: o.fonte })
      }
    })
    C.zonaChances = { x: UI.L.cel ? 0 : o.x, y: o.y, w: UI.L.cel ? C.VW : Math.max(...o.linhas.map((lin) => { const u = lin.at(-1); return u ? u.x + u.w : 0 })), h: o.h, linhas: o.linhas.map((lin, i) => { const u = lin.at(-1), x0 = o.x + (o.dx[i] || 0); return { x: x0, y: o.y + i * o.alt, w: u ? u.x + u.w : 0, h: o.alt } }) } // R38: a cena desvia a seta do terreno desta zona (e o teste confere linha a linha)
    UI.letra.chances = (UI.L.letraGrande ? 7 : 5) * C.css
    viu('chances'); viu('chancesNomes')
  }

  // ---------------------------------------------------------------- mão, mesa, faixa de informação
  /** RODADAS COM 1–2 TERRENOS no celular: o painel "damage by plot" não diz nada (uma barra só) — sai, e a cena fica com o espaço;
   *  na base fica uma tira curta com a contagem dos dois lados, o MVP e a linha "WIN:". */
  const baseCurta = () => { const R = M.resumo, f = M.fase; return !!R && UI.L.cel && !M.replay && (f === 'luta' || f === 'derrota' || (f === 'vitoria' && !M.vitoria?.pronto)) && R.cartas.filter(Boolean).length <= 2 }
  function mesa() { const L = UI.L; if (!L.cel) return; if ((M.baseCurta = baseCurta())) return; g.fillStyle = COR.ameixa; g.fillRect(0, L.mesa.y - 1, C.VW, 1); g.fillStyle = COR.painel; g.fillRect(0, L.mesa.y, C.VW, L.mesa.h); g.fillStyle = COR.filete; g.fillRect(0, L.mesa.y, C.VW, 1) }
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
  /** A linha "WIN: A / B / C" inteira; se não couber, com a última palavra de cada nome; se ainda não couber, "WIN: PICK 1 OF 3" (nunca cortada). */
  function linhaGanhe(larg) {
    const cheio = `${T.ganhe} ${M.espolios.map(nomeEspolio).join(' / ')}`
    if (Arte.largura(cheio, 'mini') <= larg) return cheio
    const curto = `${T.ganhe} ${M.espolios.map((e) => (e.tipo === 'carta' || e.reliquia ? nomeEspolio(e).split(' ').at(-1) : nomeEspolio(e))).join(' / ')}`
    return Arte.largura(curto, 'mini') <= larg ? curto : T.ganheN(M.espolios.length)
  }
  function premios(grande) {
    const L = UI.L, p = L.premios
    if (!M.espolios.length) return
    if (!grande) { faixa(['#' + linhaGanhe(C.VW - 6)]); viu('ganhe'); return }
    if (L.cel) {
      // celular: a base inteira — "WIN:" e os 3 espólios em ladrilhos grandes (os mesmos da escolha), com o nome embaixo
      Arte.painel(g, p.x, p.y, p.w, p.h)
      Arte.texto(g, T.ganhe, p.x + 5, p.y + 5, { fonte: 'mini', cor: COR.ouro })
      const x1 = p.x + 22, passo = Math.floor((p.w - 26) / 3)
      M.espolios.forEach((e, i) => {
        const cx = x1 + i * passo + (passo >> 1), nome = e.tipo === 'promocao' ? 'Promotion' : e.tipo === 'carta' ? 'Card' : 'Purse'
        if (e.reliquia) { g.fillStyle = COR.ameixa; g.fillRect(cx - 16, p.y + 4, 32, 32); g.fillStyle = '#4E3A66'; g.fillRect(cx - 15, p.y + 5, 30, 30); moldura(cx - 16, p.y + 4, 32, 32); Arte.reliquia(g, e.reliquia, cx - 13, p.y + 7, 2) } else if (!Arte.ui(g, 'loot.' + nome, cx - 22, p.y - 2)) Arte.icone(g, e.tipo === 'carta' ? 'troop' : e.tipo === 'promocao' ? 'up' : 'gold', cx - 5, p.y + 14)
        const lin = quebrar(e.tipo === 'promocao' ? T.maisNivel : e.tipo === 'bolsa' && !e.reliquia ? `+${e.ouro} ${T.ouro}` : nomeEspolio(e), passo - 2)
        lin.slice(0, 2).forEach((q, j) => Arte.texto(g, q, cx, p.y + (lin.length > 1 ? 40 : 43) + j * 6, { fonte: 'mini', cor: e.reliquia || e.tipo === 'bolsa' ? COR.ouro : COR.creme, alinhar: 'centro' }))
      })
      viu('ganhe'); return
    }
    Arte.painel(g, p.x, p.y, p.w, p.h)
    Arte.texto(g, T.ganhe, p.x + 6, p.y + 5, { fonte: 'mini', cor: COR.ouro })
    M.espolios.forEach((e, i) => {
      const passo = Math.floor((p.w - 8) / 3), x = p.x + 4 + i * passo, lin = quebrar(nomeEspolio(e), passo - 2)
      if (e.reliquia) Arte.reliquia(g, e.reliquia, x + (passo >> 1) - 6, p.y + 12); else Arte.icone(g, e.tipo === 'carta' ? { tropa: 'troop', construcao: 'building', magia: 'magic' }[CONFIG.CARTAS[e.carta].tipo] : e.tipo === 'promocao' ? 'up' : 'gold', x + (passo >> 1) - 5, p.y + 13)
      lin.slice(0, 3).forEach((s, j) => Arte.texto(g, s, x + (passo >> 1), p.y + 26 + j * 6, { fonte: 'mini', cor: e.reliquia ? COR.ouro : COR.creme, alinhar: 'centro' }))
    })
    // o pé do painel não fica vazio: o que fazer com isto, em 1 linha
    if (Arte.largura(T.ganheAjuda, 'mini') <= p.w - 8) { Arte.texto(g, T.ganheAjuda, p.x + (p.w >> 1), p.y + p.h - 11, { fonte: 'mini', cor: COR.pedra[2], alinhar: 'centro' }); viu('ganheAjuda') }
    viu('ganhe')
  }
  /** REVELAÇÃO DA MÃO: as 3 cartas chegam VIRADAS e viram em cascata (uma a cada `passo` ms). A carta rara (Rare para cima) brilha
   *  na cor da raridade antes de virar. Reduced motion, ou um toque numa carta: as três já abertas. */
  const REVELA = UI.REVELA = { espera: 280, passo: 120, vira: 140 }
  function verso(x, y, cor, agora) {
    Arte.painel(g, x, y, 56, 78)
    g.fillStyle = COR.ameixa; g.fillRect(x + 5, y + 5, 46, 68); g.fillStyle = '#4E3A66'; g.fillRect(x + 6, y + 6, 44, 66)
    g.fillStyle = COR.ameixa; for (let j = 0; j < 5; j++) for (let i = 0; i < 4; i++) if ((i + j) & 1) g.fillRect(x + 8 + i * 11, y + 9 + j * 13, 7, 8)
    Arte.texto(g, '?', x + 28, y + 34, { fonte: 'reino-contorno', alinhar: 'centro' })
    if (cor) { const b = ((agora / 110) | 0) & 1; moldura(x - 1 - b, y - 1 - b, 58 + 2 * b, 80 + 2 * b, cor.cor, cor.claro); g.fillStyle = cor.claro; g.fillRect(x + 6 + ((agora / 60 | 0) % 40), y + 3, 3, 1); g.fillRect(x + 46 - ((agora / 60 | 0) % 40), y + 74, 3, 1) }
  }
  function mao(agora) {
    const L = UI.L, base = M.maoFixo ?? agora - M.maoT0, aberta = C.menos || M.maoRevelada
    let viradas = 0
    M.mao.forEach((c, i) => {
      if (M.arrasto && M.arrasto.indice === i && M.arrasto.moveu) return
      const r = L.cartas[i], dt = base - i * 90
      if (dt < 0) { if (!aberta) viradas++; return }
      let y = r.y + (C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 220) * 60))
      const sel = M.sel === i
      if (sel) y -= 9
      else if (M.primeira && M.sel < 0 && i === 1 && !C.menos) y -= Math.round(Math.abs(Math.sin(agora / 300)) * 4) // a do meio balança: "toque em mim"
      // virada (0 = verso inteiro, 1 = frente inteira): o cartão estreita até o meio, troca de face e abre
      const tv = aberta ? 1 : Math.max(0, Math.min(1, (base - REVELA.espera - i * REVELA.passo) / REVELA.vira)), frente = tv >= 0.5
      if (!frente) viradas++; else if (!aberta && M.maoLog && M.maoLog[i] == null) M.maoLog[i] = Math.round(agora)
      const larg = tv <= 0 || tv >= 1 ? 1 : Math.max(0.1, Math.abs(1 - 2 * tv))
      if (larg < 1) { g.save(); g.translate(r.x + 28, 0); g.scale(larg, 1); g.translate(-(r.x + 28), 0) }
      if (frente) {
        if (sel) { g.fillStyle = COR.ouro; g.fillRect(r.x - 2, y - 2, 60, 82); g.fillStyle = '#FFF096'; g.fillRect(r.x - 1, y - 1, 58, 80) }
        Arte.carta(g, c.carta, c.nivel, r.x, y)
        if (c.sobe && larg === 1) { const q = C.menos ? 0 : (agora / 120) | 0; if (!Arte.ui(g, 'level-up', r.x + 5, y - 9, q)) Arte.texto(g, T.sobe, r.x + 28, y - 8, { fonte: 'reino-ouro', alinhar: 'centro' }) }
      } else {
        const rar = CONFIG.CARTAS[c.carta].raridade, iR = CONFIG.RARIDADES.findIndex((x) => x.id === rar), rara = iR >= 2 ? { id: rar, ...Arte.Cod.RARIDADE_COR[rar] } : null
        verso(r.x, y, rara, agora); if (rara) viu('maoRara')
      }
      if (larg < 1) g.restore()
    })
    M.maoViradas = viradas
    if (viradas) viu('maoVirada'); else if (!aberta) M.maoRevelada = true
  }
  function setaCarta(agora) {
    const L = UI.L
    // primeira partida: uma seta "TAP A CARD" em cima da mão (some depois do 1º toque numa carta)
    if (M.setaCarta && M.sel < 0 && !M.cartaPosta && agora - M.maoT0 > 500 && !M.maoViradas) {
      const r = L.cartas[1], cx = r.x + 28, b = C.menos ? 0 : Math.round(Math.abs(Math.sin(agora / 260)) * 4), y = r.y - (L.cel ? 34 : 30) - b, w = Arte.largura(T.toqueCarta, 'reino-ouro') + 10
      g.fillStyle = COR.ameixa; g.globalAlpha = 0.85; g.fillRect(cx - (w >> 1), y - 2, w, 13); g.globalAlpha = 1; g.fillStyle = COR.ouro; g.fillRect(cx - (w >> 1), y - 2, w, 1); g.fillRect(cx - (w >> 1), y + 10, w, 1)
      Arte.texto(g, T.toqueCarta, cx, y, { fonte: 'reino-ouro', alinhar: 'centro' })
      g.save(); g.translate(cx, y + 19); g.scale(1, -1); Arte.icone(g, 'up', -5, -5); g.restore()
      viu('setaCarta')
    }
  }
  /** RESUMO DA LUTA (ao vivo e no fim): contagem dos dois lados, dano por terreno em colunas e o MVP. Só mostra o que os eventos do motor disseram. */
  function resumoCurto(comGanhe) {
    const R = M.resumo, ganhe = comGanhe && M.espolios.length, h = ganhe ? 23 : 14, y = C.VH - h
    g.fillStyle = COR.ameixa; g.fillRect(0, y - 1, C.VW, 1); g.fillStyle = COR.painel; g.fillRect(0, y, C.VW, h); g.fillStyle = COR.filete; g.fillRect(0, y, C.VW, 1)
    Arte.icone(g, 'shield', 4, y + 2); Arte.texto(g, `${R.aliados}/${R.aliadosTotal}`, 17, y + 3, { fonte: 'reino-contorno' })
    Arte.icone(g, 'horn', C.VW - 15, y + 2); Arte.texto(g, `${R.inimigos}/${R.inimigosTotal}`, C.VW - 17, y + 3, { fonte: 'reino-contorno', alinhar: 'direita' })
    const nome = R.mvp > 0 ? CONFIG.CARTAS[R.cartas[R.mvp]]?.nome : R.mvp === 0 ? T.resumo.magia : null
    if (nome && R.dano[R.mvp] > 0) { const t = `${nome} ${R.dano[R.mvp]}`, larg = C.VW - 2 * (20 + Arte.largura('00/00', 'reino-contorno')); if (Arte.largura(t, 'mini') <= larg) Arte.texto(g, t, C.VW >> 1, y + 5, { fonte: 'mini', cor: COR.ouro, alinhar: 'centro' }) }
    if (ganhe) Arte.texto(g, linhaGanhe(C.VW - 6), C.VW >> 1, y + 15, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' })
    M.resumoCurtoRet = { x: 0, y, w: C.VW, h }
    viu('resumoCurto')
  }
  function resumo(r, comGanhe) {
    const R = M.resumo; if (!R) return
    const cel = UI.L.cel
    if (cel && baseCurta()) { resumoCurto(comGanhe); return }
    if (!cel) Arte.painel(g, r.x, r.y, r.w, r.h)
    const x0 = r.x + 5, y0 = r.y + 4, xr = r.x + r.w - 5, H = cel ? 26 : 20
    Arte.icone(g, 'shield', x0, y0 - 1); Arte.texto(g, `${R.aliados}/${R.aliadosTotal}`, x0 + 13, y0, { fonte: 'reino-contorno' })
    Arte.icone(g, 'horn', xr - 11, y0 - 1); Arte.texto(g, `${R.inimigos}/${R.inimigosTotal}`, xr - 13, y0, { fonte: 'reino-contorno', alinhar: 'direita' })
    Arte.texto(g, T.resumo.dano, r.x + (r.w >> 1), y0 + 2, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' })
    // celular: só os terrenos OCUPADOS (e a magia, se bateu), um por LINHA, com o nome da carta, a barra e o número — a linha cresce
    // quando há poucos; nada de coluna vazia. PC: as 7 colunas.
    const cols = []
    for (let n = 0; n < 7; n++) { const k = n < 6 ? n + 1 : 0; if (!cel || (k ? R.cartas[k] : R.dano[0] > 0)) cols.push(k) }
    if (!cols.length) cols.push(1)
    UI.resumoCols = cols.length
    const max = Math.max(1, ...R.dano)
    if (cel) {
      const area = r.h - 28 - (comGanhe ? 0 : -8), alt = Math.max(8, Math.min(14, Math.floor(area / cols.length))), fonte = alt >= 11 ? 'reino' : 'mini', fh = alt >= 11 ? 7 : 5
      const wn = Math.min(84, Math.max(...cols.map((k) => Arte.largura(k === 0 ? T.resumo.magia : R.cartas[k] ? CONFIG.CARTAS[R.cartas[k]].nome : '', fonte)))), bx = r.x + 16 + wn + 4, bw = r.x + r.w - 34 - bx
      let y = y0 + 14 + Math.max(0, (area - alt * cols.length) >> 1)
      for (const k of cols) {
        const id = R.cartas[k], v = R.dano[k], mvp = R.mvp === k && v > 0, cor = mvp ? COR.ouro : k === 0 ? '#CECAD8' : id ? Arte.FAMILIA_COR[CONFIG.CARTAS[id].familia].cor : '#4E3A66', bh = alt - 4
        const nome = k === 0 ? T.resumo.magia : id ? CONFIG.CARTAS[id].nome : ''
        Arte.texto(g, k === 0 ? '*' : String(k), r.x + 8, y + ((bh - fh) >> 1), { fonte, cor: COR.pedra[2], alinhar: 'centro' })
        Arte.texto(g, quebrar(nome, wn + 1, fonte)[0] || '', r.x + 16, y + ((bh - fh) >> 1), { fonte, cor: mvp ? COR.ouro : COR.creme })
        g.fillStyle = COR.ameixa; g.fillRect(bx - 1, y - 1, bw + 2, bh + 2); g.fillStyle = '#4E3A66'; g.fillRect(bx, y, bw, bh)
        const w = v > 0 ? Math.max(2, Math.round((bw * v) / max)) : 0
        if (w) { g.fillStyle = cor; g.fillRect(bx, y, w, bh); g.fillStyle = '#FFF6E0'; g.globalAlpha = 0.35; g.fillRect(bx, y, w, 1); g.globalAlpha = 1 }
        Arte.texto(g, String(v), r.x + r.w - 5, y + ((bh - 7) >> 1), { fonte: mvp ? 'reino-ouro' : 'reino-contorno', alinhar: 'direita' })
        if (mvp && bw >= 30) Arte.texto(g, T.resumo.mvp, bx + 3, y + ((bh - 5) >> 1), { fonte: 'mini', cor: COR.ameixa })
        y += alt
      }
    } else {
      const passo = Math.min(30, Math.floor((r.w - 10) / 7)), bx = x0, by = y0 + 18
      cols.forEach((k, n) => {
        const id = R.cartas[k], v = R.dano[k], cx = bx + n * passo + (passo >> 1), mvp = R.mvp === k && v > 0
        const h = v > 0 ? Math.max(2, Math.round((H * v) / max)) : 0, cor = mvp ? COR.ouro : k === 0 ? '#CECAD8' : id ? Arte.FAMILIA_COR[CONFIG.CARTAS[id].familia].cor : '#4E3A66'
        g.fillStyle = COR.ameixa; g.fillRect(cx - 7, by + H, 14, 1)
        if (h) { g.fillStyle = COR.ameixa; g.fillRect(cx - 7, by + H - h - 1, 14, h + 1); g.fillStyle = cor; g.fillRect(cx - 6, by + H - h, 12, h); g.fillStyle = '#FFF6E0'; g.globalAlpha = 0.35; g.fillRect(cx - 6, by + H - h, 12, 1); g.globalAlpha = 1 }
        if (v > 0) Arte.texto(g, String(v), cx, by + H - h - 7, { fonte: mvp && Arte.temFonte('mini-ouro') ? 'mini-ouro' : 'mini-contorno', alinhar: 'centro' })
        Arte.texto(g, mvp ? T.resumo.mvp : k === 0 ? 'MAG' : String(k), cx, by + H + 3, { fonte: 'mini', cor: mvp ? COR.ouro : id || (k === 0 && v > 0) ? COR.creme : COR.pedra[2], alinhar: 'centro' })
      })
      const nomeMvp = R.mvp > 0 ? CONFIG.CARTAS[R.cartas[R.mvp]]?.nome : R.mvp === 0 ? T.resumo.magia : null
      if (nomeMvp) { const s = `${T.resumo.mvp}: ${nomeMvp} ${R.dano[R.mvp]}`; quebrar(s, r.w - passo * 7 - 14).slice(0, 3).forEach((q, i) => Arte.texto(g, q, bx + passo * 7 + 4, by + 4 + i * 7, { fonte: 'mini', cor: COR.ouro })) }
      // ninguém bateu ainda (começo da luta): o canto do MVP explica o painel em vez de ficar vazio
      else if (r.w - passo * 7 - 14 >= 60) { quebrar(T.resumo.ajuda, r.w - passo * 7 - 14).slice(0, 4).forEach((q, i) => Arte.texto(g, q, bx + passo * 7 + 4, by + 4 + i * 7, { fonte: 'mini', cor: COR.pedra[2] })); viu('resumoAjuda') }
    }
    if (cel && comGanhe && M.espolios.length) Arte.texto(g, linhaGanhe(r.w - 6), r.x + (r.w >> 1), r.y + r.h - 9, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' })
    viu('resumo')
  }

  // ---------------------------------------------------------------- camadas de momento
  const escurecer = (a) => { g.globalAlpha = a; g.fillStyle = '#1C1230'; g.fillRect(0, 0, C.VW, C.VH); g.globalAlpha = 1 }
  /** O que cada espólio faz, antes de escolher: celular na mesa (3 blocos), PC embaixo de cada cartão. */
  function descricoes() {
    const L = UI.L
    if (!M.espolioDesc.length) return
    if (L.cel) {
      const larg = C.VW - 8, opcoes = L.letraGrande ? [['reino', 9, 7]] : [['reino', 9, 7], ['mini', 6, 5]], tetoY = L.espolio[0].y + 94
      let esc = null
      for (const [fonte, alt, cap] of opcoes) {
        const blocos = M.espolioDesc.map((d) => ({ d, lin: quebrar(`${d.titulo}: ${d.texto}`, larg, fonte) })), h = 13 + blocos.reduce((a, b) => a + b.lin.length * alt + 3, 0)
        esc = { fonte, alt, cap, blocos, h }
        if (h <= L.mesa.h - 2) break
      }
      // não coube na mesa nem com a última letra: a placa cresce para cima (nunca corta o texto)
      const topo = Math.max(tetoY, Math.min(L.mesa.y, C.VH - esc.h - 2))
      if (topo < L.mesa.y) { g.fillStyle = COR.ameixa; g.fillRect(0, topo - 1, C.VW, 1); g.fillStyle = COR.painel; g.fillRect(0, topo, C.VW, L.mesa.y - topo + 1); g.fillStyle = COR.filete; g.fillRect(0, topo, C.VW, 1) }
      let y = topo + Math.max(3, (C.VH - topo - esc.h) >> 1)
      Arte.texto(g, T.pegue, C.VW >> 1, y, { fonte: 'reino-contorno', alinhar: 'centro' }); y += 13
      for (const { d, lin } of esc.blocos) {
        lin.forEach((q, i) => {
          const x = (C.VW - Arte.largura(q, esc.fonte)) >> 1, t = d.titulo + ':'
          if (i === 0 && q.toUpperCase().startsWith(t.toUpperCase())) { const wt = Arte.texto(g, t, x, y, { fonte: esc.fonte, cor: COR.ouro }); Arte.texto(g, q.slice(t.length), x + wt, y, { fonte: esc.fonte, cor: COR.creme }) } else Arte.texto(g, q, x, y, { fonte: esc.fonte, cor: i === 0 ? COR.ouro : COR.creme })
          y += esc.alt
        })
        y += 3
      }
      UI.letra.espolio = esc.cap * C.css; UI.letra.espolioFim = y; UI.letra.espolioTopo = topo
    } else { M.espolioDesc.forEach((d, i) => { const r = L.espolio[i]; quebrar(d.texto, L.passo - 6).slice(0, 3).forEach((s, j) => Arte.texto(g, s, r.x + 28, r.y + 82 + j * 7, { fonte: 'mini-contorno', alinhar: 'centro' })) }); UI.letra.espolio = 5 * C.css }
    viu('espolioDesc')
  }
  function vitoria(agora) {
    const v = M.vitoria, L = UI.L, dt = agora - v.t0, cx = C.VW >> 1, ey = L.espolio[0].y
    if (v.reino && !v.pronto) { faixaDoReino(agora, v.reino); return } // R39: a festa do reino segura a tela; os espólios vêm depois
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
    quebrar(c.texto || def.texto, C.VW - 16).forEach((s, i) => Arte.texto(g, s, cx, cy + 36 + nome.length * 20 + i * 8, { fonte: 'mini-contorno', alinhar: 'centro' }))
    viu('chefe')
  }
  /** Escurece a borda em degraus (pixel, nunca degradê liso). `a` 0..1. */
  function bordaEscura(a) {
    if (a <= 0) return
    g.fillStyle = '#1C1230'; g.globalAlpha = 0.14 * a; g.fillRect(0, 0, C.VW, C.VH)
    g.globalAlpha = 0.13 * a
    for (let i = 0; i < 4; i++) { const t = (4 - i) * 9, l = (4 - i) * 5; g.fillRect(0, 0, C.VW, t); g.fillRect(0, C.VH - t, C.VW, t); g.fillRect(0, t, l, C.VH - 2 * t); g.fillRect(C.VW - l, t, l, C.VH - 2 * t) }
    g.globalAlpha = 1
  }
  /** FIM DA PARTIDA como festa em sequência (os tempos vêm do app): a borda escurece, o número de rodadas GRANDE no centro conta de 0
   *  ao total, a faixa NEW RECORD cruza a tela e pousa junto do SCORE (o recorde é de PONTOS) — sem recorde, o melhor momento da
   *  partida e quanto faltou —, a placa sobe (pontos, liga provisória, próxima carta) e por fim os botões. Parado: tudo no lugar. */
  function fim(agora) {
    const f = M.fim, L = UI.L, cel = L.cel, P = L.fimPainel, b0 = L.fimBotoes[0], b1 = L.fimBotoes[1], cx = C.VW >> 1
    const fixo = f.parado || f.contou || C.menos, dt = fixo ? 1e9 : agora - f.t0, ouro = f.novoRecorde && f.contado
    bordaEscura(Math.min(1, dt / 450))
    // o número grande no centro
    // R39: fim com vitória = "THE KINGDOM HELD" em ouro (quebra em duas linhas quando não cabe); sem vitória, "RUN OVER" como sempre
    const tit = f.venceu ? T.fimVenceu : T.fim, linT = quebrar(tit, (C.VW - 8) / 2, 'reino-contorno'), mais = (linT.length - 1) * 20, wT = Math.max(...linT.map((s) => Arte.largura(s, 'reino-contorno'))) * 2
    const yT = cel ? Math.ceil((L.menu.y + 26 * L.bs)) + 4 : 6, k = P.y - yT - mais >= 150 ? 4 : 3, grande = Arte.temFonte('dano-g')
    const hN = (grande ? 16 : 9) * k, pulo = !fixo && f.pulo && agora - f.pulo < 70 ? 2 : 0, yH = yT + 24 + mais + hN + 4, rot = T.aguentou(f.vencidas)
    if (cel) {
      // celular: uma PLACA escura atrás do bloco (título, número e legenda) — o número não se mistura com os soldados do reino
      const wv = Math.min(C.VW - 8, Math.max(wT + (f.venceu ? 8 : 0), Arte.largura(String(f.vencidas), grande ? 'dano-g' : 'reino-contorno') * k, Arte.largura(rot, 'reino-contorno')) + 16), v = { x: cx - (wv >> 1), y: yT - 4, w: wv, h: yH + 12 - (yT - 4) }
      g.fillStyle = '#1C1230'; g.globalAlpha = 0.74; g.fillRect(v.x, v.y, v.w, v.h); g.globalAlpha = 0.4; g.fillRect(v.x - 2, v.y + 2, 2, v.h - 4); g.fillRect(v.x + v.w, v.y + 2, 2, v.h - 4); g.globalAlpha = 1
      g.fillStyle = ouro || f.venceu ? COR.ouro : COR.filete; g.fillRect(v.x, v.y, v.w, 1); g.fillRect(v.x, v.y + v.h - 1, v.w, 1)
      f.veuRet = v; viu('fimVeu')
    }
    if (f.venceu) {
      // a fita da vitória atrás do título: escura com filete de ouro e as pontas em degrau (a derrota não tem nada disto)
      const fw = Math.min(C.VW - 4, wT + 20), fx = cx - (fw >> 1), fh = linT.length * 20 + 3
      g.fillStyle = COR.carmim; g.fillRect(fx + 3, yT - 3, fw - 6, fh); g.fillStyle = '#7C2030'; g.fillRect(fx, yT, 3, fh - 6); g.fillRect(fx + fw - 3, yT, 3, fh - 6)
      g.fillStyle = COR.ouro; g.fillRect(fx + 3, yT - 3, fw - 6, 1); g.fillRect(fx + 3, yT + fh - 4, fw - 6, 1); g.fillStyle = '#FFF096'; g.fillRect(fx + 3, yT - 2, fw - 6, 1)
      f.fitaRet = { x: fx, y: yT - 3, w: fw, h: fh }; viu('fimVenceu')
    }
    linT.forEach((s, i) => Arte.titulo(g, s, cx, yT + i * 20, 2, !!f.venceu))
    f.titulo = tit; f.tituloLinhas = linT; f.tituloW = wT
    Arte.titulo(g, String(f.mostra), cx, yT + 24 + mais - pulo, k, grande ? (ouro || f.venceu ? 'dano-g-ouro' : 'dano-g') : ouro || !!f.venceu)
    Arte.texto(g, rot, cx, yH, { fonte: 'reino-contorno', alinhar: 'centro' })
    f.numeroRet = { x: cx - 30, y: yT, w: 60, h: yH + 9 - yT, k }
    viu('fimNumero')
    let y = yH + 13
    const yFaixa = y
    if (f.novoRecorde) y += 22
    // o fecho: melhor momento da partida, quanto faltou, e quem levou na estrada do amigo
    if (f.contado && dt >= f.tFaixa + (f.novoRecorde ? 500 : 0)) {
      const larg = C.VW - 12, lin = [], cabe = (t, a, b) => (Arte.largura(t, a) <= larg ? a : b)
      // RANKING COM FESTA (modo servidor): "RANK 6 > 4" com o número rolando do que o servidor dizia antes ao que diz agora
      if (f.subiu) {
        const sb = f.subiu, a = C.menos ? 1 : Math.max(0, Math.min(1, (agora - sb.t0) / sb.ms)), vai = sb.de != null && sb.para != null ? Math.round(sb.de + (sb.para - sb.de) * a) : sb.para
        if (sb.para != null) { sb.texto = sb.de != null ? T.srv.subiu.rank(sb.de, vai) : T.srv.subiu.entrou(sb.para); lin.push([sb.texto, cabe(sb.texto, 'reino-ouro', 'mini-ouro')]) }
        if (sb.liga) { const t = T.srv.subiu.liga(sb.liga); lin.push([t, cabe(t, 'reino-ouro', 'mini-ouro')]) }
        sb.mostra = vai; viu('fimSubiu')
      }
      // (R30) fim de RANKING: "RUN SCORE 100" e "SEASON SCORE 33 (AVG OF YOUR BEST 3)" junto da posição — números do servidor, a tela só escreve
      let nRk = 0
      if (f.ranking) {
        const a = T.srv.fimRanking.partida(f.ranking.pontos), b = T.srv.fimRanking.temporada(f.ranking.temporada, f.ranking.melhores)
        f.rankingLinhas = [a, b]
        lin.push([a, cabe(a, 'reino-ouro', 'mini-ouro'), 'rk']); for (const q of quebrar(b, larg, 'mini-contorno')) lin.push([q, 'mini-contorno', 'rk'])
        nRk = lin.filter((l) => l[2] === 'rk').length
      }
      if (f.amigo) for (const q of quebrar(f.amigo.texto, larg, 'mini')) lin.push([q, cabe(q, 'reino-ouro', 'mini-ouro')])
      if (f.melhor) { const junto = `${T.melhorMomento}: ${f.melhor}`; if (Arte.largura(junto, 'mini-contorno') <= larg && !cel) lin.push([junto, 'mini-ouro']); else { lin.push([T.melhorMomento, 'mini-ouro']); for (const q of quebrar(f.melhor, larg, 'mini-contorno')) lin.push([q, 'mini-contorno']) } }
      if (f.faltaLinha) lin.push([f.faltaLinha, cabe(f.faltaLinha, 'reino-contorno', 'mini-contorno')])
      const alt = (fo) => (fo.startsWith('reino') ? 11 : 8)
      while (lin.length && y + lin.reduce((a, l) => a + alt(l[1]), 0) > P.y - 2) lin.pop()
      if (lin.length) {
        const w = Math.max(...lin.map((l) => Arte.largura(l[0], l[1]))) + 10, h = lin.reduce((a, l) => a + alt(l[1]), 0) + 3
        g.fillStyle = COR.ameixa; g.globalAlpha = 0.78; g.fillRect(cx - (w >> 1), y - 2, w, h); g.globalAlpha = 1
        let yy = y
        for (const [t, fo] of lin) { Arte.texto(g, t, cx, yy, { fonte: Arte.temFonte(fo) || fo !== 'mini-ouro' ? fo : 'mini-contorno', alinhar: 'centro' }); yy += alt(fo) }
        f.fechoRet = { x: cx - (w >> 1), y: y - 2, w, h }
        if (nRk && lin.filter((l) => l[2] === 'rk').length === nRk) viu('fimPontosRanking')
        viu('fimFecho')
      }
    }
    // R31 (clareza): o SCORE grande e, embaixo, um "best" só por linha — o recorde de pontos numa linha, a média das melhores noutra
    // (no fim do ranking a média já vem no fecho como SEASON SCORE: não se repete aqui). Recorde: a faixa NEW RECORD ao lado do SCORE.
    const numeros = (x, y0, w) => {
      const ws = Arte.largura(String(f.pontos), 'reino-ouro') * 2
      Arte.titulo(g, String(f.pontos), x + 4 + ws / 2, y0, 2, true)
      Arte.texto(g, T.pontos, x + 4, y0 + 20, { fonte: 'mini', cor: COR.creme })
      if (f.novoRecorde) f.faixaAlvo = { x: Math.min(x + 4 + ws + 6, x + w - 94), y: y0 + P.y }
      const d = f.pontos - f.recordeAntes
      const rec = f.novoRecorde ? (f.recordeAntes === 0 ? T.primeira : T.recordeMais(d)) : d === 0 ? T.recordeIgual : T.recordeFalta(-d, f.recorde)
      f.linhas = [rec, f.ranking ? null : T.mediaLinha(f.media)].filter(Boolean)
      Arte.texto(g, quebrar(rec, w - 6)[0], x + 4, y0 + 28, { fonte: 'mini', cor: f.novoRecorde ? COR.ouro : COR.creme })
      if (f.linhas[1]) Arte.texto(g, f.linhas[1], x + 4, y0 + 35, { fonte: 'mini', cor: COR.creme })
      viu('fimNumeros')
    }
    const liga = (x, y0, w) => {
      if (!Arte.liga(g, f.liga.nome, x, y0)) { g.fillStyle = COR.ameixa; g.fillRect(x + 3, y0 + 3, 21, 24); Arte.icone(g, 'shield', x + 8, y0 + 9) }
      Arte.texto(g, f.liga.nome, x + 31, y0 + 1, { fonte: 'reino-contorno' })
      { const sobra = w - 33 - Arte.largura(f.liga.nome, 'reino-contorno'), marca = f.liga.marca ?? (Arte.largura(T.provisorio, 'mini') <= sobra ? T.provisorio : T.beta) // a liga do beta é PROVISÓRIA: está escrito ao lado do nome
        Arte.texto(g, marca, x + w, y0 + 3, { fonte: 'mini', cor: COR.ouro, alinhar: 'direita' }); f.ligaMarca = marca }
      barra(x + 32, y0 + 13, w - 34, 4, f.liga.pct, COR.ouro)
      Arte.texto(g, f.liga.linha ?? (f.liga.proxima ? T.ligaProxima(f.liga.proxima, f.liga.falta) : T.ligaTopo), x + 31, y0 + 21, { fonte: 'mini', cor: COR.creme })
      viu('fimLiga')
    }
    // O GANCHO: a SILHUETA da próxima carta do álbum com quantas rodadas faltam e, no modo servidor, a estrada do dia (relógio dele)
    const album = (x, y0, w, pc = null) => {
      const id = f.album && f.album.carta && CONFIG.CARTAS[f.album.carta] ? f.album.carta : null, sx = pc ? pc.x : x + 2, sy = pc ? pc.y : y0 - 1
      if (id) {
        let c = silhuetas.get(id); if (!c) { c = Arte.miniatura(56, 78, (gg) => Arte.carta(gg, id, 1, 0, 0, { silhueta: true }), 1); silhuetas.set(id, c) }
        g.fillStyle = COR.ameixa; g.fillRect(sx, sy, 23, 31); g.drawImage(c, sx + 1, sy + 1, 21, 29); Arte.texto(g, '?', sx + 11, sy + 11, { fonte: 'reino-contorno', alinhar: 'centro' })
        f.silhuetaRet = { x: sx, y: sy, w: 23, h: 31 }; viu('fimSilhueta')
      } else if (!pc) Arte.icone(g, 'loot', x + 8, y0 + 8)
      const texto = f.album ? T.proximaCarta(f.album.falta) : T.todasCartas
      if (pc) {
        // PC: a placa é baixa — a silhueta fica no canto direito (ao lado da liga) e o gancho da estrada embaixo dos pontos
        Arte.icone(g, 'loot', x, y0 - 2); Arte.texto(g, texto, x + 14, y0 - 1, { fonte: 'mini', cor: COR.creme }); barra(x + 14, y0 + 6, w - 16, 3, f.album ? f.album.pct : 100, '#7CC950')
        if (f.gancho) { const q = quebrar(f.gancho, 190); f.ganchoCabe = q.length === 1; Arte.texto(g, q[0], pc.gx, pc.gy, { fonte: 'mini', cor: COR.ouro }); viu('fimGancho') }
      } else {
        const tx = x + 31
        Arte.texto(g, texto, tx, y0 + 1, { fonte: 'mini', cor: COR.creme })
        barra(tx + 1, y0 + 9, w - 34, 3, f.album ? f.album.pct : 100, '#7CC950')
        if (f.gancho) { const q = quebrar(f.gancho, w - 32); f.ganchoCabe = q.length === 1; Arte.texto(g, q[0], tx, y0 + 17, { fonte: 'mini', cor: COR.ouro }); viu('fimGancho') }
      }
      viu('fimAlbum')
    }
    // a placa sobe: pontos, liga e próxima carta
    if (dt >= f.tSobe) {
      const sobe = fixo ? 0 : Math.round(Math.max(0, 1 - (dt - f.tSobe) / 260) * P.h)
      g.save(); g.translate(0, P.y + sobe)
      if (cel) {
        g.fillStyle = COR.ameixa; g.fillRect(0, -1, P.w, 1); g.fillStyle = COR.painel; g.fillRect(0, 0, P.w, P.h); g.fillStyle = COR.filete; g.fillRect(0, 0, P.w, 1)
        numeros(0, 5, P.w); liga(4, 47, P.w - 8); album(4, 79, P.w - 8)
      } else {
        Arte.painel(g, P.x, 0, P.w, P.h)
        numeros(P.x + 8, 7, 196); liga(P.x + 214, 8, P.w - 250); album(P.x + 214, 47, P.w - 250, { x: P.x + P.w - 31, y: 16, gx: P.x + 12, gy: 54 })
      }
      g.restore()
    }
    // a faixa NEW RECORD: cruza a tela com o confete e depois pousa ao lado do SCORE
    if (f.novoRecorde && f.contado && dt >= f.tFaixa) {
      const xc = cx - 46, a = Math.min(1, (dt - f.tFaixa) / 420), e1 = 1 - (1 - a) * (1 - a)
      let bx = Math.round(-100 + (xc + 100) * e1), by = yFaixa
      if (dt >= f.tSobe && f.faixaAlvo) { const b = Math.max(0, Math.min(1, (dt - f.tSobe - 200) / 320)); bx = Math.round(xc + (f.faixaAlvo.x - xc) * b); by = Math.round(yFaixa + (f.faixaAlvo.y - yFaixa) * b) }
      if (!Arte.fimPeca(g, 'faixa_recorde', bx, by, C.menos ? 0 : agora)) { g.fillStyle = COR.carmim; g.fillRect(bx, by + 2, 93, 14); Arte.texto(g, T.recorde, bx + 46, by + 5, { fonte: 'reino-ouro', alinhar: 'centro' }) }
      f.faixaRet = { x: bx, y: by, w: 93, h: 18 }
      viu('fimRecorde')
    }
    if (f.contou) {
      let d = bt('green', b0, 'denovo'); Arte.texto(g, T.deNovo, b0.x + (b0.w >> 1), b0.y + 7 + d, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' })
      d = bt('plum', b1, 'postar'); Arte.texto(g, T.postar, b1.x + (b1.w >> 1), b1.y + 7 + d, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' })
      g.globalAlpha = 1
      hudBt('plum', L.menu, 'menu', (x0, y0, w) => { g.fillStyle = COR.creme; for (let i = 0; i < 3; i++) g.fillRect(x0 + 6, y0 + 7 + i * 4, w - 12, 2) })
    }
    viu('fim')
  }
  const silhuetas = new Map()
  function aviso(agora) {
    const a = M.aviso; if (!a || agora > a.t0 + a.ms || agora < a.t0) return
    const dt = agora - a.t0, cx = C.VW >> 1, base = Math.floor(C.VH * (UI.L.cel ? 0.24 : 0.2)), livre = UI.L.cel && M.fase === 'carta' && !M.cartaPosta ? UI.L.odds.y + UI.L.odds.h + 5 : 0 // celular: abaixo das linhas de chances
    const y = Math.max(base, livre) - (C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 150) * 8))
    if (dt > a.ms - 200 && ((agora >> 6) & 1) && !C.menos) return
    const k = a.k || 2, lin = quebrar(a.texto, (C.VW - 8) / k, 'reino-contorno')
    lin.forEach((s, i) => Arte.titulo(g, s, cx, y + i * 10 * k, k, a.ouro))
    { const w = Math.max(...lin.map((s) => Arte.largura(s, 'reino-contorno'))) * k; C.zonaTitulo = { x: cx - (w >> 1) - 4, y: y - 4, w: w + 8, h: lin.length * 10 * k + 8 } } // os números de dano não passam por cima do título
    if (a.sub) quebrar(a.sub, C.VW - 12).forEach((s, i) => Arte.texto(g, s, cx, y + lin.length * 10 * k + 3 + i * 7, { fonte: 'mini-contorno', alinhar: 'centro' }))
  }
  /** R39 — A FAIXA DO REINO: "ROUND 20 HELD!" grande, em ouro, numa faixa que atravessa a tela, e "KEEP GOING FOR SCORE" embaixo. Os fogos e
   *  o confete são da cena (o app solta). "Reduced motion": a faixa já no lugar, parada, sem brilho piscando. */
  function faixaDoReino(agora, R) {
    const dt = agora - R.t0, cx = C.VW >> 1, cel = UI.L.cel, bate = R.bate || 0, sai = R.sai ?? 1e9
    // R41: o número da rodada conta rolando até a rodada da vitória e POUSA com a batida (Reduced motion: já chega no número)
    const n = C.menos || dt >= bate ? R.rodada : Math.max(1, Math.round(R.rodada * Math.max(0, dt - 200) / Math.max(1, bate - 200)))
    const cheio = T.festaReino(R.rodada), texto = T.festaReino(n)
    let k = 2, lin = quebrar(cheio, (C.VW - 12) / 2, 'reino-ouro')
    for (const q of [4, 3]) { const l = quebrar(cheio, (C.VW - 12) / q, 'reino-ouro'); if (l.length <= (cel ? 2 : 1)) { k = q; lin = l; break } }
    // R41: depois de `sai` a faixa ENCOLHE e sobe para debaixo do HUD (uma linha, letra pequena): o campo, a luta e a plaqueta voltam a ser vistos
    const s = C.menos ? (dt >= sai ? 1 : 0) : Math.max(0, Math.min(1, (dt - sai) / 260)), pequena = s >= 1
    if (pequena) { k = 1; lin = [cheio] }
    const mostra = lin.length === 1 ? [texto] : quebrar(texto, (C.VW - 12) / k, 'reino-ouro')
    const hT = lin.length * 10 * k, hG = hT + 27, hP = 16, y0 = Math.floor(C.VH * (cel ? 0.3 : 0.27)), yP = Math.ceil(UI.L.pinos.y + UI.L.pinos.h) + 4
    const h = pequena ? hP : Math.round(hG + (hP - hG) * s), y = pequena ? yP : Math.round(y0 + (yP - y0) * s)
    const abre = C.menos ? 1 : Math.min(1, dt / 220), w = Math.round(C.VW * abre), x = cx - (w >> 1)
    escurecer((C.menos ? 0.4 : Math.min(0.4, dt / 500)) * (1 - s))
    g.fillStyle = COR.carmim; g.fillRect(x, y - 3, w, 2); g.fillRect(x, y + h + 1, w, 2)
    g.fillStyle = '#1C1230'; g.globalAlpha = 0.9; g.fillRect(x, y, w, h); g.globalAlpha = 1
    g.fillStyle = COR.ouro; g.fillRect(x, y, w, 2); g.fillRect(x, y + h - 2, w, 2); g.fillStyle = '#FFF096'; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 2, w, 1)
    if (pequena) Arte.texto(g, cheio, cx, y + 4, { fonte: 'reino-ouro', alinhar: 'centro' })
    else if (abre >= 1 && s === 0) {
      const pop = C.menos ? 0 : Math.round(Math.max(0, 1 - (dt - bate) / 160) * (dt >= bate ? 6 : 0))
      mostra.forEach((q, i) => Arte.titulo(g, q, cx, y + 9 + i * 10 * k - pop, k, true))
      Arte.texto(g, T.festaReinoSub, cx, y + 9 + hT + 4, { fonte: 'reino-contorno', alinhar: 'centro' })
      // brilhos de ouro andando pelas bordas da faixa (parados fora com Reduced motion)
      if (!C.menos) for (let i = 0; i < 6; i++) { const t = ((agora / 9 + i * 71) % (C.VW + 20)) - 10; g.fillStyle = '#FFF096'; g.fillRect(Math.round(i & 1 ? t : C.VW - t), i & 1 ? y - 1 : y + h - 1, 3, 1) }
    }
    // R41: FOGOS POR CIMA do escurecido (desenhados aqui, depois dele): estouros em pixel, no máximo 3 de uma vez, 10 faíscas cada. Nunca com Reduced motion.
    R.fogos = 0
    if (!C.menos && dt >= bate && s < 1) {
      const CORES = [COR.ouro, '#FFF096', COR.carmim, '#68A0F8']
      for (let i = 0; i < 7; i++) {
        const t = dt - bate - i * 230; if (t < 0 || t > 640) continue
        const fx = C.VW * (0.14 + ((i * 37) % 73) / 100), fy = (i & 1 ? y + hG + 14 + ((i * 13) % 24) : Math.max(8, y0 - 18 - ((i * 17) % 30))), a = t / 640, r = 5 + 26 * (1 - (1 - a) * (1 - a))
        g.fillStyle = CORES[i % 4]; g.globalAlpha = a > 0.7 ? 1 - (a - 0.7) / 0.3 : 1
        for (let j = 0; j < 10; j++) { const an = (j / 10) * 6.283 + i; g.fillRect(Math.round(fx + Math.cos(an) * r), Math.round(fy + Math.sin(an) * r + a * a * 8), 2, 2) }
        g.globalAlpha = 1; R.fogos++
      }
      if (R.fogos) { R.fogosVistos = (R.fogosVistos || 0) + 1; viu('fogosDoReino') }
    }
    C.zonaTitulo = { x: 0, y: y - 4, w: C.VW, h: h + 8 }
    R.ret = { x, y: y - 3, w, h: h + 6, linhas: lin, k, sub: T.festaReinoSub, maior: Math.max(...lin.map((q) => Arte.largura(q, 'reino-ouro'))) * k, VW: C.VW, VH: C.VH, n, mostra: mostra.join(' '), pequena, s }
    viu('festaReino')
  }
  /** Aviso pequeno em placa (conquista, carta nova, relíquia): sempre abaixo do HUD, nunca por cima dele. */
  function brinde(agora) {
    const b = M.brinde; if (!b || agora > b.t0 + b.ms || agora < b.t0) return
    const L = UI.L, dt = agora - b.t0, cel = L.cel, hudFim = Math.ceil((L.pinos.y + L.pinos.h) / 1) + 2
    const canto = !cel && (M.fase === 'vitoria' || M.fase === 'luta') // PC na escolha do espólio e na luta: a placa vai para o canto de baixo (nunca por cima dos 3 espólios nem da horda no portão)
    const w = canto ? L.premios.w : Math.min(C.VW - 8, 150)
    const x = canto ? L.premios.x : cel || M.fase === 'fim' ? (C.VW - w) >> 1 : 4
    const y = canto ? L.premios.y + 15 : M.fase === 'fim' ? L.fimPainel.y - 34 : cel ? (M.fase === 'carta' || M.fase === 'terreno' ? L.odds.y + L.odds.h + 3 : M.fase === 'luta' ? Math.max(48, hudFim) : L.mesa.y - 34) : Math.max(32, hudFim)
    M.brindeRet = { x, y, w, h: 30 }
    const desce = C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 200) * 20)
    Arte.painel(g, x, y - desce, w, 30)
    const ic = b.icone
    if (ic?.tipo === 'conquista' && ic.conquista) { desenharMedalha(Arte, g, ic.conquista, true, x + 4, y + 4 - desce); viu('avisoConquista') } else if (ic?.tipo === 'conquista' && Arte.conquista(g, ic.nome, x + 4, y + 4 - desce)) { /* medalha */ } else if (ic?.tipo === 'reliquia') Arte.reliquia(g, ic.id, x + 6, y + 8 - desce); else Arte.icone(g, ic?.tipo === 'carta' ? 'loot' : 'pudding', x + 8, y + 9 - desce)
    Arte.texto(g, b.titulo, x + 27, y + 6 - desce, { fonte: 'mini', cor: COR.ouro })
    Arte.texto(g, b.texto, x + 27, y + 15 - desce, { fonte: Arte.largura(b.texto, 'reino') > w - 32 ? 'mini' : 'reino', cor: COR.creme })
    viu('brinde')
  }

  /** MODO SERVIDOR — aviso curto por cima de tudo: "RECONNECTING..." enquanto a rede não volta, ou o erro do contrato (429, manutenção…). */
  function status(agora) {
    const s = M.status; if (!s) return
    if (agora > s.ate) { M.status = null; return }
    const lin = quebrar(s.texto, C.VW - 16, 'reino-contorno'), w = Math.max(...lin.map((q) => Arte.largura(q, 'reino-contorno'))) + 12, h = lin.length * 11 + 7
    // nunca por cima do HUD: abaixo da fileira dos pinos do chefe e das famílias (2ª linha) e, no celular, também do sorteio e das chances
    const L = UI.L, x = (C.VW - w) >> 1, y = Math.max(Math.ceil(L.menu.y + 26 * L.bs + Math.max(0, (44 / C.css - 26 * L.bs) / 2)), Math.ceil(L.pinos.y + L.pinos.h), L.cel ? L.odds.y + L.odds.h : 0) + 3
    g.fillStyle = COR.ameixa; g.fillRect(x, y, w, h); g.fillStyle = COR.ouro; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1)
    lin.forEach((q, i) => Arte.texto(g, q, C.VW >> 1, y + 4 + i * 11, { fonte: 'reino-contorno', alinhar: 'centro' }))
    if (s.rede && !C.menos) { const n = (agora / 300 | 0) % 3; g.fillStyle = COR.ouro; for (let i = 0; i <= n; i++) g.fillRect((C.VW >> 1) - 5 + i * 4, y + h - 4, 2, 2) } // três pontinhos andando (parados com Reduced motion)
    M.statusRet = { x, y, w, h }
    viu('status')
  }
  /** MODO SERVIDOR — a faixa do replay: de quem é, a rodada e o passo; a CARTA escolhida e onde foi posta; depois de cada luta o MVP
   *  dela; o botão SKIP TO FIGHT; no fim o resultado gravado com WATCH AGAIN e BACK. */
  function faixaReplay() {
    const r = M.replay, L = UI.L, Q = L.replay, R = Q.R, p = r.passo && !r.fim ? r.passo : null
    if (!L.cel) Arte.painel(g, R.x, R.y, R.w, R.h)
    if (p) { Arte.carta(g, p.carta, p.nivel, Q.carta.x, Q.carta.y); viu('replayCarta') }
    const x0 = R.x + (p ? 64 : 4), larg = R.x + R.w - 4 - x0, cx = x0 + (larg >> 1), lin = [], logica = []
    const por = (t, fo, max = 2) => { logica.push(t); for (const q of quebrar(t, larg, fo).slice(0, max)) lin.push([q, fo]) }
    por(T.srv.replay.de(r.nome), 'reino-ouro'); por(T.srv.replay.passo(M.rodada, r.i, r.n), 'reino-contorno')
    if (r.fim) por(r.fim, r.venceu ? 'reino-ouro' : 'reino', 3); else { if (r.linha) por(r.linha, 'reino'); if (r.mvp) { por(r.mvp, Arte.temFonte('mini-ouro') ? 'mini-ouro' : 'mini-contorno'); viu('replayMvp') } }
    let y = R.y + (L.cel ? 7 : 8)
    for (const [t, fo] of lin) { Arte.texto(g, t, cx, y, { fonte: fo, cor: COR.creme, alinhar: 'centro' }); y += fo.startsWith('mini') ? 9 : 11 }
    r.faixa = logica; r.faixaFim = y
    const botao = (cor, q, id, texto) => { const d = bt(cor, q, id); Arte.texto(g, quebrar(texto, q.w - 6, 'reino')[0], q.x + (q.w >> 1), q.y + 7 + d, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' }); g.globalAlpha = 1 }
    if (r.fim) { botao('green', Q.rever, 'rever', T.srv.replay.rever); botao('plum', Q.voltar, 'voltar-replay', T.srv.replay.voltar); viu('replayFim') } else if (M.fase === 'replay' && r.pular) { botao('green', Q.pular, 'pular-luta', T.srv.replay.pular); viu('replayPular') }
    viu('replay')
  }

  /** Por cima do mundo, ainda com a câmera: selo de LEVEL UP com "antes > depois", contagem da horda no portão, "REPLACE?". */
  C.depoisDoMundo = (gg, t) => {
    const agora = performance.now()
    if (M.trocar && (M.fase === 'carta' || M.fase === 'terreno')) {
      // "REPLACE SMITHY LV2?": diz o que se perde, numa plaquinha que nunca sai da tela
      const p = C.centroDoTerreno(M.trocar), lin = M.trocarLinhas || [T.trocar], w = Math.max(...lin.map((s) => Arte.largura(s, 'reino-ouro'))) + 8, h = lin.length * 10 + 3
      const x = Math.max(2 + (w >> 1), Math.min(C.VW - 2 - (w >> 1), Math.round(p.x))), y = p.base - 38 - h
      gg.fillStyle = COR.ameixa; gg.globalAlpha = 0.88; gg.fillRect(x - (w >> 1), y, w, h); gg.globalAlpha = 1; gg.fillStyle = COR.ouro; gg.fillRect(x - (w >> 1), y, w, 1); gg.fillRect(x - (w >> 1), y + h - 1, w, 1)
      lin.forEach((s, i) => Arte.texto(gg, s, x, y + 2 + i * 10, { fonte: 'reino-ouro', alinhar: 'centro' })); viu('trocar')
    }
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
    C.zonaTitulo = null; C.zonaChances = null
    if (f === 'fim') { fim(agora); aviso(agora); brinde(agora); status(agora); return }
    if (f === 'replay') { mesa(); faixaReplay(); hud(agora); aviso(agora); brinde(agora); status(agora); return }
    if (f === 'carta') {
      mesa()
      const sel = M.sel >= 0 && M.mao[M.sel] && M.infoSel
      if (!M.cartaPosta) {
        if (!L.cel) premios(true)
        mao(agora)
        if (sel) { faixa(linhasQueCabem(M.infoSel, 6)); viu('infoCarta') } else if (M.info) { faixa(linhasQueCabem(M.info, 7)); viu('info') } else if (L.cel) premios(false)
        ouroBt(L.sortear, 'sortear', 'reroll', M.sortear, agora, T.sortearNome)
        setaCarta(agora)
        chances()
      } else {
        premios(true)
        if (M.info) { faixa(linhasQueCabem(M.info, 7)); viu('info') }
        const r = L.lutar2, pulsa = C.menos ? 0 : Math.round(Math.abs(Math.sin(agora / 240)) * 2)
        const d = bt('green', { ...r, y: r.y - pulsa }, 'lutar2'); Arte.texto(g, T.lutar, r.x + (r.w >> 1), r.y + 7 + d - pulsa, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' }); g.globalAlpha = 1
        if (C.menos) { moldura(r.x - 2, r.y - 2, r.w + 4, 30); Arte.icone(g, 'play', r.x - 14, r.y + 8); viu('lutarFixo') } // Reduced motion: contorno de ouro e seta parados no lugar do pulso
      }
      if (M.consertar.visivel) ouroBt(L.consertar, 'consertar', 'life', M.consertar, agora, T.consertarNome)
    } else if (f === 'luta') { mesa(); resumo(L.resumo, true); if (!L.cel) premios(true) } else if (f === 'terreno') {
      mesa(); faixa(['#' + T.escolhaTerreno, ...(M.info || [])])
      const e = M.espolios[M.espolioI], ds = M.espolioDesc[M.espolioI]
      if (L.cel && e && ds) {
        premio(e, 4, C.VH - 83)
        Arte.texto(g, quebrar(ds.titulo, C.VW - 70, 'reino')[0], 66, C.VH - 82, { fonte: 'reino', cor: COR.ouro })
        quebrar(ds.texto, C.VW - 70).slice(0, 6).forEach((q, i) => Arte.texto(g, q, 66, C.VH - 71 + i * 6, { fonte: 'mini', cor: COR.creme }))
        viu('terrenoEspolio')
      }
      const r = L.voltar, d = bt('plum', r, 'voltar'); Arte.texto(g, T.voltar, r.x + (r.w >> 1), r.y + 7 + d, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' }); g.globalAlpha = 1
    } else if (f === 'vitoria') { mesa(); if (!L.cel || !M.vitoria.pronto) resumo(L.resumo, false); vitoria(agora) } else if (f === 'derrota') { mesa(); derrota(agora); resumo(L.resumo, false) } else if (f === 'chefe') { mesa(); chefe(agora) }
    hud(agora); aviso(agora); brinde(agora); status(agora)
    if (M.arrasto?.moveu) { const c = M.mao[M.arrasto.indice]; if (c) Arte.carta(g, c.carta, c.nivel, Math.round(M.arrasto.x - 28), Math.round(M.arrasto.y - 50)) }
  }
  medir()
  return UI
}
