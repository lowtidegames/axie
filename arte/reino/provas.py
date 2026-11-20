"""Gera as provas da direcao de arte do Reino em arte/reino/prova/.
Uso: python3 -B arte/reino/provas.py [celular|pc|climas|pecas|anim|tudo]"""
import os, sys, math
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image, ImageDraw
from cena import *
from fonte import texto, largura

SAI = os.path.join(AQUI, 'prova'); os.makedirs(SAI, exist_ok=True)


def mao(im, cx, y, sep=59):
    """Mao de 3 cartas; a do meio esta escolhida ('falta 1 para subir')."""
    cs = [carta('ARQUEIRO', 'folha', 'comum', 'tropa', 'arqueiro', nivel=1, de=3, quant='x3'),
          carta('LANCEIRO', 'anil', 'incomum', 'tropa', 'lanceiro', nivel=2, de=3, quant='x4', destaque=True),
          carta('RAIO', 'laranja', 'rara', 'magia', None, nivel=1, de=3, quant='40')]
    for i, c in enumerate(cs):
        x = cx + (i - 1) * sep - c.width // 2
        im.alpha_composite(c, (x, y - (7 if i == 1 else 0) - (2 if i == 1 else 0)))
    etiqueta(im, cx, y - 22, 'FALTA 1', FAMILIA['carmim'])


def hud(im, W, x_rod, vidas=2, ouro='128', rodada='RODADA 9', forca=(23, 31), chefe=False, x_bar=None, pinos=3):
    for i in range(3): im.alpha_composite(CORACAO if i < vidas else CORACAO_VAZIO, (5 + i * 10, 4))
    im.alpha_composite(MOEDA, (38, 4)); texto(im, 47, 5, ouro, OURO, contorno=AMEIXA)
    texto(im, x_rod, 5, 'CHEFE!' if chefe else rodada, (255, 120, 120) if chefe else CREME, contorno=AMEIXA, centro=True)
    d = ImageDraw.Draw(im)
    for i in range(4):      # rodadas ate o chefe: 4 pinos e a caveira
        d.rectangle((5 + i * 7, 17, 9 + i * 7, 21), fill=AMEIXA); d.rectangle((6 + i * 7, 18, 8 + i * 7, 20), fill=OURO if (i < pinos or chefe) else (110, 96, 130))
    im.alpha_composite(CAVEIRA, (33, 15))
    x0, x1 = x_bar or (x_rod - 34, x_rod + 34)
    barra_forca(im, x0, 18, x1, *forca)
    texto(im, x0 + 2, 26, str(forca[0]), (170, 210, 255), contorno=AMEIXA); texto(im, x1 - 1, 26, str(forca[1]), (214, 160, 250), contorno=AMEIXA, direita=True)
    botao(im, W - 26, 3, icone='>>')


def celular(clima='tarde', chefe=False, ui=True):
    W, H = 180, 370; c = Cena(W, H, clima, semente=11)
    T3, T2, T1 = 150, 206, 262
    c.fundo(y_horizonte=128, y_longe=20, y_meio=50, x_meio=-70)
    # morro do castelo
    def topo(x): t = min(1, max(0, (x - 4) / 78.0)); return int(round(130 - 26 * (t * t * (3 - 2 * t))))
    for x in range(W):
        y = topo(x); c.ret(x, y, x, 141, GRAMA[1]); c.ret(x, y, x, y, GRAMA[3]); c.ret(x, y + 1, x, y + 2, GRAMA[0])
    c.grama(0, 133, W - 1, 139); c.grama(84, 108, W - 1, 132)
    c.escada(163, 100, 175, 139)
    c.predio('castelo', 128, 108)
    for T in (T3, T2, T1):
        if T != T3: c.grama(0, T - 39, W - 1, T - 11, sombra_topo=3)
        c.estrada(0, T - 10, W - 1, T + 2)
        c.ret(0, T + 3, W - 1, T + 4, GRAMA[0]); c.ret(0, T + 5, W - 1, T + 5, GRAMA[2])
        c.muro(0, T + 6, W - 1, T + 16)
        if T == T3: c.escada(5, T + 3, 17, T2 - 10)
        if T == T2: c.escada(163, T + 3, 175, T1 - 10)
        b = T - 14
        if T == T3:
            c.predio('torre-mago', 42, b); c.bandeira(14, b + 2, FAMILIA['anil'], 1)
            c.vazio(98, b + 1)
            tr = [dict(n='mago', x=70, y=T - 2, vira=True, brilho='ciano'), dict(n='lanceiro-passo', x=124, y=T - 4, vira=True), dict(n='lanceiro-passo', x=142, y=T, vira=True),
                  dict(n='cavaleiro', x=160, y=T - 3, vira=True)]
            c.tropa(tr)
        if T == T2:
            c.predio('tenda', 60, b); c.bandeira(32, b + 2, FAMILIA['folha'], 2)
            c.predio('ferraria', 120, b); c.bandeira(94, b + 2, FAMILIA['carmim'], 1); c.luzes.append((122, b - 8, 22, (255, 150, 70), 0.9))
            tr = [dict(n='arqueiro-tiro', x=26, y=T - 5, vira=True), dict(n='arqueiro-tiro', x=42, y=T, vira=True), dict(n='arqueiro', x=86, y=T - 6, vira=True),
                  dict(n='arqueiro-tiro', x=98, y=T, vira=True), dict(n='lanceiro-passo', x=118, y=T - 5), dict(n='lanceiro-passo', x=132, y=T),
                  dict(n='cavaleiro', x=146, y=T - 3), dict(n='lanceiro-passo', x=160, y=T + 1)]
            if chefe: tr += [dict(n='invasor-golpe', x=100, y=T - 2, vira=True, brilho='lima'), dict(n='invasor', x=14, y=T - 3, vira=True, brilho='lima')]
            c.tropa(tr)
        if T == T1:
            c.predio('portao', 20, T - 7)
            c.luzes.append((2, T - 30, 26, (255, 170, 80), 1.0)); c.luzes.append((40, T - 30, 26, (255, 170, 80), 1.0))
            c.predio('quartel', 90, b); c.bandeira(64, b + 2, FAMILIA['anil'], 2)
            c.predio('moinho', 142, b); c.pas(140, b - 34, 0.5, 13); c.bandeira(117, b + 2, FAMILIA['laranja'], 1)
            tr = []
            imps = [(4, -7), (15, 1), (27, -6), (37, 2), (80, -8), (86, 2), (96, -4)]
            for i, (x, dy) in enumerate(imps):
                if chefe and 34 < x < 90: continue
                tr.append(dict(n='invasor-golpe' if (i % 3 == 0 or x > 84) else 'invasor', x=x, y=T + dy, vira=True, brilho='lima'))
            if chefe: tr.append(dict(n='chefe', x=62, y=T + 1, vira=True, brilho='lima'))
            else: tr.append(dict(n='bruto', x=60, y=T + 2, vira=True, brilho='lima'))
            ali = [('cavaleiro', 108, -5, 0), ('lanceiro-golpe', 114, 1, 0), ('lanceiro-apanhou', 104, -1, 1), ('lanceiro-golpe', 124, -6, 0), ('cavaleiro', 132, 0, 0),
                   ('lanceiro', 140, -5, 0), ('lanceiro', 150, 1, 0), ('lanceiro-passo', 160, -4, 0), ('lanceiro', 170, 0, 0)]
            for n, x, dy, br in ali: tr.append(dict(n=n, x=x, y=T + dy, vira=True, branco=bool(br)))
            c.tropa(tr)
    c.ret(0, T1 + 18, W - 1, H, GRAMA[3])
    # particulas, numeros e tiros
    for (x, y) in ((98, T1 - 2), (106, T1 - 8), (86, T1), (60, T1 + 1), (150, T1), (40, T1 - 2)): c.poeira(x, y, 3)
    c.faisca(101, T1 - 15); c.faisca(96, T1 - 22, r=2)
    c.numero(104, T1 - 38, '12'); c.numero(84, T1 - 36, '7'); c.numero(118, T1 - 34, '5')
    c.flecha(22, T2 - 22, 30, T1 - 22, alt=8, n=0.8); c.flecha(84, T2 - 20, 88, T1 - 24, alt=7, n=0.55); c.flecha(94, T2 - 18, 80, T1 - 20, alt=6, n=0.3)
    alvo = (60, T1 - 62) if chefe else (60, T1 - 34)
    c.tempestade(alvo[0] + 3, alvo[1] - (30 if chefe else 30)); c.raio(alvo[0] + 3, alvo[1] - 26, alvo[0], alvo[1]); c.numero(alvo[0] + 18, alvo[1] - 6, '40!', critico=True)
    c.orbe(52, T3 - 14)
    if chefe: c.barra_vida(62, T1 - 78, 40, 0.62); c.luzes.append((62, T1 - 30, 52, (255, 90, 130), 0.75))
    im = c.revelar()
    if ui:
        hud(im, W, 100, chefe=chefe, rodada={'manha': 'RODADA 6', 'tarde': 'RODADA 9', 'noite': 'RODADA 10'}[clima], pinos={'manha': 0, 'tarde': 3, 'noite': 4}[clima], forca=(21, 26) if chefe else (23, 31), x_bar=(72, 132))
        painel(im, -2, 281, W + 1, H + 2)
        mao(im, W // 2, 292)
    return im


def pc(clima='tarde', ui=True):
    W, H = 640, 360; c = Cena(W, H, clima, semente=5); r = c.rnd
    Y0, Y1 = 222, 262                                   # estrada funda: 6 fileiras de profundidade
    c.fundo(y_horizonte=198, y_longe=88, y_meio=118, x_meio=-30)
    c.grama(0, 198, W - 1, Y0 - 1); c.ret(0, 197, W - 1, 197, GRAMA[3]); c.ret(0, 198, W - 1, 199, GRAMA[0])
    c.estrada(0, Y0, W - 1, Y1)
    c.ret(0, Y1 + 1, W - 1, Y1 + 2, GRAMA[0]); c.ret(0, Y1 + 3, W - 1, Y1 + 3, GRAMA[2])
    c.grama(0, Y1 + 4, W - 1, H - 1)
    b = Y0 - 2
    c.predio('castelo', 592, Y0 + 6); c.predio('portao', 32, Y0 + 6)
    c.luzes.append((12, Y0 - 24, 30, (255, 170, 80), 1.0)); c.luzes.append((52, Y0 - 24, 30, (255, 170, 80), 1.0))
    lotes = [112, 192, 272, 352, 432, 512]
    for cx, (nome, fam, niv) in zip(lotes, (('quartel', 'anil', 2), ('moinho', 'laranja', 1), ('tenda', 'folha', 2), ('ferraria', 'carmim', 1), ('torre-mago', 'anil', 1), (None, None, 0))):
        if nome is None: c.vazio(cx, b + 1); continue
        c.predio(nome, cx, b)
        if nome == 'moinho': c.pas(cx - 2, b - 34, 0.5, 13)
        if nome == 'ferraria': c.luzes.append((cx + 2, b - 8, 22, (255, 150, 70), 0.9))
        c.bandeira(cx - 28, b + 1, FAMILIA[fam], niv)
    tr = []; fundo_y = lambda i, k=7: Y0 + 4 + (i * k) % 35
    for i in range(34):                                  # invasores: do portao ate o choque
        x = 62 + i * 6.6 + r.randrange(-3, 4); y = fundo_y(i, 11)
        tr.append(dict(n='invasor-golpe' if (x > 262 or i % 5 == 0) else 'invasor', x=x, y=y, vira=True, brilho='lima'))
    tr.append(dict(n='bruto', x=170, y=Y1 - 3, vira=True, brilho='lima')); tr.append(dict(n='bruto', x=250, y=Y0 + 16, vira=True, brilho='lima'))
    for i in range(7):                                   # linha de frente
        n = ('cavaleiro', 'lanceiro-golpe', 'lanceiro-golpe')[i % 3]
        tr.append(dict(n=n, x=300 + (i % 2) * 8, y=Y0 + 5 + i * 5.5, vira=True))
    tr.append(dict(n='lanceiro-apanhou', x=292, y=Y0 + 22, vira=True, branco=True))
    for i in range(24):
        x = 322 + i * 7.4 + r.randrange(-3, 4); y = fundo_y(i, 13)
        tr.append(dict(n=r.choice(['lanceiro', 'lanceiro-passo', 'lanceiro', 'cavaleiro', 'lanceiro']), x=x, y=y, vira=True))
    for i, x in enumerate((340, 356, 372, 392, 410, 474)): tr.append(dict(n='arqueiro-tiro' if i != 2 else 'arqueiro', x=x, y=Y0 + 2 + (i % 2) * 2, vira=True))
    tr.append(dict(n='mago', x=452, y=Y0 + 6, vira=True, brilho='ciano'))
    for i in range(5): tr.append(dict(n='lanceiro-passo', x=506 + i * 11, y=Y0 + 10 + (i * 9) % 26, vira=True))
    c.tropa(tr)
    for (x, y) in ((290, Y0 + 12), (298, Y0 + 26), (284, Y1 - 2), (170, Y1 - 1), (250, Y0 + 18), (110, Y0 + 20), (330, Y1 - 4), (86, Y0 + 30), (292, Y0 + 38)): c.poeira(x, y, 3)
    c.faisca(290, Y0 - 6); c.faisca(286, Y0 + 12, r=2); c.faisca(293, Y0 + 26, r=2); c.faisca(289, Y1 - 12)
    c.numero(300, Y0 - 30, '12'); c.numero(278, Y0 - 24, '7'); c.numero(314, Y0 - 20, '5'); c.numero(236, Y0 - 26, '9')
    c.flecha(338, Y0 - 24, 226, Y0 - 4, alt=22, n=0.72); c.flecha(356, Y0 - 24, 190, Y0, alt=26, n=0.45); c.flecha(392, Y0 - 24, 140, Y0 + 4, alt=32, n=0.3); c.flecha(372, Y0 - 24, 256, Y0 - 12, alt=16, n=0.9)
    c.tempestade(174, Y0 - 62); c.raio(174, Y0 - 58, 170, Y0 - 30); c.numero(192, Y0 - 40, '40!', critico=True)
    c.orbe(438, Y0 - 14)
    # plano da frente (3o plano de paralaxe): moitas escuras nos cantos, fora do caminho do olho
    d = ImageDraw.Draw(c.mundo)
    for (x, y, rr) in ((6, 350, 30), (44, 362, 24), (88, 368, 18), (634, 300, 22), (604, 372, 26), (150, 374, 16), (190, 366, 10), (470, 372, 16), (500, 368, 10)):
        d.ellipse((x - rr + PAD, y - rr + PAD, x + rr + PAD, y + rr + PAD), fill=GRAMA[3])
        d.ellipse((x - rr + 3 + PAD, y - rr + 2 + PAD, x + rr - 6 + PAD, y + rr - 12 + PAD), fill=(48, 108, 62))
        for k in range(rr // 3): d.point((x - rr // 2 + k * 5 + PAD, y - rr + 5 + (k * 3) % 5 + PAD), GRAMA[1])
    im = c.revelar()
    if ui:
        hud(im, W, 320, rodada='RODADA 9', pinos=3, forca=(38, 36), x_bar=(270, 370))
        painel(im, 226, 270, 414, H + 2)
        mao(im, 320, 277)
        painel(im, 528, 306, 632, 352, ripas=False)
        texto(im, 580, 311, 'ESPOLIO', OURO, sombra=AMEIXA, centro=True)
        for i, (ic, t) in enumerate(((MOEDA, '+30'), (CORACAO, '+1'), (ESTRELA, 'x1'))):
            x = 546 + i * 34
            painel(im, x - 14, 322, x + 14, 348, cor=(78, 58, 102), ripas=False)
            im.alpha_composite(ic, (x - ic.width // 2, 326)); texto(im, x + 1, 338, t, CREME, centro=True)
        texto(im, 8, 346, 'ESCOLHA 1 CARTA', CREME, contorno=AMEIXA)
    return im


def climas():
    cs = [celular('manha'), celular('tarde'), celular('noite', chefe=True)]
    out = Image.new('RGBA', (180 * 3 + 16, 370 + 18), AMEIXA + (255,))
    for i, (im, t) in enumerate(zip(cs, ('MANHÃ: RODADAS 1 E 2', 'TARDE: RODADAS 3 E 4', 'NOITE: RODADA DO CHEFE'))):
        out.alpha_composite(im, (4 + i * 184, 14)); texto(out, 4 + i * 184 + 90, 4, t, CREME, centro=True)
    return out


def folha_pecas():
    grupos = [('ALIADOS (OLHAM PARA A DIREITA)', ['lanceiro', 'lanceiro-passo', 'lanceiro-golpe', 'lanceiro-apanhou', 'arqueiro', 'arqueiro-tiro', 'cavaleiro', 'mago']),
              ('INVASORES (ROXO E LIMA, OLHAM PARA A ESQUERDA)', ['invasor', 'invasor-golpe', 'bruto', 'chefe']),
              ('REINO', ['castelo', 'portao', 'quartel', 'moinho', 'tenda', 'ferraria', 'torre-mago'])]
    W = 440; out = Image.new('RGBA', (W, 420), (110, 170, 96, 255)); d = ImageDraw.Draw(out); y = 0
    for titulo, nomes in grupos:
        d.rectangle((0, y, W, y + 10), fill=AMEIXA); texto(out, 4, y + 2, titulo, CREME); y += 14
        h = max(spr(n).height for n in nomes); x = 8
        for n in nomes:
            s = spr(n); leg = n.upper().replace('LANCEIRO-', '').replace('ARQUEIRO-', '').replace('INVASOR-', '').replace('-MAGO', '')
            cw = max(s.width, largura(leg), 30)
            out.alpha_composite(s, (x + (cw - s.width) // 2, y + h - s.height))
            texto(out, x + cw // 2, y + h + 3, leg, AMEIXA, centro=True)
            texto(out, x + cw // 2, y + h + 12, f'{s.width}x{s.height}', (40, 92, 58), centro=True)
            x += cw + 8
        y += h + 24
    d.rectangle((0, y, W, y + 10), fill=AMEIXA); texto(out, 4, y + 2, 'POR CODIGO: CARTA (MOLDURA=RARIDADE, FAIXA=FAMILIA, SELO=TIPO), ICONES, FONTE', CREME); y += 14
    cs = [carta('LANCEIRO', 'anil', 'comum', 'tropa', 'lanceiro', 1, 3, quant='x4'), carta('MOINHO', 'laranja', 'incomum', 'construcao', 'moinho', 2, 3, quant='+2'),
          carta('RAIO', 'carmim', 'rara', 'magia', None, 1, 3, quant='40'), carta('MAGO', 'folha', 'lendaria', 'tropa', 'mago', 3, 3, quant='x1')]
    for i, c in enumerate(cs):
        out.alpha_composite(c, (8 + i * 62, y)); texto(out, 8 + i * 62 + 28, y + 81, ('COMUM', 'INCOMUM', 'RARA', 'LENDARIA')[i], AMEIXA, centro=True)
    x = 264
    for ic in (CORACAO, CORACAO_VAZIO, MOEDA, CAVEIRA, ESCUDO, CHIFRE): out.alpha_composite(ic, (x, y + 2)); x += 13
    for i, ic in enumerate((ESPADA, MARTELO, ESTRELA)): d.rectangle((264 + i * 13, y + 14, 272 + i * 13, y + 22), fill=(58, 42, 78)); out.alpha_composite(ic, (265 + i * 13, y + 15))
    botao(out, 312, y + 12, icone='>>')
    texto(out, 264, y + 40, 'REINO 5X7: ABCDEFGHIJKLM', AMEIXA); texto(out, 264, y + 50, 'NOPQRSTUVWXYZ 0123456789', AMEIXA)
    texto(out, 264, y + 64, 'AÇÃO, CORAÇÕES, VITÓRIA!', AMEIXA); texto(out, 264, y + 78, '12', CREME, contorno=AMEIXA); texto(out, 282, y + 78, '40!', OURO, contorno=AMEIXA)
    return out.crop((0, 0, W, y + 94))


def _quadro(s, dx=0, dy=0, cel=(44, 40), branco=False, alfa=None):
    if branco:
        a = np.array(s); m = (a[..., 3] > 0) & (a[..., :3].max(axis=2) > 62); a[m, :3] = (255, 252, 236); s = Image.fromarray(a, 'RGBA')
    if alfa is not None:   # some em pontilhado (sem transparencia lisa)
        a = np.array(s); yy, xx = np.indices(a.shape[:2]); a[BAYER[yy % 4, xx % 4] > alfa, 3] = 0; s = Image.fromarray(a, 'RGBA')
    q = Image.new('RGBA', cel, (0, 0, 0, 0)); q.paste(s, (8 + dx, cel[1] - 4 - s.height + dy))
    return q


def _inclinar(s, px):
    """Inclina o boneco: desloca as linhas de cima (antecipacao e peso, sem redesenhar)."""
    a = np.array(s); h = a.shape[0]; o = np.zeros((h, a.shape[1] + abs(px) + 1, 4), np.uint8)
    for y in range(h):
        d = int(round(px * (1 - y / (h - 1)) ** 1.3)); o[y, max(0, -px) + d: max(0, -px) + d + a.shape[1]] = a[y]
    return Image.fromarray(o, 'RGBA')


def _amassar(s, n):
    """Tira n linhas do meio do corpo (amassa) mantendo cabeca e pe."""
    a = np.array(s); h = a.shape[0]; tira = [h - 7 - 2 * i for i in range(n)]
    return Image.fromarray(np.delete(a, tira, axis=0), 'RGBA')


def animacao():
    par, pas, gol, apa = spr('lanceiro'), spr('lanceiro-passo'), spr('lanceiro-golpe'), spr('lanceiro-apanhou')
    cel = (44, 40)
    # ANDAR: 2 poses geradas (passo, parado) + 2 de codigo = ciclo de 4, 110 ms cada
    andar = [(_quadro(pas, 2, 0), 'PASSO|(GERADO)'), (_quadro(par, 0, -1), 'PASSA|SOBE 1 PX'), (_quadro(_inclinar(pas, 1), 1, 0), 'PASSO|INCLINADO'), (_quadro(_amassar(par, 1), 0, 0), 'PISA|AMASSA 1 PX')]
    # BATER: parado -> antecipa (recua e inclina) -> golpe gerado com rastro -> segura com faisca -> volta
    q3 = _quadro(gol, 4, 0); d = ImageDraw.Draw(q3)
    d.line((14, 21, 30, 21), fill=(255, 255, 255)); d.line((10, 23, 24, 23), fill=(255, 240, 170)); d.point([(6, 22), (8, 21), (4, 23)], (255, 255, 255))
    q4 = _quadro(gol, 6, 0); d = ImageDraw.Draw(q4)
    for (x, y) in ((41, 20), (40, 20), (42, 20), (41, 19), (41, 21), (41, 17), (41, 23), (38, 20), (43, 20)): d.point((x, y), (255, 255, 255))
    d.point([(39, 18), (43, 22), (43, 18), (39, 22)], OURO)
    bater = [(_quadro(par, 0, 0), 'PARADO'), (_quadro(_amassar(_inclinar(par, -3), 1), -3, 0), 'ANTECIPA|120 MS'), (q3, 'GOLPE (GERADO)|COM RASTRO'), (q4, 'SEGURA 60 MS|COM FAISCA'),
             (_quadro(_inclinar(gol, -1), 2, 0), 'VOLTA'), (_quadro(par, 0, 0), 'PARADO')]
    # APANHAR e CAIR: pose gerada em branco 1 quadro, recuo, tomba 90 graus, some em pontilhado
    cai = apa.transpose(Image.ROTATE_90)
    apanhar = [(_quadro(apa, -1, 0, branco=True), 'BRANCO|50 MS'), (_quadro(apa, -3, -1), 'RECUA|3 PX'), (_quadro(_inclinar(apa, -3), -5, 0), 'TOMBA'),
               (_quadro(cai, -4, 0), 'CAIDO|(GIRO DE 90)'), (_quadro(cai, -4, 0, alfa=0.55), 'SOME|PONTILHADO'), (_quadro(cai, -4, 0, alfa=0.22), 'SOME|FIM')]
    linhas = [('ANDAR: 4 QUADROS, 110 MS CADA', andar), ('BATER: 6 QUADROS (ANTECIPA, GOLPE, SEGURA, VOLTA)', bater), ('APANHAR E CAIR: 6 QUADROS', apanhar)]
    W = 6 * (cel[0] + 44) + 8; out = Image.new('RGBA', (W, 3 * (cel[1] + 37) + 12), (110, 170, 96, 255)); d = ImageDraw.Draw(out); y = 0
    for titulo, qs in linhas:
        d.rectangle((0, y, W, y + 10), fill=AMEIXA); texto(out, 4, y + 2, titulo, CREME); y += 13
        for i, (q, leg) in enumerate(qs):
            x = 26 + i * (cel[0] + 44)
            d.rectangle((x, y, x + cel[0] - 1, y + cel[1] - 1), fill=(124, 184, 108)); d.rectangle((x, y + cel[1] - 5, x + cel[0] - 1, y + cel[1] - 1), fill=TERRA[1])
            d.rectangle((x, y + cel[1] - 5, x + cel[0] - 1, y + cel[1] - 5), fill=TERRA[2])
            d.ellipse((x + 10, y + cel[1] - 7, x + 30, y + cel[1] - 3), fill=(150, 112, 84))
            out.alpha_composite(q, (x, y))
            l1, l2 = (leg.split('|') + [''])[:2]
            texto(out, x + cel[0] // 2, y + cel[1] + 2, l1, AMEIXA, centro=True); texto(out, x + cel[0] // 2, y + cel[1] + 11, l2, AMEIXA, centro=True)
        y += cel[1] + 24
    texto(out, 4, y + 1, 'GERADO: 4 POSES-CHAVE (PARADO, PASSO, GOLPE, APANHOU). O RESTO E CODIGO.', AMEIXA)
    return out


if __name__ == '__main__':
    o = sys.argv[1] if len(sys.argv) > 1 else 'tudo'
    if o in ('celular', 'tudo'):
        ampliar(celular('tarde'), 4).convert('RGB').save(os.path.join(SAI, 'quadro-chave-celular.png'), optimize=True); print('celular ok')
    if o in ('pc', 'tudo'):
        ampliar(pc('tarde'), 2).convert('RGB').save(os.path.join(SAI, 'quadro-chave-pc.png'), optimize=True); print('pc ok')
    if o in ('climas', 'tudo'):
        ampliar(climas(), 2).convert('RGB').save(os.path.join(SAI, 'tres-climas.png'), optimize=True); print('climas ok')
    if o in ('pecas', 'tudo'):
        ampliar(folha_pecas(), 4).convert('RGB').save(os.path.join(SAI, 'folha-pecas.png'), optimize=True); print('pecas ok')
    if o in ('anim', 'tudo'):
        ampliar(animacao(), 3).convert('RGB').save(os.path.join(SAI, 'soldado-andar-bater.png'), optimize=True); print('anim ok')
