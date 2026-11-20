// Frayz — teste de tela das PEÇAS da interface (public/pecas.html), em Chrome de verdade (Playwright instalado globalmente).
// Abre a folha de conferência e as três montagens em 360×740, 390×844, 768×1024, 1280×720 e 1920×1080 e confere:
//   nenhum erro no console · nada importante fora da tela · alvo de toque ≥ 44 px · contraste de texto ≥ 4,5:1 (pelas cores
//   computadas) · fontes carregadas · a mão cabe sem rolar · a carta ampliada mostra o texto inteiro · com "Menos animação"
//   (classe no body e preferência do aparelho) nenhuma animação CSS infinita ativa · teclas 1–7 escolhem a carta.
// Salva fotos em tests/tela/fotos/pecas-*.png.
// Rode pela trava de um robô por vez:  node tools/trava-robos.mjs rodar "node tests/tela/pecas.e2e.mjs"
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
// o desenho novo dos bonecos é opcional: enquanto o arquivo não existe, o navegador avisa um 404 ao tentar buscá-lo (esperado)
const TEM_RIG = fs.existsSync(path.join(AQUI, '..', '..', 'public', 'js', 'boneco-rig.js'))

const FORMATOS = [
  { nome: 'celular-360', w: 360, h: 740, toque: true, referencia: true, densidade: 2 },
  { nome: 'celular-390', w: 390, h: 844, toque: true },
  { nome: 'tablet-768', w: 768, h: 1024, toque: true },
  { nome: 'pc-1280', w: 1280, h: 720, toque: false, referencia: true },
  { nome: 'pc-1920', w: 1920, h: 1080, toque: false },
]
const CONTRASTE_MINIMO = 4.5, TOQUE_MINIMO = 44

const falhas = []
const falha = (msg) => { falhas.push(msg); console.log('FALHA: ' + msg) }
const confere = (ok, msg) => { if (!ok) falha(msg); else console.log('  ok: ' + msg) }
const lista = (l, n = 4) => (l.length ? ' → ' + l.slice(0, n).join('; ') + (l.length > n ? ` (+${l.length - n})` : '') : '')

const servidor = await iniciar({ porta: 0 })
const base = `http://127.0.0.1:${servidor.address().port}`
const browser = await chromium.launch()

// ------------------------------------------------------------------ medidas feitas dentro da página

/** Textos principais: contraste entre a cor computada do texto e o fundo de verdade atrás dele. */
const TEXTOS = [
  '.fz-carta__nome', '.fz-carta__frase', '.fz-num', '.fz-chave', '.fz-carta__custo', '.fz-carta__fiapo', '.fz-carta__lugar-nome', '.fz-carta__dono-nome',
  '.fz-botao__rotulo', '.fz-botao__detalhe', '.fz-botao__tecla', '.fz-fita__numero', '.fz-dedal__numero', '.fz-carreteis__rotulo', '.fz-carreteis__numero',
  '.fz-contador__numero', '.fz-fio-tempo__seg', '.fz-etiqueta__texto', '.fz-faixa__texto', '.fz-vantagem__papel', '.fz-bastidor__titulo', '.fz-bastidor__tecido span',
  '.fz-bastidor__texto', '.fz-alfinetes__linha', '.fz-lupa__motivo', '.fz-luta__turno-rotulo', '.fz-luta__turno-numero', '.fz-luta__tesoura', '.fz-luta__nome', '.fz-luta__lugar',
  '.fz-time__titulo', '.fz-time__dica', '.fz-time__nome span', '.fz-time__ordem', '.fz-ficha__nome', '.fz-ficha__tipo', '.fz-ficha__raridade', '.fz-ficha__numero b', '.fz-ficha__numero span',
  '.fz-ficha__carta-nome', '.fz-ficha__carta-desc', '.fz-ficha__custo b', '.fz-ficha__bordado', '.fz-circulo__nome', '.fz-circulo__vazio', '.fz-fim__titulo', '.fz-fim__motivo', '.fz-fim__heroi',
  '.fz-fim__numero b', '.fz-fim__numero span', '.fz-fim__aviso', '.fo-secao > h2', '.fo-secao > p', '.fo-item > small',
]
function medirContraste(seletores) {
  const hex = (h) => { const s = h.replace('#', ''); const n = s.length === 3 ? [...s].map((c) => c + c).join('') : s; return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)).concat(1) }
  const cor = (c) => {
    c = String(c || '').trim()
    if (c.startsWith('#')) return hex(c)
    let m = c.match(/^rgba?\(([^)]+)\)$/)
    if (m) { const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] }
    m = c.match(/^color\(srgb ([^)]+)\)$/)
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1] }
    return [0, 0, 0, 0]
  }
  const sobre = (cima, baixo) => [0, 1, 2].map((i) => cima[i] * cima[3] + baixo[i] * (1 - cima[3]))
  const mistura = (a, b, k) => a.map((v, i) => v * (1 - k) + b[i] * k)
  const luz = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
  function razao(el) {
    const cadeia = []; for (let e = el; e; e = e.parentElement) cadeia.unshift(e)
    let fundo = [255, 255, 255]; const grupos = []
    for (const a of cadeia) { const cs = getComputedStyle(a), o = parseFloat(cs.opacity); if (o < 1) grupos.push({ antes: fundo.slice(), o }); fundo = sobre(cor(cs.backgroundColor), fundo) }
    const cs = getComputedStyle(el), declarado = cs.getPropertyValue('--fz-fundo').trim()
    if (declarado) fundo = cor(declarado).slice(0, 3) // fundo desenhado em SVG/canvas: a peça declara a cor
    let texto = sobre(cor(cs.color), fundo)
    for (const g of grupos.reverse()) { fundo = mistura(g.antes, fundo, g.o); texto = mistura(g.antes, texto, g.o) }
    const a = luz(texto), b = luz(fundo)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }
  let medidos = 0, pior = null; const ruins = []
  for (const s of seletores) for (const el of document.querySelectorAll(s)) {
    if (!el.getClientRects().length || !el.textContent.trim()) continue
    const r = razao(el); medidos++
    const item = `${s} "${el.textContent.trim().slice(0, 24)}" ${r.toFixed(2)}:1`
    if (!pior || r < pior.r) pior = { r, item }
    if (r < 4.5) ruins.push(item)
  }
  return { medidos, pior: pior?.item ?? '(nada medido)', ruins: [...new Set(ruins)] }
}

/** Alvos de toque: todo botão visível tem pelo menos 44×44; na mão, cada carta mostra uma faixa de pelo menos 44 px. */
function medirToque(minimo) {
  const ruins = []; let medidos = 0
  for (const b of document.querySelectorAll('button, [role="button"], a[href]')) {
    if (!b.getClientRects().length || b.closest('.fz-mao')) continue
    const r = b.getBoundingClientRect(); medidos++
    if (r.width < minimo - 0.5 || r.height < minimo - 0.5) ruins.push(`${b.className.split(' ')[0] || b.tagName} "${(b.getAttribute('aria-label') || b.textContent).trim().slice(0, 20)}" ${Math.round(r.width)}×${Math.round(r.height)}`)
  }
  for (const m of document.querySelectorAll('.fz-mao')) {
    const cartas = [...m.querySelectorAll('.fz-carta')].sort((a, b) => Number(a.dataset.indice) - Number(b.dataset.indice))
    const xs = cartas.map((c) => parseFloat(getComputedStyle(c).getPropertyValue('--x')))
    for (let i = 0; i < cartas.length; i++) {
      medidos++
      const faixa = i < cartas.length - 1 ? xs[i + 1] - xs[i] : cartas[i].offsetWidth
      if (faixa < minimo - 0.5 || cartas[i].offsetHeight < minimo) ruins.push(`carta ${i + 1} da mão mostra ${faixa.toFixed(1)} px`)
    }
  }
  return { medidos, ruins }
}

/** O que está fora da janela. vertical = true exige também caber na altura (telas sem rolagem). */
function medirFora({ seletores, vertical = false }) {
  const vw = window.innerWidth, vh = window.innerHeight, fora = []
  for (const s of seletores) for (const e of document.querySelectorAll(s)) {
    if (!e.getClientRects().length) continue
    const r = e.getBoundingClientRect()
    if (r.left < -1 || r.right > vw + 1 || (vertical && (r.top < -1 || r.bottom > vh + 1))) fora.push(`${s} (${Math.round(r.left)},${Math.round(r.top)})–(${Math.round(r.right)},${Math.round(r.bottom)}) em ${vw}×${vh}`)
  }
  const d = document.documentElement
  if (d.scrollWidth > vw + 1) fora.push(`rolagem lateral: ${d.scrollWidth} > ${vw}`)
  if (vertical && d.scrollHeight > vh + 1) fora.push(`rolagem vertical: ${d.scrollHeight} > ${vh}`)
  return fora
}

/** Peças do HUD que não podem ficar uma em cima da outra. */
function medirColisoes(seletores) {
  const caixas = []
  for (const s of seletores) for (const e of document.querySelectorAll(s)) { if (e.getClientRects().length) caixas.push({ s, r: e.getBoundingClientRect() }) }
  const batem = []
  for (let i = 0; i < caixas.length; i++) for (let j = i + 1; j < caixas.length; j++) {
    const a = caixas[i].r, b = caixas[j].r
    const lx = Math.min(a.right, b.right) - Math.max(a.left, b.left), ly = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    if (lx > 1.5 && ly > 1.5) batem.push(`${caixas[i].s} × ${caixas[j].s} (${Math.round(lx)}×${Math.round(ly)} px)`)
  }
  return batem
}

/** Texto e nome das cartas cabem inteiros (nada cortado, nada vazando). */
function medirCartas(seletor) {
  const ruins = []; let medidas = 0
  for (const c of document.querySelectorAll(seletor)) {
    if (!c.getClientRects().length) continue
    medidas++
    const nome = c.querySelector('.fz-carta__nome'), fita = c.querySelector('.fz-carta__fita'), texto = c.querySelector('.fz-carta__texto'), frase = c.querySelector('.fz-carta__frase'), miolo = c.querySelector('.fz-carta__miolo')
    const quem = c.querySelector('.fz-carta__nome').textContent
    if (c.dataset.variante !== 'mini') {
      const n = nome.getBoundingClientRect(), f = fita.getBoundingClientRect()
      if (n.left < f.left - 0.5 || n.right > f.right + 0.5) ruins.push(`${quem}: nome maior que a fita`)
      if (texto.getClientRects().length) {
        const t = texto.getBoundingClientRect(), fr = frase.getBoundingClientRect()
        if (fr.top < t.top - 1 || fr.bottom > t.bottom + 1 || fr.right > t.right + 1) ruins.push(`${quem}: texto não cabe (${Math.round(fr.height)} em ${Math.round(t.height)} px)`)
        if (parseFloat(getComputedStyle(frase).fontSize) < 12.99) ruins.push(`${quem}: letra do texto menor que 13 px`)
      }
    } else {
      const f = fita.getBoundingClientRect(), m = miolo.getBoundingClientRect(), n = nome.getBoundingClientRect()
      if (f.bottom > m.bottom + 4 || n.bottom > f.bottom + 0.5 || n.top < f.top - 0.5) ruins.push(`${quem}: nome não cabe na mini`)
      // carta coberta no leque (tarefa 18): o nome que aparece é o abreviado, desenhado no ::before — mede ele
      if (parseFloat(getComputedStyle(nome, c.classList.contains('fz-carta--coberta') ? '::before' : null).fontSize) < 12.99) ruins.push(`${quem}: nome menor que 13 px`)
    }
  }
  return { medidas, ruins }
}

const infinitas = () => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).length

// ------------------------------------------------------------------ uma janela

async function abrir(ctx, caminho, erros) {
  const page = await ctx.newPage()
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const onde = m.location()?.url ?? ''
    if (!TEM_RIG && /\/js\/boneco-rig\.js$/.test(onde) && /404/.test(m.text())) return // desenho novo ainda não chegou (esperado)
    erros.push(`console: ${m.text()} @ ${onde}`)
  })
  page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
  await page.goto(base + caminho)
  await page.waitForFunction(() => window.__pecas?.pronto === true, null, { timeout: 20000 })
  await page.waitForTimeout(350)
  return page
}

async function rodarFormato(fmt) {
  console.log(`\n=== ${fmt.nome} (${fmt.w}×${fmt.h}) ===`)
  const opcoes = { viewport: { width: fmt.w, height: fmt.h }, hasTouch: fmt.toque, isMobile: fmt.toque, deviceScaleFactor: fmt.densidade ?? 1 }
  const ctx = await browser.newContext(opcoes)
  const erros = []
  const pc = !fmt.toque && fmt.w / fmt.h >= 1.1, formato = pc ? 'pc' : 'celular'
  const foto = async (page, nome, alvo) => {
    const arq = path.join(FOTOS, `pecas-${fmt.nome}-${nome}.png`)
    if (alvo) { const l = page.locator(alvo).first(); await l.scrollIntoViewIfNeeded(); await page.waitForTimeout(150); await l.screenshot({ path: arq }) } else await page.screenshot({ path: arq })
    console.log('  foto: ' + path.relative(process.cwd(), arq))
  }
  const tocar = async (l, o) => (fmt.toque ? l.tap(o) : l.click(o))

  // ---------- 1. a folha de conferência
  let page = await abrir(ctx, `/public/pecas.html?formato=${formato}`, erros)
  const fontes = await page.evaluate(async () => {
    await document.fonts.ready
    const carregadas = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/"/g, '')} ${f.weight}`)
    return { carregadas, lilita: document.fonts.check('400 16px "Lilita One"'), n600: document.fonts.check('600 14px "Nunito"'), n800: document.fonts.check('800 14px "Nunito"') }
  })
  confere(fontes.lilita && fontes.n600 && fontes.n800 && ['Lilita One 400', 'Nunito 600', 'Nunito 800'].every((f) => fontes.carregadas.includes(f)), `fontes carregadas (Lilita One 400, Nunito 600 e 800): ${[...new Set(fontes.carregadas)].join(', ')}`)
  const todas = await page.evaluate(() => [...document.querySelectorAll('.fo-todas .fz-carta')].map((c) => ({ nome: c.querySelector('.fz-carta__nome').textContent, texto: c.querySelector('.fz-carta__frase').textContent, custo: c.querySelector('.fz-carta__custo').textContent })))
  confere(todas.length === 24 && todas.every((c) => c.nome && c.texto && /^\d+$/.test(c.custo)) && new Set(todas.map((c) => c.nome)).size === 24, `a folha mostra as 24 cartas reais, com nome, custo e texto (${todas.length})`)
  const cartas = await page.evaluate(medirCartas, '.fz-carta')
  confere(cartas.medidas >= 30 && cartas.ruins.length === 0, `nome e texto cabem inteiros em ${cartas.medidas} cartas (todas as variantes)` + lista(cartas.ruins))
  let fora = await page.evaluate(medirFora, { seletores: ['.fz-carta', '.fz-botao', '.fz-fita', '.fz-placa', '.fz-carreteis', '.fz-contador', '.fz-bastidor__botao', '.fz-etiqueta', '.fz-fio-tempo', '.fz-logo', '.fz-faixa', '.fz-vantagem', '.fo-quadro'] })
  confere(fora.length === 0, 'folha: nada importante fora da janela, sem rolagem lateral' + lista(fora))
  let toque = await page.evaluate(medirToque, TOQUE_MINIMO)
  confere(toque.ruins.length === 0, `folha: ${toque.medidos} alvos de toque com pelo menos ${TOQUE_MINIMO} px` + lista(toque.ruins))
  let contraste = await page.evaluate(medirContraste, TEXTOS)
  confere(contraste.medidos > 150 && contraste.ruins.length === 0, `folha: contraste ≥ ${CONTRASTE_MINIMO}:1 em ${contraste.medidos} textos (o pior: ${contraste.pior})` + lista(contraste.ruins))

  // a mão cabe sem rolar, com 6 e com 7 cartas (o botão "Comprar" da folha põe a sétima)
  const maoCabe = () => page.evaluate(() => {
    const m = document.querySelector('.fz-mao'), q = m.closest('.fo-quadro').getBoundingClientRect(), cartas = [...m.querySelectorAll('.fz-carta')]
    const fora = cartas.filter((c) => { const r = c.getBoundingClientRect(); return r.left < q.left - 0.5 || r.right > q.right + 0.5 || r.bottom > m.getBoundingClientRect().bottom + 0.5 }).length
    return { n: cartas.length, fora, rola: m.scrollWidth > m.clientWidth + 1 || document.documentElement.scrollWidth > window.innerWidth + 1, variante: m.dataset.variante, largura: cartas[0]?.offsetWidth }
  })
  let mao = await maoCabe()
  confere(mao.n === 6 && mao.fora === 0 && !mao.rola, `a mão de 6 cartas cabe sem rolar (variante ${mao.variante}, carta de ${mao.largura} px)`)
  await tocar(page.locator('.fo-secao:nth-of-type(3) .fo-botoes .fz-botao').first())
  await page.waitForTimeout(700)
  mao = await maoCabe()
  confere(mao.n === 7 && mao.fora === 0 && !mao.rola, `a mão de 7 cartas cabe sem rolar (carta de ${mao.largura} px)`)
  toque = await page.evaluate(medirToque, TOQUE_MINIMO)
  confere(toque.ruins.length === 0, 'com 7 cartas cada uma ainda mostra uma faixa de toque de pelo menos 44 px' + lista(toque.ruins))
  const nomesNaMao = await page.evaluate(medirCartas, '.fz-mao .fz-carta')
  confere(nomesNaMao.ruins.length === 0, 'com 7 cartas o nome ainda cabe em cada carta' + lista(nomesNaMao.ruins))

  // teclas 1–7 escolhem a carta
  const ids = await page.evaluate((f) => window.__pecas.maos[f].ids(), formato)
  const escolhidas = []
  for (let i = 1; i <= 7; i++) {
    await page.keyboard.press(String(i))
    escolhidas.push(await page.evaluate(() => ({ id: window.__pecas.ultimaEscolha?.id, origem: window.__pecas.ultimaEscolha?.origem, foco: document.activeElement?.dataset?.mao })))
  }
  confere(ids.length === 7 && escolhidas.every((e, i) => e.id === ids[i] && e.origem === 'tecla' && e.foco === ids[i]), 'teclas 1 a 7 escolhem a carta certa e põem o foco nela')
  if (fmt.referencia) await foto(page, 'folha-mao', '.fo-secao:nth-of-type(3)')
  await page.keyboard.press('Escape')

  // "Menos animação": sem ela existem animações infinitas (pulso da carta jogável, brasa, seta); com ela, nenhuma
  const antes = await page.evaluate(infinitas)
  await tocar(page.locator('#foMenos'))
  await page.waitForTimeout(250)
  const depois = await page.evaluate(infinitas)
  const fioA = await page.evaluate(() => document.querySelector('.fz-logo__fio')?.getAttribute('d'))
  await page.waitForTimeout(400)
  const fioB = await page.evaluate(() => document.querySelector('.fz-logo__fio')?.getAttribute('d'))
  confere(antes > 0 && depois === 0, `"Menos animação" (classe no body): nenhuma animação CSS infinita ativa (antes ${antes}, depois ${depois})`)
  confere(!!fioA && fioA === fioB, '"Menos animação": o fio solto do logotipo fica parado')
  await tocar(page.locator('#foMenos'))
  if (fmt.referencia) await foto(page, 'folha-cartas', '.fo-secao:nth-of-type(1)')
  await page.close()

  // ---------- 2. montagem da luta (sem rolagem, nada cortado)
  page = await abrir(ctx, '/public/pecas.html?montagem=luta', erros)
  fora = await page.evaluate(medirFora, { seletores: ['.fz-luta__topo > *', '.fz-luta__rival', '.fz-bastidor__botao', '.fz-placa', '.fz-luta__boneco', '.fz-luta__meu > *', '.fz-luta__botoes .fz-botao', '.fz-mao .fz-carta', '.fz-fio-tempo'], vertical: true })
  confere(fora.length === 0, 'luta: tudo dentro da janela, sem rolagem' + lista(fora))
  const colisoes = await page.evaluate(medirColisoes, ['.fz-luta__turno', '.fz-luta__tesoura', '.fz-fio-tempo', '.fz-botao-de-roupa', '.fz-luta__rival', '.fz-bastidor__botao', '.fz-placa .fz-fita', '.fz-dedal', '.fz-alfinetes__botao .fz-alfinete', '.fz-luta__meu .fz-carreteis', '.fz-luta__meu .fz-contador', '.fz-luta__botoes .fz-botao', '.fz-mao'])
  confere(colisoes.length === 0, 'luta: nenhuma peça do HUD em cima de outra' + lista(colisoes))
  const luta = await page.evaluate(() => ({ cartas: document.querySelectorAll('.fz-mao .fz-carta').length, placas: document.querySelectorAll('.fz-placa').length, carreteis: document.querySelectorAll('.fz-luta__meu .fz-carretel').length, formato: document.querySelector('.fz-luta').dataset.formato, variante: document.querySelector('.fz-mao').dataset.variante, bastidor: Math.round(document.querySelector('.fz-bastidor__botao').getBoundingClientRect().width) }))
  confere(luta.cartas === 6 && luta.placas === 6 && luta.carreteis === 7, `luta: mão com 6 cartas, 6 placas de vida e 7 carretéis (formato ${luta.formato}, mão ${luta.variante}, bastidor de ${luta.bastidor} px)`)
  confere(luta.bastidor === (luta.formato === 'pc' ? 96 : 72), 'bastidor no tamanho do formato (96 px no PC, 72 px no celular)')
  toque = await page.evaluate(medirToque, TOQUE_MINIMO)
  confere(toque.ruins.length === 0, `luta: ${toque.medidos} alvos de toque com pelo menos ${TOQUE_MINIMO} px` + lista(toque.ruins))
  contraste = await page.evaluate(medirContraste, TEXTOS)
  confere(contraste.ruins.length === 0, `luta: contraste ≥ ${CONTRASTE_MINIMO}:1 em ${contraste.medidos} textos (o pior: ${contraste.pior})` + lista(contraste.ruins))
  await foto(page, 'luta')

  const primeira = page.locator('.fz-mao .fz-carta[data-indice="1"]')
  if (fmt.toque) { // tocar amplia a carta no meio da tela, com o texto inteiro e o botão Jogar; fecha pelos 3 jeitos
    await primeira.tap({ position: { x: 14, y: 70 } })
    await page.waitForSelector('.fz-lupa')
    await page.waitForTimeout(300)
    const lupa = await page.evaluate(medirFora, { seletores: ['.fz-lupa .fz-carta', '.fz-lupa .fz-botao', '.fz-lupa__motivo'], vertical: true })
    const texto = await page.evaluate(medirCartas, '.fz-lupa .fz-carta')
    const botoes = await page.evaluate(() => ({ jogar: !!document.querySelector('.fz-lupa__jogar'), fechar: !!document.querySelector('.fz-lupa__fechar'), largura: Math.round(document.querySelector('.fz-lupa .fz-carta').offsetWidth) }))
    confere(lupa.length === 0 && texto.medidas === 1 && texto.ruins.length === 0 && botoes.jogar && botoes.fechar, `tocar amplia a carta (${botoes.largura} px) com o texto inteiro e o botão Jogar` + lista([...lupa, ...texto.ruins]))
    contraste = await page.evaluate(medirContraste, TEXTOS)
    confere(contraste.ruins.length === 0, 'carta ampliada: contraste dos textos' + lista(contraste.ruins))
    if (fmt.referencia) await foto(page, 'carta-ampliada')
    await page.locator('.fz-lupa__fechar').tap()
    const fechou1 = (await page.locator('.fz-lupa').count()) === 0
    await primeira.tap({ position: { x: 14, y: 70 } }); await page.waitForSelector('.fz-lupa')
    await page.keyboard.press('Escape')
    const fechou2 = (await page.locator('.fz-lupa').count()) === 0
    await primeira.tap({ position: { x: 14, y: 70 } }); await page.waitForSelector('.fz-lupa')
    await page.locator('.fz-lupa').tap({ position: { x: 6, y: 6 } })
    const fechou3 = (await page.locator('.fz-lupa').count()) === 0
    confere(fechou1 && fechou2 && fechou3, 'a carta ampliada fecha pelo botão, pelo Esc e tocando fora')
    // uma carta jogável: Jogar escolhe a carta
    const jogavel = page.locator('.fz-mao .fz-carta[data-estado~="jogavel"]:not([data-estado~="selecionada"])').first()
    const idJogavel = await jogavel.getAttribute('data-mao')
    await jogavel.tap({ position: { x: 14, y: 70 } }); await page.waitForSelector('.fz-lupa__jogar:not(:disabled)')
    await page.locator('.fz-lupa__jogar').tap()
    await page.waitForTimeout(250)
    confere((await page.locator(`.fz-mao .fz-carta[data-mao="${idJogavel}"][data-estado~="selecionada"]`).count()) === 1 && (await page.locator('.fz-lupa').count()) === 0, 'o botão Jogar da carta ampliada escolhe a carta')
  } else { // no PC a carta sob o mouse sobe e cresce 1,25×; clicar escolhe
    const ultima = page.locator('.fz-mao .fz-carta[data-indice="6"]')
    await ultima.hover({ position: { x: 100, y: 120 } })
    await page.waitForTimeout(320)
    const foco = await page.evaluate(() => { const c = document.querySelector('.fz-mao .fz-carta.fz-foco'); if (!c) return null; const r = c.getBoundingClientRect(); return { w: r.width, dentro: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight, base: c.offsetWidth } })
    confere(!!foco && foco.base === 132 && Math.abs(foco.w - 165) < 2 && foco.dentro, `PC: carta de 132×185 na mão; sob o mouse sobe e cresce 1,25× (${foco ? Math.round(foco.w) : '?'} px), inteira na janela`)
    if (fmt.referencia) await foto(page, 'luta-carta-sob-o-mouse')
    const jogavel = page.locator('.fz-mao .fz-carta[data-estado~="jogavel"]:not([data-estado~="selecionada"])').first()
    const idJogavel = await jogavel.getAttribute('data-mao')
    await jogavel.click({ position: { x: 20, y: 150 } })
    await page.waitForTimeout(250)
    confere((await page.locator(`.fz-mao .fz-carta[data-mao="${idJogavel}"][data-estado~="selecionada"]`).count()) === 1, 'PC: clicar escolhe a carta (alfinete e contorno)')
  }
  // tocar no bastidor mostra os nomes dos tecidos; tocar nos alfinetes mostra a legenda dos estados
  await page.waitForSelector('.fz-etiqueta', { state: 'detached', timeout: 8000 }) // espera o aviso da jogada sair (ele passa por cima de tudo, de propósito)
  await tocar(page.locator('.fz-luta .fz-bastidor__botao'))
  await page.waitForSelector('.fz-bastidor__legenda:not([hidden])')
  await page.waitForTimeout(300) // a carta que estava sob o mouse termina de baixar
  const legenda = await page.evaluate(() => {
    const l = document.querySelector('.fz-luta .fz-bastidor__legenda'), r = l.getBoundingClientRect()
    const porCima = (x, y) => l.contains(document.elementFromPoint(x, y))
    return { dentro: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight, visivel: porCima(r.left + 12, r.top + 12) && porCima(r.right - 12, r.bottom - 12) && porCima(r.left + r.width / 2, r.top + r.height / 2), pares: l.querySelectorAll('.fz-bastidor__par').length, nomes: [...l.querySelectorAll('.fz-bastidor__par .fz-bastidor__tecido:first-child span')].map((e) => e.textContent).join(' › '), aceso: l.querySelectorAll('.fz-bastidor__par--aceso').length }
  })
  confere(legenda.dentro && legenda.visivel && legenda.pares === 6, `tocar no bastidor mostra os nomes (${legenda.nomes}), inteiros na janela e por cima de tudo`)
  contraste = await page.evaluate(medirContraste, TEXTOS)
  confere(contraste.ruins.length === 0, 'legenda do bastidor: contraste dos textos' + lista(contraste.ruins))
  if (fmt.referencia) await foto(page, 'luta-nomes-dos-tecidos')
  await page.keyboard.press('Escape')
  confere((await page.locator('.fz-bastidor__legenda:not([hidden])').count()) === 0, 'a legenda do bastidor fecha com Esc')
  await tocar(page.locator('.fz-luta .fz-alfinetes__botao').first())
  const alfinete = await page.evaluate(() => { const l = document.querySelector('.fz-luta .fz-alfinetes__legenda:not([hidden])'); if (!l) return null; const r = l.getBoundingClientRect(); return { dentro: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight, texto: l.textContent.trim() } })
  confere(!!alfinete && alfinete.dentro && alfinete.texto.length > 10, `tocar nos alfinetes mostra a legenda do estado: "${alfinete?.texto.slice(0, 60)}"`)
  contraste = await page.evaluate(medirContraste, TEXTOS)
  confere(contraste.ruins.length === 0, 'legenda dos alfinetes: contraste dos textos' + lista(contraste.ruins))
  await page.keyboard.press('Escape')

  // a faixa de vez atravessa a cena e some sozinha
  await tocar(page.locator('.fz-luta__botoes .fz-botao--principal'))
  await page.waitForSelector('.fz-faixa')
  const faixa = await page.evaluate(() => { const f = document.querySelector('.fz-faixa'); const r = f.getBoundingClientRect(); return { texto: f.textContent.trim(), larga: r.width >= document.querySelector('.fz-luta__cena').clientWidth - 2, vivo: f.getAttribute('aria-live') } })
  await page.waitForSelector('.fz-faixa', { state: 'detached', timeout: 3000 })
  confere(faixa.texto === 'Vez do rival' && faixa.larga && faixa.vivo === 'polite', 'a faixa de vez atravessa a cena inteira, é lida pelo leitor de tela e some sozinha')
  await page.close()

  // ---------- 3. escolher time e fim da luta
  for (const [nome, raiz, pecas] of [
    ['time', '.fz-time', ['.fz-time__topo > *', '.fz-time__boneco', '.fz-time__ficha', '.fz-ficha > *', '.fz-time__por', '.fz-circulo', '.fz-time__mesa .fz-botao']],
    ['vitoria', '.fz-fim', ['.fz-fim__folha', '.fz-fim__titulo', '.fz-fim__palco .fz-boneco', '.fz-fim__heroi', '.fz-fim__numero', '.fz-fim__botoes .fz-botao']],
    ['derrota', '.fz-fim', ['.fz-fim__folha', '.fz-fim__titulo', '.fz-fim__palco .fz-boneco', '.fz-fim__heroi', '.fz-fim__numero', '.fz-fim__botoes .fz-botao']],
  ]) {
    page = await abrir(ctx, `/public/pecas.html?montagem=${nome}`, erros)
    await page.waitForTimeout(500)
    fora = await page.evaluate(medirFora, { seletores: pecas, vertical: true })
    const cortado = await page.evaluate((sels) => sels.flatMap((s) => [...document.querySelectorAll(s)]).filter((e) => e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1).map((e) => `${e.className.split(' ')[0]} corta ${e.scrollHeight - e.clientHeight} px`), ['.fz-time__ficha', '.fz-time__prateleira', '.fz-fim__folha', '.fz-tela'])
    confere(fora.length === 0 && cortado.length === 0, `${nome}: tudo dentro da janela, sem rolagem e sem nada cortado` + lista([...fora, ...cortado]))
    toque = await page.evaluate(medirToque, TOQUE_MINIMO)
    contraste = await page.evaluate(medirContraste, TEXTOS)
    confere(toque.ruins.length === 0 && contraste.ruins.length === 0, `${nome}: ${toque.medidos} alvos de toque ≥ ${TOQUE_MINIMO} px e contraste ≥ ${CONTRASTE_MINIMO}:1 em ${contraste.medidos} textos (o pior: ${contraste.pior})` + lista([...toque.ruins, ...contraste.ruins]))
    if (nome === 'time') {
      const t = await page.evaluate(() => ({ bonecos: document.querySelectorAll('.fz-time__boneco').length, circulos: [...document.querySelectorAll('.fz-circulo__nome')].map((e) => e.textContent).join('/'), lutar: document.querySelector('.fz-time__mesa .fz-botao').disabled }))
      confere(t.bonecos === 9 && t.circulos === 'Frente/Meio/Trás' && t.lutar, `time: 9 bonecos na prateleira, círculos ${t.circulos}, Lutar desligado enquanto falta boneco`)
      await tocar(page.locator('.fz-time__boneco').nth(8)); await tocar(page.locator('.fz-time__por'))
      confere(!(await page.locator('.fz-time__mesa .fz-botao').isDisabled()) && (await page.locator('.fz-circulo--cheio').count()) === 3, 'time: com 3 escolhidos os círculos enchem e o Lutar liga')
    } else {
      const f = await page.evaluate(() => ({ titulo: document.querySelector('.fz-fim__titulo').getAttribute('aria-label'), numeros: document.querySelectorAll('.fz-fim__numero b').length, botoes: [...document.querySelectorAll('.fz-fim__botoes .fz-botao__rotulo')].map((e) => e.textContent).join(', '), cru: /\{"v"|"s":/.test(document.body.textContent), caixas: document.querySelectorAll('.fz-fim textarea, .fz-fim input').length }))
      confere(f.titulo === (nome === 'vitoria' ? 'Vitória!' : 'Derrota') && f.numeros === 3 && f.botoes === 'Revanche, Trocar time, Rever, Copiar replay', `${nome}: título "${f.titulo}", 3 números com ícone e os botões ${f.botoes}`)
      confere(!f.cru && f.caixas === 0, `${nome}: o texto cru do replay não aparece na tela`)
    }
    if (fmt.referencia) await foto(page, nome)
    await page.close()
  }

  confere(erros.length === 0, 'nenhum erro no console' + lista(erros))
  await ctx.close()

  // ---------- 4. "Menos animação" pela preferência do aparelho
  const calmo = await browser.newContext({ ...opcoes, reducedMotion: 'reduce' })
  const errosCalmo = []
  page = await abrir(calmo, `/public/pecas.html?formato=${formato}`, errosCalmo)
  const n = await page.evaluate(infinitas)
  const pulsa = await page.evaluate(() => getComputedStyle(document.querySelector('.fz-carta[data-estado~="jogavel"] .fz-carta__ponto-maldicao')).animationName)
  confere(n === 0 && pulsa === 'none', `preferência do aparelho por menos movimento: nenhuma animação CSS infinita ativa (${n}); costura da carta jogável acesa e parada`)
  confere(errosCalmo.length === 0, 'nenhum erro no console com menos movimento' + lista(errosCalmo))
  await calmo.close()
}

try {
  for (const f of FORMATOS) await rodarFormato(f)
} catch (e) {
  falha('exceção no teste: ' + (e && e.stack ? e.stack.split('\n').slice(0, 5).join(' / ') : e))
}
await browser.close()
servidor.close()
if (falhas.length) { console.log(`\nFALHOU: ${falhas.length} problema(s)`); process.exit(1) }
console.log('\nTeste de tela das peças: verde (' + FORMATOS.map((f) => f.nome).join(' + ') + ')')
