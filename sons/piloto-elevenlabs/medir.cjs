const { chromium } = require('playwright'); const fs = require('fs')
;(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1400 }, deviceScaleFactor: 1 })
  await p.setContent('<body style="margin:0;background:#1b1226;color:#f2e6c9;font:12px monospace"><canvas id=c width=1500 height=1400></canvas></body>')
  const arquivos = fs.readdirSync('.').filter(f => f.endsWith('.mp3')).sort()
  const dados = arquivos.map(f => ({ nome: f, b64: fs.readFileSync(f).toString('base64') }))
  const res = await p.evaluate(async (dados) => {
    const ac = new OfflineAudioContext(2, 44100, 44100); const c = document.getElementById('c').getContext('2d'); const out = []
    const W = 360, H = 86, cols = 4
    for (let i = 0; i < dados.length; i++) {
      const bin = Uint8Array.from(atob(dados[i].b64), ch => ch.charCodeAt(0)); const buf = await ac.decodeAudioData(bin.buffer)
      const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L; const n = L.length
      let pico = 0, soma = 0, prim = -1, ult = -1
      for (let k = 0; k < n; k++) { const v = (L[k] + R[k]) / 2, a = Math.abs(v); if (a > pico) pico = a; soma += v * v; if (a > 0.01) { if (prim < 0) prim = k; ult = k } }
      const rms = Math.sqrt(soma / n)
      const x0 = 8 + (i % cols) * (W + 12), y0 = 16 + Math.floor(i / cols) * (H + 26)
      c.fillStyle = '#2a1b3d'; c.fillRect(x0, y0, W, H); c.strokeStyle = '#ffc857'; c.beginPath()
      for (let x = 0; x < W; x++) { let mn = 1, mx = -1; const a = Math.floor(x * n / W), z = Math.floor((x + 1) * n / W); for (let k = a; k < z; k++) { const v = L[k]; if (v < mn) mn = v; if (v > mx) mx = v } c.moveTo(x0 + x, y0 + H / 2 - mx * H / 2); c.lineTo(x0 + x, y0 + H / 2 - mn * H / 2) }
      c.stroke(); c.fillStyle = '#f2e6c9'; c.fillText(`${dados[i].nome}  ${(n / buf.sampleRate).toFixed(2)}s  pico ${(20 * Math.log10(pico)).toFixed(1)}dB  rms ${(20 * Math.log10(rms)).toFixed(1)}dB`, x0, y0 - 3)
      out.push({ nome: dados[i].nome, seg: +(n / buf.sampleRate).toFixed(2), picoDb: +(20 * Math.log10(pico)).toFixed(1), rmsDb: +(20 * Math.log10(rms)).toFixed(1), comecaMs: Math.round(prim / 44.1), utilMs: Math.round((ult - prim) / 44.1) })
    }
    return out
  }, dados)
  await p.screenshot({ path: 'ondas.png', clip: { x: 0, y: 0, width: 1500, height: 16 + Math.ceil(dados.length / 4) * 112 } })
  fs.writeFileSync('medidas.json', JSON.stringify(res, null, 1)); for (const r of res) console.log(r.nome.padEnd(20), String(r.seg).padStart(5) + 's', 'pico', String(r.picoDb).padStart(6), 'rms', String(r.rmsDb).padStart(6), 'começa', String(r.comecaMs).padStart(4) + 'ms', 'útil', String(r.utilMs).padStart(5) + 'ms')
  await b.close()
})().catch(e => { console.error(e); process.exit(1) })
