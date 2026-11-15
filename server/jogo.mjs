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
import { chaveDoApelido } from './apelido.mjs'

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

/** Motivo gravado na luta aberta com motor de versão anterior, encerrada sem vencedor ao atualizar o servidor. */
export const CANCELADA_POR_ATUALIZACAO = 'cancelada_por_atualizacao'

/** Cursor opaco da lista de bonecos (posição n na coleção). */
const cursorDe = (n) => Buffer.from(`n:${n}`).toString('base64url')
function posicaoDoCursor(cursor) {
  if (!cursor) return 0
  const m = /^n:([0-9]{1,15})$/.exec(Buffer.from(cursor, 'base64url').toString('utf8'))
  if (!m) throw erro(400, 'CURSOR_INVALIDO', 'Cursor inválido.')
  return Number(m[1])
}

/**
 * opcoes: agora (relógio), tempoDoTurnoMs, folgaDoRelogioMs, maxBonecosPorConta, paginaDeBonecos, validadeDaSessaoH,
 * renovarSessaoMs, abandonoMin, soLeitura (função: SAVE_SO_LEITURA ligado → GET não grava nada).
 */
export function criarJogo(db, {
  agora = Date.now, tempoDoTurnoMs = 20_000, folgaDoRelogioMs = 1_500, maxBonecosPorConta = 60, paginaDeBonecos = 50,
  validadeDaSessaoH = 720, renovarSessaoMs = 60_000, abandonoMin = 30, soLeitura = () => false,
} = {}) {
  const validadeMs = validadeDaSessaoH * 3_600_000
  const abandonoMs = abandonoMin * 60_000
  const q = {
    sessao: db.prepare('SELECT s.usada_em, c.id, c.apelido FROM sessoes s JOIN contas c ON c.id = s.conta_id WHERE s.token_hash = ?'),
    novaSessao: db.prepare('INSERT INTO sessoes (token_hash, conta_id, criada_em, usada_em) VALUES (?, ?, ?, ?)'),
    renovarSessao: db.prepare('UPDATE sessoes SET usada_em = ? WHERE token_hash = ?'),
    apagarSessao: db.prepare('DELETE FROM sessoes WHERE token_hash = ?'),
    novaConta: db.prepare('INSERT INTO contas (apelido, apelido_norm, token_hash, criada_em) VALUES (?, ?, ?, ?)'),
    apelidoUsado: db.prepare('SELECT 1 FROM contas WHERE apelido_norm = ?'),
    conta: db.prepare('SELECT id, apelido, fase_liberada FROM contas WHERE id = ?'),
    liberarFase: db.prepare('UPDATE contas SET fase_liberada = MAX(fase_liberada, ?) WHERE id = ?'),
    boneco: db.prepare('SELECT * FROM bonecos WHERE id = ? AND conta_id = ?'),
    paginaDeBonecos: db.prepare('SELECT * FROM bonecos WHERE conta_id = ? AND n > ? ORDER BY n LIMIT ?'),
    contagem: db.prepare("SELECT COUNT(*) total, COALESCE(SUM(estado = 'ativo'), 0) vivos FROM bonecos WHERE conta_id = ?"),
    vivos: db.prepare("SELECT COUNT(*) n FROM bonecos WHERE conta_id = ? AND estado = 'ativo'"),
    novoBoneco: db.prepare(`INSERT INTO bonecos (id, conta_id, dados, estado, ocupado_por, versao, criado_em, n)
                            VALUES (?, ?, ?, ?, NULL, 0, ?, (SELECT COALESCE(MAX(n), 0) + 1 FROM bonecos WHERE conta_id = ?))`),
    salvarBoneco: db.prepare('UPDATE bonecos SET dados = ?, estado = ?, versao = versao + 1 WHERE id = ? AND conta_id = ? AND versao = ?'),
    ocupar: db.prepare("UPDATE bonecos SET ocupado_por = ?, versao = versao + 1 WHERE id = ? AND conta_id = ? AND ocupado_por IS NULL AND estado = 'ativo'"),
    liberar: db.prepare('UPDATE bonecos SET ocupado_por = NULL, versao = versao + 1 WHERE ocupado_por = ? AND conta_id = ?'),
    evento: db.prepare('INSERT INTO eventos_bonecos (boneco_id, conta_id, tipo, dados, em) VALUES (?, ?, ?, ?, ?)'),
    eventos: db.prepare('SELECT tipo, dados, em FROM eventos_bonecos WHERE boneco_id = ? AND conta_id = ? ORDER BY id'),
    lutaAberta: db.prepare("SELECT * FROM lutas WHERE conta_id = ? AND status = 'aberta'"),
    luta: db.prepare('SELECT * FROM lutas WHERE id = ? AND conta_id = ?'),
    novaLuta: db.prepare(`INSERT INTO lutas (id, conta_id, modo, fase, robo, semente, time_a, time_b, bonecos_a, estado, seq, prazo, status, criada_em, versao_motor, tocada_em)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'aberta', ?, ?, ?)`),
    salvarLuta: db.prepare("UPDATE lutas SET estado = ?, seq = ?, prazo = ?, ultimo_comando = COALESCE(?, ultimo_comando) WHERE id = ? AND seq = ? AND status = 'aberta'"),
    encerrarLuta: db.prepare("UPDATE lutas SET estado = ?, seq = ?, prazo = NULL, status = 'encerrada', resultado = ?, encerrada_em = ?, ultimo_comando = COALESCE(?, ultimo_comando) WHERE id = ? AND seq = ? AND status = 'aberta'"),
    cancelarLuta: db.prepare("UPDATE lutas SET prazo = NULL, status = 'encerrada', resultado = ?, encerrada_em = ? WHERE id = ? AND status = 'aberta'"),
    tocarLuta: db.prepare("UPDATE lutas SET tocada_em = ? WHERE id = ? AND status = 'aberta'"),
    resposta: db.prepare('SELECT comando, resposta FROM luta_respostas WHERE luta_id = ? AND seq = ?'),
    novaResposta: db.prepare('INSERT INTO luta_respostas (luta_id, seq, comando, resposta) VALUES (?, ?, ?, ?)'),
    apagarRespostas: db.prepare('DELETE FROM luta_respostas WHERE luta_id = ?'),
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
    q.novoBoneco.run(b.id, contaId, json(dados), b.estado ?? 'ativo', quando, contaId)
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
    const norma = chaveDoApelido(apelido)
    return transacao(db, () => {
      if (q.apelidoUsado.get(norma)) throw erro(409, 'APELIDO_EM_USO', 'Esse apelido já tem dono. Escolha outro.')
      // contas.token_hash (coluna da v1, única) não vale mais para entrar: o token vive em `sessoes`
      const contaId = Number(q.novaConta.run(apelido, norma, `sessao:${randomBytes(16).toString('hex')}`, quando).lastInsertRowid)
      q.novaSessao.run(hashDoToken(token), contaId, quando, quando)
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

  /**
   * Conta dona do token, ou null (token desconhecido ou que saiu). Sessão parada há mais que a validade: 401 SESSAO_VENCIDA.
   * Cada uso renova a validade (gravando no máximo uma vez por renovarSessaoMs; nada com SAVE_SO_LEITURA).
   */
  function contaPorToken(token) {
    const h = hashDoToken(token)
    const s = q.sessao.get(h)
    if (!s) return null
    const t = agora()
    if (t - s.usada_em > validadeMs) throw erro(401, 'SESSAO_VENCIDA', 'Sua sessão venceu. Entre de novo.')
    if (t - s.usada_em >= renovarSessaoMs && !soLeitura()) q.renovarSessao.run(t, h)
    return { id: s.id, apelido: s.apelido }
  }

  /** Sair: o token deixa de valer. */
  function sair(token) {
    q.apagarSessao.run(hashDoToken(token))
  }

  /** Uma página da coleção, em ordem de chegada (estável). cursor: opaco, da página anterior. */
  function bonecos(contaId, { cursor = '', limite = paginaDeBonecos } = {}) {
    const n = Math.min(Math.max(1, limite), paginaDeBonecos)
    const linhas = q.paginaDeBonecos.all(contaId, posicaoDoCursor(cursor), n + 1)
    const mais = linhas.length > n
    const pagina = linhas.slice(0, n)
    return { bonecos: pagina.map((l) => bonecoParaTela(lerBoneco(l))), proximo: mais ? cursorDe(pagina.at(-1).n) : null }
  }

  /** Estado da conta: resumo da coleção + a PRIMEIRA página de bonecos (o resto por /api/bonecos?cursor=). */
  function estado(contaId) {
    const aberta = q.lutaAberta.get(contaId)
    if (aberta) vencerPrazo(aberta)
    const conta = q.conta.get(contaId)
    const { total, vivos } = q.contagem.get(contaId)
    const pagina = bonecos(contaId)
    const ainda = q.lutaAberta.get(contaId)
    return {
      conta: { id: conta.id, apelido: conta.apelido },
      faseLiberada: conta.fase_liberada,
      colecao: { total, vivos, aposentados: total - vivos, maxVivos: maxBonecosPorConta },
      bonecos: pagina.bonecos,
      proximo: pagina.proximo,
      lutaAberta: ainda ? ainda.id : null,
    }
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

  /** Luta gravada com motor de outra versão: o motor de hoje não lê aquele estado. Só o resumo. */
  const deOutroMotor = (linha) => linha.versao_motor !== VERSAO_DO_MOTOR

  function respostaDaLuta(linha, e, desde, quando = agora()) {
    if (deOutroMotor(linha)) {
      return {
        id: linha.id, modo: linha.modo, fase: linha.fase, robo: linha.robo, voce: EU, status: linha.status, seq: linha.seq,
        versaoDoMotor: linha.versao_motor, visao: null, eventos: [], validos: [],
        resultado: linha.resultado ? JSON.parse(linha.resultado) : null, prazo: null, agora: quando,
      }
    }
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
      agora: quando,
    }
    return r
  }

  /** Joga a vez do robô (se for a dele). */
  function vezDoRobo(e, robo) {
    if (!e.fim && e.vez === RIVAL) jogarTurno(e, robo)
  }

  /**
   * Grava a luta encerrada: resultado, liberar bonecos, registrarLuta e livro-razão; apaga os resumos de comando
   * (o replay fica: semente, times, comandos, resultado, versão do motor); vitória na Aventura libera a fase seguinte.
   * Dentro de transação.
   */
  function encerrar(linha, e, novoSeq, ultimo = null) {
    const res = resultadoDaLuta(e)
    const r = q.encerrarLuta.run(json(e), novoSeq, json(res), agora(), ultimo, linha.id, linha.seq)
    if (r.changes !== 1) throw erro(409, 'CONCORRENCIA', 'A luta mudou agora há pouco. Tente de novo.')
    q.liberar.run(linha.id, linha.conta_id)
    q.apagarRespostas.run(linha.id)
    if (linha.modo === 'aventura' && res.vencedor === EU) q.liberarFase.run(Math.min(linha.fase + 1, FASES_DA_AVENTURA.length), linha.conta_id)
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

  /** Grava o estado depois de uma mudança (ou encerra). ultimo: resumo do último comando do jogador (ou null). Devolve a linha atualizada. */
  function salvar(linha, e, novoSeq, ultimo = null) {
    if (e.fim) {
      encerrar(linha, e, novoSeq, ultimo)
      return { ...linha, seq: novoSeq, prazo: null, status: 'encerrada', ultimo_comando: ultimo ?? linha.ultimo_comando }
    }
    const prazo = e.vez === EU ? (linha.prazo ?? agora() + tempoDoTurnoMs) : null
    const r = q.salvarLuta.run(json(e), novoSeq, prazo, ultimo, linha.id, linha.seq)
    if (r.changes !== 1) throw erro(409, 'CONCORRENCIA', 'A luta mudou agora há pouco. Tente de novo.')
    return { ...linha, seq: novoSeq, prazo }
  }

  /**
   * Relógio do turno: se o prazo do jogador estourou, passa a vez por ele (fica no replay como 'passar'), o robô joga,
   * e o prazo seguinte conta a partir do fim do anterior. Repete até alcançar a hora atual ou a luta acabar.
   * Devolve { linha, e, desde } atualizados.
   */
  function vencerPrazo(linha) {
    if (deOutroMotor(linha)) return { linha, e: null, desde: 0 }
    const e = JSON.parse(linha.estado)
    const desde = e.eventos.length
    if (linha.status !== 'aberta' || e.fim || linha.prazo === null || soLeitura()) return { linha, e, desde }
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

  /** O dono mexeu nesta luta agora (conta para o abandono). */
  function tocar(linha) {
    if (linha.status === 'aberta' && !soLeitura()) q.tocarLuta.run(agora(), linha.id)
  }

  /** Luta aberta de motor antigo: encerrada sem vencedor e sem desgaste; bonecos livres. */
  function cancelarPorAtualizacao(linha) {
    transacao(db, () => {
      const res = { vencedor: null, motivo: CANCELADA_POR_ATUALIZACAO, versaoDoMotor: linha.versao_motor }
      if (q.cancelarLuta.run(json(res), agora(), linha.id).changes !== 1) return
      q.liberar.run(linha.id, linha.conta_id)
      q.apagarRespostas.run(linha.id)
    })
  }

  /** Derrota por abandono (o rival vence), como desistir; conta como luta para o desgaste. */
  function abandonar(linha) {
    const e = JSON.parse(linha.estado)
    if (e.fim) return
    e.fim = { vencedor: RIVAL, motivo: 'abandono', turno: e.turno, pct: { A: 0, B: 0 } }
    e.eventos.push({ turno: e.turno, t: 'fim', ...e.fim })
    transacao(db, () => encerrar(linha, e, linha.seq))
  }

  /**
   * Chamado a cada pedido autenticado da conta (sem tarefa em segundo plano): luta aberta de motor antigo é cancelada;
   * luta aberta sem pedido do dono há mais de abandonoMin vira derrota por abandono. Nada com SAVE_SO_LEITURA.
   */
  function aoPedido(contaId) {
    if (soLeitura()) return
    const aberta = q.lutaAberta.get(contaId)
    if (!aberta) return
    if (deOutroMotor(aberta)) return cancelarPorAtualizacao(aberta)
    if (agora() - (aberta.tocada_em ?? aberta.criada_em) > abandonoMs) abandonar(aberta)
  }

  /** Nova luta. times do rival e semente são do servidor; o time do jogador é conferido (dono, vivo, livre). */
  function novaLuta(contaId, { modo, fase, time, robo }) {
    aoPedido(contaId)
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
      const liberada = q.conta.get(contaId).fase_liberada
      if (fase > liberada) throw erro(409, 'FASE_BLOQUEADA', `Vença a fase ${liberada} para abrir a próxima.`, { faseLiberada: liberada })
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
      prazo: e.fim ? null : quando + tempoDoTurnoMs, status: 'aberta', versao_motor: VERSAO_DO_MOTOR, tocada_em: quando,
    }
    transacao(db, () => {
      try {
        q.novaLuta.run(id, contaId, linha.modo, linha.fase, roboDaLuta, semente, linha.time_a, linha.time_b, linha.bonecos_a, json(e), linha.prazo, quando, VERSAO_DO_MOTOR, quando)
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
    const antes = lutaDaConta(contaId, id)
    tocar(antes)
    const { linha, e, desde } = vencerPrazo(antes)
    return respostaDaLuta(linha, e, desde)
  }

  /**
   * Um comando do jogador. seq = quantos comandos do jogador já foram aceitos nesta luta.
   * seq igual → aplica; seq menor e mesmo comando → devolve a resposta guardada (não aplica de novo); senão recusa.
   */
  function comando(contaId, id, seq, cmd) {
    const original = lutaDaConta(contaId, id)
    const chave = json({ tipo: cmd.tipo, carta: cmd.carta ?? null, alvo: cmd.alvo ?? null, a: cmd.a ?? null, b: cmd.b ?? null })
    const hash = createHash('sha256').update(chave).digest('hex')
    if (seq < original.seq) return repetir(original, seq, chave, hash)
    if (seq > original.seq) throw erro(409, 'SEQ_INVALIDA', 'Número de comando fora de ordem.', { seq: original.seq })
    if (original.status !== 'aberta' || deOutroMotor(original)) throw erro(409, 'LUTA_ACABOU', 'A luta já acabou.')
    if (cmd.time !== undefined && cmd.time !== EU) throw erro(409, 'FORA_DO_TURNO', 'Você só manda comandos do seu time.')

    tocar(original)
    const { linha, e, desde } = vencerPrazo(original)
    if (linha.status !== 'aberta' || e.fim) throw erro(409, 'LUTA_ACABOU', 'A luta acabou (o tempo do turno estourou).', { luta: respostaDaLuta(linha, e, desde) })
    if (linha.prazo !== original.prazo) throw erro(409, 'TEMPO_ESGOTADO', 'O tempo do turno acabou e a vez passou.', { luta: respostaDaLuta(linha, e, desde) })

    const turnoAntes = e.turno
    const r = aplicarNoLugar(e, { ...cmd, time: EU })
    if (!r.ok) throw erro(422, r.codigo, r.motivo)
    vezDoRobo(e, linha.robo)
    const novoSeq = linha.seq + 1
    const quando = agora()
    // A4: por comando só o necessário para a idempotência (hash do comando + de onde a resposta começa); a resposta
    // inteira se remonta do estado da luta. Os resumos somem quando a luta encerra; o último fica na própria luta.
    const resumo = json({ desde, n: e.eventos.length, agora: quando })
    const ultimo = json({ seq: linha.seq, h: hash, desde, agora: quando })
    let resp
    transacao(db, () => {
      q.novaResposta.run(linha.id, linha.seq, hash, resumo)
      const turnoNovo = e.turno !== turnoAntes // a vez passou (e o robô já jogou): o relógio recomeça
      const salva = salvar({ ...linha, prazo: turnoNovo ? null : linha.prazo }, e, novoSeq, ultimo)
      resp = respostaDaLuta(salva, e, desde, quando)
    })
    return resp
  }

  /**
   * Comando repetido (mesmo seq e mesmo comando): não aplica de novo; remonta a resposta do estado gravado.
   * Se nada mudou desde então (o caso do último comando), a resposta é idêntica à primeira. Luta encerrada: só o
   * último comando se repete (devolve o fim); outro seq → 409 LUTA_ACABOU.
   */
  function repetir(linha, seq, chave, hash) {
    if (linha.status !== 'aberta') {
      const u = linha.ultimo_comando ? JSON.parse(linha.ultimo_comando) : null
      if (u && u.seq === seq && u.h === hash && !deOutroMotor(linha)) {
        return { ...respostaDaLuta(linha, JSON.parse(linha.estado), u.desde, u.agora), repetido: true }
      }
      throw erro(409, 'LUTA_ACABOU', 'A luta já acabou.')
    }
    const guardada = q.resposta.get(linha.id, seq)
    if (!guardada || (guardada.comando !== hash && guardada.comando !== chave)) {
      throw erro(409, 'SEQ_JA_USADA', 'Esse número de comando já foi usado com outro comando.', { seq: linha.seq })
    }
    const g = JSON.parse(guardada.resposta)
    if (g.visao) return { ...g, repetido: true } // formato antigo (banco da v1): a resposta inteira
    const e = JSON.parse(linha.estado)
    const igual = e.eventos.length === g.n
    return { ...respostaDaLuta(linha, e, g.desde, igual ? g.agora : agora()), repetido: true }
  }

  /** Desistir: o robô vence. Grava como luta encerrada. */
  function desistir(contaId, id) {
    const { linha, e } = vencerPrazo(lutaDaConta(contaId, id))
    if (linha.status !== 'aberta' || !e || e.fim) throw erro(409, 'LUTA_ACABOU', 'A luta já acabou.')
    e.fim = { vencedor: RIVAL, motivo: 'desistiu', turno: e.turno, pct: { A: 0, B: 0 } }
    e.eventos.push({ turno: e.turno, t: 'fim', ...e.fim })
    const desde = e.eventos.length - 1
    transacao(db, () => encerrar(linha, e, linha.seq))
    return respostaDaLuta({ ...linha, prazo: null }, e, desde)
  }

  /** Replay: só da luta ENCERRADA e só do dono. Aí a semente pode sair. */
  function replay(contaId, id) {
    const { linha } = vencerPrazo(lutaDaConta(contaId, id))
    if (linha.status !== 'encerrada') throw erro(409, 'LUTA_ABERTA', 'O replay só sai depois que a luta acaba.')
    // estado lido como JSON, sem o motor: a luta pode ser de outra versão do motor (a do nascimento vai no replay)
    const e = JSON.parse(linha.estado)
    const res = linha.resultado ? JSON.parse(linha.resultado) : null
    return {
      id: linha.id, versaoDoMotor: linha.versao_motor, modo: linha.modo, fase: linha.fase, robo: linha.robo,
      semente: linha.semente, timeA: JSON.parse(linha.time_a), timeB: JSON.parse(linha.time_b),
      comandos: e.comandos ?? [], resultado: res,
      desistiu: res?.motivo === 'desistiu',
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
      // A3: teto de bonecos vivos por conta. Encaixe da economia (custo da costura/energia) fica para a decisão do dono.
      if (q.vivos.get(contaId).n >= maxBonecosPorConta) {
        throw erro(409, 'COLECAO_CHEIA', `Sua coleção está cheia (${maxBonecosPorConta} bonecos). Aposente algum para costurar.`, { maxVivos: maxBonecosPorConta })
      }
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
    criarConta, contaPorToken, sair, aoPedido, estado, bonecos, boneco, novaLuta, verLuta, comando, desistir, replay,
    chances, costurarPar, aposentarBoneco,
  }
}
