// Frayz — regras do servidor: conta, coleção, luta e costura. Tudo o que é sorteado usa semente do SERVIDOR (node:crypto).
// As regras do jogo em si estão em shared/ (motor, robôs, costura); aqui só se guarda, confere dono e chama o motor.
// Nada de moeda, prêmio, pote ou saque aqui.
import { createHash, randomBytes, randomInt } from 'node:crypto'
import { comandosValidos, criarLuta, resultado as resultadoDaLuta, aplicarNoLugar, visaoDoTime, VERSAO_DO_MOTOR } from '../shared/batalha.js'
import { jogarTurno, ROBOS } from '../shared/robos.js'
import {
  PARAMS_COSTURA, PARTES_DO_BONECO, aposentar, chancesDaCostura, costurar, custoDaCostura, gerarBonecoInicial,
  nivelDeRemendo, paraLuta, podeAposentar, podeCosturar, registrarLuta,
} from '../shared/costura.js'
import { BONECOS_PRONTOS } from '../shared/config.js'
import { transacao } from './db.mjs'

/** O jogador é sempre o time A; o robô, o B. */
export const EU = 'A'
export const RIVAL = 'B'

// ASSUMPTION (PROVISÓRIO; não há chave em shared/config.js ainda): fases da Aventura = nível do robô rival.
// O time rival é sorteado pelo servidor entre os bonecos prontos. Intenção visível ainda não existe.
export const FASES_DA_AVENTURA = [
  { robo: 'ganancioso' },
  { robo: 'ganancioso' },
  { robo: 'planejador' },
  { robo: 'planejador' },
  { robo: 'planejador' },
]

export class ErroDoJogo extends Error {
  constructor(status, codigo, motivo, extra) {
    super(motivo)
    this.status = status
    this.codigo = codigo
    this.motivo = motivo
    this.extra = extra
  }
}
const erro = (status, codigo, motivo, extra) => new ErroDoJogo(status, codigo, motivo, extra)

export const hashDoToken = (token) => createHash('sha256').update(token).digest('hex')
const novoId = (prefixo) => `${prefixo}_${randomBytes(12).toString('hex')}`
const novaSemente = () => randomBytes(16).toString('hex')
const json = (x) => JSON.stringify(x)

/** Embaralha e pega n itens com crypto (sem repetir). */
function sortearDiferentes(lista, n) {
  const a = lista.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a.slice(0, n)
}

export function criarJogo(db, { agora = Date.now, tempoDoTurnoMs = 20_000, folgaDoRelogioMs = 1_500 } = {}) {
  const q = {
    contaPorHash: db.prepare('SELECT id, apelido FROM contas WHERE token_hash = ?'),
    novaConta: db.prepare('INSERT INTO contas (apelido, token_hash, criada_em) VALUES (?, ?, ?)'),
    conta: db.prepare('SELECT id, apelido FROM contas WHERE id = ?'),
    boneco: db.prepare('SELECT * FROM bonecos WHERE id = ? AND conta_id = ?'),
    bonecosDaConta: db.prepare('SELECT * FROM bonecos WHERE conta_id = ? ORDER BY criado_em, rowid'),
    novoBoneco: db.prepare('INSERT INTO bonecos (id, conta_id, dados, estado, ocupado_por, versao, criado_em) VALUES (?, ?, ?, ?, NULL, 0, ?)'),
    salvarBoneco: db.prepare('UPDATE bonecos SET dados = ?, estado = ?, versao = versao + 1 WHERE id = ? AND conta_id = ? AND versao = ?'),
    ocupar: db.prepare("UPDATE bonecos SET ocupado_por = ?, versao = versao + 1 WHERE id = ? AND conta_id = ? AND ocupado_por IS NULL AND estado = 'ativo'"),
    liberar: db.prepare('UPDATE bonecos SET ocupado_por = NULL, versao = versao + 1 WHERE ocupado_por = ? AND conta_id = ?'),
    evento: db.prepare('INSERT INTO eventos_bonecos (boneco_id, conta_id, tipo, dados, em) VALUES (?, ?, ?, ?, ?)'),
    eventos: db.prepare('SELECT tipo, dados, em FROM eventos_bonecos WHERE boneco_id = ? AND conta_id = ? ORDER BY id'),
    lutaAberta: db.prepare("SELECT * FROM lutas WHERE conta_id = ? AND status = 'aberta'"),
    luta: db.prepare('SELECT * FROM lutas WHERE id = ? AND conta_id = ?'),
    novaLuta: db.prepare(`INSERT INTO lutas (id, conta_id, modo, fase, robo, semente, time_a, time_b, bonecos_a, estado, seq, prazo, status, criada_em)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'aberta', ?)`),
    salvarLuta: db.prepare("UPDATE lutas SET estado = ?, seq = ?, prazo = ? WHERE id = ? AND seq = ? AND status = 'aberta'"),
    encerrarLuta: db.prepare("UPDATE lutas SET estado = ?, seq = ?, prazo = NULL, status = 'encerrada', resultado = ?, encerrada_em = ? WHERE id = ? AND seq = ? AND status = 'aberta'"),
    resposta: db.prepare('SELECT comando, resposta FROM luta_respostas WHERE luta_id = ? AND seq = ?'),
    novaResposta: db.prepare('INSERT INTO luta_respostas (luta_id, seq, comando, resposta) VALUES (?, ?, ?, ?)'),
    pedido: db.prepare('SELECT rota, corpo, status, resposta FROM pedidos WHERE conta_id = ? AND chave = ?'),
    novoPedido: db.prepare('INSERT INTO pedidos (conta_id, chave, rota, corpo, status, resposta, em) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  }

  // ---------------------------------------------------------------- bonecos

  function lerBoneco(linha) {
    const b = JSON.parse(linha.dados)
    b.id = linha.id
    b.estado = linha.estado
    b.ocupado = linha.ocupado_por !== null
    return b
  }

  function bonecoDaConta(contaId, id) {
    const linha = typeof id === 'string' ? q.boneco.get(id, contaId) : undefined
    if (!linha) throw erro(404, 'BONECO_NAO_ENCONTRADO', 'Boneco não encontrado na sua coleção.')
    return { linha, b: lerBoneco(linha) }
  }

  function gravarBoneco(contaId, linha, b) {
    const dados = { ...b }
    delete dados.id; delete dados.estado; delete dados.ocupado
    const r = q.salvarBoneco.run(json(dados), b.estado, linha.id, contaId, linha.versao)
    if (r.changes !== 1) throw erro(409, 'CONCORRENCIA', 'Esse boneco mudou agora há pouco. Tente de novo.')
  }

  function inserirBoneco(contaId, b, quando) {
    const dados = { ...b }
    delete dados.id; delete dados.estado; delete dados.ocupado
    q.novoBoneco.run(b.id, contaId, json(dados), b.estado ?? 'ativo', quando)
  }

  const evento = (bonecoId, contaId, tipo, dados) => q.evento.run(bonecoId, contaId, tipo, json(dados), agora())

  /** O que o DONO vê do boneco (dele): genes completos, Carretel, desgaste. */
  function bonecoParaTela(b) {
    return {
      id: b.id,
      nome: b.nome ?? null,
      pronto: b.pronto ?? null,
      partes: b.partes,
      voltasUsadas: b.voltasUsadas ?? 0,
      carretel: PARAMS_COSTURA.carretelVoltas,
      pontosDeCostura: b.pontosDeCostura ?? 0,
      limiteDeCostura: PARAMS_COSTURA.desgaste.limite,
      nivelDeRemendo: nivelDeRemendo(b),
      podeAposentar: podeAposentar(b),
      pais: b.pais ?? [],
      geracao: b.geracao ?? 0,
      estado: b.estado,
      ocupado: !!b.ocupado,
      lutas: b.lutas ?? 0,
      vitorias: b.vitorias ?? 0,
      maiorGolpe: b.maiorGolpe ?? 0,
      casulo: b.casulo ?? null,
    }
  }

  // ---------------------------------------------------------------- conta

  /** Conta nova com os 9 bonecos de teste (face = pronto; forro sorteado com semente do servidor). Devolve o token (só agora). */
  function criarConta(apelido) {
    const token = randomBytes(32).toString('base64url')
    const quando = agora()
    return transacao(db, () => {
      const contaId = Number(q.novaConta.run(apelido, hashDoToken(token), quando).lastInsertRowid)
      for (const pronto of Object.keys(BONECOS_PRONTOS)) {
        const semente = novaSemente()
        const b = gerarBonecoInicial(semente, { id: novoId('bo') })
        for (const p of PARTES_DO_BONECO) b.partes[p].face = BONECOS_PRONTOS[pronto].partes[p]
        b.pronto = pronto
        inserirBoneco(contaId, b, quando)
        evento(b.id, contaId, 'nasceu', { origem: 'inicial', pronto, semente })
      }
      return { conta: { id: contaId, apelido }, token }
    })
  }

  function contaPorToken(token) {
    return q.contaPorHash.get(hashDoToken(token)) ?? null
  }

  function estado(contaId) {
    const aberta = q.lutaAberta.get(contaId)
    if (aberta) vencerPrazo(aberta)
    const conta = q.conta.get(contaId)
    const bonecos = q.bonecosDaConta.all(contaId).map((l) => bonecoParaTela(lerBoneco(l)))
    const ainda = q.lutaAberta.get(contaId)
    return { conta: { id: conta.id, apelido: conta.apelido }, bonecos, lutaAberta: ainda ? ainda.id : null }
  }

  function boneco(contaId, id) {
    const { b } = bonecoDaConta(contaId, id)
    const historico = q.eventos.all(b.id, contaId).map((e) => {
      const d = JSON.parse(e.dados)
      delete d.semente // a semente do nascimento fica só no banco
      return { tipo: e.tipo, em: e.em, ...d }
    })
    return { boneco: bonecoParaTela(b), historico }
  }

  // ---------------------------------------------------------------- luta

  /** Visão do jogador: a do motor, sem a semente (o motor deixa a semente no estado). */
  function visao(e) {
    const v = visaoDoTime(e, EU)
    delete v.semente
    delete v.rng
    return v
  }

  function respostaDaLuta(linha, e, desde) {
    const v = visao(e)
    const r = {
      id: linha.id,
      modo: linha.modo,
      fase: linha.fase,
      robo: linha.robo,
      voce: EU,
      status: e.fim ? 'encerrada' : 'aberta',
      seq: linha.seq,
      visao: v,
      eventos: v.eventos.slice(desde),
      validos: !e.fim && e.vez === EU ? comandosValidos(e) : [],
      resultado: e.fim ? resultadoDaLuta(e) : null,
      prazo: e.fim ? null : linha.prazo,
      agora: agora(),
    }
    return r
  }

  /** Joga a vez do robô (se for a dele). */
  function vezDoRobo(e, robo) {
    if (!e.fim && e.vez === RIVAL) jogarTurno(e, robo)
  }

  /** Grava a luta encerrada: resultado, liberar bonecos, registrarLuta e livro-razão. Dentro de transação. */
  function encerrar(linha, e, novoSeq) {
    const res = resultadoDaLuta(e)
    const r = q.encerrarLuta.run(json(e), novoSeq, json(res), agora(), linha.id, linha.seq)
    if (r.changes !== 1) throw erro(409, 'CONCORRENCIA', 'A luta mudou agora há pouco. Tente de novo.')
    q.liberar.run(linha.id, linha.conta_id)
    const ids = JSON.parse(linha.bonecos_a)
    ids.forEach((id, i) => {
      const lugar = `${EU}${i}`
      let maior = 0
      for (const ev of e.eventos) if (ev.t === 'dano' && ev.de === lugar && !ev.refletido) maior = Math.max(maior, ev.valor)
      const linhaB = q.boneco.get(id, linha.conta_id)
      if (!linhaB) return
      const venceu = res.vencedor === EU
      try {
        gravarBoneco(linha.conta_id, linhaB, registrarLuta(lerBoneco(linhaB), { venceu, maiorGolpe: maior }))
      } catch (x) {
        if (x instanceof ErroDoJogo) throw x // concorrência: desfaz tudo
        // boneco não pode mais registrar luta (não deveria acontecer): só o evento fica
      }
      evento(id, linha.conta_id, 'lutou', { luta: linha.id, modo: linha.modo, venceu, maiorGolpe: maior })
    })
  }

  /** Grava o estado depois de uma mudança (ou encerra). Devolve a linha atualizada. */
  function salvar(linha, e, novoSeq) {
    if (e.fim) {
      encerrar(linha, e, novoSeq)
      return { ...linha, seq: novoSeq, prazo: null, status: 'encerrada' }
    }
    const prazo = e.vez === EU ? (linha.prazo ?? agora() + tempoDoTurnoMs) : null
    const r = q.salvarLuta.run(json(e), novoSeq, prazo, linha.id, linha.seq)
    if (r.changes !== 1) throw erro(409, 'CONCORRENCIA', 'A luta mudou agora há pouco. Tente de novo.')
    return { ...linha, seq: novoSeq, prazo }
  }

  /**
   * Relógio do turno: se o prazo do jogador estourou, passa a vez por ele (fica no replay como 'passar'), o robô joga,
   * e o prazo seguinte conta a partir do fim do anterior. Repete até alcançar a hora atual ou a luta acabar.
   * Devolve { linha, e, desde } atualizados.
   */
  function vencerPrazo(linha) {
    const e = JSON.parse(linha.estado)
    const desde = e.eventos.length
    if (linha.status !== 'aberta' || e.fim || linha.prazo === null) return { linha, e, desde }
    let prazo = linha.prazo, mudou = false
    while (!e.fim && e.vez === EU && agora() > prazo + folgaDoRelogioMs) {
      aplicarNoLugar(e, { tipo: 'passar', time: EU })
      vezDoRobo(e, linha.robo)
      prazo += tempoDoTurnoMs
      mudou = true
    }
    if (!mudou) return { linha, e, desde }
    const nova = transacao(db, () => salvar({ ...linha, prazo }, e, linha.seq))
    return { linha: nova, e, desde }
  }

  function lutaDaConta(contaId, id) {
    const linha = typeof id === 'string' ? q.luta.get(id, contaId) : undefined
    if (!linha) throw erro(404, 'LUTA_NAO_ENCONTRADA', 'Luta não encontrada.')
    return linha
  }

  /** Nova luta. times do rival e semente são do servidor; o time do jogador é conferido (dono, vivo, livre). */
  function novaLuta(contaId, { modo, fase, time, robo }) {
    const aberta = q.lutaAberta.get(contaId)
    if (aberta) {
      const { linha } = vencerPrazo(aberta)
      if (linha.status === 'aberta') throw erro(409, 'LUTA_ABERTA', 'Você já tem uma luta aberta.', { lutaAberta: linha.id })
    }
    if (new Set(time).size !== 3) throw erro(400, 'TIME_INVALIDO', 'Escolha 3 bonecos diferentes.')
    const defs = time.map((id) => {
      const { b } = bonecoDaConta(contaId, id)
      if (b.estado === 'aposentado') throw erro(409, 'BONECO_APOSENTADO', 'Boneco aposentado não luta.')
      if (b.ocupado) throw erro(409, 'BONECO_OCUPADO', 'Esse boneco está ocupado.')
      try { return paraLuta(b) } catch (x) { throw erro(409, 'BONECO_NAO_PODE_LUTAR', x.message) }
    })
    let roboDaLuta = robo ?? 'planejador'
    if (modo === 'aventura') {
      const f = FASES_DA_AVENTURA[fase - 1]
      if (!f) throw erro(400, 'FASE_INVALIDA', 'Essa fase não existe.')
      roboDaLuta = f.robo
    } else if (!ROBOS.includes(roboDaLuta)) throw erro(400, 'ROBO_INVALIDO', 'Robô desconhecido.')
    const timeB = sortearDiferentes(Object.keys(BONECOS_PRONTOS), 3)
    const semente = novaSemente()
    const id = novoId('lu')
    const e = criarLuta({ semente, timeA: defs, timeB })
    vezDoRobo(e, roboDaLuta)
    const quando = agora()
    const linha = {
      id, conta_id: contaId, modo, fase: modo === 'aventura' ? fase : null, robo: roboDaLuta, semente,
      time_a: json(defs), time_b: json(timeB), bonecos_a: json(time), seq: 0,
      prazo: e.fim ? null : quando + tempoDoTurnoMs, status: 'aberta',
    }
    transacao(db, () => {
      try {
        q.novaLuta.run(id, contaId, linha.modo, linha.fase, roboDaLuta, semente, linha.time_a, linha.time_b, linha.bonecos_a, json(e), linha.prazo, quando)
      } catch (x) {
        if (/UNIQUE/i.test(String(x.message))) throw erro(409, 'LUTA_ABERTA', 'Você já tem uma luta aberta.')
        throw x
      }
      for (const bid of time) {
        if (q.ocupar.run(id, bid, contaId).changes !== 1) throw erro(409, 'BONECO_OCUPADO', 'Esse boneco está ocupado.')
      }
      if (e.fim) encerrar(linha, e, 0)
    })
    return respostaDaLuta(linha, e, 0)
  }

  function verLuta(contaId, id) {
    const { linha, e, desde } = vencerPrazo(lutaDaConta(contaId, id))
    return respostaDaLuta(linha, e, desde)
  }

  /**
   * Um comando do jogador. seq = quantos comandos do jogador já foram aceitos nesta luta.
   * seq igual → aplica; seq menor e mesmo comando → devolve a resposta guardada (não aplica de novo); senão recusa.
   */
  function comando(contaId, id, seq, cmd) {
    const original = lutaDaConta(contaId, id)
    const chave = json({ tipo: cmd.tipo, carta: cmd.carta ?? null, alvo: cmd.alvo ?? null, a: cmd.a ?? null, b: cmd.b ?? null })
    if (seq < original.seq) {
      const guardada = q.resposta.get(original.id, seq)
      if (guardada && guardada.comando === chave) return { ...JSON.parse(guardada.resposta), repetido: true }
      throw erro(409, 'SEQ_JA_USADA', 'Esse número de comando já foi usado com outro comando.', { seq: original.seq })
    }
    if (seq > original.seq) throw erro(409, 'SEQ_INVALIDA', 'Número de comando fora de ordem.', { seq: original.seq })
    if (original.status !== 'aberta') throw erro(409, 'LUTA_ACABOU', 'A luta já acabou.')
    if (cmd.time !== undefined && cmd.time !== EU) throw erro(409, 'FORA_DO_TURNO', 'Você só manda comandos do seu time.')

    const { linha, e, desde } = vencerPrazo(original)
    if (linha.status !== 'aberta' || e.fim) throw erro(409, 'LUTA_ACABOU', 'A luta acabou (o tempo do turno estourou).', { luta: respostaDaLuta(linha, e, desde) })
    if (linha.prazo !== original.prazo) throw erro(409, 'TEMPO_ESGOTADO', 'O tempo do turno acabou e a vez passou.', { luta: respostaDaLuta(linha, e, desde) })

    const turnoAntes = e.turno
    const r = aplicarNoLugar(e, { ...cmd, time: EU })
    if (!r.ok) throw erro(422, r.codigo, r.motivo)
    vezDoRobo(e, linha.robo)
    const novoSeq = linha.seq + 1
    let resp
    transacao(db, () => {
      const turnoNovo = e.turno !== turnoAntes // a vez passou (e o robô já jogou): o relógio recomeça
      const salva = salvar({ ...linha, prazo: turnoNovo ? null : linha.prazo }, e, novoSeq)
      resp = respostaDaLuta(salva, e, desde)
      q.novaResposta.run(linha.id, linha.seq, chave, json(resp))
    })
    return resp
  }

  /** Desistir: o robô vence. Grava como luta encerrada. */
  function desistir(contaId, id) {
    const { linha, e } = vencerPrazo(lutaDaConta(contaId, id))
    if (linha.status !== 'aberta' || e.fim) throw erro(409, 'LUTA_ACABOU', 'A luta já acabou.')
    e.fim = { vencedor: RIVAL, motivo: 'desistiu', turno: e.turno, pct: { A: 0, B: 0 } }
    e.eventos.push({ turno: e.turno, t: 'fim', ...e.fim })
    const desde = e.eventos.length - 1
    transacao(db, () => encerrar(linha, e, linha.seq))
    return respostaDaLuta({ ...linha, prazo: null }, e, desde)
  }

  /** Replay: só da luta ENCERRADA e só do dono. Aí a semente pode sair. */
  function replay(contaId, id) {
    const { linha, e } = vencerPrazo(lutaDaConta(contaId, id))
    if (linha.status !== 'encerrada') throw erro(409, 'LUTA_ABERTA', 'O replay só sai depois que a luta acaba.')
    return {
      id: linha.id, versaoDoMotor: VERSAO_DO_MOTOR, modo: linha.modo, fase: linha.fase, robo: linha.robo,
      semente: linha.semente, timeA: JSON.parse(linha.time_a), timeB: JSON.parse(linha.time_b),
      comandos: e.comandos, resultado: resultadoDaLuta(e) ?? JSON.parse(linha.resultado),
      desistiu: e.fim?.motivo === 'desistiu',
    }
  }

  // ---------------------------------------------------------------- costura e aposentadoria

  function chances(contaId, a, b) {
    if (a === b) throw erro(400, 'MESMO_BONECO', 'Escolha dois bonecos diferentes.')
    const A = bonecoDaConta(contaId, a).b, B = bonecoDaConta(contaId, b).b
    const pode = podeCosturar(A, B)
    return { chances: chancesDaCostura(A, B), custo: custoDaCostura(A, B), pode }
  }

  /** Idempotência por chave de pedido (mesmo pedido = mesma resposta, sem fazer de novo). */
  function comPedido(contaId, chave, rota, corpo, fazer) {
    const corpoJson = json(corpo)
    const ja = q.pedido.get(contaId, chave)
    if (ja) {
      if (ja.rota !== rota || ja.corpo !== corpoJson) throw erro(409, 'PEDIDO_JA_USADO', 'Essa chave de pedido já foi usada para outra coisa.')
      return { status: 200, corpo: { ...JSON.parse(ja.resposta), repetido: true } }
    }
    return transacao(db, () => {
      const r = fazer()
      q.novoPedido.run(contaId, chave, rota, corpoJson, r.status, json(r.corpo), agora())
      return r
    })
  }

  function costurarPar(contaId, { a, b, pedido }) {
    return comPedido(contaId, pedido, 'costura', { a, b }, () => {
      if (a === b) throw erro(400, 'MESMO_BONECO', 'Escolha dois bonecos diferentes.')
      const A = bonecoDaConta(contaId, a), B = bonecoDaConta(contaId, b)
      const semente = novaSemente()
      const r = costurar({ semente, paiA: A.b, paiB: B.b, idFilho: novoId('bo') })
      if (!r.ok) throw erro(409, r.codigo, r.motivo)
      gravarBoneco(contaId, A.linha, r.pais[0])
      gravarBoneco(contaId, B.linha, r.pais[1])
      r.filho.estado = 'ativo'
      inserirBoneco(contaId, r.filho, agora())
      evento(r.filho.id, contaId, 'nasceu', { origem: 'costura', pais: [a, b], semente })
      evento(a, contaId, 'costurou', { com: b, filho: r.filho.id })
      evento(b, contaId, 'costurou', { com: a, filho: r.filho.id })
      const filho = bonecoParaTela({ ...r.filho, ocupado: false })
      return { status: 201, corpo: { filho, pais: r.pais.map((p) => bonecoParaTela({ ...p, ocupado: false })), custo: r.custo, sorteios: r.sorteios } }
    })
  }

  function aposentarBoneco(contaId, id) {
    return transacao(db, () => {
      const { linha, b } = bonecoDaConta(contaId, id)
      const r = aposentar(b)
      if (!r.ok) throw erro(409, r.codigo, r.motivo)
      gravarBoneco(contaId, linha, r.boneco)
      evento(id, contaId, 'aposentou', { retalhos: r.retalhos })
      return { boneco: bonecoParaTela({ ...r.boneco, ocupado: false }), retalhos: r.retalhos, mural: r.mural }
    })
  }

  return {
    criarConta, contaPorToken, estado, boneco, novaLuta, verLuta, comando, desistir, replay,
    chances, costurarPar, aposentarBoneco,
  }
}
