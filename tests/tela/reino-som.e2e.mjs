// Reino — teste de tela do SOM do jogo novo (Chrome de verdade). Régua: docs/reino/som.md.
// Ninguém da equipe ouve: cada som é FABRICADO FORA DO TEMPO REAL (OfflineAudioContext) dentro da página, pela cadeia inteira, e MEDIDO.
//   efeitos (todas as variações): pico no alvo da tabela (±2,5 dB) e nunca acima de −3 dBFS · duração ±25% da tabela
//     · começa em até 15 ms · sem estouro · variações diferentes entre si
//   música (8 momentos): pico e volume médio abaixo dos efeitos · o MOTIVO nas notas certas · chefe em menor · batalha com mais batida que construir
//   ao vivo (folha public/reino/sons.html): nada antes do primeiro toque · cada botão toca · teto de vozes · mudo e volumes guardados
//     · "Menos animação" · troca de momento só na linha do compasso · a rodada simulada inteira · amostra gravada no lugar do código
//     · zero erro de console · zero 404 · funciona em subpasta
// Rodar (um teste de tela por vez):  node tools/trava-robos.mjs rodar "timeout 600 node tests/tela/reino-som.e2e.mjs"
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
  const alvos = { choque: -11, marcha: -13, casteloRacha: -7, muralha: -11, chefeEntra: -7, flecha: -14, espolio: -11, recorde: -8 }
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
