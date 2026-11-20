// Frayz — banco do servidor (SQLite embutido do Node 22, sem dependências).
// Esquema versionado: PRAGMA user_version = número de migrações aplicadas. Migração nova = item novo no fim de MIGRACOES
// (nunca mudar uma que já existe). Antes de migrar um banco em ARQUIVO que já tem dados, faz uma cópia (VACUUM INTO)
// na pasta `copias/` ao lado do arquivo; sem cópia, não migra (o servidor não sobe).
// Banco do modo teste e banco do jogo de verdade nunca se misturam: o modo fica gravado na tabela `meta`.
// Banco que não é do Frayz (tabelas sem a marca) é recusado ANTES de qualquer escrita: não migra e não toca no arquivo.
// Uma migração pode ser texto SQL ou uma função (db, { agora }) — para quando precisa de conta em JavaScript.
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { apelidoValido, chaveDoApelido, chaveDoApelidoV2, chaveDoApelidoV3, limparApelido } from './apelido.mjs'
import { migracaoV5, migracaoV6, migracaoV7, migracaoV8, migracaoV9 } from './reino/banco.mjs'

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
  // v2 — tarefa 13 (parecer de segurança nº 1): marca do Frayz; sessões com validade (tabela própria, "sair" apaga);
  // apelido único pela forma de comparar (repetidos ganham sufixo " 2", " 3"... na ordem de criação da conta);
  // fase liberada da Aventura; ordem estável dos bonecos (coluna n, para a paginação); versão do motor de cada luta,
  // hora do último pedido do dono na luta (abandono) e o último comando (repetir depois do fim); limites de pedidos no banco.
  (db, { agora }) => {
    db.exec(`
    INSERT INTO meta (chave, valor) VALUES ('marca', 'frayz');
    CREATE TABLE sessoes (
      token_hash TEXT PRIMARY KEY,
      conta_id INTEGER NOT NULL REFERENCES contas(id),
      criada_em INTEGER NOT NULL,
      usada_em INTEGER NOT NULL
    );
    CREATE INDEX sessoes_conta ON sessoes(conta_id);
    INSERT INTO sessoes (token_hash, conta_id, criada_em, usada_em) SELECT token_hash, id, criada_em, ${Number(agora())} FROM contas;
    UPDATE contas SET token_hash = 'sessao-migrada:' || id;
    ALTER TABLE contas ADD COLUMN apelido_norm TEXT;
    ALTER TABLE contas ADD COLUMN fase_liberada INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE bonecos ADD COLUMN n INTEGER;
    UPDATE bonecos SET n = rowid;
    CREATE UNIQUE INDEX bonecos_ordem ON bonecos(conta_id, n);
    CREATE INDEX bonecos_vivos ON bonecos(conta_id, estado);
    ALTER TABLE lutas ADD COLUMN versao_motor INTEGER NOT NULL DEFAULT 1;
    UPDATE lutas SET versao_motor = CASE WHEN json_type(estado, '$.rng') = 'object' THEN COALESCE(json_extract(estado, '$.versao'), 1) ELSE 1 END;
    ALTER TABLE lutas ADD COLUMN tocada_em INTEGER;
    UPDATE lutas SET tocada_em = ${Number(agora())};
    ALTER TABLE lutas ADD COLUMN ultimo_comando TEXT;
    CREATE TABLE limites (chave TEXT PRIMARY KEY, inicio INTEGER NOT NULL, n INTEGER NOT NULL);
    CREATE INDEX limites_inicio ON limites(inicio);
    `)
    // apelidos: forma de mostrar limpa; repetido (na forma de comparar) ganha sufixo numérico, o mais antigo fica com o nome
    const usados = new Set()
    const gravar = db.prepare('UPDATE contas SET apelido = ?, apelido_norm = ? WHERE id = ?')
    for (const { id, apelido } of db.prepare('SELECT id, apelido FROM contas ORDER BY id').all()) {
      const base = limparApelido(apelido) || `Jogador ${id}`
      let nome = base, k = 1
      while (usados.has(chaveDoApelidoV2(nome))) {
        k++
        const sufixo = ` ${k}`
        nome = base.slice(0, Math.max(1, 20 - sufixo.length)).trimEnd() + sufixo
      }
      usados.add(chaveDoApelidoV2(nome))
      gravar.run(nome, chaveDoApelidoV2(nome), id)
    }
    db.exec('CREATE UNIQUE INDEX contas_apelido ON contas(apelido_norm)')
  },
  // v3 — parecer de segurança nº 2: apelido só com A–Z, acentos do português, números e . _ - espaço, comparado sem
  // acento, sem caixa e com I/l/1 e O/0 juntos (S2-5): apelido antigo fora da regra ganha forma válida; repetido na
  // forma nova ganha sufixo " 2", " 3"... (o mais antigo fica com o nome). Índice das lutas encerradas por conta (S2-2).
  (db) => {
    db.exec('DROP INDEX contas_apelido')
    const usados = new Set()
    const gravar = db.prepare('UPDATE contas SET apelido = ?, apelido_norm = ? WHERE id = ?')
    for (const { id, apelido } of db.prepare('SELECT id, apelido FROM contas ORDER BY id').all()) {
      const base = apelidoValido(apelido, id)
      let nome = base, k = 1
      while (usados.has(chaveDoApelidoV3(nome))) {
        k++
        const sufixo = ` ${k}`
        nome = base.slice(0, Math.max(1, 20 - sufixo.length)).trimEnd() + sufixo
      }
      usados.add(chaveDoApelidoV3(nome))
      gravar.run(nome, chaveDoApelidoV3(nome), id)
    }
    db.exec(`
    CREATE UNIQUE INDEX contas_apelido ON contas(apelido_norm);
    CREATE INDEX lutas_encerradas ON lutas(conta_id, encerrada_em) WHERE status = 'encerrada';
    `)
  },
  // v4 — tarefa 16: energia da Aventura (dia UTC do gasto + quanto já gastou nesse dia; dia novo = cheia) e sequência
  // de vitórias na Aventura (desistir e abandonar zeram, como qualquer derrota). Apelido comparado com "rn" = "m" e
  // sem . _ - espaço nas pontas: repetido na forma nova ganha sufixo " 2", " 3"... (o mais antigo fica com o nome).
  (db) => {
    db.exec(`
    ALTER TABLE contas ADD COLUMN energia_dia INTEGER;
    ALTER TABLE contas ADD COLUMN energia_gasta INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE contas ADD COLUMN vitorias_seguidas INTEGER NOT NULL DEFAULT 0;
    DROP INDEX contas_apelido;
    `)
    const usados = new Set()
    const gravar = db.prepare('UPDATE contas SET apelido = ?, apelido_norm = ? WHERE id = ?')
    for (const { id, apelido } of db.prepare('SELECT id, apelido FROM contas ORDER BY id').all()) {
      let nome = apelido, k = 1
      while (usados.has(chaveDoApelido(nome))) {
        k++
        const sufixo = ` ${k}`
        nome = apelido.slice(0, Math.max(1, 20 - sufixo.length)).trimEnd() + sufixo
      }
      usados.add(chaveDoApelido(nome))
      gravar.run(nome, chaveDoApelido(nome), id)
    }
    db.exec('CREATE UNIQUE INDEX contas_apelido ON contas(apelido_norm)')
  },
  // v5 — tarefa R14: tabelas do Keepmile (server/reino/banco.mjs). Só cria tabelas; nada do jogo antigo muda.
  migracaoV5,
  // v6 — tarefa R16 (K1): a última resposta de comando fica guardada na partida do Keepmile (server/reino/banco.mjs).
  migracaoV6,
  // v7 — tarefa R22: troca de apelido (1 por 24 h) e data de cada conquista no Keepmile (server/reino/banco.mjs).
  migracaoV7,
  // v8 — tarefa R39: só dados — conquistas de degrau (rodadas somadas) e Encore! que o banco já prova, sem data (server/reino/banco.mjs).
  migracaoV8,
  // v9 — tarefa R46: a regra de cada partida do Keepmile (antigas = 1; novas = PARTIDA.regra, com a revanche) (server/reino/banco.mjs).
  migracaoV9,
]

export const VERSAO_DO_BANCO = MIGRACOES.length

/** Tamanho do arquivo -wal depois de cada descarga (limite técnico do servidor, não é número de economia). */
export const LIMITE_DO_WAL_BYTES = 4 * 1024 * 1024

function versaoAtual(db) {
  return db.prepare('PRAGMA user_version').get().user_version
}

/** Tabelas que um banco do Frayz na versão 1 tem (o que vale como marca antes da v2). */
const TABELAS_V1 = ['meta', 'contas', 'bonecos', 'eventos_bonecos', 'lutas', 'luta_respostas', 'pedidos']

/**
 * Confere, SÓ LENDO, se o arquivo é um banco do Frayz. Lança erro claro se não for. Não cria nem escreve nada.
 * Arquivo inexistente ou vazio: tudo bem (vai nascer agora).
 */
function conferirMarca(caminho) {
  if (!fs.existsSync(caminho) || fs.statSync(caminho).size === 0) return
  let db
  try {
    db = new DatabaseSync(caminho, { readOnly: true })
    const v = versaoAtual(db)
    const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name)
    if (v === 0 && tabelas.length === 0) return
    const alheio = () => new Error(`O arquivo ${path.basename(caminho)} tem tabelas mas não é um banco do Frayz: não abro, não migro e não mexo nele.`)
    if (v === 0 || !TABELAS_V1.every((t) => tabelas.includes(t))) throw alheio()
    const meta = Object.fromEntries(db.prepare('SELECT chave, valor FROM meta').all().map((m) => [m.chave, m.valor]))
    if (!meta.modo) throw alheio()
    if (v >= 2 && meta.marca !== 'frayz') throw alheio()
  } catch (e) {
    if (/não é um banco do Frayz/.test(e.message)) throw e
    throw new Error(`O arquivo ${path.basename(caminho)} não é um banco SQLite que eu reconheça (${String(e.message).slice(0, 80)}): não abro.`)
  } finally {
    try { db?.close() } catch { /* já fechado */ }
  }
}

/**
 * Abre (ou cria) o banco e aplica as migrações pendentes.
 * caminho: arquivo ou ':memory:'. opcoes.modo: 'teste' (padrão) ou 'producao' — o banco guarda o modo e recusa o outro.
 * opcoes.migracoes: lista de migrações (só para testes do próprio banco).
 */
export function abrirBanco(caminho = ':memory:', { modo = 'teste', migracoes = MIGRACOES, agora = Date.now } = {}) {
  if (modo !== 'teste' && modo !== 'producao') throw new Error('Modo do banco inválido.')
  const emArquivo = caminho !== ':memory:'
  if (emArquivo) {
    fs.mkdirSync(path.dirname(path.resolve(caminho)), { recursive: true })
    conferirMarca(caminho)
  }
  const db = new DatabaseSync(caminho)
  try {
    db.exec('PRAGMA foreign_keys = ON')
    db.exec('PRAGMA busy_timeout = 5000')
    const v = versaoAtual(db)
    if (v > migracoes.length) throw new Error(`Banco mais novo que o servidor (versão ${v}; o servidor conhece ${migracoes.length}).`)
    if (v > 0) {
      const gravado = db.prepare('SELECT valor FROM meta WHERE chave = ?').get('modo')?.valor
      if (gravado !== modo) throw new Error(`Este banco é do modo "${gravado}" e o servidor está no modo "${modo}": não misturo.`)
    }
    if (emArquivo) {
      db.exec('PRAGMA journal_mode = WAL')
      // depois de cada descarga (checkpoint) o arquivo -wal volta a no máximo isto (S2-1)
      db.exec(`PRAGMA journal_size_limit = ${LIMITE_DO_WAL_BYTES}`)
    }
    if (v < migracoes.length) {
      // há dados (versão > 0) e migração pendente: cópia SEMPRE antes; sem cópia, não migra
      if (emArquivo && v > 0) copiarAntes(db, caminho, v, agora())
      for (let i = v; i < migracoes.length; i++) {
        db.exec('BEGIN IMMEDIATE')
        try {
          if (typeof migracoes[i] === 'function') migracoes[i](db, { agora })
          else db.exec(migracoes[i])
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
