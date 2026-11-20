// Keepmile — telas simples por cima do jogo: menu (logo, liga, som, Reduced motion, álbum, conquistas, melhores partidas, partida
// nova), ÁLBUM, CONQUISTAS (com medalha), BEST RUNS (liga provisória do beta + as melhores partidas) e a pergunta de sair.
// Fecham por 4 jeitos: X, Esc, botão Close e toque fora.
import { LIGAS, ligaDe, mediaDasMelhores } from './ligas.js'
import { CONQUISTAS, T } from './textos.js'

export function criarTelas({ CONFIG, Arte, Guarda, Som, Musica, menos, novaPartida, emPartida, aoFechar }) {
  const fundo = document.getElementById('tela'), caixa = document.getElementById('telaCaixa')
  let aberta = null, fechouEm = -1e9
  const h = (tag, attrs = {}, filhos = []) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'texto') e.textContent = v; else if (k === 'clique') e.addEventListener('click', v); else e.setAttribute(k, v) } for (const f of [].concat(filhos)) if (f) e.appendChild(f); return e }
  const bt = (texto, clique, cls = '') => h('button', { type: 'button', class: 'km-bt ' + cls, texto, clique: () => { Som.tocar('toque'); clique() } })
  function abrir(nome, titulo, corpo, cabeca = null) {
    aberta = nome
    caixa.replaceChildren(h('header', { class: 'km-tela-topo' }, [cabeca || h('h2', { texto: titulo, id: 'telaTitulo' }), h('button', { type: 'button', class: 'km-x', 'aria-label': T.menu.fechar, texto: '×', clique: fechar })]), ...corpo, h('footer', {}, [bt(nome === 'amigo' ? T.amigo.nao : nome === 'menu' || nome === 'sair' ? T.menu.fechar : '‹ ' + T.menu.titulo, nome === 'menu' || nome === 'sair' || nome === 'amigo' ? fechar : () => menu(true), 'km-bt--fraco')]))
    fundo.hidden = false; fundo.dataset.tela = nome
    caixa.querySelector('.km-x').focus()
  }
  function fechar() { if (!aberta) return; aberta = null; fundo.hidden = true; aoFechar() }
  fundo.addEventListener('pointerdown', (ev) => { if (ev.target === fundo) { fechar(); fechouEm = performance.now() } })
  const emblema = (nome, k = 2) => Arte.miniatura(27, 30, (g) => { if (!Arte.liga(g, nome, 0, 0)) Arte.icone(g, 'shield', 8, 9) }, k)
  const situacao = () => { const melhores = Guarda.get('melhores'), media = mediaDasMelhores(melhores); return { melhores, media, ...ligaDe(media) } }

  /** `forcar`: vindo de dentro de outra tela. Sem isso, o toque que acabou de FECHAR o menu (fora da caixa, em cima do ícone) não o reabre. */
  function menu(forcar = false) {
    if (!forcar && performance.now() - fechouEm < 400) return
    const liga = (rot, valor, trocar, id) => { const b = h('button', { type: 'button', class: 'km-bt km-liga', id, 'aria-pressed': String(valor), clique: () => { const v = trocar(); b.setAttribute('aria-pressed', String(v)); b.lastChild.textContent = v ? T.menu.ligado : T.menu.desligado; Som.tocar('toque') } }, [h('span', { texto: rot }), h('b', { texto: valor ? T.menu.ligado : T.menu.desligado })]); return b }
    const s = situacao()
    // liga e recorde à vista no menu (um toque abre as melhores partidas)
    const chapa = h('button', { type: 'button', class: 'km-bt km-bt--fraco km-chapa', id: 'mLiga', clique: () => { Som.tocar('toque'); ranking() } }, [emblema(s.liga.nome, 1), h('span', {}, [h('b', { texto: s.liga.nome }), h('small', { texto: `${T.menu.melhores}: ${Guarda.get('recorde')} · ${T.menu.media(s.media)}` })])])
    const corpo = [
      chapa,
      liga(T.menu.som, !Som.mudo(), () => !Som.alternarMudo(), 'mSom'),
      liga(T.menu.movimento, menos(), () => menos(!menos()), 'mMenos'),
      bt(T.menu.album, album), bt(T.menu.conquistas, conquistas), bt(T.menu.ranking, ranking),
    ]
    if (emPartida()) {
      const nova = bt(T.menu.nova, () => { nova.replaceWith(h('div', { class: 'km-confirma' }, [h('p', { texto: T.menu.novaConfirma }), bt(T.menu.sim, () => { fechar(); novaPartida() }, 'km-bt--perigo'), bt(T.menu.nao, () => menu(true), 'km-bt--fraco')])) }, 'km-bt--fraco')
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
    const detalhe = h('p', { class: 'km-detalhe', id: 'albumDetalhe', role: 'status' })
    const mostrar = (id, livre, falta) => {
      const c = CONFIG.CARTAS[id]
      detalhe.replaceChildren(...(livre ? [h('b', { texto: c.nome }), h('span', { texto: ` · ${CONFIG.FAMILIAS[c.familia].nome} ${T.tipo[c.tipo]} · ${CONFIG.RARIDADES.find((r) => r.id === c.raridade).nome}` }), h('br'), h('span', { texto: c.texto })] : [h('b', { texto: T.album.bloqueada }), h('span', { texto: ' · ' + T.album.proxima(falta).replace('Next card: ', '') })]))
    }
    const grade = h('div', { class: 'km-grade', id: 'albumGrade' }, ordem.map((id, i) => {
      const livre = livres.has(id), falta = livre ? 0 : Guarda.limiar(A, i - A.inicial.length) - rodadas
      return h('button', { type: 'button', class: 'km-carta' + (livre ? '' : ' km-carta--fechada'), 'data-carta': id, 'data-livre': livre ? '1' : '0', 'aria-label': livre ? CONFIG.CARTAS[id].nome : T.album.bloqueada, clique: () => { Som.tocar('toque'); mostrar(id, livre, falta) } }, [cartaTela(id, livre), livre ? null : h('small', { texto: String(falta) })])
    }))
    const barra = h('div', { class: 'km-barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(prox ?? rodadas), 'aria-valuenow': String(rodadas) }, [h('i', { style: `width:${prox ? Math.min(100, Math.round((rodadas / prox) * 100)) : 100}%` })])
    abrir('album', T.album.titulo, [
      h('p', { class: 'km-linha', id: 'albumConta', texto: `${livres.size} / ${ordem.length} · ${T.album.somadas(rodadas)}` }),
      h('p', { class: 'km-linha', id: 'albumProxima', texto: prox ? T.album.proxima(prox - rodadas) : T.album.todas }), barra, grade, detalhe,
      h('p', { class: 'km-linha km-chances', id: 'albumChances', texto: T.album.chances + ': ' + CONFIG.RARIDADES.map((r) => `${r.nome} ${r.chance}%`).join(' · ') }),
    ])
  }
  function conquistas() {
    Musica.momento('menu')
    const tem = new Set(Guarda.get('conquistas'))
    abrir('conquistas', T.menu.conquistas, [
      h('p', { class: 'km-linha', id: 'conquistasConta', texto: `${CONQUISTAS.filter((c) => tem.has(c.id)).length} / ${CONQUISTAS.length}` }),
      h('ul', { class: 'km-lista km-medalhas', id: 'listaConquistas' }, CONQUISTAS.map((c) => {
        const ganha = tem.has(c.id), med = Arte.miniatura(19, 21, (g) => { if (!Arte.conquista(g, c.nome, 0, 0, ganha)) Arte.icone(g, ganha ? 'pudding' : 'pin-off', 4, 5) }, 2)
        med.dataset.icone = '1'
        return h('li', { class: ganha ? 'km-feita' : '', 'data-id': c.id }, [med, h('span', { class: 'km-medalha-texto' }, [h('b', { texto: c.nome }), h('span', { texto: c.como })])])
      })),
    ])
  }
  /** BEST RUNS: a liga (PROVISÓRIA do beta: faixas em js/ligas.js), a média das 3 melhores, a escada das ligas e as melhores partidas. */
  function ranking() {
    Musica.momento('menu')
    const s = situacao()
    abrir('ranking', T.menu.ranking, [
      h('div', { class: 'km-liga-topo', id: 'rankLiga', 'data-liga': s.liga.nome }, [emblema(s.liga.nome, 2), h('span', {}, [h('b', { texto: s.liga.nome }), h('span', { id: 'rankMedia', texto: T.menu.media(s.media) }), h('span', { id: 'rankProxima', texto: s.proxima ? T.menu.proxima(s.proxima.nome, s.falta) : T.menu.topo })])]),
      h('div', { class: 'km-barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(s.pct) }, [h('i', { style: `width:${s.pct}%` })]),
      h('ol', { class: 'km-lista km-escada', id: 'listaLigas' }, LIGAS.map((l, i) => h('li', { class: i === s.i ? 'km-feita' : '', 'data-liga': l.nome }, [emblema(l.nome, 1), h('b', { texto: l.nome }), h('span', { texto: T.menu.faixa(l.de, LIGAS[i + 1] ? LIGAS[i + 1].de - 1 : 0) })]))),
      h('p', { class: 'km-linha km-chances', texto: T.menu.beta }),
      h('h3', { texto: T.menu.melhores }),
      h('ol', { class: 'km-lista km-melhores', id: 'listaMelhores' }, s.melhores.length ? s.melhores.map((m) => h('li', {}, [h('b', { texto: `${m.pontos}` }), h('span', { texto: `${T.menu.rodadas(m.vencidas)} · ${m.dia}` })])) : [h('li', {}, [h('span', { texto: T.menu.nenhuma })])]),
    ])
  }
  /** "Voltar" do navegador durante a partida: pergunta antes de sair (a partida fica guardada). */
  function sair(aoSair) {
    abrir('sair', T.menu.sair, [h('p', { class: 'km-linha', texto: T.menu.sairTexto }), bt(T.menu.nao, fechar), bt(T.menu.sairSim, aoSair, 'km-bt--perigo')])
  }
  /** Link de amigo com partida em curso: pergunta antes de trocar. Fechar de qualquer jeito = ficar na partida. */
  function amigo(link, eDesafio, aoAceitar) {
    abrir('amigo', T.amigo.titulo, [
      h('p', { class: 'km-linha', id: 'amigoTexto', texto: T.amigo.texto(link.rodadas) }),
      h('p', { class: 'km-linha', id: 'amigoGuarda', texto: eDesafio ? T.amigo.troca : T.amigo.guarda }),
      Object.assign(bt(T.amigo.sim, () => { fechar(); aoAceitar() }), { id: 'amigoSim' }),
    ])
  }
  return { menu, album, conquistas, ranking, sair, amigo, fechar, aberta: () => aberta }
}
