// Keepmile — rotas HTTP do jogo de reino em /api/reino/... (contrato em docs/reino/servidor.md).
// Ligadas ao tratador de server/api.mjs (mesma sessão, limites, chaves de emergência e cabeçalhos do jogo antigo).
// Todo corpo é conferido campo a campo: campo desconhecido, tipo errado ou id fora do formato = recusa (400).
import { ErroDoJogo } from '../jogo.mjs'
import { MODOS } from './reino.mjs'

/** Resposta de `/public/reino/modo.json` no servidor (o arquivo parado diz "local"). */
export const MODO_REINO = Object.freeze({ modo: 'servidor', api: '/api/reino/' })

const recusa = (codigo, motivo, status = 400) => new ErroDoJogo(status, codigo, motivo)
const ehObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype
const RE = { partida: /^pa_[0-9a-f]{24}$/, carta: /^[TBM][0-9]{2}$/, cursor: /^[A-Za-z0-9_-]{1,80}$/ }
const TIPOS = ['por', 'sortear', 'consertar', 'batalhar', 'espolio', 'desistir']

function soCampos(corpo, permitidos, onde = 'corpo') {
  if (!ehObjeto(corpo)) throw recusa('CORPO_INVALIDO', `O ${onde} precisa ser um objeto JSON.`)
  for (const k of Object.keys(corpo)) if (!permitidos.includes(k)) throw recusa('CAMPO_DESCONHECIDO', `Campo não aceito: ${k.slice(0, 40)}.`)
}
const partidaId = (v) => {
  if (typeof v !== 'string' || !RE.partida.test(v)) throw recusa('CAMPO_INVALIDO', 'Campo inválido: partida.')
  return v
}
const inteiro = (v, min, max, nome) => {
  if (!Number.isSafeInteger(v) || v < min || v > max) throw recusa('CAMPO_INVALIDO', `Campo inválido: ${nome}.`)
  return v
}
function modo(v) {
  if (!MODOS.includes(v)) throw recusa('MODO_INVALIDO', 'Modo inválido (ranking, treino ou estrada).')
  return v
}

function lerComando(k) {
  soCampos(k, ['tipo', 'carta', 'terreno', 'indice'], 'comando')
  if (!TIPOS.includes(k.tipo)) throw recusa('CAMPO_INVALIDO', 'Campo inválido: tipo.')
  const c = { tipo: k.tipo }
  if (k.carta !== undefined) { if (typeof k.carta !== 'string' || !RE.carta.test(k.carta)) throw recusa('CAMPO_INVALIDO', 'Campo inválido: carta.'); c.carta = k.carta }
  if (k.terreno !== undefined) c.terreno = inteiro(k.terreno, 1, 6, 'terreno')
  if (k.indice !== undefined) c.indice = inteiro(k.indice, 0, 2, 'indice')
  const pode = { por: ['carta', 'terreno'], espolio: ['indice', 'terreno'] }[c.tipo] ?? []
  for (const campo of ['carta', 'terreno', 'indice']) if (c[campo] !== undefined && !pode.includes(campo)) throw recusa('CAMPO_DESCONHECIDO', `O comando ${c.tipo} não leva ${campo}.`)
  return c
}

function lerConsulta(url, permitidos) {
  const o = {}
  for (const [k, v] of url.searchParams) {
    if (!permitidos.includes(k) || k in o) throw recusa('CAMPO_DESCONHECIDO', `Parâmetro não aceito: ${k.slice(0, 40)}.`)
    o[k] = v
  }
  return o
}

/**
 * Rotas no formato do tratador de server/api.mjs: [método, regex, precisaSessão, fazer(req, conta, m, url, ip)].
 * reino: criarReino(...). lerCorpo: o leitor de corpo do tratador. chaveDoIp: IP → chave do limite (IPv6 por /64).
 */
export function rotasDoReino(reino, { lerCorpo, chaveDoIp }) {
  return [
    ['POST', /^\/api\/reino\/partida$/, true, async (req, conta, m, url, ip) => {
      const c = await lerCorpo(req)
      soCampos(c, ['modo'])
      return [201, reino.abrir(conta.id, modo(c.modo), ip ? chaveDoIp(ip) : null)]
    }],
    ['GET', /^\/api\/reino\/partida$/, true, (req, conta, m, url) => {
      const { modo: md } = lerConsulta(url, ['modo'])
      return [200, reino.verAberta(conta.id, md === undefined ? undefined : modo(md))]
    }],
    ['POST', /^\/api\/reino\/partida\/comando$/, true, async (req, conta) => {
      const c = await lerCorpo(req)
      soCampos(c, ['partida', 'seq', 'comando'])
      return [200, reino.comando(conta.id, { partida: partidaId(c.partida), seq: inteiro(c.seq, 0, 100_000, 'seq'), comando: lerComando(c.comando) })]
    }],
    ['POST', /^\/api\/reino\/partida\/desistir$/, true, async (req, conta) => {
      const c = await lerCorpo(req)
      soCampos(c, ['partida'])
      return [200, reino.desistir(conta.id, { partida: partidaId(c.partida) })]
    }],
    ['GET', /^\/api\/reino\/ranking$/, true, (req, conta, m, url) => {
      const { cursor = '', temporada } = lerConsulta(url, ['cursor', 'temporada'])
      if (cursor !== '' && !RE.cursor.test(cursor)) throw recusa('CURSOR_INVALIDO', 'Cursor inválido.')
      let t
      if (temporada !== undefined) {
        if (!/^[0-9]{1,6}$/.test(temporada)) throw recusa('TEMPORADA_INVALIDA', 'Temporada inválida.')
        t = Number(temporada)
      }
      return [200, reino.ranking(conta.id, { cursor, temporada: t })]
    }],
    ['GET', /^\/api\/reino\/perfil$/, true, (req, conta, m, url) => {
      lerConsulta(url, [])
      return [200, reino.perfil(conta.id)]
    }],
    ['GET', /^\/api\/reino\/replay\/([^/]+)$/, true, (req, conta, m, url) => {
      lerConsulta(url, [])
      return [200, reino.replay(conta.id, partidaId(m[1]))]
    }],
  ]
}
