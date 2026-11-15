// Piloto — A CONTA DO PILOTO: o que o jogador tem (monstros), os lugares abertos com a guarda de cada um, as Rations,
// e o que fica guardado no aparelho (placar, títulos, Renome, filhotes, as duas últimas tiras).
// É O ÚNICO LUGAR para trocar a lista de monstros da conta ou a guarda de um lugar.
// Nenhum número de economia novo: Rations e gasto por luta saem de shared/config.js (ECONOMIA_DO_BETA).
// Renome e títulos são só enfeite (decisão do dono 15/11 10:44): nunca dão força. Os limites dos títulos são do piloto.
import { BONECOS_PRONTOS, ECONOMIA_DO_BETA, PARTES } from '../../shared/config.js'
import { MONSTROS } from './tema.js'

// ------------------------------------------------------------------ TROQUE AQUI
/** Os 6 monstros que a conta do piloto tem (ids de BONECOS_PRONTOS). Conjunto indicado pela medição do motor (15/11). */
export const CONTA_PILOTO = ['brigao', 'mordedor', 'desfiado', 'embolado', 'assombrado', 'mudo']
/** O trio que já vem montado na folha (Front, Middle, Back). */
export const TRIO_INICIAL = ['brigao', 'assombrado', 'mordedor']
/** Os 5 lugares da estrada; `aberto` = dá para mandar patrulha no piloto. Guarda em ordem Front, Middle, Back, com a
 *  tática dela — cópia de shared/lugares.js (guardas fixas do motor); se lá mudar, copie aqui. */
export const LUGARES = [
  { n: 1, aberto: false, guarda: ['embolado', 'mudo', 'mordedor'], tatica: 'rush' },
  { n: 2, aberto: true, guarda: ['assombrado', 'brigao', 'cascudo'], tatica: 'guard' },
  { n: 3, aberto: false, guarda: ['desfiado', 'rasgao', 'embolado'], tatica: 'guard' },
  { n: 4, aberto: true, guarda: ['assombrado', 'cascudo', 'pisoteador'], tatica: 'rush' },
  { n: 5, aberto: false, guarda: ['brigao', 'desfiado', 'pisoteador'], tatica: 'focus' },
]
/** Uma ordem de patrulha no piloto: quantas lutas seguidas, e a sequência de vitórias que a barra mostra. */
export const PATRULHA = { lutas: 5, sequencia: 3 }
/** Feitos que dão título (só enfeite). */
export const FEITOS = { veteranoLutas: PATRULHA.lutas, forteGolpes: 10 }
/** Renome ganho por patrulha: 1 por luta feita + 1 por vitória (só cresce; só enfeite). */
export const renomeDaPatrulha = (lutas, vitorias) => lutas + vitorias
// ------------------------------------------------------------------ fim do "troque aqui"

export const RACOES_MAX = ECONOMIA_DO_BETA.energiaPorDia
export const RACAO_POR_LUTA = ECONOMIA_DO_BETA.energiaPorLutaDaAventura
export const SLOTS = ['tronco', 'cabeca', 'bracos', 'pernas', 'bordado']
export const lugarPorN = (n) => LUGARES.find((l) => l.n === Number(n))
export const defDoPronto = (id) => ({ pronto: id, nome: MONSTROS[id].nome, partes: BONECOS_PRONTOS[id].partes })
const genesDoPronto = (id) => Object.fromEntries(SLOTS.map((s) => [s, { face: BONECOS_PRONTOS[id].partes[s], forro: BONECOS_PRONTOS[id].partes[s] }]))

const CHAVE = 'piloto_conta_v1'
const vazio = () => ({ v: 1, racoes: RACOES_MAX, renome: 0, voltas: {}, filhotes: [], hist: {}, trios: {}, tiras: [], trio: TRIO_INICIAL.slice(), lugar: LUGARES.find((l) => l.aberto).n, nFilhote: 0 })
const copia = (x) => JSON.parse(JSON.stringify(x))

/** A conta, guardada no aparelho. `armazem` = localStorage (ou qualquer objeto com getItem/setItem/removeItem). */
export function criarConta(armazem) {
  let d = vazio()
  try {
    const cru = JSON.parse(armazem?.getItem(CHAVE) ?? 'null')
    if (cru && cru.v === 1) d = { ...vazio(), ...cru }
  } catch { /* guardado estragado: começa do zero */ }
  const salvar = () => { try { armazem?.setItem(CHAVE, JSON.stringify(d)) } catch { /* sem armazenamento: segue na memória */ } }
  const prontos = () => CONTA_PILOTO.map((id) => ({ uid: id, pronto: id, nome: MONSTROS[id].nome, genes: genesDoPronto(id), voltasUsadas: d.voltas[id] ?? 0, pais: [], geracao: 0 }))
  const lista = () => [...prontos(), ...d.filhotes.map((f) => ({ ...copia(f), pronto: null, voltasUsadas: d.voltas[f.uid] ?? 0 }))]
  const hist = (uid) => (d.hist[uid] ??= { lutas: 0, v: 0, d: 0, forte: 0, lugares: {}, titulos: [] })
  const chaveTrio = (n, uids) => n + '|' + uids.slice().sort().join('+')
  // conserta um trio guardado que aponte para monstro que não existe mais
  const consertar = () => {
    const todos = lista().map((m) => m.uid)
    d.trio = d.trio.filter((u, i, a) => todos.includes(u) && a.indexOf(u) === i).slice(0, 3)
    for (const u of todos) if (d.trio.length < 3 && !d.trio.includes(u)) d.trio.push(u)
    if (!lugarPorN(d.lugar)?.aberto) d.lugar = LUGARES.find((l) => l.aberto).n
  }
  consertar()

  const conta = {
    // ---- coleção (mesma forma que a cena do ovo usa)
    todos: lista,
    porUid: (u) => lista().find((m) => m.uid === u),
    def: (m) => ({ pronto: m.pronto ?? null, nome: m.nome, partes: Object.fromEntries(SLOTS.map((s) => [s, m.genes[s].face])) }),
    tipo: (m) => PARTES[String(m.genes.tronco.face).split('@')[0]].tipo,
    paraCostura: (m) => ({ id: m.uid, nome: m.nome, partes: m.genes, voltasUsadas: m.voltasUsadas, pais: m.pais, geracao: m.geracao, estado: 'ativo' }),
    usarClutch(u) { d.voltas[u] = (d.voltas[u] ?? 0) + 1; salvar() },
    adicionar({ nome, genes, pais, geracao }) { const f = { uid: 'h' + ++d.nFilhote, nome, genes, pais, geracao }; d.filhotes.push(f); salvar(); return conta.porUid(f.uid) },
    renomear(uid, nome) { const f = d.filhotes.find((x) => x.uid === uid); if (f && nome) { f.nome = String(nome).slice(0, 20); salvar() } },
    // ---- ordens
    get trio() { return d.trio.slice() }, set trio(t) { d.trio = t.slice(0, 3); salvar() },
    get lugar() { return d.lugar }, set lugar(n) { if (lugarPorN(n)?.aberto) { d.lugar = Number(n); salvar() } },
    // ---- Rations
    get racoes() { return d.racoes },
    gastarRacao() { if (d.racoes < RACAO_POR_LUTA) return false; d.racoes -= RACAO_POR_LUTA; salvar(); return true },
    // ---- placar e história
    get renome() { return d.renome },
    placarDoTrio: (n, uids) => ({ ...(d.trios[chaveTrio(n, uids)] ?? { v: 0, d: 0 }) }),
    historia: (uid) => copia(d.hist[uid] ?? { lutas: 0, v: 0, d: 0, forte: 0, lugares: {}, titulos: [] }),
    /** Anota UMA luta feita (placar do trio no lugar e de cada monstro). Devolve os títulos novos: [{ uid, id, n, q }]. */
    anotarLuta({ n, uids, resumo }) {
      const p = (d.trios[chaveTrio(n, uids)] ??= { v: 0, d: 0 })
      if (resumo.venceu) p.v++; else p.d++
      const novos = []
      uids.forEach((uid, i) => {
        const h = hist(uid), m = resumo.porMonstro['A' + i]
        h.lutas++; if (resumo.venceu) h.v++; else h.d++
        h.forte += m.forte
        const l = (h.lugares[n] ??= { v: 0, d: 0 })
        if (resumo.venceu) l.v++; else l.d++
        const ganha = (id, alvo, q) => { const k = id + (alvo ? ':' + alvo : ''); if (!h.titulos.some((t) => t.k === k)) { h.titulos.push({ k, id, n: alvo ?? null, q }); novos.push({ uid, id, n: alvo ?? null, q }) } }
        if (l.v + l.d >= FEITOS.veteranoLutas) ganha('veterano', n, FEITOS.veteranoLutas)
        if (resumo.venceu && m.ultimoFio) ganha('clutch', null, 1)
        if (h.forte >= FEITOS.forteGolpes) ganha('forte', null, FEITOS.forteGolpes)
      })
      salvar()
      return novos
    },
    /** Fecha a patrulha: Renome sobe (só cresce), título de patrulha limpa, e a tira nova empurra a anterior. */
    fecharPatrulha({ tira, uids }) {
      const antes = d.renome
      d.renome += renomeDaPatrulha(tira.v + tira.d, tira.v)
      const novos = []
      if (tira.d === 0 && tira.v >= PATRULHA.lutas) for (const uid of uids) { const h = hist(uid); if (!h.titulos.some((t) => t.k === 'limpa')) { h.titulos.push({ k: 'limpa', id: 'limpa', n: null, q: tira.v }); novos.push({ uid, id: 'limpa', n: null, q: tira.v }) } }
      d.tiras = [tira, ...d.tiras].slice(0, 2)
      salvar()
      return { antes, depois: d.renome, novos }
    },
    get tiras() { return copia(d.tiras) },
    zerar() { try { armazem?.removeItem(CHAVE) } catch { /* nada */ } d = vazio(); consertar() },
  }
  return conta
}
