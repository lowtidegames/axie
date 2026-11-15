// Laço do Ponto Cruz: carta de custo 0 que compra 1 e dá +1 Linha se a comprada for do tipo do dono (Cascudo é todo Feltro).
// Com o baralho vazio, jogar Ponto Cruz manda-o ao descarte, a compra reembaralha o descarte e pode comprá-lo de volta:
// Linha volta a 7 sem fim dentro do MESMO turno. Política: Ponto Cruz enquanto Linha < 7; senão a carta de dano mais forte.
// Mede: em quantas lutas o jogador derruba o rival num turno só, e quantos comandos isso leva. Depois prova pela rota HTTP.
import { randomBytes } from 'node:crypto'
import { criarLuta, comandosValidos, aplicarNoLugar } from '/home/user/wt/servidor/shared/batalha.js'
import { jogarTurno } from '/home/user/wt/servidor/shared/robos.js'
import { CARTAS, REGRAS } from '/home/user/wt/servidor/shared/config.js'
import { api, novaConta } from './lib.mjs'

function escolher(e, valid) {
  const linha = e.times.A.linha
  const pc = valid.find((c) => c.tipo === 'jogar' && e.cartas[c.carta].carta === 'ponto_cruz')
  const fiapo = valid.find((c) => c.tipo === 'fiapo')
  if (fiapo) return fiapo
  if (pc && linha < REGRAS.linhaMaxima) return pc
  const dano = valid.filter((c) => c.tipo === 'jogar' && CARTAS[e.cartas[c.carta].carta].efeitos.some((x) => x.tipo === 'dano'))
    .sort((a, b) => CARTAS[e.cartas[b.carta].carta].efeitos[0].valor - CARTAS[e.cartas[a.carta].carta].efeitos[0].valor)
  if (dano[0]) return dano[0]
  const zero = valid.find((c) => c.tipo === 'jogar' && CARTAS[e.cartas[c.carta].carta].linha === 0 && e.cartas[c.carta].carta !== 'grito_abafado')
  return zero ?? valid.find((c) => c.tipo === 'passar')
}

const timeA = ['cascudo', 'desfiado', 'pisoteador']
let vitoriasEmUmTurno = 0, vitorias = 0, total = 300, maxCmds = 0
for (let k = 0; k < total; k++) {
  const e = criarLuta({ semente: randomBytes(16).toString('hex'), timeA, timeB: ['embolado', 'cascudo', 'brigao'] })
  while (!e.fim) {
    if (e.vez === 'B') { jogarTurno(e, 'planejador'); continue }
    const t = e.turno; let n = 0
    while (!e.fim && e.vez === 'A' && e.turno === t && n < 3000) { aplicarNoLugar(e, escolher(e, comandosValidos(e))); n++ }
    if (n >= 3000) aplicarNoLugar(e, { tipo: 'passar', time: 'A' })
    if (e.fim?.vencedor === 'A' && n > 30) { vitoriasEmUmTurno++; maxCmds = Math.max(maxCmds, n) }
  }
  if (e.fim.vencedor === 'A') vitorias++
}
console.log(`motor: ${vitorias}/${total} vitórias contra o planejador; ${vitoriasEmUmTurno} acabaram num turno do jogador com >30 comandos (até ${maxCmds})`)

// prova pela rota HTTP: 1 luta, conta quantos comandos o servidor aceita num único turno e o resultado
const c = await novaConta()
const por = Object.fromEntries(c.bonecos.map((b) => [b.pronto, b.id]))
for (let tent = 0; tent < 8; tent++) {
  let L = (await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'aventura', fase: 5, time: timeA.map((p) => por[p]) } })).json
  let maiorTurno = 0, turnoMaior = 0
  while (L.status === 'aberta') {
    const t = L.visao.turno; let n = 0
    while (L.status === 'aberta' && L.visao.turno === t && L.visao.vez === 'A') {
      // reconstrói o "e" mínimo que escolher() usa a partir da visão
      const e = { times: L.visao.times, cartas: L.visao.cartas }
      let cmd = escolher(e, L.validos)
      const corpo = { seq: L.seq, comando: { tipo: cmd.tipo, ...(cmd.carta ? { carta: cmd.carta } : {}), ...(cmd.tipo === 'jogar' ? { alvo: cmd.alvo } : {}) } }
      const x = await api('POST', `/api/luta/${L.id}/comando`, { token: c.token, corpo })
      if (x.status === 429) { await new Promise((ok) => setTimeout(ok, 1000)); continue }
      if (x.status !== 200) { console.log('erro', x.status, x.txt.slice(0, 150)); L.status = 'x'; break }
      L = x.json; n++
      if (n > 600) break
    }
    if (n > maiorTurno) { maiorTurno = n; turnoMaior = t }
    if (n > 600) break
  }
  console.log(`HTTP luta ${tent + 1} (Aventura fase 5, planejador): ${L.status}, vencedor=${L.resultado?.vencedor ?? '-'}; maior turno do jogador: ${maiorTurno} comandos aceitos (turno ${turnoMaior}), Linha no fim: ${L.visao?.times?.A?.linha}`)
  if (maiorTurno > 30) break
}
