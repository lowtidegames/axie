// Piloto — tela "Egg": cruzamento pelo motor (shared/costura.js) e a revelação do filhote em 5 passos
// (ordem do motor: mark, legs, arms, head, body). As chances por parte aparecem ANTES de confirmar.
// A tela não sorteia nada: o filhote sai de costurar({ semente, paiA, paiB }).
import { PARTES, RARIDADES } from '../../shared/config.js'
import { chancesDaCostura, costurar, podeCosturar, olharOAvesso } from '../../shared/costura.js'
import * as Arte from './arte.js'
import { desenharNinho, ninhoTopo } from './cenas.js'
import { CLUTCHES, ELEMENTOS, ORDEM_DO_OVO, RARIDADE, SLOT_EN, nomeDaParte, nomePorApelidos, apelidoDaParte } from './tema.js'

const $ = (s, r = document) => r.querySelector(s)
const idDe = (g) => String(g).split('@')[0]
const rarDe = (g) => String(g).split('@')[1] ?? 'comum'
const pct = (x) => `${Math.round(x * 1000) / 10}%`
const RANK = Object.keys(RARIDADES)
const TEMPO = { bordado: 800, pernas: 800, bracos: 800, cabeca: 1000, tronco: 1200 }

export function criarOvo({ raiz, colecao, opcoes, ganchos }) {
  const O = { sel: [], filho: null, sorteios: null, pais: null, passo: 0, auto: false, fase: 'escolher', t0: 0, cai: 0, pico: 0, pedacos: [] }
  const cv = $('#oCanvas', raiz), cx = cv.getContext('2d')
  let LW = 384, LH = 216, k = 2, fundo = null

  // ---------------------------------------------------------------- escolher os pais
  function desenharEscolha() {
    const lista = $('#oPais', raiz)
    lista.innerHTML = ''
    for (const m of colecao.todos()) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'o-pai'
      b.dataset.uid = m.uid
      b.setAttribute('aria-pressed', String(O.sel.includes(m.uid)))
      const usados = m.voltasUsadas ?? 0
      b.innerHTML = `<img class="px" src="${Arte.url(Arte.monstro(colecao.def(m)))}" alt=""><span><b>${m.nome}</b><small>${ELEMENTOS[colecao.tipo(m)].nome} · Clutches ${CLUTCHES - usados}/${CLUTCHES} left</small></span>`
      b.addEventListener('click', () => {
        if (O.sel.includes(m.uid)) O.sel = O.sel.filter((u) => u !== m.uid)
        else O.sel = [...O.sel, m.uid].slice(-2)
        desenharEscolha()
      })
      lista.appendChild(b)
    }
    const ch = $('#oChances', raiz), btn = $('#oBreed', raiz), aviso = $('#oAviso', raiz)
    if (O.sel.length < 2) {
      ch.innerHTML = '<p class="o-dica">Pick two parents to see the odds for every part.</p>'
      btn.disabled = true; aviso.textContent = ''
      ganchos?.mudou?.()
      return
    }
    const [A, B] = O.sel.map((u) => colecao.porUid(u))
    const pa = colecao.paraCostura(A), pb = colecao.paraCostura(B)
    const pode = podeCosturar(pa, pb)
    btn.disabled = !pode.ok
    aviso.textContent = pode.ok ? '' : traduzirRecusa(pode.codigo)
    const chances = chancesDaCostura(pa, pb)
    const deQuem = (gene) => [pa.partes, pb.partes].map((p, i) => (Object.values(p).some((x) => x.face === gene || x.forro === gene) ? [A, B][i].nome : null)).filter(Boolean)
    ch.innerHTML = ORDEM_DO_OVO.map((slot) => {
      const ops = chances[slot].face
      return `<div class="o-linha"><b>${SLOT_EN[slot]}</b><ul>${ops.map((o) => `<li><span class="gema" style="--g:${RARIDADE[o.raridade].cor}"></span>${nomeDaParte(o.id)} <small>${RARIDADE[o.raridade].nome} · from ${deQuem(o.gene).join(' or ')}</small><em>${pct(o.chance)}</em></li>`).join('')}</ul></div>`
    }).join('') + '<p class="o-dica">Odds are exact and fixed before the egg is laid. Each part comes from one parent.</p>'
    ganchos?.mudou?.()
  }
  function traduzirRecusa(c) {
    return { CARRETEL_CHEIO: 'One parent has no clutches left.', PARENTES: 'Close relatives cannot share a nest.', MESMO_BONECO: 'Pick two different monsters.', OCUPADO: 'One parent is busy.', APOSENTADO: 'One parent has retired.' }[c] ?? 'These two cannot share a nest.'
  }

  // ---------------------------------------------------------------- botar o ovo
  function botar(semente) {
    const [A, B] = O.sel.map((u) => colecao.porUid(u))
    const r = costurar({ semente, paiA: colecao.paraCostura(A), paiB: colecao.paraCostura(B), idFilho: 'egg-' + semente })
    if (!r.ok) { $('#oAviso', raiz).textContent = traduzirRecusa(r.codigo); return }
    O.pais = [A, B]
    colecao.usarClutch(A.uid); colecao.usarClutch(B.uid)
    O.filho = r.filho; O.sorteios = r.sorteios; O.passo = 0; O.fase = 'cena'; O.t0 = performance.now(); O.cai = 0; O.pico = 0; O.pedacos = []
    O.nome = null
    $('#oEscolha', raiz).hidden = true
    $('#oCena', raiz).hidden = false
    medir()
    $('#oCartas', raiz).innerHTML = ''
    $('#oNomeParcial', raiz).textContent = '?-?-?'
    $('#oFinal', raiz).hidden = true
    $('#oCena', raiz).classList.remove('o-fim')
    $('#oSegredos', raiz).hidden = true
    $('#oProximo', raiz).hidden = false
    $('#oPaisCel', raiz).innerHTML = O.pais.map((p) => `<span><img class="px" src="${Arte.url(Arte.monstro(colecao.def(p)))}" alt="">${p.nome}</span>`).join('<i>+</i>')
    atualizarBotoes()
    ganchos?.mudou?.()
    if (O.auto) agendarAuto()
  }

  function medir() {
    const larg = raiz.clientWidth || window.innerWidth
    const cel = larg < 700
    k = cel ? 2 : 2
    LW = cel ? Math.floor((larg - 16) / 2) : 384
    LH = cel ? 150 : 216
    cv.width = LW; cv.height = LH
    cv.style.width = LW * k + 'px'; cv.style.height = LH * k + 'px'
    raiz.classList.toggle('o-celular', cel)
    fundo = desenharNinho(LW, LH)
  }

  // ---------------------------------------------------------------- revelação
  function proximo() {
    if (O.fase !== 'cena' || O.passo >= ORDEM_DO_OVO.length) return
    O.passo++
    O.tPasso = performance.now()
    const slot = ORDEM_DO_OVO[O.passo - 1]
    const s = O.sorteios.find((x) => x.parte === slot)
    const gene = s.face.gene
    const pai = O.pais[s.face.dePai === 'A' ? 0 : 1]
    const li = document.createElement('li')
    li.className = 'o-carta'
    li.innerHTML = `<span class="gema" style="--g:${RARIDADE[rarDe(gene)].cor}"></span><b>${SLOT_EN[slot]}:</b> ${nomeDaParte(idDe(gene))} <small>· ${RARIDADE[rarDe(gene)].nome} · from ${pai.nome}</small>`
    $('#oCartas', raiz).appendChild(li)
    const p = O.filho.partes
    const visto = (sl) => ORDEM_DO_OVO.indexOf(sl) < O.passo
    $('#oNomeParcial', raiz).textContent = ['cabeca', 'bracos', 'pernas'].map((sl) => (visto(sl) ? apelidoDaParte(idDe(p[sl].face)) : '?')).join('-')
    if (O.passo === ORDEM_DO_OVO.length) pico()
    atualizarBotoes()
    ganchos?.mudou?.()
    if (O.auto && O.passo < ORDEM_DO_OVO.length) agendarAuto()
  }
  let timerAuto = null
  function agendarAuto() {
    clearTimeout(timerAuto)
    const slot = ORDEM_DO_OVO[O.passo] ?? 'bordado'
    timerAuto = setTimeout(() => { if (O.auto && O.fase === 'cena') proximo() }, O.passo === 0 ? 800 : TEMPO[ORDEM_DO_OVO[O.passo - 1]] ?? 800)
    void slot
  }
  function raridadeDoFilho() {
    let melhor = 'comum'
    for (const g of Object.values(O.filho.partes)) if (RANK.indexOf(rarDe(g.face)) > RANK.indexOf(melhor)) melhor = rarDe(g.face)
    return melhor
  }
  function pico() {
    O.pico = performance.now()
    const tipo = PARTES[idDe(O.filho.partes.tronco.face)].tipo
    O.tipo = tipo
    O.raro = RANK.indexOf(raridadeDoFilho()) >= RANK.indexOf('rara')
    if (!opcoes.menosAnimacao()) O.pedacos = Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * Math.PI * 2 + 0.3, v: 0.06 + (i % 3) * 0.02 }))
    O.nome = nomePorApelidos(Object.fromEntries(Object.entries(O.filho.partes).map(([s, g]) => [s, g.face])))
    const rar = raridadeDoFilho()
    const espera = O.raro ? 900 : 300
    $('#oProximo', raiz).hidden = true
    setTimeout(() => {
      const f = $('#oFinal', raiz)
      f.hidden = false
      $('#oCena', raiz).style.setProperty('--rar', RARIDADE[rar].cor)
      $('#oNome', raiz).textContent = O.nome
      $('#oInfo', raiz).innerHTML = `<img src="${Arte.url(Arte.iconeElemento(tipo))}" alt="">${ELEMENTOS[tipo].nome} · <span class="gema" style="--g:${RARIDADE[rar].cor}"></span>${RARIDADE[rar].nome}`
      O.fase = 'fim'
      $('#oCena', raiz).classList.add('o-fim')
      ganchos?.mudou?.()
    }, espera)
  }

  // ---------------------------------------------------------------- desenho da cena
  function desenhar(t) {
    requestAnimationFrame(desenhar)
    if (O.fase === 'escolher' || raiz.hidden || !fundo) return
    const menos = opcoes.menosAnimacao()
    cx.clearRect(0, 0, LW, LH)
    cx.drawImage(fundo, 0, 0)
    const base = ninhoTopo(LH) + 4
    const ex = Math.round(LW / 2) - 32
    // os pais, um de cada lado (no PC)
    if (LW >= 300 && O.pais) {
      cx.drawImage(Arte.monstro(colecao.def(O.pais[0])), 14, base - 64 - 6)
      cx.save(); cx.translate(LW - 14, base - 70); cx.scale(-1, 1); cx.drawImage(Arte.monstro(colecao.def(O.pais[1])), 0, 0); cx.restore()
    }
    // pico: a cor do elemento enche o fundo por trás
    if (O.pico) {
      const dt = t - O.pico
      const rMax = Math.min(LW / 2 - 8, 96), r = menos ? rMax : Math.min(rMax, dt * 0.35)
      if (O.raro) { cx.fillStyle = `rgba(20,12,30,${Math.min(0.55, dt / 900)})`; cx.fillRect(0, 0, LW, LH) }
      const disco = (rr, cor) => { cx.fillStyle = cor; for (let y = -rr; y <= rr; y++) { const w = Math.round(Math.sqrt(Math.max(0, rr * rr - y * y))); cx.fillRect(Math.round(LW / 2) - w, Math.round(base - 32 + y), 2 * w, 1) } }
      const el = ELEMENTOS[O.tipo]
      disco(r, el.escuro); disco(Math.max(0, r - 8), el.cor); disco(Math.max(0, r * 0.55), el.claro)
      if (!menos) { cx.save(); cx.translate(LW / 2, base - 32); cx.rotate(dt / 3000); cx.fillStyle = 'rgba(255,243,168,0.35)'; for (let i = 0; i < 8; i++) { cx.rotate(Math.PI / 4); cx.fillRect(0, -3, r, 6) } cx.restore() }
      if (O.raro && !menos) { cx.save(); cx.globalAlpha = 0.25 + 0.15 * Math.sin(dt / 200); cx.fillStyle = '#FFF3A8'; cx.fillRect(ex - 6, base - 70, 76, 70); cx.restore() }
    }
    // o ovo cai no ninho com um toc
    const dtc = t - O.t0
    let ey = base - 64
    if (!menos && dtc < 420) ey = -64 + (base) * Math.min(1, (dtc / 420) ** 2)
    else if (!menos && dtc < 560) ey = base - 64 - Math.round(3 * Math.sin(((dtc - 420) / 140) * Math.PI))
    const fase = O.passo
    const balanca = !menos && O.tPasso && t - O.tPasso < 300 && fase < 5 ? Math.round(Math.sin((t - O.tPasso) / 30) * 1.5) : 0
    const estadoOvo = fase === 0 || fase === 1 ? 'whole' : fase < 5 ? 'cracked' : 'open'
    if (fase < 5) cx.drawImage(Arte.ovo(estadoOvo), ex + balanca, Math.round(ey))
    if (fase >= 1 && fase < 5) { // a runa da marca brilha por dentro
      cx.save(); cx.globalAlpha = menos ? 0.9 : 0.6 + 0.3 * Math.sin(t / 250)
      cx.drawImage(Arte.marcaSozinha(O.filho.partes.bordado.face), ex + 24 + balanca, Math.round(ey) + 30)
      cx.restore()
    }
    const partes = Object.fromEntries(Object.entries(O.filho?.partes ?? {}).map(([s, g]) => [s, g.face]))
    if (fase >= 2) {
      // as partes saem pela casca na ordem do motor (sem o corpo, que é o pico)
      const head = fase >= 4 && fase < 5 ? -3 : 0
      if (fase < 5) cx.drawImage(Arte.monstroEmPartes(partes, ORDEM_DO_OVO.slice(1, fase)), ex, Math.round(ey) + head)
      else {
        cx.drawImage(Arte.ovo('open'), ex, base - 64 + 6)
        cx.drawImage(Arte.monstro({ partes }), ex, base - 66)
      }
    }
    // pedaços de casca voando (até 10)
    if (O.pico && O.pedacos.length) {
      const dt = t - O.pico
      if (dt < 900) {
        cx.fillStyle = '#F7F1E3'
        for (const p of O.pedacos) { const x = LW / 2 + Math.cos(p.a) * dt * p.v * 1.4, y = base - 32 + Math.sin(p.a) * dt * p.v + (dt * dt) / 9000; cx.fillRect(Math.round(x), Math.round(y), 3, 2); cx.fillStyle = '#2B1E3A'; cx.fillRect(Math.round(x), Math.round(y) + 2, 3, 1); cx.fillStyle = '#F7F1E3' }
      }
    }
  }
  requestAnimationFrame(desenhar)

  function atualizarBotoes() {
    $('#oAuto', raiz).setAttribute('aria-pressed', String(O.auto))
    $('#oProximo', raiz).textContent = O.passo === 0 ? 'Tap the egg' : O.passo === ORDEM_DO_OVO.length - 1 ? 'Hatch!' : 'Crack more'
  }

  // ---------------------------------------------------------------- botões
  $('#oBreed', raiz).addEventListener('click', () => botar(ganchos.semente()))
  $('#oProximo', raiz).addEventListener('click', proximo)
  cv.addEventListener('click', proximo)
  $('#oAuto', raiz).addEventListener('click', () => { O.auto = !O.auto; atualizarBotoes(); if (O.auto && O.fase === 'cena') agendarAuto() })
  $('#oNomear', raiz).addEventListener('click', () => {
    const c = $('#oNomeCampo', raiz)
    c.hidden = !c.hidden
    if (!c.hidden) { c.value = O.nome; c.focus() }
  })
  $('#oNomeCampo', raiz).addEventListener('input', (e) => { O.nome = e.target.value.slice(0, 20) || nomePorApelidos(Object.fromEntries(Object.entries(O.filho.partes).map(([s, g]) => [s, g.face]))); $('#oNome', raiz).textContent = O.nome })
  $('#oEspiar', raiz).addEventListener('click', () => {
    const s = $('#oSegredos', raiz)
    s.hidden = !s.hidden
    const av = olharOAvesso(O.filho)
    s.innerHTML = '<b>Hidden traits</b> (passed on to future eggs, not used in fights)<ul>' + ORDEM_DO_OVO.map((sl) => `<li>${SLOT_EN[sl]}: ${nomeDaParte(idDe(av[sl]))} <small>${RARIDADE[rarDe(av[sl])].nome}</small></li>`).join('') + '</ul>'
  })
  $('#oTime', raiz).addEventListener('click', () => {
    colecao.adicionar({ nome: O.nome, genes: O.filho.partes, pais: O.filho.pais, geracao: O.filho.geracao })
    voltarEscolha()
    ganchos?.paraTime?.()
  })
  $('#oDeNovo', raiz).addEventListener('click', voltarEscolha)
  function voltarEscolha() {
    clearTimeout(timerAuto)
    O.fase = 'escolher'; O.filho = null; O.passo = 0; O.pico = 0
    $('#oEscolha', raiz).hidden = false
    $('#oCena', raiz).hidden = true
    $('#oNomeCampo', raiz).hidden = true
    desenharEscolha()
  }
  window.addEventListener('resize', () => { if (O.fase !== 'escolher') medir() })

  return { O, mostrar() { if (O.fase === 'escolher') desenharEscolha(); else medir() }, proximo, botar }
}
