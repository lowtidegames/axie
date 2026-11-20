// Keepmile — telas simples por cima do jogo: menu (logo, liga, som e volumes, Reduced motion, álbum, conquistas, melhores partidas,
// partida nova), ÁLBUM, CONQUISTAS (com medalha, o que dá e a data), BEST RUNS (liga provisória do beta + as melhores partidas), a
// pergunta de sair e a do link de amigo. Tudo na LETRA DO JOGO (as fontes em pixel do atlas, desenhadas em canvas) e no mesmo
// acabamento das cartas (painel e botões do atlas). Fecham por 4 jeitos: X, Esc, botão de baixo e toque fora.
import { LIGAS, ligaDe, mediaDasMelhores } from './ligas.js'
import { CONQUISTAS, T } from './textos.js'

const ALTURA = { reino: [7, 9], 'reino-contorno': [9, 11], 'reino-ouro': [9, 11], mini: [5, 7], 'mini-contorno': [7, 8], 'mini-ouro': [7, 8] } // [altura da letra, passo da linha]
const CINZA = '#CECAD8'

export function criarTelas({ CONFIG, Arte, Guarda, Som, Musica, menos, novaPartida, emPartida, aoFechar }) {
  const fundo = document.getElementById('tela'), caixa = document.getElementById('telaCaixa'), COR = Arte.COR
  let aberta = null, engole = false, engoleAte = 0, vestida = false
  const h = (tag, attrs = {}, filhos = []) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'texto') e.textContent = v; else if (k === 'clique') e.addEventListener('click', v); else e.setAttribute(k, v) } for (const f of [].concat(filhos)) if (f) e.appendChild(f); return e }
  /** Largura útil da caixa, em px de tela. */
  const LARG = () => Math.max(160, Math.min(innerWidth - 24, 560) - 40)
  const quebrar = (s, larg, fonte) => { const out = []; let lin = ''; for (const p of String(s).split(' ')) { const t = lin ? lin + ' ' + p : p; if (Arte.largura(t, fonte) > larg && lin) { out.push(lin); lin = p } else lin = t } if (lin) out.push(lin); return out }
  const limpo = (s) => String(s).replace(/\s*·\s*/g, ' - ').replace(/‹/g, '<').replace(/×/g, 'x').replace(/★/g, '*')
  /** LETRA DO JOGO: o texto desenhado com a fonte em pixel do atlas, num canvas ampliado ×k sem suavizar. O texto de verdade fica no
   *  elemento, escondido da vista (leitor de tela, copiar e os testes leem dali). `larg` = largura máxima em px de tela (quebra). */
  function letra(texto, { fonte = 'reino', k = 2, cor = COR.creme, larg = 0, classe = '', id = '' } = {}) {
    const [alt, passo] = ALTURA[fonte] || ALTURA.reino, s = limpo(texto), lin = larg ? quebrar(s, Math.floor(larg / k), fonte) : [s]
    if (!lin.length) lin.push('')
    const w = Math.max(1, ...lin.map((l) => Arte.largura(l, fonte))), c = Arte.miniatura(w, (lin.length - 1) * passo + alt, (g) => lin.forEach((l, i) => Arte.texto(g, l, 0, i * passo, { fonte, cor })), k)
    c.setAttribute('aria-hidden', 'true')
    const e = h('span', { class: 'km-letra ' + classe, 'data-fonte': fonte }, [c, h('span', { class: 'km-sr', texto })])
    if (id) e.id = id
    return e
  }
  const linha = (texto, opc = {}) => { const p = h('p', { class: 'km-linha ' + (opc.classe || '') }, [letra(texto, { fonte: 'mini', larg: LARG(), ...opc, classe: '' })]); if (opc.pid) p.id = opc.pid; return p }
  const bt = (texto, clique, cls = '') => h('button', { type: 'button', class: 'km-bt ' + cls, clique: () => { Som.tocar('toque'); clique() } }, [letra(texto, { larg: LARG() - 30 })])
  /** O acabamento do atlas (painel de 9 fatias e botões) vira imagem de borda das caixas e dos botões em HTML. */
  function vestir() {
    if (vestida) return; vestida = true
    const url = (w, hh, f) => { const c = Arte.miniatura(w, hh, f, 1); return `url(${c.toDataURL('image/png')})` }
    fundo.style.setProperty('--km-painel', url(24, 24, (g) => Arte.painel(g, 0, 0, 24, 24)))
    for (const cor of ['green', 'plum', 'red']) { fundo.style.setProperty('--km-bt-' + cor, url(96, 26, (g) => Arte.botao(g, cor, 0, 0, 96, 26, false))); fundo.style.setProperty('--km-bt-' + cor + '-ap', url(96, 26, (g) => Arte.botao(g, cor, 0, 0, 96, 26, true))) }
  }
  function abrir(nome, titulo, corpo, cabeca = null) {
    vestir(); aberta = nome
    const raiz = nome === 'menu' || nome === 'sair' || nome === 'amigo'
    const tit = h('h2', { id: 'telaTitulo' }, [letra(titulo, { fonte: 'reino-ouro', k: 3, larg: LARG() - 50 })])
    const x = h('button', { type: 'button', class: 'km-x', 'aria-label': T.menu.fechar, clique: fechar }, [letra('x', { k: 3 })])
    const pe = bt(nome === 'amigo' ? T.amigo.nao : raiz ? T.menu.fechar : '< ' + T.menu.titulo, raiz ? fechar : () => menu(true), 'km-bt--fraco'); pe.id = 'telaPe'
    if (!raiz) pe.setAttribute('aria-label', T.menu.voltar)
    caixa.replaceChildren(h('header', { class: 'km-tela-topo' }, [cabeca || tit, x]), ...corpo, h('footer', {}, [pe]))
    fundo.hidden = false; fundo.dataset.tela = nome; caixa.scrollTop = 0
    x.focus()
  }
  function fechar() { if (!aberta) return; aberta = null; fundo.hidden = true; aoFechar() }
  // Toque fora fecha. O MESMO toque que fechou não reabre o menu (o dedo sobe em cima do ícone); um toque novo, logo depois, abre.
  fundo.addEventListener('pointerdown', (ev) => { if (ev.target === fundo) { fechar(); engole = true; engoleAte = performance.now() + 1500 } })
  addEventListener('pointerup', () => { if (engole) { engole = false; engoleAte = performance.now() + 120 } }, true)
  const emblema = (nome, k = 2) => Arte.miniatura(27, 30, (g) => { if (!Arte.liga(g, nome, 0, 0)) Arte.icone(g, 'shield', 8, 9) }, k)
  const situacao = () => { const melhores = Guarda.get('melhores'), media = mediaDasMelhores(melhores); return { melhores, media, ...ligaDe(media) } }

  /** `forcar`: vindo de dentro de outra tela. Sem isso, o toque que acabou de FECHAR o menu (fora da caixa, em cima do ícone) não o reabre. */
  function menu(forcar = false) {
    if (!forcar && performance.now() < engoleAte) return
    const liga = (rot, valor, trocar, id) => {
      const estado = (v) => letra(v ? T.menu.ligado : T.menu.desligado, { fonte: 'reino', cor: v ? COR.ouro : CINZA, classe: 'km-valor' })
      const b = h('button', { type: 'button', class: 'km-bt km-bt--fraco km-liga', id, 'aria-pressed': String(valor), clique: () => { const v = trocar(); b.setAttribute('aria-pressed', String(v)); b.lastChild.replaceWith(estado(v)); Som.tocar('toque') } }, [letra(rot), estado(valor)])
      return b
    }
    /** Volume em 5 degraus (música e efeitos), além do mudo. */
    const volume = (rot, qual, id) => {
      const pinos = h('span', { class: 'km-pinos', role: 'img', id: id + 'Nivel' })
      const pintar = () => { const n = Math.round(Som.volume(qual) * 5); pinos.replaceChildren(...[0, 1, 2, 3, 4].map((i) => h('i', { class: i < n ? 'km-on' : '' }))); pinos.setAttribute('aria-label', `${rot} ${n}/5`); pinos.dataset.nivel = String(n) }
      const passo = (d) => () => { Som.volume(qual, Math.round(Som.volume(qual) * 5 + d) / 5); pintar(); Som.tocar('toque') }
      pintar()
      return h('div', { class: 'km-vol', id }, [letra(rot), h('span', { class: 'km-vol-botoes' }, [
        h('button', { type: 'button', class: 'km-bt km-bt--fraco km-mini', id: id + 'Menos', 'aria-label': T.menu.menosVol(rot), clique: passo(-1) }, [letra('-', { k: 3 })]), pinos,
        h('button', { type: 'button', class: 'km-bt km-bt--fraco km-mini', id: id + 'Mais', 'aria-label': T.menu.maisVol(rot), clique: passo(1) }, [letra('+', { k: 3 })])])])
    }
    const s = situacao()
    // liga e recorde à vista no menu (um toque abre as melhores partidas)
    const chapa = h('button', { type: 'button', class: 'km-bt km-bt--fraco km-chapa', id: 'mLiga', clique: () => { Som.tocar('toque'); ranking() } }, [emblema(s.liga.nome, 1), h('span', {}, [letra(s.liga.nome, { fonte: 'reino-ouro' }), letra(`${T.menu.melhores}: ${Guarda.get('recorde')} · ${T.menu.media(s.media)}`, { fonte: 'mini', cor: CINZA, larg: LARG() - 70 })])])
    const corpo = [
      chapa,
      liga(T.menu.som, !Som.mudo(), () => !Som.alternarMudo(), 'mSom'),
      volume(T.menu.musica, 'musica', 'mMusica'), volume(T.menu.efeitos, 'efeitos', 'mEfeitos'),
      liga(T.menu.movimento, menos(), () => menos(!menos()), 'mMenos'),
      bt(T.menu.album, album), bt(T.menu.conquistas, conquistas), bt(T.menu.ranking, ranking),
    ]
    if (emPartida()) {
      const nova = bt(T.menu.nova, () => { nova.replaceWith(h('div', { class: 'km-confirma' }, [linha(T.menu.novaConfirma, { fonte: 'reino', larg: LARG() - 20 }), bt(T.menu.sim, () => { fechar(); novaPartida() }, 'km-bt--perigo'), bt(T.menu.nao, () => menu(true), 'km-bt--fraco')])) }, 'km-bt--fraco')
      nova.id = 'mNova'; corpo.push(nova)
    }
    const logo = Arte.miniatura(118, 24, (g) => Arte.logo(g, 'medium', 59, 0), 2); logo.id = 'telaTitulo'; logo.setAttribute('role', 'img'); logo.setAttribute('aria-label', T.menu.titulo)
    abrir('menu', T.menu.titulo, corpo, Arte.temAtlas() ? logo : null)
  }

  function cartaTela(id, liberada) {
    const c = h('canvas', { width: 56, height: 78, class: 'km-px' }), g = c.getContext('2d')
    Arte.carta(g, id, 1, 0, 0, { silhueta: !liberada })
    if (!liberada) Arte.texto(g, '?', 28, 34, { fonte: 'reino-contorno', alinhar: 'centro' })
    return c
  }
  function album() {
    Musica.momento('menu')
    const A = CONFIG.ALBUM, rodadas = Guarda.get('rodadas'), livres = new Set(Guarda.liberadas(A)), n = Guarda.quantas(A)
    const ordem = [...A.inicial, ...A.ordem], prox = n < A.ordem.length ? Guarda.limiar(A, n) : null
    const detalhe = h('div', { class: 'km-detalhe', id: 'albumDetalhe', role: 'status' })
    const mostrar = (id, livre, falta) => {
      const c = CONFIG.CARTAS[id], w = LARG() - 26
      detalhe.replaceChildren(...(livre
        ? [letra(c.nome, { fonte: 'reino-ouro', larg: w }), letra(`${CONFIG.FAMILIAS[c.familia].nome} ${T.tipo[c.tipo]} · ${CONFIG.RARIDADES.find((r) => r.id === c.raridade).nome}`, { fonte: 'mini', cor: CINZA, larg: w }), letra(c.texto, { fonte: 'mini', larg: w })]
        : [letra(T.album.bloqueada, { fonte: 'reino-ouro', larg: w }), letra(T.album.proxima(falta).replace('Next card: ', ''), { fonte: 'mini', larg: w })]))
    }
    const grade = h('div', { class: 'km-grade', id: 'albumGrade' }, ordem.map((id, i) => {
      const livre = livres.has(id), falta = livre ? 0 : Guarda.limiar(A, i - A.inicial.length) - rodadas
      return h('button', { type: 'button', class: 'km-carta' + (livre ? '' : ' km-carta--fechada'), 'data-carta': id, 'data-livre': livre ? '1' : '0', 'aria-label': livre ? CONFIG.CARTAS[id].nome : T.album.bloqueada, clique: () => { Som.tocar('toque'); mostrar(id, livre, falta) } }, [cartaTela(id, livre), livre ? null : h('small', {}, [letra(String(falta), { fonte: 'reino-ouro' })])])
    }))
    const barra = h('div', { class: 'km-barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(prox ?? rodadas), 'aria-valuenow': String(rodadas) }, [h('i', { style: `width:${prox ? Math.min(100, Math.round((rodadas / prox) * 100)) : 100}%` })])
    abrir('album', T.album.titulo, [
      linha(`${livres.size} / ${ordem.length} · ${T.album.somadas(rodadas)}`, { pid: 'albumConta', fonte: 'reino' }),
      linha(prox ? T.album.proxima(prox - rodadas) : T.album.todas, { pid: 'albumProxima' }), barra, grade, detalhe,
      linha(T.album.chances + ': ' + CONFIG.RARIDADES.map((r) => `${r.nome} ${r.chance}%`).join(' · '), { pid: 'albumChances', cor: CINZA, classe: 'km-chances' }),
    ])
  }
  function conquistas() {
    Musica.momento('menu')
    const tem = new Set(Guarda.get('conquistas')), em = Guarda.get('conquistasEm') || {}, w = LARG() - 66
    abrir('conquistas', T.menu.conquistas, [
      linha(`${CONQUISTAS.filter((c) => tem.has(c.id)).length} / ${CONQUISTAS.length}`, { pid: 'conquistasConta', fonte: 'reino' }),
      h('ul', { class: 'km-lista km-medalhas', id: 'listaConquistas' }, CONQUISTAS.map((c) => {
        const ganha = tem.has(c.id), med = Arte.miniatura(19, 21, (g) => { if (!Arte.conquista(g, c.nome, 0, 0, ganha)) Arte.icone(g, ganha ? 'pudding' : 'pin-off', 4, 5) }, 2)
        med.dataset.icone = '1'
        // o que a conquista dá (só título e medalha: docs/reino/biblia.md, seção 9) e a data em que veio
        const da = ganha ? letra(`${T.menu.enfeite}${em[c.id] ? ' · ' + T.menu.data(em[c.id]) : ''}`, { fonte: Arte.temFonte('mini-ouro') ? 'mini-ouro' : 'mini-contorno', larg: w, classe: 'km-da' }) : null
        return h('li', { class: ganha ? 'km-feita' : '', 'data-id': c.id, 'data-em': em[c.id] || '' }, [med, h('span', { class: 'km-medalha-texto' }, [letra(c.nome, { fonte: 'reino', cor: ganha ? COR.creme : CINZA, larg: w }), letra(c.como, { fonte: 'mini', cor: CINZA, larg: w }), da])])
      })),
    ])
  }
  /** BEST RUNS: a liga (PROVISÓRIA do beta: faixas em js/ligas.js), a média das 3 melhores, a escada das ligas e as melhores partidas. */
  function ranking() {
    Musica.momento('menu')
    const s = situacao(), w = LARG() - 80
    abrir('ranking', T.menu.ranking, [
      h('div', { class: 'km-liga-topo', id: 'rankLiga', 'data-liga': s.liga.nome }, [emblema(s.liga.nome, 2), h('span', {}, [letra(s.liga.nome, { fonte: 'reino-ouro', larg: w }), letra(T.menu.media(s.media), { fonte: 'mini', larg: w, id: 'rankMedia' }), letra(s.proxima ? T.menu.proxima(s.proxima.nome, s.falta) : T.menu.topo, { fonte: 'mini', cor: CINZA, larg: w, id: 'rankProxima' })])]),
      h('div', { class: 'km-barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(s.pct) }, [h('i', { style: `width:${s.pct}%` })]),
      h('ol', { class: 'km-lista km-escada', id: 'listaLigas' }, LIGAS.map((l, i) => h('li', { class: i === s.i ? 'km-feita' : '', 'data-liga': l.nome }, [emblema(l.nome, 1), letra(l.nome, { fonte: 'reino', cor: i === s.i ? COR.ouro : COR.creme }), letra(T.menu.faixa(l.de, LIGAS[i + 1] ? LIGAS[i + 1].de - 1 : 0), { fonte: 'mini', cor: CINZA })]))),
      linha(T.menu.beta, { cor: CINZA, classe: 'km-chances' }),
      h('h3', {}, [letra(T.menu.melhores, { fonte: 'reino-ouro' })]),
      h('ol', { class: 'km-lista km-melhores', id: 'listaMelhores' }, s.melhores.length ? s.melhores.map((m) => h('li', {}, [letra(`${m.pontos}`, { fonte: 'reino-ouro' }), letra(`${T.menu.rodadas(m.vencidas)} · ${m.dia}`, { fonte: 'mini', cor: CINZA })])) : [h('li', {}, [letra(T.menu.nenhuma, { fonte: 'mini', cor: CINZA })])]),
    ])
  }
  /** "Voltar" do navegador durante a partida: pergunta antes de sair (a partida fica guardada). */
  function sair(aoSair) {
    abrir('sair', T.menu.sair, [linha(T.menu.sairTexto, { fonte: 'reino' }), bt(T.menu.nao, fechar), bt(T.menu.sairSim, aoSair, 'km-bt--perigo')])
  }
  /** Link de amigo com partida em curso: pergunta antes de trocar. Fechar de qualquer jeito = ficar na partida. */
  function amigo(link, eDesafio, aoAceitar) {
    abrir('amigo', T.amigo.titulo, [
      linha(T.amigo.texto(link.rodadas), { pid: 'amigoTexto', fonte: 'reino' }),
      linha(eDesafio ? T.amigo.troca : T.amigo.guarda, { pid: 'amigoGuarda', fonte: 'reino', cor: COR.ouro }),
      Object.assign(bt(T.amigo.sim, () => { fechar(); aoAceitar() }), { id: 'amigoSim' }),
    ])
  }
  return { menu, album, conquistas, ranking, sair, amigo, fechar, aberta: () => aberta }
}
