// Keepmile (jogo de reino) — teste de tela de public/reino/, servida como arquivos parados numa SUBPASTA. Celular 360×740 (toque)
// e PC 1280×720; o desenho também é conferido em 390×844, 740×360 deitado, 320×640 e 320×568. Confere: abre direto no jogo com 3 cartas em < 5 s;
// pôr carta por toque e por arrasto; a batalha roda até o fim e o resultado da tela = o do motor (`reproduzir` com os comandos dá o
// mesmo); mesma semente = mesma partida; subir de nível mostra a festa; perder vida; chefe na rodada 5 com anúncio e noite; fim com
// recorde guardado, Play again e Share (PNG); partida inteira pelo robô ganancioso do motor sem erro; álbum e conquistas; som nos
// eventos certos, nada antes do primeiro toque, mudo cala, amostra + código somados; Reduced motion sem tremida nem flash (sem ele:
// tremida ≤ 6 px, flash ≤ 3/s, partículas no limite); tempo de quadro com 80+ bonecos; nada cortado nem sobreposto; toque ≥ 44 px;
// foco de teclado; sem atlas cai no desenho por código; zero erro de console, zero 404, só public/ e shared/, funciona em subpasta.
// R13 (polimento 1): chances à vista, dica única e toque que explica, nomes novos, fila de festas (uma por vez, 0,4 s, a maior por
// último, nada por cima do chefe), espólio com efeito/texto/ícone próprio, derrota "quase", queda do chefe em câmera lenta, resumo da
// luta, horda legível, nível "antes > depois", fim de tela cheia com liga provisória, Best runs no menu, marcas de nível, anúncio curto
// do chefe, partida que volta depois de recarregar, "REPLACE?" no espólio, duas abas sem apagar, telas pequenas legíveis.
// R17 (polimento 2, função `r17`): toque repetido não confirma, fim guardado na hora em que o motor decide, link de amigo que pergunta
// e é a MESMA ESTRADA (só o álbum inicial), relíquias no HUD, duas abas na mesma partida, foco depois de mudar de fase, fim em
// sequência (com e sem recorde, e com Reduced motion), horda legível, conquista só depois do espólio, telas na letra do jogo, cartão
// de compartilhar, guia do ouro parado, volume; fotos de cada festa em dupla (antes e pico) e o registro da fila em fotos/reino/festas.txt.
// R30 (função `r30`): o brilho da carta RARA antes de virar, com uma mão que TEM rara (álbum cheio pelo gancho de teste + semente
// achada com o motor): a moldura na cor da raridade pulsa em volta do verso, some quando a carta abre, e não existe com Reduced motion.
// R39 (função `r39`, 390×844, 1280×720 e 1920×1080): a VITÓRIA na rodada 20 — meta "HOLD TO ROUND 20" à vista e selo "HELD" depois;
// a festa do reino dispara UMA vez, na passagem (faixa, fogos, confete, música), segura 1,5–2,5 s, pula com um toque e, com Reduced
// motion, é só a faixa; fim "THE KINGDOM HELD" × "RUN OVER"; cartão com faixa; selo nas melhores partidas — e as 30 CONQUISTAS em 4
// grupos pela regra comum (as 12 antigas do aparelho ficam, os degraus ligam pelas rodadas guardadas, barra "123 / 200").
// Só uma parte: REINO_SO=celular|pc|r17celular|r17pc|desenho|r30|r31|r39 (a bateria completa é sem a variável).
// Fotos em tests/tela/fotos/reino/.
// Rode pela trava:  node tools/trava-robos.mjs rodar "timeout 800 node tests/tela/reino.e2e.mjs"
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as CFG from '../../shared/reino/config.js'
import { aplicar, chancesDaMao, criarPartida, visao as visaoDoMotor } from '../../shared/reino/partida.js'
import { GRUPOS, LISTA } from '../../shared/reino/conquistas.js'
import { escolher } from '../../shared/reino/robos.js'
import { LIGAS, ligaDe, mediaDasMelhores } from '../../public/reino/js/ligas.js'
import { CONQUISTAS as CONQUISTAS_TELA, T } from '../../public/reino/js/textos.js'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const FOTOS = path.join(RAIZ, 'tests', 'tela', 'fotos', 'reino')
const SUB = '/algum-nome/'
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' }
const GUARDAR = new Set(['mao-revelacao-1-celular', 'mao-revelacao-2-celular', 'rodada1-celular', 'abertura-celular', 'mao-celular', 'batalha-celular', 'batalha-pc', 'chefe-pc', 'nivel-celular', 'espolio-celular', 'derrota-celular', 'fim-celular', 'fim-pc', 'album-celular', 'share-card',
  'fila-festas-celular', 'espolio-reliquia-celular', 'derrota-quase-celular', 'chefe-cai-pc', 'resumo-celular', 'fim-festa-celular', 'fim-festa-pc', 'share-card-dia',
  // R17: as festas em dupla (antes e pico) e as provas dos itens novos
  'festa-nivel-antes-celular', 'festa-nivel-pico-celular', 'festa-vitoria-antes-celular', 'festa-vitoria-pico-celular', 'festa-chefe-antes-celular', 'festa-chefe-pico-celular',
  'festa-fim-recorde-antes-celular', 'festa-fim-recorde-pico-celular', 'festa-fim-sem-recorde-antes-celular', 'festa-fim-sem-recorde-pico-celular',
  'horda-legivel-celular', 'horda-legivel-pc', 'album-pixel-celular', 'menu-pixel-celular', 'link-amigo-celular', 'link-amigo-pergunta-celular', 'primeira-partida-celular', '320x568-espolio',
  'replace-celular', 'reliquias-hud-celular', 'guia-ouro-celular', 'conquistas-pixel-celular',
  'mao-rara-brilho-celular', // R30
  'mao-chances-inicial-celular', 'mao-chances-album-cheio-celular', 'album-chances-celular', 'fim-sem-recorde-celular', // R31
  'r39-meta-celular', 'r39-meta-pc', 'r39-festa-celular', 'r39-festa-pc', 'r39-festa-reduced-celular', 'r39-selo-celular', 'r39-fim-vitoria-celular', 'r39-fim-vitoria-pc', 'r39-fim-sem-vitoria-celular', 'r39-fim-sem-vitoria-pc', 'r39-conquistas-celular', 'r39-conquistas-pc', 'r39-melhores-celular']) // R39
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
  page.on('console', (m) => { if (m.type() === 'warning' && /willReadFrequently/.test(m.text())) erros.push('aviso: ' + m.text().slice(0, 80)); if (m.type() === 'error' && !(atlas(m.location()?.url || '') || (semAtlas && /404/.test(m.text())))) erros.push('console: ' + m.text()) })
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
const viu = (page) => K(page, (k) => k.desenhou())
/** A interface desenhou a etiqueta? (espera até 2 s pelo próximo quadro) */
const viuJa = (page, tag) => page.waitForFunction((t) => window.__keepmile.desenhou().includes(t), tag, { timeout: 2000 }).then(() => true, () => false)
const fase = (page, f, prazo = 20000) => page.waitForFunction((x) => window.__keepmile.fase() === x, f, { timeout: prazo })

/** R38 (item 3) — a linha das chances ("ODDS THIS HAND") não toca em nenhuma seta de terreno (a do terreno vazio e a do terreno em
 *  destaque), nem passa por cima do botão de sortear ou do de consertar. Retângulos em px de arte, do último quadro desenhado. */
async function chancesSemSeta(page, onde, { pedeDesvio = false } = {}) {
  await page.waitForTimeout(120)
  const r = await page.evaluate(() => {
    const C = window.__kmCena, z = C.zonaChances, toca = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    if (!z) return null
    const setas = C.setas.map((s) => ({ ...s })), bts = ['sortear', 'consertar'].map((id) => document.getElementById('bt-' + id)).filter(Boolean).map((b) => { const q = b.getBoundingClientRect(); return { id: b.id, x: q.x / C.css, y: q.y / C.css, w: q.width / C.css, h: q.height / C.css } })
    return { n: z.linhas.length, zona: [z.x, z.y, z.w, z.h], setas: setas.length, vazio5: setas.some((s) => s.k === 5 && s.tipo === 'vazio'), cruzam: setas.filter((s) => z.linhas.some((l) => toca(l, s)) || (C.tipo === 'celular' && toca(z, s))).map((s) => `${s.tipo} do terreno ${s.k}`), botoes: bts.filter((b) => z.linhas.some((l) => toca(l, b))).map((b) => b.id), desviada: C.med.setaDesviada, folga: Math.min(...setas.map((s) => (s.y >= z.y + z.h ? s.y - z.y - z.h : s.y + s.h <= z.y ? z.y - s.y - s.h : 1e9))) }
  })
  confere(!!r && r.setas > 0 && r.cruzam.length === 0 && r.botoes.length === 0 && (!pedeDesvio || r.desviada > 0), `R38: ${onde}: a linha das chances (${r?.n} linha(s), zona ${r?.zona.join(',')}) não cruza nenhuma das ${r?.setas} setas de terreno` + (r?.cruzam.length ? ' → cruza: ' + r.cruzam.join(', ') : '') + (r?.botoes.length ? ' → por cima do botão: ' + r.botoes.join(', ') : '') + (pedeDesvio ? ` (a seta do destaque desviou em ${r?.desviada} quadros)` : ''))
}

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
  const novoCtx = (extra = {}) => browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1, reducedMotion: 'no-preference', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'], ...extra })
  const toca = async (page, id) => { const l = page.locator('#bt-' + id); if (fmt.toque) await l.tap(); else await l.click() }
  const abrir = async (ctx, q = `?teste=1&nova=1&semente=${SEM}`, opc = {}) => {
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
  // R13 item 1: chances de raridade junto do botão de sortear, já no primeiro sorteio.
  // R31 (a regra mudou: veto do guardião, "chance sempre verdadeira"): antes conferia a tabela fixa do config; agora são as do MOTOR
  // para as cartas desta partida — álbum inicial: só Common e Uncommon (as de 0% não aparecem).
  // R34 (a regra mudou: achado da segurança): é a chance da MÃO, que não repete carta — rodada 1 (3 Tropas comuns, 2 incomuns) = 54/46
  confere(JSON.stringify(m.chances.map((c) => [c.id, c.chance])) === JSON.stringify([['C', 54], ['U', 46]]) && JSON.stringify(m.chances.map((c) => [c.id, c.chance])) === JSON.stringify(v0.chances.filter((c) => c.chance > 0).map((c) => [c.id, c.chance])) && (await viuJa(page, 'chances')), `chances do sorteio à vista junto do botão de sortear, as do motor (${m.chances.map((c) => c.nome + ' ' + c.chance + '%').join(' ')})`)
  // R13 item 3: os nomes novos (do config) na tela; nenhum nome antigo
  const rotulos = await page.evaluate(() => [...document.querySelectorAll('#toques button')].map((b) => b.getAttribute('aria-label')).join(' | '))
  const nomes = JSON.stringify([Object.values(CFG.CARTAS).map((c) => c.nome + c.texto), Object.values(CFG.INVASORES).map((c) => c.nome + c.texto), CFG.CHEFES.map((c) => c.nome + c.texto)])
  confere(/Fuse Runner/.test(rotulos) && ['Fuse Runner', 'Scoffer', 'Tick & Tock', 'Mole Digger'].every((n) => nomes.includes(n)) && !/Squib|Muncher|Nip & Tuck|Mole Raider/.test(nomes + rotulos), 'nomes novos na tela e no config (Fuse Runner, Scoffer, Tick & Tock, Mole Digger); nenhum antigo')
  await page.waitForTimeout(700)
  await foto(page, nome('abertura'))
  await chancesSemSeta(page, 'abertura')
  await conferirLayout(page, 'abertura')

  // ---------------------------------------------------------------- R27, item 6: as 3 cartas chegam VIRADAS e viram em cascata
  {
    await page.keyboard.press('Shift')
    const toques = async () => (await sons(page)).filter((n) => n === 'toque').length, s0 = await toques(), R = await K(page, (k) => k.revela())
    await K(page, (k) => k.maoNova())
    const viradas = await page.waitForFunction(() => window.__keepmile.modelo().maoViradas === 3, null, { timeout: 1500, polling: 10 }).then(() => true, () => false)
    confere(viradas && (await viuJa(page, 'maoVirada')), 'R27: a mão chega com as 3 cartas viradas')
    const abriu = await page.waitForFunction(() => { const m = window.__keepmile.modelo(); return m.maoViradas === 0 && m.maoRevelada }, null, { timeout: 3000, polling: 10 }).then(() => true, () => false)
    const log = (await modelo(page)).maoLog, d1 = log[1] - log[0], d2 = log[2] - log[1]
    confere(abriu && log.length === 3 && d1 >= R.passo - 50 && d1 <= R.passo + 110 && d2 >= R.passo - 50 && d2 <= R.passo + 110 && R.passo === 120, `R27: viram em cascata, uma depois da outra (${d1} e ${d2} ms entre elas; passo de ${R.passo} ms)`)
    await page.waitForTimeout(150)
    confere((await toques()) - s0 === 3, `R27: um som para cada carta que vira (${(await toques()) - s0})`)
    // toque no meio da revelação: as três aparecem na hora e a carta tocada é escolhida (nunca se escolhe carta virada)
    await K(page, (k) => k.maoNova())
    await toca(page, 'carta0')
    { const m2 = await modelo(page); await page.waitForTimeout(60); confere(m2.sel === 0 && m2.maoRevelada && (await modelo(page)).maoViradas === 0, 'R27: tocar numa carta no meio da revelação abre as três e escolhe a tocada') }
    await toca(page, 'carta0')
    if (fmt.toque) {
      // 2 quadros da revelação (o relógio dela parado): todas viradas; a 1ª aberta, a 2ª no meio da virada, a 3ª ainda virada
      const mao = (await modelo(page)).mao, rara = mao.some((c) => CFG.RARIDADES.findIndex((r) => r.id === CFG.CARTAS[c.carta].raridade) >= 2)
      await K(page, (k) => k.maoFixar(240)); await page.waitForTimeout(120)
      confere((await modelo(page)).maoViradas === 3 && (!rara || (await viuJa(page, 'maoRara'))), `R27: quadro 1 — as 3 viradas${rara ? ', a rara com o brilho da raridade antes de virar' : ' (nenhuma rara nesta mão)'}`)
      await foto(page, 'mao-revelacao-1-celular')
      await K(page, (k, R) => k.maoFixar(R.espera + R.passo + R.vira * 0.75), R); await page.waitForTimeout(120)
      confere((await modelo(page)).maoViradas === 1, 'R27: quadro 2 — a 1ª aberta, a 2ª abrindo, a 3ª ainda virada')
      await foto(page, 'mao-revelacao-2-celular')
      await K(page, (k) => k.maoFixar(null)); await page.waitForTimeout(80)
    }
    // Reduced motion: aparecem já viradas para a frente, sem som de virada
    const ctxR = await novoCtx({ reducedMotion: 'reduce' }), pr = await abrir(ctxR, `?teste=1&nova=1&semente=${SEM}`)
    await pr.keyboard.press('Shift')
    const t0 = (await sons(pr)).filter((n) => n === 'toque').length
    await K(pr, (k) => k.maoNova())
    let nunca = true
    for (let i = 0; i < 8; i++) { const mr = await modelo(pr), d = await viu(pr); if (mr.maoViradas !== 0 || d.includes('maoVirada')) nunca = false; await pr.waitForTimeout(60) }
    confere(nunca && (await modelo(pr)).maoLog.length === 0 && (await sons(pr)).filter((n) => n === 'toque').length === t0, 'R27: com Reduced motion as cartas aparecem já abertas (sem virada e sem som de virada)')
    await pr.close(); await ctxR.close()
  }

  // ---------------------------------------------------------------- 2. escolher e pôr a carta
  const qual = Math.max(0, ['T02', 'T01', 'T07', 'T04'].map((c) => m.mao.findIndex((x) => x.carta === c)).find((i) => i >= 0) ?? 0) // uma tropa de luta comprida, para dar tempo de ver e ouvir
  await toca(page, 'carta' + qual)
  m = await modelo(page)
  confere(m.sel === qual, 'tocar na carta escolhe (sobe com aura)')
  // R13 itens 2 e 11: a carta escolhida explica os pinos (nível) e a moldura (raridade) e mostra a faixa da família "0/3 > 1/3"
  { const c = CFG.CARTAS[m.mao[qual].carta], fam = CFG.FAMILIAS[c.familia], inf = (m.infoSel || []).join(' | ')
    confere(inf.includes(c.texto) && inf.includes(`LEVEL 1 OF ${CFG.PARTIDA.nivelMax}`) && inf.includes(CFG.RARIDADES.find((r) => r.id === c.raridade).nome) && inf.includes(`${fam.nome} 0/${fam.terrenos} > 1/${fam.terrenos}`) && (await viuJa(page, 'infoCarta')), `carta escolhida: texto, pinos = nível, moldura = raridade e a faixa da família ("${(m.infoSel || []).at(-1)}")`) }
  await page.waitForTimeout(350)
  await foto(page, nome('mao'))
  await chancesSemSeta(page, 'carta escolhida (terrenos em destaque)')
  await toca(page, 'terreno1')
  let v = await K(page, (k) => k.visao())
  confere(v.terrenos[0]?.carta === m.mao[qual].carta && v.cartaPosta, `tocar no terreno põe a carta (${v.terrenos[0]?.carta} no terreno 1)`)
  confere((await page.locator('#bt-carta0').count()) === 0 && (await page.locator('#bt-lutar2').count()) === 1, 'depois de pôr: a mão some e sobra o botão de batalha')
  let s = await sons(page)
  confere(s.includes('cartaEscolhe') && s.includes('cartaPoe'), 'som ao escolher e ao pôr a carta')
  confere((await K(page, (k) => k.cena().bonecos)) > m.hordaN, 'os soldados aparecem no terreno')
  // R13 item 2: dica única na 1ª carta da 1ª partida (vidas do config) e um toque no item explica em 1 linha
  let mm = await modelo(page)
  confere((mm.info || []).join(' ').includes(`ALL ${CFG.PARTIDA.vidas} HEARTS`) && (await K(page, (k) => k.guarda().dica)) === true && (await viuJa(page, 'info')), `dica única na rodada 1: "${(mm.info || [])[0]}"`)
  await toca(page, 'horda'); mm = await modelo(page)
  confere((mm.info || []).join(' ').includes(CFG.INVASORES.muncher.nome) && (mm.info || []).join(' ').includes(CFG.INVASORES.muncher.texto), `tocar na horda mostra o tipo e o que ele castiga: "${(mm.info || [])[1]}"`)
  await toca(page, 'dica-pinos'); mm = await modelo(page)
  confere((mm.info || []).join(' ').includes(`EVERY ${CFG.HORDA.chefeACada} ROUNDS`), 'tocar nos pinos do chefe explica em 1 linha')
  await toca(page, 'dica-ganhe'); mm = await modelo(page)
  confere((mm.info || [])[0]?.includes('PICK 1') && (mm.info || []).length === 4, 'tocar na linha "WIN:" explica em 1 linha e lista os 3 espólios')
  await toca(page, 'dica-vidas'); mm = await modelo(page)
  confere((mm.info || []).length === 1 && mm.info[0].includes(`${CFG.PARTIDA.vidas} HEARTS`), 'tocar nas vidas explica em 1 linha')
  await conferirLayout(page, 'carta posta')

  // ---------------------------------------------------------------- 3. batalha até o fim: tela = motor
  await toca(page, 'lutar2')
  await fase(page, 'luta')
  const lutaT0 = Date.now()
  confere((await K(page, (k) => k.batalha())).preludio === true && (await K(page, (k) => k.cena().marcha)) === true, 'ritmo: a horda marcha no portão antes do primeiro golpe (entrada da luta)')
  await toca(page, 'vel'); await toca(page, 'vel')
  confere((await modelo(page)).vel === 4 && (await K(page, (k) => k.guarda().vel)) === 4, 'botão 1×/2×/4× troca e fica guardado')
  await toca(page, 'vel') // de volta a 1×
  await conferirLayout(page, 'batalha')
  // R13 itens 10, 15 e 16: resumo ao vivo na base (celular: na mesa; PC: painel embaixo, sem área morta), com a contagem dos dois lados
  // (a regra mudou na R27, item 5: no CELULAR, com 1–2 terrenos ocupados, o painel "damage by plot" sai e fica uma tira curta com a
  //  contagem dos dois lados — a cena fica com o espaço. No PC continua o painel embaixo.
  //  A regra mudou de novo na R29, item 4: nessas rodadas a cena DESCE para ocupar o espaço que sobrou (camY de 0 a 40 px; antes era 0 fixo).)
  { const lay = await K(page, (k) => k.layout()), m2 = await modelo(page), mr = m2.resumo
    if (fmt.toque) {
      const curto = await viuJa(page, 'resumoCurto'), d = await viu(page), t = (await modelo(page)).resumoCurtoRet
      confere(curto && !d.includes('resumo') && mr && mr.aliadosTotal > 0 && mr.inimigosTotal === m.hordaN && lay.camY >= 0 && lay.camY <= 40, `R27: rodada 1 no celular: sem o painel "damage by plot" (1 terreno ocupado); fica a contagem dos dois lados (${mr?.aliados}/${mr?.aliadosTotal} × ${mr?.inimigos}/${mr?.inimigosTotal})`)
      confere(!!t && t.h <= 24 && t.y + t.h >= lay.VH - 1 && t.h < lay.mesa.h / 3, `R27: a tira da base tem ${t?.h} px de arte (a mesa tinha ${lay.mesa.h}): a cena fica com o espaço`)
    } else confere((await viuJa(page, 'resumo')) && mr && mr.aliadosTotal > 0 && mr.inimigosTotal === m.hordaN && lay.resumo.y + lay.resumo.h >= lay.VH - 8 && lay.resumo.h >= 60 && lay.camY === 0, `resumo ao vivo ocupa a base da tela na batalha (${mr?.aliados}/${mr?.aliadosTotal} × ${mr?.inimigos}/${mr?.inimigosTotal})`) }
  if (fmt.toque) { await page.waitForTimeout(1900); await foto(page, 'resumo-celular'); await foto(page, 'rodada1-celular') }
  await fase(page, 'vitoria', 45000)
  confere(Date.now() - lutaT0 >= 4500, `ritmo: a luta da rodada 1 ocupa ${((Date.now() - lutaT0) / 1000).toFixed(1)} s na tela (≥ 4,5 s com entrada e fecho; o motor decidiu em ${(await K(page, (k) => k.ultimaLuta())).segundos} s)`)
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
  // R13 item 6: FILA DE FESTAS — duas conquistas na mesma vitória aparecem uma por vez (antes a 2ª apagava a 1ª)
  // R17 D3 (a regra mudou: "conquista só depois do espólio", decisão de 19/11 21:54): na escolha do espólio NADA cai junto — as duas
  // conquistas desta vitória esperam na fila e só aparecem depois da escolha, uma por vez
  let fe = await K(page, (k) => k.festas())
  confere(fe.atual === null && fe.fila.length >= 2 && fe.log.length === 0 && (await modelo(page)).brinde === null, `ordem das festas: na escolha do espólio nenhuma placa na tela; ${fe.fila.length} conquistas esperam a escolha`)
  // R13 itens 1, 5 e 7: antes de escolher, o texto da carta, o efeito de cada espólio e a chance da bolsa virar relíquia.
  // R31 (a regra mudou): a bolsa já vem sorteada — com relíquia diz a chance do MOTOR (visao.chanceReliquia); sem relíquia, só o ouro (sem %)
  mm = await modelo(page)
  { const vv = await K(page, (k) => k.visao()), ic = vv.espolios.findIndex((e) => e.tipo === 'carta'), ib = vv.espolios.findIndex((e) => e.tipo === 'bolsa'), tb = mm.espolioDesc[ib].texto
    const bolsaOk = vv.espolios[ib].reliquia ? tb.includes(`${vv.chanceReliquia}%`) : tb === T.bolsaSo && !tb.includes('%')
    confere(mm.espolioDesc[ic].texto === CFG.CARTAS[vv.espolios[ic].carta].texto && bolsaOk && (await viuJa(page, 'espolioDesc')), `espólio: texto da carta e a bolsa verdadeira à vista ("${mm.espolioDesc[ib].titulo}: ${tb}")`)
    confere(mm.resumo.mvp >= 0 && mm.resumo.dano.reduce((a, b) => a + b, 0) > 0 && /MVP/.test(mm.vitoria.mvp || ''), `resumo da luta na vitória: dano por terreno e ${mm.vitoria.mvp}`) }
  await page.waitForTimeout(700)
  await foto(page, nome('espolio'))
  await conferirLayout(page, 'espólio')
  await page.waitForTimeout(1200)
  confere((await K(page, (k) => k.festas())).log.length === 0, 'ordem das festas: 1,2 s depois as conquistas continuam esperando a escolha')
  await K(page, (k) => k.festejar([{ tam: 3, texto: 'GRANDE' }, { tam: 1, texto: 'PEQUENA' }, { tam: 2, texto: 'MEDIA' }]))
  await page.waitForFunction(() => { const f = window.__keepmile.festas(); return f.log.at(-1)?.texto === 'GRANDE' && f.log.at(-1).fim > 0 }, null, { timeout: 15000 })
  fe = await K(page, (k) => k.festas())
  { const l = fe.log.slice(-3)
    confere(l.map((x) => x.texto).join() === 'PEQUENA,MEDIA,GRANDE' && l[1].ini - l[0].fim >= 399 && l[2].ini - l[1].fim >= 399, 'fila de festas: uma por vez, a maior por último') }

  // ---------------------------------------------------------------- 4. espólio e subir de nível
  v = await K(page, (k) => k.visao())
  const ouroAntes = v.ouro, bolsa = v.espolios.findIndex((e) => e.tipo === 'bolsa')
  await toca(page, 'espolio' + bolsa)
  await fase(page, 'carta')
  // R13 item 6 + R17 D3: FILA DE FESTAS — depois da escolha, as duas conquistas da vitória aparecem uma por vez (antes a 2ª apagava a 1ª)
  await page.waitForFunction(() => window.__keepmile.festas().atual !== null && window.__keepmile.modelo().brindeRet, null, { timeout: 6000 }).catch(() => {})
  fe = await K(page, (k) => k.festas())
  confere(fe.atual !== null && fe.fila.length + fe.log.length >= 5, `fila de festas: "${fe.atual}" na tela depois da escolha e ${fe.fila.length} esperando a vez`)
  await page.waitForTimeout(250)
  if (fmt.toque) await foto(page, 'fila-festas-celular')
  { const mb = (await modelo(page)).brindeRet, le = (await K(page, (k) => k.layout())).cartas // a placa da festa nunca cobre uma das 3 cartas da mão
    confere(!!mb && le.every((r) => mb.x + mb.w <= r.x || mb.x >= r.x + r.w || mb.y + mb.h <= r.y || mb.y >= r.y + r.h), `a placa da festa não fica por cima das cartas da mão (placa em ${mb?.x},${mb?.y})`) }
  await page.waitForFunction(() => { const f = window.__keepmile.festas(); return f.log.length >= 5 && f.log.every((l) => l.fim > 0) && !f.fila.length }, null, { timeout: 15000 })
  fe = await K(page, (k) => k.festas())
  { const l = fe.log, nomesF = l.map((x) => x.texto), iS = nomesF.indexOf('First Supper'), iC = nomesF.indexOf('Clean Plate')
    confere(iS >= 3 && iC >= 3 && l[iS].fase !== 'vitoria' && l[iC].fase !== 'vitoria' && l.every((x, i) => i === 0 || x.ini - l[i - 1].fim >= 399), `as festas não se sobrescrevem e a conquista vem DEPOIS do espólio: ${nomesF.join(' → ')}, com ${Math.round(l[Math.max(iS, iC)].ini - l[Math.max(iS, iC) - 1].fim)} ms entre elas (≥ 400)`) }
  v = await K(page, (k) => k.visao())
  confere(v.rodada === 2 && (v.espolios && (v.ouro > ouroAntes || v.reliquias.length === 1)), `espólio pego: rodada 2 (ouro ${ouroAntes} → ${v.ouro}, relíquias ${v.reliquias.length})`)
  m = await modelo(page)
  confere(m.mao[0].sobe === true && m.mao[0].nivel === 2, 'rodada 2: a 1ª carta vem com o selo LEVEL UP e mostra o nível 2')
  await toca(page, 'carta0'); await toca(page, 'terreno1')
  v = await K(page, (k) => k.visao()); m = await modelo(page)
  confere(v.terrenos[0].nivel === 2 && m.selo === true, 'subir de nível: nível 2 no motor e festa (selo LEVEL UP) na tela')
  confere((await sons(page)).includes('nivelPequeno'), 'som de nível')
  confere(/\d+%? > \d+/.test(m.seloLinha || '') && (await viuJa(page, 'nivelAntesDepois')), `subir de nível mostra "antes > depois" em número: "${m.seloLinha}"`)
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
  confere(new RegExp(CFG.INVASORES.muncher.nome).test(m.derrota || ''), `1 linha "quem te derrubou": "${m.derrota}"`) // R13: o nome mudou no config (Muncher → Scoffer)
  confere(m.derrotaPct === (await K(p2, (k) => k.pctHorda())) && m.derrotaDeNovo === true && (await viuJa(p2, 'quase')), `derrota como "quase": ${m.derrotaPct}% da horda (número do motor) e "same round again: +1 card"`)
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
  await p2.waitForTimeout(450) // R17 B1: a regra mudou — o 2º toque só confirma 400 ms depois do 1º (toque repetido não confirma)
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
  confere(m.fase === 'chefe' && m.chefe === 'gutbucket' && m.chefeCurto === false && (await viuJa(page, 'chefe')), 'rodada 5: anúncio do chefe com entrada (inteiro na 1ª vez)')
  // R13 item 6: nada por cima do anúncio do chefe — a festa espera
  await K(page, (k) => k.festejar([{ tam: 2, texto: 'ESPERA O CHEFE', ms: 700 }]))
  await page.waitForTimeout(700)
  fe = await K(page, (k) => k.festas())
  confere(fe.atual === null && fe.fila.some((f) => f.texto === 'ESPERA O CHEFE') && (await modelo(page)).brinde === null, 'fila de festas: nada aparece por cima do anúncio do chefe')
  for (const c of CFG.CHEFES) { const n = await K(page, (k, id) => k.nomeDoChefe(id), c.id); confere(n.maior <= n.VW, `nome do chefe cabe na tela em ${n.linhas.length} linha(s): ${n.linhas.join(' / ')}`) }
  confere((await K(page, (k) => k.cena().hora)) === 'boss-night', 'rodada de chefe é de noite')
  await page.waitForTimeout(900)
  confere((await sons(page)).includes('chefeAnuncia') && (await K(page, (k) => k.musica().momento === 'chefe' || k.musica().pendente === 'chefe')), 'som e música de chefe')
  if (!fmt.toque) await foto(page, 'chefe-pc')
  await toca(page, 'seguir')
  await fase(page, 'carta')
  await conferirLayout(page, 'rodada de chefe')
  await page.waitForFunction(() => window.__keepmile.festas().log.some((l) => l.texto === 'ESPERA O CHEFE'), null, { timeout: 8000 })
  const pB = await abrir(ctx, '?teste=1&nova=1&semente=outra-aba') // 2ª aba aberta ANTES do fim da partida (para a conferência das duas abas)

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
  // R13 item 13: FIM COMO FESTA de tela cheia — reino iluminado, recorde de PONTOS rotulado, média das 3 melhores, liga provisória, álbum
  { const media = mediaDasMelhores(g.melhores), lg = ligaDe(media), d = await viu(page), cn = await K(page, (k) => k.cena()), lay = await K(page, (k) => k.layout())
    confere(['fim', 'fimNumeros', 'fimLiga', 'fimAlbum', 'fimRecorde'].every((x) => d.includes(x)), 'fim de tela cheia: número grande, faixa NEW RECORD, pontos/recorde/média, liga e barra do álbum desenhados')
    confere(m.fim.media === media && m.fim.liga.nome === lg.liga.nome && m.fim.liga.falta === lg.falta && LIGAS.length === 5 && m.fim.recordeAntes === 0 && ['PROVISIONAL', 'BETA'].includes(m.fim.ligaMarca), `fim: média das 3 melhores ${media} → liga "${lg.liga.nome}" marcada ${m.fim.ligaMarca}` + (lg.proxima ? ` (faltam ${lg.falta} para ${lg.proxima.nome})` : ''))
    confere(m.fim.album === null || (m.fim.album.falta > 0 && m.fim.album.pct >= 0 && m.fim.album.pct <= 100), `fim: próxima meta do álbum ("next card in ${m.fim.album?.falta} rounds")`)
    confere(cn.hora !== 'boss-night' && cn.filtro === '' && cn.fimDeJogo && lay.fimPainel.y + lay.fimPainel.h >= lay.VH - 2 && lay.fimPainel.w >= Math.min(lay.VW, 420) - 8, `fim: reino final iluminado (${cn.hora}, sem dessaturar) e a placa ocupa a base inteira`) }
  s = await sons(page)
  confere(s.includes('fimDePartida') && s.includes('recorde') && (await K(page, (k) => k.som().somados)) >= 1, 'som de fim e de recorde (amostra + fanfarra por código somadas)')
  await page.waitForTimeout(900)
  await foto(page, nome('fim'))
  await conferirLayout(page, 'fim')
  // duas abas (bug Q2): a outra aba, aberta antes do fim, ouve a mudança e, ao gravar, NÃO apaga o recorde nem as rodadas do álbum
  await pB.waitForFunction((r) => window.__keepmile.guarda().recorde === r, g.recorde, { timeout: 8000 }).catch(() => {})
  confere((await K(pB, (k) => k.guarda().recorde)) === g.recorde, 'duas abas: a aba antiga recebe o recorde novo (evento storage)')
  await K(pB, (k) => k.guardaSet('vel', 1))
  { const disco = await pB.evaluate(() => JSON.parse(localStorage.getItem('keepmile_v1')))
    confere(disco.recorde === g.recorde && disco.rodadas === g.rodadas && disco.melhores.length === g.melhores.length && g.conquistas.every((c) => disco.conquistas.includes(c)), `duas abas: gravar na aba antiga mescla em vez de apagar (recorde ${disco.recorde}, ${disco.rodadas} rodadas, ${disco.conquistas.length} conquistas)`) }
  await pB.close()
  // Share: gera um PNG do reino com o recorde
  const [baixa] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), toca(page, 'postar')])
  const arq = path.join(fmt.toque ? FOTOS : (process.env.REINO_FOTOS_EXTRA || path.join(FOTOS, '..')), fmt.toque ? 'share-card.png' : '.share-pc.png')
  await baixa.saveAs(arq)
  const png = await readFile(arq)
  confere(baixa.suggestedFilename().endsWith('.png') && png.subarray(1, 4).toString() === 'PNG' && png.length > 3000 && png.length < 400 * 1024, `Share baixa um PNG do reino (${(png.length / 1024).toFixed(0)} KB)`)
  if (!fmt.toque) { await writeFile(path.join(FOTOS, 'share-card-dia.png'), png); await (await import('node:fs/promises')).rm(arq, { force: true }) }
  // R13 item 13: o Share leva o link da MESMA estrada (?semente=) para a área de transferência, com "beat my N rounds"
  await page.waitForFunction(() => window.__keepmile.link().como !== '', null, { timeout: 8000 })
  { const lk = await K(page, (k) => k.link()), area = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '')
    confere(lk.url.endsWith(`?semente=${SEM}&rodadas=${m.fim.vencidas}`) && lk.url.startsWith(base) && lk.como === 'baixou+link' && area.includes(lk.url) && area.includes(`beat my ${m.fim.vencidas} round`), `Share copia o link da mesma estrada, com a semente e as rodadas a bater (R17 B2): "${area.slice(0, 110)}"`) }
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
  const alb = await page.evaluate(() => ({ total: document.querySelectorAll('#albumGrade .km-carta').length, livres: document.querySelectorAll('#albumGrade [data-livre="1"]').length, conta: document.getElementById('albumConta').textContent, prox: document.getElementById('albumProxima').textContent, chances: document.getElementById('albumChances').textContent, todas: document.getElementById('albumChancesTodas')?.textContent ?? null }))
  const livresMotor = await K(page, (k) => k.liberadas().length)
  confere(alb.total === 30 && alb.livres === livresMotor && alb.livres >= 12, `álbum: 30 cartas, ${alb.livres} liberadas e ${alb.total - alb.livres} em silhueta ("${alb.prox}")`)
  // R31 (a regra mudou): antes conferia a tabela fixa ("Legendary 1%") como chance de agora; agora a de AGORA é a do motor para as cartas
  // liberadas (só as que podem sair) e a tabela com tudo liberado vem numa linha à parte, rotulada
  { const ch = chancesDaMao({ cartas: await K(page, (k) => k.liberadas()) }).filter((r) => r.chance > 0), agora = ch.map((r) => `${r.nome} ${r.chance}%`)
    confere(alb.chances.startsWith(T.album.chances) && agora.every((t) => alb.chances.includes(t)) && CFG.RARIDADES.filter((r) => !ch.some((c) => c.id === r.id)).every((r) => !alb.chances.includes(r.nome)), `álbum: a chance de agora é a do motor para estas cartas ("${alb.chances}")`)
    confere(alb.todas && alb.todas.startsWith(T.album.chancesTodas) && chancesDaMao({ cartas: Object.keys(CFG.CARTAS) }).every((r) => alb.todas.includes(`${r.nome} ${r.chance}%`)), `álbum: a tabela com tudo liberado à parte e rotulada ("${alb.todas}")`) }
  await page.locator('#albumGrade [data-livre="1"]').first().click()
  confere(/\w/.test(await page.locator('#albumDetalhe').textContent()), 'tocar numa carta mostra nome, família e regra')
  if (fmt.toque) await foto(page, 'album-celular')
  const rol = await page.evaluate(() => ({ lado: document.documentElement.scrollWidth - innerWidth, caixa: document.getElementById('telaCaixa').getBoundingClientRect().right <= innerWidth }))
  confere(rol.lado <= 0 && rol.caixa, 'álbum cabe na largura da tela')
  await page.keyboard.press('Escape')
  confere(await page.locator('#tela').isHidden(), 'Esc fecha a tela')
  await toca(page, 'menu'); await page.getByRole('button', { name: 'Achievements' }).click()
  const feitas = await page.evaluate(() => [...document.querySelectorAll('#listaConquistas .km-feita')].map((e) => e.dataset.id))
  // R39 (a regra mudou: decisão de 20/11 08:00, as conquistas passaram de 12 para 30): o esperado era 12 na lista
  confere(feitas.includes('supper') && (await page.locator('#listaConquistas li').count()) === 30 && (await page.locator('#listaConquistas canvas[data-icone]').count()) === 30, `conquistas: 30 na lista, cada uma com a sua medalha; ganhas: ${feitas.join(', ')}`)
  // R13 item 14: "Best runs" e a liga à vista a partir do menu (a lista saiu de dentro de Achievements: o seletor mudou de tela)
  await page.locator('#telaCaixa footer button').click()
  { const gg = await K(page, (k) => k.guarda()), lg = ligaDe(mediaDasMelhores(gg.melhores))
    confere((await page.locator('#mLiga').textContent()).includes(lg.liga.nome) && (await page.locator('#mLiga').textContent()).includes(String(gg.recorde)), `menu mostra a liga e o recorde ("${lg.liga.nome}", ${gg.recorde})`)
    await page.getByRole('button', { name: 'Best runs', exact: true }).click()
    confere((await page.locator('#listaMelhores li').count()) >= 1 && (await page.locator('#rankLiga').getAttribute('data-liga')) === lg.liga.nome && (await page.locator('#listaLigas li').count()) === LIGAS.length && (await page.locator('#listaLigas .km-feita').getAttribute('data-liga')) === lg.liga.nome, `Best runs: melhores partidas à vista, liga "${lg.liga.nome}" marcada na escada de ${LIGAS.length}`) }
  await page.locator('.km-x').click()
  confere(await page.locator('#tela').isHidden(), 'o X fecha a tela')
  // bug Q9: tocar no ícone do menu com o menu aberto fecha e NÃO reabre
  await toca(page, 'menu')
  { const q = await page.locator('#bt-menu').boundingBox(); if (fmt.toque) await page.touchscreen.tap(q.x + q.width / 2, q.y + q.height / 2); else await page.mouse.click(q.x + q.width / 2, q.y + q.height / 2) }
  await page.waitForTimeout(250)
  confere(await page.locator('#tela').isHidden(), 'tocar no ícone do menu com o menu aberto fecha (e não reabre)')
  // bug Q4: o número da carta tem legenda do config e a cura por segundo não se escreve "/S"
  { const f = await K(page, (k) => ({ B06: k.forca('B06', 1), B04: k.forca('B04', 1), M01: k.forca('M01', 1), T01: k.forca('T01', 1) }))
    confere(f.B06.legenda === CFG.LEGENDAS.curaSeg && !/\/S/.test(f.B06.numero) && f.B04.legenda === CFG.LEGENDAS.torre && f.M01.legenda === CFG.LEGENDAS.barril && f.T01.legenda === '', `carta de Construção e de Magia com legenda do número (${f.B06.numero} ${f.B06.legenda}, ${f.M01.numero} ${f.M01.legenda})`) }

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
  if (fmt.toque) { const mr = (await modelo(page)).resumo, n = mr.cartas.filter(Boolean).length; confere(n >= 3 && (await viuJa(page, 'resumo')) && !(await viu(page)).includes('resumoCurto') && (await K(page, (k) => k.resumoColunas())) >= 3, `R27: com ${n} terrenos ocupados o painel "damage by plot" continua inteiro no celular`) }
  await foto(page, nome('batalha'))
  await page.waitForTimeout(3500)
  const q = await K(page, (k) => ({ ...k.quadros(), ...k.cena() }))
  confere(q.nivelMax === 5 && q.lideres >= 4, `soldados de nível alto marcados na multidão: divisa no nível 5 e ${q.lideres} estandartes (um por grupo)`) // R13 item 17
  confere(cheia.soldados + cheia.invasores >= 80, `batalha cheia: ${cheia.soldados} soldados × ${cheia.invasores} invasores (${q.bonecos} bonecos na cena)`)
  confere(q.n > 100 && q.intervalo < 20, `tempo de quadro com a batalha cheia: mediana ${q.intervalo.toFixed(1)} ms entre quadros (< 20), ${q.custo.toFixed(2)} ms de desenho (pior ${q.pior.toFixed(1)})`)
  confere(q.tremidaMax <= 6, `tremida de no máximo 6 px (${q.tremidaMax})`)
  let maxFlash = 0; for (const t of q.flashes) maxFlash = Math.max(maxFlash, q.flashes.filter((x) => x >= t && x < t + 1000).length)
  confere(maxFlash <= 3, `no máximo 3 clarões por segundo (${maxFlash}; ${q.flashes.length} no total)`)
  confere(q.picoParticulas <= q.limite && q.limite === (fmt.w < fmt.h ? 40 : 60), `partículas dentro do limite (pico ${q.picoParticulas} de ${q.limite})`)
  if (!fmt.toque) confere(q.camX >= q.camMin - 0.5 && q.camX <= q.camMax + 0.5 && q.camX !== 0, `câmera acompanha a frente sem sair do cenário (${q.camX.toFixed(1)} px, entre ${q.camMin} e ${q.camMax})`)
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
  // R13 item 9: com Reduced motion a queda do chefe vira pausa + som (sem zoom, tremida nem flash)
  await p4.keyboard.press('Shift') // o som só existe depois do primeiro toque ou tecla (até aqui esta aba só usou ganchos)
  await K(p4, (k) => k.chefeCai()); await K(p4, (k) => k.zerarMedidas())
  await p4.waitForFunction(() => window.__keepmile.batalha().chefeCaiuEm > 0, null, { timeout: 60000, polling: 30 })
  { const b = await K(p4, (k) => ({ ...k.batalha(), ...k.cena() }))
    confere(b.pausou === true && b.zoom === 1 && b.tremidaMax === 0 && b.flashes.length === 0 && (await sons(p4)).includes('chefeCai'), `Reduced motion: a queda do chefe vira pausa + som (pausa ${b.pausou}, zoom ${b.zoom}, tremida ${b.tremidaMax}, ${b.flashes.length} clarões)`) }
  await K(p4, (k) => k.avancarBatalha())
  await fase(p4, 'carta')
  // conforto: com Reduced motion o FIGHT não pulsa — ganha contorno e seta parados depois de pôr a carta
  await toca(p4, 'carta0'); await toca(p4, 'terreno2')
  await p4.waitForTimeout(120)
  confere((await p4.locator('#bt-lutar2').count()) === 1 && (await viuJa(p4, 'lutarFixo')), 'Reduced motion: depois de pôr a carta o FIGHT tem destaque parado')
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

  // ---------------------------------------------------------------- 16. queda do chefe (partida de verdade)
  {
    // R13 item 9: QUEDA DO CHEFE como festa grande — câmera lenta com zoom; depois 3 relíquias com moldura de ouro e ícone próprio
    // (semente em que o robô do motor vence o 1º chefe: a queda acontece numa partida de verdade, pelos eventos do motor)
    const ctxC = await novoCtx(), page = await abrir(ctxC, '?teste=1&nova=1&semente=e2e-chefe-6')
    await K(page, (k) => k.jogarSozinho({ ateRodada: 5 }))
    await toca(page, 'seguir'); await fase(page, 'carta')
    await K(page, (k) => k.roboAteLutar())
    await K(page, (k) => k.zerarMedidas())
    await toca(page, (await page.locator('#bt-lutar2').count()) ? 'lutar2' : 'lutar')
    await fase(page, 'luta')
    await page.waitForFunction(() => window.__keepmile.batalha().chefeCaiuEm > 0 || window.__keepmile.fase() !== 'luta', null, { timeout: 60000, polling: 30 })
    const queda = await K(page, (k) => ({ ...k.batalha(), zoom: k.cena().zoom, fase: k.fase() }))
    if (!fmt.toque) await foto(page, 'chefe-cai-pc')
    confere(queda.chefeCaiuEm > 0 && queda.zoom > 1 && queda.lento === true, `queda do chefe: câmera lenta com zoom (×${queda.zoom.toFixed(2)})`)
    await page.waitForFunction(() => window.__keepmile.modelo().vitoria?.pronto, null, { timeout: 30000 })
    const mm = await modelo(page), v = await K(page, (k) => k.visao())
    const qf = await K(page, (k) => k.cena())
    let maxFl = 0; for (const t of qf.flashes) maxFl = Math.max(maxFl, qf.flashes.filter((x) => x >= t && x < t + 1000).length)
    confere(qf.tremidaMax <= 6 && maxFl <= 3 && qf.picoParticulas <= qf.limite, `festa do chefe dentro dos limites (tremida ${qf.tremidaMax} px, ${maxFl} clarões/s, partículas ${qf.picoParticulas} de ${qf.limite})`)
    confere((await sons(page)).includes('chefeCai') && (await viuJa(page, 'chefeCaiu')) && v.espolios.every((e) => e.reliquia) && v.espolios.every((e, i) => mm.espolioDesc[i].texto === CFG.RELIQUIAS[e.reliquia].texto && mm.espolioDesc[i].titulo === CFG.RELIQUIAS[e.reliquia].nome), `chefe caído: título com o nome dele e 3 relíquias com o efeito em 1 linha (${mm.espolioDesc.map((d) => d.titulo).join(', ')})`)
    const icR = await K(page, (k) => k.iconesReliquia())
    confere(Object.keys(icR).length === Object.keys(CFG.RELIQUIAS).length && new Set(Object.values(icR).map((x) => x.h)).size === Object.keys(icR).length && Object.values(icR).every((x) => x.cheios > 20), `cada relíquia com ícone próprio (${Object.keys(icR).length} diferentes, ${Object.values(icR)[0].de})`)
    await page.waitForTimeout(900)
    if (fmt.toque) await foto(page, 'espolio-reliquia-celular')
    await conferirLayout(page, 'espólio do chefe')
    await page.close(); await ctxC.close()
  }

  // ---------------------------------------------------------------- 15. partida que volta, "REPLACE?" no espólio, derrota no chefe
  {
    const ctxR = await novoCtx(), SEM2 = 'e2e-volta-1', q2 = `?teste=1&semente=${SEM2}`
    let pr = await abrir(ctxR, q2)
    const mao0 = (await modelo(pr)).mao[0].carta
    await toca(pr, 'carta0'); await toca(pr, 'terreno1')
    await pr.reload(); await pr.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
    let vr = await K(pr, (k) => k.visao())
    confere(vr.terrenos[0]?.carta === mao0 && vr.cartaPosta && (await K(pr, (k) => k.comandos())).length === 1, 'recarregar no meio da rodada: a partida volta onde estava (bug Q3)')
    await toca(pr, 'lutar2'); await fase(pr, 'luta')
    confere((await K(pr, (k) => k.partidaSalva()))?.emLuta === true, 'a partida fica guardada a cada passo (semente + cartas liberadas + comandos)')
    await pr.reload(); await pr.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
    await fase(pr, 'luta')
    confere((await K(pr, (k) => k.comandos())).length === 2 && (await K(pr, (k) => k.batalha())).preludio === true, 'recarregar no meio da batalha: volta ao começo daquela batalha')
    await K(pr, (k) => k.avancarBatalha())
    await pr.waitForFunction(() => window.__keepmile.modelo().vitoria?.pronto, null, { timeout: 15000 })
    const antesR = JSON.stringify(await K(pr, (k) => k.estado()))
    await pr.reload(); await pr.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
    confere((await K(pr, (k) => k.fase())) === 'vitoria' && JSON.stringify(await K(pr, (k) => k.estado())) === antesR && (await pr.locator('#bt-espolio0').count()) === 1, 'recarregar na escolha do espólio: volta na escolha, com o mesmo estado do motor')
    // bug Q1: espólio de carta em terreno OCUPADO pede "REPLACE?" (como na mão) e os soldados do terreno ficam à vista
    vr = await K(pr, (k) => k.visao())
    const ic = vr.espolios.findIndex((e) => e.tipo === 'carta')
    if (vr.espolios[ic].carta !== mao0) {
      await toca(pr, 'espolio' + ic); await fase(pr, 'terreno')
      confere((await K(pr, (k) => k.cena().vivos)) >= 1, 'escolher o terreno do espólio: os soldados do terreno ocupado continuam à vista')
      await pr.waitForTimeout(450) // R17 B1: os terrenos ignoram toque por 400 ms depois de abrir a escolha
      await toca(pr, 'terreno1')
      let mr = await modelo(pr)
      confere(mr.trocar === 1 && mr.fase === 'terreno' && (await K(pr, (k) => k.visao().terrenos[0].carta)) === mao0 && (await viuJa(pr, 'trocar')), 'espólio em terreno ocupado: o 1º toque só pede "REPLACE?" (nada é trocado)')
      await conferirLayout(pr, 'terreno do espólio')
      await pr.waitForTimeout(450) // R17 B1: o 2º toque só confirma 400 ms depois do 1º
      await toca(pr, 'terreno1'); await fase(pr, 'carta')
      vr = await K(pr, (k) => k.visao())
      confere(vr.rodada === 2 && vr.terrenos[0].carta !== mao0, 'o 2º toque confirma a troca')
    } else falha('a semente do teste de troca deu a mesma carta no espólio: troque SEM2')
    // "voltar" do navegador não sai do jogo: na partida pergunta
    await pr.goBack().catch(() => {})
    await pr.waitForTimeout(300)
    confere((await pr.locator('#tela').isVisible()) && (await pr.locator('#tela').getAttribute('data-tela')) === 'sair' && /public\/reino\//.test(pr.url()), '"voltar" do navegador não sai do jogo: pergunta antes')
    await pr.goBack().catch(() => {})
    await pr.waitForTimeout(300)
    confere(await pr.locator('#tela').isHidden(), '"voltar" com o painel aberto só fecha o painel')
    await pr.close()
    // derrota na rodada do chefe: "quase" com o número do motor e, na repetição, o anúncio curto (R13 itens 8 e 18)
    pr = await abrir(ctxR, `?teste=1&nova=1&semente=${SEM}`)
    await K(pr, (k) => k.jogarSozinho({ ateRodada: 5 }))
    confere((await modelo(pr)).fase === 'chefe' && (await modelo(pr)).chefeCurto === false, 'chefe: anúncio inteiro na 1ª vez da partida')
    await toca(pr, 'seguir'); await fase(pr, 'carta')
    await toca(pr, 'lutar'); await fase(pr, 'luta'); await pr.waitForTimeout(300)
    await K(pr, (k) => k.avancarBatalha())
    await pr.waitForFunction(() => window.__keepmile.fase() !== 'luta', null, { timeout: 10000 })
    let md = await modelo(pr)
    if (md.fase === 'derrota') {
      confere(md.derrotaPct === (await K(pr, (k) => k.pctHorda())) && md.derrotaPct > 0 && md.derrotaPct < 100 && (await viuJa(pr, 'quase')) && (await viuJa(pr, 'resumo')), `derrota no chefe como "quase": ${md.derrotaPct}% da horda caiu (número do motor), com o resumo da luta`)
      await pr.waitForTimeout(1300)
      if (fmt.toque) await foto(pr, 'derrota-quase-celular')
      if (md.derrotaDeNovo) {
        await toca(pr, 'seguir')
        await pr.waitForFunction(() => window.__keepmile.fase() === 'chefe', null, { timeout: 5000 })
        const t0c = Date.now()
        confere((await modelo(pr)).chefeCurto === true && (await viuJa(pr, 'chefeCurto')), 'chefe: na repetição da mesma partida o anúncio é a versão curta')
        await fase(pr, 'carta', 4000)
        confere(Date.now() - t0c < 1600, `o anúncio curto sai sozinho em ${Date.now() - t0c} ms (0,8 s)`)
      }
    } else falha('a luta sem carta nova na rodada do chefe não deu derrota com esta semente: a conferência do "quase" não rodou')
    // texto da noite: diz o que o motor faz (multNoite do config)
    await K(pr, (k) => k.batalhaCheia()); await fase(pr, 'luta'); await K(pr, (k) => k.avisar('noite'))
    await pr.waitForFunction(() => window.__keepmile.modelo().aviso === 'NIGHTFALL', null, { timeout: 8000 })
    confere((await K(pr, (k) => k.modeloAviso())).sub === `ALL DAMAGE x${CFG.BATALHA.multNoite / 100}`, `texto da noite diz o que o jogo faz: "ALL DAMAGE x${CFG.BATALHA.multNoite / 100}" (multNoite do config)`)
    await pr.close(); await ctxR.close()
  }

  // ---------------------------------------------------------------- 14. sem o atlas: cada peça cai no desenho por código
  if (fmt.toque) {
    const ctxS = await novoCtx()
    await ctxS.route('**/arte/atlas.json', (r) => r.fulfill({ status: 404, body: '' }))
    const p5 = await abrir(ctxS, `?teste=1&nova=1&semente=${SEM}`, { semAtlas: true })
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

/** R17 (polimento 2): bugs do jogador desconfiado (B1–B7), "mesma estrada" de verdade e os itens de diversão. */
async function r17(fmt) {
  console.log(`\n=== R17 ${fmt.nome} ${fmt.w}×${fmt.h} ===`)
  const erros = [], ruins = []
  const novoCtx = (extra = {}) => browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1, reducedMotion: 'no-preference', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'], ...extra })
  const bate = (page, x, y) => (fmt.toque ? page.touchscreen.tap(x, y) : page.mouse.click(x, y))
  const meio = async (page, id) => { const q = await page.locator('#bt-' + id).boundingBox(); return [q.x + q.width / 2, q.y + q.height / 2] }
  const toca = async (page, id) => { const [x, y] = await meio(page, id); await bate(page, x, y) }
  const pronto = (page) => page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
  const abrir = async (ctx, q) => { const page = await ctx.newPage(); vigiar(page, erros, ruins); await page.goto(base + q); await pronto(page); return page }
  const recarregar = async (page) => { await page.reload(); await pronto(page) }
  const nome = (s) => `${s}-${fmt.nome}`
  const espolioPronto = (page) => page.waitForFunction(() => window.__keepmile.modelo().vitoria?.pronto, null, { timeout: 20000 })
  const fimPronto = (page) => page.waitForFunction(() => window.__keepmile.modelo().fim?.contou, null, { timeout: 20000 })
  const cartasDe = async (page) => JSON.stringify((await K(page, (k) => k.visao())).terrenos.map((t) => t && t.carta))
  const focoEm = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)

  // ---------------------------------------------------------------- B1: toque repetido não confirma nada
  {
    const ctx = await novoCtx(), p = await abrir(ctx, '?teste=1&nova=1&semente=e2e-volta-1')
    const mao0 = (await modelo(p)).mao[0].carta
    await toca(p, 'carta0'); await toca(p, 'terreno1'); await toca(p, 'lutar2'); await fase(p, 'luta')
    await K(p, (k) => k.avancarBatalha()); await espolioPronto(p); await p.waitForTimeout(500)
    let v = await K(p, (k) => k.visao())
    const ic = v.espolios.findIndex((e) => e.tipo === 'carta' && e.carta !== mao0), nCmd = (await K(p, (k) => k.comandos())).length, antes = await cartasDe(p)
    if (ic < 0) falha('B1: a semente não deu carta diferente no espólio (troque a semente)')
    else {
      // o jogador bate 4 vezes seguidas: o 1º toque escolhe o espólio; os outros caem no terreno ocupado que aparece (antes: armava e CONFIRMAVA o "REPLACE?")
      const [ex, ey] = await meio(p, 'espolio' + ic), t1 = await K(p, (k) => k.areaDoTerreno(1)), tx = t1.x + t1.w / 2, ty = t1.y + t1.h / 2
      await bate(p, ex, ey); await p.waitForTimeout(40)
      for (let i = 0; i < 3; i++) { await bate(p, tx, ty); await p.waitForTimeout(50) }
      let m = await modelo(p)
      confere(m.fase === 'terreno' && m.trocar === 0 && (await K(p, (k) => k.comandos())).length === nCmd && (await cartasDe(p)) === antes, 'B1: 4 toques seguidos no espólio não trocam a construção nem armam o "REPLACE?" (terrenos ignoram toque por 400 ms)')
      await p.waitForTimeout(450)
      await bate(p, tx, ty); await p.waitForTimeout(40); await bate(p, tx, ty); await p.waitForTimeout(40)
      m = await modelo(p)
      confere(m.trocar === 1 && m.fase === 'terreno' && (await cartasDe(p)) === antes, 'B1: o "REPLACE?" armado não se confirma com um toque repetido (menos de 400 ms)')
      confere((m.trocarLinhas || []).join(' ') === `REPLACE ${CFG.CARTAS[mao0].nome} LV1?` && (await viuJa(p, 'trocar')), `B1: o aviso diz o que se perde: "${(m.trocarLinhas || []).join(' ')}"`)
      if (fmt.toque) { confere(await viuJa(p, 'terrenoEspolio'), 'D10: na escolha do terreno a base do celular mostra o espólio escolhido e o que ele faz (não fica vazia)'); await foto(p, 'replace-celular') }
      await p.waitForTimeout(450)
      await bate(p, tx, ty); await fase(p, 'carta')
      v = await K(p, (k) => k.visao())
      confere(v.rodada === 2 && (await cartasDe(p)) !== antes, 'B1: o 2º toque, com calma, confirma a troca')
    }
    // sortear: dois toques seguidos só armam; trocar carta da mão: idem
    const oferta = JSON.stringify((await K(p, (k) => k.visao())).oferta), [sx, sy] = await meio(p, 'sortear')
    await bate(p, sx, sy); await p.waitForTimeout(40); await bate(p, sx, sy); await p.waitForTimeout(60)
    confere((await modelo(p)).armado === 'sortear' && JSON.stringify((await K(p, (k) => k.visao())).oferta) === oferta, 'B1: dois toques seguidos no sorteio só armam (não gastam o ouro)')
    await p.waitForTimeout(450); await bate(p, sx, sy); await p.waitForTimeout(80)
    confere(JSON.stringify((await K(p, (k) => k.visao())).oferta) !== oferta, 'B1: o 2º toque, com calma, sorteia')
    { const m = await modelo(p), vv = await K(p, (k) => k.visao()), i = m.mao.findIndex((c) => c.carta !== vv.terrenos[0].carta), antes2 = await cartasDe(p), t1 = await K(p, (k) => k.areaDoTerreno(1))
      await toca(p, 'carta' + i)
      await bate(p, t1.x + t1.w / 2, t1.y + t1.h / 2); await p.waitForTimeout(40); await bate(p, t1.x + t1.w / 2, t1.y + t1.h / 2); await p.waitForTimeout(60)
      confere((await modelo(p)).trocar === 1 && (await cartasDe(p)) === antes2, 'B1: trocar carta da mão — dois toques seguidos no terreno ocupado só armam o "REPLACE?"')
      await p.waitForTimeout(450); await bate(p, t1.x + t1.w / 2, t1.y + t1.h / 2); await p.waitForTimeout(80)
      confere((await cartasDe(p)) !== antes2, 'B1: o 2º toque, com calma, troca a carta da mão') }
    // B7: o foco do teclado, depois de mudar de fase, vai para o controle principal (não para o BODY)
    await p.locator('#bt-lutar2').focus(); await p.keyboard.press('Enter'); await fase(p, 'luta')
    confere((await focoEm(p)) === 'bt-vel', `B7: depois do Enter no FIGHT o foco vai para o controle da luta (${await focoEm(p)})`)
    await K(p, (k) => k.avancarBatalha()); await p.waitForFunction(() => window.__keepmile.fase() === 'derrota' || window.__keepmile.modelo().vitoria?.pronto, null, { timeout: 20000 }); await p.waitForTimeout(100)
    confere((await K(p, (k) => k.fase())) === 'derrota' ? (await focoEm(p)) === 'bt-seguir' : /^bt-espolio/.test(await focoEm(p)), `B7: no fim da luta o foco vai para o controle principal da fase (${await focoEm(p)})`)
    await p.close(); await ctx.close()
  }

  // ---------------------------------------------------------------- B3: o fim fica guardado na hora em que o motor decide
  {
    const ctx = await novoCtx(), p = await abrir(ctx, '?teste=1&nova=1&semente=e2e-keepmile-1')
    await toca(p, 'carta0'); await toca(p, 'terreno1') // 1 comando: a partida (de semente fixa) fica guardada
    await p.goto(base + '?teste=1'); await pronto(p) // sem `nova=1`: abrir e recarregar retomam o que está guardado
    confere((await K(p, (k) => k.semente())) === SEM && (await K(p, (k) => k.comandos())).length === 1, 'B3: a partida de semente fixa volta ao abrir sem `nova=1`')
    const ate = await K(p, (k) => k.jogarAteALutaFinal())
    confere(ate.parou && (await K(p, (k) => k.visao())).vidas === 1, `B3: o robô joga até a luta que acaba a partida (rodada ${ate.rodada}, última vida)`)
    await toca(p, (await p.locator('#bt-lutar2').count()) ? 'lutar2' : 'lutar'); await fase(p, 'luta')
    const res = await K(p, (k) => k.resultado()), gAntes = await K(p, (k) => k.guarda())
    confere(res.fim && (await K(p, (k) => k.lutando())) && gAntes.partidas === 1 && gAntes.melhores.length === 1 && gAntes.melhores[0].pontos === res.pontos && gAntes.recorde === res.pontos && !!(await K(p, (k) => k.fimSalvo())), `B3: o resultado (${res.pontos} pontos, recorde e melhores partidas) fica guardado quando o motor decide o fim, ainda durante a luta`)
    await recarregar(p)
    await fimPronto(p)
    let m = await modelo(p), g = await K(p, (k) => k.guarda())
    confere(m.fase === 'fim' && m.fim.pontos === res.pontos && m.fim.vencidas === res.vencidas && m.fim.novoRecorde === true && g.partidas === 1 && g.melhores.length === 1 && g.recorde === res.pontos && g.rodadas === gAntes.rodadas, `B3: recarregar durante a luta final volta para a tela de fim daquela partida (${m.fim?.vencidas} rodadas, ${m.fim?.pontos} pontos), sem registrar duas vezes`)
    await recarregar(p)
    await fimPronto(p)
    m = await modelo(p); g = await K(p, (k) => k.guarda())
    confere(m.fase === 'fim' && m.fim.parado === true && (await p.locator('#bt-postar').count()) === 1 && g.partidas === 1 && m.fim.novoRecorde === true, 'B3: recarregar na tela de fim volta para a tela de fim (com Share), com tudo já no lugar')
    await conferirLayout(p, 'fim depois de recarregar')
    // B7: Share ignora toques repetidos
    const [px, py] = await meio(p, 'postar')
    const baixou = p.waitForEvent('download', { timeout: 15000 })
    for (let i = 0; i < 4; i++) { await bate(p, px, py); await p.waitForTimeout(40) }
    await baixou; await p.waitForFunction(() => window.__keepmile.link().como !== '', null, { timeout: 8000 })
    await p.waitForTimeout(300)
    confere((await K(p, (k) => k.link().vezes)) === 1, 'B7: 4 toques seguidos no Share compartilham uma vez só')
    await toca(p, 'denovo'); await fase(p, 'carta')
    await recarregar(p)
    confere((await K(p, (k) => k.fase())) === 'carta' && (await K(p, (k) => k.fimSalvo())) === null && (await K(p, (k) => k.guarda().partidas)) === 1, 'B3: depois do Play again a tela de fim não volta mais')
    await p.close(); await ctx.close()
  }

  // ---------------------------------------------------------------- B4 + B2: link de amigo — pergunta, guarda a partida e é a MESMA ESTRADA
  {
    const LINK = '?teste=1&semente=e2e-amigo-1&rodadas=7'
    // dois álbuns diferentes abrem o mesmo link: as mesmas 3 cartas na rodada 1 (só as cartas do álbum inicial do config)
    const ctxA = await novoCtx(), ctxB = await novoCtx()
    await ctxB.addInitScript(() => { try { if (!localStorage.getItem('keepmile_v1')) localStorage.setItem('keepmile_v1', JSON.stringify({ rodadas: 400, recorde: 0, melhores: [], conquistas: [], partidas: 9, dica: true })) } catch { /* ok */ } })
    const pA = await abrir(ctxA, LINK), pB = await abrir(ctxB, LINK)
    const vA = await K(pA, (k) => k.visao()), vB = await K(pB, (k) => k.visao()), lA = await K(pA, (k) => k.liberadas()), lB = await K(pB, (k) => k.liberadas())
    confere((await K(pB, (k) => k.guarda().rodadas)) === 400 && JSON.stringify(lB) === JSON.stringify(CFG.ALBUM.inicial) && JSON.stringify(lA) === JSON.stringify(lB), `B2: partida aberta por link usa só as ${CFG.ALBUM.inicial.length} cartas do álbum inicial, com qualquer álbum (um aparelho com 0 rodadas e outro com 400)`)
    confere(JSON.stringify(vA.oferta) === JSON.stringify(vB.oferta) && JSON.stringify(vA.horda) === JSON.stringify(vB.horda) && JSON.stringify(vA.espolios) === JSON.stringify(vB.espolios), `B2: MESMA ESTRADA — dois álbuns diferentes veem as mesmas 3 cartas na rodada 1 (${vA.oferta.map((o) => o.carta).join(' ')})`)
    confere(!/semente|rodadas/.test(pB.url()) && /teste=1/.test(pB.url()), 'B2: o link vale uma partida — depois de lido, some do endereço')
    await pB.waitForFunction(() => window.__keepmile.modeloAviso()?.texto === 'BEAT MY 7 ROUNDS' && window.__keepmile.modelo().aviso, null, { timeout: 6000 }).catch(() => {})
    { const a = await K(pB, (k) => k.modeloAviso()), m = await modelo(pB)
      confere(a?.texto === 'BEAT MY 7 ROUNDS' && m.desafio?.rodadas === 7 && (await viuJa(pB, 'desafio')), `B2: quem chega vê a faixa de desafio "${a?.texto}" e a meta fica no HUD`) }
    await pB.waitForTimeout(350)
    if (fmt.toque) await foto(pB, 'link-amigo-celular')
    await conferirLayout(pB, 'estrada do amigo')
    // recarregar não recomeça a estrada do amigo; o Play again volta à partida normal (o álbum do aparelho)
    await toca(pB, 'carta0'); await toca(pB, 'terreno1')
    await recarregar(pB)
    confere((await K(pB, (k) => k.semente())) === 'e2e-amigo-1' && (await K(pB, (k) => k.comandos())).length === 1 && (await modelo(pB)).desafio?.rodadas === 7, 'B2: recarregar continua a estrada do amigo onde estava')
    await K(pB, (k) => k.jogarSozinho())
    await fimPronto(pB)
    { const m = await modelo(pB)
      confere(/FRIEND/.test(m.fim.amigo?.texto || '') && m.fim.amigo.texto.includes(String(m.fim.vencidas)) && m.fim.amigo.texto.includes('7') && (await viuJa(pB, 'fimFecho')), `B2: o fim diz quem levou a estrada: "${m.fim.amigo?.texto}"`) }
    await toca(pB, 'denovo'); await fase(pB, 'carta')
    confere((await K(pB, (k) => k.semente())) !== 'e2e-amigo-1' && (await K(pB, (k) => k.liberadas())).length === 30 && (await modelo(pB)).desafio === null, 'B2: o Play again volta à partida normal (semente nova, álbum do aparelho)')
    await pA.close(); await ctxA.close(); await pB.close()
    // B4: link de amigo com partida em curso — pergunta e guarda a partida num segundo espaço
    const p1 = await abrir(ctxB, '?teste=1&nova=1&semente=e2e-minha-1')
    await toca(p1, 'carta0'); await toca(p1, 'terreno2')
    const minha = JSON.stringify(await K(p1, (k) => k.comandos()))
    await p1.goto(base + LINK); await pronto(p1)
    await p1.waitForSelector('#tela:not([hidden])', { timeout: 5000 }).catch(() => {})
    confere((await p1.locator('#tela').getAttribute('data-tela')) === 'amigo' && (await K(p1, (k) => k.semente())) === 'e2e-minha-1' && JSON.stringify(await K(p1, (k) => k.comandos())) === minha && /saved/.test(await p1.locator('#amigoGuarda').textContent().catch(() => '')), 'B4: link de amigo com partida em curso PERGUNTA antes ("Start your friend\'s road? Your current run will be saved") e a partida continua lá')
    if (fmt.toque) { await p1.waitForTimeout(200); await foto(p1, 'link-amigo-pergunta-celular') }
    await p1.keyboard.press('Escape')
    confere((await p1.locator('#tela').isHidden()) && (await K(p1, (k) => k.semente())) === 'e2e-minha-1' && !/semente/.test(p1.url()), 'B4: fechar a pergunta fica na partida em curso')
    await p1.goto(base + LINK); await pronto(p1)
    await p1.locator('#amigoSim').click()
    await p1.waitForFunction(() => window.__keepmile.semente() === 'e2e-amigo-1', null, { timeout: 5000 }).catch(() => {})
    confere((await K(p1, (k) => k.semente())) === 'e2e-amigo-1' && JSON.stringify((await K(p1, (k) => k.outraPartida()))?.comandos) === minha && (await K(p1, (k) => k.comandos())).length === 0, 'B4: aceitar começa a estrada do amigo e GUARDA a partida em curso no segundo espaço')
    await K(p1, (k) => k.jogarSozinho())
    await fimPronto(p1)
    await toca(p1, 'denovo'); await fase(p1, 'carta')
    confere((await K(p1, (k) => k.semente())) === 'e2e-minha-1' && JSON.stringify(await K(p1, (k) => k.comandos())) === minha && (await K(p1, (k) => k.outraPartida())) === null, 'B4: depois da estrada do amigo, o Play again volta à partida que estava guardada')
    // B6: duas abas na MESMA partida — a aba velha percebe e recarrega o estado antes de aceitar jogada
    const p2 = await abrir(ctxB, '?teste=1')
    confere(JSON.stringify(await K(p2, (k) => k.comandos())) === minha, 'B6: a 2ª aba abre a mesma partida em curso')
    await toca(p2, 'lutar2'); await fase(p2, 'luta'); await K(p2, (k) => k.avancarBatalha()); await espolioPronto(p2)
    const cmds2 = JSON.stringify(await K(p2, (k) => k.comandos()))
    await p1.bringToFront()
    await toca(p1, 'lutar2') // a aba velha ainda mostra "carta posta, falta lutar"
    await p1.waitForTimeout(400)
    confere(JSON.stringify(await K(p1, (k) => k.comandos())) === cmds2 && (await K(p1, (k) => k.fase())) === 'vitoria' && JSON.stringify(await K(p1, (k) => k.estado())) === JSON.stringify(await K(p2, (k) => k.estado())), 'B6: a aba velha recarrega o estado da outra aba em vez de jogar por cima (as duas ficam iguais)')
    await p1.close(); await p2.close(); await ctxB.close()
  }
  const registro = [] // o registro da fila de festas (F.log) de cada festa fotografada
  const jaAnotado = new WeakMap() // por página: quantas festas do registro já foram anotadas (cada anotação leva só as novas)
  const anotar = async (page, qual) => { const f = await K(page, (k) => k.festas()), de = jaAnotado.get(page) || 0, fim = (await modelo(page)).fim; jaAnotado.set(page, f.log.length); registro.push({ qual, log: f.log.slice(de), fila: f.fila, seq: fim ? { t0: fim.t0, tFaixa: fim.tFaixa, tSobe: fim.tSobe, tBotoes: fim.tBotoes, n: fim.vencidas, recorde: fim.novoRecorde, fecho: [fim.melhor, fim.faltaLinha].filter(Boolean) } : null }) }
  /** Pega um espólio (de preferência um que não pede terreno) e espera a fase seguinte. */
  const pegar = async (page) => {
    await espolioPronto(page); await page.waitForTimeout(450)
    const op = await K(page, (k) => k.opcoes()), cmd = op.comandos.find((c) => c.tipo === 'espolio' && c.terreno == null) || op.comandos.find((c) => c.tipo === 'espolio')
    await toca(page, 'espolio' + cmd.indice)
    if (cmd.terreno != null) { await fase(page, 'terreno'); await page.waitForTimeout(450); await toca(page, 'terreno' + cmd.terreno); await page.waitForTimeout(100); if ((await modelo(page)).trocar) { await page.waitForTimeout(450); await toca(page, 'terreno' + cmd.terreno) } }
    await page.waitForFunction(() => ['carta', 'chefe', 'fim'].includes(window.__keepmile.fase()), null, { timeout: 8000 })
  }
  const lum = (c) => { const n = parseInt(c.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) }
  const lutarAteOFim = async (page) => { await toca(page, (await page.locator('#bt-lutar2').count()) ? 'lutar2' : 'lutar'); await fase(page, 'luta'); await page.waitForTimeout(120); await K(page, (k) => k.avancarBatalha()); await page.waitForFunction(() => window.__keepmile.fase() !== 'luta', null, { timeout: 10000 }) }

  // ---------------------------------------------------------------- primeira partida (D7), chances com nome, derrota, guia do ouro (D9)
  {
    const ctx = await novoCtx(), p = await abrir(ctx, `?teste=1&nova=1&semente=${SEM}`)
    let m = await modelo(p)
    confere(m.setaCarta === true && (await viuJa(p, 'setaCarta')), 'D7: primeira partida — uma seta "TAP A CARD" em cima da mão')
    confere(await viuJa(p, 'nome:sortear'), 'D7: o botão de sortear tem nome ("REROLL" e o preço)')
    { const lay = await K(p, (k) => k.layout()), txt = lay.odds.linhas.flat().join(' | ')
      // R31 (a regra mudou): só as raridades que o motor diz que podem sair, com o número dele; as de 0% não aparecem
      const vc = (await K(p, (k) => k.visao())).chances
      confere(vc.filter((r) => r.chance > 0).every((r) => txt.includes(`${r.nome} ${r.chance}%`)) && vc.filter((r) => r.chance === 0).every((r) => !txt.includes(r.nome)) && (await viuJa(p, 'chancesNomes')), `chances com o NOME da raridade além da cor, só as possíveis: "${txt}"`) }
    await p.waitForTimeout(700)
    if (fmt.toque) await foto(p, 'primeira-partida-celular')
    await conferirLayout(p, 'primeira partida')
    await toca(p, 'carta0'); await p.waitForTimeout(120)
    confere((await modelo(p)).setaCarta === false && !(await viu(p)).includes('setaCarta'), 'D7: a seta some depois do 1º toque numa carta')
    await toca(p, 'carta0') // solta a carta
    await lutarAteOFim(p)
    m = await modelo(p)
    confere(m.fase === 'derrota' && /^HORDE HEALTH DOWN \d+%$/.test(m.derrotaTexto || '') && m.derrotaTexto.includes(String(m.derrotaPct)), `a derrota fala em VIDA da horda, não em cabeças: "${m.derrotaTexto}"`)
    await toca(p, 'seguir'); await fase(p, 'carta')
    m = await modelo(p)
    confere(m.consertar.visivel && !m.consertar.pode && !m.consertar.destaque, 'D9: vida perdida mas sem ouro para consertar — o botão não chama a atenção')
    await K(p, (k) => k.jogarSozinho({ ateRodada: 3 }))
    m = await modelo(p)
    confere(m.rodada === 3 && m.vidas === 2 && m.consertar.pode && m.consertar.destaque === true && !m.consertar.forte && (await viuJa(p, 'consertoDestaque')) && (await viuJa(p, 'nome:consertar')), `D9: na rodada ${m.rodada}, com vida perdida e ${m.ouro} de ouro, o botão de consertar ganha destaque (antes só nas rodadas 1–2)`)
    await p.waitForTimeout(300)
    if (fmt.toque) await foto(p, 'guia-ouro-celular')
    await conferirLayout(p, 'guia do ouro')
    await K(p, (k) => k.jogarSozinho({ ateRodada: 4 }))
    m = await modelo(p)
    { // na última vida o destaque é o forte (pisca mais depressa e ganha a seta)
      const pu = await abrir(ctx, `?teste=1&nova=1&semente=${SEM}`)
      for (let i = 0; i < 2; i++) { await lutarAteOFim(pu); await toca(pu, 'seguir'); await fase(pu, 'carta') }
      let mu = await modelo(pu)
      for (let r = 2; r <= 8 && !mu.consertar.forte; r++) { const x = await K(pu, (k, r) => k.jogarSozinho({ ateRodada: r }), r); if (x.fim) break; if ((await K(pu, (k) => k.fase())) === 'chefe') { await toca(pu, 'seguir'); await fase(pu, 'carta') } mu = await modelo(pu) }
      confere(mu.vidas === 1 && mu.consertar.forte === true && mu.consertar.destaque === true && (await viuJa(pu, 'consertoForte')), `D9: na última vida, com ${mu.ouro} de ouro, o destaque do conserto é o forte (rodada ${mu.rodada})`)
      await pu.close() }
    confere(m.rodada === 4 && (m.info || []).join(' ').includes('BOSS NEXT ROUND') && (m.info || []).join(' ').includes(String(m.consertar.custo)) && (m.info || []).length === 1 && (await viuJa(p, 'info')), `D9: na véspera do chefe, um lembrete de 1 linha: "${(m.info || [])[0]}"`)
    await p.close(); await ctx.close()
  }

  // ---------------------------------------------------------------- festas de nível e de vitória (antes e pico), painel da batalha (D5)
  {
    const ctx = await novoCtx(), p = await abrir(ctx, `?teste=1&nova=1&semente=${SEM}`)
    let m = await modelo(p)
    const qual = Math.max(0, ['T02', 'T01', 'T07', 'T04'].map((c) => m.mao.findIndex((x) => x.carta === c)).find((i) => i >= 0) ?? 0)
    await toca(p, 'carta' + qual); await toca(p, 'terreno1')
    if (fmt.toque) { const lay = await K(p, (k) => k.layout()); confere(lay.lutar2.w >= lay.VW - 10 && lay.lutar2.y + lay.lutar2.h >= lay.VH - 6 && lay.premios.w >= lay.VW - 6 && lay.premios.y <= lay.mesa.y + 2 && (await viuJa(p, 'ganhe')), `D10: depois de pôr a carta a base do celular fica cheia — os 3 espólios em ladrilhos de lado a lado e o FIGHT da largura da tela (${lay.lutar2.w} de ${lay.VW})`) }
    await toca(p, 'lutar2'); await fase(p, 'luta')
    // R27, item 7: no PC o painel WIN e o resumo do começo da 1ª luta não ficam vazios (uma linha de ajuda em cada)
    if (!fmt.toque) confere((await viuJa(p, 'resumoAjuda')) && (await viuJa(p, 'ganheAjuda')) && T.resumo.ajuda.length <= 40 && T.ganheAjuda.length <= 20, `R27: PC, começo da 1ª luta: o resumo explica o painel ("${T.resumo.ajuda}") e o painel WIN diz o que fazer ("${T.ganheAjuda}")`)
    await p.waitForTimeout(2300)
    // (a regra mudou na R27, item 5: no celular, com 1 terreno ocupado, fica a tira curta em vez do painel de 1 linha)
    if (fmt.toque) confere((await viuJa(p, 'resumoCurto')) && !(await viu(p)).includes('resumo') && (await modelo(p)).baseCurta === true, 'D5 (R27): no celular, com 1 terreno ocupado, a batalha não mostra o painel "damage by plot": só a tira curta da base')
    else confere((await K(p, (k) => k.resumoColunas())) === 7 && (await viuJa(p, 'resumo')), 'D5: no PC o resumo continua com as 7 colunas')
    if (fmt.toque) await foto(p, 'festa-vitoria-antes-celular')
    await toca(p, 'vel'); await toca(p, 'vel') // 4×
    await fase(p, 'vitoria', 45000)
    await p.waitForTimeout(330)
    if (fmt.toque) await foto(p, 'festa-vitoria-pico-celular')
    await anotar(p, 'vitória (rodada 1): na escolha do espólio a fila fica parada')
    await pegar(p)
    m = await modelo(p)
    await toca(p, 'carta0'); await p.waitForTimeout(250)
    if (fmt.toque) await foto(p, 'festa-nivel-antes-celular')
    await toca(p, 'terreno1'); await p.waitForTimeout(260)
    if (fmt.toque) await foto(p, 'festa-nivel-pico-celular')
    confere(m.mao[0].sobe === true && (await modelo(p)).selo === true, 'festa de nível fotografada antes e no pico (selo LEVEL UP)')
    await p.waitForFunction(() => { const f = window.__keepmile.festas(); return f.log.length >= 2 && f.log.every((l) => l.fim > 0) && !f.fila.length }, null, { timeout: 15000 }).catch(() => {})
    await anotar(p, 'depois da escolha: as conquistas da vitória, uma por vez, e a festa de nível')
    await K(p, (k) => k.guardaSet('vel', 1))
    await p.close(); await ctx.close()
  }

  // ---------------------------------------------------------------- chefe: festa interrompida, regra com unidade (D4), queda (fotos), relíquias (B5)
  {
    // "Full House" não dispara duas vezes quando o chefe interrompe a festa (antes: a placa voltava inteira, com som e confete de novo).
    // O chefe volta a ser anunciado quando se perde para ele: a festa que estava na tela sai da frente e não se repete.
    const ctx = await novoCtx(), p0 = await abrir(ctx, `?teste=1&nova=1&semente=${SEM}`)
    await K(p0, (k) => k.jogarSozinho({ ateRodada: 5 }))
    let m = await modelo(p0)
    confere(m.fase === 'chefe' && m.chefe === 'gutbucket' && /within 0\.5 plots/.test(m.chefeTexto || '') && m.chefeTexto.replace(' plots', '') === CFG.CHEFES[0].texto, `D4: a regra do chefe na entrada diz a unidade: "${m.chefeTexto}"`)
    await toca(p0, 'seguir'); await fase(p0, 'carta')
    await lutarAteOFim(p0)
    if ((await K(p0, (k) => k.fase())) !== 'derrota' || (await K(p0, (k) => k.estado().fase)) === 'fim') falha('R17: a luta sem carta nova na rodada do chefe não deu derrota com esta semente (a conferência da festa interrompida não rodou)')
    else {
      await K(p0, (k) => k.limparFestas())
      await K(p0, (k) => k.festejar([{ tam: 2, texto: 'FULL HOUSE TEST', ms: 3000 }]))
      await p0.waitForFunction(() => window.__keepmile.festas().atual === 'FULL HOUSE TEST', null, { timeout: 5000 })
      await p0.waitForTimeout(150)
      await toca(p0, 'seguir'); await fase(p0, 'chefe', 5000); await fase(p0, 'carta', 5000)
      await p0.waitForTimeout(4300)
      const fe = await K(p0, (k) => k.festas()), n = fe.log.filter((l) => l.texto === 'FULL HOUSE TEST').length, ao = (await K(p0, (k) => k.festasAo()))['FULL HOUSE TEST']
      confere(n === 1 && ao === 1 && fe.atual !== 'FULL HOUSE TEST' && !fe.fila.some((f) => f.texto === 'FULL HOUSE TEST'), `festa interrompida pelo chefe não dispara duas vezes (na fila ${n}×, som e confete ${ao}×)`)
    }
    await p0.close()
    const p = await abrir(ctx, '?teste=1&nova=1&semente=e2e-chefe-6')
    await K(p, (k) => k.jogarSozinho({ ateRodada: 5 }))
    await toca(p, 'seguir'); await fase(p, 'carta')
    {
      // a queda do chefe: antes e pico; os números de dano não passam por cima do título
      await K(p, (k) => k.roboAteLutar()); await K(p, (k) => k.zerarMedidas())
      await toca(p, (await p.locator('#bt-lutar2').count()) ? 'lutar2' : 'lutar'); await fase(p, 'luta')
      await p.waitForTimeout(3200)
      if (fmt.toque) await foto(p, 'festa-chefe-antes-celular')
      await p.waitForFunction(() => window.__keepmile.batalha().chefeCaiuEm > 0 || window.__keepmile.fase() !== 'luta', null, { timeout: 60000, polling: 30 })
      await p.waitForTimeout(120)
      if (fmt.toque) await foto(p, 'festa-chefe-pico-celular')
      const zona = await p.waitForFunction(() => { const k = window.__keepmile, t = k.titulo(); return t.zona && /DOWN!/.test(k.modelo().aviso || '') ? t : null }, null, { timeout: 8000, polling: 30 }).then((h) => h.jsonValue(), () => null)
      confere(!!zona && zona.zona.w > 40 && typeof zona.pulados === 'number', `D4: com o título "…DOWN!" na tela, a cena conhece a zona dele e não desenha número de dano por cima (${zona?.pulados} números pulados até aqui)`)
      await anotar(p, 'queda do chefe (rodada 5)')
      await espolioPronto(p); await p.waitForTimeout(450)
      // B5: o texto da relíquia escolhida aparece NA HORA (antes: só na fila de festas, uns 4 s depois) e ela fica no HUD
      const v = await K(p, (k) => k.visao()), rel = CFG.RELIQUIAS[v.espolios[0].reliquia]
      await toca(p, 'espolio0')
      m = await modelo(p)
      confere(!!rel && (m.info || []).join(' | ').includes(rel.texto) && (m.info || [])[0].includes(rel.nome), `B5: o texto da relíquia escolhida aparece na hora: "${(m.info || []).join(' — ')}"`)
      await fase(p, 'carta')
      confere((await viuJa(p, 'reliquiasHud')) && (await p.locator('#bt-reliquias').count()) === 1 && (await viuJa(p, 'info')), `B5: a relíquia aparece no HUD${fmt.toque ? ' do celular' : ''} (ícone pequeno, com botão de toque)`)
      await p.waitForTimeout(300)
      if (fmt.toque) await foto(p, 'reliquias-hud-celular')
      await conferirLayout(p, 'relíquias no HUD')
      await K(p, (k) => k.roboAteLutar()) // a faixa de informação some com a carta posta
      await toca(p, 'reliquias')
      m = await modelo(p)
      confere((m.info || []).join(' | ').includes(rel.texto) && m.relSel === 0, 'B5: tocar na relíquia do HUD mostra o efeito dela')
    }
    await p.close(); await ctx.close()
  }

  // ---------------------------------------------------------------- horda legível (D2), telas na letra do jogo (D6), volume, menu
  {
    const ctx = await novoCtx(), p = await abrir(ctx, `?teste=1&nova=1&semente=${SEM}`)
    await toca(p, 'carta0'); await toca(p, 'terreno1'); await lutarAteOFim(p); await pegar(p) // 1ª vitória: uma conquista ganha (com data)
    await K(p, (k) => k.batalhaCheia())
    await p.waitForFunction(() => window.__keepmile.cena().vivos >= 60, null, { timeout: 20000 })
    await p.waitForFunction(() => window.__keepmile.cena().etiquetas.length >= 1, null, { timeout: 15000 }).catch(() => {})
    await p.waitForTimeout(700)
    await foto(p, nome('horda-legivel'))
    { const c = await K(p, (k) => k.cena())
      confere(c.maxTipoVisivel <= 12 && c.etiquetas.some((n) => n > 12) && c.ocultos > 0, `D2: horda legível — do mesmo tipo, na mesma região, no máximo ${c.maxTipoVisivel} na tela; o resto vira pelotão com etiqueta (${c.etiquetas.map((n) => 'x' + n).join(', ')})`)
      confere(c.contorno.invasor !== c.contorno.aliado && lum(c.contorno.invasor) > 150 && lum(c.contorno.aliado) > 150, `D2: contorno claro nos dois lados e de cor diferente (invasor ${c.contorno.invasor}, aliado ${c.contorno.aliado}; antes o invasor era roxo escuro sobre roxo)`) }
    await K(p, (k) => k.avancarBatalha()); await fase(p, 'carta')
    await toca(p, 'menu'); await p.waitForSelector('#tela:not([hidden])', { timeout: 5000 })
    const pixel = () => p.evaluate(() => {
      const cx = document.getElementById('telaCaixa'), soltos = [], w = document.createTreeWalker(cx, NodeFilter.SHOW_TEXT)
      while (w.nextNode()) { const n = w.currentNode; if (n.textContent.trim() && !n.parentElement.closest('.km-sr')) soltos.push(n.textContent.trim().slice(0, 20)) }
      return { soltos, letras: cx.querySelectorAll('.km-letra > canvas').length, fonte: getComputedStyle(document.body).fontFamily, borda: getComputedStyle(cx).borderImageSource.slice(0, 20), bt: getComputedStyle(cx.querySelector('.km-bt')).borderImageSource.slice(0, 20), woff: performance.getEntriesByType('resource').filter((e) => /\.woff2?/.test(e.name)).length, cabe: cx.getBoundingClientRect().right <= innerWidth && [...cx.querySelectorAll('.km-letra > canvas')].every((c) => c.getBoundingClientRect().right <= cx.getBoundingClientRect().right + 0.5) }
    })
    let t = await pixel()
    confere(t.soltos.length === 0 && t.letras >= 10 && !/Nunito/i.test(t.fonte) && t.woff === 0 && t.borda.startsWith('url("data:image/png') && t.bt.startsWith('url("data:image/png') && t.cabe, `D6: MENU na letra do jogo (${t.letras} textos em pixel, nenhum texto em fonte de fora) e no acabamento do atlas (painel e botões)` + (t.soltos.length ? ' → ' + t.soltos.join(', ') : ''))
    await p.waitForTimeout(200)
    if (fmt.toque) await foto(p, 'menu-pixel-celular')
    // volume de música e de efeitos além do mudo
    const v0 = await K(p, (k) => ({ m: k.som().musica, e: k.som().efeitos }))
    await p.locator('#mMusicaMenos').click(); await p.locator('#mEfeitosMenos').click(); await p.locator('#mEfeitosMenos').click(); await p.locator('#mEfeitosMais').click()
    const v1 = await K(p, (k) => ({ m: k.som().musica, e: k.som().efeitos, mudo: k.som().mudo }))
    confere(Math.abs(v1.m - (v0.m - 0.2)) < 0.011 && Math.abs(v1.e - (v0.e - 0.2)) < 0.011 && v1.mudo === false && (await p.locator('#mMusicaNivel').getAttribute('data-nivel')) === String(Math.round(v1.m * 5)), `controle de volume além do mudo: música ${v0.m} → ${v1.m.toFixed(1)}, efeitos ${v0.e} → ${v1.e.toFixed(1)}`)
    await p.getByRole('button', { name: 'Album' }).click(); await p.waitForSelector('#albumGrade', { timeout: 5000 })
    await p.locator('#albumGrade [data-livre="1"]').first().click()
    t = await pixel()
    confere(t.soltos.length === 0 && t.letras >= 6 && t.cabe && /\w/.test(await p.locator('#albumDetalhe').textContent()), `D6: ÁLBUM na letra do jogo (${t.letras} textos em pixel)` + (t.soltos.length ? ' → ' + t.soltos.join(', ') : ''))
    await p.waitForTimeout(200)
    if (fmt.toque) await foto(p, 'album-pixel-celular')
    await p.locator('#telaPe').click(); await p.getByRole('button', { name: 'Achievements' }).click()
    t = await pixel()
    { const c = await p.evaluate(() => { const f = document.querySelector('#listaConquistas li.km-feita'), a = document.querySelector('#listaConquistas li:not(.km-feita)'); return { id: f?.dataset.id, em: f?.dataset.em, da: f?.querySelector('.km-da')?.textContent || '', semDa: !a?.querySelector('.km-da') } })
      confere(t.soltos.length === 0 && c.id === 'supper' && /^\d{4}-\d\d-\d\d$/.test(c.em || '') && /Medal/.test(c.da) && !/Title/.test(c.da) && c.da.includes(c.em) && c.semDa, `D6: CONQUISTAS na letra do jogo; a conquista ganha mostra o que dá e a data ("${c.da}"), a que falta só o ícone e como ganhar`) }
    if (fmt.toque) { await p.waitForTimeout(200); await foto(p, 'conquistas-pixel-celular') }
    await p.locator('#telaPe').click(); await p.getByRole('button', { name: 'Best runs', exact: true }).click()
    t = await pixel()
    confere(t.soltos.length === 0 && t.letras >= 8 && t.cabe, `D6: BEST RUNS na letra do jogo (${t.letras} textos em pixel)`)
    await p.keyboard.press('Escape')
    // o menu não ignora toque depois de fechar (antes: 400 ms surdo depois de fechar tocando fora)
    await toca(p, 'menu'); await p.waitForSelector('#tela:not([hidden])', { timeout: 5000 })
    await bate(p, 4, fmt.h - 4); await p.waitForTimeout(170)
    confere(await p.locator('#tela').isHidden(), 'tocar fora fecha o menu')
    await toca(p, 'menu'); await p.waitForTimeout(120)
    confere(await p.locator('#tela').isVisible(), 'o menu não ignora o toque logo depois de fechar')
    await p.keyboard.press('Escape')
    await recarregar(p)
    confere(Math.abs((await K(p, (k) => k.som().musica)) - v1.m) < 0.011 && Math.abs((await K(p, (k) => k.som().efeitos)) - v1.e) < 0.011, 'os volumes ficam guardados')
    await p.close(); await ctx.close()
  }

  // ---------------------------------------------------------------- FIM como festa em sequência (D8), cartão de compartilhar (D1)
  {
    const ctx = await novoCtx(), p = await abrir(ctx, `?teste=1&nova=1&semente=${SEM}`)
    await p.keyboard.press('Shift')
    await K(p, (k) => k.jogarSozinho()); await K(p, (k) => k.zerarMedidas())
    let m = await modelo(p)
    confere(m.fase === 'fim' && m.fim.contou === false && m.fim.mostra < m.fim.vencidas && (await p.locator('#bt-denovo').count()) === 0 && (await viuJa(p, 'fimNumero')), 'D8: o fim entra em sequência — começa pelo número de rodadas GRANDE no centro, contando de 0; ainda sem botões')
    await p.waitForFunction(() => window.__keepmile.modelo().fim.mostra >= 3, null, { timeout: 6000, polling: 30 })
    await foto(p, nome('festa-fim-recorde-antes'))
    { const d = await viu(p); m = await modelo(p)
      confere(!d.includes('fimNumeros') && !d.includes('fimRecorde') && m.fim.numeroRet.k >= 3 && Math.abs(m.fim.numeroRet.x + m.fim.numeroRet.w / 2 - (await K(p, (k) => k.layout())).VW / 2) <= 1, `D8: enquanto conta (${m.fim.mostra} de ${m.fim.vencidas}), só o número, no centro e ×${m.fim.numeroRet.k}; nem a placa nem a faixa`) }
    await p.waitForFunction(() => window.__keepmile.modelo().fim.contado && window.__keepmile.desenhou().includes('fimRecorde'), null, { timeout: 8000, polling: 30 })
    { const d = await viu(p); m = await modelo(p)
      confere(m.fim.mostra === m.fim.vencidas && !d.includes('fimNumeros') && (await p.locator('#bt-denovo').count()) === 0, 'D8: depois da contagem a faixa NEW RECORD cruza a tela; a placa ainda não subiu') }
    await p.waitForTimeout(400)
    await foto(p, nome('festa-fim-recorde-pico')); await foto(p, nome('fim-festa'))
    await fimPronto(p); await p.waitForTimeout(500)
    m = await modelo(p)
    { const d = await viu(p), lay = await K(p, (k) => k.layout()), s = await sons(p), cn = await K(p, (k) => k.cena())
      confere(['fimNumeros', 'fimLiga', 'fimAlbum', 'fimRecorde', 'fimFecho'].every((x) => d.includes(x)) && (await p.locator('#bt-denovo').count()) === 1 && (await p.locator('#bt-postar').count()) === 1, 'D8: por fim sobem pontos, liga e próxima carta, e só então os botões')
      confere(!!m.fim.faixaRet && m.fim.faixaRet.x === m.fim.faixaAlvo.x && m.fim.faixaRet.y === m.fim.faixaAlvo.y && m.fim.faixaRet.y >= lay.fimPainel.y && m.fim.faixaRet.y <= lay.fimPainel.y + 12, '"NEW RECORD" pousa junto do número que é o recorde: na linha do SCORE, dentro da placa')
      confere(/ \d+ DMG IN ROUND \d+$/.test(m.fim.melhor || ''), `D8: o melhor momento da partida, tirado do resumo das lutas: "BEST MOMENT: ${m.fim.melhor}"`)
      let maxFl = 0; for (const t of cn.flashes) maxFl = Math.max(maxFl, cn.flashes.filter((x) => x >= t && x < t + 1000).length)
      confere(s.filter((x) => x === 'rankingSobe').length >= 2 && s.includes('recorde') && cn.tremidaMax <= 6 && maxFl <= 3 && cn.picoParticulas <= cn.limite, `D8: a contagem tem som e a festa fica nos limites (${maxFl} clarões/s, tremida ${cn.tremidaMax}, partículas ${cn.picoParticulas} de ${cn.limite})`) }
    // R27, itens 1 e 3: no celular uma placa escura atrás do bloco do número; a silhueta da próxima carta com "N ROUNDS TO UNLOCK"
    { const f = (await modelo(p)).fim, d = await viu(p), lay = await K(p, (k) => k.layout()), nr = f.numeroRet, v = f.veuRet
      if (fmt.toque) confere(d.includes('fimVeu') && !!v && v.x <= nr.x && v.x + v.w >= nr.x + nr.w && v.y <= nr.y && v.y + v.h >= nr.y + nr.h && v.x >= 0 && v.x + v.w <= lay.VW && v.y + v.h <= lay.fimPainel.y, `R27: fim no celular: placa escura atrás de "RUN OVER", do número e de "${T.aguentou(f.vencidas)}" (${v?.w}×${v?.h} px de arte), acima da placa de pontos`)
      else confere(!d.includes('fimVeu'), 'R27: no PC o número do fim continua sem placa (não cobre soldados)')
      const sr = f.silhuetaRet, bs = lay.fimBotoes, fora = (r) => sr.x + sr.w <= r.x || sr.x >= r.x + r.w || lay.fimPainel.y + sr.y + sr.h <= r.y || lay.fimPainel.y + sr.y >= r.y + r.h
      confere(!!f.album && d.includes('fimSilhueta') && !!sr && sr.y >= 0 && sr.y + sr.h <= lay.fimPainel.h && sr.x >= lay.fimPainel.x && sr.x + sr.w <= lay.fimPainel.x + lay.fimPainel.w && bs.every(fora), `R27: o fim mostra a silhueta da próxima carta do álbum (${f.album?.carta}) dentro da placa, sem encostar nos botões`)
      confere(f.album.carta === CFG.ALBUM.ordem[CFG.ALBUM.ordem.indexOf(f.album.carta)] && !f.gancho && /^(1 ROUND|\d+ ROUNDS) TO UNLOCK$/.test(T.proximaCarta(f.album.falta)), `R27: e diz quanto falta: "${T.proximaCarta(f.album.falta)}" (número do álbum; no modo local não há estrada do dia)`) }
    confere(T.aguentou(1) === 'ROUND HELD' && T.aguentou(2) === 'ROUNDS HELD' && T.album.somadas(1) === '1 round won so far' && T.proximaCarta(1) === '1 ROUND TO UNLOCK' && T.srv.replay.fim(1, 100) === 'RUN OVER: 1 ROUND - SCORE 100' && T.dica.horda(1) === '1 INVADER THIS ROUND' && ![T.aguentou(1), T.album.somadas(1), T.proximaCarta(1), T.album.proxima(1), T.rodadasPara(1), T.desafio(1), T.menu.rodadas(1), T.srv.replay.fim(1, 1), T.emRodadas(1)].some((t) => /\b1 ROUNDS\b/i.test(t)), 'R27: "1 ROUND" no singular em todo texto com contagem (fim, álbum, replay, horda)')
    await conferirLayout(p, 'fim em sequência')
    await anotar(p, 'fim com recorde')
    // D1: cartão de compartilhar
    await toca(p, 'postar'); await p.waitForFunction(() => window.__keepmile.link().como !== '', null, { timeout: 8000 })
    { const info = await K(p, (k) => k.cartaoInfo()), n = m.fim.vencidas
      confere(info.desafio === `BEAT MY ${n} ROUNDS` && (info.umaLinha || info.linhas[1].y - (info.linhas[0].y + info.linhas[0].h) <= 2) && info.linhas.map((l) => l.texto).join(' ') === info.desafio, `D1: o cartão lê certo — "${info.linhas.map((l) => l.texto).join(info.umaLinha ? ' ' : ' / ')}" juntos${info.umaLinha ? ', numa linha' : ', uma linha colada na outra'}`)
      confere(info.endereco.includes(`semente=${SEM}`) && info.endereco.includes(`rodadas=${n}`) && info.endereco.startsWith('127.0.0.1') && info.hora !== 'boss-night' && info.pontos.includes(String(m.fim.pontos)), `D1: o cartão traz o endereço escrito ("${info.endereco}") e é de dia (${info.hora})`)
      if (fmt.toque) { const png = Buffer.from((await K(p, (k) => k.cartao())).split(',')[1], 'base64'); await writeFile(path.join(FOTOS, 'share-card-celular.png'), png); confere(png.length < 400 * 1024, `foto share-card-celular.png com ${(png.length / 1024).toFixed(0)} KB (< 400)`) } }
    // sem recorde também há fecho: partida curta (1 carta), até perder as 3 vidas
    await p.waitForTimeout(500)
    await toca(p, 'denovo'); await fase(p, 'carta')
    await toca(p, 'carta0'); await toca(p, 'terreno1')
    for (let i = 0; i < 40; i++) {
      await lutarAteOFim(p)
      const f = await K(p, (k) => k.fase())
      if (f === 'vitoria') { await pegar(p); if ((await K(p, (k) => k.fase())) === 'chefe') { await toca(p, 'seguir'); await fase(p, 'carta') } continue }
      if ((await K(p, (k) => k.estado().fase)) === 'fim') break
      await toca(p, 'seguir'); await p.waitForFunction(() => ['carta', 'chefe'].includes(window.__keepmile.fase()), null, { timeout: 8000 })
      if ((await K(p, (k) => k.fase())) === 'chefe') { await toca(p, 'seguir'); await fase(p, 'carta') }
    }
    await K(p, (k) => k.limparFestas())
    await toca(p, 'seguir'); await fase(p, 'fim')
    await p.waitForTimeout(260)
    await foto(p, nome('festa-fim-sem-recorde-antes'))
    await p.waitForFunction(() => window.__keepmile.desenhou().includes('fimFecho'), null, { timeout: 8000, polling: 30 })
    await p.waitForTimeout(250)
    await foto(p, nome('festa-fim-sem-recorde-pico'))
    await fimPronto(p); await p.waitForTimeout(300)
    m = await modelo(p)
    { const d = await viu(p)
      confere(m.fim.novoRecorde === false && !d.includes('fimRecorde') && d.includes('fimFecho') && / DMG IN ROUND \d+$/.test(m.fim.melhor || '') && (m.fim.faltaLinha === null || /LONGEST RUN/.test(m.fim.faltaLinha)) && !/BEST/.test(m.fim.faltaLinha || '') && (await sons(p)).includes('nivelPequeno'), `D8: SEM recorde também há fecho — "BEST MOMENT: ${m.fim.melhor}" e "${m.fim.faltaLinha}" (R31: sem "N ROUNDS TO YOUR BEST", que repetia o recorde da placa)`) }
    { const L = m.fim.linhas || [], d = m.fim.pontos - m.fim.recordeAntes
      await foto(p, nome('fim-sem-recorde'))
      confere(L.length === 2 && L.every((l) => (l.match(/BEST/g) || []).length <= 1) && (d === 0 || L[0].includes(String(m.fim.recorde))) && L[1] === T.mediaLinha(m.fim.media) && new Set(L).size === 2, `R31 item 4: um "best" só por linha — "${L.join('" / "')}" (recorde numa, média noutra)`) }
    await conferirLayout(p, 'fim sem recorde')
    await anotar(p, 'fim sem recorde')
    await p.close(); await ctx.close()
    // Reduced motion: sem movimento, com som e os números já no lugar
    const ctxM = await novoCtx({ reducedMotion: 'reduce' }), pm = await abrir(ctxM, `?teste=1&nova=1&semente=${SEM}`)
    await pm.keyboard.press('Shift')
    await K(pm, (k) => k.jogarSozinho()); await K(pm, (k) => k.zerarMedidas())
    m = await modelo(pm)
    confere(m.fim.contou === true && m.fim.parado === true && m.fim.mostra === m.fim.vencidas && (await pm.locator('#bt-denovo').count()) === 1, 'D8 com Reduced motion: os números já no lugar e os botões na hora')
    await pm.waitForTimeout(900)
    { const cn = await K(pm, (k) => k.cena()), s = await sons(pm), d = await viu(pm), f = (await modelo(pm)).fim
      confere(cn.tremidaMax === 0 && cn.flashes.length === 0 && s.includes('fimDePartida') && s.includes('recorde') && d.includes('fimRecorde') && f.faixaRet.x === f.faixaAlvo.x && f.faixaRet.y === f.faixaAlvo.y, 'D8 com Reduced motion: sem tremida, sem clarão, faixa parada no lugar, com o som do fim e do recorde') }
    await pm.close(); await ctxM.close()
  }
  if (fmt.toque) {
    const linhas = ['Keepmile — registro da fila de festas (F.log) nas festas fotografadas. Tempos em ms desde a abertura da página.', 'Regra: uma por vez, 400 ms entre elas, a maior por último; conquista e carta nova só depois da escolha do espólio.', '']
    for (const r of registro) {
      linhas.push(`== ${r.qual}`)
      if (!r.log.length) linhas.push('   (nenhuma festa nova passou pela fila)')
      r.log.forEach((l, i) => linhas.push(`   ${String(i + 1).padStart(2)}. ${l.tipo.padEnd(6)} tam ${l.tam}  fase ${String(l.fase).padEnd(8)} ${String(Math.round(l.ini)).padStart(7)} → ${l.fim ? String(Math.round(l.fim)).padStart(7) : 'na tela'}  (${l.fim ? Math.round(l.fim - l.ini) + ' ms' : 'ainda na tela'}${i && r.log[i - 1].fim ? `, ${Math.round(l.ini - r.log[i - 1].fim)} ms depois da anterior` : ''})  ${l.texto}${l.adiada ? '  [esperou o chefe]' : ''}`))
      if (r.seq) linhas.push(`   sequência do fim (não passa pela fila; ms depois de abrir a tela de fim): o número conta de 0 a ${r.seq.n} a partir de +450; ${r.seq.recorde ? 'faixa NEW RECORD com confete' : 'fecho sem recorde'} em +${r.seq.tFaixa}; a placa sobe em +${r.seq.tSobe}; botões em +${r.seq.tBotoes}` + (r.seq.fecho.length ? `; fecho: ${r.seq.fecho.join(' / ')}` : ''))
      if (r.fila.length) linhas.push('   esperando a vez: ' + r.fila.map((f) => f.texto).join(', '))
      linhas.push('')
    }
    await writeFile(path.join(FOTOS, 'festas.txt'), linhas.join('\n'))
    confere(registro.length >= 4, `registro da fila de festas salvo em tests/tela/fotos/reino/festas.txt (${registro.length} festas)`)
  }
  confere(ruins.length === 0, 'R17: zero pedido com 404 ou falha' + (ruins.length ? ' → ' + ruins.slice(0, 5).join(' | ') : ''))
  confere(erros.length === 0, 'R17: zero erro no console' + (erros.length ? ' → ' + erros.slice(0, 5).join(' | ') : ''))
}

/** Só o desenho: nada cortado nem sobreposto em outro tamanho de tela. */
async function soLayout(w, h, toque) {
  console.log(`\n=== desenho ${w}×${h} ===`)
  const erros = [], ruins = []
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: 1 })
  const page = await ctx.newPage(); vigiar(page, erros, ruins)
  await page.goto(base + `?teste=1&nova=1&semente=${SEM}`)
  await page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
  const c = await K(page, (k) => k.cena())
  confere(c.tipo === (h > w ? 'celular' : 'pc') && Number.isInteger(c.e) && c.e >= 1, `${w}×${h}: desenho de ${c.tipo}, ampliação inteira ×${c.e}`)
  { const z = await K(page, (k) => k.css()), q = await page.locator('#bt-carta0').boundingBox() // bug Q10: tela pequena não fica em ×1 (cartas e textos minúsculos)
    confere(z.css >= 1.5 && q.height >= 78 * 1.5, `${w}×${h}: leitura garantida (escala ×${z.css.toFixed(2)}, carta com ${q.height.toFixed(0)} px de altura)`) }
  await page.waitForTimeout(500)
  await foto(page, `abertura-${w}x${h}`)
  await conferirLayout(page, `${w}×${h} abertura`)
  await chancesSemSeta(page, `${w}×${h} abertura`)
  // R38: o pior caso — o terreno 5 (e o 6) em destaque com a seta em cima; a seta nunca sobe para cima das chances
  await page.evaluate(() => { const C = window.__kmCena; C.destaque = { terrenos: new Set([5, 6]), sobe: new Set([6]), forte: 5 } })
  await chancesSemSeta(page, `${w}×${h} terrenos 5 e 6 em destaque`)
  await page.evaluate(() => { window.__kmCena.destaque = null })
  await page.locator('#bt-carta0').click(); await page.locator('#bt-terreno2').click()
  await conferirLayout(page, `${w}×${h} carta posta`)
  await page.locator('#bt-lutar').click()
  await page.waitForFunction(() => window.__keepmile.fase() === 'luta', null, { timeout: 10000 })
  await conferirLayout(page, `${w}×${h} batalha`)
  await K(page, (k) => k.avancarBatalha())
  await page.waitForFunction(() => window.__keepmile.modelo().vitoria?.pronto, null, { timeout: 15000 })
  await conferirLayout(page, `${w}×${h} espólio`)
  await page.waitForTimeout(900)
  // R17 D3 (a regra mudou): nenhuma placa de festa cai junto com a escolha — as conquistas esperam na fila
  { const fe = await K(page, (k) => k.festas())
    confere(fe.atual === null && fe.fila.length >= 1 && (await modelo(page)).brinde === null, `${w}×${h} espólio: nenhuma placa de festa por cima dos 3 espólios (${fe.fila.length} esperando a escolha)`) }
  await foto(page, `espolio-${w}x${h}`)
  if (w === 320 && h === 568) await foto(page, '320x568-espolio')
  // R17: o texto do espólio e das chances nunca abaixo de ~8 px de tela; nada do texto do espólio cortado embaixo
  { const l = await K(page, (k) => k.letra())
    confere(l.chances >= 7.9 && l.espolio >= 7.9 && (l.espolioFim === undefined || l.espolioFim <= l.VH), `${w}×${h}: letra das chances com ${l.chances?.toFixed(1)} px e do espólio com ${l.espolio?.toFixed(1)} px de tela (≥ ~8), sem cortar`) }
  await K(page, (k) => k.jogarSozinho())
  await page.waitForFunction(() => window.__keepmile.modelo().fim?.contou, null, { timeout: 15000 })
  await conferirLayout(page, `${w}×${h} fim`)
  { const f = (await K(page, (k) => k.modelo())).fim, lay = await K(page, (k) => k.layout()), v = f.veuRet, sr = f.silhuetaRet, nr = f.numeroRet
    if (h > w) confere(!!v && v.x >= 0 && v.x + v.w <= lay.VW && v.y >= 0 && v.y <= nr.y && v.y + v.h >= nr.y + nr.h && v.y + v.h <= lay.fimPainel.y, `R27: ${w}×${h} fim: o bloco do número tem a placa escura atrás, inteira na tela e acima da placa de pontos`)
    confere(!f.album || (!!sr && sr.y >= 0 && sr.y + sr.h <= lay.fimPainel.h && lay.fimPainel.y + sr.y + sr.h <= lay.VH && lay.fimBotoes.every((r) => sr.x + sr.w <= r.x || sr.x >= r.x + r.w || lay.fimPainel.y + sr.y + sr.h <= r.y)), `R27: ${w}×${h} fim: a silhueta da próxima carta cabe na placa, acima dos botões`) }
  await foto(page, `fim-${w}x${h}`)
  confere(erros.length === 0 && ruins.length === 0, `${w}×${h}: zero erro e zero 404` + (erros.length + ruins.length ? ' → ' + [...erros, ...ruins].slice(0, 4).join(' | ') : ''))
  await ctx.close()
}

/** R30 (N7): a conferência que faltou na R27 — o brilho da carta RARA antes de virar. O álbum inicial não tem carta rara, então o teste
 *  enche o álbum pelo gancho de teste (`?teste=1`: guardaSet) e acha, com o motor, uma semente cuja 1ª mão tem UMA rara na 1ª posição. */
async function r30() {
  console.log('\n=== R30: brilho da carta rara antes de virar (celular 360×740) ===')
  const erros = [], ruins = []
  const iRar = (c) => CFG.RARIDADES.findIndex((r) => r.id === CFG.CARTAS[c].raridade)
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
  const page = await ctx.newPage(); vigiar(page, erros, ruins)
  await page.goto(base + `?teste=1&nova=1&semente=${SEM}`)
  await page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
  confere((await K(page, (k) => k.liberadas())).every((c) => iRar(c) < 2), 'R30 N7: o álbum inicial não tem carta rara (por isso a R27 não conferia o brilho com a semente fixa)')
  await K(page, (k, n) => k.guardaSet('rodadas', n), 100000) // todas as cartas liberadas (só neste aparelho de teste)
  await page.goto(base + `?teste=1&nova=1&semente=${SEM}`)
  await page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
  const liberadas = await K(page, (k) => k.liberadas())
  confere(liberadas.length === CFG.ALBUM.inicial.length + CFG.ALBUM.ordem.length && liberadas.some((c) => iRar(c) >= 2), `R30 N7: álbum cheio pelo gancho de teste (${liberadas.length} cartas)`)
  let semente = null, oferta = null
  for (let i = 1; i < 2000 && !semente; i++) { const sm = 'e2e-keepmile-rara-' + i, of = visaoDoMotor(criarPartida({ semente: sm, cartasLiberadas: liberadas })).oferta.map((o) => o.carta); if (iRar(of[0]) >= 2 && iRar(of[1]) < 2 && iRar(of[2]) < 2) { semente = sm; oferta = of } }
  if (!semente) { falha('R30 N7: nenhuma semente com carta rara na 1ª posição da mão'); await ctx.close(); return }
  await page.goto(base + `?teste=1&nova=1&semente=${semente}`)
  await page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
  let m = await modelo(page)
  const rar = CFG.CARTAS[oferta[0]].raridade, cor = m.chances.find((c) => c.id === rar)
  confere(JSON.stringify(m.mao.map((c) => c.carta)) === JSON.stringify(oferta), `R30 N7: semente ${semente}: a mão da tela é a do motor (${oferta.map((c) => CFG.CARTAS[c].nome + ' ' + CFG.CARTAS[c].raridade).join(', ')})`)
  // a cor de um ponto da tela (coordenada lógica da interface), lida de uma cópia pequena do canvas
  const ponto = (x, y) => page.evaluate(([px, py]) => {
    const c = document.getElementById('cena'), e = window.__keepmile.css().e, t = document.createElement('canvas'); t.width = 1; t.height = 1
    const g = t.getContext('2d', { willReadFrequently: true }); g.drawImage(c, Math.round(px * e), Math.round(py * e), 1, 1, 0, 0, 1, 1)
    const d = g.getImageData(0, 0, 1, 1).data; return '#' + [d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()
  }, [x, y])
  const R = await K(page, (k) => k.revela()), lay = await K(page, (k) => k.layout()), c0 = lay.cartas[0], c2 = lay.cartas[2]
  // relógio da mão parado logo antes de a 1ª carta virar: ela já pousou, ainda está de costas
  await K(page, (k, ms) => k.maoFixar(ms), R.espera - 10); await page.waitForTimeout(150)
  m = await modelo(page)
  confere(m.maoViradas === 3 && (await viuJa(page, 'maoRara')), `R30 N7: a carta ${CFG.CARTAS[oferta[0]].nome} (${cor.nome}) está de costas e a interface desenhou o brilho da raridade`)
  // a moldura do brilho (2 px na cor da raridade, com o filete claro por fora) abraça o verso e PULSA 1 px: a linha logo acima do
  // verso é sempre dela (o filete claro, ou a cor quando a moldura abre); a linha seguinte só acende quando a moldura abre
  const RC = [cor.cor.toUpperCase(), cor.claro.toUpperCase()], dentro = [], fora = []
  for (let i = 0; i < 14; i++) { dentro.push(await ponto(c0.x + 20, c0.y - 1)); fora.push(await ponto(c0.x + 20, c0.y - 2)); await page.waitForTimeout(45) }
  confere(dentro.every((p) => RC.includes(p)), `R30 N7: em volta do verso da rara há a moldura na cor da raridade (${cor.nome} ${RC.join('/')}; lido ${[...new Set(dentro)].join(' ')})`)
  confere(RC.every((c) => dentro.includes(c)) && fora.includes(RC[1]) && fora.some((p) => !RC.includes(p)), `R30 N7: e ela PULSA (a moldura abre e fecha 1 px: a linha de fora acende e apaga — ${[...new Set(fora)].join(' ')})`)
  { const base2 = R.espera - 10 - 2 * 90, sobe = Math.round(Math.max(0, 1 - base2 / 220) * 60), cores = new Set(m.chances.map((c) => c.cor.toUpperCase()))
    for (const c of m.chances) cores.add(c.claro.toUpperCase())
    confere(!cores.has(await ponto(c2.x + 20, c2.y + sobe - 1)) && !cores.has(await ponto(c2.x + 20, c2.y + sobe - 2)), 'R30 N7: a carta comum da mesma mão chega de costas SEM moldura de raridade') }
  await foto(page, 'mao-rara-brilho-celular')
  // a rara abre: o brilho some (a moldura era só do verso)
  await K(page, (k, ms) => k.maoFixar(ms), R.espera + R.vira + 20); await page.waitForTimeout(150)
  confere((await modelo(page)).maoViradas === 2 && !(await viu(page)).includes('maoRara'), 'R30 N7: quando a rara vira para a frente o brilho some (as outras duas ainda de costas, sem brilho)')
  await K(page, (k) => k.maoFixar(null)); await page.waitForTimeout(80)
  confere((await modelo(page)).maoRevelada && !(await viu(page)).includes('maoVirada'), 'R30 N7: solta a revelação: as três abertas')
  // Reduced motion: a mão já chega aberta — sem verso, sem brilho piscando
  const ctxR = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const pr = await ctxR.newPage(); vigiar(pr, erros, ruins)
  await pr.goto(base + `?teste=1&nova=1&semente=${SEM}`)
  await pr.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
  await K(pr, (k, n) => k.guardaSet('rodadas', n), 100000)
  await pr.goto(base + `?teste=1&nova=1&semente=${semente}`)
  await pr.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 })
  await pr.waitForTimeout(200)
  { const mr = await modelo(pr), d = await viu(pr)
    confere(JSON.stringify(mr.mao.map((c) => c.carta)) === JSON.stringify(oferta) && mr.maoViradas === 0 && !d.includes('maoRara') && !d.includes('maoVirada'), 'R30 N7: Reduced motion: a mesma mão com rara chega aberta, sem verso e sem brilho piscando') }
  await ctxR.close()
  confere(erros.length === 0 && ruins.length === 0, 'R30: zero erro e zero 404' + (erros.length + ruins.length ? ' → ' + [...erros, ...ruins].slice(0, 4).join(' | ') : ''))
  await ctx.close()
}

/** R31 (veto do guardião): a chance da tela é a do motor. R34: é a chance da MÃO (sem repetir carta). Álbum inicial: só Common/Uncommon
 *  (rodada 1: 54/46; no álbum 50/50); álbum cheio (gancho de teste): a
 *  tabela inteira da rodada 2 em diante (na rodada 1 só Tropas que lutam: sem lendária); o álbum separa "agora" de "tudo liberado". */
async function r31() {
  console.log('\n=== R31: chances verdadeiras (celular 360×740) ===')
  const erros = [], ruins = []
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await ctx.newPage(); vigiar(page, erros, ruins)
  const abrirJogo = async (q) => { await page.goto(base + q); await page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 }); await page.waitForTimeout(250) }
  const odds = async () => (await K(page, (k) => k.layout())).odds.linhas.flat().join(' ')
  const pares = (l) => JSON.stringify(l.map((c) => [c.id, c.chance]))
  const soma = (l) => l.reduce((a, c) => a + c.chance, 0)
  await abrirJogo(`?teste=1&nova=1&semente=${SEM}`)
  let m = await modelo(page), v = await K(page, (k) => k.visao()), txt = await odds()
  confere(pares(m.chances) === JSON.stringify([['C', 54], ['U', 46]]) && soma(m.chances) === 100 && txt.startsWith(T.chances) && txt.includes('Common 54%') && txt.includes('Uncommon 46%') && !/Rare|Epic|Legendary/.test(txt), `R31: álbum inicial: a mão mostra só "${txt}" (soma ${soma(m.chances)})`)
  confere(pares(m.chances) === pares(v.chances.filter((c) => c.chance > 0)) && pares(v.chances) === pares(chancesDaMao({ cartas: CFG.ALBUM.inicial.filter((id) => CFG.CARTAS[id].tipo === 'tropa' && CFG.CARTAS[id].dano > 0) })), 'R34: o número da mão é o do motor (visao.chances = chancesDaMao das Tropas da rodada 1)')
  await foto(page, 'mao-chances-inicial-celular')
  // o álbum: a chance de AGORA (só Common/Uncommon) e, à parte e rotulada, a tabela com tudo liberado
  await page.locator('#bt-menu').tap(); await page.waitForSelector('#tela:not([hidden])', { timeout: 5000 })
  await page.getByRole('button', { name: 'Album' }).click(); await page.waitForSelector('#albumChances', { timeout: 5000 })
  let alb = await page.evaluate(() => ({ agora: document.getElementById('albumChances').textContent, todas: document.getElementById('albumChancesTodas')?.textContent ?? null }))
  confere(alb.agora === `${T.album.chances}: Common 50% · Uncommon 50%`, `R31: álbum inicial: "${alb.agora}"`)
  confere(alb.todas === `${T.album.chancesTodas}: ` + chancesDaMao({ cartas: Object.keys(CFG.CARTAS) }).map((r) => `${r.nome} ${r.chance}%`).join(' · '), `R31: e à parte: "${alb.todas}"`)
  await page.evaluate(() => document.getElementById('albumChancesTodas').scrollIntoView({ block: 'center' })); await page.waitForTimeout(150)
  await foto(page, 'album-chances-celular')
  // álbum cheio pelo gancho de teste
  await K(page, (k, n) => k.guardaSet('rodadas', n), 100000)
  await abrirJogo(`?teste=1&nova=1&semente=${SEM}`)
  const todas = await K(page, (k) => k.liberadas())
  m = await modelo(page); txt = await odds()
  const tropas = chancesDaMao({ cartas: todas.filter((id) => CFG.CARTAS[id].tipo === 'tropa' && CFG.CARTAS[id].dano > 0) }).filter((c) => c.chance > 0)
  confere(todas.length === Object.keys(CFG.CARTAS).length && pares(m.chances) === pares(tropas) && !txt.includes('Legendary') && soma(m.chances) === 100, `R31: álbum cheio, rodada 1 (só Tropas que lutam): "${txt}"`)
  await K(page, (k) => k.jogarSozinho({ ateRodada: 2 })); await page.waitForTimeout(1500)
  m = await modelo(page); v = await K(page, (k) => k.visao()); txt = await odds()
  { const sobe = [...new Set(v.terrenos.filter((t) => t && t.nivel < CFG.PARTIDA.nivelMax).map((t) => t.carta))], esp = chancesDaMao({ cartas: todas, sobe }).filter((c) => c.chance > 0)
    confere(v.rodada === 2 && pares(m.chances) === pares(esp) && esp.every((r) => txt.includes(`${r.nome} ${r.chance}%`)) && soma(m.chances) === 100, `R34: álbum cheio, rodada 2 (com a carta que sobe): "${txt}" (soma ${soma(m.chances)})`) }
  await foto(page, 'mao-chances-album-cheio-celular')
  await chancesSemSeta(page, 'álbum cheio (todas as raridades) no celular')
  await page.locator('#bt-menu').tap(); await page.waitForSelector('#tela:not([hidden])', { timeout: 5000 })
  await page.getByRole('button', { name: 'Album' }).click(); await page.waitForSelector('#albumChances', { timeout: 5000 })
  alb = await page.evaluate(() => ({ agora: document.getElementById('albumChances').textContent, todas: document.getElementById('albumChancesTodas')?.textContent ?? null }))
  confere(alb.agora === `${T.album.chances}: ` + chancesDaMao({ cartas: todas }).map((r) => `${r.nome} ${r.chance}%`).join(' · ') && alb.todas === null, `R31: álbum cheio: "${alb.agora}" (sem a linha repetida de "tudo liberado")`)
  confere(erros.length === 0 && ruins.length === 0, 'R31: zero erro e zero 404' + (erros.length + ruins.length ? ' → ' + [...erros, ...ruins].slice(0, 4).join(' | ') : ''))
  await ctx.close()
}

/** R39 — vitória na rodada 20 e as 30 conquistas. O robô de plano do motor joga pela tela até a rodada 20 (gancho `jogarSozinho`, sem
 *  esperar animação); a luta da rodada 20 é apertada no botão de verdade. A semente é conferida ANTES com o motor (vence a 20). */
const SEM39 = 'e2e-keepmile-r39-35', ROBO39 = 'plano:muralha'
function motorAte20(semente, liberadas) {
  let e = criarPartida({ semente, cartasLiberadas: liberadas }), s = 12345, n = 0
  const inteiro = (k) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % k }
  while (e.fase !== 'fim' && n++ < 3000) { if (e.rodada >= 20 && e.fase === 'carta' && !e.cartaPosta) break; e = aplicar(e, escolher(ROBO39, e, inteiro)).estado }
  if (e.fase === 'fim') return { chegou: false }
  let s2 = 999; const int2 = (k) => { s2 = (Math.imul(s2, 1664525) + 1013904223) >>> 0; return s2 % k }
  for (let i = 0; i < 50; i++) { const c = escolher(ROBO39, e, int2); if (c.tipo === 'batalhar') break; e = aplicar(e, c).estado }
  const r = aplicar(e, { tipo: 'batalhar' })
  return { chegou: true, antes: visaoDoMotor(e).venceu, depois: visaoDoMotor(r.estado).venceu, vencidas: r.estado.vencidas }
}
async function r39(fmt) {
  console.log(`\n=== R39: vitória na rodada 20 e 30 conquistas (${fmt.nome} ${fmt.w}×${fmt.h}) ===`)
  const erros = [], ruins = [], META = CFG.PARTIDA.rodadaDaVitoria, guarda = fmt.nome === 'celular' || fmt.nome === 'pc'
  const novoCtx = (extra = {}) => browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...extra })
  const abrir = async (page, q) => { await page.goto(base + q); await page.waitForFunction(() => window.__keepmile?.pronto, null, { timeout: 20000 }); await page.waitForTimeout(250) }
  const toca = async (page, id) => { const l = page.locator('#bt-' + id); if (fmt.toque) await l.tap(); else await l.click() }
  const fot = async (page, nome) => { if (guarda) await foto(page, `${nome}-${fmt.nome}`) }
  const V = (page) => K(page, (k) => k.vitoria())
  /** O retângulo (px de arte) cabe na tela e não encosta em nenhum botão de toque? (terrenos e horda são áreas do mundo, não botões desenhados) */
  const livre = (page, ret) => page.evaluate((r) => { const e = window.__keepmile.css().css, a = { l: r.x * e, t: r.y * e, r: (r.x + r.w) * e, b: (r.y + r.h) * e }, em = []
    for (const b of document.querySelectorAll('#toques button')) { if (/^bt-terreno|^bt-horda$/.test(b.id)) continue; const q = b.getBoundingClientRect(); if (Math.min(a.r, q.right) - Math.max(a.l, q.left) > 1 && Math.min(a.b, q.bottom) - Math.max(a.t, q.top) > 1) em.push(b.id) }
    return { dentro: a.l >= 0 && a.t >= 0 && a.r <= innerWidth + 0.5 && a.b <= innerHeight + 0.5, em } }, ret)
  /** Espia os efeitos que o app pede à cena (fogos, confete). */
  const espiar = (page) => page.evaluate(() => { const C = window.__kmCena; if (!C.__log) { const o = C.efeito; C.__log = []; C.efeito = (n, ...a) => { C.__log.push(n); return o(n, ...a) } } C.__log.length = 0 })
  const efeitos = (page) => page.evaluate(() => window.__kmCena.__log.slice())
  const apertarLutar = async (page) => { await toca(page, (await page.locator('#bt-lutar2').count()) ? 'lutar2' : 'lutar'); await fase(page, 'luta'); await page.waitForTimeout(120) }
  const lutarA20 = async (page) => {
    await K(page, (k, r) => k.jogarSozinho({ robo: r, ateRodada: 20 }), ROBO39)
    await K(page, (k, r) => k.roboAteLutar(r), ROBO39); await page.waitForTimeout(200)
    const antes = await V(page), v = await K(page, (k) => k.visao())
    await apertarLutar(page)
    // rodada 20 = luta de chefe: a barra de vida dele (R38) aparece com a horda — guarda onde ela fica
    const barra = await page.waitForFunction(() => window.__keepmile.med().chefeBarraRet || null, null, { timeout: 8000 }).then((h) => h.jsonValue(), () => null)
    await K(page, (k) => k.zerarMedidas()); await espiar(page)
    await K(page, (k) => k.avancarBatalha()); await fase(page, 'vitoria', 10000); await viuJa(page, 'festaReino')
    return { antes, rodada: v.rodada, venceuAntes: v.venceu, barra }
  }

  // ---- a semente: o motor diz que este robô chega à rodada 20 e vence (se o balanceamento mudar, procurar outra semente)
  const mt = motorAte20(SEM39, CFG.ALBUM.inicial.slice())
  confere(mt.chegou && mt.antes === false && mt.depois === true && mt.vencidas === META, `R39: no motor, a semente ${SEM39} com o robô ${ROBO39} vence a rodada ${META} (venceu: false → true)`)
  if (!(mt.chegou && mt.depois)) return

  // ================= 1. meta à vista, festa na passagem, selo, uma vez só, fim com vitória
  const ctx = await novoCtx(), page = await ctx.newPage(); vigiar(page, erros, ruins)
  await abrir(page, `?teste=1&nova=1&semente=${SEM39}`)
  { const m = await V(page), d = await viu(page), l = m.metaRet ? await livre(page, m.metaRet) : null
    confere(m.meta === META && !m.venceu && d.includes('meta') && !d.includes('resistiu') && m.metaRet?.texto === `HOLD TO ROUND ${META}` && m.metaRet.texto === T.meta(META), `R39 meta: na 1ª rodada o HUD mostra "${m.metaRet?.texto}" (número do config)`)
    confere(!!l && l.dentro && l.em.length === 0, `R39 meta: discreta — inteira na tela e fora de todos os botões${l && l.em.length ? ' → ' + l.em.join(', ') : ''}`)
    await conferirLayout(page, `R39 ${fmt.nome} rodada 1`); await fot(page, 'r39-meta') }
  const L1 = await lutarA20(page)
  let m = await V(page), d = await viu(page)
  confere(L1.rodada === META && L1.venceuAntes === false && L1.antes.festas === 0 && !L1.antes.venceu, `R39 festa: antes da luta da rodada ${META} nada de festa (venceu: false, festas: 0)`)
  confere(m.festas === 1 && !!m.reino && !m.reino.fim && !m.pronto && d.includes('festaReino'), 'R39 festa: `venceu` passou a true depois da luta → a festa do reino dispara (1 vez) e segura os espólios')
  { const r = m.reino?.ret
    confere(!!r && r.linhas.join(' ') === `ROUND ${META} HELD!` && r.sub === 'KEEP GOING FOR SCORE' && r.linhas.join(' ') === T.festaReino(META), `R39 festa: a faixa diz "${r?.linhas.join(' ')}" e embaixo "${r?.sub}"`)
    confere(!!r && r.maior <= r.VW - 4 && r.y >= 0 && r.y + r.h <= r.VH && r.linhas.length <= 2, `R39 festa: a faixa cabe na tela (título ×${r?.k}, ${r?.maior} de ${r?.VW} px de arte, ${r?.linhas.length} linha(s))`) }
  { const br = L1.barra, r = m.reino?.ret // rodada 20 = luta de chefe (R38: barra de vida própria)
    confere(!!br && !!r && (r.y + r.h <= br.y || r.y >= br.y + br.h), `R39 festa: a faixa (y ${r?.y}–${r ? r.y + r.h : '?'}) não tapa a barra do chefe ${br?.nome} (y ${br?.y}–${br ? br.y + br.h : '?'})`) }
  { const b = await page.evaluate(() => [...document.querySelectorAll('#toques button')].map((x) => x.id))
    confere(b.length === 1 && b[0] === 'bt-seguir', `R39 festa: durante a festa o único toque é o de pular (${b.join(', ')})`) }
  await page.waitForTimeout(650)
  { const c = await K(page, (k) => k.cena()), ef = await efeitos(page), fl = c.flashes, so = await sons(page), mu = await K(page, (k) => k.musica())
    confere(ef.filter((x) => x === 'fireworks').length >= 3 && ef.filter((x) => x === 'confetti').length >= 3, `R39 festa: fogos e confete na cena (${ef.filter((x) => x === 'fireworks').length} fogos e ${ef.filter((x) => x === 'confetti').length} confetes em 0,8 s)`)
    confere(fl.length >= 1 && fl.length <= 3 && c.tremidaMax <= 6 && c.picoParticulas <= c.limite, `R39 festa: ${fl.length} clarão (≤ 3 por segundo), tremida ${c.tremidaMax} px (≤ 6), partículas ${c.picoParticulas} (≤ ${c.limite})`)
    confere(so.includes('vitoria') && so.includes('recorde') && JSON.stringify(mu).includes('vitoria'), 'R39 festa: som de vitória + fanfarra e a música no momento "vitoria"') }
  await fot(page, 'r39-festa')
  { const t = await page.waitForFunction(() => { const v = window.__keepmile.vitoria(); return v.pronto ? v.reino.ha : null }, null, { timeout: 6000, polling: 30 }).then((h) => h.jsonValue())
    confere(t >= 1500 && t <= 2700, `R39 festa: segura ${Math.round(t)} ms (1,5–2,5 s) e devolve o controle`)
    const b = await page.evaluate(() => [...document.querySelectorAll('#toques button')].map((x) => x.id))
    confere(b.some((x) => x.startsWith('bt-espolio')) && !b.includes('bt-seguir') && !(await viu(page)).includes('festaReino'), 'R39 festa: depois dela os espólios aparecem e a faixa sai') }
  await K(page, (k, r) => k.jogarSozinho({ robo: r, ateRodada: 21 }), ROBO39); await page.waitForTimeout(250)
  m = await V(page); d = await viu(page)
  { const l = m.metaRet ? await livre(page, m.metaRet) : null, v = await K(page, (k) => k.visao())
    confere(v.venceu === true && m.venceu && d.includes('resistiu') && !d.includes('meta') && m.metaRet?.texto === 'HELD', `R39 selo: na rodada ${v.rodada} o HUD troca a meta pelo selo "${m.metaRet?.texto}"`)
    confere(!!l && l.dentro && l.em.length === 0, 'R39 selo: inteiro na tela e fora de todos os botões' + (l && l.em.length ? ' → ' + l.em.join(', ') : ''))
    await conferirLayout(page, `R39 ${fmt.nome} com o selo`); await fot(page, 'r39-selo') }
  // mais uma luta depois de vencer: a festa NÃO repete
  { await K(page, (k, r) => k.roboAteLutar(r), ROBO39); await page.waitForTimeout(150)
    await apertarLutar(page)
    await K(page, (k) => k.avancarBatalha()); await page.waitForFunction(() => window.__keepmile.fase() !== 'luta', null, { timeout: 10000 }); await page.waitForTimeout(150)
    m = await V(page)
    confere(m.festas === 1 && !m.reino && !(await viu(page)).includes('festaReino'), `R39 festa: a luta seguinte (${await K(page, (k) => k.fase())}) não repete a festa (festas: ${m.festas})`) }
  // recarregar com a partida já vencida: volta com o selo, sem festa
  await abrir(page, '?teste=1')
  m = await V(page)
  confere(m.venceu && m.festas === 0 && !m.reino, 'R39 festa: recarregar a partida já vencida não dispara a festa de novo (o selo continua)')
  // até o fim: "THE KINGDOM HELD"
  await K(page, (k, r) => k.jogarSozinho({ robo: r }), ROBO39); await fase(page, 'fim'); await page.waitForFunction(() => window.__keepmile.fimInfo()?.contou, null, { timeout: 12000 }); await page.waitForTimeout(400)
  { const f = await K(page, (k) => k.fimInfo()), dd = await viu(page), res = await K(page, (k) => k.resultado())
    confere(res.venceu === true && f.venceu && f.titulo === 'THE KINGDOM HELD' && f.titulo === T.fimVenceu && dd.includes('fimVenceu'), `R39 fim: com vitória (${f.vencidas} rodadas) o título é "${f.titulo}" na fita de ouro`)
    confere(f.tituloW <= f.VW - 4 && !!f.fita && f.fita.x >= 0 && f.fita.x + f.fita.w <= f.VW && (!f.veu || f.veu.y + f.veu.h <= f.painelY) && (!f.fecho || f.fecho.y + f.fecho.h <= f.painelY), `R39 fim: nada cortado (título ${f.linhas.join(' / ')}: ${f.tituloW} de ${f.VW} px; bloco acima da placa)`)
    await conferirLayout(page, `R39 ${fmt.nome} fim com vitória`); await fot(page, 'r39-fim-vitoria')
    const ci = await K(page, (k) => k.cartaoInfo())
    confere(ci.faixa?.texto === 'THE KINGDOM HELD' && ci.faixa.x >= 0 && (ci.faixa.x + ci.faixa.w) * 2 <= ci.w, `R39 cartão: com a faixa de vitória "${ci.faixa?.texto}" (cabe no cartão de ${ci.w}×${ci.h})`)
    if (guarda) { const png = Buffer.from((await K(page, (k) => k.cartao())).split(',')[1], 'base64'); await writeFile(path.join(FOTOS, `r39-cartao-${fmt.nome}.png`), png); confere(png.length < 400 * 1024, `foto r39-cartao-${fmt.nome}.png com ${(png.length / 1024).toFixed(0)} KB (< 400)`) } }
  // melhores partidas (aparelho): selo em quem venceu
  const abrirMelhores = async () => { await K(page, (k) => k.limparFestas()); await toca(page, 'menu'); await page.waitForSelector('#tela:not([hidden])', { timeout: 5000 }); await page.locator('#mLiga').click(); await page.waitForSelector('#listaMelhores', { timeout: 5000 }) }
  await abrirMelhores()
  { const l = await page.evaluate(() => [...document.querySelectorAll('#listaMelhores li')].map((li) => ({ v: li.dataset.venceu, selo: li.querySelector('.km-selo')?.textContent || '' })))
    confere(l.length === 1 && l[0].v === '1' && l[0].selo === 'HELD', `R39 melhores partidas: a partida que venceu tem o selo "${l[0]?.selo}"`) }
  await page.keyboard.press('Escape')
  // ---- fim SEM vitória (mesmo aparelho): "RUN OVER", sem fita, sem faixa no cartão, sem selo na lista
  await abrir(page, `?teste=1&nova=1&semente=${SEM}`)
  await K(page, (k) => k.jogarSozinho({})); await fase(page, 'fim'); await page.waitForFunction(() => window.__keepmile.fimInfo()?.contou, null, { timeout: 12000 }); await page.waitForTimeout(400)
  { const f = await K(page, (k) => k.fimInfo()), dd = await viu(page), ci = await K(page, (k) => k.cartaoInfo()), v = await V(page)
    confere(!f.venceu && f.vencidas < META && f.titulo === 'RUN OVER' && f.titulo === T.fim && !dd.includes('fimVenceu') && !f.fita && ci.faixa === null && v.festas === 0, `R39 fim: sem vitória (${f.vencidas} rodadas) o título é "${f.titulo}", sem fita e sem faixa no cartão`)
    await fot(page, 'r39-fim-sem-vitoria') }
  await abrirMelhores()
  { const l = await page.evaluate(() => [...document.querySelectorAll('#listaMelhores li')].map((li) => ({ v: li.dataset.venceu, selo: !!li.querySelector('.km-selo') })))
    confere(l.length === 2 && l.filter((x) => x.v === '1' && x.selo).length === 1 && l.filter((x) => x.v === '0' && !x.selo).length === 1, 'R39 melhores partidas: duas partidas, o selo só na que venceu')
    await page.evaluate(() => document.getElementById('listaMelhores').scrollIntoView({ block: 'center' })); await page.waitForTimeout(150)
    if (fmt.nome === 'celular') await foto(page, 'r39-melhores-celular') }
  // conquistas ganhas pela regra comum nesta conta de teste (modo local)
  { const g = await K(page, (k) => k.guarda()), ids = new Set(LISTA.map((c) => c.id))
    confere(g.conquistas.length >= 6 && g.conquistas.every((c) => ids.has(c)) && ['supper', 'road', 'double', 'mole', 'pudding', 'tally25'].every((c) => g.conquistas.includes(c)), `R39 conquistas (modo local, regra do módulo comum): ${g.conquistas.length} ganhas em 2 partidas — ${g.conquistas.join(', ')}`)
    confere(g.conquistas.every((c) => /^\d{4}-\d\d-\d\d$/.test(g.conquistasEm[c] || '')), 'R39 conquistas: cada uma ganha na partida ficou com a data') }
  await ctx.close()

  // ================= 2. Reduced motion: só a faixa (sem clarão, sem tremida, sem fogos); um toque pula
  { const ctxR = await novoCtx({ reducedMotion: 'reduce' }), pr = await ctxR.newPage(); vigiar(pr, erros, ruins)
    await abrir(pr, `?teste=1&nova=1&semente=${SEM39}`)
    await lutarA20(pr)
    const mr = await V(pr), dr = await viu(pr)
    confere(mr.festas === 1 && !!mr.reino && dr.includes('festaReino') && mr.reino.ret.linhas.join(' ') === `ROUND ${META} HELD!`, 'R39 Reduced motion: a festa do reino acontece (a faixa está na tela)')
    await pr.waitForTimeout(500)
    const c = await K(pr, (k) => k.cena()), ef = await efeitos(pr)
    confere(c.menos && c.flashes.length === 0 && c.tremidaMax === 0 && !ef.includes('fireworks') && !ef.includes('confetti'), `R39 Reduced motion: sem clarão (${c.flashes.length}), sem tremida (${c.tremidaMax}), sem fogos nem confete — só a faixa`)
    if (fmt.nome === 'celular') await foto(pr, 'r39-festa-reduced-celular')
    // um toque pula
    const antes = await V(pr)
    if (fmt.toque) await pr.locator('#bt-seguir').tap(); else await pr.locator('#bt-seguir').click()
    await pr.waitForTimeout(120)
    const dp = await V(pr)
    confere(!antes.pronto && antes.reino.ha < 1400 && dp.pronto && dp.reino.fim, `R39 festa: um toque aos ${Math.round(antes.reino.ha)} ms pula a festa e devolve o controle na hora`)
    await ctxR.close() }

  // ================= 3. As 30 conquistas em 4 grupos; as 12 antigas do aparelho ficam; degraus pelas rodadas guardadas; barra "123 / 200"
  { const ANTIGAS = ['supper', 'road', 'plate', 'last', 'house', 'brass', 'family', 'penny', 'double', 'mole', 'pudding', 'librarian'], DATA = '2026-11-01'
    const ctxC = await novoCtx()
    await ctxC.addInitScript(([ids, dia]) => { try { if (!localStorage.getItem('keepmile_v1')) localStorage.setItem('keepmile_v1', JSON.stringify({ rodadas: 123, recorde: 0, melhores: [], conquistas: ids, conquistasEm: Object.fromEntries(ids.map((i) => [i, dia])), partidas: 9, dica: true })) } catch { /* ok */ } }, [ANTIGAS, DATA])
    const pc = await ctxC.newPage(); vigiar(pc, erros, ruins)
    await abrir(pc, `?teste=1&nova=1&semente=${SEM}`)
    const g = await K(pc, (k) => k.guarda()), degraus = Object.entries(CFG.CONQUISTAS.rodadasSomadas), ligados = degraus.filter(([, n]) => n <= 123).map(([id]) => id)
    confere(ANTIGAS.every((c) => g.conquistas.includes(c) && g.conquistasEm[c] === DATA), 'R39 conquistas: as 12 antigas guardadas no aparelho continuam, com a data delas')
    confere(ligados.length === 3 && ligados.every((c) => g.conquistas.includes(c) && !g.conquistasEm[c]) && degraus.filter(([, n]) => n > 123).every(([id]) => !g.conquistas.includes(id)), `R39 conquistas: com 123 rodadas guardadas os degraus ${ligados.join(', ')} ligam sozinhos (sem data) e os maiores não`)
    await toca(pc, 'menu'); await pc.waitForSelector('#tela:not([hidden])', { timeout: 5000 })
    await pc.getByRole('button', { name: 'Achievements' }).click(); await pc.waitForSelector('#listaConquistas', { timeout: 5000 })
    const t = await pc.evaluate(() => {
      const corpo = document.getElementById('telaCorpo').getBoundingClientRect(), caixa = document.getElementById('telaCaixa').getBoundingClientRect()
      const secs = [...document.querySelectorAll('#listaConquistas section')].map((s) => ({ grupo: s.dataset.grupo, titulo: s.querySelector('h3 .km-sr')?.textContent || '', conta: s.querySelectorAll('h3 .km-sr')[1]?.textContent || '', ids: [...s.querySelectorAll('li')].map((li) => li.dataset.id) }))
      const itens = [...document.querySelectorAll('#listaConquistas li')].map((li) => { const q = li.getBoundingClientRect(), tx = [...li.querySelectorAll('.km-medalha-texto > .km-letra')]
        return { id: li.dataset.id, feita: li.classList.contains('km-feita'), em: li.dataset.em, nome: tx[0]?.querySelector('.km-sr').textContent || '', fonteNome: tx[0]?.dataset.fonte, como: tx[1]?.querySelector('.km-sr').textContent || '', da: li.querySelector('.km-da')?.textContent || '', medalha: !!li.querySelector('canvas[data-icone]'),
          barra: li.querySelector('.km-degrau') ? { valor: li.querySelector('.km-degrau').dataset.valor, meta: li.querySelector('.km-degrau').dataset.meta, texto: li.querySelector('.km-degrau-texto .km-sr').textContent, pct: li.querySelector('.km-degrau i').style.width, agora: li.querySelector('[role=progressbar]').getAttribute('aria-valuenow'), max: li.querySelector('[role=progressbar]').getAttribute('aria-valuemax') } : null,
          cabe: q.left >= corpo.left - 0.5 && q.right <= corpo.right + 0.5 && [...li.querySelectorAll('canvas')].every((c) => { const r = c.getBoundingClientRect(); return r.left >= q.left - 0.5 && r.right <= q.right + 0.5 && r.width > 0 }) } })
      return { secs, itens, conta: document.getElementById('conquistasConta').textContent, lado: document.documentElement.scrollWidth - innerWidth, caixa: caixa.left >= 0 && caixa.right <= innerWidth && caixa.bottom <= innerHeight, rolaLado: document.getElementById('telaCorpo').scrollWidth - document.getElementById('telaCorpo').clientWidth }
    })
    confere(t.itens.length === 30 && LISTA.length === 30 && JSON.stringify(t.itens.map((i) => i.id)) === JSON.stringify(LISTA.map((c) => c.id)) && t.itens.every((i) => i.medalha), 'R39 conquistas: 30 na tela, na ordem do módulo da regra, cada uma com medalha')
    confere(t.secs.length === 4 && JSON.stringify(t.secs.map((s) => s.grupo)) === JSON.stringify(GRUPOS) && t.secs.every((s) => JSON.stringify(s.ids) === JSON.stringify(LISTA.filter((c) => c.grupo === s.grupo).map((c) => c.id)) && s.titulo === T.grupos[s.grupo]), `R39 conquistas: 4 grupos — ${t.secs.map((s) => `${s.titulo} ${s.conta}`).join(' · ')}`)
    confere(t.itens.every((i) => { const c = CONQUISTAS_TELA.find((x) => x.id === i.id), l = LISTA.find((x) => x.id === i.id); return i.nome === l.nome && i.como === c.como && i.como.length >= 8 }), 'R39 conquistas: cada uma com o nome do desenho e a condição curta em inglês')
    { const feitas = t.itens.filter((i) => i.feita), falta = t.itens.filter((i) => !i.feita)
      confere(feitas.length === 15 && t.conta === '15 / 30' && feitas.every((i) => i.fonteNome === 'reino-ouro' && /Medal/.test(i.da) && !/Title/.test(i.da)) && falta.every((i) => i.fonteNome === 'reino' && !i.da), `R39 conquistas: feitas × por fazer bem distintas (${t.conta}: as feitas em ouro com o que dão; as outras apagadas, sem essa linha)`)
      confere(ANTIGAS.every((id) => { const i = t.itens.find((x) => x.id === id); return i.em === DATA && i.da.includes(T.menu.data(DATA)) }) && ligados.every((id) => { const i = t.itens.find((x) => x.id === id); return i.feita && i.em === '' && !/Earned/.test(i.da) }), 'R39 conquistas: data quando houver (as antigas com a data; os degraus ligados pelo aparelho sem data)') }
    { const b = Object.fromEntries(t.itens.filter((i) => i.barra).map((i) => [i.id, i.barra])), m200 = CFG.CONQUISTAS.rodadasSomadas.tally200
      confere(!!b.tally200 && b.tally200.texto === `123 / ${m200}` && b.tally200.valor === '123' && b.tally200.meta === String(m200) && b.tally200.agora === '123' && b.tally200.max === String(m200) && b.tally200.pct === Math.floor(12300 / m200) + '%', `R39 conquistas: a barra do degrau diz "${b.tally200?.texto}" (${b.tally200?.pct})`)
      confere(!!b.tally400 && b.tally400.texto === `123 / ${CFG.CONQUISTAS.rodadasSomadas.tally400}` && !b.tally25 && !b.tally50 && !b.tally100 && Object.keys(b).every((id) => LISTA.find((c) => c.id === id).meta), `R39 conquistas: barra só nos degraus por fazer (${Object.keys(b).join(', ')}), com a meta do módulo`) }
    confere(t.itens.every((i) => i.cabe) && t.lado <= 0 && t.caixa && t.rolaLado <= 0, `R39 conquistas: nada cortado em ${fmt.w}×${fmt.h} (lista sem rolagem de lado, a caixa inteira na tela)` + (t.itens.some((i) => !i.cabe) ? ' → ' + t.itens.filter((i) => !i.cabe).map((i) => i.id).join(', ') : ''))
    await pc.evaluate(() => document.querySelector('#listaConquistas [data-id="tally200"]').scrollIntoView({ block: 'center' })); await pc.waitForTimeout(200)
    await fot(pc, 'r39-conquistas')
    await pc.keyboard.press('Escape')
    // quem já tinha as antigas não as ganha de novo
    await K(pc, (k) => k.jogarSozinho({ ateRodada: 2 })); await pc.waitForTimeout(200)
    const g2 = await K(pc, (k) => k.guarda())
    confere(g2.rodadas >= 124 && ANTIGAS.every((c) => g2.conquistasEm[c] === DATA) && g2.conquistas.filter((c) => ANTIGAS.includes(c)).length === 12, `R39 conquistas: quem já tinha as antigas não as ganha de novo (${g2.rodadas} rodadas, datas iguais)`)
    await ctxC.close() }
  // aviso da conquista nova (aparelho novo): depois da 1ª vitória e da escolha do espólio, a placa "ACHIEVEMENT" com o nome
  { const ctxN = await novoCtx({ reducedMotion: 'reduce' }), pn = await ctxN.newPage(); vigiar(pn, erros, ruins)
    await abrir(pn, `?teste=1&nova=1&semente=${SEM}`)
    await K(pn, (k) => k.roboAteLutar()); await pn.waitForTimeout(150)
    await apertarLutar(pn)
    await K(pn, (k) => k.avancarBatalha()); await pn.waitForFunction(() => window.__keepmile.fase() !== 'luta', null, { timeout: 10000 })
    if ((await K(pn, (k) => k.fase())) === 'vitoria') {
      await pn.waitForFunction(() => window.__keepmile.vitoria().pronto, null, { timeout: 6000 }); await pn.waitForTimeout(500)
      const op = await K(pn, (k) => k.opcoes()), cmd = op.comandos.find((c) => c.tipo === 'espolio' && c.terreno == null) || op.comandos.find((c) => c.tipo === 'espolio')
      await toca(pn, 'espolio' + cmd.indice)
      if (cmd.terreno != null) { await fase(pn, 'terreno'); await pn.waitForTimeout(450); await toca(pn, 'terreno' + cmd.terreno); await pn.waitForTimeout(100); if ((await modelo(pn)).trocar) { await pn.waitForTimeout(450); await toca(pn, 'terreno' + cmd.terreno) } }
      await pn.waitForFunction(() => window.__keepmile.festas().log.some((l) => l.titulo === 'ACHIEVEMENT'), null, { timeout: 8000 }).catch(() => {})
      const fe = await K(pn, (k) => k.festas()), g = await K(pn, (k) => k.guarda()), nomes = fe.log.filter((l) => l.titulo === T.conquista).map((l) => l.texto)
      confere(g.conquistas.includes('supper') && nomes.includes('First Supper') && fe.log.filter((l) => l.titulo === T.conquista).every((l) => l.fase !== 'vitoria' && LISTA.some((c) => c.nome === l.texto)), `R39 conquistas: a nova ganha no fim da luta avisa com o nome, depois do espólio (${nomes.join(', ')})`)
    } else falha('R39 conquistas: a 1ª luta da semente fixa devia ser vitória')
    await ctxN.close() }
  confere(erros.length === 0 && ruins.length === 0, `R39 ${fmt.nome}: zero erro e zero 404` + (erros.length + ruins.length ? ' → ' + [...erros, ...ruins].slice(0, 4).join(' | ') : ''))
}

const SO = process.env.REINO_SO || '' // para rodar só uma parte enquanto se trabalha nela (a bateria completa é sem isto)
try {
  if (!SO || SO === 'base' || SO === 'celular') await rodar({ nome: 'celular', w: 360, h: 740, toque: true })
  if (!SO || SO === 'base' || SO === 'pc') await rodar({ nome: 'pc', w: 1280, h: 720, toque: false })
  if (!SO || SO === 'r17' || SO === 'r17celular') await r17({ nome: 'celular', w: 360, h: 740, toque: true })
  if (!SO || SO === 'r17' || SO === 'r17pc') await r17({ nome: 'pc', w: 1280, h: 720, toque: false })
  if (!SO || SO === 'desenho') {
    await soLayout(390, 844, true)
    await soLayout(740, 360, true)
    await soLayout(320, 640, true)
    await soLayout(320, 568, true)
    await soLayout(1920, 1080, false)
  }
  if (!SO || SO === 'r30') await r30()
  if (!SO || SO === 'r31') await r31()
  if (!SO || SO === 'r39') { await r39({ nome: 'celular', w: 390, h: 844, toque: true }); await r39({ nome: 'pc', w: 1280, h: 720, toque: false }); await r39({ nome: 'pc-grande', w: 1920, h: 1080, toque: false }) }
} catch (e) { falha('exceção: ' + (e?.stack || e)) }
await browser.close()
servidor.close()
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : SO ? `\nREINO (${SO}): verde` : '\nREINO: tudo verde')
process.exit(falhas.length ? 1 : 0)
