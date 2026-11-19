// Keepmile — a máquina da partida: pura e determinística (sem Math.random e sem relógio).
// A semente decide só cartas, hordas e espólios; a batalha não tem dado. O servidor refaz a partida com reproduzir().
//
// API:
//   criarPartida({ semente, cartasLiberadas })  → estado (JSON puro; guardar no servidor)
//   opcoes(estado)                              → oferta, espólios, custos e a lista de comandos válidos agora
//   aplicar(estado, comando, { eventos })       → { ok: true, estado, eventos } | { ok: false, erro, motivo }  (não muda o recebido)
//   resultado(estado)                           → { fim, motivo, rodada, vencidas, pontos, ... }
//   visao(estado)                               → o que a tela pode ver (nunca a semente nem o sorteio futuro)
//   reproduzir({ semente, cartasLiberadas, comandos }) → { ok, estado, resultado } | { ok: false, erro, indice }
//
// Comandos:
//   { tipo: 'por', carta: 'T01', terreno: 1..6 }   põe uma carta da oferta (1 por oferta)
//   { tipo: 'sortear' }                           sorteia as 3 cartas de novo (custa ouro; antes de pôr a carta)
//   { tipo: 'consertar' }                         conserta 1 vida (custa ouro)
//   { tipo: 'batalhar' }                          começa a luta da rodada
//   { tipo: 'espolio', indice: 0..2, terreno? }   escolhe o espólio depois de vencer (Card e Promotion pedem terreno)
//   { tipo: 'desistir' }
import { estadoDaSemente, inteiroEm } from '../rng.js'
import { ALBUM, CARTAS, CHEFES, HORDA, INVASORES, PARTIDA as P, RARIDADES, RELIQUIAS } from './config.js'
import { montarExercito, simularBatalha } from './batalha.js'

const arr = (x) => Math.floor(x + 0.5)
const VERSAO = 1

// ---------------------------------------------------------------- sorteio (muda o estado clonado)
function int(e, n) { const r = inteiroEm(e.sorteio, n); e.sorteio = r.s; return r.valor }

function embaralhar(e, lista) {
  const a = lista.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = int(e, i + 1); const x = a[i]; a[i] = a[j]; a[j] = x }
  return a
}

/** Carta por raridade entre `pool` (menos `fora`). Raridade vazia cai para a de baixo (e, sem nada embaixo, sobe). */
function sortearCarta(e, pool, fora = []) {
  const cand = pool.filter((id) => !fora.includes(id))
  if (!cand.length) return null
  let x = int(e, 100), ri = 0
  for (; ri < RARIDADES.length - 1; ri++) { if (x < RARIDADES[ri].chance) break; x -= RARIDADES[ri].chance }
  const ordem = []
  for (let i = ri; i >= 0; i--) ordem.push(i)
  for (let i = ri + 1; i < RARIDADES.length; i++) ordem.push(i)
  for (const i of ordem) {
    const lst = cand.filter((id) => CARTAS[id].raridade === RARIDADES[i].id)
    if (lst.length) return lst[int(e, lst.length)]
  }
  return null
}

function chefeDaRodada(r) {
  if (r % HORDA.chefeACada !== 0) return null
  return CHEFES[(r / HORDA.chefeACada - 1) % CHEFES.length]
}

/** Próximo chefe (para o aviso 2 rodadas antes). */
function proximoChefe(r) {
  const rc = Math.ceil(r / HORDA.chefeACada) * HORDA.chefeACada
  return { rodada: rc, chefe: chefeDaRodada(rc).id, avisado: rc - r <= HORDA.avisoChefe }
}

function novaHorda(e) {
  const r = e.rodada
  const chefe = chefeDaRodada(r)
  let pontos = HORDA.pontosBase + HORDA.pontosPorRodada * r
  if (chefe) pontos = arr(pontos * HORDA.chefePontos / 100)
  const tipos = Object.keys(INVASORES).filter((k) => INVASORES[k].desde <= r)
  const a = tipos[int(e, tipos.length)]
  const outros = tipos.filter((k) => k !== a)
  const b = outros.length ? outros[int(e, outros.length)] : null
  const pa = INVASORES[a].pontos
  const qa = Math.floor(pontos * (b ? HORDA.partes[0] : 100) / 100 / pa)
  const qb = b ? Math.floor(pontos * HORDA.partes[1] / 100 / INVASORES[b].pontos) : 0
  const qm = Math.floor((pontos - qa * pa - qb * (b ? INVASORES[b].pontos : 0)) / INVASORES.muncher.pontos)
  const lista = [...Array(qa).fill(a), ...Array(qb).fill(b), ...Array(qm).fill('muncher')]
  const ordem = embaralhar(e, lista)
  if (chefe) ordem.push(chefe.id)
  e.horda = { rodada: r, ordem, chefe: chefe ? chefe.id : null, pontos }
}

function reliquiasLivres(e) { return Object.keys(RELIQUIAS).filter((k) => !e.reliquias.includes(k)) }

function novosEspolios(e) {
  if (e.horda.chefe) {
    const livres = embaralhar(e, reliquiasLivres(e)).slice(0, 3)
    const out = livres.map((r) => ({ tipo: 'reliquia', reliquia: r }))
    while (out.length < 3) out.push({ tipo: 'bolsa', ouro: P.bolsa.ouro })
    e.espolios = out
    return
  }
  const carta = sortearCarta(e, e.liberadas)
  let bolsa = { tipo: 'bolsa', ouro: P.bolsa.ouro }
  const livres = reliquiasLivres(e)
  if (int(e, 100) < P.bolsa.chanceReliquia && livres.length) bolsa = { tipo: 'bolsa', reliquia: livres[int(e, livres.length)] }
  e.espolios = [{ tipo: 'carta', carta }, { tipo: 'promocao' }, bolsa]
}

function novaOferta(e) {
  const oferta = []
  let levelUp = false
  if (e.rodada === 1) {
    const tropas = e.liberadas.filter((id) => CARTAS[id].tipo === 'tropa')
    while (oferta.length < 3) { const c = sortearCarta(e, tropas, oferta); if (!c) break; oferta.push(c) }
  } else {
    const sobe = [...new Set(e.terrenos.filter((t) => t && t.nivel < P.nivelMax).map((t) => t.carta))]
    if (sobe.length) { oferta.push(sobe[int(e, sobe.length)]); levelUp = true }
    while (oferta.length < 3) { const c = sortearCarta(e, e.liberadas, oferta); if (!c) break; oferta.push(c) }
  }
  e.oferta = oferta
  e.levelUp = levelUp
  e.sorteios = 0
  e.cartaPosta = false
}

/** Rodada nova (ou a mesma de novo depois de perder): horda, espólios e oferta, nesta ordem de sorteio. */
function abrirRodada(e) {
  novaHorda(e)
  novosEspolios(e)
  novaOferta(e)
  e.fase = 'carta'
}

// ---------------------------------------------------------------- criar
function validarLiberadas(lista) {
  if (lista === undefined) return ALBUM.inicial.slice()
  if (!Array.isArray(lista) || lista.length > Object.keys(CARTAS).length) throw new Error('Lista de cartas liberadas inválida')
  const vistos = new Set()
  for (const id of lista) {
    if (typeof id !== 'string' || !Object.hasOwn(CARTAS, id) || vistos.has(id)) throw new Error(`Carta liberada inválida: ${String(id)}`)
    vistos.add(id)
  }
  if (lista.filter((id) => CARTAS[id].tipo === 'tropa').length < 3) throw new Error('São precisas pelo menos 3 Tropas liberadas')
  // ordem fixa (a do config), para a mesma lista em outra ordem dar a mesma partida
  return Object.keys(CARTAS).filter((id) => vistos.has(id))
}

export function criarPartida({ semente, cartasLiberadas } = {}) {
  if (!((typeof semente === 'string' && semente.length >= 1 && semente.length <= 200) || Number.isSafeInteger(semente))) {
    throw new Error('Semente inválida')
  }
  const e = {
    v: VERSAO,
    sorteio: estadoDaSemente(semente),
    liberadas: validarLiberadas(cartasLiberadas),
    rodada: 1, vencidas: 0,
    vidas: P.vidas, vidasMax: P.vidas,
    ouro: P.ouro.inicio, ouroGanho: P.ouro.inicio, ouroGasto: 0,
    terrenos: Array(P.terrenos).fill(null),
    reliquias: [],
    fase: 'carta',
    oferta: [], levelUp: false, sorteios: 0, cartaPosta: false,
    consertos: 0,
    horda: null, espolios: [],
    ultima: null,
    fim: null,
    comandos: 0,
  }
  abrirRodada(e)
  return e
}

// ---------------------------------------------------------------- custos e regras
function custoSortear(e) {
  const gratis = e.reliquias.includes('horseshoe') ? 1 : 0
  if (e.sorteios < gratis) return 0
  return P.ouro.sortearBase + P.ouro.sortearPasso * (e.sorteios - gratis)
}
function custoConsertar(e) { return P.ouro.consertoBase + P.ouro.consertoPasso * e.consertos }

const erro = (codigo, motivo) => ({ ok: false, erro: codigo, motivo })
const terrenoValido = (k) => Number.isInteger(k) && k >= 1 && k <= P.terrenos

/** Põe a carta no terreno: mesma carta sobe 1 nível; outra carta troca a antiga. */
function porNoTerreno(e, carta, terreno) {
  if (!terrenoValido(terreno)) return erro('terreno', `Escolha um terreno de 1 a ${P.terrenos}.`)
  const atual = e.terrenos[terreno - 1]
  if (atual && atual.carta === carta) {
    if (atual.nivel >= P.nivelMax) return erro('nivel_maximo', 'Esta carta já está no nível máximo.')
    e.terrenos[terreno - 1] = { carta, nivel: atual.nivel + 1 }
    return { ok: true, ev: { tipo: 'nivel', carta, terreno, nivel: atual.nivel + 1 } }
  }
  e.terrenos[terreno - 1] = { carta, nivel: 1 }
  return { ok: true, ev: { tipo: 'posta', carta, terreno, nivel: 1, trocou: atual ? atual.carta : null } }
}

function ganhar(e, valor) { e.ouro += valor; e.ouroGanho += valor }
function gastar(e, valor) { e.ouro -= valor; e.ouroGasto += valor }

function acabar(e, motivo) {
  e.fase = 'fim'
  e.fim = { motivo, rodada: e.rodada, vencidas: e.vencidas, pontos: pontosDe(e) }
}

function pontosDe(e) {
  const resto = e.ultima && !e.ultima.vitoria ? Math.min(99, e.ultima.pctHorda) : 0
  return P.pontosPorRodada * e.vencidas + resto
}

// ---------------------------------------------------------------- aplicar
export function aplicar(estado, comando, { eventos = true } = {}) {
  if (!estado || estado.v !== VERSAO || !estado.sorteio) return erro('estado', 'Partida inválida.')
  if (!comando || typeof comando !== 'object' || Array.isArray(comando) || typeof comando.tipo !== 'string') return erro('comando', 'Comando inválido.')
  if (estado.fase === 'fim') return erro('fim', 'A partida já acabou.')
  if (estado.comandos >= P.tetoComandos) return erro('teto', 'Comandos demais nesta partida.')
  const e = structuredClone(estado)
  e.comandos++
  const evs = []
  const c = comando
  switch (c.tipo) {
    case 'por': {
      if (e.fase !== 'carta') return erro('fase', 'Agora não dá para pôr carta.')
      if (e.cartaPosta) return erro('ja_pos', 'Você já pôs a carta desta rodada.')
      if (typeof c.carta !== 'string' || !e.oferta.includes(c.carta)) return erro('carta', 'Essa carta não está na sua mão.')
      const r = porNoTerreno(e, c.carta, c.terreno)
      if (!r.ok) return r
      e.cartaPosta = true
      evs.push(r.ev)
      break
    }
    case 'sortear': {
      if (e.fase !== 'carta') return erro('fase', 'Agora não dá para sortear.')
      if (e.cartaPosta) return erro('ja_pos', 'Você já pôs a carta desta rodada.')
      const custo = custoSortear(e)
      if (e.ouro < custo) return erro('ouro', 'Ouro insuficiente.')
      gastar(e, custo)
      const n = e.sorteios + 1
      novaOferta(e)
      e.sorteios = n
      evs.push({ tipo: 'sorteio', custo, oferta: e.oferta.slice() })
      break
    }
    case 'consertar': {
      if (e.fase !== 'carta') return erro('fase', 'Agora não dá para consertar.')
      if (e.vidas >= e.vidasMax) return erro('vida_cheia', 'O castelo já está inteiro.')
      const custo = custoConsertar(e)
      if (e.ouro < custo) return erro('ouro', 'Ouro insuficiente.')
      gastar(e, custo)
      e.consertos++
      e.vidas++
      evs.push({ tipo: 'conserto', custo, vidas: e.vidas })
      break
    }
    case 'batalhar': {
      if (e.fase !== 'carta') return erro('fase', 'Agora não dá para lutar.')
      const b = simularBatalha({ terrenos: e.terrenos, reliquias: e.reliquias, horda: e.horda, eventos })
      e.ultima = { rodada: e.rodada, vitoria: b.vitoria, pctHorda: b.pctHorda, segundos: b.segundos, porTempo: b.porTempo, chefe: e.horda.chefe }
      evs.push({ tipo: 'batalha', vitoria: b.vitoria, segundos: b.segundos, porTempo: b.porTempo, pctHorda: b.pctHorda, horda: e.horda, eventos: b.eventos })
      if (b.vitoria) {
        e.vencidas++
        let ouro = P.ouro.vitoria + P.ouro.porTerrenoLimpo * b.terrenosLimpos + b.ouroMercado
        if (e.reliquias.includes('ledger')) ouro += RELIQUIAS.ledger.ouro
        if (e.horda.chefe) ouro += P.ouro.chefe
        ganhar(e, ouro)
        evs.push({ tipo: 'ouro', valor: ouro })
        e.fase = 'espolio'
      } else {
        e.vidas--
        ganhar(e, P.ouro.derrota)
        evs.push({ tipo: 'ouro', valor: P.ouro.derrota }, { tipo: 'vida', vidas: e.vidas })
        if (e.vidas <= 0) { acabar(e, 'sem_vidas'); evs.push({ tipo: 'fim', ...e.fim }); break }
        abrirRodada(e) // a mesma rodada volta, com horda nova e mais uma carta
      }
      break
    }
    case 'espolio': {
      if (e.fase !== 'espolio') return erro('fase', 'Não há espólio para pegar agora.')
      if (!Number.isInteger(c.indice) || c.indice < 0 || c.indice >= e.espolios.length) return erro('espolio', 'Escolha um dos 3 espólios.')
      const esp = e.espolios[c.indice]
      if (esp.tipo === 'carta') {
        if (!esp.carta) return erro('espolio', 'Espólio vazio.')
        const r = porNoTerreno(e, esp.carta, c.terreno)
        if (!r.ok) return r
        evs.push(r.ev)
      } else if (esp.tipo === 'promocao') {
        if (!terrenoValido(c.terreno)) return erro('terreno', `Escolha um terreno de 1 a ${P.terrenos}.`)
        const t = e.terrenos[c.terreno - 1]
        if (!t) return erro('terreno_vazio', 'Esse terreno está vazio.')
        if (t.nivel >= P.nivelMax) return erro('nivel_maximo', 'Esta carta já está no nível máximo.')
        e.terrenos[c.terreno - 1] = { carta: t.carta, nivel: t.nivel + 1 }
        evs.push({ tipo: 'nivel', carta: t.carta, terreno: c.terreno, nivel: t.nivel + 1 })
      } else if (esp.reliquia) {
        e.reliquias.push(esp.reliquia)
        if (esp.reliquia === 'crown') { e.vidas++; e.vidasMax++ }
        evs.push({ tipo: 'reliquia', reliquia: esp.reliquia })
      } else {
        ganhar(e, esp.ouro)
        evs.push({ tipo: 'ouro', valor: esp.ouro })
      }
      evs.push({ tipo: 'espolio', indice: c.indice, espolio: esp })
      e.rodada++
      if (e.rodada > P.tetoRodada) { acabar(e, 'teto'); evs.push({ tipo: 'fim', ...e.fim }); break }
      abrirRodada(e)
      evs.push({ tipo: 'rodada', rodada: e.rodada, chefe: e.horda.chefe })
      break
    }
    case 'desistir': {
      acabar(e, 'desistiu')
      evs.push({ tipo: 'fim', ...e.fim })
      break
    }
    default:
      return erro('comando', 'Comando desconhecido.')
  }
  return { ok: true, estado: e, eventos: evs }
}

// ---------------------------------------------------------------- leitura
export function resultado(e) {
  return {
    fim: e.fase === 'fim', motivo: e.fim ? e.fim.motivo : null,
    rodada: e.rodada, vencidas: e.vencidas, pontos: pontosDe(e),
    vidas: e.vidas, ouro: e.ouro, ouroGanho: e.ouroGanho, ouroGasto: e.ouroGasto,
    terrenos: e.terrenos.map((t) => (t ? { ...t } : null)), reliquias: e.reliquias.slice(), comandos: e.comandos,
  }
}

/** Tudo que a tela pode mostrar. Nunca a semente/estado do sorteio. */
export function visao(e) {
  return {
    rodada: e.rodada, vencidas: e.vencidas, pontos: pontosDe(e),
    vidas: e.vidas, vidasMax: e.vidasMax, ouro: e.ouro,
    fase: e.fase,
    terrenos: e.terrenos.map((t) => (t ? { ...t } : null)),
    familias: montarExercito(e.terrenos, e.reliquias).familias,
    oferta: e.oferta.map((carta, i) => ({ carta, levelUp: e.levelUp && i === 0 })),
    cartaPosta: e.cartaPosta,
    custos: { sortear: custoSortear(e), consertar: custoConsertar(e) },
    horda: e.horda ? { rodada: e.horda.rodada, ordem: e.horda.ordem.slice(), chefe: e.horda.chefe } : null,
    proximoChefe: proximoChefe(e.rodada),
    espolios: e.espolios.map((x) => ({ ...x })),
    reliquias: e.reliquias.slice(),
    ultima: e.ultima ? { ...e.ultima } : null,
    fim: e.fim ? { ...e.fim } : null,
    comandos: e.comandos,
  }
}

/** Oferta, espólios, custos e todos os comandos válidos agora (usado pela tela e pelos robôs). */
export function opcoes(e) {
  const v = visao(e)
  const comandos = []
  if (e.fase === 'carta') {
    if (!e.cartaPosta) {
      for (const carta of new Set(e.oferta)) {
        for (let k = 1; k <= P.terrenos; k++) {
          const t = e.terrenos[k - 1]
          if (t && t.carta === carta && t.nivel >= P.nivelMax) continue
          comandos.push({ tipo: 'por', carta, terreno: k })
        }
      }
      if (e.ouro >= v.custos.sortear) comandos.push({ tipo: 'sortear' })
    }
    if (e.vidas < e.vidasMax && e.ouro >= v.custos.consertar) comandos.push({ tipo: 'consertar' })
    comandos.push({ tipo: 'batalhar' })
  } else if (e.fase === 'espolio') {
    e.espolios.forEach((esp, i) => {
      if (esp.tipo === 'carta') {
        for (let k = 1; k <= P.terrenos; k++) {
          const t = e.terrenos[k - 1]
          if (t && t.carta === esp.carta && t.nivel >= P.nivelMax) continue
          comandos.push({ tipo: 'espolio', indice: i, terreno: k })
        }
      } else if (esp.tipo === 'promocao') {
        for (let k = 1; k <= P.terrenos; k++) {
          const t = e.terrenos[k - 1]
          if (t && t.nivel < P.nivelMax) comandos.push({ tipo: 'espolio', indice: i, terreno: k })
        }
      } else comandos.push({ tipo: 'espolio', indice: i })
    })
  }
  if (e.fase !== 'fim') comandos.push({ tipo: 'desistir' })
  return {
    fase: e.fase, oferta: v.oferta, espolios: v.espolios, ouro: e.ouro,
    sortear: { custo: v.custos.sortear, pode: comandos.some((x) => x.tipo === 'sortear') },
    consertar: { custo: v.custos.consertar, pode: comandos.some((x) => x.tipo === 'consertar') },
    comandos,
  }
}

/** Refaz a partida inteira a partir da semente e dos comandos (é como o servidor confere um recorde). */
export function reproduzir({ semente, cartasLiberadas, comandos }) {
  if (!Array.isArray(comandos) || comandos.length > P.tetoComandos) return { ok: false, erro: 'comandos', indice: -1 }
  let e
  try { e = criarPartida({ semente, cartasLiberadas }) } catch (err) { return { ok: false, erro: 'criar', motivo: err.message, indice: -1 } }
  for (let i = 0; i < comandos.length; i++) {
    const r = aplicar(e, comandos[i], { eventos: false })
    if (!r.ok) return { ok: false, erro: r.erro, motivo: r.motivo, indice: i }
    e = r.estado
  }
  return { ok: true, estado: e, resultado: resultado(e) }
}
