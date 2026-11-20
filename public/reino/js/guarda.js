// Keepmile — o que fica guardado no aparelho: recorde, melhores partidas, rodadas vencidas somadas (álbum), conquistas, preferências
// e a PARTIDA EM CURSO (semente + cartas liberadas + comandos: o motor refaz tudo com `reproduzir`).
// Duas abas não se apagam: cada gravação MESCLA com o que está no armazenamento naquela hora (maior recorde, união das conquistas e
// das melhores partidas, rodadas somadas pela diferença) e a aba ouve o evento `storage`.
const CHAVE = 'keepmile_v1', CHAVE_PARTIDA = 'keepmile_partida_v1', CHAVE_FIM = 'keepmile_fim_v1', CHAVE_OUTRA = 'keepmile_partida2_v1'
const PADRAO = { recorde: 0, melhores: [], rodadas: 0, conquistas: [], conquistasEm: {}, vel: 1, menos: null, partidas: 0, dica: false }
const copia = (o) => JSON.parse(JSON.stringify(o))
function doDisco() {
  let d = { ...PADRAO }
  try { const p = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (p && typeof p === 'object') d = { ...PADRAO, ...p } } catch { /* sem armazenamento: vale só nesta visita */ }
  if (!Array.isArray(d.melhores)) d.melhores = []
  if (!Array.isArray(d.conquistas)) d.conquistas = []
  if (!d.conquistasEm || typeof d.conquistasEm !== 'object') d.conquistasEm = {}
  for (const k of ['recorde', 'rodadas', 'partidas']) if (!Number.isFinite(d[k])) d[k] = 0
  return d
}
const chaveDe = (m) => m.t || `${m.semente}|${m.pontos}|${m.dia}`
/** Junta o meu estado com o do disco. `base` = o que eu tinha lido por último (para somar só a minha diferença). */
function mesclar(meu, base, disco) {
  const out = { ...disco, ...meu }
  out.recorde = Math.max(meu.recorde, disco.recorde)
  out.rodadas = disco.rodadas + Math.max(0, meu.rodadas - base.rodadas)
  out.partidas = disco.partidas + Math.max(0, meu.partidas - base.partidas)
  out.conquistas = [...new Set([...disco.conquistas, ...meu.conquistas])]
  out.conquistasEm = { ...meu.conquistasEm, ...disco.conquistasEm } // a data mais antiga gravada fica
  const vistos = new Set()
  out.melhores = [...meu.melhores, ...disco.melhores].filter((m) => { const k = chaveDe(m); if (vistos.has(k)) return false; vistos.add(k); return true }).sort((a, b) => b.pontos - a.pontos).slice(0, 5)
  out.dica = !!(meu.dica || disco.dica)
  return out
}
let D = doDisco(), base = copia(D)
const ouvintes = new Set()
function gravar() {
  D = mesclar(D, base, doDisco()); base = copia(D)
  try { localStorage.setItem(CHAVE, JSON.stringify(D)) } catch { /* ok */ }
}
const ouvintesPartida = new Set()
const gravarPartida = (chave, p) => { try { if (p) localStorage.setItem(chave, JSON.stringify(p)); else localStorage.removeItem(chave) } catch { /* ok */ } }
const lerPartida = (chave) => { try { const p = JSON.parse(localStorage.getItem(chave) || 'null'); return p && typeof p.semente === 'string' && Array.isArray(p.comandos) && Array.isArray(p.liberadas) ? p : null } catch { return null } }
if (typeof addEventListener === 'function') {
  addEventListener('storage', (ev) => {
    if (ev.key === CHAVE_PARTIDA || ev.key === CHAVE_FIM) { for (const f of ouvintesPartida) f(); return }
    if (ev.key !== CHAVE) return
    const disco = doDisco(); D = mesclar(D, base, disco); base = { ...copia(D), rodadas: disco.rodadas, partidas: disco.partidas }
    for (const f of ouvintes) f()
  })
}

export const Guarda = {
  get: (k) => D[k],
  set(k, v) { D[k] = v; gravar() },
  aoMudarFora(f) { ouvintes.add(f) },
  /** Cartas liberadas pelas rodadas vencidas somadas (docs/reino/biblia.md, seção 9; números do config). */
  liberadas(ALBUM, rodadas = D.rodadas) { return [...ALBUM.inicial, ...ALBUM.ordem.slice(0, Guarda.quantas(ALBUM, rodadas))] },
  /** Rodadas somadas que liberam a carta de índice i da ordem. */
  limiar(ALBUM, i) { return i <= ALBUM.quantasNoMeio ? ALBUM.primeira + ALBUM.depoisCada * i : ALBUM.primeira + ALBUM.depoisCada * ALBUM.quantasNoMeio + ALBUM.fimCada * (i - ALBUM.quantasNoMeio) },
  quantas(ALBUM, rodadas = D.rodadas) { let n = 0; while (n < ALBUM.ordem.length && Guarda.limiar(ALBUM, n) <= rodadas) n++; return n },
  /** Quantas rodadas faltam para a próxima carta do álbum e quanto do caminho já andou (null = todas liberadas). */
  proximaCarta(ALBUM) {
    const n = Guarda.quantas(ALBUM); if (n >= ALBUM.ordem.length) return null
    const alvo = Guarda.limiar(ALBUM, n), antes = n ? Guarda.limiar(ALBUM, n - 1) : 0
    return { falta: alvo - D.rodadas, pct: Math.max(0, Math.min(100, Math.floor(((D.rodadas - antes) * 100) / (alvo - antes)))), carta: ALBUM.ordem[n] }
  },
  /** Soma 1 rodada vencida; devolve a carta que acabou de liberar (ou null). */
  rodadaVencida(ALBUM) { const antes = Guarda.quantas(ALBUM); D.rodadas++; gravar(); const depois = Guarda.quantas(ALBUM); return depois > antes ? ALBUM.ordem[depois - 1] : null },
  /** Guarda a partida terminada; devolve { novoRecorde, recorde, antes }. Recorde = mais PONTOS. */
  partida({ pontos, vencidas, rodada, semente }) {
    const antes = D.recorde, novo = pontos > antes
    if (novo) D.recorde = pontos
    D.partidas++
    D.melhores.push({ pontos, vencidas, rodada, semente: String(semente).slice(0, 40), dia: new Date().toISOString().slice(0, 10), t: Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36) })
    D.melhores.sort((a, b) => b.pontos - a.pontos); D.melhores = D.melhores.slice(0, 5)
    gravar()
    return { novoRecorde: novo, recorde: D.recorde, antes }
  },
  /** Marca a conquista; devolve true só na primeira vez. */
  conquista(id) { if (D.conquistas.includes(id)) return false; D.conquistas.push(id); D.conquistasEm = { ...D.conquistasEm, [id]: new Date().toISOString().slice(0, 10) }; gravar(); return true },
  /** Partida em curso: grava a cada passo; `null` apaga. */
  salvarPartida: (p) => gravarPartida(CHAVE_PARTIDA, p),
  partidaSalva: () => lerPartida(CHAVE_PARTIDA),
  /** Partida TERMINADA (gravada na hora em que o motor decide o fim): a tela de fim volta depois de recarregar, até o Play again. */
  salvarFim: (p) => gravarPartida(CHAVE_FIM, p),
  fimSalvo: () => lerPartida(CHAVE_FIM),
  /** Segundo espaço: a partida em curso de quem aceitou a estrada de um amigo (volta a ela depois). */
  guardarOutra: (p) => gravarPartida(CHAVE_OUTRA, p),
  outraPartida: () => lerPartida(CHAVE_OUTRA),
  /** Avisa quando OUTRA aba mexe na partida em curso ou no fim guardado. */
  aoMudarPartida(f) { ouvintesPartida.add(f) },
  tudo: () => copia(D),
}
