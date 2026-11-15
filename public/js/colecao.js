// Frayz — COLEÇÃO do jogador (protótipo local, sem conta e sem dinheiro): bonecos com genes, progresso da Aventura, Mural e Retalhos Honrados.
// Estado em memória + localStorage (sempre com try/catch). Isolado aqui para depois virar servidor: só este arquivo troca.
// Regra nenhuma aqui: toda mudança de boneco passa pelo motor/costura (via ponte.js); este módulo só guarda o resultado.
import * as P from './ponte.js'

const CHAVE = 'frayz_colecao_v1'
const SEMENTE_INICIAL = 'frayz-inicial'
export const FASES_TOTAL = 5

let E = null // { bonecos: {id: boneco}, ordem: [id], timeAventura: [id], aventura: {liberada, vencidas}, mural: [], retalhos }
let fonteDeSemente = () => P.novaSemente()
/** Só para o teste: semente previsível para a costura. */
export const definirFonteDeSemente = (f) => { fonteDeSemente = f }
export const novaSemente = () => fonteDeSemente()

function estadoInicial() {
  const bonecos = {}, ordem = []
  for (const id of P.idsProntos()) { bonecos[id] = P.bonecoDoPronto(id, SEMENTE_INICIAL); ordem.push(id) }
  return { bonecos, ordem, timeAventura: [], aventura: { liberada: 1, vencidas: [] }, mural: [], retalhos: 0 }
}

function valido(o) {
  try {
    if (!o || typeof o !== 'object' || !o.bonecos || !Array.isArray(o.ordem) || !o.aventura) return false
    for (const id of o.ordem) if (!o.bonecos[id] || !P.validarBoneco(o.bonecos[id]).ok) return false
    return Array.isArray(o.mural) && Number.isSafeInteger(o.retalhos)
  } catch { return false }
}

export function carregar() {
  let lido = null
  try { const t = localStorage.getItem(CHAVE); if (t) lido = JSON.parse(t) } catch { /* sem armazenamento ou texto ruim */ }
  E = valido(lido) ? lido : estadoInicial()
  E.timeAventura = (E.timeAventura ?? []).filter((id) => E.bonecos[id])
  return E
}
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(E)) } catch { /* ok */ } }
/** Só para o teste e para "recomeçar": volta ao início (9 bonecos prontos). */
export function recomecar() { E = estadoInicial(); salvar(); return E }

const e = () => E ?? carregar()

export const todos = () => e().ordem.map((id) => e().bonecos[id])
export const ativos = () => todos().filter((b) => b.estado !== 'aposentado')
export const obter = (id) => e().bonecos[id] ?? null
export const casuloFechado = (b) => !!b?.casulo && b.casulo.aberto === false
export const timeAventura = () => e().timeAventura.slice()
export function definirTimeAventura(ids) { e().timeAventura = ids.slice(0, 3); salvar() }
export const mural = () => e().mural.slice()
export const retalhos = () => e().retalhos
export const aventura = () => ({ liberada: e().aventura.liberada, vencidas: e().aventura.vencidas.slice() })

/** Pode lutar? Pergunta ao motor (aposentado, limite de remendos...). { ok:true, def } ou { ok:false, motivo }. */
export function podeLutar(b) {
  if (casuloFechado(b)) return { ok: false, motivo: 'O casulo ainda está fechado.' }
  if (b.estado === 'aposentado') return { ok: false, motivo: `${P.fichaDoBoneco(b).nome} está aposentado.` }
  const r = P.defParaLuta(b)
  return r.erro ? { ok: false, motivo: r.erro } : { ok: true, def: r.def }
}
/** Definições para a luta, na ordem dos ids (ou lança se algum não pode). */
export function defsDoTime(ids) { return ids.map((id) => { const r = podeLutar(obter(id)); if (!r.ok) throw new Error(r.motivo); return r.def }) }

function guardar(b) { e().bonecos[b.id] = b; if (!e().ordem.includes(b.id)) e().ordem.push(b.id) }

/** Depois de uma luta da Aventura: Pontos de Costura nos bonecos usados (o motor soma; a tela só guarda). */
export function registrarLutas(ids, { venceu, maiorGolpes = [] }) {
  for (const [i, id] of ids.entries()) {
    try { guardar(P.registrarLuta(obter(id), { venceu, maiorGolpe: maiorGolpes[i] ?? 0 })) } catch { /* já no limite: nada a somar */ }
  }
  salvar()
}
/** Venceu a fase n: libera a próxima. */
export function venceuFase(n) {
  const a = e().aventura
  if (!a.vencidas.includes(n)) a.vencidas.push(n)
  a.liberada = Math.max(a.liberada, Math.min(FASES_TOTAL, n + 1))
  salvar()
}

/** Costura A + B (ids). Os pais ganham +1 volta e o filho entra na coleção com o casulo FECHADO (a tela abre parte por parte). */
export function costurar(idA, idB) {
  const A = obter(idA), B = obter(idB)
  if (!A || !B) return { ok: false, motivo: 'Escolha dois bonecos.' }
  const r = P.costurar({ semente: fonteDeSemente(), paiA: A, paiB: B })
  if (!r.ok) return r
  guardar(r.pais[0]); guardar(r.pais[1]); guardar(r.filho)
  salvar()
  return r
}
/** A tela terminou de abrir o casulo. */
export function terminarCasulo(id) { guardar(P.abrirCasulo(obter(id))); salvar(); return obter(id) }
export const casulosFechados = () => todos().filter(casuloFechado)

/** Aposentadoria: o motor decide e devolve Retalhos Honrados + registro do Mural. */
export function aposentar(id) {
  const r = P.aposentar(obter(id))
  if (!r.ok) return r
  guardar(r.boneco)
  e().mural.unshift({ ...r.mural, retalhos: r.retalhos })
  e().retalhos += r.retalhos
  e().timeAventura = e().timeAventura.filter((x) => x !== id)
  salvar()
  return r
}

/** PROTÓTIPO: gasta o boneco com lutas de treino (chama registrarLuta do motor n vezes) para ver os remendos e a aposentadoria. */
export function envelhecerDemo(id, lutas) {
  let b = obter(id)
  for (let i = 0; i < lutas; i++) { try { b = P.registrarLuta(b, { venceu: i % 2 === 0, maiorGolpe: 60 + (i % 90) }) } catch { break } }
  guardar(b); salvar(); return b
}
