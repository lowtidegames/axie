// Frayz — peça CARTA: um molde de costura com moldura no tecido do tipo (guia §7).
// Anatomia, de cima para baixo: custo num carretel · desenho grande DA PARTE sobre retalho escuro com luz ·
// nome numa fita · texto em linho (palavra-chave em negrito, número em ouro) · rodapé com o ícone do lugar e a carinha do dono.
// Sem regra e sem número de jogo: tudo chega em `dados` (quem chama busca na ponte).
//
//   criarCarta(dados, opcoes) → elemento
//     dados  = { id, nome, custo, tipo, lugar: 'cabeca'|'bracos'|'pernas', texto, dono: { partes, nome }, raridade? }
//              texto aceita marcação simples: [[palavra-chave]] e {{número}} (veja marcarTexto)
//     opcoes = { variante: 'mao' | 'mini' | 'ampliada', largura (px), tag: 'button' | 'div', estado, nomeDoLugar, nomeDoTipo }
//   atualizarCarta(el, estado)
//     estado = { jogavel, semLinha, vezDoRival, selecionada, fiapo, fraseDoFiapo, marca }  (só o que vier muda)
//   marcarTexto(texto, { chaves }) → texto com a marcação (números em {{ }}, palavras da lista em [[ ]])
import { carretelSvg, densidade, el, svg, semear, sorte } from './base.js'
import * as arte from './arte-adaptador.js'
import { criarMarcaDeVantagem } from './marca-de-vantagem.js'

const NOME_DO_LUGAR = { cabeca: 'Cabeça', bracos: 'Braços', pernas: 'Pernas' }
const COR_DA_RARIDADE = { comum: 'var(--rar-comum)', incomum: 'var(--rar-incomum)', rara: 'var(--rar-rara)', lendaria: 'var(--rar-lendaria)' }
// medidas da janela do desenho em unidades da carta (carta = 132 de largura; a mini = 88)
const JANELA = { mao: { base: 132, w: 118, h: 70 }, ampliada: { base: 132, w: 118, h: 82 }, mini: { base: 88, w: 78, h: 76 } }

// ------------------------------------------------------------------ texto com marcação

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Põe a marcação num texto puro: números viram {{n}} e as palavras da lista viram [[palavra]]. */
export function marcarTexto(texto, { chaves = [] } = {}) {
  const t = String(texto ?? '')
  if (/\[\[|\{\{/.test(t)) return t // já veio marcado
  const lista = [...chaves].sort((a, b) => b.length - a.length).map(escapar)
  const num = '[+\\-−]?\\d+(?:[.,]\\d+)?%?'
  const re = new RegExp((lista.length ? `(?<![\\p{L}\\p{N}])(${lista.join('|')})(?![\\p{L}\\p{N}])|` : '()') + `(${num})`, 'gu')
  return t.replace(re, (m, chave, numero) => (chave ? `[[${chave}]]` : numero ? `{{${numero}}}` : m))
}

/** Texto marcado → nós (nunca HTML cru). */
export function nosDoTexto(texto) {
  const nos = [], re = /\[\[(.+?)\]\]|\{\{(.+?)\}\}/g
  let i = 0
  for (let m; (m = re.exec(texto)); ) {
    if (m.index > i) nos.push(document.createTextNode(texto.slice(i, m.index)))
    nos.push(m[1] != null ? el('b', 'fz-chave', m[1]) : el('b', 'fz-num', m[2]))
    i = m.index + m[0].length
  }
  if (i < texto.length) nos.push(document.createTextNode(texto.slice(i)))
  return nos
}
const textoPuro = (t) => String(t ?? '').replace(/\[\[|\]\]|\{\{|\}\}/g, '')

// ------------------------------------------------------------------ pedaços desenhados

function costura() { // o pesponto que corre no meio da moldura (viewBox = carta de 132×185)
  const r = { x: 3.6, y: 3.6, width: 124.8, height: 177.8, rx: 10.6 }
  return svg('svg', { class: 'fz-carta__costura', viewBox: '0 0 132 185', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('rect', { class: 'fz-carta__ponto', ...r }),
    svg('rect', { class: 'fz-carta__ponto-brilho', ...r, pathLength: 100 }), // só na Lendária: um brilho que corre devagar pela costura
    svg('rect', { class: 'fz-carta__ponto-maldicao', ...r }),
  ])
}

function fiosSoltos(semente) { // fiapos que escapam da borda (só aparecem no estado "fiapo")
  const R = sorte(semente), g = svg('svg', { class: 'fz-carta__fios', viewBox: '0 0 132 185', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' })
  const pontos = [[14, 0, -1, -1], [58, 0, 0.4, -1], [112, 0, 1, -1], [132, 44, 1, -0.3], [132, 122, 1, 0.5], [96, 185, 0.6, 1], [34, 185, -0.5, 1], [0, 138, -1, 0.4], [0, 62, -1, -0.4]]
  for (const [x, y, dx, dy] of pontos) {
    const l = 9 + R() * 12, k = (R() - 0.5) * 16
    const d = `M${x} ${y} q${(dx * l * 0.5 + k * dy).toFixed(1)} ${(dy * l * 0.5 - k * dx).toFixed(1)} ${(dx * l).toFixed(1)} ${(dy * l).toFixed(1)}`
    g.append(svg('path', { class: 'fz-carta__fio-borda', d }), svg('path', { class: 'fz-carta__fio', d }))
  }
  return g
}

function alfinete() { // marca de "selecionada": alfinete de cabeça dourada espetado no alto
  return svg('svg', { class: 'fz-carta__alfinete', viewBox: '0 0 20 34', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('path', { class: 'fz-alfinete__haste', d: 'M10 11 L10 32' }),
    svg('circle', { class: 'fz-alfinete__cabeca', cx: 10, cy: 8, r: 6.4 }),
    svg('path', { class: 'fz-alfinete__luz', d: 'M6.6 6.4 Q7.6 3.8 10.4 3.6' }),
  ])
}

function verso() { // costas da carta: pano escuro com X bordado (usado na animação de comprar)
  const v = el('span', 'fz-carta__verso'); v.setAttribute('aria-hidden', 'true')
  v.append(svg('svg', { viewBox: '0 0 132 185', preserveAspectRatio: 'none' }, [
    svg('rect', { class: 'fz-verso__ponto', x: 8, y: 8, width: 116, height: 169, rx: 8 }),
    svg('path', { class: 'fz-verso__x', d: 'M46 72 L86 112 M86 72 L46 112' }),
    svg('circle', { class: 'fz-verso__botao', cx: 66, cy: 92, r: 30 }),
  ]))
  return v
}

// ------------------------------------------------------------------ desenho no canvas (parte, carinha, ícones)

function copiar(origem, destino) {
  destino.width = origem.width; destino.height = origem.height
  destino.getContext('2d').drawImage(origem, 0, 0)
}

function pintar(carta) {
  const m = carta.__fz
  if (!m) return
  const { dados, largura, variante } = m, d = densidade(), j = JANELA[variante] ?? JANELA.mao
  const u = largura / j.base, folga = variante === 'mao' ? 1.25 : 1 // a carta da mão cresce 1,25× sob o mouse
  // 1. a PARTE, grande
  const cv = m.arte, W = Math.round(j.w * u * d * folga), H = Math.round(j.h * u * d * folga)
  cv.width = W; cv.height = H
  const c = cv.getContext('2d'), margem = Math.round(W * 0.04)
  // sombra de contato no retalho
  const g = c.createRadialGradient(W / 2, H * 0.9, 2, W / 2, H * 0.9, W * 0.42)
  g.addColorStop(0, 'rgba(10,4,18,0.55)'); g.addColorStop(1, 'rgba(10,4,18,0)')
  c.fillStyle = g; c.beginPath(); c.ellipse(W / 2, H * 0.9, W * 0.42, H * 0.12, 0, 0, 6.3); c.fill()
  if (dados.dono?.partes) arte.desenharParte(c, dados.dono.partes, dados.lugar, { x: margem, y: margem, w: W - margem * 2, h: H - margem * 2 })
  // 2. carinha do dono, ícone do lugar e do tipo
  if (dados.dono?.partes) copiar(arte.retrato(dados.dono.partes, Math.round(20 * u * d * folga)), m.carinha)
  copiar(arte.iconeDoLugar(dados.lugar, Math.round(18 * u * d * folga)), m.lugar)
  copiar(arte.iconeDoTipo(dados.tipo, Math.round(24 * u * d * folga)), m.tipo)
  // 3. moldura no tecido do tipo (ladrilho de 48 px de tela: a trama nunca estica)
  carta.style.setProperty('--fz-tecido-img', `url(${arte.urlDoTecido(dados.tipo, Math.round(48 * d))})`)
}

/** Encolhe o nome para caber na fita (nunca corta, nunca usa "..."). */
function ajustarNome(carta) {
  const m = carta.__fz
  if (!m || m.variante === 'mini') return // na mini o nome quebra em duas linhas
  const c = ajustarNome.c ?? (ajustarNome.c = document.createElement('canvas').getContext('2d'))
  c.font = '400 100px "Lilita One", system-ui, sans-serif'
  const larguraDoNome = c.measureText(m.dados.nome).width / 100 // em "em"
  const cabe = (m.variante === 'ampliada' ? 112 : 114) / 14.5 // largura útil da fita ÷ tamanho da letra, em unidades da carta
  carta.style.setProperty('--fz-nome-k', Math.max(0.72, Math.min(1, cabe / larguraDoNome)).toFixed(3))
}

// ------------------------------------------------------------------ criar e atualizar

export function criarCarta(dados, opcoes = {}) {
  const variante = opcoes.variante ?? 'mao'
  const largura = opcoes.largura ?? (variante === 'mini' ? 88 : variante === 'ampliada' ? 264 : 132)
  const tag = opcoes.tag ?? 'button'
  const carta = el(tag, 'fz-carta')
  if (tag === 'button') carta.type = 'button'
  carta.dataset.id = dados.id ?? ''
  carta.dataset.tipo = dados.tipo; carta.dataset.lugar = dados.lugar; carta.dataset.variante = variante
  carta.style.setProperty('--fz-carta-l', largura + 'px')
  const cor = arte.corDoTecido(dados.tipo)
  carta.style.setProperty('--fz-tec', cor.base); carta.style.setProperty('--fz-tec-luz', cor.luz); carta.style.setProperty('--fz-tec-sombra', cor.sombra)
  const raridade = dados.raridade ?? String(dados.dono?.partes?.[dados.lugar] ?? '').split('@')[1] ?? 'comum'
  carta.dataset.raridade = raridade
  carta.style.setProperty('--fz-ponto', COR_DA_RARIDADE[raridade] ?? COR_DA_RARIDADE.comum)

  const nomeDoLugar = opcoes.nomeDoLugar ?? NOME_DO_LUGAR[dados.lugar] ?? ''
  const rotulo = `${dados.nome}, custo ${dados.custo} de Linha${opcoes.nomeDoTipo ? ', ' + opcoes.nomeDoTipo : ''}, ${nomeDoLugar}${dados.dono?.nome ? ' de ' + dados.dono.nome : ''}. ${textoPuro(dados.texto)}`
  carta.setAttribute('aria-label', rotulo)

  const moldura = el('span', 'fz-carta__moldura')
  const miolo = el('span', 'fz-carta__miolo')
  const janela = el('span', 'fz-carta__arte'); const cvArte = document.createElement('canvas'); janela.append(cvArte)
  const fita = el('span', 'fz-carta__fita'); fita.append(el('span', 'fz-carta__nome', dados.nome))
  const texto = el('span', 'fz-carta__texto'), frase = el('span', 'fz-carta__frase'); frase.append(...nosDoTexto(String(dados.texto ?? ''))); texto.append(frase)
  const fiapo = el('span', 'fz-carta__fiapo')
  const rodape = el('span', 'fz-carta__rodape')
  const lugar = el('span', 'fz-carta__lugar'); const cvLugar = document.createElement('canvas'); lugar.append(cvLugar, el('span', 'fz-carta__lugar-nome', nomeDoLugar)); lugar.title = nomeDoLugar
  const dono = el('span', 'fz-carta__dono'); const cvDono = document.createElement('canvas'); dono.append(el('span', 'fz-carta__dono-nome', dados.dono?.nome ?? ''), cvDono); if (dados.dono?.nome) dono.title = dados.dono.nome
  rodape.append(lugar, dono)
  miolo.append(janela, fita, texto, fiapo)

  const carretel = el('span', 'fz-carta__carretel fz-carretel fz-carretel--cheio'); carretel.append(carretelSvg(), el('span', 'fz-carta__custo', dados.custo))
  const tipo = el('span', 'fz-carta__tipo'); const cvTipo = document.createElement('canvas'); tipo.append(cvTipo); if (opcoes.nomeDoTipo) tipo.title = opcoes.nomeDoTipo
  const marca = el('span', 'fz-carta__marca')

  carta.append(moldura, fiosSoltos(semear(dados.id ?? dados.nome)), costura(), miolo, rodape, carretel, tipo, marca, alfinete(), verso())
  carta.__fz = { dados, largura, variante, arte: cvArte, carinha: cvDono, lugar: cvLugar, tipo: cvTipo, fiapo, marca, carretel }

  ajustarNome(carta)
  document.fonts?.ready?.then(() => ajustarNome(carta))
  if (arte.origem() !== 'carregando') pintar(carta)
  else arte.pronta.then(() => pintar(carta))
  if (opcoes.estado) atualizarCarta(carta, opcoes.estado)
  garantirFiltro()
  return carta
}

/** O filtro que desfia a borda do fiapo (um SVG escondido, posto uma vez na página). */
function garantirFiltro() {
  if (document.getElementById('fz-desfiado') || !document.body) return
  // o estilo vai pelo CSSOM (atributo style é barrado pela política de segurança do servidor: style-src 'self')
  const s = svg('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' }, [
    svg('filter', { id: 'fz-desfiado', x: '-12%', y: '-10%', width: '124%', height: '120%' }, [
      svg('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.11 0.42', numOctaves: 2, seed: 7, result: 'ruido' }),
      svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'ruido', scale: 6, xChannelSelector: 'R', yChannelSelector: 'G' }),
    ]),
  ])
  Object.assign(s.style, { position: 'absolute', width: '0', height: '0', overflow: 'hidden' })
  document.body.append(s)
}

const CHAVES_DE_ESTADO = { jogavel: 'jogavel', semLinha: 'sem-linha', vezDoRival: 'rival', selecionada: 'selecionada', fiapo: 'fiapo' }

/** Muda o estado da carta. Só o que vier em `estado` é alterado. */
export function atualizarCarta(carta, estado = {}) {
  const m = carta.__fz
  if (!m) return carta
  const atual = new Set((carta.dataset.estado ?? '').split(' ').filter(Boolean))
  for (const [k, nome] of Object.entries(CHAVES_DE_ESTADO)) if (k in estado) { if (estado[k]) atual.add(nome); else atual.delete(nome) }
  if (atual.has('fiapo')) { atual.delete('jogavel'); atual.delete('sem-linha') }
  carta.dataset.estado = [...atual].join(' ')
  m.carretel.classList.toggle('fz-carretel--cheio', !atual.has('sem-linha') && !atual.has('fiapo'))
  if ('fraseDoFiapo' in estado) { m.fiapo.textContent = estado.fraseDoFiapo ?? ''; m.fiapo.dataset.curto = String(estado.fraseDoFiapo ?? '').split(':')[0] }
  if ('marca' in estado) { m.marca.replaceChildren(); if (estado.marca) m.marca.append(criarMarcaDeVantagem(estado.marca, { pequena: true })) }
  if (carta.tagName === 'BUTTON') carta.setAttribute('aria-pressed', String(atual.has('selecionada')))
  return carta
}

/** Refaz os desenhos da carta (depois de mudar a largura, por exemplo). */
export function repintarCarta(carta, largura) {
  if (!carta.__fz) return
  if (largura) { carta.__fz.largura = largura; carta.style.setProperty('--fz-carta-l', largura + 'px') }
  if (arte.origem() !== 'carregando') pintar(carta)
}
