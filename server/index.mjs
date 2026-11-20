// Frayz — servidor do protótipo (sem dinheiro, sem token, sem carteira). Node 22, zero dependências.
// Serve public/ (inclusive public/reino/, o Keepmile) e /shared/ e a API em /api/ (jogo antigo: relato da tarefa 7 e
// tests/servidor/api.test.js; Keepmile: /api/reino/..., contrato em docs/reino/servidor.md).
// Uso: `npm run servidor` · variáveis: PORTA (padrão 4800), HOST (padrão 127.0.0.1), DB_PATH (padrão ./dados/frayz-teste.db),
// TRUST_PROXY=1 + TRUST_PROXY_IPS=ip1,ip2 (lidas no arranque: só pedido que CHEGA de um IP da lista tem o X-Forwarded-For lido;
// sem a lista, o cabeçalho é ignorado e o boot avisa no log).
// REINO_SEGREDO (opcional, 32+ letras): segredo da estrada do dia do Keepmile (sem ela, o sorteado na migração v5).
// Chaves de emergência, lidas a CADA pedido: MANUTENCAO=1 (toda /api/* responde 503) · SAVE_SO_LEITURA=1 (todo POST 503; GET funciona).
// Nos testes: import { iniciar } e passe { dbPath: ':memory:', porta: 0 }. `limites` sobrepõe qualquer item de PARAMS_SERVIDOR.
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { abrirBanco } from './db.mjs'
import { criarJogo } from './jogo.mjs'
import { PARAMS_SERVIDOR, chaveDoIp, criarTratador, lerCorpo, soLeitura } from './api.mjs'
import { criarReino } from './reino/reino.mjs'
import { MODO_REINO, rotasDoReino } from './reino/rotas.mjs'

export async function iniciar({
  porta = Number(process.env.PORTA) || 4800,
  host = process.env.HOST || '127.0.0.1',
  dbPath = process.env.DB_PATH || './dados/frayz-teste.db',
  agora = Date.now,
  log = console.log,
  limites = {},
  proxies, // IPs dos proxies confiáveis; padrão: TRUST_PROXY=1 + TRUST_PROXY_IPS no arranque
  reino: opcoesDoReino = {}, // Keepmile: { params, energia, segredo } (só testes)
} = {}) {
  const db = abrirBanco(dbPath, { modo: 'teste', agora })
  const P = { ...PARAMS_SERVIDOR, ...limites }
  const jogo = criarJogo(db, {
    agora, soLeitura, tempoDoTurnoMs: P.tempoDoTurnoMs, folgaDoRelogioMs: P.folgaDoRelogioMs, maxBonecosPorConta: P.maxBonecosPorConta,
    paginaDeBonecos: P.paginaDeBonecos, validadeDaSessaoH: P.validadeDaSessaoH, renovarSessaoMs: P.renovarSessaoMs, abandonoMin: P.abandonoMin,
    lutasEncerradasPorConta: P.lutasEncerradasPorConta, lutasNoHistoricoDoBoneco: P.lutasNoHistoricoDoBoneco, log,
    ...(limites.energiaPorDia === undefined ? {} : { energiaPorDia: limites.energiaPorDia }), // só testes; o número é de shared/config.js
  })
  // Keepmile (jogo de reino): rotas em /api/reino/... e /public/reino/modo.json respondido pelo servidor
  const reino = criarReino(db, { agora, log, soLeitura, validadeDaSessaoH: P.validadeDaSessaoH, ...opcoesDoReino })
  const extras = { rotas: rotasDoReino(reino, { lerCorpo, chaveDoIp }), estaticos: { '/public/reino/modo.json': MODO_REINO } }
  const tratar = criarTratador({ jogo, agora, log, limites, banco: db, extras, ...(proxies === undefined ? {} : { proxies }) })
  const servidor = createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, tratar)
  servidor.on('close', () => { try { db.close() } catch { /* já fechado */ } })
  await new Promise((ok, falha) => {
    servidor.once('error', falha)
    servidor.listen(porta, host, ok)
  })
  return { servidor, db, jogo, reino, porta: servidor.address().port }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { porta } = await iniciar()
  console.log(`Frayz (servidor do protótipo, modo teste) em http://127.0.0.1:${porta}/   (Ctrl+C para parar)`)
}
