// Piloto — A CONTA DO PILOTO, guardada no aparelho: os ovos por abrir, os monstros, o time de 3, a energia do dia, as lutas
// de cada monstro no "dia" do piloto (cansaço), os lugares abertos e os pontos. O dia do piloto só vira no botão "New day".
// É O ÚNICO LUGAR para trocar os ovos do começo, as espécies do ovo e a coleção inicial.
// Nenhum número de economia novo: energia e gasto por luta saem de shared/config.js (ECONOMIA_DO_BETA); chance de raridade,
// vida do monstro (lutas) e clutches saem de shared/costura.js (PARAMS_COSTURA); cansaço e pontos, de regras-piloto.js.
import { BONECOS_PRONTOS, ECONOMIA_DO_BETA, PARTES } from '../../shared/config.js'
import { PARAMS_COSTURA, PARTES_DO_BONECO, gerarBonecoInicial } from '../../shared/costura.js'
import { LUGARES as LUGARES_DO_MOTOR } from '../../shared/lugares.js'
import { criarRng } from '../../shared/rng.js'
import { pontosDaVitoria } from './regras-piloto.js'
import { MONSTROS } from './tema.js'

// ------------------------------------------------------------------ TROQUE AQUI
/** Quantos ovos o jogador abre na primeira vez. */
export const OVOS_INICIAIS = 3
/** As espécies que saem do ovo do piloto (ids de BONECOS_PRONTOS): as que já têm desenho em PNG no manifesto da arte. */
export const ESPECIES_DO_OVO = ['mordedor', 'cascudo', 'rasgao', 'assombrado', 'desfiado']
/** A coleção inicial que o jogador ganha depois dos ovos (ids de BONECOS_PRONTOS; as que têm PNG primeiro). */
export const COLECAO_INICIAL = ['mordedor', 'desfiado', 'assombrado', 'rasgao', 'cascudo', 'brigao']
// ------------------------------------------------------------------ fim do "troque aqui"

export const ENERGIA_MAX = ECONOMIA_DO_BETA.energiaPorDia
export const ENERGIA_POR_LUTA = ECONOMIA_DO_BETA.energiaPorLutaDaAventura
export const LUTAS_DA_VIDA = PARAMS_COSTURA.desgaste.limite
export const CHANCES_DO_OVO = PARAMS_COSTURA.chancesDeRaridade
/** Os 5 lugares em fila, com a guarda fixa do motor (shared/lugares.js). */
export const LUGARES = LUGARES_DO_MOTOR.map((l, i) => ({ n: i + 1, guarda: l.guarda.slice(), ordens: l.ordens }))
export const lugarPorN = (n) => LUGARES.find((l) => l.n === Number(n))
export const defDoPronto = (id) => ({ pronto: id, nome: MONSTROS[id].nome, partes: BONECOS_PRONTOS[id].partes })

const idDe = (g) => String(g).split('@')[0]
const rarDe = (g) => String(g).split('@')[1] ?? 'comum'
const genesDoPronto = (id) => Object.fromEntries(PARTES_DO_BONECO.map((s) => [s, { face: BONECOS_PRONTOS[id].partes[s], forro: BONECOS_PRONTOS[id].partes[s] }]))

const CHAVE = 'piloto_conta_v2'
const vazio = () => ({ v: 2, ovos: OVOS_INICIAIS, nOvo: 0, ganhouInicial: false, ovoDeCruza: null, monstros: [], nMon: 0, trio: [null, null, null], energia: ENERGIA_MAX, dia: 1, hoje: {}, abertos: 1, lugar: 1, nLuta: 0, total: { v: 0, d: 0, pontos: 0 }, avisoVisto: false })
const copia = (x) => JSON.parse(JSON.stringify(x))

/** A conta. `armazem` = localStorage (ou qualquer objeto com getItem/setItem/removeItem). */
export function criarConta(armazem) {
  let d = vazio()
  try {
    const cru = JSON.parse(armazem?.getItem(CHAVE) ?? 'null')
    if (cru && cru.v === 2) d = { ...vazio(), ...cru }
  } catch { /* guardado estragado: começa do zero */ }
  const salvar = () => { try { armazem?.setItem(CHAVE, JSON.stringify(d)) } catch { /* sem armazenamento: segue na memória */ } }
  const achar = (uid) => d.monstros.find((m) => m.uid === uid)
  const novo = ({ pronto = null, nome, genes, pais = [], geracao = 0 }) => {
    const m = { uid: 'm' + ++d.nMon, pronto, nome, genes, pais, geracao, lutas: 0, voltas: 0, aposentado: false }
    d.monstros.push(m)
    return m
  }
  const preencherTrio = () => {
    const livres = d.monstros.filter((m) => !m.aposentado && !d.trio.includes(m.uid)).map((m) => m.uid)
    d.trio = d.trio.map((u) => (u && achar(u) && !achar(u).aposentado ? u : livres.shift() ?? null))
  }

  const conta = {
    // ---- ovos
    get ovos() { return d.ovos + (d.ovoDeCruza ? 1 : 0) },
    get ovosDoComeco() { return d.ovos },
    get ovoDeCruza() { return d.ovoDeCruza ? copia(d.ovoDeCruza) : null },
    get comecou() { return d.ganhouInicial },
    /**
     * Abre UM ovo do começo: a espécie e a raridade de cada parte saem do sorteio do motor (gerarBonecoInicial com a
     * semente dada; a raridade pela tabela publicada). Ao abrir o último, a coleção inicial entra e o time fica montado
     * com os 3 que nasceram. Devolve { monstro, ganhou: [monstros da coleção inicial] }.
     */
    abrirOvo(semente) {
      if (d.ovos <= 0) return null
      const rng = criarRng('ovo:' + semente)
      const especie = ESPECIES_DO_OVO[rng.inteiro(ESPECIES_DO_OVO.length)]
      const partesFixas = Object.fromEntries(PARTES_DO_BONECO.map((s) => [s, idDe(BONECOS_PRONTOS[especie].partes[s])]))
      const b = gerarBonecoInicial(rng, { id: 'ovo', partesFixas })
      const monstro = novo({ pronto: especie, nome: MONSTROS[especie].nome, genes: b.partes })
      d.ovos--; d.nOvo++
      let ganhou = []
      if (d.ovos === 0 && !d.ganhouInicial) {
        d.ganhouInicial = true
        ganhou = COLECAO_INICIAL.map((id) => novo({ pronto: id, nome: MONSTROS[id].nome, genes: genesDoPronto(id) }))
        preencherTrio()
      }
      salvar()
      return { monstro: copia(monstro), ganhou: copia(ganhou) }
    },
    get nOvo() { return d.nOvo },
    /** Guarda o ovo do cruzamento (o filhote já decidido pelo motor) até o jogador abrir. */
    guardarOvoDeCruza({ nome, filho, paisUids }) {
      for (const u of paisUids) achar(u).voltas++
      d.ovoDeCruza = { nome, genes: filho.partes, pais: filho.pais, geracao: filho.geracao }
      salvar()
    },
    abrirOvoDeCruza() {
      if (!d.ovoDeCruza) return null
      const monstro = novo(d.ovoDeCruza)
      d.ovoDeCruza = null
      preencherTrio()
      salvar()
      return { monstro: copia(monstro), ganhou: [] }
    },
    // ---- coleção
    todos: () => copia(d.monstros),
    ativos: () => copia(d.monstros.filter((m) => !m.aposentado)),
    porUid: (u) => { const m = achar(u); return m ? copia(m) : null },
    def: (m) => ({ pronto: m.pronto ?? null, nome: m.nome, partes: Object.fromEntries(PARTES_DO_BONECO.map((s) => [s, m.genes[s].face])) }),
    tipo: (m) => PARTES[idDe(m.genes.tronco.face)].tipo,
    /** Raridade do monstro = a do corpo (a parte que define o elemento); é a que a tabela do ovo anuncia. */
    raridade: (m) => rarDe(m.genes.tronco.face),
    paraCostura: (m) => ({ id: m.uid, nome: m.nome, partes: m.genes, voltasUsadas: m.voltas, pontosDeCostura: m.lutas, pais: m.pais, geracao: m.geracao, estado: m.aposentado ? 'aposentado' : 'ativo' }),
    fimDaVida: (m) => m.lutas >= LUTAS_DA_VIDA,
    /** "Retire": só no fim da vida. Sai do time e fica na coleção como aposentado. */
    aposentar(uid) {
      const m = achar(uid)
      if (!m || m.aposentado || m.lutas < LUTAS_DA_VIDA) return false
      m.aposentado = true
      d.trio = d.trio.map((u) => (u === uid ? null : u))
      salvar()
      return true
    },
    // ---- time (Front, Middle, Back) e lugar escolhido
    get trio() { return d.trio.slice() },
    /** Põe `uid` no lugar `pos` do time; se ele já estava em outro lugar, os dois trocam. */
    por(uid, pos) {
      const m = achar(uid)
      if (!m || m.aposentado || pos < 0 || pos > 2) return false
      const de = d.trio.indexOf(uid)
      if (de === pos) return false
      if (de >= 0) d.trio[de] = d.trio[pos]
      d.trio[pos] = uid
      salvar()
      return true
    },
    timePronto: () => d.trio.every((u) => u && achar(u) && !achar(u).aposentado && achar(u).lutas < LUTAS_DA_VIDA),
    get abertos() { return d.abertos },
    get lugar() { return d.lugar }, set lugar(n) { if (Number(n) >= 1 && Number(n) <= d.abertos) { d.lugar = Number(n); salvar() } },
    // ---- energia e o dia do piloto
    get energia() { return d.energia },
    get dia() { return d.dia },
    lutasHoje: (uid) => d.hoje[uid] ?? 0,
    /** "New day": devolve a energia e o descanso (zera as lutas do dia). */
    novoDia() { d.hoje = {}; d.energia = ENERGIA_MAX; d.dia++; salvar() },
    // ---- lutas e pontos
    get total() { return { ...d.total } },
    get nLuta() { return d.nLuta },
    /** Abre uma luta: gasta a energia e devolve o número dela (a semente usa este número). false se não há energia. */
    abrirLuta() {
      if (d.energia < ENERGIA_POR_LUTA) return false
      d.energia -= ENERGIA_POR_LUTA
      d.nLuta++
      salvar()
      return d.nLuta
    },
    /** Anota a luta feita no lugar n: lutas do dia e da vida de cada monstro, pontos, e abre o próximo lugar na vitória. */
    anotarLuta({ n, uids, venceu }) {
      for (const uid of uids) { d.hoje[uid] = (d.hoje[uid] ?? 0) + 1; achar(uid).lutas++ }
      const pontos = venceu ? pontosDaVitoria(n) : 0
      if (venceu) d.total.v++; else d.total.d++
      d.total.pontos += pontos
      let abriu = null
      if (venceu && n === d.abertos && n < LUGARES.length) { d.abertos++; abriu = d.abertos }
      salvar()
      return { pontos, abriu }
    },
    get avisoVisto() { return d.avisoVisto }, set avisoVisto(v) { d.avisoVisto = !!v; salvar() },
    zerar() { try { armazem?.removeItem(CHAVE) } catch { /* nada */ } d = vazio() },
  }
  return conta
}
