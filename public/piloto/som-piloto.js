// Piloto — SOM próprio, pequeno, fabricado por código (WebAudio). Não usa nenhum arquivo e não toca em public/js/som.js.
// Regras: nada toca antes do primeiro toque do jogador; volume baixo; limitador na saída (sem estouro); botão de mudo guardado.
// API: criarSom() → { tocar(nome), destravar(), mudo(), alternarMudo(), estado() }
const ler = (k, p) => { try { return localStorage.getItem(k) ?? p } catch { return p } }
const gravar = (k, v) => { try { localStorage.setItem(k, v) } catch { /* sem armazenamento */ } }
const NOTA = (semitons) => 220 * 2 ** (semitons / 12) // 0 = lá (A3)

export function criarSom() {
  const S = { ctx: null, saida: null, musica: null, mudo: ler('piloto_mudo', '0') === '1', destravado: false, tocados: 0, ultimo: null, porNome: {}, notasDaMusica: 0, ultimoEm: {} }

  function ligar() {
    if (S.ctx) return true
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return false
    try {
      S.ctx = new AC()
      const lim = S.ctx.createDynamicsCompressor() // limitador: segura os picos quando vários sons caem juntos
      lim.threshold.value = -14; lim.knee.value = 8; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.12
      S.saida = S.ctx.createGain(); S.saida.gain.value = S.mudo ? 0 : 0.5
      S.fx = S.ctx.createGain(); S.fx.gain.value = 0.5
      S.musica = S.ctx.createGain(); S.musica.gain.value = 0.16
      S.fx.connect(S.saida); S.musica.connect(S.saida); S.saida.connect(lim); lim.connect(S.ctx.destination)
      return true
    } catch { S.ctx = null; return false }
  }

  // ---------------------------------------------------------------- tijolos
  /** Uma nota: onda, frequência (com escorregão opcional), ataque curto e queda. */
  function nota({ f, f2 = null, dur = 0.12, tipo = 'triangle', vol = 0.5, em = 0, ataque = 0.005, para = S.fx }) {
    const c = S.ctx, t = c.currentTime + em
    const o = c.createOscillator(), g = c.createGain()
    o.type = tipo
    o.frequency.setValueAtTime(f, t)
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + ataque)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(para)
    o.start(t); o.stop(t + dur + 0.03)
  }
  let bufRuido = null
  /** Um sopro de ruído filtrado (golpe, casca, whoosh). */
  function ruido({ dur = 0.1, f = 1200, f2 = null, q = 1, vol = 0.4, em = 0, tipo = 'bandpass' }) {
    const c = S.ctx, t = c.currentTime + em
    if (!bufRuido) {
      bufRuido = c.createBuffer(1, c.sampleRate, c.sampleRate)
      const d = bufRuido.getChannelData(0)
      let s = 1234567
      for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff) - 1 }
    }
    const n = c.createBufferSource(); n.buffer = bufRuido
    const fl = c.createBiquadFilter(); fl.type = tipo; fl.frequency.setValueAtTime(f, t); fl.Q.value = q
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    n.connect(fl); fl.connect(g); g.connect(S.fx)
    n.start(t, Math.random() * 0.5, dur + 0.05)
  }
  const sino = (semis, em = 0, vol = 0.32, dur = 0.22) => { nota({ f: NOTA(semis), dur, tipo: 'sine', vol, em }); nota({ f: NOTA(semis) * 2, dur: dur * 0.6, tipo: 'sine', vol: vol * 0.3, em }) }

  // ---------------------------------------------------------------- os sons do piloto
  const SONS = {
    botao: () => nota({ f: 660, f2: 880, dur: 0.06, tipo: 'triangle', vol: 0.22 }),
    troca: () => { nota({ f: 392, f2: 587, dur: 0.09, tipo: 'triangle', vol: 0.3 }); ruido({ dur: 0.07, f: 2400, q: 0.8, vol: 0.12 }) },
    vira: () => { nota({ f: 988, dur: 0.05, tipo: 'square', vol: 0.12 }); nota({ f: 1319, dur: 0.07, tipo: 'square', vol: 0.12, em: 0.05 }) },
    pega: () => nota({ f: 520, dur: 0.05, tipo: 'sine', vol: 0.25 }),
    golpe: () => { ruido({ dur: 0.09, f: 900, f2: 300, q: 0.9, vol: 0.4 }); nota({ f: 170, f2: 70, dur: 0.1, tipo: 'sine', vol: 0.45 }) },
    forte: () => { ruido({ dur: 0.12, f: 1400, f2: 400, q: 0.8, vol: 0.42 }); nota({ f: 190, f2: 60, dur: 0.14, tipo: 'sine', vol: 0.5 }); sino(12, 0.03, 0.3, 0.16); sino(19, 0.1, 0.3, 0.24) },
    critico: () => { ruido({ dur: 0.18, f: 2200, f2: 300, q: 0.6, vol: 0.5 }); nota({ f: 140, f2: 45, dur: 0.24, tipo: 'sine', vol: 0.6 }); nota({ f: 1568, f2: 1047, dur: 0.16, tipo: 'square', vol: 0.12, em: 0.02 }) },
    miss: () => ruido({ dur: 0.22, f: 500, f2: 3200, q: 2.5, vol: 0.3 }),
    queda: () => { nota({ f: 330, f2: 82, dur: 0.38, tipo: 'triangle', vol: 0.38 }); ruido({ dur: 0.12, f: 300, q: 0.7, vol: 0.3, em: 0.3 }) },
    laststand: () => { nota({ f: NOTA(-12), dur: 0.5, tipo: 'sawtooth', vol: 0.16 }); sino(3, 0, 0.3, 0.4); sino(10, 0.14, 0.3, 0.5) },
    guard: () => { nota({ f: 523, dur: 0.1, tipo: 'sine', vol: 0.25 }); nota({ f: 784, dur: 0.14, tipo: 'sine', vol: 0.2, em: 0.04 }) },
    cura: () => { sino(12, 0, 0.22, 0.14); sino(16, 0.07, 0.22, 0.14); sino(19, 0.14, 0.22, 0.2) },
    sundown: () => { nota({ f: NOTA(7), dur: 0.5, tipo: 'triangle', vol: 0.26 }); nota({ f: NOTA(3), dur: 0.6, tipo: 'triangle', vol: 0.26, em: 0.28 }); nota({ f: NOTA(-2), dur: 0.9, tipo: 'triangle', vol: 0.26, em: 0.6 }) },
    racao: () => { ruido({ dur: 0.05, f: 3000, q: 1.5, vol: 0.2 }); nota({ f: 740, f2: 520, dur: 0.07, tipo: 'triangle', vol: 0.2 }) },
    marcha: () => { for (let i = 0; i < 3; i++) { nota({ f: NOTA([0, 7, 12][i]), dur: 0.16, tipo: 'square', vol: 0.13, em: i * 0.12 }); ruido({ dur: 0.05, f: 200, q: 0.7, vol: 0.3, em: i * 0.12 }) } },
    rufar: () => { for (let i = 0; i < 6; i++) ruido({ dur: 0.04, f: 260, q: 0.9, vol: 0.12 + i * 0.03, em: i * 0.07 }) },
    carimboV: () => { ruido({ dur: 0.1, f: 260, q: 0.6, vol: 0.6, tipo: 'lowpass' }); nota({ f: 120, f2: 55, dur: 0.14, tipo: 'sine', vol: 0.6 }); sino(12, 0.06, 0.3, 0.14); sino(16, 0.14, 0.3, 0.14); sino(19, 0.22, 0.34, 0.3) },
    carimboD: () => { ruido({ dur: 0.1, f: 220, q: 0.6, vol: 0.6, tipo: 'lowpass' }); nota({ f: 110, f2: 50, dur: 0.16, tipo: 'sine', vol: 0.6 }); nota({ f: NOTA(3), dur: 0.16, tipo: 'triangle', vol: 0.22, em: 0.07 }); nota({ f: NOTA(-1), dur: 0.3, tipo: 'triangle', vol: 0.22, em: 0.2 }) },
    sequencia: () => { for (let i = 0; i < 4; i++) sino([12, 16, 19, 24][i], i * 0.07, 0.26, 0.2) },
    tira: () => { ruido({ dur: 0.3, f: 800, f2: 2600, q: 1.2, vol: 0.18 }); for (let i = 0; i < 4; i++) nota({ f: NOTA([0, 4, 7, 12][i]), dur: 0.14, tipo: 'triangle', vol: 0.24, em: 0.1 + i * 0.09 }) },
    conta: () => nota({ f: 1175, dur: 0.03, tipo: 'square', vol: 0.07 }),
    ovoCai: () => { nota({ f: 220, f2: 110, dur: 0.1, tipo: 'sine', vol: 0.45 }); ruido({ dur: 0.05, f: 700, q: 1, vol: 0.2 }) },
    ovoRacha: () => { for (let i = 0; i < 3; i++) ruido({ dur: 0.035, f: 3200 + i * 500, q: 3, vol: 0.34, em: i * 0.05 }); nota({ f: 880, f2: 1320, dur: 0.08, tipo: 'sine', vol: 0.14, em: 0.12 }) },
    ovoNasce: () => { ruido({ dur: 0.2, f: 2500, f2: 600, q: 0.7, vol: 0.4 }); for (let i = 0; i < 5; i++) sino([7, 12, 16, 19, 24][i], 0.08 + i * 0.08, 0.28, i === 4 ? 0.5 : 0.16) },
    renome: () => { for (let i = 0; i < 5; i++) sino([12, 14, 16, 19, 24][i], i * 0.06, 0.24, i === 4 ? 0.45 : 0.12) },
    titulo: () => { nota({ f: NOTA(7), dur: 0.14, tipo: 'square', vol: 0.12 }); nota({ f: NOTA(12), dur: 0.14, tipo: 'square', vol: 0.12, em: 0.14 }); nota({ f: NOTA(16), dur: 0.4, tipo: 'square', vol: 0.12, em: 0.28 }); sino(28, 0.28, 0.2, 0.5) },
    vitoria: () => { for (let i = 0; i < 4; i++) nota({ f: NOTA([7, 12, 16, 19][i]), dur: i === 3 ? 0.5 : 0.13, tipo: 'triangle', vol: 0.3, em: i * 0.12 }) },
    derrota: () => { for (let i = 0; i < 3; i++) nota({ f: NOTA([7, 3, 0][i]), dur: i === 2 ? 0.5 : 0.18, tipo: 'triangle', vol: 0.26, em: i * 0.18 }) },
    cartao: () => { ruido({ dur: 0.06, f: 4000, q: 2, vol: 0.3 }); sino(24, 0.05, 0.2, 0.2) },
    nao: () => { nota({ f: 196, dur: 0.1, tipo: 'square', vol: 0.12 }); nota({ f: 165, dur: 0.14, tipo: 'square', vol: 0.12, em: 0.1 }) },
  }

  // ---------------------------------------------------------------- musiquinha medieval alegre, em laço curto (flauta + bordão)
  // 8 compassos em ré dórico; graus em semitons a partir do ré (D4). null = pausa.
  const TEMPO = 0.2
  const MELODIA = [0, 2, 3, 5, 7, null, 7, 5, 3, 5, 3, 2, 0, null, -2, 0, 3, 5, 7, 9, 10, null, 9, 7, 5, 3, 2, 3, 0, null, null, null]
  const BAIXO = [0, null, 7, null, 0, null, 7, null, -2, null, 5, null, 0, null, 7, null, 3, null, 10, null, 5, null, 12, null, -2, null, 5, null, 0, null, 7, 0]
  const RE = 293.66
  let passoM = 0, proxima = 0, relogio = null
  function agendarMusica() {
    if (!S.ctx || S.mudo) return
    const c = S.ctx
    if (proxima < c.currentTime) proxima = c.currentTime + 0.05
    while (proxima < c.currentTime + 0.4) {
      const em = proxima - c.currentTime
      const m = MELODIA[passoM % MELODIA.length], b = BAIXO[passoM % BAIXO.length]
      if (m !== null) { nota({ f: RE * 2 ** (m / 12), dur: TEMPO * 0.95, tipo: 'triangle', vol: 0.5, em, ataque: 0.02, para: S.musica }); S.notasDaMusica++ }
      if (b !== null) nota({ f: (RE / 2) * 2 ** (b / 12), dur: TEMPO * 1.6, tipo: 'sine', vol: 0.5, em, ataque: 0.02, para: S.musica })
      if (passoM % 4 === 0) nota({ f: RE / 4, dur: TEMPO * 3.6, tipo: 'sawtooth', vol: 0.1, em, ataque: 0.05, para: S.musica })
      passoM++; proxima += TEMPO
    }
  }

  // ---------------------------------------------------------------- API
  /** Chamado no primeiro toque/tecla do jogador: só a partir daqui pode sair som. */
  function destravar() {
    if (S.destravado) return
    S.destravado = true
    if (!ligar()) return
    S.ctx.resume?.()
    relogio ??= setInterval(agendarMusica, 120)
  }
  function tocar(nome) {
    if (!S.destravado || S.mudo || !SONS[nome] || !ligar()) return false
    const agora = performance.now()
    if (agora - (S.ultimoEm[nome] ?? -1e9) < 45) return false // o mesmo som duas vezes no mesmo instante vira um só
    S.ultimoEm[nome] = agora
    if (S.ctx.state === 'suspended') S.ctx.resume?.()
    try { SONS[nome]() } catch { return false }
    S.tocados++; S.ultimo = nome; S.porNome[nome] = (S.porNome[nome] ?? 0) + 1
    return true
  }
  function alternarMudo() {
    S.mudo = !S.mudo
    gravar('piloto_mudo', S.mudo ? '1' : '0')
    if (S.saida) S.saida.gain.setTargetAtTime(S.mudo ? 0 : 0.5, S.ctx.currentTime, 0.03)
    return S.mudo
  }
  return {
    tocar, destravar, alternarMudo, mudo: () => S.mudo, nomes: () => Object.keys(SONS),
    estado: () => ({ destravado: S.destravado, ligado: !!S.ctx, mudo: S.mudo, tocados: S.tocados, ultimo: S.ultimo, porNome: { ...S.porNome }, musica: S.notasDaMusica, volume: S.saida ? S.saida.gain.value : null }),
  }
}
