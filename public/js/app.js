// Frayz — tela do protótipo jogável local. Só mostra o que o motor devolve (via ponte.js). Nenhuma regra aqui.
import * as P from './ponte.js'
import { Arena } from './arena.js'
import { Roda } from './roda.js'
import { faixaDoTipo, iconeDoBordado, iconeDoTipo, miniatura, spriteDoBoneco, FIOS } from './bonecos.js'

const $ = (s) => document.querySelector(s)
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e }
const url = new URLSearchParams(location.search)
const TESTE = url.get('teste') === '1'
const NOME_LUGAR = ['Frente', 'Meio', 'Trás']
const MOTIVO_FIM = { derrubou: 'Os três caíram.', tesoura: 'A Tesoura decidiu: vence quem sobrou com mais vida.', desempate: 'Empate de vida: o sorteio decidiu.' }
const NOME_ROBO = { ganancioso: 'Ganancioso', planejador: 'Planejador' }

const S = {
  escolha: [], robo: 'planejador',
  estado: null, semente: null, timeA: null, timeB: null,
  travado: true, sel: null, modoTroca: null, replay: false, parar: false, rodando: false,
  stats: null, ultima: null, vezAnterior: null, relogio: null, inicioTurno: 0, vel: 1,
  maoAnterior: new Set(),
}
let arena, roda

// ------------------------------------------------------------------ menos animação
function lerMenos() {
  try { const v = localStorage.getItem('menos_animacao'); if (v !== null) return v === '1' } catch { /* sem armazenamento */ }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
function aplicarMenos(v, guardar = true) {
  document.documentElement.dataset.menos = v ? '1' : '0'
  $('#optMenos').checked = v; $('#optMenos2').checked = v
  if (arena) { arena.menos = v; arena.sujo = true }
  if (roda) roda.menos = v
  if (guardar) { try { localStorage.setItem('menos_animacao', v ? '1' : '0') } catch { /* ok */ } }
}
const menos = () => document.documentElement.dataset.menos === '1'

const esperar = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms * S.vel * (menos() ? 0.7 : 1))))

// ------------------------------------------------------------------ telas
function mostrar(qual) {
  for (const id of ['inicio', 'luta']) $('#' + id).hidden = id !== qual
  document.body.dataset.tela = qual
  if (qual === 'luta') requestAnimationFrame(() => { arena.medir(); roda.medir() })
}

// ------------------------------------------------------------------ TELA INICIAL
function desenharBonecoEm(canvas, partes, est = 'vivo', largura = 84) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), esc = largura / 150
  const sp = spriteDoBoneco(partes, est, esc * dpr)
  canvas.width = sp.width; canvas.height = sp.height
  canvas.style.width = sp.width / dpr + 'px'; canvas.style.height = sp.height / dpr + 'px'
  canvas.getContext('2d').drawImage(sp, 0, 0)
}
const partesDe = (f) => Object.fromEntries(Object.entries(f.partes).map(([k, v]) => [k, `${v.id}@${v.raridade}`]))
const icone = (cv, px = 18) => { cv.style.width = cv.style.height = px + 'px'; return cv }
const iconeTipo = (t, px = 18) => { const c = document.createElement('canvas'); c.width = c.height = Math.round(px * 2); c.style.width = c.style.height = px + 'px'; c.getContext('2d').drawImage(iconeDoTipo(t, px * 2), 0, 0); c.className = 'ic-tipo'; return c }

function fichaDeLista(id) {
  const f = P.ficha(id)
  const b = el('button', 'ficha'); b.type = 'button'; b.dataset.id = id; b.setAttribute('role', 'listitem'); b.setAttribute('aria-pressed', 'false')
  const dc = el('canvas', 'f-boneco'); desenharBonecoEm(dc, partesDe(f), 'vivo', 78); b.append(dc)
  const info = el('div', 'f-info')
  info.append(el('div', 'f-nome', f.nome))
  const tp = el('div', 'f-tipo'); tp.append(iconeTipo(f.tipo, 16), el('span', null, P.NOMES_DOS_TIPOS[f.tipo]))
  const rar = P.RARIDADES[f.partes.tronco.raridade].nome
  const r = el('span', 'f-rar', rar); r.dataset.rar = f.partes.tronco.raridade; r.style.setProperty('--rar', FIOS[f.partes.tronco.raridade]); tp.append(r)
  info.append(tp)
  const st = el('div', 'f-stats')
  for (const [n, v, dica] of [['Vida', f.vidaMax, 'Vida máxima'], ['Rapidez', f.rapidez, 'Rapidez: chance de golpe crítico'], ['Firmeza', f.firmeza, 'Firmeza: reduz o dano recebido']]) { const s = el('span', null); s.title = dica; s.append(el('small', null, n + ' '), el('b', null, String(v))); st.append(s) }
  info.append(st)
  const cs = el('div', 'f-cartas')
  for (const c of f.cartasInfo) { const ch = el('span', 'f-carta'); ch.title = c.texto; ch.append(iconeTipo(c.tipo, 12), el('i', null, String(c.linha)), el('span', null, c.nome)); cs.append(ch) }
  info.append(cs)
  const bd = el('div', 'f-bordado'); const ib = iconeDoBordado(f.bordado, 44); bd.append(icone(ib, 22)); const tx = el('span'); tx.append(el('b', null, f.bordadoInfo.nome + ': '), f.bordadoInfo.texto); bd.append(tx)
  info.append(bd)
  const pt = el('div', 'f-partes', ['tronco', 'cabeca', 'bracos', 'pernas'].map((s) => f.partes[s].nome).join(' · '))
  info.append(pt)
  b.append(info, el('div', 'f-check', '✓'))
  b.addEventListener('click', () => alternar(id))
  return b
}

function alternar(id) {
  const i = S.escolha.indexOf(id)
  if (i >= 0) S.escolha.splice(i, 1)
  else if (S.escolha.length < 3) S.escolha.push(id)
  else { S.escolha.shift(); S.escolha.push(id) }
  atualizarEscolha()
}
function atualizarEscolha() {
  for (const b of document.querySelectorAll('.ficha')) { const on = S.escolha.includes(b.dataset.id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)) }
  const box = $('#timeEscolhido'); box.replaceChildren()
  for (let i = 0; i < 3; i++) {
    const slot = el('div', 'slot'); const id = S.escolha[i]
    if (id) { const f = P.ficha(id); const cv = el('canvas'); desenharBonecoEm(cv, partesDe(f), 'vivo', 42); slot.append(cv); slot.title = f.nome; slot.classList.add('cheio') }
    else slot.append(el('span', null, NOME_LUGAR[i]))
    const lab = el('em', null, NOME_LUGAR[i]); slot.append(lab)
    box.append(slot)
  }
  $('#btnLutar').disabled = S.escolha.length !== 3
  $('#btnLutar').textContent = S.escolha.length === 3 ? 'Lutar!' : `Falta${3 - S.escolha.length > 1 ? 'm' : ''} ${3 - S.escolha.length}`
}

function montarInicio() {
  const g = $('#grade'); g.replaceChildren()
  for (const id of P.idsProntos()) g.append(fichaDeLista(id))
  atualizarEscolha()
  for (const r of document.querySelectorAll('input[name=robo]')) r.addEventListener('change', () => { S.robo = r.value })
  $('#btnLutar').addEventListener('click', () => { if (S.escolha.length === 3) iniciarLuta() })
  $('#btnAssistir').addEventListener('click', colarEAssistir)
}

function sortearRival(timeA) { // time do rival: 3 bonecos prontos diferentes (sorteio da tela, não é regra)
  const livres = P.idsProntos().filter((x) => !timeA.includes(x)), pool = livres.length >= 3 ? livres : P.idsProntos()
  const o = pool.slice(); const r = []
  while (r.length < 3) r.push(o.splice(Math.floor(Math.random() * o.length), 1)[0])
  return r
}

function colarEAssistir() {
  const msg = $('#replayMsg'); msg.textContent = ''; msg.classList.remove('erro')
  try {
    const r = P.lerReplay($('#replayEntrada').value)
    const ok = P.conferirReplay(r)
    if (!ok.ok) throw new Error(`Replay recusado pelo motor no comando ${ok.indice + 1}: ${ok.motivo}`)
    S.ultima = r; assistir()
  } catch (e) { msg.textContent = e.message; msg.classList.add('erro') }
}

// ------------------------------------------------------------------ LUTA: começo
async function iniciarLuta(opc = {}) {
  const rivalFixo = TESTE && url.get('rival') ? url.get('rival').split(',') : null
  const timeA = opc.timeA ?? S.escolha.slice(), timeB = opc.timeB ?? rivalFixo ?? sortearRival(timeA)
  const semente = opc.semente ?? url.get('semente') ?? P.novaSemente()
  S.timeA = timeA; S.timeB = timeB; S.semente = semente; S.replay = false; S.parar = false
  S.robo = opc.robo ?? S.robo
  await abrirLuta(P.novaLuta({ semente, timeA, timeB }))
  await seguirTurnos()
}

async function abrirLuta(estado) {
  fecharTudo()
  S.estado = estado; S.travado = true; S.sel = null; S.modoTroca = null
  S.stats = { maior: null, viradas: 0, lider: 0, fios: 0 }
  S.maoAnterior = new Set(); S.vezAnterior = null
  mostrar('luta')
  $('#btnParar').hidden = !S.replay
  document.body.classList.toggle('replay', S.replay)
  const v = P.visao(estado)
  arena.sync(v); arena.marcar({})
  renderTudo()
  await esperar(250)
}

/** Depois de qualquer comando: de quem é a vez? */
async function seguirTurnos() {
  if (S.parar) return
  const e = S.estado
  if (e.fim) { await fimDaLuta(); return }
  if (S.vezAnterior !== e.vez) {
    S.vezAnterior = e.vez
    await bannerTurno(e.vez === P.EU ? 'Sua vez' : 'Vez do rival')
  }
  if (S.replay) return // o replay manda os próprios comandos
  if (e.vez === P.RIVAL) await turnoDoRobo()
  else { S.travado = false; S.inicioTurno = performance.now(); renderTudo(); iniciarRelogio() }
}

async function turnoDoRobo() {
  S.travado = true; pararRelogio(); renderTudo()
  await esperar(450)
  const t = P.RIVAL
  for (let rodada = 0; rodada < 20 && !S.estado.fim && S.estado.vez === t && !S.parar; rodada++) {
    const plano = P.planoDoRobo(S.estado, S.robo)
    let falhou = false
    for (let i = 0; i < plano.length; i++) {
      const ok = await executar(plano[i], 'rival')
      if (!ok) { falhou = true; break }
      if (S.estado.fim || S.estado.vez !== t || S.parar) break
    }
    if (falhou && rodada > 3) break
  }
  if (!S.estado.fim && S.estado.vez === t && !S.parar) await executar({ tipo: 'passar', time: t }, 'rival')
  if (S.parar) return
  await seguirTurnos()
}

// ------------------------------------------------------------------ executar um comando (jogador, robô ou replay)
async function executar(cmd, quem) {
  const r = P.enviar(S.estado, cmd)
  if (!r.ok) { if (quem === 'voce') aviso(r.motivo); return false }
  S.travado = true; pararRelogio(); limparSelecao(false)
  const estadoAntes = S.estado
  const evCarta = r.eventos.find((e) => e.t === 'carta')
  if (evCarta) await bannerCarta(evCarta, quem, estadoAntes)
  else if (cmd.tipo === 'passar') await bannerCurto(quem === 'rival' ? 'Rival passou' : 'Você passou', 420)
  else if (cmd.tipo === 'trocar') await bannerCurto(quem === 'rival' ? 'Rival trocou de lugar' : 'Troca de lugar', 420)
  else if (cmd.tipo === 'fiapo') await bannerCurto(quem === 'rival' ? 'Rival descartou um fiapo' : 'Fiapo descartado', 420)
  S.estado = r.estado
  const vista = P.visao(S.estado)
  colherResumo(r.eventos, vista)
  const dur = arena.passo(vista, r.eventos)
  renderTudo()
  await new Promise((ok) => setTimeout(ok, dur + 60 * S.vel))
  arena.concluir()
  renderTudo()
  return true
}

function colherResumo(eventos, vista) {
  for (const ev of eventos) {
    if (ev.t === 'dano' && (!S.stats.maior || ev.valor > S.stats.maior.valor)) S.stats.maior = { valor: ev.valor, critico: ev.critico, de: ev.de ? vista.bonecos[ev.de]?.nome : null, carta: ev.carta ? P.CARTAS[ev.carta].nome : null, alvo: vista.bonecos[ev.alvo]?.nome, time: ev.de ? vista.bonecos[ev.de]?.time : null }
    if (ev.t === 'ultimoFio') S.stats.fios++
  }
  // quem está na frente em vida (soma de vida/vidaMax dos bonecos de pé): conta as viradas
  const pct = (t) => vista.times[t].lugares.reduce((s, id) => { const b = vista.bonecos[id]; return s + (b.estado === 'vivo' ? b.vida / b.vidaMax : 0) }, 0)
  const d = pct('A') - pct('B'), lado = d > 0.0001 ? 1 : d < -0.0001 ? -1 : 0
  if (lado !== 0) { if (S.stats.lider !== 0 && lado !== S.stats.lider) S.stats.viradas++; S.stats.lider = lado }
}

// ------------------------------------------------------------------ jogada do jogador
const minhaVez = () => !S.travado && !S.replay && S.estado && !S.estado.fim && S.estado.vez === P.EU

function limparSelecao(render = true) {
  S.sel = null; S.modoTroca = null
  arena.marcar({}); $('#btnTrocar').classList.remove('on')
  if (render) { renderMao(); atualizarInfo(); atualizarRoda() }
}

function aoTocarCarta(cid) {
  if (!minhaVez()) { if (!S.replay) aviso(S.estado.vez === P.RIVAL ? 'Espere: é a vez do rival.' : 'Agora não.'); return }
  S.modoTroca = null; $('#btnTrocar').classList.remove('on')
  const v = P.visao(S.estado)
  if (P.podeFiapo(S.estado, cid)) { executar({ tipo: 'fiapo', time: P.EU, carta: cid }, 'voce').then(() => seguirTurnos()); return }
  const jog = P.jogadasDaCarta(S.estado, cid)
  if (!jog.length) { aviso(P.motivoDaRecusa(S.estado, cid) || 'Essa carta não pode agora.'); return }
  if (S.sel === cid) { // segundo toque na mesma carta: joga, se só há um jeito
    if (jog.length === 1) return jogarCom(jog[0])
    S.sel = null; limparSelecao(); return
  }
  S.sel = cid
  const { alvos, vant } = alvosDaSelecao(v, cid, jog)
  arena.marcar({ alvos, usuario: v.cartas[cid].dono, vantagem: vant })
  renderMao(); atualizarInfo(); atualizarRoda()
}

/** Quem acende para a carta selecionada (a lista de alvos vem do motor; só decidimos o que desenhar). */
function alvosDaSelecao(v, cid, jog) {
  const inst = v.cartas[cid], def = P.CARTAS[inst.carta]
  let alvos
  if (jog.every((j) => j.alvo == null)) alvos = def.alvo === 'todos' ? v.times[P.RIVAL].lugares.filter((id) => v.bonecos[id].estado === 'vivo') : [inst.dono]
  else alvos = jog.map((j) => j.alvo)
  const vant = P.temDano(inst.carta) ? alvos.filter((id) => id !== inst.dono && v.bonecos[id].time === P.RIVAL && P.vantagem(def.tipo, v.bonecos[id].tipo)) : []
  return { alvos, vant }
}

function aoTocarBoneco(id) {
  if (!id) return
  const v = P.visao(S.estado)
  if (S.modoTroca && minhaVez()) return tocarTroca(id, v)
  if (S.sel && minhaVez()) {
    const jog = P.jogadasDaCarta(S.estado, S.sel)
    const { alvos } = alvosDaSelecao(v, S.sel, jog)
    if (alvos.includes(id)) {
      const cmd = jog.find((j) => j.alvo === id) ?? (jog.every((j) => j.alvo == null) ? jog[0] : null)
      if (cmd) return jogarCom(cmd)
    }
    aviso('Esse alvo não vale para essa carta.'); return
  }
  abrirFicha(id)
}

function jogarCom(cmd) { executar(cmd, 'voce').then((ok) => { if (ok) seguirTurnos(); else limparSelecao() }) }

function iniciarTroca() {
  if (!minhaVez()) return
  if (S.modoTroca) return limparSelecao()
  const t = P.trocasPossiveis(S.estado)
  if (!t.length) { const r = P.enviar(S.estado, { tipo: 'trocar', time: P.EU, a: S.estado.times.A.lugares[0], b: S.estado.times.A.lugares[1] }); aviso(r.ok ? 'Sem troca possível.' : r.motivo); return }
  S.sel = null; S.modoTroca = { a: null }
  const ids = new Set(); t.forEach((c) => { ids.add(c.a); ids.add(c.b) })
  arena.marcar({ alvos: [...ids] }); $('#btnTrocar').classList.add('on'); renderMao(); atualizarInfo('Toque em dois bonecos seus para trocar de lugar.'); atualizarRoda()
}
function tocarTroca(id, v) {
  const m = S.modoTroca
  if (v.bonecos[id].time !== P.EU) { aviso('Troque só bonecos do seu time.'); return }
  if (!m.a) {
    m.a = id
    const par = P.trocasPossiveis(S.estado).filter((c) => c.a === id || c.b === id).map((c) => (c.a === id ? c.b : c.a))
    if (!par.length) { m.a = null; aviso('Esse não tem com quem trocar.'); return }
    arena.marcar({ alvos: par, troca: id }); atualizarInfo(`Trocar ${v.bonecos[id].nome} com quem?`); return
  }
  if (id === m.a) { m.a = null; iniciarTroca(); limparSelecao(); return }
  const cmd = P.trocasPossiveis(S.estado).find((c) => (c.a === m.a && c.b === id) || (c.b === m.a && c.a === id))
  if (!cmd) { aviso('Essa troca não vale.'); return }
  jogarCom(cmd)
}

async function passar() {
  if (!minhaVez()) return
  limparSelecao(false)
  const ok = await executar({ tipo: 'passar', time: P.EU }, 'voce')
  if (ok) await seguirTurnos()
}

// ------------------------------------------------------------------ desenho da interface
function renderTudo() {
  if (!S.estado) return
  const v = P.visao(S.estado)
  renderTopo(v); renderBanda(v); renderMao(); atualizarInfo(); atualizarRoda()
  $('#btnPassar').disabled = !minhaVez(); $('#btnTrocar').disabled = !minhaVez()
}

function renderTopo(v) {
  $('#tTurno').textContent = `Turno ${v.turno}/${P.REGRAS.turnoFinal}`
  const vez = $('#tVez'); vez.textContent = v.fim ? 'Fim' : v.vez === P.EU ? 'Sua vez' : 'Vez do rival'
  vez.classList.toggle('meu', v.vez === P.EU && !v.fim); vez.classList.toggle('rival', v.vez === P.RIVAL && !v.fim)
  const ts = $('#tTesoura'), ini = P.REGRAS.tesouraInicio
  const corte = Math.round(P.REGRAS.tesouraCorte * 100)
  if (v.turno >= ini) { ts.dataset.l = ` Tesoura cortando ${corte}% por turno`; ts.textContent = `✂ −${corte}%`; ts.className = 't-tesoura chip alerta'; ts.title = `A Tesoura corta ${corte}% da vida máxima de todos a cada turno` }
  else if (v.turno === ini - 1) { ts.dataset.l = ` Tesoura no próximo turno (${ini})`; ts.textContent = `✂ ${ini}!`; ts.title = `A Tesoura começa no próximo turno (turno ${ini})`; ts.className = 't-tesoura chip aviso' }
  else { ts.dataset.l = ` Tesoura começa no turno ${ini}`; ts.textContent = `✂ ${ini}`; ts.title = `A Tesoura começa a cortar ${corte}% no turno ${ini}`; ts.className = 't-tesoura chip' }
}

function pips(n, max) {
  const w = el('span', 'pips'); w.setAttribute('aria-label', `Linha ${n} de ${max}`)
  for (let i = 0; i < max; i++) w.append(el('i', i < n ? 'on' : ''))
  return w
}
function linhaBanda(box, nome, time, v, quem) {
  const t = v.times[time]; box.replaceChildren()
  const n = el('b', 'bl-nome', nome); box.append(n)
  const linha = el('span', 'bl-linha'); linha.append(el('small', null, 'Linha'), pips(t.linha, P.REGRAS.linhaMaxima), el('strong', null, String(t.linha)))
  box.append(linha)
  const cartas = time === P.EU ? t.mao.length : t.mao
  const c = el('span', 'bl-cartas', null); c.title = 'Cartas na mão'
  const leque = el('span', 'verso-leque'); for (let i = 0; i < Math.min(4, cartas); i++) leque.append(el('i')); c.append(leque, el('strong', null, String(cartas)))
  const dk = el('span', 'bl-baralho', null); dk.title = 'Baralho / descarte'; dk.append(el('small', null, 'baralho '), el('strong', null, String(t.baralho)))
  box.append(c, dk)
}
function renderBanda(v) {
  linhaBanda($('#blRival'), 'RIVAL · ' + NOME_ROBO[S.robo], P.RIVAL, v)
  linhaBanda($('#blEu'), 'VOCÊ', P.EU, v)
}

function cartaEl(inst, v, opc = {}) {
  const info = P.infoDaCarta(inst.carta), dono = v.bonecos[inst.dono]
  const b = el(opc.tag ?? 'button', 'carta'); if (b.tagName === 'BUTTON') b.type = 'button'
  b.dataset.tipo = info.tipo
  const fx = el('div', 'c-faixa'); fx.style.backgroundImage = `url(${faixaDoTipo(info.tipo)})`
  fx.append(el('span', 'c-custo', String(info.linha)))
  const mini = miniatura(dono.partes, 56), mc = el('canvas', 'c-dono'); mc.width = mc.height = 56; mc.getContext('2d').drawImage(mini, 0, 0); mc.title = dono.nome
  fx.append(mc)
  b.append(fx)
  b.append(el('div', 'c-nome', info.nome))
  b.append(el('div', 'c-texto', info.texto))
  const rod = el('div', 'c-rodape'); rod.append(iconeTipo(info.tipo, 12), el('span', null, ({ cabeca: 'Cabeça', bracos: 'Braços', pernas: 'Pernas' })[info.parte])); b.append(rod)
  return { b, info, dono }
}

function renderMao() {
  const v = P.visao(S.estado), box = $('#mao'), mao = v.times.A.mao
  const novas = new Set(mao)
  box.replaceChildren()
  const rivais = v.times.B.lugares.filter((id) => v.bonecos[id].estado === 'vivo')
  for (const cid of mao) {
    const inst = v.cartas[cid], { b, info, dono } = cartaEl(inst, v)
    b.dataset.cid = cid; b.setAttribute('role', 'listitem')
    const fiapo = minhaVez() && P.podeFiapo(S.estado, cid)
    const caido = dono.estado === 'caido'
    const jog = minhaVez() && !caido ? P.jogadasDaCarta(S.estado, cid) : []
    if (caido) { b.classList.add('fiapo'); b.append(el('div', 'c-fiapo', 'FIAPO')); b.title = 'Boneco caído: descarte de graça e compre 1.' }
    else if (!jog.length) b.classList.add('apagada')
    else if (P.temDano(inst.carta) && rivais.some((id) => P.vantagem(info.tipo, v.bonecos[id].tipo))) { b.classList.add('vant'); b.append(el('div', 'c-vant', '+' + Math.round(P.BONUS_DE_TIPO * 100) + '%')) }
    if (S.sel === cid) b.classList.add('sel')
    if (!S.maoAnterior.has(cid) && S.maoAnterior.size) b.classList.add('nova')
    b.setAttribute('aria-disabled', String(!jog.length && !fiapo))
    b.addEventListener('click', () => aoTocarCarta(cid))
    box.append(b)
    void fiapo
  }
  S.maoAnterior = novas
  if (!mao.length) box.append(el('p', 'mao-vazia', 'Mão vazia'))
}

function atualizarInfo(dica) {
  const box = $('#info'); box.replaceChildren()
  const v = P.visao(S.estado)
  if (dica) { box.append(el('span', 'dica', dica)); return }
  if (S.sel) {
    const inst = v.cartas[S.sel], i = P.infoDaCarta(inst.carta)
    const b = el('b', null, i.nome + ' '); box.append(b, el('span', null, i.texto + ' '))
    const jog = P.jogadasDaCarta(S.estado, S.sel)
    box.append(el('em', 'dica', jog.length === 1 ? 'Toque no alvo aceso (ou na carta de novo) para jogar.' : 'Toque no alvo aceso.'))
    return
  }
  if (S.replay) { box.append(el('span', 'dica', 'Assistindo ao replay.')); return }
  if (minhaVez()) box.append(el('span', 'dica', 'Toque numa carta. Toque num boneco para ver a ficha.'))
  else if (!S.estado.fim) box.append(el('span', 'dica', 'O rival está jogando…'))
}

function atualizarRoda() {
  const v = P.visao(S.estado), pares = [], tipos = []
  const rivais = v.times.B.lugares.filter((id) => v.bonecos[id].estado === 'vivo').map((id) => v.bonecos[id])
  if (S.sel) {
    const t = P.CARTAS[v.cartas[S.sel].carta].tipo; tipos.push(t)
    const jog = P.jogadasDaCarta(S.estado, S.sel), { alvos } = alvosDaSelecao(v, S.sel, jog)
    if (P.temDano(v.cartas[S.sel].carta)) for (const id of alvos) if (v.bonecos[id].time === P.RIVAL) pares.push([t, v.bonecos[id].tipo])
  } else if (minhaVez()) {
    for (const cid of v.times.A.mao) {
      const i = v.cartas[cid]; if (!i || v.bonecos[i.dono].estado === 'caido') continue
      if (!P.jogadasDaCarta(S.estado, cid).length) continue
      if (!P.temDano(i.carta)) continue
      const t = P.CARTAS[i.carta].tipo
      for (const r of rivais) pares.push([t, r.tipo])
    }
  }
  roda.definir(pares, tipos)
  $('#roda').classList.toggle('acesa', roda.acesa)
}

// ------------------------------------------------------------------ banners e avisos
let timerToast
function aviso(txt) {
  const t = $('#toast'); t.textContent = txt; t.hidden = false; t.classList.remove('some'); void t.offsetWidth; t.classList.add('mostra')
  clearTimeout(timerToast); timerToast = setTimeout(() => { t.hidden = true; t.classList.remove('mostra') }, 2300)
  if (TESTE) { window.__frayz.avisos.push(txt) }
}
async function bannerTurno(txt) {
  const b = $('#bannerTurno'); b.textContent = txt; b.dataset.quem = txt.startsWith('Sua') ? 'eu' : 'rival'; b.hidden = false
  b.classList.remove('anima'); void b.offsetWidth; b.classList.add('anima')
  await esperar(650); b.hidden = true
}
async function bannerCurto(txt, ms) {
  const b = $('#bannerTurno'); b.textContent = txt; b.dataset.quem = 'info'; b.hidden = false; b.classList.remove('anima'); void b.offsetWidth; b.classList.add('anima')
  await esperar(ms); b.hidden = true
}
async function bannerCarta(ev, quem, estado) {
  const v = P.visao(estado)
  const inst = { carta: ev.id, dono: ev.de }
  const { b } = cartaEl(inst, v, { tag: 'div' })
  const box = $('#bannerCarta'); box.replaceChildren()
  const quemEl = el('div', 'bc-quem', quem === 'rival' ? 'Rival jogou' : 'Você jogou'); box.append(quemEl, b)
  box.dataset.quem = quem === 'rival' ? 'rival' : 'eu'; box.hidden = false
  box.classList.remove('anima'); void box.offsetWidth; box.classList.add('anima')
  await esperar(quem === 'rival' ? 900 : 560)
  box.hidden = true
}

// ------------------------------------------------------------------ relógio de 20 s (no protótipo só avisa)
function iniciarRelogio() {
  pararRelogio()
  const barra = $('#tBarra'), seg = $('#tSeg'), box = $('#tRelogio')
  box.classList.remove('estourou')
  const tick = () => {
    const falta = P.TEMPO_DO_TURNO_S - (performance.now() - S.inicioTurno) / 1000
    const f = Math.max(0, falta)
    barra.style.transform = `scaleX(${f / P.TEMPO_DO_TURNO_S})`
    seg.textContent = f > 0 ? String(Math.ceil(f)) : '0'
    box.classList.toggle('pouco', f <= 5 && f > 0)
    if (f <= 0 && !box.classList.contains('estourou')) { box.classList.add('estourou'); aviso('Tempo! (no protótipo o relógio só avisa)') }
  }
  tick(); S.relogio = setInterval(tick, 200)
}
function pararRelogio() { clearInterval(S.relogio); S.relogio = null; $('#tRelogio').classList.remove('pouco', 'estourou') }

// ------------------------------------------------------------------ ficha do boneco (toque no boneco)
function abrirFicha(id) {
  const v = P.visao(S.estado), b = v.bonecos[id]
  const f = P.ficha({ nome: b.nome, partes: b.partes })
  const c = $('#fichaCorpo'); c.replaceChildren()
  const topo = el('div', 'fc-topo'); const cv = el('canvas'); desenharBonecoEm(cv, b.partes, b.estado === 'caido' ? 'caido' : b.estado === 'fio' ? 'fio' : 'vivo', 96); topo.append(cv)
  const t = el('div', 'fc-tit'); t.append(el('h3', null, b.nome))
  const tp = el('div', 'f-tipo'); tp.append(iconeTipo(b.tipo, 18), el('span', null, P.NOMES_DOS_TIPOS[b.tipo]), el('span', 'f-rar', P.RARIDADES[f.partes.tronco.raridade].nome)); t.append(tp)
  const st = el('div', 'f-stats')
  for (const [n, val] of [['Vida', `${b.vida}/${b.vidaMax}`], ['Rapidez', b.rapidez], ['Firmeza', b.firmeza]]) { const s = el('span'); s.append(el('small', null, n + ' '), el('b', null, String(val))); st.append(s) }
  t.append(st)
  const est = []
  if (b.estado === 'fio') est.push('Último Fio: só usa Pernas'); if (b.estado === 'caido') est.push('Caiu')
  if (b.escudo > 0) est.push('Escudo ' + b.escudo); if (b.veu) est.push('Véu: o próximo ataque erra'); if (b.fioSoltoAte > 0) est.push('Fio Solto: recebe mais dano')
  if (b.reserva > 0) est.push('Botão Reserva pronto')
  if (est.length) t.append(el('div', 'fc-estados', est.join(' · ')))
  topo.append(t); c.append(topo)
  const lista = el('ul', 'fc-partes')
  for (const s of ['tronco', 'cabeca', 'bracos', 'pernas']) {
    const p = f.partes[s], li = el('li')
    li.append(iconeTipo(p.tipo, 16)); const tx = el('span'); tx.append(el('b', null, p.nome))
    if (p.carta) { const ci = P.infoDaCarta(p.carta); tx.append(el('br'), `${ci.nome} (${ci.linha}): ${ci.texto}`) }
    li.append(tx); lista.append(li)
  }
  const li = el('li'); li.append(icone(iconeDoBordado(f.bordado, 44), 18)); const tx = el('span'); tx.append(el('b', null, f.bordadoInfo.nome), el('br'), f.bordadoInfo.texto); li.append(tx); lista.append(li)
  c.append(lista)
  $('#fichaModal').hidden = false; $('#fichaFechar').focus()
}
function fecharFicha() { $('#fichaModal').hidden = true }
function fecharTudo() { fecharFicha(); $('#fim').hidden = true; $('#menu').hidden = true; $('#legenda').hidden = true; pararRelogio(); $('#bannerCarta').hidden = true; $('#bannerTurno').hidden = true }

// ------------------------------------------------------------------ fim da luta
async function fimDaLuta() {
  pararRelogio(); S.travado = true; renderTudo()
  const r = P.fim(S.estado)
  S.ultima = { semente: S.semente, timeA: S.timeA, timeB: S.timeB, robo: S.robo, comandos: S.estado.comandos.map((c) => ({ ...c })) }
  const ganhei = r.vencedor === P.EU
  await esperar(700)
  const t = $('#fimTitulo'); t.textContent = ganhei ? 'Vitória!' : 'Derrota'; $('#fim').dataset.res = ganhei ? 'v' : 'd'
  $('#fimMotivo').textContent = MOTIVO_FIM[r.motivo] ?? ''
  const ul = $('#fimResumo'); ul.replaceChildren()
  const add = (k, val) => { const li = el('li'); li.append(el('span', null, k), el('b', null, val)); ul.append(li) }
  add('Turnos', String(r.turno))
  const m = S.stats.maior
  add('Maior golpe', m ? `${m.valor}${m.critico ? ' (crítico)' : ''}${m.carta ? ' · ' + m.carta : ''}${m.time ? (m.time === P.EU ? ' · seu' : ' · do rival') : ''}` : '—')
  add('Viradas na frente', String(S.stats.viradas))
  add('Vida que sobrou', `você ${Math.round(r.pct.A * 100 / 3)}% · rival ${Math.round(r.pct.B * 100 / 3)}%`)
  $('#replaySaida').value = P.exportarReplay(S.ultima)
  $('#copiaMsg').textContent = ''
  $('#fim').hidden = false; $('#btnRevanche').focus()
  if (!menos() && ganhei) for (let i = 0; i < 3; i++) arena.soltar(arena.W * (0.2 + 0.3 * i), arena.H * 0.4, 14, 'enchimento')
}

async function copiarReplay() {
  const txt = $('#replaySaida').value, msg = $('#copiaMsg')
  try { await navigator.clipboard.writeText(txt); msg.textContent = 'Replay copiado.' }
  catch { const ta = $('#replaySaida'); ta.focus(); ta.select(); let ok = false; try { ok = document.execCommand('copy') } catch { /* ok */ } msg.textContent = ok ? 'Replay copiado.' : 'Selecionei o texto: use Ctrl+C.' }
}

// ------------------------------------------------------------------ replay (refaz a luta pelos comandos)
async function assistir() {
  const r = S.ultima
  S.timeA = r.timeA; S.timeB = r.timeB; S.semente = r.semente; S.robo = r.robo ?? S.robo
  S.replay = true; S.parar = false
  await abrirLuta(P.novaLuta({ semente: r.semente, timeA: r.timeA, timeB: r.timeB }))
  S.vezAnterior = null
  await bannerCurto('Replay', 600)
  for (const c of r.comandos) {
    if (S.parar) break
    if (S.vezAnterior !== S.estado.vez) { S.vezAnterior = S.estado.vez; await bannerTurno(S.estado.vez === P.EU ? 'Vez de quem lutou' : 'Vez do rival') }
    const ok = await executar({ ...c, time: S.estado.vez }, c.time === P.EU ? 'voce' : 'rival')
    if (!ok) { aviso('O replay parou: o motor recusou um comando.'); break }
    await esperar(200)
  }
  if (S.parar) { S.replay = false; sairParaInicio(); return }
  S.replay = false; document.body.classList.remove('replay')
  if (S.estado.fim) await fimDaLuta()
}

function sairParaInicio() {
  S.parar = true; S.replay = false; S.travado = true
  fecharTudo(); arena.marcar({}); mostrar('inicio'); document.body.classList.remove('replay')
}

// ------------------------------------------------------------------ ligações
function ligar() {
  arena = new Arena($('#arena')); roda = new Roda($('#rodaCv'))
  aplicarMenos(lerMenos(), false)
  $('#optMenos').addEventListener('change', (e) => aplicarMenos(e.target.checked))
  $('#optMenos2').addEventListener('change', (e) => aplicarMenos(e.target.checked))
  $('#btnPassar').addEventListener('click', passar)
  $('#btnTrocar').addEventListener('click', iniciarTroca)
  $('#btnMenu').addEventListener('click', () => { const m = $('#menu'); m.hidden = !m.hidden })
  $('#btnSair').addEventListener('click', sairParaInicio)
  $('#btnParar').addEventListener('click', () => { S.parar = true; sairParaInicio() })
  $('#btnRevanche').addEventListener('click', () => { $('#fim').hidden = true; iniciarLuta({ timeA: S.timeA, timeB: S.timeB, semente: P.novaSemente() }) })
  $('#btnTrocarTime').addEventListener('click', () => { $('#fim').hidden = true; sairParaInicio() })
  $('#btnRever').addEventListener('click', () => { $('#fim').hidden = true; assistir() })
  $('#btnCopiar').addEventListener('click', copiarReplay)
  $('#fichaFechar').addEventListener('click', fecharFicha)
  $('#fichaModal').addEventListener('click', (e) => { if (e.target.id === 'fichaModal') fecharFicha() })
  $('#roda').addEventListener('click', () => {
    const l = $('#legenda'); if (!l.hidden) { l.hidden = true; return }
    l.replaceChildren(); l.append(el('b', null, 'Roda dos tipos'))
    const fila = el('div', 'leg-fila')
    P.TIPOS.forEach((t, i) => { const s = el('span', 'leg-t'); s.append(iconeTipo(t, 18), el('span', null, P.NOMES_DOS_TIPOS[t])); fila.append(s); if (i < P.TIPOS.length - 1) fila.append(el('span', 'seta', '›')) })
    l.append(fila, el('p', null, `Cada tecido bate forte no seguinte (+${Math.round(P.BONUS_DE_TIPO * 100)}% de dano). O último bate no primeiro. A seta acende quando você tem vantagem.`))
    l.hidden = false
  })
  const cvA = $('#arena')
  cvA.addEventListener('pointerdown', (e) => {
    const r = cvA.getBoundingClientRect()
    if (!S.estado) return
    aoTocarBoneco(arena.idEm(e.clientX - r.left, e.clientY - r.top))
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (!$('#fichaModal').hidden) fecharFicha()
    else if (!$('#menu').hidden) $('#menu').hidden = true
    else if (!$('#legenda').hidden) $('#legenda').hidden = true
    else if (S.sel || S.modoTroca) limparSelecao()
  })
  document.addEventListener('pointerdown', (e) => {
    if (!$('#menu').hidden && !e.target.closest('#menu, #btnMenu')) $('#menu').hidden = true
    if (!$('#legenda').hidden && !e.target.closest('#legenda, #roda')) $('#legenda').hidden = true
  })
  window.addEventListener('resize', () => { if (!$('#luta').hidden) roda.medir() })
  montarInicio(); mostrar('inicio')
  if (TESTE) ganchoDeTeste()
}

// Gancho só para o teste automático (?teste=1): lê o estado e escolhe a próxima jogada; os cliques são de verdade.
function ganchoDeTeste() {
  S.vel = Number(url.get('vel') || 0.12); arena.vel = S.vel
  const q = (n) => n
  window.__frayz = {
    avisos: [], S, arena, q, P,
    /** só para o teste: manda um comando como se fosse da tela (usado para passar o turno dos dois lados) */
    passarOsDois: async () => { while (!S.estado.fim) { await executar({ tipo: 'passar', time: S.estado.vez }, S.estado.vez === P.EU ? 'voce' : 'rival'); if (S.estado.fim) break; S.vezAnterior = S.estado.vez } await fimDaLuta() },
    estado: () => S.estado,
    livre: () => minhaVez(),
    acabou: () => !!S.estado?.fim,
    criticos: () => arena.eventosVistos.critico,
    sugestao: () => P.planoDoRobo(S.estado, 'planejador')[0] ?? null,
    pagina: (id) => { const r = arena.retangulos()[id], b = $('#arena').getBoundingClientRect(); return r ? { x: b.left + r.x + r.w / 2, y: b.top + r.y + r.h * 0.45 } : null },
    leque: (v) => { S.vel = v; arena.vel = v },
  }
}

ligar()
