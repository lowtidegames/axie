// Frayz — rotas HTTP do servidor (node:http, sem dependências). O servidor decide tudo; a tela só manda comandos.
// Todo corpo é conferido campo a campo: campo desconhecido, tipo errado ou id fora do formato = recusa (400).
// Erros nunca levam pilha; logs nunca levam token nem cabeçalho.
import { ErroDoJogo } from './jogo.mjs'
import { lerArquivo } from './estatico.mjs'

// ---------------------------------------------------------------------------------------------
// Parâmetros do servidor — TODOS PROVISÓRIOS (não são números de economia; segurança e ritmo do protótipo).
// ---------------------------------------------------------------------------------------------
export const PARAMS_SERVIDOR = {
  corpoMaxBytes: 8 * 1024, // corpo JSON maior que isto: 413
  descarteMaxBytes: 1024 * 1024, // depois de recusar, lê e joga fora no máximo isto; passou, corta a conexão
  contasPorIp: { max: 5, janelaMs: 60 * 60 * 1000 }, // criação de conta por IP (IPv6: por /64)
  pedidosPorConta: { max: 240, janelaMs: 60 * 1000 }, // pedidos com sessão, por conta
  pedidosPorIp: { max: 600, janelaMs: 60 * 1000 }, // todos os pedidos de API, por IP
  tempoDoTurnoMs: 20 * 1000, // relógio do turno (o mesmo da tela: 20 s)
  folgaDoRelogioMs: 1500, // tolerância de rede antes de passar a vez
  apelido: { min: 3, max: 20 },
}

export const CABECALHOS_DE_SEGURANCA = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
}

// ---------------------------------------------------------------------------------------------
// limite de pedidos (janela fixa, em memória)
// ---------------------------------------------------------------------------------------------
export function criarLimite({ max, janelaMs }, agora) {
  const mapa = new Map()
  return function contar(chave) {
    const t = agora()
    if (mapa.size > 50_000) for (const [k, v] of mapa) if (t - v.inicio >= janelaMs) mapa.delete(k)
    let v = mapa.get(chave)
    if (!v || t - v.inicio >= janelaMs) { v = { inicio: t, n: 0 }; mapa.set(chave, v) }
    v.n++
    return v.n <= max
  }
}

/** IP do pedido. IPv4 inteiro; IPv6 pelo /64 (os 4 primeiros grupos). Não confia em X-Forwarded-For. */
export function chaveDoIp(endereco) {
  let ip = String(endereco ?? '')
  if (ip.startsWith('::ffff:') && ip.includes('.')) ip = ip.slice(7)
  if (!ip.includes(':')) return ip
  const [esq, dir = ''] = ip.split('::')
  const a = esq ? esq.split(':') : [], b = ip.includes('::') && dir ? dir.split(':') : []
  const grupos = ip.includes('::') ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b] : a
  return grupos.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':') + '::/64'
}

// ---------------------------------------------------------------------------------------------
// conferência de entrada
// ---------------------------------------------------------------------------------------------
const recusa = (codigo, motivo, status = 400) => new ErroDoJogo(status, codigo, motivo)
const ehObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype

const RE = {
  boneco: /^bo_[0-9a-f]{24}$/,
  luta: /^lu_[0-9a-f]{24}$/,
  carta: /^[AB]c\d{1,2}$/,
  lugar: /^[AB][0-2]$/,
  pedido: /^[A-Za-z0-9_-]{8,64}$/,
  apelido: /^[\p{L}\p{N} _.-]+$/u,
}

/** Confere que `corpo` só tem os campos permitidos. */
function soCampos(corpo, permitidos, onde = 'corpo') {
  if (!ehObjeto(corpo)) throw recusa('CORPO_INVALIDO', `O ${onde} precisa ser um objeto JSON.`)
  for (const k of Object.keys(corpo)) if (!permitidos.includes(k)) throw recusa('CAMPO_DESCONHECIDO', `Campo não aceito: ${k.slice(0, 40)}.`)
}
function texto(v, re, nome) {
  if (typeof v !== 'string' || !re.test(v)) throw recusa('CAMPO_INVALIDO', `Campo inválido: ${nome}.`)
  return v
}
function inteiro(v, min, max, nome) {
  if (!Number.isSafeInteger(v) || v < min || v > max) throw recusa('CAMPO_INVALIDO', `Campo inválido: ${nome}.`)
  return v
}

function lerCorpoConta(c) {
  soCampos(c, ['apelido'])
  if (typeof c.apelido !== 'string') throw recusa('CAMPO_INVALIDO', 'Campo inválido: apelido.')
  const apelido = c.apelido.normalize('NFC').trim()
  const { min, max } = PARAMS_SERVIDOR.apelido
  if (apelido.length < min || apelido.length > max || !RE.apelido.test(apelido)) throw recusa('APELIDO_INVALIDO', `Apelido de ${min} a ${max} letras, números, espaço, ponto, traço ou _.`)
  return { apelido }
}

function lerCorpoLuta(c) {
  soCampos(c, ['modo', 'fase', 'time', 'robo'])
  if (c.modo !== 'livre' && c.modo !== 'aventura') throw recusa('CAMPO_INVALIDO', 'Campo inválido: modo (livre ou aventura).')
  if (!Array.isArray(c.time) || c.time.length !== 3) throw recusa('TIME_INVALIDO', 'O time precisa de 3 bonecos.')
  const time = c.time.map((id) => texto(id, RE.boneco, 'time'))
  if (c.modo === 'aventura') {
    if (c.robo !== undefined) throw recusa('CAMPO_DESCONHECIDO', 'Na Aventura o rival é da fase.')
    return { modo: 'aventura', fase: inteiro(c.fase, 1, 99, 'fase'), time }
  }
  if (c.fase !== undefined) throw recusa('CAMPO_DESCONHECIDO', 'Fase só existe na Aventura.')
  if (c.robo !== undefined && c.robo !== 'ganancioso' && c.robo !== 'planejador') throw recusa('CAMPO_INVALIDO', 'Campo inválido: robo.')
  return { modo: 'livre', time, robo: c.robo }
}

function lerCorpoComando(c) {
  soCampos(c, ['seq', 'comando'])
  const seq = inteiro(c.seq, 0, 100_000, 'seq')
  const k = c.comando
  soCampos(k, ['tipo', 'time', 'carta', 'alvo', 'a', 'b'], 'comando')
  const cmd = {}
  if (k.time !== undefined) { if (k.time !== 'A' && k.time !== 'B') throw recusa('CAMPO_INVALIDO', 'Campo inválido: time.'); cmd.time = k.time }
  switch (k.tipo) {
    case 'passar':
      if (k.carta !== undefined || k.alvo !== undefined || k.a !== undefined || k.b !== undefined) throw recusa('CAMPO_DESCONHECIDO', 'Passar não leva outros campos.')
      break
    case 'jogar':
      if (k.a !== undefined || k.b !== undefined) throw recusa('CAMPO_DESCONHECIDO', 'Jogar leva só carta e alvo.')
      cmd.carta = texto(k.carta, RE.carta, 'carta')
      cmd.alvo = k.alvo === undefined || k.alvo === null ? null : texto(k.alvo, RE.lugar, 'alvo')
      break
    case 'fiapo':
      if (k.alvo !== undefined || k.a !== undefined || k.b !== undefined) throw recusa('CAMPO_DESCONHECIDO', 'Fiapo leva só a carta.')
      cmd.carta = texto(k.carta, RE.carta, 'carta')
      break
    case 'trocar':
      if (k.carta !== undefined || k.alvo !== undefined) throw recusa('CAMPO_DESCONHECIDO', 'Trocar leva só a e b.')
      cmd.a = texto(k.a, RE.lugar, 'a'); cmd.b = texto(k.b, RE.lugar, 'b')
      break
    default: throw recusa('CAMPO_INVALIDO', 'Campo inválido: tipo.')
  }
  cmd.tipo = k.tipo
  return { seq, cmd }
}

function lerCorpoCostura(c) {
  soCampos(c, ['a', 'b', 'pedido'])
  return { a: texto(c.a, RE.boneco, 'a'), b: texto(c.b, RE.boneco, 'b'), pedido: texto(c.pedido, RE.pedido, 'pedido') }
}

function lerCorpoVazio(c) {
  if (c === undefined) return
  soCampos(c, [])
}

function lerConsulta(url, permitidos) {
  const o = {}
  for (const [k, v] of url.searchParams) {
    if (!permitidos.includes(k) || k in o) throw recusa('CAMPO_DESCONHECIDO', `Parâmetro não aceito: ${k.slice(0, 40)}.`)
    o[k] = v
  }
  return o
}

// ---------------------------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------------------------
function enviar(res, status, corpo, extra = {}) {
  const dados = Buffer.from(JSON.stringify(corpo))
  res.writeHead(status, { ...CABECALHOS_DE_SEGURANCA, 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': dados.length, ...extra })
  res.end(dados)
}

function enviarErro(res, e, extra) {
  const corpo = { erro: { codigo: e.codigo, motivo: e.motivo } }
  if (e.extra) Object.assign(corpo.erro, e.extra)
  enviar(res, e.status, corpo, extra)
}

/** Lê o corpo JSON com limite. Corpo vazio → undefined. Recusa: ErroDoJogo (413/415/400). */
function lerCorpo(req) {
  return new Promise((ok, falha) => {
    const max = PARAMS_SERVIDOR.corpoMaxBytes
    const declarado = Number(req.headers['content-length'])
    const tipo = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
    let tamanho = 0, partes = [], grande = Number.isFinite(declarado) && declarado > max, acabou = false
    const grandeDemais = () => recusa('CORPO_GRANDE', 'Pedido grande demais.', 413)
    req.on('data', (pedaco) => {
      if (acabou) return
      tamanho += pedaco.length
      if (tamanho > max) { grande = true; partes = [] }
      if (grande) {
        // lê e joga fora (para a resposta chegar inteira); passou do teto do descarte, corta a conexão
        if (tamanho > PARAMS_SERVIDOR.descarteMaxBytes) { acabou = true; falha(grandeDemais()); req.destroy() }
        return
      }
      partes.push(pedaco)
    })
    req.on('error', () => { if (!acabou) { acabou = true; falha(recusa('CORPO_INVALIDO', 'Pedido interrompido.')) } })
    req.on('end', () => {
      if (acabou) return
      acabou = true
      if (grande) return falha(grandeDemais())
      if (tamanho === 0) return ok(undefined)
      if (tipo !== 'application/json') return falha(recusa('TIPO_INVALIDO', 'Mande o corpo como application/json.', 415))
      let corpo
      try { corpo = JSON.parse(Buffer.concat(partes).toString('utf8')) } catch { return falha(recusa('JSON_INVALIDO', 'JSON inválido.')) }
      ok(corpo)
    })
  })
}

const TOKEN = /^Bearer ([A-Za-z0-9_-]{43})$/

/**
 * Cria o tratador HTTP. jogo: criarJogo(...). agora: relógio (injetável nos testes). log: função de log (sem token).
 */
export function criarTratador({ jogo, agora = Date.now, log = console.log, limites = {} }) {
  const P = { ...PARAMS_SERVIDOR, ...limites }
  const porIpConta = criarLimite(P.contasPorIp, agora)
  const porConta = criarLimite(P.pedidosPorConta, agora)
  const porIp = criarLimite(P.pedidosPorIp, agora)

  function autenticar(req) {
    const m = TOKEN.exec(String(req.headers.authorization ?? ''))
    const conta = m ? jogo.contaPorToken(m[1]) : null
    if (!conta) throw recusa('SEM_SESSAO', 'Entre de novo (sessão inválida).', 401)
    if (!porConta(conta.id)) throw recusa('MUITOS_PEDIDOS', 'Muitos pedidos. Espere um pouco.', 429)
    return conta
  }

  const rotas = [
    ['POST', /^\/api\/conta$/, false, async (req) => {
      const { apelido } = lerCorpoConta(await lerCorpo(req))
      if (!porIpConta(chaveDoIp(req.socket.remoteAddress))) throw recusa('MUITAS_CONTAS', 'Muitas contas criadas daqui. Espere um pouco.', 429)
      return [201, jogo.criarConta(apelido)]
    }],
    ['GET', /^\/api\/estado$/, true, (req, conta) => [200, jogo.estado(conta.id)]],
    ['GET', /^\/api\/boneco\/([^/]+)$/, true, (req, conta, m) => [200, jogo.boneco(conta.id, texto(m[1], RE.boneco, 'id'))]],
    ['POST', /^\/api\/boneco\/([^/]+)\/aposentar$/, true, async (req, conta, m) => {
      lerCorpoVazio(await lerCorpo(req))
      return [200, jogo.aposentarBoneco(conta.id, texto(m[1], RE.boneco, 'id'))]
    }],
    ['POST', /^\/api\/luta$/, true, async (req, conta) => [201, jogo.novaLuta(conta.id, lerCorpoLuta(await lerCorpo(req)))]],
    ['GET', /^\/api\/luta\/([^/]+)$/, true, (req, conta, m) => [200, jogo.verLuta(conta.id, texto(m[1], RE.luta, 'id'))]],
    ['POST', /^\/api\/luta\/([^/]+)\/comando$/, true, async (req, conta, m) => {
      const { seq, cmd } = lerCorpoComando(await lerCorpo(req))
      return [200, jogo.comando(conta.id, texto(m[1], RE.luta, 'id'), seq, cmd)]
    }],
    ['POST', /^\/api\/luta\/([^/]+)\/desistir$/, true, async (req, conta, m) => {
      lerCorpoVazio(await lerCorpo(req))
      return [200, jogo.desistir(conta.id, texto(m[1], RE.luta, 'id'))]
    }],
    ['GET', /^\/api\/luta\/([^/]+)\/replay$/, true, (req, conta, m) => [200, jogo.replay(conta.id, texto(m[1], RE.luta, 'id'))]],
    ['GET', /^\/api\/costura\/chances$/, true, (req, conta, m, url) => {
      const { a, b } = lerConsulta(url, ['a', 'b'])
      return [200, jogo.chances(conta.id, texto(a, RE.boneco, 'a'), texto(b, RE.boneco, 'b'))]
    }],
    ['POST', /^\/api\/costura$/, true, async (req, conta) => {
      const r = jogo.costurarPar(conta.id, lerCorpoCostura(await lerCorpo(req)))
      return [r.status, r.corpo]
    }],
  ]

  return async function tratar(req, res) {
    const inicio = agora()
    let status = 500
    try {
      const url = new URL(req.url, 'http://local')
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        if (!porIp(chaveDoIp(req.socket.remoteAddress))) throw recusa('MUITOS_PEDIDOS', 'Muitos pedidos. Espere um pouco.', 429)
        const doCaminho = rotas.filter(([, re]) => re.test(url.pathname))
        if (!doCaminho.length) throw recusa('NAO_ENCONTRADO', 'Rota não encontrada.', 404)
        const rota = doCaminho.find(([metodo]) => metodo === req.method)
        if (!rota) { status = 405; enviar(res, 405, { erro: { codigo: 'METODO_NAO_PERMITIDO', motivo: 'Método não permitido.' } }, { Allow: doCaminho.map(([mt]) => mt).join(', ') }); return }
        const [, re, precisaSessao, fazer] = rota
        if (req.method === 'GET' && Number(req.headers['content-length'] ?? 0) > 0) throw recusa('CORPO_INVALIDO', 'GET não leva corpo.')
        const conta = precisaSessao ? autenticar(req) : null
        const [st, corpo] = await fazer(req, conta, re.exec(url.pathname), url)
        status = st
        enviar(res, st, corpo)
        return
      }
      // estáticos
      if (req.method !== 'GET' && req.method !== 'HEAD') { status = 405; res.writeHead(405, { ...CABECALHOS_DE_SEGURANCA, Allow: 'GET, HEAD' }); res.end(); return }
      const arq = await lerArquivo(url.pathname)
      if (!arq) { status = 404; res.writeHead(404, { ...CABECALHOS_DE_SEGURANCA, 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Não encontrado'); return }
      status = 200
      res.writeHead(200, { ...CABECALHOS_DE_SEGURANCA, 'Cache-Control': 'no-store', 'Content-Type': arq.tipo, 'Content-Length': arq.dados.length })
      res.end(req.method === 'HEAD' ? undefined : arq.dados)
    } catch (e) {
      if (e instanceof ErroDoJogo) {
        status = e.status
        const extra = e.status === 413 ? { Connection: 'close' } : {}
        if (!res.headersSent) enviarErro(res, e, extra)
      } else {
        status = 500
        log(`ERRO ${req.method} ${String(req.url).split('?')[0]}: ${e?.name ?? 'Erro'}: ${String(e?.message ?? e).slice(0, 200)}`)
        if (!res.headersSent) enviar(res, 500, { erro: { codigo: 'ERRO_INTERNO', motivo: 'Algo deu errado do nosso lado. Tente de novo.' } })
      }
    } finally {
      log(`${req.method} ${String(req.url).split('?')[0]} ${status} ${agora() - inicio}ms`)
    }
  }
}
