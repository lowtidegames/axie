// Piloto (idle por patrulhas) — teste de tela da página separada public/piloto/, servida como arquivos parados numa SUBPASTA
// (como a página de teste). Celular 360×740 (toque) e PC 1280×720. Confere: abre na Road (2 lugares abertos, 3 "coming soon",
// saco de Rations, mapa vivo); folha Patrol Orders (guarda, trio, troca por toque e arrasto, ícones "Strong vs / Weak to" que
// viram ao trocar monstro, tática, ordem das habilidades, avisos honestos, placar histórico); Send patrol gasta 5 Rations e
// mostra 1 luta + 4 carimbos + tira; mesma semente = mesmo resultado; a tentativa anterior fica ao lado da nova; ficha com
// título e Renome subindo; cartão PNG; Pause, 4×, Skip, Reduced motion sem tremida nem flash (e com ele desligado: tremida
// ≤ 6 px, flash ≤ 3/s); som só depois do 1º toque e mudo; cena do ovo até o fim com o filhote na conta; nada cortado nem
// sobreposto; toque ≥ 44 px; zero erro de console, zero 404, só pede arquivos de public/ e shared/. Fotos em tests/tela/fotos/piloto/.
// Rode pela trava:  node tools/trava-robos.mjs rodar "timeout 700 node tests/tela/piloto.e2e.mjs"
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
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
    const vis = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden]') && !el.closest('details:not([open]) > :not(summary)') }
    const out = { rolagem: document.documentElement.scrollWidth - vw, pequenos: [], cortados: [], sobrepostos: [], fora: [] }
    // com a ficha aberta, só ela conta (o fundo escuro cobre o resto)
    const ficha = document.querySelector('#gFundo:not([hidden])')
    const bts = [...(ficha ?? document).querySelectorAll('button')].filter(vis).filter((b) => !b.closest('.b-fim[hidden]'))
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
      // a barra do "Send patrol" fica presa embaixo e passa POR CIMA da folha (de propósito); o fundo do fim cobre a luta
      const fixo = (b) => b.closest('.t-lutar') || b.closest('.b-fim')
      if (ix > 1 && iy > 1 && !fixo(caixas[i].b) && !fixo(caixas[j].b)) out.sobrepostos.push(`${caixas[i].b.id || caixas[i].b.textContent.trim().slice(0, 14)} × ${caixas[j].b.id || caixas[j].b.textContent.trim().slice(0, 14)}`)
    }
    for (const el of (ficha ?? document).querySelectorAll('h2, h3, .b-faixa b, .b-nums b, .t-ficha > b, .o-nomeparcial b, .r-placar, .f-e, .f-hist b, .c-racoes, .c-renome')) if (vis(el) && el.scrollWidth > el.clientWidth + 1) out.cortados.push(el.textContent.trim())
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
const P = (page) => page.evaluate(() => window.__piloto.patrulha())
const C = (page) => page.evaluate(() => window.__piloto.conta())
const nomesDoTrio = (page) => page.locator('#tSlots .t-ficha > b').allTextContents()
const bordaDe = (page, pos) => page.evaluate((p) => { const s = document.querySelector(`#tSlots .t-slot[data-pos="${p}"]`); return s.querySelector('.f-edge').getAttribute('aria-label') + ' | ' + [...s.querySelectorAll('.f-pip')].map((x) => (x.classList.contains('on') ? 1 : 0)).join('') }, pos)

async function rodar(fmt) {
  console.log(`\n=== ${fmt.nome} (${fmt.w}x${fmt.h}) ===`)
  const ctx = await browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1, reducedMotion: 'no-preference', acceptDownloads: true })
  const erros = [], ruins = []
  const clique = async (page, sel) => (fmt.toque ? page.locator(sel).first().tap() : page.locator(sel).first().click())
  const pc = !fmt.toque
  const sufixo = pc ? 'pc' : 'celular'
  /** Manda a patrulha e leva até a tira final (pulando a luta e os carimbos). */
  const patrulhaRapida = async (page) => {
    await clique(page, '#btLutar')
    await page.waitForSelector('#luta:not([hidden])')
    await clique(page, '#bPular')
    await page.waitForSelector('#bFim:not([hidden])', { timeout: 20000 })
    await clique(page, '#bSeguir')
    await page.waitForSelector('#relato:not([hidden])')
    await clique(page, '#rPular')
    await page.waitForFunction(() => window.__piloto.patrulha().fase === 'fim', null, { timeout: 20000 })
    await page.waitForSelector('#rTiras:not([hidden])')
  }

  // ---- 1. abre na Road (subpasta): 2 lugares abertos, 3 "coming soon", Rations 20/20, mudo antes do 1º toque, mapa vivo
  const page = await abrir(ctx, erros, ruins)
  confere(await page.isVisible('#mapa'), 'abre na tela Road (a casa do piloto)')
  const som0 = await page.evaluate(() => window.__piloto.som())
  confere(!som0.destravado && !som0.ligado && som0.tocados === 0 && som0.musica === 0, 'nenhum som (nem música) antes do primeiro toque do jogador')
  confere((await page.locator('#mLista .m-item').count()) === 5, 'mapa com os 5 lugares')
  const nomes = await page.locator('#mLista b').allTextContents()
  // nomes: o dono mandou trocar "Hearthfield" (provisório agora: Hollyfield); os lugares abertos do piloto são o 2 e o 4 (medição do motor)
  confere(['Hollyfield', 'Millbrook', 'Thornwood Edge', 'Stonebridge Watch', 'Crownhold Keep'].every((n, i) => nomes[i]?.includes(n)), 'nomes dos lugares: ' + nomes.join(' | '))
  confere((await page.locator('#mLista .m-item.aberta').count()) === 2, 'dois lugares abertos à escolha')
  const guardasNaLista = await page.locator('#mLista .m-item.aberta').evaluateAll((l) => l.map((x) => x.querySelectorAll('.m-guarda img').length))
  confere(guardasNaLista.join(',') === '3,3', 'cada lugar aberto mostra os 3 ícones de elemento da guarda')
  confere((await page.locator('#mMarcas button.m-marca.aberta').count()) === 2 && (await page.locator('#mMarcas .m-marca.aberta em img').count()) === 6, 'no mapa: 2 marcadores abertos com os ícones da guarda')
  confere((await page.locator('#cRacoes').textContent()).replace(/\s+/g, '') === '20/20Rations', 'saco de Rations 20/20 no topo')
  const cabecalho = await page.locator('.topo').textContent()
  const corpo = await page.locator('body').innerText()
  confere(/The Lantern Road/.test(cabecalho) && !/placeholder/i.test(cabecalho), 'cabeçalho com o nome provisório e sem "placeholder art"')
  confere(!/King's Road|Keeper|Hearthfield/.test(corpo) && /The Lantern Road/.test(await page.title()), 'nenhum nome antigo na tela (King\'s Road, Keeper, Hearthfield)')
  const q1 = await page.evaluate(() => document.querySelector('#mCanvas').toDataURL())
  await page.waitForTimeout(700)
  const q2 = await page.evaluate(() => document.querySelector('#mCanvas').toDataURL())
  confere(q1 !== q2, 'o mapa tem vida parado (o desenho muda sozinho)')
  await clique(page, '#mLista .m-item[data-i="2"]')
  confere(/coming soon/i.test(await page.locator('#mAviso').textContent()), 'lugar 3: "coming soon"')
  await conferirLayout(page, 'Road')
  await foto(page, 'road-' + sufixo)
  if (pc) { // foco de teclado visível
    await page.keyboard.press('Tab')
    const foco = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { tag: document.activeElement.tagName, estilo: s.outlineStyle, larg: parseFloat(s.outlineWidth) } })
    confere(foco.tag === 'BUTTON' && foco.estilo !== 'none' && foco.larg >= 2, `foco de teclado visível (${foco.tag}, contorno ${foco.larg}px ${foco.estilo})`)
  }
  await clique(page, '#mLista .m-item[data-i="1"]')
  await page.waitForSelector('#time:not([hidden])')

  // ---- 2. Patrol Orders: guarda à vista, roda, trio, troca de posição por toque, ícones que viram, lugar, ordem, Off, tática
  confere((await page.locator('#tRivais .t-rival-mon').count()) === 3, 'guarda do lugar à vista (3)')
  const rivais = await page.locator('#tRivais .t-ficha > b').allTextContents()
  confere(rivais.join(',') === 'Wispurr,Ramblehorn,Breezle', 'guarda de Millbrook: ' + rivais.join(', '))
  confere((await page.locator('#tRoda .roda__el').count()) === 6 && (await page.locator('#tFrases li').count()) === 6, 'roda dos 6 elementos com as frases')
  const trio0 = await nomesDoTrio(page)
  // a conta do piloto mudou (medição do motor): o trio de partida é Ramblehorn, Wispurr, Snapcoal
  confere(trio0.join(',') === 'Ramblehorn,Wispurr,Snapcoal', 'trio do jogador: ' + trio0.join(', '))
  confere((await page.locator('#tBancoLista .t-mon').count()) === 6, 'os 6 monstros da conta do piloto à escolha')
  const bordas0 = await page.locator('#tSlots .f-edge').evaluateAll((l) => l.map((x) => x.getAttribute('aria-label')))
  confere(bordas0.length === 3 && bordas0.every((t) => /^Strong vs [0-3], Weak to [0-3]$/.test(t)), 'cada monstro com "Strong vs N · Weak to N": ' + bordas0.join(' | '))
  confere((await page.locator('#tSlots .f-pip').count()) === 18, 'ícones de elemento da guarda em cada linha de vantagem (3 × 2 × 3)')
  const folha = await page.locator('#time').innerText()
  confere(/Type edge only, not a win chance\./.test(folha), 'texto fixo "Type edge only, not a win chance."')
  confere(/5 fights, 5 Rations/.test(folha) && /The result of each fight is decided when it starts\./.test(folha), 'avisos: quanto a ordem gasta e quando a luta é decidida')
  confere(/Send patrol\s*\(uses 5 Rations\)/.test(folha), 'botão "Send patrol (uses 5 Rations)"')
  confere(!/\b(best|yield|earn|profit)\b/i.test(folha), 'folha sem "best", "yield", "earn" nem promessa de ganho')
  confere(/History: no fights yet/.test(await page.locator('#fHist').textContent()), 'placar histórico rotulado (ainda sem lutas)')
  await conferirLayout(page, 'Patrol Orders')
  await foto(page, 'orders-' + sufixo)
  await clique(page, '#tSlots .t-slot[data-pos="0"] .t-mon')
  await clique(page, '#tSlots .t-slot[data-pos="2"] .t-mon')
  const trio1 = await nomesDoTrio(page)
  confere(trio1.join(',') === 'Snapcoal,Wispurr,Ramblehorn', 'tocar dois troca Front e Back: ' + trio1.join(', '))
  if (pc) { // arrastar (mouse) troca também
    const a = await page.locator('#tSlots .t-slot[data-pos="0"] .t-mon').boundingBox(), b = await page.locator('#tSlots .t-slot[data-pos="2"] .t-mon').boundingBox()
    await page.mouse.move(a.x + 40, a.y + 40); await page.mouse.down(); await page.mouse.move(a.x + 20, a.y + 60, { steps: 4 }); await page.mouse.move(b.x + 40, b.y + 40, { steps: 6 }); await page.mouse.up()
    const trio2 = await nomesDoTrio(page)
    confere(trio2.join(',') === 'Ramblehorn,Wispurr,Snapcoal', 'arrastar troca de volta: ' + trio2.join(', '))
  } else { await clique(page, '#tSlots .t-slot[data-pos="0"] .t-mon'); await clique(page, '#tSlots .t-slot[data-pos="2"] .t-mon') }
  // trocar o MONSTRO: os ícones viram na hora, com som e um pequeno pulo
  const antes = await bordaDe(page, 0)
  const viraAntes = await page.evaluate(() => window.__piloto.som().porNome.vira ?? 0)
  await clique(page, '#tBancoLista .t-mon[data-uid="mudo"]')
  await clique(page, '#tSlots .t-slot[data-pos="0"] .t-mon')
  const depois = await bordaDe(page, 0)
  confere((await nomesDoTrio(page))[0] === 'Lanternewt' && antes !== depois, `trocar monstro muda os ícones na hora (${antes} → ${depois})`)
  confere((await page.locator('#tSlots .t-slot[data-pos="0"].virou').count()) === 1, 'o cartão que mudou vira (animação "virou")')
  const anim = await page.evaluate(() => ({ e: getComputedStyle(document.querySelector('#tSlots .t-slot[data-pos="0"] .f-e')).animationName, m: getComputedStyle(document.querySelector('#tSlots .t-slot[data-pos="0"] .t-mon img')).animationName }))
  confere(anim.e === 'vira' && anim.m === 'pulo', `ícone vira e o monstro dá um pulo (${anim.e}, ${anim.m})`)
  const somA = await page.evaluate(() => window.__piloto.som())
  confere(somA.destravado && (somA.porNome.vira ?? 0) > viraAntes && (somA.porNome.troca ?? 0) > 0, `som de troca e de ícone virando (${JSON.stringify(somA.porNome)})`)
  // mudo funciona
  await clique(page, '#btSom')
  const m1 = await page.evaluate(() => window.__piloto.som())
  await clique(page, '#tBancoLista .t-mon[data-uid="brigao"]')
  await clique(page, '#tSlots .t-slot[data-pos="0"] .t-mon')
  const m2 = await page.evaluate(() => window.__piloto.som())
  confere(m1.mudo && m2.tocados === m1.tocados && (await page.getAttribute('#btSom', 'aria-pressed')) === 'false' && (await page.evaluate(() => localStorage.getItem('piloto_mudo'))) === '1', `mudo: nada toca e fica guardado (${m1.tocados} → ${m2.tocados})`)
  await clique(page, '#btSom')
  confere((await page.evaluate(() => window.__piloto.som().mudo)) === false && (await nomesDoTrio(page))[0] === 'Ramblehorn', 'som ligado de novo; trio de volta')
  // o outro lugar: outra guarda, e os ícones se refazem
  await clique(page, '.f-lugar[data-n="4"]')
  const rivais4 = await page.locator('#tRivais .t-ficha > b').allTextContents()
  confere(rivais4.join(',') === 'Wispurr,Breezle,Cindertusk' && /Stonebridge Watch/.test(await page.locator('#fTitulo').textContent()), 'trocar de lugar na folha: guarda de Stonebridge Watch: ' + rivais4.join(', '))
  await clique(page, '.f-lugar[data-n="2"]')
  // ordem das habilidades (a lista mudou de lugar: agora fica dobrada em "Skill order", dentro da folha)
  await clique(page, '#fHab summary')
  const hab = '#fHabs .f-habmon[data-pos="1"] .t-hab li'
  const ordem0 = await page.locator(hab).evaluateAll((l) => l.map((x) => x.dataset.carta))
  await clique(page, `${hab} >> nth=0 >> [data-acao="desce"]`)
  const ordem1 = await page.locator(hab).evaluateAll((l) => l.map((x) => x.dataset.carta))
  confere(ordem1[0] === ordem0[1] && ordem1[1] === ordem0[0], 'tocar ▼ desce a habilidade: ' + ordem1.join(' > '))
  await clique(page, `${hab} >> nth=2 >> [data-acao="liga"]`)
  confere((await page.locator(`${hab}.off`).count()) === 1, 'tocar On/Off desliga a habilidade (Off)')
  await clique(page, `${hab} >> nth=2 >> [data-acao="liga"]`)
  confere((await page.locator(`${hab}.off`).count()) === 0, 'e liga de novo')
  await conferirLayout(page, 'Patrol Orders (Skill order aberto)')
  await clique(page, '.t-tat[data-t="focus"]')
  confere((await page.getAttribute('.t-tat[data-t="focus"]', 'aria-checked')) === 'true', 'tática Focus escolhida')
  confere(/decided when it starts/.test(await page.locator('#time .decidido').textContent()), 'linha "The result of each fight is decided when it starts."')
  await page.waitForFunction(() => window.__piloto.som().musica > 0, null, { timeout: 8000 }).catch(() => {})
  confere((await page.evaluate(() => window.__piloto.som().musica)) > 0, 'a musiquinha toca depois do primeiro toque')
  await page.close()

  // ---- 3. Send patrol: 1ª luta assistida em 2×; Pause para; 4× até o fim; tremida e flash dentro do limite
  const p2 = await abrir(ctx, erros, ruins, '?cena=time&semente=e2e-a')
  await clique(p2, '#btLutar')
  await p2.waitForSelector('#luta:not([hidden])')
  confere(!!(await p2.evaluate(() => window.__piloto.luta?.resultado)), 'o resultado já existe quando a luta começa (decidido no início)')
  confere((await C(p2)).racoes === 19 && (await p2.locator('#cRacoesNum').textContent()) === '19', 'a 1ª luta gasta 1 Ration (19/20)')
  const b0 = await p2.evaluate(() => window.__piloto.batalha())
  confere(b0.vel === 2, 'a 1ª luta da patrulha roda em 2×')
  confere(/Fight 1 of 5/.test(await p2.locator('#bRotulo').textContent()), 'rótulo "Fight 1 of 5"')
  const palco = await p2.evaluate(() => { const q = document.querySelector('#bPalco').getBoundingClientRect(); return { w: q.width, h: q.height, vw: innerWidth, vh: innerHeight } })
  confere(b0.k >= (pc ? 3 : 2) && palco.w <= palco.vw && palco.w >= palco.vw * 0.75, `câmera perto: monstros de ${64 * b0.k} px (×${b0.k}), palco ${palco.w.toFixed(0)}×${palco.h.toFixed(0)} em ${palco.vw}×${palco.vh}`)
  await p2.waitForFunction(() => window.__piloto.batalha().passo >= 2, null, { timeout: 20000 })
  await p2.waitForSelector('.b-pop', { timeout: 20000 })
  await foto(p2, 'battle-' + sufixo)
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
  const sons = await p2.evaluate(() => window.__piloto.som().porNome)
  confere((sons.golpe ?? 0) + (sons.forte ?? 0) + (sons.critico ?? 0) > 0 && (sons.vitoria ?? 0) + (sons.derrota ?? 0) === 1, 'a luta tem som (golpes e o fim): ' + JSON.stringify(sons))
  await conferirLayout(p2, 'Fim da luta')

  // ---- 4. lutas 2 a 5 em carimbos de ~3 s; o resultado nunca aparece antes do carimbo; tira final; Renome
  const renome0 = (await C(p2)).renome
  await clique(p2, '#bSeguir')
  await p2.waitForSelector('#relato:not([hidden])')
  const tc = Date.now()
  confere((await p2.locator('#rCarimbos .r-carimbo').count()) === 5, 'folha do relato com 5 carimbos')
  await p2.waitForSelector('.r-carimbo[data-i="0"] .r-selo')
  confere((await p2.locator('.r-carimbo[data-i="0"] .r-selo').textContent()) === (venceu ? 'WIN' : 'LOSS'), 'o carimbo da luta 1 bate com a luta assistida')
  const cedo = await p2.evaluate(() => ({ selos: document.querySelectorAll('.r-carimbo .r-selo').length, tira: document.querySelector('#rTiras').hidden, estados: [...document.querySelectorAll('.r-carimbo')].map((x) => x.dataset.estado).join(','), feitas: window.__piloto.patrulha().lutas.length }))
  confere(cedo.selos === 1 && cedo.tira && cedo.feitas <= 2, `o resultado não aparece antes do carimbo (${cedo.estados}; lutas decididas até aqui: ${cedo.feitas})`)
  await p2.waitForSelector('.r-carimbo[data-i="2"][data-estado="lutando"]', { timeout: 20000 })
  if (pc) await foto(p2, 'stamps-pc')
  await conferirLayout(p2, 'Patrol report (carimbos)')
  await p2.waitForFunction(() => window.__piloto.patrulha().fase === 'fim', null, { timeout: 40000 })
  const segC = (Date.now() - tc) / 1000
  confere(segC >= 4 * 2.2 && segC <= 4 * 4.6, `4 carimbos de ~3 s cada (${segC.toFixed(1)} s no total)`)
  await p2.waitForSelector('#rTiras:not([hidden])')
  const pat1 = await P(p2)
  const estados = await p2.locator('.r-carimbo').evaluateAll((l) => l.map((x) => x.dataset.estado))
  confere(pat1.lutas.length === 5 && estados.join('') === pat1.lutas.map((l) => (l.venceu ? 'v' : 'd')).join(''), `5 lutas feitas = 1 assistida + 4 carimbos (${estados.join(' ')})`)
  confere((await C(p2)).racoes === 15 && (await p2.locator('#cRacoesNum').textContent()) === '15', 'Send patrol gastou 5 Rations (15/20)')
  await p2.waitForTimeout(2300) // os números rolam
  const sonsC = await p2.evaluate(() => window.__piloto.som().porNome)
  confere((sonsC.carimboV ?? 0) + (sonsC.carimboD ?? 0) === 5 && (sonsC.tira ?? 0) === 1 && (sonsC.renome ?? 0) === 1, 'som de carimbo em cada luta, da tira final e do Renome: ' + JSON.stringify(sonsC))
  const linha1 = await p2.getAttribute('#rNova', 'aria-label')
  const v1 = pat1.lutas.filter((l) => l.venceu).length
  const dados1 = pat1.lutas.reduce((s, l) => s + l.forteDados, 0), lev1 = pat1.lutas.reduce((s, l) => s + l.forteLevados, 0)
  confere(linha1 === `${v1} W – ${5 - v1} L · Strong hits given ${dados1} · taken ${lev1}`, 'tira final com os números das 5 lutas: ' + linha1)
  const tiraTxt = (await p2.locator('#rNova').innerText()).replace(/\s+/g, ' ')
  confere(tiraTxt.includes(`${v1} W – ${5 - v1} L`) && tiraTxt.includes(`Strong hits given ${dados1}`) && tiraTxt.includes(`taken ${lev1}`), 'os números da tira na tela (depois de rolar): ' + tiraTxt.slice(0, 90))
  const causa = (await p2.locator('#rNova .r-causa').textContent()).trim()
  confere(causa === pat1.tira.causa && /(landed|took) \d+ Strong hits?|No Strong hits/.test(causa), 'UMA frase de causa tirada dos eventos: ' + causa)
  confere((await p2.locator('#rNova .r-spots div').count()) === 3 && /Damage taken by spot/i.test(tiraTxt), 'dano levado por posição (Front, Middle, Back)')
  confere(await p2.isHidden('#rAntes'), '1ª tentativa: ainda não há tira anterior')
  const renome1 = (await C(p2)).renome
  confere(renome1 === renome0 + 5 + v1 && (await p2.locator('#cRenomeNum').textContent()) === String(renome1) && (await p2.locator('#rRenomeNum').textContent()) === String(renome1), `Renome sobe com a patrulha (${renome0} → ${renome1}) e aparece no topo`)
  confere(/small sample/.test(await p2.locator('#rAmostra').textContent()), 'aviso: 5 lutas é amostra pequena')
  await conferirLayout(p2, 'Patrol report (tira)')
  // tocar num carimbo abre o replay daquela luta; "Back to report" volta
  await clique(p2, '.r-carimbo[data-i="2"]')
  await p2.waitForSelector('#luta:not([hidden])')
  confere(/Replay · Fight 3 of 5/.test(await p2.locator('#bRotulo').textContent()), 'tocar num carimbo abre o replay daquela luta')
  await clique(p2, '#bPular')
  await p2.waitForSelector('#bFim:not([hidden])', { timeout: 20000 })
  confere((await p2.locator('#bFimTit').textContent()) === (pat1.lutas[2].venceu ? 'Victory!' : 'Defeat'), 'o replay mostra o mesmo resultado do carimbo')
  await conferirLayout(p2, 'Fim do replay')
  await clique(p2, '#bTrocar')
  confere((await p2.isVisible('#relato')) && (await p2.isVisible('#rNova')) && (await C(p2)).racoes === 15, '"Back to report" volta ao relato (replay não gasta Ration)')
  await p2.close()

  // ---- 5. mesma semente → mesmo resultado; Skip mostra o fim; a tentativa anterior fica ao lado da nova
  const p3 = await abrir(ctx, erros, ruins, '?cena=time&semente=e2e-a')
  const hist2 = await p3.locator('#fHist b').textContent()
  confere(hist2 === `History: ${v1} W – ${5 - v1} L`, 'placar histórico real do trio no lugar: ' + hist2)
  await clique(p3, '#btLutar')
  await p3.waitForFunction(() => window.__piloto.batalha()?.passo >= 0, null, { timeout: 20000 })
  await clique(p3, '#bPular')
  await p3.waitForSelector('#bFim:not([hidden])', { timeout: 20000 })
  const r2 = await p3.evaluate(() => JSON.stringify(window.__piloto.luta.resultado))
  confere(r1 === r2, 'mesma semente e mesmo time → mesmo resultado (' + r1 + ')')
  confere((await p3.locator('#bFimTit').textContent()) === fim1, 'Skip mostra o mesmo fim')
  await clique(p3, '#bSeguir')
  await clique(p3, '#rPular')
  await p3.waitForFunction(() => window.__piloto.patrulha().fase === 'fim', null, { timeout: 20000 })
  const pat2 = await P(p3)
  confere(JSON.stringify(pat2.lutas) === JSON.stringify(pat1.lutas), 'mesma semente = as mesmas 5 lutas (patrulha inteira igual)')
  confere((await C(p3)).racoes === 10, 'a 2ª patrulha gastou mais 5 Rations (10/20)')
  // 3ª tentativa: só troca a formação (Front ↔ Back) e manda de novo; a anterior fica ao lado
  await clique(p3, '#rOutro')
  confere(await p3.isVisible('#time'), '"Change the formation" volta à folha de ordens')
  await clique(p3, '#tSlots .t-slot[data-pos="0"] .t-mon')
  await clique(p3, '#tSlots .t-slot[data-pos="2"] .t-mon')
  confere((await p3.locator('#fHist b').textContent()) === `History: ${2 * v1} W – ${2 * (5 - v1)} L`, 'o histórico soma as duas patrulhas do trio neste lugar')
  await patrulhaRapida(p3)
  await p3.waitForTimeout(1700)
  const pat3 = await P(p3)
  const lado = await p3.evaluate(() => { const a = document.querySelector('#rNova').getBoundingClientRect(), b = document.querySelector('#rAntes').getBoundingClientRect(); return { ax: a.left, ar: a.right, ay: a.top, ab: a.bottom, bx: b.left, by: b.top, vis: !document.querySelector('#rAntes').hidden } })
  confere(lado.vis && (pc ? lado.bx >= lado.ar - 1 && Math.abs(lado.ay - lado.by) < 2 : lado.by >= lado.ab - 1), `a tentativa anterior fica ${pc ? 'ao lado' : 'logo abaixo'} da nova`)
  confere((await p3.getAttribute('#rAntes', 'aria-label')) === linha1 && /Previous patrol/i.test(await p3.locator('#rAntes').innerText()), 'a tira anterior guarda os números da tentativa anterior: ' + linha1)
  const linha3 = await p3.getAttribute('#rNova', 'aria-label')
  const v3 = pat3.lutas.filter((l) => l.venceu).length
  confere(linha3.startsWith(`${v3} W – ${5 - v3} L`) && /This patrol/i.test(await p3.locator('#rNova').innerText()), 'a tira nova mostra a nova formação: ' + linha3)
  confere(JSON.stringify(pat3.lutas) !== JSON.stringify(pat1.lutas), 'mudou a formação → as lutas mudaram (mesma semente)')
  await conferirLayout(p3, 'Patrol report (comparação)')
  await p3.evaluate((noPc) => { if (noPc) window.scrollTo(0, 0); else document.querySelector('#rNova').scrollIntoView({ block: 'start' }) }, pc)
  await foto(p3, 'result-compare-' + sufixo)
  const renome3 = (await C(p3)).renome
  confere(renome3 > renome1 && (await C(p3)).racoes === 5, `Renome só cresce (${renome1} → ${renome3}); Rations 5/20`)

  // ---- 6. ficha do monstro com história, título e Renome; cartão PNG
  await clique(p3, '#abaMonstros')
  await p3.waitForSelector('#monstros:not([hidden])')
  confere((await p3.locator('#gGrade .g-item').count()) === 6, 'tela Monsters com os 6 da conta')
  await conferirLayout(p3, 'Monsters')
  await clique(p3, '#gGrade .g-item[data-uid="mordedor"]')
  await p3.waitForSelector('#gFundo:not([hidden])')
  const fichaTxt = (await p3.locator('#gFicha').innerText()).replace(/\s+/g, ' ')
  const hs = await p3.evaluate(() => window.__piloto.historia('mordedor'))
  confere(hs.lutas === 15 && fichaTxt.includes(`${hs.v} W – ${hs.d} L`) && fichaTxt.includes('Millbrook'), `ficha com a história: placar ${hs.v} W – ${hs.d} L e placar por lugar`)
  confere(/Millbrook Veteran/.test(fichaTxt) && hs.titulos.some((t) => t.id === 'veterano'), 'título ganho no piloto: "Millbrook Veteran" (5 lutas no lugar)')
  confere(fichaTxt.includes(`Renown ${renome3}`) && /never adds power/.test(fichaTxt), 'Renome da conta na ficha, dito como enfeite')
  await conferirLayout(p3, 'Ficha do monstro')
  if (pc) await foto(p3, 'monster-card-pc')
  const [baixou] = await Promise.all([p3.waitForEvent('download', { timeout: 15000 }).catch(() => null), clique(p3, '#gCartao')])
  await p3.waitForFunction(() => window.__piloto.cartao, null, { timeout: 15000 })
  const cartao = await p3.evaluate(() => window.__piloto.cartao)
  confere(cartao.w === 480 && cartao.h === 640 && cartao.url.startsWith('data:image/png;base64,'), `"Share card" gera um PNG ${cartao.w}×${cartao.h}`)
  confere(!!baixou && /snapcoal-card\.png$/.test(baixou.suggestedFilename()), 'o cartão é baixado: ' + (baixou ? baixou.suggestedFilename() : 'sem download'))
  const arqCartao = path.join(FOTOS, 'share-card.png')
  await writeFile(arqCartao, Buffer.from(cartao.url.split(',')[1], 'base64'))
  const kbC = (await stat(arqCartao)).size / 1024
  confere(kbC > 3 && kbC < 400, `share-card.png com ${kbC.toFixed(0)} KB (< 400)`)
  await p3.keyboard.press('Escape')
  confere(await p3.isHidden('#gFundo'), 'a ficha fecha com Esc')
  await clique(p3, '#gGrade .g-item[data-uid="mordedor"]'); await clique(p3, '#gX')
  confere(await p3.isHidden('#gFundo'), 'a ficha fecha no X')
  await clique(p3, '#gGrade .g-item[data-uid="mordedor"]'); await p3.mouse.click(4, fmt.h - 4)
  confere(await p3.isHidden('#gFundo'), 'a ficha fecha clicando fora')

  // ---- 7. Rations acabam: a ordem não sai; "Reset pilot" devolve tudo
  await clique(p3, '#abaMapa'); await clique(p3, '#mLista .m-item[data-i="1"]')
  await patrulhaRapida(p3)
  confere((await C(p3)).racoes === 0, 'a 4ª patrulha zera o saco (0/20)')
  confere(await p3.isDisabled('#rDeNovo'), 'sem Rations, "Send again" fica desligado')
  await clique(p3, '#rOutro')
  await clique(p3, '#btLutar')
  await p3.waitForTimeout(300)
  confere((await p3.isVisible('#time')) && /Not enough Rations/.test(await p3.locator('#fAvisos').textContent()) && (await C(p3)).racoes === 0, 'sem Rations a patrulha não sai, e a folha diz por quê')
  await clique(p3, '#fVoltar')
  confere(/Last patrol/.test(await p3.locator('#mUltima').textContent()) && !/\d W/.test(await p3.locator('#mUltima').textContent()), 'a Road lembra a última patrulha sem mostrar o placar')
  await clique(p3, '#btReset'); await clique(p3, '#btReset')
  const zerado = await C(p3)
  confere(zerado.racoes === 20 && zerado.renome === 0 && zerado.tiras.length === 0 && (await p3.locator('#cRacoesNum').textContent()) === '20', '"Reset pilot" (2 toques) devolve 20 Rations e zera o piloto')
  await p3.close()

  // ---- 8. Reduced motion: sem tremida e sem flash
  const p4 = await abrir(ctx, erros, ruins, '?cena=time&semente=e2e-b')
  await clique(p4, '#btMenos')
  confere((await p4.getAttribute('#btMenos', 'aria-pressed')) === 'true', 'botão Reduced motion liga')
  await clique(p4, '#btLutar')
  await clique(p4, '[data-vel="4"]')
  await p4.waitForSelector('#bFim:not([hidden])', { timeout: 120000 })
  confere((await p4.evaluate(() => window.__piloto.tremidaMax)) === 0, 'Reduced motion: nenhuma tremida')
  confere((await p4.evaluate(() => window.__piloto.flashes().length)) === 0, 'Reduced motion: nenhum flash')
  await clique(p4, '#bSeguir')
  await p4.waitForSelector('.r-carimbo[data-i="1"] .r-selo', { timeout: 20000 })
  const parado = await p4.evaluate(() => ({ selo: getComputedStyle(document.querySelector('.r-carimbo[data-i="1"] .r-selo')).animationName, folha: getComputedStyle(document.querySelector('#rFolha')).animationName }))
  confere(parado.selo === 'none' && parado.folha === 'none', 'Reduced motion: o carimbo não pula e a folha não treme')
  await clique(p4, '#rPular')
  await p4.waitForFunction(() => window.__piloto.patrulha().fase === 'fim', null, { timeout: 20000 })
  await clique(p4, '#btMenos')
  await p4.close()

  // ---- 9. PC: fotos de Sundown e de vitória (semente com vitória e luta longa)
  if (pc) {
    const p5 = await abrir(ctx, erros, ruins, '?cena=time&semente=h')
    await clique(p5, '#btLutar')
    await clique(p5, '[data-vel="4"]')
    await p5.waitForFunction(() => window.__piloto.batalha().turno >= 9, null, { timeout: 120000 })
    await p5.waitForTimeout(900)
    confere(/Sundown/.test(await p5.locator('#bSol').textContent()), 'Sundown aparece do turno 9 em diante')
    confere((await p5.evaluate(() => window.__piloto.som().porNome.sundown ?? 0)) === 1, 'o Sundown tem o seu som')
    await foto(p5, 'battle-sundown-pc')
    await clique(p5, '#bPular')
    await p5.waitForSelector('#bFim:not([hidden])', { timeout: 20000 })
    if ((await p5.locator('#bFimTit').textContent()) === 'Victory!') await foto(p5, 'victory-pc')
    else falha('a semente "h" devia dar vitória para a foto victory-pc')
    await p5.close()
  }

  // ---- 10. Nest: chances antes, revelação em 5 passos (toque e auto), nome, segredos; o filhote entra na conta e vai na patrulha
  const p6 = await abrir(ctx, erros, ruins, '?cena=ovo&ovo=e2e-ovo')
  confere(await p6.isDisabled('#oBreed'), 'sem dois pais, não bota o ovo')
  await clique(p6, '.o-pai >> nth=0')
  await clique(p6, '.o-pai >> nth=1')
  const chances = await p6.locator('#oChances .o-linha').count()
  const pcts = await p6.locator('#oChances em').allTextContents()
  confere(chances === 5 && pcts.length >= 5 && pcts.every((x) => /%$/.test(x)), `chances das 5 partes à vista antes de confirmar (${pcts.slice(0, 4).join(' ')})`)
  confere(/Decided when you confirm/.test(await p6.locator('#oEscolha').innerText()), 'frase "Decided when you confirm" junto do botão')
  await conferirLayout(p6, 'Nest (escolha)')
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
  confere((await C(p6)).monstros.length === 7 && /Joined your monsters/.test(await p6.locator('#oEntrou').textContent()), 'o filhote entra na conta do piloto ao nascer (7 monstros)')
  const sonsO = await p6.evaluate(() => window.__piloto.som().porNome)
  confere((sonsO.ovoRacha ?? 0) === 4 && (sonsO.ovoNasce ?? 0) === 1, 'som do ovo rachando (4) e nascendo (1)')
  await clique(p6, '#oEspiar')
  confere((await p6.locator('#oSegredos li').count()) === 5, '"Peek hidden traits" mostra as 5 partes escondidas')
  await conferirLayout(p6, 'Nest (fim)')
  await p6.waitForTimeout(700)
  if (pc) await foto(p6, 'egg-pc')
  // outro ovo, todo no "auto": a cena inteira em até 6 s
  await clique(p6, '#oDeNovo')
  await clique(p6, '.o-pai >> nth=2'); await clique(p6, '.o-pai >> nth=3')
  const ta = Date.now()
  await clique(p6, '#oBreed')
  await p6.waitForFunction(() => window.__piloto.ovo().fase === 'fim', null, { timeout: 20000 })
  const segO = (Date.now() - ta) / 1000
  confere(segO <= 6, `ovo no "auto" em até 6 s (${segO.toFixed(1)} s)`)
  const nome2 = await p6.locator('#oNome').textContent()
  await clique(p6, '#oTime')
  await p6.waitForSelector('#time:not([hidden])')
  confere((await p6.locator('#tBancoLista .t-mon').count()) === 8 && (await p6.locator('#tBancoLista .t-mon small').allTextContents()).includes(nome), 'os filhotes aparecem na lista de monstros da folha (8)')
  confere((await p6.locator('#tBancoLista .t-mon.sel small').textContent()) === nome2, '"To the patrol" já traz o filhote escolhido')
  await clique(p6, '#tSlots .t-slot[data-pos="0"] .t-mon')
  confere((await nomesDoTrio(p6))[0] === nome2, 'o filhote entra no trio (com os ícones de vantagem dele)')
  await conferirLayout(p6, 'Patrol Orders (com filhotes)')
  await clique(p6, '#btLutar')
  await clique(p6, '#bPular')
  await p6.waitForSelector('#bFim:not([hidden])', { timeout: 20000 })
  confere(true, 'o filhote luta na patrulha (a luta chega ao fim)')
  await clique(p6, '#abaMonstros')
  confere((await p6.locator('#gGrade .g-item b').allTextContents()).includes(nome2) && (await p6.locator('#gGrade .g-item').count()) === 8, 'o filhote aparece em Monsters')
  await p6.close()

  // ---- 11. só public/ e shared/; zero 404; zero erro
  const pf = await abrir(ctx, erros, ruins)
  const fora = await pf.evaluate(() => performance.getEntriesByType('resource').map((e) => new URL(e.name)).filter((u) => u.protocol.startsWith('http')).map((u) => u.pathname).filter((p) => !/\/(public|shared)\//.test(p)))
  confere(fora.length === 0, 'a página só pede arquivos de public/ e shared/' + (fora.length ? ' → ' + fora.slice(0, 4).join(', ') : ''))
  const naSub = await pf.evaluate((sub) => performance.getEntriesByType('resource').every((e) => new URL(e.name).pathname.startsWith(sub)), SUB)
  confere(naSub, 'funciona em subpasta (todo pedido fica dentro dela)')
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
