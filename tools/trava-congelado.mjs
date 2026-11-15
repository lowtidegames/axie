// TRAVA DO CONGELADO: com o estúdio fora do modo ABERTO, nada do jogo vai ao ar.
// Lê estudio/modo.json: {"modo": "ABERTO" | "CONGELADO" | "EMERGENCIA", "desde": "...", "motivo": "..."}.
//   ABERTO = pode publicar (sempre com o "sim" do dono). CONGELADO e EMERGENCIA = publicação bloqueada.
//   Sem o arquivo = ABERTO. Arquivo quebrado ou valor desconhecido = bloqueado (na dúvida, trava).
// O que conta como publicar no jogo (Railway + GitHub):
//   railway up / deploy / redeploy / down / rollback · railway variables --set (troca variável de produção)
//   git push para main ou master (também --all, --mirror e push sem destino estando na main) · gh pr merge
//   npm run deploy/publicar/lancar/release · API do Railway (backboard.railway.com) com mutação de deploy/variável/apagar
// SEMPRE liberado (é a parada de emergência), em qualquer modo, sem nada encadeado:
//   railway variables --set só com as chaves de emergência (COMPRAS_PAUSADAS, SAQUES_PAUSADOS, TESOURARIA_PARADA,
//   SAVE_SO_LEITURA, MANUTENCAO, MERCADO_PAUSADO) · npm run emergencia:<algo> (quando existir).
// git push para o ramo `teste` (o dia a dia) NÃO é bloqueado.
// Também bloqueia o Bash de escrever em estudio/modo.json: só o dono congela e descongela.
// Uso (gancho PreToolUse do Bash): node tools/trava-congelado.mjs gatilho
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { argsDoPrograma, escreveNoArquivo, lerEvento, lerJson, palavras, partes, posicionais, raizDoProjeto, rodarGatilho } from './guardas-comum.mjs'
import { pastaDoComando } from './guarda-privacidade.mjs'

export const ARQUIVO_MODO = 'estudio/modo.json'
export const MODOS_VALIDOS = ['ABERTO', 'CONGELADO', 'EMERGENCIA']
export const CHAVES_DE_EMERGENCIA = ['COMPRAS_PAUSADAS', 'SAQUES_PAUSADOS', 'TESOURARIA_PARADA', 'SAVE_SO_LEITURA', 'MANUTENCAO', 'MERCADO_PAUSADO']
const ENCADEADO = /;|&|\||`|\$\(|>|<|\r|\n/

/** Lê o modo: { bloqueado, modo, desde, motivo, quebrado, desconhecido }. */
export function lerModo(raiz) {
  const r = lerJson(path.join(raiz, ARQUIVO_MODO))
  if (r === null) return { bloqueado: false, modo: 'aberto (sem arquivo)' }
  if (r.erro) return { bloqueado: true, quebrado: true, modo: '?', motivo: `estudio/modo.json com erro (${r.erro})` }
  const modo = String(r.dados?.modo ?? '').trim().toLowerCase()
  const extra = { modo, desde: r.dados?.desde, motivo: r.dados?.motivo }
  if (modo === 'aberto') return { bloqueado: false, ...extra }
  if (['congelado', 'emergencia', 'emergência'].includes(modo)) return { bloqueado: true, ...extra }
  return { bloqueado: true, desconhecido: true, ...extra }
}

/** Variáveis que um `railway variables ... --set K=V` (ou `railway variable set K=V`) troca. null = não é troca de variável. */
export function variaveisDoRailway(args) {
  const pos = posicionais(args)
  if (!['variables', 'variable', 'vars'].includes(pos[0])) return null
  const nomes = []
  for (let k = 0; k < args.length; k++) {
    const m = args[k].match(/^(?:--set|-s)=(.+)$/)
    if (m) { nomes.push(m[1].split('=')[0]); continue }
    if (args[k] === '--set' || args[k] === '-s') { if (args[k + 1]) nomes.push(args[++k].split('=')[0]); continue }
  }
  if (pos[1] === 'set') for (const w of pos.slice(2)) if (w.includes('=')) nomes.push(w.split('=')[0])
  return nomes.length ? nomes : null
}

/** Parada de emergência pura (sempre liberada)? */
export function ehEmergencia(cmd) {
  const c = String(cmd).trim()
  if (ENCADEADO.test(c)) return false
  if (/^npm run emergencia:\S+/.test(c)) return true
  const a = argsDoPrograma(c, 'railway')
  const nomes = a && variaveisDoRailway(a)
  return Boolean(nomes && nomes.every((n) => CHAVES_DE_EMERGENCIA.includes(n)))
}

function ramoAtual(pasta) {
  try {
    return execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], { cwd: pasta, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch { return null }
}

const PROTEGIDOS = ['main', 'master']

/** O pedaço é um git push que chega em main/master? Devolve o motivo ou null. `ramo` pode ser trocado nos testes. */
export function pushNaMain(pedaco, pasta, ramo = ramoAtual) {
  const p = palavras(pedaco)
  const g = p.findIndex((w) => /(^|[\\/])git(\.exe)?$/.test(w))
  if (g === -1) return null
  let i = g + 1
  while (i < p.length && p[i].startsWith('-')) i += ['-C', '-c'].includes(p[i]) ? 2 : 1
  if (p[i] !== 'push') return null
  const args = p.slice(i + 1)
  if (args.some((a) => ['--all', '--mirror', '--branches'].includes(a))) return 'push de todos os ramos'
  const comValor = ['-o', '--push-option', '--repo', '--receive-pack', '--exec']
  const pos = []
  for (let k = 0; k < args.length; k++) {
    if (comValor.includes(args[k])) { k++; continue }
    if (!args[k].startsWith('-')) pos.push(args[k])
  }
  const refspecs = pos.slice(1)
  if (!refspecs.length) {
    const atual = ramo(pasta)
    if (atual === null) return 'push sem destino e não consegui ver o ramo atual'
    return PROTEGIDOS.includes(atual) ? `push do ramo atual (${atual})` : null
  }
  for (const r of refspecs) {
    let destino = (r.includes(':') ? r.split(':').pop() : r).replace(/^\+/, '').replace(/^refs\/heads\//, '')
    if (destino === 'HEAD') destino = ramo(pasta) ?? 'HEAD'
    if (PROTEGIDOS.includes(destino)) return `push para ${destino}`
  }
  return null
}

/** Mutações da API do Railway que publicam, tiram do ar ou trocam variável (a publicação contínua do test usa a API). */
export const MUTACOES_RAILWAY = /\b(?:serviceInstanceDeploy\w*|serviceInstanceRedeploy|deploymentRedeploy|deploymentRollback|deploymentRemove|deploymentStop|variableUpsert|variableCollectionUpsert|variableDelete|serviceDelete|volumeDelete|environmentDelete)\b/

/** O comando publica alguma coisa? Devolve { pedaco, oque } ou null. */
export function acharPublicacao(cmd, pasta, ramo) {
  if (/backboard\.railway\.(?:com|app)/i.test(cmd) && MUTACOES_RAILWAY.test(cmd)) return { pedaco: cmd.slice(0, 160), oque: 'publicação ou troca no Railway pela API' }
  for (const pedaco of partes(cmd)) {
    const r = argsDoPrograma(pedaco, 'railway')
    if (r) {
      const pos = posicionais(r)
      if (['up', 'deploy', 'redeploy', 'rollback'].includes(pos[0])) return { pedaco, oque: 'publicação no Railway' }
      if (pos[0] === 'down') return { pedaco, oque: 'tirar do ar no Railway' }
      if (variaveisDoRailway(r)) return { pedaco, oque: 'troca de variável do servidor no Railway (reinicia o jogo)' }
    }
    const gh = argsDoPrograma(pedaco, 'gh')
    if (gh && posicionais(gh)[0] === 'pr' && posicionais(gh)[1] === 'merge') return { pedaco, oque: 'merge de PR (vai para a main)' }
    if (/^(?:npm|pnpm|yarn)(?:\.cmd)?\s+(?:run\s+)?(?:deploy|publicar|lancar|lançar|release)[\w:-]*(?:\s|$)/.test(pedaco)) return { pedaco, oque: 'script de publicação' }
    const push = pushNaMain(pedaco, pasta, ramo)
    if (push) return { pedaco, oque: push }
  }
  return null
}

export function decidir(entrada, opcoes = {}) {
  const evento = lerEvento(entrada)
  const cmd = evento?.tool_input?.command || ''
  if (!cmd) return { codigo: 0 }
  const raiz = opcoes.raiz ?? raizDoProjeto(evento)
  if (escreveNoArquivo(cmd, 'estudio/modo.json')) {
    return { codigo: 2, msg: 'Só o dono muda estudio/modo.json (congelar e descongelar). Ele edita o arquivo, ou aprova a sua edição pelo editor, nunca pelo terminal.' }
  }
  if (ehEmergencia(cmd)) return { codigo: 0 }
  const modo = lerModo(raiz)
  if (!modo.bloqueado) return { codigo: 0 }
  const achou = acharPublicacao(cmd, pastaDoComando(cmd, evento?.cwd || raiz), opcoes.ramo)
  if (!achou) return { codigo: 0 }
  const titulo = ['emergencia', 'emergência'].includes(modo.modo) ? 'O estúdio está em EMERGENCIA' : modo.modo === 'congelado' ? 'O estúdio está CONGELADO' : 'Modo do estúdio não reconhecido'
  const valores = modo.desconhecido || modo.quebrado ? `\nNa dúvida, trava. Valores válidos de "modo": ${MODOS_VALIDOS.join(', ')}.` : ''
  return {
    codigo: 2,
    msg: `${titulo}${modo.desde ? ' desde ' + modo.desde : ''}.${modo.motivo ? ' Motivo: ' + modo.motivo + '.' : ''}${valores}\n` +
      `Bloqueado (${achou.oque}): ${achou.pedaco}\n` +
      'Nada vai ao ar. Para liberar, o dono troca "modo" para "ABERTO" em estudio/modo.json (e dá o "sim" para esta publicação).\n' +
      `A parada de emergência continua liberada: railway variables --set CHAVE=1 (chaves: ${CHAVES_DE_EMERGENCIA.join(', ')}).`,
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'gatilho') {
  rodarGatilho((d) => decidir(d))
}
