// Frayz — tela do jogo. Só mostra o que o motor ou o servidor devolvem (via ponte.js, que escolhe o modo). Nenhuma regra aqui.
// A luta usa as peças do ateliê (js/pecas/*: mão em leque, carretéis, bastidor, fio do tempo, etiquetas, botões-retalho)
// e a arena (js/arena.js: cenário, bonecos de pano e efeitos). Som em cada acontecimento (som.js) e música por momento (musica.js).
import * as P from './ponte.js'
import { Arena } from './arena.js'
import { iconeDoBordado } from './bonecos.js'
import * as Col from './colecao.js'
import * as Som from './som.js'
import * as Musica from './musica.js'
import { FASES } from './aventura-dados.js'
import { $, el, desenharBonecoEm, iconeTipo, bonecoCanvas, avisoHub, NOME_LUGAR } from './ui.js'
import { abrirBoneco, fecharBoneco, ligarColecao, renderColecao, renderMural } from './colecao-ui.js'
import { fecharCasulo, iniciarCostura, ligarCostura, renderCostura } from './costura-ui.js'
import { horaDaRecarga, iniciarAventura, ligarAventura, renderAventura } from './aventura-ui.js'
import { abreviar, criarMao } from './pecas/mao.js'
import { criarCarta } from './pecas/carta.js'
import { criarCarreteis, criarContador } from './pecas/carreteis.js'
import { criarBastidor } from './pecas/bastidor.js'
import { mostrarFaixa } from './pecas/faixa.js'
import { criarFioDoTempo } from './pecas/fio-do-tempo.js'
import { criarEtiquetas } from './pecas/etiqueta.js'
import { atualizarBotao, criarBotao } from './pecas/botao.js'
import { formatoDe, pesponto, svg } from './pecas/base.js'
import { criarPrateleira } from './pecas/prateleira.js'
import { criarLogotipo } from './pecas/logotipo.js'
import { corDoTecido, urlDoTecido } from './pecas/arte-adaptador.js'
import * as arte from './pecas/arte-adaptador.js'
import { BONUS, FRASE_DO_FIAPO, ICONES, PARES, TEXTO_DA_RODA, bonecoEm, dadosDaCarta, montarFicha } from './pecas/montagens.js'

const url = new URLSearchParams(location.search)
const TESTE = url.get('teste') === '1'
const MOTIVO_FIM = { derrubou: 'Os três caíram.', tesoura: 'A Tesoura decidiu: vence quem sobrou com mais vida.', desempate: 'Empate de vida: o sorteio decidiu.', desistiu: 'Você desistiu da luta.', abandono: 'A luta ficou parada tempo demais.' }
const NOME_ROBO = { ganancioso: 'Ganancioso', planejador: 'Planejador' }

const S = {
  escolha: [], robo: 'planejador',
  estado: null, semente: null, timeA: null, timeB: null,
  travado: true, sel: null, modoTroca: null, replay: false, parar: false, rodando: false,
  stats: null, ultima: null, vezAnterior: null, inicioTurno: 0, vel: 1,
  modo: 'livre', fase: null, idsA: null, aba: 'inicio', abaDeOrigem: 'inicio', golpes: {}, ultimoGolpe: null, registrado: false, combo: 0, comboVez: null,
  turnoMostrado: 0, momento: null, textoReplay: '', alvoFoco: null,
}
let arena
const H = {} // as peças da luta (montadas uma vez)
const dadosDe = new Map() // cid → dados da carta (o mesmo objeto sempre: a mão não redesenha a carta à toa)

// ------------------------------------------------------------------ menos animação
function lerMenos() {
  try { const v = localStorage.getItem('menos_animacao'); if (v !== null) return v === '1' } catch { /* sem armazenamento */ }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
function aplicarMenos(v, guardar = true) {
  document.documentElement.dataset.menos = v ? '1' : '0'
  $('#optMenos').checked = v; $('#optMenos2').checked = v
  if (arena) arena.menos = v
  Som.calmo(v)
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
  if (luta) { aplicarFormato(); requestAnimationFrame(() => { arena.medir(); H.mao.medir() }) }
  else { irParaAba(ABAS.includes(qual) ? qual : S.aba); musica('entrada') }
}
function irParaAba(aba) {
  S.aba = aba
  $('#hub').dataset.formato = formatoDoHub()
  for (const a of ABAS) $('#' + a).hidden = a !== aba
  for (const b of document.querySelectorAll('.aba')) { const on = b.dataset.aba === aba; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)) }
  document.body.dataset.tela = aba
  try { localStorage.setItem('frayz_aba', aba) } catch { /* ok */ }
  DESENHA[aba]()
  const sc = document.querySelector(`#${aba} .ini-corpo, #${aba} .sub-rolagem`); if (sc) sc.scrollTop = 0
}
/** Música: troca de momento só quando muda (a troca acontece na virada do compasso). */
function musica(momento) {
  if (S.momento === momento) return
  S.momento = momento
  try { Musica.momento(momento) } catch { /* sem áudio */ }
}

// ------------------------------------------------------------------ TELA INICIAL (Luta livre): prateleira + ficha do escolhido
const icone = (cv, px = 18) => { cv.style.width = cv.style.height = px + 'px'; return cv }
/** Formato do hub (o mesmo critério das peças: PC = largo e deitado). */
const formatoDoHub = () => formatoDe(null)
/** Desenho do boneco para a prateleira (com os remendos do desgaste), na altura pedida. */
const desenhoDe = (b, alto) => () => bonecoCanvas(b, Math.round(alto / 1.547))

function alternar(id) {
  const i = S.escolha.indexOf(id)
  if (i >= 0) S.escolha.splice(i, 1)
  else if (S.escolha.length < 3) S.escolha.push(id)
  else { S.escolha.shift(); S.escolha.push(id) }
  S.aberto = id
  Som.tocar('botao')
  atualizarEscolha()
}
function atualizarEscolha() {
  H.prateleira?.marcar({ escolhidos: S.escolha, aberto: S.aberto })
  // a ficha do boneco tocado por último (peças: etiqueta, números, cartas, bordado) e o botão de pôr/tirar
  const painel = $('#livreFicha'), bo = S.aberto && Col.obter(S.aberto)
  if (painel && bo) {
    const pc = formatoDoHub() === 'pc', dentro = S.escolha.includes(S.aberto), f = P.fichaDoBoneco(bo)
    const por = criarBotao({ rotulo: dentro ? (pc ? 'Tirar do time' : 'Tirar') : (pc ? 'Pôr no time' : 'Escolher'), variante: dentro ? 'secundario' : 'principal' })
    por.classList.add('fz-time__por'); por.setAttribute('aria-label', dentro ? `Tirar ${f.nome} do time` : `Pôr ${f.nome} no time`)
    por.addEventListener('click', () => alternar(bo.id))
    painel.replaceChildren(pesponto({ recuo: 5, raio: 9 }), montarFicha(f, pc), por)
  }
  // os 3 lugares bordados (Frente, Meio, Trás): o boneco escolhido sobe para o círculo dele
  const box = $('#timeEscolhido'); box.replaceChildren(); box.classList.add('fz-time__circulos')
  const alto = formatoDoHub() === 'pc' ? 64 : 54
  for (let i = 0; i < 3; i++) {
    const c = el('div', 'fz-circulo'), id = S.escolha[i]
    c.append(el('span', 'fz-circulo__anel'))
    if (id) { const bo2 = Col.obter(id); c.classList.add('fz-circulo--cheio'); c.append(bonecoEm(P.facesDe(bo2), alto)); c.title = P.fichaDoBoneco(bo2).nome }
    else c.append(el('span', 'fz-circulo__vazio', String(i + 1)))
    c.append(el('span', 'fz-circulo__nome', NOME_LUGAR[i]))
    box.append(c)
  }
  const falta = 3 - S.escolha.length
  atualizarBotao($('#btnLutar'), { desligado: falta > 0, rotulo: falta > 0 ? 'Lutar' : 'Lutar!', detalhe: falta > 0 ? `Falta${falta > 1 ? 'm' : ''} ${falta}` : null })
}

function montarListaLivre() {
  S.escolha = S.escolha.filter((id) => Col.obter(id) && Col.podeLutar(Col.obter(id)).ok)
  const pc = formatoDoHub() === 'pc'
  const bs = Col.ativos().filter((x) => !Col.casuloFechado(x))
  if (!S.aberto || !bs.some((b) => b.id === S.aberto)) S.aberto = S.escolha[S.escolha.length - 1] ?? bs[0]?.id ?? null
  const itens = bs.map((b) => { const pode = Col.podeLutar(b); return { id: b.id, nome: P.fichaDoBoneco(b).nome, desenho: desenhoDe(b, pc ? 112 : 84), desligado: !pode.ok, motivo: pode.motivo } })
  H.prateleira = criarPrateleira($('#grade'), itens, { porTabua: pc ? 5 : 3, nomes: pc, classe: 'ficha', aoTocar: alternar, rotulo: 'Seus bonecos' })
  atualizarEscolha()
}

function montarInicio() {
  const lutar = criarBotao({ rotulo: 'Lutar', variante: 'principal', desligado: true }); lutar.id = 'btnLutar'
  $('#btnLutar').replaceWith(lutar)
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

// ------------------------------------------------------------------ peças da luta (montadas uma vez)
const formatoDaJanela = () => (window.innerWidth >= 640 ? 'pc' : 'celular')

function montarPecasDaLuta() {
  // topo: turno numa etiqueta, aviso da Tesoura, fio do tempo
  H.turno = el('b', 'fz-luta__turno-numero', '1')
  $('#tTurno').append(el('span', 'fz-luta__turno-rotulo', 'Turno'), H.turno, el('span', 'fz-luta__turno-rotulo', `de ${P.REGRAS.turnoFinal}`), pesponto({ recuo: 3, raio: 4 }))
  H.tesoura = el('span', null, '')
  $('#tTesoura').append(ICONES.tesoura(), H.tesoura)
  H.fio = criarFioDoTempo({ total: P.TEMPO_DO_TURNO_S, alerta: 5 })
  H.fio.aoAcabar(relogioAcabou)
  $('#tRelogio').append(H.fio.el)
  // rival: Linha, mão e baralho
  H.linhaRival = criarCarreteis({ maximo: P.REGRAS.linhaMaxima, rotulo: 'Linha do rival', compacto: true })
  H.maoRival = criarContador({ icone: 'mao', rotulo: 'Cartas na mão do rival' })
  H.baralhoRival = criarContador({ icone: 'baralho', rotulo: 'Cartas no baralho do rival' })
  H.nomeRival = el('b', 'fz-luta__nome', 'Rival')
  $('#banda').append(H.nomeRival, H.linhaRival.el, H.maoRival.el, H.baralhoRival.el)
  // bastidor (roda dos tecidos)
  H.bastidor = criarBastidor({ tipos: P.TIPOS, nomes: P.NOMES_DOS_TIPOS, pares: PARES, texto: TEXTO_DA_RODA })
  $('#roda').append(H.bastidor.el)
  // minha Linha e baralho
  H.linha = criarCarreteis({ maximo: P.REGRAS.linhaMaxima, rotulo: 'Linha' })
  H.baralho = criarContador({ icone: 'baralho', rotulo: 'Cartas no seu baralho' })
  $('#blEu').append(H.linha.el, H.baralho.el)
  // a mão em leque
  H.mao = criarMao($('#mao'), { baralho: H.baralho.el, palco: $('#luta'), nomeDoTipo: (t) => P.NOMES_DOS_TIPOS[t], rotulo: 'Sua mão' })
  H.mao.aoEscolher(({ id, acao }) => aoTocarCarta(id, acao))
  // botões-retalho
  H.trocar = criarBotao({ rotulo: 'Trocar lugares', detalhe: `${P.REGRAS.custoDaTroca} de Linha`, variante: 'secundario', atalho: 'T' }); H.trocar.id = 'btnTrocar'
  H.passar = criarBotao({ rotulo: 'Passar', variante: 'principal', atalho: 'Espaço' }); H.passar.id = 'btnPassar'
  $('#botoes').append(H.trocar, H.passar)
  // avisos: etiquetas presas com alfinete
  H.etiquetas = criarEtiquetas($('#toast'))
  // fim da luta: botões
  H.fimBotoes = {
    proxima: criarBotao({ rotulo: 'Próxima fase', variante: 'principal' }),
    revanche: criarBotao({ rotulo: 'Revanche', variante: 'principal', atalho: 'Enter' }),
    trocarTime: criarBotao({ rotulo: 'Trocar time', variante: 'secundario' }),
    rever: criarBotao({ rotulo: 'Rever', variante: 'secundario', icone: ICONES.rolo() }),
    copiar: criarBotao({ rotulo: 'Copiar replay', variante: 'secundario' }),
  }
  const ids = { proxima: 'btnProxima', revanche: 'btnRevanche', trocarTime: 'btnTrocarTime', rever: 'btnRever', copiar: 'btnCopiar' }
  for (const [k, b] of Object.entries(H.fimBotoes)) { b.id = ids[k]; $('#fimBotoes').append(b) }
  H.fimExtra = el('p', 'fz-fim__extra'); $('#fimMotivo').after(H.fimExtra)
  aplicarFormato()
}

/** PC (≥ 640 px) ou celular: muda o tamanho das peças e onde mora o bastidor. */
function aplicarFormato() {
  const f = formatoDaJanela()
  if ($('#luta').dataset.formato === f) return
  $('#luta').dataset.formato = f; $('#fim').dataset.formato = f
  const roda = $('#roda')
  if (f === 'pc') { $('#arenaBox').append(roda); H.bastidor.el.dataset.lado = 'baixo' }
  else { $('#blEu').append(roda); H.bastidor.el.dataset.lado = 'cima' }
  requestAnimationFrame(() => H.bastidor.medir?.())
}

// ------------------------------------------------------------------ LUTA: começo
const roboEscolhido = () => document.querySelector('input[name=robo]:checked')?.value ?? 'planejador'
/** opc: { modo: 'livre'|'aventura', fase, idsA (ids da coleção), timeA/timeB (definições, na revanche), semente, robo } */
async function iniciarLuta(opc = {}) {
  if (S.abrindo) return
  const modo = opc.modo ?? 'livre', fase = opc.fase ? FASES[opc.fase - 1] : null
  const idsA = opc.idsA ?? S.escolha.slice()
  let timeA = opc.timeA
  if (!timeA) { try { timeA = Col.defsDoTime(idsA) } catch (e) { avisoHub(e.message); return } }
  const rivalFixo = TESTE && url.get('rival') ? url.get('rival').split(',') : null
  const timeB = opc.timeB ?? (fase ? fase.time.slice() : rivalFixo ?? sortearRival(idsA))
  const semente = opc.semente ?? url.get('semente') ?? P.novaSemente()
  const robo = opc.robo ?? (fase ? fase.robo : roboEscolhido())
  // abrir uma luta da Aventura gasta energia (a ponte decide: no aparelho ou no servidor); sem energia a luta não abre e a tela diz quando volta
  S.abrindo = true
  let r
  try { r = await P.abrirLuta({ modo, fase: fase?.n ?? opc.fase ?? null, ids: idsA, timeA, timeB, semente, robo }) } finally { S.abrindo = false }
  if (!r.ok) {
    if (r.codigo === 'LUTA_ABERTA') { avisoHub('Você tinha uma luta aberta: voltando a ela.', false); await retomar(); return }
    if (!$('#luta').hidden) sairParaInicio(); else irParaAba(modo === 'aventura' ? 'aventura' : S.aba)
    if (r.codigo === 'SEM_ENERGIA') avisoHub(`Sem energia agora: ela volta inteira às ${horaDaRecarga(r.energia ?? P.energia())}. A Luta livre não gasta energia.`)
    else avisoHub(r.motivo)
    return
  }
  S.timeA = timeA; S.timeB = timeB; S.semente = semente; S.replay = false; S.parar = false
  S.modo = modo; S.fase = fase?.n ?? opc.fase ?? null; S.idsA = idsA; S.abaDeOrigem = modo === 'aventura' ? 'aventura' : 'inicio'
  S.robo = r.robo ?? robo
  await abrirLuta(r.estado)
  await seguirTurnos()
}

/** Volta à luta que ficou aberta no servidor (página recarregada, rede que caiu, ou abriu outra por cima). */
async function retomar() {
  const r = await P.retomarLuta()
  if (!r.ok) { avisoHub(r.motivo); return }
  if (!r.aberta) return
  S.timeA = null; S.timeB = null; S.semente = null; S.replay = false; S.parar = false
  S.modo = r.modo; S.fase = r.fase ?? null; S.idsA = r.ids ?? null; S.abaDeOrigem = r.modo === 'aventura' ? 'aventura' : 'inicio'
  S.robo = r.robo
  await abrirLuta(r.estado)
  aviso('A luta continua de onde parou.')
  await seguirTurnos()
}

async function abrirLuta(estado) {
  fecharTudo()
  S.estado = estado; S.travado = true; S.sel = null; S.modoTroca = null; S.alvoFoco = null
  S.stats = { maior: null, viradas: 0, lider: 0, fios: 0 }
  S.golpes = {}; S.heroi = null; S.registrado = false; S.combo = 0; S.comboVez = null; S.turnoMostrado = 0
  dadosDe.clear()
  arena.comIntencao = S.modo === 'aventura' && !S.replay; arena.setIntencao(null)
  S.vezAnterior = null
  mostrar('luta')
  $('#btnParar').hidden = !S.replay
  $('#btnDesistir').hidden = S.replay || !P.lutaDoServidor(estado)
  document.body.classList.toggle('replay', S.replay)
  H.nomeRival.textContent = 'Rival'
  H.nomeRival.title = S.replay ? 'Rival' : `Rival: ${NOME_ROBO[S.robo] ?? ''}`
  H.etiquetas.limpar()
  const v = P.visao(estado)
  arena.recomecar(); arena.medir(); arena.sync(v); arena.marcar({})
  H.mao.definir([])
  renderTopo(v); renderHud(v)
  await arena.preparar() // assa o ateliê e os bonecos em fatias, antes da música da luta e da faixa de vez
  await new Promise((ok) => setTimeout(ok, 0)) // a mão (cartas com desenho) nasce noutra tarefa, não junto do último boneco
  renderTudo()
  musica('luta')
  await esperar(250)
}

/** Depois de qualquer comando: de quem é a vez? */
async function seguirTurnos() {
  if (S.parar) return
  const e = S.estado
  if (e.fim) { await fimDaLuta(); return }
  if (S.vezAnterior !== e.vez) {
    S.vezAnterior = e.vez
    await faixaDeVez(e.vez === P.EU ? 'Sua vez' : 'Vez do rival', e.vez === P.EU ? 'eu' : 'rival')
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
async function executar(cmd, quem, pronto = null) {
  const travadoAntes = S.travado, estadoPedido = S.estado
  S.travado = true // a resposta pode demorar (servidor): nada de segundo toque enquanto isso
  const r = pronto ?? await P.enviar(S.estado, cmd)
  if (S.estado !== estadoPedido) return false // a luta mudou enquanto esperava (saiu, desistiu ou o relógio passou a vez)
  if (!r.ok) { S.travado = travadoAntes; if (quem === 'voce') aviso(r.motivo, 'recusa'); return false }
  if (r.cmd) cmd = r.cmd // o comando como o motor gravou (no servidor: o passo que veio)
  if (r.aviso) aviso(r.aviso, 'alerta')
  pararRelogio(); limparSelecao(false)
  const estadoAntes = S.estado
  const evCarta = r.eventos.find((e) => e.t === 'carta')
  if (evCarta) { Som.cartaJogada(quem === 'rival' ? 'B' : 'A'); contarCombo(quem, estadoAntes); await cartaJogada(evCarta, quem, estadoAntes, cmd) }
  else if (cmd.tipo === 'passar') await faixaDeVez(quem === 'rival' ? 'Rival passou' : 'Você passou', 'aviso', 420)
  else if (cmd.tipo === 'trocar') await faixaDeVez(quem === 'rival' ? 'Rival trocou de lugar' : 'Troca de lugar', 'aviso', 420)
  else if (cmd.tipo === 'fiapo') { Som.tocar('fiapo'); if (quem !== 'rival') await H.mao.descartar(cmd.carta); else await faixaDeVez('Rival descartou um fiapo', 'aviso', 420) }
  S.estado = r.estado
  const vista = P.visao(S.estado)
  colherResumo(r.eventos, vista)
  for (const ev of r.eventos) { // sons que não são de boneco (os de boneco a arena toca no instante do golpe)
    if (ev.t === 'compra' && ev.time === P.EU) Som.tocar('comprarCarta')
    if (ev.t === 'linha' && ev.time === P.EU) Som.tocar('linhaGanha')
  }
  if (r.eventos.some((e) => e.t === 'dano' && (e.critico || e.valor >= 100))) await new Promise((ok) => setTimeout(ok, 80 * S.vel)) // pausa de impacto (60–90 ms)
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
    if (ev.t === 'dano' && ev.de) { S.golpes[ev.de] = Math.max(S.golpes[ev.de] ?? 0, ev.valor); S.ultimoGolpe = ev.de; if (ev.de.startsWith(P.EU)) S.heroi = ev.de }
  }
  // quem está na frente em vida (soma de vida/vidaMax dos bonecos de pé): conta as viradas
  const pct = (t) => vista.times[t].lugares.reduce((s, id) => { const b = vista.bonecos[id]; return s + (b.estado === 'vivo' ? b.vida / b.vidaMax : 0) }, 0)
  const d = pct('A') - pct('B'), lado = d > 0.0001 ? 1 : d < -0.0001 ? -1 : 0
  if (lado !== 0) { if (S.stats.lider !== 0 && lado !== S.stats.lider) S.stats.viradas++; S.stats.lider = lado }
}

// ------------------------------------------------------------------ jogada do jogador
const minhaVez = () => !S.travado && !S.replay && S.estado && !S.estado.fim && S.estado.vez === P.EU

function limparSelecao(render = true) {
  S.sel = null; S.modoTroca = null; S.alvoFoco = null
  arena.marcar({})
  if (render) { renderMao(); atualizarInfo(); atualizarBastidor(); atualizarBotao(H.trocar, { aceso: false }) }
}

/** acao: 'escolher' (clique, tecla) ou 'jogar' (botão Jogar da carta ampliada, no toque). */
function aoTocarCarta(cid, acao = 'escolher') {
  if (!minhaVez()) { if (!S.replay) aviso(S.estado?.vez === P.RIVAL ? 'Espere: é a vez do rival.' : 'Agora não.'); return }
  S.modoTroca = null; atualizarBotao(H.trocar, { aceso: false })
  const v = P.visao(S.estado)
  if (P.podeFiapo(S.estado, cid)) { executar({ tipo: 'fiapo', time: P.EU, carta: cid }, 'voce').then(() => seguirTurnos()); return }
  const jog = P.jogadasDaCarta(S.estado, cid)
  if (!jog.length) { Som.tocar('semLinha'); aviso(P.motivoDaRecusa(S.estado, cid) || 'Essa carta não pode agora.', 'recusa'); return }
  if (S.sel === cid || acao === 'jogar') { // segundo toque na mesma carta (ou Jogar): joga, se só há um jeito
    if (jog.length === 1) return jogarCom(jog[0])
    if (S.sel === cid && acao !== 'jogar') { limparSelecao(); return }
  }
  S.sel = cid
  Som.tocar('escolherCarta')
  const { alvos, vant } = alvosDaSelecao(v, cid, jog)
  S.alvoFoco = null
  arena.marcar({ alvos, usuario: v.cartas[cid].dono, vantagem: vant })
  renderMao(); atualizarInfo(); atualizarBastidor()
  aviso(`${P.CARTAS[v.cartas[cid].carta].nome}: toque no alvo aceso.`)
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
    aviso('Esse alvo não vale para essa carta.', 'recusa'); return
  }
  abrirFicha(id)
}

function jogarCom(cmd) { executar(cmd, 'voce').then((ok) => { if (ok) seguirTurnos(); else limparSelecao() }) }

function iniciarTroca() {
  if (!minhaVez()) return
  if (S.modoTroca) return limparSelecao()
  const t = P.trocasPossiveis(S.estado)
  if (!t.length) { const r = P.recusaDe(S.estado, { tipo: 'trocar', time: P.EU, a: S.estado.times.A.lugares[0], b: S.estado.times.A.lugares[1] }); aviso(r ? r.motivo : 'Sem troca possível.', 'recusa'); return }
  S.sel = null; S.modoTroca = { a: null }
  const ids = new Set(); t.forEach((c) => { ids.add(c.a); ids.add(c.b) })
  arena.marcar({ alvos: [...ids] }); atualizarBotao(H.trocar, { aceso: true }); renderMao(); atualizarBastidor()
  atualizarInfo('Toque em dois bonecos seus para trocar de lugar.'); aviso('Toque em dois bonecos seus para trocar de lugar.')
}
function tocarTroca(id, v) {
  const m = S.modoTroca
  if (v.bonecos[id].time !== P.EU) { aviso('Troque só bonecos do seu time.', 'recusa'); return }
  if (!m.a) {
    m.a = id
    const par = P.trocasPossiveis(S.estado).filter((c) => c.a === id || c.b === id).map((c) => (c.a === id ? c.b : c.a))
    if (!par.length) { m.a = null; aviso('Esse não tem com quem trocar.', 'recusa'); return }
    arena.marcar({ alvos: par, troca: id }); atualizarInfo(`Trocar ${v.bonecos[id].nome} com quem?`); return
  }
  if (id === m.a) { m.a = null; limparSelecao(); return }
  const cmd = P.trocasPossiveis(S.estado).find((c) => (c.a === m.a && c.b === id) || (c.b === m.a && c.a === id))
  if (!cmd) { aviso('Essa troca não vale.', 'recusa'); return }
  jogarCom(cmd)
}

async function passar() {
  if (!minhaVez()) return
  limparSelecao(false)
  const ok = await executar({ tipo: 'passar', time: P.EU }, 'voce')
  if (ok) await seguirTurnos()
}

/** Teclado (guia §9): Espaço passa, T troca, setas escolhem o alvo, Enter joga (1–7 escolhe a carta: a mão cuida). */
function teclaDaLuta(e) {
  if ($('#luta').hidden || !$('#fim').hidden || !$('#fichaModal').hidden || document.querySelector('.fz-lupa')) return
  if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName ?? '')) return
  if (e.key === ' ' && e.target?.tagName !== 'BUTTON') { e.preventDefault(); passar() }
  else if (e.key === 't' || e.key === 'T') { e.preventDefault(); iniciarTroca() }
  else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') && S.sel && minhaVez()) {
    e.preventDefault()
    const v = P.visao(S.estado), jog = P.jogadasDaCarta(S.estado, S.sel), { alvos, vant } = alvosDaSelecao(v, S.sel, jog)
    if (!alvos.length) return
    const i = alvos.indexOf(S.alvoFoco), passo = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
    S.alvoFoco = alvos[(i + passo + alvos.length) % alvos.length]
    arena.marcar({ alvos: [S.alvoFoco], usuario: v.cartas[S.sel].dono, vantagem: vant.filter((x) => x === S.alvoFoco) })
    atualizarInfo(`Alvo: ${v.bonecos[S.alvoFoco].nome}. Enter joga.`)
  } else if (e.key === 'Enter' && S.sel && minhaVez() && e.target?.tagName !== 'BUTTON') {
    e.preventDefault()
    const jog = P.jogadasDaCarta(S.estado, S.sel)
    const cmd = S.alvoFoco ? jog.find((j) => j.alvo === S.alvoFoco) : jog.length === 1 ? jog[0] : null
    if (cmd) jogarCom(cmd)
  }
}

// ------------------------------------------------------------------ desenho da interface
function renderTudo() {
  if (!S.estado) return
  const v = P.visao(S.estado)
  renderTopo(v); renderHud(v); renderMao(v); atualizarInfo(); atualizarBastidor(v); atualizarIntencao(v); renderMesa(v)
  atualizarBotao(H.passar, { desligado: !minhaVez() }); atualizarBotao(H.trocar, { desligado: !minhaVez(), aceso: !!S.modoTroca })
}

function renderTopo(v) {
  H.turno.textContent = String(v.turno)
  $('#tTurno').setAttribute('aria-label', `Turno ${v.turno} de ${P.REGRAS.turnoFinal}`)
  const ts = $('#tTesoura'), ini = P.REGRAS.tesouraInicio, corte = Math.round(P.REGRAS.tesouraCorte * 100), pc = $('#luta').dataset.formato === 'pc'
  let cls = '', txt, dica
  if (v.turno >= ini) { cls = 'alerta'; txt = pc ? `Tesoura cortando ${corte}%` : `−${corte}%`; dica = `A Tesoura corta ${corte}% da vida máxima de todos a cada turno` }
  else if (v.turno >= ini - 3) { cls = 'aviso'; txt = pc ? (v.turno === ini - 1 ? 'Tesoura no próximo turno' : `Tesoura no turno ${ini}`) : `${ini}!`; dica = `A Tesoura desce: começa a cortar ${corte}% no turno ${ini}` }
  else { txt = pc ? `Tesoura no turno ${ini}` : String(ini); dica = `A Tesoura começa a cortar ${corte}% no turno ${ini}` }
  ts.className = 'fz-luta__tesoura' + (cls ? ' ' + cls : ''); ts.title = dica; ts.setAttribute('aria-label', dica); H.tesoura.textContent = txt
  // a Tesoura desce um degrau (som) e a música acompanha: luta → Tesoura descendo (6–8) → cortando (9+); Último Fio abafa
  if (v.turno !== S.turnoMostrado) {
    if (S.turnoMostrado && v.turno > S.turnoMostrado && v.turno >= ini - 3 && v.turno < ini) Som.tocar('tesouraDesce')
    S.turnoMostrado = v.turno
  }
  if (!v.fim) {
    const fio = Object.values(v.bonecos).some((b) => b.estado === 'fio')
    musica(fio ? 'ultimoFio' : v.turno >= ini ? 'tesouraCortando' : v.turno >= ini - 3 ? 'tesouraDescendo' : 'luta')
  }
}

function renderHud(v) {
  const r = v.times[P.RIVAL], eu = v.times[P.EU]
  H.linhaRival.definir(r.linha); H.maoRival.definir(r.mao); H.baralhoRival.definir(r.baralho)
  H.linha.definir(eu.linha); H.baralho.definir(eu.baralho)
}

function dadosDaCartaNaMao(v, cid) {
  let d = dadosDe.get(cid)
  if (!d) { const inst = v.cartas[cid], dono = v.bonecos[inst.dono]; d = dadosDaCarta(inst.carta, { partes: dono.partes, nome: dono.nome }, cid); dadosDe.set(cid, d) }
  return d
}

function renderMao(v = P.visao(S.estado)) {
  const mao = v.times[P.EU].mao, vez = minhaVez()
  const rivais = v.times[P.RIVAL].lugares.filter((id) => v.bonecos[id].estado === 'vivo')
  const cartas = mao.map((cid) => {
    const inst = v.cartas[cid], dono = v.bonecos[inst.dono], dados = dadosDaCartaNaMao(v, cid)
    if (dono.estado === 'caido' || (vez && P.podeFiapo(S.estado, cid))) return { id: cid, dados, estado: { fiapo: true, fraseDoFiapo: FRASE_DO_FIAPO } }
    const jog = vez ? P.jogadasDaCarta(S.estado, cid) : []
    if (jog.length) {
      const vant = P.temDano(inst.carta) && rivais.some((id) => P.vantagem(P.CARTAS[inst.carta].tipo, v.bonecos[id].tipo))
      return { id: cid, dados, estado: { jogavel: true, semLinha: false, marca: vant ? BONUS : null } }
    }
    const motivo = vez ? P.motivoDaRecusa(S.estado, cid) : 'Espere a sua vez.'
    const semLinha = vez && P.recusaDe(S.estado, { tipo: 'jogar', time: P.EU, carta: cid, alvo: null })?.codigo === 'LINHA_INSUFICIENTE'
    return { id: cid, dados, estado: { jogavel: false, semLinha, marca: null }, motivo }
  })
  H.mao.definir(cartas)
  H.mao.selecionar(S.sel)
  H.mao.vezDoRival(!vez && !S.replay && !S.estado.fim && S.estado.vez === P.RIVAL)
}

function atualizarInfo(dica) {
  const box = $('#info')
  let txt = dica ?? ''
  if (!dica) {
    const v = P.visao(S.estado)
    if (S.sel) { const i = P.infoDaCarta(v.cartas[S.sel].carta); txt = `${i.nome}: ${i.texto} Toque no alvo aceso.` }
    else if (S.replay) txt = 'Assistindo ao replay.'
    else if (minhaVez()) txt = 'Sua vez: escolha uma carta. Toque num boneco para ver a ficha.'
    else if (!S.estado.fim) txt = 'O rival está jogando.'
  }
  if (box.textContent !== txt) box.textContent = txt
}

/** Bastidor: acende o tecido da carta escolhida (ou nada). Quem bate em quem vem da ponte (PARES). */
function atualizarBastidor(v = P.visao(S.estado)) {
  let tipo = null
  if (S.sel && P.temDano(v.cartas[S.sel].carta)) tipo = P.CARTAS[v.cartas[S.sel].carta].tipo
  if (H.tipoAceso !== tipo) { H.tipoAceso = tipo; H.bastidor.acender(tipo) }
}

/** A mesa (cartas jogadas neste turno, dos dois lados): fica à vista até o fim do turno (no celular, pequena, no alto à direita). */
function renderMesa(v) {
  const box = $('#mesa')
  const cids = [...(v.times.A.mesa ?? []), ...(v.times.B.mesa ?? [])].filter((cid) => v.cartas[cid]?.carta)
  const chave = cids.join(',') + '|' + $('#luta').dataset.formato
  if (box.dataset.chave === chave) return
  box.dataset.chave = chave; box.replaceChildren()
  if (!cids.length) return
  box.append(el('span', 'fz-mesa__titulo', 'Na mesa'))
  for (const cid of cids) {
    const i = P.infoDaCarta(v.cartas[cid].carta), c = el('span', 'fz-mesa__carta')
    c.style.setProperty('--fz-tecido', corDoTecido(i.tipo).base)
    c.title = `${v.bonecos[v.cartas[cid].dono]?.time === P.EU ? 'Você' : 'Rival'}: ${i.nome}`
    const nome = $('#luta').dataset.formato === 'pc' ? i.nome : abreviar(i.nome, 96, 13) // celular: nome limpo que cabe na plaquinha
    c.append(el('b', null, String(i.linha)), el('span', null, nome)); box.append(c)
  }
}

// ------------------------------------------------------------------ Aventura: o inimigo MOSTRA a próxima intenção
// Vem de P.intencaoDoRival: o plano do robô para o turno dele como se você passasse AGORA (o robô só lê o estado; crítico pela média).
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
  if (r === undefined) { r = P.intencaoDoRival(S.estado, S.robo); if (r !== undefined) cacheIntencao.set(S.estado, r) }
  if (r === undefined) { box.hidden = true; arena.setIntencao(null); S.intencao = null; return } // sem essa informação (luta antiga do servidor)
  const frases = frasesDaIntencao(r, v)
  S.intencao = frases
  const porDono = {}
  for (const f of frases) if (f.dono) (porDono[f.dono] ??= []).push(f.curto)
  arena.setIntencao(porDono)
  box.replaceChildren(); box.hidden = false
  box.append(el('b', null, 'O rival '))
  if (!frases.length) box.append('vai passar a vez.')
  else frases.slice(0, 2).forEach((f, i) => { if (i) box.append(' e '); box.append(f.longo); if (f.dono && f.carta && $('#luta').dataset.formato === 'pc') box.append(el('small', null, ` (${f.carta} de ${v.bonecos[f.dono].nome})`)) })
}

// ------------------------------------------------------------------ faixas, avisos e a carta jogada
function aviso(txt, tipo = 'aviso') {
  H.etiquetas.avisar(txt, { tipo })
  if (TESTE) window.__frayz.avisos.push(txt)
}
/** A faixa bordada atravessa a cena ("Sua vez" / "Vez do rival" / avisos curtos). */
async function faixaDeVez(texto, lado, ms = 700) {
  if (texto === 'Sua vez') Som.tocar('suaVez')
  const dur = Math.max(160, ms * S.vel * (menos() ? 0.7 : 1))
  await mostrarFaixa($('#arenaBox'), { texto, lado, duracao: dur })
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

/** Carta jogada: a sua voa da mão até o alvo; a do rival aparece grande no meio da cena por um instante. */
async function cartaJogada(ev, quem, estado, cmd) {
  const v = P.visao(estado)
  if (quem === 'voce' && cmd && H.mao.cartaEl(cmd.carta)) {
    const alvoId = cmd.alvo ?? estado.times[P.EU].lugares.find((id) => estado.bonecos[id].estado === 'vivo')
    const pos = alvoId && arena.centro(alvoId), cb = $('#arena').getBoundingClientRect()
    await H.mao.voar(cmd.carta, pos ? { x: cb.left + pos.x, y: cb.top + pos.y } : null)
    return
  }
  const dono = v.bonecos[ev.de]
  const dados = dadosDaCarta(ev.id, dono ? { partes: dono.partes, nome: dono.nome } : null, 'rival-' + ev.carta)
  const box = $('#bannerCarta'); box.replaceChildren()
  const pc = $('#luta').dataset.formato === 'pc'
  box.append(el('span', 'fz-carta-do-rival__quem', quem === 'rival' ? 'Rival jogou' : 'Jogou'), criarCarta(dados, { variante: pc ? 'mao' : 'mini', largura: pc ? 150 : 96, tag: 'div', nomeDoTipo: P.NOMES_DOS_TIPOS[dados.tipo] }))
  box.hidden = false
  if (!menos()) box.animate?.([{ opacity: 0, transform: 'translate(-50%, -40%) scale(0.7) rotate(-6deg)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }], { duration: 220, easing: 'cubic-bezier(.2,1.2,.4,1)' })
  await esperar(quem === 'rival' ? 900 : 560)
  box.hidden = true
}

// ------------------------------------------------------------------ relógio do turno: o fio que queima (no protótipo só avisa)
function iniciarRelogio() {
  pararRelogio()
  const seg = P.segundosDoTurno(S.estado) // no servidor: o que falta pelo prazo dele
  H.fio.iniciar(seg)
  S.tAlerta = setTimeout(() => { if (minhaVez()) Som.tocar('tempoAcabando') }, Math.max(0, seg - 5) * 1000)
}
/** O fio do tempo queimou. Local: só avisa. Servidor: a vez passa sozinha lá; a tela busca o que aconteceu e mostra. */
async function relogioAcabou() {
  Som.parar('tempoAcabando')
  if (!P.lutaDoServidor(S.estado)) { aviso('Tempo! No protótipo o relógio só avisa.', 'alerta'); return }
  if (!minhaVez()) return
  aviso('Tempo! A vez passa sozinha.', 'alerta')
  const estado = S.estado
  S.travado = true; renderTudo()
  for (let i = 0; i < 6; i++) {
    await new Promise((ok) => setTimeout(ok, 1000))
    if (S.estado !== estado || S.parar) return
    const r = await P.conferirRelogio(estado)
    if (S.estado !== estado || S.parar) return
    if (r) { if (await executar(r.cmd ?? { tipo: 'passar', time: P.EU }, 'voce', r)) await seguirTurnos(); return }
  }
  S.travado = false; renderTudo() // o servidor ainda não passou a vez: segue jogando
}
function pararRelogio() { H.fio?.parar(); clearTimeout(S.tAlerta); Som.parar('tempoAcabando') }

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
function fecharTudo() { fecharFicha(); $('#fim').hidden = true; $('#menu').hidden = true; H.bastidor?.fechar?.(); H.mao?.fecharAmpliada(); pararRelogio(); $('#bannerCarta').hidden = true }

// ------------------------------------------------------------------ fim da luta
async function fimDaLuta() {
  pararRelogio(); S.travado = true; renderTudo()
  const r = P.fim(S.estado)
  const ganhei = r.vencedor === P.EU
  const doServidor = S.replay ? null : await P.replayDaLuta(S.estado) // no servidor a semente só sai agora, depois do fim
  S.ultima = doServidor ?? { semente: S.semente, timeA: S.timeA, timeB: S.timeB, robo: S.robo, comandos: S.estado.comandos.map((c) => ({ ...c })) }
  let extra = ''
  if (!S.registrado && !S.replay) { // Aventura: cada luta gasta 1 Ponto de Costura nos 3 bonecos usados (o motor ou o servidor soma)
    S.registrado = true
    await Col.depoisDaLuta({ modo: S.modo, ids: S.idsA ?? [], venceu: ganhei, fase: S.fase, maiorGolpes: [0, 1, 2].map((i) => S.golpes[`A${i}`] ?? 0) })
    if (S.modo === 'aventura') extra = ganhei ? (S.fase >= FASES.length ? 'Aventura completa! O Baú da Costureira está aberto.' : `Fase ${S.fase + 1} liberada.`) : 'Perdeu: a fase continua liberada para tentar de novo.'
  } else if (S.modo === 'aventura') extra = ganhei ? 'Fase vencida.' : 'A fase continua liberada.'
  arena.comemorar(r.vencedor)
  await esperar(700)
  // derrota: um pico na entrada — o baque mole do pano caindo e, logo depois, o tema descendo (o som segue com "Menos animação")
  if (ganhei) Som.vitoria(); else { Som.tocar('queda'); setTimeout(() => Som.derrota(), 260) }
  montarFim(r, ganhei, extra)
  const fimEl = $('#fim'); fimEl.classList.remove('fz-fim--entrou'); void fimEl.offsetWidth; fimEl.classList.add('fz-fim--entrou') // a folha cai com um baque (só sem "Menos animação")
  try { S.textoReplay = P.exportarReplay(S.ultima) } catch { S.textoReplay = '' }
  $('#copiaMsg').textContent = ''
  $('#fim').hidden = false; H.fimBotoes.revanche.hidden || H.fimBotoes.proxima.hidden ? H.fimBotoes.revanche.focus() : H.fimBotoes.proxima.focus()
  if (!menos() && ganhei) for (let i = 0; i < 3; i++) arena.soltar(arena.W * (0.25 + 0.25 * i), arena.H * 0.4, 12)
}

/** A folha do fim: o boneco do golpe final em destaque, o título bordado, 3 números com ícone e os botões. Nada de texto cru do replay. */
function montarFim(r, ganhei, extra) {
  const fim = $('#fim'), v = P.visao(S.estado), pc = fim.dataset.formato === 'pc', av = S.modo === 'aventura'
  fim.classList.toggle('fz-fim--vitoria', ganhei); fim.classList.toggle('fz-fim--derrota', !ganhei); fim.dataset.res = ganhei ? 'v' : 'd'
  // o boneco do golpe final (do time que venceu)
  const idFinal = S.ultimoGolpe && v.bonecos[S.ultimoGolpe]?.time === r.vencedor ? S.ultimoGolpe : (ganhei && S.heroi) || v.times[r.vencedor].lugares.find((id) => v.bonecos[id].estado !== 'caido') || v.times[r.vencedor].lugares[0]
  const heroi = v.bonecos[idFinal]
  const palco = $('#fimHeroi'); palco.replaceChildren(el('span', 'fz-fim__luz'))
  palco.append(bonecoEm(heroi.partes, pc ? 230 : 120, ganhei ? 'vitoria' : 'vivo'))
  const leg = el('p', 'fz-fim__heroi'); leg.append(el('span', null, 'Golpe final: '), el('b', null, heroi.nome + (ganhei ? '' : ' (rival)'))); palco.append(leg)
  palco.hidden = false
  // título bordado letra a letra (a derrota desfia)
  const titulo = $('#fimTitulo'), texto = ganhei ? 'Vitória!' : 'Derrota'
  titulo.replaceChildren(); titulo.setAttribute('aria-label', texto)
  ;[...texto].forEach((ch, i) => { const s = el('span', 'fz-fim__letra', ch); s.dataset.l = ch; s.style.setProperty('--i', String(i)); s.setAttribute('aria-hidden', 'true'); titulo.append(s) })
  if (!ganhei) titulo.append(svg('svg', { class: 'fz-fim__fios', viewBox: '0 0 200 40', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' }, [svg('path', { d: 'M22 0 q-6 14 2 26 M61 0 q5 10 -3 20 M97 0 q-4 16 4 34 M128 0 q6 8 0 16 M163 0 q-7 12 3 30 M186 0 q3 9 -2 14' })]))
  $('#fimMotivo').textContent = (av ? `Fase ${S.fase}: ${FASES[S.fase - 1].nome}. ` : '') + (MOTIVO_FIM[r.motivo] ?? '')
  H.fimExtra.textContent = extra
  // 3 números com ícone + a vida que sobrou
  const ul = $('#fimResumo'); ul.replaceChildren()
  const m = S.stats.maior
  for (const [ic, valor, nome, dica] of [
    [ICONES.tesoura(), r.turno, 'Turnos', `A luta durou ${r.turno} turnos`],
    [ICONES.agulha(), m ? m.valor : '—', 'Maior golpe', m ? `${m.carta ?? 'Golpe'}${m.critico ? ' (crítico)' : ''}${m.time ? (m.time === P.EU ? ', seu' : ', do rival') : ''}` : 'Maior golpe da luta'],
    [ICONES.viradas(), S.stats.viradas, 'Viradas', 'Quantas vezes a frente mudou de lado'],
  ]) { const li = el('li', 'fz-fim__numero'); li.title = dica; li.append(pesponto({ recuo: 4, raio: 40 }), ic, el('b', null, String(valor)), el('span', null, nome)); ul.append(li) }
  const vida = el('li', 'fz-fim__vida'); vida.append('Vida que sobrou: você ', el('b', null, `${Math.round((r.pct.A * 100) / 3)}%`), ' · rival ', el('b', null, `${Math.round((r.pct.B * 100) / 3)}%`)); ul.append(vida)
  // botões
  const B = H.fimBotoes
  B.proxima.hidden = !(av && ganhei && S.fase < FASES.length); atualizarBotao(B.proxima, { rotulo: `Fase ${(S.fase ?? 0) + 1}` })
  atualizarBotao(B.trocarTime, { rotulo: av ? 'Voltar ao mapa' : 'Trocar time' })
  B.revanche.classList.toggle('fz-botao--principal', B.proxima.hidden); B.revanche.classList.toggle('fz-botao--secundario', !B.proxima.hidden)
  // festa: varal de retalhos dos 6 tecidos
  fim.querySelector('.fz-fim__varal')?.remove()
  if (ganhei) {
    const varal = el('div', 'fz-fim__varal'); varal.setAttribute('aria-hidden', 'true')
    for (let i = 0; i < (pc ? 13 : 7); i++) { const b = el('i'); b.style.setProperty('--giro', ((i * 37) % 9) - 4 + 'deg'); varal.append(b) }
    arte.pronta.then(() => [...varal.children].forEach((b, i) => { b.style.backgroundImage = `url(${urlDoTecido(P.TIPOS[i % P.TIPOS.length], Math.round(48 * Math.min(2, window.devicePixelRatio || 1)))})` }))
    fim.querySelector('.fz-fim__folha').append(varal)
  }
}

async function copiarReplay() {
  const txt = S.textoReplay, msg = $('#copiaMsg')
  try { await navigator.clipboard.writeText(txt); msg.textContent = 'Replay copiado.' }
  catch { // reserva: uma caixa invisível só pelo instante da cópia (o texto cru nunca aparece na tela)
    const ta = el('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); Object.assign(ta.style, { position: 'fixed', left: '-9999px', top: '0', opacity: '0' })
    document.body.append(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy') } catch { /* ok */ } ta.remove()
    msg.textContent = ok ? 'Replay copiado.' : 'Não deu para copiar aqui.'
  }
}

// ------------------------------------------------------------------ replay (refaz a luta pelos comandos)
async function assistir() {
  const r = S.ultima
  S.timeA = r.timeA; S.timeB = r.timeB; S.semente = r.semente; S.robo = r.robo ?? S.robo
  S.replay = true; S.parar = false
  await abrirLuta(P.novaLuta({ semente: r.semente, timeA: r.timeA, timeB: r.timeB }))
  S.registrado = true // rever não gasta remendo
  S.vezAnterior = null
  await faixaDeVez('Replay', 'aviso', 600)
  for (const c of r.comandos) {
    if (S.parar) break
    if (S.vezAnterior !== S.estado.vez) { S.vezAnterior = S.estado.vez; await faixaDeVez(S.estado.vez === P.EU ? 'Vez de quem lutou' : 'Vez do rival', S.estado.vez === P.EU ? 'eu' : 'rival') }
    const ok = await executar({ ...c, time: S.estado.vez }, c.time === P.EU ? 'voce' : 'rival')
    if (!ok) { aviso('O replay parou: o motor recusou um comando.', 'recusa'); break }
    await esperar(200)
  }
  if (S.parar) { S.replay = false; sairParaInicio(); return }
  S.replay = false; document.body.classList.remove('replay')
  if (S.estado.fim) await fimDaLuta()
}

/** Desistir (luta do servidor): o rival vence e a folha do fim aparece. */
async function desistirDaLuta() {
  $('#menu').hidden = true
  if (!minhaVez()) { aviso('Espere a sua vez para desistir.', 'recusa'); return }
  S.travado = true; pararRelogio()
  const r = await P.desistir(S.estado)
  if (!r || !r.ok) { S.travado = false; aviso(r?.motivo ?? 'Não deu para desistir agora.', 'recusa'); renderTudo(); return }
  S.estado = r.estado
  arena.sync(P.visao(S.estado))
  await fimDaLuta()
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

async function ligar() {
  await P.iniciar() // escolhe o modo: servidor do Frayz respondendo, ou local (arquivo parado, ?modo=local)
  document.body.dataset.modo = P.modo()
  if (P.modo() === 'local') { if (TESTE && url.get('recomecar') === '1') Col.recomecar(); else await Col.carregar() }
  montarPecasDaLuta()
  const logo = criarLogotipo({ altura: formatoDoHub() === 'pc' ? 46 : 38 }); $('#logo').replaceChildren(logo.el) // logotipo de retalhos (o fio do z para com "Menos animação")
  arena = new Arena($('#arena'), $('#arenaCamada'))
  aplicarMenos(lerMenos(), false)
  aplicarMudo()
  for (const id of ['#btnMudo', '#btnMudo2']) $(id).addEventListener('click', () => { Som.mudo(!Som.estaMudo()); aplicarMudo() })
  for (const b of document.querySelectorAll('.aba')) b.addEventListener('click', () => { Som.tocar('botao'); irParaAba(b.dataset.aba) })
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
  H.passar.addEventListener('click', () => { Som.tocar('botao'); passar() })
  H.trocar.addEventListener('click', () => { Som.tocar('botao'); iniciarTroca() })
  $('#btnMenu').addEventListener('click', () => { const m = $('#menu'); m.hidden = !m.hidden; Som.tocar('botao') })
  $('#btnSair').addEventListener('click', sairParaInicio)
  $('#btnDesistir').addEventListener('click', desistirDaLuta)
  $('#btnParar').addEventListener('click', () => { S.parar = true; sairParaInicio() })
  const B = H.fimBotoes
  B.revanche.addEventListener('click', () => { Som.tocar('botao'); $('#fim').hidden = true; iniciarLuta({ timeA: S.timeA, timeB: S.timeB, semente: P.novaSemente(), modo: S.modo, fase: S.fase, idsA: S.idsA ?? undefined, robo: S.robo }) })
  B.proxima.addEventListener('click', () => { Som.tocar('botao'); $('#fim').hidden = true; iniciarLuta({ modo: 'aventura', fase: S.fase + 1, idsA: S.idsA }) })
  B.trocarTime.addEventListener('click', () => { Som.tocar('botao'); $('#fim').hidden = true; sairParaInicio() })
  B.rever.addEventListener('click', () => { Som.tocar('botao'); $('#fim').hidden = true; assistir() })
  B.copiar.addEventListener('click', () => { Som.tocar('botao'); copiarReplay() })
  $('#fichaFechar').addEventListener('click', fecharFicha)
  $('#fichaModal').addEventListener('click', (e) => { if (e.target.id === 'fichaModal') fecharFicha() })
  const cvA = $('#arena')
  cvA.addEventListener('pointerdown', (e) => {
    const r = cvA.getBoundingClientRect()
    if (!S.estado) return
    aoTocarBoneco(arena.idEm(e.clientX - r.left, e.clientY - r.top))
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (document.querySelector('.fz-lupa')) return // a mão fecha a carta ampliada
    if (!$('#casulo').hidden) fecharCasulo()
    else if (!$('#bonecoModal').hidden) fecharBoneco()
    else if (!$('#fichaModal').hidden) fecharFicha()
    else if (!$('#menu').hidden) $('#menu').hidden = true
    else if (S.sel || S.modoTroca) limparSelecao()
  })
  document.addEventListener('keydown', teclaDaLuta)
  document.addEventListener('pointerdown', (e) => {
    if (!$('#menu').hidden && !e.target.closest('#menu, #btnMenu')) $('#menu').hidden = true
  })
  window.addEventListener('resize', () => {
    if (!$('#luta').hidden) { aplicarFormato(); renderTudo() }
    else if (!$('#hub').hidden && $('#hub').dataset.formato !== formatoDoHub()) irParaAba(S.aba) // PC ⇄ celular: a prateleira e a ficha mudam de tamanho
  })
  montarInicio()
  ligarConta()
  let aba = url.get('aba')
  if (!ABAS.includes(aba)) { try { aba = TESTE ? 'inicio' : localStorage.getItem('frayz_aba') } catch { aba = null } }
  S.aba = ABAS.includes(aba) ? aba : 'aventura'
  if (TESTE) ganchoDeTeste()
  await entrarNoJogo()
}

// ------------------------------------------------------------------ conta (modo servidor): entrada com apelido, sair, sessão vencida
function mostrarEntrada(msg = '', { tentar = false } = {}) {
  S.parar = true; fecharTudo()
  $('#hub').hidden = true; $('#luta').hidden = true; $('#entrada').hidden = false
  document.body.dataset.tela = 'entrada'
  $('#entMsg').textContent = msg
  for (const s of ['#entApelido', '#entRotulo', '#btnEntrar', '#entForm .hub-dica']) $(s).hidden = tentar
  $('#entForm .hub-titulo').textContent = tentar ? 'O ateliê não abriu agora' : 'Entrar no ateliê'
  $('#btnTentar').hidden = !tentar
  atualizarBotao($('#btnEntrar'), { desligado: false })
  requestAnimationFrame(() => (tentar ? $('#btnTentar') : $('#entApelido')).focus())
}

/** Carrega a coleção (servidor: estado + páginas) e abre o hub; luta aberta no servidor volta para a tela. */
async function entrarNoJogo() {
  if (P.modo() === 'servidor') {
    if (!P.conta.temSessao()) { mostrarEntrada(); return }
    try { await Col.carregar() } catch (e) {
      if (!P.conta.temSessao()) mostrarEntrada(e.motivo ?? '') // sessão vencida: o apelido de novo
      else mostrarEntrada(e.motivo ?? 'Não deu para falar com o servidor.', { tentar: true })
      return
    }
  }
  $('#entrada').hidden = true
  const ap = P.conta.apelido()
  $('#colConta').hidden = !ap
  if (ap) $('#colApelido').textContent = ap
  S.escolha = S.escolha.filter((id) => Col.obter(id))
  mostrar(S.aba)
  if (P.modo() === 'servidor' && P.servidor.lutaAberta()) await retomar()
}

function ligarConta() {
  const entrar = criarBotao({ rotulo: 'Entrar', variante: 'principal' }); entrar.id = 'btnEntrar'; entrar.type = 'submit'; $('#btnEntrar').replaceWith(entrar)
  const tentar = criarBotao({ rotulo: 'Tentar de novo', variante: 'principal' }); tentar.id = 'btnTentar'; tentar.type = 'button'; tentar.hidden = true; $('#btnTentar').replaceWith(tentar)
  const logo = criarLogotipo({ altura: 56 }); $('#entLogo').replaceChildren(logo.el)
  $('#entForm').addEventListener('submit', async (ev) => {
    ev.preventDefault()
    const b = $('#btnEntrar'), apelido = $('#entApelido').value.trim()
    if (b.disabled) return
    if (apelido.length < 3) { $('#entMsg').textContent = 'O apelido precisa de pelo menos 3 letras.'; return }
    atualizarBotao(b, { desligado: true }); $('#entMsg').textContent = 'Entrando…'
    const r = await P.conta.entrar(apelido)
    atualizarBotao(b, { desligado: false })
    if (!r.ok) { $('#entMsg').textContent = r.motivo; $('#entApelido').focus(); return }
    $('#entMsg').textContent = ''
    Som.tocar('botao')
    await entrarNoJogo()
  })
  $('#btnTentar').addEventListener('click', () => { $('#entMsg').textContent = 'Tentando…'; entrarNoJogo() })
  $('#btnSairConta').addEventListener('click', async () => {
    Som.tocar('botao')
    await P.conta.sair()
    Col.esquecer(); S.escolha = []
    mostrarEntrada('Você saiu. Até a próxima!')
  })
  P.conta.aoPerderSessao((e) => { Col.esquecer(); S.escolha = []; mostrarEntrada(e.motivo) })
  P.aoAviso((txt, tipo) => { if (!$('#luta').hidden) aviso(txt, tipo === 'alerta' ? 'alerta' : 'aviso'); else avisoHub(txt, tipo === 'alerta') })
}

// Gancho só para o teste automático (?teste=1): lê o estado e escolhe a próxima jogada; os cliques são de verdade.
function ganchoDeTeste() {
  S.vel = Number(url.get('vel') || 0.12); arena.vel = S.vel
  const q = (n) => n
  let n = 0
  Col.definirFonteDeSemente(() => `${url.get('semente') ?? 'costura'}-${++n}`)
  window.__frayz = {
    avisos: [], S, arena, q, P, Col, Som, Musica, irParaAba, intencao: () => S.intencao, modo: () => P.modo(),
    /** só para o teste: manda um comando como se fosse da tela (usado para passar o turno dos dois lados) */
    passarOsDois: async () => { while (!S.estado.fim) { await executar({ tipo: 'passar', time: S.estado.vez }, S.estado.vez === P.EU ? 'voce' : 'rival'); if (S.estado.fim) break; S.vezAnterior = S.estado.vez } await fimDaLuta() },
    estado: () => S.estado,
    livre: () => minhaVez(),
    acabou: () => !!S.estado?.fim,
    criticos: () => arena.eventosVistos.critico,
    sugestao: () => P.planoDoRobo(S.estado, 'planejador')[0] ?? null,
    pagina: (id) => { const r = arena.retangulos()[id], b = $('#arena').getBoundingClientRect(); return r ? { x: b.left + r.x + r.w / 2, y: b.top + r.y + r.h * 0.45 } : null },
    leque: (v) => { S.vel = v; arena.vel = v },
    /** o texto do replay (a tela não mostra o texto cru; o teste confere o que o botão Copiar copia) */
    textoDoReplay: () => S.textoReplay,
  }
}

ligar()
