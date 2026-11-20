// Porão — catálogo de sprites (arte provisória feita por código, grade isométrica 2:1).
// Cada sprite: nome, camada, tamanho (w,h), âncora (ax,ay = ponto central da base no sprite)
// e uma forma provisória. Se existir imagem com o mesmo nome em arte/ ou ../arte.local/
// (listada no indice.json da pasta), ela entra no lugar. A cena só chama desenhar().
// Cores: lidas dos tokens --pix-* do :root (estilo.css); os valores abaixo são só reserva.

export const CAMADAS = ['chao', 'parede', 'movel', 'luxo', 'gente', 'efeito', 'interface'];

// Tamanho em tiles (largura em gx, fundo em gy) de cada lugar de luxo.
export const LUXOS_PEGADA = {
  aquario: [1.2, 2],
  cadeira_gamer: [1, 1],
  maquina_bebida: [1, 1],
  ar_condicionado: [0.9, 0.1],
  letreiro_neon: [0.1, 0.9],
  tela_curva: [0.92, 0.12],
  garagem: [3, 2.6],
};

const RESERVA = {
  contorno: '#1d1622', chao_a: '#4d4259', chao_b: '#453b50', chao_l: '#322a3b',
  parede_e: '#8c7563', parede_d: '#735e52', junta_e: '#6a564a', junta_d: '#57463d',
  madeira: '#8b5a3c', madeira_c: '#a8744b', madeira_e: '#6a4230',
  metal: '#8d95a3', metal_c: '#b3bbc8', metal_e: '#5d6472',
  tela_a: '#3b8fd9', tela_c: '#8fd0ff', tela_v: '#5be08a', tela_r: '#ff6b5e', tela_f: '#16222f',
  hype: '#ffd84a', codigo: '#5be08a', pele: '#e8b690', cabelo: '#3a2a22',
  moletom: '#c4483f', moletom_e: '#8e312c',
  trouxa_1: '#5aa9e6', trouxa_2: '#e6a85a', trouxa_3: '#a65ae6',
  agua: '#3fa7c9', vidro: '#9fe3ee', peixe: '#ff8a3d', planta: '#3f9b5a',
  sofa: '#a23b5a', sofa_c: '#c25577', sofa_e: '#7a2b43',
  carro: '#e8c13a', carro_c: '#f7de7a', carro_e: '#b08f22', roda: '#23202b', farol: '#fff4a8',
  lugar: '#f2e6c9', janela_ceu: '#7fb2e8', porta: '#2a1f2e', luz: '#fff4a8',
  lata_a: '#e05a4f', lata_b: '#4fa0e0', lata_c: '#f0c64a', gamer: '#d1344c', gamer_e: '#2b2833',
  painel_c: '#31283f',
};
const P = { ...RESERVA };
export function lerPaleta(el = document.documentElement) {
  const cs = getComputedStyle(el);
  for (const k of Object.keys(RESERVA)) {
    const v = cs.getPropertyValue('--pix-' + k.replace(/_/g, '-')).trim();
    if (v) P[k] = v;
  }
}

// ---------- ferramentas de desenho (tudo em inteiros) ----------
const R = Math.round;
function poli(c, pts, cor) {
  c.fillStyle = cor; c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(R(x), R(y)) : c.moveTo(R(x), R(y))));
  c.closePath(); c.fill();
}
function px(c, x, y, w, h, cor) { c.fillStyle = cor; c.fillRect(R(x), R(y), w, h); }
function reta(c, x0, y0, x1, y1, cor, passo = 0) {
  const n = Math.abs(x1 - x0), s = x1 >= x0 ? 1 : -1;
  for (let i = 0; i <= n; i++) {
    if (passo && Math.floor(i / passo) % 2) continue;
    px(c, x0 + i * s, y0 + (y1 - y0) * (n ? i / n : 0), 1, 1, cor);
  }
}
const mat = (topo, esq, dir) => ({ topo, esq, dir });
const matMadeira = () => mat(P.madeira_c, P.madeira, P.madeira_e);
const matMetal = () => mat(P.metal_c, P.metal, P.metal_e);

// Caixa isométrica: (x,y) = centro da base; w em gx, d em gy, h em pixels; z = altura do chão.
function caixa(c, x, y, w, d, h, cor, z = 0) {
  const A = [x + R((d - w) * 8), y - R((w + d) * 4) - z];
  const B = [x + R((w + d) * 8), y + R((w - d) * 4) - z];
  const C = [x + R((w - d) * 8), y + R((w + d) * 4) - z];
  const D = [x - R((w + d) * 8), y + R((d - w) * 4) - z];
  const up = (p) => [p[0], p[1] - h];
  poli(c, [D, C, up(C), up(D)], cor.esq);
  poli(c, [C, B, up(B), up(C)], cor.dir);
  poli(c, [up(A), up(B), up(C), up(D)], cor.topo);
  return { A, B, C, D, h };
}
const ponto = (k, a, b, t, s) => [k[a][0] + (k[b][0] - k[a][0]) * t, k[a][1] + (k[b][1] - k[a][1]) * t - s * k.h];
function painelEsq(c, k, t0, t1, s0, s1, cor) {
  poli(c, [ponto(k, 'D', 'C', t0, s0), ponto(k, 'D', 'C', t1, s0), ponto(k, 'D', 'C', t1, s1), ponto(k, 'D', 'C', t0, s1)], cor);
}
function painelDir(c, k, t0, t1, s0, s1, cor) {
  poli(c, [ponto(k, 'C', 'B', t0, s0), ponto(k, 'C', 'B', t1, s0), ponto(k, 'C', 'B', t1, s1), ponto(k, 'C', 'B', t0, s1)], cor);
}
// Faixa em parede: desce para a direita (parede da direita da tela) ou sobe (da esquerda).
function faixaD(c, x, y, w, h, cor) { poli(c, [[x, y], [x + w, y + w / 2], [x + w, y + w / 2 + h], [x, y + h]], cor); }
function faixaE(c, x, y, w, h, cor) { poli(c, [[x, y + w / 2], [x + w, y], [x + w, y + h], [x, y + w / 2 + h]], cor); }

// ---------- catálogo ----------
const CATALOGO = new Map();
function def(nome, camada, w, h, ax, ay, desenhar, op = {}) {
  CATALOGO.set(nome, { nome, camada, w, h, ax, ay, desenhar, contorno: true, canvas: null, img: null, ...op });
}
// Sprite de caixa: calcula tamanho e âncora pelo espaço que ocupa no chão.
function defCaixa(nome, camada, w, d, alto, desenhar, op = {}) {
  const W = Math.ceil((w + d) * 16 + 6), H = Math.ceil((w + d) * 8 + alto + 6);
  def(nome, camada, W, H, Math.round(W / 2), Math.round((w + d) * 4 + alto + 3), desenhar, op);
}

export const PAREDE_ALTA = 48;

function ladrilho(c, cor, v) {
  poli(c, [[0, -8], [16, 0], [0, 8], [-16, 0]], P.chao_l);
  poli(c, [[0, -7], [14, 0], [0, 7], [-14, 0]], cor);
  px(c, -6 + v * 3, -1 + v, 1, 1, P.chao_l); px(c, 5 - v * 2, 2, 1, 1, P.chao_l); px(c, 2, -3 - v, 1, 1, P.chao_l);
}
def('chao_a', 'chao', 32, 16, 16, 8, (c) => ladrilho(c, P.chao_a, 0), { contorno: false });
def('chao_b', 'chao', 32, 16, 16, 8, (c) => ladrilho(c, P.chao_b, 1), { contorno: false });

// Parede da direita da tela (ao longo de gx, em gy=0). Âncora = início da base.
def('parede_dir', 'parede', 18, PAREDE_ALTA + 12, 0, PAREDE_ALTA + 2, (c) => {
  const H = PAREDE_ALTA;
  poli(c, [[0, 0], [16, 8], [16, 8 - H], [0, -H]], P.parede_d);
  for (let r = 0, f = 0; r < H; r += 6, f++) {
    reta(c, 0, -r, 15, 7 - r, P.junta_d);
    for (let x = (f % 2) * 8 + 4; x < 16; x += 8) px(c, x, Math.floor(x / 2) - r - 5, 1, 5, P.junta_d);
  }
}, { contorno: false });
// Parede da esquerda da tela (ao longo de gy, em gx=0). Âncora = início da base (canto de cima).
def('parede_esq', 'parede', 18, PAREDE_ALTA + 12, 16, PAREDE_ALTA + 2, (c) => {
  const H = PAREDE_ALTA;
  poli(c, [[0, 0], [-16, 8], [-16, 8 - H], [0, -H]], P.parede_e);
  for (let r = 0, f = 0; r < H; r += 6, f++) {
    reta(c, -1, -r, -16, 7 - r, P.junta_e);
    for (let x = (f % 2) * 8 + 4; x < 16; x += 8) px(c, -x - 1, Math.floor(x / 2) - r - 5, 1, 5, P.junta_e);
  }
}, { contorno: false });
def('janela', 'parede', 22, 24, 3, 3, (c) => {
  faixaD(c, 0, 0, 16, 14, P.madeira_e);
  faixaD(c, 2, 1, 12, 10, P.janela_ceu);
  faixaD(c, 2, 1, 12, 3, P.vidro);
  faixaD(c, 7, 0, 2, 14, P.madeira_e);
  faixaD(c, 0, 6, 16, 2, P.madeira_e);
});
// Porta no alto da escada, na parede da esquerda.
def('porta', 'parede', 22, 40, 19, 3, (c) => {
  faixaE(c, -16, 0, 16, 28, P.madeira_e);
  faixaE(c, -14, 2, 12, 25, P.porta);
  faixaE(c, -14, 2, 12, 3, P.luz);
});

defCaixa('escada', 'movel', 2, 1.2, 22, (c) => {
  const m = matMadeira();
  for (let i = 4; i >= 0; i--) caixa(c, R((0.8 - i * 0.4) * 16), R((0.8 - i * 0.4) * 8), 0.4, 1.2, 4 * (i + 1), m);
});
defCaixa('mesa', 'movel', 3, 1, 14, (c) => {
  const k = caixa(c, 0, 0, 3, 1, 12, matMadeira());
  painelEsq(c, k, 0.28, 0.72, 0, 0.8, P.madeira_e);
  painelEsq(c, k, 0.76, 0.97, 0.08, 0.8, P.madeira);
  const p = ponto(k, 'D', 'C', 0.86, 0.5); px(c, p[0], p[1], 3, 1, P.metal_c);
  painelEsq(c, k, 0.03, 0.24, 0.08, 0.8, P.madeira);
});

function monitor(c, tipo) {
  caixa(c, 0, 0, 0.2, 0.12, 3, matMetal());
  const k = caixa(c, 0, 0, 0.92, 0.12, 12, mat(P.metal_c, P.metal_e, P.metal_e), 3);
  painelEsq(c, k, 0.07, 0.93, 0.1, 0.92, P.tela_f);
  const n = (t0, t1, s0, s1, cor) => painelEsq(c, k, t0, t1, s0, s1, cor);
  if (tipo === 'grafico') {
    [0.28, 0.42, 0.38, 0.62, 0.55, 0.78, 0.86].forEach((s, i) =>
      n(0.1 + i * 0.115, 0.17 + i * 0.115, 0.14, 0.14 + s * 0.7, i % 3 === 1 ? P.tela_r : P.tela_v));
  } else if (tipo === 'comunidade') {
    [0.78, 0.62, 0.46, 0.3].forEach((s, i) => n(0.12 + (i % 2) * 0.1, 0.5 + (i % 3) * 0.18, s - 0.08, s, i % 2 ? P.tela_c : P.tela_a));
  } else {
    n(0.12, 0.88, 0.62, 0.84, P.tela_a); n(0.12, 0.5, 0.2, 0.52, P.hype); n(0.56, 0.88, 0.2, 0.52, P.tela_v);
  }
}
defCaixa('monitor_grafico', 'movel', 0.92, 0.12, 17, (c) => monitor(c, 'grafico'));
defCaixa('monitor_comunidade', 'movel', 0.92, 0.12, 17, (c) => monitor(c, 'comunidade'));
defCaixa('monitor_projeto', 'movel', 0.92, 0.12, 17, (c) => monitor(c, 'projeto'));
defCaixa('celular', 'movel', 0.4, 0.26, 3, (c) => {
  const k = caixa(c, 0, 0, 0.4, 0.26, 1, mat(P.tela_c, P.metal_e, P.contorno));
  painelEsq(c, k, 0.12, 0.88, 0.1, 0.9, P.tela_a);
});
defCaixa('cadeira', 'movel', 0.9, 0.9, 20, (c) => {
  caixa(c, 0, 0, 0.25, 0.25, 6, matMetal());
  caixa(c, 0, 0, 0.9, 0.9, 3, matMetal(), 6);
  caixa(c, -6, 3, 0.9, 0.15, 8, matMetal(), 9);
});

// ---------- luxos ----------
defCaixa('aquario', 'luxo', 1.2, 2, 26, (c) => {
  caixa(c, 0, 0, 1.2, 2, 8, matMadeira());
  const k = caixa(c, 0, 0, 1.1, 1.9, 14, mat(P.vidro, P.agua, P.metal_e), 8);
  painelEsq(c, k, 0.06, 0.94, 0.08, 0.9, P.agua);
  painelDir(c, k, 0.06, 0.94, 0.08, 0.9, P.metal_e);
  const f = (t, s, cor = P.peixe) => { const p = ponto(k, 'D', 'C', t, s); px(c, p[0], p[1], 3, 2, cor); px(c, p[0] - 1, p[1] + 1, 1, 1, cor); };
  f(0.3, 0.55); f(0.65, 0.35, P.hype); f(0.5, 0.75);
  const p = ponto(k, 'D', 'C', 0.85, 0.08); px(c, p[0], p[1] - 5, 1, 5, P.planta); px(c, p[0] + 1, p[1] - 3, 1, 3, P.planta);
});
defCaixa('cadeira_gamer', 'luxo', 1, 1, 30, (c) => {
  caixa(c, 0, 0, 0.3, 0.3, 6, mat(P.metal_c, P.metal, P.gamer_e));
  caixa(c, 0, 0, 0.9, 0.9, 3, mat(P.gamer, P.gamer, P.gamer_e), 6);
  const k = caixa(c, -8, -4, 0.2, 0.9, 20, mat(P.gamer, P.gamer, P.gamer_e), 9);
  painelDir(c, k, 0.1, 0.9, 0.6, 0.72, P.hype);
});
defCaixa('maquina_bebida', 'luxo', 1, 1, 36, (c) => {
  const k = caixa(c, 0, 0, 0.9, 0.9, 34, mat(P.lata_a, P.lata_b, P.metal_e));
  painelEsq(c, k, 0.1, 0.9, 0.34, 0.92, P.tela_f);
  [0.8, 0.62, 0.44].forEach((s, i) => [0, 1, 2].forEach((j) => {
    const p = ponto(k, 'D', 'C', 0.2 + j * 0.25, s);
    px(c, p[0], p[1], 3, 4, [P.lata_a, P.lata_c, P.lata_b][(i + j) % 3]);
  }));
  painelEsq(c, k, 0.3, 0.7, 0.08, 0.2, P.metal_e);
});
defCaixa('sofa', 'luxo', 2, 1.2, 20, (c) => {
  const m = mat(P.sofa_c, P.sofa, P.sofa_e);
  caixa(c, 3, -2, 2, 0.3, 14, m);
  caixa(c, 0, 0, 1.6, 1.1, 7, m);
  caixa(c, -14, -7, 0.2, 1.2, 11, m);
  caixa(c, 14, 7, 0.2, 1.2, 11, m);
});
// Na parede da direita (desce para a direita). Brilho fixo: nada pisca.
def('ar_condicionado', 'luxo', 22, 26, 3, 3, (c) => {
  faixaD(c, 0, 0, 16, 10, P.metal_e);
  faixaD(c, 1, 1, 14, 8, P.metal_c);
  for (const y of [4, 6]) faixaD(c, 2, y, 9, 1, P.metal_e);
  faixaD(c, 12, 2, 2, 2, P.tela_v);
});
// Na parede da esquerda (sobe para a direita). Letras de neon com brilho fixo.
def('letreiro_neon', 'luxo', 22, 26, 19, 3, (c) => {
  faixaE(c, -16, 0, 16, 11, P.contorno);
  faixaE(c, -15, 1, 14, 9, P.tela_f);
  faixaE(c, -14, 3, 3, 5, P.tela_r); faixaE(c, -10, 3, 3, 5, P.hype); faixaE(c, -6, 3, 3, 5, P.tela_c);
  faixaE(c, -14, 2, 12, 1, P.tela_r); faixaE(c, -14, 8, 12, 1, P.tela_c);
});
// Monitor curvo extra na mesa.
defCaixa('tela_curva', 'luxo', 0.92, 0.12, 20, (c) => {
  caixa(c, 0, 0, 0.2, 0.12, 3, matMetal());
  const k = caixa(c, 0, 0, 0.92, 0.12, 15, mat(P.metal_c, P.metal_e, P.metal_e), 3);
  painelEsq(c, k, 0.05, 0.95, 0.1, 0.92, P.tela_f);
  painelEsq(c, k, 0.1, 0.9, 0.6, 0.84, P.tela_a);
  painelEsq(c, k, 0.1, 0.4, 0.2, 0.52, P.tela_r); painelEsq(c, k, 0.46, 0.9, 0.2, 0.52, P.tela_v);
  painelEsq(c, k, 0.05, 0.12, 0.1, 0.92, P.metal_c); painelEsq(c, k, 0.88, 0.95, 0.1, 0.92, P.metal_c);
});
defCaixa('garagem', 'luxo', 3, 2.6, 18, (c) => {
  const piso = caixa(c, 0, 0, 3, 2.6, 1, mat(P.metal, P.metal_e, P.contorno));
  for (let i = 0; i < 4; i++) px(c, -36 + i * 9, 4 + i * 4, 6, 1, P.hype);
  const body = caixa(c, 0, 0, 2.2, 1.1, 5, mat(P.carro_c, P.carro, P.carro_e), 2);
  caixa(c, -2, -1, 1.1, 0.9, 5, mat(P.carro_c, P.vidro, P.carro_e), 7);
  painelEsq(c, body, 0.05, 0.2, 0.2, 0.7, P.farol);
  for (const t of [0.15, 0.8]) { const p = ponto(body, 'D', 'C', t, 0); px(c, p[0] - 2, p[1] - 1, 5, 4, P.roda); }
  void piso;
});

// ---------- gente ----------
function gente(c, cor) {
  px(c, -2, -3, 2, 3, P.contorno); px(c, 1, -3, 2, 3, P.contorno);
  px(c, -3, -10, 7, 7, cor); px(c, -4, -9, 1, 4, cor); px(c, 4, -9, 1, 4, cor);
  px(c, -2, -15, 5, 5, P.pele); px(c, -2, -16, 5, 2, P.cabelo);
}
def('trouxa_1', 'gente', 14, 22, 7, 20, (c) => gente(c, P.trouxa_1));
def('trouxa_2', 'gente', 14, 22, 7, 20, (c) => gente(c, P.trouxa_2));
def('trouxa_3', 'gente', 14, 22, 7, 20, (c) => gente(c, P.trouxa_3));
def('trouxa_4', 'gente', 14, 22, 7, 20, (c) => gente(c, P.trouxa_1));
function rugrigo(c, quadro) {
  px(c, -4, -19, 8, 11, P.moletom); px(c, -4, -19, 8, 1, P.moletom_e); px(c, -4, -9, 8, 1, P.moletom_e);
  px(c, -3, -28, 7, 9, P.pele); px(c, -3, -29, 7, 4, P.cabelo); px(c, -4, -27, 1, 5, P.cabelo);
  px(c, -4, -26, 1, 3, P.metal_e); px(c, 4, -26, 1, 3, P.metal_e); px(c, -3, -29, 7, 1, P.metal_e);
  px(c, 3, -17, 2, 2, P.moletom); px(c, 5, quadro ? -19 : -21, 3, 2, P.moletom);
  px(c, 8, quadro ? -20 : -22, 2, 2, P.pele);
  px(c, -4, -9, 3, 2, P.contorno); px(c, 1, -9, 3, 2, P.contorno);
}
def('rugrigo_a', 'gente', 22, 36, 9, 33, (c) => rugrigo(c, 0));
def('rugrigo_b', 'gente', 22, 36, 9, 33, (c) => rugrigo(c, 1));
def('rugrigo_rindo', 'gente', 22, 36, 9, 33, (c) => rugrigo(c, 0));
def('rugrigo_batida', 'gente', 22, 36, 9, 33, (c) => rugrigo(c, 1));

// ---------- efeitos e interface ----------
def('bolinha_hype', 'efeito', 6, 6, 3, 3, (c) => { px(c, -1, -2, 3, 5, P.hype); px(c, -2, -1, 5, 3, P.hype); px(c, -1, -1, 1, 1, P.luz); }, { contorno: false });
def('bolinha_codigo', 'efeito', 6, 6, 3, 3, (c) => { px(c, -1, -2, 3, 5, P.codigo); px(c, -2, -1, 5, 3, P.codigo); px(c, -1, -1, 1, 1, P.luz); }, { contorno: false });
def('celular_brilho', 'efeito', 18, 12, 9, 6, (c) => {
  poli(c, [[0, -5], [8, 0], [0, 5], [-8, 0]], P.hype); poli(c, [[0, -3], [5, 0], [0, 3], [-5, 0]], P.luz);
}, { contorno: false });
for (const [nome, [w, d]] of Object.entries(LUXOS_PEGADA)) {
  const W = Math.ceil((w + d) * 16 + 6), H = Math.ceil((w + d) * 8 + 6);
  def('lugar_' + nome, 'interface', W, H, Math.round(W / 2), Math.round(H / 2), (c) => {
    const A = [R((d - w) * 8), -R((w + d) * 4)], B = [R((w + d) * 8), R((w - d) * 4)];
    const C = [R((w - d) * 8), R((w + d) * 4)], D = [-R((w + d) * 8), R((d - w) * 4)];
    for (const [p, q] of [[A, B], [B, C], [D, C], [D, A]]) reta(c, p[0], p[1], q[0], q[1], P.lugar, 3);
    px(c, -1, -2, 3, 1, P.lugar); px(c, 1, -1, 1, 1, P.lugar); px(c, 0, 0, 1, 1, P.lugar); px(c, 0, 2, 1, 1, P.lugar);
  }, { contorno: false });
}

// ---------- abertura (formas provisórias; o PNG do artista entra no lugar pelo indice.json) ----------
// casa_vo_noite: fundo do título (casa da vó à noite, janelinha do porão acesa). Opaco, sem contorno.
def('casa_vo_noite', 'interface', 240, 160, 0, 0, (c) => {
  px(c, 0, 0, 240, 160, P.tela_f);
  px(c, 0, 0, 240, 40, P.contorno);
  [[14, 8], [40, 22], [70, 6], [96, 30], [132, 12], [170, 26], [204, 9], [226, 34], [58, 44], [150, 46], [190, 52]].forEach(([x, y]) => px(c, x, y, 1, 1, P.lugar));
  px(c, 192, 14, 12, 12, P.lugar); px(c, 189, 17, 3, 6, P.lugar); px(c, 204, 17, 3, 6, P.lugar); px(c, 196, 16, 4, 3, P.metal_c);
  px(c, 0, 128, 240, 32, P.chao_l); px(c, 0, 128, 240, 2, P.planta);
  for (let x = 4; x < 240; x += 14) px(c, x, 124, 4, 4, P.planta);
  // casa
  poli(c, [[52, 64], [120, 26], [188, 64]], P.sofa_e);
  poli(c, [[60, 62], [120, 30], [180, 62]], P.sofa);
  px(c, 64, 62, 112, 66, P.parede_e);
  for (let y = 68; y < 128; y += 8) px(c, 64, y, 112, 1, P.junta_e);
  px(c, 148, 34, 10, 18, P.parede_d);
  // janelas de cima (uma acesa, a da vó) e porta
  px(c, 76, 72, 20, 18, P.contorno); px(c, 78, 74, 16, 14, P.janela_ceu); px(c, 85, 74, 2, 14, P.contorno);
  px(c, 144, 72, 20, 18, P.contorno); px(c, 146, 74, 16, 14, P.luz); px(c, 153, 74, 2, 14, P.contorno);
  px(c, 110, 96, 20, 32, P.contorno); px(c, 112, 98, 16, 30, P.porta); px(c, 124, 112, 2, 2, P.hype);
  // janelinha do porão, rente ao chão: é ali que o Rugrigo trabalha
  px(c, 140, 120, 18, 10, P.contorno); px(c, 142, 122, 14, 6, P.tela_a); px(c, 144, 123, 4, 2, P.tela_c);
  px(c, 136, 130, 26, 2, P.tela_a);
}, { contorno: false });
// logo_jogo: plaquinha com o tapete listrado (o nome vai escrito em texto embaixo, com a fonte do jogo).
def('logo_jogo', 'interface', 96, 40, 0, 0, (c) => {
  px(c, 2, 4, 92, 32, P.contorno); px(c, 4, 6, 88, 28, P.hype);
  px(c, 10, 12, 62, 16, P.sofa); for (let x = 12; x < 72; x += 8) px(c, x, 12, 3, 16, P.sofa_c);
  px(c, 10, 28, 62, 2, P.sofa_e);
  px(c, 72, 14, 4, 2, P.lugar); px(c, 72, 18, 4, 2, P.lugar); px(c, 72, 22, 4, 2, P.lugar);
  px(c, 78, 10, 6, 6, P.pele); px(c, 78, 9, 6, 2, P.cabelo); px(c, 77, 16, 8, 10, P.moletom); px(c, 74, 18, 4, 2, P.pele);
}, { contorno: false });
// logo_estudio: marca do estúdio (provisória), um porão visto de lado com uma onda.
def('logo_estudio', 'interface', 48, 48, 0, 0, (c) => {
  px(c, 6, 6, 36, 36, P.contorno); px(c, 8, 8, 32, 32, P.painel_c);
  px(c, 8, 26, 32, 14, P.tela_a); px(c, 8, 26, 32, 2, P.tela_c);
  for (let x = 8; x < 40; x += 8) { px(c, x, 24, 4, 2, P.tela_c); px(c, x + 4, 22, 2, 2, P.tela_c); }
  px(c, 16, 12, 16, 8, P.hype); px(c, 18, 14, 12, 4, P.luz);
});
// retrato_vo: a vó tutora (retrato grande, coque branco e óculos).
def('retrato_vo', 'interface', 48, 48, 0, 0, (c) => {
  px(c, 4, 4, 40, 40, P.janela_ceu);
  px(c, 18, 4, 12, 8, P.lugar); px(c, 12, 10, 24, 10, P.lugar);
  px(c, 14, 16, 20, 18, P.pele); px(c, 12, 18, 2, 10, P.lugar); px(c, 34, 18, 2, 10, P.lugar);
  px(c, 16, 22, 6, 4, P.metal_e); px(c, 26, 22, 6, 4, P.metal_e); px(c, 17, 23, 4, 2, P.vidro); px(c, 27, 23, 4, 2, P.vidro); px(c, 22, 23, 4, 1, P.metal_e);
  px(c, 21, 29, 6, 1, P.moletom_e);
  px(c, 10, 34, 28, 10, P.trouxa_3); px(c, 22, 34, 4, 4, P.lugar);
});
// carregando_rugrigo: tira horizontal de quadros quadrados (quantos quadros = largura / altura).
// O Rugrigo puxa o tapete: a cada quadro o tapete anda para ele e ele inclina mais.
const QUADROS_CARREGANDO = 4;
def('carregando_rugrigo', 'interface', 48 * QUADROS_CARREGANDO, 48, 0, 0, (c) => {
  for (let q = 0; q < QUADROS_CARREGANDO; q++) {
    const o = q * 48, d = q * 3, inc = q % 2;
    px(c, o + 2, 40, 44, 2, P.chao_l);
    px(c, o + 4 + d, 36, 26, 4, P.sofa); for (let x = 6; x < 28; x += 6) px(c, o + x + d, 36, 2, 4, P.sofa_c);
    px(c, o + 30 + d, 37, 6, 2, P.sofa_e);
    const x = o + 34 + inc;
    px(c, x, 20, 8, 11, P.moletom); px(c, x + 1, 11, 7, 9, P.pele); px(c, x + 1, 10, 7, 3, P.cabelo);
    px(c, x + 2, 15, 1, 1, P.contorno); px(c, x - 4 - inc, 24, 5, 2, P.moletom); px(c, x - 6 - inc, 24, 2, 3, P.pele);
    px(c, x, 31, 3, 9, P.contorno); px(c, x + 5 + inc, 31, 3, 9, P.contorno);
  }
}, { tira: true });

/** Fonte de desenho de um sprite (imagem final ou forma provisória) e o tamanho dela. */
export function fonteDe(nome) {
  const s = CATALOGO.get(nome);
  const fonte = s && (s.img || s.canvas);
  return fonte ? { fonte, w: s.w, h: s.h, final: !!s.img } : null;
}
/** Quantos quadros tem uma tira horizontal de quadros quadrados (1 se for imagem comum). */
export function quadrosDe(nome) {
  const f = fonteDe(nome);
  return f && CATALOGO.get(nome).tira ? Math.max(1, Math.round(f.w / f.h)) : 1;
}

// ---------- geração e carregador ----------
function finalizar(canvas, contorno, cor) {
  const c = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  const im = c.getImageData(0, 0, W, H), d = im.data;
  const dentro = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) dentro[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  const t = document.createElement('canvas').getContext('2d');
  t.fillStyle = cor; t.fillRect(0, 0, 1, 1);
  const rgb = t.getImageData(0, 0, 1, 1).data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (dentro[y * W + x]) { d[i + 3] = 255; continue; }
    const viz = contorno && ((x > 0 && dentro[y * W + x - 1]) || (x < W - 1 && dentro[y * W + x + 1])
      || (y > 0 && dentro[(y - 1) * W + x]) || (y < H - 1 && dentro[(y + 1) * W + x]));
    if (viz) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; } else d[i + 3] = 0;
  }
  c.putImageData(im, 0, 0);
}

// Gera as formas provisórias (uma vez só). Chame depois de o CSS carregar.
export function preparar() {
  lerPaleta();
  for (const s of CATALOGO.values()) {
    const cv = document.createElement('canvas'); cv.width = s.w; cv.height = s.h;
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    c.translate(s.ax, s.ay); s.desenhar(c); c.setTransform(1, 0, 0, 1, 0, 0);
    finalizar(cv, s.contorno, P.contorno);
    s.canvas = cv;
  }
}

// Arte das cartas de ideia (carta_<raridade>_<n>): a imagem pode ser grande e de qualquer formato.
// Carrega uma vez e guarda só uma versão reduzida (lado maior 480 px) como endereço de dados.
const ARTE_CARTAS = new Map();
function guardarCarta(nome, img) {
  try {
    const w0 = img.naturalWidth, h0 = img.naturalHeight;
    if (!w0 || !h0) return;
    const k = Math.min(1, 480 / Math.max(w0, h0));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w0 * k)); cv.height = Math.max(1, Math.round(h0 * k));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    ARTE_CARTAS.set(nome, { src: cv.toDataURL('image/png'), w: cv.width, h: cv.height });
  } catch { /* sem arte: a carta fica desenhada */ }
}
// Devolve { src, w, h } da arte da ideia (ex.: "mitico_1") ou null.
export const arteCarta = (ideia) => ARTE_CARTAS.get('carta_' + ideia) || null;

// Procura imagens de arte final. Cada pasta (arte/, ../arte.local/) pode ter um indice.json
// com a lista de nomes (sem .png). Sem indice, nada é pedido e nada falha.
let carregandoArte = null;
/** Uma vez só por página: a abertura e a cena pedem e recebem a mesma promessa. */
export function carregarArte() { return (carregandoArte ??= carregarArteAgora()); }
async function carregarArteAgora() {
  const pastas = [new URL('./arte/', import.meta.url), new URL('../arte.local/', import.meta.url)];
  // sala-âncora (fundo pintado do porão): fica fora do índice; sem ela a cena volta ao chão desenhado
  const sala = new Promise((ok) => {
    const img = new Image();
    img.onload = () => { SALA.img = img; ok(); };
    img.onerror = () => ok();
    img.src = new URL('sala.png', pastas[0]).href;
  });
  for (const pasta of pastas) {
    let nomes = [];
    try {
      const r = await fetch(new URL('indice.json', pasta));
      if (r.ok) { const j = await r.json(); if (Array.isArray(j)) nomes = j; }
    } catch { /* sem arte nesta pasta */ }
    await Promise.all(nomes.filter((n) => typeof n === 'string' && (CATALOGO.has(n) || /^carta_[a-z]+_\d+$/.test(n))).map((n) => new Promise((ok) => {
      const img = new Image();
      img.onload = () => {
        if (CATALOGO.has(n)) usarImagem(CATALOGO.get(n), img); else guardarCarta(n, img);
        ok();
      };
      img.onerror = () => ok();
      img.src = new URL(n + '.png', pasta).href;
    })));
  }
  await sala;
}

// Tamanho e âncora da arte final (arte/porao/objetos/medidas.json): a imagem entra no tamanho dela, nunca esticada.
const MEDIDAS = {
  rugrigo_a: [36, 48, 18, 46], rugrigo_b: [36, 48, 18, 46], rugrigo_rindo: [36, 48, 18, 46], rugrigo_batida: [36, 48, 18, 46],
  trouxa_1: [24, 44, 12, 42], trouxa_2: [24, 44, 12, 42], trouxa_3: [24, 44, 12, 42], trouxa_4: [24, 44, 12, 42],
  cadeira_gamer: [29, 53, 14, 42], ar_condicionado: [24, 26, 3, 3], letreiro_neon: [27, 41, 24, 3],
  maquina_bebida: [39, 59, 19, 48], tela_curva: [29, 33, 14, 26], garagem: [97, 61, 48, 36], aquario: [54, 61, 27, 45],
};
function usarImagem(s, img) {
  s.img = img;
  const m = MEDIDAS[s.nome];
  const W = img.naturalWidth, H = img.naturalHeight;
  if (m) { s.ax = Math.round(m[2] * W / m[0]); s.ay = Math.round(m[3] * H / m[1]); }
  else if (W !== s.w || H !== s.h) { s.ax = Math.round(s.ax * W / s.w); s.ay = Math.round(s.ay * H / s.h); }
  s.w = W; s.h = H;
}
const SALA = { img: null };
/** Imagem da sala-âncora (248×176) ou null. */
export const sala = () => SALA.img;

export const tem = (nome) => CATALOGO.has(nome);
export const listar = () => [...CATALOGO.values()].map(({ nome, camada, w, h, ax, ay }) => ({ nome, camada, w, h, ax, ay }));
// Desenha o sprite com a âncora em (x,y). Devolve o retângulo usado (para clique).
// espelho = vira na horizontal (só gente; móvel de caixa não se espelha: troca o lado escuro).
export function desenhar(ctx, nome, x, y, espelho = false) {
  const s = CATALOGO.get(nome);
  const fonte = s && (s.img || s.canvas);
  if (!fonte) return null;
  const X = Math.round(x - (espelho ? s.w - s.ax : s.ax)), Y = Math.round(y - s.ay);
  if (espelho) {
    ctx.save(); ctx.translate(X + s.w, Y); ctx.scale(-1, 1); ctx.drawImage(fonte, 0, 0, s.w, s.h); ctx.restore();
  } else ctx.drawImage(fonte, X, Y, s.w, s.h);
  return { x: X, y: Y, w: s.w, h: s.h };
}
