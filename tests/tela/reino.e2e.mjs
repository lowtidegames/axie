// Keepmile (jogo de reino) — teste de tela de public/reino/, servida como arquivos parados numa SUBPASTA. Celular 360×740 (toque)
// e PC 1280×720; o desenho também é conferido em 390×844 e 740×360 deitado. Confere: abre direto no jogo com 3 cartas em < 5 s;
// pôr carta por toque e por arrasto; a batalha roda até o fim e o resultado da tela = o do motor (`reproduzir` com os comandos dá o
// mesmo); mesma semente = mesma partida; subir de nível mostra a festa; perder vida; chefe na rodada 5 com anúncio e noite; fim com
// recorde guardado, Play again e Share (PNG); partida inteira pelo robô ganancioso do motor sem erro; álbum e conquistas; som nos
// eventos certos, nada antes do primeiro toque, mudo cala, amostra + código somados; Reduced motion sem tremida nem flash (sem ele:
// tremida ≤ 6 px, flash ≤ 3/s, partículas no limite); tempo de quadro com 80+ bonecos; nada cortado nem sobreposto; toque ≥ 44 px;
// foco de teclado; sem atlas cai no desenho por código; zero erro de console, zero 404, só public/ e shared/, funciona em subpasta.
// Fotos em tests/tela/fotos/reino/.
// Rode pela trava:  node tools/trava-robos.mjs rodar "timeout 800 node tests/tela/reino.e2e.mjs"
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const FOTOS = path.join(RAIZ, 'tests', 'tela', 'fotos', 'reino')
const SUB = '/algum-nome/'
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' }
const GUARDAR = new Set(['abertura-celular', 'mao-celular', 'batalha-celular', 'batalha-pc', 'chefe-pc', 'nivel-celular', 'espolio-celular', 'derrota-celular', 'fim-celular', 'fim-pc', 'album-celular', 'share-card'])
const SEM = 'e2e-keepmile-1' // semente fixa: as mesmas cartas, hordas e espólios sempre

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
const base = `http://127.0.0.1:${servidor.address().port}${SUB}public/reino/`
await mkdir(FOTOS, { recursive: true })
const browser = await chromium.launch()
const temAtlasNoDisco = await stat(path.join(RAIZ, 'public', 'reino', 'arte', 'atlas.json')).then(() => true, () => false)

function vigiar(page, erros, ruins, { semAtlas = false } = {}) {
  const atlas = (u) => /\/arte\/atlas\.json$/.test(u) && (semAtlas || !temAtlasNoDisco) // sem o atlas, pedir e não achar é o esperado
  page.on('console', (m) => { if (m.type() === 'error' && !(atlas(m.location()?.url || '') || (semAtlas && /404/.test(m.text())))) erros.push('console: ' + m.text()) })
  page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
  page.on('response', (r) => { if (r.status() >= 400 && !atlas(r.url())) ruins.push(`${r.status()} ${r.url()}`) })
  page.on('requestfailed', (r) => { if (!atlas(r.url())) ruins.push(`falhou ${r.url()}`) })
}
async function foto(page, nome) {
  const pasta = GUARDAR.has(nome) ? FOTOS : process.env.REINO_FOTOS_EXTRA
  if (!pasta) return
  const arq = path.join(pasta, nome + '.png')
  await page.screenshot({ path: arq })
  const kb = (await stat(arq)).size / 1024
  confere(kb < 400, `foto ${nome}.png com ${kb.toFixed(0)} KB (< 400)`)
}
const K = (page, fn, arg) => page.evaluate(`(${fn})(window.__keepmile, ${JSON.stringify(arg ?? null)})`)
const modelo = (page) => K(page, (k) => k.modelo())
const sons = (page) => K(page, (k) => k.som().historico.filter((h) => h.tipo === 'som').map((h) => h.nome))
const fase = (page, f, prazo = 20000) => page.waitForFunction((x) => window.__keepmile.fase() === x, f, { timeout: prazo })

/** Nada cortado nem sobreposto na tela visível; toque ≥ 44 px; o canvas cobre a tela. */
async function conferirLayout(page, onde) {
  const r = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, out = { pequenos: [], fora: [], sobrepostos: [], rolagem: document.documentElement.scrollWidth - vw, canvas: null, n: 0 }
    const bts = [...document.querySelectorAll('#toques button')]
    out.n = bts.length
    for (const b of bts) {
      const q = b.getBoundingClientRect()
      if (q.width < 43.5 || q.height < 43.5) out.pequenos.push(`${b.id} ${q.width.toFixed(0)}×${q.height.toFixed(0)}`)
      if (q.left < -0.5 || q.top < -0.5 || q.right > vw + 0.5 || q.bottom > vh + 0.5) out.fora.push(b.id)
    }
    for (let i = 0; i < bts.length; i++) for (let j = i + 1; j < bts.length; j++) {
      const a = bts[i].getBoundingClientRect(), c = bts[j].getBoundingClientRect()
      const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left), iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)
      if (ix > 1 && iy > 1) out.sobrepostos.push(`${bts[i].id} × ${bts[j].id} (${ix.toFixed(0)}×${iy.toFixed(0)})`)
    }
    const c = document.getElementById('cena').getBoundingClientRect()
    out.canvas = { cobre: c.left <= 0 && c.top <= 0 && c.right >= vw && c.bottom >= vh, sobra: Math.max(c.right - vw, c.bottom - vh) }
    return out
  })
  confere(r.n > 0 && r.pequenos.length === 0, `${onde}: ${r.n} botões, todos com toque ≥ 44 px` + (r.pequenos.length ? ' → ' + r.pequenos.slice(0, 4).join(', ') : ''))
  confere(r.fora.length === 0, `${onde}: nenhum botão cortado pela tela` + (r.fora.length ? ' → ' + r.fora.slice(0, 5).join(', ') : ''))
  confere(r.sobrepostos.length === 0, `${onde}: nenhum botão sobreposto` + (r.sobrepostos.length ? ' → ' + r.sobrepostos.slice(0, 4).join(', ') : ''))
  confere(r.rolagem <= 0 && r.canvas.cobre && r.canvas.sobra < 4, `${onde}: a cena cobre a tela inteira, sem rolagem (sobra ${r.canvas.sobra})`)
}

async function rodar(fmt) {
  console.log(`\n=== ${fmt.nome} ${fmt.w}×${fmt.h} ===`)
  const erros = [], ruins = []
  const novoCtx = (extra = {}) => browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1, reducedMotion: 'no-preference', acceptDownloads: true, ...extra })
  const toca = async (page, id) => { const l = page.locator('#bt-' + id); if (fmt.toque) await l.tap(); else await l.click() }
  const abrir = async (ctx, q = `?teste=1&semente=${SEM}`, opc = {}) => {
    const page = await ctx.newPage(); vigiar(page, erros, ruins, opc)
    const t0 = Date.now()
    await page.goto(base + q)
    await page.waitForSelector('#bt-carta2', { timeout: 20000 })
    page.abriuEm = Date.now() - t0
    await page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
    return page
  }
  const nome = (s) => `${s}-${fmt.nome}`

  // ---------------------------------------------------------------- 1. abre direto no jogo
  const ctx = await novoCtx()
  const page = await abrir(ctx)
  confere(page.abriuEm < 5000, `abre direto no jogo e mostra as 3 cartas em ${page.abriuEm} ms (< 5000)`)
  let m = await modelo(page)
  const v0 = await K(page, (k) => k.visao())
  confere(m.fase === 'carta' && m.mao.length === 3 && v0.rodada === 1 && v0.terrenos.every((t) => !t), 'rodada 1: reino vazio, 3 cartas na mão, sem menu nem tutorial')
  confere(new Set(m.mao.map((c) => c.carta)).size === 3 && JSON.stringify(m.mao.map((c) => c.carta)) === JSON.stringify(v0.oferta.map((o) => o.carta)), 'as 3 cartas da tela são a oferta do motor')
  confere(m.hordaN === v0.horda.ordem.length && v0.espolios.length === 3, `horda (${m.hordaN}) e 3 espólios à vista antes da luta`)
  confere((await K(page, (k) => k.som().ligado)) === false, 'nada de som antes do primeiro toque (nem contexto de áudio)')
  confere((await K(page, (k) => k.temAtlas())) === temAtlasNoDisco, `atlas de arte ${temAtlasNoDisco ? 'carregado' : 'ausente: tudo por código'}`)
  await page.waitForTimeout(700)
  await foto(page, nome('abertura'))
  await conferirLayout(page, 'abertura')

  // ---------------------------------------------------------------- 2. escolher e pôr a carta
  const qual = Math.max(0, ['T02', 'T01', 'T07', 'T04'].map((c) => m.mao.findIndex((x) => x.carta === c)).find((i) => i >= 0) ?? 0) // uma tropa de luta comprida, para dar tempo de ver e ouvir
  await toca(page, 'carta' + qual)
  m = await modelo(page)
  confere(m.sel === qual, 'tocar na carta escolhe (sobe com aura)')
  await page.waitForTimeout(350)
  await foto(page, nome('mao'))
  await toca(page, 'terreno1')
  let v = await K(page, (k) => k.visao())
  confere(v.terrenos[0]?.carta === m.mao[qual].carta && v.cartaPosta, `tocar no terreno põe a carta (${v.terrenos[0]?.carta} no terreno 1)`)
  confere((await page.locator('#bt-carta0').count()) === 0 && (await page.locator('#bt-lutar2').count()) === 1, 'depois de pôr: a mão some e sobra o botão de batalha')
  let s = await sons(page)
  confere(s.includes('cartaEscolhe') && s.includes('cartaPoe'), 'som ao escolher e ao pôr a carta')
  confere((await K(page, (k) => k.cena().bonecos)) > m.hordaN, 'os soldados aparecem no terreno')
  await conferirLayout(page, 'carta posta')

  // ---------------------------------------------------------------- 3. batalha até o fim: tela = motor
  await toca(page, 'lutar2')
  await fase(page, 'luta')
  await toca(page, 'vel'); await toca(page, 'vel')
  confere((await modelo(page)).vel === 4 && (await K(page, (k) => k.guarda().vel)) === 4, 'botão 1×/2×/4× troca e fica guardado')
  await toca(page, 'vel') // de volta a 1×
  await conferirLayout(page, 'batalha')
  await fase(page, 'vitoria', 45000)
  const luta = await K(page, (k) => k.ultimaLuta())
  confere(luta.tela === true && luta.motor === true, `a batalha rodou até o fim e a tela mostrou o resultado do motor (vitória em ${luta.segundos} s)`)
  let rep = await K(page, (k) => k.reproduzir())
  confere(rep.ok && rep.igual, 'reproduzir(semente, comandos) no motor dá o mesmo estado da tela')
  await page.waitForFunction(() => window.__keepmile.modelo().vitoria?.pronto, null, { timeout: 10000 })
  s = await sons(page)
  confere(['invasorChega', 'marcha', 'vitoria', 'ouro', 'espolio'].every((x) => s.includes(x)), 'som na batalha: chegada, marcha, vitória, ouro contando e espólio')
  const mus = await K(page, (k) => k.som().historico.filter((h) => h.tipo === 'musica').map((h) => h.nome))
  confere(mus[0] === 'construir' && mus.includes('batalha'), `a música troca de momento (${mus.join(' → ')})`)
  confere((await K(page, (k) => k.guarda().conquistas)).includes('supper'), 'conquista "First Supper" ganha na 1ª vitória')
  await page.waitForTimeout(700)
  await foto(page, nome('espolio'))
  await conferirLayout(page, 'espólio')

  // ---------------------------------------------------------------- 4. espólio e subir de nível
  v = await K(page, (k) => k.visao())
  const ouroAntes = v.ouro, bolsa = v.espolios.findIndex((e) => e.tipo === 'bolsa')
  await toca(page, 'espolio' + bolsa)
  await fase(page, 'carta')
  v = await K(page, (k) => k.visao())
  confere(v.rodada === 2 && (v.espolios && (v.ouro > ouroAntes || v.reliquias.length === 1)), `espólio pego: rodada 2 (ouro ${ouroAntes} → ${v.ouro}, relíquias ${v.reliquias.length})`)
  m = await modelo(page)
  confere(m.mao[0].sobe === true && m.mao[0].nivel === 2, 'rodada 2: a 1ª carta vem com o selo LEVEL UP e mostra o nível 2')
  await toca(page, 'carta0'); await toca(page, 'terreno1')
  v = await K(page, (k) => k.visao()); m = await modelo(page)
  confere(v.terrenos[0].nivel === 2 && m.selo === true, 'subir de nível: nível 2 no motor e festa (selo LEVEL UP) na tela')
  confere((await sons(page)).includes('nivelPequeno'), 'som de nível')
  await page.waitForTimeout(250)
  await foto(page, nome('nivel'))

  // ---------------------------------------------------------------- 5. mesma semente = mesma partida
  const comandos = await K(page, (k) => k.comandos()), estadoA = await K(page, (k) => JSON.stringify(k.estado()))
  const p2 = await abrir(ctx)
  const v2 = await K(p2, (k) => k.visao())
  confere(JSON.stringify(v2.oferta) === JSON.stringify(v0.oferta) && JSON.stringify(v2.horda) === JSON.stringify(v0.horda) && JSON.stringify(v2.espolios) === JSON.stringify(v0.espolios), 'mesma semente: mesma oferta, horda e espólios')
  const rep2 = await p2.evaluate(async ({ sem, cmds }) => { const { reproduzir } = await import(new URL('../../shared/reino/partida.js', location.href).href); const r = reproduzir({ semente: sem, cartasLiberadas: window.__keepmile.liberadas(), comandos: cmds }); return { ok: r.ok, estado: JSON.stringify(r.estado) } }, { sem: SEM, cmds: comandos })
  confere(rep2.ok && rep2.estado === estadoA, 'mesma semente + mesmos comandos = a mesma partida, byte a byte')

  // ---------------------------------------------------------------- 6. perder vida (reino vazio)
  await toca(p2, 'lutar')
  await fase(p2, 'luta')
  await p2.waitForTimeout(500)
  await K(p2, (k) => k.avancarBatalha())
  await fase(p2, 'derrota')
  m = await modelo(p2); v = await K(p2, (k) => k.visao())
  confere(v.vidas === 2 && m.vidas === 2 && v.rodada === 1, 'derrota: perde 1 vida e a rodada volta')
  confere(/Muncher/.test(m.derrota || ''), `1 linha "quem te derrubou": "${m.derrota}"`)
  confere((await K(p2, (k) => k.cena().vidas)) === 2, 'o castelo racha')
  await p2.waitForTimeout(1100)
  s = await sons(p2)
  confere(['casteloRacha', 'vidaPerdida', 'derrota'].every((x) => s.includes(x)), 'som de castelo rachando, vida perdida e derrota')
  await foto(p2, nome('derrota'))
  await toca(p2, 'seguir')
  await fase(p2, 'carta')
  confere((await p2.locator('#bt-consertar').count()) === 1 && (await p2.locator('#bt-consertar').isDisabled()), 'conserto de vida aparece com o preço (apagado sem ouro)')
  await conferirLayout(p2, 'depois da derrota')
  // sortear de novo: preço e confirmação (tocar duas vezes)
  const ofertaAntes = JSON.stringify((await K(p2, (k) => k.visao())).oferta), ouroS = (await K(p2, (k) => k.visao())).ouro
  await toca(p2, 'sortear')
  confere((await modelo(p2)).armado === 'sortear' && JSON.stringify((await K(p2, (k) => k.visao())).oferta) === ofertaAntes, 'sortear de novo pede confirmação (1º toque só arma)')
  await toca(p2, 'sortear')
  v = await K(p2, (k) => k.visao())
  confere(v.ouro === ouroS - 2 && (await sons(p2)).includes('sortear'), `2º toque sorteia e cobra o preço do motor (ouro ${ouroS} → ${v.ouro})`)
  await p2.close()

  // ---------------------------------------------------------------- 7. arrastar a carta (PC: mouse)
  if (!fmt.toque) {
    const p3 = await abrir(ctx)
    const a = await p3.locator('#bt-carta0').boundingBox(), b = await K(p3, (k) => k.areaDoTerreno(2))
    await p3.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p3.mouse.down()
    await p3.mouse.move(a.x + a.width / 2, a.y - 40, { steps: 4 }); await p3.mouse.move(b.x + b.w / 2, b.y + b.h / 2, { steps: 8 }); await p3.mouse.up()
    v = await K(p3, (k) => k.visao())
    confere(v.terrenos[1]?.carta === v0.oferta[0].carta, 'arrastar a carta até o terreno também põe')
    await p3.close()
  }

  // ---------------------------------------------------------------- 8. chefe na rodada 5
  const r5 = await K(page, (k) => k.jogarSozinho({ ateRodada: 5 }))
  confere(r5.rodada === 5 && !r5.fim, `o robô ganancioso do motor joga pela tela até a rodada 5 (${r5.comandos} comandos)`)
  m = await modelo(page)
  confere(m.fase === 'chefe' && m.chefe === 'gutbucket', 'rodada 5: anúncio do chefe com entrada')
  confere((await K(page, (k) => k.cena().hora)) === 'boss-night', 'rodada de chefe é de noite')
  await page.waitForTimeout(900)
  confere((await sons(page)).includes('chefeAnuncia') && (await K(page, (k) => k.musica().momento === 'chefe' || k.musica().pendente === 'chefe')), 'som e música de chefe')
  if (!fmt.toque) await foto(page, 'chefe-pc')
  await toca(page, 'seguir')
  await fase(page, 'carta')
  await conferirLayout(page, 'rodada de chefe')

  // ---------------------------------------------------------------- 9. partida inteira pelo robô, fim como festa
  const fim = await K(page, (k) => k.jogarSozinho())
  confere(fim.fim, `partida inteira jogada pelo robô até o fim (${fim.comandos} comandos, rodada ${fim.rodada})`)
  const lutas = await K(page, (k) => k.lutas())
  confere(lutas.length > 5 && lutas.every((l) => l.tela === l.motor), `${lutas.length} lutas: em todas a tela mostrou o resultado do motor`)
  rep = await K(page, (k) => k.reproduzir())
  confere(rep.ok && rep.igual, 'no fim, reproduzir(semente, comandos) dá o mesmo resultado')
  confere((await K(page, (k) => k.erros())).length === 0, 'nenhum erro da tela durante a partida inteira')
  await page.waitForFunction(() => window.__keepmile.modelo().fim?.contou, null, { timeout: 15000 })
  m = await modelo(page)
  const g = await K(page, (k) => k.guarda())
  confere(m.fase === 'fim' && m.fim.mostra === rep.resultado.vencidas && m.fim.pontos === rep.resultado.pontos, `fim: ${m.fim.vencidas} rodadas contadas, ${m.fim.pontos} pontos (os números do motor)`)
  confere(m.fim.novoRecorde && g.recorde === rep.resultado.pontos && g.melhores[0].pontos === g.recorde, 'recorde novo e guardado no aparelho, com a lista das melhores partidas')
  s = await sons(page)
  confere(s.includes('fimDePartida') && s.includes('recorde') && (await K(page, (k) => k.som().somados)) >= 1, 'som de fim e de recorde (amostra + fanfarra por código somadas)')
  await page.waitForTimeout(900)
  await foto(page, nome('fim'))
  await conferirLayout(page, 'fim')
  // Share: gera um PNG do reino com o recorde
  const [baixa] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), toca(page, 'postar')])
  const arq = path.join(fmt.toque ? FOTOS : (process.env.REINO_FOTOS_EXTRA || path.join(FOTOS, '..')), fmt.toque ? 'share-card.png' : '.share-pc.png')
  await baixa.saveAs(arq)
  const png = await readFile(arq)
  confere(baixa.suggestedFilename().endsWith('.png') && png.subarray(1, 4).toString() === 'PNG' && png.length > 3000 && png.length < 400 * 1024, `Share baixa um PNG do reino (${(png.length / 1024).toFixed(0)} KB)`)
  if (!fmt.toque) await (await import('node:fs/promises')).rm(arq, { force: true })
  // recorde continua depois de recarregar; Play again em 1 toque
  await toca(page, 'denovo')
  await fase(page, 'carta')
  v = await K(page, (k) => k.visao())
  confere(v.rodada === 1 && v.vidas === 3 && (await K(page, (k) => k.comandos())).length === 0, 'Play again: partida nova em 1 toque')
  await page.reload(); await page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
  confere((await K(page, (k) => k.guarda().recorde)) === g.recorde, 'o recorde continua guardado depois de recarregar')

  // ---------------------------------------------------------------- 10. álbum e conquistas
  await toca(page, 'menu')
  await page.waitForSelector('#tela:not([hidden])', { timeout: 5000 })
  await page.getByRole('button', { name: 'Album' }).click()
  await page.waitForSelector('#albumGrade', { timeout: 5000 })
  const alb = await page.evaluate(() => ({ total: document.querySelectorAll('#albumGrade .km-carta').length, livres: document.querySelectorAll('#albumGrade [data-livre="1"]').length, conta: document.getElementById('albumConta').textContent, prox: document.getElementById('albumProxima').textContent, chances: document.getElementById('albumChances').textContent }))
  const livresMotor = await K(page, (k) => k.liberadas().length)
  confere(alb.total === 30 && alb.livres === livresMotor && alb.livres >= 12, `álbum: 30 cartas, ${alb.livres} liberadas e ${alb.total - alb.livres} em silhueta ("${alb.prox}")`)
  confere(/Common 50%/.test(alb.chances) && /Legendary 1%/.test(alb.chances), 'álbum mostra a chance de cada raridade (números do motor)')
  await page.locator('#albumGrade [data-livre="1"]').first().click()
  confere(/\w/.test(await page.locator('#albumDetalhe').textContent()), 'tocar numa carta mostra nome, família e regra')
  if (fmt.toque) await foto(page, 'album-celular')
  const rol = await page.evaluate(() => ({ lado: document.documentElement.scrollWidth - innerWidth, caixa: document.getElementById('telaCaixa').getBoundingClientRect().right <= innerWidth }))
  confere(rol.lado <= 0 && rol.caixa, 'álbum cabe na largura da tela')
  await page.keyboard.press('Escape')
  confere(await page.locator('#tela').isHidden(), 'Esc fecha a tela')
  await toca(page, 'menu'); await page.getByRole('button', { name: 'Achievements' }).click()
  const feitas = await page.evaluate(() => [...document.querySelectorAll('#listaConquistas .km-feita')].map((e) => e.dataset.id))
  confere(feitas.includes('supper') && (await page.locator('#listaConquistas li').count()) === 12 && (await page.locator('#listaMelhores li').count()) >= 1, `conquistas: 12 na lista, ganhas: ${feitas.join(', ')}; melhores partidas à vista`)
  await page.locator('.km-x').click()
  confere(await page.locator('#tela').isHidden(), 'o X fecha a tela')

  // ---------------------------------------------------------------- 11. mudo e foco de teclado
  await toca(page, 'som')
  await page.waitForTimeout(250)
  const mudo = await K(page, (k) => ({ mudo: k.som().mudo, saida: k.som().saida, pico: 0 }))
  confere(mudo.mudo === true && mudo.saida < 0.01, `mudo cala a saída (ganho ${mudo.saida?.toFixed?.(3)})`)
  await page.reload(); await page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
  confere((await K(page, (k) => k.som().mudo)) === true, 'o mudo fica guardado')
  await toca(page, 'som')
  await page.keyboard.press('Tab')
  const foco = await page.evaluate(() => { const el = document.activeElement, st = getComputedStyle(el); return { tag: el.tagName, largura: parseFloat(st.outlineWidth), estilo: st.outlineStyle } })
  confere(foco.tag === 'BUTTON' && foco.largura >= 2 && foco.estilo !== 'none', `foco de teclado visível (${foco.tag}, contorno ${foco.largura}px ${foco.estilo})`)
  await page.keyboard.press('Escape')
  await page.locator('#bt-carta0').focus(); await page.keyboard.press('Enter')
  await page.locator('#bt-terreno3').focus(); await page.keyboard.press('Enter')
  confere((await K(page, (k) => k.visao().terrenos[2])) !== null, 'dá para jogar só com o teclado (Enter na carta, Enter no terreno)')

  // ---------------------------------------------------------------- 12. batalha cheia: tempo de quadro e limites de peso
  const cheia = await K(page, (k) => k.batalhaCheia())
  await page.waitForFunction(() => window.__keepmile.cena().vivos >= 60, null, { timeout: 20000 })
  await K(page, (k) => k.zerarMedidas())
  await page.waitForTimeout(1500)
  await foto(page, nome('batalha'))
  await page.waitForTimeout(3500)
  const q = await K(page, (k) => ({ ...k.quadros(), ...k.cena() }))
  confere(cheia.soldados + cheia.invasores >= 80, `batalha cheia: ${cheia.soldados} soldados × ${cheia.invasores} invasores (${q.bonecos} bonecos na cena)`)
  confere(q.n > 100 && q.intervalo < 20, `tempo de quadro com a batalha cheia: mediana ${q.intervalo.toFixed(1)} ms entre quadros (< 20), ${q.custo.toFixed(2)} ms de desenho (pior ${q.pior.toFixed(1)})`)
  confere(q.tremidaMax <= 6, `tremida de no máximo 6 px (${q.tremidaMax})`)
  let maxFlash = 0; for (const t of q.flashes) maxFlash = Math.max(maxFlash, q.flashes.filter((x) => x >= t && x < t + 1000).length)
  confere(maxFlash <= 3, `no máximo 3 clarões por segundo (${maxFlash}; ${q.flashes.length} no total)`)
  confere(q.picoParticulas <= q.limite && q.limite === (fmt.w < fmt.h ? 40 : 60), `partículas dentro do limite (pico ${q.picoParticulas} de ${q.limite})`)
  if (!fmt.toque) confere(Math.abs(q.camX) <= 30, `câmera acompanha a frente sem sair do quadro (${q.camX.toFixed(1)} px)`)
  await ctx.close()

  // ---------------------------------------------------------------- 13. Reduced motion (preferência do aparelho e botão)
  const ctxM = await novoCtx({ reducedMotion: 'reduce' })
  const p4 = await abrir(ctxM)
  confere((await K(p4, (k) => k.cena().menos)) === true, 'Reduced motion liga sozinho pela preferência do aparelho')
  await K(p4, (k) => k.batalhaCheia())
  await p4.waitForFunction(() => window.__keepmile.cena().vivos >= 60, null, { timeout: 20000 })
  await K(p4, (k) => k.zerarMedidas())
  await p4.waitForTimeout(4000)
  const qm = await K(p4, (k) => k.cena())
  confere(qm.tremidaMax === 0 && qm.flashes.length === 0 && qm.camX === 0 && qm.zoom === 1, `Reduced motion: sem tremida (${qm.tremidaMax}), sem flash (${qm.flashes.length}), câmera parada`)
  confere(qm.picoParticulas <= qm.limite && qm.limite === (fmt.w < fmt.h ? 20 : 30) && qm.filtro === '', `Reduced motion: partículas pela metade (pico ${qm.picoParticulas} de ${qm.limite})`)
  await K(p4, (k) => k.avancarBatalha())
  await fase(p4, 'carta')
  await toca(p4, 'menu')
  await p4.locator('#mMenos').click()
  confere((await K(p4, (k) => k.cena().menos)) === false && (await K(p4, (k) => k.guarda().menos)) === false, 'o botão Reduced motion desliga e fica guardado')
  await p4.locator('#mMenos').click()
  await p4.mouse.click(3, 3).catch(() => {})
  if (!(await p4.locator('#tela').isHidden())) await p4.keyboard.press('Escape')
  // só public/ e shared/; zero 404; zero erro
  const pedidos = await p4.evaluate(() => performance.getEntriesByType('resource').map((e) => new URL(e.name)).filter((u) => u.protocol.startsWith('http')).map((u) => u.pathname))
  const foraDaqui = pedidos.filter((p) => !/\/(public|shared)\//.test(p))
  confere(foraDaqui.length === 0, 'a página só pede arquivos de public/ e shared/' + (foraDaqui.length ? ' → ' + foraDaqui.slice(0, 4).join(', ') : ''))
  confere(pedidos.length > 0 && pedidos.every((p) => p.startsWith(SUB)), 'funciona em subpasta (todo pedido fica dentro dela)')
  await p4.close(); await ctxM.close()

  // ---------------------------------------------------------------- 14. sem o atlas: cada peça cai no desenho por código
  if (fmt.toque) {
    const ctxS = await novoCtx()
    await ctxS.route('**/arte/atlas.json', (r) => r.fulfill({ status: 404, body: '' }))
    const p5 = await abrir(ctxS, `?teste=1&semente=${SEM}`, { semAtlas: true })
    const o = await K(p5, (k) => ({ atlas: k.temAtlas(), origem: k.origem() }))
    confere(o.atlas === false && !Object.values(o.origem).includes('atlas'), 'sem o atlas a tela abre igual, com tudo por código ou peça provisória')
    await p5.waitForTimeout(500)
    await foto(p5, 'sem-atlas-celular')
    const r = await K(p5, (k) => k.jogarSozinho({ ateRodada: 6 }))
    confere(r.rodada >= 5 && (await K(p5, (k) => k.erros())).length === 0, `sem o atlas o robô joga até a rodada ${r.rodada} sem erro`)
    await p5.close(); await ctxS.close()
  }
  confere(ruins.length === 0, 'zero pedido com 404 ou falha' + (ruins.length ? ' → ' + ruins.slice(0, 5).join(' | ') : ''))
  confere(erros.length === 0, 'zero erro no console' + (erros.length ? ' → ' + erros.slice(0, 5).join(' | ') : ''))
}

/** Só o desenho: nada cortado nem sobreposto em outro tamanho de tela. */
async function soLayout(w, h, toque) {
  console.log(`\n=== desenho ${w}×${h} ===`)
  const erros = [], ruins = []
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: 1 })
  const page = await ctx.newPage(); vigiar(page, erros, ruins)
  await page.goto(base + `?teste=1&semente=${SEM}`)
  await page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
  const c = await K(page, (k) => k.cena())
  confere(c.tipo === (h > w ? 'celular' : 'pc') && Number.isInteger(c.e) && c.e >= 1, `${w}×${h}: desenho de ${c.tipo}, ampliação inteira ×${c.e}`)
  await page.waitForTimeout(500)
  await foto(page, `abertura-${w}x${h}`)
  await conferirLayout(page, `${w}×${h} abertura`)
  await page.locator('#bt-carta0').click(); await page.locator('#bt-terreno2').click()
  await conferirLayout(page, `${w}×${h} carta posta`)
  await page.locator('#bt-lutar').click()
  await page.waitForFunction(() => window.__keepmile.fase() === 'luta', null, { timeout: 10000 })
  await conferirLayout(page, `${w}×${h} batalha`)
  await K(page, (k) => k.avancarBatalha())
  await page.waitForFunction(() => window.__keepmile.modelo().vitoria?.pronto, null, { timeout: 15000 })
  await conferirLayout(page, `${w}×${h} espólio`)
  await foto(page, `espolio-${w}x${h}`)
  await K(page, (k) => k.jogarSozinho())
  await page.waitForFunction(() => window.__keepmile.modelo().fim?.contou, null, { timeout: 15000 })
  await conferirLayout(page, `${w}×${h} fim`)
  await foto(page, `fim-${w}x${h}`)
  confere(erros.length === 0 && ruins.length === 0, `${w}×${h}: zero erro e zero 404` + (erros.length + ruins.length ? ' → ' + [...erros, ...ruins].slice(0, 4).join(' | ') : ''))
  await ctx.close()
}

try {
  await rodar({ nome: 'celular', w: 360, h: 740, toque: true })
  await rodar({ nome: 'pc', w: 1280, h: 720, toque: false })
  await soLayout(390, 844, true)
  await soLayout(740, 360, true)
} catch (e) { falha('exceção: ' + (e?.stack || e)) }
await browser.close()
servidor.close()
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nREINO: tudo verde')
process.exit(falhas.length ? 1 : 0)
