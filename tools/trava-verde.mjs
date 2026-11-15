// TRAVA DO VERDE: `git push` só sai se `npm test` ficou verde NESTA versão do código.
// (a) push exige .cache/verde.json com a bateria "servidor" cuja árvore é a de HEAD^{tree}.
//     Se HEAD já é o que está no servidor remoto (nada novo para enviar), passa.
// (b) o Bash não pode escrever em .cache/verde.json (senão o verde vira forjável): só `tools/verde.mjs` grava.
// Uso (gancho PreToolUse do Bash): node tools/trava-verde.mjs gatilho
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { escreveNoArquivo, lerEvento, partes, raizDoProjeto, rodarGatilho } from './guardas-comum.mjs'
import { pastaDoComando } from './guarda-privacidade.mjs'
import { arvoreDeCodigo, lerVerde } from './verde.mjs'

function rodarGit(args, cwd) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null }
}

const ehPush = (cmd) => partes(cmd).some((p) => /^(?:\w+=\S+\s+)*git\b(?:\s+-[cC]\s+\S+)*(?:\s+--?\S+)*\s+push\b/.test(p))

export function decidir(entrada, opcoes = {}) {
  const evento = lerEvento(entrada)
  const cmd = evento?.tool_input?.command || ''
  if (!cmd) return { codigo: 0 }
  if (escreveNoArquivo(cmd, 'verde.json')) {
    return { codigo: 2, msg: 'O arquivo .cache/verde.json só é gravado por tools/verde.mjs (rodando o teste de verdade). Rode: npm test' }
  }
  if (!ehPush(cmd)) return { codigo: 0 }
  const git = opcoes.git ?? rodarGit
  const pasta = pastaDoComando(cmd, evento?.cwd || opcoes.raiz || raizDoProjeto(evento))
  const raiz = opcoes.raiz ?? git(['rev-parse', '--show-toplevel'], pasta) ?? pasta
  const head = git(['rev-parse', 'HEAD'], raiz)
  const arvore = git(['rev-parse', 'HEAD^{tree}'], raiz)
  if (!head || !arvore) return { codigo: 0 } // não é repositório: nada a conferir
  const remoto = git(['rev-parse', '@{u}'], raiz)
  if (remoto && remoto === head) return { codigo: 0 } // nada novo para enviar
  const v = lerVerde(raiz).servidor
  if (v && v.arvore === arvore) return { codigo: 0 }
  // Só mudou texto, painel ou equipe (FORA_DO_CODIGO de verde.mjs) desde o último verde: o código testado é o mesmo.
  const filtrar = opcoes.arvoreDeCodigo ?? arvoreDeCodigo
  if (v && v.codigo && v.codigo === filtrar(raiz, arvore)) return { codigo: 0 }
  return {
    codigo: 2,
    msg: 'Rode npm test nesta versão antes de enviar (o último teste verde é de outra versão do código, ou não houve). ' +
      'Se só faltou commitar, faça o commit e rode npm test de novo; ele recusa repetir se nada mudou.',
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'gatilho') {
  rodarGatilho((d) => decidir(d))
}
