// Keepmile — a máquina da partida: pura e determinística (sem sorteio de fora e sem relógio).
// A semente decide só cartas, hordas e espólios; a batalha não tem dado. O servidor refaz a partida com reproduzir().
//
// API:
//   criarPartida({ semente, cartasLiberadas, regra }) → estado (JSON puro; guardar no servidor). regra: 1 (padrão) ou 2 (R46)
//   opcoes(estado)                              → oferta, espólios, custos e a lista de comandos válidos agora
//   aplicar(estado, comando, { eventos })       → { ok: true, estado, eventos } | { ok: false, erro, motivo }  (não muda o recebido)
//   resultado(estado)                           → { fim, motivo, rodada, vencidas, pontos, venceu, ... }
//   resistiu(vencidas)                          → true se a partida já venceu a rodada da vitória (R39: a 20)
//   visao(estado)                               → o que a tela pode ver (nunca a semente nem o sorteio futuro)
//   reproduzir({ semente, cartasLiberadas, comandos, regra }) → { ok, estado, resultado } | { ok: false, erro, indice }
//   dicaDaTroca(estado)                         → R46: { a, b } a 1ª troca de 2 terrenos que vence a horda como está, ou null
//   chancesReais(cartas)                        → [{ id, nome, chance }] chance real (%) de cada raridade para essas cartas
//   sortearCartaDaSemente(semente, cartas)      → uma carta, pelo mesmo sorteio (conferência das chances)
//   chancesDaMao({ cartas, sobe })              → [{ id, nome, chance, exata }] chance (%) de cada raridade na MÃO (sem repetir)
//   sortearMaoDaSemente(semente, cartas, sobe)  → uma mão, pelo mesmo sorteio (conferência das chances da mão)
//
// Comandos:
//   { tipo: 'por', carta: 'T01', terreno: 1..6 }   põe uma carta da oferta (1 por oferta)
//   { tipo: 'sortear' }                           sorteia as 3 cartas de novo (custa ouro; antes de pôr a carta)
//   { tipo: 'consertar' }                         conserta 1 vida (custa ouro)
//   { tipo: 'batalhar' }                          começa a luta da rodada
//   { tipo: 'espolio', indice: 0..2, terreno? }   escolhe o espólio depois de vencer (Card e Promotion pedem terreno)
//   { tipo: 'desistir' }
//   { tipo: 'trocar', a: 1..6, b: 1..6 }          R46 (regra ≥ 2): troca o conteúdo de 2 terrenos, 1 vez, só na revanche
//
// Regra da partida (R46). 1 = a de antes: perdeu e a partida segue → horda NOVA. 2 = REVANCHE: a MESMA horda volta e vale UMA
// troca grátis de 2 terrenos, com a dica calculada aqui na derrota. A regra fica em `e.regra` (só existe com regra ≥ 2: a partida
// de regra 1 sai igual, byte a byte, à de antes); estado guardado sem o campo = regra 1. VERSAO não sobe.
import { estadoDaSemente, inteiroEm } from '../rng.js'
import { ALBUM, CARTAS, CHEFES, HORDA, INVASORES, PARTIDA as P, RARIDADES, RELIQUIAS } from './config.js'
import { montarExercito, simularBatalha } from './batalha.js'

const arr = (x) => Math.floor(x + 0.5)
const VERSAO = 1
const REGRA_MAIS_NOVA = 2 // a maior regra que este motor sabe jogar (versão de código, não número de balanceamento)
const regraDe = (e) => e.regra ?? 1

// ---------------------------------------------------------------- sorteio (muda o estado clonado)
function int(e, n) { const r = inteiroEm(e.sorteio, n); e.sorteio = r.s; return r.valor }

function embaralhar(e, lista) {
  const a = lista.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = int(e, i + 1); const x = a[i]; a[i] = a[j]; a[j] = x }
  return a
}

// O dado da raridade: um número de 0 a 99; cada raridade ocupa `chance` números, na ordem do config (soma 100).
const DADO_RARIDADE = 100

/** Raridade sorteada pelo número do dado (índice em RARIDADES). */
function raridadeDoNumero(x) {
  let ri = 0
  for (; ri < RARIDADES.length - 1; ri++) { if (x < RARIDADES[ri].chance) break; x -= RARIDADES[ri].chance }
  return ri
}

/** Raridade que DE FATO sai: a sorteada se houver carta dela; senão a de baixo mais perto; sem nada embaixo, a de cima mais perto. -1 = nenhuma. */
function raridadeQueSai(ri, tem) {
  for (let i = ri; i >= 0; i--) if (tem[i]) return i
  for (let i = ri + 1; i < RARIDADES.length; i++) if (tem[i]) return i
  return -1
}

const temRaridade = (cand) => RARIDADES.map((r) => cand.some((id) => CARTAS[id].raridade === r.id))

/** Carta por raridade entre `pool` (menos `fora`). Raridade vazia cai para a de baixo (e, sem nada embaixo, sobe). */
function sortearCarta(e, pool, fora = []) {
  const cand = pool.filter((id) => !fora.includes(id))
  if (!cand.length) return null
  const i = raridadeQueSai(raridadeDoNumero(int(e, DADO_RARIDADE)), temRaridade(cand))
  const lst = cand.filter((id) => CARTAS[id].raridade === RARIDADES[i].id)
  return lst[int(e, lst.length)]
}

/**
 * Chance REAL (em %) de uma carta sorteada sair de cada raridade, para ESTE conjunto de cartas — pelo mesmo dado e pela
 * mesma queda do sorteio acima (uma fonte só). Raridade sem carta no conjunto: 0. Soma 100 (ou tudo 0 com o conjunto vazio).
 */
export function chancesReais(cartas) {
  const conta = contaDoDado(temRaridade(cartasValidas(cartas)))
  return RARIDADES.map((r, i) => ({ id: r.id, nome: r.nome, chance: (conta[i] * 100) / DADO_RARIDADE }))
}

const cartasValidas = (cartas) => {
  if (!Array.isArray(cartas)) throw new Error('Lista de cartas inválida')
  return cartas.filter((id) => typeof id === 'string' && Object.hasOwn(CARTAS, id))
}
const indiceDaRaridade = (id) => RARIDADES.findIndex((r) => r.id === CARTAS[id].raridade)

/** Quantos números do dado (de DADO_RARIDADE) dão cada raridade, dado quais raridades há (`tem`): cada número pela queda do sorteio. */
function contaDoDado(tem) {
  const conta = RARIDADES.map(() => 0)
  if (tem.some(Boolean)) for (let x = 0; x < DADO_RARIDADE; x++) conta[raridadeQueSai(raridadeDoNumero(x), tem)]++
  return conta
}

/**
 * R34: chance (%) de cada raridade NA MÃO que sai (fração esperada das cartas da mão), EXATA, pelo mesmo caminho de sortearOferta:
 * a carta que sobe (uma das `sobe`, por igual) e depois cartas de `cartas` SEM REPETIR, cada uma pelo dado acima. As cartas de uma
 * raridade são iguais entre si para o dado, então basta seguir quantas sobram de cada raridade (no máximo 5^3 caminhos).
 * `chance` = inteiros que somam 100 (maior resto, empate na ordem do config); `exata` = o valor sem arredondar.
 */
export function chancesDaMao({ cartas, sobe = [] } = {}) {
  const pool = cartasValidas(cartas), sob = cartasValidas(sobe)
  const esperado = RARIDADES.map(() => 0)
  const seguir = (conta, faltam, p) => {
    if (!faltam || !conta.some((n) => n > 0)) return
    const dist = contaDoDado(conta.map((n) => n > 0)).map((n) => n / DADO_RARIDADE)
    dist.forEach((q, i) => { if (!q) return; esperado[i] += p * q; conta[i]--; seguir(conta, faltam - 1, p * q); conta[i]++ })
  }
  const contar = (lista) => { const c = RARIDADES.map(() => 0); for (const id of lista) c[indiceDaRaridade(id)]++; return c }
  if (!sob.length) seguir(contar(pool), TAMANHO_DA_MAO, 1)
  else for (const s of sob) { esperado[indiceDaRaridade(s)] += 1 / sob.length; seguir(contar(pool.filter((id) => id !== s)), TAMANHO_DA_MAO - 1, 1 / sob.length) }
  const total = esperado.reduce((a, b) => a + b, 0)
  const exata = esperado.map((v) => (total ? (v * 100) / total : 0))
  const chance = exata.map(Math.floor)
  if (total) {
    const sobra = 100 - chance.reduce((a, b) => a + b, 0)
    const ordem = exata.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])
    for (let k = 0; k < sobra; k++) chance[ordem[k][1]]++
  }
  return RARIDADES.map((r, i) => ({ id: r.id, nome: r.nome, chance: chance[i], exata: exata[i] }))
}

const TAMANHO_DA_MAO = 3

/** A mão: a carta que sobe (se houver, uma das `sobe`) e depois cartas de `pool` sem repetir, até 3. */
function sortearOferta(e, pool, sobe) {
  const oferta = []
  if (sobe.length) oferta.push(sobe[int(e, sobe.length)])
  while (oferta.length < TAMANHO_DA_MAO) { const c = sortearCarta(e, pool, oferta); if (!c) break; oferta.push(c) }
  return oferta
}

/** Uma mão sorteada por uma semente própria, com o MESMO sorteio da partida (para conferir as chances da mão). */
export function sortearMaoDaSemente(semente, cartas, sobe = []) {
  return sortearOferta({ sorteio: estadoDaSemente(semente) }, cartas, sobe)
}

/** Uma carta sorteada de `cartas` por uma semente própria, com o MESMO sorteio da partida (para conferir as chances). */
export function sortearCartaDaSemente(semente, cartas) {
  const e = { sorteio: estadoDaSemente(semente) }
  return sortearCarta(e, cartas)
}

/** Cartas de onde sai a mão desta rodada: na rodada 1, só as Tropas que lutam (Soup Carrier sozinho não vence ninguém). */
const tropasQueLutam = (lista) => lista.filter((id) => CARTAS[id].tipo === 'tropa' && CARTAS[id].dano > 0)
const cartasDaMao = (e) => (e.rodada === 1 ? tropasQueLutam(e.liberadas) : e.liberadas)
/** Cartas que podem vir como LEVEL UP na 1ª posição (rodada 2 em diante): as do reino abaixo do nível máximo. */
const sobeDe = (e) => (e.rodada === 1 ? [] : [...new Set(e.terrenos.filter((t) => t && t.nivel < P.nivelMax).map((t) => t.carta))])

/** Chance (em %) de a bolsa de uma rodada comum trazer relíquia: a do config, ou 0 se não sobra relíquia livre. */
const chanceDaReliquia = (livres) => (livres > 0 ? P.bolsa.chanceReliquia : 0)

export function chefeDaRodada(r) {
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
  if (int(e, 100) < chanceDaReliquia(livres.length)) bolsa = { tipo: 'bolsa', reliquia: livres[int(e, livres.length)] }
  e.espolios = [{ tipo: 'carta', carta }, { tipo: 'promocao' }, bolsa]
}

function novaOferta(e) {
  // rodada 1: três Tropas diferentes que lutam; depois, a carta que sobe (se houver) e o resto do álbum
  const sobe = sobeDe(e)
  e.oferta = sortearOferta(e, cartasDaMao(e), sobe)
  e.levelUp = sobe.length > 0
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
  if (lista === undefined) lista = ALBUM.inicial
  if (!Array.isArray(lista) || lista.length > Object.keys(CARTAS).length) throw new Error('Lista de cartas liberadas inválida')
  const vistos = new Set()
  for (const id of lista) {
    if (typeof id !== 'string' || !Object.hasOwn(CARTAS, id) || vistos.has(id)) throw new Error(`Carta liberada inválida: ${String(id)}`)
    vistos.add(id)
  }
  if (tropasQueLutam(lista).length < 3) throw new Error('São precisas pelo menos 3 Tropas que lutam')
  // ordem fixa (a do config), para a mesma lista em outra ordem dar a mesma partida
  return Object.keys(CARTAS).filter((id) => vistos.has(id))
}

export function criarPartida({ semente, cartasLiberadas, regra } = {}) {
  if (!((typeof semente === 'string' && semente.length >= 1 && semente.length <= 200) || Number.isSafeInteger(semente))) {
    throw new Error('Semente inválida')
  }
  if (regra !== undefined && !(Number.isInteger(regra) && regra >= 1 && regra <= REGRA_MAIS_NOVA)) throw new Error('Regra da partida inválida')
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
  // R46: regra 1 não grava nada (a partida sai igual à de antes); regra ≥ 2 grava a regra e a revanche (desligada)
  if (regra >= 2) { e.regra = regra; e.revanche = { troca: false, dica: null } }
  abrirRodada(e)
  return e
}

// ---------------------------------------------------------------- R46: revanche
/** As trocas de 2 terrenos (a < b) que mudam alguma coisa: dois terrenos vazios não contam (até 15). */
function trocasPossiveis(terrenos) {
  const out = []
  for (let a = 1; a <= P.terrenos; a++) for (let b = a + 1; b <= P.terrenos; b++) if (terrenos[a - 1] || terrenos[b - 1]) out.push({ a, b })
  return out
}
function trocado(terrenos, a, b) {
  const out = terrenos.map((t) => (t ? { ...t } : null))
  const x = out[a - 1]; out[a - 1] = out[b - 1]; out[b - 1] = x
  return out
}

/**
 * R46: a DICA da revanche — a 1ª troca (na ordem a < b, sem dois vazios) que vence a horda com o reino como está (sem a carta
 * nova da mão); null se nenhuma vence. A luta não tem dado: isto só olha o que já está na tela. Fonte única (motor, servidor,
 * modo local e medidor); o motor a calcula na derrota e a guarda no estado.
 */
export function dicaDaTroca(e) {
  if (!e || !e.horda || !Array.isArray(e.terrenos)) return null
  for (const { a, b } of trocasPossiveis(e.terrenos)) {
    if (simularBatalha({ terrenos: trocado(e.terrenos, a, b), reliquias: e.reliquias, horda: e.horda, eventos: false }).vitoria) return { a, b }
  }
  return null
}

const trocaLiberada = (e) => regraDe(e) >= 2 && e.fase === 'carta' && !!e.revanche && e.revanche.troca === true

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
export function aplicar(estado, comando, { eventos = true } = {}) { return aplicarComando(estado, comando, eventos, true) }

/** `comDica` = false só no reproduzir: a dica da revanche fica para o fim (ela não muda nenhum comando; ver reproduzir). */
function aplicarComando(estado, comando, eventos, comDica) {
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
      if (regraDe(e) >= 2) e.revanche = { troca: false, dica: null } // lutar encerra a troca (usada ou não)
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
        if (regraDe(e) >= 2) {
          // R46 REVANCHE: a MESMA horda volta. O sorteio anda como na regra 1 (horda nova sorteada e jogada fora): mão e espólio iguais.
          const horda = e.horda
          abrirRodada(e)
          e.horda = horda
          const troca = P.trocasNaRevanche >= 1
          e.revanche = { troca, dica: troca && comDica ? dicaDaTroca(e) : null }
        } else abrirRodada(e) // a mesma rodada volta, com horda nova e mais uma carta
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
    case 'trocar': {
      if (!trocaLiberada(e)) return erro('sem_troca', 'A troca grátis só vale uma vez, logo depois de perder uma luta.')
      if (!terrenoValido(c.a) || !terrenoValido(c.b) || c.a === c.b) return erro('terreno', `Escolha dois terrenos diferentes, de 1 a ${P.terrenos}.`)
      if (!e.terrenos[c.a - 1] && !e.terrenos[c.b - 1]) return erro('terreno_vazio', 'Os dois terrenos estão vazios.')
      e.terrenos = trocado(e.terrenos, c.a, c.b)
      e.revanche = { troca: false, dica: null }
      evs.push({ tipo: 'troca', a: c.a, b: c.b })
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
/**
 * R39: o reino resistiu = venceu a rodada da vitória. Quem perde repete a rodada, então vencer a 20 é ter 20 vencidas.
 * Sai só do número de vencidas (nada novo guardado na partida, nenhum evento novo): partida antiga também tem.
 */
export function resistiu(vencidas) {
  return Number.isSafeInteger(vencidas) && vencidas >= P.rodadaDaVitoria
}

export function resultado(e) {
  return {
    fim: e.fase === 'fim', motivo: e.fim ? e.fim.motivo : null,
    rodada: e.rodada, vencidas: e.vencidas, pontos: pontosDe(e), venceu: resistiu(e.vencidas),
    vidas: e.vidas, ouro: e.ouro, ouroGanho: e.ouroGanho, ouroGasto: e.ouroGasto,
    terrenos: e.terrenos.map((t) => (t ? { ...t } : null)), reliquias: e.reliquias.slice(), comandos: e.comandos,
  }
}

/** Tudo que a tela pode mostrar. Nunca a semente/estado do sorteio. */
export function visao(e) {
  return {
    rodada: e.rodada, vencidas: e.vencidas, pontos: pontosDe(e), venceu: resistiu(e.vencidas),
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
    // R31: chances VERDADEIRAS desta partida (as do sorteio acima): por raridade, para as cartas de onde sai a mão agora;
    // e a da bolsa trazer relíquia nesta rodada (null na rodada do chefe, que não sorteia bolsa)
    // R34: a chance é a da MÃO que sai (sem repetir carta e com a carta que sobe), não a de uma carta sozinha
    chances: chancesDaMao({ cartas: cartasDaMao(e), sobe: sobeDe(e) }),
    chanceReliquia: e.horda && e.horda.chefe ? null : chanceDaReliquia(reliquiasLivres(e).length),
    reliquias: e.reliquias.slice(),
    ultima: e.ultima ? { ...e.ultima } : null,
    fim: e.fim ? { ...e.fim, venceu: resistiu(e.fim.vencidas) } : null,
    comandos: e.comandos,
    // R46: só nas partidas de regra ≥ 2. troca = a troca grátis está valendo agora; dica = { a, b } (troca que vence) ou null
    ...(regraDe(e) >= 2 ? { revanche: { troca: trocaLiberada(e), dica: trocaLiberada(e) && e.revanche.dica ? { ...e.revanche.dica } : null } } : {}),
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
    if (trocaLiberada(e)) for (const { a, b } of trocasPossiveis(e.terrenos)) comandos.push({ tipo: 'trocar', a, b })
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
export function reproduzir({ semente, cartasLiberadas, comandos, regra }) {
  if (!Array.isArray(comandos) || comandos.length > P.tetoComandos) return { ok: false, erro: 'comandos', indice: -1 }
  let e
  try { e = criarPartida({ semente, cartasLiberadas, regra }) } catch (err) { return { ok: false, erro: 'criar', motivo: err.message, indice: -1 } }
  // R46: a dica (até 15 lutas por derrota) só é calculada para a revanche que ainda vale no FIM, com o reino da hora da derrota:
  // nenhum comando depende dela e ela some na troca e na luta, então o estado final sai igual ao do jogo, só que mais rápido.
  let daDerrota = null
  for (let i = 0; i < comandos.length; i++) {
    const r = aplicarComando(e, comandos[i], false, false)
    if (!r.ok) return { ok: false, erro: r.erro, motivo: r.motivo, indice: i }
    e = r.estado
    if (comandos[i].tipo === 'batalhar') daDerrota = e.revanche && e.revanche.troca ? e : null
  }
  if (daDerrota && e.revanche.troca) e.revanche.dica = dicaDaTroca(daDerrota)
  return { ok: true, estado: e, resultado: resultado(e) }
}
