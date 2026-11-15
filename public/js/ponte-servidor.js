// Frayz — ponte no MODO SERVIDOR: as mesmas perguntas da tela, respondidas pelo servidor do Frayz por HTTP (server/api.mjs).
// O servidor decide tudo (coleção, energia, luta, robô, costura). Aqui só se pede, se guarda o último estado que ele mandou
// (para a tela ler sem esperar) e se traduz o código de erro num aviso em português. A tela não importa este arquivo:
// fala com ponte.js (a fachada).
//
// Luta: cada resposta do servidor já traz o turno inteiro do robô. Para a tela animar comando por comando (como no modo
// local), a resposta é fatiada pelos comandos novos da visão: um "passo" por comando, cada um com os eventos dele.
// Os passos do meio são estados PARCIAIS (marcados com parcial: true): a tela os mostra, mas a arena só se acerta
// com o último (que é a visão de verdade). Comando que falha por rede é repetido com o MESMO seq (o servidor não aplica 2 vezes).

const EU = 'A', RIVAL = 'B'
const CHAVE_SESSAO = 'frayz_sessao'
const CHAVE_LUTA = 'frayz_luta_servidor' // { id, ids } da luta aberta (para retomar com o time certo)
const ESPERA_MS = 15_000 // pedido parado mais que isso conta como queda de rede
const REDE_MAX_MS = 60_000 // queda de rede no meio da luta: tenta de novo por até 1 min (com o mesmo seq)

let API = null
let token = null
let avisar = () => {} // (texto, tipo) → a tela mostra
let perdeuSessao = () => {} // (erro) → a tela volta para a entrada

export const aoAviso = (f) => { avisar = f }
export const aoPerderSessao = (f) => { perdeuSessao = f }

// ---------------------------------------------------------------- escolher o modo

/** O servidor do Frayz responde public/modo.json com { modo: 'servidor', api }; o arquivo parado diz 'local'. */
export async function detectar() {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000)
  try {
    const r = await fetch(new URL('modo.json', document.baseURI), { cache: 'no-store', signal: ctl.signal })
    if (!r.ok) return false
    const j = await r.json()
    if (!j || j.modo !== 'servidor' || typeof j.api !== 'string') return false
    API = new URL(j.api, location.href).href
    try { token = localStorage.getItem(CHAVE_SESSAO) } catch { token = null }
    return true
  } catch { return false } finally { clearTimeout(t) }
}

// ---------------------------------------------------------------- pedidos

const TEXTOS = {
  MANUTENCAO: 'O jogo está em manutenção. Volte daqui a pouco.',
  SO_LEITURA: 'O jogo está só para leitura agora: nada foi mudado. Tente mais tarde.',
  SESSAO_VENCIDA: 'Sua sessão venceu. Entre de novo com um apelido.',
  SEM_SESSAO: 'Sua sessão acabou. Entre de novo com um apelido.',
  APELIDO_EM_USO: 'Esse apelido já tem dono. Escolha outro.',
  MUITOS_PEDIDOS: 'Muitos pedidos seguidos. Espere um pouco e tente de novo.',
  MUITAS_CONTAS: 'Muitas contas criadas daqui. Espere um pouco e tente de novo.',
  SEM_REDE: 'Sem conexão com o servidor. Confira a internet e tente de novo.',
  ERRO_INTERNO: 'Algo deu errado do lado do servidor. Tente de novo.',
}

export class ErroDoServidor extends Error {
  constructor(codigo, motivo, status = 0, extra = {}) { super(motivo); this.codigo = codigo; this.motivo = motivo; this.status = status; this.extra = extra }
}
/** Erro → { ok:false, codigo, motivo, ...extra } (o formato de recusa que a tela já conhece). */
const recusa = (e) => (e instanceof ErroDoServidor ? { ok: false, codigo: e.codigo, motivo: e.motivo, ...e.extra } : { ok: false, codigo: 'ERRO_INTERNO', motivo: TEXTOS.ERRO_INTERNO })

function esquecerSessao() {
  token = null
  try { localStorage.removeItem(CHAVE_SESSAO); localStorage.removeItem(CHAVE_LUTA) } catch { /* sem armazenamento */ }
}

async function pedir(metodo, caminho, corpo) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (corpo !== undefined) headers['Content-Type'] = 'application/json'
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ESPERA_MS)
  let r
  try { r = await fetch(new URL(caminho, API), { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo), cache: 'no-store', signal: ctl.signal }) }
  catch { throw new ErroDoServidor('SEM_REDE', TEXTOS.SEM_REDE) } finally { clearTimeout(t) }
  let j = null
  try { j = await r.json() } catch { /* corpo que não é JSON (proxy, queda) */ }
  if (r.ok && j) return j
  const { codigo = r.status >= 500 ? 'ERRO_INTERNO' : 'SEM_REDE', motivo = '', ...extra } = j?.erro ?? {}
  const e = new ErroDoServidor(codigo, TEXTOS[codigo] ?? (motivo || TEXTOS.ERRO_INTERNO), r.status, extra)
  if (codigo === 'SESSAO_VENCIDA' || codigo === 'SEM_SESSAO') { esquecerSessao(); try { perdeuSessao(e) } catch { /* tela */ } }
  if (extra.energia) C.energia = extra.energia // SEM_ENERGIA traz a energia do servidor
  throw e
}

/** Repete o pedido enquanto a rede estiver fora (até REDE_MAX_MS), avisando a tela. Só para pedidos que podem repetir sem dano. */
async function comRede(fazer) {
  const t0 = Date.now()
  let caiu = false, espera = 500
  for (;;) {
    try {
      const r = await fazer()
      if (caiu) avisar('Conexão de volta.', 'aviso')
      return r
    } catch (e) {
      if (!(e instanceof ErroDoServidor) || e.codigo !== 'SEM_REDE' || Date.now() - t0 > REDE_MAX_MS) throw e
      if (!caiu) { caiu = true; avisar('Sem conexão com o servidor: tentando de novo…', 'alerta') }
      await new Promise((ok) => setTimeout(ok, espera))
      espera = Math.min(4000, espera * 2)
    }
  }
}

// ---------------------------------------------------------------- conta

export const temSessao = () => !!token

/** Conta nova com o apelido (o servidor dá os 9 bonecos de teste). { ok:true } ou a recusa. */
export async function entrar(apelido) {
  try {
    const r = await pedir('POST', 'conta', { apelido: String(apelido ?? '') })
    token = r.token
    try { localStorage.setItem(CHAVE_SESSAO, token) } catch { /* sem armazenamento: vale só nesta aba */ }
    return { ok: true, apelido: r.conta.apelido }
  } catch (e) { return recusa(e) }
}

/** Sair: o servidor apaga a sessão; aqui ela é esquecida mesmo sem rede. */
export async function sair() {
  try { if (token) await pedir('POST', 'sair') } catch { /* sai do aparelho de qualquer jeito */ }
  esquecerSessao()
  C.conta = null
}

// ---------------------------------------------------------------- coleção (o último estado do servidor fica guardado aqui)

const C = { conta: null, faseLiberada: 1, energia: null, vitoriasSeguidas: 0, resumo: null, bonecos: [], lutaAberta: null }
export const apelido = () => C.conta?.apelido ?? null
export const energia = () => ({ ...(C.energia ?? { atual: 0, maximo: 0, recarregaEm: new Date().toISOString() }) })
export const faseLiberada = () => C.faseLiberada
export const lutaAberta = () => C.lutaAberta

/** Estado da conta + TODAS as páginas da coleção (página por página, pelo cursor do servidor). */
export async function carregar() {
  const e = await comRede(() => pedir('GET', 'estado'))
  const bonecos = e.bonecos.slice()
  let cursor = e.proximo
  for (let i = 0; cursor && i < 40; i++) {
    const p = await comRede(() => pedir('GET', `bonecos?cursor=${encodeURIComponent(cursor)}`))
    bonecos.push(...p.bonecos); cursor = p.proximo
  }
  Object.assign(C, { conta: e.conta, faseLiberada: e.faseLiberada, energia: e.energia, vitoriasSeguidas: e.vitoriasSeguidas, resumo: e.colecao, bonecos, lutaAberta: e.lutaAberta })
  return { bonecos: bonecos.slice(), faseLiberada: e.faseLiberada, energia: e.energia, lutaAberta: e.lutaAberta, resumo: e.colecao }
}

const novaChave = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(16).padStart(2, '0')).join('')

/** Costura no servidor (a chave do pedido faz a repetição por queda de rede não costurar 2 vezes). */
export async function costurar(a, b) {
  const pedido = novaChave()
  try {
    const r = await comRede(() => pedir('POST', 'costura', { a, b, pedido }))
    return { ok: true, filho: r.filho, pais: r.pais, custo: r.custo }
  } catch (e) { return recusa(e) }
}
/** A tela terminou de abrir o casulo: o servidor guarda. */
export async function abrirCasulo(id) {
  try { return { ok: true, boneco: (await comRede(() => pedir('POST', `boneco/${id}/casulo`))).boneco } } catch (e) { return recusa(e) }
}
export async function aposentar(id) {
  try { const r = await pedir('POST', `boneco/${id}/aposentar`); return { ok: true, boneco: r.boneco, retalhos: r.retalhos, mural: r.mural } } catch (e) { return recusa(e) }
}

// ---------------------------------------------------------------- luta

const INFO = new WeakMap() // estado (visão) → { id, validos, fila, intencao, prazoLocal }
export const ehDoServidor = (e) => !!e && INFO.has(e)
export const validos = (e) => INFO.get(e)?.validos ?? []
export const intencao = (e) => INFO.get(e)?.intencao
let atual = null // { id, seq, ids }

function guardarLuta() { try { if (atual) localStorage.setItem(CHAVE_LUTA, JSON.stringify({ id: atual.id, ids: atual.ids })); else localStorage.removeItem(CHAVE_LUTA) } catch { /* ok */ } }

/** O evento que abre cada tipo de comando no registro do motor. */
function abreComando(ev, c) {
  if (c.tipo === 'passar') return ev.t === 'passou' && ev.time === c.time
  if (c.tipo === 'jogar') return ev.t === 'carta' && ev.carta === c.carta
  if (c.tipo === 'fiapo') return ev.t === 'fiapo' && ev.carta === c.carta
  if (c.tipo === 'trocar') return ev.t === 'troca' && !('time' in ev) && ev.a === c.a && ev.b === c.b
  return false
}

/**
 * Resposta da luta → estado que a tela vê agora + a fila dos próximos passos. `antes`: o estado anterior que a tela tinha
 * (ou null no começo). Cada comando novo vira um passo { cmd, eventos, estado }; o último estado é a visão do servidor.
 */
function fatiar(r, antes) {
  const v = r.visao
  if (!v) return null
  const nCmd = antes?.comandos?.length ?? 0, nEv = antes?.eventos?.length ?? 0
  const cmds = v.comandos.slice(nCmd), evs = v.eventos.slice(nEv)
  const inicio = []
  let k = 0
  for (const c of cmds) {
    let j = k
    while (j < evs.length && !abreComando(evs[j], c)) j++
    if (j >= evs.length) { inicio.length = 0; break }
    inicio.push(j); k = j + 1
  }
  const ultimo = { id: r.id, validos: r.validos ?? [], intencao: r.intencao, prazoLocal: r.prazo ? performance.now() + Math.max(0, r.prazo - r.agora) : null }
  INFO.set(v, ultimo)
  if (!cmds.length || inicio.length !== cmds.length) return { estado: v, passos: [{ cmd: cmds.at(-1) ?? null, eventos: evs, estado: v }] }
  const passos = cmds.map((cmd, i) => ({ cmd, eventos: evs.slice(i === 0 ? 0 : inicio[i], inicio[i + 1] ?? evs.length), estado: null }))
  // os estados do meio: a visão final, com a vez de quem manda o próximo comando e sem fim (a arena só se acerta no último)
  for (let i = 0; i < passos.length; i++) {
    if (i === passos.length - 1) { passos[i].estado = v; continue }
    const parcial = { ...v, vez: passos[i + 1].cmd.time, fim: null, parcial: true }
    INFO.set(parcial, { id: r.id, validos: [], fila: null })
    passos[i].estado = parcial
  }
  for (let i = 0; i < passos.length - 1; i++) INFO.get(passos[i].estado).fila = passos.slice(i + 1)
  return { estado: v, passos }
}

/** Estado do começo da luta quando o robô jogou primeiro: todos de pé e inteiros (a arena anima o turno dele a partir daí). */
function estadoDoComeco(fatias, v) {
  const bonecos = Object.fromEntries(Object.entries(v.bonecos).map(([k, b]) => [k, { ...b, vida: b.vidaMax, escudo: 0, estado: 'vivo', veu: false }]))
  const e = { ...v, bonecos, vez: RIVAL, fim: null, parcial: true, comandos: [], eventos: [] }
  INFO.set(e, { id: INFO.get(v).id, validos: [], fila: fatias.passos })
  return e
}

/** Abre uma luta no servidor. opc: { modo, fase, ids, robo }. { ok, estado, modo, fase, robo, energia } ou a recusa. */
export async function abrirLuta({ modo, fase, ids, robo }) {
  let r
  try { r = await pedir('POST', 'luta', modo === 'aventura' ? { modo, fase, time: ids } : { modo: 'livre', time: ids, robo }) } catch (e) { return recusa(e) }
  if (r.energia) C.energia = r.energia
  atual = { id: r.id, seq: r.seq, ids: ids.slice() }
  guardarLuta()
  const f = fatiar(r, null)
  const roboPrimeiro = f.passos.length && f.passos[0].cmd && f.passos[0].cmd.time === RIVAL
  return { ok: true, estado: roboPrimeiro ? estadoDoComeco(f, f.estado) : f.estado, modo: r.modo, fase: r.fase, robo: r.robo, energia: C.energia }
}

/** Volta à luta aberta da conta (depois de recarregar a página ou de cair a rede). */
export async function retomarLuta() {
  if (!C.lutaAberta) return { ok: false, codigo: 'SEM_LUTA', motivo: 'Nenhuma luta aberta.' }
  let r
  try { r = await comRede(() => pedir('GET', `luta/${C.lutaAberta}`)) } catch (e) { return recusa(e) }
  let ids = null
  try { const g = JSON.parse(localStorage.getItem(CHAVE_LUTA) || 'null'); if (g && g.id === r.id && Array.isArray(g.ids)) ids = g.ids } catch { /* ok */ }
  atual = { id: r.id, seq: r.seq, ids }
  if (r.status !== 'aberta') { C.lutaAberta = null; atual = null; guardarLuta() }
  return { ok: true, estado: fatiar(r, null).estado, modo: r.modo, fase: r.fase, robo: r.robo, ids, aberta: r.status === 'aberta' }
}

/** Resposta (ou recusa com a luta dentro) → o primeiro passo novo, com a fila do resto pendurada no estado. */
function passoDe(r, antes, aviso) {
  atual = r.status === 'aberta' ? { ...(atual ?? {}), id: r.id, seq: r.seq } : null
  if (!atual) { C.lutaAberta = null; guardarLuta() }
  const f = fatiar(r, antes)
  const p = f.passos[0]
  return { ok: true, estado: p.estado, eventos: p.eventos, cmd: p.cmd, ...(aviso ? { aviso } : {}) }
}

/** Manda um comando. Do jogador: vai ao servidor (repete com o mesmo seq se a rede cair). Do rival: vem da fila já recebida. */
export async function enviar(e, cmd) {
  const info = INFO.get(e)
  if (cmd.time === RIVAL || e.parcial) { // o turno do robô já aconteceu no servidor: só tira o próximo passo da fila
    const p = info?.fila?.[0]
    if (!p) return { ok: false, codigo: 'FORA_DO_TURNO', motivo: 'Espere a sua vez.' }
    return { ok: true, estado: p.estado, eventos: p.eventos, cmd: p.cmd }
  }
  if (!atual || atual.id !== info.id) return { ok: false, codigo: 'LUTA_ACABOU', motivo: 'Essa luta não está mais aberta.' }
  const comando = { tipo: cmd.tipo }
  for (const k of ['carta', 'alvo', 'a', 'b']) if (cmd[k] !== undefined) comando[k] = cmd[k]
  const seq = atual.seq
  try {
    const r = await comRede(() => pedir('POST', `luta/${atual.id}/comando`, { seq, comando }))
    return passoDe(r, e)
  } catch (x) {
    if (x instanceof ErroDoServidor && x.extra?.luta) return passoDe(x.extra.luta, e, x.motivo) // o tempo do turno estourou: a vez passou
    if (x instanceof ErroDoServidor && ['SEQ_INVALIDA', 'SEQ_JA_USADA', 'CONCORRENCIA'].includes(x.codigo)) {
      const s = await atualizar(e)
      if (s) return { ...s, aviso: 'A luta mudou em outro lugar: a tela foi acertada.' }
    }
    return recusa(x)
  }
}

/** Pergunta ao servidor se a luta andou sem comando da tela (o relógio do turno estourou). null = nada mudou. */
export async function atualizar(e) {
  const info = INFO.get(e)
  if (!info) return null
  let r
  try { r = await comRede(() => pedir('GET', `luta/${info.id}`)) } catch { return null }
  if (r.visao && r.visao.comandos.length === e.comandos.length && !r.visao.fim) return null
  return passoDe(r, e)
}

/** Desistir: o robô vence; volta o estado final. */
export async function desistir(e) {
  const info = INFO.get(e)
  try {
    const r = await pedir('POST', `luta/${info.id}/desistir`)
    atual = null; C.lutaAberta = null; guardarLuta()
    const f = fatiar(r, e)
    return { ok: true, estado: f.estado }
  } catch (x) { return recusa(x) }
}

/** Comandos do robô ainda na fila deste estado (o servidor já os jogou); na vez do jogador, a primeira jogada válida. */
export function plano(e) {
  const info = INFO.get(e)
  if (info?.fila?.length) return info.fila.map((p) => p.cmd)
  const v = info?.validos ?? []
  return v.length ? [v.find((c) => c.tipo === 'jogar') ?? v.find((c) => c.tipo === 'fiapo') ?? v.at(-1)] : []
}

/** Segundos que faltam no relógio do turno (pelo prazo do servidor). */
export function segundosDoTurno(e) {
  const p = INFO.get(e)?.prazoLocal
  return p == null ? null : Math.max(0, (p - performance.now()) / 1000)
}

/** Replay da luta encerrada (a semente só sai depois do fim): { semente, timeA, timeB, robo, comandos }. */
export async function replay(e) {
  const info = INFO.get(e)
  try {
    const r = await comRede(() => pedir('GET', `luta/${info.id}/replay`))
    return { semente: r.semente, timeA: r.timeA, timeB: r.timeB, robo: r.robo, comandos: r.comandos }
  } catch { return null }
}
