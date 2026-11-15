// Frayz — servidor estático MÍNIMO só para o protótipo local (sem dinheiro, sem conta, sem banco).
// Serve a raiz do repositório com o MESMO desenho de pastas da página de teste (`/public/`, `/shared/`), só leitura, sem listar pasta.
// `/` e endereços antigos (`/arte.html`) redirecionam para `/public/...`. Nada fora de public/, shared/ e do index da raiz.
// Uso: `npm run dev` (porta da variável PORTA; padrão 4700) · ou importe { iniciar } nos testes.
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { lerArquivo, redirecionamento, resolverArquivo } from './estatico.mjs'

/** Caminho do pedido → arquivo permitido (só `public/`, `shared/` e o `index.html` da raiz). Regra única em server/estatico.mjs. */
export const resolver = (urlPath) => resolverArquivo(urlPath, { raiz: true })

export function iniciar({ porta = Number(process.env.PORTA) || 4700, host = '127.0.0.1' } = {}) {
  const servidor = createServer(async (req, res) => {
    const cab = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { ...cab, Allow: 'GET, HEAD' }); return res.end() }
    const url = new URL(req.url, 'http://local')
    const destino = await redirecionamento(url.pathname, { raiz: true })
    if (destino) { res.writeHead(302, { ...cab, Location: destino + url.search }); return res.end() }
    try {
      const arq = await lerArquivo(url.pathname, { raiz: true })
      if (!arq) { res.writeHead(404, { ...cab, 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado') }
      res.writeHead(200, { ...cab, 'Content-Type': arq.tipo, 'Content-Length': arq.dados.length })
      res.end(req.method === 'HEAD' ? undefined : arq.dados)
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
