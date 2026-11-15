// Frayz — tela da AVENTURA "Baú da Costureira": mapa de 5 fases, time inimigo da fase e escolha do seu time.
// Os times e robôs das fases vêm de aventura-dados.js (PROVISÓRIO); o progresso vem de colecao.js. Nenhuma regra aqui.
import * as P from './ponte.js'
import * as Col from './colecao.js'
import { FASES } from './aventura-dados.js'
import { $, el, bonecoCanvas, desenharBonecoEm, iconeTipo, NOME_LUGAR } from './ui.js'

const NOME_ROBO = { ganancioso: 'Ganancioso', planejador: 'Planejador' }
const DESC_ROBO = { ganancioso: 'joga o que bate mais forte agora', planejador: 'pensa dois turnos à frente' }
let fase = 1, aoJogar = () => {}
export const ligarAventura = (cb) => { aoJogar = cb }
export const faseAtual = () => fase

export function renderAventura() {
  const prog = Col.aventura()
  if (fase > prog.liberada) fase = prog.liberada
  const mapa = $('#avMapa'); mapa.replaceChildren()
  for (const f of FASES) {
    const venceu = prog.vencidas.includes(f.n), livre = f.n <= prog.liberada
    const li = el('li', 'av-no'); const b = el('button', 'av-estacao'); b.type = 'button'; b.dataset.fase = String(f.n)
    b.classList.toggle('vencida', venceu); b.classList.toggle('travada', !livre); b.classList.toggle('sel', f.n === fase); b.classList.toggle('atual', livre && !venceu && f.n === prog.liberada)
    b.setAttribute('aria-label', `Fase ${f.n}: ${f.nome}${venceu ? ', vencida' : livre ? '' : ', travada'}`)
    b.disabled = !livre
    b.append(el('span', 'av-num', venceu ? '✓' : livre ? String(f.n) : '—'), el('span', 'av-nome', f.nome))
    b.addEventListener('click', () => { fase = f.n; renderAventura() })
    li.append(b); mapa.append(li)
  }
  const F = FASES[fase - 1], info = $('#avInfo'); info.replaceChildren()
  const topo = el('div', 'av-topo'); topo.append(el('b', null, `Fase ${F.n}: ${F.nome}`))
  const rb = el('span', 'chip'); rb.textContent = `Rival ${NOME_ROBO[F.robo]}`; rb.title = DESC_ROBO[F.robo]; topo.append(rb); info.append(topo)
  const ini = el('div', 'av-inimigos'); ini.id = 'avInimigos'
  F.time.forEach((id, i) => {
    const f = P.ficha(id), cx = el('div', 'av-inimigo'); cx.dataset.id = id
    const cv = el('canvas'); desenharBonecoEm(cv, Object.fromEntries(Object.entries(f.partes).map(([k, v]) => [k, `${v.id}@${v.raridade}`])), 'vivo', 54); cx.append(cv)
    const t = el('div', 'av-in-txt'); t.append(el('b', null, f.nome)); const tp = el('span', 'mini-sub'); tp.append(iconeTipo(f.tipo, 11), el('span', null, `${NOME_LUGAR[i]} · Vida ${f.vidaMax}`)); t.append(tp); cx.append(t)
    ini.append(cx)
  })
  info.append(ini, el('p', 'av-dica', `O rival ${NOME_ROBO[F.robo]} ${DESC_ROBO[F.robo]}. Aqui ele MOSTRA o que vai fazer no próximo turno.`))
  renderTime()
}

function renderTime() {
  const ids = Col.timeAventura(), g = $('#avTime'); g.replaceChildren()
  for (const b of Col.ativos().filter((x) => !Col.casuloFechado(x))) {
    const f = P.fichaDoBoneco(b), pode = Col.podeLutar(b)
    const c = el('button', 'mini-cartao'); c.type = 'button'; c.dataset.id = b.id; c.setAttribute('role', 'listitem')
    c.classList.toggle('on', ids.includes(b.id)); c.disabled = !pode.ok
    c.append(bonecoCanvas(b, 54), el('span', 'mini-nome', f.nome))
    const sub = el('span', 'mini-sub'); sub.append(iconeTipo(f.tipo, 11), el('span', null, pode.ok ? `Remendos ${P.nivelDeRemendo(b)}/${P.PARAMS_COSTURA.desgaste.niveisDeRemendo}` : 'só aposentar')); c.append(sub)
    if (!pode.ok) c.title = pode.motivo
    c.addEventListener('click', () => alternar(b.id))
    g.append(c)
  }
  const sl = $('#avSlots'); sl.replaceChildren()
  for (let i = 0; i < 3; i++) {
    const slot = el('div', 'slot' + (ids[i] ? ' cheio' : '')); const b = ids[i] && Col.obter(ids[i])
    if (b) { const cv = bonecoCanvas(b, 42); cv.className = ''; slot.append(cv); slot.title = P.fichaDoBoneco(b).nome } else slot.append(el('span', null, NOME_LUGAR[i]))
    slot.append(el('em', null, NOME_LUGAR[i])); sl.append(slot)
  }
  $('#avTimeDica').textContent = `(${ids.length}/3, o 1º fica na Frente)`
  const btn = $('#btnJogarFase'); btn.textContent = ids.length === 3 ? `Jogar fase ${fase}` : `Faltam ${3 - ids.length}`; btn.disabled = ids.length !== 3
}

function alternar(id) {
  const ids = Col.timeAventura(), i = ids.indexOf(id)
  if (i >= 0) ids.splice(i, 1); else { if (ids.length >= 3) ids.shift(); ids.push(id) }
  Col.definirTimeAventura(ids); renderTime()
}

export function iniciarAventura() {
  $('#btnJogarFase').addEventListener('click', () => { const ids = Col.timeAventura(); if (ids.length === 3) aoJogar({ fase, ids }) })
}
export function irParaFase(n) { fase = Math.min(FASES.length, n); }
