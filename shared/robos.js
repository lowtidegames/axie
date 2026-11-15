// Frayz — robôs da batalha. Puros e determinísticos (nenhum sorteio próprio; só leem o estado).
//   ganancioso: em cada passo joga o que tira MAIS vida do rival agora; sem dano possível, descarta fiapo e passa.
//   planejador: olha 2 turnos — o seu (busca em feixe pelas jogadas do turno), a resposta provável do rival
//               (estimada pela Linha dele, sem espiar a mão) e a Linha que sobra para o próximo turno seu.
//               Ao pensar, usa o crítico pela média (não espia o sorteio); se a sorte real mudar a mesa, planeja de novo.
// Os dois só usam comandosValidos/aplicar do motor: nunca mandam comando inválido.
//
// API: planejarTurno(estado, nome) → [comandos] (até o fim do turno, ou até uma compra — aí planeje de novo)
//      proximoComando(estado, nome) → comando
//      jogarTurno(estado, nome) → estado (mesmo objeto, mudado no lugar) — usado pelo simulador e testes
import { aplicarNoLugar, clonar, comandosValidos } from './batalha.js'
import { CARTAS, REGRAS } from './config.js'

export const ROBOS = ['ganancioso', 'planejador']
const outro = (t) => (t === 'A' ? 'B' : 'A')

function vidaDoTime(e, t) {
  let s = 0
  for (const id of e.times[t].lugares) { const b = e.bonecos[id]; s += b.vida + (b.estado === 'vivo' ? 1000 : b.estado === 'fio' ? 500 : 0) }
  return s
}

const comprou = (antes, depois, t) => depois.times[t].baralho.length !== antes.times[t].baralho.length || depois.times[t].descarte.length < antes.times[t].descarte.length

// ------------------------------------------------------------------ ganancioso

function passoGanancioso(e) {
  const t = e.vez, rival = outro(t)
  const base = vidaDoTime(e, rival)
  let melhor = null, melhorDano = 0, fiapo = null
  for (const c of comandosValidos(e)) {
    if (c.tipo === 'fiapo') { fiapo ??= c; continue }
    if (c.tipo !== 'jogar') continue
    const s = clonar(e, { simular: true })
    aplicarNoLugar(s, c)
    const dano = s.fim ? (s.fim.vencedor === t ? 1e9 : -1e9) : base - vidaDoTime(s, rival)
    if (dano > melhorDano) { melhorDano = dano; melhor = c }
  }
  return melhor ?? fiapo ?? { tipo: 'passar', time: t }
}

// ------------------------------------------------------------------ planejador

// Pesos do planejador (heurística do robô, não é número do jogo). Medidos no simulador.
//   custoTroca: trocar de lugar só vale se melhorar bem a posição · largura/profundidade: tamanho da busca no turno
export const PESO = { custoTroca: 90, largura: 4, profundidade: 6, vivo: 160, fio: 40, linhaGuardada: 24, maoCarta: 7, fioSoltoRival: 25, danoPorLinhaRival: 48, escudoAtras: 0.3 }

/** Valor do estado para o time `eu` (quanto maior, melhor). */
export function avaliar(e, eu) {
  if (e.fim) return e.fim.vencedor === eu ? 1e7 - e.turno : -1e7 + e.turno
  const rival = outro(eu)
  let s = 0
  for (const id of e.times[eu].lugares) { const b = e.bonecos[id]; if (b.estado === 'vivo') s += PESO.vivo + b.vida; else if (b.estado === 'fio') s += PESO.fio }
  for (const id of e.times[rival].lugares) {
    const b = e.bonecos[id]
    if (b.estado === 'vivo') { s -= PESO.vivo + b.vida; if (b.fioSoltoAte > e.turno) s += PESO.fioSoltoRival } else if (b.estado === 'fio') s -= PESO.fio
  }
  // mão e Linha que levo para o próximo turno (o que passar de linhaMaxima se perde)
  const meu = e.times[eu]
  s += PESO.maoCarta * meu.mao.filter((c) => e.bonecos[e.cartas[c].dono].estado !== 'caido').length
  if (e.vez === eu) s += PESO.linhaGuardada * Math.min(meu.linha, REGRAS.linhaMaxima - REGRAS.linhaPorTurno)
  // ameaça do rival no turno dele (estimada pela Linha que ele terá, sem espiar a mão)
  if (e.vez === eu) {
    const linhaRival = Math.min(REGRAS.linhaMaxima, e.times[rival].linha + REGRAS.linhaPorTurno)
    let ameaca = linhaRival * PESO.danoPorLinhaRival
    let frente = null
    for (const id of meu.lugares) if (e.bonecos[id].estado === 'vivo') { frente = e.bonecos[id]; break }
    if (frente) {
      if (frente.veu) ameaca = Math.max(0, ameaca - 90)
      const golpe = Math.max(0, ameaca - frente.escudo - frente.reserva) * (1 - frente.firmeza / 100)
      if (golpe >= frente.vida) s -= frente.vida + (frente.usouFio ? PESO.vivo : PESO.vivo * 0.4)
      else s -= golpe
      for (const id of meu.lugares) if (id !== frente.id) s += PESO.escudoAtras * e.bonecos[id].escudo
    }
  }
  return s
}

function planoDoPlanejador(e0) {
  const eu = e0.vez
  // grátis e sempre bom: descartar fiapo (abre espaço na mão e compra) e carta de 0 Linha que só compra
  for (const c of comandosValidos(e0)) {
    if (c.tipo === 'fiapo') return [c]
    if (c.tipo === 'jogar') {
      const d = CARTAS[e0.cartas[c.carta].carta]
      if (d.linha === 0 && d.efeitos.every((x) => x.tipo === 'compra')) return [c]
    }
  }
  const raiz = clonar(e0, { simular: true })
  let melhor = { plano: [], valor: avaliar(raiz, eu), comprou: false }
  let feixe = [{ e: raiz, plano: [] }]
  for (let p = 0; p < PESO.profundidade && feixe.length; p++) {
    const filhos = []
    for (const no of feixe) {
      for (const c of comandosValidos(no.e)) {
        if (c.tipo === 'passar' || c.tipo === 'fiapo') continue
        const s = clonar(no.e, { simular: true })
        aplicarNoLugar(s, c)
        const plano = [...no.plano, c]
        const fezCompra = comprou(no.e, s, eu)
        const v = avaliar(s, eu) - (c.tipo === 'trocar' ? PESO.custoTroca : 0) - (no.extra || 0)
        if (v > melhor.valor) melhor = { plano, valor: v, comprou: fezCompra || !!s.fim || s.vez !== eu }
        if (!fezCompra && !s.fim && s.vez === eu) filhos.push({ e: s, plano, v, extra: (no.extra || 0) + (c.tipo === 'trocar' ? PESO.custoTroca : 0) })
      }
    }
    filhos.sort((a, b) => b.v - a.v)
    feixe = filhos.slice(0, PESO.largura)
  }
  return melhor.comprou ? melhor.plano : [...melhor.plano, { tipo: 'passar', time: eu }]
}

// ------------------------------------------------------------------ API

/** Comandos do robô para o turno atual (para no primeiro que compra carta: depois disso, planeje de novo). */
export function planejarTurno(e, nome) {
  if (!e || e.fim) return []
  if (nome === 'ganancioso') {
    const s = clonar(e, { simular: true })
    const plano = []
    for (let i = 0; i < 40 && !s.fim && s.vez === e.vez; i++) {
      const c = passoGanancioso(s)
      const antes = clonar(s, { simular: true })
      aplicarNoLugar(s, c)
      plano.push(c)
      if (c.tipo === 'passar' || comprou(antes, s, e.vez)) break
    }
    return plano
  }
  if (nome === 'planejador') return planoDoPlanejador(e)
  throw new Error(`Robô desconhecido: ${nome}`)
}

export function proximoComando(e, nome) {
  return planejarTurno(e, nome)[0] ?? null
}

/** Joga o turno inteiro do robô no próprio estado (mudado no lugar). Devolve os comandos mandados. */
export function jogarTurno(e, nome) {
  const t = e.vez, mandados = []
  for (let rodada = 0; rodada < 20 && !e.fim && e.vez === t; rodada++) {
    const plano = planejarTurno(e, nome)
    for (let i = 0; i < plano.length; i++) {
      const r = aplicarNoLugar(e, plano[i])
      // o plano foi feito com o crítico "na média": se a sorte real mudou a mesa, planeja de novo
      if (!r.ok) { if (i === 0) throw new Error(`Robô ${nome} mandou comando inválido: ${r.codigo}`); break }
      mandados.push(plano[i])
      if (e.fim || e.vez !== t) break
    }
  }
  if (!e.fim && e.vez === t) { aplicarNoLugar(e, { tipo: 'passar', time: t }); mandados.push({ tipo: 'passar', time: t }) }
  return mandados
}
