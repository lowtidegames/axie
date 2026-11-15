// Frayz — SOM sintetizado por WebAudio (nenhum arquivo de áudio, nenhuma biblioteca). ESQUELETO simples: o passe de acabamento refaz com direção própria.
// API: uma função por evento. Só som aqui: nada de desenho, nada de regra. "Menos animação" NÃO muda o som (só tira o visual).
// O áudio só acorda depois de um toque do jogador (regra dos navegadores); antes disso as chamadas são ignoradas sem erro.
let ctx = null, mestre = null, mudado = false
const VOLUME = 0.22 // baixo por padrão
try { mudado = localStorage.getItem('frayz_mudo') === '1' } catch { /* sem armazenamento */ }
export const registro = [] // só para o teste conferir quais sons foram pedidos

function acordar() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx }
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC(); mestre = ctx.createGain(); mestre.gain.value = mudado ? 0 : VOLUME
    const comp = ctx.createDynamicsCompressor(); mestre.connect(comp); comp.connect(ctx.destination)
  } catch { ctx = null }
  return ctx
}
for (const ev of ['pointerdown', 'keydown']) globalThis.addEventListener?.(ev, acordar, { passive: true })

export const estaMudo = () => mudado
export function mudo(liga) {
  mudado = !!liga
  try { localStorage.setItem('frayz_mudo', mudado ? '1' : '0') } catch { /* ok */ }
  if (mestre) mestre.gain.value = mudado ? 0 : VOLUME
}

/** Um tom: frequência (ou [de, para]), duração, forma, volume, atraso. */
function tom(freq, dur, { tipo = 'sine', vol = 0.5, atraso = 0 } = {}) {
  const c = acordar(); if (!c || mudado) return
  const t0 = c.currentTime + atraso, o = c.createOscillator(), g = c.createGain()
  o.type = tipo
  const [f0, f1] = Array.isArray(freq) ? freq : [freq, freq]
  o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(mestre); o.start(t0); o.stop(t0 + dur + 0.02)
}
/** Ruído curto (rasgo, estouro). */
function ruido(dur, { vol = 0.4, atraso = 0, filtro = 2000 } = {}) {
  const c = acordar(); if (!c || mudado) return
  const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime + atraso
  f.type = 'bandpass'; f.frequency.value = filtro; g.gain.value = vol
  s.buffer = b; s.connect(f); f.connect(g); g.connect(mestre); s.start(t0)
}
const anota = (nome, ...a) => { registro.push([nome, ...a]); if (registro.length > 400) registro.shift() }

export const cartaJogada = () => { anota('cartaJogada'); ruido(0.09, { vol: 0.25, filtro: 3000 }); tom([380, 560], 0.1, { tipo: 'triangle', vol: 0.3 }) }
/** forca: 0..1 (tamanho do golpe). */
export const golpe = (forca = 0.5) => { anota('golpe', forca); tom([180 - forca * 60, 60], 0.14 + forca * 0.1, { tipo: 'square', vol: 0.35 + forca * 0.2 }); ruido(0.08, { vol: 0.3, filtro: 900 }) }
export const critico = () => { anota('critico'); ruido(0.22, { vol: 0.5, filtro: 5000 }); tom([900, 120], 0.3, { tipo: 'sawtooth', vol: 0.4 }); tom(70, 0.35, { tipo: 'sine', vol: 0.6, atraso: 0.05 }) }
export const escudo = () => { anota('escudo'); tom([500, 820], 0.18, { tipo: 'triangle', vol: 0.35 }); tom(1240, 0.2, { tipo: 'sine', vol: 0.2, atraso: 0.06 }) }
export const erroDoVeu = () => { anota('erroDoVeu'); tom([700, 300], 0.28, { tipo: 'sine', vol: 0.3 }); ruido(0.2, { vol: 0.15, filtro: 6000 }) }
export const ultimoFio = () => { anota('ultimoFio'); tom(110, 0.5, { tipo: 'sawtooth', vol: 0.3 }); tom(116, 0.5, { tipo: 'sawtooth', vol: 0.3, atraso: 0.02 }); tom([800, 400], 0.4, { tipo: 'sine', vol: 0.15, atraso: 0.2 }) }
export const queda = () => { anota('queda'); tom([220, 50], 0.5, { tipo: 'triangle', vol: 0.5 }); ruido(0.3, { vol: 0.3, filtro: 400 }) }
export const tesoura = () => { anota('tesoura'); for (let i = 0; i < 3; i++) { ruido(0.07, { vol: 0.35, atraso: i * 0.16, filtro: 7000 }); tom([1800, 900], 0.07, { tipo: 'square', vol: 0.15, atraso: i * 0.16 }) } }
export const vitoria = () => { anota('vitoria'); [523, 659, 784, 1047].forEach((f, i) => tom(f, 0.34, { tipo: 'triangle', vol: 0.4, atraso: i * 0.13 })) }
export const derrota = () => { anota('derrota'); [392, 330, 262, 196].forEach((f, i) => tom(f, 0.4, { tipo: 'triangle', vol: 0.35, atraso: i * 0.18 })) }
/** Abrir uma parte do casulo: tique que cresce com a posição i (0..4); parte rara/lendária ganha festa. */
export function casuloParte(i = 0, raridade = 'comum') {
  anota('casuloParte', i, raridade)
  tom(300 + i * 90, 0.09, { tipo: 'square', vol: 0.25 }); ruido(0.05, { vol: 0.2, filtro: 4000 })
  if (raridade === 'rara' || raridade === 'lendaria') {
    const base = raridade === 'lendaria' ? [659, 880, 1175, 1568] : [587, 784, 988]
    base.forEach((f, k) => tom(f, 0.3, { tipo: 'triangle', vol: 0.4, atraso: 0.1 + k * 0.09 }))
    if (raridade === 'lendaria') ruido(0.35, { vol: 0.3, atraso: 0.1, filtro: 8000 })
  }
}
export const aposentadoria = () => { anota('aposentadoria'); [392, 523, 659].forEach((f, i) => tom(f, 0.5, { tipo: 'sine', vol: 0.35, atraso: i * 0.2 })) }
