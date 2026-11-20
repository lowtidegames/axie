// Keepmile — LIGAS do fim de partida. PROVISÓRIO DO BETA (sem dinheiro, sem servidor): só título e enfeite, guardado no aparelho.
// As faixas são as de docs/reino/biblia.md, seção 10, e moram SÓ aqui na tela. Quando o ranking com servidor existir, isto sai
// daqui e passa a vir dele. "Legend of the Mile" (os 10 primeiros) depende do servidor: não aparece no beta.
// ASSUMPTION: com menos de 3 partidas, a média é a das partidas que existem.
export const LIGAS = [
  { nome: 'Gate Sweeper', de: 0 }, { nome: 'Road Warden', de: 800 }, { nome: 'Keep Captain', de: 1200 }, { nome: 'Lord Steward', de: 1600 }, { nome: 'Crown Guardian', de: 2000 },
]
/** Média (inteira) das 3 melhores partidas guardadas. */
export function mediaDasMelhores(melhores) {
  const t = [...melhores].sort((a, b) => b.pontos - a.pontos).slice(0, 3)
  return t.length ? Math.floor(t.reduce((s, m) => s + m.pontos, 0) / t.length) : 0
}
/** Liga da média, a próxima e quanto falta. `pct` = quanto da faixa atual já andou (0–100). */
export function ligaDe(media) {
  let i = 0
  while (i + 1 < LIGAS.length && LIGAS[i + 1].de <= media) i++
  const liga = LIGAS[i], proxima = LIGAS[i + 1] || null
  return { i, liga, proxima, falta: proxima ? proxima.de - media : 0, pct: proxima ? Math.max(0, Math.min(100, Math.floor(((media - liga.de) * 100) / (proxima.de - liga.de)))) : 100 }
}
