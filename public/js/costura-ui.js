// Frayz — tela da COSTURA (cruzamento) como REVELAÇÃO: mostra as chances exatas ANTES (chancesDaCostura), o custo e o que muda no Carretel;
// recusas do motor aparecem com o motivo; ao confirmar, o casulo abre parte por parte na ordem do motor (casulo.ordem).
// Nenhum número é calculado aqui: tudo vem de costura.js (via ponte.js).
import * as P from './ponte.js'
import * as Col from './colecao.js'
import * as Som from './som.js'
import * as Musica from './musica.js'
import { $, el, bonecoCanvas, chipParte, iconeTipo, pct, menos } from './ui.js'
import { carretel } from './colecao-ui.js'

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
      const b = Col.obter(S[k]); slot.append(bonecoCanvas(b, 56)); const l = el('div', 'cos-nome'); l.append(el('b', null, nomeDe(S[k])), carretel(b, true)); slot.append(l)
      const x = el('button', 'cos-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Tirar'); x.addEventListener('click', (ev) => { ev.stopPropagation(); S[k] = null; S.ativo = k; renderCostura() }); slot.append(x)
    } else slot.append(el('span', 'cos-vazio', 'toque num boneco abaixo'))
    const ativar = () => { S.ativo = k; renderPais() }
    slot.addEventListener('click', ativar); slot.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') ativar() })
    box.append(slot)
    if (k === 'a') box.append(el('span', 'cos-mais', '+'))
  }
}

function renderEscolha() {
  const g = $('#cosEscolha'); g.replaceChildren()
  const bs = Col.ativos().filter((b) => !Col.casuloFechado(b))
  for (const b of bs) {
    const f = P.fichaDoBoneco(b)
    const c = el('button', 'mini-cartao'); c.type = 'button'; c.dataset.id = b.id; c.setAttribute('role', 'listitem')
    c.classList.toggle('on', S.a === b.id || S.b === b.id)
    c.append(bonecoCanvas(b, 54), el('span', 'mini-nome', f.nome))
    const cr = el('span', 'mini-sub'); cr.append(iconeTipo(f.tipo, 11), el('span', null, `Carretel ${b.voltasUsadas ?? 0}/${P.PARAMS_COSTURA.carretelVoltas}`)); c.append(cr)
    c.addEventListener('click', () => escolher(b.id))
    g.append(c)
  }
}

function escolher(id) {
  S[S.ativo] = id
  S.ativo = !S.a ? 'a' : !S.b ? 'b' : S.ativo === 'a' ? 'b' : 'a'
  renderCostura()
}

function renderPrevia() {
  const box = $('#cosPrevia'); box.replaceChildren()
  const btn = $('#btnCosturar'), msg = $('#cosMsg'); msg.textContent = ''; btn.disabled = true
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
}

// ---------------------------------------------------------------- confirmar e abrir o casulo
function costurarAgora() {
  const r = Col.costurar(S.a, S.b)
  if (!r.ok) { $('#cosMsg').textContent = r.motivo; return }
  S.a = S.b = null; S.ativo = 'a'
  abrirCasuloDe(r.filho.id)
  renderCostura()
}

let cas = null // { id, ordem, i, filho }
export function abrirCasuloDe(id) {
  const filho = Col.obter(id)
  cas = { id, ordem: filho.casulo.ordem.slice(), i: 0, filho, abrindo: false }
  const box = $('#casPartes'); box.replaceChildren(); $('#casFilho').hidden = true; $('#casFilho').replaceChildren()
  $('#casSub').textContent = 'Os pais deram as partes. Abra uma de cada vez: a última (o Tronco) define o tipo.'
  cas.ordem.forEach((slot, k) => {
    const p = el('button', 'cas-parte fechada'); p.type = 'button'; p.dataset.slot = slot; p.dataset.k = String(k)
    p.append(el('em', null, NOME_PARTE[slot]), el('span', 'cas-ponto', '?'))
    p.setAttribute('aria-label', `Parte fechada: ${NOME_PARTE[slot]}`)
    p.addEventListener('click', () => { if (k === cas.i) abrirProxima(); else aviso(`Abra primeiro: ${NOME_PARTE[cas.ordem[cas.i]]}.`) })
    box.append(p)
  })
  for (const s of ['#btnCasAbrir', '#btnCasTudo']) $(s).hidden = false
  $('#btnCasFim').hidden = true
  marcarProxima(); $('#casulo').hidden = false; $('#btnCasAbrir').focus()
  try { Musica.momento('costura'); Musica.degrau(0) } catch { /* sem áudio */ }
}
const aviso = (t) => { $('#casSub').textContent = t }
function marcarProxima() {
  for (const p of document.querySelectorAll('#casPartes .cas-parte')) p.classList.toggle('proxima', p.classList.contains('fechada') && Number(p.dataset.k) === cas.i)
  if (cas.i < cas.ordem.length) $('#btnCasAbrir').textContent = `Abrir: ${NOME_PARTE[cas.ordem[cas.i]]}`
}
const esperarMs = (ms) => new Promise((r) => setTimeout(r, ms))

async function abrirProxima() {
  if (!cas || cas.abrindo || cas.i >= cas.ordem.length) return
  cas.abrindo = true
  const k = cas.i, slot = cas.ordem[k], gene = cas.filho.partes[slot].face, info = P.infoDaParte(gene)
  const p = $(`#casPartes .cas-parte[data-k="${k}"]`)
  // suspense cresce com a posição (a última é a mais demorada); sem tremida em "Menos animação"
  if (!menos()) { p.style.setProperty('--tremer', `${0.9 + k * 0.45}s`); p.classList.add('tremendo'); await esperarMs(380 + k * 220) } else await esperarMs(120)
  p.classList.remove('tremendo', 'fechada', 'proxima'); p.classList.add('aberta'); p.dataset.rar = info.raridade
  p.replaceChildren(el('em', null, NOME_PARTE[slot]))
  const rp = el('em', 'rar', P.RARIDADES[info.raridade].nome); rp.dataset.rar = info.raridade
  p.append(el('b', 'cas-apelido', P.apelidoDaParte(gene)), rp)
  const sub = info.carta ? info.carta.nome : info.bordado ? info.bordado.nome : ''
  if (sub) p.append(el('span', 'cas-nome', sub))
  p.setAttribute('aria-label', `${NOME_PARTE[slot]}: ${P.infoDaParte(gene).nome}, ${P.RARIDADES[info.raridade].nome}`)
  p.disabled = true
  Som.casuloParte(k, info.raridade)
  try { Musica.degrau(k + 1) } catch { /* sem áudio */ } // a caixinha sobe um degrau a cada parte aberta
  if (info.raridade === 'rara' || info.raridade === 'lendaria') { p.classList.add('festa', info.raridade); await esperarMs(menos() ? 200 : 700) }
  cas.i++; cas.abrindo = false
  if (cas.i >= cas.ordem.length) await terminar(); else marcarProxima()
}

async function terminar() {
  const b = Col.terminarCasulo(cas.id), f = P.fichaDoBoneco(b)
  $('#btnCasAbrir').hidden = true; $('#btnCasTudo').hidden = true; $('#btnCasFim').hidden = false
  $('#casSub').textContent = 'O filho nasceu!'
  const fb = $('#casFilho'); fb.replaceChildren(); fb.hidden = false
  const cv = bonecoCanvas(b, 130); cv.classList.add('cas-boneco'); fb.append(cv)
  const t = el('div', 'cas-info'); t.append(el('h3', null, f.nome))
  const tp = el('div', 'f-tipo'); tp.append(iconeTipo(f.tipo, 18), el('span', null, P.NOMES_DOS_TIPOS[f.tipo]), el('span', 'f-rar', `Geração ${b.geracao}`)); t.append(tp)
  const st = el('div', 'f-stats'); for (const [n, v] of [['Vida', f.vidaMax], ['Rapidez', f.rapidez], ['Firmeza', f.firmeza]]) { const s = el('span'); s.append(el('small', null, n + ' '), el('b', null, String(v))); st.append(s) }
  t.append(st, el('small', null, 'Já está na sua coleção e pode lutar.')); fb.append(t)
  fb.dataset.id = b.id
  const lend = Object.values(b.partes).some((x) => x.face.endsWith('@lendaria')), rara = Object.values(b.partes).some((x) => /@(rara|lendaria)$/.test(x.face))
  Som.vitoria(); void lend; void rara
  document.dispatchEvent(new CustomEvent('frayz-filho', { detail: b.id }))
}
async function abrirTudo() {
  while (cas && cas.i < cas.ordem.length) { await abrirProxima(); if (!menos()) await esperarMs(120) }
}

export function fecharCasulo() { if ($('#casulo').hidden) return false; $('#casulo').hidden = true; cas = null; try { Musica.momento('entrada') } catch { /* sem áudio */ } renderCostura(); return true }

export function iniciarCostura() {
  $('#btnCosturar').addEventListener('click', costurarAgora)
  $('#btnCasAbrir').addEventListener('click', abrirProxima)
  $('#btnCasTudo').addEventListener('click', abrirTudo)
  $('#btnCasFim').addEventListener('click', () => { const id = cas?.id; fecharCasulo(); aoIrParaColecao(id) })
}
