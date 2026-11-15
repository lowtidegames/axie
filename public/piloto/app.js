// Piloto — a prova do IDLE POR PATRULHAS (modo local, sem servidor). Telas: Road (casa), Patrol Orders, Battle, Patrol report,
// Monsters e Nest. Página separada do jogo antigo; só caminhos relativos.
// A tela não calcula regra: cada luta sai inteira do motor + escolhedor (tatica.js) na hora em que começa; os ícones
// "Strong vs / Weak to" e a tira final saem de patrulha.js (bateForte do motor); o ovo sai de costurar().
import { montarBoneco } from '../../shared/batalha.js'
import { CARTAS, PARTES } from '../../shared/config.js'
import * as Arte from './arte.js'
import { criarBatalha } from './batalha-tela.js'
import { MAPA, desenharMapa, geometriaDoMapa } from './cenas.js'
import { LUGARES, PATRULHA, RACAO_POR_LUTA, RACOES_MAX, criarConta, defDoPronto, lugarPorN } from './conta-piloto.js'
import { criarFicha } from './ficha-tela.js'
import { criarOvo } from './ovo-tela.js'
import { resumirPatrulha, rodarLuta, vantagens } from './patrulha.js'
import { criarSom } from './som-piloto.js'
import { TATICAS, ordemPadrao } from './tatica.js'
import {
  AVISOS, ELEMENTOS, NOMES, POSICAO_EN, RODA, TATICAS_EN, apanhaDe, nomeDaHabilidade, nomeDoLugar, nomeDoTitulo, textoDaHabilidade, SLOT_DA_HABILIDADE,
} from './tema.js'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const idDe = (g) => String(g).split('@')[0]
const params = new URLSearchParams(location.search)
const ler = (k, p) => { try { return localStorage.getItem(k) ?? p } catch { return p } }
const gravar = (k, v) => { try { localStorage.setItem(k, v) } catch { /* sem armazenamento */ } }
const armazem = (() => { try { return window.localStorage } catch { return null } })()
const dorme = (ms) => new Promise((ok) => setTimeout(ok, ms))

const conta = criarConta(armazem)
const som = criarSom()
const tocar = (n) => som.tocar(n)

// ------------------------------------------------------------------ nomes (todos saem de tema.js)
document.title = `${NOMES.jogo} · pilot`
$('#marcaNome').textContent = NOMES.jogo
$('#mTitulo').textContent = NOMES.jogo
$('#oTitulo').textContent = NOMES.ninho
$('#fGuarda').textContent = NOMES.guarda
$('#fBordaAviso').textContent = AVISOS.borda
$('#oDecide').textContent = AVISOS.ovo

// ------------------------------------------------------------------ Reduced motion + som (nada toca antes do 1º toque)
const prefere = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
let menos = ler('piloto_menos', prefere ? '1' : '0') === '1'
function aplicarMenos() {
  document.body.classList.toggle('menos', menos)
  $('#btMenos').setAttribute('aria-pressed', String(menos))
  $('#btMenos').textContent = menos ? 'Reduced motion: on' : 'Reduced motion: off'
  if (cenaAtual === 'mapa') desenharMapaTela()
}
$('#btMenos').addEventListener('click', () => { menos = !menos; gravar('piloto_menos', menos ? '1' : '0'); aplicarMenos() })
const opcoes = { menosAnimacao: () => menos, som: tocar }
function aplicarSom() {
  const b = $('#btSom')
  b.setAttribute('aria-pressed', String(!som.mudo()))
  b.textContent = som.mudo() ? 'Sound: off' : 'Sound: on'
}
$('#btSom').addEventListener('click', () => { som.alternarMudo(); aplicarSom(); tocar('botao') })
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => som.destravar(), { capture: true })
// todo botão sem som próprio ganha o toque curto
document.addEventListener('click', (e) => { const b = e.target.closest?.('button'); if (b && !b.disabled && !b.dataset.somProprio) tocar('botao') }, true)

// ------------------------------------------------------------------ peças de desenho
const tipoDe = (def) => PARTES[idDe(def.partes.tronco)].tipo
const icone = (t, cls = '') => `<img class="px ${cls}" src="${Arte.url(Arte.iconeElemento(t))}" alt="${ELEMENTOS[t].nome}">`
const chipEl = (t) => `<span class="chip" style="--c:${ELEMENTOS[t].cor}"><img class="px" src="${Arte.url(Arte.iconeElemento(t))}" alt="">${ELEMENTOS[t].nome}</span>`
const imgMonstro = (def, cls = '') => `<img class="px ${cls}" src="${Arte.url(Arte.monstro(def))}" alt="">`
const defDe = (uid) => conta.def(conta.porUid(uid))
const guardaDe = (n) => lugarPorN(n).guarda.map(defDoPronto)

/** Número que rola até o valor (com Reduced motion troca na hora). */
function rolar(el, ate, { de = 0, ms = 600, tique = true } = {}) {
  if (menos || de === ate) { el.textContent = ate; return Promise.resolve() }
  return new Promise((ok) => {
    const t0 = performance.now(); let visto = de
    const f = (t) => {
      const p = Math.min(1, (t - t0) / ms), v = Math.round(de + (ate - de) * (1 - (1 - p) ** 3))
      if (v !== visto) { visto = v; el.textContent = v; if (tique) tocar('conta') }
      if (p < 1) requestAnimationFrame(f); else { el.textContent = ate; ok() }
    }
    requestAnimationFrame(f)
  })
}
/** Festa pequena: faíscas saindo de um elemento (nenhuma com Reduced motion; no máximo 14 por vez). */
function faiscas(el, cor = '#FFB347', n = 12) {
  if (menos || !el) return
  const q = el.getBoundingClientRect(), caixa = $('#festa')
  for (let i = 0; i < Math.min(14, n); i++) {
    const s = document.createElement('i')
    const a = (i / n) * Math.PI * 2, d = 26 + (i % 3) * 14
    s.style.cssText = `left:${q.left + q.width / 2}px;top:${q.top + q.height / 2}px;background:${cor};--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px`
    caixa.appendChild(s)
    setTimeout(() => s.remove(), 750)
  }
}

// ------------------------------------------------------------------ topo: Rations e Renome
function atualizarTopo(pulsar = false) {
  $('#cRacoesNum').textContent = conta.racoes
  $('#cRacoesMax').textContent = '/' + RACOES_MAX
  $('#cRacoes').classList.toggle('pouco', conta.racoes < PATRULHA.lutas * RACAO_POR_LUTA)
  if (!renomeRolando) $('#cRenomeNum').textContent = conta.renome
  if (pulsar) { const c = $('#cRacoes'); c.classList.remove('pulsa'); void c.offsetWidth; c.classList.add('pulsa') }
}
let renomeRolando = false

// ------------------------------------------------------------------ navegação
const cenas = ['mapa', 'time', 'luta', 'relato', 'monstros', 'ovo']
const ABA_DA_CENA = { mapa: 'mapa', time: 'mapa', luta: 'mapa', relato: 'mapa', monstros: 'monstros', ovo: 'ovo' }
let cenaAtual = null
function mostrar(c) {
  if (cenaAtual === 'luta' && c !== 'luta') sairDaLuta(c)
  if (cenaAtual === 'relato' && c !== 'relato') R.pular = true // sair no meio: os carimbos terminam sem animação
  for (const k of cenas) $('#' + k).hidden = k !== c
  for (const a of $$('.aba')) a.setAttribute('aria-current', String(a.dataset.cena === ABA_DA_CENA[c]))
  cenaAtual = c
  if (c === 'mapa') desenharMapaTela()
  if (c === 'time') desenharOrdens()
  if (c === 'monstros') ficha.desenharGrade()
  if (c === 'ovo') ovo.mostrar()
  if (c !== 'mapa') pararMapa()
  window.scrollTo(0, 0)
  atualizarTopo()
  T.cena = c
}
for (const a of $$('.aba')) a.addEventListener('click', () => mostrar(a.dataset.cena))

// ================================================================== ROAD (mapa vivo)
let mapaBase = null, mapaRaf = 0, geo = null
function basesDoMapa() {
  geo = geometriaDoMapa(Arte.manifesto().mapPlaces)
  const cv = Arte.criarCanvas(MAPA.w, MAPA.h), cx = cv.getContext('2d')
  cx.drawImage(desenharMapa(), 0, 0)
  // com o mapa em PNG as construções já estão desenhadas: o marcador entra só nos lugares abertos
  LUGARES.forEach((l, i) => { if (!geo.comPng || l.aberto) cx.drawImage(Arte.lugar(l.n), geo.lugares[i][0] - 16, geo.lugares[i][1] - 26) })
  return cv
}
function pontoNoCaminho(pts, s) {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  let resta = Math.max(0, Math.min(1, s)) * seg.reduce((a, b) => a + b, 0)
  for (let i = 0; i < seg.length; i++) { if (resta <= seg[i] || i === seg.length - 1) { const f = seg[i] ? Math.min(1, resta / seg[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f] } resta -= seg[i] }
  return pts[0]
}
function quadroDoMapa(t) {
  const cv = $('#mCanvas'), cx = cv.getContext('2d')
  cx.drawImage(mapaBase, 0, 0)
  const P = '#2B1E3A'
  // ninho: palha, ovo e fumaça subindo
  const [nx, ny] = geo.ninho
  cx.fillStyle = P; cx.fillRect(nx - 9, ny - 5, 18, 8)
  cx.fillStyle = '#D9B24A'; cx.fillRect(nx - 8, ny - 4, 16, 6); cx.fillStyle = '#F2D27A'; cx.fillRect(nx - 7, ny - 4, 14, 2)
  cx.fillStyle = P; cx.fillRect(nx - 3, ny - 10, 6, 7); cx.fillStyle = '#F7F1E3'; cx.fillRect(nx - 2, ny - 9, 4, 5); cx.fillStyle = '#A98BE8'; cx.fillRect(nx - 1, ny - 7, 1, 1); cx.fillStyle = '#F05A3C'; cx.fillRect(nx + 1, ny - 8, 1, 1)
  for (let i = 0; i < 3; i++) {
    const f = menos ? (i + 1) / 4 : ((t / 2600 + i / 3) % 1)
    const x = nx + 7 + Math.round(Math.sin(f * 5 + i) * 2), y = ny - 10 - Math.round(f * 16), r = 1 + Math.round(f * 2)
    cx.globalAlpha = 0.75 * (1 - f); cx.fillStyle = '#F7F1E3'; cx.fillRect(x - r, y - r, r * 2, r * 2); cx.globalAlpha = 1
  }
  // bandeirinha em cada lugar aberto
  LUGARES.forEach((l, i) => {
    if (!l.aberto) return
    const [x, y] = geo.lugares[i], bx = x + 13, by = y - 30
    cx.fillStyle = P; cx.fillRect(bx, by, 1, 14)
    const onda = menos ? 0 : Math.round(Math.sin(t / 220 + i * 2))
    cx.fillStyle = l.n === conta.lugar ? '#FFB347' : '#F7F1E3'
    cx.fillRect(bx + 1, by + onda * 0, 4, 5); cx.fillRect(bx + 5, by + 1 + onda, 3, 4)
    cx.fillStyle = P; cx.fillRect(bx + 1, by + 5, 4, 1)
  })
  // a patrulha andando até o lugar escolhido (3 bichinhos na cor do elemento de cada um)
  const caminho = geo.caminho(conta.lugar)
  const ciclo = menos ? 0.62 : (t / 9000) % 1
  const s0 = Math.min(1, ciclo / 0.8)
  conta.trio.forEach((uid, j) => {
    const s = Math.max(0, s0 - j * 0.07)
    const [x, y] = pontoNoCaminho(caminho, s)
    const pulo = menos || s0 >= 1 ? 0 : Math.round(Math.abs(Math.sin(t / 130 + j * 1.3)) * 2)
    const px = Math.round(x), py = Math.round(y) - pulo
    cx.fillStyle = 'rgba(43,30,58,0.3)'; cx.fillRect(px - 3, Math.round(y) + 1, 6, 1)
    cx.fillStyle = P; cx.fillRect(px - 4, py - 6, 8, 7); cx.fillRect(px - 3, py - 7, 6, 9)
    cx.fillStyle = ELEMENTOS[tipoDe(defDe(uid))].cor; cx.fillRect(px - 3, py - 6, 6, 6)
    cx.fillStyle = ELEMENTOS[tipoDe(defDe(uid))].claro; cx.fillRect(px - 3, py - 6, 3, 2)
    cx.fillStyle = P; cx.fillRect(px + 1, py - 4, 1, 2)
  })
}
function pararMapa() { cancelAnimationFrame(mapaRaf); mapaRaf = 0 }
function lacoDoMapa(t) { quadroDoMapa(t); mapaRaf = menos ? 0 : requestAnimationFrame(lacoDoMapa) }
function desenharMapaTela() {
  const caixa = $('#mMapa')
  const larg = document.documentElement.clientWidth
  const cel = larg < 700
  const k = cel ? 1 : Math.max(1, Math.min(3, Math.floor((larg - 440) / MAPA.w), Math.floor((window.innerHeight - 150) / MAPA.h)))
  const cv = $('#mCanvas')
  mapaBase ??= basesDoMapa()
  cv.width = MAPA.w; cv.height = MAPA.h
  cv.style.width = MAPA.w * k + 'px'; cv.style.height = MAPA.h * k + 'px'
  caixa.style.width = cel ? '100%' : MAPA.w * k + 'px'
  caixa.style.height = MAPA.h * k + 'px'
  const desloc = cel ? Math.round((caixa.clientWidth - MAPA.w) / 2) : 0
  cv.style.marginLeft = desloc + 'px'
  const marcas = $('#mMarcas')
  marcas.innerHTML = ''
  LUGARES.forEach((l, i) => {
    const [x, y] = geo.lugares[i]
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'm-marca' + (l.aberto ? ' aberta' : '') + (x > MAPA.w * 0.72 ? ' m-marca--dir' : x < MAPA.w * 0.2 ? ' m-marca--esq' : '')
    b.style.left = x * k + desloc + 'px'; b.style.top = (y - 10) * k + 'px'
    b.innerHTML = `<span>${l.n}</span><em>${nomeDoLugar(l.n)}${l.aberto ? `<i>${l.guarda.map((g) => icone(tipoDe(defDoPronto(g)))).join('')}</i>` : ''}</em>`
    b.setAttribute('aria-label', nomeDoLugar(l.n) + (l.aberto ? ': open the patrol orders' : ' (coming soon)'))
    b.addEventListener('click', () => irPara(i))
    marcas.appendChild(b)
  })
  const ol = $('#mLista')
  ol.innerHTML = LUGARES.map((l, i) => `<li><button type="button" class="m-item${l.aberto ? ' aberta' : ''}" data-i="${i}">
    <img class="px" src="${Arte.url(Arte.lugar(l.n))}" alt=""><span><b>${l.n}. ${nomeDoLugar(l.n)}</b>${l.aberto
    ? `<small class="m-guarda">${l.guarda.map((g) => `<span>${icone(tipoDe(defDoPronto(g)))}${defDoPronto(g).nome}</span>`).join('')}</small>` : '<small>Coming soon</small>'}</span>${l.aberto ? '<i>Orders</i>' : ''}</button></li>`).join('')
  for (const b of $$('button', ol)) b.addEventListener('click', () => irPara(+b.dataset.i))
  // a fita da última patrulha nunca mostra o placar antes do carimbo: só leva ao relato
  const u = $('#mUltima')
  u.hidden = !R.patrulha
  if (R.patrulha) {
    u.innerHTML = `<span>Last patrol: <b>${nomeDoLugar(R.patrulha.n)}</b></span><button type="button" class="bt bt--sec bt--peq" id="mVerRelato">See report</button>`
    $('#mVerRelato').addEventListener('click', () => abrirRelato())
  }
  pararMapa()
  lacoDoMapa(performance.now())
}
function irPara(i) {
  const l = LUGARES[i]
  if (l.aberto) { conta.lugar = l.n; mostrar('time'); return }
  const abertos = LUGARES.filter((x) => x.aberto).map((x) => nomeDoLugar(x.n))
  const a = $('#mAviso')
  a.textContent = `${nomeDoLugar(l.n)}: coming soon. Open in the pilot: ${abertos.join(' and ')}.`
  a.hidden = false
  clearTimeout(irPara.t); irPara.t = setTimeout(() => { a.hidden = true }, 2600)
}
let resetArmado = 0
$('#btReset').addEventListener('click', () => {
  const b = $('#btReset')
  if (Date.now() - resetArmado > 4000) { resetArmado = Date.now(); b.textContent = 'Tap again to reset the pilot'; setTimeout(() => { b.textContent = 'Reset pilot' }, 4000); return }
  resetArmado = 0
  conta.zerar(); R.patrulha = null; time.sel = null; time.ordens = {}; ultimaBorda = {}
  b.textContent = 'Reset pilot'
  mostrar('mapa')
})

// ================================================================== PATROL ORDERS
const time = { tatica: TATICAS.includes(ler('piloto_tatica', 'rush')) ? ler('piloto_tatica', 'rush') : 'rush', ordens: {}, sel: null }
const cartasDe = (uid) => montarBoneco(defDe(uid)).cartas
function ordemDe(uid) {
  const pos = conta.trio.indexOf(uid)
  let o = time.ordens[uid]
  if (!o || !o.mexido) o = time.ordens[uid] = { lista: ordemPadrao(cartasDe(uid), Math.max(0, pos)), off: o?.off ?? [], mexido: false }
  return o
}
let ultimaBorda = {}

function desenharOrdens({ animar = true } = {}) {
  const n = conta.lugar, lugar = lugarPorN(n), guarda = guardaDe(n), trio = conta.trio
  $('#fTitulo').textContent = `${NOMES.ordens} · ${nomeDoLugar(n)}`
  $('#tLugar').textContent = `of ${nomeDoLugar(n)}`
  $('#fLugares').innerHTML = LUGARES.filter((l) => l.aberto).map((l) => `<button type="button" class="f-lugar" data-n="${l.n}" aria-pressed="${l.n === n}"><img class="px" src="${Arte.url(Arte.lugar(l.n))}" alt="">${nomeDoLugar(l.n)}</button>`).join('')
  for (const b of $$('.f-lugar')) b.addEventListener('click', () => { if (+b.dataset.n !== conta.lugar) { conta.lugar = +b.dataset.n; b.dataset.somProprio = '1'; tocar('troca'); desenharOrdens() } })
  // a guarda (Front perto do meio)
  $('#tRivais').innerHTML = guarda.map((d, i) => {
    const t = tipoDe(d)
    return `<div class="t-rival-mon"><small class="pos">${POSICAO_EN[i]}</small>${imgMonstro(d, 'espelho')}<div class="t-ficha"><b>${d.nome}</b>${chipEl(t)}<small class="dica">Weak to ${ELEMENTOS[apanhaDe(t)].nome}</small></div></div>`
  }).join('')
  // o trio, com os ícones de vantagem pela regra do motor
  const slots = $('#tSlots')
  slots.innerHTML = ''
  const bordas = trio.map((uid) => vantagens(defDe(uid), guarda))
  const viradas = []
  trio.forEach((uid, pos) => {
    const m = conta.porUid(uid), def = conta.def(m), t = tipoDe(def), v = bordas[pos]
    const pips = (lista) => lista.map((on, j) => icone(tipoDe(guarda[j]), 'f-pip' + (on ? ' on' : ''))).join('')
    const chave = `${uid}|${n}|${v.forte.map(Number).join('')}|${v.fraco.map(Number).join('')}`
    const virou = animar && ultimaBorda[pos] !== undefined && ultimaBorda[pos] !== chave
    ultimaBorda[pos] = chave
    if (virou) viradas.push(pos)
    const el = document.createElement('div')
    el.className = 't-slot' + (virou ? ' virou' : '')
    el.dataset.pos = pos
    el.innerHTML = `<span class="pos">${POSICAO_EN[pos]}</span>
      <button type="button" class="t-mon${time.sel === uid ? ' sel' : ''}" data-uid="${uid}" data-som-proprio="1" aria-label="${m.nome} in ${POSICAO_EN[pos]}: tap, then tap another to swap">${imgMonstro(def)}</button>
      <div class="t-ficha"><b>${m.nome}</b>${chipEl(t)}
        <div class="f-edge" aria-label="Strong vs ${v.nForte}, Weak to ${v.nFraco}">
          <span class="f-e f-e--forte"><em>Strong vs</em><b>${v.nForte}</b><span class="f-pips">${pips(v.forte)}</span></span>
          <span class="f-e f-e--fraco"><em>Weak to</em><b>${v.nFraco}</b><span class="f-pips">${pips(v.fraco)}</span></span>
        </div></div>`
    slots.appendChild(el)
  })
  if (viradas.length) tocar('vira')
  for (const b of $$('.t-mon', slots)) ligarArraste(b)
  const tf = bordas.reduce((s, v) => s + v.nForte, 0), tw = bordas.reduce((s, v) => s + v.nFraco, 0)
  $('#fBorda').textContent = `Type edge: Strong vs ${tf} · Weak to ${tw}.`
  // a conta (os 6 + filhotes)
  $('#tBancoLista').innerHTML = conta.todos().map((m) => {
    const pos = trio.indexOf(m.uid), def = conta.def(m)
    return `<button type="button" class="t-mon t-mon--banco${time.sel === m.uid ? ' sel' : ''}${pos >= 0 ? ' no-trio' : ''}" data-uid="${m.uid}" data-som-proprio="1" aria-label="${m.nome}${pos >= 0 ? ', in ' + POSICAO_EN[pos] : ''}">${imgMonstro(def)}<small>${m.nome}</small>${icone(tipoDe(def), 'f-el')}${pos >= 0 ? `<i class="f-onde">${POSICAO_EN[pos]}</i>` : ''}</button>`
  }).join('')
  for (const b of $$('#tBancoLista .t-mon')) ligarArraste(b)
  // tática
  $('#tTaticas').innerHTML = TATICAS.map((t) => `<button type="button" class="t-tat" role="radio" aria-checked="${time.tatica === t}" data-t="${t}"><b>${TATICAS_EN[t].nome}</b></button>`).join('')
  $('#fTaticaTxt').textContent = TATICAS_EN[time.tatica].texto
  for (const b of $$('.t-tat')) b.addEventListener('click', () => { time.tatica = b.dataset.t; gravar('piloto_tatica', time.tatica); desenharOrdens({ animar: false }) })
  // placar histórico REAL deste trio neste lugar
  const p = conta.placarDoTrio(n, trio)
  $('#fHist').innerHTML = p.v + p.d
    ? `<b>History: ${p.v} W – ${p.d} L</b><small>past fights of this trio at ${nomeDoLugar(n)}, any formation</small>`
    : `<b>History: no fights yet</b><small>this trio has not been to ${nomeDoLugar(n)}</small>`
  // ordem das habilidades (dobrada)
  const habs = $('#fHabs')
  habs.innerHTML = trio.map((uid, pos) => {
    const o = ordemDe(uid)
    return `<div class="f-habmon" data-pos="${pos}"><h4>${POSICAO_EN[pos]} · ${conta.porUid(uid).nome}</h4><ol class="t-hab">${o.lista.map((c, i) => {
      const off = o.off.includes(c), cc = CARTAS[c]
      return `<li class="${off ? 'off' : ''}" data-carta="${c}"><span class="n">${off ? '—' : o.lista.filter((x) => !o.off.includes(x)).indexOf(c) + 1}</span>
        <img class="px ico" src="${Arte.url(Arte.iconeHabilidade(c))}" alt="">
        <span class="txt"><b>${nomeDaHabilidade(c)}</b><span class="custo" title="Glow cost">${'<i></i>'.repeat(cc.linha) || '<em>free</em>'}</span><small>${SLOT_DA_HABILIDADE(c)} · ${ELEMENTOS[cc.tipo].nome} · ${textoDaHabilidade(c)}</small></span>
        <span class="bts"><button type="button" class="bt-ic" data-acao="sobe" aria-label="Move ${nomeDaHabilidade(c)} up" ${i === 0 ? 'disabled' : ''}>▲</button><button type="button" class="bt-ic" data-acao="desce" aria-label="Move ${nomeDaHabilidade(c)} down" ${i === o.lista.length - 1 ? 'disabled' : ''}>▼</button><button type="button" class="bt-ic liga" data-acao="liga" aria-pressed="${!off}">${off ? 'Off' : 'On'}</button></span></li>`
    }).join('')}</ol></div>`
  }).join('')
  for (const li of $$('.t-hab li', habs)) {
    const uid = trio[+li.closest('.f-habmon').dataset.pos], c = li.dataset.carta
    for (const b of $$('button', li)) b.addEventListener('click', () => {
      const o = ordemDe(uid); o.mexido = true
      const i = o.lista.indexOf(c)
      if (b.dataset.acao === 'sobe' && i > 0) [o.lista[i - 1], o.lista[i]] = [o.lista[i], o.lista[i - 1]]
      if (b.dataset.acao === 'desce' && i < o.lista.length - 1) [o.lista[i + 1], o.lista[i]] = [o.lista[i], o.lista[i + 1]]
      if (b.dataset.acao === 'liga') o.off = o.off.includes(c) ? o.off.filter((x) => x !== c) : [...o.off, c]
      desenharOrdens({ animar: false })
    })
  }
  // roda dos elementos (dobrada)
  $('#tRoda').innerHTML = '<svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="56" fill="none" stroke="#2B1E3A" stroke-width="2" stroke-dasharray="4 4"/></svg>' + RODA.map((t, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / RODA.length
    return `<span class="roda__el" style="left:${80 + 56 * Math.cos(a)}px;top:${80 + 56 * Math.sin(a)}px;--c:${ELEMENTOS[t].cor}">${icone(t)}</span>`
  }).join('') + '<span class="roda__meio">beats the<br>next one →</span>'
  $('#tFrases').innerHTML = RODA.map((t) => `<li>${chipEl(t)}<span>${ELEMENTOS[t].frase}</span></li>`).join('')
  // botão e avisos honestos
  const custo = PATRULHA.lutas * RACAO_POR_LUTA, da = conta.racoes >= custo
  $('#btLutarCusto').textContent = `(uses ${custo} Rations)`
  $('#btLutar').classList.toggle('sem', !da)
  $('#fAvisos').textContent = da
    ? `This order: ${PATRULHA.lutas} fights, ${custo} Rations. ${AVISOS.decidido}`
    : `Not enough Rations for this order (${conta.racoes} left, it uses ${custo}). "Reset pilot" on the Road screen refills the bag.`
  T.mudou()
}

function trocar(a, b) {
  if (a === b) return false
  const trio = conta.trio
  const ia = trio.indexOf(a), ib = trio.indexOf(b)
  if (ia >= 0 && ib >= 0) { trio[ia] = b; trio[ib] = a }
  else if (ia >= 0) trio[ia] = b
  else if (ib >= 0) trio[ib] = a
  else return false
  conta.trio = trio
  return true
}
function tocarMonstro(uid) {
  if (time.sel && time.sel !== uid) {
    if (trocar(time.sel, uid)) { time.sel = null; tocar('troca') } else { time.sel = uid; tocar('pega') }
  } else { time.sel = time.sel === uid ? null : uid; tocar('pega') }
  desenharOrdens()
}
function ligarArraste(el) {
  const uid = el.dataset.uid
  let ini = null, fantasma = null
  el.addEventListener('pointerdown', (e) => { ini = { x: e.clientX, y: e.clientY }; el.setPointerCapture?.(e.pointerId) })
  el.addEventListener('pointermove', (e) => {
    if (!ini) return
    if (!fantasma && Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > 10) {
      fantasma = el.querySelector('img').cloneNode()
      fantasma.className = 'px fantasma'
      document.body.appendChild(fantasma)
      tocar('pega')
    }
    if (fantasma) { fantasma.style.left = e.clientX - 32 + 'px'; fantasma.style.top = e.clientY - 32 + 'px' }
  })
  el.addEventListener('pointerup', (e) => {
    if (!ini) return
    ini = null
    if (fantasma) {
      fantasma.remove(); fantasma = null
      const sob = document.elementFromPoint(e.clientX, e.clientY)
      const alvo = sob?.closest('.t-slot')?.querySelector('.t-mon') ?? sob?.closest('.t-mon')
      if (alvo && alvo.dataset.uid !== uid && trocar(uid, alvo.dataset.uid)) { time.sel = null; tocar('troca'); desenharOrdens() }
      el.dataset.arrastou = '1'
    }
  })
  el.addEventListener('pointercancel', () => { ini = null; fantasma?.remove(); fantasma = null })
  el.addEventListener('click', () => { if (el.dataset.arrastou) { delete el.dataset.arrastou; return } tocarMonstro(uid) })
}
$('#fVoltar').addEventListener('click', () => mostrar('mapa'))

// ================================================================== PATRULHA (5 lutas seguidas com a ordem assinada)
// R.patrulha = { n, uids, nomes, defs, guarda, tatica, ordem, base, lutas: [{ luta, resumo, semente }], novos: [títulos] }
const R = { patrulha: null, fase: 'nada', pular: false, tira: null, fecho: null, vez: 0 }
let batalha = null
const sementeDaUrl = params.get('semente') || null
const novaSemente = () => 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)

function mandarPatrulha() {
  const custo = PATRULHA.lutas * RACAO_POR_LUTA
  if (conta.racoes < custo) { tocar('nao'); const b = $('#btLutar'); b.classList.remove('nega'); void b.offsetWidth; b.classList.add('nega'); return }
  const uids = conta.trio
  const nomes = {}
  const defs = uids.map(defDe), guarda = guardaDe(conta.lugar)
  defs.forEach((d, i) => { nomes['A' + i] = d.nome }); guarda.forEach((d, i) => { nomes['B' + i] = d.nome })
  R.patrulha = {
    n: conta.lugar, uids, nomes, defs, guarda, tatica: time.tatica, taticaDaGuarda: lugarPorN(conta.lugar).tatica,
    ordem: uids.map((u) => { const o = ordemDe(u); return o.lista.filter((c) => !o.off.includes(c)) }),
    base: sementeDaUrl ?? novaSemente(), lutas: [], novos: [],
  }
  R.fase = 'luta1'; R.pular = false; R.tira = null; R.fecho = null; R.vez++
  tocar('marcha')
  fazerLuta(0)
  abrirLuta(0, 'patrulha')
}
/** Decide a luta i AGORA (é aqui que o resultado nasce) e gasta 1 Ration. */
function fazerLuta(i) {
  const P = R.patrulha
  conta.gastarRacao()
  const semente = `${P.base}-${i + 1}`
  const t0 = performance.now()
  const { luta, resumo } = rodarLuta({ semente, trio: P.defs, guarda: P.guarda, tatica: P.tatica, ordem: P.ordem, taticaDaGuarda: P.taticaDaGuarda })
  P.lutas[i] = { luta, resumo, semente }
  P.novos.push(...conta.anotarLuta({ n: P.n, uids: P.uids, resumo }))
  T.luta = { semente, resultado: luta.resultado, total: luta.passos.length, ms: Math.round(performance.now() - t0) }
  atualizarTopo(true)
  tocar('racao')
}
let modoDaLuta = 'patrulha', lutaAberta = 0
function abrirLuta(i, modo) {
  const P = R.patrulha, L = P.lutas[i]
  modoDaLuta = modo; lutaAberta = i
  const defs = {}, tipos = {}
  ;[...P.defs, ...P.guarda].forEach((d, k) => { const id = (k < 3 ? 'A' : 'B') + (k % 3); defs[id] = d; tipos[id] = Arte.formaDoCorpo(d.partes) })
  mostrar('luta')
  $('#bRotulo').textContent = `${modo === 'replay' ? 'Replay · ' : ''}Fight ${i + 1} of ${PATRULHA.lutas} · ${nomeDoLugar(P.n)}`
  $('#bSemente').textContent = `Fight #${L.semente}`
  $('#bFimRot').textContent = `Fight ${i + 1} of ${PATRULHA.lutas}`
  const resta = PATRULHA.lutas - 1
  $('#bSeguir').hidden = modo !== 'patrulha'
  $('#bSeguir').innerHTML = `Next: ${resta} quick fights &#9656;`
  $('#bRevanche').hidden = modo !== 'replay'
  $('#bTrocar').hidden = modo !== 'replay'
  batalha.comecar({ luta: L.luta, resumo: L.resumo, nomes: P.nomes, defs, tipos, vel: modo === 'patrulha' ? 2 : null })
}
function sairDaLuta(para) {
  batalha?.parar()
  $('#bFim').hidden = true
  // saiu no meio da 1ª luta da patrulha: a ordem já estava assinada, então as outras lutas acontecem (sem animação)
  if (modoDaLuta === 'patrulha' && R.fase === 'luta1' && para !== 'relato') { R.pular = true; desenharCarimbos(); carimbar() }
}
$('#btLutar').addEventListener('click', mandarPatrulha)
$('#btLutar').dataset.somProprio = '1'
$('#bSeguir').addEventListener('click', () => abrirRelato())
$('#bRevanche').addEventListener('click', () => abrirLuta(lutaAberta, 'replay'))
$('#bTrocar').addEventListener('click', () => abrirRelato())

// ================================================================== PATROL REPORT: carimbos + tira final
const mini = (def, cls = '') => `<img class="px r-mini ${cls}" src="${Arte.url(Arte.monstro(def))}" alt="">`
function desenharCarimbos() {
  const P = R.patrulha
  $('#rOnde').innerHTML = `${nomeDoLugar(P.n)} · ${TATICAS_EN[P.tatica].nome} · ${P.uids.map((u, i) => `${POSICAO_EN[i]} ${P.nomes['A' + i]}`).join(', ')}`
  const ol = $('#rCarimbos')
  ol.innerHTML = ''
  for (let i = 0; i < PATRULHA.lutas; i++) {
    const li = document.createElement('li')
    li.innerHTML = `<button type="button" class="r-carimbo" data-i="${i}" data-estado="espera" disabled data-som-proprio="1"><small class="r-n">Fight ${i + 1}</small><span class="r-meio"></span><small class="r-pe"></small></button>`
    ol.appendChild(li)
    li.firstChild.addEventListener('click', () => { if (P.lutas[i] && li.firstChild.dataset.estado.length === 1) { tocar('botao'); abrirLuta(i, 'replay') } })
  }
  $('#rSeq').innerHTML = Array.from({ length: PATRULHA.sequencia }, () => '<i></i>').join('')
  $('#rSeqTxt').textContent = ''
}
/** Bate o carimbo da luta i (o resultado só aparece aqui). */
function baterCarimbo(i, comFesta) {
  const P = R.patrulha, r = P.lutas[i].resumo
  const b = $(`.r-carimbo[data-i="${i}"]`)
  b.dataset.estado = r.venceu ? 'v' : 'd'
  b.disabled = false
  b.setAttribute('aria-label', `Fight ${i + 1}: ${r.venceu ? 'win' : 'loss'}. Strong hits given ${r.forteDados}, taken ${r.forteLevados}. Open the replay.`)
  $('.r-meio', b).innerHTML = `<b class="r-selo">${r.venceu ? 'WIN' : 'LOSS'}</b>`
  $('.r-pe', b).innerHTML = `<span>Strong ${r.forteDados} · ${r.forteLevados}</span><em>Replay &#9656;</em>`
  // barra da sequência: vitórias seguidas até aqui (cai a zero na derrota)
  let seq = 0
  for (let k = 0; k <= i; k++) seq = P.lutas[k].resumo.venceu ? seq + 1 : 0
  const pontos = $$('#rSeq i')
  pontos.forEach((p, k) => p.classList.toggle('on', k < Math.min(seq, PATRULHA.sequencia)))
  $('#rSeq').setAttribute('aria-label', `Win streak: ${seq}`)
  $('#rSeqTxt').textContent = seq >= PATRULHA.sequencia ? `${seq} wins in a row!` : seq ? `${seq} in a row` : 'streak broken'
  if (!seq) $('#rSeqTxt').textContent = i === 0 || !P.lutas.slice(0, i).some((x) => x.resumo.venceu) ? 'no streak yet' : 'streak broken'
  if (comFesta) {
    tocar(r.venceu ? 'carimboV' : 'carimboD')
    if (!menos) { b.classList.add('bate'); const f = $('#rFolha'); f.classList.remove('treme'); void f.offsetWidth; f.classList.add('treme') }
    if (seq === PATRULHA.sequencia) { setTimeout(() => tocar('sequencia'), 260); faiscas($('#rSeq'), '#FFB347', 10) }
  }
}
/** As lutas 2 a 5 viram carimbos de ~3 s cada. Cada luta é decidida quando o carimbo dela começa. */
async function carimbar() {
  const P = R.patrulha, vez = R.vez
  if (R.fase === 'carimbando' || R.fase === 'fim') return
  R.fase = 'carimbando'
  const espera = async (ms) => { const fim = performance.now() + ms; while (!R.pular && performance.now() < fim && vez === R.vez) await dorme(40) }
  $('#rPular').hidden = false
  baterCarimbo(0, !R.pular)
  await espera(900)
  for (let i = 1; i < PATRULHA.lutas; i++) {
    if (vez !== R.vez) return
    fazerLuta(i)
    const b = $(`.r-carimbo[data-i="${i}"]`), r = P.lutas[i].resumo
    b.dataset.estado = 'lutando'
    $('.r-meio', b).innerHTML = `<span class="r-briga">${mini(P.defs[0])}<i></i>${mini(P.guarda[0], 'espelho')}</span>`
    if (!R.pular) tocar('rufar')
    // os golpes Strong daquela luta pipocam enquanto ela corre (dado verdadeiro; o resultado ainda não)
    const n = Math.min(6, r.forteDados)
    for (let k = 0; k < n && !R.pular; k++) {
      await espera(1700 / Math.max(3, n))
      if (R.pular) break
      const e = document.createElement('em'); e.className = 'r-fa'; e.textContent = 'Strong!'; e.style.setProperty('--x', `${(k % 3) * 22 - 22}%`)
      $('.r-meio', b).appendChild(e); tocar('golpe')
    }
    await espera(n ? 1700 - (1700 / Math.max(3, n)) * n + 500 : 2200)
    if (!R.pular) tocar('rufar')
    await espera(520)
    baterCarimbo(i, !R.pular)
    await espera(480)
  }
  if (vez !== R.vez) return
  $('#rPular').hidden = true
  await espera(350)
  fecharPatrulha()
}
$('#rPular').addEventListener('click', () => { R.pular = true })

function fecharPatrulha() {
  const P = R.patrulha
  const res = resumirPatrulha(P.lutas.map((l) => l.resumo), P.nomes)
  const tira = { n: P.n, uids: P.uids, nomes: P.uids.map((_, i) => P.nomes['A' + i]), partes: P.defs.map((d) => ({ pronto: d.pronto, partes: d.partes })), tatica: P.tatica, v: res.v, d: res.d, dados: res.dados, levados: res.levados, porLugar: res.porLugar, causa: res.causa.texto, causaUid: res.causa.id?.startsWith('A') ? P.uids[+res.causa.id[1]] : null }
  R.fecho = conta.fecharPatrulha({ tira, uids: P.uids })
  R.fecho.novos = [...P.novos, ...R.fecho.novos]
  R.tira = tira
  R.fase = 'fim'
  T.mudou()
  if (cenaAtual === 'relato') mostrarTiras(true)
}
function htmlDaTira(t, rotulo, antes = null) {
  const delta = (a, b, bomSeMaior) => { if (antes === null || a === b) return ''; const up = a > b; return `<i class="r-delta ${up === bomSeMaior ? 'bom' : 'ruim'}">${up ? '▲' : '▼'} ${Math.abs(a - b)}</i>` }
  const max = Math.max(1, ...t.porLugar, ...(antes?.porLugar ?? []))
  return `<header><small>${rotulo}</small><b>${nomeDoLugar(t.n)}</b><span class="r-tat">${TATICAS_EN[t.tatica].nome}</span></header>
    <div class="r-quem">${t.partes.map((d, i) => `<span>${mini(d)}<small>${POSICAO_EN[i]}</small></span>`).join('')}</div>
    <p class="r-placar"><b data-rola="${t.v}">${t.v}</b> W – <b data-rola="${t.d}">${t.d}</b> L</p>
    <p class="r-fortes"><span>Strong hits given <b data-rola="${t.dados}">${t.dados}</b>${delta(t.dados, antes?.dados, true)}</span><span>taken <b data-rola="${t.levados}">${t.levados}</b>${delta(t.levados, antes?.levados, false)}</span></p>
    <p class="r-causa">${t.causaUid ? `<button type="button" class="r-link" data-uid="${t.causaUid}">${t.causa}</button>` : t.causa}</p>
    <div class="r-spots" aria-label="Damage taken by spot"><small>Damage taken by spot</small>${t.porLugar.map((v, i) => `<div><span>${POSICAO_EN[i]}</span><i style="--p:${Math.round((v / max) * 100)}%"></i><b>${v}</b></div>`).join('')}</div>`
}
const linhaDaTira = (t) => `${t.v} W – ${t.d} L · Strong hits given ${t.dados} · taken ${t.levados}`
async function mostrarTiras(comFesta) {
  const [nova, antes] = conta.tiras
  if (!nova) return
  $('#rTiras').hidden = false
  $('#rTiras').classList.toggle('so-uma', !antes)
  const elN = $('#rNova'), elA = $('#rAntes')
  elN.innerHTML = htmlDaTira(nova, 'This patrol', antes ?? null)
  elN.setAttribute('aria-label', linhaDaTira(nova))
  elA.hidden = !antes
  if (antes) { elA.innerHTML = htmlDaTira(antes, 'Previous patrol'); elA.setAttribute('aria-label', linhaDaTira(antes)) }
  for (const b of $$('.r-link')) b.addEventListener('click', () => ficha.abrir(b.dataset.uid))
  // botões: repetir só trocando a formação é o caminho mais curto
  const outro = LUGARES.find((l) => l.aberto && l.n !== nova.n)
  $('#rOutro').textContent = 'Change the formation'
  $('#rTrio').textContent = outro ? `Try ${nomeDoLugar(outro.n)}` : 'Change the trio'
  $('#rTrio').dataset.n = outro?.n ?? ''
  $('#rDeNovo').disabled = conta.racoes < PATRULHA.lutas * RACAO_POR_LUTA
  $('#rAmostra').textContent = `${AVISOS.amostra(PATRULHA.lutas)} Swap Front, Middle and Back and send again to compare.`
  const festa = $('#rFesta'), f = R.fecho
  festa.hidden = !f
  if (f) {
    festa.innerHTML = `<div class="r-renome"><i class="c-estrela"></i><span>${NOMES.renome}</span><b id="rRenomeNum">${comFesta ? f.antes : f.depois}</b><em>+${f.depois - f.antes}</em><small>${AVISOS.renome}</small></div>`
      + (f.novos.length ? `<ul class="r-titulos">${f.novos.map((t) => `<li><button type="button" class="r-link" data-uid="${t.uid}"><i></i><b>${nomeDoTitulo(t)}</b><small>${conta.porUid(t.uid)?.nome ?? ''}</small></button></li>`).join('')}</ul>` : '')
    for (const b of $$('.r-link', festa)) b.addEventListener('click', () => ficha.abrir(b.dataset.uid))
  }
  $('#rBts').hidden = false; $('#rAmostra').hidden = false
  T.mudou()
  if (!comFesta) return
  tocar('tira')
  elN.classList.add('entra')
  await Promise.all($$('[data-rola]', elN).map((b) => rolar(b, +b.dataset.rola, { ms: 700 })))
  if (f) {
    renomeRolando = true
    tocar('renome'); faiscas($('#rRenomeNum'), '#FFB347', 12); faiscas($('#cRenome'), '#FFB347', 8)
    await Promise.all([rolar($('#rRenomeNum'), f.depois, { de: f.antes, ms: 700, tique: false }), rolar($('#cRenomeNum'), f.depois, { de: f.antes, ms: 700, tique: false })])
    renomeRolando = false
    if (f.novos.length) { await dorme(menos ? 0 : 250); tocar('titulo'); for (const li of $$('.r-titulos li')) faiscas(li, '#A98BE8', 8) }
  }
  elN.scrollIntoView({ block: 'nearest', behavior: menos ? 'auto' : 'smooth' })
}
function abrirRelato() {
  if (!R.patrulha) { mostrar('mapa'); return }
  const jaFeito = R.fase === 'fim' || R.fase === 'carimbando'
  mostrar('relato')
  if (!jaFeito) {
    $('#rTiras').hidden = true; $('#rFesta').hidden = true; $('#rBts').hidden = true; $('#rAmostra').hidden = true
    desenharCarimbos()
    carimbar()
  } else if (R.fase === 'fim') {
    // relato já visto: tudo no lugar, sem repetir a festa
    desenharCarimbos()
    for (let i = 0; i < PATRULHA.lutas; i++) baterCarimbo(i, false)
    $('#rPular').hidden = true
    mostrarTiras(false)
  }
}
$('#rOutro').addEventListener('click', () => { const P = R.patrulha; conta.lugar = P.n; time.sel = null; mostrar('time') })
$('#rTrio').addEventListener('click', () => { const n = +$('#rTrio').dataset.n; if (n) conta.lugar = n; time.sel = null; mostrar('time') })
$('#rDeNovo').addEventListener('click', () => { mostrar('time'); mandarPatrulha() })
$('#rDeNovo').dataset.somProprio = '1'

// ------------------------------------------------------------------ ganchos para o teste de tela (só leitura)
const T = (window.__piloto = {
  pronto: false, cena: null, luta: null, tremidaMax: 0, flashes: () => batalha?.B.flashes.slice() ?? [],
  batalha: () => { const B = batalha?.B; return B ? { passo: B.i, turno: B.estado?.turno ?? 0, total: B.luta?.passos.length ?? 0, acabou: B.acabou, pausado: B.pausado, vel: B.vel, rodando: B.rodando, k: B.k } : null },
  ovo: () => ({ fase: ovo.O.fase, passo: ovo.O.passo, nome: ovo.O.nome }),
  menos: () => menos,
  som: () => som.estado(),
  conta: () => ({ racoes: conta.racoes, renome: conta.renome, trio: conta.trio, lugar: conta.lugar, monstros: conta.todos().map((m) => m.uid), tiras: conta.tiras }),
  patrulha: () => (R.patrulha ? { fase: R.fase, n: R.patrulha.n, base: R.patrulha.base, lutas: R.patrulha.lutas.map((l) => ({ semente: l.semente, venceu: l.resumo.venceu, turnos: l.resumo.turnos, forteDados: l.resumo.forteDados, forteLevados: l.resumo.forteLevados })), tira: R.tira, fecho: R.fecho } : null),
  historia: (uid) => conta.historia(uid),
  cartao: null,
  mudou() {},
})

batalha = criarBatalha({
  raiz: $('#luta'), opcoes,
  ganchos: { tremeu: (px) => { T.tremidaMax = Math.max(T.tremidaMax, px) }, fim: (r) => { T.fim = r } },
})
const ficha = criarFicha({ conta, opcoes, tocar, faiscas, ganchos: { cartao: (c) => { T.cartao = c } } })
const ovo = criarOvo({
  raiz: $('#ovo'), colecao: conta, opcoes,
  ganchos: {
    semente: () => params.get('ovo') || novaSemente(),
    nasceu: () => { atualizarTopo() },
    paraTime: (uid) => { time.sel = uid ?? null; mostrar('time') },
  },
})

aplicarSom()
atualizarTopo()
Arte.carregarManifesto().finally(() => {
  mapaBase = null
  aplicarMenos()
  const ini = params.get('cena')
  const n = Number(params.get('lugar'))
  if (lugarPorN(n)?.aberto) conta.lugar = n
  mostrar(['mapa', 'time', 'monstros', 'ovo'].includes(ini) ? ini : 'mapa')
  const pronto = () => { T.pronto = true }
  if (document.fonts?.ready) document.fonts.ready.then(pronto); else pronto()
})
window.addEventListener('resize', () => { if (cenaAtual === 'mapa') desenharMapaTela() })
