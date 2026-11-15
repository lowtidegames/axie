// TRAVA DA ECONOMIA: número de economia não muda sem linha no registro de decisões (docs/decisions.md).
// (a) `git commit` que muda NÚMEROS de shared/config.js só passa se o MESMO commit acrescenta uma linha com data
//     em docs/decisions.md. Mudança só em comentário ou texto, sem número, passa.
//     (Modo rápido: o economista muda o número e escreve a linha "dd/mm/aaaa — economia: ... — aprovado pelo dono".)
// (b) `railway variables --set NOME=...` de uma variável de economia (lista em estudio/segredos-de-economia.json,
//     campo "variaveis") só passa se docs/decisions.md já tiver uma linha com a data de HOJE e o NOME.
// Também bloqueia o Bash de escrever em estudio/segredos-de-economia.json (só o dono mexe na lista).
// Uso (gancho PreToolUse do Bash): node tools/trava-economia.mjs gatilho
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { argsDoPrograma, escreveNoArquivo, lerEvento, lerJson, lerTexto, partes, raizDoProjeto, rodarGatilho, temData, temDataDeHoje } from './guardas-comum.mjs'
import { pastaDoComando } from './guarda-privacidade.mjs'
import { variaveisDoRailway } from './trava-congelado.mjs'

export const ARQUIVO_CONFIG = 'estudio/segredos-de-economia.json'
export const PADRAO = { variaveis: [], arquivos: ['shared/config.js'], decisoes: 'docs/decisions.md' }

export function lerConfig(raiz) {
  const r = lerJson(path.join(raiz, ARQUIVO_CONFIG))
  if (r === null) return { ...PADRAO }
  if (r.erro) return { ...PADRAO, erro: r.erro }
  const d = r.dados || {}
  return {
    variaveis: Array.isArray(d.variaveis) ? d.variaveis.map(String) : [],
    arquivos: Array.isArray(d.arquivos) && d.arquivos.length ? d.arquivos.map(String) : PADRAO.arquivos,
    decisoes: typeof d.decisoes === 'string' && d.decisoes ? d.decisoes : PADRAO.decisoes,
  }
}

function rodarGit(args, cwd) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return null }
}

const semComentario = (l) => l.replace(/(^|\s)\/\/.*$/, '').replace(/\s+/g, ' ').trim()

/** Diff (-U0) de UM arquivo → mudou algum número fora de comentário? */
export function mudouNumero(diff) {
  const tirados = [], postos = []
  for (const l of String(diff || '').split('\n')) {
    if (l.startsWith('+++') || l.startsWith('---')) continue
    if (l.startsWith('-')) tirados.push(semComentario(l.slice(1)))
    else if (l.startsWith('+')) postos.push(semComentario(l.slice(1)))
  }
  const sobra = [...postos]
  const sobraTirados = []
  for (const t of tirados) {
    const i = sobra.indexOf(t)
    if (i >= 0) sobra.splice(i, 1); else sobraTirados.push(t)
  }
  return [...sobra, ...sobraTirados].some((l) => /\d/.test(l))
}

/** Diff (-U0) do registro de decisões → acrescentou alguma linha com data? */
export function acrescentouDecisao(diff) {
  return String(diff || '').split('\n').some((l) => l.startsWith('+') && !l.startsWith('+++') && temData(l))
}

function decidirCommit(cmd, pasta, cfg, git) {
  const trecho = (cmd.match(/\bcommit\b([^&;|\n]*)/) || ['', ''])[1]
  const tudo = /(^|\s)(--all|-[a-zA-Z]*a[a-zA-Z]*)(?=\s|$)/.test(trecho) || /\bgit\b[^&;|\n]*\sadd\b/.test(cmd)
  const base = tudo ? ['diff', 'HEAD', '-U0', '--'] : ['diff', '--cached', '-U0', '--']
  const mudados = cfg.arquivos.filter((a) => mudouNumero(git([...base, a], pasta)))
  if (!mudados.length) return { codigo: 0 }
  if (acrescentouDecisao(git([...base, cfg.decisoes], pasta))) return { codigo: 0 }
  const hoje = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  return {
    codigo: 2,
    msg: `Número de ECONOMIA mudou (${mudados.join(', ')}) sem linha nova em ${cfg.decisoes} neste commit.\n` +
      `Acrescente no topo de ${cfg.decisoes} (e inclua no commit) uma linha assim:\n` +
      `  - ${hoje} — economia: <o que mudou, de X para Y> (simulador: <resultado>) — aprovado pelo dono\n` +
      'Lembrete: número novo espera 24 h antes de ir ao ar; o mesmo número muda no máximo 1 vez por semana.',
  }
}

function decidirVariaveis(cmd, raiz, cfg, agora) {
  if (!cfg.variaveis.length) return { codigo: 0 }
  const tentadas = []
  for (const pedaco of partes(cmd)) {
    const a = argsDoPrograma(pedaco, 'railway')
    const nomes = a && variaveisDoRailway(a)
    if (nomes) for (const n of nomes) if (cfg.variaveis.includes(n)) tentadas.push({ nome: n, pedaco })
  }
  if (!tentadas.length) return { codigo: 0 }
  const hoje = lerTexto(path.join(raiz, cfg.decisoes)).split(/\r?\n/).filter((l) => temDataDeHoje(l, agora))
  const faltam = [...new Set(tentadas.filter((t) => !hoje.some((l) => l.includes(t.nome))).map((t) => t.nome))]
  if (!faltam.length) return { codigo: 0 }
  return {
    codigo: 2,
    msg: `Variável de ECONOMIA sem decisão de hoje: ${faltam.join(', ')}\nBloqueado: ${tentadas[0].pedaco}\n` +
      `Antes, ponha em ${cfg.decisoes} uma linha com a data de hoje e o nome (ex.: "- dd/mm/aaaa — ${faltam[0]}: de X para Y, porque ... — aprovado pelo dono").`,
  }
}

export function decidir(entrada, opcoes = {}) {
  const evento = lerEvento(entrada)
  const cmd = evento?.tool_input?.command || ''
  if (!cmd) return { codigo: 0 }
  if (escreveNoArquivo(cmd, 'segredos-de-economia.json')) {
    return { codigo: 2, msg: `Só o dono muda ${ARQUIVO_CONFIG} (a lista de variáveis de economia vigiadas). Peça a ele.` }
  }
  const raiz = opcoes.raiz ?? raizDoProjeto(evento)
  const cfg = lerConfig(raiz)
  const v = decidirVariaveis(cmd, raiz, cfg, opcoes.agora ?? new Date())
  if (v.codigo) return v
  if (/\bgit\b(?:\s+-[cC]\s+\S+)*\s+commit\b/.test(cmd)) return decidirCommit(cmd, pastaDoComando(cmd, evento?.cwd || raiz), cfg, opcoes.git ?? rodarGit)
  return { codigo: 0 }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'gatilho') {
  rodarGatilho((d) => decidir(d))
}
