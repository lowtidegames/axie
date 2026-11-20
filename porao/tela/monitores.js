// Porão — o conteúdo dos 3 monitores, o celular da mesa e a janela da batida.
// A tela NÃO decide nada: cada botão chama a API e mostra o que o servidor devolveu (a "visão").
//   const m = criarMonitores({ cena, api, raiz, aoAtualizar });   (aoAtualizar(visao): a cada visão nova, inclusive depois de ações)   m.atualizar(visao);  m.abrirCelular();  m.aoMudarVista(v)
import { TEXTOS, citar } from '../comum/nomes.js';
import { RARIDADES, IDEIAS_POR_RARIDADE, TROUXAS, GAVETA, CALOR } from '../comum/config.js';

// ---------------------------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------------------------
const CSS = `
:root {
  --rar-comum: #e8d9b5; --rar-incomum: #7bd88f; --rar-raro: #5bb8ff;
  --rar-epico: #c58bff; --rar-lendario: #ffc857; --rar-mitico: #ff8fb5;
}
.cena .cena__trilho { align-items: stretch; }
.cena .cena__monitor { min-height: 0; }
.cena .cena__tela { aspect-ratio: auto; flex: 1; min-height: 0; overflow: hidden; position: relative; display: flex; flex-direction: column; }
@media (max-width: 720px) { .pm-aba { font-size: 13px; padding: 0 2px; } .cena .cena__monitor { max-height: none; } .cena .cena__tela { min-height: 0; } }
.cena .cena__ponto.pm-ponto-aviso { border-color: var(--aviso); box-shadow: 0 0 0 3px var(--aviso); }
.cena .cena__zoom-topo { flex-wrap: wrap; }

/* ---- área de trabalho: papel de parede, janelas fixas e barra de ícones ---- */
.pm-mesa { flex: 1; min-height: 0; display: flex; flex-direction: column; font-size: 14px; position: relative; }
.pm-mesa--grafico { background-color: var(--mesa-1);
  background-image: linear-gradient(var(--mesa-1-b) 2px, transparent 2px), linear-gradient(90deg, var(--mesa-1-b) 2px, transparent 2px);
  background-size: 28px 28px; }
.pm-mesa--comunidade { background-color: var(--mesa-2);
  background-image: repeating-linear-gradient(135deg, var(--mesa-2-b) 0 14px, transparent 14px 28px); }
.pm-mesa--projeto { background-color: var(--mesa-3);
  background-image: radial-gradient(var(--mesa-3-b) 3px, transparent 4px); background-size: 22px 22px; }
.pm-mesa__area { flex: 1; min-height: 0; position: relative; margin: 8px 8px 0; }
.pm-jan { position: absolute; display: flex; flex-direction: column; min-width: 0; min-height: 0;
  background: var(--painel); border: 3px solid var(--pix-contorno); border-radius: 8px; box-shadow: 4px 4px 0 var(--pix-contorno); overflow: hidden; }
.pm-jan__barra { flex: none; display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 6px; background: var(--app, var(--painel-claro));
  border-bottom: 3px solid var(--pix-contorno); cursor: pointer; user-select: none; }
.pm-jan__icone { width: 24px; height: 24px; image-rendering: pixelated; flex: none; }
.pm-jan__nome { flex: 1; min-width: 0; font-family: var(--fonte-gorda); font-weight: 900; font-size: 15px; letter-spacing: 0.02em; color: var(--linho);
  text-shadow: 2px 0 0 var(--pix-contorno), -2px 0 0 var(--pix-contorno), 0 2px 0 var(--pix-contorno), 0 -2px 0 var(--pix-contorno), 2px 2px 0 var(--pix-contorno);
  white-space: nowrap; overflow: hidden; }
.pm-jan__botoes { display: flex; gap: 4px; flex: none; }
.pm-jan__botoes span { width: 16px; height: 16px; border: 2px solid var(--pix-contorno); border-radius: 3px; background: var(--linho); }
.pm-jan__botoes span:nth-child(2) { background: var(--ouro); }
.pm-jan__botoes span:last-child { background: var(--pix-tela-r); }
.pm-jan__corpo { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.pm-jan:not(.pm-jan--frente) .pm-jan__barra { filter: saturate(0.45) brightness(0.8); }
.pm-jan--frente { box-shadow: 5px 5px 0 var(--pix-contorno), 0 0 0 2px var(--linho); }
/* cascata fixa (não arrasta): cada janela um pouco mais para baixo e para a direita */
.pm-jan[data-pos="0"][data-total="2"] { inset: 0 18px 36px 0; } .pm-jan[data-pos="1"][data-total="2"] { inset: 36px 0 0 18px; }
.pm-jan[data-pos="0"][data-total="4"] { inset: 0 30px 78px 0; } .pm-jan[data-pos="1"][data-total="4"] { inset: 26px 20px 52px 10px; }
.pm-jan[data-pos="2"][data-total="4"] { inset: 52px 10px 26px 20px; } .pm-jan[data-pos="3"][data-total="4"] { inset: 78px 0 0 30px; }
.pm-app--grafico { --app: var(--app-verde); } .pm-app--caixa { --app: var(--app-ouro); }
.pm-app--comunidade { --app: var(--app-rosa); } .pm-app--chat { --app: var(--app-ciano); }
.pm-app--projetos { --app: var(--app-azul); } .pm-app--ideias { --app: var(--app-roxo); }
.pm-app--impressora { --app: var(--app-laranja); } .pm-app--porao { --app: var(--app-vinho); }
.pm-dock { flex: none; display: flex; justify-content: center; gap: 6px; margin-top: 8px; padding: 6px; background: var(--noite-funda); border-top: 3px solid var(--pix-contorno); }
.pm-icone { flex: 0 1 84px; min-width: 0; min-height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  padding: 4px 2px; font: inherit; font-family: var(--fonte-gorda); font-weight: 900; font-size: 13px; color: var(--linho);
  background: transparent; border: 3px solid transparent; border-radius: 8px; cursor: pointer; }
.pm-icone canvas { width: 32px; height: 32px; image-rendering: pixelated; }
.pm-icone span { white-space: nowrap; max-width: 100%; overflow: hidden; }
.pm-icone:hover { border-color: var(--borda); }
.pm-icone[aria-pressed="true"] { background: var(--app); border-color: var(--pix-contorno); box-shadow: 0 3px 0 var(--pix-contorno);
  text-shadow: 1px 1px 0 var(--pix-contorno), -1px -1px 0 var(--pix-contorno), 1px -1px 0 var(--pix-contorno), -1px 1px 0 var(--pix-contorno); }
@media (max-width: 720px) {
  /* celular: cada janela em tela cheia; a barra de ícones fica embaixo */
  .pm-mesa__area { margin: 0; }
  .pm-mesa .pm-jan[data-pos][data-total] { inset: 0; border-radius: 0; box-shadow: none; border-width: 0; }
  .pm-jan:not(.pm-jan--frente) { visibility: hidden; }
  .pm-dock { margin-top: 0; gap: 4px; padding: 4px; }
  .pm-icone { flex: 1 1 0; }
}

/* ---- Confiança dos trouxas: medidor em gomos ---- */
.pm-confianca { display: flex; flex-direction: column; gap: 4px; }
.pm-confianca__topo { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.pm-confianca__rot { font-family: var(--fonte-gorda); font-weight: 900; font-size: 14px; }
.pm-confianca__gomos { display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; padding: 3px; background: var(--pix-contorno); border-radius: 6px; }
.pm-confianca__gomo { height: 14px; border-radius: 2px; background: var(--painel-claro); }
.pm-confianca__gomo--cheio { background: var(--nivel, var(--aviso)); }
.pm-confianca[data-nivel="baixa"] { --nivel: var(--pix-tela-r); } .pm-confianca[data-nivel="media"] { --nivel: var(--ouro); } .pm-confianca[data-nivel="alta"] { --nivel: var(--ganho); }

/* ---- número gigante do ganho ---- */
.pm-gigante { position: fixed; z-index: 75; pointer-events: none; transform: translate(-50%, -50%); white-space: nowrap;
  font-family: var(--fonte-gorda); font-weight: 900; font-size: min(15vw, 120px); line-height: 1; color: var(--ganho); letter-spacing: 0.01em;
  -webkit-text-stroke: 8px var(--pix-contorno); paint-order: stroke fill; text-shadow: 6px 7px 0 var(--pix-contorno); font-variant-numeric: tabular-nums; }
.pm-gigante__pulo { display: inline-block; animation: pm-pulo 0.5s cubic-bezier(.2, 1.6, .4, 1) both; }
@keyframes pm-pulo { from { transform: scale(0.35); } 60% { transform: scale(1.12); } to { transform: scale(1); } }
.pm-gigante--parado .pm-gigante__pulo { animation: none; }
@media (prefers-reduced-motion: reduce) { .pm-gigante__pulo { animation: none; } }

.pm-tela { flex: 1; min-height: 0; display: flex; flex-direction: column; font-size: 14px; }
.pm-abas { display: flex; gap: 4px; padding: 4px; background: var(--noite-funda); }
.pm-aba { flex: 1; min-width: 0; min-height: 44px; font: inherit; font-size: 14px; font-weight: 700; color: var(--linho-apagado);
  background: transparent; border: 2px solid transparent; border-radius: 6px; cursor: pointer; padding: 0 4px; }
.pm-aba[aria-selected="true"] { color: var(--acao-texto); background: var(--linho); }
.pm-corpo { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.pm-card { background: var(--painel); border: 2px solid var(--borda); border-radius: 10px; padding: 8px; overflow-wrap: anywhere; }
.pm-card h3 { margin: 0 0 4px; font-size: 15px; }
.pm-linha { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.pm-pequeno { font-size: 13px; color: var(--linho-apagado); margin: 0; }
.pm-num { font-family: var(--fonte-num); font-variant-numeric: tabular-nums; color: var(--ouro); font-weight: 700; }
.pm-grande { font-family: var(--fonte-num); font-variant-numeric: tabular-nums; font-size: 2rem; line-height: 1.1; color: var(--ouro); font-weight: 700; }
.pm-vazio { color: var(--linho-apagado); text-align: center; padding: 16px 8px; margin: 0; }
.pm-btn { font: inherit; font-weight: 700; font-size: 14px; color: var(--linho); background: var(--painel-claro); border: 2px solid var(--borda);
  border-radius: 6px; padding: 8px 12px; min-height: 44px; cursor: pointer; }
.pm-btn:hover:not(:disabled) { border-color: var(--linho-apagado); }
.pm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.pm-btn--acao { background: var(--acao); color: var(--acao-texto); border-color: var(--acao); }
.pm-btn--grande { min-height: 56px; font-size: 1.15rem; width: 100%; letter-spacing: 0.03em; }
.pm-btn--perigo { background: var(--pix-tela-r); color: var(--acao-texto); border-color: var(--pix-tela-r); }
.pm-botoes { display: flex; gap: 8px; flex-wrap: wrap; }
.pm-botoes .pm-btn { flex: 1 1 120px; }
.pm-chip { display: inline-block; padding: 0 8px; border-radius: 999px; border: 2px solid var(--rc, var(--borda)); color: var(--rc, var(--linho)); font-size: 13px; font-weight: 700; line-height: 20px; }
.pm-rar--comum { --rc: var(--rar-comum); } .pm-rar--incomum { --rc: var(--rar-incomum); } .pm-rar--raro { --rc: var(--rar-raro); }
.pm-rar--epico { --rc: var(--rar-epico); } .pm-rar--lendario { --rc: var(--rar-lendario); } .pm-rar--mitico { --rc: var(--rar-mitico); }
.pm-selo { display: inline-block; padding: 0 8px; border-radius: 4px; background: var(--pix-tela-r); color: var(--acao-texto); font-size: 13px; font-weight: 700; line-height: 20px; }
.pm-medidor { position: relative; height: 14px; border-radius: 7px; background: var(--noite-funda); border: 2px solid var(--borda); overflow: hidden; }
.pm-medidor__cheio { position: absolute; left: 0; top: 0; bottom: 0; background: var(--ouro); }
.pm-medidor--calor .pm-medidor__cheio { background: linear-gradient(90deg, var(--ouro), var(--acao), var(--pix-tela-r)); }
.pm-medidor__previa { position: absolute; top: 0; bottom: 0; width: 3px; background: var(--linho); }
.pm-calor { padding: 8px; background: var(--noite-funda); border: 2px solid var(--borda); border-radius: 10px; display: flex; flex-direction: column; gap: 4px; }
.pm-canvas { display: block; width: 100%; height: 100%; min-height: 120px; }
.pm-grafico { flex: 1; min-height: 120px; border: 2px solid var(--borda); border-radius: 8px; background: var(--noite-funda); overflow: hidden; }
.pm-seletor { display: flex; gap: 6px; flex-wrap: wrap; }
.pm-seletor .pm-btn { min-height: 44px; padding: 4px 10px; }
.pm-seletor .pm-btn[aria-pressed="true"] { background: var(--linho); color: var(--acao-texto); border-color: var(--linho); }
.pm-aviso-texto { color: var(--acao); font-weight: 700; margin: 0; }
.pm-chat { display: flex; flex-direction: column; gap: 6px; }
.pm-msg { background: var(--painel); border-radius: 8px; padding: 6px 8px; border: 2px solid var(--painel-claro); overflow-wrap: anywhere; }
.pm-msg b { color: var(--foco); }
.pm-msg--infl { border-color: var(--acao); }
.pm-msg--infl b { color: var(--acao); }
.pm-grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 6px; }
.pm-ideia { border: 2px solid var(--rc, var(--borda)); border-radius: 8px; padding: 6px; min-height: 64px; background: var(--noite-funda); font-size: 13px; overflow-wrap: anywhere; }
.pm-ideia--oculta { border-style: dashed; color: var(--linho-apagado); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; }
.pm-barra { display: flex; align-items: center; gap: 8px; }
.pm-barra__rot { flex: 0 0 96px; font-size: 13px; }
.pm-barra__trilho { flex: 1; height: 12px; background: var(--noite-funda); border-radius: 6px; border: 2px solid var(--borda); overflow: hidden; }
.pm-barra__cheio { height: 100%; background: var(--rc, var(--linho)); }
.pm-barra__pct { flex: 0 0 56px; text-align: right; font-family: var(--fonte-num); font-size: 13px; }
.pm-slot { position: relative; height: 170px; overflow: hidden; border-radius: 8px; background: var(--noite-funda); border: 2px solid var(--borda); flex: none; }
.pm-slot::before { content: ""; position: absolute; left: 6%; right: 6%; top: 0; height: 8px; background: var(--borda); border-radius: 0 0 6px 6px; z-index: 2; }
.pm-folha { position: absolute; left: 14%; right: 14%; top: 8px; bottom: 10px; background: var(--linho); color: var(--acao-texto); border-radius: 4px;
  border: 3px solid var(--rc, var(--linho)); transform: translateY(-105%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 8px; text-align: center; overflow-wrap: anywhere; }
.pm-folha--vazia { transform: translateY(0); }
.pm-folha[data-etapa="1"], .pm-folha[data-etapa="2"], .pm-folha[data-etapa="3"] { transform: translateY(0); transition: transform 1.4s ease-out; }
.pm-folha__rar, .pm-folha__nome { opacity: 0; font-weight: 800; }
.pm-folha__rar { font-size: 1.15rem; color: var(--acao-texto); }
.pm-folha__nome { font-size: 1.05rem; }
.pm-folha[data-etapa="2"] .pm-folha__rar, .pm-folha[data-etapa="3"] .pm-folha__rar, .pm-folha[data-etapa="3"] .pm-folha__nome { opacity: 1; transition: opacity 0.4s ease; }
.pm-folha__rar .pm-chip { background: var(--acao-texto); }

.pm-tapete { position: absolute; inset: 0; z-index: 5; background: var(--pix-tela-f); display: flex; flex-direction: column; padding: 8px; gap: 8px; }
.pm-tapete__palco { flex: 1; min-height: 0; border: 2px solid var(--borda); border-radius: 8px; background: var(--noite-funda); overflow: hidden; position: relative; }
.pm-tapete__legenda { margin: 0; text-align: center; font-weight: 700; min-height: 20px; }
.pm-tapete__numero { text-align: center; }
.pm-resumo { display: flex; flex-direction: column; gap: 6px; text-align: center; overflow-wrap: anywhere; }
.pm-resumo p { margin: 0; }

.pm-janela { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 12px; background: rgba(13, 11, 19, 0.82); }
.pm-janela__caixa { width: min(460px, 100%); max-height: calc(100dvh - 24px); display: flex; flex-direction: column; background: var(--painel); border: 3px solid var(--borda); border-radius: 12px; overflow: hidden; }
.pm-janela__topo { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 8px 8px 14px; background: var(--noite-funda); }
.pm-janela__topo h2 { margin: 0; font-size: 1.1rem; }
.pm-janela__corpo { overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.pm-janela--batida .pm-janela__caixa { border-color: var(--pix-tela-r); }
.pm-opcao { border: 2px solid var(--borda); border-radius: 10px; padding: 8px; display: flex; flex-direction: column; gap: 6px; background: var(--painel-claro); }
.pm-opcao p { margin: 0; overflow-wrap: anywhere; }
.pm-balao { background: var(--painel-claro); border-radius: 12px 12px 12px 2px; padding: 8px 10px; max-width: 92%; overflow-wrap: anywhere; }
.pm-balao--eu { align-self: flex-end; background: var(--acao); color: var(--acao-texto); border-radius: 12px 12px 2px 12px; }
.pm-conversa { display: flex; flex-direction: column; gap: 6px; }
.pm-faixa { position: sticky; top: 0; z-index: 3; }
.pm-toasts { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 80; display: flex; flex-direction: column; gap: 6px; align-items: center; pointer-events: none; }
.pm-toast { background: var(--linho); color: var(--acao-texto); border-radius: 8px; padding: 10px 14px; font-weight: 700; max-width: 520px; pointer-events: auto; overflow-wrap: anywhere; }
.pm-batida-faixa { width: 100%; }

.cena--menos .pm-folha, .cena--menos .pm-folha__rar, .cena--menos .pm-folha__nome { transition: none !important; }
@media (prefers-reduced-motion: reduce) { .pm-folha, .pm-folha__rar, .pm-folha__nome { transition: none !important; } }
`;

function h(tag, props = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v; // CSSOM: passa pela CSP (style-src 'self')
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  const poe = (f) => {
    if (f == null || f === false) return;
    if (Array.isArray(f)) f.forEach(poe);
    else e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  };
  filhos.forEach(poe);
  return e;
}

const fmt = (n, casas = 0) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 });
const din = (n) => `$ ${fmt(n)}`;
const ROTULO_RARIDADE = { comum: 'Comum', incomum: 'Incomum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário', mitico: 'Mítico' };
const ROTULO_FASE = { LANCAMENTO: 'Lançando', HYPE: 'Em alta', PICO: 'No pico', ESFRIANDO: 'Esfriando', APLICADO: 'Tapete puxado', APREENDIDO: 'Apreendido' };
const ROTULO_TAMANHO = { nano: 'Nano', medio: 'Médio', mega: 'Mega' };
const NO_AR = ['LANCAMENTO', 'HYPE', 'PICO', 'ESFRIANDO'];
// cada monitor é uma área de trabalho com janelas fixas de aplicativo (a ordem é a da barra de ícones)
const MESAS = {
  grafico: [['grafico', 'Gráfico'], ['caixa', 'Caixa']],
  comunidade: [['comunidade', 'Comunidade'], ['chat', 'Chat']],
  projeto: [['projetos', 'Projetos'], ['ideias', 'Ideias'], ['impressora', 'Impressora'], ['porao', 'Porão']],
};
const MONITOR_DO_APP = Object.fromEntries(Object.entries(MESAS).flatMap(([m, l]) => l.map(([a]) => [a, m])));
const INDICE_MONITOR = { grafico: 0, comunidade: 1, projeto: 2 };

// ícones em pixel art (grade 16×16), desenhados por código com as cores do :root
const ICONES = {
  grafico: (r) => { r('k', 0, 1, 16, 12); r('f', 1, 2, 14, 10); [[2, 9], [4, 7], [6, 8], [8, 5], [10, 6], [12, 3]].forEach(([x, y]) => r('v', x, y, 2, 2)); r('y', 13, 2, 2, 2); r('k', 6, 13, 4, 1); r('k', 4, 14, 8, 2); },
  caixa: (r) => { r('k', 2, 1, 14, 8); r('V', 3, 2, 12, 6); r('k', 0, 5, 14, 10); r('v', 1, 6, 12, 8); r('V', 2, 7, 2, 1); r('V', 10, 12, 2, 1); r('k', 4, 7, 6, 6); r('y', 5, 8, 4, 4); r('k', 6, 9, 2, 2); },
  comunidade: (r) => { r('k', 0, 4, 6, 6); r('b', 1, 5, 4, 4); r('k', 0, 10, 6, 6); r('b', 1, 11, 4, 5); r('k', 10, 4, 6, 6); r('o', 11, 5, 4, 4); r('k', 10, 10, 6, 6); r('o', 11, 11, 4, 5); r('k', 4, 1, 8, 8); r('p', 5, 2, 6, 6); r('k', 6, 4, 1, 1); r('k', 9, 4, 1, 1); r('k', 3, 9, 10, 7); r('r', 4, 10, 8, 6); },
  chat: (r) => { r('k', 0, 1, 16, 11); r('w', 1, 2, 14, 9); r('k', 3, 12, 4, 3); r('w', 4, 11, 2, 2); r('k', 4, 6, 2, 2); r('k', 7, 6, 2, 2); r('k', 10, 6, 2, 2); },
  projetos: (r) => { r('k', 5, 0, 6, 13); r('w', 6, 1, 4, 11); r('k', 7, 1, 2, 1); r('b', 7, 4, 2, 2); r('k', 2, 8, 4, 5); r('r', 3, 9, 2, 3); r('k', 10, 8, 4, 5); r('r', 11, 9, 2, 3); r('o', 6, 13, 4, 2); r('y', 7, 14, 2, 2); },
  ideias: (r) => { r('k', 3, 0, 10, 10); r('y', 4, 1, 8, 8); r('w', 5, 2, 2, 2); r('k', 4, 10, 8, 1); r('m', 5, 11, 6, 3); r('k', 5, 12, 6, 1); r('k', 6, 14, 4, 2); },
  impressora: (r) => { r('k', 3, 0, 10, 5); r('w', 4, 1, 8, 4); r('k', 0, 4, 16, 8); r('m', 1, 5, 14, 6); r('v', 12, 6, 2, 1); r('k', 2, 8, 12, 1); r('k', 3, 11, 10, 5); r('w', 4, 11, 8, 4); r('o', 5, 12, 6, 1); },
  porao: (r) => { r('k', 6, 0, 4, 2); r('k', 4, 2, 8, 2); r('k', 2, 4, 12, 2); r('r', 7, 1, 2, 1); r('r', 5, 3, 6, 1); r('r', 3, 5, 10, 1); r('k', 2, 6, 12, 10); r('n', 3, 7, 10, 8); r('k', 9, 9, 3, 7); r('y', 4, 8, 3, 3); r('k', 5, 9, 1, 1); },
};
const COR_ICONE = { k: '--pix-contorno', f: '--pix-tela-f', v: '--pix-tela-v', V: '--pix-planta', y: '--ouro', o: '--acao', r: '--pix-tela-r', b: '--pix-tela-a', w: '--linho', p: '--pix-pele', m: '--pix-metal', n: '--pix-madeira' };
// luxo (id do config) → número do nome em nomes.js
const NOME_LUXO = { aquario: 1, cadeira_gamer: 2, maquina_bebida: 3, carro_na_garagem: 4, letreiro_neon: 5 };

export function criarMonitores({ cena, api, raiz, aoAtualizar }) {
  // CSP do servidor não aceita <style> embutido: folha construída por código (CSSOM) passa.
  const folha = new CSSStyleSheet(); folha.replaceSync(CSS);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, folha];

  let visao = null;
  let ativoId = null; // projeto escolhido no gráfico
  const frente = { grafico: 'grafico', comunidade: 'comunidade', projeto: 'projetos' }; // janela da frente em cada monitor
  const ordem = { grafico: ['caixa', 'grafico'], comunidade: ['chat', 'comunidade'], projeto: ['porao', 'impressora', 'ideias', 'projetos'] }; // última = frente
  const historico = {}; // projetoId → [valor da prévia] (amostras reais, uma por atualização)
  const chat = []; // { autor, texto, influ? }
  let ticChat = 0;
  const cenaAtiva = { tapete: false, revelacao: false };
  let batidaAdiada = false;
  let janelaBatida = null, janelaCelular = null;
  let celularVistas = new Set();
  let celularNovo = false;
  let ultimoEstadoCena = '';
  const revelada = { carta: null }; // última carta impressa (para a folha)
  const menos = () => cena.menosAnimacao;

  // ----- textos (o servidor pode trocar por chave em visao.nomes) -----
  const T = (k, f = '') => visao?.nomes?.[k] ?? TEXTOS[k] ?? f;
  const nomeIdeia = (ideia) => { const [r, n] = String(ideia).split('_'); return T(`ideia.${r}.${n}.nome`, ideia); };
  const chaveInflu = (id) => {
    const inf = visao.influenciadores.find((i) => i.id === id);
    if (!inf) return null;
    const iguais = visao.influenciadores.filter((i) => i.tamanho === inf.tamanho);
    return `${inf.tamanho}.${iguais.findIndex((i) => i.id === id) + 1}`;
  };
  const nomeInflu = (id) => T(`influ.${chaveInflu(id)}.nome`, id);
  const nomeLuxo = (id) => (NOME_LUXO[id] ? T(`luxo.${NOME_LUXO[id]}.nome`) : id.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));
  const descLuxo = (id) => (NOME_LUXO[id] ? T(`luxo.${NOME_LUXO[id]}.descricao`) : '');
  const textoBonus = (b) => [
    b.rendimento ? `+${Math.round(b.rendimento * 100)}% de rendimento` : '',
    b.hype ? `−${Math.round(b.hype * 100)}% de gasto de hype` : '',
    b.calor ? `−${Math.round(b.calor * 100)}% de Calor` : '',
  ].filter(Boolean).join(' · ');
  const chipRar = (r) => h('span', { class: `pm-chip pm-rar--${r}` }, ROTULO_RARIDADE[r] || r);

  const projetosNoAr = () => (visao ? visao.estado.projetos.filter((p) => NO_AR.includes(p.fase)) : []);
  const projetoAtivo = () => {
    const l = projetosNoAr();
    return l.find((p) => p.id === ativoId) || l[0] || null;
  };
  const acharProjeto = (id) => visao?.estado.projetos.find((p) => p.id === id) || null;

  // ----- avisos de monitor fora da vista -----
  const caixas = [...raiz.querySelectorAll('.cena__monitor')];
  const pontos = [...raiz.querySelectorAll('.cena__ponto')];
  const movel = () => window.matchMedia('(max-width: 720px)').matches;
  const atualIdx = () => Math.max(0, caixas.findIndex((c) => c.classList.contains('cena__monitor--atual')));
  const emVista = (i) => cena.vista === 'monitores' && (!movel() || atualIdx() === i);
  function avisar(i) {
    if (emVista(i)) return;
    cena.avisarMonitor(i, true);
    pontos[i]?.classList.add('pm-ponto-aviso');
  }
  function limpar(i) { cena.avisarMonitor(i, false); pontos[i]?.classList.remove('pm-ponto-aviso'); }
  function limparVisiveis() {
    if (cena.vista !== 'monitores') return;
    if (movel()) limpar(atualIdx()); else [0, 1, 2].forEach(limpar);
  }
  const obs = new MutationObserver(limparVisiveis);
  caixas.forEach((c) => obs.observe(c, { attributes: true, attributeFilter: ['class'] }));

  // ----- avisos na tela (toast) -----
  const toasts = h('div', { class: 'pm-toasts', role: 'status', 'aria-live': 'polite' });
  document.body.append(toasts);
  function toast(texto) {
    const t = h('div', { class: 'pm-toast' }, texto);
    toasts.append(t);
    setTimeout(() => t.remove(), 4200);
  }

  // ----- ícone em pixel art (canvas 16×16, ampliado pelo CSS sem borrar) -----
  function icone(app, classe) {
    const cv = h('canvas', { class: classe || '', width: '16', height: '16', 'aria-hidden': 'true' });
    const c = cv.getContext('2d');
    const cores = {};
    ICONES[app]?.((k, x, y, w, hh) => { c.fillStyle = cores[k] ||= lerCor(COR_ICONE[k]); c.fillRect(x, y, w, hh); });
    return cv;
  }

  // ----- área de trabalho de cada monitor: janelas fixas (sem arrastar) + barra de ícones -----
  const apps = {}; // app → { app, monitor, janela, corpo, botao, sig }
  function montarMesa(id) {
    const tela = cena.telas[id];
    const lista = MESAS[id];
    const raizTela = h('div', { class: `pm-mesa pm-mesa--${id}`, 'data-pm-monitor': id });
    const area = h('div', { class: 'pm-mesa__area' });
    const dock = h('nav', { class: 'pm-dock', 'aria-label': `Aplicativos do monitor ${INDICE_MONITOR[id] + 1}` });
    lista.forEach(([a, nome], pos) => {
      const corpo = h('div', { class: 'pm-jan__corpo' });
      const barra = h('div', { class: 'pm-jan__barra' }, icone(a, 'pm-jan__icone'), h('span', { class: 'pm-jan__nome' }, nome),
        h('span', { class: 'pm-jan__botoes', 'aria-hidden': 'true' }, h('span'), h('span'), h('span')));
      const janela = h('section', { class: `pm-jan pm-app--${a}`, 'data-app': a, 'data-pos': String(pos), 'data-total': String(lista.length), 'aria-label': nome }, barra, corpo);
      janela.addEventListener('pointerdown', () => { if (frente[id] !== a) trazer(a); });
      area.append(janela);
      const botao = h('button', { type: 'button', class: `pm-icone pm-app--${a}`, 'data-app': a, 'aria-pressed': 'false', onclick: () => trazer(a) }, icone(a), h('span', {}, nome));
      dock.append(botao);
      apps[a] = { app: a, monitor: id, janela, corpo, botao, sig: '' };
    });
    raizTela.append(area, dock);
    tela.replaceChildren(raizTela);
    arrumar(id);
  }
  /** Ordem das janelas do monitor: a da frente por cima, as outras atrás na ordem do último uso. */
  function arrumar(id) {
    ordem[id].forEach((a, i) => {
      const t = apps[a]; if (!t) return;
      const naFrente = a === frente[id];
      t.janela.style.zIndex = String(i + 1);
      t.janela.classList.toggle('pm-jan--frente', naFrente);
      if (naFrente) t.janela.removeAttribute('inert'); else if (movel()) t.janela.setAttribute('inert', ''); else t.janela.removeAttribute('inert');
      t.botao.setAttribute('aria-pressed', String(naFrente));
    });
  }
  /** Traz a janela do app para a frente (clique no ícone, na janela ou atalho de outro monitor). */
  function trazer(a) {
    const id = MONITOR_DO_APP[a];
    frente[id] = a;
    ordem[id] = ordem[id].filter((x) => x !== a).concat(a);
    arrumar(id);
    if (a === 'chat') apps.chat.corpo.scrollTop = apps.chat.corpo.scrollHeight;
  }

  function render(id, forcar = true) { for (const [a] of MESAS[id]) renderApp(a, forcar); }
  function renderApp(a, forcar = true) {
    if (!visao) return;
    const t = apps[a];
    const foco = document.activeElement?.closest?.('.pm-jan') === t.janela ? document.activeElement.dataset.k : null;
    const rol = t.corpo.scrollTop;
    const sig = JSON.stringify([visao.estado, visao.previas, ativoId, chat.length, celularNovo, cenaAtiva.revelacao, cenaAtiva.tapete]);
    if (!forcar && (sig === t.sig || (a === 'impressora' && cenaAtiva.revelacao))) return;
    t.sig = sig;
    t.corpo.replaceChildren();
    RENDER[a](t);
    t.corpo.scrollTop = a === 'chat' ? t.corpo.scrollHeight : rol;
    if (foco) t.janela.querySelector(`[data-k="${foco}"]`)?.focus({ preventScroll: true });
  }

  // =============================================================================================
  // MONITOR 1: GRÁFICO + CAIXA
  // =============================================================================================
  function lerCor(nome) { return getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || '#fff'; }

  /** Desenha a curva. prog 0..1 = quanto da curva já subiu; queda 0..1 = despencada depois do fim. */
  function pintarCurva(cv, valores, { prog = 1, queda = 0, rotulos = true } = {}) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth, hh = cv.clientHeight;
    if (!w || !hh) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hh * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, hh);
    const borda = lerCor('--borda'), apagado = lerCor('--linho-apagado'), sobe = lerCor('--aviso'), cai = lerCor('--pix-tela-r'), ouro = lerCor('--ouro');
    const v = valores.length >= 2 ? valores : [valores[0] ?? 0, valores[0] ?? 0];
    const pad = 14, topo = rotulos ? 22 : pad;
    const min = Math.min(...v), max = Math.max(...v);
    const folga = Math.max(1, (max - min) * 0.15);
    const lo = Math.max(0, min - folga), hi = max + folga;
    const x = (i) => pad + (i / (v.length - 1)) * (w - 2 * pad);
    const y = (val) => hh - pad - ((val - lo) / (hi - lo)) * (hh - pad - topo);
    c.strokeStyle = borda; c.lineWidth = 1; c.globalAlpha = 0.6;
    for (let g = 0; g < 4; g++) { const gy = Math.round(topo + (g / 3) * (hh - pad - topo)) + 0.5; c.beginPath(); c.moveTo(pad, gy); c.lineTo(w - pad, gy); c.stroke(); }
    c.globalAlpha = 1;
    const fim = Math.max(0, Math.min(1, prog)) * (v.length - 1);
    const pts = [];
    for (let i = 0; i <= Math.floor(fim); i++) pts.push([x(i), y(v[i])]);
    if (fim > Math.floor(fim)) { const i = Math.floor(fim), f = fim - i; pts.push([x(i + f), y(v[i] + (v[i + 1] - v[i]) * f)]); }
    if (pts.length < 2) pts.push([pts[0][0] + 1, pts[0][1]]);
    const cor = queda > 0 ? cai : sobe;
    c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.lineTo(pts[pts.length - 1][0], hh - pad); c.lineTo(pts[0][0], hh - pad); c.closePath();
    c.globalAlpha = 0.18; c.fillStyle = cor; c.fill(); c.globalAlpha = 1;
    c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.strokeStyle = cor; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
    let [ux, uy] = pts[pts.length - 1];
    if (queda > 0) {
      const alvo = hh - pad;
      const ny = uy + (alvo - uy) * queda * queda;
      c.beginPath(); c.moveTo(ux, uy); c.lineTo(ux + 6 * queda, ny); c.strokeStyle = cai; c.lineWidth = 3; c.stroke();
      uy = ny; ux += 6 * queda;
    }
    c.fillStyle = queda > 0 ? cai : ouro; c.beginPath(); c.arc(ux, uy, 5, 0, Math.PI * 2); c.fill();
    if (rotulos) {
      c.fillStyle = apagado; c.font = '12px ui-monospace, monospace'; c.textBaseline = 'top';
      c.fillText(`$ ${fmt(hi)}`, pad, 4);
      c.textBaseline = 'bottom'; c.fillText(`$ ${fmt(lo)}`, pad, hh - 2);
    }
  }

  function meterCalor(previaCalor) {
    const calor = visao.estado.calor;
    const m = h('div', { class: 'pm-medidor pm-medidor--calor', role: 'meter', 'aria-label': 'Calor', 'aria-valuemin': '0', 'aria-valuemax': String(CALOR.maximo), 'aria-valuenow': String(Math.round(calor)) },
      h('div', { class: 'pm-medidor__cheio', style: `width:${Math.min(100, calor)}%` }));
    if (previaCalor != null) m.append(h('div', { class: 'pm-medidor__previa', style: `left:calc(${Math.min(100, calor + previaCalor)}% - 3px)` }));
    return m;
  }

  function renderGrafico(t) {
    const lista = projetosNoAr();
    const p = projetoAtivo();
    if (!p) {
      t.corpo.append(
        h('p', { class: 'pm-vazio' }, 'Nenhum projeto no ar. Imprima uma ideia na Impressora (monitor 3) e lance.'),
        h('button', { type: 'button', class: 'pm-btn pm-btn--acao', 'data-k': 'ir-projeto', onclick: () => { trazer('impressora'); cena.irParaMonitor(2); } }, 'Abrir a Impressora'),
      );
      return;
    }
    if (lista.length > 1) {
      t.corpo.append(h('div', { class: 'pm-seletor', role: 'group', 'aria-label': 'Projeto do gráfico' },
        lista.map((q) => h('button', { type: 'button', class: 'pm-btn', 'data-k': `sel-${q.id}`, 'aria-pressed': String(q.id === p.id), onclick: () => { ativoId = q.id; render('grafico'); } }, nomeIdeia(q.ideia)))));
    }
    const previa = visao.previas.tapete[p.id];
    t.corpo.append(h('div', { class: 'pm-linha' },
      h('strong', {}, nomeIdeia(p.ideia)), h('span', {}, chipRar(p.raridade), ' ', ROTULO_FASE[p.fase])));
    const cv = h('canvas', { class: 'pm-canvas', 'data-pm': 'grafico-canvas', role: 'img', 'aria-label': `Gráfico de ${nomeIdeia(p.ideia)}: quanto o tapete pagaria agora${previa ? `, ${din(previa.ganho)}` : ''}` });
    const caixaCv = h('div', { class: 'pm-grafico' }, cv);
    t.corpo.append(caixaCv);
    const desenhar = () => pintarCurva(cv, historico[p.id] || [0, 0]);
    new ResizeObserver(desenhar).observe(caixaCv);
    requestAnimationFrame(desenhar);

    if (previa) {
      t.corpo.append(h('div', { class: 'pm-card', 'data-pm': 'previa' },
        h('div', { class: 'pm-linha' }, h('span', {}, 'Se puxar agora você ganha'), h('span', { class: 'pm-num' }, `+${din(previa.ganho)}`)),
        h('div', { class: 'pm-linha' }, h('span', {}, 'Calor sobe'), h('span', { class: 'pm-num' }, `+${fmt(previa.calor, 1)} (vai a ${fmt(previa.calorDepois, 1)})`)),
        previa.batida ? h('p', { class: 'pm-aviso-texto' }, 'Atenção: isso dá batida e um projeto está em risco.') : null,
      ));
    } else {
      t.corpo.append(h('p', { class: 'pm-pequeno', 'data-pm': 'aguarde' }, p.fase === 'LANCAMENTO' ? 'Lançando… o tapete libera em instantes.' : 'Sem prévia agora.'));
    }
    t.corpo.append(h('button', { type: 'button', class: 'pm-btn pm-btn--acao pm-btn--grande', 'data-pm': 'puxar', 'data-k': 'puxar', disabled: !previa || cenaAtiva.tapete, onclick: () => puxar(p) }, 'PUXAR O TAPETE'));
  }

  function renderCaixa(t) {
    const e = visao.estado;
    const total = Object.values(visao.rendimentos).reduce((s, v) => s + v, 0);
    t.corpo.append(
      h('div', { class: 'pm-card' }, h('p', { class: 'pm-pequeno' }, 'Saldo'), h('div', { class: 'pm-grande', 'data-pm': 'saldo' }, din(e.caixa))),
      h('div', { class: 'pm-card' },
        h('div', { class: 'pm-linha' }, h('span', {}, 'Rendimento por hora'), h('span', { class: 'pm-num', 'data-pm': 'rendimento' }, `${din(total)}/h`)),
        h('p', { class: 'pm-pequeno' }, `Ganho total desta vida: ${din(e.caixaTotal)}`)),
    );
    const lista = projetosNoAr();
    t.corpo.append(h('div', { class: 'pm-card' }, h('h3', {}, 'Quem rende'),
      lista.length ? lista.map((p) => h('div', { class: 'pm-linha' }, h('span', {}, nomeIdeia(p.ideia)), h('span', { class: 'pm-num' }, `${din(visao.rendimentos[p.id] || 0)}/h`)))
        : h('p', { class: 'pm-pequeno' }, 'Nenhum projeto rendendo agora.')));
    const pr = visao.prestigio;
    t.corpo.append(h('div', { class: 'pm-card' }, h('h3', {}, 'Ir preso (recomeçar com bônus)'),
      h('p', { class: 'pm-pequeno' }, pr.liberado ? 'Liberado: zera caixa, ideias, projetos e luxos; fica o álbum e um bônus permanente.' : `Libera ao ganhar ${din(pr.meta)} nesta vida (faltam ${din(Math.max(0, pr.meta - e.caixaTotal))}).`),
      h('button', { type: 'button', class: 'pm-btn pm-btn--perigo', 'data-k': 'preso', disabled: !pr.liberado, onclick: irPreso }, 'Ir preso')));
  }

  async function irPreso() {
    if (!window.confirm('Ir preso zera caixa, ideias, projetos e luxos. Continuar?')) return;
    const r = await api.prestigio();
    aplicar(r, 'Você foi preso e voltou com pseudônimo novo e bônus.');
  }

  // ----- a cena do tapete -----
  async function puxar(p) {
    if (cenaAtiva.tapete) return;
    const nome = nomeIdeia(p.ideia), fim = T(`ideia.${p.ideia.split('_')[0]}.${p.ideia.split('_')[1]}.fim`);
    const valores = [...(historico[p.id] || [])];
    cenaAtiva.tapete = true;
    render('grafico');
    const r = await api.tapete(p.id);
    if (!r.ok) { cenaAtiva.tapete = false; aplicar(r); render('grafico'); return; }
    aplicar(r, null, true);
    tocarTapete({ p, nome, fim, valores, res: r.resultado });
  }

  function tocarTapete({ p, nome, fim, valores, res }) {
    const tela = cena.telas.grafico;
    const ganho = res.ganho;
    let v = valores.length >= 3 ? valores.slice(-24) : [0, ...Array.from({ length: 4 }, (_, i) => (valores[0] ?? ganho) * (0.3 + 0.2 * i))].concat(valores);
    v = v.concat([ganho]);
    const frase = T(`tapete.${(p.id % 7) + 1}`);
    const sobre = h('div', { class: 'pm-tapete', 'data-pm': 'tapete', role: 'dialog', 'aria-label': 'Tapete puxado' });
    const palco = h('div', { class: 'pm-tapete__palco' });
    const cv = h('canvas', { class: 'pm-canvas', style: 'height:100%' });
    palco.append(cv);
    const legenda = h('p', { class: 'pm-tapete__legenda', 'aria-live': 'polite' }, '');
    const numero = h('div', { class: 'pm-grande pm-tapete__numero', 'data-pm': 'tapete-numero' }, '');
    const pular = h('button', { type: 'button', class: 'pm-btn', 'data-pm': 'tapete-pular' }, 'Pular');
    sobre.append(palco, legenda, numero, pular);
    tela.append(sobre);
    let relogio = 0, terminou = false;
    // número gigante: por cima de tudo, centrado no monitor do gráfico; some sozinho depois de um tempo
    let gigante = null, timerGigante = 0;
    const mostrarGigante = (valor) => {
      if (!gigante) {
        const r = tela.getBoundingClientRect();
        const pulo = h('span', { class: 'pm-gigante__pulo' });
        gigante = h('div', { class: `pm-gigante${menos() ? ' pm-gigante--parado' : ''}`, 'data-pm': 'ganho-gigante', 'aria-hidden': 'true' }, pulo);
        const cx = Math.min(window.innerWidth - 8, Math.max(8, r.left + r.width / 2));
        gigante.style.left = `${Math.round(Math.min(Math.max(cx, window.innerWidth * 0.3), window.innerWidth * 0.7))}px`;
        gigante.style.top = `${Math.round(r.top + r.height * 0.42)}px`;
        document.body.append(gigante);
      }
      gigante.firstChild.textContent = `+${din(valor)}`;
    };
    const tirarGigante = () => { clearTimeout(timerGigante); gigante?.remove(); gigante = null; };

    const resumo = () => {
      if (terminou) return;
      terminou = true; cancelAnimationFrame(relogio);
      palco.style.transform = '';
      pintarCurva(cv, v, { prog: 1, queda: 1 });
      numero.textContent = `+${din(ganho)}`;
      mostrarGigante(ganho);
      timerGigante = setTimeout(tirarGigante, 2600);
      const calorAgora = visao.estado.calor;
      sobre.replaceChildren(h('div', { class: 'pm-resumo', 'data-pm': 'tapete-resumo' },
        h('h3', { style: 'margin:0' }, `${nome}: tapete puxado`),
        h('div', { class: 'pm-grande' }, `+${din(ganho)}`),
        h('p', {}, `Calor +${fmt(res.calor, 1)} (agora ${fmt(calorAgora, 1)} de ${CALOR.maximo})`),
        res.batida ? h('p', { class: 'pm-aviso-texto' }, 'O Calor encheu: a polícia está na porta.') : null,
        h('p', {}, frase),
        fim ? h('p', { class: 'pm-pequeno' }, fim) : null,
        h('button', { type: 'button', class: 'pm-btn pm-btn--acao', 'data-pm': 'tapete-fechar', onclick: fechar }, 'Fechar'),
      ));
      sobre.querySelector('[data-pm="tapete-fechar"]').focus({ preventScroll: true });
    };
    function fechar() {
      tirarGigante();
      sobre.remove(); cenaAtiva.tapete = false;
      render('grafico');
      if (batidaAdiada) { batidaAdiada = false; abrirBatida(); }
    }
    if (menos()) { requestAnimationFrame(resumo); return; }
    pular.addEventListener('click', resumo);
    pular.focus({ preventScroll: true });
    // etapas (segundos): sobe · treme · pausa · despenca · número · frase
    const T1 = 1.2, T2 = 1.8, T3 = 2.4, T4 = 3.2, T5 = 4.4, T6 = 5.4;
    const inicio = performance.now();
    const quadro = (agora) => {
      if (terminou) return;
      const s = (agora - inicio) / 1000;
      let prog = 1, queda = 0, dx = 0;
      if (s < T1) { prog = s / T1; legenda.textContent = 'A comunidade está empolgada…'; }
      else if (s < T2) { prog = 1; dx = Math.sin((s - T1) * 70) * 6; legenda.textContent = 'Será que alguém desconfiou?'; }
      else if (s < T3) { legenda.textContent = '…'; }
      else if (s < T4) { queda = (s - T3) / (T4 - T3); legenda.textContent = 'Puxou!'; }
      else { queda = 1; legenda.textContent = ''; }
      palco.style.transform = dx ? `translateX(${dx.toFixed(1)}px)` : '';
      pintarCurva(cv, v, { prog, queda });
      if (s >= T4) { numero.textContent = `+${din(Math.round(ganho * (1 - (1 - Math.min(1, (s - T4) / (T5 - T4))) ** 3)))}`; mostrarGigante(Math.round(ganho * (1 - (1 - Math.min(1, (s - T4) / (T5 - T4))) ** 3))); }
      if (s >= T5) legenda.textContent = frase;
      if (s >= T6) { resumo(); return; }
      relogio = requestAnimationFrame(quadro);
    };
    relogio = requestAnimationFrame(quadro);
  }

  // =============================================================================================
  // MONITOR 2: COMUNIDADE + CHAT
  // =============================================================================================
  let contadorTrouxas = 0, animTrouxas = 0;
  function tweenTrouxas(el, alvo) {
    cancelAnimationFrame(animTrouxas);
    if (menos() || Math.abs(alvo - contadorTrouxas) < 2) { contadorTrouxas = alvo; el.textContent = fmt(alvo); return; }
    const de = contadorTrouxas, ini = performance.now();
    const passo = (agora) => {
      const k = Math.min(1, (agora - ini) / 700);
      contadorTrouxas = Math.round(de + (alvo - de) * k);
      el.textContent = fmt(contadorTrouxas);
      if (k < 1) animTrouxas = requestAnimationFrame(passo);
    };
    animTrouxas = requestAnimationFrame(passo);
  }

  function renderComunidade(t) {
    // Calor sempre visível (fica acima das abas)
    const lista = projetosNoAr();
    const algum = lista.map((p) => visao.previas.tapete[p.id]).find(Boolean);
    t.corpo.append(h('div', { class: 'pm-calor', 'data-pm': 'calor' },
      h('div', { class: 'pm-linha' }, h('strong', {}, 'Calor'), h('span', { class: 'pm-num', 'data-pm': 'calor-num' }, `${fmt(visao.estado.calor, 1)} / ${CALOR.maximo}`)),
      meterCalor(algum ? algum.calor : null),
      h('p', { class: 'pm-pequeno' }, visao.estado.batida ? 'A polícia está na porta!' : algum ? `A marca clara mostra onde o Calor iria se você puxar o tapete (+${fmt(algum.calor, 1)}).` : 'Cai devagar enquanto você está aqui.'),
    ));
    const total = lista.reduce((s, p) => s + Math.round(p.trouxas), 0);
    const numEl = h('div', { class: 'pm-grande', 'data-pm': 'trouxas' }, fmt(contadorTrouxas));
    t.corpo.append(h('div', { class: 'pm-card' }, h('p', { class: 'pm-pequeno' }, 'Trouxas entrando'), numEl));
    tweenTrouxas(numEl, total);
    t.corpo.append(h('div', { class: 'pm-card' }, h('h3', {}, 'O que esquenta'),
      lista.length ? lista.map((p) => h('div', { class: 'pm-linha' }, h('span', {}, `${nomeIdeia(p.ideia)} no ar`), chipRar(p.raridade)))
        : h('p', { class: 'pm-pequeno' }, 'Nada no ar: o Calor só cai.'),
      lista.some((p) => p.contrato && ['V1_NO_AR', 'PEDE_MAIS', 'V2_NO_AR'].includes(p.contrato.fase)) ? h('p', { class: 'pm-pequeno' }, 'Vídeo de influenciador no ar também esquenta.') : null,
      h('p', { class: 'pm-pequeno' }, 'Puxar o tapete é o que mais esquenta.')));
    lista.forEach((p) => {
      const max = TROUXAS.maximo[p.raridade];
      t.corpo.append(h('div', { class: 'pm-card' },
        h('div', { class: 'pm-linha' }, h('strong', {}, nomeIdeia(p.ideia)), h('span', { class: 'pm-num' }, `${fmt(p.trouxas)} / ${fmt(max)}`)),
        h('div', { class: 'pm-medidor', role: 'meter', 'aria-label': 'Trouxas', 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(Math.round(p.trouxas)) },
          h('div', { class: 'pm-medidor__cheio', style: `width:${Math.min(100, (p.trouxas / max) * 100)}%` }))));
    });
  }

  function renderChat(t) {
    if (!projetosNoAr().length && !chat.length) { t.corpo.append(h('p', { class: 'pm-vazio' }, 'A comunidade só aparece quando tem golpe no ar.')); return; }
    t.corpo.append(h('div', { class: 'pm-chat', 'data-pm': 'chat' },
      chat.slice(-40).map((m) => h('div', { class: `pm-msg${m.influ ? ' pm-msg--infl' : ''}` }, h('b', {}, m.autor), m.influ ? ' (influenciador): ' : ': ', m.texto))));
    t.corpo.scrollTop = t.corpo.scrollHeight;
  }

  // o chat é só enfeite da comunidade: usa os textos de nomes.js em ordem fixa (não decide nada do jogo)
  function andarChat() {
    const lista = projetosNoAr();
    if (!lista.length) return false;
    ticChat += 1;
    const autor = T(`avaliacao.${(ticChat % 6) + 1}.autor`, 'Anônimo');
    chat.push({ autor, texto: T(`chat.${(ticChat % 8) + 1}`) });
    let influ = false;
    const comParceiro = lista.filter((p) => p.contrato && p.contrato.influenciador);
    if (comParceiro.length && ticChat % 3 === 0) {
      const p = comParceiro[ticChat % comParceiro.length];
      const g = chaveInflu(p.contrato.influenciador);
      const n = (ticChat % 5) + 1;
      chat.push({ autor: nomeInflu(p.contrato.influenciador), influ: true, texto: citar(T(`influ.${g}.post.${n}`), nomeIdeia(p.ideia)) });
      influ = true;
    }
    if (chat.length > 60) chat.splice(0, chat.length - 60);
    return influ;
  }

  // =============================================================================================
  // MONITOR 3: PROJETO (no ar · ideias · impressora · porão)
  // =============================================================================================

  function nomeContrato(p) {
    const c = p.contrato;
    if (!c) return null;
    const txt = { V1_NO_AR: 'vídeo 1 no ar', PEDE_MAIS: 'pediu mais: responda no celular', V2_NO_AR: 'vídeo 2 no ar', V3_NO_AR: 'vídeo 3 saiu', ENCERRADO: 'parceria encerrada' }[c.fase] || c.fase;
    return `${nomeInflu(c.influenciador)}: ${txt}`;
  }

  function renderNoAr(t) {
    if (visao.estado.batida) t.corpo.append(faixaBatida());
    const lista = projetosNoAr();
    if (!lista.length) t.corpo.append(h('p', { class: 'pm-vazio' }, 'Nenhum projeto no ar. Imprima uma ideia e lance.'));
    lista.forEach((p) => {
      const previa = visao.previas.tapete[p.id];
      t.corpo.append(h('div', { class: 'pm-card', 'data-pm': 'projeto', 'data-projeto': String(p.id) },
        h('div', { class: 'pm-linha' }, h('strong', {}, nomeIdeia(p.ideia)), chipRar(p.raridade)),
        h('p', { class: 'pm-pequeno' }, `${ROTULO_FASE[p.fase]} · ${fmt(p.trouxas)} trouxas · rende ${din(visao.rendimentos[p.id] || 0)}/h`),
        medidorConfianca(p),
        p.contrato ? h('p', { class: 'pm-pequeno' }, nomeContrato(p)) : null,
        h('div', { class: 'pm-botoes' },
          h('button', { type: 'button', class: 'pm-btn', 'data-k': `ver-${p.id}`, onclick: () => { ativoId = p.id; render('grafico'); trazer('grafico'); cena.irParaMonitor(0); } }, previa ? `Tapete: +${din(previa.ganho)}` : 'Ver gráfico'),
          p.contrato ? null : h('button', { type: 'button', class: 'pm-btn', 'data-k': `contratar-${p.id}`, onclick: () => abrirCelular('contratar', p.id) }, 'Contratar influenciador')),
      ));
    });
    const fim = visao.estado.projetos.filter((p) => !NO_AR.includes(p.fase));
    if (fim.length) t.corpo.append(h('p', { class: 'pm-pequeno' }, `Encerrados: ${fim.map((p) => `${nomeIdeia(p.ideia)} (${ROTULO_FASE[p.fase].toLowerCase()})`).join(', ')}`));
  }

  /** "Confiança dos trouxas": é o hype do projeto (mesmo número do servidor), em 10 gomos. */
  function medidorConfianca(p) {
    const v = Math.max(0, Math.min(100, p.hype));
    const cheios = Math.round(v / 10);
    return h('div', { class: 'pm-confianca', 'data-pm': 'confianca', 'data-nivel': v < 34 ? 'baixa' : v < 67 ? 'media' : 'alta' },
      h('div', { class: 'pm-confianca__topo' }, h('span', { class: 'pm-confianca__rot' }, T('ui.confianca', 'Confiança dos trouxas')), h('span', { class: 'pm-num' }, fmt(p.hype))),
      h('div', { class: 'pm-confianca__gomos', role: 'meter', 'aria-label': `${T('ui.confianca', 'Confiança dos trouxas')} em ${nomeIdeia(p.ideia)}`, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(p.hype)) },
        Array.from({ length: 10 }, (_, i) => h('span', { class: `pm-confianca__gomo${i < cheios ? ' pm-confianca__gomo--cheio' : ''}` }))));
  }

  function gaveta() {
    const grupos = new Map();
    for (const c of visao.estado.cartas) {
      if (!grupos.has(c.ideia)) grupos.set(c.ideia, { ideia: c.ideia, raridade: c.raridade, ids: [] });
      grupos.get(c.ideia).ids.push(c.id);
    }
    return [...grupos.values()].sort((a, b) => RARIDADES.indexOf(b.raridade) - RARIDADES.indexOf(a.raridade));
  }

  function renderIdeias(t) {
    const g = gaveta();
    t.corpo.append(h('div', { class: 'pm-linha' }, h('strong', {}, 'Gaveta'), h('span', { class: 'pm-pequeno' }, `${visao.estado.cartas.length} / ${GAVETA.maximoDeCartas}`)));
    if (!g.length) t.corpo.append(h('p', { class: 'pm-vazio' }, 'Gaveta vazia. A impressora faz ideias novas.'));
    g.forEach((x) => {
      const maior = x.raridade === RARIDADES[RARIDADES.length - 1];
      t.corpo.append(h('div', { class: `pm-card pm-rar--${x.raridade}`, style: 'border-color: var(--rc)', 'data-pm': 'carta' },
        h('div', { class: 'pm-linha' }, h('strong', {}, `${x.ids.length}× ${nomeIdeia(x.ideia)}`), chipRar(x.raridade)),
        h('div', { class: 'pm-botoes' },
          h('button', { type: 'button', class: 'pm-btn pm-btn--acao', 'data-k': `lancar-${x.ids[0]}`, 'data-pm': 'lancar', onclick: () => lancar(x.ids[0]) }, 'Lançar'),
          h('button', { type: 'button', class: 'pm-btn', 'data-k': `fundir-${x.ideia}`, 'data-pm': 'fundir', disabled: maior || x.ids.length < 3, onclick: () => fundir(x.ideia) },
            maior ? 'Mítico não funde' : `Fundir 3→1 (${x.ids.length}/3)`))));
    });
    t.corpo.append(h('h3', { style: 'margin:8px 0 0' }, `Álbum (${Object.keys(visao.estado.album).length}/${RARIDADES.reduce((s, r) => s + IDEIAS_POR_RARIDADE[r], 0)})`));
    visao.impressora.chances.forEach(({ raridade, chance }) => {
      const n = IDEIAS_POR_RARIDADE[raridade];
      t.corpo.append(h('div', { class: `pm-rar--${raridade}` },
        h('div', { class: 'pm-linha' }, chipRar(raridade), h('span', { class: 'pm-pequeno' }, `${fmt(chance, 1)}% por impressão`)),
        h('div', { class: 'pm-grade', style: 'margin-top:4px' }, Array.from({ length: n }, (_, i) => {
          const id = `${raridade}_${i + 1}`;
          return visao.estado.album[id]
            ? h('div', { class: `pm-ideia pm-rar--${raridade}`, 'data-pm': 'album-visto' }, nomeIdeia(id))
            : h('div', { class: 'pm-ideia pm-ideia--oculta', 'aria-label': 'Ideia ainda não vista', 'data-pm': 'album-oculto' }, '?');
        }))));
    });
  }

  async function lancar(cartaId) {
    const r = await api.lancar(cartaId);
    aplicar(r, null, true);
    if (r.ok) { trazer('projetos'); ativoId = r.resultado.projeto.id; render('projeto'); render('grafico'); toast('No ar! O tapete libera em alguns segundos.'); }
  }
  async function fundir(ideia) {
    const r = await api.fundir(ideia);
    aplicar(r, r.ok ? `Fundiu: saiu ${nomeIdeia(r.resultado.carta.ideia)} (${ROTULO_RARIDADE[r.resultado.carta.raridade]}).` : null);
  }

  // ----- impressora e a revelação -----
  let timersRev = [];
  function renderImpressora(t) {
    const custo = visao.impressora.custo;
    const folha = h('div', { class: 'pm-folha pm-folha--vazia', 'data-pm': 'folha', 'data-etapa': '0', 'aria-live': 'polite' });
    const rar = h('div', { class: 'pm-folha__rar' }), nome = h('div', { class: 'pm-folha__nome' });
    folha.append(h('div', { style: 'opacity:.55;font-weight:700' }, revelada.carta ? '' : 'Folha em branco'), rar, nome);
    if (revelada.carta) {
      const c = revelada.carta;
      folha.className = `pm-folha pm-rar--${c.raridade}`; folha.dataset.etapa = cenaAtiva.revelacao ? '0' : '3';
      rar.append(chipRar(c.raridade)); nome.textContent = nomeIdeia(c.ideia);
      if (cenaAtiva.revelacao) iniciarRevelacao(folha);
    }
    t.corpo.append(h('div', { class: 'pm-slot', 'data-pm': 'slot' }, folha));
    const cheia = visao.estado.cartas.length >= GAVETA.maximoDeCartas;
    t.corpo.append(h('button', { type: 'button', class: 'pm-btn pm-btn--acao pm-btn--grande', 'data-pm': 'imprimir', 'data-k': 'imprimir',
      disabled: cenaAtiva.revelacao || cheia || visao.estado.caixa < custo, onclick: imprimir },
      custo === 0 ? 'IMPRIMIR IDEIA — grátis' : `IMPRIMIR IDEIA — ${din(custo)}`));
    if (cheia) t.corpo.append(h('p', { class: 'pm-aviso-texto' }, 'Gaveta cheia: lance ou funda ideias.'));
    else if (visao.estado.caixa < custo) t.corpo.append(h('p', { class: 'pm-pequeno' }, `Falta caixa: você tem ${din(visao.estado.caixa)}.`));
    if (revelada.carta && !cenaAtiva.revelacao) {
      const c = revelada.carta;
      const viva = visao.estado.cartas.some((x) => x.id === c.id);
      if (viva) t.corpo.append(h('div', { class: 'pm-botoes' },
        h('button', { type: 'button', class: 'pm-btn pm-btn--acao', 'data-pm': 'lancar-agora', 'data-k': 'lancar-agora', onclick: () => lancar(c.id) }, 'Lançar agora'),
        h('button', { type: 'button', class: 'pm-btn', 'data-k': 'guardar', onclick: () => { revelada.carta = null; render('projeto'); } }, 'Guardar na gaveta')));
    }
    t.corpo.append(h('div', { class: 'pm-card', 'data-pm': 'chances' }, h('h3', {}, 'Chance de cada tamanho de golpe'),
      visao.impressora.chances.map(({ raridade, chance }) => h('div', { class: `pm-barra pm-rar--${raridade}` },
        h('span', { class: 'pm-barra__rot' }, ROTULO_RARIDADE[raridade]),
        h('span', { class: 'pm-barra__trilho' }, h('span', { class: 'pm-barra__cheio', style: `display:block;width:${Math.max(2, chance)}%` })),
        h('span', { class: 'pm-barra__pct' }, `${fmt(chance, 1)}%`)))));
  }

  async function imprimir() {
    if (cenaAtiva.revelacao) return;
    const r = await api.imprimir();
    aplicar(r, null, true);
    if (!r.ok) return;
    revelada.carta = r.resultado.carta;
    cenaAtiva.revelacao = true;
    render('projeto');
  }
  function iniciarRevelacao(folha) {
    timersRev.forEach(clearTimeout); timersRev = [];
    const q = menos();
    const passo = (etapa, ms) => timersRev.push(setTimeout(() => {
      folha.dataset.etapa = String(etapa);
      if (etapa === 3) { cenaAtiva.revelacao = false; render('projeto'); }
    }, ms));
    // 0 = vazia; 1 = folha saindo; 2 = raridade; 3 = nome (último)
    passo(1, q ? 0 : 60); passo(2, q ? 120 : 1500); passo(3, q ? 240 : 2300);
    folha.addEventListener('click', () => { timersRev.forEach(clearTimeout); folha.dataset.etapa = '3'; cenaAtiva.revelacao = false; render('projeto'); }, { once: true });
  }

  function renderPorao(t) {
    t.corpo.append(h('p', { class: 'pm-pequeno' }, `Caixa: ${din(visao.estado.caixa)}. Luxo é compra única e aparece no porão.`));
    visao.luxos.forEach((l) => {
      const falta = l.custo - visao.estado.caixa;
      t.corpo.append(h('div', { class: 'pm-card', 'data-pm': 'luxo' },
        h('div', { class: 'pm-linha' }, h('strong', {}, nomeLuxo(l.id)), h('span', { class: 'pm-num' }, l.comprado ? 'Comprado' : din(l.custo))),
        descLuxo(l.id) ? h('p', { class: 'pm-pequeno' }, descLuxo(l.id)) : null,
        h('p', {}, textoBonus(l.bonus)),
        l.comprado ? null : h('button', { type: 'button', class: 'pm-btn pm-btn--acao', 'data-k': `luxo-${l.id}`, disabled: falta > 0, onclick: () => comprarLuxo(l.id) }, falta > 0 ? `Falta ${din(falta)}` : 'Comprar')));
    });
  }
  async function comprarLuxo(id) {
    const r = await api.luxo(id);
    aplicar(r, r.ok ? `${nomeLuxo(id)} comprado: já está no porão.` : null);
  }

  // =============================================================================================
  // BATIDA
  // =============================================================================================
  function faixaBatida() {
    return h('button', { type: 'button', class: 'pm-btn pm-btn--perigo pm-batida-faixa pm-faixa', 'data-k': 'batida-faixa', onclick: abrirBatida }, 'A polícia está na porta: resolver a batida');
  }
  function conteudoBatida() {
    const b = visao.previas.batida;
    const p = acharProjeto(b.projetoId);
    const nome = p ? nomeIdeia(p.ideia) : 'projeto';
    return [
      h('p', {}, `O Calor chegou a ${CALOR.maximo}. A polícia quer saber de `, h('strong', {}, nome), '.'),
      h('div', { class: 'pm-opcao' },
        h('strong', {}, 'Fazer rebrand'),
        h('p', {}, `Custa ${din(b.custoRebrand)} de caixa. O Calor cai para ${b.calorDepoisDoRebrand}. ${nome} continua no ar com outro nome.`),
        b.podeRebrand ? null : h('p', { class: 'pm-aviso-texto' }, `Falta ${din(b.custoRebrand - visao.estado.caixa)} para pagar.`),
        h('button', { type: 'button', class: 'pm-btn pm-btn--acao', 'data-pm': 'rebrand', disabled: !b.podeRebrand, onclick: () => resolverBatida('rebrand') }, `Pagar ${din(b.custoRebrand)} e fazer rebrand`)),
      h('div', { class: 'pm-opcao' },
        h('strong', {}, 'Perder o projeto'),
        h('p', {}, `${nome} é apreendido e você não ganha mais nada com ele. O Calor cai para ${b.calorDepoisDePerder}.`),
        h('button', { type: 'button', class: 'pm-btn pm-btn--perigo', 'data-pm': 'perder', onclick: () => resolverBatida('perder') }, `Perder ${nome}`)),
    ];
  }
  function abrirBatida() {
    if (!visao?.previas.batida) return;
    if (cenaAtiva.tapete) { batidaAdiada = true; return; }
    if (janelaBatida) { janelaBatida.atualizar(conteudoBatida()); return; }
    janelaBatida = janela({ titulo: 'A polícia chegou!', classe: 'pm-janela--batida', dado: 'batida', corpo: conteudoBatida(), aoFechar: () => { janelaBatida = null; render('projeto'); } });
  }
  async function resolverBatida(escolha) {
    const r = await api.batida(escolha);
    janelaBatida?.fechar();
    aplicar(r, r.ok ? (escolha === 'rebrand' ? 'Rebrand feito: o Calor caiu.' : 'Projeto apreendido: o Calor caiu.') : null);
  }

  // =============================================================================================
  // JANELA genérica (X, Esc, clique fora e botão fecham)
  // =============================================================================================
  function janela({ titulo, classe = '', dado, corpo, aoFechar }) {
    const antes = document.activeElement;
    const corpoEl = h('div', { class: 'pm-janela__corpo' }, corpo);
    const fechar = () => { document.removeEventListener('keydown', tecla, true); fundo.remove(); aoFechar?.(); antes?.focus?.({ preventScroll: true }); };
    const x = h('button', { type: 'button', class: 'pm-btn', 'aria-label': 'Fechar janela', 'data-pm': 'janela-x', onclick: fechar }, '✕');
    const caixa = h('div', { class: 'pm-janela__caixa', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, h('div', { class: 'pm-janela__topo' }, h('h2', {}, titulo), x), corpoEl);
    const fundo = h('div', { class: `pm-janela ${classe}`, 'data-pm': `janela-${dado}`, onclick: (e) => { if (e.target === fundo) fechar(); } }, caixa);
    function tecla(e) { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); fechar(); } }
    document.addEventListener('keydown', tecla, true);
    document.body.append(fundo);
    x.focus({ preventScroll: true });
    return { fechar, atualizar(novo) { const rol = corpoEl.scrollTop; corpoEl.replaceChildren(...[].concat(novo)); corpoEl.scrollTop = rol; } };
  }

  // =============================================================================================
  // CELULAR DA MESA
  // =============================================================================================
  let abaCelular = 'mensagens', projetoContratar = null, sigCelular = '';
  const chaveProposta = (p) => `${p.id}:${p.contrato.fase}:${p.contrato.proposta}:${p.contrato.chorou}`;
  const pendentes = () => (visao ? visao.estado.projetos.filter((p) => p.contrato && ((p.contrato.fase === 'V1_NO_AR' && p.contrato.proposta !== null) || p.contrato.fase === 'PEDE_MAIS')) : []);

  function conteudoCelular() {
    const tabs = h('div', { class: 'pm-abas', role: 'tablist' }, [['mensagens', 'Mensagens'], ['contratar', 'Contratar']].map(([a, rot]) =>
      h('button', { type: 'button', class: 'pm-aba', role: 'tab', 'data-aba': `cel-${a}`, 'aria-selected': String(abaCelular === a), onclick: () => { abaCelular = a; janelaCelular.atualizar(conteudoCelular()); } }, rot)));
    return [tabs, abaCelular === 'mensagens' ? mensagens() : contratar()];
  }

  function mensagens() {
    const com = visao.estado.projetos.filter((p) => p.contrato);
    if (!com.length) return h('p', { class: 'pm-vazio' }, 'Nenhuma mensagem ainda. Contrate um influenciador para um projeto.');
    return h('div', { class: 'pm-chat', 'data-pm': 'mensagens' }, com.map((p) => {
      const c = p.contrato, nome = nomeIdeia(p.ideia), quem = nomeInflu(c.influenciador);
      const inf = visao.influenciadores.find((i) => i.id === c.influenciador);
      const oferta = citar(T('msg.video1.oferta'), nome).replaceAll('{valor}', din(c.p1));
      const bal = [
        h('div', { class: 'pm-balao' }, oferta),
        h('div', { class: 'pm-balao pm-balao--eu' }, `Fechado: ${din(c.p1)} pelo vídeo 1.`),
        h('div', { class: 'pm-balao' }, `Vídeo 1 no ar: trouxe ${fmt(c.trazidasV1)} trouxas.`),
      ];
      if (c.fase === 'PEDE_MAIS' || (c.proposta !== null && c.proposta !== c.p1) || c.chorou) bal.push(h('div', { class: 'pm-balao' }, T('msg.melhorar.oferta')));
      else if (c.proposta !== null) bal.push(h('div', { class: 'pm-balao' }, `Foi bem! Vídeo 2 pelo mesmo preço: ${din(c.proposta)}.`));
      if (c.chorou) bal.push(h('div', { class: 'pm-balao--eu pm-balao' }, 'Está caro, dá um desconto?'), h('div', { class: 'pm-balao' }, T('msg.choro.resposta')));
      const aberto = (c.fase === 'V1_NO_AR' && c.proposta !== null) || c.fase === 'PEDE_MAIS';
      if (aberto) {
        const falta = c.proposta - visao.estado.caixa;
        bal.push(h('div', { class: 'pm-opcao', 'data-pm': 'proposta' },
          h('strong', {}, `Vídeo 2 por ${din(c.proposta)}`),
          h('div', { class: 'pm-botoes' },
            h('button', { type: 'button', class: 'pm-btn pm-btn--acao', 'data-pm': 'pagar', 'data-k': `pagar-${p.id}`, disabled: falta > 0, onclick: () => responder(p.id, 'pagar') }, falta > 0 ? `Falta ${din(falta)}` : `Pagar ${din(c.proposta)}`),
            c.fase === 'PEDE_MAIS' && !c.chorou ? h('button', { type: 'button', class: 'pm-btn', 'data-pm': 'chorar', 'data-k': `chorar-${p.id}`, onclick: () => responder(p.id, 'chorar') }, 'Chorar o preço') : null,
            h('button', { type: 'button', class: 'pm-btn', 'data-pm': 'recusar', 'data-k': `recusar-${p.id}`, onclick: () => responder(p.id, 'recusar') }, 'Recusar')),
          c.fase === 'PEDE_MAIS' && !c.chorou ? h('p', { class: 'pm-pequeno' }, 'Chorar pode dar desconto, ou ele some de vez.') : null));
      } else if (c.fase === 'V2_NO_AR') bal.push(h('div', { class: 'pm-balao--eu pm-balao' }, `Pago. Vídeo 2 no ar.`), h('div', { class: 'pm-balao' }, citar(T('video.2.roteiro'), nome)));
      else if (c.fase === 'V3_NO_AR') bal.push(h('div', { class: 'pm-balao' }, citar(T('video.3.roteiro'), nome)));
      else if (c.fase === 'ENCERRADO') bal.push(h('div', { class: 'pm-balao' }, c.motivo === 'sumiu' ? T('msg.sumir') : c.motivo === 'apreendido' ? 'O projeto foi apreendido: parceria encerrada.' : 'Você recusou. Ele visualizou e não respondeu.'));
      return h('div', { class: 'pm-card' },
        h('div', { class: 'pm-linha' }, h('strong', {}, `${quem} · ${nome}`), inf?.reincidente ? h('span', { class: 'pm-selo' }, 'REINCIDENTE') : null),
        h('div', { class: 'pm-conversa' }, bal));
    }));
  }

  function contratar() {
    const livres = projetosNoAr().filter((p) => !p.contrato);
    if (!projetoContratar || !livres.some((p) => p.id === projetoContratar)) projetoContratar = livres[0]?.id ?? null;
    const sel = h('select', { class: 'pm-btn', 'data-pm': 'contratar-projeto', 'aria-label': 'Projeto que vai receber o vídeo', style: 'width:100%',
      onchange: (e) => { projetoContratar = Number(e.target.value); janelaCelular.atualizar(conteudoCelular()); } },
      livres.map((p) => h('option', { value: String(p.id), selected: p.id === projetoContratar }, nomeIdeia(p.ideia))));
    const alvo = livres.find((p) => p.id === projetoContratar);
    return h('div', { class: 'pm-chat' },
      livres.length ? h('div', {}, h('p', { class: 'pm-pequeno' }, 'Projeto que ganha o vídeo (1 parceiro por projeto):'), sel)
        : h('p', { class: 'pm-vazio' }, 'Nenhum projeto no ar sem parceiro.'),
      visao.influenciadores.map((i) => {
        const g = chaveInflu(i.id), nome = T(`influ.${g}.nome`, i.id);
        const falta = i.p1 - visao.estado.caixa;
        return h('div', { class: 'pm-card', 'data-pm': 'influenciador' },
          h('div', { class: 'pm-linha' }, h('strong', {}, nome), h('span', {}, h('span', { class: 'pm-chip' }, ROTULO_TAMANHO[i.tamanho]), i.reincidente ? ' ' : '', i.reincidente ? h('span', { class: 'pm-selo' }, 'REINCIDENTE') : '')),
          h('p', { class: 'pm-pequeno' }, T(`influ.${g}.bio`)),
          i.liberado
            ? h('div', { class: 'pm-linha' }, h('span', {}, `Vídeo 1: `, h('span', { class: 'pm-num' }, din(i.p1)), i.carimbos ? ` · ${i.carimbos} carimbo(s)` : ''),
              h('button', { type: 'button', class: 'pm-btn pm-btn--acao', 'data-pm': 'contratar', 'data-k': `contratar-${i.id}`, disabled: !alvo || falta > 0, onclick: () => contratarInflu(alvo.id, i.id) }, falta > 0 ? `Falta ${din(falta)}` : 'Contratar'))
            : h('p', { class: 'pm-pequeno' }, `Trancado: puxe mais ${i.falta} tapete(s) para ele te conhecer.`));
      }));
  }

  async function contratarInflu(projetoId, influ) {
    const r = await api.contrato(projetoId, influ);
    aplicar(r, r.ok ? `${nomeInflu(influ)} vai gravar o vídeo 1.` : null);
    if (r.ok) { abaCelular = 'mensagens'; janelaCelular?.atualizar(conteudoCelular()); }
  }
  async function responder(projetoId, resposta) {
    const r = await api.resposta(projetoId, resposta);
    let msg = null;
    if (r.ok) {
      const d = r.resultado?.desfecho;
      msg = resposta === 'pagar' ? 'Vídeo 2 pago e no ar.' : d === 'desconto' ? 'Chorou e ele baixou o preço.' : d === 'sumiu' ? 'Ele te deixou no visto e sumiu.' : 'Você recusou o vídeo 2.';
    }
    aplicar(r, msg);
  }

  function abrirCelular(aba0, projetoId) {
    if (!visao) return;
    if (aba0) abaCelular = aba0;
    if (projetoId) projetoContratar = projetoId;
    pendentes().forEach((p) => celularVistas.add(chaveProposta(p)));
    atualizarCelularNovo();
    if (janelaCelular) { janelaCelular.atualizar(conteudoCelular()); return; }
    janelaCelular = janela({ titulo: 'Celular da mesa', dado: 'celular', corpo: conteudoCelular(), aoFechar: () => { janelaCelular = null; } });
  }

  function atualizarCelularNovo() {
    const novo = pendentes().some((p) => !celularVistas.has(chaveProposta(p)));
    if (novo !== celularNovo) { celularNovo = novo; botaoCel?.classList.toggle('pm-cel-novo', novo); if (botaoCel) botaoCel.querySelector('.pm-cel-rot').textContent = novo ? 'Celular (1 nova)' : 'Celular'; }
    return novo;
  }

  // botão do celular dentro da vista dos monitores
  const topoZoom = raiz.querySelector('.cena__zoom-topo');
  const botaoCel = h('button', { type: 'button', class: 'cena__btn', 'data-pm': 'celular-btn', onclick: () => abrirCelular() }, h('span', { class: 'pm-cel-rot' }, 'Celular'));
  topoZoom?.append(botaoCel);

  // =============================================================================================
  // Aplicar resposta do servidor
  // =============================================================================================
  function aplicar(r, msgOk) {
    if (r.visao) atualizar(r.visao);
    if (!r.ok) toast(r.erro || 'Algo deu errado.');
    else if (msgOk) toast(msgOk);
  }

  // =============================================================================================
  // Atualização
  // =============================================================================================
  function atualizar(nova) {
    const antes = visao;
    visao = nova;
    aoAtualizar?.(nova);
    const e = nova.estado;
    // amostras do gráfico: o que o servidor pagaria agora
    for (const p of projetosNoAr()) {
      const pv = nova.previas.tapete[p.id];
      if (!pv && p.fase !== 'LANCAMENTO') continue; // sem prévia (ex.: batida pendente): não inventa ponto no gráfico
      const v = pv?.ganho ?? 0;
      (historico[p.id] ||= []).push(v);
      if (historico[p.id].length > 90) historico[p.id].shift();
    }
    if (!ativoId || !projetosNoAr().some((p) => p.id === ativoId)) ativoId = projetosNoAr()[0]?.id ?? null;
    // avisos
    if (antes) {
      for (const p of projetosNoAr()) {
        const q = antes.estado.projetos.find((x) => x.id === p.id);
        if (q && q.fase !== p.fase && (p.fase === 'PICO' || (q.fase === 'LANCAMENTO' && p.fase === 'HYPE'))) avisar(0);
      }
      if (e.batida && !antes.estado.batida) { avisar(1); abrirBatida(); }
    }
    if (!e.batida && janelaBatida) janelaBatida.fechar();
    else if (e.batida && janelaBatida) janelaBatida.atualizar(conteudoBatida());
    if (antes && !cenaAtiva.revelacao) { /* chat anda só nas atualizações de rotina */ }
    if (atualizarCelularNovo()) avisar(2);
    // cena do porão
    const luxos = e.luxos.map((id) => (id === 'carro_na_garagem' ? 'garagem' : id));
    const trouxas = projetosNoAr().reduce((s, p) => s + Math.round(p.trouxas), 0);
    const hype = Math.round(Math.max(0, ...projetosNoAr().map((p) => p.hype)));
    const sig = JSON.stringify([trouxas, hype, luxos, celularNovo]);
    if (sig !== ultimoEstadoCena) { ultimoEstadoCena = sig; cena.definirEstado({ trouxas, hype, luxos, celularNovo }); }
    for (const id of Object.keys(MESAS)) render(id, false);
    if (janelaCelular) {
      const sc = JSON.stringify([e.projetos.map((p) => p.contrato), e.caixa, abaCelular, projetoContratar, e.contagem.tapetes]);
      if (sc !== sigCelular) { sigCelular = sc; janelaCelular.atualizar(conteudoCelular()); }
    }
  }

  /** Chamado a cada atualização de rotina (não depois de ações). */
  function pulsar() {
    const influ = andarChat();
    if (influ) avisar(1);
    renderApp('chat');
  }

  const RENDER = { grafico: renderGrafico, caixa: renderCaixa, comunidade: renderComunidade, chat: renderChat, projetos: renderNoAr, ideias: renderIdeias, impressora: renderImpressora, porao: renderPorao };
  Object.keys(MESAS).forEach(montarMesa);
  window.matchMedia('(max-width: 720px)').addEventListener('change', () => Object.keys(MESAS).forEach(arrumar));
  // pré-chat com a comunidade já falando
  chat.push({ autor: 'Joaozinho123', texto: 'quando lambo?' }, { autor: 'Marilu Fiel', texto: 'confia que sobe, tô dentro com tudo' });

  return {
    atualizar, pulsar, abrirCelular,
    aoMudarVista(v) { if (v === 'monitores') requestAnimationFrame(limparVisiveis); },
    mostrarAviso: toast,
    get celularNovo() { return celularNovo; },
    destruir() { obs.disconnect(); document.adoptedStyleSheets = document.adoptedStyleSheets.filter((f) => f !== folha); toasts.remove(); janelaBatida?.fechar(); janelaCelular?.fechar(); },
  };
}
