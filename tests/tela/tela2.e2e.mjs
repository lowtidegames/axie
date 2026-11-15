// Frayz — teste de tela 2 (Chrome de verdade): coleção, costura com casulo, remendos, aposentadoria, Aventura (fase 1 jogada até o fim com a
// intenção do rival visível), som mudo, nenhum erro de console e nada importante fora da tela em 360×740 e 1280×720. Fotos em tests/tela/fotos/.
// Rode pelo npm: `npm run e2e` (passa pela trava de um robô por vez).
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { iniciar } from '../../server/dev.mjs'

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

const servidor = await iniciar({ porta: 0 })
const base = `http://127.0.0.1:${servidor.address().port}`
const browser = await chromium.launch()

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
  const erros = []
  let page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()) })
  page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
  const foto = async (nome) => { const arq = path.join(FOTOS, `${fmt.nome}-${nome}.png`); await page.screenshot({ path: arq }); console.log('  foto: ' + path.relative(process.cwd(), arq)) }
  const abrir = async (aba, extra = '') => { await page.goto(`${base}/public/?teste=1&recomecar=1&aba=${aba}&vel=0.12&semente=t2${extra}`); await page.waitForSelector(`#${aba}:not([hidden])`) }
  const clique = async (sel) => (fmt.toque ? page.locator(sel).first().tap() : page.locator(sel).first().click())
  // carta da mão (leque): no PC um clique na faixa da esquerda; no toque a carta amplia e o botão Jogar escolhe
  const escolherCarta = async (cid) => {
    const c = page.locator(`#mao .fz-carta[data-mao="${cid}"]`)
    if (fmt.toque) { await c.tap({ position: { x: 12, y: 40 } }); await page.locator('.fz-lupa__jogar').tap() } else await c.click({ position: { x: 20, y: 60 } })
  }
  const toque = async (x, y) => (fmt.toque ? page.touchscreen.tap(x, y) : page.mouse.click(x, y))
  const sem = async (fn) => page.evaluate(fn)
  // TAREFA 18: nada cortado nem sobreposto nas telas do hub (prateleira, ficha, mesa), botões de toque ≥ 44 px e foco visível
  const conferirTela = async (onde, raiz) => {
    const r = await page.evaluate((raiz) => {
      const R = document.querySelector(raiz), vis = (e) => { const q = e.getBoundingClientRect(), cs = getComputedStyle(e); return q.width > 0 && q.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' }
      const vw = innerWidth, vh = innerHeight, dentro = (q) => q.bottom > 0 && q.top < vh && q.right > 0 && q.left < vw
      const textos = '.fz-time__nome span, .hub-titulo, .hub-dica, .fz-botao__rotulo, .fz-botao__detalhe, .av-nome, .av-in-txt b, .fz-circulo__nome, .fz-ficha__nome, .fz-ficha__carta-nome, .cos-nome b, .aba, .hub-energia b, .hub-energia small, .av-topo, #cab .opc span'
      const cortados = [...R.querySelectorAll(textos), ...document.querySelectorAll('#abas .aba, #cab .opc span')].filter((e) => vis(e) && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2)).map((e) => e.textContent.trim().slice(0, 30))
      // etiqueta de nome de uma tábua em cima dos bonecos da tábua de baixo
      const batem = []
      const tabuas = [...R.querySelectorAll('.fz-time__tabua')]
      for (let i = 0; i + 1 < tabuas.length; i++) for (const n of tabuas[i].querySelectorAll('.fz-time__nome span')) { if (!vis(n)) continue; const a = n.getBoundingClientRect(); for (const b of tabuas[i + 1].querySelectorAll('.fz-boneco')) { const q = b.getBoundingClientRect(); if (Math.min(a.right, q.right) - Math.max(a.left, q.left) > 2 && Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top) > 2) batem.push(n.textContent.trim()) } }
      // botões de toque pequenos (o que está na janela)
      const pequenos = [...document.querySelectorAll('#cab button, #abas button'), ...R.querySelectorAll('button, summary')].filter((e) => vis(e) && dentro(e.getBoundingClientRect())).filter((e) => { const q = e.getBoundingClientRect(); return q.height < 43.5 || q.width < 43.5 }).map((e) => (e.id || e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))
      // o pé fixo (mesa) não tapa a ficha nem a prateleira de quem não rola
      return { cortados, batem: [...new Set(batem)], pequenos }
    }, raiz)
    confere(r.cortados.length === 0, `${onde}: nenhum texto cortado` + (r.cortados.length ? ' → ' + r.cortados.slice(0, 5).join('; ') : ''))
    confere(r.batem.length === 0, `${onde}: etiquetas da prateleira não cobrem os bonecos de baixo` + (r.batem.length ? ' → ' + r.batem.slice(0, 4).join('; ') : ''))
    confere(r.pequenos.length === 0, `${onde}: botões com pelo menos 44 px` + (r.pequenos.length ? ' → ' + r.pequenos.slice(0, 5).join('; ') : ''))
    // foco visível no teclado: o primeiro botão da prateleira ganha contorno ao receber foco pelo Tab
    if (!fmt.toque) {
      const tem = await page.evaluate((raiz) => { const b = document.querySelector(raiz + ' .fz-time__boneco:not(:disabled)'); if (b) b.focus(); return !!b }, raiz)
      if (tem) { await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab') } // volta pelo teclado: o navegador mostra o foco
      const contorno = !tem ? 'sem botão' : await page.evaluate(() => { const b = document.activeElement, cs = getComputedStyle(b); return b.matches(':focus-visible') ? cs.outlineStyle + ' ' + cs.outlineWidth : 'sem foco-visível em ' + (b.id || b.className) })
      confere(/solid [1-9]/.test(contorno) || contorno === 'sem botão', `${onde}: foco do teclado visível (${contorno})`)
    }
  }

  // ============================================================ COLEÇÃO
  await abrir('colecao')
  confere((await page.locator('#colLista .ficha').count()) === 9, 'coleção começa com os 9 bonecos prontos (com genes)')
  await foto('colecao')
  await conferirTela('bonecos', '#colecao')
  confere((await foraDaTela(page, ['#cab', '#abas', '.aba', '#colLista .ficha'])).filter((x) => !x.startsWith('#colLista')).length === 0, 'coleção: cabeçalho e abas dentro da janela')
  await clique('#colLista .ficha[data-id=rasgao]')
  await page.waitForSelector('#bonecoModal:not([hidden])')
  confere(/Carretel/.test(await page.locator('#bonecoCorpo').textContent()) && /0\/5/.test(await page.locator('#bonecoCorpo .carretel').textContent()), 'ficha mostra o Carretel (0/5 voltas)')
  confere((await page.locator('#fcPartes li').count()) === 5, 'ficha mostra as 5 partes')
  const frente = await page.locator('#fcPartes').textContent()
  await clique('#btnAvesso')
  const avesso = await page.locator('#fcPartes').textContent()
  confere(avesso !== frente && /forro/.test(avesso), 'olhar o avesso mostra os forros (diferente da frente)')
  const forrosMotor = await page.evaluate(() => { const P = window.__frayz.P, b = window.__frayz.Col.obter('rasgao'); return Object.values(P.olharOAvesso(b)) })
  confere(forrosMotor.length === 5 && (await page.locator('#fcPartes .chip-parte').count()) === 5, 'avesso = o que olharOAvesso devolve (5 forros)')
  confere((await foraDaTela(page, ['#bonecoModal .folha', '#bonecoFechar'])).length === 0, 'ficha da coleção cabe na janela')
  // remendos aparecem no desenho conforme nivelDeRemendo
  const hashDesenho = async () => page.evaluate(() => { const c = document.querySelector('#bonecoCorpo canvas'); return c.toDataURL().length + ':' + c.toDataURL().slice(-80) })
  const nivel = async () => page.evaluate(() => window.__frayz.P.nivelDeRemendo(window.__frayz.Col.obter('rasgao')))
  confere((await nivel()) === 0, 'sem lutas: nível de remendo 0')
  const h0 = await hashDesenho()
  await page.locator('#bonecoCorpo details.proto summary').click()
  await clique('#btnEnvelhecer')
  const n1 = await nivel(); const h1 = await hashDesenho()
  confere(n1 === 1 && h1 !== h0, `+240 lutas: nível ${n1}, o desenho mudou (remendo apareceu)`)
  confere(/1 de 5/.test(await page.locator('#bonecoCorpo').textContent()) && /240\//.test(await page.locator('#fcPontos').textContent()), 'ficha mostra Pontos de Costura 240 e remendos 1 de 5')
  for (let i = 0; i < 3; i++) await clique('#btnEnvelhecer')
  const n4 = await nivel(), h4 = await hashDesenho()
  confere(n4 === 4 && h4 !== h1, `960 lutas: nível ${n4}, desenho com mais remendos`)
  confere(await page.locator('#btnAposentar').isDisabled(), 'Aposentar desligado antes do limite')
  await clique('#btnAvesso')
  await page.evaluate(() => { document.querySelector('#bonecoModal .folha').scrollTop = 0 })
  await foto('remendos')
  await clique('#btnEnvelhecer')
  confere((await nivel()) === 5 && await page.locator('#btnAposentar').isEnabled(), 'no limite: nível 5 e Aposentar liga (podeAposentar)')
  const lutaRecusa = await page.evaluate(() => window.__frayz.Col.podeLutar(window.__frayz.Col.obter('rasgao')))
  confere(!lutaRecusa.ok && lutaRecusa.motivo.length > 5, 'boneco no limite não luta: ' + lutaRecusa.motivo)
  await clique('#btnAposentar')
  // TAREFA 21: aposentar pede confirmação (sem volta) dizendo o que se ganha; só depois a cerimônia
  await page.waitForSelector('#confirma')
  const txtConf = (await page.locator('#confirma').textContent()).replace(/\s+/g, ' ')
  confere(/Não tem volta/.test(txtConf) && /Mural/.test(txtConf) && /Retalhos Honrados/.test(txtConf) && (await page.locator('#cerimonia').count()) === 0, 'Aposentar pede confirmação e diz o que se ganha: ' + txtConf.slice(0, 90))
  await clique('#btnConfirmaSim')
  await page.waitForSelector('#cerimonia')
  confere(await page.locator('#cerQuadro').isVisible() && await page.evaluate(() => window.__frayz.Som.registro.some((r) => r[0] === 'aposentadoria')), 'cerimônia: o boneco num quadro e o som de aposentadoria')
  confere(/\+\d+ Retalhos Honrados/.test(await page.locator('#cerRetalhos').textContent()), 'cerimônia mostra os Retalhos Honrados: ' + (await page.locator('#cerRetalhos').textContent()))
  await page.waitForTimeout(1500)
  await foto('aposentadoria')
  await clique('#btnVerMural')
  await page.waitForSelector('#mural:not([hidden])')
  confere((await page.locator('#murLista .mural-cartao').count()) === 1 && /Lutas 1200/.test(await page.locator('#murLista').textContent()), 'Mural mostra o aposentado com as estatísticas')
  confere(/^1 boneco aposentado\b/.test(await page.locator('#murResumo').textContent()), 'Mural com o plural certo: ' + (await page.locator('#murResumo').textContent()))
  confere(await page.locator('#murLista .mural-cartao.mural-novo').count() === 1, 'o quadro chega ao Mural (cerimônia)')
  confere((await foraDaTela(page, ['#murLista .ficha'])).length === 0, 'Mural: cartão dentro da janela')
  await foto('mural')
  await clique('.aba[data-aba=colecao]')
  confere((await page.locator('#colLista .ficha').count()) === 8, 'aposentado saiu da lista de bonecos ativos (8)')

  // ============================================================ COSTURA
  await abrir('costura')
  confere(await page.locator('#btnCosturar').isDisabled(), 'Costurar começa desligado')
  await clique('#cosEscolha .mini-cartao[data-id=mordedor]')
  await clique('#cosEscolha .mini-cartao[data-id=mordedor]') // mesmo boneco nos dois lugares
  await page.waitForSelector('#cosRecusa')
  confere((await page.locator('#cosRecusa').getAttribute('data-codigo')) === 'MESMO_BONECO' && /diferentes/.test(await page.locator('#cosRecusa').textContent()), 'mesmo boneco: recusa do motor com motivo — ' + (await page.locator('#cosRecusa').textContent()))
  confere(await page.locator('#btnCosturar').isDisabled(), 'recusa deixa Costurar desligado')
  await clique('.cos-slot[data-slot=b] .cos-x')
  await clique('#cosEscolha .mini-cartao[data-id=pisoteador]')
  await page.waitForSelector('#cosChances')
  const somas = await page.evaluate(() => [...document.querySelectorAll('#cosChances .cos-parte')].map((sec) => ({
    slot: sec.dataset.slot,
    face: [...sec.querySelectorAll('ul.cos-chances:not(.forro) li')].reduce((s, li) => s + Number(li.dataset.chance), 0),
    forro: [...sec.querySelectorAll('ul.cos-chances.forro li')].reduce((s, li) => s + Number(li.dataset.chance), 0),
    pcts: [...sec.querySelectorAll('ul.cos-chances:not(.forro) .cos-pct')].map((e) => e.textContent),
  })))
  confere(somas.length === 5 && somas.every((x) => Math.abs(x.face - 1) < 1e-9 && Math.abs(x.forro - 1) < 1e-9), 'chances na tela somam 100% por parte (face e forro): ' + somas.map((x) => `${x.slot}=${(x.face * 100).toFixed(1)}`).join(' '))
  const dobra = await page.evaluate(() => { const A = window.__frayz.Col.obter('mordedor'), B = window.__frayz.Col.obter('pisoteador'); const ch = window.__frayz.P.chancesDaCostura(A, B); return Object.fromEntries(Object.entries(ch).map(([k, v]) => [k, v.face.map((x) => x.chance)])) })
  const bate = await page.evaluate((d) => [...document.querySelectorAll('#cosChances .cos-parte')].every((sec) => { const lista = [...sec.querySelectorAll('ul.cos-chances:not(.forro) li')].map((li) => Number(li.dataset.chance)); return JSON.stringify(lista) === JSON.stringify(d[sec.dataset.slot]) }), dobra)
  confere(bate, 'números da tela = chancesDaCostura do motor')
  confere(/Custo: [\d,]+/.test(await page.locator('#cosCusto').textContent()) && /sem cobrança no protótipo/.test(await page.locator('#cosCusto').textContent()), 'custo mostrado como informação: ' + (await page.locator('#cosCusto').textContent()))
  confere(/0\/5 → 1\/5/.test(await page.locator('#cosCarretel').textContent()), 'mostra o que muda no Carretel dos pais: ' + (await page.locator('#cosCarretel').textContent()).replace(/\s+/g, ' '))
  await conferirTela('costura', '#costura')
  await page.evaluate(() => document.querySelector('#cosCusto').scrollIntoView({ block: 'start' }))
  await foto('costura-antes')
  const total0 = await page.evaluate(() => window.__frayz.Col.ativos().length)
  await clique('#btnCosturar')
  await page.waitForSelector('#casulo:not([hidden])')
  confere((await page.locator('#casPartes .cas-parte.fechada').count()) === 5, 'casulo abre com 5 partes fechadas')
  const ordem = await page.evaluate(() => [...document.querySelectorAll('#casPartes .cas-parte')].map((e) => e.dataset.slot))
  const ordemMotor = await page.evaluate(() => window.__frayz.P.PARAMS_COSTURA.ordemDeRevelacao)
  confere(JSON.stringify(ordem) === JSON.stringify(ordemMotor), 'casulo segue a ordem do motor: ' + ordem.join(' > '))
  // tocar numa parte fora de ordem não abre
  await clique('#casPartes .cas-parte[data-k="3"]')
  confere((await page.locator('#casPartes .cas-parte.aberta').count()) === 0, 'parte fora de ordem não abre')
  await clique('#casPartes .cas-parte[data-k="0"]')
  await page.waitForSelector('#casPartes .cas-parte.aberta')
  confere((await page.locator('#casPartes .cas-parte.aberta').count()) === 1 && (await page.locator('#casPartes .cas-parte.fechada').count()) === 4, 'tocar abre UMA parte (a primeira da ordem)')
  await foto('casulo-abrindo')
  await conferirTela('casulo', '#casulo')
  confere((await foraDaTela(page, ['#casulo .folha', '#btnCasAbrir', '#btnCasTudo'])).length === 0, 'casulo cabe na janela')
  for (let i = 0; i < 30 && (await page.locator('#casPartes .cas-parte.aberta').count()) < 2; i++) { await clique('#btnCasAbrir'); await page.waitForTimeout(300) } // o clique durante a abertura é ignorado
  confere((await page.locator('#casPartes .cas-parte.aberta').count()) === 2, 'o botão "Abrir próxima parte" abre a seguinte')
  await clique('#btnCasTudo')
  await page.waitForSelector('#casFilho:not([hidden])', { timeout: 20000 })
  confere((await page.locator('#casPartes .cas-parte.aberta').count()) === 5, 'abrir tudo revela as 5 partes')
  const sons = await page.evaluate(() => window.__frayz.Som.registro.filter((r) => r[0] === 'casuloParte').map((r) => r[1]))
  confere(JSON.stringify(sons.slice(-5)) === '[0,1,2,3,4]', 'tique do casulo cresce com a posição: ' + JSON.stringify(sons.slice(-5)))
  const filhoId = await page.locator('#casFilho').getAttribute('data-id')
  const filho = await page.evaluate((id) => { const Col = window.__frayz.Col; const b = Col.obter(id); return { aberto: b.casulo.aberto, nome: window.__frayz.P.fichaDoBoneco(b).nome, pais: b.pais, geracao: b.geracao, pode: Col.podeLutar(b).ok, total: Col.ativos().length, voltas: [Col.obter('mordedor').voltasUsadas, Col.obter('pisoteador').voltasUsadas] } }, filhoId)
  confere(filho.aberto && filho.total === total0 + 1, `filho entrou na coleção (${total0} → ${filho.total}), geração ${filho.geracao}`)
  confere(/\S+-\S+-\S+/.test(await page.locator('#casFilho h3').textContent()) && (await page.locator('#casFilho h3').textContent()) === filho.nome, 'nome montado pelas partes: ' + filho.nome)
  confere(filho.pode && JSON.stringify(filho.pais) === '["mordedor","pisoteador"]' && filho.voltas[0] === 1 && filho.voltas[1] === 1, 'filho pode lutar; pais gastaram 1 volta do Carretel')
  await foto('filho')
  confere((await foraDaTela(page, ['#casulo .folha', '#btnCasFim'])).length === 0, 'filho: nada fora da janela')
  await clique('#btnCasFim')
  await page.waitForSelector('#bonecoModal:not([hidden])')
  confere(/Árvore da família/.test(await page.locator('#bonecoCorpo').textContent()) && (await page.locator('#fcArvore .arv-item').count()) >= 3, 'ficha do filho mostra a árvore da família (filho + 2 pais)')
  await page.keyboard.press('Escape')
  // recusa por Carretel cheio, pelo motor
  const cheio = await page.evaluate(() => { const Col = window.__frayz.Col, P = window.__frayz.P; let b = Col.obter('mordedor'); for (let i = 0; i < 6; i++) { b = { ...b, voltasUsadas: Math.min(5, (b.voltasUsadas ?? 0) + 1) } } return P.podeCosturar(b, Col.obter('embolado')) })
  confere(!cheio.ok && cheio.codigo === 'CARRETEL_CHEIO', 'Carretel cheio: o motor recusa (' + cheio.motivo + ')')

  // ============================================================ AVENTURA
  await abrir('aventura')
  confere((await page.locator('#avMapa .av-estacao').count()) === 5, 'mapa tem 5 fases')
  confere((await page.locator('#avMapa .av-estacao:disabled').count()) === 4, 'só a fase 1 está liberada no começo')
  await foto('aventura-mapa')
  confere((await foraDaTela(page, ['#avMapa .av-estacao', '#btnJogarFase', '#avSlots', '#cab', '#abas'])).length === 0, 'aventura: mapa e botão dentro da janela')
  confere(await page.locator('#btnJogarFase').isDisabled(), 'Jogar fase desligado sem time')
  // TAREFA 18: energia à vista (o número vem da ponte: P.energia)
  const en0 = await page.evaluate(() => window.__frayz.P.energia())
  const txtEn0 = (await page.locator('#avEnergia').textContent()).replace(/\s+/g, ' ')
  confere(new RegExp(`Energia ${en0.atual}/${en0.maximo}`).test(txtEn0) && /recarrega às \d\d:\d\d/.test(txtEn0) && en0.atual === en0.maximo, 'Aventura mostra a energia cheia e quando recarrega: ' + txtEn0)
  for (const id of ['pisoteador', 'desfiado', 'assombrado']) await clique(`#avTime .mini-cartao[data-id=${id}]`)
  confere(await page.locator('#btnJogarFase').isEnabled(), 'Jogar fase liga com 3 bonecos')
  await conferirTela('aventura', '#aventura')
  await clique('#btnJogarFase')
  await page.waitForSelector('#luta:not([hidden])')
  let vistaIntencao = false, fotoInt = false, jogadasTotal = 0
  const lutarAteOFim = async () => {
    let jogadas = 0
    for (let passo = 0; passo < 400; passo++) {
      await page.waitForFunction(() => window.__frayz.livre() || window.__frayz.acabou(), null, { timeout: 90000 })
      if (await page.evaluate(() => window.__frayz.acabou())) break
      await page.waitForSelector('#intencao:not([hidden])', { timeout: 15000 })
      const it = await page.evaluate(() => ({ txt: document.querySelector('#intencao').textContent, dados: window.__frayz.intencao(), balao: !!window.__frayz.arena.intencao }))
      if (!vistaIntencao && /vai (atacar|usar|passar|trocar|descartar)/.test(it.txt)) {
        vistaIntencao = true
        confere(true, 'intenção do rival visível: "' + it.txt.replace(/\s+/g, ' ').trim() + '"')
        confere(!/atacar/.test(it.txt) || it.balao, 'balão da intenção desenhado sobre o inimigo')
      }
      if (!fotoInt && /atacar/.test(it.txt)) { fotoInt = true; await page.waitForTimeout(250); await foto('aventura-intencao') }
      const cmd = await page.evaluate(() => window.__frayz.sugestao())
      if (!cmd) break
      if (cmd.tipo === 'jogar') {
        await escolherCarta(cmd.carta)
        await page.waitForFunction((cid) => window.__frayz.S.sel === cid || !window.__frayz.livre(), cmd.carta, { timeout: 4000 })
        if (await page.evaluate((cid) => window.__frayz.S.sel === cid, cmd.carta)) {
          if (cmd.alvo) { const pos = await page.evaluate((id) => window.__frayz.pagina(id), cmd.alvo); await toque(pos.x, pos.y) } else await escolherCarta(cmd.carta)
        }
      } else if (cmd.tipo === 'fiapo') await escolherCarta(cmd.carta)
      else if (cmd.tipo === 'trocar') { await clique('#btnTrocar'); for (const id of [cmd.a, cmd.b]) { const pos = await page.evaluate((x) => window.__frayz.pagina(x), id); await toque(pos.x, pos.y); await page.waitForTimeout(40) } }
      else await clique('#btnPassar')
      jogadas++
      if (passo === 2) {
        const fora = await foraDaTela(page, ['#topo', '#topo > *', '#banda', '#roda', '#btnPassar', '#btnTrocar', '#arena', '#baixo', '#info', '#intencao'])
        confere(fora.length === 0, 'aventura em luta: nada importante fora da janela' + (fora.length ? ' → ' + fora.join('; ') : ''))
        const sobra = await page.evaluate(() => { const l = document.querySelector('#luta'); return l.scrollHeight - l.clientHeight })
        confere(sobra <= 1, 'aventura em luta cabe na altura da janela')
      }
    }

    await page.waitForSelector('#fim:not([hidden])', { timeout: 30000 })
    jogadasTotal += jogadas
    return jogadas
  }
  confere((await page.evaluate(() => window.__frayz.P.energia().atual)) === en0.maximo - 1, 'abrir a luta da Aventura gastou energia (a ponte conta)')
  const jogadas = await lutarAteOFim()
  confere(vistaIntencao, `fase 1 jogada até o fim (${jogadas} comandos na 1ª luta) com a intenção visível`)
  const lerFim = () => page.evaluate(() => ({ fim: window.__frayz.estado().fim, col: window.__frayz.Col.aventura(), pontos: ['pisoteador', 'desfiado', 'assombrado'].map((id) => window.__frayz.Col.obter(id).pontosDeCostura), lutas: ['pisoteador', 'desfiado', 'assombrado'].map((id) => window.__frayz.Col.obter(id).lutas) }))
  let fimInfo = await lerFim(), lutasFeitas = 1
  confere(fimInfo.pontos.every((p) => p === 1) && fimInfo.lutas.every((p) => p === 1), 'a luta chamou registrarLuta nos 3 bonecos usados (Pontos de Costura 1, lutas 1)')
  if (fimInfo.fim.vencedor !== 'A') {
    confere(fimInfo.col.liberada === 1 && fimInfo.col.vencidas.length === 0, 'derrota NÃO libera a fase 2')
    await foto('aventura-derrota')
    while (fimInfo.fim.vencedor !== 'A' && lutasFeitas < 8) { // revanche até vencer (a semente da revanche é nova)
      await clique('#btnRevanche'); await page.waitForSelector('#luta:not([hidden])'); await lutarAteOFim(); lutasFeitas++; fimInfo = await lerFim()
    }
    confere(fimInfo.pontos.every((p) => p === lutasFeitas), `cada luta gasta 1 Ponto de Costura (${lutasFeitas} lutas, pontos ${fimInfo.pontos})`)
  }
  confere(fimInfo.fim.vencedor === 'A', `venceu a fase 1 em ${lutasFeitas} luta(s)`)
  confere(fimInfo.col.liberada === 2 && fimInfo.col.vencidas.includes(1), 'vitória libera a fase 2')
  confere(!(await page.locator('#fimHeroi').isHidden()) && /Golpe final/.test(await page.locator('#fimHeroi').textContent()), 'vitória mostra o boneco do golpe final em destaque: ' + (await page.locator('#fimHeroi').textContent()))
  confere(await page.locator('#btnProxima').isVisible(), 'vitória oferece a próxima fase')
  // TAREFA 21: festa da fase nova (antes dos botões): "Fase 2 liberada" e a silhueta do próximo rival
  const lib = await page.evaluate(() => { const b = document.querySelector('#fimLiberada'); if (!b) return null; const r = b.getBoundingClientRect(), bt = document.querySelector('#fimBotoes').getBoundingClientRect(); return { txt: b.textContent.replace(/\s+/g, ' '), antes: r.bottom <= bt.top + 1, sil: !!b.querySelector('.fz-fim__silhueta .fz-boneco, .fz-fim__misterio') } })
  await page.waitForTimeout(500)
  const libTxt = lib && (await page.locator('#fimLiberada').textContent()).replace(/\s+/g, ' ')
  confere(!!lib && /Fase ?2 ?liberada/.test(libTxt) && /depois vem/.test(libTxt) && /Cesto de Retalhos/.test(libTxt) && lib.sil && lib.antes, 'vitória na Aventura: "Fase 2 liberada" e "depois vem…" com a silhueta, antes dos botões: ' + (libTxt ?? 'nada'))
  const foraFimAv = await foraDaTela(page, ['.fim-folha', '#btnRevanche', '#btnProxima', '#btnTrocarTime', '#btnCopiar'])
  confere(foraFimAv.length === 0, 'tela do fim da Aventura: nada fora da janela' + (foraFimAv.length ? ' → ' + foraFimAv.join('; ') : ''))
  await foto('aventura-fim')
  confere(/mapa/.test(await page.locator('#btnTrocarTime').textContent()), 'fim da Aventura oferece "Voltar ao mapa"')
  await page.waitForTimeout(900)
  await foto('aventura-vitoria')
  if (fmt.nome === 'pc') await fotoEncaixe(page, 'vitoria-aventura-pc')
  // mudo
  const antesSom = await page.evaluate(() => window.__frayz.Som.registro.length)
  confere(antesSom > 5, `os sons foram pedidos durante a luta (${antesSom} eventos de som)`)
  await clique('#btnTrocarTime')
  await page.waitForSelector('#aventura:not([hidden])')
  confere((await page.locator('#avMapa .av-estacao:disabled').count()) === 3 && (await page.locator('#avMapa .av-estacao.vencida').count()) === 1, 'mapa mostra a fase 1 vencida e a 2 liberada')
  const en1 = await page.evaluate(() => window.__frayz.P.energia())
  confere(en1.atual === en0.maximo - lutasFeitas && (await page.locator('#avEnergia').textContent()).includes(`Energia ${en1.atual}/${en1.maximo}`), `cada luta aberta gastou 1 de energia e a tela mostra (${en1.atual}/${en1.maximo} depois de ${lutasFeitas} luta(s))`)
  // sem energia: a luta não abre e a tela explica quando volta (sem punir)
  await page.evaluate(() => { localStorage.setItem('frayz_energia', JSON.stringify({ dia: Math.floor(Date.now() / 86400000), gasta: 999 })); window.__frayz.irParaAba('aventura') })
  const semEn = { botao: await page.locator('#btnJogarFase').isDisabled(), rotulo: (await page.locator('#btnJogarFase').textContent()).replace(/\s+/g, ' '), etiqueta: (await page.locator('#avEnergia').textContent()).replace(/\s+/g, ' ') }
  confere(semEn.botao && /Sem energia/.test(semEn.rotulo) && /volta inteira às \d\d:\d\d/.test(semEn.etiqueta), `sem energia: Jogar desligado e a tela diz quando volta ("${semEn.rotulo.trim()}" · "${semEn.etiqueta.trim()}")`)
  await page.locator('#btnJogarFase').click({ force: true }).catch(() => {})
  confere(await page.locator('#luta').isHidden(), 'sem energia a luta não abre')
  await page.evaluate(() => { localStorage.removeItem('frayz_energia'); window.__frayz.irParaAba('aventura') })
  await clique('#btnMudo')
  confere((await page.locator('#btnMudo').getAttribute('aria-pressed')) === 'true' && await page.evaluate(() => window.__frayz.Som.estaMudo()), 'botão de mudo liga o mudo')
  confere(await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('frayz_som') || 'null')?.mudo === true } catch { return false } }), 'mudo fica guardado')
  await clique('#btnMudo')
  confere(!(await page.evaluate(() => window.__frayz.Som.estaMudo())), 'botão de mudo desliga o mudo')
  // aventura: "Menos animação" não tira o som
  confere(true, 'som independe de "Menos animação" (só o visual muda)')

  // ============================================================ LUTA LIVRE: mão com mais cartas deixa isso claro
  await abrir('inicio')
  for (const id of ['pisoteador', 'desfiado', 'assombrado']) await clique(`.ficha[data-id=${id}]`)
  await clique('#btnLutar')
  await page.waitForSelector('#luta:not([hidden])')
  await page.waitForFunction(() => window.__frayz.livre(), null, { timeout: 60000 })
  if (fmt.toque) {
    const mais = await page.evaluate(() => { const mb = document.querySelector('#maoBox'); return { rola: mb.scrollWidth > mb.clientWidth + 4, mostra: !document.querySelector('#maoMais').hidden, sombra: document.querySelector('#maoWrap').classList.contains('mais-dir') } })
    confere(!mais.rola || (mais.mostra && mais.sombra), `celular: mão que rola mostra "mais ›" e sombra (rola=${mais.rola})`)
  }
  await clique('#btnMenu')
  confere(await page.locator('#btnMudo2').isVisible(), 'menu da luta tem o botão de som')
  await page.keyboard.press('Escape')
  const intLivre = await page.evaluate(() => document.querySelector('#intencao').hidden)
  confere(intLivre, 'luta livre NÃO mostra a intenção do rival (só a Aventura)')

  // ============================================================ PC: cabeçalho não cobre as fichas ao rolar
  await abrir('inicio')
  const sobrepoe = await page.evaluate(() => {
    const corpo = document.querySelector('#inicio .ini-corpo'); corpo.scrollTop = 140
    const cab = document.querySelector('#abas').getBoundingClientRect(), cr = corpo.getBoundingClientRect()
    return { cabBaixo: cab.bottom, corpoTopo: cr.top }
  })
  confere(sobrepoe.cabBaixo <= sobrepoe.corpoTopo + 0.5, `cabeçalho e abas ficam acima da lista (abas até ${Math.round(sobrepoe.cabBaixo)}, lista começa em ${Math.round(sobrepoe.corpoTopo)})`)
  await page.evaluate(() => { document.querySelector('#inicio .ini-corpo').scrollTop = 0 })
  await foto('luta-livre')
  await conferirTela('luta livre', '#inicio')
  confere((await foraDaTela(page, ['#cab', '#abas', '.aba', '#btnLutar', '#timeEscolhido'])).length === 0, 'luta livre: cabeçalho, abas e botão dentro da janela')

  confere(erros.length === 0, 'nenhum erro no console' + (erros.length ? ' → ' + erros.slice(0, 5).join(' | ') : ''))
  await ctx.close()
}

/** Foto reduzida para tests/tela/fotos/encaixe/ (densidade 1, < 400 KB; PNG de 256 cores quando passa). */
async function fotoEncaixe(page, nome) {
  const arq = path.join(FOTOS, 'encaixe', nome + '.png')
  await page.screenshot({ path: arq })
  if (fs.statSync(arq).size > 400 * 1024) { try { execFileSync('convert', [arq, '-dither', 'None', '-colors', '256', 'PNG8:' + arq]) } catch { /* sem ImageMagick */ } }
  const kb = fs.statSync(arq).size / 1024
  confere(kb < 400, `foto encaixe/${nome}.png (${kb.toFixed(0)} KB)`)
}

// ============================================================ TAREFA 21: consertos da rodada de conferência (cada bug com a sua conferência)
const COBRE = (rects, caixa) => Object.entries(rects).filter(([, q]) => Math.min(caixa.right, q.x + q.w) - Math.max(caixa.left, q.x) > 2 && Math.min(caixa.bottom, q.y + q.h) - Math.max(caixa.top, q.y) > 2).map(([id]) => id)
/** O aviso do rival e o bastidor não cobrem nenhum boneco (corpo + placa + nome do lugar embaixo). */
async function naoCobre(page) {
  return page.evaluate(() => {
    const a = window.__frayz.arena, cv = document.querySelector('#arena').getBoundingClientRect(), r = a.retangulos(), out = {}
    for (const [id, q] of Object.entries(r)) out[id] = { x: cv.left + q.x, y: cv.top + q.y, w: q.w, h: q.h }
    const caixa = (s) => { const e = document.querySelector(s); if (!e || e.hidden || e.offsetParent === null) return null; const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom } }
    return { bonecos: out, intencao: caixa('#intencao'), roda: caixa('#roda .fz-bastidor') }
  })
}

async function consertos21(fmt) {
  console.log(`\n=== tarefa 21 · ${fmt.nome} (${fmt.w}x${fmt.h}) ===`)
  const ctx = await browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1 })
  const erros = [], pedidosRuins = []
  const vigiar = (p) => { p.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()) }); p.on('pageerror', (e) => erros.push('erro de página: ' + e.message)); p.on('response', (r) => { if (r.status() >= 400) pedidosRuins.push(r.status() + ' ' + r.url()) }) }
  const page = await ctx.newPage(); vigiar(page)
  const URL0 = `${base}/public/?teste=1&vel=0.12&semente=t21`
  const abrir = async (aba, extra = '') => { await page.goto(`${URL0}&recomecar=1&aba=${aba}${extra}`); await page.waitForSelector(`#${aba}:not([hidden])`) }
  const clique = async (sel) => (fmt.toque ? page.locator(sel).first().tap() : page.locator(sel).first().click())
  const energia = () => page.evaluate(() => window.__frayz.P.energia().atual)
  let custo = 1, en0 = null, en1 = null
  /** Cada conserto numa seção: se uma quebrar (exceção), as outras ainda conferem. */
  const secao = async (nome, fn) => { try { await fn() } catch (e) { falha(`${fmt.nome} · ${nome}: exceção → ${String(e?.message ?? e).split('\n')[0].slice(0, 160)}`) } }

  await secao('10. favicon próprio (sem 404)', async () => {
    // ---- 10. favicon próprio (sem 404)
    await abrir('aventura')
    const fav = await page.evaluate(async () => { const l = document.querySelector('link[rel=icon]'); if (!l) return null; const r = await fetch(l.href); return { s: r.status, t: r.headers.get('content-type'), svg: /<svg/.test(await r.text()) } })
    confere(!!fav && fav.s === 200 && /svg/.test(fav.t) && fav.svg, 'favicon próprio (SVG desenhado em código) responde 200: ' + JSON.stringify(fav))
  })
  await secao('11. o botão da Aventura diz o custo ANTES do toque', async () => {
    // ---- 11. o botão da Aventura diz o custo ANTES do toque
    for (const id of ['pisoteador', 'desfiado', 'assombrado']) await clique(`#avTime .mini-cartao[data-id=${id}]`)
    custo = await page.evaluate(() => window.__frayz.P.custoDeEnergia?.() ?? 1)
    const rot = (await page.locator('#btnJogarFase').textContent()).replace(/\s+/g, ' ')
    confere(new RegExp(`Jogar fase 1.*gasta ${custo} energia`).test(rot), `"Jogar fase 1" mostra o custo antes do toque: "${rot.trim()}"`)
  })
  await secao('13. o 4º boneco avisa quem saiu', async () => {
    // ---- 13. o 4º boneco avisa quem saiu
    await page.evaluate(() => { window.__frayz.avisos.length = 0 })
    await clique('#avTime .mini-cartao[data-id=mordedor]')
    const av4 = await page.evaluate(() => window.__frayz.avisos.slice())
    confere(av4.some((t) => /saiu do time/.test(t)), 'escolher um 4º boneco avisa quem saiu: ' + av4.join(' | '))
    await clique('#avTime .mini-cartao[data-id=mordedor]'); await clique('#avTime .mini-cartao[data-id=pisoteador]')
    await page.evaluate(() => { const ids = ['pisoteador', 'desfiado', 'assombrado']; window.__frayz.Col.definirTimeAventura(ids); window.__frayz.irParaAba('aventura') })
  })
  await secao('2. cliques rápidos em "Jogar fase" gastam UMA energia', async () => {
    // ---- 2. cliques rápidos em "Jogar fase" gastam UMA energia
    en0 = await energia()
    await page.evaluate(async () => { const b = document.querySelector('#btnJogarFase'); for (let i = 0; i < 3; i++) { b.click(); await new Promise((ok) => setTimeout(ok, 40)) } }) // como dedos rápidos: 3 toques em 120 ms
    await page.waitForSelector('#luta:not([hidden])')
    await page.waitForFunction(() => window.__frayz.livre(), null, { timeout: 60000 })
    await page.waitForTimeout(300)
    en1 = await energia()
    confere(en1 === en0 - custo, `3 cliques rápidos em "Jogar fase" gastam ${custo} energia, não 3 (${en0} → ${en1})`)
  })
  await secao('8. o aviso do rival e o bastidor não cobrem bonecos nem os nomes dos l', async () => {
    // ---- 8. o aviso do rival e o bastidor não cobrem bonecos nem os nomes dos lugares
    await page.waitForSelector('#intencao:not([hidden])', { timeout: 15000 })
    if (fmt.nome === 'pc') {
      const m = await naoCobre(page)
      confere(m.intencao && COBRE(m.bonecos, m.intencao).length === 0, 'PC: o aviso "O rival vai…" não cobre bonecos nem FRENTE/MEIO/TRÁS' + (m.intencao ? ' → ' + COBRE(m.bonecos, m.intencao).join(',') : ''))
      confere(m.roda && COBRE(m.bonecos, m.roda).length === 0, 'PC: o bastidor não cobre bonecos' + (m.roda ? ' → ' + COBRE(m.bonecos, m.roda).join(',') : ''))
    }
  })
  await secao('13. toques de 44 px no menu da luta', async () => {
    // ---- 13. toques de 44 px no menu da luta
    await clique('#btnMenu')
    const menu = await page.evaluate(() => [...document.querySelectorAll('#menu button:not([hidden]), #menu label')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || e.className, w: Math.round(r.width), h: Math.round(r.height) } }))
    confere(menu.length >= 3 && menu.every((x) => x.w >= 44 && x.h >= 44), 'itens do menu da luta com pelo menos 44 px: ' + menu.map((x) => `${x.id} ${x.w}x${x.h}`).join('; '))
    await page.keyboard.press('Escape')
  })
  await secao('3. recarregar no meio da luta da Aventura (modo local): a luta e a ene', async () => {
    // ---- 3. recarregar no meio da luta da Aventura (modo local): a luta e a energia continuam
    await clique('#btnPassar')
    await page.waitForFunction(() => window.__frayz.livre() || window.__frayz.acabou(), null, { timeout: 60000 })
    const antes = await page.evaluate(() => ({ n: window.__frayz.estado().comandos.length, turno: window.__frayz.estado().turno, semente: window.__frayz.estado().semente }))
    await page.goto(`${URL0}&aba=aventura`) // sem recomeçar: como o jogador apertando F5
    await page.waitForSelector('#luta:not([hidden])', { timeout: 20000 })
    await page.waitForFunction(() => window.__frayz.livre() || window.__frayz.acabou(), null, { timeout: 60000 })
    const depois = await page.evaluate(() => ({ n: window.__frayz.estado().comandos.length, turno: window.__frayz.estado().turno, semente: window.__frayz.estado().semente, modo: window.__frayz.S.modo, fase: window.__frayz.S.fase }))
    confere(depois.semente === antes.semente && depois.n >= antes.n && depois.turno >= antes.turno && depois.modo === 'aventura' && depois.fase === 1 && (await energia()) === en1,
      `recarregar a página volta à MESMA luta da Aventura, sem gastar energia (comandos ${antes.n} → ${depois.n}, energia ${await energia()})`)
  })
  await secao('9. Voltar do navegador na luta pergunta antes de sair; 12. "Sair da lu', async () => {
    // ---- 9. Voltar do navegador na luta pergunta antes de sair; 12. "Sair da luta" na Aventura diz que é derrota
    await page.goBack()
    await page.waitForSelector('#confirma', { timeout: 5000 }).catch(() => {})
    const naLuta = await page.evaluate(() => ({ luta: !document.querySelector('#luta').hidden, conf: document.querySelector('#confirma')?.textContent ?? '', url: location.pathname }))
    confere(naLuta.luta && /derrota/.test(naLuta.conf) && /energia/.test(naLuta.conf) && naLuta.url.endsWith('/public/'), 'Voltar do navegador na luta não sai do site: pergunta (derrota, energia já gasta): ' + naLuta.conf.replace(/\s+/g, ' ').slice(0, 80))
    await clique('#btnConfirmaNao')
    confere(await page.locator('#luta').isVisible() && (await page.locator('#confirma').count()) === 0, '"Continuar lutando" fica na luta')
    await clique('#btnMenu'); await clique('#btnSair')
    await page.waitForSelector('#confirma')
    confere(/conta como derrota e a energia desta luta já foi gasta/.test(await page.locator('#confirma').textContent()), '"Sair da luta" na Aventura pede confirmação com a frase certa')
    await clique('#btnConfirmaSim')
    await page.waitForSelector('#aventura:not([hidden])')
    const saiu = await page.evaluate(() => ({ luta: window.__frayz.P.lutaAberta(), pontos: window.__frayz.Col.obter('pisoteador').pontosDeCostura, lib: window.__frayz.Col.aventura().liberada }))
    confere(!saiu.luta && saiu.pontos === 1 && saiu.lib === 1 && (await energia()) === en1, `sair conta como derrota: nada para retomar, 1 luta registrada, fase 1 ainda liberada, energia não volta (${JSON.stringify(saiu)})`)
    // Voltar no hub: a aba anterior
    await clique('#abaCostura'); await page.waitForSelector('#costura:not([hidden])')
    await clique('#abaMural'); await page.waitForSelector('#mural:not([hidden])')
    await page.goBack(); await page.waitForSelector('#costura:not([hidden])', { timeout: 5000 }).catch(() => {})
    confere(await page.locator('#costura').isVisible(), 'Voltar do navegador no hub volta à aba anterior (Mural → Costura)')
  })
  await secao('1. Costura: Esc no meio da abertura não quebra; o casulo fica pendente', async () => {
    // ---- 1. Costura: Esc no meio da abertura não quebra; o casulo fica pendente; o casulo tem X
    await abrir('costura')
    await clique('#cosEscolha .mini-cartao[data-id=mordedor]')
    await clique('#cosEscolha .mini-cartao[data-id=pisoteador]')
    await page.waitForSelector('#cosChances')
    // 13. celular: custo e Carretel logo acima do botão, visíveis sem rolar
    const res = await page.evaluate((celular) => { const r = document.querySelector('#cosResumo'), b = document.querySelector('#btnCosturar').getBoundingClientRect(), q = r.getBoundingClientRect(), c = document.querySelector('#cosCusto').getBoundingClientRect(); return { txt: r.textContent, visivel: !r.hidden && q.top >= 0 && q.bottom <= innerHeight && (!celular || q.bottom <= b.top + 1), custoNaTela: c.top >= 0 && c.bottom <= innerHeight } }, fmt.toque)
    confere(res.visivel && /Custo/.test(res.txt) && /Carretel/.test(res.txt) && res.custoNaTela, `custo e Carretel logo acima de "Costurar", sem rolar ("${res.txt}")`)
    await clique('#btnCosturar')
    await page.waitForSelector('#casulo:not([hidden])')
    confere(await page.locator('#casFechar').isVisible(), 'o casulo tem botão X')
    await clique('#btnCasAbrir')
    await page.waitForTimeout(60)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1500)
    const pend = await page.evaluate(() => ({ fechado: document.querySelector('#casulo').hidden, pendente: document.querySelectorAll('#cosPrevia .cos-pendente').length, casulos: window.__frayz.Col.casulosFechados().length }))
    confere(pend.fechado && pend.pendente === 1 && pend.casulos === 1, 'Esc no meio da abertura fecha sem erro e o casulo fica pendente: ' + JSON.stringify(pend))
    confere(!erros.some((e) => /reading 'i'/.test(e)), 'nenhum "Cannot read properties of null (reading \'i\')"')
    await clique('#cosPrevia .cos-pendente button')
    await page.waitForSelector('#casulo:not([hidden])')
    await clique('#btnCasAbrir'); await page.waitForTimeout(40)
    await clique('#casFechar') // fechar pelo X também no meio
    await page.waitForTimeout(1500)
    confere(await page.locator('#casulo').isHidden() && (await page.locator('#cosPrevia .cos-pendente').count()) === 1, 'X no meio da abertura também deixa o casulo pendente')
  })
  await secao('6. ferramentas do protótipo só com ?teste=1', async () => {
    // ---- 6. ferramentas do protótipo só com ?teste=1
    await page.goto(`${base}/public/?aba=colecao`) // a mesma coleção do aparelho, sem o modo de teste
    await page.waitForSelector('#colecao:not([hidden]) .ficha')
    await page.locator('#colLista .ficha[data-id=rasgao]').first().click({ force: true })
    await page.waitForSelector('#bonecoModal:not([hidden])')
    const proto = await page.evaluate(() => ({ det: document.querySelectorAll('#bonecoCorpo details.proto').length, txt: /registrarLuta/.test(document.querySelector('#bonecoCorpo').textContent) }))
    confere(proto.det === 0 && !proto.txt, 'sem ?teste=1 a ficha não mostra as ferramentas de protótipo nem "registrarLuta"')
    await page.keyboard.press('Escape')
    confere(/^\d+ bonecos ·/.test(await page.locator('#colResumo').textContent()), 'resumo da coleção com plural: ' + (await page.locator('#colResumo').textContent()))
  })
  await secao('4. duas abas (modo local): a aba velha não grava por cima da nova', async () => {
    // ---- 4. duas abas (modo local): a aba velha não grava por cima da nova
    await abrir('colecao')
    const outra = await ctx.newPage(); vigiar(outra)
    await outra.goto(`${URL0}&aba=colecao`); await outra.waitForSelector('#colecao:not([hidden])')
    await outra.evaluate(async () => { const Col = window.__frayz.Col; Col.envelhecerDemo('mordedor', 2000); const r = await Col.aposentar('mordedor'); if (!r.ok) throw new Error(r.motivo) })
    await page.waitForFunction(() => window.__frayz.Col.obter('mordedor').estado === 'aposentado', null, { timeout: 5000 }).catch(() => {})
    const velha = await page.evaluate(async () => { const Col = window.__frayz.Col; const r = await Col.costurar('mordedor', 'embolado'); return { viu: Col.obter('mordedor').estado, costurou: r.ok, mural: Col.mural().length, aviso: window.__frayz.avisos.some((t) => /outra aba/.test(t)) } })
    const gravado = await page.evaluate(() => { const g = JSON.parse(localStorage.getItem('frayz_colecao_v1')); return { estado: g.bonecos.mordedor.estado, mural: g.mural.length } })
    confere(velha.viu === 'aposentado' && !velha.costurou && velha.mural === 1 && velha.aviso, 'a aba velha recarrega quando a outra grava e avisa: ' + JSON.stringify(velha))
    confere(gravado.estado === 'aposentado' && gravado.mural === 1, 'o que a aba nova gravou continua gravado: ' + JSON.stringify(gravado))
    await outra.close()
  })
  await secao('14. peso do golpe: tremida no forte e no crítico; marca de vantagem ju', async () => {
    // ---- 14. peso do golpe: tremida no forte e no crítico; marca de vantagem junto do número; nada disso com "Menos animação"
    await abrir('inicio')
    for (const id of ['pisoteador', 'desfiado', 'assombrado']) await clique(`.ficha[data-id=${id}]`)
    await clique('#btnLutar')
    await page.waitForFunction(() => window.__frayz.livre(), null, { timeout: 60000 })
    const golpe = await page.evaluate(async () => {
      const F = window.__frayz, a = F.arena, v = F.P.visao(F.estado()), P = F.P
      const alvo = v.times.B.lugares[0], de = v.times.A.lugares[0], tipoAlvo = v.bonecos[alvo].tipo
      const carta = Object.keys(P.CARTAS).find((c) => P.temDano(c) && P.vantagem(P.CARTAS[c].tipo, tipoAlvo))
      const t0 = a.tremidas.length, m0 = a.marcasDeGolpe
      a.tocar({ t: 'dano', alvo, de, valor: 40, carta })
      const leve = a.tremidas.length - t0
      a.tocar({ t: 'dano', alvo, de, valor: 120, carta })
      a.tocar({ t: 'dano', alvo, de, valor: 90, critico: true, carta })
      const pesos = a.tremidas.slice(t0).map((x) => x.px), marcas = a.marcasDeGolpe - m0
      const numeros = document.querySelectorAll('#arenaCamada .fz-numero').length, marcaNaTela = document.querySelectorAll('#arenaCamada .fz-arena__marca-golpe').length
      a.menos = true
      const t1 = a.tremidas.length
      a.tocar({ t: 'dano', alvo, de, valor: 90, critico: true, carta })
      const calma = a.tremidas.length - t1
      a.menos = false
      return { leve, pesos, marcas, numeros, marcaNaTela, calma }
    })
    confere(golpe.leve === 0 && JSON.stringify(golpe.pesos) === '[3,6]', `tremida curta: forte 3 px, crítico 6 px, golpe leve nada (${JSON.stringify(golpe)})`)
    confere(golpe.marcas === 3 && golpe.marcaNaTela >= 1 && golpe.numeros >= 3, 'a marca de vantagem aparece junto do número de dano, no mesmo quadro')
    confere(golpe.calma === 0, '"Menos animação": sem tremida no crítico')
  })
  await secao('5. fim da luta: "Maior golpe" diz de quem foi; vitória com o time no Ú', async () => {
    // ---- 5. fim da luta: "Maior golpe" diz de quem foi; vitória com o time no Último Fio diz "venceu por um fio"
    await page.evaluate(() => window.__frayz.passarOsDois())
    await page.waitForSelector('#fim:not([hidden])', { timeout: 90000 })
    await page.evaluate(() => {
      const F = window.__frayz, e = F.estado()
      e.fim = { ...e.fim, vencedor: 'A', pct: { A: 0, B: 0 } }
      for (const id of e.times.A.lugares) { e.bonecos[id].estado = 'fio'; e.bonecos[id].vida = 0 }
      e.bonecos[e.times.A.lugares[2]].estado = 'caido'
      for (const id of e.times.B.lugares) { e.bonecos[id].estado = 'caido'; e.bonecos[id].vida = 0 }
      F.S.stats.maior = { valor: 140, critico: true, de: 'X', carta: 'Golpe', alvo: 'Y', time: 'B' }
      F.refazerFim()
    })
    const fimTxt = (await page.locator('#fimResumo').textContent()).replace(/\s+/g, ' ')
    confere(/Venceu por um fio/.test(fimTxt) && /2 no Último Fio/.test(fimTxt) && !/você 0%/.test(fimTxt), 'vitória com o time no Último Fio: "Venceu por um fio" (nada de 0%): ' + fimTxt)
    confere(/Maior golpe\s*do rival/.test(fimTxt), '"Maior golpe" diz de quem foi (do rival)')
    if (fmt.nome === 'celular') { await page.waitForTimeout(1000); await fotoEncaixe(page, 'fim-por-um-fio') }
    confere((await foraDaTela(page, ['.fim-folha', '#fimResumo', '#btnRevanche'])).length === 0, 'folha do fim (por um fio) cabe na janela')
  })
  await secao('15. Luta livre vencida: os 3 números entram rolando e terminam no valo', async () => {
    // ---- 15. Luta livre vencida: os 3 números entram rolando e terminam no valor certo
    await page.evaluate(() => { const F = window.__frayz; F.S.stats.maior = { valor: 140, time: 'A', carta: 'Golpe' }; F.refazerFim() })
    await page.waitForTimeout(900)
    const nums = await page.evaluate(() => [...document.querySelectorAll('#fimResumo .fz-fim__numero b')].map((b) => b.textContent === b.dataset.valor))
    confere(nums.length === 3 && nums.every(Boolean), 'números da vitória terminam no valor certo depois de rolar')
    confere(/Maior golpe\s*seu/.test((await page.locator('#fimResumo').textContent()).replace(/\s+/g, ' ')), '"Maior golpe" seu')
  })
  await secao('13. Luta livre no celular com os nomes nos bonecos; "Menos animação" c', async () => {
    // ---- 13. Luta livre no celular com os nomes nos bonecos; "Menos animação" com toque de 44 px
    await abrir('inicio')
    const nomes = await page.evaluate(() => [...document.querySelectorAll('#grade .fz-time__nome > span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 8 && getComputedStyle(e).display !== 'none' }).length)
    confere(nomes >= 9, `Luta livre mostra o nome em cada boneco (${nomes})`)
    const opc = await page.evaluate(() => { const r = document.querySelector('#cab .opc').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) } })
    confere(opc.w >= 44 && opc.h >= 44, `"Menos animação" com alvo de toque de 44 px (${opc.w}x${opc.h})`)
  })
  confere(pedidosRuins.length === 0, 'nenhum pedido com erro (favicon incluído)' + (pedidosRuins.length ? ' → ' + pedidosRuins.slice(0, 3).join(' | ') : ''))
  confere(erros.length === 0, 'tarefa 21: nenhum erro no console' + (erros.length ? ' → ' + erros.slice(0, 5).join(' | ') : ''))
  await ctx.close()
}

/** 16. Primeira abertura (?teste=1&primeira=1 força; ?teste=1 sozinho pula): a mesma coleção, o 1º boneco num casulo, e a Aventura aponta "Jogar fase 1". */
async function primeiraAbertura21() {
  console.log('\n=== tarefa 21 · primeira abertura (celular) ===')
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })
  const page = await ctx.newPage(), erros = []
  page.on('pageerror', (e) => erros.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()) })
  await page.goto(`${base}/public/?teste=1&vel=0.12`)
  await page.waitForSelector('#inicio:not([hidden])')
  confere(await page.locator('#casulo').isHidden(), '?teste=1 pula a primeira abertura')
  await page.evaluate(() => { localStorage.clear() })
  await page.goto(`${base}/public/?teste=1&primeira=1&vel=0.12`)
  await page.waitForSelector('#casulo:not([hidden])', { timeout: 15000 })
  const ini = await page.evaluate(() => ({ tit: document.querySelector('#casTit').textContent, partes: document.querySelectorAll('#casPartes .cas-parte.fechada').length, total: window.__frayz.Col.ativos().length }))
  confere(/primeiro boneco/.test(ini.tit) && ini.partes === 5 && ini.total === 9, 'primeira abertura: o 1º boneco num casulo de 5 partes, e a coleção é a mesma de sempre (9): ' + JSON.stringify(ini))
  await page.locator('#btnCasAbrir').tap()
  await page.waitForSelector('#casPartes .cas-parte.aberta')
  await page.waitForTimeout(600)
  await fotoEncaixe(page, 'primeira-abertura-celular')
  await page.locator('#btnCasTudo').tap()
  await page.waitForSelector('#btnCasFim:not([hidden])', { timeout: 20000 })
  confere(/fase 1/i.test(await page.locator('#btnCasFim').textContent()) && (await page.locator('#casPartes .cas-parte.aberta').count()) === 5, 'abriu parte por parte; o botão leva à fase 1')
  await page.locator('#btnCasFim').tap()
  await page.waitForSelector('#aventura:not([hidden])')
  const ap = await page.evaluate(() => ({ aponta: document.querySelector('#btnJogarFase').classList.contains('fz-aponta'), on: !document.querySelector('#btnJogarFase').disabled, txt: document.querySelector('#btnJogarFase').textContent }))
  confere(ap.aponta && ap.on && /Jogar fase 1/.test(ap.txt), 'depois do casulo a Aventura aponta "Jogar fase 1" (time já montado)')
  await page.goto(`${base}/public/?teste=1&primeira=1&vel=0.12`)
  await page.waitForSelector('#hub:not([hidden])'); await page.waitForTimeout(800)
  confere(await page.locator('#casulo').isHidden(), 'a primeira abertura não acontece de novo')
  // "Menos animação": a revelação sem tremida
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('menos_animacao', '1') })
  await page.goto(`${base}/public/?teste=1&primeira=1&vel=0.12`)
  await page.waitForSelector('#casulo:not([hidden])', { timeout: 15000 })
  await page.locator('#btnCasAbrir').tap(); await page.waitForTimeout(40)
  const treme = await page.evaluate(() => [...document.querySelectorAll('#casPartes .cas-parte')].some((p) => p.classList.contains('tremendo') && getComputedStyle(p).animationName !== 'none'))
  confere(!treme, '"Menos animação": a revelação não treme')
  confere(erros.length === 0, 'primeira abertura sem erro no console' + (erros.length ? ' → ' + erros.slice(0, 3).join(' | ') : ''))
  await ctx.close()
}

/** 8. Celular deitado (740×360) e 320 px. */
async function apertados21() {
  console.log('\n=== tarefa 21 · deitado 740x360 e 320 px ===')
  const ctx = await browser.newContext({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })
  const page = await ctx.newPage(), erros = []
  page.on('pageerror', (e) => erros.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()) })
  await page.goto(`${base}/public/?teste=1&recomecar=1&aba=aventura&vel=0.12&semente=t21`)
  await page.waitForSelector('#aventura:not([hidden])')
  await page.evaluate(() => { window.__frayz.Col.definirTimeAventura(['pisoteador', 'desfiado', 'assombrado']); window.__frayz.irParaAba('aventura') })
  await page.locator('#btnJogarFase').tap()
  await page.waitForFunction(() => window.__frayz.livre(), null, { timeout: 60000 })
  await page.waitForSelector('#intencao:not([hidden])', { timeout: 15000 })
  await page.waitForTimeout(400)
  const m = await naoCobre(page)
  confere(m.intencao && COBRE(m.bonecos, m.intencao).length === 0, 'deitado: o aviso "O rival vai…" não cobre bonecos nem os nomes dos lugares' + (m.intencao ? ' → ' + COBRE(m.bonecos, m.intencao).join(',') : ''))
  confere(m.roda && COBRE(m.bonecos, m.roda).length === 0, 'deitado: o bastidor não cobre bonecos' + (m.roda ? ' → ' + COBRE(m.bonecos, m.roda).join(',') : ''))
  const fora = await foraDaTela(page, ['#topo > *:not(#menu)', '#btnPassar', '#btnTrocar', '#intencao'])
  confere(fora.length === 0, 'deitado: nada fora da janela' + (fora.length ? ' → ' + fora.join('; ') : ''))
  await fotoEncaixe(page, 'luta-deitado')
  await page.setViewportSize({ width: 320, height: 640 })
  for (const aba of ['aventura', 'costura', 'colecao']) {
    await page.goto(`${base}/public/?teste=1&recomecar=1&aba=${aba}&vel=0.12`)
    await page.waitForSelector(`#${aba}:not([hidden])`)
    const r = await page.evaluate(() => {
      const som = document.querySelector('#btnMudo').getBoundingClientRect(), opc = document.querySelector('#cab .opc span'), o = opc.getBoundingClientRect()
      const partidos = [...document.querySelectorAll('#avMapa .av-nome')].filter((e) => e.offsetParent !== null).flatMap((e) => {
        const out = [], tx = e.firstChild; if (!tx) return out
        const re = /\S+/g; let mm
        while ((mm = re.exec(tx.textContent))) { const rg = document.createRange(); rg.setStart(tx, mm.index); rg.setEnd(tx, mm.index + mm[0].length); const linhas = new Set([...rg.getClientRects()].map((q) => Math.round(q.top))); if (linhas.size > 1) out.push(mm[0]) }
        return out
      })
      const cx = document.querySelector('#cab .opc input').getBoundingClientRect()
      return { somDentro: som.right <= innerWidth && som.left >= 0, opcInteiro: opc.scrollWidth <= opc.clientWidth + 1 && o.right <= innerWidth && cx.width >= 22, partidos, rolaLado: document.documentElement.scrollWidth > innerWidth + 1 }
    })
    confere(r.somDentro && r.opcInteiro && !r.rolaLado && r.partidos.length === 0, `320 px (${aba}): "Som" dentro da tela, "Menos animação" inteiro, nomes de fase sem quebrar no meio` + (r.partidos.length ? ' → ' + r.partidos.join(', ') : '') + ` ${JSON.stringify(r)}`)
  }
  confere(erros.length === 0, 'deitado e 320 px: nenhum erro no console' + (erros.length ? ' → ' + erros.slice(0, 3).join(' | ') : ''))
  await ctx.close()
}

try {
  if (!process.env.SO_T21) for (const f of FORMATOS) await rodarFormato(f) // SO_T21=1: só as conferências da tarefa 21 (para repetir rápido)
  for (const f of FORMATOS) await consertos21(f)
  for (const t of [primeiraAbertura21, apertados21]) { try { await t() } catch (e) { falha(`${t.name}: exceção → ${String(e?.message ?? e).split('\n')[0].slice(0, 160)}`) } }
} catch (e) {
  falha('exceção no teste: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' / ') : e))
}
await browser.close()
servidor.close()
if (falhas.length) { console.log(`\nFALHOU: ${falhas.length} problema(s)`); process.exit(1) }
console.log('\nTeste de tela 2: verde (' + FORMATOS.map((f) => f.nome).join(' + ') + ')')
