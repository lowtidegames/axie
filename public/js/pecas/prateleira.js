// Frayz — peça PRATELEIRA: os bonecos de pé em tábuas de madeira, cada um com o nome numa etiqueta pendurada (guia §8,
// "Escolher time: os bonecos numa prateleira"). A mesma peça serve à Luta livre, à Aventura, aos Bonecos e à Costura.
// Sem regra: quem chama diz quem está escolhido, quem está apagado e o que acontece ao tocar.
//
//   const p = criarPrateleira(container, itens, opcoes)
//     itens   = [{ id, nome, desenho: () => <canvas>, desligado, motivo, sub }]   (sub: linha pequena embaixo do nome)
//     opcoes  = { porTabua: 5, nomes: true, classe: 'ficha' (classe extra em cada botão), aoTocar: (id) => {}, rotulo }
//   p.marcar({ escolhidos: [ids na ordem], aberto: id })   número de ordem no ombro, brilho dourado e a etiqueta do aberto acesa
//   p.botoes   { id: <button> }
import { el } from './base.js'

export function criarPrateleira(container, itens, { porTabua = 5, nomes = true, classe = '', aoTocar, rotulo } = {}) {
  container.replaceChildren()
  container.classList.add('fz-prateleira')
  container.dataset.nomes = nomes ? '1' : '0'
  container.dataset.sub = itens.some((it) => it.sub) ? '1' : '0'
  if (rotulo) container.setAttribute('aria-label', rotulo)
  container.setAttribute('role', 'list')
  const botoes = {}
  for (let i = 0; i < itens.length; i += porTabua) {
    const tabua = el('div', 'fz-time__tabua')
    tabua.style.setProperty('--fz-por-tabua', String(porTabua))
    for (const it of itens.slice(i, i + porTabua)) {
      const b = el('button', ('fz-time__boneco ' + classe).trim()); b.type = 'button'; b.dataset.id = it.id
      b.setAttribute('role', 'listitem'); b.setAttribute('aria-label', it.nome)
      const cv = it.desenho(); cv.classList.add('fz-boneco')
      const ordem = el('span', 'fz-time__ordem')
      const nome = el('span', 'fz-time__nome'); const etq = el('span', null, it.nome); nome.append(etq)
      if (it.sub) etq.append(el('small', 'fz-time__sub', it.sub))
      b.append(cv, ordem, nome)
      if (it.desligado) { b.disabled = true; b.classList.add('apagado'); if (it.motivo) b.title = it.motivo }
      if (aoTocar) b.addEventListener('click', () => aoTocar(it.id))
      botoes[it.id] = b; tabua.append(b)
    }
    container.append(tabua)
  }
  function marcar({ escolhidos = [], aberto = null } = {}) {
    for (const [id, b] of Object.entries(botoes)) {
      const i = escolhidos.indexOf(id)
      b.setAttribute('aria-pressed', String(i >= 0)); b.classList.toggle('on', i >= 0)
      b.classList.toggle('fz-time__boneco--aberto', id === aberto)
      b.querySelector('.fz-time__ordem').textContent = i >= 0 ? String(i + 1) : ''
    }
  }
  return { el: container, botoes, marcar }
}
