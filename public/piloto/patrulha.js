// Piloto — PATRULHA: contas puras em cima do motor (sem tela, sem sorteio próprio). Roda no navegador e no Node.
// A regra é do motor: "Strong" = habilidade de DANO cujo elemento bate forte no elemento do CORPO do alvo (bateForte de shared/);
// "Resisted" = o corpo do alvo bate forte no elemento da habilidade (só com as regras do piloto, regras-piloto.js).
// O escolhedor é o do motor (shared/tatica.js, lutaAutomatica) com as `regras` do piloto; a tela refaz os comandos dele passo a
// passo com aplicar() do motor (mesmas regras), só para poder mostrar cada passo.
// API:
//   vantagens(def, guardaDefs)      → { forte, fraco, resiste: [bool×3], nForte, nFraco, nResiste }   (ícones "Strong vs / Weak to / Resists")
//   lutaComPassos({ semente, timeA, timeB, ordensA, ordensB, regras }) → { inicial, passos: [{ cmd, eventos, estado }], resultado, regras }
//   rodarLuta({ semente, trio, guarda, tatica, ordem, taticaDaGuarda, ordemDaGuarda, lutasHoje }) → { luta, resumo }
//   resumirLuta(luta)               → { venceu, turnos, forteDados, forteLevados, resistidos, maior, porMonstro }
//   resumirPatrulha(resumos, nomes) → { v, d, dados, levados, cansadas, causa, porLugar }                (a tira final; causa tirada dos eventos)
import { aplicar, bateForte, criarLuta, montarBoneco } from '../../shared/batalha.js'
import { CARTAS } from '../../shared/config.js'
import { lutaAutomatica, ordemPadrao } from '../../shared/tatica.js'
import { REGRAS_PILOTO, regrasDaLuta } from './regras-piloto.js'

const ehDano = (id) => CARTAS[id].efeitos.some((x) => x.tipo === 'dano')

/** Elementos das habilidades de dano de um monstro (sem repetir). */
export function elementosDeDano(def) {
  return [...new Set(montarBoneco(def).cartas.filter(ehDano).map((c) => CARTAS[c].tipo))]
}

/** Vantagem de tipo de UM monstro contra cada um dos 3 da guarda (mesma ordem da guarda). Só tipo: não é chance de vitória. */
export function vantagens(def, guardaDefs) {
  const eu = montarBoneco(def), meus = elementosDeDano(def)
  const forte = guardaDefs.map((g) => meus.some((t) => bateForte(t, montarBoneco(g).tipo)))
  const fraco = guardaDefs.map((g) => elementosDeDano(g).some((t) => bateForte(t, eu.tipo)))
  // Resists: de quem da guarda ele recebe menos dano (o corpo dele vence o elemento de uma habilidade de dano do outro)
  const resiste = guardaDefs.map((g) => REGRAS_PILOTO.resistencia > 0 && elementosDeDano(g).some((t) => bateForte(eu.tipo, t)))
  return { forte, fraco, resiste, nForte: forte.filter(Boolean).length, nFraco: fraco.filter(Boolean).length, nResiste: resiste.filter(Boolean).length }
}

/** O golpe (evento 'dano' do motor) foi resistido pelo corpo do alvo? Só com resistência nas regras da luta. */
export function golpeResistido(ev, tipoDoAlvo, regras = REGRAS_PILOTO) {
  return !!(regras?.resistencia && !ev.refletido && ev.carta && bateForte(tipoDoAlvo, CARTAS[ev.carta].tipo))
}

/**
 * A luta inteira com os passos para a tela: o escolhedor do MOTOR decide os comandos (lutaAutomatica com `regras`) e a tela
 * refaz esses comandos com aplicar() do motor, guardando o estado e os eventos de cada passo. Lança erro se o refazer divergir.
 */
export function lutaComPassos({ semente, timeA, timeB, ordensA, ordensB, regras }) {
  const auto = lutaAutomatica({ semente, timeA, timeB, ordensA, ordensB, regras, registro: false })
  let e = criarLuta({ semente, timeA, timeB, regras })
  const inicial = e
  const passos = []
  for (const cmd of auto.comandos) {
    const r = aplicar(e, cmd)
    if (!r.ok) throw new Error(`Comando inválido ao refazer a luta: ${r.codigo}`)
    r.estado.eventos = [] // os eventos do passo ficam no passo (o estado não carrega a luta toda de novo a cada passo)
    passos.push({ cmd, eventos: r.eventos, estado: r.estado })
    e = r.estado
  }
  if (!e.fim || e.fim.vencedor !== auto.resultado.vencedor || e.fim.turno !== auto.resultado.turno) throw new Error('A luta refeita não bate com a do motor')
  return { inicial, passos, resultado: { ...e.fim, pct: { ...e.fim.pct } }, regras: regras ?? null }
}

/** O que aconteceu numa luta já calculada, lido só dos eventos do motor. */
export function resumirLuta(luta) {
  const b0 = luta.inicial.bonecos
  const por = {}
  for (const id of Object.keys(b0)) por[id] = { forte: 0, forteLevado: 0, dano: 0, levado: 0, criticos: 0, ultimoFio: false, caiu: false }
  let dados = 0, levados = 0, resistidos = 0, maior = { valor: 0, carta: null, de: null }, errou = 0
  for (const p of luta.passos) for (const ev of p.eventos) {
    if (ev.t === 'dano' && ev.de && por[ev.de] && golpeResistido(ev, b0[ev.alvo].tipo, luta.regras)) resistidos++
    if (ev.t === 'dano' && por[ev.alvo]) por[ev.alvo].levado += ev.valor
    if (ev.t === 'dano' && ev.de && por[ev.de]) {
      por[ev.de].dano += ev.valor
      if (ev.critico) por[ev.de].criticos++
      if (b0[ev.de].time === 'A' && ev.valor > maior.valor) maior = { valor: ev.valor, carta: ev.carta, de: ev.de }
      if (!ev.refletido && ev.carta && bateForte(CARTAS[ev.carta].tipo, b0[ev.alvo].tipo)) {
        por[ev.de].forte++; por[ev.alvo].forteLevado++
        if (b0[ev.de].time === 'A') dados++; else levados++
      }
    } else if (ev.t === 'ultimoFio') por[ev.alvo].ultimoFio = true
    else if (ev.t === 'caiu') por[ev.alvo].caiu = true
    else if (ev.t === 'errou') errou++
  }
  const r = luta.resultado
  const cansados = Object.keys(b0).filter((id) => b0[id].time === 'A' && b0[id].vida < b0[id].vidaMax)
  return { venceu: r.vencedor === 'A', turnos: r.turno, motivo: r.motivo, forteDados: dados, forteLevados: levados, resistidos, maior, errou, cansados, porMonstro: por }
}

/**
 * Uma luta da patrulha: trio do jogador (A) contra a guarda do lugar (B), com as regras do piloto.
 * `lutasHoje`: lutas do dia de cada monstro do trio ANTES desta (cansaço). `ordemDaGuarda`: a do lugar (shared/lugares.js).
 */
export function rodarLuta({ semente, trio, guarda, tatica = 'rush', ordem = null, taticaDaGuarda = 'rush', ordemDaGuarda = null, lutasHoje = [0, 0, 0] }) {
  const ordemA = trio.map((d, i) => ordem?.[i] ?? ordemPadrao(montarBoneco(d).cartas, i))
  const ordemB = guarda.map((d, i) => ordemDaGuarda?.[i] ?? ordemPadrao(montarBoneco(d).cartas, i))
  const luta = lutaComPassos({ semente, timeA: trio, timeB: guarda, ordensA: { tatica, ordem: ordemA }, ordensB: { tatica: taticaDaGuarda, ordem: ordemB }, regras: regrasDaLuta(lutasHoje) })
  return { luta, resumo: resumirLuta(luta) }
}

/** A tira final de uma patrulha. `nomes` = { A0, A1, A2, B0, B1, B2 }. A causa é UMA frase verdadeira, contada nos eventos. */
export function resumirPatrulha(resumos, nomes) {
  const v = resumos.filter((r) => r.venceu).length, d = resumos.length - v
  const dados = resumos.reduce((s, r) => s + r.forteDados, 0), levados = resumos.reduce((s, r) => s + r.forteLevados, 0)
  const cansadas = resumos.filter((r) => r.cansados?.length).length // lutas em que alguém do trio começou cansado
  const soma = (id, campo) => resumos.reduce((s, r) => s + (r.porMonstro[id]?.[campo] ?? 0), 0)
  const topo = (ids, campo) => ids.map((id) => ({ id, n: soma(id, campo) })).sort((a, b) => b.n - a.n)[0]
  const meu = topo(['A0', 'A1', 'A2'], 'forte'), sofreu = topo(['A0', 'A1', 'A2'], 'forteLevado'), deles = topo(['B0', 'B1', 'B2'], 'forte')
  const s = (n) => (n === 1 ? '' : 's')
  let causa
  if (v >= d && meu.n > 0) causa = { id: meu.id, texto: `${nomes[meu.id]} landed ${meu.n} Strong hit${s(meu.n)}` }
  else if (v < d && sofreu.n > 0) causa = { id: sofreu.id, texto: `${nomes[sofreu.id]} took ${sofreu.n} Strong hit${s(sofreu.n)}` }
  else if (meu.n > 0) causa = { id: meu.id, texto: `${nomes[meu.id]} landed ${meu.n} Strong hit${s(meu.n)}` }
  else if (deles.n > 0) causa = { id: deles.id, texto: `${nomes[deles.id]} of the guard landed ${deles.n} Strong hit${s(deles.n)}` }
  else causa = { id: null, texto: 'No Strong hits on either side' }
  // dano levado por posição de partida (Front, Middle, Back): o sinal da FORMAÇÃO
  const porLugar = ['A0', 'A1', 'A2'].map((id) => soma(id, 'levado'))
  return { v, d, dados, levados, cansadas, causa, porLugar }
}
