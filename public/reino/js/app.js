// Keepmile — o jogo na tela, modo LOCAL (o motor roda no navegador). A tela não tem regra: lê `visao`/`opcoes` e só manda
// comandos de `opcoes(estado).comandos`. A lista de comandos refaz a partida inteira (`reproduzir`).
import * as CONFIG from '../../../shared/reino/config.js'
import { aplicar, criarPartida, opcoes, reproduzir, resultado, visao } from '../../../shared/reino/partida.js'
import { expandirHorda, montarExercito } from '../../../shared/reino/batalha.js'
import { Musica, Som } from '../som-reino.js'
import * as Arte from './arte.js'
import { criarBatalha } from './batalha-tela.js'
import { criarCena } from './cena.js'
import { baixarCartao, cartaoDoReino } from './fim.js'
import { Guarda } from './guarda.js'
import { criarInterface } from './interface.js'
import { criarTelas } from './telas.js'
import { CHEFE_CONQUISTA, CONQUISTAS, T } from './textos.js'

const Q = new URLSearchParams(location.search)
const TESTE = Q.get('teste') === '1'
const canvas = document.getElementById('cena'), camada = document.getElementById('toques')
const C = criarCena(canvas, CONFIG)
const J = { familias: [], e: null, v: null, op: null, comandos: [], semente: null, liberadas: [], ouroAlvo: 0, pos: null, ultimaLuta: null, lutas: [], espolioI: -1, semSorteio: true, anunciado: '', avisado: '', erros: [] }
let UI, M, Bat, Telas
const timers = new Set()
const depois = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }
const semTimers = () => { for (const id of timers) clearTimeout(id); timers.clear() }
const agoraMs = () => performance.now()

// ---------------------------------------------------------------- motor
function ler() { J.v = visao(J.e); J.op = opcoes(J.e) }
/** Manda um comando ao motor. Só aceita o que está em `opcoes(estado).comandos`. Devolve os eventos ou null. */
function mandar(cmd) {
  const valido = J.op.comandos.some((c) => c.tipo === cmd.tipo && (c.carta ?? null) === (cmd.carta ?? null) && (c.terreno ?? null) === (cmd.terreno ?? null) && (c.indice ?? null) === (cmd.indice ?? null))
  const r = valido ? aplicar(J.e, cmd) : { ok: false }
  if (!r.ok) { Som.tocar('negado'); return null }
  J.e = r.estado; J.comandos.push(cmd); ler()
  return r.eventos
}
function sementeNova() { const a = new Uint32Array(2); crypto.getRandomValues(a); return 'k' + a[0].toString(36) + a[1].toString(36) }

// ---------------------------------------------------------------- festas pequenas
function conquista(id) {
  if (!Guarda.conquista(id)) return
  const c = CONQUISTAS.find((x) => x.id === id)
  M.brinde = { t0: agoraMs(), ms: 2600, titulo: T.conquista, texto: c.nome }
  Som.tocar('conquista'); C.efeito('confetti', C.VW / 2 + C.cam.x, 60)
}
function conferirReino() {
  const t = J.v.terrenos
  if (t.every(Boolean)) { conquista('house'); if (new Set(t.map((x) => CONFIG.CARTAS[x.carta].familia)).size === 1) conquista('family') }
  if (t.some((x) => x && x.nivel >= CONFIG.PARTIDA.nivelMax)) conquista('brass')
}
function festaNivel(k, nivel) {
  const p = C.centroDoTerreno(k), max = nivel >= CONFIG.PARTIDA.nivelMax
  C.pulo[k] = C.relogio + 300
  C.efeito('level-ring', p.x + C.cam.x, p.y); C.efeito('confetti', p.x + C.cam.x, p.base - 12); C.efeito('level-stars', p.x + C.cam.x, p.base - 20)
  M.selo = { terreno: k, t0: agoraMs(), ate: agoraMs() + 1300 }
  Som.tocar(max ? 'nivelGrande' : 'nivelPequeno')
  if (max) { C.flash('#FFD248', 200); M.aviso = { texto: 'MAX LEVEL!', ouro: true, t0: agoraMs(), ms: 1400 } }
}
function festaPosta(k) { const p = C.centroDoTerreno(k); C.efeito('dust', p.x + C.cam.x - 8, p.y + 4); C.efeito('dust', p.x + C.cam.x + 8, p.y + 6, true); Som.tocar('cartaPoe') }
function eventosDeTerreno(evs) {
  for (const ev of evs) {
    if (ev.tipo === 'posta') festaPosta(ev.terreno)
    if (ev.tipo === 'nivel') festaNivel(ev.terreno, ev.nivel)
    if (ev.tipo === 'reliquia') { const r = CONFIG.RELIQUIAS[ev.reliquia]; M.aviso = { texto: r.nome, sub: r.texto, ouro: true, t0: agoraMs(), ms: 2400 }; Som.tocar('nivelPequeno') }
  }
}

// ---------------------------------------------------------------- o reino parado (fase de carta)
/** Castelo: inteiro (3), rachado (2) ou muito rachado (1), pelas vidas perdidas. */
function estadoCastelo() { const perdidas = J.v.vidasMax - J.v.vidas; return perdidas <= 0 ? 3 : perdidas === 1 ? 2 : 1 }
function montarReino(comHorda = true) {
  const v = J.v
  C.terrenos = v.terrenos.map((t) => (t ? { ...t } : null)); C.vidas = estadoCastelo(); C.magiaAnim = {}
  C.limparBonecos(); C.tb = 0; C.noite = 0; C.cam.alvo = 0
  const ex = montarExercito(v.terrenos, v.reliquias)
  for (const s of ex.soldados) for (let j = 0; j < s.qtd; j++) { const f = C.formacao(j, s.qtd); C.nascer(0, s.carta, s.terreno * 100 - 50, s.vida, f.lane, f.dxe) }
  M.hordaN = 0; M.hordaChefe = null
  if (comHorda && v.horda) {
    M.hordaN = expandirHorda(v.horda).length; M.hordaChefe = v.horda.chefe
    const tipos = [...new Set(v.horda.ordem)], cabem = C.tipo === 'celular' ? 4 : 8, fila = [...tipos]
    for (const t of v.horda.ordem) { if (fila.length >= Math.min(cabem, v.horda.ordem.length)) break; if (t !== v.horda.chefe) fila.push(t) }
    fila.slice(0, cabem).forEach((t, i, a) => { const chefe = t === v.horda.chefe; C.nascer(1, t, chefe ? -30 : -6 - (i * (C.VW < 500 && C.tipo === 'pc' ? 22 : 46)) / Math.max(1, a.length) - (i % 2) * 4, 1, chefe ? 0.3 : ((i * 5) % 7) / 3.5 - 0.9, 0) })
  }
}
function nivelNaMao(carta) { let n = 0; for (const t of J.v.terrenos) if (t && t.carta === carta && t.nivel < CONFIG.PARTIDA.nivelMax) n = Math.max(n, t.nivel); return n }
function preencher() {
  const v = J.v, op = J.op
  M.vidas = v.vidas; M.vidasMax = v.vidasMax; M.rodada = v.rodada; M.proximoChefe = v.proximoChefe; M.cartaPosta = v.cartaPosta
  M.mao = v.oferta.map((o) => { const n = nivelNaMao(o.carta); return { carta: o.carta, nivel: n ? n + 1 : 1, sobe: n > 0 } })
  M.sortear = op.sortear; M.consertar = { ...op.consertar, visivel: v.vidas < v.vidasMax && v.fase === 'carta' }
  M.espolios = v.espolios; M.espolioPode = v.espolios.map((_, i) => op.comandos.some((c) => c.tipo === 'espolio' && c.indice === i))
  M.mudo = Som.mudo(); M.vel = Bat.vel
  // famílias à vista: quantos terrenos de cada uma e quantos ligam o bônus (números do config)
  const cont = {}; for (const t of v.terrenos) if (t) { const f = CONFIG.CARTAS[t.carta].familia; cont[f] = (cont[f] || 0) + 1 }
  M.familias = Object.keys(cont).map((id) => ({ id, n: cont[id], precisa: v.reliquias.includes('banner') ? CONFIG.RELIQUIAS.banner.terrenos : CONFIG.FAMILIAS[id].terrenos, ligada: v.familias.includes(id) }))
  for (const id of v.familias) if (!J.familias.includes(id)) { const f = CONFIG.FAMILIAS[id]; M.aviso = { texto: f.nome + ' BONUS', sub: f.texto, ouro: true, t0: agoraMs() + 500, ms: 2600, k: C.tipo === 'celular' ? 1 : 2 }; depois(500, () => Som.tocar('nivelPequeno')) }
  J.familias = v.familias.slice()
}
function abrirRodada() {
  ler(); preencher()
  const v = J.v
  M.fase = 'carta'; M.sel = -1; M.armado = null; M.trocar = 0; M.info = null; M.vitoria = null; M.derrota = null; M.maoT0 = agoraMs() + 150; M.pulsaLutar = v.cartaPosta
  M.primeira = v.rodada === 1 && v.terrenos.every((t) => !t); C.destaque = null; J.ouroAlvo = v.ouro
  canvas.style.filter = ''
  C.mudarHora(Arte.horaDaRodada(v.rodada)); Musica.rodada(v.rodada)
  montarReino(); Som.tocar('cartaAparece')
  const chave = v.rodada + ':' + v.vidas
  if (v.horda.chefe && J.anunciado !== chave) {
    J.anunciado = chave; M.fase = 'chefe'; M.chefe = { id: v.horda.chefe, t0: agoraMs() }
    Som.tocar('chefeAnuncia'); Musica.momento('chefe')
    depois(3200, () => { if (M.fase === 'chefe') seguir() })
  } else {
    Musica.momento(v.horda.chefe ? 'chefe' : v.vidas === 1 ? 'porUmFio' : 'construir')
    if (v.proximoChefe.avisado && !v.horda.chefe && J.avisado !== chave) { J.avisado = chave; const c = CONFIG.CHEFES.find((x) => x.id === v.proximoChefe.chefe); M.aviso = { texto: T.emRodadas(v.proximoChefe.rodada - v.rodada), sub: `${c.nome}: ${c.texto}`, t0: agoraMs() + 300, ms: 3200, k: 1 } }
  }
  UI.mudou()
}
function novaPartida() {
  semTimers(); Bat.parar()
  J.semente = Q.get('semente') || sementeNova(); J.liberadas = Guarda.liberadas(CONFIG.ALBUM)
  J.e = criarPartida({ semente: J.semente, cartasLiberadas: J.liberadas }); J.comandos = []; J.lutas = []; J.semSorteio = true; J.anunciado = ''; J.avisado = ''; J.ultimaLuta = null; J.familias = []
  M.fim = null; M.aviso = null; M.brinde = null; M.selo = null
  C.fimDeJogo = false
  ler(); M.ouro = J.v.ouro
  abrirRodada()
}

// ---------------------------------------------------------------- escolher e pôr a carta
function destacar(carta, comandos) {
  const alvo = new Set(comandos.map((c) => c.terreno)), sobe = new Set()
  J.v.terrenos.forEach((t, i) => { if (t && alvo.has(i + 1) && (carta ? t.carta === carta : true) && t.nivel < CONFIG.PARTIDA.nivelMax) sobe.add(i + 1) })
  C.destaque = { terrenos: alvo, sobe, vizinhos: new Set(), forte: M.primeira ? 1 : 0 }
}
function vizinhosDe(k) { const al = J.v.reliquias.includes('blueprints') ? CONFIG.RELIQUIAS.blueprints.alcance : 1, s = new Set(); for (let d = 1; d <= al; d++) for (const j of [k - d, k + d]) if (j >= 1 && j <= 6) s.add(j); return s }
function selecionar(i) {
  if (M.fase !== 'carta' || M.cartaPosta) return
  M.trocar = 0; M.armado = null; M.info = null
  if (i < 0 || M.sel === i) { M.sel = -1; C.destaque = null; Som.tocar('toque'); return }
  M.sel = i
  const carta = M.mao[i].carta
  destacar(carta, J.op.comandos.filter((c) => c.tipo === 'por' && c.carta === carta))
  Som.tocar('cartaEscolhe'); if (M.mao[i].sobe) depois(180, () => Som.tocar('faltaUm'))
}
function por(k) {
  const carta = M.mao[M.sel]?.carta; if (!carta) return
  const atual = J.v.terrenos[k - 1]
  if (atual && atual.carta !== carta && M.trocar !== k) { M.trocar = k; Som.tocar('toque'); depois(3000, () => { if (M.trocar === k) M.trocar = 0 }); return } // trocar pede confirmação: tocar de novo
  const evs = mandar({ tipo: 'por', carta, terreno: k }); if (!evs) return
  preencher(); M.sel = -1; M.trocar = 0; M.primeira = false; M.pulsaLutar = true
  montarReino(); eventosDeTerreno(evs)
  C.destaque = CONFIG.CARTAS[carta].tipo === 'construcao' ? { vizinhos: vizinhosDe(k) } : null
  if (C.destaque) depois(1600, () => { if (M.fase === 'carta' && M.cartaPosta) C.destaque = null })
  conferirReino(); UI.mudou()
}
function armar(qual, fazer) {
  if (M.armado === qual) { M.armado = null; fazer(); return }
  M.armado = qual; Som.tocar('toque'); depois(3000, () => { if (M.armado === qual) M.armado = null })
}
function sortear() {
  const evs = mandar({ tipo: 'sortear' }); if (!evs) return
  J.semSorteio = false; preencher(); M.sel = -1; C.destaque = null; M.maoT0 = agoraMs(); J.ouroAlvo = J.v.ouro
  Som.tocar('sortear'); UI.mudou()
}
function consertar() {
  const evs = mandar({ tipo: 'consertar' }); if (!evs) return
  preencher(); J.ouroAlvo = J.v.ouro; C.vidas = estadoCastelo()
  Som.tocar('consertar'); const c = C.geo.castelo; C.efeito('heal', C.ox + c[0], C.oy + c[1]); C.efeito('level-ring', C.ox + c[0], C.oy + c[1])
  if (J.v.vidas > 1 && !J.v.horda.chefe) Musica.momento('construir')
  UI.mudou()
}

// ---------------------------------------------------------------- batalha e depois
function lutar(rapido = false) {
  if (M.fase !== 'carta') return
  const pre = { terrenos: J.v.terrenos, reliquias: J.v.reliquias, rodada: J.v.rodada }
  const evs = mandar({ tipo: 'batalhar' }); if (!evs) return
  const bat = evs.find((x) => x.tipo === 'batalha')
  J.pos = { bat, ouro: evs.find((x) => x.tipo === 'ouro').valor, fim: evs.find((x) => x.tipo === 'fim') || null, pre }
  J.ultimaLuta = { motor: bat.vitoria, tela: null, rodada: pre.rodada, segundos: bat.segundos }
  M.fase = 'luta'; M.sel = -1; M.armado = null; M.trocar = 0; M.info = null; M.aviso = null; C.destaque = null
  canvas.style.filter = C.menos ? '' : 'saturate(1.1)'
  Musica.momento(bat.horda.chefe ? 'chefe' : 'batalha'); if (!rapido) Som.tocar('invasorChega')
  Bat.iniciar({ eventos: bat.eventos, horda: bat.horda, terrenos: pre.terrenos, exercito: montarExercito(pre.terrenos, pre.reliquias) }, aoFimDaLuta)
  if (rapido) Bat.pular()
  UI.mudou()
}
function aoFimDaLuta(res) {
  const { bat, ouro, fim, pre } = J.pos
  J.ultimaLuta.tela = res.vitoria; J.lutas.push({ ...J.ultimaLuta })
  if (res.vitoria !== bat.vitoria) J.erros.push(`rodada ${pre.rodada}: a tela mostrou ${res.vitoria} e o motor decidiu ${bat.vitoria}`)
  canvas.style.filter = ''; C.noite = 0
  if (bat.vitoria) {
    const limpo = res.quedasDeSoldado === 0, um = res.aliados === 1
    M.fase = 'vitoria'; M.vitoria = { t0: agoraMs(), ouro, ouroMostra: 0, pronto: false, chefe: bat.horda.chefe, selo: limpo ? T.limpo : um ? T.ultimo : null }
    preencher(); M.vidas = J.v.vidas
    Som.tocar('vitoria'); Musica.momento('vitoria'); C.flash('#FFD9A0', 300)
    for (const dx of [-0.3, 0, 0.3]) C.efeito('confetti', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.3)
    // ouro contando, depois os 3 espólios viram cartas grandes
    const passos = Math.min(ouro, 12)
    for (let i = 1; i <= passos; i++) depois(350 + i * 70, () => { M.vitoria.ouroMostra = Math.round((ouro * i) / passos); Som.tocar('ouro', { tom: i }) })
    depois(450 + passos * 70 + 250, () => { M.vitoria.pronto = true; M.vitoria.prontoT0 = agoraMs(); J.ouroAlvo = J.v.ouro; Som.tocar('espolio'); UI.mudou() })
    conquista('supper'); if (limpo) conquista('plate'); if (um) conquista('last')
    if (bat.horda.chefe && CHEFE_CONQUISTA[bat.horda.chefe]) conquista(CHEFE_CONQUISTA[bat.horda.chefe])
    if (pre.rodada === 10 && J.semSorteio) conquista('penny')
    const nova = Guarda.rodadaVencida(CONFIG.ALBUM)
    if (nova) depois(1500, () => { M.brinde = { t0: agoraMs(), ms: 2800, titulo: T.cartaNova, texto: CONFIG.CARTAS[nova].nome, carta: nova }; Som.tocar('cartaNova'); if (Guarda.quantas(CONFIG.ALBUM) >= CONFIG.ALBUM.ordem.length) conquista('librarian') })
  } else {
    const nome = res.quem ? (CONFIG.INVASORES[res.quem] || CONFIG.CHEFES.find((c) => c.id === res.quem))?.nome : null
    M.fase = 'derrota'; M.derrota = { t0: agoraMs(), linha: nome ? (res.tocouCastelo ? T.chegou(nome) : T.varreu(nome)) : T.derrota }
    M.vidas = J.v.vidas; M.vidaSome = { i: J.v.vidas, ate: agoraMs() + 1200 }
    C.vidas = estadoCastelo(); C.casteloTreme = C.relogio + 600; C.tremer(6, 120)
    Som.tocar('casteloRacha'); depois(500, () => Som.tocar('vidaPerdida')); depois(900, () => Som.tocar('derrota'))
    Musica.momento('derrota'); if (!C.menos) canvas.style.filter = 'saturate(0.6)'
    J.ouroAlvo = J.v.ouro
    { const c = C.geo.castelo; C.estouro(C.ox + c[0], C.oy + c[1] - 40, 10, 8, 60) }
    depois(3000, () => { if (M.fase === 'derrota') seguir() })
  }
  UI.mudou()
}
function seguir() {
  if (M.fase === 'chefe') { M.fase = 'carta'; M.chefe = null; M.maoT0 = agoraMs(); UI.mudou(); return }
  if (M.fase === 'derrota') { if (J.e.fase === 'fim') fimDaPartida(); else abrirRodada() }
}
function escolherEspolio(i) {
  const cmds = J.op.comandos.filter((c) => c.tipo === 'espolio' && c.indice === i)
  if (!cmds.length) { Som.tocar('negado'); return }
  if (cmds[0].terreno == null) { pegarEspolio({ tipo: 'espolio', indice: i }); return }
  J.espolioI = i; M.fase = 'terreno'
  destacar(M.espolios[i].tipo === 'carta' ? M.espolios[i].carta : null, cmds)
  if (M.espolios[i].tipo === 'promocao') C.destaque.sobe = new Set(cmds.map((c) => c.terreno))
  Som.tocar('toque'); UI.mudou()
}
function pegarEspolio(cmd) {
  const evs = mandar(cmd); if (!evs) return
  Som.tocar('espolioEscolhe')
  const acabou = evs.find((x) => x.tipo === 'fim')
  if (acabou) { fimDaPartida(); return }
  abrirRodada(); eventosDeTerreno(evs); conferirReino()
}

// ---------------------------------------------------------------- fim da partida (festa)
function fimDaPartida() {
  semTimers(); Bat.parar(); ler()
  const r = resultado(J.e), reg = Guarda.partida({ pontos: r.pontos, vencidas: r.vencidas, rodada: r.rodada, semente: J.semente })
  M.fase = 'fim'; M.fim = { t0: agoraMs() + 900, mostra: 0, vencidas: r.vencidas, pontos: r.pontos, ouro: r.ouroGanho, recorde: reg.recorde, novoRecorde: reg.novoRecorde, contou: false }
  M.vidas = r.vidas; M.aviso = null; C.destaque = null; canvas.style.filter = ''
  montarReino(false); C.vidas = 1; C.fimDeJogo = true
  Som.tocar('fimDePartida'); Musica.momento('fim')
  const n = r.vencidas, passos = Math.min(n, 20)
  for (let i = 1; i <= passos; i++) depois(300 + i * 60, () => { M.fim.mostra = Math.round((n * i) / passos); Som.tocar('rankingSobe', { tom: i % 12 }) })
  depois(400 + passos * 60, () => {
    M.fim.mostra = n; M.fim.contou = true
    if (reg.novoRecorde) { Som.tocar('recorde'); C.flash('#FFD248', 250); for (const dx of [-0.3, 0, 0.3]) C.efeito('confetti', C.VW * (0.5 + dx), C.VH * 0.35) }
  })
  UI.mudou()
}
async function postar() {
  const f = M.fim; if (!f) return
  Som.tocar('toque')
  baixarCartao(cartaoDoReino(C, { rodadas: f.vencidas, pontos: f.pontos, recorde: f.novoRecorde, titulo: T.jogo }))
}

// ---------------------------------------------------------------- toques
let arrasto = null
function aoTocar(id, d, ev) {
  if (id.startsWith('aperta:carta')) { arrasto = { indice: d.indice, x0: ev.clientX, y0: ev.clientY, id: ev.pointerId, moveu: false }; return }
  if (id.startsWith('entra:terreno')) { if (M.fase === 'carta' && M.sel >= 0 && C.destaque && CONFIG.CARTAS[M.mao[M.sel].carta].tipo === 'construcao') C.destaque.vizinhos = C.destaque.terrenos.has(d.terreno) ? vizinhosDe(d.terreno) : new Set(); return }
  if (id.includes(':')) return
  if (id.startsWith('carta')) { selecionar(d.indice); UI.mudou(); return }
  if (id.startsWith('terreno')) {
    if (M.fase === 'terreno') { pegarEspolio({ tipo: 'espolio', indice: J.espolioI, terreno: d.terreno }); return }
    if (M.fase !== 'carta') return
    if (M.sel >= 0 && !M.cartaPosta) { por(d.terreno); return }
    const t = J.v.terrenos[d.terreno - 1]; Som.tocar('toque')
    M.info = t ? [`${CONFIG.CARTAS[t.carta].nome} - ${T.nivel} ${t.nivel}`, CONFIG.CARTAS[t.carta].texto] : null; if (M.info && M.info[1].length > 42) M.info = [M.info[0], M.info[1].slice(0, M.info[1].lastIndexOf(' ', 42)), M.info[1].slice(M.info[1].lastIndexOf(' ', 42) + 1)]
    if (t) depois(4000, () => { M.info = null }); return
  }
  if (id.startsWith('espolio')) { escolherEspolio(d.espolio); return }
  if (id === 'lutar' || id === 'lutar2') lutar()
  else if (id === 'sortear') armar('sortear', sortear)
  else if (id === 'consertar') armar('consertar', consertar)
  else if (id === 'vel') { Bat.vel = Bat.vel === 1 ? 2 : Bat.vel === 2 ? 4 : 1; M.vel = Bat.vel; Guarda.set('vel', Bat.vel); Som.tocar('toque'); UI.mudou() }
  else if (id === 'som') { M.mudo = Som.alternarMudo(); Som.tocar('toque') }
  else if (id === 'menu') { Som.tocar('toque'); Telas.menu() }
  else if (id === 'voltar') { M.fase = 'vitoria'; C.destaque = null; Som.tocar('toque'); UI.mudou() }
  else if (id === 'seguir') seguir()
  else if (id === 'denovo') { Som.tocar('toque'); novaPartida() }
  else if (id === 'postar') postar()
}
addEventListener('pointermove', (ev) => {
  if (!arrasto || ev.pointerId !== arrasto.id || M.fase !== 'carta' || M.cartaPosta) return
  const e = C.e, r = canvas.getBoundingClientRect()
  if (!arrasto.moveu && Math.hypot(ev.clientX - arrasto.x0, ev.clientY - arrasto.y0) > 10) { arrasto.moveu = true; if (M.sel !== arrasto.indice) { M.sel = -1; selecionar(arrasto.indice) } }
  if (arrasto.moveu) {
    M.arrasto = { indice: arrasto.indice, moveu: true, x: (ev.clientX - r.left) / e, y: (ev.clientY - r.top) / e }
    const k = terrenoEm(M.arrasto.x, M.arrasto.y)
    if (C.destaque && CONFIG.CARTAS[M.mao[arrasto.indice].carta].tipo === 'construcao') C.destaque.vizinhos = k && C.destaque.terrenos.has(k) ? vizinhosDe(k) : new Set()
  }
})
function terrenoEm(x, y) { for (let k = 1; k <= 6; k++) { const a = C.areaDoTerreno(k); if (x >= a.x && x < a.x + a.w && y >= a.y - 10 && y < a.y + a.h + 6) return k } return 0 }
function soltar(ev) {
  if (!arrasto || ev.pointerId !== arrasto.id) return
  const a = arrasto; arrasto = null
  if (!a.moveu) return
  const bt = UI.botao('carta' + a.indice); if (bt) { bt.dataset.arrastou = '1'; setTimeout(() => { bt.dataset.arrastou = '' }, 60) }
  const k = M.arrasto ? terrenoEm(M.arrasto.x, M.arrasto.y) : 0
  M.arrasto = null
  if (k && M.sel === a.indice) { M.trocar = J.v.terrenos[k - 1] && J.v.terrenos[k - 1].carta !== M.mao[a.indice].carta ? k : 0; por(k) }
}
addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar)
addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { if (Telas.aberta()) Telas.fechar(); else if (M.sel >= 0) { selecionar(-1); UI.mudou() } } })
// nada toca antes do primeiro toque ou tecla
for (const tipo of ['pointerdown', 'keydown', 'touchend', 'click']) addEventListener(tipo, () => Som.destravar(), { capture: true })

// ---------------------------------------------------------------- "Reduced motion"
function menos(v) { C.menos = !!v; Som.menosAnimacao(!!v); C.limite = (C.tipo === 'celular' ? 40 : 60) >> (v ? 1 : 0); document.documentElement.classList.toggle('km-menos', !!v); if (v) canvas.style.filter = '' }

// ---------------------------------------------------------------- laço de desenho
const QUADROS = new Float32Array(600), CUSTO = new Float32Array(600); let nq = 0, ultimo = 0, ouroEm = 0
function quadro(agora) {
  requestAnimationFrame(quadro)
  const dt = ultimo ? Math.min(50, agora - ultimo) : 16; if (ultimo) QUADROS[nq % 600] = agora - ultimo
  ultimo = agora
  const t0 = performance.now()
  try {
    const dtAnim = Bat.avancar(dt, agora)
    if (M.fase === 'luta') M.forca = { aliados: Bat.aliados, inimigos: Bat.inimigos }
    if (M.ouro !== J.ouroAlvo && agora - ouroEm > 55) { ouroEm = agora; const d = J.ouroAlvo - M.ouro; M.ouro += Math.sign(d) * Math.max(1, Math.floor(Math.abs(d) / 6)); if (d > 0 && M.fase !== 'vitoria') Som.tocar('ouro', { tom: M.ouro % 8 }) }
    C.desenhar(agora, dt, dtAnim)
    UI.desenhar(agora)
  } catch (err) { if (!J.erros.includes(String(err))) { J.erros.push(String(err)); console.error(err) } }
  CUSTO[nq % 600] = performance.now() - t0; nq++
}
function ajustar() { C.ajustar(innerWidth, innerHeight); if (UI) { UI.mudou(); if (J.e && (M.fase === 'carta' || M.fase === 'fim')) montarReino(M.fase === 'carta') } }

// ---------------------------------------------------------------- começo
async function comecar() {
  const guardado = Guarda.get('menos')
  await Arte.carregar(CONFIG)
  C.ajustar(innerWidth, innerHeight)
  Bat = criarBatalha(C, CONFIG, Som, expandirHorda); Bat.vel = [1, 2, 4].includes(Guarda.get('vel')) ? Guarda.get('vel') : 1
  UI = criarInterface(C, CONFIG, camada, aoTocar); M = UI.M
  Bat.aoAviso = (tipo, dado) => {
    if (tipo === 'noite') M.aviso = { texto: T.noite, t0: agoraMs(), ms: 1400 }
    if (tipo === 'ultimo') M.aviso = { texto: T.ultimo, ouro: true, t0: agoraMs(), ms: 1500, k: C.tipo === 'celular' ? 1 : 2 }
    if (tipo === 'chefe') { const c = CONFIG.CHEFES.find((x) => x.id === dado); M.aviso = { texto: c.nome, ouro: true, t0: agoraMs(), ms: 1600, k: C.tipo === 'celular' ? 1 : 2 } }
  }
  Telas = criarTelas({ CONFIG, Arte, Guarda, Som, Musica, menos: (v) => { if (v !== undefined) { menos(v); Guarda.set('menos', !!v) } return C.menos }, novaPartida, emPartida: () => M.fase !== 'fim', aoFechar: () => { if (M.fase !== 'fim') Musica.momento(M.fase === 'luta' ? 'batalha' : J.v.vidas === 1 ? 'porUmFio' : 'construir'); else Musica.momento('fim') } })
  menos(guardado ?? matchMedia('(prefers-reduced-motion: reduce)').matches)
  addEventListener('resize', ajustar)
  novaPartida()
  requestAnimationFrame(quadro)
  if (TESTE) {
    const { ligarGanchos } = await import('./teste.js')
    await ligarGanchos({ J, M: () => M, C, Bat: () => Bat, UI: () => UI, Som, Musica, Guarda, Arte, CONFIG, QUADROS, CUSTO, nq: () => nq, lutar, novaPartida, abrirRodada, fimDaPartida, mandar, ler, preencher, aoFimDaLuta, semTimers, reproduzir, resultado, montarExercito, expandirHorda, cartaoDoReino, seguir, menos })
  }
  document.documentElement.dataset.pronto = '1'
}
comecar()
