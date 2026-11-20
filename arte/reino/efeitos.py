"""Efeitos do piloto (R9), 100% por codigo, em tiras de quadros: poeira, faisca, rastro do golpe, flecha, batata, cura,
moeda, estrelas de nivel, anel de nivel, brilho de raridade, fumaca, confete, sombra, e as duas Magias na estrada
(Boom Barrel: barril armado + explosao; Bramble Snare: espinhos que crescem). Cores em degraus, sumico em pontilhado."""
import os, sys, math, random
sys.dont_write_bytecode = True
import numpy as np
from comum import *

FOGO = [(255, 252, 224), (255, 222, 96), (250, 150, 44), (214, 74, 44), (120, 44, 56)]
FUMO = [(236, 232, 240), (196, 190, 208), (150, 142, 170), (104, 96, 132)]
BR = (255, 255, 255)


def _d(w, h):
    im = tela(w, h); return im, ImageDraw.Draw(im)


def _bola(d, x, y, r, cor):
    d.ellipse((x - r, y - r, x + r, y + r), fill=tuple(cor) + (255,))


def _fim(im, some=0.0, cont=None):
    if cont: im = contornar(im, cont).crop((1, 1, im.width + 1, im.height + 1))
    a = de_img(im)
    return pontilhar(a, some) if some else a


def poeira():
    Q = []; rnd = random.Random(3)
    pts = [(rnd.uniform(-1, 1), rnd.uniform(0.4, 1), rnd.uniform(1.5, 3)) for _ in range(5)]
    for f in range(5):
        im, d = _d(24, 16); t = f / 4.0
        for (vx, vy, r) in pts:
            x = 12 + vx * (2 + 8 * t); y = 13 - vy * 7 * t ** 0.7; rr = r * (0.7 + 0.6 * math.sin(min(1, t * 1.4) * math.pi * 0.6))
            _bola(d, x, y + 1, rr, TERRA[1]); _bola(d, x, y, rr, TERRA[0])
            if rr > 2: d.point((int(x - 1), int(y - 1)), CREME + (255,))
        Q.append(_fim(im, (0, 0, 0.2, 0.5, 0.8)[f]))
    return dict(id='dust', cel=(24, 16), ancora=(12, 14), q=Q, ms=[60, 60, 70, 80, 80])


def faisca():
    Q = []
    for f in range(4):
        im, d = _d(20, 20); c = 10; r = (3, 6, 8, 9)[f]
        for i in range(8):
            a = i * math.pi / 4 + 0.2; r0 = (0, 2, 5, 7)[f]; r1 = r if i % 2 == 0 else r * 0.6
            d.line((c + math.cos(a) * r0, c + math.sin(a) * r0, c + math.cos(a) * r1, c + math.sin(a) * r1), fill=(FOGO[1] if f else BR) + (255,))
        if f < 2: _bola(d, c, c, 2 - f, BR); d.point([(c - 1, c - 1), (c + 1, c + 1)], FOGO[0] + (255,))
        if f == 0: d.line((c - 4, c, c + 4, c), fill=BR + (255,)); d.line((c, c - 4, c, c + 4), fill=BR + (255,))
        Q.append(_fim(im, (0, 0, 0.3, 0.65)[f]))
    return dict(id='spark', cel=(20, 20), ancora=(10, 10), q=Q, ms=[50, 60, 60, 60])


def rastro():
    """Rastro do golpe (arco para a direita; a tela espelha para o invasor)."""
    Q = []
    for f in range(3):
        im, d = _d(28, 28)
        a0 = (-70, -40, 0)[f]; a1 = (20, 55, 75)[f]
        for (r, cor) in ((12, CREME), (11, BR), (10, BR), (9, (214, 232, 255))):
            d.arc((14 - r - 2, 14 - r, 14 + r - 2, 14 + r), a0, a1, fill=cor + (255,))
        Q.append(_fim(im, (0, 0.25, 0.6)[f]))
    return dict(id='slash', cel=(28, 28), ancora=(8, 14), q=Q, ms=[50, 50, 60])


def flecha():
    im = bitmap(["........#..", "ee.nnnnnAA.", "........#.."], {'e': CREME, 'n': MADEIRA[0], 'A': (236, 240, 248), '#': (176, 186, 210)})
    a = np.zeros((7, 13, 4), np.int32); colar(a, de_img(contornar(im)), 0, 1)
    return dict(id='arrow', cel=(13, 7), ancora=(11, 3), q=[a], ms=[1000], nota='aponta para a direita; a tela gira/espelha')


def batata():
    Q = []
    formas = [["..nnn.", ".nNnno", "nNnnno", "nnnnoo", ".nnoo."], [".nnn..", "nNnnn.", "nnnnno", "nnnnoo", ".noo.."], [".nnnn.", "nnnnno", "nnnnNo", ".onnoo", "..ooo."], ["..nnn.", ".nnnno", "onnnNn", "oonnnn", ".ooon."]]
    for f in formas:
        a = np.zeros((9, 9, 4), np.int32); colar(a, de_img(contornar(bitmap(f, {'n': (206, 160, 104), 'N': (240, 210, 150), 'o': (150, 104, 70)}))), 0, 1); Q.append(a)
    return dict(id='spud', cel=(9, 9), ancora=(4, 4), q=Q, ms=[70] * 4)


CORACAO = [".r.r.", "rRrrr", "rrrrr", ".rrr.", "..r.."]


def cura():
    """Folhinhas e coracoes verdes subindo (sem cruz)."""
    Q = []; V = [(190, 255, 170), (110, 220, 110), (50, 150, 80)]
    for f in range(6):
        im, d = _d(24, 28); t = f / 5.0
        for i, (x, v, fase) in enumerate(((5, 1.0, 0), (12, 0.8, 0.3), (18, 1.1, 0.15), (9, 0.6, 0.5))):
            tt = min(1, max(0, t * 1.2 - fase * 0.5)); y = 24 - tt * 18 * v
            if i % 2 == 0:
                im.alpha_composite(contornar(bitmap(CORACAO, {'r': V[1], 'R': V[0]}), V[2]), (int(x - 3), int(y - 3)))
            else:
                d.point([(x, y - 1), (x - 1, y), (x + 1, y), (x, y + 1)], V[0] + (255,)); d.point((x, y), BR + (255,))
        Q.append(_fim(im, (0, 0, 0, 0.2, 0.5, 0.8)[f]))
    return dict(id='heal', cel=(24, 28), ancora=(12, 26), q=Q, ms=[80] * 6)


def moeda():
    Q = []; O = [(255, 246, 190), (255, 214, 80), (214, 150, 40), (150, 96, 36)]
    for f in range(6):
        im, d = _d(12, 12); w = (4, 3, 1, 0, 1, 3)[f]
        if w == 0: d.rectangle((5, 2, 6, 9), fill=O[2] + (255,)); d.point((5, 2), O[0] + (255,))
        else:
            d.ellipse((5.5 - w, 2, 5.5 + w, 9), fill=O[1] + (255,))
            if w >= 3: d.ellipse((5.5 - w + 1.6, 4, 5.5 + w - 1.6, 7), fill=O[2] + (255,)); d.point((5, 5), O[1] + (255,))
            d.line((5.5 - w + 1, 3, 5.5 - w + 1, 5), fill=O[0] + (255,))
            if f < 3: d.rectangle((5.5 + w - 0.5, 3, 5.5 + w, 8), fill=O[2] + (255,))
        Q.append(_fim(im, cont=mix(AMEIXA, O[3], 0.25)))
    return dict(id='coin', cel=(12, 12), ancora=(6, 10), q=Q, ms=[70] * 6, loop=True)


EST = [["..y..", "..y..", "yyYyy", ".yyy.", ".y.y."], [".y.", "yYy", ".y."], ["y"]]


def estrelas():
    Q = []; O = {'y': (255, 226, 96), 'Y': BR}
    for f in range(6):
        im, d = _d(40, 40); t = f / 5.0
        for i in range(7):
            a = -math.pi / 2 + (i - 3) * 0.5; r = 4 + 15 * (t ** 0.6); y_extra = 6 * t * t
            x = 20 + math.cos(a) * r; y = 24 + math.sin(a) * r + y_extra
            s = EST[0 if (i % 2 == 0 and f < 4) else (1 if f < 5 else 2)]
            im.alpha_composite(contornar(bitmap(s, O), (176, 112, 36)), (int(x - len(s[0]) // 2 - 1), int(y - len(s) // 2 - 1)))
        Q.append(_fim(im, (0, 0, 0, 0, 0.3, 0.6)[f]))
    return dict(id='level-stars', cel=(40, 40), ancora=(20, 30), q=Q, ms=[60, 60, 70, 80, 90, 90])


def anel():
    Q = []
    for f in range(5):
        im, d = _d(64, 28); rx = (8, 16, 23, 28, 30)[f]; ry = rx * 0.36
        for (k, cor) in ((0, (255, 226, 96)), (1, BR), (2, (244, 190, 60))):
            d.ellipse((32 - rx + k, 16 - ry + k * 0.4, 32 + rx - k, 16 + ry - k * 0.4), outline=cor + (255,))
        Q.append(_fim(im, (0, 0, 0.2, 0.5, 0.75)[f]))
    return dict(id='level-ring', cel=(64, 28), ancora=(32, 18), q=Q, ms=[60, 60, 70, 80, 90])


def brilho_carta():
    """Faixa de luz que atravessa a carta (56x78) na diagonal: colar por cima da moldura (so Rare, Epic, Legendary)."""
    Q = []
    for f in range(6):
        a = np.zeros((78, 56, 4), np.int32); yy, xx = np.indices((78, 56))
        pos = -6 + f * 22; dist = (xx + yy * 0.6) - pos
        faixa = (np.abs(dist) < 5); fina = (np.abs(dist - 9) < 1.5)
        m = (faixa & (BAYER[yy % 4, xx % 4] < 0.62)) | (fina & (BAYER[yy % 4, xx % 4] < 0.4))
        a[m] = (255, 255, 255, 255)
        a[(np.abs(dist) < 2)] = (255, 255, 255, 255)
        Q.append(a)
    return dict(id='rarity-shine', cel=(56, 78), ancora=(0, 0), q=Q, ms=[60] * 6, nota='recortar pela carta; tocar a cada ~2,5 s')


def fumaca():
    Q = []
    for f in range(6):
        im, d = _d(24, 32); t = f / 5.0
        for i, (ox, r) in enumerate(((0, 4), (-4, 3), (4, 3.4), (1, 2.6))):
            tt = min(1.0, t + i * 0.08); x = 12 + ox * (0.5 + tt) + math.sin(i + t * 3) * 1.5; y = 27 - tt * 19 - i * 1.5; rr = r * (0.6 + 0.7 * tt)
            _bola(d, x + 1, y + 1, rr, FUMO[2]); _bola(d, x, y, rr, FUMO[1 if tt > 0.5 else 0])
            if rr > 2.5: _bola(d, x - 1, y - 1, rr * 0.4, FUMO[0])
        Q.append(_fim(im, (0, 0, 0.15, 0.35, 0.6, 0.8)[f]))
    return dict(id='smoke', cel=(24, 32), ancora=(12, 28), q=Q, ms=[80] * 6)


def confete():
    Q = []; rnd = random.Random(5)
    cores = [FAMILIA['Pikewall'][0], FAMILIA['Thornbow'][0], FAMILIA['Potluck'][0], (255, 226, 96), (255, 140, 160), CREME]
    ps = [(rnd.uniform(-1, 1), rnd.uniform(0.5, 1.2), rnd.choice(cores), rnd.randrange(2)) for _ in range(14)]
    for f in range(6):
        im, d = _d(48, 48); t = f / 5.0
        for (vx, vy, cor, forma) in ps:
            x = 24 + vx * 20 * t ** 0.7; y = 30 - vy * 26 * t + 26 * t * t
            if (forma + f) % 2: d.rectangle((x, y, x + 1, y), fill=cor + (255,))
            else: d.rectangle((x, y, x, y + 1), fill=cor + (255,))
        Q.append(_fim(im, (0, 0, 0, 0, 0.25, 0.6)[f]))
    return dict(id='confetti', cel=(48, 48), ancora=(24, 30), q=Q, ms=[70] * 6)


def sombra():
    Q = []
    for w in (14, 22, 40, 64):
        a = np.zeros((9, 68, 4), np.int32); yy, xx = np.indices((9, 68)); h = 2.2 + w / 22.0
        dd = ((xx - 34) / (w / 2.0)) ** 2 + ((yy - 4) / h) ** 2
        a[dd <= 1] = AMEIXA + (255,)
        a[(dd > 0.62) & (dd <= 1) & ((xx + yy) % 2 == 0)] = 0
        Q.append(a)
    return dict(id='shadow', cel=(68, 9), ancora=(34, 4), q=Q, ms=[1000] * 4, nota='4 tamanhos (soldado, bruto, predio, chefe); desenhar com alfa 0,28 embaixo da peca')


# ---------------------------------------------------------------- magias na estrada
def _barril(d, x, y, flash=False):
    """Barril de polvora 14x16 com a base em (x, y)."""
    m = MADEIRA if not flash else [(255, 240, 200), (250, 200, 140), (214, 140, 90)]
    F = FAMILIA['Fizzwick']
    d.rectangle((x - 6, y - 14, x + 6, y - 1), fill=m[1] + (255,)); d.rectangle((x - 7, y - 11, x + 7, y - 4), fill=m[1] + (255,))
    d.rectangle((x - 5, y - 14, x - 3, y - 1), fill=m[0] + (255,)); d.rectangle((x + 4, y - 13, x + 6, y - 2), fill=m[2] + (255,))
    for xx in (x - 2, x + 2): d.line((xx, y - 14, xx, y - 1), fill=m[2] + (255,))
    for yy in (y - 12, y - 4): d.rectangle((x - 7, yy, x + 7, yy + 1), fill=(88, 76, 104, 255)); d.point((x - 5, yy), (150, 142, 170, 255))
    d.rectangle((x - 4, y - 9, x + 4, y - 7), fill=F[1] + (255,)); d.rectangle((x - 4, y - 9, x + 4, y - 9), fill=F[0] + (255,))   # faixa da familia
    d.rectangle((x - 6, y - 15, x + 6, y - 15), fill=m[0] + (255,))


def barril_armado():
    Q = []
    for f in range(4):
        im, d = _d(28, 32); _barril(d, 14, 29)
        im = contornar(im).crop((1, 1, 29, 33)); d = ImageDraw.Draw(im)
        d.line((14, 13, 16, 10, 18, 9), fill=(88, 76, 104, 255))                    # pavio
        fx, fy = 19, 8
        pts = [[(0, 0, 0), (1, -1, 1), (-1, -1, 1), (0, -2, 2), (2, 0, 2)], [(0, 0, 1), (0, -1, 0), (1, -2, 1), (-1, -2, 2), (2, -3, 2)], [(0, 0, 0), (1, 0, 1), (0, -1, 1), (-2, -1, 2), (1, -3, 2)], [(0, 0, 1), (-1, -1, 0), (1, -1, 1), (0, -3, 2), (-2, -2, 2)]][f]
        for (dx, dy, c) in pts: d.point((fx + dx, fy + dy), FOGO[c] + (255,))
        Q.append(de_img(im))
    return dict(id='M01', nome='Boom Barrel', tipo='magia', familia='Fizzwick', cel=(28, 32), ancora=(14, 30), q=Q, ms=[90] * 4, anims={'idle': dict(quadros=[0, 1, 2, 3], ms=[90] * 4, loop=True)}, nota='Boom Barrel armado no terreno; ao disparar tocar explosion')


def explosao():
    Q = []; rnd = random.Random(11)
    lascas = [(rnd.uniform(-1, 1), rnd.uniform(0.3, 1.1), rnd.choice(MADEIRA)) for _ in range(9)]
    for f in range(8):
        im, d = _d(72, 64); cx, cy = 36, 44; t = f / 7.0
        if f == 0:
            _bola(d, cx, cy - 6, 9, BR); _bola(d, cx, cy - 6, 6, FOGO[0])
            for i in range(8):
                a = i * math.pi / 4; d.line((cx + math.cos(a) * 9, cy - 6 + math.sin(a) * 9, cx + math.cos(a) * 15, cy - 6 + math.sin(a) * 15), fill=BR + (255,))
        elif f <= 3:
            R = (0, 16, 21, 23)[f]
            for (r, c, oy) in ((R, FOGO[3], 0), (R * 0.82, FOGO[2], -1), (R * 0.6, FOGO[1], -2), (R * 0.34, FOGO[0], -3)):
                for i in range(7):
                    a = i * math.pi * 2 / 7 + f * 0.3; _bola(d, cx + math.cos(a) * r * 0.42, cy - 8 + oy + math.sin(a) * r * 0.36, r * 0.62, c)
            if f == 3: _bola(d, cx - 6, cy - 12, 5, FUMO[3]); _bola(d, cx + 8, cy - 4, 4, FUMO[3])
        else:
            k = (f - 4) / 3.0
            for i in range(8):
                a = i * math.pi * 2 / 8 + 0.3; r = 13 + 7 * k; x = cx + math.cos(a) * r * 0.9; y = cy - 10 - 12 * k + math.sin(a) * r * 0.5
                rr = 6.5 - 2.5 * k + (i % 2)
                _bola(d, x + 1, y + 1, rr, FUMO[3]); _bola(d, x, y, rr, FUMO[2 if i % 3 else 1])
                if f == 4 and i % 2 == 0: _bola(d, x, y, rr * 0.5, FOGO[2])
        if f >= 1:                                                              # lascas do barril voando
            for (vx, vy, cor) in lascas:
                x = cx + vx * 30 * t ** 0.7; y = cy - 8 - vy * 38 * t + 40 * t * t
                if y < cy: d.rectangle((x, y, x + 2, y + 1), fill=cor + (255,)); d.point((x, y), CREME + (255,))
        if 1 <= f <= 3:                                                         # anel de choque no chao
            rx = (0, 18, 27, 33)[f]; d.arc((cx - rx, cy - 3, cx + rx, cy + 5), 0, 360, fill=CREME + (255,))
        Q.append(_fim(im, (0, 0, 0, 0, 0.1, 0.3, 0.55, 0.8)[f]))
    return dict(id='explosion', cel=(72, 64), ancora=(36, 46), q=Q, ms=[50, 60, 70, 80, 80, 90, 90, 100], nota='Boom Barrel e Squib Runner; pausa de impacto no quadro 1')


def _espinho(d, x0, y0, comp, ang, V, quadro=0):
    """Um galho curvo com espinhos, da base (x0, y0)."""
    x, y = x0, y0; a = ang
    for i in range(int(comp)):
        nx, ny = x + math.cos(a), y + math.sin(a); a += 0.09 * (1 if ang < -math.pi / 2 else -1) + math.sin(i * 0.7 + quadro) * 0.03
        d.rectangle((nx, ny, nx + 1, ny + 1), fill=V[1] + (255,)); d.point((nx, ny), V[0] + (255,))
        if i % 4 == 2:
            s = 1 if (i // 4) % 2 else -1
            d.line((nx, ny, nx + math.cos(a + s * 1.4) * 3, ny + math.sin(a + s * 1.4) * 3), fill=CREME + (255,))
        x, y = nx, ny
    return x, y


def espinheiro():
    """Bramble Snare: moita de espinhos que brota do chao (4 quadros), prende (2 quadros em laco) e murcha (2)."""
    V = [(150, 214, 110), (70, 156, 72), (40, 104, 64)]; Q = []
    def quadro(k, q=0, seco=False):
        im, d = _d(64, 36); vv = V if not seco else [(196, 180, 120), (150, 130, 90), (104, 84, 64)]
        galhos = [(10, -1.9, 16), (18, -1.2, 20), (27, -1.75, 24), (36, -1.3, 22), (45, -1.85, 20), (54, -1.25, 15), (23, -0.8, 12), (41, -2.35, 12)]
        for (x, a, c) in galhos:
            fx, fy = _espinho(d, x, 33, c * k, a, vv, q)
            if k >= 1 and not seco and (x % 3 == 0): d.point([(fx, fy - 1), (fx + 1, fy - 1)], (255, 150, 170, 255)); d.point((fx, fy - 2), (255, 214, 220, 255))   # florzinha
        d.rectangle((6, 33, 58, 34), fill=vv[2] + (255,))
        for x in range(8, 58, 5): d.point((x, 32), vv[1] + (255,))
        return contornar(im, mix(AMEIXA, vv[2], 0.3)).crop((1, 1, 65, 37))
    for k in (0.25, 0.55, 0.85, 1.08): Q.append(de_img(quadro(k)))
    Q += [de_img(quadro(1.0, 0)), de_img(quadro(1.0, 2))]
    Q += [pontilhar(de_img(quadro(0.9, 0, True)), 0.2), pontilhar(de_img(quadro(0.7, 0, True)), 0.6)]
    return dict(id='M06', nome='Bramble Snare', tipo='magia', familia='Thornbow', cel=(64, 36), ancora=(32, 34), q=Q, ms=[60, 60, 70, 90, 260, 260, 120, 120],
                anims={'idle': dict(quadros=[4, 5], ms=[260, 260], loop=True), 'grow': dict(quadros=[0, 1, 2, 3], ms=[60, 60, 70, 90], loop=False), 'hold': dict(quadros=[4, 5], ms=[260, 260], loop=True), 'wither': dict(quadros=[6, 7], ms=[120, 120], loop=False)},
                nota='Bramble Snare: grow ao disparar, hold por 2,5 s com o invasor por tras, wither no fim')


def montar():
    out = []
    for e in (poeira(), faisca(), rastro(), flecha(), batata(), cura(), moeda(), estrelas(), anel(), brilho_carta(), fumaca(), confete(), sombra(), barril_armado(), explosao(), espinheiro()):
        an = e.get('anims') or {'play': dict(quadros=list(range(len(e['q']))), ms=e['ms'], loop=bool(e.get('loop')))}
        p = dict(id=e['id'], nome=e.get('nome', e['id']), tipo=e.get('tipo', 'efeito'), cel=e['cel'], ancora=e['ancora'], variantes=[e['q']], anims=an)
        if e.get('familia'): p['familia'] = e['familia']; p['cor'] = hexa(FAMILIA[e['familia']][1])
        if e.get('nota'): p['nota'] = e['nota']
        out.append(p)
    return out


if __name__ == '__main__':
    ps = montar(); lin = []
    for p in ps:
        v = p['variantes'][0]; im = tela(len(v) * p['cel'][0], p['cel'][1])
        for i, q in enumerate(v): im.alpha_composite(para_img(q), (i * p['cel'][0], 0))
        lin.append(im); print(p['id'], len(v), p['cel'])
    W = max(l.width for l in lin); H = sum(l.height + 2 for l in lin)
    o = Image.new('RGBA', (W, H), (96, 150, 92, 255)); y = 0
    for l in lin: o.alpha_composite(l, (0, y)); y += l.height + 2
    ampliar(o, 3).save(sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, 'prova', 'efeitos-quadros.png'))
