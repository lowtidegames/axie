// Keepmile — as 30 conquistas (R39): a regra num lugar só, a MESMA no servidor (server/reino/reino.mjs) e na tela do
// modo local. ES module puro (roda no navegador): nada de node:. Só título, sem prêmio. Números em config.js (CONQUISTAS).
//
// API:
//   GRUPOS                      → ['chefes', 'lutas', 'reino', 'marcos'] (ordem da tela)
//   LISTA                       → [{ id, nome, grupo, meta?, medida? }] (30, em ordem); `meta` = número da barra dos degraus
//                                 ("123 / 200"), medido em `perfil.album.rodadasVencidas` (medida: 'rodadasVencidas')
//   conquistasDoPasso({ antes, depois, eventos, comandos, rodadasAntes, cartasNoAlbum, tem }) → [ids novos, sem repetir]
//     antes/depois = estado do motor antes e depois do comando; eventos = os do comando (com os da batalha);
//     comandos = todos os comandos da partida até este (inclusive); rodadasAntes = rodadas vencidas somadas da conta antes
//     deste comando; cartasNoAlbum (opcional) = cartas de ALBUM.ordem liberadas depois do passo (sem ele, calculado por
//     rodadasAntes + vitórias do passo); tem = Set ou lista das que a conta já tem. Não muda nada do que recebe.
//   contarSoldados(eventosDaBatalha) → { quedas, vivos } · vitoriasDoPasso(eventos) → n
//   limiarDoAlbum(i), cartasPorRodadas(rodadas) → álbum por rodadas vencidas somadas (bíblia, seção 9)
import { ALBUM, CARTAS, CONQUISTAS as N, PARTIDA, RARIDADES } from './config.js'
import { familiasAtivas } from './batalha.js'

export const GRUPOS = ['chefes', 'lutas', 'reino', 'marcos']

/** Chefe → conquista de vencê-lo (as 4 antigas). */
export const CHEFE_CONQUISTA = { gutbucket: 'road', niptuck: 'double', moleworth: 'mole', gobble: 'pudding' }
const CHEFE_SEM_CONSERTO = 'niptuck' // No Patches: o chefe da rodada 10
const CHEFE_SEM_ARRANHAO = 'moleworth' // Not a Scratch: o chefe da rodada 15
const FAMILIA_CONQUISTA = { pikewall: 'shields', thornbow: 'bows', potluck: 'dish', fizzwick: 'sparks' }
const LENDARIA = RARIDADES[RARIDADES.length - 1].id

/** Rodadas vencidas somadas que liberam a carta de índice i de ALBUM.ordem (docs/reino/biblia.md, seção 9). */
export function limiarDoAlbum(i) {
  return i <= ALBUM.quantasNoMeio
    ? ALBUM.primeira + ALBUM.depoisCada * i
    : ALBUM.primeira + ALBUM.depoisCada * ALBUM.quantasNoMeio + ALBUM.fimCada * (i - ALBUM.quantasNoMeio)
}
export function cartasPorRodadas(rodadas) {
  let n = 0
  while (n < ALBUM.ordem.length && limiarDoAlbum(n) <= rodadas) n++
  return n
}

const degrau = (id, nome) => ({ id, nome, grupo: 'marcos', meta: N.rodadasSomadas[id], medida: 'rodadasVencidas' })
export const LISTA = [
  // chefes
  { id: 'road', nome: 'Not on My Road', grupo: 'chefes' },
  { id: 'double', nome: 'Double Trouble', grupo: 'chefes' },
  { id: 'mole', nome: 'Mole Patrol', grupo: 'chefes' },
  { id: 'pudding', nome: 'Long Live the Pudding', grupo: 'chefes' },
  { id: 'nopatch', nome: 'No Patches', grupo: 'chefes' },
  { id: 'scratch', nome: 'Not a Scratch', grupo: 'chefes' },
  // lutas
  { id: 'supper', nome: 'First Supper', grupo: 'lutas' },
  { id: 'plate', nome: 'Clean Plate', grupo: 'lutas' },
  { id: 'last', nome: 'Last One Standing', grupo: 'lutas' },
  { id: 'penny', nome: 'Penny Pincher', grupo: 'lutas' },
  { id: 'thread', nome: 'By a Thread', grupo: 'lutas' },
  { id: 'seconds', nome: 'Back on Your Feet', grupo: 'lutas' },
  { id: 'encore', nome: 'Encore!', grupo: 'lutas' },
  // reino
  { id: 'house', nome: 'Full House', grupo: 'reino' },
  { id: 'family', nome: 'One Big Family', grupo: 'reino' },
  { id: 'brass', nome: 'Top Brass', grupo: 'reino' },
  { id: 'shields', nome: 'Shields Up', grupo: 'reino' },
  { id: 'bows', nome: 'Nobody Gets Close', grupo: 'reino' },
  { id: 'dish', nome: 'Bring a Dish', grupo: 'reino' },
  { id: 'sparks', nome: 'Mind the Sparks', grupo: 'reino' },
  { id: 'mason', nome: 'Built to Last', grupo: 'reino' },
  { id: 'spicy', nome: 'Extra Spicy', grupo: 'reino' },
  { id: 'pockets', nome: 'Pocketful', grupo: 'reino' },
  { id: 'grand', nome: 'Grand Entrance', grupo: 'reino' },
  // marcos
  degrau('tally25', 'Tally Stick'),
  degrau('tally50', 'Notched Spoon'),
  degrau('tally100', 'Hundred Hold'),
  degrau('tally200', 'Old Gatepost'),
  degrau('tally400', 'Every Stone of the Mile'),
  { id: 'librarian', nome: 'Head Librarian', grupo: 'marcos', meta: limiarDoAlbum(ALBUM.ordem.length - 1), medida: 'rodadasVencidas' },
]
export const IDS = LISTA.map((c) => c.id)

/** Eventos da batalha (arrays compactos) → { quedas, vivos } dos soldados. */
export function contarSoldados(eventos) {
  const soldados = new Set(), vivos = new Set()
  let quedas = 0
  for (const x of eventos ?? []) {
    if (x[1] === 'n' && x[3] === 0) { soldados.add(x[2]); vivos.add(x[2]) } else if (x[1] === 'c' && vivos.has(x[2])) { vivos.delete(x[2]); quedas++ } else if (x[1] === 'r' && soldados.has(x[2])) vivos.add(x[2])
  }
  return { quedas, vivos: vivos.size }
}

export const vitoriasDoPasso = (eventos) => (eventos ?? []).filter((ev) => ev.tipo === 'batalha' && ev.vitoria).length

/** As conquistas que este passo dá e a conta ainda não tem (na ordem em que saem). Ver o topo do arquivo. */
export function conquistasDoPasso({ antes, depois, eventos = [], comandos = [], rodadasAntes = 0, cartasNoAlbum = null, tem = [] }) {
  const ja = new Set(tem)
  const ganhou = []
  const marcar = (id) => { if (!ja.has(id)) { ja.add(id); ganhou.push(id) } }
  let vitorias = 0
  for (const ev of eventos) {
    if (ev.tipo !== 'batalha' || !ev.vitoria) continue
    vitorias++
    const chefe = ev.horda?.chefe ?? null
    marcar('supper')
    if (chefe && CHEFE_CONQUISTA[chefe]) marcar(CHEFE_CONQUISTA[chefe])
    const { quedas, vivos } = contarSoldados(ev.eventos)
    if (quedas === 0) marcar('plate')
    if (vivos === 1) marcar('last')
    if (antes.rodada === 10 && !comandos.some((x) => x.tipo === 'sortear')) marcar('penny')
    // R39 — a luta vencida, pelo estado de ANTES do comando (o que valia na hora da luta)
    if (antes.vidas === N.coracoes) marcar('thread')
    if (antes.ultima && antes.ultima.vitoria === false) marcar('seconds')
    if (antes.rodada >= N.rodadaDoBis) marcar('encore')
    if (chefe === CHEFE_SEM_CONSERTO && antes.consertos === 0) marcar('nopatch')
    if (chefe === CHEFE_SEM_ARRANHAO && antes.vidas >= antes.vidasMax) marcar('scratch')
  }
  const t = depois.terrenos
  if (t.every(Boolean)) {
    marcar('house')
    if (new Set(t.map((x) => CARTAS[x.carta].familia)).size === 1) marcar('family')
  }
  if (t.some((x) => x && x.nivel >= PARTIDA.nivelMax)) marcar('brass')
  // R39 — o reino depois do passo
  for (const f of familiasAtivas(t, depois.reliquias)) if (FAMILIA_CONQUISTA[f]) marcar(FAMILIA_CONQUISTA[f])
  if (t.some((x) => x && x.nivel >= PARTIDA.nivelMax && CARTAS[x.carta].tipo === 'construcao')) marcar('mason')
  if (t.some((x) => x && x.nivel >= PARTIDA.nivelMax && CARTAS[x.carta].tipo === 'magia')) marcar('spicy')
  if (depois.reliquias.length >= N.reliquias) marcar('pockets')
  if (t.some((x) => x && CARTAS[x.carta].raridade === LENDARIA)) marcar('grand')
  if (vitorias) {
    const somadas = rodadasAntes + vitorias
    for (const [id, meta] of Object.entries(N.rodadasSomadas)) if (somadas >= meta) marcar(id)
    const cartas = Number.isSafeInteger(cartasNoAlbum) ? cartasNoAlbum : cartasPorRodadas(somadas)
    if (cartas >= ALBUM.ordem.length) marcar('librarian')
  }
  return ganhou
}
