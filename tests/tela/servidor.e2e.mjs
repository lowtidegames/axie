// Frayz — teste de tela do MODO SERVIDOR (Chrome de verdade): a mesma tela jogando contra o servidor, de ponta a ponta.
// Sobe o servidor de verdade (server/index.mjs) com banco temporário em porta livre e abre http://127.0.0.1:<porta>/public/.
// Confere: a ponte escolhe o modo servidor sozinha; entrada com apelido (e o aviso de apelido em uso); a coleção vem do
// servidor; uma luta da Aventura jogada até o fim pelo servidor (intenção do rival visível, queda de rede no meio repetida
// com o mesmo seq), energia 19/20 vinda do servidor; costura e casulo aberto (gravado no servidor); recarregar a página
// continua logado; luta aberta volta depois de recarregar e dá para desistir; manutenção avisa e "Tentar de novo" volta;
// sair da conta (o token deixa de valer). Celular 360×740 (toque) e PC 1280×720 (mouse). Fotos em tests/tela/fotos/.
// Rode pela trava:  node tools/trava-robos.mjs rodar "timeout 700 node tests/tela/servidor.e2e.mjs"
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { iniciar } from '../../server/index.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const AQUI = path.dirname(fileURLToPath(import.meta.url))
const FOTOS = path.join(AQUI, 'fotos')
fs.mkdirSync(FOTOS, { recursive: true })

const FORMATOS = [
  { nome: 'celular', w: 360, h: 740, toque: true },
  { nome: 'pc', w: 1280, h: 720, toque: false },
]
const falhas = []
const falha = (msg) => { falhas.push(msg); console.log('FALHA: ' + msg) }
const confere = (ok, msg) => { if (!ok) falha(msg); else console.log('  ok: ' + msg) }

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'frayz-e2e-servidor-'))
const folga = { pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 100_000, janelaMs: 60_000 }, contasPorIp: { max: 1000, janelaMs: 60_000 } }
const s = await iniciar({ dbPath: path.join(pasta, 'frayz-e2e.db'), porta: 0, log: () => {}, limites: folga })
const base = `http://127.0.0.1:${s.porta}`
const browser = await chromium.launch()
const APELIDO_CEL = 'Robo Celular'

/** Pedido direto ao servidor (fora da tela), para conferir o que ele guardou. */
async function api(metodo, caminho, token) {
  const r = await fetch(base + caminho, { method: metodo, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  let json = null
  try { json = await r.json() } catch { /* ok */ }
  return { status: r.status, json }
}

async function foraDaTela(page, seletores) {
  return page.evaluate((sels) => {
    const vw = window.innerWidth, vh = window.innerHeight, out = []
    for (const s of sels) {
      for (const e of document.querySelectorAll(s)) {
        const r = e.getBoundingClientRect(); const cs = getComputedStyle(e)
        if (cs.display === 'none' || cs.visibility === 'hidden' || (r.width === 0 && r.height === 0)) continue
        if (r.left < -0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.bottom > vh + 0.5) out.push(`${s} (${Math.round(r.left)},${Math.round(r.top)})-(${Math.round(r.right)},${Math.round(r.bottom)}) em ${vw}x${vh}`)
      }
    }
    if (document.documentElement.scrollWidth > vw + 1) out.push(`página com rolagem lateral: ${document.documentElement.scrollWidth} > ${vw}`)
    return out
  }, seletores)
}

async function rodarFormato(fmt) {
  console.log(`\n=== ${fmt.nome} (${fmt.w}x${fmt.h}) ===`)
  const ctx = await browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1 })
  const erros = [], ruins = []
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()) })
  page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
  page.on('response', (r) => { if (r.status() >= 400) ruins.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`) })
  const foto = async (nome) => { const arq = path.join(FOTOS, `${fmt.nome}-servidor-${nome}.png`); await page.screenshot({ path: arq }); console.log('  foto: ' + path.relative(process.cwd(), arq)) }
  const clique = async (sel) => (fmt.toque ? page.locator(sel).first().tap() : page.locator(sel).first().click())
  const toque = async (x, y) => (fmt.toque ? page.touchscreen.tap(x, y) : page.mouse.click(x, y))
  const escolherCarta = async (cid) => {
    const c = page.locator(`#mao .fz-carta[data-mao="${cid}"]`)
    if (fmt.toque) { await c.tap({ position: { x: 12, y: 40 } }); await page.locator('.fz-lupa__jogar').tap() } else await c.click({ position: { x: 20, y: 60 } })
  }
  const token = () => page.evaluate(() => localStorage.getItem('frayz_sessao'))
  const URL_JOGO = `${base}/public/?teste=1&vel=0.12`

  /** Joga a luta aberta até o fim pela tela (o servidor decide; a jogada vem da lista de válidos que ele mandou). */
  const lutarAteOFim = async ({ aventura = false, cair = false } = {}) => {
    let jogadas = 0, viuIntencao = false, caiu = false
    for (let passo = 0; passo < 400; passo++) {
      await page.waitForFunction(() => window.__frayz.livre() || window.__frayz.acabou(), null, { timeout: 90000 })
      if (await page.evaluate(() => window.__frayz.acabou())) break
      if (aventura && !viuIntencao) {
        await page.waitForSelector('#intencao:not([hidden])', { timeout: 15000 })
        const txt = (await page.locator('#intencao').textContent()).replace(/\s+/g, ' ').trim()
        viuIntencao = /vai (atacar|usar|passar|trocar|descartar)/.test(txt)
        if (viuIntencao) confere(true, `intenção do rival (vinda do servidor) visível: "${txt}"`)
      }
      const cmd = await page.evaluate(() => window.__frayz.sugestao())
      if (!cmd) break
      if (cair && !caiu && cmd.tipo === 'passar') { // a rede cai no primeiro "passar": o comando é repetido com o mesmo seq
        caiu = true
        let n = 0
        await page.route('**/api/luta/*/comando', (rota) => (n++ < 2 ? rota.abort('internetdisconnected') : rota.continue()))
        await clique('#btnPassar')
        await page.waitForFunction(() => window.__frayz.avisos.some((a) => /Conexão de volta/.test(a)), null, { timeout: 30000 })
        await page.unroute('**/api/luta/*/comando')
        const av = await page.evaluate(() => window.__frayz.avisos.filter((a) => /conexão/i.test(a)))
        confere(n >= 3 && av.some((a) => /Sem conexão/.test(a)), `queda de rede no meio da luta: avisou e repetiu o comando (${n} tentativas; avisos: ${av.join(' / ')})`)
        jogadas++; continue
      }
      if (cmd.tipo === 'jogar') {
        await escolherCarta(cmd.carta)
        await page.waitForFunction((cid) => window.__frayz.S.sel === cid || !window.__frayz.livre(), cmd.carta, { timeout: 8000 })
        if (await page.evaluate((cid) => window.__frayz.S.sel === cid, cmd.carta)) {
          if (cmd.alvo) { const pos = await page.evaluate((id) => window.__frayz.pagina(id), cmd.alvo); await toque(pos.x, pos.y) } else await escolherCarta(cmd.carta)
        }
      } else if (cmd.tipo === 'fiapo') await escolherCarta(cmd.carta)
      else await clique('#btnPassar')
      jogadas++
    }
    await page.waitForSelector('#fim:not([hidden])', { timeout: 30000 })
    return { jogadas, viuIntencao, caiu }
  }

  // ============================================================ ENTRADA
  await page.goto(URL_JOGO)
  await page.waitForSelector('#entrada:not([hidden])', { timeout: 20000 })
  confere(await page.evaluate(() => window.__frayz.modo()) === 'servidor', 'a ponte escolheu o modo servidor sozinha (public/modo.json do servidor)')
  confere(await page.locator('#hub').isHidden(), 'sem sessão: a entrada aparece antes do hub')
  await foto('entrada')
  confere((await foraDaTela(page, ['.ent-folha', '#entApelido', '#btnEntrar'])).length === 0, 'entrada: folha, campo e botão dentro da janela')
  const alto = await page.evaluate(() => ['#entApelido', '#btnEntrar'].map((s) => Math.round(document.querySelector(s).getBoundingClientRect().height)))
  confere(alto.every((h) => h >= 44), `entrada: campo e botão com toque ≥ 44 px (${alto})`)
  if (fmt.nome === 'pc') { // o apelido do celular já tem dono: aviso claro, sem sair da entrada
    await page.fill('#entApelido', APELIDO_CEL)
    await clique('#btnEntrar')
    await page.waitForFunction(() => /já tem dono/.test(document.querySelector('#entMsg').textContent), null, { timeout: 10000 })
    confere(true, 'apelido em uso: "' + (await page.locator('#entMsg').textContent()) + '"')
  }
  await page.fill('#entApelido', 'ab')
  await clique('#btnEntrar')
  confere(/pelo menos 3/.test(await page.locator('#entMsg').textContent()), 'apelido curto: a tela avisa antes de pedir')
  const apelido = fmt.nome === 'pc' ? 'Robo do PC' : APELIDO_CEL
  await page.fill('#entApelido', apelido)
  await clique('#btnEntrar')
  await page.waitForSelector('#inicio:not([hidden]) .ficha', { timeout: 20000 })
  confere((await page.locator('#grade .ficha').count()) === 9, 'conta nova: os 9 bonecos de teste vieram do servidor')
  const tk = await token()
  confere(/^[A-Za-z0-9_-]{43}$/.test(tk ?? ''), 'sessão guardada no aparelho')
  const est0 = (await api('GET', '/api/estado', tk)).json
  const idsTela = await page.evaluate(() => window.__frayz.Col.todos().map((b) => b.id))
  confere(JSON.stringify(idsTela) === JSON.stringify(est0.bonecos.map((b) => b.id)), 'a coleção da tela é a do servidor (mesmos ids, mesma ordem)')

  // ============================================================ COLEÇÃO
  await clique('#abaColecao')
  await page.waitForSelector('#colecao:not([hidden]) .col-cartao')
  confere((await page.locator('#colLista .col-cartao').count()) === 9, 'Meus bonecos mostra os 9')
  confere((await page.locator('#colApelido').textContent()) === apelido && await page.locator('#btnSairConta').isVisible(), 'a conta (apelido) e o botão de sair aparecem em Meus bonecos')
  confere(!/Retalhos/.test(await page.locator('#colResumo').textContent()), 'sem soma de Retalhos que o servidor não manda (nada inventado)')
  await clique('#colLista .col-cartao')
  await page.waitForSelector('#bonecoModal:not([hidden])')
  confere(await page.locator('#btnEnvelhecer').count() === 0, 'ferramentas de protótipo (gastar boneco) não aparecem no modo servidor')
  await page.keyboard.press('Escape')

  // ============================================================ AVENTURA
  await clique('#abaAventura')
  await page.waitForSelector('#aventura:not([hidden])')
  const txtEn = (await page.locator('#avEnergia').textContent()).replace(/\s+/g, ' ')
  confere(txtEn.includes(`Energia ${est0.energia.atual}/${est0.energia.maximo}`) && est0.energia.atual === 20, `Aventura mostra a energia do servidor: ${txtEn.trim()}`)
  confere(/sorteado/.test(await page.locator('#avInfo').textContent()), 'o rival da fase é sorteado pelo servidor (a tela não inventa o time)')
  const ids3 = est0.bonecos.slice(0, 3).map((b) => b.id)
  for (const id of ids3) await clique(`#avTime .mini-cartao[data-id=${id}]`)
  await foto('aventura')
  await clique('#btnJogarFase')
  await page.waitForSelector('#luta:not([hidden])', { timeout: 20000 })
  const en1 = await page.evaluate(() => window.__frayz.P.energia())
  const en1s = (await api('GET', '/api/estado', tk)).json.energia
  confere(en1.atual === 19 && en1s.atual === 19 && en1.maximo === 20, `abrir a luta da Aventura gastou energia no servidor: tela ${en1.atual}/${en1.maximo}, servidor ${en1s.atual}/${en1s.maximo}`)
  await page.waitForFunction(() => window.__frayz.livre() || window.__frayz.acabou(), null, { timeout: 60000 })
  await foto('luta')
  const foraLuta = await foraDaTela(page, ['#topo', '#banda', '#btnPassar', '#btnTrocar', '#arena', '#baixo'])
  confere(foraLuta.length === 0, 'luta do servidor: nada importante fora da janela' + (foraLuta.length ? ' → ' + foraLuta.join('; ') : ''))
  const r1 = await lutarAteOFim({ aventura: true, cair: fmt.nome === 'celular' })
  confere(r1.viuIntencao, `luta da Aventura jogada até o fim pelo servidor (${r1.jogadas} comandos)`)
  const fimTela = await page.evaluate(() => window.__frayz.estado().fim)
  const lutaSrv = (await api('GET', '/api/estado', tk)).json
  confere(!!fimTela && lutaSrv.lutaAberta === null, `o fim da tela é o do servidor (vencedor ${fimTela?.vencedor}, nenhuma luta aberta lá)`)
  confere(lutaSrv.bonecos.filter((b) => ids3.includes(b.id)).every((b) => b.lutas === 1 && b.pontosDeCostura >= 1), 'o servidor registrou a luta nos 3 bonecos')
  const liberada = lutaSrv.faseLiberada
  confere(liberada === (fimTela.vencedor === 'A' ? 2 : 1), `fase liberada do servidor: ${liberada}`)
  await foto('fim')
  confere(/Fase 1/.test(await page.locator('#fimMotivo').textContent()), 'folha do fim mostra a fase')
  const rep = await page.evaluate(() => window.__frayz.textoDoReplay())
  confere(/"v":1/.test(rep) && JSON.parse(rep).s.length > 8, 'replay da luta do servidor (com a semente que só sai no fim)')
  await clique('#btnTrocarTime')
  await page.waitForSelector('#aventura:not([hidden])')
  confere((await page.locator('#avEnergia').textContent()).includes('Energia 19/20'), 'de volta ao mapa: Energia 19/20 (número do servidor)')
  confere((await page.locator('#avMapa .av-estacao:disabled').count()) === 5 - liberada, `mapa com ${liberada} fase(s) liberada(s), como o servidor diz`)

  // ============================================================ COSTURA E CASULO
  await clique('#abaCostura')
  await page.waitForSelector('#costura:not([hidden]) #cosEscolha .mini-cartao')
  const [pa, pb] = est0.bonecos.slice(3, 5).map((b) => b.id)
  await clique(`#cosEscolha .mini-cartao[data-id=${pa}]`)
  await clique(`#cosEscolha .mini-cartao[data-id=${pb}]`)
  await page.waitForSelector('#cosChances')
  await clique('#btnCosturar')
  await page.waitForSelector('#casulo:not([hidden])', { timeout: 20000 })
  await foto('casulo')
  await clique('#btnCasTudo')
  await page.waitForSelector('#btnCasFim:not([hidden])', { timeout: 30000 })
  const filhoId = await page.locator('#casFilho').getAttribute('data-id')
  const filhoSrv = (await api('GET', `/api/boneco/${filhoId}`, tk)).json
  confere(filhoSrv?.boneco?.casulo?.aberto === true && filhoSrv.boneco.pais.join() === [pa, pb].join(), 'o filho nasceu no servidor e o casulo aberto ficou gravado lá')
  const pais = (await api('GET', '/api/estado', tk)).json.bonecos.filter((b) => b.id === pa || b.id === pb).map((b) => b.voltasUsadas)
  confere(pais.every((v) => v === 1), 'os pais gastaram 1 volta do Carretel no servidor')
  await clique('#btnCasFim')
  await page.waitForSelector('#colecao:not([hidden])')
  confere((await page.locator('#colLista .col-cartao').count()) === 10, 'o filho aparece em Meus bonecos (10)')

  // ============================================================ RECARREGAR: continua logado; luta aberta volta; desistir
  await page.goto(URL_JOGO + '&aba=inicio')
  await page.waitForSelector('#inicio:not([hidden]) .ficha', { timeout: 20000 })
  confere(await page.locator('#entrada').isHidden() && (await page.locator('#grade .ficha').count()) === 10, 'recarregou: continua logado, com os 10 bonecos')
  if (fmt.nome === 'pc') {
    for (const id of est0.bonecos.slice(5, 8).map((b) => b.id)) await clique(`#grade .ficha[data-id=${id}]`)
    await clique('#btnLutar')
    await page.waitForSelector('#luta:not([hidden])')
    await page.waitForFunction(() => window.__frayz.livre(), null, { timeout: 60000 })
    const nAntes = await page.evaluate(() => window.__frayz.estado().comandos.length)
    await page.goto(URL_JOGO + '&aba=inicio') // fecha a página no meio da luta
    await page.waitForSelector('#luta:not([hidden])', { timeout: 20000 })
    await page.waitForFunction(() => window.__frayz.livre(), null, { timeout: 60000 })
    confere(await page.evaluate((n) => window.__frayz.estado().comandos.length >= n, nAntes), 'recarregou no meio da luta: a luta aberta no servidor voltou para a tela')
    await clique('#btnMenu')
    confere(await page.locator('#btnDesistir').isVisible(), 'menu da luta do servidor tem "Desistir"')
    await clique('#btnDesistir')
    await page.waitForSelector('#fim:not([hidden])', { timeout: 20000 })
    confere(/desistiu/.test(await page.locator('#fimMotivo').textContent()) && (await api('GET', '/api/estado', tk)).json.lutaAberta === null, 'desistir: o rival vence e a luta fecha no servidor')
    await clique('#btnTrocarTime')
    await page.waitForSelector('#inicio:not([hidden])')
  }

  // ============================================================ MANUTENÇÃO: aviso claro e "Tentar de novo"
  process.env.MANUTENCAO = '1'
  try {
    await page.goto(URL_JOGO)
    await page.waitForSelector('#entrada:not([hidden]) #btnTentar:not([hidden])', { timeout: 20000 })
    confere(/manutenção/.test(await page.locator('#entMsg').textContent()), 'manutenção: a entrada avisa em português ("' + (await page.locator('#entMsg').textContent()) + '")')
    await foto('manutencao')
  } finally { delete process.env.MANUTENCAO }
  await clique('#btnTentar')
  await page.waitForSelector('#hub:not([hidden])', { timeout: 20000 })
  confere(await page.locator('#entrada').isHidden(), 'manutenção acabou: "Tentar de novo" volta ao jogo com a mesma sessão')

  // ============================================================ SAIR
  await clique('#abaColecao')
  await page.waitForSelector('#btnSairConta')
  await clique('#btnSairConta')
  await page.waitForSelector('#entrada:not([hidden])', { timeout: 20000 })
  confere(await token() === null, 'sair: a sessão sai do aparelho')
  confere((await api('GET', '/api/estado', tk)).status === 401, 'sair: o servidor não aceita mais o token')

  const esperados = (r) => /^(409 POST \/api\/conta|503 GET \/api\/estado)$/.test(r) || (r === '401 GET /api/estado') // apelido em uso, manutenção
  const inesperados = ruins.filter((r) => !esperados(r))
  confere(inesperados.length === 0, 'nenhum pedido com erro fora os esperados' + (inesperados.length ? ' → ' + inesperados.join(' | ') : ''))
  confere(erros.filter((e) => !/Failed to load resource/.test(e)).length === 0, 'nenhum erro no console' + (erros.length ? ' → ' + erros.slice(0, 5).join(' | ') : ''))
  await ctx.close()
}

try {
  for (const f of FORMATOS) await rodarFormato(f)
} catch (e) {
  falha('exceção no teste: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' / ') : e))
}
await browser.close()
s.servidor.close()
fs.rmSync(pasta, { recursive: true, force: true })
if (falhas.length) { console.log(`\nFALHOU: ${falhas.length} problema(s)`); process.exit(1) }
console.log('\nTeste de tela do modo servidor: verde (' + FORMATOS.map((f) => f.nome).join(' + ') + ')')
