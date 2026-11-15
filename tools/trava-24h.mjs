// TRAVA DAS 24 HORAS: ação SEM VOLTA só roda com aprovação do dono feita há mais de 24 h e menos de 7 dias.
// Lê estudio/aprovacoes-irreversiveis.json: {"aprovacoes": [{"acao": "trecho do comando", "aprovado_em": "2026-11-10T21:00:00-03:00"}]}
// A aprovação vale se "acao" (6+ letras) aparece no comando.
// Conta como sem volta no jogo:
//   git push --force / -f / +ramo / --delete / :ramo (reescreve ou apaga ramo no GitHub)
//   railway delete · railway volume delete (apaga o serviço ou o disco com o banco)
//   apagar pasta inteira (rm -r) DENTRO do projeto ou em /data — menos node_modules, dist, tests/saida
//   apagar arquivo de banco (*.db, *.db-wal, *.db-shm) dentro do projeto ou em /data
//   DELETE na API de DNS/registro de domínio de provedores conhecidos (hoje Cloudflare e Porkbun; ajustar quando o dono escolher)
// Fora do projeto (pastas temporárias, outras pastas) nada é travado.
// Sem aprovação válida: sai 2 e mostra a linha pronta que o dono acrescenta.
// Também bloqueia o Bash de escrever em estudio/aprovacoes-irreversiveis.json (só o dono aprova).
// Uso (gancho PreToolUse do Bash): node tools/trava-24h.mjs gatilho
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { argsDoPrograma, dataCurta, escreveNoArquivo, lerEvento, lerJson, palavras, partes, posicionais, raizDoProjeto, rodarGatilho } from './guardas-comum.mjs'
import { pastaDoComando } from './guarda-privacidade.mjs'

export const ARQUIVO_APROVACOES = 'estudio/aprovacoes-irreversiveis.json'
const HORA = 3600 * 1000
export const ESPERA_MS = 24 * HORA
export const VALIDADE_MS = 7 * 24 * HORA
const LIVRES = ['dist', 'tests/saida', '.cache'] // saídas geradas (e qualquer node_modules)
const DADOS = process.env.ESTUDIO_PASTA_DADOS || '/data'

function pushSemVolta(p) {
  const g = p.findIndex((w) => /(^|[\\/])git(\.exe)?$/.test(w))
  if (g === -1) return null
  let i = g + 1
  while (i < p.length && p[i].startsWith('-')) i += ['-C', '-c'].includes(p[i]) ? 2 : 1
  if (p[i] !== 'push') return null
  const args = p.slice(i + 1)
  if (args.some((a) => a.startsWith('--force') || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a))) return 'git push forçado (reescreve o histórico)'
  if (args.some((a) => /^\+\S/.test(a))) return 'git push forçado (+ramo)'
  if (args.some((a) => a === '--delete' || a === '-d' || /^:\S/.test(a))) return 'apagar ramo no GitHub'
  return null
}

function railwaySemVolta(pedaco) {
  const a = argsDoPrograma(pedaco, 'railway')
  if (!a) return null
  const pos = posicionais(a)
  if (pos[0] === 'delete') return 'apagar o projeto/serviço no Railway'
  if (pos[0] === 'volume' && pos[1] === 'delete') return 'apagar o disco (volume) com o banco no Railway'
  return null
}

const dentro = (base, alvo) => { const r = path.relative(base, alvo); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)) }

function protegido(abs, raiz) {
  if (dentro(DADOS, abs)) return true
  if (!dentro(raiz, abs)) return false
  const rel = path.relative(raiz, abs).split(path.sep).join('/')
  if (rel.split('/').includes('node_modules')) return false
  return !LIVRES.some((l) => rel === l || rel.startsWith(l + '/'))
}

function apagaSemVolta(p, pasta, raiz) {
  const lista = p[0] === 'sudo' ? p.slice(1) : p
  if (lista[0] !== 'rm') return null
  const opcoes = lista.slice(1).filter((w) => w.startsWith('-'))
  const alvos = lista.slice(1).filter((w) => !w.startsWith('-'))
  const recursivo = opcoes.some((o) => o === '--recursive' || /^-[a-zA-Z]*[rR]/.test(o))
  const ruins = alvos.filter((a) => {
    if (/[$`]/.test(a)) return true // variável: não dá para saber onde cai
    const abs = path.resolve(pasta, a.replace(/^~(?=$|[\\/])/, os.homedir()))
    if (/\.db(-wal|-shm)?$|\.db\*?$/.test(a) && (dentro(raiz, abs) || dentro(DADOS, abs))) return true
    return recursivo && protegido(abs, raiz)
  })
  return ruins.length ? `apagar ${recursivo ? 'pasta' : 'arquivo de banco'} (${ruins.join(', ')})` : null
}

function apagaNaApi(pedaco) {
  if (!/api\.cloudflare\.com|porkbun\.com\/api/i.test(pedaco)) return null
  if (/\bcurl\b/.test(pedaco) && /(?:-X\s*|--request[=\s]+)["']?DELETE\b/i.test(pedaco)) {
    // apagar REGISTRO de DNS não espera 24 h (basta o "sim" na conversa); soltar zona/domínio continua com 24 h
    if (/api\.cloudflare\.com\/client\/v4\/zones\/[^/\s"']+\/dns_records\//i.test(pedaco)) return null
    return 'apagar na Cloudflare/Porkbun pela API (domínio ou zona)'
  }
  if (/porkbun\.com\/api\/\S*delete/i.test(pedaco)) return 'apagar na Porkbun pela API (DNS ou domínio)'
  return null
}

/** Lista de { pedaco, oque } com cada ação sem volta do comando. */
export function acharIrreversiveis(cmd, pasta, raiz = pasta) {
  const achados = []
  for (const pedaco of partes(cmd)) {
    const p = palavras(pedaco)
    const oque = pushSemVolta(p) || railwaySemVolta(pedaco) || apagaSemVolta(p, pasta, raiz) || apagaNaApi(pedaco)
    if (oque) achados.push({ pedaco, oque })
  }
  return achados
}

export function lerAprovacoes(raiz) {
  const r = lerJson(path.join(raiz, ARQUIVO_APROVACOES))
  if (r === null) return { lista: [] }
  if (r.erro) return { lista: [], erro: r.erro }
  const lista = Array.isArray(r.dados) ? r.dados : Array.isArray(r.dados?.aprovacoes) ? r.dados.aprovacoes : []
  return { lista: lista.filter((a) => a && typeof a.acao === 'string' && a.acao.trim().length >= 6) }
}

/** 'ok' | 'cedo' (menos de 24 h) | 'vencida' (mais de 7 dias) | 'nenhuma'. */
export function situacao(pedaco, lista, agora) {
  let melhor = { estado: 'nenhuma' }
  for (const a of lista.filter((x) => pedaco.includes(x.acao.trim()))) {
    const t = Date.parse(a.aprovado_em)
    if (Number.isNaN(t)) continue
    const idade = agora.getTime() - t
    if (idade >= ESPERA_MS && idade <= VALIDADE_MS) return { estado: 'ok' }
    if (idade < ESPERA_MS) melhor = { estado: 'cedo', libera: new Date(t + ESPERA_MS) }
    else if (melhor.estado === 'nenhuma') melhor = { estado: 'vencida', em: new Date(t) }
  }
  return melhor
}

const isoBrasilia = (d) => new Date(d.getTime() - 3 * HORA).toISOString().slice(0, 19) + '-03:00'

export function decidir(entrada, opcoes = {}) {
  const evento = lerEvento(entrada)
  const cmd = evento?.tool_input?.command || ''
  if (!cmd) return { codigo: 0 }
  if (escreveNoArquivo(cmd, 'aprovacoes-irreversiveis.json')) {
    return { codigo: 2, msg: `Só o dono escreve em ${ARQUIVO_APROVACOES}. Mostre a ele a linha e peça para ele mesmo acrescentar.` }
  }
  const raiz = opcoes.raiz ?? raizDoProjeto(evento)
  const agora = opcoes.agora ?? new Date()
  const achados = acharIrreversiveis(cmd, pastaDoComando(cmd, evento?.cwd || raiz), raiz)
  if (!achados.length) return { codigo: 0 }
  const { lista, erro } = lerAprovacoes(raiz)
  for (const a of achados) {
    const s = situacao(a.pedaco, lista, agora)
    if (s.estado === 'ok') continue
    let porque = 'Não há aprovação do dono para isto.'
    if (s.estado === 'cedo') porque = `A aprovação existe, mas ainda não fez 24 h: libera em ${dataCurta(s.libera)}.`
    if (s.estado === 'vencida') porque = `A aprovação de ${dataCurta(s.em)} venceu (mais de 7 dias).`
    if (erro) porque += ` (${ARQUIVO_APROVACOES} com erro: ${erro})`
    const linha = JSON.stringify({ acao: a.pedaco, aprovado_em: isoBrasilia(agora) })
    return {
      codigo: 2,
      msg: `Ação SEM VOLTA bloqueada (regra das 24 h): ${a.oque}\n  ${a.pedaco}\n${porque}\n` +
        'Primeiro a parada que tem volta (pausar compras e saques). A decisão sem volta espera uma noite de sono.\n' +
        (s.estado === 'cedo' ? '' : `Para aprovar, o dono acrescenta em "aprovacoes" de ${ARQUIVO_APROVACOES}:\n  ${linha}\n` +
          `Vale de ${dataCurta(new Date(agora.getTime() + ESPERA_MS))} até ${dataCurta(new Date(agora.getTime() + VALIDADE_MS))}.`),
    }
  }
  return { codigo: 0 }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'gatilho') {
  rodarGatilho((d) => decidir(d))
}
