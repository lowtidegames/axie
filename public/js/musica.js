// Frayz — MÚSICA: a valsa da caixinha de música amaldiçoada, gerada na hora (WebAudio). Régua: docs/direcao-de-som.md §2.
// Ré menor, 3 por 4, 92 batidas por minuto. O TEMA (ré – fá – lá – sol – mi | fá – ré – dó sustenido – ré) abre toda frase.
// Laço de 8 compassos: Rém · Rém · Solm · Lá7 · Rém · Si bemol · Solm · Lá7. Composição original deste projeto.
// As camadas entram e saem conforme o MOMENTO, sempre na virada do compasso. Este arquivo não conhece regra do jogo:
// só recebe "o momento agora é este". Tudo sai pelo barramento de música do som.js (mesmo limitador, mesmo mudo).
//
// API: tocar(momento) · parar(ms) · momento(nome) · degrau(n) · abaixar(dB, ms) · estado() · momentos()
//      fabricar(momento, compassos, ctxOffline, opcoes) (fora do tempo real, para medir) · TEMA · BPM
import * as Som from './som.js'

export const BPM = 92
export const TEMA = Som.TEMA
const ANTECEDENCIA = 0.1 // s: cada nota é marcada 100 ms antes, pelo relógio do áudio
const PASSOS = 12 // semicolcheias por compasso
const NIVEL = 0.0435 // ganho do barramento: põe a música ~12 dB abaixo dos efeitos (medido em tests/tela/som.e2e.mjs)
const ALVO_RMS_GRAVADA = -31 // dBFS: um arquivo de música gravado é nivelado para o mesmo volume médio da música gerada
const TROCA_GRAVADA = 0.6 // s de esmaecimento entre música gerada e arquivo
const LUTA = ['luta', 'tesouraDescendo', 'tesouraCortando']

const MOMENTOS = {
  entrada: { rotulo: 'Entrada e telas calmas', oQue: 'só a caixinha, tema inteiro, devagar', bpm: 80, caixinha: 'calma' },
  luta: { rotulo: 'Luta', oQue: 'caixinha + baixo pizzicato + tique de máquina de costura bem baixo', bpm: BPM, caixinha: 'valsa', baixo: true, maquina: true },
  tesouraDescendo: { rotulo: 'Tesoura descendo (turnos 6–8)', oQue: 'entra um tique-taque de relógio', bpm: BPM, caixinha: 'valsa', baixo: true, maquina: true, relogio: true },
  tesouraCortando: { rotulo: 'Tesoura cortando (turno 9+)', oQue: 'sobe meio tom e ganha um tremor de cordas', bpm: BPM, caixinha: 'valsa', baixo: true, maquina: true, relogio: true, cordas: true, transpor: 1 },
  ultimoFio: { rotulo: 'Último Fio em campo', oQue: 'a música abafa (filtro) e entra uma batida de coração a 70 por minuto', modificador: true, bpm: BPM },
  costura: { rotulo: 'Costura (casulo)', oQue: 'caixinha sozinha, o tema subindo um degrau a cada parte aberta', bpm: 80, casulo: true },
  vitoria: { rotulo: 'Vitória', oQue: 'tema em ré maior, 2 compassos, com arpejo final', final: true, bpm: BPM },
  derrota: { rotulo: 'Derrota', oQue: 'tema descendo e desacelerando, como caixinha perdendo a corda', final: true, bpm: BPM },
}
/** Os momentos, na ordem da tabela: [{ nome, rotulo, oQue, bpm }]. */
export const momentos = () => Object.entries(MOMENTOS).map(([nome, m]) => ({ nome, rotulo: m.rotulo, oQue: m.oQue, bpm: m.bpm }))

// ------------------------------------------------------------------ a partitura
// Cada compasso: notas "nome:início:duração" em colcheias (0 a 5). `mel` = melodia; `contra` = contracanto.
const ACORDES = ['Dm', 'Dm', 'Gm', 'A7', 'Dm', 'Bb', 'Gm', 'A7']
const FRASES = {
  // A — o tema, e a resposta que sobe uma quarta e cai na dominante
  A: {
    acomp: 'valsa', baixo: 'cadencia',
    mel: ['D5:0:2 F5:2:1 A5:3:1 G5:4:1 E5:5:1', 'F5:0:2 D5:2:1 C#5:3:1 D5:4:2', 'G5:0:2 Bb5:2:1 D6:3:1 C6:4:1 A5:5:1', 'Bb5:0:2 A5:2:1 G5:3:1 E5:4:1 C#5:5:1',
      'D5:0:2 F5:2:1 A5:3:1 D6:4:2', 'D6:0:1 C6:1:1 Bb5:2:2 F5:4:1 G5:5:1', 'A5:0:2 G5:2:1 F5:3:1 E5:4:1 D5:5:1', 'E5:0:3 C#5:3:1 A4:4:2'],
    contra: ['', 'A4:2:1 G4:3:1 F4:4:2', 'Bb4:1:1', 'G4:1:1', 'A4:1:1 F5:5:1', 'D5:3:1', 'Bb4:1:1', 'G4:1:1 A4:2:1 C#5:5:1'],
  },
  // A' — o tema de novo; na segunda metade ele sobe uma oitava
  A2: {
    acomp: 'valsa2', baixo: 'anda',
    mel: ['D5:0:2 F5:2:1 A5:3:1 G5:4:1 E5:5:1', 'F5:0:2 D5:2:1 C#5:3:1 D5:4:1 A5:5:1', 'Bb5:0:3 A5:3:1 G5:4:1 Bb5:5:1', 'A5:0:2 C#6:2:2 E6:4:1 C#6:5:1',
      'D6:0:2 F6:2:1 A6:3:1 G6:4:1 E6:5:1', 'F6:0:2 D6:2:1 Bb5:3:1 D6:4:2', 'G5:0:1 Bb5:1:1 D6:2:2 C6:4:1 Bb5:5:1', 'A5:0:2 G5:2:1 E5:3:1 C#5:4:2'],
    contra: ['A4:1:1', 'A4:1:1', 'G4:1:1 D5:2:1', 'E5:1:1 G5:3:1', 'D5:1:1', 'Bb4:1:1 F5:5:1', 'G5:3:1', 'E5:1:1 A4:5:1'],
  },
  // B — a melodia descansa em notas longas e o tema passa para a voz de dentro
  B: {
    acomp: 'cheia', baixo: 'anda',
    mel: ['A5:0:4 F5:4:2', 'E5:0:1 F5:1:1 D5:2:4', 'Bb5:0:4 G5:4:2', 'A5:0:1 G5:1:1 E5:2:2 C#5:4:2',
      'D5:0:2 A5:2:2 D6:4:2', 'F6:0:3 D6:3:1 Bb5:4:2', 'G5:0:2 Bb5:2:1 A5:3:1 G5:4:1 E5:5:1', 'E5:0:2 C#5:2:1 D5:3:1 E5:4:2'],
    contra: ['D4:0:2 F4:2:1 A4:3:1 G4:4:1 E4:5:1', 'F4:0:2 D4:2:1 C#4:3:1 D4:4:2', 'G4:0:2 Bb4:2:1 D5:3:1 C5:4:1 A4:5:1', 'Bb4:0:2 A4:2:1 G4:3:1 E4:4:2',
      'F4:1:1 A4:3:1 F5:5:1', 'D5:1:1 Bb4:2:1', 'D5:1:1', 'G4:1:1 A4:5:1'],
  },
  // R — respiro: acordes que caem e sobem, quase sem acompanhamento, e a corrida que traz o tema de volta
  R: {
    acomp: 'rala', baixo: 'so1',
    mel: ['D6:0:2 A5:2:2 F5:4:2', '', 'D6:0:2 Bb5:2:2 G5:4:2', '', 'F6:0:2 D6:2:2 A5:4:2', '', 'G5:0:2 Bb5:2:2 D6:4:2', 'C#6:0:2 A5:2:1 G5:3:1 E5:4:1 C#5:5:1'],
    contra: ['', 'D5:2:1 F5:3:1 A5:4:2', '', 'C#5:2:1 E5:3:1 A5:4:2', '', 'D5:2:1 F5:3:1 Bb5:4:2', '', ''],
  },
}
const ORDEM = ['A', 'A2', 'B', 'A2', 'A', 'B', 'A2', 'R'] // 64 compassos (~2 min) antes de repetir; os enfeites mudam a cada volta
const VOZES = { Dm: ['F4', 'A4'], Gm: ['G4', 'Bb4'], A7: ['C#4', 'G4'], Bb: ['D4', 'F4'] } // o "pá-pá" da valsa
const GRAVE = { Dm: 'D4', Gm: 'G3', A7: 'A3', Bb: 'Bb3' } // o pente grave da caixinha (momento calmo)
const BAIXO = { Dm: 'D3', Gm: 'G2', A7: 'A2', Bb: 'Bb2' } // pizzicato no 1º tempo
const ANDA = ['F3', 'A2', 'G#2', 'C#3', 'C3', 'A2', 'Bb2', 'C#3'] // nota de passagem no 3º tempo (o baixo que anda)
const CORDAS = { Dm: ['A4', 'D5'], Gm: ['G4', 'D5'], A7: ['A4', 'E5'], Bb: ['Bb4', 'F5'] }
const CASULO = [[[0, 0], [4, 2], [6, 4], [8, 3], [10, 1]], [[0, 2], [4, 0], [6, 'sensivel'], [8, 0]]] // o tema, em graus da escala
const CAMADA = { cx: 'caixinha', pz: 'baixo', mq: 'maquina', rl: 'relogio', cd: 'cordas' }
/** As camadas da música: [{ nome, rotulo }] (para ouvir uma por vez com `solo`). */
export const camadas = () => [['caixinha', 'Caixinha de música'], ['baixo', 'Baixo pizzicato'], ['maquina', 'Tique da máquina de costura'], ['relogio', 'Tique-taque do relógio'], ['cordas', 'Tremor de cordas'], ['coracao', 'Batida de coração']].map(([nome, rotulo]) => ({ nome, rotulo }))
const ler = (s) => (s.trim() ? s.trim().split(/\s+/).map((x) => { const [n, c, d] = x.split(':'); return { m: Som.midi(n), c: Number(c), d: Number(d) } }) : [])
for (const f of Object.values(FRASES)) { f.mel = f.mel.map(ler); f.contra = f.contra.map(ler) }
const m = Som.midi, hzM = Som.hzDoMidi
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// ------------------------------------------------------------------ timbres feitos por conta (uma vez por contexto)
const PECAS = new WeakMap()
function pecas(ctx) {
  let p = PECAS.get(ctx)
  if (p) return p
  const sr = ctx.sampleRate, r = mulberry(0x636f7374)
  const novo = (dur, canais, fn) => { const n = Math.floor(dur * sr), b = ctx.createBuffer(canais, n, sr); for (let c = 0; c < canais; c++) fn(b.getChannelData(c), n, c); return b }
  /** Estalo que canta em ressonâncias [Hz, queda em ms, peso]: ruído curtíssimo por dentro de ressonadores de dois polos. */
  const estalo = (dur, ress, grave) => novo(dur, 1, (d, n) => {
    const est = ress.map(([f, ms, g]) => { const q = Math.exp(-1000 / (ms * sr)); return { a1: 2 * q * Math.cos(2 * Math.PI * f / sr), a2: -q * q, g, y1: 0, y2: 0 } })
    let pico = 0
    for (let i = 0; i < n; i++) {
      const t = i / sr, x = i < sr * 0.0025 ? (r() * 2 - 1) * (1 - i / (sr * 0.0025)) : 0
      let y = 0
      for (const e of est) { const v = x + e.a1 * e.y1 + e.a2 * e.y2; e.y2 = e.y1; e.y1 = v; y += v * e.g }
      if (grave) y += Math.sin(2 * Math.PI * grave * t) * Math.exp(-t / 0.007) * 0.5 * Math.min(1, t / 0.002)
      d[i] = y * Math.min(1, t / 0.002) * Math.min(1, (dur - t) / 0.012); pico = Math.max(pico, Math.abs(d[i]))
    }
    for (let i = 0; i < n; i++) d[i] /= pico || 1
  })
  /** "Tum-tum" do coração: dois baques graves, o segundo mais fraco. */
  const coracao = novo(0.42, 1, (d, n) => {
    for (const [t0, f0, f1, amp] of [[0, 95, 58, 1], [0.17, 108, 66, 0.62]]) {
      let fase = 0
      for (let i = Math.floor(t0 * sr); i < n; i++) {
        const t = i / sr - t0, f = f1 + (f0 - f1) * Math.exp(-t / 0.05)
        fase += 2 * Math.PI * f / sr
        if (t >= 0.24) break
        const env = Math.min(1, t / 0.008) * Math.exp(-t / 0.05) * Math.min(1, (0.24 - t) / 0.03)
        d[i] += (Math.sin(fase) + 0.45 * Math.sin(2 * fase) + 0.18 * Math.sin(3 * fase)) * env * amp
      }
    }
  })
  /** Eco curto de sala pequena: poucas reflexões cedo e uma cauda de 0,3 s que escurece. A força total é 1 (o envio decide o quanto). */
  const sala = novo(0.34, 2, (d, n, c) => {
    const cauda = new Float32Array(n)
    let y = 0, ec = 0, er = 0
    for (let i = Math.floor(0.018 * sr); i < n; i++) {
      const t = i / sr
      y += ((r() * 2 - 1) - y) * (0.5 - 0.3 * Math.min(1, t / 0.3))
      cauda[i] = y * Math.exp(-(t - 0.018) / 0.065) * Math.min(1, (0.34 - t) / 0.03); ec += cauda[i] * cauda[i]
    }
    const reflexoes = [[7.1, 0.55], [11.3, -0.46], [17.9, 0.4], [23.7, -0.33], [31.1, 0.27], [41.3, -0.2]]
    for (const [, g] of reflexoes) er += g * g
    for (const [ms, g] of reflexoes) d[Math.floor((ms + c * 1.9) / 1000 * sr)] += g * Math.sqrt(0.6 / er) // 60% da força nas reflexões…
    for (let i = 0; i < n; i++) d[i] += cauda[i] * Math.sqrt(0.4 / ec) // …e 40% na cauda, em qualquer taxa de amostragem
  })
  p = {
    maquinaA: estalo(0.045, [[3300, 1.6, 1], [5200, 1, 0.5]], 170), maquinaB: estalo(0.045, [[2600, 1.6, 1], [4400, 1, 0.5]], 150),
    tique: estalo(0.09, [[1950, 6, 1], [4100, 3, 0.45], [760, 5, 0.3]]), taque: estalo(0.09, [[1450, 6, 1], [3300, 3, 0.4], [610, 5, 0.35]]),
    coracao, sala,
  }
  PECAS.set(ctx, p)
  return p
}
const limpaAoFim = (fonte, nos) => { fonte.onended = () => { for (const n of nos) { try { n.disconnect() } catch { /* já saiu */ } } } }
function amostra(ctx, destino, buffer, t, vel) {
  const s = ctx.createBufferSource(), g = ctx.createGain()
  s.buffer = buffer; g.gain.value = vel; s.connect(g); g.connect(destino); s.start(t); limpaAoFim(s, [s, g])
}
/** Baixo pizzicato: a corda beliscada (brilho que some rápido) com um fundo de triângulo. */
function pizzicato(ctx, destino, f, t, vel) {
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), g2 = ctx.createGain()
  o1.type = 'triangle'; o2.type = 'sawtooth'; lp.type = 'lowpass'; lp.Q.value = 1.2; g2.gain.value = 0.45
  for (const o of [o1, o2]) { o.frequency.setValueAtTime(f * 1.014, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.045) }
  lp.frequency.setValueAtTime(Math.min(f * 9, 4200), t); lp.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.1)
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.004); g.gain.exponentialRampToValueAtTime(vel * 0.001, t + 0.52); g.gain.linearRampToValueAtTime(0, t + 0.535)
  o1.connect(g); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(destino)
  for (const o of [o1, o2]) { o.start(t); o.stop(t + 0.55) }
  limpaAoFim(o1, [o1, o2, lp, g, g2])
}
/** Tremor de cordas: o acorde sustentado, tremendo a 12,5 por segundo (um compasso). */
function tremorDeCordas(ctx, destino, freqs, t, dur, vel) {
  const g = ctx.createGain(), lp = ctx.createBiquadFilter(), trem = ctx.createGain(), lfo = ctx.createOscillator(), prof = ctx.createGain()
  lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = 0.7; trem.gain.value = 0.58; prof.gain.value = 0.42; lfo.frequency.value = 12.5
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.14); g.gain.setValueAtTime(vel, t + dur - 0.05); g.gain.linearRampToValueAtTime(0, t + dur + 0.14)
  lfo.connect(prof); prof.connect(trem.gain); g.connect(lp); lp.connect(trem); trem.connect(destino)
  const nos = [g, lp, trem, lfo, prof]
  for (const f of freqs) for (const desafina of [1, 1.006]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * desafina; o.connect(g); o.start(t); o.stop(t + dur + 0.16); nos.push(o) }
  lfo.start(t); lfo.stop(t + dur + 0.16)
  limpaAoFim(lfo, nos)
}

// ------------------------------------------------------------------ o gerador (igual ao vivo e fora do tempo real)
class Gerador {
  constructor(ctx, cad, o = {}) {
    this.ctx = ctx; this.cad = cad; this.pc = pecas(ctx)
    this.rnd = mulberry(o.semente ?? ((Math.random() * 2 ** 31) | 0))
    this.t = o.t0 ?? ctx.currentTime + 0.08
    this.base = o.momento ?? 'entrada'; this.abafado = false; this.pend = null; this.final = null
    this.calado = false; this.mudo = false
    this.p = 0; this.cf = 0; this.compassos = 0; this.batidas = 0
    this.degrau = 0; this.degrauAtual = 0; this.tCor = null; this.tr = 0; this.dp = 60 / MOMENTOS[this.base].bpm / 4
    this.eventos = null; this.aoFinal = o.aoFinal; this.aoVirar = o.aoVirar
    const g = (v) => { const n = ctx.createGain(); n.gain.value = v; return n }
    this.mix = g(NIVEL); this.caixa = g(1); this.corda = g(1); this.seco = g(1); this.envio = g(0.22); this.envio2 = g(0.1); this.direto = g(NIVEL)
    this.sala = ctx.createConvolver(); this.sala.normalize = false; this.sala.buffer = this.pc.sala
    this.caixa.connect(this.mix); this.corda.connect(this.mix); this.seco.connect(this.mix)
    this.caixa.connect(this.envio); this.corda.connect(this.envio2); this.envio.connect(this.sala); this.envio2.connect(this.sala); this.sala.connect(this.mix)
    this.mix.connect(cad.musica); this.direto.connect(cad.musicaDireta)
    if (o.abafado) { this.abafado = true; cad.abafa.frequency.setValueAtTime(650, 0) }
  }
  destruir() { for (const n of [this.mix, this.caixa, this.corda, this.seco, this.envio, this.envio2, this.sala, this.direto]) { try { n.disconnect() } catch { /* já saiu */ } } }

  /** Pede um momento: vale a partir da próxima virada de compasso. */
  pedir(nome) {
    const p = this.pend ?? { base: this.base, abafado: this.abafado, final: null }
    if (nome === 'ultimoFio') { p.abafado = true; p.final = null; if (!LUTA.includes(p.base)) p.base = 'luta' } // abafa a camada de luta que estiver tocando
    else if (MOMENTOS[nome].final) p.final = nome
    else { p.base = nome; p.abafado = false; p.final = null }
    this.pend = p
  }

  /** Virada do compasso: é aqui (e só aqui) que as camadas trocam. */
  virar(t) {
    const antes = this.base
    this.compassos++ // compassos começados: muda junto com a troca de camada
    if (this.pend) {
      const p = this.pend; this.pend = null
      const recomeca = !!this.final || (p.base !== this.base && (p.base === 'costura' || this.base === 'costura'))
      this.base = p.base
      if (p.final) { this.final = p.final; p.abafado = false } else { this.final = null; if (recomeca) this.cf = 0 }
      if (p.abafado !== this.abafado) {
        this.abafado = p.abafado
        const f = this.cad.abafa.frequency
        f.setValueAtTime(this.abafado ? 20000 : 650, t); f.exponentialRampToValueAtTime(this.abafado ? 650 : 20000, t + (this.abafado ? 0.5 : 0.3))
      }
      if (p.final) this.aoFinal?.(p.final, t)
    }
    const M = MOMENTOS[this.base]
    this.tr = M.transpor ?? 0; this.dp = 60 / M.bpm / 4
    if (this.abafado && this.tCor === null) this.tCor = t
    if (!this.abafado) this.tCor = null
    this.aoVirar?.(this, t, antes)
    this.eventos = this.final || this.calado || M.casulo ? null : this.compor(M)
  }

  /** Escreve o compasso atual: melodia, contracanto, valsa, baixo, máquina, relógio e cordas, conforme as camadas. */
  compor(M) {
    const ev = Array.from({ length: PASSOS }, () => []), rnd = this.rnd, tr = this.tr
    const b = this.cf % 8, fr = FRASES[ORDEM[Math.floor(this.cf / 8) % ORDEM.length]], ac = ACORDES[b]
    const poe = (c, e) => ev[Math.min(PASSOS - 1, Math.round(c * 2))].push(e)
    const arco = 0.84 + 0.16 * Math.sin(Math.PI * (b + 0.5) / 8) // a frase cresce até o meio e descansa
    if (M.caixinha) {
      for (const n of fr.mel[b]) {
        const forte = n.c === 0 ? 1 : n.c % 2 === 0 ? 0.9 : 0.8, vel = arco * forte * (0.94 + 0.12 * rnd())
        const enfeite = b >= 2 && n.d >= 2 && rnd() < 0.1 // o tema (2 primeiros compassos da frase) nunca leva enfeite
        if (enfeite) poe(n.c, { k: 'cx', f: hzM(n.m + tr - 1), vel: vel * 0.4, queda: 0.25 }) // apojatura: meio tom abaixo
        poe(n.c, { k: 'cx', f: hzM(n.m + tr), vel, queda: 0.9, atraso: enfeite ? 0.05 : 0 })
        if (n.d >= 2 && rnd() < 0.08) poe(n.c, { k: 'cx', f: hzM(n.m + tr + 12), vel: vel * 0.22, queda: 0.6, simples: true })
      }
      for (const n of fr.contra[b]) poe(n.c, { k: 'cx', f: hzM(n.m + tr), vel: 0.5 * (0.92 + 0.16 * rnd()), queda: 0.8, simples: true })
      const [x, y] = VOZES[ac].map((n) => hzM(m(n) + tr)), pa = (c, f, v) => poe(c, { k: 'cx', f, vel: v * (0.9 + 0.2 * rnd()), queda: 0.7, simples: true })
      if (M.caixinha === 'calma') { // sozinha: ela mesma faz o grave e o pá-pá
        poe(0, { k: 'cx', f: hzM(m(GRAVE[ac]) + tr), vel: 0.5, queda: 0.9, simples: true })
        if (fr.acomp !== 'rala') { pa(2, x, 0.28); pa(4, y, 0.28) }
      } else if (fr.acomp === 'valsa') { pa(2, x, 0.3); pa(2, y, 0.3); pa(4, y, 0.27) }
      else if (fr.acomp === 'valsa2') { pa(2, x, 0.3); pa(4, x, 0.27); pa(4, y, 0.27) }
      else if (fr.acomp === 'cheia') { pa(2, x, 0.3); pa(2, y, 0.3); pa(4, x, 0.27); pa(4, y, 0.27) }
      else pa(4, y, 0.24)
    }
    if (M.baixo) {
      poe(0, { k: 'pz', f: hzM(m(BAIXO[ac]) + tr), vel: 0.85 })
      if (fr.baixo === 'anda' || (fr.baixo === 'cadencia' && (b === 3 || b === 7))) poe(4, { k: 'pz', f: hzM(m(ANDA[b]) + tr), vel: 0.62 })
    }
    if (M.maquina) for (let s = 0; s < PASSOS; s++) ev[s].push({ k: 'mq', b: s % 2 ? this.pc.maquinaB : this.pc.maquinaA, vel: (s % 4 === 0 ? 0.13 : s % 2 === 0 ? 0.08 : 0.055) * (0.9 + 0.2 * rnd()) })
    if (M.relogio) for (const s of [0, 4, 8]) { ev[s].push({ k: 'rl', b: this.batidas % 2 ? this.pc.taque : this.pc.tique, vel: this.batidas % 2 ? 0.3 : 0.36 }); this.batidas++ }
    if (M.cordas) ev[0].push({ k: 'cd', fs: CORDAS[ac].map((n) => hzM(m(n) + tr)), vel: 0.075 + 0.02 * (b % 4) })
    return ev
  }

  soar(e, t) {
    const ctx = this.ctx, quando = t + (e.atraso ?? 0) + (this.rnd() - 0.5) * 0.004
    if (this.so && !this.so.has(CAMADA[e.k])) return // ouvir uma camada sozinha (folha de sons)
    if (e.k === 'cx') Som.caixinha(ctx, this.caixa, e.f, quando, { vel: e.vel, queda: e.queda, simples: e.simples, cents: (this.rnd() * 2 - 1) * 6 })
    else if (e.k === 'pz') pizzicato(ctx, this.corda, e.f, quando, e.vel)
    else if (e.k === 'mq' || e.k === 'rl') amostra(ctx, this.seco, e.b, quando, e.vel)
    else if (e.k === 'cd') tremorDeCordas(ctx, this.corda, e.fs, t, this.dp * PASSOS, e.vel)
  }

  /** Um passo (uma semicolcheia): marca no relógio do áudio tudo o que cai nele e avança. */
  passo() {
    const t = this.t
    if (this.p === 0) this.virar(t)
    const M = MOMENTOS[this.base], som = !this.final && !this.calado && !this.mudo
    if (M.casulo && this.p % 4 === 0) this.degrauAtual = this.degrau
    if (som && this.eventos) for (const e of this.eventos[this.p]) this.soar(e, t)
    if (som && M.casulo) { // o tema, um degrau acima a cada parte aberta do casulo
      const d = this.degrauAtual, par = this.cf % 2
      for (const [s, g] of CASULO[par]) {
        if (s !== this.p) continue
        const semi = g === 'sensivel' ? Som.grau(d) - 1 : Som.grau(d + g)
        this.soar({ k: 'cx', f: hzM(74 + semi), vel: s === 0 ? 0.95 : 0.8, queda: 0.9 }, t)
      }
      if (this.p === 0) this.soar({ k: 'cx', f: hzM(62 + Som.grau(d + (par ? 4 : 0)) - (par ? 12 : 0)), vel: 0.45, queda: 0.9, simples: true }, t)
    }
    if (this.abafado && !this.final && this.tCor !== null) {
      while (this.tCor < t + this.dp) { if (this.tCor >= t - 1e-4 && !this.mudo && (!this.so || this.so.has('coracao'))) amostra(this.ctx, this.direto, this.pc.coracao, this.tCor, 0.75); this.tCor += 60 / 70 }
    }
    this.t += this.dp
    if (++this.p === PASSOS) { this.p = 0; this.cf++ }
  }
}

// ------------------------------------------------------------------ ao vivo
const E = { ger: null, relogio: null, querTocar: null, gravada: null, parando: null, so: null }
function ciclo() {
  const ctx = Som.contexto(), g = E.ger
  if (!g || !ctx || ctx.state !== 'running') return
  const agora = ctx.currentTime
  g.mudo = Som.estaMudo() || Som.volumes().musica <= 0
  if (g.t < agora - 0.3) g.t = agora + 0.06 // voltou de uma pausa: retoma do ponto em que parou, sem correr atrás
  while (g.t < agora + ANTECEDENCIA) g.passo()
}
function soltarGravada(t, ms = TROCA_GRAVADA) {
  const a = E.gravada; if (!a) return
  E.gravada = null
  a.g.gain.setValueAtTime(a.nivel, t); a.g.gain.linearRampToValueAtTime(0, t + ms)
  try { a.s.stop(t + ms + 0.05) } catch { /* já parou */ }
  setTimeout(() => { try { a.s.disconnect(); a.g.disconnect() } catch { /* já saiu */ } }, (t - Som.contexto().currentTime + ms) * 1000 + 200)
}
/** Na virada: se o manifesto trouxe um arquivo gravado para o momento, troca com esmaecimento de 600 ms. */
function trocarGravada(g, t) {
  const ctx = g.ctx, a = g.final ? null : Som.musicaGravada(g.base)
  if ((E.gravada?.a ?? null) === a) return
  if (E.gravada) soltarGravada(t)
  g.calado = !!a
  const mix = g.mix.gain
  mix.setValueAtTime(a ? NIVEL : 0, t); mix.linearRampToValueAtTime(a ? 0 : NIVEL, t + TROCA_GRAVADA)
  if (!a) return
  const s = ctx.createBufferSource(), ganho = ctx.createGain()
  const nivel = Math.min(10 ** ((ALVO_RMS_GRAVADA + (a.ganhoDb || 0)) / 20) / (a.rms || 1), 10 ** (-18 / 20) / (a.pico || 1))
  s.buffer = a.buffer; s.loop = true; ganho.gain.setValueAtTime(0, t); ganho.gain.linearRampToValueAtTime(nivel, t + TROCA_GRAVADA)
  s.connect(ganho); ganho.connect(g.cad.musica); s.start(t)
  E.gravada = { a, s, g: ganho, nivel }
}
function comecar(nome) {
  const ctx = Som.contexto()
  if (!ctx) return false
  clearTimeout(E.parando); E.parando = null
  if (E.ger) E.ger.destruir()
  const cad = Som.cadeia(ctx)
  cad.abafa.frequency.cancelScheduledValues(0); cad.abafa.frequency.setValueAtTime(20000, ctx.currentTime)
  E.ger = new Gerador(ctx, cad, {
    momento: MOMENTOS[nome]?.modificador || MOMENTOS[nome]?.final ? 'luta' : nome,
    aoFinal: (qual, t) => { Som.afinar(0); Som.tocar(qual, { quando: t }) },
    aoVirar: (g, t) => { Som.afinar(g.tr); trocarGravada(g, t) },
  })
  if (MOMENTOS[nome]?.modificador || MOMENTOS[nome]?.final) E.ger.pedir(nome)
  E.ger.so = E.so
  E.ger.mix.gain.setValueAtTime(0, ctx.currentTime); E.ger.mix.gain.linearRampToValueAtTime(NIVEL, ctx.currentTime + 0.25)
  E.querTocar = null
  if (!E.relogio) E.relogio = setInterval(ciclo, 25)
  ciclo()
  return true
}
/** Começa a música no momento dado. Antes do primeiro toque do jogador só anota o pedido: começa sozinha no toque. */
export function tocar(nome = 'entrada') {
  if (!MOMENTOS[nome]) throw new Error(`momento desconhecido: ${nome}`)
  if (E.ger && !E.parando) { momento(nome); return true }
  if (!Som.iniciar() || !comecar(nome)) { E.querTocar = nome; return false }
  return true
}
/** Troca de momento na próxima virada de compasso. 'ultimoFio' abafa a camada de luta que estiver tocando. */
export function momento(nome) {
  if (nome === undefined) return estado().momento
  if (!MOMENTOS[nome]) throw new Error(`momento desconhecido: ${nome}`)
  if (!E.ger || E.parando) { tocar(nome); return nome }
  E.ger.pedir(nome)
  return nome
}
/** Costura: o tema sobe um degrau da escala a cada parte aberta (vale a partir do próximo tempo). */
export function degrau(n) { if (E.ger && Number.isFinite(n)) E.ger.degrau = Math.max(0, Math.min(14, Math.round(n))); return E.ger?.degrau ?? 0 }
/** Folha de sons: ouvir só algumas camadas (ex.: solo(['baixo'])); solo(null) volta a tocar todas. */
export function solo(lista) { E.so = lista && lista.length ? new Set(lista) : null; if (E.ger) E.ger.so = E.so; return E.so ? [...E.so] : null }
/** Para a música com um esmaecimento. */
export function parar(ms = 600) {
  E.querTocar = null
  const g = E.ger, ctx = Som.contexto()
  if (!g || !ctx || E.parando) return
  const t = ctx.currentTime
  g.mix.gain.cancelScheduledValues(t); g.mix.gain.setValueAtTime(g.mix.gain.value, t); g.mix.gain.linearRampToValueAtTime(0, t + ms / 1000)
  g.direto.gain.setValueAtTime(NIVEL, t); g.direto.gain.linearRampToValueAtTime(0, t + ms / 1000)
  g.final = g.final ?? 'parado'
  soltarGravada(t, ms / 1000)
  E.parando = setTimeout(() => { g.destruir(); if (E.ger === g) E.ger = null; E.parando = null; clearInterval(E.relogio); E.relogio = null; Som.afinar(0) }, ms + 950)
}
/** A música abaixa `dB` por `ms` para um golpe grande aparecer (o som.js avisa sozinho no crítico, na queda e na Tesoura). */
export function abaixar(dB = 6, ms = 400) {
  const ctx = Som.contexto(); if (!ctx) return
  const p = Som.cadeia(ctx).duck.gain, t = ctx.currentTime
  p.cancelScheduledValues(t); p.setValueAtTime(p.value, t)
  p.linearRampToValueAtTime(10 ** (-dB / 20), t + 0.03); p.setValueAtTime(10 ** (-dB / 20), t + Math.max(0.04, ms / 1000)); p.linearRampToValueAtTime(1, t + ms / 1000 + 0.18)
}
export function estado() {
  const g = E.ger
  return {
    tocando: !!g && !g.final && !E.parando, espera: E.querTocar,
    momento: g ? (g.final ?? (g.abafado ? 'ultimoFio' : g.base)) : null, camada: g?.base ?? null, abafado: !!g?.abafado,
    pendente: g?.pend ? (g.pend.final ?? (g.pend.abafado ? 'ultimoFio' : g.pend.base)) : null,
    compasso: g ? (g.cf % 8) + 1 : 0, frase: g ? ORDEM[Math.floor(g.cf / 8) % ORDEM.length] : null, compassos: g?.compassos ?? 0,
    bpm: g ? MOMENTOS[g.base].bpm : BPM, degrau: g?.degrau ?? 0, gravada: !!E.gravada, tom: g?.tr ?? 0,
  }
}
if (typeof window !== 'undefined') {
  const acordar = () => { if (E.querTocar && Som.iniciar()) comecar(E.querTocar) }
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) window.addEventListener(ev, acordar, { passive: true })
  Som.aoTocar((a) => {
    if (a.grande) abaixar(6, 400)
    if ((a.nome === 'vitoria' || a.nome === 'derrota') && E.ger && !E.ger.final) { // o fim tocou direto: a música sai da frente já
      const ctx = Som.contexto(), t = ctx.currentTime, g = E.ger
      g.pend = null; g.final = a.nome
      g.mix.gain.cancelScheduledValues(t); g.mix.gain.setValueAtTime(g.mix.gain.value, t); g.mix.gain.linearRampToValueAtTime(0, t + 0.15); g.mix.gain.setValueAtTime(NIVEL, t + 1)
      soltarGravada(t, 0.15); Som.afinar(0)
    }
  })
}

// ------------------------------------------------------------------ fora do tempo real (medir e desenhar)
/**
 * Marca `compassos` compassos de um momento num OfflineAudioContext, pela mesma cadeia final.
 * 'ultimoFio' = a luta abafada com o coração; 'costura' sobe um degrau a cada 2 compassos; 'vitoria' e 'derrota' = 2 compassos
 * de luta e o fim na virada. Devolve { inicio, bpm, colcheia, tom, duracao, tema: [{ t, hz }] } (onde o tema cai nos 2 primeiros compassos).
 */
export function fabricar(nome, compassos = 16, ctxOffline, opcoes = {}) {
  const M = MOMENTOS[nome]
  if (!M) throw new Error(`momento desconhecido: ${nome}`)
  const cad = Som.cadeia(ctxOffline), t0 = opcoes.quando ?? 0.5
  const g = new Gerador(ctxOffline, cad, {
    semente: opcoes.semente ?? 20261115, t0, momento: M.modificador || M.final ? 'luta' : nome, abafado: !!M.modificador,
    aoFinal: (qual, t) => Som.fabricar(qual, 0, ctxOffline, { quando: t }),
  })
  if (M.modificador) g.tCor = t0
  if (opcoes.so) g.so = new Set(opcoes.so)
  for (let c = 0; c < compassos; c++) {
    if (M.casulo && opcoes.sobe !== false) g.degrau = Math.min(7, Math.floor(c / 2))
    if (M.final && c === 2) g.pedir(nome)
    for (let s = 0; s < PASSOS; s++) g.passo()
  }
  const bpm = M.final || M.modificador ? BPM : M.bpm, colcheia = 60 / bpm / 2, tom = M.transpor ?? 0
  return {
    inicio: t0, bpm, colcheia, tom, duracao: g.t - t0,
    tema: TEMA.map(([n, c]) => ({ t: t0 + c * colcheia, hz: Som.hz(n + '5') * 2 ** (tom / 12) })),
  }
}
