import fs from 'node:fs'
const chave = process.env.ELEVENLABS_API_KEY
const pedido = JSON.parse(fs.readFileSync('pedido.json', 'utf8'))
const registro = []
let total = 0
for (const p of pedido) {
  for (let t = p.de ?? 1; t < (p.de ?? 1) + p.tomadas; t++) {
    const corpo = { text: p.texto, duration_seconds: p.seg, prompt_influence: p.inf }
    if (p.laco) corpo.loop = true
    const r = await fetch('https://api.elevenlabs.io/v1/sound-generation', { method: 'POST', headers: { 'xi-api-key': chave, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    const custo = Number(r.headers.get('character-cost') || 0)
    if (!r.ok) { const txt = (await r.text()).slice(0, 200); console.log(`${p.nome}-${t}: ERRO ${r.status} ${txt}`); registro.push({ nome: p.nome, tomada: t, erro: r.status }); continue }
    const buf = Buffer.from(await r.arrayBuffer())
    fs.writeFileSync(`${p.nome}-${t}.mp3`, buf)
    total += custo
    registro.push({ nome: p.nome, tomada: t, seg: p.seg, custo, bytes: buf.length })
    console.log(`${p.nome}-${t}: ${p.seg}s custo ${custo} (${buf.length} bytes)`)
  }
}
fs.writeFileSync('registro.json', JSON.stringify({ total, registro }, null, 1))
console.log('TOTAL de créditos:', total)
