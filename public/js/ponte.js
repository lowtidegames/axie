// Frayz — PONTE entre a tela e o motor.
// No protótipo local o motor roda aqui no navegador (módulo ES de /shared). Quando houver servidor, SÓ ESTE ARQUIVO
// troca: as mesmas funções passam a chamar a rede. A tela (app.js, arena.js) nunca importa /shared direto
// e nunca calcula regra nem número: pergunta aqui e mostra o que voltar.
import { aplicar, bateForte, comandosValidos, criarLuta, montarBoneco, reproduzir, resultado, textoDaCarta, textoDoBordado, visaoDoTime } from '/shared/batalha.js'
import { planejarTurno } from '/shared/robos.js'
import { BONECOS_PRONTOS, BONUS_DE_TIPO, BORDADOS, CARTAS, NOMES_DOS_TIPOS, PARTES, RARIDADES, REGRAS, TIPOS } from '/shared/config.js'

export { BONUS_DE_TIPO, BORDADOS, CARTAS, NOMES_DOS_TIPOS, PARTES, RARIDADES, REGRAS, TIPOS }
export const ROBOS = ['ganancioso', 'planejador']
/** ASSUMPTION: o relógio de 20 s vem do desenho (docs/ideias/batalha-e-criaturas.md §5); ainda não tem chave em shared/config.js. */
export const TEMPO_DO_TURNO_S = 20
export const EU = 'A'
export const RIVAL = 'B'

// ---------------------------------------------------------------- catálogo e fichas (tudo vem do motor/config)

export const idsProntos = () => Object.keys(BONECOS_PRONTOS)

/** Ficha pronta para a tela: stats do motor + nomes das partes, cartas (com texto) e bordado (com texto). */
export function ficha(def) {
  const f = montarBoneco(def)
  const partes = {}
  for (const [slot, ref] of Object.entries(f.partes)) {
    const [id, raridade] = ref.split('@')
    partes[slot] = { id, raridade, nome: PARTES[id].nome, carta: PARTES[id].carta ?? null, tipo: PARTES[id].tipo ?? (PARTES[id].carta ? CARTAS[PARTES[id].carta].tipo : null) }
  }
  return {
    ...f,
    partes,
    cartasInfo: f.cartas.map((id) => infoDaCarta(id)),
    bordadoInfo: { id: f.bordado, nome: BORDADOS[f.bordado].nome, texto: textoDoBordado(f.bordado) },
  }
}

export function infoDaCarta(id) {
  const c = CARTAS[id]
  return { id, nome: c.nome, parte: c.parte, tipo: c.tipo, linha: c.linha, alvo: c.alvo, texto: textoDaCarta(id) }
}
export { textoDoBordado, textoDaCarta }

/** A carta causa dano? (a vantagem de tipo só importa para cartas de dano; lê o config) */
export const temDano = (idDaCarta) => CARTAS[idDaCarta].efeitos.some((e) => e.tipo === 'dano')

/** O tipo da carta bate forte no tipo do alvo? (pergunta ao motor) */
export const vantagem = (tipoDaCarta, tipoDoAlvo) => bateForte(tipoDaCarta, tipoDoAlvo)

// ---------------------------------------------------------------- luta

export const novaSemente = () => Math.random().toString(36).slice(2, 10)

export function novaLuta({ semente, timeA, timeB }) {
  return criarLuta({ semente, timeA, timeB })
}

/** O que a tela do jogador pode ver (sem a mão do rival). */
export const visao = (estado) => visaoDoTime(estado, EU)
export const comandos = (estado) => comandosValidos(estado)
export const fim = (estado) => resultado(estado)

/** Manda um comando ao motor. { ok:true, estado, eventos } ou { ok:false, codigo, motivo }. */
export function enviar(estado, cmd) {
  return aplicar(estado, cmd)
}

/** Comandos do robô para o turno atual (cada um deve ser enviado em ordem; se um falhar, planeje de novo). */
export const planoDoRobo = (estado, nome) => planejarTurno(estado, nome)

/** Comandos de `jogar` possíveis para UMA carta da mão (a cópia igual também vale: troca o id da carta). */
export function jogadasDaCarta(estado, cid) {
  const inst = estado.cartas[cid]
  if (!inst) return []
  const out = []
  for (const c of comandosValidos(estado)) {
    if (c.tipo !== 'jogar') continue
    const outra = estado.cartas[c.carta]
    if (c.carta === cid || (outra && outra.carta === inst.carta && outra.dono === inst.dono)) out.push({ ...c, carta: cid })
  }
  return out
}

export const podeFiapo = (estado, cid) => comandosValidos(estado).some((c) => c.tipo === 'fiapo' && c.carta === cid)
export const trocasPossiveis = (estado) => comandosValidos(estado).filter((c) => c.tipo === 'trocar')

/** Motivo do motor para uma carta que não pode ser jogada agora (pergunta ao motor; nada é calculado aqui). */
export function motivoDaRecusa(estado, cid) {
  const r = aplicar(estado, { tipo: 'jogar', time: estado.vez, carta: cid, alvo: null })
  return r.ok ? null : r.motivo
}

// ---------------------------------------------------------------- replay (semente + comandos, em texto curto)

const sep = ':'
function codificarComando(c) {
  if (c.tipo === 'passar') return 'p'
  if (c.tipo === 'jogar') return ['j', c.carta, c.alvo ?? ''].join(sep)
  if (c.tipo === 'trocar') return ['t', c.a, c.b].join(sep)
  if (c.tipo === 'fiapo') return ['f', c.carta].join(sep)
  throw new Error('Comando desconhecido')
}

/** Texto JSON curto do replay. Os bonecos prontos vão pelo nome. */
export function exportarReplay({ semente, timeA, timeB, comandos: cmds, robo }) {
  return JSON.stringify({ v: 1, s: semente, a: timeA, b: timeB, r: robo, c: cmds.map(codificarComando) })
}

/** Texto do replay → { semente, timeA, timeB, robo, comandos } ou lança Error com o motivo. */
export function lerReplay(texto) {
  let o
  try { o = JSON.parse(String(texto).trim()) } catch { throw new Error('Isso não parece um replay (JSON inválido).') }
  if (!o || o.v !== 1 || !(typeof o.s === 'string' || Number.isSafeInteger(o.s)) || !Array.isArray(o.a) || !Array.isArray(o.b) || !Array.isArray(o.c)) throw new Error('Replay incompleto ou de outra versão.')
  const montar = (l) => l.map((x) => {
    if (typeof x !== 'string' || !BONECOS_PRONTOS[x]) throw new Error('Replay com boneco desconhecido.')
    return x
  })
  const timeA = montar(o.a), timeB = montar(o.b)
  let e
  try { e = criarLuta({ semente: o.s, timeA, timeB }) } catch (x) { throw new Error('Replay inválido: ' + x.message) }
  const cmds = []
  for (const [i, s] of o.c.entries()) {
    if (typeof s !== 'string') throw new Error(`Replay inválido no comando ${i + 1}.`)
    const [k, a, b] = s.split(sep)
    const time = e.vez
    let c
    if (k === 'p') c = { tipo: 'passar', time }
    else if (k === 'j') c = { tipo: 'jogar', time, carta: a, alvo: b ? b : null }
    else if (k === 't') c = { tipo: 'trocar', time, a, b }
    else if (k === 'f') c = { tipo: 'fiapo', time, carta: a }
    else throw new Error(`Replay inválido no comando ${i + 1}.`)
    const r = aplicar(e, c)
    if (!r.ok) throw new Error(`Replay recusado pelo motor no comando ${i + 1}: ${r.motivo}`)
    e = r.estado
    cmds.push(c)
  }
  return { semente: o.s, timeA, timeB, robo: ROBOS.includes(o.r) ? o.r : 'planejador', comandos: cmds }
}

/** Refaz a luta inteira de uma vez (conferência do replay). */
export const conferirReplay = ({ semente, timeA, timeB, comandos: cmds }) => reproduzir({ semente, timeA, timeB, comandos: cmds })
