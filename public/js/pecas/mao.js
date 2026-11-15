// Frayz — peça MÃO: as cartas em leque, sobrepostas e centralizadas (guia §7).
//   PC (largura ≥ 640): carta inteira de 132×185; a carta sob o mouse sobe e cresce 1,25×; clicar = escolher; teclas 1–7
//   (as teclas 1–9 valem para as cartas que houver; a mão do jogo guarda até 7).
//   Celular: carta mini (custo, desenho e nome); 5 a 7 cabem sem rolar, cada uma com faixa de toque ≥ 44 px;
//            tocar AMPLIA a carta no meio da tela, com o texto inteiro e o botão Jogar.
//   Animações: comprar (vem do baralho, virando), jogar (voa até um ponto em 220 ms, vira e se desfaz em fiapos), descartar.
// Sem regra: quem chama diz o estado de cada carta e recebe a escolha.
//
//   const mao = criarMao(container, opcoes)
//     opcoes = { baralho: elemento | {x, y}, palco: elemento onde a carta ampliada aparece (padrão: o body),
//                rotulo: 'Sua mão', rotuloJogar, rotuloDescartar, rotuloFechar, teclado: true, nomeDoTipo: (tipo) => texto }
//   mao.definir(cartas)          cartas = [{ id, dados, estado, motivo }]  (dados e estado: os mesmos de criarCarta/atualizarCarta;
//                                motivo = frase de quem chama para a carta que não pode ser jogada agora)
//   mao.aoEscolher(fn)           fn({ id, acao: 'escolher' | 'jogar', origem: 'mouse' | 'toque' | 'tecla' })
//   mao.voar(id, {x, y})         → Promise (a carta sai da mão e voa até o ponto da janela)
//   mao.descartar(id)            → Promise
//   mao.vezDoRival(sim)          abaixa a mão 30% (com cor)
//   mao.selecionar(id | null) · mao.ampliar(id) · mao.fecharAmpliada() · mao.medir() · mao.ligar(sim) · mao.destruir()
import { animar, el, menosAnimacao } from './base.js'
import { atualizarCarta, criarCarta } from './carta.js'
import { criarBotao } from './botao.js'
import { corDoTecido } from './arte-adaptador.js'

const limitar = (v, a, b) => Math.max(a, Math.min(b, v))
const LARGURA_INTEIRA = 132, LARGURA_MINI = 88, MINI_MINIMA = 64, FAIXA_DE_TOQUE = 44, MAO_MAXIMA = 900

export function criarMao(container, opcoes = {}) {
  const raiz = el('div', 'fz-mao'); raiz.setAttribute('role', 'group'); raiz.setAttribute('aria-label', opcoes.rotulo ?? 'Sua mão')
  const ancora = el('div', 'fz-mao__ancora'); raiz.append(ancora)
  container.append(raiz)

  const itens = new Map() // id → { id, dados, estado, motivo, el, variante, largura }
  let ordem = [], ouvinte = null, rival = false, selecionada = null, ligada = true
  let lupa = null, ultimoPonteiro = 'mouse', primeira = true, destruida = false, geometria = { variante: 'mao', L: LARGURA_INTEIRA }

  // ---------------------------------------------------------------- leque

  function medidas() {
    const Wc = raiz.clientWidth || container.clientWidth || 360, n = Math.max(1, ordem.length), meio = (n - 1) / 2
    let g
    if (Wc >= 640) {
      const L = LARGURA_INTEIRA, util = Math.min(Wc - 32, MAO_MAXIMA)
      // sobreposição pequena (12 px): a carta de cima cobre só a moldura da vizinha, nunca o texto
      g = { variante: 'mao', L, passo: n > 1 ? Math.min(L - 12, (util - L) / (n - 1)) : 0, giro: Math.min(2.2, 15 / n), curva: 1.9, respiro: 10 }
    } else {
      const util = Wc - 28 // a carta parada fica a 14 px da borda
      // a carta encolhe quando a mão cresce: cada uma mostra pelo menos 62% e a faixa de toque nunca fica abaixo de 44 px
      const L = limitar(Math.floor(Math.min(util - (n - 1) * FAIXA_DE_TOQUE, util / (1 + 0.62 * (n - 1)))), MINI_MINIMA, LARGURA_MINI)
      g = { variante: 'mini', L, passo: n > 1 ? Math.min(L - 4, (util - L) / (n - 1)) : 0, giro: Math.min(1.6, 10 / n), curva: 1.1, respiro: 8 }
    }
    // o leque só gira o quanto a margem deixa: o canto da carta da ponta (e o carretel) nunca encosta na borda
    const sobra = Math.max(0, (Wc - (g.L + g.passo * (n - 1))) / 2 - g.respiro)
    const giroMaximo = (Math.asin(Math.min(1, sobra / (g.L * 1.4))) * 180) / Math.PI
    if (meio > 0) g.giro = Math.min(g.giro, giroMaximo / meio)
    return g
  }

  function nascer(it, g) {
    const antigo = it.el
    it.el = criarCarta(it.dados, { variante: g.variante, largura: g.L, nomeDoTipo: opcoes.nomeDoTipo?.(it.dados.tipo) })
    it.variante = g.variante; it.largura = g.L
    it.el.dataset.mao = it.id
    it.el.addEventListener('pointerdown', (e) => { ultimoPonteiro = e.pointerType === 'mouse' ? 'mouse' : 'toque' })
    it.el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') focar(it.id) })
    it.el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') focar(null) })
    it.el.addEventListener('focus', () => { if (it.el.matches(':focus-visible')) focar(it.id) })
    it.el.addEventListener('blur', () => focar(null))
    it.el.addEventListener('click', (ev) => {
      if (!ligada) return
      const origem = ev.detail === 0 ? 'tecla' : ultimoPonteiro // Enter ou Espaço na carta com foco
      if (origem === 'toque') ampliar(it.id)
      else emitir(it.id, 'escolher', origem)
    })
    if (antigo) antigo.replaceWith(it.el); else ancora.append(it.el)
  }

  function arrumar() {
    if (destruida) return
    const g = geometria = medidas(), n = ordem.length
    raiz.dataset.variante = g.variante
    raiz.style.setProperty('--fz-carta-l', g.L + 'px')
    const meio = (n - 1) / 2, alto = g.L * 1.4
    raiz.style.height = Math.ceil(alto + meio * meio * g.curva + (g.variante === 'mao' ? 22 : 16)) + 'px'
    ordem.forEach((id, i) => {
      const it = itens.get(id), d = i - meio
      if (!it.el || it.variante !== g.variante || it.largura !== g.L) nascer(it, g)
      const s = it.el.style
      // o arco sobe no meio: as cartas das pontas ficam na linha de base e nenhuma desce abaixo dela
      s.setProperty('--x', (d * g.passo).toFixed(1) + 'px'); s.setProperty('--y', ((d * d - meio * meio) * g.curva).toFixed(1) + 'px')
      s.setProperty('--r', (d * g.giro).toFixed(2) + 'deg'); s.setProperty('--z', String(i + 1))
      it.el.dataset.indice = String(i + 1)
      atualizarCarta(it.el, { jogavel: false, semLinha: false, fiapo: false, ...it.estado, selecionada: selecionada === id, vezDoRival: rival })
    })
    raiz.dataset.rival = rival ? '1' : '0'
    raiz.dataset.cartas = String(n)
  }

  function focar(id) {
    const f = id == null ? -1 : ordem.indexOf(id)
    ordem.forEach((x, i) => {
      const e = itens.get(x)?.el
      if (!e) return
      e.classList.toggle('fz-foco', i === f)
      e.style.setProperty('--abre', f < 0 || i === f ? '0px' : (i < f ? -1 : 1) * (geometria.variante === 'mao' ? 18 : 0) + 'px')
    })
  }

  function emitir(id, acao, origem) { if (ouvinte && itens.has(id)) ouvinte({ id, acao, origem }) }

  // ---------------------------------------------------------------- dados

  function definir(cartas) {
    const vivos = new Set(cartas.map((c) => c.id)), novos = []
    for (const [id, it] of itens) if (!vivos.has(id)) { it.el?.remove(); itens.delete(id) }
    ordem = cartas.map((c) => c.id)
    for (const c of cartas) {
      const it = itens.get(c.id)
      if (it) { it.estado = c.estado ?? {}; it.motivo = c.motivo ?? null; if (it.dados !== c.dados) { it.dados = c.dados; it.variante = null } }
      else { itens.set(c.id, { id: c.id, dados: c.dados, estado: c.estado ?? {}, motivo: c.motivo ?? null, el: null }); novos.push(c.id) }
    }
    if (selecionada && !itens.has(selecionada)) selecionada = null
    arrumar()
    if (!primeira || opcoes.animarPrimeira) novos.forEach((id, k) => chegar(id, k))
    primeira = false
    if (lupa && !itens.has(lupa.id)) fecharAmpliada()
  }

  function pontoDoBaralho() {
    const b = opcoes.baralho
    if (b && typeof b.getBoundingClientRect === 'function') { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }
    if (b && typeof b.x === 'number') return b
    const r = raiz.getBoundingClientRect(); return { x: r.left + 24, y: r.bottom - 24 }
  }

  /** COMPRAR: a carta vem do baralho, de costas, e vira no caminho. */
  function chegar(id, k) {
    const it = itens.get(id)
    if (!it?.el || menosAnimacao()) return
    const r = it.el.getBoundingClientRect(), p = pontoDoBaralho()
    const dx = p.x - (r.left + r.width / 2), dy = p.y - (r.top + r.height / 2)
    const base = 'translate(calc(var(--x) + %Xpx), calc(var(--y) + %Ypx))'
    const em = (fx, fy) => base.replace('%X', (dx * fx).toFixed(1)).replace('%Y', (dy * fy).toFixed(1))
    it.el.classList.add('fz-carta--de-costas')
    const atraso = k * 90
    setTimeout(() => it.el?.classList.remove('fz-carta--de-costas'), atraso + 170)
    animar(it.el, [
      { transform: `${em(1, 1)} rotate(-22deg) scale(0.42)`, opacity: 0.4, offset: 0 },
      { transform: `${em(0.42, 0.5)} rotate(-8deg) scale(0.04, 0.8)`, opacity: 1, offset: 0.5 },
      { transform: 'translate(var(--x), var(--y)) rotate(var(--r)) scale(1)', opacity: 1, offset: 1 },
    ], { duration: 340, delay: atraso, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' })
  }

  function tirar(id) {
    const it = itens.get(id)
    if (!it) return null
    itens.delete(id); ordem = ordem.filter((x) => x !== id)
    if (selecionada === id) selecionada = null
    if (lupa?.id === id) fecharAmpliada()
    return it
  }

  /** Fiapos: pedacinhos de linha que saltam e somem (no máximo 12; nenhum com "Menos animação"). */
  function fiapos(x, y, tipo) {
    if (menosAnimacao()) return
    const cor = corDoTecido(tipo), cores = [cor.base, cor.luz, '#F2E6C9', '#FF4D8D']
    for (let i = 0; i < 12; i++) {
      const f = el('i', 'fz-fiapo'); f.style.left = x + 'px'; f.style.top = y + 'px'; f.style.background = cores[i % cores.length]
      f.style.width = 8 + Math.random() * 12 + 'px'
      document.body.append(f)
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.5, dist = 26 + Math.random() * 44, giro = Math.random() * 360
      animar(f, [
        { transform: `translate(-50%, -50%) rotate(${giro}deg) scale(1)`, opacity: 1 },
        { transform: `translate(calc(-50% + ${(Math.cos(a) * dist).toFixed(1)}px), calc(-50% + ${(Math.sin(a) * dist + 18).toFixed(1)}px)) rotate(${giro + 160}deg) scale(0.5)`, opacity: 0 },
      ], { duration: 380 + Math.random() * 140, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'forwards' }).then(() => f.remove())
    }
  }

  /** JOGAR: voa da mão até o ponto (220 ms), vira e se desfaz em fiapos. */
  async function voar(id, ponto) {
    const it = tirar(id)
    if (!it?.el) { arrumar(); return }
    const e = it.el, r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const alto = it.largura * 1.4
    document.body.append(e)
    e.classList.remove('fz-foco'); e.classList.add('fz-carta--voando')
    e.style.left = cx - it.largura / 2 + 'px'; e.style.top = cy - alto / 2 + 'px'
    arrumar()
    const dx = (ponto?.x ?? cx) - cx, dy = (ponto?.y ?? cy - 160) - cy
    if (menosAnimacao()) { // troca por esmaecer
      await e.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }).finished.catch(() => {})
      e.remove(); return
    }
    const fim = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(-7deg)`
    await animar(e, [{ transform: 'translate(0,0) rotate(0deg) scale(1.06)' }, { transform: `${fim} scale(0.6)` }], { duration: 220, easing: 'cubic-bezier(.45,0,.75,.45)', fill: 'forwards' })
    await animar(e, [{ transform: `${fim} scale(0.6)`, opacity: 1 }, { transform: `${fim} scale(0.02, 0.62)`, opacity: 0.7 }], { duration: 110, easing: 'ease-in', fill: 'forwards' })
    fiapos(cx + dx, cy + dy, it.dados.tipo)
    e.remove()
  }

  /** DESCARTAR: a carta cai da mão e some (o fiapo ainda solta linha). */
  async function descartar(id) {
    const it = tirar(id)
    if (!it?.el) { arrumar(); return }
    const e = it.el, r = e.getBoundingClientRect()
    e.style.pointerEvents = 'none'
    arrumar() // as outras já fecham o leque enquanto esta cai
    if ((e.dataset.estado ?? '').includes('fiapo')) fiapos(r.left + r.width / 2, r.top + r.height / 2, it.dados.tipo)
    if (menosAnimacao()) await e.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }).finished.catch(() => {})
    else await animar(e, [{ opacity: 1 }, { transform: 'translate(var(--x), calc(var(--y) + 96px)) rotate(calc(var(--r) + 16deg)) scale(0.82)', opacity: 0 }], { duration: 240, easing: 'ease-in', fill: 'forwards' })
    e.remove()
  }

  // ---------------------------------------------------------------- carta ampliada (toque)

  function ampliar(id) {
    const it = itens.get(id)
    if (!it) return
    fecharAmpliada()
    const palco = opcoes.palco ?? document.body, naTela = palco === document.body
    const pw = naTela ? window.innerWidth : palco.clientWidth, ph = naTela ? window.innerHeight : palco.clientHeight
    const L = Math.round(limitar(Math.min(pw - 72, (ph - 176) * 5 / 7), 180, 300))
    const fundo = el('div', 'fz-lupa' + (naTela ? ' fz-lupa--tela' : '')); fundo.setAttribute('role', 'dialog'); fundo.setAttribute('aria-modal', 'true'); fundo.setAttribute('aria-label', it.dados.nome)
    const caixa = el('div', 'fz-lupa__caixa')
    const e = it.estado ?? {}, fiapo = !!e.fiapo, pode = ligada && !rival && (!!e.jogavel || fiapo)
    const carta = criarCarta(it.dados, { variante: 'ampliada', largura: L, tag: 'div', nomeDoTipo: opcoes.nomeDoTipo?.(it.dados.tipo), estado: { ...e, selecionada: false, vezDoRival: false } })
    const acoes = el('div', 'fz-lupa__acoes')
    const jogar = criarBotao({ rotulo: fiapo ? (opcoes.rotuloDescartar ?? 'Descartar') : (opcoes.rotuloJogar ?? 'Jogar'), variante: 'principal', desligado: !pode })
    jogar.classList.add('fz-lupa__jogar')
    const fechar = criarBotao({ rotulo: opcoes.rotuloFechar ?? 'Fechar', variante: 'secundario' })
    fechar.classList.add('fz-lupa__fechar')
    acoes.append(fechar, jogar)
    caixa.append(carta)
    if (!pode && it.motivo) { const m = el('p', 'fz-lupa__motivo', it.motivo); m.setAttribute('role', 'note'); caixa.append(m) }
    caixa.append(acoes)
    fundo.append(caixa)
    jogar.addEventListener('click', () => { if (!pode) return; fecharAmpliada(); emitir(id, 'jogar', 'toque') })
    fechar.addEventListener('click', () => fecharAmpliada())
    fundo.addEventListener('click', (ev) => { if (ev.target === fundo) fecharAmpliada() })
    palco.append(fundo)
    lupa = { id, fundo, devolver: document.activeElement }
    animar(caixa, [{ transform: 'translateY(24px) scale(0.86)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'cubic-bezier(.2,.9,.3,1.2)' })
    ;(pode ? jogar : fechar).focus({ preventScroll: true })
  }

  function fecharAmpliada() {
    if (!lupa) return
    const l = lupa; lupa = null
    l.fundo.remove()
    try { l.devolver?.focus?.({ preventScroll: true }) } catch { /* o elemento pode ter saído */ }
  }

  // ---------------------------------------------------------------- teclado: 1–7 escolhe a carta, Esc fecha a ampliada
  // (setas, Enter, Espaço e T são da tela da luta: escolhem o alvo, jogam, passam e trocam — guia §9)

  function tecla(ev) {
    if (destruida || ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) return
    const t = ev.target
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
    if (ev.key === 'Escape' && lupa) { ev.preventDefault(); fecharAmpliada(); return }
    if (!ligada || lupa || opcoes.teclado === false) return
    if (/^[1-9]$/.test(ev.key)) {
      const id = ordem[Number(ev.key) - 1]
      if (id == null) return
      ev.preventDefault()
      itens.get(id).el.focus({ preventScroll: true }); focar(id)
      emitir(id, 'escolher', 'tecla')
    }
  }
  document.addEventListener('keydown', tecla)

  const olho = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { const g = medidas(); if (g.variante !== geometria.variante || g.L !== geometria.L || g.passo !== geometria.passo) arrumar() }) : null
  olho?.observe(container)

  return {
    el: raiz,
    definir,
    aoEscolher(fn) { ouvinte = fn },
    voar, descartar, ampliar, fecharAmpliada,
    vezDoRival(sim) { rival = !!sim; arrumar() },
    selecionar(id) { selecionada = id ?? null; arrumar() },
    ligar(sim) { ligada = !!sim },
    medir: arrumar,
    /** Elemento da carta na mão (para testes e para medir de onde ela sai). */
    cartaEl: (id) => itens.get(id)?.el ?? null,
    ids: () => ordem.slice(),
    destruir() { destruida = true; document.removeEventListener('keydown', tecla); olho?.disconnect(); fecharAmpliada(); raiz.remove() },
  }
}
