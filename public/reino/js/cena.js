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
const VOO_MS = 210 // VAO: quanto cada frente segura da LINHA do choque (centésimos de terreno): entre as duas sobra 1 boneco
// GESTO de cada tipo de carta e de invasor (movimento.js): cada um bate de um jeito reconhecível
// R28: mordida (Scoffer), portada (Doorman), investida (Sir Dent) e barrigada (Bloater) — as tropas que mais aparecem saíram do corte genérico
export const COR_CHEFE = '#FFF6E0' // R38: contorno claro do chefe (creme: o tom mais claro da paleta, lê de dia e na noite de chefe)
const VIZ8 = [-1, 0, 1, 0, 0, -1, 0, 1, -1, -1, 1, -1, -1, 1, 1, 1]
const COR_MULTIDAO = ['#2E4A34', '#4A3A2A', '#4A2E3A', '#1E2440'] // contorno da multidão que espera: a sombra do próprio trecho (campos, vila, portões, noite)
const GESTOS = { T01: 1, T02: 7, T03: 8, T07: 2, T11: 3, muncher: 6, stilt: 1, mole: 2, drum: 2, bloater: 9 }

export function criarCena(canvas, CONFIG) {
  let VAO = 36 // (PC 44, celular 34: entre as duas frentes cabe 1 boneco inteiro de ar)
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
    idTipo: new Array(MAXU), grOff: new Float32Array(MAXU), chega: new Uint8Array(MAXU), entraT: new Float64Array(MAXU), nuvem: new Uint8Array(MAXU), brilhoQ: new Int32Array(MAXU), atirador: new Uint8Array(MAXU), lutaT: new Float64Array(MAXU), gesto: new Uint8Array(MAXU), atqDist: new Float32Array(MAXU), fimT: -1e9, fimVitoria: false, laneT: new Float32Array(MAXU), dxeT: new Float32Array(MAXU), ocultoAnt: new Uint8Array(MAXU), balde: new Int16Array(MAXU), altV: new Int8Array(MAXU), repMax: 6, kRep: 1, grupo: new Uint8Array(MAXU), atqT: new Float64Array(MAXU), atqAnt: new Float32Array(MAXU), atqTiro: new Uint8Array(MAXU), atqAlvo: new Int16Array(MAXU), atqSolta: new Uint8Array(MAXU),
    // R38 — CHEFE LEGÍVEL: quem é chefe (contorno claro), a barra de vida dele (`chefe`: a batalha entrega) e a câmera perto do celular (`perto`)
    ehChefe: new Uint8Array(MAXU), chefeVivo: false, chefe: null, perto: false, setas: [], zonaChances: null,
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
  C.zerarMedidas = () => { C.med = { antecipa: 0, bote: 0, volta: 0, seq: [], seqDe: -1, fumacas: 0, quadrosLuta: 0, abracos: 0, plaquetas: 0, gestos: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], cascata: 0, poBote: 0, festas: 0, recuos: 0, numPorGrupo: 0, vaoMin: 99, riscoK: 0, hordaComGrande: 0, quadrosChefe: 0, chefeColado: 0, riscosFortes: 0, frenteBaixa: 0, riscos: 0, hordaMax: 0, silMax: 0, silhuetas: 0, vagas: 0, vagaPassos: 0, pisoes: 0, enquadre: 0, duelo: 0, ladoErrado: 0, caixas: 0, quadrosPortao: 0, vaoRepouso: 999, foraDoPortao: 0, cortados: 0, fumacinhas: 0, fumacasJuntas: 0, fumacasSeguradas: 0, nuvens: 0, fumacaMs: 0, fumacaLado: 0, numAlternados: 0, numEsperas: 0, numColados: 0, quadrosNum: 0, brilhos: 0, sombrasNoPulo: 0, bandeirolas: 0, gruposCaidos: 0, pausaGrupoMs: 0, lentoMs: 0, repsCaidos: 0, repsMax: 0, estrelas: 0, varridas: 0, tombos: 0, estouros: 0, chefeEtapas: [], passos: 0, poeiras: 0, viradas: 0, flechas: 0, fincadas: 0, explosoes: 0, aneis: 0, somados: 0, numeros: 0, zoomMax: 1, empurrao: 0, brancosLog: [], meioPixel: 0, trechos: [], chefeContorno: 0, apagados: 0, chefeBarra: 0, chefeBarraRet: null, numPxMin: 999, perto: 0, pertoCortes: 0, pertoZoom: 1, setaDesviada: 0 }; C.tremidaMax = 0; C.picoParticulas = 0; C.flashes.length = 0 }
  C.zerarMedidas()
  const CORES_P = ['#FFF6E0', '#E8C48A', '#FFD248', '#CC3C3E', '#4884E8', '#9248C8', '#7CC950', '#E0489B', '#CECAD8', '#B6F03C', '#E87E2E', '#704C3E']
  const BRASA = ['#704C3E', '#CC3C3E', '#E87E2E', '#FFD248', '#FFF6E0']
  const P = { x: 0, y: 0, tier: 0, sent: 1 }, PO = Mov.pose()
  const S = criarCenario(C)
  let vinheta = null, moldura = null, frenteBaixa = null
  // folhas feitas por código, uma vez (particulas.js)
  let FX = null
  const fx = () => FX || (FX = { fumaca: [Px.fumaca('#FFFFFF', '#C9C4DA', null, 1), Px.fumaca('#DDBEF4', '#8E59C2', '#B6F03C', 4), Px.fumaca('#F4ECE0', '#9E98B4', '#FFD248', 7), Px.fumaca('#E8E2D4', '#8C8498', null, 11)], fumacinha: [Px.fumacinha('#FFFFFF', '#C9C4DA'), Px.fumacinha('#DDBEF4', '#8E59C2', '#B6F03C')], gesto: { mordida: Px.mordida(), lasca: Px.lasca(), risco: Px.risco(), rastro: Px.rastro(), onda: Px.onda() }, anel: Px.anel('#FFF6E0', '#FFD248'), anelPo: Px.anel('#E8C48A', '#CDA068'), varrida: Px.varrida(), marca: [Px.marca(CONTORNO.aliado), Px.marca(CONTORNO.invasor), Px.marca(CONTORNO.invasor, 30, 10), Px.marca(CONTORNO.invasor, 54, 14)] })

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
    C.repMax = C.tipo === 'celular' ? 3 : 5; C.kRep = (C.e + 1) / C.e // R26: 3 no celular (a estrada tem 18 px: 4 não cabem com folga)
    for (let i = 0; i < C.n; i++) if (C.peca[i] && C.peca[i].w <= (C.tipo === 'pc' ? 100 : 60)) C.k[i] = C.kRep
    caminho(); vinheta = null; moldura = null; frenteBaixa = null
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
    bordaDoPortao()
    const t0 = T[0]; C.meiaFaixa = (t0.estrada[1] - t0.estrada[0]) / 2 - (C.tipo === 'celular' ? 0 : 2) // celular: a fileira usa a estrada inteira (a multidão não vira mancha)
  }
  /** R28 — a horda DENTRO da tela: `xeBorda` = o ponto da estrada (centésimos) em que um representante ainda cabe inteiro junto da
   *  borda de entrada (com a câmera no portão); `linMin` = o mais perto do portão que a linha do choque pode ficar para a frente da
   *  horda caber inteira; `fundoMax` = quanto a fila pode crescer para trás antes de se apertar. */
  function bordaDoPortao() {
    const pc = C.tipo === 'pc', passo = pc ? 30 : 34, cols = Math.ceil(C.repMax / (pc ? 3 : 2)), a = C.pts[0], b = C.pts[1]
    VAO = pc ? 44 : C.dueloCurto ? 26 : 34 // R32: no duelo do celular (≤ 4 representantes) os dois lados chegam mais perto
    const margem = (pc ? 6 : 4) + Math.ceil(10 * C.kRep), cam = C.menos || !pc ? 0 : C.camMin, ppc = (b[1] - a[1]) / (b[0] - a[0]) // px de arte por centésimo
    C.xeBorda = ppc > 0 ? a[0] + (margem + cam - C.ox - a[1]) / ppc : -1e9
    C.linMin = C.xeBorda + VAO + (cols - 1) * passo + passo * 0.42 + 4
    C.fundoMax = (pc ? 4 : 2) * passo; C.ppc = ppc
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
  // R28 — LINHA DE FRENTE DURA. A estrada é uma fila só (posição do motor em centésimos de terreno); cada grupo VIVO do reino divide
  // a horda em TRECHOS (quem ainda não passou dele × quem já saiu do outro lado, como a toupeira). Entre um trecho e o grupo da frente
  // há uma LINHA (o meio entre a frente da horda e a frente do grupo, no motor): todo invasor desenhado fica antes de linha − VAO e todo
  // defensor depois de linha + VAO, em TODO quadro (parado, andando, chegando, recuando). Só o BOTE cruza (ele é pose, não posição).
  // O motor continua sendo a verdade da regra: isto é só onde o boneco é desenhado.
  const LUG = { lane: 0, dxe: 0 }
  const aLutaT = new Float64Array(NG).fill(-1e9)
  const aFr = new Float32Array(NG), gFr = new Float32Array(NREG * NTIPO)
  const linR = new Float32Array(NG).fill(NaN), linL = new Float32Array(NG).fill(NaN), gMinM = new Float32Array(NG), gMaxM = new Float32Array(NG), gDes = new Float32Array(NG), gLo = new Float32Array(NG).fill(-1e9), gHi = new Float32Array(NG).fill(1e9), aOff = new Float32Array(NG), ordG = new Uint8Array(NG)
  const sFI = new Float32Array(NG + 1), sBI = new Float32Array(NG + 1), sLo = new Float32Array(NG + 1).fill(-1e9), sHi = new Float32Array(NG + 1).fill(1e9), secB = new Int16Array(NG + 1)
  const bFr = new Float32Array(NREG * NTIPO), bSec = new Int8Array(NREG * NTIPO), bOff = new Float32Array(NREG * NTIPO), bPerto = new Uint8Array(NREG * NTIPO), bPrim = new Int16Array(NREG * NTIPO), gCnt = new Int16Array(NREG * NTIPO), pertos = new Int16Array(64), bAl = new Uint8Array(NREG * NTIPO), regFundo = new Float32Array(NREG), regFr = new Float32Array(NREG), silN = new Uint8Array(NREG), regPeso = new Uint8Array(NREG), silUlt = new Float32Array(NREG), brN = new Uint8Array(NG + 1), secRes = new Float32Array(NG + 1)
  let nViv = 0
  C.sec = new Uint8Array(MAXU)
  /** As linhas de frente deste quadro (só contas do motor; roda ANTES de posicionar os bonecos). */
  function frentes() {
    gMinM.fill(1e9); gMaxM.fill(-1e9); gDes.fill(-1e9); sFI.fill(-1e9); sBI.fill(1e9)
    for (let i = 0; i < C.n; i++) { if (C.lado[i] !== 0 || C.est[i] !== 1) continue; const k = C.grupo[i] % NG, x = C.xDe(i); if (x < gMinM[k]) gMinM[k] = x; if (x > gMaxM[k]) gMaxM[k] = x; if (x + C.dxe[i] > gDes[k]) gDes[k] = x + C.dxe[i] }
    nViv = 0
    for (let k = 0; k < NG; k++) { if (gMinM[k] > 1e8) { linR[k] = NaN; linL[k] = NaN; gLo[k] = -1e9; gHi[k] = 1e9; continue } let a = nViv++; while (a > 0 && gMinM[ordG[a - 1]] > gMinM[k]) { ordG[a] = ordG[a - 1]; a-- } ordG[a] = k }
    for (let i = 0; i < C.n; i++) { if (C.lado[i] !== 1 || C.est[i] !== 1) continue; const x = C.xDe(i); let s = 0; for (let q = 0; q < nViv; q++) if (x > gMaxM[ordG[q]] + 10) s = q + 1; C.sec[i] = s; if (x > sFI[s]) sFI[s] = x; if (x < sBI[s]) sBI[s] = x }
    // R32 — o CHEFE com AR EM VOLTA: junto da linha ele fica na frente sozinho; os brutos e os pelotões formam atrás do corpo dele
    secRes.fill(0)
    for (let i = 0; i < C.n; i++) { C.grOff[i] = 0; if (C.lado[i] === 1 && C.est[i] === 1 && C.peca[i].w > 100 && C.xDe(i) > sHi[C.sec[i]] - 90) { C.grOff[i] = secRes[C.sec[i]]; secRes[C.sec[i]] += C.peca[i].w * 0.5 * C.k[i] / (C.ppc || 1) + 10 } }
    brN.fill(0); for (let i = 0; i < C.n; i++) if (C.lado[i] === 1 && C.est[i] === 1 && C.peca[i].w > 60 && C.peca[i].w <= 100) C.grOff[i] = secRes[C.sec[i]] + brN[C.sec[i]]++ * 34 // (dois brutos nunca no mesmo ponto)
    // onde está o corpo de cada chefe (desenhado): ninguém do lado dele forma em cima (`foraDoChefe`)
    nCh = 0
    for (let i = 0; i < C.n && nCh < 4; i++) if (C.lado[i] === 1 && C.est[i] === 1 && C.peca[i].w > 100) { chX[nCh] = C.xDe(i) + C.dxe[i]; chM[nCh] = (C.peca[i].w * 0.38 * C.k[i] + 7 * C.kRep) / (C.ppc || 1) + 4; chS[nCh++] = C.sec[i] }
    const f = Math.min(1, C.dtAnim / 110)
    // R29 — o CHEFE (e o bruto) têm âncora própria no portão: a linha do choque abre espaço para o corpo deles caber inteiro na tela
    let linMin = C.linMin
    for (let i = 0; i < C.n; i++) if (C.lado[i] === 1 && C.est[i] === 1 && C.peca[i].w > 60 && C.sec[i] === 0 && C.xDe(i) < C.xeBorda + 120) { const m = C.peca[i].w > 100 ? 26 : 12, v = loGrande(i) + m + VAO; if (v > linMin) linMin = v }
    let lo = -1e9
    for (let q = 0; q < nViv; q++) {
      const k = ordG[q]
      let aR = sFI[q] > -1e8 ? (sFI[q] + gMinM[k]) / 2 : NaN
      if (q === 0 && aR < linMin) aR = linMin // junto do portão o choque inteiro é puxado para DENTRO da tela (o portão pode ficar de fora, a luta não)
      linR[k] = aR !== aR ? NaN : linR[k] !== linR[k] ? aR : linR[k] + (aR - linR[k]) * f
      const aL = sBI[q + 1] < 1e8 ? (gMaxM[k] + sBI[q + 1]) / 2 : NaN
      linL[k] = aL !== aL ? NaN : linL[k] !== linL[k] ? Math.min(aL + 30, Math.max(aL, gDes[k] + VAO)) : linL[k] + (aL - linL[k]) * f
      if (linR[k] === linR[k] && linR[k] + VAO > lo) lo = linR[k] + VAO
      gLo[k] = lo
    }
    let hi = 1e9
    for (let q = nViv - 1; q >= 0; q--) { const k = ordG[q]; if (linL[k] === linL[k] && linL[k] - VAO < hi) hi = linL[k] - VAO; gHi[k] = hi; if (gLo[k] > hi) gLo[k] = gHi[k] = (gLo[k] + hi) / 2 }
    for (let s = 0; s <= nViv; s++) {
      sHi[s] = s < nViv && linR[ordG[s]] === linR[ordG[s]] ? linR[ordG[s]] - VAO : 1e9
      sLo[s] = s > 0 && linL[ordG[s - 1]] === linL[ordG[s - 1]] ? linL[ordG[s - 1]] + VAO : -1e9
      if (sLo[s] > sHi[s]) sLo[s] = sHi[s] = (sLo[s] + sHi[s]) / 2
    }
  }
  const chX = new Float32Array(4), chM = new Float32Array(4), chS = new Uint8Array(4); let nCh = 0
  /** R32 — AR EM VOLTA DO CHEFE: um lugar `X` (centésimos) do trecho `s` que cairia em cima do corpo de um chefe vai para trás dele
   *  (ou para a frente, se já estava na frente e cabe antes da linha). `extra` = meia largura de quem vai ocupar o lugar. */
  function foraDoChefe(X, s, extra = 0, fila = 0) { // `fila`: o lugar de cada um na fila quando vai para trás (ninguém empilha na beira do chefe)
    for (let c = 0; c < nCh; c++) { if (chS[c] !== s) continue; const m = chM[c] + extra; if (Math.abs(X - chX[c]) < m) X = X > chX[c] && chX[c] + m + fila <= sHi[s] ? chX[c] + m + fila : chX[c] - m - fila }
    return X
  }
  /** O mais perto da borda de entrada que um invasor GRANDE pode ser desenhado sem o corpo sair da tela. */
  const loGrande = (i) => C.xeBorda + (C.peca[i].w * 0.3 * C.k[i] - 10 * C.kRep) / (C.ppc || 1)
  /** Onde o boneco `i` está DESENHADO ao longo da estrada (centésimos de terreno; sem o bote, que é pose). */
  C.xeDes = (i) => C.xDe(i) + C.dxe[i]
  /** Limites de desenho de `i` neste quadro: [depois de, antes de] (a linha de frente dele, já com o vão). */
  C.limites = (i) => { if (C.lado[i] === 1) { const s = C.sec[i], m = C.peca[i].w > 100 ? 26 : C.peca[i].w > 60 ? 12 : 0; return [sLo[s], sHi[s] - m] } const k = C.grupo[i] % NG; return [gLo[k], gHi[k]] }
  /** Em que posição da estrada (0 = o mais perto do portão) está o grupo vivo `k` do reino; −1 se não há. */
  C.ordemDoGrupo = (k) => { for (let q = 0; q < nViv; q++) if (ordG[q] === k % NG) return q; return -1 }
  const hashDe = (i) => (i * 2654435761) >>> 0
  /** Lugar do representante `r` de um pelotão INVASOR `k`: fileiras em profundidade, colunas para trás. Perto da linha de frente ele
   *  entra na FILA do trecho (o pelotão que luta na frente, os que chegam atrás dele): ninguém atravessa. Devolve em LUG. */
  function lugarInv(r, REP, i, k, passo) {
    const R = Math.min(REP, C.tipo === 'pc' ? 3 : 2), row = r % R, col = (r / R) | 0, h = hashDe(i)
    LUG.lane = (R === 1 ? 0 : ((row / (R - 1)) * 2 - 1) * 0.86) + (((h >>> 4) % 5) - 2) * 0.025
    const zig = Math.abs((row % 2 ? passo * 0.42 : -passo * 0.12) + ((h >>> 9) % 5) - 2), x = C.xDe(i)
    let X = x - col * passo - zig - Math.min(bOff[k], C.fundoMax)
    if (bPerto[k]) {
      let prof = bOff[k] + col * passo; if (prof > C.fundoMax && !secRes[bSec[k]]) prof = C.fundoMax - ((r + k) & 1) * passo * 0.5 // o fundo da fila se aperta (do mesmo lado pode)
      const vaga = sHi[bSec[k]] - prof - zig - secRes[bSec[k]]
      X = gFr[k] > -1e8 || X < C.xeBorda ? vaga : Math.min(X, vaga) // (quem ainda está do lado de fora do portão entra e forma na fila: o reino não espera diante de ninguém)
    }
    X = foraDoChefe(X, C.sec[i], 0, col * passo + zig); LUG.dxe = Math.max(-200, Math.min(140, X - x))
  }
  /** Lugar do representante `r` (de K) de um grupo do REINO `k`: formação em volta de casa; no choque, em fila atrás da linha. */
  function lugarDef(r, K, i, k, passo, luta, recua) {
    const R = Math.min(K, C.tipo === 'pc' ? 3 : 2), row = r % R, col = (r / R) | 0, cols = Math.ceil(K / R), h = hashDe(i)
    LUG.lane = (R === 1 ? 0 : ((row / (R - 1)) * 2 - 1) * 0.86) + (((h >>> 4) % 5) - 2) * 0.025
    const zig = (row % 2 ? passo * 0.42 : -passo * 0.12) + ((h >>> 9) % 5) - 2, x = C.xDe(i)
    let X = x + (col - (cols - 1) / 2) * passo + zig + (recua ? 38 : 0)
    if (luta) {
      const briga = aFr[k] < 1e8 && !C.atirador[i], atras = gHi[k] < 1e8 && gHi[k] - x < x - gLo[k] // `atras`: o inimigo mais perto saiu do OUTRO lado (toupeira)
      if (gLo[k] > -1e8) { const vaga = gLo[k] + aOff[k] + col * passo + Math.abs(zig); X = briga && !atras && Math.abs(vaga - x) < 150 ? vaga : Math.max(X, vaga) }
      if (gHi[k] < 1e8) { const vaga = gHi[k] - (cols - 1 - col) * passo - Math.abs(zig); X = briga && atras ? vaga : Math.min(X, vaga) }
    }
    LUG.dxe = Math.max(-140, Math.min(160, X - x))
  }
  // BAIXA LIMPA (R28): no máximo 2 fumacinhas de baixa por pelotão ao mesmo tempo (a nuvem grande fica para a morte do grupo e do chefe)
  const FUM_MS = 300, fumAte = new Float64Array(128).fill(-1e9)
  function podeFumaca(chave) {
    const b = (chave & 63) * 2, t = C.relogio; let n = 0
    if (fumAte[b] > t) n++; if (fumAte[b + 1] > t) n++
    if (n >= 2) { C.med.fumacasSeguradas++; return false }
    fumAte[fumAte[b] > t ? b + 1 : b] = t + FUM_MS; if (n + 1 > C.med.fumacasJuntas) C.med.fumacasJuntas = n + 1
    return true
  }
  function agrupar() {
    const REP = Math.min(MAXREP, C.repMax), luta = C.emLuta && !C.marcha, pc = C.tipo === 'pc', R = Math.min(REP, pc ? 3 : 2), passo = pc ? 30 : 34
    gN.fill(0); gVis.fill(0); gX.fill(0); gTopo.fill(1e9); gHp.fill(0); gMax.fill(0); aN.fill(0); aX.fill(0); aTopo.fill(1e9); aHp.fill(0); aMax.fill(0); aViv.fill(0); aTot.fill(0); aCont.fill(0); aFr.fill(1e9); gFr.fill(-1e9); bFr.fill(-1e9); bSec.fill(-1); bPerto.fill(0); bOff.fill(0); gCnt.fill(0); secB.fill(-1)
    const tl = C.relogio
    for (let i = 0; i < C.n; i++) { // quem lutou há pouco (o pelotão que está no choque) e a conta de cada pelotão da horda
      if (C.est[i] !== 1 || C.peca[i].w > 60) continue
      const x = C.xDe(i), briga = tl - C.lutaT[i] <= 1500
      if (C.lado[i] === 0) { if (briga) { const k = C.grupo[i] % NG; if (x < aFr[k]) aFr[k] = x } continue }
      let t = tipoDe.get(C.peca[i]); if (t === undefined) { t = tipoDe.size % NTIPO; tipoDe.set(C.peca[i], t) }
      const k = Math.min(NREG - 1, C.sec[i] * 2 + (sFI[C.sec[i]] - x > 200 ? 1 : 0)) * NTIPO + t // R29: pelotão = trecho × (faixa do choque | retaguarda) × tipo
      C.balde[i] = k; gHp[k] += Math.max(0, C.hp[i]); gMax[k] += C.hpMax[i]; gN[k]++
      if (briga && x > gFr[k]) gFr[k] = x
      if (x > bFr[k]) bFr[k] = x
      if (bSec[k] < 0) { bSec[k] = C.sec[i]; bPrim[k] = i }
    }
    // a FILA de cada trecho: os pelotões que estão perto da linha de frente, o que luta primeiro; cada um atrás do outro
    // R29 — HORDA SEM BLOCO: teto de representantes da horda INTEIRA por faixa de choque (PC 6, celular 4; retaguarda 4 e 3), repartido
    // entre os tipos na proporção (cada tipo com pelo menos 1, até o teto do pelotão); o resto espera atrás como SILHUETA ou na plaqueta
    bAl.fill(0); regFundo.fill(0); regFr.fill(-1e9); silN.fill(0); regPeso.fill(0)
    for (let i = 0; i < C.n; i++) if (C.lado[i] === 1 && C.est[i] === 1 && C.peca[i].w > 60) regPeso[Math.min(NREG - 1, C.sec[i] * 2 + (sFI[C.sec[i]] - C.xDe(i) > 200 ? 1 : 0))] += C.peca[i].w > 100 ? 3 : 2
    for (let reg = 0; reg < NREG; reg++) {
      const b0 = reg * NTIPO, T0 = Math.max(2, ((reg & 1) ? (pc ? 4 : 3) : (pc ? 6 : 4)) - regPeso[reg]); let teto = T0, nb = 0 // R32: chefe à vista vale 3 vagas, bruto 2 (a horda não pesa)
      for (let q = 0; q < NTIPO; q++) if (gN[b0 + q]) nb++
      if (!nb) continue
      if (nb <= teto) { for (let q = 0; q < NTIPO; q++) if (gN[b0 + q]) { bAl[b0 + q] = 1; teto-- } }
      else for (let v = 0; v < teto; v++) { let m = -1, c = -1e18; for (let q = 0; q < NTIPO; q++) { const k = b0 + q; if (!gN[k] || bAl[k]) continue; const ck = (gFr[k] > -1e8 ? 1e6 : 0) + bFr[k]; if (ck > c) { c = ck; m = k } } if (m >= 0) bAl[m] = 1 }
      if (nb <= T0) while (teto > 0) { let m = -1, c = 0; for (let q = 0; q < NTIPO; q++) { const k = b0 + q; if (!gN[k] || bAl[k] >= Math.min(REP, gN[k])) continue; const v = gN[k] / (bAl[k] + 1); if (v > c) { c = v; m = k } } if (m < 0) break; bAl[m]++; teto-- }
      for (let q = 0; q < NTIPO; q++) if (bFr[b0 + q] > regFr[reg]) regFr[reg] = bFr[b0 + q]
    }
    // (vale também na marcha: pelotões que andam juntos vão em coluna, não um em cima do outro; só o da FRENTE mostra todos os
    // representantes — os de trás mostram uma fileira, o resto está na plaqueta)
    let nP = 0
    for (let k = 0; k < gN.length && nP < pertos.length; k++) { if (!gN[k] || !bAl[k] || C.atirador[bPrim[k]]) continue; pertos[nP++] = k; const h = sHi[bSec[k]]; if (luta && h < 1e8 && bFr[k] > h - 90) bPerto[k] = 1 }
    for (let a = 0; a < nP; a++) {
      const ka = pertos[a], ca = (gFr[ka] > -1e8 ? 1e6 : 0) + bFr[ka]; let n = 0, melhor = -1, cm = -1e9
      for (let b = 0; b < nP; b++) { const kb = pertos[b]; if (b === a || bSec[kb] !== bSec[ka] || Math.abs(bFr[kb] - bFr[ka]) > 110) continue; const cb = (gFr[kb] > -1e8 ? 1e6 : 0) + bFr[kb]; if (cb > ca || (cb === ca && kb < ka)) { n++; if (cb > cm || (cb === cm && kb < melhor)) { cm = cb; melhor = kb } } }
      bOff[ka] = n ? Math.ceil(bAl[melhor] / R) * passo + 4 + (n - 1) * (passo + 4) : 0
      const reg = (ka / NTIPO) | 0, fundo = bOff[ka] + Math.ceil(bAl[ka] / R) * passo; if (fundo > regFundo[reg]) regFundo[reg] = fundo
    }
    { let ant = -2e9, off = 0; for (let q = 0; q < nViv; q++) { const k = ordG[q]; if (gLo[k] !== ant) { ant = gLo[k]; off = 0 } aOff[k] = off; if (aFr[k] < 1e8) off += passo * 0.5 } } // dois grupos do reino no mesmo choque: o de trás meio passo atrás
    for (let i = 0; i < C.n; i++) { if (C.lado[i] !== 0) continue; const k = C.grupo[i] % NG; aMax[k] += C.hpMax[i]; aTot[k]++; if (C.est[i] === 1) { aViv[k]++; aHp[k] += Math.max(0, C.hp[i]) } } // quem caiu conta como vida perdida
    // quantos representantes cada grupo do reino mostra: na proporção da VIDA do grupo; o último só some quando o grupo acaba
    for (let k = 0; k < NG; k++) aRep[k] = aViv[k] ? Math.max(1, Math.min(aViv[k], Math.ceil(Math.min(aTot[k], REP) * aHp[k] / Math.max(1, aMax[k]) - 0.001))) : 0
    const portao = C.noPortao = luta && sHi[0] < C.xeBorda + 170 // o choque está no portão: quem ainda não coube na tela espera do lado de fora (não aparece cortado)
    for (let i = 0; i < C.n; i++) {
      const era = C.oculto[i]; C.oculto[i] = 0
      const p = C.peca[i], grande = p.w > 60
      if (C.est[i] !== 1) { C.oculto[i] = era && C.est[i] !== 0 && !grande ? 1 : 0; continue } // quem cai fora de vista cai fora de vista
      if (C.lado[i] === 0) {
        const k = C.grupo[i] % NG
        if (grande) { aN[k]++; aX[k] += C.sx[i]; aTopo[k] = Math.min(aTopo[k], C.sy[i] - (p.ay - Arte.topoDe(p)) * C.k[i]); continue }
        const r = aCont[k]++
        if (r >= aRep[k]) { // fora da conta dos representantes: some (na luta, com uma FUMACINHA pequena: é a vida do grupo indo embora)
          C.oculto[i] = 1; C.chega[i] = 0
          if (!era && !C.ocultoAnt[i] && luta) { C.med.repsCaidos++; if (podeFumaca(k)) { const fu = fx().fumacinha[0]; porEfeito(fu, C.sx[i], C.sy[i], false, fu.anim.play, C.kRep); C.med.fumacinhas++ } }
          C.ocultoAnt[i] = 1; continue
        }
        C.ocultoAnt[i] = 0; repA[k * MAXREP + r] = i
        lugarDef(r, aRep[k], i, k, passo, luta, luta && !pc) // no celular, quem não está no choque recua meio terreno: o golpe ganha ar
        C.laneT[i] = LUG.lane; C.dxeT[i] = LUG.dxe
        if (era && luta && !C.chega[i]) { C.dxe[i] = C.dxeT[i] + 2.2 * passo; C.lane[i] = C.laneT[i]; C.chega[i] = 1; C.oculto[i] = 1; C.med.vagas++; continue } // VAGA do reino: o reforço chega andando de trás (aparece no quadro seguinte)
        aN[k]++; aX[k] += C.sx[i]; const topo = C.sy[i] - (p.ay - Arte.topoDe(p)) * C.k[i]; if (topo < aTopo[k]) aTopo[k] = topo
        continue
      }
      if (grande) continue
      const k = C.balde[i], r = gCnt[k]++
      if (r >= bAl[k]) { // fora do teto: os primeiros esperam atrás da fila como SILHUETA escura e menor (multidão, não figura); o resto só na plaqueta
        C.oculto[i] = 1; C.chega[i] = 0
        const reg = (k / NTIPO) | 0, n = silN[reg]
        if (n < (pc ? 6 : 4) && !C.atirador[i] && !(reg & 1)) { // (só a faixa do choque tem multidão: a retaguarda fica nas plaquetas, para as duas fileiras não se encavalarem)
          silN[reg]++
          // R32 — MULTIDÃO COM RITMO: UMA fileira no alto da estrada (atrás dos representantes em Y), espaçada de 13 em 13, cada um num
          // degrau de altura — as cabeças fazem "dentes"; nunca na frente de um representante
          const x = C.xDe(i), h = hashDe(i), perto = bPerto[k] || (luta && sHi[C.sec[i]] < 1e8 && regFr[reg] > sHi[C.sec[i]] - 90), fundo = regFundo[reg] + secRes[C.sec[i]] + 10 + n * 13 + ((h >>> 9) % 4)
          let X = foraDoChefe(Math.min(x - n * 13, (perto ? sHi[C.sec[i]] : regFr[reg]) - fundo), C.sec[i], 0, n * 13)
          if (n > 0 && X > silUlt[reg] - 11) { X = silUlt[reg] - 11; for (let c = 0; c < nCh; c++) if (chS[c] === C.sec[i] && Math.abs(X - chX[c]) < chM[c]) X = chX[c] - chM[c] } // a fileira é sempre espaçada: cada um pelo menos 11 atrás do anterior
          silUlt[reg] = X
          C.laneT[i] = -1.12 + (n & 1) * 0.1; C.dxeT[i] = Math.max(-260, X - x)
          if (X - x < -240) silN[reg]-- // longe demais de onde o motor diz que ele está: fica só na plaqueta (nunca empilha no limite)
          else if (!(portao && C.sec[i] === 0 && C.xeDes(i) < C.xeBorda)) { C.oculto[i] = 2; C.med.silhuetas++ }
        }
        continue
      }
      lugarInv(r, REP, i, k, passo); C.laneT[i] = LUG.lane; C.dxeT[i] = LUG.dxe
      // R29 — VAGA: quem entra no lugar de quem caiu chega ANDANDO de trás (2–3 passos). No quadro em que é posto lá atrás ainda não aparece
      if (era === 1 && luta && !C.chega[i]) { C.dxe[i] = C.dxeT[i] - 2.2 * passo; C.lane[i] = C.laneT[i]; C.chega[i] = 1; C.oculto[i] = 1; C.med.vagas++; continue }
      if (era === 2 && luta && !C.chega[i]) { C.chega[i] = 1; C.med.vagas++ } // a silhueta que esperava atrás anda até a vaga
      if (portao && C.sec[i] === 0 && C.xeDes(i) < C.xeBorda) { C.oculto[i] = 1; C.chega[i] = 1; C.med.foraDoPortao++; continue } // entra andando pela borda
      repG[k * MAXREP + gVis[k]] = i
      gVis[k]++; gX[k] += C.sx[i]; gTier[k] = C.tier[i]; const topo = C.sy[i] - (p.ay - Arte.topoDe(p)) * C.k[i]; if (topo < gTopo[k]) gTopo[k] = topo
      const s = C.sec[i], b = secB[s]; if (b < 0 || (bPerto[k] && (!bPerto[b] || bOff[k] < bOff[b]))) secB[s] = k // o pelotão à vista mais à frente do trecho
    }
    let nRep = 0; C.focoX = 0; C.focoY = 0; C.focoN = 0; C.focoL = 0; for (let i = 0; i < C.n; i++) if (C.est[i] === 1 && !C.oculto[i] && C.peca[i].w <= 60) { nRep++; C.focoX += C.sx[i]; C.focoY += C.sy[i]; C.focoN++; C.focoL |= 1 << C.lado[i] }
    if (luta) { for (let reg = 0; reg < NREG; reg++) { let v = 0; for (let q = 0; q < NTIPO; q++) v += gVis[reg * NTIPO + q]; if (v > C.med.hordaMax) C.med.hordaMax = v; if (regPeso[reg] && v > C.med.hordaComGrande) C.med.hordaComGrande = v; if (silN[reg] > C.med.silMax) C.med.silMax = silN[reg] } medirLinha() }
    if (nRep > C.med.repsMax) C.med.repsMax = nRep
    // R38 — a CAIXA de todo mundo que está à vista (representantes, grandes e a multidão que espera), com a plaqueta em cima: a câmera
    // perto do celular só chega se a caixa inteira couber (ninguém cortado)
    { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
      for (let i = 0; i < C.n; i++) { if (C.est[i] !== 1 || C.oculto[i] === 1) continue; const p = C.peca[i], hw = p.w > 60 ? p.w * 0.36 * C.k[i] : 8 * C.k[i], topo = C.sy[i] - (p.ay - Arte.topoDe(p)) * C.k[i] - 28; if (C.sx[i] - hw < x0) x0 = C.sx[i] - hw; if (C.sx[i] + hw > x1) x1 = C.sx[i] + hw; if (topo < y0) y0 = topo; if (C.sy[i] + 5 > y1) y1 = C.sy[i] + 5 }
      C.cxa = x0 < 1e8 ? [x0, y0, x1, y1] : null }
  }
  /** MEDIDAS da linha de frente, em TODO quadro da luta (para o teste e o relato): lado errado da linha, caixas que se tocam em repouso
   *  (invasor × defensor, na tela) e o "abraço" (a menos de meio boneco). */
  function medirLinha() {
    const med = C.med, t = C.relogio, lim = 13 * C.kRep; let errado = 0, caixa = 0, perto = 0, cortado = 0
    for (let i = 0; i < C.n; i++) {
      if (C.est[i] !== 1 || C.oculto[i] === 1) continue
      const d = C.xeDes(i), inv = C.lado[i] === 1
      if (inv) { const s = C.sec[i]; if (d > sHi[s] + 0.01 || d < sLo[s] - 0.01) errado = 1 } else { const k = C.grupo[i] % NG; if (d < gLo[k] - 0.01 || d > gHi[k] + 0.01) errado = 1 }
      if (inv && C.peca[i].w > 100 && !C.fase[i]) { med.quadrosChefe++; const hw = C.peca[i].w * 0.36 * C.k[i]; for (let j = 0; j < C.n; j++) if (j !== i && C.lado[j] === 1 && C.est[j] === 1 && C.oculto[j] !== 1 && C.peca[j].w <= 100 && (C.peca[j].w > 60 ? foraDoChefe(C.xeDes(j), C.sec[j], C.peca[j].w * 0.3 * C.k[j] / (C.ppc || 1)) === C.xeDes(j) : Math.abs(C.dxeT[j] - C.dxe[j]) < 3) && C.tier[j] === C.tier[i] && !C.fase[j] && !C.chega[j] && Math.abs(C.sx[j] - C.sx[i]) < hw + (C.peca[j].w > 60 ? C.peca[j].w * 0.28 * C.k[j] : 5 * C.k[j])) { med.chefeColado++; break } }
      if (C.oculto[i]) continue
      if (inv && C.noPortao && C.sec[i] === 0 && C.peca[i].w <= 60) { const X = C.sx[i] - C.cam.x; if (X - 8 * C.k[i] < 0 || X + 8 * C.k[i] > C.VW) { cortado = 1; med.cortadoQuem = C.idTipo[i] + ' x=' + Math.round(X) + ' xe=' + Math.round(C.xeDes(i)) + ' cam=' + Math.round(C.cam.x) + ' chega=' + C.chega[i] } } // representante cortado pela borda no choque do portão
      if (!inv || C.peca[i].w > 60 || C.fase[i] || t - C.hitT[i] < 260) continue
      for (let j = 0; j < C.n; j++) {
        if (C.lado[j] !== 0 || C.est[j] !== 1 || C.oculto[j] || C.peca[j].w > 60 || C.fase[j] || t - C.hitT[j] < 260 || C.tier[j] !== C.tier[i]) continue
        const dx = Math.abs(C.sx[i] - C.sx[j]), dy = Math.abs(C.sy[i] - C.sy[j])
        if (dx < 7 * (C.k[i] + C.k[j]) && dy < 18 * C.kRep) caixa = 1 // as caixas do corpo (14 px de arte de largura) se tocam
        if (dx < lim && dy < 8) perto = 1
        if (dx < med.vaoRepouso) med.vaoRepouso = Math.round(dx)
      }
    }
    med.quadrosLuta++; med.abracos += perto; med.ladoErrado += errado; med.caixas += caixa; med.cortados += cortado; if (C.noPortao) med.quadrosPortao++
  }
  /** O REPRESENTANTE que aparece no lugar do boneco `i` (ele mesmo, se está à vista): todo golpe tem dono e alvo visíveis. */
  C.rep = (i) => {
    if (i < 0 || !C.oculto[i] || C.est[i] !== 1) return i
    if (C.lado[i] === 0) { const k = C.grupo[i] % NG, n = Math.min(aRep[k], aCont[k]); return n > 0 ? repA[k * MAXREP + (i % n)] : i }
    const k = C.balde[i], n = gVis[k]; if (n > 0) return repG[k * MAXREP + (i % n)]
    const b = secB[C.sec[i]]; return b >= 0 && gVis[b] > 0 ? repG[b * MAXREP + (i % gVis[b])] : i // o pelotão dele espera fora de vista: aparece quem está na frente do trecho
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
      // R28: a bandeirola acompanha o líder — vai com ele no bote (metade do avanço) e dá um pulinho de 2 px no impacto
      const bote = temLid && C.fase[lid] ? Math.round(C.pDx[lid] * face(lid) * C.k[lid] * 0.5) : 0, pulinho = temLid && C.fase[lid] === Mov.FASE.bote ? 2 : 0; if (bote || pulinho) C.med.bandeirolas++
      const X = (temLid ? Math.round(C.sx[lid]) : Math.round(aX[k] / aN[k])) - cx + bote, topo = Math.round(aTopo[k]) + Math.round(C.trem.y) - pulinho
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
    C.anim[i] = 0; C.animT[i] = C.relogio - (h >>> 12) % 1040; C.dir[i] = lado ? 1 : -1; C.dirV[i] = C.dir[i]; C.k[i] = p.w > (C.tipo === 'pc' ? 100 : 60) ? grande : C.kRep; /* R29: no PC o bruto sobe um degrau de pixel com os representantes (visivelmente maior); no celular a estrada não comporta */ C.laneT[i] = C.lane[i]; C.dxeT[i] = C.dxe[i]; C.ocultoAnt[i] = 1; C.oculto[i] = 0; C.altV[i] = p.w > 60 ? 0 : ((h >>> 15) % 3) - 1; C.lutaT[i] = -1e9; C.gesto[i] = C.atirador[i] ? 5 : p.w > 60 ? 4 : GESTOS[tipo] || 0; C.atqDist[i] = 6; C.barra[i] = p.barra ? 1 : 0; C.preso[i] = -1; C.nv[i] = nivel; C.lider[i] = lider ? 1 : 0
    if (lado === 0 && lider) grupoAtual++
    C.grupo[i] = lado === 0 ? grupoAtual : 0
    C.ehChefe[i] = lado === 1 && (p.w > 100 || !!CONFIG.CHEFES?.some((x) => x.id === tipo)) ? 1 : 0
    C.atqT[i] = C.hitT[i] = C.viraT[i] = C.morteT[i] = C.entraT[i] = -1e9; C.chega[i] = 0; C.atqSolta[i] = 0; C.fase[i] = 0; C.passoN[i] = -1; C.etapa[i] = 0; C.morteTipo[i] = 0
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
    C.brilhoQ[i] = 1; C.atqAnt[i] = ant; C.atqT[i] = jaNoBote ? C.relogio - ant : C.relogio + atraso; C.atqTiro[i] = tiro ? 1 : 0; C.atqAlvo[i] = alvo; C.atqSolta[i] = tiro && alvo >= 0 ? 1 : 0
    C.anim[i] = AN.attack; C.animT[i] = C.atqT[i]
    if (atraso > 0) C.med.cascata++
    // o bote cruza o VÃO até o alvo (e só ele): alcance em px de arte do boneco
    if (alvo >= 0 && alvo < C.n && !C.atirador[i]) { const d = Math.abs(C.sx[alvo] - C.sx[i]) / C.k[i]; C.atqDist[i] = Math.max(5, Math.min(24, d - 13)); if (!C.oculto[i] && !C.oculto[alvo] && C.peca[i].w <= 60 && C.peca[alvo].w <= 60 && d * C.k[i] < C.med.vaoMin) C.med.vaoMin = Math.round(d * C.k[i]) } else C.atqDist[i] = 6
    if (C.lado[i] === 0) aLutaT[C.grupo[i] % NG] = C.relogio
    return true
  }
  /** A batalha avisa que `i` está no corpo a corpo agora (bateu ou apanhou de perto): entra na conta da linha de frente. */
  C.marcarLuta = (i) => { if (i >= 0) C.lutaT[i] = C.relogio }
  /** O chefe entra na luta: um passo pesado (a batalha chama quando ele nasce). */
  C.entrarPesado = (i) => { if (i >= 0) C.entraT[i] = C.relogio }
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
    let livre = null, velho = C.num[0], doGrupo = 0, espera = 0
    if (chave >= 0) { // R26 — UM número de dano por pelotão, em faixa reservada ao lado de quem apanha (a cura tem a faixa dela, mais alta); o resto SOMA nele
      for (const n of C.num) {
        if (n.tipo === 3 || t - n.t0 >= DUR_NUM || n.chave !== chave) continue
        doGrupo++
        // UM número por pelotão: tudo soma nele (se entrar um golpe forte, ele vira ouro com "!")
        if (tipo === 1 && n.tipo === 0) { n.tipo = 1; n.ouro = true }
        n.v += valor; n.grande = n.grande || grande; textoDoDano(n); if (t - n.nasc < 900) n.t0 = Math.max(n.t0, t - 90); C.med.somados++; return
      }
      // nasce do LADO de quem apanhou (para longe do golpe) e em faixa de altura própria: comum embaixo, forte em cima, cura mais alto
      x += lado * (C.tipo === 'celular' ? 20 : 15); y -= tipo === 2 ? DEGRAU() + 3 : 0
      // R28 — NÚMEROS VIZINHOS: dois pelotões lado a lado no choque não mostram números colados. O novo sobe um degrau (alturas
      // alternadas); se ainda colidir, sobe mais um e o MENOR dos dois espera 120 ms
      let o = vizinho(x, y, chave, t)
      if (o) { y -= DEGRAU(); C.med.numAlternados++; o = vizinho(x, y, chave, t); if (o) { y -= DEGRAU(); C.med.numEsperas++; if (o.v < valor && t - o.nasc <= 40) o.t0 += 120; else espera = 120 } }
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
    livre.x = x; livre.y = y; livre.nasc = t; livre.t0 = t + espera; livre.v = valor; livre.tipo = tipo; livre.ouro = tipo === 1; livre.grande = grande; livre.chave = chave; if (lado) livre.lado = lado; textoDoDano(livre); C.med.numeros++
    if (chave >= 0) { let q = 0; for (const n of C.num) if (n.tipo !== 3 && t - n.t0 < DUR_NUM && n.chave === chave) q++; if (q > C.med.numPorGrupo) C.med.numPorGrupo = q }
  }
  /** Um número de OUTRO pelotão ainda na tela que ficaria colado em (x, y)? */
  function vizinho(x, y, chave, t) { const cel = C.tipo === 'celular', dx = cel ? 42 : 24, dy = cel ? 16 : 10; for (const n of C.num) if (n.tipo !== 3 && n.chave !== chave && t - n.t0 < DUR_NUM && Math.abs(n.x - x) < dx && Math.abs(n.y - y) < dy) return n; return null }
  /** Degrau de altura entre dois números vizinhos: a altura da letra do número + 2 (PC 11; celular 17, R38: a letra de lá tem 16 px). */
  const DEGRAU = () => (C.tipo === 'celular' ? 17 : 11)
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
  /** Brilho de aço (1 quadro, miúdo): no máximo 3 por segundo; com "Reduced motion" não há. */
  const brilhosT = []
  function podeBrilho() {
    if (C.menos) return false
    const agora = performance.now()
    while (brilhosT.length && agora - brilhosT[0] > 1000) brilhosT.shift()
    if (brilhosT.length >= 3) return false
    brilhosT.push(agora); C.med.brilhos++; return true
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

  /** R38 — a caixa do que o terreno vazio `nome` desenha de verdade (a caixa pontilhada com a seta, em todos os quadros da animação),
   *  dentro do quadro da peça. Medida uma vez por terreno, numa cópia pequena. */
  const CXV = new Map()
  function caixaDoVazio(p, nome) {
    let c = CXV.get(nome); if (c) return c
    const a = p.anim[nome] || Object.values(p.anim)[0], q0 = p.quadros[a.quadros[0]], w = q0[2], h = q0[3], tl = Px.tela(w, h), tg = tl.getContext('2d', { willReadFrequently: true })
    for (const qi of a.quadros) { const q = p.quadros[qi]; tg.drawImage(p.img, q[0], q[1], w, h, 0, 0, w, h) }
    const d = tg.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    c = x1 < 0 ? { x: 0, y: 0, w, h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; CXV.set(nome, c); return c
  }
  /** Onde começa (y de arte da tela, sem a câmera da luta) o desenho do terreno vazio `k` (1..6): a interface não põe texto dali para baixo. */
  C.topoDoVazio = (k) => { const p = Arte.peca('plot-empty'), tr = C.geo.terrenos[k - 1]; return p ? C.oyBase + tr.base_predio + 3 - p.ay + caixaDoVazio(p, 'plot' + k).y : C.oyBase + tr.base_predio - 41 }
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
      if (!t0) { const p = Arte.peca('plot-empty'); if (p) { const q = quadroDaPeca(p, 'plot' + (k + 1), C.menos ? 0 : t); Arte.desenhar(g, p, q, X, Y + 3, false, tinta); { const cv = caixaDoVazio(p, 'plot' + (k + 1)); C.setas.push({ k: k + 1, tipo: 'vazio', x: X - p.ax + cv.x, y: Y + 3 - p.ay + cv.y, w: cv.w, h: cv.h }) } /* a caixa pontilhada com a seta dentro, sem a margem vazia do quadro */ } continue }
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
        if (k === d.forte || d.sobe?.has(k)) {
          const b = C.menos ? 0 : Math.round(Math.abs(Math.sin(t / 220)) * 5), zc = C.zonaChances; let ya = y - 6
          // R38: a seta do terreno nunca sobe para cima da linha das chances (a interface diz onde ela está): desce para dentro do terreno
          if (zc && x + (w >> 1) + 6 > zc.x && x + (w >> 1) - 6 < zc.x + zc.w && ya - 11 < zc.y + zc.h && ya + 6 > zc.y) { ya = zc.y + zc.h + 11; C.med.setaDesviada++ }
          C.setas.push({ k, tipo: 'destaque', x: x + (w >> 1) - 6, y: ya - 11, w: 12, h: 17 })
          g.save(); g.translate(x + (w >> 1), ya - b); if (!d.sobe?.has(k)) g.scale(1, -1); Arte.icone(g, 'up', -5, -5); g.restore()
        }
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
  /** A folha de um boneco pronta para a MULTIDÃO (feita uma vez por folha, trecho e lado): os 2 tons dele em roxo médio com o contorno
   *  da cor do trecho já embutido (dos lados e em cima) — um desenho só por figura. */
  const MULT = new Map()
  function folhaMultidao(img, trecho, flip) {
    let m = MULT.get(img); if (!m) MULT.set(img, m = {})
    const k = trecho * 2 + (flip ? 1 : 0)
    if (!m[k]) { const b = Arte.folhaSil(img, COR_MULTIDAO[trecho], flip), c = Px.tela(b.width, b.height), q = c.getContext('2d'); q.drawImage(b, -1, 0); q.drawImage(b, 1, 0); q.drawImage(b, 0, -1); q.drawImage(Arte.folhaVar(img, '#9A88C4', flip), 0, 0); m[k] = c }
    return m[k]
  }
  /** Um quadro do risco de um gesto: nasce em (x, y) e cresce para o lado `fc` (espelha para a esquerda). */
  function riscoFx(v, qf, x, y, fc, k, forte = false) { const q = v.quadros[qf]; if (forte) { const s = Arte.folhaSil(v.img, '#2B1E3A', false); C.med.riscosFortes++; if (k > C.med.riscoK) C.med.riscoK = k; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { if (fc > 0) g.drawImage(s, q[0], q[1], q[2], q[3], x + dx * k, y - v.ay * k + dy * k, q[2] * k, q[3] * k); else { g.save(); g.translate(x + dx * k, y - v.ay * k + dy * k); g.scale(-1, 1); g.drawImage(s, q[0], q[1], q[2], q[3], 0, 0, q[2] * k, q[3] * k); g.restore() } } } if (fc > 0) g.drawImage(v.img, q[0], q[1], q[2], q[3], x, y - v.ay * k, q[2] * k, q[3] * k); else { g.save(); g.translate(x, y - v.ay * k); g.scale(-1, 1); g.drawImage(v.img, q[0], q[1], q[2], q[3], 0, 0, q[2] * k, q[3] * k); g.restore() } C.med.riscos++ }
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
      if (sh) { const q = sh.quadros[C.peca[i].w > 100 ? 3 : C.peca[i].w > 60 ? 1 : 0], ks = C.k[i], enc = Math.max(0, Math.min(4, ar)), w = Math.max(4, Math.round(q[2] * sombra.estica) - enc * 2); if (enc) C.med.sombrasNoPulo++; g.drawImage(sh.img, q[0], q[1], q[2], q[3], X - (q[2] >> 1) * ks + enc * ks, Y - 3 * ks, w * ks, q[3] * ks) } // no pulo a sombra encolhe (até 4 px de cada lado) e clareia else { g.fillStyle = '#2B1E3A'; g.fillRect(X - 7, Y - 1, 14, 2); g.fillRect(X - 5, Y - 2, 10, 4) }
    }
    g.globalAlpha = 1
    // 2) os bonecos, de trás para a frente
    for (let o = 0; o < C.n; o++) {
      const i = C.ordem[o]; if (C.tier[i] !== tier) continue
      if (C.oculto[i]) { // SILHUETA de quem espera atrás (R29): o mesmo quadro, escuro, na escala do cenário (menor que os representantes), sem marca nem sombra
        // R32: gente, não borrão — 2 tons do próprio boneco (roxo médio, não preto), contorno da cor do trecho, alturas diferentes
        // (−1 a +2 px) e balanço de 1 px fora de fase; na escala do cenário (menor que os representantes)
        if (C.oculto[i] === 2 && C.est[i] === 1) {
          const p = C.peca[i], fc = face(i), flip = (fc < 0) !== p.olhaEsquerda, qs = p.variantes ? p.variantes[C.vari[i]] : p.quadros, q = qs[C.qi[i]], h = hashDe(i)
          const A = ((h >>> 6) % 4) - 1, bal = C.menos ? 0 : Math.round(Math.sin(C.relogioReal / 380 + (h % 7))), X = Math.round(C.sx[i]) - cx, Y = Math.round(C.sy[i]) + ty + C.pDy[i] + bal
          sprite(folhaMultidao(p.img, C.trecho(), flip), p, q, X, Y, flip, 0, A, 0, 1)
        }
        continue
      }
      const e = C.est[i]; if (e !== 1 && e !== 2 && e !== 5) continue
      const p = C.peca[i], fc = face(i), X = Math.round(C.sx[i]) - cx, Y = Math.round(C.sy[i]) + ty
      if (e === 5) { // virou fumaça: nuvem em pixel que sobe e some (clara no soldado, roxa com faísca lima no invasor, grande no chefe)
        const peq = !C.nuvem[i], fu = peq ? F.fumacinha[C.morteTipo[i] === 0 ? 0 : 1] : F.fumaca[C.morteTipo[i] === 0 ? 0 : C.morteTipo[i] === 1 ? 1 : 2], k = C.morteTipo[i] === 2 ? 2 : C.k[i]
        const q = fu.quadros[Arte.quadroDe(fu.anim.play, t - C.morteT[i])]
        if (peq) { const lado = Math.max(q[2], q[3]) * k; if (lado > C.med.fumacaLado) C.med.fumacaLado = lado; if (FUM_MS > C.med.fumacaMs) C.med.fumacaMs = FUM_MS }
        g.drawImage(fu.img, q[0], q[1], q[2], q[3], X + C.pDx[i] * k - fu.ax * k, Y - fu.ay * k - (p.w > 60 && k === 1 ? 6 : 0), q[2] * k, q[3] * k)
        if (C.morteTipo[i] === 3) { const q2 = fu.quadros[Arte.quadroDe(fu.anim.play, Math.max(0, t - C.morteT[i] - 90))]; g.drawImage(fu.img, q2[0], q2[1], q2[2], q2[3], X + C.pDx[i] - fu.ax + 10, Y - fu.ay - 14, q2[2], q2[3]) }
        continue
      }
      const qs = p.variantes ? p.variantes[C.vari[i]] : p.quadros, flip = (fc < 0) !== p.olhaEsquerda, grandao = p.w > 60
      const tin = tinta || (grandao ? null : TOM_FILEIRA[C.lane[i] < -0.5 ? 2 : C.lane[i] < 0.1 ? 1 : 0])
      const kk = C.k[i], Xp = X + C.pDx[i] * fc * kk, Yp = Y + C.pDy[i] * kk
      // R38 — CHEFE LIDO EM 1 SEGUNDO: contorno CLARO de 1 px de arte em volta do corpo dele (8 cópias da silhueta, por baixo) e, enquanto
      // ele está de pé, os outros invasores um tom apagados (menos cor, mais escuros). Parado: vale igual com Reduced motion.
      if (C.ehChefe[i]) { const sil = Arte.folhaSil(p.img, COR_CHEFE, flip); for (let d = 0; d < 8; d++) sprite(sil, p, qs[C.qi[i]], Xp + VIZ8[d * 2] * kk, Yp + VIZ8[d * 2 + 1] * kk, flip, C.pLarg[i], C.pAlt[i], C.pIncl[i] * fc, kk); C.med.chefeContorno++ }
      const apaga = C.chefeVivo && C.lado[i] === 1 && !C.ehChefe[i]; if (apaga) C.med.apagados++
      sprite(apaga ? Arte.folhaApagada(p.img, tinta, flip) : Arte.folhaVar(p.img, tin, flip), p, qs[C.qi[i]], Xp, Yp, flip, C.pLarg[i], C.pAlt[i], C.pIncl[i] * fc, C.k[i])
      if (e !== 1) continue
      // ARMA QUE VARRE, pelo GESTO do tipo: arco de aço (corte, frigideira, esmaga), risco reto (estocada); a bicada é só o pescoço. Some em 3 quadros.
      if (C.fase[i] === Mov.FASE.bote && !C.atirador[i]) {
        const ms = t - C.atqT[i] - C.atqAnt[i], qf = Math.min(2, Math.floor(ms / 35)), gs = C.gesto[i], kv = grandao ? 2 : kk, alt = Math.round(p.ay * 0.5) * kk
        // R29: cada gesto tem o seu RISCO em pixel (2 tons, contorno e ponta; 3 quadros de 35 ms), no lugar dos retângulos
        // R32: um degrau de pixel de tela MAIOR que o boneco (lê a 1×) e, no ápice (1º quadro do 2º tempo), UM quadro de contraste: o risco
        // claro sobre uma mancha escura. (Com Reduced motion não há o quadro de contraste.)
        const G = F.gesto, ym = Yp - alt, kr = grandao ? 2 : (C.e + 2) / C.e, ap = !C.menos && ms >= 35 && ms - C.dtAnim < 35
        if (gs === 1) riscoFx(G.risco, qf, Xp + fc * 6 * kv, ym, fc, kr, ap) // estocada: lâmina reta com ponta
        else if (gs === 6) riscoFx(G.mordida, qf, Xp + fc * 5 * kv, ym, fc, kr, ap) // mordida: arcadas com dentes que se fecham
        else if (gs === 7) riscoFx(G.lasca, qf, Xp + fc * 7 * kv, ym, fc, kr, ap) // portada: quina da porta e lascas
        else if (gs === 8) { riscoFx(G.rastro, qf, Xp - fc * 5 * kv, ym, -fc, kr); riscoFx(G.risco, qf, Xp + fc * 6 * kv, ym, fc, kr, ap) } // investida: rastro com poeira atrás, ponta na frente
        else if (gs === 9) riscoFx(G.onda, qf, Xp + fc * 7 * kv, ym, fc, kr, ap) // barrigada: ondas de baque
        else if (gs !== 3) { const v = F.varrida, q = v.quadros[qf]; if (fc > 0) g.drawImage(v.img, q[0], q[1], q[2], q[3], Xp + 2 * kv, Yp - alt - v.ay * kv, q[2] * kv, q[3] * kv); else { g.save(); g.translate(Xp - 2 * kv, Yp - alt - v.ay * kv); g.scale(-1, 1); g.drawImage(v.img, q[0], q[1], q[2], q[3], 0, 0, q[2] * kv, q[3] * kv); g.restore() } }
      }
      // BRILHO DE AÇO (R28): UM quadro só, no ápice do arco (no fim do bote), na ponta da arma. Miúdo (5 px), nunca clarão de tela; no máximo
      // 3 por segundo e nunca com Reduced motion.
      if (C.brilhoQ[i] && C.fase[i] === Mov.FASE.bote && t - C.atqT[i] - C.atqAnt[i] >= Mov.BOTE_MS) {
        C.brilhoQ[i] = 0; const gs = C.gesto[i]
        if (!C.atirador[i] && (gs === 0 || gs === 1 || gs === 2 || gs === 4 || gs === 8) && podeBrilho()) {
          const u = grandao ? 2 : kk, bx = Xp + fc * Math.round((gs === 1 || gs === 8 ? 17 : 13) * u), by = Yp - Math.round(p.ay * 0.5) * kk - (gs === 1 || gs === 8 ? 0 : 5 * u)
          g.fillStyle = '#FFFFFF'; g.fillRect(bx - 2 * u, by, 5 * u, u); g.fillRect(bx, by - 2 * u, u, 5 * u); g.fillStyle = '#FFF096'; g.fillRect(bx - u, by - u, u, u); g.fillRect(bx + u, by + u, u, u)
        }
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
    bordaDoPortao(); frentes()
    C.chefeVivo = false
    for (let i = 0; i < C.n; i++) {
      const e = C.est[i]
      if (e === 0 || e === 3 || e === 4) continue
      if (C.ehChefe[i] && (e === 1 || e === 2)) C.chefeVivo = true
      const p0 = C.peca[i], inv = C.lado[i] === 1
      // entrada da horda: vem marchando de fora da tela até a posição (só desenho; a luta ainda não começou)
      let desl = false
      { const f = Math.min(1, C.dtAnim / 140), dl = C.laneT[i] - C.lane[i], dd = C.dxeT[i] - C.dxe[i]; if (e === 1) {
        if (C.chega[i]) { const lim = 110 * C.dtAnim / 1000; C.lane[i] += dl * f; C.dxe[i] += Math.abs(dd) <= lim ? dd : Math.sign(dd) * lim; desl = true; if (Math.abs(dd) < 2) C.chega[i] = 0 } // vaga: anda 2–3 passos, não escorrega
        else { C.lane[i] += dl * f; C.dxe[i] += dd * f; desl = Math.abs(dd) > 3 }
        // LINHA DE FRENTE DURA (R28): quem está vivo nunca é desenhado do lado errado da linha dele (nem andando, nem chegando)
        const x = C.xDe(i); let a, b
        if (inv) { const s = C.sec[i], m = p0.w > 100 ? 26 : p0.w > 60 ? 12 : 0; a = sLo[s]; b = sHi[s] - m - C.grOff[i]; if (m && s === 0) { const v = Math.min(loGrande(i), b); if (v > a) a = v } } else { const k = C.grupo[i] % NG; a = gLo[k]; b = gHi[k] }
        if (inv && p0.w > 60 && p0.w <= 100 && nCh) { const v = foraDoChefe(x + C.dxe[i], C.sec[i], p0.w * 0.3 * C.k[i] / (C.ppc || 1)); if (v !== x + C.dxe[i]) C.dxe[i] += Math.max(-5, Math.min(5, v - x - C.dxe[i])) } // o bruto sai de cima do chefe andando
        if (x + C.dxe[i] > b) C.dxe[i] = b - x; else if (x + C.dxe[i] < a) C.dxe[i] = a - x } }
      const p = pos(C.xDe(i) + C.dxe[i] - (inv && entra < 1 ? (1 - entra * (2 - entra)) * (60 + (i % 5) * 9) : 0), C.lane[i])
      C.sx[i] = p.x; C.sy[i] = p.y; C.tier[i] = p.tier; C.sentido[i] = p.sent
      Mov.zerar(PO)
      if (e === 5) { if (t - C.morteT[i] >= (C.nuvem[i] ? 560 : FUM_MS)) C.est[i] = 4; continue }
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
          if (et !== C.etapa[i]) { C.etapa[i] = et; med.chefeEtapas.push(et); if (et === 2) { C.efeito('dust', p.x - 14 * fc, p.y + 2); C.aoSom?.('chefeJoelho', p.x - cxp) } }
          if (et === 1 && Math.floor(ms / 130) !== Math.floor((ms - C.dtAnim) / 130)) C.efeito('spark', p.x + (((ms / 130) | 0) % 3 - 1) * 16, p.y - 30 - (((ms / 130) | 0) % 2) * 20) // estalos pelo corpo
          if (et === 3 && msQ >= durQ) { acabou = true; med.chefeEtapas.push(4); C.aoSom?.('chefeTomba', p.x - cxp); C.tremer(6, 120); C.efeito('dust', p.x - 22, p.y + 2); C.efeito('dust', p.x + 22, p.y + 2, true); porEfeito(fx().anelPo, p.x, p.y, false, fx().anelPo.anim.play) }
        }
        C.pDx[i] = PO.dx; C.pDy[i] = PO.dy; C.pLarg[i] = PO.larg; C.pAlt[i] = PO.alt; C.pIncl[i] = PO.incl
        if (acabou) {
          // BAIXA LIMPA (R28): a nuvem grande só para o chefe, o bruto e a morte do GRUPO inteiro; cada baixa é uma fumacinha (≤ o boneco,
          // 300 ms), no máximo 2 por pelotão ao mesmo tempo (a 3ª some sem fumaça)
          let nuvem = tipo >= 2
          if (tipo === 0) { nuvem = true; const k = C.grupo[i]; for (let j = 0; j < C.n; j++) if (C.lado[j] === 0 && C.grupo[j] === k && (C.est[j] === 1 || (C.est[j] === 5 && C.nuvem[j]))) { nuvem = false; break } }
          else if (tipo === 1) nuvem = gN[C.balde[i]] === 0 && !C.oculto[i]
          C.nuvem[i] = nuvem ? 1 : 0; C.morteT[i] = t; C.pDx[i] = PO.dx * (tipo === 0 ? fc : 0); med.fumacas++
          if (C.oculto[i]) C.est[i] = 4
          else if (nuvem) { C.est[i] = 5; med.nuvens++ }
          else if (podeFumaca(inv ? 16 + (C.balde[i] % 48) : C.grupo[i] % NG)) { C.est[i] = 5; med.fumacinhas++ }
          else C.est[i] = 4
          if (C.gatilho) C.gatilho(tipo === 2 ? 'fumacaChefe' : 'fumaca', p.x - cxp, p.y)
          if (tipo !== 2 && C.est[i] === 5) C.aoSom?.('fumaca', p.x - cxp)
        }
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
      { const me = t - C.entraT[i]; if (me >= 0 && me < 440) { // R29 — ENTRADA DO CHEFE: um passo pesado (levanta, desce com tudo, amassa) e poeira dos dois lados
        if (!C.menos) Mov.pisao(PO, me)
        if (me >= 260 && me - C.dtAnim < 260) { med.pisoes++; C.aoSom?.('pisao', p.x - cxp); C.efeito('dust', p.x - 20, p.y + 2); C.efeito('dust', p.x + 20, p.y + 2, true); porEfeito(fx().anelPo, p.x, p.y, false, fx().anelPo.anim.play) }
      } }
      if (C.fimT > 0) { const mf = t - C.fimT - (i % 4) * 70, ganhou = (C.lado[i] === 0) === C.fimVitoria; if (ganhou) { if (!C.menos) { Mov.festa(PO, mf); if (mf >= 0 && mf < 640 && !C.oculto[i]) med.festas++ } } else if (!inv) { Mov.recuo(PO, mf); if (mf >= 0 && !C.oculto[i]) med.recuos++ } } // fim da luta: quem venceu comemora, o reino vencido recua um passo
      const msA = t - C.atqT[i]
      let fase = 0
      if (msA < C.atqAnt[i] + 400) {
        fase = Mov.golpe(PO, msA, C.atqAnt[i], peso, C.gesto[i], C.atqDist[i])
        if (C.atqSolta[i] && msA >= C.atqAnt[i]) { // fim da antecipação: solta o tiro para ele chegar junto com o dano
          C.atqSolta[i] = 0; const j = C.atqAlvo[i]
          if (j >= 0 && j < C.n) { const tp = C.projetilDe(i); if (tp !== 'nada') { C.projetil(p.x + fc * 8, p.y - p0.ay * 0.5, C.sx[j], C.sy[j] - C.peca[j].ay * 0.45, tp); C.aoSom?.(tp === 'flecha' || tp === 'virote' ? 'arcoSolta' : tp === 'raio' ? '' : 'arremesso', p.x - cxp); if (C.gatilho) C.gatilho(tp, p.x - cxp, p.y) } }
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
  /** R38 — CÂMERA PERTO NO CELULAR (rodadas com poucos bonecos; a batalha decide ANTES da luta se pode: `C.perto`). Um degrau inteiro de
   *  pixel de tela mais perto (×1,5 a 2×), SÓ enquanto a caixa de todo mundo que está à vista (com as plaquetas) cabe inteira na faixa
   *  livre da tela — entre o HUD e o painel da base. Não coube (chegou reforço pelo portão, dois terrenos longe): a câmera volta macio. */
  let pertoDesde = 0
  function pertoDoCelular(agora, dtReal) {
    const b = C.cxa, z = (C.e + 1) / C.e, ligado = C.cam.zoomAlvo !== 1
    const s0 = 4, s1 = C.VW - 4, t0 = 50, t1 = C.VH - (C.enquadre ? 27 : 90), folga = ligado ? 0 : 5, mx = ligado ? 5 : 8 // (histerese: para entrar pede folga; para ficar, não)
    let fx = NaN, fy = NaN
    if (b && C.focoL === 3) {
      const eixo = (c, meia, a0, a1, total) => { const lo = Math.max(a0 + meia * z, c * z - total * (z - 1)), hi = Math.min(a1 - meia * z, c * z); if (lo > hi + 0.01) return NaN; const S = Math.max(lo, Math.min(hi, (a0 + a1) / 2)); return (c * z - S) / (z - 1) }
      fx = eixo((b[0] + b[2]) / 2, (b[2] - b[0]) / 2 + mx + folga, s0, s1, C.VW); fy = eixo((b[1] + b[3]) / 2, (b[3] - b[1]) / 2 + folga, t0, t1, C.VH)
    }
    if (fx !== fx || fy !== fy) { pertoDesde = 0; return } // não cabe: o zoom vence sozinho em 150 ms e a câmera volta
    if (!pertoDesde) pertoDesde = agora
    if (!ligado && agora - pertoDesde < 300) return // só chega depois de caber por 0,3 s seguidos (não fica entrando e saindo)
    const k = C.cam.zoom === 1 ? 1 : 1 - Math.pow(0.02, dtReal / 1000)
    C.cam.fx += (fx - C.cam.fx) * k; C.cam.fy += (fy - C.cam.fy) * k; C.cam.zoomAlvo = z; C.cam.zoomAte = agora + 150
    // medida (para o teste): quadros com a câmera perto e, deles, em quantos alguém à vista (ou a plaqueta) ficou cortado pela tela
    const zz = C.cam.zoom, X0 = C.cam.fx + (b[0] - C.cam.fx) * zz, X1 = C.cam.fx + (b[2] - C.cam.fx) * zz, Y0 = C.cam.fy + (b[1] + 6 - C.cam.fy) * zz, Y1 = C.cam.fy + (b[3] - C.cam.fy) * zz
    C.med.perto++; if (zz > C.med.pertoZoom) C.med.pertoZoom = zz; if (X0 < 0 || X1 > C.VW || Y0 < 44 || Y1 > C.VH - (C.enquadre ? 24 : 88)) C.med.pertoCortes++
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
  const cxN = new Float32Array(MAXN), cyN = new Float32Array(MAXN), cwN = new Float32Array(MAXN)
  function numeros(t) {
    const zt = C.zonaTitulo; let nb = 0
    for (const n of C.num) {
      const dur = n.tipo === 3 ? 500 : DUR_NUM, f = (t - n.t0) / dur; if (f < 0 || f >= 1) continue
      let x, y, fonte, kf = 1
      if (n.tipo === 3) { if (f > 0.75 && ((C.quadro >> 1) & 1) && !C.menos) continue; x = n.x - C.cam.x; y = n.y - Math.round(f * 10) - (n.grande ? 6 : 0); fonte = n.grande && /^[0-9!]+$/.test(n.s) && Arte.temFonte('dano-g-ouro') ? 'dano-g-ouro' : n.ouro ? 'reino-ouro' : 'reino-contorno' }
      else {
        const arco = C.menos ? 9 : Math.round(47.3 * f - 43 * f * f) // sobe 13 px e cai até 4 acima de onde nasceu
        x = n.x - C.cam.x + (C.menos ? 0 : Math.round(n.lado * 7 * f)); y = n.y - arco - (n.grande ? 6 : 0)
        // R38 — no CELULAR todo número de dano usa a letra GRANDE (16 px de arte = 32 px de tela a 2×: a régua do guia pede 28–64);
        // sem a letra grande no atlas (ou na cura, que é verde), a letra comum sai em dobro
        const cel = C.tipo === 'celular', gde = cel || n.grande || (n.tipo === 1 && n.v >= 40)
        fonte = n.tipo === 2 ? (Arte.temFonte('reino-verde') ? 'reino-verde' : 'reino-contorno') : n.tipo === 1 ? (gde && Arte.temFonte('dano-g-ouro') ? 'dano-g-ouro' : 'reino-ouro') : gde && Arte.temFonte('dano-g') ? 'dano-g' : !cel && n.v < 6 && Arte.temFonte('mini-contorno') ? 'mini-contorno' : 'reino-contorno'
        if (cel && Arte.alturaDaFonte(fonte) < 14) kf = 2
        const alt = Arte.alturaDaFonte(fonte) * kf; if (cel) y -= alt - 9 // (cresce para cima: o pé do número fica onde estava)
        { const px = alt * C.cam.zoom * C.css; if (px < C.med.numPxMin) C.med.numPxMin = px }
        if (f > 0.86) g.globalAlpha = 0.55
      }
      { // nenhum número cortado pela borda da tela (nem com a câmera perto)
        const z = C.cam.zoom, w2 = (Arte.largura(n.s, fonte) * kf >> 1) + 2, e0 = z === 1 ? 0 : C.cam.fx - C.cam.fx / z, e1 = z === 1 ? C.VW : C.cam.fx + (C.VW - C.cam.fx) / z
        if (x - w2 < e0) x = Math.min(e0 + w2, (e0 + e1) / 2); else if (x + w2 > e1) x = Math.max(e1 - w2, (e0 + e1) / 2)
      }
      if (zt) { // a zona do título (letreiro grande na tela): o número que cairia em cima dele não é desenhado
        const z = C.cam.zoom, sx = z === 1 ? x : C.cam.fx + (x - C.cam.fx) * z, sy = z === 1 ? y : C.cam.fy + (y - C.cam.fy) * z, mw = (n.grande ? 22 : 12) * z, mh = (n.grande ? 18 : 10) * z
        if (sx + mw > zt.x && sx - mw < zt.x + zt.w && sy + mh > zt.y && sy - 2 < zt.y + zt.h) { C.numerosPulados++; g.globalAlpha = 1; continue }
      }
      Arte.texto(g, n.s, x, y, { fonte, alinhar: 'centro', k: kf }); g.globalAlpha = 1
      if (n.tipo !== 3 && n.chave >= 0) { cxN[nb] = x; cyN[nb] = y; cwN[nb++] = Arte.largura(n.s, fonte) * kf }
    }
    if (nb > 1) { const dyc = C.tipo === 'celular' ? 14 : 7; let col = 0; for (let a = 0; a < nb && !col; a++) for (let b = a + 1; b < nb; b++) if (Math.abs(cxN[a] - cxN[b]) < (cwN[a] + cwN[b]) / 2 - 1 && Math.abs(cyN[a] - cyN[b]) < dyc) { col = 1; break } C.med.quadrosNum++; C.med.numColados += col } // (celular: letra de 16 px — "colado" é a menos de 14 px de altura)
  }

  /** R38 — BARRA DE VIDA DO CHEFE, com o nome dele, numa placa própria logo abaixo da estrada da luta (PC: no meio, com o nome em cima;
   *  celular: de lado a lado, com o nome dentro — não tapa o reino nem o HUD). A vida é a que a batalha já entrega (`C.hp` dos bonecos
   *  do chefe; quem ainda não entrou conta cheio). Fica na tela da entrada da horda até 1,2 s depois da queda. Não pisca nem treme. */
  C.anunciarChefe = (id, vidaTotal) => { const c = id && CONFIG.CHEFES?.find((x) => x.id === id); C.chefe = c && vidaTotal > 0 ? { id, nome: c.nome, max: vidaTotal, f: 1, rastro: 1, caiuT: 0 } : null }
  function barraDoChefe(agora, dtReal) {
    const ch = C.chefe; if (!ch || !C.emLuta) return
    let hp = ch.max, vivos = 0, nasc = 0
    for (let i = 0; i < C.n; i++) { if (C.idTipo[i] !== ch.id || C.lado[i] !== 1 || C.est[i] === 0) continue; nasc++; hp -= C.hpMax[i]; if (C.est[i] === 1 || C.est[i] === 3) { hp += Math.max(0, C.hp[i]); vivos++ } }
    ch.f = Math.max(0, Math.min(1, hp / ch.max)); ch.vivos = vivos
    if (nasc && !vivos && ch.f <= 0) { if (!ch.caiuT) ch.caiuT = agora; if (agora - ch.caiuT > 1200) return } else ch.caiuT = 0
    // o "rastro" claro da vida que acabou de sair escorre até a vida de verdade (parado com Reduced motion)
    ch.rastro = C.menos ? ch.f : Math.max(ch.f, ch.rastro - dtReal / 1400)
    const pc = C.tipo === 'pc', T0 = C.geo.terrenos[0], yEstrada = C.oy + Math.max(...C.geo.terrenos.map((t) => t.estrada[1]))
    const w = pc ? Math.min(220, C.VW - 40) : C.VW - 6, h = pc ? 17 : 12, x = (C.VW - w) >> 1, y = Math.min(yEstrada + 1, C.VH - h - 1)
    const bx = x + 2, by = pc ? y + 10 : y + 1, bw = w - 4, bh = pc ? 5 : 10
    g.fillStyle = '#2B1E3A'; g.fillRect(x, y, w, h); g.fillStyle = '#FFD248'; g.fillRect(x + 1, y, w - 2, 1); g.fillStyle = '#4E3A66'; g.fillRect(x + 1, y + h - 1, w - 2, 1)
    g.fillStyle = '#4E3A66'; g.fillRect(bx, by, bw, bh)
    const cr = Math.round(bw * ch.rastro), cv = Math.max(ch.f > 0 ? 1 : 0, Math.round(bw * ch.f))
    if (cr > cv) { g.fillStyle = '#FFF6E0'; g.fillRect(bx + cv, by, cr - cv, bh) }
    if (cv > 0) { g.fillStyle = '#CC3C3E'; g.fillRect(bx, by, cv, bh); g.fillStyle = '#E87E2E'; g.fillRect(bx, by, cv, 1); g.fillStyle = '#8E2A3A'; g.fillRect(bx, by + bh - 1, cv, 1) }
    g.fillStyle = '#2B1E3A'; for (let q = 1; q < 4; q++) g.fillRect(bx + Math.round(bw * q / 4), by, 1, bh) // marcas de 25%
    const fonte = pc ? 'reino-ouro' : Arte.largura(ch.nome, 'reino-contorno') <= bw - 4 ? 'reino-contorno' : 'mini-contorno' // (celular: o nome dentro da barra, letra clara com contorno)
    Arte.texto(g, ch.nome, C.VW >> 1, pc ? y + 1 : y + (fonte === 'reino-contorno' ? 2 : 3), { fonte, alinhar: 'centro' })
    C.med.chefeBarra++; C.med.chefeBarraRet = { x, y, w, h, f: ch.f, nome: ch.nome, letra: Arte.alturaDaFonte(fonte) * C.css, largNome: Arte.largura(ch.nome, fonte) }
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
    const e = C.e, w = G.w * e, h = G.h * e, z = C.cam.zoom, gx = G.x == null ? C.VW / 2 : z === 1 ? G.x : C.cam.fx + (G.x - C.cam.fx) * z, gy = G.y == null ? C.VH / 2 : z === 1 ? G.y : C.cam.fy + (G.y - C.cam.fy) * z, sx = Math.max(0, Math.min(canvas.width - w, Math.round((gx - G.w / 2) * e))), sy = Math.max(0, Math.min(canvas.height - h, Math.round((gy - G.h / 2) * e)))
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
      // R29 — CÂMERA DE DUELO: com ≤ 4 representantes no total (a primeira luta), a câmera chega um degrau de pixel mais perto e segue o
      // meio do choque, macio; volta sozinha quando a luta acaba
      if (C.duelo && C.emLuta && !C.marcha && C.focoL === 3 && agora > C.cam.zoomAte - 150) { // (só com os dois lados à vista)
        const tx = C.focoX / C.focoN - C.cam.x, ty = C.focoY / C.focoN - 12, k = C.cam.zoom === 1 ? 1 : 1 - Math.pow(0.02, dtReal / 1000)
        C.cam.fx += (tx - C.cam.fx) * k; C.cam.fy += (ty - C.cam.fy) * k; C.cam.zoomAlvo = (C.e + 1) / C.e; C.cam.zoomAte = agora + 150; C.med.duelo++
      }
      else if (C.perto && C.emLuta && !C.marcha && agora > C.cam.zoomAte - 150) pertoDoCelular(agora, dtReal)
      if (C.cam.zoomAlvo !== 1 && agora > C.cam.zoomAte) C.cam.zoomAlvo = 1
      if (C.cam.zoom !== C.cam.zoomAlvo) { const d = C.cam.zoomAlvo - C.cam.zoom, k = 1 - Math.pow(0.001, dtReal / (d > 0 ? 170 : 260)); C.cam.zoom += d * k; if (Math.abs(C.cam.zoomAlvo - C.cam.zoom) < 0.006) C.cam.zoom = C.cam.zoomAlvo }
      if (C.cam.zoom > C.med.zoomMax) C.med.zoomMax = C.cam.zoom
    }
    { // no fim de partida do PC o mundo sobe para a placa caber embaixo
      const pc = C.tipo === 'pc', alvoY = pc && C.fimDeJogo ? -36 : (C.enquadre || 0), // R29: no celular, com a tira curta no lugar do painel, o mundo desce para ocupar a altura que sobrou (a batalha decide ANTES da luta) // na luta o mundo não sai do lugar: o painel de resumo ocupa a base
       d = alvoY - C.camY, passo = C.menos ? 1e9 : 70 * dtReal / 1000
      C.camY += Math.abs(d) <= passo ? d : Math.sign(d) * passo; C.oy = C.oyBase + Math.round(C.camY); if (C.camY > C.med.enquadre) C.med.enquadre = Math.round(C.camY)
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
    C.setas.length = 0
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
    if (C.camY > 0 && C.tipo === 'celular') { if (!frenteBaixa) frenteBaixa = Px.frenteBaixa(C.VW, 26); g.drawImage(frenteBaixa, 0, C.VH - 23 - Math.round(26 * Math.min(1, C.camY / 40))); C.med.frenteBaixa++ } // R32: a tira de grama que sobrava vira a primeira fileira do cenário (cerca viva, flores, pedras); sobe junto com o enquadre
    S.vidaDaFrente(dono, 1, Tv)
    numeros(t)
    if (C.depoisDoMundo) C.depoisDoMundo(g, t)
    g.setTransform(C.e, 0, 0, C.e, 0, 0)
    if (C.noite > 0) { g.globalAlpha = C.noite * 0.38; g.fillStyle = '#141432'; g.fillRect(0, 0, C.VW, C.VH); g.globalAlpha = 1 }
    if (!vinheta) vinheta = fazerVinheta()
    g.globalAlpha = Math.min(1, (de ? de.luz.vinheta * (1 - C.mix) + cen.luz.vinheta * C.mix : cen.luz.vinheta) * 2.6 + (C.emLuta ? 0.12 : 0)); g.drawImage(vinheta, 0, 0); g.globalAlpha = 1
    if (C.emLuta) { if (!moldura) moldura = Px.moldura(C.VW, C.VH, C.tipo === 'celular'); g.drawImage(moldura, 0, 0); C.med.moldura = 1 }
    barraDoChefe(agora, dtReal)
    if (C.flashAte > agora) { g.globalAlpha = 0.32 * ((C.flashAte - agora) / C.flashMs); g.fillStyle = C.flashCor; g.fillRect(0, 0, C.VW, C.VH); g.globalAlpha = 1 }
    gravarQuadro()
  }
  try { if (/[?&]teste=1/.test(location.search)) window.__kmCena = C } catch { /* fora do navegador */ }
  return C
}
