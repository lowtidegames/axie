// Piloto — PATRULHA: contas puras em cima do motor (sem tela, sem sorteio próprio). Roda no navegador e no Node.
// A regra é do motor: "Strong" = habilidade de DANO cujo elemento bate forte no elemento do CORPO do alvo (bateForte de shared/).
// API:
//   vantagens(def, guardaDefs)      → { forte: [bool×3], fraco: [bool×3], nForte, nFraco }   (ícones "Strong vs / Weak to")
//   rodarLuta({ semente, trio, guarda, tatica, ordem }) → { luta, resumo }                   (a luta inteira + o que aconteceu nela)
//   resumirLuta(luta)               → { venceu, turnos, forteDados, forteLevados, maior, porMonstro }
//   resumirPatrulha(resumos, nomes) → { v, d, dados, levados, causa, porLugar }                      (a tira final; causa tirada dos eventos)
import { bateForte, montarBoneco } from '../../shared/batalha.js'
import { CARTAS } from '../../shared/config.js'
import { lutaInteira, ordemPadrao } from './tatica.js'

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
  return { forte, fraco, nForte: forte.filter(Boolean).length, nFraco: fraco.filter(Boolean).length }
}

/** O que aconteceu numa luta já calculada, lido só dos eventos do motor. */
export function resumirLuta(luta) {
  const b0 = luta.inicial.bonecos
  const por = {}
  for (const id of Object.keys(b0)) por[id] = { forte: 0, forteLevado: 0, dano: 0, levado: 0, criticos: 0, ultimoFio: false, caiu: false }
  let dados = 0, levados = 0, maior = { valor: 0, carta: null, de: null }, errou = 0
  for (const p of luta.passos) for (const ev of p.eventos) {
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
  return { venceu: r.vencedor === 'A', turnos: r.turno, motivo: r.motivo, forteDados: dados, forteLevados: levados, maior, errou, porMonstro: por }
}

/** Uma luta da patrulha: trio do jogador (A) contra a guarda do lugar (B, tática e ordem de fábrica). */
export function rodarLuta({ semente, trio, guarda, tatica = 'rush', ordem = null, taticaDaGuarda = 'rush' }) {
  const ordemA = {}, ordemB = {}
  trio.forEach((d, i) => { ordemA['A' + i] = ordem?.[i] ?? ordemPadrao(montarBoneco(d).cartas, i) })
  guarda.forEach((d, i) => { ordemB['B' + i] = ordemPadrao(montarBoneco(d).cartas, i) })
  const luta = lutaInteira({ semente, timeA: trio, timeB: guarda, planoA: { tatica, ordem: ordemA }, planoB: { tatica: taticaDaGuarda, ordem: ordemB } })
  return { luta, resumo: resumirLuta(luta) }
}

/** A tira final de uma patrulha. `nomes` = { A0, A1, A2, B0, B1, B2 }. A causa é UMA frase verdadeira, contada nos eventos. */
export function resumirPatrulha(resumos, nomes) {
  const v = resumos.filter((r) => r.venceu).length, d = resumos.length - v
  const dados = resumos.reduce((s, r) => s + r.forteDados, 0), levados = resumos.reduce((s, r) => s + r.forteLevados, 0)
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
  return { v, d, dados, levados, causa, porLugar }
}
