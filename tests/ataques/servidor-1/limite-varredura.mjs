// criarLimite: acima de 50.000 chaves, CADA pedido varre o mapa inteiro (e não apaga nada se as chaves ainda estão na janela).
// Com IPv6, um /48 tem 65.536 /64 — um atacante enche o mapa e cada pedido de todo mundo vira uma varredura.
import { criarLimite, chaveDoIp } from '/home/user/wt/servidor/server/api.mjs'
const contar = criarLimite({ max: 600, janelaMs: 60_000 }, Date.now)
for (let i = 0; i < 65536; i++) contar(chaveDoIp(`2001:db8:1:${i.toString(16)}::1`))
const t = performance.now(); for (let i = 0; i < 1000; i++) contar('1.2.3.4'); const d = (performance.now() - t) / 1000
console.log(`65.536 /64 de um só /48 no mapa: cada pedido custa ${d.toFixed(2)} ms só no limite (antes: ~0,001 ms) → teto ~${Math.round(1000 / d)} pedidos/s no servidor inteiro`)
