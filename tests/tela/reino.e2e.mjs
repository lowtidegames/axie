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
// Fotos em tests/tela/fotos/reino/.
// Rode pela trava:  node tools/trava-robos.mjs rodar "timeout 800 node tests/tela/reino.e2e.mjs"
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as CFG from '../../shared/reino/config.js'
import { LIGAS, ligaDe, mediaDasMelhores } from '../../public/reino/js/ligas.js'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const FOTOS = path.join(RAIZ, 'tests', 'tela', 'fotos', 'reino')
const SUB = '/algum-nome/'
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' }
const GUARDAR = new Set(['abertura-celular', 'mao-celular', 'batalha-celular', 'batalha-pc', 'chefe-pc', 'nivel-celular', 'espolio-celular', 'derrota-celular', 'fim-celular', 'fim-pc', 'album-celular', 'share-card',
  'fila-festas-celular', 'espolio-reliquia-celular', 'derrota-quase-celular', 'chefe-cai-pc', 'resumo-celular', 'fim-festa-celular', 'fim-festa-pc', 'share-card-dia'])
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
  // R13 item 1: chances de raridade junto do botão de sortear, já no primeiro sorteio (números do config)
  confere(JSON.stringify(m.chances.map((c) => [c.id, c.chance])) === JSON.stringify(CFG.RARIDADES.map((r) => [r.id, r.chance])) && (await viuJa(page, 'chances')), `chances do sorteio à vista junto do botão de sortear (${m.chances.map((c) => c.chance + '%').join(' ')})`)
  // R13 item 3: os nomes novos (do config) na tela; nenhum nome antigo
  const rotulos = await page.evaluate(() => [...document.querySelectorAll('#toques button')].map((b) => b.getAttribute('aria-label')).join(' | '))
  const nomes = JSON.stringify([Object.values(CFG.CARTAS).map((c) => c.nome + c.texto), Object.values(CFG.INVASORES).map((c) => c.nome + c.texto), CFG.CHEFES.map((c) => c.nome + c.texto)])
  confere(/Fuse Runner/.test(rotulos) && ['Fuse Runner', 'Scoffer', 'Tick & Tock', 'Mole Digger'].every((n) => nomes.includes(n)) && !/Squib|Muncher|Nip & Tuck|Mole Raider/.test(nomes + rotulos), 'nomes novos na tela e no config (Fuse Runner, Scoffer, Tick & Tock, Mole Digger); nenhum antigo')
  await page.waitForTimeout(700)
  await foto(page, nome('abertura'))
  await conferirLayout(page, 'abertura')

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
  { const lay = await K(page, (k) => k.layout()), mr = (await modelo(page)).resumo
    confere((await viuJa(page, 'resumo')) && mr && mr.aliadosTotal > 0 && mr.inimigosTotal === m.hordaN && lay.resumo.y + lay.resumo.h >= lay.VH - 8 && lay.resumo.h >= 60 && lay.camY === 0, `resumo ao vivo ocupa a base da tela na batalha (${mr?.aliados}/${mr?.aliadosTotal} × ${mr?.inimigos}/${mr?.inimigosTotal})`) }
  if (fmt.toque) { await page.waitForTimeout(1900); await foto(page, 'resumo-celular') }
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
  // R13 itens 1, 5 e 7: antes de escolher, o texto da carta, o efeito de cada espólio e a chance da bolsa virar relíquia (config)
  mm = await modelo(page)
  { const vv = await K(page, (k) => k.visao()), ic = vv.espolios.findIndex((e) => e.tipo === 'carta'), ib = vv.espolios.findIndex((e) => e.tipo === 'bolsa')
    confere(mm.espolioDesc[ic].texto === CFG.CARTAS[vv.espolios[ic].carta].texto && mm.espolioDesc[ib].texto.includes(`${CFG.PARTIDA.bolsa.chanceReliquia}%`) && (await viuJa(page, 'espolioDesc')), `espólio: texto da carta e chance da bolsa à vista ("${mm.espolioDesc[ib].titulo}: ${mm.espolioDesc[ib].texto}")`)
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
  await page.waitForTimeout(1600)
  await foto(page, nome('fim-festa'))
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
  confere(feitas.includes('supper') && (await page.locator('#listaConquistas li').count()) === 12 && (await page.locator('#listaConquistas canvas[data-icone]').count()) === 12, `conquistas: 12 na lista, cada uma com a sua medalha; ganhas: ${feitas.join(', ')}`)
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
      if (fmt.toque) await foto(p, 'replace-celular')
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
    await p.goto(base + '?teste=1'); await pronto(p) // sem `nova=1`: recarregar retoma o que está guardado
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
  //R17-MAIS
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
  await K(page, (k) => k.jogarSozinho())
  await page.waitForFunction(() => window.__keepmile.modelo().fim?.contou, null, { timeout: 15000 })
  await conferirLayout(page, `${w}×${h} fim`)
  await foto(page, `fim-${w}x${h}`)
  confere(erros.length === 0 && ruins.length === 0, `${w}×${h}: zero erro e zero 404` + (erros.length + ruins.length ? ' → ' + [...erros, ...ruins].slice(0, 4).join(' | ') : ''))
  await ctx.close()
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
  }
} catch (e) { falha('exceção: ' + (e?.stack || e)) }
await browser.close()
servidor.close()
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : SO ? `\nREINO (${SO}): verde` : '\nREINO: tudo verde')
process.exit(falhas.length ? 1 : 0)
