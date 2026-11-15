// Dois processos do servidor no MESMO arquivo de banco: mesma costura (mesma chave) e mesma luta ao mesmo tempo nos dois.
import { novaConta } from './lib.mjs'
const c = await novaConta()
const req = (porta, m, p, corpo) => fetch(`http://127.0.0.1:${porta}${p}`, { method: m, headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' }, body: JSON.stringify(corpo) }).then(async (r) => `${r.status}:${(await r.text()).slice(0, 40)}`)
const ids = c.bonecos.map((b) => b.id)
const r1 = await Promise.all([48731, 48732, 48731, 48732].map((p) => req(p, 'POST', '/api/costura', { a: ids[0], b: ids[1], pedido: 'doisproc001' })))
console.log('mesma costura nos 2 processos:', r1.join(' | '))
const r2 = await Promise.all([48731, 48732].map((p) => req(p, 'POST', '/api/luta', { modo: 'livre', time: ids.slice(2, 5) })))
console.log('mesma luta nos 2 processos:', r2.map((x) => x.slice(0, 20)).join(' | '))
const est = await (await fetch('http://127.0.0.1:48731/api/estado', { headers: { authorization: `Bearer ${c.token}` } })).json()
console.log('bonecos:', est.bonecos.length, '(9 + filhos); voltas do par:', est.bonecos.filter((b) => b.id === ids[0] || b.id === ids[1]).map((b) => b.voltasUsadas).join(','))
