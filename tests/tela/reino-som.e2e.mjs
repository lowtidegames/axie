// Reino — teste de tela do SOM do jogo novo (Chrome de verdade). Régua: docs/reino/som.md.
// Ninguém da equipe ouve: cada som é FABRICADO FORA DO TEMPO REAL (OfflineAudioContext) dentro da página, pela cadeia inteira, e MEDIDO.
//   efeitos (todas as variações): pico no alvo da tabela (±2,5 dB) e nunca acima de −3 dBFS · duração ±25% da tabela
//     · começa em até 15 ms · sem estouro · variações diferentes entre si
//   música (8 momentos): pico e volume médio abaixo dos efeitos · o MOTIVO nas notas certas · chefe em menor · batalha com mais batida que construir
//   ao vivo (folha public/reino/sons.html): nada antes do primeiro toque · cada botão toca · teto de vozes · mudo e volumes guardados
//     · "Menos animação" · troca de momento só na linha do compasso · a rodada simulada inteira · amostra gravada no lugar do código
//     · zero erro de console · zero 404 · funciona em subpasta
//   R35 (tela nova): ambiente por trecho (medido e ao vivo, cruza em 1,5 s) · golpe agrupado por pelotão · variação de altura e força · estéreo leve
//     · hit-stop com corte de agudo · ducking no chefe e no recorde · luta cheia (150 unidades) no teto de vozes e abaixo de −3 dBFS
//     · no JOGO de verdade: estrela de impacto e som no mesmo quadro (±1), pisão e queda do chefe em etapas, cartas, ouro, menu · Reduced motion mantém som · sem áudio nada quebra
//   R46 (revanche): troca e dica — duração, volume, sem agudo, duas notas subindo, mudo, teto de vozes, "Menos animação", dica depois da fanfarra
// Rodar (um teste de tela por vez):  node tools/trava-robos.mjs rodar "timeout 900 node tests/tela/reino-som.e2e.mjs"
// Recalibrar depois de mexer numa receita:  ... reino-som.e2e.mjs --calibrar   (mostra)   ou   --calibrar --gravar   (grava no som-reino.js)
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { iniciar } from '../../server/dev.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const AQUI = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(AQUI, '..', '..')
const PASTA = path.join(RAIZ, 'public', 'reino')
const SAIDA = path.join(RAIZ, 'sons', 'reino')
fs.mkdirSync(SAIDA, { recursive: true })

const falhas = [], relatorio = []
const anota = (s = '') => relatorio.push(s)
const falha = (msg) => { falhas.push(msg); console.log('FALHA: ' + msg); anota('  FALHA: ' + msg) }
const confere = (ok, msg) => { if (!ok) falha(msg); else { console.log('  ok: ' + msg); anota('  ok: ' + msg) } }
const cabecalho = (t) => { console.log('\n== ' + t); anota(); anota('== ' + t) }
const dorme = (ms) => new Promise((ok) => setTimeout(ok, ms))
const n1 = (x) => (Math.round(x * 10) / 10).toFixed(1)

const servidor = await iniciar({ porta: 0 })
const base = `http://127.0.0.1:${servidor.address().port}`
const FOLHA = base + '/public/reino/sons.html'
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const erros = [], ruins = []
function vigiar(page) {
  page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()) })
  page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
  page.on('response', (r) => { if (r.status() >= 400) ruins.push(r.status() + ' ' + r.url()) })
  page.on('requestfailed', (r) => ruins.push('falhou ' + r.url()))
}

// ------------------------------------------------------------------ só calibrar
if (process.argv.includes('--calibrar')) {
  const page = await browser.newPage(); vigiar(page)
  await page.goto(FOLHA)
  const cal = await page.evaluate(async () => (await import('./som-reino.js')).Som.calibrar())
  const bloco = `/* PICO_BRUTO:INICIO */\nconst PICO_BRUTO = {\n${Object.entries(cal).map(([k, v]) => `  ${k}: [${v.join(', ')}],`).join('\n')}\n}\n/* PICO_BRUTO:FIM */`
  if (process.argv.includes('--gravar')) {
    const arq = path.join(PASTA, 'som-reino.js')
    fs.writeFileSync(arq, fs.readFileSync(arq, 'utf8').replace(/\/\* PICO_BRUTO:INICIO \*\/[\s\S]*?\/\* PICO_BRUTO:FIM \*\//, () => bloco))
    console.log('PICO_BRUTO gravado em public/reino/som-reino.js')
  } else console.log(bloco)
  await browser.close(); servidor.close()
  process.exit(erros.length ? 1 : 0)
}

// ------------------------------------------------------------------ medidor dentro da página
async function instalarMedidor(page) {
  await page.evaluate(async () => {
    const { Som, Musica } = await import('./som-reino.js')
    const SR = 48000, PRE = 0.2
    const db = (x) => 20 * Math.log10(Math.max(x, 1e-9))
    /** Fabrica fora do tempo real pela cadeia inteira (efeitos + música → sala → compressor → teto). */
    async function fora(dur, montar) {
      const ctx = new OfflineAudioContext(2, Math.ceil((PRE + dur) * SR), SR), no = Som.cadeia(ctx)
      const info = montar(ctx, no, PRE)
      const buf = await ctx.startRendering()
      return { L: buf.getChannelData(0), R: buf.getChannelData(1), info }
    }
    /** Pico, volume médio, começo e duração que se ouve (trecho acima de pico − 30 dB). */
    function medir(L, R) {
      const n = L.length; let pico = 0, estouros = 0
      for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > pico) pico = a; if (a >= 0.999) estouros++ }
      const lim = pico * 10 ** (-30 / 20); let ini = -1, fim = -1, soma = 0
      for (let i = 0; i < n; i++) if (Math.max(Math.abs(L[i]), Math.abs(R[i])) > lim) { if (ini < 0) ini = i; fim = i }
      for (let i = ini; i <= fim; i++) soma += (L[i] * L[i] + R[i] * R[i]) / 2
      return { picoDb: db(pico), rmsDb: db(Math.sqrt(soma / Math.max(1, fim - ini + 1))), atrasoMs: (ini / SR - PRE) * 1000, ms: (fim - ini) / SR * 1000, estouros }
    }
    /** Força de uma frequência num trecho (Goertzel com janela), em dB. */
    function forca(x, i0, i1, f) {
      const n = i1 - i0, c = 2 * Math.cos(2 * Math.PI * f / SR); let s1 = 0, s2 = 0, sj = 0
      for (let i = 0; i < n; i++) { const j = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)); sj += j; const s = (x[i0 + i] || 0) * j + c * s1 - s2; s2 = s1; s1 = s }
      return db(Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2)) * 2 / sj)
    }
    function diferenca(a, b) { let d = 0, ea = 0, eb = 0; for (let i = 0; i < a.length; i++) { d += (a[i] - b[i]) ** 2; ea += a[i] * a[i]; eb += b[i] * b[i] } return Math.sqrt(d / Math.max(ea, eb, 1e-12)) }
    /** Quantas batidas fortes por segundo (subidas bruscas do contorno de volume). */
    function batidas(x, i0, i1) {
      const jan = Math.floor(SR * 0.01); let ant = 0, n = 0, ultimo = -1e9
      for (let i = i0; i + jan < i1; i += jan) { let e = 0; for (let k = 0; k < jan; k++) e += x[i + k] * x[i + k]; e = Math.sqrt(e / jan); if (e > ant * 2.2 && e > 0.01 && i - ultimo > SR * 0.08) { n++; ultimo = i } ant = ant * 0.6 + e * 0.4 }
      return n / ((i1 - i0) / SR)
    }
    window.__m = { Som, Musica, SR, PRE, db, fora, medir, forca, diferenca, batidas }
  })
}

const ctxPc = await browser.newContext({ viewport: { width: 1100, height: 800 } })
let page = await ctxPc.newPage(); vigiar(page)
await page.goto(FOLHA)

// ================================================================== 1. antes do primeiro toque
cabecalho('Antes do primeiro toque')
{
  await dorme(600)
  const a = await page.evaluate(() => { const { Som, Musica } = window.__reino; const tentou = Som.tocar('ouro'); Musica.momento('construir'); return { tentou, som: Som.estado(), mus: Musica.estado(), botoes: document.querySelectorAll('button[data-som]').length, momentos: document.querySelectorAll('button[data-momento]').length } })
  confere(a.som.ligado === false && a.som.destravado === false && a.tentou === false && a.som.tocados === 0 && a.mus.tocando === false, 'nada toca e nenhum contexto de áudio existe antes do primeiro toque (tocar devolve false; a música só fica pedida)')
  confere(a.botoes >= 20 && a.momentos >= 4, `a folha tem ${a.botoes} botões de efeito e ${a.momentos} momentos de música (mínimo 20 e 4)`)
  await page.evaluate(() => window.__reino.Musica.parar())
}

// ================================================================== 2. efeitos medidos fora do tempo real
cabecalho('Efeitos: cada variação fabricada pela cadeia inteira e medida')
await instalarMedidor(page)
const tabela = await page.evaluate(() => window.__m.Som.tabela())
{
  const med = await page.evaluate(async () => {
    const { Som, fora, medir, diferenca, SR, PRE } = window.__m, saida = []
    for (const e of Som.tabela()) {
      const ondas = []
      for (let i = 0; i < e.vars; i++) {
        const { L, R } = await fora(e.ms / 1000 * 1.5 + 0.6, (ctx, no, t) => Som.fabricar(ctx, no.fx, e.nome, t, i))
        ondas.push(L.slice(Math.floor(PRE * SR), Math.floor((PRE + e.ms / 1000) * SR)))
        saida.push({ nome: e.nome, i, ...medir(L, R) })
      }
      let dif = 9; for (let a = 0; a < ondas.length; a++) for (let b = a + 1; b < ondas.length; b++) dif = Math.min(dif, diferenca(ondas[a], ondas[b]))
      saida[saida.length - 1].dif = e.vars > 1 ? dif : null
    }
    // som baixo tem de sair da cadeia como entrou (o compressor não pode empurrar o volume)
    const { L, R } = await fora(0.5, (ctx, no, t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 1000; g.gain.value = 0.0316; o.connect(g); g.connect(no.fx); o.start(t); o.stop(t + 0.4) })
    return { saida, cadeiaDb: medir(L, R).picoDb }
  })
  const alvo = Object.fromEntries(tabela.map((t) => [t.nome, t])), problemas = []
  anota('efeito            var  pico dBFS  alvo  duração ms  tabela  começo ms')
  for (const m of med.saida) {
    const t = alvo[m.nome]
    anota(`${m.nome.padEnd(17)} ${m.i + 1}    ${n1(m.picoDb).padStart(7)}  ${String(t.alvo).padStart(4)}  ${String(Math.round(m.ms)).padStart(9)}  ${String(t.ms).padStart(6)}  ${n1(m.atrasoMs).padStart(8)}`)
    const r = []
    if (Math.abs(m.picoDb - t.alvo) > 2.5) r.push(`pico ${n1(m.picoDb)} dBFS longe do alvo ${t.alvo}`)
    if (m.picoDb > -3) r.push(`pico acima de −3 dBFS (${n1(m.picoDb)})`)
    if (m.estouros) r.push('estourou')
    if (m.ms < t.ms * 0.75 || m.ms > t.ms * 1.25) r.push(`duração ${Math.round(m.ms)} ms fora de ±25% da tabela (${t.ms} ms)`)
    if (m.atrasoMs > 15 || m.atrasoMs < -1) r.push(`começa em ${n1(m.atrasoMs)} ms (aceito até 15 ms)`)
    if (m.dif !== null && m.dif !== undefined && m.dif < 0.2) r.push(`variações quase iguais (diferença ${m.dif.toFixed(2)})`)
    if (r.length) problemas.push(`${m.nome} ${m.i + 1}: ${r.join('; ')}`)
  }
  for (const p of problemas) falha(p)
  confere(tabela.length >= 20, `${tabela.length} efeitos na tabela (mínimo 20), ${med.saida.length} variações medidas`)
  confere(problemas.length === 0, 'cada variação: pico no alvo (±2,5 dB) e abaixo de −3 dBFS, duração ±25% da tabela, começa em até 15 ms, sem estouro, variações diferentes')
  confere(Math.abs(med.cadeiaDb - -30) < 1.5, `a cadeia não muda o volume de um som baixo (entrou −30,0 dBFS, saiu ${n1(med.cadeiaDb)})`)
  const estouro = await page.evaluate(async () => { // 12 sons grandes juntos: o teto segura
    const { Som, fora, medir } = window.__m
    const { L, R } = await fora(2.5, (ctx, no, t) => { for (const n of ['fimDePartida', 'vitoria', 'chefeEntra', 'casteloRacha', 'chefeCai', 'critico', 'nivelGrande', 'recorde', 'chefeAnuncia', 'conquista', 'cartaNova', 'vidaPerdida']) Som.fabricar(ctx, no.fx, n, t, 0); window.__m.Musica.fabricar(ctx, no.mus, 'fim', 1, t, { rodada: 15 }) })
    return medir(L, R)
  })
  confere(estouro.picoDb <= -3 && estouro.estouros === 0, `12 sons grandes + música ao mesmo tempo: pico ${n1(estouro.picoDb)} dBFS (teto −3), sem estouro`)
}

// ================================================================== 3. música medida fora do tempo real
cabecalho('Música: os momentos, o motivo e as camadas')
{
  const mus = await page.evaluate(async () => {
    const { Musica, fora, medir, forca, batidas, SR, PRE } = window.__m, o = { momentos: {} }
    const hz = (m) => 440 * 2 ** ((m - 69) / 12)
    for (const { nome } of Musica.momentos()) {
      let seg = 0
      const { L, R } = await fora(12, (ctx, no, t) => { seg = Musica.fabricar(ctx, no.mus, nome, 4, t) })
      const i1 = Math.floor((PRE + seg * 32) * SR)
      o.momentos[nome] = { ...medir(L, R), batidas: batidas(L, Math.floor(PRE * SR), i1), bpm: 30 / seg }
    }
    // o motivo: só a melodia de "construir"; em cada nota, a altura certa tem de ser a mais forte entre as 7 do tom
    const notas = Musica.TEMA[0].concat(Musica.TEMA[1].map(([p, m, l]) => [p + 8, m, l])), tom = [62, 64, 66, 67, 69, 71, 72, 74, 76]
    async function ouvir(mom) {
      let seg = 0
      const { L } = await fora(6, (ctx, no, t) => { seg = Musica.fabricar(ctx, no.mus, mom, 2, t, { so: ['melodia'] }) })
      return notas.map(([p, m, len]) => { const a = Math.floor((PRE + (p + 0.25) * seg) * SR), b = Math.floor((PRE + (p + len * 0.85) * seg) * SR); return { m, forcas: Object.fromEntries([...tom, 70, 63].map((x) => [x, forca(L, a, b, hz(x))])) } })
    }
    const maior = await ouvir('construir'), bat = await ouvir('batalha')
    o.motivoMenu = (await ouvir('menu')).map((n) => +Object.entries(n.forcas).sort((a, b) => b[1] - a[1])[0][0])
    o.motivo = maior.map((n) => +Object.entries(n.forcas).sort((a, b) => b[1] - a[1])[0][0]); o.esperado = notas.map((n) => n[1])
    o.motivoBatalha = bat.map((n) => +Object.entries(n.forcas).sort((a, b) => b[1] - a[1])[0][0])
    // chefe: a mesma melodia uma oitava abaixo e em menor — o si vira si bemol
    let seg = 0
    const { L } = await fora(6, (ctx, no, t) => { seg = Musica.fabricar(ctx, no.mus, 'chefe', 1, t, { so: ['melodia'] }) })
    const a = Math.floor((PRE + 4.2 * seg) * SR), b = Math.floor((PRE + 4.9 * seg) * SR)
    o.chefe = { siBemol: forca(L, a, b, hz(58)), si: forca(L, a, b, hz(59)) }
    // crescer com as rodadas
    o.bpm1 = Musica.batidas('batalha', 1); o.bpm15 = Musica.batidas('batalha', 15)
    const r1 = await fora(5, (ctx, no, t) => { Musica.fabricar(ctx, no.mus, 'batalha', 2, t, { rodada: 1 }) }), r12 = await fora(5, (ctx, no, t) => { Musica.fabricar(ctx, no.mus, 'batalha', 2, t, { rodada: 12 }) })
    o.rms1 = medir(r1.L, r1.R).rmsDb; o.rms12 = medir(r12.L, r12.R).rmsDb
    return o
  })
  anota('momento      pico dBFS  médio dBFS  batidas/s  bpm')
  for (const [nome, m] of Object.entries(mus.momentos)) anota(`${nome.padEnd(12)} ${n1(m.picoDb).padStart(8)}  ${n1(m.rmsDb).padStart(9)}  ${n1(m.batidas).padStart(8)}  ${Math.round(m.bpm)}`)
  const ms = Object.values(mus.momentos)
  confere(ms.length >= 8 && ms.every((m) => m.picoDb > -40 && m.estouros === 0), `${ms.length} momentos de música tocam, sem estouro`)
  confere(ms.every((m) => m.picoDb <= -9 && m.rmsDb <= -22 && m.rmsDb >= -40), `música abaixo dos efeitos: picos de ${n1(Math.min(...ms.map((m) => m.picoDb)))} a ${n1(Math.max(...ms.map((m) => m.picoDb)))} dBFS (teto −9), médio de ${n1(Math.min(...ms.map((m) => m.rmsDb)))} a ${n1(Math.max(...ms.map((m) => m.rmsDb)))} dBFS (faixa −40 a −22)`)
  confere(JSON.stringify(mus.motivo) === JSON.stringify(mus.esperado), `o MOTIVO está nas notas certas em "construir": ${mus.motivo.join(' ')} (sol ré si dó lá | sol mi lá)`)
  confere(JSON.stringify(mus.motivoBatalha) === JSON.stringify(mus.esperado), 'o mesmo motivo toca na batalha (charamela)')
  confere(JSON.stringify(mus.motivoMenu) === JSON.stringify(mus.esperado), 'no menu o alaúde (corda dedilhada) toca o motivo afinado')
  confere(mus.chefe.siBemol > mus.chefe.si + 6, `chefe em menor: no lugar do si toca si bemol (${n1(mus.chefe.siBemol)} dB contra ${n1(mus.chefe.si)} dB)`)
  confere(mus.momentos.batalha.batidas > mus.momentos.construir.batidas * 1.3 || mus.momentos.batalha.rmsDb > mus.momentos.construir.rmsDb + 2, `batalha tem mais batida e peso que construir (${n1(mus.momentos.batalha.batidas)} contra ${n1(mus.momentos.construir.batidas)} batidas/s; ${n1(mus.momentos.batalha.rmsDb)} contra ${n1(mus.momentos.construir.rmsDb)} dBFS)`)
  confere(mus.bpm15 > mus.bpm1 + 10 && mus.rms12 > mus.rms1, `a música cresce com as rodadas: ${mus.bpm1} → ${mus.bpm15} batidas por minuto; rodada 12 mais cheia que a 1 (${n1(mus.rms12)} contra ${n1(mus.rms1)} dBFS)`)
}

// ================================================================== 4. ao vivo: cada botão toca
cabecalho('Ao vivo: cada botão da folha toca o seu som')
{
  const nomes = tabela.map((t) => t.nome); let faltou = []
  for (const nome of nomes) {
    await page.click(`button[data-som="${nome}"]`); await dorme(60)
    const e = await page.evaluate(() => window.__reino.Som.estado())
    if (!e.porNome[nome] || e.ultimo !== nome) faltou.push(nome)
    if (e.vozes > 12) falha(`teto de vozes passou: ${e.vozes}`)
  }
  const e = await page.evaluate(() => window.__reino.Som.estado())
  confere(faltou.length === 0, `os ${nomes.length} botões tocam (cada um contou 1 vez)` + (faltou.length ? ' — faltou: ' + faltou.join(', ') : ''))
  confere(e.ligado && e.contexto === 'running' && e.atrasoMs <= 50, `áudio ligado depois do toque; atraso do toque ao som: ${e.atrasoMs} ms (limite 50)`)
  await dorme(2800)
  const pico = await page.evaluate(() => window.__picoMax)
  confere(pico > 0.01 && pico <= 0.71, `som saiu de verdade e o pico ao vivo ficou em ${n1(20 * Math.log10(pico))} dBFS (teto −3)`)
  const fim = await page.evaluate(() => window.__reino.Som.estado().vozes)
  confere(fim === 0, 'nenhuma voz fica viva depois que os sons acabam')
}

// ================================================================== 5. teto de vozes
cabecalho('Teto de vozes')
{
  const v = await page.evaluate(async () => {
    const { Som } = window.__reino, espera = (ms) => new Promise((ok) => setTimeout(ok, ms)), o = {}
    for (let i = 0; i < 40; i++) { Som.tocar('espada'); Som.tocar('soldadoCai'); Som.tocar('flecha'); Som.tocar('choque'); await espera(40) }
    o.tropa = Som.estado().tropa; o.vozesTropa = Som.estado().vozes; await espera(1200)
    const longos = ['fimDePartida', 'vitoria', 'chefeCai', 'chefeAnuncia', 'derrota', 'recorde', 'nivelGrande', 'cartaNova', 'conquista', 'vidaPerdida', 'casteloRacha', 'chefeEntra', 'invasorChega']
    for (const n of longos) Som.tocar(n)
    o.cheio = Som.estado(); o.fracoEntrou = Som.tocar('espada'); o.forteEntrou = Som.tocar('magiaFogo'); o.depois = Som.estado()
    await espera(3200); return o
  })
  confere(v.tropa <= 6 && v.vozesTropa <= 12, `160 pedidos de som de soldado em 1,6 s viram no máximo 6 vozes de tropa (ficaram ${v.tropa})`)
  confere(v.cheio.vozes === 12 && v.cheio.roubados >= 1, `13 sons longos juntos: 12 vozes vivas, a mais fraca e antiga saiu (${v.cheio.roubados} troca)`)
  confere(v.fracoEntrou === false && v.forteEntrou === true && v.depois.vozes === 12, 'com o teto cheio de sons importantes, um som fraco (espada) não entra e um mais forte (magia) entra no lugar do menos importante')
}

// ================================================================== 6. mudo, volumes e "Menos animação"
cabecalho('Mudo, volumes guardados e "Menos animação"')
{
  await page.click('#mudo'); await dorme(250)
  const m = await page.evaluate(() => ({ e: window.__reino.Som.estado(), guardado: JSON.parse(localStorage.getItem('reino_som')), texto: document.querySelector('#mudo').textContent, tocou: window.__reino.Som.tocar('ouro') }))
  await page.evaluate(() => { window.__picoMax = 0 }); await dorme(500)
  const picoMudo = await page.evaluate(() => window.__picoMax)
  confere(m.e.mudo === true && m.e.saida < 0.001 && m.guardado.mudo === true && /off/i.test(m.texto) && picoMudo < 0.001, `mudo: a saída vai a zero (pico ${picoMudo.toFixed(4)}), o botão mostra e a escolha fica guardada`)
  await page.evaluate(() => { const { Som } = window.__reino; Som.volume('efeitos', 0.4); Som.volume('musica', 0.2) })
  await page.reload(); await dorme(300)
  const r = await page.evaluate(() => ({ e: window.__reino.Som.estado(), texto: document.querySelector('#mudo').textContent, fx: document.querySelector('#vol-efeitos').value, mu: document.querySelector('#vol-musica').value }))
  confere(r.e.mudo === true && r.e.efeitos === 0.4 && r.e.musica === 0.2 && r.fx === '0.4' && r.mu === '0.2' && /off/i.test(r.texto) && r.e.ligado === false, 'depois de recarregar: mudo e os dois volumes voltam como estavam, e nada liga sozinho')
  await page.click('#mudo'); await page.evaluate(() => { const { Som } = window.__reino; Som.volume('efeitos', 0.8); Som.volume('musica', 0.6) })
  const menos = await page.evaluate(async () => {
    const { Som } = window.__reino, o = {}
    document.querySelector('#menos').click(); o.ligou = Som.menosAnimacao()
    o.grande = Som.tocar('critico'); o.forcaGrande = Som.estado().ultimaForca; o.pequeno = Som.tocar('ouro'); o.forcaPequeno = Som.estado().ultimaForca
    document.querySelector('#menos').click(); await new Promise((ok) => setTimeout(ok, 60)); Som.tocar('casteloRacha'); o.forcaNormal = Som.estado().ultimaForca
    return o
  })
  confere(menos.ligou && menos.grande && menos.pequeno && menos.forcaGrande === 0.5 && menos.forcaPequeno === 1 && menos.forcaNormal === 1, '"Menos animação": o som continua; só o estouro grande toca 6 dB mais baixo')
}

// ================================================================== 7. música ao vivo: troca só na linha do compasso
cabecalho('Música ao vivo: troca de momento na virada do compasso')
{
  await page.click('button[data-momento="construir"]'); await dorme(1300)
  const a = await page.evaluate(() => window.__reino.Musica.estado())
  await page.click('button[data-momento="batalha"]')
  const logo = await page.evaluate(() => window.__reino.Musica.estado())
  await page.waitForFunction(() => window.__reino.Musica.estado().momento === 'batalha', null, { timeout: 6000 })
  const b = await page.evaluate(() => window.__reino.Musica.estado())
  const troca = b.trocas.at(-1), k = b.linhas.findIndex((x) => Math.abs(x - troca.em) < 1e-6), compasso = 8 * 60 / a.bpm / 2
  confere(a.tocando && a.momento === 'construir' && a.compasso >= 1, `"construir" começa a tocar depois do toque (${Math.round(a.bpm)} batidas por minuto)`)
  confere(logo.momento === 'construir' && logo.pendente === 'batalha', 'pedida a batalha, a música NÃO troca na hora: fica pedida')
  confere(k > 0 && Math.abs(b.linhas[k] - b.linhas[k - 1] - compasso) < 0.002 && troca.em > troca.pedidoEm && troca.em - troca.pedidoEm < compasso + 0.4, `a troca caiu na linha do compasso (${n1((troca.em - troca.pedidoEm) * 1000)} ms depois do pedido; compasso de ${n1(compasso * 1000)} ms)`)
  for (const mom of ['chefe', 'vitoria']) { await page.click(`button[data-momento="${mom}"]`); await page.waitForFunction((x) => window.__reino.Musica.estado().momento === x, mom, { timeout: 6000 }) }
  await dorme(500); await page.evaluate(() => { window.__picoMax = 0 }); await dorme(1500)
  const tocando = await page.evaluate(() => ({ pico: window.__picoMax, ativo: document.querySelector('button[data-momento="vitoria"]').classList.contains('ativo') }))
  confere(tocando.pico > 0.003 && tocando.pico <= 0.71 && tocando.ativo, `os 4 momentos pedidos (construir, batalha, chefe, vitória) tocam ao vivo; pico da música ${n1(20 * Math.log10(tocando.pico))} dBFS`)
  await page.click('#parar'); await dorme(700); await page.evaluate(() => { window.__picoMax = 0 }); await dorme(2600)
  const parou = await page.evaluate(() => ({ pico: window.__picoMax, e: window.__reino.Musica.estado() }))
  confere(!parou.e.tocando && parou.pico < 0.002, `parar a música: silêncio (pico ${parou.pico.toFixed(4)})`)
}

// ================================================================== 8. a rodada simulada
cabecalho('"Simulate a round": a rodada inteira')
{
  await page.evaluate(() => { window.__picoMax = 0; window.__antes = window.__reino.Som.estado().historico.length })
  await page.click('#simular')
  let maxVozes = 0, maxTropa = 0
  for (let i = 0; i < 300; i++) {
    const e = await page.evaluate(() => { const s = window.__reino.Som.estado(); return { v: s.vozes, t: s.tropa, fim: window.__sim.fim } })
    maxVozes = Math.max(maxVozes, e.v); maxTropa = Math.max(maxTropa, e.t)
    if (e.fim) break
    await dorme(100)
  }
  const s = await page.evaluate(() => ({ sim: window.__sim, hist: window.__reino.Som.estado().historico.slice(window.__antes), pico: window.__picoMax, mus: window.__reino.Musica.estado() }))
  const sons = s.hist.filter((h) => h.tipo === 'som').map((h) => h.nome), ordem = ['cartaAparece', 'cartaEscolhe', 'cartaPoe', 'invasorChega', 'marcha', 'choque', 'vitoria', 'espolio', 'espolioEscolhe', 'ouro']
  let pos = -1, emOrdem = true; for (const n of ordem) { const p = sons.indexOf(n, pos + 1); if (p < 0) { emOrdem = false; break } pos = p }
  const t = (n) => s.hist.find((h) => h.nome === n && h.tipo === 'som')?.em, batalha = (t('vitoria') - t('choque')) / 1000
  const naBatalha = s.hist.filter((h) => h.tipo === 'som' && h.em > t('choque') && h.em < t('vitoria')).length
  const musicas = s.hist.filter((h) => h.tipo === 'musica').map((h) => h.nome)
  confere(s.sim.fim && emOrdem, `a rodada tocou na ordem: cartas → escolher → pôr → invasor → marcha → choque → vitória → espólio → ouro (${sons.length} sons)`)
  confere(sons.filter((n) => n === 'cartaAparece').length === 3 && sons.filter((n) => n === 'ouro').length === 3, '3 cartas aparecem e 3 moedas caem')
  confere(batalha > 11.5 && batalha < 12.6 && naBatalha >= 25, `a batalha dura ${n1(batalha)} s e tem ${naBatalha} sons (dezenas lutando sem virar barulho)`)
  confere(maxVozes <= 12 && maxTropa <= 6, `no pior momento: ${maxVozes} vozes (teto 12), ${maxTropa} de tropa (teto 6)`)
  confere(musicas.join('>').includes('construir>batalha>vitoria'), `a música acompanhou: ${musicas.join(' → ')}`)
  confere(s.pico > 0.05 && s.pico <= 0.71, `pico da rodada inteira ao vivo: ${n1(20 * Math.log10(s.pico))} dBFS (teto −3)`)
  await page.evaluate(() => window.__reino.Musica.parar())
  await page.screenshot({ path: path.join(SAIDA, 'folha.png'), fullPage: true }); console.log('  foto: sons/reino/folha.png')
}
await page.close()

// ================================================================== 9. celular
cabecalho('Celular (390 × 844)')
{
  const ctxCel = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const p = await ctxCel.newPage(); vigiar(p)
  await p.goto(FOLHA); await p.tap('button[data-som="cartaPoe"]'); await dorme(200)
  const c = await p.evaluate(() => ({ e: window.__reino.Som.estado(), largura: document.documentElement.scrollWidth, menor: Math.min(...[...document.querySelectorAll('button')].map((b) => b.getBoundingClientRect().height)) }))
  confere(c.e.porNome.cartaPoe === 1 && c.largura <= 390 && c.menor >= 44, `toca com o dedo, sem rolagem de lado, botões com ${Math.round(c.menor)} px ou mais de altura`)
  await ctxCel.close()
}

// ================================================================== 10. amostra gravada no lugar do código
cabecalho('Amostra gravada (manifesto de teste) no lugar do código')
{
  const sr = 22050, n = Math.floor(sr * 0.12), wav = Buffer.alloc(44 + n * 2)
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 880 * i / sr) * 30000 * Math.min(1, i / 200, (n - i) / 200)), 44 + i * 2)
  const p = await ctxPc.newPage(); p.on('pageerror', (e) => erros.push('erro de página (amostra): ' + e.message))
  await p.route('**/reino/sons/manifesto.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ versao: 1, efeitos: { toque: [{ arquivo: 'falso.wav' }], ouro: [{ arquivo: 'estragado.wav' }], naoExiste: [{ arquivo: 'x.wav' }] } }) }))
  await p.route('**/reino/sons/falso.wav', (r) => r.fulfill({ contentType: 'audio/wav', body: wav }))
  await p.route('**/reino/sons/estragado.wav', (r) => r.fulfill({ contentType: 'audio/wav', body: Buffer.from('isto não é som') }))
  await p.goto(FOLHA); await p.click('button[data-som="toque"]'); await dorme(700)
  await p.evaluate(() => { window.__picoMax = 0 }); await p.click('button[data-som="toque"]'); await p.click('button[data-som="ouro"]'); await dorme(400)
  const a = await p.evaluate(() => ({ e: window.__reino.Som.estado(), pico: window.__picoMax }))
  confere(JSON.stringify(a.e.amostras) === '["toque"]' && a.e.porNome.toque === 2 && a.e.porNome.ouro === 1, 'a amostra boa toca no lugar do código; arquivo estragado e nome desconhecido caem para o código, sem erro')
  confere(a.pico > 0.03 && a.pico <= 0.71, `amostra entra no mesmo alvo de pico (${n1(20 * Math.log10(a.pico))} dBFS com os dois sons)`)
  await p.close()
}

// ================================================================== 10b. amostras reais do manifesto (arquivo por arquivo)
cabecalho('Amostras reais do manifesto: carrega, pico, duração, começo sem atraso, tamanho')
{
  const dirSons = path.join(PASTA, 'sons'), man = JSON.parse(fs.readFileSync(path.join(dirSons, 'manifesto.json'), 'utf8'))
  const alvos = { choque: -11, marcha: -13, casteloRacha: -7, muralha: -11, chefeEntra: -7, flecha: -14, espolio: -11, recorde: -8, golpeBicada: -13, golpeFrigideira: -12, golpeMordida: -13, golpePortada: -12, chefeTomba: -8, pisao: -7 } // R35: as 6 amostras novas entram na mesma régua
  const arqs = []; for (const [nome, lista] of Object.entries(man.efeitos || {})) for (const it of lista) arqs.push({ nome, arquivo: it.arquivo })
  if (arqs.length === 0) console.log('  (manifesto vazio: nada a conferir)')
  else {
    const p = await ctxPc.newPage(); vigiar(p); await p.goto(FOLHA)
    const medidas = await p.evaluate(async (lista) => {
      const ac = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100), out = []
      for (const it of lista) {
        try {
          const r = await fetch('./sons/' + it.arquivo); if (!r.ok) { out.push({ ...it, erro: 'http ' + r.status }); continue }
          const b = await ac.decodeAudioData(await r.arrayBuffer()), d = b.getChannelData(0); let pico = 0
          for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > pico) pico = Math.abs(d[i])
          const lim = pico * 0.0316; let ini = -1; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > lim) { ini = i; break }
          out.push({ ...it, canais: b.numberOfChannels, dur: b.duration * 1000, pico, iniMs: ini / b.sampleRate * 1000 })
        } catch (e) { out.push({ ...it, erro: String(e) }) }
      }
      return out
    }, arqs)
    for (const m of medidas) {
      const tam = fs.statSync(path.join(dirSons, m.arquivo)).size, db = m.pico > 0 ? 20 * Math.log10(m.pico) : -99
      confere(!m.erro && m.canais === 1 && m.dur >= 150 && m.dur <= 1600 && db <= -3 && Math.abs(db - alvos[m.nome]) <= 2.5 && m.iniMs <= 20 && tam <= 300 * 1024,
        `${m.arquivo}: carrega, mono, ${n1(m.dur)} ms, pico ${n1(db)} dBFS (alvo ${alvos[m.nome]}), começa em ${n1(m.iniMs)} ms, ${Math.round(tam / 1024)} KB${m.erro ? ' ERRO ' + m.erro : ''}`)
    }
    const total = fs.readdirSync(dirSons).reduce((s, f) => s + fs.statSync(path.join(dirSons, f)).size, 0)
    confere(total < 3 * 1024 * 1024, `pasta public/reino/sons/ com ${Math.round(total / 1024)} KB (limite 3 MB)`)
    const porEv = {}; for (const m of medidas) porEv[m.nome] = (porEv[m.nome] || 0) + 1
    confere(Object.values(porEv).every((k) => k >= 1 && k <= 3), 'cada evento do manifesto tem de 1 a 3 variações: ' + JSON.stringify(porEv))
    await p.close()
  }
}

// ================================================================== 11. em subpasta
cabecalho('Em subpasta (caminhos relativos)')
{
  const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mp3': 'audio/mpeg' }
  const PREFIXO = '/jogos/um/dois/'
  const sub = createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname), arq = path.join(PASTA, u.slice(PREFIXO.length))
    if (!u.startsWith(PREFIXO) || !arq.startsWith(PASTA + path.sep) || !fs.existsSync(arq) || !fs.statSync(arq).isFile()) { res.writeHead(404); return res.end('não') }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' }); res.end(fs.readFileSync(arq))
  })
  await new Promise((ok) => sub.listen(0, '127.0.0.1', ok))
  const p = await ctxPc.newPage(); vigiar(p)
  await p.goto(`http://127.0.0.1:${sub.address().port}${PREFIXO}sons.html`)
  await p.click('button[data-som="vitoria"]'); await p.click('button[data-momento="batalha"]'); await dorme(900)
  const e = await p.evaluate(() => ({ s: window.__reino.Som.estado(), m: window.__reino.Musica.estado() }))
  confere(e.s.porNome.vitoria === 1 && e.m.tocando && e.m.momento === 'batalha', 'a folha abre, toca efeito e música servida de /jogos/um/dois/')
  await p.close(); sub.close()
}

// ================================================================== R35 — o som da tela nova
// (12) ambiente por trecho, medido fora do tempo real
cabecalho('R35 — ambiente por trecho da estrada (fabricado por código, medido fora do tempo real)')
{
  const p = await ctxPc.newPage(); vigiar(p); await p.goto(FOLHA); await instalarMedidor(p)
  const amb = await p.evaluate(async () => {
    const { Som, fora, medir, forca, diferenca, SR, PRE } = window.__m, o = {}, ondas = {}
    for (const { nome } of Som.ambientes()) {
      const { L, R } = await fora(12, (ctx, no, t) => { Som.ambientar(ctx, no.amb, nome, t, 12, 3) })
      const i0 = Math.floor(PRE * SR), f = (hz) => forca(L, i0, L.length, hz); let soma = 0; for (let i = i0; i < L.length; i++) soma += L[i] * L[i]
      o[nome] = { ...medir(L, R), rmsTudo: 20 * Math.log10(Math.sqrt(soma / (L.length - i0)) + 1e-9), grilo: f(4400), b3000: f(3000), bigorna: f(1650), sino: f(392), pios: Math.max(f(3300), f(3600), f(3900), f(4200)) }
      ondas[nome] = L
    }
    const nomes = Object.keys(ondas); let dif = 9
    for (let a = 0; a < nomes.length; a++) for (let b = a + 1; b < nomes.length; b++) dif = Math.min(dif, diferenca(ondas[nomes[a]], ondas[nomes[b]]))
    // dois pedaços seguidos (como ao vivo): na emenda o leito de vento não pode abrir buraco (o menor volume em janelas de 100 ms é o leito sozinho)
    const { L } = await fora(15, (ctx, no, t) => { Som.ambientar(ctx, no.amb, 'manha', t, 8, 1); Som.ambientar(ctx, no.amb, 'manha', t + 7.6, 8, 2) })
    const menor = (a, b) => { let m = 9; for (let i = Math.floor((PRE + a) * SR); i + 4800 <= Math.floor((PRE + b) * SR); i += 2400) { let s = 0; for (let k = 0; k < 4800; k++) s += L[i + k] * L[i + k]; m = Math.min(m, Math.sqrt(s / 4800)) } return 20 * Math.log10(m + 1e-9) }
    return { o, dif, emenda: { antes: menor(1, 7), na: menor(7.4, 8.2), depois: menor(8.6, 14) } }
  })
  anota('ambiente   pico dBFS  médio dBFS  grilo 4,4k  bigorna 1,65k  sino 392  pios 3–4k')
  for (const [n, m] of Object.entries(amb.o)) anota(`${n.padEnd(10)} ${n1(m.picoDb).padStart(8)}  ${n1(m.rmsTudo).padStart(9)}  ${n1(m.grilo).padStart(9)}  ${n1(m.bigorna).padStart(12)}  ${n1(m.sino).padStart(8)}  ${n1(m.pios).padStart(8)}`)
  const A = amb.o, todos = Object.values(A)
  confere(todos.length === 4 && todos.every((m) => m.estouros === 0 && m.picoDb <= -20 && m.picoDb >= -42 && m.rmsTudo <= -36 && m.rmsTudo >= -56), `4 ambientes, todos bem baixos: pico de ${n1(Math.min(...todos.map((m) => m.picoDb)))} a ${n1(Math.max(...todos.map((m) => m.picoDb)))} dBFS (teto −20), médio de ${n1(Math.min(...todos.map((m) => m.rmsTudo)))} a ${n1(Math.max(...todos.map((m) => m.rmsTudo)))} dBFS (abaixo da música, que fica de −31 a −26)`)
  confere(A.noite.grilo >= A.manha.grilo + 10 && A.noite.grilo >= A.noite.b3000 + 10, `noite: o grilo (4,4 kHz) está lá (${n1(A.noite.grilo)} dB; na manhã ${n1(A.manha.grilo)} dB)`)
  confere(A.manha.pios >= A.noite.pios + 8 && A.manha.pios >= A.porDoSol.pios + 8, `manhã: os pássaros (3–4 kHz) estão lá (${n1(A.manha.pios)} dB; à noite ${n1(A.noite.pios)} dB)`)
  confere(A.tarde.bigorna >= A.manha.bigorna + 8 && A.tarde.bigorna >= A.noite.bigorna + 8, `tarde na vila: a bigorna de longe (1,65 kHz) está lá (${n1(A.tarde.bigorna)} dB; na manhã ${n1(A.manha.bigorna)} dB)`)
  confere(A.porDoSol.sino >= A.manha.sino + 8 && A.porDoSol.sino >= A.noite.sino + 8, `pôr do sol: o sino da torre (sol, 392 Hz) está lá (${n1(A.porDoSol.sino)} dB; na manhã ${n1(A.manha.sino)} dB)`)
  confere(amb.dif >= 0.5, `os 4 ambientes são diferentes entre si (menor diferença ${amb.dif.toFixed(2)})`)
  confere(amb.emenda.na >= amb.emenda.antes - 4.5 && Math.abs(amb.emenda.depois - amb.emenda.antes) <= 3, `a emenda entre dois pedaços (ao vivo, a cada 7,6 s) não abre buraco no leito: ${n1(amb.emenda.antes)} dBFS antes, ${n1(amb.emenda.na)} na emenda, ${n1(amb.emenda.depois)} depois`)
  // posição estéreo leve, medida
  const st = await p.evaluate(async () => {
    const { Som, fora, db } = window.__m, r = (x) => { let s = 0; for (const v of x) s += v * v; return db(Math.sqrt(s / x.length)) }
    const a = await fora(0.4, (ctx, no, t) => Som.fabricar(ctx, no.fx, 'golpeCorte', t, 0, { pan: Som.PAN_MAX })), b = await fora(0.4, (ctx, no, t) => Som.fabricar(ctx, no.fx, 'golpeCorte', t, 0, { pan: -Som.PAN_MAX })), c = await fora(0.4, (ctx, no, t) => Som.fabricar(ctx, no.fx, 'golpeCorte', t, 0, {}))
    return { dir: r(a.R) - r(a.L), esq: r(b.L) - r(b.R), meio: r(c.R) - r(c.L), max: Som.PAN_MAX }
  })
  confere(st.dir >= 3 && st.dir <= 14 && st.esq >= 3 && st.esq <= 14 && Math.abs(st.meio) < 0.5, `posição estéreo leve: na ponta direita o lado direito fica ${n1(st.dir)} dB acima do esquerdo (na esquerda ${n1(st.esq)} dB; no meio ${n1(st.meio)}) — nunca só num lado`)
  await p.close()
}

// (13) ao vivo na folha
cabecalho('R35 — ao vivo: ambiente cruza em 1,5 s · golpe agrupado · variação · hit-stop · ducking · mudo/volume · Reduced motion')
{
  const p = await ctxPc.newPage(); vigiar(p); await p.goto(FOLHA); await p.click('h1')
  await p.evaluate(() => { const { Som, Musica } = window.__reino; Som.mudo(false); Som.volume('efeitos', 0.8); Som.volume('musica', 0.6); Som.menosAnimacao(false); Musica.parar() })
  const lista = await p.evaluate(() => ({ som: [...document.querySelectorAll('button[data-som]')].map((b) => ({ nome: b.dataset.som, quando: b.querySelector('small.q')?.textContent || '' })), tabela: window.__reino.Som.nomes(), amb: document.querySelectorAll('button[data-ambiente]').length }))
  confere(lista.som.length === lista.tabela.length && lista.tabela.every((n) => lista.som.some((b) => b.nome === n && b.quando.length >= 8)) && lista.amb === 5, `a folha lista os ${lista.tabela.length} sons do motor, cada um com o evento que o dispara, e os 4 ambientes + desligar`)
  confere(lista.tabela.length >= 70, `${lista.tabela.length} efeitos no motor (37 antigos + os da tela nova)`)
  await dorme(1500) // as amostras carregam
  const amostras = await p.evaluate(() => ({ e: window.__reino.Som.estado().amostras, marcados: [...document.querySelectorAll('button[data-amostra]')].map((b) => b.dataset.som) }))
  confere(['golpeBicada', 'golpeFrigideira', 'golpeMordida', 'golpePortada', 'pisao', 'chefeTomba'].every((n) => amostras.e.includes(n) && amostras.marcados.includes(n)), `as amostras novas carregam e a folha marca quais sons são gravados (${amostras.marcados.length})`)
  // ---- ambiente
  await p.click('button[data-ambiente="manha"]'); await dorme(1800)
  const a1 = await p.evaluate(async () => { const { Som } = window.__reino; let pico = 0; for (let i = 0; i < 50; i++) { pico = Math.max(pico, Som.picoAoVivo()); await new Promise((ok) => setTimeout(ok, 50)) } return { e: Som.estado(), pico } })
  confere(a1.e.ambiente === 'manha' && a1.e.ambienteGanho > 0.95 && a1.pico > 0.0003 && a1.pico < 0.1 && a1.e.vozes === 0, `ambiente "manha" toca sozinho, baixo (pico ao vivo ${n1(20 * Math.log10(a1.pico))} dBFS), sem gastar voz de efeito`)
  await p.click('button[data-ambiente="noite"]'); await dorme(750)
  const a2 = await p.evaluate(() => window.__reino.Som.estado())
  confere(a2.ambiente === 'noite' && a2.ambienteSaindo?.nome === 'manha' && a2.ambienteGanho > 0.25 && a2.ambienteGanho < 0.75 && a2.ambienteSaindo.ganho > 0.25 && a2.ambienteSaindo.ganho < 0.75, `trocar de trecho cruza um ambiente no outro: a 0,75 s a noite está em ${a2.ambienteGanho.toFixed(2)} e a manhã em ${(a2.ambienteSaindo?.ganho ?? 0).toFixed(2)}`)
  await dorme(1300)
  const a3 = await p.evaluate(() => window.__reino.Som.estado())
  confere(a3.ambiente === 'noite' && a3.ambienteGanho > 0.95 && a3.ambienteSaindo === null, 'em 1,5 s o cruzamento acabou: só a noite toca')
  await p.click('button[data-ambiente=""]'); await dorme(2000)
  const a4 = await p.evaluate(() => ({ e: window.__reino.Som.estado(), pico: window.__reino.Som.picoAoVivo() }))
  confere(a4.e.ambiente === null && a4.pico < 0.0008, `ambiente desligado: silêncio em 2 s (pico ${a4.pico.toFixed(4)})`)
  // ---- golpe agrupado, variação, estéreo, espera
  const g = await p.evaluate(async () => {
    const { Som } = window.__reino, espera = (ms) => new Promise((ok) => setTimeout(ok, ms)), o = {}
    let e0 = Som.estado()
    for (let i = 0; i < 5; i++) { Som.golpe(0, { grupo: 7 }); await espera(8) } // 5 golpes do MESMO pelotão em ~40 ms
    let e1 = Som.estado(); o.grupo = { tocados: e1.tocados - e0.tocados, agrupados: e1.agrupados - e0.agrupados, golpes: e1.golpes - e0.golpes, n: e1.ultimoGolpe.n, nome: e1.ultimoGolpe.nome, vozes: e1.vozes }
    await espera(700); e0 = Som.estado()
    for (let i = 0; i < 5; i++) { Som.golpe([0, 1, 4, 7, 8][i], { grupo: 100 + i }); await espera(50) } // pelotões e gestos diferentes, 50 ms entre eles
    e1 = Som.estado(); o.solto = { tocados: e1.tocados - e0.tocados, nomes: ['golpeCorte', 'golpeEstocada', 'golpeEsmaga', 'golpePortada', 'golpeInvestida'].map((n) => (e1.porNome[n] || 0) - (e0.porNome[n] || 0)) }
    await espera(700)
    o.toms = []; o.forcas = []
    for (let i = 0; i < 16; i++) { Som.golpe(0, { grupo: 200 + i, forca: 1 }); const e = Som.estado(); o.toms.push(e.ultimoTom); o.forcas.push(e.ultimaForca); await espera(120) }
    await espera(300); Som.tocar('golpeEsmaga', { pan: 1 }); o.panDir = Som.estado().ultimoPan; await espera(80); Som.tocar('golpeInvestida', { pan: -0.5 }); o.panEsq = Som.estado().ultimoPan
    o.gestos = Som.GOLPES.slice(); o.janela = Som.JANELA_GRUPO
    // som com espera (o grito cai 620 ms depois, no pulo): silêncio antes, som depois
    await espera(900); let antes = 0, depois = 0; Som.tocar('gritoTropa', { em: 0.62 })
    for (let i = 0; i < 25; i++) { antes = Math.max(antes, Som.picoAoVivo()); await espera(20) }
    for (let i = 0; i < 30; i++) { await espera(20); depois = Math.max(depois, Som.picoAoVivo()) }
    o.espera = { antes, depois }
    return o
  })
  confere(g.grupo.golpes === 5 && g.grupo.tocados === 1 && g.grupo.agrupados === 4 && g.grupo.n === 5 && g.grupo.nome === 'golpeCorte' && g.grupo.vozes === 1, `5 golpes do mesmo pelotão em ${g.janela} ms viram UM som só, mais forte (${g.grupo.tocados} voz, ${g.grupo.agrupados} juntados)`)
  confere(g.solto.tocados === 5 && g.solto.nomes.every((n) => n === 1), '5 pelotões com gestos diferentes, 50 ms entre eles: cada um soa com o som do seu gesto (corte, estocada, esmaga, portada, investida)')
  confere(g.gestos.length === 10 && new Set(g.gestos).size === 10, `os 10 gestos têm som próprio: ${g.gestos.join(', ')}`)
  { const d = new Set(g.toms.map((t) => t.toFixed(2))).size, min = Math.min(...g.toms), max = Math.max(...g.toms), fmin = Math.min(...g.forcas), fmax = Math.max(...g.forcas)
    confere(d >= 12 && min >= -2 && max <= 2 && max - min >= 1 && fmin >= 0.74 && fmax <= 1.13 && fmax - fmin >= 0.1, `o mesmo golpe 16 vezes nunca sai igual: altura de ${min.toFixed(1)} a ${max.toFixed(1)} semitons (±2), força de ${n1(20 * Math.log10(fmin))} a ${n1(20 * Math.log10(fmax))} dB`) }
  confere(Math.abs(g.panDir - 0.6) < 1e-6 && Math.abs(g.panEsq - -0.3) < 1e-6, `posição pelo X da tela entra leve: ponta direita = ${g.panDir}, meio-esquerda = ${g.panEsq} (teto ±0,6)`)
  confere(g.espera.antes < 0.004 && g.espera.depois > 0.02, `som com espera (o grito no pulo, 620 ms depois): silêncio antes (${g.espera.antes.toFixed(4)}), som na hora marcada (${g.espera.depois.toFixed(3)})`)
  // ---- hit-stop: corte curto de agudo
  const h = await p.evaluate(async () => { const { Som } = window.__reino, espera = (ms) => new Promise((ok) => setTimeout(ok, ms)); const antes = Som.estado().corteHz; const ok = Som.hitStop(60); await espera(35); const durante = Som.estado().corteHz; await espera(450); const e = Som.estado(); return { ok, antes, durante, depois: e.corteHz, cortes: e.cortes, ms: e.ultimoCorte.ms } })
  confere(h.ok && h.antes > 15000 && h.durante < 2500 && h.depois > 15000 && h.cortes === 1 && h.ms === 60, `hit-stop: o agudo some (corte em ${Math.round(h.durante)} Hz aos 35 ms) e volta (${Math.round(h.depois)} Hz) — 60 ms`)
  // ---- ducking: chefe caindo e faixa de recorde mais fundo que os 6 dB de um som grande
  await p.click('button[data-momento="batalha"]'); await dorme(700)
  const d = await p.evaluate(async () => {
    const { Som } = window.__reino, espera = (ms) => new Promise((ok) => setTimeout(ok, ms)), o = {}
    o.livre = Som.estado().duckAgora
    Som.tocar('vitoria'); await espera(250); o.grande = Som.estado().duckAgora; await espera(3200)
    Som.tocar('chefeCai'); await espera(250); o.chefe = Som.estado().duckAgora; await espera(1900); o.chefeSegura = Som.estado().duckAgora; await espera(1800); o.chefeVolta = Som.estado().duckAgora
    Som.tocar('recorde'); await espera(250); o.recorde = Som.estado().duckAgora; await espera(2800); o.recordeVolta = Som.estado().duckAgora
    o.tabela = Som.tabela().filter((t) => t.duck).map((t) => t.nome)
    return o
  })
  confere(d.livre > 0.97 && Math.abs(d.grande - 0.5) < 0.06, `som grande comum: a música abaixa 6 dB (${d.grande.toFixed(2)})`)
  confere(d.chefe < 0.36 && d.chefeSegura < 0.4 && d.chefeVolta > 0.9, `chefe caindo: a música abaixa ${n1(-20 * Math.log10(d.chefe))} dB, segura a queda inteira (${d.chefeSegura.toFixed(2)} aos 2,1 s) e volta (${d.chefeVolta.toFixed(2)})`)
  confere(d.recorde < 0.41 && d.recordeVolta > 0.9 && ['chefeCai', 'recorde'].every((n) => d.tabela.includes(n)), `faixa de recorde: a música abaixa ${n1(-20 * Math.log10(d.recorde))} dB e volta (${d.recordeVolta.toFixed(2)})`)
  // ---- luta cheia: 150 unidades batendo (250 golpes por segundo pedidos) + música + ambiente + sons grandes
  await p.click('button[data-ambiente="tarde"]')
  const cheia = await p.evaluate(async () => {
    const { Som } = window.__reino, espera = (ms) => new Promise((ok) => setTimeout(ok, ms)), o = { maxVozes: 0, maxTropa: 0, pedidos: 0 }
    await espera(1200); window.__picoMax = 0
    const e0 = Som.estado(), t0 = performance.now(); let k = 0
    while (performance.now() - t0 < 4000) {
      for (let i = 0; i < 5; i++) { const u = (k++ * 7919) % 150; Som.golpe(u % 10, { grupo: u % 12, pan: (u % 21) / 10 - 1, forca: 0.8 + (u % 5) / 10 }); o.pedidos++ }
      if (k % 300 === 0) { Som.tocar('critico'); Som.hitStop(45) } if (k % 700 === 0) Som.tocar('explosao'); if (k === 1000) Som.tocar('pisao')
      const e = Som.estado(); o.maxVozes = Math.max(o.maxVozes, e.vozes); o.maxTropa = Math.max(o.maxTropa, e.tropa)
      await espera(20)
    }
    const e1 = Som.estado(); o.seg = (performance.now() - t0) / 1000; o.novos = e1.tocados - e0.tocados; o.agrupados = e1.agrupados - e0.agrupados; o.recusados = e1.recusados - e0.recusados
    await espera(1500); o.pico = window.__picoMax; o.fim = Som.estado().vozes
    return o
  })
  confere(cheia.pedidos >= 600 && cheia.maxVozes <= 12 && cheia.maxTropa <= 6, `luta cheia (150 unidades, ${cheia.pedidos} golpes pedidos em ${n1(cheia.seg)} s): no pior momento ${cheia.maxVozes} vozes (teto 12), ${cheia.maxTropa} de tropa (teto 6)`)
  confere(cheia.novos / cheia.seg <= 27 && cheia.novos / cheia.seg >= 6, `sem metralhadora: ${n1(cheia.novos / cheia.seg)} sons novos por segundo (teto 27); ${cheia.agrupados} golpes juntados no som que já tocava, ${cheia.recusados} barrados pelo teto`)
  confere(cheia.pico > 0.05 && cheia.pico <= 0.71, `pico ao vivo da luta cheia com música, ambiente, crítico, explosão e pisão: ${n1(20 * Math.log10(cheia.pico))} dBFS (teto −3)`)
  // ---- a luta simulada da folha (a ordem em que a tela dispara)
  await p.evaluate(() => { window.__reino.Som.ambiente(null); window.__picoMax = 0 }); await dorme(1200)
  const hist0 = await p.evaluate(() => window.__reino.Som.estado().tocados)
  await p.click('#demo-luta')
  await p.waitForFunction(() => window.__luta.fim === true, null, { timeout: 30000 })
  const luta = await p.evaluate(() => ({ e: window.__reino.Som.estado(), fases: window.__luta.fases, pico: window.__picoMax }))
  { const pn = luta.e.porNome, quer = ['marcha', 'poeira', 'gritoTropa', 'choque', ...['golpeCorte', 'golpeEstocada', 'golpeFrigideira', 'golpeBicada', 'golpeEsmaga', 'golpeMordida', 'golpePortada', 'golpeInvestida', 'golpeBarrigada'], 'arcoSolta', 'flechaFinca', 'arremesso', 'splat', 'soldadoCai', 'fumaca', 'grupoCai', 'explosao', 'pisao', 'critico', 'chefeCai', 'chefeJoelho', 'chefeTomba', 'festaTropa']
    const faltou = quer.filter((n) => !pn[n])
    confere(faltou.length === 0 && luta.fases.length >= 9 && luta.e.tocados - hist0 >= 28, `"Simulate a fight" toca a luta inteira da cena nova (${luta.e.tocados - hist0} sons, ${luta.fases.length} fases)` + (faltou.length ? ' — faltou: ' + faltou.join(', ') : ''))
    confere(luta.pico > 0.05 && luta.pico <= 0.71, `pico da luta simulada ao vivo: ${n1(20 * Math.log10(luta.pico))} dBFS (teto −3)`) }
  await p.evaluate(() => window.__reino.Musica.parar()); await dorme(1500)
  // ---- mudo e volumes valem para os novos
  const mv = await p.evaluate(async () => {
    const { Som } = window.__reino, espera = (ms) => new Promise((ok) => setTimeout(ok, ms)), o = {}
    const ouvir = async (ms) => { let p = 0; for (let i = 0; i < ms / 20; i++) { p = Math.max(p, Som.picoAoVivo()); await espera(20) } return p }
    Som.golpe(4, { grupo: 900 }); Som.tocar('pisao'); o.normal = await ouvir(400); await espera(1500)
    Som.mudo(true); await espera(120); o.tocouMudo = Som.golpe(4, { grupo: 901 }); Som.tocar('pisao'); Som.tocar('cartaVira'); Som.ambiente('manha'); o.mudo = await ouvir(600); Som.mudo(false); Som.ambiente(null); await espera(2200)
    Som.volume('efeitos', 0); await espera(150); Som.golpe(2, { grupo: 902 }); Som.tocar('chefeTomba'); Som.tocar('rankUp'); o.zero = await ouvir(500); await espera(1200)
    Som.volume('efeitos', 0.4); await espera(150); Som.tocar('pisao'); o.meio = await ouvir(400); Som.volume('efeitos', 0.8); await espera(1500)
    // Reduced motion NÃO tira som: tudo continua tocando; só o estouro grande fica 6 dB abaixo
    Som.menosAnimacao(true); const e0 = Som.estado()
    o.menosGolpe = Som.golpe(2, { grupo: 903, forca: 1 }); o.forcaGolpe = Som.estado().ultimaForca; await espera(60)
    o.menosVira = Som.tocar('cartaVira'); await espera(60); o.menosPisao = Som.tocar('pisao'); o.forcaPisao = Som.estado().ultimaForca
    o.menosCorte = Som.hitStop(45); o.menosAmb = Som.ambiente('noite'); await espera(400); const e1 = Som.estado()
    o.menosTocados = e1.tocados - e0.tocados; o.menosAmbiente = e1.ambiente; o.menosPico = await ouvir(300)
    Som.menosAnimacao(false); Som.ambiente(null)
    return o
  })
  confere(mv.normal > 0.05 && mv.tocouMudo === true && mv.mudo < 0.001, `mudo vale para os sons novos e para o ambiente (pico ${mv.mudo.toFixed(4)}; sem mudo ${mv.normal.toFixed(3)})`)
  confere(mv.zero < 0.001 && mv.meio > 0.005 && mv.meio < mv.normal * 0.6, `volume de efeitos vale para os novos: em 0 silêncio (${mv.zero.toFixed(4)}), em 40% mais baixo (${mv.meio.toFixed(3)} contra ${mv.normal.toFixed(3)})`)
  confere(mv.menosGolpe && mv.menosVira && mv.menosPisao && mv.menosCorte && mv.menosAmb && mv.menosTocados === 3 && mv.menosAmbiente === 'noite' && mv.forcaGolpe >= 0.74 && mv.forcaPisao === 0.5 && mv.menosPico > 0.01, `Reduced motion NÃO tira som: golpe, carta, pisão, hit-stop e ambiente continuam (golpe na força ${mv.forcaGolpe.toFixed(2)}; só o estouro grande 6 dB abaixo: ${mv.forcaPisao})`)
  await p.close()
}

// (14) no jogo de verdade
const JOGO = base + '/public/reino/'
const KJ = (pg, fn, arg) => pg.evaluate(`(${fn})(window.__keepmile, ${JSON.stringify(arg ?? null)})`)
cabecalho('R35 — no jogo: cada evento da tela nova dispara o som certo, no quadro do impacto')
{
  const ctxJ = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' })
  const j = await ctxJ.newPage(); vigiar(j)
  await j.goto(JOGO + '?teste=1&nova=1&semente=som-r35'); await j.waitForSelector('#bt-carta2', { timeout: 20000 })
  const antes = await KJ(j, (k) => k.som())
  confere(antes.ligado === false && antes.ambientePedido === 'manha', 'antes do primeiro toque nada liga; o ambiente do trecho (manhã nos campos) só fica pedido')
  await j.keyboard.press('Shift'); await dorme(400)
  const pn = () => KJ(j, (k) => k.som().porNome)
  // cartas que viram em cascata (espera a revelação da abertura acabar: um tique dela caindo entre as duas leituras entrava na conta — falhou 1 vez em 3 no R43)
  await j.waitForFunction(() => window.__keepmile.modelo().maoRevelada === true, null, { timeout: 5000 }); await dorme(200)
  let a = await pn(); await KJ(j, (k) => k.maoNova()); await dorme(1300); let b = await pn()
  confere((b.cartaVira || 0) - (a.cartaVira || 0) === 3 && (b.toque || 0) - (a.toque || 0) === 3, `as 3 cartas que viram: papel virando (cartaVira) + a nota que sobe, uma vez por carta (cartaVira ${(b.cartaVira || 0) - (a.cartaVira || 0)}, toque ${(b.toque || 0) - (a.toque || 0)})`)
  confere((await KJ(j, (k) => k.som().ambiente)) === 'manha', 'depois do toque o ambiente do trecho toca (rodada 1: manhã nos campos)')
  // menu
  a = await pn(); await j.click('#bt-menu'); await dorme(300); const abriu = await pn(); await j.keyboard.press('Escape'); await dorme(300); b = await pn()
  confere((abriu.menuAbre || 0) - (a.menuAbre || 0) === 1 && (b.menuFecha || 0) - (a.menuFecha || 0) === 1, 'menu / Settings: som ao abrir e ao fechar')
  // ---- uma luta de verdade, do começo ao fim, amostrada quadro a quadro: estrela de impacto × som do golpe
  await j.evaluate(() => {
    const k = window.__keepmile, log = []; window.__sinc = log; let q = 0
    ;(function f() { q++; const s = k.som(), m = k.med(); log.push([q, m.estrelas, s.golpes, s.vozes, s.tropa, m.pisoes, s.porNome.pisao || 0, m.chefeEtapas.length, (s.porNome.chefeJoelho || 0) + (s.porNome.chefeTomba || 0), s.tocados]); if (log.length < 9000) requestAnimationFrame(f) })()
  })
  /** Para cada quadro em que a contagem da coluna `ci` (imagem) subiu, o som da coluna `cs` subiu no mesmo quadro (±1)? */
  const sincronia = (log, ci, cs) => { let n = 0, fora = 0, mesmo = 0; for (let i = 1; i < log.length; i++) if (log[i][ci] > log[i - 1][ci]) { n++; const d = (x) => (log[x]?.[cs] ?? 0) - (log[x - 1]?.[cs] ?? 0); if (d(i) > 0) mesmo++; else if (!(d(i - 1) > 0 || d(i + 1) > 0)) fora++ } return { n, fora, mesmo } }
  a = await pn()
  await KJ(j, (k) => { k.zerarMedidasDaCena(); k.roboAteLutar() }); await j.click('#bt-lutar')
  await j.waitForFunction(() => ['vitoria', 'derrota', 'espolio', 'fim'].includes(window.__keepmile.fase()), null, { timeout: 60000 })
  await dorme(2200)
  let log = await j.evaluate(() => { const l = window.__sinc.slice(); window.__sinc.length = 0; return l }); b = await pn()
  const dif = (n) => (b[n] || 0) - (a[n] || 0), golpesTocados = () => Object.keys(b).filter((n) => /^golpe|^impacto$|^flechaFinca$|^splat$/.test(n)).reduce((s, n) => s + dif(n), 0)
  let s1 = sincronia(log, 1, 2)
  confere(['invasorChega', 'marcha', 'poeira', 'gritoTropa', 'choque'].every((n) => dif(n) >= 1), 'a luta abre com chegada, marcha, poeira no portão, grito da tropa e o primeiro choque')
  confere(s1.n >= 3 && s1.fora === 0 && s1.mesmo === s1.n, `IMPACTO e SOM no mesmo quadro: ${s1.n} quadros com estrela de impacto, ${s1.mesmo} com o som do golpe no MESMO quadro, ${s1.fora} fora de ±1`)
  confere(golpesTocados() >= 3, `os golpes soam pelo gesto de quem bate (${Object.keys(b).filter((n) => /^golpe|^impacto$|^flechaFinca$|^splat$/.test(n) && dif(n) > 0).map((n) => n + '×' + dif(n)).join(', ')})`)
  const fimLuta = await KJ(j, (k) => k.fase())
  confere(fimLuta === 'derrota' ? dif('recuoTropa') === 1 : dif('festaTropa') === 1, fimLuta === 'derrota' ? 'derrota: o reino recua com som (recuoTropa)' : 'vitória: a comemoração dos dois pulos tem som (festaTropa)')
  if (fimLuta !== 'derrota') confere(dif('ouroTique') >= 1 && dif('ouro') >= 1 && dif('ouro') <= 2, `ouro contando: ${dif('ouroTique')} tiques curtos e ${dif('ouro')} moeda cheia no fim (antes: uma moeda inteira por passo)`)
  // ---- o chefe: pisão no quadro em que pousa, queda em etapas, festa
  await KJ(j, (k) => { k.limparFestas(); k.zerarMedidasDaCena() }); a = await pn(); const cortes0 = await KJ(j, (k) => k.som().cortes)
  await j.evaluate(() => { window.__sinc.length = 0 })
  await KJ(j, (k) => k.chefeCai())
  await j.waitForFunction(() => !window.__keepmile.batalha().ativa, null, { timeout: 90000 }); await dorme(600)
  log = await j.evaluate(() => { const l = window.__sinc.slice(); window.__sinc.length = 0; return l }); b = await pn()
  const sP = sincronia(log, 5, 6), sQ = sincronia(log, 7, 8), eC = await KJ(j, (k) => ({ s: k.som(), med: k.med() }))
  confere(dif('pisao') === 1 && sP.n === 1 && sP.mesmo === 1, `o PISÃO do chefe soa no quadro em que ele pousa (${sP.mesmo} de ${sP.n} no mesmo quadro), não no nascer`)
  confere(dif('chefeCai') === 1 && dif('chefeJoelho') === 1 && dif('chefeTomba') === 1 && eC.med.chefeEtapas.includes(2) && eC.med.chefeEtapas.includes(4), `a queda do chefe em etapas tem som em cada uma: golpe final (chefeCai), ajoelha (chefeJoelho) e tomba (chefeTomba) — etapas ${eC.med.chefeEtapas.join('>')}`)
  { let ok = 0; for (let i = 1; i < log.length; i++) if (log[i][8] > log[i - 1][8] && (log[i][7] > log[i - 1][7] || log[i - 1][7] > (log[i - 2]?.[7] ?? 0) || (log[i + 1]?.[7] ?? 0) > log[i][7])) ok++
    confere(ok === 2, `ajoelhar e tombar soam no quadro da etapa (${ok} de 2 em ±1 quadro)`) }
  confere(eC.s.duck && eC.s.cortes > cortes0, `chefe: a música abaixou (para ${eC.s.duck?.ganho}) e a parada de impacto cortou o agudo ${eC.s.cortes - cortes0} vez(es)`)
  confere(dif('festaTropa') === 1 && dif('chefeEntra') === 0, 'vitória sobre o chefe: comemoração com som; o som antigo de entrada não toca mais fora de sincronia')
  s1 = sincronia(log, 1, 2)
  confere(s1.n >= 5 && s1.fora === 0, `luta do chefe: ${s1.n} quadros com impacto, ${s1.mesmo} com som no mesmo quadro, ${s1.fora} fora de ±1`)
  // ---- luta cheia de verdade: teto de vozes e pico
  await KJ(j, (k) => { k.limparFestas(); k.zerarMedidasDaCena() }); a = await pn()
  await j.evaluate(async () => { window.__sinc.length = 0; const { Som } = await import('/public/reino/som-reino.js'); window.__picoJogo = 0; window.__medePico = setInterval(() => { window.__picoJogo = Math.max(window.__picoJogo, Som.picoAoVivo()) }, 15) })
  const cheia = await KJ(j, (k) => k.batalhaCheia()); const tc0 = Date.now(), e0 = await KJ(j, (k) => k.som())
  await dorme(9000)
  log = await j.evaluate(() => { const l = window.__sinc.slice(); window.__sinc.length = 0; return l }); b = await pn(); const e1 = await KJ(j, (k) => k.som()), seg = (Date.now() - tc0) / 1000
  await j.click('#bt-vel'); await dorme(150); const vel = await pn()
  await KJ(j, (k) => k.avancarBatalha()); await dorme(1500)
  const picoJogo = await j.evaluate(() => { clearInterval(window.__medePico); return window.__picoJogo })
  { const maxV = Math.max(...log.map((l) => l[3])), maxT = Math.max(...log.map((l) => l[4])), s2 = sincronia(log, 1, 2), novos = e1.tocados - e0.tocados
    confere(cheia.soldados + cheia.invasores >= 80 && maxV <= 12 && maxT <= 6, `luta cheia de verdade (${cheia.soldados} soldados × ${cheia.invasores} invasores): no pior quadro ${maxV} vozes (teto 12) e ${maxT} de tropa (teto 6)`)
    confere(s2.n >= 20 && s2.fora === 0, `luta cheia: ${s2.n} quadros com impacto, ${s2.mesmo} com o som no mesmo quadro, ${s2.fora} fora de ±1`)
    confere(novos / seg <= 27 && e1.agrupados > e0.agrupados, `luta cheia sem metralhadora: ${n1(novos / seg)} sons novos por segundo (teto 27), ${e1.agrupados - e0.agrupados} golpes juntados, ${e1.golpes - e0.golpes} golpes na tela`)
    confere(picoJogo > 0.03 && picoJogo <= 0.71, `pico ao vivo no jogo com a luta cheia: ${n1(20 * Math.log10(picoJogo))} dBFS (teto −3)`)
    confere((vel.velocidade || 0) - (b.velocidade || 0) === 1, 'botão de velocidade: som próprio que sobe com a velocidade')
    const gestos = Object.keys(b).filter((n) => /^golpe/.test(n) && dif(n) > 0)
    confere(gestos.length >= 3 && dif('explosao') + dif('fumaca') + dif('arremesso') + dif('grupoCai') >= 1, `luta cheia: ${gestos.length} gestos diferentes soaram (${gestos.join(', ')}); explosão ${dif('explosao')}, fumaça ${dif('fumaca')}, arremesso ${dif('arremesso')}, pelotão caído ${dif('grupoCai')}`) }
  await ctxJ.close()
  // ---- Reduced motion mantém o som
  const ctxR = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' })
  const r = await ctxR.newPage(); vigiar(r)
  await r.goto(JOGO + '?teste=1&nova=1&semente=som-r35'); await r.waitForSelector('#bt-carta2', { timeout: 20000 }); await r.keyboard.press('Shift'); await dorme(300)
  await KJ(r, (k) => k.chefeCai())
  await r.waitForFunction(() => !window.__keepmile.batalha().ativa, null, { timeout: 90000 }); await dorme(600)
  const er = await KJ(r, (k) => ({ s: k.som(), cena: k.cena() }))
  { const q = er.s.porNome, golpes = Object.keys(q).filter((n) => /^golpe|^impacto$|^flechaFinca$/.test(n)).reduce((s, n) => s + q[n], 0)
    confere(er.s.menos === true && golpes >= 5 && q.pisao === 1 && q.chefeCai === 1 && q.chefeTomba === 1 && q.festaTropa === 1 && q.gritoTropa === 1 && er.s.ambiente !== null, `Reduced motion no jogo NÃO tira som: ${golpes} golpes, pisão, queda do chefe, festa, grito e ambiente (${er.s.ambiente}) continuam`) }
  await ctxR.close()
  // ---- sem som (aparelho sem áudio): nada quebra
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  await ctxS.addInitScript(() => { delete window.AudioContext; delete window.webkitAudioContext; window.AudioContext = undefined; window.webkitAudioContext = undefined })
  const s = await ctxS.newPage(); const errosS = []; s.on('console', (m) => { if (m.type() === 'error') errosS.push(m.text()) }); s.on('pageerror', (e) => errosS.push(e.message))
  await s.goto(JOGO + '?teste=1&nova=1&semente=som-r35'); await s.waitForSelector('#bt-carta2', { timeout: 20000 }); await s.keyboard.press('Shift'); await dorme(300)
  await KJ(s, (k) => { k.maoNova(); k.chefeCai() }); await dorme(5000); await s.click('#bt-menu'); await dorme(200); await s.keyboard.press('Escape'); await KJ(s, (k) => k.avancarBatalha()); await dorme(800)
  const es = await KJ(s, (k) => ({ s: k.som(), erros: k.erros(), fase: k.fase() }))
  confere(es.s.ligado === false && es.s.tocados === 0 && es.erros.length === 0 && errosS.length === 0, `sem áudio no aparelho: a luta do chefe, as cartas e o menu rodam sem som e sem erro (${errosS.length + es.erros.length} erros)` + (errosS.length ? ': ' + errosS.slice(0, 2).join(' | ') : ''))
  await ctxS.close()
}

// (15) os eventos do modo servidor (replay, rede, apelido, ranking): o som certo está ligado no ponto certo do código da tela
cabecalho('R35 — eventos do modo servidor: a chamada do som está no lugar')
{
  const ler = (f) => fs.readFileSync(path.join(PASTA, 'js', f), 'utf8'), app = ler('app.js'), telas = ler('telas.js'), bat = ler('batalha-tela.js'), cena = ler('cena.js')
  const func = (src, nome) => { const i = src.indexOf('function ' + nome + '('); return i < 0 ? '' : src.slice(i, src.indexOf('\nfunction ', i + 10) > 0 ? src.indexOf('\nfunction ', i + 10) : i + 3000) }
  const itens = [
    ['replay — SKIP TO FIGHT', /Som\.tocar\('replayPula'\)/.test(func(app, 'pularParaLuta'))],
    ['RECONNECTING / BACK ONLINE', /Srv\.aoRede = [^\n]*Som\.tocar\('semSinal'\)[^\n]*Som\.tocar\('voltou'\)/.test(app)],
    ['festa RANK 6 > 4', /Som\.tocar\('rankingSobe'[^\n]*\n[^\n]*Som\.tocar\('rankUp'\)/.test(func(app, 'festejarSubida'))],
    ['gancho do fim', /M\.fim\.gancho = ganchoDaEstrada\([^\n]*Som\.tocar\('gancho'\)/.test(app)],
    ['troca de apelido', /sv\.trocarApelido\([\s\S]{0,700}Som\.tocar\('apelidoOk'\)/.test(telas) && /Som\.tocar\('negado'\); erro\.dataset\.codigo/.test(telas)],
    ['replay x1/x2', /id === 'vel'\) \{ Bat\.vel = Bat\.vel === 1 \? 2 : 1;[^\n]*Som\.tocar\('velocidade'/.test(app)],
    ['carta rara com brilho', /Som\.tocar\('cartaVira'[^\n]*raridade[^\n]*Som\.tocar\('cartaRara'/.test(func(app, 'maoNova'))],
    ['ambiente pelo trecho da cena', /C\.trecho\(\)[^\n]*Som\.ambiente\(tr\)/.test(app)],
    ['golpe no evento do dano (impacto), não na antecipação', /Som\.golpe\(/.test(bat.slice(bat.indexOf("cod === 'd'"), bat.indexOf("cod === 'h'"))) && !/Som\./.test(bat.slice(bat.indexOf('function antever('), bat.indexOf('B.tipoDe = ')))],
    ['tiro: som na saída do projétil', /C\.projetil\([^\n]*C\.aoSom\?\.\(tp === 'flecha'/.test(cena)],
  ]
  for (const [nome, ok] of itens) confere(ok, `${nome}: chamada de som no ponto certo`)
  const pf = await ctxPc.newPage(); vigiar(pf); await pf.goto(FOLHA)
  const nomes = await pf.evaluate(() => window.__reino.Som.nomes()), usados = new Set()
  for (const src of [app, telas, bat, cena]) for (const m of src.matchAll(/(?:Som\.tocar|Som\.golpe|C\.aoSom\?\.)\(([^)]*)/g)) for (const q of m[1].matchAll(/(=== |grupo: )?'([A-Za-z]+)'/g)) if (!q[1]) usados.add(q[2]) // (fora o que é comparação ou nome de pelotão)
  for (const m of bat.matchAll(/'((?:magia|golpe|flecha|splat|impacto|invasor)[A-Za-z]*)'/g)) usados.add(m[1])
  const gestos = await pf.evaluate(() => window.__reino.Som.GOLPES); for (const g of gestos) usados.add(g)
  await pf.close()
  const desconhecidos = [...usados].filter((n) => !nomes.includes(n)), semUso = nomes.filter((n) => !usados.has(n))
  confere(desconhecidos.length === 0, 'todo nome de som que a tela pede existe no motor' + (desconhecidos.length ? ' — não existe: ' + desconhecidos.join(', ') : ''))
  confere(semUso.every((n) => ['espada', 'flecha'].includes(n)), `todo som do motor é disparado por algum evento da tela (só da folha/fundo: ${semUso.join(', ') || 'nenhum'})`)
}

// ================================================================== R43 — a contagem que o jogador vê sempre tem o seu tique
cabecalho('R43 — tique de contagem: soa em todo passo (mesmo com o teto cheio) e sobe de nota; som grande não empilha')
{
  const p = await ctxPc.newPage(); vigiar(p); await p.goto(FOLHA); await p.click('h1'); await instalarMedidor(p)
  const r = await p.evaluate(async () => {
    const { Som, Musica } = window.__reino, espera = (ms) => new Promise((ok) => setTimeout(ok, ms)), o = {}
    Som.mudo(false); Som.volume('efeitos', 0.8); Som.menosAnimacao(false); Musica.parar()
    // 7 fanfarras iguais coladas (o robô que joga a partida inteira num instante): antes ficavam as 7 vivas e enchiam o teto
    for (let i = 0; i < 7; i++) { Som.tocar('vitoria'); await espera(45) }
    o.copias = Som.estado().vivos.split(' ').filter((x) => x.startsWith('vitoria:')).length; o.cortados = Som.estado().cortados
    // teto cheio só de sons de prioridade 1 (os mais importantes): antes o tique (prioridade 2) era recusado em todo passo
    const pri1 = Som.tabela().filter((t) => t.pri === 1 && t.ms >= 700).map((t) => t.nome)
    for (let k = 0; k < 2; k++) for (const n of pri1) { Som.tocar(n); await espera(k ? 40 : 0) }
    const cheio = Som.estado(); o.cheio = cheio.vozes; o.soPri1 = cheio.vivos.split(' ').every((x) => x.endsWith(':1')); o.max = 0; o.tiques = []; o.vozesNoTique = []
    for (let i = 1; i <= 13; i++) { o.vozesNoTique.push(Som.estado().vozes); o.tiques.push(Som.tocar('rankingSobe', { tom: i })); o.max = Math.max(o.max, Som.estado().vozes); await espera(70) }
    const fim = Som.estado(); o.tocou = (fim.porNome.rankingSobe || 0) - (cheio.porNome.rankingSobe || 0); o.recusados = fim.recusados - cheio.recusados
    o.juntos = [Som.tocar('rankingSobe', { tom: 1 }), Som.tocar('rankingSobe', { tom: 2 }), Som.tocar('ouroTique', { tom: 1 }), Som.tocar('ouroTique', { tom: 2 })] // dois passos no mesmo quadro (relógio atrasado): os dois soam
    o.comum = [Som.tocar('toque'), Som.tocar('toque')] // som comum continua virando um só no mesmo instante
    o.certos = Som.tabela().filter((t) => t.certo).map((t) => t.nome)
    await espera(3200); o.sobrou = Som.estado().vozes
    // a nota sobe com o degrau: sol (392 Hz) sem tom, ré (587 Hz) no degrau 7
    const { fora, forca, SR, PRE } = window.__m, nota = async (tom) => { const { L } = await fora(0.5, (ctx, no, t) => Som.fabricar(ctx, no.fx, 'rankingSobe', t, 0, { tom })); const i0 = Math.floor(PRE * SR); return { sol: forca(L, i0, i0 + SR * 0.2, 392), re: forca(L, i0, i0 + SR * 0.2, 587.33) } }
    o.nota0 = await nota(0); o.nota7 = await nota(7)
    return o
  })
  confere(r.copias <= 2 && r.cortados >= 5, `7 fanfarras iguais coladas não empilham: ficam ${r.copias} vivas (teto 2), ${r.cortados} antigas cortadas`)
  confere(r.cheio === 12 && r.soPri1 && r.vozesNoTique.slice(0, 5).every((v) => v === 12), `teto cheio com 12 vozes de prioridade 1 quando a contagem começa (${r.vozesNoTique.join(' ')})`)
  confere(r.tiques.length === 13 && r.tiques.every(Boolean) && r.tocou === 13 && r.recusados === 0 && r.max <= 12, `os 13 tiques da contagem soam, um por passo de 70 ms, sem passar do teto (${r.tocou} de 13, ${r.recusados} recusados, no máximo ${r.max} vozes)`)
  confere(r.juntos.every(Boolean) && r.comum[0] === true && r.comum[1] === false && JSON.stringify(r.certos.sort()) === '["ouroTique","rankingSobe"]', 'dois passos de contagem no mesmo instante soam os dois (rankingSobe e ouroTique); som comum repetido no mesmo instante continua virando um só')
  confere(r.nota0.sol > r.nota0.re + 10 && r.nota7.re > r.nota7.sol + 10 && r.sobrou === 0, `a contagem sobe de nota: sem degrau toca sol (${n1(r.nota0.sol)} dB contra ${n1(r.nota0.re)} do ré), no degrau 7 toca ré (${n1(r.nota7.re)} dB contra ${n1(r.nota7.sol)} do sol)`)
  await p.close()
}

// ================================================================== R46 — os dois sons da revanche: troca e dica (fabricados por código)
cabecalho('R46 — revanche: "troca" (duas peças trocam de terreno) e "dica" (há uma troca que vence)')
{
  const p = await ctxPc.newPage(); vigiar(p); await p.goto(FOLHA); await p.click('h1'); await instalarMedidor(p)
  const m = await p.evaluate(async () => {
    const { Som, fora, medir, forca, db, SR, PRE } = window.__m, o = { troca: [], nomes: Som.nomes(), linhas: Som.tabela().filter((t) => ['troca', 'dica'].includes(t.nome)) }
    const reguaInterface = Som.tabela().filter((t) => t.camada === 'interface' && !['troca', 'dica'].includes(t.nome)).map((t) => t.alvo); o.regua = [Math.min(...reguaInterface), Math.max(...reguaInterface)]
    /** Quanto do som está acima de 5 kHz (o agudo que irrita), em dB contra o som inteiro. */
    const agudo = (x) => { const a = 1 / (1 + 2 * Math.PI * 5000 / SR); let y1 = 0, x1 = 0, y2 = 0, w1 = 0, alto = 0, tudo = 0; for (let i = Math.floor(PRE * SR); i < x.length; i++) { y1 = a * (y1 + x[i] - x1); x1 = x[i]; y2 = a * (y2 + y1 - w1); w1 = y1; alto += y2 * y2; tudo += x[i] * x[i] } return db(Math.sqrt(alto / Math.max(tudo, 1e-18))) }
    const um = async (nome, i) => { const { L, R } = await fora(1.2, (ctx, no, t) => Som.fabricar(ctx, no.fx, nome, t, i)); return { ...medir(L, R), agudo: agudo(L), L } }
    for (let i = 0; i < 3; i++) { const r = await um('troca', i); delete r.L; o.troca.push(r) }
    const d = await um('dica', 0), jan = (a, b, hz) => forca(d.L, Math.floor((PRE + a) * SR), Math.floor((PRE + b) * SR), hz), RE = 587.33, SOL = 783.99
    o.notas = { re1: jan(0.02, 0.15, RE), sol1: jan(0.02, 0.15, SOL), re2: jan(0.2, 0.36, RE), sol2: jan(0.2, 0.36, SOL) }; delete d.L; o.dica = d
    return o
  })
  const lt = m.linhas.find((t) => t.nome === 'troca'), ld = m.linhas.find((t) => t.nome === 'dica')
  anota('som      var  pico dBFS  alvo  duração ms  agudo (>5 kHz) dB'); m.troca.forEach((r, i) => anota(`troca    ${i + 1}    ${n1(r.picoDb).padStart(7)}  ${String(lt?.alvo).padStart(4)}  ${String(Math.round(r.ms)).padStart(9)}  ${n1(r.agudo).padStart(8)}`)); anota(`dica     1    ${n1(m.dica.picoDb).padStart(7)}  ${String(ld?.alvo).padStart(4)}  ${String(Math.round(m.dica.ms)).padStart(9)}  ${n1(m.dica.agudo).padStart(8)}`)
  confere(m.nomes.includes('troca') && m.nomes.includes('dica') && lt?.camada === 'interface' && ld?.camada === 'interface' && !lt.grande && !ld.grande && !lt.tropa && !ld.tropa, 'os dois sons da revanche existem no motor (troca e dica), na camada de interface, nenhum é som grande nem de tropa')
  confere(m.troca.every((r) => r.ms >= 250 && r.ms <= 350 && r.estouros === 0 && r.atrasoMs <= 15), `troca dura de 250 a 350 ms nas 3 variações (${m.troca.map((r) => Math.round(r.ms)).join(', ')} ms) e começa na hora`)
  confere(m.dica.ms >= 300 && m.dica.ms <= 450 && m.dica.estouros === 0 && m.dica.atrasoMs <= 15, `dica dura de 300 a 450 ms (${Math.round(m.dica.ms)} ms) e começa na hora`)
  confere([lt, ld].every((t) => t.alvo >= m.regua[0] && t.alvo <= m.regua[1]) && m.troca.every((r) => Math.abs(r.picoDb - lt.alvo) <= 2.5 && r.picoDb <= -3) && Math.abs(m.dica.picoDb - ld.alvo) <= 2.5, `volume dentro da régua dos sons de interface (${m.regua[0]} a ${m.regua[1]} dBFS): troca no alvo ${lt.alvo} (${m.troca.map((r) => n1(r.picoDb)).join(', ')}), dica no alvo ${ld.alvo} (${n1(m.dica.picoDb)})`)
  confere(ld.alvo < lt.alvo && m.dica.picoDb < Math.min(...m.troca.map((r) => r.picoDb)) && ld.pri > lt.pri && ld.pri >= 3, `a dica é o mais baixo dos dois (${n1(m.dica.picoDb)} dBFS) e tem prioridade baixa (${ld.pri}; a troca tem ${lt.pri})`)
  confere(m.troca.every((r) => r.agudo <= -18) && m.dica.agudo <= -18, `sem agudo que irrite: acima de 5 kHz a troca fica ${n1(Math.max(...m.troca.map((r) => r.agudo)))} dB abaixo do som inteiro (no pior take) e a dica ${n1(m.dica.agudo)} dB (pedido: 18 dB ou mais)`)
  confere(m.notas.re1 > m.notas.sol1 + 10 && m.notas.sol2 > m.notas.re2 + 10, `a dica são duas notas SUBINDO: primeiro o ré (${n1(m.notas.re1)} dB contra ${n1(m.notas.sol1)} do sol), depois o sol (${n1(m.notas.sol2)} dB contra ${n1(m.notas.re2)} do ré)`)
  const v = await p.evaluate(async () => {
    const { Som, Musica } = window.__reino, espera = (ms) => new Promise((ok) => setTimeout(ok, ms)), o = {}
    const ouvir = async (ms) => { let pk = 0; for (let i = 0; i < ms / 20; i++) { pk = Math.max(pk, Som.picoAoVivo()); await espera(20) } return pk }
    const copias = (nome) => Som.estado().vivos.split(' ').filter((x) => x.startsWith(nome + ':')).length
    Som.mudo(false); Som.volume('efeitos', 0.8); Som.menosAnimacao(false); Musica.parar(); await espera(300)
    o.botoes = ['troca', 'dica'].map((n) => document.querySelector(`button[data-som="${n}"] small.q`)?.textContent.length || 0)
    // tocam de verdade
    let e0 = Som.estado(); o.tocouTroca = Som.tocar('troca'); o.forcaTroca = Som.estado().ultimaForca; o.picoTroca = await ouvir(450)
    o.tocouDica = Som.tocar('dica'); o.forcaDica = Som.estado().ultimaForca; o.esperaLivre = Som.estado().ultimaEspera; o.picoDica = await ouvir(550)
    let e1 = Som.estado(); o.normal = [e1.tocados - e0.tocados, (e1.porNome.troca || 0) - (e0.porNome.troca || 0), (e1.porNome.dica || 0) - (e0.porNome.dica || 0)]; await espera(500)
    // mudo
    Som.mudo(true); await espera(120); Som.tocar('troca'); Som.tocar('dica'); o.mudo = await ouvir(600); Som.mudo(false); await espera(600)
    // repetir muito não empilha
    o.maxTroca = 0; o.maxDica = 0
    for (let i = 0; i < 8; i++) { Som.tocar('troca'); Som.tocar('dica'); o.maxTroca = Math.max(o.maxTroca, copias('troca')); o.maxDica = Math.max(o.maxDica, copias('dica')); await espera(45) }
    await espera(1200)
    // "Menos animação": tocam igual, nada a mais
    Som.menosAnimacao(true); e0 = Som.estado(); o.menosTroca = Som.tocar('troca'); o.menosForcaTroca = Som.estado().ultimaForca; o.menosPicoTroca = await ouvir(450)
    o.menosDica = Som.tocar('dica'); o.menosForcaDica = Som.estado().ultimaForca; o.menosPicoDica = await ouvir(550)
    e1 = Som.estado(); o.menos = [e1.tocados - e0.tocados, (e1.porNome.troca || 0) - (e0.porNome.troca || 0), (e1.porNome.dica || 0) - (e0.porNome.dica || 0)]; Som.menosAnimacao(false); await espera(500)
    // a dica nunca entra por cima de fanfarra: espera a derrota acabar
    Som.tocar('derrota'); await espera(100); o.dicaNaFanfarra = Som.tocar('dica'); o.esperaFanfarra = Som.estado().ultimaEspera; Som.tocar('troca'); o.esperaTroca = Som.estado().ultimaEspera
    await espera(3000)
    // teto de vozes cheio de sons de prioridade 1: os dois ficam de fora, o teto não passa
    const pri1 = Som.tabela().filter((t) => t.pri === 1 && t.ms >= 700).map((t) => t.nome)
    for (let k = 0; k < 2; k++) for (const n of pri1) { Som.tocar(n); await espera(k ? 40 : 0) }
    const cheio = Som.estado(); o.cheio = cheio.vozes; o.dicaCheio = Som.tocar('dica'); o.trocaCheio = Som.tocar('troca'); o.vozesDepois = Som.estado().vozes
    // nome desconhecido não quebra
    o.desconhecido = [Som.tocar('trocaQueNaoExiste'), Som.tocar(''), Som.tocar(undefined)]
    await espera(3400); o.sobrou = Som.estado().vozes
    return o
  })
  confere(v.botoes.every((n) => n >= 8), 'a folha de ouvir mostra os dois, cada um com o evento que o dispara')
  confere(v.tocouTroca && v.tocouDica && v.picoTroca > 0.02 && v.picoTroca <= 0.71 && v.picoDica > 0.02 && v.picoDica <= 0.71 && v.normal.join() === '2,1,1' && v.esperaLivre === 0, `Som.tocar('troca') e Som.tocar('dica') tocam ao vivo (picos ${n1(20 * Math.log10(v.picoTroca))} e ${n1(20 * Math.log10(v.picoDica))} dBFS); sem fanfarra a dica sai na hora`)
  confere(v.mudo < 0.001, `mudo vale para os dois (pico ${v.mudo.toFixed(4)})`)
  confere(v.maxTroca >= 1 && v.maxTroca <= 2 && v.maxDica === 1, `repetidos 8 vezes em 360 ms não empilham: no máximo ${v.maxTroca} trocas (teto 2) e ${v.maxDica} dica (teto 1) vivas`)
  confere(v.menosTroca && v.menosDica && v.menosForcaTroca === 1 && v.menosForcaDica === 1 && v.forcaTroca === 1 && v.forcaDica === 1 && v.menos.join() === '2,1,1' && v.menosPicoTroca > 0.02 && v.menosPicoDica > 0.02, `"Menos animação": os dois continuam tocando na mesma força (1), sem som extra (${v.menos[0]} sons para 2 pedidos)`)
  confere(v.dicaNaFanfarra === true && v.esperaFanfarra >= 1 && v.esperaFanfarra <= 1.5 && v.esperaTroca === 0, `a dica nunca entra por cima de fanfarra: pedida durante a derrota, espera ${n1(v.esperaFanfarra * 1000)} ms (teto 1500); a troca não espera`)
  confere(v.cheio === 12 && v.dicaCheio === false && v.trocaCheio === false && v.vozesDepois === 12 && v.sobrou === 0, 'teto de vozes: com 12 sons de prioridade 1 vivos, dica e troca ficam de fora e o teto continua em 12')
  confere(v.desconhecido.every((x) => x === false), 'nome de som desconhecido (ou vazio) devolve false e não quebra nada')
  await p.close()
}

// ================================================================== fim
cabecalho('Geral')
confere(erros.length === 0, 'zero erro de console ou de página' + (erros.length ? ': ' + erros.slice(0, 4).join(' | ') : ''))
confere(ruins.length === 0, 'zero 404 e zero pedido falhado' + (ruins.length ? ': ' + ruins.slice(0, 4).join(' | ') : ''))
anota(); anota(falhas.length ? `RESULTADO: ${falhas.length} falha(s)\n` + falhas.map((f) => ' - ' + f).join('\n') : 'RESULTADO: tudo dentro da régua de docs/reino/som.md.')
fs.writeFileSync(path.join(SAIDA, 'medidas.txt'), ['Reino — medidas do som (tests/tela/reino-som.e2e.mjs). Fabricado fora do tempo real a 48 kHz, pela cadeia inteira, volumes no padrão.', ...relatorio].join('\n') + '\n')
console.log('\nrelatório: sons/reino/medidas.txt')
await browser.close(); servidor.close()
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO VERDE')
process.exit(falhas.length ? 1 : 0)
