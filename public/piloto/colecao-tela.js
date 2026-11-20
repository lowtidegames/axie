// Piloto — tela "Collection": a grade dos monstros, a ficha simples (desenho grande, elemento, raridade, partes, lutas feitas
// da vida, clutches) e o "Breed": escolher dois → chances por parte na tela → ovo (que abre na tela Egg).
// A tela não sorteia nada: as chances saem de chancesDaCostura() e o filhote de costurar() (shared/costura.js).
import { chancesDaCostura, costurar, podeCosturar } from '../../shared/costura.js'
import * as Arte from './arte.js'
import { LUTAS_DA_VIDA } from './conta-piloto.js'
import { CLUTCHES, ELEMENTOS, ORDEM_DAS_PARTES, RARIDADE, SLOT_EN, nomeDaParte, nomePorApelidos } from './tema.js'

const $ = (s, r = document) => r.querySelector(s)
const idDe = (g) => String(g).split('@')[0]
const pct = (x) => `${Math.round(x * 1000) / 10}%`
const num = (n) => n.toLocaleString('en-US')
const RECUSA = { CARRETEL_CHEIO: 'One of them has no clutches left.', PARENTES: 'Close relatives cannot breed.', MESMO_BONECO: 'Pick two different monsters.', APOSENTADO: 'One of them has retired.' }

export function criarColecao({ raiz, conta, pecas, tocar, ganchos }) {
  const fundo = $('#gFundo'), corpo = $('#gCorpo')
  const C = { aberto: null, focoAntes: null, sel: [] }

  // ---------------------------------------------------------------- grade
  function desenharGrade() {
    $('#gLista', raiz).hidden = false; $('#xCruzar', raiz).hidden = true
    const g = $('#gGrade', raiz)
    const ovo = conta.ovoDeCruza ? `<button type="button" class="card g-ovo" id="gOvo"><img class="px card__img" src="${Arte.url(Arte.ovo('whole'))}" alt=""><b>Egg</b><small class="selo">Tap to hatch</small></button>` : ''
    g.innerHTML = ovo + conta.todos().map((m) => pecas.cartao(m, { cls: 'g-item' })).join('')
    for (const b of g.querySelectorAll('.g-item')) b.addEventListener('click', () => abrir(b.dataset.uid))
    g.querySelector('#gOvo')?.addEventListener('click', () => ganchos?.ovo?.())
    ganchos?.mudou?.()
  }

  // ---------------------------------------------------------------- ficha (janela)
  function abrir(uid) {
    const m = conta.porUid(uid)
    if (!m) return
    C.aberto = uid
    const def = conta.def(m), t = conta.tipo(m), rar = conta.raridade(m)
    corpo.innerHTML = `<div class="g-retrato" style="--c:${ELEMENTOS[t].claro}"><img class="px" src="${Arte.url(Arte.monstro(def))}" alt=""></div>
      <h2 id="gNome">${m.nome}</h2>
      <p class="g-linha">${pecas.chip(t)}${pecas.raridade(rar)}${m.aposentado ? '<span class="selo selo--zz">Retired</span>' : pecas.selo(m.uid)}</p>
      <ul class="g-partes">${ORDEM_DAS_PARTES.map((s) => `<li><small>${SLOT_EN[s]}</small><b>${nomeDaParte(idDe(def.partes[s]))}</b></li>`).join('')}</ul>
      <div class="g-nums"><div><b>${num(m.lutas)}<i>/${num(LUTAS_DA_VIDA)}</i></b><small>Fights</small></div><div><b>${m.voltas}<i>/${CLUTCHES}</i></b><small>Clutches</small></div></div>`
    $('#gBreed').hidden = m.aposentado
    $('#gRetire').hidden = m.aposentado || !conta.fimDaVida(m)
    if (fundo.hidden) C.focoAntes = document.activeElement
    fundo.hidden = false
    $('#gX').focus()
    ganchos?.mudou?.()
  }
  function fechar() { if (fundo.hidden) return; fundo.hidden = true; C.aberto = null; C.focoAntes?.focus?.() }
  $('#gX').addEventListener('click', fechar)
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar() })
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar() })
  $('#gBreed').addEventListener('click', () => { const u = C.aberto; fechar(); abrirCruzar(u) })
  $('#gRetire').addEventListener('click', () => { if (conta.aposentar(C.aberto)) { fechar(); desenharGrade() } })

  // ---------------------------------------------------------------- Breed: escolher dois → chances → ovo
  function abrirCruzar(uid = null) {
    if (conta.ovoDeCruza) { ganchos?.ovo?.(); return } // já há um ovo esperando: abrir primeiro
    C.sel = uid ? [uid] : []
    $('#gLista', raiz).hidden = true; $('#xCruzar', raiz).hidden = false
    desenharCruzar()
    window.scrollTo(0, 0)
  }
  function desenharCruzar() {
    const g = $('#xPais', raiz)
    g.innerHTML = conta.ativos().map((m) => pecas.cartao(m, { cls: 'x-pai', pressed: C.sel.includes(m.uid), extra: `<small class="selo">Clutches ${m.voltas}/${CLUTCHES}</small>`, semSelo: true })).join('')
    for (const b of g.querySelectorAll('.x-pai')) {
      b.dataset.somProprio = '1'
      b.addEventListener('click', () => {
        const u = b.dataset.uid
        C.sel = C.sel.includes(u) ? C.sel.filter((x) => x !== u) : [...C.sel, u].slice(-2)
        tocar('pega')
        desenharCruzar()
        if (C.sel.length === 2) window.scrollTo(0, 0) // as chances aparecem em cima, antes do botão
      })
    }
    const ch = $('#xChances', raiz), bt = $('#xFazer', raiz), dica = $('#xDica', raiz)
    if (C.sel.length < 2) {
      ch.hidden = true; bt.disabled = true
      dica.textContent = C.sel.length ? 'Pick one more.' : 'Pick two monsters.'
      ganchos?.mudou?.()
      return
    }
    const [A, B] = C.sel.map((u) => conta.porUid(u))
    const pa = conta.paraCostura(A), pb = conta.paraCostura(B)
    const pode = podeCosturar(pa, pb)
    bt.disabled = !pode.ok
    dica.textContent = pode.ok ? `${A.nome} + ${B.nome}: the chance of each part` : RECUSA[pode.codigo] ?? 'These two cannot breed.'
    ch.hidden = !pode.ok
    if (pode.ok) {
      const chances = chancesDaCostura(pa, pb)
      ch.innerHTML = ORDEM_DAS_PARTES.map((slot) => `<div class="x-linha"><b>${SLOT_EN[slot]}</b><ul>${chances[slot].face.map((o) => `<li><span class="gema" style="--g:${RARIDADE[o.raridade].cor}"></span><span>${nomeDaParte(o.id)}</span><em>${pct(o.chance)}</em></li>`).join('')}</ul></div>`).join('')
    }
    ganchos?.mudou?.()
  }
  function fazerOvo() {
    if (C.sel.length < 2) return
    const [A, B] = C.sel.map((u) => conta.porUid(u))
    const r = costurar({ semente: ganchos.semente(), paiA: conta.paraCostura(A), paiB: conta.paraCostura(B), idFilho: 'f' + Date.now().toString(36) })
    if (!r.ok) { $('#xDica', raiz).textContent = RECUSA[r.codigo] ?? 'These two cannot breed.'; return }
    const faces = Object.fromEntries(Object.entries(r.filho.partes).map(([s, g]) => [s, g.face]))
    conta.guardarOvoDeCruza({ nome: nomePorApelidos(faces), filho: r.filho, paisUids: [A.uid, B.uid] })
    C.sel = []
    tocar('ovoCai')
    ganchos?.ovo?.()
  }
  $('#gCruzar', raiz).addEventListener('click', () => abrirCruzar())
  $('#xVoltar', raiz).addEventListener('click', desenharGrade)
  $('#xFazer', raiz).addEventListener('click', fazerOvo)
  $('#xFazer', raiz).dataset.somProprio = '1'

  return { C, desenharGrade, abrir, fechar, abrirCruzar }
}
