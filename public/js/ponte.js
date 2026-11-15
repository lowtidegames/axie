// Frayz — PONTE entre a tela e o jogo (fachada). A tela (app.js, *-ui.js, colecao.js) só fala com ESTE arquivo.
// Dois modos, escolhidos sozinhos na partida (iniciar):
//   · LOCAL (ponte-local.js): o motor de /shared roda aqui no navegador e a coleção fica no aparelho. É o da página de
//     teste parada (arquivos sem servidor) e o de `?modo=local`.
//   · SERVIDOR (ponte-servidor.js): o servidor do Frayz decide tudo por HTTP. Ele responde `public/modo.json` com
//     { modo: 'servidor' }; o arquivo parado diz 'local' (assim a escolha nunca gera pedido com 404).
// Leituras (catálogo, fichas, a visão da luta, os comandos válidos, a energia guardada) são síncronas nos dois modos;
// AÇÕES (abrir luta, mandar comando, costurar, abrir casulo, aposentar, carregar a coleção) são promessas nos dois modos.
// A tela nunca calcula regra nem número: pergunta aqui e mostra o que voltar.
import { aplicar, comandosValidos, criarLuta, resultado, visaoDoTime } from '../../shared/batalha.js'
import { planejarTurno } from '../../shared/robos.js'
import * as L from './ponte-local.js'
import * as R from './ponte-servidor.js'

export * from './ponte-local.js'

let MODO = 'local'
/** 'local' ou 'servidor' (escolhido em iniciar). */
export const modo = () => MODO

/** Escolhe o modo: servidor do Frayz respondendo → 'servidor'; arquivo parado, 404, erro de rede ou ?modo=local → 'local'. */
export async function iniciar() {
  const forcarLocal = new URLSearchParams(location.search).get('modo') === 'local'
  MODO = !forcarLocal && (await R.detectar()) ? 'servidor' : 'local'
  return { modo: MODO }
}

/** Conta (só no modo servidor; no local não há conta). */
export const conta = {
  temSessao: () => MODO !== 'servidor' || R.temSessao(),
  apelido: () => (MODO === 'servidor' ? R.apelido() : null),
  entrar: (apelido) => R.entrar(apelido),
  sair: () => R.sair(),
  aoPerderSessao: (f) => R.aoPerderSessao(f),
}
/** Avisos da rede (queda e volta) para a tela mostrar. */
export const aoAviso = (f) => R.aoAviso(f)
/** Coleção guardada no servidor (colecao.js usa no modo servidor). */
export const servidor = { carregar: R.carregar, costurar: R.costurar, abrirCasulo: R.abrirCasulo, aposentar: R.aposentar, faseLiberada: R.faseLiberada, lutaAberta: R.lutaAberta }

// ---------------------------------------------------------------- energia da Aventura
/** { atual, maximo, recarregaEm }. Local: conta no aparelho (abrirLuta gasta). Servidor: o último número que o servidor mandou. */
export function energia(opc) { return MODO === 'servidor' ? R.energia() : L.energia(opc) }

// ---------------------------------------------------------------- luta (o estado diz de onde veio: do servidor ou do motor daqui)
const doServidor = (e) => R.ehDoServidor(e)

/** O que a tela do jogador pode ver (sem a mão do rival). O estado do servidor já é a visão. */
export const visao = (e) => (doServidor(e) ? e : visaoDoTime(e, L.EU))
/** Comandos válidos agora (no servidor: a lista que veio com a visão). */
export const comandos = (e) => (doServidor(e) ? R.validos(e) : comandosValidos(e))
export const fim = (e) => resultado(e)

/**
 * Abre uma luta. opc: { modo: 'livre'|'aventura', fase, ids (da coleção), timeA/timeB (definições; só o modo local usa),
 * semente (só local), robo }. → { ok:true, estado, robo? } ou { ok:false, codigo, motivo, energia? }.
 * Na Aventura gasta energia (local: no aparelho; servidor: o servidor gasta e devolve o número).
 */
export async function abrirLuta(opc) {
  if (MODO === 'servidor') return R.abrirLuta(opc)
  if (opc.modo === 'aventura') {
    const en = L.energia({ abrirLuta: true })
    if (!en.ok) return { ok: false, codigo: 'SEM_ENERGIA', motivo: 'Sua energia acabou por hoje.', energia: en }
  }
  return { ok: true, estado: criarLuta({ semente: opc.semente, timeA: opc.timeA, timeB: opc.timeB }) }
}

/** Manda um comando. → { ok:true, estado, eventos, cmd?, aviso? } ou { ok:false, codigo, motivo }. */
export function enviar(e, cmd) { return doServidor(e) ? R.enviar(e, cmd) : Promise.resolve(aplicar(e, cmd)) }

/** Por que esse comando não vale agora? { codigo, motivo } ou null (pergunta ao motor; no servidor, o motor daqui olha a visão). */
export function recusaDe(e, cmd) {
  if (doServidor(e) && comandos(e).some((c) => c.tipo === cmd.tipo && ['carta', 'a', 'b'].every((k) => cmd[k] === undefined || c[k] === cmd[k]))) return null
  try { const r = aplicar(e, cmd); return r.ok ? null : { codigo: r.codigo, motivo: r.motivo } } catch { return null }
}
/** Motivo do motor para uma carta que não pode ser jogada agora. */
export function motivoDaRecusa(e, cid) { return recusaDe(e, { tipo: 'jogar', time: e.vez, carta: cid, alvo: null })?.motivo ?? null }

/** Comandos de `jogar` possíveis para UMA carta da mão (a cópia igual também vale: troca o id da carta). */
export function jogadasDaCarta(e, cid) {
  const inst = e.cartas[cid]
  if (!inst) return []
  const out = []
  for (const c of comandos(e)) {
    if (c.tipo !== 'jogar') continue
    const outra = e.cartas[c.carta]
    if (c.carta === cid || (outra && outra.carta === inst.carta && outra.dono === inst.dono)) out.push({ ...c, carta: cid })
  }
  return out
}
export const podeFiapo = (e, cid) => comandos(e).some((c) => c.tipo === 'fiapo' && c.carta === cid)
export const trocasPossiveis = (e) => comandos(e).filter((c) => c.tipo === 'trocar')

/** Comandos do robô para o turno atual (no servidor o robô já jogou: são os comandos dele que a tela ainda vai mostrar). */
export const planoDoRobo = (e, nome) => (doServidor(e) ? R.plano(e) : planejarTurno(e, nome))
/** Intenção do rival (Aventura). undefined = não há essa informação (a tela esconde a caixa). */
export const intencaoDoRival = (e, robo) => (doServidor(e) ? R.intencao(e) : L.intencaoDoRival(e, robo))

/** A luta é do servidor (dá para desistir, o relógio vale de verdade e o replay vem de lá)? */
export const lutaDoServidor = (e) => doServidor(e)
/** Desistir (só no servidor; no modo local a tela só sai). → { ok, estado } ou null. */
export const desistir = (e) => (doServidor(e) ? R.desistir(e) : Promise.resolve(null))
/** Replay da luta encerrada vindo do servidor (com a semente); null no modo local (a tela já tem tudo). */
export const replayDaLuta = (e) => (doServidor(e) ? R.replay(e) : Promise.resolve(null))
/** Relógio do turno estourou: no servidor a vez passa sozinha; devolve o passo novo (ou null se nada mudou). Local: null. */
export const conferirRelogio = (e) => (doServidor(e) ? R.atualizar(e) : Promise.resolve(null))
/** Segundos que faltam no turno: servidor = pelo prazo dele; local = o relógio inteiro. */
export const segundosDoTurno = (e) => (doServidor(e) ? R.segundosDoTurno(e) ?? L.TEMPO_DO_TURNO_S : L.TEMPO_DO_TURNO_S)
/** Volta à luta que ficou aberta no servidor. */
export const retomarLuta = () => R.retomarLuta()
