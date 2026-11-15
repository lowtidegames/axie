// Frayz — COLEÇÃO do jogador (sem dinheiro): bonecos com genes, progresso da Aventura, Mural e Retalhos Honrados.
// Dois modos (a ponte escolhe): LOCAL = estado em memória + localStorage (sempre com try/catch); SERVIDOR = cópia do último
// estado que o servidor mandou (via ponte.js), recarregada depois de cada ação. Leitura é síncrona; ação é promessa.
// Regra nenhuma aqui: toda mudança de boneco passa pelo motor/costura (local) ou pelo servidor; este módulo só guarda o resultado.
import * as P from './ponte.js'

const CHAVE = 'frayz_colecao_v1'
const CHAVE_TIME_SERVIDOR = 'frayz_time_aventura_servidor'
const SEMENTE_INICIAL = 'frayz-inicial'
export const FASES_TOTAL = 5

let E = null // { bonecos: {id: boneco}, ordem: [id], timeAventura: [id], aventura: {liberada, vencidas}, mural: [], retalhos }
let fonteDeSemente = () => P.novaSemente()
/** Só para o teste: semente previsível para a costura. */
export const definirFonteDeSemente = (f) => { fonteDeSemente = f }
export const novaSemente = () => fonteDeSemente()
const noServidor = () => P.modo() === 'servidor'

function estadoInicial() {
  const bonecos = {}, ordem = []
  for (const id of P.idsProntos()) { bonecos[id] = P.bonecoDoPronto(id, SEMENTE_INICIAL); ordem.push(id) }
  return { bonecos, ordem, timeAventura: [], aventura: { liberada: 1, vencidas: [] }, mural: [], retalhos: 0 }
}
const vazio = () => ({ bonecos: {}, ordem: [], timeAventura: [], aventura: { liberada: 1, vencidas: [] }, mural: [], retalhos: 0 })

function valido(o) {
  try {
    if (!o || typeof o !== 'object' || !o.bonecos || !Array.isArray(o.ordem) || !o.aventura) return false
    for (const id of o.ordem) if (!o.bonecos[id] || !P.validarBoneco(o.bonecos[id]).ok) return false
    return Array.isArray(o.mural) && Number.isSafeInteger(o.retalhos)
  } catch { return false }
}

let textoLido = null // o texto da coleção que esta aba leu ou gravou por último (outra aba gravou = mudou)
let nova = false // a coleção nasceu agora (nada guardado no aparelho): primeira abertura
function carregarLocal() {
  let lido = null, t = null
  try { t = localStorage.getItem(CHAVE); if (t) lido = JSON.parse(t) } catch { /* sem armazenamento ou texto ruim */ }
  nova = !t
  E = valido(lido) ? lido : estadoInicial()
  E.timeAventura = (E.timeAventura ?? []).filter((id) => E.bonecos[id])
  textoLido = t
  return E
}
/** A coleção acabou de nascer neste aparelho (nada guardado antes)? Modo local. */
export const colecaoNova = () => !noServidor() && nova

// ---------------------------------------------------------------- duas abas (modo local; tarefa 21)
// A outra aba gravou a coleção: esta recarrega antes de qualquer coisa (o evento "storage" chega na hora) e, se mesmo
// assim for salvar por cima de uma mudança que não viu, NÃO salva: recarrega e avisa. A aba velha nunca apaga a nova.
let aoMudarFora = () => {}
export const aoMudarEmOutraAba = (f) => { aoMudarFora = f }
const MUDOU_FORA = { ok: false, codigo: 'MUDOU_EM_OUTRA_ABA', motivo: 'O jogo mudou em outra aba: a tela foi atualizada. Confira e tente de novo.' }
/** Antes de uma ação (modo local): outra aba gravou algo que esta não viu? Recarrega e diz que sim. */
function mudouFora() {
  if (noServidor()) return false
  let agora = null
  try { agora = localStorage.getItem(CHAVE) } catch { return false }
  if (textoLido === null || agora === null || agora === textoLido) return false
  recarregarDeFora(); return true
}
function recarregarDeFora() { carregarLocal(); try { aoMudarFora() } catch { /* tela */ } }
if (typeof window !== 'undefined') window.addEventListener('storage', (ev) => { if (ev.key === CHAVE && !noServidor() && E) recarregarDeFora() })

/** Coleção do servidor → o mesmo formato do modo local. Mural = os aposentados; os Retalhos somados não vêm do servidor (null). */
function doServidor(c) {
  const bonecos = Object.fromEntries(c.bonecos.map((b) => [b.id, b]))
  let time = []
  try { time = JSON.parse(localStorage.getItem(CHAVE_TIME_SERVIDOR) || '[]') } catch { /* ok */ }
  const liberada = Math.max(1, Math.min(FASES_TOTAL, c.faseLiberada))
  const mural = c.bonecos.filter((b) => b.estado === 'aposentado').reverse().map((b) => ({
    id: b.id, nome: P.fichaDoBoneco(b).nome, geracao: b.geracao ?? 0, voltasUsadas: b.voltasUsadas ?? 0, lutas: b.lutas ?? 0, vitorias: b.vitorias ?? 0, maiorGolpe: b.maiorGolpe ?? 0, retalhos: null,
  }))
  return {
    bonecos, ordem: c.bonecos.map((b) => b.id), timeAventura: (Array.isArray(time) ? time : []).filter((id) => bonecos[id]),
    aventura: { liberada, vencidas: Array.from({ length: liberada - 1 }, (_, i) => i + 1) }, mural, retalhos: null,
  }
}

/** Carrega a coleção (local: do aparelho; servidor: estado + todas as páginas). Promessa nos dois modos. */
export async function carregar() {
  if (!noServidor()) return carregarLocal()
  E = doServidor(await P.servidor.carregar())
  return E
}
function salvar() {
  try {
    if (noServidor()) { localStorage.setItem(CHAVE_TIME_SERVIDOR, JSON.stringify(E.timeAventura)); return true }
    const agora = localStorage.getItem(CHAVE)
    if (textoLido !== null && agora !== null && agora !== textoLido) { recarregarDeFora(); return false } // outra aba mudou: não grava por cima
    const t = JSON.stringify(E); localStorage.setItem(CHAVE, t); textoLido = t
  } catch { /* ok */ }
  return true
}
/** Só para o teste e para "recomeçar" (modo local): volta ao início (9 bonecos prontos). */
export function recomecar() { E = estadoInicial(); textoLido = null; salvar(); return E }
/** Esquece a coleção da memória (sair da conta). */
export function esquecer() { E = null }

const e = () => E ?? (noServidor() ? vazio() : carregarLocal())

export const todos = () => e().ordem.map((id) => e().bonecos[id])
export const ativos = () => todos().filter((b) => b.estado !== 'aposentado')
export const obter = (id) => e().bonecos[id] ?? null
export const casuloFechado = (b) => !!b?.casulo && b.casulo.aberto === false
export const timeAventura = () => e().timeAventura.slice()
export function definirTimeAventura(ids) { e().timeAventura = ids.slice(0, 3); salvar() }
export const mural = () => e().mural.slice()
/** Retalhos Honrados somados (null quando o servidor não manda a soma). */
export const retalhos = () => e().retalhos
export const aventura = () => ({ liberada: e().aventura.liberada, vencidas: e().aventura.vencidas.slice() })
/** As ferramentas de protótipo (gastar o boneco sem lutar) só existem no modo local. */
export const temFerramentasDePrototipo = () => !noServidor()

/** Pode lutar? Pergunta ao motor (aposentado, limite de remendos...). { ok:true, def } ou { ok:false, motivo }. */
export function podeLutar(b) {
  if (casuloFechado(b)) return { ok: false, motivo: 'O casulo ainda está fechado.' }
  if (b.estado === 'aposentado') return { ok: false, motivo: `${P.fichaDoBoneco(b).nome} está aposentado.` }
  if (b.ocupado) return { ok: false, motivo: `${P.fichaDoBoneco(b).nome} está numa luta aberta.` }
  const r = P.defParaLuta(b)
  return r.erro ? { ok: false, motivo: r.erro } : { ok: true, def: r.def }
}
/** Definições para a luta, na ordem dos ids (ou lança se algum não pode). */
export function defsDoTime(ids) { return ids.map((id) => { const r = podeLutar(obter(id)); if (!r.ok) throw new Error(r.motivo); return r.def }) }

function guardar(b) { e().bonecos[b.id] = b; if (!e().ordem.includes(b.id)) e().ordem.push(b.id) }

/** Depois de uma luta da Aventura (modo local): Pontos de Costura nos bonecos usados (o motor soma; a tela só guarda). */
export function registrarLutas(ids, { venceu, maiorGolpes = [] }) {
  mudouFora() // outra aba gravou: soma em cima do que ela gravou
  for (const [i, id] of ids.entries()) {
    try { guardar(P.registrarLuta(obter(id), { venceu, maiorGolpe: maiorGolpes[i] ?? 0 })) } catch { /* já no limite: nada a somar */ }
  }
  salvar()
}
/** Venceu a fase n (modo local): libera a próxima. */
export function venceuFase(n) {
  const a = e().aventura
  if (!a.vencidas.includes(n)) a.vencidas.push(n)
  a.liberada = Math.max(a.liberada, Math.min(FASES_TOTAL, n + 1))
  salvar()
}
/**
 * A luta acabou. Local: a Aventura soma os Pontos de Costura e libera a fase (o motor decide). Servidor: ele já gravou tudo;
 * aqui só se busca de novo o estado (fase liberada, energia, bonecos gastos).
 */
export async function depoisDaLuta({ modo, ids, venceu, fase, maiorGolpes }) {
  if (noServidor()) { try { await carregar() } catch { /* fica a cópia anterior; a próxima ação recarrega */ } return }
  if (modo !== 'aventura') return
  registrarLutas(ids, { venceu, maiorGolpes })
  if (venceu) venceuFase(fase)
}

/** Costura A + B (ids). Os pais ganham +1 volta e o filho entra na coleção com o casulo FECHADO (a tela abre parte por parte). */
export async function costurar(idA, idB) {
  const A = obter(idA), B = obter(idB)
  if (!A || !B) return { ok: false, motivo: 'Escolha dois bonecos.' }
  if (noServidor()) {
    const r = await P.servidor.costurar(idA, idB)
    if (!r.ok) return r
    guardar(r.pais[0]); guardar(r.pais[1]); guardar(r.filho)
    return r
  }
  if (mudouFora()) return MUDOU_FORA
  const r = P.costurar({ semente: fonteDeSemente(), paiA: A, paiB: B })
  if (!r.ok) return r
  guardar(r.pais[0]); guardar(r.pais[1]); guardar(r.filho)
  if (!salvar()) return MUDOU_FORA
  return r
}
/** A tela terminou de abrir o casulo. Devolve o boneco (aberto; no servidor, se falhar, continua fechado e vem { erro }). */
export async function terminarCasulo(id) {
  if (noServidor()) {
    const r = await P.servidor.abrirCasulo(id)
    if (!r.ok) return { ...obter(id), erro: r.motivo }
    guardar(r.boneco); return obter(id)
  }
  guardar(P.abrirCasulo(obter(id))); salvar(); return obter(id)
}
export const casulosFechados = () => todos().filter(casuloFechado)

/** Aposentadoria: o motor (ou o servidor) decide e devolve Retalhos Honrados + registro do Mural. */
export async function aposentar(id) {
  if (mudouFora()) return MUDOU_FORA
  if (!noServidor() && obter(id)?.estado === 'aposentado') return { ok: false, codigo: 'APOSENTADO', motivo: 'Ele já está no Mural.' }
  const r = noServidor() ? await P.servidor.aposentar(id) : P.aposentar(obter(id))
  if (!r.ok) return r
  guardar(r.boneco)
  e().mural.unshift({ ...r.mural, retalhos: r.retalhos })
  if (Number.isSafeInteger(e().retalhos)) e().retalhos += r.retalhos
  e().timeAventura = e().timeAventura.filter((x) => x !== id)
  if (!salvar()) return MUDOU_FORA
  return r
}

/** PROTÓTIPO (só modo local): gasta o boneco com lutas de treino (chama registrarLuta do motor n vezes) para ver os remendos e a aposentadoria. */
export function envelhecerDemo(id, lutas) {
  let b = obter(id)
  for (let i = 0; i < lutas; i++) { try { b = P.registrarLuta(b, { venceu: i % 2 === 0, maiorGolpe: 60 + (i % 90) }) } catch { break } }
  guardar(b); salvar(); return b
}
