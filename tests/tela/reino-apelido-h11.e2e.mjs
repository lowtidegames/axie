// H11 (c): o nome mostrado é o que o SERVIDOR devolve. Se o aparelho guardou um nome velho (a conta foi renomeada em outra aba ou
// aparelho), o perfil mostra o nome novo e o que fica guardado no aparelho passa a ser o novo. Servidor de verdade, banco temporário.
// Rode pela trava:  node tools/trava-robos.mjs rodar "timeout 300 node tests/tela/reino-apelido-h11.e2e.mjs"
import { createRequire } from 'node:module'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const { iniciar } = await import('../../server/index.mjs')
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'keepmile-apelido-'))
const folga = { pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 100_000, janelaMs: 60_000 }, contasPorIp: { max: 1000, janelaMs: 60_000 } }
const s = await iniciar({ dbPath: path.join(pasta, 'a.db'), porta: 0, log: () => {}, limites: folga })
const conta = await (await fetch(`http://127.0.0.1:${s.porta}/api/conta`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apelido: 'Nome Novo' }) })).json()
const falhas = []
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })
await ctx.addInitScript((x) => { if (!sessionStorage.getItem('ja')) { localStorage.setItem('keepmile_sessao_v1', x); sessionStorage.setItem('ja', '1') } }, JSON.stringify({ token: conta.token, apelido: 'Nome Velho' }))
const page = await ctx.newPage()
const erros = []; page.on('pageerror', (e) => erros.push(e.message))
await page.goto(`http://127.0.0.1:${s.porta}/public/reino/`)
await page.locator('[id="bt-menu"]').waitFor({ timeout: 20000 })
await page.locator('[id="bt-menu"]').click(); await page.locator('#mLiga').click({ timeout: 8000 })
await page.locator('#perfilTopo').waitFor({ timeout: 8000 })
const topo = await page.locator('#perfilTopo').textContent()
if (!topo.includes('Nome Novo') || topo.includes('Nome Velho')) falhas.push(`o perfil mostra "${topo.trim()}" em vez do nome do servidor`)
const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('keepmile_sessao_v1')).apelido)
if (guardado !== 'Nome Novo') falhas.push(`o aparelho guardou "${guardado}" em vez de "Nome Novo"`)
// o menu (e o "este é você" do ranking) usam o mesmo nome: ao voltar para o menu ele já é o novo
await page.locator('#telaPe').click(); await page.locator('#mLiga').waitFor({ timeout: 8000 })
const menu = await page.locator('#mLiga').textContent()
if (!menu.includes('Nome Novo') || menu.includes('Nome Velho')) falhas.push(`o menu mostra "${menu.trim()}"`)
if (erros.length) falhas.push('erro de console: ' + erros[0])
await browser.close(); await s.fechar?.()
if (falhas.length) { for (const f of falhas) console.log('FALHA: ' + f); process.exit(1) }
console.log('tudo ok'); process.exit(0)
