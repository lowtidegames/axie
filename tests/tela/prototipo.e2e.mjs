// Frayz — teste de tela do protótipo jogável local (Chrome de verdade, Playwright instalado globalmente).
// Sobe server/dev.mjs numa porta livre, joga lutas INTEIRAS clicando (cartas, alvos, botões) em 360×740 (toque) e em 1280×720 (mouse),
// confere erro de console, elementos fora da tela, recusa do motor, limite de flashes, "Menos animação", replay (Rever, copiar, colar)
// e salva fotos em tests/tela/fotos/. Rode pelo npm: `npm run e2e` (passa pela trava de um robô por vez).
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
// time com Rapidez alta (mais críticos) e rival fixo, para a luta ser reproduzível
const TIME = ['pisoteador', 'desfiado', 'assombrado']
const RIVAL = ['rasgao', 'cascudo', 'mudo']
const SEMENTES = ['e2e-a', 'e2e-b', 'e2e-c', 'e2e-d', 'e2e-e', 'e2e-f']

const falhas = []
const falha = (msg) => { falhas.push(msg); console.log('FALHA: ' + msg) }
const confere = (ok, msg) => { if (!ok) falha(msg); else console.log('  ok: ' + msg) }

const servidor = await iniciar({ porta: 0 })
const base = `http://127.0.0.1:${servidor.address().port}`
const browser = await chromium.launch()

async function foto(page, fmt, nome) {
  const arq = path.join(FOTOS, `${fmt.nome}-${nome}.png`)
  await page.screenshot({ path: arq })
  console.log('  foto: ' + path.relative(process.cwd(), arq))
}

/** Tudo o que é importante tem de estar dentro da janela. */
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
  const ctx = await browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'] })
  const erros = []
  let page
  const abrir = async (semente) => {
    if (page) await page.close()
    page = await ctx.newPage()
    page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()) })
    page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
    await page.goto(`${base}/?teste=1&semente=${semente}&rival=${RIVAL.join(',')}&vel=0.12`)
    await page.waitForSelector('.ficha')
  }
  const toque = async (x, y) => (fmt.toque ? page.touchscreen.tap(x, y) : page.mouse.click(x, y))
  const clique = async (sel) => (fmt.toque ? page.locator(sel).first().tap() : page.locator(sel).first().click())
  // carta da mão (leque): no PC um clique na faixa da esquerda (a vizinha cobre a borda direita); no toque a carta amplia e o botão Jogar escolhe
  const carta = (cid) => page.locator(`#mao .fz-carta[data-mao="${cid}"]`)
  const escolherCarta = async (cid) => {
    if (fmt.toque) { await carta(cid).tap({ position: { x: 12, y: 40 } }); await page.locator('.fz-lupa__jogar').tap() }
    else await carta(cid).click({ position: { x: 20, y: 60 } })
  }
  // ENCAIXE (tarefa 11): o boneco novo desenhado na arena, as peças do ateliê presentes e nada do HUD em cima de outra coisa
  const conferirEncaixe = async (onde) => {
    const r = await page.evaluate(() => {
      const a = window.__frayz.arena
      const pintados = a.desenhados // quantos bonecos o último quadro desenhou pelo rig
      const conta = (s) => document.querySelectorAll(s).length
      const caixas = []
      for (const s of ['#tTurno', '#tTesoura', '#tRelogio', '#btnMenu', '#banda', '#roda .fz-bastidor__botao', '#btnTrocar', '#btnPassar', '.fz-arena__placa .fz-fita'])
        for (const e of document.querySelectorAll(s)) { const q = e.getBoundingClientRect(); if (q.width && q.height && getComputedStyle(e).visibility !== 'hidden') caixas.push({ s, q }) }
      const batem = []
      for (let i = 0; i < caixas.length; i++) for (let j = i + 1; j < caixas.length; j++) {
        const A = caixas[i].q, B = caixas[j].q, lx = Math.min(A.right, B.right) - Math.max(A.left, B.left), ly = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top)
        if (lx > 1.5 && ly > 1.5) batem.push(`${caixas[i].s} × ${caixas[j].s}`)
      }
      // texto cortado: rótulos e números do HUD inteiros
      const cortados = [...document.querySelectorAll('#luta .fz-botao__rotulo, #luta .fz-fita__numero, #luta .fz-carreteis__numero, #luta .fz-luta__nome, #tTesoura span')]
        .filter((e) => e.getClientRects().length && (e.scrollWidth > e.clientWidth + 1)).map((e) => e.textContent)
      return { rigs: Object.keys(a.rigs).length, pintados, mao: conta('#mao .fz-mao'), carreteis: conta('#luta .fz-carreteis'), bastidor: conta('#roda .fz-bastidor__botao'), fio: conta('#tRelogio .fz-fio-tempo'), placas: conta('.fz-arena__placa'), botoes: conta('#botoes .fz-botao'), velho: !!document.querySelector('#mao .carta'), batem, cortados }
    })
    confere(r.rigs === 6 && r.pintados === 6, `${onde}: os 6 bonecos novos (rig) desenhados na arena (${r.pintados} no último quadro)`)
    confere(r.mao === 1 && r.carreteis === 2 && r.bastidor === 1 && r.fio === 1 && r.placas === 6 && r.botoes === 2 && !r.velho, `${onde}: peças do ateliê no lugar (mão em leque, 2 carretéis, bastidor, fio do tempo, 6 placas, 2 botões-retalho)`)
    confere(r.batem.length === 0, `${onde}: nenhuma peça do HUD em cima de outra` + (r.batem.length ? ' → ' + r.batem.slice(0, 4).join('; ') : ''))
    confere(r.cortados.length === 0, `${onde}: nenhum texto do HUD cortado` + (r.cortados.length ? ' → ' + r.cortados.slice(0, 4).join('; ') : ''))
  }

  // TAREFA 18: no leque do celular a carta de cima mostra o nome inteiro; as cobertas, um nome abreviado limpo que não passa para baixo da vizinha
  const conferirNomes = async (onde) => {
    const r = await page.evaluate(() => {
      const cartas = [...document.querySelectorAll('#mao .fz-carta')].sort((a, b) => Number(a.dataset.indice) - Number(b.dataset.indice))
      const out = { n: cartas.length, inteiro: null, ruins: [] }
      cartas.forEach((c, i) => {
        const nome = c.querySelector('.fz-carta__nome'), rn = nome.getBoundingClientRect(), rc = c.getBoundingClientRect()
        const prox = cartas[i + 1], escolhida = (c.dataset.estado ?? '').includes('selecionada')
        if (!prox || escolhida) { // a carta de cima (ou a escolhida): o nome inteiro, dentro da carta
          if (!prox) out.inteiro = nome.textContent
          if (nome.dataset.curto != null || nome.scrollWidth > nome.clientWidth + 1 || rn.left < rc.left - 1 || rn.right > rc.right + 1) out.ruins.push(`${nome.textContent} (de cima) cortado`)
        } else if (!(c.classList.contains('fz-carta--coberta') && nome.dataset.curto != null)) out.ruins.push(`${nome.textContent} sem nome abreviado`)
        else {
          const curto = nome.dataset.curto, cheio = nome.textContent
          const limpo = curto === '' || curto === cheio || cheio.startsWith(curto.replace(/\.$/, '')) && (curto.endsWith('.') || cheio.startsWith(curto + ' '))
          const limite = prox.getBoundingClientRect().left + 3
          if (!limpo || (curto && rn.right > limite)) out.ruins.push(`${cheio} → "${curto}" (${Math.round(rn.right)} > ${Math.round(limite)})`)
        }
      })
      return out
    })
    confere(r.n > 0 && r.ruins.length === 0, `${onde}: carta de cima com o nome inteiro ("${r.inteiro}") e as cobertas com nome abreviado limpo (${r.n} cartas)` + (r.ruins.length ? ' → ' + r.ruins.join('; ') : ''))
  }

  await abrir(SEMENTES[0])
  await page.evaluate(() => { try { localStorage.removeItem('menos_animacao') } catch { /* ok */ } })

  // ---------- tela inicial
  confere((await page.locator('.ficha').count()) === 9, 'tela inicial mostra os 9 bonecos prontos')
  confere(await page.locator('#btnLutar').isDisabled(), 'Lutar começa desligado (faltam 3)')
  for (const id of TIME) await clique(`.ficha[data-id=${id}]`)
  confere(await page.locator('#btnLutar').isEnabled(), 'Lutar liga com 3 escolhidos')
  confere((await page.locator('.ficha.on').count()) === 3, 'três fichas marcadas')
  await foto(page, fmt, 'inicio')
  const foraIni = await foraDaTela(page, ['#btnLutar', '#timeEscolhido', '.robo', '.logo'])
  confere(foraIni.length === 0, 'tela inicial: nada importante fora da janela' + (foraIni.length ? ' → ' + foraIni.join('; ') : ''))

  // ---------- luta inteira, clicando
  let semente = SEMENTES[0], viuCritico = false
  for (let tentativa = 0; tentativa < SEMENTES.length; tentativa++) {
    if (tentativa > 0) { semente = SEMENTES[tentativa]; await abrir(semente); for (const id of TIME) await clique(`.ficha[data-id=${id}]`) }
    let parar = false, fotoCritico = false
    const vigia = (async () => { // olho no crítico: tira a foto no instante em que a costura estoura
      let ultimo = 0
      while (!parar) {
        try {
          const n = await page.evaluate(() => window.__frayz.criticos())
          if (n > ultimo) { ultimo = n; if (!fotoCritico) { await page.waitForTimeout(220); await foto(page, fmt, 'critico'); fotoCritico = true } }
        } catch { /* página trocando */ }
        await page.waitForTimeout(30)
      }
    })()
    await clique('#btnLutar')
    await page.waitForSelector('#luta:not([hidden])')
    let jogadas = 0, fotoMeio = false, recusaVista = false
    for (let passo = 0; passo < 400; passo++) {
      await page.waitForFunction(() => window.__frayz.livre() || window.__frayz.acabou(), null, { timeout: 90000 })
      if (await page.evaluate(() => window.__frayz.acabou())) break
      const info = await page.evaluate(() => ({ cmd: window.__frayz.sugestao(), turno: window.__frayz.estado().turno }))
      if (!info.cmd) break
      // 1ª vez: tenta uma carta apagada e confere o aviso de recusa do motor
      const apagada = '#mao .fz-carta:not([data-estado~="jogavel"]):not([data-estado~="fiapo"])'
      if (!recusaVista && await page.locator(apagada).count()) {
        recusaVista = true
        let txt, visivel
        if (fmt.toque) { // tocar amplia a carta: o motivo do motor aparece embaixo dela e o Jogar fica desligado
          await page.locator(apagada).first().tap({ position: { x: 12, y: 40 } })
          await page.waitForSelector('.fz-lupa__motivo', { timeout: 3000 }).catch(() => {})
          txt = ((await page.locator('.fz-lupa__motivo').textContent().catch(() => '')) ?? '').trim(); visivel = await page.locator('.fz-lupa__motivo').isVisible() && await page.locator('.fz-lupa__jogar').isDisabled()
          await page.locator('.fz-lupa__fechar').tap()
        } else { // clicar mostra o motivo numa etiqueta
          await page.locator(apagada).first().click({ position: { x: 20, y: 60 } })
          await page.waitForSelector('#toast .fz-etiqueta', { timeout: 3000 }).catch(() => {})
          txt = ((await page.locator('#toast .fz-etiqueta').last().textContent().catch(() => '')) ?? '').trim(); visivel = await page.locator('#toast .fz-etiqueta').last().isVisible()
        }
        confere(txt.length > 3 && visivel, `carta apagada mostra o motivo do motor: "${txt}"`)
      }
      if (!fotoMeio && info.turno >= 4) { fotoMeio = true; await page.waitForTimeout(150); await foto(page, fmt, 'meio') }
      const c = info.cmd
      if (c.tipo === 'jogar') {
        await escolherCarta(c.carta)
        // escolhida (alvos acesos) — ou já jogada, quando a carta só tinha um jeito e veio do botão Jogar
        await page.waitForFunction((cid) => window.__frayz.S.sel === cid || !window.__frayz.livre(), c.carta, { timeout: 4000 })
        if (await page.evaluate((cid) => window.__frayz.S.sel === cid, c.carta)) {
          if (c.alvo) {
            const pos = await page.evaluate((id) => window.__frayz.pagina(id), c.alvo)
            await toque(pos.x, pos.y)
          } else await escolherCarta(c.carta)
        }
      } else if (c.tipo === 'fiapo') await escolherCarta(c.carta)
      else if (c.tipo === 'trocar') {
        await clique('#btnTrocar')
        for (const id of [c.a, c.b]) { const pos = await page.evaluate((x) => window.__frayz.pagina(x), id); await toque(pos.x, pos.y); await page.waitForTimeout(40) }
      } else await clique('#btnPassar')
      jogadas++
      if (passo === 2) {
        const fora = await foraDaTela(page, ['#topo', '#topo > *', '#banda', '#roda', '#btnPassar', '#btnTrocar', '#arena', '#baixo', '#info'])
        confere(fora.length === 0, 'luta: nada importante fora da janela' + (fora.length ? ' → ' + fora.join('; ') : ''))
        const sobra = await page.evaluate(() => { const l = document.querySelector('#luta'); return l.scrollHeight - l.clientHeight })
        confere(sobra <= 1, 'luta cabe na altura da janela sem rolar')
        const cartas = await page.evaluate(() => [...document.querySelectorAll('#mao .fz-carta')].map((e) => { const r = e.getBoundingClientRect(); return r.height > 20 && r.top >= 0 && r.bottom <= window.innerHeight }))
        confere(cartas.length > 0 && cartas.every(Boolean), 'cartas da mão inteiras na vertical')
        await conferirEncaixe('luta')
        if (fmt.toque) await conferirNomes('celular')
      }
    }
    await page.waitForSelector('#fim:not([hidden])', { timeout: 20000 })
    parar = true; await vigia
    confere(true, `luta inteira jogada por cliques (${jogadas} comandos, semente ${semente})`)
    viuCritico = fotoCritico
    if (viuCritico || tentativa === SEMENTES.length - 1) break
    console.log('  (sem crítico nesta luta; tentando outra semente)')
  }
  confere(viuCritico, 'um golpe crítico apareceu (foto do crítico)')
  await page.waitForTimeout(900)
  await foto(page, fmt, 'fim')
  const res1 = await page.evaluate(() => JSON.stringify(window.__frayz.estado().fim))
  confere(!!JSON.parse(res1), 'a luta chegou ao fim com resultado do motor: ' + res1)
  confere((await page.locator('#fimResumo li').count()) >= 4, 'resumo do fim: turnos, maior golpe, viradas e vida')
  const sons = await page.evaluate(() => window.__frayz.Som.registro.map((x) => x[0]))
  const fimSom = await page.evaluate(() => window.__frayz.estado().fim.vencedor === 'A' ? 'vitoria' : 'derrota')
  confere(sons.some((n) => ['golpe', 'golpeForte', 'critico', 'golpeNoEscudo'].includes(n)) && sons.includes('queda') && sons.includes(fimSom) && sons.includes('cartaJogada'), `som disparado na luta: carta, golpe, queda e ${fimSom} (${[...new Set(sons)].length} sons diferentes)`)
  const foraFim = await foraDaTela(page, ['.fim-folha', '#btnRevanche', '#btnTrocarTime', '#btnRever', '#btnCopiar'])
  confere(foraFim.length === 0, 'tela do fim: nada fora da janela' + (foraFim.length ? ' → ' + foraFim.join('; ') : ''))

  // ---------- limite de flashes (no máximo 3 por segundo) e partículas
  const lim = await page.evaluate(() => { const l = window.__frayz.arena.logFlash; let max = 0; for (let i = 0; i < l.length; i++) { let n = 0; for (let j = i; j < l.length && l[j] - l[i] < 1000; j++) n++; max = Math.max(max, n) } return { max, total: l.length, pico: window.__frayz.arena.picoPart } })
  confere(lim.max <= 3, `no máximo 3 estrelas de impacto por segundo (viu ${lim.max} em ${lim.total})`)
  confere(lim.pico <= 90, `partículas abaixo do teto (pico ${lim.pico} de 90)`)

  // ---------- replay: copiar, Rever (com "Menos animação") e colar
  await clique('#btnCopiar')
  await page.waitForTimeout(200)
  const copia = (await page.locator('#copiaMsg').textContent()).trim()
  confere(copia.length > 0, 'Copiar replay responde: "' + copia + '"')
  const texto = await page.evaluate(() => window.__frayz.textoDoReplay()) // o texto cru não aparece na tela: é o que o Copiar copia
  confere((await page.locator('#fim textarea, #fim input').count()) === 0 && !/\{"v"/.test(await page.locator('#fim').textContent()), 'fim da luta: o texto cru do replay não aparece na tela')
  let obj = null
  try { obj = JSON.parse(texto) } catch { /* abaixo */ }
  confere(!!obj && obj.v === 1 && obj.s === semente && Array.isArray(obj.c) && obj.c.length > 5, `replay em texto JSON curto (${texto.length} letras, ${obj?.c?.length} comandos)`)
  confere(texto.length < 4000, 'replay curto (< 4000 letras)')

  await page.evaluate(() => { window.__frayz.arena.logFlash.length = 0; window.__frayz.arena.picoPart = 0 })
  await page.locator('#fim').waitFor({ state: 'visible' })
  // liga "Menos animação" pela tela inicial depois; aqui só confere a opção no menu da luta
  await clique('#btnRever')
  await page.waitForSelector('#luta:not([hidden])')
  await clique('#btnMenu')
  await clique('#optMenos2')
  confere((await page.evaluate(() => document.documentElement.dataset.menos)) === '1', 'Menos animação liga pelo menu da luta')
  await page.keyboard.press('Escape')
  await page.waitForSelector('#fim:not([hidden])', { timeout: 90000 })
  const res2 = await page.evaluate(() => JSON.stringify(window.__frayz.estado().fim))
  confere(res2 === res1, 'Rever refaz a MESMA luta (mesmo resultado do motor)')
  const mn = await page.evaluate(() => ({ estrelas: window.__frayz.arena.logFlash.length, pico: window.__frayz.arena.picoPart, anim: getComputedStyle(document.querySelector('.fim-titulo')).animationName }))
  confere(mn.estrelas === 0 && mn.pico === 0, `Menos animação: sem estrela de impacto e sem partículas (estrelas ${mn.estrelas}, partículas ${mn.pico})`)
  confere(mn.anim === 'none', 'Menos animação: sem animação CSS (título do fim parado)')
  await page.waitForTimeout(1100)
  await foto(page, fmt, 'fim-menos')

  // colar o replay na tela inicial
  await clique('#btnTrocarTime')
  await page.waitForSelector('#inicio:not([hidden])')
  await clique('#colar summary')
  await page.fill('#replayEntrada', '{isso nao e replay')
  await clique('#btnAssistir')
  confere((await page.locator('#replayMsg').textContent()).length > 5, 'replay inválido mostra erro')
  await page.fill('#replayEntrada', texto)
  await clique('#btnAssistir')
  await page.waitForSelector('#fim:not([hidden])', { timeout: 90000 })
  const res3 = await page.evaluate(() => JSON.stringify(window.__frayz.estado().fim))
  confere(res3 === res1, 'replay colado refaz a mesma luta')

  // revanche e trocar time
  await clique('#btnRevanche')
  await page.waitForSelector('#luta:not([hidden])')
  await page.waitForFunction(() => window.__frayz.livre(), null, { timeout: 60000 })
  confere(true, 'Revanche começa outra luta com os mesmos times')
  await clique('#btnMenu'); await clique('#btnSair')
  await page.waitForSelector('#inicio:not([hidden])')
  confere(true, 'Sair volta para a escolha de time')

  // ---------- a Tesoura: os dois lados só passam; a partir do turno da Tesoura todos perdem vida e a luta termina
  await abrir('e2e-tesoura')
  for (const id of TIME) await clique(`.ficha[data-id=${id}]`)
  await clique('#btnLutar')
  await page.waitForSelector('#luta:not([hidden])')
  await page.waitForFunction(() => window.__frayz.livre(), null, { timeout: 60000 })
  await page.evaluate(() => { window.__frayz.leque(0.5) })
  let fotoT = false
  const passando = page.evaluate(() => window.__frayz.passarOsDois())
  for (let i = 0; i < 400 && !fotoT; i++) {
    const vendo = await page.evaluate(() => window.__frayz.arena.fx.some((f) => f.k === 'tesoura'))
    if (vendo) { await page.waitForTimeout(260); await foto(page, fmt, 'tesoura'); fotoT = true }
    await page.waitForTimeout(40)
  }
  await passando
  confere(fotoT, 'a Tesoura apareceu na tela (foto)')
  const t = await page.evaluate(() => ({ fim: window.__frayz.estado().fim, cls: document.querySelector('#tTesoura').className }))
  confere(t.fim && (t.fim.motivo === 'tesoura' || t.fim.motivo === 'desempate') && t.fim.turno === 12, 'luta de passes termina pela Tesoura no último turno: ' + JSON.stringify(t.fim))
  confere(t.cls.includes('alerta'), 'aviso da Tesoura fica em alerta depois do turno dela')
  await clique('#btnTrocarTime')
  await page.waitForSelector('#inicio:not([hidden])')

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
console.log('\nTeste de tela: verde (' + FORMATOS.map((f) => f.nome).join(' + ') + ')')
