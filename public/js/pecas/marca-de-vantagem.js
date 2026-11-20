// Frayz — peça MARCA DE VANTAGEM: etiqueta dourada de roupa (aquelas de papel, presas por um fio) com o bônus.
// O texto ("+25%") vem de quem chama, que lê o número na ponte. A peça só desenha.
//   criarMarcaDeVantagem(texto, { pequena, descricao }) → elemento
import { el, svg } from './base.js'

export function criarMarcaDeVantagem(texto, { pequena = false, descricao } = {}) {
  const m = el('span', 'fz-vantagem' + (pequena ? ' fz-vantagem--pequena' : ''))
  m.setAttribute('role', 'img')
  m.setAttribute('aria-label', descricao ?? `Vantagem de tecido: ${texto}`)
  m.append(
    svg('svg', { class: 'fz-vantagem__fio', viewBox: '0 0 16 14', 'aria-hidden': 'true', focusable: 'false' }, [
      svg('path', { d: 'M8 13 C2 9 2 2 8 2 C14 2 14 9 8 13' }),
    ]),
    el('span', 'fz-vantagem__papel', texto),
  )
  return m
}
