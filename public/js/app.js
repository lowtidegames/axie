// Frayz — tela do protótipo jogável local. Só mostra o que o motor devolve (via ponte.js). Nenhuma regra aqui.
import * as P from './ponte.js'
import { Arena } from './arena.js'
import { Roda } from './roda.js'
import { faixaDoTipo, iconeDoBordado, iconeDoTipo, miniatura, FIOS } from './bonecos.js'
import * as Col from './colecao.js'
import * as Som from './som.js'
import { FASES } from './aventura-dados.js'
import { $, el, desenharBonecoEm, iconeTipo, bonecoCanvas, avisoHub, NOME_LUGAR } from './ui.js'
import { abrirBoneco, fecharBoneco, ligarColecao, renderColecao, renderMural } from './colecao-ui.js'
import { fecharCasulo, iniciarCostura, ligarCostura, renderCostura } from './costura-ui.js'
import { iniciarAventura, ligarAventura, renderAventura } from './aventura-ui.js'

const url = new URLSearchParams(location.search)
const TESTE = url.get('teste') === '1'
const MOTIVO_FIM = { derrubou: 'Os três caíram.', tesoura: 'A Tesoura decidiu: vence quem sobrou com mais vida.', desempate: 'Empate de vida: o sorteio decidiu.' }
const GOLPE_FORTE = 100 // PROVISÓRIO (só visual): a partir daqui o golpe ganha pausa de impacto
const NOME_ROBO = { ganancioso: 'Ganancioso', planejador: 'Planejador' }

const S = {
  escolha: [], robo: 'planejador',
  estado: null, semente: null, timeA: null, timeB: null,
  travado: true, sel: null, modoTroca: null, replay: false, parar: false, rodando: false,
  stats: null, ultima: null, vezAnterior: null, relogio: null, inicioTurno: 0, vel: 1,
  maoAnterior: new Set(),
  modo: 'livre', fase: null, idsA: null, aba: 'inicio', abaDeOrigem: 'inicio', golpes: {}, ultimoGolpe: null, registrado: false, combo: 0, comboVez: null,
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
const ABAS = ['aventura', 'inicio', 'colecao', 'costura', 'mural']
const DESENHA = { aventura: () => renderAventura(), inicio: () => { montarListaLivre() }, colecao: () => renderColecao(), costura: () => renderCostura(), mural: () => renderMural() }
/** Mostra a luta ou o hub (com uma das abas). */
function mostrar(qual) {
  const luta = qual === 'luta'
  $('#hub').hidden = luta; $('#luta').hidden = !luta
  document.body.dataset.tela = luta ? 'luta' : qual
  if (luta) requestAnimationFrame(() => { arena.medir(); roda.medir() })
  else irParaAba(ABAS.includes(qual) ? qual : S.aba)
}
function irParaAba(aba) {
  S.aba = aba
  for (const a of ABAS) $('#' + a).hidden = a !== aba
  for (const b of document.querySelectorAll('.aba')) { const on = b.dataset.aba === aba; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)) }
  document.body.dataset.tela = aba
  try { localStorage.setItem('frayz_aba', aba) } catch { /* ok */ }
  DESENHA[aba]()
  const sc = document.querySelector(`#${aba} .ini-corpo, #${aba} .sub-rolagem`); if (sc) sc.scrollTop = 0
}

// ------------------------------------------------------------------ TELA INICIAL
const partesDe = (f) => Object.fromEntries(Object.entries(f.partes).map(([k, v]) => [k, `${v.id}@${v.raridade}`]))
const icone = (cv, px = 18) => { cv.style.width = cv.style.height = px + 'px'; return cv }

function fichaDeLista(boneco) {
  const id = boneco.id, f = P.fichaDoBoneco(boneco), pode = Col.podeLutar(boneco)
  const b = el('button', 'ficha'); b.type = 'button'; b.dataset.id = id; b.setAttribute('role', 'listitem'); b.setAttribute('aria-pressed', 'false')
  if (!pode.ok) { b.disabled = true; b.title = pode.motivo; b.classList.add('apagado') }
  b.append(bonecoCanvas(boneco, 78))
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
  const pt = el('div', 'f-partes', pode.ok ? ['tronco', 'cabeca', 'bracos', 'pernas'].map((s) => f.partes[s].nome).join(' · ') : pode.motivo)
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
    if (id) { const bo = Col.obter(id); const cv = bonecoCanvas(bo, 42); cv.className = ''; slot.append(cv); slot.title = P.fichaDoBoneco(bo).nome; slot.classList.add('cheio') }
    else slot.append(el('span', null, NOME_LUGAR[i]))
    const lab = el('em', null, NOME_LUGAR[i]); slot.append(lab)
    box.append(slot)
  }
  $('#btnLutar').disabled = S.escolha.length !== 3
  $('#btnLutar').textContent = S.escolha.length === 3 ? 'Lutar!' : `Falta${3 - S.escolha.length > 1 ? 'm' : ''} ${3 - S.escolha.length}`
}

function montarListaLivre() {
  S.escolha = S.escolha.filter((id) => Col.obter(id) && Col.podeLutar(Col.obter(id)).ok)
  const g = $('#grade'); g.replaceChildren()
  for (const b of Col.ativos().filter((x) => !Col.casuloFechado(x))) g.append(fichaDeLista(b))
  atualizarEscolha()
}

function montarInicio() {
  montarListaLivre()
  for (const r of document.querySelectorAll('input[name=robo]')) r.addEventListener('change', () => { S.robo = r.value })
  $('#btnLutar').addEventListener('click', () => { if (S.escolha.length === 3) iniciarLuta() })
  $('#btnAssistir').addEventListener('click', colarEAssistir)
}

function sortearRival(idsA) { // time do rival: 3 bonecos prontos diferentes dos seus (sorteio da tela, não é regra)
  const livres = P.idsProntos().filter((x) => !idsA.includes(x)), pool = livres.length >= 3 ? livres : P.idsProntos()
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
    S.ultima = r; S.modo = 'livre'; S.abaDeOrigem = 'inicio'; S.idsA = null; assistir()
  } catch (e) { msg.textContent = e.message; msg.classList.add('erro') }
}

// ------------------------------------------------------------------ LUTA: começo
const roboEscolhido = () => document.querySelector('input[name=robo]:checked')?.value ?? 'planejador'
/** opc: { modo: 'livre'|'aventura', fase, idsA (ids da coleção), timeA/timeB (definições, na revanche), semente, robo } */
async function iniciarLuta(opc = {}) {
  const modo = opc.modo ?? 'livre', fase = opc.fase ? FASES[opc.fase - 1] : null
  const idsA = opc.idsA ?? S.escolha.slice()
  let timeA = opc.timeA
  if (!timeA) { try { timeA = Col.defsDoTime(idsA) } catch (e) { avisoHub(e.message); return } }
  const rivalFixo = TESTE && url.get('rival') ? url.get('rival').split(',') : null
  const timeB = opc.timeB ?? (fase ? fase.time.slice() : rivalFixo ?? sortearRival(idsA))
  const semente = opc.semente ?? url.get('semente') ?? P.novaSemente()
  S.timeA = timeA; S.timeB = timeB; S.semente = semente; S.replay = false; S.parar = false
  S.modo = modo; S.fase = fase?.n ?? opc.fase ?? null; S.idsA = idsA; S.abaDeOrigem = modo === 'aventura' ? 'aventura' : 'inicio'
  S.robo = opc.robo ?? (fase ? fase.robo : roboEscolhido())
  await abrirLuta(P.novaLuta({ semente, timeA, timeB }))
  await seguirTurnos()
}

async function abrirLuta(estado) {
  fecharTudo()
  S.estado = estado; S.travado = true; S.sel = null; S.modoTroca = null
  S.stats = { maior: null, viradas: 0, lider: 0, fios: 0 }
  S.golpes = {}; S.heroi = null; S.registrado = false; S.combo = 0; S.comboVez = null
  arena.comIntencao = S.modo === 'aventura' && !S.replay; arena.setIntencao(null); arena.medir()
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
  if (evCarta) { Som.cartaJogada(); contarCombo(quem, estadoAntes); await bannerCarta(evCarta, quem, estadoAntes, cmd) }
  else if (cmd.tipo === 'passar') await bannerCurto(quem === 'rival' ? 'Rival passou' : 'Você passou', 420)
  else if (cmd.tipo === 'trocar') await bannerCurto(quem === 'rival' ? 'Rival trocou de lugar' : 'Troca de lugar', 420)
  else if (cmd.tipo === 'fiapo') await bannerCurto(quem === 'rival' ? 'Rival descartou um fiapo' : 'Fiapo descartado', 420)
  S.estado = r.estado
  const vista = P.visao(S.estado)
  colherResumo(r.eventos, vista)
  if (r.eventos.some((e) => e.t === 'dano' && (e.critico || e.valor >= GOLPE_FORTE))) await new Promise((ok) => setTimeout(ok, 80 * S.vel)) // pausa de impacto (60–90 ms)
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
    if (ev.t === 'dano' && ev.de) { S.golpes[ev.de] = Math.max(S.golpes[ev.de] ?? 0, ev.valor); if (ev.de.startsWith(P.EU)) S.heroi = ev.de }
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
  renderTopo(v); renderBanda(v); renderMao(); atualizarInfo(); atualizarRoda(); atualizarIntencao(v)
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
  requestAnimationFrame(sinalDeMaisCartas)
  if (!mao.length) box.append(el('p', 'mao-vazia', 'Mão vazia'))
}

/** Há mais cartas além da borda? Acende a sombra e o "mais ›" (no celular a mão rola na horizontal). */
function sinalDeMaisCartas() {
  const mb = $('#maoBox'), w = $('#maoWrap')
  const dir = mb.scrollWidth - mb.clientWidth - mb.scrollLeft > 4, esq = mb.scrollLeft > 4
  w.classList.toggle('mais-dir', dir); w.classList.toggle('mais-esq', esq); $('#maoMais').hidden = !dir
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

// ------------------------------------------------------------------ Aventura: o inimigo MOSTRA a próxima intenção
// Vem de P.intencaoDoRival: o plano do robô para o turno dele como se você passasse AGORA (o robô só lê o estado; crítico pela média).
// Muda a cada jogada sua. A mão do rival é lida pelo robô (é assim que ele decide), então mostrar a intenção revela o que ele vai fazer.
const cacheIntencao = new WeakMap()
const ARTIGO = ['a Frente', 'o Meio', 'o Trás']
function frasesDaIntencao(itens, v) {
  const out = []
  for (const it of itens ?? []) {
    if (it.tipo === 'jogar') {
      const lugar = it.alvoId ? v.times[P.EU].lugares.indexOf(it.alvoId) : -1
      if (it.dano > 0) out.push({ dono: it.donoId, curto: `${lugar >= 0 ? NOME_LUGAR[lugar] : 'Todos'} ${it.dano}`, longo: `vai atacar ${lugar >= 0 ? ARTIGO[lugar] : 'todos os seus'} com ${it.dano}`, carta: it.carta, dano: it.dano })
      else out.push({ dono: it.donoId, curto: it.carta, longo: `vai usar ${it.carta}`, carta: it.carta, dano: 0 })
    } else if (it.tipo === 'trocar') out.push({ dono: null, curto: 'Troca', longo: 'vai trocar de lugar', dano: 0 })
    else if (it.tipo === 'fiapo') out.push({ dono: null, curto: 'Fiapo', longo: 'vai descartar um fiapo', dano: 0 })
  }
  return out
}
function atualizarIntencao(v) {
  const box = $('#intencao')
  if (S.modo !== 'aventura' || S.replay || !minhaVez()) { box.hidden = true; arena.setIntencao(null); S.intencao = null; return }
  let r = cacheIntencao.get(S.estado)
  if (r === undefined) { r = P.intencaoDoRival(S.estado, S.robo); cacheIntencao.set(S.estado, r) }
  const frases = frasesDaIntencao(r, v)
  S.intencao = frases
  const porDono = {}
  for (const f of frases) if (f.dono) (porDono[f.dono] ??= []).push(f.curto)
  arena.setIntencao(porDono)
  box.replaceChildren(); box.hidden = false
  box.append(el('b', null, 'O rival '))
  if (!frases.length) box.append('vai passar a vez.')
  else frases.slice(0, 3).forEach((f, i) => { if (i) box.append(' e '); box.append(f.longo); if (f.dono && f.carta) box.append(el('small', null, ` (${f.carta} de ${v.bonecos[f.dono].nome})`)) })
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
/** Combo: cartas do mesmo lado no mesmo turno ("x2", "x3"). */
function contarCombo(quem, estado) {
  if (S.comboVez !== estado.turno) { S.comboVez = estado.turno; S.combo = 0 }
  S.combo++
  if (S.combo >= 2) {
    const c = $('#combo'); c.textContent = `x${S.combo}`; c.dataset.quem = quem === 'rival' ? 'rival' : 'eu'; c.hidden = false
    c.classList.remove('anima'); void c.offsetWidth; c.classList.add('anima')
    clearTimeout(S.tCombo); S.tCombo = setTimeout(() => { c.hidden = true }, 1300)
  }
}

/** A carta que você jogou voa da mão até o alvo (cópia do elemento; "Menos animação" corta o voo). */
async function cartaVoando(cmd) {
  const origem = document.querySelector(`#mao .carta[data-cid="${cmd.carta}"]`)
  const alvoId = cmd.alvo ?? S.estado.times[P.EU].lugares.find((id) => S.estado.bonecos[id].estado === 'vivo')
  const pos = alvoId && arena.centro(alvoId)
  if (!origem || !pos || menos() || !origem.animate) return
  const a = origem.getBoundingClientRect(), cb = $('#arena').getBoundingClientRect()
  const clone = origem.cloneNode(true); clone.classList.remove('sel', 'vant', 'nova')
  Object.assign(clone.style, { position: 'fixed', left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', margin: '0', zIndex: 35, pointerEvents: 'none' })
  document.body.append(clone)
  const dx = cb.left + pos.x - (a.left + a.width / 2), dy = cb.top + pos.y - (a.top + a.height / 2)
  const anim = clone.animate([{ transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(0.9) rotate(6deg)`, opacity: 1, offset: 0.55 }, { transform: `translate(${dx}px, ${dy}px) scale(0.4) rotate(14deg)`, opacity: 0.2 }], { duration: 420 * Math.max(0.3, S.vel), easing: 'cubic-bezier(.4,0,.6,1)' })
  await anim.finished.catch(() => {}); clone.remove()
}

async function bannerCarta(ev, quem, estado, cmd) {
  if (quem === 'voce' && cmd) { await cartaVoando(cmd); return }
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
  let extra = null
  if (S.modo === 'aventura' && !S.registrado) { // cada luta da Aventura gasta 1 Ponto de Costura nos 3 bonecos usados (o motor soma)
    S.registrado = true
    Col.registrarLutas(S.idsA, { venceu: ganhei, maiorGolpes: [0, 1, 2].map((i) => S.golpes[`A${i}`] ?? 0) })
    if (ganhei) { Col.venceuFase(S.fase); extra = S.fase >= FASES.length ? 'Aventura completa! O Baú da Costureira está aberto.' : `Fase ${S.fase + 1} liberada.` }
    else extra = 'Perdeu: a fase continua liberada para tentar de novo.'
  }
  await esperar(700)
  if (ganhei) Som.vitoria(); else Som.derrota()
  const t = $('#fimTitulo'); t.textContent = ganhei ? 'Vitória!' : 'Derrota'; $('#fim').dataset.res = ganhei ? 'v' : 'd'
  $('#fimMotivo').textContent = MOTIVO_FIM[r.motivo] ?? ''
  const ul = $('#fimResumo'); ul.replaceChildren()
  const add = (k, val) => { const li = el('li'); li.append(el('span', null, k), el('b', null, val)); ul.append(li) }
  if (S.modo === 'aventura') add(`Fase ${S.fase}`, FASES[S.fase - 1].nome)
  add('Turnos', String(r.turno))
  const m = S.stats.maior
  add('Maior golpe', m ? `${m.valor}${m.critico ? ' (crítico)' : ''}${m.carta ? ' · ' + m.carta : ''}${m.time ? (m.time === P.EU ? ' · seu' : ' · do rival') : ''}` : '—')
  add('Viradas na frente', String(S.stats.viradas))
  add('Vida que sobrou', `você ${Math.round(r.pct.A * 100 / 3)}% · rival ${Math.round(r.pct.B * 100 / 3)}%`)
  if (extra) add('Aventura', extra)
  // destaque do boneco que deu o golpe final (vitória)
  const hb = $('#fimHeroi'); hb.replaceChildren(); hb.hidden = true
  if (ganhei && S.heroi && S.estado.bonecos[S.heroi]) {
    const bo = S.estado.bonecos[S.heroi], cv = el('canvas'); desenharBonecoEm(cv, bo.partes, 'vivo', 78); const ht = el('div', 'fim-heroi-txt'); ht.append(el('small', null, 'Golpe final'), el('b', null, bo.nome)); hb.append(cv, ht); hb.hidden = false
  }
  const av = S.modo === 'aventura'
  $('#btnProxima').hidden = !(av && ganhei && S.fase < FASES.length); $('#btnProxima').textContent = av ? `Fase ${(S.fase ?? 0) + 1}` : 'Próxima fase'
  $('#btnTrocarTime').textContent = av ? 'Voltar ao mapa' : 'Trocar time'
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
  S.registrado = true // rever não gasta remendo
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
  fecharTudo(); arena.marcar({}); arena.setIntencao(null); mostrar(S.abaDeOrigem); document.body.classList.remove('replay')
}

// ------------------------------------------------------------------ ligações
function aplicarMudo() {
  const m = Som.estaMudo()
  for (const id of ['#btnMudo', '#btnMudo2']) { const b = $(id); b.setAttribute('aria-pressed', String(m)); b.innerHTML = m ? '&#9835; Mudo' : '&#9835; Som'; b.setAttribute('aria-label', m ? 'Som desligado' : 'Som ligado') }
}

function ligar() {
  if (TESTE && url.get('recomecar') === '1') Col.recomecar(); else Col.carregar()
  arena = new Arena($('#arena')); roda = new Roda($('#rodaCv'))
  aplicarMenos(lerMenos(), false)
  aplicarMudo()
  for (const id of ['#btnMudo', '#btnMudo2']) $(id).addEventListener('click', () => { Som.mudo(!Som.estaMudo()); aplicarMudo() })
  for (const b of document.querySelectorAll('.aba')) b.addEventListener('click', () => irParaAba(b.dataset.aba))
  document.addEventListener('frayz-aba', (e) => irParaAba(e.detail))
  ligarColecao(() => { if (S.aba === 'colecao') renderColecao() })
  ligarCostura((id) => { irParaAba('colecao'); if (id) abrirBoneco(id) })
  ligarAventura(({ fase, ids }) => iniciarLuta({ modo: 'aventura', fase, idsA: ids }))
  iniciarCostura(); iniciarAventura()
  $('#bonecoFechar').addEventListener('click', fecharBoneco)
  $('#bonecoModal').addEventListener('click', (e) => { if (e.target.id === 'bonecoModal') fecharBoneco() })
  $('#casulo').addEventListener('click', (e) => { if (e.target.id === 'casulo') fecharCasulo() })
  $('#optMenos').addEventListener('change', (e) => aplicarMenos(e.target.checked))
  $('#optMenos2').addEventListener('change', (e) => aplicarMenos(e.target.checked))
  $('#btnPassar').addEventListener('click', passar)
  $('#btnTrocar').addEventListener('click', iniciarTroca)
  $('#btnMenu').addEventListener('click', () => { const m = $('#menu'); m.hidden = !m.hidden })
  $('#btnSair').addEventListener('click', sairParaInicio)
  $('#btnParar').addEventListener('click', () => { S.parar = true; sairParaInicio() })
  $('#btnRevanche').addEventListener('click', () => { $('#fim').hidden = true; iniciarLuta({ timeA: S.timeA, timeB: S.timeB, semente: P.novaSemente(), modo: S.modo, fase: S.fase, idsA: S.idsA ?? undefined, robo: S.robo }) })
  $('#btnProxima').addEventListener('click', () => { $('#fim').hidden = true; iniciarLuta({ modo: 'aventura', fase: S.fase + 1, idsA: S.idsA }) })
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
    if (!$('#casulo').hidden) fecharCasulo()
    else if (!$('#bonecoModal').hidden) fecharBoneco()
    else if (!$('#fichaModal').hidden) fecharFicha()
    else if (!$('#menu').hidden) $('#menu').hidden = true
    else if (!$('#legenda').hidden) $('#legenda').hidden = true
    else if (S.sel || S.modoTroca) limparSelecao()
  })
  document.addEventListener('pointerdown', (e) => {
    if (!$('#menu').hidden && !e.target.closest('#menu, #btnMenu')) $('#menu').hidden = true
    if (!$('#legenda').hidden && !e.target.closest('#legenda, #roda')) $('#legenda').hidden = true
  })
  $('#maoBox').addEventListener('scroll', sinalDeMaisCartas, { passive: true })
  window.addEventListener('resize', () => { if (!$('#luta').hidden) { roda.medir(); sinalDeMaisCartas() } })
  montarInicio()
  let aba = url.get('aba')
  if (!ABAS.includes(aba)) { try { aba = TESTE ? 'inicio' : localStorage.getItem('frayz_aba') } catch { aba = null } }
  S.aba = ABAS.includes(aba) ? aba : 'aventura'
  mostrar(S.aba)
  if (TESTE) ganchoDeTeste()
}

// Gancho só para o teste automático (?teste=1): lê o estado e escolhe a próxima jogada; os cliques são de verdade.
function ganchoDeTeste() {
  S.vel = Number(url.get('vel') || 0.12); arena.vel = S.vel
  const q = (n) => n
  let n = 0
  Col.definirFonteDeSemente(() => `${url.get('semente') ?? 'costura'}-${++n}`)
  window.__frayz = {
    avisos: [], S, arena, q, P, Col, Som, irParaAba, intencao: () => S.intencao,
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
