// Frayz — banco do servidor (SQLite embutido do Node 22, sem dependências).
// Esquema versionado: PRAGMA user_version = número de migrações aplicadas. Migração nova = item novo no fim de MIGRACOES
// (nunca mudar uma que já existe). Antes de migrar um banco em ARQUIVO que já tem dados, faz uma cópia (VACUUM INTO)
// na pasta `copias/` ao lado do arquivo; sem cópia, não migra (o servidor não sobe).
// Banco do modo teste e banco do jogo de verdade nunca se misturam: o modo fica gravado na tabela `meta`.
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

export const MIGRACOES = [
  // v1 — contas, bonecos (com dono), livro-razão dos bonecos, lutas, respostas de comandos (idempotência), pedidos.
  `
  CREATE TABLE meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
  CREATE TABLE contas (
    id INTEGER PRIMARY KEY,
    apelido TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    criada_em INTEGER NOT NULL
  );
  CREATE TABLE bonecos (
    id TEXT PRIMARY KEY,
    conta_id INTEGER NOT NULL REFERENCES contas(id),
    dados TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('ativo', 'aposentado')),
    ocupado_por TEXT,
    versao INTEGER NOT NULL DEFAULT 0,
    criado_em INTEGER NOT NULL
  );
  CREATE INDEX bonecos_conta ON bonecos(conta_id);
  CREATE TABLE eventos_bonecos (
    id INTEGER PRIMARY KEY,
    boneco_id TEXT NOT NULL REFERENCES bonecos(id),
    conta_id INTEGER NOT NULL REFERENCES contas(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('nasceu', 'lutou', 'costurou', 'aposentou')),
    dados TEXT NOT NULL,
    em INTEGER NOT NULL
  );
  CREATE INDEX eventos_boneco ON eventos_bonecos(boneco_id, id);
  CREATE TABLE lutas (
    id TEXT PRIMARY KEY,
    conta_id INTEGER NOT NULL REFERENCES contas(id),
    modo TEXT NOT NULL,
    fase INTEGER,
    robo TEXT NOT NULL,
    semente TEXT NOT NULL,
    time_a TEXT NOT NULL,
    time_b TEXT NOT NULL,
    bonecos_a TEXT NOT NULL,
    estado TEXT NOT NULL,
    seq INTEGER NOT NULL DEFAULT 0,
    prazo INTEGER,
    status TEXT NOT NULL CHECK (status IN ('aberta', 'encerrada')),
    resultado TEXT,
    criada_em INTEGER NOT NULL,
    encerrada_em INTEGER
  );
  CREATE UNIQUE INDEX uma_luta_aberta ON lutas(conta_id) WHERE status = 'aberta';
  CREATE TABLE luta_respostas (
    luta_id TEXT NOT NULL REFERENCES lutas(id),
    seq INTEGER NOT NULL,
    comando TEXT NOT NULL,
    resposta TEXT NOT NULL,
    PRIMARY KEY (luta_id, seq)
  );
  CREATE TABLE pedidos (
    conta_id INTEGER NOT NULL REFERENCES contas(id),
    chave TEXT NOT NULL,
    rota TEXT NOT NULL,
    corpo TEXT NOT NULL,
    status INTEGER NOT NULL,
    resposta TEXT NOT NULL,
    em INTEGER NOT NULL,
    PRIMARY KEY (conta_id, chave)
  );
  `,
]

export const VERSAO_DO_BANCO = MIGRACOES.length

function versaoAtual(db) {
  return db.prepare('PRAGMA user_version').get().user_version
}

/**
 * Abre (ou cria) o banco e aplica as migrações pendentes.
 * caminho: arquivo ou ':memory:'. opcoes.modo: 'teste' (padrão) ou 'producao' — o banco guarda o modo e recusa o outro.
 * opcoes.migracoes: lista de migrações (só para testes do próprio banco).
 */
export function abrirBanco(caminho = ':memory:', { modo = 'teste', migracoes = MIGRACOES, agora = Date.now } = {}) {
  if (modo !== 'teste' && modo !== 'producao') throw new Error('Modo do banco inválido.')
  const emArquivo = caminho !== ':memory:'
  if (emArquivo) fs.mkdirSync(path.dirname(path.resolve(caminho)), { recursive: true })
  const db = new DatabaseSync(caminho)
  try {
    db.exec('PRAGMA foreign_keys = ON')
    if (emArquivo) db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA busy_timeout = 5000')
    const v = versaoAtual(db)
    if (v > migracoes.length) throw new Error(`Banco mais novo que o servidor (versão ${v}; o servidor conhece ${migracoes.length}).`)
    if (v > 0) {
      const gravado = db.prepare('SELECT valor FROM meta WHERE chave = ?').get('modo')?.valor
      if (gravado !== modo) throw new Error(`Este banco é do modo "${gravado}" e o servidor está no modo "${modo}": não misturo.`)
    }
    if (v < migracoes.length) {
      if (emArquivo && v > 0) copiarAntes(db, caminho, v, agora())
      for (let i = v; i < migracoes.length; i++) {
        db.exec('BEGIN IMMEDIATE')
        try {
          db.exec(migracoes[i])
          if (i === 0) db.prepare('INSERT INTO meta (chave, valor) VALUES (?, ?)').run('modo', modo)
          db.exec(`PRAGMA user_version = ${i + 1}`)
          db.exec('COMMIT')
        } catch (e) { db.exec('ROLLBACK'); throw e }
      }
    }
    return db
  } catch (e) {
    db.close()
    throw e
  }
}

/** Cópia do banco antes de migrar (VACUUM INTO). Sem cópia, lança erro: não migra. */
function copiarAntes(db, caminho, versao, quando) {
  const pasta = path.join(path.dirname(path.resolve(caminho)), 'copias')
  fs.mkdirSync(pasta, { recursive: true })
  const nome = `${path.basename(caminho)}.v${versao}.${quando}.copia`
  const destino = path.join(pasta, nome)
  db.prepare('VACUUM INTO ?').run(destino)
  if (!fs.existsSync(destino)) throw new Error('Não consegui copiar o banco antes de migrar; não migro.')
  console.log(`cópia do banco: ${nome}`)
}

/** Roda fn dentro de uma transação (BEGIN IMMEDIATE). Erro → ROLLBACK e relança. */
export function transacao(db, fn) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const r = fn()
    db.exec('COMMIT')
    return r
  } catch (e) {
    try { db.exec('ROLLBACK') } catch { /* já desfeita */ }
    throw e
  }
}
