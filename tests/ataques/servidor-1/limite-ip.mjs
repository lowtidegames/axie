// ITEM 3/4: limite de contas por IP — 6ª conta do mesmo IP recusada (atrás de proxy, TODOS os jogadores têm esse IP);
// depois de reiniciar o servidor, o limite volta a zero (só memória).
import { api } from './lib.mjs'
const r = []
for (let i = 0; i < 7; i++) r.push((await api('POST', '/api/conta', { corpo: { apelido: `ipteste${i}` } })).status)
console.log('7 contas seguidas do mesmo IP:', r.join(' '))
const xff = await api('POST', '/api/conta', { corpo: { apelido: 'ipxff' }, cab: { 'x-forwarded-for': '9.9.9.9' } })
console.log('com X-Forwarded-For trocado:', xff.status, '(não lê o cabeçalho: bom sem proxy; atrás de proxy, todos dividem o mesmo balde)')
