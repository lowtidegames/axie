// Porão — teste de tela (Chrome de verdade, modo falso: as regras rodam no navegador).
// Confere: 1º tapete em menos de 60 s desde abrir a página · celular 390×844 mostra um monitor por vez · borda acesa no
// monitor fora da vista · "Menos animação" sem tremida · sem erro no console · sem rolagem lateral.
// Fotos (opcional): PORAO_FOTOS=/pasta  node tools/trava-robos.mjs rodar "node porao/tests/tela.e2e.mjs"
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire('/opt/node-tools/node_modules/')
const { chromium } = require('playwright')
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' }
const FOTOS = process.env.PORAO_FOTOS || ''
const PAGINA = '/porao/tela/index.html?falso=1'

const falhas = []
const falha = (m) => { falhas.push(m); console.log('FALHA: ' + m) }
const confere = (ok, m) => { if (!ok) falha(m); else console.log('  ok: ' + m) }

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local')
  let p
  try { p = decodeURIComponent(url.pathname) } catch { res.writeHead(400); return res.end() }
  const arq = path.join(RAIZ, p)
  if (!arq.startsWith(RAIZ + path.sep)) { res.writeHead(403); return res.end() }
  try {
    const dados = await readFile(arq)
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'cache-control': 'no-store', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'" })
    res.end(dados)
  } catch { res.writeHead(404); res.end('não achei') }
})
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))
const BASE = `http://127.0.0.1:${servidor.address().port}`
if (FOTOS) await mkdir(FOTOS, { recursive: true })

const navegador = await chromium.launch()
const erros = []
let ultima = null

async function nova({ largura, altura, movel = false, menos = false }) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, isMobile: movel, hasTouch: movel, deviceScaleFactor: 1 })
  if (menos) await ctx.addInitScript(() => { try { localStorage.setItem('menos_animacao', '1') } catch { /* nada */ } })
  const page = await ctx.newPage(); ultima = page
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) erros.push(`[${largura}] console: ${m.text()}`) })
  page.on('pageerror', (e) => erros.push(`[${largura}] pageerror: ${e.message}`))
  page.on('requestfailed', (r) => erros.push(`[${largura}] pedido falhou: ${r.url()}`))
  page.on('response', (r) => { if (r.status() >= 400 && !/indice\.json/.test(r.url())) erros.push(`[${largura}] HTTP ${r.status()}: ${r.url()}`) })
  return { ctx, page }
}
const foto = async (page, nome) => { if (FOTOS) await page.screenshot({ path: path.join(FOTOS, nome + '.png') }) }
const q = (page, sel) => page.locator(sel).first()
const tela = (m) => `[data-pm-monitor="${m}"]`
const aba = (page, m, a) => q(page, `${tela(m)} [data-aba="${a}"]`).click()
const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1)

/** Imprime e lança a ideia (fluxo do jogador). Devolve quando o projeto está no ar. */
async function imprimirELancar(page) {
  await aba(page, 'projeto', 'impressora')
  await q(page, '[data-pm="imprimir"]').click()
  await q(page, '[data-pm="folha"][data-etapa="3"]').waitFor({ timeout: 8000 })
  await q(page, '[data-pm="lancar-agora"]').click()
  await q(page, '[data-pm="projeto"]').waitFor({ timeout: 8000 })
}
const esperarPuxar = async (page) => { await aba(page, 'grafico', 'grafico'); await page.waitForFunction(() => { const b = document.querySelector('[data-pm="puxar"]'); return b && !b.disabled }, null, { timeout: 15000 }) }

/** Puxa o tapete e devolve o maior deslocamento visto na cena. */
async function puxarEMedir(page, fotosNome) {
  await page.evaluate(() => {
    window.__tr = []
    window.__tim = setInterval(() => {
      const e = document.querySelector('.pm-tapete__palco')
      if (e) { const m = /translateX\((-?[\d.]+)px\)/.exec(e.style.transform || ''); window.__tr.push(m ? Math.abs(Number(m[1])) : 0) }
    }, 30)
  })
  await q(page, '[data-pm="puxar"]').click()
  if (fotosNome) {
    await page.waitForFunction(() => /desconfiou/.test(document.querySelector('.pm-tapete__legenda')?.textContent || ''), null, { timeout: 8000 }).catch(() => {})
    await foto(page, fotosNome + '-treme')
    await page.waitForFunction(() => /Puxou/.test(document.querySelector('.pm-tapete__legenda')?.textContent || ''), null, { timeout: 8000 }).catch(() => {})
    await foto(page, fotosNome + '-cai')
  }
  await q(page, '[data-pm="tapete-resumo"]').waitFor({ timeout: 15000 })
  const max = await page.evaluate(() => { clearInterval(window.__tim); return Math.max(0, ...window.__tr) })
  if (fotosNome) await foto(page, fotosNome + '-resumo')
  return max
}

try {
  // ===================== PC 1280×800: o 1º minuto e as fotos de cada monitor =====================
  console.log('PC 1280x800')
  {
    const { ctx, page } = await nova({ largura: 1280, altura: 800 })
    const t0 = Date.now()
    await page.goto(BASE + PAGINA)
    await foto(page, 'pc-00-porao')
    await q(page, '.cena__btn--primario').click()
    await q(page, '.cena__zoom--aberto').waitFor({ timeout: 5000 })
    await foto(page, 'pc-01-monitores-vazios')
    await aba(page, 'projeto', 'impressora')
    await q(page, '[data-pm="imprimir"]').click()
    await q(page, '[data-pm="folha"][data-etapa="1"]').waitFor({ timeout: 5000 })
    await page.waitForTimeout(500)
    await foto(page, 'pc-02-revelacao-folha-saindo')
    await q(page, '[data-pm="folha"][data-etapa="2"]').waitFor({ timeout: 5000 })
    await foto(page, 'pc-03-revelacao-raridade')
    await q(page, '[data-pm="folha"][data-etapa="3"]').waitFor({ timeout: 5000 })
    await foto(page, 'pc-04-revelacao-nome')
    await q(page, '[data-pm="lancar-agora"]').click()
    await q(page, '[data-pm="projeto"]').waitFor({ timeout: 8000 })
    await esperarPuxar(page)
    await foto(page, 'pc-05-grafico-previa')
    const max = await puxarEMedir(page, 'pc-06-tapete')
    const gasto = Date.now() - t0
    confere(gasto < 60000, `1º tapete em ${(gasto / 1000).toFixed(1)} s desde abrir a página (limite 60 s)`)
    confere(max > 0 && max <= 8, `tremida leve na cena do tapete (maior deslocamento ${max.toFixed(1)} px, limite 8)`)
    confere(await semRolagemLateral(page), 'PC: sem rolagem lateral')
    await q(page, '[data-pm="tapete-fechar"]').click()

    // 2ª rodada: parceria, celular, batida (o modo falso deixa mexer no estado só para a conferência)
    await page.evaluate(() => window.poraoApp.api.depurar((e) => { e.caixa = 5000; e.calor = 95; e.contagem.tapetes = 5 }))
    await page.waitForTimeout(3300)
    await imprimirELancar(page); await page.waitForTimeout(3300); await imprimirELancar(page)
    await foto(page, 'pc-07-projeto-no-ar')
    await esperarPuxar(page)
    await q(page, '[data-pm="celular-btn"]').click()
    await q(page, '[data-aba="cel-contratar"]').click()
    await foto(page, 'pc-08-celular-contratar')
    await q(page, '[data-pm="contratar"]:not([disabled])').click()
    await page.evaluate(() => window.poraoApp.api.depurar((e) => { const c = e.projetos.find((p) => p.contrato)?.contrato; if (c) { c.trazidasV1 = 999; c.esperaRestante = 0.2 } }))
    await q(page, '[data-pm="proposta"]').waitFor({ timeout: 8000 })
    await foto(page, 'pc-09-celular-pede-mais')
    await page.keyboard.press('Escape')
    confere(await q(page, '[data-pm="janela-celular"]').count() === 0, 'celular fecha com Esc')
    await q(page, '[data-pm="celular-btn"]').click()
    await q(page, '[data-pm="janela-x"]').click()
    confere(await q(page, '[data-pm="janela-celular"]').count() === 0, 'celular fecha no X')
    await q(page, '[data-pm="celular-btn"]').click()
    await page.mouse.click(5, 5)
    confere(await q(page, '[data-pm="janela-celular"]').count() === 0, 'celular fecha clicando fora')
    await aba(page, 'comunidade', 'chat')
    await foto(page, 'pc-10-comunidade-chat')
    await aba(page, 'comunidade', 'comunidade')
    await aba(page, 'grafico', 'caixa')
    await foto(page, 'pc-11-caixa')
    await aba(page, 'projeto', 'ideias')
    await foto(page, 'pc-12-ideias-album')
    await aba(page, 'projeto', 'porao')
    await foto(page, 'pc-13-luxos')
    await q(page, '[data-k="luxo-aquario"]').click()
    await aba(page, 'projeto', 'noar')
    await aba(page, 'grafico', 'grafico')
    await foto(page, 'pc-14-todos-monitores')
    await puxarEMedir(page, null)
    await q(page, '[data-pm="tapete-fechar"]').click()
    await q(page, '[data-pm="janela-batida"]').waitFor({ timeout: 5000 })
    await foto(page, 'pc-15-batida')
    confere(await q(page, '[data-pm="rebrand"]').isEnabled(), 'batida mostra a escolha de rebrand com o custo')
    await q(page, '[data-pm="rebrand"]').click()
    await q(page, '[data-pm="janela-batida"]').waitFor({ state: 'detached', timeout: 5000 })
    await foto(page, 'pc-16-depois-da-batida')
    await ctx.close()
  }

  // ===================== CELULAR 390×844: um monitor por vez, borda acesa =====================
  console.log('Celular 390x844')
  {
    const { ctx, page } = await nova({ largura: 390, altura: 844, movel: true })
    await page.goto(BASE + PAGINA)
    await foto(page, 'cel-00-porao')
    await q(page, '.cena__btn--primario').click()
    await q(page, '.cena__zoom--aberto').waitFor({ timeout: 5000 })
    const visiveis = () => page.evaluate(() => [...document.querySelectorAll('.cena__monitor')].filter((m) => { const r = m.getBoundingClientRect(); return r.left >= -2 && r.right <= window.innerWidth + 2 }).length)
    confere(await visiveis() === 1, 'celular: um monitor inteiro por vez na tela')
    await foto(page, 'cel-01-monitor1-vazio')
    await page.locator('.cena__ponto').nth(2).click()
    await page.waitForFunction(() => { const r = document.querySelector('[data-monitor="projeto"]').getBoundingClientRect(); return r.left >= -2 && r.right <= innerWidth + 2 }, null, { timeout: 5000 })
    confere(await visiveis() === 1, 'celular: ainda um monitor por vez depois de trocar')
    await aba(page, 'projeto', 'impressora')
    await q(page, '[data-pm="imprimir"]').click()
    await q(page, '[data-pm="folha"][data-etapa="1"]').waitFor({ timeout: 5000 })
    await page.waitForTimeout(500)
    await foto(page, 'cel-02-revelacao-saindo')
    await q(page, '[data-pm="folha"][data-etapa="2"]').waitFor({ timeout: 5000 })
    await foto(page, 'cel-03-revelacao-raridade')
    await q(page, '[data-pm="folha"][data-etapa="3"]').waitFor({ timeout: 5000 })
    await foto(page, 'cel-04-revelacao-nome')
    await q(page, '[data-pm="lancar-agora"]').click()
    await q(page, '[data-pm="projeto"]').waitFor({ timeout: 8000 })
    await foto(page, 'cel-05-projeto-no-ar')
    // fica no monitor 3; o gráfico (monitor 1) está fora da vista: a borda dele acende quando dá para puxar
    await page.waitForFunction(() => document.querySelector('[data-monitor="grafico"]').classList.contains('cena__monitor--aviso'), null, { timeout: 15000 })
    confere(true, 'celular: borda acesa no monitor fora da vista')
    confere(await page.locator('.cena__ponto').nth(0).evaluate((e) => e.classList.contains('pm-ponto-aviso')), 'celular: a bolinha do monitor com aviso também acende')
    await foto(page, 'cel-06-aviso-borda')
    await page.locator('.cena__ponto').nth(0).click()
    await page.waitForFunction(() => !document.querySelector('[data-monitor="grafico"]').classList.contains('cena__monitor--aviso'), null, { timeout: 5000 })
    confere(true, 'celular: o aviso apaga quando o monitor entra na vista')
    await foto(page, 'cel-07-grafico')
    confere(await semRolagemLateral(page), 'celular: sem rolagem lateral (monitor 1)')
    await puxarEMedir(page, 'cel-08-tapete')
    await q(page, '[data-pm="tapete-fechar"]').click()
    await aba(page, 'grafico', 'caixa')
    await foto(page, 'cel-09-caixa')
    await page.locator('.cena__ponto').nth(1).click()
    await page.waitForFunction(() => { const r = document.querySelector('[data-monitor="comunidade"]').getBoundingClientRect(); return r.left >= -2 && r.right <= innerWidth + 2 }, null, { timeout: 5000 })
    await foto(page, 'cel-10-comunidade')
    confere(await semRolagemLateral(page), 'celular: sem rolagem lateral (monitor 2)')
    await aba(page, 'comunidade', 'chat')
    await foto(page, 'cel-11-chat')
    await page.locator('.cena__ponto').nth(2).click()
    await page.waitForFunction(() => { const r = document.querySelector('[data-monitor="projeto"]').getBoundingClientRect(); return r.left >= -2 && r.right <= innerWidth + 2 }, null, { timeout: 5000 })
    await aba(page, 'projeto', 'ideias')
    await foto(page, 'cel-12-ideias')
    await aba(page, 'projeto', 'porao')
    await foto(page, 'cel-13-luxos')
    confere(await semRolagemLateral(page), 'celular: sem rolagem lateral (monitor 3)')
    // batida no celular
    await page.evaluate(() => window.poraoApp.api.depurar((e) => { e.caixa = 5000; e.calor = 96 }))
    await page.waitForTimeout(3300)
    await imprimirELancar(page); await page.waitForTimeout(3300); await imprimirELancar(page)
    await page.locator('.cena__ponto').nth(0).click()
    await esperarPuxar(page)
    await puxarEMedir(page, null)
    await q(page, '[data-pm="tapete-fechar"]').click()
    await q(page, '[data-pm="janela-batida"]').waitFor({ timeout: 5000 })
    await foto(page, 'cel-14-batida')
    const dentro = await page.evaluate(() => { const r = document.querySelector('.pm-janela__caixa').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight })
    confere(dentro, 'celular: a janela da batida cabe na tela')
    confere(await semRolagemLateral(page), 'celular: sem rolagem lateral (batida)')
    await q(page, '[data-pm="perder"]').click()
    await q(page, '[data-pm="janela-batida"]').waitFor({ state: 'detached', timeout: 5000 })
    await page.locator('.cena__ponto').nth(1).click()
    await foto(page, 'cel-15-depois-da-batida')
    await q(page, '[data-pm="celular-btn"]').click()
    await foto(page, 'cel-16-celular')
    await ctx.close()
  }

  // ===================== MENOS ANIMAÇÃO =====================
  console.log('Menos animação')
  {
    const { ctx, page } = await nova({ largura: 1280, altura: 800, menos: true })
    await page.goto(BASE + PAGINA)
    await q(page, '.cena__btn--primario').click()
    await q(page, '.cena__zoom--aberto').waitFor({ timeout: 5000 })
    await aba(page, 'projeto', 'impressora')
    const t1 = Date.now()
    await q(page, '[data-pm="imprimir"]').click()
    await q(page, '[data-pm="folha"][data-etapa="3"]').waitFor({ timeout: 5000 })
    confere(Date.now() - t1 < 1500, `Menos animação: revelação quase pronta (${Date.now() - t1} ms)`)
    await foto(page, 'menos-01-revelacao')
    await q(page, '[data-pm="lancar-agora"]').click()
    await q(page, '[data-pm="projeto"]').waitFor({ timeout: 8000 })
    await esperarPuxar(page)
    const t2 = Date.now()
    const max = await puxarEMedir(page, null)
    confere(max === 0, `Menos animação: sem tremida (maior deslocamento ${max} px)`)
    confere(Date.now() - t2 < 2000, 'Menos animação: o tapete já mostra o resumo na hora')
    await foto(page, 'menos-02-tapete')
    const trans = await page.evaluate(() => [...document.querySelectorAll('.pm-folha')].map((e) => getComputedStyle(e).transitionDuration))
    confere(trans.every((d) => /^0s(, 0s)*$/.test(d)), 'Menos animação: folha sem transição')
    await ctx.close()
  }

  confere(erros.length === 0, `sem erro no console nem pedido quebrado${erros.length ? ': ' + erros.slice(0, 5).join(' | ') : ''}`)
} catch (e) {
  falha('o robô quebrou: ' + (e && e.message))
  if (FOTOS && ultima) {
    await ultima.screenshot({ path: path.join(FOTOS, 'falha.png') }).catch(() => {})
    console.log('texto da tela: ' + await ultima.evaluate(() => document.body.innerText.slice(0, 700)).catch(() => ''))
  }
  console.log(String(e && e.stack).split('\n').slice(0, 6).join('\n'))
  if (erros.length) console.log('erros da página: ' + erros.slice(0, 5).join(' | '))
}
await navegador.close()
servidor.close()
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nteste de tela do Porão: verde')
process.exit(falhas.length ? 1 : 0)
