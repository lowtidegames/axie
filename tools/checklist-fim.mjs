// CHECKLIST DE FIM DE TURNO (gancho Stop): o turno não termina com o painel ou o pacote para trás.
// Só olha COMMITS (git log), nunca a árvore em edição; só usa git, é rápido.
//  (a) último commit em public/ server/ shared/ tests/ mais novo que o último em docs/painel.csv -> atualizar o painel
//  (b) último commit em public/ server/ shared/ mais novo que o último em docs/fila.md -> anotar em "Já subiu"
// "Mais novo" = o commit do painel/pacote não é descendente do commit do código (ordem do git, não relógio).
// Se docs/painel.csv nunca entrou no git, avisa do (a) UMA vez (marca em .cache/checklist-avisou).
// stop_hook_active = true -> sai 0 (nunca laço).
// Uso: node tools/checklist-fim.mjs gatilho
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lerEvento, raizDoProjeto, rodarGatilho } from './guardas-comum.mjs'

export const MSG_PAINEL = 'Atualize o painel do dono: edite docs/painel.csv, envie o CSV ao artefato e faça commit'
export const MSG_PACOTE = 'Anote no docs/fila.md (Já subiu) o que entrou'

function rodarGit(args, cwd) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null }
}

export function decidir(entrada, opcoes = {}) {
  const evento = lerEvento(entrada)
  if (evento?.stop_hook_active) return { codigo: 0 }
  const raiz = opcoes.raiz ?? raizDoProjeto(evento)
  const git = opcoes.git ?? rodarGit
  const ultimo = (caminhos) => git(['log', '-1', '--format=%H', '--', ...caminhos], raiz) || null
  const maisNovo = (codigo, doc) => codigo && codigo !== doc && (!doc || git(['merge-base', '--is-ancestor', doc, codigo], raiz) !== null)

  const codigo = ultimo(['public', 'server', 'shared', 'tests'])
  if (!codigo) return { codigo: 0 }
  const painel = ultimo(['docs/painel.csv'])
  const pacote = ultimo(['docs/fila.md'])
  const motivos = []
  if (maisNovo(codigo, painel)) {
    if (!painel) {
      const marca = path.join(raiz, '.cache/checklist-avisou')
      if (!fs.existsSync(marca)) {
        try { fs.mkdirSync(path.dirname(marca), { recursive: true }); fs.writeFileSync(marca, String(Date.now())) } catch { /* sem marca: avisa de novo, ok */ }
        motivos.push(MSG_PAINEL + ' (docs/painel.csv ainda não existe no git; este aviso vem uma vez)')
      }
    } else motivos.push(MSG_PAINEL)
  }
  if (maisNovo(codigo && ultimo(['public', 'server', 'shared']), pacote)) motivos.push(MSG_PACOTE)
  return motivos.length ? { codigo: 2, msg: motivos.join('\n') } : { codigo: 0 }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'gatilho') {
  rodarGatilho((d) => decidir(d))
}
