// Frayz — fotos de conferência do ENCAIXE (tarefa 11): 6 fotos PEQUENAS (densidade 1, largura ≤ 1280) em tests/tela/fotos/encaixe/.
//   luta-pc (1280×720) · luta-celular (360×740) · time-pc · vitoria-pc · derrota-celular · costura-pc
// Joga de verdade pelo gancho de teste (?teste=1): só tira as fotos e confere que nenhuma passou de 400 KB.
// Rode pela trava de um robô por vez:  node tools/trava-robos.mjs rodar "node tests/tela/fotos-encaixe.e2e.mjs"
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { iniciar } from '../../server/dev.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const PASTA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fotos', 'encaixe')
fs.mkdirSync(PASTA, { recursive: true })
const TIME = ['pisoteador', 'desfiado', 'assombrado'], RIVAL = 'rasgao,cascudo,mudo'
const falhas = []
const confere = (ok, msg) => { if (!ok) { falhas.push(msg); console.log('FALHA: ' + msg) } else console.log('  ok: ' + msg) }

const servidor = await iniciar({ porta: 0 })
const base = `http://127.0.0.1:${servidor.address().port}`
const browser = await chromium.launch()
const PC = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }
const CEL = { viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }

async function foto(page, nome) {
  const arq = path.join(PASTA, nome + '.png')
  await page.screenshot({ path: arq })
  // foto pequena: 256 cores (PNG8) quando passa de 400 KB — precisa do ImageMagick ("convert"); sem ele a foto fica como saiu
  if (fs.statSync(arq).size > 400 * 1024) { try { execFileSync('convert', [arq, '-dither', 'None', '-colors', '256', 'PNG8:' + arq]) } catch { /* sem ImageMagick */ } }
  const kb = fs.statSync(arq).size / 1024
  confere(kb < 400, `foto ${nome}.png (${kb.toFixed(0)} KB)`)
}
async function abrir(opcoes, extra = '') {
  const ctx = await browser.newContext(opcoes), page = await ctx.newPage(), erros = []
  page.on('pageerror', (e) => erros.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()) })
  await page.goto(`${base}/?teste=1&semente=fotos-a&rival=${RIVAL}&vel=0.25${extra}`)
  return { ctx, page, erros }
}
/** Joga pelo planejador até a vez do jogador no turno pedido (ou até o fim). */
async function jogarAte(page, turno) {
  for (let i = 0; i < 300; i++) {
    await page.waitForFunction(() => window.__frayz.livre() || window.__frayz.acabou(), null, { timeout: 60000 })
    const e = await page.evaluate(() => ({ fim: window.__frayz.acabou(), turno: window.__frayz.estado().turno }))
    if (e.fim || (turno && e.turno >= turno)) return
    const c = await page.evaluate(() => window.__frayz.sugestao())
    if (!c || c.tipo !== 'jogar' || !c.alvo) { await page.locator('#btnPassar').click({ force: true }); continue }
    await page.locator(`#mao .fz-carta[data-mao="${c.carta}"]`).click({ position: { x: 20, y: 60 }, force: true }).catch(() => {})
    await page.waitForFunction((cid) => window.__frayz.S.sel === cid || !window.__frayz.livre(), c.carta, { timeout: 4000 }).catch(() => {})
    if (await page.evaluate((cid) => window.__frayz.S.sel === cid, c.carta)) { const pos = await page.evaluate((id) => window.__frayz.pagina(id), c.alvo); await page.mouse.click(pos.x, pos.y) }
  }
}
async function comecar(page, toque = false) {
  await page.waitForSelector('.ficha')
  for (const id of TIME) await (toque ? page.locator(`.ficha[data-id=${id}]`).first().tap() : page.locator(`.ficha[data-id=${id}]`).first().click())
}

try {
  // ---- time (PC): a escolha do time com os 3 escolhidos
  let { ctx, page, erros } = await abrir(PC)
  await comecar(page)
  await page.locator('input[name=robo][value=ganancioso]').check() // rival mais fraco: a foto da vitória sai mais cedo
  await page.evaluate(() => { document.querySelector('#inicio .ini-corpo').scrollTop = 0 })
  await page.waitForTimeout(400)
  await foto(page, 'time-pc')
  // ---- luta (PC): turno 4, uma carta escolhida com alvos acesos
  await page.locator('#btnLutar').click()
  await page.waitForSelector('#luta:not([hidden])')
  await jogarAte(page, 4)
  const c = await page.evaluate(() => window.__frayz.sugestao())
  if (c?.tipo === 'jogar') { await page.locator(`#mao .fz-carta[data-mao="${c.carta}"]`).click({ position: { x: 20, y: 60 } }); await page.mouse.move(640, 300) }
  await page.waitForTimeout(700)
  await foto(page, 'luta-pc')
  // ---- vitória (PC): joga até o fim; se perder, revanche até vencer (no máximo 4)
  for (let k = 0; k < 6; k++) {
    await jogarAte(page, null)
    await page.waitForSelector('#fim:not([hidden])', { timeout: 60000 })
    if (k === 5 || await page.evaluate(() => window.__frayz.estado().fim.vencedor === 'A')) break
    await page.locator('#btnRevanche').click(); await page.waitForSelector('#luta:not([hidden])')
  }
  await page.waitForTimeout(1300)
  await foto(page, 'vitoria-pc')
  confere(erros.length === 0, 'PC: nenhum erro no console' + (erros.length ? ' → ' + erros.slice(0, 3).join(' | ') : ''))
  await ctx.close()

  // ---- luta (celular): turno 3
  ;({ ctx, page, erros } = await abrir(CEL))
  await comecar(page, true)
  await page.locator('#btnLutar').tap()
  await page.waitForSelector('#luta:not([hidden])')
  await jogarAte(page, 3)
  await page.waitForTimeout(700)
  await foto(page, 'luta-celular')
  // ---- derrota (celular): os dois lados passam até o fim; se vencer, revanche (passando) até perder
  for (let k = 0; k < 4; k++) {
    await page.evaluate(() => window.__frayz.leque(0.1))
    await page.evaluate(() => window.__frayz.passarOsDois())
    await page.waitForSelector('#fim:not([hidden])', { timeout: 90000 })
    if (await page.evaluate(() => window.__frayz.estado().fim.vencedor === 'B')) break
    await page.locator('#btnRevanche').tap(); await page.waitForSelector('#luta:not([hidden])'); await page.waitForFunction(() => window.__frayz.livre(), null, { timeout: 60000 })
  }
  await page.waitForTimeout(1300)
  await foto(page, 'derrota-celular')
  confere(erros.length === 0, 'celular: nenhum erro no console' + (erros.length ? ' → ' + erros.slice(0, 3).join(' | ') : ''))
  await ctx.close()

  // ---- costura (PC): o casulo abrindo
  ;({ ctx, page, erros } = await abrir(PC, '&recomecar=1&aba=costura'))
  await page.waitForSelector('#costura:not([hidden])')
  await page.locator('#cosEscolha .mini-cartao[data-id=mordedor]').first().click()
  await page.locator('#cosEscolha .mini-cartao[data-id=pisoteador]').first().click()
  await page.waitForSelector('#cosChances')
  await page.locator('#btnCosturar').click()
  await page.waitForSelector('#casulo:not([hidden])')
  await page.locator('#casPartes .cas-parte[data-k="0"]').click()
  await page.waitForTimeout(500)
  await page.locator('#btnCasTudo').click()
  await page.waitForSelector('#casFilho:not([hidden])', { timeout: 20000 })
  await page.waitForTimeout(1200)
  await foto(page, 'costura-pc')
  confere(erros.length === 0, 'costura: nenhum erro no console' + (erros.length ? ' → ' + erros.slice(0, 3).join(' | ') : ''))
  await ctx.close()
} catch (e) { falhas.push(String(e)); console.log('FALHA: exceção: ' + (e?.stack ?? e).split('\n').slice(0, 4).join(' / ')) }
await browser.close(); servidor.close()
if (falhas.length) { console.log(`\nFALHOU: ${falhas.length}`); process.exit(1) }
console.log('\nFotos do encaixe: prontas em tests/tela/fotos/encaixe/')
