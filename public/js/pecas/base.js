// Frayz — ferramentas pequenas que TODAS as peças usam. Nenhuma regra, nenhum número de jogo.
// Aqui moram: criar elemento, criar SVG, "Menos animação", densidade do canvas, o pesponto (costura tracejada)
// e o desenho do carretel (usado no custo da carta e na Linha).

export const SVG_NS = 'http://www.w3.org/2000/svg'

/** Elemento HTML com classe e texto (o texto nunca vira HTML). */
export function el(tag, classe, texto) {
  const e = document.createElement(tag)
  if (classe) e.className = classe
  if (texto != null) e.textContent = String(texto)
  return e
}

/** Elemento SVG com atributos e filhos. */
export function svg(tag, attrs = {}, filhos = []) {
  const e = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, String(v))
  for (const f of filhos) if (f) e.append(f)
  return e
}

/** "Menos animação": classe no body, data-menos="1" no html (o app de hoje) ou a preferência do aparelho. */
export function menosAnimacao() {
  try {
    if (document.body?.classList.contains('menos-animacao')) return true
    if (document.documentElement.dataset.menos === '1') return true
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { return false }
}

/** Densidade do canvas: até 2× (guia §4: nunca borrado, nunca mais que 2×). */
export const densidade = () => Math.min(2, Math.max(1, window.devicePixelRatio || 1))

/** Canvas com tamanho de tela (CSS) e pixels na densidade certa. `folga` > 1 guarda nitidez para quando a peça cresce. */
export function tela(largura, altura, folga = 1) {
  const d = densidade() * folga
  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round(largura * d)); cv.height = Math.max(1, Math.round(altura * d))
  const c = cv.getContext('2d'); c.scale(cv.width / largura, cv.height / altura)
  return { cv, c, d }
}

/** Formato da peça: o antepassado com data-formato decide; sem ele, o tamanho da janela. */
export function formatoDe(elemento) {
  const f = elemento?.closest?.('[data-formato]')?.dataset.formato
  if (f === 'pc' || f === 'celular') return f
  return window.innerWidth >= 700 && window.innerWidth / window.innerHeight >= 1.1 ? 'pc' : 'celular'
}

/** Anima com a Web Animations API. Com "Menos animação" não anima: devolve uma promessa já cumprida. */
export function animar(elemento, quadros, opcoes) {
  if (menosAnimacao() || !elemento.animate) return Promise.resolve()
  try { return elemento.animate(quadros, opcoes).finished.catch(() => {}) } catch { return Promise.resolve() }
}

export const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms))

/** Número pseudoaleatório fixo por semente (para desenhos irregulares que não mudam a cada quadro). */
export function sorte(semente) {
  let s = (semente | 0) || 1
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export function semear(texto) { let h = 7; for (let i = 0; i < String(texto).length; i++) h = (Math.imul(h, 31) + String(texto).charCodeAt(i)) | 0; return h }

/**
 * PESPONTO: a costura tracejada que acompanha a borda por dentro de qualquer peça (botão, etiqueta, painel).
 * É um SVG que ocupa a caixa do pai menos o `recuo`; o traço não deforma em nenhum tamanho.
 */
export function pesponto({ recuo = 4, raio = 8, classe = '' } = {}) {
  const s = svg('svg', { class: ('fz-pesponto ' + classe).trim(), 'aria-hidden': 'true', focusable: 'false' })
  s.style.inset = recuo + 'px'
  s.style.width = `calc(100% - ${recuo * 2}px)`; s.style.height = `calc(100% - ${recuo * 2}px)`
  s.append(svg('rect', { x: 0, y: 0, width: '100%', height: '100%', rx: raio, ry: raio }))
  return s
}

/**
 * CARRETEL de linha visto de lado (viewBox 30×36). Cheio: barriga de linha brilhante. Vazio: só o miolo fino.
 * Quem decide cheio/vazio é a classe `fz-carretel--cheio` no pai (CSS).
 */
export function carretelSvg() {
  const s = svg('svg', { class: 'fz-carretel__svg', viewBox: '0 0 30 36', 'aria-hidden': 'true', focusable: 'false' })
  s.append(
    svg('rect', { class: 'fz-carretel__oco', x: 5, y: 9, width: 20, height: 18 }),
    svg('rect', { class: 'fz-carretel__miolo', x: 11.5, y: 8, width: 7, height: 20 }),
    svg('g', { class: 'fz-carretel__linha' }, [
      svg('path', { class: 'fz-carretel__barriga', d: 'M5.5 9.5 Q3.4 18 5.5 26.5 L24.5 26.5 Q26.6 18 24.5 9.5 Z' }),
      svg('path', { class: 'fz-carretel__voltas', d: 'M5 13.4 L25 11.6 M4.6 17.4 L25.4 15.6 M4.6 21.4 L25.4 19.6 M5 25.2 L25 23.6' }),
      svg('path', { class: 'fz-carretel__brilho', d: 'M8.2 11.5 Q7 18 8.2 24.5' }),
    ]),
    svg('rect', { class: 'fz-carretel__aba', x: 2, y: 2, width: 26, height: 7.5, rx: 3 }),
    svg('rect', { class: 'fz-carretel__aba', x: 2, y: 26.5, width: 26, height: 7.5, rx: 3 }),
    svg('path', { class: 'fz-carretel__veio', d: 'M5.5 4.6 L24.5 4.6 M5.5 29.1 L24.5 29.1' }),
  )
  return s
}
