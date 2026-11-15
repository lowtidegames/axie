// Quanto tempo o pedido leva no servidor por causa do robô (planejador roda DENTRO do pedido)?
// 1) motor puro: tempo de jogarTurno(planejador) em muitas lutas, pior caso
// 2) HTTP: N contas, lutas com planejador, comando 'passar' sempre (o robô joga o turno inteiro dentro do pedido)
import { randomBytes } from 'node:crypto'
import { criarLuta, aplicarNoLugar } from '/home/user/wt/servidor/shared/batalha.js'
import { jogarTurno } from '/home/user/wt/servidor/shared/robos.js'
import { BONECOS_PRONTOS } from '/home/user/wt/servidor/shared/config.js'
import { api, novaConta } from './lib.mjs'

const P = Object.keys(BONECOS_PRONTOS)
const pick = () => [...P].sort(() => Math.random() - 0.5).slice(0, 3)
let pior = 0, soma = 0, n = 0
for (let k = 0; k < 300; k++) {
  const e = criarLuta({ semente: randomBytes(16).toString('hex'), timeA: pick(), timeB: pick() })
  while (!e.fim) {
    if (e.vez === 'A') { aplicarNoLugar(e, { tipo: 'passar', time: 'A' }); continue }
    const t = performance.now(); jogarTurno(e, 'planejador'); const d = performance.now() - t
    pior = Math.max(pior, d); soma += d; n++
  }
}
console.log(`motor: turno do planejador — média ${(soma / n).toFixed(1)} ms, pior ${pior.toFixed(1)} ms (${n} turnos)`)

// HTTP
const c = await novaConta()
const ids = c.bonecos.map((b) => b.id)
let piorH = 0, somaH = 0, nH = 0
for (let k = 0; k < 15; k++) {
  const time = [...ids].sort(() => Math.random() - 0.5).slice(0, 3)
  const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', time, robo: 'planejador' } })
  if (r.status !== 201) { console.log('abrir', r.status, r.txt); break }
  let L = r.json
  while (L.status === 'aberta') {
    const x = await api('POST', `/api/luta/${L.id}/comando`, { token: c.token, corpo: { seq: L.seq, comando: { tipo: 'passar' } } })
    if (x.status !== 200) { console.log('cmd', x.status, x.txt.slice(0, 100)); break }
    piorH = Math.max(piorH, x.ms); somaH += x.ms; nH++
    L = x.json
  }
}
console.log(`HTTP: 'passar' (robô joga dentro do pedido) — média ${(somaH / nH).toFixed(1)} ms, pior ${piorH.toFixed(1)} ms (${nH} pedidos)`)
