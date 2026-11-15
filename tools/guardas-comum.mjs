// Peças comuns das travas do jogo (trava-congelado, trava-economia, trava-24h e as que vierem).
// Não é gancho sozinho: as travas importam daqui. Só usa o que vem no Node 22.
import fs from 'node:fs'
import path from 'node:path'

/** Pasta do projeto: CLAUDE_PROJECT_DIR, senão o cwd do evento. */
export function raizDoProjeto(evento) {
  return process.env.CLAUDE_PROJECT_DIR || evento?.cwd || process.cwd()
}

/** Lê um JSON do estúdio: arquivo que falta = null; arquivo quebrado = { erro }; certo = { dados }. */
export function lerJson(arquivo) {
  let texto
  try { texto = fs.readFileSync(arquivo, 'utf8') } catch { return null }
  try { return { dados: JSON.parse(texto) } } catch (e) { return { erro: e.message } }
}

export function lerTexto(arquivo) {
  try { return fs.readFileSync(arquivo, 'utf8') } catch { return '' }
}

export function lerEvento(entrada) {
  try { return JSON.parse(entrada) } catch { return null }
}

/** Quebra o comando em pedaços por &&, ||, ;, | e quebra de linha (simples: não entende aspas). */
export function partes(cmd) {
  return String(cmd || '').split(/&&|\|\||;|\||\r?\n/).map((s) => s.trim()).filter(Boolean)
}

/** Palavras de um pedaço, tirando aspas simples e duplas das pontas. */
export function palavras(pedaco) {
  const out = []
  const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g
  for (let m; (m = re.exec(pedaco)); ) out.push(m[1] ?? m[2] ?? m[3])
  return out
}

/** Se o pedaço chama o programa `nome` (direto, npx, npm exec, VAR=x antes), devolve as palavras depois dele. */
export function argsDoPrograma(pedaco, nome) {
  const p = palavras(pedaco)
  const re = new RegExp(`(^|[\\\\/])${nome}(\\.cmd|\\.exe)?(@\\S+)?$`)
  const i = p.findIndex((w) => re.test(w))
  if (i === -1) return null
  const antes = p.slice(0, i).filter((w) => !/^\w+=/.test(w))
  const lancadores = ['npx', 'npm', 'exec', 'pnpm', 'yarn', 'dlx', 'bunx', '--', '-y', '--yes', 'sudo', 'env']
  if (!antes.every((w) => lancadores.includes(w))) return null
  return p.slice(i + 1)
}

/** Só as palavras que não são opção (não começam com "-"). */
export function posicionais(args) {
  return args.filter((w) => !w.startsWith('-'))
}

/** O comando tenta ESCREVER, mover ou apagar um arquivo que só o dono mexe? */
export function escreveNoArquivo(cmd, nomeDoArquivo) {
  const nome = nomeDoArquivo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(nome, 'i')
  if (new RegExp(`>{1,2}\\s*["']?[^\\s"'|;&]*${nome}`, 'i').test(cmd)) return true
  for (const p of partes(cmd)) {
    if (!re.test(p)) continue
    if (/^(?:sudo\s+)?(tee|cp|mv|rm|install|ln|truncate|touch|dd)\b/.test(p)) return true
    if (/\bsed\s+(?:-\S+\s+)*-\w*i/.test(p) || /\bperl\s+-\w*i/.test(p)) return true
    if (/writeFile|appendFile|write_text|open\(/i.test(p)) return true
  }
  return false
}

/** Uma linha de texto tem uma data (09/11, 09/11/2026 ou 2026-11-09)? */
export const temData = (linha) => /(?<!\d)\d{1,2}\/\d{1,2}(?:\/\d{2,4})?(?!\d)|\d{4}-\d{2}-\d{2}/.test(linha)

/** Datas de hoje no fuso de Brasília e no relógio da máquina (evita bloqueio falso perto da meia-noite). */
export function datasDeHoje(agora = new Date()) {
  const fusos = ['America/Sao_Paulo', Intl.DateTimeFormat().resolvedOptions().timeZone]
  return fusos.map((timeZone) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(agora).map((x) => [x.type, x.value]))
    return { a: p.year, m: p.month, d: p.day }
  })
}

export function temDataDeHoje(linha, agora = new Date()) {
  return datasDeHoje(agora).some(({ a, m, d }) =>
    linha.includes(`${a}-${m}-${d}`) || new RegExp(`(?<![\\d/])${d}/${m}(?:/(?:${a}|${a.slice(2)}))?(?![\\d/])`).test(linha))
}

/** Hora para o dono ler (Brasília). */
export function dataCurta(d) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d) + ' BRT'
}

export function caminhoRelativo(raiz, arquivo) {
  return path.relative(raiz, path.resolve(raiz, arquivo)).split(path.sep).join('/')
}

/** Lê o evento na entrada padrão, chama decidir(texto) e sai 0 (deixa) ou 2 (bloqueia), com a mensagem no stderr. */
export function rodarGatilho(decidir) {
  let dados = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => (dados += c))
  process.stdin.on('end', () => {
    let r
    try { r = decidir(dados) } catch (e) { console.error('[trava] erro interno: ' + e.message); process.exit(1) } // 1 = não bloqueia
    if (r.msg) console.error(r.msg)
    process.exit(r.codigo)
  })
}
