"""Trata os brutos do gerador e grava as pecas prontas em arte/reino/pecas/.
Regras: alfa duro (0 ou 255), contorno de 1 px unificado (boneco = ameixa escura; cenario = a propria cor escurecida),
aliado olha para a direita, invasor para a esquerda, pe encostado na base do quadro, roxo so no invasor.
Uso: python3 -B arte/reino/pecas.py"""
import os, sys, colorsys
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
BR = os.path.join(AQUI, 'bruto'); SAI = os.path.join(AQUI, 'pecas')
AMEIXA = (43, 30, 58)


def abrir(n):
    a = np.array(Image.open(os.path.join(BR, n + '.png')).convert('RGBA')).astype(np.int32)
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)
    a[a[..., 3] == 0] = 0
    return a


def aparar(a, margem=1):
    ys, xs = np.nonzero(a[..., 3])
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return np.pad(a, ((margem, 0), (margem, margem), (0, 0)))  # sem margem embaixo: o pe fica na base


def vizinho_vazio(al):
    p = np.pad(al, 1)
    return (p[:-2, 1:-1] == 0) | (p[2:, 1:-1] == 0) | (p[1:-1, :-2] == 0) | (p[1:-1, 2:] == 0)


def contorno_boneco(a):
    """Borda escura vira ameixa; onde a borda nao e escura, nasce 1 px de ameixa por fora."""
    a = np.pad(a, ((1, 1), (1, 1), (0, 0)))
    al = a[..., 3] > 0
    borda = al & vizinho_vazio(al)
    escuro = a[..., :3].max(axis=2) < 60
    a[borda & escuro, :3] = AMEIXA
    clara = borda & ~escuro
    p = np.pad(clara, 1)
    perto = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    novo = perto & ~al
    a[novo, :3] = AMEIXA; a[novo, 3] = 255
    # tira linhas/colunas vazias que sobraram, menos a base
    ys, xs = np.nonzero(a[..., 3])
    return a[max(ys.min() - 1, 0):ys.max() + 1, max(xs.min() - 1, 0):xs.max() + 2]


def contorno_cenario(a, forca=0.42):
    """1 px por fora com a cor do vizinho escurecida e puxada para a ameixa (contorno colorido)."""
    a = np.pad(a, ((1, 1), (1, 1), (0, 0)))
    al = a[..., 3] > 0
    soma = np.zeros(a.shape[:2] + (3,)); n = np.zeros(a.shape[:2])
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        s = np.roll(a, (dy, dx), axis=(0, 1)); m = s[..., 3] > 0
        soma += s[..., :3] * m[..., None]; n += m
    novo = (~al) & (n > 0)
    cor = soma[novo] / n[novo][:, None]
    a[novo, :3] = (cor * forca * 0.6 + np.array(AMEIXA) * 0.4).astype(np.int32); a[novo, 3] = 255
    ys, xs = np.nonzero(a[..., 3])
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def girar_matiz(a, de, ate, alvo, sat=1.0, val=1.0):
    """Pixels com matiz entre de..ate (graus) passam para 'alvo'. Usado para tirar o roxo (cor do invasor) do reino."""
    o = a.copy()
    for y, x in zip(*np.nonzero(a[..., 3])):
        r, g, b = a[y, x, :3] / 255.0
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        if de <= h * 360 <= ate and s > 0.18:
            o[y, x, :3] = [int(c * 255) for c in colorsys.hsv_to_rgb(alvo / 360.0, min(1, s * sat), min(1, v * val))]
    return o


def clarear(a, ganho, piso=60):
    """Clareia o que nao e contorno (o invasor veio escuro demais para ler no chao)."""
    o = a.copy(); m = (a[..., 3] > 0) & (a[..., :3].max(axis=2) >= piso)
    o[m, :3] = np.clip(a[m, :3] * ganho + 6, 0, 255)
    return o


def salvar(a, n):
    os.makedirs(SAI, exist_ok=True)
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(SAI, n + '.png'), optimize=True)
    print(f'{n}: {a.shape[1]}x{a.shape[0]}')


def boneco(fonte, nome, espelhar=False, clar=None, tirar_sombra=False):
    a = abrir(fonte)
    if tirar_sombra:  # sombra cinza assada no chao: sombra e do codigo
        mx = a[..., :3].max(axis=2); cinza = ((mx - a[..., :3].min(axis=2)) < 46) & (mx > 70)
        ys = np.nonzero(a[..., 3].any(axis=1))[0]; linhas = np.arange(a.shape[0])[:, None] >= ys.max() - 2
        a[cinza & linhas] = 0
    if espelhar: a = a[:, ::-1]
    if clar: a = clarear(a, clar)
    salvar(contorno_boneco(aparar(a, 0)), nome)


if __name__ == '__main__':
    # aliados (olham para a direita)
    for f, n in (('lanceiro-1', 'lanceiro'), ('lanceiro-passo-1', 'lanceiro-passo'), ('lanceiro-golpe-1', 'lanceiro-golpe'),
                 ('lanceiro-apanhou-1', 'lanceiro-apanhou'), ('arqueiro-b-1', 'arqueiro'), ('arqueiro-tiro-1', 'arqueiro-tiro'),
                 ('cavaleiro-b-1', 'cavaleiro'), ('mago-1', 'mago')):
        if os.path.exists(os.path.join(BR, f + '.png')): boneco(f, n)
    # invasores (olham para a esquerda)
    boneco('invasor-b-1', 'invasor', clar=1.85)
    if os.path.exists(os.path.join(BR, 'invasor-golpe-1.png')): boneco('invasor-golpe-1', 'invasor-golpe', clar=1.85)
    boneco('invasor-bruto-1', 'bruto', tirar_sombra=True)
    boneco('chefe-1', 'chefe')
    # reino
    salvar(contorno_cenario(aparar(abrir('castelo-1'), 0)), 'castelo')
    salvar(contorno_cenario(aparar(girar_matiz(abrir('portao-1'), 235, 330, 214, 0.9, 1.05), 0)), 'portao')
    salvar(contorno_cenario(aparar(abrir('quartel-1'), 0)), 'quartel')
    salvar(contorno_cenario(aparar(abrir('moinho-1'), 0)), 'moinho')
    salvar(contorno_cenario(aparar(girar_matiz(abrir('torre-mago-1'), 250, 330, 226, 0.8, 1.1), 0)), 'torre-mago')
    for f, n in (('ferraria-1', 'ferraria'), ('tenda-1', 'tenda')):
        if os.path.exists(os.path.join(BR, f + '.png')): salvar(contorno_cenario(aparar(abrir(f), 0)), n)
    # planos de fundo: so alfa duro; a cor e regravada na cena (perspectiva do ar)
    salvar(abrir('plano-longe-1'), 'plano-longe')
    m = abrir('plano-meio-1')
    mx = m[..., :3].max(axis=2); mn = m[..., :3].min(axis=2)
    palido = (mx > 185) & ((mx - mn) < 0.42 * mx) & (np.arange(m.shape[0])[:, None] < 70)  # formas palidas soltas no ceu
    m[palido] = 0
    salvar(m, 'plano-meio')
