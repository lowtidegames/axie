// Mesmo ataque da costura-explosao, mas chamando o jogo direto (banco :memory:) para chegar ao volume de 1 hora/1 dia
// dentro do limite de 240 pedidos/min. Mede o tempo de estado() + JSON (o que GET /api/estado faz) — tudo no laço de eventos.
import { abrirBanco } from '/home/user/wt/servidor/server/db.mjs'
import { criarJogo } from '/home/user/wt/servidor/server/jogo.mjs'
const db = abrirBanco(':memory:'); const jogo = criarJogo(db)
const { conta } = jogo.criarConta('escala')
let fila = jogo.estado(conta.id).bonecos, n = 0
const medir = () => { const t = performance.now(); const s = JSON.stringify(jogo.estado(conta.id)); return [(performance.now() - t).toFixed(0), (s.length / 1048576).toFixed(1)] }
for (const meta of [2000, 14400, 40000]) {
  while (n < meta) {
    const A = fila.shift(), B = fila.shift()
    try {
      const r = jogo.costurarPar(conta.id, { a: A.id, b: B.id, pedido: `k${n}xxxxxxx` })
      n++; fila.push(...r.corpo.pais.filter((p) => p.voltasUsadas < p.carretel), r.corpo.filho)
    } catch { fila.push(B, A); fila.push(fila.shift()) }
  }
  const [ms, mb] = medir()
  console.log(`${n} costuras (= ${(n / 240 / 60).toFixed(1)} h no limite): ${n + 9} bonecos; estado()+JSON: ${ms} ms, ${mb} MB`)
}
