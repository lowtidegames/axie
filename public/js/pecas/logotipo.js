// Frayz — peça LOGOTIPO, desenhado por código (guia §8): cada letra é um retalho de um tecido, com contorno,
// pesponto e volume; o "z" se desfia num fio solto, cor da maldição, que ondula. Com "Menos animação" o fio fica parado.
// O tecido de cada letra vem do adaptador de arte (o mesmo das cartas e do bastidor).
//
//   criarLogotipo({ altura = 96, texto = 'Frayz', tecidos, animado = true }) → { el, desenhar(), parar() }
import { densidade, el, menosAnimacao, sorte, svg } from './base.js'
import * as arte from './arte-adaptador.js'

const GIRO = [-5, 3.5, -2.5, 4, -3], SOBE = [0, 0.03, -0.02, 0.025, 0]

export function criarLogotipo({ altura = 96, texto = 'Frayz', tecidos = ['jeans', 'seda', 'la', 'feltro', 'tule', 'couro'], animado = true } = {}) {
  const raiz = el('span', 'fz-logo'); raiz.setAttribute('role', 'img'); raiz.setAttribute('aria-label', texto)
  const cv = document.createElement('canvas'); cv.className = 'fz-logo__letras'
  const fioBorda = svg('path', { class: 'fz-logo__fio-borda' }), fio = svg('path', { class: 'fz-logo__fio' })
  const solto = svg('svg', { class: 'fz-logo__solto', 'aria-hidden': 'true', focusable: 'false' }, [fioBorda, fio])
  raiz.append(cv, solto)
  let quadro = 0, vivo = true, ponta = null, W = 0, H = 0

  async function desenhar() {
    const fs = altura * 0.82, fonte = `400 ${fs}px "Lilita One", system-ui, sans-serif`
    try { await document.fonts.load(fonte, texto) } catch { /* segue com a reserva */ }
    await arte.pronta
    const d = densidade(), letras = [...texto]
    const medida = document.createElement('canvas').getContext('2d'); medida.font = fonte
    const larg = letras.map((ch) => medida.measureText(ch).width)
    // onde cada letra começa: a largura do pedaço anterior da palavra (respeita o ajuste de cada par de letras da fonte)
    const beira = altura * 0.16, aperto = 0.95 // as letras se encostam um pouco, como retalhos sobrepostos
    const inicio = letras.map((_, i) => medida.measureText(letras.slice(0, i).join('')).width * aperto)
    const total = inicio[letras.length - 1] + larg[letras.length - 1]
    const rabo = altura * 0.95 // espaço para o fio solto
    W = Math.ceil(beira * 2 + total + rabo); H = Math.ceil(altura * 1.16)
    cv.width = Math.round(W * d); cv.height = Math.round(H * d)
    raiz.style.width = W + 'px'; raiz.style.height = H + 'px'
    solto.setAttribute('viewBox', `0 0 ${W} ${H}`)
    const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H)
    const base = altura * 0.86
    let x = beira
    letras.forEach((ch, i) => {
      x = beira + inicio[i]
      const w = larg[i], tipo = tecidos[i % tecidos.length], m = fs * 0.3
      // o retalho da letra, pintado à parte: tecido → pesponto → volume
      const tmp = document.createElement('canvas'); tmp.width = Math.ceil((w + m * 2) * d); tmp.height = Math.ceil((fs * 1.3 + m) * d)
      const o = tmp.getContext('2d'); o.setTransform(d, 0, 0, d, 0, 0); o.font = fonte; o.textBaseline = 'alphabetic'; o.lineJoin = 'round'; o.lineCap = 'round'
      const by = fs * 1.02, trama = o.createPattern(arte.padraoDoTecido(tipo, Math.round(48 * d)), 'repeat')
      trama.setTransform(new DOMMatrix().scale(1 / d))
      o.fillStyle = trama; o.fillText(ch, m, by)
      o.globalCompositeOperation = 'source-atop'
      o.setLineDash([fs * 0.058, fs * 0.05]); o.strokeStyle = '#F2E6C9'; o.lineWidth = fs * 0.118; o.strokeText(ch, m, by)
      o.setLineDash([]); o.strokeStyle = trama; o.lineWidth = fs * 0.078; o.strokeText(ch, m, by)
      const g = o.createLinearGradient(0, by - fs * 0.8, w + m * 2, by + fs * 0.1)
      g.addColorStop(0, 'rgba(255,238,196,0.30)'); g.addColorStop(0.42, 'rgba(255,238,196,0)'); g.addColorStop(1, 'rgba(20,12,31,0.42)')
      o.fillStyle = g; o.fillRect(0, 0, w + m * 2, fs * 1.3 + m)
      // na tela: sombra, contorno de tinta e o retalho por cima, cada letra um pouco torta
      c.save(); c.translate(x + w / 2, base + SOBE[i % SOBE.length] * fs); c.rotate((GIRO[i % GIRO.length] * Math.PI) / 180)
      c.font = fonte; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'
      c.strokeStyle = '#140C1F'; c.fillStyle = '#140C1F'
      c.lineWidth = fs * 0.1; c.strokeText(ch, -w / 2, fs * 0.055); c.fillText(ch, -w / 2, fs * 0.055) // sombra dura embaixo
      c.lineWidth = fs * 0.105; c.strokeText(ch, -w / 2, 0)
      c.drawImage(tmp, -w / 2 - m, -by, w + m * 2, fs * 1.3 + m)
      c.restore()
    })
    // o "z" se desfia: fiapos curtos do próprio tecido e o fio da maldição que sai dele
    const fimDoZ = x + larg[larg.length - 1] - fs * 0.05
    ponta = { x: fimDoZ, y: base - fs * 0.07 }
    const R = sorte(41), cor = arte.corDoTecido(tecidos[(letras.length - 1) % tecidos.length])
    c.lineCap = 'round'
    for (let i = 0; i < 5; i++) {
      const a = -0.5 + i * 0.26 + R() * 0.1, l = fs * (0.12 + R() * 0.12)
      const x1 = ponta.x + Math.cos(a) * l, y1 = ponta.y + Math.sin(a) * l - fs * 0.02 * i
      c.beginPath(); c.moveTo(ponta.x - fs * 0.04, ponta.y - fs * 0.02 * i); c.quadraticCurveTo(ponta.x + l * 0.5, ponta.y - fs * 0.05 * (i - 2), x1, y1)
      c.strokeStyle = '#140C1F'; c.lineWidth = fs * 0.05; c.stroke(); c.strokeStyle = i % 2 ? cor.luz : cor.base; c.lineWidth = fs * 0.024; c.stroke()
    }
    ondular(0)
    cancelAnimationFrame(quadro)
    if (animado) quadro = requestAnimationFrame(passo)
  }

  function ondular(fase) {
    if (!ponta) return
    const comprimento = altura * 0.82, amp = altura * 0.13
    let dTxt = ''
    for (let i = 0; i <= 28; i++) {
      const s = i / 28
      const px = ponta.x + s * comprimento * 0.9 + Math.sin(s * 5.2 + fase * 0.6) * amp * 0.25 * s
      const py = ponta.y - s * altura * 0.3 + Math.sin(s * 7.4 - fase) * amp * s + Math.sin(s * 3.1 + fase * 0.5) * amp * 0.5 * s
      dTxt += `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`
    }
    fio.setAttribute('d', dTxt); fioBorda.setAttribute('d', dTxt)
  }

  let ultimo = 0
  function passo(agora) {
    if (!vivo) return
    if (!raiz.isConnected) { quadro = 0; return } // saiu da tela: para; quem puser de volta chama desenhar()
    if (agora - ultimo > 33) { ultimo = agora; ondular(menosAnimacao() ? 0 : agora / 520) }
    quadro = requestAnimationFrame(passo)
  }

  desenhar()
  return { el: raiz, desenhar, parar() { vivo = false; cancelAnimationFrame(quadro) } }
}
