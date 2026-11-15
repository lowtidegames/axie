// ITEM 1: a visão esconde o nome das cartas não vistas, mas o NÚMERO da carta (Bc7) já diz qual é: n → boneco n/6, carta (n%6)/2.
import { randomBytes } from 'node:crypto'
import { criarLuta, visaoDoTime, montarBoneco } from '/home/user/wt/servidor/shared/batalha.js'
const e = criarLuta({ semente: randomBytes(16).toString('hex'), timeA: ['cascudo', 'desfiado', 'mudo'], timeB: ['mordedor', 'embolado', 'brigao'] })
const v = visaoDoTime(e, 'A')
let escondidas = 0, acertos = 0
for (const [cid, c] of Object.entries(v.cartas)) {
  if (!cid.startsWith('B') || c.carta) continue
  escondidas++
  const n = Number(cid.slice(2)), b = v.bonecos[c.dono]
  const deduzida = montarBoneco({ partes: b.partes }).cartas[Math.floor((n % 6) / 2)]
  if (deduzida === e.cartas[cid].carta) acertos++
}
console.log(`cartas do rival escondidas na visão: ${escondidas}; nome deduzido só pelo número: ${acertos}/${escondidas}`)
console.log('o que segue escondido de verdade: QUAIS números estão na mão do rival (mão = contagem) e a ordem do baralho')
