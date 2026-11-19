"""Provas da ARTE COMPLETA (R11), montadas SO com o que esta em public/reino/arte/ (atlas.json + folhas), pelo pintor da
provas2.py: se a prova sai certa, a tela consegue montar igual. Gera em arte/reino/prova/: elenco-completo.png, cartas-30.png,
chefes.png, andar-v2.png, quadro-chave-v3-pc.png, quadro-chave-v3-celular.png e logo-e-icones.png.
Uso: python3 -B arte/reino/provas3.py [elenco cartas chefes andar pc celular logo]"""
import os, sys, random
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image, ImageDraw
import provas2 as p2
from provas2 import A, rec, hx, amp, quadro, texto, Pintor, icone, nove, hud, espolio, terreno_marcas, AMEIXA, CREME, OURO, VERDE, FAIXA, PROVA

FAM = {'Pikewall': ['T01', 'T02', 'T03', 'B01', 'B02', 'B03', 'M04'], 'Thornbow': ['T04', 'T05', 'T06', 'B04', 'B05', 'M03', 'M06'],
       'Potluck': ['T07', 'T08', 'T09', 'B06', 'B07', 'B08', 'M05', 'M07'], 'Fizzwick': ['T10', 'T11', 'T12', 'B09', 'B10', 'M01', 'M02', 'M08']}
INV = ['muncher', 'stilt-runner', 'spud-slinger', 'potlid-brute', 'bloater', 'mole-raider', 'drum-bully', 'quack']
CHEFES = ['gutbucket', 'niptuck', 'moleworth', 'gobble']
FORCA = dict(T01='x3', T02='x2', T03='x1', T04='x2', T05='x1', T06='x1', T07='x3', T08='x1', T09='x2', T10='x2', T11='x4', T12='x1', B01='+30%', B02='+1', B03='-25%', B04='+0.5', B05='+50%',
             B06='3/s', B07='+3', B08='+40%', B09='50%', B10='6', M01='30', M02='-40%', M03='8/s', M04='+50%', M05='80%', M06='3', M07='2', M08='12%')


def carta3(cid, nivel=1, forca=None, destaque=False):
    c = A['cartas']; t = c['todas'][cid]; im = rec(t['folha'], t['quadro'])
    for i in range(nivel): im.alpha_composite(rec('interface', A['icones']['quadros']['pin-on']), tuple(c['pinos'][i]))
    fo = FORCA.get(cid, '') if forca is None else forca
    if fo: texto(im, c['texto_forca'][0], c['texto_forca'][1], fo, 'reino', centro=True, cor=AMEIXA)
    if destaque:
        a = np.array(im); a = np.pad(a, ((2, 2), (2, 2), (0, 0)))
        for cor in (OURO, (255, 250, 200)):
            al = a[..., 3] > 0; p = np.pad(al, 1); novo = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~al
            a[novo, :3] = cor; a[novo, 3] = 255
        im = Image.fromarray(a, 'RGBA')
    return im


def pintar(im, cor):
    a = np.array(im); m = a[..., 3] > 0; a[m, :3] = cor; return Image.fromarray(a, 'RGBA')


def sombra(im, x, y, tam=0, alfa=0.3):
    sh, anc = quadro('shadow', None, tam); a = np.array(sh).astype(float); a[..., 3] *= alfa
    im.alpha_composite(Image.fromarray(a.astype(np.uint8), 'RGBA'), (int(x - anc[0]), int(y - anc[1])))


# ---------------------------------------------------------------- elenco completo
def elenco():
    W = 640; im = Image.new('RGBA', (W, 1400), VERDE); d = ImageDraw.Draw(im); y = 0
    def faixa(s, cor=FAIXA):
        nonlocal y
        d.rectangle((0, y, W, y + 10), fill=cor); texto(im, 4, y + 2, s, 'reino'); y += 12
    for fam, ids in FAM.items():
        faixa('%s  -  TROOPS (3 FACES / 3 TONES), BUILDINGS (LEVEL 1, 3, 5), MAGIC' % fam.upper(), hx(A['familias'][fam]['escuro']) + (255,))
        x = 2
        for pid in ids[:3]:                                    # tropas: 3 variantes
            p = A['pecas'][pid]
            for v in range(3):
                q, anc = quadro(pid, 'idle', 0, v); sombra(im, x + v * 25 - 8 + anc[0], y + 2 + anc[1]); im.alpha_composite(q, (x + v * 25 - 8, y + 2))
            d.rectangle((x + 4, y + 44, x + 74, y + 45), fill=hx(p['cor']) + (255,))
            texto(im, x + 40, y + 48, p['nome'], 'mini-contorno', centro=True); texto(im, x + 40, y + 56, pid, 'mini', centro=True); x += 84
        for pid in [i for i in ids if i[0] == 'M']:            # magias: parada e disparando
            p = A['pecas'][pid]; an = [a for a in p['animacoes'] if a not in ('idle', 'hold', 'wither')]; q, anc = quadro(pid, 'idle', 0)
            im.alpha_composite(q, (x + 30 - q.width // 2, y + 44 - q.height))
            if an and pid != 'M01':
                q2, _ = quadro(pid, an[0], max(0, len(p['animacoes'][an[0]]['quadros']) - 2)); im.alpha_composite(q2, (x + 88 - q2.width // 2, y + 44 - q2.height))
            elif pid == 'M01': q2, _ = quadro('explosion', 'play', 2); im.alpha_composite(q2.crop((6, 14, 66, 60)), (x + 58, y - 2))
            texto(im, x + 58, y + 48, p['nome'], 'mini-contorno', centro=True); texto(im, x + 58, y + 56, pid, 'mini', centro=True); x += 122
        y += 64; x = 0
        for pid in [i for i in ids if i[0] == 'B']:            # construcoes: nivel 1, 3 e 5
            for j, nv in enumerate(('n1', 'n3', 'n5')):
                q, anc = quadro(pid, nv, 1); im.alpha_composite(q, (x + (-18, 36, 102)[j], y))
            texto(im, x + 92, y + 73, A['pecas'][pid]['nome'] + '  ' + pid, 'mini-contorno', centro=True); x += 196
        y += 82
    faixa('THE HUNGRY HORDE  -  8 INVADERS (FACE LEFT, PURPLE + LIME EYES)', hx(A['invasores']['cor']) + (255,)); x = 2
    for pid in INV:
        p = A['pecas'][pid]; n = len(p.get('variantes', [0])); big = p['tamanho'][0] > 60
        for v in range(min(n, 2 if big else 3)):
            q, anc = quadro(pid, 'idle', 0, v); sombra(im, x + v * (40 if big else 22) - 6 + anc[0], y + 58 - q.height + anc[1], 1 if big else 0); im.alpha_composite(q, (x + v * (40 if big else 22) - 6, y + 58 - q.height))
        texto(im, x + (48 if big else 34), y + 60, p['nome'], 'mini-contorno', centro=True); x += 100 if big else 74
    y += 70
    faixa('THE 4 BOSSES (ROUNDS 5, 10, 15, 20)', hx(A['invasores']['cor']) + (255,)); x = -8
    for pid in CHEFES:
        p = A['pecas'][pid]
        for v in range(len(p.get('variantes', [0]))):
            q, anc = quadro(pid, 'idle', 0, v); sombra(im, x + anc[0], y + anc[1] + 2, 3); im.alpha_composite(q, (x, y + 2)); x += 78 if pid == 'niptuck' and v == 0 else 0
        texto(im, x + (56 if pid != 'niptuck' else 18), y + 95, p['nome'], 'mini-contorno', centro=True); x += 120
    y += 106
    faixa('CASTLE (3 STATES), GATE, FLAGS, EMPTY PLOT, SCENERY EXTRAS'); x = 0
    for e in ('whole', 'cracked', 'ruined'): q, _ = quadro('castle', e, 0); im.alpha_composite(q, (x - 6, y)); x += 92
    q, _ = quadro('gate', 'idle', 0); im.alpha_composite(q, (x - 2, y + 24))
    for i, fam in enumerate(A['familias']): q, _ = quadro('plot-flag', fam, i); im.alpha_composite(q, (366 + i * 18, y + 6))
    for i, n in enumerate((1, 6)): q, _ = quadro('plot-empty', 'plot%d' % n, 1); im.alpha_composite(q, (352 + i * 44, y + 46))
    q, _ = quadro('bunting', 'play', 1); im.alpha_composite(q, (460, y + 4)); im.alpha_composite(q, (524, y + 4))
    x = 462
    for e, n in (('bird', 3), ('firefly', 3), ('dust-mote', 3), ('falcon', 2), ('pie', 2), ('big-bolt', 1), ('step-dust', 2)):
        for i in range(n): q, _ = quadro(e, 'play', i); im.alpha_composite(q, (x, y + 28)); x += q.width + 2
        x += 4
    q, _ = quadro('bolt', 'play', 0); im.alpha_composite(q, (462, y + 44)); q, _ = quadro('drum-wave', 'play', 1); im.alpha_composite(q, (510, y + 40)); q, _ = quadro('quack-heal', 'play', 1); im.alpha_composite(q, (562, y + 38))
    q, _ = quadro('gas-burst', 'play', 2); im.alpha_composite(q.crop((4, 10, 68, 62)), (452, y + 60)); q, _ = quadro('fireworks', 'play', 4); im.alpha_composite(q.crop((6, 0, 96, 70)), (530, y + 50))
    y += 112
    return im.crop((0, 0, W, y))


def cartas30():
    ids = sorted(A['cartas']['todas'], key=lambda c: ('TBM'.index(c[0]), c)); W = 10 * 60 + 4; im = Image.new('RGBA', (W, 3 * 86 + 14), VERDE); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 10), fill=FAIXA); texto(im, 4, 2, 'THE 30 CARDS  -  FRAME = RARITY, RIBBON = FAMILY, SEAL = TYPE, PINS = LEVEL', 'reino')
    ordem = [c for c in ids if c[0] == 'T'][:10] + [c for c in ids if c[0] == 'B'] + [c for c in ids if c[0] == 'T'][10:] + [c for c in ids if c[0] == 'M']
    for i, cid in enumerate(ordem):
        t = A['cartas']['todas'][cid]; nv = {'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Epic': 4, 'Legendary': 5}[t['raridade']]
        x = 3 + (i % 10) * 60; y = 16 + (i // 10) * 86
        if t['raridade'] in ('Rare', 'Epic', 'Legendary'):
            g, _ = quadro('card-glow', 'play', 2); im.alpha_composite(pintar(g, hx(A['raridades'][t['raridade']]['claro'])), (x - 6, y - 6))
        im.alpha_composite(carta3(cid, nv), (x, y))
        if t['raridade'] in ('Epic', 'Legendary'):
            s, _ = quadro('rarity-shine', 'play', 2); a = np.array(s); a[..., 3] = (a[..., 3] * 0.55).astype(np.uint8); im.alpha_composite(Image.fromarray(a, 'RGBA'), (x, y))
    return im


def chefes():
    P = Pintor('pc', 'boss-night'); c = P.c; P.fundo(((40, 26, 0), (212, 34, 1), (330, 28, 2))); y = 182
    xs = [56, 152, 214, 316, 420]
    for (pid, v, x, an, i) in (('gutbucket', 0, xs[0], 'idle', 0), ('niptuck', 0, xs[1], 'attack', 1), ('niptuck', 1, xs[2], 'idle', 0), ('moleworth', 0, xs[3], 'attack', 1), ('gobble', 0, xs[4], 'idle', 0)):
        P.peca(pid, x, y, an, i, var=v, sombra=3)
    for k, x in enumerate((100, 262, 368)): P.peca('T01', x, y + 4, 'idle', 0, var=k, vira=False, sombra=0)
    for x in (30, 250, 400): P.efeito('firefly', x, 150 - (x % 30), 2)
    P.desenhar(); P.frente(); P.vinheta(); im = P.im; d = ImageDraw.Draw(im)
    for (x, nome, r, regra) in ((xs[0], 'GUTBUCKET THE WIDE', 5, 'SWING HITS ALL NEAR'), ((xs[1] + xs[2]) // 2, 'NIP & TUCK', 10, 'ONE FALLS - ONE RAGES'), (xs[3], 'MADAME MOLEWORTH', 15, 'DIGS TO PLOT 4'), (xs[4], 'KING GOBBLE', 20, 'CALLS MUNCHERS')):
        s, _ = quadro('M01', 'idle', 0)
        se = rec('extras', A['fim']['selo_chefe']['quadros'][0]); im.alpha_composite(se, (x - 12, 196))
        texto(im, x, 224, nome, 'mini-contorno', centro=True); texto(im, x, 232, 'ROUND %d' % r, 'mini-ouro', centro=True); texto(im, x, 242, regra, 'mini', centro=True)
    texto(im, 240, 6, 'THE 4 BOSSES  -  72 PX, PIKEMAN FOR SCALE', 'reino-contorno', centro=True)
    return im.crop((0, 0, 480, 256))


def andar():
    ids = [i for f in FAM.values() for i in f if i[0] == 'T'] + INV + CHEFES; lin = []
    for pid in ids:
        p = A['pecas'][pid]; w, h = p['tamanho']; qs = p['animacoes']['walk']['quadros']
        im = Image.new('RGBA', (7 * (w + 2) + 150, h + 4), VERDE); d = ImageDraw.Draw(im)
        base, _ = quadro(pid, None, 0); nb = int((np.array(base)[..., 3] > 0).sum())
        d.rectangle((2, 2, w + 1, h + 1), fill=(96, 150, 92, 255)); im.alpha_composite(base, (2, 2))
        cont = []
        for k in range(len(qs)):
            x = 4 + (k + 1) * (w + 2); q, _ = quadro(pid, 'walk', k); cont.append(int((np.array(q)[..., 3] > 0).sum()))
            d.rectangle((x, 2, x + w - 1, h + 1), fill=(120, 184, 112, 255)); d.rectangle((x, 2 + p['ancora'][1], x + w - 1, h + 1), fill=(205, 160, 104, 255)); im.alpha_composite(q, (x, 2))
        x = 8 + 7 * (w + 2); pior = max(abs(c - nb) * 100.0 / nb for c in cont)
        texto(im, x, 4, p['nome'], 'mini-contorno'); texto(im, x, 13, 'BASE %d PX' % nb, 'mini'); texto(im, x, 21, 'WALK ' + ' '.join(str(c) for c in cont[:3]), 'mini'); texto(im, x, 29, '     ' + ' '.join(str(c) for c in cont[3:]), 'mini')
        texto(im, x, 4 + min(h - 10, 38), 'MAX DIFF %.1f%%' % pior, 'mini-ouro' if pior <= 8 else 'mini-contorno')
        lin.append(im)
    W = max(l.width for l in lin); H = sum(l.height for l in lin) + 12
    o = Image.new('RGBA', (W, H), VERDE); d = ImageDraw.Draw(o); d.rectangle((0, 0, W, 10), fill=FAIXA); texto(o, 4, 2, 'WALK V2: STANDING POSE + 6-FRAME CYCLE (BOTH LEGS), PIXEL COUNT VS BASE', 'reino'); y = 12
    for l in lin: o.alpha_composite(l, (0, y)); y += l.height
    return o


# ---------------------------------------------------------------- quadro-chave v3
def grupo(P, pid, cx, y0, alt, n, vira, anims, passo=11, var0=0, tam=0):
    """n bonecos em formacao desencontrada dentro da faixa da estrada [y0, y0+alt]."""
    out = []; fil = 4 if alt > 30 else 2
    for k in range(n):
        f = k % fil; col = k // fil
        y = y0 + (9 if alt > 30 else 6) + f * ((alt - (12 if alt > 30 else 8)) // max(1, fil - 1)); x = cx + (col * passo + (f % 2) * 5) * (1 if vira else -1) * (-1) + (n // fil) * passo // 2 * (1 if vira else -1)
        an, i = anims[k % len(anims)]; P.peca(pid, x, y, an, i, var=k + var0, vira=vira, sombra=tam); out.append((x, y))
    return out


def mao3(im, cx, y, cartas, escolhida=1, selo=0, brilho=()):
    n = len(cartas); x0 = cx - (n * 58) // 2
    for i, (cid, nv, fo) in enumerate(cartas):
        c = carta3(cid, nv, fo, destaque=(i == escolhida)); x = x0 + i * 58 + (-2 if i == escolhida else 0); yy = y - (10 if i == escolhida else 0)
        if i in brilho:
            g, _ = quadro('card-glow', 'play', 2); im.alpha_composite(pintar(g, hx(A['raridades'][A['cartas']['todas'][cid]['raridade']]['claro'])), (x - 6 + (2 if i == escolhida else 0), yy - 6 + (2 if i == escolhida else 0)))
        im.alpha_composite(c, (x, yy))
        if i in brilho:
            s, _ = quadro('rarity-shine', 'play', 2); a = np.array(s); a[..., 3] = (a[..., 3] * 0.5).astype(np.uint8); im.alpha_composite(Image.fromarray(a, 'RGBA'), (x + (2 if i == escolhida else 0), yy + (2 if i == escolhida else 0)))
        if i == selo:
            s = rec('interface', A['interface']['pecas']['level-up']['quadros'][1]); im.alpha_composite(s, (x + (c.width - s.width) // 2, yy - 9))


def numero3(P, x, y, s, tam='medio', tipo='normal'):
    f = A['dano'][tam][tipo]; t = Image.new('RGBA', (70, 18), (0, 0, 0, 0)); w = texto(t, 0, 0, s, f); P.fx.append((t, x - w // 2, y))


def chave_pc():
    """PC, tarde dourada, RODADA 14: reino cheio (6 terrenos) contra a horda grande."""
    P = Pintor('pc', 'afternoon'); c = P.c; T = c['terrenos']; P.fundo(((40, 26, 0), (212, 34, 1), (330, 28, 2)))
    P.peca('gate', c['portao'][0], c['portao'][1], sombra=2, z=-50); P.peca('castle', c['castelo'][0], c['castelo'][1], 'cracked', sombra=3, z=-50)
    y0, y1 = T[0]['estrada']; alt = y1 - y0
    # reino: 1 Pikeman n5 · 2 Stone Wall n3 · 3 Frypan Cook n4 · 4 Angry Bees · 5 Granny Bolt n3 + Feast Hall n5 atras · 6 Sparkwright n4
    for t, fam, nv in ((T[0], 'Pikewall', 5), (T[1], 'Pikewall', 3), (T[2], 'Potluck', 4), (T[3], 'Thornbow', 2), (T[4], 'Potluck', 5), (T[5], 'Fizzwick', 4)): terreno_marcas(P, t, fam, nv, q=t['n'] % 4)
    P.peca('B03', T[1]['x'] + 2, T[1]['base_predio'], 'n3', 1, sombra=2, z=-20)
    P.peca('B08', T[4]['x'] + 4, T[4]['base_predio'], 'n5', 2, sombra=2, z=-20)
    P.peca('M03', T[3]['x'] + 2, y0 + 20, 'swarm', 2, sombra=None)
    for x in (T[0]['x'] - 8, T[2]['x'] - 30, T[3]['x'] + 8): P.chao.append((quadro('bunting', 'play', (x // 7) % 4)[0], x, y0 - 62 + (x % 5)))          # bandeirolas ao vento, entre os predios
    P.chao.append((quadro('M02', 'idle', 1)[0], T[1]['x'] - 30, y0 + 22))                                                                         # poca de piche de uma rodada anterior
    X = T[0]['x']
    grupo(P, 'T01', X + 4, y0, alt, 5, True, [('attack', 1), ('attack', 0), ('attack', 2), ('idle', 0), ('hit', 1)])
    P.peca('T03', T[1]['x'] + 6, y0 + 30, 'attack', 1, vira=True, sombra=0)                                                                        # Sir Dent veio ajudar na frente
    grupo(P, 'T07', T[2]['x'] + 4, y0, alt, 5, True, [('walk', 0), ('idle', 0), ('walk', 3), ('idle', 1), ('walk', 2)], var0=1)
    P.peca('T08', T[2]['x'] + 24, y0 + 40, 'attack', 1, vira=True, sombra=0); P.efeito('heal', T[2]['x'] + 2, y0 + 30, 2)
    grupo(P, 'T05', T[4]['x'] + 2, y0 + 6, alt - 12, 2, True, [('attack', 1), ('idle', 0)], passo=14)
    P.peca('T06', T[4]['x'] - 18, y0 + 44, 'attack', 1, vira=True, sombra=0); P.efeito('falcon', T[2]['x'] - 20, y0 - 20, 1, vira=True)
    grupo(P, 'T12', T[5]['x'] - 2, y0 + 8, alt - 14, 2, True, [('attack', 1), ('idle', 1)], passo=14)
    for (x, y, q) in ((T[4]['x'] - 30, y0 + 4, 0), (T[3]['x'] - 4, y0 + 2, 1)): P.efeito('bolt', x, y, q, vira=True)
    # a horda da rodada 14 (17 invasores): Munchers, Brute, Bloaters, Drum Bully, Quack, Slingers, Stilts, Mole Raider saindo no terreno 4
    for k, (x, dy, pid, an, i) in enumerate(((X - 32, 9, 'muncher', 'attack', 1), (X - 26, 21, 'potlid-brute', 'attack', 1), (X - 36, 44, 'muncher', 'hit', 0), (X - 50, 12, 'bloater', 'walk', 0), (X - 54, 34, 'muncher', 'attack', 0),
                                              (X - 66, 22, 'drum-bully', 'idle', 1), (X - 72, 44, 'bloater', 'walk', 3), (X - 84, 10, 'spud-slinger', 'attack', 1), (X - 86, 34, 'quack', 'attack', 1),
                                              (X - 98, 20, 'muncher', 'walk', 1), (X - 100, 46, 'stilt-runner', 'walk', 2), (X - 112, 32, 'spud-slinger', 'walk', 4), (X - 116, 12, 'muncher', 'walk', 4),
                                              (X + 34, 12, 'stilt-runner', 'attack', 1), (X + 30, 40, 'muncher', 'walk', 2))):
        P.peca(pid, x, y0 + dy, an, i, var=k, vira=True, sombra=1 if pid == 'potlid-brute' else 0)
    P.peca('mole-raider', T[3]['x'] - 22, y0 + 38, 'emerge', 1, var=1, vira=True, sombra=None); P.efeito('dust', T[3]['x'] - 22, y0 + 38, 1)
    P.barra_vida(X - 26, y0 - 34, 24, 0.55); P.efeito('drum-wave', X - 66, y0 + 22, 2); P.efeito('quack-heal', X - 54, y0 + 20, 1)
    P.efeito('gas-burst', X - 6, y0 + 44, 2); numero3(P, X - 6, y0 - 4, '15', 'grande')
    P.efeito('spark', X - 18, y0 - 4, 1); P.efeito('slash', X - 20, y0 + 20, 0, vira=True); P.efeito('dust', X - 30, y0 + 38, 2); P.efeito('dust', X - 100, y0 + 30, 1)
    P.efeito('step-dust', X - 96, y0 + 22, 1); P.efeito('step-dust', X + 34, y0 + 42, 0)
    P.efeito('big-bolt', T[2]['x'] + 20, y0 - 2, 0, vira=True); P.efeito('spud', X - 44, y0 - 16, 1); P.efeito('pie', T[1]['x'] + 20, y0 - 22, 1)
    numero3(P, X - 34, y0 - 22, '6', 'pequeno'); numero3(P, X - 46, y0 + 2, '48!', 'medio', 'critico'); numero3(P, X + 28, y0 - 22, '9', 'pequeno'); numero3(P, T[2]['x'], y0 + 6, '+22', 'medio', 'cura'); numero3(P, T[3]['x'] + 2, y0 - 26, '14', 'pequeno')
    for (x, y, q) in ((120, 34, 0), (150, 44, 2), (306, 28, 1)): P.fx.append((quadro('bird', 'play', q)[0], x, y))
    rnd = random.Random(4)
    for _ in range(10): P.fx.append((quadro('dust-mote', 'play', rnd.randrange(4))[0], rnd.randrange(30, 440), rnd.randrange(y0 - 8, y1 - 6)))
    P.desenhar(); P.frente(); P.vinheta(); im = P.im
    hud(im, 480, 14, 2, 37, 20, 17, 1)
    mao3(im, 240, 190, [('T03', 3, 'x1'), ('B09', 1, '50%'), ('M08', 1, '12%')], escolhida=2, selo=0, brilho=(0, 1, 2))
    nove(im, 338, 214, 139, 54); texto(im, 407, 217, 'WIN TO PICK 1', 'mini-contorno', centro=True); espolio(im, 341, 224)
    b = A['interface']['pecas']['button-plum']; im.alpha_composite(rec('interface', b['solto']), (112, 240)); icone(im, 'reroll', 112 + 7, 240 + 6)
    icone(im, 'gold', 96, 247); texto(im, 88, 248, '2', 'reino-ouro'); texto(im, 8, 256, 'PICK 1 CARD', 'reino-contorno')
    x = 8                                                       # reliquias da partida, embaixo do ouro
    for r in ('horseshoe', 'bell', 'fuse'): im.alpha_composite(rec('extras', A['reliquias']['quadros'][r]), (x, 28)); x += 14
    return im


def chave_celular():
    """Celular, noite de chefe, RODADA 15: Madame Moleworth sai da terra no terreno 4; a horda sobe o morro."""
    P = Pintor('celular', 'boss-night'); c = P.c; T = c['terrenos']; P.fundo(((96, 30, 1), (20, 44, 0)))
    P.peca('castle', c['castelo'][0], c['castelo'][1], 'cracked', sombra=3, z=-60); P.peca('gate', c['portao'][0], c['portao'][1], sombra=None, z=-60)
    # reino: 1 Doorman n3 · 2 Pikeman n4 · 3 Tinker's Shed n3 · 4 Sir Dent n3 · 5 Hedge Archer n3 · 6 Watchtower n5
    for t, fam, nv in ((T[0], 'Pikewall', 3), (T[1], 'Pikewall', 4), (T[2], 'Fizzwick', 3), (T[3], 'Pikewall', 3), (T[4], 'Thornbow', 3), (T[5], 'Thornbow', 5)): terreno_marcas(P, t, fam, nv, q=t['n'] % 4)
    P.peca('B09', T[2]['x'] + 8, T[2]['base_predio'], 'n3', 2, sombra=2, z=-20)
    P.peca('B04', T[5]['x'] + 2, T[5]['base_predio'], 'n5', 0, sombra=2, z=-20)
    P.chao.append((quadro('bunting', 'play', 1)[0], 64, 222)); P.chao.append((quadro('bunting', 'play', 3)[0], 22, 152))
    # patamar de baixo (invasor anda para a direita): Doormen e Pikemen seguram a horda
    y0, y1 = T[0]['estrada']; alt = y1 - y0
    for k, (x, dy, pid, an, i) in enumerate(((16, 7, 'muncher', 'walk', 0), (28, 15, 'mole-raider', 'attack', 1), (6, 16, 'drum-bully', 'idle', 0), (40, 6, 'bloater', 'walk', 3), (44, 17, 'muncher', 'attack', 1))):
        P.peca(pid, x, y0 + dy, an, i, var=k, vira=True, sombra=0)
    for k, (x, dy, an, i) in enumerate(((60, 6, 'attack', 1), (66, 17, 'attack', 2), (78, 10, 'idle', 0))): P.peca('T02', x, y0 + dy, an, i, var=k, vira=True, sombra=0)
    for k, (x, dy, an, i) in enumerate(((108, 6, 'walk', 0), (116, 16, 'walk', 3), (128, 8, 'idle', 0), (138, 17, 'walk', 1))): P.peca('T01', x, y0 + dy, an, i, var=k, vira=True, sombra=0)
    P.efeito('spark', 53, y0 - 2, 1); P.efeito('drum-wave', 6, y0 + 16, 1); numero3(P, 50, y0 - 22, '9', 'pequeno'); P.efeito('step-dust', 112, y0 + 7, 1)
    # patamar do meio (invasor anda para a esquerda): a chefe sai da terra no terreno 4 e Sir Dent enfrenta
    y0 = T[3]['estrada'][0]
    P.peca('moleworth', 92, y0 + 16, 'attack', 1, sombra=3); P.chao.append((quadro('moleworth', 'dig', 3)[0], 92 - A['pecas']['moleworth']['ancora'][0] + 14, y0 + 17 - A['pecas']['moleworth']['ancora'][1]))
    P.peca('T03', 48, y0 + 14, 'attack', 1, var=0, sombra=0); P.peca('T08', 28, y0 + 8, 'attack', 1, var=1, sombra=0); P.efeito('heal', 44, y0 + 6, 2)
    P.barra_vida(98, y0 - 62, 44, 0.82); P.fx.append((rec('extras', A['fim']['selo_chefe']['quadros'][2]), 60, y0 - 72))
    P.efeito('spark', 62, y0 - 4, 0); P.efeito('dust', 80, y0 + 16, 1); P.efeito('dust', 108, y0 + 15, 3); numero3(P, 60, y0 - 26, '25', 'grande'); numero3(P, 84, y0 - 44, '36!', 'medio', 'critico')
    # patamar de cima: arqueiros atirando la de cima
    y0 = T[4]['estrada'][0]
    for k, (dx, dy, an, i) in enumerate(((-14, 7, 'attack', 1), (0, 15, 'attack', 0), (12, 6, 'attack', 1))): P.peca('T04', T[4]['x'] + dx, y0 + dy, an, i, var=k, vira=True, sombra=0)
    P.efeito('arrow', 70, 150, 0); P.efeito('arrow', 86, 164, 0)
    rnd = random.Random(9)
    for _ in range(9): P.fx.append((quadro('firefly', 'play', rnd.randrange(4))[0], rnd.randrange(6, 170), rnd.choice((rnd.randrange(84, 108), rnd.randrange(142, 176), rnd.randrange(212, 244)))))
    P.desenhar(); P.frente(); P.vinheta(); im = P.im
    hud(im, 180, 15, 1, 41, 12, 6, 0, compacto=True)
    nove(im, 0, c['mesa_y'], 180, 370 - c['mesa_y'])
    mao3(im, 90, c['mesa_y'] + 9, [('T02', 3, 'x3'), ('M05', 1, '80%'), ('T12', 1, 'x1')], escolhida=1, selo=0, brilho=(2,))
    return im


def logo():
    W = 520; im = Image.new('RGBA', (W, 470), VERDE); d = ImageDraw.Draw(im); y = 0
    def faixa(s):
        nonlocal y
        d.rectangle((0, y, W, y + 10), fill=FAIXA); texto(im, 4, y + 2, s, 'reino'); y += 12
    faixa('LOGO: 3 SIZES, DROP SHADOW, SHINE SWEEP - ON SKY, ON PANEL, ON GRASS')
    d.rectangle((0, y, 260, y + 62), fill=(120, 196, 244, 255)); d.rectangle((260, y, W, y + 62), fill=(58, 42, 78, 255))
    L = A['logo']; g = rec('extras', L['large']['quadro']); im.alpha_composite(g, (130 - g.width // 2, y + 6)); g2 = rec('extras', L['large']['brilho']['quadros'][2]); im.alpha_composite(g2, (390 - g2.width // 2, y + 6))
    m = rec('extras', L['medium']['quadro']); im.alpha_composite(m, (130 - m.width // 2, y + 38)); im.alpha_composite(rec('extras', L['medium']['brilho']['quadros'][3]), (390 - m.width // 2, y + 38))
    y += 64; s = rec('extras', L['small']['quadro']); im.alpha_composite(s, (8, y + 2)); im.alpha_composite(m, (90, y)); im.alpha_composite(amp(Image.open(os.path.join(p2.ARTE, 'favicon-32.png')).convert('RGBA'), 1), (270, y))
    im.alpha_composite(Image.open(os.path.join(p2.ARTE, 'icone-180.png')).convert('RGBA').resize((90, 90), Image.NEAREST), (310, y)); texto(im, 270, y + 36, '32', 'mini-contorno'); texto(im, 404, y + 4, '180 - HALF SIZE', 'mini-contorno')
    fx = 8
    for q in (0, 2, 4): im.alpha_composite(rec('extras', L['small']['quadro']) if False else rec('extras', L['medium']['brilho']['quadros'][q]).resize((m.width, m.height), Image.NEAREST).crop((0, 0, 84, m.height)), (fx, y + 28)); fx += 88
    texto(im, 8, y + 54, 'SHINE SWEEP: 6 FRAMES (3 SHOWN, CROPPED)', 'mini-contorno'); y += 96
    faixa('12 ACHIEVEMENTS: GOLD TROPHY FRAME, UNLOCKED, LOCKED'); Cq = A['conquistas']; x = 4
    for i, n in enumerate(Cq['icones']):
        im.alpha_composite(rec('extras', Cq['prontas'][n]), (x, y + 2))
        t = rec('extras', Cq['molduras']['unlocked' if i % 2 else 'locked']); ic = rec('extras', Cq['icones'][n])
        if i % 2 == 0: ic = pintar(ic, (88, 70, 110))
        t.alpha_composite(ic, tuple(Cq['icone_em'])); im.alpha_composite(t, (x, y + 26))
        nome = Cq['nomes'][n].upper().split(' '); ls = [nome[0]]
        for w_ in nome[1:]:
            if len(ls[-1]) + len(w_) + 1 <= 9: ls[-1] += ' ' + w_
            else: ls.append(w_)
        for j, l in enumerate(ls[:3]): texto(im, x + 9, y + 50 + j * 7, l, 'mini', centro=True)
        x += 43
    y += 74
    faixa('8 RELICS  -  6 LEAGUE EMBLEMS  -  BOSS SEAL'); x = 6
    for n in A['reliquias']['quadros']: im.alpha_composite(rec('extras', A['reliquias']['quadros'][n]), (x, y + 4)); texto(im, x + 6, y + 20, n[:6], 'mini', centro=True); x += 28
    x += 6
    for lid, l in sorted(A['ligas']['emblemas'].items(), key=lambda k: k[1]['ordem']): im.alpha_composite(rec('extras', l['quadro']), (x, y + 2)); x += 31
    for q in range(4): im.alpha_composite(rec('extras', A['fim']['selo_chefe']['quadros'][q]), (x + 4 + q * 27, y + 4))
    y += 36
    faixa('RUN END: NEW RECORD RIBBON + SCORE SCROLL  -  DAMAGE NUMBERS IN 3 SIZES')
    sc = rec('extras', A['fim']['pergaminho']['quadro']); im.alpha_composite(sc, (6, y + 12)); fx = rec('extras', A['fim']['faixa_recorde']['quadros'][1]); im.alpha_composite(fx, (6 + (sc.width - fx.width) // 2, y + 2))
    ax, ay, aw, ah = A['fim']['pergaminho']['area_texto']; ox, oy = 6 + ax, y + 12 + ay
    texto(im, ox + aw // 2, oy + 8, 'ROUND', 'reino', centro=True, cor=(124, 80, 54)); texto(im, ox + aw // 2, oy + 20, '18', 'dano-g-ouro', centro=True)
    for i, (a, b) in enumerate((('SCORE', '1842'), ('BEST', '1790'), ('BOSSES', '3'))): texto(im, ox + 4, oy + 42 + i * 10, a, 'reino', cor=(124, 80, 54)); texto(im, ox + aw - 4, oy + 42 + i * 10, b, 'reino', direita=True, cor=AMEIXA)
    lg = rec('extras', A['ligas']['emblemas']['lord-steward']['quadro']); im.alpha_composite(lg, (6 + sc.width + 10, y + 14)); texto(im, 6 + sc.width + 44, y + 22, 'LORD STEWARD', 'reino-contorno'); texto(im, 6 + sc.width + 44, y + 34, '158 TO CROWN GUARDIAN', 'mini-contorno')
    b = A['interface']['pecas']['button-wide-green']; im.alpha_composite(rec('interface', b['solto']), (6 + sc.width + 10, y + 52)); texto(im, 6 + sc.width + 58, y + 59, 'PLAY AGAIN', 'reino', centro=True)
    q, _ = quadro('fireworks', 'play', 4); im.alpha_composite(q, (300, y + 30)); bq, _ = quadro('bunting', 'play', 2); im.alpha_composite(bq, (160, y + 84)); im.alpha_composite(bq, (224, y + 84))
    x = 410
    for (s, t, k) in (('7', 'pequeno', 'normal'), ('12!', 'pequeno', 'critico'), ('24', 'medio', 'normal'), ('48!', 'medio', 'critico'), ('+22', 'medio', 'cura'), ('95', 'grande', 'normal'), ('140!', 'grande', 'critico')):
        yy = y + {'pequeno': 14, 'medio': 30, 'grande': 60}[t] + (0 if k == 'normal' else (0 if t != 'grande' else 20)); xx = x + (0 if k == 'normal' else (26 if t != 'grande' else 0)) + (30 if k == 'cura' else 0)
        texto(im, xx, yy, s, A['dano'][t][k])
    y += 132
    return im.crop((0, 0, W, y))


if __name__ == '__main__':
    os.makedirs(PROVA, exist_ok=True)
    quais = sys.argv[1:] or ['elenco', 'cartas', 'chefes', 'andar', 'pc', 'celular', 'logo']
    if 'elenco' in quais: amp(elenco(), 3).save(os.path.join(PROVA, 'elenco-completo.png'), optimize=True)
    if 'cartas' in quais: amp(cartas30(), 3).save(os.path.join(PROVA, 'cartas-30.png'), optimize=True)
    if 'chefes' in quais: amp(chefes(), 4).save(os.path.join(PROVA, 'chefes.png'), optimize=True)
    if 'andar' in quais: amp(andar(), 3).save(os.path.join(PROVA, 'andar-v2.png'), optimize=True)
    if 'pc' in quais: amp(chave_pc(), 3).save(os.path.join(PROVA, 'quadro-chave-v3-pc.png'), optimize=True)
    if 'celular' in quais: amp(chave_celular(), 4).save(os.path.join(PROVA, 'quadro-chave-v3-celular.png'), optimize=True)
    if 'logo' in quais: amp(logo(), 3).save(os.path.join(PROVA, 'logo-e-icones.png'), optimize=True)
    for a in sorted(os.listdir(PROVA)): print(a, os.path.getsize(os.path.join(PROVA, a)) // 1024, 'KB')
