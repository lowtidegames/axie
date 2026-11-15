// VERDE: guarda que bateria de testes já passou, e para QUAL versão do código.
// Por quê: a mesma bateria rodada de novo na mesma versão é tempo perdido; e push sem `npm test` verde não pode sair.
//
//   node tools/verde.mjs rodar <bateria> "<comando>" [--de-novo]   roda; se sair 0, grava em .cache/verde.json
//   node tools/verde.mjs status                                    mostra o que está verde e se vale para a versão atual
//
// "Versão" = hash da ÁRVORE DE TRABALHO inteira (mudanças não commitadas e arquivos novos não ignorados),
// feito num índice temporário (o índice real do git não é tocado). Depois do commit, HEAD^{tree} bate com ela.
// Se o comando tem argumentos extras (ex.: npm test -- --test-name-pattern x), é rodada parcial: roda sempre e não grava.
// Só usa o que vem no Node 22.
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ARQUIVO_VERDE = '.cache/verde.json'

export function raizDoGit(cwd = process.cwd()) {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return cwd }
}

/** Hash da árvore de trabalho inteira (null se não for repositório git). */
export function arvoreDeTrabalho(raiz) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-indice-'))
  try {
    const env = { ...process.env, GIT_INDEX_FILE: path.join(dir, 'indice') }
    const o = { cwd: raiz, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
    execFileSync('git', ['add', '-A'], o)
    return execFileSync('git', ['write-tree'], o).trim()
  } catch { return null } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

/** Caminhos que `npm test` (bateria "servidor") nunca lê: mudar só eles não muda o resultado do teste.
 *  Regra do dono: commit só de texto, painel ou equipe não repete os 3–4 min de teste. */
export const FORA_DO_CODIGO = ['docs', '.claude', 'CLAUDE.md', 'PASSAGEM.md', 'STATUS.md', 'README.md']
export const BATERIAS_COM_FILTRO = ['servidor']

/** Hash da árvore `arvore` sem os caminhos de FORA_DO_CODIGO (null se falhar). */
export function arvoreDeCodigo(raiz, arvore) {
  if (!arvore) return null
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-codigo-'))
  try {
    const env = { ...process.env, GIT_INDEX_FILE: path.join(dir, 'indice') }
    const o = { cwd: raiz, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
    execFileSync('git', ['read-tree', arvore], o)
    execFileSync('git', ['rm', '--cached', '-r', '-q', '-f', '--ignore-unmatch', '--', ...FORA_DO_CODIGO], o)
    return execFileSync('git', ['write-tree'], o).trim()
  } catch { return null } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

export function arvoreDoHead(raiz) {
  try { return execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null }
}

export function lerVerde(raiz) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(raiz, ARQUIVO_VERDE), 'utf8'))
    return d && typeof d === 'object' ? d : {}
  } catch { return {} }
}

export function gravarVerde(raiz, bateria, arvore, em = Date.now()) {
  const d = lerVerde(raiz)
  d[bateria] = { arvore, em }
  if (BATERIAS_COM_FILTRO.includes(bateria)) { const codigo = arvoreDeCodigo(raiz, arvore); if (codigo) d[bateria].codigo = codigo }
  fs.mkdirSync(path.join(raiz, '.cache'), { recursive: true })
  fs.writeFileSync(path.join(raiz, ARQUIVO_VERDE), JSON.stringify(d, null, 2) + '\n')
}

export function hhmm(ms) {
  return new Date(ms).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) + ' BRT'
}

/** A bateria está verde para esta árvore? Devolve o registro ou null. */
export function verdePara(raiz, bateria, arvore) {
  const r = lerVerde(raiz)[bateria]
  if (!r || !arvore) return null
  if (r.arvore === arvore) return r
  if (r.codigo && BATERIAS_COM_FILTRO.includes(bateria) && r.codigo === arvoreDeCodigo(raiz, arvore)) return r
  return null
}

/** Roda o comando (herda a tela). Devolve o código de saída. */
export async function rodar(bateria, comando, extras = [], { raiz = raizDoGit(), deNovo = false, log = console.log } = {}) {
  const parcial = extras.length > 0
  const arvore = arvoreDeTrabalho(raiz)
  if (!parcial && !deNovo) {
    const ja = verdePara(raiz, bateria, arvore)
    if (ja) { log(`[verde] ${bateria}: já verde às ${hhmm(ja.em)} nesta mesma versão; use --de-novo para repetir`); return 0 }
  }
  const aspas = (s) => (/^[A-Za-z0-9_@%+=:,./-]+$/.test(s) ? s : `'${String(s).replace(/'/g, `'\\''`)}'`)
  const linha = [comando, ...extras.map(aspas)].join(' ')
  const codigo = await new Promise((resolve) => {
    const filho = spawn(linha, { shell: true, stdio: 'inherit', cwd: raiz })
    filho.on('exit', (c, s) => resolve(c ?? (s ? 1 : 0)))
    filho.on('error', (e) => { console.error('[verde] Não consegui rodar: ' + e.message); resolve(1) })
  })
  if (codigo === 0 && !parcial && arvore) gravarVerde(raiz, bateria, arvore)
  return codigo
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [modo, ...resto0] = process.argv.slice(2)
  const deNovo = resto0.includes('--de-novo')
  const resto = resto0.filter((x) => x !== '--de-novo')
  if (modo === 'rodar') {
    const [bateria, comando, ...extras] = resto[0] === '--' ? resto.slice(1) : resto
    if (!bateria || !comando) { console.error('Uso: node tools/verde.mjs rodar <bateria> "<comando>" [--de-novo]'); process.exit(64) }
    process.exitCode = await rodar(bateria, comando, extras, { deNovo })
  } else {
    const raiz = raizDoGit(), arvore = arvoreDeTrabalho(raiz), v = lerVerde(raiz)
    const nomes = Object.keys(v)
    console.log(nomes.length ? nomes.map((n) => `${n}: ${hhmm(v[n].em)} (versão atual: ${v[n].arvore === arvore ? 'sim' : 'não'})`).join('\n') : 'Nada verde ainda.')
  }
}
