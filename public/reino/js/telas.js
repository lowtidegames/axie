// Keepmile — telas simples por cima do jogo: menu (logo, liga, som e volumes, Reduced motion, álbum, conquistas, melhores partidas,
// partida nova), ÁLBUM, CONQUISTAS (com medalha, o que dá e a data), BEST RUNS (liga provisória do beta + as melhores partidas), a
// pergunta de sair e a do link de amigo. Tudo na LETRA DO JOGO (as fontes em pixel do atlas, desenhadas em canvas) e no mesmo
// acabamento das cartas (painel e botões do atlas). Fecham por 4 jeitos: X, Esc, botão de baixo e toque fora.
import { LIGAS, ligaDe, mediaDasMelhores } from './ligas.js'
import { CONQUISTAS, T } from './textos.js'

const ALTURA = { reino: [7, 9], 'reino-contorno': [9, 11], 'reino-ouro': [9, 11], mini: [5, 7], 'mini-contorno': [7, 8], 'mini-ouro': [7, 8] } // [altura da letra, passo da linha]
const CINZA = '#CECAD8'

export function criarTelas({ CONFIG, Arte, Guarda, Som, Musica, menos, novaPartida, emPartida, aoFechar, servidor = null }) {
  const fundo = document.getElementById('tela'), caixa = document.getElementById('telaCaixa'), COR = Arte.COR
  let aberta = null, engoleAte = 0, vestida = false, pedido = 0, aoSair = null
  const sv = servidor // modo servidor: as telas pedem os dados a ele (perfil, ranking, placar do dia); null = modo local (aparelho)
  const h = (tag, attrs = {}, filhos = []) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'texto') e.textContent = v; else if (k === 'style') e.style.cssText = v; else if (k === 'clique') e.addEventListener('click', v); else e.setAttribute(k, v) } for (const f of [].concat(filhos)) if (f) e.appendChild(f); return e }
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
    const raiz = nome === 'menu' || nome === 'sair' || nome === 'amigo' || nome === 'falha'
    const tit = h('h2', { id: 'telaTitulo' }, [letra(titulo, { fonte: 'reino-ouro', k: 3, larg: LARG() - 50 })])
    const x = h('button', { type: 'button', class: 'km-x', 'aria-label': T.menu.fechar, clique: fechar }, [letra('x', { k: 3 })])
    const pe = bt(nome === 'amigo' ? T.amigo.nao : raiz ? T.menu.fechar : '< ' + T.menu.titulo, raiz ? fechar : () => menu(true), 'km-bt--fraco'); pe.id = 'telaPe'
    if (!raiz) pe.setAttribute('aria-label', T.menu.voltar)
    caixa.replaceChildren(h('header', { class: 'km-tela-topo' }, [cabeca || tit, x]), ...corpo, h('footer', {}, [pe]))
    fundo.hidden = false; fundo.dataset.tela = nome; caixa.scrollTop = 0
    x.focus()
  }
  function fechar() { if (!aberta) return; aberta = null; pedido++; fundo.hidden = true; const f = aoSair; aoSair = null; aoFechar(); if (f) f() }
  // Toque fora fecha. O MESMO toque que fechou não reabre o menu (o dedo sobe em cima do ícone e o clique dele pode chegar atrasado);
  // um toque NOVO — qualquer outro apertar de dedo depois — abre na hora.
  fundo.addEventListener('pointerdown', (ev) => { if (ev.target === fundo) { fechar(); engoleAte = performance.now() + 700 } })
  addEventListener('pointerdown', (ev) => { if (ev.target !== fundo) engoleAte = 0 }, true)
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
    if (sv) { menuServidor(liga, volume); return }
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
    // modo servidor: as rodadas somadas e as cartas liberadas são as do perfil
    if (sv) { comDados('album', T.album.titulo, sv.perfil, (p) => albumCom(p.album.rodadasVencidas, new Set(p.album.liberadas))); return }
    abrir('album', T.album.titulo, albumCom(Guarda.get('rodadas'), new Set(Guarda.liberadas(CONFIG.ALBUM))))
  }
  function albumCom(rodadas, livres) {
    const A = CONFIG.ALBUM, n = Guarda.quantas(A, rodadas)
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
    return [
      linha(`${livres.size} / ${ordem.length} · ${T.album.somadas(rodadas)}`, { pid: 'albumConta', fonte: 'reino' }),
      linha(prox ? T.album.proxima(prox - rodadas) : T.album.todas, { pid: 'albumProxima' }), barra, grade, detalhe,
      linha(T.album.chances + ': ' + CONFIG.RARIDADES.map((r) => `${r.nome} ${r.chance}%`).join(' · '), { pid: 'albumChances', cor: CINZA, classe: 'km-chances' }),
    ]
  }
  function conquistas() {
    Musica.momento('menu')
    if (sv) { comDados('conquistas', T.menu.conquistas, sv.perfil, (p) => conquistasCom(new Set(p.conquistas.filter((c) => c.feita).map((c) => c.id)), {})); return }
    abrir('conquistas', T.menu.conquistas, conquistasCom(new Set(Guarda.get('conquistas')), Guarda.get('conquistasEm') || {}))
  }
  function conquistasCom(tem, em) {
    const w = LARG() - 66
    return [
      linha(`${CONQUISTAS.filter((c) => tem.has(c.id)).length} / ${CONQUISTAS.length}`, { pid: 'conquistasConta', fonte: 'reino' }),
      h('ul', { class: 'km-lista km-medalhas', id: 'listaConquistas' }, CONQUISTAS.map((c) => {
        const ganha = tem.has(c.id), med = Arte.miniatura(19, 21, (g) => { if (!Arte.conquista(g, c.nome, 0, 0, ganha)) Arte.icone(g, ganha ? 'pudding' : 'pin-off', 4, 5) }, 2)
        med.dataset.icone = '1'
        // o que a conquista dá (só título e medalha: docs/reino/biblia.md, seção 9) e a data em que veio
        const da = ganha ? letra(`${T.menu.enfeite}${em[c.id] ? ' · ' + T.menu.data(em[c.id]) : ''}`, { fonte: Arte.temFonte('mini-ouro') ? 'mini-ouro' : 'mini-contorno', larg: w, classe: 'km-da' }) : null
        return h('li', { class: ganha ? 'km-feita' : '', 'data-id': c.id, 'data-em': em[c.id] || '' }, [med, h('span', { class: 'km-medalha-texto' }, [letra(c.nome, { fonte: 'reino', cor: ganha ? COR.creme : CINZA, larg: w }), letra(c.como, { fonte: 'mini', cor: CINZA, larg: w }), da])])
      })),
    ]
  }
  /** BEST RUNS: a liga (PROVISÓRIA do beta: faixas em js/ligas.js), a média das 3 melhores, a escada das ligas e as melhores partidas. */
  function ranking() {
    Musica.momento('menu')
    if (sv) { rankingServidor(); return }
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

  // ---------------------------------------------------------------- MODO SERVIDOR: as telas com o que o servidor manda
  const falta = (iso) => T.srv.em(Date.parse(iso) - sv.agora()) // o tempo que falta é o do servidor (relógio dele), escrito uma vez: sem contagem na tela
  const nomeDaLiga = (id) => (id === CONFIG.BETA.lenda.id ? CONFIG.BETA.lenda.nome : CONFIG.BETA.ligas.find((l) => l.id === id)?.nome || String(id))
  const erroTexto = (codigo) => T.srv.erro[codigo] || T.srv.erro.PADRAO
  /** Tela que depende do servidor: "Loading...", depois o conteúdo; erro vira 1 linha + "Try again" (nunca fica travada). */
  async function comDados(nome, titulo, buscar, montar) {
    abrir(nome, titulo, [linha(T.srv.carregando, { pid: 'telaCarregando', fonte: 'reino', cor: CINZA })])
    const vez = ++pedido
    let d
    try { d = await buscar() } catch (e) {
      if (aberta === nome && vez === pedido) abrir(nome, titulo, [linha(erroTexto(e.codigo), { pid: 'telaErro', fonte: 'reino', cor: COR.ouro }), Object.assign(bt(T.srv.deNovo, () => comDados(nome, titulo, buscar, montar)), { id: 'telaDeNovo' })])
      return
    }
    if (aberta !== nome || vez !== pedido) return
    abrir(nome, titulo, montar(d).filter(Boolean))
  }
  /** Falha no começo (sem rede, manutenção): 1 linha e "Try again". Fechar de qualquer jeito também tenta de novo. */
  function falha(codigo, deNovo) {
    abrir('falha', T.menu.titulo, [linha(erroTexto(codigo), { pid: 'telaErro', fonte: 'reino', cor: COR.ouro }), Object.assign(bt(T.srv.deNovo, fechar), { id: 'telaDeNovo' })])
    aoSair = deNovo
  }
  /** Energia de ranking: quanto tem e, se não está cheia, quando volta (números e hora do servidor). Sem botão, sem empurrar. */
  const linhaDaEnergia = (e) => h('p', { class: 'km-linha km-energia', id: 'telaEnergia' }, [letra(T.srv.energia(e.atual, e.maximo), { fonte: 'reino', cor: COR.ouro }), e.atual >= e.maximo ? null : letra(' ' + T.srv.energiaVolta(e.porDia, falta(e.recarregaEm)), { fonte: 'mini', cor: CINZA })])
  /** Botão de duas linhas (título + o que é), no acabamento dos botões do menu. */
  const btDuplo = (id, titulo, sub, clique, marca = '') => h('button', { type: 'button', class: 'km-bt km-bt--fraco km-chapa km-modo', id, clique: () => { Som.tocar('toque'); clique() } }, [h('span', {}, [letra(titulo + (marca ? ' · ' + marca : ''), { fonte: 'reino-ouro', larg: LARG() - 30 }), letra(sub, { fonte: 'mini', cor: CINZA, larg: LARG() - 30 })])])
  function chapaDoPerfil(id, clique) {
    const s = sv.situacao(), p = sv.cache(), k = clique ? 1 : 2
    const dentro = [emblema(s.liga.nome, k), h('span', {}, [letra(sv.apelido() || p?.apelido || '', { fonte: 'reino-ouro', larg: LARG() - 80 }), letra(s.posicao != null ? `${s.liga.nome} · ${T.srv.ranking.voce(s.posicao, s.media)}` : T.srv.ranking.semVoce, { fonte: 'mini', cor: CINZA, larg: LARG() - 80 })])]
    return clique ? h('button', { type: 'button', class: 'km-bt km-bt--fraco km-chapa', id, clique: () => { Som.tocar('toque'); clique() } }, dentro) : h('div', { class: 'km-liga-topo', id }, dentro)
  }
  function menuServidor(liga, volume) {
    const corpo = [
      chapaDoPerfil('mLiga', perfil),
      Object.assign(bt(T.srv.jogar.menu, () => jogar()), { id: 'mJogar' }), Object.assign(bt(T.srv.ranking.menu, ranking), { id: 'mRanking' }), Object.assign(bt(T.srv.placar.menu, placar), { id: 'mPlacar' }),
      Object.assign(bt(T.menu.album, album, 'km-bt--fraco'), { id: 'mAlbum' }), Object.assign(bt(T.menu.conquistas, conquistas, 'km-bt--fraco'), { id: 'mConquistas' }),
      liga(T.menu.som, !Som.mudo(), () => !Som.alternarMudo(), 'mSom'),
      volume(T.menu.musica, 'musica', 'mMusica'), volume(T.menu.efeitos, 'efeitos', 'mEfeitos'),
      liga(T.menu.movimento, menos(), () => menos(!menos()), 'mMenos'),
    ]
    if (emPartida()) {
      const nova = bt(T.menu.nova, () => { nova.replaceWith(h('div', { class: 'km-confirma' }, [linha(T.menu.novaConfirma, { fonte: 'reino', larg: LARG() - 20 }), bt(T.menu.sim, () => { fechar(); novaPartida() }, 'km-bt--perigo'), bt(T.menu.nao, () => menu(true), 'km-bt--fraco')])) }, 'km-bt--fraco')
      nova.id = 'mNova'; corpo.push(nova)
    }
    const logo = Arte.miniatura(118, 24, (g) => Arte.logo(g, 'medium', 59, 0), 2); logo.id = 'telaTitulo'; logo.setAttribute('role', 'img'); logo.setAttribute('aria-label', T.menu.titulo)
    abrir('menu', T.menu.titulo, corpo, Arte.temAtlas() ? logo : null)
  }
  /** PLAY: treino (livre), ranking (gasta energia: quanto tem e quando volta) e a estrada do dia (1 por dia). `aviso` = código de erro a mostrar. */
  function jogar(aviso = null) {
    Musica.momento('menu')
    comDados('jogar', T.srv.jogar.titulo, async () => { const [ab, rk] = await Promise.all([sv.aberta(), sv.ranking()]); return { ab, rk } }, ({ ab, rk }) => {
      const e = ab.energia, J = T.srv.jogar, ed = rk.estradaDoDia, abertas = new Set(ab.abertas.map((x) => x.modo)), marca = (m) => (abertas.has(m) ? J.continuar : '')
      const ir = (modo) => async () => { const c = await sv.jogar(modo); if (c) jogar(c); else fechar() }
      const feita = ed.jogou && !abertas.has('estrada'), fora = ed.foraDoPlacar && T.srv.foraFrase[ed.foraDoPlacar.codigo]
      return [
        aviso ? linha(erroTexto(aviso), { pid: 'jogarAviso', fonte: 'reino', cor: COR.ouro }) : null,
        btDuplo('jTreino', J.treino, J.treinoSub, ir('treino'), marca('treino')),
        btDuplo('jRanking', J.ranking, e.atual > 0 || abertas.has('ranking') ? J.rankingSub(e.atual, e.maximo) : J.semEnergia(falta(e.recarregaEm)), ir('ranking'), marca('ranking')),
        linhaDaEnergia(e),
        btDuplo('jEstrada', J.estrada, feita ? J.estradaFeita : J.estradaSub, ir('estrada'), marca('estrada')),
        fora && !feita ? linha(fora, { pid: 'jogarFora', cor: CINZA }) : null,
      ]
    })
  }
  const itemDoTopo = (l, meu) => h('li', { class: meu ? 'km-feita' : '', 'data-posicao': String(l.posicao) }, [letra(T.srv.posicao(l.posicao), { fonte: 'reino-ouro' }), h('span', { class: 'km-medalha-texto' }, [letra(l.apelido, { fonte: 'reino', cor: meu ? COR.ouro : COR.creme, larg: LARG() - 70 }), letra(l.liga ? `${l.pontos} · ${nomeDaLiga(l.liga)} · ${T.srv.ranking.partidas(l.partidas)}` : T.srv.placar.linha(l.pontos, l.vencidas), { fonte: 'mini', cor: CINZA, larg: LARG() - 70 })])])
  /** RANKING DA TEMPORADA: quanto falta (relógio do servidor), a regra em 1 linha, a posição e a liga da conta, o topo em páginas e os títulos. */
  function rankingServidor() {
    comDados('ranking', T.srv.ranking.titulo, () => sv.ranking(), (rk) => {
      const R = T.srv.ranking, t = rk.temporada, v = rk.voce, w = LARG() - 80, eu = sv.apelido()
      const lista = h('ol', { class: 'km-lista km-topo', id: 'listaTopo' }, rk.lista.length ? rk.lista.map((l) => itemDoTopo(l, !!v && l.posicao === v.posicao && l.apelido === eu)) : [h('li', {}, [letra(R.vazio, { fonte: 'mini', cor: CINZA })])])
      let cursor = rk.proximo
      const mais = bt(R.mais, async () => { try { const pg = await sv.ranking(cursor); for (const l of pg.lista) lista.appendChild(itemDoTopo(l, !!v && l.posicao === v.posicao && l.apelido === eu)); cursor = pg.proximo; if (!cursor) mais.remove() } catch (e) { mais.replaceWith(linha(erroTexto(e.codigo), { cor: COR.ouro })) } }, 'km-bt--fraco'); mais.id = 'rankMais'
      const nomeV = v ? nomeDaLiga(v.liga) : T.srv.semLiga, e = sv.energia()
      return [
        linha(t.fechada ? R.fechada(t.numero) : R.temporada(t.numero, falta(t.termina)), { pid: 'rankTemporada', fonte: 'reino' }),
        h('div', { class: 'km-liga-topo', id: 'rankLiga', 'data-liga': v ? v.liga : '' }, [emblema(nomeV, 2), h('span', {}, [letra(nomeV, { fonte: 'reino-ouro', larg: w }), letra(v ? R.voce(v.posicao, v.pontos) : R.semVoce, { fonte: 'mini', larg: w, id: 'rankVoce' }), v && v.faltaParaProxima ? letra(R.proxima(nomeDaLiga(v.faltaParaProxima.liga), v.faltaParaProxima.pontos), { fonte: 'mini', cor: CINZA, larg: w, id: 'rankProxima' }) : null])]),
        linha(R.regra(t.melhoresQueContam), { pid: 'rankRegra', cor: CINZA }),
        e ? linhaDaEnergia(e) : null,
        h('h3', {}, [letra(R.topo, { fonte: 'reino-ouro' })]), lista, cursor ? mais : null,
        h('h3', {}, [letra(R.ligas, { fonte: 'reino-ouro' })]),
        h('ol', { class: 'km-lista km-escada', id: 'listaLigas' }, rk.ligas.map((l) => h('li', { class: v && l.id === v.liga ? 'km-feita' : '', 'data-liga': l.id }, [emblema(l.nome, 1), letra(l.nome, { fonte: 'reino', cor: v && l.id === v.liga ? COR.ouro : COR.creme }), letra(l.primeiros ? R.lenda(l.primeiros) : R.faixa(l.min), { fonte: 'mini', cor: CINZA })]))),
        linha(R.beta, { cor: CINZA, classe: 'km-chances' }),
        Object.assign(bt(T.srv.placar.menu, placar, 'km-bt--fraco'), { id: 'rankPlacar' }),
      ]
    })
  }
  /** PLACAR DO DIA (estrada de hoje). Só diz que a conta está no placar quando o servidor traz a posição dela. */
  function placar() {
    Musica.momento('menu')
    comDados('placar', T.srv.placar.titulo, () => sv.ranking(), (rk) => {
      const P = T.srv.placar, ed = rk.estradaDoDia, v = ed.voce, eu = sv.apelido(), virada = new Date(Date.parse(ed.dia + 'T00:00:00Z') + 86_400_000).toISOString()
      const fora = (v?.foraDoPlacar || ed.foraDoPlacar), motivo = fora && T.srv.foraFrase[fora.codigo]
      const sua = !v ? P.naoJogou : v.status === 'aberta' ? P.aberta : v.posicao != null ? P.voce(v.posicao, v.pontos) : P.fora(v.pontos)
      const podeJogar = !ed.jogou || v?.status === 'aberta'
      return [
        linha(P.dia(ed.dia, falta(virada)), { pid: 'placarDia', fonte: 'reino' }),
        linha(sua, { pid: 'placarVoce', fonte: 'reino', cor: COR.ouro }),
        motivo && !(v && v.posicao != null) ? linha(motivo, { pid: 'placarFora', cor: CINZA }) : null,
        h('ol', { class: 'km-lista km-topo', id: 'listaPlacar' }, ed.lista.length ? ed.lista.map((l) => itemDoTopo(l, !!v && v.posicao != null && l.posicao === v.posicao && l.apelido === eu)) : [h('li', {}, [letra(P.vazio, { fonte: 'mini', cor: CINZA })])]),
        linha(P.replays, { pid: 'placarReplays', cor: CINZA, classe: 'km-chances' }),
        podeJogar ? Object.assign(bt(P.jogar, async () => { const c = await sv.jogar('estrada'); if (c) jogar(c); else fechar() }), { id: 'placarJogar' }) : linha(T.srv.jogar.estradaFeita, { pid: 'placarFeita', fonte: 'reino' }),
      ]
    })
  }
  /** PERFIL: nome, recordes, energia, temporada, títulos e as melhores partidas (cada uma com "Watch": o replay na tela de batalha). */
  function perfil() {
    Musica.momento('menu')
    comDados('perfil', T.srv.perfil.titulo, sv.perfil, (p) => {
      const P = T.srv.perfil, r = p.recordes
      const aviso = h('div', { id: 'perfilAviso', role: 'status' })
      const ver = (m) => { const b = bt(P.ver, async () => { b.disabled = true; const c = await sv.assistir(m.id); b.disabled = false; if (c) aviso.replaceChildren(linha(erroTexto(c), { fonte: 'reino', cor: COR.ouro })) }, 'km-bt--fraco km-ver'); b.dataset.partida = m.id; b.dataset.modo = m.modo; return b }
      return [
        chapaDoPerfil('perfilTopo', null),
        linha(P.recordes(r.pontos, r.rodadasVencidas, r.partidas), { pid: 'perfilRecordes' }),
        linhaDaEnergia(p.energia),
        linha(P.temporada(p.temporada.numero, falta(p.temporada.termina)), { pid: 'perfilTemporada', cor: CINZA }),
        h('h3', {}, [letra(P.melhores, { fonte: 'reino-ouro' })]), aviso,
        h('ol', { class: 'km-lista km-melhores km-corridas', id: 'listaMelhores' }, p.melhores.length ? p.melhores.map((m) => h('li', { 'data-partida': m.id }, [h('span', { class: 'km-medalha-texto' }, [letra(String(m.pontos), { fonte: 'reino-ouro' }), letra(P.corrida(m.vencidas, T.srv.modoNome[m.modo] || m.modo, String(m.quando).slice(0, 10)), { fonte: 'mini', cor: CINZA, larg: LARG() - 110 })]), ver(m)])) : [h('li', {}, [letra(P.nenhuma, { fonte: 'mini', cor: CINZA })])]),
        p.titulos.length ? h('h3', {}, [letra(P.titulos, { fonte: 'reino-ouro' })]) : null,
        p.titulos.length ? h('ul', { class: 'km-lista', id: 'listaTitulos' }, p.titulos.map((t) => h('li', {}, [letra(P.titulo1(t.temporada, t.posicao, nomeDaLiga(t.liga), t.pontos), { fonte: 'mini', larg: LARG() - 20 })]))) : null,
        Object.assign(bt(T.menu.album, album, 'km-bt--fraco'), { id: 'perfilAlbum' }), Object.assign(bt(T.menu.conquistas, conquistas, 'km-bt--fraco'), { id: 'perfilConquistas' }),
      ]
    })
  }
  return { menu, album, conquistas, ranking, sair, amigo, fechar, aberta: () => aberta, jogar, placar, perfil, falha }
}
