import fs from 'node:fs'
const chave = process.env.ELEVENLABS_API_KEY
const TETO = Number(process.argv[2] || 900), TOMADAS = Number(process.argv[3] || 4), ARQ = process.argv[4] || 'pedido.json', DE = Number(process.argv[5] || 1)
const pedido = JSON.parse(fs.readFileSync(ARQ, 'utf8'))
const fila = []; for (const p of pedido) for (let t = DE; t < DE + TOMADAS; t++) fila.push({ p, t })
const reg = fs.existsSync('registro.json') ? JSON.parse(fs.readFileSync('registro.json', 'utf8')) : { total: 0, itens: [] }
let gasto = 0, erros = 0
async function um({ p, t }) {
  if (gasto >= TETO) return
  const r = await fetch('https://api.elevenlabs.io/v1/sound-generation', { method: 'POST', headers: { 'xi-api-key': chave, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: p.texto, duration_seconds: p.seg, prompt_influence: p.inf }) })
  const custo = Number(r.headers.get('character-cost') || 0)
  if (!r.ok) { erros++; console.log(`${p.nome}-${t}: ERRO ${r.status}`); return }
  fs.writeFileSync(`bruto/${p.nome}-${t}.mp3`, Buffer.from(await r.arrayBuffer())); gasto += custo
  reg.itens.push({ nome: p.nome, tomada: t, seg: p.seg, custo })
}
const trab = Array.from({ length: 3 }, async () => { while (fila.length) await um(fila.shift()) })
await Promise.all(trab)
reg.total += gasto; fs.writeFileSync('registro.json', JSON.stringify(reg, null, 1))
console.log(`gerados: ${reg.itens.length} · gasto nesta rodada: ${gasto} · total do pacote: ${reg.total} · erros: ${erros}`)
