// Porão — conversa com o servidor (e o MODO FALSO, só para desenvolver e testar a tela).
// A tela nunca decide: pede a ação e mostra a "visão" que o servidor devolveu.
//
// Cada chamada devolve { ok, erro?, resultado?, visao? }.
//   visao = { estado, previas:{ tapete:{[projetoId]:previa}, batida }, rendimentos:{[projetoId]:caixaPorHora}, bonus,
//             impressora:{ custo, chances }, luxos:[{id,custo,bonus,comprado}], influenciadores:[...], prestigio:{liberado,meta},
//             nomes? (troca de textos por chave), agora }
// Servidor: { ok:true, estado, ...extras } | { ok:false, erro, codigo }; o que faltar na visão a tela monta
// com as MESMAS funções de porao/comum/regras.js (nunca com conta própria). Toda ação leva a chave de pedido no cabeçalho Idempotency-Key.
// Modo falso: ?falso=1 na página, ou quando GET /api/estado não responde JSON em 1,5 s.
import * as R from '../comum/regras.js';
import { LUXOS, INFLUENCIADORES, CONTRATO } from '../comum/config.js';

const chaveNova = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Visão pública a partir do estado (sem semente nem contador de sorteio). */
export function montarVisao(estado, agora = Date.now(), extra = {}) {
  // eslint-disable-next-line no-unused-vars
  const { semente, sorteios, ...pub } = estado;
  const noAr = estado.projetos.filter((p) => R.FASES_NO_AR.includes(p.fase));
  const tapete = {}; const rendimentos = {};
  for (const p of noAr) {
    rendimentos[p.id] = R.rendimentoPorHora(estado, p.id);
    const previa = R.previaTapete(estado, p.id);
    if (previa.ok) tapete[p.id] = previa;
  }
  const liberados = R.influenciadoresLiberados(estado);
  return {
    estado: pub,
    agora,
    previas: { tapete, batida: R.previaBatida(estado) },
    rendimentos,
    bonus: R.bonus(estado),
    impressora: { custo: R.custoImpressao(estado), chances: R.chancesDaImpressora() },
    luxos: LUXOS.map((l) => ({ id: l.id, custo: l.custo, bonus: l.bonus, comprado: estado.luxos.includes(l.id) })),
    influenciadores: INFLUENCIADORES.map((i) => ({
      id: i.id, tamanho: i.tamanho, p1: CONTRATO.tamanhos[i.tamanho].p1, liberado: liberados.includes(i.id),
      falta: Math.max(0, i.liberaComTapetes - estado.contagem.tapetes),
      carimbos: estado.carteirinha[i.id] || 0, reincidente: R.ehReincidente(estado, i.id),
    })),
    prestigio: { liberado: R.prestigioLiberado(estado), meta: R.metaPrestigio(estado) },
    ...extra,
  };
}

// ---------------------------------------------------------------------------------------------
// Modo falso: roda regras.js no navegador
// ---------------------------------------------------------------------------------------------
function criarApiFalsa() {
  const semente = `tela-${chaveNova()}`;
  let est = R.estadoInicial({ semente, agora: Date.now() });
  const vistas = new Map(); // chave de pedido → resposta (não conta duas vezes)

  const visao = () => montarVisao(est);
  function avancar() { est = R.avancar(est, Date.now()).estado; }

  async function agir(chave, fn) {
    if (chave && vistas.has(chave)) return vistas.get(chave);
    avancar();
    const r = fn(est);
    let resp;
    if (!r.ok) resp = { ok: false, erro: r.erro, visao: visao() };
    else { est = r.estado; const { estado, ...resultado } = r; resp = { ok: true, resultado, visao: visao() }; }
    if (chave) vistas.set(chave, resp);
    return resp;
  }

  return {
    modo: 'falso',
    async estado() { avancar(); return { ok: true, visao: visao() }; },
    imprimir: (chave = chaveNova()) => agir(chave, (e) => R.imprimir(e)),
    fundir: (ideia, chave = chaveNova()) => agir(chave, (e) => R.fundir(e, ideia)),
    lancar: (cartaId, chave = chaveNova()) => agir(chave, (e) => R.lancar(e, cartaId)),
    tapete: (projetoId, chave = chaveNova()) => agir(chave, (e) => R.puxarTapete(e, projetoId)),
    batida: (escolha, chave = chaveNova()) => agir(chave, (e) => R.resolverBatida(e, escolha)),
    luxo: (id, chave = chaveNova()) => agir(chave, (e) => R.comprarLuxo(e, id)),
    contrato: (projetoId, influenciador, chave = chaveNova()) => agir(chave, (e) => R.contratar(e, projetoId, influenciador)),
    resposta: (projetoId, resposta, chave = chaveNova()) => agir(chave, (e) => R.responderContrato(e, projetoId, resposta)),
    prestigio: (chave = chaveNova()) => agir(chave, (e) => R.irPreso(e)),
    missao: async () => ({ ok: false, erro: 'Missões ainda não existem no modo de teste.', visao: visao() }),
    /** Só no modo falso, para conferência: muda o estado na mão (ex.: Calor alto para ver a batida). */
    depurar(fn) { const c = structuredClone(est); fn(c); est = c; return visao(); },
  };
}

// ---------------------------------------------------------------------------------------------
// Modo real: HTTP
// ---------------------------------------------------------------------------------------------
function criarApiReal(base = '') {
  async function chamar(metodo, caminho, corpo, chave) {
    try {
      const init = { method: metodo, headers: { accept: 'application/json', 'X-Porao': '1' } };
      if (metodo === 'POST') {
        init.headers['content-type'] = 'application/json';
        init.headers['Idempotency-Key'] = chave;
        init.body = JSON.stringify(corpo || {});
      }
      const r = await fetch(base + caminho, init);
      const j = await r.json();
      const estado = j.estado ?? j.visao?.estado;
      const v = j.visao ?? (estado ? montarVisao(estado, Date.now()) : null);
      const ok = j.ok ?? r.ok;
      return { ok, erro: ok ? undefined : (j.erro || 'O servidor recusou o pedido.'), resultado: j.resultado ?? j, visao: v };
    } catch {
      return { ok: false, erro: 'Sem conexão com o servidor.', visao: null };
    }
  }
  const post = (caminho, corpo, chave = chaveNova()) => chamar('POST', caminho, corpo, chave);
  return {
    modo: 'servidor',
    estado: () => chamar('GET', '/api/estado'),
    imprimir: (chave) => post('/api/imprimir', {}, chave),
    fundir: (ideia, chave) => post('/api/fundir', { ideia }, chave),
    lancar: (cartaId, chave) => post('/api/lancar', { cartaId }, chave),
    tapete: (projetoId, chave) => post(`/api/projeto/${encodeURIComponent(projetoId)}/tapete`, {}, chave),
    batida: (escolha, chave) => post('/api/batida', { escolha }, chave),
    luxo: (id, chave) => post(`/api/luxo/${encodeURIComponent(id)}`, {}, chave),
    contrato: (projetoId, influenciador, chave) => post('/api/contrato', { projetoId, influenciador }, chave),
    resposta: (projetoId, resposta, chave) => post(`/api/contrato/${encodeURIComponent(projetoId)}/resposta`, { resposta }, chave),
    prestigio: (chave) => post('/api/prestigio', {}, chave),
    missao: (id, chave) => post(`/api/missao/${encodeURIComponent(id)}`, {}, chave),
  };
}

/** Escolhe o modo: ?falso=1 → falso; senão tenta o servidor e, se não responder JSON em 1,5 s, cai no falso. */
export async function criarApi({ busca = location.search, base = '' } = {}) {
  if (new URLSearchParams(busca).get('falso') === '1') return criarApiFalsa();
  const real = criarApiReal(base);
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1500);
    const r = await fetch(base + '/api/estado', { headers: { accept: 'application/json', 'X-Porao': '1' }, signal: ctl.signal });
    clearTimeout(t);
    const tipo = r.headers.get('content-type') || '';
    if (r.ok && tipo.includes('json')) return real;
  } catch { /* sem servidor */ }
  return criarApiFalsa();
}
