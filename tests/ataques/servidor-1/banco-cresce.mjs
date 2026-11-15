// ITEM 8: cada comando guarda a resposta inteira (visão com TODOS os eventos) → crescimento quadrático por luta.
// Joga pela rota HTTP com o time das cartas de custo 0 (muitos comandos por turno) e mede os bytes guardados.
// Também: abrir/olhar/desistir em laço (rolar a mão de novo) e o custo disso.
import { DatabaseSync } from 'node:sqlite'
import { api, novaConta } from './lib.mjs'
import { CARTAS } from '/home/user/wt/servidor/shared/config.js'
const DB = '/tmp/seg-frayz-1/db/frayz.db'
const c = await novaConta()
const por = Object.fromEntries(c.bonecos.map((b) => [b.pronto, b.id]))
const time = [por.cascudo, por.desfiado, por.mudo]
let lutas = 0, cmds = 0
const t0 = Date.now()
for (let k = 0; k < 6; k++) {
  let L = (await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', time, robo: 'ganancioso' } })).json
  lutas++
  while (L.status === 'aberta') {
    const v = L.validos
    const gratis = v.find((x) => x.tipo === 'fiapo' || (x.tipo === 'jogar' && CARTAS[L.visao.cartas[x.carta].carta].linha === 0))
    const outra = v.find((x) => x.tipo === 'jogar')
    const cmd = gratis ?? outra ?? { tipo: 'passar' }
    const corpo = { seq: L.seq, comando: { tipo: cmd.tipo, ...(cmd.carta ? { carta: cmd.carta } : {}), ...(cmd.tipo === 'jogar' ? { alvo: cmd.alvo } : {}) } }
    const x = await api('POST', `/api/luta/${L.id}/comando`, { token: c.token, corpo })
    if (x.status === 429) { await new Promise((ok) => setTimeout(ok, 1000)); continue }
    if (x.status !== 200) { console.log('erro', x.status, x.txt.slice(0, 120)); break }
    cmds++; L = x.json
  }
}
const db = new DatabaseSync(DB, { readOnly: true })
const r = db.prepare(`SELECT COUNT(*) n, SUM(LENGTH(resposta)) b, MAX(LENGTH(resposta)) m FROM luta_respostas WHERE luta_id IN (SELECT id FROM lutas WHERE conta_id = ?)`).get(c.id)
const l = db.prepare(`SELECT SUM(LENGTH(estado)) b FROM lutas WHERE conta_id = ?`).get(c.id)
const dt = (Date.now() - t0) / 1000
console.log(`${lutas} lutas, ${cmds} comandos em ${dt.toFixed(0)} s; respostas guardadas: ${r.n}, ${(r.b / 1024 / 1024).toFixed(2)} MB (maior ${(r.m / 1024).toFixed(0)} KB); estado das lutas ${(l.b / 1024).toFixed(0)} KB`)
const porCmd = r.b / r.n
console.log(`média ${(porCmd / 1024).toFixed(1)} KB por comando → no limite de 240 pedidos/min: ~${(porCmd * 240 * 60 / 1024 / 1024).toFixed(0)} MB/h por conta; 5 contas por IP: ~${(porCmd * 240 * 60 * 5 / 1024 / 1024 / 1024).toFixed(1)} GB/h (teto do IP 600/min: ~${(porCmd * 600 * 60 / 1024 / 1024).toFixed(0)} MB/h por IP)`)

// rolar a mão de novo: abrir, olhar, desistir
const t1 = Date.now(); let rolagens = 0, comecaA = 0
for (let k = 0; k < 30; k++) {
  const L = (await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'aventura', fase: 1, time } })).json
  if (L.visao.comecou === 'A') comecaA++
  await api('POST', `/api/luta/${L.id}/desistir`, { token: c.token })
  rolagens++
}
const e = (await api('GET', '/api/estado', { token: c.token })).json.bonecos.find((b) => b.id === time[0])
console.log(`rolar de novo: ${rolagens} aberturas+desistências em ${((Date.now() - t1) / 1000).toFixed(1)} s; custo ao boneco: pontosDeCostura=${e.pontosDeCostura}/${e.limiteDeCostura}, lutas=${e.lutas}; nenhum outro custo`)
