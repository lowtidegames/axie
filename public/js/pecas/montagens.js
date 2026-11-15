// Frayz — MONTAGENS de layout (só para conferir as peças juntas; NÃO é a luta de verdade).
// Três telas inteiras, nos dois formatos, com dados de verdade da ponte:
//   montarLuta(raiz, formato)                 HUD dos dois lados, bastidor, faixa, fio do tempo, mão e botões sobre o espaço da cena
//   montarTime(raiz, formato)                 prateleira de bonecos, ficha e os 3 círculos Frente/Meio/Trás
//   montarFim(raiz, formato, 'vitoria'|'derrota')
// Aqui é o papel de "quem chama": busca os números e as frases na ponte e entrega às peças. Nenhuma regra é calculada:
// as lutas de exemplo são jogadas pelo robô do motor (semente fixa), e a tela só mostra o que o motor devolve.
import * as P from '../ponte.js'
import * as arte from './arte-adaptador.js'
import { carretelSvg, densidade, el, pesponto, svg } from './base.js'
import { marcarTexto, nosDoTexto } from './carta.js'
import { criarMao } from './mao.js'
import { criarPlaca } from './fita.js'
import { criarCarreteis, criarContador } from './carreteis.js'
import { criarBastidor } from './bastidor.js'
import { mostrarFaixa } from './faixa.js'
import { criarFioDoTempo } from './fio-do-tempo.js'
import { criarEtiquetas } from './etiqueta.js'
import { atualizarBotao, criarBotao } from './botao.js'
import { criarLogotipo } from './logotipo.js'
import { criarMarcaDeVantagem } from './marca-de-vantagem.js'

// ------------------------------------------------------------------ o que "quem chama" prepara para as peças

/** Palavras que a tela destaca no texto das cartas (escolha de apresentação; os textos vêm da ponte). */
export const CHAVES = ['Alcance', 'Fio Solto', 'Último Fio', 'Escudo', 'Linha', 'Frente', 'Cura']
export const NOME_DO_LUGAR = { cabeca: 'Cabeça', bracos: 'Braços', pernas: 'Pernas' }
export const LUGARES = ['Frente', 'Meio', 'Trás']
export const TIME_DE_EXEMPLO = ['pisoteador', 'desfiado', 'assombrado'], RIVAL_DE_EXEMPLO = ['rasgao', 'cascudo', 'embolado']
const pct = (v) => Math.round(v * 100) + '%'
export const BONUS = '+' + pct(P.BONUS_DE_TIPO)
export const FRASE_DO_FIAPO = `Fiapo: descarte e compre ${P.REGRAS.fiapoCompra}`
export const PARES = P.TIPOS.flatMap((a) => P.TIPOS.filter((b) => P.vantagem(a, b)).map((b) => [a, b]))
export const TEXTO_DA_RODA = `Cada tecido bate forte no seguinte: ${BONUS} de dano.`

export const partesDaFicha = (f) => Object.fromEntries(Object.entries(f.partes).map(([k, v]) => [k, `${v.id}@${v.raridade}`]))

/** Dados de uma carta para criarCarta. dono = { partes, nome }. */
export function dadosDaCarta(idDaCarta, dono, idNaMao) {
  const i = P.infoDaCarta(idDaCarta)
  return { id: idNaMao ?? idDaCarta, nome: i.nome, custo: i.linha, tipo: i.tipo, lugar: i.parte, texto: marcarTexto(i.texto, { chaves: CHAVES }), dono }
}

/** As 24 cartas do jogo, cada uma com um boneco pronto que a carrega. */
export function todasAsCartas() {
  const donos = {}
  for (const id of P.idsProntos()) { const f = P.ficha(id); for (const c of f.cartas) donos[c] ??= { partes: partesDaFicha(f), nome: f.nome } }
  return Object.keys(P.CARTAS).map((id) => dadosDaCarta(id, donos[id] ?? null))
}

/** Uma luta jogada pelo robô do motor até certo ponto (ou até o fim), com semente fixa. */
export function lutaDeExemplo({ semente = 'pecas-210', ate = 9, timeA = TIME_DE_EXEMPLO, timeB = RIVAL_DE_EXEMPLO } = {}) {
  let e = P.novaLuta({ semente, timeA, timeB })
  const resumo = { maior: null, golpeFinal: null, viradas: 0, lider: 0 }
  const colher = (r) => {
    for (const ev of r.eventos) if (ev.t === 'dano') { if (!resumo.maior || ev.valor > resumo.maior.valor) resumo.maior = ev; if (ev.de) resumo.golpeFinal = ev }
    const v = r.estado, soma = (t) => v.times[t].lugares.reduce((s, id) => s + (v.bonecos[id].estado === 'vivo' ? v.bonecos[id].vida / v.bonecos[id].vidaMax : 0), 0)
    const d = soma('A') - soma('B'), lado = d > 0.0001 ? 1 : d < -0.0001 ? -1 : 0
    if (lado !== 0) { if (resumo.lider !== 0 && lado !== resumo.lider) resumo.viradas++; resumo.lider = lado }
  }
  for (let passo = 0; passo < 400 && !e.fim; passo++) {
    if (ate != null && e.vez === P.EU && e.comandos.length >= ate) break
    const plano = P.planoDoRobo(e, 'planejador'); let ok = plano.length > 0
    for (const c of plano) { const r = P.enviar(e, c); if (!r.ok) { ok = false; break } colher(r); e = r.estado; if (e.fim) break }
    if (!ok) { const r = P.enviar(e, { tipo: 'passar', time: e.vez }); if (!r.ok) break; colher(r); e = r.estado }
  }
  return { estado: e, visao: P.visao(e), resumo }
}

/** Estado de cada carta da mão, perguntando ao motor. */
export function cartasDaMao(estado, visao) {
  return visao.times[P.EU].mao.map((cid) => {
    const inst = visao.cartas[cid], dono = visao.bonecos[inst.dono]
    const dados = dadosDaCarta(inst.carta, { partes: dono.partes, nome: dono.nome }, cid)
    if (P.podeFiapo(estado, cid) || dono.estado === 'caido') return { id: cid, dados, estado: { fiapo: true, fraseDoFiapo: FRASE_DO_FIAPO } }
    if (P.jogadasDaCarta(estado, cid).length) return { id: cid, dados, estado: { jogavel: true } }
    const r = P.enviar(estado, { tipo: 'jogar', time: estado.vez, carta: cid, alvo: null })
    return { id: cid, dados, estado: { semLinha: !r.ok && r.codigo === 'LINHA_INSUFICIENTE' }, motivo: r.ok ? null : r.motivo }
  })
}

/** Marcas (alfinetes) de um boneco, com as frases montadas com os números da ponte. */
export function marcasDoBoneco(b) {
  const m = []
  if (b.estado === 'fio') m.push({ tipo: 'ultimo-fio', titulo: 'Último Fio.', legenda: 'Fica de pé até o fim do próximo turno do dono e só usa cartas de Pernas.' })
  if (b.fioSoltoAte > 0) m.push({ tipo: 'fio-solto', titulo: 'Fio Solto.', legenda: `Recebe +${pct(P.REGRAS.fioSoltoBonus)} de dano.` })
  if (b.veu) m.push({ tipo: 'veu', titulo: 'Véu.', legenda: 'O próximo ataque contra ele erra.' })
  return m
}

// ------------------------------------------------------------------ desenhos pequenos das montagens

/** Canvas com o boneco inteiro, na altura pedida (em px de tela). */
export function bonecoEm(partes, altura, pose = 'vivo') {
  const cv = document.createElement('canvas'); cv.className = 'fz-boneco'
  cv.style.height = altura + 'px'; cv.style.width = (altura * 160) / 232 + 'px'
  arte.pronta.then(() => {
    const sp = arte.boneco(partes, Math.round(altura * densidade()), pose)
    if (!sp) return
    cv.width = sp.width; cv.height = sp.height; cv.getContext('2d').drawImage(sp, 0, 0)
    cv.style.width = (altura * sp.width) / sp.height + 'px'
  })
  return cv
}
export function retratoEm(partes, px) {
  const cv = document.createElement('canvas'); cv.className = 'fz-retrato'; cv.style.width = cv.style.height = px + 'px'
  arte.pronta.then(() => { const r = arte.retrato(partes, Math.round(px * densidade())); cv.width = r.width; cv.height = r.height; cv.getContext('2d').drawImage(r, 0, 0) })
  return cv
}
export function iconeDoTipoEm(tipo, px) {
  const cv = document.createElement('canvas'); cv.className = 'fz-icone-tipo'; cv.style.width = cv.style.height = px + 'px'
  arte.pronta.then(() => { const r = arte.iconeDoTipo(tipo, Math.round(px * densidade())); cv.width = r.width; cv.height = r.height; cv.getContext('2d').drawImage(r, 0, 0) })
  return cv
}

const tesoura = () => svg('svg', { class: 'fz-icone', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [
  svg('path', { d: 'M8.6 14.4 L20 4 M8.6 9.6 L20 20' }), svg('circle', { cx: 6, cy: 8, r: 3 }), svg('circle', { cx: 6, cy: 16, r: 3 }),
])
const rolo = () => svg('svg', { class: 'fz-icone', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [ // carretel de filme feito de linha
  svg('circle', { cx: 11, cy: 11, r: 8 }), svg('path', { d: 'M11 7 h.01 M7.4 13 h.01 M14.6 13 h.01 M17.4 16.6 Q20.5 19.5 22 16.5' }),
])
const agulha = () => svg('svg', { class: 'fz-icone', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [
  svg('path', { d: 'M4 20 L18.6 5.4 M16.4 4.4 q2.6 -1.6 3.6 0 q1 1.8 -1 3.2 M4 20 q-1.5 -4 2 -5' }),
])
const viradas = () => svg('svg', { class: 'fz-icone', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [
  svg('path', { d: 'M4 9 h13 l-3.4 -3.6 M20 15 H7 l3.4 3.6' }),
])
/** Ícones de linha das montagens (o fim da luta do jogo usa os mesmos). */
export const ICONES = { tesoura: () => tesoura(), rolo: () => rolo(), agulha: () => agulha(), viradas: () => viradas() }
const botaoDeRoupa = (rotulo) => { // botão de costura com 4 furos (menu)
  const b = el('button', 'fz-botao-de-roupa'); b.type = 'button'; b.setAttribute('aria-label', rotulo)
  b.append(svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [svg('path', { d: 'M8.6 9 h.01 M15.4 9 h.01 M8.6 15 h.01 M15.4 15 h.01' }), svg('path', { class: 'fz-botao-de-roupa__fio', d: 'M8.6 9 H15.4 M8.6 15 H15.4' })]))
  return b
}

// ------------------------------------------------------------------ 1. LUTA

export function montarLuta(raiz, formato) {
  const pc = formato === 'pc'
  raiz.className = 'fz-tela fz-luta'; raiz.dataset.formato = formato; raiz.dataset.palco = ''
  const { estado, visao: v } = lutaDeExemplo()
  const eu = v.times[P.EU], rival = v.times[P.RIVAL]

  // ---- topo: turno, tesoura, fio do tempo, menu
  const topo = el('header', 'fz-luta__topo')
  const turno = el('div', 'fz-luta__turno'); turno.setAttribute('role', 'status')
  turno.append(el('span', 'fz-luta__turno-rotulo', 'Turno'), el('b', 'fz-luta__turno-numero', v.turno), el('span', 'fz-luta__turno-rotulo', `de ${P.REGRAS.turnoFinal}`), pesponto({ recuo: 3, raio: 4 }))
  const aviso = el('div', 'fz-luta__tesoura'); aviso.title = `A Tesoura começa a cortar ${pct(P.REGRAS.tesouraCorte)} da vida de todos no turno ${P.REGRAS.tesouraInicio}`
  aviso.setAttribute('role', 'img'); aviso.setAttribute('aria-label', `A Tesoura começa no turno ${P.REGRAS.tesouraInicio}`)
  aviso.append(tesoura(), el('span', null, pc ? `Tesoura no turno ${P.REGRAS.tesouraInicio}` : String(P.REGRAS.tesouraInicio)))
  const tempo = el('div', 'fz-luta__tempo')
  const fio = criarFioDoTempo({ total: P.TEMPO_DO_TURNO_S, alerta: 5 }); tempo.append(fio.el); fio.definir(14)
  topo.append(turno, aviso, tempo, botaoDeRoupa('Menu'))

  // ---- cena (espaço reservado) com as peças por cima
  const cena = el('div', 'fz-luta__cena')
  const reserva = el('div', 'fz-luta__reserva'); reserva.append(el('span', null, 'espaço da cena'))
  cena.append(reserva)
  const hudRival = el('div', 'fz-luta__rival')
  const linhaRival = criarCarreteis({ maximo: P.REGRAS.linhaMaxima, rotulo: 'Linha do rival', compacto: true }); linhaRival.definir(rival.linha)
  const maoRival = criarContador({ icone: 'mao', rotulo: 'Cartas na mão do rival' }); maoRival.definir(rival.mao)
  const baralhoRival = criarContador({ icone: 'baralho', rotulo: 'Cartas no baralho do rival' }); baralhoRival.definir(rival.baralho)
  hudRival.append(el('b', 'fz-luta__nome', 'Rival'), linhaRival.el, maoRival.el, baralhoRival.el)
  const bastidor = criarBastidor({ tipos: P.TIPOS, nomes: P.NOMES_DOS_TIPOS, pares: PARES, texto: TEXTO_DA_RODA, lado: pc ? 'baixo' : 'cima' })
  const caixaBastidor = el('div', 'fz-luta__bastidor'); caixaBastidor.append(bastidor.el)
  cena.append(hudRival)
  if (pc) cena.append(caixaBastidor) // no celular o bastidor fica ao lado da Linha, perto da mão

  // os 6 bonecos nos seus lugares, cada um com a placa (fita, dedal, alfinetes)
  const selecionada = eu.mao.find((cid) => P.jogadasDaCarta(estado, cid).length && P.temDano(v.cartas[cid].carta))
  const tipoDaSel = selecionada ? P.CARTAS[v.cartas[selecionada].carta].tipo : null
  for (const [time, lado] of [[P.EU, 'eu'], [P.RIVAL, 'rival']]) {
    v.times[time].lugares.forEach((id, i) => {
      const b = v.bonecos[id], caixa = el('div', 'fz-luta__boneco'); caixa.dataset.lado = lado; caixa.dataset.lugar = String(i)
      const vulto = el('div', 'fz-luta__vulto'); vulto.append(bonecoEm(b.partes, pc ? 150 : 96, b.estado === 'fio' ? 'fio' : b.estado === 'caido' ? 'caido' : 'vivo'))
      if (lado === 'rival' && tipoDaSel && b.estado !== 'caido' && P.vantagem(tipoDaSel, b.tipo)) { const m = criarMarcaDeVantagem(BONUS, { pequena: !pc }); m.classList.add('fz-luta__marca'); vulto.append(m) }
      const placa = criarPlaca()
      placa.definir({ vida: b.vida, vidaMax: b.vidaMax, escudo: b.escudo, marcas: marcasDoBoneco(b), caido: b.estado === 'caido' })
      caixa.append(vulto, el('span', 'fz-luta__lugar', LUGARES[i]), placa.el)
      cena.append(caixa)
    })
  }
  const etiquetas = criarEtiquetas(cena)

  // ---- base: minha Linha e baralho, a mão, os botões
  const base = el('footer', 'fz-luta__base')
  const meu = el('div', 'fz-luta__meu')
  const linha = criarCarreteis({ maximo: P.REGRAS.linhaMaxima, rotulo: 'Linha' }); linha.definir(eu.linha)
  const baralho = criarContador({ icone: 'baralho', rotulo: 'Cartas no seu baralho' }); baralho.definir(eu.baralho)
  meu.append(linha.el, baralho.el)
  if (!pc) meu.append(caixaBastidor)
  const caixaMao = el('div', 'fz-luta__mao')
  const botoes = el('div', 'fz-luta__botoes')
  const trocar = criarBotao({ rotulo: 'Trocar lugares', detalhe: `${P.REGRAS.custoDaTroca} de Linha`, variante: 'secundario', atalho: 'T' })
  const passar = criarBotao({ rotulo: 'Passar', variante: 'principal', atalho: 'Espaço' })
  botoes.append(trocar, passar)
  base.append(meu, caixaMao, botoes)
  raiz.append(topo, cena, base)

  const mao = criarMao(caixaMao, { baralho: baralho.el, palco: raiz, nomeDoTipo: (t) => P.NOMES_DOS_TIPOS[t] })
  const cartas = cartasDaMao(estado, v)
  mao.definir(cartas)
  if (selecionada) { mao.selecionar(selecionada); bastidor.acender(tipoDaSel) }
  mao.aoEscolher(({ id, acao }) => {
    const c = cartas.find((x) => x.id === id)
    if (!c) return
    if (c.motivo && !c.estado.jogavel) { etiquetas.avisar(c.motivo, { tipo: 'recusa' }); return }
    mao.selecionar(id); bastidor.acender(P.temDano(v.cartas[id].carta) ? c.dados.tipo : null)
    if (acao === 'jogar') etiquetas.avisar(`${c.dados.nome}: toque no alvo aceso.`, { tipo: 'aviso' })
  })
  passar.addEventListener('click', () => mostrarFaixa(cena, { texto: 'Vez do rival', lado: 'rival' }))
  trocar.addEventListener('click', () => { atualizarBotao(trocar, { aceso: !trocar.classList.contains('fz-botao--aceso') }); etiquetas.avisar('Toque em dois bonecos seus para trocar de lugar.') })
  return { mao, bastidor, fio, etiquetas, cena, mostrarFaixa: (o) => mostrarFaixa(cena, o) }
}

// ------------------------------------------------------------------ 2. ESCOLHER TIME

function fichaDoBoneco(f, pc) {
  const caixa = el('div', 'fz-ficha'), partes = partesDaFicha(f), raridade = f.partes.tronco.raridade
  const cabeca = el('div', 'fz-ficha__cabeca')
  const tit = el('div', 'fz-ficha__titulo')
  const tipo = el('span', 'fz-ficha__tipo'); tipo.append(iconeDoTipoEm(f.tipo, 22), el('span', null, P.NOMES_DOS_TIPOS[f.tipo]))
  const rar = el('span', 'fz-ficha__raridade', P.RARIDADES[raridade].nome); rar.dataset.raridade = raridade
  const linha = el('div', 'fz-ficha__linha'); linha.append(tipo, rar)
  tit.append(el('h3', 'fz-ficha__nome', f.nome), linha)
  if (pc) { const vulto = el('span', 'fz-ficha__vulto'); vulto.append(bonecoEm(partes, 132)); cabeca.append(vulto, tit) }
  else cabeca.append(retratoEm(partes, 52), tit)
  const numeros = el('div', 'fz-ficha__numeros')
  for (const [nome, valor, dica] of [['Vida', f.vidaMax, 'Vida máxima'], ['Rapidez', f.rapidez, 'Chance de golpe crítico'], ['Firmeza', f.firmeza, 'Reduz o dano recebido']]) {
    const n = el('span', 'fz-ficha__numero'); n.title = dica; n.append(el('b', null, valor), el('span', null, nome)); numeros.append(n)
  }
  const lista = el('ul', 'fz-ficha__cartas')
  for (const c of f.cartasInfo) {
    const li = el('li', 'fz-ficha__carta')
    const custo = el('span', 'fz-ficha__custo fz-carretel fz-carretel--cheio'); custo.append(carretelSvg(), el('b', null, c.linha)); custo.setAttribute('aria-label', `Custo ${c.linha} de Linha`)
    const tx = el('span', 'fz-ficha__carta-texto'); const nome = el('b', 'fz-ficha__carta-nome'); nome.append(iconeDoTipoEm(c.tipo, 16), el('span', null, c.nome)); tx.append(nome)
    const desc = el('span', 'fz-ficha__carta-desc'); desc.append(...nosDoTexto(marcarTexto(c.texto, { chaves: CHAVES }))); tx.append(desc)
    li.append(custo, tx); lista.append(li)
  }
  const bordado = el('p', 'fz-ficha__bordado'); bordado.append(el('b', null, f.bordadoInfo.nome + ': '), f.bordadoInfo.texto)
  caixa.append(cabeca, numeros, lista, bordado)
  return caixa
}

export function montarTime(raiz, formato) {
  const pc = formato === 'pc'
  raiz.className = 'fz-tela fz-time'; raiz.dataset.formato = formato
  const ids = P.idsProntos(), fichas = Object.fromEntries(ids.map((id) => [id, P.ficha(id)]))
  let escolha = TIME_DE_EXEMPLO.slice(0, 2), aberta = TIME_DE_EXEMPLO[1]

  const topo = el('header', 'fz-time__topo')
  const logo = criarLogotipo({ altura: pc ? 56 : 40 })
  const textos = el('div', 'fz-time__textos'); textos.append(el('h2', 'fz-time__titulo', 'Escolha 3 bonecos'), el('p', 'fz-time__dica', 'Toque num boneco para ver a ficha.'))
  topo.append(logo.el, textos)

  const prateleira = el('div', 'fz-time__prateleira'); prateleira.setAttribute('role', 'list')
  const porTabua = 3, botoes = {}
  for (let i = 0; i < ids.length; i += pc ? 5 : porTabua) {
    const tabua = el('div', 'fz-time__tabua')
    for (const id of ids.slice(i, i + (pc ? 5 : porTabua))) {
      const f = fichas[id], b = el('button', 'fz-time__boneco'); b.type = 'button'; b.dataset.id = id; b.setAttribute('role', 'listitem')
      const ordem = el('span', 'fz-time__ordem')
      const nome = el('span', 'fz-time__nome'); nome.append(el('span', null, f.nome))
      b.append(bonecoEm(partesDaFicha(f), pc ? 124 : 96), ordem, nome)
      b.addEventListener('click', () => { aberta = id; atualizar() })
      botoes[id] = b; tabua.append(b)
    }
    prateleira.append(tabua)
  }

  const painel = el('aside', 'fz-time__ficha'); painel.setAttribute('aria-live', 'polite')
  const mesa = el('footer', 'fz-time__mesa')
  const circulos = el('div', 'fz-time__circulos')
  const lutar = criarBotao({ rotulo: 'Lutar', variante: 'principal', atalho: 'Enter' })
  mesa.append(circulos, lutar)
  raiz.append(topo, prateleira, painel, mesa)

  function atualizar() {
    for (const id of ids) {
      const b = botoes[id], i = escolha.indexOf(id), f = fichas[id]
      b.setAttribute('aria-pressed', String(i >= 0)); b.classList.toggle('fz-time__boneco--aberto', id === aberta)
      b.querySelector('.fz-time__ordem').textContent = i >= 0 ? String(i + 1) : ''
      b.setAttribute('aria-label', `${f.nome}, ${P.NOMES_DOS_TIPOS[f.tipo]}${i >= 0 ? ', no time: ' + LUGARES[i] : ''}`)
    }
    painel.replaceChildren(pesponto({ recuo: 5, raio: 9 }))
    const f = fichas[aberta], dentro = escolha.includes(aberta)
    const por = criarBotao({ rotulo: dentro ? (pc ? 'Tirar do time' : 'Tirar') : (pc ? 'Pôr no time' : 'Escolher'), variante: dentro ? 'secundario' : 'principal', desligado: !dentro && escolha.length >= 3 })
    por.setAttribute('aria-label', dentro ? `Tirar ${f.nome} do time` : `Pôr ${f.nome} no time`)
    por.classList.add('fz-time__por')
    por.addEventListener('click', () => { escolha = dentro ? escolha.filter((x) => x !== aberta) : [...escolha, aberta]; atualizar() })
    painel.append(fichaDoBoneco(f, pc), por)
    circulos.replaceChildren()
    LUGARES.forEach((nome, i) => {
      const c = el('div', 'fz-circulo'), id = escolha[i]
      c.append(el('span', 'fz-circulo__anel'))
      if (id) { c.classList.add('fz-circulo--cheio'); c.append(bonecoEm(partesDaFicha(fichas[id]), pc ? 84 : 60)) }
      else c.append(el('span', 'fz-circulo__vazio', String(i + 1)))
      c.append(el('span', 'fz-circulo__nome', nome)); circulos.append(c)
    })
    const falta = 3 - escolha.length
    atualizarBotao(lutar, { desligado: falta > 0, detalhe: falta > 0 ? `Falta${falta > 1 ? 'm' : ''} ${falta}` : null })
  }
  atualizar()
  return { atualizar }
}

// ------------------------------------------------------------------ 3. FIM DA LUTA

export function montarFim(raiz, formato, qual = 'vitoria') {
  const pc = formato === 'pc', vitoria = qual === 'vitoria'
  raiz.className = `fz-tela fz-fim fz-fim--${vitoria ? 'vitoria' : 'derrota'}`; raiz.dataset.formato = formato
  const { estado, visao: v, resumo } = lutaDeExemplo({ semente: vitoria ? 'pecas-238' : 'pecas-180', ate: null })
  const r = P.fim(estado) ?? { vencedor: vitoria ? P.EU : P.RIVAL, turno: v.turno, motivo: 'derrubou' }
  const MOTIVO = { derrubou: 'Os três caíram.', tesoura: 'A Tesoura decidiu: vence quem sobrou com mais vida.', desempate: 'Empate de vida: o sorteio decidiu.' }
  // o boneco do golpe final (do time que venceu)
  const idFinal = resumo.golpeFinal && v.bonecos[resumo.golpeFinal.de]?.time === r.vencedor ? resumo.golpeFinal.de : v.times[r.vencedor].lugares.find((id) => v.bonecos[id].estado !== 'caido') ?? v.times[r.vencedor].lugares[0]
  const heroi = v.bonecos[idFinal]

  const folha = el('div', 'fz-fim__folha'); folha.setAttribute('role', 'dialog'); folha.setAttribute('aria-modal', 'true'); folha.setAttribute('aria-labelledby', 'fzFimTitulo')
  const palco = el('div', 'fz-fim__palco')
  palco.append(el('span', 'fz-fim__luz'), bonecoEm(heroi.partes, pc ? 236 : 188, 'vivo'))
  const legenda = el('p', 'fz-fim__heroi'); legenda.append(el('span', null, 'Golpe final: '), el('b', null, heroi.nome)); palco.append(legenda)

  const lado = el('div', 'fz-fim__lado')
  const titulo = el('h2', 'fz-fim__titulo'); titulo.id = 'fzFimTitulo'; titulo.setAttribute('aria-label', vitoria ? 'Vitória!' : 'Derrota')
  ;[...(vitoria ? 'Vitória!' : 'Derrota')].forEach((ch, i) => { const s = el('span', 'fz-fim__letra', ch); s.dataset.l = ch; s.style.setProperty('--i', String(i)); s.setAttribute('aria-hidden', 'true'); titulo.append(s) })
  if (!vitoria) titulo.append(svg('svg', { class: 'fz-fim__fios', viewBox: '0 0 200 40', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('path', { d: 'M22 0 q-6 14 2 26 M61 0 q5 10 -3 20 M97 0 q-4 16 4 34 M128 0 q6 8 0 16 M163 0 q-7 12 3 30 M186 0 q3 9 -2 14' }),
  ]))
  const motivo = el('p', 'fz-fim__motivo', MOTIVO[r.motivo] ?? '')
  const numeros = el('div', 'fz-fim__numeros')
  const maior = resumo.maior
  for (const [icone, valor, nome, dica] of [
    [tesoura(), r.turno, 'Turnos', `A luta durou ${r.turno} turnos`],
    [agulha(), maior ? maior.valor : '—', 'Maior golpe', maior?.carta ? `${P.CARTAS[maior.carta].nome}${maior.critico ? ' (crítico)' : ''}` : 'Maior golpe da luta'],
    [viradas(), resumo.viradas, 'Viradas', 'Quantas vezes a frente mudou de lado'],
  ]) {
    const n = el('div', 'fz-fim__numero'); n.title = dica
    n.append(pesponto({ recuo: 4, raio: 40 }), icone, el('b', null, valor), el('span', null, nome)); numeros.append(n)
  }
  const botoes = el('div', 'fz-fim__botoes')
  const copiar = criarBotao({ rotulo: 'Copiar replay', variante: 'secundario' })
  const aviso = el('p', 'fz-fim__aviso'); aviso.setAttribute('role', 'status')
  copiar.addEventListener('click', () => { aviso.textContent = 'Replay copiado.' })
  botoes.append(
    criarBotao({ rotulo: 'Revanche', variante: 'principal', atalho: 'Enter' }),
    criarBotao({ rotulo: 'Trocar time', variante: 'secundario' }),
    criarBotao({ rotulo: 'Rever', variante: 'secundario', icone: rolo() }),
    copiar,
  )
  lado.append(titulo, motivo, numeros, botoes, aviso)
  folha.append(pesponto({ recuo: 6, raio: 10 }), palco, lado)
  if (vitoria) { // festa: varal de retalhos dos 6 tecidos
    const varal = el('div', 'fz-fim__varal'); varal.setAttribute('aria-hidden', 'true')
    const quantos = pc ? 13 : 7
    for (let i = 0; i < quantos; i++) { const b = el('i'); b.style.setProperty('--giro', ((i * 37) % 9) - 4 + 'deg'); varal.append(b) }
    arte.pronta.then(() => [...varal.children].forEach((b, i) => { b.style.backgroundImage = `url(${arte.urlDoTecido(P.TIPOS[i % P.TIPOS.length], Math.round(48 * densidade()))})` }))
    folha.append(varal)
  }
  raiz.append(el('div', 'fz-fim__fundo'), folha)
  return { folha }
}
