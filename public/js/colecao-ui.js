// Frayz — telas "Meus bonecos" (ficha, avesso, Carretel, remendos, árvore, aposentar) e "Mural". Só mostra o que o motor/costura devolvem.
import * as P from './ponte.js'
import * as Col from './colecao.js'
import * as Som from './som.js'
import { $, el, bonecoCanvas, chipParte, iconeTipo, avisoHub, confirmar, menos } from './ui.js'
import { carretelSvg, formatoDe } from './pecas/base.js'
import { criarPrateleira } from './pecas/prateleira.js'

const TESTE = new URLSearchParams(location.search).get('teste') === '1' // ferramentas de protótipo só no modo de teste (tarefa 21)
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`
const SLOTS = [['tronco', 'Tronco'], ['cabeca', 'Cabeça'], ['bracos', 'Braços'], ['pernas', 'Pernas'], ['bordado', 'Bordado']]
let aoMudar = () => {}
export const ligarColecao = (cb) => { aoMudar = cb }

/** Linha de dados curta de um boneco (usada em cartões e miniaturas). */
export function resumoDoBoneco(b) {
  const f = P.fichaDoBoneco(b), lim = P.PARAMS_COSTURA.carretelVoltas
  return { f, voltas: `${b.voltasUsadas ?? 0}/${lim}`, remendo: P.nivelDeRemendo(b), niveis: P.PARAMS_COSTURA.desgaste.niveisDeRemendo }
}

function estadoTxt(b) {
  if (b.estado === 'aposentado') return 'Aposentado (no Mural)'
  if (Col.casuloFechado(b)) return 'Casulo fechado: abra na aba Costura'
  if (P.podeAposentar(b)) return 'Chegou ao limite de remendos: só pode se aposentar'
  return 'Ativo'
}

export function renderColecao() {
  const bs = Col.ativos(), pc = formatoDe(null) === 'pc'
  const ret = Col.retalhos()
  $('#colResumo').textContent = `${plural(bs.length, 'boneco', 'bonecos')} · ${ret == null ? '' : `${ret} Retalhos Honrados · `}toque num boneco para ver a ficha.`
  // a prateleira (peça do ateliê): cada boneco com o desgaste no desenho e o Carretel na etiqueta
  criarPrateleira($('#colLista'), bs.map((b) => {
    const { f, voltas } = resumoDoBoneco(b)
    const aviso = Col.casuloFechado(b) ? 'casulo fechado' : P.podeAposentar(b) ? 'só aposentar' : `Carretel ${voltas}`
    return { id: b.id, nome: f.nome, desenho: () => bonecoCanvas(b, Math.round((pc ? 112 : 84) / 1.547)), sub: aviso }
  }), { porTabua: pc ? 5 : 3, nomes: true, classe: 'ficha col-cartao', aoTocar: abrirBoneco, rotulo: 'Seus bonecos' })
}

/** Carretel: uma volta por bolinha (usadas escurecem). */
function carretel(b, curto = false) {
  const tot = P.PARAMS_COSTURA.carretelVoltas, usadas = b.voltasUsadas ?? 0
  const w = el('span', 'carretel'); w.title = `Carretel: ${usadas} de ${tot} voltas usadas`
  w.setAttribute('aria-label', `Carretel: ${usadas} de ${tot} voltas usadas`)
  w.append(curto ? el('small', null, 'Carretel') : el('b', null, 'Carretel '))
  const voltas = el('span', 'voltas')
  for (let i = 0; i < tot; i++) { const c = el('span', 'fz-carretel' + (i < usadas ? '' : ' fz-carretel--cheio')); c.append(carretelSvg()); voltas.append(c) } // a volta usada deixa o carretel vazio
  w.append(voltas, el('span', 'carretel-n', `${usadas}/${tot}`))
  return w
}
export { carretel }

// ---------------------------------------------------------------- ficha do boneco da coleção
let abertoId = null, mostrarAvesso = false, protoAberto = false

export function abrirBoneco(id) {
  abertoId = id; mostrarAvesso = false
  desenharFicha(); $('#bonecoModal').hidden = false; $('#bonecoFechar').focus()
}
export function fecharBoneco() { if ($('#bonecoModal').hidden) return false; $('#bonecoModal').hidden = true; abertoId = null; aoMudar(); return true }

function arvore(b, prof = 0) {
  const no = el('div', 'arv-no')
  const f = P.fichaDoBoneco(b)
  const item = el('div', 'arv-item'); item.dataset.id = b.id
  item.append(el('b', null, f.nome), el('small', null, ` geração ${b.geracao ?? 0}`))
  no.append(item)
  const pais = (b.pais ?? []).map((pid) => Col.obter(pid))
  if (b.pais?.length) {
    const fil = el('div', 'arv-pais')
    for (let i = 0; i < b.pais.length; i++) {
      const p = pais[i]
      if (p && prof < 3) fil.append(arvore(p, prof + 1))
      else fil.append(el('div', 'arv-no arv-sumiu', 'boneco que saiu da coleção'))
    }
    no.append(fil)
  }
  return no
}

function desenharFicha() {
  const b = Col.obter(abertoId), c = $('#bonecoCorpo'); c.replaceChildren()
  if (!b) return
  const { f, remendo, niveis } = resumoDoBoneco(b)
  const topo = el('div', 'fc-topo'); topo.append(bonecoCanvas(b, 100))
  const t = el('div', 'fc-tit'); t.append(el('h3', null, f.nome))
  const tp = el('div', 'f-tipo'); tp.append(iconeTipo(f.tipo, 18), el('span', null, P.NOMES_DOS_TIPOS[f.tipo]), el('span', 'f-rar', `Geração ${b.geracao ?? 0}`)); t.append(tp)
  const st = el('div', 'f-stats')
  for (const [n, v] of [['Vida', f.vidaMax], ['Rapidez', f.rapidez], ['Firmeza', f.firmeza]]) { const s = el('span'); s.append(el('small', null, n + ' '), el('b', null, String(v))); st.append(s) }
  t.append(st, el('div', 'fc-estados', estadoTxt(b)))
  topo.append(t); c.append(topo)

  // Carretel e Pontos de Costura
  const med = el('div', 'fc-medidas')
  const m1 = el('div', 'fc-medida'); m1.append(carretel(b), el('small', null, 'Voltas de costura que ele ainda pode dar.')); med.append(m1)
  const lim = P.PARAMS_COSTURA.desgaste.limite, pts = b.pontosDeCostura ?? 0
  const m2 = el('div', 'fc-medida'); m2.id = 'fcPontos'
  const barra = el('div', 'barra-pontos'); const dentro = el('i'); dentro.style.width = `${Math.min(100, (pts / lim) * 100)}%`; barra.append(dentro)
  m2.append(el('b', null, 'Pontos de Costura '), el('span', 'fc-pts', `${pts}/${lim}`), barra, el('small', null, `Remendos no desenho: ${remendo} de ${niveis}. É só desgaste: não tira força.`))
  med.append(m2); c.append(med)

  // Partes (frente) ou avesso (forros)
  const bAv = el('button', 'btn mini on-avesso', mostrarAvesso ? 'Voltar à frente' : 'Olhar o avesso'); bAv.type = 'button'; bAv.id = 'btnAvesso'; bAv.setAttribute('aria-pressed', String(mostrarAvesso))
  bAv.addEventListener('click', () => { mostrarAvesso = !mostrarAvesso; desenharFicha() })
  const cab = el('div', 'fc-cab'); cab.append(el('h4', null, mostrarAvesso ? 'O avesso (forros escondidos)' : 'Partes (a frente é o que luta)'), bAv); c.append(cab)
  const ul = el('ul', 'fc-partes' + (mostrarAvesso ? ' avesso' : '')); ul.id = 'fcPartes'
  const forros = mostrarAvesso ? P.olharOAvesso(b) : null
  for (const [slot, nome] of SLOTS) {
    const gene = forros ? forros[slot] : b.partes[slot].face, i = P.infoDaParte(gene)
    const li = el('li'); li.dataset.slot = slot
    li.append(el('small', 'slot-nome', nome)); li.append(chipParte(gene, { forro: !!forros }))
    if (i.carta) li.append(el('span', 'parte-txt', `${i.carta.nome} (${i.carta.linha}): ${i.carta.texto}`))
    if (i.bordado) li.append(el('span', 'parte-txt', `${i.bordado.nome}: ${i.bordado.texto}`))
    ul.append(li)
  }
  c.append(ul)

  // árvore da família
  c.append(el('h4', 'fc-h4', 'Árvore da família'))
  const arv = el('div', 'arvore'); arv.id = 'fcArvore'; arv.append(arvore(b))
  if (!b.pais?.length) arv.append(el('small', null, 'Boneco de origem: sem pais.'))
  c.append(arv)

  const est = el('div', 'fc-stat-linha', `Lutas ${b.lutas ?? 0} · Vitórias ${b.vitorias ?? 0} · Maior golpe ${b.maiorGolpe ?? 0}`); c.append(est)

  // aposentar
  if (b.estado !== 'aposentado') {
    const ap = el('button', 'btn grande', 'Aposentar'); ap.id = 'btnAposentar'; ap.type = 'button'
    ap.disabled = !P.podeAposentar(b)
    const nota = el('small', 'fc-nota', P.podeAposentar(b) ? 'Ele vai para o Mural e devolve Retalhos Honrados.' : 'Só quando os Pontos de Costura chegarem ao limite.')
    ap.addEventListener('click', () => pedirAposentar(b.id, ap))
    const l = el('div', 'fc-acao'); l.append(ap, nota); c.append(l)
    // ferramentas do protótipo (para ver os remendos sem jogar centenas de lutas; só no modo local)
    if (!TESTE || !Col.temFerramentasDePrototipo()) return
    const det = el('details', 'proto'); det.open = protoAberto; det.addEventListener('toggle', () => { protoAberto = det.open }); det.append(el('summary', null, 'Protótipo: gastar este boneco'))
    const d1 = el('button', 'btn mini', '+240 lutas de treino'); d1.id = 'btnEnvelhecer'; d1.type = 'button'
    const d2 = el('button', 'btn mini', 'Gastar até o limite'); d2.id = 'btnEnvelhecerTudo'; d2.type = 'button'
    const remendou = (fn) => { const antes = P.nivelDeRemendo(Col.obter(b.id)); fn(); if (P.nivelDeRemendo(Col.obter(b.id)) > antes) Som.tocar('remendo') } // remendo novo: agulha passando 3 vezes
    d1.addEventListener('click', () => { remendou(() => Col.envelhecerDemo(b.id, 240)); desenharFicha(); renderColecao() })
    d2.addEventListener('click', () => { remendou(() => Col.envelhecerDemo(b.id, lim)); desenharFicha(); renderColecao() })
    det.append(el('p', 'fc-nota', 'Chama registrarLuta do motor várias vezes. Só para o protótipo.'), d1, d2); c.append(det)
  }
}

/** Aposentar não tem volta: pergunta antes, dizendo o que se ganha (o número vem do motor ou do servidor, na cerimônia). */
async function pedirAposentar(id, botao) {
  const b = Col.obter(id), nome = P.fichaDoBoneco(b).nome
  const sim = await confirmar({
    titulo: `Aposentar ${nome}?`, texto: 'Não tem volta: ele para de lutar e de costurar.',
    linhas: ['Ganha um quadro no Mural, com todas as lutas, vitórias e o maior golpe.', 'Devolve Retalhos Honrados (o número aparece na cerimônia).'],
    sim: 'Aposentar', nao: 'Agora não',
  })
  if (!sim || botao.disabled) return
  botao.disabled = true // um toque só (o servidor pode demorar)
  await cerimonia(id)
}

async function cerimonia(id) {
  const b = Col.obter(id), nome = P.fichaDoBoneco(b).nome
  const r = await Col.aposentar(id)
  if (!r.ok) { avisoHub(r.motivo); desenharFicha(); return }
  Som.aposentadoria()
  const c = $('#bonecoCorpo'); c.replaceChildren()
  const box = el('div', 'cerimonia'); box.id = 'cerimonia'
  // tarefa 21: o boneco entra num quadro de moldura de madeira, que depois vai para o Mural
  const quadro = el('div', 'cer-quadro'); quadro.id = 'cerQuadro'
  const cv = bonecoCanvas(Col.obter(id), 120); cv.classList.add('cer-boneco'); quadro.append(cv, el('span', 'cer-placa', nome))
  box.append(quadro, el('h3', null, `${nome} se aposentou`), el('p', null, 'Ele vai para o Mural com tudo o que lutou.'))
  const ret = el('div', 'cer-ret'); ret.id = 'cerRetalhos'; ret.textContent = `+${r.retalhos} Retalhos Honrados`
  box.append(ret, el('p', 'fc-nota', `Lutas ${r.mural.lutas} · Vitórias ${r.mural.vitorias} · Maior golpe ${r.mural.maiorGolpe}`))
  const ir = el('button', 'btn grande', 'Levar ao Mural'); ir.id = 'btnVerMural'; ir.type = 'button'
  ir.addEventListener('click', async () => {
    if (ir.disabled) return
    ir.disabled = true
    if (!menos()) { // o quadro sobe e encolhe em direção à aba do Mural
      const aba = document.querySelector('#abaMural')?.getBoundingClientRect(), q = quadro.getBoundingClientRect()
      const dx = aba ? aba.left + aba.width / 2 - (q.left + q.width / 2) : 0, dy = aba ? aba.top + aba.height / 2 - (q.top + q.height / 2) : -200
      await quadro.animate?.([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 30}px) rotate(-4deg) scale(0.7)`, opacity: 1, offset: 0.55 }, { transform: `translate(${dx}px, ${dy}px) rotate(2deg) scale(0.18)`, opacity: 0.2 }], { duration: 650, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }).finished.catch(() => {})
    }
    Som.tocar('botao')
    fecharBoneco(); document.dispatchEvent(new CustomEvent('frayz-aba', { detail: 'mural' }))
    requestAnimationFrame(() => { const novo = document.querySelector(`#murLista .mural-cartao[data-id="${id}"]`); if (novo) { novo.classList.add('mural-novo'); novo.scrollIntoView?.({ block: 'nearest' }) } })
  })
  box.append(ir); c.append(box)
}

// ---------------------------------------------------------------- Mural
export function renderMural() {
  const lista = $('#murLista'); lista.replaceChildren()
  const m = Col.mural()
  const ret = Col.retalhos()
  $('#murResumo').textContent = m.length ? `${plural(m.length, 'boneco aposentado', 'bonecos aposentados')}${ret == null ? '' : ` · ${ret} Retalhos Honrados`}.` : ''
  if (!m.length) lista.append(el('p', 'hub-vazio', 'Ainda ninguém se aposentou. Quando os Pontos de Costura de um boneco chegarem ao limite, ele ganha um quadro aqui, com tudo o que lutou.'))
  for (const x of m) { // cada aposentado num quadro de moldura de madeira
    const b = Col.obter(x.id)
    const c = el('div', 'ficha mural-cartao'); c.dataset.id = x.id
    if (b) c.append(bonecoCanvas(b, 78, 'vivo'))
    const info = el('div', 'f-info')
    info.append(el('div', 'f-nome', x.nome), el('div', 'f-partes', `Geração ${x.geracao} · voltas de costura dadas: ${x.voltasUsadas}`))
    info.append(el('div', 'f-stats', `Lutas ${x.lutas} · Vitórias ${x.vitorias} · Maior golpe ${x.maiorGolpe}`))
    if (x.retalhos != null) info.append(el('div', 'mural-ret', `+${x.retalhos} Retalhos Honrados`))
    c.append(info); lista.append(c)
  }
}
