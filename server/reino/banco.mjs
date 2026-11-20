// Keepmile — tabelas do servidor do jogo de reino (migração v5 do banco; ligada em server/db.mjs).
// Migração antiga nunca muda: ajuste novo = migração nova no fim da lista de server/db.mjs.
import { randomBytes } from 'node:crypto'

/**
 * v5 — tarefa R14: partidas do Keepmile (semente, cartas liberadas, comandos e tempos; o estado só enquanto aberta),
 * dados da conta no Keepmile (álbum, energia de ranking, conquistas, recorde), pontuação da temporada, temporadas
 * fechadas e títulos. Segredo da estrada do dia (sorteado aqui; a variável REINO_SEGREDO, se houver, vale mais).
 */
export function migracaoV5(db) {
  db.exec(`
  CREATE TABLE reino_contas (
    conta_id INTEGER PRIMARY KEY REFERENCES contas(id),
    rodadas_vencidas INTEGER NOT NULL DEFAULT 0,
    partidas INTEGER NOT NULL DEFAULT 0,
    recorde INTEGER NOT NULL DEFAULT 0,
    energia_saldo INTEGER NOT NULL,
    energia_dia INTEGER NOT NULL,
    conquistas TEXT NOT NULL DEFAULT '[]',
    criada_em INTEGER NOT NULL
  );
  CREATE TABLE reino_partidas (
    id TEXT PRIMARY KEY,
    conta_id INTEGER NOT NULL REFERENCES contas(id),
    modo TEXT NOT NULL CHECK (modo IN ('ranking', 'treino', 'estrada')),
    dia INTEGER NOT NULL,
    temporada INTEGER NOT NULL,
    semente TEXT NOT NULL,
    liberadas TEXT NOT NULL,
    estado TEXT,
    comandos TEXT NOT NULL DEFAULT '[]',
    tempos TEXT NOT NULL DEFAULT '[]',
    novidades TEXT,
    seq INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('aberta', 'terminada')),
    motivo TEXT,
    pontos INTEGER,
    vencidas INTEGER,
    rodada INTEGER,
    conferida INTEGER,
    criada_em INTEGER NOT NULL,
    tocada_em INTEGER NOT NULL,
    terminada_em INTEGER
  );
  CREATE UNIQUE INDEX reino_uma_aberta ON reino_partidas(conta_id, modo) WHERE status = 'aberta';
  CREATE UNIQUE INDEX reino_estrada_por_dia ON reino_partidas(conta_id, dia) WHERE modo = 'estrada';
  CREATE INDEX reino_partidas_conta ON reino_partidas(conta_id, modo, terminada_em);
  CREATE INDEX reino_partidas_temporada ON reino_partidas(temporada, modo, status);
  CREATE INDEX reino_placar_do_dia ON reino_partidas(dia, pontos DESC, terminada_em) WHERE modo = 'estrada' AND status = 'terminada';
  CREATE TABLE reino_pontuacao (
    temporada INTEGER NOT NULL,
    conta_id INTEGER NOT NULL REFERENCES contas(id),
    soma INTEGER NOT NULL,
    partidas INTEGER NOT NULL,
    quando INTEGER NOT NULL,
    PRIMARY KEY (temporada, conta_id)
  );
  CREATE INDEX reino_pontuacao_ordem ON reino_pontuacao(temporada, soma DESC, quando, conta_id);
  CREATE TABLE reino_temporadas (
    numero INTEGER PRIMARY KEY,
    fechada_em INTEGER NOT NULL,
    contas INTEGER NOT NULL
  );
  CREATE TABLE reino_titulos (
    temporada INTEGER NOT NULL,
    conta_id INTEGER NOT NULL REFERENCES contas(id),
    posicao INTEGER NOT NULL,
    media INTEGER NOT NULL,
    liga TEXT NOT NULL,
    PRIMARY KEY (temporada, conta_id)
  );
  CREATE INDEX reino_titulos_conta ON reino_titulos(conta_id);
  `)
  db.prepare("INSERT INTO meta (chave, valor) VALUES ('reino_segredo', ?)").run(randomBytes(32).toString('hex'))
}
