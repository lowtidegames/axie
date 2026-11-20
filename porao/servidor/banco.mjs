// Porão (jogo-sátira) — banco SQLite (node:sqlite), arquivo SEPARADO do Frayz (padrão ./dados/porao-teste.db).
// Esquema versionado por PRAGMA user_version (= migrações aplicadas). Migração nova = item novo no FIM de MIGRACOES.
// Antes de migrar um arquivo que já tem dados: cópia (VACUUM INTO) em `copias/` ao lado do arquivo, guarda as 10
// últimas; sem cópia, não migra (o servidor não sobe).
// Marca: meta.marca = 'porao'. Arquivo com tabelas sem a marca é recusado ANTES de qualquer escrita.
// Modo: meta.modo = 'teste' | 'producao'; o banco recusa abrir no outro modo.
// O estado do jogo fica como JSON na tabela `save` (1 linha, com a semente — que nunca sai para a tela).
// `diario` (cada mudança de caixa: motivo e valor) e `pedidos` (chave única) são tabelas próprias.
// Cartas, projetos, luxos, contratos, carteirinha e mensagens vivem dentro do JSON do save na v1.
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
 * Abre (ou cria) o banco do porão e aplica migrações pendentes. Cria o save se não existir.
 * caminho: arquivo ou ':memory:' (testes). opcoes: modo ('teste' | 'producao'), agora (função → ms),
 * semente (só para o save NOVO; padrão: 32 bytes aleatórios do servidor), migracoes (só testes do banco).
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
    transacao(db, () => {
      if (db.prepare('SELECT 1 FROM save WHERE id = 1').get()) return
      const s = typeof semente === 'string' && semente.length > 0 ? semente : randomBytes(32).toString('hex')
      gravarSave(db, estadoInicial({ semente: s, agora: agora() }), agora())
    })
    return db
  } catch (e) {
    db.close()
    throw e
  }
}

/** Estado completo do jogo (COM a semente: só para o servidor). */
export function carregarSave(db) {
  const linha = db.prepare('SELECT estado FROM save WHERE id = 1').get()
  if (!linha) throw new Error('O porão ainda não tem save.')
  return JSON.parse(linha.estado)
}

export function gravarSave(db, estado, em) {
  db.prepare(`INSERT INTO save (id, estado, atualizado_em) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET estado = excluded.estado, atualizado_em = excluded.atualizado_em`)
    .run(JSON.stringify(estado), Math.floor(em))
}

export function anotarDiario(db, { em, motivo, valor, caixaDepois, pedido = null }) {
  if (!Number.isSafeInteger(valor) || valor === 0) throw new Error(`Valor inválido no diário: ${valor}`)
  db.prepare('INSERT INTO diario (em, motivo, valor, caixa_depois, pedido) VALUES (?, ?, ?, ?, ?)')
    .run(Math.floor(em), motivo, valor, caixaDepois, pedido)
}

export function buscarPedido(db, chave) {
  return db.prepare('SELECT acao, corpo, resposta FROM pedidos WHERE chave = ?').get(chave) || null
}

export function gravarPedido(db, { chave, acao, corpo, resposta, em }) {
  db.prepare('INSERT INTO pedidos (chave, acao, corpo, resposta, em) VALUES (?, ?, ?, ?, ?)')
    .run(chave, acao, corpo, resposta, Math.floor(em))
}
