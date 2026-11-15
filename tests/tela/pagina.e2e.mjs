// Frayz — teste da PÁGINA DE TESTE: o jogo servido como arquivos parados, a partir da raiz do repositório, dentro de uma SUBPASTA
// (como num domínio de hospedagem estática: https://exemplo/algum-nome/). Sobe um servidor de arquivos próprio (http do Node, sem server/dev.mjs),
// abre /algum-nome/ e confere: chega ao jogo; zero pedido com 404; zero erro no console; uma luta livre abre e uma carta é jogada;
// as folhas sons.html, arte.html e pecas.html abrem sem 404; o manifesto de som carrega; a página só pede arquivos de public/ e shared/.
// Celular 360 e PC 1280.
// Rode pela trava:  node tools/trava-robos.mjs rodar "node tests/tela/pagina.e2e.mjs"   (npm run e2e:pagina)
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { iniciar } from '../../server/dev.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SUB = '/algum-nome/'
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' }
const TIME = ['pisoteador', 'desfiado', 'assombrado']

const falhas = []
const falha = (m) => { falhas.push(m); console.log('FALHA: ' + m) }
const confere = (ok, m) => { if (!ok) falha(m); else console.log('  ok: ' + m) }

// servidor de arquivos parados: tudo sob /algum-nome/ vem da raiz do repositório; sem redirecionamento, sem nada de servidor
const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local')
  let p
  try { p = decodeURIComponent(url.pathname) } catch { res.writeHead(400); return res.end() }
  if (!p.startsWith(SUB)) { res.writeHead(404); return res.end('fora da subpasta') }
  let rel = p.slice(SUB.length)
  if (rel === '' || rel.endsWith('/')) rel += 'index.html'
  const alvo = path.resolve(RAIZ, rel)
  if (!alvo.startsWith(RAIZ + path.sep)) { res.writeHead(403); return res.end() }
  try {
    const dados = await readFile(alvo)
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    res.end(dados)
  } catch { res.writeHead(404); res.end('Não encontrado') }
})
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${servidor.address().port}`
const browser = await chromium.launch()

function vigiar(page, erros, ruins) {
  page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()) })
  page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
  page.on('response', (r) => { if (r.status() >= 400) ruins.push(`${r.status()} ${r.url()}`) })
  page.on('requestfailed', (r) => ruins.push(`falhou ${r.url()}`))
}

async function rodar(fmt) {
  console.log(`\n=== ${fmt.nome} (${fmt.w}x${fmt.h}) ===`)
  const ctx = await browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1 })
  const erros = [], ruins = []
  const clique = async (page, sel) => (fmt.toque ? page.locator(sel).first().tap() : page.locator(sel).first().click())

  // ---- 1. a entrada da subpasta chega ao jogo
  const page = await ctx.newPage(); vigiar(page, erros, ruins)
  await page.goto(base + SUB)
  await page.waitForSelector('#abaInicio', { timeout: 20000 })
  // tarefa 21 (regra nova: primeira abertura): na 1ª vez o primeiro boneco chega num casulo; abre tudo e segue para a fase 1
  await page.waitForSelector('#casulo:not([hidden])', { timeout: 20000 })
  confere(/primeiro boneco/.test(await page.locator('#casTit').textContent()), 'primeira abertura: o primeiro boneco chega num casulo')
  await clique(page, '#btnCasTudo')
  await page.waitForSelector('#btnCasFim:not([hidden])', { timeout: 20000 })
  await clique(page, '#btnCasFim')
  await page.waitForSelector('#aventura:not([hidden])', { timeout: 20000 })
  await clique(page, '#abaInicio')
  await page.waitForSelector('.ficha', { timeout: 20000 })
  confere(page.url().startsWith(base + SUB + 'public/'), 'a raiz da subpasta leva ao jogo em ' + page.url().replace(base, ''))
  confere((await page.locator('.ficha').count()) === 9, 'tela inicial mostra os 9 bonecos prontos')
  const fontes = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === 'loaded').length })
  confere(fontes > 0, `fontes do jogo carregadas (${fontes})`)

  // ---- 2. luta livre abre (sem gancho de teste)
  for (const id of TIME) await clique(page, `.ficha[data-id=${id}]`)
  await clique(page, '#btnLutar')
  await page.waitForSelector('#luta:not([hidden])', { timeout: 20000 })
  await page.waitForSelector('#mao .fz-carta', { timeout: 20000 })
  confere(true, 'a luta livre abriu com a mão de cartas')

  // ---- 3. uma carta pode ser jogada (modo de teste, para ler a sugestão do motor)
  const pj = await ctx.newPage(); vigiar(pj, erros, ruins)
  await pj.goto(`${base}${SUB}public/?teste=1&semente=pag-a&vel=0.12`)
  await pj.waitForSelector('.ficha')
  for (const id of TIME) await clique(pj, `.ficha[data-id=${id}]`)
  await clique(pj, '#btnLutar')
  await pj.waitForSelector('#luta:not([hidden])')
  const livre = () => pj.waitForFunction(() => window.__frayz.livre() || window.__frayz.acabou(), null, { timeout: 60000 })
  await livre()
  let jogou = false
  for (let i = 0; i < 6 && !jogou; i++) {
    const cmd = await pj.evaluate(() => window.__frayz.sugestao())
    if (cmd?.tipo !== 'jogar') { await clique(pj, '#btnPassar'); await livre(); continue }
    const carta = pj.locator(`#mao .fz-carta[data-mao="${cmd.carta}"]`)
    if (fmt.toque) { await carta.tap({ position: { x: 12, y: 40 } }); await pj.locator('.fz-lupa__jogar').tap() } else await carta.click({ position: { x: 20, y: 60 } })
    await pj.waitForFunction((cid) => window.__frayz.S.sel === cid || !window.__frayz.livre(), cmd.carta, { timeout: 5000 })
    if (await pj.evaluate((cid) => window.__frayz.S.sel === cid, cmd.carta)) {
      if (cmd.alvo) {
        const pos = await pj.evaluate((id) => window.__frayz.pagina(id), cmd.alvo)
        if (fmt.toque) await pj.touchscreen.tap(pos.x, pos.y); else await pj.mouse.click(pos.x, pos.y)
      } else if (fmt.toque) await pj.locator('.fz-lupa__jogar').tap()
      else await carta.click({ position: { x: 20, y: 60 } })
    }
    jogou = await pj.waitForFunction(() => window.__frayz.Som.registro.some((x) => x[0] === 'cartaJogada'), null, { timeout: 8000 }).then(() => true, () => false)
  }
  confere(jogou, 'uma carta foi jogada e o motor respondeu (som cartaJogada)')

  // ---- 4. folhas e manifesto de som
  for (const f of ['sons.html', 'arte.html', 'pecas.html']) {
    const pf = await ctx.newPage(); vigiar(pf, erros, ruins)
    const r = await pf.goto(`${base}${SUB}public/${f}`)
    await pf.waitForTimeout(f === 'arte.html' ? 2500 : 1200)
    confere(r.status() === 200, `public/${f} abre (${r.status()})`)
    await pf.close()
  }
  const m = await page.evaluate(async () => { const r = await fetch(new URL('sons/manifesto.json', location.href)); return { s: r.status, j: await r.json().catch(() => null) } })
  confere(m.s === 200 && !!m.j && typeof m.j === 'object', 'o manifesto de som carrega (public/sons/manifesto.json)')
  const mm = await page.evaluate(async () => { const som = await import('./js/som.js'); const x = await som.carregarManifesto(); return x && x.efeitos ? Object.keys(x.efeitos).length : -1 }).catch(() => -2)
  confere(mm >= 0, `som.js lê o manifesto pelo caminho relativo (${mm} efeitos)`)

  // ---- 5. só public/ e shared/ são pedidos
  const fora = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => new URL(e.name).pathname).filter((p) => !/\/(public|shared)\//.test(p)))
  confere(fora.length === 0, 'a página só pede arquivos de public/ e shared/' + (fora.length ? ' → ' + fora.slice(0, 4).join(', ') : ''))
  confere(ruins.length === 0, 'zero pedido com 404 ou falha' + (ruins.length ? ' → ' + ruins.slice(0, 5).join(' | ') : ''))
  confere(erros.length === 0, 'zero erro no console' + (erros.length ? ' → ' + erros.slice(0, 5).join(' | ') : ''))
  await ctx.close()
}

// server/dev.mjs (porta 4700 em uso normal) serve o mesmo desenho de pastas: `/` e endereços antigos redirecionam; nada de docs/, server/, tests/, .git, .claude
async function conferirDev() {
  console.log('\n=== server/dev.mjs ===')
  const dev = await iniciar({ porta: 0 })
  const pega = async (p) => { const r = await fetch(`http://127.0.0.1:${dev.address().port}${p}`, { redirect: 'manual' }); return { s: r.status, l: r.headers.get('location') } }
  const r1 = await pega('/'); confere(r1.s === 302 && r1.l === '/public/', '/ redireciona para /public/')
  const r2 = await pega('/arte.html?x=1'); confere(r2.s === 302 && r2.l === '/public/arte.html?x=1', '/arte.html?x=1 redireciona para /public/arte.html?x=1')
  for (const ok of ['/public/index.html', '/shared/config.js', '/index.html']) confere((await pega(ok)).s === 200, `${ok} é servido`)
  for (const no of ['/docs/decisions.md', '/server/dev.mjs', '/tests/tela/pagina.e2e.mjs', '/.git/config', '/.claude/EQUIPE.md', '/package.json', '/public/%2e%2e/package.json', '/shared/..%2fserver/dev.mjs'])
    confere((await pega(no)).s === 404, `${no} é recusado (404)`)
  dev.close()
}

try {
  await conferirDev()
  await rodar({ nome: 'celular', w: 360, h: 740, toque: true })
  await rodar({ nome: 'pc', w: 1280, h: 720, toque: false })
} catch (e) { falha('exceção: ' + (e?.stack || e)) }
await browser.close()
servidor.close()
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nPÁGINA DE TESTE: tudo verde')
process.exit(falhas.length ? 1 : 0)
