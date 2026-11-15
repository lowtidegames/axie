// Frayz — SOM: motor dos efeitos, mistura e amostras gravadas. Régua: docs/direcao-de-som.md.
// Dois mundos de som, e só esses dois: o ATELIÊ (tesoura, agulha, linha, pano, enchimento, dedal) e a CAIXINHA DE MÚSICA.
// Todo efeito é FABRICADO POR CÓDIGO (WebAudio); se `public/sons/manifesto.json` trouxer um arquivo gravado para o nome,
// a amostra toca no lugar (mesma posição, mesmo teto de vozes, mesmo limitador, mesma faixa de pico) e o código vira reserva.
// Este arquivo não conhece regra do jogo: só recebe "aconteceu isto" → `tocar(nome, opcoes)`.
//
// API: iniciar() · tocar(nome, { lado, forca, degrau, pan, quando }) · parar(nome) · volumes({ efeitos, musica }) · mudo(liga)
//      calmo(liga) · estado() · nomes() · tabela() · contagem() · fabricar(nome, variacao, ctxOffline, opcoes) · calibrar()
//      amostras: carregarManifesto() · carregarAmostras() · usarAmostras(liga) · fonteDoEfeito(nome) · amostrasDe(nome)
//      para a música: contexto() · cadeia(ctx) · caixinha(...) · aoTocar(fn) · afinar(semitons) · musicaGravada(momento)
//      atalhos (os nomes do esqueleto): cartaJogada, golpe, critico, escudo, erroDoVeu, ultimoFio, queda, tesoura, vitoria,
//      derrota, casuloParte(i, raridade), aposentadoria, mudo(liga), estaMudo(), registro.

const AC = globalThis.AudioContext || globalThis.webkitAudioContext

// ------------------------------------------------------------------ mistura (docs/direcao-de-som.md §4)
export const PADRAO = Object.freeze({ efeitos: 0.7, musica: 0.45 })
export const TETO_DE_VOZES = 16
export const LIMITADOR = Object.freeze({ limiar: -10, razao: 12, ataque: 0.003, soltura: 0.25 })
// O compressor do navegador soma sozinho um reforço fixo (0,6 × o que ele tiraria de um sinal no máximo). Tiramos esse
// reforço ANTES dele: abaixo de −4,5 dBFS o limitador não mexe no som; acima, segura; e o teto garante −3 dBFS.
const REFORCO_DB = 0.6 * -(LIMITADOR.limiar - LIMITADOR.limiar / LIMITADOR.razao)
export const TETO_DBFS = -3.1
const TETO_LIN = 10 ** (TETO_DBFS / 20), JOELHO_DO_TETO = 0.56
const FAIXA_DE_PICO = [-12, -6]
const SUMICO = 0.012 // s: todo som termina com uma rampa curva até o zero (sem clique)
const CHAVE = 'frayz_som'
const GRANDES = ['critico', 'queda', 'tesoura'] // a música abaixa 6 dB por 400 ms nestes
const lim = (v, a, b) => Math.max(a, Math.min(b, v))
const dbParaLin = (db) => 10 ** (db / 20)

// ------------------------------------------------------------------ notas (lá = 440 Hz) e escala de ré menor
const SEMITOM = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
/** 'D5', 'C#6', 'Bb4' → número MIDI */
export function midi(nome) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(nome)
  return 12 * (Number(m[3]) + 1) + SEMITOM[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
}
export const hzDoMidi = (m) => 440 * 2 ** ((m - 69) / 12)
export const hz = (nome) => hzDoMidi(midi(nome))
const MENOR = [0, 2, 3, 5, 7, 8, 10]
/** Semitons do grau `d` da escala menor natural (d pode passar da oitava ou ser negativo). */
export const grau = (d) => 12 * Math.floor(d / 7) + MENOR[((d % 7) + 7) % 7]
/** O tema do Frayz: ré – fá – lá – sol – mi | fá – ré – dó sustenido – ré (início em colcheias, 3 por 4). */
export const TEMA = Object.freeze([['D', 0], ['F', 2], ['A', 3], ['G', 4], ['E', 5], ['F', 6], ['D', 8], ['C#', 9], ['D', 10]])

// ------------------------------------------------------------------ variações (nunca a mesma duas vezes seguidas)
const VARIACOES = [
  { i: 0, tom: 1, fil: 1, cents: 0, sem: 0 },
  { i: 1, tom: 0.955, fil: 0.88, cents: -7, sem: 0.613 },
  { i: 2, tom: 1.05, fil: 1.14, cents: 8, sem: 1.271 },
]

// ------------------------------------------------------------------ por contexto: ruído com semente e cadeia final
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const INFRA = new WeakMap()
function infra(ctx) {
  let i = INFRA.get(ctx)
  if (!i) {
    const n = Math.floor(ctx.sampleRate * 2), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), r = mulberry(0x46726179)
    for (let k = 0; k < n; k++) d[k] = r() * 2 - 1
    i = { ruido: b, cadeia: null }
    INFRA.set(ctx, i)
  }
  return i
}

let curvaTeto = null
function curvaDoTeto() {
  if (curvaTeto) return curvaTeto
  const n = 8193, c = new Float32Array(n), j = JOELHO_DO_TETO, folga = TETO_LIN - j
  for (let k = 0; k < n; k++) {
    const x = (k / (n - 1)) * 2 - 1, a = Math.abs(x)
    c[k] = Math.sign(x) * (a <= j ? a : j + folga * Math.tanh((a - j) / folga))
  }
  return (curvaTeto = c)
}

/** A cadeia final de um contexto (o de verdade ou um OfflineAudioContext): barramentos → limitador → teto → saída. */
export function cadeia(ctx = vivo.ctx, { aquecer = false } = {}) {
  if (!ctx) return null
  const inf = infra(ctx)
  if (inf.cadeia) return inf.cadeia
  const g = (v = 1) => { const n = ctx.createGain(); n.gain.value = v; return n }
  const efeitos = g(), jingle = g(), musica = g(), musicaDireta = g(), volMusica = g(), duck = g(), soma = g()
  const abafa = ctx.createBiquadFilter(); abafa.type = 'lowpass'; abafa.frequency.value = 20000; abafa.Q.value = 0.5
  const pre = g(dbParaLin(-REFORCO_DB)), posLim = g(), mestre = g()
  const limitador = ctx.createDynamicsCompressor()
  limitador.threshold.value = LIMITADOR.limiar; limitador.ratio.value = LIMITADOR.razao; limitador.knee.value = 0
  limitador.attack.value = LIMITADOR.ataque; limitador.release.value = LIMITADOR.soltura
  const teto = ctx.createWaveShaper(); teto.curve = curvaDoTeto()
  efeitos.connect(soma); jingle.connect(soma)
  musica.connect(abafa); abafa.connect(duck); musicaDireta.connect(duck); duck.connect(volMusica); volMusica.connect(soma)
  soma.connect(pre); pre.connect(limitador); limitador.connect(posLim); posLim.connect(teto); teto.connect(mestre); mestre.connect(ctx.destination)
  if (aquecer) {
    // O compressor do navegador acorda "afundado" por ~250 ms. Nesse começo o som passa direto (o teto continua valendo).
    const direto = g(1), t = ctx.currentTime
    soma.connect(direto); direto.connect(teto)
    posLim.gain.setValueAtTime(0, t); posLim.gain.setValueAtTime(0, t + 0.36); posLim.gain.linearRampToValueAtTime(1, t + 0.4)
    direto.gain.setValueAtTime(1, t + 0.36); direto.gain.linearRampToValueAtTime(0, t + 0.4)
    setTimeout(() => { try { soma.disconnect(direto) } catch { /* já saiu */ } try { direto.disconnect() } catch { /* já saiu */ } }, 700)
  }
  return (inf.cadeia = { ctx, efeitos, jingle, musica, musicaDireta, abafa, duck, volMusica, soma, limitador, teto, mestre })
}

// ------------------------------------------------------------------ a nota da caixinha de música (efeitos e música usam a mesma)
/** Senoide + harmônico agudo + o "plim" da palheta; ataque seco; `queda` = segundos até cair 60 dB. Devolve os nós. */
export function caixinha(ctx, destino, freq, quando, o = {}) {
  const vel = o.vel ?? 1, queda = Math.max(0.05, o.queda ?? 0.9), brilho = o.brilho ?? 1
  const f = freq * 2 ** ((o.cents ?? 0) / 1200), nos = []
  const parcial = (mult, amp, dur) => {
    const fp = f * mult
    if (fp > ctx.sampleRate * 0.45 || amp <= 0) return null
    const os = ctx.createOscillator(), g = ctx.createGain(), p = amp * vel
    os.frequency.value = fp
    g.gain.setValueAtTime(0, quando); g.gain.linearRampToValueAtTime(p, quando + 0.002)
    g.gain.exponentialRampToValueAtTime(Math.max(1e-6, p * 0.001), quando + dur); g.gain.linearRampToValueAtTime(0, quando + dur + 0.012)
    os.connect(g); g.connect(destino); os.start(quando); os.stop(quando + dur + 0.02)
    nos.push(os, g)
    return os
  }
  const principal = parcial(1, 1, queda)
  parcial(4, 0.2 * brilho, queda * 0.42)
  if (!o.simples) parcial(6.27, 0.14 * brilho, Math.min(0.05, queda * 0.3))
  if (o.registrar) for (const n of nos) o.registrar(n)
  else if (principal) principal.onended = () => { for (const n of nos) { try { n.disconnect() } catch { /* já saiu */ } } }
  return nos
}

// ------------------------------------------------------------------ o kit de costura de sons (uma voz = um efeito tocando)
function kit(ctx, voz, t0, v, opc) {
  const inf = infra(ctx), sr = ctx.sampleRate
  const reg = (n) => { voz.nos.push(n); return n }
  const K = {
    ctx, t0, v, opc, saida: voz.entrada,
    g(valor = 1) { const n = reg(ctx.createGain()); n.gain.value = valor; return n },
    filtro(tipo, f, Q = 0.7) { const n = reg(ctx.createBiquadFilter()); n.type = tipo; n.frequency.value = lim(f, 20, sr * 0.45); n.Q.value = Q; return n },
    osc(tipo, f, a, b) { const n = reg(ctx.createOscillator()); n.type = tipo; n.frequency.value = f; n.start(t0 + a); n.stop(t0 + b); voz.fontes.push(n); return n },
    ruido(a, b, desloc = 0) {
      const n = reg(ctx.createBufferSource()); n.buffer = inf.ruido; n.loop = true
      n.start(t0 + a, (v.sem + desloc) % (inf.ruido.duration - 0.01)); n.stop(t0 + b); voz.fontes.push(n)
      return n
    },
    atraso(s) { const n = reg(ctx.createDelay(1)); n.delayTime.value = s; return n },
    desliza(param, a, de, para, dur) { param.setValueAtTime(de, t0 + a); param.exponentialRampToValueAtTime(para, t0 + a + dur) },
    /** Envelope: sobe em `atk` (≥ 2 ms), segura `seg`, cai até `piso`×pico e solta em `rel` (≥ 10 ms) até o zero. */
    adsr(param, a, dur, { atk = 0.003, seg = 0, rel = 0.012, piso = 0.03, pico = 1 } = {}) {
      const t = t0 + a, p = Math.max(1e-6, pico), tRel = Math.max(t + atk + seg + 0.001, t + dur - rel)
      param.setValueAtTime(0, t); param.linearRampToValueAtTime(p, t + atk)
      if (seg > 0) param.setValueAtTime(p, Math.min(t + atk + seg, tRel - 0.0005))
      param.exponentialRampToValueAtTime(Math.max(1e-6, p * piso), tRel)
      param.linearRampToValueAtTime(0, Math.max(tRel + 0.001, t + dur))
    },
    /** Camada afinada: oscilador com deslize de altura e envelope. */
    tom(o) {
      const { a = 0, dur, tipo = 'sine', f, f1 = f, glide = dur, para = K.saida } = o
      const os = K.osc(tipo, f, a, a + dur + 0.004)
      if (f1 !== f) K.desliza(os.frequency, a, f, f1, glide)
      const g = K.g(0); K.adsr(g.gain, a, dur, o)
      os.connect(g); g.connect(para)
      return { os, g }
    },
    /** Camada de ruído filtrado (pano, papel, linha, sopro); `pico` é o tamanho aproximado do pico, como no `tom`. */
    chiado(o) {
      const { a = 0, dur, tipo = 'bandpass', f, f1 = f, glide = dur, Q = 1, hp = 0, lp = 0, desloc = 0, ordem = 1, para = K.saida } = o
      const fonte = K.ruido(a, a + dur + 0.004, desloc + a * 1.7)
      let n = fonte, fl = null
      for (let k = 0; k < ordem; k++) { // ordem 2 = dois filtros em fila: a faixa fica nítida (a linha "canta" em vez de chiar)
        fl = K.filtro(tipo, f * v.fil, Q)
        if (f1 !== f) K.desliza(fl.frequency, a, lim(f * v.fil, 20, sr * 0.45), lim(f1 * v.fil, 20, sr * 0.45), glide)
        n.connect(fl); n = fl
      }
      if (hp) { const h = K.filtro('highpass', hp, 0.7); n.connect(h); n = h }
      if (lp) { const l = K.filtro('lowpass', lp, 0.7); n.connect(l); n = l }
      const fm = Math.sqrt(f * f1) * v.fil
      const banda = tipo === 'bandpass' ? 1.57 * fm / Q : tipo === 'lowpass' ? fm * 1.1 : Math.max(500, sr / 2 - fm)
      const escala = (ordem > 1 ? 1.25 : 1) / (3.2 * 0.577 * Math.sqrt(lim(banda / (sr / 2), 0.0005, 1)))
      const g = K.g(0); K.adsr(g.gain, a, dur, { ...o, pico: (o.pico ?? 1) * escala })
      n.connect(g); g.connect(para)
      return { fonte, fl, g }
    },
    /** Ganho picotado por um oscilador (o pano que rasga fibra por fibra, o atrito da linha, a catraca). */
    picote({ a = 0, b, tipo = 'sawtooth', f, f1 = f, prof = 0.5, inverte = true, para = K.saida }) {
      const g = K.g(1 - prof / 2), os = K.osc(tipo, f, a, b), d = K.g((inverte ? -1 : 1) * prof / 2)
      if (f1 !== f) K.desliza(os.frequency, a, f, f1, b - a)
      os.connect(d); d.connect(g.gain); g.connect(para)
      return g
    },
    /** Ganho que treme ao acaso (o granulado do papel). */
    granulado({ a = 0, b, f = 150, prof = 0.6, para = K.saida }) {
      const g = K.g(1), fonte = K.ruido(a, b, 0.77), l = K.filtro('lowpass', f, 0.7), d = K.g(prof / (2 * 0.577 * Math.sqrt(f * 1.1 / (sr / 2))))
      fonte.connect(l); l.connect(d); d.connect(g.gain); g.connect(para)
      return g
    },
    /** Tremor de altura (em cents) que cresce: a corda bamba, a linha esticada. */
    tremor(os, { a = 0, b, f = 9, f1 = f, de = 10, ate = 40 }) {
      const l = K.osc('sine', f, a, b), d = K.g(de)
      if (f1 !== f) K.desliza(l.frequency, a, f, f1, b - a)
      d.gain.setValueAtTime(de, t0 + a); d.gain.linearRampToValueAtTime(ate, t0 + b)
      l.connect(d); d.connect(os.detune)
    },
    /** Eco curto (linha de atraso com retorno), só para esta voz. */
    eco(tempo, retorno, nivel) {
      const ent = K.g(1), d = K.atraso(tempo), fb = K.g(retorno), out = K.g(nivel)
      ent.connect(d); d.connect(fb); fb.connect(d); d.connect(out); out.connect(K.saida)
      return ent
    },
    /** Nota da caixinha, na afinação da música (meio tom acima quando a Tesoura corta). */
    nota(nome, a, o = {}) {
      const f = (typeof nome === 'number' ? nome : hz(nome)) * 2 ** ((opc.afinacao ?? 0) / 12)
      caixinha(ctx, o.para ?? K.saida, f, t0 + a, { cents: v.cents, ...o, registrar: reg })
    },
    /** Sino pequeno de parciais desafinados (o dedal: 1 · 2,76 · 5,4). */
    sino(a, f, dur, pico = 1, parciais = [[1, 1, 1], [1.004, 0.35, 1], [2.76, 0.5, 0.62], [5.4, 0.25, 0.36]]) {
      for (const [m, amp, d] of parciais) if (f * m < sr * 0.45) K.tom({ a, dur: Math.max(0.02, dur * d), f: f * m, atk: 0.002, piso: 0.012, pico: pico * amp })
    },
    /** Tique fino de metal (a agulha). */
    tique({ a = 0, f = 5000, pico = 1, dur = 0.032 }) {
      K.tom({ a, dur, f, atk: 0.002, piso: 0.02, pico })
      K.tom({ a, dur: dur * 0.65, f: f * 1.47, atk: 0.002, piso: 0.02, pico: pico * 0.4 })
      K.chiado({ a, dur: 0.016, tipo: 'highpass', f: 6000, atk: 0.002, rel: 0.01, piso: 0.2, pico: pico * 0.45 })
    },
    /** Baque de enchimento: corpo senoidal que cai + oitava (aparece em alto-falante pequeno) + ruído grave + tapa de pano. */
    baque({ a = 0, corpo = 1, dur = 0.18, f = 110, f1 = 70, lp = 300, tapa = 0.3, enchimento = 0.8 }) {
      K.tom({ a, dur, f: f * v.tom, f1: f1 * v.tom, glide: dur * 0.66, atk: 0.004, piso: 0.03, pico: corpo })
      K.tom({ a, dur: dur * 0.6, f: 2 * f * v.tom, f1: 2 * f1 * v.tom, glide: dur * 0.4, atk: 0.004, piso: 0.03, pico: corpo * 0.3 })
      K.chiado({ a, dur: dur * 0.75, tipo: 'lowpass', f: lp, Q: 0.8, atk: 0.005, piso: 0.04, pico: enchimento })
      if (tapa > 0) K.chiado({ a, dur: 0.032, f: 900, Q: 0.9, atk: 0.003, rel: 0.012, piso: 0.06, pico: tapa })
    },
    /** A linha puxada pelo pano: faixa estreita que sobe, com o atrito picotado. */
    puxada({ a = 0, dur = 0.19, f = 600, f1 = 2400, pico = 1, Q = 5 }) {
      const pic = K.picote({ a, b: a + dur + 0.004, f: 70, f1: 150, prof: 0.45 })
      K.chiado({ a, dur, f, f1, glide: dur * 0.92, Q, ordem: 2, atk: 0.012, seg: dur * 0.45, rel: Math.min(0.03, dur * 0.3), piso: 0.3, pico, para: pic })
      K.chiado({ a, dur, f: f * 2, f1: f1 * 2, glide: dur * 0.92, Q: Q * 0.8, atk: 0.012, seg: dur * 0.45, rel: Math.min(0.03, dur * 0.3), piso: 0.3, pico: pico * 0.22, para: pic, desloc: 0.31 })
    },
    /** Batida de coração (um "tum"). */
    coracao(a, forca = 1) {
      K.tom({ a, dur: 0.13, f: 72, f1: 46, glide: 0.09, atk: 0.006, piso: 0.03, pico: 1.1 * forca })
      K.tom({ a, dur: 0.085, f: 144, f1: 92, glide: 0.06, atk: 0.006, piso: 0.03, pico: 0.42 * forca })
      K.chiado({ a, dur: 0.06, tipo: 'lowpass', f: 180, atk: 0.006, piso: 0.05, pico: 0.4 * forca })
    },
    /** Ponto arrebentando (o casulo abrindo), afinado no degrau da escala. */
    ponto(a = 0, dur = 0.2) {
      const f = hz('D5') * 2 ** ((grau(opc.degrau ?? 0) + (opc.afinacao ?? 0)) / 12 + v.cents / 1200)
      K.tom({ a, dur: dur * 0.96, tipo: 'triangle', f: f * 1.5, f1: f, glide: 0.016, atk: 0.002, piso: 0.02, pico: 1 })
      K.tom({ a, dur: dur * 0.5, f: f * 2, atk: 0.002, piso: 0.02, pico: 0.3 })
      K.chiado({ a, dur: 0.02, tipo: 'highpass', f: 2800, atk: 0.002, rel: 0.01, piso: 0.2, pico: 0.7 })
      K.chiado({ a: a + 0.008, dur: 0.07, f: 1300, f1: 700, Q: 2, atk: 0.004, piso: 0.05, pico: 0.3 })
    },
  }
  return K
}

// ------------------------------------------------------------------ as receitas (uma por acontecimento da tabela)
const R = {
  botao(K) { // clique de botão de madeira
    const { v } = K
    K.tom({ dur: 0.06, f: 800 * v.tom, f1: 690 * v.tom, glide: 0.03, atk: 0.002, piso: 0.035, pico: 1 })
    K.tom({ dur: 0.03, f: 1930 * v.tom, atk: 0.002, piso: 0.02, pico: 0.28 })
    K.chiado({ dur: 0.022, f: 2600, Q: 1.1, atk: 0.002, rel: 0.01, piso: 0.05, pico: 0.55 })
  },
  escolherCarta(K) { // papel de molde: ruído agudo com filtro subindo
    const gr = K.granulado({ b: 0.092, f: 140, prof: 0.55 })
    K.chiado({ dur: 0.09, f: 2200, f1: 7200, glide: 0.075, Q: 1.4, hp: 1400, atk: 0.006, seg: 0.022, piso: 0.06, pico: 1, para: gr })
  },
  semLinha(K) { // dois toques graves e surdos (o segundo mais baixo: "não")
    const { v } = K, l = K.filtro('lowpass', 720, 0.7); l.connect(K.saida)
    for (const [i, a] of [[0, 0], [1, 0.066]]) {
      const f = (i ? 136 : 165) * v.tom
      K.tom({ a, dur: 0.072, tipo: 'triangle', f, f1: f * 0.72, glide: 0.05, atk: 0.003, piso: 0.03, pico: i ? 0.85 : 1, para: l })
      K.chiado({ a, dur: 0.036, tipo: 'lowpass', f: 420, atk: 0.003, rel: 0.012, piso: 0.06, pico: 0.3 })
    }
  },
  cartaJogada(K) { // linha puxada 600 → 2.400 Hz + tique de agulha
    const { v } = K
    K.puxada({ dur: 0.192, f: 600, f1: 2400, pico: 1 })
    K.tique({ a: 0.18, f: 5200 * v.tom, pico: 0.85 })
  },
  golpe(K) { K.baque({ corpo: 1, dur: 0.18 }) },
  golpeForte(K) { // o mesmo com 30% mais corpo + estalo de costura (três pontos arrebentam)
    const { v } = K
    K.baque({ corpo: 1.3, dur: 0.255, f: 110, f1: 62 })
    ;[0.016, 0.031, 0.05].forEach((a, i) => K.chiado({ a, dur: 0.018, tipo: 'highpass', f: 3200, atk: 0.002, rel: 0.01, piso: 0.15, pico: 0.55 - i * 0.1, desloc: i * 0.21 }))
    K.tom({ a: 0.016, dur: 0.03, tipo: 'triangle', f: 1500 * v.tom, f1: 760 * v.tom, glide: 0.02, atk: 0.002, piso: 0.03, pico: 0.3 })
  },
  critico(K) { // pano rasgando (3.000 → 500 Hz, picotado a 40 por segundo) + estouro abafado + 3 notas agudas da caixinha
    const { v } = K
    K.baque({ corpo: 0.9, dur: 0.15, f: 150, f1: 60, lp: 480, tapa: 0.5 })
    const pic = K.picote({ a: 0.008, b: 0.375, f: 40 * (1 + (v.tom - 1) * 0.8), prof: 0.92 })
    K.chiado({ a: 0.01, dur: 0.355, f: 3000, f1: 500, glide: 0.33, Q: 2.4, ordem: 2, atk: 0.006, seg: 0.21, rel: 0.05, piso: 0.4, pico: 1, para: pic })
    K.chiado({ a: 0.01, dur: 0.3, f: 7500, f1: 2400, glide: 0.28, Q: 1.6, atk: 0.006, seg: 0.15, rel: 0.05, piso: 0.3, pico: 0.2, para: pic, desloc: 0.5 })
    K.nota('D7', 0.25, { vel: 0.5, queda: 0.3 }); K.nota('F7', 0.325, { vel: 0.5, queda: 0.24 }); K.nota('A7', 0.4, { vel: 0.55, queda: 0.16 })
  },
  vantagem(K) { // uma nota da caixinha, quinta acima (lá)
    const { v } = K
    if (v.i === 1) K.nota('D6', 0, { vel: 0.45, queda: 0.09 })
    K.nota('A6', v.i === 1 ? 0.032 : 0, { vel: 1, queda: 0.25 })
    if (v.i === 2) K.nota('A5', 0, { vel: 0.5, queda: 0.25 })
  },
  escudo(K) { // dedal: sino pequeno com parciais 1 · 2,76 · 5,4 a partir de 1.900 Hz
    const { v } = K
    K.sino(0, 1900 * v.tom, 0.295)
    K.chiado({ dur: 0.016, tipo: 'highpass', f: 5000, atk: 0.002, rel: 0.01, piso: 0.2, pico: 0.3 })
  },
  golpeNoEscudo(K) { // "tink" curto do dedal + baque menor
    const { v } = K
    K.sino(0, 2050 * v.tom, 0.115)
    K.baque({ a: 0.004, corpo: 0.62, dur: 0.152, f: 120, f1: 82, tapa: 0.2, enchimento: 0.5 })
  },
  erroDoVeu(K) { // sopro de tule: ruído agudo suave (a voz varre de um lado ao outro)
    K.chiado({ dur: 0.296, f: 5200, f1: 7600, glide: 0.2, Q: 0.8, hp: 3000, atk: 0.1, seg: 0.04, rel: 0.12, piso: 0.5, pico: 1 })
    K.chiado({ dur: 0.296, f: 9500, Q: 1.2, atk: 0.12, seg: 0.02, rel: 0.12, piso: 0.4, pico: 0.35, desloc: 0.4 })
  },
  cura(K) { // 3 notas da caixinha subindo (ré, fá, lá) + linha puxada baixinho
    const { v } = K
    if (v.i === 2) K.nota('D5', 0, { vel: 0.4, queda: 0.36 })
    K.nota('D6', 0, { vel: 0.8, queda: 0.36 }); K.nota('F6', 0.085, { vel: 0.9, queda: 0.34 }); K.nota('A6', 0.17, { vel: 1, queda: 0.31 })
    if (v.i === 1) K.nota('D7', 0.255, { vel: 0.45, queda: 0.2 })
    K.puxada({ a: 0.02, dur: 0.3, pico: 0.22 })
  },
  fioSolto(K) { // corda que afrouxa: nota que escorrega para baixo, cada vez mais bamba
    const { v } = K, f0 = 392 * v.tom, f1 = 150 * v.tom
    const l = K.filtro('lowpass', 2200 * v.fil, 2.5); K.desliza(l.frequency, 0, 2200 * v.fil, 520 * v.fil, 0.22); l.connect(K.saida)
    const o = { dur: 0.246, glide: 0.225, atk: 0.003, seg: 0.02, rel: 0.03, piso: 0.1, para: l }
    const a = K.tom({ ...o, tipo: 'sawtooth', f: f0, f1, pico: 0.8 }), b = K.tom({ ...o, tipo: 'triangle', f: f0 * 1.004, f1: f1 * 0.99, pico: 0.6 })
    K.tremor(a.os, { b: 0.25, f: 9, f1: 17, de: 8, ate: 70 }); K.tremor(b.os, { b: 0.25, f: 9, f1: 17, de: 8, ate: 70 })
    K.chiado({ dur: 0.016, f: 2500, Q: 1, atk: 0.002, rel: 0.01, piso: 0.2, pico: 0.4 })
  },
  trocarLugares(K) { // dois passinhos de pano + deslize
    const { v } = K
    for (const a of [0, 0.085]) {
      K.chiado({ a, dur: 0.052, tipo: 'lowpass', f: 750, atk: 0.004, piso: 0.05, pico: 0.9 })
      K.tom({ a, dur: 0.05, f: 175 * v.tom, f1: 120 * v.tom, glide: 0.035, atk: 0.004, piso: 0.04, pico: 0.5 })
    }
    K.chiado({ a: 0.03, dur: 0.208, f: 800, f1: 1700, glide: 0.19, Q: 0.9, atk: 0.045, seg: 0.06, rel: 0.06, piso: 0.4, pico: 0.55 })
  },
  comprarCarta(K) { // folha de papel virada (o filtro desce) e a folha assenta
    const gr = K.granulado({ b: 0.082, f: 170, prof: 0.5 })
    K.chiado({ dur: 0.072, f: 6400, f1: 2300, glide: 0.062, Q: 1.4, hp: 1200, atk: 0.004, seg: 0.012, piso: 0.1, pico: 1, para: gr })
    K.chiado({ a: 0.05, dur: 0.03, tipo: 'highpass', f: 2500, atk: 0.002, rel: 0.012, piso: 0.2, pico: 0.45 })
  },
  fiapo(K) { // tesourinha fina: as lâminas deslizam e se encontram
    const { v } = K, a = 0.04
    K.chiado({ dur: 0.046, f: 5200, f1: 9000, glide: 0.04, Q: 3, atk: 0.006, seg: 0.016, rel: 0.012, piso: 0.5, pico: 0.5 })
    K.tom({ a, dur: 0.068, f: 4300 * v.tom, atk: 0.002, piso: 0.012, pico: 1 })
    K.tom({ a, dur: 0.046, f: 6950 * v.tom, atk: 0.002, piso: 0.012, pico: 0.55 })
    K.tom({ a, dur: 0.03, f: 9800 * v.tom, atk: 0.002, piso: 0.02, pico: 0.3 })
    K.chiado({ a, dur: 0.016, tipo: 'highpass', f: 4000, atk: 0.002, rel: 0.01, piso: 0.2, pico: 0.6 })
  },
  linhaGanha(K) { // carretel girando: 3 tiques de madeira subindo, com a linha correndo por baixo
    const { v, opc } = K, base = 920 * v.tom * 2 ** (grau(opc.degrau ?? 0) / 12)
    ;[0, 0.052, 0.104].forEach((a, i) => {
      const f = base * [1, 1.26, 1.5][i]
      K.tom({ a, dur: 0.064, f, f1: f * 0.94, glide: 0.03, atk: 0.002, piso: 0.02, pico: 0.8 + i * 0.1 })
      K.tom({ a, dur: 0.03, f: f * 2.7, atk: 0.002, piso: 0.03, pico: 0.25 })
      K.chiado({ a, dur: 0.018, f: 3000, Q: 1, atk: 0.002, rel: 0.01, piso: 0.15, pico: 0.45 })
    })
    K.chiado({ dur: 0.176, f: 1200, f1: 2300, glide: 0.16, Q: 3, atk: 0.02, seg: 0.08, rel: 0.04, piso: 0.4, pico: 0.16 })
  },
  suaVez(K) { // duas notas da caixinha (lá, ré agudo)
    const { v } = K
    K.nota('A5', 0, { vel: 0.85, queda: 0.4 }); K.nota('D6', 0.115, { vel: 1, queda: 0.29 })
    if (v.i === 1) { K.nota('A6', 0, { vel: 0.3, queda: 0.22 }); K.nota('D7', 0.115, { vel: 0.3, queda: 0.25 }) }
    if (v.i === 2) K.nota('D5', 0.115, { vel: 0.38, queda: 0.29 })
  },
  tempoAcabando(K) { // tique-taque que aperta (5 s), com a mola da caixinha sendo apertada por baixo
    const { v } = K
    let a = 0, passo = 0.5, i = 0
    while (a < 4.86) {
      const alto = i % 2 === 0, f = (alto ? 2150 : 1620) * v.tom * (1 + a * 0.012), p = (alto ? 1 : 0.85) * (0.75 + 0.05 * a)
      K.tom({ a, dur: 0.075, f, f1: f * 0.97, atk: 0.002, piso: 0.01, pico: p })
      K.tom({ a, dur: 0.04, f: f * 2.42, atk: 0.002, piso: 0.02, pico: p * 0.3 })
      K.chiado({ a, dur: 0.018, f: 4200, Q: 1.2, atk: 0.002, rel: 0.01, piso: 0.15, pico: p * 0.4 })
      a += passo; passo *= 0.93; i++
    }
    const pic = K.picote({ a: 0, b: 5, f: 16, f1: 44, prof: 0.9 })
    K.chiado({ dur: 4.985, f: 1700, f1: 2600, glide: 4.9, Q: 4, atk: 0.25, seg: 4.4, rel: 0.2, piso: 0.9, pico: 0.09, para: pic })
  },
  ultimoFio(K) { // corda esticada que geme (serra com filtro e tremor) + um baque de coração
    const { v } = K, f0 = 98 * v.tom
    const bp = K.filtro('bandpass', 520 * v.fil, 5); K.desliza(bp.frequency, 0, 520 * v.fil, 1500 * v.fil, 0.5)
    const trem = K.picote({ a: 0, b: 0.64, tipo: 'sine', f: 8, f1: 13, prof: 0.4, inverte: false })
    const l = K.filtro('lowpass', 2800, 0.7); bp.connect(l); l.connect(trem)
    const o = { dur: 0.63, tipo: 'sawtooth', glide: 0.56, atk: 0.06, seg: 0.3, rel: 0.13, piso: 0.5, para: bp }
    const a = K.tom({ ...o, f: f0, f1: f0 * 1.26, pico: 2.6 }), b = K.tom({ ...o, f: f0 * 1.013, f1: f0 * 1.275, pico: 1.8 })
    K.tremor(a.os, { b: 0.64, f: 8, f1: 13, de: 12, ate: 45 }); K.tremor(b.os, { b: 0.64, f: 8, f1: 13, de: 12, ate: 45 })
    K.chiado({ dur: 0.6, f: 900, f1: 2200, glide: 0.5, Q: 6, atk: 0.08, seg: 0.25, rel: 0.13, piso: 0.5, pico: 0.2, para: trem })
    K.coracao(0.42, 1); K.coracao(0.555, 0.7)
  },
  queda(K) { // assobio curto descendo + baque mole + flocos
    const { v } = K, f0 = 1500 * v.tom
    const o = { dur: 0.245, glide: 0.225, atk: 0.012, seg: 0.05, rel: 0.05, piso: 0.35 }
    K.tom({ ...o, f: f0, f1: f0 * 0.3, pico: 0.36 })
    K.chiado({ ...o, f: f0 / v.fil, f1: f0 * 0.3 / v.fil, Q: 8, ordem: 2, pico: 0.4 })
    K.baque({ a: 0.225, corpo: 1.15, dur: 0.175, f: 96, f1: 52, lp: 260, tapa: 0.25 })
    for (const [a, f, p] of [[0.3, 2100, 0.3], [0.335, 2900, 0.22], [0.37, 1700, 0.24], [0.405, 2500, 0.17], [0.438, 3300, 0.13], [0.466, 2000, 0.1]]) {
      K.chiado({ a, dur: 0.032, f, Q: 1.6, atk: 0.006, rel: 0.014, piso: 0.3, pico: p })
    }
  },
  tesouraDesce(K) { // rangido metálico curto (o atrito canta nas ressonâncias do metal, subindo e tremendo) e o "clac" do degrau
    const { v } = K, f0 = 410 * v.tom, t = K.t0
    const serra = K.osc('sawtooth', f0, 0, 0.252)
    serra.frequency.setValueAtTime(f0, t); serra.frequency.exponentialRampToValueAtTime(f0 * 1.32, t + 0.17); serra.frequency.exponentialRampToValueAtTime(f0 * 1.2, t + 0.245)
    const j = K.ruido(0, 0.252, 0.9), jl = K.filtro('lowpass', 45, 0.7), jg = K.g(700) // tremor irregular de altura (± meio tom): é rangido, não apito
    j.connect(jl); jl.connect(jg); jg.connect(serra.detune)
    const aspero = K.granulado({ b: 0.252, f: 70, prof: 0.55 }), g = K.g(0)
    K.adsr(g.gain, 0, 0.246, { atk: 0.025, seg: 0.12, rel: 0.05, piso: 0.45, pico: 1 }); g.connect(aspero)
    for (const [f, Q, amp] of [[1180, 14, 1], [2630, 18, 0.9], [4350, 20, 0.6], [6900, 16, 0.3]]) {
      const bp = K.filtro('bandpass', f * v.tom * v.fil, Q), ga = K.g(amp * 3)
      K.desliza(bp.frequency, 0, f * v.tom * v.fil, f * v.tom * v.fil * 1.07, 0.24)
      serra.connect(bp); bp.connect(ga); ga.connect(g)
    }
    const a = 0.243, fc = 1900 * v.tom // a tesoura assenta no degrau de baixo
    K.chiado({ a, dur: 0.022, tipo: 'highpass', f: 2200, atk: 0.002, rel: 0.012, piso: 0.15, pico: 0.9 })
    for (const [m, amp, d] of [[1, 0.7, 0.052], [1.63, 0.5, 0.042], [2.74, 0.3, 0.03]]) K.tom({ a, dur: d, f: fc * m, atk: 0.002, piso: 0.02, pico: amp })
    K.tom({ a, dur: 0.052, f: 150 * v.tom, f1: 95 * v.tom, glide: 0.035, atk: 0.003, piso: 0.03, pico: 0.6 })
  },
  tesoura(K) { // "snip" grande: dois estalos metálicos + anel de metal + baque grave
    const { v } = K
    const estalo = (a, forca, f) => {
      K.chiado({ a, dur: 0.024, tipo: 'highpass', f: 2400, atk: 0.002, rel: 0.012, piso: 0.15, pico: forca })
      for (const [m, amp, d] of [[1, 0.6, 0.05], [1.59, 0.45, 0.04], [2.71, 0.3, 0.03]]) K.tom({ a, dur: d, f: f * m, atk: 0.002, piso: 0.02, pico: amp * forca })
    }
    estalo(0, 1, 2900 * v.tom)
    K.chiado({ a: 0.01, dur: 0.076, f: 2600, f1: 7200, glide: 0.07, Q: 2.2, atk: 0.008, seg: 0.03, rel: 0.02, piso: 0.6, pico: 0.5 })
    estalo(0.078, 1.25, 3300 * v.tom)
    const fa = 2210 * v.tom
    for (const [m, amp, d] of [[1, 0.8, 0.515], [1.0022, 0.45, 0.515], [2.32, 0.55, 0.42], [3.86, 0.35, 0.3], [5.3, 0.2, 0.2]]) K.tom({ a: 0.08, dur: d, f: fa * m, atk: 0.003, piso: 0.02, pico: amp })
    K.baque({ a: 0.085, corpo: 1.05, dur: 0.25, f: 88, f1: 44, lp: 240, tapa: 0.2 })
  },
  casuloParte(K) { K.ponto(0, 0.2) },
  casuloRara(K) { // ponto arrebentando + brilho de 4 notas (o acorde do degrau, subindo)
    const { opc } = K, d = opc.degrau ?? 0
    K.ponto(0, 0.2)
    ;[0, 2, 4, 7].forEach((s, i) => K.nota(hz('D6') * 2 ** (grau(d + s) / 12), 0.07 + i * 0.065, { vel: 0.7 + i * 0.1, queda: i === 3 ? 0.29 : 0.24 }))
  },
  casuloLendaria(K) { // ponto arrebentando + tema do Frayz em oitava alta, com eco
    K.ponto(0, 0.2)
    const eco = K.eco(0.16, 0.36, 0.5), c = 0.06
    TEMA.forEach(([n, col], i) => {
      const o = { vel: i === 8 ? 1 : 0.8, queda: i === 8 ? 0.47 : 0.3 }
      K.nota(n + '6', 0.06 + col * c, o); K.nota(n + '6', 0.06 + col * c, { ...o, para: eco, simples: true })
    })
  },
  remendo(K) { // agulha passando 3 vezes: fura (tique) e puxa a linha, cada vez um pouco mais alto
    const { v } = K
    ;[0, 0.098, 0.196].forEach((a, i) => {
      K.tique({ a, f: (4700 + i * 500) * v.tom, pico: 0.8 })
      K.puxada({ a: a + 0.012, dur: 0.084, f: 1100 * (1 + i * 0.12), f1: 2600 * (1 + i * 0.12), pico: 0.75, Q: 4.5 })
    })
  },
  aposentadoria(K) { // tema lento, só a caixinha, terminando na nota longa
    const { v } = K, t = [0, 0.19, 0.38, 0.57, 0.76, 0.97, 1.19, 1.43, 1.7]
    TEMA.forEach(([n], i) => K.nota(n + '5', t[i], { vel: i === 8 ? 1 : 0.82 - i * 0.02, queda: i === 8 ? 0.98 : 0.7 }))
    K.nota('D4', 1.7, { vel: 0.6, queda: 0.98 }); K.nota(v.i === 2 ? 'F4' : 'A4', 1.73, { vel: 0.4, queda: 0.94 })
    if (v.i === 1) K.nota('D4', 0, { vel: 0.4, queda: 0.7 })
  },
  vitoria(K) { // tema em ré maior, 2 compassos, com arpejo final
    const { v } = K, c = 0.15, M = { F: 'F#' }
    TEMA.forEach(([n, col], i) => K.nota((M[n] ?? n) + '6', col * c, { vel: i === 8 ? 1 : 0.85, queda: i === 8 ? 1.2 : 0.5 }))
    for (const [n, col] of [['F#5', 0], ['A5', 2], ['B5', 4], ['A5', 6], ['A5', 9]]) K.nota(n, col * c, { vel: 0.45, queda: 0.45, simples: true })
    for (const [n, col] of [['D4', 0], ['A4', 3], ['D4', 6], ['A3', 9]]) K.nota(n, col * c, { vel: 0.5, queda: 0.6, simples: true })
    const arp = v.i === 1 ? ['D5', 'A5', 'D6', 'F#6', 'A6', 'D7', 'F#7'] : ['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6', 'D7']
    arp.forEach((n, i) => K.nota(n, 10 * c + 0.045 * i * (v.i === 2 ? 1.15 : 1), { vel: 0.5 + i * 0.07, queda: 0.95 }))
  },
  derrota(K) { // tema descendo e desacelerando, como caixinha perdendo a corda
    const { v } = K
    const t = [0, 0.12, 0.255, 0.41, 0.59, 0.8, 1.05, 1.35, 1.72], oit = [6, 6, 6, 6, 6, 5, 5, 5, 4], bemol = [0, -3, -6, -10, -15, -21, -28, -36, -45]
    TEMA.forEach(([n], i) => K.nota(n + oit[i], t[i], { vel: 1 - i * 0.055, queda: i === 8 ? 0.96 : 0.55 + i * 0.03, cents: v.cents + bemol[i] }))
    const pic = K.picote({ a: 0, b: 1.95, f: 30 * v.tom, f1: 3.5, prof: 0.96 })
    K.chiado({ dur: 1.9, f: 2100, f1: 1300, glide: 1.8, Q: 3.5, atk: 0.02, seg: 1.2, rel: 0.3, piso: 0.5, pico: 0.1, para: pic })
    K.tom({ a: 1.72, dur: 0.09, tipo: 'triangle', f: 150, f1: 95, glide: 0.06, atk: 0.004, piso: 0.03, pico: 0.3 })
  },
}

// ------------------------------------------------------------------ a tabela (acontecimento, receita, duração e pico-alvo)
const T = {}
function linha(nome, rotulo, receita, ms, pico, extra = {}) { T[nome] = { nome, rotulo, receita, ms, pico, f: R[nome], ...extra } }
linha('botao', 'Tocar em botão', 'clique de botão de madeira: senoide 800 Hz curtíssima + estalo de ruído', 60, -11.5)
linha('escolherCarta', 'Escolher carta', 'papel de molde: ruído agudo curto com filtro subindo', 90, -11)
linha('semLinha', 'Carta sem Linha', 'dois toques graves e surdos', 140, -10.5)
linha('cartaJogada', 'Jogar carta', 'linha puxada: ruído em faixa subindo de 600 a 2.400 Hz + tique de agulha', 220, -9)
linha('golpe', 'Golpe', 'baque de enchimento: ruído grave com filtro em 300 Hz + corpo senoidal 110 → 70 Hz', 180, -8)
linha('golpeForte', 'Golpe forte', 'o mesmo, com 30% mais corpo, + estalo de costura', 260, -7)
linha('critico', 'Crítico', 'pano rasgando (faixa descendo de 3.000 a 500 Hz, picotada a 40 por segundo) + estouro abafado + 3 notas agudas da caixinha', 520, -6.5, { grande: true })
linha('vantagem', 'Vantagem de tecido', 'uma nota da caixinha, quinta acima, junto do golpe', 200, -9.5)
linha('escudo', 'Escudo ganho', 'dedal: sino pequeno com parciais 1 · 2,76 · 5,4 a partir de 1.900 Hz', 300, -9)
linha('golpeNoEscudo', 'Golpe no escudo', '"tink" curto do dedal + baque menor', 160, -8.5)
linha('erroDoVeu', 'Véu fez errar', 'sopro de tule: ruído agudo suave que passa de um lado ao outro', 300, -10, { varre: true })
linha('cura', 'Cura', '3 notas da caixinha subindo (ré, fá, lá) + linha puxada baixinho', 420, -9.5)
linha('fioSolto', 'Fio Solto aplicado', 'corda que afrouxa: nota que escorrega para baixo', 250, -9.5)
linha('trocarLugares', 'Trocar lugares', 'dois passinhos de pano + deslize', 240, -10)
linha('comprarCarta', 'Comprar carta', 'folha de papel virada', 80, -11)
linha('fiapo', 'Fiapo descartado', 'fiapo cortado: tesourinha fina', 110, -10.5)
linha('linhaGanha', 'Linha ganha', 'carretel girando: 3 tiques subindo', 180, -10.5)
linha('suaVez', 'Sua vez', 'duas notas da caixinha (lá, ré agudo)', 350, -9)
linha('tempoAcabando', 'Tempo acabando (5 s)', 'tique-taque que aperta (laço de 5 s; para com parar("tempoAcabando"))', 5000, -10, { laco: true })
linha('ultimoFio', 'Último Fio', 'corda esticada que geme (serra com filtro e tremor) + um baque de coração', 700, -7)
linha('queda', 'Queda', 'assobio curto descendo + baque mole + flocos', 500, -7, { grande: true })
linha('tesouraDesce', 'Tesoura desce um degrau', 'rangido metálico curto (e o clac do degrau)', 300, -8)
linha('tesoura', 'Tesoura corta', '"snip" grande: dois estalos metálicos + anel de metal + baque grave', 600, -6.5, { grande: true, calmo: true })
linha('casuloParte', 'Casulo: abrir parte', 'ponto arrebentando; cada parte um degrau acima da anterior', 200, -9)
linha('casuloRara', 'Casulo: parte Rara', 'o mesmo + brilho de 4 notas', 500, -8)
linha('casuloLendaria', 'Casulo: parte Lendária', 'o mesmo + tema do Frayz em oitava alta com eco', 1200, -7)
linha('remendo', 'Remendo novo', 'agulha passando 3 vezes', 300, -10)
linha('aposentadoria', 'Aposentadoria', 'tema lento, só a caixinha, terminando na nota longa', 2500, -9, { musical: true })
linha('vitoria', 'Vitória', 'tema em ré maior, 2 compassos, com arpejo final', 2500, -7.5, { musical: true, unico: 4000 })
linha('derrota', 'Derrota', 'tema descendo e desacelerando, como caixinha perdendo a corda', 2500, -8.5, { musical: true, unico: 4000 })
T.critico.calmo = true // "Menos animação": crítico e Tesoura 6 dB mais baixos

// Pico de cada variação com ganho 1 (medido fora do tempo real a 48 kHz, no centro). É daqui que sai o ganho que põe cada
// efeito no seu pico-alvo. Refazer quando uma receita mudar: `node tests/tela/som.e2e.mjs --calibrar`.
/* PICO_BRUTO:INICIO */
const PICO_BRUTO = {
  botao: [0.882, 0.8631, 0.8433],
  escolherCarta: [0.6691, 1.002, 0.7294],
  semLinha: [0.6511, 0.7517, 0.6902],
  cartaJogada: [0.9598, 0.8067, 0.9129],
  golpe: [0.9944, 0.8324, 0.9661],
  golpeForte: [1.238, 1.21, 1.199],
  critico: [1.026, 1.043, 0.9808],
  vantagem: [0.8326, 0.8566, 1.114],
  escudo: [1.467, 1.474, 1.369],
  golpeNoEscudo: [1.33, 1.355, 1.372],
  erroDoVeu: [0.7901, 0.7921, 0.715],
  cura: [0.9679, 0.9558, 0.9901],
  fioSolto: [0.8584, 0.8587, 0.8539],
  trocarLugares: [0.8074, 0.9076, 0.7133],
  comprarCarta: [0.9454, 0.7986, 0.9567],
  fiapo: [1.145, 1.229, 1.123],
  linhaGanha: [0.9986, 0.8052, 0.8731],
  suaVez: [0.8758, 0.8562, 1.126],
  tempoAcabando: [0.9545, 0.8995, 0.9455],
  ultimoFio: [0.8182, 0.8516, 1.08],
  queda: [0.7982, 0.779, 1.08],
  tesouraDesce: [1.181, 1.111, 1.234],
  tesoura: [2.246, 2.532, 2.171],
  casuloParte: [1.029, 0.9076, 1.018],
  casuloRara: [1.029, 0.9076, 1.018],
  casuloLendaria: [1.029, 1.028, 1.018],
  remendo: [0.8507, 0.824, 0.878],
  aposentadoria: [1.153, 1.211, 1.181],
  vitoria: [1.783, 1.629, 1.463],
  derrota: [0.9552, 0.9291, 0.9684],
}
/* PICO_BRUTO:FIM */

// ------------------------------------------------------------------ estado
const vivo = { ctx: null, cad: null }
const vozes = new Set(), morrendo = new Set(), ouvintes = new Set()
const pedidos = {}, tocados = {}, ultimaVariacao = {}, ultimoToque = {}
/** Só para o teste de tela conferir o que foi pedido: [nome, ...argumentos] (os atalhos usam o nome do atalho). */
export const registro = []
const pref = { efeitos: PADRAO.efeitos, musica: PADRAO.musica, mudo: false }
let calmoLigado = false, houveToque = false, afinacao = 0
try {
  const p = JSON.parse(globalThis.localStorage?.getItem(CHAVE) || 'null')
  if (p && typeof p === 'object') {
    if (Number.isFinite(p.efeitos)) pref.efeitos = lim(p.efeitos, 0, 1)
    if (Number.isFinite(p.musica)) pref.musica = lim(p.musica, 0, 1)
    pref.mudo = !!p.mudo
  }
  const m = globalThis.localStorage?.getItem('menos_animacao')
  calmoLigado = m !== null && m !== undefined ? m === '1' : !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
} catch { /* sem armazenamento: vale o padrão */ }
function guardar() { try { globalThis.localStorage?.setItem(CHAVE, JSON.stringify(pref)) } catch { /* ok */ } }

function aplicarVolumes(rampa = 0.03) {
  const c = vivo.cad; if (!c) return
  const t = vivo.ctx.currentTime, ge = pref.efeitos / PADRAO.efeitos, gm = pref.musica / PADRAO.musica
  const poe = (p, v) => { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(v, t + rampa) }
  poe(c.efeitos.gain, ge); poe(c.volMusica.gain, gm); poe(c.jingle.gain, Math.max(ge, gm)); poe(c.mestre.gain, pref.mudo ? 0 : 1)
}

// ------------------------------------------------------------------ ligar o áudio (só depois do primeiro toque)
/** Cria ou retoma o áudio. Só funciona depois de um toque ou tecla do jogador; pode chamar quantas vezes quiser. */
export function iniciar() {
  if (!AC || !houveToque) return false
  if (!vivo.ctx) {
    try { vivo.ctx = new AC({ latencyHint: 'interactive' }) } catch { try { vivo.ctx = new AC() } catch { return false } }
    vivo.cad = cadeia(vivo.ctx, { aquecer: true })
    aplicarVolumes(0)
    carregarAmostras().catch(() => {})
  }
  if (vivo.ctx.state !== 'running' && !globalThis.document?.hidden) vivo.ctx.resume().catch(() => {})
  return true
}
if (typeof window !== 'undefined') {
  const toque = () => { houveToque = true; iniciar() }
  for (const ev of ['pointerdown', 'mousedown', 'touchend', 'click', 'keydown']) window.addEventListener(ev, toque, { capture: true, passive: true })
  document.addEventListener('visibilitychange', () => {
    if (!vivo.ctx) return
    if (document.hidden) vivo.ctx.suspend().catch(() => {})
    else if (houveToque) vivo.ctx.resume().catch(() => {})
  })
}
export const contexto = () => vivo.ctx

// ------------------------------------------------------------------ montar uma voz (igual ao vivo e fora do tempo real)
let curvaSumico = null
function sumico(g) {
  if (!curvaSumico) { curvaSumico = new Float32Array(33); for (let i = 0; i < 33; i++) curvaSumico[i] = Math.cos((i / 32) * Math.PI / 2) ** 2 }
  return curvaSumico.map((x) => x * g)
}
function panDe(opc) {
  if (Number.isFinite(opc.pan)) return lim(opc.pan, -1, 1)
  return opc.lado === 'A' ? -0.55 : opc.lado === 'B' ? 0.55 : 0
}
function montarVoz(ctx, destino, nome, vi, opc, quando) {
  const def = T[nome], am = opc.amostra ?? null
  const taxa = am ? 2 ** (grau(opc.degrau ?? 0) / 12) : 1
  const dur = am ? am.buffer.duration / taxa : def.ms / 1000
  const forca = lim(opc.forca ?? 1, 0, 1)
  const voz = { nome, vi, fonte: am ? 'amostra' : 'codigo', nos: [], fontes: [], t0: quando, fim: quando + dur, nivel: def.pico + 20 * Math.log10(0.35 + 0.65 * forca) }
  const entrada = ctx.createGain(), corte = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain() // navegador muito antigo: sem posição
  voz.nos.push(entrada, corte, pan); voz.entrada = entrada; voz.corte = corte
  const alvo = lim(def.pico + (am?.ganhoDb ?? 0), FAIXA_DE_PICO[0], FAIXA_DE_PICO[1]) + ((opc.calmo ?? calmoLigado) && def.calmo ? -6 : 0)
  const bruto = am ? am.pico * (def.varre ? 0.95 : Math.SQRT1_2) : (PICO_BRUTO[nome]?.[vi] ?? 1)
  const g = opc.ganhoBruto ?? (dbParaLin(alvo) * (0.35 + 0.65 * forca)) / bruto
  entrada.gain.value = g
  entrada.gain.setValueCurveAtTime(sumico(g), Math.max(0, voz.fim - SUMICO), SUMICO)
  if (!pan.pan) { /* sem posição estéreo */ } else if (def.varre) { // passa de um lado ao outro: começa do lado do boneco
    const d = opc.lado === 'B' ? -1 : opc.lado === 'A' ? 1 : vi === 1 ? -1 : 1
    pan.pan.setValueAtTime(-0.85 * d, quando); pan.pan.linearRampToValueAtTime(0.85 * d, quando + dur * 0.93)
  } else pan.pan.value = panDe(opc)
  entrada.connect(corte); corte.connect(pan); pan.connect(destino)
  if (am) {
    const s = ctx.createBufferSource(); s.buffer = am.buffer; s.playbackRate.value = taxa
    s.connect(entrada); s.start(quando); s.stop(voz.fim + 0.01)
    voz.nos.push(s); voz.fontes.push(s)
  } else {
    const base = VARIACOES[vi], h = opc.humano ? 1 + (Math.random() - 0.5) * 0.024 : 1
    def.f(kit(ctx, voz, quando, { ...base, tom: base.tom * h }, { ...opc, afinacao: opc.afinacao ?? afinacao }))
  }
  return voz
}
function encerrar(voz) {
  clearTimeout(voz.relogio)
  for (const f of voz.fontes) { try { f.stop() } catch { /* já parou */ } }
  for (const n of voz.nos) { try { n.disconnect() } catch { /* já saiu */ } }
  voz.nos = []; voz.fontes = []
  vozes.delete(voz); morrendo.delete(voz)
}
function cortar(voz, ms = 14) {
  if (!vozes.has(voz)) return
  vozes.delete(voz); morrendo.add(voz)
  const t = vivo.ctx.currentTime
  try { voz.corte.gain.setValueAtTime(1, t); voz.corte.gain.linearRampToValueAtTime(0, t + ms / 1000) } catch { /* contexto fechado */ }
  clearTimeout(voz.relogio); voz.relogio = setTimeout(() => encerrar(voz), ms + 30)
}
/** Passou do teto: sai a voz mais antiga e mais fraca. */
function roubar() {
  const t = vivo.ctx.currentTime
  let pior = null, nota = Infinity
  for (const v of vozes) {
    const n = v.nivel - 18 * lim((t - v.t0) / (v.fim - v.t0), 0, 1)
    if (n < nota) { nota = n; pior = v }
  }
  if (pior) cortar(pior)
}

// ------------------------------------------------------------------ tocar
function escolher(nome, n) {
  if (n <= 1) return 0
  let i = Math.floor(Math.random() * (n - 1))
  if (ultimaVariacao[nome] !== undefined && i >= ultimaVariacao[nome]) i++
  if (ultimaVariacao[nome] === undefined) i = Math.floor(Math.random() * n)
  return (ultimaVariacao[nome] = i)
}
function soar(nome, opc = {}) {
  const def = T[nome]
  if (!def) { console.warn(`som.js: efeito desconhecido "${nome}"`); return null }
  pedidos[nome] = (pedidos[nome] || 0) + 1
  const ctx = vivo.ctx
  // toca com o áudio rodando — ou ainda acordando logo depois do toque (o som sai assim que o relógio do áudio anda)
  const acordando = !!ctx && ctx.state === 'suspended' && houveToque && !globalThis.document?.hidden
  if (!ctx || (ctx.state !== 'running' && !acordando) || pref.mudo) return null
  const agora = globalThis.performance?.now() ?? Date.now()
  if (def.unico && ultimoToque[nome] && agora - ultimoToque[nome] < def.unico) return null
  if (def.laco) parar(nome)
  // a folha de sons pode pedir uma variação e uma fonte certas ({ variacao, fonte }); o jogo deixa o sorteio escolher
  const fixa = Number.isInteger(opc.variacao) ? opc.variacao : null
  const prontas = (opc.fonte ? opc.fonte === 'amostra' : AMOSTRAS.usar) ? (AMOSTRAS.efeitos[nome] || []).filter((a) => a.estado === 'ok') : []
  const am = prontas.length ? (fixa !== null && AMOSTRAS.efeitos[nome][fixa]?.estado === 'ok' ? AMOSTRAS.efeitos[nome][fixa] : prontas[escolher(nome + '#amostra', prontas.length)]) : null
  const vi = am ? AMOSTRAS.efeitos[nome].indexOf(am) : fixa !== null ? ((fixa % 3) + 3) % 3 : escolher(nome, VARIACOES.length)
  while (vozes.size >= TETO_DE_VOZES) roubar()
  const quando = Math.max(opc.quando ?? 0, ctx.currentTime + 0.004)
  let voz
  try { voz = montarVoz(ctx, def.musical ? vivo.cad.jingle : vivo.cad.efeitos, nome, vi, { ...opc, humano: true, amostra: am }, quando) } catch (e) { console.warn('som.js: falhou ao montar ' + nome, e); return null }
  vozes.add(voz)
  voz.relogio = setTimeout(() => encerrar(voz), (voz.fim - ctx.currentTime) * 1000 + (acordando ? 500 : 80))
  tocados[nome] = (tocados[nome] || 0) + 1; ultimoToque[nome] = agora
  const aviso = { nome, quando, variacao: vi, fonte: voz.fonte, grande: !!def.grande, musical: !!def.musical, duracao: voz.fim - voz.t0 }
  for (const f of ouvintes) { try { f(aviso) } catch (e) { console.warn(e) } }
  return { ...aviso, parar: () => cortar(voz, 20) }
}
function anotar(...a) { registro.push(a); if (registro.length > 400) registro.shift() }

/** Aconteceu `nome`: toca o efeito. opcoes: { lado: 'A'|'B'|null, forca: 0..1, degrau: n, pan: −1..1, quando: tempo do áudio }.
 *  Devolve { nome, variacao, fonte, quando, duracao, parar() } ou null (mudo, áudio ainda não ligado, aba escondida). */
export function tocar(nome, opcoes = {}) { anotar(nome, opcoes); return soar(nome, opcoes) }
/** Para um efeito que ainda está tocando (o laço do tempo acabando) ou todos, se não disser o nome. */
export function parar(nome) { for (const v of [...vozes]) if (!nome || v.nome === nome) cortar(v, 20) }

/** Volumes de 0 a 1 (padrão: efeitos 0,7 e música 0,45). Guarda no aparelho. Devolve os valores atuais. */
export function volumes(v = {}) {
  if (Number.isFinite(v.efeitos)) pref.efeitos = lim(v.efeitos, 0, 1)
  if (Number.isFinite(v.musica)) pref.musica = lim(v.musica, 0, 1)
  if (v.efeitos !== undefined || v.musica !== undefined) { guardar(); aplicarVolumes() }
  return { efeitos: pref.efeitos, musica: pref.musica }
}
/** Liga ou desliga o mudo (guarda no aparelho). Sem argumento, só responde. */
export function mudo(liga) {
  if (liga !== undefined) { pref.mudo = !!liga; guardar(); aplicarVolumes(0.04); if (pref.mudo) parar() }
  return pref.mudo
}
export const estaMudo = () => pref.mudo
/** "Menos animação": o som continua; só o crítico e a Tesoura ficam 6 dB mais baixos. */
export function calmo(liga) { if (liga !== undefined) calmoLigado = !!liga; return calmoLigado }
/** A música avisa em que tom está (meio tom acima quando a Tesoura corta): as notas de caixinha dos efeitos acompanham. */
export function afinar(semitons = 0) { afinacao = semitons; return afinacao }
/** Avisa a cada efeito que toca ({ nome, quando, grande, ... }). Devolve a função que desliga o aviso. */
export function aoTocar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn) }
export const nomes = () => Object.keys(T)
/** A tabela da direção de som: [{ nome, rotulo, receita, ms, pico, grande, laco, musical }]. */
export const tabela = () => Object.values(T).map(({ f, ...resto }) => ({ ...resto }))
/** Quantas vezes cada efeito foi PEDIDO (conta mesmo no mudo ou antes do primeiro toque); contagem('tocados') = os que soaram. */
export function contagem(qual) { return { ...(qual === 'tocados' ? tocados : pedidos) } }
export function zerarContagem() { for (const o of [pedidos, tocados]) for (const k of Object.keys(o)) delete o[k]; registro.length = 0 }
export function estado() {
  let nos = 0
  for (const v of vozes) nos += v.nos.length
  for (const v of morrendo) nos += v.nos.length
  const soma = (o) => Object.values(o).reduce((s, n) => s + n, 0)
  return {
    iniciado: !!vivo.ctx, rodando: vivo.ctx?.state === 'running', taxa: vivo.ctx?.sampleRate ?? null,
    mudo: pref.mudo, calmo: calmoLigado, volumes: { efeitos: pref.efeitos, musica: pref.musica }, afinacao,
    vozes: vozes.size, tocando: [...vozes].map((v) => v.nome), nosVivos: nos, pedidos: soma(pedidos), tocados: soma(tocados),
    amostras: { usar: AMOSTRAS.usar, estado: AMOSTRAS.estado, prontas: contarAmostras('ok'), falhas: contarAmostras('falhou') },
  }
}

// ------------------------------------------------------------------ fabricar fora do tempo real (medir e desenhar)
/**
 * Monta o efeito num contexto dado (um OfflineAudioContext), passando pela mesma cadeia final (limitador e teto).
 * opcoes: { quando (s; use ≥ 0,4 para o limitador já estar assentado), lado, forca, degrau, calmo, fonte: 'codigo'|'amostra' }.
 * Com fonte 'amostra', `variacao` é a posição do arquivo na lista do manifesto. Devolve { nome, variacao, fonte, inicio, duracao, fim }.
 */
export function fabricar(nome, variacao = 0, ctxOffline, opcoes = {}) {
  const def = T[nome]
  if (!def) throw new Error(`efeito desconhecido: ${nome}`)
  const cad = cadeia(ctxOffline), quando = opcoes.quando ?? 0
  let am = null
  if (opcoes.fonte === 'amostra') {
    am = (AMOSTRAS.efeitos[nome] || [])[variacao]
    if (!am || am.estado !== 'ok') throw new Error(`sem amostra pronta para ${nome} [${variacao}]`)
  }
  const voz = montarVoz(ctxOffline, def.musical ? cad.jingle : cad.efeitos, nome, am ? variacao : ((variacao % 3) + 3) % 3, { calmo: false, afinacao: 0, ...opcoes, amostra: am }, quando)
  return { nome, variacao, fonte: voz.fonte, inicio: quando, duracao: voz.fim - voz.t0, fim: voz.fim }
}

/** Mede o pico de cada variação com ganho conhecido (para a tabela PICO_BRUTO). Só para quem ajusta as receitas. */
export async function calibrar({ taxa = 48000 } = {}) {
  const OAC = globalThis.OfflineAudioContext, G0 = 0.02, saida = {}
  for (const nome of nomes()) {
    saida[nome] = []
    for (let vi = 0; vi < VARIACOES.length; vi++) {
      const ctx = new OAC(2, Math.ceil((0.5 + T[nome].ms / 1000 + 0.1) * taxa), taxa)
      fabricar(nome, vi, ctx, { quando: 0.5, ganhoBruto: G0 })
      const b = await ctx.startRendering()
      let p = 0
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > p) p = a } }
      saida[nome].push(Number((p / G0).toPrecision(4)))
    }
  }
  return saida
}

// ------------------------------------------------------------------ amostras gravadas (public/sons/manifesto.json)
const RAIZ = typeof import.meta.url === 'string' ? new URL('../', import.meta.url) : null
const AMOSTRAS = { usar: true, estado: 'nada', manifesto: null, efeitos: {}, musica: {}, espera: null }
const contarAmostras = (est) => Object.values(AMOSTRAS.efeitos).reduce((s, l) => s + l.filter((a) => a.estado === est).length, 0)
const itemDoManifesto = (x) => (typeof x === 'string' ? { arquivo: x } : x && typeof x.arquivo === 'string' ? x : null)

/** Lê o manifesto (do endereço padrão, de outro endereço ou de um objeto já pronto). Não baixa os arquivos de som. */
export async function carregarManifesto(origem) {
  let m = origem
  if (!m || typeof m === 'string') {
    try {
      const r = await fetch(m ? new URL(m, RAIZ) : new URL('sons/manifesto.json', RAIZ), { cache: 'no-cache' })
      m = r.ok ? await r.json() : null
    } catch { m = null }
  }
  AMOSTRAS.manifesto = m && typeof m === 'object' ? m : { versao: 1, efeitos: {} }
  AMOSTRAS.efeitos = {}; AMOSTRAS.musica = {}; AMOSTRAS.espera = null
  for (const [nome, lista] of Object.entries(AMOSTRAS.manifesto.efeitos || {})) {
    if (!T[nome] || !Array.isArray(lista)) continue
    const l = lista.map(itemDoManifesto).filter(Boolean).map((e) => ({ nome, arquivo: e.arquivo, ganhoDb: Number(e.ganhoDb) || 0, cortarMs: Number(e.cortarMs) || 0, estado: 'pendente', buffer: null, pico: 0 }))
    if (l.length) AMOSTRAS.efeitos[nome] = l
  }
  for (const [momento, x] of Object.entries(AMOSTRAS.manifesto.musica || {})) {
    const e = itemDoManifesto(x)
    if (e) AMOSTRAS.musica[momento] = { nome: momento, arquivo: e.arquivo, ganhoDb: Number(e.ganhoDb) || 0, cortarMs: 0, estado: 'pendente', buffer: null, pico: 0, rms: 0 }
  }
  AMOSTRAS.estado = 'manifesto'
  return AMOSTRAS.manifesto
}

let decodificador = null
async function baixar(a, { mono = true, aparar = true } = {}) {
  try {
    const r = await fetch(new URL(a.arquivo, RAIZ))
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const bytes = await r.arrayBuffer()
    const ctx = vivo.ctx || (decodificador ??= new globalThis.OfflineAudioContext(1, 1, 48000))
    const bruto = await ctx.decodeAudioData(bytes)
    const sr = bruto.sampleRate, n = bruto.length, canais = mono ? 1 : Math.min(2, bruto.numberOfChannels)
    const dados = []
    for (let c = 0; c < canais; c++) {
      const d = new Float32Array(n)
      if (mono) { for (let k = 0; k < bruto.numberOfChannels; k++) { const x = bruto.getChannelData(k); for (let i = 0; i < n; i++) d[i] += x[i] / bruto.numberOfChannels } } else d.set(bruto.getChannelData(c))
      dados.push(d)
    }
    let pico = 0
    for (const d of dados) for (let i = 0; i < n; i++) { const v = Math.abs(d[i]); if (v > pico) pico = v }
    if (!(pico > 1e-4)) throw new Error('arquivo mudo')
    let ini = 0, fim = n
    if (aparar) { // tira o silêncio do começo (o som tem de sair na hora) e do fim
      const d = dados[0]
      while (ini < n && Math.abs(d[ini]) < pico * 0.01) ini++
      ini = Math.max(0, ini - Math.floor(sr * 0.001))
      while (fim > ini + 1 && Math.abs(d[fim - 1]) < pico * 0.002) fim--
      if (a.cortarMs > 0) fim = Math.min(fim, ini + Math.floor(sr * a.cortarMs / 1000))
    }
    const len = Math.max(8, fim - ini), buf = ctx.createBuffer(canais, len, sr), nf = Math.min(len >> 1, Math.floor(sr * SUMICO)), ni = Math.min(len >> 1, Math.floor(sr * 0.002))
    let p2 = 0, soma = 0
    for (let c = 0; c < canais; c++) {
      const o = buf.getChannelData(c), d = dados[c]
      for (let i = 0; i < len; i++) {
        let x = d[ini + i]
        if (aparar && i < ni) x *= i / ni
        if (aparar && i >= len - nf) x *= Math.cos(((i - (len - nf)) / nf) * Math.PI / 2) ** 2
        o[i] = x; soma += x * x; if (Math.abs(x) > p2) p2 = Math.abs(x)
      }
    }
    a.buffer = buf; a.pico = p2; a.rms = Math.sqrt(soma / (len * canais)); a.estado = 'ok'
  } catch (e) { a.estado = 'falhou'; a.erro = String(e?.message || e); a.buffer = null }
  return a
}
/** Baixa e prepara as amostras do manifesto, duas por vez, sem travar a tela. Chamada sozinha depois do primeiro toque. */
export function carregarAmostras() {
  if (AMOSTRAS.espera) return AMOSTRAS.espera
  return (AMOSTRAS.espera = (async () => {
    if (!AMOSTRAS.manifesto) await carregarManifesto()
    AMOSTRAS.estado = 'carregando'
    const fila = [...Object.values(AMOSTRAS.efeitos).flat().map((a) => [a, {}]), ...Object.values(AMOSTRAS.musica).map((a) => [a, { mono: false, aparar: false }])].filter(([a]) => a.estado === 'pendente')
    const operario = async () => { for (let x; (x = fila.shift()); ) { await baixar(x[0], x[1]); await new Promise((ok) => setTimeout(ok, 0)) } }
    await Promise.all([operario(), operario()])
    AMOSTRAS.estado = 'pronto'
    return estado().amostras
  })())
}
/** Chave geral: usar as amostras gravadas (quando houver) ou sempre o som fabricado por código. */
export function usarAmostras(liga) { if (liga !== undefined) AMOSTRAS.usar = !!liga; return AMOSTRAS.usar }
/** De onde sai o efeito agora: 'amostra' (há arquivo pronto e a chave está ligada) ou 'codigo'. */
export function fonteDoEfeito(nome) { return AMOSTRAS.usar && (AMOSTRAS.efeitos[nome] || []).some((a) => a.estado === 'ok') ? 'amostra' : 'codigo' }
/** Os arquivos do manifesto para um efeito: [{ arquivo, estado: 'pendente'|'ok'|'falhou', duracao, pico, ganhoDb, erro }]. */
export function amostrasDe(nome) { return (AMOSTRAS.efeitos[nome] || []).map((a) => ({ arquivo: a.arquivo, estado: a.estado, duracao: a.buffer?.duration ?? 0, pico: a.pico, ganhoDb: a.ganhoDb, erro: a.erro })) }
/** Para a música: o arquivo gravado de um momento, se o manifesto trouxer e já estiver pronto ({ buffer, pico, rms, ganhoDb }). */
export function musicaGravada(momento) { const a = AMOSTRAS.musica[momento]; return AMOSTRAS.usar && a?.estado === 'ok' ? a : null }

// ------------------------------------------------------------------ atalhos (os nomes que a tela já usa)
// Cada atalho aceita: nada · um número (força 0..1) · 'A' ou 'B' (lado do boneco) · { lado, forca, degrau }.
const arg = (x) => (typeof x === 'number' ? { forca: x } : typeof x === 'string' ? { lado: x } : x && typeof x === 'object' ? x : {})
const atalho = (nomeDoAtalho, nome = nomeDoAtalho) => (x, y) => { const o = { ...arg(x), ...arg(y) }; anotar(nomeDoAtalho, ...(x === undefined ? [] : [x])); return soar(nome, o) }
export const cartaJogada = atalho('cartaJogada')
export const golpe = atalho('golpe')
export const golpeForte = atalho('golpeForte')
export const critico = atalho('critico')
export const escudo = atalho('escudo')
export const golpeNoEscudo = atalho('golpeNoEscudo')
export const erroDoVeu = atalho('erroDoVeu')
export const ultimoFio = atalho('ultimoFio')
export const queda = atalho('queda')
export const tesoura = atalho('tesoura')
export const vitoria = atalho('vitoria')
export const derrota = atalho('derrota')
export const aposentadoria = atalho('aposentadoria')
/** Abrir a parte `i` do casulo (cada parte um degrau acima); raridade 'rara' ganha brilho e 'lendaria' ganha o tema. */
export function casuloParte(i = 0, raridade = 'comum', opcoes = {}) {
  anotar('casuloParte', i, raridade)
  const r = String(raridade).toLowerCase()
  return soar(r.startsWith('lend') ? 'casuloLendaria' : r === 'rara' ? 'casuloRara' : 'casuloParte', { ...opcoes, degrau: i })
}
