// Keepmile — telas simples por cima do jogo: menu (logo, liga, som e volumes, Reduced motion, álbum, conquistas, melhores partidas,
// partida nova), ÁLBUM, CONQUISTAS (com medalha, o que dá e a data), BEST RUNS (liga provisória do beta + as melhores partidas), a
// pergunta de sair e a do link de amigo. Tudo na LETRA DO JOGO (as fontes em pixel do atlas, desenhadas em canvas) e no mesmo
// acabamento das cartas (painel e botões do atlas). Fecham por 4 jeitos: X, Esc, botão de baixo e toque fora.
import { chancesDaMao, resistiu } from '../../../shared/reino/partida.js'
import { LIGAS, ligaDe, mediaDasMelhores } from './ligas.js'
import { CONQUISTAS, GRUPOS_CONQUISTA, T } from './textos.js'

const ALTURA = { reino: [7, 9], 'reino-contorno': [9, 11], 'reino-ouro': [9, 11], mini: [5, 7], 'mini-contorno': [7, 8], 'mini-ouro': [7, 8] } // [altura da letra, passo da linha]
const CINZA = '#CECAD8'
/** "Common 50% · Uncommon 50%": só as raridades com chance (as de 0% não podem sair e não aparecem). */
const textoDasChances = (l) => l.filter((r) => r.chance > 0).map((r) => `${r.nome} ${r.chance}%`).join(' · ')

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
  /** Topo (título + X) e pé (Close / voltar) ficam sempre à vista; só o MEIO rola. `volta` = { texto, rotulo, ir }: o pé volta a essa tela em vez do menu. */
  function abrir(nome, titulo, corpo, cabeca = null, volta = null) {
    vestir(); if (!aberta) Som.tocar('menuAbre'); aberta = nome // R35: o painel chegando tem som (trocar de tela dentro do menu não repete)
    const raiz = nome === 'menu' || nome === 'sair' || nome === 'amigo' || nome === 'falha'
    const tit = h('h2', { id: 'telaTitulo' }, [letra(titulo, { fonte: 'reino-ouro', k: 3, larg: LARG() - 50 })])
    const x = h('button', { type: 'button', class: 'km-x', 'aria-label': T.menu.fechar, clique: fechar }, [letra('x', { k: 3 })])
    const pe = bt(nome === 'amigo' ? T.amigo.nao : raiz ? T.menu.fechar : '< ' + (volta ? volta.texto : T.menu.titulo), raiz ? fechar : volta ? volta.ir : () => menu(true), 'km-bt--fraco'); pe.id = 'telaPe'
    if (!raiz) pe.setAttribute('aria-label', volta ? volta.rotulo : T.menu.voltar)
    const meio = h('div', { class: 'km-corpo', id: 'telaCorpo' }, corpo)
    caixa.replaceChildren(h('header', { class: 'km-tela-topo' }, [cabeca || tit, x]), meio, h('footer', {}, [pe]))
    fundo.hidden = false; fundo.dataset.tela = nome; meio.scrollTop = 0
    x.focus()
  }
  function fechar() { if (!aberta) return; aberta = null; pedido++; Som.tocar('menuFecha'); fundo.hidden = true; const f = aoSair; aoSair = null; aoFechar(); if (f) f() }
  // Toque fora fecha. O MESMO toque que fechou não reabre o menu (o dedo sobe em cima do ícone e o clique dele pode chegar atrasado);
  // um toque NOVO — qualquer outro apertar de dedo depois — abre na hora.
  fundo.addEventListener('pointerdown', (ev) => { if (ev.target === fundo) { fechar(); engoleAte = performance.now() + 700 } })
  addEventListener('pointerdown', (ev) => { if (ev.target !== fundo) engoleAte = 0 }, true)
  const emblema = (nome, k = 2) => Arte.miniatura(27, 30, (g) => { if (!Arte.liga(g, nome, 0, 0)) Arte.icone(g, 'shield', 8, 9) }, k)
  /** R39 — o reino resistiu nesta partida? O servidor diz em `venceu`; sem o campo (servidor antigo, modo local), a regra do motor pelas rodadas vencidas. */
  const venceuDe = (m) => (typeof m.venceu === 'boolean' ? m.venceu : Number.isFinite(m.vencidas) && resistiu(m.vencidas))
  /** Selo pequeno "HELD" (ouro) para quem venceu a rodada da vitória: melhores partidas e listas da estrada. */
  const selo = () => h('span', { class: 'km-selo', style: 'display:inline-flex;flex:none;padding:3px 5px 2px;border:2px solid var(--ouro);background:var(--ameixa)' }, [letra(T.menu.selo, { fonte: Arte.temFonte('mini-ouro') ? 'mini-ouro' : 'mini-contorno' })])
  const comSelo = (e, m) => (venceuDe(m) ? h('span', { style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:center' }, [e, selo()]) : e)
  const situacao = () => { const melhores = Guarda.get('melhores'), media = mediaDasMelhores(melhores); return { melhores, media, ...ligaDe(media) } }

  /** Chave de liga/desliga do menu (som, Reduced motion). */
  const liga = (rot, valor, trocar, id) => {
    const estado = (v) => letra(v ? T.menu.ligado : T.menu.desligado, { fonte: 'reino', cor: v ? COR.ouro : CINZA, classe: 'km-valor' })
    const b = h('button', { type: 'button', class: 'km-bt km-bt--fraco km-liga', id, 'aria-pressed': String(valor), clique: () => { const v = trocar(); b.setAttribute('aria-pressed', String(v)); b.lastChild.replaceWith(estado(v)); Som.tocar('toque', { tom: v ? 5 : -4 }) } }, [letra(rot), estado(valor)])
    return b
  }
  /** Volume em 5 degraus (música e efeitos), além do mudo. */
  const volume = (rot, qual, id) => {
    const pinos = h('span', { class: 'km-pinos', role: 'img', id: id + 'Nivel' })
    const pintar = () => { const n = Math.round(Som.volume(qual) * 5); pinos.replaceChildren(...[0, 1, 2, 3, 4].map((i) => h('i', { class: i < n ? 'km-on' : '' }))); pinos.setAttribute('aria-label', `${rot} ${n}/5`); pinos.dataset.nivel = String(n) }
    const passo = (d) => () => { Som.volume(qual, Math.round(Som.volume(qual) * 5 + d) / 5); pintar(); Som.tocar('toque', { tom: Math.round(Som.volume(qual) * 5) * 2 - 4 }) }
    pintar()
    return h('div', { class: 'km-vol', id }, [letra(rot), h('span', { class: 'km-vol-botoes' }, [
      h('button', { type: 'button', class: 'km-bt km-bt--fraco km-mini', id: id + 'Menos', 'aria-label': T.menu.menosVol(rot), clique: passo(-1) }, [letra('-', { k: 3 })]), pinos,
      h('button', { type: 'button', class: 'km-bt km-bt--fraco km-mini', id: id + 'Mais', 'aria-label': T.menu.maisVol(rot), clique: passo(1) }, [letra('+', { k: 3 })])])])
  }
  const somEMovimento = () => [liga(T.menu.som, !Som.mudo(), () => !Som.alternarMudo(), 'mSom'), volume(T.menu.musica, 'musica', 'mMusica'), volume(T.menu.efeitos, 'efeitos', 'mEfeitos'), liga(T.menu.movimento, menos(), () => menos(!menos()), 'mMenos')]

  /** `forcar`: vindo de dentro de outra tela. Sem isso, o toque que acabou de FECHAR o menu (fora da caixa, em cima do ícone) não o reabre. */
  function menu(forcar = false) {
    if (!forcar && performance.now() < engoleAte) return
    if (sv) { menuServidor(); return }
    const s = situacao()
    // liga e recorde à vista no menu (um toque abre as melhores partidas)
    const chapa = h('button', { type: 'button', class: 'km-bt km-bt--fraco km-chapa', id: 'mLiga', clique: () => { Som.tocar('toque'); ranking() } }, [emblema(s.liga.nome, 1), h('span', {}, [letra(s.liga.nome, { fonte: 'reino-ouro' }), letra(`${T.menu.melhores}: ${Guarda.get('recorde')} · ${T.menu.media(s.media)}`, { fonte: 'mini', cor: CINZA, larg: LARG() - 70 })])])
    const corpo = [
      chapa, ...somEMovimento(),
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
      // R31/R34: a chance de AGORA é a do motor para uma mão destas cartas liberadas (sem repetir; só as raridades que podem sair); a tabela com tudo liberado vem à parte, rotulada
      linha(T.album.chances + ': ' + textoDasChances(chancesDaMao({ cartas: [...livres] })), { pid: 'albumChances', classe: 'km-chances' }),
      livres.size < ordem.length ? linha(T.album.chancesTodas + ': ' + textoDasChances(chancesDaMao({ cartas: ordem })), { pid: 'albumChancesTodas', cor: CINZA, classe: 'km-chances' }) : null,
    ]
  }
  function conquistas() {
    Musica.momento('menu')
    if (sv) { comDados('conquistas', T.menu.conquistas, sv.perfil, (p) => conquistasCom(new Set(p.conquistas.filter((c) => c.feita).map((c) => c.id)), Object.fromEntries(p.conquistas.filter((c) => c.feita && c.quando).map((c) => [c.id, String(c.quando).slice(0, 10)])), p.album?.rodadasVencidas ?? 0)); return } // a data é a do servidor (`quando`; null = sem data)
    abrir('conquistas', T.menu.conquistas, conquistasCom(new Set(Guarda.get('conquistas')), Guarda.get('conquistasEm') || {}, Guarda.get('rodadas')))
  }
  // R39: as 18 conquistas novas ainda não têm medalha no atlas — a medalha sai por código, no mesmo formato (19×21), com um ícone do
  // jogo; os degraus de rodadas mostram o próprio número
  const ICONE_MEDALHA = { nopatch: 'life', scratch: 'shield', thread: 'life', seconds: 'reroll', encore: 'round', shields: 'shield', bows: 'troop', dish: 'pudding', sparks: 'magic', mason: 'building', spicy: 'magic', pockets: 'loot', grand: 'up' }
  function medalha(c, ganha) {
    const m = Arte.miniatura(19, 21, (g) => {
      if (Arte.conquista(g, c.nome, 0, 0, ganha)) return
      g.fillStyle = '#1C1230'; g.fillRect(1, 0, 17, 21); g.fillRect(0, 1, 19, 19)
      g.fillStyle = ganha ? COR.ouro : '#4E3A66'; g.fillRect(1, 1, 17, 19); g.fillStyle = ganha ? '#FFF096' : '#624C7C'; g.fillRect(1, 1, 17, 1); g.fillRect(1, 1, 1, 19)
      g.fillStyle = ganha ? '#3A2A4E' : '#2B1E3A'; g.fillRect(3, 3, 13, 15)
      g.globalAlpha = ganha ? 1 : 0.45
      if (c.id.startsWith('tally')) Arte.texto(g, String(c.meta), 10, 8, { fonte: 'mini', cor: ganha ? COR.ouro : COR.creme, alinhar: 'centro' })
      else Arte.icone(g, ICONE_MEDALHA[c.id] || (ganha ? 'pudding' : 'pin-off'), 4, 5)
      g.globalAlpha = 1
    }, 2)
    m.dataset.icone = '1'
    return m
  }
  /** As 30 em 4 grupos (ordem e grupos do módulo da regra). Feita: borda e nome em ouro, o que dá e a data. Por fazer: apagada, com a
   *  condição; os degraus mostram a barra "123 / 200" (rodadas vencidas somadas da conta, do perfil ou do aparelho). */
  function conquistasCom(tem, em, rodadas = 0) {
    const w = LARG() - 66, ouroMini = Arte.temFonte('mini-ouro') ? 'mini-ouro' : 'mini-contorno', feitas = CONQUISTAS.filter((c) => tem.has(c.id)).length
    const item = (c) => {
      const ganha = tem.has(c.id), degrau = !ganha && c.meta && c.medida === 'rodadasVencidas', valor = degrau ? Math.max(0, Math.min(c.meta, rodadas)) : 0
      // o que a conquista dá (só título e medalha: docs/reino/biblia.md, seção 9) e a data em que veio
      const da = ganha ? letra(`${T.menu.enfeite}${em[c.id] ? ' · ' + T.menu.data(em[c.id]) : ''}`, { fonte: ouroMini, larg: w, classe: 'km-da' }) : null
      const barra = degrau ? h('span', { class: 'km-degrau', 'data-valor': String(valor), 'data-meta': String(c.meta), style: 'display:flex;align-self:stretch;align-items:center;gap:8px' }, [
        h('span', { class: 'km-barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(c.meta), 'aria-valuenow': String(valor), style: 'display:block;flex:1 1 auto;height:10px;border-width:2px' }, [h('i', { style: `width:${Math.floor((valor * 100) / c.meta)}%` })]),
        letra(T.menu.degrau(valor, c.meta), { fonte: 'mini', cor: COR.creme, classe: 'km-degrau-texto' })]) : null
      return h('li', { class: ganha ? 'km-feita' : '', 'data-id': c.id, 'data-em': em[c.id] || '', style: ganha ? 'background:#3A2452' : '' }, [medalha(c, ganha), h('span', { class: 'km-medalha-texto', style: 'flex:1 1 auto;min-width:0' }, [letra(c.nome, ganha ? { fonte: 'reino-ouro', larg: w } : { fonte: 'reino', cor: CINZA, larg: w }), letra(c.como, { fonte: 'mini', cor: ganha ? COR.creme : CINZA, larg: w }), da, barra])])
    }
    return [
      linha(`${feitas} / ${CONQUISTAS.length}`, { pid: 'conquistasConta', fonte: 'reino' }),
      h('div', { class: 'km-barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(CONQUISTAS.length), 'aria-valuenow': String(feitas) }, [h('i', { style: `width:${Math.round((feitas * 100) / CONQUISTAS.length)}%` })]),
      h('div', { id: 'listaConquistas', style: 'display:flex;flex-direction:column;gap:6px' }, GRUPOS_CONQUISTA.map((gr) => {
        const lista = CONQUISTAS.filter((c) => c.grupo === gr.id), n = lista.filter((c) => tem.has(c.id)).length
        return h('section', { 'data-grupo': gr.id, 'data-feitas': String(n), 'data-total': String(lista.length), style: 'display:flex;flex-direction:column;gap:6px' }, [
          h('h3', { style: 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:0 4px' }, [letra(gr.nome, { fonte: 'reino-ouro' }), letra(`${n} / ${lista.length}`, { fonte: 'reino', cor: n === lista.length ? COR.ouro : CINZA })]),
          h('ul', { class: 'km-lista km-medalhas' }, lista.map(item))])
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
      h('ol', { class: 'km-lista km-melhores', id: 'listaMelhores' }, s.melhores.length ? s.melhores.map((m) => h('li', { 'data-venceu': venceuDe(m) ? '1' : '0' }, [letra(`${m.pontos}`, { fonte: 'reino-ouro' }), letra(`${T.menu.rodadas(m.vencidas)} · ${m.dia}`, { fonte: 'mini', cor: CINZA }), venceuDe(m) ? selo() : null])) : [h('li', {}, [letra(T.menu.nenhuma, { fonte: 'mini', cor: CINZA })])]),
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
  /** Quanto falta para a estrada virar: é sempre menos de 1 dia. Se a conta der outra coisa (relógio fora do lugar), a tela não escreve número. */
  const faltaDoDia = (iso) => { const ms = Date.parse(iso) - sv.agora(); return ms > 0 && ms <= 86_400_000 ? T.srv.em(ms) : null }
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
    const dentro = [emblema(s.liga.nome, k), h('span', {}, [letra(sv.apelido() || p?.apelido || '', { fonte: 'reino-ouro', larg: LARG() - 80 }), letra(s.posicao != null ? `${s.liga.nome} · ${T.srv.ranking.voce(s.posicao, s.media)}` : T.srv.ranking.semVoce, { fonte: 'mini', cor: CINZA, larg: LARG() - 80 }),
      // (R30) liga que veio por POSIÇÃO: a legenda diz o que ela é (só no perfil; o botão do menu fica curto)
      !clique && s.topo ? letra(T.srv.ranking.topoN(s.topo), { fonte: 'mini', cor: COR.ouro, larg: LARG() - 80, id: id + 'Posicao' }) : null])]
    return clique ? h('button', { type: 'button', class: 'km-bt km-bt--fraco km-chapa', id, clique: () => { Som.tocar('toque'); clique() } }, dentro) : h('div', { class: 'km-liga-topo', id }, dentro)
  }
  /** SETTINGS: som, música, efeitos e Reduced motion numa tela só (o menu do celular fica curto). */
  function ajustes() { abrir('ajustes', T.menu.ajustes, somEMovimento()) }
  function menuServidor() {
    const corpo = [
      chapaDoPerfil('mLiga', perfil),
      Object.assign(bt(T.srv.jogar.menu, () => jogar()), { id: 'mJogar' }), Object.assign(bt(T.srv.ranking.menu, ranking), { id: 'mRanking' }), Object.assign(bt(T.srv.placar.menu, placar), { id: 'mPlacar' }),
      Object.assign(bt(T.menu.album, album, 'km-bt--fraco'), { id: 'mAlbum' }), Object.assign(bt(T.menu.conquistas, conquistas, 'km-bt--fraco'), { id: 'mConquistas' }),
      Object.assign(bt(T.menu.ajustes, ajustes, 'km-bt--fraco'), { id: 'mAjustes' }),
    ]
    if (emPartida()) {
      const nova = bt(T.menu.nova, () => { const c = h('div', { class: 'km-confirma' }, [linha(T.menu.novaConfirma, { fonte: 'reino', larg: LARG() - 20 }), bt(T.menu.sim, () => { fechar(); novaPartida() }, 'km-bt--perigo'), bt(T.menu.nao, () => menu(true), 'km-bt--fraco')]); nova.replaceWith(c); c.scrollIntoView({ block: 'nearest' }) }, 'km-bt--fraco')
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
  /** "Watch": o replay da partida na tela de batalha. Erro (429, ainda não pode ver) vira 1 linha em `aviso`. Sair do replay volta a `volta`. */
  const btVer = (id, aviso, volta, modo = '') => {
    const b = bt(T.srv.perfil.ver, async () => { b.disabled = true; const c = await sv.assistir(id, volta); b.disabled = false; if (c) { aviso.replaceChildren(linha(erroTexto(c), { fonte: 'reino', cor: COR.ouro })); aviso.scrollIntoView({ block: 'nearest' }) } }, 'km-bt--fraco km-ver')
    b.dataset.partida = id; if (modo) b.dataset.modo = modo
    return b
  }
  /** Uma linha do topo (temporada) ou do placar (estrada). Com `partida` (o servidor só manda a de quem pode ser assistido) ganha "Watch". */
  const itemDoTopo = (l, meu, ver = null) => {
    const w = LARG() - 70 - (l.partida && ver ? 88 : 0)
    const held = !l.liga && venceuDe(l) // R39: selo só nas listas da estrada (o ranking da temporada não tem)
    return h('li', { class: meu ? 'km-feita' : '', 'data-posicao': String(l.posicao), 'data-venceu': held ? '1' : '0' }, [letra(T.srv.posicao(l.posicao), { fonte: 'reino-ouro' }), h('span', { class: 'km-medalha-texto' }, [comSelo(letra(l.apelido, { fonte: 'reino', cor: meu ? COR.ouro : COR.creme, larg: w - (held ? 44 : 0) }), held ? l : {}), letra(l.liga ? `${l.pontos} · ${nomeDaLiga(l.liga)} · ${T.srv.ranking.partidas(l.partidas)}` : T.srv.placar.linha(l.pontos, l.vencidas), { fonte: 'mini', cor: CINZA, larg: w })]), l.partida && ver ? btVer(l.partida, ver.aviso, ver.volta) : null])
  }
  /** RANKING DA TEMPORADA: quanto falta (relógio do servidor), a regra em 1 linha, a posição e a liga da conta, o topo em páginas e os títulos. */
  function rankingServidor() {
    comDados('ranking', T.srv.ranking.titulo, () => sv.ranking(), (rk) => {
      const R = T.srv.ranking, t = rk.temporada, v = rk.voce, w = LARG() - 80, eu = sv.apelido()
      const ver = { aviso: h('div', { id: 'rankAviso', role: 'status' }), volta: () => ranking() }
      // "X more for <liga>" só quando essa liga é MAIOR que a atual (a ordem é a da lista de títulos do servidor): nada de frase contraditória
      const ordem = rk.ligas.map((l) => l.id), sobe = !!v && !!v.faltaParaProxima && ordem.indexOf(v.faltaParaProxima.liga) > ordem.indexOf(v.liga)
      // "N points to pass <nome>": a diferença entre dois números que o servidor mandou (quem está logo acima e a conta), mais 1 para passar
      const acima = v && v.posicao > 1 ? rk.lista.find((l) => l.posicao === v.posicao - 1 && l.apelido !== eu) : null, passar = acima && acima.pontos >= v.pontos ? R.passar(acima.pontos - v.pontos + 1, acima.apelido) : null
      const lista = h('ol', { class: 'km-lista km-topo', id: 'listaTopo' }, rk.lista.length ? rk.lista.map((l) => itemDoTopo(l, !!v && l.posicao === v.posicao && l.apelido === eu, ver)) : [h('li', {}, [letra(R.vazio, { fonte: 'mini', cor: CINZA })])])
      let cursor = rk.proximo
      const mais = bt(R.mais, async () => { try { const pg = await sv.ranking(cursor); for (const l of pg.lista) lista.appendChild(itemDoTopo(l, !!v && l.posicao === v.posicao && l.apelido === eu, ver)); cursor = pg.proximo; if (!cursor) mais.remove() } catch (e) { mais.replaceWith(linha(erroTexto(e.codigo), { cor: COR.ouro })) } }, 'km-bt--fraco'); mais.id = 'rankMais'
      const nomeV = v ? nomeDaLiga(v.liga) : T.srv.semLiga, e = sv.energia()
      // (R30) a liga da conta veio por POSIÇÃO (o título dela na lista do servidor traz `primeiros`): legenda "Top 10 this season" sob o nome
      const porPosicao = v ? rk.ligas.find((l) => l.id === v.liga && l.primeiros) : null
      return [
        linha(t.fechada ? R.fechada(t.numero) : R.temporada(t.numero, falta(t.termina)), { pid: 'rankTemporada', fonte: 'reino' }),
        h('div', { class: 'km-liga-topo', id: 'rankLiga', 'data-liga': v ? v.liga : '' }, [emblema(nomeV, 2), h('span', {}, [letra(nomeV, { fonte: 'reino-ouro', larg: w }), porPosicao ? letra(R.topoN(porPosicao.primeiros), { fonte: 'mini', cor: COR.ouro, larg: w, id: 'rankPosicao' }) : null, letra(v ? R.voce(v.posicao, v.pontos) : R.semVoce, { fonte: 'mini', larg: w, id: 'rankVoce' }), sobe ? letra(R.proxima(nomeDaLiga(v.faltaParaProxima.liga), v.faltaParaProxima.pontos), { fonte: 'mini', cor: CINZA, larg: w, id: 'rankProxima' }) : null, passar ? letra(passar, { fonte: 'mini', cor: COR.ouro, larg: w, id: 'rankPassar' }) : null])]),
        linha(R.regra(t.melhoresQueContam), { pid: 'rankRegra', cor: CINZA }),
        e ? linhaDaEnergia(e) : null,
        h('h3', {}, [letra(R.topo, { fonte: 'reino-ouro' })]), ver.aviso, lista, cursor ? mais : null,
        h('h3', {}, [letra(R.ligas, { fonte: 'reino-ouro' })]),
        h('ol', { class: 'km-lista km-escada', id: 'listaLigas' }, rk.ligas.map((l) => h('li', { class: v && l.id === v.liga ? 'km-feita' : '', 'data-liga': l.id }, [emblema(l.nome, 1), letra(l.nome, { fonte: 'reino', cor: v && l.id === v.liga ? COR.ouro : COR.creme }), letra(l.primeiros ? R.lenda(l.primeiros) : R.faixa(l.min), { fonte: 'mini', cor: CINZA })]))),
        linha(R.beta, { cor: CINZA, classe: 'km-chances' }),
        Object.assign(bt(T.srv.placar.menu, placar, 'km-bt--fraco'), { id: 'rankPlacar' }),
      ]
    })
  }
  /** A ESTRADA em duas abas: TODAY (o placar de hoje; só diz que a conta está nele quando o servidor traz a posição dela) e YESTERDAY
   *  (o placar fechado de ontem, só leitura, com "Watch" em quem o servidor deixa assistir). Um pedido só; trocar de aba não pede de novo. */
  function placar(aba = 'hoje') {
    Musica.momento('menu')
    const P = T.srv.placar
    const montar = (rk, qual) => {
      const trocar = (outra) => () => { if (aberta === 'placar') abrir('placar', outra === 'ontem' ? P.tituloOntem : P.titulo, montar(rk, outra)) }
      const abaBt = (id, rot, q) => { const b = bt(rot, trocar(q), q === qual ? '' : 'km-bt--fraco'); b.id = id; b.setAttribute('aria-pressed', String(q === qual)); return b }
      const abas = h('div', { class: 'km-abas', id: 'placarAbas', 'data-aba': qual }, [abaBt('placarAbaHoje', P.abaHoje, 'hoje'), abaBt('placarAbaOntem', P.abaOntem, 'ontem')])
      return [abas, ...(qual === 'ontem' ? ontem(rk) : hoje(rk))]
    }
    const hoje = (rk) => {
      const ed = rk.estradaDoDia, v = ed.voce, eu = sv.apelido(), virada = new Date(Date.parse(ed.dia + 'T00:00:00Z') + 86_400_000).toISOString()
      const fora = (v?.foraDoPlacar || ed.foraDoPlacar), motivo = fora && T.srv.foraFrase[fora.codigo]
      const sua = !v ? P.naoJogou : v.status === 'aberta' ? P.aberta : v.posicao != null ? P.voce(v.posicao, v.pontos) : P.fora(v.pontos)
      const podeJogar = !ed.jogou || v?.status === 'aberta'
      return [
        linha(P.dia(ed.dia, faltaDoDia(virada)), { pid: 'placarDia', fonte: 'reino' }),
        linha(sua, { pid: 'placarVoce', fonte: 'reino', cor: COR.ouro }),
        motivo && !(v && v.posicao != null) ? linha(motivo, { pid: 'placarFora', cor: CINZA }) : null,
        h('ol', { class: 'km-lista km-topo', id: 'listaPlacar' }, ed.lista.length ? ed.lista.map((l) => itemDoTopo(l, !!v && v.posicao != null && l.posicao === v.posicao && l.apelido === eu)) : [h('li', {}, [letra(P.vazio, { fonte: 'mini', cor: CINZA })])]),
        linha(P.replays, { pid: 'placarReplays', cor: CINZA, classe: 'km-chances' }),
        podeJogar ? Object.assign(bt(P.jogar, async () => { const c = await sv.jogar('estrada'); if (c) jogar(c); else fechar() }), { id: 'placarJogar' }) : linha(T.srv.jogar.estradaFeita, { pid: 'placarFeita', fonte: 'reino' }),
      ].filter(Boolean)
    }
    const ontem = (rk) => {
      const eo = rk.estradaDeOntem || { dia: '', lista: [] }, eu = sv.apelido(), ver = { aviso: h('div', { id: 'ontemAviso', role: 'status' }), volta: () => placar('ontem') }
      return [
        linha(P.diaOntem(eo.dia), { pid: 'ontemDia', fonte: 'reino' }), ver.aviso,
        h('ol', { class: 'km-lista km-topo', id: 'listaOntem' }, eo.lista.length ? eo.lista.map((l) => itemDoTopo(l, l.apelido === eu, ver)) : [h('li', {}, [letra(P.vazioOntem, { fonte: 'mini', cor: CINZA })])]),
      ]
    }
    comDados('placar', aba === 'ontem' ? P.tituloOntem : P.titulo, () => sv.ranking(), (rk) => montar(rk, aba))
  }
  /** (R33) A linha do aparelho com o prazo da conta que o SERVIDOR diz (perfil.conta.diasSemUsoAtePerder); servidor velho sem o campo: a frase sem número. */
  const textoDoAparelho = (p) => { const d = p?.conta?.diasSemUsoAtePerder; return Number.isSafeInteger(d) && d > 0 ? T.srv.aparelhoPrazo(d) : T.srv.aparelho }
  /** PERFIL: nome, recordes, energia, temporada, títulos e as melhores partidas (cada uma com "Watch": o replay na tela de batalha). */
  function perfil(nota = null) {
    Musica.momento('menu')
    comDados('perfil', T.srv.perfil.titulo, sv.perfil, (p) => {
      const P = T.srv.perfil, r = p.recordes
      const aviso = h('div', { id: 'perfilAviso', role: 'status' })
      const ver = (m) => btVer(m.id, aviso, () => perfil(), m.modo)
      return [
        chapaDoPerfil('perfilTopo', null),
        nota ? linha(nota, { pid: 'perfilNota', fonte: 'reino', cor: COR.ouro }) : null,
        Object.assign(bt(T.srv.apelido.menu, () => apelido(), 'km-bt--fraco'), { id: 'perfilNome' }),
        linha(textoDoAparelho(p), { pid: 'perfilAparelho', cor: CINZA }), // (R30) a conta mora só neste aparelho: dito em 1 linha, sem promessa de recuperar
        linha(P.recordes(r.pontos, r.rodadasVencidas, r.partidas), { pid: 'perfilRecordes' }),
        Number.isSafeInteger(r.vitorias) && r.vitorias > 0 ? linha(P.vitorias(r.vitorias), { pid: 'perfilVitorias', cor: COR.ouro }) : null, // R39: partidas em que o reino resistiu (número do servidor)
        linhaDaEnergia(p.energia),
        linha(P.temporada(p.temporada.numero, falta(p.temporada.termina)), { pid: 'perfilTemporada', cor: CINZA }),
        h('h3', {}, [letra(P.melhores, { fonte: 'reino-ouro' })]), aviso,
        h('ol', { class: 'km-lista km-melhores km-corridas', id: 'listaMelhores' }, p.melhores.length ? p.melhores.map((m) => h('li', { 'data-partida': m.id, 'data-venceu': venceuDe(m) ? '1' : '0' }, [h('span', { class: 'km-medalha-texto' }, [comSelo(letra(String(m.pontos), { fonte: 'reino-ouro' }), m), letra(P.corrida(m.vencidas, T.srv.modoNome[m.modo] || m.modo, String(m.quando).slice(0, 10)), { fonte: 'mini', cor: CINZA, larg: LARG() - 110 })]), ver(m)])) : [h('li', {}, [letra(P.nenhuma, { fonte: 'mini', cor: CINZA })])]),
        p.titulos.length ? h('h3', {}, [letra(P.titulos, { fonte: 'reino-ouro' })]) : null,
        p.titulos.length ? h('ul', { class: 'km-lista', id: 'listaTitulos' }, p.titulos.map((t) => h('li', {}, [letra(P.titulo1(t.temporada, t.posicao, nomeDaLiga(t.liga), t.pontos), { fonte: 'mini', larg: LARG() - 20 })]))) : null,
        Object.assign(bt(T.menu.album, album, 'km-bt--fraco'), { id: 'perfilAlbum' }), Object.assign(bt(T.menu.conquistas, conquistas, 'km-bt--fraco'), { id: 'perfilConquistas' }),
      ]
    })
  }
  /** TROCAR O NOME: um campo comum (teclado do aparelho), a regra em 1 linha e o botão. Quem aceita ou recusa é o servidor; a recusa vira
   *  1 linha curta. Se ele já disse quando a conta pode trocar de novo (`podeEm`), a tela diz isso uma vez (sem contagem) e não mostra o campo. */
  function apelido() {
    const A = T.srv.apelido, p = sv.cache(), atual = sv.apelido() || p?.apelido || '', podeEm = p?.trocaDeApelido?.podeEm
    const volta = { texto: T.srv.perfil.titulo, rotulo: A.voltar, ir: () => perfil() }
    const agoraE = letra(A.atual(atual), { fonte: 'reino-ouro', larg: LARG() })
    if (podeEm && Date.parse(podeEm) > sv.agora()) { abrir('apelido', A.titulo, [h('p', { class: 'km-linha', id: 'apelidoAtual' }, [agoraE]), linha(A.espera(falta(podeEm)), { pid: 'apelidoEspera', fonte: 'reino' })], null, volta); return }
    const erro = h('div', { id: 'apelidoErro', role: 'alert' })
    const campo = h('input', { id: 'apelidoCampo', class: 'km-campo', type: 'text', maxlength: '16', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'done', 'aria-label': A.rotulo, 'aria-describedby': 'apelidoRegra' })
    campo.value = atual
    // o campo usa a letra do aparelho (o cursor e a seleção dependem dela); logo acima, AO VIVO, o nome como o jogo vai mostrar (letra em pixel)
    const previa = h('p', { class: 'km-linha', id: 'apelidoPrevia', 'aria-hidden': 'true' })
    const pintar = () => previa.replaceChildren(letra(A.novo(campo.value.trim() || '...'), { fonte: 'reino', larg: LARG() }))
    campo.addEventListener('input', pintar); pintar()
    let ocupado = false
    const enviar = async () => {
      if (ocupado) return
      ocupado = true; salvar.disabled = true
      try { await sv.trocarApelido(campo.value.trim()) } catch (e) {
        ocupado = false; salvar.disabled = false
        if (aberta !== 'apelido' || !erro.isConnected) return
        const t = e.codigo === 'APELIDO_TROCADO_HOJE' && e.extra?.podeEm ? A.espera(falta(e.extra.podeEm)) : A.erro[e.codigo] || erroTexto(e.codigo)
        Som.tocar('negado'); erro.dataset.codigo = e.codigo || 'PADRAO'; erro.replaceChildren(linha(t, { fonte: 'reino', cor: COR.ouro, larg: LARG() }))
        return
      }
      Som.tocar('apelidoOk')
      if (aberta === 'apelido' && erro.isConnected) perfil(A.feito) // o nome novo já vale: perfil, menu e ranking mostram o que o servidor gravou
    }
    const salvar = Object.assign(bt(A.salvar, enviar), { id: 'apelidoSalvar' })
    campo.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); enviar() } })
    abrir('apelido', A.titulo, [h('p', { class: 'km-linha', id: 'apelidoAtual' }, [agoraE]), previa, campo, linha(A.regra, { pid: 'apelidoRegra', cor: CINZA }), erro, salvar], null, volta)
  }
  return { menu, album, conquistas, ranking, sair, amigo, fechar, aberta: () => aberta, jogar, placar, perfil, falha }
}
