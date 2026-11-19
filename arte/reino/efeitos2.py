"""Efeitos da ARTE COMPLETA (R11), 100% por codigo. As 6 Magias que faltavam (peca na estrada + quadros do disparo) e os
extras de capricho: bandeirolas ao vento, passaros, vaga-lumes, poeira no ar, raio do Sparkwright, torta, falcao, virote,
estouro de gas do Bloater, onda do tambor, cura do Quack, aura da carta rara e fogos de artificio. Folha nova 'efeitos2'."""
import os, sys, math, random
sys.dont_write_bytecode = True
import numpy as np
from comum import *
from efeitos import _d, _bola, _fim, FOGO, FUMO, BR, CORACAO, EST, explosao

F = FAMILIA
OUROS = [(255, 246, 190), (255, 214, 80), (214, 150, 40), (150, 96, 36)]
FERRO = [(150, 142, 170), (88, 76, 104), (58, 46, 72)]
PRATA = [(255, 255, 255), (214, 222, 236), (150, 160, 184), (104, 112, 150)]
PICHE = [(120, 108, 150), (62, 50, 78), (36, 26, 48)]
GAS = [(240, 255, 200), (182, 240, 60), (120, 190, 60), (146, 72, 200), (86, 40, 130)]


def _px(d, x, y, c): d.point((int(x), int(y)), tuple(c) + (255,))
def _ret(d, x0, y0, x1, y1, c): d.rectangle((x0, y0, x1, y1), fill=tuple(c) + (255,))
def _cont(im, cor=AMEIXA): return contornar(im, cor).crop((1, 1, im.width + 1, im.height + 1))


def _mesa(d, x0, x1, y, alt=6):
    _ret(d, x0, y - alt, x1, y - alt + 1, MADEIRA[0]); _ret(d, x0, y - alt + 2, x1, y - alt + 2, MADEIRA[2])
    for x in (x0 + 2, x1 - 3): _ret(d, x, y - alt + 3, x + 1, y - 1, MADEIRA[1]); _ret(d, x + 1, y - alt + 3, x + 1, y - 1, MADEIRA[2])


# ---------------------------------------------------------------- M02 Tar Puddle
def piche():
    Q = []
    for f in range(4):
        im, d = _d(64, 20)
        d.ellipse((4, 6, 59, 17), fill=PICHE[2] + (255,)); d.ellipse((1, 9, 22, 17), fill=PICHE[2] + (255,)); d.ellipse((40, 5, 62, 14), fill=PICHE[2] + (255,))
        d.ellipse((7, 7, 55, 15), fill=PICHE[1] + (255,)); d.ellipse((42, 6, 59, 12), fill=PICHE[1] + (255,))
        for (x, w) in ((12, 9), (30, 6), (46, 7)): _ret(d, x, 8 + (x % 2), x + w, 8 + (x % 2), PICHE[0])      # reflexo
        _px(d, 14, 9, BR); _px(d, 47, 8, BR)
        for i, (bx, by) in enumerate(((20, 12), (36, 10), (50, 11), (10, 13))):                               # bolhas que crescem e estouram
            k = (f + i) % 4
            if k == 0: _px(d, bx, by, PICHE[0])
            elif k == 1: _ret(d, bx, by - 1, bx + 1, by, PICHE[0]); _px(d, bx, by - 1, BR)
            elif k == 2: d.ellipse((bx - 1, by - 2, bx + 2, by + 1), outline=PICHE[0] + (255,)); _px(d, bx, by - 2, BR)
            else: _px(d, bx - 2, by - 2, PICHE[0]); _px(d, bx + 3, by - 2, PICHE[0]); _px(d, bx, by - 3, PICHE[0])
        for (x, y) in ((3, 16), (60, 15), (26, 17)): _px(d, x, y + 1, PICHE[1])                               # respingos
        Q.append(de_img(_cont(im, mix(AMEIXA, (0, 0, 0), 0.3))))
    return dict(id='M02', nome='Tar Puddle', tipo='magia', familia='Fizzwick', cel=(64, 20), ancora=(32, 13), q=Q,
                anims={'idle': dict(quadros=[0, 1, 2, 3], ms=[220] * 4, loop=True)}, nota='Tar Puddle: poca no chao, ATRAS dos bonecos; invasor em cima anda devagar')


# ---------------------------------------------------------------- M03 Angry Bees
def _abelha(d, x, y, asa):
    _ret(d, x, y, x + 2, y + 1, OUROS[1]); _px(d, x + 1, y, AMEIXA); _px(d, x + 1, y + 1, AMEIXA); _px(d, x + 3, y + 1, AMEIXA)
    _px(d, x + 1, y - 1 - asa, BR); _px(d, x + 2, y - 1, (214, 232, 255))


def abelhas():
    Q = []; rnd = random.Random(8)
    orb = [(rnd.uniform(0, 6.28), rnd.uniform(0.7, 1.0), rnd.uniform(0.6, 1.4)) for _ in range(10)]
    def colmeia(d):
        _ret(d, 23, 33, 32, 40, MADEIRA[1]); _ret(d, 23, 33, 24, 40, MADEIRA[0]); _ret(d, 31, 34, 32, 40, MADEIRA[2]); _ret(d, 22, 32, 33, 33, MADEIRA[0])   # toco
        for i, (w, y) in enumerate(((4, 17), (7, 19), (9, 22), (10, 25), (10, 28), (8, 31))):                 # colmeia de palha em gomos
            _ret(d, 28 - w, y, 27 + w, y + 2, OUROS[1]); _ret(d, 28 - w, y, 28 - w + 2, y + 1, OUROS[0]); _ret(d, 27 + w - 1, y, 27 + w, y + 2, OUROS[2]); _ret(d, 28 - w, y + 2, 27 + w, y + 2, OUROS[2])
        _ret(d, 26, 27, 29, 30, AMEIXA); _px(d, 27, 27, OUROS[3])
    for f in range(4):                                         # idle: 3 abelhas rondando
        im, d = _d(56, 44); colmeia(d); im = _cont(im, mix(AMEIXA, OUROS[3], 0.25)); d = ImageDraw.Draw(im)
        for i in range(3):
            a, e, v = orb[i]; t = a + f * math.pi / 2 * v
            _abelha(d, 27 + math.cos(t) * 14 * e, 22 + math.sin(t * 1.3) * 8, f % 2)
        Q.append(de_img(im))
    for f in range(6):                                         # swarm: o enxame inteiro sai e ferroa em volta
        im, d = _d(56, 44); colmeia(d); im = _cont(im, mix(AMEIXA, OUROS[3], 0.25)); d = ImageDraw.Draw(im)
        for i in range(10):
            a, e, v = orb[i]; t = a + f * math.pi / 3 * v
            x = 27 + math.cos(t) * (22 * e); y = 20 + math.sin(t * 1.7 + i) * 15
            _abelha(d, min(51, max(1, x)), min(40, max(3, y)), (f + i) % 2)
            if (f + i) % 3 == 0: _px(d, min(53, max(1, x + 4)), min(41, max(3, y + 2)), BR)
        Q.append(de_img(im))
    return dict(id='M03', nome='Angry Bees', tipo='magia', familia='Thornbow', cel=(56, 44), ancora=(28, 41), q=Q,
                anims={'idle': dict(quadros=[0, 1, 2, 3], ms=[130] * 4, loop=True), 'swarm': dict(quadros=[4, 5, 6, 7, 8, 9], ms=[80] * 6, loop=True)},
                nota='Angry Bees: idle parado; swarm enquanto houver invasor no terreno (1 ferroada por segundo)')


# ---------------------------------------------------------------- M04 Rally Horn
def corneta():
    Q = []; A = F['Pikewall']
    def base(d, toca=0):
        _ret(d, 22, 20, 24, 42, MADEIRA[1]); _ret(d, 22, 20, 22, 42, MADEIRA[0]); _ret(d, 24, 21, 24, 42, MADEIRA[2]); _ret(d, 19, 41, 27, 42, MADEIRA[2]); _ret(d, 18, 19, 28, 20, MADEIRA[0])   # poste
        oy = -2 * toca                                         # berrante curvo: boca larga a direita
        pts = [(13, 18, 2), (15, 16, 2), (18, 15, 3), (22, 14, 3), (26, 13, 4), (30, 11, 5), (34, 9, 6)]
        for (x, y, r) in pts: d.ellipse((x - r, y - r + oy, x + r, y + r + oy), fill=(240, 226, 190, 255))
        for (x, y, r) in pts: d.ellipse((x - r + 1, y - r + oy + 1, x + r, y + r + oy), fill=(206, 180, 130, 255))
        for (x, y, r) in pts: d.ellipse((x - r, y - r + oy, x + r - 1, y + r + oy - 2), fill=(240, 226, 190, 255))
        d.ellipse((33, 2 + oy, 41, 16 + oy), fill=OUROS[1] + (255,)); d.ellipse((35, 4 + oy, 40, 14 + oy), fill=OUROS[3] + (255,)); d.arc((33, 2 + oy, 41, 16 + oy), 120, 260, fill=OUROS[0] + (255,))
        _ret(d, 11, 16 + oy, 13, 20 + oy, OUROS[1]); _px(d, 11, 16 + oy, OUROS[0])                                                    # bocal
        for x in (20, 27): _ret(d, x, 11 + oy + (x == 20) * 2, x + 1, 18 + oy, OUROS[2])                                              # aneis
    for f in range(2):
        im, d = _d(56, 44); base(d); im = _cont(im); im.alpha_composite(__import__('predios').bandeirola(A, f * 2, 9, 6), (25, 22)); Q.append(de_img(im))
    for f in range(5):                                         # blow: o berrante sobe e solta 3 ondas de som douradas
        im, d = _d(56, 44); base(d, 1 if f in (0, 1, 2) else 0); im = _cont(im); d = ImageDraw.Draw(im); im.alpha_composite(__import__('predios').bandeirola(A, f, 9, 6), (25, 22))
        for k in range(3):
            r = 4 + (f - k) * 4
            if 3 < r < 20: d.arc((40 - r, 7 - r, 40 + r, 7 + r), -55, 55, fill=(OUROS[0] if k == 0 else OUROS[1]) + (255,)); d.arc((41 - r, 7 - r, 41 + r, 7 + r), -40, 40, fill=BR + (255,))
        Q.append(pontilhar(de_img(im), 0) if f < 4 else de_img(im))
    return dict(id='M04', nome='Rally Horn', tipo='magia', familia='Pikewall', cel=(56, 44), ancora=(23, 42), q=Q,
                anims={'idle': dict(quadros=[0, 1], ms=[400, 400], loop=True), 'blow': dict(quadros=[2, 3, 4, 5, 6], ms=[90] * 5, loop=False, impacto=1)},
                nota='Rally Horn: blow quando o invasor chega; depois tocar rally-notes em cima dos soldados por 5 s')


# ---------------------------------------------------------------- M05 Second Helping
def _caldeirao(d, x, y, sopa=(250, 170, 80)):
    d.ellipse((x - 11, y - 14, x + 11, y), fill=FERRO[1] + (255,)); d.ellipse((x - 11, y - 14, x + 4, y - 3), fill=FERRO[0] + (255,)); d.ellipse((x - 8, y - 12, x + 9, y - 1), fill=FERRO[1] + (255,))
    _ret(d, x - 12, y - 15, x + 12, y - 13, FERRO[0]); _ret(d, x - 12, y - 13, x + 12, y - 13, FERRO[2])
    _ret(d, x - 10, y - 16, x + 10, y - 15, sopa); _ret(d, x - 8, y - 16, x - 3, y - 16, mix(sopa, BR, 0.5)); _px(d, x + 4, y - 16, (232, 64, 76)); _px(d, x - 1, y - 15, GRAMA[1])
    for xx in (x - 9, x + 8): _ret(d, xx, y, xx + 1, y + 2, FERRO[2])


def repeteco():
    Q = []
    def cena(d, f):
        for i, c in enumerate((FOGO[3], FOGO[2], FOGO[1])):   # fogo embaixo
            for x in range(18 + i, 38 - i, 2): _ret(d, x, 40 - i * 2 - ((x + f) % 3), x + 1, 42, c)
        _ret(d, 14, 41, 41, 42, MADEIRA[2]); _caldeirao(d, 28, 38)
    for f in range(4):
        im, d = _d(56, 46); cena(d, f); im = _cont(im); d = ImageDraw.Draw(im)
        for i in range(3):                                     # vapor em S
            t = ((f / 4.0) + i / 3.0) % 1.0; x = 23 + i * 5 + math.sin(t * 6.28) * 2; y = 20 - t * 13
            _ret(d, x, y, x + 1, y + 1, FUMO[0 if t < 0.5 else 1]);
            if t < 0.7: _px(d, x + 1, y + 2, FUMO[1])
        Q.append(de_img(im))
    V = [(190, 255, 170), (110, 220, 110), (50, 150, 80)]
    for f in range(5):                                         # serve: a concha sobe, anel verde e coracoes
        im, d = _d(56, 46); cena(d, f); im = _cont(im); d = ImageDraw.Draw(im)
        r = 6 + f * 5
        d.ellipse((28 - r, 24 - r * 0.45, 28 + r, 24 + r * 0.45), outline=V[1] + (255,)); d.ellipse((28 - r + 1, 24 - r * 0.45 + 1, 28 + r - 1, 24 + r * 0.45 - 1), outline=V[0] + (255,))
        for i, (x, v) in enumerate(((14, 1.0), (28, 1.3), (42, 0.9))):
            y = 20 - f * 4 * v
            if y > 2: im.alpha_composite(contornar(bitmap(CORACAO, {'r': V[1], 'R': V[0]}), V[2]), (int(x - 3), int(y)))
        Q.append(pontilhar(de_img(im), (0, 0, 0, 0.0, 0.0)[f]))
    return dict(id='M05', nome='Second Helping', tipo='magia', familia='Potluck', cel=(56, 46), ancora=(28, 43), q=Q,
                anims={'idle': dict(quadros=[0, 1, 2, 3], ms=[160] * 4, loop=True), 'serve': dict(quadros=[4, 5, 6, 7, 8], ms=[80] * 5, loop=False, impacto=1)},
                nota='Second Helping: serve quando o invasor chega; tocar heal em cada soldado')


# ---------------------------------------------------------------- M07 Seconds!
def segundos():
    Q = []
    def cena(d, sobe=0, luz=0):
        _mesa(d, 12, 43, 43, 9)
        _ret(d, 14, 32, 41, 33, PRATA[1]); _ret(d, 14, 33, 41, 33, PRATA[3]); _ret(d, 16, 32, 22, 32, PRATA[0])                         # bandeja
        if luz:
            for i in range(7):
                a = -math.pi + i * math.pi / 6; rr = 6 + luz * 5
                d.line((28 + math.cos(a) * 5, 30 + math.sin(a) * 4, 28 + math.cos(a) * rr, 30 + math.sin(a) * rr), fill=(OUROS[0] if i % 2 else OUROS[1]) + (255,))
            d.ellipse((22, 25, 34, 32), fill=(250, 200, 120, 255)); d.ellipse((23, 24, 31, 29), fill=(255, 232, 170, 255)); _ret(d, 26, 22, 28, 24, (232, 64, 76)); _px(d, 26, 22, (255, 170, 170))   # o pudim
        y = 31 - sobe                                           # tampa de prata (cloche)
        d.chord((15, y - 13, 40, y + 12), 180, 360, fill=PRATA[1] + (255,)); d.chord((15, y - 13, 33, y + 8), 180, 300, fill=PRATA[0] + (255,)); d.chord((30, y - 11, 40, y + 12), 270, 360, fill=PRATA[2] + (255,))
        _ret(d, 15, y - 1, 40, y, PRATA[2]); _ret(d, 26, y - 16, 29, y - 14, OUROS[1]); _px(d, 26, y - 16, OUROS[0]); _ret(d, 27, y - 14, 28, y - 13, OUROS[2])
    for f in range(4):
        im, d = _d(56, 46); cena(d); im = _cont(im); d = ImageDraw.Draw(im)
        x, y = ((20, 22), (24, 20), (34, 24), (20, 22))[f]
        if f < 3: _px(d, x, y, BR); d.point([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], PRATA[0] + (255,))
        Q.append(de_img(im))
    for f in range(5):                                         # open: a tampa pula, luz dourada e estrelas
        im, d = _d(56, 46); cena(d, sobe=(3, 9, 14, 17, 18)[f], luz=(1, 2, 3, 3, 2)[f]); im = _cont(im)
        for i in range(4):
            a = -math.pi / 2 + (i - 1.5) * 0.7; r = 8 + f * 4; s = EST[1 if f < 3 else 2]
            im.alpha_composite(contornar(bitmap(s, {'y': (255, 226, 96), 'Y': BR}), (176, 112, 36)), (int(28 + math.cos(a) * r - 2), int(26 + math.sin(a) * r * 0.7 - 2)))
        Q.append(de_img(im))
    return dict(id='M07', nome='Seconds!', tipo='magia', familia='Potluck', cel=(56, 46), ancora=(28, 43), q=Q,
                anims={'idle': dict(quadros=[0, 1, 2, 3], ms=[200] * 4, loop=True), 'open': dict(quadros=[4, 5, 6, 7, 8], ms=[70, 70, 80, 100, 140], loop=False, impacto=1)},
                nota='Seconds!: open quando um soldado caido se levanta')


# ---------------------------------------------------------------- M08 Grand Finale
def _foguete(d, x, y, cor, alt=12):
    _ret(d, x, y - alt, x + 3, y - 3, cor[1]); _ret(d, x, y - alt, x, y - 3, cor[0]); _ret(d, x + 3, y - alt + 1, x + 3, y - 3, cor[2])
    d.polygon([(x - 1, y - alt), (x + 4, y - alt), (x + 2, y - alt - 5), (x + 1, y - alt - 5)], fill=(232, 64, 76, 255)); _px(d, x + 1, y - alt - 3, (255, 170, 170))
    _ret(d, x, y - alt + 3, x + 3, y - alt + 4, CREME); _ret(d, x + 1, y - 3, x + 2, y, MADEIRA[1])


def finale():
    Q = []; cores = [F['Fizzwick'], [OUROS[0], OUROS[1], OUROS[2]], F['Pikewall']]
    def caixa_(d, fog=(1, 1, 1), dy=(0, 0, 0)):
        for i, x in enumerate((15, 24, 33)):
            if fog[i]: _foguete(d, x + (i == 1), 34 - dy[i] - (2 if i == 1 else 0), cores[i], 12 + (3 if i == 1 else 0))
        _ret(d, 10, 33, 41, 44, MADEIRA[1]); _ret(d, 10, 33, 41, 34, MADEIRA[0]); _ret(d, 10, 43, 41, 44, MADEIRA[2]); _ret(d, 10, 33, 11, 44, MADEIRA[0]); _ret(d, 40, 34, 41, 44, MADEIRA[2])
        for x in (20, 30): _ret(d, x, 35, x, 43, MADEIRA[2])
        _ret(d, 14, 37, 37, 40, F['Fizzwick'][1]); _ret(d, 14, 37, 37, 37, F['Fizzwick'][0]); _ret(d, 14, 40, 37, 40, F['Fizzwick'][2])       # faixa fucsia da familia
        for x in (17, 25, 33): im_star = bitmap(EST[1], {'y': OUROS[1], 'Y': BR}); d._image.alpha_composite(im_star, (x, 37))
    for f in range(4):                                         # idle: pavio aceso
        im, d = _d(52, 48); caixa_(d); im = _cont(im); d = ImageDraw.Draw(im)
        d.line((41, 40, 45, 38, 47, 40), fill=FERRO[1] + (255,))
        for (dx, dy, c) in [[(0, 0, 0), (1, -1, 1), (-1, -1, 2)], [(0, 0, 1), (0, -1, 0), (1, -2, 2)], [(0, 0, 0), (1, 0, 1), (0, -2, 2)], [(0, 0, 1), (-1, -1, 0), (1, -1, 2)]][f]: _px(d, 48 + dx, 40 + dy, FOGO[c])
        Q.append(de_img(im))
    for f in range(3):                                         # launch: os 3 foguetes sobem um a um, com rastro de faisca
        im, d = _d(52, 48); dy = [(6, 0, 0), (22, 8, 0), (40, 26, 10)][f]; caixa_(d, dy=dy); im = _cont(im); d = ImageDraw.Draw(im)
        for i, x in enumerate((16, 26, 34)):
            if dy[i]:
                for k in range(1, 4): _px(d, x + (k % 2), 36 - dy[i] + k * 3, FOGO[min(3, k)]); _px(d, x + 1 - (k % 2), 35 - dy[i] + k * 3, FOGO[0] if k == 1 else FUMO[1])
        Q.append(de_img(im))
    return dict(id='M08', nome='Grand Finale', tipo='magia', familia='Fizzwick', cel=(52, 48), ancora=(26, 45), q=Q,
                anims={'idle': dict(quadros=[0, 1, 2, 3], ms=[90] * 4, loop=True), 'launch': dict(quadros=[4, 5, 6], ms=[90, 90, 110], loop=False, impacto=2, efeito='fireworks')},
                nota='Grand Finale: launch e em seguida fireworks no alto da tela; cada invasor pisca em branco')


def fogos():
    """Fogos de artificio do Grand Finale e da vitoria grande: 3 estouros (fucsia, ouro, azul) em 10 quadros, 96x80."""
    Q = []; rnd = random.Random(4)
    bs = [(28, 30, F['Fizzwick'], 0), (66, 22, [OUROS[0], OUROS[1], OUROS[2]], 2), (50, 48, F['Pikewall'], 4)]
    for f in range(10):
        im, d = _d(96, 80)
        for (cx, cy, cor, t0) in bs:
            t = f - t0
            if t < 0:                                           # subindo
                if t >= -2: _ret(d, cx, cy + 30 + t * 12, cx, cy + 36 + t * 12, FOGO[1]); _px(d, cx, cy + 29 + t * 12, BR)
                continue
            if t == 0: _bola(d, cx, cy, 4, BR); d.line((cx - 7, cy, cx + 7, cy), fill=BR + (255,)); d.line((cx, cy - 7, cx, cy + 7), fill=BR + (255,)); continue
            if t > 5: continue
            R = (0, 9, 15, 19, 22, 24)[t]; cai = t * t * 0.5
            for i in range(14):
                a = i * math.pi * 2 / 14 + (0.2 if cor is bs[1][2] else 0)
                for k, rr in enumerate((R, R * 0.66)):
                    if k == 1 and i % 2: continue
                    x = cx + math.cos(a) * rr; y = cy + math.sin(a) * rr * 0.92 + cai * (0.5 + 0.5 * k)
                    c = BR if t == 1 else (cor[0] if t <= 2 else (cor[1] if t <= 4 else cor[2]))
                    if t <= 3: _ret(d, x, y, x + 1, y + 1, c); _px(d, x, y, BR if t <= 2 else cor[0])
                    elif (i + t) % 2 == 0 or t == 4: _px(d, x, y, c); _px(d, x, y + 1, cor[2])
            if t <= 2: _bola(d, cx, cy, 3 - t, BR)
        Q.append(_fim(im))
    return dict(id='fireworks', cel=(96, 80), ancora=(48, 76), q=Q, ms=[70, 70, 80, 80, 80, 90, 90, 100, 100, 110], nota='Grand Finale, chefe vencido, recorde: no ceu, acima da estrada')


# ---------------------------------------------------------------- extras de capricho
def bandeirolas():
    """Varal de bandeirolas (4 cores das familias + creme) balancando ao vento: 4 quadros, 64x16. Repetir lado a lado."""
    Q = []; cs = [F['Pikewall'], F['Potluck'], F['Thornbow'], F['Fizzwick'], [CREME, (232, 220, 190), (190, 170, 140)]]
    for f in range(4):
        im, d = _d(64, 16)
        for x in range(64):
            y = 2 + int(round(3.2 * math.sin(math.pi * x / 63.0))); _px(d, x, y, MADEIRA[2])
        for i in range(7):
            x = 2 + i * 9; y0 = 3 + int(round(3.2 * math.sin(math.pi * (x + 3) / 63.0))); c = cs[i % 5]; v = int(round(math.sin(f * math.pi / 2 + i * 1.3)))
            for k in range(6):
                w = 6 - k; xx = x + k // 2 + (v if k > 2 else 0)
                if w > 0: _ret(d, xx, y0 + k, xx + w - 1, y0 + k, c[1] if k else c[0]); _px(d, xx + w - 1, y0 + k, c[2])
        Q.append(de_img(_cont(im, mix(AMEIXA, (80, 50, 70), 0.3))))
    return dict(id='bunting', cel=(64, 16), ancora=(0, 2), q=Q, ms=[160] * 4, loop=True, nota='varal de bandeirolas: prender entre dois predios, no portao e na tela de fim; repete a cada 64 px')


def passaro():
    Q = []; P = [(250, 250, 255), (88, 76, 104), (58, 46, 72)]
    asas = [["#.......#", ".##...##.", "...###...", "....#...."], [".........", "###...###", "...###...", "....#...."], [".........", "...###...", "###.#.###", "........."], [".........", "###...###", "...###...", "....#...."]]
    for a in asas:
        q = np.zeros((6, 11, 4), np.int32); colar(q, de_img(bitmap(a, {'#': P[1]})), 1, 1); Q.append(q)
    return dict(id='bird', cel=(11, 6), ancora=(5, 3), q=Q, ms=[110] * 4, loop=True, nota='passaros de manha e a tarde: 2 a 4 cruzando o ceu devagar (silhueta ameixa-clara)')


def vagalume():
    Q = []
    for f in range(4):
        im, d = _d(9, 9); r = (1, 2, 3, 2)[f]
        if r >= 3:
            for (dx, dy) in ((-3, 0), (3, 0), (0, -3), (0, 3)): _px(d, 4 + dx, 4 + dy, (120, 190, 60))
        if r >= 2: d.point([(3, 4), (5, 4), (4, 3), (4, 5)], LIMA + (255,)); d.point([(3, 3), (5, 5), (3, 5), (5, 3)], (120, 190, 60, 255))
        _px(d, 4, 4, (240, 255, 200) if r > 1 else LIMA)
        Q.append(de_img(im))
    return dict(id='firefly', cel=(9, 9), ancora=(4, 4), q=Q, ms=[180, 140, 220, 140], loop=True, nota='vaga-lumes a noite (boss-night): 6 a 10, vagando devagar; nao escurecem com a luz da hora')


def cisco():
    Q = []
    for f in range(4):
        im, d = _d(5, 5)
        if f == 0: _px(d, 2, 2, CREME)
        elif f == 1: d.point([(2, 2), (3, 2)], CREME + (255,)); _px(d, 2, 3, TERRA[0])
        elif f == 2: d.point([(2, 1), (1, 2), (3, 2), (2, 3)], TERRA[0] + (255,)); _px(d, 2, 2, BR)
        else: _px(d, 2, 2, TERRA[0])
        Q.append(de_img(im))
    return dict(id='dust-mote', cel=(5, 5), ancora=(2, 2), q=Q, ms=[200] * 4, loop=True, nota='poeira no ar sobre a estrada, na luz da tarde: ate 12, subindo devagar')


def raio():
    """Raio do Sparkwright: segmento de 40 px que a tela estica/gira entre os alvos (3 quadros) + faisca na ponta."""
    Q = []; rnd = random.Random(2)
    for f in range(3):
        im, d = _d(40, 13); y = 6; pts = [(0, 6)]
        for x in range(5, 40, 5): pts.append((x, 6 + rnd.choice((-4, -2, 2, 4)) if x < 35 else 6))
        pts.append((39, 6))
        d.line(pts, fill=F['Fizzwick'][0] + (255,), width=3); d.line(pts, fill=(255, 240, 150, 255), width=1)
        for (x, yy) in pts[1:-1:2]: d.line((x, yy, x + rnd.choice((-3, 3)), yy + rnd.choice((-4, 4))), fill=BR + (255,))
        Q.append(pontilhar(de_img(im), (0, 0, 0.45)[f]))
    return dict(id='bolt', cel=(40, 13), ancora=(0, 6), q=Q, ms=[50, 50, 60], nota='raio do Sparkwright: do cajado ao alvo e mais 2 saltos; esticar na horizontal e girar')


def torta():
    Q = []
    for f in range(4):
        im, d = _d(11, 11)
        if f % 2 == 0: d.ellipse((1, 3, 9, 8), fill=(214, 150, 80, 255)); d.ellipse((2, 2, 8, 6), fill=CREME + (255,)); _px(d, 5, 2, (232, 64, 76)); _px(d, 3, 3, BR)
        else: d.ellipse((3, 1, 8, 9), fill=(214, 150, 80, 255)); d.ellipse((2, 2, 6, 8), fill=CREME + (255,)); _px(d, 2, 5, (232, 64, 76)); _px(d, 3, 3, BR)
        Q.append(de_img(_cont(im)))
    for f in range(3):                                         # splat: chantilly espirrando
        im, d = _d(11, 11); r = (2, 4, 5)[f]
        for i in range(6):
            a = i * math.pi / 3 + 0.4; _ret(d, 5 + math.cos(a) * r, 5 + math.sin(a) * r, 5 + math.cos(a) * r + (1 if f < 2 else 0), 5 + math.sin(a) * r, CREME)
        if f < 2: d.ellipse((3, 3, 7, 7), fill=CREME + (255,)); _px(d, 4, 4, BR)
        Q.append(pontilhar(de_img(im), (0, 0, 0.4)[f]))
    return dict(id='pie', cel=(11, 11), ancora=(5, 5), q=Q, anims={'play': dict(quadros=[0, 1, 2, 3], ms=[70] * 4, loop=True), 'splat': dict(quadros=[4, 5, 6], ms=[60, 70, 90], loop=False)}, nota='torta do Pie Thrower: play voando em arco, splat no alvo (fica lento)')


def falcao():
    Q = []; C_ = {'b': (150, 104, 70), 'B': (206, 160, 104), 'o': (104, 64, 48), 'y': OUROS[1], 'k': AMEIXA, 'w': CREME}
    fr = [["..bb.......", ".bBBb......", "..bBBb.bBy.", "...bBBBBBk.", "....oBBwo..", ".....oo...."], [".........By", "..bbbbbBBk.", ".bBBBBBBwo.", "..obBBBo...", "....oo.....", "..........."],
          ["...........", "......bBBy.", "...bbBBBBk.", ".bBBBBBwo..", "bBBbo......", ".bb........"], [".........By", "..bbbbbBBk.", ".bBBBBBBwo.", "..obBBBo...", "....oo.....", "..........."]]
    for a in fr:
        q = np.zeros((8, 13, 4), np.int32); colar(q, de_img(contornar(bitmap(a, C_))), 0, 0); Q.append(q)
    return dict(id='falcon', cel=(13, 8), ancora=(6, 4), q=Q, ms=[80] * 4, loop=True, nota='falcao da Falconer: voa em linha ate o invasor mais longe e volta (aponta para a direita)')


def virote():
    im = bitmap(["..........##.", "rr.nnnnnnnAAA", "rr.nnnnnnnAAA", "..........##."], {'r': (232, 64, 76), 'n': MADEIRA[1], 'A': (236, 240, 248), '#': (176, 186, 210)})
    a = np.zeros((6, 15, 4), np.int32); colar(a, de_img(contornar(im)), 0, 0)
    return dict(id='big-bolt', cel=(15, 6), ancora=(13, 3), q=[a], ms=[1000], nota='virote da Granny Bolt: reto, rapido, com rastro (slash) ao acertar')


def gas():
    """Estouro do Bloater: a explosao do barril com as cores do invasor (lima e roxo)."""
    Q = []
    for q in explosao()['q']:
        o = q.copy(); m = q[..., 3] > 0; lum = q[..., :3].max(axis=2)
        idx = np.clip((255 - lum) // 40, 0, 4)
        pal = np.array(GAS); o[m, :3] = pal[idx[m]]
        Q.append(o)
    return dict(id='gas-burst', cel=(72, 64), ancora=(36, 46), q=Q, ms=[50, 60, 70, 80, 80, 90, 90, 100], nota='Bloater ao cair: dano em area 0,75')


def onda_tambor():
    Q = []
    for f in range(4):
        im, d = _d(48, 20); rx = (8, 14, 19, 23)[f]; ry = rx * 0.36
        d.ellipse((24 - rx, 10 - ry, 24 + rx, 10 + ry), outline=INVASOR[0] + (255,)); d.ellipse((24 - rx + 1, 10 - ry + 1, 24 + rx - 1, 10 + ry - 1), outline=LIMA + (255,))
        Q.append(pontilhar(de_img(im), (0, 0.15, 0.4, 0.7)[f]))
    return dict(id='drum-wave', cel=(48, 20), ancora=(24, 12), q=Q, ms=[80, 80, 90, 100], nota='Drum Bully: anel no chao a cada batida (invasores a ate 1,0 batem mais forte)')


def cura_invasor():
    Q = []
    for f in range(5):
        im, d = _d(20, 24); t = f / 4.0
        for i, (x, v) in enumerate(((4, 1.0), (10, 0.8), (15, 1.1))):
            y = 20 - t * 15 * v; r = 2 if (i + f) % 2 else 1
            d.ellipse((x - r, y - r, x + r, y + r), outline=LIMA + (255,)); _px(d, x - r + 1, y - r + 1, (240, 255, 200))
        Q.append(pontilhar(de_img(im), (0, 0, 0.2, 0.5, 0.8)[f]))
    return dict(id='quack-heal', cel=(20, 24), ancora=(10, 22), q=Q, ms=[80] * 5, nota='Quack curando um invasor: bolhas lima (nunca verdes como a cura do reino)')


def notas_corneta():
    Q = []
    for f in range(4):
        im, d = _d(16, 16)
        for i, (x, y0) in enumerate(((3, 12), (10, 14))):
            y = y0 - f * 3 - i; c = OUROS[1]
            if y > 1: _ret(d, x, y, x + 2, y + 1, c); _ret(d, x + 2, y - 4, x + 2, y, c); _ret(d, x + 3, y - 4, x + 4, y - 3, c); _px(d, x, y, OUROS[0])
        Q.append(pontilhar(de_img(_cont(im, mix(AMEIXA, OUROS[3], 0.3))), (0, 0, 0.2, 0.55)[f]))
    return dict(id='rally-notes', cel=(16, 16), ancora=(8, 14), q=Q, ms=[110] * 4, nota='Rally Horn: notas douradas em cima dos soldados enquanto dura o bonus')


def aura_carta():
    """Brilho de carta rara: aura por tras da carta (68x90, a carta fica no centro) em 4 quadros, branca: pintar na cor da raridade."""
    Q = []
    for f in range(4):
        a = np.zeros((90, 68, 4), np.int32); yy, xx = np.indices((90, 68))
        dx = np.maximum(0, np.maximum(6 - xx, xx - 61)); dy = np.maximum(0, np.maximum(6 - yy, yy - 83)); dist = np.maximum(dx, dy) + (dx > 0) * (dy > 0) * 1
        k = (0.75, 0.9, 1.0, 0.9)[f]
        m = (dist > 0) & (dist <= 6) & (BAYER[(yy + f) % 4, (xx + f) % 4] < (1 - dist / 6.5) * k)
        a[m] = (255, 255, 255, 255)
        for i in range(5):                                      # centelhas que giram
            t = (f / 4.0 + i / 5.0) % 1.0; per = t * (68 + 90) * 2
            if per < 68: x, y = per, 2
            elif per < 158: x, y = 65, per - 68
            elif per < 226: x, y = 226 - per, 87
            else: x, y = 2, 316 - per
            x, y = int(min(66, max(1, x))), int(min(88, max(1, y)))
            for (ex, ey) in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): a[min(89, max(0, y + ey)), min(67, max(0, x + ex))] = (255, 255, 255, 255)
        Q.append(a)
    return dict(id='card-glow', cel=(68, 90), ancora=(6, 6), q=Q, ms=[140] * 4, loop=True, nota='aura ATRAS da carta Rare/Epic/Legendary (carta em 6,6): pintar com a cor da raridade; rarity-shine passa por cima')


def poeira_passo():
    Q = []
    for f in range(3):
        im, d = _d(10, 6); r = (1, 2, 2)[f]
        _bola(d, 3 - f, 4 - f * 0.5, r, TERRA[0]); _bola(d, 7 + f * 0.5, 4 - f, r - 0.5, TERRA[1])
        Q.append(pontilhar(de_img(im), (0, 0.3, 0.65)[f]))
    return dict(id='step-dust', cel=(10, 6), ancora=(5, 5), q=Q, ms=[70, 80, 90], nota='poeirinha em cada passo de quem anda (no contato do pe)')


def montar():
    out = []
    for e in (piche(), abelhas(), corneta(), repeteco(), segundos(), finale(), fogos(), bandeirolas(), passaro(), vagalume(), cisco(), raio(), torta(), falcao(), virote(), gas(),
              onda_tambor(), cura_invasor(), notas_corneta(), aura_carta(), poeira_passo()):
        an = e.get('anims') or {'play': dict(quadros=list(range(len(e['q']))), ms=e['ms'], loop=bool(e.get('loop')))}
        p = dict(id=e['id'], nome=e.get('nome', e['id']), tipo=e.get('tipo', 'efeito'), cel=e['cel'], ancora=e['ancora'], variantes=[e['q']], anims=an, nova=True)
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
    ampliar(o, 3).save(sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, 'prova', 'efeitos2-quadros.png'))
