// Frayz — teste de tela do SOM (Chrome de verdade, Playwright instalado globalmente). Régua: docs/direcao-de-som.md.
// Ninguém da equipe ouve: aqui cada som é FABRICADO FORA DO TEMPO REAL (OfflineAudioContext), dentro da página, e MEDIDO.
//   efeitos (30 × 3 variações): duração ±20% da tabela · pico no alvo do efeito (entre −12 e −6 dBFS) e nunca acima de −3 dBFS
//     depois do limitador · nenhum buraco de silêncio no meio · sem estouro · começa e termina sem clique · as 3 variações
//     diferentes entre si · e a receita aparece no som (rasgo descendo e picotado, linha subindo, dedal desafinado, baque grave)
//   música (16 compassos de cada momento): pico, volume médio, ~12 dB abaixo dos efeitos, sem estouro, o TEMA nas notas certas,
//     e cada camada no lugar (meio tom acima, abafado + coração, degraus da costura, fim em ré maior)
//   ao vivo: nada toca antes do primeiro toque · teto de 16 vozes · nenhum nó vivo depois do fim · variação nunca repete
//     · mudo e volumes guardados no aparelho · pausa com a aba escondida · troca de momento só na virada do compasso
//   amostras gravadas: com um manifesto de teste e um WAV escrito aqui em bytes, a amostra toca no lugar do código,
//     a falha de carregamento cai para o código e a medição de pico vale para as duas fontes
// Salva fotos da folha de sons e o relatório em tests/tela/fotos/som-*.
// Rodar (um teste de tela por vez):  node tools/trava-robos.mjs rodar "node tests/tela/som.e2e.mjs"
// Recalibrar depois de mexer numa receita:  node tests/tela/som.e2e.mjs --calibrar   (mostra)   ou   --calibrar --gravar   (grava no som.js)
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

const falhas = [], relatorio = []
const anota = (s = '') => relatorio.push(s)
const falha = (msg) => { falhas.push(msg); console.log('FALHA: ' + msg); anota('  FALHA: ' + msg) }
const confere = (ok, msg) => { if (!ok) falha(msg); else { console.log('  ok: ' + msg); anota('  ok: ' + msg) } }
const dorme = (ms) => new Promise((ok) => setTimeout(ok, ms))
const n1 = (x) => (Math.round(x * 10) / 10).toFixed(1)

const servidor = await iniciar({ porta: 0 })
const base = `http://127.0.0.1:${servidor.address().port}`
const browser = await chromium.launch()
const erros = []
function vigiar(page) {
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) erros.push('console: ' + m.text()) })
  page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
}

// ------------------------------------------------------------------ só calibrar
if (process.argv.includes('--calibrar')) {
  const page = await browser.newPage(); vigiar(page)
  await page.goto(base + '/sons/manifesto.json')
  const cal = await page.evaluate(async () => (await import('/js/som.js')).calibrar())
  const bloco = `/* PICO_BRUTO:INICIO */\nconst PICO_BRUTO = {\n${Object.entries(cal).map(([k, v]) => `  ${k}: [${v.join(', ')}],`).join('\n')}\n}\n/* PICO_BRUTO:FIM */`
  if (process.argv.includes('--gravar')) {
    const arq = path.join(AQUI, '..', '..', 'public', 'js', 'som.js')
    fs.writeFileSync(arq, fs.readFileSync(arq, 'utf8').replace(/\/\* PICO_BRUTO:INICIO \*\/[\s\S]*?\/\* PICO_BRUTO:FIM \*\//, bloco))
    console.log('PICO_BRUTO gravado em public/js/som.js')
  } else console.log(bloco)
  await browser.close(); servidor.close()
  process.exit(erros.length ? 1 : 0)
}

// ------------------------------------------------------------------ o que roda DENTRO da página (medir amostras de áudio)
/** Devolve funções de medição já dentro da página (window.__m). */
async function instalarMedidor(page) {
  await page.evaluate(async () => {
    const Som = await import('/js/som.js'), Musica = await import('/js/musica.js')
    const SR = 48000, PRE = 0.5, SIL = 0.001 // −60 dBFS
    const db = (x) => 20 * Math.log10(Math.max(x, 1e-9))
    async function fora(dur, montar, cauda = 0.25) {
      const ctx = new OfflineAudioContext(2, Math.ceil((PRE + dur + cauda) * SR), SR)
      const info = montar(ctx, PRE)
      const buf = await ctx.startRendering()
      return { L: buf.getChannelData(0), R: buf.getChannelData(1), info }
    }
    /** Força de uma frequência num trecho (Goertzel com janela de Hann), em dBFS de uma senoide. */
    function forca(x, i0, i1, f) {
      const n = i1 - i0, w = 2 * Math.PI * f / SR, c = 2 * Math.cos(w)
      let s1 = 0, s2 = 0, sj = 0
      for (let i = 0; i < n; i++) { const j = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)); sj += j; const s = (x[i0 + i] || 0) * j + c * s1 - s2; s2 = s1; s1 = s }
      return db(Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2)) * 2 / sj)
    }
    /** Centro de gravidade do espectro (Hz) num trecho, entre f0 e f1. */
    function centro(x, i0, i1, f0, f1, passos = 36) {
      let soma = 0, peso = 0
      for (let k = 0; k < passos; k++) { const f = f0 * (f1 / f0) ** (k / (passos - 1)), p = 10 ** (forca(x, i0, i1, f) / 10); soma += f * p; peso += p }
      return soma / peso
    }
    function medir(L, R, limiar = SIL) {
      const n = L.length
      let pico = 0, picoL = 0, picoR = 0, ini = -1, fim = -1, estouros = 0
      for (let i = 0; i < n; i++) {
        const l = Math.abs(L[i]), r = Math.abs(R[i]), a = Math.max(l, r)
        if (l > picoL) picoL = l; if (r > picoR) picoR = r; if (a > pico) pico = a
        if (a >= 0.999) estouros++
        if (a > limiar) { if (ini < 0) ini = i; fim = i }
      }
      if (ini < 0) return { ms: 0, picoDb: -180, rmsDb: -180, mudo: true }
      let soma = 0, buraco = 0, atual = 0
      for (let i = ini; i <= fim; i++) { soma += (L[i] * L[i] + R[i] * R[i]) / 2; if (Math.max(Math.abs(L[i]), Math.abs(R[i])) < limiar) { if (++atual > buraco) buraco = atual } else atual = 0 }
      const mx = (a, b) => { let m = 0; for (let i = Math.max(0, a); i < Math.min(n, b); i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); return m }
      return {
        ini, fim, inicio: ini / SR, ms: (fim - ini) / SR * 1000, picoDb: db(pico), picoLDb: db(picoL), picoRDb: db(picoR), rmsDb: db(Math.sqrt(soma / (fim - ini + 1))),
        buracoMs: buraco / SR * 1000, estouros,
        comecoRel: mx(ini, ini + Math.floor(SR * 0.0004)) / pico, // o primeiro 0,4 ms (clique no ataque?)
        fimDb: db(mx(fim - Math.floor(SR * 0.001), fim + 1)), // o último 1 ms antes do silêncio (degrau no fim?)
        caudaDb: db(mx(n - Math.floor(SR * 0.02), n)), // os últimos 20 ms do trecho fabricado
      }
    }
    const mono = (L, R, a, b) => { const o = new Float32Array(b - a); for (let i = a; i < b; i++) o[i - a] = ((L[i] || 0) + (R[i] || 0)) / 2; return o }
    /** Diferença entre dois sons (0 = iguais; ~1,4 = nada a ver). */
    function diferenca(a, b) {
      const n = Math.max(a.length, b.length); let d = 0, ea = 0, eb = 0
      for (let i = 0; i < n; i++) { const x = a[i] || 0, y = b[i] || 0; d += (x - y) ** 2; ea += x * x; eb += y * y }
      return Math.sqrt(d / Math.max(ea, eb, 1e-12))
    }
    /** Ritmo do picotado: a frequência (Hz) mais forte do contorno de volume, entre 15 e 90 por segundo. */
    function picotado(x, i0, i1) {
      const jan = Math.floor(SR * 0.004), n = i1 - i0, env = new Float32Array(n)
      let soma = 0
      for (let i = 0; i < n; i++) { soma += Math.abs(x[i0 + i]); if (i >= jan) soma -= Math.abs(x[i0 + i - jan]); env[i] = soma / jan }
      let media = 0; for (let i = 0; i < n; i++) media += env[i] / n
      let melhor = 0, fMelhor = 0, total = 0
      for (let f = 15; f <= 90; f++) {
        let re = 0, im = 0
        for (let i = 0; i < n; i += 8) { const a = 2 * Math.PI * f * i / SR; re += (env[i] - media) * Math.cos(a); im += (env[i] - media) * Math.sin(a) }
        const p = Math.hypot(re, im); total += p
        if (p > melhor) { melhor = p; fMelhor = f }
      }
      return { hz: fMelhor, destaque: melhor / (total / 76) }
    }
    window.__m = { Som, Musica, SR, PRE, db, fora, forca, centro, medir, mono, diferenca, picotado }
  })
}

/** Mede todos os efeitos (3 variações de cada) e as receitas que dá para ver no som. */
function medirEfeitos(page) {
  return page.evaluate(async () => {
    const { Som, SR, PRE, fora, forca, centro, medir, mono, diferenca, picotado } = window.__m
    const saida = []
    for (const t of Som.tabela()) {
      const dur = t.ms / 1000, vs = [], sinais = []
      for (let v = 0; v < 3; v++) {
        const { L, R } = await fora(dur, (ctx, q) => Som.fabricar(t.nome, v, ctx, { quando: q }))
        const m = medir(L, R), x = mono(L, R, m.ini, m.ini + Math.ceil(dur * SR))
        sinais.push(x)
        const i = (s) => Math.floor(s * SR), extra = {}
        if (t.nome === 'critico') { extra.centroIni = centro(x, i(0.03), i(0.1), 350, 3500); extra.centroFim = centro(x, i(0.17), i(0.24), 350, 3500); extra.picote = picotado(x, i(0.03), i(0.33)) } // antes das 3 notas
        if (t.nome === 'cartaJogada') { extra.centroIni = centro(x, i(0.01), i(0.07), 300, 4000); extra.centroFim = centro(x, i(0.11), i(0.17), 300, 4000) }
        if (t.nome === 'escudo') { const f = 1900 * [1, 0.955, 1.05][v], a = i(0.004), b = i(0.05); extra.parciais = [1, 2.76, 5.4].map((k) => forca(x, a, b, f * k)); extra.harmonicos = [2, 3].map((k) => forca(x, a, b, f * k)) }
        if (t.nome === 'golpe') { let g = 0, tt = 0; for (let f = 40; f < 6000; f *= 1.12) { const p = 10 ** (forca(x, 0, i(0.17), f) / 10) * f; tt += p; if (f < 320) g += p } extra.parteGrave = g / tt }
        if (t.nome === 'queda') { extra.assobioIni = centro(x, i(0.01), i(0.06), 300, 2500); extra.assobioFim = centro(x, i(0.15), i(0.21), 300, 2500) }
        vs.push({ v, ...m, ...extra })
      }
      saida.push({ nome: t.nome, rotulo: t.rotulo, alvoMs: t.ms, alvoPico: t.pico, vs, diferencas: [diferenca(sinais[0], sinais[1]), diferenca(sinais[0], sinais[2]), diferenca(sinais[1], sinais[2])] })
    }
    return saida
  })
}

/** Mede 16 compassos de um momento da música e procura o tema. */
function medirMusica(page, nome, compassos = 16) {
  return page.evaluate(async ({ nome, compassos }) => {
    const { Musica, SR, fora, forca, medir, mono } = window.__m
    const bpm = Musica.momentos().find((m) => m.nome === nome).bpm, dur = compassos * 3 * 60 / bpm
    const { L, R, info } = await fora(dur, (ctx, q) => Musica.fabricar(nome, compassos, ctx, { quando: q }), 1.3)
    const m = medir(L, R, 0.0001), x = mono(L, R, 0, L.length), i = (s) => Math.floor(s * SR)
    // o tema: em cada nota, a frequência certa aparece NA HORA (sobe em relação ao instante anterior) e acima das vizinhas de meio tom
    const tema = info.tema.map(({ t, hz }) => {
      const a = i(t + 0.012), b = i(t + 0.1)
      return { hz, certa: forca(x, a, b, hz), antes: forca(x, i(t - 0.085), i(t + 0.003), hz), abaixo: forca(x, a, b, hz / 2 ** (1 / 12)), acima: forca(x, a, b, hz * 2 ** (1 / 12)) }
    })
    const faixa = (f0, f1) => { let p = 0; for (let f = f0; f < f1; f *= 1.08) p += 10 ** (forca(x, i(info.inicio + 1), i(info.inicio + 9), f) / 10); return 10 * Math.log10(p) }
    // maior trecho sem som nenhum (a música não pode "furar")
    let buraco = 0, atual = 0
    for (let k = m.ini; k <= i(info.inicio + info.duracao); k++) { if (Math.abs(x[k]) < 0.00005) { if (++atual > buraco) buraco = atual } else atual = 0 }
    // onde o volume salta (para achar o fim entrando na virada)
    const salto = (() => { for (let k = i(info.inicio); k < x.length; k++) if (Math.abs(x[k]) > 0.12) return k / SR; return null })()
    return { nome, bpm: info.bpm, tom: info.tom, inicio: info.inicio, duracao: info.duracao, colcheia: info.colcheia, picoDb: m.picoDb, rmsDb: m.rmsDb, estouros: m.estouros, buracoS: buraco / SR, tema, grave: faixa(50, 92), agudo: faixa(2000, 9000), salto }
  }, { nome, compassos })
}

// ------------------------------------------------------------------ um WAV escrito em bytes (nenhum áudio de terceiros)
function wav(segundos, fn, sr = 44100) {
  const n = Math.floor(segundos * sr), b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22)
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, fn(i / sr))) * 32767), 44 + i * 2)
  return b
}
// "golpe" de teste: 40 ms de silêncio, depois um apito de 1.000 Hz que some em 180 ms, depois silêncio (para ver o corte)
const WAV_GOLPE = wav(0.4, (t) => (t < 0.04 || t > 0.22 ? 0 : 0.8 * Math.sin(2 * Math.PI * 1000 * (t - 0.04)) * Math.exp(-(t - 0.04) / 0.045) * Math.min(1, (t - 0.04) / 0.003)))
const WAV_MUSICA = wav(1.5, (t) => 0.2 * Math.sin(2 * Math.PI * 440 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 2 * t)))
const MANIFESTO_DE_TESTE = {
  versao: 1,
  efeitos: { golpe: ['sons/teste-golpe.wav'], botao: [{ arquivo: 'sons/nao-existe.wav' }], critico: [{ arquivo: 'sons/teste-golpe.wav', ganhoDb: 3, cortarMs: 120 }] },
  musica: { entrada: 'sons/teste-musica.wav' },
}

/** Espera a folha acabar de fabricar e medir os efeitos. */
async function folhaPronta(pg) { await pg.waitForFunction(() => window.__folha?.pronto); await pg.evaluate(() => window.__folha.pronto) }

const cabecalho = (s) => { console.log('\n=== ' + s + ' ==='); anota(); anota('== ' + s + ' ==') }

// ================================================================== 1. a folha de sons, antes de qualquer toque
cabecalho('Folha de sons: nada toca antes do primeiro toque')
const ctxPc = await browser.newContext({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 1 })
let page = await ctxPc.newPage(); vigiar(page)
await page.goto(base + '/sons.html')
await page.evaluate(() => { try { localStorage.removeItem('frayz_som'); localStorage.removeItem('menos_animacao') } catch { /* ok */ } })
await page.reload()
await folhaPronta(page)
await instalarMedidor(page)
{
  const r = await page.evaluate(() => {
    const { Som, Musica } = window.__m
    const volta = Som.tocar('golpe', { lado: 'A' }), atalho = Som.critico(), musica = Musica.tocar('luta')
    return { volta, atalho, musica, estado: Som.estado(), pedidos: Som.contagem(), tocados: Som.contagem('tocados'), esperando: Musica.estado().espera, registro: Som.registro.map((x) => x[0]) }
  })
  confere(r.estado.iniciado === false && r.estado.rodando === false, 'antes do primeiro toque o áudio nem existe (nenhum AudioContext criado)')
  confere(r.volta === null && r.atalho === null && r.estado.vozes === 0 && Object.keys(r.tocados).length === 0, 'efeito pedido antes do toque não toca (e não dá erro)')
  confere(r.pedidos.golpe === 1 && r.pedidos.critico === 1 && r.registro.includes('golpe') && r.registro.includes('critico'), 'mas o pedido fica contado (contagem e registro), para o teste de tela da luta')
  confere(r.musica === false && r.esperando === 'luta', 'música pedida antes do toque só fica anotada')
  const padrao = await page.evaluate(() => window.__m.Som.volumes())
  confere(padrao.efeitos === 0.7 && padrao.musica === 0.45 && r.estado.mudo === false, 'padrão ao abrir: efeitos em 70%, música em 45%, sem mudo')
  const cartoes = await page.locator('.efeito').count(), telas = await page.locator('.efeito canvas').count(), mom = await page.locator('.momento button[data-momento]').count()
  confere(cartoes === 30 && telas === 30 * 3 * 2, `a folha lista os 30 efeitos, cada um com 3 variações (onda e espectro): ${cartoes} cartões, ${telas} desenhos`)
  confere(mom === 8, `a folha tem os 8 momentos da música com botão (${mom})`)
  const semRolagem = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  confere(semRolagem, 'folha sem rolagem lateral no PC')
}

// ================================================================== 2. efeitos, fabricados fora do tempo real e medidos
cabecalho('Efeitos: 30 acontecimentos × 3 variações, medidos depois do limitador (48 kHz)')
const efeitos = await medirEfeitos(page)
anota('efeito            var  alvo ms  mediu ms  erro   alvo pico  pico dBFS  médio dBFS  buraco ms  fim dB  dif. entre variações')
const picos = []
for (const e of efeitos) {
  const ruins = []
  for (const m of e.vs) {
    picos.push(m.picoDb)
    const erro = m.ms / e.alvoMs - 1
    if (Math.abs(erro) > 0.2) ruins.push(`v${m.v + 1} duração ${Math.round(m.ms)} ms (alvo ${e.alvoMs} ±20%)`)
    if (Math.abs(m.picoDb - e.alvoPico) > 0.5) ruins.push(`v${m.v + 1} pico ${n1(m.picoDb)} dBFS (alvo ${e.alvoPico} ±0,5)`)
    if (m.picoDb < -12.05 || m.picoDb > -5.95) ruins.push(`v${m.v + 1} pico fora da faixa −12 a −6 dBFS`)
    if (m.picoDb > -3) ruins.push(`v${m.v + 1} pico acima de −3 dBFS`)
    if (m.estouros) ruins.push(`v${m.v + 1} estourou (${m.estouros} amostras em ±1)`)
    if (m.buracoMs > 25) ruins.push(`v${m.v + 1} buraco de silêncio de ${n1(m.buracoMs)} ms no meio`)
    if (m.comecoRel > 0.5) ruins.push(`v${m.v + 1} começa de uma vez (clique): ${Math.round(m.comecoRel * 100)}% do pico em 0,4 ms`)
    if (m.fimDb > -46) ruins.push(`v${m.v + 1} termina com degrau: ${n1(m.fimDb)} dBFS no último 1 ms`)
    if (m.caudaDb > -90) ruins.push(`v${m.v + 1} não termina em silêncio (${n1(m.caudaDb)} dBFS no fim)`)
    anota(`${e.nome.padEnd(17)} ${m.v + 1}   ${String(e.alvoMs).padStart(6)}  ${String(Math.round(m.ms)).padStart(8)}  ${(erro >= 0 ? '+' : '') + Math.round(erro * 100) + '%'}`.padEnd(49) + `${String(e.alvoPico).padStart(6)}  ${n1(m.picoDb).padStart(9)}  ${n1(m.rmsDb).padStart(10)}  ${n1(m.buracoMs).padStart(9)}  ${n1(m.fimDb).padStart(6)}  ${m.v === 0 ? e.diferencas.map((d) => d.toFixed(2)).join(' ') : ''}`)
  }
  if (Math.min(...e.diferencas) < 0.2) ruins.push(`variações parecidas demais (diferença mínima ${Math.min(...e.diferencas).toFixed(2)})`)
  if (ruins.length) falha(`${e.rotulo} (${e.nome}): ${ruins.join('; ')}`)
}
confere(efeitos.length === 30, `30 efeitos medidos (${efeitos.length})`)
confere(!falhas.some((f) => /\(\w+\): /.test(f)), 'todos: duração ±20%, pico no alvo (±0,5 dB) entre −12 e −6 dBFS, sem buraco, sem estouro, sem clique no começo nem degrau no fim, 3 variações diferentes')
const por = Object.fromEntries(efeitos.map((e) => [e.nome, e]))
const ordenados = [...picos].sort((a, b) => a - b), medianaEfeitos = ordenados[Math.floor(ordenados.length / 2)]
confere(Math.max(...por.botao.vs.map((m) => m.picoDb)) <= Math.min(...efeitos.map((e) => e.vs[0].picoDb)) + 0.3, 'o toque de botão é o efeito mais baixo')
confere(['critico', 'tesoura'].every((n) => por[n].vs[0].picoDb >= Math.max(...efeitos.map((e) => e.vs[0].picoDb)) - 0.3), 'crítico e Tesoura são os mais altos')
// a receita aparece no som
confere(por.critico.vs.every((m) => m.centroIni > m.centroFim * 1.6), `crítico: o rasgo desce (centro da faixa de ${Math.round(por.critico.vs[0].centroIni)} para ${Math.round(por.critico.vs[0].centroFim)} Hz)`)
confere(por.critico.vs.every((m) => m.picote.hz >= 36 && m.picote.hz <= 45 && m.picote.destaque > 2.5), `crítico: picotado a ~40 por segundo (${por.critico.vs.map((m) => m.picote.hz).join(', ')} Hz)`)
confere(por.cartaJogada.vs.every((m) => m.centroFim > m.centroIni * 1.5), `jogar carta: a linha puxada sobe (${Math.round(por.cartaJogada.vs[0].centroIni)} → ${Math.round(por.cartaJogada.vs[0].centroFim)} Hz)`)
confere(por.escudo.vs.every((m) => Math.min(...m.parciais) > Math.max(...m.harmonicos) + 12), `dedal: parciais 1 · 2,76 · 5,4 presentes e desafinados (${por.escudo.vs[0].parciais.map(n1).join(' / ')} dB contra ${por.escudo.vs[0].harmonicos.map(n1).join(' / ')} dB nos múltiplos inteiros)`)
confere(por.golpe.vs.every((m) => m.parteGrave > 0.5), `golpe: corpo grave e curto (${Math.round(por.golpe.vs[0].parteGrave * 100)}% da força abaixo de 320 Hz, ${Math.round(por.golpe.vs[0].ms)} ms)`)
confere(por.queda.vs.every((m) => m.assobioIni > m.assobioFim * 1.5), `queda: o assobio desce (${Math.round(por.queda.vs[0].assobioIni)} → ${Math.round(por.queda.vs[0].assobioFim)} Hz)`)

// ================================================================== 3. posição, força, degrau, "Menos animação", limitador
cabecalho('Posição estéreo, força, degrau, Menos animação e limitador')
{
  const r = await page.evaluate(async () => {
    const { Som, SR, PRE, fora, forca, medir, mono } = window.__m
    const um = async (nome, o, v = 0) => { const { L, R } = await fora(Som.tabela().find((t) => t.nome === nome).ms / 1000, (ctx, q) => Som.fabricar(nome, v, ctx, { quando: q, ...o })); return { L, R, m: medir(L, R) } }
    const s = {}
    s.esq = (await um('golpe', { lado: 'A' })).m; s.dir = (await um('golpe', { lado: 'B' })).m; s.meio = (await um('golpe', {})).m
    const veu = await um('erroDoVeu', { lado: 'A' }), terco = Math.floor((veu.m.fim - veu.m.ini) * 0.3), rms = (x, a, b) => { let t = 0; for (let i = a; i < b; i++) t += x[i] * x[i]; return Math.sqrt(t / (b - a)) }
    s.veu = { comecoE: rms(veu.L, veu.m.ini, veu.m.ini + terco), comecoD: rms(veu.R, veu.m.ini, veu.m.ini + terco), fimE: rms(veu.L, veu.m.fim - terco, veu.m.fim), fimD: rms(veu.R, veu.m.fim - terco, veu.m.fim) }
    s.critico = (await um('critico', {})).m.picoDb; s.criticoCalmo = (await um('critico', { calmo: true })).m.picoDb
    s.tesoura = (await um('tesoura', {})).m.picoDb; s.tesouraCalmo = (await um('tesoura', { calmo: true })).m.picoDb
    s.golpeCalmo = (await um('golpe', { calmo: true })).m.picoDb
    s.fraco = (await um('golpe', { forca: 0 })).m.picoDb; s.forte = (await um('golpe', { forca: 1 })).m.picoDb
    const tomDe = async (d) => { const { L, R, m } = await um('casuloParte', { degrau: d }), x = mono(L, R, m.ini, m.ini + SR * 0.2); let best = 0, fb = 0; for (let f = 400; f < 1400; f *= 1.004) { const p = forca(x, Math.floor(SR * 0.03), Math.floor(SR * 0.15), f); if (p > best || !fb) { best = p; fb = f } } return fb }
    s.degraus = [await tomDe(0), await tomDe(1), await tomDe(2), await tomDe(7)]
    // 16 Tesouras ao mesmo tempo, com o volume no máximo: o limitador e o teto seguram
    const ctx = new OfflineAudioContext(2, SR * 1.6, SR), cad = Som.cadeia(ctx)
    cad.efeitos.gain.value = 1 / 0.7
    for (let k = 0; k < 16; k++) Som.fabricar('tesoura', 0, ctx, { quando: PRE })
    const b = await ctx.startRendering(); s.pilha = medir(b.getChannelData(0), b.getChannelData(1))
    // abaixo do limiar o limitador não mexe: uma senoide a −20 dBFS sai a −20 dBFS
    const c2 = new OfflineAudioContext(2, SR * 1.2, SR), cad2 = Som.cadeia(c2), o = c2.createOscillator(), g = c2.createGain()
    o.frequency.value = 1000; g.gain.value = 0.1; o.connect(g); g.connect(cad2.efeitos); o.start(PRE); o.stop(PRE + 0.5)
    const b2 = await c2.startRendering(); let p = 0; for (let i = Math.floor((PRE + 0.1) * SR); i < Math.floor((PRE + 0.4) * SR); i++) p = Math.max(p, Math.abs(b2.getChannelData(0)[i]))
    s.transparente = 20 * Math.log10(p)
    return s
  })
  confere(r.esq.picoLDb > r.esq.picoRDb + 6 && r.dir.picoRDb > r.dir.picoLDb + 6 && Math.abs(r.meio.picoLDb - r.meio.picoRDb) < 0.2, `efeito sai do lado do boneco: 'A' à esquerda (${n1(r.esq.picoLDb)} / ${n1(r.esq.picoRDb)} dBFS), 'B' à direita, sem lado no centro`)
  confere(r.esq.picoDb <= -3 && r.dir.picoDb <= -3, `de lado o pico continua abaixo de −3 dBFS (${n1(r.esq.picoDb)})`)
  confere(r.veu.comecoE > r.veu.comecoD * 1.6 && r.veu.fimD > r.veu.fimE * 1.6, `Véu: o sopro passa de um lado ao outro, começando do lado do boneco (começo ${n1(20 * Math.log10(r.veu.comecoE / r.veu.comecoD))} dB à esquerda; fim ${n1(20 * Math.log10(r.veu.fimD / r.veu.fimE))} dB à direita)`)
  confere(Math.abs(r.critico - r.criticoCalmo - 6) < 0.5 && Math.abs(r.tesoura - r.tesouraCalmo - 6) < 0.5, `"Menos animação": crítico e Tesoura 6 dB mais baixos (${n1(r.critico)} → ${n1(r.criticoCalmo)}; ${n1(r.tesoura)} → ${n1(r.tesouraCalmo)})`)
  confere(Math.abs(r.golpeCalmo - r.meio.picoDb) < 0.2, '"Menos animação" não muda os outros sons (golpe igual)')
  confere(Math.abs(r.forte - r.fraco - 9.1) < 0.6, `força 0..1 muda o volume (${n1(r.fraco)} a ${n1(r.forte)} dBFS)`)
  const st = (a, b) => 12 * Math.log2(b / a)
  confere(Math.abs(st(r.degraus[0], r.degraus[1]) - 2) < 0.35 && Math.abs(st(r.degraus[0], r.degraus[2]) - 3) < 0.35 && Math.abs(st(r.degraus[0], r.degraus[3]) - 12) < 0.35, `casulo: cada parte um degrau da escala acima (${r.degraus.map((f) => Math.round(f)).join(' → ')} Hz)`)
  confere(r.pilha.picoDb <= -3 && r.pilha.estouros === 0, `16 Tesouras juntas com volume no máximo: pico ${n1(r.pilha.picoDb)} dBFS (nunca acima de −3)`)
  confere(Math.abs(r.transparente + 20) < 0.3, `abaixo do limiar o limitador não mexe no som (−20,0 → ${n1(r.transparente)} dBFS)`)
  anota(`posição: golpe 'A' E ${n1(r.esq.picoLDb)} / D ${n1(r.esq.picoRDb)} dBFS · 'B' E ${n1(r.dir.picoLDb)} / D ${n1(r.dir.picoRDb)} · centro ${n1(r.meio.picoDb)}`)
  anota(`Menos animação: crítico ${n1(r.critico)} → ${n1(r.criticoCalmo)} · Tesoura ${n1(r.tesoura)} → ${n1(r.tesouraCalmo)} · golpe igual (${n1(r.golpeCalmo)})`)
  anota(`limitador: 16 Tesouras juntas no volume máximo → pico ${n1(r.pilha.picoDb)} dBFS · senoide de −20,0 dBFS sai a ${n1(r.transparente)} dBFS`)
}

// ================================================================== 4. música: 16 compassos de cada momento
cabecalho('Música: 16 compassos de cada momento (48 kHz, pela mesma cadeia)')
anota(`mediana do pico dos efeitos: ${n1(medianaEfeitos)} dBFS`)
anota('momento           bpm  tom  segundos  pico dBFS  médio dBFS  abaixo dos efeitos  tema (9 notas)')
const mus = {}
for (const nome of ['entrada', 'luta', 'tesouraDescendo', 'tesouraCortando', 'ultimoFio', 'costura']) {
  const m = (mus[nome] = await medirMusica(page, nome))
  const abaixo = medianaEfeitos - m.picoDb
  // nota certa = forte, acabou de entrar (subiu 8 dB) e mais forte que as vizinhas de meio tom (no Último Fio e com as cordas a vizinha pode estar soando no acorde: aí vale a entrada)
  const notasOk = m.tema.filter((n) => n.certa > -75 && n.certa > Math.max(n.abaixo, n.acima) && (n.certa > Math.max(n.abaixo, n.acima) + 8 || n.certa > n.antes + 8)).length
  anota(`${nome.padEnd(17)} ${String(m.bpm).padStart(3)}  ${m.tom ? '+' + m.tom : ' 0'}   ${n1(m.duracao).padStart(7)}  ${n1(m.picoDb).padStart(9)}  ${n1(m.rmsDb).padStart(10)}  ${(n1(abaixo) + ' dB').padStart(18)}  ${notasOk} de 9`)
  confere(m.estouros === 0 && m.picoDb <= -3, `${nome}: sem estouro (pico ${n1(m.picoDb)} dBFS, médio ${n1(m.rmsDb)} dBFS)`)
  confere(abaixo >= 9 && abaixo <= 15, `${nome}: cerca de 12 dB abaixo dos efeitos (${n1(abaixo)} dB)`)
  confere(notasOk === 9, `${nome}: o tema está nas frequências certas (${notasOk} de 9 notas; ${m.tema.map((n) => Math.round(n.hz)).join(' ')} Hz)`)
  confere(m.buracoS < 0.5, `${nome}: a música não fura (maior silêncio ${m.buracoS.toFixed(2)} s)`)
}
confere(mus.luta.bpm === 92 && Math.abs(mus.luta.duracao - 16 * 3 * 60 / 92) < 0.01, `luta: 3 por 4 a 92 batidas por minuto (16 compassos = ${n1(mus.luta.duracao)} s)`)
confere(mus.entrada.bpm < mus.luta.bpm, `entrada: devagar (${mus.entrada.bpm} bpm)`)
confere(mus.tesouraCortando.tom === 1 && Math.abs(mus.tesouraCortando.tema[0].hz / mus.luta.tema[0].hz - 2 ** (1 / 12)) < 0.001, 'Tesoura cortando: meio tom acima')
confere(mus.ultimoFio.agudo < mus.luta.agudo - 12, `Último Fio: a música abafa (agudos ${n1(mus.luta.agudo - mus.ultimoFio.agudo)} dB mais baixos)`)
confere(mus.ultimoFio.grave > mus.luta.grave + 8, `Último Fio: a batida de coração entra no grave (+${n1(mus.ultimoFio.grave - mus.luta.grave)} dB entre 50 e 92 Hz)`)
confere(Math.abs(mus.tesouraDescendo.rmsDb - mus.luta.rmsDb) > 0.05 || Math.abs(mus.tesouraDescendo.agudo - mus.luta.agudo) > 0.3, 'Tesoura descendo: o tique-taque muda o som da luta')
{
  const r = await page.evaluate(async () => {
    const { Musica, Som, SR, fora, forca, mono } = window.__m, s = {}
    for (const nome of ['vitoria', 'derrota']) {
      const { L, R, info } = await fora(8, (ctx, q) => Musica.fabricar(nome, 4, ctx, { quando: q }), 1), x = mono(L, R, 0, L.length)
      let salto = null; for (let k = Math.floor(info.inicio * SR); k < x.length; k++) if (Math.abs(x[k]) > 0.1) { salto = k / SR; break }
      const virada = info.inicio + 2 * 6 * info.colcheia, t = virada + 0.006 + 2 * 0.15
      s[nome] = { salto, virada, fa: forca(x, Math.floor((t + 0.01) * SR), Math.floor((t + 0.12) * SR), Som.hz('F6')), faSus: forca(x, Math.floor((t + 0.01) * SR), Math.floor((t + 0.12) * SR), Som.hz('F#6')) }
    }
    // costura: o tema sobe um degrau a cada parte
    const { L, R, info } = await fora(16 * 2.25, (ctx, q) => Musica.fabricar('costura', 16, ctx, { quando: q }), 1), x = mono(L, R, 0, L.length)
    s.costura = [0, 1, 2, 3].map((d) => { const t = info.inicio + d * 2 * 6 * info.colcheia; let best = -999, fb = 0; for (let f = 500; f < 1200; f *= 1.003) { const p = forca(x, Math.floor((t + 0.015) * SR), Math.floor((t + 0.2) * SR), f); if (p > best) { best = p; fb = f } } return fb })
    return s
  })
  confere(Math.abs(r.vitoria.salto - r.vitoria.virada) < 0.03 && Math.abs(r.derrota.salto - r.derrota.virada) < 0.03, `vitória e derrota entram na virada do compasso (aos ${r.vitoria.salto.toFixed(2)} s; virada aos ${r.vitoria.virada.toFixed(2)} s)`)
  confere(r.vitoria.faSus > r.vitoria.fa + 15, `vitória: tema em ré MAIOR (fá sustenido ${n1(r.vitoria.faSus)} dB, fá natural ${n1(r.vitoria.fa)} dB)`)
  const st = r.costura.map((f) => Math.round(12 * Math.log2(f / r.costura[0])))
  confere(st.join(',') === '0,2,3,5', `costura: o tema sobe um degrau a cada parte (${r.costura.map((f) => Math.round(f)).join(' → ')} Hz = ${st.join(', ')} semitons)`)
}

// ================================================================== 5. ao vivo: primeiro toque, vozes, mudo, volumes, aba escondida
cabecalho('Ao vivo: primeiro toque, teto de vozes, mudo, volumes guardados')
await page.evaluate(() => window.__folha.musicaPronta)
await page.locator('h1').click() // o primeiro toque do jogador
await dorme(650)
{
  const e = await page.evaluate(() => ({ som: window.__m.Som.estado(), mus: window.__m.Musica.estado() }))
  confere(e.som.iniciado && e.som.rodando, `depois do primeiro toque o áudio liga (${e.som.taxa} Hz)`)
  confere(e.mus.tocando && e.mus.camada === 'luta', 'a música que estava anotada começa sozinha no primeiro toque')
  await page.evaluate(() => window.__m.Musica.parar(100))
  await dorme(1300)
  const r = await page.evaluate(async () => {
    const { Som } = window.__m, s = {}
    Som.zerarContagem()
    const um = Som.tocar('golpe', { lado: 'B', forca: 0.7 })
    s.um = um && { fonte: um.fonte, variacao: um.variacao, nome: um.nome }; s.depoisDeUm = Som.estado()
    for (let i = 0; i < 20; i++) Som.tocar('aposentadoria')
    s.cheio = Som.estado()
    s.seq = []; for (let i = 0; i < 40; i++) s.seq.push(Som.tocar('botao')?.variacao)
    s.depois = Som.estado(); s.pedidos = Som.contagem(); s.tocados = Som.contagem('tocados')
    return s
  })
  confere(r.um?.fonte === 'codigo' && r.depoisDeUm.vozes === 1 && r.depoisDeUm.nosVivos > 5, `tocar devolve o que tocou (${JSON.stringify(r.um)}) e a voz fica viva (${r.depoisDeUm.nosVivos} nós)`)
  confere(r.cheio.vozes === 16 && r.depois.vozes === 16, `teto de 16 vozes: 21 pedidos de som longo → ${r.cheio.vozes} vozes; mais 40 cliques → ${r.depois.vozes}`)
  confere(r.pedidos.aposentadoria === 20 && r.tocados.aposentadoria === 20 && r.pedidos.botao === 40, 'contagem de chamadas por efeito confere (20 e 40)')
  const repete = r.seq.some((v, i) => i > 0 && v === r.seq[i - 1])
  confere(!repete && new Set(r.seq).size === 3, `a mesma variação nunca toca duas vezes seguidas (40 toques: ${r.seq.slice(0, 14).join('')}…)`)
  await dorme(3100)
  const fim = await page.evaluate(() => window.__m.Som.estado())
  confere(fim.vozes === 0 && fim.nosVivos === 0, `depois do fim nenhum nó de áudio fica vivo (vozes ${fim.vozes}, nós ${fim.nosVivos})`)

  // o laço do tempo acabando para quando mandam
  const laco = await page.evaluate(async () => { const { Som } = window.__m; Som.tocar('tempoAcabando'); await new Promise((ok) => setTimeout(ok, 300)); const a = Som.estado().tocando.slice(); Som.parar('tempoAcabando'); await new Promise((ok) => setTimeout(ok, 120)); return { a, b: Som.estado() } })
  confere(laco.a.includes('tempoAcabando') && laco.b.vozes === 0 && laco.b.nosVivos === 0, 'o tique-taque do tempo acabando toca e para na hora (parar)')

  // mudo
  const mudo = await page.evaluate(() => { const { Som } = window.__m; Som.mudo(true); const v = Som.tocar('golpe'); return { v, e: Som.estado(), ganho: Som.cadeia().mestre.gain.value } })
  confere(mudo.v === null && mudo.e.mudo && mudo.e.vozes === 0, 'mudo: nada toca')
  await page.locator('#btnMudo').click(); await dorme(150)
  confere(await page.evaluate(() => !window.__m.Som.estaMudo() && window.__m.Som.cadeia().mestre.gain.value > 0.9), 'o botão de mudo da folha desliga o mudo')
  // volumes guardados no aparelho
  await page.evaluate(() => { window.__m.Som.volumes({ efeitos: 0.3, musica: 0.8 }); window.__m.Som.mudo(true) })
  await page.reload(); await folhaPronta(page); await instalarMedidor(page)
  const guardado = await page.evaluate(() => ({ v: window.__m.Som.volumes(), mudo: window.__m.Som.estaMudo(), e: document.querySelector('#volEfeitos').value, m: document.querySelector('#volMusica').value, b: document.querySelector('#btnMudo').getAttribute('aria-pressed') }))
  confere(guardado.v.efeitos === 0.3 && guardado.v.musica === 0.8 && guardado.mudo === true, `volumes e mudo ficam guardados no aparelho (efeitos ${guardado.v.efeitos}, música ${guardado.v.musica}, mudo ${guardado.mudo})`)
  confere(guardado.e === '30' && guardado.m === '80' && guardado.b === 'true', 'os controles da folha mostram o que estava guardado')
  await page.evaluate(() => { window.__m.Som.volumes({ efeitos: 0.7, musica: 0.45 }); window.__m.Som.mudo(false) })
  // controles da folha
  await page.locator('#volEfeitos').fill('55'); await page.locator('#optCalmo').check()
  const ctl = await page.evaluate(() => ({ v: window.__m.Som.volumes().efeitos, calmo: window.__m.Som.calmo() }))
  confere(ctl.v === 0.55 && ctl.calmo === true, 'controles de volume e "Menos animação" da folha chegam ao som')
  await page.evaluate(() => { window.__m.Som.volumes({ efeitos: 0.7 }); window.__m.Som.calmo(false) })
}

// ================================================================== 6. música ao vivo: virada do compasso, abaixar, aba escondida
cabecalho('Música ao vivo: troca na virada do compasso, abaixar nos golpes grandes, pausa com a aba escondida')
{
  await page.locator('#mu-luta button').click()
  await dorme(900)
  const r = await page.evaluate(async () => {
    const { Som, Musica } = window.__m, espera = (ms) => new Promise((ok) => setTimeout(ok, ms)), s = { linha: [] }
    s.inicio = Musica.estado()
    // pede a troca no meio do compasso e vigia: só pode mudar quando o contador de compassos muda
    for (const c = Musica.estado().compassos; Musica.estado().compassos === c; ) await espera(30) // espera um compasso começar…
    await espera(500) // …e pede a troca no meio dele
    const c0 = Musica.estado().compassos
    Musica.momento('tesouraDescendo'); s.logoDepois = Musica.estado()
    for (let i = 0; i < 70; i++) { const e = Musica.estado(); s.linha.push([e.compassos - c0, e.camada]); if (e.camada === 'tesouraDescendo' && e.compassos - c0 >= 2) break; await espera(40) }
    // golpe grande: a música abaixa 6 dB e volta
    const duck = Som.cadeia().duck.gain
    s.antes = duck.value; Som.tocar('critico'); await espera(150); s.durante = duck.value; await espera(700); s.depois = duck.value
    // Tesoura cortando afina os efeitos meio tom acima
    Musica.momento('tesouraCortando'); await espera(2300); s.afinacao = Som.estado().afinacao; s.cortando = Musica.estado()
    Musica.momento('ultimoFio'); await espera(2700); s.fio = Musica.estado(); s.filtro = Som.cadeia().abafa.frequency.value
    Musica.momento('luta'); await espera(2600); s.volta = Musica.estado(); s.filtro2 = Som.cadeia().abafa.frequency.value; s.afinacao2 = Som.estado().afinacao
    // aba escondida: o áudio para; volta sozinho
    const t0 = Som.contexto().currentTime
    Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); await espera(400)
    s.escondida = Som.contexto().state; const t1 = Som.contexto().currentTime; await espera(400); s.parado = Som.contexto().currentTime - t1; s.pedidoEscondido = Som.tocar('golpe')
    Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); await espera(400)
    s.devolta = Som.contexto().state; s.andou = Som.contexto().currentTime - t0
    // vitória pela música: o fim toca uma vez só, na virada
    Som.zerarContagem(); Musica.momento('vitoria'); Som.vitoria(); await espera(2400)
    s.fim = Musica.estado(); s.vitorias = Som.contagem('tocados').vitoria; await espera(900); Som.vitoria(); s.vitorias2 = Som.contagem('tocados').vitoria
    Musica.parar(100); await espera(1200); s.parada = Musica.estado(); s.nos = Som.estado()
    return s
  })
  confere(r.inicio.tocando && r.inicio.camada === 'luta' && r.inicio.bpm === 92, 'botão da folha começa a música da luta (92 bpm)')
  confere(r.logoDepois.camada === 'luta' && r.logoDepois.pendente === 'tesouraDescendo', 'troca pedida no meio do compasso fica pendente')
  const troca = r.linha.findIndex((x) => x[1] === 'tesouraDescendo'), noMeio = r.linha.some((x, i) => i > 0 && x[1] !== r.linha[i - 1][1] && x[0] === r.linha[i - 1][0])
  confere(troca > 0 && !noMeio, `a camada só troca na virada do compasso (trocou quando o compasso virou: ${JSON.stringify(r.linha[troca])})`)
  confere(r.antes > 0.98 && Math.abs(r.durante - 0.5) < 0.04 && r.depois > 0.98, `no crítico a música abaixa 6 dB e volta (${r.antes.toFixed(2)} → ${r.durante.toFixed(2)} → ${r.depois.toFixed(2)})`)
  confere(r.cortando.camada === 'tesouraCortando' && r.afinacao === 1 && r.afinacao2 === 0, 'Tesoura cortando: música meio tom acima e as notas dos efeitos acompanham')
  confere(r.fio.momento === 'ultimoFio' && r.fio.camada === 'tesouraCortando' && r.filtro < 1500 && r.filtro2 > 15000, `Último Fio abafa a camada que estava tocando (filtro em ${Math.round(r.filtro)} Hz) e depois solta`)
  confere(r.escondida === 'suspended' && r.parado < 0.02 && r.pedidoEscondido === null && r.devolta === 'running', 'aba escondida: o áudio para e nada toca; volta sozinho quando a aba aparece')
  confere(r.fim.momento === 'vitoria' && !r.fim.tocando && r.vitorias === 1 && r.vitorias2 === 1, 'vitória: a música para e o tema em ré maior toca uma vez só (pela música ou pelo atalho)')
  confere(r.parada.momento === null && r.nos.vozes === 0 && r.nos.nosVivos === 0, 'parar a música desmonta tudo')
}

// ================================================================== 7. a luta de exemplo da folha
cabecalho('Folha: a luta de exemplo')
{
  await page.evaluate(() => window.__m.Som.zerarContagem())
  await page.locator('#btnLuta').click()
  const momentos = new Set()
  for (let i = 0; i < 68; i++) { await dorme(500); const m = await page.evaluate(() => window.__m.Musica.estado().momento); if (m) momentos.add(m) }
  const r = await page.evaluate(() => ({ tocados: window.__m.Som.contagem('tocados'), passos: window.__folha.roteiro.length, linhas: document.querySelectorAll('#diario li').length }))
  const precisa = { cartaJogada: 8, golpe: 2, escudo: 1, golpeNoEscudo: 1, critico: 2, tesouraDesce: 1, erroDoVeu: 1, ultimoFio: 1, queda: 2, tesoura: 1, vitoria: 1 }
  const faltam = Object.entries(precisa).filter(([k, n]) => r.tocados[k] !== n).map(([k, n]) => `${k}: ${r.tocados[k] ?? 0} (esperado ${n})`)
  confere(faltam.length === 0, `a luta de exemplo toca cada som na hora certa, uma vez por acontecimento${faltam.length ? ' — ' + faltam.join('; ') : ''}`)
  confere(['luta', 'tesouraDescendo', 'ultimoFio', 'tesouraCortando', 'vitoria'].every((m) => momentos.has(m)), `a música muda de momento durante a luta (${[...momentos].join(' → ')})`)
  confere(r.passos === 30 && r.linhas === 30, `os ${r.passos} passos do roteiro aparecem escritos na folha`)
  anota(`luta de exemplo: ${Object.entries(r.tocados).map(([k, n]) => `${k}×${n}`).join(' ')} · música: ${[...momentos].join(' → ')}`)
  await page.evaluate(() => { window.__m.Musica.parar(100); window.__m.Som.parar() })
}

// ================================================================== 8. fotos da folha (PC)
cabecalho('Fotos da folha de sons')
async function fotosEmGrupos(pg, seletor, por, nome) {
  const cs = await pg.evaluate((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height } }), seletor)
  for (let i = 0; i < cs.length; i += por) {
    const g = cs.slice(i, i + por), y0 = g[0].y - 4, y1 = g[g.length - 1].y + g[g.length - 1].h + 4, arq = path.join(FOTOS, `${nome}-${i / por + 1}.png`)
    await pg.screenshot({ path: arq, fullPage: true, clip: { x: g[0].x - 4, y: y0, width: g[0].w + 8, height: y1 - y0 } })
    console.log('  foto: ' + path.relative(process.cwd(), arq))
  }
}
await page.evaluate(() => { window.scrollTo(0, 0) })
await page.evaluate(() => window.__folha.musicaPronta)
await page.screenshot({ path: path.join(FOTOS, 'som-folha-topo.png') }); console.log('  foto: tests/tela/fotos/som-folha-topo.png')
await fotosEmGrupos(page, '.efeito', 5, 'som-efeitos')
await fotosEmGrupos(page, '.momento', 4, 'som-musica')
await page.close()

// ================================================================== 9. celular
cabecalho('Folha no celular (360×740)')
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  const p = await ctx.newPage(); vigiar(p)
  await p.goto(base + '/sons.html'); await folhaPronta(p)
  const r = await p.evaluate(() => {
    const pequenos = [...document.querySelectorAll('button')].filter((b) => { const q = b.getBoundingClientRect(); return q.width < 44 || q.height < 44 }).length
    return { rolagem: document.documentElement.scrollWidth > window.innerWidth + 1, pequenos, iniciado: window.__folha.Som.estado().iniciado }
  })
  confere(!r.rolagem, 'celular: sem rolagem lateral')
  confere(r.pequenos === 0, 'celular: todo botão tem pelo menos 44×44 px')
  await p.locator('#fx-golpe button').first().tap(); await dorme(400)
  const e = await p.evaluate(() => ({ e: window.__folha.Som.estado(), t: window.__folha.Som.contagem('tocados') }))
  confere(!r.iniciado && e.e.iniciado && e.t.golpe === 1, 'celular: o primeiro toque num botão liga o áudio e já toca o som')
  await p.locator('#fx-critico').scrollIntoViewIfNeeded()
  await p.screenshot({ path: path.join(FOTOS, 'som-folha-celular.png') }); console.log('  foto: tests/tela/fotos/som-folha-celular.png')
  await ctx.close()
}

// ================================================================== 10. amostras gravadas (manifesto de teste + WAV escrito aqui)
cabecalho('Amostras gravadas: manifesto de teste com um WAV escrito pelo próprio teste')
{
  page = await ctxPc.newPage(); vigiar(page)
  await page.route('**/sons/manifesto.json', (rota) => rota.fulfill({ contentType: 'application/json', body: JSON.stringify(MANIFESTO_DE_TESTE) }))
  await page.route('**/sons/teste-golpe.wav', (rota) => rota.fulfill({ contentType: 'audio/wav', body: WAV_GOLPE }))
  await page.route('**/sons/teste-musica.wav', (rota) => rota.fulfill({ contentType: 'audio/wav', body: WAV_MUSICA }))
  await page.goto(base + '/sons.html'); await folhaPronta(page); await instalarMedidor(page)
  const r = await page.evaluate(async () => {
    const { Som, SR, fora, forca, medir, mono } = window.__m, s = {}
    s.estado = Som.estado().amostras
    s.golpe = Som.amostrasDe('golpe'); s.botao = Som.amostrasDe('botao'); s.critico = Som.amostrasDe('critico')
    s.fontes = { golpe: Som.fonteDoEfeito('golpe'), botao: Som.fonteDoEfeito('botao'), critico: Som.fonteDoEfeito('critico'), escudo: Som.fonteDoEfeito('escudo') }
    const um = async (nome, fonte) => { const { L, R } = await fora(0.4, (ctx, q) => Som.fabricar(nome, 0, ctx, { quando: q, fonte })); const m = medir(L, R), x = mono(L, R, m.ini, m.ini + Math.floor(SR * 0.1)); return { ms: m.ms, picoDb: m.picoDb, fimDb: m.fimDb, caudaDb: m.caudaDb, atraso: m.inicio - 0.5, apito: forca(x, 0, x.length, 1000), grave: forca(x, 0, x.length, 100) } }
    s.amostra = await um('golpe', 'amostra'); s.codigo = await um('golpe', 'codigo'); s.criticoAmostra = await um('critico', 'amostra')
    s.lado = await (async () => { const { L, R } = await fora(0.4, (ctx, q) => Som.fabricar('golpe', 0, ctx, { quando: q, fonte: 'amostra', lado: 'B' })); const m = medir(L, R); return [m.picoLDb, m.picoRDb] })()
    try { Som.fabricar('botao', 0, new OfflineAudioContext(2, 4800, SR), { fonte: 'amostra' }); s.botaoErro = false } catch { s.botaoErro = true }
    s.folha = { blocos: document.querySelectorAll('.lado-a-lado').length, golpe: document.querySelectorAll('#fx-golpe .lado-a-lado canvas').length, botao: document.querySelector('#fx-botao .lado-a-lado .medidas')?.textContent, etiqueta: document.querySelector('#fx-golpe header .etiqueta').textContent, medidas: window.__folha.medidasAmostra.golpe?.[0] }
    return s
  })
  confere(r.golpe[0]?.estado === 'ok' && r.estado.prontas === 2 && r.estado.falhas === 1, `o manifesto de teste carrega (${r.estado.prontas} prontas, ${r.estado.falhas} falha)`)
  confere(r.golpe[0].duracao > 0.14 && r.golpe[0].duracao < 0.2, `a amostra é aparada: sai o silêncio do começo e do fim (${Math.round(r.golpe[0].duracao * 1000)} ms de 400)`)
  confere(r.fontes.golpe === 'amostra' && r.fontes.escudo === 'codigo', 'fonteDoEfeito: com arquivo no manifesto → amostra; sem arquivo → código')
  confere(r.botao[0]?.estado === 'falhou' && r.fontes.botao === 'codigo' && r.botaoErro, 'arquivo que não carrega (404) cai para o som feito por código')
  confere(r.amostra.apito > r.amostra.grave + 20 && r.codigo.grave > r.codigo.apito + 10, `a amostra toca no lugar do código (o apito de 1.000 Hz do WAV: ${n1(r.amostra.apito)} dB na amostra, ${n1(r.codigo.apito)} dB no código)`)
  confere(Math.abs(r.amostra.picoDb + 8) < 0.6 && Math.abs(r.codigo.picoDb + 8) < 0.5, `a medição de pico vale para as duas fontes: golpe por amostra ${n1(r.amostra.picoDb)} dBFS, por código ${n1(r.codigo.picoDb)} dBFS (alvo −8)`)
  confere(r.amostra.atraso < 0.012 && r.amostra.fimDb < -46 && r.amostra.caudaDb < -90, `a amostra sai na hora (${Math.round(r.amostra.atraso * 1000)} ms, o atraso do limitador) e termina sem clique`)
  confere(Math.abs(r.criticoAmostra.picoDb + 6) < 0.6 && r.criticoAmostra.ms <= 125, `ganhoDb e cortarMs do manifesto valem, sem sair da faixa (crítico +3 dB → ${n1(r.criticoAmostra.picoDb)} dBFS, ${Math.round(r.criticoAmostra.ms)} ms)`)
  confere(r.lado[1] > r.lado[0] + 6, 'a amostra sai do lado do boneco, como o código')
  confere(r.folha.blocos === 3 && r.folha.golpe === 2 && /não carregou/.test(r.folha.botao || '') && /amostra/.test(r.folha.etiqueta), 'a folha mostra as duas versões lado a lado (código × amostra) e avisa quando o arquivo não carregou')
  confere(r.folha.medidas && Math.abs(r.folha.medidas.picoDb - r.amostra.picoDb) < 0.2, 'as medidas da amostra na folha batem com as do teste')
  // ao vivo
  await page.locator('h1').click(); await dorme(600)
  const v = await page.evaluate(async () => {
    const { Som, Musica } = window.__m, espera = (ms) => new Promise((ok) => setTimeout(ok, ms)), s = {}
    s.golpe = Som.tocar('golpe')?.fonte; s.botao = Som.tocar('botao')?.fonte; s.escudo = Som.tocar('escudo')?.fonte; s.vozes = Som.estado().vozes
    document.querySelector('#optAmostras').click()
    s.chave = Som.usarAmostras(); s.golpeSem = Som.tocar('golpe')?.fonte; s.fonteSem = Som.fonteDoEfeito('golpe'); s.etiqueta = document.querySelector('#fx-golpe header .etiqueta').textContent
    document.querySelector('#optAmostras').click(); s.golpeCom = Som.tocar('golpe')?.fonte
    await espera(900); s.nos = Som.estado()
    // música: arquivo por momento, com troca por esmaecimento
    Musica.tocar('entrada'); await espera(1500); s.entrada = Musica.estado()
    Musica.momento('luta'); await espera(3200); s.luta = Musica.estado()
    Musica.parar(100); await espera(1200)
    return s
  })
  confere(v.golpe === 'amostra' && v.botao === 'codigo' && v.escudo === 'codigo' && v.vozes === 3, 'ao vivo: golpe toca a amostra; botão (arquivo falhou) e escudo (sem arquivo) tocam o código; todos contam no teto de vozes')
  confere(v.chave === false && v.golpeSem === 'codigo' && v.fonteSem === 'codigo' && /código/.test(v.etiqueta) && v.golpeCom === 'amostra', 'a chave geral da folha troca entre amostras e código')
  confere(v.nos.vozes === 0 && v.nos.nosVivos === 0, 'amostra também não deixa nó vivo depois do fim')
  confere(v.entrada.gravada === true && v.entrada.tocando && v.luta.gravada === false && v.luta.camada === 'luta', 'música: momento com arquivo no manifesto toca o arquivo; ao trocar de momento volta a música gerada')
  await page.locator('#fx-golpe').scrollIntoViewIfNeeded()
  const caixa = await page.evaluate(() => { const a = document.querySelector('#fx-golpe').getBoundingClientRect(), b = document.querySelector('#fx-critico').getBoundingClientRect(); return { x: a.left + scrollX - 4, y: a.top + scrollY - 4, width: a.width + 8, height: b.bottom - a.top + 8 } })
  await page.screenshot({ path: path.join(FOTOS, 'som-amostras.png'), fullPage: true, clip: caixa }); console.log('  foto: tests/tela/fotos/som-amostras.png')
  await page.close()
}

// ================================================================== fim
confere(erros.length === 0, 'sem erro de console nem de página' + (erros.length ? ': ' + erros.slice(0, 4).join(' | ') : ''))
anota(); anota(falhas.length ? `RESULTADO: ${falhas.length} falha(s)\n` + falhas.map((f) => ' - ' + f).join('\n') : 'RESULTADO: tudo dentro da régua da direção de som.')
const arqRelatorio = path.join(FOTOS, 'som-medidas.txt')
fs.writeFileSync(arqRelatorio, ['Frayz — medidas do som (tests/tela/som.e2e.mjs). Tudo fabricado fora do tempo real a 48 kHz, depois do limitador, volumes no padrão.', ...relatorio].join('\n') + '\n')
console.log('\nrelatório: ' + path.relative(process.cwd(), arqRelatorio))
await browser.close(); servidor.close()
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO VERDE')
process.exit(falhas.length ? 1 : 0)
