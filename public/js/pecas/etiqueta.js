// Frayz — peça ETIQUETA: aviso curto como etiqueta de roupa presa com alfinete (guia §1).
// Fila: no máximo `maximo` na tela; as outras esperam. Some sozinha; um toque tira antes. Leitor de tela: aria-live.
// O tipo não é só a cor do alfinete: cada um tem um sinal (✕ recusa · ✓ bom · ! alerta).
//
//   const etiquetas = criarEtiquetas(container, { maximo = 2, duracao = 2400 })
//   etiquetas.avisar(texto, { tipo: 'aviso' | 'recusa' | 'bom' | 'alerta', duracao }) · etiquetas.limpar() · etiquetas.el
import { animar, el, menosAnimacao, pesponto, svg } from './base.js'

const SINAL = { aviso: 'M10 8 h.01', recusa: 'M7.4 5.4 l5.2 5.2 M12.6 5.4 l-5.2 5.2', bom: 'M6.6 8.2 l2.4 2.6 l4.4 -5', alerta: 'M10 4.6 v4.4 M10 11.6 h.01' }

export function criarEtiquetas(container, { maximo = 2, duracao = 2400 } = {}) {
  const raiz = el('div', 'fz-etiquetas'); raiz.setAttribute('role', 'status'); raiz.setAttribute('aria-live', 'polite'); raiz.setAttribute('aria-atomic', 'false')
  container.append(raiz)
  const fila = [], naTela = new Set()

  function proxima() {
    while (naTela.size < maximo && fila.length) mostrar(fila.shift())
  }

  function mostrar({ texto, tipo, tempo }) {
    const e = el('button', `fz-etiqueta fz-etiqueta--${tipo}`); e.type = 'button'; e.setAttribute('aria-label', texto + ' (toque para fechar)')
    e.append(
      svg('svg', { class: 'fz-etiqueta__alfinete', viewBox: '0 0 20 30', 'aria-hidden': 'true', focusable: 'false' }, [
        svg('path', { class: 'fz-alfinete__haste', d: 'M10 13 L10 28.5' }),
        svg('circle', { class: 'fz-alfinete__cabeca', cx: 10, cy: 8, r: 7 }),
        svg('path', { class: 'fz-alfinete__sinal', d: SINAL[tipo] ?? SINAL.aviso }),
      ]),
      pesponto({ recuo: 3, raio: 4 }),
      el('span', 'fz-etiqueta__texto', texto),
    )
    raiz.append(e); naTela.add(e)
    let saiu = false
    const sair = async () => {
      if (saiu) return; saiu = true; clearTimeout(relogio)
      if (menosAnimacao()) await e.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }).finished.catch(() => {})
      else await animar(e, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-10px) rotate(-3deg)', opacity: 0 }], { duration: 180, easing: 'ease-in', fill: 'forwards' })
      e.remove(); naTela.delete(e); proxima()
    }
    const relogio = setTimeout(sair, tempo)
    e.addEventListener('click', sair)
    // entra balançando no alfinete (pêndulo curto)
    animar(e, [{ transform: 'translateY(-14px) rotate(-9deg)', opacity: 0 }, { transform: 'translateY(0) rotate(4deg)', opacity: 1, offset: 0.55 }, { transform: 'rotate(-2deg)', offset: 0.8 }, { transform: 'none' }], { duration: 320, easing: 'ease-out' })
  }

  return {
    el: raiz,
    avisar(texto, { tipo = 'aviso', duracao: tempo = duracao } = {}) {
      if (!texto) return
      // a mesma frase já na tela ou na fila não entra de novo
      if ([...naTela].some((e) => e.querySelector('.fz-etiqueta__texto')?.textContent === texto) || fila.some((f) => f.texto === texto)) return
      fila.push({ texto: String(texto), tipo, tempo }); proxima()
    },
    limpar() { fila.length = 0; for (const e of naTela) e.remove(); naTela.clear() },
  }
}
