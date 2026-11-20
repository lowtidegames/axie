// Keepmile — regras do servidor do jogo de reino (sem dinheiro, sem token: beta de ranking por título e enfeite).
// O servidor sorteia a semente (e nunca a manda enquanto a partida vale), aplica cada comando com o motor de
// shared/reino/, grava o resultado que ELE calculou e refaz a partida ao terminar (reproduzir) antes de contar.
// Números de economia só de shared/reino/config.js (BETA); aqui só limites técnicos do servidor (PARAMS_REINO).
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { aplicar as aplicarDoMotor, criarPartida, opcoes, reproduzir as reproduzirDoMotor, resultado as resultadoDoMotor, visao as visaoDoMotor } from '../../shared/reino/partida.js'
import { ALBUM, BETA, CARTAS, FAMILIAS, PARTIDA } from '../../shared/reino/config.js'
import { transacao } from '../db.mjs'
import { ErroDoJogo } from '../jogo.mjs'
import { chaveDoApelido } from '../apelido.mjs'
import { apelidoBarrado } from './apelidos-barrados.mjs'
import { PARAMS_SERVIDOR, criarLimitesNoBanco, criarLimite } from '../api.mjs'

// Limites técnicos do servidor do Keepmile — PROVISÓRIOS (não são números de economia).
export const PARAMS_REINO = {
  prazoParadaMin: 180, // partida sem comando por mais que isto termina por tempo (conta como terminada)
  partidasPorConta: { max: 30, janelaMs: 60 * 60 * 1000 }, // aberturas de partida por conta
  partidasPorIp: { max: 120, janelaMs: 60 * 60 * 1000 }, // aberturas de partida por IP (IPv6: /64)
  replaysPorConta: { max: 30, janelaMs: 60 * 1000 }, // replays pedidos por conta
  replaysPorIp: { max: 120, janelaMs: 60 * 1000 }, // replays pedidos por IP (IPv6: /64), somando todas as contas (K1)
  replayPassosPorPagina: 100, // passos por resposta do replay; partida maior vem em páginas (?desde=) (K1)
  replayCacheBytes: 32 * 1024 * 1024, // replays montados guardados na memória (partida terminada não muda) (K1)
  fechoPorPedido: 20, // partidas terminadas por pedido no fecho da temporada; o resto fica para os pedidos seguintes (K3)
  paginaDoRanking: 50,
  placarDoDia: 10, // linhas do placar da estrada do dia
  topoComReplay: 10, // replay de partida alheia só de quem está até esta posição (temporada ou estrada de dia passado)
  treinosGuardados: 100, // partidas de treino terminadas guardadas por conta (as 5 melhores ficam sempre)
  melhoresNoPerfil: 5,
  tempoMaxGuardadoMs: 2 ** 31 - 1, // tempo de um comando acima disso fica com este valor
  apelido: { min: 3, max: 16 }, // troca de apelido no Keepmile (R22): só [A-Za-z0-9 _-]
  apelidoTrocaMs: 24 * 60 * 60 * 1000, // 1 troca de apelido por conta neste tempo (R22)
  apelidoPorConta: { max: 10, janelaMs: 60 * 60 * 1000 }, // tentativas de troca de apelido por conta (contam as recusadas)
  apelidoPorIp: { max: 30, janelaMs: 60 * 60 * 1000 }, // tentativas de troca de apelido por IP (IPv6: /64), somando as contas
}

export const MODOS = ['ranking', 'treino', 'estrada']

/** As 12 conquistas (ids; nome e texto ficam na tela). Só título e enfeite. */
export const CONQUISTAS = ['supper', 'road', 'plate', 'last', 'house', 'brass', 'family', 'penny', 'double', 'mole', 'pudding', 'librarian']
const CHEFE_CONQUISTA = { gutbucket: 'road', niptuck: 'double', moleworth: 'mole', gobble: 'pudding' }

const DIA_MS = 86_400_000
export const diaUtc = (t) => Math.floor(t / DIA_MS)
/** Temporada N começa na segunda-feira 00:00 UTC (dia 4 da era é a 1ª segunda, 05/01/1970). */
export const temporadaDoDia = (dia) => Math.floor((dia - 4) / BETA.temporadaDias)
export const inicioDaTemporada = (n) => (4 + n * BETA.temporadaDias) * DIA_MS

const erro = (status, codigo, motivo, extra) => new ErroDoJogo(status, codigo, motivo, extra)
const json = (x) => JSON.stringify(x)
const novoId = () => `pa_${randomBytes(12).toString('hex')}`

/** Rodadas vencidas somadas que liberam a carta de índice i de ALBUM.ordem (docs/reino/biblia.md, seção 9). */
export function limiarDoAlbum(i) {
  return i <= ALBUM.quantasNoMeio
    ? ALBUM.primeira + ALBUM.depoisCada * i
    : ALBUM.primeira + ALBUM.depoisCada * ALBUM.quantasNoMeio + ALBUM.fimCada * (i - ALBUM.quantasNoMeio)
}
export function cartasPorRodadas(rodadas) {
  let n = 0
  while (n < ALBUM.ordem.length && limiarDoAlbum(n) <= rodadas) n++
  return n
}
export const liberadasPorRodadas = (rodadas) => [...ALBUM.inicial, ...ALBUM.ordem.slice(0, cartasPorRodadas(rodadas))]

/** Liga pela média (faixa fixa) e posição (os primeiros viram a lenda). */
export function ligaDe(media, posicao) {
  if (posicao !== null && posicao <= BETA.lenda.primeiros && media > 0) return BETA.lenda.id
  let liga = BETA.ligas[0].id
  for (const l of BETA.ligas) if (media >= l.min) liga = l.id
  return liga
}
const mediaDe = (soma) => Math.floor(soma / BETA.melhoresQueContam)

/** Comando que vem da tela → forma única (só campos conhecidos). O motor confere o resto. */
export function comandoLimpo(c) {
  const k = { tipo: c.tipo }
  if (c.carta !== undefined) k.carta = c.carta
  if (c.terreno !== undefined) k.terreno = c.terreno
  if (c.indice !== undefined) k.indice = c.indice
  return k
}

/** Eventos da batalha (arrays compactos) → { quedas, vivos } dos soldados. */
function contarSoldados(eventos) {
  const soldados = new Set(), vivos = new Set()
  let quedas = 0
  for (const x of eventos ?? []) {
    if (x[1] === 'n' && x[3] === 0) { soldados.add(x[2]); vivos.add(x[2]) } else if (x[1] === 'c' && vivos.has(x[2])) { vivos.delete(x[2]); quedas++ } else if (x[1] === 'r' && soldados.has(x[2])) vivos.add(x[2])
  }
  return { quedas, vivos: vivos.size }
}

/**
 * opcoes: agora, soLeitura (função), log, segredo (texto; padrão: REINO_SEGREDO ou o guardado no banco),
 * params (sobrepõe PARAMS_REINO; só testes), energia (sobrepõe BETA.energia; só testes).
 */
export function criarReino(db, {
  agora = Date.now, soLeitura = () => false, log = console.log, segredo, params = {}, energia: energiaOpc,
  validadeDaSessaoH = PARAMS_SERVIDOR.validadeDaSessaoH, // a MESMA que vence a sessão (server/index.mjs passa a do servidor); só para o Perfil
} = {}) {
  // Prazo da conta no Perfil (R33): sessão sem uso por tanto tempo vence e a conta se perde. Dias inteiros, arredondados para baixo.
  const diasSemUsoAtePerder = Math.floor(validadeDaSessaoH / 24)
  const P = { ...PARAMS_REINO, ...params }
  const E = { ...BETA.energia, ...energiaOpc }
  const prazoMs = P.prazoParadaMin * 60_000

  // segredo da estrada do dia: o de teste, ou REINO_SEGREDO (32+ letras), ou o sorteado na migração v5 (com aviso: ele
  // vai junto nas cópias do banco). Variável curta nunca é usada em silêncio (K5). O valor nunca vai ao log.
  function escolherSegredo() {
    if (segredo) return segredo
    const env = process.env.REINO_SEGREDO
    if (env && env.length >= 32) return env
    if (env) log(`AVISO: REINO_SEGREDO curta demais (${env.length} letras; precisa de 32 ou mais): recusada. A estrada do dia usa o segredo guardado no banco, que vai junto nas cópias do banco.`)
    else log('AVISO: REINO_SEGREDO não definida: a estrada do dia usa o segredo guardado no banco, que vai junto nas cópias do banco. Defina REINO_SEGREDO (32+ letras) antes do lançamento.')
    return db.prepare("SELECT valor FROM meta WHERE chave = 'reino_segredo'").get()?.valor
  }
  const segredoDaEstrada = escolherSegredo()
  if (!segredoDaEstrada) throw new Error('Sem segredo da estrada do dia (banco sem a migração v5?).')

  // o motor contado: refazer partida é o que custa CPU; o teste confere que repetição e replay guardado não chamam (K1)
  const contagem = { aplicar: 0, reproduzir: 0 }
  const aplicar = (e, cmd) => { contagem.aplicar++; return aplicarDoMotor(e, cmd) }
  const reproduzir = (x) => { contagem.reproduzir++; return reproduzirDoMotor(x) }

  const q = {
    conta: db.prepare('SELECT * FROM reino_contas WHERE conta_id = ?'),
    novaConta: db.prepare('INSERT OR IGNORE INTO reino_contas (conta_id, energia_saldo, energia_dia, criada_em) VALUES (?, ?, ?, ?)'),
    energia: db.prepare('UPDATE reino_contas SET energia_saldo = ?, energia_dia = ? WHERE conta_id = ?'),
    rodadas: db.prepare('UPDATE reino_contas SET rodadas_vencidas = rodadas_vencidas + ? WHERE conta_id = ?'),
    conquistas: db.prepare('UPDATE reino_contas SET conquistas = ?, conquistas_quando = ? WHERE conta_id = ?'),
    fimDaConta: db.prepare('UPDATE reino_contas SET partidas = partidas + 1, recorde = MAX(recorde, ?) WHERE conta_id = ?'),
    apelido: db.prepare('SELECT apelido FROM contas WHERE id = ?'),
    partida: db.prepare('SELECT * FROM reino_partidas WHERE id = ?'),
    aberta: db.prepare("SELECT * FROM reino_partidas WHERE conta_id = ? AND modo = ? AND status = 'aberta'"),
    abertas: db.prepare("SELECT * FROM reino_partidas WHERE conta_id = ? AND status = 'aberta' ORDER BY tocada_em DESC"),
    estradaDoDia: db.prepare("SELECT id, status FROM reino_partidas WHERE conta_id = ? AND modo = 'estrada' AND dia = ?"),
    nova: db.prepare(`INSERT INTO reino_partidas (id, conta_id, modo, dia, temporada, semente, liberadas, estado, status, criada_em, tocada_em)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aberta', ?, ?)`),
    salvar: db.prepare("UPDATE reino_partidas SET estado = ?, comandos = ?, tempos = ?, novidades = ?, seq = ?, tocada_em = ? WHERE id = ? AND seq = ? AND status = 'aberta'"),
    guardarResposta: db.prepare('UPDATE reino_partidas SET resposta = ? WHERE id = ?'),
    contaCriada: db.prepare('SELECT criada_em FROM contas WHERE id = ?'),
    // R20: mesmo corte do placarDoDia — ranking terminado ANTES do fim do dia da estrada (2º parâmetro)
    temRanking: db.prepare("SELECT 1 FROM reino_partidas WHERE conta_id = ? AND modo = 'ranking' AND status = 'terminada' AND conferida = 1 AND terminada_em < ? LIMIT 1"),
    terminar: db.prepare(`UPDATE reino_partidas SET status = 'terminada', estado = NULL, motivo = ?, pontos = ?, vencidas = ?, rodada = ?,
                          conferida = ?, terminada_em = ? WHERE id = ? AND status = 'aberta'`),
    paradas: db.prepare("SELECT * FROM reino_partidas WHERE conta_id = ? AND status = 'aberta' AND tocada_em < ?"),
    melhoresDaTemporada: db.prepare(`SELECT pontos, terminada_em FROM reino_partidas WHERE conta_id = ? AND temporada = ? AND modo = 'ranking'
                                     AND status = 'terminada' AND conferida = 1 ORDER BY pontos DESC, terminada_em ASC LIMIT ?`),
    pontuacao: db.prepare(`INSERT INTO reino_pontuacao (temporada, conta_id, soma, partidas, quando) VALUES (?, ?, ?, ?, ?)
                           ON CONFLICT (temporada, conta_id) DO UPDATE SET soma = excluded.soma, partidas = excluded.partidas, quando = excluded.quando`),
    minhaPontuacao: db.prepare('SELECT soma, partidas, quando FROM reino_pontuacao WHERE temporada = ? AND conta_id = ?'),
    posicao: db.prepare(`SELECT COUNT(*) n FROM reino_pontuacao WHERE temporada = ? AND (soma > ? OR (soma = ? AND (quando < ? OR (quando = ? AND conta_id < ?))))`),
    pagina: db.prepare(`SELECT p.conta_id, p.soma, p.partidas, p.quando, c.apelido FROM reino_pontuacao p JOIN contas c ON c.id = p.conta_id
                        WHERE p.temporada = ? AND (p.soma < ? OR (p.soma = ? AND (p.quando > ? OR (p.quando = ? AND p.conta_id > ?))))
                        ORDER BY p.soma DESC, p.quando ASC, p.conta_id ASC LIMIT ?`),
    todosDaTemporada: db.prepare('SELECT conta_id, soma FROM reino_pontuacao WHERE temporada = ? ORDER BY soma DESC, quando ASC, conta_id ASC'),
    temporadaFechada: db.prepare('SELECT numero, fechada_em, contas FROM reino_temporadas WHERE numero = ?'),
    // só as temporadas depois da última fechada (fecham em ordem): a consulta não cresce com o histórico
    temporadasPorFechar: db.prepare(`SELECT DISTINCT temporada FROM reino_partidas WHERE modo = 'ranking' AND temporada < ?
                                     AND temporada > COALESCE((SELECT MAX(numero) FROM reino_temporadas), -1) ORDER BY temporada`),
    abertasDaTemporada: db.prepare("SELECT * FROM reino_partidas WHERE temporada = ? AND modo = 'ranking' AND status = 'aberta' ORDER BY rowid LIMIT ?"),
    fecharTemporada: db.prepare('INSERT INTO reino_temporadas (numero, fechada_em, contas) VALUES (?, ?, ?)'),
    titulo: db.prepare('INSERT INTO reino_titulos (temporada, conta_id, posicao, media, liga) VALUES (?, ?, ?, ?, ?)'),
    titulos: db.prepare('SELECT temporada, posicao, media, liga FROM reino_titulos WHERE conta_id = ? ORDER BY temporada DESC'),
    // placar do dia (K2): só conta criada antes das 00:00 UTC do dia (2º parâmetro) e com 1 ranking terminado e conferido
    // ANTES do fim do dia (3º parâmetro, R19: ranking terminado depois não põe a conta para trás no placar daquele dia)
    placarDoDia: db.prepare(`SELECT p.id, p.conta_id, p.pontos, p.vencidas, c.apelido FROM reino_partidas p JOIN contas c ON c.id = p.conta_id
                             WHERE p.modo = 'estrada' AND p.dia = ? AND p.status = 'terminada' AND p.conferida = 1 AND c.criada_em < ?
                             AND EXISTS (SELECT 1 FROM reino_partidas r WHERE r.conta_id = p.conta_id AND r.modo = 'ranking' AND r.status = 'terminada' AND r.conferida = 1
                             AND r.terminada_em < ?)
                             ORDER BY p.pontos DESC, p.terminada_em ASC, p.conta_id ASC LIMIT ?`),
    minhaEstrada: db.prepare("SELECT pontos, terminada_em, status, conferida FROM reino_partidas WHERE conta_id = ? AND modo = 'estrada' AND dia = ?"),
    posicaoNaEstrada: db.prepare(`SELECT COUNT(*) n FROM reino_partidas p JOIN contas c ON c.id = p.conta_id
                                  WHERE p.modo = 'estrada' AND p.dia = ? AND p.status = 'terminada' AND p.conferida = 1 AND c.criada_em < ?
                                  AND EXISTS (SELECT 1 FROM reino_partidas r WHERE r.conta_id = p.conta_id AND r.modo = 'ranking' AND r.status = 'terminada' AND r.conferida = 1
                             AND r.terminada_em < ?)
                                  AND (p.pontos > ? OR (p.pontos = ? AND (p.terminada_em < ? OR (p.terminada_em = ? AND p.conta_id < ?))))`),
    melhores: db.prepare(`SELECT id, modo, dia, temporada, pontos, vencidas, rodada, terminada_em FROM reino_partidas
                          WHERE conta_id = ? AND status = 'terminada' AND conferida = 1 ORDER BY pontos DESC, terminada_em ASC LIMIT ?`),
    maisRodadas: db.prepare("SELECT MAX(vencidas) n FROM reino_partidas WHERE conta_id = ? AND status = 'terminada' AND conferida = 1"),
    treinosAlemDoTeto: db.prepare(`SELECT id FROM reino_partidas WHERE conta_id = ? AND modo = 'treino' AND status = 'terminada'
                                   AND id NOT IN (SELECT id FROM reino_partidas WHERE conta_id = ? AND status = 'terminada' ORDER BY pontos DESC, terminada_em ASC LIMIT ?)
                                   ORDER BY terminada_em DESC, rowid DESC LIMIT -1 OFFSET ?`),
    apagar: db.prepare("DELETE FROM reino_partidas WHERE id = ? AND status = 'terminada'"),
    // R22: a melhor partida da temporada da conta (a mesma ordem de melhoresDaTemporada) e a última terminada
    melhorDaTemporada: db.prepare(`SELECT id FROM reino_partidas WHERE conta_id = ? AND temporada = ? AND modo = 'ranking'
                                   AND status = 'terminada' AND conferida = 1 ORDER BY pontos DESC, terminada_em ASC LIMIT 1`),
    ultima: db.prepare("SELECT * FROM reino_partidas WHERE conta_id = ? AND status = 'terminada' ORDER BY terminada_em DESC, rowid DESC LIMIT 1"),
    ultimaDoModo: db.prepare("SELECT * FROM reino_partidas WHERE conta_id = ? AND modo = ? AND status = 'terminada' ORDER BY terminada_em DESC, rowid DESC LIMIT 1"),
    apelidoDeOutro: db.prepare('SELECT 1 FROM contas WHERE apelido_norm = ? AND id <> ?'),
    trocarApelido: db.prepare('UPDATE contas SET apelido = ?, apelido_norm = ? WHERE id = ?'),
    apelidoTrocado: db.prepare('UPDATE reino_contas SET apelido_trocado_em = ? WHERE conta_id = ? AND (apelido_trocado_em IS NULL OR apelido_trocado_em <= ?)'),
  }

  // limites de abertura de partida e de replay, guardados no banco (sobrevivem a reinício); com SAVE_SO_LEITURA, em memória
  const janelas = {
    rpc: P.partidasPorConta.janelaMs, rpi: P.partidasPorIp.janelaMs, rrc: P.replaysPorConta.janelaMs, rri: P.replaysPorIp.janelaMs,
    rac: P.apelidoPorConta.janelaMs, rai: P.apelidoPorIp.janelaMs,
  }
  const noBanco = criarLimitesNoBanco(db, agora, { intervaloMs: 60_000, lote: 2000, janelas, idadeMaxMs: Infinity })
  const mem = {
    rpc: criarLimite(P.partidasPorConta, agora), rpi: criarLimite(P.partidasPorIp, agora),
    rrc: criarLimite(P.replaysPorConta, agora), rri: criarLimite(P.replaysPorIp, agora),
    rac: criarLimite(P.apelidoPorConta, agora), rai: criarLimite(P.apelidoPorIp, agora),
  }
  const cabe = (tipo, chave, cfg) => (soLeitura() ? mem[tipo](`${tipo}:${chave}`) : noBanco(`${tipo}:${chave}`, cfg))

  // ---------------------------------------------------------------- conta e energia

  /** Linha da conta no Keepmile; sem linha, a de uma conta nova (sem gravar). */
  function contaDoReino(contaId, t = agora()) {
    return q.conta.get(contaId) ?? { conta_id: contaId, rodadas_vencidas: 0, partidas: 0, recorde: 0, energia_saldo: E.porDia, energia_dia: diaUtc(t), conquistas: '[]', conquistas_quando: '{}', apelido_trocado_em: null, nova: true }
  }
  function garantirConta(contaId) {
    q.novaConta.run(contaId, E.porDia, diaUtc(agora()), agora())
    return q.conta.get(contaId)
  }

  /**
   * Energia de ranking agora: o saldo gravado + porDia a cada virada de dia UTC desde o dia gravado, até o teto.
   * Relógio que volta (dia gravado > hoje) não dá energia (lição S3-1): só vale o saldo.
   */
  function energiaAgora(c, t = agora()) {
    const hoje = diaUtc(t)
    const dia = Number(c.energia_dia)
    const saldo = Math.min(E.teto, Math.max(0, Number(c.energia_saldo) || 0))
    const atual = hoje > dia ? Math.min(E.teto, saldo + E.porDia * Math.min(E.teto, hoje - dia)) : saldo
    const base = Math.max(hoje, Number.isSafeInteger(dia) ? Math.min(dia, hoje + 1) : hoje)
    return { atual, maximo: E.teto, porDia: E.porDia, recarregaEm: new Date((base + 1) * DIA_MS).toISOString() }
  }

  /** Gasta a energia de abrir partida de ranking. DENTRO da transação que cria a partida. */
  function gastarEnergia(contaId) {
    const c = garantirConta(contaId)
    const t = agora()
    const { atual } = energiaAgora(c, t)
    if (atual < E.porPartidaDeRanking) throw semEnergia(c)
    q.energia.run(atual - E.porPartidaDeRanking, Math.max(Number(c.energia_dia), diaUtc(t)), contaId)
  }
  const semEnergia = (c) => erro(409, 'SEM_ENERGIA', 'Sua energia de ranking acabou. Ela volta na virada do dia; treino é livre.', { energia: energiaAgora(c) })

  // ---------------------------------------------------------------- partida: leitura

  const estadoDe = (linha) => JSON.parse(linha.estado)
  const comandosDe = (linha) => JSON.parse(linha.comandos)

  /** Partida terminada refeita pelo motor (com ou sem eventos). */
  function refazer(linha) {
    return reproduzir({ semente: linha.semente, cartasLiberadas: JSON.parse(linha.liberadas), comandos: comandosDe(linha) })
  }
  /** Estado atual: o gravado (aberta) ou o refeito (terminada). */
  function estadoAtual(linha) {
    if (linha.estado) return estadoDe(linha)
    const r = refazer(linha)
    if (!r.ok) {
      log(`ERRO partida ${linha.id}: o replay não refaz (comando ${r.indice}: ${r.erro})`)
      throw erro(500, 'PARTIDA_ILEGIVEL', 'Não consegui remontar esta partida. Ela ficou guardada; avise a equipe.')
    }
    return r.estado
  }

  const resultadoGravado = (linha) => ({ motivo: linha.motivo, pontos: linha.pontos, vencidas: linha.vencidas, rodada: linha.rodada, conta: linha.conferida === 1 })

  /** O que a tela recebe de uma partida. Nunca a semente nem o estado do sorteio. */
  function resposta(linha, e, eventos = [], novidades = null) {
    const aberta = linha.status === 'aberta'
    return {
      id: linha.id,
      modo: linha.modo,
      dia: new Date(linha.dia * DIA_MS).toISOString().slice(0, 10),
      temporada: linha.temporada,
      status: aberta ? 'aberta' : 'terminada',
      seq: linha.seq,
      visao: visaoDoMotor(e),
      opcoes: aberta ? opcoes(e) : null,
      eventos,
      novidades: novidades ?? { cartaNova: null, conquistas: [] },
      resultado: aberta ? null : resultadoGravado(linha),
      prazo: aberta ? new Date(linha.tocada_em + prazoMs).toISOString() : null,
      ...(linha.modo === 'estrada' ? { foraDoPlacar: foraDoPlacar(linha.conta_id, linha.dia) } : {}),
    }
  }

  /**
   * K1/K6: a última resposta de comando, guardada na linha (sem refazer a partida). Se a partida terminou DEPOIS dela
   * (tempo, fecho da temporada, teto), sai com o status verdadeiro e o resultado gravado. null: linha de antes da v6.
   */
  function respostaGuardada(linha) {
    if (!linha.resposta) return null
    const r = JSON.parse(linha.resposta)
    if (linha.status === 'terminada' && r.status !== 'terminada') return { ...r, status: 'terminada', opcoes: null, resultado: resultadoGravado(linha), prazo: null }
    return r
  }

  /**
   * K2: a conta entra no placar da estrada do dia? Só conta criada antes das 00:00 UTC daquele dia e com 1 partida de
   * ranking terminada (e conferida) antes do fim daquele dia (R20, o mesmo corte do placar). Quem não cumpre joga, mas fica fora do placar: { codigo, motivo }; cumpre: null.
   */
  function foraDoPlacar(contaId, dia) {
    const criada = q.contaCriada.get(contaId)?.criada_em
    if (criada === undefined || criada >= dia * DIA_MS) {
      return { codigo: 'CONTA_NOVA', motivo: 'Fora do placar hoje: o placar do dia é só de conta criada antes do dia. Jogue à vontade; a partir de amanhã, com 1 partida de ranking terminada, você entra.' }
    }
    if (!q.temRanking.get(contaId, (dia + 1) * DIA_MS)) {
      return { codigo: 'SEM_RANKING', motivo: 'Fora do placar hoje: termine 1 partida de ranking para entrar no placar da estrada do dia.' }
    }
    return null
  }

  function partidaDaConta(contaId, id) {
    const linha = typeof id === 'string' ? q.partida.get(id) : undefined
    if (!linha || linha.conta_id !== contaId) throw erro(404, 'PARTIDA_NAO_ENCONTRADA', 'Partida não encontrada.')
    return linha
  }

  // ---------------------------------------------------------------- terminar

  /** Pontuação da temporada da conta = soma das melhores (até melhoresQueContam). Dentro de transação. */
  function atualizarPontuacao(contaId, temporada) {
    const melhores = q.melhoresDaTemporada.all(contaId, temporada, BETA.melhoresQueContam)
    if (!melhores.length) return
    const soma = melhores.reduce((a, m) => a + m.pontos, 0)
    const quando = Math.max(...melhores.map((m) => m.terminada_em))
    q.pontuacao.run(temporada, contaId, soma, melhores.length, quando)
  }

  /**
   * Termina a partida com o resultado calculado pelo servidor e a confere refazendo tudo pela semente (anti-trapaça).
   * Não bateu: fica gravada mas não conta (conferida = 0) e vai para o log. DENTRO de transação.
   */
  function terminar(linha, e, motivo) {
    const res = resultadoDoMotor(e)
    const r = refazer(linha)
    const bate = r.ok && r.resultado.pontos === res.pontos && r.resultado.vencidas === res.vencidas && r.resultado.rodada === res.rodada
    if (!bate) log(`ALERTA partida ${linha.id}: refeita pelo servidor não bate (${r.ok ? `${r.resultado.pontos} × ${res.pontos}` : r.erro}); não conta`)
    const quando = agora()
    if (Number(q.terminar.run(motivo, res.pontos, res.vencidas, res.rodada, bate ? 1 : 0, quando, linha.id).changes) !== 1) {
      throw erro(409, 'CONCORRENCIA', 'A partida mudou agora há pouco. Tente de novo.')
    }
    garantirConta(linha.conta_id)
    q.fimDaConta.run(bate ? res.pontos : 0, linha.conta_id)
    if (linha.modo === 'ranking' && bate) atualizarPontuacao(linha.conta_id, linha.temporada)
    if (linha.modo === 'treino') {
      for (const { id } of q.treinosAlemDoTeto.all(linha.conta_id, linha.conta_id, P.melhoresNoPerfil, P.treinosGuardados)) q.apagar.run(id)
    }
    return { ...linha, status: 'terminada', estado: null, motivo, pontos: res.pontos, vencidas: res.vencidas, rodada: res.rodada, conferida: bate ? 1 : 0, terminada_em: quando }
  }

  /** Partidas da conta paradas além do prazo terminam por tempo. Nada com SAVE_SO_LEITURA. */
  function vencerParadas(contaId) {
    if (soLeitura()) return
    for (const linha of q.paradas.all(contaId, agora() - prazoMs)) {
      transacao(db, () => {
        const atual = q.partida.get(linha.id)
        if (atual.status === 'aberta') terminar(atual, estadoDe(atual), 'tempo')
      })
    }
  }

  /**
   * Fecha as temporadas que já acabaram (com folga igual ao prazo de partida parada): termina as partidas de ranking
   * ainda abertas dela, grava a posição final e o título (liga) de cada conta. Só título e enfeite. Nada com SAVE_SO_LEITURA.
   */
  function fecharTemporadas() {
    if (soLeitura()) return
    const t = agora()
    const atual = temporadaDoDia(diaUtc(t))
    for (const { temporada } of q.temporadasPorFechar.all(atual)) {
      if (t < inicioDaTemporada(temporada + 1) + prazoMs) continue
      // K3: no máximo fechoPorPedido partidas terminadas por pedido (cada uma é refeita pelo motor); sobrou, os
      // pedidos seguintes continuam. Os títulos só saem quando não há mais nenhuma aberta (uma vez só: idempotente).
      const fechou = transacao(db, () => {
        if (q.temporadaFechada.get(temporada)) return true
        const abertas = q.abertasDaTemporada.all(temporada, P.fechoPorPedido + 1)
        for (const linha of abertas.slice(0, P.fechoPorPedido)) terminar(linha, estadoDe(linha), 'fim_da_temporada')
        if (abertas.length > P.fechoPorPedido) return false
        const lista = q.todosDaTemporada.all(temporada)
        lista.forEach((l, i) => {
          const media = mediaDe(l.soma)
          q.titulo.run(temporada, l.conta_id, i + 1, media, ligaDe(media, i + 1))
        })
        q.fecharTemporada.run(temporada, t, lista.length)
        return true
      })
      if (!fechou) return // temporadas fecham em ordem
    }
  }

  /** O que cada pedido da conta faz antes (sem tarefa em segundo plano). */
  function arrumar(contaId) {
    vencerParadas(contaId)
    fecharTemporadas()
  }

  // ---------------------------------------------------------------- abrir

  function sementeDaEstrada(dia) {
    return createHmac('sha256', segredoDaEstrada).update(`keepmile:estrada:${dia}`).digest('hex')
  }

  /** Abre a partida do modo. Ranking gasta energia na MESMA transação. Uma aberta por conta e por modo. */
  function abrir(contaId, modo, chaveIp) {
    if (!MODOS.includes(modo)) throw erro(400, 'MODO_INVALIDO', 'Modo inválido (ranking, treino ou estrada).')
    arrumar(contaId)
    const ja = q.aberta.get(contaId, modo)
    if (ja) throw erro(409, 'PARTIDA_ABERTA', 'Você já tem uma partida aberta neste modo.', { partida: ja.id })
    const t = agora()
    const dia = diaUtc(t)
    if (modo === 'estrada' && q.estradaDoDia.get(contaId, dia)) throw erro(409, 'ESTRADA_JA_JOGADA', 'Você já fez a estrada de hoje. Amanhã tem outra.')
    if (!cabe('rpc', String(contaId), P.partidasPorConta)) throw erro(429, 'MUITAS_PARTIDAS', 'Muitas partidas abertas em pouco tempo. Espere um pouco.')
    if (chaveIp && !cabe('rpi', chaveIp, P.partidasPorIp)) throw erro(429, 'MUITAS_PARTIDAS', 'Muitas partidas abertas daqui. Espere um pouco.')
    const c = contaDoReino(contaId, t)
    if (modo === 'ranking' && energiaAgora(c, t).atual < E.porPartidaDeRanking) throw semEnergia(c) // recusa rápida; a trava é na transação
    const liberadas = modo === 'estrada' ? ALBUM.inicial.slice() : liberadasPorRodadas(c.rodadas_vencidas)
    const semente = modo === 'estrada' ? sementeDaEstrada(dia) : randomBytes(16).toString('hex')
    const e = criarPartida({ semente, cartasLiberadas: liberadas })
    const id = novoId()
    const linha = {
      id, conta_id: contaId, modo, dia, temporada: temporadaDoDia(dia), semente, liberadas: json(e.liberadas), estado: json(e),
      comandos: '[]', tempos: '[]', novidades: null, seq: 0, status: 'aberta', criada_em: t, tocada_em: t,
    }
    transacao(db, () => {
      garantirConta(contaId)
      if (modo === 'ranking') gastarEnergia(contaId)
      try {
        q.nova.run(id, contaId, modo, dia, linha.temporada, semente, linha.liberadas, linha.estado, t, t)
      } catch (x) {
        if (!/UNIQUE/i.test(String(x.message))) throw x
        if (modo === 'estrada' && q.estradaDoDia.get(contaId, dia)?.status === 'terminada') throw erro(409, 'ESTRADA_JA_JOGADA', 'Você já fez a estrada de hoje. Amanhã tem outra.')
        throw erro(409, 'PARTIDA_ABERTA', 'Você já tem uma partida aberta neste modo.')
      }
    })
    return { ...resposta(linha, e), energia: energiaAgora(contaDoReino(contaId)) }
  }

  // ---------------------------------------------------------------- comando

  /** Conquistas novas e carta nova depois de um comando aplicado. Dentro de transação. */
  function novidadesDoPasso(linha, antes, depois, eventos, cmds) {
    const c = garantirConta(linha.conta_id)
    const tem = new Set(JSON.parse(c.conquistas))
    const ganhou = []
    const marcar = (id) => { if (!tem.has(id)) { tem.add(id); ganhou.push(id) } }
    let vitorias = 0
    for (const ev of eventos) {
      if (ev.tipo !== 'batalha' || !ev.vitoria) continue
      vitorias++
      marcar('supper')
      if (ev.horda?.chefe && CHEFE_CONQUISTA[ev.horda.chefe]) marcar(CHEFE_CONQUISTA[ev.horda.chefe])
      const { quedas, vivos } = contarSoldados(ev.eventos)
      if (quedas === 0) marcar('plate')
      if (vivos === 1) marcar('last')
      if (antes.rodada === 10 && !cmds.some((x) => x.tipo === 'sortear')) marcar('penny')
    }
    const t = depois.terrenos
    if (t.every(Boolean)) {
      marcar('house')
      if (new Set(t.map((x) => CARTAS[x.carta].familia)).size === 1) marcar('family')
    }
    if (t.some((x) => x && x.nivel >= PARTIDA.nivelMax)) marcar('brass')
    let cartaNova = null
    if (vitorias) {
      const antesN = cartasPorRodadas(c.rodadas_vencidas)
      const depoisN = cartasPorRodadas(c.rodadas_vencidas + vitorias)
      q.rodadas.run(vitorias, linha.conta_id)
      if (depoisN > antesN) cartaNova = ALBUM.ordem[depoisN - 1]
      if (depoisN >= ALBUM.ordem.length) marcar('librarian')
    }
    if (ganhou.length) {
      const quando = JSON.parse(c.conquistas_quando || '{}') // R22: a hora em que cada conquista foi ganha
      const t = agora()
      for (const id of ganhou) quando[id] = t
      q.conquistas.run(json([...tem]), json(quando), linha.conta_id)
    }
    return { cartaNova, conquistas: ganhou }
  }

  /**
   * Um comando da tela. seq = quantos comandos já foram aceitos nesta partida. seq igual → aplica; o ÚLTIMO seq com o
   * MESMO comando → devolve a resposta guardada (não aplica nem refaz nada); último seq com outro comando → 409
   * SEQ_JA_USADA; seq mais antigo → 409 SEQ_ANTIGA (K1: nada de refazer a partida por pedido); seq maior → 409.
   */
  function comando(contaId, { partida, seq, comando: cmdBruto }) {
    const cmd = comandoLimpo(cmdBruto)
    partidaDaConta(contaId, partida)
    arrumar(contaId) // partida parada ou temporada acabada terminam ANTES: a repetição diz o status verdadeiro (K6)
    const linha = partidaDaConta(contaId, partida)
    const antiga = () => erro(409, 'SEQ_ANTIGA', 'Esse comando é antigo: a partida já seguiu. Recarregue a partida.', { seq: linha.seq })
    if (seq < linha.seq - 1) throw antiga()
    if (seq === linha.seq - 1) {
      if (json(comandosDe(linha)[seq]) !== json(cmd)) throw erro(409, 'SEQ_JA_USADA', 'Esse número de comando já foi usado com outro comando.', { seq: linha.seq })
      const guardada = respostaGuardada(linha)
      if (!guardada) throw antiga() // partida de antes da v6 sem resposta guardada: a tela recarrega
      return { ...guardada, repetido: true }
    }
    if (seq > linha.seq) throw erro(409, 'SEQ_FORA_DE_ORDEM', 'Número de comando fora de ordem.', { seq: linha.seq })
    if (linha.status !== 'aberta') throw erro(409, 'PARTIDA_ACABOU', 'A partida já acabou.', { partida: respostaGuardada(linha) ?? resposta(linha, estadoAtual(linha)) })
    const e = estadoDe(linha)
    const r = aplicar(e, cmd)
    if (!r.ok) {
      if (r.erro === 'teto') {
        const fim = transacao(db, () => terminar(linha, e, 'teto'))
        throw erro(409, 'PARTIDA_ACABOU', 'Comandos demais nesta partida: ela terminou.', { partida: resposta(fim, e) })
      }
      throw erro(422, 'COMANDO_RECUSADO', r.motivo, { motivoDoMotor: r.erro })
    }
    const t = agora()
    const cmds = [...comandosDe(linha), cmd]
    const tempos = [...JSON.parse(linha.tempos), Math.min(P.tempoMaxGuardadoMs, Math.max(0, t - linha.tocada_em))]
    return transacao(db, () => {
      const novidades = novidadesDoPasso(linha, e, r.estado, r.eventos, cmds)
      const ok = q.salvar.run(json(r.estado), json(cmds), json(tempos), json(novidades), seq + 1, t, linha.id, seq)
      if (Number(ok.changes) !== 1) throw erro(409, 'CONCORRENCIA', 'A partida mudou agora há pouco. Tente de novo.')
      let nova = { ...linha, estado: json(r.estado), comandos: json(cmds), tempos: json(tempos), seq: seq + 1, tocada_em: t }
      if (r.estado.fase === 'fim') nova = terminar(nova, r.estado, r.estado.fim.motivo)
      const resp = resposta(nova, r.estado, r.eventos, novidades)
      q.guardarResposta.run(json(resp), linha.id) // a repetição deste seq devolve esta mesma (K1)
      return resp
    })
  }

  /** Desistir = o comando 'desistir' do motor no próximo seq (fica no replay). */
  function desistir(contaId, { partida }) {
    const linha = partidaDaConta(contaId, partida)
    if (linha.status !== 'aberta') throw erro(409, 'PARTIDA_ACABOU', 'A partida já acabou.')
    return comando(contaId, { partida, seq: linha.seq, comando: { tipo: 'desistir' } })
  }

  /** Partida aberta do modo (ou a última mexida, sem modo) e a lista dos modos com partida aberta. */
  function verAberta(contaId, modo) {
    arrumar(contaId)
    const abertas = q.abertas.all(contaId)
    const linha = modo ? abertas.find((l) => l.modo === modo) : abertas[0]
    return {
      partida: linha ? resposta(linha, estadoDe(linha)) : null,
      abertas: abertas.map((l) => ({ id: l.id, modo: l.modo })),
      energia: energiaAgora(contaDoReino(contaId)),
    }
  }

  // ---------------------------------------------------------------- ranking

  const cursorDe = (l, posicao) => Buffer.from(`${l.soma}:${l.quando}:${l.conta_id}:${posicao}`).toString('base64url')
  function lerCursor(cursor) {
    if (!cursor) return null
    const m = /^(\d{1,15}):(\d{1,15}):(\d{1,15}):(\d{1,9})$/.exec(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (!m) throw erro(400, 'CURSOR_INVALIDO', 'Cursor inválido.')
    return { soma: Number(m[1]), quando: Number(m[2]), conta: Number(m[3]), posicao: Number(m[4]) }
  }

  function posicaoNaTemporada(temporada, contaId) {
    const p = q.minhaPontuacao.get(temporada, contaId)
    if (!p) return null
    const posicao = q.posicao.get(temporada, p.soma, p.soma, p.quando, p.quando, contaId).n + 1
    const media = mediaDe(p.soma)
    const liga = ligaDe(media, posicao)
    const prox = BETA.ligas.find((l) => l.min > media)
    return { posicao, pontos: media, partidas: p.partidas, liga, faltaParaProxima: prox ? { liga: prox.id, pontos: prox.min - media } : null }
  }

  function placarDoDia(dia, contaId) {
    const lista = q.placarDoDia.all(dia, dia * DIA_MS, (dia + 1) * DIA_MS, P.placarDoDia).map((l, i) => ({ posicao: i + 1, apelido: l.apelido, pontos: l.pontos, vencidas: l.vencidas, partida: l.id }))
    const minha = q.minhaEstrada.get(contaId, dia)
    const fora = foraDoPlacar(contaId, dia)
    let voce = null
    if (minha) {
      voce = { status: minha.status, pontos: minha.pontos, posicao: null, foraDoPlacar: fora }
      if (!fora && minha.status === 'terminada' && minha.conferida === 1) {
        voce.posicao = q.posicaoNaEstrada.get(dia, dia * DIA_MS, (dia + 1) * DIA_MS, minha.pontos, minha.pontos, minha.terminada_em, minha.terminada_em, contaId).n + 1
      }
    }
    return { dia: new Date(dia * DIA_MS).toISOString().slice(0, 10), lista, voce, jogou: !!minha, foraDoPlacar: fora }
  }

  /**
   * R22: placar da estrada de ONTEM (dia passado, só leitura). O id da partida só vem quando a rota de replay deixa
   * assistir: dentro do topo do replay e, para quem ainda tem a estrada daquele dia aberta, só a própria.
   */
  function placarDeOntem(dia, contaId) {
    const aberta = q.estradaDoDia.get(contaId, dia)?.status === 'aberta'
    const lista = q.placarDoDia.all(dia, dia * DIA_MS, (dia + 1) * DIA_MS, P.placarDoDia).map((l, i) => ({
      posicao: i + 1, apelido: l.apelido, pontos: l.pontos, vencidas: l.vencidas,
      partida: l.conta_id === contaId || (!aberta && i < P.topoComReplay) ? l.id : null,
    }))
    return { dia: new Date(dia * DIA_MS).toISOString().slice(0, 10), lista }
  }

  function ranking(contaId, { cursor = '', temporada: pedida } = {}) {
    arrumar(contaId)
    const t = agora()
    const atual = temporadaDoDia(diaUtc(t))
    const temporada = pedida ?? atual
    if (temporada > atual || temporada < 0) throw erro(400, 'TEMPORADA_INVALIDA', 'Temporada inválida.')
    const c = lerCursor(cursor)
    const n = P.paginaDoRanking
    const inicio = c ? [c.soma, c.soma, c.quando, c.quando, c.conta] : [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0, 0, 0]
    const linhas = q.pagina.all(temporada, ...inicio, n + 1)
    const pagina = linhas.slice(0, n)
    // R24: a posição vem do banco (quantos estão à frente da 1ª linha), nunca do cursor — a tela pode forjar a posição
    // dentro dele e fazer conta de fora do topo aparecer como 1, 2, 3 e levar o id da partida.
    const base = c && pagina.length ? q.posicao.get(temporada, pagina[0].soma, pagina[0].soma, pagina[0].quando, pagina[0].quando, pagina[0].conta_id).n : 0
    const lista = pagina.map((l, i) => {
      const media = mediaDe(l.soma)
      const posicao = base + i + 1
      // R22: a melhor partida terminada da conta na temporada, só quando a rota de replay deixa assistir (topo ou a própria)
      const partida = posicao <= P.topoComReplay || l.conta_id === contaId ? q.melhorDaTemporada.get(l.conta_id, temporada)?.id ?? null : null
      return { posicao, apelido: l.apelido, pontos: media, partidas: l.partidas, liga: ligaDe(media, posicao), partida }
    })
    const fechada = q.temporadaFechada.get(temporada)
    return {
      temporada: {
        numero: temporada, comeca: new Date(inicioDaTemporada(temporada)).toISOString(), termina: new Date(inicioDaTemporada(temporada + 1)).toISOString(),
        fechada: !!fechada, melhoresQueContam: BETA.melhoresQueContam,
      },
      lista,
      proximo: linhas.length > n ? cursorDe(pagina.at(-1), base + n) : null,
      voce: posicaoNaTemporada(temporada, contaId),
      ligas: [...BETA.ligas.map((l) => ({ ...l })), { id: BETA.lenda.id, nome: BETA.lenda.nome, primeiros: BETA.lenda.primeiros }],
      estradaDoDia: placarDoDia(diaUtc(t), contaId),
      estradaDeOntem: placarDeOntem(diaUtc(t) - 1, contaId),
    }
  }

  // ---------------------------------------------------------------- perfil

  function perfil(contaId) {
    arrumar(contaId)
    const t = agora()
    const c = contaDoReino(contaId, t)
    const rodadas = c.rodadas_vencidas
    const n = cartasPorRodadas(rodadas)
    const proxima = n < ALBUM.ordem.length ? { carta: ALBUM.ordem[n], rodadas: limiarDoAlbum(n), faltam: limiarDoAlbum(n) - rodadas } : null
    const temporada = temporadaDoDia(diaUtc(t))
    const tem = new Set(JSON.parse(c.conquistas))
    const quando = JSON.parse(c.conquistas_quando || '{}')
    const podeEm = proximaTrocaDeApelido(c, t)
    return {
      apelido: q.apelido.get(contaId)?.apelido ?? null,
      album: { rodadasVencidas: rodadas, liberadas: liberadasPorRodadas(rodadas), total: Object.keys(CARTAS).length, proxima },
      conquistas: CONQUISTAS.map((id) => ({ id, feita: tem.has(id), quando: tem.has(id) && Number.isSafeInteger(quando[id]) ? new Date(quando[id]).toISOString() : null })),
      recordes: { pontos: c.recorde, rodadasVencidas: q.maisRodadas.get(contaId)?.n ?? 0, partidas: c.partidas },
      melhores: q.melhores.all(contaId, P.melhoresNoPerfil).map((m) => ({
        id: m.id, modo: m.modo, pontos: m.pontos, vencidas: m.vencidas, rodada: m.rodada, quando: new Date(m.terminada_em).toISOString(),
      })),
      energia: energiaAgora(c, t),
      temporada: { numero: temporada, termina: new Date(inicioDaTemporada(temporada + 1)).toISOString(), voce: posicaoNaTemporada(temporada, contaId) },
      titulos: q.titulos.all(contaId).map((x) => ({ temporada: x.temporada, posicao: x.posicao, pontos: x.media, liga: x.liga })),
      familias: Object.keys(FAMILIAS),
      trocaDeApelido: { podeEm: podeEm === null ? null : new Date(podeEm).toISOString() },
      conta: { diasSemUsoAtePerder },
    }
  }

  // ---------------------------------------------------------------- apelido (R22)

  /** Hora (ms) a partir da qual a conta pode trocar o apelido de novo; null = já pode. Relógio que volta não libera antes. */
  function proximaTrocaDeApelido(c, t = agora()) {
    const antes = c.apelido_trocado_em
    if (!Number.isSafeInteger(antes)) return null
    const pode = antes + P.apelidoTrocaMs
    return t >= pode ? null : pode
  }

  const RE_APELIDO = /^[A-Za-z0-9 _-]+$/
  /**
   * Troca o apelido da conta. Regra (nada é consertado em silêncio): min–max letras só de [A-Za-z0-9 _-], com letra ou
   * número, sem espaço nas pontas nem dois seguidos, sem palavra barrada (apelidos-barrados.mjs); único pela forma de
   * comparar do jogo (sem caixa e com as letras que se confundem juntas); 1 troca a cada apelidoTrocaMs (recusa não
   * gasta a vez). Tentativas limitadas por conta e por IP (contam as recusadas). Devolve o Perfil.
   */
  function trocarApelido(contaId, apelido, chaveIp) {
    if (!cabe('rac', String(contaId), P.apelidoPorConta)) throw erro(429, 'MUITOS_PEDIDOS', 'Muitas tentativas de trocar o apelido. Espere um pouco.')
    if (chaveIp && !cabe('rai', chaveIp, P.apelidoPorIp)) throw erro(429, 'MUITOS_PEDIDOS', 'Muitas tentativas de trocar o apelido daqui. Espere um pouco.')
    const { min, max } = P.apelido
    if (typeof apelido !== 'string' || apelido.length < min || apelido.length > max || !RE_APELIDO.test(apelido) || !/[A-Za-z0-9]/.test(apelido)
      || apelido !== apelido.trim() || apelido.includes('  ')) {
      throw erro(400, 'APELIDO_INVALIDO', `Apelido de ${min} a ${max} letras: só letras sem acento, números, espaço, traço ou _ (sem espaço no começo, no fim ou dois seguidos).`)
    }
    if (apelidoBarrado(apelido)) throw erro(400, 'APELIDO_BARRADO', 'Esse apelido não pode ser usado. Escolha outro.')
    const norma = chaveDoApelido(apelido)
    transacao(db, () => {
      const c = garantirConta(contaId)
      const t = agora()
      const podeEm = proximaTrocaDeApelido(c, t)
      if (podeEm !== null) {
        throw erro(429, 'APELIDO_TROCADO_HOJE', 'Você já trocou o apelido nas últimas 24 horas. Tente de novo mais tarde.', { podeEm: new Date(podeEm).toISOString() })
      }
      if (q.apelidoDeOutro.get(norma, contaId)) throw erro(409, 'APELIDO_EM_USO', 'Esse apelido já tem dono. Escolha outro.')
      try {
        q.trocarApelido.run(apelido, norma, contaId)
      } catch (x) {
        if (/UNIQUE/i.test(String(x.message))) throw erro(409, 'APELIDO_EM_USO', 'Esse apelido já tem dono. Escolha outro.')
        throw x
      }
      if (Number(q.apelidoTrocado.run(t, contaId, t - P.apelidoTrocaMs).changes) !== 1) throw erro(409, 'CONCORRENCIA', 'O apelido mudou agora há pouco. Tente de novo.')
    })
    return perfil(contaId)
  }

  // ---------------------------------------------------------------- última partida terminada (R22)

  /**
   * A última partida TERMINADA da conta (de um modo, ou de qualquer um), para a tela de fim sobreviver a recarregar.
   * Só da própria conta. Sai a resposta guardada do último comando (sem rodar o motor); partida sem ela (antes da v6, ou
   * terminada sem comando) é remontada: com comandos, conta no limite do replay (K1).
   */
  function ultima(contaId, modo, chaveIp = null) {
    arrumar(contaId)
    const linha = modo ? q.ultimaDoModo.get(contaId, modo) : q.ultima.get(contaId)
    if (!linha) return { partida: null }
    const guardada = respostaGuardada(linha)
    if (guardada) return { partida: guardada }
    if (linha.seq > 0) {
      if (!cabe('rrc', String(contaId), P.replaysPorConta)) throw erro(429, 'MUITOS_PEDIDOS', 'Muitos pedidos em pouco tempo. Espere um pouco.')
      if (chaveIp && !cabe('rri', chaveIp, P.replaysPorIp)) throw erro(429, 'MUITOS_PEDIDOS', 'Muitos pedidos daqui em pouco tempo. Espere um pouco.')
    }
    return { partida: resposta(linha, estadoAtual(linha)) }
  }

  // ---------------------------------------------------------------- replay

  /** A conta dona está no topo (temporada da partida de ranking ou placar do dia passado da estrada)? */
  function noTopo(linha) {
    if (linha.modo === 'ranking') {
      const p = posicaoNaTemporada(linha.temporada, linha.conta_id)
      return !!p && p.posicao <= P.topoComReplay
    }
    if (linha.modo === 'estrada') return q.placarDoDia.all(linha.dia, linha.dia * DIA_MS, (linha.dia + 1) * DIA_MS, P.topoComReplay).some((l) => l.id === linha.id)
    return false
  }

  // K1: replay montado de partida TERMINADA (não muda mais) guardado na memória, do mais usado para o menos, até
  // replayCacheBytes. Chave = id da partida (sorteado, nunca reaproveitado); a linha é sempre conferida antes.
  const replaysGuardados = new Map()
  let bytesGuardados = 0
  function replayMontado(linha) {
    const ja = replaysGuardados.get(linha.id)
    if (ja) {
      replaysGuardados.delete(linha.id)
      replaysGuardados.set(linha.id, ja)
      return ja
    }
    const cmds = comandosDe(linha)
    let e = criarPartida({ semente: linha.semente, cartasLiberadas: JSON.parse(linha.liberadas) })
    const inicio = json(visaoDoMotor(e))
    const passos = []
    for (let i = 0; i < cmds.length; i++) {
      const r = aplicar(e, cmds[i])
      if (!r.ok) {
        log(`ERRO partida ${linha.id}: o replay não refaz (comando ${i}: ${r.erro})`)
        throw erro(500, 'PARTIDA_ILEGIVEL', 'Não consegui remontar esta partida. Ela ficou guardada; avise a equipe.')
      }
      e = r.estado
      passos.push(json({ comando: cmds[i], eventos: r.eventos, visao: visaoDoMotor(e) }))
    }
    // R19: guardado já como TEXTO JSON (objetos montados ocupavam ~6,7x o tamanho do texto na memória); a página
    // pedida é lida do texto na hora. bytes = soma dos tamanhos dos textos guardados.
    const dados = { liberadas: linha.liberadas, inicio, passos }
    const bytes = dados.liberadas.length + inicio.length + passos.reduce((n, t) => n + t.length, 0)
    dados.bytes = bytes
    if (bytes <= P.replayCacheBytes) {
      replaysGuardados.set(linha.id, dados)
      bytesGuardados += bytes
      for (const [k, v] of replaysGuardados) {
        if (bytesGuardados <= P.replayCacheBytes) break
        replaysGuardados.delete(k)
        bytesGuardados -= v.bytes
      }
    }
    return dados
  }

  /**
   * Devolve comandos, eventos e a visão de cada passo de uma partida TERMINADA para a tela reproduzir, em páginas de
   * replayPassosPorPagina passos (desde = 1º passo da página; proximo = o da página seguinte ou null).
   * Própria, ou alheia do topo do ranking (ranking) ou do placar de um dia passado (estrada). A estrada de hoje não sai
   * para ninguém antes da virada do dia (nem a própria: K2). Limite por conta e por IP (K1).
   */
  function replay(contaId, id, { desde = 0 } = {}, chaveIp = null) {
    if (!cabe('rrc', String(contaId), P.replaysPorConta)) throw erro(429, 'MUITOS_PEDIDOS', 'Muitos replays em pouco tempo. Espere um pouco.')
    if (chaveIp && !cabe('rri', chaveIp, P.replaysPorIp)) throw erro(429, 'MUITOS_PEDIDOS', 'Muitos replays daqui em pouco tempo. Espere um pouco.')
    arrumar(contaId)
    const linha = typeof id === 'string' ? q.partida.get(id) : undefined
    const naoAchou = () => erro(404, 'PARTIDA_NAO_ENCONTRADA', 'Partida não encontrada.')
    if (!linha) throw naoAchou()
    const propria = linha.conta_id === contaId
    const hoje = diaUtc(agora())
    const estradaDeHoje = linha.modo === 'estrada' && linha.dia >= hoje
    if (!propria && (linha.modo === 'treino' || estradaDeHoje || linha.conferida !== 1)) throw naoAchou()
    // estrada de um dia passado: quem ainda tem a estrada DAQUELE dia aberta (abriu antes da meia-noite) não vê a dos outros
    if (!propria && linha.modo === 'estrada' && q.estradaDoDia.get(contaId, linha.dia)?.status === 'aberta') throw naoAchou()
    if (linha.status !== 'terminada') throw erro(409, 'PARTIDA_ABERTA', 'O replay só sai depois que a partida termina.')
    if (estradaDeHoje) throw erro(409, 'ESTRADA_DE_HOJE', 'O replay da estrada de hoje sai depois da virada do dia (00:00 UTC).')
    if (!propria && !noTopo(linha)) throw naoAchou()
    const total = linha.seq
    if (!Number.isSafeInteger(desde) || desde < 0 || desde > total) throw erro(400, 'CAMPO_INVALIDO', 'Campo inválido: desde.')
    const montado = replayMontado(linha)
    const ate = Math.min(total, desde + P.replayPassosPorPagina)
    const liberadas = JSON.parse(montado.liberadas)
    const inicio = JSON.parse(montado.inicio)
    const passos = montado.passos.slice(desde, ate).map((t) => JSON.parse(t))
    return {
      id: linha.id, modo: linha.modo, dia: new Date(linha.dia * DIA_MS).toISOString().slice(0, 10), temporada: linha.temporada,
      apelido: q.apelido.get(linha.conta_id)?.apelido ?? null, propria,
      cartasLiberadas: liberadas, semente: linha.semente,
      inicio, passos, totalPassos: total, desde, proximo: ate < total ? ate : null,
      resultado: resultadoGravado(linha),
    }
  }

  // só para testes e ferramentas: a semente nunca sai por rota
  const _interno = {
    sementeDaEstrada, energiaAgora: (contaId) => energiaAgora(contaDoReino(contaId)), fecharTemporadas, hash: (x) => createHash('sha256').update(x).digest('hex'),
    motor: () => ({ ...contagem }), replaysGuardados: () => ({ partidas: replaysGuardados.size, bytes: bytesGuardados }),
    replaysGuardadosValores: () => [...replaysGuardados.values()],
  }

  return { abrir, comando, desistir, verAberta, ranking, perfil, replay, trocarApelido, ultima, _interno }
}
