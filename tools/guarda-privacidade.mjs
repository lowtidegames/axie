// GUARDA DE PRIVACIDADE: antes de `git commit` ou `git push`, procura no que vai subir:
//   1. segredos (sempre ligado): chave privada, chave de carteira (64 números ou texto base58 longo), frase secreta
//      de 12/24 palavras, chaves de API conhecidas, arquivos .env / keypair;
//   2. e-mail que não seja "noreply" (o e-mail pessoal do dono, de qualquer pessoa);
//   3. regras de commit do CLAUDE.md: autor com e-mail noreply; mensagem sem "Co-Authored-By",
//      "Claude-Session" ou "Generated with Claude Code";
//   4. palavras proibidas da LISTA PRIVADA: nomes de outros jogos, marcas e pessoas.
//
// A LISTA PRIVADA nunca fica no repositório (ela mesma teria os nomes que não podem aparecer). Vem de:
//   - o arquivo ~/.config/estudio-jogo/palavras-proibidas.txt (uma por linha; "#" = comentário), ou outro em ESTUDIO_PALAVRAS_ARQUIVO;
//   - e/ou a variável ESTUDIO_PALAVRAS_PROIBIDAS (separadas por vírgula).
// Sem a lista, os itens 1 a 3 continuam valendo e o item 4 vira só um aviso (não bloqueia).
//
// Uso (gancho PreToolUse do Bash em .claude/settings.json): node tools/guarda-privacidade.mjs gatilho
// Achou: sai 2 (o Claude Code barra o comando) e diz arquivo:linha e o tipo, sem mostrar o segredo
// (palavra proibida aparece só com as 2 primeiras letras). Só usa o que vem no Node 22.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const ARQUIVO_DA_LISTA = path.join(os.homedir(), '.config', 'estudio-jogo', 'palavras-proibidas.txt')

export function listaDePalavras(env = process.env) {
  const daVariavel = (env.ESTUDIO_PALAVRAS_PROIBIDAS || '').split(',')
  let doArquivo = []
  try {
    doArquivo = fs.readFileSync(env.ESTUDIO_PALAVRAS_ARQUIVO || ARQUIVO_DA_LISTA, 'utf8').split('\n').filter((l) => !l.trim().startsWith('#'))
  } catch { /* sem arquivo */ }
  return [...new Set([...daVariavel, ...doArquivo].map((p) => semAcento(p.trim())).filter((p) => p.length >= 3))]
}

// Troca a palavra proibida por 2 letras + "…", para nunca mostrar a palavra inteira.
export function mascarar(texto, palavras) {
  let r = String(texto)
  for (const p of palavras) {
    const n = semAcento(r)
    let i = n.indexOf(p)
    while (i !== -1) {
      r = r.slice(0, i) + p.slice(0, 2) + '…' + r.slice(i + p.length)
      i = semAcento(r).indexOf(p, i + 3)
    }
  }
  return r
}

// ---------- segredos (sempre ligado) ----------
// Os textos de procura são montados em pedaços para este arquivo não acusar a si mesmo.
const PEM = new RegExp('-----' + 'BEG' + 'IN [A-Z ]*' + 'PRIV' + 'ATE KEY-----')
const B58 = '1-9A-HJ-NP-Za-km-z'
const DETECTORES = [
  ['chave privada (PEM)', (l) => PEM.test(l)],
  ['chave de carteira (lista de 64 números)', (l) => /\[\s*(?:\d{1,3}\s*,\s*){63}\d{1,3}\s*\]/.test(l)],
  // bordas fora do alfabeto do base64 também: um bloco de dados em base64 (arte embutida) não conta como chave
  ['chave de carteira (texto base58 longo)', (l) => new RegExp(`(?<![A-Za-z0-9+/])[${B58}]{86,90}(?![A-Za-z0-9+/=])`).test(l) && !/assinatura|signature|\bsig\b|txid/i.test(l)],
  ['frase secreta (12 a 24 palavras)', (l) => /["'`]\s*(?:[a-z]{3,8}\s+){11,23}[a-z]{3,8}\s*["'`]/.test(l)
    || /(seed|mnemonic|frase secreta|recovery phrase|palavras secretas)\W{1,10}(?:[a-z]{3,8}\s+){11,}/i.test(l)],
  ['chave de API', (l) => /\bsk_[A-Za-z0-9]{20,}|\bsk-ant-[A-Za-z0-9_-]{10,}|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bxox[baprs]-[A-Za-z0-9-]{10,}|\bAKIA[0-9A-Z]{16}\b|api[-_]?key=[A-Za-z0-9-]{16,}/i.test(l)],
  ['e-mail (só "noreply" pode subir)', (l) => (l.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])
    .some((e) => !/noreply/i.test(e) && !/@example\.(com|org|net)$/i.test(e) && !/^git@/i.test(e))],
]
const ARQUIVO_PROIBIDO = /(^|\/)(\.env(\.[^/]*)?|[^/]*\.key|[^/]*keypair[^/]*\.json|id\.json|[^/]*\.pem)$/i
const ARQUIVO_PERMITIDO = /(^|\/)\.env\.(exemplo|example|modelo)$/i

export function detectar(linha) {
  return DETECTORES.filter(([, f]) => f(linha)).map(([nome]) => nome)
}

// ---------- mensagem do commit ----------
const PROIBIDO_NA_MENSAGEM = [/co-authored-by/i, /claude-session/i, /generated with claude code/i]

/**
 * Texto no formato do git → achados. Duas partes:
 * - mensagem: começa numa linha "commit <hash>" e vai até o "diff --git" (toda linha conta);
 * - diff: conta as linhas adicionadas (+) e o caminho do arquivo (+++ b/).
 */
export function procurar(texto, palavras) {
  const achados = []
  let arquivo = '(mensagem)'
  let linha = 0
  let naMensagem = false
  const temPalavra = (s) => palavras.some((p) => semAcento(s).includes(p))
  const anotar = (tipo) => achados.push({ arquivo: mascarar(arquivo, palavras), linha, tipo })
  const conferir = (conteudo) => {
    for (const tipo of detectar(conteudo)) anotar(tipo)
    if (temPalavra(conteudo)) anotar('palavra proibida')
  }
  for (const l of String(texto).split('\n')) {
    const c = l.match(/^commit ([0-9a-f]{7,})/)
    if (c) { naMensagem = true; arquivo = '(mensagem ' + c[1].slice(0, 7) + ')'; linha = 0; continue }
    if (l.startsWith('diff --git')) { naMensagem = false; continue }
    if (naMensagem) {
      linha++
      conferir(l)
      if (PROIBIDO_NA_MENSAGEM.some((re) => re.test(l))) anotar('linha proibida na mensagem (CLAUDE.md)')
      continue
    }
    const m = l.match(/^\+\+\+ b\/(.*)/)
    if (m) {
      arquivo = m[1]
      linha = 0
      if (ARQUIVO_PROIBIDO.test(arquivo) && !ARQUIVO_PERMITIDO.test(arquivo)) anotar('arquivo de segredo')
      if (temPalavra(arquivo)) anotar('palavra proibida no nome do arquivo')
      continue
    }
    const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)
    if (h) { linha = Number(h[1]) - 1; continue }
    if (/^(---|index |new file|deleted file|similarity|rename |old mode|new mode|Binary files)/.test(l)) continue
    if (l.startsWith('+')) { linha++; conferir(l.slice(1)) } else if (l.startsWith(' ')) linha++
  }
  return achados
}

// ---------- ler o comando ----------
const tirarAspas = (s) => String(s).replace(/^["']|["']$/g, '')

export function pastaDoComando(cmd, cwd) {
  let base = cwd || process.cwd()
  const cd = cmd.match(/^\s*cd\s+("[^"]+"|'[^']+'|[^\s&;|]+)\s*(?:&&|;)/)
  if (cd) base = path.resolve(base, tirarAspas(cd[1]))
  const c = cmd.match(/\bgit\s+(?:-c\s+\S+\s+)*-C\s+("[^"]+"|'[^']+'|\S+)/)
  if (c) base = path.resolve(base, tirarAspas(c[1]))
  return base
}

/** Mensagem do commit: -m "x", -am "x", --message=x, -F arquivo, e o texto de um heredoc (<<EOF ... EOF). */
export function mensagensDoComando(cmd, pasta) {
  const msgs = []
  const re = /(?:\s-[a-zA-Z]*m\s*|\s--message[=\s]\s*)("(?:[^"\\]|\\.)*"|'[^']*'|[^\s"'][^\s]*)/g
  for (let m; (m = re.exec(cmd)); ) msgs.push(tirarAspas(m[1]))
  const rf = /(?:\s-F\s*|\s--file[=\s]\s*)("[^"]+"|'[^']+'|[^\s]+)/g
  for (let m; (m = rf.exec(cmd)); ) {
    if (m[1] === '-') continue
    try { msgs.push(fs.readFileSync(path.resolve(pasta, tirarAspas(m[1])), 'utf8')) } catch { /* sem arquivo */ }
  }
  const hd = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n([\s\S]*?)\n\s*\2\s*(?:\n|$)/g
  for (let m; (m = hd.exec(cmd)); ) msgs.push(m[3])
  return msgs.join('\n')
}

/** E-mail do autor do commit: --author, -c user.email, GIT_AUTHOR_EMAIL=, ou a config do git. */
export function emailDoAutor(cmd, pasta, git) {
  const a = cmd.match(/--author[=\s]+("[^"]*"|'[^']*'|\S+)/)
  if (a) { const e = tirarAspas(a[1]).match(/<([^>]*)>/); if (e) return e[1] }
  const c = cmd.match(/-c\s+user\.email=("[^"]*"|'[^']*'|\S+)/)
  if (c) return tirarAspas(c[1])
  const v = cmd.match(/\bGIT_AUTHOR_EMAIL=("[^"]*"|'[^']*'|\S+)/)
  if (v) return tirarAspas(v[1])
  const g = git(['config', 'user.email'], pasta)
  return g === null ? null : g.trim()
}

function rodarGit(args, cwd) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return null }
}

// Arquivos novos (ainda sem git add), no formato de diff, para pegar `git add . && git commit`.
function novosComoDiff(cwd, git) {
  const lista = git(['ls-files', '--others', '--exclude-standard'], cwd) || ''
  let out = ''
  for (const f of lista.split('\n').filter(Boolean)) {
    out += `+++ b/${f}\n@@ -0,0 +1 @@\n`
    try {
      const conteudo = fs.readFileSync(path.resolve(cwd, f))
      if (conteudo.includes(0) || conteudo.length > 5 * 1024 * 1024) continue // binário ou grande demais
      out += conteudo.toString('utf8').split('\n').map((x) => '+' + x).join('\n') + '\n'
    } catch { /* ilegível */ }
  }
  return out
}

export const AVISO_SEM_LISTA = 'Guarda de privacidade: segredos e e-mails conferidos, mas SEM a lista privada de nomes (~/.config/estudio-jogo/palavras-proibidas.txt). Nomes de outros jogos e pessoas não foram conferidos.'

/** `git` pode ser trocado nos testes por uma função (args, cwd) => texto|null. */
export function decidir(entrada, env = process.env, git = rodarGit) {
  let evento
  try { evento = JSON.parse(entrada) } catch { return { codigo: 0 } }
  const cmd = evento?.tool_input?.command || ''
  const eCommit = /\bgit\b(?:\s+-[cC]\s+\S+)*\s+commit\b/.test(cmd)
  const ePush = /\bgit\b(?:\s+-[cC]\s+\S+)*\s+push\b/.test(cmd)
  if (!eCommit && !ePush) return { codigo: 0 }
  const palavras = listaDePalavras(env)
  const pasta = pastaDoComando(cmd, evento?.cwd)
  let texto = ''
  const problemas = []
  if (eCommit) {
    const trecho = (cmd.match(/\bcommit\b([^&;|\n]*)/) || ['', ''])[1]
    const tudo = /(^|\s)(--all|-[a-zA-Z]*a[a-zA-Z]*)(?=\s|$)/.test(trecho)
    const comAdd = /\bgit\b[^&;|\n]*\sadd\b/.test(cmd)
    const d = tudo || comAdd ? (git(['diff', 'HEAD'], pasta) ?? git(['diff', '--cached'], pasta)) : git(['diff', '--cached'], pasta)
    if (d === null) return { codigo: 2, msg: `Guarda de privacidade: não consegui ler o que vai subir em ${pasta}.` }
    texto += d + '\n'
    if (comAdd) texto += novosComoDiff(pasta, git) + '\n'
    const msg = mensagensDoComando(cmd, pasta)
    if (msg) texto += 'commit 0000000\n' + msg + '\n' // a mensagem vai por último (toda linha conta)
    const email = emailDoAutor(cmd, pasta, git)
    if (email !== null && !/noreply/i.test(email)) problemas.push('  autor do commit com e-mail pessoal: use o autor "noreply" do CLAUDE.md')
  }
  if (ePush) {
    const formato = '--format=commit %H%n%ae%n%B'
    const l = git(['log', '-p', formato, '@{u}..HEAD'], pasta) ?? git(['log', '-p', formato, 'HEAD', '--not', '--remotes'], pasta)
    if (l === null) return { codigo: 2, msg: `Guarda de privacidade: não consegui ler os commits que vão subir em ${pasta}.` }
    // o e-mail do autor de cada commit tem de ser "noreply"
    for (const m of l.matchAll(/^commit ([0-9a-f]{7,})\n([^\n]*)\n/gm)) {
      if (!/noreply/i.test(m[2])) problemas.push(`  commit ${m[1].slice(0, 7)}: autor com e-mail pessoal`)
    }
    texto += l.replace(/^(commit [0-9a-f]{7,})\n[^\n]*\n/gm, '$1\n') + '\n'
  }
  const achados = procurar(texto, palavras)
  const linhas = [...problemas, ...achados.slice(0, 20).map((a) => `  ${a.arquivo}${a.linha ? ':' + a.linha : ''} — ${a.tipo}`)]
  if (linhas.length) {
    return { codigo: 2, msg: 'Guarda de privacidade: achei algo que não pode subir (o segredo não é mostrado). Tire antes de continuar:\n' + linhas.join('\n') }
  }
  return palavras.length ? { codigo: 0 } : { codigo: 0, aviso: AVISO_SEM_LISTA }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'gatilho') {
  let dados = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => (dados += c))
  process.stdin.on('end', () => {
    const r = decidir(dados)
    if (r.msg) console.error(r.msg)
    // Aviso sem bloquear: JSON com systemMessage na saída padrão + código 0 (o Claude Code mostra ao usuário).
    if (r.aviso) console.log(JSON.stringify({ systemMessage: r.aviso }))
    process.exit(r.codigo)
  })
}
