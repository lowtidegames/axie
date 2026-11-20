// Frayz — teste de fumaça da ARTE (Chrome de verdade, Playwright instalado globalmente): rig dos bonecos, cena do ateliê e efeitos.
// Sobe server/dev.mjs numa porta livre, abre public/arte.html e confere: nada de erro no console; o contrato exportado;
// as 44 partes desenham; os 9 prontos nas 8 poses, dos dois lados; cada boneco cabe na caixa (0,72 da altura; fios podem passar 8%);
// cabeça entre 42% e 48% da altura; "Menos animação" sem balanço e sem tremida; lugares que não se tapam; teto de 90 partículas
// (20 no modo calmo) e no máximo 3 estrelas de impacto por segundo; troca de fonte de camada; e mede o tempo médio por quadro
// (300 quadros de cena + 6 bonecos + efeitos). Salva as fotos de conferência em tests/tela/fotos/arte-*.png.
// Rode pela trava de um robô por vez:  node tools/trava-robos.mjs rodar "node tests/tela/arte.e2e.mjs"
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

const falhas = []
const falha = (msg) => { falhas.push(msg); console.log('FALHA: ' + msg) }
const confere = (ok, msg) => { if (!ok) falha(msg); else console.log('  ok: ' + msg) }

const servidor = await iniciar({ porta: 0 })
const base = `http://127.0.0.1:${servidor.address().port}`
const browser = await chromium.launch()
const erros = []

async function abrir(ctx, consulta) {
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()) })
  page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
  await page.goto(`${base}/public/arte.html?${consulta}`)
  await page.waitForFunction(() => window.__pronto === true, null, { timeout: 30000 })
  return page
}
async function foto(page, nome, seletor) {
  const arq = path.join(FOTOS, `arte-${nome}.png`)
  if (seletor) await page.locator(seletor).first().screenshot({ path: arq }); else await page.screenshot({ path: arq })
  console.log('  foto: ' + path.relative(process.cwd(), arq))
}

try {
  // ------------------------------------------------------------------ 1. contrato e desenho (densidade 1: contas de pixel simples)
  console.log('\n=== contrato, partes, poses, limites ===')
  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
  const p1 = await abrir(ctx1, 'sec=f&t=1000')

  const contrato = await p1.evaluate(async () => {
    const rig = await import('./js/boneco-rig.js'), cen = await import('./js/cenario.js'), efe = await import('./js/efeitos.js'), ponte = await import('./js/ponte.js')
    const falta = []
    for (const f of ['criarRig', 'retrato', 'silhueta', 'desenharParte', 'iconeDoTipo', 'padraoDoTecido', 'iconeDoBordado', 'iconeDoLugar', 'registrarFonteDeCamada']) if (typeof rig[f] !== 'function') falta.push('boneco-rig.' + f)
    if (typeof cen.criarCenario !== 'function') falta.push('cenario.criarCenario')
    if (typeof efe.criarEfeitos !== 'function') falta.push('efeitos.criarEfeitos')
    const c = cen.criarCenario({}), fx = efe.criarEfeitos({ maxParticulas: 90 })
    for (const f of ['desenhar', 'lugares', 'desenharFrente']) if (typeof c[f] !== 'function') falta.push('cenario.' + f)
    for (const f of ['enchimento', 'fiapos', 'impacto', 'costuraEstourando', 'brilho', 'poeira', 'atualizar', 'desenhar', 'contagem', 'modoCalmo']) if (typeof fx[f] !== 'function') falta.push('fx.' + f)
    const partes = Object.fromEntries(Object.entries(ponte.ficha(ponte.idsProntos()[0]).partes).map(([k, v]) => [k, v.id + '@' + v.raridade]))
    const r = rig.criarRig(partes, { remendos: 2, trofeus: ['jeans'], fioDeOuro: false, semente: 'x' })
    for (const f of ['desenhar', 'caixa']) if (typeof r[f] !== 'function') falta.push('rig.' + f)
    const cx = r.caixa(200)
    return { falta, caixa: cx, poses: rig.POSES, nPartes: Object.keys(ponte.PARTES).length }
  })
  confere(contrato.falta.length === 0, 'contrato exportado completo' + (contrato.falta.length ? ' → falta ' + contrato.falta.join(', ') : ''))
  confere(Math.abs(contrato.caixa.largura - 144) < 0.01 && contrato.caixa.altura === 200, 'rig.caixa(200) = 144 × 200 (0,72 da altura)')
  confere(contrato.poses.join() === 'parado,preparo,golpe,golpeado,escudo,ultimoFio,caido,vitoria', 'as 8 poses do contrato')

  // cada parte do config desenha sozinha (e não fica em branco) e os ícones saem
  const partes = await p1.evaluate(async () => {
    const rig = await import('./js/boneco-rig.js'), { PARTES, TIPOS } = await import('./js/ponte.js')
    const vazias = [], contagem = {}
    const tinta = (cv) => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n }
    for (const [id, p] of Object.entries(PARTES)) {
      contagem[p.slot] = (contagem[p.slot] || 0) + 1
      const cv = document.createElement('canvas'); cv.width = cv.height = 120
      rig.desenharParte(cv.getContext('2d'), id + '@rara', 60, 60, 110)
      if (tinta(cv) < 300) vazias.push(id)
    }
    for (const t of TIPOS) if (tinta(rig.iconeDoTipo(t, 32)) < 100) vazias.push('ícone do tipo ' + t)
    for (const [id, p] of Object.entries(PARTES)) if (p.slot === 'bordado' && tinta(rig.iconeDoBordado(p.bordado, 32)) < 100) vazias.push('ícone do bordado ' + id)
    for (const l of ['cabeca', 'bracos', 'pernas']) if (tinta(rig.iconeDoLugar(l, 32)) < 100) vazias.push('ícone do lugar ' + l)
    const cv = document.createElement('canvas'); const c = cv.getContext('2d'); const padroes = TIPOS.every((t) => rig.padraoDoTecido(c, t) instanceof CanvasPattern)
    return { vazias, contagem, padroes }
  })
  confere(JSON.stringify(partes.contagem) === JSON.stringify({ tronco: 12, cabeca: 8, bracos: 8, pernas: 8, bordado: 8 }), 'catálogo: 12 troncos, 8 cabeças, 8 braços, 8 pernas, 8 bordados → ' + JSON.stringify(partes.contagem))
  confere(partes.vazias.length === 0, 'as 44 partes e todos os ícones desenham' + (partes.vazias.length ? ' → em branco: ' + partes.vazias.join(', ') : ''))
  confere(partes.padroes, 'padraoDoTecido devolve um CanvasPattern para os 6 tecidos')

  // os 9 prontos, nas 8 poses, dos dois lados, com e sem "Menos animação"; medidas do boneco parado
  const medidas = await p1.evaluate(async () => {
    const rig = await import('./js/boneco-rig.js'), ponte = await import('./js/ponte.js')
    const ALT = 200, W = 420, H = 460, PX = 210, PY = 400, out = { erros: [], bonecos: [] }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H
    const c = cv.getContext('2d', { willReadFrequently: true })
    const caixaDe = () => { const d = c.getImageData(0, 0, W, H).data; let x0 = W, x1 = -1, y0 = H, y1 = -1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y } return { x0, x1, y0, y1 } }
    const pinta = (r, t, est) => { c.clearRect(0, 0, W, H); r.desenhar(c, PX, PY, ALT, t, { semSombra: true, ...est }) }
    for (const id of ponte.idsProntos()) {
      const partes = Object.fromEntries(Object.entries(ponte.ficha(id).partes).map(([k, v]) => [k, v.id + '@' + v.raridade]))
      const r = rig.criarRig(partes, { semente: id })
      try {
        for (const pose of rig.POSES) for (const lado of ['A', 'B']) for (const p of [0, 0.3, 0.6, 1]) for (const menos of [false, true]) pinta(r, 777, { pose, progresso: p, lado, menosAnimacao: menos, brilhoDaLinha: 0.6 })
      } catch (e) { out.erros.push(id + ': ' + e.message); continue }
      // parado: cabe na caixa? (o fio da maldição e os fiapos são "fios soltos": conferidos com a folga de 8%)
      pinta(r, 0, { pose: 'parado', menosAnimacao: true }); const b = caixaDe()
      // menos animação: parado não balança (dois tempos, mesma imagem); último fio não balança
      pinta(r, 100, { pose: 'parado', menosAnimacao: true }); const a1 = cv.toDataURL(); pinta(r, 1900, { pose: 'parado', menosAnimacao: true }); const a2 = cv.toDataURL()
      pinta(r, 100, { pose: 'ultimoFio', progresso: 1, menosAnimacao: true }); const f1 = cv.toDataURL(); pinta(r, 700, { pose: 'ultimoFio', progresso: 1, menosAnimacao: true }); const f2 = cv.toDataURL()
      // apanhou com menos animação: sem tremida (mesma imagem em dois instantes da tremida)
      pinta(r, 100, { pose: 'golpeado', progresso: 0.05, menosAnimacao: true }); const g1 = cv.toDataURL(); pinta(r, 100, { pose: 'golpeado', progresso: 0.2, menosAnimacao: true }); const g2 = cv.toDataURL()
      // com animação o parado se mexe e o apanhou treme no máximo 6 px
      pinta(r, 100, { pose: 'parado' }); const m1 = cv.toDataURL(); pinta(r, 1300, { pose: 'parado' }); const m2 = cv.toDataURL()
      // caído: fica baixo (desmontado no pano)
      pinta(r, 0, { pose: 'caido', progresso: 1, menosAnimacao: true }); const k = caixaDe()
      out.bonecos.push({ id, largura: (b.x1 - b.x0 + 1) / ALT, esq: (PX - b.x0) / ALT, dir: (b.x1 - PX) / ALT, altura: (PY - b.y0) / ALT, pe: (b.y1 - PY) / ALT, paradoIgual: a1 === a2, fioIgual: f1 === f2, golpeadoIgual: g1 === g2, mexe: m1 !== m2, alturaCaido: (PY - k.y0) / ALT, larguraCaido: (k.x1 - k.x0 + 1) / ALT })
    }
    return out
  })
  confere(medidas.erros.length === 0, '9 prontos × 8 poses × 2 lados × 4 instantes × com/sem animação desenham sem erro' + (medidas.erros.length ? ' → ' + medidas.erros.join(' | ') : ''))
  for (const b of medidas.bonecos) {
    // caixa: meia largura 0,36 + 8% de folga para fios soltos (o fio da maldição escapa para trás)
    confere(b.esq <= 0.36 + 0.08 + 0.005 && b.dir <= 0.36 + 0.08 + 0.005, `${b.id}: cabe na caixa (esq ${b.esq.toFixed(3)} · dir ${b.dir.toFixed(3)} da altura; limite 0,36 + 0,08 de fios)`)
    confere(b.altura >= 0.9 && b.altura <= 1.085, `${b.id}: altura desenhada ${b.altura.toFixed(3)} da pedida (fios e pompom podem passar até 8%)`)
    confere(b.paradoIgual && b.fioIgual && b.golpeadoIgual, `${b.id}: Menos animação — parado sem balanço, Último Fio sem pêndulo, apanhou sem tremida`)
    confere(b.mexe, `${b.id}: com animação, o parado respira`)
    confere(b.alturaCaido < 0.62, `${b.id}: caído fica desmontado no pano (altura ${b.alturaCaido.toFixed(2)} da de pé)`)
  }

  // proporção da cabeça: 42% a 48% da altura. Mede o "crânio" na camada da cabeça (base + frente): as linhas em que a largura
  // passa de um terço da maior largura — assim nó, pompom, cordões e fios soltos (enfeites finos) não entram na conta.
  const cabecas = await p1.evaluate(async () => {
    const rig = await import('./js/boneco-rig.js'), { PARTES } = await import('./js/ponte.js'), ponte = await import('./js/ponte.js')
    const base = Object.fromEntries(Object.entries(ponte.ficha('rasgao').partes).map(([k, v]) => [k, v.id + '@' + v.raridade])), out = []
    for (const [id, p] of Object.entries(PARTES)) {
      if (p.slot !== 'cabeca') continue
      const cm = rig.criarRig({ ...base, cabeca: id + '@comum' }, { semente: id }).camadas(1, 1).cb
      const cv = document.createElement('canvas'); cv.width = cm.canvas.width; cv.height = cm.canvas.height
      const c = cv.getContext('2d'); c.drawImage(cm.canvas, 0, 0); if (cm.frente) c.drawImage(cm.frente, 0, 0)
      const d = c.getImageData(0, 0, cv.width, cv.height).data, vao = []
      for (let y = 0; y < cv.height; y++) { let x0 = -1, x1 = -1; for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 128) { if (x0 < 0) x0 = x; x1 = x } vao.push(x0 < 0 ? 0 : x1 - x0 + 1) }
      const maior = Math.max(...vao), meio = vao.indexOf(maior)
      let topo = meio, queixo = meio
      while (topo > 0 && vao[topo - 1] >= maior * 0.33) topo--
      while (queixo < vao.length - 1 && vao[queixo + 1] >= maior * 0.33) queixo++
      out.push({ id, cabeca: (queixo - topo + 1) / cm.escala / 240 })
    }
    return out
  })
  for (const c of cabecas) confere(c.cabeca >= 0.42 && c.cabeca <= 0.48, `${c.id}: cabeça = ${(c.cabeca * 100).toFixed(1)}% da altura do boneco (42% a 48%)`)

  // tremida do "apanhou": no máximo 6 px
  const tremida = await p1.evaluate(async () => {
    const rig = await import('./js/boneco-rig.js'), ponte = await import('./js/ponte.js')
    const partes = Object.fromEntries(Object.entries(ponte.ficha('rasgao').partes).map(([k, v]) => [k, v.id + '@' + v.raridade]))
    const r = rig.criarRig(partes, { semente: 't' })
    let maior = 0
    const falso = { getTransform: () => new DOMMatrix(), save() {}, restore() {}, translate(x) { if (this.n++ === 0) maior = Math.max(maior, Math.abs(x - 100)) }, n: 0 }
    const alvo = new Proxy(falso, { get: (o, k) => (k in o ? o[k] : () => ({ addColorStop() {} })), set: (o, k, v) => { o[k] = v; return true } })
    for (let p = 0; p <= 0.5; p += 0.005) { falso.n = 0; r.desenhar(alvo, 100, 300, 200, 0, { pose: 'golpeado', progresso: p, semSombra: true }) }
    return maior
  })
  confere(tremida > 1 && tremida <= 6.001, `apanhou: treme, e no máximo 6 px (maior desvio ${tremida.toFixed(2)} px)`)

  // lugares: os 6 bonecos nunca se tapam, cabem na tela, Frente maior e mais baixo, Meio 94%, Trás 88%
  const lugares = await p1.evaluate(async () => {
    const { criarCenario } = await import('./js/cenario.js'), c = criarCenario({}), out = []
    for (const [f, w, h] of [['pc', 1280, 720], ['pc', 1280, 470], ['pc', 1920, 1080], ['pc', 960, 480], ['pc', 768, 420], ['celular', 360, 740], ['celular', 360, 500], ['celular', 390, 844], ['celular', 412, 915], ['celular', 768, 1024]]) {
      const L = c.lugares(w, h, f), todos = [...L.A, ...L.B], prob = []
      const cx = (l) => ({ x0: l.x - l.altura * 0.36, x1: l.x + l.altura * 0.36, y0: l.y - l.altura, y1: l.y })
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) { const a = cx(todos[i]), b = cx(todos[j]); if (a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5) prob.push(`caixas ${i} e ${j} se tapam`) }
      for (const l of todos) { const b = cx(l); if (b.x0 < -0.5 || b.x1 > w + 0.5 || b.y0 < 0 || b.y1 > h) prob.push('boneco fora da tela') }
      for (const t of ['A', 'B']) {
        const [fr, me, tr] = L[t]
        if (Math.abs(me.altura / fr.altura - 0.94) > 0.001 || Math.abs(tr.altura / fr.altura - 0.88) > 0.001) prob.push('tamanhos fora de 100/94/88')
        if (!(fr.y > me.y && fr.y > tr.y)) prob.push('Frente não é o mais baixo')
        if (!(Math.abs(fr.x - w / 2) < Math.abs(me.x - w / 2) && Math.abs(fr.x - w / 2) < Math.abs(tr.x - w / 2))) prob.push('Frente não é o mais perto do centro')
      }
      if (f === 'pc' && !(L.A.every((l) => l.x < w / 2) && L.B.every((l) => l.x > w / 2))) prob.push('PC: A à esquerda e B à direita')
      if (f === 'celular' && !(L.B.every((l) => l.y < h * 0.5) && L.A.every((l) => l.y > h * 0.5))) prob.push('celular: rival em cima, jogador embaixo')
      out.push({ f, w, h, prob })
    }
    return out
  })
  for (const l of lugares) confere(l.prob.length === 0, `lugares ${l.f} ${l.w}×${l.h}: ninguém se tapa, todos na tela, Frente maior, mais baixo e mais perto do centro` + (l.prob.length ? ' → ' + [...new Set(l.prob)].join('; ') : ''))

  // efeitos: teto de 90, modo calmo com teto de 20, no máximo 3 estrelas de impacto por segundo
  const fx = await p1.evaluate(async () => {
    const { criarEfeitos } = await import('./js/efeitos.js'), cv = document.createElement('canvas'); cv.width = 300; cv.height = 300
    const c = cv.getContext('2d'), f = criarEfeitos({ maxParticulas: 90 })
    for (let i = 0; i < 12; i++) { f.costuraEstourando(150, 150); f.fiapos(150, 150, '#3F6FB5', 20); f.brilho(150, 150, '#FFC857'); f.poeira(150, 280, 10); f.impacto(150, 150, 2) }
    const cheio = f.contagem(), estrelas = f.contagem('estrela')
    let pico = cheio
    for (let i = 0; i < 40; i++) { f.atualizar(16); f.desenhar(c); if (i % 4 === 0) f.costuraEstourando(150, 150); pico = Math.max(pico, f.contagem()) }
    f.modoCalmo(true); const aoLigar = f.contagem()
    for (let i = 0; i < 12; i++) { f.costuraEstourando(150, 150); f.fiapos(150, 150, '#3F6FB5', 20); f.impacto(150, 150, 2); f.enchimento(150, 150, 30) }
    const calmo = f.contagem()
    for (let i = 0; i < 400; i++) f.atualizar(16)
    const fim = f.contagem()
    const g = criarEfeitos({ maxParticulas: 90 }); let est = 0
    for (let i = 0; i < 60; i++) { g.impacto(150, 150, 1); est = Math.max(est, g.contagem('estrela')); g.atualizar(16) } // 60 pedidos em ~1 s
    return { cheio, pico, estrelas, aoLigar, calmo, fim, estrelasPorSegundo: est }
  })
  confere(fx.cheio <= 90 && fx.pico <= 90 && fx.cheio >= 60, `efeitos: teto de 90 partículas respeitado (pedidas centenas; vivas ${fx.cheio}, pico ${fx.pico})`)
  confere(fx.estrelas <= 3 && fx.estrelasPorSegundo <= 3, `impacto: no máximo 3 estrelas de pano por segundo (viu ${fx.estrelas} de uma vez e ${fx.estrelasPorSegundo} em 1 s)`)
  confere(fx.aoLigar <= 20 && fx.calmo <= 20, `modo calmo: teto de 20 partículas (ao ligar ${fx.aoLigar}; depois de pedir centenas ${fx.calmo})`)
  confere(fx.fim === 0, 'as partículas acabam sozinhas (nada fica preso na tela)')

  // troca da fonte de camada: uma parte passa a vir de um canvas de fora, com o mesmo pivô, e as poses seguem iguais
  const fonte = await p1.evaluate(async () => {
    const rig = await import('./js/boneco-rig.js'), ponte = await import('./js/ponte.js')
    const partes = Object.fromEntries(Object.entries(ponte.ficha('rasgao').partes).map(([k, v]) => [k, v.id + '@' + v.raridade]))
    const cv = document.createElement('canvas'); cv.width = 300; cv.height = 380; const c = cv.getContext('2d')
    let chamadas = 0
    rig.registrarFonteDeCamada('pe_rebite', (pd) => {
      chamadas++
      const k = pd.escala, f = document.createElement('canvas'); f.width = Math.ceil(40 * k); f.height = Math.ceil(64 * k)
      const x = f.getContext('2d'); x.fillStyle = '#00FF00'; x.fillRect(8 * k, 4 * k, 24 * k, 58 * k)
      return { canvas: f, escala: k, pivo: { x: 20 * k, y: 4 * k }, encaixes: { pe: { x: 0, y: 58 } } }
    })
    const r = rig.criarRig(partes, { semente: 'f' })
    let erro = null
    try { for (const pose of rig.POSES) { c.clearRect(0, 0, 300, 380); r.desenhar(c, 150, 340, 300, 500, { pose, progresso: 0.5 }) } c.clearRect(0, 0, 300, 380); r.desenhar(c, 150, 340, 300, 0, { pose: 'parado', menosAnimacao: true }) } catch (e) { erro = e.message }
    const d = c.getImageData(0, 0, 300, 380).data; let verdes = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 40 && d[i + 1] > 215 && d[i + 2] < 40) verdes++
    rig.registrarFonteDeCamada('pe_rebite', null)
    const r2 = rig.criarRig(partes, { semente: 'f' }); c.clearRect(0, 0, 300, 380); r2.desenhar(c, 150, 340, 300, 0, { pose: 'parado', menosAnimacao: true })
    const d2 = c.getImageData(0, 0, 300, 380).data; let verdes2 = 0; for (let i = 0; i < d2.length; i += 4) if (d2[i] < 40 && d2[i + 1] > 215 && d2[i + 2] < 40) verdes2++
    return { erro, chamadas, verdes, verdes2 }
  })
  confere(!fonte.erro && fonte.chamadas >= 2 && fonte.verdes > 500 && fonte.verdes2 === 0, `registrarFonteDeCamada: a perna veio da fonte de fora nas 8 poses e voltou ao desenho por código (${fonte.erro || `chamadas ${fonte.chamadas}, pixels da fonte ${fonte.verdes} → ${fonte.verdes2}`})`)

  // retrato e silhueta
  const rs = await p1.evaluate(async () => {
    const rig = await import('./js/boneco-rig.js'), ponte = await import('./js/ponte.js')
    const partes = Object.fromEntries(Object.entries(ponte.ficha('mudo').partes).map(([k, v]) => [k, v.id + '@' + v.raridade]))
    const r = rig.retrato(partes, 96, { densidade: 1 }), s = rig.silhueta(partes, 120, { densidade: 1 })
    const d = s.getContext('2d').getImageData(0, 0, s.width, s.height).data; let outra = 0, cheios = 0
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { cheios++; if (Math.abs(d[i] - 0x14) > 3 || Math.abs(d[i + 1] - 0x0c) > 3 || Math.abs(d[i + 2] - 0x1f) > 3) outra++ }
    return { rw: r.width, rh: r.height, sw: s.width, cheios, outra }
  })
  confere(rs.rw === 96 && rs.rh === 96, 'retrato(partes, 96) devolve um canvas de 96 × 96')
  confere(rs.cheios > 2000 && rs.outra === 0, `silhueta: uma cor só, chapada (${rs.cheios} pixels cheios, ${rs.outra} de outra cor)`)

  // ------------------------------------------------------------------ 2. desempenho: 300 quadros (cena + 6 bonecos + efeitos)
  console.log('\n=== desempenho ===')
  await p1.evaluate(() => { document.querySelector('#cenaPc').scrollIntoView() })
  const d1 = await p1.evaluate(() => window.__arte.medir(300, { vista: 0 }))
  const d1f = await p1.evaluate(() => window.__arte.medir(300, { vista: 0, forcar: true }))
  console.log(`  PC ${d1.largura}×${d1.altura} densidade ${d1.densidade}: desenho ${d1.mediaMs.toFixed(2)} ms por quadro (pior ${d1.maiorMs.toFixed(1)} ms) · com a pintura forçada ${d1f.mediaMs.toFixed(2)} ms · intervalo entre quadros ${d1.intervaloMedioMs.toFixed(1)} ms · pico de ${Math.max(d1.picoDeParticulas, d1f.picoDeParticulas)} partículas`)
  confere(d1.picoDeParticulas <= 90 && d1f.picoDeParticulas <= 90, 'durante a medição o teto de 90 partículas valeu')
  confere(d1.mediaMs < 16.7, `60 quadros por segundo: desenho médio ${d1.mediaMs.toFixed(2)} ms < 16,7 ms (cena + 6 bonecos + efeitos, 300 quadros)`)
  await ctx1.close()

  const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
  const p2 = await abrir(ctx2, 'sec=f&t=1000&pcw=1280&pch=560')
  await p2.evaluate(() => { document.querySelector('#cenaPc').scrollIntoView() })
  const d2 = await p2.evaluate(() => window.__arte.medir(300, { vista: 0 }))
  const d2f = await p2.evaluate(() => window.__arte.medir(300, { vista: 0, forcar: true }))
  const d2c = await p2.evaluate(() => window.__arte.medir(300, { vista: 1, forcar: true }))
  console.log(`  PC ${d2.largura}×${d2.altura} densidade ${d2.densidade}: desenho ${d2.mediaMs.toFixed(2)} ms por quadro (pior ${d2.maiorMs.toFixed(1)} ms) · com a pintura forçada ${d2f.mediaMs.toFixed(2)} ms · intervalo entre quadros ${d2.intervaloMedioMs.toFixed(1)} ms`)
  console.log(`  celular ${d2c.largura}×${d2c.altura} densidade ${d2c.densidade}: com a pintura forçada ${d2c.mediaMs.toFixed(2)} ms por quadro`)
  confere(d2.mediaMs < 16.7, `densidade 2: desenho médio ${d2.mediaMs.toFixed(2)} ms < 16,7 ms`)
  fs.writeFileSync(path.join(FOTOS, 'arte-desempenho.txt'), [
    'Frayz — arte: tempo médio por quadro (300 quadros; cena do ateliê + 6 bonecos animados + efeitos disparando)',
    'Máquina do teste: Chrome sem cabeça do Playwright, sem placa de vídeo (pintura por software). Num celular médio com placa de vídeo a pintura é mais rápida.',
    `PC ${d1.largura}×${d1.altura}, densidade 1: desenho ${d1.mediaMs.toFixed(2)} ms · com pintura forçada ${d1f.mediaMs.toFixed(2)} ms · pior quadro ${d1.maiorMs.toFixed(1)} ms`,
    `PC ${d2.largura}×${d2.altura}, densidade 2: desenho ${d2.mediaMs.toFixed(2)} ms · com pintura forçada ${d2f.mediaMs.toFixed(2)} ms · pior quadro ${d2.maiorMs.toFixed(1)} ms`,
    `celular ${d2c.largura}×${d2c.altura}, densidade 2: com pintura forçada ${d2c.mediaMs.toFixed(2)} ms`,
    'Meta: 16,7 ms (60 quadros por segundo).', '',
  ].join('\n'))
  await p2.close()

  // ------------------------------------------------------------------ 3. fotos de conferência (densidade 2)
  console.log('\n=== fotos ===')
  let pg = await abrir(ctx2, 'sec=a&t=1500&pico=1&esc=0.66'); await pg.waitForTimeout(250); await foto(pg, 'poses', '#a'); await foto(pg, '96px', '#a96'); await pg.close()
  pg = await abrir(ctx2, 'sec=a&t=1500&pico=1&esc=0.66&lado=B&menos=1'); await pg.waitForTimeout(250); await foto(pg, 'poses-ladoB-menos', '#a'); await pg.close()
  pg = await abrir(ctx2, 'sec=b&t=1500&esc=0.62'); await pg.waitForTimeout(250); await foto(pg, 'partes', '#b'); await pg.close()
  pg = await abrir(ctx2, 'sec=c&t=1500&esc=0.8'); await pg.waitForTimeout(250); await foto(pg, 'silhuetas', '#sec-c'); await pg.close()
  pg = await abrir(ctx2, 'sec=d&t=3200&esc=0.62'); await pg.waitForTimeout(250); await foto(pg, 'remendos', '#d'); await pg.close()
  pg = await abrir(ctx2, 'sec=e&t=1500'); await pg.waitForTimeout(250); await foto(pg, 'cartas', '#e'); await pg.close()
  const cena = 'pcw=880&pch=440&celw=360&celh=520'
  pg = await abrir(ctx2, `sec=f&t=2400&${cena}`); await pg.waitForTimeout(400); await foto(pg, 'cena-pc', '#cenaPc'); await foto(pg, 'cena-celular', '#cenaCel'); await pg.close()
  pg = await abrir(ctx2, `sec=f&t=2400&degrau=3&${cena}`); await pg.waitForTimeout(700); await foto(pg, 'cena-pc-tesoura3', '#cenaPc'); await foto(pg, 'cena-celular-tesoura3', '#cenaCel'); await pg.close()
  pg = await abrir(ctx2, `sec=f&t=2400&degrau=3&corte=0.4&${cena}`); await pg.waitForTimeout(700); await foto(pg, 'cena-pc-corte', '#cenaPc'); await foto(pg, 'cena-celular-corte', '#cenaCel'); await pg.close()
  pg = await abrir(ctx2, `sec=f&t=2400&pose=ultimoFio&p=1&${cena}`); await pg.waitForTimeout(400); await foto(pg, 'cena-pc-ultimo-fio', '#cenaPc'); await pg.close()
  pg = await abrir(ctx2, `sec=f&t=2400&menos=1&pose=caido&p=1&${cena}`); await pg.waitForTimeout(400); await foto(pg, 'cena-pc-caido-menos', '#cenaPc'); await pg.close()
  pg = await abrir(ctx2, `sec=f&t=2400&pose=golpeado&p=0.2&${cena}`)
  await pg.evaluate(() => { window.__arte.soltarEfeito('Crítico (costura estoura)'); window.__arte.soltarEfeito('Impacto forte') }); await pg.waitForTimeout(170)
  const noAr = await pg.evaluate(() => window.__arte.vistas[0].fx.contagem())
  await foto(pg, 'efeitos-critico', '#cenaPc'); await foto(pg, 'efeitos-critico-celular', '#cenaCel')
  confere(noAr >= 25 && noAr <= 90, `crítico: a costura estoura e voam flocos (${noAr} partículas no ar na foto)`)
  await pg.close()

  // lado a lado: a luta de antes (tests/tela/fotos/pc-meio.png) e a cena nova
  const antes = path.join(FOTOS, 'pc-meio.png'), depois = path.join(FOTOS, 'arte-cena-pc.png')
  if (fs.existsSync(antes) && fs.existsSync(depois)) {
    const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')
    const lado = await ctx2.newPage()
    await lado.setContent(`<body style="margin:0;background:#140C1F;color:#F2E6C9;font:700 15px system-ui"><div id="x" style="display:flex;gap:10px;padding:10px;width:1340px;align-items:flex-start"><div><div style="padding:4px 0">ANTES (bonecos duros, fundo genérico)</div><img src="${b64(antes)}" style="width:660px;height:330px;object-fit:cover;object-position:top;display:block"></div><div><div style="padding:4px 0">DEPOIS (rig mole em camadas + ateliê)</div><img src="${b64(depois)}" style="width:660px;display:block"></div></div></body>`)
    await lado.waitForTimeout(300)
    await foto(lado, 'antes-e-depois', '#x'); await lado.close()
  }
  await ctx2.close()
  confere(erros.length === 0, 'nenhum erro no console' + (erros.length ? ' → ' + erros.slice(0, 6).join(' | ') : ''))
} catch (e) {
  falha('exceção no teste: ' + (e && e.stack ? e.stack.split('\n').slice(0, 5).join(' / ') : e))
}
await browser.close()
servidor.close()
if (falhas.length) { console.log(`\nFALHOU: ${falhas.length} problema(s)`); process.exit(1) }
console.log('\nTeste de tela da arte: verde')
