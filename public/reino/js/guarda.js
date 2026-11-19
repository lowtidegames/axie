// Keepmile — o que fica guardado no aparelho: recorde, melhores partidas, rodadas vencidas somadas (álbum), conquistas e preferências.
const CHAVE = 'keepmile_v1'
const PADRAO = { recorde: 0, melhores: [], rodadas: 0, conquistas: [], vel: 1, menos: null, partidas: 0 }
let D = { ...PADRAO }
try { const p = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (p && typeof p === 'object') D = { ...PADRAO, ...p } } catch { /* sem armazenamento: vale só nesta visita */ }
if (!Array.isArray(D.melhores)) D.melhores = []
if (!Array.isArray(D.conquistas)) D.conquistas = []
const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(D)) } catch { /* ok */ } }

export const Guarda = {
  get: (k) => D[k],
  set(k, v) { D[k] = v; gravar() },
  /** Cartas liberadas pelas rodadas vencidas somadas (docs/reino/biblia.md, seção 9; números do config). */
  liberadas(ALBUM, rodadas = D.rodadas) { return [...ALBUM.inicial, ...ALBUM.ordem.slice(0, Guarda.quantas(ALBUM, rodadas))] },
  /** Rodadas somadas que liberam a carta de índice i da ordem. */
  limiar(ALBUM, i) { return i <= ALBUM.quantasNoMeio ? ALBUM.primeira + ALBUM.depoisCada * i : ALBUM.primeira + ALBUM.depoisCada * ALBUM.quantasNoMeio + ALBUM.fimCada * (i - ALBUM.quantasNoMeio) },
  quantas(ALBUM, rodadas = D.rodadas) { let n = 0; while (n < ALBUM.ordem.length && Guarda.limiar(ALBUM, n) <= rodadas) n++; return n },
  /** Soma 1 rodada vencida; devolve a carta que acabou de liberar (ou null). */
  rodadaVencida(ALBUM) { const antes = Guarda.quantas(ALBUM); D.rodadas++; gravar(); const depois = Guarda.quantas(ALBUM); return depois > antes ? ALBUM.ordem[depois - 1] : null },
  /** Guarda a partida; devolve { novoRecorde, recorde }. Recorde = mais pontos. */
  partida({ pontos, vencidas, rodada, semente }) {
    const novo = pontos > D.recorde
    if (novo) D.recorde = pontos
    D.partidas++
    D.melhores.push({ pontos, vencidas, rodada, semente: String(semente).slice(0, 40), dia: new Date().toISOString().slice(0, 10) })
    D.melhores.sort((a, b) => b.pontos - a.pontos); D.melhores = D.melhores.slice(0, 5)
    gravar()
    return { novoRecorde: novo, recorde: D.recorde }
  },
  /** Marca a conquista; devolve true só na primeira vez. */
  conquista(id) { if (D.conquistas.includes(id)) return false; D.conquistas.push(id); gravar(); return true },
  tudo: () => JSON.parse(JSON.stringify(D)),
}
