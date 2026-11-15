// Piloto — tela "Battle": reproduz a luta que já foi calculada inteira no início (semente + times + planos).
// Nada aqui decide resultado: a tela só mostra os passos e eventos do motor (shared/batalha.js).
import { bateForte } from '../../shared/batalha.js'
import { CARTAS, REGRAS } from '../../shared/config.js'
import * as Arte from './arte.js'
import { CHAO, desenharArena, lugaresDaArena } from './cenas.js'
import { ELEMENTOS, SOL, TERMOS, nomeDaHabilidade } from './tema.js'

const $ = (s, r = document) => r.querySelector(s)
const VELS = [1, 2, 4]
const ler = (k, p) => { try { return localStorage.getItem(k) ?? p } catch { return p } }
const gravar = (k, v) => { try { localStorage.setItem(k, v) } catch {} }
class Pulou extends Error {}

export function criarBatalha({ raiz, ganchos, opcoes }) {
  const B = {
    luta: null, nomes: {}, defs: {}, estado: null, i: -1, vel: VELS.includes(+ler('piloto_vel', '1')) ? +ler('piloto_vel', '1') : 1,
    pausado: false, pular: false, acabou: false, rodando: false, k: 1, LW: 384, LH: 216,
    vis: {}, sol: 0, laranja: 0, solAlvo: 0, laranjaAlvo: 0, tremida: 0, ultimoFlash: -1e9, flashes: [], stats: null,
  }
  const cv = $('#bCanvas', raiz), hud = $('#bHud', raiz), palco = $('#bPalco', raiz)
  const cx = cv.getContext('2d')

  // ---------------------------------------------------------------- medidas (múltiplo inteiro)
  function medir() {
    const larg = raiz.clientWidth || window.innerWidth
    const celular = larg < 700
    const altDisp = window.innerHeight - (celular ? 280 : 150)
    let k = celular ? 1 : Math.max(1, Math.min(3, Math.floor((larg - 16) / 384), Math.floor(altDisp / 216)))
    const LW = Math.min(440, Math.floor((celular ? larg : larg - 16) / k))
    const LH = celular ? 236 : Math.max(216, Math.min(260, Math.floor((window.innerHeight - 130) / k)))
    B.k = k; B.LW = LW; B.LH = LH
    cv.width = LW; cv.height = LH
    palco.style.width = LW * k + 'px'; palco.style.height = LH * k + 'px'
    cv.style.width = LW * k + 'px'; cv.style.height = LH * k + 'px'
    palco.style.setProperty('--k', k)
    raiz.classList.toggle('b-celular', celular)
    if (B.estado) { posicionarTodos(true); atualizarHud() }
  }

  // ---------------------------------------------------------------- visual de cada monstro
  function alvoDe(id) {
    const b = B.estado.bonecos[id]
    const lug = lugaresDaArena(B.LW, B.LH)[b.time]
    const i = B.estado.times[b.time].lugares.indexOf(id)
    return lug[i]
  }
  function posicionarTodos(ja) {
    for (const id of Object.keys(B.estado.bonecos)) {
      const a = alvoDe(id), v = (B.vis[id] ??= { x: a.x, y: a.y, pose: 'idle', avanco: 0, flash: 0, alfa: 1, tomba: 0 })
      v.tx = a.x; v.ty = a.y
      if (ja) { v.x = a.x; v.y = a.y }
    }
  }

  function criarHud() {
    hud.innerHTML = ''
    for (const id of Object.keys(B.estado.bonecos)) {
      const b = B.estado.bonecos[id]
      const el = document.createElement('div')
      el.className = 'b-mon b-mon--' + b.time
      el.dataset.id = id
      const cartas = cartasDe(id)
      el.innerHTML = `<div class="b-nome">${B.nomes[id]}</div>
        <div class="b-prontas">${cartas.map((c) => `<img class="b-pronta" data-carta="${c}" alt="${nomeDaHabilidade(c)}" title="${nomeDaHabilidade(c)}" src="${Arte.url(Arte.iconeHabilidade(c))}">`).join('')}</div>
        <div class="b-vida"><div class="b-vida__barra"><i></i></div><span class="b-vida__num"></span></div>
        <div class="b-status"><span class="b-guard" hidden></span><span class="b-exp" hidden title="Exposed">Exposed</span><span class="b-veil" hidden title="Veil">Veil</span></div>
        <div class="b-selo" hidden>LAST STAND</div>`
      hud.appendChild(el)
    }
    for (const t of ['A', 'B']) {
      const o = document.createElement('div')
      o.className = 'b-glow b-glow--' + t
      o.innerHTML = `<span class="b-glow__rot">Glow</span>` + Array.from({ length: REGRAS.linhaMaxima }, () => '<i></i>').join('')
      hud.appendChild(o)
    }
  }
  function cartasDe(id) {
    const vistas = []
    for (const c of Object.values(B.estado.cartas)) if (c.dono === id && !vistas.includes(c.carta)) vistas.push(c.carta)
    const ordem = { cabeca: 0, bracos: 1, pernas: 2 }
    return vistas.sort((a, b) => ordem[CARTAS[a].parte] - ordem[CARTAS[b].parte])
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
      el.querySelector('.b-vida__num').textContent = b.estado === 'caido' ? 'Out' : `${b.vida}`
      const g = el.querySelector('.b-guard')
      g.hidden = !(b.escudo > 0); g.textContent = b.escudo
      el.querySelector('.b-exp').hidden = !(b.fioSoltoAte >= e.turno && b.estado === 'vivo')
      el.querySelector('.b-veil').hidden = !b.veu
      el.querySelector('.b-selo').hidden = b.estado !== 'fio'
      el.classList.toggle('caido', b.estado === 'caido')
      el.classList.toggle('fio', b.estado === 'fio')
      const mao = new Set(e.times[b.time].mao.map((cid) => e.cartas[cid]).filter((c) => c && c.dono === id).map((c) => c.carta))
      for (const im of el.querySelectorAll('.b-pronta')) im.classList.toggle('acesa', mao.has(im.dataset.carta) && b.estado !== 'caido')
    }
    const lista = $('#bLista', raiz)
    lista.innerHTML = ['A', 'B'].map((t) => `<div class="b-lista__time"><h3>${t === 'A' ? 'Your team' : 'Rival'}</h3>` + e.times[t].lugares.map((id, i) => {
      const b = e.bonecos[id]
      const st = [b.escudo > 0 ? `<span class="b-guard">${b.escudo}</span>` : '', b.fioSoltoAte >= e.turno && b.estado === 'vivo' ? '<span class="b-exp">Exposed</span>' : '', b.veu ? '<span class="b-veil">Veil</span>' : '', b.estado === 'fio' ? '<span class="b-exp">Last Stand</span>' : ''].join('')
      return `<div class="b-lista__m${b.estado === 'caido' ? ' caido' : ''}"><img src="${Arte.url(Arte.iconeElemento(b.tipo))}" alt=""><b>${B.nomes[id]}</b><small>${['Front', 'Middle', 'Back'][i]}</small><span>${b.estado === 'caido' ? 'Out' : b.vida + '/' + b.vidaMax}</span>${st}</div>`
    }).join('') + '</div>').join('')
    for (const t of ['A', 'B']) {
      const o = hud.querySelector('.b-glow--' + t)
      ;[...o.querySelectorAll('i')].forEach((i, n) => i.classList.toggle('on', n < e.times[t].linha))
    }
    const turno = Math.max(1, e.turno)
    $('#bTurno', raiz).textContent = `Turn ${turno}/${REGRAS.turnoFinal}`
    $('#bVez', raiz).textContent = e.vez === 'A' ? 'Your team acts' : 'Rival acts'
    $('#bSol', raiz).textContent = turno >= SOL.encosta ? 'Sundown! Everyone tires.' : turno >= SOL.desceDe ? `Sundown in ${SOL.encosta - turno}` : 'Sun is high'
    alvoSol(turno)
    ganchos?.mudou?.()
  }
  function alvoSol(turno) {
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
    if (!B.estado) return
    const menos = opcoes.menosAnimacao()
    const pass = (a, b, r) => a + (b - a) * Math.min(1, r)
    B.sol = menos ? B.solAlvo : pass(B.sol, B.solAlvo, dt / 500)
    B.laranja = menos ? B.laranjaAlvo : pass(B.laranja, B.laranjaAlvo, dt / 500)
    desenharArena(cx, B.LW, B.LH, { sol: B.sol, laranja: B.laranja })
    const ids = Object.keys(B.estado.bonecos).sort((a, b) => B.vis[a].ty - B.vis[b].ty)
    for (const id of ids) {
      const b = B.estado.bonecos[id], v = B.vis[id]
      v.x = pass(v.x, v.tx, dt / 180); v.y = pass(v.y, v.ty, dt / 180)
      const sprite = Arte.monstro(B.defs[id], v.pose)
      const voa = /flutua/.test(B.tipos[id]) && !menos ? Math.round(Math.sin(t / 400 + v.x) * 1.5) - 3 : 0
      const resp = !menos && b.estado !== 'caido' ? (Math.sin(t / 520 + v.x / 9) > 0.6 ? 1 : 0) : 0
      const dir = b.time === 'A' ? 1 : -1
      const x = Math.round(v.x + dir * v.avanco), y = Math.round(v.y)
      // sombra
      cx.fillStyle = 'rgba(43,30,58,0.28)'
      cx.fillRect(x - 14, y - 2, 28, 3); cx.fillRect(x - 10, y - 3, 20, 5)
      cx.save()
      cx.globalAlpha = b.estado === 'caido' ? 0.35 : 1
      cx.translate(x, y - 60 + voa + resp + (b.estado === 'caido' ? 6 : 0))
      if (dir < 0) { cx.scale(-1, 1); cx.translate(-32, 0) } else cx.translate(-32, 0)
      if (b.estado === 'fio') { // aura branca pulsando devagar (parada com Reduced motion)
        const a = menos ? 0.45 : 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(t / 380))
        cx.globalAlpha = a; cx.fillStyle = '#FFFFFF'
        for (let yy = 6; yy < 62; yy += 2) { const w = 20 + Math.round(6 * Math.sin(yy / 9)); cx.fillRect(32 - w, yy, w * 2, 2) }
        cx.globalAlpha = 1
      }
      cx.drawImage(sprite, 0, 0, 64, 64)
      if (v.flash > 0 && !menos) { cx.globalCompositeOperation = 'source-atop'; cx.globalAlpha = 0.75; cx.fillStyle = '#FFFFFF'; cx.fillRect(0, 0, 64, 64); cx.globalCompositeOperation = 'source-over' }
      cx.restore()
      if (v.flash > 0) v.flash -= dt
    }
    // tremida (até 6 px por até 120 ms; nunca com Reduced motion)
    if (B.tremida > 0 && !menos) {
      B.tremida -= dt
      const m = 6
      const dx = Math.round((Math.random() * 2 - 1) * m), dy = Math.round((Math.random() * 2 - 1) * m / 2)
      palco.style.transform = `translate(${dx}px, ${dy}px)`
      ganchos?.tremeu?.(Math.max(Math.abs(dx), Math.abs(dy)))
    } else { B.tremida = 0; palco.style.transform = '' }
  }
  function laco(t) { desenhar(t); requestAnimationFrame(laco) }
  requestAnimationFrame(laco)

  // ---------------------------------------------------------------- tempo (velocidade, Pause, Skip)
  function espera(ms) {
    return new Promise((ok, falha) => {
      let resta = ms
      const f = (dt) => {
        if (B.pular) { quadros.delete(f); falha(new Pulou()); return }
        if (!B.pausado) resta -= dt * B.vel
        if (resta <= 0) { quadros.delete(f); ok() }
      }
      quadros.add(f)
    })
  }

  // ---------------------------------------------------------------- efeitos de tela
  function noAlvo(id, html, cls, atraso = 0) {
    const v = B.vis[id]; if (!v) return
    const el = document.createElement('div')
    el.className = 'b-pop ' + cls
    el.innerHTML = html
    el.style.left = Math.round(v.tx * B.k) + 'px'
    el.style.top = Math.round((v.ty - 34) * B.k) + 'px'
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
  function faixa(cartaId, de) {
    const f = $('#bFaixa', raiz)
    const c = CARTAS[cartaId]
    f.className = 'b-faixa b-faixa--' + B.estado.bonecos[de].time
    f.style.setProperty('--cor', ELEMENTOS[c.tipo].cor)
    f.innerHTML = `<img src="${Arte.url(Arte.iconeElemento(c.tipo))}" alt=""><b>${nomeDaHabilidade(cartaId)}</b><small>${B.nomes[de]}</small>`
    f.hidden = false
  }
  const esconderFaixa = () => { $('#bFaixa', raiz).hidden = true }
  const icone = (t) => `<img class="b-ico" src="${Arte.url(Arte.iconeElemento(t))}" alt="${ELEMENTOS[t].nome}">`

  // ---------------------------------------------------------------- um passo
  async function passo(p) {
    const evs = p.eventos
    const c = p.cmd
    if (c.tipo === 'jogar') {
      const ec = evs.find((x) => x.t === 'carta')
      const de = ec.de, carta = ec.id
      faixa(carta, de)
      await espera(350)
      const v = B.vis[de]
      v.pose = 'attack'; v.avanco = 6
      await espera(180)
      let atraso = 0, critico = false, ultimoFio = false
      for (const ev of evs) {
        if (ev.t === 'dano') {
          const alvo = B.estado.bonecos[ev.alvo]
          const forte = !ev.refletido && ev.carta && bateForte(CARTAS[ev.carta].tipo, alvo.tipo)
          let h = `<b>${ev.valor}</b>`
          if (ev.escudo) h += `<small>${ev.escudo} blocked</small>`
          if (ev.critico) h = `<em>Critical!</em>` + h
          if (forte) h = `<em class="forte">${icone(CARTAS[ev.carta].tipo)} Strong! ${icone(alvo.tipo)}</em>` + h
          noAlvo(ev.alvo, h, 'b-pop--dano' + (ev.critico ? ' b-pop--crit' : '') + (ev.refletido ? ' b-pop--ref' : ''), atraso)
          if (ev.valor > 0) flash(ev.alvo)
          if (ev.critico) critico = true
          B.stats.dano[B.estado.bonecos[ev.de]?.time ?? 'x'] = (B.stats.dano[B.estado.bonecos[ev.de]?.time ?? 'x'] ?? 0) + ev.valor
          if (ev.de && B.estado.bonecos[ev.de].time === 'A' && ev.valor > B.stats.maior.valor) B.stats.maior = { valor: ev.valor, carta: ev.carta }
          atraso += 120
        } else if (ev.t === 'errou') { noAlvo(ev.alvo, '<b>MISS!</b>', 'b-pop--miss', atraso); atraso += 120 }
        else if (ev.t === 'cura') noAlvo(ev.alvo, `<b>+${ev.valor}</b>`, 'b-pop--cura', atraso)
        else if (ev.t === 'escudo') noAlvo(ev.alvo, `<b>+${ev.valor}</b><small>Guard</small>`, 'b-pop--guard', atraso)
        else if (ev.t === 'veu') noAlvo(ev.alvo, '<b>Veil</b>', 'b-pop--veil', atraso)
        else if (ev.t === 'fioSolto') noAlvo(ev.alvo, '<b>Exposed</b>', 'b-pop--exp', atraso + 200)
        else if (ev.t === 'quebraEscudo') noAlvo(ev.alvo, '<b>Guard broken</b>', 'b-pop--exp', atraso)
        else if (ev.t === 'autoDano') noAlvo(ev.alvo, `<b>-${ev.valor}</b>`, 'b-pop--dano', atraso)
        else if (ev.t === 'ultimoFio') ultimoFio = true
        else if (ev.t === 'linha' && ev.time !== c.time) noAlvo(B.estado.times[ev.time].lugares[0], '<b>-Glow</b>', 'b-pop--exp', atraso)
      }
      if (critico) { await espera(150); B.tremida = 120 }
      mostrar(p.estado)
      if (ultimoFio) { B.lento = true; await espera(400 * B.vel); B.lento = false } // câmera lenta de 0,4 s (não acelera)
      await espera(560)
      v.pose = 'idle'; v.avanco = 0
      esconderFaixa()
      await espera(160)
    } else if (c.tipo === 'passar') {
      const turno = evs.find((x) => x.t === 'turno')
      for (const ev of evs) if (ev.t === 'tesoura') noAlvo(ev.alvo, `<b>-${ev.valor}</b><small>Sundown</small>`, 'b-pop--sol')
      mostrar(p.estado)
      if (turno) { const ch = $('#bChip', raiz); ch.textContent = `Turn ${p.estado.turno} · ${turno.time === 'A' ? 'Your team' : 'Rival'}`; ch.hidden = false; ch.classList.remove('anim'); void ch.offsetWidth; ch.classList.add('anim') }
      await espera(evs.some((x) => x.t === 'tesoura') ? 800 : 500)
    } else {
      mostrar(p.estado)
      await espera(120)
    }
  }

  function mostrar(estado) {
    B.estado = estado
    posicionarTodos(false)
    atualizarHud()
  }

  // ---------------------------------------------------------------- começar / fim
  async function comecar({ luta, nomes, defs, tipos }) {
    B.luta = luta; B.nomes = nomes; B.defs = defs; B.tipos = tipos
    B.i = -1; B.pular = false; B.pausado = false; B.acabou = false; B.vis = {}; B.sol = 0; B.laranja = 0
    B.stats = { dano: {}, maior: { valor: 0, carta: null } }
    B.estado = null
    hud.innerHTML = ''
    medir()
    B.estado = luta.inicial
    $('#bFim', raiz).hidden = true; $('#bNoite', raiz).hidden = true; $('#bChip', raiz).hidden = true
    esconderFaixa()
    posicionarTodos(true)
    criarHud()
    atualizarHud()
    atualizarBotoes()
    B.rodando = true
    const minhaVez = (B.sessao = (B.sessao ?? 0) + 1)
    try {
      await espera(600)
      for (let i = 0; i < luta.passos.length; i++) {
        if (B.sessao !== minhaVez) return
        B.i = i
        await passo(luta.passos[i])
      }
    } catch (e) { if (!(e instanceof Pulou)) throw e }
    if (B.sessao !== minhaVez) return
    // Skip ou fim: mostra o último estado e soma os números que faltaram
    if (B.pular) {
      B.stats = { dano: {}, maior: { valor: 0, carta: null } }
      for (const p of luta.passos) for (const ev of p.eventos) if (ev.t === 'dano' && ev.de) {
        const t = luta.inicial.bonecos[ev.de].time
        B.stats.dano[t] = (B.stats.dano[t] ?? 0) + ev.valor
        if (t === 'A' && ev.valor > B.stats.maior.valor) B.stats.maior = { valor: ev.valor, carta: ev.carta }
      }
      for (const v of Object.values(B.vis)) { v.pose = 'idle'; v.avanco = 0 }
      esconderFaixa()
      B.i = luta.passos.length - 1
      mostrar(luta.passos[luta.passos.length - 1].estado)
      B.pular = false
    }
    await mostrarFim()
  }

  async function mostrarFim() {
    const r = B.luta.resultado
    const e = B.estado
    const caiuTudo = (t) => e.times[t].lugares.every((id) => e.bonecos[id].estado === 'caido')
    const noite = r.turno >= REGRAS.turnoFinal && !caiuTudo('A') && !caiuTudo('B')
    if (noite) {
      const n = $('#bNoite', raiz)
      n.hidden = false
      const pA = Math.round((r.pct.A / 3) * 100), pB = Math.round((r.pct.B / 3) * 100)
      n.innerHTML = `<h3>Nightfall</h3><p>${TERMOS.nightfall.replace(/^Nightfall: a/, 'A')}</p>
        <div class="b-noite__barras"><div><span>Your team</span><div class="b-noite__b"><i style="--p:${pA}%"></i></div><b>${pA}%</b></div>
        <div><span>Rival</span><div class="b-noite__b b"><i style="--p:${pB}%"></i></div><b>${pB}%</b></div></div>`
      try { await espera(1600) } catch {}
      n.hidden = true
    }
    B.acabou = true; B.rodando = false
    const venceu = r.vencedor === 'A'
    const motivo = noite ? 'Nightfall: higher team HP % wins.' : r.motivo === 'desempate' ? 'Both teams fell together: a coin decided it.' : r.motivo === 'tesoura' ? (venceu ? 'The Sundown wore the rivals out.' : 'The Sundown wore your team out.') : venceu ? 'Every rival is out.' : 'Your whole team is out.'
    const f = $('#bFim', raiz)
    f.className = 'b-fim ' + (venceu ? 'vitoria' : 'derrota')
    $('#bFimTit', raiz).textContent = venceu ? 'Victory!' : 'Defeat'
    $('#bFimMot', raiz).textContent = motivo
    $('#bN1', raiz).textContent = r.turno
    $('#bN2', raiz).textContent = B.stats.dano.A ?? 0
    $('#bN3', raiz).textContent = B.stats.maior.valor
    $('#bN3r', raiz).textContent = B.stats.maior.carta ? `Biggest hit · ${nomeDaHabilidade(B.stats.maior.carta)}` : 'Biggest hit'
    f.hidden = false
    atualizarBotoes()
    ganchos?.fim?.(r)
  }

  function atualizarBotoes() {
    for (const b of raiz.querySelectorAll('[data-vel]')) b.setAttribute('aria-pressed', String(+b.dataset.vel === B.vel))
    const p = $('#bPausa', raiz)
    p.textContent = B.pausado ? 'Play' : 'Pause'
    p.setAttribute('aria-pressed', String(B.pausado))
    $('#bPular', raiz).disabled = B.acabou
    p.disabled = B.acabou
  }

  for (const b of raiz.querySelectorAll('[data-vel]')) b.addEventListener('click', () => { B.vel = +b.dataset.vel; gravar('piloto_vel', B.vel); atualizarBotoes() })
  $('#bPausa', raiz).addEventListener('click', () => { if (B.acabou) return; B.pausado = !B.pausado; raiz.classList.toggle('pausado', B.pausado); atualizarBotoes() })
  $('#bPular', raiz).addEventListener('click', () => { if (!B.rodando || B.acabou) return; B.pausado = false; raiz.classList.remove('pausado'); B.pular = true; atualizarBotoes() })
  window.addEventListener('resize', () => { if (!raiz.hidden) medir() })

  return {
    B, comecar, medir,
    parar() { B.sessao = (B.sessao ?? 0) + 1; B.rodando = false; quadros.clear() },
  }
}
