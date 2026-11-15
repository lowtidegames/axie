// Costura sem custo: cada filho nasce com Carretel cheio (5 voltas) → a coleção de 1 conta cresce sem teto.
// Depois mede quanto custa ao servidor um GET /api/estado e um GET /api/boneco dessa conta (laço de eventos parado).
// As costuras são feitas pela ROTA HTTP, no limite de 240/min por conta (aqui com limite real; corre o tempo que der).
import { api, novaConta } from './lib.mjs'
const ALVO = Number(process.argv[2] || 600)
const c = await novaConta()
let bonecos = c.bonecos, feitas = 0, recusadas = 0, n = 0
const t0 = Date.now()
outer: while (feitas < ALVO) {
  const vivos = bonecos.filter((b) => b.estado === 'ativo' && b.voltasUsadas < b.carretel)
  let achou = false
  for (let i = 0; i < vivos.length && !achou; i++) for (let j = vivos.length - 1; j > i && !achou; j--) {
    const A = vivos[i], B = vivos[j]
    if (A.pais.includes(B.id) || B.pais.includes(A.id) || (A.pais.length && A.pais.some((p) => B.pais.includes(p)))) continue
    const r = await api('POST', '/api/costura', { token: c.token, corpo: { a: A.id, b: B.id, pedido: `p${n++}xxxxxxx` } })
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 2000)); continue outer }
    if (r.status !== 201) { recusadas++; continue }
    feitas++; achou = true
    bonecos = bonecos.filter((b) => b.id !== A.id && b.id !== B.id).concat(r.json.pais, [r.json.filho])
  }
  if (!achou) break
}
const dt = (Date.now() - t0) / 1000
console.log(`costuras ${feitas} em ${dt.toFixed(0)} s (${(feitas / dt * 60).toFixed(0)}/min); bonecos na conta: ${bonecos.length}; recusadas ${recusadas}`)
const ativosComCarretel = bonecos.filter((b) => b.voltasUsadas < b.carretel).length
console.log(`bonecos que ainda podem costurar: ${ativosComCarretel} (a coleção não para de crescer)`)
for (let k = 0; k < 3; k++) {
  const r = await api('GET', '/api/estado', { token: c.token })
  console.log(`GET /api/estado: ${r.ms.toFixed(1)} ms, ${(r.txt.length / 1024).toFixed(0)} KB`)
}
