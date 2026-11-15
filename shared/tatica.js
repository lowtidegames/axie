// Motor — o ESCOLHEDOR da luta automática (cópia fiel de public/piloto/tatica.js; a tela passa a importar daqui depois).
// Função pura: só lê o estado e usa comandosValidos/aplicar do motor. Desenho: docs/ideias/piloto-monstros.md §6
// e docs/ideias/jogo-idle.md (N1). Nenhum sorteio aqui: todo sorteio é do motor (semente).
//
// Plano de um time (o que o jogador decide antes da luta):
//   { tatica: 'rush'|'focus'|'guard', ordem: { <id do monstro na luta, ex. 'A0'>: [ids de carta em ordem; as Off ficam fora] } }
//   (em lutaAutomatica a ordem também pode vir por posição: [[cartas do 1º], [do 2º], [do 3º]])
// API:
//   TATICAS · POSICOES · SEGURANCA
//   classeDaCarta(id) · ordemPadrao(cartas, lugar) · ordemRuim(cartas, lugar)
//   escolher(estado, plano)             → um comando válido para a vez atual
//   jogarTurnoEscolhedor(estado, plano) → joga o turno inteiro no próprio estado
//   cartasDoMonstro(estado, id)         → as 3 cartas do monstro (cabeça, braços, pernas)
//   lutaAutomatica({ semente, timeA, timeB, ordensA, ordensB }) → { resultado, eventos, comandos }
//     determinística; os comandos refazem a mesma luta com reproduzir() do motor.
import { aplicarNoLugar, comandosValidos, criarLuta } from './batalha.js'
import { CARTAS, REGRAS } from './config.js'

export const TATICAS = ['rush', 'focus', 'guard']
export const POSICOES = REGRAS.lugares // índice 0 = Front, 1 = Middle, 2 = Back

// regras de segurança (desenho §6, item 4): não são números de economia; são do escolhedor
export const SEGURANCA = { trocaSeFrenteAbaixoDe: 0.35, defesaSeAliadoAte: 0.5 }

const outro = (t) => (t === 'A' ? 'B' : 'A')
const pct = (b) => (b.vidaMax ? b.vida / b.vidaMax : 0)

/** Classe da carta pelo que ela faz: dano = ataque; escudo, véu ou cura de outro = defesa; o resto = apoio. */
export function classeDaCarta(id) {
  const c = CARTAS[id]
  if (!c) throw new Error(`Carta desconhecida: ${id}`)
  if (c.efeitos.some((x) => x.tipo === 'dano')) return 'ataque'
  if (c.efeitos.some((x) => x.tipo === 'escudo' || x.tipo === 'veu' || (x.tipo === 'cura' && x.em !== 'si'))) return 'defesa'
  return 'apoio'
}

const PESO_FABRICA = { frente: { ataque: 0, defesa: 1, apoio: 2 }, tras: { defesa: 0, ataque: 1, apoio: 2 } }

/** Ordem de fábrica: quem está na frente ataca primeiro; quem está no Back faz cura e Guard primeiro. */
export function ordemPadrao(cartas, lugar = 0) {
  const peso = lugar === POSICOES.length - 1 ? PESO_FABRICA.tras : PESO_FABRICA.frente
  return cartas.map((id, i) => ({ id, i })).sort((a, b) => peso[classeDaCarta(a.id)] - peso[classeDaCarta(b.id)] || a.i - b.i).map((x) => x.id)
}

/** O contrário da ordem de fábrica (para a medição "ordem boa × ordem ruim"). */
export function ordemRuim(cartas, lugar = 0) {
  return ordemPadrao(cartas, lugar).reverse()
}

// ------------------------------------------------------------------ escolha

function frenteDoTime(e, t) {
  for (const id of e.times[t].lugares) if (e.bonecos[id].estado === 'vivo') return e.bonecos[id]
  return null
}

function ehDefesa(def) {
  return def.efeitos.some((x) => x.tipo === 'escudo' || x.tipo === 'veu' || (x.tipo === 'cura' && x.em !== 'si'))
}

/** A carta presta agora? (regras de segurança fixas) */
function seguro(e, usuario, def, alvo) {
  const t = usuario.time
  for (const ef of def.efeitos) {
    if (ef.tipo === 'autoDano' && usuario.vida <= ef.valor) return false // nunca se leva a 0
    if (ef.tipo === 'trocaComAlvo') {
      const f = frenteDoTime(e, t)
      if (!f || pct(f) >= SEGURANCA.trocaSeFrenteAbaixoDe) return false
    }
    if (ef.tipo === 'veu' && usuario.veu) return false
    if (ef.tipo === 'cura' && ef.em !== 'si' && def.efeitos.every((x) => x.tipo !== 'dano')) {
      const b = alvo ? e.bonecos[alvo] : null
      if (!b || b.vida >= b.vidaMax) return false // cura que não cura nada
    }
    if (ef.tipo === 'escudo' && def.efeitos.every((x) => x.tipo !== 'dano')) {
      const lista = ef.em === 'si' ? [usuario] : ef.em === 'alvo' ? (alvo ? [e.bonecos[alvo]] : []) : e.times[t].lugares.map((id) => e.bonecos[id])
      if (ef.em !== 'alvo' && !lista.some((b) => b.estado === 'vivo' && b.escudo < REGRAS.escudoMaximo)) return false
    }
    if (ef.tipo === 'compra' && def.efeitos.length === 1) {
      const time = e.times[t]
      if (time.baralho.length + time.descarte.length === 0 || time.mao.length >= REGRAS.maoMaxima) return false
    }
  }
  return true
}

/** Entre os alvos válidos de uma carta, o que a tática manda. */
function escolherAlvo(e, usuario, def, alvos, tatica) {
  if (alvos.length === 1) return alvos[0]
  const t = usuario.time
  const lugar = (id) => e.times[e.bonecos[id].time].lugares.indexOf(id)
  const menorPct = (lista) => lista.slice().sort((a, b) => pct(e.bonecos[a]) - pct(e.bonecos[b]) || lugar(a) - lugar(b))[0]
  switch (def.alvo) {
    case 'inimigo': return tatica === 'focus' ? menorPct(alvos) : alvos.slice().sort((a, b) => lugar(a) - lugar(b))[0]
    case 'aliado': return menorPct(alvos)
    case 'vizinho': return menorPct(alvos.filter(Boolean)) ?? alvos[0]
    case 'outroAliado': {
      // Current Step: se ele é a Frente, troca com o do Back; senão vai para a Frente (protege o ferido)
      const f = frenteDoTime(e, t)
      if (f && f.id !== usuario.id && alvos.includes(f.id)) return f.id
      return alvos.slice().sort((a, b) => lugar(b) - lugar(a))[0]
    }
    default: return alvos[0]
  }
}

/** Um comando válido para a vez atual, pelo plano do time. Nunca devolve comando inválido. */
export function escolher(e, plano = {}) {
  const validos = comandosValidos(e)
  if (!validos.length) return null
  const t = e.vez
  const passar = validos.find((c) => c.tipo === 'passar') ?? { tipo: 'passar', time: t }
  // 1. fiapo é de graça e compra 1
  const fiapo = validos.find((c) => c.tipo === 'fiapo')
  if (fiapo) return fiapo
  const tatica = TATICAS.includes(plano.tatica) ? plano.tatica : 'rush'
  // 2. jogadas válidas agrupadas por carta (mesma carta, alvos diferentes), sem as Off
  const grupos = new Map()
  for (const c of validos) {
    if (c.tipo !== 'jogar') continue // 4. nunca troca sozinho
    const inst = e.cartas[c.carta]
    const ordem = plano.ordem?.[inst.dono] ?? ordemPadrao(e.bonecos[inst.dono] ? cartasDoMonstro(e, inst.dono) : [], e.times[t].lugares.indexOf(inst.dono))
    const posto = ordem.indexOf(inst.carta)
    if (posto < 0) continue // Off
    const chave = inst.carta + '|' + inst.dono
    if (!grupos.has(chave)) grupos.set(chave, { carta: c.carta, id: inst.carta, dono: inst.dono, posto, alvos: [] })
    grupos.get(chave).alvos.push(c.alvo ?? null)
  }
  const aliadoBaixo = e.times[t].lugares.some((id) => e.bonecos[id].estado === 'vivo' && pct(e.bonecos[id]) <= SEGURANCA.defesaSeAliadoAte)
  const classe = (g) => {
    const def = CARTAS[g.id]
    if (tatica === 'guard') return aliadoBaixo && ehDefesa(def) ? 0 : 1
    return def.efeitos.some((x) => x.tipo === 'dano') ? 0 : 1 // Rush e Focus: ataques primeiro
  }
  const lugar = (id) => e.times[t].lugares.indexOf(id)
  // 3. tática, depois posto (as 1ª de todos, depois as 2ª...), depois Front > Middle > Back
  const lista = [...grupos.values()].sort((a, b) => classe(a) - classe(b) || a.posto - b.posto || lugar(a.dono) - lugar(b.dono))
  // 5 e 6. alvo pela regra; joga a primeira que presta
  for (const g of lista) {
    const def = { id: g.id, ...CARTAS[g.id] }
    const usuario = e.bonecos[g.dono]
    const alvo = escolherAlvo(e, usuario, def, g.alvos, tatica)
    if (!seguro(e, usuario, def, alvo)) continue
    const cmd = { tipo: 'jogar', time: t, carta: g.carta, alvo }
    if (validos.some((c) => c.tipo === 'jogar' && c.carta === cmd.carta && (c.alvo ?? null) === alvo)) return cmd
  }
  return passar
}

/** As 3 cartas do monstro (cabeça, braços, pernas), lidas do estado. */
export function cartasDoMonstro(e, id) {
  const vistas = []
  for (const cid of Object.keys(e.cartas)) {
    const c = e.cartas[cid]
    if (c.dono === id && c.carta && !vistas.includes(c.carta)) vistas.push(c.carta)
  }
  const ordemParte = { cabeca: 0, bracos: 1, pernas: 2 }
  return vistas.sort((a, b) => ordemParte[CARTAS[a].parte] - ordemParte[CARTAS[b].parte])
}

/** Joga o turno inteiro do escolhedor no próprio estado. Devolve os comandos mandados. */
export function jogarTurnoEscolhedor(e, plano) {
  const t = e.vez, mandados = []
  for (let i = 0; i <= REGRAS.maxComandosPorTurno + 1 && !e.fim && e.vez === t; i++) {
    const cmd = escolher(e, plano)
    const r = aplicarNoLugar(e, cmd)
    if (!r.ok) throw new Error(`Escolhedor mandou comando inválido: ${r.codigo}`)
    mandados.push(cmd)
  }
  return mandados
}

/**
 * Plano do time t a partir das ordens: tática + ordem por id de luta. Monstro sem ordem dada fica com a de fábrica
 * calculada pelo escolhedor a cada passo, pela posição ATUAL (como no piloto: quem vai para a Frente passa a atacar primeiro).
 */
export function planoCompleto(e, t, ordens = {}) {
  const tatica = TATICAS.includes(ordens?.tatica) ? ordens.tatica : 'rush'
  const ordem = {}
  e.times[t].lugares.forEach((id, i) => {
    const dada = Array.isArray(ordens?.ordem) ? ordens.ordem[i] : ordens?.ordem?.[id]
    if (Array.isArray(dada)) ordem[id] = dada.slice()
  })
  return { tatica, ordem }
}

// teto de passos: cada turno tem no máximo REGRAS.maxComandosPorTurno + 1 comandos e a luta acaba no turnoFinal
const MAX_PASSOS = (REGRAS.turnoFinal + 2) * (REGRAS.maxComandosPorTurno + 2)

/**
 * A luta automática inteira: os dois lados no escolhedor. Determinística (semente + times + ordens).
 * timeA/timeB: 3 bonecos na ordem Front, Middle, Back. ordensA/ordensB: { tatica, ordem? }.
 * Devolve { resultado, eventos, comandos }; reproduzir({ semente, timeA, timeB, comandos }) dá o mesmo resultado.
 * `registro: false` corta os eventos (simulador em massa); os comandos vêm sempre.
 */
export function lutaAutomatica({ semente, timeA, timeB, ordensA = {}, ordensB = {}, registro = true }) {
  const e = criarLuta({ semente, timeA, timeB })
  e.registro = registro
  const planos = { A: planoCompleto(e, 'A', ordensA), B: planoCompleto(e, 'B', ordensB) }
  const comandos = []
  for (let g = 0; g < MAX_PASSOS && !e.fim; g++) {
    const cmd = escolher(e, planos[e.vez])
    const r = aplicarNoLugar(e, cmd)
    if (!r.ok) throw new Error(`Escolhedor mandou comando inválido no passo ${g}: ${r.codigo}`)
    comandos.push(cmd)
  }
  if (!e.fim) throw new Error('A luta automática não terminou')
  return { resultado: { ...e.fim, pct: { ...e.fim.pct } }, eventos: e.eventos, comandos }
}
