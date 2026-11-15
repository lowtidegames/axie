// Piloto — telas Map, Team, Battle e Egg. Página separada do jogo antigo; só caminhos relativos.
// A tela não calcula regra: a luta inteira sai do motor + escolhedor (tatica.js) no início; o ovo sai de costurar().
import { montarBoneco } from '../../shared/batalha.js'
import { BONECOS_PRONTOS, CARTAS, PARTES } from '../../shared/config.js'
import * as Arte from './arte.js'
import { criarBatalha } from './batalha-tela.js'
import { MAPA, desenharMapa } from './cenas.js'
import { criarOvo } from './ovo-tela.js'
import { TATICAS, lutaInteira, ordemPadrao } from './tatica.js'
import {
  ELEMENTOS, MONSTROS, POSICAO_EN, RODA, TATICAS_EN, apanhaDe, bateEm, nomeDaHabilidade, nomeDaParte, textoDaHabilidade, textoDaMarca, SLOT_DA_HABILIDADE,
} from './tema.js'

const $ = (s, r = document) => r.querySelector(s)
const idDe = (g) => String(g).split('@')[0]
const params = new URLSearchParams(location.search)
const ler = (k, p) => { try { return localStorage.getItem(k) ?? p } catch { return p } }
const gravar = (k, v) => { try { localStorage.setItem(k, v) } catch {} }

// ------------------------------------------------------------------ Reduced motion (botão + preferência do aparelho)
const prefere = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
let menos = ler('piloto_menos', prefere ? '1' : '0') === '1'
function aplicarMenos() {
  document.body.classList.toggle('menos', menos)
  $('#btMenos').setAttribute('aria-pressed', String(menos))
  $('#btMenos').textContent = menos ? 'Reduced motion: on' : 'Reduced motion: off'
}
$('#btMenos').addEventListener('click', () => { menos = !menos; gravar('piloto_menos', menos ? '1' : '0'); aplicarMenos() })
const opcoes = { menosAnimacao: () => menos }

// ------------------------------------------------------------------ coleção do piloto (3 de partida + filhotes do ovo)
const PARTIDA = ['embolado', 'mordedor', 'cascudo']
const RIVAL = ['rasgao', 'assombrado', 'desfiado']
const SLOTS = ['tronco', 'cabeca', 'bracos', 'pernas', 'bordado']
const genesDoPronto = (id) => Object.fromEntries(SLOTS.map((s) => [s, { face: BONECOS_PRONTOS[id].partes[s], forro: BONECOS_PRONTOS[id].partes[s] }]))
const colecao = (() => {
  const lista = PARTIDA.map((id) => ({ uid: id, pronto: id, nome: MONSTROS[id].nome, genes: genesDoPronto(id), voltasUsadas: 0, pais: [], geracao: 0 }))
  let n = 0
  return {
    todos: () => lista,
    porUid: (u) => lista.find((m) => m.uid === u),
    def: (m) => ({ pronto: m.pronto ?? null, nome: m.nome, partes: Object.fromEntries(SLOTS.map((s) => [s, m.genes[s].face])) }),
    tipo: (m) => PARTES[idDe(m.genes.tronco.face)].tipo,
    paraCostura: (m) => ({ id: m.uid, nome: m.nome, partes: m.genes, voltasUsadas: m.voltasUsadas, pais: m.pais, geracao: m.geracao, estado: 'ativo' }),
    usarClutch(u) { const m = this.porUid(u); m.voltasUsadas++ },
    adicionar({ nome, genes, pais, geracao }) { const m = { uid: 'h' + ++n, pronto: null, nome, genes, voltasUsadas: 0, pais, geracao }; lista.push(m); time.banco.push(m.uid); return m },
  }
})()
const defRival = (id) => ({ pronto: id, nome: MONSTROS[id].nome, partes: BONECOS_PRONTOS[id].partes })

// ------------------------------------------------------------------ estado do time
const time = { trio: PARTIDA.slice(), banco: [], tatica: TATICAS.includes(ler('piloto_tatica', 'rush')) ? ler('piloto_tatica', 'rush') : 'rush', ordens: {}, sel: null }
function cartasDe(m) { return montarBoneco(colecao.def(m)).cartas }
function ordemDe(uid) {
  const pos = time.trio.indexOf(uid)
  let o = time.ordens[uid]
  if (!o || !o.mexido) o = time.ordens[uid] = { lista: ordemPadrao(cartasDe(colecao.porUid(uid)), Math.max(0, pos)), off: o?.off ?? [], mexido: false }
  return o
}

// ------------------------------------------------------------------ navegação
const cenas = ['mapa', 'time', 'luta', 'ovo']
let cenaAtual = null
function mostrar(c) {
  for (const k of cenas) $('#' + k).hidden = k !== c
  for (const a of document.querySelectorAll('.aba')) a.setAttribute('aria-current', String(a.dataset.cena === c || (c === 'luta' && a.dataset.cena === 'time')))
  if (c !== 'luta') batalha?.parar()
  cenaAtual = c
  if (c === 'mapa') desenharMapaTela()
  if (c === 'time') desenharTime()
  if (c === 'ovo') ovo.mostrar()
  window.scrollTo(0, 0)
  T.cena = c
}
for (const a of document.querySelectorAll('.aba')) a.addEventListener('click', () => mostrar(a.dataset.cena))

// ------------------------------------------------------------------ MAP
const LUGARES = [
  { nome: 'Hearthfield', cena: 'village green, well and pennants', rival: RIVAL },
  { nome: 'Millbrook', cena: 'water mill and wooden bridge', rival: ['brigao', 'assombrado', 'cascudo'] },
  { nome: 'Thornwood Edge', cena: 'forest edge with thorn fences', rival: ['rasgao', 'desfiado', 'embolado'] },
  { nome: 'Stonebridge Watch', cena: 'stone bridge and watchtower over the river', rival: ['pisoteador', 'cascudo', 'assombrado'] },
  { nome: 'Crownhold Keep', cena: 'castle on the hill, tournament yard', rival: ['brigao', 'pisoteador', 'desfiado'] },
]
let mapaCv = null
function desenharMapaTela() {
  const caixa = $('#mMapa')
  const larg = document.documentElement.clientWidth
  const cel = larg < 700
  const k = cel ? 1 : Math.max(1, Math.min(3, Math.floor((larg - 420) / MAPA.w), Math.floor((window.innerHeight - 90) / MAPA.h)))
  const cv = $('#mCanvas')
  mapaCv ??= desenharMapa()
  cv.width = MAPA.w; cv.height = MAPA.h
  cv.getContext('2d').drawImage(mapaCv, 0, 0)
  const cx = cv.getContext('2d')
  MAPA.lugares.forEach(([x, y], i) => cx.drawImage(Arte.lugar(i + 1), x - 16, y - 24))
  cv.style.width = MAPA.w * k + 'px'; cv.style.height = MAPA.h * k + 'px'
  caixa.style.setProperty('--mw', MAPA.w * k + 'px')
  caixa.style.width = cel ? '100%' : MAPA.w * k + 'px'
  caixa.style.height = MAPA.h * k + 'px'
  const desloc = cel ? Math.round((caixa.clientWidth - MAPA.w) / 2) : 0
  cv.style.marginLeft = desloc + 'px'
  const marcas = $('#mMarcas')
  marcas.innerHTML = ''
  MAPA.lugares.forEach(([x, y], i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'm-marca' + (i === 0 ? ' aberta' : '')
    b.style.left = x * k + desloc + 'px'; b.style.top = (y - 8) * k + 'px'
    b.innerHTML = `<span>${i + 1}</span><em>${LUGARES[i].nome}</em>`
    b.setAttribute('aria-label', LUGARES[i].nome + (i ? ' (coming soon)' : ''))
    b.addEventListener('click', () => irPara(i))
    marcas.appendChild(b)
  })
  const ol = $('#mLista')
  ol.innerHTML = LUGARES.map((l, i) => `<li><button type="button" class="m-item${i === 0 ? ' aberta' : ''}" data-i="${i}">
    <img class="px" src="${Arte.url(Arte.lugar(i + 1))}" alt=""><span><b>${i + 1}. ${l.nome}</b><small>${i === 0 ? 'Rivals: ' + l.rival.map((r) => MONSTROS[r].nome).join(', ') : 'Coming soon'}</small></span>${i === 0 ? '<i>Fight</i>' : ''}</button></li>`).join('')
  for (const b of ol.querySelectorAll('button')) b.addEventListener('click', () => irPara(+b.dataset.i))
}
function irPara(i) {
  if (i === 0) { mostrar('time'); return }
  const a = $('#mAviso')
  a.textContent = `${LUGARES[i].nome}: coming soon. Only Hearthfield is open in the pilot.`
  a.hidden = false
  clearTimeout(irPara.t); irPara.t = setTimeout(() => { a.hidden = true }, 2200)
}

// ------------------------------------------------------------------ TEAM
const chipEl = (t) => `<span class="chip" style="--c:${ELEMENTOS[t].cor}"><img class="px" src="${Arte.url(Arte.iconeElemento(t))}" alt="">${ELEMENTOS[t].nome}</span>`
const imgMonstro = (def, cls = '') => `<img class="px ${cls}" src="${Arte.url(Arte.monstro(def))}" alt="">`
function stats(def) { const f = montarBoneco(def); return `<span title="Hit points">HP ${f.vidaMax}</span><span title="Armor: less damage taken">Armor ${f.firmeza}%</span><span title="Crit chance">Crit ${f.rapidez}%</span>` }

function desenharTime() {
  // rivais
  $('#tRivais').innerHTML = RIVAL.map((id, i) => {
    const d = defRival(id), t = PARTES[idDe(d.partes.tronco)].tipo
    return `<div class="t-rival-mon"><small class="pos">${POSICAO_EN[i]}</small>${imgMonstro(d, 'espelho')}<b>${d.nome}</b>${chipEl(t)}<small class="dica">Weak to ${ELEMENTOS[apanhaDe(t)].nome}</small></div>`
  }).join('')
  // roda
  const roda = $('#tRoda')
  roda.innerHTML = '<svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="56" fill="none" stroke="#2B1E3A" stroke-width="2" stroke-dasharray="4 4"/></svg>' + RODA.map((t, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / RODA.length
    return `<span class="roda__el" style="left:${80 + 56 * Math.cos(a)}px;top:${80 + 56 * Math.sin(a)}px;--c:${ELEMENTOS[t].cor}"><img class="px" src="${Arte.url(Arte.iconeElemento(t))}" alt="${ELEMENTOS[t].nome}"></span>`
  }).join('') + '<span class="roda__meio">beats the<br>next one →</span>'
  $('#tFrases').innerHTML = RODA.map((t) => `<li>${chipEl(t)}<span>${ELEMENTOS[t].frase}</span></li>`).join('')
  // slots
  const slots = $('#tSlots')
  slots.innerHTML = ''
  time.trio.forEach((uid, pos) => {
    const m = colecao.porUid(uid), def = colecao.def(m), t = colecao.tipo(m)
    const o = ordemDe(uid)
    const marca = PARTES[idDe(def.partes.bordado)].bordado
    const el = document.createElement('div')
    el.className = 't-slot'
    el.dataset.pos = pos
    el.innerHTML = `<div class="t-slot__topo"><span class="pos">${POSICAO_EN[pos]}</span>
      <button type="button" class="t-mon${time.sel === uid ? ' sel' : ''}" data-uid="${uid}" aria-label="${m.nome} in ${POSICAO_EN[pos]}: tap, then tap another to swap">${imgMonstro(def)}</button>
      <div class="t-ficha"><b>${m.nome}</b>${chipEl(t)}<small class="dica">Strong vs ${ELEMENTOS[bateEm(t)].nome}</small><div class="stats">${stats(def)}</div>
      <small class="t-marca"><b>Mark · ${nomeDaParte(idDe(def.partes.bordado))}:</b> ${textoDaMarca(marca)}</small></div></div>
      <ol class="t-hab">${o.lista.map((c, i) => {
        const off = o.off.includes(c)
        const cc = CARTAS[c]
        return `<li class="${off ? 'off' : ''}" data-carta="${c}"><span class="n">${off ? '—' : o.lista.filter((x) => !o.off.includes(x)).indexOf(c) + 1}</span>
          <img class="px ico" src="${Arte.url(Arte.iconeHabilidade(c))}" alt="">
          <span class="txt"><b>${nomeDaHabilidade(c)}</b><span class="custo" title="Glow cost">${'<i></i>'.repeat(cc.linha) || '<em>free</em>'}</span><small>${SLOT_DA_HABILIDADE(c)} · ${ELEMENTOS[cc.tipo].nome} · ${textoDaHabilidade(c)}</small></span>
          <span class="bts"><button type="button" class="bt-ic" data-acao="sobe" aria-label="Move ${nomeDaHabilidade(c)} up" ${i === 0 ? 'disabled' : ''}>▲</button><button type="button" class="bt-ic" data-acao="desce" aria-label="Move ${nomeDaHabilidade(c)} down" ${i === o.lista.length - 1 ? 'disabled' : ''}>▼</button><button type="button" class="bt-ic liga" data-acao="liga" aria-pressed="${!off}">${off ? 'Off' : 'On'}</button></span></li>`
      }).join('')}</ol>`
    slots.appendChild(el)
  })
  for (const li of slots.querySelectorAll('.t-hab li')) {
    const uid = time.trio[+li.closest('.t-slot').dataset.pos], c = li.dataset.carta
    for (const b of li.querySelectorAll('button')) b.addEventListener('click', () => {
      const o = ordemDe(uid); o.mexido = true
      const i = o.lista.indexOf(c)
      if (b.dataset.acao === 'sobe' && i > 0) [o.lista[i - 1], o.lista[i]] = [o.lista[i], o.lista[i - 1]]
      if (b.dataset.acao === 'desce' && i < o.lista.length - 1) [o.lista[i + 1], o.lista[i]] = [o.lista[i], o.lista[i + 1]]
      if (b.dataset.acao === 'liga') o.off = o.off.includes(c) ? o.off.filter((x) => x !== c) : [...o.off, c]
      desenharTime()
    })
  }
  for (const b of slots.querySelectorAll('.t-mon')) ligarArraste(b)
  // banco
  $('#tBanco').hidden = time.banco.length === 0
  $('#tBancoLista').innerHTML = time.banco.map((uid) => { const m = colecao.porUid(uid); return `<button type="button" class="t-mon t-mon--banco${time.sel === uid ? ' sel' : ''}" data-uid="${uid}">${imgMonstro(colecao.def(m))}<small>${m.nome}</small></button>` }).join('')
  for (const b of document.querySelectorAll('#tBancoLista .t-mon')) ligarArraste(b)
  // tática
  $('#tTaticas').innerHTML = TATICAS.map((t) => `<button type="button" class="t-tat" role="radio" aria-checked="${time.tatica === t}" data-t="${t}"><b>${TATICAS_EN[t].nome}</b><small>${TATICAS_EN[t].texto}</small></button>`).join('')
  for (const b of document.querySelectorAll('.t-tat')) b.addEventListener('click', () => { time.tatica = b.dataset.t; gravar('piloto_tatica', time.tatica); desenharTime() })
  T.mudou()
}

function trocar(a, b) {
  if (a === b) return
  const ia = time.trio.indexOf(a), ib = time.trio.indexOf(b)
  const ba = time.banco.indexOf(a), bb = time.banco.indexOf(b)
  if (ia >= 0 && ib >= 0) { time.trio[ia] = b; time.trio[ib] = a }
  else if (ia >= 0 && bb >= 0) { time.trio[ia] = b; time.banco[bb] = a }
  else if (ba >= 0 && ib >= 0) { time.trio[ib] = a; time.banco[ba] = b }
  else return
}
function tocarMonstro(uid) {
  if (time.sel && time.sel !== uid) { trocar(time.sel, uid); time.sel = null }
  else time.sel = time.sel === uid ? null : uid
  desenharTime()
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
      if (alvo && alvo.dataset.uid !== uid) { trocar(uid, alvo.dataset.uid); time.sel = null; desenharTime() }
      el.dataset.arrastou = '1'
      return
    }
  })
  el.addEventListener('pointercancel', () => { ini = null; fantasma?.remove(); fantasma = null })
  el.addEventListener('click', () => { if (el.dataset.arrastou) { delete el.dataset.arrastou; return } tocarMonstro(uid) })
}

// ------------------------------------------------------------------ BATTLE
let batalha = null
let sementeAtual = params.get('semente') || null
const novaSemente = () => 'f' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
function lutar(semente) {
  const trio = time.trio.map((u) => colecao.porUid(u))
  const timeA = trio.map((m) => colecao.def(m))
  const timeB = RIVAL.map(defRival)
  const ordem = {}
  trio.forEach((m, i) => { const o = ordemDe(m.uid); ordem['A' + i] = o.lista.filter((c) => !o.off.includes(c)) })
  const ordemB = {}
  timeB.forEach((d, i) => { ordemB['B' + i] = ordemPadrao(montarBoneco(d).cartas, i) })
  const planoA = { tatica: time.tatica, ordem }, planoB = { tatica: 'rush', ordem: ordemB }
  const t0 = performance.now()
  const luta = lutaInteira({ semente, timeA, timeB, planoA, planoB }) // a luta inteira é decidida aqui, antes de qualquer quadro
  T.luta = { semente, resultado: luta.resultado, total: luta.passos.length, ms: Math.round(performance.now() - t0) }
  const nomes = {}, defs = {}, tipos = {}
  ;[...timeA, ...timeB].forEach((d, i) => { const id = (i < 3 ? 'A' : 'B') + (i % 3); nomes[id] = d.nome; defs[id] = d; tipos[id] = Arte.formaDoCorpo(d.partes) })
  mostrar('luta')
  $('#bSemente').textContent = `Fight #${semente}`
  batalha.comecar({ luta, nomes, defs, tipos })
}
$('#btLutar').addEventListener('click', () => lutar(sementeAtual ?? novaSemente()))
$('#bRevanche').addEventListener('click', () => { sementeAtual = null; lutar(novaSemente()) })
$('#bTrocar').addEventListener('click', () => mostrar('time'))

// ------------------------------------------------------------------ ganchos para o teste de tela (só leitura)
const T = (window.__piloto = {
  pronto: false, cena: null, luta: null, tremidaMax: 0, flashes: () => batalha?.B.flashes.slice() ?? [],
  batalha: () => { const B = batalha?.B; return B ? { passo: B.i, turno: B.estado?.turno ?? 0, total: B.luta?.passos.length ?? 0, acabou: B.acabou, pausado: B.pausado, vel: B.vel, rodando: B.rodando } : null },
  ovo: () => ({ fase: ovo.O.fase, passo: ovo.O.passo, nome: ovo.O.nome }),
  menos: () => menos,
  mudou() {},
})

batalha = criarBatalha({
  raiz: $('#luta'), opcoes,
  ganchos: { tremeu: (px) => { T.tremidaMax = Math.max(T.tremidaMax, px) }, fim: (r) => { T.fim = r } },
})
const ovo = criarOvo({
  raiz: $('#ovo'), colecao, opcoes,
  ganchos: { semente: () => params.get('ovo') || novaSemente(), paraTime: () => mostrar('time') },
})

aplicarMenos()
Arte.carregarManifesto().finally(() => {
  mapaCv = null
  const ini = params.get('cena')
  mostrar(cenas.includes(ini) && ini !== 'luta' ? ini : 'mapa')
  document.fonts?.ready.then(() => { T.pronto = true })
  if (!document.fonts) T.pronto = true
})
window.addEventListener('resize', () => { if (cenaAtual === 'mapa') desenharMapaTela() })
