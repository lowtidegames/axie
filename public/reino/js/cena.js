// Keepmile — A CENA: o reino desenhado no canvas (planos com paralaxe, terrenos, prédios, bonecos em lote, efeitos, números de dano).
// Não conhece regra: recebe o que mostrar. Régua: docs/reino/arte.md (câmera, hora do dia, peso do golpe, limites de partícula/tremida/flash).
// R21 — MOVIMENTO: cada boneco tem pose por código em cima do quadro do atlas (movimento.js: antecipa → bote → volta, apanhou, passo com
// pulinho, tombo, estouro, queda do chefe em etapas), fumaça de queda e efeitos em pixel (particulas.js) e a estrada em 4 trechos
// (cenario.js). Tudo por TEMPO (ms) e em pixel inteiro de arte.
import * as Arte from './arte.js'
import * as Mov from './movimento.js'
import * as Px from './particulas.js'
import { criarCenario, TRECHOS } from './cenario.js'

const MAXU = 320, MAXP = 96, MAXE = 28, MAXN = 8, MAXPROJ = 16
// HORDA LEGÍVEL (docs/reino/arte.md, "multidão embolada"): do mesmo tipo de invasor, na mesma região da estrada, aparecem no máximo
// MAX_TIPO; o resto vira "pelotão" com a etiqueta "x56".
const NREG = 8, NTIPO = 32, MAXREP = 8 // R25: cada pelotão é desenhado com poucos REPRESENTANTES grandes (C.repMax); a plaqueta diz o número real
// COR DE LADO (de relance: quem é quem). R21: o boneco fica só com o contorno ESCURO dele; a cor de lado vai para a marca no chão,
// debaixo do pé (azul-claro do reino × lima do invasor), para a barrinha e para a etiqueta do pelotão. Nada de contorno amarelo.
export const CONTORNO = { aliado: '#9CCBFF', invasor: '#C8F45A' }
const TOM_FILEIRA = [null, '#E2DCEC', '#C4BCD6'] // frente, meio, fundo: cada fileira um tom abaixo
const ANIMS = ['idle', 'walk', 'attack', 'hit', 'fall']
export const AN = { idle: 0, walk: 1, attack: 2, hit: 3, fall: 4 }
/** Estados do boneco: 0 vazio · 1 vivo · 2 caindo · 3 enterrado · 4 sumiu · 5 virou fumaça. */
export const EST = { vivo: 1, caindo: 2, enterrado: 3, sumiu: 4, fumaca: 5 }
const PROJ = { T04: 'flecha', T05: 'virote', T06: 'falcao', T08: 'nada', T09: 'torta', T12: 'raio', spud: 'batata' }
const VOO_MS = 210, VAO = 22 // VAO: quanto cada frente segura do ponto do choque (centésimos de terreno): entre as duas sobra 1 boneco
// GESTO de cada tipo de carta e de invasor (movimento.js): cada um bate de um jeito reconhecível
const GESTOS = { T01: 1, T02: 1, T07: 2, T11: 3, stilt: 1, mole: 2, drum: 2 }

export function criarCena(canvas, CONFIG) {
  const g = canvas.getContext('2d', { alpha: false })
  const C = {
    g, tipo: 'celular', e: 2, VW: 180, VH: 370, ox: 0, oy: 0, geo: null, pts: [], tiers: [],
    menos: false, limite: 40,
    terrenos: Array(6).fill(null), vidas: 3, vidasMax: 3,
    hora: 'morning', horaDe: 'morning', mix: 1, noite: 0, portoes: false, portoesDe: false,
    cam: { x: 0, alvo: 0, zoom: 1, zoomAlvo: 1, fx: 0, fy: 0, zoomAte: 0, kick: 0 }, trem: { px: 0, ate: 0, x: 0, y: 0 },
    flashes: [], flashAte: 0, flashCor: '#FFF6E0', tremidaMax: 0, picoParticulas: 0, brancos: [],
    relogio: 0, // ms visuais (animações)
    destaque: null, // { terrenos: Set, vizinhos: Set, forte: n }
    pulo: new Float64Array(7), casteloTreme: 0, dessatura: 0,
    // bonecos (estrutura de vetores: nada de objeto por quadro)
    n: 0, lado: new Uint8Array(MAXU), peca: new Array(MAXU), vari: new Uint8Array(MAXU), x0: new Float32Array(MAXU), v: new Float32Array(MAXU), t0: new Float32Array(MAXU),
    lane: new Float32Array(MAXU), dxe: new Float32Array(MAXU), hp: new Int32Array(MAXU), hpMax: new Int32Array(MAXU), est: new Uint8Array(MAXU), anim: new Uint8Array(MAXU),
    animT: new Float64Array(MAXU), dir: new Int8Array(MAXU), k: new Float32Array(MAXU), barra: new Uint8Array(MAXU), preso: new Float32Array(MAXU), sx: new Float32Array(MAXU), sy: new Float32Array(MAXU), tier: new Uint8Array(MAXU),
    ordem: new Uint16Array(MAXU), tb: 0, nv: new Uint8Array(MAXU), lider: new Uint8Array(MAXU), marcha: false, marchaT0: 0, gritoT: -1e9,
    // movimento (R21): golpe, apanhou, virada, queda — tempos em ms do relógio visual
    idTipo: new Array(MAXU), atirador: new Uint8Array(MAXU), gesto: new Uint8Array(MAXU), atqDist: new Float32Array(MAXU), fimT: -1e9, fimVitoria: false, laneT: new Float32Array(MAXU), dxeT: new Float32Array(MAXU), ocultoAnt: new Uint8Array(MAXU), balde: new Int16Array(MAXU), altV: new Int8Array(MAXU), repMax: 6, kRep: 1, grupo: new Uint8Array(MAXU), atqT: new Float64Array(MAXU), atqAnt: new Float32Array(MAXU), atqTiro: new Uint8Array(MAXU), atqAlvo: new Int16Array(MAXU), atqSolta: new Uint8Array(MAXU),
    hitT: new Float64Array(MAXU), hitDir: new Int8Array(MAXU), hitF: new Float32Array(MAXU), viraT: new Float64Array(MAXU), dirV: new Int8Array(MAXU), morteT: new Float64Array(MAXU), morteTipo: new Uint8Array(MAXU), etapa: new Uint8Array(MAXU),
    fase: new Uint8Array(MAXU), passoN: new Int32Array(MAXU), qi: new Uint16Array(MAXU), pDx: new Int8Array(MAXU), pDy: new Int8Array(MAXU), pLarg: new Int8Array(MAXU), pAlt: new Int8Array(MAXU), pIncl: new Int8Array(MAXU),
    // partículas, efeitos animados, números
    pn: 0, px: new Float32Array(MAXP), py: new Float32Array(MAXP), pvx: new Float32Array(MAXP), pvy: new Float32Array(MAXP), pvida: new Float32Array(MAXP), pvida0: new Float32Array(MAXP), pcor: new Uint8Array(MAXP), ptam: new Uint8Array(MAXP), ptipo: new Uint8Array(MAXP),
    ef: Array.from({ length: MAXE }, () => ({ p: null, x: 0, y: 0, t0: 0, flip: false, ate: 0, anim: null, k: 1 })),
    num: Array.from({ length: MAXN }, (_, i) => ({ x: 0, y: 0, t0: -1e9, nasc: -1e9, s: '', v: 0, tipo: 0, ouro: false, grande: false, lado: i & 1 ? 1 : -1 })),
    proj: Array.from({ length: MAXPROJ }, () => ({ x0: 0, y0: 0, x1: 0, y1: 0, t0: -1e9, tipo: '', dur: VOO_MS, chegou: true })),
    finc: Array.from({ length: 12 }, () => ({ x: 0, y: 0, t0: -1e9, esq: false })),
    // medidas do movimento (para o teste e o relato): quantas vezes cada etapa aconteceu
    med: null,
  }
  C.zerarMedidas = () => { C.med = { antecipa: 0, bote: 0, volta: 0, seq: [], seqDe: -1, fumacas: 0, plaquetas: 0, gestos: [0, 0, 0, 0, 0, 0], cascata: 0, poBote: 0, festas: 0, recuos: 0, numPorGrupo: 0, vaoMin: 99, repsCaidos: 0, repsMax: 0, estrelas: 0, varridas: 0, tombos: 0, estouros: 0, chefeEtapas: [], passos: 0, poeiras: 0, viradas: 0, flechas: 0, fincadas: 0, explosoes: 0, aneis: 0, somados: 0, numeros: 0, zoomMax: 1, empurrao: 0, brancosLog: [], meioPixel: 0, trechos: [] }; C.tremidaMax = 0; C.picoParticulas = 0; C.flashes.length = 0 }
  C.zerarMedidas()
  const CORES_P = ['#FFF6E0', '#E8C48A', '#FFD248', '#CC3C3E', '#4884E8', '#9248C8', '#7CC950', '#E0489B', '#CECAD8', '#B6F03C', '#E87E2E', '#704C3E']
  const BRASA = ['#704C3E', '#CC3C3E', '#E87E2E', '#FFD248', '#FFF6E0']
  const P = { x: 0, y: 0, tier: 0, sent: 1 }, PO = Mov.pose()
  const S = criarCenario(C)
  let vinheta = null, moldura = null
  // folhas feitas por código, uma vez (particulas.js)
  let FX = null
  const fx = () => FX || (FX = { fumaca: [Px.fumaca('#FFFFFF', '#C9C4DA', null, 1), Px.fumaca('#DDBEF4', '#8E59C2', '#B6F03C', 4), Px.fumaca('#F4ECE0', '#9E98B4', '#FFD248', 7), Px.fumaca('#E8E2D4', '#8C8498', null, 11)], anel: Px.anel('#FFF6E0', '#FFD248'), anelPo: Px.anel('#E8C48A', '#CDA068'), varrida: Px.varrida(), marca: [Px.marca(CONTORNO.aliado), Px.marca(CONTORNO.invasor), Px.marca(CONTORNO.invasor, 30, 10), Px.marca(CONTORNO.invasor, 54, 14)] })

  // ---------------------------------------------------------------- medidas
  C.ajustar = (vw, vh) => {
    C.tipo = vh > vw ? 'celular' : 'pc'
    C.geo = Arte.geometria(C.tipo)
    const [rw, rh] = C.geo.referencia
    // celular: a tela lógica inteira (180×370). PC: câmera perto — basta caber 400×225; o resto a câmera percorre na luta
    const cabe = C.tipo === 'celular' ? Math.min(vw / rw, vh / rh) : Math.min(vw / 400, vh / 225)
    C.e = Math.max(1, Math.floor(cabe)); C.css = C.e
    // tela pequena (cabe entre 1× e 2×): desenha em 2× e o navegador encolhe até caber — ler vem antes do pixel exato
    if (cabe > 1.05 && cabe < 2) { C.e = 2; C.css = cabe }
    C.VW = Math.ceil(vw / C.css); C.VH = Math.ceil(vh / C.css)
    canvas.width = C.VW * C.e; canvas.height = C.VH * C.e
    canvas.style.width = C.VW * C.css + 'px'; canvas.style.height = C.VH * C.css + 'px'
    canvas.style.imageRendering = C.css === C.e ? '' : 'auto'
    C.ox = Math.floor((C.VW - (C.tipo === 'celular' ? rw : 500)) / 2)
    C.oy = C.oyBase = C.tipo === 'celular' ? C.VH - rh : C.VH - 270; C.camY = 0
    C.camMin = C.tipo === 'celular' ? 0 : Math.min(0, C.ox + C.geo.portao[0] - 30); C.camMax = C.tipo === 'celular' ? 0 : Math.max(0, C.ox + C.geo.castelo[0] + 50 - C.VW)
    C.limite = (C.tipo === 'celular' ? 40 : 60) >> (C.menos ? 1 : 0)
    // R25 — POUCAS FIGURAS GRANDES: até 5 representantes por pelotão no PC e 4 no celular, um degrau inteiro de pixel de TELA maiores
    // (PC ×3 → ×4, celular ×2 → ×3: continua pixel inteiro, sem borrar)
    C.repMax = C.tipo === 'celular' ? 3 : 5; // R26: 3 no celular (a estrada tem 18 px: 4 não cabem com folga) C.kRep = (C.e + 1) / C.e
    for (let i = 0; i < C.n; i++) if (C.peca[i] && C.peca[i].w <= 60) C.k[i] = C.kRep
    caminho(); vinheta = null; moldura = null
  }
  function caminho() {
    const T = C.geo.terrenos, pts = [], esc = C.geo.escadas || []
    const yc = (t) => (t.estrada[0] + t.estrada[1]) / 2, ini = (t) => t.x - t.sentido * t.largura / 2, fim = (t) => t.x + t.sentido * t.largura / 2
    const tiersY = [...new Set(T.map(yc))].sort((a, b) => a - b)
    C.tiers = tiersY
    const tier = (t) => tiersY.indexOf(yc(t))
    pts.push([-60, ini(T[0]) - T[0].sentido * T[0].largura * 0.6, yc(T[0]), tier(T[0]), T[0].sentido])
    for (let k = 0; k < 6; k++) {
      const t = T[k], prox = T[k + 1], sobe = prox && esc.find((s) => s.de === k + 1), subiu = k > 0 && esc.find((s) => s.de === k)
      if (!subiu) pts.push([k * 100, ini(t), yc(t), tier(t), t.sentido])
      if (sobe) {
        const ex = (sobe.x[0] + sobe.x[1]) / 2
        pts.push([k * 100 + 80, ini(t) + t.sentido * t.largura * 0.8, yc(t), tier(t), t.sentido])
        pts.push([k * 100 + 90, ex, yc(t), tier(t), t.sentido])
        pts.push([k * 100 + 110, ex, yc(prox), tier(prox), prox.sentido])
        pts.push([k * 100 + 120, ini(prox) + prox.sentido * prox.largura * 0.2, yc(prox), tier(prox), prox.sentido])
      }
    }
    pts.push([600, fim(T[5]), yc(T[5]), tier(T[5]), T[5].sentido])
    C.pts = pts
    const t0 = T[0]; C.meiaFaixa = (t0.estrada[1] - t0.estrada[0]) / 2 - (C.tipo === 'celular' ? 0 : 2) // celular: a fileira usa a estrada inteira (a multidão não vira mancha)
  }
  /** Posição do motor (centésimos de terreno) + fileira (−1..1) → ponto da tela de arte (sem câmera). Resultado em P. */
  function pos(xe, lane) {
    const pts = C.pts
    let i = 1
    while (i < pts.length - 1 && pts[i][0] < xe) i++
    const a = pts[i - 1], b = pts[i], f = Math.max(-1.6, Math.min(1.2, (xe - a[0]) / (b[0] - a[0])))
    P.x = C.ox + a[1] + (b[1] - a[1]) * f
    P.y = C.oy + a[2] + (b[2] - a[2]) * f + lane * C.meiaFaixa
    P.tier = f < 0.5 ? a[3] : b[3]
    P.sent = a[1] === b[1] ? b[4] : (b[1] > a[1] ? 1 : -1)
    return P
  }
  C.pos = (xe, lane = 0) => { const p = pos(xe, lane); return { x: p.x - C.cam.x, y: p.y, tier: p.tier } }
  /** Retângulo (em px de arte da tela) de um terreno 1..6, para o toque. */
  C.areaDoTerreno = (k) => {
    const t = C.geo.terrenos[k - 1]; let w = t.largura
    for (const o of C.geo.terrenos) if (o !== t && o.base_predio === t.base_predio) w = Math.min(w, Math.abs(o.x - t.x)) // vizinhos do mesmo patamar não se sobrepõem
    return { x: C.ox + t.x - w / 2 - C.cam.x, y: C.oyBase + t.base_predio - 34, w, h: Math.min(t.estrada[1] - t.base_predio + 36, C.VH - (C.tipo === 'celular' ? 78 + 44 / C.css : 80) - (C.oyBase + t.base_predio - 34)) }
  }
  C.centroDoTerreno = (k) => { const t = C.geo.terrenos[k - 1]; return { x: C.ox + t.x - C.cam.x, y: C.oy + (t.estrada[0] + t.estrada[1]) / 2, base: C.oy + t.base_predio } }

  // ---------------------------------------------------------------- bonecos
  let grupoAtual = 0
  C.limparBonecos = () => { C.n = 0; ordenar = true; grupoAtual = 0; C.fimT = -1e9; aLutaT.fill(-1e9) }
  // pelotões: contagem por (região, tipo) refeita a cada quadro em vetores fixos (nada de objeto por quadro)
  C.oculto = new Uint8Array(MAXU); C.etiquetas = []
  const gN = new Int16Array(NREG * NTIPO), gVis = new Int16Array(NREG * NTIPO), gX = new Float32Array(NREG * NTIPO), gTopo = new Float32Array(NREG * NTIPO), gTier = new Int8Array(NREG * NTIPO), gHp = new Float64Array(NREG * NTIPO), gMax = new Float64Array(NREG * NTIPO), tipoDe = new Map()
  // grupos do reino (um por terreno): para a barrinha fina de vida do grupo
  const NG = 16, aN = new Int16Array(NG), aX = new Float32Array(NG), aTopo = new Float32Array(NG), aHp = new Float64Array(NG), aMax = new Float64Array(NG)
  const aViv = new Int16Array(NG), aTot = new Int16Array(NG), aRep = new Int16Array(NG), aCont = new Int16Array(NG), repA = new Int16Array(NG * MAXREP), repG = new Int16Array(NREG * NTIPO * MAXREP)
  /** Lugar do representante `r` (de K) na FRENTE do pelotão: fileiras em profundidade e colunas abertas de lado (só desenho; o teto de
   *  ±40 centésimos não deixa invadir o terreno vizinho). Devolve em LUG. */
  const LUG = { lane: 0, dxe: 0 }
  const aLutaT = new Float64Array(NG).fill(-1e9)
  function lugar(r, K, inv, i, frente = false, recua = false) {
    const R = Math.min(K, C.tipo === 'pc' ? 3 : 2), row = r % R, col = (r / R) | 0, cols = Math.ceil(K / R), h = (i * 2654435761) >>> 0
    LUG.lane = (R === 1 ? 0 : ((row / (R - 1)) * 2 - 1) * 0.86) + (((h >>> 4) % 5) - 2) * 0.025
    const passo = C.tipo === 'pc' ? 30 : 34, zig = (row % 2 ? passo * 0.42 : -passo * 0.12) + ((h >>> 9) % 5) - 2, d = inv ? -VAO - col * passo - Math.abs(zig) : frente ? VAO + col * passo + Math.abs(zig) : (col - (cols - 1) / 2) * passo + zig + (recua ? 38 : 0)
    // PORTÃO SEM ABRAÇO (R26): a horda segura VAO para o lado do portão e o grupo do reino QUE ESTÁ NA LUTA segura VAO para o lado do
    // castelo — em repouso as frentes nunca se encostam; só quem dá o bote cruza o vão e volta
    LUG.dxe = Math.max(-62, Math.min(62, d))
  }
  function agrupar() {
    const REP = Math.min(MAXREP, C.repMax), luta = C.emLuta && !C.marcha
    gN.fill(0); gVis.fill(0); gX.fill(0); gTopo.fill(1e9); gHp.fill(0); gMax.fill(0); aN.fill(0); aX.fill(0); aTopo.fill(1e9); aHp.fill(0); aMax.fill(0); aViv.fill(0); aTot.fill(0); aCont.fill(0)
    for (let i = 0; i < C.n; i++) { if (C.lado[i] !== 0) continue; const k = C.grupo[i] % NG; aMax[k] += C.hpMax[i]; aTot[k]++; if (C.est[i] === 1) { aViv[k]++; aHp[k] += Math.max(0, C.hp[i]) } } // quem caiu conta como vida perdida
    // quantos representantes cada grupo do reino mostra: na proporção da VIDA do grupo; o último só some quando o grupo acaba
    for (let k = 0; k < NG; k++) aRep[k] = aViv[k] ? Math.max(1, Math.min(aViv[k], Math.ceil(Math.min(aTot[k], REP) * aHp[k] / Math.max(1, aMax[k]) - 0.001))) : 0
    for (let i = 0; i < C.n; i++) {
      const era = C.oculto[i]; C.oculto[i] = 0
      const p = C.peca[i], grande = p.w > 60
      if (C.est[i] !== 1) { C.oculto[i] = era && C.est[i] !== 0 && !grande ? 1 : 0; continue } // quem cai fora de vista cai fora de vista
      if (C.lado[i] === 0) {
        if (C.est[i] !== 1) continue
        const k = C.grupo[i] % NG
        if (grande) { aN[k]++; aX[k] += C.sx[i]; aTopo[k] = Math.min(aTopo[k], C.sy[i] - (p.ay - Arte.topoDe(p)) * C.k[i]); continue }
        const r = aCont[k]++
        if (r >= aRep[k]) { // fora da conta dos representantes: some (na luta, com uma fumacinha: é a vida do grupo indo embora)
          C.oculto[i] = 1
          if (!era && !C.ocultoAnt[i] && luta) { const fu = fx().fumaca[0]; porEfeito(fu, C.sx[i], C.sy[i], false, fu.anim.play); C.med.repsCaidos++ }
          C.ocultoAnt[i] = 1; continue
        }
        C.ocultoAnt[i] = 0; repA[k * MAXREP + r] = i
        lugar(r, aRep[k], false, i, luta && !C.atirador[i] && C.relogio - aLutaT[k] < 1600, luta && C.tipo === 'celular'); // no celular, quem não está no choque recua meio terreno: o golpe ganha ar C.laneT[i] = LUG.lane; C.dxeT[i] = LUG.dxe
        aN[k]++; aX[k] += C.sx[i]; const topo = C.sy[i] - (p.ay - Arte.topoDe(p)) * C.k[i]; if (topo < aTopo[k]) aTopo[k] = topo
        continue
      }
      if (C.est[i] !== 1 || grande) continue
      let t = tipoDe.get(p); if (t === undefined) { t = tipoDe.size % NTIPO; tipoDe.set(p, t) }
      const k = Math.max(0, Math.min(NREG - 1, Math.floor((C.xDe(i) + 100) / 100))) * NTIPO + t
      C.balde[i] = k; gHp[k] += Math.max(0, C.hp[i]); gMax[k] += C.hpMax[i]
      const r = gN[k]++
      if (r >= REP) { C.oculto[i] = 1; continue }
      repG[k * MAXREP + r] = i
      lugar(r, REP, true, i); C.laneT[i] = LUG.lane; C.dxeT[i] = LUG.dxe
      gVis[k]++; gX[k] += C.sx[i]; gTier[k] = C.tier[i]; const topo = C.sy[i] - (p.ay - Arte.topoDe(p)) * C.k[i]; if (topo < gTopo[k]) gTopo[k] = topo
    }
    let nRep = 0; for (let i = 0; i < C.n; i++) if (C.est[i] === 1 && !C.oculto[i] && C.peca[i].w <= 60) nRep++
    if (nRep > C.med.repsMax) C.med.repsMax = nRep
  }
  /** O REPRESENTANTE que aparece no lugar do boneco `i` (ele mesmo, se está à vista): todo golpe tem dono e alvo visíveis. */
  C.rep = (i) => {
    if (i < 0 || !C.oculto[i] || C.est[i] !== 1) return i
    if (C.lado[i] === 0) { const k = C.grupo[i] % NG, n = Math.min(aRep[k], aCont[k]); return n > 0 ? repA[k * MAXREP + (i % n)] : i }
    const k = C.balde[i], n = gVis[k]; return n > 0 ? repG[k * MAXREP + (i % n)] : i
  }
  /** Barrinha FINA de vida (3 px com a borda): `f` 0..1. */
  function barrinha(x, y, w, f, cor) {
    g.fillStyle = '#2B1E3A'; g.fillRect(x - (w >> 1) - 1, y, w + 2, 3)
    g.fillStyle = '#4E3A66'; g.fillRect(x - (w >> 1), y + 1, w, 1)
    const c = Math.max(f > 0 ? 1 : 0, Math.round(w * Math.min(1, f))); if (c > 0) { g.fillStyle = cor; g.fillRect(x - (w >> 1), y + 1, c, 1) }
  }
  /** Plaqueta do grupo num mastro: número real + vida no filete (uma peça; nada solto em cima do choque). `y` = topo do grupo. */
  function plaqueta(x, topo, s, f, corVida, corTopo, sobe) {
    const mini = C.tipo === 'celular', fonte = mini && Arte.temFonte('mini-contorno') ? 'mini-contorno' : 'reino-contorno', w = Math.max(14, (s ? Arte.largura(s, fonte) : 8) + 6), h = s ? (mini ? 8 : 11) : 2, y = topo - h - 9 - sobe
    x = Math.max(3 + (w >> 1), Math.min(C.VW - 3 - (w >> 1), x))
    g.fillStyle = '#2B1E3A'; g.fillRect(x - 1, y + h, 3, 9 + sobe); g.fillStyle = '#96623C'; g.fillRect(x, y + h, 1, 8 + sobe) // mastro
    g.fillStyle = '#2B1E3A'; g.fillRect(x - (w >> 1), y - 2, w, h + 5)
    g.fillStyle = corTopo; g.fillRect(x - (w >> 1) + 1, y - 1, w - 2, 1)
    g.fillStyle = '#4E3A66'; g.fillRect(x - (w >> 1) + 1, y + h + 1, w - 2, 1)
    const c = Math.max(f > 0 ? 1 : 0, Math.round((w - 2) * Math.min(1, f))); if (c > 0) { g.fillStyle = corVida; g.fillRect(x - (w >> 1) + 1, y + h + 1, c, 1) }
    if (s) Arte.texto(g, s, x, y, { fonte, alinhar: 'centro' })
  }
  /** Por cima dos grupos: barrinha fina de cada grupo do reino (na luta) e a flâmula "x56" de cada pelotão (com a vida dele). */
  function etiquetas() {
    C.etiquetas.length = 0
    const cx = camX()
    const luta = C.emLuta && !C.marcha
    for (let k = 0; k < NG; k++) { // grupos do reino: UMA peça só (R26) — plaqueta com o número real e a vida do grupo no filete, num mastro preso ao líder
      if (!aN[k] || aMax[k] <= 0 || !(luta || aViv[k] > aN[k])) continue
      const lid = repA[k * MAXREP], temLid = Math.min(aRep[k], aCont[k]) > 0 && C.est[lid] === 1 && C.lado[lid] === 0 && C.grupo[lid] % NG === k
      const X = (temLid ? Math.round(C.sx[lid]) : Math.round(aX[k] / aN[k])) - cx, topo = Math.round(aTopo[k]) + Math.round(C.trem.y)
      plaqueta(X, topo, aViv[k] > aN[k] || luta ? 'x' + aViv[k] : '', aHp[k] / aMax[k], '#7CC950', temLid && C.nv[lid] >= 5 ? '#FFD248' : temLid && C.nv[lid] >= 3 ? '#CECAD8' : CONTORNO.aliado, 0)
      C.med.plaquetas++
    }
    for (let k = 0; k < gN.length; k++) {
      if (!gVis[k]) continue
      const X = Math.round(gX[k] / gVis[k]) - cx, topo = Math.round(gTopo[k]) + Math.round(C.trem.y)
      if (gN[k] <= gVis[k]) { if (luta && gN[k] >= 2 && gHp[k] < gMax[k]) barrinha(X, topo - 6, 20, gHp[k] / gMax[k], '#E0503C'); continue }
      // flâmula do pelotão: plaqueta ameixa com filete lima e pontinha para baixo, presa ao grupo (balança 1 px com a marcha)
      const s = 'x' + gN[k], w = Arte.largura(s, 'reino-contorno') + 8, x = Math.max(2 + (w >> 1), Math.min(C.VW - 2 - (w >> 1), X)), bal = C.menos ? 0 : Math.round(Math.sin(C.relogio / 260 + k) * 0.8), y = topo - 17 - ((k % NTIPO) % 2) * 9 + bal
      g.fillStyle = '#2B1E3A'; g.fillRect(x - (w >> 1) + 1, y - 2, w - 2, 14); g.fillRect(x - (w >> 1), y - 1, w, 12); g.fillRect(x - 2, y + 12, 5, 1); g.fillRect(x - 1, y + 13, 3, 1); g.fillRect(x, y + 14, 1, 1)
      g.fillStyle = '#4E3A66'; g.fillRect(x - (w >> 1) + 1, y - 1, w - 2, 1)
      g.fillStyle = CONTORNO.invasor; g.fillRect(x - (w >> 1) + 1, y + 10, w - 2, 1)
      if (gMax[k] > 0) { g.fillStyle = '#E0503C'; g.fillRect(x - (w >> 1) + 1, y + 10, Math.round((w - 2) * (1 - gHp[k] / gMax[k])), 1) } // a vida perdida do pelotão come o filete
      Arte.texto(g, s, x, y, { fonte: 'reino-contorno', alinhar: 'centro' })
      C.etiquetas.push(gN[k])
    }
  }
  /** Fileira e desvio de um soldado j de n no terreno (a mesma conta parado e na luta). */
  C.formacao = (j, n) => {
    const R = Math.min(n, C.tipo === 'pc' ? 4 : 3), row = j % R, col = Math.floor(j / R), cols = Math.ceil(n / R), passo = Math.min(24, 78 / cols)
    return { lane: R === 1 ? 0 : ((row / (R - 1)) * 2 - 1) * 0.9, dxe: (col - (cols - 1) / 2) * passo + (row % 2 ? passo * 0.35 : -passo * 0.15) }
  }
  C.nascer = (lado, tipo, x, hp, lane, dxe, grande = 1, nivel = 0, lider = false) => {
    const i = C.n; if (i >= MAXU) return -1
    const p = Arte.unidade(tipo)
    C.lado[i] = lado; C.peca[i] = p; C.idTipo[i] = tipo; { const c = CONFIG.CARTAS?.[tipo] || CONFIG.INVASORES?.[tipo] || CONFIG.CHEFES?.find((x) => x.id === tipo); C.atirador[i] = c && c.alcance > 60 ? 1 : 0 } C.vari[i] = p.variantes ? (i * 7 + 3) % p.variantes.length : 0
    // formação com profundidade: ninguém exatamente em cima do outro nem na mesma pose (desvio fixo por boneco; só desenho)
    const h = (i * 2654435761) >>> 0
    C.x0[i] = x; C.v[i] = 0; C.t0[i] = C.tb; C.lane[i] = lane + (p.w > 60 ? 0 : (((h >>> 4) % 7) - 3) * 0.03); C.dxe[i] = dxe + (p.w > 60 ? 0 : ((h >>> 9) % 7) - 3); C.hp[i] = hp; C.hpMax[i] = hp; C.est[i] = 1
    C.anim[i] = 0; C.animT[i] = C.relogio - (h >>> 12) % 1040; C.dir[i] = lado ? 1 : -1; C.dirV[i] = C.dir[i]; C.k[i] = p.w > 60 ? grande : C.kRep; C.laneT[i] = C.lane[i]; C.dxeT[i] = C.dxe[i]; C.ocultoAnt[i] = 1; C.oculto[i] = 0; C.altV[i] = p.w > 60 ? 0 : ((h >>> 15) % 3) - 1; C.gesto[i] = C.atirador[i] ? 5 : p.w > 60 ? 4 : GESTOS[tipo] || 0; C.atqDist[i] = 6; C.barra[i] = p.barra ? 1 : 0; C.preso[i] = -1; C.nv[i] = nivel; C.lider[i] = lider ? 1 : 0
    if (lado === 0 && lider) grupoAtual++
    C.grupo[i] = lado === 0 ? grupoAtual : 0
    C.atqT[i] = C.hitT[i] = C.viraT[i] = C.morteT[i] = -1e9; C.atqSolta[i] = 0; C.fase[i] = 0; C.passoN[i] = -1; C.etapa[i] = 0; C.morteTipo[i] = 0
    C.n = i + 1; ordenar = true
    return i
  }
  let ordenar = false
  C.tocarAnim = (i, a) => { if (C.est[i] !== 1 && a !== AN.fall) return; C.anim[i] = a; C.animT[i] = C.relogio }
  C.xDe = (i) => C.x0[i] + C.v[i] * Math.max(0, C.tb - C.t0[i])
  C.telaDe = (i) => ({ x: C.sx[i] - C.cam.x, y: C.sy[i] })
  const pesoDe = (p) => (p.w > 100 ? 2 : p.w > 60 ? 1.5 : 1)
  /** Quanto tempo (ms de animação) o boneco leva da preparação até o impacto: o 1º tempo do golpe no atlas. */
  C.antecipaDe = (i) => { const a = C.peca[i].anim.attack; return a ? a.ms[0] : 120 }
  /** O boneco `i` atira (alvo longe)? E com quê. */
  C.projetilDe = (i) => PROJ[C.idTipo[i]] || (C.lado[i] ? 'batata' : 'flecha')
  /** Começa o golpe de `i` (a batalha chama ANTES do impacto, com a antecipação que cabe). `alvo` ≥ 0 e `tiro`: solta o projétil no fim da antecipação. */
  C.atacar = (i, alvo = -1, tiro = false, jaNoBote = false, atraso = 0) => {
    if (C.est[i] !== 1) return false
    const ant = C.antecipaDe(i)
    if (!jaNoBote && C.relogio - C.atqT[i] < ant + Mov.BOTE_MS + Mov.SEGURA_MS) return false // já está no meio de um golpe
    C.atqAnt[i] = ant; C.atqT[i] = jaNoBote ? C.relogio - ant : C.relogio + atraso; C.atqTiro[i] = tiro ? 1 : 0; C.atqAlvo[i] = alvo; C.atqSolta[i] = tiro && alvo >= 0 ? 1 : 0
    C.anim[i] = AN.attack; C.animT[i] = C.atqT[i]
    if (atraso > 0) C.med.cascata++
    // o bote cruza o VÃO até o alvo (e só ele): alcance em px de arte do boneco
    if (alvo >= 0 && alvo < C.n && !C.atirador[i]) { const d = Math.abs(C.sx[alvo] - C.sx[i]) / C.k[i]; C.atqDist[i] = Math.max(5, Math.min(24, d - 13)); if (!C.oculto[i] && !C.oculto[alvo] && C.peca[i].w <= 60 && C.peca[alvo].w <= 60 && d * C.k[i] < C.med.vaoMin) C.med.vaoMin = Math.round(d * C.k[i]) } else C.atqDist[i] = 6
    if (C.lado[i] === 0) aLutaT[C.grupo[i] % NG] = C.relogio
    return true
  }
  C.emGolpe = (i) => C.relogio - C.atqT[i] < C.atqAnt[i] + Mov.BOTE_MS + Mov.SEGURA_MS
  /** `i` apanhou: recua e amassa (`dirTela` = +1 empurra para a direita da tela). Não troca o quadro de quem está no meio do bote. */
  C.apanhar = (i, dirTela, forca = 1) => { C.hitT[i] = C.relogio; C.hitDir[i] = dirTela; C.hitF[i] = forca; if (C.lado[i] === 0) aLutaT[C.grupo[i] % NG] = C.relogio; if (!C.oculto[i]) C.med.estrelas++ }
  /** `i` cai: 0 soldado (tombo + fumaça clara) · 1 invasor (estoura em fumaça roxa) · 2 chefe (queda em etapas) · 3 bruto (tomba + poeira). */
  C.morrer = (i, tipo) => { C.est[i] = 2; C.morteT[i] = C.relogio; C.morteTipo[i] = tipo; C.etapa[i] = 0; C.anim[i] = AN.fall; C.animT[i] = C.relogio; C.v[i] = 0; C.atqSolta[i] = 0; C.fase[i] = 0 }

  // ---------------------------------------------------------------- efeitos
  let viv = 0 // partículas + efeitos vivos (contados no desenho e somados a cada nascimento)
  /** Partícula em pixel. `tipo` 0 lasca (cai) · 1 poeira/fumacinha (sobe devagar e encolhe) · 2 brasa (cai devagar e esfria de cor).
   *  `prio` 0 = enfeite (poeira do passo): só nasce com metade do teto livre, para a queda e o estouro nunca ficarem sem. */
  C.particula = (x, y, vx, vy, vida, cor, tam = 1, tipo = 0, prio = 1) => {
    if (viv >= (prio ? C.limite : C.limite >> 1)) return false
    for (let i = 0; i < MAXP; i++) if (C.pvida[i] <= 0) { C.px[i] = x; C.py[i] = y; C.pvx[i] = vx; C.pvy[i] = vy; C.pvida[i] = C.pvida0[i] = vida; C.pcor[i] = cor; C.ptam[i] = tam; C.ptipo[i] = tipo; viv++; return true }
    return false
  }
  C.estouro = (x, y, n, cor, forca = 40) => { for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + i, f = forca * (0.5 + ((i * 37) % 10) / 20); C.particula(x, y, Math.cos(a) * f, Math.sin(a) * f - forca * 0.6, 380 + (i % 4) * 60, cor, 1 + (i & 1)) } }
  function porEfeito(p, x, y, flip, a, k = 1, atraso = 0) {
    if (viv >= C.limite) return false
    for (const e of C.ef) if (e.ate <= C.relogio) { e.p = p; e.x = x; e.y = y; e.t0 = C.relogio + atraso; e.flip = flip; e.anim = a; e.k = k; e.ate = e.t0 + Arte.duracao(a); viv++; return true }
    return false
  }
  /** Efeito animado do atlas (dust, spark, slash, explosion, heal, level-ring, confetti…). Sem a peça: partículas simples. */
  C.efeito = (nome, x, y, flip = false, anim = 'play') => {
    const p = Arte.peca(nome)
    if (!p) { C.estouro(x, y - 4, nome === 'explosion' ? 10 : nome === 'confetti' ? 8 : 4, nome === 'explosion' ? 2 : nome === 'heal' ? 6 : 1, nome === 'explosion' ? 70 : 36); return }
    porEfeito(p, x, y, flip, p.anim[anim] || p.anim.play)
  }
  /** ESTOURO de fogo (barril, Bloater, magia): bola de fogo do atlas + anel de choque no chão + brasas que caem + fumaça que sobe depois. */
  C.explodir = (x, y, gas = false) => {
    C.med.explosoes++
    C.efeito(gas && Arte.peca('gas-burst') ? 'gas-burst' : 'explosion', x, y + 4)
    if (porEfeito(fx().anel, x, y + 2, false, fx().anel.anim.play)) C.med.aneis++
    porEfeito(fx().fumaca[3], x, y - 2, false, fx().fumaca[3].anim.play, 1, 230)
    const n = C.menos ? 3 : 7
    for (let i = 0; i < n; i++) { const a = -0.3 - (i / n) * 2.55, f = 50 + ((i * 53) % 40); C.particula(x + Math.cos(a) * 6, y - 8, Math.cos(a) * f, Math.sin(a) * f - 30, 420 + (i % 3) * 110, gas ? 9 : 2, 1 + (i & 1), 2) }
  }
  C.numero = (x, y, s, ouro = false, grande = false) => {
    let alvo = C.num[0]
    for (const n of C.num) if (n.t0 < alvo.t0) alvo = n
    if (C.relogio - alvo.t0 < 500 && !ouro) return // 8 ao mesmo tempo, no máximo
    alvo.x = x; alvo.y = y; alvo.t0 = alvo.nasc = C.relogio; alvo.s = s; alvo.ouro = ouro; alvo.grande = grande; alvo.tipo = 3; alvo.v = 0; alvo.chave = -1
  }
  const DUR_NUM = 680
  const textoDoDano = (n) => { n.s = n.tipo === 2 ? '+' + n.v : n.tipo === 1 ? n.v + '!' : String(n.v) }
  /** Número de DANO (ou de cura): salta em arco e cai. `tipo` 0 comum (creme) · 1 forte (ouro, com "!") · 2 cura (verde, "+").
   *  Muitos golpes no mesmo lugar em pouco tempo SOMAM num número só (na rodada alta dá para ler). No máximo 8 na tela. */
  C.dano = (x, y, valor, tipo = 0, grande = false, chave = -1, lado = 0) => {
    const t = C.relogio
    let livre = null, velho = C.num[0], doGrupo = 0
    if (chave >= 0) { // R26 — UM número de dano por pelotão, em faixa reservada ao lado de quem apanha (a cura tem a faixa dela, mais alta); o resto SOMA nele
      for (const n of C.num) {
        if (n.tipo === 3 || t - n.t0 >= DUR_NUM || n.chave !== chave) continue
        doGrupo++
        // UM número por pelotão: tudo soma nele (se entrar um golpe forte, ele vira ouro com "!")
        if (tipo === 1 && n.tipo === 0) { n.tipo = 1; n.ouro = true }
        n.v += valor; n.grande = n.grande || grande; textoDoDano(n); if (t - n.nasc < 900) n.t0 = Math.max(n.t0, t - 90); C.med.somados++; return
      }
      // nasce do LADO de quem apanhou (para longe do golpe) e em faixa de altura própria: comum embaixo, forte em cima, cura mais alto
      x += lado * 15; y -= tipo === 2 ? 14 : 0
    }
    for (const n of C.num) {
      if (chave < 0 && n.tipo === tipo && t - n.nasc < 420 && t - n.t0 < DUR_NUM && Math.abs(n.x - x) < 26 && Math.abs(n.y - y) < 20) { n.v += valor; n.grande = n.grande || grande; textoDoDano(n); n.t0 = Math.max(n.t0, t - 90); C.med.somados++; return } // soma e dá um repique
      if (t - n.t0 >= DUR_NUM) livre = livre || n
      if (n.t0 < velho.t0) velho = n
    }
    if (!livre) {
      // tela cheia de números: soma no mais perto do mesmo tipo; o forte toma o lugar do mais velho; o comum espera a vez
      let perto = null, d = 1e9
      for (const n of C.num) if (n.tipo === tipo) { const q = Math.abs(n.x - x) + Math.abs(n.y - y); if (q < d) { d = q; perto = n } }
      if (perto && d < 90) { perto.v += valor; textoDoDano(perto); C.med.somados++; return }
      if (tipo !== 1) return
      livre = velho
    }
    livre.x = x; livre.y = y; livre.t0 = livre.nasc = t; livre.v = valor; livre.tipo = tipo; livre.ouro = tipo === 1; livre.grande = grande; livre.chave = chave; if (lado) livre.lado = lado; textoDoDano(livre); C.med.numeros++
    if (chave >= 0) { let q = 0; for (const n of C.num) if (n.tipo !== 3 && t - n.t0 < DUR_NUM && n.chave === chave) q++; if (q > C.med.numPorGrupo) C.med.numPorGrupo = q }
  }
  /** Chave do pelotão de um boneco (para os números de dano): grupo do reino, balde da horda, ou ele mesmo se é grande. */
  C.chaveDe = (i, cura = false) => (cura ? 10000 : 0) + (C.peca[i].w > 60 ? 5000 + i : C.lado[i] === 0 ? 1000 + (C.grupo[i] % NG) : C.balde[i])
  /** Projétil de enfeite (o tiro já está decidido): `tipo` 'flecha' | 'virote' | 'batata' | 'torta' | 'falcao' | 'raio' (ou 0/1 da versão antiga). */
  C.projetil = (x0, y0, x1, y1, tipo = 'flecha', dur = VOO_MS) => {
    if (tipo === 0) tipo = 'flecha'; else if (tipo === 1) tipo = 'batata'
    let a = C.proj[0]; for (const p of C.proj) if (p.t0 < a.t0) a = p
    a.x0 = x0; a.y0 = y0; a.x1 = x1; a.y1 = y1; a.t0 = C.relogio; a.tipo = tipo; a.dur = tipo === 'raio' ? 110 : dur; a.chegou = false; C.med.flechas++
  }
  /** Tremida: no máximo 6 px e 120 ms. Com "Reduced motion" não treme. */
  C.tremer = (px, ms = 100) => { if (C.menos) return; C.trem.px = Math.min(6, px); C.trem.ate = performance.now() + Math.min(120, ms) }
  /** Empurrão de câmera na carga: a cena dá um tranco curto (até 3 px) e volta macio. Com "Reduced motion" não mexe. */
  C.empurrar = (px) => { if (C.menos) return; C.cam.kick = Math.max(-3, Math.min(3, px)); C.med.empurrao = Math.max(C.med.empurrao, Math.abs(C.cam.kick)) }
  /** Clarão: no máximo 3 por segundo, nunca a tela toda branca. Com "Reduced motion" não pisca. Devolve se piscou. */
  C.flash = (cor = '#FFF6E0', ms = 120) => {
    if (C.menos) return false
    const agora = performance.now()
    while (C.flashes.length && agora - C.flashes[0] > 5000) C.flashes.shift()
    if (C.flashes.filter((t) => agora - t < 1000).length >= 3) return false
    C.flashes.push(agora); C.flashAte = agora + ms; C.flashCor = cor; C.flashMs = ms
    return true
  }
  /** O quadro branco de "apanhou" conta como clarão pequeno: também no máximo 3 por segundo. */
  C.podeBranco = () => {
    if (C.menos) return false
    const agora = performance.now()
    while (C.brancos.length && agora - C.brancos[0] > 1000) C.brancos.shift()
    if (C.brancos.length >= 3) return false
    C.brancos.push(agora); if (C.med.brancosLog.length < 400) C.med.brancosLog.push(agora); return true
  }
  /** Zoom no golpe final e na queda do chefe: entra e sai MACIO (sem salto). Com "Reduced motion" não há zoom. */
  C.zoom = (x, y, ms) => { if (C.menos) return; C.cam.zoomAlvo = (C.e + 1) / C.e; if (C.cam.zoom === 1) C.cam.zoom = 1 + 0.02; C.cam.fx = x; C.cam.fy = y; C.cam.zoomAte = performance.now() + ms }
  /** Trecho da estrada na tela agora: 0 campos (manhã) · 1 vila (tarde) · 2 portões (pôr do sol) · 3 noite de chefe. */
  const trechoDe = (hora, portoes) => (hora === 'boss-night' ? 3 : hora === 'afternoon' ? (portoes ? 2 : 1) : 0)
  C.trecho = () => trechoDe(C.hora, C.portoes)
  C.nomeDoTrecho = () => TRECHOS[C.trecho()]
  C.mudarHora = (h, jaJa = false, rodada = 0) => {
    const pedida = Arte.rodadaPedida(), r = rodada || pedida, portoes = h === 'afternoon' && r > 0 && ((r - 1) % 5) === 3 // a 4ª rodada do ciclo é a dos portões, ao pôr do sol
    if (h === C.hora && portoes === C.portoes) return
    C.horaDe = C.hora; C.portoesDe = C.portoes; C.hora = h; C.portoes = portoes; C.mix = jaJa ? 1 : 0
  }
  /** Vai direto a um trecho (0..3) — para o replay e o teste. */
  C.irParaTrecho = (n, jaJa = true) => { const h = S.horaDe(n), p = n === 2; if (h === C.hora && p === C.portoes) return; C.horaDe = C.hora; C.portoesDe = C.portoes; C.hora = h; C.portoes = p; C.mix = jaJa ? 1 : 0 }
  C.cenario = S

  // ---------------------------------------------------------------- desenho
  const camX = () => Math.round(C.cam.x - C.trem.x)
  function plano(p, alfa) {
    const [qx, qy, qw, qh] = p.quadro
    let x = Math.round(C.ox + p.x - C.cam.x * p.paralaxe + C.trem.x * Math.min(1, p.paralaxe)), y = C.oy + p.y + Math.round(C.trem.y * Math.min(1, p.paralaxe))
    if (p.nome === 'sky') { x = Math.round(C.ox + p.x); y = C.oy }
    g.globalAlpha = alfa
    if (p.repete_x) { x = ((x % qw) + qw) % qw - qw; for (; x < C.VW; x += qw) g.drawImage(p.img, qx, qy, qw, qh, x, y, qw, qh) } else {
      g.drawImage(p.img, qx, qy, qw, qh, x, y, qw, qh)
      if (x > 0) g.drawImage(p.img, qx, qy, 1, qh, 0, y, x, qh)
      if (x + qw < C.VW) g.drawImage(p.img, qx + qw - 1, qy, 1, qh, x + qw, y, C.VW - x - qw, qh)
    }
    if (p.nome === 'sky' && y > 0) { g.fillStyle = corDoTopo(p); g.fillRect(0, 0, C.VW, y) }
    if (p.nome === 'ground' && y + qh < C.VH) for (let yy = y + qh; yy < C.VH; yy += 40) for (let xx = ((x % qw) + qw) % qw - qw; xx < C.VW; xx += qw) g.drawImage(p.img, qx, qy + qh - 40, qw, 40, xx, yy, qw, 40)
  }
  /** Cor mais comum da 1ª linha do céu (sem pegar estrela), para completar o céu acima do plano. */
  function corDoTopo(p) {
    if (p.topo) return p.topo
    const tmp = Arte.Cod.tela(p.quadro[2], 1), tg = tmp.getContext('2d'); tg.drawImage(p.img, p.quadro[0], p.quadro[1], p.quadro[2], 1, 0, 0, p.quadro[2], 1)
    const d = tg.getImageData(0, 0, p.quadro[2], 1).data, cont = {}
    let melhor = '#000', n = 0
    for (let i = 0; i < d.length; i += 4) { const k = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`; cont[k] = (cont[k] || 0) + 1; if (cont[k] > n) { n = cont[k]; melhor = k } }
    return (p.topo = melhor)
  }
  function nuvens(cen, alfa) {
    if (!cen.nuvens.length) return
    g.globalAlpha = alfa
    for (let i = 0; i < 4; i++) {
      const q = cen.nuvens[i % cen.nuvens.length], vel = C.menos ? 0 : (3 + i) / 1000
      const x = ((i * 173 + C.relogioReal * vel) % (C.VW + 80)) - 60, y = C.oy + 8 + ((i * 53) % 34) + (C.tipo === 'celular' ? 18 : 22)
      g.drawImage(cen.nuvemImg, q[0], q[1], q[2], q[3], Math.round(x), y, q[2], q[3])
    }
  }
  function fazerVinheta() {
    const c = Arte.Cod.tela(C.VW, C.VH), vg = c.getContext('2d'), d = vg.createImageData(C.VW, C.VH), a = d.data
    for (let y = 0; y < C.VH; y++) for (let x = 0; x < C.VW; x++) {
      const dx = (x / C.VW - 0.5) * 2, dy = (y / C.VH - 0.5) * 2, r = Math.sqrt(dx * dx + dy * dy) / 1.414
      let n = Math.floor((r - 0.55) * 14); if (n < 0) continue
      const meio = n & 1; n = (n >> 1) + (meio && ((x + y) & 1) ? 1 : 0) // degraus pontilhados, nunca degradê liso
      const i = (y * C.VW + x) * 4; a[i] = 43; a[i + 1] = 30; a[i + 2] = 58; a[i + 3] = Math.min(255, n * 64)
    }
    vg.putImageData(d, 0, 0); return c
  }
  /** Vida do cenário (só enfeite, fora da conta de partículas): pássaros de dia, vaga-lumes à noite, bandeirolas na festa do fim. */
  function vida() {
    const lista = Arte.vidaDaHora(C.hora), T = C.relogioReal
    if (lista.includes('bird') && !C.menos) { const p = Arte.peca('bird'); if (p) for (let i = 0; i < 2; i++) { const x = ((T * (0.012 + i * 0.005) + i * 140) % (C.VW + 60)) - 30, y = C.oy + (C.tipo === 'celular' ? 24 : 14) + i * 13 + Math.round(Math.sin(T / 600 + i) * 2); Arte.desenhar(g, p, quadroDaPeca(p, 'play', T + i * 200), Math.round(x), y) } }
    if (lista.includes('dust-mote') && !C.portoes) { const p = Arte.peca('dust-mote'); if (p) for (let i = 0; i < 5; i++) { const x = ((i * 97 + 31) % C.VW) + (C.menos ? 0 : Math.round(Math.sin(T / 1300 + i * 1.7) * 7)), y = C.oy + C.tiers[i % C.tiers.length] - 26 - ((i * 29) % 18) + (C.menos ? 0 : Math.round(Math.cos(T / 1100 + i) * 4)); Arte.desenhar(g, p, quadroDaPeca(p, 'play', C.menos ? 0 : T + i * 260), x, y) } }
    if (lista.includes('firefly')) { const p = Arte.peca('firefly'); if (p) for (let i = 0; i < 6; i++) { const x = ((i * 73 + 20) % C.VW) + (C.menos ? 0 : Math.round(Math.sin(T / 900 + i * 2) * 5)), y = C.oy + C.tiers[i % C.tiers.length] - 20 - ((i * 37) % 24) + (C.menos ? 0 : Math.round(Math.cos(T / 700 + i) * 3)); Arte.desenhar(g, p, quadroDaPeca(p, 'play', C.menos ? 0 : T + i * 330), x, y) } }
    if (C.fimDeJogo) { const p = Arte.peca('bunting'); if (p) { const y = C.oy + C.tiers[0] - (C.tipo === 'celular' ? 62 : 58); for (let x = -((Math.round(C.cam.x)) % 64) - 64; x < C.VW; x += 64) Arte.desenhar(g, p, quadroDaPeca(p, 'play', C.menos ? 0 : T), x, y) } }
  }
  const quadroDaPeca = (p, animNome, ms, vari = 0) => { const a = p.anim[animNome] || Object.values(p.anim)[0]; return (p.variantes ? p.variantes[vari] : p.quadros)[Arte.quadroDe(a, ms)] }

  function moveis(tier, tinta, t) {
    const T = C.geo.terrenos, cx = camX(), ty = Math.round(C.trem.y)
    const yTier = C.tiers[tier]
    if (tier === C.tiers.length - 1) { const p = Arte.peca('gate'); if (p) Arte.desenhar(g, p, p.quadros[0], C.ox + C.geo.portao[0] - cx, C.oy + C.geo.portao[1] + ty, false, tinta) }
    if (tier === 0) {
      const p = Arte.peca('castle')
      if (p) { const est = p.estados?.[Math.max(1, Math.min(3, C.vidas))] || 'whole', q = p.quadros[p.anim[est].quadros[0]]; const tr = C.casteloTreme > t && !C.menos ? Math.round(Math.sin(t / 18) * 2) : 0; Arte.desenhar(g, p, q, C.ox + C.geo.castelo[0] - cx + tr, C.oy + C.geo.castelo[1] + ty, false, tinta) }
    }
    for (let k = 0; k < 6; k++) {
      const tr = T[k]; if ((tr.estrada[0] + tr.estrada[1]) / 2 !== yTier) continue
      const X = Math.round(C.ox + tr.x - cx), Y = C.oy + tr.base_predio + ty, t0 = C.terrenos[k], pul = C.pulo[k + 1] > t ? -Math.round(4 * Math.sin(((C.pulo[k + 1] - t) / 300) * Math.PI)) : 0
      if (!t0) { const p = Arte.peca('plot-empty'); if (p) Arte.desenhar(g, p, quadroDaPeca(p, 'plot' + (k + 1), C.menos ? 0 : t), X, Y + 3, false, tinta); continue }
      const c = CONFIG.CARTAS[t0.carta], fam = CONFIG.FAMILIAS[c.familia].nome
      const fl = Arte.peca('plot-flag'); if (fl && fl.anim[fam]) Arte.desenhar(g, fl, quadroDaPeca(fl, fam, C.menos ? 0 : t + k * 90), X - (tr.largura >> 1) + 4, Y + 2, false, tinta)
      if (c.tipo === 'construcao') { const p = Arte.predio(t0.carta), an = p.niveis ? p.niveis[t0.nivel] : Object.keys(p.anim)[0]; Arte.desenhar(g, p, quadroDaPeca(p, an, C.menos ? 0 : t), X + 2, Y + 2 + pul, false, tinta) }
      if (c.tipo === 'magia') { const p = Arte.magia(t0.carta), est = C.magiaAnim?.[k + 1]; Arte.desenhar(g, p, quadroDaPeca(p, est?.nome || 'idle', est ? t - est.t0 : (C.menos ? 0 : t)), X + 2, C.oy + tr.estrada[0] + 9 + ty + pul, false, tinta) }
      for (let i = 0; i < 5; i++) Arte.icone(g, i < t0.nivel ? 'pin-on' : 'pin-off', X - 14 + i * 6, Y - 2)
    }
  }
  function destaques(t) {
    const d = C.destaque; if (!d) return
    const pisca = C.menos ? 1 : 0.55 + 0.45 * Math.sin(t / 160)
    for (let k = 1; k <= 6; k++) {
      const a = C.areaDoTerreno(k), viz = d.vizinhos?.has(k), alvo = d.terrenos?.has(k)
      if (!alvo && !viz) continue
      const x = Math.round(a.x) + 1, y = Math.round(a.y), w = a.w - 2, h = a.h
      if (alvo) {
        g.globalAlpha = k === d.forte ? 1 : 0.35 + 0.4 * pisca; g.fillStyle = '#FFD248'
        for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { g.fillRect(sx > 0 ? cx : cx - 7, sy > 0 ? cy : cy - 2, 7, 2); g.fillRect(sx > 0 ? cx : cx - 2, sy > 0 ? cy : cy - 7, 2, 7) }
        g.globalAlpha = 0.10 + 0.08 * pisca; g.fillRect(x, y, w, h); g.globalAlpha = 1
        if (k === d.forte || d.sobe?.has(k)) { const b = C.menos ? 0 : Math.round(Math.abs(Math.sin(t / 220)) * 5); g.save(); g.translate(x + (w >> 1), y - 6 - b); if (!d.sobe?.has(k)) g.scale(1, -1); Arte.icone(g, 'up', -5, -5); g.restore() }
      }
      if (viz) { const b = C.menos ? 0 : Math.round(Math.abs(Math.sin(t / 200 + k)) * 3); g.globalAlpha = 1; Arte.icone(g, 'up', x + (w >> 1) - 5, y + 6 - b); Arte.texto(g, '+', x + (w >> 1) + 7, y + 8 - b, { fonte: 'reino-ouro' }) }
    }
    g.globalAlpha = 1
  }

  C.sentido = new Int8Array(MAXU)
  const face = (i) => (C.dir[i] * C.sentido[i] < 0 ? -1 : 1) // para que lado da TELA o boneco olha
  /** Um quadro do boneco com a pose por código: desloca, engorda/estica com o pé parado e inclina em 4 faixas (tudo em pixel inteiro). */
  function sprite(img, p, q, X, Y, flip, L, A, I, k) {
    const w = q[2], h = q[3], sx = flip ? img.width - q[0] - w : q[0], ax = flip ? w - 1 - p.ax : p.ax
    if (!L && !A && !I) { g.drawImage(img, sx, q[1], w, h, X - ax * k, Y - p.ay * k, w * k, h * k); return }
    const W = Math.max(4, w + L), H = Math.max(4, h + A), base = Y + (h - p.ay) * k, topo = base - H * k, esq = X - Math.round(ax * W / w) * k
    if (!I) { g.drawImage(img, sx, q[1], w, h, esq, topo, W * k, H * k); return }
    for (let b = 0; b < 4; b++) { const y0 = (h * b) >> 2, y1 = (h * (b + 1)) >> 2, d0 = Math.round(H * b / 4), d1 = Math.round(H * (b + 1) / 4); g.drawImage(img, sx, q[1] + y0, w, y1 - y0, esq + Math.round(I * (1 - b / 3)) * k, topo + d0 * k, W * k, (d1 - d0) * k) }
  }
  /** Estrela de impacto em pixel no ponto do golpe (3 quadros; não é clarão de tela). */
  function estrela(x, y, f, k) {
    const r = [2, 4, 3][f] * k, u = k
    g.fillStyle = '#2B1E3A'; g.fillRect(x - r - u, y - u, r * 2 + 3 * u, 3 * u); g.fillRect(x - u, y - r - u, 3 * u, r * 2 + 3 * u)
    g.fillStyle = f === 2 ? '#FFD248' : '#FFFFFF'; g.fillRect(x - r, y, r * 2 + u, u); g.fillRect(x, y - r, u, r * 2 + u)
    if (f < 2) { g.fillStyle = '#FFD248'; const d = Math.round(r / k * 0.6) * k; g.fillRect(x - d, y - d, u, u); g.fillRect(x + d, y - d, u, u); g.fillRect(x - d, y + d, u, u); g.fillRect(x + d, y + d, u, u) }
  }
  function bonecos(tier, tinta, sombra) {
    const sh = Arte.peca('shadow'), cx = camX(), ty = Math.round(C.trem.y), F = fx(), t = C.relogio
    // 1) marca de lado no chão (de relance: azul-claro = reino, lima = invasor) e sombra de cada um (comprida à tarde, some no ar)
    for (let o = 0; o < C.n; o++) {
      const i = C.ordem[o]; if (C.tier[i] !== tier || C.est[i] !== 1 || C.oculto[i]) continue
      const p = C.peca[i], m = F.marca[C.lado[i] ? (p.w > 100 ? 3 : p.w > 60 ? 2 : 1) : 0]
      const km = C.k[i]; g.globalAlpha = C.lado[i] ? 0.62 : 0.5; g.drawImage(m, Math.round(C.sx[i]) - cx - (m.width >> 1) * km, Math.round(C.sy[i]) + ty - (m.height >> 1) * km, m.width * km, m.height * km)
    }
    for (let o = 0; o < C.n; o++) {
      const i = C.ordem[o]; if (C.tier[i] !== tier || C.est[i] === 0 || C.est[i] >= 3 || C.oculto[i]) continue
      const ar = -C.pDy[i], X = Math.round(C.sx[i]) - cx + sombra.dx + C.pDx[i] * face(i), Y = Math.round(C.sy[i]) + ty
      g.globalAlpha = sombra.alfa * (ar > 2 ? 0.6 : 1)
      if (sh) { const q = sh.quadros[C.peca[i].w > 100 ? 3 : C.peca[i].w > 60 ? 1 : 0], ks = C.k[i], w = Math.max(4, Math.round(q[2] * sombra.estica) - ar * 2); g.drawImage(sh.img, q[0], q[1], q[2], q[3], X - (q[2] >> 1) * ks, Y - 3 * ks, w * ks, q[3] * ks) } else { g.fillStyle = '#2B1E3A'; g.fillRect(X - 7, Y - 1, 14, 2); g.fillRect(X - 5, Y - 2, 10, 4) }
    }
    g.globalAlpha = 1
    // 2) os bonecos, de trás para a frente
    for (let o = 0; o < C.n; o++) {
      const i = C.ordem[o]; if (C.tier[i] !== tier || C.oculto[i]) continue
      const e = C.est[i]; if (e !== 1 && e !== 2 && e !== 5) continue
      const p = C.peca[i], fc = face(i), X = Math.round(C.sx[i]) - cx, Y = Math.round(C.sy[i]) + ty
      if (e === 5) { // virou fumaça: nuvem em pixel que sobe e some (clara no soldado, roxa com faísca lima no invasor, grande no chefe)
        const fu = F.fumaca[C.morteTipo[i] === 0 ? 0 : C.morteTipo[i] === 1 ? 1 : 2], k = C.morteTipo[i] === 2 ? 2 : C.k[i]
        const q = fu.quadros[Arte.quadroDe(fu.anim.play, t - C.morteT[i])]; g.drawImage(fu.img, q[0], q[1], q[2], q[3], X + C.pDx[i] * k - fu.ax * k, Y - fu.ay * k - (p.w > 60 && k === 1 ? 6 : 0), q[2] * k, q[3] * k)
        if (C.morteTipo[i] === 3) { const q2 = fu.quadros[Arte.quadroDe(fu.anim.play, Math.max(0, t - C.morteT[i] - 90))]; g.drawImage(fu.img, q2[0], q2[1], q2[2], q2[3], X + C.pDx[i] - fu.ax + 10, Y - fu.ay - 14, q2[2], q2[3]) }
        continue
      }
      const qs = p.variantes ? p.variantes[C.vari[i]] : p.quadros, flip = (fc < 0) !== p.olhaEsquerda, grandao = p.w > 60
      const tin = tinta || (grandao ? null : TOM_FILEIRA[C.lane[i] < -0.5 ? 2 : C.lane[i] < 0.1 ? 1 : 0])
      const kk = C.k[i], Xp = X + C.pDx[i] * fc * kk, Yp = Y + C.pDy[i] * kk
      sprite(Arte.folhaVar(p.img, tin, flip), p, qs[C.qi[i]], Xp, Yp, flip, C.pLarg[i], C.pAlt[i], C.pIncl[i] * fc, C.k[i])
      if (e !== 1) continue
      // ARMA QUE VARRE, pelo GESTO do tipo: arco de aço (corte, frigideira, esmaga), risco reto (estocada); a bicada é só o pescoço. Some em 3 quadros.
      if (C.fase[i] === Mov.FASE.bote && !C.atirador[i]) {
        const ms = t - C.atqT[i] - C.atqAnt[i], qf = Math.min(2, Math.floor(ms / 35)), gs = C.gesto[i], kv = grandao ? 2 : kk, alt = Math.round(p.ay * 0.5) * kk
        if (gs === 1) { g.fillStyle = '#2B1E3A'; g.fillRect(Xp + fc * 6 * kv - (fc < 0 ? (12 - qf * 3) * kv : 0), Yp - alt - kv, (12 - qf * 3) * kv, 3 * kv); g.fillStyle = qf === 2 ? '#CECAD8' : '#FFFFFF'; g.fillRect(Xp + fc * 7 * kv - (fc < 0 ? (10 - qf * 3) * kv : 0), Yp - alt, (10 - qf * 3) * kv, kv) }
        else if (gs !== 3) { const v = F.varrida, q = v.quadros[qf]; if (fc > 0) g.drawImage(v.img, q[0], q[1], q[2], q[3], Xp + 2 * kv, Yp - alt - v.ay * kv, q[2] * kv, q[3] * kv); else { g.save(); g.translate(Xp - 2 * kv, Yp - alt - v.ay * kv); g.scale(-1, 1); g.drawImage(v.img, q[0], q[1], q[2], q[3], 0, 0, q[2] * kv, q[3] * kv); g.restore() } }
      }
      // IMPACTO: estrela em pixel no ponto do golpe, em TODO golpe (o branco de corpo inteiro fica só para o golpe forte)
      { const mh = t - C.hitT[i]; if (mh >= 0 && mh < 130) estrela(Xp - C.hitDir[i] * Math.round(5 * kk), Yp - Math.round(p.ay * 0.5 * kk), Math.min(2, (mh / 44) | 0), grandao ? 2 : kk) }
      if (C.lado[i] === 0 && C.nv[i] >= 5) marcaDeNivel(i, p, Xp, Yp - Math.round((p.ay - Arte.topoDe(p)) * (kk - 1))) // divisa de ouro do nível 5 (sem crescer com o boneco)
      if (C.barra[i] && C.hp[i] < C.hpMax[i]) barrinha(X, Y - (p.ay - Arte.topoDe(p)) * kk - 5, p.w > 100 ? 40 : 22, C.hp[i] / C.hpMax[i], '#E0503C')
      if (C.preso[i] > C.tb) { g.fillStyle = '#286840'; g.fillRect(X - 6, Y - 4, 12, 2); g.fillStyle = '#469C48'; g.fillRect(X - 4, Y - 7, 2, 4); g.fillRect(X + 2, Y - 8, 2, 5) }
    }
  }
  /** Nível 3+: o líder do grupo leva o estandarte (prata; ouro no 5, com os pinos do nível). Nível 5: cada soldado ganha também uma divisa de ouro que brilha. Só desenho. */
  function marcaDeNivel(i, p, X, Y) {
    const topo = Y - p.ay + Arte.topoDe(p) - 4, max = C.nv[i] >= 5
    if (max) {
      g.fillStyle = '#2B1E3A'; g.fillRect(X - 2, topo, 5, 3)
      g.fillStyle = '#FFD248'; g.fillRect(X - 1, topo + 1, 3, 1); g.fillRect(X, topo, 1, 1)
      if (!C.menos && ((C.relogioReal + i * 97) % 1100) < 180) { g.fillStyle = '#FFF096'; g.fillRect(X, topo - 2, 1, 3); g.fillRect(X - 1, topo - 1, 3, 1) }
    }
    if (C.lider[i] && C.estandarteAntigo) { // (R26: o estandarte do grupo agora é a plaqueta no mastro, uma peça só — ver plaqueta())
      const bx = X + (C.dir[i] * C.sentido[i] < 0 ? 7 : -8), by = topo - 9
      g.fillStyle = '#2B1E3A'; g.fillRect(bx - 1, by - 1, 3, 22); g.fillRect(bx + 1, by - 1, 9, max ? 9 : 7)
      g.fillStyle = '#C48C54'; g.fillRect(bx, by, 1, 20)
      const baixo = C.nv[i] < 3
      g.fillStyle = max ? '#FFD248' : baixo ? '#4884E8' : '#CECAD8'; g.fillRect(bx + 1, by, 7, max ? 7 : 5); g.fillStyle = max ? '#FFF096' : baixo ? '#8CB4FF' : '#FFF6E0'; g.fillRect(bx + 1, by, 7, 1)
      g.fillStyle = '#2B1E3A'; for (let n = 0; n < Math.min(5, C.nv[i]); n++) g.fillRect(bx + 2 + (n % 3) * 2, by + 2 + ((n / 3) | 0) * 2, 1, 1)
    }
  }

  /** Posição, quadro do atlas e POSE de cada boneco neste instante (e o que a pose dispara: poeira do passo, tiro solto, etapas da queda). */
  function atualizarBonecos() {
    const t = C.relogio, med = C.med, entra = C.marcha && !C.menos ? Math.min(1, Math.max(0, (t - C.marchaT0) / 1250)) : 1, cxp = C.cam.x
    for (let i = 0; i < C.n; i++) {
      const e = C.est[i]
      if (e === 0 || e === 3 || e === 4) continue
      const p0 = C.peca[i], inv = C.lado[i] === 1
      // entrada da horda: vem marchando de fora da tela até a posição (só desenho; a luta ainda não começou)
      let desl = false
      { const f = Math.min(1, C.dtAnim / 140), dl = C.laneT[i] - C.lane[i], dd = C.dxeT[i] - C.dxe[i]; if (e === 1) { C.lane[i] += dl * f; C.dxe[i] += dd * f; desl = Math.abs(dd) > 3 } }
      const p = pos(C.xDe(i) + C.dxe[i] - (inv && entra < 1 ? (1 - entra * (2 - entra)) * (60 + (i % 5) * 9) : 0), C.lane[i])
      C.sx[i] = p.x; C.sy[i] = p.y; C.tier[i] = p.tier; C.sentido[i] = p.sent
      Mov.zerar(PO)
      if (e === 5) { if (t - C.morteT[i] >= 560) C.est[i] = 4; continue }
      const fc = face(i), peso = pesoDe(p0), qs = p0.anim
      if (e === 2) { // ---- caindo
        const ms = t - C.morteT[i], tipo = C.morteTipo[i], fall = qs.fall, durQ = Arte.duracao(fall)
        let acabou = false
        if (tipo === 0) { Mov.tombo(PO, ms, durQ); C.qi[i] = Arte.quadroDe(fall, ms); if (ms >= durQ) { acabou = true; med.tombos++ } }
        else if (tipo === 1) { Mov.estouro(PO, ms); C.qi[i] = qs.hit.quadros[qs.hit.quadros.length - 1]; if (ms >= Mov.ESTOURO_MS) { acabou = true; med.estouros++; for (let k = 0; k < 3; k++) C.particula(p.x, p.y - 12, (k - 1) * 46, -70 - k * 12, 340, k === 1 ? 9 : 5, 1 + (k & 1)) } }
        else if (tipo === 3) { C.qi[i] = Arte.quadroDe(fall, ms); if (ms >= durQ) { acabou = true; med.tombos++; C.efeito('dust', p.x - 8, p.y + 2); C.efeito('dust', p.x + 8, p.y + 2, true) } }
        else { // chefe: cambaleia → ajoelha → tomba → poeira e tremor → fumaça grande
          const et = Mov.quedaDoChefe(PO, ms), msQ = ms - Mov.CHEFE.cambaleia - Mov.CHEFE.ajoelha
          C.qi[i] = et < 3 ? qs.hit.quadros[qs.hit.quadros.length - 1] : Arte.quadroDe(fall, msQ)
          if (et !== C.etapa[i]) { C.etapa[i] = et; med.chefeEtapas.push(et); if (et === 2) C.efeito('dust', p.x - 14 * fc, p.y + 2) }
          if (et === 1 && Math.floor(ms / 130) !== Math.floor((ms - C.dtAnim) / 130)) C.efeito('spark', p.x + (((ms / 130) | 0) % 3 - 1) * 16, p.y - 30 - (((ms / 130) | 0) % 2) * 20) // estalos pelo corpo
          if (et === 3 && msQ >= durQ) { acabou = true; med.chefeEtapas.push(4); C.tremer(6, 120); C.efeito('dust', p.x - 22, p.y + 2); C.efeito('dust', p.x + 22, p.y + 2, true); porEfeito(fx().anelPo, p.x, p.y, false, fx().anelPo.anim.play) }
        }
        C.pDx[i] = PO.dx; C.pDy[i] = PO.dy; C.pLarg[i] = PO.larg; C.pAlt[i] = PO.alt; C.pIncl[i] = PO.incl
        if (acabou) { C.est[i] = 5; C.morteT[i] = t; C.pDx[i] = PO.dx * (tipo === 0 ? fc : 0); med.fumacas++; if (C.gatilho) C.gatilho(tipo === 2 ? 'fumacaChefe' : 'fumaca', p.x - cxp, p.y) }
        continue
      }
      // ---- vivo: quadro do atlas
      let an = C.anim[i], ms = t - C.animT[i], a = qs[ANIMS[an]]
      const movendo = C.v[i] !== 0 || (inv && entra < 1) || desl
      if (!a.loop && ms >= Arte.duracao(a)) { an = C.anim[i] = movendo ? AN.walk : AN.idle; a = qs[ANIMS[an]] }
      else if (an <= AN.walk) { const quer = movendo ? AN.walk : AN.idle; if (quer !== an) { an = C.anim[i] = quer; a = qs[ANIMS[an]]; if (quer === AN.walk) C.animT[i] = t - (i * 61) % 300 } }
      ms = t - C.animT[i]
      if (C.menos && an === AN.idle) ms = 0
      C.qi[i] = Arte.quadroDe(a, ms)
      // ---- pose por código
      if (C.dirV[i] !== C.dir[i]) { C.dirV[i] = C.dir[i]; C.viraT[i] = t; med.viradas++ }
      if (an === AN.walk) {
        const meio = (a.total || Arte.duracao(a)) / 2, pisou = Mov.passo(PO, ms, meio, peso > 1 ? 1 : 2), np = Math.floor(ms / meio)
        if (pisou && np !== C.passoN[i]) { C.passoN[i] = np; med.passos++; if (!C.oculto[i] && C.particula(p.x - fc * 4, p.y, -fc * 14, -10, 260, 1, peso > 1 ? 2 : 1, 1, peso > 1 ? 1 : 0)) med.poeiras++ } // poeira no pé (enfeite: só com teto sobrando)
      } else if (an === AN.idle && !C.menos) Mov.parado(PO, t + i * 397)
      if (!inv && !C.menos) Mov.grito(PO, t - C.gritoT - (i % 6) * 55)
      if (C.fimT > 0) { const mf = t - C.fimT - (i % 4) * 70, ganhou = (C.lado[i] === 0) === C.fimVitoria; if (ganhou) { if (!C.menos) Mov.festa(PO, mf) } else if (!inv) Mov.recuo(PO, mf) } // fim da luta: quem venceu comemora, o reino vencido recua um passo
      const msA = t - C.atqT[i]
      let fase = 0
      if (msA < C.atqAnt[i] + 400) {
        fase = Mov.golpe(PO, msA, C.atqAnt[i], peso, C.gesto[i], C.atqDist[i])
        if (C.atqSolta[i] && msA >= C.atqAnt[i]) { // fim da antecipação: solta o tiro para ele chegar junto com o dano
          C.atqSolta[i] = 0; const j = C.atqAlvo[i]
          if (j >= 0 && j < C.n) { const tp = C.projetilDe(i); if (tp !== 'nada') { C.projetil(p.x + fc * 8, p.y - p0.ay * 0.5, C.sx[j], C.sy[j] - C.peca[j].ay * 0.45, tp); if (C.gatilho) C.gatilho(tp, p.x - cxp, p.y) } }
        }
      }
      if (fase !== C.fase[i]) {
        C.fase[i] = fase
        if (fase === 2 && !C.oculto[i] && !C.atirador[i]) { if (C.particula(p.x - fc * 5, p.y, -fc * 26, -12, 240, 1, 2, 1) | C.particula(p.x - fc * 2, p.y, -fc * 12, -20, 200, 1, 1, 1)) med.poBote++ } // poeira no pé de quem dá o bote
        if (fase === 2) med.gestos[C.gesto[i]]++
        if (fase === 1) med.antecipa++; else if (fase === 2) { med.bote++; if (!C.atirador[i] && !C.oculto[i]) med.varridas++ } else if (fase === 3) med.volta++
        if (fase === 1 && med.seqDe < 0 && !C.atqTiro[i]) med.seqDe = i
        if (med.seqDe === i && med.seq.length < 8) med.seq.push(fase)
        if (fase === 1 && C.gatilho) C.gatilho(C.atqTiro[i] ? 'mira' : p0.w > 100 ? 'golpeChefe' : 'golpe', p.x - cxp, p.y)
      }
      Mov.apanhou(PO, t - C.hitT[i], C.hitDir[i] * fc, C.hitF[i])
      Mov.virada(PO, t - C.viraT[i], p0.w)
      C.pDx[i] = PO.dx; C.pDy[i] = PO.dy; C.pLarg[i] = PO.larg; C.pAlt[i] = PO.alt + C.altV[i]; C.pIncl[i] = PO.incl
    }
    if (ordenar) for (let i = 0; i < C.n; i++) C.ordem[i] = i
    if (ordenar || (C.quadro & 7) === 0) { // inserção: quase sempre já está em ordem
      for (let a = 1; a < C.n; a++) { const v = C.ordem[a], y = C.sy[v]; let b = a - 1; while (b >= 0 && C.sy[C.ordem[b]] > y) { C.ordem[b + 1] = C.ordem[b]; b-- } C.ordem[b + 1] = v }
      ordenar = false
    }
  }
  C.quadro = 0; C.relogioReal = 0; C.zonaTitulo = null; C.numerosPulados = 0; C.dtAnim = 0

  /** Linha em pixel (flecha, virote, raio). */
  function linha(x0, y0, x1, y1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let k = 0; k <= n; k++) g.fillRect(Math.round(x0 + (x1 - x0) * k / (n || 1)), Math.round(y0 + (y1 - y0) * k / (n || 1)), 1, 1) }
  function flecha(x, y, ux, uy, comp, corpo) { // ponta em (x, y), apontando para (ux, uy)
    const tx = x - ux * comp, ty = y - uy * comp
    g.fillStyle = '#2B1E3A'; linha(tx, ty + 1, x, y + 1); linha(tx - ux, ty - uy - 1, x, y - 1)
    g.fillStyle = corpo; linha(tx, ty, x, y)
    g.fillStyle = '#FFF6E0'; g.fillRect(Math.round(tx), Math.round(ty), 1, 1); g.fillRect(Math.round(tx + ux), Math.round(ty + uy), 1, 1)
    g.fillStyle = '#CECAD8'; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.fillRect(Math.round(x - ux), Math.round(y - uy), 1, 1)
  }
  /** Projéteis em arco, com rastro curto; ao chegar: flecha FINCADA, batata e torta espatifam. */
  function projeteis(t) {
    const cx = camX(), ty = Math.round(C.trem.y)
    for (const f of C.finc) { // fincadas: ficam 420 ms e somem piscando no fim
      const ms = t - f.t0; if (ms < 0 || ms > 420 || (ms > 320 && ((ms / 40) & 1))) continue
      const x = Math.round(f.x) - cx, y = Math.round(f.y) + ty, tre = ms < 90 ? Math.round(Math.sin(ms / 12) * 1) : 0
      flecha(x, y, (f.esq ? -0.78 : 0.78), 0.62, 8, '#C48C54'); if (tre) { g.fillStyle = '#FFF6E0'; g.fillRect(x - (f.esq ? -6 : 6), y - 6 + tre, 1, 1) }
    }
    for (const p of C.proj) {
      const f = (t - p.t0) / p.dur; if (f < 0 || p.chegou) continue
      const dx = p.x1 - p.x0, dy = p.y1 - p.y0, dist = Math.abs(dx), alto = p.tipo === 'virote' || p.tipo === 'falcao' ? 3 : Math.min(26, 8 + dist * 0.13)
      if (f >= 1) { // chegou
        p.chegou = true
        if (p.tipo === 'flecha' || p.tipo === 'virote') { let a = C.finc[0]; for (const q of C.finc) if (q.t0 < a.t0) a = q; a.x = p.x1 + (dx > 0 ? 3 : -3); a.y = p.y1 + 7; a.t0 = t; a.esq = dx < 0; C.med.fincadas++ }
        else if (p.tipo === 'torta') C.efeito('pie', p.x1, p.y1, false, 'splat')
        else if (p.tipo === 'batata') { C.particula(p.x1, p.y1, -30, -50, 260, 1, 2); C.particula(p.x1, p.y1, 34, -40, 240, 11, 1) }
        continue
      }
      const em = (ff) => [p.x0 + dx * ff - cx, p.y0 + dy * ff - Math.sin(ff * Math.PI) * alto + ty], [x, y] = em(f), [xa, ya] = em(Math.max(0, f - 0.06)), d = Math.hypot(x - xa, y - ya) || 1, ux = (x - xa) / d, uy = (y - ya) / d
      if (p.tipo === 'raio') { // raio do Sparkwright: zigue-zague que troca a cada 40 ms
        const n = 5, s = ((t - p.t0) / 40) | 0
        for (let pass = 0; pass < 2; pass++) { g.fillStyle = pass ? '#FFF6E0' : '#96ECE2'; let ax = p.x0 - cx, ay = p.y0 + ty; for (let k = 1; k <= n; k++) { const bx = p.x0 + dx * k / n - cx, by = p.y0 + dy * k / n + ty + (k < n ? (((k * 7 + s * 3) % 5) - 2) * 3 : 0); linha(ax, ay + pass, bx, by + pass); ax = bx; ay = by } }
        continue
      }
      // rastro curto: 3 pontos que afinam
      for (let k = 1; k <= 3; k++) { const [rx, ry] = em(Math.max(0, f - k * 0.075)); g.globalAlpha = 0.55 - k * 0.14; g.fillStyle = p.tipo === 'batata' ? '#E8C48A' : p.tipo === 'torta' ? '#F58CC4' : '#FFF6E0'; g.fillRect(Math.round(rx), Math.round(ry), k === 1 ? 2 : 1, k === 1 ? 2 : 1) }
      g.globalAlpha = 1
      if (p.tipo === 'flecha') flecha(Math.round(x), Math.round(y), ux, uy, 8, '#C48C54')
      else if (p.tipo === 'virote') flecha(Math.round(x), Math.round(y), ux, uy, 11, '#9E98B4')
      else { const ar = Arte.peca(p.tipo === 'batata' ? 'spud' : p.tipo === 'torta' ? 'pie' : 'falcon'); if (ar) Arte.desenhar(g, ar, ar.quadros[Arte.quadroDe(ar.anim.play, (t - p.t0) * (p.tipo === 'batata' ? 2 : 1) % Arte.duracao(ar.anim.play))], Math.round(x), Math.round(y), dx < 0); else { g.fillStyle = '#FFF6E0'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3) } }
    }
  }
  /** Números: o dano salta em arco e cai (o forte maior, em ouro, com "!"; a cura em verde); o texto de magia sobe reto. */
  function numeros(t) {
    const zt = C.zonaTitulo
    for (const n of C.num) {
      const dur = n.tipo === 3 ? 500 : DUR_NUM, f = (t - n.t0) / dur; if (f < 0 || f >= 1) continue
      let x, y, fonte
      if (n.tipo === 3) { if (f > 0.75 && ((C.quadro >> 1) & 1) && !C.menos) continue; x = n.x - C.cam.x; y = n.y - Math.round(f * 10) - (n.grande ? 6 : 0); fonte = n.grande && /^[0-9!]+$/.test(n.s) && Arte.temFonte('dano-g-ouro') ? 'dano-g-ouro' : n.ouro ? 'reino-ouro' : 'reino-contorno' }
      else {
        const arco = C.menos ? 9 : Math.round(47.3 * f - 43 * f * f) // sobe 13 px e cai até 4 acima de onde nasceu
        x = n.x - C.cam.x + (C.menos ? 0 : Math.round(n.lado * 7 * f)); y = n.y - arco - (n.grande ? 6 : 0)
        const gde = n.grande || (n.tipo === 1 && n.v >= 40)
        fonte = n.tipo === 2 ? (Arte.temFonte('reino-verde') ? 'reino-verde' : 'reino-contorno') : n.tipo === 1 ? (gde && Arte.temFonte('dano-g-ouro') ? 'dano-g-ouro' : 'reino-ouro') : gde && Arte.temFonte('dano-g') ? 'dano-g' : n.v < 6 && Arte.temFonte('mini-contorno') ? 'mini-contorno' : 'reino-contorno'
        if (f > 0.86) g.globalAlpha = 0.55
      }
      if (zt) { // a zona do título (letreiro grande na tela): o número que cairia em cima dele não é desenhado
        const z = C.cam.zoom, sx = z === 1 ? x : C.cam.fx + (x - C.cam.fx) * z, sy = z === 1 ? y : C.cam.fy + (y - C.cam.fy) * z, mw = (n.grande ? 22 : 12) * z, mh = (n.grande ? 18 : 10) * z
        if (sx + mw > zt.x && sx - mw < zt.x + zt.w && sy + mh > zt.y && sy - 2 < zt.y + zt.h) { C.numerosPulados++; g.globalAlpha = 1; continue }
      }
      Arte.texto(g, n.s, x, y, { fonte, alinhar: 'centro' }); g.globalAlpha = 1
    }
  }

  // gravador de TIRAS (prova de movimento): copia N quadros seguidos de um recorte do mundo, lado a lado. Só com ?teste=1.
  C.gravador = null
  C.gravar = ({ gatilho = '', n = 8, cada = 3, w = 120, h = 90, x = null, y = null, atraso = 0, dx = 0, dy = 0, zoom = 1 } = {}) => { const c = Px.tela(w * C.e * n * zoom, h * C.e * zoom); c.getContext('2d').imageSmoothingEnabled = false; C.gravador = { gatilho, n, cada, w, h, x, y, dx, dy, zoom, atraso, tela: c, i: 0, cont: 0, armado: !gatilho, pronta: false } }
  C.gatilho = (nome, x, y) => { const G = C.gravador; if (!G || G.armado || G.pronta || G.gatilho !== nome) return; G.armado = true; if (G.x == null) { G.x = x + G.dx; G.y = y - G.h * 0.22 + G.dy } }
  C.tira = () => (C.gravador?.pronta ? C.gravador.tela.toDataURL('image/png') : null)
  function gravarQuadro() {
    const G = C.gravador; if (!G || !G.armado || G.pronta) return
    if (G.atraso > 0) { G.atraso--; return }
    if (G.cont++ % G.cada) return
    const e = C.e, w = G.w * e, h = G.h * e, sx = Math.max(0, Math.min(canvas.width - w, Math.round(((G.x ?? C.VW / 2) - G.w / 2) * e))), sy = Math.max(0, Math.min(canvas.height - h, Math.round(((G.y ?? C.VH / 2) - G.h / 2) * e)))
    G.tela.getContext('2d').drawImage(canvas, sx, sy, w, h, G.i * w * G.zoom, 0, w * G.zoom, h * G.zoom)
    if (++G.i >= G.n) G.pronta = true
  }

  /** Um quadro do mundo. `dtAnim` = ms de animação que passaram (0 = parado). */
  C.desenhar = (agora, dtReal, dtAnim) => {
    C.quadro++; C.relogio += dtAnim; C.relogioReal += C.menos ? 0 : dtReal; C.dtAnim = dtAnim
    const t = C.relogio
    // câmera, tremida e empurrão
    if (C.trem.ate > agora && !C.menos) { const k = C.trem.px; C.trem.x = Math.round(Math.sin(agora / 11) * k); C.trem.y = Math.round(Math.cos(agora / 13) * k * 0.6); C.tremidaMax = Math.max(C.tremidaMax, Math.abs(C.trem.x), Math.abs(C.trem.y)) } else { C.trem.x = 0; C.trem.y = 0 }
    if (C.cam.kick && !C.menos) { C.trem.x += Math.round(C.cam.kick); C.cam.kick *= Math.pow(0.004, dtReal / 1000); if (Math.abs(C.cam.kick) < 0.5) C.cam.kick = 0 } else C.cam.kick = 0
    if (C.menos) C.cam.x = 0; else { const d = C.cam.alvo - C.cam.x, passo = (C.cam.vel || 24) * dtReal / 1000; C.cam.x += Math.abs(d) <= passo ? d : Math.sign(d) * passo }
    if (C.menos) { C.cam.zoom = C.cam.zoomAlvo = 1 } else {
      if (C.cam.zoomAlvo !== 1 && agora > C.cam.zoomAte) C.cam.zoomAlvo = 1
      if (C.cam.zoom !== C.cam.zoomAlvo) { const d = C.cam.zoomAlvo - C.cam.zoom, k = 1 - Math.pow(0.001, dtReal / (d > 0 ? 170 : 260)); C.cam.zoom += d * k; if (Math.abs(C.cam.zoomAlvo - C.cam.zoom) < 0.006) C.cam.zoom = C.cam.zoomAlvo }
      if (C.cam.zoom > C.med.zoomMax) C.med.zoomMax = C.cam.zoom
    }
    { // no fim de partida do PC o mundo sobe para a placa caber embaixo
      const pc = C.tipo === 'pc', alvoY = pc && C.fimDeJogo ? -36 : 0, // na luta o mundo não sai do lugar: o painel de resumo ocupa a base
       d = alvoY - C.camY, passo = C.menos ? 1e9 : 70 * dtReal / 1000
      C.camY += Math.abs(d) <= passo ? d : Math.sign(d) * passo; C.oy = C.oyBase + Math.round(C.camY)
    }
    if (C.mix < 1) C.mix = Math.min(1, C.mix + dtReal / 2000)
    viv = 0; for (let i = 0; i < MAXP; i++) if (C.pvida[i] > 0) viv++; for (const e of C.ef) if (e.ate > t) viv++
    atualizarBonecos(); agrupar()
    // o trecho da estrada (e o de onde se vem, na virada de 2 s)
    const tr = C.trecho(), cen = S.cen(tr), de = C.mix < 1 ? S.cen(trechoDe(C.horaDe, C.portoesDe)) : null
    if (C.med.trechos[C.med.trechos.length - 1] !== tr && C.med.trechos.length < 40) C.med.trechos.push(tr)
    const dono = C.mix >= 0.5 ? cen : de, tinta = dono.tinta, sombra = dono.luz.sombra, Tv = C.relogioReal
    g.setTransform(C.e, 0, 0, C.e, 0, 0); g.imageSmoothingEnabled = false
    if (C.cam.zoom !== 1) { const z = C.cam.zoom; g.translate(C.cam.fx, C.cam.fy); g.scale(z, z); g.translate(-C.cam.fx, -C.cam.fy) }
    const frente = []
    const camadas = (c, alfa) => { for (const p of c.planos) { if (p.nome === 'front' || p.nome === 'verge') { frente.push(p, alfa); continue } /* beira da estrada e primeiro plano: na frente dos bonecos */ plano(p, alfa); if (p.nome === 'sky') nuvens(c, alfa) } }
    if (de) camadas(de, 1)
    camadas(cen, de ? C.mix : 1)
    g.globalAlpha = 1
    if (de) S.vidaDeTras(de, 1 - C.mix, Tv)
    S.vidaDeTras(cen, de ? C.mix : 1, Tv)
    vida()
    const cxB = camX(), tyB = Math.round(C.trem.y)
    for (let tier = 0; tier < C.tiers.length; tier++) { moveis(tier, tinta, t); S.beira(dono, tier, 1, Tv, cxB, tyB); if (tier === C.tiers.length - 1 && C.antesDosBonecos) C.antesDosBonecos(g, t); bonecos(tier, tinta, sombra) }
    etiquetas()
    destaques(agora)
    projeteis(t)
    // efeitos animados e partículas
    let np = 0
    for (const e of C.ef) { if (e.ate <= t) continue; np++; if (t < e.t0) continue; Arte.desenhar(g, e.p, e.p.quadros[Arte.quadroDe(e.anim, t - e.t0)], Math.round(e.x - C.cam.x + C.trem.x), Math.round(e.y + C.trem.y), e.flip, null, e.k) }
    const s = dtAnim / 1000, cxP = Math.round(C.cam.x)
    for (let i = 0; i < MAXP; i++) {
      if (C.pvida[i] <= 0) continue
      np++; C.pvida[i] -= dtAnim; const tp = C.ptipo[i], f = Math.max(0, C.pvida[i] / C.pvida0[i])
      C.px[i] += C.pvx[i] * s; C.py[i] += C.pvy[i] * s
      let tam = C.ptam[i], cor = CORES_P[C.pcor[i]]
      if (tp === 1) { C.pvx[i] *= Math.pow(0.02, s); C.pvy[i] -= 26 * s; tam = f > 0.55 ? tam + 1 : f > 0.25 ? tam : Math.max(1, tam - 1); if (f < 0.3 && ((i + C.quadro) & 1)) continue } // poeira: freia, sobe e some pontilhada
      else if (tp === 2) { C.pvy[i] += 210 * s; cor = BRASA[Math.min(4, Math.floor(f * 5))] } // brasa: cai e esfria (branco → ouro → laranja → carmim)
      else C.pvy[i] += 160 * s
      g.fillStyle = cor; g.fillRect(Math.round(C.px[i]) - cxP, Math.round(C.py[i]), tam, tam)
    }
    if (np > C.picoParticulas) C.picoParticulas = np
    for (let i = 0; i < frente.length; i += 2) plano(frente[i], frente[i + 1])
    g.globalAlpha = 1
    S.vidaDaFrente(dono, 1, Tv)
    numeros(t)
    if (C.depoisDoMundo) C.depoisDoMundo(g, t)
    g.setTransform(C.e, 0, 0, C.e, 0, 0)
    if (C.noite > 0) { g.globalAlpha = C.noite * 0.38; g.fillStyle = '#141432'; g.fillRect(0, 0, C.VW, C.VH); g.globalAlpha = 1 }
    if (!vinheta) vinheta = fazerVinheta()
    g.globalAlpha = Math.min(1, (de ? de.luz.vinheta * (1 - C.mix) + cen.luz.vinheta * C.mix : cen.luz.vinheta) * 2.6 + (C.emLuta ? 0.12 : 0)); g.drawImage(vinheta, 0, 0); g.globalAlpha = 1
    if (C.emLuta) { if (!moldura) moldura = Px.moldura(C.VW, C.VH, C.tipo === 'celular'); g.drawImage(moldura, 0, 0); C.med.moldura = 1 }
    if (C.flashAte > agora) { g.globalAlpha = 0.32 * ((C.flashAte - agora) / C.flashMs); g.fillStyle = C.flashCor; g.fillRect(0, 0, C.VW, C.VH); g.globalAlpha = 1 }
    gravarQuadro()
  }
  try { if (/[?&]teste=1/.test(location.search)) window.__kmCena = C } catch { /* fora do navegador */ }
  return C
}
