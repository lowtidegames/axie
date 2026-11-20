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
monitores = criarMonitores({ cena, api, raiz: raizCena });

// topo: caixa e Calor sempre à vista, e o botão "Menos animação"
const topo = document.querySelector('.pagina-topo');
const sub = topo.querySelector('h1 small');
if (sub) sub.textContent = api.modo === 'falso' ? '— modo de teste (sem servidor)' : '— mesa do Rugrigo';
const botao = document.getElementById('menos');
const placar = document.createElement('p');
placar.className = 'pagina-placar';
placar.style.cssText = 'margin:0;font-family:var(--fonte-num);font-variant-numeric:tabular-nums;color:var(--ouro);font-weight:700';
topo.insertBefore(placar, botao);
const mostrarMenos = () => botao.setAttribute('aria-pressed', String(cena.menosAnimacao));
botao.addEventListener('click', () => { cena.definirMenosAnimacao(!cena.menosAnimacao); mostrarMenos(); });
mostrarMenos();

function receber(r) {
  if (!r.ok || !r.visao) return false;
  monitores.atualizar(r.visao);
  const e = r.visao.estado;
  placar.textContent = `$ ${Number(e.caixa).toLocaleString('pt-BR')} · Calor ${Math.round(e.calor)}`;
  return true;
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
