// Frayz — arquivos estáticos do servidor: `public/` na raiz do site e `shared/` em /shared/.
// Só leitura, sem listar pasta, sem sair das raízes (nem por elo simbólico). Mesma regra do server/dev.mjs.
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
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

/** Caminho do pedido → arquivo dentro de uma das duas raízes (ou null). */
export async function resolverArquivo(urlPath) {
  let p
  try { p = decodeURIComponent(urlPath) } catch { return null }
  if (p.includes('\0') || p.includes('\\')) return null
  if (p === '/' || p === '') p = '/index.html'
  let base = PUBLICO, rel = p
  if (p === '/shared' || p.startsWith('/shared/')) { base = COMPARTILHADO; rel = p.slice('/shared'.length) }
  const alvo = path.resolve(base, '.' + (rel.startsWith('/') ? rel : '/' + rel))
  if (alvo !== base && !alvo.startsWith(base + path.sep)) return null
  try {
    const real = await realpath(alvo)
    const baseReal = await realpath(base)
    if (real !== baseReal && !real.startsWith(baseReal + path.sep)) return null
    const s = await stat(real)
    return s.isFile() ? real : null
  } catch { return null }
}

/** Lê o arquivo: { dados, tipo } ou null. */
export async function lerArquivo(urlPath) {
  const arq = await resolverArquivo(urlPath)
  if (!arq) return null
  const dados = await readFile(arq)
  return { dados, tipo: TIPOS[path.extname(arq).toLowerCase()] || 'application/octet-stream' }
}
