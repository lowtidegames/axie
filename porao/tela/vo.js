// Porão — a VÓ tutora (retrato + balão), a janela do APELIDO e a HISTÓRIA de 3 quadros.
// Desenho: docs/porao/desenho-abertura.md (tarefa 7) · decisão do dono 20/11 18:17.
// A vó NÃO decide nada: só olha a visão que o servidor devolveu (contagem, prévias, luxos) e escolhe a fala.
// A 1ª impressão sai sozinha: o app aperta o botão da impressora e o pedido leva a chave fixa `primeira-<conta>`
// (repetir o pedido não imprime duas vezes). O apelido é conferido aqui (validarApelido) e decidido no servidor.
// "Menos animação": balão sem surgir, história com quadros parados. Textos só de porao/comum/nomes.js pela chave.
import { TEXTOS } from '../comum/nomes.js';
import { validarApelido, APELIDO } from '../comum/apelido.js';

const T = (chave, reserva = chave) => TEXTOS[chave] ?? reserva;
const el = (tag, classe, texto) => { const e = document.createElement(tag); if (classe) e.className = classe; if (texto != null) e.textContent = texto; return e; };
const listaDe = (prefixo) => { const l = []; for (let i = 1; TEXTOS[`${prefixo}.${i}`] != null; i++) l.push(TEXTOS[`${prefixo}.${i}`]); return l; };

/** Identidade da conta para guardar o tutorial e montar a chave da 1ª impressão. */
export function chaveDaConta(conta) {
  return String(conta?.id ?? conta?.carteira ?? conta?.carteiraCurta ?? conta?.tipo ?? 'local').replace(/[^\w.-]/g, '_');
}

/** Conta "nova em folha" (nada impresso nem lançado): o tutorial começa do zero, mesmo com algo guardado. */
export const contaNova = (e) => e.contagem.impressoes === 0 && e.contagem.lancamentos === 0 && e.contagem.tapetes === 0 && (e.prestigio?.nivel ?? 0) === 0;

/**
 * Qual fala da vó (1–8) cabe na visão de agora. Puro: só lê o que o servidor mandou.
 * 1 impressora · 2 lançar · 3 Confiança · 4 tapete · 5 Calor · 6 polícia · 7 luxos · 8 despedida.
 * `revelando`: a folha ainda está saindo da impressora (a 2ª fala espera a ideia aparecer).
 */
export function passoDaVisao(visao, { revelando = false } = {}) {
  const e = visao.estado, c = e.contagem;
  if (e.luxos.length >= 1) return 8;
  if (c.tapetes >= 1 && (visao.luxos || []).some((l) => !l.comprado && l.custo <= e.caixa)) return 7;
  if (c.tapetes >= 2 || e.batida || c.batidas >= 1) return 6;
  if (c.tapetes >= 1) return 5;
  if (Object.keys(visao.previas?.tapete || {}).length > 0) return 4;
  if (c.lancamentos >= 1) return 3;
  if (c.impressoes >= 1 && !revelando) return 2;
  return 1;
}

// ---------- guardado da conta (o servidor ainda não tem campo para o tutorial: fica no navegador) ----------
function lerGuardado(chave) {
  try { return { passo: 0, fim: false, historia: false, ...JSON.parse(localStorage.getItem(`porao_vo:${chave}`) || '{}') }; } catch { return { passo: 0, fim: false, historia: false }; }
}
function gravar(chave, g) { try { localStorage.setItem(`porao_vo:${chave}`, JSON.stringify(g)); } catch { /* sem armazenamento */ } }

// ---------- janelas (apelido e história): fundo escuro, Esc fecha, nada passa por baixo ----------
function abrirFundo(classe, pm) {
  const fundo = el('div', `vo-fundo ${classe}`); fundo.dataset.pm = pm;
  document.body.append(fundo);
  return fundo;
}
/** Esc só para esta janela (antes da cena, que também ouve o Esc). Devolve a função que desliga. */
function ouvirEsc(fn) {
  const f = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); fn(); } };
  window.addEventListener('keydown', f, true);
  return () => window.removeEventListener('keydown', f, true);
}
/** 3 sugestões diferentes, sorteadas só para enfeite (o servidor confere o apelido escolhido). */
export function sortearSugestoes(n = 3, sorte = Math.random) {
  const todas = listaDe('apelido.sugestao');
  for (let i = todas.length - 1; i > 0; i--) { const j = Math.floor(sorte() * (i + 1)); [todas[i], todas[j]] = [todas[j], todas[i]]; }
  return todas.slice(0, n);
}
/** Texto do erro que veio do servidor: chave de nomes.js, código conhecido ou a frase pronta. */
function erroDoServidor(r) {
  if (typeof r?.erro === 'string' && TEXTOS[r.erro]) return TEXTOS[r.erro];
  const cod = String(r?.codigo || '');
  if (/usado|existe|repetid|ocupad/.test(cod)) return T('apelido.erro.usado');
  if (/feio|invalid|palavr/.test(cod)) return T('apelido.erro.feio');
  if (/curto/.test(cod)) return T('apelido.erro.curto');
  return r?.erro || 'Não deu para gravar agora. Tente de novo.';
}

/**
 * APELIDO: janela com o pedido, campo (até 20), 3 sugestões e o botão. Fecha por X, Esc ou clique fora (pergunta de novo
 * na próxima visita). Resolve { ok:true, conta } quando o servidor gravou, ou { ok:false } se o jogador fechou.
 */
export function pedirApelido({ api }) {
  return new Promise((resolver) => {
    const fundo = abrirFundo('vo-fundo--apelido', 'apelido-fundo');
    const j = el('section', 'ab__janela vo-apelido'); j.dataset.pm = 'apelido';
    j.setAttribute('role', 'dialog'); j.setAttribute('aria-modal', 'true'); j.setAttribute('aria-labelledby', 'vo-apelido-texto');
    const x = el('button', 'cena__btn vo-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar (escolher depois)'); x.dataset.pm = 'apelido-x';
    const topo = el('div', 'vo-apelido__topo');
    const foto = el('img', 'vo-apelido__retrato'); foto.src = 'arte/retrato_rugrigo_assustado.png'; foto.alt = ''; foto.draggable = false;
    const p = el('p', 'ab__texto vo-apelido__pedido', T('apelido.pedido')); p.id = 'vo-apelido-texto';
    topo.append(foto, p);
    const form = el('form', 'vo-apelido__form'); form.noValidate = true;
    const rot = el('label', 'vo-apelido__rot', 'Seu apelido de dev'); rot.htmlFor = 'vo-apelido-campo';
    const campo = el('input', 'vo-apelido__campo'); campo.id = 'vo-apelido-campo'; campo.dataset.pm = 'apelido-campo';
    campo.type = 'text'; campo.maxLength = APELIDO.maximo; campo.autocomplete = 'off'; campo.spellcheck = false;
    campo.setAttribute('autocapitalize', 'off'); campo.setAttribute('aria-describedby', 'vo-apelido-erro');
    const erro = el('p', 'ab__erro vo-apelido__erro'); erro.id = 'vo-apelido-erro'; erro.dataset.pm = 'apelido-erro'; erro.setAttribute('role', 'status');
    const sug = el('div', 'vo-apelido__sugestoes'); sug.setAttribute('aria-label', 'Sugestões');
    for (const s of sortearSugestoes()) {
      const b = el('button', 'cena__btn vo-sugestao', s); b.type = 'button'; b.dataset.pm = 'apelido-sugestao';
      b.addEventListener('click', () => { campo.value = s; conferir(true); campo.focus({ preventScroll: true }); });
      sug.append(b);
    }
    const enviar = el('button', 'cena__btn cena__btn--primario ab-btn', 'Assinar o boletim'); enviar.type = 'submit'; enviar.dataset.pm = 'apelido-ok';
    form.append(rot, campo, erro, sug, enviar);
    j.append(x, topo, form); fundo.append(j);

    let mexeu = false;
    function conferir(mostrar = mexeu) {
      const v = validarApelido(campo.value);
      erro.textContent = !v.ok && mostrar && campo.value.length ? T(v.erro) : '';
      campo.setAttribute('aria-invalid', String(!v.ok && mostrar && campo.value.length > 0));
      return v;
    }
    campo.addEventListener('input', () => { mexeu = true; conferir(true); });
    let fim = false;
    const desligarEsc = ouvirEsc(() => fechar({ ok: false }));
    function fechar(r) { if (fim) return; fim = true; desligarEsc(); fundo.remove(); resolver(r); }
    x.addEventListener('click', () => fechar({ ok: false }));
    fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar({ ok: false }); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = conferir(true);
      if (!v.ok) { erro.textContent = T(v.erro); campo.focus({ preventScroll: true }); return; }
      enviar.disabled = true;
      const r = await Promise.resolve().then(() => api.apelido(v.apelido)).catch(() => ({ ok: false, erro: 'Sem conexão com o servidor.' }));
      if (fim) return;
      enviar.disabled = false;
      if (r?.ok) fechar({ ok: true, conta: r.conta || null });
      else if (!r?.semSessao) { erro.textContent = erroDoServidor(r); campo.setAttribute('aria-invalid', 'true'); campo.focus({ preventScroll: true }); }
    });
    campo.focus({ preventScroll: true });
  });
}

// quadros da história: arte que já existe (Rugrigo assustado, Rugrigo malandro, o porão)
const QUADROS = [
  { arte: 'retrato_rugrigo_assustado', w: 96, h: 96 },
  { arte: 'retrato_rugrigo_malandro', w: 96, h: 96 },
  { arte: 'sala', w: 248, h: 176 },
];
export const TEMPO_QUADRO_MS = 4000;

/** HISTÓRIA: 3 quadros, até 4 s cada; tocar passa o quadro; Pular ou Esc fecha. Menos animação: quadros parados. */
export function mostrarHistoria({ menos = () => false } = {}) {
  return new Promise((resolver) => {
    const textos = listaDe('historia');
    const fundo = abrirFundo('vo-historia', 'historia');
    fundo.setAttribute('role', 'dialog'); fundo.setAttribute('aria-modal', 'true'); fundo.setAttribute('aria-label', 'Como tudo começou');
    fundo.classList.toggle('vo-historia--menos', menos());
    const quadro = el('figure', 'vo-historia__quadro');
    const img = el('img', 'vo-historia__arte'); img.alt = ''; img.draggable = false;
    const legenda = el('figcaption', 'vo-historia__legenda'); legenda.dataset.pm = 'historia-legenda'; legenda.setAttribute('aria-live', 'polite');
    quadro.append(img, legenda);
    const pontos = el('ol', 'vo-historia__pontos'); pontos.setAttribute('aria-hidden', 'true');
    textos.forEach(() => pontos.append(el('li', 'vo-historia__ponto', '')));
    const barra = el('div', 'vo-historia__barra'); barra.setAttribute('aria-hidden', 'true'); const cheio = el('span', 'vo-historia__cheio'); barra.append(cheio);
    const dica = el('p', 'vo-historia__dica', 'Toque para seguir');
    const pular = el('button', 'cena__btn vo-historia__pular', 'Pular'); pular.type = 'button'; pular.dataset.pm = 'historia-pular';
    fundo.append(pular, quadro, barra, pontos, dica);

    let i = -1, timer = 0, fim = false;
    const desligarEsc = ouvirEsc(() => fechar());
    function fechar() { if (fim) return; fim = true; clearTimeout(timer); desligarEsc(); window.removeEventListener('resize', medir); fundo.remove(); resolver(); }
    function medir() {
      const q = QUADROS[i % QUADROS.length];
      const k = Math.max(1, Math.floor(Math.min((innerWidth - 32) / q.w, (innerHeight * 0.42) / q.h)));
      img.style.width = `${q.w * k}px`; img.style.height = `${q.h * k}px`;
    }
    function ir(n) {
      if (n >= textos.length) { fechar(); return; }
      i = n; clearTimeout(timer);
      img.src = `arte/${QUADROS[i % QUADROS.length].arte}.png`; medir();
      legenda.textContent = textos[i];
      fundo.dataset.quadro = String(i + 1);
      [...pontos.children].forEach((p, k) => p.classList.toggle('vo-historia__ponto--feito', k <= i));
      // reinicia a animação do quadro (surge + barra); parado com Menos animação
      quadro.classList.remove('vo-historia__quadro--anda'); cheio.classList.remove('vo-historia__cheio--anda');
      void quadro.offsetWidth;
      if (!menos()) { quadro.classList.add('vo-historia__quadro--anda'); cheio.classList.add('vo-historia__cheio--anda'); }
      timer = setTimeout(() => ir(i + 1), TEMPO_QUADRO_MS);
    }
    window.addEventListener('resize', medir);
    pular.addEventListener('click', (e) => { e.stopPropagation(); fechar(); });
    fundo.addEventListener('click', () => ir(i + 1));
    ir(0);
    pular.focus({ preventScroll: true });
  });
}

/**
 * Tutorial da vó para a conta que acabou de entrar.
 *   const t = criarTutorial({ api, conta, cena, menos });
 *   criarMonitores({ api: t.api, ... aoAtualizar: (v) => t.ver(v) })   // t.api = api com a chave fixa da 1ª impressão
 *   t.destruir()
 */
export function criarTutorial({ api, conta, cena, menos = () => false }) {
  const chave = chaveDaConta(conta);
  let contaAtual = conta || null;
  let guardado = lerGuardado(chave);
  let ativo = null; // decide na 1ª visão (conta nova reinicia; tutorial terminado = sem vó)
  let visao = null;
  let vivo = true;
  let fluxo = 'esperando'; // apelido + história depois do 1º tapete: 'esperando' | 'aberto' | 'feito'
  let apelidoAdiado = false;
  let primeiraFeita = false;
  let fechado = 0; // número da fala que o jogador fechou tocando

  // 1ª impressão: o próximo imprimir sai com a chave fixa (o servidor não imprime duas vezes a mesma chave)
  let chaveFixa = null;
  const apiJogo = { ...api, imprimir: (k) => { const c = chaveFixa ?? k; chaveFixa = null; return api.imprimir(c); } };

  // ----- balão -----
  const caixa = el('aside', 'vo'); caixa.dataset.pm = 'vo'; caixa.hidden = true;
  const balao = el('button', 'vo__balao'); balao.type = 'button'; balao.dataset.pm = 'vo-balao';
  const foto = el('img', 'vo__retrato'); foto.alt = ''; foto.draggable = false; foto.dataset.pm = 'vo-retrato';
  const fala = el('span', 'vo__texto'); fala.dataset.pm = 'vo-fala';
  const nome = el('span', 'vo__nome', 'Vó');
  const x = el('span', 'vo__x', '✕'); x.setAttribute('aria-hidden', 'true');
  const corpo = el('span', 'vo__corpo'); corpo.append(nome, fala);
  balao.append(foto, corpo, x);
  caixa.append(balao);
  caixa.setAttribute('aria-live', 'polite');
  document.body.append(caixa);
  balao.addEventListener('click', () => {
    fechado = guardado.passo; caixa.hidden = true;
    if (guardado.passo >= 8) { guardado.fim = true; gravar(chave, guardado); desligarVo(); }
  });

  function mostrarFala(n) {
    foto.src = n >= 8 ? 'arte/retrato_vo_orgulhosa.png' : 'arte/retrato_vo.png';
    foto.dataset.quem = n >= 8 ? 'vo.orgulhosa' : 'vo';
    fala.textContent = T(`vo.${n}`);
    caixa.dataset.passo = String(n);
    balao.setAttribute('aria-label', `${T(`vo.${n}`)} (toque para fechar)`);
    caixa.classList.toggle('vo--menos', menos());
    caixa.hidden = false;
    caixa.classList.remove('vo--surge'); void caixa.offsetWidth; caixa.classList.add('vo--surge');
  }
  function desligarVo() { ativo = false; caixa.hidden = true; }

  // folha com ideia ainda saindo (etapa 0–2); folha em branco não conta
  const revelando = () => [...document.querySelectorAll('[data-pm="folha"]')].some((f) => !f.classList.contains('pm-folha--vazia') && f.dataset.etapa !== '3');
  const tapeteNaTela = () => !!document.querySelector('[data-pm="tapete"]');

  /** Aperta IMPRIMIR na impressora (com a chave fixa): a 1ª ideia sai sozinha, com a revelação de sempre. */
  function imprimirSozinha(tentativa = 0) {
    if (!vivo || primeiraFeita) return;
    if (visao && visao.estado.contagem.impressoes > 0) { primeiraFeita = true; return; }
    const icone = document.querySelector('[data-pm-monitor="projeto"] .pm-icone[data-app="impressora"]');
    const botao = document.querySelector('[data-pm-monitor="projeto"] [data-pm="imprimir"]');
    if (icone && botao && !botao.disabled) {
      primeiraFeita = true;
      icone.click();
      chaveFixa = `primeira-${chave}`;
      botao.click();
      return;
    }
    if (tentativa < 40) setTimeout(() => imprimirSozinha(tentativa + 1), 250);
  }

  async function apelidoEHistoria() {
    fluxo = 'aberto'; caixa.hidden = true;
    const c = visao?.estado?.conta ?? visao?.conta ?? contaAtual;
    if (c?.pedirApelido && !apelidoAdiado) {
      const r = await pedirApelido({ api });
      if (!vivo) return;
      if (r.ok) contaAtual = { ...(contaAtual || {}), ...(r.conta || {}), pedirApelido: false };
      else apelidoAdiado = true;
    }
    if (!guardado.historia || c?.pedirApelido) {
      await mostrarHistoria({ menos });
      if (!vivo) return;
      guardado.historia = true; gravar(chave, guardado);
    }
    fluxo = 'feito';
    pensar();
  }

  function pensar() {
    if (!vivo || !visao) return;
    const e = visao.estado;
    // apelido + história: depois do 1º tapete, com a cena do tapete já fechada
    if (fluxo === 'esperando' && e.contagem.tapetes >= 1 && !tapeteNaTela() && !e.batida) {
      const c = e.conta ?? visao.conta ?? contaAtual;
      const precisa = (c?.pedirApelido && !apelidoAdiado) || (ativo && !guardado.historia);
      if (precisa) { apelidoEHistoria(); return; }
      fluxo = 'feito';
    }
    if (!ativo || fluxo === 'aberto') return;
    let alvo = passoDaVisao(visao, { revelando: revelando() });
    if (alvo >= 5 && (fluxo !== 'feito' || tapeteNaTela())) alvo = Math.min(alvo, Math.max(guardado.passo, 4));
    if (alvo > guardado.passo) { guardado.passo = alvo; gravar(chave, guardado); mostrarFala(alvo); }
    else if (fechado !== guardado.passo && caixa.hidden && guardado.passo > 0) mostrarFala(guardado.passo);
  }
  const relogio = setInterval(pensar, 700);

  return {
    api: apiJogo,
    get passo() { return guardado.passo; },
    get ativo() { return !!ativo; },
    /** Cada visão nova do servidor (rotina ou depois de ação). */
    ver(nova) {
      visao = nova;
      if (ativo === null) {
        const novaConta = contaNova(nova.estado);
        if (novaConta) { guardado = { passo: 0, fim: false, historia: false }; gravar(chave, guardado); }
        ativo = !guardado.fim && !(conta?.tutorialFeito);
        if (ativo && novaConta && !nova.estado.batida) {
          cena?.abrirMonitores?.(2);
          setTimeout(() => imprimirSozinha(), 0);
        }
      }
      setTimeout(pensar, 0); // depois que os monitores desenharam esta visão
    },
    destruir() { vivo = false; clearInterval(relogio); caixa.remove(); },
  };
}
