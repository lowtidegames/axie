// Piloto — a LUTA de lado: reproduz a luta que já foi calculada inteira quando começou (luta.js, rodarLuta).
// Nada aqui decide resultado: a tela só mostra os passos e eventos do motor (shared/batalha.js).
// Na tela: barras de vida, golpe, Strong!, crítico, queda. Sem textos explicativos por cima.
// API: criarBatalha({ raiz, opcoes, ganchos }) → { B, comecar({ luta, nomes, defs, tipos }) → Promise (termina no fim da luta),
//      pular() (vai direto ao fim desta luta), parar(), medir() }
import { bateForte } from '../../shared/batalha.js'
import { CARTAS, REGRAS } from '../../shared/config.js'
import * as Arte from './arte.js'
import { desenharArena, lugaresDaArena } from './cenas.js'
import { golpeResistido } from './luta.js'
import { ELEMENTOS } from './tema.js'

const $ = (s, r = document) => r.querySelector(s)
const VELS = [1, 2, 4]
const SOL = { desceDe: REGRAS.tesouraInicio - 3, encosta: REGRAS.tesouraInicio }
const ler = (k, p) => { try { return localStorage.getItem(k) ?? p } catch { return p } }
const gravar = (k, v) => { try { localStorage.setItem(k, v) } catch { /* sem armazenamento */ } }
class Pulou extends Error {}

export function criarBatalha({ raiz, ganchos, opcoes }) {
  const B = {
    luta: null, nomes: {}, defs: {}, tipos: {}, estado: null, i: -1, vel: VELS.includes(+ler('piloto_vel', '2')) ? +ler('piloto_vel', '2') : 2,
    pular: false, acabou: false, rodando: false, k: 1, LW: 384, LH: 216, chao: 64, cunha: false, lentoAte: 0,
    vis: {}, sol: 0, laranja: 0, solAlvo: 0, laranjaAlvo: 0, tremida: 0, ultimoFlash: -1e9, flashes: [], sessao: 0,
  }
  const cv = $('#bCanvas', raiz), hud = $('#bHud', raiz), palco = $('#bPalco', raiz)
  const cx = cv.getContext('2d')
  const tinta = Arte.criarCanvas(64, 64), tx = tinta.getContext('2d')
  const som = (n) => opcoes.som?.(n)

  // ---------------------------------------------------------------- medidas (múltiplo inteiro; a câmera fica perto)
  function medir() {
    const larg = raiz.clientWidth || window.innerWidth
    const celular = larg < 700
    let k, LW, LH
    if (celular) {
      k = 2; LW = Math.floor(larg / k); LH = Math.max(176, Math.min(210, Math.floor((window.innerHeight - 260) / k)))
      B.cunha = true; B.chao = LH - 84
    } else {
      const altDisp = window.innerHeight - 190
      k = Math.max(2, Math.min(4, Math.floor((larg - 16) / 300), Math.floor(altDisp / 165)))
      LW = Math.min(340, Math.floor((larg - 16) / k)); LH = Math.max(165, Math.min(190, Math.floor(altDisp / k)))
      B.cunha = false; B.chao = 62
    }
    B.k = k; B.LW = LW; B.LH = LH
    cv.width = LW; cv.height = LH
    palco.style.width = LW * k + 'px'; palco.style.height = LH * k + 'px'
    cv.style.width = LW * k + 'px'; cv.style.height = LH * k + 'px'
    palco.style.setProperty('--k', k)
    if (B.estado) { posicionarTodos(true); atualizarHud() }
  }

  // ---------------------------------------------------------------- visual de cada monstro
  function alvoDe(id) {
    const b = B.estado.bonecos[id]
    const lug = lugaresDaArena(B.LW, B.LH, { chao: B.chao, cunha: B.cunha })[b.time]
    return lug[B.estado.times[b.time].lugares.indexOf(id)]
  }
  function posicionarTodos(ja) {
    for (const id of Object.keys(B.estado.bonecos)) {
      const a = alvoDe(id), v = (B.vis[id] ??= { x: a.x, y: a.y, pose: 'idle', avanco: 0, recuo: 0, flash: 0 })
      v.tx = a.x; v.ty = a.y
      if (ja) { v.x = a.x; v.y = a.y }
    }
  }
  /** Começou a luta cansado? (o motor pôs a vida inicial abaixo da máxima: regra de cansaço do piloto) */
  function cansadoNoInicio(id) {
    const b = B.luta?.inicial?.bonecos?.[id]
    return !!b && b.time === 'A' && b.vida < b.vidaMax
  }
  function criarHud() {
    hud.innerHTML = ''
    for (const id of Object.keys(B.estado.bonecos)) {
      const b = B.estado.bonecos[id]
      const el = document.createElement('div')
      el.className = 'b-mon b-mon--' + b.time
      el.dataset.id = id
      el.innerHTML = `<div class="b-nome">${B.nomes[id]}</div>
        <div class="b-vida"><img class="b-el px" src="${Arte.url(Arte.iconeElemento(b.tipo))}" alt="${ELEMENTOS[b.tipo].nome}"><div class="b-vida__barra"><i></i></div></div>
        ${cansadoNoInicio(id) ? '<span class="b-tired">Tired</span>' : ''}`
      hud.appendChild(el)
    }
  }
  function atualizarHud() {
    const e = B.estado, k = B.k
    for (const el of hud.querySelectorAll('.b-mon')) {
      const id = el.dataset.id, b = e.bonecos[id], v = B.vis[id]
      el.style.left = Math.round(v.tx * k) + 'px'
      el.style.top = Math.round((v.ty - 60) * k) + 'px'
      const pct = b.vidaMax ? b.vida / b.vidaMax : 0
      el.querySelector('.b-vida__barra i').style.width = (pct * 100).toFixed(1) + '%'
      el.querySelector('.b-vida__barra').classList.toggle('baixa', pct <= 0.3)
      el.classList.toggle('caido', b.estado === 'caido')
    }
    const turno = Math.max(1, e.turno)
    if (turno < SOL.desceDe) { B.solAlvo = 0; B.laranjaAlvo = 0 }
    else if (turno < SOL.encosta) { B.solAlvo = (turno - SOL.desceDe + 1) / (SOL.encosta - SOL.desceDe + 1); B.laranjaAlvo = 0.25 * B.solAlvo }
    else { B.solAlvo = 1; B.laranjaAlvo = 1 }
  }

  // ---------------------------------------------------------------- desenho (a cada quadro)
  let ultimo = performance.now()
  const quadros = new Set()
  function desenhar(t) {
    const dt = Math.min(100, t - ultimo); ultimo = t
    for (const f of quadros) f(dt)
    if (!B.estado || raiz.hidden) return
    const menos = opcoes.menosAnimacao()
    const pass = (a, b, r) => a + (b - a) * Math.min(1, r)
    B.sol = menos ? B.solAlvo : pass(B.sol, B.solAlvo, dt / 500)
    B.laranja = menos ? B.laranjaAlvo : pass(B.laranja, B.laranjaAlvo, dt / 500)
    desenharArena(cx, B.LW, B.LH, { sol: B.sol, laranja: B.laranja, chao: B.chao, cunha: B.cunha })
    const ids = Object.keys(B.estado.bonecos).sort((a, b) => B.vis[a].ty - B.vis[b].ty)
    for (const id of ids) {
      const b = B.estado.bonecos[id], v = B.vis[id]
      v.x = pass(v.x, v.tx, dt / 180); v.y = pass(v.y, v.ty, dt / 180)
      const sprite = Arte.monstro(B.defs[id], v.pose)
      const voa = /flutua/.test(B.tipos[id]) && !menos ? Math.round(Math.sin(t / 400 + v.x) * 1.5) - 3 : 0
      const resp = !menos && b.estado !== 'caido' ? (Math.sin(t / 520 + v.x / 9) > 0.6 ? 1 : 0) : 0
      const dir = b.time === 'A' ? 1 : -1
      if (v.recuo > 0) v.recuo = Math.max(0, v.recuo - dt / 30)
      const x = Math.round(v.x + dir * (v.avanco - (menos ? 0 : v.recuo))), y = Math.round(v.y)
      cx.fillStyle = 'rgba(43,30,58,0.28)'
      cx.fillRect(x - 14, y - 2, 28, 3); cx.fillRect(x - 10, y - 3, 20, 5)
      cx.save()
      cx.globalAlpha = b.estado === 'caido' ? 0.35 : 1
      cx.translate(x, y - 60 + voa + resp + (b.estado === 'caido' ? 6 : 0))
      if (dir < 0) { cx.scale(-1, 1); cx.translate(-32, 0) } else cx.translate(-32, 0)
      cx.drawImage(sprite, 0, 0, 64, 64)
      // branco só em cima do desenho do monstro (nunca um quadrado por cima da cena): o golpe acende; a última chance pulsa
      const branco = v.flash > 0 && !menos ? 0.75 : b.estado === 'fio' ? (menos ? 0.4 : 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t / 380))) : 0
      if (branco) {
        tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, 64, 64); tx.drawImage(sprite, 0, 0, 64, 64)
        tx.globalCompositeOperation = 'source-atop'; tx.fillStyle = '#FFFFFF'; tx.fillRect(0, 0, 64, 64)
        cx.globalAlpha = branco; cx.drawImage(tinta, 0, 0); cx.globalAlpha = 1
      }
      cx.restore()
      if (v.flash > 0) v.flash -= dt
    }
    // tremida (até 6 px por até 120 ms; nunca com Reduced motion)
    if (B.tremida > 0 && !menos) {
      B.tremida -= dt
      const dx = Math.round((Math.random() * 2 - 1) * 6), dy = Math.round((Math.random() * 2 - 1) * 3)
      palco.style.transform = `translate(${dx}px, ${dy}px)`
      ganchos?.tremeu?.(Math.max(Math.abs(dx), Math.abs(dy)))
    } else { B.tremida = 0; palco.style.transform = '' }
  }
  function laco(t) { desenhar(t); requestAnimationFrame(laco) }
  requestAnimationFrame(laco)

  // ---------------------------------------------------------------- tempo (velocidade e pulo)
  function espera(ms) {
    return new Promise((ok, falha) => {
      let resta = ms
      const f = (dt) => {
        if (B.pular) { quadros.delete(f); falha(new Pulou()); return }
        resta -= dt * B.vel * (performance.now() < B.lentoAte ? 0.25 : 1)
        if (resta <= 0) { quadros.delete(f); ok() }
      }
      quadros.add(f)
    })
  }

  // ---------------------------------------------------------------- efeitos
  function noAlvo(id, html, cls, atraso = 0) {
    const v = B.vis[id]; if (!v) return
    const el = document.createElement('div')
    el.className = 'b-pop ' + cls
    el.innerHTML = html
    el.style.left = Math.round(Math.max(26, Math.min(B.LW - 26, v.tx)) * B.k) + 'px'
    el.style.top = Math.round((v.ty - 38) * B.k) + 'px'
    el.style.animationDuration = Math.round(900 / B.vel) + 'ms'
    el.style.animationDelay = Math.round(atraso / B.vel) + 'ms'
    hud.appendChild(el)
    setTimeout(() => el.remove(), (900 + atraso) / B.vel + 200)
  }
  function flash(id) {
    if (opcoes.menosAnimacao()) return
    const agora = performance.now()
    if (agora - B.ultimoFlash < 340) return // no máximo 3 por segundo
    B.ultimoFlash = agora
    B.flashes.push(agora)
    B.vis[id].flash = 80
  }
  const icone = (t) => `<img class="b-ico" src="${Arte.url(Arte.iconeElemento(t))}" alt="${ELEMENTOS[t].nome}">`
  /** Selo grande no meio do palco (Sundown). Some sozinho. */
  function selo(texto, cls) {
    const el = document.createElement('div')
    el.className = 'b-selao ' + cls
    el.textContent = texto
    palco.appendChild(el)
    setTimeout(() => el.remove(), 1300)
  }

  // ---------------------------------------------------------------- um passo
  async function passo(p) {
    const evs = p.eventos, c = p.cmd
    if (c.tipo === 'jogar') {
      const de = evs.find((x) => x.t === 'carta').de
      const v = B.vis[de]
      v.pose = 'attack'; v.avanco = 10
      await espera(200)
      let atraso = 0, critico = false, bateu = null
      for (const ev of evs) {
        if (ev.t === 'dano') {
          const alvo = B.estado.bonecos[ev.alvo]
          const forte = !ev.refletido && ev.carta && bateForte(CARTAS[ev.carta].tipo, alvo.tipo)
          const resistido = golpeResistido(ev, alvo.tipo, B.luta.regras)
          let h = `<b>${ev.valor}</b>`
          if (resistido) h = '<small class="resistido">Resisted</small>' + h
          if (ev.critico) h = '<em>Critical!</em>' + h
          if (forte) h = `<em class="forte">${icone(CARTAS[ev.carta].tipo)} Strong!</em>` + h
          noAlvo(ev.alvo, h, 'b-pop--dano' + (ev.critico ? ' b-pop--crit' : '') + (forte ? ' b-pop--forte' : '') + (resistido ? ' b-pop--resiste' : '') + (ev.refletido ? ' b-pop--ref' : ''), atraso)
          if (ev.valor > 0) { flash(ev.alvo); B.vis[ev.alvo].recuo = 5 }
          if (ev.critico) critico = true
          if (!ev.refletido) bateu = ev.critico ? 'critico' : forte && bateu !== 'critico' ? 'forte' : bateu ?? 'golpe'
          atraso += 120
        } else if (ev.t === 'errou') { noAlvo(ev.alvo, '<b>MISS</b>', 'b-pop--miss', atraso); atraso += 120; som('miss') }
        else if (ev.t === 'cura') { noAlvo(ev.alvo, `<b>+${ev.valor}</b>`, 'b-pop--cura', atraso); som('cura') }
        else if (ev.t === 'escudo') som('guard')
        else if (ev.t === 'autoDano') noAlvo(ev.alvo, `<b>${ev.valor}</b>`, 'b-pop--dano b-pop--ref', atraso)
        else if (ev.t === 'ultimoFio') som('laststand')
        else if (ev.t === 'caiu') som('queda')
      }
      if (bateu) som(bateu)
      if (critico) { await espera(150); B.tremida = 120 } // crítico: pausa curta e tremida (tremida fora com Reduced motion)
      mostrar(p.estado)
      await espera(520)
      v.pose = 'idle'; v.avanco = 0
      await espera(140)
    } else if (c.tipo === 'passar') {
      for (const ev of evs) { if (ev.t === 'tesoura') noAlvo(ev.alvo, `<b>${ev.valor}</b>`, 'b-pop--sol'); else if (ev.t === 'caiu') som('queda') }
      const eraDia = B.estado.turno < SOL.encosta
      mostrar(p.estado)
      if (eraDia && p.estado.turno >= SOL.encosta) { som('sundown'); selo('SUNDOWN', 'b-selao--sol') }
      await espera(evs.some((x) => x.t === 'tesoura') ? 700 : 350)
    } else {
      mostrar(p.estado)
      await espera(100)
    }
  }
  function mostrar(estado) {
    B.estado = estado
    posicionarTodos(false)
    atualizarHud()
  }

  // ---------------------------------------------------------------- começar (a promessa termina quando a luta acaba na tela)
  async function comecar({ luta, nomes, defs, tipos }) {
    B.luta = luta; B.nomes = nomes; B.defs = defs; B.tipos = tipos
    for (const el of palco.querySelectorAll('.b-selao')) el.remove()
    B.i = -1; B.pular = false; B.acabou = false; B.vis = {}; B.sol = 0; B.laranja = 0
    B.estado = null
    medir()
    B.estado = luta.inicial
    posicionarTodos(true)
    criarHud()
    atualizarHud()
    atualizarBotoes()
    B.rodando = true
    const minhaVez = ++B.sessao
    try {
      await espera(400)
      for (let i = 0; i < luta.passos.length; i++) {
        if (B.sessao !== minhaVez) return false
        B.i = i
        await passo(luta.passos[i])
      }
    } catch (e) { if (!(e instanceof Pulou)) throw e }
    if (B.sessao !== minhaVez) return false
    if (B.pular) { // pulo: mostra o último estado
      for (const v of Object.values(B.vis)) { v.pose = 'idle'; v.avanco = 0 }
      B.i = luta.passos.length - 1
      mostrar(luta.passos[luta.passos.length - 1].estado)
      B.pular = false
    }
    B.acabou = true; B.rodando = false
    return true
  }

  function atualizarBotoes() {
    for (const b of raiz.querySelectorAll('[data-vel]')) b.setAttribute('aria-pressed', String(+b.dataset.vel === B.vel))
  }
  for (const b of raiz.querySelectorAll('[data-vel]')) b.addEventListener('click', () => { B.vel = +b.dataset.vel; gravar('piloto_vel', B.vel); atualizarBotoes() })
  window.addEventListener('resize', () => { if (!raiz.hidden) medir() })
  atualizarBotoes()

  return {
    B, comecar, medir,
    pular() { if (B.rodando && !B.acabou) B.pular = true },
    parar() { B.sessao++; B.rodando = false; quadros.clear() },
  }
}
