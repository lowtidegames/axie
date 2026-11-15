// Frayz — motor de batalha 3×3 (sem tela, sem banco, sem rede).
// Puro e determinístico: semente + lista de comandos → mesma luta, sempre. Todo sorteio sai da semente,
// em ordem fixa (embaralhar A, embaralhar B, quem começa, depois críticos/reembaralhos/desempates na ordem
// em que acontecem). O estado é JSON puro. O servidor nunca confia na tela: todo comando é conferido.
//
// API pública:
//   criarLuta({ semente, timeA, timeB })         → estado
//   comandosValidos(estado)                       → [comando]  (todos os que a vez atual pode mandar)
//   aplicar(estado, comando)                      → { ok: true, estado, eventos } | { ok: false, codigo, motivo }
//   resultado(estado)                             → null | { vencedor, motivo, turno, pct }
//   reproduzir({ semente, timeA, timeB, comandos }) → { ok, estado, resultado } | { ok: false, indice, codigo, motivo }
//   montarBoneco(definicao)                       → ficha do boneco (vida, tipo, cartas...)
//   visaoDoTime(estado, time)                     → o que a tela daquele time pode ver (sem mão do rival)
//   textoDaCarta(id) · textoDoBordado(id)         → texto para a tela, com os números da config
// Comandos: { tipo: 'jogar', time, carta, alvo? } · { tipo: 'trocar', time, a, b }
//           { tipo: 'fiapo', time, carta } · { tipo: 'passar', time }
import { BONUS_DE_TIPO, BONECOS_PRONTOS, BORDADOS, CARTAS, PARTES, RARIDADES, REGRAS, TIPOS } from './config.js'
import { embaralhar, hashSemente, passo } from './rng.js'

export const VERSAO_DO_MOTOR = 1
const SLOTS = ['tronco', 'cabeca', 'bracos', 'pernas', 'bordado']
const outro = (t) => (t === 'A' ? 'B' : 'A')

/** O tipo `a` bate forte no tipo `b`? (cada um bate no seguinte da roda) */
export function bateForte(a, b) {
  const i = TIPOS.indexOf(a)
  return i >= 0 && TIPOS[(i + 1) % TIPOS.length] === b
}

// ------------------------------------------------------------------ textos (número da tela = número do servidor)

function preencher(modelo, achar) {
  return modelo.replace(/\{([\w.]+?)(%?)\}/g, (_, chave, pct) => {
    const v = achar(chave)
    if (typeof v !== 'number') throw new Error(`Texto com campo desconhecido: {${chave}}`)
    return pct ? `${Math.round(v * 100)}%` : String(v)
  })
}

/** Texto da carta com os números de shared/config.js. */
export function textoDaCarta(id) {
  const c = CARTAS[id]
  if (!c) throw new Error(`Carta desconhecida: ${id}`)
  return preencher(c.texto, (k) => {
    const [a, b] = k.split('.')
    if (a === 'c') return c.condicao?.[b]
    return c.efeitos[Number(a)]?.[b]
  })
}

/** Texto do bordado com os números de shared/config.js. */
export function textoDoBordado(id) {
  const b = BORDADOS[id]
  if (!b) throw new Error(`Bordado desconhecido: ${id}`)
  return preencher(b.texto, (k) => b[k])
}

// ------------------------------------------------------------------ montagem dos bonecos

function lerParte(ref, slot) {
  let id = ref, raridade = 'comum'
  if (ref && typeof ref === 'object') { id = ref.id; raridade = ref.raridade ?? 'comum' }
  else if (typeof ref === 'string' && ref.includes('@')) [id, raridade] = ref.split('@')
  const p = typeof id === 'string' ? PARTES[id] : undefined
  if (!p) throw new Error(`Parte desconhecida em ${slot}: ${JSON.stringify(ref)}`)
  if (p.slot !== slot) throw new Error(`A parte ${id} não serve em ${slot}`)
  if (!RARIDADES[raridade]) throw new Error(`Raridade desconhecida: ${raridade}`)
  return { id, raridade, p, f: RARIDADES[raridade].fator }
}

/** Definição (id de boneco pronto ou { nome?, partes }) → ficha do boneco. Lança erro se for inválida. */
export function montarBoneco(def) {
  let d = def
  if (typeof def === 'string') {
    if (!BONECOS_PRONTOS[def]) throw new Error(`Boneco pronto desconhecido: ${def}`)
    d = { pronto: def, ...BONECOS_PRONTOS[def] }
  }
  if (!d || typeof d !== 'object' || !d.partes) throw new Error('Boneco sem partes')
  const ps = {}
  for (const s of SLOTS) ps[s] = lerParte(d.partes[s], s)
  let vida = 0, rapidez = 0, firmeza = 0
  for (const s of ['tronco', 'cabeca', 'bracos', 'pernas']) {
    vida += (ps[s].p.vida || 0) * ps[s].f
    rapidez += (ps[s].p.rapidez || 0) * ps[s].f
    firmeza += (ps[s].p.firmeza || 0) * ps[s].f
  }
  const apelido = ['cabeca', 'bracos', 'pernas'].map((s) => ps[s].p.apelido).join('-')
  return {
    pronto: d.pronto ?? null,
    nome: typeof d.nome === 'string' && d.nome ? d.nome.slice(0, 40) : apelido,
    tipo: ps.tronco.p.tipo,
    vidaMax: Math.round(vida),
    rapidez: Math.round(rapidez * 10) / 10,
    firmeza: Math.min(REGRAS.firmezaMaxima, Math.round(firmeza * 10) / 10),
    bordado: ps.bordado.p.bordado,
    cartas: ['cabeca', 'bracos', 'pernas'].map((s) => ps[s].p.carta),
    partes: Object.fromEntries(SLOTS.map((s) => [s, `${ps[s].id}@${ps[s].raridade}`])),
  }
}

// ------------------------------------------------------------------ criação

function sortear(e) {
  const r = passo(e.rng)
  e.rng = r.s
  return r.valor
}

function emitir(e, ev) {
  if (e.registro) e.eventos.push({ turno: e.turno, ...ev })
}

/** Cria a luta. Lança erro se a semente ou os times forem inválidos. */
export function criarLuta({ semente, timeA, timeB } = {}) {
  if (!(typeof semente === 'string' && semente.length > 0 && semente.length <= 200) && !Number.isSafeInteger(semente)) {
    throw new Error('Semente inválida (texto de 1 a 200 letras ou número inteiro)')
  }
  const e = {
    versao: VERSAO_DO_MOTOR,
    semente,
    rng: hashSemente(semente),
    turno: 0,
    vez: null,
    comecou: null,
    fim: null,
    registro: true,
    times: {},
    bonecos: {},
    cartas: {},
    eventos: [],
    comandos: [],
  }
  for (const [t, defs] of [['A', timeA], ['B', timeB]]) {
    if (!Array.isArray(defs) || defs.length !== 3) throw new Error(`O time ${t} precisa de 3 bonecos`)
    const time = { linha: 0, mao: [], baralho: [], descarte: [], fiapos: [], lugares: [], jogou: false }
    let n = 0
    defs.forEach((def, i) => {
      const f = montarBoneco(def)
      const id = `${t}${i}`
      e.bonecos[id] = {
        id, time: t, nome: f.nome, pronto: f.pronto, tipo: f.tipo, vidaMax: f.vidaMax, vida: f.vidaMax,
        rapidez: f.rapidez, firmeza: f.firmeza, bordado: f.bordado, partes: f.partes,
        estado: 'vivo', usouFio: false, fioAte: 0, cartasNoFio: 0, escudo: 0, veu: false, fioSoltoAte: 0,
        reserva: f.bordado === 'botao_reserva' ? BORDADOS.botao_reserva.valor : 0,
      }
      time.lugares.push(id)
      for (const carta of f.cartas) {
        for (let c = 0; c < REGRAS.copiasPorCarta; c++) {
          const cid = `${t}c${n++}`
          e.cartas[cid] = { carta, dono: id }
          time.baralho.push(cid)
        }
      }
    })
    e.times[t] = time
  }
  e.times.A.baralho = embaralhar(e.times.A.baralho, () => sortear(e))
  e.times.B.baralho = embaralhar(e.times.B.baralho, () => sortear(e))
  e.comecou = sortear(e) < 0.5 ? 'A' : 'B'
  emitir(e, { t: 'inicio', comecou: e.comecou })
  comprar(e, 'A', REGRAS.maoInicial)
  comprar(e, 'B', REGRAS.maoInicial)
  iniciarTurno(e, e.comecou)
  return e
}

// ------------------------------------------------------------------ ajudas de estado

const de = (e, id) => e.bonecos[id]
const lugarDe = (e, b) => e.times[b.time].lugares.indexOf(b.id)
const naMao = (e, t, cid) => e.times[t].mao.includes(cid)
/** De pé para AGIR (vivo ou no Último Fio). */
const dePe = (b) => b.estado !== 'caido'
/** Pode ser ALVO (só vivo; no Último Fio não é alvo nem bloqueia). */
const alvejavel = (b) => b.estado === 'vivo'

function primeiroAlvejavel(e, t) {
  for (const id of e.times[t].lugares) if (alvejavel(de(e, id))) return id
  return null
}

function comprar(e, t, qtd) {
  const time = e.times[t]
  for (let i = 0; i < qtd; i++) {
    if (time.mao.length >= REGRAS.maoMaxima) break
    if (time.baralho.length === 0) {
      if (time.descarte.length === 0) break
      time.baralho = embaralhar(time.descarte, () => sortear(e))
      time.descarte = []
      emitir(e, { t: 'reembaralha', time: t })
    }
    const cid = time.baralho.shift()
    time.mao.push(cid)
    emitir(e, { t: 'compra', time: t, carta: cid })
  }
}

function somarLinha(e, t, n) {
  const time = e.times[t]
  time.linha = Math.max(0, Math.min(REGRAS.linhaMaxima, time.linha + n))
}

// ------------------------------------------------------------------ turnos

function iniciarTurno(e, t) {
  e.turno += 1
  e.vez = t
  emitir(e, { t: 'turno', time: t })
  if (e.turno >= REGRAS.tesouraInicio) {
    for (const tt of ['A', 'B']) {
      for (const id of e.times[tt].lugares) {
        const b = de(e, id)
        if (!alvejavel(b)) continue
        const corte = Math.round(b.vidaMax * REGRAS.tesouraCorte)
        emitir(e, { t: 'tesoura', alvo: id, valor: corte })
        tirarVida(e, b, corte, 'tesoura')
      }
    }
    if (checarFim(e, 'tesoura')) return
  }
  const time = e.times[t]
  for (const id of time.lugares) {
    const b = de(e, id)
    if (REGRAS.escudoSomeNoTurnoDoDono) b.escudo = 0
    b.veu = false
    if (b.estado === 'vivo' && b.bordado === 'remendo_vivo') curar(e, b, BORDADOS.remendo_vivo.valor)
  }
  const ganho = !time.jogou && t === e.comecou ? REGRAS.linhaPrimeiroTurnoDeQuemComeca : REGRAS.linhaPorTurno
  somarLinha(e, t, ganho)
  emitir(e, { t: 'linha', time: t, linha: time.linha })
  if (time.jogou) comprar(e, t, REGRAS.compraPorTurno)
  else comprar(e, t, t === e.comecou ? REGRAS.compraNoPrimeiroTurno.quemComeca : REGRAS.compraNoPrimeiroTurno.quemNaoComeca)
  time.jogou = true
}

function fimDoTurno(e) {
  const t = e.vez
  for (const id of e.times[t].lugares) {
    const b = de(e, id)
    if (b.estado === 'fio' && b.fioAte <= e.turno) cair(e, b, 'fio')
  }
  for (const b of Object.values(e.bonecos)) if (b.fioSoltoAte && b.fioSoltoAte <= e.turno) b.fioSoltoAte = 0
  if (checarFim(e, 'golpe')) return
  if (e.turno >= REGRAS.turnoFinal) { fimNoTurnoFinal(e); return }
  iniciarTurno(e, outro(t))
}

function pctDoTime(e, t) {
  let s = 0
  for (const id of e.times[t].lugares) { const b = de(e, id); s += b.estado === 'vivo' ? b.vida / b.vidaMax : 0 }
  return Math.round(s * 10000) / 10000
}

function fimNoTurnoFinal(e) {
  const pct = { A: pctDoTime(e, 'A'), B: pctDoTime(e, 'B') }
  let vencedor, motivo = 'tesoura'
  if (pct.A > pct.B) vencedor = 'A'
  else if (pct.B > pct.A) vencedor = 'B'
  else { vencedor = sortear(e) < 0.5 ? 'A' : 'B'; motivo = 'desempate' }
  e.fim = { vencedor, motivo, turno: e.turno, pct }
  emitir(e, { t: 'fim', ...e.fim })
}

/** Confere se algum time perdeu os 3. `causa` diz o que derrubou ('golpe' ou 'tesoura'). */
function checarFim(e, causa) {
  if (e.fim) return true
  const caiu = (t) => e.times[t].lugares.every((id) => de(e, id).estado === 'caido')
  const a = caiu('A'), b = caiu('B')
  if (!a && !b) return false
  const pct = { A: pctDoTime(e, 'A'), B: pctDoTime(e, 'B') }
  let vencedor, motivo = causa === 'tesoura' ? 'tesoura' : 'derrubou'
  if (a && b) { vencedor = sortear(e) < 0.5 ? 'A' : 'B'; motivo = 'desempate' }
  else vencedor = a ? 'B' : 'A'
  e.fim = { vencedor, motivo, turno: e.turno, pct }
  emitir(e, { t: 'fim', ...e.fim })
  return true
}

// ------------------------------------------------------------------ vida, dano, cura

function cair(e, b, por) {
  b.estado = 'caido'
  b.vida = 0
  b.escudo = 0
  b.veu = false
  emitir(e, { t: 'caiu', alvo: b.id, por })
  if (b.bordado === 'bolso_de_linha') somarLinha(e, b.time, BORDADOS.bolso_de_linha.valor)
}

/** Tira vida já calculada (depois de escudo). Cuida do Último Fio. */
function tirarVida(e, b, valor, por) {
  if (b.estado !== 'vivo' || valor <= 0) return
  b.vida -= valor
  if (b.vida > 0) return
  b.vida = 0
  if (!b.usouFio) {
    b.estado = 'fio'
    b.usouFio = true
    b.escudo = 0
    b.veu = false
    // fica de pé até o fim do PRÓXIMO turno do dono
    b.fioAte = e.vez === b.time ? e.turno + 2 : e.turno + 1
    emitir(e, { t: 'ultimoFio', alvo: b.id, ate: b.fioAte })
  } else cair(e, b, por)
}

function curar(e, b, valor) {
  if (b.estado !== 'vivo') return 0
  const antes = b.vida
  b.vida = Math.min(b.vidaMax, b.vida + valor)
  if (b.vida > antes) emitir(e, { t: 'cura', alvo: b.id, valor: b.vida - antes })
  return b.vida - antes
}

/** Dano de golpe (carta) ou de reflexo. Devolve a vida tirada. */
function golpear(e, fonte, alvo, bruto, { refletido = false, carta = null, critico = false } = {}) {
  if (alvo.estado !== 'vivo') return 0
  if (!refletido && alvo.veu) {
    alvo.veu = false
    emitir(e, { t: 'errou', de: fonte?.id ?? null, alvo: alvo.id, carta })
    return 0
  }
  let v = bruto
  if (alvo.reserva > 0 && !refletido) { const r = Math.min(alvo.reserva, v); v -= r; alvo.reserva = 0 }
  if (alvo.bordado === 'pe_de_chumbo' && !refletido) v = Math.max(0, v - BORDADOS.pe_de_chumbo.valor)
  let absorvido = 0
  if (alvo.escudo > 0) { absorvido = Math.min(alvo.escudo, v); alvo.escudo -= absorvido; v -= absorvido }
  const antes = alvo.vida
  emitir(e, { t: 'dano', de: fonte?.id ?? null, alvo: alvo.id, valor: Math.min(v, antes), bruto, escudo: absorvido, critico, refletido, carta })
  tirarVida(e, alvo, v, 'golpe')
  const tirado = antes - alvo.vida
  if (!refletido && fonte && alvo.bordado === 'espinho' && fonte.estado === 'vivo') {
    golpear(e, alvo, fonte, BORDADOS.espinho.valor, { refletido: true })
  }
  return tirado
}

function calcularDano(e, usuario, alvo, base, def) {
  let m = 1
  if (bateForte(def.tipo, alvo.tipo)) m *= 1 + BONUS_DE_TIPO
  if (alvo.fioSoltoAte >= e.turno) m *= 1 + REGRAS.fioSoltoBonus
  if (usuario.bordado === 'agulha_afiada' && def.parte === 'bracos') m *= 1 + BORDADOS.agulha_afiada.valor
  if (usuario.bordado === 'rancor' && usuario.estado === 'fio') m *= 1 + BORDADOS.rancor.valor
  const chance = usuario.rapidez + (usuario.bordado === 'olho_de_vidro' ? BORDADOS.olho_de_vidro.valor : 0)
  let critico = false
  if (e.simulado) m *= 1 + REGRAS.critico * Math.min(1, chance / 100) // robô pensando: usa a média, não espia o sorteio
  else { critico = sortear(e) * 100 < chance; if (critico) m *= 1 + REGRAS.critico }
  m *= 1 - alvo.firmeza / 100
  return { valor: Math.round(base * m), critico }
}

// ------------------------------------------------------------------ cartas

function mover(e, b, passo_) {
  if (b.bordado === 'pe_de_chumbo') return
  const l = e.times[b.time].lugares
  const i = l.indexOf(b.id), j = i + passo_
  if (j < 0 || j >= l.length) return
  l[i] = l[j]; l[j] = b.id
  emitir(e, { t: 'move', alvo: b.id, de: i, para: j })
}

function condicaoOk(usuario, def) {
  if (!def.condicao) return true
  if (def.condicao.tipo === 'vidaBaixa') return usuario.estado === 'fio' || usuario.vida < usuario.vidaMax * def.condicao.limite
  return false
}

/** Alvos possíveis de uma carta para um usuário. [null] = carta sem alvo. [] = sem alvo possível. */
function alvosDaCarta(e, usuario, def) {
  const meu = usuario.time, rival = outro(meu)
  switch (def.alvo) {
    case 'frente': { const f = primeiroAlvejavel(e, rival); return f ? [f] : [] }
    case 'inimigo': return e.times[rival].lugares.filter((id) => alvejavel(de(e, id)))
    case 'todos': return e.times[rival].lugares.some((id) => alvejavel(de(e, id))) ? [null] : []
    case 'aliado': return e.times[meu].lugares.filter((id) => alvejavel(de(e, id)))
    case 'vizinho': {
      const l = e.times[meu].lugares, i = l.indexOf(usuario.id)
      const v = [l[i - 1], l[i + 1]].filter((id) => id && alvejavel(de(e, id)))
      return v.length ? v : [null]
    }
    case 'outroAliado': return e.times[meu].lugares.filter((id) => id !== usuario.id && dePe(de(e, id)))
    case 'nenhum': return [null]
    default: return []
  }
}

function executarCarta(e, usuario, alvoId, def) {
  const alvo = alvoId ? de(e, alvoId) : null
  for (const ef of def.efeitos) {
    switch (ef.tipo) {
      case 'dano': {
        const lista = def.alvo === 'todos' ? e.times[outro(usuario.time)].lugares.filter((id) => alvejavel(de(e, id))).map((id) => de(e, id)) : [alvo]
        for (const a of lista) {
          if (!a || a.estado !== 'vivo') continue
          let base = ef.valor
          if (ef.bonusFioSolto && a.fioSoltoAte >= e.turno) base *= 1 + ef.bonusFioSolto
          if (ef.bonusSeMenosVida && usuario.vida < a.vida) base += ef.bonusSeMenosVida
          if (ef.bonusTras && lugarDe(e, a) === REGRAS.lugares.length - 1) base += ef.bonusTras
          const d = calcularDano(e, usuario, a, base, def)
          golpear(e, usuario, a, d.valor, { carta: def.id, critico: d.critico })
        }
        break
      }
      case 'quebraEscudo': if (alvo && alvo.escudo > 0) { emitir(e, { t: 'quebraEscudo', alvo: alvo.id, valor: alvo.escudo }); alvo.escudo = 0 } break
      case 'fioSolto': if (alvo && alvo.estado === 'vivo') { alvo.fioSoltoAte = e.turno + ef.turnos; emitir(e, { t: 'fioSolto', alvo: alvo.id, ate: alvo.fioSoltoAte }) } break
      case 'empurra': if (alvo) mover(e, alvo, +1); break
      case 'puxa': if (alvo) mover(e, alvo, -1); break
      case 'escudo': {
        const lista = ef.em === 'si' ? [usuario] : ef.em === 'alvo' ? (alvo ? [alvo] : []) : e.times[usuario.time].lugares.map((id) => de(e, id))
        for (const b of lista) if (b.estado === 'vivo') { b.escudo = Math.min(REGRAS.escudoMaximo, b.escudo + ef.valor); emitir(e, { t: 'escudo', alvo: b.id, valor: ef.valor, total: b.escudo }) }
        break
      }
      case 'veu': if (usuario.estado === 'vivo') { usuario.veu = true; emitir(e, { t: 'veu', alvo: usuario.id }) } break
      case 'compra': {
        const t = e.times[usuario.time]
        const antes = t.mao.length
        comprar(e, usuario.time, ef.qtd)
        if (ef.linhaSeMesmoTipo && t.mao.length > antes) {
          const nova = e.cartas[t.mao[t.mao.length - 1]]
          if (CARTAS[nova.carta].tipo === usuario.tipo) { somarLinha(e, usuario.time, ef.linhaSeMesmoTipo); emitir(e, { t: 'linha', time: usuario.time, linha: t.linha }) }
        }
        break
      }
      case 'cura': curar(e, ef.em === 'si' ? usuario : alvo, ef.valor); break
      case 'autoDano': if (usuario.estado === 'vivo') { emitir(e, { t: 'autoDano', alvo: usuario.id, valor: Math.min(ef.valor, usuario.vida) }); tirarVida(e, usuario, ef.valor, 'golpe') } break
      case 'ganhaLinha': somarLinha(e, usuario.time, ef.valor); emitir(e, { t: 'linha', time: usuario.time, linha: e.times[usuario.time].linha }); break
      case 'roubaLinha': { const r = outro(usuario.time); somarLinha(e, r, -ef.valor); emitir(e, { t: 'linha', time: r, linha: e.times[r].linha }); break }
      case 'trocaComAlvo': if (alvo) {
        const l = e.times[usuario.time].lugares, i = l.indexOf(usuario.id), j = l.indexOf(alvo.id)
        l[i] = alvo.id; l[j] = usuario.id
        emitir(e, { t: 'troca', a: usuario.id, b: alvo.id })
      } break
      default: throw new Error(`Efeito desconhecido: ${ef.tipo}`)
    }
  }
}

// ------------------------------------------------------------------ comandos

const recusa = (codigo, motivo) => ({ ok: false, codigo, motivo })

/** Confere o comando sem mudar nada. Devolve { ok, normal } ou a recusa. */
export function validar(e, cmd) {
  if (!e || typeof e !== 'object' || !e.times) return recusa('ESTADO_INVALIDO', 'Estado de luta inválido.')
  if (e.fim) return recusa('LUTA_ACABOU', 'A luta já acabou.')
  if (!cmd || typeof cmd !== 'object') return recusa('COMANDO_INVALIDO', 'Comando inválido.')
  if (cmd.time !== 'A' && cmd.time !== 'B') return recusa('COMANDO_INVALIDO', 'Time inválido.')
  if (cmd.time !== e.vez) return recusa('FORA_DO_TURNO', 'Não é a sua vez.')
  const t = cmd.time, time = e.times[t]
  switch (cmd.tipo) {
    case 'passar': return { ok: true, normal: { tipo: 'passar', time: t } }
    case 'trocar': {
      const a = typeof cmd.a === 'string' ? e.bonecos[cmd.a] : null, b = typeof cmd.b === 'string' ? e.bonecos[cmd.b] : null
      if (!a || !b || a.time !== t || b.time !== t || a.id === b.id) return recusa('TROCA_INVALIDA', 'Escolha dois bonecos diferentes do seu time.')
      if (!dePe(a) && !dePe(b)) return recusa('TROCA_INVALIDA', 'Os dois já caíram.')
      if (time.linha < REGRAS.custoDaTroca) return recusa('LINHA_INSUFICIENTE', 'Linha insuficiente para trocar.')
      return { ok: true, normal: { tipo: 'trocar', time: t, a: a.id, b: b.id } }
    }
    case 'fiapo': {
      if (typeof cmd.carta !== 'string' || !naMao(e, t, cmd.carta)) return recusa('CARTA_FORA_DA_MAO', 'Essa carta não está na sua mão.')
      if (dePe(de(e, e.cartas[cmd.carta].dono))) return recusa('NAO_E_FIAPO', 'Só vira fiapo a carta de boneco caído.')
      return { ok: true, normal: { tipo: 'fiapo', time: t, carta: cmd.carta } }
    }
    case 'jogar': {
      if (typeof cmd.carta !== 'string' || !naMao(e, t, cmd.carta)) return recusa('CARTA_FORA_DA_MAO', 'Essa carta não está na sua mão.')
      const inst = e.cartas[cmd.carta], def = { id: inst.carta, ...CARTAS[inst.carta] }, usuario = de(e, inst.dono)
      if (usuario.estado === 'caido') return recusa('BONECO_CAIDO', 'O boneco dessa carta caiu; ela virou fiapo.')
      if (usuario.estado === 'fio' && def.parte !== 'pernas') return recusa('ULTIMO_FIO_SO_PERNAS', 'No Último Fio ele só usa cartas de Pernas.')
      if (time.linha < def.linha) return recusa('LINHA_INSUFICIENTE', 'Linha insuficiente.')
      if (!condicaoOk(usuario, def)) return recusa('CONDICAO_DA_CARTA', 'A condição da carta não foi cumprida.')
      const alvos = alvosDaCarta(e, usuario, def)
      if (alvos.length === 0) return recusa('ALVO_INVALIDO', 'Não há alvo para essa carta.')
      let alvo = cmd.alvo ?? null
      if (alvo === null && alvos.length === 1) alvo = alvos[0]
      if (!alvos.includes(alvo)) return recusa('ALVO_INVALIDO', 'Alvo inválido para essa carta.')
      return { ok: true, normal: { tipo: 'jogar', time: t, carta: cmd.carta, alvo } }
    }
    default: return recusa('COMANDO_INVALIDO', 'Comando desconhecido.')
  }
}

function executar(e, c) {
  const t = c.time, time = e.times[t]
  e.comandos.push(c)
  switch (c.tipo) {
    case 'passar': emitir(e, { t: 'passou', time: t }); fimDoTurno(e); return
    case 'trocar': {
      somarLinha(e, t, -REGRAS.custoDaTroca)
      const l = time.lugares, i = l.indexOf(c.a), j = l.indexOf(c.b)
      l[i] = c.b; l[j] = c.a
      emitir(e, { t: 'troca', a: c.a, b: c.b })
      checarFim(e, 'golpe')
      return
    }
    case 'fiapo': {
      time.mao.splice(time.mao.indexOf(c.carta), 1)
      time.fiapos.push(c.carta) // fiapo sai da luta (não volta ao baralho)
      emitir(e, { t: 'fiapo', time: t, carta: c.carta })
      comprar(e, t, REGRAS.fiapoCompra)
      return
    }
    case 'jogar': {
      const inst = e.cartas[c.carta], def = { id: inst.carta, ...CARTAS[inst.carta] }, usuario = de(e, inst.dono)
      if (usuario.estado === 'fio') usuario.cartasNoFio++
      somarLinha(e, t, -def.linha)
      time.mao.splice(time.mao.indexOf(c.carta), 1)
      time.descarte.push(c.carta)
      emitir(e, { t: 'carta', time: t, carta: c.carta, id: def.id, de: usuario.id, alvo: c.alvo })
      executarCarta(e, usuario, c.alvo, def)
      checarFim(e, 'golpe')
    }
  }
}

/** Aplica no PRÓPRIO estado (uso interno: robôs e reprodução). Devolve { ok } ou a recusa. */
export function aplicarNoLugar(e, cmd) {
  const v = validar(e, cmd)
  if (!v.ok) return v
  executar(e, v.normal)
  return { ok: true }
}

/** Cópia profunda rápida. `simular: true` corta o registro (eventos e comandos) para os robôs. */
export function clonar(e, { simular = false } = {}) {
  const bonecos = {}
  for (const k in e.bonecos) bonecos[k] = { ...e.bonecos[k] }
  const times = {}
  for (const k in e.times) {
    const t = e.times[k]
    times[k] = { ...t, mao: t.mao.slice(), baralho: t.baralho.slice(), descarte: t.descarte.slice(), fiapos: t.fiapos.slice(), lugares: t.lugares.slice() }
  }
  return {
    ...e, bonecos, times, fim: e.fim ? { ...e.fim, pct: { ...e.fim.pct } } : null,
    cartas: e.cartas, // não muda durante a luta: pode ser compartilhado
    eventos: simular ? [] : e.eventos.map((x) => ({ ...x })),
    comandos: simular ? [] : e.comandos.map((x) => ({ ...x })),
    registro: simular ? false : e.registro,
    simulado: simular || !!e.simulado,
  }
}

/** Aplica um comando sem mexer no estado recebido. */
export function aplicar(e, cmd) {
  const v = validar(e, cmd)
  if (!v.ok) return v
  const novo = clonar(e)
  novo.cartas = JSON.parse(JSON.stringify(e.cartas))
  const n = novo.eventos.length
  executar(novo, v.normal)
  return { ok: true, estado: novo, eventos: novo.eventos.slice(n) }
}

/** Todos os comandos que a vez atual pode mandar agora (o último é sempre 'passar'). */
export function comandosValidos(e) {
  if (!e || e.fim) return []
  const t = e.vez, time = e.times[t], lista = []
  const vistas = new Set()
  for (const cid of time.mao) {
    const inst = e.cartas[cid], usuario = de(e, inst.dono)
    if (!dePe(usuario)) { lista.push({ tipo: 'fiapo', time: t, carta: cid }); continue }
    const chave = inst.carta + '|' + inst.dono
    if (vistas.has(chave)) continue // cópia igual na mão: mesmo efeito
    vistas.add(chave)
    const def = CARTAS[inst.carta]
    if (usuario.estado === 'fio' && def.parte !== 'pernas') continue
    if (time.linha < def.linha || !condicaoOk(usuario, def)) continue
    for (const alvo of alvosDaCarta(e, usuario, def)) lista.push({ tipo: 'jogar', time: t, carta: cid, alvo })
  }
  if (time.linha >= REGRAS.custoDaTroca) {
    const l = time.lugares
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
      if (dePe(de(e, l[i])) || dePe(de(e, l[j]))) lista.push({ tipo: 'trocar', time: t, a: l[i], b: l[j] })
    }
  }
  lista.push({ tipo: 'passar', time: t })
  return lista
}

/** null enquanto a luta corre; depois { vencedor: 'A'|'B', motivo: 'derrubou'|'tesoura'|'desempate', turno, pct }. */
export function resultado(e) {
  return e && e.fim ? { ...e.fim, pct: { ...e.fim.pct } } : null
}

/** O que a tela de um time pode ver: sem a mão do rival, sem a ordem dos baralhos e sem o estado do sorteio. */
export function visaoDoTime(e, t) {
  const v = clonar(e)
  delete v.rng
  delete v.simulado
  for (const k of ['A', 'B']) {
    const time = v.times[k]
    time.baralho = time.baralho.length
    if (k !== t) time.mao = time.mao.length
  }
  const visiveis = new Set([...e.times[t].mao, ...e.times.A.descarte, ...e.times.B.descarte, ...e.times.A.fiapos, ...e.times.B.fiapos])
  for (const ev of e.eventos) if (ev.carta && (ev.t === 'carta' || ev.t === 'fiapo')) visiveis.add(ev.carta)
  v.cartas = Object.fromEntries(Object.entries(e.cartas).map(([cid, c]) => [cid, visiveis.has(cid) ? { ...c } : { dono: c.dono }]))
  v.eventos = v.eventos.map((ev) => (ev.t === 'compra' && ev.time !== t ? { turno: ev.turno, t: 'compra', time: ev.time } : ev))
  return v
}

/** Refaz a luta inteira a partir da semente e dos comandos. */
export function reproduzir({ semente, timeA, timeB, comandos = [] }) {
  const e = criarLuta({ semente, timeA, timeB })
  for (let i = 0; i < comandos.length; i++) {
    const r = aplicarNoLugar(e, comandos[i])
    if (!r.ok) return { ok: false, indice: i, codigo: r.codigo, motivo: r.motivo, estado: e }
  }
  return { ok: true, estado: e, resultado: resultado(e) }
}
