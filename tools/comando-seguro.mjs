// Comando seguro (estúdio): barra, ANTES de rodar, os comandos de shell que já quebraram
// o trabalho 3 vezes cada (lições em docs/licoes/, a criar):
//   1. `pkill -f "<padrão>"` / `pgrep -f ... | xargs kill` sem o truque do colchete: o padrão aparece na linha
//      de comando do próprio shell, e o kill mata o shell que pediu. Certo: kill $(pgrep -f "[p]adrão").
//   2. Comando que o bash nem consegue ler (aspas sem fechar, heredoc sem a linha de fim): quebra no meio.
//   3. Heredoc com delimitador SEM aspas (<<EOF) e crase ou $( no corpo: o shell troca o texto antes de gravar
//      e o arquivo sai diferente. Certo: <<'EOF' ou a ferramenta de escrita.
//   4. `node -e "..."` com crase dentro de aspas duplas: o shell roda a crase antes do node.
// Uso (gancho PreToolUse do Bash): node tools/comando-seguro.mjs gatilho
// Teste: tests/travas.test.mjs (bloco "comando seguro").
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { lerEvento, partes, palavras, rodarGatilho } from './guardas-comum.mjs'

const LIBERAR = 'para liberar: reescreva como na regra acima (não há aprovação que libere; é só o jeito de escrever)'

/** pkill/pgrep -f com padrão que casa com a própria linha do shell (sem [x]). */
function pkillPerigoso(cmd) {
  for (const pedaco of partes(cmd.replace(/\$\(([^)]*)\)/g, ' ; $1 ; '))) {
    const p = palavras(pedaco)
    const i = p.findIndex((w) => /(^|\/)(pkill|pgrep)$/.test(w))
    if (i === -1) continue
    const args = p.slice(i + 1)
    const comF = args.some((w) => /^-[a-zA-Z]*f[a-zA-Z]*$/.test(w) || w === '--full')
    if (!comF) continue
    const padrao = args.filter((w) => !w.startsWith('-')).pop()
    if (!padrao) continue
    if (/\[[^\]]+\]/.test(padrao)) continue   // truque do colchete: o padrão não casa com ele mesmo
    const so = p[i].endsWith('pgrep')
    if (so && !/\bkill\b|xargs/.test(cmd)) continue   // pgrep só lista: não mata ninguém
    return pedaco
  }
  return null
}

/** O bash consegue ler o comando? (bash -n: só lê, não roda nada) */
function sintaxe(cmd) {
  const r = spawnSync('bash', ['-n', '-c', cmd], { encoding: 'utf8', timeout: 5000 })
  if (r.error) return null   // sem bash na máquina: não julga
  const erro = (r.stderr || '').trim()
  if (r.status !== 0) return erro.split('\n')[0] || 'o bash não conseguiu ler o comando'
  if (/here-document .* delimited by end-of-file/.test(erro)) return 'heredoc sem a linha de fim (' + erro.split('\n')[0] + ')'
  return null
}

/** Heredoc com delimitador sem aspas e crase ou $( no corpo. */
function heredocTrocado(cmd) {
  const re = /<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n([\s\S]*?)\n\s*\2\s*(?:\n|$)/g
  for (let m; (m = re.exec(cmd)); ) {
    if (m[1]) continue   // <<'EOF' ou <<"EOF": o corpo vai como está
    if (/`|\$\(/.test(m[3])) return '<<' + m[2]
  }
  return null
}

/** node -e / -p com crase dentro de aspas duplas. */
function nodeComCrase(cmd) {
  const m = cmd.match(/\bnode\s+(?:[^\s"']+\s+)*?(?:-e|-p|--eval|--print)\s+"((?:[^"\\]|\\.)*)"/)
  return m && /(^|[^\\])`/.test(m[1]) ? 'node -e "...`...`..."' : null
}

export function avaliar(cmd) {
  cmd = String(cmd || '')
  if (!cmd.trim()) return { codigo: 0 }
  const pk = pkillPerigoso(cmd)
  if (pk) return { codigo: 2, msg: `Bloqueado: ${pk}\n` + '`pkill -f`/`pgrep -f` com esse padrão casa com a linha do próprio shell e mata quem pediu (3 vezes já).\n' + 'Regra: kill $(pgrep -f "[p]adrão")  (colchete na primeira letra).\n' + LIBERAR }
  const sx = sintaxe(cmd)
  if (sx) return { codigo: 2, msg: `Bloqueado: o bash não lê este comando: ${sx}\n` + 'Regra: arquivo grande pela ferramenta de escrita; script em arquivo e rodar em chamada separada.\n' + LIBERAR }
  const hd = heredocTrocado(cmd)
  if (hd) return { codigo: 2, msg: `Bloqueado: heredoc ${hd} sem aspas com crase ou $( no corpo: o shell troca o texto antes de gravar.\n` + "Regra: use <<'EOF' (com aspas) ou a ferramenta de escrita.\n" + LIBERAR }
  const nc = nodeComCrase(cmd)
  if (nc) return { codigo: 2, msg: `Bloqueado: ${nc}: o shell roda a crase antes do node.\n` + "Regra: aspas simples por fora, ou o script num arquivo.\n" + LIBERAR }
  return { codigo: 0 }
}

export function decidir(entrada) {
  const evento = lerEvento(entrada)
  if (!evento || (evento.tool_name && evento.tool_name !== 'Bash')) return { codigo: 0 }
  return avaliar(evento.tool_input?.command)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'gatilho') {
  rodarGatilho((d) => decidir(d))
}
