// Keepmile — o jogo na tela, modo LOCAL (o motor roda no navegador). A tela não tem regra: lê `visao`/`opcoes` e só manda
// comandos de `opcoes(estado).comandos`. A lista de comandos refaz a partida inteira (`reproduzir`) — é assim que a partida em curso
// fica guardada e volta depois de recarregar.
import * as CONFIG from '../../../shared/reino/config.js'
import { aplicar, criarPartida, opcoes, reproduzir, resultado, visao } from '../../../shared/reino/partida.js'
import { expandirHorda, montarExercito } from '../../../shared/reino/batalha.js'
import { Musica, Som } from '../som-reino.js'
import * as Arte from './arte.js'
import { criarBatalha } from './batalha-tela.js'
import { CONTORNO, criarCena } from './cena.js'
import { cartaoDoReino, compartilhar, linkDaEstrada } from './fim.js'
import { Guarda } from './guarda.js'
import { criarInterface } from './interface.js'
import { ligaDe, mediaDasMelhores } from './ligas.js'
import { criarTelas } from './telas.js'
import { CHEFE_CONQUISTA, CONQUISTAS, T } from './textos.js'

const Q = new URLSearchParams(location.search)
const TESTE = Q.get('teste') === '1'
const canvas = document.getElementById('cena'), camada = document.getElementById('toques')
const C = criarCena(canvas, CONFIG)
const J = { familias: [], e: null, v: null, op: null, comandos: [], semente: null, liberadas: [], ouroAlvo: 0, pos: null, ultimaLuta: null, lutas: [], espolioI: -1, semSorteio: true, anunciado: '', avisado: '', erros: [], chefesVistos: new Set(), emLuta: false, link: '', postou: '', infoAte: 0 }
let UI, M, Bat, Telas
const timers = new Set()
const depois = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }
const semTimers = () => { for (const id of timers) clearTimeout(id); timers.clear() }
const agoraMs = () => performance.now()

// ---------------------------------------------------------------- motor
function ler() { J.v = visao(J.e); J.op = opcoes(J.e) }
/** A partida em curso fica guardada a cada passo: semente + cartas liberadas + comandos (o motor refaz). */
function salvar() { Guarda.salvarPartida(J.e && J.e.fase !== 'fim' && J.comandos.length ? { semente: J.semente, liberadas: J.liberadas, comandos: J.comandos, emLuta: J.emLuta, desafio: J.desafio, melhor: J.melhor } : null) }
/** FIM GUARDADO NA HORA em que o motor decide (antes de animar a luta): pontos, recorde e melhores partidas, uma vez só por partida.
 *  A partida terminada fica no aparelho até o Play again: recarregar volta para a tela de fim dela. */
function registrarFim() {
  if (J.fimReg) return J.fimReg
  const r = resultado(J.e), rodadasAntes = Math.max(0, ...Guarda.get('melhores').map((m) => m.vencidas || 0)) // a partida mais comprida entre as melhores guardadas
  J.fimReg = { ...Guarda.partida({ pontos: r.pontos, vencidas: r.vencidas, rodada: r.rodada, semente: J.semente }), rodadasAntes }
  guardarFim()
  return J.fimReg
}
function guardarFim(visto = false) { Guarda.salvarFim({ semente: J.semente, liberadas: J.liberadas, comandos: J.comandos, reg: J.fimReg, desafio: J.desafio, melhor: J.melhor, visto }) }
/** O que está guardado no aparelho é a partida desta aba? (outra aba pode ter jogado a MESMA partida) */
function discoIgual() {
  if (J.e.fase === 'fim') return true
  const p = Guarda.partidaSalva()
  if (!p) return J.comandos.length === 0 && !Guarda.fimSalvo()
  return p.semente === J.semente && p.comandos.length === J.comandos.length && JSON.stringify(p.comandos) === JSON.stringify(J.comandos)
}
/** Outra aba andou com a partida: esta recarrega o estado guardado antes de aceitar qualquer jogada. */
function sincronizar() {
  const fimS = Guarda.fimSalvo(), salva = Guarda.partidaSalva()
  J.sujo = false
  if (salva ? retomar(salva, T.outraAba) : fimS ? retomarFim(fimS) : false) return true
  return false
}
/** Manda um comando ao motor. Só aceita o que está em `opcoes(estado).comandos`. Devolve os eventos ou null. */
function mandar(cmd) {
  if (!discoIgual() && sincronizar()) { Som.tocar('negado'); return null }
  const valido = J.op.comandos.some((c) => c.tipo === cmd.tipo && (c.carta ?? null) === (cmd.carta ?? null) && (c.terreno ?? null) === (cmd.terreno ?? null) && (c.indice ?? null) === (cmd.indice ?? null))
  const r = valido ? aplicar(J.e, cmd) : { ok: false }
  if (!r.ok) { Som.tocar('negado'); return null }
  J.e = r.estado; J.comandos.push(cmd); ler()
  if (J.e.fase === 'fim') registrarFim()
  salvar()
  return r.eventos
}
function sementeNova() { const a = new Uint32Array(2); crypto.getRandomValues(a); return 'k' + a[0].toString(36) + a[1].toString(36) }

// ---------------------------------------------------------------- FILA DE FESTAS
// Uma festa por vez, 0,4 s entre elas, a maior por último. Nada por cima do anúncio do chefe (a fila espera) nem do HUD (a interface
// desenha abaixo dele). `tam`: 1 pequena, 2 média, 3 grande. `tipo`: 'aviso' (letreiro) ou 'brinde' (placa). `fase`: só vale naquela fase.
const F = { fila: [], atual: null, livreEm: 0, log: [], n: 0 }
const VAO_FESTA = 400
function festa(f) { f.n = F.n++; F.fila.push(f); F.fila.sort((a, b) => a.tam - b.tam || a.n - b.n) }
function limparFestas() { F.fila.length = 0; if (F.atual) { M[F.atual.tipo] = null; if (F.atual.log) F.atual.log.fim = agoraMs(); F.atual = null } }
/** Festa que espera: conquista e carta nova do álbum só DEPOIS da escolha do espólio (nada cai junto com a escolha); no fim de
 *  partida, só depois da entrada em sequência. */
const seguraFesta = (f) => (f.aposEspolio && (M.fase === 'vitoria' || M.fase === 'terreno')) || (M.fase === 'fim' && M.fim && !M.fim.contou)
const JA_VISTA = 700 // ms na tela a partir dos quais a festa interrompida pelo chefe não volta (não dispara duas vezes)
function festasTique(agora) {
  const a = F.atual
  if (a) {
    const fora = a.fase && a.fase !== M.fase
    if (M.fase === 'chefe' && !fora) {
      // o chefe chegou: a festa sai da frente. Se mal apareceu, volta depois dele (uma vez só: o som e o confete não se repetem)
      M[a.tipo] = null; F.atual = null; a.log.fim = agora; F.livreEm = agora + VAO_FESTA
      if (agora - a.t0 < JA_VISTA && !a.voltou) { a.voltou = true; a.log.adiada = true; a.ao = null; F.fila.unshift(a) }
      return
    }
    if (fora || agora >= a.t0 + a.ms) { M[a.tipo] = null; F.atual = null; a.log.fim = agora; F.livreEm = agora + VAO_FESTA }
    return
  }
  if (!F.fila.length || agora < F.livreEm || M.fase === 'chefe') return
  let f = null
  while (F.fila.length && !f) {
    const i = F.fila.findIndex((x) => !seguraFesta(x)); if (i < 0) return
    f = F.fila.splice(i, 1)[0]
    if (f.fase && f.fase !== M.fase) f = null
  }
  if (!f) return
  f.t0 = agora; if (F.fila.length >= 2) f.ms = Math.round(f.ms * 0.7) // fila comprida anda mais depressa
  F.atual = f; M[f.tipo] = f; f.ao?.()
  if (f.voltou && f.log) { f.log.fim = 0; f.log.voltou = agora; return } // a mesma festa, de volta depois do chefe: não conta duas vezes
  f.log = { texto: f.texto, tam: f.tam, tipo: f.tipo, ini: agora, fim: 0, fase: M.fase }; F.log.push(f.log); if (F.log.length > 80) F.log.shift()
}
const kAviso = () => (C.tipo === 'celular' ? 1 : 2)

// ---------------------------------------------------------------- festas pequenas e médias
function conquista(id) {
  if (!Guarda.conquista(id)) return
  const c = CONQUISTAS.find((x) => x.id === id)
  festa({ tam: 2, tipo: 'brinde', ms: 2400, aposEspolio: true, titulo: T.conquista, texto: c.nome, icone: { tipo: 'conquista', nome: c.nome }, ao: () => { Som.tocar('conquista'); C.efeito('confetti', C.VW / 2 + C.cam.x, 60) } })
}
function conferirReino() {
  const t = J.v.terrenos
  if (t.every(Boolean)) { conquista('house'); if (new Set(t.map((x) => CONFIG.CARTAS[x.carta].familia)).size === 1) conquista('family') }
  if (t.some((x) => x && x.nivel >= CONFIG.PARTIDA.nivelMax)) conquista('brass')
}
/** "Antes > depois" de um nível, só com números do config: a quantidade/valor; se não mudou, a força (vida e dano) em %. */
function antesDepois(carta, nivel) {
  const c = CONFIG.CARTAS[carta], a = Arte.forcaDaCarta(carta, nivel - 1), b = Arte.forcaDaCarta(carta, nivel)
  if (a !== b) return T.deAte(a, b, Arte.legendaDaCarta(carta))
  const m = c.multNivel || CONFIG.MULT_NIVEL
  return c.tipo === 'tropa' ? T.poder(m[nivel - 2], m[nivel - 1]) : T.deAte(`${T.nivel} ${nivel - 1}`, String(nivel), '')
}
function festaNivel(k, nivel, carta) {
  const p = C.centroDoTerreno(k), max = nivel >= CONFIG.PARTIDA.nivelMax
  C.pulo[k] = C.relogio + 300
  C.efeito('level-ring', p.x + C.cam.x, p.y); C.efeito('confetti', p.x + C.cam.x, p.base - 12); C.efeito('level-stars', p.x + C.cam.x, p.base - 20)
  M.selo = { terreno: k, t0: agoraMs(), ate: agoraMs() + 1900, linha: antesDepois(carta, nivel) }
  Som.tocar(max ? 'nivelGrande' : 'nivelPequeno')
  if (max) festa({ tam: 3, tipo: 'aviso', ms: 1400, texto: T.maximo, ouro: true, ao: () => C.flash('#FFD248', 200) })
}
function festaPosta(k) { const p = C.centroDoTerreno(k); C.efeito('dust', p.x + C.cam.x - 8, p.y + 4); C.efeito('dust', p.x + C.cam.x + 8, p.y + 6, true); Som.tocar('cartaPoe') }
function eventosDeTerreno(evs) {
  for (const ev of evs) {
    if (ev.tipo === 'posta') festaPosta(ev.terreno)
    if (ev.tipo === 'nivel') festaNivel(ev.terreno, ev.nivel, ev.carta)
    if (ev.tipo === 'reliquia') {
      // o que a relíquia faz aparece NA HORA (não espera a fila de festas) e o ícone dela acende no HUD
      const r = CONFIG.RELIQUIAS[ev.reliquia], linhas = [`#${r.nome}`, r.texto]
      Som.tocar('nivelPequeno')
      if (M.fase === 'chefe') J.infoPend = linhas; else dizer(linhas, 5000)
      M.relSel = J.v.reliquias.indexOf(ev.reliquia); M.relNova = agoraMs()
    }
  }
}
/** Mostra linhas de explicação (um toque no item explica em 1 linha). */
function dizer(linhas, ms = 4500) { M.info = linhas; J.infoAte = agoraMs() + ms; M.relSel = -1 }

// ---------------------------------------------------------------- o reino parado (fase de carta)
/** Castelo: inteiro (3), rachado (2) ou muito rachado (1), pelas vidas perdidas. */
function estadoCastelo() { const perdidas = J.v.vidasMax - J.v.vidas; return perdidas <= 0 ? 3 : perdidas === 1 ? 2 : 1 }
function montarReino(comHorda = true) {
  const v = J.v
  C.terrenos = v.terrenos.map((t) => (t ? { ...t } : null)); C.vidas = estadoCastelo(); C.magiaAnim = {}
  C.limparBonecos(); C.tb = 0; C.noite = 0; C.cam.alvo = 0; C.marcha = false
  const ex = montarExercito(v.terrenos, v.reliquias)
  for (const s of ex.soldados) for (let j = 0; j < s.qtd; j++) { const f = C.formacao(j, s.qtd); C.nascer(0, s.carta, s.terreno * 100 - 50, s.vida, f.lane, f.dxe, 1, s.nivel, j === 0) }
  M.hordaN = 0; M.hordaChefe = null
  if (comHorda && v.horda) {
    M.hordaN = expandirHorda(v.horda).length; M.hordaChefe = v.horda.chefe
    const tipos = [...new Set(v.horda.ordem)], cabem = C.tipo === 'celular' ? 4 : 8, fila = [...tipos]
    for (const t of v.horda.ordem) { if (fila.length >= Math.min(cabem, v.horda.ordem.length)) break; if (t !== v.horda.chefe) fila.push(t) }
    fila.slice(0, cabem).forEach((t, i, a) => { const chefe = t === v.horda.chefe; C.nascer(1, t, chefe ? -30 : -6 - (i * (C.VW < 500 && C.tipo === 'pc' ? 22 : 46)) / Math.max(1, a.length) - (i % 2) * 4, 1, chefe ? 0.3 : ((i * 5) % 7) / 3.5 - 0.9, 0) })
  }
}
function nivelNaMao(carta) { let n = 0; for (const t of J.v.terrenos) if (t && t.carta === carta && t.nivel < CONFIG.PARTIDA.nivelMax) n = Math.max(n, t.nivel); return n }
const precisaDe = (fam) => (J.v.reliquias.includes('banner') ? CONFIG.RELIQUIAS.banner.terrenos : CONFIG.FAMILIAS[fam].terrenos)
const contaFamilias = () => { const cont = {}; for (const t of J.v.terrenos) if (t) { const f = CONFIG.CARTAS[t.carta].familia; cont[f] = (cont[f] || 0) + 1 } return cont }
/** A faixa da família ao escolher a carta: "PIKEWALL 2/3 > 3/3 BONUS" (contagem dos terrenos; o bônus quem liga é o motor). */
function linhaDaFamilia(carta) {
  const fam = CONFIG.CARTAS[carta].familia, nome = CONFIG.FAMILIAS[fam].nome, n = contaFamilias()[fam] || 0, p = precisaDe(fam)
  if (J.v.familias.includes(fam)) return T.familiaLigada(nome, n, p)
  const ganha = J.op.comandos.some((c) => c.tipo === 'por' && c.carta === carta && (!J.v.terrenos[c.terreno - 1] || CONFIG.CARTAS[J.v.terrenos[c.terreno - 1].carta].familia !== fam))
  return ganha ? T.familiaMais(nome, n, p, n + 1 >= p) : T.familia(nome, n, p)
}
function infoDaCarta(i) {
  const m = M.mao[i], c = CONFIG.CARTAS[m.carta], rar = CONFIG.RARIDADES.find((r) => r.id === c.raridade).nome
  const out = [`#${c.nome} - ${CONFIG.FAMILIAS[c.familia].nome} ${T.tipo[c.tipo]}`, c.texto]
  if (m.sobe) out.push('#' + T.sobeLinha(antesDepois(m.carta, m.nivel)))
  out.push(T.pinos(m.nivel, CONFIG.PARTIDA.nivelMax, rar), '#' + linhaDaFamilia(m.carta))
  return out
}
function descreverEspolios(v) {
  const ch = CONFIG.PARTIDA.bolsa.chanceReliquia, E = CONFIG.ESPOLIOS
  return v.espolios.map((e) => e.tipo === 'carta' ? { titulo: CONFIG.CARTAS[e.carta].nome, texto: CONFIG.CARTAS[e.carta].texto }
    : e.reliquia ? { titulo: CONFIG.RELIQUIAS[e.reliquia].nome, texto: CONFIG.RELIQUIAS[e.reliquia].texto + (e.tipo === 'bolsa' ? ' ' + T.bolsaSorte(ch) : '') }
      : e.tipo === 'promocao' ? { titulo: E.promocao.nome, texto: E.promocao.texto } : { titulo: `${E.bolsa.nome} +${e.ouro} ${T.ouro}`, texto: T.bolsaChance(ch) })
}
function preencher() {
  const v = J.v, op = J.op
  M.vidas = v.vidas; M.vidasMax = v.vidasMax; M.rodada = v.rodada; M.proximoChefe = v.proximoChefe; M.cartaPosta = v.cartaPosta
  M.mao = v.oferta.map((o) => { const n = nivelNaMao(o.carta); return { carta: o.carta, nivel: n ? n + 1 : 1, sobe: n > 0 } })
  const visivel = v.vidas < v.vidasMax && v.fase === 'carta'
  // guia do ouro parado: sempre que há vida perdida e ouro para consertar, o botão chama a atenção (qualquer rodada; mais forte na última vida)
  M.sortear = op.sortear; M.consertar = { ...op.consertar, visivel, destaque: visivel && op.consertar.pode, forte: visivel && op.consertar.pode && v.vidas === 1 }
  M.espolios = v.espolios; M.espolioPode = v.espolios.map((_, i) => op.comandos.some((c) => c.tipo === 'espolio' && c.indice === i)); M.espolioDesc = descreverEspolios(v)
  M.mudo = Som.mudo(); M.vel = Bat.vel; M.reliquias = v.reliquias.slice()
  M.chances = CONFIG.RARIDADES.map((r) => ({ id: r.id, nome: r.nome, chance: r.chance, cor: Arte.Cod.RARIDADE_COR[r.id].cor, claro: Arte.Cod.RARIDADE_COR[r.id].claro }))
  // famílias à vista: quantos terrenos de cada uma e quantos ligam o bônus (números do config)
  const cont = contaFamilias()
  M.familias = Object.keys(cont).map((id) => ({ id, n: cont[id], precisa: precisaDe(id), ligada: v.familias.includes(id) }))
  for (const id of v.familias) if (!J.familias.includes(id)) { const f = CONFIG.FAMILIAS[id]; festa({ tam: 2, tipo: 'aviso', ms: 2600, texto: T.bonus(f.nome), sub: f.texto, ouro: true, k: kAviso(), ao: () => Som.tocar('nivelPequeno') }) }
  J.familias = v.familias.slice()
}
function abrirRodada() {
  ler(); preencher()
  const v = J.v
  M.fase = 'carta'; M.sel = -1; M.armado = null; M.trocar = 0; M.info = null; M.infoSel = null; M.vitoria = null; M.derrota = null; M.maoT0 = agoraMs() + 150; M.pulsaLutar = v.cartaPosta
  M.primeira = v.rodada === 1 && v.terrenos.every((t) => !t); C.destaque = null; J.ouroAlvo = v.ouro
  canvas.style.filter = ''
  C.mudarHora(Arte.horaDaRodada(v.rodada)); Musica.rodada(v.rodada)
  montarReino(); Som.tocar('cartaAparece')
  const chave = v.rodada + ':' + v.vidas
  if (v.horda.chefe && J.anunciado !== chave) {
    // anúncio inteiro só na 1ª vez de cada chefe na partida; nas repetições, a versão curta (0,8 s)
    const curto = J.chefesVistos.has(v.horda.chefe); J.chefesVistos.add(v.horda.chefe)
    J.anunciado = chave; M.fase = 'chefe'; M.chefe = { id: v.horda.chefe, t0: agoraMs(), curto, texto: T.comUnidade(CONFIG.CHEFES.find((x) => x.id === v.horda.chefe).texto) }
    Som.tocar('chefeAnuncia', curto ? { forca: 0.6 } : {}); Musica.momento('chefe')
    depois(curto ? 800 : 3200, () => { if (M.fase === 'chefe') seguir() })
  } else {
    Musica.momento(v.horda.chefe ? 'chefe' : v.vidas === 1 ? 'porUmFio' : 'construir')
    if (v.proximoChefe.avisado && !v.horda.chefe && J.avisado !== chave) { J.avisado = chave; const c = CONFIG.CHEFES.find((x) => x.id === v.proximoChefe.chefe); festa({ tam: 1, tipo: 'aviso', ms: 3200, texto: T.emRodadas(v.proximoChefe.rodada - v.rodada), sub: `${c.nome}: ${T.comUnidade(c.texto)}`, k: 1, fase: 'carta' }) }
    // véspera do chefe com vida perdida e ouro parado: um lembrete de 1 linha
    if (!v.horda.chefe && v.proximoChefe.rodada - v.rodada === 1 && M.consertar.destaque) dizer(['#' + T.chefeAmanha(M.consertar.custo)], 7000)
  }
  M.setaCarta = M.primeira && !Guarda.get('dica') && !J.tocouCarta
  UI.mudou()
}
function zerarPartida() {
  semTimers(); Bat.parar(); limparFestas()
  J.comandos = []; J.lutas = []; J.semSorteio = true; J.anunciado = ''; J.avisado = ''; J.ultimaLuta = null; J.familias = []; J.chefesVistos = new Set(); J.emLuta = false
  J.fimReg = null; J.melhor = null; J.desafio = null; J.sujo = false; J.relI = -1; J.infoPend = null
  M.fim = null; M.selo = null; M.resumo = null; M.info = null; M.desafio = null; M.relSel = -1
  C.fimDeJogo = false
}
/** Partida nova. `semente`: estrada fixa (teste). `desafio` = { semente, rodadas }: a estrada de um amigo ("MESMA ESTRADA" de verdade:
 *  só as cartas do álbum inicial do config, iguais para todos; vale UMA partida). Sem nada: se há uma partida guardada no 2º espaço
 *  (o jogador aceitou a estrada de um amigo no meio da dele), volta a ela. */
function novaPartida({ semente = null, desafio = null } = {}) {
  if (!semente && !desafio) { const outra = Guarda.outraPartida(); if (outra) { Guarda.guardarOutra(null); if (retomar(outra)) return } }
  zerarPartida(); Guarda.salvarFim(null)
  J.desafio = desafio; M.desafio = desafio
  J.semente = desafio ? desafio.semente : semente || sementeNova()
  J.liberadas = desafio ? CONFIG.ALBUM.inicial.slice() : Guarda.liberadas(CONFIG.ALBUM)
  J.e = criarPartida({ semente: J.semente, cartasLiberadas: J.liberadas })
  ler(); M.ouro = J.v.ouro; salvar()
  abrirRodada()
  if (desafio) festa({ tam: 2, tipo: 'aviso', ms: 3000, texto: desafio.rodadas != null ? T.desafio(desafio.rodadas) : T.amigo.estrada, sub: T.amigo.sub, ouro: true, k: kAviso(), fase: 'carta', ao: () => Som.tocar('chefeAnuncia', { forca: 0.5 }) })
}
/** Retoma a partida guardada: o motor refaz tudo com os comandos. No meio de uma batalha, volta ao começo dela. */
function retomar(p, aviso = null) {
  let cmds = p.comandos
  const lutando = !!p.emLuta && cmds.length > 0 && cmds[cmds.length - 1].tipo === 'batalhar'
  if (lutando) cmds = cmds.slice(0, -1)
  let r
  try { r = reproduzir({ semente: p.semente, cartasLiberadas: p.liberadas, comandos: cmds }) } catch { return false }
  if (!r.ok || r.estado.fase === 'fim') return false
  zerarPartida(); Guarda.salvarFim(null)
  J.semente = p.semente; J.liberadas = p.liberadas.slice(); J.e = r.estado; J.comandos = cmds.slice(); J.semSorteio = !cmds.some((c) => c.tipo === 'sortear')
  J.desafio = p.desafio || null; M.desafio = J.desafio; J.melhor = p.melhor || null
  ler(); M.ouro = J.v.ouro; J.familias = J.v.familias.slice(); salvar()
  if (J.v.fase === 'espolio') mostrarEspolio()
  else { abrirRodada(); if (lutando) { if (M.fase === 'chefe') seguir(); lutar() } }
  if (cmds.length || aviso) festa({ tam: 1, tipo: 'brinde', ms: 2200, titulo: aviso || T.jogo, texto: T.continua(J.v.rodada), icone: { tipo: 'carta' } })
  return true
}
/** Volta para a tela de fim da partida terminada que está guardada (recarregou na luta final ou na própria tela de fim). */
function retomarFim(f) {
  let r
  try { r = reproduzir({ semente: f.semente, cartasLiberadas: f.liberadas, comandos: f.comandos }) } catch { return false }
  if (!r.ok || r.estado.fase !== 'fim' || !f.reg) return false
  zerarPartida()
  J.semente = f.semente; J.liberadas = f.liberadas.slice(); J.e = r.estado; J.comandos = f.comandos.slice()
  J.desafio = f.desafio || null; M.desafio = J.desafio; J.melhor = f.melhor || null; J.fimReg = f.reg
  ler(); M.ouro = J.v.ouro; J.ouroAlvo = J.v.ouro
  fimDaPartida(!!f.visto)
  return true
}
/** Tela de espólio sem a batalha antes (partida retomada no meio da escolha). */
function mostrarEspolio() {
  preencher()
  M.fase = 'vitoria'; M.sel = -1; M.vitoria = { t0: agoraMs() - 1000, ouro: 0, ouroMostra: 0, pronto: true, prontoT0: agoraMs() - 1000, chefe: null, selo: null, mvp: null }
  C.mudarHora(Arte.horaDaRodada(J.v.rodada), true); J.ouroAlvo = J.v.ouro
  montarReino(false); Musica.momento('vitoria'); UI.mudou()
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
  M.trocar = 0; M.armado = null; M.info = null; M.infoSel = null
  if (i < 0 || M.sel === i) { M.sel = -1; C.destaque = null; Som.tocar('toque'); return }
  M.sel = i; M.infoSel = infoDaCarta(i); J.tocouCarta = true; M.setaCarta = false
  const carta = M.mao[i].carta
  destacar(carta, J.op.comandos.filter((c) => c.tipo === 'por' && c.carta === carta))
  Som.tocar('cartaEscolhe'); if (M.mao[i].sobe) depois(180, () => Som.tocar('faltaUm'))
}
/** Trocar o que está no terreno pede confirmação: o 1º toque só arma ("REPLACE?"), o 2º troca. */
function pedeTroca(k) {
  const t = J.v.terrenos[k - 1]
  M.trocar = k; M.trocarEm = agoraMs(); M.trocarLinhas = t ? T.trocarQue(CONFIG.CARTAS[t.carta].nome, t.nivel) : [T.trocar]
  Som.tocar('toque'); dizer([T.trocarDica], 3000); depois(3000, () => { if (M.trocar === k) M.trocar = 0 })
}
/** Toque repetido não confirma nada: toda confirmação de dois toques só vale `GUARDA_TOQUE` ms depois do primeiro. */
const GUARDA_TOQUE = 400
const cedoDemais = (desde) => agoraMs() - (desde || 0) < GUARDA_TOQUE
function por(k, arrastou = false) {
  const carta = M.mao[M.sel]?.carta; if (!carta) return
  const atual = J.v.terrenos[k - 1]
  if (atual && atual.carta !== carta && !arrastou) { if (M.trocar !== k) { pedeTroca(k); return } if (cedoDemais(M.trocarEm)) return }
  const evs = mandar({ tipo: 'por', carta, terreno: k }); if (!evs) return
  const novato = M.primeira && !Guarda.get('dica')
  preencher(); M.sel = -1; M.infoSel = null; M.info = null; M.trocar = 0; M.primeira = false; M.pulsaLutar = true
  montarReino(); eventosDeTerreno(evs)
  C.destaque = CONFIG.CARTAS[carta].tipo === 'construcao' ? { vizinhos: vizinhosDe(k) } : null
  if (C.destaque) depois(1600, () => { if (M.fase === 'carta' && M.cartaPosta) C.destaque = null })
  // dica única, na 1ª carta da 1ª partida: o que as vidas valem e quem luta
  if (novato) { Guarda.set('dica', true); dizer(['#' + T.dica.vidas(J.v.vidasMax), T.dica.tropas], 7000) }
  conferirReino(); UI.mudou()
}
function armar(qual, fazer) {
  if (M.armado === qual) { if (cedoDemais(M.armadoEm)) return; M.armado = null; fazer(); return }
  M.armado = qual; M.armadoEm = agoraMs(); Som.tocar('toque'); depois(3000, () => { if (M.armado === qual) M.armado = null })
}
function sortear() {
  const evs = mandar({ tipo: 'sortear' }); if (!evs) return
  J.semSorteio = false; preencher(); M.sel = -1; M.infoSel = null; C.destaque = null; M.maoT0 = agoraMs(); J.ouroAlvo = J.v.ouro
  Som.tocar('sortear'); UI.mudou()
}
function consertar() {
  const evs = mandar({ tipo: 'consertar' }); if (!evs) return
  preencher(); J.ouroAlvo = J.v.ouro; C.vidas = estadoCastelo()
  Som.tocar('consertar'); const c = C.geo.castelo; C.efeito('heal', C.ox + c[0], C.oy + c[1]); C.efeito('level-ring', C.ox + c[0], C.oy + c[1])
  if (J.v.vidas > 1 && !J.v.horda.chefe) Musica.momento('construir')
  UI.mudou()
}
/** Um toque nas relíquias do HUD: mostra o efeito de uma por vez (a que está acesa). */
function sobreAsReliquias() {
  const rs = J.v.reliquias; if (!rs.length) return
  const i = (Math.max(-1, M.relSel) + 1) % rs.length, r = CONFIG.RELIQUIAS[rs[i]]
  Som.tocar('toque'); dizer([`#${r.nome}${rs.length > 1 ? ` (${i + 1}/${rs.length})` : ''}`, r.texto], 5000); M.relSel = i
}
function sobreAHorda() {
  const h = J.v.horda, cont = {}, out = ['#' + T.dica.horda(M.hordaN)]
  for (const t of h.ordem) if (t !== h.chefe) cont[t] = (cont[t] || 0) + 1
  if (h.chefe) { const c = CONFIG.CHEFES.find((x) => x.id === h.chefe); out.push(`#${T.chefe}: ${c.nome}`, T.comUnidade(c.texto)) }
  for (const [t, n] of Object.entries(cont)) { const i = CONFIG.INVASORES[t]; out.push(`#${n} x ${i.nome}: ${i.texto}`) }
  dizer(out.slice(0, 7), 6500)
}

// ---------------------------------------------------------------- batalha e depois
function lutar(rapido = false) {
  if (M.fase !== 'carta') return
  const pre = { terrenos: J.v.terrenos, reliquias: J.v.reliquias, rodada: J.v.rodada }
  const evs = mandar({ tipo: 'batalhar' }); if (!evs) return
  const bat = evs.find((x) => x.tipo === 'batalha')
  J.pos = { bat, ouro: evs.find((x) => x.tipo === 'ouro').valor, fim: evs.find((x) => x.tipo === 'fim') || null, pre }
  J.ultimaLuta = { motor: bat.vitoria, tela: null, rodada: pre.rodada, segundos: bat.segundos }
  J.emLuta = true; salvar()
  M.fase = 'luta'; M.sel = -1; M.infoSel = null; M.armado = null; M.trocar = 0; M.info = null; C.destaque = null
  canvas.style.filter = C.menos ? '' : 'saturate(1.1)'
  Musica.momento(bat.horda.chefe ? 'chefe' : 'batalha'); if (!rapido) Som.tocar('invasorChega')
  Bat.iniciar({ eventos: bat.eventos, horda: bat.horda, terrenos: pre.terrenos, exercito: montarExercito(pre.terrenos, pre.reliquias), segundos: bat.segundos, rodada: pre.rodada }, aoFimDaLuta)
  if (rapido) Bat.pular()
  UI.mudou()
}
const resumoDaLuta = () => ({ ...Bat.resumo(), cartas: [null, ...(J.pos?.pre.terrenos || C.terrenos).map((t) => (t ? t.carta : null))] })
function aoFimDaLuta(res) {
  const { bat, ouro, pre } = J.pos
  J.ultimaLuta.tela = res.vitoria; J.lutas.push({ ...J.ultimaLuta })
  if (res.vitoria !== bat.vitoria) J.erros.push(`rodada ${pre.rodada}: a tela mostrou ${res.vitoria} e o motor decidiu ${bat.vitoria}`)
  J.emLuta = false; salvar()
  canvas.style.filter = ''; C.noite = 0
  const R = M.resumo = resumoDaLuta()
  // o melhor momento da partida (para o fecho do fim): o terreno que mais bateu numa luta só — tirado do resumo das lutas
  if (R.mvp >= 0 && R.dano[R.mvp] > (J.melhor?.dano || 0)) {
    const nome = R.mvp > 0 ? CONFIG.CARTAS[R.cartas[R.mvp]]?.nome : T.resumo.magia
    if (nome) { J.melhor = { nome, dano: R.dano[R.mvp], rodada: pre.rodada }; if (J.fimReg) guardarFim(); else salvar() }
  }
  if (bat.vitoria) {
    const limpo = res.quedasDeSoldado === 0, um = res.aliados === 1, chefe = bat.horda.chefe ? CONFIG.CHEFES.find((c) => c.id === bat.horda.chefe) : null
    const nomeMvp = R.mvp > 0 ? CONFIG.CARTAS[R.cartas[R.mvp]]?.nome : R.mvp === 0 ? T.resumo.magia : null
    M.fase = 'vitoria'; M.vitoria = { t0: agoraMs(), ouro, ouroMostra: 0, pronto: false, chefe: bat.horda.chefe, chefeNome: chefe ? chefe.nome.split(' the ')[0] : null, selo: limpo ? T.limpo : um ? T.ultimo : null, mvp: nomeMvp ? `${T.resumo.mvp}: ${nomeMvp} ${R.dano[R.mvp]}` : null }
    preencher(); M.vidas = J.v.vidas
    Som.tocar('vitoria'); Musica.momento('vitoria'); C.flash('#FFD9A0', 300)
    for (const dx of [-0.3, 0, 0.3]) C.efeito('confetti', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.3)
    if (chefe) for (const dx of [-0.2, 0.2]) C.efeito('fireworks', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.22)
    // ouro contando, depois os 3 espólios viram cartas grandes
    const passos = Math.min(ouro, 12)
    for (let i = 1; i <= passos; i++) depois(350 + i * 70, () => { M.vitoria.ouroMostra = Math.round((ouro * i) / passos); Som.tocar('ouro', { tom: i }) })
    depois(450 + passos * 70 + 250, () => { M.vitoria.pronto = true; M.vitoria.prontoT0 = agoraMs(); J.ouroAlvo = J.v.ouro; Som.tocar('espolio'); UI.mudou() })
    conquista('supper'); if (limpo) conquista('plate'); if (um) conquista('last')
    if (bat.horda.chefe && CHEFE_CONQUISTA[bat.horda.chefe]) conquista(CHEFE_CONQUISTA[bat.horda.chefe])
    if (pre.rodada === 10 && J.semSorteio) conquista('penny')
    const nova = Guarda.rodadaVencida(CONFIG.ALBUM)
    if (nova) { festa({ tam: 2, tipo: 'brinde', ms: 2600, aposEspolio: true, titulo: T.cartaNova, texto: CONFIG.CARTAS[nova].nome, icone: { tipo: 'carta', id: nova }, ao: () => Som.tocar('cartaNova') }); if (Guarda.quantas(CONFIG.ALBUM) >= CONFIG.ALBUM.ordem.length) conquista('librarian') }
  } else {
    const nome = res.quem ? (CONFIG.INVASORES[res.quem] || CONFIG.CHEFES.find((c) => c.id === res.quem))?.nome : null
    // derrota como "quase": o quanto da horda caiu é o número do motor (`pctHorda`); a mesma rodada volta com mais uma carta
    M.fase = 'derrota'; M.derrota = { t0: agoraMs(), linha: nome ? (res.tocouCastelo ? T.chegou(nome) : T.varreu(nome)) : T.derrota, pct: bat.pctHorda, deNovo: J.e.fase !== 'fim' }
    M.vidas = J.v.vidas; M.vidaSome = { i: J.v.vidas, ate: agoraMs() + 1200 }
    C.vidas = estadoCastelo(); C.casteloTreme = C.relogio + 600; C.tremer(6, 120)
    Som.tocar('casteloRacha'); depois(500, () => Som.tocar('vidaPerdida')); depois(900, () => Som.tocar('derrota'))
    Musica.momento('derrota'); if (!C.menos) canvas.style.filter = 'saturate(0.6)'
    J.ouroAlvo = J.v.ouro
    { const c = C.geo.castelo; C.estouro(C.ox + c[0], C.oy + c[1] - 40, 10, 8, 60) }
    depois(4500, () => { if (M.fase === 'derrota') seguir() })
  }
  UI.mudou()
}
function seguir() {
  if (M.fase === 'chefe') { M.fase = 'carta'; M.chefe = null; M.maoT0 = agoraMs(); if (J.infoPend) { dizer(J.infoPend, 5000); J.infoPend = null } UI.mudou(); return }
  if (M.fase === 'fim') { if (M.fim && !M.fim.contou) J.pularFim?.(); return } // um toque pula a entrada do fim: tudo no lugar
  if (M.fase === 'derrota') { if (J.e.fase === 'fim') fimDaPartida(); else abrirRodada() }
}
function escolherEspolio(i) {
  const cmds = J.op.comandos.filter((c) => c.tipo === 'espolio' && c.indice === i)
  if (!cmds.length) { Som.tocar('negado'); return }
  if (cedoDemais(M.vitoria?.prontoT0)) return // os cartões acabaram de aparecer: o toque era para outra coisa
  if (cmds[0].terreno == null) { pegarEspolio({ tipo: 'espolio', indice: i }); return }
  J.espolioI = i; M.espolioI = i; J.terrenoEm = agoraMs(); M.fase = 'terreno'; M.trocar = 0; M.info = null
  montarReino(false) // os soldados de cada terreno ficam à vista para escolher onde pôr
  destacar(M.espolios[i].tipo === 'carta' ? M.espolios[i].carta : null, cmds)
  if (M.espolios[i].tipo === 'promocao') C.destaque.sobe = new Set(cmds.map((c) => c.terreno))
  Som.tocar('toque'); UI.mudou()
}
/** Terreno tocado na escolha do espólio. Carta em terreno ocupado por OUTRA carta troca o que está lá: pede "REPLACE?" como na mão. */
function terrenoDoEspolio(k) {
  const esp = M.espolios[J.espolioI], atual = J.v.terrenos[k - 1]
  const valido = J.op.comandos.some((c) => c.tipo === 'espolio' && c.indice === J.espolioI && c.terreno === k)
  if (cedoDemais(J.terrenoEm)) return // os terrenos acabaram de aparecer no lugar dos espólios (toque repetido)
  if (valido && esp.tipo === 'carta' && atual && atual.carta !== esp.carta) { if (M.trocar !== k) { pedeTroca(k); return } if (cedoDemais(M.trocarEm)) return }
  M.trocar = 0
  pegarEspolio({ tipo: 'espolio', indice: J.espolioI, terreno: k })
}
function pegarEspolio(cmd) {
  const evs = mandar(cmd); if (!evs) return
  Som.tocar('espolioEscolhe')
  const acabou = evs.find((x) => x.tipo === 'fim')
  if (acabou) { fimDaPartida(); return }
  abrirRodada(); eventosDeTerreno(evs); conferirReino()
}

// ---------------------------------------------------------------- fim da partida (festa de tela cheia)
/** FIM COMO FESTA, em sequência: escurece a borda → o número de rodadas GRANDE no centro conta de 0 ao total com som → a faixa NEW
 *  RECORD cruza a tela com confete (sem recorde: o melhor momento da partida e quanto faltou) → sobe a placa (pontos, liga, próxima
 *  carta) → por fim os botões. `direto` (voltou à tela de fim já vista) e Reduced motion: tudo no lugar, sem movimento, com som. */
function fimDaPartida(direto = false) {
  semTimers(); Bat.parar(); limparFestasDeLuta(); ler()
  const r = resultado(J.e), reg = registrarFim()
  const media = mediaDasMelhores(Guarda.get('melhores')), lg = ligaDe(media) // liga PROVISÓRIA do beta (js/ligas.js)
  J.emLuta = false; Guarda.salvarPartida(null)
  const n = r.vencidas, passos = Math.min(n, 20), parado = C.menos || direto
  const tFaixa = 450 + passos * 70 + 250, tSobe = tFaixa + (reg.novoRecorde ? 1300 : 1000), tBotoes = tSobe + 450
  const m = J.melhor, falta = (reg.rodadasAntes ?? n) - n, am = J.desafio && J.desafio.rodadas != null ? J.desafio.rodadas : null
  M.fase = 'fim'; M.fim = {
    t0: agoraMs(), parado, tFaixa, tSobe, tBotoes, mostra: parado ? n : 0, vencidas: n, pontos: r.pontos, ouro: r.ouroGanho, recorde: reg.recorde, recordeAntes: reg.antes, novoRecorde: reg.novoRecorde,
    contado: parado, contou: false,
    media, liga: { nome: lg.liga.nome, i: lg.i, pct: lg.pct, proxima: lg.proxima ? lg.proxima.nome : null, falta: lg.falta }, album: Guarda.proximaCarta(CONFIG.ALBUM), semente: J.semente,
    // o fecho: o melhor momento (do resumo das lutas), quanto faltou para a partida mais comprida e, na estrada de um amigo, quem levou
    melhor: m ? T.melhorLinha(m.nome, m.dano, m.rodada) : null, faltaLinha: reg.novoRecorde ? null : n === 0 ? T.semRodadas : T.rodadasPara(falta),
    amigo: am != null ? { texto: T.desafioFim(am, n), ganhou: n > am } : null,
  }
  M.vidas = r.vidas; M.info = null; C.destaque = null; canvas.style.filter = ''
  // o reino final iluminado: tarde dourada, sem dessaturar
  C.mudarHora('afternoon', C.menos)
  montarReino(false); C.vidas = 1; C.fimDeJogo = true
  Som.tocar('fimDePartida'); Musica.momento('fim')
  const pronto = () => { const f = M.fim; if (!f || f.contou) return; f.mostra = n; f.contado = true; f.contou = true; guardarFim(true); UI.mudou() }
  J.pularFim = () => { semTimers(); if (M.fim) M.fim.parado = true; pronto() }
  if (parado) { if (!direto) depois(500, () => Som.tocar(reg.novoRecorde ? 'recorde' : 'nivelPequeno')); pronto(); return }
  for (let i = 1; i <= passos; i++) depois(450 + i * 70, () => { M.fim.mostra = Math.round((n * i) / passos); M.fim.pulo = agoraMs(); Som.tocar('rankingSobe', { tom: i % 12 }) })
  depois(tFaixa, () => {
    M.fim.mostra = n; M.fim.contado = true
    if (reg.novoRecorde) { Som.tocar('recorde'); C.flash('#FFD248', 250); for (const dx of [-0.3, 0, 0.3]) C.efeito('confetti', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.35); for (const dx of [-0.22, 0.24]) C.efeito('fireworks', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.2) } else Som.tocar('nivelPequeno')
  })
  if (reg.novoRecorde) depois(tFaixa + 450, () => { for (const dx of [-0.2, 0.2]) C.efeito('confetti', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.3) })
  depois(tSobe, () => Som.tocar('espolio'))
  depois(tBotoes, pronto)
  UI.mudou()
}
/** As festas da luta (letreiros) não entram no fim; conquista e carta nova continuam na fila e aparecem depois da sequência. */
function limparFestasDeLuta() { F.fila = F.fila.filter((f) => f.aposEspolio); if (F.atual) { M[F.atual.tipo] = null; if (F.atual.log) F.atual.log.fim = agoraMs(); F.atual = null } }
/** SHARE: o cartão de dia com "BEAT MY N ROUNDS" + o link da mesma estrada (`?semente=` e as rodadas a bater). Ignora toque repetido. */
async function postar() {
  const f = M.fim; if (!f || J.postando || cedoDemais(J.postouEm)) return
  J.postando = true; J.postagens = (J.postagens || 0) + 1
  Som.tocar('toque')
  const url = linkDaEstrada(f.semente, f.vencidas), texto = T.postarTexto(f.vencidas, url)
  J.link = url; J.postou = ''
  let como = 'falhou'
  try { como = await compartilhar(cartaoDoReino(C, { rodadas: f.vencidas, pontos: f.pontos, recorde: f.novoRecorde, titulo: T.jogo, url }), { texto, url }) } finally { J.postando = false; J.postouEm = agoraMs() }
  J.postou = como
  if (como === 'baixou+link') festa({ tam: 1, tipo: 'brinde', ms: 2200, titulo: T.postar, texto: T.copiado, icone: { tipo: 'carta' } })
}

// ---------------------------------------------------------------- toques
let arrasto = null
function aoTocar(id, d, ev) {
  if (!id.includes(':') && J.sujo && id !== 'menu') { J.sujo = false; if (!discoIgual() && sincronizar()) return } // outra aba andou com a partida
  if (id.startsWith('aperta:carta')) { arrasto = { indice: d.indice, x0: ev.clientX, y0: ev.clientY, id: ev.pointerId, moveu: false }; return }
  if (id.startsWith('entra:terreno')) { if (M.fase === 'carta' && M.sel >= 0 && C.destaque && CONFIG.CARTAS[M.mao[M.sel].carta].tipo === 'construcao') C.destaque.vizinhos = C.destaque.terrenos.has(d.terreno) ? vizinhosDe(d.terreno) : new Set(); return }
  if (id.includes(':')) return
  if (id.startsWith('carta')) { selecionar(d.indice); UI.mudou(); return }
  if (id.startsWith('terreno')) {
    if (M.fase === 'terreno') { terrenoDoEspolio(d.terreno); return }
    if (M.fase !== 'carta') return
    if (M.sel >= 0 && !M.cartaPosta) { por(d.terreno); return }
    const t = J.v.terrenos[d.terreno - 1]; Som.tocar('toque')
    if (t) dizer([`#${CONFIG.CARTAS[t.carta].nome} - ${T.nivel} ${t.nivel}`, CONFIG.CARTAS[t.carta].texto], 4000); else M.info = null
    return
  }
  if (id.startsWith('espolio')) { escolherEspolio(d.espolio); return }
  if (id === 'lutar' || id === 'lutar2') lutar()
  else if (id === 'sortear') armar('sortear', sortear)
  else if (id === 'consertar') armar('consertar', consertar)
  else if (id === 'vel') { Bat.vel = Bat.vel === 1 ? 2 : Bat.vel === 2 ? 4 : 1; M.vel = Bat.vel; Guarda.set('vel', Bat.vel); Som.tocar('toque'); UI.mudou() }
  else if (id === 'som') { M.mudo = Som.alternarMudo(); Som.tocar('toque') }
  else if (id === 'menu') { Som.tocar('toque'); Telas.menu() }
  else if (id === 'voltar') { M.fase = 'vitoria'; M.trocar = 0; M.info = null; C.destaque = null; Som.tocar('toque'); UI.mudou() }
  else if (id === 'seguir') seguir()
  else if (id === 'denovo') { Som.tocar('toque'); novaPartida() }
  else if (id === 'postar') postar()
  else if (id === 'dica-vidas') { Som.tocar('toque'); dizer(['#' + T.dica.vidas(J.v.vidasMax)]) }
  else if (id === 'dica-pinos') { Som.tocar('toque'); dizer(['#' + T.dica.chefe(CONFIG.HORDA.chefeACada)]) }
  else if (id === 'dica-ganhe') { Som.tocar('toque'); dizer(['#' + T.dica.ganhe, ...M.espolioDesc.map((x) => `${x.titulo}: ${x.texto}`)], 6500) }
  else if (id === 'horda') { Som.tocar('toque'); sobreAHorda() }
  else if (id === 'reliquias') sobreAsReliquias()
}
addEventListener('pointermove', (ev) => {
  if (!arrasto || ev.pointerId !== arrasto.id || M.fase !== 'carta' || M.cartaPosta) return
  const e = C.css, r = canvas.getBoundingClientRect()
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
  if (k && M.sel === a.indice) por(k, true) // arrastar até o terreno já é a confirmação
}
addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar)
addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { if (Telas.aberta()) Telas.fechar(); else if (M.sel >= 0) { selecionar(-1); UI.mudou() } } })
// nada toca antes do primeiro toque ou tecla
for (const tipo of ['pointerdown', 'keydown', 'touchend', 'click']) addEventListener(tipo, () => Som.destravar(), { capture: true })
// "voltar" do navegador não sai do jogo: fecha o painel aberto; na partida, pergunta antes de sair
let saindo = false
function ligarVoltar() {
  try { history.pushState({ keepmile: 1 }, '') } catch { return }
  addEventListener('popstate', () => {
    if (saindo) return
    try { history.pushState({ keepmile: 1 }, '') } catch { /* ok */ }
    if (Telas.aberta()) Telas.fechar(); else Telas.sair(() => { saindo = true; history.go(-2) })
  })
}

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
    if (M.fase === 'luta') { M.forca = { aliados: Bat.aliados, inimigos: Bat.inimigos }; M.resumo = resumoDaLuta() }
    if (M.info && agora > J.infoAte) { M.info = null; M.relSel = -1 }
    festasTique(agora)
    if (M.ouro !== J.ouroAlvo && agora - ouroEm > 55) { ouroEm = agora; const d = J.ouroAlvo - M.ouro; M.ouro += Math.sign(d) * Math.max(1, Math.floor(Math.abs(d) / 6)); if (d > 0 && M.fase !== 'vitoria') Som.tocar('ouro', { tom: M.ouro % 8 }) }
    UI.novoQuadro(); C.desenhar(agora, dt, dtAnim)
    UI.desenhar(agora)
  } catch (err) { if (!J.erros.includes(String(err))) { J.erros.push(String(err)); console.error(err) } }
  CUSTO[nq % 600] = performance.now() - t0; nq++
}
function ajustar() { C.ajustar(innerWidth, innerHeight); if (UI) { UI.mudou(); if (J.e && (M.fase === 'carta' || M.fase === 'fim')) { montarReino(M.fase === 'carta'); if (M.fase === 'fim') C.vidas = 1 } } }

/** (teste) O maior número de invasores do MESMO tipo desenhados na mesma região da estrada. */
function maxTipoVisivel() {
  const cont = new Map(), ids = new Map(); let m = 0
  for (let i = 0; i < C.n; i++) { if (C.lado[i] !== 1 || C.est[i] !== 1 || C.oculto[i] || C.peca[i].w > 60) continue; if (!ids.has(C.peca[i])) ids.set(C.peca[i], ids.size); const k = Math.max(0, Math.min(7, Math.floor((C.xDe(i) + 100) / 100))) * 64 + ids.get(C.peca[i]); const n = (cont.get(k) || 0) + 1; cont.set(k, n); if (n > m) m = n }
  return m
}
// ---------------------------------------------------------------- começo
/** Link de amigo: `?semente=` (a estrada) e `&rodadas=` (quantas ele aguentou). */
function lerLink() {
  const s = Q.get('semente'); if (!s) return null
  const n = /^\d{1,3}$/.test(Q.get('rodadas') || '') ? Number(Q.get('rodadas')) : null
  return { semente: s.slice(0, 40), rodadas: n }
}
/** O link vale UMA partida: depois de lido, some do endereço (recarregar não recomeça a estrada do amigo). */
function limparEndereco() {
  try { const u = new URL(location.href); u.searchParams.delete('semente'); u.searchParams.delete('rodadas'); history.replaceState(history.state, '', u.href) } catch { /* ok */ }
}
/** O que abrir: `nova=1` (teste) força partida nova com a semente do endereço e o álbum do aparelho; link de amigo abre a MESMA
 *  ESTRADA (pergunta antes, se há partida em curso, e guarda a partida num segundo espaço); senão a tela de fim guardada, a partida
 *  em curso ou uma partida nova. */
function comecarPartida() {
  if (Q.get('nova') === '1') { novaPartida({ semente: Q.get('semente') }); return }
  const link = lerLink(), salva = Guarda.partidaSalva(), fimS = Guarda.fimSalvo()
  if (link) {
    limparEndereco()
    if (salva && salva.desafio && salva.semente === link.semente && retomar(salva)) return // o mesmo link de novo: a estrada do amigo continua
    if (salva && salva.comandos.length && retomar(salva)) { Telas.amigo(link, !!salva.desafio, () => aceitarAmigo(link)); return }
    novaPartida({ desafio: link }); return
  }
  if (fimS && retomarFim(fimS)) return
  if (!(salva && retomar(salva))) novaPartida()
}
/** Aceitou a estrada do amigo no meio de uma partida: a partida em curso vai para o segundo espaço e volta depois (Play again). */
function aceitarAmigo(link) {
  salvar()
  const minha = Guarda.partidaSalva()
  if (minha && !minha.desafio) Guarda.guardarOutra(minha)
  novaPartida({ desafio: link })
}
async function comecar() {
  const guardado = Guarda.get('menos')
  await Arte.carregar(CONFIG)
  C.ajustar(innerWidth, innerHeight)
  Bat = criarBatalha(C, CONFIG, Som, expandirHorda); Bat.vel = [1, 2, 4].includes(Guarda.get('vel')) ? Guarda.get('vel') : 1
  UI = criarInterface(C, CONFIG, camada, aoTocar); M = UI.M
  Bat.aoAviso = (tipo, dado) => {
    if (tipo === 'noite') festa({ tam: 1, tipo: 'aviso', ms: 1500, texto: T.noite, sub: T.noiteSub(CONFIG.BATALHA.multNoite / 100), fase: 'luta' }) // o texto diz o que o motor faz (multNoite do config)
    if (tipo === 'ultimo') festa({ tam: 2, tipo: 'aviso', ms: 1500, texto: T.ultimo, ouro: true, k: kAviso(), fase: 'luta' })
    if (tipo === 'chefe') { const c = CONFIG.CHEFES.find((x) => x.id === dado); festa({ tam: 2, tipo: 'aviso', ms: 1600, texto: c.nome, ouro: true, k: kAviso(), fase: 'luta' }) }
    if (tipo === 'chefeCaiu') { const c = CONFIG.CHEFES.find((x) => x.id === dado); if (c) festa({ tam: 3, tipo: 'aviso', ms: 1100, texto: T.caiu(c.nome.split(' the ')[0]), ouro: true, k: 2, fase: 'luta' }) } // festa grande: título ×2 também no celular (quebra em duas linhas)
  }
  Telas = criarTelas({ CONFIG, Arte, Guarda, Som, Musica, menos: (v) => { if (v !== undefined) { menos(v); Guarda.set('menos', !!v) } return C.menos }, novaPartida, emPartida: () => M.fase !== 'fim', aoFechar: () => { UI.focar(); if (M.fase !== 'fim') Musica.momento(M.fase === 'luta' ? 'batalha' : J.v.vidas === 1 ? 'porUmFio' : 'construir'); else Musica.momento('fim') } })
  menos(guardado ?? matchMedia('(prefers-reduced-motion: reduce)').matches)
  addEventListener('resize', ajustar)
  // retoma a partida guardada (a não ser que o endereço peça outra estrada ou `nova=1`)
  comecarPartida()
  // duas abas na MESMA partida: quando a outra anda, esta percebe e recarrega o estado antes de aceitar jogada
  Guarda.aoMudarPartida(() => { J.sujo = true })
  ligarVoltar()
  requestAnimationFrame(quadro)
  if (TESTE) {
    const { ligarGanchos } = await import('./teste.js')
    await ligarGanchos({ J, M: () => M, C, Bat: () => Bat, UI: () => UI, F, Som, Musica, Guarda, Arte, CONFIG, QUADROS, CUSTO, nq: () => nq, lutar, novaPartida, abrirRodada, fimDaPartida, mandar, ler, preencher, aoFimDaLuta, semTimers, limparFestas, festa, reproduzir, resultado, montarExercito, expandirHorda, cartaoDoReino, seguir, menos, CONTORNO, maxTipoVisivel })
  }
  document.documentElement.dataset.pronto = '1'
}
comecar()
