// Keepmile — telas simples por cima do jogo: menu (som, Reduced motion, álbum, conquistas, partida nova), ÁLBUM e CONQUISTAS.
// Fecham por 4 jeitos: X, Esc, botão Close e toque fora.
import { CONQUISTAS, T } from './textos.js'

export function criarTelas({ CONFIG, Arte, Guarda, Som, Musica, menos, novaPartida, emPartida, aoFechar }) {
  const fundo = document.getElementById('tela'), caixa = document.getElementById('telaCaixa')
  let aberta = null
  const h = (tag, attrs = {}, filhos = []) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'texto') e.textContent = v; else if (k === 'clique') e.addEventListener('click', v); else e.setAttribute(k, v) } for (const f of [].concat(filhos)) if (f) e.appendChild(f); return e }
  const bt = (texto, clique, cls = '') => h('button', { type: 'button', class: 'km-bt ' + cls, texto, clique: () => { Som.tocar('toque'); clique() } })
  function abrir(nome, titulo, corpo) {
    aberta = nome
    caixa.replaceChildren(h('header', { class: 'km-tela-topo' }, [h('h2', { texto: titulo, id: 'telaTitulo' }), h('button', { type: 'button', class: 'km-x', 'aria-label': T.menu.fechar, texto: '×', clique: fechar })]), ...corpo, h('footer', {}, [bt(nome === 'menu' ? T.menu.fechar : '‹ ' + T.menu.titulo, nome === 'menu' ? fechar : menu, 'km-bt--fraco')]))
    fundo.hidden = false; fundo.dataset.tela = nome
    caixa.querySelector('.km-x').focus()
  }
  function fechar() { if (!aberta) return; aberta = null; fundo.hidden = true; aoFechar() }
  fundo.addEventListener('pointerdown', (ev) => { if (ev.target === fundo) fechar() })

  function menu() {
    const liga = (rot, valor, trocar, id) => { const b = h('button', { type: 'button', class: 'km-bt km-liga', id, 'aria-pressed': String(valor), clique: () => { const v = trocar(); b.setAttribute('aria-pressed', String(v)); b.lastChild.textContent = v ? T.menu.ligado : T.menu.desligado; Som.tocar('toque') } }, [h('span', { texto: rot }), h('b', { texto: valor ? T.menu.ligado : T.menu.desligado })]); return b }
    const corpo = [
      liga(T.menu.som, !Som.mudo(), () => !Som.alternarMudo(), 'mSom'),
      liga(T.menu.movimento, menos(), () => menos(!menos()), 'mMenos'),
      bt(T.menu.album, album), bt(T.menu.conquistas, conquistas),
    ]
    if (emPartida()) {
      const nova = bt(T.menu.nova, () => { nova.replaceWith(h('div', { class: 'km-confirma' }, [h('p', { texto: T.menu.novaConfirma }), bt(T.menu.sim, () => { fechar(); novaPartida() }, 'km-bt--perigo'), bt(T.menu.nao, menu, 'km-bt--fraco')])) }, 'km-bt--fraco')
      nova.id = 'mNova'; corpo.push(nova)
    }
    abrir('menu', T.menu.titulo, corpo)
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
    const tem = new Set(Guarda.get('conquistas')), melhores = Guarda.get('melhores')
    abrir('conquistas', T.menu.conquistas, [
      h('ul', { class: 'km-lista', id: 'listaConquistas' }, CONQUISTAS.map((c) => h('li', { class: tem.has(c.id) ? 'km-feita' : '', 'data-id': c.id }, [h('b', { texto: c.nome }), h('span', { texto: c.como })]))),
      h('h3', { texto: T.menu.melhores }),
      h('ol', { class: 'km-lista km-melhores', id: 'listaMelhores' }, melhores.length ? melhores.map((m) => h('li', {}, [h('b', { texto: `${m.pontos}` }), h('span', { texto: `${m.vencidas} rounds · ${m.dia}` })])) : [h('li', {}, [h('span', { texto: '—' })])]),
    ])
  }
  return { menu, album, conquistas, fechar, aberta: () => aberta }
}
