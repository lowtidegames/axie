// Frayz — peça FIO DO TEMPO: o tempo do turno é um fio que queima da ponta até o nó (guia §1).
// Nos últimos segundos a brasa solta faíscas pequenas (sem flash). Quanto tempo dura e quando começa o alerta
// vêm de quem chama (a ponte diz os segundos do turno). Com "Menos animação": sem faísca e sem tremor da brasa;
// o fio só encurta, segundo a segundo.
//
//   criarFioDoTempo({ total, alerta, rotulo }) → fio
//   fio.iniciar(restante = total) · fio.parar() · fio.definir(restante) · fio.aoAcabar(fn) · fio.el
import { animar, el, menosAnimacao, svg } from './base.js'

const ONDA = (t) => 10 + Math.sin(t * Math.PI * 5) * 2.6 // altura do fio (0–20) ao longo do comprimento (0–1)
function caminho() { let d = ''; for (let i = 0; i <= 60; i++) { const t = i / 60; d += `${i ? 'L' : 'M'}${(t * 200).toFixed(1)} ${ONDA(t).toFixed(2)}` } return d }

export function criarFioDoTempo({ total = 20, alerta = 5, rotulo = 'Tempo do turno' } = {}) {
  const raiz = el('div', 'fz-fio-tempo'); raiz.setAttribute('role', 'timer')
  const seg = el('b', 'fz-fio-tempo__seg', String(total))
  // o nó: uma bola de fio apertado, com a ponta que sobrou caindo para trás
  const ponta = 'M7.6 12.4 C5.4 13.6 5.6 16.4 3 17.4 M13 10 H19'
  const no = svg('svg', { class: 'fz-fio-tempo__no', viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('path', { class: 'fz-fio-tempo__no-borda', d: ponta }),
    svg('path', { class: 'fz-fio-tempo__no-fio', d: ponta }),
    svg('ellipse', { class: 'fz-fio-tempo__no-bola', cx: 10, cy: 9.6, rx: 5.6, ry: 5.2 }),
    svg('path', { class: 'fz-fio-tempo__no-volta', d: 'M7 6.2 Q10.4 9.4 7.2 13.2 M10.6 5 Q14 9.4 10.8 14.2 M13.6 6.4 Q15.4 9.6 13.6 12.8' }),
  ])
  const pista = el('span', 'fz-fio-tempo__pista')
  const d = caminho()
  const cinza = svg('svg', { class: 'fz-fio-tempo__cinza', viewBox: '0 0 200 20', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' }, [svg('path', { d })])
  const corte = el('span', 'fz-fio-tempo__corte')
  const fio = svg('svg', { class: 'fz-fio-tempo__fio', viewBox: '0 0 200 20', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' }, [svg('path', { class: 'fz-fio-tempo__fio-borda', d }), svg('path', { class: 'fz-fio-tempo__fio-linha', d }), svg('path', { class: 'fz-fio-tempo__fio-torcido', d })])
  corte.append(fio)
  const brasa = el('span', 'fz-fio-tempo__brasa')
  pista.append(cinza, corte, brasa)
  raiz.append(seg, no, pista)

  let fim = 0, quadro = 0, rodando = false, ouvinte = null, ultimoSeg = -1, ultimaFaisca = 0, faiscas = 0

  function pintar(restante) {
    const r = Math.max(0, Math.min(total, restante)), fr = total > 0 ? r / total : 0
    const visto = menosAnimacao() ? Math.ceil(r) / total : fr // com "Menos animação" o fio encurta em degraus
    raiz.style.setProperty('--resta', visto.toFixed(4))
    brasa.style.top = (ONDA(visto) / 20) * 100 + '%'
    const s = Math.ceil(r)
    if (s !== ultimoSeg) {
      ultimoSeg = s; seg.textContent = String(s)
      raiz.setAttribute('aria-label', `${rotulo}: ${s} segundos`)
      raiz.classList.toggle('fz-fio-tempo--alerta', r > 0 && r <= alerta)
      raiz.classList.toggle('fz-fio-tempo--acabou', r <= 0)
    }
  }

  function faisca(agora) { // faísca pequena: um pontinho que salta da brasa e some (no máximo 4 no ar)
    if (menosAnimacao() || faiscas >= 4 || agora - ultimaFaisca < 240) return
    ultimaFaisca = agora; faiscas++
    const f = el('i', 'fz-fio-tempo__faisca'); brasa.append(f)
    const dx = 6 + Math.random() * 14, dy = -(8 + Math.random() * 12)
    animar(f, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(0.3)`, opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).then(() => { f.remove(); faiscas-- })
  }

  function passo(agora) {
    if (!rodando) return
    const restante = (fim - agora) / 1000
    pintar(restante)
    if (restante > 0 && restante <= alerta) faisca(agora)
    if (restante <= 0) { rodando = false; ouvinte?.(); return }
    quadro = requestAnimationFrame(passo)
  }

  pintar(total)
  return {
    el: raiz,
    iniciar(restante = total) { cancelAnimationFrame(quadro); fim = performance.now() + restante * 1000; rodando = true; ultimoSeg = -1; quadro = requestAnimationFrame(passo) },
    parar() { rodando = false; cancelAnimationFrame(quadro) },
    definir(restante) { rodando = false; cancelAnimationFrame(quadro); ultimoSeg = -1; pintar(restante) },
    aoAcabar(fn) { ouvinte = fn },
  }
}
