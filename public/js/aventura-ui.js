// Frayz — tela da AVENTURA "Baú da Costureira": energia à vista, mapa de 5 fases num fio, o time do rival da fase e a escolha do seu time.
// Os times e robôs das fases vêm de aventura-dados.js (PROVISÓRIO); o progresso vem de colecao.js; a energia vem da ponte
// (P.energia: atual, máximo e quando recarrega). Nenhuma regra aqui: a tela só mostra e pede.
import * as P from './ponte.js'
import * as Col from './colecao.js'
import { FASES } from './aventura-dados.js'
import { $, el, bonecoCanvas, iconeTipo, NOME_LUGAR } from './ui.js'
import { carretelSvg, formatoDe } from './pecas/base.js'
import { atualizarBotao, criarBotao } from './pecas/botao.js'
import { criarPrateleira } from './pecas/prateleira.js'
import { bonecoEm, partesDaFicha } from './pecas/montagens.js'

const NOME_ROBO = { ganancioso: 'Ganancioso', planejador: 'Planejador' }
const DESC_ROBO = { ganancioso: 'joga o que bate mais forte agora', planejador: 'pensa dois turnos à frente' }
let fase = 1, aoJogar = () => {}, prateleira = null
export const ligarAventura = (cb) => { aoJogar = cb }
export const faseAtual = () => fase

/** "hh:mm" da hora local em que a energia volta. */
export const horaDaRecarga = (e) => new Date(e.recarregaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** A etiqueta da energia (carretel + número + quando recarrega). Sem energia: explica quando volta, sem punir. */
function renderEnergia() {
  const e = P.energia(), box = $('#avEnergia'), hora = horaDaRecarga(e)
  const c = el('span', 'fz-carretel' + (e.atual > 0 ? ' fz-carretel--cheio' : '')); c.append(carretelSvg())
  const tx = el('span')
  tx.append(el('b', null, `Energia ${e.atual}/${e.maximo}`))
  tx.append(el('small', null, e.atual > 0 ? `recarrega às ${hora}` : `acabou por hoje: volta inteira às ${hora}. A Luta livre não gasta energia.`))
  box.replaceChildren(c, tx)
  box.classList.toggle('hub-energia--vazia', e.atual <= 0)
  box.setAttribute('aria-label', `Energia ${e.atual} de ${e.maximo}; recarrega às ${hora}`)
  return e
}

export function renderAventura() {
  const prog = Col.aventura(), pc = formatoDe(null) === 'pc'
  if (fase > prog.liberada) fase = prog.liberada
  renderEnergia()
  const mapa = $('#avMapa'); mapa.replaceChildren()
  for (const f of FASES) {
    const venceu = prog.vencidas.includes(f.n), livre = f.n <= prog.liberada
    const li = el('li', 'av-no'); const b = el('button', 'av-estacao'); b.type = 'button'; b.dataset.fase = String(f.n)
    b.classList.toggle('vencida', venceu); b.classList.toggle('travada', !livre); b.classList.toggle('sel', f.n === fase); b.classList.toggle('atual', livre && !venceu && f.n === prog.liberada)
    b.setAttribute('aria-label', `Fase ${f.n}: ${f.nome}${venceu ? ', vencida' : livre ? '' : ', travada'}`)
    b.setAttribute('aria-pressed', String(f.n === fase))
    b.disabled = !livre
    b.append(el('span', 'av-num', venceu ? '✓' : livre ? String(f.n) : '·'), el('span', 'av-nome', f.nome))
    b.addEventListener('click', () => { fase = f.n; renderAventura() })
    li.append(b); mapa.append(li)
  }
  // o rival da fase: os 3 bonecos nos lugares bordados, com o nome e a vida (o rival MOSTRA o que vai fazer na luta)
  const F = FASES[fase - 1], info = $('#avInfo'); info.replaceChildren()
  const topo = el('div', 'av-topo'); topo.append(el('span', null, `Fase ${F.n}: ${F.nome}`))
  const rb = el('span', 'chip'); rb.textContent = `Rival ${NOME_ROBO[F.robo]}`; rb.title = DESC_ROBO[F.robo]; topo.append(rb); info.append(topo)
  const ini = el('div', 'av-inimigos'); ini.id = 'avInimigos'
  F.time.forEach((id, i) => {
    const f = P.ficha(id), cx = el('div', 'av-inimigo'); cx.dataset.id = id
    const c = el('div', 'fz-circulo fz-circulo--cheio'); c.append(el('span', 'fz-circulo__anel'), bonecoEm(partesDaFicha(f), pc ? 96 : 76), el('span', 'fz-circulo__nome', NOME_LUGAR[i]))
    const t = el('div', 'av-in-txt'); t.append(el('b', null, f.nome)); const tp = el('span', 'mini-sub'); tp.append(iconeTipo(f.tipo, 14), el('span', null, `Vida ${f.vidaMax}`)); t.append(tp)
    cx.append(c, t); ini.append(cx)
  })
  const dica = el('p', 'av-dica'); dica.append(`O rival ${NOME_ROBO[F.robo]} ${DESC_ROBO[F.robo]}. `, el('b', null, 'Na luta ele mostra o que vai fazer no próximo turno.'))
  info.append(ini, dica)
  renderTime()
}

function renderTime() {
  const ids = Col.timeAventura(), pc = formatoDe(null) === 'pc'
  const bs = Col.ativos().filter((x) => !Col.casuloFechado(x))
  prateleira = criarPrateleira($('#avTime'), bs.map((b) => {
    const pode = Col.podeLutar(b)
    return { id: b.id, nome: P.fichaDoBoneco(b).nome, desenho: () => bonecoCanvas(b, Math.round((pc ? 88 : 80) / 1.547)), desligado: !pode.ok, motivo: pode.motivo }
  }), { porTabua: pc ? 5 : 3, nomes: pc, classe: 'mini-cartao', aoTocar: alternar, rotulo: 'Escolha 3 bonecos para a fase' })
  prateleira.marcar({ escolhidos: ids, aberto: null })
  const sl = $('#avSlots'); sl.replaceChildren(); sl.classList.add('fz-time__circulos')
  for (let i = 0; i < 3; i++) {
    const c = el('div', 'fz-circulo' + (ids[i] ? ' fz-circulo--cheio' : '')), b = ids[i] && Col.obter(ids[i])
    c.append(el('span', 'fz-circulo__anel'))
    if (b) { c.append(bonecoEm(P.facesDe(b), pc ? 64 : 54)); c.title = P.fichaDoBoneco(b).nome } else c.append(el('span', 'fz-circulo__vazio', String(i + 1)))
    c.append(el('span', 'fz-circulo__nome', NOME_LUGAR[i])); sl.append(c)
  }
  $('#avTimeDica').textContent = `(${ids.length}/3, o 1º fica na Frente)`
  const e = P.energia(), btn = $('#btnJogarFase')
  if (e.atual <= 0) atualizarBotao(btn, { rotulo: 'Sem energia', detalhe: `volta às ${horaDaRecarga(e)}`, desligado: true })
  else atualizarBotao(btn, { rotulo: ids.length === 3 ? `Jogar fase ${fase}` : `Faltam ${3 - ids.length}`, detalhe: ids.length === 3 ? `Energia ${e.atual}/${e.maximo}` : null, desligado: ids.length !== 3 })
}

function alternar(id) {
  const ids = Col.timeAventura(), i = ids.indexOf(id)
  if (i >= 0) ids.splice(i, 1); else { if (ids.length >= 3) ids.shift(); ids.push(id) }
  Col.definirTimeAventura(ids); renderTime()
}

export function iniciarAventura() {
  const b = criarBotao({ rotulo: 'Jogar fase 1', variante: 'principal', desligado: true }); b.id = 'btnJogarFase'
  $('#btnJogarFase').replaceWith(b)
  b.addEventListener('click', () => { const ids = Col.timeAventura(); if (ids.length === 3) aoJogar({ fase, ids }) })
}
export function irParaFase(n) { fase = Math.min(FASES.length, n) }
