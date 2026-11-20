// Porão — a cena isométrica (canvas) e a vista de zoom nos 3 monitores.
// A cena NÃO decide nada: recebe um estado pronto (vindo do servidor) e só desenha.
//
// API:
//   const cena = await criarCena(elementoRaiz, { estado, aoClicar, aoMudarVista, menosAnimacao });
//   cena.definirEstado({ trouxas, hype, luxos, celularNovo, pose })   // redesenha; pose: 'normal' | 'rindo' | 'batida'
//   cena.definirMenosAnimacao(true|false)
//   cena.abrirMonitores(indice = 0) / cena.voltar() / cena.irParaMonitor(i)
//   cena.avisarMonitor(i, true|false)    // borda acesa (sem piscar) no monitor fora da vista
//   cena.telas  -> { grafico, comunidade, projeto }  (elementos vazios onde monitores.js desenha)
//   cena.vista  -> 'porao' | 'monitores' ;  cena.destruir()
//   aoClicar({ alvo, nome? })  alvo: 'pc' | 'celular' | 'rugrigo' | 'escada' | 'trouxas' | 'luxo' (nome = id do luxo)
//   aoMudarVista(vista)
import * as sprites from './sprites.js';

// A base é a sala-âncora pintada (arte/sala.png, 248×176, losango 32×16). Embaixo dela fica o anexo da garagem.
export const LARGURA = 248;
export const ALTURA = 212;
const OX = 124, OY = 58, LADO = 8; // só para o chão desenhado de reserva (sem a imagem da sala)
const iso = (gx, gy) => [OX + Math.round((gx - gy) * 16), OY + Math.round((gx + gy) * 8)];

export const LUXOS = ['cadeira_gamer', 'aquario', 'ar_condicionado', 'letreiro_neon', 'maquina_bebida', 'tela_curva', 'garagem'];
// ponto de âncora de cada luxo em pixels da sala (arte/porao/objetos/montar_objetos.py, POSICOES); garagem no anexo
const LUGAR = {
  ar_condicionado: [196, 48], letreiro_neon: [78, 30], maquina_bebida: [52, 92], aquario: [76, 134],
  tela_curva: [122, 74], cadeira_gamer: [168, 112], garagem: [190, 184],
};
const NA_PAREDE = ['ar_condicionado', 'letreiro_neon'];
const RUGRIGO = [141, 104];
const CELULAR = [181, 79];
// áreas de clique da sala pintada: mesa com os 3 monitores e a escada
const AREA_PC = { x: 124, y: 38, w: 62, h: 46 };
const AREA_ESCADA = { x: 144, y: 100, w: 48, h: 64 };
const PC_PONTO = [154, 50];
// chão livre para os trouxas (pixels da sala, frente da sala e lados da escada)
const ZONA_TROUXAS = [[94, 120], [200, 126], [120, 156], [66, 124], [108, 138], [128, 126], [214, 118], [52, 116], [80, 130], [116, 146]];
const MONITORES = [
  { id: 'grafico', titulo: 'Gráfico', sprite: 'monitor_grafico', gx: 3.5 },
  { id: 'comunidade', titulo: 'Comunidade', sprite: 'monitor_comunidade', gx: 4.5 },
  { id: 'projeto', titulo: 'Projeto', sprite: 'monitor_projeto', gx: 5.5 },
];
export const MAX_PARTICULAS = 40;      // normal (teto do guia de estilo: 90)
export const MAX_PARTICULAS_MENOS = 20; // metade, com "Menos animação"

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto != null) e.textContent = texto;
  return e;
}

export async function criarCena(raiz, opcoes = {}) {
  sprites.preparar();
  await sprites.carregarArte();

  let estado = { trouxas: 0, hype: 0, luxos: [], celularNovo: false, pose: 'normal', ...(opcoes.estado || {}) };
  const imgSala = sprites.sala();
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let forcado = opcoes.menosAnimacao ?? (localStorage.getItem('menos_animacao') === '1');
  const menos = () => forcado || media.matches;

  // ----- DOM -----
  raiz.classList.add('cena');
  const palco = el('div', 'cena__palco');
  const mundo = el('div', 'cena__mundo');
  const canvas = el('canvas', 'cena__canvas');
  canvas.width = LARGURA; canvas.height = ALTURA; canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'O porão do Rugrigo. Toque no computador para ver os monitores.');
  mundo.append(canvas); palco.append(mundo);

  const hud = el('div', 'cena__hud');
  const cont = el('p', 'cena__trouxas');
  const contNum = el('strong', 'cena__trouxas-num', '0');
  cont.append(contNum, el('span', 'cena__trouxas-rot', ' trouxas na fila'));
  const botoes = el('div', 'cena__botoes');
  const btnMon = el('button', 'cena__btn cena__btn--primario', 'Ver monitores');
  const btnCel = el('button', 'cena__btn', 'Celular');
  btnMon.type = btnCel.type = 'button';
  const iconeCel = el('img', 'cena__btn-icone'); iconeCel.src = 'arte/ui/icone_celular.png'; iconeCel.alt = ''; iconeCel.setAttribute('aria-hidden', 'true');
  btnCel.prepend(iconeCel);
  botoes.append(btnMon, btnCel); hud.append(cont, botoes);

  const zoom = el('section', 'cena__zoom'); zoom.hidden = true;
  zoom.setAttribute('aria-label', 'Os três monitores do Rugrigo');
  const topo = el('div', 'cena__zoom-topo');
  const btnVoltar = el('button', 'cena__btn cena__voltar', '← Voltar ao porão'); btnVoltar.type = 'button';
  topo.append(btnVoltar, el('span', 'cena__zoom-titulo', 'Mesa do Rugrigo'));
  const trilho = el('div', 'cena__trilho');
  trilho.setAttribute('role', 'group'); trilho.setAttribute('aria-label', 'Monitores');
  const telas = {}, caixas = [];
  MONITORES.forEach((m, i) => {
    const art = el('article', 'cena__monitor'); art.dataset.monitor = m.id;
    const h = el('h2', 'cena__monitor-titulo', m.titulo); h.id = 'cena-mon-' + m.id;
    art.setAttribute('aria-labelledby', h.id);
    const tela = el('div', 'cena__tela'); tela.dataset.tela = m.id;
    art.append(h, tela); trilho.append(art);
    telas[m.id] = tela; caixas.push(art);
    void i;
  });
  const pontos = el('div', 'cena__pontos');
  const bolas = MONITORES.map((m, i) => {
    const b = el('button', 'cena__ponto'); b.type = 'button';
    b.setAttribute('aria-label', `Monitor ${i + 1}: ${m.titulo}`);
    pontos.append(b); return b;
  });
  zoom.append(topo, trilho, pontos);
  raiz.append(palco, hud, zoom);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ----- fundo (chão e paredes), desenhado uma vez -----
  const fundo = document.createElement('canvas');
  fundo.width = LARGURA; fundo.height = ALTURA;
  const fctx = fundo.getContext('2d');
  function montarFundo() {
    fctx.clearRect(0, 0, LARGURA, ALTURA);
    if (imgSala) { fctx.drawImage(imgSala, 0, 0); return; }
    for (let s = 0; s <= 2 * (LADO - 1); s++) {
      for (let gx = 0; gx < LADO; gx++) {
        const gy = s - gx; if (gy < 0 || gy >= LADO) continue;
        const [x, y] = iso(gx + 0.5, gy + 0.5);
        sprites.desenhar(fctx, (gx + gy) % 2 ? 'chao_b' : 'chao_a', x, y);
      }
    }
    for (let i = 0; i < LADO; i++) {
      const [x, y] = iso(i, 0); sprites.desenhar(fctx, 'parede_dir', x, y);
      const [x2, y2] = iso(0, i); sprites.desenhar(fctx, 'parede_esq', x2, y2);
    }
    const [jx, jy] = iso(4, 0); sprites.desenhar(fctx, 'janela', jx, jy - 44);
    const [j2, j2y] = iso(1.6, 0); sprites.desenhar(fctx, 'janela', j2, j2y - 44);
    const [px, py] = iso(0, 1); sprites.desenhar(fctx, 'porta', px, py - 48);
  }
  montarFundo();

  // ----- desenho -----
  let regioes = [];
  let particulas = [];
  let tempo = 0;

  // objetos soltos por cima da sala: [nome, x, y] em pixels da sala (âncora = pé no chão)
  function objetos() {
    const o = [];
    const add = (nome, x, y, extra = {}) => o.push({ nome, x, y, ordem: extra.ordem ?? y, ...extra });
    if (!imgSala) {
      // reserva sem a imagem: móveis desenhados por código
      const g = (gx, gy) => iso(gx, gy);
      add('escada', ...g(1.0, 1.6), { alvo: 'escada' });
      add('mesa', ...g(4.5, 0.5), { alvo: 'pc' });
      MONITORES.forEach((m) => { const [x, y] = g(m.gx, 0.35); add(m.sprite, x, y - 12, { ordem: 0, alvo: 'pc' }); });
    }
    add('celular', CELULAR[0], CELULAR[1], { alvo: 'celular', ordem: 90 });
    const pose = estado.pose === 'rindo' ? 'rugrigo_rindo' : estado.pose === 'batida' ? 'rugrigo_batida' : 'rugrigo_b';
    add(pose, RUGRIGO[0], RUGRIGO[1], { alvo: 'rugrigo' });
    for (const id of estado.luxos) {
      if (!LUGAR[id]) continue;
      const [x, y] = LUGAR[id];
      add(id, x, y, { alvo: 'luxo', id, ordem: NA_PAREDE.includes(id) ? -1 : y + (id === 'cadeira_gamer' ? 1 : 0) });
    }
    const n = Math.min(ZONA_TROUXAS.length, estado.trouxas > 0 ? Math.ceil(Math.sqrt(estado.trouxas) / 2) : 0);
    for (let i = 0; i < n; i++) {
      const [bx, by] = ZONA_TROUXAS[i];
      const f = menos() ? 0 : Math.sin(tempo * 0.6 + i * 1.7);
      add('trouxa_' + (1 + (i % 4)), bx + Math.round(f * 5), by - Math.round(f * 2), { alvo: 'trouxas', espelho: i % 2 === 1, ordem: by });
    }
    return o.sort((p, q) => p.ordem - q.ordem);
  }

  function pcPonto() { return PC_PONTO; }

  function atualizarParticulas(dt) {
    const max = menos() ? MAX_PARTICULAS_MENOS : MAX_PARTICULAS;
    const hype = Math.max(0, Math.min(100, estado.hype || 0));
    if (menos()) {
      // sem relógio: posições fixas, espalhadas ao longo da subida
      const n = Math.min(max, Math.round(hype / 100 * max));
      const [px, py] = pcPonto();
      particulas = Array.from({ length: n }, (_, i) => ({
        x: px + Math.sin(i * 2.4) * 22, y: py - (i / Math.max(1, n)) * 52, tipo: i % 4 === 0 ? 'bolinha_codigo' : 'bolinha_hype',
      }));
      return;
    }
    const taxa = hype / 100 * 14;
    tempo += 0; // (relógio já avançado no laço)
    atualizarParticulas.acum = (atualizarParticulas.acum || 0) + taxa * dt;
    while (atualizarParticulas.acum >= 1) {
      atualizarParticulas.acum -= 1;
      if (particulas.length >= max) break;
      const [px, py] = pcPonto();
      particulas.push({ x: px + (Math.random() - 0.5) * 44, y: py, vx: (Math.random() - 0.5) * 8, vy: -(16 + Math.random() * 14), vida: 0, dura: 1.6 + Math.random() * 1.0, tipo: Math.random() < 0.25 ? 'bolinha_codigo' : 'bolinha_hype' });
    }
    for (const p of particulas) { p.vida += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    particulas = particulas.filter((p) => p.vida < p.dura).slice(0, max);
  }

  function desenharQuadro() {
    ctx.clearRect(0, 0, LARGURA, ALTURA);
    ctx.drawImage(fundo, 0, 0);
    regioes = [{ ...AREA_ESCADA, alvo: 'escada' }, { ...AREA_PC, alvo: 'pc' }];
    // lugares dos luxos que ainda não existem: contorno apagado, só para dar a ideia
    ctx.globalAlpha = 0.35;
    for (const id of LUXOS) {
      if (estado.luxos.includes(id)) continue;
      const [x, y] = LUGAR[id];
      const r = NA_PAREDE.includes(id) ? sprites.desenhar(ctx, 'lugar_' + id, x + (id === 'letreiro_neon' ? -10 : 10), y + 14) : sprites.desenhar(ctx, 'lugar_' + id, x, y);
      if (r) regioes.push({ ...r, alvo: 'luxo', id, livre: true });
    }
    ctx.globalAlpha = 1;
    for (const ob of objetos()) {
      const r = sprites.desenhar(ctx, ob.nome, ob.x, ob.y, ob.espelho);
      if (r) regioes.push({ ...r, alvo: ob.alvo, id: ob.id });
      if (ob.nome === 'celular' && estado.celularNovo) sprites.desenhar(ctx, 'celular_brilho', ob.x, ob.y - 8);
    }
    for (const p of particulas) sprites.desenhar(ctx, p.tipo, Math.round(p.x), Math.round(p.y));
  }

  // ----- laço -----
  let raf = 0, ultimo = 0, vista = 'porao', vivo = true;
  function quadro(agora) {
    raf = 0;
    if (!vivo || document.hidden || vista !== 'porao') return;
    const dt = Math.min(0.1, (agora - ultimo) / 1000 || 0); ultimo = agora;
    tempo += dt;
    atualizarParticulas(dt);
    desenharQuadro();
    if (!menos()) raf = requestAnimationFrame(quadro);
  }
  function redesenhar() {
    if (raf) cancelAnimationFrame(raf);
    ultimo = performance.now();
    if (menos()) { atualizarParticulas(0); desenharQuadro(); } else raf = requestAnimationFrame(quadro);
  }

  function atualizarHud() {
    contNum.textContent = Number(estado.trouxas || 0).toLocaleString('pt-BR');
    raiz.classList.toggle('cena--menos', menos());
    canvas.setAttribute('aria-describedby', '');
  }

  // ----- tamanho: escala inteira quando cabe 2x ou mais; senão fracionária -----
  let escala = 1;
  function ajustar() {
    const w = palco.clientWidth, h = palco.clientHeight;
    if (!w || !h) return;
    let e = Math.min(w / LARGURA, h / ALTURA);
    // escala inteira; abaixo de 2x (celular) tenta inteira em pixels do aparelho, senão fracionária sem borrar (pixelated)
    const dpr = window.devicePixelRatio || 1;
    if (e >= 2) e = Math.floor(e);
    else if (Math.floor(e * dpr) >= 2) e = Math.floor(e * dpr) / dpr;
    escala = e;
    const cw = Math.round(LARGURA * e), ch = Math.round(ALTURA * e);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    mundo.style.width = cw + 'px'; mundo.style.height = ch + 'px';
    mundo.style.left = Math.round((w - cw) / 2) + 'px'; mundo.style.top = Math.round((h - ch) / 2) + 'px';
  }
  const ro = new ResizeObserver(() => { ajustar(); if (vista === 'monitores') posicionarZoom(false); });
  ro.observe(palco);

  // ----- zoom nos monitores -----
  let atual = 0, timerZoom = 0;
  function posicionarZoom(animar) {
    const [sx, sy] = pcPonto();
    const k = palco.clientWidth < 700 ? 2.4 : 3;
    const tx = palco.clientWidth / 2 - mundo.offsetLeft - sx * escala * k;
    const ty = palco.clientHeight / 2 - mundo.offsetTop - sy * escala * k;
    mundo.style.transition = animar && !menos() ? 'transform 0.45s ease-in-out' : 'none';
    mundo.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
  }
  function marcarAtual() {
    caixas.forEach((c, i) => c.classList.toggle('cena__monitor--atual', i === atual));
    bolas.forEach((b, i) => { if (i === atual) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  function irParaMonitor(i) {
    atual = Math.max(0, Math.min(MONITORES.length - 1, i));
    const cx = caixas[atual];
    if (trilho.scrollWidth > trilho.clientWidth + 2) trilho.scrollTo({ left: cx.offsetLeft - trilho.offsetLeft, behavior: menos() ? 'auto' : 'smooth' });
    marcarAtual();
  }
  function mudarVista(v) { vista = v; opcoes.aoMudarVista?.(v); }
  function abrirMonitores(i = 0) {
    if (vista === 'monitores') { irParaMonitor(i); return; }
    mudarVista('monitores');
    raiz.classList.add('cena--zoom');
    posicionarZoom(true);
    const mostrar = () => {
      clearTimeout(timerZoom);
      if (vista !== 'monitores') return;
      zoom.hidden = false;
      void zoom.offsetWidth;
      zoom.classList.add('cena__zoom--aberto');
      irParaMonitor(i);
      btnVoltar.focus({ preventScroll: true });
    };
    timerZoom = setTimeout(mostrar, menos() ? 0 : 420);
  }
  function voltar() {
    if (vista !== 'monitores') return;
    clearTimeout(timerZoom);
    zoom.classList.remove('cena__zoom--aberto'); zoom.hidden = true;
    raiz.classList.remove('cena--zoom');
    mundo.style.transition = menos() ? 'none' : 'transform 0.35s ease-in-out';
    mundo.style.transform = '';
    mudarVista('porao');
    redesenhar();
    canvas.focus({ preventScroll: true });
  }
  trilho.addEventListener('scroll', () => {
    const w = caixas[0].offsetWidth;
    if (trilho.scrollWidth <= trilho.clientWidth + 2 || !w) return;
    const i = Math.round(trilho.scrollLeft / (w + 12));
    if (i !== atual && i >= 0 && i < MONITORES.length) { atual = i; marcarAtual(); }
  }, { passive: true });
  bolas.forEach((b, i) => b.addEventListener('click', () => irParaMonitor(i)));
  btnVoltar.addEventListener('click', voltar);
  const aoTeclar = (e) => {
    if (vista !== 'monitores') return;
    if (e.key === 'Escape') { voltar(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') irParaMonitor(atual + 1);
    else if (e.key === 'ArrowLeft') irParaMonitor(atual - 1);
  };
  document.addEventListener('keydown', aoTeclar);

  // ----- cliques -----
  function logico(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * LARGURA, (e.clientY - r.top) / r.height * ALTURA];
  }
  function achar(x, y) {
    for (let i = regioes.length - 1; i >= 0; i--) {
      const r = regioes[i];
      if (r.alvo && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
    }
    return null;
  }
  function clicar(r) {
    if (!r) return;
    const info = r.alvo === 'luxo' ? { alvo: 'luxo', nome: r.id, comprado: !r.livre } : { alvo: r.alvo };
    if (r.alvo === 'pc') abrirMonitores(0);
    opcoes.aoClicar?.(info);
  }
  canvas.addEventListener('pointerup', (e) => { if (vista === 'porao') clicar(achar(...logico(e))); });
  canvas.addEventListener('pointermove', (e) => { canvas.style.cursor = achar(...logico(e)) ? 'pointer' : 'default'; });
  canvas.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clicar({ alvo: 'pc' }); } });
  btnMon.addEventListener('click', () => clicar({ alvo: 'pc' }));
  btnCel.addEventListener('click', () => clicar({ alvo: 'celular' }));

  const aoVisivel = () => { if (!document.hidden && vista === 'porao') redesenhar(); };
  document.addEventListener('visibilitychange', aoVisivel);
  const aoMedia = () => { atualizarHud(); redesenhar(); };
  media.addEventListener('change', aoMedia);

  ajustar(); atualizarHud(); marcarAtual(); redesenhar();

  return {
    telas,
    get vista() { return vista; },
    get menosAnimacao() { return menos(); },
    get particulas() { return particulas.length; },
    get temSala() { return !!imgSala; },
    obterEstado: () => ({ ...estado, luxos: [...estado.luxos] }),
    definirEstado(novo) { estado = { ...estado, ...novo, luxos: [...(novo.luxos ?? estado.luxos)] }; atualizarHud(); redesenhar(); },
    definirMenosAnimacao(v) {
      forcado = !!v;
      try { localStorage.setItem('menos_animacao', forcado ? '1' : '0'); } catch { /* sem armazenamento */ }
      atualizarHud(); redesenhar();
    },
    abrirMonitores, voltar, irParaMonitor,
    avisarMonitor(i, ligado = true) { caixas[i]?.classList.toggle('cena__monitor--aviso', !!ligado); },
    destruir() {
      vivo = false; cancelAnimationFrame(raf); ro.disconnect();
      document.removeEventListener('keydown', aoTeclar); document.removeEventListener('visibilitychange', aoVisivel);
      media.removeEventListener('change', aoMedia); raiz.replaceChildren(); raiz.classList.remove('cena', 'cena--zoom', 'cena--menos');
    },
  };
}
