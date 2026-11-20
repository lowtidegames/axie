// Porão — carteiras Solana no navegador, SÓ para assinar uma mensagem de login.
// Decisão do dono 20/11 18:17: login por ASSINATURA de mensagem; nenhuma transação, nenhum token.
// Este arquivo nunca pede transação, aprovação nem saldo: só `connect` e `signMessage`.
// A carteira de rede de outro tipo (objeto injetado das redes EVM) NUNCA é usada aqui.
//
// Como acha as carteiras:
//  1) Wallet Standard: despacha `wallet-standard:app-ready` com { register } e ouve
//     `wallet-standard:register-wallet` (o detalhe é uma função que recebe { register }).
//     Só entra carteira com `standard:connect` + `solana:signMessage` e cadeia `solana:*`.
//  2) Reserva (carteiras antigas): window.phantom.solana, window.solflare, window.backpack.
//
// listarCarteiras() → [{ nome, icone, conectar() }]
// conectar() → { carteira (chave pública em base58), assinar(mensagemTexto) → assinatura base58 }
import * as B58 from '../comum/base58.js';

const codificarBase58 = B58.codificar ?? B58.encode ?? B58.paraBase58 ?? B58.codificarBase58 ?? B58.default?.codificar;

const EV_PRONTO = 'wallet-standard:app-ready';
const EV_REGISTRO = 'wallet-standard:register-wallet';
const ehSolana = (c) => typeof c === 'string' && c.startsWith('solana:');

function paraBytes(x) {
  if (x instanceof Uint8Array) return x;
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  if (Array.isArray(x)) return Uint8Array.from(x);
  return null;
}

function iguais(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

/** Chave ou assinatura (bytes) → texto base58. */
export function paraBase58(bytes) { return b58(paraBytes(bytes)); }

function b58(bytes) {
  if (typeof codificarBase58 !== 'function') throw new Error('Falta o codificador base58 (porao/comum/base58.js).');
  return codificarBase58(bytes);
}

function conferirAssinatura(sig) {
  const s = paraBytes(sig);
  if (!s || s.length !== 64) throw new Error('A carteira devolveu uma assinatura inválida.');
  return b58(s);
}

/** A carteira do Wallet Standard serve? (connect + signMessage + cadeia solana) */
export function carteiraServe(w) {
  if (!w || typeof w !== 'object') return false;
  const f = w.features || {};
  if (typeof f['standard:connect']?.connect !== 'function') return false;
  if (typeof f['solana:signMessage']?.signMessage !== 'function') return false;
  const cadeias = [...(w.chains || []), ...((w.accounts || []).flatMap((a) => a.chains || []))];
  return cadeias.some(ehSolana);
}

function embrulharPadrao(w) {
  return {
    nome: String(w.name || 'Carteira'),
    icone: typeof w.icon === 'string' && w.icon.startsWith('data:image/') ? w.icon : null,
    origem: 'padrao',
    async conectar() {
      const r = await w.features['standard:connect'].connect();
      const contas = r?.accounts?.length ? r.accounts : (w.accounts || []);
      const conta = contas.find((a) => (a.chains || []).some(ehSolana));
      if (!conta) throw new Error('Esta carteira não tem conta Solana.');
      const chave = paraBytes(conta.publicKey);
      if (!chave || chave.length !== 32) throw new Error('A carteira devolveu uma chave pública inválida.');
      const carteira = b58(chave);
      if (conta.address && conta.address !== carteira) throw new Error('Endereço e chave da carteira não batem.');
      return {
        carteira,
        async assinar(mensagemTexto) {
          const pedida = new TextEncoder().encode(String(mensagemTexto));
          const saida = await w.features['solana:signMessage'].signMessage({ account: conta, message: pedida });
          const r0 = Array.isArray(saida) ? saida[0] : saida;
          const assinada = paraBytes(r0?.signedMessage);
          // A carteira pode trocar o texto (ex.: acrescentar algo): aí recusamos.
          if (!iguais(assinada, pedida)) throw new Error('A carteira assinou um texto diferente do pedido. Recusado.');
          return conferirAssinatura(r0.signature);
        },
      };
    },
  };
}

function embrulharAntiga(nome, prov) {
  return {
    nome,
    icone: null,
    origem: 'reserva',
    async conectar() {
      const r = await prov.connect();
      const pk = r?.publicKey ?? prov.publicKey;
      let carteira = null;
      const bytes = paraBytes(pk?.toBytes?.() ?? pk);
      if (bytes && bytes.length === 32) carteira = b58(bytes);
      else if (typeof pk?.toBase58 === 'function') carteira = pk.toBase58();
      if (!carteira) throw new Error('A carteira não devolveu a chave pública.');
      return {
        carteira,
        async assinar(mensagemTexto) {
          const pedida = new TextEncoder().encode(String(mensagemTexto));
          const saida = await prov.signMessage(pedida, 'utf8');
          return conferirAssinatura(saida?.signature ?? saida);
        },
      };
    },
  };
}

function antigas(janela) {
  const lista = [];
  const ok = (p) => p && typeof p.connect === 'function' && typeof p.signMessage === 'function';
  if (ok(janela.phantom?.solana)) lista.push(['Phantom', janela.phantom.solana]);
  if (ok(janela.solflare)) lista.push(['Solflare', janela.solflare]);
  if (ok(janela.backpack)) lista.push(['Backpack', janela.backpack]);
  return lista;
}

/** Cria o vigia de carteiras numa janela (a de verdade ou uma falsa nos testes). */
export function iniciarCarteiras(janela = globalThis.window ?? globalThis) {
  const registradas = new Set();
  const ouvintes = new Set();
  const avisar = () => { for (const f of ouvintes) { try { f(); } catch { /* ouvinte quebrado */ } } };

  function register(...ws) {
    for (const w of ws) if (w) registradas.add(w);
    avisar();
    return () => { for (const w of ws) registradas.delete(w); avisar(); };
  }
  const api = Object.freeze({ register });

  if (typeof janela?.addEventListener === 'function') {
    janela.addEventListener(EV_REGISTRO, (ev) => {
      try { if (typeof ev?.detail === 'function') ev.detail(api); } catch { /* carteira quebrada não derruba a tela */ }
    });
  }
  if (typeof janela?.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    try { janela.dispatchEvent(new CustomEvent(EV_PRONTO, { detail: api })); } catch { /* sem eventos */ }
  }

  function listarCarteiras() {
    const lista = [];
    const nomes = new Set();
    for (const w of registradas) {
      if (!carteiraServe(w)) continue;
      const c = embrulharPadrao(w);
      lista.push(c);
      nomes.add(c.nome.toLowerCase());
    }
    for (const [nome, prov] of antigas(janela)) {
      if (!nomes.has(nome.toLowerCase())) lista.push(embrulharAntiga(nome, prov));
    }
    return lista;
  }

  /** Chama `f` quando uma carteira entra ou sai. Devolve a função para parar. */
  function aoMudar(f) { ouvintes.add(f); return () => ouvintes.delete(f); }

  return { listarCarteiras, aoMudar };
}

let unico = null;
/** Lista as carteiras da página (inicia o vigia na primeira chamada). */
export function listarCarteiras() {
  if (!unico) unico = iniciarCarteiras();
  return unico.listarCarteiras();
}
export function aoMudarCarteiras(f) {
  if (!unico) unico = iniciarCarteiras();
  return unico.aoMudar(f);
}
