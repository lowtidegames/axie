"""Chao DESENHADO do Keepmile (R11), 100% por codigo, sem ruido: grama em tufos e manchas, estrada de terra batida com
sulcos de roda, pedrinhas e pegadas, muro de arrimo em fiadas, escada de tabuas, e as pecas do primeiro plano
(arvore de livro de historias, moita, pedra, cerca, flores, marco de milha). Tudo em degraus de cor, luz de cima-esquerda."""
import math, random, sys
sys.dont_write_bytecode = True
from PIL import Image, ImageDraw
from comum import *

FLOR = [(255, 250, 230), (255, 214, 80), (250, 150, 170), (170, 200, 255)]
FOLHA = [(140, 214, 92), (86, 168, 66), (52, 124, 62), (34, 84, 58)]
TRONCO = [(170, 116, 72), (124, 80, 54), (84, 52, 44)]


def _p(d, x, y, c): d.point((x, y), tuple(c) + (255,))
def _r(d, x0, y0, x1, y1, c):
    if x1 >= x0 and y1 >= y0: d.rectangle((x0, y0, x1, y1), fill=tuple(c) + (255,))


def tufo(d, x, y, tipo=0):
    """Tufo de capim de 5x4 com a base em (x, y): 3 laminas, a do meio mais alta e clara."""
    if tipo == 0:
        _r(d, x, y - 2, x, y, GRAMA[2]); _r(d, x + 2, y - 3, x + 2, y, GRAMA[2]); _r(d, x + 4, y - 1, x + 4, y, GRAMA[2])
        _p(d, x + 1, y - 3, GRAMA[0]); _p(d, x + 3, y - 4, GRAMA[0]); _p(d, x + 5, y - 2, GRAMA[0]); _p(d, x + 1, y, GRAMA[3]); _p(d, x + 3, y, GRAMA[3])
    elif tipo == 1:
        _r(d, x, y - 1, x, y, GRAMA[2]); _r(d, x + 2, y - 2, x + 2, y, GRAMA[2]); _p(d, x + 1, y - 2, GRAMA[0]); _p(d, x + 3, y - 3, GRAMA[0])
    else:
        _p(d, x, y, GRAMA[2]); _p(d, x + 1, y - 1, GRAMA[0]); _p(d, x + 2, y, GRAMA[2])


def flor(d, x, y, cor, alta=True):
    if alta: _r(d, x, y - 2, x, y, GRAMA[2])
    yy = y - (3 if alta else 0)
    _p(d, x, yy, cor); _p(d, x - 1, yy, mix(cor, (255, 255, 255), 0.4)); _p(d, x + 1, yy, cor); _p(d, x, yy - 1, cor); _p(d, x, yy + 0, (255, 236, 150) if cor != FLOR[1] else (250, 150, 60))


def grama(im, x0, y0, x1, y1, rnd, sombra_topo=0, flores=True, luz_topo=False):
    """Gramado: fundo liso, manchas claras em losango (sol), faixas escuras, tufos numa grade com jeito e flores em grupo."""
    d = ImageDraw.Draw(im); _r(d, x0, y0, x1, y1, GRAMA[1])
    W = x1 - x0 + 1; H = y1 - y0 + 1
    for gy in range(y0 + 3, y1 - 2, 11):                     # manchas de sol: losangos achatados de 2 tons
        for gx in range(x0 - 8 + ((gy // 11) % 2) * 17, x1, 34):
            cx = gx + rnd.randrange(-6, 7); cy = gy + rnd.randrange(-2, 3); w = rnd.randrange(7, 15)
            for k in range(-2, 3):
                ww = w - abs(k) * 3
                if ww > 0 and y0 <= cy + k <= y1: _r(d, max(x0, cx - ww), cy + k, min(x1, cx + ww), cy + k, mix(GRAMA[1], GRAMA[0], 0.45))
            if y0 <= cy - 1 <= y1: _r(d, max(x0, cx - w // 2), cy - 1, min(x1, cx + w // 3), cy - 1, mix(GRAMA[1], GRAMA[0], 0.8))
    for gy in range(y0 + 8, y1 - 1, 13):                     # sombras curtas de relevo
        for gx in range(x0 + 6 + ((gy // 13) % 2) * 21, x1 - 4, 43):
            cx = gx + rnd.randrange(-8, 9); w = rnd.randrange(5, 11)
            _r(d, max(x0, cx - w), gy, min(x1, cx + w), gy, mix(GRAMA[1], GRAMA[2], 0.6)); _r(d, max(x0, cx - w + 2), gy + 1, min(x1, cx + w - 3), gy + 1, mix(GRAMA[1], GRAMA[2], 0.6))
    if sombra_topo:
        _r(d, x0, y0, x1, y0 + sombra_topo - 1, GRAMA[2])
        for x in range(x0, x1 + 1):
            if (x // 2) % 2 == 0: _p(d, x, y0 + sombra_topo, GRAMA[2])
    if luz_topo: _r(d, x0, y0, x1, y0, GRAMA[0])
    for gy in range(y0 + 5 + sombra_topo, y1, 7):            # tufos em grade deslocada (nao e ruido: tem ritmo)
        for gx in range(x0 + 3 + ((gy // 7) % 3) * 6, x1 - 6, 19):
            if rnd.random() < 0.72: tufo(d, gx + rnd.randrange(-3, 4), min(y1, gy + rnd.randrange(-1, 2)), rnd.choice((0, 1, 1, 2)))
    if flores:
        for _ in range(max(1, W * H // 1500)):               # flores em grupos de 3
            cx, cy = rnd.randrange(x0 + 6, max(x0 + 7, x1 - 6)), rnd.randrange(min(y1, y0 + 6 + sombra_topo), y1 + 1); cor = rnd.choice(FLOR)
            for (dx, dy) in ((0, 0), (4, -2), (-3, 1))[:rnd.randrange(2, 4)]:
                if y0 + 4 <= cy + dy <= y1: flor(d, min(x1 - 1, cx + dx), cy + dy, cor, alta=rnd.random() < 0.6)


def pedrinha(d, x, y, t=0):
    if t == 0: _r(d, x, y, x + 2, y + 1, PEDRA[1]); _r(d, x, y, x + 1, y, PEDRA[0]); _r(d, x, y + 2, x + 2, y + 2, TERRA[3]); _p(d, x + 3, y + 1, TERRA[3])
    elif t == 1: _r(d, x, y, x + 1, y, PEDRA[0]); _r(d, x, y + 1, x + 1, y + 1, TERRA[3])
    else: _r(d, x, y, x + 3, y + 2, PEDRA[1]); _r(d, x, y, x + 2, y, PEDRA[0]); _p(d, x, y + 1, PEDRA[0]); _r(d, x + 3, y + 1, x + 3, y + 2, PEDRA[2]); _r(d, x, y + 3, x + 3, y + 3, TERRA[3])


def estrada(im, x0, y0, x1, y1, rnd, sulcos=True):
    """Terra batida: miolo claro pisado, beiradas mais escuras, 2 sulcos de roda em tracos longos, pedrinhas com luz e
    sombra, torroes e capim invadindo a beira de cima."""
    d = ImageDraw.Draw(im); H = y1 - y0 + 1
    _r(d, x0, y0, x1, y1, TERRA[1])
    _r(d, x0, y0, x1, y0 + 1, TERRA[2]); _r(d, x0, y1 - 1, x1, y1, mix(TERRA[1], TERRA[2], 0.55))            # beiradas
    for x in range(x0, x1 + 1):                              # beira de cima recortada, com sombra do barranco de grama
        h = (0, 1, 1, 0, 2, 1, 0, 0, 1, 2, 1, 0)[(x * 5 // 3) % 12]
        _r(d, x, y0, x, y0 + h, mix(TERRA[2], TERRA[3], 0.5))
        if (x // 3) % 4 == 1: _p(d, x, y0 + h + 1, TERRA[2])
        if (x * 7) % 11 < 2: _p(d, x, y1, TERRA[2])
    for gx in range(x0 - 10, x1, 46):                        # manchas claras de chao pisado (elipses achatadas)
        cx = gx + rnd.randrange(0, 20); cy = y0 + H // 2 + rnd.randrange(-H // 5, H // 5 + 1); w = rnd.randrange(10, 20)
        for k in (-1, 0, 1):
            ww = w - abs(k) * 4
            _r(d, max(x0, cx - ww), cy + k, min(x1, cx + ww), cy + k, mix(TERRA[1], TERRA[0], 0.55))
        _r(d, max(x0, cx - w // 2), cy - 1, min(x1, cx + w // 4), cy - 1, TERRA[0])
    if sulcos and H >= 14:                                   # sulcos de roda: tracos longos com a borda de baixo clara
        for fy in (0.30, 0.72):
            y = y0 + int(H * fy); x = x0 - rnd.randrange(0, 12)
            while x < x1:
                w = rnd.randrange(9, 22); a, b = max(x0, x), min(x1, x + w)
                if b > a:
                    _r(d, a, y, b, y, TERRA[2]); _r(d, a + 1, y + 1, b - 1, y + 1, mix(TERRA[1], TERRA[0], 0.7))
                    if w > 14: _r(d, a + 3, y - 1, a + 7, y - 1, mix(TERRA[1], TERRA[2], 0.6))
                x += w + rnd.randrange(4, 12)
                y += rnd.choice((0, 0, 0, 1, -1)); y = min(max(y, y0 + 3), y1 - 3)
    for gx in range(x0 + 4, x1 - 4, 17):                     # pedrinhas e torroes numa grade com jeito
        for gy in range(y0 + 4, y1 - 3, 9):
            r = rnd.random(); x = gx + rnd.randrange(-5, 6); y = gy + rnd.randrange(-2, 3)
            if r < 0.30: pedrinha(d, x, y, rnd.choice((0, 0, 1, 2)))
            elif r < 0.52: _r(d, x, y, x + 1, y, TERRA[2]); _p(d, x + 2, y, TERRA[2]); _p(d, x, y + 1, mix(TERRA[1], TERRA[0], 0.6))
            elif r < 0.60: _p(d, x, y, TERRA[0]); _p(d, x + 1, y, TERRA[0])
    for gx in range(x0 + 2, x1 - 6, 23):                     # capim da grama caindo sobre a beira de cima
        if rnd.random() < 0.7:
            x = gx + rnd.randrange(-4, 5); _r(d, x, y0 - 1, x + 3, y0, GRAMA[2]); _p(d, x + 1, y0 + 1, GRAMA[2]); _p(d, x + 4, y0 + 1, GRAMA[3]); _p(d, x + 1, y0 - 1, GRAMA[0])
    for gx in range(x0 + 9, x1 - 6, 31):                     # e nascendo na beira de baixo
        if rnd.random() < 0.6: tufo(d, gx + rnd.randrange(-5, 6), y1 + 1, 1)


def muro(im, x0, y0, x1, y1, rnd):
    """Muro de arrimo: fiadas de pedra de tamanhos diferentes, cada pedra com luz em cima e sombra embaixo, musgo e capim."""
    d = ImageDraw.Draw(im); _r(d, x0, y0, x1, y1, PEDRA[3])
    y = y0; f = 0
    while y <= y1:
        h = 3 if (y1 - y) >= 3 else (y1 - y + 1); x = x0 - rnd.randrange(0, 6)
        while x <= x1:
            w = rnd.choice((6, 7, 8, 9, 11)); a, b = max(x0, x), min(x1, x + w - 1)
            if b >= a:
                tom = PEDRA[1] if (f + x // 5) % 3 else mix(PEDRA[1], PEDRA[2], 0.5)
                _r(d, a, y, b, min(y1, y + h - 1), tom); _r(d, a, y, b, y, PEDRA[0] if f == 0 else mix(PEDRA[0], PEDRA[1], 0.5))
                if h >= 3: _r(d, a, min(y1, y + h - 1), b, min(y1, y + h - 1), PEDRA[2])
                if x + w - 1 <= x1: _r(d, x + w - 1, y, x + w - 1, min(y1, y + h - 1), PEDRA[3])
            x += w
        y += h + (1 if h == 3 and y + h <= y1 else 0); f += 1
    for gx in range(x0 + 3, x1 - 4, 13):                     # capim do patamar de cima pendurado e musgo
        if rnd.random() < 0.75:
            x = gx + rnd.randrange(-3, 4); h = rnd.randrange(1, 4)
            _r(d, x, y0, x + 1, y0 + h, GRAMA[2]); _p(d, x, y0, GRAMA[1]); _p(d, x + 2, y0, GRAMA[2]); _p(d, x + 1, y0 + h + 1, GRAMA[3])
        elif y1 - y0 > 4: _r(d, gx, y1 - 2, gx + 2, y1 - 1, mix(PEDRA[2], GRAMA[2], 0.5))
    _r(d, x0, y1 + 1, x1, y1 + 1, AMEIXA)


def escada(im, x0, y0, x1, y1):
    """Escada de tabuas entre patamares: degraus de 4 px (piso claro, espelho escuro), corrimao de troncos com luz."""
    d = ImageDraw.Draw(im)
    for i, y in enumerate(range(y0, y1 + 1)):
        k = i % 4
        _r(d, x0, y, x1, y, (TERRA[0], mix(TERRA[0], TERRA[1], 0.6), TERRA[2], TERRA[3])[k])
        if k == 0:
            for x in range(x0 + 3, x1, 6): _p(d, x, y, mix(TERRA[0], (255, 255, 255), 0.4))
        if k == 1 and (i // 4) % 2: _p(d, x0 + 2 + (i * 3) % (x1 - x0 - 3), y, TERRA[2])
    for (xa, xb) in ((x0 - 3, x0 - 1), (x1 + 1, x1 + 3)):
        _r(d, xa, y0 - 2, xb, y1, MADEIRA[1]); _r(d, xa, y0 - 2, xa, y1, MADEIRA[0]); _r(d, xb, y0 - 2, xb, y1, MADEIRA[2])
        for y in range(y0 + 6, y1, 14): _r(d, xa, y, xb, y, MADEIRA[2])
        _r(d, xa, y0 - 3, xb, y0 - 3, AMEIXA); _r(d, xa - 1, y0 - 2, xa - 1, y1, mix(AMEIXA, MADEIRA[2], 0.3)); _r(d, xb + 1, y0 - 2, xb + 1, y1, mix(AMEIXA, MADEIRA[2], 0.3))


# ---------------------------------------------------------------- pecas de cenario (frente e meio)
def arvore(alt=44, semente=1, escura=0.0, tronco=True):
    """Arvore redonda de livro de historias: copa de 3 bolas com luz de cima-esquerda, folhas marcadas, tronco com raiz."""
    rnd = random.Random(semente); w = int(alt * 0.82) + 4; im = tela(w, alt + 2); d = ImageDraw.Draw(im)
    F = [mix(c, (24, 44, 52), escura) for c in FOLHA]; T = [mix(c, (24, 30, 44), escura) for c in TRONCO]
    cx = w // 2; copa_h = int(alt * 0.68); r = copa_h // 2
    if tronco:
        tw = max(3, alt // 9)
        _r(d, cx - tw // 2, copa_h - 4, cx + tw // 2, alt, T[1]); _r(d, cx - tw // 2, copa_h - 4, cx - tw // 2, alt, T[0]); _r(d, cx + tw // 2, copa_h - 4, cx + tw // 2, alt, T[2])
        _r(d, cx - tw // 2 - 2, alt - 1, cx + tw // 2 + 2, alt, T[1]); _p(d, cx - tw // 2 - 2, alt - 1, T[0]); _r(d, cx - 1, copa_h + 3, cx - 1, copa_h + 6, T[2])
        d.line((cx, copa_h + 1, cx + tw, copa_h - 5), fill=T[2] + (255,))
    bolas = [(cx - r * 0.45, r * 1.08, r * 0.78), (cx + r * 0.5, r * 1.0, r * 0.8), (cx, r * 0.72, r * 0.86)]
    for (bx, by, br) in bolas: d.ellipse((bx - br - 1, by - br, bx + br + 1, by + br + 2), fill=F[3] + (255,))
    for (bx, by, br) in bolas: d.ellipse((bx - br, by - br, bx + br, by + br), fill=F[2] + (255,))
    for (bx, by, br) in bolas: d.ellipse((bx - br, by - br, bx + br * 0.72, by + br * 0.62), fill=F[1] + (255,))
    for (bx, by, br) in bolas: d.ellipse((bx - br * 0.72, by - br * 0.86, bx + br * 0.2, by - br * 0.06), fill=F[0] + (255,))
    px = im.load()
    for _ in range(int(r * r * 0.5)):                        # folhas: tracinhos de 2 px no tom vizinho
        x, y = rnd.randrange(2, w - 3), rnd.randrange(1, copa_h)
        c = px[x, y][:3]
        if c in (F[1], F[2]):
            n = F[0] if c == F[1] else F[1]
            if rnd.random() < 0.5: n = F[2] if c == F[1] else F[3]
            px[x, y] = n + (255,)
            if px[x + 1, y][:3] == c: px[x + 1, y - 0] = n + (255,)
    return contornar(im, mix(AMEIXA, F[3], 0.25))


def moita(w=22, semente=1, escura=0.0, flores=False):
    rnd = random.Random(semente); h = int(w * 0.6); im = tela(w + 2, h + 2); d = ImageDraw.Draw(im)
    F = [mix(c, (24, 44, 52), escura) for c in FOLHA]
    bolas = [(w * 0.28, h * 0.62, w * 0.28), (w * 0.72, h * 0.66, w * 0.27), (w * 0.5, h * 0.46, w * 0.33)]
    for (bx, by, br) in bolas: d.ellipse((bx - br, by - br, bx + br, by + br + 3), fill=F[2] + (255,))
    for (bx, by, br) in bolas: d.ellipse((bx - br, by - br, bx + br * 0.7, by + br * 0.5), fill=F[1] + (255,))
    for (bx, by, br) in bolas: d.ellipse((bx - br * 0.7, by - br * 0.85, bx + br * 0.1, by - br * 0.1), fill=F[0] + (255,))
    _r(d, 0, h, w + 1, h + 1, (0, 0, 0)); im.paste((0, 0, 0, 0), (0, h, w + 2, h + 2))
    px = im.load()
    for _ in range(w):
        x, y = rnd.randrange(1, w), rnd.randrange(1, h)
        if px[x, y][3] and px[x, y][:3] == F[1]: px[x, y] = F[2] + (255,)
    if flores:
        for _ in range(max(2, w // 6)):
            x, y = rnd.randrange(3, w - 2), rnd.randrange(3, h - 2)
            if px[x, y][3]: c = rnd.choice(FLOR[:3]); px[x, y] = c + (255,); px[x + 1, y] = mix(c, (255, 255, 255), 0.5) + (255,)
    return contornar(im, mix(AMEIXA, F[3], 0.25))


def pedra(w=12, escura=0.0, musgo=True):
    h = max(5, int(w * 0.62)); im = tela(w, h); d = ImageDraw.Draw(im); P = [mix(c, (30, 30, 60), escura) for c in PEDRA]
    d.polygon([(1, h - 1), (0, h // 2), (w // 4, 1), (w * 2 // 3, 0), (w - 1, h // 3), (w - 1, h - 1)], fill=P[1] + (255,))
    d.polygon([(1, h // 2), (w // 4, 1), (w * 2 // 3, 0), (w // 2, h // 3)], fill=P[0] + (255,))
    d.polygon([(w * 2 // 3, 1), (w - 1, h // 3), (w - 1, h - 1), (w * 3 // 5, h - 1), (w * 3 // 4, h // 2)], fill=P[2] + (255,))
    _r(d, 1, h - 1, w - 1, h - 1, P[3]); d.line((w // 2, h // 3, w // 2 - 1, h - 2), fill=P[2] + (255,))
    if musgo: _r(d, w // 4, 1, w // 4 + 2, 1, mix(GRAMA[1], (30, 44, 52), escura)); _p(d, w // 4 + 1, 2, mix(GRAMA[2], (30, 44, 52), escura))
    return contornar(im, mix(AMEIXA, P[3], 0.3))


def cerca(n=4, escura=0.0, quebrada=False):
    """Cerca de mourao e 2 travessas; 'quebrada' deixa uma travessa caida."""
    M_ = [mix(c, (30, 30, 50), escura) for c in MADEIRA]; w = n * 9 + 3; im = tela(w, 13); d = ImageDraw.Draw(im)
    for (y, k) in ((4, 0), (8, 1)):
        fim = w - 1 if not (quebrada and k == 0) else w - 12
        _r(d, 0, y, fim, y + 1, M_[1]); _r(d, 0, y, fim, y, M_[0])
        for x in range(5, fim, 9): _p(d, x, y + 1, M_[2])
    if quebrada: d.line((w - 12, 5, w - 3, 11), fill=M_[1] + (255,)); d.line((w - 12, 4, w - 4, 10), fill=M_[0] + (255,))
    for i in range(n + 1):
        x = i * 9
        _r(d, x, 1, x + 2, 12, M_[1]); _r(d, x, 1, x, 12, M_[0]); _r(d, x + 2, 2, x + 2, 12, M_[2]); _r(d, x, 0, x + 1, 0, M_[0]); _p(d, x + 1, 6, M_[2])
    return contornar(im, mix(AMEIXA, M_[2], 0.3))


def canteiro(w=18, semente=1):
    """Tufo alto de capim com flores (primeiro plano)."""
    rnd = random.Random(semente); im = tela(w, 12); d = ImageDraw.Draw(im)
    for x in range(1, w - 1, 2):
        h = rnd.randrange(3, 9); _r(d, x, 11 - h, x, 11, GRAMA[1] if x % 4 else GRAMA[0]); _p(d, x, 11 - h, GRAMA[0]); _r(d, x + 1, 13 - h, x + 1, 11, GRAMA[2])
        if rnd.random() < 0.38 and h > 5:
            c = rnd.choice(FLOR[:3]); _p(d, x, 10 - h, c); _p(d, x - 1, 11 - h, c); _p(d, x + 1, 11 - h, c); _p(d, x, 11 - h, (255, 236, 150))
    return contornar(im, mix(GRAMA[3], AMEIXA, 0.35))


def marco(numero=None):
    """Marco do terreno: estaca de madeira com fita creme (nada de lapide)."""
    im = bitmap([".m.", "mnn", "eEe", "mno", "mno", "mno", "gno"], {'m': MADEIRA[0], 'n': MADEIRA[1], 'o': MADEIRA[2], 'e': (232, 220, 190), 'E': CREME, 'g': GRAMA[2]})
    return contornar(im, mix(AMEIXA, MADEIRA[2], 0.3))


def placa():
    im = bitmap(["mmmmmmmmm.", "mnnnnnnnnm", "mnnnnnnnno", ".ooooooooo", "....no....", "....no....", "....no....", "....no....", "...gnog..."], {'m': MADEIRA[0], 'n': MADEIRA[1], 'o': MADEIRA[2], 'g': GRAMA[2]})
    d = ImageDraw.Draw(im); d.line((2, 1, 6, 1), fill=AMEIXA + (255,)); d.point([(7, 1), (8, 2), (7, 2)], AMEIXA + (255,))   # seta para o castelo (sem letras)
    return contornar(im, mix(AMEIXA, MADEIRA[2], 0.3))
