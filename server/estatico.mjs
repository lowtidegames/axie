// Frayz — arquivos estáticos (servidor e server/dev.mjs): o MESMO desenho de pastas da página de teste.
// `/public/...` vem de public/, `/shared/...` de shared/; `/` e endereços antigos (`/arte.html`) redirecionam para `/public/...`.
// Só leitura, sem listar pasta, sem sair das raízes (nem por elo simbólico). Nada de docs/, tests/, server/, .git etc.
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLICO = path.join(RAIZ, 'public')
const COMPARTILHADO = path.join(RAIZ, 'shared')

export const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

/**
 * Caminho do pedido → arquivo permitido, ou null. `raiz: true` (só o server/dev.mjs, que imita a hospedagem parada)
 * também serve o index.html da raiz do repositório.
 */
export async function resolverArquivo(urlPath, { raiz = false } = {}) {
  let p
  try { p = decodeURIComponent(urlPath) } catch { return null }
  if (p.includes('\0') || p.includes('\\')) return null
  if (p === '/' || p === '') p = '/index.html'
  let base
  if (raiz && (p === '/index.html' || p === '/.nojekyll')) base = null
  else if (p.startsWith('/public/')) base = PUBLICO
  else if (p.startsWith('/shared/')) base = COMPARTILHADO
  else return null
  if (p.endsWith('/')) p += 'index.html'
  const alvo = path.resolve(RAIZ, '.' + p)
  const dentro = base ?? RAIZ
  if (base ? !alvo.startsWith(base + path.sep) : path.dirname(alvo) !== RAIZ) return null
  try {
    const real = await realpath(alvo)
    const baseReal = await realpath(dentro)
    if (base ? !real.startsWith(baseReal + path.sep) : path.dirname(real) !== baseReal) return null // elo simbólico para fora
    const s = await stat(real)
    return s.isFile() ? real : null // pasta nunca é listada
  } catch { return null }
}

/** Endereço antigo (`/arte.html`) ou `/` → o mesmo desenho de pastas da página de teste (`/public/...`); senão null. */
export async function redirecionamento(pathname, { raiz = false } = {}) {
  if (pathname === '/') return '/public/'
  if (pathname.startsWith('/public/') || pathname.startsWith('/shared/')) return null
  if (raiz && pathname === '/index.html') return null
  if (!raiz && pathname === '/index.html') return '/public/'
  return (await resolverArquivo('/public' + pathname)) ? '/public' + pathname : null
}

/** Lê o arquivo: { dados, tipo } ou null. */
export async function lerArquivo(urlPath, opcoes) {
  const arq = await resolverArquivo(urlPath, opcoes)
  if (!arq) return null
  const dados = await readFile(arq)
  return { dados, tipo: TIPOS[path.extname(arq).toLowerCase()] || 'application/octet-stream' }
}
