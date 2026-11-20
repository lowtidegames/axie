// Porão — liga a cena, os monitores e a API. Atualiza o estado a cada poucos segundos.
// Servidor decide; aqui só se pede o estado e se entrega para a tela desenhar.
import { criarCena } from './cena.js';
import { criarApi } from './api.js';
import { criarMonitores } from './monitores.js';

const raizCena = document.getElementById('cena');
const api = await criarApi();
let monitores = null;

const cena = await criarCena(raizCena, {
  estado: { trouxas: 0, hype: 0, luxos: [], celularNovo: false },
  aoClicar: (c) => { if (c.alvo === 'celular') monitores?.abrirCelular(); },
  aoMudarVista: (v) => monitores?.aoMudarVista(v),
});
monitores = criarMonitores({ cena, api, raiz: raizCena, aoAtualizar: (v) => pintarStatus(v) });

// barra de status fixa no topo: caixa, Calor (com cor) e a hora do relógio do jogo, mais o botão "Menos animação"
const topo = document.querySelector('.pagina-topo');
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

async function ciclo() {
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
