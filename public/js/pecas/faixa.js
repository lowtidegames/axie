// Frayz — peça FAIXA DE VEZ: uma faixa bordada (fita de cetim) atravessa a cena por 700 ms (guia §6).
// "Sua vez" entra pela esquerda com a luz quente da vela; "Vez do rival" entra pela direita com a luz fria da lua.
// A diferença não é só a cor: muda o texto, o lado de onde vem e o bordado (chama × lua).
//
//   mostrarFaixa(container, { texto, lado: 'eu' | 'rival' | 'aviso', duracao = 700, fixa }) → Promise (cumpre quando a faixa saiu)
//     fixa: true deixa a faixa parada na tela (para a folha de conferência); a promessa devolve o elemento
import { animar, el, esperar, menosAnimacao, svg } from './base.js'

const BORDADO = {
  eu: () => svg('svg', { class: 'fz-faixa__bordado', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [
    // chama da vela: gota torta com a língua de dentro vazada, e o pavio
    svg('path', { 'fill-rule': 'evenodd', d: 'M13 1.5 C13.4 5.4 18.6 8 18.6 13.4 A6.6 6.6 0 0 1 5.4 13.4 C5.4 10.2 7.6 8.6 8.6 6 C9.8 7 10.4 8 10.6 9.2 C11.8 7 12.8 4.6 13 1.5 Z M12.2 12 C13.6 13.4 14.6 14.6 14.6 16 A2.6 2.6 0 0 1 9.4 16 C9.4 14.4 11.4 13.8 12.2 12 Z' }),
    svg('path', { class: 'fz-faixa__bordado-fio', d: 'M12 20.4 V23' }),
  ]),
  rival: () => svg('svg', { class: 'fz-faixa__bordado', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('path', { d: 'M15.5 3 A9.2 9.2 0 1 0 21 15.6 A7.4 7.4 0 0 1 15.5 3 Z' }),
  ]),
  aviso: () => svg('svg', { class: 'fz-faixa__bordado', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('path', { d: 'M4 12 h16 M12 4 v16 M6.4 6.4 l11.2 11.2 M17.6 6.4 L6.4 17.6', class: 'fz-faixa__bordado-fio' }),
  ]),
}

export async function mostrarFaixa(container, { texto, lado = 'eu', duracao = 700, fixa = false } = {}) {
  for (const velha of container.querySelectorAll(':scope > .fz-faixa')) velha.remove()
  const faixa = el('div', `fz-faixa fz-faixa--${lado}`); faixa.setAttribute('role', 'status'); faixa.setAttribute('aria-live', 'polite')
  const pano = el('span', 'fz-faixa__pano')
  const desenho = BORDADO[lado] ?? BORDADO.aviso
  pano.append(desenho(), el('span', 'fz-faixa__texto', texto), desenho())
  faixa.append(pano)
  container.append(faixa)
  if (fixa) return faixa
  const entra = Math.min(170, duracao * 0.25), fica = Math.max(0, duracao - entra * 2)
  if (menosAnimacao()) { // troca por esmaecer, sem deslizar
    await faixa.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 120, fill: 'both' }).finished.catch(() => {})
    await esperar(Math.max(0, duracao - 240))
    await faixa.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'both' }).finished.catch(() => {})
  } else {
    const de = lado === 'rival' ? '104%' : '-104%', para = lado === 'rival' ? '-104%' : '104%'
    await animar(pano, [{ transform: `translateX(${de}) skewX(-8deg)` }, { transform: 'translateX(0) skewX(0deg)' }], { duration: entra, easing: 'cubic-bezier(.2,.9,.3,1.15)', fill: 'both' })
    await esperar(fica)
    await animar(pano, [{ transform: 'translateX(0)' }, { transform: `translateX(${para}) skewX(8deg)` }], { duration: entra, easing: 'cubic-bezier(.6,0,.9,.4)', fill: 'both' })
  }
  faixa.remove()
}
