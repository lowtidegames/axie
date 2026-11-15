// Frayz — rotas HTTP do servidor (node:http, sem dependências). O servidor decide tudo; a tela só manda comandos.
// Todo corpo é conferido campo a campo: campo desconhecido, tipo errado ou id fora do formato = recusa (400).
// Erros nunca levam pilha; logs nunca levam token nem cabeçalho.
import { isIP } from 'node:net'
import { ErroDoJogo } from './jogo.mjs'
import { lerArquivo } from './estatico.mjs'
import { apelidoPermitido, limparApelido } from './apelido.mjs'

// ---------------------------------------------------------------------------------------------
// Parâmetros do servidor — TODOS PROVISÓRIOS (não são números de economia; segurança e ritmo do protótipo).
// ---------------------------------------------------------------------------------------------
export const PARAMS_SERVIDOR = {
  corpoMaxBytes: 8 * 1024, // corpo JSON maior que isto: 413
  descarteMaxBytes: 1024 * 1024, // depois de recusar, lê e joga fora no máximo isto; passou, corta a conexão
  contasPorIp: { max: 5, janelaMs: 60 * 60 * 1000 }, // criação de conta por IP (IPv6: por /64)
  contasPorBloco48: { max: 20, janelaMs: 60 * 60 * 1000 }, // criação de conta por bloco IPv6 /48 (65.536 /64 dentro)
  pedidosPorConta: { max: 240, janelaMs: 60 * 1000 }, // pedidos com sessão, por conta
  pedidosPorIp: { max: 600, janelaMs: 60 * 1000 }, // todos os pedidos de API, por IP (IPv6: por /64)
  pedidosPorBloco48: { max: 2400, janelaMs: 60 * 1000 }, // todos os pedidos de API, por bloco IPv6 /48
  limpezaDosLimites: { intervaloMs: 60 * 1000, lote: 2000 }, // limpeza por idade dos limites guardados: de tempo em tempo, em lote
  tempoDoTurnoMs: 20 * 1000, // relógio do turno (o mesmo da tela: 20 s)
  folgaDoRelogioMs: 1500, // tolerância de rede antes de passar a vez
  apelido: { min: 3, max: 20 },
  maxBonecosPorConta: 60, // bonecos VIVOS por conta (aposentado não conta); costura além disso: 409 COLECAO_CHEIA (A3)
  paginaDeBonecos: 50, // bonecos por página em /api/estado e /api/bonecos (máximo do ?limite=)
  validadeDaSessaoH: 720, // sessão vence depois de tanto tempo SEM uso (cada uso renova)
  renovarSessaoMs: 60 * 1000, // renova a sessão no banco no máximo uma vez por minuto (menos escrita)
  abandonoMin: 30, // luta aberta sem pedido do dono por mais que isto: derrota por abandono no próximo pedido da conta
}
// Ponto de encaixe da economia (NÃO fazer sem o "sim" do dono): custo da costura, energia para abrir luta,
// custo de desistir (A6) e prêmio entram em shared/config.js, não aqui.

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
// limite de pedidos (janela fixa)
// ---------------------------------------------------------------------------------------------
/**
 * Limite em MEMÓRIA (só quando não há banco, ex.: testes do tratador). Chaves velhas saem por idade, numa varredura
 * que roda no máximo uma vez por décimo de janela — nunca a cada pedido (A9).
 */
export function criarLimite({ max, janelaMs }, agora) {
  const mapa = new Map()
  let ultimaVarredura = -Infinity
  return function contar(chave) {
    const t = agora()
    if (mapa.size > 50_000 && t - ultimaVarredura >= janelaMs / 10) {
      ultimaVarredura = t
      for (const [k, v] of mapa) if (t - v.inicio >= janelaMs) mapa.delete(k)
    }
    let v = mapa.get(chave)
    if (!v || t - v.inicio >= janelaMs) { v = { inicio: t, n: 0 }; mapa.set(chave, v) }
    v.n++
    return v.n <= max
  }
}

/**
 * Limites guardados no BANCO (tabela `limites`): sobrevivem a reinício (A5). Cada pedido = 1 UPSERT pela chave
 * primária. Limpeza por idade em lote (índice em `inicio`), no máximo uma vez por `intervaloMs` (A9).
 * Devolve contar(chave, { max, janelaMs }) → true se ainda cabe.
 */
export function criarLimitesNoBanco(db, agora, { intervaloMs, lote, idadeMaxMs }) {
  const somar = db.prepare(`INSERT INTO limites (chave, inicio, n) VALUES (?, ?, 1)
    ON CONFLICT (chave) DO UPDATE SET
      n = CASE WHEN excluded.inicio - inicio >= ? THEN 1 ELSE n + 1 END,
      inicio = CASE WHEN excluded.inicio - inicio >= ? THEN excluded.inicio ELSE inicio END
    RETURNING n`)
  const limpar = db.prepare('DELETE FROM limites WHERE rowid IN (SELECT rowid FROM limites WHERE inicio < ? LIMIT ?)')
  let ultimaLimpeza = -Infinity
  return function contar(chave, { max, janelaMs }) {
    const t = agora()
    if (t - ultimaLimpeza >= intervaloMs) { ultimaLimpeza = t; limpar.run(t - idadeMaxMs, lote) }
    return somar.get(chave, t, janelaMs, janelaMs).n <= max
  }
}

function gruposIPv6(ip) {
  const [esq, dir = ''] = ip.split('::')
  const a = esq ? esq.split(':') : [], b = ip.includes('::') && dir ? dir.split(':') : []
  const grupos = ip.includes('::') ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b] : a
  return grupos.map((g) => g.toLowerCase().replace(/^0+(?=.)/, ''))
}
const semMapeado = (endereco) => {
  const ip = String(endereco ?? '')
  return ip.startsWith('::ffff:') && ip.includes('.') ? ip.slice(7) : ip
}

/** IP do pedido. IPv4 inteiro; IPv6 pelo /64 (os 4 primeiros grupos). */
export function chaveDoIp(endereco) {
  const ip = semMapeado(endereco)
  if (!ip.includes(':')) return ip
  return gruposIPv6(ip).slice(0, 4).join(':') + '::/64'
}

/** Bloco /48 do IPv6 (os 3 primeiros grupos); IPv4 → null (não tem bloco). */
export function chaveDoBloco48(endereco) {
  const ip = semMapeado(endereco)
  if (!ip.includes(':')) return null
  return gruposIPv6(ip).slice(0, 3).join(':') + '::/48'
}

/**
 * Endereço do cliente. Sem proxy confiável: o do socket, e X-Forwarded-For é IGNORADO (qualquer um escreve nele).
 * Com proxy confiável (TRUST_PROXY=1, lido no arranque): o endereço mais à direita de X-Forwarded-For que seja um IP
 * válido e não seja o do próprio proxy (o proxy acrescenta o endereço real no fim; o que vem antes o cliente inventa).
 */
export function ipDoCliente(req, confiaNoProxy) {
  const doSocket = semMapeado(req.socket?.remoteAddress)
  if (!confiaNoProxy) return doSocket
  const xff = req.headers['x-forwarded-for']
  if (!xff) return doSocket
  const lista = (Array.isArray(xff) ? xff.join(',') : String(xff)).split(',').map((x) => semMapeado(x.trim()))
  for (let i = lista.length - 1; i >= 0; i--) {
    const ip = lista[i]
    if (isIP(ip) && ip !== doSocket) return ip
  }
  return doSocket
}

/** Chaves de emergência: lidas das variáveis de ambiente a CADA pedido (sem reiniciar). */
export const emManutencao = () => process.env.MANUTENCAO === '1'
export const soLeitura = () => process.env.SAVE_SO_LEITURA === '1'

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
  cursor: /^[A-Za-z0-9_-]{1,40}$/,
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
  const apelido = limparApelido(c.apelido)
  const { min, max } = PARAMS_SERVIDOR.apelido
  if (apelido.length < min || apelido.length > max || !apelidoPermitido(apelido)) throw recusa('APELIDO_INVALIDO', `Apelido de ${min} a ${max} letras (alfabeto latino, com acento), números, espaço, ponto, traço ou _.`)
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

/** ?cursor=&limite= da lista de bonecos. Cursor vazio = começo. */
function lerPaginaDeBonecos(url) {
  const { cursor = '', limite } = lerConsulta(url, ['cursor', 'limite'])
  if (cursor !== '' && !RE.cursor.test(cursor)) throw recusa('CURSOR_INVALIDO', 'Cursor inválido.')
  let n = PARAMS_SERVIDOR.paginaDeBonecos
  if (limite !== undefined) {
    if (!/^[0-9]{1,3}$/.test(limite)) throw recusa('CAMPO_INVALIDO', 'Campo inválido: limite.')
    n = inteiro(Number(limite), 1, PARAMS_SERVIDOR.paginaDeBonecos, 'limite')
  }
  return { cursor, limite: n }
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
 * banco: o banco (limites guardados nele; sem banco, limites em memória). confiaNoProxy: padrão = TRUST_PROXY=1 no arranque.
 */
export function criarTratador({ jogo, agora = Date.now, log = console.log, limites = {}, banco = null, confiaNoProxy = process.env.TRUST_PROXY === '1' }) {
  const P = { ...PARAMS_SERVIDOR, ...limites }
  const tipos = { nova: P.contasPorIp, nova48: P.contasPorBloco48, conta: P.pedidosPorConta, ip: P.pedidosPorIp, ip48: P.pedidosPorBloco48 }
  let contar
  if (banco) {
    const idadeMaxMs = Math.max(...Object.values(tipos).map((x) => x.janelaMs))
    contar = criarLimitesNoBanco(banco, agora, { ...P.limpezaDosLimites, idadeMaxMs })
  } else {
    const mem = Object.fromEntries(Object.entries(tipos).map(([k, cfg]) => [k, criarLimite(cfg, agora)]))
    contar = (chave, cfg, tipo) => mem[tipo](chave)
  }
  const cabe = (tipo, chave) => chave === null || contar(`${tipo}:${chave}`, tipos[tipo], tipo)

  function autenticar(req) {
    const m = TOKEN.exec(String(req.headers.authorization ?? ''))
    const conta = m ? jogo.contaPorToken(m[1]) : null
    if (!conta) throw recusa('SEM_SESSAO', 'Entre de novo (sessão inválida).', 401)
    if (!cabe('conta', String(conta.id))) throw recusa('MUITOS_PEDIDOS', 'Muitos pedidos. Espere um pouco.', 429)
    jogo.aoPedido?.(conta.id) // luta parada (abandono) ou de motor antigo: encerra agora
    return conta
  }

  const rotas = [
    ['POST', /^\/api\/conta$/, false, async (req, conta, m, url, ip) => {
      const { apelido } = lerCorpoConta(await lerCorpo(req))
      if (!cabe('nova', chaveDoIp(ip)) || !cabe('nova48', chaveDoBloco48(ip))) throw recusa('MUITAS_CONTAS', 'Muitas contas criadas daqui. Espere um pouco.', 429)
      return [201, jogo.criarConta(apelido)]
    }],
    ['POST', /^\/api\/sair$/, true, async (req) => {
      lerCorpoVazio(await lerCorpo(req))
      jogo.sair(TOKEN.exec(String(req.headers.authorization)).at(1))
      return [200, { ok: true }]
    }],
    ['GET', /^\/api\/estado$/, true, (req, conta) => [200, jogo.estado(conta.id)]],
    ['GET', /^\/api\/bonecos$/, true, (req, conta, m, url) => [200, jogo.bonecos(conta.id, lerPaginaDeBonecos(url))]],
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
        if (emManutencao()) throw recusa('MANUTENCAO', 'O jogo está em manutenção. Volte daqui a pouco.', 503)
        if (req.method === 'POST' && soLeitura()) throw recusa('SO_LEITURA', 'O jogo está só para leitura agora. Nada foi mudado; tente mais tarde.', 503)
        const ip = ipDoCliente(req, confiaNoProxy)
        if (!cabe('ip', chaveDoIp(ip)) || !cabe('ip48', chaveDoBloco48(ip))) throw recusa('MUITOS_PEDIDOS', 'Muitos pedidos. Espere um pouco.', 429)
        const doCaminho = rotas.filter(([, re]) => re.test(url.pathname))
        if (!doCaminho.length) throw recusa('NAO_ENCONTRADO', 'Rota não encontrada.', 404)
        const rota = doCaminho.find(([metodo]) => metodo === req.method)
        if (!rota) { status = 405; enviar(res, 405, { erro: { codigo: 'METODO_NAO_PERMITIDO', motivo: 'Método não permitido.' } }, { Allow: doCaminho.map(([mt]) => mt).join(', ') }); return }
        const [, re, precisaSessao, fazer] = rota
        if (req.method === 'GET' && Number(req.headers['content-length'] ?? 0) > 0) throw recusa('CORPO_INVALIDO', 'GET não leva corpo.')
        const conta = precisaSessao ? autenticar(req) : null
        const [st, corpo] = await fazer(req, conta, re.exec(url.pathname), url, ip)
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
