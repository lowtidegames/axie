// Piloto (monstros elementais) — teste de tela da página separada public/piloto/, servida como arquivos parados numa SUBPASTA
// (como a página de teste). Celular 360×740 (toque) e PC 1280×720. Confere: abre no mapa; monta o time (troca de posição, ordem,
// Off, tática); luta até o fim em 4×; Skip; mesma semente = mesmo resultado; Pause para; nada cortado nem sobreposto; toque ≥ 44 px;
// "Reduced motion" sem tremida nem flash (e com ele desligado: tremida ≤ 6 px, flash ≤ 3/s); cena do ovo até o fim; zero erro de
// console, zero 404, só pede arquivos de public/ e shared/. Tira as fotos em tests/tela/fotos/piloto/.
// Rode pela trava:  node tools/trava-robos.mjs rodar "timeout 700 node tests/tela/piloto.e2e.mjs"
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const FOTOS = path.join(RAIZ, 'tests', 'tela', 'fotos', 'piloto')
const SUB = '/algum-nome/'
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2' }

const falhas = []
const falha = (m) => { falhas.push(m); console.log('FALHA: ' + m) }
const confere = (ok, m) => { if (!ok) falha(m); else console.log('  ok: ' + m) }

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
const base = `http://127.0.0.1:${servidor.address().port}${SUB}public/piloto/`
await mkdir(FOTOS, { recursive: true })
const browser = await chromium.launch()

function vigiar(page, erros, ruins) {
  page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()) })
  page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
  page.on('response', (r) => { if (r.status() >= 400) ruins.push(`${r.status()} ${r.url()}`) })
  page.on('requestfailed', (r) => ruins.push(`falhou ${r.url()}`))
}

async function foto(page, nome) {
  const arq = path.join(FOTOS, nome + '.png')
  await page.screenshot({ path: arq })
  const kb = (await stat(arq)).size / 1024
  confere(kb < 400, `foto ${nome}.png com ${kb.toFixed(0)} KB (< 400)`)
}

/** Nada cortado nem sobreposto na tela visível; toque ≥ 44 px. */
async function conferirLayout(page, onde) {
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const vis = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden]') }
    const out = { rolagem: document.documentElement.scrollWidth - vw, pequenos: [], cortados: [], sobrepostos: [], fora: [] }
    const bts = [...document.querySelectorAll('button')].filter(vis).filter((b) => !b.closest('.b-fim[hidden]'))
    for (const b of bts) {
      const q = b.getBoundingClientRect()
      if (q.width < 44 - 0.5 || q.height < 44 - 0.5) out.pequenos.push(`${b.id || b.className || b.textContent.trim()} ${q.width.toFixed(0)}×${q.height.toFixed(0)}`)
      if (b.scrollWidth > b.clientWidth + 1) out.cortados.push(b.id || b.textContent.trim())
      if (q.right > vw + 0.5 || q.left < -0.5) out.fora.push(b.id || b.textContent.trim())
    }
    const caixas = bts.map((b) => ({ b, q: b.getBoundingClientRect() })).filter(({ b }) => !b.closest('.b-fim') || !document.querySelector('.b-fim[hidden]'))
    for (let i = 0; i < caixas.length; i++) for (let j = i + 1; j < caixas.length; j++) {
      const a = caixas[i].q, c = caixas[j].q
      if (caixas[i].b.contains(caixas[j].b) || caixas[j].b.contains(caixas[i].b)) continue
      const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left), iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)
      // a barra do "Fight" fica presa embaixo e passa POR CIMA da lista (de propósito); o fundo do fim cobre a luta
      const fixo = (b) => b.closest('.t-lutar') || b.closest('.b-fim')
      if (ix > 1 && iy > 1 && !fixo(caixas[i].b) && !fixo(caixas[j].b)) out.sobrepostos.push(`${caixas[i].b.id || caixas[i].b.textContent.trim().slice(0, 14)} × ${caixas[j].b.id || caixas[j].b.textContent.trim().slice(0, 14)}`)
    }
    for (const el of document.querySelectorAll('h2, h3, .b-faixa b, .b-nums b, .t-ficha > b, .o-nomeparcial b')) if (vis(el) && el.scrollWidth > el.clientWidth + 1) out.cortados.push(el.textContent.trim())
    return out
  })
  confere(r.rolagem <= 0, `${onde}: sem rolagem para o lado (${r.rolagem})`)
  confere(r.pequenos.length === 0, `${onde}: todo botão com toque ≥ 44 px` + (r.pequenos.length ? ' → ' + r.pequenos.slice(0, 4).join(', ') : ''))
  confere(r.cortados.length === 0, `${onde}: nada cortado` + (r.cortados.length ? ' → ' + r.cortados.slice(0, 4).join(', ') : ''))
  confere(r.sobrepostos.length === 0, `${onde}: nenhum botão sobreposto` + (r.sobrepostos.length ? ' → ' + r.sobrepostos.slice(0, 4).join(', ') : ''))
  confere(r.fora.length === 0, `${onde}: nenhum botão fora da tela` + (r.fora.length ? ' → ' + r.fora.slice(0, 4).join(', ') : ''))
}

async function abrir(ctx, erros, ruins, q = '') {
  const page = await ctx.newPage(); vigiar(page, erros, ruins)
  await page.goto(base + q)
  await page.waitForFunction(() => window.__piloto?.pronto, null, { timeout: 20000 })
  return page
}

async function rodar(fmt) {
  console.log(`\n=== ${fmt.nome} (${fmt.w}x${fmt.h}) ===`)
  const ctx = await browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
  const erros = [], ruins = []
  const clique = async (page, sel) => (fmt.toque ? page.locator(sel).first().tap() : page.locator(sel).first().click())
  const pc = !fmt.toque

  // ---- 1. abre no mapa (subpasta); só o 1º lugar leva à luta
  const page = await abrir(ctx, erros, ruins)
  confere(await page.isVisible('#mapa'), 'abre na tela Map')
  confere((await page.locator('#mLista .m-item').count()) === 5, 'mapa com os 5 lugares')
  const nomes = await page.locator('#mLista b').allTextContents()
  confere(['Hearthfield', 'Millbrook', 'Thornwood Edge', 'Stonebridge Watch', 'Crownhold Keep'].every((n, i) => nomes[i]?.includes(n)), 'nomes dos lugares: ' + nomes.join(' | '))
  await clique(page, '#mLista .m-item[data-i="2"]')
  confere(/coming soon/i.test(await page.locator('#mAviso').textContent()), 'lugar 3: "coming soon"')
  await conferirLayout(page, 'Map')
  if (pc) await foto(page, 'map-pc')
  await clique(page, '#mLista .m-item[data-i="0"]')
  await page.waitForSelector('#time:not([hidden])')

  // ---- 2. Team: rival à vista, roda, troca de posição por toque, ordem, Off, tática
  confere((await page.locator('#tRivais .t-rival-mon').count()) === 3, 'trio rival à vista (3)')
  const rivais = await page.locator('#tRivais b').allTextContents()
  confere(rivais.join(',') === 'Burrlet,Wispurr,Ripplance', 'rival: ' + rivais.join(', '))
  confere((await page.locator('#tRoda .roda__el').count()) === 6 && (await page.locator('#tFrases li').count()) === 6, 'roda dos 6 elementos com as frases')
  const trio0 = await page.locator('#tSlots .t-ficha > b').allTextContents()
  confere(trio0.join(',') === 'Cobblepup,Snapcoal,Breezle', 'trio do jogador: ' + trio0.join(', '))
  await conferirLayout(page, 'Team')
  if (pc) await foto(page, 'team-pc'); else await foto(page, 'team-celular')
  await clique(page, '#tSlots .t-slot[data-pos="0"] .t-mon')
  await clique(page, '#tSlots .t-slot[data-pos="2"] .t-mon')
  const trio1 = await page.locator('#tSlots .t-ficha > b').allTextContents()
  confere(trio1.join(',') === 'Breezle,Snapcoal,Cobblepup', 'tocar dois troca Front e Back: ' + trio1.join(', '))
  if (pc) { // arrastar (mouse) troca também
    const a = await page.locator('#tSlots .t-slot[data-pos="0"] .t-mon').boundingBox(), b = await page.locator('#tSlots .t-slot[data-pos="2"] .t-mon').boundingBox()
    await page.mouse.move(a.x + 40, a.y + 40); await page.mouse.down(); await page.mouse.move(a.x + 80, a.y + 60, { steps: 4 }); await page.mouse.move(b.x + 40, b.y + 40, { steps: 6 }); await page.mouse.up()
    const trio2 = await page.locator('#tSlots .t-ficha > b').allTextContents()
    confere(trio2.join(',') === 'Cobblepup,Snapcoal,Breezle', 'arrastar troca de volta: ' + trio2.join(', '))
  } else { await clique(page, '#tSlots .t-slot[data-pos="0"] .t-mon'); await clique(page, '#tSlots .t-slot[data-pos="2"] .t-mon') }
  const hab = '#tSlots .t-slot[data-pos="1"] .t-hab li'
  const ordem0 = await page.locator(hab).evaluateAll((l) => l.map((x) => x.dataset.carta))
  await clique(page, `${hab} >> nth=0 >> [data-acao="desce"]`)
  const ordem1 = await page.locator(hab).evaluateAll((l) => l.map((x) => x.dataset.carta))
  confere(ordem1[0] === ordem0[1] && ordem1[1] === ordem0[0], 'tocar ▼ desce a habilidade: ' + ordem1.join(' > '))
  await clique(page, `${hab} >> nth=2 >> [data-acao="liga"]`)
  confere((await page.locator(`${hab}.off`).count()) === 1, 'tocar On/Off desliga a habilidade (Off)')
  await clique(page, `${hab} >> nth=2 >> [data-acao="liga"]`)
  confere((await page.locator(`${hab}.off`).count()) === 0, 'e liga de novo')
  await clique(page, '.t-tat[data-t="focus"]')
  confere((await page.getAttribute('.t-tat[data-t="focus"]', 'aria-checked')) === 'true', 'tática Focus escolhida')
  confere(/decided when the fight starts/.test(await page.locator('#time .decidido').textContent()), 'linha "The result is decided when the fight starts."')

  // ---- 3. luta em 4× até o fim; Pause para; tremida e flash dentro do limite
  await page.evaluate(() => { const u = new URL(location.href); u.searchParams.set('semente', 'e2e-a'); history.replaceState(null, '', u) })
  // a semente vem da URL só ao carregar: recarrega com a semente e refaz o time padrão (com Focus)
  const p2 = await abrir(ctx, erros, ruins, '?cena=time&semente=e2e-a')
  await clique(p2, '#btLutar')
  await p2.waitForSelector('#luta:not([hidden])')
  confere(!!(await p2.evaluate(() => window.__piloto.luta?.resultado)), 'o resultado já existe quando a luta começa (decidido no início)')
  await p2.waitForFunction(() => window.__piloto.batalha().passo >= 2, null, { timeout: 20000 })
  await p2.waitForSelector('.b-pop', { timeout: 20000 })
  if (pc) await foto(p2, 'battle-pc'); else await foto(p2, 'battle-celular')
  await clique(p2, '#bPausa')
  const pa = await p2.evaluate(() => window.__piloto.batalha().passo)
  await p2.waitForTimeout(1500)
  const pb = await p2.evaluate(() => window.__piloto.batalha().passo)
  confere(pa === pb && (await p2.evaluate(() => window.__piloto.batalha().pausado)), `Pause para a luta (passo ${pa} → ${pb})`)
  await conferirLayout(p2, 'Battle')
  await clique(p2, '#bPausa')
  await clique(p2, '[data-vel="4"]')
  const t0 = Date.now()
  await p2.waitForSelector('#bFim:not([hidden])', { timeout: 120000 })
  const seg = (Date.now() - t0) / 1000
  const total = await p2.evaluate(() => window.__piloto.batalha())
  confere(total.acabou && total.passo === total.total - 1, `luta em 4× chegou ao fim (${total.total} passos, ${seg.toFixed(1)} s)`)
  confere(await p2.evaluate(() => localStorage.getItem('piloto_vel') === '4'), 'velocidade 4× guardada')
  const r1 = await p2.evaluate(() => JSON.stringify(window.__piloto.luta.resultado))
  const fim1 = await p2.locator('#bFimTit').textContent()
  const venceu = JSON.parse(r1).vencedor === 'A'
  confere(fim1 === (venceu ? 'Victory!' : 'Defeat'), `tela de fim = resultado do motor (${fim1})`)
  confere((await p2.locator('.b-nums b').count()) === 3, 'tela de fim com 3 números')
  const tm = await p2.evaluate(() => window.__piloto.tremidaMax)
  confere(tm <= 6, `tremida ≤ 6 px (${tm})`)
  const fl = await p2.evaluate(() => window.__piloto.flashes())
  const rapido = fl.some((t, i) => i > 0 && t - fl[i - 1] < 333)
  confere(!rapido, `flash ≤ 3 por segundo (${fl.length} flashes)`)
  await conferirLayout(p2, 'Fim da luta')

  // ---- 4. mesma semente → mesmo resultado; Skip mostra o fim
  const p3 = await abrir(ctx, erros, ruins, '?cena=time&semente=e2e-a')
  await clique(p3, '.t-tat[data-t="focus"]')
  await clique(p3, '#btLutar')
  await p3.waitForFunction(() => window.__piloto.batalha()?.passo >= 0, null, { timeout: 20000 })
  await clique(p3, '#bPular')
  await p3.waitForSelector('#bFim:not([hidden])', { timeout: 20000 })
  const r2 = await p3.evaluate(() => JSON.stringify(window.__piloto.luta.resultado))
  confere(r1 === r2, 'mesma semente e mesmo time → mesmo resultado (' + r1 + ')')
  confere((await p3.locator('#bFimTit').textContent()) === fim1, 'Skip mostra o mesmo fim')
  await clique(p3, '#bTrocar')
  confere(await p3.isVisible('#time'), '"Change team" volta ao Team')
  await p3.close(); await p2.close()

  // ---- 5. Reduced motion: sem tremida e sem flash
  const p4 = await abrir(ctx, erros, ruins, '?cena=time&semente=e2e-b')
  await clique(p4, '#btMenos')
  confere((await p4.getAttribute('#btMenos', 'aria-pressed')) === 'true', 'botão Reduced motion liga')
  await clique(p4, '#btLutar')
  await clique(p4, '[data-vel="4"]')
  await p4.waitForSelector('#bFim:not([hidden])', { timeout: 120000 })
  confere((await p4.evaluate(() => window.__piloto.tremidaMax)) === 0, 'Reduced motion: nenhuma tremida')
  confere((await p4.evaluate(() => window.__piloto.flashes().length)) === 0, 'Reduced motion: nenhum flash')
  await clique(p4, '#btMenos')
  await p4.close()

  // ---- 6. PC: fotos de Sundown e de vitória (semente com vitória e luta longa)
  if (pc) {
    const p5 = await abrir(ctx, erros, ruins, '?cena=time&semente=h')
    await clique(p5, '#btLutar')
    await clique(p5, '[data-vel="4"]')
    await p5.waitForFunction(() => window.__piloto.batalha().turno >= 9, null, { timeout: 120000 })
    await p5.waitForTimeout(900)
    confere(/Sundown/.test(await p5.locator('#bSol').textContent()), 'Sundown aparece do turno 9 em diante')
    await foto(p5, 'battle-sundown-pc')
    await clique(p5, '#bPular')
    await p5.waitForSelector('#bFim:not([hidden])', { timeout: 20000 })
    if ((await p5.locator('#bFimTit').textContent()) === 'Victory!') await foto(p5, 'victory-pc')
    else falha('a semente "h" devia dar vitória para a foto victory-pc')
    await p5.close()
  }

  // ---- 7. Egg: chances antes, revelação em 5 passos (toque e auto), nome, segredos, para o time
  const p6 = await abrir(ctx, erros, ruins, '?cena=ovo&ovo=e2e-ovo')
  confere(await p6.isDisabled('#oBreed'), 'sem dois pais, não bota o ovo')
  await clique(p6, '.o-pai >> nth=0')
  await clique(p6, '.o-pai >> nth=1')
  const chances = await p6.locator('#oChances .o-linha').count()
  const pcts = await p6.locator('#oChances em').allTextContents()
  confere(chances === 5 && pcts.length >= 5 && pcts.every((x) => /%$/.test(x)), `chances das 5 partes à vista antes de confirmar (${pcts.slice(0, 4).join(' ')})`)
  await conferirLayout(p6, 'Egg (escolha)')
  await clique(p6, '#oBreed')
  await p6.waitForSelector('#oCena:not([hidden])')
  for (let i = 0; i < 2; i++) { await clique(p6, '#oProximo'); await p6.waitForTimeout(250) }
  confere((await p6.evaluate(() => window.__piloto.ovo().passo)) === 2, 'tocar revela passo a passo (mark, legs)')
  confere((await p6.locator('#oCartas li').count()) === 2 && /Mark:/.test(await p6.locator('#oCartas li >> nth=0').textContent()), 'o cartão da parte aparece com a origem')
  if (!pc) await foto(p6, 'egg-celular')
  await clique(p6, '#oAuto')
  await p6.waitForFunction(() => window.__piloto.ovo().fase === 'fim', null, { timeout: 20000 })
  const nome = await p6.locator('#oNome').textContent()
  confere(/^[A-Z][a-z]+-[A-Z][a-z]+-[A-Z][a-z]+$/.test(nome), 'filhote nasce com nome pelos apelidos: ' + nome)
  confere((await p6.locator('#oCartas li').count()) === 5, 'as 5 partes reveladas (mark, legs, arms, head, body)')
  await clique(p6, '#oEspiar')
  confere((await p6.locator('#oSegredos li').count()) === 5, '"Peek hidden traits" mostra as 5 partes escondidas')
  await conferirLayout(p6, 'Egg (fim)')
  await p6.waitForTimeout(700)
  if (pc) await foto(p6, 'egg-pc')
  await clique(p6, '#oTime')
  await p6.waitForSelector('#time:not([hidden])')
  confere((await p6.locator('#tBancoLista .t-mon').count()) === 1, 'o filhote vai para o banco do time')
  await clique(p6, '#tBancoLista .t-mon')
  await clique(p6, '#tSlots .t-slot[data-pos="0"] .t-mon')
  confere((await p6.locator('#tSlots .t-ficha > b >> nth=0').textContent()) === nome, 'o filhote entra no trio')
  await clique(p6, '#btLutar')
  await clique(p6, '#bPular')
  await p6.waitForSelector('#bFim:not([hidden])', { timeout: 20000 })
  confere(true, 'o filhote luta (a luta chega ao fim)')
  await p6.close()

  // ---- 8. só public/ e shared/; zero 404; zero erro
  const pf = await abrir(ctx, erros, ruins)
  const fora = await pf.evaluate(() => performance.getEntriesByType('resource').map((e) => new URL(e.name)).filter((u) => u.protocol.startsWith('http')).map((u) => u.pathname).filter((p) => !/\/(public|shared)\//.test(p)))
  confere(fora.length === 0, 'a página só pede arquivos de public/ e shared/' + (fora.length ? ' → ' + fora.slice(0, 4).join(', ') : ''))
  confere(ruins.length === 0, 'zero pedido com 404 ou falha' + (ruins.length ? ' → ' + ruins.slice(0, 5).join(' | ') : ''))
  confere(erros.length === 0, 'zero erro no console' + (erros.length ? ' → ' + erros.slice(0, 5).join(' | ') : ''))
  await ctx.close()
}

try {
  await rodar({ nome: 'celular', w: 360, h: 740, toque: true })
  await rodar({ nome: 'pc', w: 1280, h: 720, toque: false })
} catch (e) { falha('exceção: ' + (e?.stack || e)) }
await browser.close()
servidor.close()
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nPILOTO: tudo verde')
process.exit(falhas.length ? 1 : 0)
