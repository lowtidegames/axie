// Frayz — peça BOTÃO-RETALHO: um pedaço de pano costurado na mesa, com pesponto na borda (guia §1).
//   criarBotao({ rotulo, variante, detalhe, atalho, desligado, aoClicar, icone }) → <button>
//     variante: 'principal' (fio da maldição) | 'secundario' (pano claro) | 'perigo'
//     detalhe:  linha pequena embaixo do rótulo (ex.: o custo, que quem chama leu na ponte)
//     atalho:   nome da tecla; aparece só no PC, numa etiqueta de tecla
//   atualizarBotao(botao, { rotulo, detalhe, desligado, aceso })
// Desligado não é só cor: o retalho fica chato (sem sombra) e com a costura frouxa.
import { el, pesponto } from './base.js'

export function criarBotao({ rotulo, variante = 'secundario', detalhe, atalho, desligado = false, aoClicar, icone } = {}) {
  const b = el('button', `fz-botao fz-botao--${variante}`); b.type = 'button'
  const miolo = el('span', 'fz-botao__miolo')
  if (icone) { icone.classList.add('fz-botao__icone'); miolo.append(icone) }
  const textos = el('span', 'fz-botao__textos')
  textos.append(el('span', 'fz-botao__rotulo', rotulo ?? ''))
  const det = el('span', 'fz-botao__detalhe', detalhe ?? ''); det.hidden = !detalhe; textos.append(det)
  miolo.append(textos)
  if (atalho) { const k = el('kbd', 'fz-botao__tecla', atalho); k.setAttribute('aria-hidden', 'true'); miolo.append(k); b.setAttribute('aria-keyshortcuts', atalho) }
  b.append(pesponto({ recuo: 4, raio: 9 }), miolo)
  b.disabled = !!desligado
  if (aoClicar) b.addEventListener('click', aoClicar)
  return b
}

export function atualizarBotao(b, { rotulo, detalhe, desligado, aceso } = {}) {
  if (rotulo != null) b.querySelector('.fz-botao__rotulo').textContent = rotulo
  if (detalhe !== undefined) { const d = b.querySelector('.fz-botao__detalhe'); d.textContent = detalhe ?? ''; d.hidden = !detalhe }
  if (desligado != null) b.disabled = !!desligado
  if (aceso != null) { b.classList.toggle('fz-botao--aceso', !!aceso); b.setAttribute('aria-pressed', String(!!aceso)) }
  return b
}
