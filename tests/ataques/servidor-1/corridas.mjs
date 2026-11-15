// Corridas e ids alheios por todos os caminhos.
import { api, novaConta } from './lib.mjs'
const a = await novaConta(), b = await novaConta()
const timeA = a.bonecos.slice(0, 3).map((x) => x.id)
const L = (await api('POST', '/api/luta', { token: a.token, corpo: { modo: 'livre', time: timeA, robo: 'ganancioso' } })).json
const jog = L.validos.find((c) => c.tipo === 'jogar')
const reqs = [
  api('POST', `/api/luta/${L.id}/comando`, { token: a.token, corpo: { seq: L.seq, comando: { tipo: 'passar' } } }),
  jog ? api('POST', `/api/luta/${L.id}/comando`, { token: a.token, corpo: { seq: L.seq, comando: { tipo: 'jogar', carta: jog.carta, alvo: jog.alvo } } }) : null,
  api('POST', `/api/luta/${L.id}/desistir`, { token: a.token }),
  api('POST', '/api/costura', { token: a.token, corpo: { a: timeA[0], b: a.bonecos[5].id, pedido: 'corrida0001' } }),
  api('POST', `/api/boneco/${timeA[1]}/aposentar`, { token: a.token }),
  api('POST', '/api/luta', { token: a.token, corpo: { modo: 'livre', time: [timeA[2], a.bonecos[6].id, a.bonecos[7].id] } }),
].filter(Boolean)
const rs = await Promise.all(reqs)
console.log('corrida (passar, jogar, desistir, costura c/ boneco em luta, aposentar, nova luta c/ boneco em luta):', rs.map((r) => `${r.status}${r.json?.erro ? ':' + r.json.erro.codigo : ''}`).join(' | '))
const est = (await api('GET', '/api/estado', { token: a.token })).json
console.log('depois: luta aberta =', est.lutaAberta, '; ocupados =', est.bonecos.filter((x) => x.ocupado).length, '; bonecos =', est.bonecos.length)
// ids alheios
const idB = b.bonecos[0].id
const alheio = await Promise.all([
  api('GET', `/api/boneco/${idB}`, { token: a.token }),
  api('POST', `/api/boneco/${idB}/aposentar`, { token: a.token }),
  api('GET', `/api/costura/chances?a=${idB}&b=${a.bonecos[3].id}`, { token: a.token }),
  api('POST', '/api/costura', { token: a.token, corpo: { a: idB, b: a.bonecos[3].id, pedido: 'alheio00001' } }),
  api('POST', '/api/luta', { token: a.token, corpo: { modo: 'livre', time: [idB, a.bonecos[3].id, a.bonecos[4].id] } }),
  api('GET', `/api/luta/${L.id}`, { token: b.token }),
  api('GET', `/api/luta/${L.id}/replay`, { token: b.token }),
  api('POST', `/api/luta/${L.id}/comando`, { token: b.token, corpo: { seq: 0, comando: { tipo: 'passar' } } }),
])
console.log('ids alheios (boneco, aposentar, chances, costura, luta, ver luta, replay, comando):', alheio.map((r) => r.status).join(' '))
// mesma chave de pedido em duas contas: cada uma tem a sua resposta
const p1 = await api('POST', '/api/costura', { token: a.token, corpo: { a: a.bonecos[3].id, b: a.bonecos[4].id, pedido: 'mesmachave01' } })
const p2 = await api('POST', '/api/costura', { token: b.token, corpo: { a: a.bonecos[3].id, b: a.bonecos[4].id, pedido: 'mesmachave01' } })
console.log('mesma chave de pedido, conta B com bonecos de A:', p1.status, p2.status, p2.json?.erro?.codigo)
