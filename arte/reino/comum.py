"""Ferramentas comuns da arte do piloto (R9): limpar bruto, operar quadros (deslocar, amassar, inclinar, girar, pontilhar),
trocar cores e desenhar em pixel. Tudo em numpy/PIL, sem suavizar nunca."""
import os, sys, colorsys
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
BR = os.path.join(AQUI, 'bruto')
AMEIXA = (43, 30, 58); CREME = (255, 246, 224); OURO = (255, 210, 72)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 + 1 / 32.0
GRAMA = [(124, 201, 80), (86, 168, 66), (58, 128, 60), (40, 92, 58)]
TERRA = [(232, 196, 138), (205, 160, 104), (160, 114, 76), (112, 76, 62)]
PEDRA = [(206, 202, 216), (158, 152, 180), (110, 102, 142), (72, 62, 100)]
MADEIRA = [(196, 140, 84), (150, 98, 60), (104, 64, 48)]
# cor das 4 familias (biblia: Pikewall azul, Thornbow verde, Potluck laranja, Fizzwick roxo) - claro, meio, escuro
FAMILIA = {'Pikewall': [(104, 160, 248), (62, 110, 214), (40, 66, 150)], 'Thornbow': [(120, 200, 92), (70, 156, 72), (40, 104, 64)],
           'Potluck': [(250, 170, 80), (232, 126, 46), (168, 78, 36)], 'Fizzwick': [(214, 150, 250), (170, 92, 224), (108, 52, 160)]}
INVASOR = [(190, 130, 240), (146, 72, 200), (86, 40, 130)]; LIMA = (182, 240, 60)
RARIDADE = {'Common': [(196, 140, 84), (150, 98, 60), (104, 64, 48)], 'Uncommon': [(236, 168, 110), (192, 112, 72), (124, 66, 52)],
            'Rare': [(236, 240, 248), (176, 186, 210), (108, 116, 150)], 'Epic': [(150, 236, 226), (70, 180, 190), (40, 104, 130)],
            'Legendary': [(255, 240, 150), (244, 190, 60), (176, 112, 36)]}


def hexa(c): return '#%02X%02X%02X' % tuple(c[:3])
def mix(a, b, t): return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


# ---------------------------------------------------------------- bruto -> limpo
def abrir(nome):
    a = np.array(Image.open(os.path.join(BR, nome + '.png')).convert('RGBA')).astype(np.int32)
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0); a[a[..., 3] == 0] = 0
    return a


def tirar_ilhas(a, minimo=6):
    """Apaga grupos soltos de menos de 'minimo' pixels (sujeira do gerador)."""
    al = a[..., 3] > 0; H, W = al.shape; visto = np.zeros_like(al)
    for y in range(H):
        for x in range(W):
            if al[y, x] and not visto[y, x]:
                pilha = [(y, x)]; grupo = []; visto[y, x] = True
                while pilha:
                    cy, cx = pilha.pop(); grupo.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < H and 0 <= nx < W and al[ny, nx] and not visto[ny, nx]: visto[ny, nx] = True; pilha.append((ny, nx))
                if len(grupo) < minimo:
                    for (cy, cx) in grupo: a[cy, cx] = 0
    return a


def tirar_sombra(a):
    mx = a[..., :3].max(axis=2); cinza = ((mx - a[..., :3].min(axis=2)) < 46) & (mx > 70)
    ys = np.nonzero(a[..., 3].any(axis=1))[0]; linhas = np.arange(a.shape[0])[:, None] >= ys.max() - 2
    a[cinza & linhas] = 0
    return a


def contorno(a, cor=AMEIXA, limite=64):
    """Borda escura vira ameixa; onde a borda nao e escura nasce 1 px de ameixa por fora. Mantem o tamanho (+1 de folga)."""
    a = np.pad(a, ((1, 1), (1, 1), (0, 0)))
    al = a[..., 3] > 0; p = np.pad(al, 1)
    fora = ~p[:-2, 1:-1] | ~p[2:, 1:-1] | ~p[1:-1, :-2] | ~p[1:-1, 2:]
    borda = al & fora; escuro = a[..., :3].max(axis=2) < limite
    a[borda & escuro, :3] = cor
    clara = borda & ~escuro; p = np.pad(clara, 1)
    perto = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    novo = perto & ~al
    a[novo, :3] = cor; a[novo, 3] = 255
    return a


def clarear(a, ganho, piso=60, soma=6):
    o = a.copy(); m = (a[..., 3] > 0) & (a[..., :3].max(axis=2) >= piso)
    o[m, :3] = np.clip(a[m, :3] * ganho + soma, 0, 255)
    return o


def hsv_mapa(a, fn, mascara=None):
    """fn(h em graus, s, v, y, x) -> (h, s, v) novo ou None. Usado para trocar matiz e variar rosto/capacete."""
    o = a.copy()
    for y, x in zip(*np.nonzero(a[..., 3])):
        if mascara is not None and not mascara[y, x]: continue
        r, g, b = a[y, x, :3] / 255.0
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        n = fn(h * 360, s, v, y, x)
        if n: o[y, x, :3] = [int(round(c * 255)) for c in colorsys.hsv_to_rgb((n[0] % 360) / 360.0, min(1, max(0, n[1])), min(1, max(0, n[2])))]
    return o


# ---------------------------------------------------------------- quadros (numpy RGBA do tamanho da celula)
def celula(w, h): return np.zeros((h, w, 4), np.int32)


def colar(dst, src, x, y):
    """Cola src (numpy RGBA) em dst na posicao (x, y), por cima, cortando o que sai."""
    H, W = dst.shape[:2]; h, w = src.shape[:2]
    x0, y0 = max(x, 0), max(y, 0); x1, y1 = min(x + w, W), min(y + h, H)
    if x1 <= x0 or y1 <= y0: return dst
    s = src[y0 - y:y1 - y, x0 - x:x1 - x]; m = s[..., 3] > 0
    dst[y0:y1, x0:x1][m] = s[m]
    return dst


def caixa(a):
    ys, xs = np.nonzero(a[..., 3])
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1) if len(xs) else None


def mover(a, dx=0, dy=0):
    o = np.zeros_like(a); colar(o, a, dx, dy); return o


def amassar(a, n=1, onde=0.55):
    """Tira n linhas do corpo (na altura 'onde' da caixa) e desce o que esta acima: o pe nao sai do chao."""
    o = a.copy()
    for i in range(n):
        b = caixa(o)
        if not b: return o
        y = int(b[1] + (b[3] - b[1]) * onde) + i
        o[1:y + 1] = o[0:y].copy(); o[0] = 0
    return o


def esticar(a, n=1, onde=0.55):
    o = a.copy()
    for i in range(n):
        b = caixa(o)
        if not b: return o
        y = int(b[1] + (b[3] - b[1]) * onde)
        o[0:y] = o[1:y + 1].copy()
    return o


def inclinar(a, k):
    """Desloca cada linha na horizontal: k px no topo da caixa, 0 no pe (k>0 = para a direita)."""
    b = caixa(a)
    if not b: return a
    o = np.zeros_like(a); alt = max(1, b[3] - b[1] - 1)
    for y in range(b[1], b[3]):
        d = int(round(k * (b[3] - 1 - y) / alt))
        linha = np.zeros_like(a[y]); W = a.shape[1]
        if d >= 0: linha[d:] = a[y, :W - d] if d else a[y]
        else: linha[:W + d] = a[y, -d:]
        o[y] = linha
    return o


def branco(a, cor=(255, 252, 236)):
    o = a.copy(); m = (a[..., 3] > 0) & (a[..., :3].max(axis=2) > 62); o[m, :3] = cor; return o


def deitar(a, ax, chao, sentido=1):
    """Gira 90 graus (cai de costas) e apoia no chao; sentido=1 aliado cai para a esquerda, -1 invasor cai para a direita."""
    b = caixa(a); s = a[b[1]:b[3], b[0]:b[2]]
    r = np.rot90(s, 1 if sentido > 0 else -1)
    o = np.zeros_like(a)
    x = ax - r.shape[1] // 2 - 3 * sentido
    x = min(max(x, 0), a.shape[1] - r.shape[1])
    colar(o, r, x, chao - r.shape[0])
    return o


def pontilhar(a, quanto):
    """Some em pontilhado (matriz de Bayer): quanto 0..1."""
    o = a.copy(); yy, xx = np.indices(a.shape[:2])
    o[BAYER[yy % 4, xx % 4] < quanto] = 0
    return o


def espelhar(a): return a[:, ::-1].copy()


def para_img(a): return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
def de_img(im): return np.array(im.convert('RGBA')).astype(np.int32)


# ---------------------------------------------------------------- desenho em pixel
def tela(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def bitmap(linhas, cores):
    im = tela(len(linhas[0]), len(linhas)); px = im.load()
    for y, l in enumerate(linhas):
        for x, c in enumerate(l):
            if c in cores: px[x, y] = tuple(cores[c]) + (255,)
    return im


def contornar(im, cor=AMEIXA, diag=False):
    a = np.array(im); a = np.pad(a, ((1, 1), (1, 1), (0, 0)))
    al = a[..., 3] > 0; p = np.pad(al, 1)
    perto = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    if diag: perto |= p[:-2, :-2] | p[:-2, 2:] | p[2:, :-2] | p[2:, 2:]
    novo = perto & ~al
    a[novo, :3] = cor[:3]; a[novo, 3] = 255
    return Image.fromarray(a, 'RGBA')


def ampliar(im, n): return im.resize((im.width * n, im.height * n), Image.NEAREST)
