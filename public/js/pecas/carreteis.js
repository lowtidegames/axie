// Frayz — peça CARRETÉIS: a Linha (energia) em carretéis que se enchem de linha brilhante (guia §1).
// Quantos carretéis existem e quantos estão cheios vêm de quem chama (ponte). Cheio e vazio diferem na FORMA
// (barriga de linha × miolo fino), não só na cor.
//
//   criarCarreteis({ maximo, rotulo, compacto }) → { el, definir(quantos) }
//        ganhar: os carretéis enchem um a um; gastar: a linha se solta e voa
//   criarContador({ icone: 'mao' | 'baralho', rotulo }) → { el, definir(numero) }
//        contador com ícone (cartas na mão do rival, cartas no baralho)
import { animar, carretelSvg, el, svg } from './base.js'

export function criarCarreteis({ maximo = 7, rotulo = 'Linha', compacto = false } = {}) {
  const raiz = el('div', 'fz-carreteis' + (compacto ? ' fz-carreteis--compacto' : '')); raiz.setAttribute('role', 'img')
  const fila = el('span', 'fz-carreteis__fila')
  const lista = []
  for (let i = 0; i < maximo; i++) { const c = el('span', 'fz-carretel'); c.append(carretelSvg()); fila.append(c); lista.push(c) }
  const numero = el('b', 'fz-carreteis__numero', '0')
  raiz.append(el('span', 'fz-carreteis__rotulo', rotulo), fila, numero)
  let n = null

  function definir(quantos) {
    const novo = Math.max(0, Math.min(maximo, Number(quantos) || 0)), antes = n
    numero.textContent = String(novo)
    raiz.setAttribute('aria-label', `${rotulo}: ${novo} de ${maximo}`)
    lista.forEach((c, i) => {
      const cheio = i < novo
      // escalonado: ao ganhar enche da esquerda para a direita; ao gastar esvazia da direita para a esquerda
      const ordem = antes == null ? 0 : novo > antes ? Math.max(0, i - antes) : Math.max(0, antes - 1 - i)
      c.style.setProperty('--atraso', ordem * 70 + 'ms')
      if (antes != null && !cheio && c.classList.contains('fz-carretel--cheio')) soltar(c, ordem * 70)
      c.classList.toggle('fz-carretel--cheio', cheio)
    })
    if (antes != null && novo !== antes) animar(numero, [{ transform: 'scale(1.35)' }, { transform: 'none' }], { duration: 220, easing: 'ease-out' })
    n = novo
  }

  function soltar(c, atraso) { // o fio que escapa quando a Linha é gasta
    const fio = el('i', 'fz-carretel__fio-solto'); c.append(fio)
    animar(fio, [{ transform: 'translate(-50%, 0) rotate(-20deg) scaleX(0.4)', opacity: 0.9 }, { transform: 'translate(40%, -150%) rotate(30deg) scaleX(1.3)', opacity: 0 }], { duration: 300, delay: atraso, easing: 'ease-out', fill: 'both' }).then(() => fio.remove())
  }
  return { el: raiz, definir }
}

const ICONES = {
  // leque de três cartas de costas
  mao: () => svg('svg', { viewBox: '0 0 30 24', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('rect', { class: 'fz-contador__carta', x: 3, y: 5, width: 11, height: 15, rx: 2.4, transform: 'rotate(-16 8.5 20)' }),
    svg('rect', { class: 'fz-contador__carta', x: 9.5, y: 3.4, width: 11, height: 15, rx: 2.4 }),
    svg('rect', { class: 'fz-contador__carta', x: 16, y: 5, width: 11, height: 15, rx: 2.4, transform: 'rotate(16 21.5 20)' }),
    svg('path', { class: 'fz-contador__x', d: 'M12.6 8.4 l4.8 5 M17.4 8.4 l-4.8 5' }),
  ]),
  // pilha de cartas
  baralho: () => svg('svg', { viewBox: '0 0 30 24', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('rect', { class: 'fz-contador__carta', x: 10.5, y: 7.6, width: 13, height: 15, rx: 2.4 }),
    svg('rect', { class: 'fz-contador__carta', x: 8.5, y: 5, width: 13, height: 15, rx: 2.4 }),
    svg('rect', { class: 'fz-contador__carta', x: 6.5, y: 2.4, width: 13, height: 15, rx: 2.4 }),
    svg('path', { class: 'fz-contador__x', d: 'M10.4 7 l5.2 5.6 M15.6 7 l-5.2 5.6' }),
  ]),
}

export function criarContador({ icone = 'mao', rotulo = '' } = {}) {
  const raiz = el('span', 'fz-contador'); raiz.setAttribute('role', 'img'); raiz.dataset.icone = icone
  const numero = el('b', 'fz-contador__numero', '0')
  raiz.append((ICONES[icone] ?? ICONES.mao)(), numero)
  let n = null
  function definir(valor) {
    numero.textContent = String(valor)
    raiz.setAttribute('aria-label', `${rotulo}: ${valor}`); raiz.title = `${rotulo}: ${valor}`
    if (n != null && valor !== n) animar(numero, [{ transform: 'scale(1.3)' }, { transform: 'none' }], { duration: 200, easing: 'ease-out' })
    n = valor
  }
  return { el: raiz, definir }
}
