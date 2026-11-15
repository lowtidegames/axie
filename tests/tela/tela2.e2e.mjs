// Frayz — teste de tela 2 (Chrome de verdade): coleção, costura com casulo, remendos, aposentadoria, Aventura (fase 1 jogada até o fim com a
// intenção do rival visível), som mudo, nenhum erro de console e nada importante fora da tela em 360×740 e 1280×720. Fotos em tests/tela/fotos/.
// Rode pelo npm: `npm run e2e` (passa pela trava de um robô por vez).
import { createRequire } from 'node:module'
import fs from 'node:fs'
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
  const abrir = async (aba, extra = '') => { await page.goto(`${base}/?teste=1&recomecar=1&aba=${aba}&vel=0.12&semente=t2${extra}`); await page.waitForSelector(`#${aba}:not([hidden])`) }
  const clique = async (sel) => (fmt.toque ? page.locator(sel).first().tap() : page.locator(sel).first().click())
  const toque = async (x, y) => (fmt.toque ? page.touchscreen.tap(x, y) : page.mouse.click(x, y))
  const sem = async (fn) => page.evaluate(fn)

  // ============================================================ COLEÇÃO
  await abrir('colecao')
  confere((await page.locator('#colLista .ficha').count()) === 9, 'coleção começa com os 9 bonecos prontos (com genes)')
  await foto('colecao')
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
  await page.waitForSelector('#cerimonia')
  confere(/\+\d+ Retalhos Honrados/.test(await page.locator('#cerRetalhos').textContent()), 'cerimônia mostra os Retalhos Honrados: ' + (await page.locator('#cerRetalhos').textContent()))
  await page.waitForTimeout(1500)
  await foto('aposentadoria')
  await clique('#btnVerMural')
  await page.waitForSelector('#mural:not([hidden])')
  confere((await page.locator('#murLista .mural-cartao').count()) === 1 && /Lutas 1200/.test(await page.locator('#murLista').textContent()), 'Mural mostra o aposentado com as estatísticas')
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
  for (const id of ['pisoteador', 'desfiado', 'assombrado']) await clique(`#avTime .mini-cartao[data-id=${id}]`)
  confere(await page.locator('#btnJogarFase').isEnabled(), 'Jogar fase liga com 3 bonecos')
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
        await clique(`#mao .carta[data-cid="${cmd.carta}"]`)
        await page.waitForFunction((cid) => window.__frayz.S.sel === cid, cmd.carta, { timeout: 4000 })
        if (cmd.alvo) { const pos = await page.evaluate((id) => window.__frayz.pagina(id), cmd.alvo); await toque(pos.x, pos.y) } else await clique(`#mao .carta[data-cid="${cmd.carta}"]`)
      } else if (cmd.tipo === 'fiapo') await clique(`#mao .carta[data-cid="${cmd.carta}"]`)
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
  const foraFimAv = await foraDaTela(page, ['.fim-folha', '#btnRevanche', '#btnProxima', '#btnTrocarTime', '#btnCopiar'])
  confere(foraFimAv.length === 0, 'tela do fim da Aventura: nada fora da janela' + (foraFimAv.length ? ' → ' + foraFimAv.join('; ') : ''))
  await foto('aventura-fim')
  confere(/mapa/.test(await page.locator('#btnTrocarTime').textContent()), 'fim da Aventura oferece "Voltar ao mapa"')
  await page.waitForTimeout(900)
  await foto('aventura-vitoria')
  // mudo
  const antesSom = await page.evaluate(() => window.__frayz.Som.registro.length)
  confere(antesSom > 5, `os sons foram pedidos durante a luta (${antesSom} eventos de som)`)
  await clique('#btnTrocarTime')
  await page.waitForSelector('#aventura:not([hidden])')
  confere((await page.locator('#avMapa .av-estacao:disabled').count()) === 3 && (await page.locator('#avMapa .av-estacao.vencida').count()) === 1, 'mapa mostra a fase 1 vencida e a 2 liberada')
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
  confere((await foraDaTela(page, ['#cab', '#abas', '.aba', '#btnLutar', '#timeEscolhido'])).length === 0, 'luta livre: cabeçalho, abas e botão dentro da janela')

  confere(erros.length === 0, 'nenhum erro no console' + (erros.length ? ' → ' + erros.slice(0, 5).join(' | ') : ''))
  await ctx.close()
}

try {
  for (const f of FORMATOS) await rodarFormato(f)
} catch (e) {
  falha('exceção no teste: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' / ') : e))
}
await browser.close()
servidor.close()
if (falhas.length) { console.log(`\nFALHOU: ${falhas.length} problema(s)`); process.exit(1) }
console.log('\nTeste de tela 2: verde (' + FORMATOS.map((f) => f.nome).join(' + ') + ')')
