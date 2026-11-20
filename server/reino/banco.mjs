// Keepmile — tabelas do servidor do jogo de reino (migração v5 do banco; ligada em server/db.mjs).
// Migração antiga nunca muda: ajuste novo = migração nova no fim da lista de server/db.mjs.
import { randomBytes } from 'node:crypto'
import { CONQUISTAS } from '../../shared/reino/config.js'

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

/**
 * v6 — tarefa R16 (achado K1): a ÚLTIMA resposta de comando fica na linha da partida. Repetir o último `seq` devolve
 * ela, sem refazer a partida pelo motor. Linha antiga fica com NULL até o próximo comando.
 */
export function migracaoV6(db) {
  db.exec('ALTER TABLE reino_partidas ADD COLUMN resposta TEXT')
}

/**
 * v7 — tarefa R22: quando a conta trocou o apelido pela última vez (1 troca por 24 h) e quando ganhou cada conquista
 * ({ id: ms }). Conquista ganha antes da v7 fica sem data (a tela mostra "feita", sem dia).
 */
export function migracaoV7(db) {
  db.exec(`
  ALTER TABLE reino_contas ADD COLUMN apelido_trocado_em INTEGER;
  ALTER TABLE reino_contas ADD COLUMN conquistas_quando TEXT NOT NULL DEFAULT '{}';
  `)
}

/**
 * v8 — tarefa R39: só dados (nenhuma tabela muda). As conquistas novas que o banco já prova ficam feitas, SEM data
 * (quando: null na tela): os degraus de rodadas vencidas somadas (tally*, por reino_contas.rodadas_vencidas) e Encore!
 * (pela maior quantidade de vencidas numa partida terminada e CONFERIDA). As de luta valem só daqui para frente.
 * Idempotente: só acrescenta id que falta, no fim da lista; nunca tira id nem mexe em conquistas_quando.
 */
export function migracaoV8(db) {
  const melhor = db.prepare("SELECT MAX(vencidas) n FROM reino_partidas WHERE conta_id = ? AND status = 'terminada' AND conferida = 1")
  const gravar = db.prepare('UPDATE reino_contas SET conquistas = ? WHERE conta_id = ?')
  for (const c of db.prepare('SELECT conta_id, rodadas_vencidas, conquistas FROM reino_contas ORDER BY conta_id').all()) {
    const tem = JSON.parse(c.conquistas)
    const novas = Object.entries(CONQUISTAS.rodadasSomadas).filter(([, meta]) => c.rodadas_vencidas >= meta).map(([id]) => id)
    if ((melhor.get(c.conta_id)?.n ?? 0) >= CONQUISTAS.rodadaDoBis) novas.push('encore')
    const faltam = novas.filter((id) => !tem.includes(id))
    if (faltam.length) gravar.run(JSON.stringify([...tem, ...faltam]), c.conta_id)
  }
}
