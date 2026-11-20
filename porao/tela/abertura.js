// Porão — abertura: LOGO → CARREGANDO → TÍTULO → (Continuar | Convidado → PORÃO)
//   | (Conectar → AVISO → ESCOLHER → ASSINANDO → PORÃO; recusa → ESCOLHER) | Hall → TÍTULO.
// Desenho em docs/porao/desenho-abertura.md (decisão do dono 20/11 18:17).
// A tela não decide quem entra: pergunta a sessão ao servidor e só segue o que ele respondeu.
// Textos só de porao/comum/nomes.js pela chave (sem a chave, aparece a própria chave).
// "Menos animação": LOGO e CARREGANDO viram quadros parados; nada treme nem pisca.
import { TEXTOS } from '../comum/nomes.js';
import * as sprites from './sprites.js';

/** Texto pela chave; sem a chave, mostra a reserva (ou a própria chave, para o humorista ver o buraco). */
const T = (chave, reserva = chave) => TEXTOS[chave] ?? reserva;
/** Frases do carregando: carregando.1, carregando.2, ... enquanto existirem. */
function frasesCarregando() {
  const lista = [];
  for (let i = 1; TEXTOS[`carregando.${i}`] != null; i++) lista.push(TEXTOS[`carregando.${i}`]);
  return lista.length ? lista : ['carregando.1'];
}

// ---------- STUB tarefa 6 ----------
// STUB tarefa 6: api.js vai trazer sessao() (GET /api/sessao → {conta|null}) e convidado() (POST /api/sessao/convidado).
// Aqui só para a abertura andar. ?sessao=1 na página finge que já existe sessão (para ver o Continuar).
const busca = () => new URLSearchParams(globalThis.location?.search || '');
const stubApi = {
  sessao: async () => ({ ok: true, conta: busca().get('sessao') === '1' ? { tipo: 'convidado', apelido: null } : null }), // STUB tarefa 6
  convidado: async () => ({ ok: true, conta: { tipo: 'convidado', apelido: null } }), // STUB tarefa 6
};
// STUB tarefa 6: porao/tela/carteira-navegador.js vai exportar listarCarteiras() → [{ nome, icone, conectar() }].
// conectar() pede a assinatura e entra; devolve { ok:true, conta } ou { ok:false, erro }.
function stubListarCarteiras() { // STUB tarefa 6
  const ainda = () => new Promise((ok) => setTimeout(() => ok({ ok: false, erro: 'A ligação com a carteira chega na próxima parte. Por enquanto, jogue sem carteira.' }), 1800));
  return ['Phantom', 'Solflare', 'Backpack', 'MetaMask'].map((nome) => ({ nome, icone: null, conectar: ainda }));
}

// ---------- ferramentas ----------
const el = (tag, classe, texto) => { const e = document.createElement(tag); if (classe) e.className = classe; if (texto != null) e.textContent = texto; return e; };
function botao(texto, { primario = false, pm } = {}) {
  const b = el('button', `cena__btn ab-btn${primario ? ' cena__btn--primario' : ''}`, texto);
  b.type = 'button'; if (pm) b.dataset.pm = pm;
  return b;
}
/** Canvas com o sprite no tamanho nativo; o CSS amplia sem borrar. quadro = índice na tira. */
function pintarSprite(cv, nome, quadro = 0) {
  const f = sprites.fonteDe(nome);
  if (!f) return;
  const n = sprites.quadrosDe(nome), lado = n > 1 ? f.h : f.w;
  if (cv.width !== lado || cv.height !== f.h) { cv.width = lado; cv.height = f.h; }
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, cv.width, cv.height);
  c.drawImage(f.fonte, (quadro % n) * lado, 0, lado, f.h, 0, 0, lado, f.h);
  cv.dataset.final = f.final ? '1' : '0';
}
/** Escala inteira que cabe na caixa (mínimo 1). */
function escalaInteira(cv, larguraMax, alturaMax) {
  const k = Math.max(1, Math.floor(Math.min(larguraMax / cv.width, alturaMax / cv.height)));
  cv.style.width = `${cv.width * k}px`; cv.style.height = `${cv.height * k}px`;
}

/**
 * Roda a abertura dentro de `raiz` e resolve com { conta, como } quando o jogador chega ao porão.
 * opcoes: { api?: {sessao, convidado}, listarCarteiras?, menosAnimacao?: () => boolean }
 */
export function rodarAbertura(raiz, opcoes = {}) {
  const api = opcoes.api || stubApi;
  const listarCarteiras = opcoes.listarCarteiras || stubListarCarteiras;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const menos = opcoes.menosAnimacao || (() => media.matches || localStorage.getItem('menos_animacao') === '1');

  sprites.preparar();
  const arte = sprites.carregarArte();

  const caixa = el('div', 'ab'); caixa.dataset.pm = 'abertura';
  const fundo = el('canvas', 'ab__fundo'); fundo.setAttribute('aria-hidden', 'true');
  const palco = el('div', 'ab__palco');
  const menosBtn = botao('Menos animação', { pm: 'ab-menos' }); menosBtn.classList.add('ab__menos');
  caixa.append(fundo, palco, menosBtn);
  raiz.replaceChildren(caixa);

  let timers = [];
  let repintar = () => {};
  let teclaVoltar = null;
  const limpar = () => { timers.forEach((t) => clearInterval(t)); timers = []; repintar = () => {}; teclaVoltar = null; };
  const aplicarMenos = () => { caixa.classList.toggle('ab--menos', menos()); menosBtn.setAttribute('aria-pressed', String(menos())); };
  menosBtn.addEventListener('click', () => {
    try { localStorage.setItem('menos_animacao', menos() ? '0' : '1'); } catch { /* sem armazenamento */ }
    aplicarMenos(); atual?.();
  });
  aplicarMenos();
  arte.then(() => { pintarSprite(fundo, 'casa_vo_noite'); repintar(); });

  let atual = null; // redesenha a tela atual (ao trocar "Menos animação")
  function mostrar(nome, montar) {
    limpar();
    caixa.dataset.tela = nome;
    caixa.classList.toggle('ab--com-fundo', ['titulo', 'aviso', 'escolher', 'assinando', 'hall'].includes(nome));
    palco.replaceChildren();
    atual = () => mostrar(nome, montar);
    montar();
    const foco = palco.querySelector('[data-foco]') || palco.querySelector('button');
    foco?.focus({ preventScroll: true });
  }
  const onTecla = (e) => { if (e.key === 'Escape' && teclaVoltar) { e.preventDefault(); teclaVoltar(); } };
  document.addEventListener('keydown', onTecla);
  // clicar fora da janela (no fundo) também volta
  caixa.addEventListener('click', (e) => { if (teclaVoltar && (e.target === caixa || e.target === palco || e.target === fundo)) teclaVoltar(); });
  pintarSprite(fundo, 'casa_vo_noite');

  return new Promise((resolver) => {
    let sessao = null;
    const sessaoPedida = Promise.resolve().then(() => api.sessao()).catch(() => ({ ok: false, conta: null }));

    function entrar(conta, como) {
      limpar();
      document.removeEventListener('keydown', onTecla);
      caixa.remove();
      resolver({ conta, como });
    }

    // LOGO do estúdio: some sozinho; toque, clique ou tecla pula.
    function telaLogo() {
      mostrar('logo', () => {
        const cv = el('canvas', 'ab__logo-estudio'); cv.dataset.pm = 'logo-estudio';
        const pintar = () => { pintarSprite(cv, 'logo_estudio'); escalaInteira(cv, Math.min(innerWidth * 0.5, 240), innerHeight * 0.4); };
        pintar(); repintar = pintar;
        const dica = el('p', 'ab__dica', 'Toque para pular');
        palco.append(cv, dica);
        let foi = false;
        const seguir = () => { if (foi) return; foi = true; caixa.removeEventListener('pointerdown', seguir); document.removeEventListener('keydown', seguir); telaCarregando(); };
        caixa.addEventListener('pointerdown', seguir);
        document.addEventListener('keydown', seguir);
        timers.push(setTimeout(seguir, 2200));
      });
    }

    // CARREGANDO: Rugrigo puxando o tapete (quadros) + frases; espera a arte e a sessão.
    function telaCarregando() {
      mostrar('carregando', () => {
        const cv = el('canvas', 'ab__carregando'); cv.dataset.pm = 'carregando';
        const frase = el('p', 'ab__frase'); frase.dataset.pm = 'carregando-frase'; frase.setAttribute('aria-live', 'polite');
        palco.append(cv, frase);
        const frases = frasesCarregando();
        let q = 0, f = 0;
        const pintar = () => { pintarSprite(cv, 'carregando_rugrigo', menos() ? 0 : q); escalaInteira(cv, Math.min(innerWidth * 0.7, 288), innerHeight * 0.35); };
        pintar(); repintar = pintar;
        frase.textContent = frases[0];
        if (!menos()) timers.push(setInterval(() => { q++; pintar(); }, 180));
        timers.push(setInterval(() => { f = (f + 1) % frases.length; frase.textContent = frases[f]; }, 1600));
      });
      const minimo = new Promise((ok) => setTimeout(ok, menos() ? 900 : 1600));
      Promise.all([arte, sessaoPedida, minimo]).then(([, s]) => { sessao = s?.conta || null; telaTitulo(); });
    }

    // TÍTULO: casa da vó à noite, logo, nome, slogan e os botões.
    function telaTitulo() {
      mostrar('titulo', () => {
        const topo = el('div', 'ab__marca');
        const logo = el('canvas', 'ab__logo-jogo'); logo.dataset.pm = 'logo-jogo';
        const pintar = () => { pintarSprite(logo, 'logo_jogo'); escalaInteira(logo, Math.min(innerWidth - 48, 288), innerHeight * 0.16); };
        pintar(); repintar = pintar;
        const nome = el('h1', 'ab__nome', T('titulo.nome')); nome.dataset.pm = 'nome-jogo';
        const slogan = el('p', 'ab__slogan', T('titulo.slogan'));
        topo.append(logo, nome, slogan);
        const botoes = el('div', 'ab__botoes');
        if (sessao) {
          const b = botao(T('titulo.botoes.continuar'), { primario: true, pm: 'continuar' }); b.dataset.foco = '1';
          b.addEventListener('click', () => entrar(sessao, 'continuar'));
          botoes.append(b);
        }
        const conectar = botao(T('titulo.botoes.conectar'), { primario: !sessao, pm: 'conectar' });
        conectar.addEventListener('click', telaAviso);
        const convidado = botao(T('titulo.botoes.convidado'), { pm: 'convidado' });
        convidado.addEventListener('click', async () => {
          convidado.disabled = true;
          const r = await Promise.resolve().then(() => api.convidado()).catch(() => ({ ok: false }));
          if (r?.ok) entrar(r.conta || null, 'convidado');
          else { convidado.disabled = false; aviso.textContent = 'Não deu para entrar agora. Tente de novo.'; }
        });
        const hall = botao(T('titulo.botoes.hall'), { pm: 'hall' });
        hall.addEventListener('click', telaHall);
        botoes.append(conectar, convidado, hall);
        const aviso = el('p', 'ab__erro'); aviso.setAttribute('role', 'status');
        palco.append(topo, botoes, aviso);
      });
    }

    // AVISO da assinatura: só assinatura, nunca transação.
    function telaAviso() {
      mostrar('aviso', () => {
        const j = el('section', 'ab__janela'); j.dataset.pm = 'aviso-assinatura';
        j.setAttribute('role', 'dialog'); j.setAttribute('aria-labelledby', 'ab-aviso-titulo');
        const h = el('h2', 'ab__titulo', T('aviso.assinatura.titulo')); h.id = 'ab-aviso-titulo';
        const p = el('p', 'ab__texto', T('aviso.assinatura.texto'));
        const linha = el('div', 'ab__linha');
        const voltar = botao(T('aviso.botoes.voltar', 'Voltar'), { pm: 'voltar' });
        const seguir = botao(T('aviso.botoes.continuar', 'Continuar'), { primario: true, pm: 'continuar-aviso' }); seguir.dataset.foco = '1';
        voltar.addEventListener('click', telaTitulo); seguir.addEventListener('click', () => telaEscolher());
        linha.append(voltar, seguir); j.append(h, p, linha); palco.append(j);
        teclaVoltar = telaTitulo;
      });
    }

    // ESCOLHER a carteira (a lista vem do navegador: só as que existem).
    function telaEscolher(erro = '') {
      mostrar('escolher', () => {
        const j = el('section', 'ab__janela'); j.dataset.pm = 'escolher-carteira';
        j.setAttribute('role', 'dialog'); j.setAttribute('aria-labelledby', 'ab-escolher-titulo');
        const h = el('h2', 'ab__titulo', T('carteira.escolher.titulo', 'Escolha a carteira')); h.id = 'ab-escolher-titulo';
        const lista = el('ul', 'ab__carteiras');
        let carteiras = [];
        try { carteiras = listarCarteiras() || []; } catch { carteiras = []; }
        for (const c of carteiras) {
          const li = el('li');
          const b = botao('', { pm: 'carteira' }); b.classList.add('ab__carteira'); b.dataset.carteira = c.nome;
          if (c.icone) { const i = el('img', 'ab__carteira-icone'); i.src = c.icone; i.alt = ''; b.append(i); }
          else b.append(el('span', 'ab__carteira-letra', String(c.nome || '?').slice(0, 1)));
          b.append(el('span', 'ab__carteira-nome', c.nome));
          b.addEventListener('click', () => telaAssinando(c));
          li.append(b); lista.append(li);
        }
        if (!carteiras.length) lista.append(el('li', 'ab__texto', T('carteira.nenhuma', 'Nenhuma carteira encontrada neste navegador.')));
        const msg = el('p', 'ab__erro', erro); msg.setAttribute('role', 'status'); msg.dataset.pm = 'erro-carteira';
        const voltar = botao(T('aviso.botoes.voltar', 'Voltar'), { pm: 'voltar' });
        voltar.addEventListener('click', telaTitulo);
        j.append(h, lista, msg, voltar); palco.append(j);
        teclaVoltar = telaTitulo;
      });
    }

    // ASSINANDO: a carteira abre a mensagem; recusou ou venceu → volta a ESCOLHER.
    function telaAssinando(carteira) {
      mostrar('assinando', () => {
        const j = el('section', 'ab__janela'); j.dataset.pm = 'assinando';
        j.setAttribute('role', 'dialog'); j.setAttribute('aria-labelledby', 'ab-assinando-titulo'); j.setAttribute('aria-busy', 'true');
        const h = el('h2', 'ab__titulo', carteira.nome); h.id = 'ab-assinando-titulo';
        const p = el('p', 'ab__texto', T('carteira.assinando.texto', 'Abra a carteira e confira: é só uma assinatura. Se aparecer valor, transação ou aprovação, recuse.'));
        const pontos = el('p', 'ab__espera', 'Esperando a carteira'); pontos.setAttribute('aria-hidden', 'true');
        j.append(h, p, pontos); palco.append(j);
      });
      Promise.resolve().then(() => carteira.conectar()).catch((e) => ({ ok: false, erro: String(e?.message || e) })).then((r) => {
        if (caixa.dataset.tela !== 'assinando') return;
        if (r?.ok) entrar(r.conta || null, 'carteira');
        else telaEscolher(r?.erro || 'A carteira não assinou. Tente de novo.');
      });
    }

    // HALL DA VERGONHA (v1: só silhuetas).
    function telaHall() {
      mostrar('hall', () => {
        const j = el('section', 'ab__janela ab__janela--hall'); j.dataset.pm = 'hall-vergonha';
        j.setAttribute('role', 'dialog'); j.setAttribute('aria-labelledby', 'ab-hall-titulo');
        const h = el('h2', 'ab__titulo', T('hall.titulo', T('titulo.botoes.hall'))); h.id = 'ab-hall-titulo';
        const fila = el('ol', 'ab__silhuetas'); fila.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 5; i++) { const s = el('li', 'ab__silhueta'); s.dataset.lugar = String(i + 1); s.append(el('span', 'ab__silhueta-num', `${i + 1}º`)); fila.append(s); }
        const vazio = el('p', 'ab__texto', T('hall.vazio')); vazio.dataset.pm = 'hall-vazio';
        const voltar = botao(T('aviso.botoes.voltar', 'Voltar'), { pm: 'voltar' }); voltar.dataset.foco = '1';
        voltar.addEventListener('click', telaTitulo);
        j.append(h, fila, vazio, voltar); palco.append(j);
        teclaVoltar = telaTitulo;
      });
    }

    // Quem já tem sessão pula o logo e cai no título com o Continuar.
    let decidido = false;
    const prazo = setTimeout(() => { if (!decidido) { decidido = true; telaLogo(); } }, 400);
    sessaoPedida.then((s) => {
      if (decidido) return;
      decidido = true; clearTimeout(prazo);
      if (s?.conta) { sessao = s.conta; arte.then(telaTitulo); } else telaLogo();
    });
  });
}
