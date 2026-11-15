// Frayz — a ARENA da luta: o ateliê (cenario.js), os 6 bonecos de pano (boneco-rig.js) e os efeitos (efeitos.js) num canvas,
// e por cima, em HTML, a placa de vida de cada boneco (fita métrica, dedal, alfinetes), a marca de vantagem e os números.
// Esta camada só MOSTRA: recebe a visão do motor e a lista de `eventos` e anima. Nenhuma regra aqui.
// "Menos animação": sem tremida, sem estrela de impacto, sem partículas; as poses vão direto ao quadro final e os números só esmaecem.
import { CARTAS, REGRAS, vantagem as temVantagem } from './ponte.js'
import { criarRig } from './boneco-rig.js'
import { criarCenario } from './cenario.js'
import { criarEfeitos } from './efeitos.js'
import { criarPlaca } from './pecas/fita.js'
import { criarMarcaDeVantagem } from './pecas/marca-de-vantagem.js'
import { soltarNumero } from './pecas/numero-de-dano.js'
import { BONUS, marcasDoBoneco } from './pecas/montagens.js'
import { TECIDOS } from './pecas/arte-adaptador.js'
import * as Som from './som.js'

const DUR = { carta: 140, dano: 420, errou: 520, escudo: 520, cura: 420, caiu: 650, ultimoFio: 900, move: 480, troca: 480, fioSolto: 380, veu: 380, quebraEscudo: 300, autoDano: 340 }
// poses passageiras (ms de animação e quanto ficam no último quadro antes de voltar ao repouso)
const POSE = { preparo: [120, 60], golpe: [420, 120], golpeado: [420, 80], escudo: [620, 200], vitoria: [720, 99999] }
const GOLPE_FORTE = 100 // PROVISÓRIO (só visual): a partir daqui o golpe soa e pesa como "golpe forte"
// Tremida da cena (só visual, tarefa 21): golpe forte 3 px, crítico 6 px (o teto do guia §9), 200 ms (pedido da tarefa 21)
const TREMIDA = { forte: 3, critico: 6, ms: 200 }
const limita = (v, a, b) => Math.max(a, Math.min(b, v))

export class Arena {
  /** canvas: o desenho; camada: div por cima do canvas (mesmo tamanho) onde moram placas, marcas e números. */
  constructor(canvas, camada) {
    this.cv = canvas
    this.c = canvas.getContext('2d')
    this.camada = camada
    this.menos = false
    this.vel = 1 // 1 = normal; o teste usa menos para correr
    this.vista = null
    this.D = {} // visual de cada boneco: posição suavizada, vida mostrada, estado mostrado, pose
    this.rigs = {}
    this.lug = { A: [], B: [] }
    this.fx = [] // marcas com tempo (a Tesoura cortando): { k, t0, dur }
    this.agenda = []
    this.destaque = { alvos: new Set(), usuario: null, vantagem: new Set(), trocaDe: null }
    this.intencao = null // Aventura: { idDoBoneco: ['Frente 75', ...] } — o que o inimigo vai fazer (balão sobre ele)
    this.comIntencao = false
    this.flashes = []
    this.logFlash = [] // só para o teste conferir o limite de 3 por segundo
    this.picoPart = 0
    this.W = 0; this.H = 0; this.dpr = 1; this.formato = 'pc'
    this.L = null
    this.eventosVistos = { critico: 0, dano: 0 }
    this.tremidas = [] // só para o teste: { px, t } de cada tremida (nenhuma com "Menos animação")
    this.marcasDeGolpe = 0
    this.cena = criarCenario({ semente: 'atelie', folgaEmbaixo: 40 })
    this.efeitos = criarEfeitos({ maxParticulas: 90 })
    this.tAnt = performance.now()
    this.ro = new ResizeObserver(() => this.medir())
    this.ro.observe(canvas)
    this.medir()
    this.raf = requestAnimationFrame(() => this.quadro())
  }

  // ------------------------------------------------------------------ tamanho e posições

  medir() {
    const r = this.cv.getBoundingClientRect()
    this.W = Math.max(1, Math.round(r.width)); this.H = Math.max(1, Math.round(r.height))
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr)
    this.formato = this.W / this.H >= 1.15 ? 'pc' : 'celular'
    this.L = this.cena.lugares(this.W, this.H, this.formato)
    if (this.camada) this.camada.dataset.formato = this.formato
    for (const id of Object.keys(this.D)) { const p = this.slot(id); if (p) { this.D[id].x = p.x; this.D[id].y = p.y } }
    this.posicionarCamada(true)
  }

  /** Lugar (pé, altura) de um boneco agora, pela ordem mostrada. */
  slot(id) {
    const b = this.vista?.bonecos[id]
    if (!b || !this.L) return null
    const i = this.lug[b.time].indexOf(id)
    return i < 0 ? null : this.L[b.time][i]
  }

  /** Retângulos (em px de CSS do canvas) onde cada boneco recebe toque: o corpo e a placa embaixo. */
  retangulos() {
    const out = {}
    if (!this.vista) return out
    for (const t of ['A', 'B']) this.lug[t].forEach((id) => {
      const d = this.D[id], s = this.slot(id); if (!d || !s) return
      const w = s.altura * 0.72, h = s.altura
      out[id] = { x: d.x - w / 2, y: d.y - h, w, h: h + Math.min(44, s.altura * 0.3) }
    })
    return out
  }
  idEm(x, y) {
    const r = this.retangulos()
    let melhor = null, dist = Infinity
    for (const [id, q] of Object.entries(r)) {
      if (x < q.x || x > q.x + q.w || y < q.y || y > q.y + q.h) continue
      const d = Math.abs(x - (q.x + q.w / 2)) // caixas que se tocam: vence a do centro mais perto
      if (d < dist) { dist = d; melhor = id }
    }
    return melhor
  }
  centro(id) { const d = this.D[id], s = this.slot(id); return d && s ? { x: d.x, y: d.y - s.altura * 0.5 } : null }

  // ------------------------------------------------------------------ estado e eventos

  /** Luta nova: limpa efeitos, poses e lugares da anterior. */
  recomecar() {
    this.efeitos.limpar(); this.fx = []; this.agenda = []; this.D = {}; this.rigs = {}
    for (const o of Object.values(this.sobre ?? {})) o.el.remove()
    this.sobre = {}; this.vista = null
    this.c.setTransform(1, 0, 0, 1, 0, 0); this.c.fillStyle = '#160E20'; this.c.fillRect(0, 0, this.cv.width, this.cv.height) // nada da luta anterior
  }

  /** Assa antes do primeiro quadro, em fatias (um pedaço por quadro): o fundo do ateliê e as camadas de cada boneco.
   *  Assim abrir a luta não trava a tela de uma vez (a música e a faixa de vez só começam depois). */
  async preparar() {
    if (!this.vista || !this.L) { this.pronto = true; return }
    this.pronto = false // enquanto assa, o laço de quadros não desenha (senão assaria tudo de uma vez no 1º quadro)
    const quadro = () => new Promise((ok) => requestAnimationFrame(() => ok()))
    const fora = document.createElement('canvas'); fora.width = fora.height = 2
    const c = fora.getContext('2d')
    try {
      await quadro()
      const t = performance.now()
      this.c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
      this.cena.desenhar(this.c, this.W, this.H, t, { ...this.estadoDaCena(t), semFrente: true }) // o ateliê aparece primeiro
      for (const id of Object.keys(this.D)) { // depois um boneco por quadro
        await quadro()
        const s = this.slot(id), rig = this.rigs[id], b = this.vista?.bonecos[id]
        if (!s || !rig || !b) continue
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
        rig.desenhar(c, 1, 1, s.altura, 0, { pose: 'parado', progresso: 1, lado: b.time, menosAnimacao: true, brilhoDaLinha: 0 })
      }
    } finally { this.pronto = true }
  }

  /** Sincroniza tudo com a visão do motor (sem animar os eventos). */
  sync(vista) {
    this.vista = vista
    for (const t of ['A', 'B']) this.lug[t] = vista.times[t].lugares.slice()
    for (const [id, b] of Object.entries(vista.bonecos)) {
      const p = this.slot(id)
      if (!this.rigs[id]) this.rigs[id] = criarRig(b.partes, { semente: id })
      const d = this.D[id] ??= { x: p.x, y: p.y, hp: b.vida, est: b.estado, pose: null, base: 'parado', baseT0: -1e9 }
      d.hp = b.vida
      if (d.est !== b.estado) this.mudarEstado(id, b.estado, false)
      if (this.menos) { d.x = p.x; d.y = p.y }
    }
    this.atualizarPlacas()
  }

  /** Estado de repouso do boneco: de pé, pendurado pelo Último Fio ou caído. */
  mudarEstado(id, est, animar = true) {
    const d = this.D[id]; if (!d) return
    d.est = est
    d.base = est === 'caido' ? 'caido' : est === 'fio' ? 'ultimoFio' : 'parado'
    d.baseT0 = animar ? performance.now() : -1e9
    d.pose = null
  }

  posar(id, nome) {
    const d = this.D[id]; if (!d || d.est === 'caido') return
    if (d.est === 'fio' && nome !== 'golpeado') return // pendurado: só balança quando apanha
    d.pose = { nome, t0: performance.now() }
  }

  /** Mostra o novo estado e agenda as animações dos eventos. Devolve a duração (ms) para a tela esperar. */
  passo(novaVista, eventos) {
    this.vista = novaVista // os lugares mostrados (this.lug) só mudam quando o evento de troca acontece
    let t = 0, tesouraFeita = false
    const k = this.menos ? 0.6 : 1
    for (const ev of eventos) {
      this.agendar(t, () => this.tocar(ev))
      if (ev.t === 'tesoura') { if (!tesouraFeita) { tesouraFeita = true; t += 1100 * k } continue }
      let d = (DUR[ev.t] ?? 0) * k
      if (ev.t === 'dano' && ev.critico) d = 1000 * k
      t += d
    }
    const total = t + 120
    // visão PARCIAL (modo servidor: um passo do meio do turno do robô): a arena segue pelos eventos e só se acerta no último
    if (!novaVista.parcial) this.agendar(total, () => this.sync(novaVista))
    return total * this.vel
  }

  agendar(ms, fn) { this.agenda.push({ em: performance.now() + ms * this.vel, fn }) }
  /** Roda agora tudo o que ainda está agendado (a tela chama ao fim da espera). */
  concluir() {
    const todos = this.agenda.splice(0).sort((a, b) => a.em - b.em)
    for (const a of todos) a.fn()
  }

  /** Um evento do motor "acontece" na tela agora: pose, efeito, número e som. */
  tocar(ev) {
    const v = this.vista, D = this.D, calmo = this.menos
    const lado = (id) => v.bonecos[id]?.time
    const topo = (id) => { const d = D[id], s = this.slot(id); return d && s ? { x: d.x, y: d.y - s.altura * 0.78, meio: d.y - s.altura * 0.45, chao: d.y, alt: s.altura } : null }
    const escala = (id) => (this.slot(id)?.altura ?? 150) / 150
    switch (ev.t) {
      case 'carta': if (ev.de) this.posar(ev.de, 'preparo'); break
      case 'dano': {
        const d = D[ev.alvo], p = topo(ev.alvo); if (!d || !p) break
        d.hp = Math.max(0, d.hp - ev.valor)
        this.eventosVistos.dano++
        const forte = ev.critico || ev.valor >= GOLPE_FORTE
        if (ev.de) this.posar(ev.de, 'golpe')
        this.posar(ev.alvo, 'golpeado')
        // som: um por acontecimento (crítico › golpe no escudo › forte › golpe), do lado de quem apanha
        if (ev.critico) Som.critico(lado(ev.alvo))
        else if (ev.escudo > 0) Som.golpeNoEscudo(lado(ev.alvo))
        else if (forte) Som.golpeForte(lado(ev.alvo))
        else Som.golpe({ lado: lado(ev.alvo), forca: limita(ev.valor / 150, 0.2, 1) })
        const tipoCarta = ev.carta ? CARTAS[ev.carta]?.tipo : null
        const vant = !!(tipoCarta && ev.de && temVantagem(tipoCarta, v.bonecos[ev.alvo].tipo))
        if (vant) Som.tocar('vantagem', { lado: lado(ev.alvo) })
        if (ev.escudo > 0) this.numero(p.x + 30 * escala(ev.alvo), p.y + 18, { valor: ev.escudo, tipo: 'escudo', forca: 0, texto: `−${ev.escudo}` })
        if (ev.valor > 0 || !ev.escudo) this.numero(p.x, p.y, { valor: ev.valor, tipo: ev.critico ? 'critico' : 'dano', forca: limita(ev.valor / 180, 0, 1) })
        if (vant) this.marcaNoNumero(p.x, p.y) // tarefa 21: a etiqueta de vantagem aparece junto do número, no mesmo quadro
        if (forte && !calmo) this.tremer(ev.critico ? TREMIDA.critico : TREMIDA.forte) // peso do golpe (sem tremida com "Menos animação")
        if (ev.refletido) this.numero(p.x, p.y - 34, { tipo: 'texto', texto: 'Espinho!', forca: 0 })
        if (!calmo) {
          const tec = TECIDOS[v.bonecos[ev.alvo].tipo]?.base
          if (this.limiteFlash()) this.efeitos.impacto(p.x, p.meio, forte ? 2 : 1, { escala: escala(ev.alvo), corDoFiapo: tec })
          if (ev.critico) this.efeitos.costuraEstourando(p.x, p.meio, { chao: p.chao, escala: escala(ev.alvo) })
        }
        if (ev.critico) this.eventosVistos.critico++
        this.atualizarPlaca(ev.alvo)
        break
      }
      case 'autoDano': { const d = D[ev.alvo], p = topo(ev.alvo); if (d && p) { d.hp = Math.max(0, d.hp - ev.valor); this.numero(p.x, p.y, { valor: ev.valor, tipo: 'dano', forca: 0.1 }); this.atualizarPlaca(ev.alvo) } break }
      case 'tesoura': {
        const d = D[ev.alvo], p = topo(ev.alvo)
        if (d) d.hp = Math.max(0, d.hp - ev.valor)
        if (p) this.numero(p.x, p.y, { valor: ev.valor, tipo: 'dano', forca: 0.2 })
        const agora = performance.now()
        if (!this.fx.some((f) => f.k === 'tesoura' && agora - f.t0 < 700)) { this.fx.push({ k: 'tesoura', t0: agora, dur: 1100 }); Som.tesoura() }
        this.atualizarPlaca(ev.alvo)
        break
      }
      case 'errou': {
        Som.erroDoVeu(lado(ev.alvo))
        const p = topo(ev.alvo); if (!p) break
        this.numero(p.x, p.y, { tipo: 'texto', texto: 'Errou!', forca: 0.1 })
        if (!calmo) { this.efeitos.brilho(p.x, p.meio, '#B9A7E8', { escala: escala(ev.alvo) }); this.efeitos.fiapos(p.x, p.meio, '#EEE8FF', 8, { escala: escala(ev.alvo) }) }
        break
      }
      case 'escudo': {
        Som.escudo(lado(ev.alvo)); this.posar(ev.alvo, 'escudo')
        const p = topo(ev.alvo); if (p) { this.numero(p.x, p.y, { valor: ev.valor, tipo: 'escudo', forca: 0.1 }); if (!calmo) this.efeitos.brilho(p.x, p.y + 10, '#6EC1FF', { escala: escala(ev.alvo) }) }
        this.atualizarPlaca(ev.alvo, { escudo: ev.total })
        break
      }
      case 'quebraEscudo': { const p = topo(ev.alvo); if (p) this.numero(p.x, p.y + 20, { tipo: 'texto', texto: 'Dedal caiu', forca: 0 }); this.atualizarPlaca(ev.alvo, { escudo: 0 }); break }
      case 'cura': {
        Som.tocar('cura', { lado: lado(ev.alvo) })
        const d = D[ev.alvo], p = topo(ev.alvo)
        if (d) d.hp = Math.min(d.hp + ev.valor, v.bonecos[ev.alvo].vidaMax)
        if (p) { this.numero(p.x, p.y, { valor: ev.valor, tipo: 'cura', forca: 0.2 }); if (!calmo) this.efeitos.brilho(p.x, p.meio, '#6FCF6B', { escala: escala(ev.alvo) }) }
        this.atualizarPlaca(ev.alvo)
        break
      }
      case 'veu': { Som.tocar('escudo', { lado: lado(ev.alvo) }); const p = topo(ev.alvo); if (p) { this.numero(p.x, p.y, { tipo: 'texto', texto: 'Véu', forca: 0 }); if (!calmo) this.efeitos.brilho(p.x, p.meio, '#B9A7E8', { escala: escala(ev.alvo) }) } this.atualizarPlaca(ev.alvo); break }
      case 'fioSolto': { Som.tocar('fioSolto', { lado: lado(ev.alvo) }); const p = topo(ev.alvo); if (p) this.numero(p.x, p.y, { tipo: 'texto', texto: 'Fio Solto', forca: 0 }); this.atualizarPlaca(ev.alvo); break }
      case 'ultimoFio': {
        Som.ultimoFio(lado(ev.alvo))
        const d = D[ev.alvo]; if (d) d.hp = 0
        this.mudarEstado(ev.alvo, 'fio')
        const p = topo(ev.alvo); if (p) this.numero(p.x, p.y - 10, { tipo: 'texto', texto: 'Último Fio!', forca: 0.15 })
        this.atualizarPlaca(ev.alvo)
        break
      }
      case 'caiu': {
        Som.queda(lado(ev.alvo))
        const d = D[ev.alvo]; if (d) d.hp = 0
        this.mudarEstado(ev.alvo, 'caido')
        const p = topo(ev.alvo)
        if (p && !calmo) { this.efeitos.enchimento(p.x, p.meio, 16, { chao: p.chao, escala: escala(ev.alvo) }); this.efeitos.poeira(p.x, p.chao, 8, { escala: escala(ev.alvo) }) }
        this.atualizarPlaca(ev.alvo)
        break
      }
      case 'troca': {
        Som.tocar('trocarLugares', { lado: lado(ev.a) })
        for (const t of ['A', 'B']) { const l = this.lug[t].slice(), i = l.indexOf(ev.a), j = l.indexOf(ev.b); if (i >= 0 && j >= 0) { l[i] = ev.b; l[j] = ev.a; this.lug[t] = l } }
        break
      }
      case 'move': { // o motor manda os dois lugares (de → para) trocados
        const b = v.bonecos[ev.alvo]; if (!b) break
        Som.tocar('trocarLugares', { lado: b.time })
        const l = this.lug[b.time].slice(), o = l[ev.para]; l[ev.para] = ev.alvo; l[ev.de] = o; this.lug[b.time] = l
        break
      }
      default: break
    }
  }

  /** Tremida curta da cena (canvas e camada juntos), no golpe forte e no crítico. Nunca com "Menos animação". */
  tremer(px) {
    if (this.menos || !this.cv.animate) return
    const k = (f) => `translate(${(px * f).toFixed(1)}px, ${(px * f * -0.5).toFixed(1)}px)`
    const quadros = [{ transform: 'none' }, { transform: k(1) }, { transform: k(-0.8) }, { transform: k(0.5) }, { transform: k(-0.25) }, { transform: 'none' }]
    for (const e of [this.cv, this.camada]) e?.animate(quadros, { duration: TREMIDA.ms * this.vel, easing: 'linear' })
    this.tremidas.push({ px, t: performance.now() })
  }

  /** A etiqueta dourada de vantagem de tecido, presa ao lado do número de dano; some junto com ele. */
  marcaNoNumero(x, y) {
    if (!this.camada) return
    const m = criarMarcaDeVantagem(BONUS, { pequena: this.formato !== 'pc', descricao: `Vantagem de tecido: ${BONUS}` })
    m.classList.add('fz-arena__marca-golpe')
    m.style.left = limita(x + 30, 34, this.W - 60) + 'px'; m.style.top = limita(y - 34, 6, this.H - 30) + 'px'
    this.camada.append(m)
    this.marcasDeGolpe++
    const fora = () => m.remove()
    if (this.menos || !m.animate) setTimeout(fora, 900)
    else m.animate([{ opacity: 0, transform: 'scale(0.6) rotate(-10deg)' }, { opacity: 1, transform: 'scale(1) rotate(-4deg)', offset: 0.15 }, { opacity: 1, offset: 0.75 }, { opacity: 0, transform: 'translateY(-12px) rotate(-4deg)' }], { duration: 900, fill: 'both' }).finished.then(fora, fora)
  }

  numero(x, y, opcoes) {
    if (!this.camada) return
    const xx = limita(x, 34, this.W - 34), yy = limita(y, 26, this.H - 20)
    soltarNumero(this.camada, { ...opcoes, x: xx, y: yy }).catch(() => {})
  }

  limiteFlash() { // no máximo 3 por segundo (impactos no mesmo instante contam como um)
    const agora = performance.now()
    this.flashes = this.flashes.filter((t) => agora - t < 1000)
    if (this.flashes.length && agora - this.flashes[this.flashes.length - 1] < 130) return true
    if (this.flashes.length >= 3) return false
    this.flashes.push(agora); this.logFlash.push(agora); return true
  }

  /** Festa (fim da luta): flocos de enchimento. */
  soltar(x, y, n) { if (!this.menos) this.efeitos.enchimento(x, y, n, { chao: this.H - 10 }) }

  /** Fim da luta: o time vencedor comemora. */
  comemorar(time) { for (const id of this.lug[time] ?? []) { const d = this.D[id]; if (d && d.est === 'vivo') d.pose = { nome: 'vitoria', t0: performance.now() } } }

  /** Aventura: balões de intenção sobre os bonecos inimigos (ou null para esconder). */
  setIntencao(mapa) { this.intencao = mapa && Object.keys(mapa).length ? mapa : null }

  /** Marca quem pode ser tocado (anel dourado no pano), quem usa a carta e quem apanha mais (etiqueta "+25%"). */
  marcar({ alvos = [], usuario = null, vantagem = [], troca = null } = {}) {
    this.destaque = { alvos: new Set(alvos), usuario, vantagem: new Set(vantagem), trocaDe: troca }
    for (const [id, o] of Object.entries(this.sobre ?? {})) {
      const quer = this.destaque.vantagem.has(id)
      if (quer && !o.marca) { o.marca = criarMarcaDeVantagem(BONUS, { pequena: this.formato !== 'pc', descricao: `Apanha ${BONUS}` }); o.marca.classList.add('fz-arena__marca'); o.el.append(o.marca) }
      else if (!quer && o.marca) { o.marca.remove(); o.marca = null }
    }
  }

  // ------------------------------------------------------------------ placas (HTML por cima do canvas)

  atualizarPlacas() { for (const id of Object.keys(this.vista?.bonecos ?? {})) this.atualizarPlaca(id) }

  atualizarPlaca(id, extra = {}) {
    if (!this.camada || !this.vista) return
    this.sobre ??= {}
    let o = this.sobre[id]
    if (!o) {
      const caixa = document.createElement('div'); caixa.className = 'fz-arena__sobre'; caixa.dataset.id = id
      const placa = criarPlaca(); placa.el.classList.add('fz-arena__placa')
      caixa.append(placa.el); this.camada.append(caixa)
      o = this.sobre[id] = { el: caixa, placa, marca: null, x: null, y: null }
    }
    const b = this.vista.bonecos[id], d = this.D[id]
    const caido = (d?.est ?? b.estado) === 'caido'
    o.placa.definir({ vida: Math.max(0, Math.round(d?.hp ?? b.vida)), vidaMax: b.vidaMax, escudo: extra.escudo ?? b.escudo, marcas: marcasDoBoneco(b), caido, alerta: !caido && (d?.hp ?? b.vida) / b.vidaMax <= 0.25 })
    o.el.dataset.lado = b.time
    o.el.classList.toggle('fz-arena__sobre--caido', caido)
  }

  /** Põe cada placa embaixo do pé do seu boneco (só mexe no DOM quando a posição muda). */
  posicionarCamada(forcar = false) {
    if (!this.sobre || !this.L) return
    for (const [id, o] of Object.entries(this.sobre)) {
      const d = this.D[id], s = this.slot(id)
      if (!d || !s) continue
      // PC: a placa fica acima da cabeça (a mão sobe por cima do pé da cena); celular: embaixo do pé, na folga da cena
      const meia = this.formato === 'pc' ? 70 : 54
      const x = Math.round(limita(d.x, meia, this.W - meia))
      const y = Math.round(this.formato === 'pc' ? Math.max(4, d.y - s.altura * 1.04 - 52) : Math.min(d.y + s.ry * 0.5, this.H - 52))
      if (!forcar && x === o.x && y === o.y) continue
      o.x = x; o.y = y
      o.el.style.transform = `translate(${x}px, ${y}px)`
      o.el.style.setProperty('--alto', Math.round(s.altura) + 'px')
    }
  }

  // ------------------------------------------------------------------ desenho

  quadro() {
    this.raf = requestAnimationFrame(() => this.quadro())
    const t = performance.now(), dt = Math.min(50, t - this.tAnt); this.tAnt = t
    if (this.agenda.length) {
      const prontos = this.agenda.filter((a) => a.em <= t)
      if (prontos.length) { this.agenda = this.agenda.filter((a) => a.em > t); prontos.sort((a, b) => a.em - b.em).forEach((a) => a.fn()) }
    }
    if (!this.vista || !this.L || this.pronto === false || this.cv.offsetParent === null) return
    this.fx = this.fx.filter((f) => t - f.t0 < f.dur)
    if (this.menos && !this.calmo) this.efeitos.limpar() // "Menos animação" ligou: nada de partícula no ar
    this.calmo = this.menos
    this.efeitos.modoCalmo(this.menos)
    this.efeitos.atualizar(dt)
    this.desenhar(t)
    if (!this.vista.fim) this.picoPart = Math.max(this.picoPart, this.efeitos.contagem()) // a festa do fim não conta: é da folha do fim, não da luta
  }

  /** Degrau da Tesoura (0 a 3): desce um por turno nos 3 turnos antes do corte (só enfeite; o turno vem do motor). */
  degrauDaTesoura() {
    const turno = this.vista?.turno ?? 1, ini = REGRAS.tesouraInicio
    return limita(turno - (ini - 4), 0, 3)
  }

  estadoDaCena(t) {
    const corte = this.fx.find((f) => f.k === 'tesoura')
    return {
      formato: this.formato, turno: this.vista?.turno ?? 1, vezDe: this.vista?.fim ? null : this.vista?.vez, menosAnimacao: this.menos,
      tesoura: { degrau: this.degrauDaTesoura(), cortando: !!corte, progresso: corte ? (t - corte.t0) / corte.dur : 0 },
    }
  }

  desenhar(t) {
    const c = this.c, W = this.W, H = this.H, v = this.vista
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    const est = this.estadoDaCena(t)
    this.cena.desenhar(c, W, H, t, { ...est, semFrente: true })
    // suaviza posições (troca de lugar)
    for (const id of Object.keys(this.D)) {
      const d = this.D[id], s = this.slot(id); if (!s) continue
      const k = this.menos ? 1 : 0.2
      d.x += (s.x - d.x) * k; d.y += (s.y - d.y) * k
      if (Math.abs(s.x - d.x) < 0.3) d.x = s.x
      if (Math.abs(s.y - d.y) < 0.3) d.y = s.y
    }
    const ordem = Object.keys(this.D).filter((id) => v.bonecos[id] && this.slot(id)).sort((a, b) => this.D[a].y - this.D[b].y)
    for (const id of ordem) this.anel(c, id, t)
    this.desenhados = 0
    for (const id of ordem) this.boneco(c, id, t)
    this.efeitos.desenhar(c)
    this.cena.desenharFrente(c, W, H, t, est)
    if (this.intencao) for (const id of ordem) { const fala = this.intencao[id], d = this.D[id], s = this.slot(id); if (fala && d.est !== 'caido') this.balao(c, d.x, Math.max(26, d.y - s.altura * 0.98), fala) }
    this.posicionarCamada()
  }

  boneco(c, id, t) {
    const d = this.D[id], s = this.slot(id), b = this.vista.bonecos[id], rig = this.rigs[id]
    if (!rig) return
    let pose = d.base, prog = 1
    if (d.pose) {
      const [dur, segura] = POSE[d.pose.nome] ?? [400, 100], e = t - d.pose.t0
      if (e > dur + segura) d.pose = null
      else { pose = d.pose.nome; prog = limita(e / dur, 0, 1) }
    }
    if (pose === d.base && d.base !== 'parado') prog = limita((t - d.baseT0) / (d.base === 'caido' ? 450 : 900), 0, 1)
    const linha = this.vista.times[b.time]?.linha ?? 0
    this.desenhados++
    rig.desenhar(c, d.x, d.y, s.altura, t, { pose, progresso: prog, lado: b.time, menosAnimacao: this.menos, brilhoDaLinha: limita(linha / REGRAS.linhaMaxima, 0, 1), fioAteY: -20 })
  }

  /** Anel no pano sob o boneco: alvo da carta (ouro), quem usa a carta (azul do escudo), troca (linho). */
  anel(c, id, t) {
    const dest = this.destaque, alvo = dest.alvos.has(id), usa = dest.usuario === id, troca = dest.trocaDe === id
    if (!alvo && !usa && !troca) return
    const d = this.D[id], s = this.slot(id)
    c.save(); c.translate(d.x, d.y)
    c.setLineDash([9, 6]); c.lineDashOffset = this.menos ? 0 : -t / 40; c.lineCap = 'round'
    const cor = troca ? '#F2E6C9' : alvo ? '#FFC857' : '#6EC1FF'
    c.beginPath(); c.ellipse(0, 0, s.rx * 1.08, s.ry * 1.15, 0, 0, Math.PI * 2)
    c.fillStyle = alvo ? 'rgba(255,200,87,0.16)' : 'rgba(110,193,255,0.14)'; c.fill()
    c.lineWidth = 6; c.strokeStyle = '#140C1F'; c.stroke()
    c.lineWidth = 3; c.strokeStyle = cor; c.stroke()
    c.restore()
  }

  /** Balão de intenção do inimigo: "Frente 75" sobre a cabeça (o texto completo fica na faixa de baixo da tela). */
  balao(c, x, y, linhas) {
    c.save(); c.font = '800 13px Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
    const txt = linhas.slice(0, 2).join(' + '), w = Math.min(this.W - 8, c.measureText(txt).width + 34), h = 24
    const bx = limita(x - w / 2, 4, this.W - w - 4), by = y - h
    c.fillStyle = '#F2E6C9'; c.strokeStyle = '#140C1F'; c.lineWidth = 2
    c.beginPath(); c.roundRect(bx, by, w, h, 6); c.fill(); c.stroke()
    c.beginPath(); c.moveTo(x - 5, by + h); c.lineTo(x, by + h + 7); c.lineTo(x + 5, by + h); c.closePath(); c.fill(); c.stroke()
    c.strokeStyle = '#FF5A5F'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx + 8, by + 17); c.lineTo(bx + 18, by + 7); c.stroke() // agulha
    c.fillStyle = '#140C1F'; c.beginPath(); c.arc(bx + 18.5, by + 6.5, 1.6, 0, 6.3); c.fill()
    c.fillStyle = '#140C1F'; c.fillText(txt, bx + 17 + (w - 17) / 2, by + h / 2 + 0.5)
    c.restore()
  }
}
