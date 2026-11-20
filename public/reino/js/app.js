// Keepmile — o jogo na tela, modo LOCAL (o motor roda no navegador). A tela não tem regra: lê `visao`/`opcoes` e só manda
// comandos de `opcoes(estado).comandos`. A lista de comandos refaz a partida inteira (`reproduzir`) — é assim que a partida em curso
// fica guardada e volta depois de recarregar.
import * as CONFIG from '../../../shared/reino/config.js'
import { aplicar, criarPartida, opcoes, reproduzir, resistiu, resultado, visao } from '../../../shared/reino/partida.js'
import { conquistasDoPasso } from '../../../shared/reino/conquistas.js'
import { expandirHorda, montarExercito } from '../../../shared/reino/batalha.js'
import { Musica, Som } from '../som-reino.js'
import * as Arte from './arte.js'
import { criarBatalha } from './batalha-tela.js'
import { CONTORNO, criarCena } from './cena.js'
import { cartaoDoReino, compartilhar, linkDaEstrada } from './fim.js'
import { Guarda } from './guarda.js'
import { criarInterface } from './interface.js'
import { Srv } from './servidor.js'
import { ligaDe, mediaDasMelhores } from './ligas.js'
import { criarTelas } from './telas.js'
import { CONQUISTAS, T } from './textos.js'

const Q = new URLSearchParams(location.search)
const TESTE = Q.get('teste') === '1'
const canvas = document.getElementById('cena'), camada = document.getElementById('toques')
const C = criarCena(canvas, CONFIG)
C.aoSom = (nome, x = C.VW / 2, opc = {}) => { if (nome) Som.tocar(nome, { pan: Math.max(-0.8, Math.min(0.8, (x / C.VW) * 2 - 1)), ...opc }) } // R35: som da cena no quadro certo, com posição estéreo leve
const J = { familias: [], e: null, v: null, op: null, comandos: [], semente: null, liberadas: [], ouroAlvo: 0, pos: null, ultimaLuta: null, lutas: [], espolioI: -1, conqPend: [], festasDoReino: 0, anunciado: '', avisado: '', erros: [], chefesVistos: new Set(), emLuta: false, link: '', postou: '', infoAte: 0 }
let UI, M, Bat, Telas
// MODO SERVIDOR (js/servidor.js): a partida mora no servidor. `J.v`/`J.op` são a `visao`/`opcoes` que ELE mandou; `J.e` vira só { fase }.
const S = { on: false, id: null, modo: null, seq: 0, ocupado: false, abrindo: false, ultimo: null, energia: null, perfil: null, resultado: null, fora: null, novid: null, fimVisto: null, ligas: null, sessaoNova: false }
const timers = new Set()
const depois = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }
const semTimers = () => { for (const id of timers) clearTimeout(id); timers.clear() }
const agoraMs = () => performance.now()

// ---------------------------------------------------------------- motor
function ler() { if (S.on) return; J.v = visao(J.e); J.op = opcoes(J.e) }
/** A partida em curso fica guardada a cada passo: semente + cartas liberadas + comandos (o motor refaz). */
function salvar() { if (S.on) return; Guarda.salvarPartida(J.e && J.e.fase !== 'fim' && J.comandos.length ? { semente: J.semente, liberadas: J.liberadas, comandos: J.comandos, emLuta: J.emLuta, desafio: J.desafio, melhor: J.melhor, ...regraGuardada() } : null) }
/** R46: a regra da partida fica guardada junto dela (só quando é ≥ 2: partida antiga guardada, sem o campo, continua na regra 1). */
const regraGuardada = () => (J.regra >= 2 ? { regra: J.regra } : {})
/** FIM GUARDADO NA HORA em que o motor decide (antes de animar a luta): pontos, recorde e melhores partidas, uma vez só por partida.
 *  A partida terminada fica no aparelho até o Play again: recarregar volta para a tela de fim dela. */
function registrarFim() {
  if (J.fimReg) return J.fimReg
  if (S.on) return (J.fimReg = fimDoServidor())
  const r = resultado(J.e), rodadasAntes = Math.max(0, ...Guarda.get('melhores').map((m) => m.vencidas || 0)) // a partida mais comprida entre as melhores guardadas
  J.fimReg = { ...Guarda.partida({ pontos: r.pontos, vencidas: r.vencidas, rodada: r.rodada, semente: J.semente }), rodadasAntes }
  guardarFim()
  return J.fimReg
}
function guardarFim(visto = false) {
  // modo servidor: no aparelho fica só QUAL partida terminada está à vista (e o que a placa dizia); a partida vem do servidor
  if (S.on) { if (S.id && !J.replay) Srv.guardarFim({ id: S.id, visto, reg: J.fimReg, melhor: J.melhor || null }); return }
  Guarda.salvarFim({ semente: J.semente, liberadas: J.liberadas, comandos: J.comandos, reg: J.fimReg, desafio: J.desafio, melhor: J.melhor, visto, ...regraGuardada() })
}
/** O que está guardado no aparelho é a partida desta aba? (outra aba pode ter jogado a MESMA partida) */
function discoIgual() {
  if (S.on || J.e.fase === 'fim') return true
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
const mesmoComando = (c, cmd) => c.tipo === cmd.tipo && (c.carta ?? null) === (cmd.carta ?? null) && (c.terreno ?? null) === (cmd.terreno ?? null) && (c.indice ?? null) === (cmd.indice ?? null) && (c.a ?? null) === (cmd.a ?? null) && (c.b ?? null) === (cmd.b ?? null)
/** Manda um comando ao motor. Só aceita o que está em `opcoes(estado).comandos`. Devolve os eventos ou null. */
function mandar(cmd, entao = null) {
  if (S.on) { S.ultimo = mandarAoServidor(cmd, entao); return null }
  if (!discoIgual() && sincronizar()) { Som.tocar('negado'); return null }
  const valido = J.op.comandos.some((c) => mesmoComando(c, cmd))
  const r = valido ? aplicar(J.e, cmd) : { ok: false }
  if (!r.ok) { Som.tocar('negado'); return null }
  const antes = J.e
  J.e = r.estado; J.comandos.push(cmd); ler()
  // R39: as conquistas do passo saem da MESMA regra do servidor (shared/reino/conquistas.js); ficam à espera até a tela chegar lá
  // (a luta ainda vai passar) e só então são guardadas no aparelho e festejadas — `soltarConquistas`
  J.conqPend.push(...conquistasDoPasso({ antes, depois: J.e, eventos: r.eventos, comandos: J.comandos, rodadasAntes: Guarda.get('rodadas'), tem: [...Guarda.get('conquistas'), ...J.conqPend] }))
  if (J.e.fase === 'fim') registrarFim()
  salvar()
  if (entao) entao(r.eventos)
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
  f.t0 = agora; if (F.fila.length >= 2 && !f.conq && !f.mais) f.ms = Math.round(f.ms * 0.7) // fila comprida anda mais depressa
  F.atual = f; M[f.tipo] = f; f.ao?.()
  if (f.voltou && f.log) { f.log.fim = 0; f.log.voltou = agora; return } // a mesma festa, de volta depois do chefe: não conta duas vezes
  f.log = { texto: f.texto, titulo: f.titulo ?? null, tam: f.tam, tipo: f.tipo, ini: agora, fim: 0, fase: M.fase }; F.log.push(f.log); if (F.log.length > 80) F.log.shift()
}
const kAviso = () => (C.tipo === 'celular' ? 1 : 2)

// ---------------------------------------------------------------- festas pequenas e médias
function conquista(id, doServidor = false) {
  if (S.on ? !doServidor : !Guarda.conquista(id)) return // modo servidor: quem diz que a conquista veio é ele (`novidades`)
  const c = CONQUISTAS.find((x) => x.id === id)
  // R41 — O AVISO DA CONQUISTA: placa com a medalha e o nome, 1,5 s, com a batida de sempre. Fila curta: no máximo 3 à espera; as outras
  // viram uma placa só, "+N MORE" (todas ficam guardadas e aparecem na lista com o selo NEW)
  const som = () => { Som.tocar('conquista'); if (!C.menos) C.efeito('confetti', C.VW / 2 + C.cam.x, 60) }
  if (F.fila.filter((f) => f.conq).length >= MAX_AVISOS) {
    let m = F.fila.find((f) => f.mais)
    if (!m) { m = { tam: 2, tipo: 'brinde', ms: AVISO_CONQUISTA, aposEspolio: true, titulo: T.conquista, texto: '', mais: 0, icone: { tipo: 'conquista' }, ao: som }; festa(m) }
    m.mais++; m.texto = T.maisConquistas(m.mais)
    return
  }
  festa({ tam: 2, tipo: 'brinde', ms: AVISO_CONQUISTA, aposEspolio: true, conq: id, titulo: T.conquista, texto: c.nome, icone: { tipo: 'conquista', nome: c.nome, conquista: c }, ao: som })
}
const AVISO_CONQUISTA = 1500, MAX_AVISOS = 3
/** (modo local) Guarda e festeja as conquistas que o motor já deu e a tela ainda não mostrou. `so`: filtro (as outras continuam à espera). */
function soltarConquistas(so = null) {
  if (S.on) return
  const agora = so ? J.conqPend.filter(so) : J.conqPend.slice()
  J.conqPend = so ? J.conqPend.filter((id) => !so(id)) : []
  for (const id of agora) conquista(id)
}
/** (modo local) Os degraus de rodadas somadas que o aparelho JÁ tinha antes da R39 ligam sem festa e sem data (como a migração do servidor). */
function ligarDegrausGuardados() {
  const tem = Guarda.get('conquistas'), rodadas = Guarda.get('rodadas')
  const novas = Object.entries(CONFIG.CONQUISTAS.rodadasSomadas).filter(([id, meta]) => rodadas >= meta && !tem.includes(id)).map(([id]) => id)
  if (novas.length) Guarda.set('conquistas', [...tem, ...novas])
}
/** R39: o reino resistiu? O servidor (ou o motor) diz em `venceu`; servidor antigo sem o campo: a MESMA regra do motor, pelas rodadas vencidas. */
const venceuDe = (o) => (o && typeof o.venceu === 'boolean' ? o.venceu : resistiu(o?.vencidas ?? 0))
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
    // no prelúdio, de cada tipo aparecem no máximo os REPRESENTANTES da cena (`C.repMax`); o número real fica na plaqueta "xN"
    const porTipo = {}; for (const t of fila) porTipo[t] = 1
    for (const t of v.horda.ordem) { if (fila.length >= Math.min(cabem, v.horda.ordem.length)) break; if (t !== v.horda.chefe && porTipo[t] < (C.repMax || cabem)) { porTipo[t]++; fila.push(t) } }
    fila.slice(0, cabem).forEach((t, i, a) => { const chefe = t === v.horda.chefe; C.nascer(1, t, chefe ? -30 : -6 - (i * (C.VW < 500 && C.tipo === 'pc' ? 22 : 46)) / Math.max(1, a.length) - (i % 2) * 4, 1, chefe ? 0.3 : ((i * 5) % 7) / 3.5 - 0.9, 0) })
  }
}
/** A MÃO CHEGA VIRADA e vira em cascata (os tempos estão na interface: `UI.REVELA`): um som por carta. Reduced motion: já chega aberta, sem som extra. */
function maoNova(atraso = 0) {
  M.maoT0 = agoraMs() + atraso; M.maoRevelada = !!C.menos; M.maoLog = []
  if (C.menos) return
  const t0 = M.maoT0, R = UI.REVELA
  for (let i = 0; i < 3; i++) depois(atraso + R.espera + i * R.passo + (R.vira >> 1), () => { if (M.fase === 'carta' && M.maoT0 === t0 && !M.cartaPosta) { Som.tocar('toque', { tom: i * 2 }); Som.tocar('cartaVira', { tom: i, pan: (i - 1) * 0.5 }); const c = M.mao[i] && CONFIG.CARTAS[M.mao[i].carta]; if (c && CONFIG.RARIDADES.findIndex((x) => x.id === c.raridade) >= 2) Som.tocar('cartaRara', { pan: (i - 1) * 0.5 }) } })
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
  // R31: a chance da bolsa é a do motor (`visao.chanceReliquia`); a bolsa já sorteada SEM relíquia dá só o ouro (chance dela = 0: não se mostra %)
  const ch = v.chanceReliquia, E = CONFIG.ESPOLIOS
  return v.espolios.map((e) => e.tipo === 'carta' ? { titulo: CONFIG.CARTAS[e.carta].nome, texto: CONFIG.CARTAS[e.carta].texto }
    : e.reliquia ? { titulo: CONFIG.RELIQUIAS[e.reliquia].nome, texto: CONFIG.RELIQUIAS[e.reliquia].texto + (e.tipo === 'bolsa' && ch ? ' ' + T.bolsaSorte(ch) : '') }
      : e.tipo === 'promocao' ? { titulo: E.promocao.nome, texto: E.promocao.texto } : { titulo: `${E.bolsa.nome} +${e.ouro} ${T.ouro}`, texto: T.bolsaSo })
}
function preencher() {
  const v = J.v, op = J.op
  M.vidas = v.vidas; M.vidasMax = v.vidasMax; M.rodada = v.rodada; M.meta = CONFIG.PARTIDA.rodadaDaVitoria; M.venceu = venceuDe(v)
  M.proximoChefe = v.proximoChefe; M.cartaPosta = v.cartaPosta
  M.mao = v.oferta.map((o) => { const n = nivelNaMao(o.carta); return { carta: o.carta, nivel: n ? n + 1 : 1, sobe: n > 0 } })
  const visivel = v.vidas < v.vidasMax && v.fase === 'carta'
  // guia do ouro parado: sempre que há vida perdida e ouro para consertar, o botão chama a atenção (qualquer rodada; mais forte na última vida)
  M.sortear = op.sortear; M.consertar = { ...op.consertar, visivel, destaque: visivel && op.consertar.pode, forte: visivel && op.consertar.pode && v.vidas === 1 }
  M.espolios = v.espolios; M.espolioPode = v.espolios.map((_, i) => op.comandos.some((c) => c.tipo === 'espolio' && c.indice === i)); M.espolioDesc = descreverEspolios(v)
  M.mudo = Som.mudo(); M.vel = Bat.vel; M.reliquias = v.reliquias.slice()
  // R31: as chances da mão são as do motor (modo local) ou as que o servidor mandou — só as raridades que podem sair agora (chance > 0)
  M.chances = (v.chances || []).filter((r) => r.chance > 0).map((r) => ({ id: r.id, nome: r.nome, chance: r.chance, cor: Arte.Cod.RARIDADE_COR[r.id].cor, claro: Arte.Cod.RARIDADE_COR[r.id].claro }))
  // famílias à vista: quantos terrenos de cada uma e quantos ligam o bônus (números do config)
  const cont = contaFamilias()
  M.familias = Object.keys(cont).map((id) => ({ id, n: cont[id], precisa: precisaDe(id), ligada: v.familias.includes(id) }))
  for (const id of v.familias) if (!J.familias.includes(id)) { const f = CONFIG.FAMILIAS[id]; festa({ tam: 2, tipo: 'aviso', ms: 2600, texto: T.bonus(f.nome), sub: f.texto, ouro: true, k: kAviso(), ao: () => Som.tocar('nivelPequeno') }) }
  J.familias = v.familias.slice()
}
function abrirRodada() {
  ler(); preencher()
  const v = J.v
  M.fase = 'carta'; M.sel = -1; M.armado = null; M.trocar = 0; M.info = null; M.infoSel = null; M.vitoria = null; M.derrota = null; M.maoT0 = agoraMs() + 150; M.maoRevelada = true; M.pulsaLutar = v.cartaPosta
  M.primeira = v.rodada === 1 && v.terrenos.every((t) => !t); C.destaque = null; J.ouroAlvo = v.ouro
  // R46 — REVANCHE: o motor (ou o servidor) diz se a troca grátis está valendo e qual par vence (`visao.revanche`; servidor antigo
  // ou partida de regra 1: o campo não existe e a tela não mostra nada)
  M.revanche = v.revanche?.troca && J.op.comandos.some((c) => c.tipo === 'trocar') ? { ativa: true, marcado: 0, dica: null, dicaDoMotor: v.revanche.dica ? { a: v.revanche.dica.a, b: v.revanche.dica.b } : null, t0: agoraMs(), feita: 0 } : null
  canvas.style.filter = ''
  C.mudarHora(Arte.horaDaRodada(v.rodada), false, v.rodada); Musica.rodada(v.rodada) // a rodada vai direto para a cena (trecho da estrada)
  montarReino(); Som.tocar('cartaAparece')
  const chave = v.rodada + ':' + v.vidas
  if (v.horda.chefe && J.anunciado !== chave) {
    // anúncio inteiro só na 1ª vez de cada chefe na partida; nas repetições, a versão curta (0,8 s)
    const curto = J.chefesVistos.has(v.horda.chefe); J.chefesVistos.add(v.horda.chefe)
    J.anunciado = chave; M.fase = 'chefe'; M.chefe = { id: v.horda.chefe, t0: agoraMs(), curto, texto: T.comUnidade(CONFIG.CHEFES.find((x) => x.id === v.horda.chefe).texto) }
    Som.tocar('chefeAnuncia', curto ? { forca: 0.6 } : {}); Musica.momento('chefe')
    depois(curto ? 800 : 3200, () => { if (M.fase === 'chefe') seguir() })
  } else {
    maoNova(150); anunciarRevanche()
    Musica.momento(v.horda.chefe ? 'chefe' : v.vidas === 1 ? 'porUmFio' : 'construir')
    if (v.proximoChefe.avisado && !v.horda.chefe && J.avisado !== chave) { J.avisado = chave; const c = CONFIG.CHEFES.find((x) => x.id === v.proximoChefe.chefe); festa({ tam: 1, tipo: 'aviso', ms: 3200, texto: T.emRodadas(v.proximoChefe.rodada - v.rodada), sub: `${c.nome}: ${T.comUnidade(c.texto)}`, k: 1, fase: 'carta' }) }
    // véspera do chefe com vida perdida e ouro parado: um lembrete de 1 linha
    if (!v.horda.chefe && v.proximoChefe.rodada - v.rodada === 1 && M.consertar.destaque) dizer(['#' + T.chefeAmanha(M.consertar.custo)], 7000)
  }
  M.setaCarta = M.primeira && !Guarda.get('dica') && !J.tocouCarta
  UI.mudou()
}
// ---------------------------------------------------------------- R46: revanche (a troca grátis de 2 terrenos)
/** A faixa da revanche entra agora (depois do anúncio do chefe, se houve): a dica chega com o som dela. */
function anunciarRevanche() {
  const R = M.revanche; if (!R || !R.ativa) return
  R.t0 = agoraMs()
  if (!R.dicaDoMotor) return
  // a DICA (o par aceso, a linha da faixa e o som dela) só entra depois que a fanfarra da derrota acabou
  const acender = () => { if (M.revanche !== R || !R.ativa || R.dica) return; R.dica = R.dicaDoMotor; Som.tocar('dica'); UI.mudou() }
  const espera = (J.derrotaEm || -1e9) + DICA_DEPOIS_DA_DERROTA - agoraMs()
  if (espera > 0) depois(espera, acender); else acender()
}
const DICA_DEPOIS_DA_DERROTA = 1500
/** A troca está à vista e os terrenos respondem a ela? (sem carta da mão escolhida: com carta, o toque no terreno põe a carta) */
const revancheAberta = () => M.fase === 'carta' && !!M.revanche?.ativa && M.sel < 0 && !M.replay
const podeTrocar = (a, b) => J.op.comandos.some((c) => c.tipo === 'trocar' && ((c.a === a && c.b === b) || (c.a === b && c.b === a)))
/** Toque num terreno com a troca aberta: o 1º fica aceso (tocar de novo desmarca); o 2º manda a troca. Dois vazios não trocam. */
function marcarTroca(k) {
  const R = M.revanche
  if (R.marcado === k) { R.marcado = 0; Som.tocar('toque'); return }
  if (!R.marcado) { if (!J.op.comandos.some((c) => c.tipo === 'trocar' && (c.a === k || c.b === k))) { Som.tocar('negado'); return } R.marcado = k; R.marcadoEm = agoraMs(); M.info = null; Som.tocar('toque', { tom: 2 }); return }
  if (cedoDemais(R.marcadoEm)) return // toque repetido não confirma
  if (!podeTrocar(R.marcado, k)) { Som.tocar('negado'); dizer(['#' + T.revanche.vazios], 2500); return }
  trocarTerrenos(Math.min(R.marcado, k), Math.max(R.marcado, k))
}
const TROCA_MS = 350, TROCA_POUSO = 300
/** As peças dos dois terrenos cruzam de lugar na cena (peso: antecipa, arco, pouso com poeira); Reduced motion: no lugar, esmaecendo. */
function animarTroca(a, b) {
  C.trocar(a, b, { ms: TROCA_MS, some: C.menos })
  Som.tocar('troca')
  if (C.menos) return
  depois(TROCA_POUSO, () => { for (const k of [a, b]) { if (!C.terrenos[k - 1]) continue; const p = C.centroDoTerreno(k); C.efeito('dust', p.x + C.cam.x - 9, p.y + 4); C.efeito('dust', p.x + C.cam.x + 9, p.y + 5, true) } })
}
function trocarTerrenos(a, b) {
  const R = M.revanche
  mandar({ tipo: 'trocar', a, b }, () => {
    preencher(); montarReino()
    R.ativa = false; R.marcado = 0; R.dica = null; R.feita = agoraMs(); M.info = null
    animarTroca(a, b)
    depois(1250, () => { if (M.revanche === R) { M.revanche = null; UI.mudou() } })
    soltarConquistas(); UI.mudou()
  })
}
/** "KEEP AS IS": fecha a faixa e apaga os destaques nesta rodada (pôr carta e lutar seguem como sempre). */
function manterReino() { M.revanche = null; Som.tocar('toque'); UI.mudou() }

function zerarPartida() {
  semTimers(); Bat.parar(); limparFestas()
  J.comandos = []; J.lutas = []; J.conqPend = []; J.anunciado = ''; J.avisado = ''; J.ultimaLuta = null; J.familias = []; J.chefesVistos = new Set(); J.emLuta = false
  J.fimReg = null; J.melhor = null; J.desafio = null; J.sujo = false; J.relI = -1; J.infoPend = null; J.pularReino = null
  M.fim = null; M.selo = null; M.resumo = null; M.info = null; M.desafio = null; M.relSel = -1; M.revanche = null
  C.fimDeJogo = false; C.troca = null
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
  J.regra = CONFIG.PARTIDA.regra // R46: partida NOVA nasce com a regra do config (a guardada no aparelho continua com a dela)
  J.e = criarPartida({ semente: J.semente, cartasLiberadas: J.liberadas, regra: J.regra })
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
  try { r = reproduzir({ semente: p.semente, cartasLiberadas: p.liberadas, comandos: cmds, regra: p.regra }) } catch { return false }
  if (!r.ok || r.estado.fase === 'fim') return false
  zerarPartida(); Guarda.salvarFim(null)
  J.regra = p.regra ?? 1; J.semente = p.semente; J.liberadas = p.liberadas.slice(); J.e = r.estado; J.comandos = cmds.slice()
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
  try { r = reproduzir({ semente: f.semente, cartasLiberadas: f.liberadas, comandos: f.comandos, regra: f.regra }) } catch { return false }
  if (!r.ok || r.estado.fase !== 'fim' || !f.reg) return false
  zerarPartida()
  J.regra = f.regra ?? 1; J.semente = f.semente; J.liberadas = f.liberadas.slice(); J.e = r.estado; J.comandos = f.comandos.slice()
  J.desafio = f.desafio || null; M.desafio = J.desafio; J.melhor = f.melhor || null; J.fimReg = f.reg
  ler(); M.ouro = J.v.ouro; J.ouroAlvo = J.v.ouro
  fimDaPartida(!!f.visto)
  return true
}
/** Tela de espólio sem a batalha antes (partida retomada no meio da escolha). */
function mostrarEspolio() {
  preencher()
  M.fase = 'vitoria'; M.sel = -1; M.vitoria = { t0: agoraMs() - 1000, ouro: 0, ouroMostra: 0, pronto: true, prontoT0: agoraMs() - 1000, chefe: null, selo: null, mvp: null }
  C.mudarHora(Arte.horaDaRodada(J.v.rodada), true, J.v.rodada); J.ouroAlvo = J.v.ouro
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
  M.maoRevelada = true; M.maoT0 = 0 // tocar numa carta no meio da revelação mostra as três na hora (nunca se escolhe carta virada) e cala os sons de virada que faltavam
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
  mandar({ tipo: 'por', carta, terreno: k }, (evs) => {
    const novato = M.primeira && !Guarda.get('dica')
    preencher(); M.sel = -1; M.infoSel = null; M.info = null; M.trocar = 0; M.primeira = false; M.pulsaLutar = true
    montarReino(); eventosDeTerreno(evs)
    C.destaque = CONFIG.CARTAS[carta].tipo === 'construcao' ? { vizinhos: vizinhosDe(k) } : null
    if (C.destaque) depois(1600, () => { if (M.fase === 'carta' && M.cartaPosta) C.destaque = null })
    // dica única, na 1ª carta da 1ª partida: o que as vidas valem e quem luta
    if (novato) { Guarda.set('dica', true); dizer(['#' + T.dica.vidas(J.v.vidasMax), T.dica.tropas], 7000) }
    soltarConquistas(); UI.mudou()
  })
}
function armar(qual, fazer) {
  if (M.armado === qual) { if (cedoDemais(M.armadoEm)) return; M.armado = null; fazer(); return }
  M.armado = qual; M.armadoEm = agoraMs(); Som.tocar('toque'); depois(3000, () => { if (M.armado === qual) M.armado = null })
}
function sortear() {
  mandar({ tipo: 'sortear' }, () => {
    preencher(); M.sel = -1; M.infoSel = null; C.destaque = null; maoNova(); J.ouroAlvo = J.v.ouro
    Som.tocar('sortear'); UI.mudou()
  })
}
function consertar() {
  mandar({ tipo: 'consertar' }, () => {
    preencher(); J.ouroAlvo = J.v.ouro; C.vidas = estadoCastelo()
    Som.tocar('consertar'); const c = C.geo.castelo; C.efeito('heal', C.ox + c[0], C.oy + c[1]); C.efeito('level-ring', C.ox + c[0], C.oy + c[1])
    if (J.v.vidas > 1 && !J.v.horda.chefe) Musica.momento('construir')
    UI.mudou()
  })
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
  const pre = { terrenos: J.v.terrenos, reliquias: J.v.reliquias, rodada: J.v.rodada, venceu: venceuDe(J.v) }
  mandar({ tipo: 'batalhar' }, (evs) => {
    const bat = evs.find((x) => x.tipo === 'batalha')
    J.pos = { bat, ouro: evs.find((x) => x.tipo === 'ouro').valor, fim: evs.find((x) => x.tipo === 'fim') || null, pre }
    J.ultimaLuta = { motor: bat.vitoria, tela: null, rodada: pre.rodada, segundos: bat.segundos }
    J.emLuta = true; salvar()
    M.fase = 'luta'; M.sel = -1; M.infoSel = null; M.armado = null; M.trocar = 0; M.info = null; C.destaque = null
    canvas.style.filter = C.menos ? '' : 'saturate(1.1)'
    Musica.momento(bat.horda.chefe ? 'chefe' : 'batalha'); if (!rapido) Som.tocar('invasorChega')
    Bat.iniciar({ eventos: bat.eventos, horda: bat.horda, terrenos: pre.terrenos, exercito: montarExercito(pre.terrenos, pre.reliquias), segundos: bat.segundos, rodada: pre.rodada, painelCurto: UI.L.cel && pre.terrenos.filter(Boolean).length <= 2 }, aoFimDaLuta)
    if (rapido) Bat.pular()
    UI.mudou()
  })
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
    // R39 — O MOMENTO DO JOGO: esta luta fez o reino resistir (`venceu` passou de false para true). Uma vez só por partida.
    // R42: a rodada da vitória é luta de chefe — PRIMEIRO a queda dele ("... DOWN!" e o selo, `REINO_DEPOIS_DO_CHEFE` ms), DEPOIS a festa do reino
    const espera = bat.horda.chefe ? REINO_DEPOIS_DO_CHEFE : 0
    const reino = !pre.venceu && venceuDe(J.v) ? { t0: agoraMs() + espera, ms: FESTA_REINO, rodada: CONFIG.PARTIDA.rodadaDaVitoria, fim: false, bate: C.menos ? 0 : REINO_BATE, sai: REINO_SAI } : null
    if (reino) J.festasDoReino++
    M.fase = 'vitoria'; M.vitoria = { t0: agoraMs(), ouro, ouroMostra: 0, pronto: false, reino, chefe: bat.horda.chefe, chefeNome: chefe ? chefe.nome.split(' the ')[0] : null, selo: limpo ? T.limpo : um ? T.ultimo : null, mvp: nomeMvp ? `${T.resumo.mvp}: ${nomeMvp} ${R.dano[R.mvp]}` : null }
    preencher(); M.vidas = J.v.vidas
    Som.tocar('vitoria'); Musica.momento('vitoria'); C.flash(reino ? '#FFD248' : '#FFD9A0', 300)
    if (reino) depois(espera, () => { if (M.vitoria?.reino === reino && !reino.fim) festejarReino(reino) })
    if (!reino || (espera && !C.menos)) { // (Reduced motion na festa do reino: só a faixa)
      for (const dx of [-0.3, 0, 0.3]) C.efeito('confetti', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.3)
      if (chefe) for (const dx of [-0.2, 0.2]) C.efeito('fireworks', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.22)
    }
    // ouro contando, depois os 3 espólios viram cartas grandes
    // (R30) o ouro do HUD conta JUNTO com o letreiro, do que estava à vista até o número que o motor/servidor mandou (`J.v.ouro`)
    const passos = Math.min(ouro, 12), ouroDe = M.ouro, ouroPara = J.v.ouro, V = M.vitoria
    const pronto = () => { if (M.vitoria !== V || V.pronto) return; if (reino) reino.fim = true; V.ouroMostra = ouro; V.pronto = true; V.prontoT0 = agoraMs(); J.ouroAlvo = J.v.ouro; Som.tocar('espolio'); UI.mudou() }
    // a festa do reino segura os espólios até acabar; um toque (depois do primeiro instante) pula e devolve o controle na hora
    J.pularReino = reino ? () => { if (!cedoDemais(reino.t0)) pronto() } : null
    for (let i = 1; i <= passos; i++) depois(350 + i * 70, () => { if (V.pronto) return; M.vitoria.ouroMostra = Math.round((ouro * i) / passos); J.ouroAlvo = ouroDe + Math.round(((ouroPara - ouroDe) * i) / passos); if (i < passos) Som.tocar('ouroTique', { tom: i, pan: -0.5 }); else Som.tocar('ouro', { tom: 4 }) })
    depois(Math.max(450 + passos * 70 + 250, reino ? espera + reino.ms : 0), pronto)
    soltarConquistas((id) => id !== 'librarian') // R39: as da luta (a regra é a do módulo comum; a festa é a de sempre, depois do espólio)
    const nova = S.on ? null : Guarda.rodadaVencida(CONFIG.ALBUM) // modo servidor: a carta nova vem em `novidades`
    if (nova) festa({ tam: 2, tipo: 'brinde', ms: 2600, aposEspolio: true, titulo: T.cartaNova, texto: CONFIG.CARTAS[nova].nome, icone: { tipo: 'carta', id: nova }, ao: () => Som.tocar('cartaNova') })
    soltarConquistas()
  } else {
    const nome = res.quem ? (CONFIG.INVASORES[res.quem] || CONFIG.CHEFES.find((c) => c.id === res.quem))?.nome : null
    // derrota como "quase": o quanto da horda caiu é o número do motor (`pctHorda`); a mesma rodada volta com mais uma carta
    J.derrotaEm = agoraMs(); M.fase = 'derrota'; M.derrota = { t0: agoraMs(), linha: nome ? (res.tocouCastelo ? T.chegou(nome) : T.varreu(nome)) : T.derrota, pct: bat.pctHorda, deNovo: J.e.fase !== 'fim' }
    M.vidas = J.v.vidas; M.vidaSome = { i: J.v.vidas, ate: agoraMs() + 1200 }
    C.vidas = estadoCastelo(); C.casteloTreme = C.relogio + 600; C.tremer(6, 120)
    Som.tocar('casteloRacha'); depois(500, () => Som.tocar('vidaPerdida')); depois(900, () => Som.tocar('derrota'))
    Musica.momento('derrota'); if (!C.menos) canvas.style.filter = 'saturate(0.6)'
    J.ouroAlvo = J.v.ouro
    { const c = C.geo.castelo; C.estouro(C.ox + c[0], C.oy + c[1] - 40, 10, 8, 60) }
    depois(4500, () => { if (M.fase === 'derrota') seguir() })
  }
  soltarConquistas()
  if (S.on) festejarNovidades()
  UI.mudou()
}
/** R39 — A FESTA DO REINO (a rodada da vitória foi vencida): a faixa "ROUND N HELD!" (N = rodada da vitória do config; a interface desenha por `M.vitoria.reino`), fogos e
 *  confete em ondas enquanto ela dura, a fanfarra por cima do som de vitória. "Reduced motion": só a faixa e o som — sem flash (a cena
 *  já recusa), sem fogos, sem confete, sem tremida. Pulada com um toque: as ondas que faltavam não saem. */
const FESTA_REINO = 2200, REINO_BATE = 560, REINO_SAI = 1500, REINO_DEPOIS_DO_CHEFE = 900 // a contagem pousa no número (batida); depois a faixa encolhe e sai do campo
function festejarReino(R) {
  depois(R.bate || 420, () => { if (R.fim) return; Som.tocar('recorde'); C.tremer(4, 120) }) // a batida: fanfarra + tremida leve (a cena recusa a tremida com Reduced motion)
  if (C.menos) return
  // o número da rodada conta rolando até a rodada da vitória; os passos são de 40 ms, então o tique sai a cada 2 passos, de propósito (R43:
  // 4 notas subindo, uma a cada 80 ms, até a batida — 8 em 320 ms virava metralhadora e o motor engolia as coladas)
  for (let i = 2; i <= 8; i += 2) depois(200 + Math.round(((REINO_BATE - 200) * i) / 9), () => { if (!R.fim) Som.tocar('rankingSobe', { tom: i }) })
  const onda = (ms, nome, xs, y) => depois(ms, () => { if (R.fim || M.vitoria?.reino !== R) return; for (const dx of xs) C.efeito(nome, C.VW * (0.5 + dx) + C.cam.x, C.VH * y) })
  for (const dx of [-0.3, 0, 0.3]) C.efeito('confetti', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.3)
  for (const dx of [-0.24, 0.24]) C.efeito('fireworks', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.2)
  onda(380, 'fireworks', [-0.2, 0.22], 0.62); onda(700, 'confetti', [-0.18, 0.18], 0.34); onda(950, 'fireworks', [-0.32, 0.3], 0.24)
  onda(1300, 'fireworks', [0.1], 0.16); onda(1500, 'confetti', [-0.3, 0, 0.3], 0.3); onda(1750, 'fireworks', [-0.14, 0.26], 0.2)
}
function seguir() {
  if (M.fase === 'vitoria') { J.pularReino?.(); return }
  if (M.fase === 'chefe') { M.fase = 'carta'; M.chefe = null; maoNova(); anunciarRevanche(); if (J.infoPend) { dizer(J.infoPend, 5000); J.infoPend = null } UI.mudou(); return }
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
  mandar(cmd, (evs) => {
    Som.tocar('espolioEscolhe')
    const acabou = evs.find((x) => x.tipo === 'fim')
    if (acabou) { fimDaPartida(); return }
    abrirRodada(); eventosDeTerreno(evs); soltarConquistas()
  })
}

// ---------------------------------------------------------------- fim da partida (festa de tela cheia)
/** FIM COMO FESTA, em sequência: escurece a borda → o número de rodadas GRANDE no centro conta de 0 ao total com som → a faixa NEW
 *  RECORD cruza a tela com confete (sem recorde: o melhor momento da partida e quanto faltou) → sobe a placa (pontos, liga, próxima
 *  carta) → por fim os botões. `direto` (voltou à tela de fim já vista) e Reduced motion: tudo no lugar, sem movimento, com som. */
function fimDaPartida(direto = false) {
  semTimers(); Bat.parar(); limparFestasDeLuta(); ler()
  const r = S.on ? { vencidas: (S.resultado ?? J.v).vencidas, pontos: (S.resultado ?? J.v).pontos, ouroGanho: 0, vidas: J.v.vidas } : resultado(J.e), reg = registrarFim()
  const sit = S.on ? situacaoDoServidor() : null // modo servidor: posição, média e liga são as da temporada, vindas dele
  const media = sit ? sit.media : mediaDasMelhores(Guarda.get('melhores')), lg = sit ? { liga: {} } : ligaDe(media) // local: liga PROVISÓRIA do beta (js/ligas.js)
  J.emLuta = false; if (!S.on) Guarda.salvarPartida(null)
  const n = r.vencidas, passos = Math.min(n, 20), parado = C.menos || direto
  const tFaixa = 450 + passos * 70 + 250, tSobe = tFaixa + (reg.novoRecorde ? 1300 : 1000), tBotoes = tSobe + 450
  const m = J.melhor, falta = (reg.rodadasAntes ?? n) - n, am = J.desafio && J.desafio.rodadas != null ? J.desafio.rodadas : null
  M.fase = 'fim'; M.fim = {
    t0: agoraMs(), parado, tFaixa, tSobe, tBotoes, mostra: parado ? n : 0, vencidas: n, venceu: venceuDe(S.on ? S.resultado ?? J.v : r), pontos: r.pontos, ouro: r.ouroGanho, recorde: reg.recorde, recordeAntes: reg.antes, novoRecorde: reg.novoRecorde,
    contado: parado, contou: false,
    media, liga: sit ? sit.liga : { nome: lg.liga.nome, i: lg.i, pct: lg.pct, proxima: lg.proxima ? lg.proxima.nome : null, falta: lg.falta }, album: S.on ? albumDoServidor() : Guarda.proximaCarta(CONFIG.ALBUM), semente: J.semente,
    // o fecho: o melhor momento (do resumo das lutas), quanto faltou para a partida mais comprida e, na estrada de um amigo, quem levou
    melhor: m ? T.melhorLinha(m.nome, m.dano, m.rodada) : null, faltaLinha: reg.novoRecorde ? null : n === 0 ? T.semRodadas : falta > 0 ? null : T.rodadasPara(falta), // R31: "N ROUNDS TO YOUR BEST" repetia o recorde da placa
    amigo: S.on ? linhaDoModo(null) : am != null ? { texto: T.desafioFim(am, n), ganhou: n > am } : null,
  }
  if (!S.on) { const dg = degrauPerto(Guarda.get('rodadas'), Guarda.get('conquistas')); if (dg) { const t = T.degrauPerto(dg.nome.toUpperCase(), dg.falta); M.fim.gancho = Arte.largura(t, 'mini') <= (UI.L.cel ? C.VW - 40 : 190) ? t : T.degrauPertoCurto(dg.meta, dg.falta); M.fim.ganchoDegrau = dg } } // R41: um gancho a mais, no máximo (o do álbum já está na placa)
  if (S.on) { guardarFim(parado); depoisDoFim() }
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
    if (reg.novoRecorde) { Som.tocar('recorde'); C.flash('#FFD248', 250); for (const dx of [-0.3, 0, 0.3]) C.efeito('confetti', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.35); for (const dx of [-0.22, 0.24]) C.efeito('fireworks', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.2) } else if (M.fim.venceu) { Som.tocar('nivelGrande'); for (const dx of [-0.3, 0, 0.3]) C.efeito('confetti', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.35) } else Som.tocar('nivelPequeno') // R39: fim com vitória tem festa própria (sem flash), mesmo sem recorde
  })
  if (reg.novoRecorde) depois(tFaixa + 450, () => { for (const dx of [-0.2, 0.2]) C.efeito('confetti', C.VW * (0.5 + dx) + C.cam.x, C.VH * 0.3) })
  depois(tSobe, () => Som.tocar('espolio'))
  depois(tBotoes, pronto)
  UI.mudou()
}
/** R41 — GANCHO HONESTO: o degrau de rodadas somadas mais próximo que ainda falta, só quando falta pouco (`PERTO` rodadas). Sem relógio. */
const DEGRAU_PERTO = 10
function degrauPerto(rodadas, tem) {
  let melhor = null
  for (const c of CONQUISTAS) { if (!c.id.startsWith('tally') || tem.includes(c.id)) continue; const falta = c.meta - rodadas; if (falta > 0 && falta <= DEGRAU_PERTO && (!melhor || falta < melhor.falta)) melhor = { id: c.id, nome: c.nome, falta, meta: c.meta } }
  return melhor
}
/** As festas da luta (letreiros) não entram no fim; conquista e carta nova continuam na fila e aparecem depois da sequência. */
function limparFestasDeLuta() { F.fila = F.fila.filter((f) => f.aposEspolio); if (F.atual) { M[F.atual.tipo] = null; if (F.atual.log) F.atual.log.fim = agoraMs(); F.atual = null } }
/** SHARE: o cartão de dia com "BEAT MY N ROUNDS" + o link da mesma estrada (`?semente=` e as rodadas a bater). Ignora toque repetido. */
async function postar() {
  const f = M.fim; if (!f || J.postando || cedoDemais(J.postouEm)) return
  J.postando = true; J.postagens = (J.postagens || 0) + 1
  Som.tocar('toque')
  // modo servidor: a semente nunca vem para a tela, então o link é só o do jogo (sem "mesma estrada")
  const url = S.on ? location.origin + location.pathname : linkDaEstrada(f.semente, f.vencidas), texto = S.on ? T.srv.postar(f.vencidas, url) : T.postarTexto(f.vencidas, url)
  J.link = url; J.postou = ''
  let como = 'falhou'
  try { como = await compartilhar(cartaoDoReino(C, { rodadas: f.vencidas, pontos: f.pontos, recorde: f.novoRecorde, venceu: f.venceu, titulo: T.jogo, url }), { texto, url }) } finally { J.postando = false; J.postouEm = agoraMs() }
  J.postou = como
  if (como === 'baixou+link') festa({ tam: 1, tipo: 'brinde', ms: 2200, titulo: T.postar, texto: T.copiado, icone: { tipo: 'carta' } })
}

// ---------------------------------------------------------------- toques
let arrasto = null
function aoTocar(id, d, ev) {
  if (M.replay && id !== 'som') { // assistindo: sair, velocidade (x1/x2), som, pular para a luta e, no fim, ver de novo ou voltar
    if (id.includes(':')) return
    Som.tocar('toque')
    if (id === 'sair-replay' || id === 'voltar-replay') sairDoReplay()
    else if (id === 'vel') { Bat.vel = Bat.vel === 1 ? 2 : 1; M.vel = Bat.vel; Som.tocar('velocidade', { tom: Bat.vel === 2 ? 5 : 0 }); UI.mudou() }
    else if (id === 'pular-luta') pularParaLuta()
    else if (id === 'rever') reverReplay()
    return
  }
  if (!id.includes(':') && J.sujo && id !== 'menu') { J.sujo = false; if (!discoIgual() && sincronizar()) return } // outra aba andou com a partida
  if (id.startsWith('aperta:carta')) { M.maoRevelada = true; M.maoT0 = 0; arrasto = { indice: d.indice, x0: ev.clientX, y0: ev.clientY, id: ev.pointerId, moveu: false }; return }
  if (id.startsWith('entra:terreno')) { if (M.fase === 'carta' && M.sel >= 0 && C.destaque && CONFIG.CARTAS[M.mao[M.sel].carta].tipo === 'construcao') C.destaque.vizinhos = C.destaque.terrenos.has(d.terreno) ? vizinhosDe(d.terreno) : new Set(); return }
  if (id.includes(':')) return
  if (id.startsWith('carta')) { selecionar(d.indice); UI.mudou(); return }
  if (id.startsWith('terreno')) {
    if (M.fase === 'terreno') { terrenoDoEspolio(d.terreno); return }
    if (M.fase !== 'carta') return
    if (M.sel >= 0 && !M.cartaPosta) { por(d.terreno); return }
    if (revancheAberta()) { marcarTroca(d.terreno); UI.mudou(); return } // R46: sem carta escolhida e com a troca valendo, o terreno é marcado para a troca
    const t = J.v.terrenos[d.terreno - 1]; Som.tocar('toque')
    if (t) dizer([`#${CONFIG.CARTAS[t.carta].nome} - ${T.nivel} ${t.nivel}`, CONFIG.CARTAS[t.carta].texto], 4000); else M.info = null
    return
  }
  if (id.startsWith('espolio')) { escolherEspolio(d.espolio); return }
  if (id === 'lutar' || id === 'lutar2') lutar()
  else if (id === 'sortear') armar('sortear', sortear)
  else if (id === 'consertar') armar('consertar', consertar)
  else if (id === 'vel') { Bat.vel = Bat.vel === 1 ? 2 : Bat.vel === 2 ? 4 : 1; M.vel = Bat.vel; Guarda.set('vel', Bat.vel); Som.tocar('toque'); Som.tocar('velocidade', { tom: Bat.vel === 4 ? 9 : Bat.vel === 2 ? 5 : 0 }); UI.mudou() }
  else if (id === 'som') { M.mudo = Som.alternarMudo(); Som.tocar('toque') }
  else if (id === 'menu') { Som.tocar('toque'); Telas.menu() }
  else if (id === 'voltar') { M.fase = 'vitoria'; M.trocar = 0; M.info = null; C.destaque = null; Som.tocar('toque'); UI.mudou() }
  else if (id === 'seguir') seguir()
  else if (id === 'denovo') { Som.tocar('toque'); if (S.on) jogarDeNovo(); else novaPartida() }
  else if (id === 'postar') postar()
  else if (id === 'dica-vidas') { Som.tocar('toque'); dizer(['#' + T.dica.vidas(J.v.vidasMax)]) }
  else if (id === 'dica-pinos') { Som.tocar('toque'); dizer(['#' + T.dica.chefe(CONFIG.HORDA.chefeACada)]) }
  else if (id === 'dica-ganhe') { Som.tocar('toque'); dizer(['#' + T.dica.ganhe, ...M.espolioDesc.map((x) => `${x.titulo}: ${x.texto}`)], 6500) }
  else if (id === 'horda') { Som.tocar('toque'); sobreAHorda() }
  else if (id === 'reliquias') sobreAsReliquias()
  else if (id === 'manter') manterReino()
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
addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { if (Telas.aberta()) Telas.fechar(); else if (M.replay) sairDoReplay(); else if (M.sel >= 0) { selecionar(-1); UI.mudou() } else if (M.revanche?.marcado) { M.revanche.marcado = 0; Som.tocar('toque'); UI.mudou() } } })
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
const QUADROS = new Float32Array(600), CUSTO = new Float32Array(600); let nq = 0, ultimo = 0, ouroEm = 0, trechoSom = -1
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
    if (M.ouro !== J.ouroAlvo && agora - ouroEm > 55) { ouroEm = agora; const d = J.ouroAlvo - M.ouro; M.ouro += Math.sign(d) * Math.max(1, Math.floor(Math.abs(d) / 6)); if (d > 0 && M.fase !== 'vitoria') { if (M.ouro === J.ouroAlvo) Som.tocar('ouro', { tom: 2 }); else Som.tocar('ouroTique', { tom: M.ouro % 8, pan: -0.5 }) } }
    { const tr = C.trecho(); if (tr !== trechoSom) { trechoSom = tr; Som.ambiente(tr) } } // R35: o ambiente do trecho (pássaros, vila, pôr do sol, grilos) cruza em 1,5 s
    C.revanche = revancheAberta() ? M.revanche : null // R46: terreno marcado e par da dica (a cena só desenha)
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
// ---------------------------------------------------------------- MODO SERVIDOR
// O servidor sorteia e decide; a tela manda cada comando com `seq` e mostra o que voltou. A SEMENTE NUNCA VEM para a tela, então o
// motor local não consegue adiantar o resultado: a animação sai dos `eventos` da resposta e a conferência é (1) só mandar o que está
// em `opcoes.comandos`, (2) o seq da resposta ser o seguinte, (3) a carta posta estar no terreno pedido e (4) a luta que a tela mostra
// dar o mesmo vencedor que o servidor decidiu. Qualquer diferença: vale o servidor (a tela recarrega dele) e fica anotado em J.erros.
const OP_VAZIA = (v) => ({ fase: 'fim', oferta: [], espolios: [], ouro: v.ouro, sortear: { custo: v.custos.sortear, pode: false }, consertar: { custo: v.custos.consertar, pode: false }, comandos: [] })
function avisarServidor(codigo, ms = 4500) { M.status = { texto: (T.srv.erro[codigo] || T.srv.erro.PADRAO).toUpperCase(), ate: agoraMs() + ms, codigo: codigo || 'PADRAO' }; Som.tocar('negado') }
/** Adota o que o servidor mandou (uma `Partida` do contrato). */
function adotar(p) {
  S.id = p.id; S.modo = p.modo; S.seq = p.seq; S.resultado = p.resultado || null; S.fora = p.foraDoPlacar ?? null; S.novid = p.novidades || null
  if (p.energia) S.energia = p.energia
  J.v = p.visao; J.op = p.opcoes || OP_VAZIA(p.visao); J.e = { fase: p.status === 'terminada' ? 'fim' : p.visao.fase }
  M.modoRot = T.srv.modo[p.modo] || null
  if (J.e.fase === 'fim') registrarFim()
}
/** Entra numa partida do servidor (nova, retomada depois de recarregar, ou recarregada por divergência). */
function entrar(p, aviso = null, nova = false, direto = false) {
  zerarPartida(); J.replay = null; M.replay = null
  adotar(p); M.ouro = J.v.ouro; J.ouroAlvo = J.v.ouro; J.familias = J.v.familias.slice()
  if (J.e.fase === 'fim') { if (S.fimVisto?.id === S.id) J.melhor = S.fimVisto.melhor || null; fimDaPartida(direto); avisarSessaoNova(); return }
  S.fimVisto = null; Srv.guardarFim(null) // partida em curso: a tela de fim guardada já não vale (Play again, treino novo)
  if (J.v.fase === 'espolio') mostrarEspolio(); else abrirRodada()
  if (nova) {
    const e = S.energia, sub = p.modo === 'ranking' ? (e ? T.srv.energiaCurta(e.atual, e.maximo) : '') : T.srv.modoSub[p.modo]
    festa({ tam: 2, tipo: 'aviso', ms: 2600, texto: T.srv.modo[p.modo], sub, ouro: true, k: kAviso(), fase: 'carta', ao: () => Som.tocar('chefeAnuncia', { forca: 0.5 }) })
  } else if (p.seq > 0 || aviso) festa({ tam: aviso ? 0 : 1, tipo: 'brinde', ms: aviso ? 3200 : 2200, titulo: aviso || T.jogo, texto: T.continua(J.v.rodada), icone: { tipo: 'carta' } }) // com aviso (outra aba, servidor): é a 1ª da fila — a rodada não pula em silêncio
  avisarSessaoNova()
  // estrada do dia fora do placar: o motivo em 1 linha, na hora (o servidor é quem diz)
  if (p.modo === 'estrada' && S.fora && T.srv.fora[S.fora.codigo]) { const l = ['#' + T.srv.fora[S.fora.codigo]]; if (M.fase === 'chefe') J.infoPend = l; else dizer(l, 8000) }
}
/** (R30) A sessão guardada não valia mais (401) e o aparelho ganhou conta nova: a tela diz isso UMA vez, sem prometer recuperar nada. */
function avisarSessaoNova() {
  if (!S.sessaoNova) return
  S.sessaoNova = false
  festa({ tam: 0, tipo: 'brinde', ms: 5000, titulo: T.srv.sessao.titulo, texto: T.srv.sessao.texto, icone: { tipo: 'carta' }, ao: () => Som.tocar('negado') })
}
function conferirResposta(cmd, seq, r) {
  if (r.seq !== seq + 1) J.erros.push(`servidor: mandei o seq ${seq} e voltou ${r.seq}`)
  if (cmd.tipo === 'por' && r.visao.terrenos[cmd.terreno - 1]?.carta !== cmd.carta) J.erros.push(`servidor: a carta ${cmd.carta} não está no terreno ${cmd.terreno}`)
}
/** Manda o comando com `seq`. Rede fora: o MESMO seq de novo até chegar (js/servidor.js) — a jogada não se perde nem vale duas vezes. */
async function mandarAoServidor(cmd, entao) {
  if (S.ocupado || J.replay || !S.id) return
  const valido = J.op.comandos.some((c) => mesmoComando(c, cmd))
  if (!valido) { Som.tocar('negado'); return }
  const id = S.id, seq = S.seq
  S.ocupado = true
  if (cmd.tipo === 'por') C.pulo[cmd.terreno] = C.relogio + 300 // resposta na hora ao toque; o resto espera o servidor
  let r
  try { r = await Srv.comando(id, seq, cmd) } catch (e) { S.ocupado = false; if (S.id === id) await erroDoComando(e); return }
  S.ocupado = false
  if (S.id !== id || J.replay) return // trocou de partida enquanto esperava
  conferirResposta(cmd, seq, r)
  adotar(r); J.comandos.push(cmd)
  // terminou sem ser por este comando (tempo, fecho da temporada, teto): direto para o fim
  if (r.status === 'terminada' && !r.eventos.some((x) => x.tipo === 'fim')) { fimDaPartida(); return }
  entao?.(r.eventos)
  if (cmd.tipo !== 'batalhar') festejarNovidades()
}
async function erroDoComando(e) {
  const c = e.codigo
  if (c === 'PARTIDA_ACABOU' && e.extra.partida) { semTimers(); Bat.parar(); adotar(e.extra.partida); fimDaPartida(); return }
  // seq fora do lugar, comando que o motor recusou, partida que sumiu: a tela estava diferente do servidor → recarrega dele
  if (/^SEQ_|^CONCORRENCIA$|^COMANDO_RECUSADO$|^PARTIDA_/.test(c) || e.status === 404 || e.status === 422) { if (c === 'COMANDO_RECUSADO') J.erros.push('servidor recusou um comando que estava nas opções'); await recarregar(/^SEQ_(ANTIGA|JA_USADA)$/.test(c) ? T.outraAba : T.srv.sincronizado); return } // seq velho num comando NOVO: outra aba (ou outro aparelho) andou com a partida — o mesmo aviso do modo local
  avisarServidor(c) // 429, manutenção, só leitura…: avisa e deixa jogar de novo (nada foi aplicado)
}
/** Recarrega a partida do servidor (SEQ_ANTIGA, SEQ_JA_USADA…). Se ela já terminou lá, abre um treino. */
async function recarregar(aviso = T.srv.sincronizado) {
  try {
    const ab = await Srv.aberta(S.modo); S.energia = ab.energia
    if (ab.partida) { entrar(ab.partida, aviso); return }
    M.status = { texto: T.srv.acabou, ate: agoraMs() + 4500, codigo: 'ACABOU' }
    await abrirModo('treino')
  } catch (e) { avisarServidor(e.codigo) }
}
/** Abre (ou retoma) a partida do modo. Devolve null ou o código do erro do contrato (SEM_ENERGIA, ESTRADA_JA_JOGADA, 429…). */
async function abrirModo(modo) {
  if (S.abrindo) return 'PADRAO'
  S.abrindo = true
  try {
    const ab = await Srv.aberta(modo); S.energia = ab.energia
    if (ab.partida) { entrar(ab.partida); return null }
    entrar(await Srv.abrir(modo), null, true)
    return null
  } catch (e) { if (e.extra?.energia) S.energia = e.extra.energia; return e.codigo || 'PADRAO' } finally { S.abrindo = false }
}
/** PLAY AGAIN: o mesmo modo num clique; a estrada do dia é uma por dia, então abre a escolha de modo. Erro → a escolha com o aviso. */
async function jogarDeNovo() {
  if (S.modo === 'estrada') { Telas.jogar(); return }
  const c = await abrirModo(S.modo || 'treino'); if (c) Telas.jogar(c)
}
/** "New run" do menu: desiste no servidor (fica no replay) e mostra o fim que ele gravou. */
async function desistirNoServidor() {
  if (!S.id || J.e.fase === 'fim' || S.ocupado) { Telas.jogar(); return }
  S.ocupado = true
  try { const p = await Srv.desistir(S.id); semTimers(); Bat.parar(); limparFestas(); adotar(p); fimDaPartida() } catch (e) { await erroDoComando(e) } finally { S.ocupado = false }
}
function festejarNovidades() {
  const n = S.novid; S.novid = null; if (!n) return
  for (const id of n.conquistas || []) if (CONQUISTAS.some((c) => c.id === id)) conquista(id, true)
  const nova = n.cartaNova
  if (nova && CONFIG.CARTAS[nova]) festa({ tam: 2, tipo: 'brinde', ms: 2600, aposEspolio: true, titulo: T.cartaNova, texto: CONFIG.CARTAS[nova].nome, icone: { tipo: 'carta', id: nova }, ao: () => Som.tocar('cartaNova') })
}
/** O que o fim mostra de recorde: comparação de dois números do servidor (o recorde do perfil lido ANTES e os pontos gravados agora). */
function fimDoServidor() {
  if (S.fimVisto?.id === S.id && S.fimVisto.reg) return S.fimVisto.reg // recarregou na tela de fim: a placa diz o mesmo de antes
  const r = S.resultado || J.v, rec = S.perfil?.recordes, antes = rec ? rec.pontos : r.pontos
  return { novoRecorde: r.pontos > antes, recorde: Math.max(antes, r.pontos), antes, rodadasAntes: rec ? rec.rodadasVencidas : r.vencidas }
}
/** Liga, posição e média da temporada como o servidor mandou no perfil (nomes das ligas: os do config do jogo). */
function situacaoDoServidor() {
  const v = S.perfil?.temporada?.voce, L = CONFIG.BETA.ligas, nomeDe = (id) => (id === CONFIG.BETA.lenda.id ? CONFIG.BETA.lenda.nome : L.find((l) => l.id === id)?.nome || String(id))
  if (!v) return { media: 0, posicao: null, liga: { nome: T.srv.semLiga, i: -1, pct: 0, proxima: null, falta: 0, marca: T.srv.temporadaMarca, linha: T.srv.semRanking } }
  // "X more for <liga>" só quando essa liga é MAIOR que a atual (com poucas contas o topo já é Legend e o servidor ainda manda a faixa de baixo)
  const ordem = [...L.map((l) => l.id), CONFIG.BETA.lenda.id], sobe = v.faltaParaProxima && ordem.indexOf(v.faltaParaProxima.liga) > ordem.indexOf(v.liga)
  const i = L.findIndex((l) => l.id === v.liga), f = sobe ? v.faltaParaProxima : null, de = i >= 0 ? L[i].min : 0, ate = f ? v.pontos + f.pontos : de
  // (R30) liga que vem por POSIÇÃO (a lista de títulos do servidor traz `primeiros` nela): a legenda diz o que ela é — "TOP 10 THIS SEASON"
  const topo = (S.ligas || []).find((l) => l.id === v.liga && l.primeiros)?.primeiros ?? (v.liga === CONFIG.BETA.lenda.id ? CONFIG.BETA.lenda.primeiros : null)
  return { media: v.pontos, posicao: v.posicao, topo, liga: { nome: nomeDe(v.liga), i, linha: topo ? T.srv.ranking.topoN(topo).toUpperCase() : undefined, pct: f && ate > de ? Math.max(0, Math.min(100, Math.floor(((v.pontos - de) * 100) / (ate - de)))) : 100, proxima: f ? nomeDe(f.liga) : null, falta: f ? f.pontos : 0, marca: T.srv.posicaoMarca(v.posicao) } }
}
function albumDoServidor() {
  const a = S.perfil?.album; if (!a || !a.proxima) return a ? null : { falta: 0, pct: 0, carta: null }
  const n = a.liberadas.length - CONFIG.ALBUM.inicial.length, antes = n > 0 ? Guarda.limiar(CONFIG.ALBUM, n - 1) : 0, alvo = a.proxima.rodadas
  return { falta: a.proxima.faltam, pct: alvo > antes ? Math.max(0, Math.min(100, Math.floor(((a.rodadasVencidas - antes) * 100) / (alvo - antes)))) : 0, carta: a.proxima.carta }
}
/** A linha do modo no fim. Estrada do dia: só diz que está no placar se o servidor trouxer a posição da conta (`voce`). */
function linhaDoModo(voce) {
  if (S.resultado && S.resultado.conta === false) return { texto: T.srv.naoContou, ganhou: false }
  if (S.modo === 'ranking' && S.energia) return { texto: T.srv.energiaCurta(S.energia.atual, S.energia.maximo), ganhou: false }
  if (S.modo !== 'estrada') return null
  if (voce && voce.posicao != null) return { texto: T.srv.noPlacar(voce.posicao), ganhou: true }
  const fora = voce?.foraDoPlacar || S.fora
  if (fora && T.srv.fora[fora.codigo]) return { texto: T.srv.fora[fora.codigo], ganhou: false }
  return voce ? { texto: T.srv.foraSemMotivo, ganhou: false } : null
}
/** Depois do fim: o perfil novo (recorde, álbum, liga, energia) e, na estrada, o placar do dia — a placa do fim se acerta com eles. */
async function depoisDoFim() {
  const id = S.id, antes = S.perfil?.temporada?.voce || null, nova = S.fimVisto?.id !== S.id // `antes`: a posição e a liga que o servidor tinha dito ANTES desta partida
  try {
    const [p, rk] = await Promise.all([Srv.perfil(), Srv.ranking()])
    S.perfil = p; S.energia = p.energia; S.ligas = rk.ligas || S.ligas
    if (M.fase !== 'fim' || !M.fim || S.id !== id || J.replay) return
    const sit = situacaoDoServidor()
    // (R30) fim de RANKING: os pontos desta partida e a conta da temporada, com os números do servidor (resultado, perfil e a regra do ranking)
    M.fim.ranking = S.modo === 'ranking' && S.resultado && S.resultado.conta !== false && p.temporada?.voce ? { pontos: S.resultado.pontos, temporada: p.temporada.voce.pontos, melhores: rk.temporada.melhoresQueContam } : null
    M.fim.media = sit.media; M.fim.liga = sit.liga; M.fim.album = albumDoServidor(); M.fim.amigo = linhaDoModo(S.modo === 'estrada' ? rk.estradaDoDia.voce : null)
    { const tinha = M.fim.gancho; M.fim.gancho = ganchoDaEstrada(rk.estradaDoDia); if (M.fim.gancho && !tinha) Som.tocar('gancho') } // R35: o gancho do fim chega com som (uma vez)
    // RANKING COM FESTA: só no fim de uma partida de ranking que contou, e só se o servidor diz posição melhor ou liga maior que antes
    const s = S.modo === 'ranking' && nova && S.resultado?.conta !== false ? subidaNoRanking(antes, p.temporada?.voce || null) : null
    if (s && !M.fim.subiu) {
      // a faixa entra junto do fecho do fim (depois da contagem); com tudo parado, na hora
      const f = M.fim, espera = f.parado || f.contou ? 0 : Math.max(0, f.t0 + f.tFaixa + (f.novoRecorde ? 500 : 0) - agoraMs())
      s.t0 = agoraMs() + espera; f.subiu = s; festejarSubida(s, espera)
    }
    UI.mudou()
  } catch { /* fica o que já estava na placa */ }
}
/** Compara o que o servidor disse antes e depois (a tela não calcula ponto nem posição): { de, para, liga } ou null (sem subir, sem festa). */
function subidaNoRanking(a, d) {
  if (!d || d.posicao == null) return null
  const L = CONFIG.BETA.ligas, ordem = [...L.map((l) => l.id), CONFIG.BETA.lenda.id], nomeDe = (id) => (id === CONFIG.BETA.lenda.id ? CONFIG.BETA.lenda.nome : L.find((l) => l.id === id)?.nome || String(id))
  const pos = !a || a.posicao == null ? { de: null, para: d.posicao } : d.posicao < a.posicao ? { de: a.posicao, para: d.posicao } : null
  const liga = a && ordem.indexOf(d.liga) > ordem.indexOf(a.liga) ? nomeDe(d.liga) : null
  return pos || liga ? { de: pos ? pos.de : null, para: pos ? pos.para : null, liga, t0: agoraMs(), ms: 700 } : null
}
function festejarSubida(s, espera = 0) {
  if (C.menos || s.de == null || s.para == null) { depois(espera, () => Som.tocar('nivelPequeno')); return }
  const n = Math.min(8, s.de - s.para)
  for (let i = 1; i <= n; i++) depois(espera + Math.round((s.ms * i) / n), () => Som.tocar('rankingSobe', { tom: i }))
  depois(espera + s.ms + 120, () => { Som.tocar('rankUp'); C.efeito('confetti', C.VW / 2 + C.cam.x, C.VH * 0.4) })
}
/** O GANCHO honesto do fim (modo servidor): a estrada do dia. O tempo é o do relógio do servidor e nunca passa de 1 dia — se a conta
 *  der mais que isso (relógio do aparelho fora do lugar), a tela não escreve número: só "tomorrow". */
function ganchoDaEstrada(ed) {
  const G = T.srv.gancho, v = ed.voce
  if (!v) return G.aberta
  if (v.status === 'aberta') return G.curso
  const falta = Date.parse(ed.dia + 'T00:00:00Z') + 86_400_000 - Srv.agora()
  return falta > 0 && falta <= 86_400_000 ? G.nova(T.srv.em(falta)) : G.amanha
}

// ---------------------------------------------------------------- REPLAY (modo servidor): a tela de batalha passa os `passos`, sem motor
const legendaDoPasso = (c) => (c.tipo === 'por' ? T.srv.replay.por(CONFIG.CARTAS[c.carta]?.nome || c.carta, c.terreno) : c.tipo === 'sortear' ? T.sortearNome : c.tipo === 'consertar' ? T.consertarNome : c.tipo === 'espolio' ? T.srv.replay.espolio : c.tipo === 'desistir' ? T.srv.replay.desistir : c.tipo === 'trocar' ? T.srv.replay.troca(c.a, c.b) : '')
/** Busca o replay (em páginas) e começa a passar. Devolve null ou o código do erro (ESTRADA_DE_HOJE, 429…). */
async function assistir(id, volta = null) {
  if (J.replay || S.ocupado) return 'PADRAO'
  let rep
  try { rep = await Srv.replay(id) } catch (e) { return e.codigo || 'PADRAO' }
  if (!rep || !rep.inicio || !Array.isArray(rep.passos)) return 'PADRAO'
  Telas.fechar(); iniciarReplay(rep, volta)
  return null
}
function iniciarReplay(rep, volta = null, guarda = null, velAntes = null) {
  semTimers(); Bat.parar(); limparFestas(); canvas.style.filter = ''; C.noite = 0; C.fimDeJogo = false
  // `guarda`: a partida do jogador, para onde o "sair" volta (o WATCH AGAIN passa a mesma adiante). No replay a velocidade é x1 ou x2.
  J.replay = { rep, i: 0, volta, guarda: guarda || { v: J.v, op: J.op, e: J.e, rot: M.modoRot }, velAntes: velAntes ?? Bat.vel }; J.pos = null; J.emLuta = false
  if (Bat.vel > 2) Bat.vel = 2
  M.vel = Bat.vel
  M.fim = null; M.vitoria = null; M.derrota = null; M.chefe = null; M.info = null; M.selo = null; M.resumo = null; M.revanche = null
  M.replay = { nome: rep.apelido || '', i: 0, n: rep.passos.length, linha: '', fim: null, passo: null, mvp: null, pular: rep.passos.some((p) => p.comando.tipo === 'batalhar') }; M.modoRot = T.srv.replayRot
  J.v = rep.inicio; J.op = OP_VAZIA(J.v); J.e = { fase: 'replay' }
  M.ouro = J.v.ouro; J.familias = J.v.familias.slice()
  replayParado(null); depois(800, passoDoReplay)
}
function replayParado(p) {
  preencher(); M.fase = 'replay'; M.sel = -1; M.vidas = J.v.vidas; J.ouroAlvo = J.v.ouro; C.destaque = null; canvas.style.filter = ''; C.noite = 0
  C.mudarHora(Arte.horaDaRodada(J.v.rodada), false, J.v.rodada); montarReino(J.v.fase === 'carta'); C.vidas = estadoCastelo()
  M.replay.passo = null
  if (p) {
    eventosDeTerreno(p.eventos.filter((x) => x.tipo === 'posta' || x.tipo === 'nivel')); M.replay.linha = legendaDoPasso(p.comando); M.replay.mvp = null
    // a carta escolhida e onde foi posta: a carta de verdade na faixa e o terreno aceso
    // R46: a troca da revanche — as peças dos dois terrenos cruzam de lugar e os dois ficam acesos (legenda "SWAP")
    { const tr = p.eventos.find((x) => x.tipo === 'troca'); if (tr) { animarTroca(tr.a, tr.b); C.destaque = { terrenos: new Set([tr.a, tr.b]), sobe: new Set(), vizinhos: new Set(), forte: 0 } } }
    if (p.comando.tipo === 'por' && CONFIG.CARTAS[p.comando.carta]) { const k = p.comando.terreno; M.replay.passo = { carta: p.comando.carta, terreno: k, nivel: J.v.terrenos[k - 1]?.nivel || 1 }; C.destaque = { terrenos: new Set([k]), sobe: new Set(), vizinhos: new Set(), forte: 0 } }
  }
  const R = J.replay; M.replay.pular = !!R && R.rep.passos.slice(R.i).some((x) => x.comando.tipo === 'batalhar')
  Musica.momento('construir'); UI.mudou()
}
function passoDoReplay() {
  const R = J.replay; if (!R) return
  const ps = R.rep.passos
  if (R.i >= ps.length) { const r = R.rep.resultado || J.v; M.replay.venceu = venceuDe(r); M.replay.fim = M.replay.venceu ? T.srv.replay.fimVenceu(r.vencidas, r.pontos) : T.srv.replay.fim(r.vencidas, r.pontos); M.replay.pular = false; M.replay.passo = null; C.destaque = null; UI.mudou(); return } // fica na tela: WATCH AGAIN ou BACK
  const p = ps[R.i], antes = J.v
  R.i++; M.replay.i = R.i
  const bat = p.comando.tipo === 'batalhar' ? p.eventos.find((x) => x.tipo === 'batalha') : null
  if (bat) {
    M.fase = 'luta'; M.replay.linha = ''; M.replay.passo = null; M.replay.mvp = null; C.destaque = null; Musica.momento(bat.horda.chefe ? 'chefe' : 'batalha')
    Bat.iniciar({ eventos: bat.eventos, horda: bat.horda, terrenos: antes.terrenos, exercito: montarExercito(antes.terrenos, antes.reliquias), segundos: bat.segundos, rodada: antes.rodada, painelCurto: false }, () => {
      if (J.replay !== R) return
      // o MVP da luta que acabou de passar (do resumo dos eventos) fica na faixa até o passo seguinte
      const Z = resumoDaLuta(), nomeMvp = Z.mvp > 0 ? CONFIG.CARTAS[Z.cartas[Z.mvp]]?.nome : Z.mvp === 0 ? T.resumo.magia : null
      J.v = p.visao; replayParado(null); M.replay.linha = bat.vitoria ? T.vitoria : T.derrota
      M.replay.mvp = nomeMvp && Z.dano[Z.mvp] > 0 ? `${T.resumo.mvp}: ${nomeMvp} ${Z.dano[Z.mvp]}` : null
      depois(Math.round(1400 / (Bat.vel || 1)), passoDoReplay)
    })
    UI.mudou(); return
  }
  J.v = p.visao; replayParado(p); depois(Math.round(1100 / (Bat.vel || 1)), passoDoReplay)
}
/** SKIP TO FIGHT: pula os passos de montar e vai direto para a próxima luta (o reino entra como estava logo antes dela). */
function pularParaLuta() {
  const R = J.replay; if (!R || M.fase !== 'replay' || M.replay.fim) return
  const ps = R.rep.passos; let j = R.i
  while (j < ps.length && ps[j].comando.tipo !== 'batalhar') j++
  if (j >= ps.length) return
  semTimers(); limparFestas(); Som.tocar('replayPula')
  if (j > R.i) { J.v = ps[j - 1].visao; R.i = j; replayParado(null) }
  passoDoReplay()
}
function reverReplay() { const R = J.replay; if (R) iniciarReplay(R.rep, R.volta, R.guarda, R.velAntes) }
/** Sair do replay: volta para a partida do jogador como o servidor a deixou e, por cima, para a tela de onde o replay foi aberto. */
function sairDoReplay() {
  const R = J.replay; if (!R) return
  semTimers(); Bat.parar(); limparFestas(); J.replay = null; M.replay = null; M.resumo = null; C.destaque = null
  Bat.vel = R.velAntes; M.vel = Bat.vel
  J.v = R.guarda.v; J.op = R.guarda.op; J.e = R.guarda.e; M.modoRot = R.guarda.rot
  M.ouro = J.v.ouro; J.ouroAlvo = J.v.ouro; J.familias = J.v.familias.slice(); J.anunciado = J.v.rodada + ':' + J.v.vidas
  if (J.e.fase === 'fim') fimDaPartida(true); else if (J.v.fase === 'espolio') mostrarEspolio(); else abrirRodada()
  R.volta?.()
}
/** FIM QUE SOBREVIVE A RECARREGAR: se a tela de fim estava à vista, o servidor devolve aquela partida terminada e a tela volta a ela
 *  (parada, se a entrada já tinha passado), até o Play again. Outra partida terminou depois, ou o pedido falhou: segue o começo comum. */
async function voltarAoFim() {
  const g = Srv.fimGuardado(); if (!g) return false
  let u
  try { u = await Srv.ultima() } catch { return false }
  if (!u.partida || u.partida.id !== g.id || u.partida.status !== 'terminada') { Srv.guardarFim(null); return false }
  S.fimVisto = g; entrar(u.partida, null, false, !!g.visto)
  return true
}
/** Começo no modo servidor: conta (criada na 1ª visita, sem perguntar nada), perfil e a partida aberta — ou um treino novo. Falhou
 *  (rede, manutenção): uma tela curta com "Try again"; nunca fica travado. */
async function comecarNoServidor() {
  Srv.aoTrocarConta = () => { S.sessaoNova = true }
  Srv.aoRede = (caiu) => { if (caiu) { if (!M.status?.rede) Som.tocar('semSinal'); M.status = { texto: T.srv.rede, ate: Infinity, rede: true } } else if (M.status?.rede) { M.status = { texto: T.srv.voltou, ate: agoraMs() + 1500 }; Som.tocar('voltou') } }
  for (;;) {
    try {
      const [ab, perfil] = await Promise.all([Srv.aberta(), Srv.perfil()])
      S.perfil = perfil; S.energia = ab.energia
      if (!Array.isArray(Guarda.get('conquistasVistas'))) Guarda.set('conquistasVistas', (perfil.conquistas || []).filter((c) => c.feita).map((c) => c.id))
      if (await voltarAoFim()) return
      if (ab.partida) entrar(ab.partida); else entrar(await Srv.abrir('treino'), null, true)
      return
    } catch (e) { await new Promise((ok) => Telas.falha(e.codigo, ok)) }
  }
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
  const [servidor] = await Promise.all([Srv.detectar(), Arte.carregar(CONFIG)])
  S.on = servidor
  C.ajustar(innerWidth, innerHeight)
  Bat = criarBatalha(C, CONFIG, Som, expandirHorda); Bat.vel = [1, 2, 4].includes(Guarda.get('vel')) ? Guarda.get('vel') : 1
  UI = criarInterface(C, CONFIG, camada, aoTocar); M = UI.M
  Bat.aoAviso = (tipo, dado) => {
    if (tipo === 'noite') festa({ tam: 1, tipo: 'aviso', ms: 1500, texto: T.noite, sub: T.noiteSub(CONFIG.BATALHA.multNoite / 100), fase: 'luta' }) // o texto diz o que o motor faz (multNoite do config)
    if (tipo === 'ultimo') festa({ tam: 2, tipo: 'aviso', ms: 1500, texto: T.ultimo, ouro: true, k: kAviso(), fase: 'luta' })
    if (tipo === 'chefe') { const c = CONFIG.CHEFES.find((x) => x.id === dado); festa({ tam: 2, tipo: 'aviso', ms: 1600, texto: c.nome, ouro: true, k: kAviso(), fase: 'luta' }) }
    if (tipo === 'chefeCaiu') { const c = CONFIG.CHEFES.find((x) => x.id === dado); if (c) festa({ tam: 3, tipo: 'aviso', ms: 1100, texto: T.caiu(c.nome.split(' the ')[0]), ouro: true, k: 2, fase: 'luta' }) } // festa grande: título ×2 também no celular (quebra em duas linhas)
  }
  Telas = criarTelas({ CONFIG, Arte, Guarda, Som, Musica, menos: (v) => { if (v !== undefined) { menos(v); Guarda.set('menos', !!v) } return C.menos }, novaPartida: () => (S.on ? desistirNoServidor() : novaPartida()), servidor: S.on ? { agora: Srv.agora, apelido: () => Srv.apelido, aberta: () => Srv.aberta(), ranking: async (c) => { const rk = await Srv.ranking(c); S.ligas = rk.ligas || S.ligas; return rk }, perfil: async () => (S.perfil = await Srv.perfil()), trocarApelido: async (a) => (S.perfil = await Srv.trocarApelido(a)), cache: () => S.perfil, energia: () => S.energia, situacao: situacaoDoServidor, jogar: abrirModo, assistir } : null, emPartida: () => M.fase !== 'fim', aoFechar: () => { if (!J.v || J.replay) return; UI.focar(); if (M.fase !== 'fim') Musica.momento(M.fase === 'luta' ? 'batalha' : J.v.vidas === 1 ? 'porUmFio' : 'construir'); else Musica.momento('fim') } })
  menos(guardado ?? matchMedia('(prefers-reduced-motion: reduce)').matches)
  addEventListener('resize', ajustar)
  // retoma a partida guardada (a não ser que o endereço peça outra estrada ou `nova=1`)
  if (!S.on && !Array.isArray(Guarda.get('conquistasVistas'))) Guarda.set('conquistasVistas', Guarda.get('conquistas').slice()) // R41: as que o aparelho já tinha não são "NEW"
  if (!S.on) ligarDegrausGuardados()
  if (S.on) await comecarNoServidor(); else comecarPartida()
  // duas abas na MESMA partida: quando a outra anda, esta percebe e recarrega o estado antes de aceitar jogada
  if (!S.on) Guarda.aoMudarPartida(() => { J.sujo = true })
  ligarVoltar()
  requestAnimationFrame(quadro)
  if (TESTE) {
    const { ligarGanchos } = await import('./teste.js')
    await ligarGanchos({ J, M: () => M, C, Bat: () => Bat, UI: () => UI, F, Som, Musica, Guarda, Arte, CONFIG, QUADROS, CUSTO, nq: () => nq, lutar, novaPartida, abrirRodada, fimDaPartida, mandar, ler, preencher, aoFimDaLuta, semTimers, limparFestas, festa, reproduzir, resultado, montarExercito, expandirHorda, cartaoDoReino, seguir, menos, CONTORNO, festejarReino, venceuDe, conquista, degrauPerto, maxTipoVisivel, S, Srv, por, sairDoReplay, abrirModo, avisarServidor, maoNova, pularParaLuta, iniciarReplay, aplicar, visao, opcoes, aoTocar })
  }
  document.documentElement.dataset.pronto = '1'
}
comecar()
