// Porão — teste de tela da ABERTURA e da vó (Chrome de verdade). Complementa tela.e2e.mjs (que abre direto no porão).
// A) modo falso (?falso=1, sem pular): logo → carregando → título → Jogar sem carteira → porão com a vó → 1ª ideia em < 30 s;
//    Conectar → aviso → carteira de teste → porão; carteira que recusa volta à escolha com o motivo; Hall abre e fecha;
//    Menos animação: logo e carregando parados; celular 390×844 sem rolagem lateral; sem erro no console.
// B) servidor de verdade (porao/servidor/index.mjs, porta livre, banco temporário): título → Jogar sem carteira → porão →
//    imprimir, lançar e tapete pelo servidor → apelido aceito → recarregar mostra Continuar e cai no porão com o mesmo
//    progresso → sair volta ao título sem Continuar.
// Só espera estado com prazo (nunca tempo fixo para algo que deve acontecer).
// O bloco B exige a tela inteira com o servidor de verdade (porão desenhado e as ações PELA TELA). A variável antiga
// PORAO_E2E_EXIGIR_PORAO_REAL=1 continua aceita, mas não muda nada: não existe mais modo reduzido.
// Fotos (opcional): PORAO_FOTOS=/pasta  node tools/trava-robos.mjs rodar "node porao/tests/abertura.e2e.mjs"
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { iniciarServidor } from '../servidor/index.mjs'

const require = createRequire('/opt/node-tools/node_modules/')
const { chromium } = require('playwright')
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
const FOTOS = process.env.PORAO_FOTOS || ''
const falhas = []
const falha = (m) => { falhas.push(m); console.log('FALHA: ' + m) }
const confere = (ok, m) => { if (!ok) falha(m); else console.log('  ok: ' + m) }

// servidor de arquivos do modo falso (a raiz do repositório, como tela.e2e.mjs)
const estatico = createServer(async (req, res) => {
  let p
  try { p = decodeURIComponent(new URL(req.url, 'http://local').pathname) } catch { res.writeHead(400); return res.end() }
  const arq = path.join(RAIZ, p)
  if (!arq.startsWith(RAIZ + path.sep)) { res.writeHead(403); return res.end() }
  try {
    const d = await readFile(arq)
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'cache-control': 'no-store', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'" })
    res.end(d)
  } catch { res.writeHead(404); res.end('não achei') }
})
await new Promise((ok) => estatico.listen(0, '127.0.0.1', ok))
const FALSO = `http://127.0.0.1:${estatico.address().port}/porao/tela/index.html?falso=1`
if (FOTOS) await mkdir(FOTOS, { recursive: true })

const navegador = await chromium.launch()
const erros = []
let ultima = null
async function nova({ largura, altura, movel = false, menos = false, rotulo = '' }) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, isMobile: movel, hasTouch: movel, deviceScaleFactor: 1 })
  if (menos) await ctx.addInitScript(() => { try { localStorage.setItem('menos_animacao', '1') } catch { /* nada */ } })
  const page = await ctx.newPage(); ultima = page
  const et = `[${rotulo || largura}]`
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) erros.push(`${et} console: ${m.text()}`) })
  page.on('pageerror', (e) => erros.push(`${et} pageerror: ${e.message}`))
  page.on('requestfailed', (r) => erros.push(`${et} pedido falhou: ${r.url()}`))
  page.on('response', (r) => { if (r.status() >= 400 && !/indice\.json/.test(r.url()) && !(r.status() === 401 && /\/api\/(sessao|estado)/.test(r.url()))) erros.push(`${et} HTTP ${r.status()}: ${r.url()}`) })
  return { ctx, page }
}
const foto = async (page, nome) => { if (FOTOS) await page.screenshot({ path: path.join(FOTOS, nome + '.png') }) }
const tela = (page, nome, timeout = 15000) => page.waitForSelector(`.ab[data-tela="${nome}"]`, { timeout }).then(() => true).catch(() => false)
const semLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1)
const passoVo = (page, n, t = 20000) => page.waitForSelector(`[data-pm="vo"]:not([hidden])[data-passo="${n}"]`, { timeout: t })
const animacao = (page, sel) => page.evaluate((s) => getComputedStyle(document.querySelector(s)).animationName, sel)
const toque = (page, movel, x, y) => (movel ? page.touchscreen.tap(x, y) : page.mouse.click(x, y))
/** Muda o save da única conta direto no banco do servidor do teste (só para montar a situação: Calor alto, vídeo que flopou). */
function mexerNoSave(srv, fn) {
  const linhas = srv.db.prepare('SELECT conta_id, estado FROM saves').all()
  if (linhas.length !== 1) throw new Error(`esperava 1 save, achei ${linhas.length}`)
  const e = JSON.parse(linhas[0].estado); fn(e)
  srv.db.prepare('UPDATE saves SET estado = ? WHERE conta_id = ?').run(JSON.stringify(e), linhas[0].conta_id)
}
const poraoPronto = (page) => page.waitForFunction(() => !!window.poraoApp && !document.querySelector('[data-pm="abertura"]'), null, { timeout: 15000 })
const esperarPuxar = async (page) => {
  await page.locator('[data-pm-monitor="grafico"] .pm-icone[data-app="grafico"]').click()
  await page.waitForFunction(() => { const b = document.querySelector('[data-pm="puxar"]'); return b && !b.disabled }, null, { timeout: 30000 })
}

try {
  // ===================== A) MODO FALSO =====================
  for (const [nome, w, h, movel] of [['pc', 1280, 800, false], ['cel', 390, 844, true]]) {
    console.log(`Modo falso ${nome} ${w}x${h}`)
    const { ctx, page } = await nova({ largura: w, altura: h, movel, rotulo: nome })
    await page.goto(FALSO)
    confere(await tela(page, 'logo', 5000), `${nome}: abre no LOGO`)
    confere(await animacao(page, '.ab__logo-estudio') === 'ab-surge', `${nome}: logo surge com animação`)
    await foto(page, `ab-${nome}-1-logo`)
    await toque(page, movel, w / 2, h / 2)
    confere(await tela(page, 'carregando', 3000), `${nome}: toque pula o logo e mostra o CARREGANDO`)
    const q0 = await page.evaluate(() => document.querySelector('.ab__carregando').toDataURL())
    confere(await page.waitForFunction((a) => document.querySelector('.ab__carregando')?.toDataURL() !== a, q0, { timeout: 3000 }).then(() => true).catch(() => false), `${nome}: carregando troca de quadro`)
    confere((await page.textContent('[data-pm="carregando-frase"]')).length > 0, `${nome}: carregando mostra uma frase`)
    await foto(page, `ab-${nome}-2-carregando`)
    confere(await tela(page, 'titulo'), `${nome}: TÍTULO`)
    confere(await page.locator('[data-pm="continuar"]').count() === 0, `${nome}: sem sessão, sem Continuar`)
    confere(await semLateral(page), `${nome}: título sem rolagem lateral`)
    await foto(page, `ab-${nome}-3-titulo`)

    // Hall da Vergonha abre e fecha (botão e Esc)
    await page.click('[data-pm="hall"]')
    confere(await tela(page, 'hall', 3000) && await page.locator('.ab__silhueta').count() === 5, `${nome}: Hall da Vergonha abre`)
    confere(await semLateral(page), `${nome}: hall sem rolagem lateral`)
    await foto(page, `ab-${nome}-4-hall`)
    await page.click('[data-pm="voltar"]')
    confere(await tela(page, 'titulo', 3000), `${nome}: Hall fecha no Voltar`)
    await page.click('[data-pm="hall"]'); await tela(page, 'hall', 3000)
    await page.keyboard.press('Escape')
    confere(await tela(page, 'titulo', 3000), `${nome}: Hall fecha no Esc`)

    // Jogar sem carteira → porão com a vó → 1ª ideia na tela em < 30 s
    const t0 = Date.now()
    await page.click('[data-pm="convidado"]')
    await passoVo(page, 1)
    await foto(page, `ab-${nome}-5-vo`)
    await page.waitForSelector('[data-pm="folha"][data-etapa="3"]', { timeout: 30000 })
    const seg = (Date.now() - t0) / 1000
    confere(seg < 30, `${nome}: porão com a vó e 1ª ideia na tela em ${seg.toFixed(1)} s (limite 30 s)`)
    confere(await page.locator('[data-pm="abertura"]').count() === 0, `${nome}: a abertura saiu da tela`)
    confere(await semLateral(page), `${nome}: porão sem rolagem lateral`)
    await ctx.close()
  }

  console.log('Modo falso: Conectar com a carteira de teste')
  {
    const { ctx, page } = await nova({ largura: 390, altura: 844, movel: true, rotulo: 'cel-carteira' })
    await page.goto(FALSO)
    confere(await tela(page, 'logo', 5000), 'carteira: abre no logo')
    await toque(page, true, 195, 422)
    confere(await tela(page, 'titulo'), 'carteira: título')
    await page.click('[data-pm="conectar"]')
    confere(await tela(page, 'aviso', 3000) && await semLateral(page), 'carteira: AVISO da assinatura (sem rolagem lateral)')
    await foto(page, 'ab-cel-6-aviso')
    await page.click('[data-pm="continuar-aviso"]')
    await page.waitForSelector('[data-pm="carteira"][data-carteira="Carteira de teste"]', { timeout: 5000 })
    confere(await semLateral(page), 'carteira: lista de carteiras sem rolagem lateral')
    await foto(page, 'ab-cel-7-escolher')
    // carteira que recusa (Wallet Standard, só neste teste): volta à escolha com o motivo
    await page.evaluate(() => {
      const k = new Uint8Array(32).fill(7)
      const w = { version: '1.0.0', name: 'Recusa', icon: 'data:image/svg+xml,', chains: ['solana:devnet'], accounts: [],
        features: { 'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [{ address: '', publicKey: k, chains: ['solana:devnet'], features: [] }] }) },
          'solana:signMessage': { version: '1.0.0', signMessage: async () => { throw new Error('User rejected the request.') } } } }
      window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: (api) => api.register(w) }))
    })
    await page.waitForSelector('[data-pm="carteira"][data-carteira="Recusa"]', { timeout: 5000 })
    await page.click('[data-pm="carteira"][data-carteira="Recusa"]')
    confere(await page.waitForFunction(() => /recusou/.test(document.querySelector('[data-pm="erro-carteira"]')?.textContent || '') && document.querySelector('.ab')?.dataset.tela === 'escolher', null, { timeout: 8000 }).then(() => true).catch(() => false), 'carteira que recusa volta à escolha com o motivo')
    await foto(page, 'ab-cel-8-recusa')
    await page.click('[data-pm="carteira"][data-carteira="Carteira de teste"]')
    await poraoPronto(page)
    await passoVo(page, 1, 15000)
    confere((await page.evaluate(() => window.poraoApp.api.sessao())).conta?.tipo === 'carteira', 'carteira de teste assinou e entrou no porão com a vó')
    await foto(page, 'ab-cel-9-porao-carteira')
    await ctx.close()
  }

  console.log('Modo falso: Menos animação')
  for (const [nome, w, h, movel] of [['pc', 1280, 800, false], ['cel', 390, 844, true]]) {
    const { ctx, page } = await nova({ largura: w, altura: h, movel, menos: true, rotulo: `menos-${nome}` })
    await page.goto(FALSO)
    confere(await tela(page, 'logo', 5000), `menos ${nome}: LOGO`)
    confere(await animacao(page, '.ab__logo-estudio') === 'none', `menos ${nome}: logo parado (sem animação)`)
    await toque(page, movel, w / 2, h / 2)
    confere(await tela(page, 'carregando', 3000), `menos ${nome}: CARREGANDO`)
    await page.waitForFunction(() => document.querySelector('.ab__carregando')?.dataset.final === '1', null, { timeout: 5000 }).catch(() => {})
    // parado: o quadro não muda em nenhuma amostra enquanto a tela de carregando está lá (o normal trocaria a cada 180 ms)
    const parou = await page.evaluate(() => new Promise((ok) => {
      const cv = document.querySelector('.ab__carregando'); const ini = cv.toDataURL(); let n = 0, igual = true
      const t = setInterval(() => {
        const c = document.querySelector('.ab__carregando')
        if (!c) { clearInterval(t); ok(igual && n >= 3) ; return }
        n++; if (c.toDataURL() !== ini) igual = false
      }, 60)
    }))
    confere(parou, `menos ${nome}: carregando com quadro parado`)
    await foto(page, `ab-menos-${nome}-carregando`)
    confere(await tela(page, 'titulo'), `menos ${nome}: TÍTULO`)
    confere(await semLateral(page), `menos ${nome}: título sem rolagem lateral`)
    await ctx.close()
  }

  // ===================== B) SERVIDOR DE VERDADE =====================
  console.log('Servidor de verdade')
  const pasta = await mkdtemp(path.join(tmpdir(), 'porao-abertura-'))
  const srv = await iniciarServidor({ porta: 0, caminhoBanco: path.join(pasta, 'e2e.db') })
  const REAL = `http://127.0.0.1:${srv.porta}/`
  try {
    const { ctx, page } = await nova({ largura: 390, altura: 844, movel: true, rotulo: 'servidor' })
    await page.goto(REAL)
    confere(await tela(page, 'logo', 5000) || await tela(page, 'titulo', 5000), 'servidor: abre a abertura')
    await toque(page, true, 195, 422).catch(() => {})
    confere(await tela(page, 'titulo'), 'servidor: TÍTULO')
    confere(await page.locator('[data-pm="continuar"]').count() === 0, 'servidor: sem sessão, sem Continuar')
    confere(await page.evaluate(() => window.poraoApp === undefined), 'servidor: o porão ainda não abriu antes de entrar')
    await foto(page, 'ab-srv-1-titulo')
    await page.click('[data-pm="convidado"]')
    await poraoPronto(page)
    const conta0 = await page.evaluate(() => window.poraoApp.api.sessao())
    confere(conta0.conta?.tipo === 'convidado' && conta0.conta.pedirApelido === false, 'servidor: conta convidada criada pelo servidor, ainda sem pedir apelido')
    // A tela do porão recebe e desenha o estado do servidor (api.js visaoDoServidor)
    const portaoReal = (await page.evaluate(() => window.poraoApp.api.estado())).ok === true
    confere(portaoReal, 'servidor: a tela do porão monta a visão com o estado do servidor')
    if (!portaoReal) throw new Error('o porão não monta a tela com o estado do servidor')
    await passoVo(page, 1)
    confere(await page.locator('[data-pm-monitor="projeto"] [data-pm="imprimir"]').count() === 1 && await page.locator('[data-pm="saldo"]').count() === 1, 'servidor: porão desenhado (monitores com saldo e impressora)')
    await page.waitForSelector('[data-pm="folha"][data-etapa="3"]', { timeout: 30000 })
    await foto(page, 'ab-srv-2-impressa')
    await page.click('[data-pm="lancar-agora"]')
    await page.waitForSelector('[data-pm="projeto"]', { timeout: 8000 })
    await esperarPuxar(page)
    await page.click('[data-pm="puxar"]')
    await page.waitForSelector('[data-pm="tapete-resumo"]', { timeout: 20000 })
    await page.click('[data-pm="tapete-fechar"]')
    await page.waitForSelector('[data-pm="apelido"]', { timeout: 8000 })
    await foto(page, 'ab-srv-3-apelido')
    const apelido = 'dev_' + Math.random().toString(36).slice(2, 8)
    await page.fill('[data-pm="apelido-campo"]', apelido)
    await page.click('[data-pm="apelido-ok"]')
    await page.waitForSelector('[data-pm="apelido"]', { state: 'detached', timeout: 8000 })
    const aposApelido = await page.evaluate(() => window.poraoApp.api.sessao())
    confere(aposApelido.conta?.apelido === apelido && aposApelido.conta.pedirApelido === false, `servidor: apelido "${apelido}" aceito e gravado`)
    await page.waitForSelector('[data-pm="historia"]', { timeout: 5000 })
    await page.click('[data-pm="historia-pular"]')
    const contagem = () => page.evaluate(async () => (await (await fetch('/api/estado', { headers: { 'X-Porao': '1' } })).json()).estado.contagem)
    const antes = await contagem()
    confere(antes.impressoes >= 1 && antes.lancamentos >= 1 && antes.tapetes >= 1, `servidor: imprimir, lançar e tapete feitos pela tela no servidor (${JSON.stringify({ i: antes.impressoes, l: antes.lancamentos, t: antes.tapetes })})`)
    await foto(page, 'ab-srv-4-depois')

    // prepara a volta (QA do Porão): caixa para as ações seguintes e 1 ideia impressa que fica na gaveta (sem lançar)
    mexerNoSave(srv, (e) => { e.caixa = 5000 })
    const impressa = await page.evaluate(() => window.poraoApp.api.imprimir())
    confere(impressa.ok === true && !!impressa.resultado?.carta, 'servidor: 2ª ideia impressa e guardada na gaveta')
    const nomeImpressa = impressa.resultado?.carta?.nome || ''

    // recarregar: Continuar e o mesmo progresso
    await page.reload()
    confere(await tela(page, 'titulo', 15000), 'servidor: recarregar cai no TÍTULO')
    confere(await page.locator('[data-pm="continuar"]').count() === 1 && await page.evaluate(() => document.activeElement?.dataset.pm) === 'continuar', 'servidor: título mostra Continuar (em foco)')
    await foto(page, 'ab-srv-5-continuar')
    await page.click('[data-pm="continuar"]')
    await poraoPronto(page)
    const depois = await contagem()
    // número da tela = número do servidor (saldo desenhado depois do Continuar)
    const saldoOk = await page.waitForFunction(async () => {
      const el = document.querySelector('[data-pm="saldo"]'); if (!el) return false
      const e = (await (await fetch('/api/estado', { headers: { 'X-Porao': '1' } })).json()).estado
      return el.textContent.replace(/\s/g, ' ').includes(Number(e.caixa).toLocaleString('pt-BR'))
    }, null, { timeout: 10000 }).then(() => true).catch(() => false)
    confere(saldoOk, 'servidor: depois do Continuar o porão desenha o saldo do servidor')
    await foto(page, 'ab-srv-6-porao-continuar')
    confere(depois.lancamentos === antes.lancamentos && depois.tapetes === antes.tapetes && depois.impressoes >= antes.impressoes, 'servidor: Continuar volta ao porão com o mesmo progresso')
    confere((await page.evaluate(() => window.poraoApp.api.sessao())).conta?.apelido === apelido, 'servidor: o apelido continua o mesmo')
    confere(await semLateral(page), 'servidor: porão sem rolagem lateral')

    // ----- QA do Porão: contrato tela × servidor, pelo jogo de verdade -----
    const estadoSrv = () => page.evaluate(async () => (await (await fetch('/api/estado', { headers: { 'X-Porao': '1' } })).json()).estado)
    const irMonitor = async (i) => {
      await page.evaluate((n) => window.poraoApp.cena.abrirMonitores(n), i)
      await page.waitForFunction((n) => { const m = document.querySelectorAll('.cena__monitor')[n]; const r = m?.getBoundingClientRect(); return r && r.left >= -2 && r.right <= innerWidth + 2 }, i, { timeout: 5000 })
    }
    const app = async (m, a) => {
      await page.locator(`[data-pm-monitor="${m}"] .pm-icone[data-app="${a}"]`).click()
      await page.waitForSelector(`[data-pm-monitor="${m}"] .pm-jan--frente[data-app="${a}"]`, { timeout: 3000 })
    }
    // (4) depois de recarregar com ideia na gaveta: a impressora mostra a ideia; Projetos manda lançar (e abre Ideias)
    await irMonitor(2)
    await app('projeto', 'impressora')
    const folhaOk = await page.waitForFunction((nome) => {
      const f = document.querySelector('[data-pm="folha"]')
      return !!f && f.dataset.etapa === '3' && !/Folha em branco/.test(f.textContent) && !!nome && f.textContent.includes(nome)
    }, nomeImpressa, { timeout: 8000 }).then(() => true).catch(() => false)
    confere(folhaOk, `servidor: depois de recarregar, a impressora mostra a ideia da gaveta ("${nomeImpressa}"), não "Folha em branco"`)
    await foto(page, 'ab-srv-7-impressora-recarregada')
    // (3) chances exatas: 0,03% e 0,97% (nada de 0% / 1%)
    const chances = await page.textContent('[data-pm="chances"]')
    confere(/Mítico\s*0,03%/.test(chances) && /Lendário\s*0,97%/.test(chances) && /Raro\s*12,5%/.test(chances), `servidor: chances da impressora com as casas certas (${chances.replace(/\s+/g, ' ').slice(-60)})`)
    await app('projeto', 'projetos')
    const projTxt = await page.textContent('[data-pm-monitor="projeto"] [data-app="projetos"] .pm-jan__corpo')
    confere(/Você tem 1 ideia na gaveta: lance uma/.test(projTxt) && !/Imprima uma ideia e lance/.test(projTxt), `servidor: Projetos diz que há ideia na gaveta (${projTxt.trim().slice(0, 60)})`)
    await foto(page, 'ab-srv-8-projetos-gaveta')
    const irIdeias = page.locator('[data-pm="ir-ideias"]')
    confere(await irIdeias.count() === 1, 'servidor: Projetos tem o botão que abre as Ideias')
    if (await irIdeias.count()) {
      await irIdeias.click()
      confere(await page.waitForSelector('[data-pm-monitor="projeto"] .pm-jan--frente[data-app="ideias"]', { timeout: 3000 }).then(() => true).catch(() => false), 'servidor: o botão abre as Ideias')
    }
    // (7) luxo comprado pela tela: "Comprado: <nome>"
    await app('projeto', 'porao')
    const nomeLuxoSrv = (await estadoSrv()).luxos.find((l) => l.id === 'cadeira_gamer').nome
    await page.locator('[data-k="luxo-cadeira_gamer"]').click()
    const toastLuxo = await page.waitForFunction((n) => [...document.querySelectorAll('.pm-toast')].some((t) => t.textContent.startsWith(`Comprado: ${n}`)), nomeLuxoSrv, { timeout: 5000 }).then(() => true).catch(() => false)
    confere(toastLuxo, `servidor: aviso da compra diz "Comprado: ${nomeLuxoSrv}"`)
    // lançar a ideia da gaveta pela tela
    await app('projeto', 'ideias')
    await page.locator('[data-pm="lancar"]').first().click()
    await page.waitForSelector('[data-pm="projeto"]', { timeout: 8000 })
    // (1) contratar influenciador pela TELA no servidor de verdade: o servidor aceita, cobra o P1 e o vídeo 1 aparece
    await page.locator('[data-pm="projeto"] [data-k^="contratar-"]').first().click() // abre o celular na aba Contratar
    await page.waitForSelector('[data-aba="cel-contratar"][aria-selected="true"]', { timeout: 3000 })
    const infl = (await estadoSrv()).influenciadores.find((i) => i.liberado)
    const respContrato = page.waitForResponse((r) => /\/api\/contrato$/.test(r.url()), { timeout: 8000 })
    await page.click(`[data-pm="contratar"][data-k="contratar-${infl.id}"]`)
    const rc = await respContrato
    const jc = await rc.json().catch(() => ({}))
    confere(rc.status() === 200 && jc.ok === true && jc.resultado?.custo === infl.p1, `servidor: contratar pela tela foi aceito e tirou o P1 ($ ${infl.p1}) do caixa (HTTP ${rc.status()}${jc.erro ? ': ' + jc.erro : ''})`)
    const comContrato = (await estadoSrv()).projetos.find((x) => x.contrato)
    confere(comContrato?.contrato?.influenciador === infl.id, 'servidor: o projeto ficou com o influenciador contratado')
    confere(await page.waitForFunction(() => /Vídeo 1 no ar/.test(document.querySelector('[data-pm="mensagens"]')?.textContent || ''), null, { timeout: 5000 }).then(() => true).catch(() => false), 'servidor: o vídeo 1 aparece no celular')
    // (2) o vídeo flopou: a tela mostra a fala que o servidor mandou, sem texto próprio por cima
    if (comContrato) {
      mexerNoSave(srv, (e) => { const c = e.projetos.find((x) => x.id === comContrato.id).contrato; c.trazidasV1 = 0; c.esperaRestante = 0.01 })
      await page.waitForSelector('[data-pm="proposta"]', { timeout: 15000 }).catch(() => {})
      const falaSrv = (await estadoSrv()).celular.find((m) => m.projetoId === comContrato.id && (m.tipo === 'proposta' || m.tipo === 'pede_mais'))?.texto || '(sem fala)'
      const celTxt = await page.textContent('[data-pm="mensagens"]').catch(() => '')
      confere(celTxt.includes(falaSrv) && !/Foi bem/.test(celTxt), `servidor: o celular mostra a fala do servidor ("${falaSrv.slice(0, 40)}…") e nada de "Foi bem"`)
      await foto(page, 'ab-srv-9-celular-fala')
    }
    await page.keyboard.press('Escape')
    await page.waitForSelector('[data-pm="janela-celular"]', { state: 'detached', timeout: 3000 }).catch(() => {})

    // (5) PC: janelas de trás não mostram conteúdo por baixo da da frente
    {
      const pc = await nova({ largura: 1280, altura: 800, rotulo: 'servidor-pc' })
      await pc.ctx.addCookies(await ctx.cookies())
      await pc.page.goto(REAL)
      if (!(await tela(pc.page, 'titulo', 8000))) { await toque(pc.page, false, 640, 400).catch(() => {}); await tela(pc.page, 'titulo') }
      await pc.page.click('[data-pm="continuar"]')
      await poraoPronto(pc.page)
      await pc.page.evaluate(() => window.poraoApp.cena.abrirMonitores(2))
      await pc.page.waitForSelector('[data-pm-monitor="projeto"] .pm-jan--frente', { timeout: 5000 })
      await pc.page.locator('[data-pm-monitor="projeto"] .pm-icone[data-app="porao"]').click()
      await pc.page.waitForSelector('[data-pm-monitor="projeto"] .pm-jan--frente[data-app="porao"]', { timeout: 3000 })
      const vaza = await pc.page.evaluate(() => [...document.querySelectorAll('.pm-jan')].filter((j) => {
        const c = j.querySelector('.pm-jan__corpo')
        const vis = getComputedStyle(c).visibility !== 'hidden'
        return j.classList.contains('pm-jan--frente') ? !vis : vis
      }).map((j) => j.dataset.app))
      confere(vaza.length === 0, `servidor PC: só a janela da frente mostra conteúdo${vaza.length ? ' (vazam: ' + vaza.join(', ') + ')' : ''}`)
      await foto(pc.page, 'ab-srv-10-pc-janelas')
      await pc.ctx.close()
    }

    // (6) batida: a janela abre sozinha; depois de recarregar continua aberta (Menos animação: sem tremida)
    // (2º projeto no ar: com um só, o tapete tira o último do ar e o Calor cheio vira multa, sem batida)
    const segundo = await page.evaluate(async () => { const a = window.poraoApp.api; const r = await a.imprimir(); return r.ok ? (await a.lancar(r.resultado.carta.id)).ok : false })
    confere(segundo, 'servidor: 2º projeto lançado (para a batida ter o que levar)')
    await irMonitor(0)
    await esperarPuxar(page)
    mexerNoSave(srv, (e) => { e.calor = 99.9 })
    await page.click('[data-pm="puxar"]')
    await page.waitForSelector('[data-pm="tapete-resumo"]', { timeout: 20000 })
    await page.click('[data-pm="tapete-fechar"]')
    confere(await page.waitForSelector('[data-pm="janela-batida"]', { timeout: 8000 }).then(() => true).catch(() => false) && !!(await estadoSrv()).batida, 'servidor: a batida abre a janela sozinha depois do tapete')
    await page.keyboard.press('Escape')
    await page.waitForSelector('[data-pm="janela-batida"]', { state: 'detached', timeout: 3000 }).catch(() => {})
    await page.evaluate(() => localStorage.setItem('menos_animacao', '1'))
    await page.reload()
    await tela(page, 'titulo', 15000)
    await page.click('[data-pm="continuar"]')
    await poraoPronto(page)
    const batidaVolta = await page.waitForSelector('[data-pm="janela-batida"]', { timeout: 8000 }).then(() => true).catch(() => false)
    confere(batidaVolta, 'servidor: depois de recarregar com a batida pendente, a janela da batida abre sozinha (celular)')
    if (batidaVolta) {
      const anim = await page.evaluate(() => ['.pm-janela', '.pm-janela__caixa'].map((s) => getComputedStyle(document.querySelector(s)).animationName))
      confere(anim.every((a) => a === 'none'), `servidor: janela da batida sem animação com Menos animação (${anim.join(', ')})`)
      const cabe = await page.evaluate(() => { const r = document.querySelector('.pm-janela__caixa').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight })
      confere(cabe && await semLateral(page), 'servidor: a janela da batida cabe no celular sem rolagem lateral')
      await foto(page, 'ab-srv-11-batida-recarregada')
      await page.keyboard.press('Escape')
      await page.waitForSelector('[data-pm="janela-batida"]', { state: 'detached', timeout: 3000 }).catch(() => {})
      await page.evaluate(() => window.poraoApp.api.estado().then((r) => r.visao && window.poraoApp.monitores.atualizar(r.visao)))
      confere(await page.locator('[data-pm="janela-batida"]').count() === 0, 'servidor: fechada pelo jogador, a janela da batida não volta sozinha (fica a faixa)')
    }
    await page.evaluate(() => localStorage.removeItem('menos_animacao'))

    // sair: volta ao título sem Continuar
    const saiu = await page.evaluate(() => window.poraoApp.api.sair())
    confere(saiu.ok === true, 'servidor: sair respondeu ok')
    await page.reload()
    confere(await tela(page, 'logo', 5000) || await tela(page, 'titulo', 5000), 'servidor: depois de sair, a abertura volta')
    if (await page.locator('.ab[data-tela="logo"]').count()) await toque(page, true, 195, 422)
    confere(await tela(page, 'titulo'), 'servidor: depois de sair, TÍTULO')
    confere(await page.locator('[data-pm="continuar"]').count() === 0, 'servidor: depois de sair, sem Continuar')
    await ctx.close()
  } finally {
    await srv.fechar()
    await rm(pasta, { recursive: true, force: true })
  }

  confere(erros.length === 0, `sem erro no console nem pedido quebrado${erros.length ? ': ' + erros.slice(0, 5).join(' | ') : ''}`)
} catch (e) {
  falha('o robô quebrou: ' + (e && e.message))
  if (FOTOS && ultima) {
    await ultima.screenshot({ path: path.join(FOTOS, 'falha-abertura.png') }).catch(() => {})
    console.log('texto da tela: ' + await ultima.evaluate(() => document.body.innerText.slice(0, 700)).catch(() => ''))
  }
  console.log(String(e && e.stack).split('\n').slice(0, 6).join('\n'))
  if (erros.length) console.log('erros da página: ' + erros.slice(0, 5).join(' | '))
}
await navegador.close()
estatico.close()
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nteste de tela da abertura: verde')
process.exit(falhas.length ? 1 : 0)
