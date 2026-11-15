// Piloto — tela "Egg": um ovo, as chances de raridade ANTES de abrir (lidas do motor: PARAMS_COSTURA.chancesDeRaridade),
// um toque e a revelação curta (até 4 s; raridade alta = festa maior). Serve aos ovos do começo e ao ovo do cruzamento.
// A tela não sorteia nada: o monstro sai da conta (motor) no instante do toque; a animação só mostra.
import { RARIDADES } from '../../shared/config.js'
import * as Arte from './arte.js'
import { desenharNinho, ninhoTopo } from './cenas.js'
import { CHANCES_DO_OVO, OVOS_INICIAIS } from './conta-piloto.js'
import { ELEMENTOS, RARIDADE } from './tema.js'

const $ = (s, r = document) => r.querySelector(s)
const RANK = Object.keys(RARIDADES)
const pct = (x) => `${Math.round(x * 1000) / 10}%`
const dorme = (ms) => new Promise((ok) => setTimeout(ok, ms))
/** Tempo da revelação por raridade (ms depois de o ovo abrir até o nome aparecer) e tamanho da festa. */
const FESTA = { comum: { espera: 250, faiscas: 6, ondas: 1 }, incomum: { espera: 400, faiscas: 10, ondas: 1 }, rara: { espera: 800, faiscas: 14, ondas: 2 }, lendaria: { espera: 1300, faiscas: 14, ondas: 3 } }

export function criarOvo({ raiz, conta, opcoes, tocar, faiscas, ganchos }) {
  const O = { fase: 'nada', modo: null, ultimo: null, ms: 0 }
  const palco = $('#oPalco', raiz), ovo = $('#oOvo', raiz), mon = $('#oMonstro', raiz)

  function medir() {
    const larg = raiz.clientWidth || window.innerWidth
    const cel = larg < 700
    const LW = cel ? Math.floor(Math.min(larg, 420) / 2) : 320, LH = cel ? 124 : 150, k = 2
    palco.style.width = LW * k + 'px'; palco.style.height = LH * k + 'px'
    palco.style.backgroundImage = `url(${Arte.url(desenharNinho(LW, LH))})`
    palco.style.setProperty('--pe', (LH - ninhoTopo(LH) - 4) * k + 'px')
    palco.style.setProperty('--lado', 64 * k + 'px')
  }

  /** Mostra o próximo ovo por abrir (ou avisa que não há). */
  function mostrar() {
    if (O.fase === 'abrindo') return
    if (O.fase === 'aberto') { medir(); return }
    O.modo = conta.ovosDoComeco > 0 ? 'comeco' : conta.ovoDeCruza ? 'cruza' : null
    if (!O.modo) { O.fase = 'nada'; ganchos?.semOvo?.(); return }
    O.fase = 'pronto'
    medir()
    palco.className = 'o-palco'
    palco.style.removeProperty('--rar')
    ovo.src = Arte.url(Arte.ovo('whole')); ovo.hidden = false; ovo.className = 'px o-ovo'
    mon.hidden = true; $('#oGrito', raiz).hidden = true
    $('#oAntes', raiz).hidden = false; $('#oDepois', raiz).hidden = true
    const comeco = O.modo === 'comeco'
    $('#oTitulo', raiz).textContent = comeco ? 'Your eggs' : 'Your egg'
    $('#oResta', raiz).textContent = comeco ? `Egg ${OVOS_INICIAIS - conta.ovosDoComeco + 1} of ${OVOS_INICIAIS}` : 'A baby from your two monsters'
    // as chances de raridade, lidas do motor, ANTES de abrir (o ovo do cruzamento mostrou as chances de cada parte antes)
    const ch = $('#oChances', raiz)
    ch.hidden = !comeco
    ch.innerHTML = RANK.map((r) => `<li data-rar="${r}"><span class="gema" style="--g:${RARIDADE[r].cor}"></span><span>${RARIDADE[r].nome}</span><b>${pct(CHANCES_DO_OVO[r])}</b></li>`).join('')
    ganchos?.mudou?.()
  }

  /** O toque: o monstro nasce AGORA (motor) e entra na coleção; depois a revelação. */
  async function abrir() {
    if (O.fase !== 'pronto') return
    const r = O.modo === 'comeco' ? conta.abrirOvo(ganchos.semente()) : conta.abrirOvoDeCruza()
    if (!r) return
    O.fase = 'abrindo'
    const t0 = performance.now()
    const m = r.monstro, def = conta.def(m), rar = conta.raridade(m), tipo = conta.tipo(m), festa = FESTA[rar]
    const menos = opcoes.menosAnimacao()
    $('#oAntes', raiz).hidden = true
    palco.style.setProperty('--rar', RARIDADE[rar].cor)
    tocar('ovoRacha'); ovo.classList.add('treme')
    await dorme(menos ? 250 : 480)
    ovo.src = Arte.url(Arte.ovo('cracked')); ovo.classList.remove('treme'); void ovo.offsetWidth; ovo.classList.add('treme')
    tocar('ovoRacha')
    await dorme(menos ? 250 : 480)
    ovo.src = Arte.url(Arte.ovo('open')); ovo.classList.remove('treme'); ovo.classList.add('aberto')
    mon.src = Arte.url(Arte.monstro(def)); mon.alt = m.nome; mon.hidden = false
    palco.classList.add('nasceu', 'rar-' + rar)
    tocar('ovoNasce')
    for (let i = 0; i < festa.ondas; i++) setTimeout(() => faiscas(mon, RARIDADE[rar].cor, festa.faiscas), i * 320)
    if (RANK.indexOf(rar) >= RANK.indexOf('rara')) {
      const g = $('#oGrito', raiz)
      g.textContent = RARIDADE[rar].nome + '!'; g.hidden = false
      setTimeout(() => tocar('festa'), 250)
    }
    await dorme(menos ? 200 : festa.espera)
    $('#oNome', raiz).textContent = m.nome
    $('#oInfo', raiz).innerHTML = `<span class="chip" style="--c:${ELEMENTOS[tipo].cor}"><img class="px" src="${Arte.url(Arte.iconeElemento(tipo))}" alt="">${ELEMENTOS[tipo].nome}</span><span class="rar" data-rar="${rar}"><span class="gema" style="--g:${RARIDADE[rar].cor}"></span>${RARIDADE[rar].nome}</span>`
    const g = $('#oGanhou', raiz)
    g.hidden = !r.ganhou.length
    g.textContent = r.ganhou.length ? `+${r.ganhou.length} starter monsters joined your collection` : ''
    const resta = conta.ovos
    $('#oSeguir', raiz).textContent = resta > 0 ? `Next egg (${resta} left)` : O.modo === 'comeco' ? 'Build your team' : 'See your collection'
    $('#oDepois', raiz).hidden = false
    O.ultimo = { uid: m.uid, nome: m.nome, raridade: rar, tipo, pronto: m.pronto }
    O.ms = Math.round(performance.now() - t0)
    O.fase = 'aberto'
    $('#oSeguir', raiz).focus({ preventScroll: true })
    ganchos?.nasceu?.(m)
    ganchos?.mudou?.()
  }
  function seguir() {
    if (O.fase !== 'aberto') return
    const modo = O.modo
    O.fase = 'nada'
    if (conta.ovos > 0) mostrar()
    else ganchos?.acabou?.(modo)
  }

  $('#oAbrir', raiz).addEventListener('click', abrir)
  $('#oAbrir', raiz).dataset.somProprio = '1'
  ovo.addEventListener('click', abrir)
  $('#oSeguir', raiz).addEventListener('click', seguir)
  window.addEventListener('resize', () => { if (!raiz.hidden) medir() })

  return { O, mostrar, abrir }
}
