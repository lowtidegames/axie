// Frayz — peça NÚMERO DE DANO: o número que salta do boneco (guia §3: 28 a 64 px conforme o golpe).
// Crítico em cor de chama (com estouro de enchimento atrás), cura em verde, escudo em azul. Não é só cor:
// dano leva "−", cura leva "+", crítico leva "!" e o estouro. O valor e a força do golpe vêm de quem chama.
//
//   soltarNumero(container, { valor, x, y, tipo: 'dano' | 'critico' | 'cura' | 'escudo' | 'texto', forca: 0–1, texto }) → Promise
//     x, y: ponto dentro do container (que precisa ter position); forca: tamanho do golpe de 0 a 1 (quem chama decide)
//     fixo: true deixa o número parado (para a folha de conferência)
import { animar, el, esperar, menosAnimacao, svg } from './base.js'

const ROTULO = { dano: 'Dano', critico: 'Golpe crítico', cura: 'Cura', escudo: 'Escudo', texto: '' }

export async function soltarNumero(container, { valor, x = 0, y = 0, tipo = 'dano', forca = 0.3, texto, fixo = false } = {}) {
  const f = Math.max(0, Math.min(1, Number(forca) || 0))
  const tamanho = Math.round(28 + 36 * f) + (tipo === 'critico' ? 4 : 0) // 28–64 px (+4 no crítico)
  const n = el('span', `fz-numero fz-numero--${tipo}`)
  n.style.left = x + 'px'; n.style.top = y + 'px'; n.style.fontSize = Math.min(68, tamanho) + 'px'
  const escrito = texto ?? (tipo === 'cura' || tipo === 'escudo' ? `+${valor}` : tipo === 'critico' ? `−${valor}!` : `−${valor}`)
  n.setAttribute('role', 'img'); n.setAttribute('aria-label', `${ROTULO[tipo] ?? ''} ${valor ?? texto ?? ''}`.trim())
  if (tipo === 'critico') { // estouro da costura: raios curtos de enchimento atrás do número
    const raios = []
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.2; raios.push(`M${(50 + Math.cos(a) * 26).toFixed(1)} ${(50 + Math.sin(a) * 20).toFixed(1)} L${(50 + Math.cos(a) * 46).toFixed(1)} ${(50 + Math.sin(a) * 36).toFixed(1)}`) }
    n.append(svg('svg', { class: 'fz-numero__estouro', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' }, [svg('path', { d: raios.join(' ') })]))
  }
  n.append(el('span', 'fz-numero__texto', escrito))
  container.append(n)
  if (fixo) return n
  if (menosAnimacao()) { // sem salto: aparece, fica e esmaece
    await n.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 100, fill: 'both' }).finished.catch(() => {})
    await esperar(650)
    await n.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'both' }).finished.catch(() => {})
  } else {
    const sobe = 26 + 24 * f, giro = tipo === 'critico' ? -6 : 0
    await animar(n, [
      { transform: `translate(-50%, -50%) scale(${(1.5 + f * 0.5).toFixed(2)}) rotate(${giro}deg)`, opacity: 0, offset: 0 },
      { transform: `translate(-50%, -50%) scale(1) rotate(${giro}deg)`, opacity: 1, offset: 0.14 },
      { transform: `translate(-50%, calc(-50% - ${(sobe * 0.5).toFixed(0)}px)) scale(1) rotate(0deg)`, opacity: 1, offset: 0.7 },
      { transform: `translate(-50%, calc(-50% - ${sobe.toFixed(0)}px)) scale(0.92)`, opacity: 0, offset: 1 },
    ], { duration: 900, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' })
  }
  n.remove()
}
