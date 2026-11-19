"""Construcoes do piloto (R9): Smithy, Watchtower, Cookhouse em vista de frente, 3 estagios (nivel 1, 3, 5) e efeito vivo.
Do gerador vem so a casa-base (familia editada da MESMA casa, mesmo angulo). Por codigo: tirar a base de grama, contorno,
alicerce de pedra, enfeites de nivel, bandeirola que balanca, fumaca, brasa e fogo que pisca (4 quadros por nivel).
Tambem: castelo em 3 estados de dano, portao, terreno vazio (6, com numero) e bandeira de familia."""
import os, sys, math, random
sys.dont_write_bytecode = True
import numpy as np
from comum import *

CEL = (80, 72); CHAO = 70; AX = 40
FOGO = [(255, 250, 210), (255, 214, 80), (250, 140, 40), (214, 70, 40)]
FUMO = [(236, 232, 240), (196, 190, 208), (150, 142, 170)]


def contorno_cor(a, forca=0.34):
    """Contorno de cenario: 1 px por fora com a cor do vizinho escurecida e puxada para a ameixa."""
    a = np.pad(a, ((1, 1), (1, 1), (0, 0)))
    al = a[..., 3] > 0
    soma = np.zeros(a.shape[:2] + (3,)); n = np.zeros(a.shape[:2])
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        s = np.roll(a, (dy, dx), axis=(0, 1)); m = s[..., 3] > 0
        soma += s[..., :3] * m[..., None]; n += m
    novo = (~al) & (n > 0)
    cor = soma[novo] / n[novo][:, None]
    a[novo, :3] = (cor * forca + np.array(AMEIXA) * (1 - forca) * 0.9).astype(np.int32); a[novo, 3] = 255
    return a


def _verde(a, y0):
    """Apaga a base de grama que vem assada (verde e caminho bege nas ultimas linhas)."""
    import colorsys
    for y in range(y0, a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x, 3]:
                h, s, v = colorsys.rgb_to_hsv(*(a[y, x, :3] / 255.0))
                if 62 <= h * 360 <= 170 and s > 0.2: a[y, x] = 0
    return a


def _vivo(a, sat=1.12, con=1.08):
    """Um pouco mais de cor e contraste, para a casa ficar tao viva quanto o boneco."""
    def fn(h, s, v, y, x): return (h, s * sat, 0.5 + (v - 0.5) * con)
    return hsv_mapa(a, fn)


def base(nome):
    a = abrir(nome)
    if nome.startswith('cookhouse'):
        a[41:] = 0; a = _verde(a, 37); a[36:, :11] = 0; a[39:, 40:] = 0
    elif nome.startswith('smithy'):
        a[41:] = 0; a = _verde(a, 38); a[41, :] = 0
    else:
        a[42:] = 0; a = _verde(a, 39); a[1:8, 30:] = 0        # tira a bandeira gerada: a do codigo balanca
    a = tirar_ilhas(a, 8)
    b = caixa(a)
    return _vivo(a[b[1]:b[3], b[0]:b[2]]), b


# ---------------------------------------------------------------- enfeites por codigo (bitmaps pequenos, luz de cima-esquerda)
M = {'m': MADEIRA[0], 'n': MADEIRA[1], 'o': MADEIRA[2], 'p': PEDRA[0], 'q': PEDRA[1], 'r': PEDRA[2], 's': PEDRA[3],
     'a': (214, 222, 236), 'A': (255, 255, 255), 'c': (150, 160, 184), 'g': OURO, 'G': (255, 246, 190), 'h': (214, 150, 40),
     'k': (58, 46, 72), 'K': (88, 76, 104), 'e': (240, 226, 190), 'E': (255, 250, 230), 'f': (206, 180, 130), 'v': GRAMA[1], 'V': GRAMA[0],
     'R': (232, 64, 76), 'S': (160, 40, 60), 'y': (250, 200, 90), 'Y': (255, 232, 150), 'z': (198, 130, 60)}
BARRIL = bitmap([".mmmm.", "mmnnno", "kkkkkk", "mnnnno", "mnnnno", "kkkkkk", "mnnnno", ".nnno."], M)
CAIXOTE = bitmap(["mmmmmmm", "mnnonnn", "mnonnno", "monnnno", "mnnnnoo", "mnnnono", "ooooooo"], M)
SACO = bitmap(["..ee..", ".effe.", "eEeeff", "eEeeef", "eeeeff", ".efff."], M)
ESPADAS = bitmap([".a...a.", ".a...a.", ".a...a.", ".a...a.", ".a...a.", "ggg.ggg", ".n...n.", "ooooooo", "o.....o", "o.....o"], M)
ARMADURA = bitmap(["..aa..", ".aAaa.", ".acca.", "aaAaaa", "aaaaca", ".aaac.", "..nn..", "..nn..", ".oooo."], M)
ALVO = bitmap(["..eee..", ".eRRRe.", "eRReRRe", "eReRSRe", "eRReSRe", ".eRSSe.", "..eee..", "..n.n..", ".n...n."], M)
ALJAVA = bitmap(["E.E.E", "e.e.e", "nmmmn", "nmnmo", "nmmno", "nnnoo", ".ooo."], M)
MESA = bitmap([".zzYz...", "zyYyyz..", "mmmmmmmm", "nnnnnnno", ".n....n.", ".n....n.", ".o....o."], M)
LAMPIAO = bitmap([".kk.", "kYYk", "kYGk", "kyyk", ".kk."], M)
ANCORA_OURO = bitmap(["gG", "hg"], M)   # ponteira dourada de nivel 5


def _poe(im, spr, x, base_y, cont=True):
    s = contornar(spr, mix(AMEIXA, (90, 60, 60), 0.2)) if cont else spr
    im.alpha_composite(s, (int(x), int(base_y - s.height + (1 if cont else 0))))


def bandeirola(cor, quadro, w=9, h=6):
    """Bandeirola lisa (sem simbolo) que ondula: 4 quadros."""
    im = tela(w + 2, h + 4); px = im.load()
    for x in range(w):
        dy = int(round(math.sin((x / 2.2) - quadro * math.pi / 2) * (1.0 if x > 1 else 0)))
        alt = max(1, h - (x * h) // (w + 1))
        for y in range(alt):
            c = cor[0] if y == 0 else (cor[2] if y >= alt - 1 and alt > 2 else cor[1])
            if (x + quadro) % 5 == 4 and 0 < y < alt - 1: c = cor[2]
            px[x + 1, 2 + dy + y + (h - alt) // 2] = c + (255,)
    return contornar(im, mix(AMEIXA, cor[2], 0.3))


def fumaca_pts(rnd, x, y, quadro, n=4, sobe=14, vento=4):
    """Baforadas de fumaca subindo em 4 quadros (laco perfeito). Devolve [(x, y, raio, tom)]."""
    out = []
    for i in range(n):
        t = ((quadro / 4.0) + i / float(n)) % 1.0
        out.append((x + vento * t * t * 1.4 + math.sin(i * 2.1) * 1.2, y - sobe * t, 1.2 + 2.2 * math.sin(t * math.pi) + (0.6 if i % 2 else 0), 0 if t < 0.4 else (1 if t < 0.75 else 2)))
    return out


def desenha_fumaca(im, pts):
    d = ImageDraw.Draw(im)
    for (x, y, r, tom) in sorted(pts, key=lambda p: -p[3]):
        d.ellipse((x - r, y - r, x + r, y + r), fill=FUMO[tom] + (255,))
        if r > 2: d.point((int(x - r * 0.4), int(y - r * 0.4)), (255, 255, 255, 255))


def pisca_fogo(a, quadro, caixa_fogo):
    """Fogo que pisca: nos pixels quentes da caixa, troca o tom por quadro."""
    x0, y0, x1, y1 = caixa_fogo; o = a.copy(); y1 = min(y1, a.shape[0]); x1 = min(x1, a.shape[1])
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b, al = o[y, x]
            if al and r > 200 and g > 90 and b < 150 and r - b > 80:
                k = (x * 3 + y * 5 + quadro * 7) % 4
                lum = (g - 90) / 165.0
                i = max(0, min(3, int(3 - lum * 3 + (1 if k == 0 else (-1 if k == 2 else 0)))))
                o[y, x, :3] = FOGO[i]
    return o


def alicerce(im, x0, x1, y, alt):
    d = ImageDraw.Draw(im)
    d.rectangle((x0, y - alt, x1, y - 1), fill=PEDRA[2] + (255,))
    d.rectangle((x0, y - alt, x1, y - alt), fill=PEDRA[0] + (255,))
    for yy in range(y - alt + 1, y, 3):
        for x in range(x0 + (2 if ((yy - y) // 3) % 2 else 5), x1, 7): d.rectangle((x, yy, x, min(y - 1, yy + 1)), fill=PEDRA[3] + (255,))
        d.rectangle((x0, min(y - 1, yy + 2), x1, min(y - 1, yy + 2)), fill=PEDRA[3] + (255,))
    for x in range(x0 + 1, x1, 4): d.point((x, y - alt + 1), PEDRA[1] + (255,))


PREDIOS = [
 dict(id='B01', nome='Smithy', familia='Pikewall', bruto='smithy-b-1', chamine=(26, 0), fogo=(8, 16, 22, 30), efeito='brasa'),
 dict(id='B04', nome='Watchtower', familia='Thornbow', bruto='watchtower-b-1', mastro=(14, 0), efeito='bandeirola'),
 dict(id='B06', nome='Cookhouse', familia='Potluck', bruto='cookhouse-1', chamine=(27, 0), fogo=(22, 22, 31, 30), efeito='fumaca'),
]


def predio(p, nivel, quadro):
    """Um quadro (0..3) do predio no nivel 1, 3 ou 5."""
    spr, _ = base(p['bruto']); F = FAMILIA[p['familia']]; rnd = random.Random(nivel * 7 + 1)
    if p['id'] == 'B04' and nivel > 1:                       # torre cresce de verdade: mais um lance de pernas
        k = 4 if nivel == 3 else 8
        spr = np.concatenate([spr[:19], spr[15:15 + k], spr[19:]])
    if 'fogo' in p: spr = pisca_fogo(spr, quadro, p['fogo'])
    h, w = spr.shape[:2]
    alt = {1: 0, 3: 3, 5: 5}[nivel]
    im = tela(*CEL)
    x0 = AX - w // 2; y0 = CHAO - alt - h
    if alt: alicerce(im, x0 - 1 - alt // 2, x0 + w + alt // 2, CHAO, alt + 1)
    casa = para_img(contorno_cor(spr)); im.alpha_composite(casa, (x0 - 1, y0 - 1))
    if alt and nivel == 5:                                   # degrau da frente
        d = ImageDraw.Draw(im); d.rectangle((AX - 8, CHAO - 2, AX + 2, CHAO - 1), fill=PEDRA[1] + (255,)); d.rectangle((AX - 8, CHAO - 2, AX + 2, CHAO - 2), fill=PEDRA[0] + (255,))
    d = ImageDraw.Draw(im)
    # enfeites de nivel
    if p['id'] == 'B01':
        if nivel >= 3: _poe(im, BARRIL, x0 - 6, CHAO); _poe(im, ESPADAS, x0 + w - 1, CHAO)
        if nivel >= 5: _poe(im, ARMADURA, x0 - 14, CHAO); _poe(im, CAIXOTE, x0 + w + 8, CHAO); _poe(im, LAMPIAO, x0 + 3, y0 + 26)
    if p['id'] == 'B04':
        if nivel >= 3: _poe(im, ALJAVA, x0 - 6, CHAO); _poe(im, ALVO, x0 + w + 1, CHAO)
        if nivel >= 5: _poe(im, CAIXOTE, x0 - 15, CHAO); _poe(im, ALVO, x0 + w + 10, CHAO); _poe(im, LAMPIAO, x0 + 2, y0 + 16)
    if p['id'] == 'B06':
        if nivel >= 3: _poe(im, MESA, x0 - 9, CHAO); _poe(im, SACO, x0 + w, CHAO)
        if nivel >= 5: _poe(im, BARRIL, x0 - 17, CHAO); _poe(im, BARRIL, x0 + w + 7, CHAO); _poe(im, SACO, x0 + w + 6, CHAO - 8)
        if nivel >= 5:                                       # varal de linguicas no beiral
            for i, x in enumerate(range(x0 + 4, x0 + 18, 3)): d.rectangle((x, y0 + 21, x + 1, y0 + 23 + (i % 2)), fill=(190, 70, 60, 255)); d.point((x, y0 + 21), (240, 130, 110, 255))
    # bandeirola da familia: nivel 3 no telhado, nivel 5 maior e com ponteira de ouro (a torre tem sempre)
    if nivel >= 3 or p['id'] == 'B04':
        mx, my = (x0 + p['mastro'][0], y0 + p['mastro'][1]) if 'mastro' in p else (x0 + w // 2 - 6, y0 + 4)
        topo = my - (4 if nivel == 1 else (7 if nivel == 3 else 10))
        d.rectangle((mx, topo, mx, my + 6), fill=MADEIRA[2] + (255,)); d.rectangle((mx - 1, topo, mx - 1, my + 6), fill=mix(AMEIXA, MADEIRA[2], 0.3) + (255,))
        b = bandeirola(F, quadro, 8 if nivel < 5 else 11, 5 if nivel < 5 else 7); im.alpha_composite(b, (mx, topo - 1))
        if nivel == 5: im.alpha_composite(contornar(ANCORA_OURO, mix(AMEIXA, (120, 80, 30), 0.3)), (mx - 2, topo - 4))
    # efeito vivo
    if 'chamine' in p:
        cx, cy = x0 + p['chamine'][0], y0 + p['chamine'][1]
        desenha_fumaca(im, fumaca_pts(rnd, cx, cy - 1, quadro, n=3 if nivel == 1 else (4 if nivel == 3 else 5), sobe=13 + nivel, vento=4))
    if p['efeito'] == 'brasa':                               # brasas saindo da forja
        fx, fy = x0 + 15, y0 + 20
        for i in range(2 + nivel // 2 * 2):
            t = ((quadro / 4.0) + i * 0.37) % 1.0
            x = fx + int(math.sin(i * 1.7 + t * 4) * 5) + i % 3; y = fy - int(t * 12) + (i * 5) % 7
            d.point((x, y), FOGO[1 if t < 0.5 else 2] + (255,))
            if t < 0.3: d.point((x, y - 1), FOGO[0] + (255,))
    if p['id'] == 'B06':                                     # vapor do caldeirao
        desenha_fumaca(im, [(x0 + 28 + math.sin(quadro * 1.6) * 1.5, y0 + 27 - quadro, 1.3, 0), (x0 + 31 - math.sin(quadro * 1.6), y0 + 25 - ((quadro + 2) % 4), 1.0, 1)])
    return de_img(im)


def montar_predios():
    out = []
    for p in PREDIOS:
        Q = []; an = {}
        for nv in (1, 3, 5):
            i = len(Q); Q += [predio(p, nv, q) for q in range(4)]
            an['n%d' % nv] = dict(quadros=list(range(i, i + 4)), ms=[160] * 4, loop=True)
        out.append(dict(id=p['id'], nome=p['nome'], tipo='construcao', familia=p['familia'], cor=hexa(FAMILIA[p['familia']][1]), cel=CEL, ancora=(AX, CHAO),
                        variantes=[Q], anims=an, niveis={'1': 'n1', '2': 'n1', '3': 'n3', '4': 'n3', '5': 'n5'}))
    return out


# ---------------------------------------------------------------- castelo, portao, terreno
def _trinca(d, pts, cor=(58, 44, 80, 255), luz=None):
    for a, b in zip(pts, pts[1:]): d.line((a[0], a[1], b[0], b[1]), fill=cor)
    if luz:
        for a, b in zip(pts, pts[1:]): d.line((a[0] + 1, a[1], b[0] + 1, b[1]), fill=luz)


def castelo(estado):
    """estado 0 inteiro, 1 rachado, 2 muito rachado (telhado quebrado, pedras caidas, remendo de tabuas)."""
    im = Image.open(os.path.join(AQUI, 'pecas', 'castelo.png')).convert('RGBA')
    a = de_img(im); H, W = a.shape[:2]
    cel = tela(104, 96); ox = (104 - W) // 2; oy = 94 - H
    if estado >= 2:                                          # telhado da torre do meio quebrado: tira um naco em dente
        for y in range(0, 22):
            for x in range(W):
                if a[y, x, 3] and x > 40 + (22 - y) * 0.2 + ((y * 3) % 4) and x < 60 and y < 16 - (x - 44) * 0.5: a[y, x] = 0
    a = tirar_ilhas(a, 12)
    cel.alpha_composite(para_img(a), (ox, oy)); d = ImageDraw.Draw(cel)
    luz = (236, 226, 206, 255)
    if estado >= 1:
        _trinca(d, [(ox + 30, oy + 38), (ox + 32, oy + 43), (ox + 30, oy + 47), (ox + 33, oy + 52), (ox + 31, oy + 58)], luz=None)
        _trinca(d, [(ox + 32, oy + 43), (ox + 36, oy + 45), (ox + 38, oy + 49)])
        _trinca(d, [(ox + 62, oy + 44), (ox + 60, oy + 49), (ox + 63, oy + 53), (ox + 61, oy + 60), (ox + 64, oy + 66)])
        _trinca(d, [(ox + 14, oy + 40), (ox + 16, oy + 46), (ox + 13, oy + 51)])
        for (x, y) in ((ox + 6, 93), (ox + 70, 93)):
            d.rectangle((x, y - 2, x + 3, y), fill=PEDRA[1] + (255,)); d.point((x, y - 2), PEDRA[0] + (255,)); d.rectangle((x, y, x + 3, y), fill=PEDRA[3] + (255,))
    if estado >= 2:
        _trinca(d, [(ox + 48, oy + 30), (ox + 46, oy + 36), (ox + 49, oy + 41), (ox + 47, oy + 47), (ox + 50, oy + 54), (ox + 46, oy + 60)])
        _trinca(d, [(ox + 49, oy + 41), (ox + 54, oy + 43), (ox + 56, oy + 48)])
        _trinca(d, [(ox + 72, oy + 50), (ox + 74, oy + 56), (ox + 71, oy + 62), (ox + 73, oy + 68)])
        _trinca(d, [(ox + 20, oy + 56), (ox + 23, oy + 61), (ox + 21, oy + 67), (ox + 24, oy + 72)])
        for (x, y, w) in ((ox + 14, 93, 5), (ox + 40, 93, 4), (ox + 56, 93, 6), (ox + 78, 93, 4), (ox + 60, 90, 3)):   # pedras caidas
            d.rectangle((x, y - 3, x + w, y), fill=PEDRA[1] + (255,)); d.rectangle((x, y - 3, x + w - 1, y - 3), fill=PEDRA[0] + (255,)); d.rectangle((x, y, x + w, y), fill=PEDRA[3] + (255,))
            d.rectangle((x - 1, y - 2, x - 1, y - 1), fill=PEDRA[3] + (255,))
        for (x, y) in ((ox + 26, oy + 44), (ox + 66, oy + 38)):                                                          # remendo de tabuas
            d.rectangle((x, y, x + 7, y + 2), fill=MADEIRA[1] + (255,)); d.rectangle((x, y, x + 7, y), fill=MADEIRA[0] + (255,)); d.point([(x + 1, y + 1), (x + 6, y + 1)], AMEIXA + (255,))
            d.rectangle((x + 1, y + 4, x + 8, y + 6), fill=MADEIRA[1] + (255,)); d.rectangle((x + 1, y + 6, x + 8, y + 6), fill=MADEIRA[2] + (255,)); d.point([(x + 2, y + 5), (x + 7, y + 5)], AMEIXA + (255,))
    return de_img(cel)


def portao():
    im = Image.open(os.path.join(AQUI, 'pecas', 'portao.png')).convert('RGBA')
    cel = tela(72, 72); cel.alpha_composite(im, ((72 - im.width) // 2, 70 - im.height))
    return de_img(cel)


SETA = ["..ggg..", "..ggg..", "..ggg..", "ggggggg", ".ggggg.", "..ggg..", "...g..."]


def terreno_vazio(numero, quadro):
    """Marca de 'ponha uma carta aqui': canteiro pontilhado, carta-fantasma que flutua com seta, plaquinha com o numero."""
    from fonte import texto
    im = tela(56, 48); d = ImageDraw.Draw(im); base_y = 44
    for x in range(6, 50, 4):                                # canteiro pontilhado (frente e fundo)
        c = CREME if ((x // 4) + quadro) % 2 == 0 else (214, 200, 160)
        d.rectangle((x, base_y, x + 1, base_y), fill=c + (255,)); d.rectangle((x + 2, base_y - 9, x + 3, base_y - 9), fill=c + (200,))
    for y in (base_y - 6, base_y - 3): d.point([(4, y), (51, y)], CREME + (255,))
    dy = (0, -1, -2, -1)[quadro]
    cx, cy = 28, 14 + dy                                     # carta-fantasma (contorno creme pontilhado)
    for x in range(cx - 8, cx + 9):
        if x % 2 == 0: d.point([(x, cy - 11), (x, cy + 11)], CREME + (255,))
    for y in range(cy - 11, cy + 12):
        if y % 2 == 0: d.point([(cx - 8, y), (cx + 8, y)], CREME + (255,))
    s = contornar(bitmap(SETA, {'g': OURO}), AMEIXA); im.alpha_composite(s, (cx - 4, cy - 5 + (0, 1, 2, 1)[quadro]))
    d.rectangle((44, base_y - 12, 44, base_y - 1), fill=MADEIRA[2] + (255,))                                            # plaquinha
    d.rectangle((40, base_y - 20, 49, base_y - 11), fill=AMEIXA + (255,)); d.rectangle((41, base_y - 19, 48, base_y - 12), fill=MADEIRA[0] + (255,))
    d.rectangle((41, base_y - 12, 48, base_y - 12), fill=MADEIRA[1] + (255,))
    texto(im, 45, base_y - 19, str(numero), AMEIXA, centro=True)
    return de_img(im)


def bandeira_familia(fam, quadro):
    """Bandeira do terreno ocupado: mastro curto + pano liso na cor da familia (sem simbolo)."""
    im = tela(16, 24); d = ImageDraw.Draw(im)
    d.rectangle((3, 3, 3, 22), fill=MADEIRA[2] + (255,)); d.rectangle((2, 3, 2, 22), fill=AMEIXA + (255,)); d.rectangle((4, 12, 4, 22), fill=AMEIXA + (255,))
    d.rectangle((2, 1, 4, 2), fill=OURO + (255,)); d.point((2, 1), (255, 246, 190, 255))
    im.alpha_composite(bandeirola(FAMILIA[fam], quadro, 10, 7), (4, 2))
    return de_img(im)


def montar_reino():
    out = []
    Q = [castelo(e) for e in range(3)]
    out.append(dict(id='castle', nome='Castle', tipo='reino', cel=(104, 96), ancora=(52, 94), variantes=[Q],
                    anims={'whole': dict(quadros=[0], ms=[1000], loop=True), 'cracked': dict(quadros=[1], ms=[1000], loop=True), 'ruined': dict(quadros=[2], ms=[1000], loop=True)},
                    estados={'3': 'whole', '2': 'cracked', '1': 'ruined'}))
    out.append(dict(id='gate', nome='Gate', tipo='reino', cel=(72, 72), ancora=(36, 70), variantes=[[portao()]], anims={'idle': dict(quadros=[0], ms=[1000], loop=True)}))
    Q = []; an = {}
    for n in range(1, 7):
        i = len(Q); Q += [terreno_vazio(n, q) for q in range(4)]
        an['plot%d' % n] = dict(quadros=list(range(i, i + 4)), ms=[220] * 4, loop=True)
    out.append(dict(id='plot-empty', nome='Empty plot', tipo='reino', cel=(56, 48), ancora=(28, 45), variantes=[Q], anims=an))
    Q = []; an = {}
    for fam in FAMILIA:
        i = len(Q); Q += [bandeira_familia(fam, q) for q in range(4)]
        an[fam] = dict(quadros=list(range(i, i + 4)), ms=[150] * 4, loop=True)
    out.append(dict(id='plot-flag', nome='Family flag', tipo='reino', cel=(16, 24), ancora=(3, 23), variantes=[Q], anims=an))
    return out


if __name__ == '__main__':
    ps = montar_predios() + montar_reino()
    lin = []
    for p in ps:
        v = p['variantes'][0]; im = tela(len(v) * p['cel'][0], p['cel'][1])
        for i, q in enumerate(v): im.alpha_composite(para_img(q), (i * p['cel'][0], 0))
        lin.append(im); print(p['id'], len(v), p['cel'])
    W = max(l.width for l in lin); H = sum(l.height for l in lin)
    o = Image.new('RGBA', (W, H), (110, 170, 100, 255)); y = 0
    for l in lin: o.alpha_composite(l, (0, y)); y += l.height
    ampliar(o, 3).save(sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, 'prova', 'predios-quadros.png'))
