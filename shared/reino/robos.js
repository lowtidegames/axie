// Keepmile — 3 jogadores automáticos para o simulador (medir o jogo, não jogar no lugar de ninguém).
// Só olham o que a tela vê (opcoes/visao); a batalha não tem dado, então simular a luta à vista é jogo limpo.
//   aleatorio  → comando válido qualquer
//   ganancioso → a carta e o terreno que mais ajudam na luta desta rodada
//   planejador → pensa em família, nível e na horda de 3 rodadas à frente (e no chefe avisado)
//   plano:<id> → o planejador preso a um plano da bíblia (PLANOS), para medir se o plano é viável bem jogado
//
// API: escolher(robo, estado, inteiro) → comando. `inteiro(n)` → [0, n) (sorteio do próprio robô).
import { CARTAS, CHEFES, HORDA, INVASORES, PARTIDA as P } from './config.js'
import { montarExercito, simularBatalha } from './batalha.js'
import { aplicar, criarPartida, opcoes, visao } from './partida.js'

export const ROBOS = ['aleatorio', 'ganancioso', 'planejador']

/** Nota de uma luta: vitória vale muito; depois, quanto sobrou de vida; na derrota, quanto da horda caiu. */
export function notaDaLuta(b) { return b.vitoria ? 1000 + b.pctSoldados - b.tiques / 30 : b.pctHorda }

/** Força parada do reino (sem lutar): vida efetiva × ataque, com os bônus de magia. Só para desempate. */
export function forcaEstatica(terrenos, reliquias = []) {
  const ex = montarExercito(terrenos, reliquias)
  let ehp = 0, dps = 0, mult = 1
  for (const s of ex.soldados) {
    ehp += s.qtd * (s.vida * 100 / (100 - s.reducao) + s.curaSeg * 15)
    if (s.cura) ehp += s.qtd * s.cura * 10 / s.cad * 15
    let ataque = s.dano * 10 / s.cad * (100 + s.rapidez) / 100
    if (CARTAS[s.carta].explode) ataque *= 2
    if (CARTAS[s.carta].saltos) ataque *= 1 + CARTAS[s.carta].saltos
    dps += s.qtd * ataque
  }
  for (const m of ex.magias) {
    const v = m.valor * m.forca / 100 * (100 + m.bis) / 100
    if (m.efeito === 'barril') dps += v / 5
    else if (m.efeito === 'abelhas') dps += v * 2
    else if (m.efeito === 'piche') mult *= 1 + v / 200
    else if (m.efeito === 'laco') mult *= 1 + v / 25
    else if (m.efeito === 'corneta') mult *= 1 + v / 300
    else if (m.efeito === 'repeteco') ehp *= 1 + v / 200
    else if (m.efeito === 'levanta') ehp += v * 25
    else if (m.efeito === 'finale') mult *= 1 + v / 100
  }
  return Math.sqrt(ehp * dps) * mult
}

/** Horda de referência (sem sorteio) para a rodada r: os tipos já liberados em partes iguais; chefe se for rodada de chefe. */
export function hordaDeReferencia(r) {
  const chefe = r % HORDA.chefeACada === 0 ? CHEFES[(r / HORDA.chefeACada - 1) % CHEFES.length] : null
  let pontos = HORDA.pontosBase + HORDA.pontosPorRodada * r
  if (chefe) pontos = Math.floor(pontos * HORDA.chefePontos / 100 + 0.5)
  const tipos = Object.keys(INVASORES).filter((k) => INVASORES[k].desde <= r)
  const ordem = []
  for (let i = 0; pontos >= INVASORES.muncher.pontos; i++) {
    const t = tipos[i % tipos.length]
    if (INVASORES[t].pontos > pontos) { ordem.push('muncher'); pontos -= INVASORES.muncher.pontos; continue }
    ordem.push(t)
    pontos -= INVASORES[t].pontos
  }
  if (chefe) ordem.push(chefe.id)
  return { rodada: r, ordem }
}

function comTerreno(terrenos, carta, k) {
  const out = terrenos.map((t) => (t ? { ...t } : null))
  const a = out[k - 1]
  out[k - 1] = a && a.carta === carta ? { carta, nivel: a.nivel + 1 } : { carta, nivel: 1 }
  return out
}
function promovido(terrenos, k) {
  const out = terrenos.map((t) => (t ? { ...t } : null))
  out[k - 1] = { carta: out[k - 1].carta, nivel: out[k - 1].nivel + 1 }
  return out
}
const luta = (terrenos, reliquias, horda) => notaDaLuta(simularBatalha({ terrenos, reliquias, horda, eventos: false }))

function melhor(lista, nota) {
  let m = null, mn = -Infinity
  for (const x of lista) { const n = nota(x); if (n > mn) { m = x; mn = n } }
  return m
}

// ---------------------------------------------------------------- aleatório
function aleatorio(e, inteiro) {
  const o = opcoes(e)
  if (o.fase === 'carta') {
    const por = o.comandos.filter((c) => c.tipo === 'por')
    if (por.length) return por[inteiro(por.length)]
    return { tipo: 'batalhar' }
  }
  const esp = o.comandos.filter((c) => c.tipo === 'espolio')
  return esp[inteiro(esp.length)]
}

// ---------------------------------------------------------------- ganancioso
function ganancioso(e) {
  const v = visao(e)
  const o = opcoes(e)
  if (o.fase === 'carta') {
    if (o.consertar.pode && v.vidas === 1) return { tipo: 'consertar' }
    const por = o.comandos.filter((c) => c.tipo === 'por')
    if (!por.length) return { tipo: 'batalhar' }
    return melhor(por, (c) => {
      const t = comTerreno(v.terrenos, c.carta, c.terreno)
      return luta(t, v.reliquias, v.horda) * 1000 + forcaEstatica(t, v.reliquias)
    })
  }
  // espólio: o que mais aumenta a força agora; ouro não conta para ele
  const esp = o.comandos.filter((c) => c.tipo === 'espolio')
  const base = forcaEstatica(v.terrenos, v.reliquias)
  return melhor(esp, (c) => {
    const x = v.espolios[c.indice]
    if (x.tipo === 'carta') return forcaEstatica(comTerreno(v.terrenos, x.carta, c.terreno), v.reliquias)
    if (x.tipo === 'promocao') return forcaEstatica(promovido(v.terrenos, c.terreno), v.reliquias)
    if (x.reliquia) return forcaEstatica(v.terrenos, [...v.reliquias, x.reliquia]) + base * 0.05
    return base
  })
}

// ---------------------------------------------------------------- planejador
/** Horda que o planejador usa para pensar à frente: o chefe avisado, senão a de 3 rodadas depois. */
function hordaAlvo(v) {
  const pc = v.proximoChefe
  if (pc.avisado && pc.rodada > v.rodada) return hordaDeReferencia(pc.rodada)
  return hordaDeReferencia(v.rodada + 3)
}

/** Valor de longo prazo de um reino: luta contra a horda à frente + força parada + família ligada + níveis. */
function valorFuturo(terrenos, reliquias, alvo) {
  const fam = montarExercito(terrenos, reliquias).familias.length
  let niveis = 0
  for (const t of terrenos) if (t) niveis += t.nivel
  return luta(terrenos, reliquias, alvo) * 10 + forcaEstatica(terrenos, reliquias) + fam * 40 + niveis * 5
}

function planejador(e) {
  const v = visao(e)
  const o = opcoes(e)
  const alvo = hordaAlvo(v)
  if (o.fase === 'carta') {
    if (o.consertar.pode && (v.vidas === 1 || v.ouro >= o.consertar.custo + 15)) return { tipo: 'consertar' }
    if (v.cartaPosta) return { tipo: 'batalhar' }
    const por = o.comandos.filter((c) => c.tipo === 'por')
    if (!por.length) return { tipo: 'batalhar' }
    // 1º: tudo contra a horda de agora; 2º: entre as que vencem (ou as melhores), pensa à frente nas 6 mais fortes
    const cand = por.map((c) => {
      const t = comTerreno(v.terrenos, c.carta, c.terreno)
      return { c, t, agora: luta(t, v.reliquias, v.horda), h: forcaEstatica(t, v.reliquias) }
    })
    const vencem = cand.filter((x) => x.agora >= 1000)
    if (!vencem.length && o.sortear.pode && v.ouro - o.sortear.custo >= (v.vidas < v.vidasMax ? 0 : 10) && e.sorteios < 2) return { tipo: 'sortear' }
    const pool = (vencem.length ? vencem : cand.sort((a, b) => b.agora - a.agora).slice(0, 6)).sort((a, b) => b.h - a.h).slice(0, 6)
    return melhor(pool, (x) => x.agora * (vencem.length ? 0 : 10) + valorFuturo(x.t, v.reliquias, alvo)).c
  }
  const esp = o.comandos.filter((c) => c.tipo === 'espolio')
  const base = valorFuturo(v.terrenos, v.reliquias, alvo)
  return melhor(esp, (c) => {
    const x = v.espolios[c.indice]
    if (x.tipo === 'carta') return valorFuturo(comTerreno(v.terrenos, x.carta, c.terreno), v.reliquias, alvo)
    if (x.tipo === 'promocao') return valorFuturo(promovido(v.terrenos, c.terreno), v.reliquias, alvo)
    if (x.reliquia) {
      if (x.reliquia === 'crown') return base + 400
      if (x.reliquia === 'horseshoe' || x.reliquia === 'ledger') return base + 150
      return valorFuturo(v.terrenos, [...v.reliquias, x.reliquia], alvo) + 50
    }
    return base + x.ouro * 12
  })
}

// ---------------------------------------------------------------- robôs de plano
// Medem se cada plano da bíblia (seção 13) é viável quando bem jogado: jogam como o planejador, mas
// preferem as cartas do plano (bônus por nível de carta do plano no reino) e sorteiam de novo quando a oferta não tem nenhuma.
// Só saem do plano para não perder a luta de agora.
export const PLANOS = {
  muralha: { nome: 'Wall & arrows', cartas: ['T01', 'T02', 'T04', 'T05', 'T06', 'B03', 'B04', 'B05', 'M06'] },
  bando: { nome: 'Crowd & Smithy', cartas: ['T01', 'T07', 'T11', 'B01', 'B02', 'M04'] },
  campeao: { nome: 'Lone champion', cartas: ['T03', 'B08', 'B03', 'T08', 'M05', 'M07', 'B06', 'T04'] },
  armadilhas: { nome: 'Trap road', cartas: ['M06', 'M02', 'M03', 'M01', 'B09', 'M08', 'T04', 'T09', 'T12', 'T06'] },
  cozinha: { nome: 'Kitchen', cartas: ['T07', 'T08', 'T09', 'B06', 'B08', 'B07', 'M05', 'M07'] },
  explosao: { nome: 'Boom', cartas: ['T10', 'T11', 'B10', 'M01', 'B02', 'T12', 'B09', 'M08'] },
  ouro: { nome: 'Gold', cartas: ['B07', 'T07', 'T01', 'T02', 'B06', 'B01', 'T04'] },
}
export const ROBOS_PLANO = Object.keys(PLANOS).map((k) => `plano:${k}`)
const PESO_PLANO = 60 // por nível de carta do plano no reino

function bonusPlano(terrenos, plano) {
  let n = 0
  for (const t of terrenos) if (t && plano.cartas.includes(t.carta)) n += t.nivel
  return n * PESO_PLANO
}

function roboDePlano(e, plano) {
  const v = visao(e)
  const o = opcoes(e)
  const alvo = hordaAlvo(v)
  const valor = (t, rel = v.reliquias) => valorFuturo(t, rel, alvo) + bonusPlano(t, plano)
  if (o.fase === 'carta') {
    if (o.consertar.pode && (v.vidas === 1 || v.ouro >= o.consertar.custo + 15)) return { tipo: 'consertar' }
    if (v.cartaPosta) return { tipo: 'batalhar' }
    const por = o.comandos.filter((c) => c.tipo === 'por')
    if (!por.length) return { tipo: 'batalhar' }
    const temPlano = e.oferta.some((c) => plano.cartas.includes(c))
    const reserva = v.vidas < v.vidasMax ? 0 : 10
    if (!temPlano && o.sortear.pode && v.ouro - o.sortear.custo >= reserva && e.sorteios < 3) return { tipo: 'sortear' }
    const cand = por.map((c) => {
      const t = comTerreno(v.terrenos, c.carta, c.terreno)
      return { c, t, agora: luta(t, v.reliquias, v.horda), h: forcaEstatica(t, v.reliquias) + bonusPlano(t, plano) }
    })
    const vencem = cand.filter((x) => x.agora >= 1000)
    if (!vencem.length && o.sortear.pode && v.ouro - o.sortear.custo >= reserva && e.sorteios < 2) return { tipo: 'sortear' }
    const pool = (vencem.length ? vencem : cand.sort((a, b) => b.agora - a.agora).slice(0, 6)).sort((a, b) => b.h - a.h).slice(0, 6)
    return melhor(pool, (x) => x.agora * (vencem.length ? 0 : 10) + valor(x.t)).c
  }
  const esp = o.comandos.filter((c) => c.tipo === 'espolio')
  const base = valor(v.terrenos)
  const ouroVale = plano === PLANOS.ouro ? 20 : 12
  return melhor(esp, (c) => {
    const x = v.espolios[c.indice]
    if (x.tipo === 'carta') return valor(comTerreno(v.terrenos, x.carta, c.terreno))
    if (x.tipo === 'promocao') return valor(promovido(v.terrenos, c.terreno))
    if (x.reliquia) {
      if (x.reliquia === 'crown') return base + 400
      if (x.reliquia === 'horseshoe' || x.reliquia === 'ledger') return base + 150
      return valor(v.terrenos, [...v.reliquias, x.reliquia]) + 50
    }
    return base + x.ouro * ouroVale
  })
}

export function escolher(robo, estado, inteiro) {
  if (robo === 'aleatorio') return aleatorio(estado, inteiro)
  if (robo === 'ganancioso') return ganancioso(estado)
  if (robo === 'planejador') return planejador(estado)
  if (robo.startsWith('plano:') && Object.hasOwn(PLANOS, robo.slice(6))) return roboDePlano(estado, PLANOS[robo.slice(6)])
  throw new Error(`Robô desconhecido: ${robo}`)
}

/** Joga uma partida inteira; devolve o estado final, os comandos e o diário de escolhas. */
// diário: uma linha por comando, com o que o simulador mede (tipo de carta, LEVEL UP, espólio, batalha)
export function jogarPartida({ robo, semente, cartasLiberadas, inteiro }) {
  let e = criarPartida({ semente, cartasLiberadas })
  const comandos = []
  const diario = []
  for (let g = 0; g < P.tetoComandos && e.fase !== 'fim'; g++) {
    const c = escolher(robo, e, inteiro)
    const r = aplicar(e, c, { eventos: false })
    if (!r.ok) throw new Error(`robô ${robo} mandou comando recusado: ${r.erro} ${JSON.stringify(c)}`)
    const linha = { tipo: c.tipo, rodada: e.rodada }
    if (c.tipo === 'por') {
      // LEVEL UP de verdade = a carta subiu de nível no terreno dela (a cópia posta noutro terreno é carta nova)
      const t = e.terrenos[c.terreno - 1]
      linha.carta = c.carta; linha.levelUpOferecido = e.levelUp; linha.levelUp = !!(t && t.carta === c.carta)
      linha.reinoCheio = e.terrenos.every(Boolean)
    }
    if (c.tipo === 'espolio') linha.espolio = e.espolios[c.indice]
    if (c.tipo === 'batalhar') {
      const b = r.eventos.find((x) => x.tipo === 'batalha')
      linha.batalha = { vitoria: b.vitoria, segundos: b.segundos, porTempo: b.porTempo, chefe: b.horda.chefe }
      linha.luta = { terrenos: e.terrenos, reliquias: e.reliquias, horda: e.horda }
    }
    comandos.push(c)
    diario.push(linha)
    e = r.estado
  }
  return { estado: e, comandos, diario }
}
