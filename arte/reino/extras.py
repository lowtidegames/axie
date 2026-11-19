"""Extras de interface da ARTE COMPLETA (R11), 100% por codigo, na folha nova 'extras': logotipo KEEPMILE (3 tamanhos, sombra
e brilho), icone do jogo (32 e 180), 12 icones de conquista com moldura de trofeu, 8 reliquias, 6 emblemas de liga, selo de
chefe, tela de fim (faixa NEW RECORD e pergaminho do placar) e numeros de dano grandes. Nenhum simbolo real."""
import os, sys, math
sys.dont_write_bytecode = True
import numpy as np
from comum import *
import fonte, interface
from interface import C as _C, mini, mini_larg, PAINEL, CARMIM

C = dict(_C, f=FAMILIA['Fizzwick'][1], F=FAMILIA['Fizzwick'][0], h=(232, 126, 46), H=(250, 170, 80), t=(205, 160, 104), T=(160, 114, 76), x=(150, 200, 250), X=(214, 236, 255),
         u=(88, 76, 104), U=(150, 142, 170), z=(58, 46, 72), D=(250, 200, 120), E=(255, 250, 230))
OURO3 = [(255, 246, 190), (255, 214, 80), (214, 150, 40), (150, 96, 36)]

# ---------------------------------------------------------------- conquistas (11x11) - ids = nome da biblia em minusculas com hifen
CONQUISTAS = {
 'first-supper': ["...w...w...", "..w...w....", "...w...w.n.", "........nn.", "eeeeeeennee", "eHHHHHnnHHe", ".eHhhhhhhe.", ".eeeeeeeee.", "..eEeeeee..", "...eeeee...", "..aaaaaaa.."],
 'not-on-my-road': ["..UUUUUU...", ".UUuuuuuU..", ".UuuUuuuu..", ".Uuuuuzuu..", ".UuUuuuuu..", ".Uuuuuuuz..", ".UuuzuuUu..", ".UuuuuuuuUU", "..uuuuuuu.U", "...zzzzz.UU", "..........."],
 'clean-plate': ["...........", "...aaaaa...", ".aaAAAAAaa.", "aAAWWAAAAAa", "aAWWeeeeAAa", "aAWeeeeeAAs", "aAAeeeeeAAs", ".aAAAAAAAs.", "..saaaass..", ".W.........", "WWW.....W.."],
 'last-one-standing': ["....A......", "...AAa.....", "...AAa.....", "...AAa.....", "...AAa.....", "...AAa.....", ".ooooooo...", "...nnN.....", "...nnN..G..", ".gGnnNggGg.", "ggggggggggg"],
 'full-house': ["...........", ".bb.gg.hh..", ".bB.gG.hH..", ".bb.gg.hh..", "...........", ".ff.bb.gg..", ".fF.bB.gG..", ".ff.bb.gg..", "...........", "ttttttttttt", "TTTTTTTTTTT"],
 'top-brass': ["bb.......bb", ".bb.....bb.", "..bbc.cbb..", "...bc.cb...", "...ooooo...", "..oOooooy..", ".oOooOoooy.", ".oooOOOooy.", ".oooyOoyyy.", "..oooyyyy..", "...yyyyy..."],
 'one-big-family': ["n..........", "nbbbbbbbb..", "nbBBbbbbbb.", "nbbbbbbbc..", "nbbbbbbc...", "nbBBbbbbb..", "nbbbbbbbbc.", "ncccccccc..", "n..........", "n..........", "NN........."],
 'penny-pincher': ["...nnnn....", "..nmmmmn...", "...NooN....", "..mmmmmm...", ".mmMmmmmn..", "mmMmmmmmnn.", "mmmmmmmmnN.", "mmmmmmmnnN.", "mmmmmmnnnN.", ".mmmnnnnN..", "..NNNNNN..."],
 'double-trouble': ["A.......A..", "aA.....Aa..", ".aA...Aa...", "..aA.Aa....", "...aAa.....", "...sAs.....", "..rr.rr....", ".r.r.r.r...", ".r.r.r.r...", "..rr.rr....", "..........."],
 'mole-patrol': ["...ii......", "..iIIi..n..", ".ifiiif.n..", ".iiRRii.n..", "..iwwi.nn..", "..iiii.UU..", ".ttiitUUUU.", "tttTtttUUt.", "tTtttTttttt", "ttttttttTtt", "TTTTTTTTTTT"],
 'long-live-the-pudding': ["..o.o.o....", "..ooooo....", "..oOoyo....", "...RrR.....", "..DDDDD....", ".DEDDDDt...", ".DDDDDDt...", "DDEDDDDDt..", "DDDDDDDtt..", "wwwwwwwww..", ".WWWWWWa..."],
 'head-librarian': ["...........", ".rrrrrrrr..", ".rRRrrrrd..", ".rrooorrd..", ".rroOorrd..", ".rrooorrd..", ".rrrrrrrd..", ".rrrrrrrd..", ".eeeeeeed..", ".wwwwwwwd..", ".dddddddd.."],
}
NOMES_CONQUISTA = ['First Supper', 'Not on My Road', 'Clean Plate', 'Last One Standing', 'Full House', 'Top Brass', 'One Big Family', 'Penny Pincher', 'Double Trouble', 'Mole Patrol', 'Long Live the Pudding', 'Head Librarian']

# ---------------------------------------------------------------- reliquias (11x11) - ids = shared/reino/config.js RELIQUIAS
RELIQUIAS = {
 'horseshoe': ["...........", "..AAAAAA...", ".AAaaaaAA..", ".Aa....aA..", "AAs....sAA.", "Aa......aA.", "Aa......aA.", "Aa......aA.", "AAs....sAA.", ".as....sa..", ".ss....ss.."],
 'candle': ["....r......", "...ro......", "...oOo.....", "...oOo.....", "....k......", "...eee.....", "...eEe.....", "...eEe.e...", "...eEe.....", "..oooooo...", ".yyyyyyyy.."],
 'crown': ["...........", "o...o...o..", "oo.ooo.oo..", "oOooOoooy..", "oOoooooyy..", "orooboory..", "oOoooooyy..", "yyyyyyyyy..", "...........", "...........", "..........."],
 'bell': ["....nn.....", "....oo.....", "...oOoo....", "..oOoooy...", "..oOoooy...", "..oOoooy...", ".oOooooyy..", ".oOooooyy..", "oooooooooy.", ".yyyyyyyy..", "....yy....."],
 'fuse': ["........r..", ".......oO..", "......n.o..", "..tttt.n...", ".tTttTtn...", "tTt..tTt...", "tt.tt.tt...", "tTt..tTt...", ".tTttTt....", "..tttt.....", "..........."],
 'ledger': ["...........", ".nnnnnnn...", ".nmmmmmnN..", ".nmeeemnN..", ".nmmmmmnN..", ".nmmmmooo..", ".nmmmoOooy.", ".nmmmoOyoy.", ".nnnnoooyy.", ".eeeee.yy..", ".NNNNNN...."],
 'banner': ["n....n.....", "nbbb.nhhh..", "nbBb.nhHh..", "nbbb.nhhh..", "nbb..nhh...", "nb...nh....", "n....n.....", "n....n.....", "n....n.....", "n....n.....", "NN...NN...."],
 'blueprints': ["...........", ".xxxxxxxx..", "xXxxxxxxxb.", "xxWWWWxxxb.", "xxWxxWxxxb.", "xxWWWWWWxb.", "xxxxxWxWxb.", "xxxxxWWWxb.", "xXxxxxxxxb.", ".bbbbbbbb..", "..........."],
}

# ---------------------------------------------------------------- ligas (glifo 9x9 no meio do escudo)
LIGAS = [  # (id, titulo, material, glifo)
 ('gate-sweeper', 'Gate Sweeper', 'Common', ["....n....", "....n....", "....n....", "....n....", "...ooo...", "..DDDDD..", "..DDDDD..", "..D.D.D..", "........."]),
 ('road-warden', 'Road Warden', 'Uncommon', ["..PPPPP..", ".PPppppq.", ".PpPpppq.", ".Ppppppq.", ".Ppppppq.", ".Ppppppq.", ".Ppppppq.", "gGgppqgg.", "........."]),
 ('keep-captain', 'Keep Captain', 'Rare', ["P.P.P.P..", "PPPPPPP..", ".Ppppq...", ".Ppkpq...", ".Ppppq...", ".Ppppq...", ".Pkkpq...", "PPkkpqq..", "........."]),
 ('lord-steward', 'Lord Steward', 'Legendary', [".rrr.....", "r...r....", "r...r....", ".rrr.....", "..r......", "..r......", "..rr.....", "..r......", "..rr....."]),
 ('crown-guardian', 'Crown Guardian', 'Epic', [".........", "o..o..o..", "oo.o.oo..", "oOoOooy..", "oroboro..", "oOooooy..", "yyyyyyy..", ".........", "........."]),
 ('legend-of-the-mile', 'Legend of the Mile', 'Legendary', ["....W....", "....W....", "...WWW...", "WWWWWWWWW", ".WWWWWWW.", "..WWWWW..", ".WWW.WWW.", ".WW...WW.", "........."]),
]


def _icone(linhas): return contornar(bitmap(linhas, C), AMEIXA)


def moldura_trofeu(estado):
    """Moldura 19x19 do icone de conquista: 'locked' (pedra fria), 'unlocked' (bronze), 'gold' (ouro com louros)."""
    R = {'locked': [(118, 100, 140), (88, 70, 110), (58, 46, 72)], 'unlocked': RARIDADE['Uncommon'], 'gold': RARIDADE['Legendary']}[estado]
    im = tela(19, 21); d = ImageDraw.Draw(im)
    d.rectangle((1, 0, 17, 18), fill=AMEIXA + (255,)); d.rectangle((0, 1, 18, 17), fill=AMEIXA + (255,))
    d.rectangle((1, 1, 17, 17), fill=R[1] + (255,)); d.rectangle((1, 1, 17, 1), fill=R[0] + (255,)); d.rectangle((1, 1, 1, 17), fill=R[0] + (255,)); d.rectangle((2, 17, 17, 17), fill=R[2] + (255,)); d.rectangle((17, 2, 17, 17), fill=R[2] + (255,))
    d.rectangle((3, 3, 15, 15), fill=AMEIXA + (255,)); d.rectangle((4, 4, 14, 14), fill=(PAINEL[2] if estado == 'locked' else PAINEL[1]) + (255,))
    for (x, y) in ((1, 1), (17, 1), (1, 17), (17, 17)): d.point((x, y), (255, 255, 255, 255) if estado == 'gold' else R[0] + (255,))
    d.rectangle((6, 18, 12, 19), fill=AMEIXA + (255,)); d.rectangle((7, 18, 11, 18), fill=R[1] + (255,)); d.rectangle((5, 20, 13, 20), fill=AMEIXA + (255,))     # pezinho do trofeu
    if estado == 'gold':
        for (x, y) in ((0, 6), (0, 10), (18, 6), (18, 10)): d.point((x, y), GRAMA[0] + (255,))
    return im


def conquista(nome, estado='unlocked'):
    im = moldura_trofeu(estado); ic = bitmap(CONQUISTAS[nome], C)
    if estado == 'locked':
        a = de_img(ic); m = a[..., 3] > 0; a[m, :3] = (88, 70, 110); ic = para_img(a)
    im.alpha_composite(ic, (4, 4)); return im


def emblema_liga(i):
    lid, titulo, mat, glifo = LIGAS[i]; R = RARIDADE[mat]; W, H = 27, 30; im = tela(W, H); d = ImageDraw.Draw(im)
    sh = ["..#################..", ".###################.", "#####################", "#####################", "#####################", "#####################", "#####################", "#####################", "#####################",
          "#####################", "#####################", "#####################", "#####################", "#####################", ".###################.", ".###################.", "..#################..", "...###############...",
          "....#############....", ".....###########.....", "......#########......", "........#####........", "..........#.........."]
    for y, l in enumerate(sh):
        for x, c in enumerate(l):
            if c == '#':
                borda = x < 2 or x > 18 or y < 2 or l[max(0, x - 2)] != '#' or l[min(20, x + 2)] != '#' or y > 19
                cor = (R[0] if (x + y) < 14 else (R[1] if (x + y) < 26 else R[2])) if borda else (PAINEL[1] if (x + y) > 12 else PAINEL[0])
                im.putpixel((3 + x, 3 + y), cor + (255,))
    im.alpha_composite(bitmap(glifo, C), (9, 8))
    if i >= 3:                                                 # louros dourados nas 3 ligas de cima
        for k in range(4 + (i - 3)):
            y = 22 - k * 3
            for (x, s) in ((1, 1), (25, -1)): d.point([(x, y), (x + s, y - 1)], OURO3[1] + (255,)); d.point((x, y - 1), OURO3[0] + (255,))
    if i == 5:                                                 # asas e brilho da Lenda
        for k in range(3): d.line((0, 6 + k * 3, 3, 8 + k * 3), fill=CREME + (255,)); d.line((26, 6 + k * 3, 23, 8 + k * 3), fill=CREME + (255,))
        d.point([(13, 0), (12, 1), (14, 1), (13, 1)], (255, 255, 255, 255))
    im = contornar(im, AMEIXA).crop((1, 1, W + 1, H + 1))
    return lid, titulo, im


def selo_chefe(q):
    """Selo de chefe (25x25): lacre roxo com chifres e dois olhos lima que pulsam. 4 quadros."""
    im = tela(25, 25); d = ImageDraw.Draw(im); I = INVASOR
    for i in range(12):
        a = i * math.pi / 6 + 0.1; d.ellipse((12 + math.cos(a) * 9 - 2.6, 12 + math.sin(a) * 9 - 2.6, 12 + math.cos(a) * 9 + 2.6, 12 + math.sin(a) * 9 + 2.6), fill=I[1] + (255,))
    d.ellipse((3, 3, 21, 21), fill=I[1] + (255,)); d.ellipse((5, 5, 19, 19), fill=I[2] + (255,)); d.arc((3, 3, 21, 21), 150, 280, fill=I[0] + (255,))
    for (x, s) in ((7, -1), (17, 1)): d.polygon([(x, 10), (x + s * 3, 5), (x + s, 11)], fill=CREME + (255,))                       # chifres
    d.ellipse((7, 8, 17, 18), fill=I[1] + (255,)); d.ellipse((8, 9, 13, 14), fill=I[0] + (255,)); d.ellipse((8, 9, 17, 18), fill=I[1] + (255,))
    ol = LIMA if q != 2 else (240, 255, 200)
    d.rectangle((9, 12, 10, 13 if q != 3 else 12), fill=ol + (255,)); d.rectangle((14, 12, 15, 13 if q != 3 else 12), fill=ol + (255,))
    d.point([(10, 16), (12, 16), (14, 16)], CREME + (255,)); d.line((9, 15, 15, 15), fill=AMEIXA + (255,))
    if q == 1: d.point([(4, 5), (5, 4)], (255, 255, 255, 255))
    return contornar(im, AMEIXA).crop((1, 1, 26, 26))


# ---------------------------------------------------------------- logotipo
def _letra(ch, k, extra):
    ls = fonte._G[ch].split('/'); w = len(ls[0]) * k + extra; h = 7 * k; a = np.zeros((h, w), bool)
    for j, l in enumerate(ls):
        for i, v in enumerate(l):
            if v == '#': a[j * k:(j + 1) * k, i * k:(i + 1) * k + extra] = True
    return a


def logotipo(k=2, brilho=None):
    """KEEPMILE em pixel no tamanho k (1 pequeno, 2 medio, 3 grande): letras gordas de ouro em 3 faixas, chanfro de luz em
    cima e sombra embaixo, contorno ameixa, sombra projetada e a torre do castelo (o keep) entre KEEP e MILE. brilho = quadro 0..5 do reflexo."""
    extra = 1 if k < 3 else 2; esp = 1 if k == 1 else k - 0
    partes = [_letra(c, k, extra) for c in 'KEEP'], [_letra(c, k, extra) for c in 'MILE']
    ms = ampliar(bitmap(["P.PP.P", "PPPPPq", ".Pppq.", ".Pypq.", ".Pppq.", ".Pkkq.", "gPkkqG"], dict(P=PEDRA[0], p=PEDRA[1], q=PEDRA[2], G=GRAMA[0], g=GRAMA[2], k=MADEIRA[2], y=(255, 226, 96))), k)   # a torre (o "keep")
    larg = sum(a.shape[1] + esp for p in partes for a in p) + ms.width + 2 * k + esp
    H = 7 * k; pad = 2 + k; im = tela(larg + 2 * pad, H + 2 * pad + k); m = np.zeros((im.height, im.width), bool); x = pad; xm = 0
    for pi, p in enumerate(partes):
        for a in p: m[pad:pad + H, x:x + a.shape[1]] |= a; x += a.shape[1] + esp
        if pi == 0: xm = x + k - esp + 1; x += ms.width + 2 * k
    A = np.zeros((im.height, im.width, 4), np.int32); O = [(255, 240, 150), (255, 210, 72), (236, 160, 48), (176, 104, 36)]
    ys, xs = np.nonzero(m)
    for y, xx in zip(ys, xs):
        t = (y - pad) / float(H); c = O[0] if t < 0.34 else (O[1] if t < 0.70 else O[2])
        if not m[y - 1, xx]: c = (255, 252, 224)
        elif not m[y + 1, xx]: c = O[3]
        elif not m[y, xx - 1] and k > 1: c = mix(c, (255, 255, 255), 0.45)
        if brilho is not None:
            pos = -4 * k + brilho * (larg + 8 * k) / 5.0; dd = (xx + (y - pad) * 0.6) - pos
            if abs(dd) < 1.5 * k or abs(dd - 4 * k) < 0.6 * k: c = (255, 255, 255)
        A[y, xx] = c + (255,)
    letras = para_img(A); letras.alpha_composite(ms, (xm, pad))
    cont = contornar(letras, AMEIXA, diag=True).crop((1, 1, im.width + 1, im.height + 1))
    so = de_img(cont); mm = so[..., 3] > 0; so[mm, :3] = (30, 20, 44); so = mover(so, k, k)
    out = para_img(so); out.alpha_composite(cont)
    if k >= 2 and brilho is None:                              # estrelinha fixa no canto do K
        d = ImageDraw.Draw(out); x0, y0 = pad + 1, pad; d.point([(x0, y0 - 2), (x0 - 2, y0), (x0 + 2, y0), (x0, y0 + 2), (x0, y0)], (255, 255, 255, 255)); d.point([(x0, y0 - 1), (x0 - 1, y0), (x0 + 1, y0), (x0, y0 + 1)], (255, 255, 255, 255))
    b = out.getbbox(); return out.crop((0, 0, out.width, out.height))


def icone_jogo(lado=32):
    """Icone do jogo: fundo ameixa com filete de ouro, K de ouro e o marco de milha. 32 px nativo; 180 = desenho de 36 px x5."""
    n = 32 if lado == 32 else 36; im = tela(n, n); d = ImageDraw.Draw(im)
    d.rectangle((2, 0, n - 3, n - 1), fill=AMEIXA + (255,)); d.rectangle((0, 2, n - 1, n - 3), fill=AMEIXA + (255,)); d.rectangle((1, 1, n - 2, n - 2), fill=AMEIXA + (255,))
    d.rectangle((2, 2, n - 3, n - 3), fill=PAINEL[1] + (255,))
    for y in range(2, n - 2):                                  # ceu da tarde em degraus
        t = (y - 2) / float(n - 5)
        for x in range(2, n - 2):
            tb = math.floor(t * 4 + BAYER[y % 4, x % 4]) / 4.0; d.point((x, y), mix((84, 70, 150), (226, 120, 130), min(1, tb)) + (255,))
    d.rectangle((2, n - 9, n - 3, n - 3), fill=GRAMA[2] + (255,)); d.rectangle((2, n - 9, n - 3, n - 9), fill=GRAMA[1] + (255,))
    d.polygon([(n // 2 - 3, n - 3), (n // 2 + 6, n - 3), (n // 2 + 3, n - 9), (n // 2 + 1, n - 9)], fill=TERRA[1] + (255,))            # a estrada
    for (x, y) in ((2, 2), (n - 3, 2), (2, n - 3), (n - 3, n - 3)): d.point((x, y), AMEIXA + (255,))
    d.rectangle((2, 2, n - 3, 2), fill=OURO3[1] + (255,)); d.rectangle((2, 2, 2, n - 3), fill=OURO3[1] + (255,)); d.rectangle((2, n - 3, n - 3, n - 3), fill=OURO3[2] + (255,)); d.rectangle((n - 3, 2, n - 3, n - 3), fill=OURO3[2] + (255,))
    a = _letra('K', 3, 2); A = np.zeros((21, a.shape[1], 4), np.int32); O = [(255, 240, 150), (255, 210, 72), (236, 160, 48), (176, 104, 36)]
    for y in range(21):
        for x in range(a.shape[1]):
            if a[y, x]:
                c = O[0] if y < 7 else (O[1] if y < 15 else O[2])
                if y == 0 or not a[y - 1, x]: c = (255, 252, 224)
                elif y == 20 or not a[y + 1, x]: c = O[3]
                A[y, x] = c + (255,)
    kk = contornar(para_img(A), AMEIXA, diag=True); so = de_img(kk); so[so[..., 3] > 0, :3] = (30, 20, 44)
    ox = (n - kk.width) // 2 - 1; oy = (n - kk.height) // 2 - 1
    im.alpha_composite(para_img(so), (ox + 2, oy + 2)); im.alpha_composite(kk, (ox, oy))
    d.point([(ox + 2, oy), (ox, oy + 2), (ox + 4, oy + 2), (ox + 2, oy + 4), (ox + 2, oy + 2), (ox + 2, oy + 1), (ox + 1, oy + 2), (ox + 3, oy + 2), (ox + 2, oy + 3)], (255, 255, 255, 255))
    return im if lado == 32 else ampliar(im, 5)


# ---------------------------------------------------------------- tela de fim
def faixa_recorde(q):
    """Faixa 'NEW RECORD' (carmim com ouro), pontas dobradas, reflexo que corre em 4 quadros."""
    s = 'NEW RECORD'; w = fonte.largura(s) + 22; im = tela(w + 16, 19); d = ImageDraw.Draw(im); K = CARMIM
    for (x0, x1, sx) in ((0, 9, 1), (w + 6, w + 15, -1)):      # pontas de tras
        d.rectangle((x0, 6, x1, 16), fill=K[2] + (255,)); d.rectangle((x0, 6, x1, 6), fill=K[1] + (255,))
        xx = x0 if sx > 0 else x1
        d.polygon([(xx, 6), (xx, 16), (xx + sx * 3, 11)], fill=(0, 0, 0, 0))
    d.rectangle((8, 2, w + 7, 14), fill=K[1] + (255,)); d.rectangle((8, 2, w + 7, 3), fill=K[0] + (255,)); d.rectangle((8, 13, w + 7, 14), fill=K[2] + (255,))
    d.rectangle((8, 4, w + 7, 4), fill=OURO3[1] + (255,)); d.rectangle((8, 12, w + 7, 12), fill=OURO3[2] + (255,))
    d.polygon([(8, 15), (10, 15), (10, 17)], fill=(96, 24, 44, 255)); d.polygon([(w + 7, 15), (w + 5, 15), (w + 5, 17)], fill=(96, 24, 44, 255))
    fonte.texto(im, 8 + w // 2, 5, s, CREME, sombra=K[2], centro=True)
    px = im.load(); pos = 10 + q * (w // 3)
    for y in range(2, 15):
        for dx in (0, 1, 2):
            x = pos + dx - (y - 2) // 2
            if 8 <= x <= w + 7 and px[x, y][:3] in (K[1], K[0]): px[x, y] = (255, 190, 170, 255)
    for (x, y) in ((6, 1), (w + 9, 1)):
        if q % 2 == 0: d.point([(x, y), (x - 1, y + 1), (x + 1, y + 1), (x, y + 2)], OURO3[0] + (255,))
    return contornar(im, AMEIXA).crop((1, 1, im.width + 1, im.height + 1))


def pergaminho(w=136, h=112):
    """Pergaminho do placar: papel creme com fibras, bordas roidas, rolos de madeira em cima e embaixo, fita com lacre."""
    im = tela(w, h); d = ImageDraw.Draw(im); P = [(255, 244, 214), (244, 226, 184), (220, 196, 150), (184, 152, 112)]
    d.rectangle((6, 8, w - 7, h - 9), fill=P[1] + (255,)); d.rectangle((6, 8, 8, h - 9), fill=P[0] + (255,)); d.rectangle((w - 9, 8, w - 7, h - 9), fill=P[2] + (255,))
    d.rectangle((9, 12, w - 10, 13), fill=P[2] + (255,)); d.rectangle((9, h - 14, w - 10, h - 13), fill=P[2] + (255,))
    for y in range(18, h - 16, 9):                             # fibras do papel e linhas de pauta claras
        for x in range(12 + (y * 3) % 11, w - 14, 23): d.rectangle((x, y, x + 3 + (x % 3), y), fill=P[2] + (255,))
    for y in range(14, h - 12, 7):                             # bordas roidas
        if (y // 7) % 3 == 0: d.point((6, y), (0, 0, 0, 0)); d.point((6, y + 1), (0, 0, 0, 0))
        if (y // 7) % 3 == 1: d.point((w - 7, y), (0, 0, 0, 0))
    for yy in (0, h - 9):                                      # rolos
        d.rectangle((2, yy + 1, w - 3, yy + 7), fill=P[1] + (255,)); d.rectangle((2, yy + 1, w - 3, yy + 2), fill=P[0] + (255,)); d.rectangle((2, yy + 6, w - 3, yy + 7), fill=P[3] + (255,))
        for xx in (0, w - 4): d.rectangle((xx, yy, xx + 3, yy + 8), fill=MADEIRA[1] + (255,)); d.rectangle((xx, yy, xx + 3, yy + 1), fill=MADEIRA[0] + (255,)); d.rectangle((xx, yy + 7, xx + 3, yy + 8), fill=MADEIRA[2] + (255,))
    im = contornar(im, AMEIXA).crop((1, 1, w + 1, h + 1)); d = ImageDraw.Draw(im)
    d.rectangle((w // 2 - 3, h - 9, w // 2 + 3, h - 1), fill=CARMIM[1] + (255,)); d.ellipse((w // 2 - 6, h - 14, w // 2 + 6, h - 2), fill=AMEIXA + (255,)); d.ellipse((w // 2 - 5, h - 13, w // 2 + 5, h - 3), fill=CARMIM[1] + (255,))
    d.arc((w // 2 - 5, h - 13, w // 2 + 5, h - 3), 160, 290, fill=CARMIM[0] + (255,)); im.alpha_composite(bitmap(interface.ICONES['pin-on'], _C), (w // 2 - 2, h - 10))
    return im


def fonte_grande(cor, nome):
    """Numeros de dano GRANDES: Reino 5x7 ampliada 2x com contorno. So numeros e sinais."""
    chars = '0123456789!+-x%?. '; g = {}; x = 0; ims = []
    for c in chars:
        ls = fonte._G[c].split('/'); t = ampliar(bitmap([l.replace('#', 'c') for l in ls], {'c': cor}), 2)
        a = de_img(t); a[:4][a[:4][..., 3] > 0, :3] = mix(cor, (255, 255, 255), 0.5); a[-3:][a[-3:][..., 3] > 0, :3] = mix(cor, AMEIXA, 0.28)
        t = contornar(para_img(a), AMEIXA, diag=True); ims.append(t); g[c] = [x, 0, t.width, t.height]; x += t.width + 1
    im = tela(x, 16)
    for c, t in zip(chars, ims): im.alpha_composite(t, (g[c][0], 0))
    return im, dict(altura=16, espaco=-1, contorno=True, glifos=g)


def fonte_cor(glifos, alt, cor, nome):
    chars = list(glifos.keys()); x = 0; g = {}; ims = []
    for c in chars:
        ls = glifos[c].split('/'); t = contornar(bitmap([l.replace('#', 'c') for l in ls], {'c': cor}), AMEIXA, diag=True); ims.append(t); g[c] = [x, 0, t.width, t.height]; x += t.width + 1
    im = tela(x, alt + 2)
    for c, t in zip(chars, ims): im.alpha_composite(t, (g[c][0], 0))
    return im, dict(altura=alt + 2, espaco=-1, contorno=True, glifos=g)


def montar(por, linha):
    """por(im) -> [x, y, w, h] na folha 'extras'; linha() quebra a prateleira. Devolve os pedacos novos do atlas."""
    out = {}
    lg = {}
    for nome, k in (('small', 1), ('medium', 2), ('large', 3)):
        lg[nome] = dict(quadro=por(logotipo(k)), escala=k); linha()
        if k >= 2: lg[nome]['brilho'] = dict(quadros=[por(logotipo(k, b)) for b in range(6)], ms=[60] * 6); linha()
    out['logo'] = dict(folha='extras', nota='KEEPMILE: small/medium/large; brilho = reflexo que corre (tocar a cada ~3 s, por cima do quadro parado)', **lg)
    out['conquistas'] = dict(folha='extras', tamanho=[19, 21], icone_tamanho=[11, 11], icone_em=[4, 4],
                             molduras={e: por(moldura_trofeu(e)) for e in ('locked', 'unlocked', 'gold')},
                             icones={n: por(bitmap(CONQUISTAS[n], C)) for n in CONQUISTAS}, prontas={n: por(conquista(n, 'gold')) for n in CONQUISTAS},
                             nomes={n: NOMES_CONQUISTA[i] for i, n in enumerate(CONQUISTAS)}, nota='prontas = icone ja na moldura de ouro; bloqueada = moldura locked + icone pintado de #58466E')
    linha()
    out['reliquias'] = dict(folha='extras', tamanho=[13, 13], quadros={n: por(_icone(RELIQUIAS[n])) for n in RELIQUIAS}, nota='ids = RELIQUIAS de shared/reino/config.js')
    linha()
    lig = {}
    for i in range(len(LIGAS)):
        lid, titulo, im = emblema_liga(i); lig[lid] = dict(nome=titulo, quadro=por(im), ordem=i)
    out['ligas'] = dict(folha='extras', tamanho=[27, 30], emblemas=lig)
    linha()
    out['fim'] = dict(folha='extras', faixa_recorde=dict(quadros=[por(faixa_recorde(q)) for q in range(4)], ms=[120] * 4), pergaminho=dict(quadro=por(pergaminho()), area_texto=[14, 18, 108, 76]),
                      selo_chefe=dict(quadros=[por(selo_chefe(q)) for q in range(4)], ms=[300, 120, 120, 120]))
    linha()
    fo = {}
    for nome, (im, meta) in (('dano-g', fonte_grande(CREME, 'dano-g')), ('dano-g-ouro', fonte_grande(OURO, 'dano-g-ouro')), ('mini-ouro', fonte_cor(interface._M, 5, OURO, 'mini-ouro')), ('reino-verde', fonte_cor(fonte._G, 7, (150, 240, 130), 'reino-verde'))):
        r = por(im); linha()
        for c in meta['glifos']: meta['glifos'][c][0] += r[0]; meta['glifos'][c][1] += r[1]
        meta['folha'] = 'extras'; fo[nome] = meta
    out['_fontes'] = fo
    out['dano'] = dict(pequeno=dict(normal='mini-contorno', critico='mini-ouro'), medio=dict(normal='reino-contorno', critico='reino-ouro', cura='reino-verde'), grande=dict(normal='dano-g', critico='dano-g-ouro'),
                       nota='3 tamanhos de numero de dano: pequeno (golpe comum), medio (golpe forte/critico/cura), grande (chefe, explosao)')
    return out


if __name__ == '__main__':
    its = []; f = lambda im: (its.append(im), [0, 0, im.width, im.height])[1]
    montar(f, lambda: None)
    W = 420; x = y = hh = 0; o = Image.new('RGBA', (W, 520), (96, 150, 92, 255))
    for im in its:
        if x + im.width > W: x = 0; y += hh + 2; hh = 0
        o.alpha_composite(im, (x, y)); x += im.width + 2; hh = max(hh, im.height)
    o.alpha_composite(icone_jogo(32), (0, y + hh + 4)); o.alpha_composite(icone_jogo(180).resize((36, 36), Image.NEAREST), (40, y + hh + 4))
    ampliar(o.crop((0, 0, W, y + hh + 44)), 3).save(sys.argv[1])
