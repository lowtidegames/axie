// Piloto (o jogo simples, docs/ideias/jogo-simples.md) — teste de tela da página separada public/piloto/, servida como arquivos
// parados numa SUBPASTA (como a página de teste). Celular 360×740 (toque) e PC 1280×720. Cinco telas: Egg, Team, Hunt (com a
// luta), Result e Collection. Confere: os 3 ovos com as chances do motor à vista ANTES de abrir, revelação em até 4 s e o
// monstro na coleção; montar o time por toque e arrasto; Hunt gasta 1 de energia por luta e para quando acaba; Stop para;
// sair da tela resolve as lutas que faltam; mesma semente = mesmo resultado; vencer abre o próximo lugar; cansaço depois de
// 7 lutas no dia e vida inicial de 75%; New day devolve; golpe Strong ×1,75 e resistido ×0,60 nos eventos do motor; ficha
// simples; cruzar mostra as chances antes e o filhote entra na coleção; mudo; Reduced motion sem tremida nem flash (sem ele:
// tremida ≤ 6 px, flash ≤ 3/s); nada cortado nem sobreposto; toque ≥ 44 px; zero erro de console, zero 404, só pede arquivos
// de public/ e shared/, funciona em subpasta. Fotos em tests/tela/fotos/piloto/.
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
// as fotos que ficam guardadas (as outras telas/formatos são conferidos sem foto)
const GUARDAR = new Set(['egg-celular', 'egg-open-celular', 'team-celular', 'hunt-celular', 'hunt-pc', 'battle-celular', 'result-celular', 'collection-pc', 'breed-celular'])
// sementes fixas: os mesmos ovos e as mesmas lutas sempre
const Q = '?semente=s1&ovo=o1'

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

async function foto(page, nome, { ja = false } = {}) {
  const pasta = GUARDAR.has(nome) ? FOTOS : process.env.PILOTO_FOTOS_EXTRA // as outras só saem se pedir uma pasta à parte
  if (!pasta) return
  // a foto espera a festa acabar (faíscas, aviso que some sozinho e entradas), para mostrar a tela parada
  if (!ja) await page.waitForFunction(() => !document.querySelector('#festa i') && (document.querySelector('#avisoFlutua')?.hidden ?? true) && document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity), null, { timeout: 8000 }).catch(() => {})
  const arq = path.join(pasta, nome + '.png')
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
    // com a ficha aberta, só ela conta (o fundo escuro cobre o resto)
    const ficha = document.querySelector('#gFundo:not([hidden])')
    const bts = [...(ficha ?? document).querySelectorAll('button')].filter(vis)
    const nome = (b) => b.id || b.textContent.trim().replace(/\s+/g, ' ').slice(0, 18) || b.className
    for (const b of bts) {
      const q = b.getBoundingClientRect()
      if (q.width < 44 - 0.5 || q.height < 44 - 0.5) out.pequenos.push(`${nome(b)} ${q.width.toFixed(0)}×${q.height.toFixed(0)}`)
      if (b.scrollWidth > b.clientWidth + 1) out.cortados.push(nome(b))
      if (q.right > vw + 0.5 || q.left < -0.5) out.fora.push(nome(b))
    }
    // as barras presas embaixo (abas do celular, botão principal do Team e do Breed) passam POR CIMA da lista, de propósito
    const fixo = (b) => b.closest('.barra-baixo') || b.closest('.abas')
    for (let i = 0; i < bts.length; i++) for (let j = i + 1; j < bts.length; j++) {
      if (bts[i].contains(bts[j]) || bts[j].contains(bts[i]) || fixo(bts[i]) || fixo(bts[j])) continue
      const a = bts[i].getBoundingClientRect(), c = bts[j].getBoundingClientRect()
      const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left), iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)
      if (ix > 1 && iy > 1) out.sobrepostos.push(`${nome(bts[i])} × ${nome(bts[j])}`)
    }
    for (const el of (ficha ?? document).querySelectorAll('h1, h2, .card b, .card .selo, .card__l, .c-lugar b, .r-num b, .energia, .marca b, .marca small, .aba, .o-chances li, .b-rotulo, .g-partes b')) if (vis(el) && el.scrollWidth > el.clientWidth + 1) out.cortados.push(el.textContent.trim())
    // o botão principal de cada tela tem de estar inteiro dentro da largura
    return out
  })
  confere(r.rolagem <= 0, `${onde}: sem rolagem para o lado (${r.rolagem})`)
  confere(r.pequenos.length === 0, `${onde}: todo botão com toque ≥ 44 px` + (r.pequenos.length ? ' → ' + r.pequenos.slice(0, 4).join(', ') : ''))
  confere(r.cortados.length === 0, `${onde}: nada cortado` + (r.cortados.length ? ' → ' + r.cortados.slice(0, 4).join(', ') : ''))
  confere(r.sobrepostos.length === 0, `${onde}: nenhum botão sobreposto` + (r.sobrepostos.length ? ' → ' + r.sobrepostos.slice(0, 4).join(', ') : ''))
  confere(r.fora.length === 0, `${onde}: nenhum botão fora da tela` + (r.fora.length ? ' → ' + r.fora.slice(0, 4).join(', ') : ''))
}

async function abrir(ctx, erros, ruins, q = Q) {
  const page = await ctx.newPage(); vigiar(page, erros, ruins)
  await page.goto(base + q)
  await page.waitForFunction(() => window.__piloto?.pronto, null, { timeout: 20000 })
  return page
}
const C = (page) => page.evaluate(() => window.__piloto.conta())
const H = (page) => page.evaluate(() => window.__piloto.caca())
const cena = (page) => page.evaluate(() => window.__piloto.cena)
const texto = async (page, sel) => (await page.locator(sel).first().textContent()).replace(/\s+/g, ' ').trim()

/**
 * Confere nos EVENTOS do motor as lutas da caçada atual: cada golpe de carta sem outro modificador (sem crítico, alvo não
 * Exposed, sem bordado de dano, carta sem bônus) tem o dano bruto = base × mult × (1 − armadura), com mult = 1,75 no Strong,
 * 0,60 no resistido e 1 no resto. Devolve as contagens e quantos golpes Strong NÃO bateriam com o +25% de sempre.
 */
const conferirMultiplicadores = (page) => page.evaluate(async () => {
  const { CARTAS } = await import(new URL('../../shared/config.js', location.href).href)
  const { bateForte } = await import(new URL('../../shared/batalha.js', location.href).href)
  const out = { forte: 0, resistido: 0, neutro: 0, erros: [], forteNaoBateCom25: 0, regras: null }
  for (let i = 0; i < 40; i++) {
    const luta = window.__piloto.lutaDaCaca(i)
    if (!luta) continue
    out.regras ??= { bonusDeTipo: luta.regras.bonusDeTipo, resistencia: luta.regras.resistencia }
    luta.passos.forEach((p, k) => {
      const antes = k === 0 ? luta.inicial : luta.passos[k - 1].estado
      for (const ev of p.eventos) {
        if (ev.t !== 'dano' || !ev.carta || ev.refletido || ev.critico || !ev.de) continue
        const c = CARTAS[ev.carta], usuario = antes.bonecos[ev.de], alvo = antes.bonecos[ev.alvo]
        const danos = c.efeitos.filter((x) => x.tipo === 'dano')
        if (danos.length !== 1 || danos[0].bonusFioSolto || danos[0].bonusSeMenosVida || danos[0].bonusTras) continue
        if (c.efeitos.some((x) => x.tipo === 'fioSolto') || alvo.fioSoltoAte >= antes.turno) continue
        if (['agulha_afiada', 'rancor'].includes(usuario.bordado)) continue
        const forte = bateForte(c.tipo, alvo.tipo), resistido = bateForte(alvo.tipo, c.tipo)
        let m = 1
        if (forte) m *= 1 + 0.75
        if (resistido) m *= 1 - 0.4
        m *= 1 - alvo.firmeza / 100
        const esperado = Math.round(danos[0].valor * m)
        if (ev.bruto !== esperado) out.erros.push(`${ev.carta} → ${ev.alvo}: ${ev.bruto} (esperado ${esperado})`)
        if (forte) { out.forte++; if (ev.bruto !== Math.round(danos[0].valor * 1.25 * (1 - alvo.firmeza / 100))) out.forteNaoBateCom25++ }
        else if (resistido) out.resistido++
        else out.neutro++
      }
    })
  }
  return out
})

async function rodar(fmt) {
  console.log(`\n=== ${fmt.nome} ${fmt.w}×${fmt.h} ===`)
  const erros = [], ruins = []
  const novoCtx = () => browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
  const clique = async (page, sel) => (fmt.toque ? page.locator(sel).first().tap() : page.locator(sel).first().click())
  const pc = !fmt.toque
  /** Abre os 3 ovos do começo (devolve o que nasceu) e fica na tela Team. */
  async function abrirOsOvos(page) {
    const nascidos = []
    for (let i = 0; i < 3; i++) {
      await page.waitForFunction(() => window.__piloto.ovo().fase === 'pronto', null, { timeout: 10000 })
      await clique(page, '#oAbrir')
      await page.waitForFunction(() => window.__piloto.ovo().fase === 'aberto', null, { timeout: 10000 })
      nascidos.push(await page.evaluate(() => window.__piloto.ovo()))
      await clique(page, '#oSeguir')
    }
    await page.waitForSelector('#time:not([hidden])')
    return nascidos
  }
  /** Caça até a energia acabar sem assistir: começa e sai da tela (as lutas que faltam são resolvidas na hora). */
  async function cacarTudo(page) {
    await clique(page, '.aba[data-cena="caca"]')
    await page.waitForSelector('#caca:not([hidden])')
    await clique(page, '#btCacar')
    await page.waitForSelector('#luta:not([hidden])')
    await clique(page, '.aba[data-cena="colecao"]')
    await page.waitForFunction(() => !window.__piloto.caca().rodando, null, { timeout: 30000 })
  }

  // ================================================================ 1. EGG: a primeira coisa do jogo
  const ctx = await novoCtx()
  const page = await abrir(ctx, erros, ruins)
  confere((await cena(page)) === 'ovo' && (await page.locator('#ovo').isVisible()), 'a primeira tela é o ovo')
  confere(!(await page.locator('#abas').isVisible()), 'antes de abrir os ovos não há outras telas')
  confere(/Pilot — numbers are being tested\./.test(await texto(page, '#avisoRegras')), 'aviso curto "Pilot — numbers are being tested."')
  const c0 = await C(page)
  confere(c0.ovos === 3 && c0.monstros.length === 0 && c0.energia === 20, `conta nova: 3 ovos, nenhum monstro, energia 20 (${c0.ovos}, ${c0.monstros.length}, ${c0.energia})`)
  // as chances na tela ANTES de abrir = as do motor (nada escrito à mão)
  const chances = await page.evaluate(async () => {
    const { PARAMS_COSTURA } = await import(new URL('../../shared/costura.js', location.href).href)
    const tela = Object.fromEntries([...document.querySelectorAll('#oChances li')].map((li) => [li.dataset.rar, li.querySelector('b').textContent]))
    const motor = Object.fromEntries(Object.entries(PARAMS_COSTURA.chancesDeRaridade).map(([k, v]) => [k, `${Math.round(v * 1000) / 10}%`]))
    return { tela, motor, vis: !document.querySelector('#oChances').hidden && !document.querySelector('#oAntes').hidden, soma: Object.values(PARAMS_COSTURA.chancesDeRaridade).reduce((a, b) => a + b, 0) }
  })
  confere(chances.vis && Object.keys(chances.motor).length === 4 && JSON.stringify(chances.tela) === JSON.stringify(chances.motor) && Math.abs(chances.soma - 1) < 1e-9, 'as 4 chances de raridade aparecem ANTES de abrir e são as do motor: ' + JSON.stringify(chances.tela))
  confere((await texto(page, '#oResta')) === 'Egg 1 of 3', '"Egg 1 of 3"')
  await conferirLayout(page, 'Egg')
  await foto(page, `egg-${fmt.nome}`)
  const somAntes = await page.evaluate(() => window.__piloto.som())
  confere(!somAntes.destravado && somAntes.tocados === 0, 'nenhum som antes do 1º toque')
  // abre o 1º ovo: revelação curta, o monstro entra na coleção
  await clique(page, '#oAbrir')
  await page.waitForFunction(() => window.__piloto.ovo().fase === 'aberto', null, { timeout: 10000 })
  const o1 = await page.evaluate(() => window.__piloto.ovo())
  const c1 = await C(page)
  confere(o1.ms <= 4000, `revelação do ovo em até 4 s (${o1.ms} ms)`)
  confere(c1.monstros.length === 1 && c1.monstros[0].nome === o1.ultimo.nome && c1.ovos === 2, `o monstro entra na coleção: ${o1.ultimo.nome} (${o1.ultimo.raridade})`)
  confere((await texto(page, '#oNome')) === o1.ultimo.nome && (await page.locator(`#oInfo .rar[data-rar="${o1.ultimo.raridade}"]`).count()) === 1, 'a tela mostra o nome, o elemento e a raridade que o motor sorteou')
  confere((await page.locator('#oMonstro').isVisible()) && /Next egg \(2 left\)/.test(await texto(page, '#oSeguir')), 'o monstro aparece e o botão leva ao próximo ovo')
  await conferirLayout(page, 'Egg aberto')
  await foto(page, `egg-open-${fmt.nome}`)
  const somDepois = await page.evaluate(() => window.__piloto.som())
  confere(somDepois.destravado && (somDepois.porNome.ovoRacha ?? 0) >= 1 && (somDepois.porNome.ovoNasce ?? 0) >= 1, 'som do ovo depois do toque (racha e nasce)')
  await clique(page, '#oSeguir')
  const resto = []
  for (let i = 0; i < 2; i++) {
    await page.waitForFunction(() => window.__piloto.ovo().fase === 'pronto', null, { timeout: 10000 })
    confere(await page.locator('#oChances').isVisible(), `ovo ${i + 2}: chances à vista antes de abrir`)
    await clique(page, '#oAbrir')
    await page.waitForFunction(() => window.__piloto.ovo().fase === 'aberto', null, { timeout: 10000 })
    resto.push(await page.evaluate(() => window.__piloto.ovo()))
    if (i === 1) confere(/starter monsters joined your collection/.test(await texto(page, '#oGanhou')) && /Build your team/.test(await texto(page, '#oSeguir')), 'depois do 3º ovo: a coleção inicial entra e o botão leva ao time')
    await clique(page, '#oSeguir')
  }
  await page.waitForSelector('#time:not([hidden])')
  const c2 = await C(page)
  const nascidos = [o1, ...resto].map((o) => o.ultimo)
  confere(c2.comecou && c2.ovos === 0 && c2.monstros.length === 9, `3 ovos abertos + coleção inicial = ${c2.monstros.length} monstros`)
  confere(c2.trio.join() === nascidos.map((n) => n.uid).join(), 'o time já vem com os 3 que nasceram dos ovos')
  confere(await page.locator('#abas').isVisible(), 'as outras telas aparecem depois dos ovos')

  // ================================================================ 2. TEAM
  const cartoes = await page.evaluate(() => [...document.querySelectorAll('#tSlots .t-slot')].map((s) => ({ pos: s.querySelector('.t-pos').textContent, nome: s.querySelector('.card b')?.textContent, img: !!s.querySelector('.card img.card__img'), el: !!s.querySelector('.card__l img'), rar: s.querySelector('.rar')?.dataset.rar, selo: s.querySelector('.selo')?.textContent })))
  confere(cartoes.map((x) => x.pos).join() === 'Front,Middle,Back', '3 lugares: Front, Middle, Back')
  confere(cartoes.every((x, i) => x.nome === nascidos[i].nome && x.img && x.el && x.rar === nascidos[i].raridade && x.selo === 'Fights today 0/7'), 'cada monstro mostra só desenho, nome, elemento, raridade e "Fights today 0/7"')
  confere((await page.locator('#tBanco .card').count()) === 9, 'a coleção inteira embaixo (9)')
  const txtTime = await page.locator('#time').innerText()
  confere(!/Strong vs|Weak to|Resists|Rush|Focus|Skill order|Tactic|Patrol|Renown|\bbest\b|yield|\bearn/i.test(txtTime), 'Team sem tática, sem ordem de habilidades e sem "Strong vs / Weak to / Resists"')
  // toque: um monstro da coleção, depois um lugar
  const fora = c2.monstros.find((m) => !c2.trio.includes(m.uid))
  await clique(page, `#tBanco .card[data-uid="${fora.uid}"]`)
  await clique(page, '#tSlots .t-slot[data-pos="1"] .card')
  let trio = (await C(page)).trio
  confere(trio[1] === fora.uid && trio[0] === c2.trio[0] && trio[2] === c2.trio[2], 'tocar num monstro e depois num lugar põe ele lá')
  // toque: dois lugares trocam entre si
  await clique(page, '#tSlots .t-slot[data-pos="0"] .card')
  await clique(page, '#tSlots .t-slot[data-pos="2"] .card')
  trio = (await C(page)).trio
  confere(trio[0] === c2.trio[2] && trio[2] === c2.trio[0], 'tocar em dois lugares troca os dois')
  if (pc) { // arrastar (mouse) também põe
    const a = await page.locator(`#tBanco .card[data-uid="${c2.trio[1]}"]`).boundingBox(), b = await page.locator('#tSlots .t-slot[data-pos="1"]').boundingBox()
    await page.mouse.move(a.x + 40, a.y + 40); await page.mouse.down(); await page.mouse.move(a.x + 20, a.y + 60, { steps: 4 }); await page.mouse.move(b.x + 40, b.y + 60, { steps: 6 }); await page.mouse.up()
    trio = (await C(page)).trio
    confere(trio[1] === c2.trio[1], 'arrastar um monstro até um lugar põe ele lá')
  }
  await conferirLayout(page, 'Team')
  await foto(page, `team-${fmt.nome}`)
  await page.close(); await ctx.close()

  // ================================================================ 3. HUNT + luta + 4. RESULT (assistindo, com Stop)
  const ctxB = await novoCtx()
  const p2 = await abrir(ctxB, erros, ruins)
  const nasc2 = await abrirOsOvos(p2)
  confere(nasc2.map((o) => `${o.ultimo.nome}:${o.ultimo.raridade}`).join() === nascidos.map((n) => `${n.nome}:${n.raridade}`).join(), 'mesma semente dos ovos = os mesmos 3 monstros: ' + nasc2.map((o) => `${o.ultimo.nome} (${o.ultimo.raridade})`).join(', '))
  await clique(p2, '#tCacar')
  await p2.waitForSelector('#caca:not([hidden])')
  const lugares = await p2.evaluate(() => [...document.querySelectorAll('#cLugares .c-lugar')].map((b) => ({ nome: b.querySelector('b').textContent, aberto: !b.disabled, guarda: b.querySelectorAll('.c-guarda img').length, sel: b.getAttribute('aria-pressed') })))
  confere(lugares.length === 5 && lugares.map((l) => l.aberto).join() === 'true,false,false,false,false', '5 lugares em fila, só o 1º aberto no começo')
  confere(lugares.every((l) => l.guarda === 3), 'cada lugar mostra os 3 elementos da guarda')
  confere(/^20\/20$/.test((await texto(p2, '#cEnergia')).replace(/\s/g, '')), 'energia 20/20 no topo')
  confere((await p2.locator('#caca button.bt').count()) === 1 && (await texto(p2, '#btCacar')) === 'Hunt', 'UM botão grande "Hunt"')
  confere((await p2.locator('#cDecidido').isVisible()) && (await texto(p2, '#cDecidido')) === 'The result of each fight is decided when it starts.', 'aviso "The result of each fight is decided when it starts." (antes da 1ª caçada)')
  await conferirLayout(p2, 'Hunt')
  await foto(p2, `hunt-${fmt.nome}`)
  await clique(p2, '#btCacar')
  await p2.waitForSelector('#luta:not([hidden])')
  const e1 = (await C(p2)).energia
  confere(e1 === 19, `a 1ª luta gasta 1 de energia ao começar (${e1})`)
  await p2.waitForSelector('.b-pop--dano', { timeout: 20000 })
  await p2.waitForSelector('.b-pop--forte', { timeout: 15000 }).catch(() => {}) // a foto prefere um golpe Strong
  await foto(p2, `battle-${fmt.nome}`, { ja: true })
  const txtLuta = await p2.locator('#luta').innerText()
  confere(!/decided|Turn \d|Glow|acts|Sun is high|Exposed|Nightfall/i.test(txtLuta), 'a luta sem textos explicativos por cima')
  confere((await p2.locator('#bHud .b-vida__barra').count()) === 6, 'barras de vida dos 6 monstros')
  await conferirLayout(p2, 'luta')
  await clique(p2, '#luta [data-vel="4"]')
  confere((await p2.evaluate(() => window.__piloto.batalha().vel)) === 4, 'acelerar: 4×')
  // o carimbo WIN/LOSS de 1 a 2 s com os pontos
  await p2.waitForSelector('#bCarimbo:not([hidden])', { timeout: 120000 })
  const car = { txt: await texto(p2, '#bCarimboTxt'), pts: await texto(p2, '#bCarimboPts') }
  const h1 = await H(p2)
  confere(car.txt === (h1.lutas[0].venceu ? 'WIN' : 'LOSS') && car.pts === (h1.lutas[0].venceu ? '+1 pt' : '+0 pts'), `carimbo da 1ª luta = resultado do motor: ${car.txt} ${car.pts}`)
  await p2.waitForSelector('#bCarimbo', { state: 'hidden', timeout: 5000 })
  const durCar = await p2.evaluate(() => window.__piloto.carimboMs)
  confere(durCar >= 1000 && durCar <= 2000, `carimbo fica de 1 a 2 s (${durCar} ms)`)
  // a caçada segue sozinha: a 2ª luta começa e gasta mais 1
  await p2.waitForFunction(() => window.__piloto.caca().lutas.length >= 2, null, { timeout: 20000 })
  confere((await C(p2)).energia === 18, '2ª luta: mais 1 de energia (18)')
  // Stop para
  await clique(p2, '#bParar')
  await p2.waitForSelector('#resultado:not([hidden])', { timeout: 20000 })
  const h2 = await H(p2), cB = await C(p2)
  confere(!h2.rodando && h2.lutas.length >= 2 && h2.lutas.length < 20 && cB.energia === 20 - h2.lutas.length, `Stop para a caçada: ${h2.lutas.length} lutas feitas, energia ${cB.energia}`)
  const v = h2.lutas.filter((l) => l.venceu).length, d = h2.lutas.length - v, pts = h2.lutas.reduce((s, l) => s + l.pontos, 0)
  await p2.waitForFunction(([a, b, c]) => document.querySelector('#rV').textContent === String(a) && document.querySelector('#rD').textContent === String(b) && document.querySelector('#rP').textContent === String(c), [v, d, pts], { timeout: 5000 }).catch(() => {})
  confere((await texto(p2, '#rV')) === String(v) && (await texto(p2, '#rD')) === String(d) && (await texto(p2, '#rP')) === String(pts), `resumo de 3 números: ${v} vitórias, ${d} derrotas, ${pts} pontos`)
  confere((await p2.locator('#resultado .r-num').count()) === 3, 'Result com exatamente 3 números')
  confere(cB.total.v === v && cB.total.d === d && cB.total.pontos === pts && h2.lutas.every((l) => l.pontos === (l.venceu ? 1 : 0)), 'pontos: vitória no lugar 1 vale 1, derrota vale 0')
  const tm = await p2.evaluate(() => window.__piloto.tremidaMax)
  confere(tm <= 6, `tremida ≤ 6 px (${tm})`)
  const fl = await p2.evaluate(() => window.__piloto.flashes())
  confere(!fl.some((t, i) => i > 0 && t - fl[i - 1] < 333), `flash ≤ 3 por segundo (${fl.length} flashes)`)
  const sons = await p2.evaluate(() => window.__piloto.som().porNome)
  confere(((sons.golpe ?? 0) + (sons.forte ?? 0) + (sons.critico ?? 0)) >= 1 && ((sons.carimboV ?? 0) + (sons.carimboD ?? 0)) >= 1, 'sons da luta: golpe e carimbo')
  if (h2.abriu) await p2.waitForFunction(() => getComputedStyle(document.querySelector('#rNovo')).opacity === '1' && document.querySelector('#rNovo').getAnimations().every((a) => a.playState === 'finished'), null, { timeout: 5000 })
  await conferirLayout(p2, 'Result')
  await foto(p2, `result-${fmt.nome}`)
  // mudo: nada mais toca
  await clique(p2, '#btSom')
  const m1 = await p2.evaluate(() => window.__piloto.som())
  await clique(p2, '#rTime'); await clique(p2, '.aba[data-cena="caca"]')
  const m2 = await p2.evaluate(() => window.__piloto.som())
  confere(m1.mudo && m2.tocados === m1.tocados && (await texto(p2, '#btSom')) === 'Sound: off', 'mudo: nenhum som toca e o botão diz "Sound: off"')
  await p2.reload(); await p2.waitForFunction(() => window.__piloto?.pronto)
  confere((await p2.evaluate(() => window.__piloto.som().mudo)) && (await C(p2)).energia === cB.energia, 'o mudo e a conta ficam guardados no aparelho')
  await p2.close(); await ctxB.close()

  // ================================================================ regras que continuam: determinismo, energia, cansaço, lugares
  const umaCacada = async () => {
    const cx = await novoCtx()
    const p = await abrir(cx, erros, ruins)
    await abrirOsOvos(p)
    await cacarTudo(p)
    return { cx, p, h: await H(p), c: await C(p) }
  }
  const A = await umaCacada(), B = await umaCacada()
  confere(A.h.lutas.length === 20 && A.c.energia === 0, `Hunt gasta 1 de energia por luta e para quando acaba: ${A.h.lutas.length} lutas, energia ${A.c.energia}`)
  confere(JSON.stringify(A.h.lutas) === JSON.stringify(B.h.lutas), 'mesma semente = mesmo resultado (20 lutas iguais): ' + A.h.lutas.map((l) => (l.venceu ? 'W' : 'L')).join(''))
  await B.p.close(); await B.cx.close()
  const p3 = A.p
  confere(A.h.lutas.map((l) => l.lutasHoje.join('')).join() === Array.from({ length: 20 }, (_, i) => `${i}${i}${i}`).join(), 'lutas do dia contadas antes de cada luta (0,0,0 … 19,19,19)')
  // cansaço: as 7 primeiras lutas com a vida cheia; da 8ª em diante o time começa com 75%
  const vidas = await p3.evaluate(() => [6, 7, 19].map((i) => Object.values(window.__piloto.lutaDaCaca(i).inicial.bonecos).map((b) => ({ t: b.time, v: b.vida, m: b.vidaMax }))))
  confere(vidas[0].every((b) => b.v === b.m), '7ª luta do dia: todos começam com a vida cheia')
  for (const k of [1, 2]) confere(vidas[k].filter((b) => b.t === 'A').every((b) => b.v === Math.max(1, Math.round(b.m * 0.75))) && vidas[k].filter((b) => b.t === 'B').every((b) => b.v === b.m), `${k === 1 ? '8ª' : '20ª'} luta do dia: o time cansado começa com 75% da vida; a guarda inteira: ` + vidas[k].map((b) => `${b.t} ${b.v}/${b.m}`).join(' '))
  // as regras do piloto nos eventos do motor
  const mult = await conferirMultiplicadores(p3)
  confere(JSON.stringify(mult.regras) === JSON.stringify({ bonusDeTipo: 0.75, resistencia: 0.4 }), 'a luta usa as regras do piloto (bônus 0,75, resistência 0,40): ' + JSON.stringify(mult.regras))
  confere(mult.forte >= 1 && mult.resistido >= 1 && mult.neutro >= 1 && mult.erros.length === 0, `golpes conferidos nos eventos: Strong ×1,75 (${mult.forte}), resistido ×0,60 (${mult.resistido}), normal ×1 (${mult.neutro})` + (mult.erros.length ? ' → ' + mult.erros.slice(0, 3).join(' | ') : ''))
  confere(mult.forteNaoBateCom25 >= 1, `os golpes Strong não bateriam com o +25% do jogo de sempre (${mult.forteNaoBateCom25})`)
  // saiu da tela no meio: as lutas restantes foram resolvidas e aparecem no resultado
  confere((await cena(p3)) === 'colecao' && (await p3.locator('.aba[data-cena="caca"].tem-novo').count()) === 1, 'sair da tela no meio: a caçada termina sozinha e a aba Hunt avisa')
  await clique(p3, '.aba[data-cena="caca"]')
  await p3.waitForSelector('#resultado:not([hidden])')
  const vA = A.h.lutas.filter((l) => l.venceu).length
  await p3.waitForFunction(([a, b]) => document.querySelector('#rV').textContent === String(a) && document.querySelector('#rD').textContent === String(b), [vA, 20 - vA], { timeout: 5000 }).catch(() => {})
  confere((await texto(p3, '#rV')) === String(vA) && (await texto(p3, '#rD')) === String(20 - vA), `o resultado mostra as 20 lutas: ${vA} W, ${20 - vA} L`)
  // vencer abre o próximo lugar, com a festa
  confere(vA >= 1 && A.c.abertos === 2 && A.h.abriu === 2, `vencer no lugar 1 abre o lugar 2 (${vA} vitórias)`)
  confere((await p3.locator('#rNovo').isVisible()) && /New place unlocked/.test(await texto(p3, '#rNovo')), 'festa "New place unlocked" no resultado')
  confere((await p3.locator('#rDeNovo').isDisabled()) && /No energy left/.test(await texto(p3, '#rPorque')), 'sem energia: "Hunt again" desligado, com o motivo')
  await p3.waitForFunction(() => document.querySelector('#rNovo').getAnimations().every((a) => a.playState === 'finished'), null, { timeout: 5000 })
  await conferirLayout(p3, 'Result (lugar novo)')
  await clique(p3, '.aba[data-cena="time"]'); await clique(p3, '.aba[data-cena="caca"]')
  const lug2 = await p3.evaluate(() => [...document.querySelectorAll('#cLugares .c-lugar')].map((b) => !b.disabled))
  confere(lug2.join() === 'true,true,false,false,false' && (await p3.locator('#btCacar').isDisabled()), 'Hunt: o lugar 2 abriu; sem energia o botão Hunt fica desligado')
  // cansaço na tela: Tired nos 3 do time, os outros descansados
  await clique(p3, '.aba[data-cena="time"]')
  const selos = await p3.evaluate(() => ({ time: [...document.querySelectorAll('#tSlots .selo')].map((s) => s.textContent), banco: [...document.querySelectorAll('#tBanco .card:not(.no-time) .selo')].map((s) => s.textContent) }))
  confere(selos.time.join() === 'Tired,Tired,Tired' && selos.banco.length === 6 && selos.banco.every((s) => s === 'Fights today 0/7'), 'depois de 7 lutas no dia o monstro aparece "Tired"; quem não lutou segue "Fights today 0/7"')
  // New day devolve a energia e o descanso
  await clique(p3, '#btNovoDia')
  const cD = await C(p3)
  confere(cD.energia === 20 && cD.dia === 2 && cD.monstros.every((m) => m.hoje === 0) && cD.total.v === vA && cD.abertos === 2, '"New day" devolve a energia e o descanso (pontos e lugares ficam)')
  confere((await p3.locator('#tSlots .selo').allTextContents()).join() === 'Fights today 0/7,Fights today 0/7,Fights today 0/7', 'depois do New day: "Fights today 0/7"')
  // escolher o lugar 2 e caçar lá: vitória vale 2
  await clique(p3, '.aba[data-cena="caca"]')
  await clique(p3, '#cLugares .c-lugar[data-n="2"]')
  confere((await C(p3)).lugar === 2, 'tocar no lugar aberto escolhe ele')
  await clique(p3, '#btCacar'); await p3.waitForSelector('#luta:not([hidden])'); await clique(p3, '.aba[data-cena="colecao"]')
  await p3.waitForFunction(() => !window.__piloto.caca().rodando, null, { timeout: 30000 })
  const hL2 = await H(p3)
  confere(hL2.n === 2 && hL2.lutas.length === 20 && hL2.lutas.every((l) => l.pontos === (l.venceu ? 2 : 0)), 'no lugar 2 a vitória vale 2 pontos')

  // ================================================================ 5. COLLECTION, ficha e Breed
  await clique(p3, '.aba[data-cena="colecao"]')
  confere((await p3.locator('#gGrade .card').count()) === 9, 'Collection: grade com os 9 monstros')
  await conferirLayout(p3, 'Collection')
  await foto(p3, `collection-${fmt.nome}`)
  const alvo = (await C(p3)).monstros[0]
  await clique(p3, `#gGrade .card[data-uid="${alvo.uid}"]`)
  await p3.waitForSelector('#gFundo:not([hidden])')
  const ficha = await p3.locator('#gFicha').innerText()
  confere(ficha.includes(alvo.nome) && /Body[\s\S]*Head[\s\S]*Arms[\s\S]*Legs[\s\S]*Mark/.test(ficha) && new RegExp(`${alvo.lutas}\\s*/1,200`).test(ficha) && /0\s*\/5\s*Clutches/.test(ficha.replace(/\n/g, ' ')), `ficha simples: nome, elemento, raridade, 5 partes, lutas ${alvo.lutas}/1,200, Clutches 0/5`)
  confere(!(await p3.locator('#gRetire').isVisible()) && (await p3.locator('#gBreed').isVisible()), '"Retire" só aparece no fim da vida; "Breed" à mão')
  confere(!/Strong hits|Renown|Titles|Share|Story/i.test(ficha), 'ficha sem Renome, títulos nem cartão para postar')
  await conferirLayout(p3, 'ficha')
  await foto(p3, `card-${fmt.nome}`)
  await p3.keyboard.press('Escape')
  confere(!(await p3.locator('#gFundo').isVisible()), 'a ficha fecha com Esc')
  await clique(p3, `#gGrade .card[data-uid="${alvo.uid}"]`); await clique(p3, '#gX')
  confere(!(await p3.locator('#gFundo').isVisible()), 'a ficha fecha no X')
  await clique(p3, `#gGrade .card[data-uid="${alvo.uid}"]`); await p3.mouse.click(4, 4)
  confere(!(await p3.locator('#gFundo').isVisible()), 'a ficha fecha clicando fora')
  // Breed: escolher dois → chances por parte ANTES → ovo → abre como na tela Egg
  await clique(p3, '#gCruzar')
  await p3.waitForSelector('#xCruzar:not([hidden])')
  confere((await p3.locator('#xFazer').isDisabled()) && !(await p3.locator('#xChances').isVisible()), 'Breed: sem dois escolhidos não há botão nem chances')
  const cM = await C(p3)
  const [pa, pb] = [cM.monstros[3], cM.monstros[4]]
  await clique(p3, `#xPais .card[data-uid="${pa.uid}"]`); await clique(p3, `#xPais .card[data-uid="${pb.uid}"]`)
  const cruza = await p3.evaluate(() => ({ vis: !document.querySelector('#xChances').hidden, linhas: [...document.querySelectorAll('#xChances .x-linha')].map((l) => ({ parte: l.querySelector('b').textContent, soma: [...l.querySelectorAll('em')].reduce((s, e) => s + parseFloat(e.textContent), 0), n: l.querySelectorAll('li').length })) }))
  confere(cruza.vis && cruza.linhas.map((l) => l.parte).join() === 'Body,Head,Arms,Legs,Mark' && cruza.linhas.every((l) => l.n >= 1 && Math.abs(l.soma - 100) < 0.6), 'Breed: a chance de cada parte na tela ANTES de fazer o ovo (cada parte soma 100%)')
  confere((await C(p3)).monstros.length === 9 && !(await p3.locator('#xFazer').isDisabled()), 'nada decidido antes de confirmar; o botão liga com dois escolhidos')
  await conferirLayout(p3, 'Breed')
  await foto(p3, `breed-${fmt.nome}`)
  await clique(p3, '#xFazer')
  await p3.waitForFunction(() => window.__piloto.cena === 'ovo' && window.__piloto.ovo().fase === 'pronto', null, { timeout: 10000 })
  confere((await p3.evaluate(() => window.__piloto.ovo().modo)) === 'cruza' && (await C(p3)).ovos === 1, 'o cruzamento vira um ovo, que abre na tela Egg')
  await clique(p3, '#oAbrir')
  await p3.waitForFunction(() => window.__piloto.ovo().fase === 'aberto', null, { timeout: 10000 })
  const oF = await p3.evaluate(() => window.__piloto.ovo())
  const cF = await C(p3)
  const filho = cF.monstros.find((m) => m.uid === oF.ultimo.uid)
  confere(oF.ms <= 4000 && cF.monstros.length === 10 && filho && filho.pais.slice().sort().join() === [pa.uid, pb.uid].sort().join(), `o filhote entra na coleção (${oF.ultimo.nome}, ${oF.ms} ms) com os dois pais`)
  confere(cF.monstros.find((m) => m.uid === pa.uid).voltas === 1 && cF.monstros.find((m) => m.uid === pb.uid).voltas === 1, 'cada pai gastou 1 clutch')
  await clique(p3, '#oSeguir')
  await p3.waitForSelector('#colecao:not([hidden])')
  confere((await p3.locator('#gGrade .card').count()) === 10 && (await p3.locator('#gGrade .card b').allTextContents()).includes(oF.ultimo.nome), 'o filhote aparece na Collection')
  // textos proibidos em toda a página
  const tudo = await p3.evaluate(() => document.body.innerText)
  confere(!/\bbest\b|\byield\b|\bearn/i.test(tudo), 'nada de "best", "yield", "earn"')
  // Reset pilot: volta ao começo
  await clique(p3, '#btReset'); await clique(p3, '#btReset')
  const cR = await C(p3)
  confere((await cena(p3)) === 'ovo' && cR.ovos === 3 && cR.monstros.length === 0 && cR.energia === 20, '"Reset pilot" (2 toques) volta ao começo: 3 ovos')
  await p3.close(); await A.cx.close()

  // ================================================================ Reduced motion: sem tremida e sem flash
  const ctxM = await novoCtx()
  const p4 = await abrir(ctxM, erros, ruins)
  await clique(p4, '#btMenos')
  confere((await p4.evaluate(() => window.__piloto.menos())) && (await texto(p4, '#btMenos')) === 'Reduced motion: on', 'Reduced motion ligado')
  const nasc4 = await abrirOsOvos(p4)
  confere(nasc4.every((o) => o.ms <= 4000), 'Reduced motion: o ovo abre em até 4 s')
  confere((await p4.evaluate(() => document.querySelectorAll('#festa i').length)) === 0, 'Reduced motion: nenhuma faísca')
  await clique(p4, '#tCacar'); await clique(p4, '#btCacar')
  await p4.waitForSelector('#luta:not([hidden])')
  await clique(p4, '#luta [data-vel="4"]')
  await p4.waitForSelector('#bCarimbo:not([hidden])', { timeout: 120000 })
  const anim = await p4.evaluate(() => getComputedStyle(document.querySelector('#bCarimbo b')).animationName)
  await clique(p4, '#bParar')
  await p4.waitForSelector('#resultado:not([hidden])', { timeout: 20000 })
  confere((await p4.evaluate(() => window.__piloto.tremidaMax)) === 0, 'Reduced motion: nenhuma tremida')
  confere((await p4.evaluate(() => window.__piloto.flashes().length)) === 0, 'Reduced motion: nenhum flash')
  confere(anim === 'aparece', `Reduced motion: o carimbo só aparece, sem batida (${anim})`)
  // foco de teclado visível
  await p4.keyboard.press('Tab')
  const foco = await p4.evaluate(() => { const el = document.activeElement, s = getComputedStyle(el); return { tag: el.tagName, largura: parseFloat(s.outlineWidth), estilo: s.outlineStyle } })
  confere(foco.tag === 'BUTTON' && foco.largura >= 2 && foco.estilo !== 'none', `foco de teclado visível (${foco.tag}, contorno ${foco.largura}px ${foco.estilo})`)
  // só public/ e shared/; zero 404; zero erro
  const pedidos = await p4.evaluate(() => performance.getEntriesByType('resource').map((e) => new URL(e.name)).filter((u) => u.protocol.startsWith('http')).map((u) => u.pathname))
  const foraDaqui = pedidos.filter((p) => !/\/(public|shared)\//.test(p))
  confere(foraDaqui.length === 0, 'a página só pede arquivos de public/ e shared/' + (foraDaqui.length ? ' → ' + foraDaqui.slice(0, 4).join(', ') : ''))
  confere(pedidos.length > 0 && pedidos.every((p) => p.startsWith(SUB)), 'funciona em subpasta (todo pedido fica dentro dela)')
  await p4.close(); await ctxM.close()
  confere(ruins.length === 0, 'zero pedido com 404 ou falha' + (ruins.length ? ' → ' + ruins.slice(0, 5).join(' | ') : ''))
  confere(erros.length === 0, 'zero erro no console' + (erros.length ? ' → ' + erros.slice(0, 5).join(' | ') : ''))
}

try {
  await rodar({ nome: 'celular', w: 360, h: 740, toque: true })
  await rodar({ nome: 'pc', w: 1280, h: 720, toque: false })
} catch (e) { falha('exceção: ' + (e?.stack || e)) }
await browser.close()
servidor.close()
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nPILOTO: tudo verde')
process.exit(falhas.length ? 1 : 0)
