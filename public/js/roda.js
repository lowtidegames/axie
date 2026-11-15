// Frayz — a RODA dos 6 tipos, sempre visível. Cada tecido bate forte no seguinte (seta). A seta ACENDE quando há vantagem.
// A ordem e a regra vêm do motor (TIPOS e vantagem()): aqui só se desenha.
import { TIPOS, vantagem } from './ponte.js'
import { iconeDoTipo } from './bonecos.js'

export class Roda {
  constructor(canvas) { this.cv = canvas; this.c = canvas.getContext('2d'); this.pares = []; this.tipos = new Set(); this.menos = false; this.t0 = performance.now(); this.tam = 0; this.medir() }
  medir() {
    const r = this.cv.getBoundingClientRect(); this.tam = Math.round(r.width) || 64
    const d = Math.min(2, window.devicePixelRatio || 1)
    this.cv.width = Math.round(this.tam * d); this.cv.height = Math.round(this.tam * d); this.d = d
    this.desenhar()
  }
  /** pares: lista de [tipoDaCarta, tipoDoAlvo] que têm vantagem agora. destaque: tipos a circular. */
  definir(pares, destaque = []) {
    this.pares = pares.filter(([a, b]) => vantagem(a, b)); this.tipos = new Set(destaque); this.desenhar()
  }
  get acesa() { return this.pares.length > 0 }
  desenhar() {
    const c = this.c, S = this.tam, d = this.d
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, S, S)
    const cx = S / 2, cy = S / 2, R = S * 0.355, r = S * 0.135
    c.fillStyle = 'rgba(20,8,30,0.82)'; c.beginPath(); c.arc(cx, cy, S / 2 - 1, 0, 6.3); c.fill()
    c.strokeStyle = this.acesa ? '#ffd23a' : 'rgba(233,225,200,0.4)'; c.lineWidth = this.acesa ? 2.4 : 1.6; c.setLineDash([4, 3]); c.beginPath(); c.arc(cx, cy, S / 2 - 2, 0, 6.3); c.stroke(); c.setLineDash([])
    const n = TIPOS.length, ang = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2
    const pos = (i) => [cx + Math.cos(ang(i)) * R, cy + Math.sin(ang(i)) * R]
    for (let i = 0; i < n; i++) { // setas i → i+1 (curvas ao longo do anel)
      const j = (i + 1) % n, ativa = this.pares.some(([a, b]) => a === TIPOS[i] && b === TIPOS[j])
      const a0 = ang(i) + 0.42, a1 = ang(j) - 0.42
      c.strokeStyle = ativa ? '#ffd23a' : 'rgba(233,225,200,0.5)'; c.fillStyle = c.strokeStyle; c.lineWidth = ativa ? 3.2 : 1.8; c.lineCap = 'round'
      c.beginPath(); c.arc(cx, cy, R, a0, a1); c.stroke()
      const ex = cx + Math.cos(a1) * R, ey = cy + Math.sin(a1) * R, tg = a1 + Math.PI / 2, h = ativa ? 5.4 : 3.8
      c.beginPath(); c.moveTo(ex + Math.cos(tg) * h, ey + Math.sin(tg) * h); c.lineTo(ex + Math.cos(a1) * h * 0.9 - Math.cos(tg) * 0.1, ey + Math.sin(a1) * h * 0.9); c.lineTo(ex + Math.cos(a1 + Math.PI) * h * 0.9, ey + Math.sin(a1 + Math.PI) * h * 0.9); c.closePath(); c.fill()
    }
    for (let i = 0; i < n; i++) {
      const [x, y] = pos(i), dest = this.tipos.has(TIPOS[i]), sz = r * 2
      c.drawImage(iconeDoTipo(TIPOS[i], Math.round(sz * d)), x - r, y - r, sz, sz)
      if (dest) { c.strokeStyle = '#ffd23a'; c.lineWidth = 2.4; c.beginPath(); c.arc(x, y, r + 2, 0, 6.3); c.stroke() }
    }
  }
}
