// Piloto — A LUTA: contas puras em cima do motor (sem tela, sem sorteio próprio). Roda no navegador e no Node.
// O escolhedor é o do motor (shared/tatica.js, lutaAutomatica) com tática e ordem PADRÃO para o time do jogador (o jogador
// não escolhe) e as ordens da guarda do lugar (shared/lugares.js). A tela refaz os comandos passo a passo com aplicar()
// do motor (mesmas regras), só para poder mostrar cada passo.
// API:
//   rodarLuta({ semente, time, lugar, lutasHoje }) → { inicial, passos: [{ cmd, eventos, estado }], resultado, regras }
//   golpeResistido(ev, tipoDoAlvo, regras)         → o golpe foi resistido pelo corpo do alvo?
//   vantagem(def, guardaDefs)                      → +1 (seta verde), −1 (seta vermelha) ou 0, pela regra de elemento do motor
import { aplicar, bateForte, criarLuta } from '../../shared/batalha.js'
import { CARTAS } from '../../shared/config.js'
import { vantagens } from '../../shared/lugares.js'
import { lutaAutomatica } from '../../shared/tatica.js'
import { REGRAS_PILOTO, regrasDaLuta } from './regras-piloto.js'

/** O golpe (evento 'dano' do motor) foi resistido pelo corpo do alvo? Só com resistência nas regras da luta. */
export function golpeResistido(ev, tipoDoAlvo, regras = REGRAS_PILOTO) {
  return !!(regras?.resistencia && !ev.refletido && ev.carta && bateForte(tipoDoAlvo, CARTAS[ev.carta].tipo))
}

/**
 * Uma luta: o time do jogador (A) contra a guarda do lugar (B), com as regras do piloto. O resultado nasce AQUI.
 * `time`: 3 definições (Front, Middle, Back). `lugar`: { guarda: [3 ids], ordens } de shared/lugares.js.
 * `lutasHoje`: lutas do dia de cada monstro do time ANTES desta (cansaço). Lança erro se o refazer divergir do motor.
 */
export function rodarLuta({ semente, time, lugar, lutasHoje = [0, 0, 0] }) {
  const regras = regrasDaLuta(lutasHoje)
  const base = { semente, timeA: time, timeB: lugar.guarda, regras }
  const auto = lutaAutomatica({ ...base, ordensA: {}, ordensB: lugar.ordens, registro: false })
  let e = criarLuta(base)
  const inicial = e
  const passos = []
  for (const cmd of auto.comandos) {
    const r = aplicar(e, cmd)
    if (!r.ok) throw new Error(`Comando inválido ao refazer a luta: ${r.codigo}`)
    r.estado.eventos = [] // os eventos do passo ficam no passo
    passos.push({ cmd, eventos: r.eventos, estado: r.estado })
    e = r.estado
  }
  if (!e.fim || e.fim.vencedor !== auto.resultado.vencedor || e.fim.turno !== auto.resultado.turno) throw new Error('A luta refeita não bate com a do motor')
  return { inicial, passos, resultado: { ...e.fim, pct: { ...e.fim.pct } }, regras }
}

/** Seta de vantagem de UM monstro contra a guarda: bate forte em mais gente do que apanha forte = +1; o contrário = −1. */
export function vantagem(def, guardaDefs) {
  const [v] = vantagens([def], guardaDefs)
  return Math.sign(v.forte - v.fraco)
}
