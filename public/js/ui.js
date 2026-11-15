// Frayz — peças de tela compartilhadas pelas telas (só montagem de elementos e desenho de bonecos; nenhuma regra).
import { iconeDoTipo } from './bonecos.js'
import { criarRig } from './boneco-rig.js'
import * as P from './ponte.js'

export const $ = (s) => document.querySelector(s)
export const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e }
export const NOME_LUGAR = ['Frente', 'Meio', 'Trás']
export const menos = () => document.documentElement.dataset.menos === '1'

const POSE = { vivo: 'parado', fio: 'ultimoFio', caido: 'caido', vitoria: 'vitoria' }
/** Desenha o boneco de pano (rig novo; partes = faces 'id@raridade') num canvas da página, parado.
 *  largura = a medida de sempre das telas (a caixa é largura × 1,067 por largura × 1,547). remendo: nível 0..5 (vem de nivelDeRemendo). */
export function desenharBonecoEm(canvas, partes, est = 'vivo', largura = 84, remendo = 0) {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.round(largura * (160 / 150)), h = Math.round(largura * (232 / 150)), altura = h * 0.88
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h)
  try {
    criarRig(partes, { remendos: remendo, semente: Object.values(partes).join('|') }).desenhar(c, w / 2, h - h * 0.05, altura, 0, { pose: POSE[est] ?? 'parado', progresso: 1, menosAnimacao: true, fioAteY: 0 })
  } catch (e) { console.warn('[arte] boneco não desenhou: ' + (e?.message ?? e)) }
}
export const iconeTipo = (t, px = 18) => { const c = document.createElement('canvas'); c.width = c.height = Math.round(px * 2); c.style.width = c.style.height = px + 'px'; c.getContext('2d').drawImage(iconeDoTipo(t, px * 2), 0, 0); c.className = 'ic-tipo'; return c }

/** Boneco com genes → canvas (faces + remendos do desgaste). */
export function bonecoCanvas(b, largura = 84, est = 'vivo') {
  const cv = el('canvas', 'f-boneco')
  desenharBonecoEm(cv, P.facesDe(b), est, largura, P.nivelDeRemendo(b))
  return cv
}

let tMsg
/** Aviso curto nas telas do hub (nada de modal). */
export function avisoHub(txt, erro = true, alvoSel = '#hubMsg') {
  let m = document.querySelector(alvoSel)
  if (!m) { m = el('div', 'hub-msg'); m.id = alvoSel.slice(1); m.setAttribute('role', 'status'); document.getElementById('hub').append(m) }
  m.textContent = txt; m.hidden = false; m.classList.toggle('erro', erro)
  clearTimeout(tMsg); tMsg = setTimeout(() => { m.hidden = true }, 3200)
  window.__frayz?.avisos.push(txt)
}

/** Chips: tipo + nome + raridade. */
export function chipParte(gene, { forro = false } = {}) {
  const i = P.infoDaParte(gene)
  const c = el('span', 'chip-parte'); c.dataset.rar = i.raridade; c.title = i.carta ? `${i.carta.nome}: ${i.carta.texto}` : i.bordado ? `${i.bordado.nome}: ${i.bordado.texto}` : i.nome
  if (i.tipo) c.append(iconeTipo(i.tipo, 14))
  c.append(el('span', null, P.apelidoDaParte(gene) + (forro ? ' (forro)' : '')))
  const r = el('em', 'rar', P.RARIDADES[i.raridade].nome); r.dataset.rar = i.raridade
  c.append(r)
  return c
}
export const pct = (x) => `${Math.round(x * 1000) / 10}%`.replace('.', ',')
