// Frayz — servidor do protótipo (sem dinheiro, sem token, sem carteira). Node 22, zero dependências.
// Serve public/ e /shared/ e a API em /api/ (contrato no relato da tarefa 7 e nos testes em tests/servidor/api.test.js).
// Uso: `npm run servidor` · variáveis: PORTA (padrão 4800), HOST (padrão 127.0.0.1), DB_PATH (padrão ./dados/frayz-teste.db).
// Nos testes: import { iniciar } e passe { dbPath: ':memory:', porta: 0 }.
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { abrirBanco } from './db.mjs'
import { criarJogo } from './jogo.mjs'
import { PARAMS_SERVIDOR, criarTratador } from './api.mjs'

export async function iniciar({
  porta = Number(process.env.PORTA) || 4800,
  host = process.env.HOST || '127.0.0.1',
  dbPath = process.env.DB_PATH || './dados/frayz-teste.db',
  agora = Date.now,
  log = console.log,
  limites = {},
} = {}) {
  const db = abrirBanco(dbPath, { modo: 'teste', agora })
  const jogo = criarJogo(db, { agora, tempoDoTurnoMs: PARAMS_SERVIDOR.tempoDoTurnoMs, folgaDoRelogioMs: PARAMS_SERVIDOR.folgaDoRelogioMs })
  const tratar = criarTratador({ jogo, agora, log, limites })
  const servidor = createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, tratar)
  servidor.on('close', () => { try { db.close() } catch { /* já fechado */ } })
  await new Promise((ok, falha) => {
    servidor.once('error', falha)
    servidor.listen(porta, host, ok)
  })
  return { servidor, db, jogo, porta: servidor.address().port }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { porta } = await iniciar()
  console.log(`Frayz (servidor do protótipo, modo teste) em http://127.0.0.1:${porta}/   (Ctrl+C para parar)`)
}
