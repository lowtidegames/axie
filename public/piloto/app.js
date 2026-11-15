// Piloto — o jogo simples (docs/ideias/jogo-simples.md), em modo local, sem servidor. Cinco telas: Egg, Team, Hunt (com a
// luta), Result e Collection. Página separada do jogo antigo; só caminhos relativos.
// A tela não calcula regra: cada luta sai inteira do motor (luta.js → shared/tatica.js, lutaAutomatica, tática e ordem padrão)
// com as regras provisórias do piloto (regras-piloto.js) na hora em que começa; o ovo e o cruzamento saem de shared/costura.js.
import * as Arte from './arte.js'
import { criarBatalha } from './batalha-tela.js'
import { criarColecao } from './colecao-tela.js'
import { ENERGIA_MAX, ENERGIA_POR_LUTA, LUGARES, criarConta, defDoPronto, lugarPorN } from './conta-piloto.js'
import { rodarLuta, vantagem } from './luta.js'
import { criarOvo } from './ovo-tela.js'
import { CANSACO, cansado, pontosDaVitoria } from './regras-piloto.js'
import { criarSom } from './som-piloto.js'
import { AVISOS, ELEMENTOS, NOMES, POSICAO_EN, RARIDADE, nomeDoLugar } from './tema.js'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const params = new URLSearchParams(location.search)
const ler = (k, p) => { try { return localStorage.getItem(k) ?? p } catch { return p } }
const gravar = (k, v) => { try { localStorage.setItem(k, v) } catch { /* sem armazenamento */ } }
const armazem = (() => { try { return window.localStorage } catch { return null } })()
const dorme = (ms) => new Promise((ok) => setTimeout(ok, ms))
const novaSemente = () => 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
const sementeDasLutas = params.get('semente') || novaSemente()
const sementeDosOvos = params.get('ovo') || novaSemente()

const conta = criarConta(armazem)
const som = criarSom()
const tocar = (n) => som.tocar(n)

document.title = `${NOMES.jogo} · pilot`
$('#marcaNome').textContent = NOMES.jogo
$('#avisoRegras').textContent = AVISOS.regras
$('#cDecidido').textContent = AVISOS.decidido

// ------------------------------------------------------------------ Reduced motion + som (nada toca antes do 1º toque)
const prefere = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
let menos = ler('piloto_menos', prefere ? '1' : '0') === '1'
function aplicarMenos() {
  document.body.classList.toggle('menos', menos)
  $('#btMenos').setAttribute('aria-pressed', String(menos))
  $('#btMenos').textContent = menos ? 'Reduced motion: on' : 'Reduced motion: off'
}
$('#btMenos').addEventListener('click', () => { menos = !menos; gravar('piloto_menos', menos ? '1' : '0'); aplicarMenos() })
const opcoes = { menosAnimacao: () => menos, som: tocar }
function aplicarSom() {
  $('#btSom').setAttribute('aria-pressed', String(!som.mudo()))
  $('#btSom').textContent = som.mudo() ? 'Sound: off' : 'Sound: on'
}
$('#btSom').addEventListener('click', () => { som.alternarMudo(); aplicarSom(); tocar('botao') })
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => som.destravar(), { capture: true })
// todo botão sem som próprio ganha o toque curto
document.addEventListener('click', (e) => { const b = e.target.closest?.('button'); if (b && !b.disabled && !b.dataset.somProprio) tocar('botao') }, true)

// ------------------------------------------------------------------ peças de desenho (as mesmas em todas as telas)
const icone = (t, cls = '') => `<img class="px el ${cls}" src="${Arte.url(Arte.iconeElemento(t))}" alt="${ELEMENTOS[t].nome}">`
const pecas = {
  chip: (t) => `<span class="chip" style="--c:${ELEMENTOS[t].cor}"><img class="px" src="${Arte.url(Arte.iconeElemento(t))}" alt="">${ELEMENTOS[t].nome}</span>`,
  raridade: (r) => `<span class="rar" data-rar="${r}"><span class="gema" style="--g:${RARIDADE[r].cor}"></span>${RARIDADE[r].nome}</span>`,
  /** "Fights today 3/7" ou "Tired". */
  selo(uid) {
    const n = conta.lutasHoje(uid)
    return cansado(n) ? '<small class="selo selo--zz">Tired</small>' : `<small class="selo">Fights today ${n}/${CANSACO.lutasPorDia}</small>`
  },
  /** O cartão do monstro: desenho, nome, elemento, raridade e o selo do dia. Só a raridade tem cor de destaque (a moldura). */
  cartao(m, { cls = '', pressed = null, extra = '', semSelo = false } = {}) {
    const t = conta.tipo(m), r = conta.raridade(m)
    return `<button type="button" class="card ${cls}${m.aposentado ? ' fora' : ''}" data-uid="${m.uid}" style="--rar:${RARIDADE[r].cor}"${pressed === null ? '' : ` aria-pressed="${pressed}"`}>
      <img class="px card__img" src="${Arte.url(Arte.monstro(conta.def(m)))}" alt="" draggable="false"><b>${m.nome}</b>
      <span class="card__l">${icone(t)}${ELEMENTOS[t].nome}</span>${pecas.raridade(r)}${m.aposentado ? '<small class="selo selo--zz">Retired</small>' : semSelo ? '' : pecas.selo(m.uid)}${extra}</button>`
  },
}
/** Festa pequena: faíscas saindo de um elemento (nenhuma com Reduced motion; no máximo 14 por vez). */
function faiscas(el, cor = '#FFB347', n = 12) {
  if (menos || !el) return
  const q = el.getBoundingClientRect(), caixa = $('#festa')
  for (let i = 0; i < Math.min(14, n); i++) {
    const s = document.createElement('i')
    const a = (i / n) * Math.PI * 2, d = 40 + (i % 3) * 22
    s.style.cssText = `left:${q.left + q.width / 2}px;top:${q.top + q.height / 2}px;background:${cor};--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px`
    caixa.appendChild(s)
    setTimeout(() => s.remove(), 750)
  }
}
/** Número que sobe até o valor (com Reduced motion troca na hora). */
function rolar(el, ate, ms = 600) {
  if (menos || !ate) { el.textContent = ate; return }
  const t0 = performance.now()
  const f = (t) => { const p = Math.min(1, (t - t0) / ms); el.textContent = Math.round(ate * (1 - (1 - p) ** 3)); if (p < 1) requestAnimationFrame(f) }
  requestAnimationFrame(f)
}
let tAviso = 0
function avisar(texto) {
  let a = $('#avisoFlutua')
  if (!a) { a = document.createElement('div'); a.id = 'avisoFlutua'; a.className = 'aviso-flutua'; a.setAttribute('role', 'status'); document.body.appendChild(a) }
  a.textContent = texto; a.hidden = false
  clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true }, 2600)
}
function atualizarTopo(pulsar = false) {
  $('#cEnergiaNum').textContent = conta.energia
  $('#cEnergiaMax').textContent = '/' + ENERGIA_MAX
  const c = $('#cEnergia')
  c.classList.toggle('vazia', conta.energia < ENERGIA_POR_LUTA)
  c.setAttribute('aria-label', `Energy ${conta.energia} of ${ENERGIA_MAX}`)
  if (pulsar && !menos) { c.classList.remove('pulsa'); void c.offsetWidth; c.classList.add('pulsa') }
}

// ------------------------------------------------------------------ navegação
const CENAS = ['ovo', 'time', 'caca', 'luta', 'resultado', 'colecao']
const ABA = { ovo: null, time: 'time', caca: 'caca', luta: 'caca', resultado: 'caca', colecao: 'colecao' }
let cenaAtual = null
function mostrar(c) {
  if (!conta.comecou) c = 'ovo' // a primeira coisa do jogo: abrir os ovos
  if (cenaAtual === 'luta' && c !== 'luta' && H.rodando) sairDaCaca()
  if (c === 'caca' && !H.rodando && !H.visto) c = 'resultado' // a caçada acabou enquanto ele estava fora
  for (const k of CENAS) $('#' + k).hidden = k !== c
  for (const a of $$('.aba')) a.setAttribute('aria-current', String(a.dataset.cena === ABA[c]))
  $('#abas').hidden = !conta.comecou
  document.body.dataset.cena = c
  cenaAtual = c
  T.cena = c
  if (c === 'ovo') ovo.mostrar()
  if (c === 'time') desenharTime()
  if (c === 'caca') desenharCaca()
  if (c === 'resultado') desenharResultado()
  if (c === 'colecao') colecao.desenharGrade()
  window.scrollTo(0, 0)
  atualizarTopo()
}
for (const a of $$('.aba')) a.addEventListener('click', () => mostrar(a.dataset.cena))

// ================================================================== TEAM
const time = { sel: null } // o 1º toque: { uid | null, pos | null }
const guardaDe = (n) => lugarPorN(n).guarda.map(defDoPronto)
const tipoDoPronto = (id) => conta.tipo({ genes: { tronco: { face: defDoPronto(id).partes.tronco } } })
/** Seta simples de vantagem contra a guarda do lugar escolhido (verde = bom, vermelha = ruim, nada = tanto faz). */
function seta(uid) {
  const v = vantagem(conta.def(conta.porUid(uid)), guardaDe(conta.lugar))
  return v > 0 ? '<i class="seta seta--bom" role="img" aria-label="Good against this guard"></i>' : v < 0 ? '<i class="seta seta--ruim" role="img" aria-label="Weak against this guard"></i>' : ''
}
function desenharTime() {
  const trio = conta.trio
  const slots = $('#tSlots')
  slots.innerHTML = trio.map((uid, pos) => {
    const m = uid ? conta.porUid(uid) : null
    const sel = time.sel && (time.sel.pos === pos || (uid && time.sel.uid === uid))
    return `<div class="t-slot${sel ? ' sel' : ''}" data-pos="${pos}"><span class="t-pos">${POSICAO_EN[pos]}</span>${m
      ? pecas.cartao(m, { cls: 't-mon', extra: seta(uid) })
      : `<button type="button" class="card t-mon t-vazio" aria-label="Empty ${POSICAO_EN[pos]} spot"><span>+</span></button>`}</div>`
  }).join('')
  $('#tContra').innerHTML = `Guard of ${nomeDoLugar(conta.lugar)} ${lugarPorN(conta.lugar).guarda.map((g) => icone(tipoDoPronto(g))).join('')}`
  $('#tBanco').innerHTML = conta.ativos().map((m) => {
    const pos = trio.indexOf(m.uid)
    return pecas.cartao(m, { cls: 't-mon t-banco__m' + (time.sel?.uid === m.uid ? ' sel' : '') + (pos >= 0 ? ' no-time' : ''), extra: pos >= 0 ? `<i class="t-onde">${POSICAO_EN[pos]}</i>` : '' })
  }).join('')
  for (const b of $$('#time .t-mon')) { b.dataset.somProprio = '1'; ligarArraste(b) }
  $('#tCacar').disabled = !conta.timePronto()
  T.mudou()
}
function tocarNoTime(el) {
  const slot = el.closest('.t-slot'), pos = slot ? +slot.dataset.pos : null, uid = el.dataset.uid ?? null, s = time.sel
  const escolher = () => { time.sel = { uid, pos }; tocar('pega'); desenharTime() }
  if (!s) return escolher()
  let mudou = false
  if (pos !== null) { if (s.uid && s.uid !== uid) mudou = conta.por(s.uid, pos) } // 2º toque num lugar: o escolhido vai para lá
  else if (s.pos !== null && uid) mudou = conta.por(uid, s.pos) // lugar escolhido antes, monstro depois
  else if (uid && uid !== s.uid) return escolher() // outro monstro da coleção: troca a escolha
  time.sel = null
  tocar(mudou ? 'troca' : 'pega')
  desenharTime()
}
/** Arrastar um monstro (do time ou da coleção) até um dos 3 lugares. O toque simples continua valendo. */
function ligarArraste(el) {
  const uid = el.dataset.uid
  let ini = null, fantasma = null
  el.addEventListener('pointerdown', (e) => { if (uid) { ini = { x: e.clientX, y: e.clientY }; el.setPointerCapture?.(e.pointerId) } })
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
    if (!fantasma) return
    fantasma.remove(); fantasma = null
    el.dataset.arrastou = '1'
    const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest('.t-slot')
    if (alvo && conta.por(uid, +alvo.dataset.pos)) { time.sel = null; tocar('troca'); desenharTime() }
  })
  el.addEventListener('pointercancel', () => { ini = null; fantasma?.remove(); fantasma = null })
  el.addEventListener('click', () => { if (el.dataset.arrastou) { delete el.dataset.arrastou; return } tocarNoTime(el) })
}
$('#tCacar').addEventListener('click', () => mostrar('caca'))

// ================================================================== HUNT (a casa do jogo)
function porQueNao() {
  if (!conta.timePronto()) return 'Your team needs 3 monsters.'
  if (conta.energia < ENERGIA_POR_LUTA) return 'No energy left. It comes back tomorrow.'
  return ''
}
function desenharCaca() {
  const ol = $('#cLugares')
  ol.innerHTML = LUGARES.map((l) => {
    const aberto = l.n <= conta.abertos
    return `<li><button type="button" class="c-lugar${aberto ? '' : ' fechado'}" data-n="${l.n}" aria-pressed="${l.n === conta.lugar}" ${aberto ? '' : 'disabled'} aria-label="${nomeDoLugar(l.n)}${aberto ? '' : ', locked'}">
      <img class="px c-lugar__img" src="${Arte.url(Arte.lugar(l.n))}" alt=""><b>${nomeDoLugar(l.n)}</b>
      <span class="c-guarda"><small>Guard</small>${l.guarda.map((g) => icone(tipoDoPronto(g))).join('')}</span>
      <em>${aberto ? `+${pontosDaVitoria(l.n)} ${pontosDaVitoria(l.n) === 1 ? 'pt' : 'pts'}` : '<i class="cadeado" role="img" aria-label="Locked"></i>'}</em></button></li>`
  }).join('')
  for (const b of $$('.c-lugar', ol)) b.addEventListener('click', () => { conta.lugar = +b.dataset.n; desenharCaca() })
  $('#cTime').innerHTML = conta.trio.map((uid, i) => {
    const m = uid ? conta.porUid(uid) : null
    return `<button type="button" class="c-mon" aria-label="${m ? m.nome : 'Empty spot'}, ${POSICAO_EN[i]}: open the team">${m ? `<img class="px" src="${Arte.url(Arte.monstro(conta.def(m)))}" alt="">${seta(uid)}${cansado(conta.lutasHoje(uid)) ? '<small class="selo selo--zz">Tired</small>' : ''}` : '<span>+</span>'}</button>`
  }).join('')
  for (const b of $$('.c-mon')) b.addEventListener('click', () => mostrar('time'))
  const pq = porQueNao()
  $('#btCacar').disabled = !!pq
  $('#cPorque').textContent = pq
  $('#cDecidido').hidden = conta.avisoVisto
  T.mudou()
}

// H = a caçada atual: { rodando, parar, sair, visto, n, uids, lutas: [{ semente, venceu, pontos, lutasHoje, luta }], abriu }
let H = { rodando: false, parar: false, sair: false, visto: true, n: 0, uids: [], lutas: [], abriu: null }
let batalha = null
async function cacar() {
  if (H.rodando || porQueNao()) return
  conta.avisoVisto = true
  const n = conta.lugar, uids = conta.trio, lugar = lugarPorN(n)
  const membros = uids.map((u) => conta.porUid(u)), time3 = membros.map((m) => conta.def(m)), guarda = guardaDe(n)
  const nomes = {}, defs = {}, tipos = {}
  ;[...time3, ...guarda].forEach((d, k) => { const id = (k < 3 ? 'A' : 'B') + (k % 3); nomes[id] = d.nome; defs[id] = d; tipos[id] = Arte.formaDoCorpo(d.partes) })
  const minha = (H = { rodando: true, parar: false, sair: false, visto: false, n, uids, lutas: [], abriu: null })
  mostrar('luta')
  $('#bCarimbo').hidden = true
  $('#bParar').disabled = false
  while (!minha.parar && conta.energia >= ENERGIA_POR_LUTA && conta.timePronto()) {
    // a luta é decidida AGORA: gasta 1 de energia e o motor faz a luta inteira
    const k = conta.abrirLuta()
    const semente = `${sementeDasLutas}-${k}`
    const lutasHoje = uids.map((u) => conta.lutasHoje(u)) // contadas ANTES desta luta (cansaço)
    const luta = rodarLuta({ semente, time: time3, lugar, lutasHoje })
    const venceu = luta.resultado.vencedor === 'A'
    const { pontos, abriu } = conta.anotarLuta({ n, uids, venceu })
    minha.lutas.push({ semente, venceu, pontos, lutasHoje, luta })
    if (abriu) minha.abriu = abriu
    atualizarTopo(true)
    if (minha.sair) continue // saiu da tela: as lutas que faltam são resolvidas sem animação
    $('#bRotulo').textContent = `Fight ${minha.lutas.length} · ${nomeDoLugar(n)}`
    desenharPlacar(minha, true)
    await batalha.comecar({ luta, nomes, defs, tipos })
    if (minha.sair) continue
    desenharPlacar(minha, false)
    await carimbar(venceu, pontos, minha)
  }
  minha.rodando = false
  T.mudou()
  if (minha !== H) return // o piloto foi zerado no meio
  if (!minha.sair) mostrar('resultado')
  else { $('.aba[data-cena="caca"]').classList.add('tem-novo'); if (cenaAtual === 'caca') mostrar('caca') }
}
function desenharPlacar(h, lutando) {
  $('#bPlacar').innerHTML = h.lutas.map((l, i) => `<li class="${lutando && i === h.lutas.length - 1 ? 'agora' : l.venceu ? 'v' : 'd'}"></li>`).join('')
}
/** O carimbo WIN/LOSS com os pontos, 1 a 2 s (o resultado da luta só aparece aqui). */
async function carimbar(venceu, pontos, h) {
  const c = $('#bCarimbo')
  c.className = 'b-carimbo ' + (venceu ? 'v' : 'd')
  $('#bCarimboTxt').textContent = venceu ? 'WIN' : 'LOSS'
  $('#bCarimboPts').textContent = `+${pontos} ${pontos === 1 ? 'pt' : 'pts'}`
  c.hidden = false
  tocar(venceu ? 'carimboV' : 'carimboD')
  if (venceu) faiscas($('#bCarimboTxt'), '#FFB347', 10)
  const ms = h.parar ? 1000 : batalha.B.vel >= 4 ? 1000 : batalha.B.vel >= 2 ? 1200 : 1500
  const t0 = performance.now()
  while (performance.now() - t0 < ms && !h.sair) await dorme(50)
  c.hidden = true
  T.carimboMs = Math.round(performance.now() - t0)
}
function pararCaca() {
  if (!H.rodando) return
  H.parar = true
  $('#bParar').disabled = true
  batalha.pular()
}
function sairDaCaca() {
  H.sair = true
  batalha.pular()
}
$('#btCacar').addEventListener('click', cacar)
$('#bParar').addEventListener('click', pararCaca)

// ================================================================== RESULT
function desenharResultado() {
  const v = H.lutas.filter((l) => l.venceu).length, d = H.lutas.length - v, p = H.lutas.reduce((s, l) => s + l.pontos, 0)
  const primeira = !H.visto
  H.visto = true
  $('.aba[data-cena="caca"]').classList.remove('tem-novo')
  $('#rOnde').textContent = `${nomeDoLugar(H.n)} · ${H.lutas.length} fight${H.lutas.length === 1 ? '' : 's'}`
  for (const [id, val] of [['#rV', v], ['#rD', d], ['#rP', p]]) { if (primeira) rolar($(id), val); else $(id).textContent = val }
  const novo = $('#rNovo')
  novo.hidden = !H.abriu
  if (H.abriu) { $('#rNovoImg').src = Arte.url(Arte.lugar(H.abriu)); $('#rNovoNome').textContent = nomeDoLugar(H.abriu) }
  const pq = porQueNao()
  $('#rDeNovo').disabled = !!pq
  $('#rPorque').textContent = pq
  if (primeira) {
    tocar(v >= d ? 'vitoria' : 'derrota')
    if (H.abriu) setTimeout(() => { tocar('festa'); faiscas(novo, '#FFB347', 14); setTimeout(() => faiscas(novo, '#F7F1E3', 14), 300) }, 500)
  }
  T.mudou()
}
$('#rDeNovo').addEventListener('click', () => { mostrar('caca'); cacar() })
$('#rTime').addEventListener('click', () => mostrar('time'))

// ================================================================== botões discretos do dono: New day e Reset pilot
$('#btNovoDia').addEventListener('click', () => {
  if (H.rodando) return
  conta.novoDia()
  avisar(`Day ${conta.dia}: energy is back and everyone is rested.`)
  atualizarTopo(true)
  mostrar(cenaAtual === 'resultado' ? 'caca' : cenaAtual)
})
let resetArmado = 0
$('#btReset').addEventListener('click', () => {
  const b = $('#btReset')
  if (Date.now() - resetArmado > 4000) { resetArmado = Date.now(); b.textContent = 'Tap again to reset'; setTimeout(() => { b.textContent = 'Reset pilot' }, 4000); return }
  resetArmado = 0
  b.textContent = 'Reset pilot'
  if (H.rodando) sairDaCaca()
  conta.zerar()
  H = { rodando: false, parar: false, sair: false, visto: true, n: 0, uids: [], lutas: [], abriu: null }
  time.sel = null
  ovo.O.fase = 'nada'
  colecao.fechar()
  mostrar('ovo')
})

// ------------------------------------------------------------------ ganchos para o teste de tela (só leitura)
const T = (window.__piloto = {
  pronto: false, cena: null, tremidaMax: 0, carimboMs: 0, flashes: () => batalha?.B.flashes.slice() ?? [],
  batalha: () => { const B = batalha?.B; return B ? { passo: B.i, total: B.luta?.passos.length ?? 0, acabou: B.acabou, vel: B.vel, rodando: B.rodando, k: B.k } : null },
  ovo: () => ({ fase: ovo.O.fase, modo: ovo.O.modo, ultimo: ovo.O.ultimo, ms: ovo.O.ms }),
  menos: () => menos,
  som: () => som.estado(),
  conta: () => ({
    energia: conta.energia, dia: conta.dia, ovos: conta.ovos, comecou: conta.comecou, trio: conta.trio, lugar: conta.lugar, abertos: conta.abertos, total: conta.total,
    monstros: conta.todos().map((m) => ({ uid: m.uid, nome: m.nome, pronto: m.pronto, raridade: conta.raridade(m), tipo: conta.tipo(m), lutas: m.lutas, voltas: m.voltas, hoje: conta.lutasHoje(m.uid), pais: m.pais })),
  }),
  caca: () => ({ rodando: H.rodando, n: H.n, abriu: H.abriu, lutas: H.lutas.map((l) => ({ semente: l.semente, venceu: l.venceu, pontos: l.pontos, lutasHoje: l.lutasHoje, turnos: l.luta.resultado.turno })) }),
  /** A luta i da caçada atual, como o motor a fez (só para o teste conferir os eventos dentro da página). */
  lutaDaCaca: (i) => H.lutas[i]?.luta ?? null,
  mudou() {},
})

batalha = criarBatalha({ raiz: $('#luta'), opcoes, ganchos: { tremeu: (px) => { T.tremidaMax = Math.max(T.tremidaMax, px) } } })
const ovo = criarOvo({
  raiz: $('#ovo'), conta, opcoes, tocar, faiscas,
  ganchos: {
    semente: () => `${sementeDosOvos}-${conta.nOvo + 1}`,
    nasceu: () => atualizarTopo(),
    acabou: (modo) => mostrar(modo === 'comeco' ? 'time' : 'colecao'),
    semOvo: () => mostrar('caca'),
  },
})
const colecao = criarColecao({
  raiz: $('#colecao'), conta, pecas, tocar,
  ganchos: { semente: () => `${sementeDosOvos}-b${conta.todos().length}`, ovo: () => mostrar('ovo') },
})

aplicarSom()
aplicarMenos()
atualizarTopo()
Arte.carregarManifesto().finally(() => {
  const ini = params.get('cena')
  mostrar(['time', 'caca', 'colecao'].includes(ini) ? ini : 'caca')
  const pronto = () => { T.pronto = true }
  if (document.fonts?.ready) document.fonts.ready.then(pronto); else pronto()
})
