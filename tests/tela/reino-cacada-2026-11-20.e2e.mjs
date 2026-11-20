// Caça a bugs 20/11/2026 (H4) — teste de tela que FALHA hoje; o conserto é de quem é dono de public/reino/js/interface.js.
// Bug H5: no celular, a seta verde do "TAP A CARD" (primeira partida) cai em cima da linha "WIN: ... / PROMOTION / 8 GOLD".
// A seta é desenhada em interface.js (setaCarta): ícone de 10 px entre y+14 e y+24 com y = cartas[1].y - 34 - balanço (0 a 4 px;
// 0 com Reduced motion). A linha WIN ocupa L.ganhe = { y: cartas[0].y - 44/css, h: 44/css }. As duas áreas não podem se cruzar.
// Bug P1 (ver bloco P1 no fim): o PERFIL, no celular em pé (390x844) e deitado (844x390), corta o conteúdo sem rolagem — Album/Achievements
// (e "Watch" dos melhores jogos) ficam escondidos atrás do botão de baixo ou fora da caixa. Esse bloco sobe um servidor de verdade.
// Rode pela trava:  node tools/trava-robos.mjs rodar "timeout 300 node tests/tela/reino-cacada-2026-11-20.e2e.mjs"
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' }
const falhas = []
const srv = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname), alvo = path.resolve(RAIZ, '.' + (p.endsWith('/') ? p + 'index.html' : p))
  if (!alvo.startsWith(RAIZ + path.sep)) { res.writeHead(403); return res.end() }
  try { res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(await readFile(alvo)) } catch { res.writeHead(404); res.end() }
})
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${srv.address().port}/public/reino/`
const browser = await chromium.launch()
for (const [w, h, reduz] of [[390, 844, true], [360, 740, true], [320, 568, true], [390, 844, false], [360, 740, false], [320, 568, false]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, reducedMotion: reduz ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  await page.goto(base + '?teste=1&nova=1&semente=cacada-h5')
  await page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
  await page.waitForFunction(() => window.__keepmile.desenhou().includes('setaCarta'), null, { timeout: 10000 }).catch(() => {})
  const r = await page.evaluate(() => { const k = window.__keepmile, L = k.layout(), css = k.letra().css, m = k.modelo(); return { cartas: L.cartas, dy: L.setaDy, css, vis: k.desenhou().includes('setaCarta'), fase: m.fase } })
  // a seta fica em y = cartas[1].y - L.setaDy - balanço (balanço 0 a 4 px PARA CIMA; o pior caso é o 0, o mais perto da linha WIN)
  const hmin = 44 / r.css, y = r.cartas[1].y - r.dy, arrTopo = y + 14, arrFundo = y + 24, ganheTopo = r.cartas[0].y - hmin, ganheFundo = r.cartas[0].y
  const cruza = arrFundo > ganheTopo && arrTopo < ganheFundo
  const nome = `${w}x${h}${reduz ? ' menos animação' : ''}`
  if (!r.vis) { falhas.push(`${nome}: a seta não apareceu (a conferência precisa dela)`); console.log('FALHA: ' + falhas.at(-1)) }
  else if (cruza) { falhas.push(`${nome}: a seta (${arrTopo.toFixed(1)}..${arrFundo.toFixed(1)}) cruza a linha WIN (${ganheTopo.toFixed(1)}..${ganheFundo.toFixed(1)})`); console.log('FALHA: ' + falhas.at(-1)) }
  else console.log(`  ok: ${nome} a seta não cruza a linha WIN`)
  await ctx.close()
}

// ---------------------------------------------------------------- P1: perfil com conteúdo escondido (celular)
{
  const os = await import('node:os'), fs = await import('node:fs')
  const { iniciar } = await import('../../server/index.mjs')
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'keepmile-cacada-'))
  const folga = { pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 100_000, janelaMs: 60_000 }, contasPorIp: { max: 1000, janelaMs: 60_000 } }
  const reinoFolgado = { partidasPorConta: { max: 100_000, janelaMs: 3_600_000 }, partidasPorIp: { max: 100_000, janelaMs: 3_600_000 }, replaysPorConta: { max: 100_000, janelaMs: 60_000 }, replaysPorIp: { max: 100_000, janelaMs: 60_000 }, replayPassosPorPagina: 3 }
  const s = await iniciar({ dbPath: path.join(pasta, 'c.db'), porta: 0, log: () => {}, limites: folga, reino: { params: reinoFolgado } })
  const api = async (m, c, tok, corpo) => { const r = await fetch(`http://127.0.0.1:${s.porta}${c}`, { method: m, headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: corpo === undefined ? undefined : JSON.stringify(corpo) }); return r.json() }
  const conta = await api('POST', '/api/conta', null, { apelido: 'Cacada Teste' })
  // 4 partidas de treino curtas (só 1 carta, no 1º terreno), como na conta de prova
  for (let k = 0; k < 4; k++) {
    let p = (await api('POST', '/api/reino/partida', conta.token, { modo: 'treino' })).partida || null
    if (!p) p = await api('POST', '/api/reino/partida', conta.token, { modo: 'treino' })
    p = p.partida || p
    for (let n = 0; n < 400 && p.status === 'aberta'; n++) {
      const o = p.opcoes, v = p.visao
      let cmd = o.fase === 'espolio' ? o.comandos.find((x) => x.tipo === 'espolio') : null
      if (!cmd && !v.cartaPosta && v.rodada <= 1 + k) { const por = o.comandos.filter((x) => x.tipo === 'por'); cmd = por[0] }
      const r = await api('POST', '/api/reino/partida/comando', conta.token, { partida: p.id, seq: p.seq, comando: cmd || { tipo: 'batalhar' } })
      p = r.partida || r
    }
  }
  const sessao = JSON.stringify({ token: conta.token, apelido: 'Cacada Teste' })
  for (const [w, h] of [[390, 844], [844, 390]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })
    await ctx.addInitScript((x) => localStorage.setItem('keepmile_sessao_v1', x), sessao)
    const page = await ctx.newPage()
    await page.goto(`http://127.0.0.1:${s.porta}/public/reino/`)
    await page.locator('[id="bt-menu"]').waitFor({ timeout: 20000 })
    await page.locator('[id="bt-menu"]').click(); await page.locator('#mLiga').click({ timeout: 8000 })
    await page.locator('#perfilAlbum').waitFor({ timeout: 8000 })
    const r = await page.evaluate(() => {
      const cx = document.getElementById('telaCaixa'), cr = cx.getBoundingClientRect(), co = document.getElementById('telaCorpo'), rola = /auto|scroll/.test(getComputedStyle(co).overflowY) && co.scrollHeight > co.clientHeight, dica = co.dataset.mais === '1'
      const alvo = ['perfilNome', 'perfilAlbum', 'perfilConquistas', 'telaPe'].map((id) => { const b = document.getElementById(id).getBoundingClientRect(); return { id, y: Math.round(b.y), fim: Math.round(b.bottom) } })
      const fora = alvo.filter((a) => a.fim > cr.bottom + 1)
      const sobre = []; for (let i = 0; i < alvo.length; i++) for (let j = i + 1; j < alvo.length; j++) if (alvo[i].y < alvo[j].fim - 1 && alvo[j].y < alvo[i].fim - 1) sobre.push(alvo[i].id + ' x ' + alvo[j].id)
      return { rola, dica, fora: fora.map((a) => a.id), sobre }
    })
    const nome = `perfil ${w}x${h}`
    const ruim = (r.fora.length && !r.rola) || r.sobre.length
    if (ruim) { falhas.push(`${nome}: botões fora da caixa sem rolagem [${r.fora}] ou sobrepostos [${r.sobre}]`); console.log('FALHA: ' + falhas.at(-1)) } else console.log(`  ok: ${nome} sem botão escondido`)
    await ctx.close()
  }
  // H11: perfil com 5 melhores partidas (o máximo do servidor), em pé e deitado: dá para CHEGAR em Watch, Album e Achievements (rolando
  // o meio da caixa), o botão nunca fica atrás de outro (o que está na ponta do dedo é o próprio botão) e o toque tem 44 px ou mais.
  for (const [w, h] of [[390, 844], [844, 390], [360, 740]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })
    await ctx.addInitScript((x) => localStorage.setItem('keepmile_sessao_v1', x), sessao)
    const page = await ctx.newPage()
    await page.route('**/api/reino/perfil', async (rt) => { const r = await rt.fetch(), j = await r.json(); const m = j.melhores[0] || { id: 'x', modo: 'treino', pontos: 100, vencidas: 2, quando: '2026-11-20' }; j.melhores = [0, 1, 2, 3, 4].map((i) => ({ ...m, id: m.id + (i ? 'x' + i : ''), pontos: 500 - i })); await rt.fulfill({ response: r, json: j }) })
    await page.goto(`http://127.0.0.1:${s.porta}/public/reino/`)
    await page.locator('[id="bt-menu"]').waitFor({ timeout: 20000 })
    await page.locator('[id="bt-menu"]').click(); await page.locator('#mLiga').click({ timeout: 8000 })
    await page.locator('#perfilAlbum').waitFor({ timeout: 8000 })
    await page.waitForFunction(() => document.querySelectorAll('#listaMelhores li').length === 5, null, { timeout: 8000 })
    const nome = `perfil 5 partidas ${w}x${h}`, erros = []
    const antes = await page.evaluate(() => { const c = document.getElementById('telaCorpo'); return { rola: c.scrollHeight > c.clientHeight + 1, dica: c.dataset.mais === '1' } })
    if (antes.rola && !antes.dica) erros.push('o meio rola mas nada avisa que tem mais embaixo')
    for (const id of ['perfilAlbum', 'perfilConquistas']) {
      await page.evaluate((i) => { const c = document.getElementById('telaCorpo'), b = document.getElementById(i); c.scrollTop = c.scrollHeight; void b }, id)
      const r = await page.evaluate((i) => { const c = document.getElementById('telaCorpo').getBoundingClientRect(), e = document.getElementById(i), b = e.getBoundingClientRect(), topo = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return { dentro: b.top >= c.top - 1 && b.bottom <= c.bottom + 1, altura: b.height, topo: topo?.closest('button')?.id || '' } }, id)
      if (!r.dentro) erros.push(`${id} fora da caixa mesmo no fim da rolagem`)
      if (r.topo !== id) erros.push(`${id} está atrás de "${r.topo}"`)
      if (r.altura < 44) erros.push(`${id} com ${r.altura}px de altura`)
    }
    await page.evaluate(() => { document.getElementById('telaCorpo').scrollTop = 0 })
    const watch = await page.evaluate(() => { const c = document.getElementById('telaCorpo'), b = document.querySelector('#listaMelhores li:last-child button'); if (!b) return null; b.scrollIntoView({ block: 'nearest' }); const cr = c.getBoundingClientRect(), r = b.getBoundingClientRect(); return { dentro: r.top >= cr.top - 1 && r.bottom <= cr.bottom + 1, h: r.height } })
    if (!watch) erros.push('sem botão Watch na última partida'); else if (!watch.dentro || watch.h < 44) erros.push(`Watch da última partida: dentro=${watch.dentro} altura=${watch.h}`)
    if (erros.length) { falhas.push(`${nome}: ${erros.join('; ')}`); console.log('FALHA: ' + falhas.at(-1)) } else console.log(`  ok: ${nome} tudo alcançável`)
    await page.screenshot({ path: path.join(process.env.FOTOS_H11 || os.tmpdir(), `perfil-5-${w}x${h}.png`) })
    await ctx.close()
  }
  await s.fechar?.()
}
await browser.close(); srv.close()
if (falhas.length) { console.log(`\n${falhas.length} falha(s)`); process.exit(1) }
console.log('\ntudo ok'); process.exit(0)
