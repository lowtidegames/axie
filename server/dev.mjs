// Frayz — servidor estático MÍNIMO só para o protótipo local (sem dinheiro, sem conta, sem banco).
// Serve a raiz do repositório com o MESMO desenho de pastas da página de teste (`/public/`, `/shared/`), só leitura, sem listar pasta.
// `/` e endereços antigos (`/arte.html`) redirecionam para `/public/...`. Nada fora de public/, shared/ e do index da raiz.
// Uso: `npm run dev` (porta da variável PORTA; padrão 4700) · ou importe { iniciar } nos testes.
import { createServer } from 'node:http'
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLICO = path.join(RAIZ, 'public')
const COMPARTILHADO = path.join(RAIZ, 'shared')

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

/** Caminho do pedido → arquivo permitido (só `public/`, `shared/` e o `index.html` da raiz). Nunca sai da raiz do repositório. */
export async function resolver(urlPath) {
  let p
  try { p = decodeURIComponent(urlPath) } catch { return null }
  if (p.includes('\0') || p.includes('\\')) return null
  if (p === '/' || p === '') p = '/index.html'
  let base
  if (p === '/index.html' || p === '/.nojekyll') base = null
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

/** Endereço antigo (`/arte.html`, `/`) → o mesmo desenho de pastas da página de teste (`/public/...`). */
async function redirecionar(pathname) {
  if (pathname === '/') return '/public/'
  if (pathname === '/index.html' || pathname.startsWith('/public/') || pathname.startsWith('/shared/')) return null
  return (await resolver('/public' + pathname)) ? '/public' + pathname : null
}

export function iniciar({ porta = Number(process.env.PORTA) || 4700, host = '127.0.0.1' } = {}) {
  const servidor = createServer(async (req, res) => {
    const cab = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { ...cab, Allow: 'GET, HEAD' }); return res.end() }
    const url = new URL(req.url, 'http://local')
    const destino = await redirecionar(url.pathname)
    if (destino) { res.writeHead(302, { ...cab, Location: destino + url.search }); return res.end() }
    const arq = await resolver(url.pathname)
    if (!arq) { res.writeHead(404, { ...cab, 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado') }
    try {
      const dados = await readFile(arq)
      res.writeHead(200, { ...cab, 'Content-Type': TIPOS[path.extname(arq).toLowerCase()] || 'application/octet-stream', 'Content-Length': dados.length })
      res.end(req.method === 'HEAD' ? undefined : dados)
    } catch { res.writeHead(500, cab); res.end('Erro') }
  })
  return new Promise((ok, falha) => {
    servidor.once('error', falha)
    servidor.listen(porta, host, () => ok(servidor))
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const s = await iniciar()
  console.log(`Frayz (protótipo local) em http://127.0.0.1:${s.address().port}/   (Ctrl+C para parar)`)
}
