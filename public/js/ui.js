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

// ---------------------------------------------------------------- pergunta antes de uma ação sem volta (tarefa 21)
let confirmaAberta = null
/** Janela de confirmação (etiqueta de pano): fecha pelo X, Esc, "Voltar" ou clique fora (= não). → Promise<boolean>.
 *  { titulo, texto, linhas: [texto], sim, nao, perigo } — o texto vem de quem chama (números lidos na ponte). */
export function confirmar({ titulo, texto, linhas = [], sim = 'Sim', nao = 'Voltar', perigo = false } = {}) {
  if (confirmaAberta) confirmaAberta(false)
  return new Promise((ok) => {
    const fundo = el('div', 'modal fz-confirma'); fundo.id = 'confirma'
    const folha = el('div', 'folha fz-confirma__folha'); folha.setAttribute('role', 'alertdialog'); folha.setAttribute('aria-modal', 'true'); folha.setAttribute('aria-labelledby', 'confirmaTit')
    const x = el('button', 'fechar', '×'); x.type = 'button'; x.id = 'confirmaFechar'; x.setAttribute('aria-label', 'Fechar')
    const h = el('h2', 'fz-confirma__titulo', titulo); h.id = 'confirmaTit'
    folha.append(x, h)
    if (texto) folha.append(el('p', 'fz-confirma__texto', texto))
    if (linhas.length) { const ul = el('ul', 'fz-confirma__lista'); for (const l of linhas) ul.append(el('li', null, l)); folha.append(ul) }
    const bts = el('div', 'fz-confirma__botoes')
    const bNao = el('button', 'fz-confirma__nao', nao); bNao.type = 'button'; bNao.id = 'btnConfirmaNao'
    const bSim = el('button', 'fz-confirma__sim' + (perigo ? ' fz-confirma__sim--perigo' : ''), sim); bSim.type = 'button'; bSim.id = 'btnConfirmaSim'
    bts.append(bNao, bSim); folha.append(bts); fundo.append(folha)
    const fim = (v) => {
      if (confirmaAberta !== fim) return
      confirmaAberta = null
      document.removeEventListener('keydown', tecla, true)
      fundo.remove(); ok(v)
    }
    const tecla = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); fim(false) } }
    confirmaAberta = fim
    x.addEventListener('click', () => fim(false)); bNao.addEventListener('click', () => fim(false)); bSim.addEventListener('click', () => fim(true))
    fundo.addEventListener('click', (e) => { if (e.target === fundo) fim(false) })
    document.addEventListener('keydown', tecla, true)
    ;(document.getElementById('app') ?? document.body).append(fundo)
    requestAnimationFrame(() => bNao.focus())
  })
}
/** Há uma confirmação aberta? Fecha (= não). A tecla Voltar do navegador fecha ela primeiro. */
export const fecharConfirmacao = () => { if (!confirmaAberta) return false; confirmaAberta(false); return true }
