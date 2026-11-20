// Reino — MOTOR DE SOM do jogo novo (efeitos + música em camadas), fabricado por código (WebAudio). Régua: docs/reino/som.md.
// Não conhece regra do jogo: só recebe "aconteceu isto". Não usa nada de public/js (os motores antigos ficam como estão).
//   Som.tocar(evento, { pan, tom, forca })  ·  Som.destravar()  ·  Som.mudo(v)  ·  Som.volume('efeitos'|'musica', v)
//   Som.fundoBatalha(0..1)  ·  Som.menosAnimacao(v)  ·  Musica.momento(nome)  ·  Musica.rodada(n)  ·  Musica.parar()
// Regras: nada toca antes do primeiro toque do jogador · teto de 12 vozes de efeito (6 de tropa) · limitador + teto de −3 dBFS
//   · a música troca de momento só na virada do compasso · mudo e volumes ficam guardados no aparelho.
// Amostras gravadas (opcional): public/reino/sons/manifesto.json; se existir arquivo para o evento, ele toca no lugar do código
//   — menos nos eventos marcados `somar` (choque, recorde): aí tocam os DOIS, amostra + receita por código.

const N = (m) => 440 * 2 ** ((m - 69) / 12) // nota MIDI → Hz (67 = sol)
const db2 = (d) => 10 ** (d / 20)
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0 }
function sorteio(semente) { let s = (semente >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 } }

// ------------------------------------------------------------------ matéria-prima (guardada por taxa de amostragem)
const GUARDA = new Map()
function guardado(chave, fazer) { if (!GUARDA.has(chave)) GUARDA.set(chave, fazer()); return GUARDA.get(chave) }
function novoBuffer(canais, n, sr) { return new AudioBuffer({ numberOfChannels: canais, length: n, sampleRate: sr }) }
function bufRuido(sr) {
  return guardado('ruido' + sr, () => { const b = novoBuffer(1, sr * 2, sr), d = b.getChannelData(0), r = sorteio(77); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; return b })
}
/** Corda dedilhada (alaúde): linha de atraso com média — soa como corda de verdade e custa 1 nó para tocar. */
function bufCorda(sr, m) {
  return guardado('corda' + sr + '_' + m, () => {
    const f = N(m), mistura = m > 76 ? 0.3 : 0.5, n = Math.max(2, Math.floor(sr / f - mistura)), len = Math.floor(sr * 1.4)
    const linha = new Float32Array(n), r = sorteio(1000 + m), b = novoBuffer(1, len, sr), o = b.getChannelData(0)
    let ant = 0; for (let i = 0; i < n; i++) { const x = r() * 2 - 1; linha[i] = (x + ant) / 2; ant = x }
    let i = 0, pico = 0
    for (let k = 0; k < len; k++) { o[k] = linha[i]; const j = (i + 1) % n; linha[i] = 0.9965 * ((1 - mistura) * linha[i] + mistura * linha[j]); i = j; if (Math.abs(o[k]) > pico) pico = Math.abs(o[k]) }
    for (let k = 0; k < len; k++) o[k] /= pico
    return { b, afina: f / (sr / (n + mistura)) }
  })
}
/** Sala de pedra pequena: eco curto, igual nos dois lados o bastante para não embolar. */
function bufSala(sr) {
  return guardado('sala' + sr, () => {
    const n = Math.floor(sr * 0.75), b = novoBuffer(2, n, sr)
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch), r = sorteio(31 + ch * 7); let e = 0, ant = 0
      for (let i = 0; i < n; i++) { const x = (r() * 2 - 1) * Math.exp(-i / sr / 0.16) * (i < sr * 0.004 ? i / (sr * 0.004) : 1); ant = ant * 0.55 + x * 0.45; d[i] = ant; e += ant * ant }
      const k = 1 / Math.sqrt(e); for (let i = 0; i < n; i++) d[i] *= k
    }
    return b
  })
}
/** Teto de segurança: reto até 0,5 e dobra suave até 0,7 (−3,1 dBFS). Nada passa disso, toque o que tocar. */
function curvaTeto() {
  const n = 4097, c = new Float32Array(n)
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1, a = Math.abs(x); c[i] = Math.sign(x) * (a <= 0.5 ? a : 0.5 + 0.2 * Math.tanh((a - 0.5) / 0.2)) }
  return c
}

// ------------------------------------------------------------------ instrumentos (K.c contexto · K.d destino · K.t hora de início · K.r sorteio)
const KIT = {
  /** Uma nota de oscilador. `sus`: sustentada (ataque, corpo, soltura); sem `sus`: percussiva (ataque e queda). */
  tom({ f, f2 = 0, dur = 0.1, tipo = 'sine', vol = 0.5, em = 0, ataque = 0.004, sus = false, solta = 0.04, lp = 0, vib = 0, des = 0 }) {
    const c = this.c, t = this.t + em, o = c.createOscillator(), g = c.createGain()
    o.type = tipo; o.frequency.value = f; o.frequency.setValueAtTime(f, t); if (des) o.detune.value = des
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur)
    ataque = Math.min(ataque, dur * 0.4)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + ataque)
    if (sus) { const s = Math.min(solta, dur * 0.4); g.gain.setValueAtTime(vol, t + dur - s); g.gain.linearRampToValueAtTime(0, t + dur) } else g.gain.exponentialRampToValueAtTime(vol * 0.001, t + dur)
    if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.3; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(vib, t + Math.min(0.25, dur)); l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + dur + 0.02) }
    let n = o
    if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl }
    n.connect(g); g.connect(this.d); o.start(t); o.stop(t + dur + 0.02)
  },
  /** Sopro de ruído filtrado (papel, pano, pedra, vento, estalo). */
  ruido({ dur = 0.1, f = 1200, f2 = 0, q = 1, vol = 0.4, em = 0, tipo = 'bandpass', ataque = 0.003 }) {
    const c = this.c, t = this.t + em, n = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain()
    n.buffer = bufRuido(c.sampleRate)
    fl.type = tipo; fl.frequency.value = f; fl.frequency.setValueAtTime(f, t); fl.Q.value = q // .value primeiro: o filtro já nasce na frequência certa, caia o som onde cair no bloco de áudio
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur)
    ataque = Math.min(ataque, dur * 0.5)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(vol * 0.001, t + dur)
    n.connect(fl); fl.connect(g); g.connect(this.d); n.start(t, this.r() * 1.2, dur + 0.03)
  },
  /** Metal: parciais desafinadas (moeda, espada, sino, gongo). */
  sino({ f, dur = 0.3, vol = 0.4, em = 0, parciais = [1, 2.76, 5.4] }) {
    parciais.forEach((p, i) => this.tom({ f: f * p, dur: dur * (1 - i * 0.16), vol: vol / (1 + i * 0.9), em }))
  },
  /** Alaúde: uma corda dedilhada. */
  corda({ m, dur = 0.5, vol = 0.5, em = 0 }) {
    const c = this.c, t = this.t + em, { b, afina } = bufCorda(c.sampleRate, m), n = c.createBufferSource(), g = c.createGain()
    n.buffer = b; n.playbackRate.value = afina
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.002); g.gain.setValueAtTime(vol, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(vol * 0.001, t + dur)
    n.connect(g); g.connect(this.d); n.start(t); n.stop(t + dur + 0.02)
  },
  /** Flauta doce: senoide com dois harmônicos, sopro e um tremor que chega depois. */
  flauta({ m, dur = 0.3, vol = 0.4, em = 0 }) {
    const f = N(m), o = { dur, em, sus: true, ataque: 0.03, solta: 0.05, vib: dur > 0.25 ? 7 : 0 }
    this.tom({ ...o, f, vol }); this.tom({ ...o, f: f * 2, vol: vol * 0.2 }); this.tom({ ...o, f: f * 3, vol: vol * 0.06 })
    this.ruido({ dur, em, f: Math.min(9000, f * 2.2), q: 2.5, vol: vol * 0.12, ataque: 0.02 })
  },
  /** Charamela (palheta): anasalada, com um escorregão no ataque. */
  palheta({ m, dur = 0.3, vol = 0.4, em = 0 }) {
    const c = this.c, t = this.t + em, f = N(m), fl = c.createBiquadFilter(), g = c.createGain(), s = Math.min(0.04, dur * 0.3)
    fl.type = 'bandpass'; fl.frequency.value = Math.min(2600, f * 3.2); fl.Q.value = 0.8
    for (const [tipo, k] of [['sawtooth', 1], ['square', 0.45]]) {
      const o = c.createOscillator(), og = c.createGain(); o.type = tipo; og.gain.value = k
      o.frequency.value = f * 0.965; o.frequency.setValueAtTime(f * 0.965, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.035)
      o.connect(og); og.connect(fl); o.start(t); o.stop(t + dur + 0.02)
    }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.setValueAtTime(vol, t + dur - s); g.gain.linearRampToValueAtTime(0, t + dur)
    fl.connect(g); g.connect(this.d)
  },
  /** Trompa de aviso: duas serras com o filtro abrindo no ataque. */
  trompa({ m, dur = 0.4, vol = 0.4, em = 0 }) {
    const c = this.c, t = this.t + em, f = N(m), fl = c.createBiquadFilter(), g = c.createGain(), s = Math.min(0.08, dur * 0.3)
    fl.type = 'lowpass'; fl.Q.value = 1.2; fl.frequency.value = f * 1.5; fl.frequency.setValueAtTime(f * 1.5, t); fl.frequency.exponentialRampToValueAtTime(f * 6, t + 0.07); fl.frequency.exponentialRampToValueAtTime(f * 3.6, t + dur)
    for (const des of [-6, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = des; o.connect(fl); o.start(t); o.stop(t + dur + 0.02) }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 0.5, t + Math.min(0.025, dur * 0.3)); g.gain.setValueAtTime(vol * 0.5, t + dur - s); g.gain.linearRampToValueAtTime(0, t + dur)
    fl.connect(g); g.connect(this.d)
  },
  /** Cordas (rabeca em grupo): notas longas; `trem` = tremor de arco para tensão. */
  cordas({ ms, dur = 1, vol = 0.2, em = 0, trem = false }) {
    const c = this.c, t = this.t + em, fl = c.createBiquadFilter(), g = c.createGain(), a = Math.min(0.12, dur * 0.3), s = Math.min(0.2, dur * 0.3)
    fl.type = 'lowpass'; fl.frequency.value = 1700
    for (const m of ms) for (const des of [-7, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(m); o.detune.value = des; o.connect(fl); o.start(t); o.stop(t + dur + 0.02) }
    const v = vol / Math.sqrt(ms.length * 2)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + dur - s); g.gain.linearRampToValueAtTime(0, t + dur)
    let fim = g
    if (trem) { const tg = c.createGain(), l = c.createOscillator(), lg = c.createGain(); tg.gain.value = 0.62; l.frequency.value = 10.5; lg.gain.value = 0.38; l.connect(lg); lg.connect(tg.gain); l.start(t); l.stop(t + dur + 0.02); g.connect(tg); fim = tg }
    fl.connect(g); fim.connect(this.d)
  },
  /** Tambor de pele: corpo que desce + pele + estalo (o estalo é o que se ouve no alto-falante pequeno). */
  tambor({ f = 115, dur = 0.16, vol = 0.5, em = 0 }) {
    this.tom({ f: f * 1.7, f2: f * 0.62, dur, vol, em, ataque: 0.002 })
    this.tom({ f: f * 3.4, f2: f * 1.9, dur: dur * 0.5, vol: vol * 0.22, em, tipo: 'triangle', ataque: 0.002 })
    this.ruido({ dur: dur * 0.45, f: 900, tipo: 'lowpass', vol: vol * 0.5, em, ataque: 0.002 })
    this.ruido({ dur: 0.014, f: 2600, q: 0.8, vol: vol * 0.4, em, ataque: 0.001 })
  },
  pandeiro({ vol = 0.2, em = 0, dur = 0.05 }) {
    this.ruido({ dur, f: 6500, tipo: 'highpass', vol, em, ataque: 0.002 }); this.ruido({ dur: dur * 1.6, f: 9500, q: 4, vol: vol * 0.6, em, ataque: 0.002 })
  },
}
function kit(c, d, t, r) { const K = Object.create(KIT); K.c = c; K.d = d; K.t = t; K.r = r; return K }

// ------------------------------------------------------------------ EFEITOS (tabela de docs/reino/som.md)
// ms = duração que se ouve · pri = 1 (nunca some) a 4 (some primeiro) · alvo = pico em dBFS · vars = variações
// grande = abaixa a música e fica 6 dB mais baixo com "Menos animação" · tropa = som de soldado (teto próprio) · max = cópias ao mesmo tempo
// Nas receitas: v.p = afinação da variação (1 nos sons com nota certa) · v.i = número da variação · K.r() = sorteio da variação.
const PENTA = [67, 69, 71, 74, 76, 79, 81, 83, 86] // sol maior sem as notas que brigam: todo som de interface cai nelas
const EFEITOS = {
  // ---- interface
  toque: { ms: 60, pri: 2, alvo: -18, camada: 'interface', vars: 3, fn(K, v) { K.tom({ f: N(79) * v.p, dur: 0.07, tipo: 'triangle', vol: 0.5 }); K.ruido({ dur: 0.012, f: 3500, vol: 0.15 }) } },
  cartaAparece: { ms: 200, pri: 2, alvo: -14, camada: 'interface', vars: 3, fn(K, v) { K.ruido({ dur: 0.12, f: 900, f2: 3800, q: 1.4, vol: 0.4, ataque: 0.006 }); K.corda({ m: [71, 74, 76][v.i], dur: 0.14, vol: 0.45, em: 0.05 }) } },
  cartaEscolhe: { ms: 220, pri: 2, alvo: -12, camada: 'interface', vars: 3, fn(K, v) { K.ruido({ dur: 0.02, f: 2600, vol: 0.3 }); K.corda({ m: 67, dur: 0.13, vol: 0.5 }); K.corda({ m: [74, 76, 79][v.i], dur: 0.13, vol: 0.5, em: 0.045 }) } },
  cartaPoe: { ms: 320, pri: 2, alvo: -11, camada: 'interface', vars: 3, fn(K, v) {
    K.tambor({ f: 95 * v.p, dur: 0.11, vol: 0.6 }); K.ruido({ dur: 0.07, f: 520, tipo: 'lowpass', vol: 0.4 }); K.ruido({ dur: 0.1, f: 5200, q: 0.7, vol: 0.08, em: 0.03 })
    ;[55, 62, 67 + [0, 4, 7][v.i]].forEach((m, i) => K.corda({ m, dur: 0.26, vol: 0.34, em: 0.03 + i * 0.014 }))
  } },
  sortear: { ms: 460, pri: 2, alvo: -13, camada: 'interface', vars: 3, fn(K, v) { for (let i = 0; i < 4; i++) K.ruido({ dur: 0.05, f: (2000 + i * 520) * v.p, q: 1.6, vol: 0.4, em: i * 0.07 }); K.corda({ m: [79, 81, 83][v.i], dur: 0.13, vol: 0.4, em: 0.29 }) } },
  ouro: { ms: 190, pri: 2, alvo: -13, camada: 'interface', vars: 3, fn(K, v) { K.sino({ f: 2100 * v.p, dur: 0.15, vol: 0.4, parciais: [1, 2.42, 3.9] }); K.sino({ f: 2790 * v.p, dur: 0.17, vol: 0.4, em: 0.055, parciais: [1, 2.42, 3.9] }); K.ruido({ dur: 0.012, f: 6000, vol: 0.2 }) } },
  negado: { ms: 200, pri: 2, alvo: -15, camada: 'interface', vars: 3, fn(K, v) { for (const em of [0, 0.085]) { K.tom({ f: 196 * v.p, f2: 180 * v.p, dur: 0.1, tipo: 'triangle', vol: 0.5, em }); K.ruido({ dur: 0.04, f: 420, tipo: 'lowpass', vol: 0.25, em }) } } },
  faltaUm: { ms: 300, pri: 2, alvo: -14, camada: 'interface', vars: 1, fn(K) { K.corda({ m: 71, dur: 0.14, vol: 0.45 }); K.corda({ m: 74, dur: 0.15, vol: 0.5, em: 0.1 }) } },
  consertar: { ms: 550, pri: 2, alvo: -12, camada: 'interface', vars: 3, fn(K, v) {
    for (const em of [0, 0.13]) { K.tom({ f: 700 * v.p, f2: 500 * v.p, dur: 0.03, tipo: 'triangle', vol: 0.5, em }); K.ruido({ dur: 0.03, f: 1800, vol: 0.4, em }) }
    ;[62, 67, 74].forEach((m, i) => K.corda({ m, dur: 0.16, vol: 0.4, em: 0.26 + i * 0.055 })); K.sino({ f: N(86), dur: 0.1, vol: 0.12, em: 0.37 })
  } },
  // ---- nível
  nivelPequeno: { ms: 430, pri: 2, alvo: -11, camada: 'nível', vars: 3, fn(K, v) {
    [[67, 71, 74, 79], [62, 67, 71, 74], [67, 74, 79, 83]][v.i].forEach((m, i) => K.corda({ m, dur: i === 3 ? 0.24 : 0.14, vol: 0.45, em: i * 0.07 }))
    K.sino({ f: N(91), dur: 0.2, vol: 0.14, em: 0.27 }); K.ruido({ dur: 0.18, f: 7000, tipo: 'highpass', vol: 0.06, em: 0.25, ataque: 0.04 })
  } },
  nivelGrande: { ms: 1080, pri: 1, alvo: -8, camada: 'nível', vars: 1, grande: true, fn(K) {
    K.tambor({ f: 90, dur: 0.2, vol: 0.6 }); K.tambor({ f: 80, dur: 0.3, vol: 0.7, em: 0.28 })
    K.trompa({ m: 67, dur: 0.13, vol: 0.5 }); K.trompa({ m: 74, dur: 0.13, vol: 0.5, em: 0.14 }); K.trompa({ m: 79, dur: 0.75, vol: 0.55, em: 0.28 }); K.trompa({ m: 71, dur: 0.75, vol: 0.3, em: 0.28 })
    ;[79, 83, 86, 91, 86, 91, 95].forEach((m, i) => K.sino({ f: N(m), dur: 0.22, vol: 0.1, em: 0.4 + i * 0.075 })); K.pandeiro({ vol: 0.2, em: 0.28, dur: 0.3 })
  } },
  // ---- batalha
  marcha: { ms: 770, pri: 3, alvo: -13, camada: 'batalha', vars: 3, tropa: true, max: 1, fn(K, v) {
    for (let i = 0; i < 4; i++) { const em = i * 0.21; K.tambor({ f: (i % 2 ? 92 : 105) * v.p, dur: 0.12, vol: i % 2 ? 0.4 : 0.55, em }); K.ruido({ dur: 0.07, f: 700, q: 0.8, vol: 0.35, em: em + 0.01 }); K.ruido({ dur: 0.035, f: 4800, q: 2, vol: 0.09, em: em + 0.03 + K.r() * 0.02 }) }
    K.ruido({ dur: 0.1, f: 500, tipo: 'lowpass', vol: 0.12, em: 0.8 })
  } },
  choque: { ms: 540, pri: 3, alvo: -11, camada: 'batalha', vars: 3, tropa: true, max: 2, somar: true, fn(K, v) {
    K.ruido({ dur: 0.62, f: 1200 * v.p, q: 0.5, vol: 0.14, ataque: 0.01 }); K.tambor({ f: 85, dur: 0.14, vol: 0.5 })
    for (let i = 0; i < 8; i++) { const em = i === 0 ? 0 : i * 0.065 + K.r() * 0.05; K.sino({ f: (1700 + K.r() * 2400) * v.p, dur: 0.05 + K.r() * 0.06, vol: 0.2 + K.r() * 0.14, em, parciais: [1, 1.52, 2.31, 3.4] }) }
    for (let i = 0; i < 4; i++) { const em = 0.05 + K.r() * 0.45; K.ruido({ dur: 0.07, f: 600, tipo: 'lowpass', vol: 0.3, em }); K.tom({ f: 150, f2: 70, dur: 0.07, vol: 0.3, em }) }
  } },
  espada: { ms: 60, pri: 4, alvo: -16, camada: 'batalha', vars: 3, tropa: true, max: 4, fn(K, v) { K.sino({ f: 2400 * v.p * (1 + K.r() * 0.15), dur: 0.1, vol: 0.4, parciais: [1, 1.52, 2.31, 3.4] }); K.ruido({ dur: 0.015, f: 5000, vol: 0.3 }) } },
  flecha: { ms: 220, pri: 3, alvo: -14, camada: 'batalha', vars: 3, tropa: true, max: 3, fn(K, v) { K.ruido({ dur: 0.16, f: 3200 * v.p, f2: 900, q: 4, vol: 0.5, ataque: 0.008 }); K.tom({ f: 230 * v.p, f2: 140, dur: 0.06, tipo: 'triangle', vol: 0.5, em: 0.17 }); K.ruido({ dur: 0.035, f: 1300, tipo: 'lowpass', vol: 0.45, em: 0.17 }) } },
  magiaFogo: { ms: 380, pri: 2, alvo: -10, camada: 'batalha', vars: 3, fn(K, v) {
    K.ruido({ dur: 0.02, f: 4000, vol: 0.3 }); K.ruido({ dur: 0.5, f: 350 * v.p, f2: 2200, tipo: 'lowpass', q: 0.7, vol: 0.5, ataque: 0.05 }); K.tom({ f: 95, f2: 60, dur: 0.45, tipo: 'sawtooth', vol: 0.14, lp: 400 })
    for (let i = 0; i < 7; i++) K.ruido({ dur: 0.016, f: 3000 + K.r() * 3500, q: 3, vol: 0.3, em: 0.05 + K.r() * 0.42 })
  } },
  magiaGelo: { ms: 410, pri: 2, alvo: -11, camada: 'batalha', vars: 3, fn(K, v) {
    [2637, 3136, 3951].forEach((f, i) => K.sino({ f: f * v.p, dur: 0.55, vol: 0.4, em: i * 0.07, parciais: [1, 2.01, 3.6] })); K.ruido({ dur: 0.3, f: 7000, tipo: 'highpass', vol: 0.12, ataque: 0.01 }); K.tom({ f: 1568 * v.p, f2: 2093 * v.p, dur: 0.12, vol: 0.2 })
  } },
  magiaRaio: { ms: 200, pri: 2, alvo: -10, camada: 'batalha', vars: 3, fn(K, v) {
    K.ruido({ dur: 0.035, f: 2500, tipo: 'highpass', vol: 0.6, ataque: 0.001 }); K.tom({ f: 1900 * v.p, f2: 130, dur: 0.17, tipo: 'sawtooth', vol: 0.3, lp: 5000 }); K.ruido({ dur: 0.4, f: 800 * v.p, q: 0.6, vol: 0.5, em: 0.04 }); K.tambor({ f: 75, dur: 0.22, vol: 0.45, em: 0.02 }); K.tom({ f: 2400 * v.p, f2: 300, dur: 0.1, tipo: 'sawtooth', vol: 0.2, lp: 5000, em: 0.13 }); K.ruido({ dur: 0.02, f: 3500, tipo: 'highpass', vol: 0.3, em: 0.13, ataque: 0.001 })
  } },
  magiaCura: { ms: 560, pri: 2, alvo: -12, camada: 'batalha', vars: 3, fn(K, v) {
    [[74, 79, 83], [71, 76, 79], [74, 81, 86]][v.i].forEach((m, i) => K.corda({ m, dur: 0.2, vol: 0.4, em: i * 0.09 })); K.flauta({ m: [86, 83, 91][v.i], dur: 0.22, vol: 0.25, em: 0.2 }); K.ruido({ dur: 0.3, f: 8000, tipo: 'highpass', vol: 0.05, em: 0.15, ataque: 0.08 })
  } },
  critico: { ms: 340, pri: 2, alvo: -8, camada: 'batalha', vars: 3, grande: true, fn(K, v) {
    K.ruido({ dur: 0.02, f: 3000, tipo: 'highpass', vol: 0.5, ataque: 0.001 }); K.sino({ f: 1250 * v.p, dur: 0.7, vol: 0.7, parciais: [1, 1.48, 2.6, 3.9] }); K.tambor({ f: 80, dur: 0.2, vol: 0.45 }); K.tom({ f: 2349 * v.p, dur: 0.14, vol: 0.14, em: 0.04 })
  } },
  soldadoCai: { ms: 230, pri: 4, alvo: -16, camada: 'batalha', vars: 3, tropa: true, max: 3, fn(K, v) { K.tom({ f: 640 * v.p, f2: 190, dur: 0.14, tipo: 'triangle', vol: 0.4 }); K.ruido({ dur: 0.06, f: 520, tipo: 'lowpass', vol: 0.45, em: 0.14 }); K.tom({ f: 240, f2: 110, dur: 0.07, tipo: 'triangle', vol: 0.4, em: 0.14 }) } },
  muralha: { ms: 310, pri: 3, alvo: -11, camada: 'batalha', vars: 3, fn(K, v) {
    K.tom({ f: 96 * v.p, f2: 55, dur: 0.22, vol: 0.6 }); K.ruido({ dur: 0.12, f: 700, tipo: 'lowpass', vol: 0.5 }); K.tom({ f: 420 * v.p, f2: 300, dur: 0.045, tipo: 'triangle', vol: 0.4 })
    for (let i = 0; i < 3; i++) K.ruido({ dur: 0.022, f: 2200 + K.r() * 900, q: 3, vol: 0.2, em: 0.15 + i * 0.07 + K.r() * 0.02 })
  } },
  casteloRacha: { ms: 790, pri: 1, alvo: -7, camada: 'batalha', vars: 3, grande: true, fn(K, v) {
    for (let i = 0; i < 8; i++) K.ruido({ dur: 0.035, f: (3600 - i * 380) * v.p, q: 2, vol: 0.5, em: i * 0.045, ataque: 0.001 })
    K.ruido({ dur: 0.75, f: 260, f2: 120, tipo: 'lowpass', vol: 0.5, ataque: 0.01 }); K.tom({ f: 72, f2: 40, dur: 0.65, tipo: 'sawtooth', vol: 0.25, lp: 500 }); K.tom({ f: 310 * v.p, f2: 180, dur: 0.12, tipo: 'triangle', vol: 0.4 })
    for (let i = 0; i < 6; i++) K.ruido({ dur: 0.025, f: 1800 + K.r() * 1500, q: 3, vol: 0.2, em: 0.42 + i * 0.07 + K.r() * 0.03 })
  } },
  vidaPerdida: { ms: 750, pri: 1, alvo: -9, camada: 'batalha', vars: 1, grande: true, fn(K) {
    K.sino({ f: N(55), dur: 0.9, vol: 0.5, parciais: [1, 2, 2.4, 3, 4.2] }); K.palheta({ m: 74, dur: 0.2, vol: 0.3, em: 0.08 }); K.palheta({ m: 70, dur: 0.45, vol: 0.3, em: 0.3 }); K.tambor({ f: 70, dur: 0.25, vol: 0.4 })
  } },
  // ---- invasor e chefe
  invasorChega: { ms: 980, pri: 2, alvo: -10, camada: 'invasor', vars: 1, fn(K) {
    K.trompa({ m: 62, dur: 0.3, vol: 0.5 }); K.trompa({ m: 69, dur: 0.62, vol: 0.55, em: 0.32 })
    ;[0, 0.22, 0.4, 0.55, 0.67, 0.77, 0.85].forEach((em, i) => K.tambor({ f: 100, dur: 0.1, vol: 0.2 + i * 0.05, em }))
  } },
  chefeAnuncia: { ms: 1300, pri: 1, alvo: -8, camada: 'chefe', vars: 1, grande: true, fn(K) {
    K.trompa({ m: 55, dur: 1.3, vol: 0.5 }); K.trompa({ m: 56, dur: 1.15, vol: 0.3, em: 0.15 }); K.trompa({ m: 43, dur: 1.3, vol: 0.4 })
    ;[0, 0.42, 0.84].forEach((em) => K.tambor({ f: 62, dur: 0.32, vol: 0.7, em })); K.ruido({ dur: 1.2, f: 220, tipo: 'lowpass', vol: 0.2, ataque: 0.2 })
  } },
  chefeEntra: { ms: 890, pri: 1, alvo: -7, camada: 'chefe', vars: 1, grande: true, fn(K) {
    for (const [em, vol] of [[0, 0.55], [0.34, 0.8]]) { K.tambor({ f: 55, dur: 0.4, vol, em }); K.ruido({ dur: 0.45, f: 240, tipo: 'lowpass', vol: vol * 0.6, em }); K.ruido({ dur: 0.05, f: 1500, q: 0.7, vol: vol * 0.5, em, ataque: 0.001 }) } // dois passos pesados
    K.sino({ f: 110, dur: 1.2, vol: 0.9, em: 0.34, parciais: [1, 1.5, 2.1, 2.9, 4.3, 5.8] }); K.palheta({ m: 43, dur: 0.6, vol: 0.2, em: 0.03 })
  } },
  chefeCai: { ms: 1400, pri: 1, alvo: -7, camada: 'chefe', vars: 1, grande: true, fn(K) {
    K.tom({ f: 1400, f2: 210, dur: 0.5, vol: 0.35, sus: true, ataque: 0.01 }); K.tom({ f: 2800, f2: 420, dur: 0.5, vol: 0.06, sus: true })
    K.tambor({ f: 55, dur: 0.4, vol: 0.9, em: 0.5 }); K.ruido({ dur: 0.5, f: 2600, f2: 300, tipo: 'lowpass', vol: 0.6, em: 0.5 }); K.sino({ f: 880, dur: 0.4, vol: 0.2, em: 0.5, parciais: [1, 1.48, 2.6] })
    ;[67, 71, 74, 79].forEach((m, i) => K.corda({ m, dur: 0.5, vol: 0.4, em: 0.78 + i * 0.05 })); [86, 91, 95].forEach((m, i) => K.sino({ f: N(m), dur: 0.4, vol: 0.12, em: 0.95 + i * 0.09 }))
    K.trompa({ m: 67, dur: 0.6, vol: 0.3, em: 0.8 }); K.trompa({ m: 74, dur: 0.6, vol: 0.3, em: 0.8 })
  } },
  // ---- fim de batalha
  vitoria: { ms: 1640, pri: 1, alvo: -7, camada: 'resultado', vars: 1, grande: true, fn(K) { // abre com o motivo: sol–ré–si–dó e sobe para o ré longo
    [[67, 0, 0.14], [74, 0.16, 0.14], [71, 0.32, 0.1], [72, 0.43, 0.11], [74, 0.56, 0.95]].forEach(([m, em, dur]) => { K.trompa({ m, dur, vol: 0.5, em }); K.flauta({ m: m + 12, dur, vol: 0.18, em }) })
    K.trompa({ m: 79, dur: 0.85, vol: 0.3, em: 0.66 }); K.cordas({ ms: [55, 62, 67, 71], dur: 0.95, vol: 0.35, em: 0.56 })
    ;[0, 0.16, 0.56].forEach((em, i) => K.tambor({ f: 90, dur: 0.2, vol: i === 2 ? 0.7 : 0.5, em })); for (let i = 0; i < 6; i++) K.pandeiro({ vol: 0.16, em: 0.56 + i * 0.11 })
    ;[86, 91, 95, 98].forEach((m, i) => K.sino({ f: N(m), dur: 0.3, vol: 0.08, em: 0.75 + i * 0.1 }))
  } },
  espolio: { ms: 500, pri: 2, alvo: -11, camada: 'resultado', vars: 3, fn(K, v) {
    K.tom({ f: 180 * v.p, f2: 270, dur: 0.12, tipo: 'sawtooth', vol: 0.2, lp: 1200 }); K.tambor({ f: 110, dur: 0.09, vol: 0.4, em: 0.12 })
    ;[[79, 83, 86], [76, 79, 83], [79, 86, 91]][v.i].forEach((m, i) => K.sino({ f: N(m), dur: 0.26, vol: 0.25, em: 0.16 + i * 0.07 })); K.ruido({ dur: 0.25, f: 7500, tipo: 'highpass', vol: 0.05, em: 0.16, ataque: 0.05 })
  } },
  espolioEscolhe: { ms: 260, pri: 2, alvo: -11, camada: 'resultado', vars: 3, fn(K, v) { K.tambor({ f: 120, dur: 0.08, vol: 0.4 }); K.corda({ m: 67, dur: 0.3, vol: 0.45 }); K.corda({ m: [74, 71, 79][v.i], dur: 0.3, vol: 0.45, em: 0.015 }); K.sino({ f: N(86), dur: 0.22, vol: 0.2, em: 0.08 }) } },
  derrota: { ms: 1630, pri: 1, alvo: -9, camada: 'resultado', vars: 1, grande: true, fn(K) { // o motivo desce em menor e perde o fôlego
    [[74, 0, 0.28], [70, 0.3, 0.33], [69, 0.65, 0.38], [67, 1.05, 0.48]].forEach(([m, em, dur]) => { K.palheta({ m, dur, vol: 0.4, em }); K.flauta({ m: m - 12, dur, vol: 0.2, em }) })
    K.tambor({ f: 65, dur: 0.3, vol: 0.6 }); K.tambor({ f: 60, dur: 0.4, vol: 0.5, em: 1.05 }); K.cordas({ ms: [43, 55, 58], dur: 0.48, vol: 0.2, em: 1.05 })
  } },
  // ---- fim de partida, álbum, conquista
  fimDePartida: { ms: 2310, pri: 1, alvo: -7, camada: 'fim', vars: 1, grande: true, fn(K) { // o tema inteiro, depressa, fechando em sol
    [67, 74, 71, 72, 69, 66, 69].forEach((m, i) => { K.trompa({ m, dur: 0.13, vol: 0.45, em: i * 0.14 }); K.flauta({ m: m + 12, dur: 0.13, vol: 0.2, em: i * 0.14 }); if (i % 2 === 0) K.tambor({ f: 95, dur: 0.14, vol: 0.5, em: i * 0.14 }); K.pandeiro({ vol: 0.12, em: i * 0.14 + 0.07 }) })
    K.trompa({ m: 67, dur: 1.25, vol: 0.4, em: 1.0 }); K.trompa({ m: 74, dur: 1.25, vol: 0.4, em: 1.0 }); K.trompa({ m: 79, dur: 1.25, vol: 0.4, em: 1.0 }); K.cordas({ ms: [43, 55, 62, 71], dur: 1.25, vol: 0.4, em: 1.0 }); K.tambor({ f: 70, dur: 0.4, vol: 0.8, em: 1.0 })
    for (let i = 0; i < 10; i++) { K.pandeiro({ vol: 0.14, em: 1.0 + i * 0.09 }); K.sino({ f: N(PENTA[(i * 2) % 9] + 12), dur: 0.3, vol: 0.07, em: 1.1 + i * 0.1 }) }
  } },
  recorde: { ms: 1250, pri: 1, alvo: -8, camada: 'fim', vars: 1, grande: true, somar: true, fn(K) {
    PENTA.forEach((m, i) => K.corda({ m, dur: 0.2, vol: 0.4, em: i * 0.05 })); K.ruido({ dur: 0.5, f: 3000, f2: 9000, tipo: 'highpass', vol: 0.1, ataque: 0.3 })
    K.trompa({ m: 79, dur: 0.75, vol: 0.4, em: 0.48 }); K.trompa({ m: 83, dur: 0.75, vol: 0.3, em: 0.48 }); K.tambor({ f: 80, dur: 0.3, vol: 0.7, em: 0.48 })
    ;[91, 95, 98, 103, 98, 95].forEach((m, i) => K.sino({ f: N(m), dur: 0.3, vol: 0.1, em: 0.55 + i * 0.1 }))
  } },
  rankingSobe: { ms: 140, pri: 2, alvo: -14, camada: 'fim', vars: 3, certo: true, cauda: 0.12, fn(K, v) { const m = v.tom ? 67 + Math.max(-12, Math.min(19, Math.round(v.tom))) : [67, 69, 71][v.i] /* com `tom` a corda sobe um semitom por degrau: contagem subindo */; K.corda({ m, dur: 0.18, vol: 0.45 }); K.tom({ f: N(m + 12), f2: N(m + 19), dur: 0.09, tipo: 'triangle', vol: 0.2 }); K.ruido({ dur: 0.012, f: 4000, vol: 0.2 }) } },
  cartaNova: { ms: 990, pri: 2, alvo: -9, camada: 'álbum', vars: 1, grande: true, fn(K) {
    K.ruido({ dur: 0.13, f: 1800, f2: 4200, q: 1.5, vol: 0.4, ataque: 0.006 }); PENTA.slice(0, 6).forEach((m, i) => K.corda({ m, dur: 0.18, vol: 0.35, em: 0.1 + i * 0.06 }))
    ;[79, 83, 86].forEach((m) => K.sino({ f: N(m), dur: 0.5, vol: 0.2, em: 0.52 })); K.flauta({ m: 79, dur: 0.45, vol: 0.3, em: 0.52 }); K.ruido({ dur: 0.4, f: 7500, tipo: 'highpass', vol: 0.06, em: 0.5, ataque: 0.05 })
  } },
  conquista: { ms: 960, pri: 2, alvo: -9, camada: 'álbum', vars: 1, grande: true, fn(K) {
    K.tambor({ f: 85, dur: 0.14, vol: 0.7 }); K.ruido({ dur: 0.07, f: 450, tipo: 'lowpass', vol: 0.5 })
    ;[[74, 0.12, 0.12], [79, 0.26, 0.12], [83, 0.4, 0.48]].forEach(([m, em, dur]) => K.trompa({ m, dur, vol: 0.45, em })); K.trompa({ m: 79, dur: 0.48, vol: 0.25, em: 0.4 }); K.sino({ f: N(95), dur: 0.4, vol: 0.14, em: 0.4 })
  } },
  // ================================================================ R35 — o som da tela nova
  // ---- interface nova (carta que vira, ouro contando, menu, replay, rede, apelido, ranking)
  cartaVira: { ms: 128, pri: 2, alvo: -15, camada: 'interface', vars: 3, fn(K, v) { K.ruido({ dur: 0.09, f: 1400 * v.p, f2: 5200, q: 1.2, vol: 0.45, ataque: 0.012 }); K.ruido({ dur: 0.018, f: 2800, vol: 0.5, em: 0.075, ataque: 0.001 }); K.tom({ f: 420 * v.p, f2: 300, dur: 0.035, tipo: 'triangle', vol: 0.35, em: 0.075 }) } },
  cartaRara: { ms: 350, pri: 2, alvo: -12, camada: 'interface', vars: 1, fn(K) { [83, 86, 91, 95].forEach((m, i) => K.sino({ f: N(m), dur: 0.36, vol: 0.3, em: i * 0.055 })); K.ruido({ dur: 0.4, f: 7500, tipo: 'highpass', vol: 0.07, ataque: 0.08 }); K.corda({ m: 79, dur: 0.3, vol: 0.3 }) } },
  ouroTique: { ms: 37, pri: 3, certo: true, alvo: -19, camada: 'interface', vars: 3, fn(K, v) { K.sino({ f: 3100 * v.p, dur: 0.06, vol: 0.4, parciais: [1, 2.42] }); K.ruido({ dur: 0.008, f: 6000, vol: 0.2 }) } },
  menuAbre: { ms: 340, pri: 2, alvo: -15, camada: 'interface', vars: 1, fn(K) { K.ruido({ dur: 0.14, f: 500, f2: 1600, tipo: 'lowpass', vol: 0.4, ataque: 0.02 }); K.corda({ m: 67, dur: 0.2, vol: 0.4, em: 0.05 }); K.corda({ m: 74, dur: 0.24, vol: 0.4, em: 0.1 }) } },
  menuFecha: { ms: 280, pri: 2, alvo: -16, camada: 'interface', vars: 1, fn(K) { K.corda({ m: 74, dur: 0.16, vol: 0.4 }); K.corda({ m: 67, dur: 0.22, vol: 0.4, em: 0.05 }); K.ruido({ dur: 0.12, f: 1600, f2: 450, tipo: 'lowpass', vol: 0.4, ataque: 0.01, em: 0.03 }) } },
  velocidade: { ms: 160, pri: 2, alvo: -15, camada: 'interface', vars: 1, fn(K, v) { K.ruido({ dur: 0.07, f: 1500 * v.p, f2: 4500 * v.p, q: 2, vol: 0.4, ataque: 0.01 }); K.tom({ f: N(74) * v.p, dur: 0.12, tipo: 'triangle', vol: 0.5, em: 0.05 }); K.tom({ f: N(81) * v.p, dur: 0.09, tipo: 'triangle', vol: 0.3, em: 0.09 }) } },
  replayPula: { ms: 500, pri: 2, alvo: -14, camada: 'interface', vars: 1, fn(K) { [0, 0.09, 0.16, 0.22, 0.27].forEach((em, i) => { K.ruido({ dur: 0.04, f: 1800 + i * 600, q: 2, vol: 0.4, em }); K.tom({ f: N(67 + i * 3), dur: 0.04, tipo: 'triangle', vol: 0.25, em }) }); K.corda({ m: 79, dur: 0.16, vol: 0.5, em: 0.32 }) } },
  semSinal: { ms: 400, pri: 2, alvo: -16, camada: 'interface', vars: 1, fn(K) { K.corda({ m: 74, dur: 0.2, vol: 0.4 }); K.corda({ m: 69, dur: 0.3, vol: 0.4, em: 0.16 }); K.ruido({ dur: 0.3, f: 400, tipo: 'lowpass', vol: 0.15, ataque: 0.05 }) } },
  voltou: { ms: 420, pri: 2, alvo: -14, camada: 'interface', vars: 1, fn(K) { [69, 74, 79].forEach((m, i) => K.corda({ m, dur: 0.2, vol: 0.4, em: i * 0.08 })); K.sino({ f: N(91), dur: 0.25, vol: 0.14, em: 0.2 }) } },
  apelidoOk: { ms: 560, pri: 2, alvo: -12, camada: 'interface', vars: 1, fn(K) {
    for (let i = 0; i < 4; i++) K.ruido({ dur: 0.045, f: 3200 + K.r() * 1800, q: 3, vol: 0.3, em: i * 0.055, ataque: 0.008 }) // a pena riscando
    K.tambor({ f: 120, dur: 0.08, vol: 0.5, em: 0.26 }); [67, 74, 79].forEach((m, i) => K.corda({ m, dur: 0.24, vol: 0.4, em: 0.28 + i * 0.05 })); K.sino({ f: N(91), dur: 0.2, vol: 0.12, em: 0.4 })
  } },
  gancho: { ms: 560, pri: 2, alvo: -14, camada: 'fim', vars: 1, fn(K) { [[67, 0], [74, 0.12], [71, 0.24], [79, 0.36]].forEach(([m, em]) => K.corda({ m, dur: 0.24, vol: 0.45, em })); K.sino({ f: N(91), dur: 0.3, vol: 0.1, em: 0.36 }) } },
  rankUp: { ms: 900, pri: 1, alvo: -9, camada: 'fim', vars: 1, grande: true, fn(K) {
    [[67, 0, 0.09], [71, 0.1, 0.09], [74, 0.2, 0.09], [79, 0.3, 0.55]].forEach(([m, em, dur]) => { K.trompa({ m, dur, vol: 0.5, em }); K.flauta({ m: m + 12, dur, vol: 0.16, em }) }); K.trompa({ m: 74, dur: 0.55, vol: 0.3, em: 0.3 })
    K.tambor({ f: 95, dur: 0.14, vol: 0.5 }); K.tambor({ f: 85, dur: 0.25, vol: 0.7, em: 0.3 }); K.pandeiro({ vol: 0.2, em: 0.3, dur: 0.25 }); [86, 91, 95, 98].forEach((m, i) => K.sino({ f: N(m), dur: 0.25, vol: 0.1, em: 0.38 + i * 0.08 }))
  } },
  // ---- o golpe no quadro do IMPACTO: um som por GESTO (movimento.js); `varia` = cada golpe sai ±N semitons e com outra força
  impacto: { ms: 50, pri: 4, alvo: -15, camada: 'golpes', vars: 3, tropa: true, max: 3, cauda: 0.1, varia: 2, fn(K, v) { K.ruido({ dur: 0.03, f: 1900 * v.p, q: 0.9, vol: 0.6, ataque: 0.001 }); K.tom({ f: 330 * v.p, f2: 130, dur: 0.06, tipo: 'triangle', vol: 0.6, ataque: 0.001 }) } },
  golpeCorte: { ms: 70, pri: 4, alvo: -14, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) { K.sino({ f: 2100 * v.p, dur: 0.13, vol: 0.4, parciais: [1, 1.52, 2.31, 3.4] }); K.tom({ f: 260 * v.p, f2: 120, dur: 0.08, tipo: 'triangle', vol: 0.5, ataque: 0.001 }); K.ruido({ dur: 0.016, f: 4800, vol: 0.35, ataque: 0.001 }) } },
  golpeEstocada: { ms: 30, pri: 4, alvo: -15, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) { K.ruido({ dur: 0.02, f: 4200, q: 2, vol: 0.5, ataque: 0.001 }); K.tom({ f: 560 * v.p, f2: 240, dur: 0.05, tipo: 'triangle', vol: 0.55, ataque: 0.001 }); K.tom({ f: 1500 * v.p, f2: 900, dur: 0.03, vol: 0.2, ataque: 0.001 }) } },
  golpeFrigideira: { ms: 175, pri: 3, alvo: -12, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) { K.sino({ f: 640 * v.p, dur: 0.34, vol: 0.5, parciais: [1, 2.32, 3.05, 4.71, 6.2] }); K.tom({ f: 200 * v.p, f2: 110, dur: 0.06, vol: 0.5, ataque: 0.001 }); K.ruido({ dur: 0.014, f: 3000, vol: 0.4, ataque: 0.001 }) } },
  golpeBicada: { ms: 195, pri: 3, alvo: -13, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) {
    K.tom({ f: 980 * v.p, f2: 520, dur: 0.03, tipo: 'triangle', vol: 0.5, ataque: 0.001 }); K.ruido({ dur: 0.012, f: 3200, vol: 0.3, ataque: 0.001 })
    K.tom({ f: 470 * v.p, f2: 400 * v.p, dur: 0.1, tipo: 'sawtooth', vol: 0.3, lp: 1800, em: 0.03, sus: true, ataque: 0.008 }); K.tom({ f: 940 * v.p, f2: 800 * v.p, dur: 0.1, tipo: 'square', vol: 0.08, lp: 2600, em: 0.03, sus: true, ataque: 0.008 }) // o "quéc" do ganso
  } },
  golpeEsmaga: { ms: 170, pri: 3, alvo: -11, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 1, fn(K, v) {
    K.tambor({ f: 58 * v.p, dur: 0.24, vol: 0.8 }); K.ruido({ dur: 0.16, f: 320, tipo: 'lowpass', vol: 0.6, ataque: 0.002 }); K.ruido({ dur: 0.03, f: 2200 * v.p, q: 0.8, vol: 0.4, ataque: 0.001 })
    for (let i = 0; i < 2; i++) K.ruido({ dur: 0.02, f: 2400 + K.r() * 900, q: 3, vol: 0.15, em: 0.1 + i * 0.05 + K.r() * 0.02 })
  } },
  golpeMordida: { ms: 120, pri: 3, alvo: -13, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) {
    for (const em of [0, 0.055]) K.ruido({ dur: 0.014, f: 2600 * v.p, q: 1.2, vol: 0.6, em, ataque: 0.001 }) // a boca abre e fecha
    K.tom({ f: 240 * v.p, f2: 90, dur: 0.09, tipo: 'sawtooth', lp: 900, vol: 0.5, em: 0.055, ataque: 0.002 }); K.ruido({ dur: 0.06, f: 1200 * v.p, q: 3, vol: 0.4, em: 0.06, ataque: 0.002 })
  } },
  golpePortada: { ms: 155, pri: 3, alvo: -12, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 1, fn(K, v) {
    K.tom({ f: 190 * v.p, f2: 85, dur: 0.12, vol: 0.7, ataque: 0.001 }); K.ruido({ dur: 0.07, f: 750, tipo: 'lowpass', vol: 0.6, ataque: 0.001 }); K.tom({ f: 520 * v.p, f2: 380, dur: 0.035, tipo: 'triangle', vol: 0.4, ataque: 0.001 })
    for (const em of [0.09, 0.14]) { K.tom({ f: 300 * v.p, f2: 220, dur: 0.03, tipo: 'triangle', vol: 0.2, em }); K.ruido({ dur: 0.012, f: 1800, vol: 0.12, em }) } // a porta ainda treme na dobradiça
  } },
  golpeInvestida: { ms: 105, pri: 3, alvo: -12, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) {
    K.sino({ f: 880 * v.p, dur: 0.18, vol: 0.4, parciais: [1, 1.41, 2.09, 2.92, 4.1] }); K.sino({ f: 1320 * v.p * (1 + K.r() * 0.1), dur: 0.1, vol: 0.3, em: 0.02, parciais: [1, 1.52, 2.31] }); K.tambor({ f: 80, dur: 0.12, vol: 0.5 })
  } },
  golpeBarrigada: { ms: 275, pri: 3, alvo: -12, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) {
    K.tom({ f: 150 * v.p, f2: 300 * v.p, dur: 0.07, vol: 0.6, sus: true, ataque: 0.002, solta: 0.008 }); K.tom({ f: 300 * v.p, f2: 110 * v.p, dur: 0.17, vol: 0.6, em: 0.066, ataque: 0.004 }); K.ruido({ dur: 0.05, f: 500, tipo: 'lowpass', vol: 0.5, ataque: 0.001 })
  } },
  // ---- tiro: a corda solta na hora em que a flecha SAI; o "toc" na hora em que ela CHEGA
  arcoSolta: { ms: 185, pri: 4, alvo: -17, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) { K.corda({ m: [50, 52, 48][v.i], dur: 0.1, vol: 0.5 }); K.ruido({ dur: 0.15, f: 2600 * v.p, f2: 1100, q: 3.5, vol: 0.4, ataque: 0.012, em: 0.008 }) } },
  arremesso: { ms: 180, pri: 4, alvo: -18, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) { K.ruido({ dur: 0.2, f: 700 * v.p, f2: 1900 * v.p, q: 2.2, vol: 0.5, ataque: 0.05 }) } },
  flechaFinca: { ms: 140, pri: 4, alvo: -14, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) {
    K.tom({ f: 260 * v.p, f2: 150, dur: 0.05, tipo: 'triangle', vol: 0.6, ataque: 0.001 }); K.ruido({ dur: 0.03, f: 1400, tipo: 'lowpass', vol: 0.5, ataque: 0.001 })
    for (let i = 0; i < 4; i++) K.tom({ f: (430 - i * 18) * v.p, dur: 0.022, tipo: 'triangle', vol: 0.22 - i * 0.04, em: 0.035 + i * 0.028 }) // a flecha vibrando fincada
  } },
  splat: { ms: 225, pri: 4, alvo: -15, camada: 'golpes', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) { K.ruido({ dur: 0.12, f: 900, f2: 300, tipo: 'lowpass', q: 2, vol: 0.6, ataque: 0.002 }); K.tom({ f: 220 * v.p, f2: 90, dur: 0.09, vol: 0.4, sus: true, solta: 0.03, ataque: 0.001 }); K.ruido({ dur: 0.03, f: 2500 * v.p, q: 2, vol: 0.2, em: 0.04 }) } },
  // ---- cena: baixa, pelotão que acaba, explosão, entrada, festa, recuo
  fumaca: { ms: 125, pri: 4, alvo: -20, camada: 'cena', vars: 3, tropa: true, max: 2, cauda: 0.1, varia: 2, fn(K, v) { K.ruido({ dur: 0.16, f: 1100 * v.p, f2: 350, tipo: 'lowpass', vol: 0.5, ataque: 0.015 }); K.tom({ f: 180 * v.p, f2: 120, dur: 0.05, vol: 0.2 }) } },
  grupoCai: { ms: 470, pri: 2, alvo: -12, camada: 'cena', vars: 1, fn(K) { K.tambor({ f: 70, dur: 0.3, vol: 0.6 }); K.palheta({ m: 74, dur: 0.12, vol: 0.3, em: 0.04 }); K.palheta({ m: 69, dur: 0.24, vol: 0.3, em: 0.17 }); K.ruido({ dur: 0.3, f: 500, tipo: 'lowpass', vol: 0.2, ataque: 0.05 }) } },
  explosao: { ms: 440, pri: 2, alvo: -9, camada: 'cena', vars: 3, grande: true, fn(K, v) {
    K.ruido({ dur: 0.02, f: 3000, tipo: 'highpass', vol: 0.5, ataque: 0.001 }); K.tambor({ f: 52 * v.p, dur: 0.4, vol: 0.9 }); K.ruido({ dur: 0.55, f: 2400 * v.p, f2: 180, tipo: 'lowpass', vol: 0.7, ataque: 0.004 }); K.tom({ f: 90, f2: 38, dur: 0.45, tipo: 'sawtooth', vol: 0.25, lp: 420 })
    for (let i = 0; i < 5; i++) K.ruido({ dur: 0.02, f: 2000 + K.r() * 2500, q: 3, vol: 0.25, em: 0.12 + K.r() * 0.35 })
  } },
  poeira: { ms: 470, pri: 4, alvo: -22, camada: 'cena', vars: 1, fn(K) { K.ruido({ dur: 0.75, f: 500, f2: 1400, tipo: 'lowpass', vol: 0.5, ataque: 0.14 }); K.ruido({ dur: 0.06, f: 900, tipo: 'lowpass', vol: 0.1, ataque: 0.004 }) } },
  gritoTropa: { ms: 320, pri: 3, alvo: -13, camada: 'cena', vars: 1, fn(K) {
    K.tambor({ f: 110, dur: 0.12, vol: 0.6 }); K.trompa({ m: 67, dur: 0.14, vol: 0.4 }); K.trompa({ m: 74, dur: 0.14, vol: 0.3 }); K.pandeiro({ vol: 0.25, dur: 0.08 })
    K.ruido({ dur: 0.06, f: 600, tipo: 'lowpass', vol: 0.4, em: 0.3 }); K.pandeiro({ vol: 0.15, em: 0.3 }) // o pouso do pulo
  } },
  festaTropa: { ms: 700, pri: 3, alvo: -13, camada: 'cena', vars: 1, fn(K) { for (const k of [0, 0.32]) { K.trompa({ m: 74, dur: 0.1, vol: 0.4, em: k }); K.trompa({ m: 79, dur: 0.14, vol: 0.4, em: k + 0.1 }); K.tambor({ f: 105, dur: 0.1, vol: 0.5, em: k + 0.3 }); K.pandeiro({ vol: 0.22, em: k + 0.3, dur: 0.07 }) } } },
  recuoTropa: { ms: 470, pri: 3, alvo: -15, camada: 'cena', vars: 1, fn(K) { for (const em of [0, 0.16]) { K.ruido({ dur: 0.07, f: 600, tipo: 'lowpass', vol: 0.5, em }); K.ruido({ dur: 0.03, f: 3800, q: 2, vol: 0.1, em: em + 0.02 }) } K.palheta({ m: 67, dur: 0.12, vol: 0.25, em: 0.05 }); K.palheta({ m: 63, dur: 0.22, vol: 0.25, em: 0.18 }) } },
  // ---- chefe em etapas: o pisão cai no quadro em que ele pousa; ajoelha; tomba
  pisao: { ms: 420, pri: 1, alvo: -7, camada: 'chefe', vars: 1, grande: true, somar: true, fn(K) {
    K.tambor({ f: 50, dur: 0.45, vol: 0.9 }); K.ruido({ dur: 0.4, f: 260, tipo: 'lowpass', vol: 0.6, ataque: 0.002 }); K.ruido({ dur: 0.05, f: 1600, q: 0.7, vol: 0.5, ataque: 0.001 }); K.sino({ f: 110, dur: 0.9, vol: 0.5, parciais: [1, 1.5, 2.1, 2.9, 4.3] })
    for (let i = 0; i < 4; i++) K.ruido({ dur: 0.022, f: 2000 + K.r() * 1200, q: 3, vol: 0.2, em: 0.18 + i * 0.07 + K.r() * 0.03 })
  } },
  chefeJoelho: { ms: 155, pri: 2, alvo: -11, camada: 'chefe', vars: 1, fn(K) { K.tambor({ f: 75, dur: 0.2, vol: 0.7 }); K.ruido({ dur: 0.12, f: 500, tipo: 'lowpass', vol: 0.5, ataque: 0.002 }); for (let i = 0; i < 3; i++) K.sino({ f: 1500 + K.r() * 900, dur: 0.06, vol: 0.12, em: 0.03 + i * 0.05, parciais: [1, 1.52, 2.31] }) } },
  chefeTomba: { ms: 590, pri: 1, alvo: -8, camada: 'chefe', vars: 1, grande: true, somar: true, fn(K) {
    K.tambor({ f: 45, dur: 0.6, vol: 1 }); K.ruido({ dur: 0.7, f: 1800, f2: 150, tipo: 'lowpass', vol: 0.7, ataque: 0.003 }); K.tom({ f: 70, f2: 34, dur: 0.6, tipo: 'sawtooth', vol: 0.3, lp: 380 }); K.ruido({ dur: 0.04, f: 1500, q: 0.7, vol: 0.5, ataque: 0.001 })
    for (let i = 0; i < 6; i++) K.ruido({ dur: 0.024, f: 1800 + K.r() * 1500, q: 3, vol: 0.2, em: 0.22 + i * 0.07 + K.r() * 0.03 })
  } },
}

// Pico de cada receita SEM ajuste, em dBFS (medido fora do tempo real). Recalibrar depois de mexer numa receita:
//   node tests/tela/reino-som.e2e.mjs --calibrar --gravar
/* PICO_BRUTO:INICIO */
const PICO_BRUTO = {
  toque: [-6.3, -6.3, -6.1],
  cartaAparece: [-7.4, -8.5, -9],
  cartaEscolhe: [-5, -6.1, -6],
  cartaPoe: [-5.1, -4.2, -5.1],
  sortear: [-9.7, -9.5, -9.9],
  ouro: [-3.3, -3.6, -3],
  negado: [-6.2, -5.6, -6.7],
  faltaUm: [-7.5],
  consertar: [-5, -5.3, -6],
  nivelPequeno: [-6, -6, -6.3],
  nivelGrande: [0.7],
  marcha: [-5.9, -5.6, -5.8],
  choque: [-1.5, -3.8, -2.5],
  espada: [-3.1, -3, -2.7],
  flecha: [-5.2, -8.5, -7.1],
  magiaFogo: [-14.6, -14.6, -12.5],
  magiaGelo: [-1.3, -0.3, -1],
  magiaRaio: [-2.6, -3.9, -3.4],
  magiaCura: [-8.9, -7.7, -6.8],
  critico: [3.3, 2.7, 3.7],
  soldadoCai: [-8.2, -8.3, -8.1],
  muralha: [-2.2, -2.2, -4.1],
  casteloRacha: [-5.3, -5.7, -5.2],
  vidaPerdida: [0.9],
  invasorChega: [-1.9],
  chefeAnuncia: [1.1],
  chefeEntra: [4.9],
  chefeCai: [1.8],
  vitoria: [-1.1],
  espolio: [-6.8, -7.2, -6.6],
  espolioEscolhe: [-4.1, -3.5, -4.4],
  derrota: [0.7],
  fimDePartida: [0.8],
  recorde: [-0.7],
  rankingSobe: [-5.7, -6, -5],
  cartaNova: [-0.7],
  conquista: [-2.2],
  cartaVira: [-9.2, -10.1, -7.2],
  cartaRara: [-2.5],
  ouroTique: [-4.4, -4.8, -4.9],
  menuAbre: [-7.9],
  menuFecha: [-6.8],
  velocidade: [-6.5],
  replayPula: [-7.8],
  semSinal: [-9.1],
  voltou: [-7.9],
  apelidoOk: [-6.1],
  gancho: [-5.8],
  rankUp: [-0.7],
  impacto: [-4.9, -2.9, -3.8],
  golpeCorte: [-1, -1.2, -0.8],
  golpeEstocada: [-3.2, -3.9, -3.1],
  golpeFrigideira: [0.9, 0.8, 1],
  golpeBicada: [-6.3, -7, -4.7],
  golpeEsmaga: [-0.5, 0.1, -1],
  golpeMordida: [-6, -5.2, -5.2],
  golpePortada: [-2.2, -3, -0.9],
  golpeInvestida: [0.4, 0.6, 0.4],
  golpeBarrigada: [-4.2, -4.2, -4.3],
  arcoSolta: [-7.2, -7.1, -6.4],
  arremesso: [-19.2, -20.1, -17.6],
  flechaFinca: [-5.1, -4.3, -4.7],
  splat: [-4.9, -6, -4.9],
  fumaca: [-13.7, -12.9, -13.8],
  grupoCai: [-3.8],
  explosao: [2.9, 4.1, 4.1],
  poeira: [-16.6],
  gritoTropa: [-2.7],
  festaTropa: [-3.9],
  recuoTropa: [-9.1],
  pisao: [3.7],
  chefeJoelho: [-2.8],
  chefeTomba: [2.7],
}
/* PICO_BRUTO:FIM */
const POS = 0.61 // desfaz o ganho automático do compressor: som baixo sai da cadeia como entrou
const MUSICA_GANHO = 0.19 // põe a música ~10 dB abaixo dos efeitos
const TETO_VOZES = 12, TETO_TROPA = 6, PADRAO = { mudo: false, efeitos: 0.8, musica: 0.6 }
const AFINA = [1, 0.955, 1.05]
const CORTE_ABERTO = 22000, CORTE_FECHADO = 1100 // parada de impacto: o agudo some por um instante (o mundo "segura")
const JANELA_GRUPO = 60 // ms: golpes do mesmo pelotão dentro desta janela viram UM som, mais forte
const PAN_MAX = 0.6 // posição estéreo leve: nada fica só num lado
// O som de cada GESTO de golpe (a ordem é a de GESTO em js/movimento.js): corte, estocada, frigideira, bicada, esmaga, tiro, mordida, portada, investida, barrigada
const GOLPES = ['golpeCorte', 'golpeEstocada', 'golpeFrigideira', 'golpeBicada', 'golpeEsmaga', 'impacto', 'golpeMordida', 'golpePortada', 'golpeInvestida', 'golpeBarrigada']
// Abaixar a música mais fundo e por mais tempo que os 6 dB de um som grande: [ganho, segundos]
const DUCK = { chefeCai: [0.3, 2.4], chefeTomba: [0.35, 1.0], recorde: [0.35, 1.6], rankUp: [0.4, 1.1] }

/** A mesma cadeia ao vivo e na medição: efeitos + música → sala → compressor → teto → saída. */
function cadeia(c) {
  const g = (v) => { const n = c.createGain(); n.gain.value = v; return n }
  const fx = g(1), mus = g(MUSICA_GANHO), musDuck = g(1), musVol = g(1), soma = g(1), pos = g(POS), saida = g(1), sFx = g(0.06), sMus = g(0.2)
  const musFiltro = c.createBiquadFilter(); musFiltro.type = 'lowpass'; musFiltro.frequency.value = 18000; musFiltro.Q.value = 0.5
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -9; comp.knee.value = 6; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18
  const teto = c.createWaveShaper(); teto.curve = curvaTeto()
  const sala = c.createConvolver(); sala.normalize = false; sala.buffer = bufSala(c.sampleRate)
  fx.connect(soma); fx.connect(sFx); sFx.connect(sala)
  mus.connect(musFiltro); musFiltro.connect(musDuck); musDuck.connect(musVol); musVol.connect(soma); musVol.connect(sMus); sMus.connect(sala)
  // R35: `corte` = o agudo que some por um instante na parada de impacto (aberto, não muda nada) · `amb` = ambiente do trecho (segue o volume de efeitos)
  const corte = c.createBiquadFilter(); corte.type = 'lowpass'; corte.frequency.value = CORTE_ABERTO; corte.Q.value = 0.5
  const amb = g(1); amb.connect(fx)
  sala.connect(soma); soma.connect(corte); corte.connect(comp); comp.connect(pos); pos.connect(teto); teto.connect(saida); saida.connect(c.destination)
  return { fx, mus, musFiltro, musDuck, musVol, saida, corte, amb }
}

/** Monta um efeito no contexto dado (ao vivo ou fora do tempo real). Devolve a ficha e o nó da voz. */
function fabricar(c, destino, nome, t, i = 0, { tom = 0, forca = 1, pan = 0, cru = false } = {}) {
  const e = EFEITOS[nome]; if (!e) return null
  i = ((i % e.vars) + e.vars) % e.vars
  const bruto = PICO_BRUTO[nome]?.[i] ?? -6
  const voz = c.createGain(); voz.gain.value = cru ? 1 : db2(e.alvo - bruto) * forca
  let fim = voz
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); voz.connect(p); fim = p }
  fim.connect(destino)
  e.fn(kit(c, voz, t, sorteio(hash(nome) + i * 7919)), { i, tom, p: (e.vars > 1 ? AFINA[i % 3] : 1) * 2 ** (tom / 12) })
  return { voz, fim, ms: e.ms, alvo: e.alvo }
}

// ------------------------------------------------------------------ MÚSICA: o Tema do Reino (sol maior, 4 por 4), em camadas
// MOTIVO (original): sol – ré – si – dó – lá | sol – mi – lá. Resposta: sol – ré – si – dó – lá | fá sustenido – lá – sol.
// Cada compasso tem 8 passos (colcheias). Nota = [passo, MIDI, quantos passos].
const TEMA = [
  [[0, 67, 2], [2, 74, 2], [4, 71, 1], [5, 72, 1], [6, 69, 2]], [[0, 67, 2], [2, 64, 2], [4, 69, 4]],
  [[0, 67, 2], [2, 74, 2], [4, 71, 1], [5, 72, 1], [6, 69, 2]], [[0, 66, 2], [2, 69, 2], [4, 67, 4]],
  [[0, 71, 2], [2, 76, 2], [4, 74, 1], [5, 72, 1], [6, 71, 2]], [[0, 72, 2], [2, 69, 2], [4, 67, 4]],
  [[0, 69, 1], [1, 71, 1], [2, 72, 2], [4, 71, 2], [6, 69, 2]], [[0, 67, 6]],
]
const ACORDE = { G: [55, 59, 62], C: [48, 52, 55], D: [50, 54, 57], Em: [52, 55, 59], Am: [45, 48, 52] }
const HARMONIA = ['G', 'G', 'C', 'D', 'G', 'G', 'D', 'G', 'Em', 'Em', 'C', 'C', 'Am', 'D', 'G', 'G'] // um acorde por meio compasso
const MOMENTOS = {
  construir: { rotulo: 'construir (calmo)', bpm: 0 }, batalha: { rotulo: 'batalha (entra a percussão)', bpm: 0, virada: true }, chefe: { rotulo: 'chefe (tensão, em menor)', bpm: 0, menor: true, virada: true },
  porUmFio: { rotulo: 'por um fio (última vida)', bpm: 0, abafa: true }, vitoria: { rotulo: 'vitória (festa curta)', bpm: 0 }, derrota: { rotulo: 'derrota (em menor, sem tambor)', bpm: -14, menor: true },
  fim: { rotulo: 'fim e recorde (festa)', bpm: 6 }, menu: { rotulo: 'menu e álbum (só o alaúde)', bpm: -12 },
}
const batidas = (mom, rodada) => 100 + 1.5 * Math.max(0, Math.min(14, rodada - 1)) + MOMENTOS[mom].bpm // a música acelera um pouco a cada rodada

/** Agenda UM compasso (o de número n) do momento dado, começando em K.t. `so` = só estas camadas (para medir). */
function compasso(K, mom, n, seg, rodada = 1, so = null) {
  const quer = (camada) => !so || so.includes(camada)
  const b = n % 8, segundaVolta = n % 16 >= 8, menor = !!MOMENTOS[mom].menor
  const mm = (m) => (menor && [11, 4, 6].includes(m % 12) ? m - 1 : m) // menor: si, mi e fá sustenido descem meio tom
  const ac = (meio) => ACORDE[HARMONIA[b * 2 + meio]].map(mm)
  const festa = mom === 'vitoria' || mom === 'fim', calmo = mom === 'construir' || mom === 'porUmFio' || mom === 'menu' || mom === 'derrota'
  if (quer('melodia')) for (const [p, m0, len] of TEMA[b]) {
    const m = mm(m0), em = p * seg, dur = len * seg * 0.92
    if (mom === 'construir') { if (!segundaVolta || b >= 4) K.flauta({ m, dur, vol: 0.3, em }); else if (rodada >= 6) K.flauta({ m: m + 12, dur, vol: 0.13, em }) }
    else if (mom === 'batalha') { K.palheta({ m, dur, vol: 0.5, em }); if (rodada >= 6) K.flauta({ m: m + 12, dur, vol: 0.22, em }) }
    else if (mom === 'chefe') { K.palheta({ m: m - 12, dur, vol: 0.5, em }); if (len >= 2) K.trompa({ m: m - 12, dur, vol: 0.3, em }) }
    else if (mom === 'porUmFio') { if (b % 2 === 0) K.flauta({ m, dur, vol: 0.4, em }) }
    else if (festa) { K.trompa({ m, dur, vol: 0.5, em }); K.flauta({ m: m + 12, dur, vol: 0.25, em }) }
    else if (mom === 'derrota') { if (len >= 2) K.flauta({ m, dur: dur * 1.05, vol: 0.35, em }) }
    else if (mom === 'menu') K.corda({ m, dur: Math.max(dur, 0.4), vol: 1, em })
  }
  if (quer('alaude')) {
    if (calmo) for (let p = 0; p < 8; p++) { // dedilhado: baixo, quinta, oitava, terça
      if (mom === 'derrota' && p % 4) continue
      const a = ac(p < 4 ? 0 : 1), m = [a[0], a[2], a[0] + 12, a[1] + 12][p % 4]
      K.corda({ m, dur: seg * 1.9, vol: mom === 'menu' ? 0.6 : 0.34, em: p * seg })
    } else if (mom !== 'chefe') for (const p of [2, 6, ...(festa ? [3, 7] : [])]) ac(p < 4 ? 0 : 1).forEach((m, i) => K.corda({ m: m + 12, dur: seg * 1.5, vol: 0.28, em: p * seg + i * 0.012 })) // rasgueado no contratempo
  }
  if (quer('baixo') && !calmo) for (let p = 0; p < 8; p++) {
    const a = ac(p < 4 ? 0 : 1)
    if (mom === 'chefe') K.corda({ m: a[0] - 12, dur: seg * 0.95, vol: p % 2 ? 0.3 : 0.45, em: p * seg }) // o baixo martela
    else if (p % 4 === 0) K.corda({ m: a[0] - 12, dur: seg * 2.6, vol: 0.55, em: p * seg })
    else if (p % 4 === 3) K.corda({ m: a[2] - 12, dur: seg * 0.95, vol: 0.4, em: p * seg })
  }
  if (quer('bordao') && calmo) K.cordas({ ms: [43, 50], dur: seg * 8.05, vol: mom === 'derrota' ? 0.1 : 0.07 })
  if (quer('cordas')) {
    if (mom === 'chefe') for (const meio of [0, 1]) K.cordas({ ms: ac(meio).map((m) => m + 12), dur: seg * 4, vol: 0.2, em: meio * 4 * seg, trem: true })
    else if (festa || (mom === 'batalha' && rodada >= 11)) for (const meio of [0, 1]) K.cordas({ ms: ac(meio).map((m) => m + 12), dur: seg * 4, vol: festa ? 0.16 : 0.12, em: meio * 4 * seg })
  }
  if (quer('percussao')) {
    if (mom === 'batalha' || festa) {
      for (const [p, v] of [[0, 0.75], [3, 0.36], [4, 0.68], [6, 0.36], [7, 0.36]]) K.tambor({ f: p % 4 ? 120 : 92, dur: 0.14, vol: v, em: p * seg })
      for (let p = festa ? 0 : 1; p < 8; p += festa ? 1 : 2) K.pandeiro({ vol: 0.13, em: p * seg })
      if (rodada >= 8) for (let p = 0; p < 8; p++) K.pandeiro({ vol: 0.06, em: (p + 0.5) * seg, dur: 0.03 })
    } else if (mom === 'chefe') {
      for (const p of [0, 2, 4, 6]) K.tambor({ f: 62, dur: 0.3, vol: p % 4 ? 0.45 : 0.6, em: p * seg })
      K.tambor({ f: 110, dur: 0.1, vol: 0.3, em: 7 * seg }); K.tambor({ f: 110, dur: 0.1, vol: 0.4, em: 7.5 * seg })
    } else if (mom === 'porUmFio') { for (const p of [0, 4]) { K.tambor({ f: 68, dur: 0.2, vol: 0.6, em: p * seg }); K.tambor({ f: 62, dur: 0.2, vol: 0.4, em: (p + 1) * seg }) } } // coração
    else if (mom === 'construir' && rodada >= 3) for (const p of [2, 6]) K.pandeiro({ vol: 0.05, em: p * seg })
    if (mom === 'fim' && b === 7) [86, 91, 95, 98].forEach((m, i) => K.sino({ f: N(m), dur: 0.4, vol: 0.08, em: (4 + i) * seg }))
  }
}

// ------------------------------------------------------------------ AMBIENTE por trecho da estrada (R35), fabricado por código
// Nunca repete igual (não é um arquivo em volta): um leito de vento + bichos e sons de longe sorteados. Fica BEM baixo (~−40 dBFS médio).
// `ganho` acerta o nível de cada um (medido no teste). Trocar de trecho cruza um no outro em 1,5 s (`Som.ambiente`).
const AMBIENTES = {
  manha: { rotulo: 'manhã nos campos (pássaros)', ganho: 0.24, leito: [650, 0.1], fn(K, r, dur) {
    for (let t = r() * 0.6; t < dur; t += 0.7 + r() * 1.6) {
      if (r() < 0.6) { const f = 3000 + r() * 1200, n = 3 + Math.floor(r() * 3); for (let i = 0; i < n; i++) K.tom({ f: f * (1 + i * 0.03), f2: f * 1.32, dur: 0.05, vol: 0.2 + r() * 0.1, em: t + i * 0.085, ataque: 0.008 }) } // pio em série
      else { const f = 2200 + r() * 500; K.tom({ f, f2: f * 1.22, dur: 0.12, vol: 0.2, em: t, sus: true, ataque: 0.02 }); K.tom({ f: f * 0.9, f2: f * 0.8, dur: 0.18, vol: 0.18, em: t + 0.16, sus: true, ataque: 0.02 }) } // assobio de duas notas
    }
  } },
  tarde: { rotulo: 'tarde na vila (bigorna, galinha)', ganho: 0.36, leito: [520, 0.07], fn(K, r, dur) {
    for (let t = 0.8 + r() * 2; t < dur; t += 3 + r() * 3) for (const em of [0, 0.3]) K.sino({ f: 1650, dur: 0.2, vol: 0.09, em: t + em, parciais: [1, 2.7, 4.9] }) // o ferreiro, longe
    for (let t = 1.5 + r() * 2; t < dur; t += 4 + r() * 4) { const n = 2 + Math.floor(r() * 3); for (let i = 0; i < n; i++) K.tom({ f: 600 + r() * 60, f2: 880, dur: 0.045, tipo: 'triangle', vol: 0.14, em: t + i * 0.12, ataque: 0.006 }); K.tom({ f: 700, f2: 1150, dur: 0.16, tipo: 'triangle', vol: 0.14, em: t + n * 0.12, sus: true, ataque: 0.02 }) } // galinha
    for (let t = 2 + r() * 3; t < dur; t += 3.5 + r() * 3) { const f = 3100 + r() * 900; for (let i = 0; i < 3; i++) K.tom({ f, f2: f * 1.3, dur: 0.05, vol: 0.1, em: t + i * 0.09, ataque: 0.008 }) }
    for (let t = 3 + r() * 5; t < dur; t += 7 + r() * 5) K.tom({ f: 300, f2: 345, dur: 0.28, tipo: 'sawtooth', lp: 900, vol: 0.05, em: t, sus: true, ataque: 0.05 }) // a carroça rangendo
  } },
  porDoSol: { rotulo: 'pôr do sol nos portões (vento, sino longe)', ganho: 0.4, leito: [420, 0.08], fn(K, r, dur) {
    for (let t = 1 + r() * 2; t < dur; t += 6.5 + r() * 3) K.sino({ f: N(67), dur: 1.7, vol: 0.12, em: t, parciais: [1, 2, 2.4, 3] }) // o sino da torre
    for (let t = 2.5 + r() * 2; t < dur; t += 4 + r() * 3) { const n = 2 + Math.floor(r() * 2); for (let i = 0; i < n; i++) K.tom({ f: 520, f2: 440, dur: 0.22, vol: 0.1, em: t + i * 0.34, sus: true, ataque: 0.05, solta: 0.08, vib: 10 }) } // a rola
    for (let t = r() * 3; t < dur; t += 2.5 + r() * 2.5) K.ruido({ dur: 1.6, f: 380, f2: 620, tipo: 'lowpass', vol: 0.09, em: t, ataque: 0.7 }) // rajada de vento
  } },
  noite: { rotulo: 'noite de chefe (grilos, coruja)', ganho: 0.28, leito: [300, 0.09], fn(K, r, dur) {
    let pausa = 3 + r() * 3
    for (let t = r() * 0.3; t < dur; t += 0.42) { if (t > pausa) { t += 0.9 + r() * 1.2; pausa = t + 4 + r() * 4 } for (let i = 0; i < 3; i++) K.tom({ f: 4400, dur: 0.02, vol: 0.14, em: t + i * 0.034, sus: true, ataque: 0.004, solta: 0.005 }) } // grilo perto
    for (let t = 0.2 + r() * 0.4; t < dur; t += 0.61 + r() * 0.05) for (let i = 0; i < 2; i++) K.tom({ f: 5100, dur: 0.018, vol: 0.06, em: t + i * 0.04, sus: true, ataque: 0.004, solta: 0.005 }) // grilo longe
    for (let t = 2 + r() * 3; t < dur; t += 8 + r() * 4) { K.tom({ f: 400, f2: 372, dur: 0.22, vol: 0.14, em: t, sus: true, ataque: 0.04, solta: 0.08 }); K.tom({ f: 395, f2: 350, dur: 0.42, vol: 0.14, em: t + 0.36, sus: true, ataque: 0.05, solta: 0.16 }) } // coruja
  } },
}
const TRECHOS_AMB = ['manha', 'tarde', 'porDoSol', 'noite'] // a ordem de C.trecho() na cena: campos, vila, portões, noite
/** Monta `dur` segundos do ambiente em `destino` a partir de `t` (ao vivo, em pedaços; ou fora do tempo real, para medir). */
function ambientar(c, destino, nome, t, dur, semente = 1) {
  const A = AMBIENTES[nome]; if (!A) return false
  const g = c.createGain(); g.gain.value = A.ganho; g.connect(destino)
  const n = c.createBufferSource(), fl = c.createBiquadFilter(), lg = c.createGain(), borda = Math.min(0.4, dur / 4)
  n.buffer = bufRuido(c.sampleRate); n.loop = true; fl.type = 'lowpass'; fl.frequency.value = A.leito[0]; fl.Q.value = 0.4
  lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(A.leito[1], t + borda); lg.gain.setValueAtTime(A.leito[1], t + dur - borda); lg.gain.linearRampToValueAtTime(0, t + dur) // o leito de um pedaço entra enquanto o do anterior sai
  n.connect(fl); fl.connect(lg); lg.connect(g); n.start(t, (semente * 0.37) % 1.5); n.stop(t + dur + 0.02)
  const r = sorteio(hash(nome) + semente * 7919)
  A.fn(kit(c, g, t, r), r, dur - borda)
  return g
}

// ------------------------------------------------------------------ ao vivo
const S = { ctx: null, no: null, analisador: null, destravado: false, pref: { ...PADRAO }, menos: false, vozes: [], tocados: 0, porNome: {}, ultimo: null, ultimoEm: {}, ultimaVar: {}, recusados: 0, roubados: 0, amostras: {}, historico: [], fundo: null, densidade: 0, soMassa: false, cortados: 0, grupos: {}, golpes: 0, agrupados: 0, golpesEm: [], cortes: 0, ultimoCorte: null, duck: null, amb: null, ambSaindo: null, ambPedido: null, ambN: 0, ambTrocas: 0, ambRelogio: null }
const M = { momento: null, pendente: null, n: 0, total: 0, prox: 0, rodada: 1, tocando: false, relogio: null, trocas: [], linhas: [], pedidoEm: 0 }
const CHAVE = 'reino_som'
try { const p = JSON.parse(globalThis.localStorage?.getItem(CHAVE) || 'null'); if (p) for (const k of Object.keys(PADRAO)) if (typeof p[k] === typeof PADRAO[k]) S.pref[k] = p[k] } catch { /* sem armazenamento: fica o padrão */ }
try { S.menos = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches } catch { /* ok */ }
const guardar = () => { try { globalThis.localStorage?.setItem(CHAVE, JSON.stringify(S.pref)) } catch { /* ok */ } }
const ganhoDe = (qual) => (S.pref[qual] / PADRAO[qual]) ** 2 // no padrão vale 1: os alvos da tabela são medidos assim
const anota = (tipo, nome) => { S.historico.push({ tipo, nome, em: Math.round(performance.now()) }); if (S.historico.length > 200) S.historico.shift() }

const rampa = (p, v, t, d) => { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(v, t + d) }
function aplicarVolumes() {
  if (!S.no) return
  const t = S.ctx.currentTime
  // rampa reta (calculada pelo relógio) e não curva de aproximação: com o nó parado (nenhum som passando) a curva só começava a andar quando o
  // próximo som chegava, e o começo dele vazava no volume antigo (achado pelo teste do R35: efeitos em 0 e o golpe ainda saía por ~60 ms)
  rampa(S.no.saida.gain, S.pref.mudo ? 0 : 1, t, 0.04); rampa(S.no.fx.gain, ganhoDe('efeitos'), t, 0.05); rampa(S.no.musVol.gain, M.tocando ? ganhoDe('musica') : 0, t, 0.25)
}
function ligar() {
  if (S.ctx) return true
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!AC) return false
  try {
    S.ctx = new AC({ latencyHint: 'interactive' }); S.no = cadeia(S.ctx)
    S.analisador = S.ctx.createAnalyser(); S.analisador.fftSize = 2048; S.no.saida.connect(S.analisador)
    S.no.saida.gain.value = S.pref.mudo ? 0 : 1; S.no.fx.gain.value = ganhoDe('efeitos'); S.no.musVol.gain.value = 0
    globalThis.document?.addEventListener('visibilitychange', () => { if (document.hidden) S.ctx.suspend?.(); else if (S.destravado) S.ctx.resume?.() }) // aba escondida: silêncio; voltou: som volta
    carregarAmostras()
    return true
  } catch { S.ctx = null; return false }
}
async function carregarAmostras() {
  try {
    const base = new URL('./sons/', import.meta.url), r = await fetch(new URL('manifesto.json', base)); if (!r.ok) return
    const man = await r.json()
    for (const [nome, lista] of Object.entries(man.efeitos || {})) {
      if (!EFEITOS[nome]) continue
      for (const item of lista) try {
        const a = await fetch(new URL(item.arquivo, base)); if (!a.ok) continue
        const b = await S.ctx.decodeAudioData(await a.arrayBuffer()); let pico = 0
        for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > pico) pico = Math.abs(d[i]) }
        if (pico > 0.001) (S.amostras[nome] ??= []).push({ b, ganho: db2(EFEITOS[nome].alvo) / pico }) // a amostra entra no mesmo alvo de pico do código
      } catch { /* arquivo ruim: fica o código */ }
    }
  } catch { /* sem manifesto: tudo por código */ }
}
function limpar(agora) { S.vozes = S.vozes.filter((v) => v.fim > agora) }
function calar(v, agora) { try { v.no.gain.cancelScheduledValues(agora); v.no.gain.setTargetAtTime(0, agora, 0.008); setTimeout(() => { try { v.saida.disconnect() } catch { /* já saiu */ } }, 80) } catch { /* ok */ } v.fim = 0 }

/** Toca de verdade e devolve a voz (ou null). `opc`: pan (−1..1, entra leve), tom (semitons), forca (0..1,5), em (segundos de espera, no relógio do áudio). */
function tocarVoz(nome, opc = {}) {
  const e = EFEITOS[nome]
  if (!e || !S.destravado || !S.ctx) return null
  const agora = S.ctx.currentTime, relogio = performance.now()
  // `certo` (R43): o tique de uma CONTAGEM que o jogador vê (rodadas do fim, ranking, ouro) tem de soar em todo passo — não cai no
  // "repetido no mesmo instante" (o relógio da tela pode atrasar e juntar dois passos) nem perde a vez para o teto de vozes
  if (!e.certo && relogio - (S.ultimoEm[nome] ?? -1e9) < 35) return null // o mesmo som duas vezes no mesmo instante vira um só
  limpar(agora)
  if (e.max && S.vozes.filter((v) => v.nome === nome).length >= e.max) { S.recusados++; return null }
  if (e.tropa && S.vozes.filter((v) => v.tropa).length >= TETO_TROPA) { S.recusados++; return null }
  // som grande não empilha (R43): no máximo 2 cópias do mesmo som de prioridade 1 ou `grande`; a 3ª corta a mais antiga (7 fanfarras iguais
  // seguidas enchiam o teto inteiro e calavam o que vinha depois)
  if (e.pri === 1 || e.grande) { const iguais = S.vozes.filter((v) => v.nome === nome); if (iguais.length >= 2) { calar(iguais.reduce((a, v) => (v.t0 < a.t0 ? v : a)), agora); S.cortados++; limpar(agora) } }
  if (S.vozes.length >= TETO_VOZES) { // cheio: sai a voz menos importante e mais antiga; se a nova é a menos importante, é ela que não entra
    let vitima = S.vozes.reduce((a, v) => (v.pri > a.pri || (v.pri === a.pri && v.t0 < a.t0) ? v : a))
    if (vitima.pri < e.pri) { if (!e.certo) { S.recusados++; return null } vitima = S.vozes.reduce((a, v) => (v.fim < a.fim ? v : a)) } // som `certo`: sai a voz que está mais perto de acabar
    calar(vitima, agora); S.roubados++; limpar(agora)
  }
  S.ultimoEm[nome] = relogio
  let i = Math.floor(Math.random() * e.vars); if (e.vars > 1 && i === S.ultimaVar[nome]) i = (i + 1) % e.vars // a mesma variação nunca toca duas vezes seguidas
  S.ultimaVar[nome] = i
  // `varia`: som que se repete muito (golpe) nunca sai igual — a altura muda ±N semitons e a força de −2,5 a +1 dB a cada vez
  const tom = (opc.tom || 0) + (e.varia ? (Math.random() * 2 - 1) * e.varia : 0), jeito = e.varia ? 0.75 + Math.random() * 0.37 : 1
  const forca = Math.max(0, Math.min(1.5, (opc.forca ?? 1) * jeito)) * (S.menos && e.grande ? 0.5 : 1), espera = Math.max(0, Math.min(2, opc.em || 0)), t = agora + 0.004 + espera
  const pan = Math.max(-PAN_MAX, Math.min(PAN_MAX, (opc.pan || 0) * PAN_MAX))
  let voz, saida
  S.ultimaForca = forca; S.ultimoTom = tom; S.ultimoPan = pan
  const am = S.amostras[nome]
  /** Uma amostra gravada entra pelo nó dado, na posição estéreo pedida. */
  const amostra = (a, ganho, destino) => {
    const n = S.ctx.createBufferSource(), ga = S.ctx.createGain(); n.buffer = a.b; if (tom) n.playbackRate.value = 2 ** (tom / 12)
    ga.gain.value = ganho; n.connect(ga)
    if (pan && S.ctx.createStereoPanner) { const p = S.ctx.createStereoPanner(); p.pan.value = pan; ga.connect(p); p.connect(destino) } else ga.connect(destino)
    n.start(t); return ga
  }
  try {
    if (am?.length && e.somar) {
      // amostra E receita por código juntas (cada uma 3 dB abaixo): a amostra dá o corpo, o código dá a nota/fanfarra
      voz = S.ctx.createGain(); voz.gain.value = 1; voz.connect(S.no.fx); saida = voz
      amostra(am[i % am.length], am[i % am.length].ganho * forca * 0.708, voz)
      fabricar(S.ctx, voz, nome, t, i, { tom, forca: forca * 0.708, pan })
      S.somados = (S.somados ?? 0) + 1
    } else if (am?.length) {
      voz = S.ctx.createGain(); voz.gain.value = 1; voz.connect(S.no.fx); saida = voz
      amostra(am[i % am.length], am[i % am.length].ganho * forca, voz)
    } else { voz = S.ctx.createGain(); voz.gain.value = 1; voz.connect(S.no.fx); saida = voz; fabricar(S.ctx, voz, nome, t, i, { tom, forca, pan }) }
  } catch { return null }
  // quanto a voz ocupa o teto: a duração de verdade (a da amostra, se for amostra) + a cauda (golpe curto solta a vaga logo: `cauda`)
  const durMs = am?.length ? Math.max(e.somar ? e.ms : 0, am[i % am.length].b.duration * 1000 / 2 ** (tom / 12)) : e.ms
  const v = { nome, pri: e.pri, tropa: !!e.tropa, t0: agora, fim: agora + espera + durMs / 1000 + (e.cauda ?? 0.3), no: voz, saida, n: 1 }
  S.vozes.push(v); setTimeout(() => { try { saida.disconnect() } catch { /* já saiu */ } }, espera * 1000 + durMs + 700)
  if (e.grande) { const dk = DUCK[nome]; abaixar(dk ? dk[0] : 0.5, dk ? dk[1] : Math.max(0.4, e.ms / 1000 * 0.7), espera) } // golpe grande: a música abaixa (6 dB; mais fundo no chefe caindo e no recorde) e volta
  S.tocados++; S.ultimo = nome; S.porNome[nome] = (S.porNome[nome] ?? 0) + 1; anota('som', nome)
  return v
}
/** A música abaixa para `ganho` por `segundos` e volta em ~0,5 s. */
function abaixar(ganho, segundos, espera = 0) {
  if (!S.no) return
  const d = S.no.musDuck.gain, t = S.ctx.currentTime + espera
  d.cancelScheduledValues(t); d.setTargetAtTime(ganho, t, 0.02); d.setTargetAtTime(1, t + segundos, 0.22)
  S.duck = { ganho, segundos, em: Math.round(performance.now()) }
}
// ---- ambiente ao vivo: pedaços de 8 s agendados com folga, cada trecho no seu nó de volume (para cruzar um no outro)
const AMB_PEDACO = 8, AMB_CRUZA = 1.5
function ambienteTique() {
  const a = S.amb; if (!a || !S.ctx || S.ctx.state !== 'running') return
  const c = S.ctx
  if (a.ate < c.currentTime) a.ate = c.currentTime + 0.05
  while (a.ate < c.currentTime + 2) { const g = ambientar(c, a.no, a.nome, a.ate, AMB_PEDACO, ++S.ambN); const fim = (a.ate - c.currentTime + AMB_PEDACO + 2.5) * 1000; setTimeout(() => { try { g.disconnect() } catch { /* já saiu */ } }, fim); a.ate += AMB_PEDACO - 0.4 }
}
function ambienteLigar() {
  if (!S.ctx || !S.no) return
  const c = S.ctx, t = c.currentTime, quer = S.ambPedido
  if ((S.amb?.nome ?? null) === quer) return
  if (S.amb) { const v = S.amb; v.no.gain.cancelScheduledValues(t); v.no.gain.setValueAtTime(v.no.gain.value, t); v.no.gain.linearRampToValueAtTime(0, t + AMB_CRUZA); S.ambSaindo = { nome: v.nome, no: v.no }; setTimeout(() => { try { v.no.disconnect() } catch { /* já saiu */ } if (S.ambSaindo?.no === v.no) S.ambSaindo = null }, AMB_CRUZA * 1000 + 300) }
  S.amb = null; S.ambTrocas++
  if (quer) { const no = c.createGain(); no.gain.setValueAtTime(0, t); no.gain.linearRampToValueAtTime(1, t + AMB_CRUZA); no.connect(S.no.amb); S.amb = { nome: quer, no, ate: t + 0.05 }; S.ambRelogio ??= setInterval(ambienteTique, 500); ambienteTique() }
  anota('ambiente', quer || 'nenhum')
}

const Som = {
  /** Chamar no primeiro toque ou tecla do jogador. Antes disso nada soa e nenhum contexto de áudio existe. */
  destravar() {
    if (!S.destravado) { S.destravado = true; if (!ligar()) return false }
    if (S.ctx?.state === 'suspended' && !globalThis.document?.hidden) S.ctx.resume?.()
    if (M.pendente && !M.tocando) iniciarMusica()
    if (S.ambPedido !== (S.amb?.nome ?? null)) ambienteLigar()
    return !!S.ctx
  },
  /** Toca o som de um acontecimento. Devolve false se não tocou (antes do toque, nome desconhecido, repetido no mesmo instante, teto). */
  tocar(nome, opc = {}) { return !!tocarVoz(nome, opc) },
  /** O GOLPE, chamado no quadro do IMPACTO. `gesto` = número do gesto (js/movimento.js) ou nome do som. `opc.grupo` = o pelotão de quem bate:
   *  golpes do mesmo pelotão (e do mesmo som) em até 60 ms NÃO viram vários sons — o que já está tocando fica mais forte (até +4 dB). */
  golpe(gesto, opc = {}) {
    const nome = typeof gesto === 'number' ? GOLPES[gesto] || 'impacto' : gesto
    if (!EFEITOS[nome] || !S.destravado || !S.ctx) return false
    const relogio = performance.now(), chave = nome + ':' + (opc.grupo ?? ''), g = S.grupos[chave], mesmoSom = S.grupos[nome + ':*']
    S.golpes++; S.golpesEm.push(Math.round(relogio * 10) / 10); if (S.golpesEm.length > 400) S.golpesEm.shift()
    if (S.golpes % 400 === 0) for (const k of Object.keys(S.grupos)) if (relogio - S.grupos[k].em > 1000) delete S.grupos[k] // não guarda voz velha
    // junta: o mesmo pelotão em até 60 ms · o mesmo som em menos de 35 ms · e, com a tela cheia, QUALQUER golpe a menos de 40 ms do anterior (no máximo ~25 golpes novos por segundo: nunca metralhadora)
    const ultimo = S.grupos['*']
    const junta = g && relogio - g.em <= JANELA_GRUPO ? g : mesmoSom && relogio - mesmoSom.em < 35 ? mesmoSom : ultimo && relogio - ultimo.em < 40 ? ultimo : null
    if (junta && junta.v.fim > S.ctx.currentTime) {
      junta.v.n++; S.agrupados++; S.ultimoGolpe = { nome: junta.v.nome, n: junta.v.n }
      try { junta.v.no.gain.setTargetAtTime(Math.min(1.6, 1 + 0.2 * (junta.v.n - 1)), S.ctx.currentTime, 0.004) } catch { /* ok */ }
      return true
    }
    const v = tocarVoz(nome, opc); if (!v) return false
    S.grupos[chave] = S.grupos[nome + ':*'] = S.grupos['*'] = { em: relogio, v }; S.ultimoGolpe = { nome, n: 1 }
    return true
  },
  /** Parada de impacto (hit-stop): o agudo some por `ms` e volta — o ouvido sente o mundo segurar junto com o olho. */
  hitStop(ms = 50) {
    if (!S.no || !S.destravado) return false
    const f = S.no.corte.frequency, t = S.ctx.currentTime, d = Math.max(0.02, Math.min(0.4, ms / 1000))
    f.cancelScheduledValues(t); f.setValueAtTime(f.value, t); f.exponentialRampToValueAtTime(CORTE_FECHADO, t + 0.006); f.setValueAtTime(CORTE_FECHADO, t + d); f.exponentialRampToValueAtTime(CORTE_ABERTO, t + d + 0.07)
    S.cortes++; S.ultimoCorte = { ms: Math.round(d * 1000), em: Math.round(performance.now()) }
    return true
  },
  /** Abaixa a música para `ganho` (0..1) por `segundos` (a faixa de recorde, o chefe caindo). */
  abaixarMusica(ganho = 0.35, segundos = 1.5) { if (!S.no) return false; abaixar(Math.max(0, Math.min(1, ganho)), Math.max(0.1, Math.min(6, segundos))); return true },
  /** O ambiente do trecho: 'manha' | 'tarde' | 'porDoSol' | 'noite' | número do trecho da cena (0..3) | null (nenhum). Cruza do anterior em 1,5 s. */
  ambiente(qual) {
    if (qual === undefined) return S.ambPedido
    const nome = typeof qual === 'number' ? TRECHOS_AMB[qual] ?? null : qual
    if (nome !== null && !AMBIENTES[nome]) return false
    S.ambPedido = nome
    if (S.destravado && S.ctx) ambienteLigar()
    return true
  },
  ambientes: () => Object.entries(AMBIENTES).map(([nome, a]) => ({ nome, rotulo: a.rotulo })),
  /** O barulho de "dezenas" lutando, de 0 (nada) a 1 (cheio): poucos sons bem escolhidos, nunca um por soldado.
   *  `soMassa`: a tela já toca cada golpe no quadro do impacto (Som.golpe) — o fundo fica só com a massa (o choque de longe), sem tinido solto fora de sincronia. */
  fundoBatalha(densidade = 0, { soMassa = false } = {}) {
    S.densidade = Math.max(0, Math.min(1, densidade)); S.soMassa = !!soMassa
    if (!S.densidade) { clearInterval(S.fundo); S.fundo = null; return }
    let passo = 0
    S.fundo ??= setInterval(() => {
      const d = S.densidade, pan = Math.random() * 1.4 - 0.7; passo++
      if (passo % 14 === 0) Som.tocar('choque', { pan: pan / 2, forca: S.soMassa ? 0.3 + d * 0.3 : 0.6 + d * 0.4 })
      else if (S.soMassa) return
      else if (Math.random() < d * 0.55) Som.tocar('espada', { pan, forca: 0.5 + Math.random() * 0.5 })
      else if (Math.random() < d * 0.14) Som.tocar('soldadoCai', { pan, forca: 0.8 })
      else if (Math.random() < d * 0.1) Som.tocar('flecha', { pan, forca: 0.8 })
    }, 100)
  },
  mudo(v) { if (v !== undefined) { S.pref.mudo = !!v; guardar(); aplicarVolumes() } return S.pref.mudo },
  alternarMudo() { return Som.mudo(!S.pref.mudo) },
  /** Volume de 0 a 1 de 'efeitos' ou 'musica' (guardado no aparelho). Sem valor: só lê. */
  volume(qual, v) { if ((qual === 'efeitos' || qual === 'musica') && v !== undefined) { S.pref[qual] = Math.max(0, Math.min(1, Number(v) || 0)); guardar(); aplicarVolumes() } return S.pref[qual] },
  /** "Menos animação": o som continua; só os estouros grandes ficam 6 dB mais baixos. */
  menosAnimacao(v) { if (v !== undefined) S.menos = !!v; return S.menos },
  nomes: () => Object.keys(EFEITOS),
  tabela: () => Object.entries(EFEITOS).map(([nome, e]) => ({ nome, ms: e.ms, pri: e.pri, alvo: e.alvo, camada: e.camada, vars: e.vars, grande: !!e.grande, tropa: !!e.tropa, max: e.max || 0, somar: !!e.somar, varia: e.varia || 0, certo: !!e.certo, duck: DUCK[nome] || null })),
  estado() {
    if (S.ctx) limpar(S.ctx.currentTime)
    return { destravado: S.destravado, ligado: !!S.ctx, contexto: S.ctx?.state ?? null, mudo: S.pref.mudo, efeitos: S.pref.efeitos, musica: S.pref.musica, menos: S.menos, vozes: S.vozes.length, vivos: S.vozes.map((v) => v.nome + ':' + v.pri).join(' '), tropa: S.vozes.filter((v) => v.tropa).length,
      tocados: S.tocados, ultimo: S.ultimo, porNome: { ...S.porNome }, recusados: S.recusados, roubados: S.roubados, cortados: S.cortados, saida: S.no ? S.no.saida.gain.value : null, ultimaForca: S.ultimaForca ?? null, amostras: Object.keys(S.amostras), somados: S.somados ?? 0, historico: S.historico.slice(), atrasoMs: S.ctx ? Math.round(((S.ctx.baseLatency || 0) + 0.004) * 1000) : null,
      golpes: S.golpes, agrupados: S.agrupados, ultimoGolpe: S.ultimoGolpe ?? null, golpesEm: S.golpesEm.slice(), cortes: S.cortes, ultimoCorte: S.ultimoCorte, corteHz: S.no ? S.no.corte.frequency.value : null, duck: S.duck, duckAgora: S.no ? S.no.musDuck.gain.value : null, fxAgora: S.no ? S.no.fx.gain.value : null, ultimoTom: S.ultimoTom ?? null, ultimoPan: S.ultimoPan ?? null,
      ambiente: S.amb?.nome ?? null, ambientePedido: S.ambPedido, ambienteGanho: S.amb ? S.amb.no.gain.value : 0, ambienteSaindo: S.ambSaindo ? { nome: S.ambSaindo.nome, ganho: S.ambSaindo.no.gain.value } : null, ambienteTrocas: S.ambTrocas }
  },
  /** Pico do que está saindo agora (0 a 1), para o medidor da folha e para o teste. */
  picoAoVivo() { if (!S.analisador) return 0; const d = new Float32Array(S.analisador.fftSize); S.analisador.getFloatTimeDomainData(d); let p = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > p) p = Math.abs(d[i]); return p },
  // ---- para medir fora do tempo real (teste e calibragem)
  fabricar, cadeia, ambientar, TETO_VOZES, TETO_TROPA, GOLPES, JANELA_GRUPO, PAN_MAX, TRECHOS_AMB,
  async calibrar() {
    const sr = 48000, db = (x) => 20 * Math.log10(Math.max(x, 1e-9)), o = {}
    for (const [nome, e] of Object.entries(EFEITOS)) {
      o[nome] = []
      for (let i = 0; i < e.vars; i++) {
        const c = new OfflineAudioContext(1, Math.ceil((e.ms / 1000 + 0.6) * sr), sr); fabricar(c, c.destination, nome, 0.05, i, { cru: true })
        const d = (await c.startRendering()).getChannelData(0); let p = 0; for (let k = 0; k < d.length; k++) if (Math.abs(d[k]) > p) p = Math.abs(d[k])
        o[nome].push(Math.round(db(p) * 10) / 10)
      }
    }
    return o
  },
}

function iniciarMusica() {
  if (!S.ctx || M.tocando) return
  M.tocando = true; M.prox = 0; aplicarVolumes()
  M.relogio ??= setInterval(tique, 50)
  tique()
}
function tique() {
  if (!S.ctx || !M.tocando || S.ctx.state !== 'running' || (!M.momento && !M.pendente)) return
  const c = S.ctx
  if (M.prox < c.currentTime + 0.02) M.prox = c.currentTime + 0.08
  while (M.prox < c.currentTime + 0.25) { // marca o próximo compasso inteiro pelo relógio do áudio, com folga
    if (M.pendente && M.pendente !== M.momento) { // a troca de momento acontece aqui: sempre na linha do compasso
      M.trocas.push({ de: M.momento, para: M.pendente, em: M.prox, pedidoEm: M.pedidoEm, compasso: M.total }); if (M.trocas.length > 40) M.trocas.shift()
      M.momento = M.pendente; M.n = 0; anota('musica', M.momento)
      S.no.musFiltro.frequency.setTargetAtTime(MOMENTOS[M.momento].abafa ? 1100 : 18000, M.prox, 0.12)
    }
    M.pendente = null
    const seg = 60 / batidas(M.momento, M.rodada) / 2
    compasso(kit(c, S.no.mus, M.prox, sorteio(M.total + 1)), M.momento, M.n, seg, M.rodada)
    M.linhas.push(M.prox); if (M.linhas.length > 64) M.linhas.shift()
    M.prox += seg * 8; M.n++; M.total++
  }
}
/** Rufar que cresce até a linha do compasso: a resposta na hora enquanto a música espera a virada. */
function virada() {
  if (!S.ctx || !M.tocando || S.pref.mudo) return
  const c = S.ctx, falta = M.prox - c.currentTime
  if (falta < 0.25 || falta > 3) return
  const K = kit(c, S.no.mus, c.currentTime + 0.01, sorteio(5)), n = Math.min(16, Math.floor(falta / 0.085))
  for (let i = 0; i < n; i++) K.tambor({ f: 118, dur: 0.07, vol: 0.12 + 0.4 * (i / n) ** 2, em: falta - 0.01 - (n - i) * 0.085 })
}

const Musica = {
  /** Pede um momento da música. A troca acontece na próxima virada de compasso (até lá, um rufar avisa nos momentos de luta). */
  momento(nome) {
    if (!MOMENTOS[nome]) return false
    M.pendente = nome; M.pedidoEm = S.ctx ? S.ctx.currentTime : 0
    if (S.destravado && S.ctx) { if (!M.tocando) iniciarMusica(); else if (nome !== M.momento && MOMENTOS[nome].virada) virada() }
    return true
  },
  /** Número da rodada (1, 2, 3...): a música acelera um pouco e ganha camadas (6: segunda flauta · 8: pandeiro dobrado · 11: cordas). */
  rodada(n) { if (n !== undefined) M.rodada = Math.max(1, Math.floor(Number(n) || 1)); return M.rodada },
  parar() { M.tocando = false; M.pendente = null; M.momento = null; M.n = 0; if (S.no) aplicarVolumes() },
  momentos: () => Object.entries(MOMENTOS).map(([nome, m]) => ({ nome, rotulo: m.rotulo })),
  estado: () => ({ tocando: M.tocando, momento: M.momento, pendente: M.pendente, compasso: M.total, rodada: M.rodada, bpm: M.momento ? batidas(M.momento, M.rodada) : null, trocas: M.trocas.slice(), linhas: M.linhas.slice(), agora: S.ctx ? S.ctx.currentTime : null }),
  /** Para medir: agenda `compassos` do momento a partir de t. Devolve o tempo de um passo (colcheia). */
  fabricar(c, destino, mom, compassos, t, { rodada = 1, so = null } = {}) {
    const seg = 60 / batidas(mom, rodada) / 2
    for (let n = 0; n < compassos; n++) compasso(kit(c, destino, t + n * seg * 8, sorteio(n + 1)), mom, n, seg, rodada, so)
    return seg
  },
  TEMA, batidas,
}

export { Som, Musica }
