// Frayz — peça BASTIDOR: a roda dos 6 tecidos presa num bastidor de bordado (guia §1 e §6).
// Legível a 96 px (PC) e a 72 px (celular). A ordem, os nomes e quem bate em quem vêm de quem chama (ponte).
//
//   criarBastidor({ tipos, nomes, pares, titulo, texto, frase, lado }) → bastidor
//     tipos:  lista na ordem da roda                         nomes: { tipo: 'Nome' }
//     pares:  [[quemBateForte, quemApanha], ...]             texto: frase da legenda (com o número que a ponte deu)
//     frase:  (nomeA, nomeB) => 'Jeans bate forte em Seda'   lado:  para onde a legenda abre: 'baixo' | 'esquerda' | 'direita' | 'cima'
//                                                            ('cima' = à esquerda do bastidor, subindo: para quando ele fica embaixo, perto da mão)
//   bastidor.acender(tipoDaCarta | null)   mostra quem a carta bate forte (retalho aceso + seta de ouro)
//   bastidor.medir() · bastidor.abrir() · bastidor.fechar() · bastidor.el
import { densidade, el, svg } from './base.js'
import * as arte from './arte-adaptador.js'

const TAU = Math.PI * 2

export function criarBastidor({ tipos = [], nomes = {}, pares = [], titulo = 'Roda dos tecidos', texto = '', frase = (a, b) => `${a} bate forte em ${b}`, lado = 'baixo' } = {}) {
  const raiz = el('span', 'fz-bastidor'); raiz.dataset.lado = lado
  const botao = el('button', 'fz-bastidor__botao'); botao.type = 'button'; botao.setAttribute('aria-expanded', 'false'); botao.setAttribute('aria-haspopup', 'dialog')
  const pano = document.createElement('canvas'); pano.className = 'fz-bastidor__pano'
  const setas = svg('svg', { class: 'fz-bastidor__setas', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' })
  botao.append(pano, setas)
  const legenda = el('div', 'fz-bastidor__legenda'); legenda.setAttribute('role', 'dialog'); legenda.setAttribute('aria-label', titulo); legenda.hidden = true
  raiz.append(botao, legenda)

  const n = tipos.length, angulo = (i) => -Math.PI / 2 + (i / n) * TAU
  let aceso = null, S = 0
  const apanhamDe = (tipo) => pares.filter(([a]) => a === tipo).map(([, b]) => b)

  // medidas em fração do lado (iguais no canvas e no SVG de 100)
  const M = { fora: 0.5 - 0.03, aro: 0.072, retalho: 0.114 }
  M.panoR = M.fora - M.aro; M.anel = M.panoR - M.retalho - 0.024; M.seta = M.anel + M.retalho * 0.9

  function rotular() {
    const quem = aceso ? `${nomes[aceso] ?? aceso}: ` + (apanhamDe(aceso).map((b) => frase(nomes[aceso] ?? aceso, nomes[b] ?? b)).join('; ') || 'sem vantagem') + '. ' : ''
    botao.setAttribute('aria-label', `${titulo}. ${quem}Toque para ver os nomes.`)
  }

  function montarSetas() {
    setas.replaceChildren()
    for (const [a, b] of pares) {
      const i = tipos.indexOf(a), j = tipos.indexOf(b)
      if (i < 0 || j < 0) continue
      let da = angulo(j) - angulo(i); while (da <= -Math.PI) da += TAU; while (da > Math.PI) da -= TAU
      const meio = angulo(i) + da / 2, sentido = da >= 0 ? 1 : -1
      const R = M.seta * 100, cx = 50 + Math.cos(meio) * R, cy = 50 + Math.sin(meio) * R
      const tg = meio + (Math.PI / 2) * sentido, t = 4.2 // ponta na direção de quem apanha
      const ponta = [cx + Math.cos(tg) * t * 0.62, cy + Math.sin(tg) * t * 0.62]
      const asa = (s) => [cx - Math.cos(tg) * t * 0.5 + Math.cos(meio) * t * 0.78 * s, cy - Math.sin(tg) * t * 0.5 + Math.sin(meio) * t * 0.78 * s]
      const p = (q) => q.map((v) => v.toFixed(2)).join(' ')
      const d = `M${p(asa(1))} L${p(ponta)} L${p(asa(-1))}`
      setas.append(svg('g', { class: 'fz-bastidor__seta', 'data-de': a, 'data-para': b }, [svg('path', { class: 'fz-bastidor__seta-borda', d }), svg('path', { class: 'fz-bastidor__seta-fio', d })]))
    }
  }

  function desenhar() {
    S = Math.round(botao.clientWidth) || 96
    const d = densidade(); pano.width = pano.height = Math.round(S * d)
    const c = pano.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, S, S)
    const cx = S / 2, cy = S / 2, Ro = M.fora * S, th = M.aro * S, Rc = M.panoR * S
    // pano esticado
    const g = c.createRadialGradient(cx - S * 0.12, cy - S * 0.14, S * 0.05, cx, cy, Rc)
    g.addColorStop(0, '#46306A'); g.addColorStop(0.7, '#2F1F47'); g.addColorStop(1, '#22153A')
    c.save(); c.beginPath(); c.arc(cx, cy, Rc + 0.5, 0, TAU); c.clip()
    c.fillStyle = g; c.fillRect(0, 0, S, S)
    c.strokeStyle = 'rgba(242,230,201,0.055)'; c.lineWidth = 1
    for (let k = 1.5; k < S; k += 3) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, S); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(S, k); c.stroke() }
    c.strokeStyle = 'rgba(10,4,18,0.5)'; c.lineWidth = S * 0.05; c.beginPath(); c.arc(cx, cy, Rc, 0, TAU); c.stroke() // sombra do aro no pano
    c.restore()
    // aro de madeira (dois aros: o de fora e o de dentro)
    const m = c.createLinearGradient(0, 0, S, S); m.addColorStop(0, '#EBC187'); m.addColorStop(0.5, '#C9965A'); m.addColorStop(1, '#8F6130')
    c.strokeStyle = m; c.lineWidth = th; c.beginPath(); c.arc(cx, cy, Ro - th / 2, 0, TAU); c.stroke()
    c.strokeStyle = 'rgba(90,52,18,0.6)'; c.lineWidth = Math.max(1, S * 0.012); c.beginPath(); c.arc(cx, cy, Ro - th * 0.52, 0, TAU); c.stroke()
    c.strokeStyle = 'rgba(255,240,205,0.5)'; c.lineWidth = Math.max(0.8, S * 0.01); c.beginPath(); c.arc(cx, cy, Ro - th * 0.2, Math.PI * 1.02, Math.PI * 1.55); c.stroke()
    c.strokeStyle = '#140C1F'; c.lineWidth = Math.max(1.5, S * 0.02)
    c.beginPath(); c.arc(cx, cy, Ro, 0, TAU); c.stroke(); c.beginPath(); c.arc(cx, cy, Rc, 0, TAU); c.stroke()
    // o fecho de metal com o parafuso, no alto
    const fw = S * 0.17, fh = th + S * 0.03, fx = cx - fw / 2, fy = cy - Ro - S * 0.012
    c.fillStyle = '#C9CED6'; c.strokeStyle = '#140C1F'; c.lineWidth = Math.max(1.3, S * 0.018); c.beginPath(); c.roundRect(fx, fy, fw, fh, S * 0.02); c.fill(); c.stroke()
    c.fillStyle = '#6F7785'; c.beginPath(); c.arc(cx - fw * 0.24, fy + fh / 2, S * 0.014, 0, TAU); c.arc(cx + fw * 0.24, fy + fh / 2, S * 0.014, 0, TAU); c.fill()
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(fx + S * 0.02, fy + S * 0.012, fw - S * 0.04, Math.max(1, S * 0.012))
    // os 6 retalhos
    const alvos = aceso ? apanhamDe(aceso) : []
    tipos.forEach((t, i) => {
      const forte = t === aceso, alvo = alvos.includes(t), apagado = aceso && !forte && !alvo
      const r = M.retalho * S * (forte ? 1.2 : 1), x = cx + Math.cos(angulo(i)) * M.anel * S, y = cy + Math.sin(angulo(i)) * M.anel * S
      const ic = arte.iconeDoTipo(t, Math.round(r * 2 * d * 1.2))
      c.save(); c.globalAlpha = apagado ? 0.4 : 1
      c.fillStyle = 'rgba(10,4,18,0.5)'; c.beginPath(); c.ellipse(x + r * 0.08, y + r * 0.2, r, r * 0.96, 0, 0, TAU); c.fill() // sombra do retalho no pano
      c.drawImage(ic, x - r, y - r, r * 2, r * 2)
      c.restore()
      if (forte || alvo) {
        c.strokeStyle = '#FFC857'; c.lineWidth = Math.max(1.6, S * 0.022); c.lineCap = 'round'
        if (alvo) c.setLineDash([S * 0.04, S * 0.035])
        c.beginPath(); c.arc(x, y, r + S * 0.02, 0, TAU); c.stroke(); c.setLineDash([])
      }
    })
    for (const s of setas.children) s.classList.toggle('fz-bastidor__seta--acesa', !!aceso && s.dataset.de === aceso)
    raiz.dataset.aceso = aceso ?? ''
    rotular()
  }

  function montarLegenda() {
    legenda.replaceChildren(el('b', 'fz-bastidor__titulo', titulo))
    const lista = el('ul', 'fz-bastidor__lista')
    for (const [a, b] of pares) {
      const li = el('li', 'fz-bastidor__par'); li.dataset.de = a
      const item = (t) => { const s = el('span', 'fz-bastidor__tecido'); const cv = document.createElement('canvas'); const ic = arte.iconeDoTipo(t, Math.round(22 * densidade())); cv.width = ic.width; cv.height = ic.height; cv.getContext('2d').drawImage(ic, 0, 0); s.append(cv, el('span', null, nomes[t] ?? t)); return s }
      const seta = el('span', 'fz-bastidor__bate', '›'); seta.setAttribute('aria-hidden', 'true')
      li.append(item(a), seta, item(b)); li.setAttribute('aria-label', frase(nomes[a] ?? a, nomes[b] ?? b))
      lista.append(li)
    }
    legenda.append(lista)
    if (texto) legenda.append(el('p', 'fz-bastidor__texto', texto))
  }

  function fora(ev) { if (!raiz.contains(ev.target)) fechar() }
  function esc(ev) { if (ev.key === 'Escape') { fechar(); botao.focus({ preventScroll: true }) } }
  function abrir() {
    montarLegenda()
    legenda.hidden = false; botao.setAttribute('aria-expanded', 'true')
    for (const li of legenda.querySelectorAll('.fz-bastidor__par')) li.classList.toggle('fz-bastidor__par--aceso', li.dataset.de === aceso)
    document.addEventListener('pointerdown', fora, true); document.addEventListener('keydown', esc, true)
  }
  function fechar() {
    legenda.hidden = true; botao.setAttribute('aria-expanded', 'false')
    document.removeEventListener('pointerdown', fora, true); document.removeEventListener('keydown', esc, true)
  }
  botao.addEventListener('click', () => (legenda.hidden ? abrir() : fechar()))

  montarSetas(); rotular()
  arte.pronta.then(() => desenhar())
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (Math.round(botao.clientWidth) !== S) desenhar() }).observe(botao)

  return {
    el: raiz,
    acender(tipo) { aceso = tipo && tipos.includes(tipo) ? tipo : null; desenhar(); if (!legenda.hidden) abrir() },
    medir: desenhar, abrir, fechar,
  }
}
