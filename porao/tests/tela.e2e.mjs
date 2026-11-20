// Porão — teste de tela (Chrome de verdade, modo falso: as regras rodam no navegador).
// Confere: 1º tapete em menos de 60 s desde abrir a página · celular 390×844 mostra um monitor por vez · borda acesa no
// monitor fora da vista · "Menos animação" sem tremida · sem erro no console · sem rolagem lateral ·
// área de trabalho (ícone traz a janela para frente; no celular uma janela em tela cheia) · número gigante do ganho
// no tapete · barra de status com caixa e Calor iguais aos do jogo.
// Fotos (opcional): PORAO_FOTOS=/pasta  node tools/trava-robos.mjs rodar "node porao/tests/tela.e2e.mjs"
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import zlib from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RARIDADES, IDEIAS_POR_RARIDADE } from '../comum/config.js'

const require = createRequire('/opt/node-tools/node_modules/')
const { chromium } = require('playwright')
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' }
const FOTOS = process.env.PORAO_FOTOS || ''
const PAGINA = '/porao/tela/index.html?falso=1&pular=abertura'

const falhas = []
const falha = (m) => { falhas.push(m); console.log('FALHA: ' + m) }
const confere = (ok, m) => { if (!ok) falha(m); else console.log('  ok: ' + m) }

let arteTemp = null
const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local')
  let p
  try { p = decodeURIComponent(url.pathname) } catch { res.writeHead(400); return res.end() }
  // arte.local: só existe quando o teste cria a pasta temporária (nunca a do dono)
  let arq = path.join(RAIZ, p)
  if (p.startsWith('/porao/arte.local/')) arq = arteTemp ? path.join(arteTemp, p.slice('/porao/arte.local/'.length)) : '/inexistente/x'
  if (arq !== '/inexistente/x' && !arq.startsWith(RAIZ + path.sep) && !(arteTemp && arq.startsWith(arteTemp + path.sep))) { res.writeHead(403); return res.end() }
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
let ultimaAnim = null // animação do número gigante no último tapete

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
// abre o aplicativo pelo ícone da barra de baixo do monitor (a janela vem para a frente)
const aba = async (page, m, a) => {
  await q(page, `${tela(m)} .pm-icone[data-app="${a}"]`).click()
  await q(page, `${tela(m)} .pm-jan--frente[data-app="${a}"]`).waitFor({ timeout: 3000 })
}
/** A barra de status mostra o caixa e o Calor que o jogo tem agora (mesmo número). */
async function conferirStatus(page, onde) {
  const ok = await page.waitForFunction(() => {
    const e = window.poraoApp.api.depurar(() => {}).estado // sem avançar o relógio: o mesmo estado que a tela recebeu
    const caixa = document.querySelector('[data-pm="status-caixa"] .pagina-chip__valor')?.textContent
    const calor = document.querySelector('[data-pm="status-calor"] .pagina-chip__valor')?.textContent
    const nivel = document.querySelector('[data-pm="status-calor"]')?.dataset.nivel
    return caixa === `$ ${Number(e.caixa).toLocaleString('pt-BR')}` && calor === Number(e.calor).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) && !!nivel
  }, null, { timeout: 5000 }).then(() => true).catch(() => false)
  confere(ok, `${onde}: barra de status mostra o caixa e o Calor (com cor) do jogo`)
  const vis = await page.evaluate(() => ['caixa', 'calor', 'hora'].every((k) => { const r = document.querySelector(`[data-pm="status-${k}"]`).getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth }))
  confere(vis, `${onde}: caixa, Calor e hora à vista na barra de status`)
}
// arte nova: toda <img> da página carregou (sem 404 e sem imagem quebrada)
const imagensOk = (page) => page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src))
/** Fonte do border-image de um elemento (vazio se não houver). */
const bordaImg = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).borderImageSource : '' }, sel)
/** Retrato visível e carregado (data-quem começa com o prefixo). */
const retratoVisivel = (page, prefixo) => page.evaluate((p) => [...document.querySelectorAll('[data-pm="retrato"]')].some((i) => i.dataset.quem.startsWith(p) && i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().width >= 40), prefixo)
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
    await q(page, '[data-pm="ganho-gigante"]').waitFor({ timeout: 8000 })
    await page.waitForTimeout(700)
    await foto(page, fotosNome + '-gigante')
  }
  await q(page, '[data-pm="tapete-resumo"]').waitFor({ timeout: 15000 })
  const max = await page.evaluate(() => { clearInterval(window.__tim); return Math.max(0, ...window.__tr) })
  // número gigante do ganho: aparece por cima de tudo, com o mesmo valor do resumo (o que o servidor pagou)
  const g = await page.evaluate(() => {
    const el = document.querySelector('[data-pm="ganho-gigante"]'), res = document.querySelector('[data-pm="tapete-resumo"] .pm-grande')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { texto: el.textContent, resumo: res?.textContent, alto: r.height, dentro: r.left >= 0 && r.right <= innerWidth, anim: getComputedStyle(el.firstChild).animationName }
  })
  confere(!!g && /^\+\$ [\d.]+$/.test(g.texto) && g.texto === g.resumo, `número gigante do ganho aparece no tapete (${g?.texto} = resumo ${g?.resumo})`)
  confere(!!g && g.alto >= 50 && g.dentro, `número gigante é grande e cabe na tela (altura ${g?.alto?.toFixed?.(0)} px)`)
  ultimaAnim = g?.anim
  confere(await retratoVisivel(page, 'rugrigo.rindo'), 'resumo do tapete mostra o retrato do Rugrigo rindo')
  if (fotosNome) await foto(page, fotosNome + '-resumo')
  return max
}

/** PNG pequeno 16x8 (mais largo que alto, para provar o recorte), gerado aqui mesmo. */
function pngPequeno(r, g, b) {
  const W = 16, H = 8, crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const bloco = (tipo, dados) => { const t = Buffer.concat([Buffer.from(tipo), dados]), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(dados.length); c.writeUInt32BE(crc(t)); return Buffer.concat([l, t, c]) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2
  const linhas = Buffer.alloc((W * 3 + 1) * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * (W * 3 + 1) + 1 + x * 3; linhas[i] = r; linhas[i + 1] = g; linhas[i + 2] = x < W / 2 ? b : 255 }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(linhas)), bloco('IEND', Buffer.alloc(0))])
}

try {
  // ===================== PC 1280×800: o 1º minuto e as fotos de cada monitor =====================
  console.log('PC 1280x800')
  {
    const { ctx, page } = await nova({ largura: 1280, altura: 800 })
    const t0 = Date.now()
    const salaResp = page.waitForResponse((r) => /\/arte\/sala\.png$/.test(r.url()), { timeout: 8000 }).catch(() => null)
    await page.goto(BASE + PAGINA)
    await foto(page, 'pc-00-porao')
    const rs = await salaResp
    confere(!!rs && rs.status() === 200 && await page.evaluate(() => window.poraoApp.cena.temSala), 'cena desenha a sala-âncora (arte/sala.png carregou)')
    const salaNoCanvas = await page.evaluate(() => {
      // o canto de cima da sala pintada (pedra) aparece no canvas: pixel opaco onde o chão de reserva seria vazio
      const cv = document.querySelector('.cena__canvas'), d = cv.getContext('2d').getImageData(116, 6, 1, 1).data
      return d[3] === 255
    })
    confere(salaNoCanvas, 'canvas mostra a sala pintada (pixel da parede de pedra)')
    confere(/ui_btn_destaque\.png/.test(await bordaImg(page, '.cena__btn--primario')) && /ui_btn_normal\.png/.test(await bordaImg(page, '#menos')), 'botões do porão usam border-image do kit (destaque e normal)')
    confere(/ui_status\.png/.test(await bordaImg(page, '[data-pm="status-caixa"]')), 'barra de status usa a placa ui_status')
    await q(page, '.cena__btn--primario').click()
    await q(page, '.cena__zoom--aberto').waitFor({ timeout: 5000 })
    await foto(page, 'pc-01-monitores-vazios')
    confere(/ui_btn_destaque\.png/.test(await bordaImg(page, '.pm-btn--acao')), 'botão de ação dos monitores usa border-image do kit')
    confere(/ui_janela\.png/.test(await bordaImg(page, '.pm-jan')) && /ui_dock\.png/.test(await bordaImg(page, '.pm-dock')), 'janelas e barra de ícones usam o kit (ui_janela, ui_dock)')
    confere(await page.evaluate(() => [...document.querySelectorAll('.pm-dock .pm-icone img')].length === 8), 'barra de ícones mostra os ícones de arte (8 aplicativos)')
    confere(await page.evaluate(() => ['grafico', 'comunidade', 'projeto'].every((m) => /papel_.*_claro\.png/.test(getComputedStyle(document.querySelector(`[data-pm-monitor="${m}"]`)).backgroundImage))), 'os 3 monitores usam o papel de parede clareado')
    await aba(page, 'projeto', 'impressora')
    await q(page, '[data-pm="imprimir"]').click()
    await q(page, '[data-pm="folha"][data-etapa="1"]').waitFor({ timeout: 5000 })
    await page.waitForTimeout(500)
    await foto(page, 'pc-02-revelacao-folha-saindo')
    await q(page, '[data-pm="folha"][data-etapa="2"]').waitFor({ timeout: 5000 })
    await foto(page, 'pc-03-revelacao-raridade')
    await q(page, '[data-pm="folha"][data-etapa="3"]').waitFor({ timeout: 5000 })
    await foto(page, 'pc-04-revelacao-nome')
    confere(/moldura_carta_[a-z]+\.png/.test(await bordaImg(page, '[data-pm="folha"]')), 'revelação: a folha ganha a moldura da raridade')
    confere(await page.locator('[data-pm="arte-carta"]').count() === 0, 'sem arte.local: a carta continua desenhada por código (nenhuma imagem)')
    await q(page, '[data-pm="lancar-agora"]').click()
    await q(page, '[data-pm="projeto"]').waitFor({ timeout: 8000 })
    await esperarPuxar(page)
    await foto(page, 'pc-05-grafico-previa')
    const max = await puxarEMedir(page, 'pc-06-tapete')
    confere(await page.evaluate(() => window.poraoApp.cena.obterEstado().pose) === 'rindo', 'depois do tapete o Rugrigo ri na cena')
    const gasto = Date.now() - t0
    confere(gasto < 60000, `1º tapete em ${(gasto / 1000).toFixed(1)} s desde abrir a página (limite 60 s)`)
    confere(max > 0 && max <= 8, `tremida leve na cena do tapete (maior deslocamento ${max.toFixed(1)} px, limite 8)`)
    confere(await semRolagemLateral(page), 'PC: sem rolagem lateral')
    confere(ultimaAnim === 'pm-pulo', `número gigante entra pulando (animação: ${ultimaAnim})`)
    await conferirStatus(page, 'PC')
    await q(page, '[data-pm="tapete-fechar"]').click()
    // área de trabalho: o ícone traz a janela para a frente; as janelas ficam paradas no lugar
    const antes = await q(page, `${tela('projeto')} [data-app="ideias"].pm-jan`).boundingBox()
    await aba(page, 'projeto', 'ideias')
    const depois = await q(page, `${tela('projeto')} [data-app="ideias"].pm-jan`).boundingBox()
    confere(antes.x === depois.x && antes.y === depois.y, 'PC: janela vem para a frente sem sair do lugar')
    confere(await page.locator(`${tela('projeto')} .pm-jan--frente`).count() === 1, 'PC: uma janela na frente por monitor')
    await aba(page, 'projeto', 'projetos')

    // 2ª rodada: parceria, celular, batida (o modo falso deixa mexer no estado só para a conferência)
    await page.evaluate(() => window.poraoApp.api.depurar((e) => { e.caixa = 5000; e.calor = 95; e.contagem.tapetes = 5 }))
    await page.waitForTimeout(3300)
    await imprimirELancar(page); await page.waitForTimeout(3300); await imprimirELancar(page)
    await foto(page, 'pc-07-projeto-no-ar')
    await foto(page, 'pc-07b-monitor3-projetos')
    confere(/Confiança dos trouxas/.test(await q(page, '[data-pm="confianca"]').textContent()), 'projeto no ar mostra o medidor "Confiança dos trouxas"')
    await esperarPuxar(page)
    await q(page, '[data-pm="celular-btn"]').click()
    await q(page, '[data-aba="cel-contratar"]').click()
    await foto(page, 'pc-08-celular-contratar')
    await q(page, '[data-pm="contratar"]:not([disabled])').click()
    await page.evaluate(() => window.poraoApp.api.depurar((e) => { const c = e.projetos.find((p) => p.contrato)?.contrato; if (c) { c.trazidasV1 = 999; c.esperaRestante = 0.2 } }))
    await q(page, '[data-pm="proposta"]').waitFor({ timeout: 8000 })
    await foto(page, 'pc-09-celular-pede-mais')
    confere(await retratoVisivel(page, 'influ.'), 'celular: mensagem mostra o retrato do influenciador')
    confere(await retratoVisivel(page, 'rugrigo.malandro'), 'celular: topo mostra o Rugrigo malandro')
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
    // luxos novos: comprar entra no estado da cena e o sprite aparece (o desenho muda sem ele)
    const antesLuxo = await page.evaluate(() => { const e = window.poraoApp.api.depurar(() => {}).estado; return { caixa: e.caixa, luxos: [...e.luxos] } })
    await page.evaluate(() => window.poraoApp.api.depurar((e) => { e.caixa = 999999 }))
    for (const id of ['cadeira_gamer', 'ar_condicionado', 'letreiro_neon', 'maquina_bebida', 'tela_curva', 'garagem']) {
      await page.evaluate(() => window.poraoApp.api.depurar((e) => { e.caixa = 999999 }))
      const btn = q(page, `[data-k="luxo-${id}"]`)
      if (await btn.count()) await btn.click()
      const ok = await page.waitForFunction((i) => window.poraoApp.cena.obterEstado().luxos.includes(i), id, { timeout: 5000 }).then(() => true).catch(() => false)
      confere(ok, `comprar ${id}: entra no porão`)
    }
    await page.evaluate(() => window.poraoApp.cena.voltar())
    await page.waitForTimeout(300)
    const cenaMuda = await page.evaluate(async () => {
      const quadro = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)))
      const cv = document.querySelector('.cena__canvas'), c = window.poraoApp.cena
      const todos = c.obterEstado().luxos, cheio = cv.toDataURL(), r = {}
      for (const id of ['ar_condicionado', 'letreiro_neon', 'tela_curva']) {
        c.definirEstado({ luxos: todos.filter((x) => x !== id) }); await quadro(); r[id] = cv.toDataURL() !== cheio
      }
      c.definirEstado({ luxos: todos })
      return r
    })
    for (const [id, ok] of Object.entries(cenaMuda)) confere(ok, `luxo ${id}: o sprite aparece na cena`)
    await foto(page, 'pc-14b-porao-todos-luxos')
    // volta ao que era (Calor menor dos luxos novos tiraria a batida dos passos seguintes)
    await page.evaluate((v) => window.poraoApp.api.depurar((e) => { e.caixa = v.caixa; e.luxos = v.luxos }), antesLuxo)
    await page.evaluate(() => window.poraoApp.cena.abrirMonitores(2))
    await page.waitForTimeout(300)
    await aba(page, 'projeto', 'projetos')
    await aba(page, 'grafico', 'grafico')
    await foto(page, 'pc-14-todos-monitores')
    await page.evaluate(() => window.poraoApp.api.depurar((e) => { e.calor = 99 })) // o Calor cai com o tempo: reforça logo antes de puxar
    await puxarEMedir(page, null)
    await q(page, '[data-pm="tapete-fechar"]').click()
    await q(page, '[data-pm="janela-batida"]').waitFor({ timeout: 5000 })
    await foto(page, 'pc-15-batida')
    confere(await retratoVisivel(page, 'rugrigo.assustado'), 'batida mostra o retrato do Rugrigo assustado')
    confere(await page.evaluate(() => window.poraoApp.cena.obterEstado().pose) === 'batida', 'na batida o Rugrigo olha para trás na cena')
    confere(await q(page, '[data-pm="rebrand"]').isEnabled(), 'batida mostra a escolha de rebrand com o custo')
    confere((await q(page, '[data-pm="batida-frase"]').textContent()).length > 3 && /^vira: ./.test(await q(page, '[data-pm="rebrand-nome"]').textContent()), 'batida mostra a frase e o nome novo depois do rebrand')
    await q(page, '[data-pm="rebrand"]').click()
    await q(page, '[data-pm="janela-batida"]').waitFor({ state: 'detached', timeout: 5000 })
    await foto(page, 'pc-16-depois-da-batida')
    const quebradasPc = await imagensOk(page)
    confere(quebradasPc.length === 0, `PC: todas as imagens novas carregam${quebradasPc.length ? ': ' + quebradasPc.slice(0, 3).join(' ') : ''}`)
    await ctx.close()
  }

  // ===================== CELULAR 390×844: um monitor por vez, borda acesa =====================
  console.log('Celular 390x844')
  {
    const { ctx, page } = await nova({ largura: 390, altura: 844, movel: true })
    await page.goto(BASE + PAGINA)
    await foto(page, 'cel-00-porao')
    const cab = await page.evaluate(() => { const r = document.querySelector('.cena__canvas').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && window.poraoApp.cena.temSala })
    confere(cab, 'celular: a sala inteira cabe na tela')
    await page.evaluate(() => window.poraoApp.cena.definirEstado({ luxos: ['cadeira_gamer', 'aquario', 'ar_condicionado', 'letreiro_neon', 'maquina_bebida', 'tela_curva', 'garagem'], trouxas: 400, hype: 60 }))
    await page.waitForTimeout(300)
    await foto(page, 'cel-00b-porao-luxos')
    await page.evaluate(() => window.poraoApp.cena.definirEstado({ luxos: [], trouxas: 0, hype: 0 }))
    await q(page, '.cena__btn--primario').click()
    await q(page, '.cena__zoom--aberto').waitFor({ timeout: 5000 })
    const visiveis = () => page.evaluate(() => [...document.querySelectorAll('.cena__monitor')].filter((m) => { const r = m.getBoundingClientRect(); return r.left >= -2 && r.right <= window.innerWidth + 2 }).length)
    confere(await visiveis() === 1, 'celular: um monitor inteiro por vez na tela')
    await foto(page, 'cel-01-monitor1-vazio')
    await page.locator('.cena__ponto').nth(2).click()
    await page.waitForFunction(() => { const r = document.querySelector('[data-monitor="projeto"]').getBoundingClientRect(); return r.left >= -2 && r.right <= innerWidth + 2 }, null, { timeout: 5000 })
    confere(await visiveis() === 1, 'celular: ainda um monitor por vez depois de trocar')
    await aba(page, 'projeto', 'ideias')
    const cheia = await page.evaluate(() => {
      const m = document.querySelector('[data-pm-monitor="projeto"]')
      const jan = [...m.querySelectorAll('.pm-jan')].filter((j) => getComputedStyle(j).visibility !== 'hidden')
      const a = m.querySelector('.pm-mesa__area').getBoundingClientRect(), r = jan[0]?.getBoundingClientRect(), d = m.querySelector('.pm-dock').getBoundingClientRect()
      return { n: jan.length, cheia: !!r && Math.abs(r.width - a.width) < 2 && Math.abs(r.height - a.height) < 2, dockEmbaixo: !!r && d.top >= r.bottom - 1 && d.bottom <= innerHeight }
    })
    confere(cheia.n === 1 && cheia.cheia, 'celular: uma janela por vez, em tela cheia')
    confere(cheia.dockEmbaixo, 'celular: barra de ícones embaixo da janela, à vista')
    await foto(page, 'cel-01b-monitor3-ideias')
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
    await conferirStatus(page, 'celular')
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
    await page.evaluate(() => window.poraoApp.api.depurar((e) => { e.calor = 99 })) // o Calor cai com o tempo: reforça logo antes de puxar
    await puxarEMedir(page, null)
    await q(page, '[data-pm="tapete-fechar"]').click()
    await q(page, '[data-pm="janela-batida"]').waitFor({ timeout: 5000 })
    await foto(page, 'cel-14-batida')
    confere(await retratoVisivel(page, 'rugrigo.assustado'), 'celular: batida mostra o retrato do Rugrigo assustado')
    const dentro = await page.evaluate(() => { const r = document.querySelector('.pm-janela__caixa').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight })
    confere(dentro, 'celular: a janela da batida cabe na tela')
    confere(await semRolagemLateral(page), 'celular: sem rolagem lateral (batida)')
    await q(page, '[data-pm="perder"]').click()
    await q(page, '[data-pm="janela-batida"]').waitFor({ state: 'detached', timeout: 5000 })
    await page.locator('.cena__ponto').nth(1).click()
    await foto(page, 'cel-15-depois-da-batida')
    await q(page, '[data-pm="celular-btn"]').click()
    await foto(page, 'cel-16-celular')
    confere(await retratoVisivel(page, 'rugrigo.malandro'), 'celular 390: topo do celular da mesa mostra o retrato do Rugrigo')
    confere(/ui_aba_(ligada|desligada)\.png/.test(await bordaImg(page, '.pm-aba')), 'abas do celular usam o kit')
    const quebradasCel = await imagensOk(page)
    confere(quebradasCel.length === 0, `celular: todas as imagens novas carregam${quebradasCel.length ? ': ' + quebradasCel.slice(0, 3).join(' ') : ''}`)
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
    confere(ultimaAnim === 'none', `Menos animação: número gigante parado (animação: ${ultimaAnim})`)
    await foto(page, 'menos-02-tapete')
    const trans = await page.evaluate(() => [...document.querySelectorAll('.pm-folha')].map((e) => getComputedStyle(e).transitionDuration))
    confere(trans.every((d) => /^0s(, 0s)*$/.test(d)), 'Menos animação: folha sem transição')
    await ctx.close()
  }

  // ===================== arte própria das cartas (arte.local de teste, criada aqui) =====================
  console.log('Arte própria das cartas')
  arteTemp = await mkdtemp(path.join(tmpdir(), 'porao-arte-'))
  {
    const nomes = []
    for (const r of RARIDADES) for (let n = 1; n <= IDEIAS_POR_RARIDADE[r]; n++) {
      const nome = `carta_${r}_${n}`; nomes.push(nome)
      await writeFile(path.join(arteTemp, nome + '.png'), pngPequeno(40 + n * 20, 160, 90))
    }
    await writeFile(path.join(arteTemp, 'indice.json'), JSON.stringify(nomes))
    for (const [rotulo, vp, movel] of [['pc', [1280, 800], false], ['cel', [390, 844], true]]) {
      const { ctx, page } = await nova({ largura: vp[0], altura: vp[1], movel })
      await page.goto(BASE + PAGINA)
      await q(page, '.cena__btn--primario').click()
      await q(page, '.cena__zoom--aberto').waitFor({ timeout: 5000 })
      await aba(page, 'projeto', 'impressora')
      await q(page, '[data-pm="imprimir"]').click()
      await q(page, '[data-pm="folha"][data-etapa="2"]').waitFor({ timeout: 5000 })
      const op2 = await page.evaluate(() => { const a = document.querySelector('[data-pm="folha"] [data-pm="arte-carta"]'); return a ? getComputedStyle(a).opacity : null })
      const chip2 = await q(page, '[data-pm="folha"] .pm-folha__rar .pm-chip').isVisible()
      confere(chip2 && (op2 === null || Number(op2) < 0.5 || !!(await q(page, '[data-pm="folha"][data-etapa="3"]').count())), `${rotulo}: com arte, a raridade aparece antes da imagem e do nome`)
      await q(page, '[data-pm="folha"][data-etapa="3"]').waitFor({ timeout: 5000 })
      await page.waitForTimeout(600)
      await foto(page, `arte-${rotulo}-01-revelacao`)
      const info = await page.evaluate(() => {
        const a = document.querySelector('[data-pm="folha"] [data-pm="arte-carta"]')
        if (!a) return null
        const f = document.querySelector('[data-pm="folha"]').getBoundingClientRect(), r = a.getBoundingClientRect()
        return { ok: a.naturalWidth > 0, fit: getComputedStyle(a).objectFit, op: getComputedStyle(a).opacity, cabe: r.width <= f.width + 1 && r.height <= f.height + 1, nome: document.querySelector('.pm-folha__nome').textContent.length > 0 }
      })
      confere(!!info && info.ok && info.fit === 'cover' && Number(info.op) === 1 && info.cabe && info.nome, `${rotulo}: revelação mostra a imagem recortada (cover) com o nome por cima`)
      await q(page, '[data-pm="lancar-agora"]').click()
      await q(page, '[data-pm="projeto"]').waitFor({ timeout: 8000 })
      confere(await page.locator('[data-pm="projeto"] [data-pm="arte-carta"]').count() > 0, `${rotulo}: projeto no ar mostra a arte`)
      await page.evaluate(() => window.poraoApp.api.depurar((e) => { e.caixa = 5000 }))
      await page.waitForTimeout(3300)
      await aba(page, 'projeto', 'impressora')
      await q(page, '[data-pm="imprimir"]:not([disabled])').click({ timeout: 8000 })
      await q(page, '[data-pm="folha"][data-etapa="3"]').waitFor({ timeout: 8000 })
      await aba(page, 'projeto', 'ideias')
      await page.waitForTimeout(300)
      await foto(page, `arte-${rotulo}-02-ideias-album`)
      confere(await page.locator('[data-pm="carta"] [data-pm="arte-carta"]').count() > 0, `${rotulo}: gaveta mostra a arte`)
      confere(await page.locator('[data-pm="album-visto"] [data-pm="arte-carta"]').count() > 0, `${rotulo}: álbum mostra a arte`)
      const nomeAlbum = await page.evaluate(() => [...document.querySelectorAll('[data-pm="album-visto"]')].every((e) => { const n = e.querySelector('.pm-arte-nome'); return n && n.textContent.trim().length > 0 && n.getBoundingClientRect().right <= e.getBoundingClientRect().right + 1 }))
      confere(nomeAlbum, `${rotulo}: nome legível sobre a arte no álbum`)
      confere(await semRolagemLateral(page), `${rotulo}: com arte, sem rolagem lateral`)
      await ctx.close()
    }
    // Menos animação: a imagem aparece sem transição
    const { ctx, page } = await nova({ largura: 1280, altura: 800, menos: true })
    await page.goto(BASE + PAGINA)
    await q(page, '.cena__btn--primario').click()
    await q(page, '.cena__zoom--aberto').waitFor({ timeout: 5000 })
    await aba(page, 'projeto', 'impressora')
    await q(page, '[data-pm="imprimir"]').click()
    await q(page, '[data-pm="folha"][data-etapa="3"]').waitFor({ timeout: 5000 })
    const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.pm-folha__arte')).transitionDuration)
    confere(/^0s(, 0s)*$/.test(tr), 'Menos animação: imagem da carta sem transição')
    await ctx.close()
  }
  await rm(arteTemp, { recursive: true, force: true }); arteTemp = null

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
