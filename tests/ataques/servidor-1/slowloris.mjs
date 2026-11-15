// Muitas conexões que mandam o cabeçalho devagar (ou corpo devagar) — o servidor continua atendendo?
import net from 'node:net'
import { api, BASE } from './lib.mjs'
const porta = Number(new URL(BASE).port)
const N = Number(process.argv[2] || 3000)
const socks = []
for (let i = 0; i < N; i++) {
  const s = net.connect(porta, '127.0.0.1'); s.on('error', () => {})
  s.write('POST /api/conta HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 8000\r\n\r\n{"apelido":"')
  socks.push(s)
}
const vivos = () => socks.filter((s) => !s.destroyed).length
for (const t of [1, 5, 12, 20, 40, 50]) {
  await new Promise((ok) => setTimeout(ok, (t - (t > 1 ? [1, 5, 12, 20, 40, 50][[1, 5, 12, 20, 40, 50].indexOf(t) - 1] : 0)) * 1000))
  for (const s of socks) if (!s.destroyed) s.write('a')
  const r = await api('GET', '/index.html')
  console.log(`t=${t}s: conexões lentas ainda abertas ${vivos()}/${N}; pedido normal: ${r.status} em ${r.ms.toFixed(0)} ms`)
}
for (const s of socks) s.destroy()
