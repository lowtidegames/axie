"""Cartas e interface do piloto (R9), 100% por codigo: moldura por raridade (material), faixa da familia, selo do tipo,
ilustracao das 10 cartas (a propria peca em pose), costas, pinos de nivel 1-5, icones, botoes, painel, moldura de espolio,
selo LEVEL UP e as fontes em pixel (Reino 5x7 e Mini 3x5) com mapa de glifos. Textos do jogo em ingles."""
import os, sys, math
sys.dont_write_bytecode = True
import numpy as np
from comum import *
import fonte

PAINEL = [(98, 76, 124), (58, 42, 78), (44, 32, 62)]
CARMIM = [(236, 96, 84), (204, 60, 62), (140, 36, 56)]
VERDE = [(120, 200, 92), (70, 156, 72), (40, 104, 64)]

# ---------------------------------------------------------------- fonte mini 3x5 (nomes compridos na faixa da carta)
_M = {'A': ".#./#.#/###/#.#/#.#", 'B': "##./#.#/##./#.#/##.", 'C': ".##/#../#../#../.##", 'D': "##./#.#/#.#/#.#/##.", 'E': "###/#../##./#../###",
      'F': "###/#../##./#../#..", 'G': ".##/#../#.#/#.#/.##", 'H': "#.#/#.#/###/#.#/#.#", 'I': "#/#/#/#/#", 'J': "..#/..#/..#/#.#/.#.",
      'K': "#.#/#.#/##./#.#/#.#", 'L': "#../#../#../#../###", 'M': "#...#/##.##/#.#.#/#...#/#...#", 'N': "#..#/##.#/#.##/#..#/#..#", 'O': ".#./#.#/#.#/#.#/.#.",
      'P': "##./#.#/##./#../#..", 'Q': ".#./#.#/#.#/#.#/.##", 'R': "##./#.#/##./#.#/#.#", 'S': ".##/#../.#./..#/##.", 'T': "###/.#./.#./.#./.#.",
      'U': "#.#/#.#/#.#/#.#/###", 'V': "#.#/#.#/#.#/#.#/.#.", 'W': "#...#/#...#/#.#.#/##.##/#...#", 'X': "#.#/#.#/.#./#.#/#.#", 'Y': "#.#/#.#/.#./.#./.#.",
      'Z': "###/..#/.#./#../###", '0': ".#./#.#/#.#/#.#/.#.", '1': ".#/##/.#/.#/.#", '2': "##./..#/.#./#../###", '3': "##./..#/.#./..#/##.",
      '4': "#.#/#.#/###/..#/..#", '5': "###/#../##./..#/##.", '6': ".##/#../###/#.#/###", '7': "###/..#/.#./.#./.#.", '8': "###/#.#/###/#.#/###",
      '9': "###/#.#/###/..#/##.", ' ': "../../../../..", '!': "#/#/#/./#", '+': ".../.#./###/.#./...", '-': ".../.../###/.../...", 'x': ".../#.#/.#./#.#/...",
      '.': "././././#", ':': "./#/./#/.", '/': "..#/..#/.#./#../#..", '%': "#.#/..#/.#./#../#.#", "'": "#/#/././.", '&': ".#./#.#/.#./#.#/.##", '?': "##./..#/.#./.../.#."}


def mini_larg(s): return sum(len(_M.get(c, _M['?']).split('/')[0]) + 1 for c in s.upper()) - 1 if s else 0


def mini(im, x, y, s, cor=CREME, sombra=None, centro=False):
    s = s.upper()
    if centro: x -= mini_larg(s) // 2
    px = im.load(); W, H = im.size
    for c in s:
        g = _M.get(c, _M['?']).split('/')
        for j, l in enumerate(g):
            for i, v in enumerate(l):
                if v == '#':
                    if sombra and 0 <= x + i < W and 0 <= y + j + 1 < H: px[x + i, y + j + 1] = tuple(sombra) + (255,)
        for j, l in enumerate(g):
            for i, v in enumerate(l):
                if v == '#' and 0 <= x + i < W and 0 <= y + j < H: px[x + i, y + j] = tuple(cor) + (255,)
        x += len(g[0]) + 1


def folha_fontes():
    """Uma imagem com as linhas de glifos + o mapa. Fontes: reino (branca, 7 px), reino-contorno (creme com contorno ameixa),
    reino-ouro (dano critico), mini (branca, 5 px), mini-contorno."""
    chars_r = [c for c in fonte._G.keys()]
    chars_m = [c for c in _M.keys()]
    linhas = []; mapa = {}
    def linha(nome, chars, glifo, alt, cor, cont):
        pad = 1 if cont else 0
        larg = sum(len(glifo[c].split('/')[0]) + 2 * pad + 1 for c in chars)
        im = tela(larg, alt + 2 * pad); x = 0; g = {}
        for c in chars:
            ls = glifo[c].split('/'); w = len(ls[0])
            t = tela(w, alt); px = t.load()
            for j, l in enumerate(ls):
                for i, v in enumerate(l):
                    if v == '#': px[i, j] = tuple(cor) + (255,)
            if cont: t = contornar(t, AMEIXA, diag=True)
            im.alpha_composite(t, (x, 0)); g[c] = [x, 0, w + 2 * pad, alt + 2 * pad]; x += w + 2 * pad + 1
        linhas.append((nome, im, g, dict(altura=alt + 2 * pad, espaco=1 - 2 * pad, contorno=bool(cont))))
    linha('reino', chars_r, fonte._G, 7, (255, 255, 255), False)
    linha('reino-contorno', chars_r, fonte._G, 7, CREME, True)
    linha('reino-ouro', chars_r, fonte._G, 7, OURO, True)
    linha('mini', chars_m, _M, 5, (255, 255, 255), False)
    linha('mini-contorno', chars_m, _M, 5, CREME, True)
    W = max(l[1].width for l in linhas); H = sum(l[1].height + 1 for l in linhas)
    im = tela(W, H); y = 0; fontes = {}
    for (nome, li, g, meta) in linhas:
        im.alpha_composite(li, (0, y))
        fontes[nome] = dict(meta, glifos={c: [r[0], r[1] + y, r[2], r[3]] for c, r in g.items()})
        y += li.height + 1
    return im, fontes


# ---------------------------------------------------------------- icones (9x9 + contorno = 11x11)
C = {'r': (232, 64, 76), 'R': (255, 170, 170), 'd': (160, 40, 60), 'v': (88, 70, 110), 'V': (118, 100, 140),
     'o': (255, 214, 80), 'O': (255, 246, 190), 'y': (214, 150, 40), 'w': (240, 236, 226), 'W': (255, 255, 255), 'k': AMEIXA,
     'p': PEDRA[1], 'P': PEDRA[0], 'q': PEDRA[2], 'm': MADEIRA[0], 'n': MADEIRA[1], 'N': MADEIRA[2], 'b': (72, 132, 232), 'B': (170, 210, 255), 'c': (40, 66, 150),
     'i': INVASOR[1], 'I': INVASOR[0], 'j': INVASOR[2], 'l': LIMA, 'g': VERDE[1], 'G': VERDE[0], 'e': CREME, 'a': (176, 186, 210), 'A': (236, 240, 248), 's': (108, 116, 150)}
ICONES = {
 'life': [".rr...rr.", "rRrr.rrrr", "rRrrrrrrr", "rrrrrrrrr", "rrrrrrrrd", ".rrrrrrd.", "..rrrrd..", "...rrd...", "....d...."],
 'life-empty': [".vv...vv.", "vVvv.vvvv", "vvvvvvvvv", "vvvvvvvvv", "vvvvvvvvv", ".vvvvvvv.", "..vvvvv..", "...vvv...", "....v...."],
 'gold': ["..ooooo..", ".oOoooyo.", "oOooyooyo", "oOoyoyoyo", "oooyoyoyo", "oooyoyoyo", "ooooyooyy", ".ooooyyy.", "..yyyyy.."],
 'round': ["...PPP...", "..PPppp..", ".PPpppppq", ".PpkpkpPq", ".PpkpkpPq", ".PpkkkpPq", ".PpppppPq", "GPPpppppq", "gGgqqqqgg"],          # marco de milha (Keepmile)
 'speed': ["e...e....", "ee..ee...", "eee.eee..", "eeeeeeee.", "eeeeeeeee", "eeeeeeee.", "eee.eee..", "ee..ee...", "e...e...."],
 'play': [".e.......", ".ee......", ".eeee....", ".eeeeee..", ".eeeeeee.", ".eeeeee..", ".eeee....", ".ee......", ".e......."],
 'pause': [".........", ".ee...ee.", ".ee...ee.", ".ee...ee.", ".ee...ee.", ".ee...ee.", ".ee...ee.", ".ee...ee.", "........."],
 'sound-on': ["....e....", "...ee..e.", "eeeee...e", "eeeee.e.e", "eeeee.e.e", "eeeee.e.e", "eeeee...e", "...ee..e.", "....e...."],
 'sound-off': ["....e....", "...ee....", "eeeee.r.r", "eeeee.r.r", "eeeee..r.", "eeeee.r.r", "eeeee.r.r", "...ee....", "....e...."],
 'loot': [".........", ".mmmmmmm.", "mMnnonnnN", "mnnnonnnN", "NNNoooNNN", "mnnoOonnN", "mnnnonnnN", "mnnnnnnnN", ".NNNNNNN."],
 'boss': ["w.......w", "ww.....ww", ".wiiiiiw.", ".iIiiiii.", ".iliiili.", ".illiill.", ".iiiiiij.", "..iwiwj..", "...jjj..."],
 'shield': ["bbbbbbbbb", "bBBbbbbbc", "bBbbbbbbc", "bBbbbbbbc", "bbbbbbbbc", ".bbbbbbc.", ".bbbbbcc.", "..bbbcc..", "...ccc..."],
 'horn': ["i.......i", "iI.....ij", "iiI...iij", ".iiiiiij.", ".ilIiilj.", ".iliiilj.", ".iiiiiij.", "..iwiwj..", "...jjj..."],
 'troop': [".......AA", "......AAa", ".....AAa.", "....AAa..", "o..AAa...", ".oAAa....", ".yoo.....", "n.yo.....", "nn......."],
 'building': [".PPPPPP..", "PPppppq..", "PPppppq..", ".qqmqq...", "...mn....", "....mn...", ".....mn..", "......mn.", ".......N."],
 'magic': ["....o....", "....o....", "...oOo...", "oooOOOooo", ".ooOOOoy.", "..oooyy..", "..oyoyy..", ".oy...yy.", ".y.....y."],
 'reroll': ["..eeeee..", ".e.....e.", "e.......e", "e.....eee", "e......e.", "e........", "e.......e", ".e.....e.", "..eeeee.."],
 'up': ["....g....", "...gGg...", "..gGggg..", ".gGggggg.", "gggGggggg", "...Ggg...", "...Ggg...", "...ggg...", "...ggg..."],
 'pudding': ["...ooo...", "...oOo...", "..RrrrR..", ".mmnnnnn.", ".mMnnnnN.", "mmnnnnnnN", "mMnnnnnnN", "wwwwwwwww", ".WWWWWWa."],        # o Crown Pudding
 'pin-on': ["yyyyy", "yOooy", "yoooy", "yoooy", "yyyyy"], 'pin-off': ["vvvvv", "vVVVv", "vVVVv", "vVVVv", "vvvvv"],
}


def icone(nome):
    b = bitmap(ICONES[nome], dict(C, M=(236, 190, 130)))
    if nome.startswith('pin'): return b
    return contornar(b, AMEIXA)


# ---------------------------------------------------------------- botoes, painel, espolio, selo
def botao(w, h, cor, apertado=False, ic=None, texto_=None):
    im = tela(w, h + 2); d = ImageDraw.Draw(im); y = 2 if apertado else 0
    d.rectangle((1, y, w - 2, h + 1), fill=AMEIXA + (255,)); d.rectangle((0, y + 1, w - 1, h), fill=AMEIXA + (255,))
    if not apertado: d.rectangle((1, h - 3, w - 2, h), fill=cor[2] + (255,))
    d.rectangle((1, y + 1, w - 2, y + h - 4), fill=cor[1] + (255,)); d.rectangle((2, y + 1, w - 3, y + 2), fill=cor[0] + (255,))
    d.point([(1, y + 1), (w - 2, y + 1)], mix(cor[1], AMEIXA, 0.4) + (255,))
    if ic:
        s = icone(ic); im.alpha_composite(s, ((w - s.width) // 2, y + (h - 3 - s.height) // 2 + 1))
    if texto_: fonte.texto(im, w // 2, y + (h - 3 - 7) // 2 + 1, texto_, CREME, sombra=cor[2], centro=True)
    return im


def painel(w, h):
    im = tela(w, h); d = ImageDraw.Draw(im)
    d.rectangle((1, 0, w - 2, h - 1), fill=AMEIXA + (255,)); d.rectangle((0, 1, w - 1, h - 2), fill=AMEIXA + (255,))
    d.rectangle((1, 1, w - 2, h - 2), fill=PAINEL[1] + (255,)); d.rectangle((2, 1, w - 3, 1), fill=PAINEL[0] + (255,)); d.rectangle((2, h - 2, w - 3, h - 2), fill=PAINEL[2] + (255,))
    return im


def moldura_espolio(tipo):
    """Moldura do espolio (36x44): Card, Promotion, Purse - o desenho diz o que e, sem depender de cor."""
    im = painel(44, 44); d = ImageDraw.Draw(im)
    d.rectangle((3, 3, 40, 30), fill=PAINEL[2] + (255,)); d.rectangle((3, 3, 40, 3), fill=AMEIXA + (255,))
    for (x, y) in ((2, 2), (41, 2), (2, 41), (41, 41)): d.point((x, y), OURO + (255,))
    if tipo == 'Card':
        c = tela(15, 21); dc = ImageDraw.Draw(c)
        dc.rectangle((0, 0, 14, 20), fill=RARIDADE['Common'][1] + (255,)); dc.rectangle((0, 0, 14, 0), fill=RARIDADE['Common'][0] + (255,))
        dc.rectangle((2, 2, 12, 5), fill=FAMILIA['Pikewall'][1] + (255,)); dc.rectangle((2, 7, 12, 14), fill=(150, 210, 244, 255)); dc.rectangle((2, 13, 12, 14), fill=GRAMA[1] + (255,)); dc.rectangle((2, 16, 12, 18), fill=CREME + (255,))
        im.alpha_composite(contornar(c), (14, 5))
    elif tipo == 'Promotion':
        s = ampliar(bitmap(ICONES['up'], C), 2); im.alpha_composite(contornar(s, AMEIXA), (12, 6))
        im.alpha_composite(icone('pin-on'), (32, 6)); im.alpha_composite(icone('pin-on'), (7, 22))
    else:
        b = bitmap(["...nnn....", "..nmmmn...", "...NNN..o.", "..mmmmm.oO", ".mmMmmmn.o", "mmMmmmmnn.", "mmmmmmmnnN", "mmmmmmnnnN", ".mmmmnnnN.", "..NNNNNN.."], dict(C, M=(236, 190, 130)))
        im.alpha_composite(contornar(ampliar(b, 2), AMEIXA), (10, 5)); im.alpha_composite(icone('gold'), (27, 19))
    mini(im, 22, 34, tipo, CREME, sombra=AMEIXA, centro=True)
    return im


def selo_levelup(quadro):
    w = 46; im = tela(w, 13); d = ImageDraw.Draw(im); O = [(255, 246, 190), (255, 214, 80), (214, 150, 40)]
    d.rectangle((1, 1, w - 2, 11), fill=AMEIXA + (255,)); d.rectangle((0, 3, w - 1, 9), fill=AMEIXA + (255,))
    d.rectangle((2, 2, w - 3, 10), fill=O[1] + (255,)); d.rectangle((2, 2, w - 3, 2), fill=O[0] + (255,)); d.rectangle((2, 10, w - 3, 10), fill=O[2] + (255,))
    d.rectangle((1, 4, 1, 8), fill=O[2] + (255,)); d.rectangle((w - 2, 4, w - 2, 8), fill=O[2] + (255,))
    mini(im, w // 2, 4, 'LEVEL UP!', AMEIXA, centro=True)
    x = (6, 18, 30, 42)[quadro]
    for i in range(3):
        if 2 <= x + i - (0) <= w - 3:
            for y in range(2, 11):
                xx = x + (10 - y) // 3
                if 2 <= xx <= w - 3 and im.getpixel((xx, y))[:3] == O[1]: im.putpixel((xx, y), (255, 255, 255, 255))
        break
    return im


def etiqueta(s, cor=CARMIM):
    """Etiqueta de aviso em cima da carta, ex.: '1 TO GO'."""
    w = mini_larg(s) + 8; im = tela(w, 12); d = ImageDraw.Draw(im)
    d.rectangle((1, 0, w - 2, 9), fill=AMEIXA + (255,)); d.rectangle((0, 1, w - 1, 8), fill=AMEIXA + (255,))
    d.rectangle((1, 1, w - 2, 8), fill=cor[1] + (255,)); d.rectangle((1, 1, w - 2, 1), fill=cor[0] + (255,))
    mini(im, w // 2, 3, s, CREME, sombra=cor[2], centro=True)
    d.point([(w // 2 - 1, 10), (w // 2, 10), (w // 2 + 1, 10), (w // 2, 11)], AMEIXA + (255,))
    return im


# ---------------------------------------------------------------- cartas
CW, CH = 56, 78
PINOS = [[14 + i * 6, 70] for i in range(5)]      # canto de cada pino (5x5) na carta
TEXTO_FORCA = [34, 57]                            # centro-topo do texto de forca (ex.: 'x3') na carta


def moldura(rar):
    R = RARIDADE[rar]; im = tela(CW, CH); d = ImageDraw.Draw(im)
    d.rectangle((1, 0, CW - 2, CH - 1), fill=AMEIXA + (255,)); d.rectangle((0, 1, CW - 1, CH - 2), fill=AMEIXA + (255,))
    d.rectangle((1, 1, CW - 2, CH - 2), fill=R[1] + (255,))
    d.rectangle((1, 1, CW - 2, 1), fill=R[0] + (255,)); d.rectangle((1, 1, 1, CH - 2), fill=R[0] + (255,))
    d.rectangle((2, CH - 2, CW - 2, CH - 2), fill=R[2] + (255,)); d.rectangle((CW - 2, 2, CW - 2, CH - 2), fill=R[2] + (255,))
    if rar == 'Common':                                         # madeira: veios e nos
        for y in range(6, CH - 4, 9): d.point([(2, y), (2, y + 1), (CW - 3, y + 4), (CW - 3, y + 5)], R[2] + (255,))
        for x in range(8, CW - 6, 11): d.point([(x, 2), (x + 1, 2), (x + 5, CH - 3)], R[2] + (255,))
    elif rar == 'Uncommon':                                     # bronze: rebites
        for (x, y) in [(2, 2), (CW - 3, 2), (2, CH - 3), (CW - 3, CH - 3)] + [(2, y) for y in range(14, CH - 8, 12)] + [(CW - 3, y) for y in range(14, CH - 8, 12)]:
            d.point((x, y), R[0] + (255,)); d.point((x, y + 1), R[2] + (255,))
    elif rar == 'Rare':                                         # prata: polida, com reflexos
        for y in range(5, CH - 6, 11): d.point([(2, y), (2, y + 1), (2, y + 2), (CW - 3, y + 5)], (255, 255, 255, 255))
        for x in range(6, CW - 6, 13): d.point([(x, 2), (x + 1, 2), (x + 2, 2)], (255, 255, 255, 255))
    elif rar == 'Epic':                                         # jade: pedras nos cantos
        for (x, y) in ((1, 1), (CW - 4, 1), (1, CH - 4), (CW - 4, CH - 4)):
            d.rectangle((x, y, x + 2, y + 2), fill=(255, 255, 255, 255)); d.rectangle((x + 1, y + 1, x + 2, y + 2), fill=R[0] + (255,)); d.point((x + 2, y + 2), R[2] + (255,))
        for y in range(10, CH - 8, 8): d.point([(2, y), (CW - 3, y + 4)], R[0] + (255,))
    else:                                                       # ouro: cantoneiras e brilho
        for (x, y, sx, sy) in ((1, 1, 1, 1), (CW - 2, 1, -1, 1), (1, CH - 2, 1, -1), (CW - 2, CH - 2, -1, -1)):
            for i in range(5): d.point([(x + sx * i, y), (x, y + sy * i)], (255, 255, 255, 255))
            d.point((x + sx, y + sy), R[0] + (255,))
        for y in range(9, CH - 8, 7): d.point([(2, y), (CW - 3, y + 3)], (255, 255, 255, 255))
        d.point([(CW // 2, 0), (CW // 2 - 1, 0), (CW // 2 + 1, 0)], R[0] + (255,))
    d.rectangle((3, 3, CW - 4, CH - 4), fill=AMEIXA + (255,)); d.rectangle((4, 4, CW - 5, CH - 5), fill=(252, 238, 206, 255))
    d.rectangle((4, 53, CW - 5, 53), fill=(232, 212, 172, 255))
    for p in PINOS: im.alpha_composite(icone('pin-off'), tuple(p))
    return im


def _nome(im, nome, F):
    d = ImageDraw.Draw(im)
    d.rectangle((4, 4, CW - 5, 16), fill=F[1] + (255,)); d.rectangle((4, 4, CW - 5, 4), fill=F[0] + (255,)); d.rectangle((4, 16, CW - 5, 16), fill=F[2] + (255,)); d.rectangle((4, 17, CW - 5, 17), fill=AMEIXA + (255,))
    ps = nome.upper().split(' ')
    if len(ps) == 1 and fonte.largura(ps[0]) <= 44: fonte.texto(im, CW // 2, 7, ps[0], CREME, sombra=F[2], centro=True)
    elif len(ps) == 1: mini(im, CW // 2, 8, ps[0], CREME, sombra=F[2], centro=True)
    else:
        mini(im, CW // 2, 5, ps[0], CREME, sombra=F[2], centro=True); mini(im, CW // 2, 11, ' '.join(ps[1:]), CREME, sombra=F[2], centro=True)


def carta(nome, familia, rar, tipo, arte, fundo='dia'):
    """Carta 56x78 sem pinos acesos e sem o numero de forca (a tela poe: PINOS e TEXTO_FORCA no atlas)."""
    im = moldura(rar); d = ImageDraw.Draw(im); F = FAMILIA[familia]
    _nome(im, nome, F)
    jx0, jy0, jx1, jy1 = 4, 18, CW - 5, 52
    ceu = {'dia': [(88, 164, 236), (150, 210, 244), (214, 240, 248)], 'magia': [(52, 40, 104), (110, 64, 150), (226, 130, 150)]}[fundo]
    for y in range(jy0, jy1 + 1):
        t = (y - jy0) / float(jy1 - jy0)
        for x in range(jx0, jx1 + 1):
            tb = min(1, max(0, math.floor(t * 5 + BAYER[y % 4, x % 4]) / 5.0))
            d.point((x, y), (mix(ceu[0], ceu[1], tb * 2) if tb < 0.5 else mix(ceu[1], ceu[2], tb * 2 - 1)) + (255,))
    if fundo == 'dia':
        for (x, y, r) in ((13, 26, 4), (18, 25, 5), (24, 27, 3), (41, 31, 3), (45, 30, 4)): d.ellipse((x - r, y - r, x + r, y + r - 1), fill=(255, 255, 255, 255))
    else:
        for (x, y) in ((9, 22), (46, 25), (14, 33), (41, 21), (30, 20)): d.point((x, y), (255, 255, 255, 255))
    d.rectangle((jx0, 46, jx1, jy1), fill=GRAMA[1] + (255,)); d.rectangle((jx0, 46, jx1, 46), fill=GRAMA[0] + (255,)); d.rectangle((jx0, 50, jx1, jy1), fill=TERRA[1] + (255,)); d.rectangle((jx0, 50, jx1, 50), fill=TERRA[0] + (255,))
    for x in range(jx0 + 2, jx1, 7): d.point((x, 48), GRAMA[2] + (255,)); d.point((x + 3, 51), TERRA[2] + (255,))
    s = arte
    if s.height > 35: s = s.crop((0, 0, s.width, 35)) if tipo == 'tropa' else s.crop((0, s.height - 35, s.width, s.height))
    if s.width > 48: s = s.crop(((s.width - 48) // 2, 0, (s.width - 48) // 2 + 48, s.height))
    ox = jx0 + ((jx1 - jx0 + 1) - s.width) // 2
    d.ellipse((ox + s.width // 2 - 9, 49, ox + s.width // 2 + 9, 52), fill=mix(TERRA[2], AMEIXA, 0.3) + (255,))
    im.alpha_composite(s, (ox, 52 - s.height))
    d.rectangle((jx0, jy1 + 1, jx1, jy1 + 1), fill=AMEIXA + (255,))
    R = RARIDADE[rar]                                           # selo do tipo
    d.ellipse((3, 52, 17, 66), fill=AMEIXA + (255,)); d.ellipse((4, 53, 16, 65), fill=R[0] + (255,)); d.ellipse((5, 54, 15, 64), fill=PAINEL[1] + (255,))
    ic = bitmap(ICONES[{'tropa': 'troop', 'construcao': 'building', 'magia': 'magic'}[tipo]], C)
    im.alpha_composite(ic, (6, 55))
    return im


def costas():
    im = moldura('Common'); d = ImageDraw.Draw(im)
    d.rectangle((4, 4, CW - 5, CH - 5), fill=PAINEL[1] + (255,))
    for y in range(4, CH - 4):
        for x in range(4, CW - 4):
            if ((x + y) % 8 == 0) or ((x - y) % 8 == 0): d.point((x, y), PAINEL[2] + (255,))
            if ((x + y) % 8 == 4) and ((x - y) % 8 == 4): d.point((x, y), PAINEL[0] + (255,))
    d.ellipse((14, 25, 41, 52), fill=AMEIXA + (255,)); d.ellipse((15, 26, 40, 51), fill=OURO + (255,)); d.ellipse((17, 28, 38, 49), fill=PAINEL[1] + (255,))
    im.alpha_composite(ampliar(bitmap(ICONES['round'], C), 2), (19, 30))               # marco de milha: a marca do jogo
    d.rectangle((6, 6, CW - 7, 6), fill=OURO + (255,)); d.rectangle((6, CH - 7, CW - 7, CH - 7), fill=(214, 150, 40, 255))
    d.rectangle((6, 6, 6, CH - 7), fill=OURO + (255,)); d.rectangle((CW - 7, 6, CW - 7, CH - 7), fill=(214, 150, 40, 255))
    return im


if __name__ == '__main__':
    im, f = folha_fontes(); print(im.size, list(f))
    o = Image.new('RGBA', (700, 220), (96, 150, 92, 255)); o.alpha_composite(im.crop((0, 0, 700, im.height)), (2, 2)); x = 2
    for n in ICONES: s = icone(n); o.alpha_composite(s, (x, 60)); x += s.width + 3
    x = 2
    for r in RARIDADE: o.alpha_composite(moldura(r), (x, 80)); x += 58
    o.alpha_composite(costas(), (x, 80)); x += 58
    for t in ('Card', 'Promotion', 'Purse'): o.alpha_composite(moldura_espolio(t), (x, 80)); x += 38
    o.alpha_composite(botao(24, 24, VERDE, ic='speed'), (x, 80)); o.alpha_composite(botao(24, 24, VERDE, True, ic='speed'), (x + 26, 80)); o.alpha_composite(botao(96, 24, VERDE, texto_='PLAY AGAIN'), (x, 110))
    o.alpha_composite(selo_levelup(1), (x, 140)); o.alpha_composite(etiqueta('1 TO GO'), (x + 50, 140))
    ampliar(o, 3).save(sys.argv[1])
