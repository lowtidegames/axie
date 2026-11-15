// Frayz — ADAPTADOR DE ARTE: o ÚNICO lugar das peças que busca desenho de boneco, parte, tecido e ícone.
// As peças (carta, mão, bastidor, logotipo...) só falam com este arquivo. Assim, quando o desenho novo dos bonecos
// chegar, troca-se a fonte AQUI e nenhuma peça muda.
//
// De onde vem o desenho, em ordem:
//   1. `../boneco-rig.js` (desenho novo, de outro agente; pode ainda não existir). O que existir lá é usado.
//   2. `../bonecos.js` de hoje (carinha `miniatura`, `iconeDoTipo`, boneco inteiro `spriteDoBoneco`).
//   3. Desenho PROVISÓRIO daqui (tecido, ícone do lugar, recorte da parte), para nada ficar em branco.
//
// CONTRATO que as peças usam (cada função é opcional; se faltar, falhar ou devolver algo que não se desenha,
// cai sozinha para a reserva e avisa UMA vez no console):
//   retrato(partes, px)                         → canvas quadrado com a carinha do boneco
//   desenharParte(ctx, partes, lugar, caixa)    → desenha a parte ('cabeca' | 'bracos' | 'pernas') dentro de caixa {x, y, w, h}
//   iconeDoTipo(tipo, px)                       → canvas quadrado: retalho redondo do tecido
//   padraoDoTecido(tipo, px)                    → canvas quadrado que se repete lado a lado (ladrilho)
//   iconeDoLugar(lugar, px)                     → canvas quadrado com o ícone do lugar da parte
//   boneco(partes, altura, pose)                → canvas com o boneco inteiro (opcional; pose 'vivo' | 'fio' | 'caido')
// `partes` é sempre { tronco, cabeca, bracos, pernas, bordado } com textos 'id@raridade' (como no estado da luta).
// Todo `px` é em pixels do canvas (quem chama já multiplicou pela densidade da tela).
//
// O `boneco-rig.js` fala outra língua (densidade própria, parte por id, padrão como CanvasPattern, sem `boneco`):
// `traduzirRig` abaixo converte uma na outra. Se o contrato do rig mudar, é só aqui que se mexe.
import { semear, sorte } from './base.js'

const fonte = { rig: null, velho: null, origem: 'carregando' }
const falhou = new Set()

/** Mesmo desenho, em exatamente px × px (o rig desenha na densidade da tela; as peças já pedem em pixels do canvas). */
function noTamanho(src, px) {
  if (!src || (src.width === px && src.height === px)) return src
  const cv = document.createElement('canvas'); cv.width = cv.height = px
  const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(src, 0, 0, px, px)
  return cv
}
const POSE_DO_RIG = { vivo: 'parado', fio: 'ultimoFio', caido: 'caido', vitoria: 'vitoria' }

/** O rig (boneco-rig.js) no contrato das peças. */
function traduzirRig(R) {
  const d = () => Math.min(2, globalThis.devicePixelRatio || 1)
  const cacheTec = new Map(), cacheBoneco = new Map()
  const o = {}
  if (typeof R.retrato === 'function') o.retrato = (partes, px) => R.retrato(partes, px, { densidade: 1 })
  if (typeof R.iconeDoTipo === 'function') o.iconeDoTipo = (tipo, px) => noTamanho(R.iconeDoTipo(tipo, Math.max(8, Math.round(px / d()))), px)
  if (typeof R.iconeDoLugar === 'function') o.iconeDoLugar = (lugar, px) => noTamanho(R.iconeDoLugar(lugar, Math.max(8, Math.round(px / d()))), px)
  if (typeof R.padraoDoTecido === 'function') o.padraoDoTecido = (tipo, px) => {
    const chave = tipo + '|' + px
    let cv = cacheTec.get(chave)
    if (cv) return cv
    cv = document.createElement('canvas'); cv.width = cv.height = px
    const c = cv.getContext('2d'), U = 48 // o azulejo do rig mede 48 unidades: aqui 1 azulejo = px pixels
    c.setTransform(px / U, 0, 0, px / U, 0, 0); c.fillStyle = R.padraoDoTecido(c, tipo); c.fillRect(0, 0, U, U)
    if (cacheTec.size > 60) cacheTec.clear()
    cacheTec.set(chave, cv)
    return cv
  }
  if (typeof R.desenharParte === 'function') o.desenharParte = (c, partes, lugar, caixa) => {
    const id = partes?.[lugar]
    if (!id) throw new Error(`sem a parte ${lugar}`)
    R.desenharParte(c, id, caixa.x + caixa.w / 2, caixa.y + caixa.h / 2, Math.min(caixa.w, caixa.h))
  }
  if (typeof R.criarRig === 'function') o.boneco = (partes, altura, pose = 'vivo') => {
    const chave = Object.values(partes).join('|') + '|' + altura + '|' + pose
    let cv = cacheBoneco.get(chave)
    if (cv) return cv
    const caido = pose === 'caido', w = Math.ceil(altura * (caido ? 1.24 : 0.9)), h = Math.ceil(altura * 1.1)
    cv = document.createElement('canvas'); cv.width = w; cv.height = h
    R.criarRig(partes).desenhar(cv.getContext('2d'), w / 2, h - altura * 0.04, altura, 0, { pose: POSE_DO_RIG[pose] ?? 'parado', progresso: 1, menosAnimacao: true, fioAteY: 0 })
    if (cacheBoneco.size > 40) cacheBoneco.clear()
    cacheBoneco.set(chave, cv)
    return cv
  }
  return o
}

/** Promessa: cumpre quando a busca do desenho terminou. Valor: 'rig' | 'provisorio' | 'nenhum'. */
export const pronta = (async () => {
  try { fonte.rig = traduzirRig(await import('../boneco-rig.js')) } catch { fonte.rig = null }
  try { fonte.velho = await import('../bonecos.js') } catch { fonte.velho = null }
  fonte.origem = fonte.rig ? 'rig' : fonte.velho ? 'provisorio' : 'nenhum'
  return fonte.origem
})()

/** De onde está vindo o desenho agora (para a folha de conferência mostrar). */
export const origem = () => fonte.origem

const desenhavel = (x) => !!x && typeof x === 'object' && x.width > 0 && x.height > 0 && typeof x.getContext === 'function'

function doRig(nome, args, validar = desenhavel) {
  const f = fonte.rig?.[nome]
  if (typeof f !== 'function' || falhou.has(nome)) return undefined
  try {
    const r = f(...args)
    if (validar(r)) return r
    throw new Error('resposta que não se desenha')
  } catch (e) {
    falhou.add(nome)
    console.warn(`[arte] boneco-rig.js: "${nome}" falhou (${e?.message ?? e}); usando a reserva.`)
    return undefined
  }
}

// ------------------------------------------------------------------ tecidos: cor, padrão e marca (guia §2)

/** Cores de cada tecido (tabela do guia de estilo). */
export const TECIDOS = {
  jeans: { base: '#3F6FB5', luz: '#7EA6DE', sombra: '#27477A' },
  seda: { base: '#D65DB1', luz: '#F7B4E2', sombra: '#8E2E72' },
  la: { base: '#D9C9A3', luz: '#F6ECD2', sombra: '#9C8759' },
  feltro: { base: '#5E9C76', luz: '#9CCBAA', sombra: '#356048' },
  tule: { base: '#B9A7E8', luz: '#EEE8FF', sombra: '#7A69C2' },
  couro: { base: '#8B5A2B', luz: '#C28A57', sombra: '#4E2F14' },
}
export const corDoTecido = (tipo) => TECIDOS[tipo] ?? { base: '#5A4378', luz: '#8C76AE', sombra: '#2A1B3D' }

const cacheLadrilho = new Map()
/** Ladrilho provisório do tecido: quadrado de `px` pixels que se repete sem emenda. A trama tem escala fixa. */
function ladrilhoProvisorio(tipo, px) {
  const chave = tipo + '|' + px
  let cv = cacheLadrilho.get(chave)
  if (cv) return cv
  cv = document.createElement('canvas'); cv.width = cv.height = px
  const c = cv.getContext('2d'), T = px, u = px / 48, R = sorte(semear(tipo) + 11), cor = corDoTecido(tipo)
  c.fillStyle = cor.base; c.fillRect(0, 0, T, T)
  /** desenha 4 vezes (deslocado um ladrilho) para o desenho continuar na emenda */
  const emenda = (f) => { for (const dx of [0, -T]) for (const dy of [0, -T]) { c.save(); c.translate(dx, dy); f(); c.restore() } }
  if (tipo === 'jeans') { // sarja em diagonal
    c.lineWidth = u
    for (let k = -T; k <= T; k += 4 * u) {
      c.strokeStyle = 'rgba(255,255,255,0.17)'; c.beginPath(); c.moveTo(k, 0); c.lineTo(k + T, T); c.stroke()
      c.strokeStyle = 'rgba(8,18,48,0.26)'; c.beginPath(); c.moveTo(k + 2 * u, 0); c.lineTo(k + 2 * u + T, T); c.stroke()
    }
    c.strokeStyle = 'rgba(255,255,255,0.34)'; c.lineWidth = 1.1 * u; c.lineCap = 'round'
    for (let i = 0; i < 7; i++) { const x = R() * T, y = R() * T, l = (3 + R() * 4) * u; emenda(() => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y + l * 0.5); c.stroke() }) }
  } else if (tipo === 'seda') { // faixa de brilho
    for (let s = 0; s < 2 * T; s++) {
      const t = (s / T) % 1, a = Math.pow(Math.max(0, Math.cos((t - 0.32) * Math.PI * 2)), 8) * 0.5 + Math.pow(Math.max(0, Math.cos((t - 0.8) * Math.PI * 2)), 10) * 0.22
      if (a < 0.01) continue
      c.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`; c.lineWidth = 1.4; c.beginPath(); c.moveTo(s, 0); c.lineTo(s - T, T); c.stroke()
    }
    c.strokeStyle = 'rgba(90,0,70,0.10)'; c.lineWidth = u * 0.7
    for (let y = 1.5 * u; y < T; y += 3 * u) { c.beginPath(); c.moveTo(0, y); c.lineTo(T, y); c.stroke() }
  } else if (tipo === 'la') { // pontos de tricô em V
    const p = 6 * u; c.lineCap = 'round'; c.lineJoin = 'round'
    for (let y = 0; y < T; y += p) for (let x = 0; x < T; x += p) {
      c.strokeStyle = 'rgba(110,84,42,0.46)'; c.lineWidth = 1.25 * u; c.beginPath(); c.moveTo(x + 0.6 * u, y + 0.8 * u); c.lineTo(x + p / 2, y + p * 0.78); c.lineTo(x + p - 0.6 * u, y + 0.8 * u); c.stroke()
      c.strokeStyle = 'rgba(255,251,236,0.55)'; c.lineWidth = 0.8 * u; c.beginPath(); c.moveTo(x + 1.6 * u, y + 0.6 * u); c.lineTo(x + p / 2, y + p * 0.56); c.lineTo(x + p - 1.6 * u, y + 0.6 * u); c.stroke()
    }
  } else if (tipo === 'feltro') { // fosco salpicado
    c.lineWidth = 0.9 * u; c.lineCap = 'round'
    for (let i = 0; i < 150; i++) {
      const x = R() * T, y = R() * T, a = R() * 6.28, l = (1.2 + R() * 2.4) * u
      c.strokeStyle = R() < 0.5 ? 'rgba(240,255,235,0.34)' : 'rgba(14,44,26,0.34)'
      emenda(() => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke() })
    }
  } else if (tipo === 'tule') { // rede translúcida
    const p = 6 * u
    c.fillStyle = 'rgba(70,50,150,0.20)'
    for (let y = 0; y <= T; y += p) for (let x = 0; x <= T; x += p) { c.beginPath(); c.arc(x + p / 2, y, 1.5 * u, 0, 6.3); c.fill(); c.beginPath(); c.arc(x, y + p / 2, 1.5 * u, 0, 6.3); c.fill() }
    c.strokeStyle = 'rgba(255,255,255,0.62)'; c.lineWidth = 0.9 * u
    for (let k = -T; k <= 2 * T; k += p) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + T, T); c.stroke(); c.beginPath(); c.moveTo(k, 0); c.lineTo(k - T, T); c.stroke() }
  } else if (tipo === 'couro') { // poros e rachaduras
    for (let i = 0; i < 80; i++) { const x = R() * T, y = R() * T; c.fillStyle = R() < 0.7 ? 'rgba(30,12,0,0.34)' : 'rgba(255,225,180,0.20)'; c.beginPath(); c.arc(x, y, (0.5 + R() * 0.5) * u, 0, 6.3); c.fill() }
    c.strokeStyle = 'rgba(30,12,0,0.42)'; c.lineWidth = 0.9 * u; c.lineCap = 'round'; c.lineJoin = 'round'
    for (let i = 0; i < 5; i++) {
      let x = R() * T, y = R() * T; const pts = [[x, y]]
      for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 9 * u; y += (R() - 0.3) * 7 * u; pts.push([x, y]) }
      emenda(() => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]); c.stroke() })
    }
  }
  if (cacheLadrilho.size > 60) cacheLadrilho.clear()
  cacheLadrilho.set(chave, cv)
  return cv
}

/** Ladrilho do tecido (canvas quadrado de `px` pixels que se repete). */
export function padraoDoTecido(tipo, px = 96) {
  px = Math.max(8, Math.round(px))
  return doRig('padraoDoTecido', [tipo, px]) ?? ladrilhoProvisorio(tipo, px)
}

const cacheUrl = new Map()
/** O mesmo ladrilho como endereço de imagem para fundo de CSS (use com `background-size: <lado>px`). */
export function urlDoTecido(tipo, px = 96) {
  const chave = fonte.origem + '|' + tipo + '|' + px
  let u = cacheUrl.get(chave)
  if (!u) { u = padraoDoTecido(tipo, px).toDataURL(); cacheUrl.set(chave, u) }
  return u
}

/**
 * MARCA do tecido: um sinal simples e diferente para cada um (rebite, brilho, novelo, pingos, losango, rachadura),
 * para quem não distingue as cores. Desenha no contexto, centrada em (x, y), dentro do raio r.
 */
export function marcaDoTecido(c, tipo, x, y, r, { cor = '#F2E6C9', tinta = '#140C1F' } = {}) {
  c.save(); c.translate(x, y); c.lineCap = 'round'; c.lineJoin = 'round'
  const traco = (f, grosso) => { c.strokeStyle = tinta; c.lineWidth = grosso + r * 0.34; f(); c.stroke(); c.strokeStyle = cor; c.lineWidth = grosso; f(); c.stroke() }
  const cheio = (f) => { c.fillStyle = tinta; c.strokeStyle = tinta; c.lineWidth = r * 0.34; f(); c.stroke(); c.fillStyle = cor; f(); c.fill() }
  if (tipo === 'jeans') { traco(() => { c.beginPath(); c.arc(0, 0, r * 0.62, 0, 6.3) }, r * 0.26); cheio(() => { c.beginPath(); c.arc(0, 0, r * 0.2, 0, 6.3) }) }
  else if (tipo === 'seda') cheio(() => { c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, k = i % 2 ? r * 0.24 : r * 0.86; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * k, Math.sin(a) * k) } c.closePath() })
  else if (tipo === 'la') { traco(() => { c.beginPath(); c.arc(0, 0, r * 0.64, 0, 6.3) }, r * 0.24); traco(() => { c.beginPath(); c.moveTo(-r * 0.5, -r * 0.2); c.quadraticCurveTo(0, r * 0.25, r * 0.5, -r * 0.2); c.moveTo(-r * 0.4, r * 0.22); c.quadraticCurveTo(0, r * 0.6, r * 0.4, r * 0.22) }, r * 0.18) }
  else if (tipo === 'feltro') for (const [dx, dy] of [[0, -0.46], [-0.44, 0.34], [0.44, 0.34]]) cheio(() => { c.beginPath(); c.arc(dx * r, dy * r, r * 0.24, 0, 6.3) })
  else if (tipo === 'tule') { traco(() => { c.beginPath(); c.moveTo(0, -r * 0.8); c.lineTo(r * 0.7, 0); c.lineTo(0, r * 0.8); c.lineTo(-r * 0.7, 0); c.closePath() }, r * 0.24); cheio(() => { c.beginPath(); c.arc(0, 0, r * 0.14, 0, 6.3) }) }
  else if (tipo === 'couro') traco(() => { c.beginPath(); c.moveTo(-r * 0.2, -r * 0.82); c.lineTo(r * 0.32, -r * 0.2); c.lineTo(-r * 0.32, r * 0.2); c.lineTo(r * 0.2, r * 0.82) }, r * 0.28)
  c.restore()
}

const cacheIcone = new Map()
/** Ícone do tipo: retalho redondo do tecido (canvas de `px` pixels). Na reserva ganha a marca por cima. */
export function iconeDoTipo(tipo, px = 48) {
  px = Math.max(8, Math.round(px))
  const doNovo = doRig('iconeDoTipo', [tipo, px])
  if (doNovo) return doNovo
  const chave = fonte.origem + '|' + tipo + '|' + px
  let cv = cacheIcone.get(chave)
  if (cv) return cv
  cv = document.createElement('canvas'); cv.width = cv.height = px
  const c = cv.getContext('2d')
  let base = null
  try { base = fonte.velho?.iconeDoTipo?.(tipo, px) } catch { base = null }
  if (desenhavel(base)) c.drawImage(base, 0, 0, px, px)
  else { // retalho redondo provisório: tecido + contorno + costura
    const r = px / 2
    c.save(); c.beginPath(); c.arc(r, r, r * 0.9, 0, 6.3); c.clip()
    c.fillStyle = c.createPattern(ladrilhoProvisorio(tipo, 96), 'repeat'); c.fillRect(0, 0, px, px)
    const g = c.createLinearGradient(0, 0, px, px); g.addColorStop(0, 'rgba(255,240,200,0.22)'); g.addColorStop(1, 'rgba(20,12,31,0.38)'); c.fillStyle = g; c.fillRect(0, 0, px, px)
    c.restore()
    c.strokeStyle = '#140C1F'; c.lineWidth = Math.max(1.5, px * 0.07); c.beginPath(); c.arc(r, r, r * 0.9, 0, 6.3); c.stroke()
    c.strokeStyle = '#F2E6C9'; c.lineWidth = Math.max(1, px * 0.045); c.setLineDash([px * 0.1, px * 0.08]); c.beginPath(); c.arc(r, r, r * 0.7, 0, 6.3); c.stroke(); c.setLineDash([])
  }
  marcaDoTecido(c, tipo, px / 2, px / 2, px * 0.27)
  if (cacheIcone.size > 120) cacheIcone.clear()
  cacheIcone.set(chave, cv)
  return cv
}

// ------------------------------------------------------------------ lugar da parte (cabeça, braços, pernas)

const cacheLugar = new Map()
/** Ícone do lugar da parte, em silhueta de pano (canvas de `px` pixels). */
export function iconeDoLugar(lugar, px = 48, { cor = '#F2E6C9', tinta = '#140C1F' } = {}) {
  px = Math.max(8, Math.round(px))
  const doNovo = doRig('iconeDoLugar', [lugar, px])
  if (doNovo) return doNovo
  const chave = lugar + '|' + px + '|' + cor + '|' + tinta
  let cv = cacheLugar.get(chave)
  if (cv) return cv
  cv = document.createElement('canvas'); cv.width = cv.height = px
  const c = cv.getContext('2d'); c.scale(px / 24, px / 24); c.lineJoin = 'round'; c.lineCap = 'round'
  const forma = (p, lw = 2) => { c.fillStyle = cor; c.fill(p); c.strokeStyle = tinta; c.lineWidth = lw; c.stroke(p) }
  if (lugar === 'cabeca') {
    for (const x of [3.6, 20.4]) { const o = new Path2D(); o.ellipse(x, 11.4, 1.8, 2.5, 0, 0, 6.3); forma(o, 1.6) } // orelhas
    const p = new Path2D(); p.ellipse(12, 12.4, 8.6, 7.8, 0, 0, 6.3); forma(p)
    c.fillStyle = tinta; c.beginPath(); c.arc(9, 11, 2.5, 0, 6.3); c.fill(); c.beginPath(); c.arc(15.6, 11.8, 1.4, 0, 6.3); c.fill()
    c.strokeStyle = tinta; c.lineWidth = 1.4; c.beginPath(); c.moveTo(8.6, 16); c.lineTo(15.4, 16); c.stroke()
    c.lineWidth = 1; for (const x of [10, 12, 14]) { c.beginPath(); c.moveTo(x, 15); c.lineTo(x, 17); c.stroke() }
  } else if (lugar === 'bracos') {
    const p = new Path2D(); p.moveTo(4.5, 5.5); p.bezierCurveTo(10, 4, 14.5, 8, 15.5, 13.2); p.bezierCurveTo(19.4, 12.6, 22, 15.6, 20.6, 18.8); p.bezierCurveTo(19.4, 21.6, 14.4, 21.4, 12.8, 18.2); p.bezierCurveTo(11.6, 15.2, 9.8, 11.4, 4.2, 11.2); p.closePath(); forma(p)
    c.strokeStyle = tinta; c.lineWidth = 1.2; c.setLineDash([1.6, 1.8]); c.beginPath(); c.moveTo(13.6, 13.4); c.lineTo(12.6, 17.6); c.stroke(); c.setLineDash([])
  } else { // pernas
    const p = new Path2D(); p.moveTo(7.5, 3.5); p.lineTo(14.5, 3.5); p.bezierCurveTo(14.2, 9, 14.4, 12.4, 15.2, 14.6); p.bezierCurveTo(19.6, 14.8, 22, 17.2, 21.6, 20.6); p.lineTo(7.4, 20.6); p.bezierCurveTo(6.2, 15.4, 7, 9.5, 7.5, 3.5); p.closePath(); forma(p)
    c.strokeStyle = tinta; c.lineWidth = 1.2; c.setLineDash([1.6, 1.8]); c.beginPath(); c.moveTo(8, 16.6); c.lineTo(15.4, 16.6); c.stroke(); c.setLineDash([])
  }
  if (cacheLugar.size > 60) cacheLugar.clear()
  cacheLugar.set(chave, cv)
  return cv
}

// ------------------------------------------------------------------ boneco: carinha, corpo inteiro e parte

function carinhaVazia(px) { // sem nenhuma fonte de desenho: um botão de olho, para não ficar em branco
  const cv = document.createElement('canvas'); cv.width = cv.height = px
  const c = cv.getContext('2d'), r = px / 2
  c.fillStyle = '#3A2752'; c.beginPath(); c.arc(r, r, r * 0.86, 0, 6.3); c.fill()
  c.fillStyle = '#F2E6C9'; c.strokeStyle = '#140C1F'; c.lineWidth = px * 0.06; c.beginPath(); c.arc(r, r, r * 0.46, 0, 6.3); c.fill(); c.stroke()
  c.fillStyle = '#140C1F'; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.arc(r + dx * r * 0.16, r + dy * r * 0.16, r * 0.07, 0, 6.3); c.fill() }
  return cv
}

/** Carinha do boneco (canvas quadrado de `px` pixels). */
export function retrato(partes, px = 64) {
  px = Math.max(8, Math.round(px))
  const doNovo = doRig('retrato', [partes, px])
  if (doNovo) return doNovo
  try { const m = fonte.velho?.miniatura?.(partes, px); if (desenhavel(m)) return m } catch { /* cai para o provisório */ }
  return carinhaVazia(px)
}

/** Boneco inteiro (canvas). `altura` em pixels do canvas. pose: 'vivo' | 'fio' | 'caido'. Devolve null se não houver desenho. */
export function boneco(partes, altura = 232, pose = 'vivo') {
  altura = Math.max(16, Math.round(altura))
  const doNovo = doRig('boneco', [partes, altura, pose])
  if (doNovo) return doNovo
  try { const s = fonte.velho?.spriteDoBoneco?.(partes, pose, altura / (fonte.velho.SH ?? 232)); if (desenhavel(s)) return s } catch { /* sem desenho */ }
  return null
}

// recorte do boneco de hoje (espaço 160×232) que mostra cada parte
const RECORTE = { cabeca: { x: 14, y: 6, w: 132, h: 92 }, bracos: { x: -8, y: 82, w: 176, h: 98 }, pernas: { x: 20, y: 138, w: 120, h: 84 } }

/** Desenho PROVISÓRIO da parte: recorte ampliado do boneco de hoje, com as bordas do recorte esmaecidas. */
function parteProvisoria(c, partes, lugar, caixa) {
  const v = fonte.velho
  if (!v?.spriteDoBoneco) return false
  const r = RECORTE[lugar] ?? RECORTE.cabeca
  const m = c.getTransform(), d = Math.hypot(m.a, m.b) || 1 // pixels do canvas por unidade do desenho
  const esc = Math.min(caixa.w / r.w, caixa.h / r.h)
  const W = Math.max(2, Math.round(r.w * esc * d)), H = Math.max(2, Math.round(r.h * esc * d))
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H
  const t = tmp.getContext('2d')
  const sp = v.spriteDoBoneco(partes, 'vivo', esc * d)
  t.drawImage(sp, -r.x * esc * d, -r.y * esc * d)
  if (lugar === 'bracos') { // escurece o tronco: quem aparece são os braços
    t.globalCompositeOperation = 'source-atop'
    const cx = (80 - r.x) * esc * d, cy = (124 - r.y) * esc * d
    const g = t.createRadialGradient(cx, cy, 8 * esc * d, cx, cy, 50 * esc * d)
    g.addColorStop(0, 'rgba(20,12,31,0.78)'); g.addColorStop(0.72, 'rgba(20,12,31,0.72)'); g.addColorStop(1, 'rgba(20,12,31,0)')
    t.fillStyle = g; t.fillRect((36 - r.x) * esc * d, 0, 88 * esc * d, H)
  }
  // esmaece onde o recorte corta o corpo (pescoço, ombros, cintura)
  t.globalCompositeOperation = 'destination-out'
  const some = (y0, y1) => { const g = t.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); t.fillStyle = g; t.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0)) }
  if (lugar === 'cabeca') some(H, H * 0.86)
  else if (lugar === 'bracos') { some(0, H * 0.16); some(H, H * 0.82) }
  else some(0, H * 0.14)
  c.drawImage(tmp, caixa.x + (caixa.w - r.w * esc) / 2, caixa.y + (caixa.h - r.h * esc) / 2, r.w * esc, r.h * esc)
  return true
}

/**
 * Desenha a parte do boneco ('cabeca' | 'bracos' | 'pernas') dentro da caixa {x, y, w, h} do contexto.
 * Devolve true se desenhou.
 */
export function desenharParte(c, partes, lugar, caixa) {
  const f = fonte.rig?.desenharParte
  if (typeof f === 'function' && !falhou.has('desenharParte')) {
    c.save()
    try { f(c, partes, lugar, caixa); c.restore(); return true } catch (e) {
      c.restore(); falhou.add('desenharParte')
      console.warn(`[arte] boneco-rig.js: "desenharParte" falhou (${e?.message ?? e}); usando o desenho provisório.`)
    }
  }
  try { return parteProvisoria(c, partes, lugar, caixa) } catch { return false }
}
