// Porão — servidor HTTP local (node:http, sem dependências). Liga SÓ em 127.0.0.1.
// Rodar: node porao/servidor/index.mjs   (porta 4900, ou PORAO_PORTA). Banco: ./dados/porao-teste.db.
// O servidor decide tudo (porao/servidor/jogo.mjs); a tela só manda comandos e mostra o que volta.
// Respostas: { ok:true, acao, resultado, estado, repetido? } | { ok:true, estado, segundos, online, rendeu, eventos } (GET /api/estado)
//            | { ok:false, erro, codigo } com status 400/403/404/405/409/413/415/429/500/503.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { abrirBancoPorao, CAMINHO_PADRAO } from './banco.mjs'
import { agir, verEstado } from './jogo.mjs'
import { carregarNomes } from './nomes-local.mjs'
import { CABECALHOS_DE_SEGURANCA, criarLimite } from '../../server/api.mjs'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const PORAO = path.resolve(AQUI, '..')
export const HOST_UNICO = '127.0.0.1'
export const PORTA_PADRAO = 4900
/** Limites técnicos do servidor (não são números de jogo). */
export const LIMITES = { corpoMaxBytes: 4 * 1024, pedidos: { max: 600, janelaMs: 60_000 } }

// Pastas servidas: nada fora delas. servidor/, dados/ e nomes.local.json NUNCA entram aqui.
const PASTA_SHARED = path.join(PORAO, '..', 'shared')
const SHARED_LIBERADOS = ['rng.js', 'sha256.js']
const PASTAS = { tela: path.join(PORAO, 'tela'), comum: path.join(PORAO, 'comum'), arte: path.join(PORAO, 'arte.local') }
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

const emManutencao = () => process.env.MANUTENCAO === '1'
const soLeitura = () => process.env.SAVE_SO_LEITURA === '1'

const ROTAS_POST = [
  { re: /^\/api\/imprimir$/, acao: 'imprimir', dados: () => ({}) },
  { re: /^\/api\/fundir$/, acao: 'fundir', dados: (_m, c) => ({ ideia: c.ideia }) },
  { re: /^\/api\/lancar$/, acao: 'lancar', dados: (_m, c) => ({ cartaId: c.cartaId }) },
  { re: /^\/api\/projeto\/(\d{1,9})\/tapete$/, acao: 'tapete', dados: m => ({ projetoId: Number(m[1]) }) },
  { re: /^\/api\/batida$/, acao: 'batida', dados: (_m, c) => ({ escolha: c.escolha }) },
  { re: /^\/api\/luxo\/([a-z0-9_]{1,40})$/, acao: 'luxo', dados: m => ({ luxoId: m[1] }) },
  { re: /^\/api\/contrato$/, acao: 'contrato', dados: (_m, c) => ({ projetoId: c.projetoId, influenciadorId: c.influenciadorId }) },
  { re: /^\/api\/contrato\/(\d{1,9})\/resposta$/, acao: 'resposta', dados: (m, c) => ({ projetoId: Number(m[1]), resposta: c.resposta }) },
  { re: /^\/api\/prestigio$/, acao: 'prestigio', dados: () => ({}) },
]
const STATUS_POR_CODIGO = { chave_reusada: 409 }

function enviar(res, status, corpo, extra = {}) {
  const texto = typeof corpo === 'string' ? corpo : JSON.stringify(corpo)
  res.writeHead(status, {
    ...CABECALHOS_DE_SEGURANCA,
    'Cache-Control': 'no-store',
    'Content-Type': typeof corpo === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(texto),
    ...extra,
  })
  res.end(texto)
}
const erro = (res, status, mensagem, codigo) => enviar(res, status, { ok: false, erro: mensagem, codigo })

/** Lê o corpo com limite. Devolve { dados } ou { status, erro, codigo }. */
function lerCorpo(req, max) {
  return new Promise(resolve => {
    const tipo = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
    if (tipo !== 'application/json') {
      req.resume()
      return resolve({ status: 415, erro: 'O pedido precisa ser JSON.', codigo: 'tipo_invalido' })
    }
    if (Number(req.headers['content-length']) > max) {
      req.resume()
      return resolve({ status: 413, erro: 'Pedido grande demais.', codigo: 'corpo_grande' })
    }
    const partes = []
    let total = 0
    let passou = false
    req.on('data', c => {
      total += c.length
      if (total > max) { passou = true; partes.length = 0; return }
      if (!passou) partes.push(c)
    })
    req.on('error', () => resolve({ status: 400, erro: 'Pedido interrompido.', codigo: 'corpo_invalido' }))
    req.on('end', () => {
      if (passou) return resolve({ status: 413, erro: 'Pedido grande demais.', codigo: 'corpo_grande' })
      const texto = Buffer.concat(partes).toString('utf8')
      if (texto.trim() === '') return resolve({ dados: {} })
      let j
      try { j = JSON.parse(texto) } catch { return resolve({ status: 400, erro: 'O pedido veio quebrado (JSON inválido).', codigo: 'corpo_invalido' }) }
      if (j === null || typeof j !== 'object' || Array.isArray(j)) return resolve({ status: 400, erro: 'O pedido precisa ser um objeto JSON.', codigo: 'corpo_invalido' })
      resolve({ dados: j })
    })
  })
}

/** Caminho do pedido → arquivo dentro das pastas liberadas, ou null. Nunca sai das pastas. */
export function arquivoDoCaminho(urlPath, pastas = PASTAS) {
  let p
  try { p = decodeURIComponent(urlPath) } catch { return null }
  if (p.includes('\0') || p.includes('\\') || !p.startsWith('/')) return null
  const partes = p.split('/').slice(1)
  if (partes.some(s => s === '..' || s === '.' || s.startsWith('.') && s !== '.')) return null
  let base = pastas.tela
  if (partes[0] === 'shared') {
    // só o sorteio que regras.js importa; o resto de shared/ é do outro jogo
    if (partes.length !== 2 || !SHARED_LIBERADOS.includes(partes[1])) return null
    base = PASTA_SHARED; partes.shift()
  } else if (partes[0] === 'comum') { base = pastas.comum; partes.shift() }
  else if (partes[0] === 'arte.local') { base = pastas.arte; partes.shift() }
  if (partes.length === 0 || partes.at(-1) === '') { if (base !== pastas.tela) return null; partes[partes.length - 1] = 'index.html'; if (partes.length > 1 && partes[0] === '') partes.shift() }
  const arq = path.resolve(base, ...partes)
  if (!arq.startsWith(base + path.sep)) return null
  const tipo = TIPOS[path.extname(arq).toLowerCase()]
  if (!tipo) return null
  return { arq, tipo, base }
}

async function servirEstatico(req, res, urlPath, pastas) {
  const alvo = arquivoDoCaminho(urlPath, pastas)
  if (!alvo) return erro(res, 404, 'Não achei esse arquivo.', 'nao_achado')
  // Link simbólico não leva para fora da pasta: o caminho REAL tem de ficar dentro da pasta base real.
  let real
  try {
    real = await fs.promises.realpath(alvo.arq)
    const baseReal = await fs.promises.realpath(alvo.base)
    if (!real.startsWith(baseReal + path.sep)) return erro(res, 404, 'Não achei esse arquivo.', 'nao_achado')
  } catch { return erro(res, 404, 'Não achei esse arquivo.', 'nao_achado') }
  fs.readFile(real, (e, dados) => {
    if (e) return erro(res, 404, 'Não achei esse arquivo.', 'nao_achado')
    res.writeHead(200, { ...CABECALHOS_DE_SEGURANCA, 'Cache-Control': 'no-cache', 'Content-Type': alvo.tipo, 'Content-Length': dados.length })
    res.end(req.method === 'HEAD' ? undefined : dados)
  })
}

/**
 * Sobe o servidor. Opções: porta (0 = livre), host (só 127.0.0.1), caminhoBanco, caminhoNomes, limitePedidos, agora.
 * Devolve { porta, server, db, fechar() }.
 */
export async function iniciarServidor({
  porta = PORTA_PADRAO, host = HOST_UNICO, caminhoBanco = CAMINHO_PADRAO, caminhoNomes = 'porao/nomes.local.json',
  limitePedidos = LIMITES.pedidos, agora = Date.now, log = () => {}, pastas = PASTAS,
} = {}) {
  if (host !== HOST_UNICO) throw new Error(`O porão só liga em ${HOST_UNICO} (pedido: "${host}"). Recusado.`)
  if (!Number.isInteger(porta) || porta < 0 || porta > 65535) throw new Error('Porta inválida.')
  const textos = carregarNomes(caminhoNomes)
  const db = abrirBancoPorao(caminhoBanco, { modo: 'teste', agora })
  const contar = criarLimite(limitePedidos, agora)
  let portaReal = porta

  const hostsOk = () => new Set([`127.0.0.1:${portaReal}`, `localhost:${portaReal}`])
  const origensOk = () => new Set([`http://127.0.0.1:${portaReal}`, `http://localhost:${portaReal}`])

  async function tratar(req, res) {
    const url = new URL(req.url, 'http://x')
    const metodo = req.method
    // Host e Origin: só localhost (barra outra página do navegador e DNS rebinding).
    if (!hostsOk().has(String(req.headers.host || '').toLowerCase())) return erro(res, 403, 'Endereço não permitido.', 'host_invalido')
    const origem = req.headers.origin
    if (origem !== undefined && !origensOk().has(String(origem).toLowerCase())) return erro(res, 403, 'Origem não permitida.', 'origem_invalida')

    if (!url.pathname.startsWith('/api/')) {
      if (metodo !== 'GET' && metodo !== 'HEAD') return erro(res, 405, 'Método não permitido.', 'metodo_invalido')
      return servirEstatico(req, res, url.pathname, pastas)
    }
    // Cabeçalho próprio em TODA rota /api: uma página de fora não consegue mandá-lo sem pedir permissão (CORS).
    if (req.headers['x-porao'] !== '1') return erro(res, 403, 'Pedido sem a marca do jogo. Abra o jogo pela tela do porão.', 'sem_marca')
    if (emManutencao()) return erro(res, 503, 'O porão está em manutenção. Volte daqui a pouco.', 'manutencao')
    if (!contar(req.socket.remoteAddress || 'x')) return erro(res, 429, 'Calma: pedidos demais. Espere um pouco.', 'limite')

    if (url.pathname === '/api/estado') {
      if (metodo !== 'GET') return erro(res, 405, 'Método não permitido.', 'metodo_invalido')
      return enviar(res, 200, verEstado(db, agora(), { textos, gravar: !soLeitura() }))
    }
    let achada = null
    for (const r of ROTAS_POST) { const m = r.re.exec(url.pathname); if (m) { achada = { r, m }; break } }
    if (!achada) return erro(res, 404, 'Rota não existe.', 'nao_achado')
    if (metodo !== 'POST') return erro(res, 405, 'Método não permitido.', 'metodo_invalido')
    if (soLeitura()) { req.resume(); return erro(res, 503, 'O jogo está só para leitura agora. Tente mais tarde.', 'so_leitura') }
    const c = await lerCorpo(req, LIMITES.corpoMaxBytes)
    if (!c.dados) return erro(res, c.status, c.erro, c.codigo)
    const cab = req.headers['idempotency-key']
    const chave = typeof cab === 'string' ? cab : c.dados.chave
    const r = agir(db, { acao: achada.r.acao, dados: achada.r.dados(achada.m, c.dados), chave, agora: agora(), textos })
    if (r.ok) return enviar(res, 200, r)
    enviar(res, STATUS_POR_CODIGO[r.codigo] ?? 400, r)
  }

  const server = http.createServer((req, res) => {
    tratar(req, res).catch(e => {
      log(`erro: ${e?.message}`)
      if (!res.headersSent) erro(res, 500, 'Deu problema aqui dentro. Tente de novo.', 'interno')
      else res.destroy()
    })
  })
  server.headersTimeout = 10_000
  server.requestTimeout = 15_000
  server.keepAliveTimeout = 5_000
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(porta, HOST_UNICO, resolve) })
  portaReal = server.address().port
  return {
    porta: portaReal, server, db,
    fechar: () => new Promise(resolve => { server.close(() => { try { db.close() } catch { /* já fechado */ } resolve() }); server.closeAllConnections() }),
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const porta = process.env.PORAO_PORTA ? Number(process.env.PORAO_PORTA) : PORTA_PADRAO
  iniciarServidor({ porta, log: console.error })
    .then(s => console.log(`Porão no ar: http://127.0.0.1:${s.porta}/`))
    .catch(e => { console.error(e.message); process.exit(1) })
}
