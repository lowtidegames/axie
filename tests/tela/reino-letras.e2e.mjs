// Reino — teste de tela da LETRA em 12 idiomas (R54), no Chrome de verdade, pela folha public/reino/letras.html.
//   · a folha abre sem erro de console e sem 404 · fotos de cada parte em tests/tela/fotos/reino/letras-*.png
//   · toda letra da lista tem desenho em pixel nas 8 variantes (reino, contorno, ouro, verde; mini, contorno, ouro, verde), largura > 0
//   · INGLÊS IDÊNTICO no Chrome: as mesmas frases e o mesmo roteiro do teste do servidor, contra tests/servidor/reino-letras-antes.json
//   · vietnamita e tailandês: frase inteira na letra do aparelho, na cor da variante (ouro fica ouro, verde fica verde), e em `Letras.faltas()`
//   · letra dentro de caixa da página (`miniatura`): o acento da 1ª linha não é cortado e o lugar na página não muda
// Rodar (um teste de tela por vez):  node tools/trava-robos.mjs rodar "timeout 1500 node tests/tela/reino-letras.e2e.mjs"
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { iniciar } from '../../server/dev.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const AQUI = path.dirname(fileURLToPath(import.meta.url))
const FOTOS = path.join(AQUI, 'fotos', 'reino')
fs.mkdirSync(FOTOS, { recursive: true })
const ANTES = JSON.parse(fs.readFileSync(path.join(AQUI, '..', 'servidor', 'reino-letras-antes.json'), 'utf8'))

const falhas = []
const confere = (ok, msg) => { if (!ok) { falhas.push(msg); console.log('FALHA: ' + msg) } else console.log('  ok: ' + msg) }
const cabecalho = (t) => console.log('\n== ' + t)

const servidor = await iniciar({ porta: 0 })
const base = `http://127.0.0.1:${servidor.address().port}`
const browser = await chromium.launch()
const erros = [], ruins = []
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(m.type() + ': ' + m.text()) })
  page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
  page.on('response', (r) => { if (r.status() >= 400) ruins.push(r.status() + ' ' + r.url()) })
  page.on('requestfailed', (r) => ruins.push('falhou ' + r.url()))
  await page.goto(base + '/public/reino/letras.html')
  await page.waitForFunction(() => window.pronto === true, null, { timeout: 30000 })

  cabecalho('a folha e as fotos')
  for (const id of ['latim', 'sinais', 'cirilico', 'frases', 'linhas', 'reserva', 'caber', 'dom', 'registro']) {
    const arq = path.join(FOTOS, `letras-${id}.png`)
    await page.locator('#' + id).screenshot({ path: arq })
    confere(fs.statSync(arq).size > 1500, `foto letras-${id}.png (${Math.round(fs.statSync(arq).size / 1024)} kB)`)
  }

  cabecalho('toda letra da lista tem desenho em pixel, nas 8 variantes')
  const lista = await page.evaluate(() => {
    const { Arte, Letras, LISTA } = window.Folha, fontes = ['reino', 'reino-contorno', 'reino-ouro', 'reino-verde', 'mini', 'mini-contorno', 'mini-ouro', 'mini-verde'], ruins = []
    Letras.limpar()
    let n = 0
    for (const grupo of Object.values(LISTA)) for (const ch of grupo) for (const f of fontes) { n++; if (!Arte.temLetra(ch, f) || !(Arte.largura(ch, f) > 0)) ruins.push(f + ':' + ch) }
    // cada letra desenhada de verdade deixa pixels na tela (na cor da variante)
    const vazias = []
    for (const grupo of Object.values(LISTA)) for (const ch of grupo) for (const f of fontes) {
      const c = document.createElement('canvas'); c.width = 16; c.height = 20; const g = c.getContext('2d'); Arte.texto(g, ch, 3, 6, { fonte: f })
      const d = g.getImageData(0, 0, 16, 20).data; let tem = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) tem++
      if (!tem) vazias.push(f + ':' + ch)
    }
    return { n, ruins, vazias, faltas: Letras.faltas().length, letras: Object.values(LISTA).flat().length }
  })
  confere(lista.ruins.length === 0, `${lista.letras} letras × 8 variantes = ${lista.n} glifos com largura > 0 (${lista.ruins.slice(0, 6)})`)
  confere(lista.vazias.length === 0, `nenhuma sai vazia na tela (${lista.vazias.slice(0, 6)})`)
  confere(lista.faltas === 0, 'nenhuma delas caiu na letra do aparelho')

  cabecalho('inglês idêntico no Chrome (mesmo roteiro do teste do servidor)')
  const ing = await page.evaluate(async (ref) => {
    const { Arte } = window.Folha, FONTES = ['reino', 'reino-contorno', 'reino-ouro', 'reino-verde', 'mini', 'mini-contorno', 'mini-ouro', 'dano-g', 'dano-g-ouro']
    const sha = async (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, h = new Uint8Array(await crypto.subtle.digest('SHA-1', d.buffer)); return [...h].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 10) }
    const nova = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false; return [c, g] }
    const umaFrase = async (s, fonte, opc = {}) => {
      const w = Arte.largura(s, fonte), k = opc.k || 1, [c, g] = nova(w * k + 12, 16 * k + 12)
      const x = opc.alinhar === 'centro' ? 6 + ((w * k) >> 1) : opc.alinhar === 'direita' ? 6 + w * k : 6
      Arte.texto(g, s, x, 6, { fonte, ...opc }); return [w, await sha(c)]
    }
    const umTitulo = async (s, k, ouro) => { const [c, g] = nova(Arte.largura(s, 'reino-contorno') * k + 12, 11 * k + 12); Arte.titulo(g, s, c.width >> 1, 6, k, ouro); return sha(c) }
    const ruins = []; let n = 0
    const igual = (a, b, onde) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) ruins.push(onde + ' ' + JSON.stringify(b) + ' -> ' + JSON.stringify(a)) }
    for (const f of FONTES) for (let i = 0; i < ref.frases.length; i++) igual(await umaFrase(ref.frases[i], f), ref.fontes[f][i], `${f}: "${ref.frases[i]}"`)
    let ic = 0, ia = 0, it = 0
    for (let i = 0; i < ref.frases.length; i++) {
      const s = ref.frases[i]
      if (i % 4 === 0) igual([(await umaFrase(s, 'reino', { cor: '#FFD248' }))[1], (await umaFrase(s, 'mini', { cor: '#96F082' }))[1], (await umaFrase(s, 'reino', { cor: '#CC3C3E', k: 2 }))[1]], ref.cor[ic++], 'cor: ' + s)
      if (i % 5 === 0) igual([(await umaFrase(s, 'reino-contorno', { alinhar: 'centro' }))[1], (await umaFrase(s, 'mini-ouro', { alinhar: 'direita' }))[1], (await umaFrase(s, 'reino-ouro', { alinhar: 'centro', k: 3 }))[1]], ref.alinhar[ia++], 'alinhar: ' + s)
      if (i % 6 === 0) igual([await umTitulo(s, 2, false), await umTitulo(s, 3, true), await umTitulo(s, 2, 'reino-verde')], ref.titulo[it++], 'titulo: ' + s)
    }
    return { n, ruins, faltas: window.Folha.Letras.faltas().length }
  }, ANTES)
  confere(ing.ruins.length === 0, `${ing.n} desenhos em inglês iguais aos de antes da mudança, pixel a pixel (${ing.ruins.slice(0, 4).join(' | ')})`)
  confere(ing.faltas === 0, 'nenhuma frase em inglês foi para a letra do aparelho')

  cabecalho('letra do aparelho: vietnamita e tailandês')
  const res = await page.evaluate(() => {
    const { Arte, Letras } = window.Folha
    Letras.limpar()
    const conta = (fonte, s, cor) => {
      const c = document.createElement('canvas'); c.width = 900; c.height = 120; const g = c.getContext('2d'); g.setTransform(3, 0, 0, 3, 0, 0); g.imageSmoothingEnabled = false
      const w = Arte.texto(g, s, 10, 14, { fonte, cor }), d = g.getImageData(0, 0, 900, 120).data, n = { ouro: 0, verde: 0, creme: 0, branco: 0, ameixa: 0, total: 0 }
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; n.total++; const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; if (k === '255,210,72') n.ouro++; else if (k === '150,240,130') n.verde++; else if (k === '255,246,224') n.creme++; else if (k === '255,255,255') n.branco++; else if (k === '43,30,58') n.ameixa++ }
      return { w, ...n }
    }
    const th = 'ชนะรอบที่ 12', vi = 'Chiến thắng'
    const r = { thOuro: conta('reino-ouro', th), thVerde: conta('reino-verde', th), thMiniOuro: conta('mini-ouro', th), viContorno: conta('reino-contorno', vi), viLisa: conta('reino', vi), viPintada: conta('mini', vi, '#FFD248'), en: conta('reino-ouro', 'VICTORY') }
    r.faltas = Letras.faltas(); r.temVi = Arte.temLetra(vi, 'reino'); r.temPt = Arte.temLetra('Coração', 'mini'); r.larguraIgual = Arte.largura(th, 'reino-ouro') === r.thOuro.w
    return r
  })
  confere(res.thOuro.ouro > 80 && res.thOuro.ameixa > 80 && res.thOuro.creme === 0, `tailandês em reino-ouro sai OURO com contorno (${res.thOuro.ouro} px de ouro, ${res.thOuro.ameixa} de contorno)`)
  confere(res.thVerde.verde > 80 && res.thVerde.creme === 0, `tailandês em reino-verde sai VERDE (${res.thVerde.verde} px)`)
  confere(res.thMiniOuro.ouro > 40, `tailandês em mini-ouro sai ouro (${res.thMiniOuro.ouro} px)`)
  confere(res.viContorno.creme > 80 && res.viContorno.ameixa > 80, 'vietnamita em reino-contorno: creme com contorno')
  confere(res.viLisa.branco > 80 && res.viLisa.ameixa === 0, 'vietnamita na reino lisa: a cor da fonte lisa, sem contorno')
  confere(res.viPintada.ouro > 40, 'vietnamita na mini pintada de ouro: ouro')
  confere(res.faltas.length === 6 && res.faltas.every((f) => f.letras.length > 0 && f.vezes >= 1), `as 6 frases ficaram em Letras.faltas() com as letras que faltam (${res.faltas.map((f) => f.fonte + ':' + f.letras.join('')).join(' · ').slice(0, 120)})`)
  confere(res.temVi === false && res.temPt === true, 'temLetra: vietnamita não, português sim')
  confere(res.larguraIgual && res.thOuro.w > 20, `a largura medida é a da letra do aparelho (${res.thOuro.w} px de arte)`)
  confere(res.en.ouro > 50 && !res.faltas.some((f) => f.texto === 'VICTORY'), 'inglês segue em pixel')

  cabecalho('letra em caixa da página (miniatura)')
  const dom = await page.evaluate(() => [...document.querySelectorAll('#dom canvas')].map((c) => ({ w: c.width, h: c.height, cw: c.style.width, ch: c.style.height, mt: c.style.marginTop, mb: c.style.marginBottom, caixa: c.parentElement.getBoundingClientRect().height })))
  const [pt, fr, en, ru, vi, th] = dom
  confere(en.mt === '' && en.h === 7 && en.ch === '21px', `inglês: a tela de sempre (7 px ×3, sem margem)`)
  confere(pt.mt === '-6px' && pt.h === 9 && pt.ch === '27px' && pt.caixa === en.caixa, `português com acento: a tela cresce 2 px para cima (margem ${pt.mt}) e a caixa na página fica igual (${pt.caixa} px)`)
  confere(fr.mt === '-6px' && fr.mb === '-6px' && fr.h === 9, `francês na mini com Ç e É: sobe 2 e desce 2 (margens ${fr.mt} / ${fr.mb})`)
  confere(ru.mt === '-4px', 'russo com Й e Ё em ouro ×2: sobe 2')
  confere(vi.w > Number.parseInt(vi.cw) * 0.9 && th.w > Number.parseInt(th.cw) * 0.9, `letra do aparelho refeita na resolução da tela (${vi.w} px de tela para ${vi.cw})`)

  cabecalho('console e rede')
  confere(erros.length === 0, 'zero erro ou aviso de console ' + erros.slice(0, 3).join(' | '))
  confere(ruins.length === 0, 'zero 404 ' + ruins.slice(0, 3).join(' | '))
} finally {
  await browser.close(); servidor.close()
}
console.log(falhas.length ? `\nFALHOU: ${falhas.length} conferência(s)` : '\nTUDO VERDE: letra em 12 idiomas')
process.exit(falhas.length ? 1 : 0)
