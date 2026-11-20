// Keepmile R21 — MOVIMENTO E DIREÇÃO DE ARTE DA BATALHA (teste de tela de public/reino/, celular 360×740 e PC 1280×720).
// Confere: o golpe acontece em etapas na ordem (antecipação → bote → volta); cada queda vira fumaça (soldado tomba, invasor estoura,
// chefe cai em etapas); marcha com passo e poeira; flecha em arco que finca; estouro com anel; números somados e no máximo 8;
// teto de partículas; tremida ≤ 6 px; clarões (e quadros brancos) ≤ 3 por segundo; empurrão de câmera ≤ 3 px; zoom macio; pixel inteiro;
// quadros por segundo com 150+ bonecos desenhados; o cenário muda de trecho com a rodada (campos → vila → portões → noite) e os 4
// são diferentes; com Reduced motion: sem tremida, sem clarão, sem zoom, sem câmera — e o movimento essencial continua.
// Grava as TIRAS de movimento (8 quadros seguidos, lado a lado) em tests/tela/fotos/reino/movimento/.
// Só uma parte: MOV_SO=celular|pc (a bateria completa é sem a variável).
// Rode pela trava:  node tools/trava-robos.mjs rodar "timeout 900 node tests/tela/reino-movimento.e2e.mjs"
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const TIRAS = path.join(RAIZ, 'tests', 'tela', 'fotos', 'reino', 'movimento')
const SUB = '/algum-nome/'
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' }
const SEM = 'e2e-keepmile-1'
const TETO_DO_GUIA = 90 // docs/guia-de-estilo.md: partículas, no máximo 90 ao mesmo tempo

const falhas = []
let feitas = 0
const falha = (m) => { falhas.push(m); console.log('FALHA: ' + m) }
const confere = (ok, m) => { feitas++; if (!ok) falha(m); else console.log('  ok: ' + m) }

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
await mkdir(TIRAS, { recursive: true })
const browser = await chromium.launch()

const K = (page, fn, arg) => page.evaluate(`(${fn})(window.__keepmile, window.__kmCena, ${JSON.stringify(arg ?? null)})`)
const med = (page) => K(page, (k, C) => ({ ...C.med, brancos: C.med.brancosLog.slice(), flashes: C.flashes.slice(), tremidaMax: C.tremidaMax, pico: C.picoParticulas, limite: C.limite, zoom: C.cam.zoom, camX: C.cam.x, menos: C.menos, e: C.e, liso: C.g.imageSmoothingEnabled, numeros8: C.num.length, n: C.n, cen: { ...C.cenario.n }, trecho: C.nomeDoTrecho() }))
const porSegundo = (ts) => { let m = 0; for (const t of ts) m = Math.max(m, ts.filter((x) => x >= t && x < t + 1000).length); return m }
const espera = (page, fn, prazo = 30000) => page.waitForFunction(fn, null, { timeout: prazo, polling: 50 }).then(() => true, () => false)

/** Luta de vitrine montada pelo MOTOR (shared/reino/batalha.js), tocada pela mesma batalha da tela. Não mexe na partida. */
const lutaDoMotor = (page, cartas, ordem, chefe = null, rodada = 9) => K(page, async (k, C, a) => {
  const { simularBatalha, montarExercito } = await import(new URL('../../shared/reino/batalha.js', location.href))
  const terrenos = a.cartas.map((carta) => (carta ? { carta, nivel: 5 } : null)), horda = { rodada: a.rodada, ordem: a.ordem, chefe: a.chefe }
  k.batalhaCheia(); C.batalha.parar()
  const b = simularBatalha({ terrenos, reliquias: [], horda, eventos: true })
  C.terrenos = terrenos; C.zerarMedidas()
  C.batalha.iniciar({ eventos: b.eventos, horda, terrenos, exercito: montarExercito(terrenos, []) }, () => {})
  return { vitoria: b.vitoria, segundos: b.segundos, eventos: b.eventos.length, estouros: b.eventos.filter((e) => e[1] === 'x').length }
}, { cartas, ordem, chefe, rodada })

/** Grava uma tira (8 quadros seguidos do mundo, lado a lado) quando o gatilho acontecer. */
async function tira(page, nome, opc, prazo = 40000) {
  await K(page, (k, C, o) => C.gravar(o), opc)
  const ok = await espera(page, () => !!window.__kmCena.tira(), prazo)
  if (!ok) { falha(`tira ${nome}: o gatilho "${opc.gatilho || 'já'}" não aconteceu em ${prazo / 1000} s`); return }
  const dados = await page.evaluate(() => window.__kmCena.tira())
  const arq = path.join(TIRAS, nome + '.png')
  await writeFile(arq, Buffer.from(dados.split(',')[1], 'base64'))
  const kb = (await stat(arq)).size / 1024
  confere(kb < 400, `tira movimento/${nome}.png: 8 quadros seguidos, ${kb.toFixed(0)} KB (< 400)`)
}

async function rodar(fmt) {
  console.log(`\n=== ${fmt.nome} ${fmt.w}×${fmt.h} ===`)
  const erros = []
  const novoCtx = (extra = {}) => browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...extra })
  const abrir = async (ctx) => {
    const page = await ctx.newPage()
    page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /willReadFrequently/.test(m.text()))) erros.push('console: ' + m.text().slice(0, 160)) })
    page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
    await page.goto(base + `?teste=1&nova=1&semente=${SEM}`)
    await page.waitForFunction(() => window.__keepmile?.pronto && window.__kmCena, null, { timeout: 20000 })
    return page
  }
  const pc = fmt.nome === 'pc', T = (s) => `${s}-${fmt.nome}`
  const ctx = await novoCtx(), page = await abrir(ctx)

  // ---------------------------------------------------------------- 1. o golpe em etapas, a queda em fumaça, a marcha com poeira
  await K(page, (k, C) => { k.batalhaCheia(); C.zerarMedidas() })
  let m = await med(page)
  confere(m.e === Math.round(m.e) && m.liso === false, `pixel inteiro: escala ×${m.e} e desenho sem suavizar`)
  if (pc) await tira(page, 'entrada-das-tropas', { gatilho: '', cada: 8, w: 250, h: 100, x: 125, atraso: 14, y: (await K(page, (k, C) => C.oy + C.tiers[C.tiers.length - 1] - 10)) })
  confere(await espera(page, () => { const d = window.__kmCena.med; return d.volta >= 6 && d.fumacas >= 3 && d.tombos >= 1 && d.estouros >= 1 && d.fincadas >= 1 }, 45000), 'a luta cheia chega ao choque: golpes, quedas e flechas acontecem')
  m = await med(page)
  confere(m.antecipa > 0 && m.bote > 0 && m.volta > 0 && m.seq[0] === 1 && m.seq[1] === 2 && m.seq[2] === 3, `golpe em etapas, nesta ordem: antecipação → bote → volta (o 1º a bater: ${m.seq.join(' ')}; ${m.antecipa} antecipações, ${m.bote} botes, ${m.volta} voltas)`)
  confere(m.fumacas >= 3 && m.tombos >= 1 && m.estouros >= 1, `toda queda vira fumaça (${m.fumacas}); soldado TOMBA (${m.tombos}) e invasor ESTOURA (${m.estouros}): quedas diferentes`)
  confere(m.passos > 0 && m.poeiras > 0, `marcha com passo e poeira no pé (${m.passos} pisadas, ${m.poeiras} poeirinhas)`)
  confere(m.flechas > 0 && m.fincadas > 0, `tiro em arco que chega e finca (${m.flechas} projéteis, ${m.fincadas} fincadas)`)
  confere(m.somados > 0 && m.numeros > 0 && m.numeros8 === 8, `números de dano: ${m.numeros} nasceram, ${m.somados} golpes SOMADOS num número já na tela; no máximo 8 ao mesmo tempo`)
  confere(m.empurrao > 0 && m.empurrao <= 3, `empurrão de câmera na carga: ${m.empurrao} px (≤ 3)`)
  await page.waitForTimeout(2500)
  m = await med(page)
  confere(m.limite <= TETO_DO_GUIA && m.pico <= m.limite, `teto de partículas: pico ${m.pico} de ${m.limite} (guia de estilo: ≤ ${TETO_DO_GUIA})`)
  confere(m.tremidaMax <= 6, `tremida de no máximo 6 px (${m.tremidaMax})`)
  confere(porSegundo(m.flashes) <= 3 && porSegundo(m.brancos) <= 3, `clarões ≤ 3 por segundo (${porSegundo(m.flashes)}) e quadros brancos de "apanhou" ≤ 3 por segundo (${porSegundo(m.brancos)}; ${m.brancos.length} no total)`)

  // ---------------------------------------------------------------- 2. tiras do golpe, da flecha e das quedas (luta nova a cada uma)
  if (pc) {
    await lutaDoMotor(page, ['T01', 'T03', null, null, null, null], ['muncher', 'muncher', 'muncher', 'brute', 'muncher', 'muncher']); await tira(page, 'ataque-corpo-a-corpo', { gatilho: 'golpe', cada: 3, w: 104, h: 76 })
    await lutaDoMotor(page, ['T04', 'T04', 'T05', 'T04', null, null], [...Array(10).fill('muncher'), 'brute', 'brute']); await tira(page, 'flecha', { gatilho: 'flecha', cada: 2, w: 170, h: 70, dx: -62 })
    await K(page, (k) => k.batalhaCheia()); await tira(page, 'morte-do-invasor', { gatilho: 'morteInvasor', cada: 5, w: 96, h: 80 })
    await lutaDoMotor(page, ['T01', null, null, null, null, null], [...Array(26).fill('muncher'), 'brute', 'brute', 'brute']); await tira(page, 'morte-do-soldado', { gatilho: 'morteAliado', cada: 7, w: 96, h: 80, dx: 6 })
  }

  // ---------------------------------------------------------------- 3. estouro: bola de fogo + anel + brasas
  const ex = await lutaDoMotor(page, ['T10', 'T10', 'T01', 'T10', null, null], [...Array(14).fill('muncher'), 'bloater', 'bloater', 'bloater', ...Array(8).fill('muncher')])
  confere(ex.estouros > 0, `a luta de estouros tem ${ex.estouros} estouros no motor`)
  if (pc) await tira(page, 'explosao', { gatilho: 'explosao', cada: 3, w: 120, h: 96, dy: -6 })
  confere(await espera(page, () => window.__kmCena.med.explosoes >= 1 && window.__kmCena.med.aneis >= 1, 40000), 'estouro: a bola de fogo vem com o anel de choque')
  m = await med(page)
  confere(m.explosoes >= 1 && m.aneis >= 1 && m.pico <= m.limite, `estouro em quadros + anel + brasas dentro do teto (${m.explosoes} estouros, ${m.aneis} anéis, pico ${m.pico} de ${m.limite})`)

  // ---------------------------------------------------------------- 4. chefe: queda em etapas, zoom macio, tremida no limite
  await K(page, (k, C) => { k.chefeCai(); C.zerarMedidas() })
  if (pc) await tira(page, 'chefe-caindo', { gatilho: 'chefeCai', cada: 14, w: 150, h: 120, dy: -14 }, 70000)
  confere(await espera(page, () => window.__kmCena.med.chefeEtapas.includes(4), 70000), 'o chefe cai')
  m = await med(page)
  confere(m.chefeEtapas.join('') === '1234', `queda do chefe em etapas: cambaleia → ajoelha → tomba → poeira e fumaça (${m.chefeEtapas.join(' ')})`)
  confere(m.zoomMax > 1 && m.zoomMax <= (m.e + 1) / m.e + 0.001 && m.tremidaMax <= 6 && porSegundo(m.flashes) <= 3, `queda do chefe: zoom macio até ×${m.zoomMax.toFixed(2)}, tremida ${m.tremidaMax} px, ${porSegundo(m.flashes)} clarões/s`)
  confere(await espera(page, () => window.__kmCena.cam.zoom === 1, 8000), 'o zoom volta a ×1 sozinho')

  // ---------------------------------------------------------------- 5. quadros por segundo com 150+ bonecos desenhados e animando
  const cheio = await K(page, async (k, C) => {
    const CFG = await import(new URL('../../shared/reino/config.js', location.href))
    k.batalhaCheia(); C.batalha.parar(); C.emLuta = true; C.limparBonecos(); C.irParaTrecho(1, true)
    const al = ['T11', 'T01', 'T04', 'T07', 'T11', 'T02'], inv = Object.keys(CFG.INVASORES)
    for (let t = 0; t < 6; t++) for (let j = 0; j < 16; j++) { const f = C.formacao(j, 16); C.nascer(0, al[t], t * 100 + 50, 30, f.lane, f.dxe, 1, 5, j === 0) }
    for (let n = 0; n < 72; n++) { const i = C.nascer(1, inv[n % inv.length], ((n / inv.length) | 0) * 62 - 30 + (n % 5) * 3, 20, ((n * 7) % 9) / 4.5 - 1, 0); if (n & 1) C.v[i] = 0.0001 }
    let s = 7; const r = (q) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % q }
    window.__agito = setInterval(() => { for (let q = 0; q < 14; q++) { const i = r(C.n); C.atacar(i, -1, false, false); const j = r(C.n); C.apanhar(j, q & 1 ? 1 : -1, 1); if (q < 3) C.dano(C.sx[j], C.sy[j] - 30, 3 + r(20), q === 0 ? 1 : 0) } }, 110)
    k.zerarMedidas(); C.zerarMedidas()
    return { n: C.n }
  })
  await page.waitForTimeout(3200)
  { const q = await K(page, (k, C) => { let ocultos = 0, vivos = 0; for (let i = 0; i < C.n; i++) { if (C.oculto[i]) ocultos++; if (C.est[i] === 1) vivos++ } clearInterval(window.__agito); return { ...k.quadros(), vivos, desenhados: vivos - ocultos, bote: C.med.bote, pico: C.picoParticulas, limite: C.limite } })
    const qps = 1000 / q.intervalo
    console.log(`  medida: ${q.desenhados} bonecos desenhados (${cheio.n} vivos) → ${qps.toFixed(1)} q/s (mediana ${q.intervalo.toFixed(2)} ms entre quadros), desenho ${q.custo.toFixed(2)} ms por quadro (pior ${q.pior.toFixed(1)} ms)`)
    confere(q.desenhados >= 150 && q.bote > 20, `${q.desenhados} bonecos desenhados e animando ao mesmo tempo (≥ 150; ${q.bote} botes no período)`)
    confere(q.n > 120 && q.intervalo <= 17.5, `60 quadros por segundo com ${q.desenhados} bonecos: mediana ${q.intervalo.toFixed(2)} ms entre quadros (≤ 17,5) = ${qps.toFixed(1)} q/s`)
    confere(q.custo <= 10, `o desenho cabe com folga no quadro de 16,7 ms: ${q.custo.toFixed(2)} ms (≤ 10)`)
    confere(q.pico <= q.limite, `com 150+ bonecos as partículas seguem no teto (${q.pico} de ${q.limite})`) }

  // ---------------------------------------------------------------- 6. o cenário muda de trecho
  const p2 = await abrir(ctx)
  const assin = (pg) => K(pg, (k, C) => { const c = document.createElement('canvas'); c.width = 16; c.height = 16; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(document.getElementById('cena'), 0, 0, 16, 16); return Array.from(g.getImageData(0, 0, 16, 9).data) })
  const dist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4) }
  const vistos = [], sinais = []
  for (let n = 0; n < 4; n++) {
    await K(p2, (k, C, n) => C.irParaTrecho(n, true), n); await p2.waitForTimeout(400)
    vistos.push(await K(p2, (k, C) => C.nomeDoTrecho())); sinais.push(await assin(p2))
    const c = (await med(p2)).cen
    if (n === 0) confere(c.nevoa === 1 && c.raios === 1 && c.folhas > 0, `trecho 1, CAMPOS de manhã: névoa baixa, raios de sol e ${c.folhas} folhas no vento`)
    if (n === 1) confere(c.fumacas > 0 && c.raios === 1, `trecho 2, VILA à tarde: fumaça de chaminé (${c.fumacas} bolinhas) e luz dourada`)
    if (n === 2) confere(c.flamulas > 0 && c.tochas > 0 && c.fumacas > 0, `trecho 3, PORTÕES ao pôr do sol: ${c.flamulas} flâmulas do reino, ${c.tochas} tochas acesas, luz rasante`)
    if (n === 3) confere(c.tochas > 0 && c.estrelas > 0 && c.raios === 0, `trecho 4, NOITE de chefe: ${c.tochas} tochas com clarão e ${c.estrelas} estrelas`)
    if (!pc) await tira(p2, `trecho-${n + 1}-${vistos[n]}`, { gatilho: '', cada: 14, w: 180, h: 132, x: 90, y: (await K(p2, (k, C) => C.oy + 150)) })
  }
  let menor = 1e9; for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) menor = Math.min(menor, dist(sinais[a], sinais[b]))
  confere(vistos.join(' ') === 'campos vila portoes noite' && menor > 12, `4 trechos próprios e diferentes na tela (${vistos.join(', ')}; a menor diferença de cor entre dois é ${menor.toFixed(0)})`)
  // pela partida: a rodada escolhe o trecho (1–2 campos, 3 vila, 4 portões, 5 noite de chefe)
  await K(p2, (k, C) => { C.irParaTrecho(0, true); C.zerarMedidas() })
  const caminho = [await K(p2, (k, C) => C.nomeDoTrecho())]
  for (const r of [3, 4, 5]) { const j = await K(p2, (k, C, r) => { const j = k.jogarSozinho({ ateRodada: r }); return { ...j, trecho: C.nomeDoTrecho() } }, r); if (j.fim || j.rodada !== r) { falha(`o robô não chegou à rodada ${r} (parou na ${j.rodada})`); break } caminho.push(j.trecho) }
  confere(caminho.join(' → ') === 'campos → vila → portoes → noite', `o cenário MUDA com o avanço da partida: ${caminho.join(' → ')} (rodadas 1–2, 3, 4 e 5)`)
  await p2.close()

  // ---------------------------------------------------------------- 7. Reduced motion
  const ctxM = await novoCtx({ reducedMotion: 'reduce' }), pm = await abrir(ctxM)
  confere((await med(pm)).menos === true, 'Reduced motion liga sozinho pela preferência do aparelho')
  await K(pm, (k, C) => { k.batalhaCheia(); C.zerarMedidas() })
  confere(await espera(pm, () => { const d = window.__kmCena.med; return d.bote >= 6 && d.fumacas >= 3 }, 45000), 'Reduced motion: a luta acontece e dá para ver (golpes e quedas)')
  await pm.waitForTimeout(2500)
  m = await med(pm)
  confere(m.tremidaMax === 0 && m.flashes.length === 0 && m.brancos.length === 0 && m.zoomMax === 1 && m.camX === 0 && m.empurrao === 0, `Reduced motion: sem tremida (${m.tremidaMax}), sem clarão (${m.flashes.length}), sem quadro branco (${m.brancos.length}), sem zoom (×${m.zoomMax}), câmera parada, sem empurrão`)
  confere(m.bote > 0 && m.fumacas > 0 && m.numeros > 0, `Reduced motion: o movimento essencial continua (${m.bote} botes, ${m.fumacas} quedas em fumaça, ${m.numeros} números de dano)`)
  confere(m.pico <= m.limite && m.limite <= 30, `Reduced motion: partículas pela metade (pico ${m.pico} de ${m.limite})`)
  await K(pm, (k, C) => { k.chefeCai(); C.zerarMedidas() })
  confere(await espera(pm, () => window.__kmCena.med.chefeEtapas.includes(4), 70000), 'Reduced motion: o chefe cai')
  m = await med(pm)
  confere(m.zoomMax === 1 && m.tremidaMax === 0 && m.flashes.length === 0, `Reduced motion na queda do chefe: sem zoom (×${m.zoomMax}), sem tremida (${m.tremidaMax}), sem clarão (${m.flashes.length})`)
  await ctxM.close()

  confere(erros.length === 0, `${fmt.nome}: zero erro de console` + (erros.length ? ' → ' + erros.slice(0, 3).join(' | ') : ''))
  const errosDoJogo = await K(page, (k) => k.erros())
  confere(errosDoJogo.length === 0, `${fmt.nome}: zero erro dentro do laço de desenho` + (errosDoJogo.length ? ' → ' + errosDoJogo.slice(0, 2).join(' | ') : ''))
  await ctx.close()
}

const SO = process.env.MOV_SO || ''
try {
  if (!SO || SO === 'pc') await rodar({ nome: 'pc', w: 1280, h: 720, toque: false })
  if (!SO || SO === 'celular') await rodar({ nome: 'celular', w: 360, h: 740, toque: true })
} catch (e) { falha('o teste parou: ' + (e.stack || e.message)) }
await browser.close()
servidor.close()
console.log(`\n${feitas} conferências, ${falhas.length} falha(s)` + (falhas.length ? ':\n - ' + falhas.join('\n - ') : ''))
process.exit(falhas.length ? 1 : 0)
