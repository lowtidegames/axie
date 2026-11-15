// Frayz — a ARENA (canvas): os dois times 3×3, vida, marcadores e as animações dos eventos do motor.
// Esta camada só MOSTRA: recebe a visão do motor (estado visível) e a lista de `eventos` e anima. Nada de regra aqui.
// "Menos animação": sem tremida, sem estrela de impacto, sem partículas, sem balanço; só números que aparecem e somem.
import { NOMES_DOS_TIPOS, REGRAS, BONUS_DE_TIPO } from './ponte.js'
import { SH, SW, FIOS, iconeDoTipo, spriteDoBoneco } from './bonecos.js'

const FONTE = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif'
const NOMES_LUGAR = ['FRENTE', 'MEIO', 'TRÁS']
const DUR = { dano: 420, errou: 520, escudo: 380, cura: 380, caiu: 650, ultimoFio: 760, move: 480, troca: 480, fioSolto: 380, veu: 380, quebraEscudo: 380, autoDano: 340, fiapo: 260 }
const MAX_PARTICULAS = 90
const limita = (v, a, b) => Math.max(a, Math.min(b, v))

export class Arena {
  constructor(canvas) {
    this.cv = canvas
    this.c = canvas.getContext('2d')
    this.menos = false
    this.vel = 1 // 1 = normal; o teste usa menos para correr
    this.vista = null
    this.D = {} // visual de cada boneco (posição suavizada, vida mostrada, estado mostrado)
    this.lug = { A: [], B: [] }
    this.fx = []
    this.part = []
    this.agenda = []
    this.destaque = { alvos: new Set(), usuario: null, vantagem: new Set(), cor: 'alvo', trocaDe: null }
    this.sujo = true
    this.flashes = []
    this.logFlash = [] // só para o teste conferir o limite de 3 por segundo
    this.picoPart = 0
    this.W = 0; this.H = 0; this.dpr = 1
    this.geo = null
    this.eventosVistos = { critico: 0, dano: 0 }
    this.ro = new ResizeObserver(() => this.medir())
    this.ro.observe(canvas)
    this.medir()
    this.raf = requestAnimationFrame((t) => this.quadro(t))
  }

  // ------------------------------------------------------------------ tamanho e posições

  medir() {
    const r = this.cv.getBoundingClientRect()
    this.W = Math.max(1, Math.round(r.width)); this.H = Math.max(1, Math.round(r.height))
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr)
    this.geo = this.layout()
    this.sujo = true
    for (const id of Object.keys(this.D)) { const p = this.posAlvo(id); if (p) { this.D[id].x = p.x; this.D[id].y = p.y } }
  }

  /** Posição de cada lugar (pés do boneco) e escala do desenho. Retrato: um time em cima, outro embaixo. Paisagem: lado a lado. */
  layout() {
    const W = this.W, H = this.H, paisagem = W / H > 1.15
    const abaixo = 56 // espaço sob os pés: nome do lugar, barra de vida, marcadores
    const slots = { A: [], B: [] }
    let esc
    const banda = paisagem ? 0 : 58 // faixa do meio (Linha, mão e roda de tipos) no celular em pé
    if (!paisagem) {
      const rowH = (H - banda) / 2, cw = W / 3
      esc = limita(Math.min((cw - 4) / 142, (rowH - abaixo - 22) / 218), 0.3, 1.2)
      for (let i = 0; i < 3; i++) {
        const cx = cw * (i + 0.5)
        slots.B.push({ x: cx, y: rowH - abaixo - 2 + (i === 0 ? 8 : 0) - (i === 2 ? 3 : 0), cw })
        slots.A.push({ x: cx, y: H - abaixo + (i === 0 ? -6 : 0) + (i === 2 ? 3 : 0), cw })
      }
    } else {
      const cw = Math.min(W * 0.145, 186), gap = W * 0.035
      esc = limita(Math.min(cw / 150, (H - abaixo - 28) / 218), 0.3, 1.3)
      for (let i = 0; i < 3; i++) {
        const dx = gap + cw * 0.5 + i * cw * 0.98
        const dy = [8, 0, -10][i]
        const livre = Math.max(0, H - abaixo - 28 - 218 * esc) * 0.5
        slots.A.push({ x: W / 2 - dx, y: H - abaixo - 2 + dy - livre, cw })
        slots.B.push({ x: W / 2 + dx, y: H - abaixo - 2 + dy - livre, cw })
      }
    }
    return { paisagem, esc, slots, banda }
  }

  posAlvo(id) {
    const b = this.vista?.bonecos[id]
    if (!b) return null
    const i = this.lug[b.time].indexOf(id)
    return i < 0 ? null : this.geo.slots[b.time][i]
  }

  /** Retângulos (em px de CSS do canvas) onde cada boneco recebe toque. */
  retangulos() {
    const out = {}
    if (!this.vista) return out
    for (const t of ['A', 'B']) {
      this.lug[t].forEach((id, i) => {
        const s = this.geo.slots[t][i], h = 218 * this.geo.esc, w = Math.max(s.cw - 2, 142 * this.geo.esc)
        out[id] = { x: s.x - w / 2, y: s.y - h, w, h: h + 56 }
      })
    }
    return out
  }
  idEm(x, y) {
    const r = this.retangulos()
    let melhor = null
    for (const [id, q] of Object.entries(r)) if (x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) melhor = id
    return melhor
  }
  centro(id) { const q = this.retangulos()[id]; return q ? { x: q.x + q.w / 2, y: q.y + q.h * 0.4 } : null }

  // ------------------------------------------------------------------ estado e eventos

  /** Sincroniza tudo com a visão do motor (sem animar os eventos). */
  sync(vista) {
    this.vista = vista
    for (const t of ['A', 'B']) this.lug[t] = vista.times[t].lugares.slice()
    for (const [id, b] of Object.entries(vista.bonecos)) {
      const p = this.posAlvo(id)
      const d = this.D[id] ??= { x: p.x, y: p.y, hp: b.vida, ghost: b.vida, est: b.estado, queda: b.estado === 'caido' ? 1 : 0, shake: null, fase: Math.random() * 6, reflexo: 0 }
      d.hp = b.vida; d.ghost = this.menos ? b.vida : Math.max(d.ghost, b.vida); d.est = b.estado
      if (this.menos || !this.fx.length) { /* posição segue o alvo abaixo */ }
      if (this.menos) { d.x = p.x; d.y = p.y; d.queda = d.est === 'caido' ? 1 : 0 }
    }
    this.sujo = true
  }

  /** Mostra o novo estado e agenda as animações dos eventos. Devolve a duração (ms) para a tela esperar. */
  passo(novaVista, eventos) {
    const antes = this.vista
    this.vista = novaVista
    // lugares e estados mostrados só mudam quando o evento correspondente "acontece"
    let t = 0, tesouraFeita = false
    const k = this.menos ? 0.6 : 1
    for (const ev of eventos) {
      const quando = t
      this.agendar(quando, () => this.tocar(ev))
      if (ev.t === 'tesoura') {
        if (!tesouraFeita) { tesouraFeita = true; t += 900 * k }
        continue
      }
      let d = (DUR[ev.t] ?? 0) * k
      if (ev.t === 'dano' && ev.critico) d = 1000 * k
      t += d
    }
    const total = t + 120
    this.agendar(total, () => this.sync(novaVista))
    this.total = total
    void antes
    return total * this.vel
  }

  agendar(ms, fn) { this.agenda.push({ em: performance.now() + ms * this.vel, fn }); this.sujo = true }
  /** Roda agora tudo o que ainda está agendado (a tela chama ao fim da espera). */
  concluir() {
    const todos = this.agenda.splice(0).sort((a, b) => a.em - b.em)
    for (const a of todos) a.fn()
    this.sujo = true
  }

  /** Um evento do motor "acontece" na tela agora. */
  tocar(ev) {
    const v = this.vista, D = this.D
    const pos = (id) => { const d = D[id]; return d ? { x: d.x, y: d.y } : null }
    const alt = (id) => { const p = pos(id); return p ? { x: p.x, y: p.y - 110 * this.geo.esc } : { x: this.W / 2, y: this.H / 2 } }
    const numero = (id, texto, cor, tam = 22, dy = 0) => { const p = alt(id); dy += this.empilha(p.x) * -20; this.fx.push({ k: 'num', x: p.x, y: p.y + dy, texto, cor, tam, t0: performance.now(), dur: this.menos ? 900 : 1100 }) }
    switch (ev.t) {
      case 'dano': {
        const d = D[ev.alvo]; if (!d) break
        d.hp = Math.max(0, d.hp - ev.valor)
        const p = alt(ev.alvo)
        if (ev.escudo > 0) numero(ev.alvo, `-${ev.escudo}`, '#9fb4d6', 15, 26)
        numero(ev.alvo, `-${ev.valor}`, ev.critico ? '#ffd23a' : ev.refletido ? '#ff9ec0' : '#fff2f2', ev.critico ? 34 : 24)
        if (ev.refletido) this.fx.push({ k: 'texto', x: p.x, y: p.y - 24 - 20 * this.empilha(p.x), texto: 'ESPINHO!', cor: '#7ee08a', tam: 14, t0: performance.now(), dur: 800 })
        this.eventosVistos.dano++
        if (!this.menos) {
          d.shake = { t0: performance.now(), amp: ev.critico ? 9 : 5 }
          if (this.limiteFlash()) this.fx.push({ k: 'estrela', x: p.x, y: p.y + 38 * this.geo.esc, t0: performance.now(), dur: 280, grande: ev.critico })
          this.soltar(p.x, p.y + 40 * this.geo.esc, ev.critico ? 22 : 7, ev.critico ? 'enchimento' : 'fiapo')
        }
        if (ev.critico) {
          this.eventosVistos.critico++
          const q = pos(ev.alvo)
          this.fx.push({ k: 'costura', x: q.x, y: q.y - 92 * this.geo.esc, t0: performance.now(), dur: this.menos ? 1000 : 1000, id: ev.alvo })
          this.fx.push({ k: 'texto', x: p.x, y: p.y - 30 - 20 * this.empilha(p.x), texto: 'CRÍTICO!', cor: '#ffd23a', tam: 20, t0: performance.now(), dur: 1000, estoura: true })
          if (!this.menos) this.soltar(q.x, q.y - 92 * this.geo.esc, 18, 'enchimento')
        }
        break
      }
      case 'autoDano': { const d = D[ev.alvo]; if (d) { d.hp = Math.max(0, d.hp - ev.valor); numero(ev.alvo, `-${ev.valor}`, '#ffb0a0', 18) } break }
      case 'tesoura': {
        const d = D[ev.alvo]; if (d) d.hp = Math.max(0, d.hp - ev.valor)
        numero(ev.alvo, `-${ev.valor}`, '#e8e8ee', 22)
        if (!this.fx.some((f) => f.k === 'tesoura' && performance.now() - f.t0 < 600)) this.fx.push({ k: 'tesoura', t0: performance.now(), dur: this.menos ? 900 : 950 })
        break
      }
      case 'errou': {
        const p = alt(ev.alvo)
        this.fx.push({ k: 'texto', x: p.x, y: p.y + 6, texto: 'ERROU!', cor: '#d8ccff', tam: 22, t0: performance.now(), dur: 900 })
        if (!this.menos) { this.fx.push({ k: 'veuEstoura', x: p.x, y: p.y + 70 * this.geo.esc, t0: performance.now(), dur: 520 }); this.soltar(p.x, p.y + 70 * this.geo.esc, 10, 'brilho') }
        break
      }
      case 'escudo': { const p = pos(ev.alvo); if (p) this.fx.push({ k: 'anel', x: p.x, y: p.y - 80 * this.geo.esc, cor: '#9cc6ff', t0: performance.now(), dur: 520 }); numero(ev.alvo, `+${ev.valor}`, '#a8d0ff', 18, 10); break }
      case 'quebraEscudo': numero(ev.alvo, 'ESCUDO RASGADO', '#c9d6ee', 12, 8); break
      case 'cura': { const p = pos(ev.alvo); const d = D[ev.alvo]; if (d) { d.hp = Math.min(d.hp + ev.valor, v.bonecos[ev.alvo].vidaMax); d.ghost = d.hp } numero(ev.alvo, `+${ev.valor}`, '#8cf0a0', 22); if (p && !this.menos) this.soltar(p.x, p.y - 80 * this.geo.esc, 8, 'cruz'); break }
      case 'veu': { const p = pos(ev.alvo); if (p) this.fx.push({ k: 'anel', x: p.x, y: p.y - 80 * this.geo.esc, cor: '#d8ccff', t0: performance.now(), dur: 520 }); numero(ev.alvo, 'VÉU', '#d8ccff', 16, 10); break }
      case 'fioSolto': numero(ev.alvo, 'FIO SOLTO', '#ff8a9a', 15, 8); break
      case 'ultimoFio': {
        const d = D[ev.alvo]; if (d) { d.est = 'fio'; d.hp = 0; d.shake = this.menos ? null : { t0: performance.now(), amp: 6 } }
        numero(ev.alvo, 'ÚLTIMO FIO!', '#ffb454', 17, -6); break
      }
      case 'caiu': {
        const d = D[ev.alvo]; if (d) { d.est = 'caido'; d.hp = 0 }
        const p = pos(ev.alvo); if (p) { numero(ev.alvo, 'CAIU', '#cfc6dd', 16, -6); if (!this.menos) this.soltar(p.x, p.y - 40 * this.geo.esc, 14, 'enchimento') }
        break
      }
      case 'troca': {
        for (const t of ['A', 'B']) { const l = this.lug[t], i = l.indexOf(ev.a), j = l.indexOf(ev.b); if (i >= 0 && j >= 0) { l[i] = ev.b; l[j] = ev.a } }
        break
      }
      case 'move': { // o motor manda os dois lugares (de → para) trocados
        const b = v.bonecos[ev.alvo]; if (!b) break
        const l = this.lug[b.time], o = l[ev.para]; l[ev.para] = ev.alvo; l[ev.de] = o
        break
      }
      default: break
    }
    this.sujo = true
  }

  /** Quantos textos recentes já estão sobre o mesmo boneco (para empilhar sem sobrepor). */
  empilha(x) { const agora = performance.now(); return this.fx.filter((f) => (f.k === 'num' || f.k === 'texto') && Math.abs(f.x - x) < 46 && agora - f.t0 < 650).length }

  limiteFlash() { // no máximo 3 por segundo (impactos no mesmo instante contam como um)
    const agora = performance.now()
    this.flashes = this.flashes.filter((t) => agora - t < 1000)
    if (this.flashes.length && agora - this.flashes[this.flashes.length - 1] < 130) return true
    if (this.flashes.length >= 3) return false
    this.flashes.push(agora); this.logFlash.push(agora); return true
  }

  soltar(x, y, n, tipo) {
    for (let i = 0; i < n && this.part.length < MAX_PARTICULAS; i++) {
      const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * (tipo === 'enchimento' ? 220 : 120)
      this.picoPart = Math.max(this.picoPart, this.part.length + 1)
      this.part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, g: tipo === 'brilho' ? 20 : 340, t0: performance.now(), dur: 650 + Math.random() * 450, tipo, r: tipo === 'enchimento' ? 3 + Math.random() * 4 : 2 + Math.random() * 2, rot: Math.random() * 6, cor: tipo === 'fiapo' ? ['#efe6cf', '#e8344f', '#cfd5dc'][i % 3] : '#f6efe0' })
    }
  }

  /** Marca quem pode ser tocado (anel dourado), quem usa a carta e quem sofre vantagem de tipo. */
  marcar({ alvos = [], usuario = null, vantagem = [], troca = null } = {}) {
    this.destaque = { alvos: new Set(alvos), usuario, vantagem: new Set(vantagem), trocaDe: troca }
    this.sujo = true
  }

  // ------------------------------------------------------------------ desenho

  quadro(agora) {
    this.raf = requestAnimationFrame((t) => this.quadro(t))
    const t = performance.now()
    // agenda
    if (this.agenda.length) {
      const prontos = this.agenda.filter((a) => a.em <= t)
      if (prontos.length) { this.agenda = this.agenda.filter((a) => a.em > t); prontos.sort((a, b) => a.em - b.em).forEach((a) => a.fn()) }
    }
    if (!this.vista) return
    this.fx = this.fx.filter((f) => t - f.t0 < f.dur)
    this.part = this.part.filter((p) => t - p.t0 < p.dur)
    const anima = !this.menos || this.fx.length || this.agenda.length
    if (!this.sujo && !anima) return
    this.sujo = this.menos ? !!(this.fx.length || this.agenda.length) : true
    this.desenhar(t)
  }

  desenhar(t) {
    const c = this.c, W = this.W, H = this.H, G = this.geo
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.fundo(c, W, H, G)
    const v = this.vista, esc = G.esc
    // suaviza posições, vida, queda
    for (const [id, d] of Object.entries(this.D)) {
      const p = this.posAlvo(id); if (!p) continue
      const k = this.menos ? 1 : 0.2
      d.x += (p.x - d.x) * k; d.y += (p.y - d.y) * k
      if (Math.abs(p.x - d.x) < 0.3) d.x = p.x
      if (Math.abs(p.y - d.y) < 0.3) d.y = p.y
      d.ghost += (d.hp - d.ghost) * (this.menos ? 1 : 0.04)
      if (d.ghost < d.hp) d.ghost = d.hp
      const alvoQueda = d.est === 'caido' ? 1 : 0
      d.queda += (alvoQueda - d.queda) * (this.menos ? 1 : 0.16)
      if (Math.abs(alvoQueda - d.queda) < 0.01) d.queda = alvoQueda
    }
    const ordem = Object.keys(this.D).filter((id) => v.bonecos[id]).sort((a, b) => this.D[a].y - this.D[b].y)
    for (const id of ordem) this.boneco(c, id, t)
    for (const id of ordem) this.painel(c, id, t)
    this.efeitos(c, t)
  }

  fundo(c, W, H, G) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b1a3d'); g.addColorStop(0.5, '#23142f'); g.addColorStop(1, '#2d1a36')
    c.fillStyle = g; c.fillRect(0, 0, W, H)
    // colcha de retalhos: losangos de ponto
    c.save(); c.strokeStyle = 'rgba(233,225,200,0.07)'; c.lineWidth = 1.2; c.setLineDash([5, 5])
    const s = 46
    for (let k = -H; k < W + H; k += s) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + H, H); c.stroke(); c.beginPath(); c.moveTo(k + H, 0); c.lineTo(k, H); c.stroke() }
    c.restore()
    // remendos sob os times
    const retalho = (xc, yc, w, h, cor) => { c.fillStyle = cor; c.beginPath(); c.roundRect(xc - w / 2, yc - h / 2, w, h, 18); c.fill(); c.save(); c.setLineDash([6, 5]); c.strokeStyle = 'rgba(233,225,200,0.28)'; c.lineWidth = 2; c.beginPath(); c.roundRect(xc - w / 2 + 5, yc - h / 2 + 5, w - 10, h - 10, 14); c.stroke(); c.restore() }
    if (!G.paisagem) {
      const rh = (H - G.banda) / 2
      retalho(W / 2, rh / 2 + 2, W - 10, rh - 8, 'rgba(120,40,80,0.22)')
      retalho(W / 2, H - rh / 2 - 2, W - 10, rh - 8, 'rgba(60,70,140,0.24)')
    } else {
      retalho(W * 0.27, H / 2, W * 0.46, H - 12, 'rgba(60,70,140,0.22)')
      retalho(W * 0.73, H / 2, W * 0.46, H - 12, 'rgba(120,40,80,0.22)')
    }
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)')
    c.fillStyle = vg; c.fillRect(0, 0, W, H)
  }

  boneco(c, id, t) {
    const v = this.vista, b = v.bonecos[id], d = this.D[id], esc = this.geo.esc
    const dest = this.destaque
    const alvoOk = dest.alvos.has(id), usa = dest.usuario === id
    let ox = 0, oy = 0, rot = 0
    if (!this.menos) {
      if (d.shake) { const e = t - d.shake.t0; if (e > 450) d.shake = null; else ox = Math.sin(e * 0.06) * d.shake.amp * (1 - e / 450) }
      if (d.est === 'vivo') oy = Math.sin(t / 420 + d.fase) * 1.6 * esc
      if (d.est === 'fio') rot = Math.sin(t / 90 + d.fase) * 0.05
    }
    const x = d.x + ox, y = d.y + oy
    // anel de alvo (costura dourada tracejada) e marca de quem usa a carta
    if (alvoOk || usa || dest.trocaDe === id) {
      c.save(); c.translate(x, d.y + 3 * esc); c.scale(1, 0.2)
      c.setLineDash([10, 7]); c.lineDashOffset = this.menos ? 0 : -t / 40
      c.lineWidth = 7; c.strokeStyle = usa && !alvoOk ? '#9fe0ff' : dest.trocaDe === id ? '#ffffff' : '#ffd23a'
      c.beginPath(); c.arc(0, 0, 62 * esc + 12, 0, Math.PI * 2); c.stroke()
      c.fillStyle = usa && !alvoOk ? 'rgba(120,200,255,0.2)' : 'rgba(255,210,58,0.2)'; c.fill()
      c.restore()
    }
    const est = d.est === 'caido' ? 'caido' : d.est === 'fio' ? 'fio' : 'vivo'
    const sp = spriteDoBoneco(b.partes, est, esc * this.dpr)
    c.save()
    const w = SW * esc, h = SH * esc
    if (est === 'caido') {
      const q = d.queda
      c.translate(x, y - 20 * esc)
      c.rotate(-1.42 * q); c.scale(1 - 0.12 * q, 1 - 0.18 * q)
      c.globalAlpha = 1 - 0.18 * q
      c.drawImage(sp, -w / 2, -(150 * esc), w, h)
    } else if (est === 'fio') {
      c.translate(x, y - 214 * esc - 2) // âncora: topo (onde está o fio)
      c.rotate(rot)
      c.drawImage(sp, -w / 2, 0, w, h)
      c.globalAlpha = 0.85
    } else {
      c.drawImage(sp, x - w / 2, y - 214 * esc, w, h)
    }
    c.restore()
    // véu de tule por cima
    if (b.veu && est === 'vivo') {
      c.save(); c.globalAlpha = 0.55; c.fillStyle = 'rgba(205,190,255,0.35)'; c.strokeStyle = 'rgba(235,228,255,0.9)'; c.lineWidth = 1.5
      c.beginPath(); c.moveTo(x - 62 * esc, y - 2); c.bezierCurveTo(x - 66 * esc, y - 250 * esc, x + 66 * esc, y - 250 * esc, x + 62 * esc, y - 2)
      for (let i = 0; i < 7; i++) { const x0 = x + 62 * esc - i * 17.7 * esc, x1 = x0 - 17.7 * esc; c.quadraticCurveTo((x0 + x1) / 2, y + 8, x1, y - 2) }
      c.closePath(); c.fill(); c.stroke(); c.restore()
    }
    if (b.escudo > 0 && est !== 'caido') {
      c.save(); c.globalAlpha = 0.35 + (this.menos ? 0 : Math.sin(t / 300) * 0.08); c.strokeStyle = '#9cc6ff'; c.lineWidth = 3; c.setLineDash([8, 6])
      c.beginPath(); c.ellipse(x, y - 105 * esc, 70 * esc, 110 * esc, 0, 0, Math.PI * 2); c.stroke(); c.restore()
    }
    // vantagem de tipo: etiqueta sobre o alvo
    if (dest.vantagem.has(id)) {
      const bx = x, by = y - 214 * esc - 2
      c.save(); c.font = `bold ${Math.round(13)}px ${FONTE}`; c.textAlign = 'center'
      const tx = `+${Math.round(BONUS_DE_TIPO * 100)}%`, w2 = c.measureText(tx).width + 14
      c.fillStyle = '#ffd23a'; c.strokeStyle = '#3a2400'; c.lineWidth = 2; c.beginPath(); c.roundRect(bx - w2 / 2, by - 13, w2, 20, 8); c.fill(); c.stroke()
      c.fillStyle = '#3a2400'; c.fillText(tx, bx, by + 2); c.restore()
    }
    if (usa && !alvoOk) { // seta "quem usa"
      const bx = x, by = y - 214 * esc - 6
      c.save(); c.fillStyle = '#9fe0ff'; c.strokeStyle = '#08202e'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by + 8); c.lineTo(bx - 9, by - 6); c.lineTo(bx + 9, by - 6); c.closePath(); c.fill(); c.stroke(); c.restore()
    }
  }

  /** Nome do lugar, barra de vida e marcadores. */
  painel(c, id, t) {
    const v = this.vista, b = v.bonecos[id], d = this.D[id], esc = this.geo.esc
    const idx = this.lug[b.time].indexOf(id)
    const cw = this.geo.slots[b.time][Math.max(0, idx)].cw
    const x = d.x, y0 = d.y
    const larg = Math.min(cw - 10, 132), xi = x - larg / 2
    // nome do lugar
    c.save(); c.font = `bold 10px ${FONTE}`; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.lineWidth = 3; c.strokeStyle = 'rgba(20,8,28,0.9)'; c.fillStyle = idx === 0 ? '#ffe9b0' : 'rgba(240,230,205,0.75)'
    c.strokeText(NOMES_LUGAR[idx], x, y0 + 11); c.fillText(NOMES_LUGAR[idx], x, y0 + 11)
    // barra
    const by = y0 + 20, bh = 14, bx = xi + 17, bw = larg - 17
    c.drawImage(iconeDoTipo(b.tipo, Math.round(18 * this.dpr)), xi, by - 2, 18, 18)
    c.fillStyle = '#12091a'; c.beginPath(); c.roundRect(bx, by, bw, bh, 7); c.fill()
    const pct = (n) => limita(n / b.vidaMax, 0, 1)
    const g = pct(d.ghost), p = pct(d.hp)
    c.save(); c.beginPath(); c.roundRect(bx + 1, by + 1, bw - 2, bh - 2, 6); c.clip()
    if (g > p) { c.fillStyle = '#f7e3a2'; c.fillRect(bx + 1, by + 1, (bw - 2) * g, bh - 2) }
    const cor = p > 0.55 ? '#6fd36a' : p > 0.28 ? '#f0c040' : '#e8503f'
    c.fillStyle = cor; c.fillRect(bx + 1, by + 1, (bw - 2) * p, bh - 2)
    c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(bx + 1, by + 1, (bw - 2) * p, 4)
    c.restore()
    c.strokeStyle = '#05020a'; c.lineWidth = 1.6; c.beginPath(); c.roundRect(bx, by, bw, bh, 7); c.stroke()
    c.font = `bold 10px ${FONTE}`; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.lineWidth = 3
    const tx = `${Math.ceil(d.hp)}/${b.vidaMax}`
    c.strokeText(tx, bx + bw / 2, by + bh / 2 + 0.5); c.fillText(tx, bx + bw / 2, by + bh / 2 + 0.5)
    // marcadores
    const chips = []
    if (b.estado === 'fio') chips.push({ k: 'fio' })
    if (b.fioSoltoAte > 0 && b.estado !== 'caido') chips.push({ k: 'solto' })
    if (b.veu) chips.push({ k: 'veu' })
    if (b.escudo > 0) chips.push({ k: 'escudo', n: b.escudo })
    if (b.reserva > 0 && b.estado === 'vivo') chips.push({ k: 'reserva' })
    const cwid = 22, gap = 3, tot = chips.reduce((s, q) => s + (q.k === 'escudo' ? 34 : cwid) + gap, -gap)
    let cx = x - tot / 2
    const cy = by + bh + 3
    for (const q of chips) { cx += this.chip(c, q, cx, cy, t) + gap }
    c.restore()
  }

  chip(c, q, x, y, t) {
    const w = q.k === 'escudo' ? 34 : 22, h = 17
    c.fillStyle = 'rgba(14,6,22,0.88)'; c.strokeStyle = { fio: '#ffb454', solto: '#ff6b84', veu: '#d8ccff', escudo: '#9cc6ff', reserva: '#e9e1c8' }[q.k]; c.lineWidth = 1.5
    c.beginPath(); c.roundRect(x, y, w, h, 6); c.fill(); c.stroke()
    const cx = x + (q.k === 'escudo' ? 10 : w / 2), cy = y + h / 2
    c.save(); c.translate(cx, cy); c.lineCap = 'round'; c.lineJoin = 'round'
    if (q.k === 'fio') { c.strokeStyle = '#ffb454'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0, -7); c.lineTo(0, 0); c.stroke(); c.fillStyle = '#ffb454'; c.beginPath(); c.arc(0, 3, 3.4, 0, 6.3); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1; c.beginPath(); c.moveTo(-1.6, 2); c.lineTo(1.6, 4.4); c.moveTo(1.6, 2); c.lineTo(-1.6, 4.4); c.stroke() }
    if (q.k === 'solto') { c.strokeStyle = '#ff6b84'; c.lineWidth = 2; c.beginPath(); c.moveTo(-7, 3); c.bezierCurveTo(-7, -9, 0, -8, 0, -1); c.bezierCurveTo(0, 4, 6, 4, 6, -3); c.bezierCurveTo(6, -8, 3, -7, 4, -4); c.stroke() }
    if (q.k === 'veu') { c.fillStyle = 'rgba(216,204,255,0.55)'; c.strokeStyle = '#efe9ff'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-7, 6); c.quadraticCurveTo(-7, -8, 0, -8); c.quadraticCurveTo(7, -8, 7, 6); c.lineTo(4, 4); c.lineTo(1.5, 6); c.lineTo(-1.5, 4); c.lineTo(-4, 6); c.closePath(); c.fill(); c.stroke() }
    if (q.k === 'escudo') { c.fillStyle = '#6f8fc0'; c.strokeStyle = '#e8f1ff'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -7); c.lineTo(6, -4); c.quadraticCurveTo(6, 4, 0, 8); c.quadraticCurveTo(-6, 4, -6, -4); c.closePath(); c.fill(); c.stroke() }
    if (q.k === 'reserva') { c.fillStyle = '#efe6cf'; c.strokeStyle = '#6b5834'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 6, 0, 6.3); c.fill(); c.stroke(); c.fillStyle = '#26121a'; for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { c.beginPath(); c.arc(dx, dy, 1, 0, 6.3); c.fill() } }
    c.restore()
    if (q.k === 'escudo') { c.font = `bold 11px ${FONTE}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#e8f1ff'; c.fillText(String(q.n), x + 18, y + h / 2 + 0.5) }
    return w
  }

  // ------------------------------------------------------------------ efeitos

  texto(c, s, x, y, tam, cor, borda = 'rgba(20,6,26,0.95)') {
    c.font = `800 ${tam}px ${FONTE}`; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.lineJoin = 'round'; c.lineWidth = Math.max(3, tam / 4); c.strokeStyle = borda; c.strokeText(s, x, y); c.fillStyle = cor; c.fillText(s, x, y)
  }

  efeitos(c, t) {
    const esc = this.geo.esc
    for (const f of this.fx) {
      const u = (t - f.t0) / f.dur
      c.save()
      if (f.k === 'num' || f.k === 'texto') {
        const sobe = this.menos ? 0 : (f.k === 'num' ? 46 : 18) * (1 - Math.pow(1 - u, 2))
        c.globalAlpha = u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35
        const pop = this.menos ? 1 : f.estoura || f.k === 'num' ? 1 + Math.max(0, 0.45 - u * 2.2) : 1
        c.translate(f.x, f.y - sobe); c.scale(pop, pop)
        this.texto(c, f.texto, 0, 0, f.tam, f.cor)
      } else if (f.k === 'estrela') {
        const r = (f.grande ? 52 : 34) * (0.5 + u * 0.7), a = 1 - u
        c.globalAlpha = a; c.translate(f.x, f.y); c.rotate(u * 0.6)
        c.fillStyle = '#fff6c8'; c.strokeStyle = '#ff9a2e'; c.lineWidth = 3; c.beginPath()
        for (let i = 0; i < 16; i++) { const rr = i % 2 ? r * 0.45 : r; const an = (i / 16) * Math.PI * 2; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) }
        c.closePath(); c.fill(); c.stroke()
      } else if (f.k === 'costura') this.costura(c, f, u, esc)
      else if (f.k === 'anel') {
        c.globalAlpha = 1 - u; c.strokeStyle = f.cor; c.lineWidth = 5 * (1 - u) + 1; c.setLineDash([8, 6])
        c.beginPath(); c.ellipse(f.x, f.y, 30 * esc + 70 * esc * u, 40 * esc + 90 * esc * u, 0, 0, Math.PI * 2); c.stroke()
      } else if (f.k === 'veuEstoura') {
        c.globalAlpha = 1 - u; c.strokeStyle = '#efe9ff'; c.lineWidth = 2
        for (let i = 0; i < 8; i++) { const an = (i / 8) * 6.28 + 0.3, r0 = 20 + u * 50; c.beginPath(); c.moveTo(f.x + Math.cos(an) * r0, f.y + Math.sin(an) * r0 * 1.3); c.lineTo(f.x + Math.cos(an) * (r0 + 14), f.y + Math.sin(an) * (r0 + 14) * 1.3); c.stroke() }
      } else if (f.k === 'tesoura') this.tesoura(c, f, u)
      c.restore()
    }
    for (const p of this.part) {
      const e = (t - p.t0) / 1000, u = (t - p.t0) / p.dur
      const x = p.x + p.vx * e, y = p.y + p.vy * e + 0.5 * p.g * e * e
      c.save(); c.globalAlpha = 1 - u * u; c.translate(x, y); c.rotate(p.rot + e * 5)
      if (p.tipo === 'enchimento') { c.fillStyle = p.cor; c.strokeStyle = 'rgba(60,40,70,0.6)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, p.r, 0, 6.3); c.arc(p.r * 0.6, -p.r * 0.4, p.r * 0.7, 0, 6.3); c.fill(); c.stroke() }
      else if (p.tipo === 'fiapo') { c.strokeStyle = p.cor; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(0, -5, 5, 0); c.stroke() }
      else if (p.tipo === 'cruz') { c.strokeStyle = '#8cf0a0'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.moveTo(0, -4); c.lineTo(0, 4); c.stroke() }
      else { c.fillStyle = '#efe9ff'; c.beginPath(); c.arc(0, 0, p.r, 0, 6.3); c.fill() }
      c.restore()
    }
  }

  /** A costura do peito estoura: pontos em X saltam, o rasgo abre e mostra o enchimento. */
  costura(c, f, u, esc) {
    const larg = 70 * esc, n = 7, aberto = limita((u - 0.12) / 0.4, 0, 1)
    c.translate(f.x, f.y)
    c.globalAlpha = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25
    // rasgo com enchimento
    c.fillStyle = '#150610'; c.beginPath(); c.ellipse(0, 0, larg * 0.5 * aberto + 2, 7 * esc * aberto + 1, 0, 0, 6.3); c.fill()
    c.fillStyle = '#fbf6e8'; c.strokeStyle = 'rgba(70,50,80,0.7)'; c.lineWidth = 1.2
    for (let i = 0; i < 5; i++) { const k = (i - 2) * larg * 0.15, r = 9 * esc * aberto + 1; c.beginPath(); c.arc(k, -4 * esc * aberto - Math.abs(i - 2) * 1.5, r, 0, 6.3); c.fill(); c.stroke() }
    // pontos
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * (larg / (n - 1)), solta = this.menos ? 0 : Math.max(0, (u - 0.08 - Math.abs(i - 3) * 0.04) * 3)
      c.save(); c.translate(x * (1 + solta * 0.6), -solta * 30 * esc + solta * solta * 20 * esc); c.rotate(solta * (i % 2 ? 2 : -2))
      c.globalAlpha *= 1 - limita(solta - 0.6, 0, 1)
      c.strokeStyle = '#2a1520'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(-4, -5); c.lineTo(4, 5); c.moveTo(4, -5); c.lineTo(-4, 5); c.stroke()
      c.strokeStyle = '#e6dcc0'; c.lineWidth = 1.3; c.stroke()
      c.restore()
    }
  }

  /** Tesoura gigante que corta a mesa (a partir do turno da Tesoura). */
  tesoura(c, f, u) {
    const W = this.W, H = this.H, abre = this.menos ? 0.25 : Math.abs(Math.cos(u * 7)) * 0.5 * (1 - u * 0.5)
    c.globalAlpha = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25
    const x = this.menos ? W / 2 : -80 + (W + 160) * Math.min(1, u * 1.15), y = H / 2
    c.strokeStyle = 'rgba(255,255,255,0.65)'; c.lineWidth = 2; c.setLineDash([9, 7])
    c.beginPath(); c.moveTo(0, y); c.lineTo(this.menos ? W : x - 40, y); c.stroke(); c.setLineDash([])
    c.translate(x, y); const s = Math.min(1.5, W / 320)
    c.scale(s, s)
    for (const lado of [-1, 1]) {
      c.save(); c.rotate(lado * abre)
      c.fillStyle = '#d9dee6'; c.strokeStyle = '#1d1020'; c.lineWidth = 3
      c.beginPath(); c.moveTo(-6, 0); c.lineTo(52, lado * 11); c.lineTo(52, lado * 1); c.closePath(); c.fill(); c.stroke()
      c.strokeStyle = '#e8344f'; c.lineWidth = 6; c.beginPath(); c.ellipse(-26, lado * -14, 14, 10, lado * 0.4, 0, 6.3); c.stroke()
      c.strokeStyle = '#1d1020'; c.lineWidth = 2; c.beginPath(); c.ellipse(-26, lado * -14, 17, 13, lado * 0.4, 0, 6.3); c.stroke()
      c.restore()
    }
    c.fillStyle = '#8b919a'; c.beginPath(); c.arc(0, 0, 4, 0, 6.3); c.fill()
  }
}
