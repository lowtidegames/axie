// Porão — conversa com o servidor (e o MODO FALSO, só para desenvolver e testar a tela).
// A tela nunca decide: pede a ação e mostra a "visão" que o servidor devolveu.
//
// Cada chamada devolve { ok, erro?, resultado?, visao? }.
//   visao = { estado, previas:{ tapete:{[projetoId]:previa}, batida }, rendimentos:{[projetoId]:caixaPorHora}, bonus,
//             impressora:{ custo, chances }, luxos:[{id,custo,bonus,comprado}], influenciadores:[...], prestigio:{liberado,meta},
//             nomes? (troca de textos por chave), agora }
// Servidor: { ok:true, estado, ...extras } | { ok:false, erro, codigo }; o que faltar na visão a tela monta
// com as MESMAS funções de porao/comum/regras.js (nunca com conta própria). Toda ação leva a chave de pedido no cabeçalho Idempotency-Key.
// Modo falso: ?falso=1 na página, ou quando o servidor NÃO RESPONDE (GET /api/sessao sem resposta JSON em 1,5 s).
// Resposta 401 NÃO leva ao modo falso: vira o evento `sem-sessao` (a tela volta ao título).
//
// Sessão (login só por ASSINATURA de mensagem; decisão do dono 20/11 18:17; nenhuma transação):
//   sessao() GET /api/sessao → { ok, conta|null } · desafio(carteira) → { ok, mensagem, nonce, venceEm }
//   entrar({ carteira, nonce, assinatura }) → { ok, conta } · convidado() · sair() · apelido(nome)
// No modo falso há uma "Carteira de teste" registrada pelo Wallet Standard (par ed25519 do navegador
// quando crypto.subtle tem Ed25519; senão assinatura fingida, aceita SÓ pelo modo falso).
import * as R from '../comum/regras.js';
import { LUXOS, INFLUENCIADORES, CONTRATO } from '../comum/config.js';
// carteira-navegador.js (e o base58 dele) só carrega quando a carteira de teste é usada:
// a página do jogo abre mesmo se esse arquivo faltar.
const paraBase58 = async (bytes) => (await import('./carteira-navegador.js')).paraBase58(bytes);

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

const janelaPadrao = () => globalThis.window ?? globalThis;

/** Avisa a tela que a sessão acabou (401). */
function avisarSemSessao(alvo, detalhe) {
  try {
    if (typeof alvo?.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      alvo.dispatchEvent(new CustomEvent('sem-sessao', { detail: detalhe }));
    }
  } catch { /* sem eventos */ }
}

// ---------------------------------------------------------------------------------------------
// Carteira de teste (só no modo falso): uma carteira do Wallet Standard de mentira
// ---------------------------------------------------------------------------------------------
const ICONE_TESTE = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#444"/>'
  + '<text x="16" y="22" font-size="16" text-anchor="middle" fill="#fff">T</text></svg>');

async function criarAssinante() {
  const sutil = globalThis.crypto?.subtle;
  try {
    const par = await sutil.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const chave = new Uint8Array(await sutil.exportKey('raw', par.publicKey));
    if (chave.length !== 32) throw new Error('chave estranha');
    return {
      verdadeira: true,
      chave,
      assinar: async (msg) => new Uint8Array(await sutil.sign({ name: 'Ed25519' }, par.privateKey, msg)),
      conferir: async (msg, sig) => sutil.verify({ name: 'Ed25519' }, par.publicKey, sig, msg),
    };
  } catch {
    // Sem Ed25519 no navegador: assinatura FINGIDA (64 bytes tirados da mensagem). Só o modo falso aceita.
    const chave = new Uint8Array(32);
    globalThis.crypto?.getRandomValues?.(chave);
    const fingir = (msg) => {
      const s = new Uint8Array(64);
      for (let i = 0; i < msg.length; i++) s[i % 64] = (s[i % 64] * 31 + msg[i] + chave[i % 32]) & 255;
      return s;
    };
    return {
      verdadeira: false,
      chave,
      assinar: async (msg) => fingir(msg),
      conferir: async (msg, sig) => (await paraBase58(fingir(msg))) === (await paraBase58(sig)),
    };
  }
}

/** Registra a "Carteira de teste" na janela pelo Wallet Standard (como uma extensão faria). Só modo falso. */
export function registrarCarteiraDeTeste(janela = janelaPadrao()) {
  let assinante = null;
  const pronto = () => (assinante ??= criarAssinante());
  const conta = { address: '', publicKey: null, chains: ['solana:devnet'], features: ['solana:signMessage'] };
  const assinadas = new Map(); // mensagem → assinatura base58 (para o modo falso conferir)
  const carteira = {
    version: '1.0.0',
    name: 'Carteira de teste',
    icon: ICONE_TESTE,
    chains: ['solana:devnet'],
    accounts: [],
    features: {
      'standard:connect': {
        version: '1.0.0',
        async connect() {
          const a = await pronto();
          conta.publicKey = a.chave;
          conta.address = await paraBase58(a.chave);
          carteira.accounts = [conta];
          return { accounts: [conta] };
        },
      },
      'solana:signMessage': {
        version: '1.0.0',
        async signMessage(...pedidos) {
          const a = await pronto();
          const saida = [];
          for (const { message } of pedidos) {
            const signature = await a.assinar(message);
            assinadas.set(new TextDecoder().decode(message), await paraBase58(signature));
            saida.push({ signedMessage: message, signature });
          }
          return saida;
        },
      },
    },
  };
  const cb = (api) => { try { api?.register?.(carteira); } catch { /* sem vigia */ } };
  if (typeof janela?.addEventListener === 'function') {
    janela.addEventListener('wallet-standard:app-ready', (ev) => cb(ev.detail));
  }
  if (typeof janela?.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    try { janela.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: cb })); } catch { /* sem eventos */ }
  }
  return {
    carteira,
    /** O modo falso confere: esta carteira assinou exatamente esta mensagem com esta assinatura? */
    async conferir(chaveBase58, mensagem, assinaturaBase58) {
      if (!assinante) return false;
      const a = await assinante;
      if ((await paraBase58(a.chave)) !== chaveBase58) return false;
      if (typeof assinaturaBase58 !== 'string' || assinadas.get(mensagem) !== assinaturaBase58) return false;
      const msg = new TextEncoder().encode(mensagem);
      return a.conferir(msg, await a.assinar(msg));
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Modo falso: roda regras.js no navegador
// ---------------------------------------------------------------------------------------------
function criarApiFalsa({ janela = janelaPadrao() } = {}) {
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

  // Sessão de mentira (o jogo falso não exige sessão, para a tela antiga seguir funcionando).
  const teste = registrarCarteiraDeTeste(janela);
  const desafios = new Map();
  let conta = null;
  const curta = (c) => `${c.slice(0, 4)}…${c.slice(-4)}`;
  const sessao = {
    async sessao() { return { ok: true, conta }; },
    async desafio(carteira) {
      if (typeof carteira !== 'string' || carteira.length < 32 || carteira.length > 44) {
        return { ok: false, erro: 'Carteira inválida.', codigo: 'carteira_invalida' };
      }
      const nonce = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
      const agora = Date.now(); const venceEm = agora + 5 * 60 * 1000;
      const mensagem = ['Porão (modo de teste) quer confirmar que esta carteira é sua.', `Site: ${globalThis.location?.host || 'teste'}`,
        `Carteira: ${carteira}`, `Número de uso único: ${nonce}`, `Emitida: ${new Date(agora).toISOString()}`,
        `Vence: ${new Date(venceEm).toISOString()}`, 'Isto NÃO é uma transação e não custa nada.'].join('\n');
      desafios.set(nonce, { carteira, mensagem, venceEm, usado: false });
      return { ok: true, mensagem, nonce, venceEm };
    },
    async entrar({ carteira, nonce, assinatura } = {}) {
      const d = desafios.get(nonce);
      const recusa = { ok: false, erro: 'Assinatura recusada. Tente de novo.', codigo: 'assinatura_recusada' };
      if (!d || d.usado || d.venceEm < Date.now() || d.carteira !== carteira) return recusa;
      d.usado = true;
      if (!(await teste.conferir(carteira, d.mensagem, assinatura))) return recusa;
      conta = { tipo: 'carteira', apelido: null, carteiraCurta: curta(carteira), pedirApelido: false };
      return { ok: true, conta };
    },
    async convidado() { conta = { tipo: 'convidado', apelido: null, carteiraCurta: null, pedirApelido: false }; return { ok: true, conta }; },
    async sair() { conta = null; return { ok: true }; },
    async apelido(nome) {
      if (!conta) {
        avisarSemSessao(janela, { caminho: '/api/apelido', codigo: 'sem_sessao' });
        return { ok: false, erro: 'Sua sessão acabou. Entre de novo.', codigo: 'sem_sessao', semSessao: true };
      }
      const n = String(nome ?? '').trim();
      if (n.length < 3 || n.length > 16) return { ok: false, erro: 'O apelido precisa de 3 a 16 letras.', codigo: 'apelido_invalido' };
      conta = { ...conta, apelido: n, pedirApelido: false };
      return { ok: true, conta };
    },
  };

  return {
    modo: 'falso',
    ...sessao,
    carteiraDeTeste: teste.carteira,
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
function criarApiReal(base = '', { janela = janelaPadrao() } = {}) {
  async function pedir(metodo, caminho, corpo, chave) {
    const init = { method: metodo, headers: { accept: 'application/json', 'X-Porao': '1' }, credentials: 'same-origin' };
    if (metodo === 'POST') {
      init.headers['content-type'] = 'application/json';
      init.headers['Idempotency-Key'] = chave ?? chaveNova();
      init.body = JSON.stringify(corpo || {});
    }
    const r = await fetch(base + caminho, init);
    if (r.status === 401) {
      let j = {};
      try { j = await r.json(); } catch { /* corpo vazio */ }
      avisarSemSessao(janela, { caminho, codigo: j.codigo || 'sem_sessao' });
      return { r, j, semSessao: true };
    }
    return { r, j: await r.json(), semSessao: false };
  }
  const SEM_SESSAO = { ok: false, erro: 'Sua sessão acabou. Entre de novo.', codigo: 'sem_sessao', semSessao: true };

  async function chamar(metodo, caminho, corpo, chave) {
    try {
      const { r, j, semSessao } = await pedir(metodo, caminho, corpo, chave);
      if (semSessao) return { ...SEM_SESSAO, visao: null };
      const estado = j.estado ?? j.visao?.estado;
      const v = j.visao ?? (estado ? montarVisao(estado, Date.now()) : null);
      const ok = j.ok ?? r.ok;
      return { ok, erro: ok ? undefined : (j.erro || 'O servidor recusou o pedido.'), resultado: j.resultado ?? j, visao: v };
    } catch {
      return { ok: false, erro: 'Sem conexão com o servidor.', visao: null };
    }
  }
  const post = (caminho, corpo, chave = chaveNova()) => chamar('POST', caminho, corpo, chave);

  /** Chamadas de sessão: devolvem os campos do servidor como vieram ({ ok, conta, mensagem, nonce, ... }). */
  async function sessaoChamar(metodo, caminho, corpo) {
    try {
      const { r, j, semSessao } = await pedir(metodo, caminho, corpo);
      if (semSessao) return { ...SEM_SESSAO };
      const ok = j.ok ?? r.ok;
      return { ...j, ok, erro: ok ? undefined : (j.erro || 'O servidor recusou o pedido.') };
    } catch {
      return { ok: false, erro: 'Sem conexão com o servidor.' };
    }
  }

  return {
    modo: 'servidor',
    sessao: () => sessaoChamar('GET', '/api/sessao'),
    desafio: (carteira) => sessaoChamar('POST', '/api/sessao/desafio', { carteira }),
    entrar: ({ carteira, nonce, assinatura } = {}) => sessaoChamar('POST', '/api/sessao/entrar', { carteira, nonce, assinatura }),
    convidado: () => sessaoChamar('POST', '/api/sessao/convidado', {}),
    sair: () => sessaoChamar('POST', '/api/sessao/sair', {}),
    apelido: (nome) => sessaoChamar('POST', '/api/apelido', { apelido: nome }),
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

/**
 * Escolhe o modo: ?falso=1 → falso; senão sonda GET /api/sessao. Qualquer resposta JSON do servidor
 * (inclusive 401) = modo servidor. Só cai no falso quando o servidor não responde JSON em 1,5 s.
 * `janela`: onde sai o evento `sem-sessao` e onde a carteira de teste se registra (padrão: window).
 */
export async function criarApi({ busca = globalThis.location?.search ?? '', base = '', janela = janelaPadrao() } = {}) {
  if (new URLSearchParams(busca).get('falso') === '1') return criarApiFalsa({ janela });
  const real = criarApiReal(base, { janela });
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1500);
    const r = await fetch(base + '/api/sessao', {
      headers: { accept: 'application/json', 'X-Porao': '1' }, credentials: 'same-origin', signal: ctl.signal,
    });
    clearTimeout(t);
    const tipo = r.headers.get('content-type') || '';
    if (tipo.includes('json')) return real;
  } catch { /* sem servidor */ }
  return criarApiFalsa({ janela });
}
