// Porão — liga a cena, os monitores e a API. Atualiza o estado a cada poucos segundos.
// Servidor decide; aqui só se pede o estado e se entrega para a tela desenhar.
import { criarCena } from './cena.js';
import { criarApi } from './api.js';
import { criarMonitores } from './monitores.js';
import { rodarAbertura } from './abertura.js';
import { criarTutorial } from './vo.js';

// Abertura (logo → carregando → título → ...) antes do porão. ?pular=abertura vai direto ao porão (testes antigos, sem vó).
const pularAbertura = new URLSearchParams(location.search).get('pular') === 'abertura';
const api = await criarApi(); // antes da abertura: no ?falso=1 a carteira de teste já se registra
const topo = document.querySelector('.pagina-topo');
const palco = document.querySelector('.pagina-palco');

// carteiras do navegador (Wallet Standard + reserva): só carrega quando a abertura precisa
let carteiras = null;
async function carregarCarteiras() {
  if (!carteiras) {
    try { const m = await import('./carteira-navegador.js'); m.listarCarteiras(); carteiras = m; } catch { carteiras = { listarCarteiras: () => [], aoMudarCarteiras: () => () => {} }; }
  }
  return carteiras;
}
/** Roda a abertura (do começo ou do título) e devolve a conta que o servidor deixou entrar. */
async function abrirAbertura(opcoes = {}) {
  topo.hidden = true; palco.hidden = true;
  let raiz = document.getElementById('abertura');
  if (!raiz) { raiz = document.createElement('div'); raiz.id = 'abertura'; raiz.className = 'pagina-abertura'; document.body.prepend(raiz); }
  const c = await carregarCarteiras();
  const r = await rodarAbertura(raiz, { api, listarCarteiras: c.listarCarteiras, aoMudarCarteiras: c.aoMudarCarteiras, ...opcoes });
  raiz.remove();
  topo.hidden = false; palco.hidden = false;
  return r;
}

let conta = null;
// acabou de entrar de novo depois de a sessão cair: com sessão válida, vai direto ao porão (sem repetir o título)
let direto = false;
try { direto = sessionStorage.getItem('porao_direto') === '1'; sessionStorage.removeItem('porao_direto'); } catch { /* sem armazenamento */ }
if (direto && !pularAbertura) conta = (await api.sessao().catch(() => null))?.conta || null;
if (pularAbertura || conta) document.getElementById('abertura')?.remove();
else conta = (await abrirAbertura()).conta;
topo.hidden = false; palco.hidden = false;

const raizCena = document.getElementById('cena');
let monitores = null;
let tutorial = null;

const cena = await criarCena(raizCena, {
  estado: { trouxas: 0, hype: 0, luxos: [], celularNovo: false },
  aoClicar: (c) => { if (c.alvo === 'celular') monitores?.abrirCelular(); },
  aoMudarVista: (v) => monitores?.aoMudarVista(v),
});
// a vó tutora só para quem entrou pela abertura (conta conhecida)
if (!pularAbertura) tutorial = criarTutorial({ api, conta, cena, menos: () => cena.menosAnimacao });
monitores = criarMonitores({ cena, api: tutorial?.api ?? api, raiz: raizCena, aoAtualizar: (v) => { pintarStatus(v); tutorial?.ver(v); } });

// barra de status fixa no topo: caixa, Calor (com cor) e a hora do relógio do jogo, mais o botão "Menos animação"
const sub = topo.querySelector('h1 small');
if (sub) sub.textContent = api.modo === 'falso' ? '— modo de teste (sem servidor)' : '— mesa do Rugrigo';
const botao = document.getElementById('menos');
const novo = (tag, classe, texto) => { const e = document.createElement(tag); if (classe) e.className = classe; if (texto != null) e.textContent = texto; return e; };
const status = novo('div', 'pagina-status');
status.setAttribute('aria-label', 'Situação agora');
function chip(nome, rotulo) {
  const c = novo('span', `pagina-chip pagina-chip--${nome}`); c.dataset.pm = `status-${nome}`;
  const valor = novo('b', 'pagina-chip__valor', '—');
  c.append(novo('span', 'pagina-chip__rot', rotulo), valor);
  status.append(c);
  return { c, valor };
}
const sCaixa = chip('caixa', 'Caixa'), sCalor = chip('calor', 'Calor'), sHora = chip('hora', 'Hora');
const barraCalor = novo('span', 'pagina-chip__barra'); const cheioCalor = novo('span', 'pagina-chip__cheio');
barraCalor.append(cheioCalor); barraCalor.setAttribute('aria-hidden', 'true'); sCalor.c.append(barraCalor);
topo.insertBefore(status, botao);
// altura da barra: o zoom dos monitores no celular começa logo abaixo dela
new ResizeObserver(() => document.documentElement.style.setProperty('--alto-topo', `${topo.offsetHeight}px`)).observe(topo);
const mostrarMenos = () => botao.setAttribute('aria-pressed', String(cena.menosAnimacao));
botao.addEventListener('click', () => { cena.definirMenosAnimacao(!cena.menosAnimacao); mostrarMenos(); });
mostrarMenos();

function receber(r) {
  if (!r.ok || !r.visao) return false;
  monitores.atualizar(r.visao); // pinta a barra de status pelo aoAtualizar
  return true;
}

function pintarStatus(visao) {
  const e = visao.estado;
  sCaixa.valor.textContent = `$ ${Number(e.caixa).toLocaleString('pt-BR')}`;
  const calor = Number(e.calor) || 0;
  sCalor.valor.textContent = calor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  sCalor.c.dataset.nivel = e.batida ? 'batida' : calor < 50 ? 'frio' : calor < 75 ? 'morno' : calor < 90 ? 'quente' : 'fervendo';
  cheioCalor.style.width = `${Math.max(0, Math.min(100, calor))}%`;
  // hora do relógio do jogo = o último instante que o servidor contou (sem contagem regressiva)
  const ms = Number(e.ultimoTempo ?? e.relogio ?? visao.agora);
  if (Number.isFinite(ms)) sHora.valor.textContent = new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// 401 do servidor no meio do jogo → volta ao TÍTULO; quem entrar de novo recomeça a página já com a sessão nova.
let semSessao = false;
window.addEventListener('sem-sessao', async () => {
  if (semSessao || pularAbertura) return;
  semSessao = true;
  tutorial?.destruir(); tutorial = null;
  await abrirAbertura({ inicio: 'titulo', aviso: 'Sua sessão acabou. Entre de novo.' });
  try { sessionStorage.setItem('porao_direto', '1'); } catch { /* sem armazenamento */ }
  location.reload();
});

async function ciclo() {
  if (semSessao) return;
  let rapido = false;
  if (!document.hidden) {
    const r = await api.estado();
    if (receber(r)) {
      monitores.pulsar();
      rapido = r.visao.estado.projetos.some((p) => p.fase === 'LANCAMENTO');
    } else if (r.erro) monitores.mostrarAviso(r.erro);
  }
  setTimeout(ciclo, rapido ? 1000 : 3000);
}
await ciclo();

window.poraoApp = { cena, api, monitores }; // só para conferência
