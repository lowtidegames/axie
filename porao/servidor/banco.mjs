// Porão (jogo-sátira) — banco SQLite (node:sqlite), arquivo SEPARADO do Frayz (padrão ./dados/porao-teste.db).
// Esquema versionado por PRAGMA user_version (= migrações aplicadas). Migração nova = item novo no FIM de MIGRACOES.
// Antes de migrar um arquivo que já tem dados: cópia (VACUUM INTO) em `copias/` ao lado do arquivo, guarda as 10
// últimas; sem cópia, não migra (o servidor não sobe).
// Marca: meta.marca = 'porao'. Arquivo com tabelas sem a marca é recusado ANTES de qualquer escrita.
// Modo: meta.modo = 'teste' | 'producao'; o banco recusa abrir no outro modo.
//
// v2 (abertura, 20/11 18:17): progresso SEPARADO POR CONTA (carteira ou convidado).
//   contas(id, tipo 'carteira'|'convidado', carteira UNIQUE, apelido, apelido_chave UNIQUE, local_padrao, criada_em, visto_em)
//   saves(conta_id PK → estado JSON COM a semente, que nunca sai para a tela; cada conta nova tem semente própria)
//   desafios(nonce PK, carteira, mensagem, vence_em, usado_em) · sessoes(hash PK, conta_id, vence_em, visto_em)
//   diario e pedidos ganham conta_id (gatilho recusa linha nova sem conta).
//   Conta 1 = convidada local padrão (local_padrao = 1) com o save que existia; a tabela `save` antiga fica INTOCADA
//   (apagar é decisão do dono).
// Cartas, projetos, luxos, contratos, carteirinha e mensagens vivem dentro do JSON do save.
//
// API das contas (v2):
//   criarConta(db, { tipo, carteira?, localPadrao?, agora, semente? })      → conta (cria conta + save inicial)
//   contaDaCarteira(db, carteira, { agora, semente?, criar = true })         → conta { ..., nova } | null (criar:false)
//   contaConvidadaLocal(db, { agora, semente? })                             → conta local padrão (acha ou cria)
//   buscarConta(db, id)                                                      → conta | null
//   carregarSaveDaConta(db, contaId) / gravarSaveDaConta(db, contaId, estado, em)
//   somaDoDiarioDaConta(db, contaId)
//   anotarDiario / gravarPedido aceitam contaId; buscarPedido devolve contaId.
//   conta = { id, tipo, carteira, apelido, localPadrao, criadaEm, vistoEm }
// COMPATIBILIDADE: carregarSave(db), gravarSave(db, …), anotarDiario e gravarPedido sem contaId usam a conta
// convidada local padrão.
// A tabela `save` antiga NUNCA muda depois da v1 (tarefa 4 tirou a ponte que a espelhava): banco novo a deixa vazia;
// banco migrado da v1 a guarda como estava (apagar é decisão do dono). Uma marca meta.save_antigo_espelho que tenha
// ficado de antes é ignorada.
import { DatabaseSync } from 'node:sqlite'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { transacao } from '../../server/db.mjs'
import { estadoInicial } from '../comum/regras.js'

export { transacao }

export const CAMINHO_PADRAO = './dados/porao-teste.db'
export const MARCA = 'porao'
/** Quantas cópias de antes-da-migração ficam guardadas (limite técnico, não é número de jogo). */
export const COPIAS_GUARDADAS = 10
/** Pedidos (chaves de repetição) mais velhos que isto são apagados no boot (limite técnico: 1 dia). */
export const PEDIDOS_GUARDADOS_MS = 24 * 3600 * 1000
/** Endereço de carteira Solana: base58, 32 a 44 letras (a chave em si é conferida na assinatura, tarefa 3). */
export const CARTEIRA_VALIDA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
export const TIPOS_DE_CONTA = Object.freeze(['carteira', 'convidado'])

const colunas = (db, tabela) => db.prepare(`PRAGMA table_info(${tabela})`).all().map(c => c.name)

/**
 * v2 — contas. Idempotente: rodar de novo por cima de um banco já migrado não muda nada
 * (CREATE IF NOT EXISTS, INSERT OR IGNORE, coluna só se faltar, UPDATE só onde conta_id está vazio).
 */
function migracaoContas(db, { agora = Date.now } = {}) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS contas (
    id INTEGER PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('carteira', 'convidado')),
    carteira TEXT UNIQUE,
    apelido TEXT,
    apelido_chave TEXT UNIQUE,
    local_padrao INTEGER UNIQUE CHECK (local_padrao IS NULL OR local_padrao = 1),
    criada_em INTEGER NOT NULL,
    visto_em INTEGER NOT NULL,
    CHECK ((tipo = 'carteira') = (carteira IS NOT NULL)),
    CHECK (local_padrao IS NULL OR tipo = 'convidado')
  );
  CREATE TABLE IF NOT EXISTS saves (
    conta_id INTEGER PRIMARY KEY REFERENCES contas(id),
    estado TEXT NOT NULL,
    atualizado_em INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS desafios (
    nonce TEXT PRIMARY KEY,
    carteira TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    vence_em INTEGER NOT NULL,
    usado_em INTEGER
  );
  CREATE INDEX IF NOT EXISTS desafios_vence ON desafios (vence_em);
  CREATE TABLE IF NOT EXISTS sessoes (
    hash TEXT PRIMARY KEY,
    conta_id INTEGER NOT NULL REFERENCES contas(id),
    vence_em INTEGER NOT NULL,
    visto_em INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessoes_conta ON sessoes (conta_id);
  `)
  // O save que existia vira a conta 1 (convidada local padrão), com o texto do estado copiado sem passar por JSON.
  const antigo = db.prepare('SELECT estado, atualizado_em FROM save WHERE id = 1').get()
  if (antigo) {
    const em = Math.floor(agora())
    db.prepare(`INSERT OR IGNORE INTO contas (id, tipo, carteira, apelido, apelido_chave, local_padrao, criada_em, visto_em)
      VALUES (1, 'convidado', NULL, NULL, NULL, 1, ?, ?)`).run(em, em)
    db.prepare('INSERT OR IGNORE INTO saves (conta_id, estado, atualizado_em) SELECT 1, estado, atualizado_em FROM save WHERE id = 1').run()
  }
  for (const tabela of ['diario', 'pedidos']) {
    if (!colunas(db, tabela).includes('conta_id')) db.exec(`ALTER TABLE ${tabela} ADD COLUMN conta_id INTEGER REFERENCES contas(id)`)
    if (antigo) db.exec(`UPDATE ${tabela} SET conta_id = 1 WHERE conta_id IS NULL`)
  }
  // Diário é dinheiro do jogo: linha nova sem dono é recusada. Pedido sem conta é aceito, mas não é de ninguém
  // (buscarPedido devolve contaId null; quem confere a conta recusa) e some na limpeza de 1 dia.
  db.exec(`CREATE TRIGGER IF NOT EXISTS diario_exige_conta BEFORE INSERT ON diario WHEN NEW.conta_id IS NULL
    BEGIN SELECT RAISE(ABORT, 'diario: linha sem conta'); END`)
  db.exec('CREATE INDEX IF NOT EXISTS diario_conta ON diario (conta_id, id)')
}

export const MIGRACOES = [
  // v1 — tarefa 4: meta, save (1 linha), diário de caixa, pedidos.
  `
  CREATE TABLE meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
  CREATE TABLE save (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    estado TEXT NOT NULL,
    atualizado_em INTEGER NOT NULL
  );
  CREATE TABLE diario (
    id INTEGER PRIMARY KEY,
    em INTEGER NOT NULL,
    motivo TEXT NOT NULL,
    valor INTEGER NOT NULL,
    caixa_depois INTEGER NOT NULL,
    pedido TEXT
  );
  CREATE TABLE pedidos (
    chave TEXT PRIMARY KEY,
    acao TEXT NOT NULL,
    corpo TEXT NOT NULL,
    resposta TEXT NOT NULL,
    em INTEGER NOT NULL
  );
  `,
  // v2 — abertura (20/11 18:17): contas, saves por conta, desafios, sessões; conta_id no diário e nos pedidos.
  migracaoContas,
]

const versaoAtual = db => db.prepare('PRAGMA user_version').get().user_version

/** Confere, SÓ LENDO, se o arquivo é um banco do porão. Arquivo inexistente/vazio: tudo bem. */
function conferirMarca(caminho) {
  if (!fs.existsSync(caminho) || fs.statSync(caminho).size === 0) return
  const alheio = () => new Error(`O arquivo ${path.basename(caminho)} não é um banco do porão: não abro, não migro e não mexo nele.`)
  let db
  try {
    db = new DatabaseSync(caminho, { readOnly: true })
    const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(t => t.name)
    if (versaoAtual(db) === 0 && tabelas.length === 0) return
    if (!tabelas.includes('meta')) throw alheio()
    const marca = db.prepare("SELECT valor FROM meta WHERE chave = 'marca'").get()?.valor
    if (marca !== MARCA) throw alheio()
  } catch (e) {
    if (/não é um banco do porão/.test(e.message)) throw e
    throw new Error(`O arquivo ${path.basename(caminho)} não é um banco do porão que eu reconheça (${String(e.message).slice(0, 80)}).`)
  } finally {
    try { db?.close() } catch { /* já fechado */ }
  }
}

/** Cópia antes de migrar; guarda as COPIAS_GUARDADAS mais novas. Sem cópia, lança erro. */
function copiarAntes(db, caminho, versao, quando) {
  const pasta = path.join(path.dirname(path.resolve(caminho)), 'copias')
  fs.mkdirSync(pasta, { recursive: true })
  const base = path.basename(caminho)
  const nome = `${base}.v${versao}.${quando}.copia`
  const destino = path.join(pasta, nome)
  db.prepare('VACUUM INTO ?').run(destino)
  if (!fs.existsSync(destino)) throw new Error('Não consegui copiar o banco do porão antes de migrar; não migro.')
  console.log(`cópia do banco: ${nome}`)
  const minhas = fs.readdirSync(pasta)
    .filter(n => n.startsWith(`${base}.v`) && n.endsWith('.copia'))
    .map(n => ({ n, t: fs.statSync(path.join(pasta, n)).mtimeMs }))
    .sort((a, b) => b.t - a.t || (a.n < b.n ? 1 : -1))
  for (const velha of minhas.slice(COPIAS_GUARDADAS)) fs.rmSync(path.join(pasta, velha.n), { force: true })
}

/**
 * Abre (ou cria) o banco do porão e aplica migrações pendentes. Garante a conta convidada local padrão.
 * caminho: arquivo ou ':memory:' (testes). opcoes: modo ('teste' | 'producao'), agora (função → ms),
 * semente (só para a conta local NOVA; padrão: 32 bytes aleatórios do servidor), migracoes (só testes do banco).
 */
export function abrirBancoPorao(caminho = CAMINHO_PADRAO, { modo = 'teste', agora = Date.now, semente, migracoes = MIGRACOES } = {}) {
  if (modo !== 'teste' && modo !== 'producao') throw new Error('Modo do banco inválido.')
  const emArquivo = caminho !== ':memory:'
  if (emArquivo) {
    fs.mkdirSync(path.dirname(path.resolve(caminho)), { recursive: true })
    conferirMarca(caminho)
  }
  const db = new DatabaseSync(caminho)
  try {
    db.exec('PRAGMA busy_timeout = 5000')
    const v = versaoAtual(db)
    if (v > migracoes.length) throw new Error(`Banco do porão mais novo que o servidor (versão ${v}; conheço ${migracoes.length}).`)
    if (v > 0) {
      const gravado = db.prepare("SELECT valor FROM meta WHERE chave = 'modo'").get()?.valor
      if (gravado !== modo) throw new Error(`Este banco é do modo "${gravado}" e o servidor está no modo "${modo}": não misturo.`)
    }
    if (emArquivo) db.exec('PRAGMA journal_mode = WAL')
    if (v < migracoes.length) {
      if (emArquivo && v > 0) copiarAntes(db, caminho, v, agora())
      for (let i = v; i < migracoes.length; i++) {
        transacao(db, () => {
          if (typeof migracoes[i] === 'function') migracoes[i](db, { agora })
          else db.exec(migracoes[i])
          if (i === 0) {
            const ins = db.prepare('INSERT INTO meta (chave, valor) VALUES (?, ?)')
            ins.run('modo', modo)
            ins.run('marca', MARCA)
          }
          db.exec(`PRAGMA user_version = ${i + 1}`)
        })
      }
    }
    transacao(db, () => { contaConvidadaLocal(db, { agora, semente }) })
    transacao(db, () => { db.prepare('DELETE FROM pedidos WHERE em < ?').run(Math.floor(agora()) - PEDIDOS_GUARDADOS_MS) })
    return db
  } catch (e) {
    db.close()
    throw e
  }
}

// ---------------------------------------------------------------------------------------------
// Contas (v2)
// ---------------------------------------------------------------------------------------------
const emMs = agora => Math.floor(typeof agora === 'function' ? agora() : agora)

/** Roda fn dentro da transação do chamador, se houver; senão abre uma. */
function emTransacao(db, fn) {
  return db.isTransaction ? fn() : transacao(db, fn)
}

function contaDaLinha(l) {
  if (!l) return null
  return {
    id: l.id,
    tipo: l.tipo,
    carteira: l.carteira ?? null,
    apelido: l.apelido ?? null,
    localPadrao: l.local_padrao === 1,
    criadaEm: l.criada_em,
    vistoEm: l.visto_em,
  }
}

/** Conta pelo id, ou null. */
export function buscarConta(db, id) {
  if (!Number.isSafeInteger(id)) return null
  return contaDaLinha(db.prepare('SELECT * FROM contas WHERE id = ?').get(id))
}

function conferirCarteira(carteira) {
  if (typeof carteira !== 'string' || !CARTEIRA_VALIDA.test(carteira)) throw new Error('Endereço de carteira inválido.')
}

/**
 * Cria conta + save inicial (semente própria: 32 bytes aleatórios, ou `semente` dada pelos testes).
 * tipo: 'carteira' (exige carteira válida, única) | 'convidado' (localPadrao: true só para a única local).
 * agora: ms ou função → ms. Devolve a conta. Lança erro se recusar (nada fica gravado).
 */
export function criarConta(db, { tipo, carteira = null, localPadrao = false, agora, semente } = {}) {
  if (!TIPOS_DE_CONTA.includes(tipo)) throw new Error('Tipo de conta inválido.')
  if (tipo === 'carteira') conferirCarteira(carteira)
  else if (carteira !== null) throw new Error('Conta de convidado não tem carteira.')
  if (localPadrao && tipo !== 'convidado') throw new Error('Só a conta de convidado pode ser a local padrão.')
  const em = emMs(agora)
  if (!Number.isFinite(em)) throw new TypeError('agora precisa ser número (ms)')
  const s = typeof semente === 'string' && semente.length > 0 ? semente : randomBytes(32).toString('hex')
  return emTransacao(db, () => {
    const { lastInsertRowid } = db.prepare(`INSERT INTO contas (tipo, carteira, apelido, apelido_chave, local_padrao, criada_em, visto_em)
      VALUES (?, ?, NULL, NULL, ?, ?, ?)`).run(tipo, carteira, localPadrao ? 1 : null, em, em)
    const id = Number(lastInsertRowid)
    db.prepare('INSERT INTO saves (conta_id, estado, atualizado_em) VALUES (?, ?, ?)')
      .run(id, JSON.stringify(estadoInicial({ semente: s, agora: em })), em)
    return buscarConta(db, id)
  })
}

/**
 * Conta da carteira (endereço já conferido pela assinatura, tarefas 3/4). Acha e marca visto_em, ou cria.
 * Devolve { ...conta, nova } — ou null se criar:false e não existir.
 */
export function contaDaCarteira(db, carteira, { agora, semente, criar = true } = {}) {
  conferirCarteira(carteira)
  const em = emMs(agora)
  return emTransacao(db, () => {
    const linha = db.prepare('SELECT id FROM contas WHERE carteira = ?').get(carteira)
    if (linha) {
      db.prepare('UPDATE contas SET visto_em = ? WHERE id = ?').run(em, linha.id)
      return { ...buscarConta(db, linha.id), nova: false }
    }
    if (!criar) return null
    return { ...criarConta(db, { tipo: 'carteira', carteira, agora: em, semente }), nova: true }
  })
}

/** A conta convidada local padrão (127.0.0.1): acha ou cria. Não mexe em visto_em. */
export function contaConvidadaLocal(db, { agora, semente } = {}) {
  return emTransacao(db, () => {
    const linha = db.prepare('SELECT id FROM contas WHERE local_padrao = 1').get()
    if (linha) return buscarConta(db, linha.id)
    return criarConta(db, { tipo: 'convidado', localPadrao: true, agora, semente })
  })
}

function idLocalPadrao(db) {
  const linha = db.prepare('SELECT id FROM contas WHERE local_padrao = 1').get()
  if (!linha) throw new Error('O porão ainda não tem a conta convidada local.')
  return linha.id
}

/** Estado completo do jogo da conta (COM a semente: só para o servidor). */
export function carregarSaveDaConta(db, contaId) {
  const linha = db.prepare('SELECT estado FROM saves WHERE conta_id = ?').get(contaId)
  if (!linha) throw new Error('Esta conta ainda não tem save.')
  return JSON.parse(linha.estado)
}

export function gravarSaveDaConta(db, contaId, estado, em) {
  if (!buscarConta(db, contaId)) throw new Error('Conta inexistente.')
  db.prepare(`INSERT INTO saves (conta_id, estado, atualizado_em) VALUES (?, ?, ?)
    ON CONFLICT(conta_id) DO UPDATE SET estado = excluded.estado, atualizado_em = excluded.atualizado_em`)
    .run(contaId, JSON.stringify(estado), Math.floor(em))
}

/** Soma do diário da conta (deve ser igual ao caixa do save dela). */
export function somaDoDiarioDaConta(db, contaId) {
  return db.prepare('SELECT COALESCE(SUM(valor), 0) AS s FROM diario WHERE conta_id = ?').get(contaId).s
}

/** COMPATIBILIDADE: save da conta convidada local padrão. */
export function carregarSave(db) {
  return carregarSaveDaConta(db, idLocalPadrao(db))
}

/** COMPATIBILIDADE: grava o save da conta convidada local padrão. */
export function gravarSave(db, estado, em) {
  gravarSaveDaConta(db, idLocalPadrao(db), estado, em)
}

/** contaId omitido = conta convidada local padrão (compatibilidade). */
export function anotarDiario(db, { em, motivo, valor, caixaDepois, pedido = null, contaId = idLocalPadrao(db) }) {
  if (!Number.isSafeInteger(valor) || valor === 0) throw new Error(`Valor inválido no diário: ${valor}`)
  db.prepare('INSERT INTO diario (em, motivo, valor, caixa_depois, pedido, conta_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(Math.floor(em), motivo, valor, caixaDepois, pedido, contaId)
}

/** Pedido pela chave: { acao, corpo, resposta, contaId } ou null. */
export function buscarPedido(db, chave) {
  const l = db.prepare('SELECT acao, corpo, resposta, conta_id FROM pedidos WHERE chave = ?').get(chave)
  return l ? { acao: l.acao, corpo: l.corpo, resposta: l.resposta, contaId: l.conta_id } : null
}

/** contaId omitido = conta convidada local padrão (compatibilidade). */
export function gravarPedido(db, { chave, acao, corpo, resposta, em, contaId = idLocalPadrao(db) }) {
  db.prepare('INSERT INTO pedidos (chave, acao, corpo, resposta, em, conta_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(chave, acao, corpo, resposta, Math.floor(em), contaId)
}
