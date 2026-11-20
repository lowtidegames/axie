// Frayz — peças de VIDA do boneco (guia §1): a FITA MÉTRICA que vai sendo cortada, o DEDAL do escudo e os
// ALFINETES de estado (Fio Solto, Véu, Último Fio). Os números e as frases vêm de quem chama (ponte); aqui só se desenha.
//
//   criarFita()      → { el, definir({ vida, vidaMax, alerta, caido }) }
//        a parte perdida cai cortada; a "barra fantasma" mostra o que havia e encolhe com atraso
//   criarDedal()     → { el, definir(numero) }           (some com 0)
//   criarAlfinetes() → { el, definir([{ tipo, titulo, legenda }]) }   tipo: 'fio-solto' | 'veu' | 'ultimo-fio' | outro
//        um toque no grupo abre a legenda de todos os alfinetes (alvo de toque único, ≥ 44 px)
//   criarPlaca()     → { el, fita, dedal, alfinetes, definir({ vida, vidaMax, escudo, marcas, alerta, caido }) }
import { animar, el, esperar, menosAnimacao, svg } from './base.js'

const limitar = (v) => Math.max(0, Math.min(1, v))

// ------------------------------------------------------------------ fita métrica

export function criarFita() {
  const raiz = el('div', 'fz-fita'); raiz.setAttribute('role', 'img')
  const caixa = el('span', 'fz-fita__caixa'), numero = el('b', 'fz-fita__numero', '0'); caixa.append(numero)
  const trilho = el('span', 'fz-fita__trilho'), fantasma = el('span', 'fz-fita__fantasma'), tira = el('span', 'fz-fita__tira')
  trilho.append(fantasma, tira)
  raiz.append(caixa, trilho)
  let v = null, relogio = 0

  function definir({ vida, vidaMax, alerta = false, caido = false }) {
    const novo = vidaMax > 0 ? limitar(vida / vidaMax) : 0, antes = v
    numero.textContent = String(vida)
    raiz.setAttribute('aria-label', `Vida: ${vida} de ${vidaMax}`)
    raiz.classList.toggle('fz-fita--alerta', !!alerta && !caido)
    raiz.classList.toggle('fz-fita--caida', !!caido)
    raiz.style.setProperty('--v', novo.toFixed(4))
    v = novo
    if (antes == null) { raiz.style.setProperty('--f', novo.toFixed(4)); return }
    clearTimeout(relogio)
    if (novo < antes - 0.0005) { // DANO: o pedaço cortado cai; a fantasma espera e depois encolhe
      raiz.style.setProperty('--f', antes.toFixed(4))
      const pedaco = el('span', 'fz-fita__pedaco')
      pedaco.style.left = novo * 100 + '%'; pedaco.style.width = (antes - novo) * 100 + '%'
      trilho.append(pedaco)
      if (menosAnimacao()) esperar(260).then(() => pedaco.remove())
      else animar(pedaco, [{ transform: 'translateY(0) rotate(0deg)', opacity: 1 }, { transform: 'translateY(22px) rotate(9deg)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.5,0,.9,.5)', fill: 'forwards' }).then(() => pedaco.remove())
      relogio = setTimeout(() => raiz.style.setProperty('--f', novo.toFixed(4)), 380)
    } else if (novo > antes + 0.0005) { // CURA: a fita cresce com um brilho verde
      raiz.style.setProperty('--f', novo.toFixed(4))
      raiz.classList.remove('fz-fita--cura'); void raiz.offsetWidth; raiz.classList.add('fz-fita--cura')
      relogio = setTimeout(() => raiz.classList.remove('fz-fita--cura'), 700)
    }
  }
  return { el: raiz, definir }
}

// ------------------------------------------------------------------ dedal (escudo)

export function criarDedal() {
  const raiz = el('span', 'fz-dedal'); raiz.setAttribute('role', 'img'); raiz.hidden = true
  raiz.append(
    svg('svg', { viewBox: '0 0 24 26', 'aria-hidden': 'true', focusable: 'false' }, [
      svg('path', { class: 'fz-dedal__corpo', d: 'M5 21 L6.2 9.5 Q6.6 2.5 12 2.5 Q17.4 2.5 17.8 9.5 L19 21 Z' }),
      svg('path', { class: 'fz-dedal__furos', d: 'M9 8 h.01 M12 7 h.01 M15 8 h.01 M8.4 11.6 h.01 M12 11 h.01 M15.6 11.6 h.01 M8 15.2 h.01 M12 14.8 h.01 M16 15.2 h.01' }),
      svg('path', { class: 'fz-dedal__luz', d: 'M8.2 6.4 Q8.8 4.4 10.6 3.9' }),
      svg('rect', { class: 'fz-dedal__aro', x: 3, y: 19, width: 18, height: 5, rx: 2.2 }),
    ]),
    el('b', 'fz-dedal__numero', '0'),
  )
  let n = 0
  function definir(valor) {
    const novo = Math.max(0, Number(valor) || 0)
    raiz.hidden = novo <= 0
    raiz.querySelector('.fz-dedal__numero').textContent = String(novo)
    raiz.setAttribute('aria-label', `Escudo: ${novo}`)
    if (novo > n) animar(raiz, [{ transform: 'translateY(-10px) scale(1.25)' }, { transform: 'translateY(1px) scale(0.96)', offset: 0.7 }, { transform: 'none' }], { duration: 240, easing: 'ease-out' })
    n = novo
  }
  return { el: raiz, definir }
}

// ------------------------------------------------------------------ alfinetes (estados)

const DESENHO_DO_ALFINETE = {
  'fio-solto': 'M5.6 8.6 q1.5 -3 3 0 t3 0 t3 0', // fio ondulado
  veu: 'M5.4 10.4 Q10 2.6 14.6 10.4', // arco do véu
  'ultimo-fio': 'M10 3.6 V9.4 M10 12 h.01', // um fio só, e a gota
}

function desenhoDoAlfinete(tipo) {
  return svg('svg', { class: 'fz-alfinete', viewBox: '0 0 20 30', 'aria-hidden': 'true', focusable: 'false', 'data-tipo': tipo }, [
    svg('path', { class: 'fz-alfinete__haste', d: 'M10 13 L10 28.5' }),
    svg('circle', { class: 'fz-alfinete__cabeca', cx: 10, cy: 8, r: 7 }),
    svg('path', { class: 'fz-alfinete__sinal', d: DESENHO_DO_ALFINETE[tipo] ?? 'M10 8 h.01' }),
  ])
}

export function criarAlfinetes() {
  const raiz = el('span', 'fz-alfinetes'); raiz.hidden = true
  const botao = el('button', 'fz-alfinetes__botao'); botao.type = 'button'; botao.setAttribute('aria-expanded', 'false')
  const legenda = el('span', 'fz-alfinetes__legenda'); legenda.setAttribute('role', 'tooltip'); legenda.hidden = true
  raiz.append(botao, legenda)
  let relogio = 0

  function fechar() { legenda.hidden = true; botao.setAttribute('aria-expanded', 'false'); clearTimeout(relogio); document.removeEventListener('pointerdown', fora, true); document.removeEventListener('keydown', esc, true) }
  function fora(ev) { if (!raiz.contains(ev.target)) fechar() }
  function esc(ev) { if (ev.key === 'Escape') fechar() }
  function abrir() {
    legenda.hidden = false; botao.setAttribute('aria-expanded', 'true')
    legenda.style.setProperty('--desvio', '0px')
    const r = legenda.getBoundingClientRect(), palco = raiz.closest('[data-palco]')?.getBoundingClientRect() ?? { left: 0, right: window.innerWidth }
    const sobra = Math.max(0, palco.left + 8 - r.left) - Math.max(0, r.right - (palco.right - 8))
    legenda.style.setProperty('--desvio', sobra.toFixed(0) + 'px')
    document.addEventListener('pointerdown', fora, true); document.addEventListener('keydown', esc, true)
    clearTimeout(relogio); relogio = setTimeout(fechar, 5000)
  }
  botao.addEventListener('click', () => (legenda.hidden ? abrir() : fechar()))

  function definir(marcas = []) {
    raiz.hidden = marcas.length === 0
    botao.replaceChildren(...marcas.map((m) => desenhoDoAlfinete(m.tipo)))
    botao.setAttribute('aria-label', 'Estados: ' + marcas.map((m) => m.titulo).join(', ') + '. Toque para ver o que fazem.')
    legenda.replaceChildren(...marcas.map((m) => {
      const li = el('span', 'fz-alfinetes__linha'); const tx = el('span')
      tx.append(el('b', null, m.titulo), m.legenda ? ' ' + m.legenda : '')
      li.append(desenhoDoAlfinete(m.tipo), tx); return li
    }))
    if (!marcas.length) fechar()
  }
  return { el: raiz, definir, fechar }
}

// ------------------------------------------------------------------ placa: fita + dedal + alfinetes de um boneco

export function criarPlaca() {
  const raiz = el('div', 'fz-placa')
  const fita = criarFita(), dedal = criarDedal(), alfinetes = criarAlfinetes()
  const cima = el('span', 'fz-placa__cima'); cima.append(alfinetes.el, dedal.el)
  raiz.append(cima, fita.el)
  function definir({ vida, vidaMax, escudo = 0, marcas = [], alerta = false, caido = false }) {
    fita.definir({ vida, vidaMax, alerta, caido }); dedal.definir(caido ? 0 : escudo); alfinetes.definir(caido ? [] : marcas)
  }
  return { el: raiz, fita, dedal, alfinetes, definir }
}
