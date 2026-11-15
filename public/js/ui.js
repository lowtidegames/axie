// Frayz — peças de tela compartilhadas pelas telas (só montagem de elementos e desenho de bonecos; nenhuma regra).
import { iconeDoTipo, spriteDoBoneco } from './bonecos.js'
import * as P from './ponte.js'

export const $ = (s) => document.querySelector(s)
export const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e }
export const NOME_LUGAR = ['Frente', 'Meio', 'Trás']
export const menos = () => document.documentElement.dataset.menos === '1'

/** Desenha o boneco (partes = faces 'id@raridade') num canvas da página. remendo: nível 0..5 (vem de nivelDeRemendo). */
export function desenharBonecoEm(canvas, partes, est = 'vivo', largura = 84, remendo = 0) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), esc = largura / 150
  const sp = spriteDoBoneco(partes, est, esc * dpr, remendo)
  canvas.width = sp.width; canvas.height = sp.height
  canvas.style.width = sp.width / dpr + 'px'; canvas.style.height = sp.height / dpr + 'px'
  canvas.getContext('2d').drawImage(sp, 0, 0)
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
