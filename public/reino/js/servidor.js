// Keepmile — ponte do MODO SERVIDOR (contrato em docs/reino/servidor.md). A página parada diz `modo.json` = "local" e nada daqui é
// usado; no servidor, `modo.json` vem com { modo: "servidor", api } e a tela passa a PEDIR tudo a ele: conta, partida, comandos com
// `seq`, ranking, perfil e replay. Aqui não há regra: só pedidos, repetição quando a rede cai (o MESMO pedido, o mesmo seq) e o
// código de erro do contrato. Os textos ficam em textos.js (T.srv).
const CHAVE = 'keepmile_sessao_v1'
const ESPERA_MS = 12_000 // pedido parado mais que isto conta como queda de rede

export class ErroS extends Error {
  constructor(codigo, status = 0, extra = {}) { super(codigo); this.codigo = codigo; this.status = status; this.extra = extra }
}
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms))
let criando = null

export const Srv = {
  on: false, api: '', token: null, apelido: null,
  /** Relógio do servidor menos o do aparelho (ms), lido do cabeçalho `Date` das respostas: o tempo que falta é sempre o dele. */
  relogio: 0,
  /** (caiu: boolean) → a tela mostra ou tira o "Reconnecting..." */
  aoRede: () => {},
  agora: () => Date.now() + Srv.relogio,

  /** Pergunta o modo. Só caminhos relativos: a API fica na mesma raiz da página (funciona atrás de subpasta). */
  async detectar() {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000)
    try {
      const r = await fetch(new URL('modo.json', document.baseURI), { cache: 'no-store', signal: ctl.signal })
      if (!r.ok) return false
      const j = await r.json()
      if (!j || j.modo !== 'servidor' || typeof j.api !== 'string') return false
      const aqui = new URL('.', document.baseURI), m = /^(.*\/)public\/reino\/$/.exec(aqui.pathname)
      Srv.api = m ? new URL(m[1] + j.api.replace(/^\/+/, ''), aqui).href : new URL(j.api, aqui).href
      try { const s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (s && typeof s.token === 'string') { Srv.token = s.token; Srv.apelido = s.apelido || null } } catch { /* sem armazenamento */ }
      Srv.on = true
      return true
    } catch { return false } finally { clearTimeout(t) }
  },

  /** Um pedido, sem repetir. Erro do contrato → ErroS(codigo, status, extra); rede fora → ErroS('SEM_REDE'). */
  async bruto(metodo, caminho, corpo, comToken = true) {
    const headers = {}
    if (comToken && Srv.token) headers.Authorization = `Bearer ${Srv.token}`
    if (corpo !== undefined) headers['Content-Type'] = 'application/json'
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ESPERA_MS)
    let r
    try { r = await fetch(new URL(caminho, Srv.api), { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo), cache: 'no-store', signal: ctl.signal }) } catch { throw new ErroS('SEM_REDE') } finally { clearTimeout(t) }
    const data = Date.parse(r.headers.get('date') || ''); if (Number.isFinite(data)) Srv.relogio = data - Date.now()
    let j = null
    try { j = await r.json() } catch { /* corpo que não é JSON (proxy, queda) */ }
    if (r.ok && j) return j
    const { codigo, motivo, ...extra } = j?.erro ?? {}
    throw new ErroS(codigo || (r.status === 429 ? 'MUITOS_PEDIDOS' : r.status >= 502 ? 'SEM_REDE' : 'ERRO_INTERNO'), r.status, extra)
  },

  /** CONTA SEM ATRITO: na 1ª visita o servidor cria a conta com um apelido sorteado; o token fica guardado no aparelho. */
  async entrar() {
    if (Srv.token) return
    criando ||= (async () => {
      for (let i = 0; ; i++) {
        const apelido = 'Keeper ' + String(10000 + Math.floor(Math.random() * 90000))
        try {
          const r = await Srv.bruto('POST', '../conta', { apelido }, false)
          Srv.token = r.token; Srv.apelido = r.conta?.apelido || apelido
          try { localStorage.setItem(CHAVE, JSON.stringify({ token: Srv.token, apelido: Srv.apelido })) } catch { /* vale só nesta visita */ }
          return
        } catch (e) { if (e.codigo !== 'APELIDO_EM_USO' || i >= 5) throw e }
      }
    })().finally(() => { criando = null })
    return criando
  },

  /** Pedido com conta. Sessão que não vale mais (401): o aparelho ganha conta nova e o pedido se repete uma vez. */
  async pedir(metodo, caminho, corpo) {
    await Srv.entrar()
    try { return await Srv.bruto(metodo, caminho, corpo) } catch (e) {
      if (e.status !== 401) throw e
      Srv.token = null; try { localStorage.removeItem(CHAVE) } catch { /* ok */ }
      await Srv.entrar()
      return Srv.bruto(metodo, caminho, corpo)
    }
  },

  /** Repete o MESMO pedido enquanto a rede estiver fora. `ateMs` = desiste depois disso (0: nunca desiste — é o do comando). */
  async comRede(fazer, ateMs = 0) {
    const t0 = Date.now(); let caiu = false, espera = 400
    try {
      for (;;) {
        try { return await fazer() } catch (e) {
          if (e.codigo !== 'SEM_REDE' || (ateMs && Date.now() - t0 > ateMs)) throw e
          if (!caiu) { caiu = true; Srv.aoRede(true) }
          await dormir(espera); espera = Math.min(3000, espera * 2)
        }
      }
    } finally { if (caiu) Srv.aoRede(false) }
  },

  aberta: (modo) => Srv.comRede(() => Srv.pedir('GET', 'partida' + (modo ? '?modo=' + modo : '')), 8000),
  abrir: (modo) => Srv.pedir('POST', 'partida', { modo }),
  /** O comando com `seq`: rede caiu → o mesmo seq de novo, até chegar (o servidor devolve a resposta guardada, sem aplicar 2 vezes). */
  comando: (partida, seq, comando) => Srv.comRede(() => Srv.pedir('POST', 'partida/comando', { partida, seq, comando })),
  desistir: (partida) => Srv.pedir('POST', 'partida/desistir', { partida }),
  ranking: (cursor = '') => Srv.comRede(() => Srv.pedir('GET', 'ranking' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : '')), 8000),
  perfil: () => Srv.comRede(() => Srv.pedir('GET', 'perfil'), 8000),
  /** Replay inteiro: junta as páginas (`?desde=`) até `proximo` vir null. */
  async replay(id) {
    let rep = null, desde = 0
    for (let i = 0; i < 40; i++) {
      const p = await Srv.comRede(() => Srv.pedir('GET', 'replay/' + id + (desde ? '?desde=' + desde : '')), 8000)
      if (!rep) rep = { ...p, passos: [...p.passos] }; else rep.passos.push(...p.passos)
      if (p.proximo == null) { rep.proximo = null; return rep }
      desde = p.proximo
    }
    return rep
  },
}
