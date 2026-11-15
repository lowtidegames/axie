// Piloto — tela "Monsters" e a FICHA do monstro com a HISTÓRIA dele (placar por lugar, golpes Strong, títulos) e o
// cartão PNG para postar ("Share card": canvas → download). Tudo aqui é leitura do que a conta guardou; nada dá força.
import { montarBoneco } from '../../shared/batalha.js'
import { PARTES } from '../../shared/config.js'
import * as Arte from './arte.js'
import { FEITOS, LUGARES } from './conta-piloto.js'
import { AVISOS, ELEMENTOS, NOMES, RARIDADE, SLOT_EN, feitoDoTitulo, nomeDaParte, nomeDoLugar, nomeDoTitulo } from './tema.js'

const $ = (s, r = document) => r.querySelector(s)
const idDe = (g) => String(g).split('@')[0]
const rarDe = (g) => String(g).split('@')[1] ?? 'comum'

export function criarFicha({ conta, tocar, faiscas, ganchos }) {
  const fundo = $('#gFundo'), corpo = $('#gCorpo')
  let aberto = null, focoAntes = null
  const tipoDe = (def) => PARTES[idDe(def.partes.tronco)].tipo
  const chip = (t) => `<span class="chip" style="--c:${ELEMENTOS[t].cor}"><img class="px" src="${Arte.url(Arte.iconeElemento(t))}" alt="">${ELEMENTOS[t].nome}</span>`
  const temPng = (def) => !!(def.pronto && Arte.manifesto().monsters?.[def.pronto]?.idle)

  function desenharGrade() {
    const g = $('#gGrade')
    g.innerHTML = conta.todos().map((m) => {
      const def = conta.def(m), h = conta.historia(m.uid)
      return `<button type="button" class="g-item" data-uid="${m.uid}"><img class="px" src="${Arte.url(Arte.monstro(def))}" alt=""><b>${m.nome}</b>${chip(tipoDe(def))}
        <small>${h.lutas ? `${h.v} W – ${h.d} L` : 'No fights yet'}</small>${h.titulos.length ? `<em>${h.titulos.length} title${h.titulos.length > 1 ? 's' : ''}</em>` : ''}</button>`
    }).join('')
    for (const b of g.querySelectorAll('.g-item')) b.addEventListener('click', () => abrir(b.dataset.uid))
  }

  function abrir(uid) {
    const m = conta.porUid(uid)
    if (!m) return
    aberto = uid
    const def = conta.def(m), f = montarBoneco(def), t = tipoDe(def), h = conta.historia(uid), rar = rarDe(def.partes.tronco)
    const lugares = LUGARES.filter((l) => l.aberto).map((l) => { const p = h.lugares[l.n] ?? { v: 0, d: 0 }; return `<li><span>${nomeDoLugar(l.n)}</span><b>${p.v} W – ${p.d} L</b></li>` }).join('')
    corpo.innerHTML = `<div class="g-cab" style="--c:${ELEMENTOS[t].cor}"><div class="g-retrato"><img class="px" src="${Arte.url(Arte.monstro(def))}" alt=""></div>
        <div><h2 id="gNome">${m.nome}</h2><p class="g-linha">${chip(t)}<span><span class="gema" style="--g:${RARIDADE[rar].cor}"></span>${RARIDADE[rar].nome}</span></p>
        <div class="stats"><span>HP ${f.vidaMax}</span><span>Armor ${f.firmeza}%</span><span>Crit ${f.rapidez}%</span></div>
        <p class="g-partes">${['cabeca', 'bracos', 'pernas'].map((s) => `${SLOT_EN[s]}: ${nomeDaParte(idDe(def.partes[s]))}`).join(' · ')}</p>
        ${temPng(def) ? '' : '<small class="g-prov">placeholder art</small>'}</div></div>
      <h3>Story</h3>
      <div class="g-nums"><div><b>${h.v} W – ${h.d} L</b><small>${h.lutas} fights</small></div><div><b>${h.forte}</b><small>Strong hits landed</small></div></div>
      <ul class="g-lugares">${lugares}</ul>
      <h3>Titles</h3>
      ${h.titulos.length ? `<ul class="g-titulos">${h.titulos.map((x) => `<li><i></i><b>${nomeDoTitulo(x)}</b><small>${feitoDoTitulo(x)}</small></li>`).join('')}</ul>` : `<p class="sub">No titles yet. ${FEITOS.veteranoLutas} fights at one place earn its Veteran title.</p>`}
      <p class="g-renome"><i class="c-estrela"></i>Account ${NOMES.renome} <b>${conta.renome}</b> <small>${AVISOS.renome}</small></p>`
    $('#gPrevia').hidden = true; $('#gPrevia').innerHTML = ''
    if (fundo.hidden) focoAntes = document.activeElement
    fundo.hidden = false
    $('#gX').focus()
  }
  function fechar() { if (fundo.hidden) return; fundo.hidden = true; aberto = null; focoAntes?.focus?.() }
  $('#gX').addEventListener('click', fechar)
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar() })
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar() })

  // ---------------------------------------------------------------- cartão PNG (480×640, pixel art ampliada sem borrar)
  async function gerarCartao(uid) {
    const m = conta.porUid(uid), def = conta.def(m), t = tipoDe(def), el = ELEMENTOS[t], h = conta.historia(uid), rar = rarDe(def.partes.tronco)
    try { await Promise.all([document.fonts.load('40px "Lilita One"'), document.fonts.load('800 16px "Nunito"')]) } catch { /* segue com a fonte do sistema */ }
    const W = 480, H = 640, cv = Arte.criarCanvas(W, H), cx = cv.getContext('2d')
    const PLUM = '#2B1E3A', CREME = '#F7F1E3', OURO = '#FFB347'
    const caixa = (x, y, w, hh, r, cor) => { cx.fillStyle = cor; cx.beginPath(); cx.roundRect(x, y, w, hh, r); cx.fill() }
    cx.imageSmoothingEnabled = false
    caixa(0, 0, W, H, 28, PLUM); caixa(8, 8, W - 16, H - 16, 22, el.cor); caixa(14, 14, W - 28, H - 28, 18, CREME)
    // faixa do topo com o nome do jogo
    caixa(14, 14, W - 28, 54, 18, PLUM); cx.fillStyle = PLUM; cx.fillRect(14, 44, W - 28, 24)
    cx.textBaseline = 'middle'
    cx.fillStyle = OURO; cx.font = '24px "Lilita One", sans-serif'; cx.textAlign = 'left'; cx.fillText(NOMES.jogo, 32, 42)
    cx.fillStyle = CREME; cx.font = '800 13px "Nunito", sans-serif'; cx.textAlign = 'right'; cx.fillText('pilot', W - 32, 43)
    // céu do elemento com raios em degraus e o monstro ×4
    const cxm = W / 2, cym = 212
    cx.save(); cx.beginPath(); cx.roundRect(30, 80, W - 60, 264, 14); cx.clip()
    cx.fillStyle = el.claro; cx.fillRect(30, 80, W - 60, 264)
    cx.fillStyle = el.cor; cx.globalAlpha = 0.45
    for (let i = 0; i < 12; i += 2) { cx.beginPath(); cx.moveTo(cxm, cym); cx.arc(cxm, cym, 400, (i * Math.PI) / 6, ((i + 1) * Math.PI) / 6); cx.fill() }
    cx.globalAlpha = 1
    cx.fillStyle = 'rgba(43,30,58,0.22)'; cx.fillRect(cxm - 84, 322, 168, 10); cx.fillRect(cxm - 64, 318, 128, 18)
    cx.drawImage(Arte.monstro(def), cxm - 128, 74, 256, 256)
    cx.restore()
    cx.strokeStyle = PLUM; cx.lineWidth = 4; cx.beginPath(); cx.roundRect(30, 80, W - 60, 264, 14); cx.stroke()
    // nome, elemento e raridade
    cx.textAlign = 'center'; cx.fillStyle = PLUM; cx.font = '42px "Lilita One", sans-serif'; cx.fillText(m.nome, cxm, 380)
    cx.font = '800 17px "Nunito", sans-serif'
    const linha = `${el.nome} · ${RARIDADE[rar].nome}`, lw = cx.measureText(linha).width
    cx.drawImage(Arte.iconeElemento(t), Math.round(cxm - lw / 2 - 30), 399, 24, 24)
    cx.fillText(linha, cxm + 4, 412)
    // placar
    caixa(40, 432, W - 80, 62, 12, '#EADFC8')
    cx.fillStyle = PLUM; cx.font = '30px "Lilita One", sans-serif'; cx.fillText(`${h.v} W – ${h.d} L`, cxm - 96, 455)
    cx.fillText(`${h.forte}`, cxm + 110, 455)
    cx.font = '800 12px "Nunito", sans-serif'; cx.fillStyle = '#5A4470'
    cx.fillText(`${h.lutas} fights`, cxm - 96, 480); cx.fillText('Strong hits landed', cxm + 110, 480)
    const porLugar = LUGARES.filter((l) => l.aberto && h.lugares[l.n]).map((l) => `${nomeDoLugar(l.n)} ${h.lugares[l.n].v}–${h.lugares[l.n].d}`).join('   ·   ')
    cx.font = '800 14px "Nunito", sans-serif'; cx.fillText(porLugar || 'No patrols yet', cxm, 512)
    // títulos em fitas
    const tits = h.titulos.slice(0, 4).map(nomeDoTitulo)
    cx.font = '18px "Lilita One", sans-serif'
    let y = 540
    if (!tits.length) { cx.fillStyle = '#5A4470'; cx.font = '800 14px "Nunito", sans-serif'; cx.fillText('No titles yet', cxm, y) }
    for (let i = 0; i < tits.length; i += 2) {
      const par = tits.slice(i, i + 2), larg = par.map((x) => cx.measureText(x).width + 40)
      let x = cxm - (larg.reduce((a, b) => a + b, 0) + (par.length - 1) * 10) / 2
      par.forEach((txt, k) => {
        caixa(x, y - 16, larg[k], 32, 16, PLUM); caixa(x + 3, y - 13, larg[k] - 6, 26, 13, OURO)
        cx.fillStyle = PLUM; cx.textAlign = 'center'; cx.fillText(txt, x + larg[k] / 2, y + 1)
        x += larg[k] + 10
      })
      y += 36
    }
    cx.fillStyle = '#5A4470'; cx.font = '800 13px "Nunito", sans-serif'; cx.textAlign = 'center'
    cx.fillText(`Account ${NOMES.renome} ${conta.renome}`, cxm, H - 25)
    return { cv, nome: m.nome }
  }
  $('#gCartao').addEventListener('click', async () => {
    if (!aberto) return
    const { cv, nome } = await gerarCartao(aberto)
    const url = cv.toDataURL('image/png')
    const a = $('#gBaixar')
    a.href = url; a.download = `${nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-card.png`
    a.click()
    const p = $('#gPrevia')
    p.hidden = false
    p.innerHTML = `<img src="${url}" alt="Card of ${nome}" width="240" height="320"><small>Saved as ${a.download}</small>`
    tocar('cartao'); faiscas(p.querySelector('img'), '#FFB347', 10)
    ganchos?.cartao?.({ w: cv.width, h: cv.height, url, arquivo: a.download })
    p.scrollIntoView({ block: 'nearest' })
  })
  $('#gCartao').dataset.somProprio = '1'

  return { desenharGrade, abrir, fechar }
}
