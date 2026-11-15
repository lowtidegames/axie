// CONTEXTO DE COMEÇO DE TURNO (gancho UserPromptSubmit): imprime UMA linha que vira contexto do Claude.
// "Agora hh:mm BRT · painel: último commit há N min · pacote: N itens · verde: servidor hh:mm (versão atual: sim/não), e2e hh:mm (sim/não)"
// Nunca bloqueia: qualquer erro = não imprime nada e sai 0.
// Uso: node tools/contexto-turno.mjs gatilho
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lerEvento, lerTexto, raizDoProjeto } from './guardas-comum.mjs'
import { arvoreDeTrabalho, hhmm, lerVerde } from './verde.mjs'

/** Linhas da tabela "No pacote" (sem cabeçalho, sem separador, sem a linha de vazio). */
export function itensDoPacote(texto) {
  const m = String(texto).match(/^##\s+No pacote[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m)
  if (!m) return 0
  const linhas = m[1].split(/\r?\n/).filter((l) => l.trim().startsWith('|'))
  return linhas.slice(2).filter((l) => {
    const c = l.split('|')[1]?.trim()
    return c && !/^[—–-]+$/.test(c) && !/vazio/i.test(l)
  }).length
}

export function linha({ raiz, agora = Date.now(), git, arvore } = {}) {
  const g = git ?? ((a) => { try { return execFileSync('git', a, { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' } })
  const ct = Number(g(['log', '-1', '--format=%ct', '--', 'docs/painel.csv']))
  const painel = ct ? `último commit há ${Math.max(0, Math.round((agora - ct * 1000) / 60000))} min` : 'sem commit ainda'
  const itens = itensDoPacote(lerTexto(path.join(raiz, 'docs/fila.md')))
  const v = lerVerde(raiz)
  const atual = arvore === undefined ? arvoreDeTrabalho(raiz) : arvore
  const verde = (n) => (v[n] ? `${n} ${hhmm(v[n].em).replace(' BRT', '')} (${v[n].arvore === atual ? 'sim' : 'não'})` : `${n} nunca`)
  return `Agora ${hhmm(agora)} · painel: ${painel} · pacote: ${itens} ${itens === 1 ? 'item' : 'itens'} · verde: ${verde('servidor')}, ${verde('e2e')}`
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'gatilho') {
  let dados = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => (dados += c))
  process.stdin.on('end', () => {
    try { console.log(linha({ raiz: raizDoProjeto(lerEvento(dados)) })) } catch { /* nada */ }
    process.exit(0)
  })
}
