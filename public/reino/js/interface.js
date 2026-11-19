// Keepmile — A INTERFACE em pixel, desenhada no mesmo canvas da cena (HUD, mão de 3 cartas, espólios, avisos, fim), com um botão
// de verdade (transparente, com foco de teclado) por cima de cada coisa tocável. Só mostra o modelo `M` que o app monta a partir de
// `visao`/`opcoes`; quem manda comando é o app.
import * as Arte from './arte.js'
import { T } from './textos.js'

export function criarInterface(C, CONFIG, camada, aoTocar) {
  const g = C.g, COR = Arte.COR
  const M = {
    fase: 'carta', vidas: 3, vidasMax: 3, ouro: 0, rodada: 1, proximoChefe: null, mao: [], sel: -1, cartaPosta: false, maoT0: 0, primeira: false,
    sortear: { custo: 0, pode: false }, consertar: { custo: 0, pode: false, visivel: false }, armado: null, trocar: 0,
    espolios: [], espolioPode: [], info: null, forca: null, vel: 1, mudo: false, aviso: null, vitoria: null, derrota: null, chefe: null, fim: null, arrasto: null,
    apertado: null, selo: null, brinde: null, hordaN: 0, hordaChefe: null, pulsaLutar: false,
  }
  const UI = { M, L: {}, botoes: [] }
  const el = new Map()

  // ---------------------------------------------------------------- medidas (px de arte da tela)
  function medir() {
    const cel = C.tipo === 'celular', VW = C.VW, VH = C.VH, bs = C.e === 1 ? 2 : 1, L = { cel, bs }
    const bw = cel ? 36 : 60
    L.lutar = { x: VW - (bw + 2) * bs, y: 2 * bs, w: bw * bs, h: 26 * bs }
    L.som = { x: L.lutar.x - 24 * bs, y: 2 * bs, w: 22 * bs, h: 26 * bs }
    L.menu = { x: L.som.x - 24 * bs, y: 2 * bs, w: 22 * bs, h: 26 * bs }
    const vao = cel ? 0 : 4, larg = 56 * 3 + vao * 2, x0 = Math.floor((VW - larg) / 2), yc = cel ? VH - 78 : VH - 80
    L.cartas = [0, 1, 2].map((i) => ({ x: x0 + i * (56 + vao), y: yc, w: 56, h: 78 }))
    L.mesa = cel ? { x: 0, y: VH - 88, w: VW, h: 88 } : { x: x0 - 6, y: yc - 6, w: larg + 12, h: 86 }
    L.faixa = cel ? { x: 0, y: VH - 88, w: VW, h: 10 } : { x: 6, y: VH - 44 - 30 * bs, w: x0 - 14, h: 40 }
    if (cel) { L.sortear = { x: 3, y: 44, w: 34, h: 26 }; L.consertar = { x: 40, y: 44, w: 34, h: 26 } } else { L.sortear = { x: x0 - 42 * bs, y: VH - 2 - 28 * bs, w: 34 * bs, h: 26 * bs }; L.consertar = { x: x0 - 80 * bs, y: VH - 2 - 28 * bs, w: 34 * bs, h: 26 * bs } }
    L.lutar2 = cel ? { x: Math.floor(VW / 2) - 48, y: VH - 34, w: 96, h: 26 } : { x: Math.floor(VW / 2) - 48, y: VH - 44, w: 96, h: 26 }
    L.premios = cel ? { x: Math.floor(VW / 2) - 78, y: VH - 84, w: 156, h: 46 } : { x: VW - 124, y: VH - 66, w: 120, h: 60 }
    // escolha do espólio: 3 cartões no meio
    const ey = cel ? Math.floor(VH * 0.36) : Math.floor(VH * 0.3), ex = Math.floor((VW - (56 * 3 + 8)) / 2)
    L.espolio = [0, 1, 2].map((i) => ({ x: ex + i * 60, y: ey, w: 56, h: 78 }))
    L.fimBotoes = cel ? [{ x: Math.floor(VW / 2) - 84, y: VH - 36, w: 104, h: 26 }, { x: Math.floor(VW / 2) + 24, y: VH - 36, w: 60, h: 26 }] : [{ x: Math.floor(VW / 2) - 38, y: VH - 44, w: 118, h: 26 }, { x: Math.floor(VW / 2) + 86, y: VH - 44, w: 70, h: 26 }]
    UI.L = L
    return L
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
    return b
  }
  /** Refaz a lista de botões (chamar quando o modelo muda; não a cada quadro). */
  UI.mudou = () => {
    medir()
    const b = UI.botoes = lista(), e = C.e, vistos = new Set()
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
      px = Math.max(0, Math.min(px, C.VW * e - w)); py = Math.max(0, Math.min(py, C.VH * e - h))
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
    const d = Arte.botao(g, cor, r.x, r.y, r.w, 26, ap)
    return d
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
  function premio(e, x, y, pode = true) {
    // cartão de espólio 56×78: a carta de verdade, ou painel com o ícone do tipo
    g.globalAlpha = pode ? 1 : 0.45
    if (e.tipo === 'carta') Arte.carta(g, e.carta, 1, x, y); else {
      Arte.painel(g, x, y, 56, 78)
      const nome = e.reliquia ? 'Card' : e.tipo === 'promocao' ? 'Promotion' : 'Purse'
      if (e.reliquia) { Arte.icone(g, 'pudding', x + 22, y + 14); Arte.icone(g, 'loot', x + 22, y + 30) } else if (!Arte.ui(g, 'loot.' + nome, x + 6, y + 4)) Arte.icone(g, e.tipo === 'promocao' ? 'up' : 'gold', x + 22, y + 20)
      g.fillStyle = COR.painel; g.fillRect(x + 4, y + 44, 48, 30)
      const lin = quebrar(e.reliquia ? CONFIG.RELIQUIAS[e.reliquia].nome : e.tipo === 'promocao' ? T.maisNivel : `+${e.ouro} ${T.ouro}`, 46)
      lin.slice(0, 3).forEach((s, i) => Arte.texto(g, s, x + 28, y + 50 + i * 7 + (lin.length === 1 ? 6 : 0), { fonte: 'mini', cor: e.reliquia ? COR.ouro : COR.creme, alinhar: 'centro' }))
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
    Arte.texto(g, `${T.rodada} ${M.rodada}`, L.cel ? 3 : Math.floor(HW / 2), L.cel ? 17 : 4, { fonte: 'reino-contorno', alinhar: L.cel ? 'esquerda' : 'centro' })
    // pinos até o chefe (ciclo de 5 rodadas) + a cara dele, que pisca quando está avisado
    if (M.proximoChefe) {
      const px = L.cel ? 3 : 3, py = L.cel ? 29 : 17, n = ((M.rodada - 1) % 5) + 1
      for (let i = 0; i < 5; i++) Arte.icone(g, i < n ? 'pin-on' : 'pin-off', px + i * 6, py + 3)
      if (!M.proximoChefe.avisado || C.menos || ((agora >> 8) & 1) || M.fase === 'luta') Arte.icone(g, 'boss', px + 32, py)
    }
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
    if (M.fase === 'fim') return
    hudBt('plum', L.som, 'som', (x0, y0, w) => Arte.icone(g, M.mudo ? 'sound-off' : 'sound-on', x0 + ((w - 11) >> 1), y0 + 6))
    if (M.fase === 'luta') hudBt('green', L.lutar, 'vel', (x0, y0, w) => { Arte.icone(g, 'speed', x0 + (w >> 1) - 12, y0 + 6); Arte.texto(g, 'x' + M.vel, x0 + (w >> 1) + 1, y0 + 7, { fonte: 'reino', cor: COR.creme }) })
    else if (M.fase === 'carta') {
      const pulsa = M.pulsaLutar && !C.menos ? Math.round(Math.abs(Math.sin(agora / 240)) * 2) : 0
      hudBt('green', { ...L.lutar, y: L.lutar.y - pulsa }, 'lutar', (x0, y0, w) => Arte.texto(g, T.lutar, x0 + (w >> 1), y0 + 7, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' }))
    }
  }
  function ouroBt(r, id, icone, st, agora) {
    const bs = UI.L.bs, armado = M.armado === id
    g.save(); g.scale(bs, bs)
    const q = { x: r.x / bs, y: r.y / bs, w: r.w / bs, h: 26 }
    const d = bt(armado ? 'green' : 'plum', q, id, !st.pode)
    if (armado) Arte.texto(g, T.confirma, q.x + (q.w >> 1), q.y + 6 + d, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' }); else Arte.icone(g, icone, q.x + 3, q.y + 5 + d)
    if (armado) Arte.texto(g, String(st.custo), q.x + (q.w >> 1), q.y + 12 + d, { fonte: 'mini', cor: COR.ouro, alinhar: 'centro' }); else { Arte.texto(g, String(st.custo), q.x + 16, q.y + 7 + d, { fonte: 'reino', cor: st.pode ? COR.ouro : COR.pedra[1] }) }
    g.restore(); g.globalAlpha = 1
  }

  // ---------------------------------------------------------------- mão, mesa, faixa de informação
  function mesa() { const L = UI.L; if (!L.cel) return; g.fillStyle = COR.ameixa; g.fillRect(0, L.mesa.y - 1, C.VW, 1); g.fillStyle = COR.painel; g.fillRect(0, L.mesa.y, C.VW, L.mesa.h); g.fillStyle = COR.filete; g.fillRect(0, L.mesa.y, C.VW, 1) }
  function faixa(linhas, ouro = false, acima = false) {
    const L = UI.L, f = L.faixa
    if (L.cel) {
      // `acima`: a caixa fica em cima da mesa (a carta escolhida sobe e taparia a faixa de dentro)
      const h = linhas.length * 7 + 3, y = acima ? f.y - h : f.y + f.h - h
      if (acima) { g.fillStyle = COR.ameixa; g.fillRect(0, y - 1, C.VW, 1); g.fillStyle = COR.painel; g.fillRect(0, y, C.VW, h) }
      linhas.forEach((s, i) => Arte.texto(g, s, C.VW >> 1, y + 2 + i * 7, { fonte: 'mini', cor: ouro && i === 0 ? COR.ouro : COR.creme, alinhar: 'centro' }))
    } else linhas.forEach((s, i) => Arte.texto(g, s, f.x, f.y + f.h - (linhas.length - i) * 9, { fonte: 'mini-contorno' }))
  }
  function linhasDaCarta(id) {
    const c = CONFIG.CARTAS[id], larg = UI.L.cel ? C.VW - 8 : Math.max(100, UI.L.faixa.w), txt = quebrar(c.texto, larg)
    if (UI.L.cel) return txt.length > 1 ? txt.slice(0, 2) : [`${c.nome} - ${CONFIG.FAMILIAS[c.familia].nome} ${T.tipo[c.tipo]}`, ...txt]
    return [`${c.nome} - ${CONFIG.FAMILIAS[c.familia].nome} ${T.tipo[c.tipo]}`, ...txt].slice(0, 5)
  }
  function premios(grande) {
    const L = UI.L, p = L.premios
    if (!M.espolios.length) return
    if (!grande) { faixa(quebrar(`${T.ganhe} ${M.espolios.map(nomeEspolio).join(' / ')}`, C.VW - 6).slice(0, 2)); return }
    Arte.painel(g, p.x, p.y, p.w, p.h)
    Arte.texto(g, T.ganhe, p.x + 6, p.y + 5, { fonte: 'mini', cor: COR.ouro })
    M.espolios.forEach((e, i) => {
      const passo = Math.floor((p.w - 8) / 3), x = p.x + 4 + i * passo, lin = quebrar(nomeEspolio(e), passo - 2)
      Arte.icone(g, e.tipo === 'carta' ? 'troop' : e.reliquia ? 'pudding' : e.tipo === 'promocao' ? 'up' : 'gold', x + (passo >> 1) - 5, p.y + 13)
      lin.slice(0, 3).forEach((s, j) => Arte.texto(g, s, x + (passo >> 1), p.y + 26 + j * 6, { fonte: 'mini', cor: e.reliquia ? COR.ouro : COR.creme, alinhar: 'centro' }))
    })
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

  // ---------------------------------------------------------------- camadas de momento
  const escurecer = (a) => { g.globalAlpha = a; g.fillStyle = '#1C1230'; g.fillRect(0, 0, C.VW, C.VH); g.globalAlpha = 1 }
  function vitoria(agora) {
    const v = M.vitoria, L = UI.L, dt = agora - v.t0, cx = C.VW >> 1
    escurecer(Math.min(0.5, dt / 600))
    const k = L.cel ? 2 : 3, pop = C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 180) * 10)
    Arte.titulo(g, v.chefe ? `${T.chefe} DOWN!` : T.vitoria, cx, L.espolio[0].y - (L.cel ? 62 : 70) - pop, k, true)
    Arte.icone(g, 'gold', cx - 20, L.espolio[0].y - 30); Arte.texto(g, '+' + v.ouroMostra, cx - 6, L.espolio[0].y - 29, { fonte: 'reino-ouro' })
    if (v.selo) Arte.texto(g, v.selo, cx, L.espolio[0].y - 16, { fonte: 'mini-contorno', alinhar: 'centro' })
    if (!v.pronto) return
    M.espolios.forEach((e, i) => {
      const r = L.espolio[i], t = agora - v.prontoT0 - i * 110; if (t < 0) return
      const y = r.y + (C.menos ? 0 : Math.round(Math.max(0, 1 - t / 200) * 30)) - (M.apertado === 'espolio' + i ? -2 : 0)
      premio(e, r.x, y, M.espolioPode[i])
    })
  }
  function derrota(agora) {
    const d = M.derrota, dt = agora - d.t0, cx = C.VW >> 1, y = Math.floor(C.VH * 0.3)
    escurecer(Math.min(0.45, dt / 600))
    g.fillStyle = COR.carmim; const w = Arte.largura(T.derrota, 'reino-contorno') * 3 + 16; g.fillRect(cx - (w >> 1), y - 4, w, 34); g.fillStyle = '#7C2030'; g.fillRect(cx - (w >> 1), y + 28, w, 2)
    Arte.titulo(g, T.derrota, cx, y, 3)
    quebrar(d.linha, C.VW - 16, 'reino-contorno').forEach((s, i) => Arte.texto(g, s, cx, y + 40 + i * 11, { fonte: 'reino-contorno', alinhar: 'centro' }))
    for (let i = 0; i < M.vidasMax; i++) Arte.icone(g, i < M.vidas ? 'life' : 'life-empty', cx - M.vidasMax * 7 + i * 14, y + 68)
  }
  function chefe(agora) {
    const c = M.chefe, dt = agora - c.t0, cx = C.VW >> 1, cy = Math.floor(C.VH * 0.5), def = CONFIG.CHEFES.find((x) => x.id === c.id)
    escurecer(Math.min(0.6, dt / 400))
    const p = Arte.unidade(c.id), entra = C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 500) * (C.VW * 0.7)), k = C.e >= 2 && UI.L.cel ? 1.5 : 1
    g.globalAlpha = 0.5; g.fillStyle = COR.carmim; g.fillRect(0, cy - 44, C.VW, 2); g.fillRect(0, cy + 24, C.VW, 2); g.globalAlpha = 1
    Arte.desenhar(g, p, p.quadros[Arte.quadroDe(p.anim.idle, C.menos ? 0 : dt)], cx - entra, cy + 22, p.olhaEsquerda, null, k)
    if (!Arte.ui(g, 'label-boss', cx - 11, cy - 62 - (p.h * k - p.h))) Arte.texto(g, T.chefe, cx, cy - 62, { fonte: 'reino-ouro', alinhar: 'centro' })
    quebrar(def.nome, C.VW - 12, 'reino-contorno').forEach((s, i) => Arte.titulo(g, s, cx, cy + 32 + i * 20, 2, true))
    quebrar(def.texto, C.VW - 16).forEach((s, i) => Arte.texto(g, s, cx, cy + 76 + i * 8, { fonte: 'mini-contorno', alinhar: 'centro' }))
  }
  function fim(agora) {
    const f = M.fim, L = UI.L, dt = agora - f.t0, by = L.fimBotoes[0].y
    const nums = [[T.rodada + 'S WON', f.vencidas], [T.pontos, f.pontos], [T.ouroGanho, f.ouro]]
    const recorde = (cx, y) => {
      if (f.contou && f.novoRecorde) { if (C.menos || ((agora >> 8) & 3)) if (!Arte.ui(g, 'label-new', cx - 37, y - 1)) Arte.texto(g, 'NEW', cx - 34, y + 1, { fonte: 'mini', cor: COR.ouro }); Arte.texto(g, 'RECORD!', cx - 11, y, { fonte: 'reino-ouro' }) } else if (f.contou) Arte.texto(g, `${T.melhor} ${f.recorde}`, cx, y + 2, { fonte: 'mini', cor: COR.ouro, alinhar: 'centro' })
    }
    if (L.cel) {
      // celular: placa no céu (canto de cima) + números e botões na mesa; o reino fica inteiro no meio
      const px = 4, py = 30, pw = 92, cx = px + (pw >> 1)
      Arte.painel(g, px, py, pw, 86)
      Arte.texto(g, T.fim, cx, py + 6, { fonte: 'reino-contorno', alinhar: 'centro' })
      Arte.titulo(g, String(f.mostra), cx, py + 20, 4, f.novoRecorde && f.contou)
      Arte.texto(g, T.aguentou, cx, py + 60, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' })
      recorde(cx, py + 70)
      mesa()
      nums.forEach(([rot, v], i) => { const x = (C.VW >> 1) + (i - 1) * 58; Arte.texto(g, String(v), x, by - 28, { fonte: 'reino-ouro', alinhar: 'centro' }); Arte.texto(g, rot, x, by - 16, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' }) })
    } else {
      // PC: uma placa só embaixo (o mundo sobe para o reino ficar inteiro à vista)
      const pw = 330, px = (C.VW - pw) >> 1, py = C.VH - 102, cx = px + 62
      Arte.painel(g, px, py, pw, 98)
      Arte.texto(g, T.fim, cx, py + 6, { fonte: 'reino-contorno', alinhar: 'centro' })
      Arte.titulo(g, String(f.mostra), cx, py + 19, 4, f.novoRecorde && f.contou)
      Arte.texto(g, T.aguentou, cx, py + 60, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' })
      recorde(cx, py + 72)
      nums.forEach(([rot, v], i) => { const x = px + 160 + i * 64; Arte.texto(g, String(v), x, py + 14, { fonte: 'reino-ouro', alinhar: 'centro' }); Arte.texto(g, rot, x, py + 27, { fonte: 'mini', cor: COR.creme, alinhar: 'centro' }) })
    }
    if (dt < 0) return
    let d = bt('green', L.fimBotoes[0], 'denovo'); Arte.texto(g, T.deNovo, L.fimBotoes[0].x + (L.fimBotoes[0].w >> 1), by + 7 + d, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' })
    d = bt('plum', L.fimBotoes[1], 'postar'); Arte.texto(g, T.postar, L.fimBotoes[1].x + (L.fimBotoes[1].w >> 1), by + 7 + d, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' })
    g.globalAlpha = 1
  }
  function aviso(agora) {
    const a = M.aviso; if (!a || agora > a.t0 + a.ms) return
    const dt = agora - a.t0, cx = C.VW >> 1, y = Math.floor(C.VH * (UI.L.cel ? 0.24 : 0.2)) - (C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 150) * 8))
    if (dt > a.ms - 200 && ((agora >> 6) & 1) && !C.menos) return
    const k = a.k || 2, lin = quebrar(a.texto, (C.VW - 8) / k, 'reino-contorno')
    lin.forEach((s, i) => Arte.titulo(g, s, cx, y + i * 10 * k, k, a.ouro))
    if (a.sub) quebrar(a.sub, C.VW - 12).forEach((s, i) => Arte.texto(g, s, cx, y + lin.length * 10 * k + 3 + i * 7, { fonte: 'mini-contorno', alinhar: 'centro' }))
  }
  function brinde(agora) {
    const b = M.brinde; if (!b || agora > b.t0 + b.ms) return
    const dt = agora - b.t0, w = Math.min(C.VW - 8, 150), cel = UI.L.cel, x = cel || M.fase === 'fim' ? (C.VW - w) >> 1 : 4, y = M.fase === 'fim' ? (cel ? Math.floor(C.VH * 0.42) : 30) : M.fase === 'chefe' ? 28 : cel ? 70 : 32
    const desce = C.menos ? 0 : Math.round(Math.max(0, 1 - dt / 200) * 20)
    Arte.painel(g, x, y - desce, w, 30)
    if (b.carta) Arte.icone(g, 'loot', x + 6, y + 9 - desce); else Arte.icone(g, 'pudding', x + 6, y + 9 - desce)
    Arte.texto(g, b.titulo, x + 22, y + 6 - desce, { fonte: 'mini', cor: COR.ouro })
    Arte.texto(g, b.texto, x + 22, y + 15 - desce, { fonte: Arte.largura(b.texto, 'reino') > w - 28 ? 'mini' : 'reino', cor: COR.creme })
  }

  /** Por cima do mundo, ainda com a câmera: selo de LEVEL UP, contagem da horda no portão, "REPLACE?". */
  C.depoisDoMundo = (gg, t) => {
    const agora = performance.now()
    if (M.selo && agora < M.selo.ate) { const p = C.centroDoTerreno(M.selo.terreno), sobe = C.menos ? 0 : Math.round(Math.min(1, (agora - M.selo.t0) / 300) * 8), q = C.menos ? 0 : (agora / 120) | 0; if (!Arte.ui(gg, 'level-up', Math.round(p.x) - 23, p.base - 50 - sobe, q)) Arte.texto(gg, T.sobe, p.x, p.base - 50 - sobe, { fonte: 'reino-ouro', alinhar: 'centro' }) }
    if (M.trocar && M.fase === 'carta') { const p = C.centroDoTerreno(M.trocar); Arte.texto(gg, T.trocar, p.x, p.base - 44, { fonte: 'reino-ouro', alinhar: 'centro' }) }
    if ((M.fase === 'carta') && M.hordaN) {
      const p = C.pos(-34, -1), b = C.menos ? 0 : Math.round(Math.abs(Math.sin(agora / 400)) * 2)
      Arte.icone(gg, 'horn', Math.max(1, Math.round(p.x) - 14), Math.round(p.y) - 46 - b); Arte.texto(gg, 'x' + M.hordaN, Math.max(13, Math.round(p.x) - 2), Math.round(p.y) - 44 - b, { fonte: 'reino-contorno' })
      if (M.hordaChefe) if (!Arte.ui(gg, 'label-boss', Math.max(1, Math.round(p.x) - 14), Math.round(p.y) - 60 - b)) Arte.texto(gg, T.chefe, Math.max(1, Math.round(p.x) - 14), Math.round(p.y) - 58 - b, { fonte: 'reino-ouro' })
    }
  }

  /** Um quadro da interface (depois do mundo). */
  UI.desenhar = (agora) => {
    const L = UI.L, f = M.fase
    g.setTransform(C.e, 0, 0, C.e, 0, 0); g.imageSmoothingEnabled = false
    if (f === 'fim') { fim(agora); hud(agora); aviso(agora); brinde(agora); return }
    if (f === 'carta') {
      mesa()
      if (!M.cartaPosta) {
        if (!L.cel) premios(true)
        mao(agora)
        if (M.sel >= 0 && M.mao[M.sel]) faixa(linhasDaCarta(M.mao[M.sel].carta), L.cel ? linhasDaCarta(M.mao[M.sel].carta).length < 3 && quebrar(CONFIG.CARTAS[M.mao[M.sel].carta].texto, C.VW - 8).length === 1 : true, true); else if (M.info) faixa(M.info, true, true); else if (L.cel) premios(false)
        ouroBt(L.sortear, 'sortear', 'reroll', M.sortear, agora)
      } else {
        premios(true)
        const r = L.lutar2, pulsa = C.menos ? 0 : Math.round(Math.abs(Math.sin(agora / 240)) * 2)
        const d = bt('green', { ...r, y: r.y - pulsa }, 'lutar2'); Arte.texto(g, T.lutar, r.x + (r.w >> 1), r.y + 7 + d - pulsa, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' }); g.globalAlpha = 1
        if (L.cel) g.globalAlpha = 1
      }
      if (M.consertar.visivel) ouroBt(L.consertar, 'consertar', 'life', M.consertar, agora)
    } else if (f === 'luta') { mesa(); if (L.cel) premios(true) } else if (f === 'terreno') {
      mesa(); faixa([T.escolhaTerreno], true)
      const r = L.lutar2, d = bt('plum', r, 'voltar'); Arte.texto(g, T.voltar, r.x + (r.w >> 1), r.y + 7 + d, { fonte: 'reino', cor: COR.creme, alinhar: 'centro' }); g.globalAlpha = 1
    } else if (f === 'vitoria') { mesa(); vitoria(agora); if (L.cel && M.vitoria.pronto) Arte.texto(g, T.pegue, C.VW >> 1, L.mesa.y + 38, { fonte: 'reino-contorno', alinhar: 'centro' }) } else if (f === 'derrota') { mesa(); derrota(agora) } else if (f === 'chefe') { mesa(); chefe(agora) }
    hud(agora); aviso(agora); brinde(agora)
    if (M.arrasto?.moveu) { const c = M.mao[M.arrasto.indice]; if (c) Arte.carta(g, c.carta, c.nivel, Math.round(M.arrasto.x - 28), Math.round(M.arrasto.y - 50)) }
  }
  medir()
  return UI
}
