// Frayz — tela da COSTURA (cruzamento) como REVELAÇÃO: mostra as chances exatas ANTES (chancesDaCostura), o custo e o que muda no Carretel;
// recusas do motor aparecem com o motivo; ao confirmar, o casulo abre parte por parte na ordem do motor (casulo.ordem).
// Nenhum número é calculado aqui: tudo vem de costura.js (via ponte.js).
import * as P from './ponte.js'
import * as Col from './colecao.js'
import * as Som from './som.js'
import * as Musica from './musica.js'
import { $, el, avisoHub, bonecoCanvas, chipParte, iconeTipo, pct, menos } from './ui.js'
import { carretel } from './colecao-ui.js'
import { formatoDe } from './pecas/base.js'
import { atualizarBotao, criarBotao } from './pecas/botao.js'
import { criarPrateleira } from './pecas/prateleira.js'
import { bonecoEm } from './pecas/montagens.js'

const NOME_PARTE = { tronco: 'Tronco', cabeca: 'Cabeça', bracos: 'Braços', pernas: 'Pernas', bordado: 'Bordado' }
const S = { a: null, b: null, ativo: 'a' }
let aoIrParaColecao = () => {}
export const ligarCostura = (cb) => { aoIrParaColecao = cb }

function nomeDe(id) { return P.fichaDoBoneco(Col.obter(id)).nome }

export function renderCostura() {
  for (const k of ['a', 'b']) if (S[k] && (!Col.obter(S[k]) || Col.obter(S[k]).estado === 'aposentado')) S[k] = null
  renderPais(); renderEscolha(); renderPrevia()
}

function renderPais() {
  const box = $('#cosPais'); box.replaceChildren()
  for (const k of ['a', 'b']) {
    const slot = el('div', 'cos-slot' + (S.ativo === k ? ' ativo' : '') + (S[k] ? ' cheio' : '')); slot.dataset.slot = k
    slot.setAttribute('role', 'button'); slot.tabIndex = 0
    slot.append(el('em', 'cos-rot', k === 'a' ? 'Pai A' : 'Pai B'))
    if (S[k]) {
      const b = Col.obter(S[k]), c = el('div', 'fz-circulo fz-circulo--cheio'); c.append(el('span', 'fz-circulo__anel'), bonecoEm(P.facesDe(b), formatoDe(null) === 'pc' ? 76 : 62)); slot.append(c)
      const l = el('div', 'cos-nome'); l.append(el('b', null, nomeDe(S[k])), carretel(b, true)); slot.append(l)
      const x = el('button', 'cos-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Tirar'); x.addEventListener('click', (ev) => { ev.stopPropagation(); S[k] = null; S.ativo = k; renderCostura() }); slot.append(x)
    } else slot.append(el('span', 'cos-vazio', 'toque num boneco abaixo'))
    const ativar = () => { S.ativo = k; renderPais() }
    slot.addEventListener('click', ativar); slot.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') ativar() })
    box.append(slot)
    if (k === 'a') box.append(el('span', 'cos-mais', '+'))
  }
}

function renderEscolha() {
  const pc = formatoDe(null) === 'pc'
  const bs = Col.ativos().filter((b) => !Col.casuloFechado(b))
  const p = criarPrateleira($('#cosEscolha'), bs.map((b) => ({ id: b.id, nome: P.fichaDoBoneco(b).nome, desenho: () => bonecoCanvas(b, Math.round((pc ? 88 : 76) / 1.547)),
    sub: `Carretel ${b.voltasUsadas ?? 0}/${P.PARAMS_COSTURA.carretelVoltas}` })), { porTabua: pc ? 4 : 3, nomes: pc, classe: 'mini-cartao', aoTocar: escolher, rotulo: 'Escolha os pais' })
  p.marcar({ escolhidos: [S.a, S.b].filter(Boolean), aberto: null })
  for (const b of bs) { const i = [S.a, S.b].indexOf(b.id); if (i >= 0) p.botoes[b.id].querySelector('.fz-time__ordem').textContent = i ? 'B' : 'A' }
}

function escolher(id) {
  const saiu = S[S.ativo]
  if (saiu && saiu !== id && ![S.a, S.b].includes(id)) avisoHub(`${nomeDe(saiu)} saiu da costura (${S.ativo === 'a' ? 'Pai A' : 'Pai B'}).`, false) // tarefa 21: trocar um pai avisa quem saiu
  const tinha = !!(S.a && S.b)
  S[S.ativo] = id
  S.ativo = !S.a ? 'a' : !S.b ? 'b' : S.ativo === 'a' ? 'b' : 'a'
  if (S.a && S.b && !tinha) S.rolar = true
  renderCostura()
}

function renderPrevia() {
  const box = $('#cosPrevia'); box.replaceChildren()
  const btn = $('#btnCosturar'), msg = $('#cosMsg'); msg.textContent = ''; btn.disabled = true
  const resumo = $('#cosResumo'); resumo.replaceChildren(); resumo.hidden = true
  // casulos que ficaram fechados (ex.: a página foi fechada na hora)
  for (const b of Col.casulosFechados()) {
    const p = el('div', 'cos-pendente'); p.append(el('span', null, `Um casulo ficou fechado: ${nomeDe(b.id)}.`))
    const o = el('button', 'btn mini', 'Abrir casulo'); o.type = 'button'; o.addEventListener('click', () => abrirCasuloDe(b.id)); p.append(o); box.append(p)
  }
  if (!S.a || !S.b) { box.append(el('p', 'cos-dica', 'Escolha os dois pais para ver, ANTES, a chance de cada parte do filho.')); return }
  const A = Col.obter(S.a), B = Col.obter(S.b)
  const pode = P.podeCosturar(A, B)
  if (!pode.ok) {
    const r = el('div', 'cos-recusa'); r.id = 'cosRecusa'; r.dataset.codigo = pode.codigo
    r.append(el('b', null, 'Não dá para costurar: '), pode.motivo); box.append(r); msg.textContent = pode.motivo; return
  }
  const ch = P.chancesDaCostura(A, B), custo = P.custoDaCostura(A, B), tot = P.PARAMS_COSTURA.carretelVoltas
  // custo e Carretel
  const info = el('div', 'cos-info')
  const c1 = el('div', 'cos-custo'); c1.id = 'cosCusto'; c1.append(el('b', null, `Custo: ${String(custo).replace('.', ',')}`), el('small', null, ' — sem cobrança no protótipo')); info.append(c1)
  const c2 = el('div', 'cos-carretel'); c2.id = 'cosCarretel'
  for (const [b, rot] of [[A, 'Pai A'], [B, 'Pai B']]) {
    const u = b.voltasUsadas ?? 0
    c2.append(el('span', null, `${rot} (${nomeDe(b.id)}): Carretel ${u}/${tot} → ${u + 1}/${tot}${u + 1 >= tot ? ' (última volta)' : ''}`))
  }
  info.append(c2); box.append(info)
  // tarefa 21: no pé, logo acima do botão "Costurar", o custo e o gasto de Carretel (visíveis sem rolar)
  resumo.append(el('b', null, `Custo ${String(custo).replace('.', ',')}`), el('span', null, ` · Carretel: A ${A.voltasUsadas ?? 0}→${(A.voltasUsadas ?? 0) + 1}/${tot} · B ${B.voltasUsadas ?? 0}→${(B.voltasUsadas ?? 0) + 1}/${tot}`))
  resumo.hidden = false
  // chances por parte
  const tab = el('div', 'cos-partes'); tab.id = 'cosChances'
  for (const slot of P.PARTES_DO_BONECO) {
    const sec = el('section', 'cos-parte'); sec.dataset.slot = slot
    const cab = el('h4', null, NOME_PARTE[slot]); sec.append(cab)
    const ul = el('ul', 'cos-chances')
    for (const x of ch[slot].face) {
      const li = el('li'); li.dataset.chance = String(x.chance); li.dataset.gene = x.gene
      li.append(chipParte(x.gene)); const barra = el('span', 'cos-barra'); const i = el('i'); i.style.width = `${x.chance * 100}%`; barra.append(i)
      li.append(barra, el('b', 'cos-pct', pct(x.chance))); ul.append(li)
    }
    sec.append(ul)
    const rar = Object.entries(ch[slot].raridadeDaFace).filter(([, v]) => v > 0).map(([k, v]) => `${P.RARIDADES[k].nome} ${pct(v)}`).join(' · ')
    sec.append(el('small', 'cos-rar', `Raridade da face: ${rar}`))
    const det = el('details', 'cos-forro'); det.append(el('summary', null, 'Forro (escondido)'))
    const uf = el('ul', 'cos-chances forro')
    for (const x of ch[slot].forro) { const li = el('li'); li.dataset.chance = String(x.chance); li.append(chipParte(x.gene, { forro: true }), el('b', 'cos-pct', pct(x.chance))); uf.append(li) }
    det.append(uf); sec.append(det); tab.append(sec)
  }
  box.append(tab)
  btn.disabled = false
  // os dois pais escolhidos agora: as chances sobem para perto do botão (o jogador vê sem rolar)
  if (S.rolar) { S.rolar = false; requestAnimationFrame(() => { const sc = document.querySelector('#costura .sub-rolagem'), alvo = $('#cosCusto'); if (sc && alvo) sc.scrollTop += alvo.getBoundingClientRect().top - sc.getBoundingClientRect().top - 8 }) }
}

// ---------------------------------------------------------------- confirmar e abrir o casulo
async function costurarAgora() {
  const btn = $('#btnCosturar')
  if (btn.disabled) return
  btn.disabled = true // o pedido ao servidor pode demorar: um toque só
  const r = await Col.costurar(S.a, S.b)
  if (!r.ok) { btn.disabled = false; $('#cosMsg').textContent = r.motivo; return }
  S.a = S.b = null; S.ativo = 'a'
  abrirCasuloDe(r.filho.id)
  renderCostura()
}

let cas = null // { id, ordem, i, filho, abrindo, opc }
/** Abre o casulo de um boneco parte por parte. opc (primeira abertura): { titulo, sub, fimRotulo, aoFim, partes (genes já abertos) } */
export function abrirCasuloDe(id, opc = {}) {
  const filho = Col.obter(id)
  const partes = opc.partes ?? filho.partes
  cas = { id, ordem: opc.ordem ?? filho.casulo.ordem.slice(), i: 0, filho: { ...filho, partes }, abrindo: false, opc }
  const box = $('#casPartes'); box.replaceChildren(); $('#casFilho').hidden = true; $('#casFilho').replaceChildren()
  $('#casTit').textContent = opc.titulo ?? 'Casulo de retalhos'
  $('#casSub').textContent = opc.sub ?? 'Os pais deram as partes. Abra uma de cada vez: a última (o Tronco) define o tipo.'
  $('#casulo').dataset.tipo = opc.tipo ?? 'costura'
  cas.ordem.forEach((slot, k) => {
    const p = el('button', 'cas-parte fechada'); p.type = 'button'; p.dataset.slot = slot; p.dataset.k = String(k)
    p.append(el('em', null, NOME_PARTE[slot]), el('span', 'cas-caixa'))
    p.setAttribute('aria-label', `Parte fechada: ${NOME_PARTE[slot]}`)
    p.addEventListener('click', () => { if (k === cas.i) abrirProxima(); else aviso(`Abra primeiro: ${NOME_PARTE[cas.ordem[cas.i]]}.`) })
    box.append(p)
  })
  for (const s of ['#btnCasAbrir', '#btnCasTudo']) $(s).hidden = false
  $('#btnCasFim').hidden = true; atualizarBotao($('#btnCasFim'), { rotulo: opc.fimRotulo ?? 'Ver na coleção' })
  $('#casulo').dataset.formato = formatoDe(null)
  marcarProxima(); $('#casulo').hidden = false; $('#btnCasAbrir').focus()
  try { Musica.momento('costura'); Musica.degrau(0) } catch { /* sem áudio */ }
}
const aviso = (t) => { $('#casSub').textContent = t }
function marcarProxima() {
  for (const p of document.querySelectorAll('#casPartes .cas-parte')) p.classList.toggle('proxima', p.classList.contains('fechada') && Number(p.dataset.k) === cas.i)
  if (cas.i < cas.ordem.length) atualizarBotao($('#btnCasAbrir'), { rotulo: `Abrir: ${NOME_PARTE[cas.ordem[cas.i]]}` })
}
const esperarMs = (ms) => new Promise((r) => setTimeout(r, ms))

async function abrirProxima() {
  const c = cas // tarefa 21: o casulo pode fechar no meio (Esc, X, clique fora): depois de cada espera, confere se ainda é o mesmo
  if (!c || c.abrindo || c.i >= c.ordem.length) return
  c.abrindo = true
  const k = c.i, slot = c.ordem[k], gene = c.filho.partes[slot].face, info = P.infoDaParte(gene)
  const p = $(`#casPartes .cas-parte[data-k="${k}"]`)
  // suspense cresce com a posição (a última é a mais demorada); sem tremida em "Menos animação"
  if (!menos()) { p.style.setProperty('--tremer', `${0.9 + k * 0.45}s`); p.classList.add('tremendo'); await esperarMs(380 + k * 220) } else await esperarMs(120)
  if (cas !== c) return // fechou no meio: o casulo fica pendente, sem erro
  p.classList.remove('tremendo', 'fechada', 'proxima'); p.classList.add('aberta'); p.dataset.rar = info.raridade
  // a caixinha sobe e some; por baixo, a parte (com "Menos animação" a caixinha só sai)
  const caixa = p.querySelector('.cas-caixa')
  if (caixa && !menos()) { caixa.classList.add('cas-caixa--sobe'); setTimeout(() => caixa.remove(), 560) } else caixa?.remove()
  const dentro = el('span', 'cas-dentro')
  const rp = el('em', 'rar', P.RARIDADES[info.raridade].nome); rp.dataset.rar = info.raridade
  dentro.append(el('b', 'cas-apelido', P.apelidoDaParte(gene)), rp)
  const sub = info.carta ? info.carta.nome : info.bordado ? info.bordado.nome : ''
  if (sub) dentro.append(el('span', 'cas-nome', sub))
  p.append(dentro)
  p.setAttribute('aria-label', `${NOME_PARTE[slot]}: ${P.infoDaParte(gene).nome}, ${P.RARIDADES[info.raridade].nome}`)
  p.disabled = true
  Som.casuloParte(k, info.raridade)
  try { Musica.degrau(k + 1) } catch { /* sem áudio */ } // a caixinha sobe um degrau a cada parte aberta
  if (info.raridade === 'rara' || info.raridade === 'lendaria') { p.classList.add('festa', info.raridade); await esperarMs(menos() ? 200 : 700) }
  if (cas !== c) return
  c.i++; c.abrindo = false
  if (c.i >= c.ordem.length) await terminar(c); else marcarProxima()
}

async function terminar(c) {
  if (c.opc.aoFim) { await c.opc.aoFim(c); return } // primeira abertura: quem abriu decide o fim
  const b = await Col.terminarCasulo(c.id)
  if (cas !== c) return
  mostrarNascido(b)
  if (b.erro) $('#casSub').textContent = b.erro
  document.dispatchEvent(new CustomEvent('frayz-filho', { detail: b.id }))
}
async function abrirTudo() {
  const c = cas
  while (c && cas === c && c.i < c.ordem.length) { await abrirProxima(); if (!menos()) await esperarMs(120) }
}
/** Mostra o boneco pronto no fim do casulo (costura e primeira abertura). */
export function mostrarNascido(b, { titulo = 'O filho nasceu!', nota = 'Já está na sua coleção e pode lutar.' } = {}) {
  const f = P.fichaDoBoneco(b)
  $('#btnCasAbrir').hidden = true; $('#btnCasTudo').hidden = true; $('#btnCasFim').hidden = false
  $('#casSub').textContent = titulo
  const fb = $('#casFilho'); fb.replaceChildren(); fb.hidden = false
  const cv = bonecoCanvas(b, formatoDe(null) === 'pc' ? 132 : 92); cv.classList.add('cas-boneco'); fb.append(cv)
  const t = el('div', 'cas-info'); t.append(el('h3', null, f.nome))
  const tp = el('div', 'f-tipo'); tp.append(iconeTipo(f.tipo, 18), el('span', null, P.NOMES_DOS_TIPOS[f.tipo]), el('span', 'f-rar', `Geração ${b.geracao ?? 0}`)); t.append(tp)
  const st = el('div', 'f-stats'); for (const [n, v] of [['Vida', f.vidaMax], ['Rapidez', f.rapidez], ['Firmeza', f.firmeza]]) { const s = el('span'); s.append(el('small', null, n + ' '), el('b', null, String(v))); st.append(s) }
  t.append(st, el('small', null, nota)); fb.append(t)
  fb.dataset.id = b.id
  Som.vitoria()
  $('#btnCasFim').focus()
}

/** Fecha o casulo (X, Esc, clique fora ou o botão do fim). Fechar no meio deixa o casulo pendente (abre de novo na Costura). */
export function fecharCasulo() {
  if ($('#casulo').hidden) return false
  const c = cas
  $('#casulo').hidden = true; cas = null
  try { Musica.momento('entrada') } catch { /* sem áudio */ }
  if (c?.opc.aoFechar) c.opc.aoFechar(c)
  renderCostura(); return true
}

export function iniciarCostura() {
  // os botões viram botões-retalho (peça botao.js); os ids ficam
  for (const [id, rotulo, variante] of [['btnCosturar', 'Costurar', 'principal'], ['btnCasAbrir', 'Abrir próxima parte', 'principal'], ['btnCasTudo', 'Abrir tudo', 'secundario'], ['btnCasFim', 'Ver na coleção', 'principal']]) {
    const velho = $('#' + id), novo = criarBotao({ rotulo, variante, desligado: velho.disabled }); novo.id = id; novo.hidden = velho.hidden; velho.replaceWith(novo)
  }
  $('#btnCosturar').addEventListener('click', costurarAgora)
  $('#btnCasAbrir').addEventListener('click', abrirProxima)
  $('#btnCasTudo').addEventListener('click', abrirTudo)
  $('#btnCasFim').addEventListener('click', () => { const c = cas, id = c?.id; fecharCasulo(); if (!c?.opc.aoFechar) aoIrParaColecao(id) })
  $('#casFechar').addEventListener('click', fecharCasulo)
}
