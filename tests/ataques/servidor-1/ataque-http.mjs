// HTTP: caminhos para fora das raízes, métodos estranhos, cabeçalhos, CORS, poluição de protótipo, JSON estranho.
import net from 'node:net'
import { api, novaConta, BASE } from './lib.mjs'
const porta = Number(new URL(BASE).port)

function cru(texto) {
  return new Promise((ok) => {
    const s = net.connect(porta, '127.0.0.1', () => s.write(texto))
    let d = ''
    s.on('data', (x) => { d += x })
    s.on('end', () => ok(d)); s.on('error', () => ok(d + ' [erro]'))
    setTimeout(() => { s.destroy(); ok(d) }, 1500)
  })
}
const linha1 = (d) => d.split('\r\n')[0] + ' | ' + (d.length) + ' bytes'

const caminhos = ['/../server/db.mjs', '/%2e%2e/server/db.mjs', '/%252e%252e/server/db.mjs', '/shared/..%2fserver/db.mjs', '/shared/%2e%2e%2fpackage.json',
  '/..%5cserver%5cdb.mjs', '/shared/rng.js%00.png', '/.git/config', '/shared/../.git/HEAD', '/shared/..%2f.git%2fHEAD', '/dados/frayz-teste.db', '/shared',
  '/shared/', '/js/', '/%2fetc%2fpasswd', '//etc/passwd', '/shared//..//..//package.json', '/index.html', '/shared/config.js', '/tests/servidor/api.test.js', '/package.json']
for (const c of caminhos) {
  const d = await cru(`GET ${c} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`)
  console.log('GET', c.padEnd(40), linha1(d))
}
for (const m of ['OPTIONS', 'TRACE', 'PUT', 'DELETE', 'PATCH', 'CONNECT', 'PROPFIND']) {
  const d = await cru(`${m} /api/estado HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`)
  console.log(m.padEnd(8), '/api/estado', linha1(d))
}
console.log('OPTIONS * ', linha1(await cru('OPTIONS * HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n')))
console.log('URL absoluta', linha1(await cru('GET http://evil/api/estado HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n')))
console.log('URL quebrada', linha1(await cru('GET http://[ HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n')))
console.log('cabeçalho 20KB', linha1(await cru(`GET /api/estado HTTP/1.1\r\nHost: x\r\nX-A: ${'a'.repeat(20000)}\r\nConnection: close\r\n\r\n`)))
// CORS
const r = await api('GET', '/api/estado', { cab: { origin: 'https://evil.example' } })
console.log('CORS: Access-Control-Allow-Origin =', r.headers.get('access-control-allow-origin'))

const c = await novaConta()
const corpos = {
  proto: '{"__proto__":{"admin":true},"apelido":"abc"}',
  construtor: '{"constructor":{"prototype":{"x":1}},"apelido":"abc"}',
  duplicado: '{"apelido":"<b>x</b>","apelido":"normal"}',
  profundo: '['.repeat(3000) + ']'.repeat(3000),
  bom: '﻿{"apelido":"abc"}',
}
for (const [k, v] of Object.entries(corpos)) { const x = await api('POST', '/api/conta', { corpo: v }); console.log('conta', k, x.status, x.txt.slice(0, 90)) }
const q = await api('GET', '/api/costura/chances?__proto__=1&a=x', { token: c.token }); console.log('consulta __proto__', q.status, q.txt.slice(0, 80))
const q2 = await api('GET', `/api/costura/chances?a=${c.bonecos[0].id}&b=${c.bonecos[1].id}&constructor=1`, { token: c.token }); console.log('consulta constructor', q2.status)
const cm = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', time: c.bonecos.slice(0, 3).map((b) => b.id), robo: 'ganancioso' } })
for (const corpo of [{ seq: '0', comando: { tipo: 'passar' } }, { seq: -1, comando: { tipo: 'passar' } }, { seq: 1e300, comando: { tipo: 'passar' } }, { seq: 0, comando: { tipo: 'passar', __proto__: { x: 1 } } },
  JSON.parse('{"seq":0,"comando":{"tipo":"passar","__proto__":{"carta":"Ac0"}}}'), { seq: 0.5, comando: { tipo: 'passar' } }, { seq: 0, comando: { tipo: 'jogar', carta: "Ac0' OR 1=1--", alvo: 'B0' } }]) {
  const x = await api('POST', `/api/luta/${cm.json.id}/comando`, { token: c.token, corpo }); console.log('comando', JSON.stringify(corpo).slice(0, 70).padEnd(72), x.status, x.json?.erro?.codigo)
}
// SQL em ids e apelido
for (const ap of ["a' OR 1=1--", 'Robert"); DROP TABLE contas;--', 'Ꭺdmіn', 'ad‮min', 'abćdef', '   abc   ']) {
  const x = await api('POST', '/api/conta', { corpo: { apelido: ap } }); console.log('apelido', JSON.stringify(ap).padEnd(34), x.status, x.json?.conta?.apelido ?? x.json?.erro?.codigo)
}
const x = await api('GET', "/api/boneco/bo_' OR '1'='1", { token: c.token }); console.log('boneco com SQL', x.status, x.json?.erro?.codigo)
// erro 500: o que sai
const e5 = await cru('GET http://[ HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n'); console.log('corpo do 500:', e5.split('\r\n\r\n')[1])
