"""Provas do piloto (R9), montadas SO com o que esta em public/reino/arte/ (atlas.json + folhas): se a prova sai certa,
a tela consegue montar igual. Gera em arte/reino/prova/: elenco-piloto.png, andar-bater-x4.png,
quadro-chave-v2-pc.png e quadro-chave-v2-celular.png.
Uso: python3 -B arte/reino/provas2.py"""
import os, sys, json, math, random
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
ARTE = os.path.join(os.path.dirname(os.path.dirname(AQUI)), 'public', 'reino', 'arte')
PROVA = os.path.join(AQUI, 'prova')
A = json.load(open(os.path.join(ARTE, 'atlas.json')))
_F = {}
AMEIXA = (43, 30, 58); CREME = (255, 246, 224); OURO = (255, 210, 72)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 + 1 / 32.0


def folha(n):
    if n not in _F: _F[n] = Image.open(os.path.join(ARTE, A['folhas'][n]['arquivo'])).convert('RGBA')
    return _F[n]


def rec(n, r): return folha(n).crop((r[0], r[1], r[0] + r[2], r[1] + r[3]))
def hx(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def amp(im, n): return im.resize((im.width * n, im.height * n), Image.NEAREST)


def quadro(pid, anim=None, i=0, var=0):
    p = A['pecas'][pid]; qs = p.get('variantes', [p['quadros']])[var % len(p.get('variantes', [0]))]
    k = p['animacoes'][anim]['quadros'][i % len(p['animacoes'][anim]['quadros'])] if anim else i
    return rec(p['folha'], qs[k]), p['ancora']


def texto(im, x, y, s, fonte='reino-contorno', centro=False, direita=False, cor=None):
    f = A['fontes'][fonte]; s = s if fonte.startswith('mini') else s
    gl = [f['glifos'].get(c, f['glifos'].get(c.upper(), f['glifos']['?'])) for c in s]
    w = sum(g[2] + f['espaco'] for g in gl) - f['espaco']
    if centro: x -= w // 2
    if direita: x -= w
    for g in gl:
        t = rec(f['folha'], g)
        if cor:
            a = np.array(t); m = (a[..., 3] > 0) & (a[..., :3].sum(axis=2) > 300); a[m, :3] = cor; t = Image.fromarray(a, 'RGBA')
        im.alpha_composite(t, (int(x), int(y))); x += g[2] + f['espaco']
    return w


# ---------------------------------------------------------------- pintor de cena (o que a tela faria)
class Pintor:
    def __init__(self, aparelho, hora, W=None, H=None):
        self.c = A['cenarios'][aparelho]; self.h = self.c['horas'][hora]; self.hora = hora
        self.W, self.H = (W, H) if W else tuple(self.c['referencia'])
        self.im = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 255)); self.lista = []; self.fx = []; self.chao = []
        self.amb = np.array(hx(self.h['luz']['ambiente'])) / 255.0; self.filete = hx(self.h['luz']['filete'])
        self.luz_dir = 1 if hora == 'boss-night' else -1

    def fundo(self, nuvens=((60, 14, 0), (250, 30, 1), (380, 10, 2))):
        for p in self.h['planos']:
            if p['nome'] == 'front': continue
            self.im.alpha_composite(rec(self.h['folha'], p['quadro']), (p['x'], p['y'])) if p['x'] >= 0 or True else None
            if p['nome'] == 'sky':
                for (x, y, n) in nuvens:
                    if x < self.W: self.im.alpha_composite(rec(self.h['folha'], self.h['nuvens'][n]), (x, y))

    def frente(self):
        for p in self.h['planos']:
            if p['nome'] == 'front': self.im.alpha_composite(rec(self.h['folha'], p['quadro']), (p['x'], p['y']))

    def _luz(self, im, brilho=True):
        """Luz da hora na peca: multiplica pelo ambiente, mantem o que brilha (olho lima, fogo, janela) e poe o filete de luz."""
        a = np.array(im).astype(float); al = a[..., 3] > 0
        R, G, B = a[..., 0], a[..., 1], a[..., 2]
        emis = al & (((G > 200) & (R < 215) & (B < 130)) | ((R > 235) & (G > 150) & (B < 150) & (R - B > 110))) if brilho else np.zeros(al.shape, bool)
        rgb = a[..., :3] * self.amb
        rgb[emis] = a[..., :3][emis]
        p = np.pad(al, 1)
        fora_x = ~(p[1:-1, :-2] if self.luz_dir < 0 else p[1:-1, 2:]); fora_y = ~p[:-2, 1:-1]
        rim = al & (fora_x | fora_y) & (a[..., :3].max(axis=2) < 70)
        k = {'morning': 0.45, 'afternoon': 0.6, 'boss-night': 0.3}[self.hora]
        rgb[rim] = rgb[rim] * (1 - k) + np.array(self.filete) * k
        a[..., :3] = np.clip(rgb, 0, 255)
        return Image.fromarray(a.astype(np.uint8), 'RGBA')

    def peca(self, pid, x, y, anim='idle', i=0, var=0, vira=False, sombra=0, branco=False, z=0):
        im, anc = quadro(pid, anim, i, var); ax = anc[0]
        if vira: im = im.transpose(Image.FLIP_LEFT_RIGHT); ax = im.width - 1 - anc[0]
        self.lista.append((y + z, 0, self._luz(im), int(x - ax), int(y - anc[1]), sombra, x, y))

    def desenhar(self):
        s = self.h['luz']['sombra']
        self.lista.sort(key=lambda t: t[0])
        for (im, x, y) in self.chao: self.im.alpha_composite(im, (int(x), int(y)))
        for (_, _, im, x, y, sombra, cx, cy) in self.lista:                 # sombras primeiro (no chao)
            if sombra is not None:
                sh, anc = quadro('shadow', None, sombra); a = np.array(sh).astype(float); a[..., 3] *= s['alfa'] * 1.25
                self.im.alpha_composite(Image.fromarray(a.astype(np.uint8), 'RGBA'), (int(cx - anc[0] + s['dx']), int(cy - anc[1])))
        for (_, _, im, x, y, sombra, cx, cy) in self.lista: self.im.alpha_composite(im, (x, y))
        for (im, x, y) in self.fx: self.im.alpha_composite(im, (int(x), int(y)))

    def efeito(self, pid, x, y, i=0, vira=False, anim=None):
        im, anc = quadro(pid, anim, i)
        if vira: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        self.fx.append((im, x - (anc[0] if not vira else im.width - 1 - anc[0]), y - anc[1]))

    def numero(self, x, y, s, critico=False):
        t = Image.new('RGBA', (60, 12), (0, 0, 0, 0)); w = texto(t, 0, 0, s, 'reino-ouro' if critico else 'reino-contorno'); self.fx.append((t, x - w // 2, y))

    def barra_vida(self, cx, y, w, frac):
        t = Image.new('RGBA', (w + 2, 5), AMEIXA + (255,)); d = ImageDraw.Draw(t)
        d.rectangle((1, 1, w, 3), fill=(80, 60, 96, 255)); d.rectangle((1, 1, int(w * frac), 3), fill=(232, 64, 76, 255)); d.rectangle((1, 1, int(w * frac), 1), fill=(255, 150, 150, 255))
        self.fx.append((t, cx - w // 2, y))

    def vinheta(self):
        W, H = self.W, self.H; yy, xx = np.indices((H, W)); a = np.array(self.im.convert('RGB')).astype(float)
        d = np.hypot((xx - W / 2) / (W / 2), (yy - H * 0.46) / (H / 2)); v = np.clip((d - 0.66) / 0.75, 0, 1) * self.h['luz']['vinheta']
        v = np.floor(v * 24 + BAYER[yy % 4, xx % 4]) / 24.0
        a = a * (1 - v[..., None]) + np.array(AMEIXA) * v[..., None] * 0.6
        self.im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')


# ---------------------------------------------------------------- interface comum
def icone(im, n, x, y): im.alpha_composite(rec('interface', A['icones']['quadros'][n]), (x, y))


def nove(im, x0, y0, w, h):
    p = A['interface']['pecas']['panel']; s = rec('interface', p['quadro']); b = p['borda']; sw = s.width
    for (sx, dx, ww) in ((0, x0, b), (b, x0 + b, w - 2 * b), (sw - b, x0 + w - b, b)):
        for (sy, dy, hh) in ((0, y0, b), (b, y0 + b, h - 2 * b), (sw - b, y0 + h - b, b)):
            parte = s.crop((sx, sy, sx + (b if ww == b else sw - 2 * b), sy + (b if hh == b else sw - 2 * b))).resize((ww, hh), Image.NEAREST)
            im.alpha_composite(parte, (dx, dy))


def carta(cid, nivel=1, forca='', destaque=False):
    c = A['cartas']; im = rec('interface', c['piloto'][cid]['quadro'])
    for i in range(nivel): im.alpha_composite(rec('interface', A['icones']['quadros']['pin-on']), tuple(c['pinos'][i]))
    if forca: texto(im, c['texto_forca'][0], c['texto_forca'][1], forca, 'reino', centro=True, cor=AMEIXA)
    if destaque:                                              # aura de escolha: contorno duplo de ouro
        a = np.array(im); a = np.pad(a, ((2, 2), (2, 2), (0, 0)))
        for cor in (OURO, (255, 250, 200)):
            al = a[..., 3] > 0; p = np.pad(al, 1); novo = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~al
            a[novo, :3] = cor; a[novo, 3] = 255
        im = Image.fromarray(a, 'RGBA')
    return im


def hud(im, W, rodada, vidas, ouro, aliados, invasores, chefe_em, compacto=False):
    d = ImageDraw.Draw(im)
    for i in range(3): icone(im, 'life' if i < vidas else 'life-empty', 4 + i * 12, 4)
    icone(im, 'gold', 44, 4); texto(im, 57, 5, str(ouro), 'reino-ouro')
    for i in range(5):                                         # pinos ate o chefe
        x = 5 + i * 7; d.rectangle((x, 18, x + 4, 22), fill=AMEIXA + (255,)); d.rectangle((x + 1, 19, x + 3, 21), fill=(OURO if i < 5 - chefe_em else (110, 96, 130)) + (255,))
    icone(im, 'boss', 41, 15)
    cx = W // 2 + (22 if compacto else 0)
    if not compacto: icone(im, 'round', cx - 34, 2)
    texto(im, cx + (0 if compacto else 6), 4, 'ROUND %d' % rodada, 'reino-contorno', centro=True)
    x0, x1 = cx - (26 if compacto else 60), cx + (26 if compacto else 60); y = 18 if compacto else 17; m = x0 + int((x1 - x0) * aliados / float(aliados + invasores))
    d.rectangle((x0 - 1, y - 1, x1 + 1, y + 5), fill=AMEIXA + (255,))
    iv = hx(A['invasores']['cor'])
    d.rectangle((x0, y, m, y + 4), fill=(72, 132, 232, 255)); d.rectangle((x0, y, m, y), fill=(170, 210, 255, 255)); d.rectangle((x0, y + 4, m, y + 4), fill=(40, 66, 150, 255))
    d.rectangle((m + 1, y, x1, y + 4), fill=iv + (255,)); d.rectangle((m + 1, y, x1, y), fill=(200, 140, 240, 255)); d.rectangle((m + 1, y + 4, x1, y + 4), fill=(86, 40, 130, 255))
    d.rectangle((m, y - 2, m + 1, y + 6), fill=CREME + (255,))
    icone(im, 'shield', x0 - 13, y - 3); icone(im, 'horn', x1 + 3, y - 3)
    texto(im, x0 + 2, y + 8, str(aliados), 'mini-contorno'); texto(im, x1 - 1, y + 8, str(invasores), 'mini-contorno', direita=True)
    b = A['interface']['pecas']['button-green']; im.alpha_composite(rec('interface', b['solto']), (W - 27, 2)); icone(im, 'speed', W - 27 + b['conteudo'][0] - 5, 2 + b['conteudo'][1] - 5)
    if not compacto: icone(im, 'sound-on', W - 42, 8)


def mao(im, cx, y, cartas, escolhida=1, selo=0, falta=None):
    """cartas: [(id, nivel, forca)]. A 1a e a copia 'LEVEL UP'."""
    n = len(cartas); x0 = cx - (n * 58) // 2
    for i, (cid, nv, fo) in enumerate(cartas):
        c = carta(cid, nv, fo, destaque=(i == escolhida)); x = x0 + i * 58 + (-2 if i == escolhida else 0); yy = y - (8 if i == escolhida else 0) - (2 if i == escolhida else 0)
        im.alpha_composite(c, (x, yy))
        if i == selo:
            s = rec('interface', A['interface']['pecas']['level-up']['quadros'][1]); im.alpha_composite(s, (x + (c.width - s.width) // 2, yy - 9))
        if i == escolhida and falta:
            e = rec('interface', A['interface']['pecas']['label-to-go']); im.alpha_composite(e, (x + (c.width - e.width) // 2, yy - 11))


def espolio(im, x, y):
    for i, t in enumerate(('Card', 'Promotion', 'Purse')): im.alpha_composite(rec('interface', A['interface']['pecas']['loot'][t]), (x + i * 45, y))


def terreno_marcas(P, t, fam=None, nivel=0, vazio=False, q=0):
    """Bandeira da familia + pinos de nivel no canto do terreno, ou a marca de terreno vazio."""
    x = t['x'] - t['largura'] // 2 + 5; yb = t['base_predio']
    if vazio:
        P.peca('plot-empty', t['x'], t['estrada'][0] + 8, 'plot%d' % t['n'], q, sombra=None, z=-40); return
    P.peca('plot-flag', x, yb + 1, fam, q, sombra=None, z=-30)
    im = Image.new('RGBA', (5 * 4 + 1, 5), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for i in range(5):
        d.rectangle((i * 4, 1, i * 4 + 2, 3), fill=AMEIXA + (255,)); d.point((i * 4 + 1, 2), (OURO if i < nivel else (126, 110, 146)) + (255,))
    P.chao.append((im, x + 4, yb - 1))


def pelotao(P, pid, t, n, anim='idle', rnd=None, vira=False, avanco=0, fileiras=3, quadros=None, brancos=()):
    """n soldados no terreno, em fileiras, cada um com a sua variante (rosto/altura) e fase de animacao."""
    y0, y1 = t['estrada']; pos = []
    for k in range(n):
        f = k % fileiras; col = k // fileiras
        y = y0 + 9 + f * ((y1 - y0 - 10) // max(1, fileiras - 1)) if fileiras > 1 else (y0 + y1) // 2 + 4
        x = t['x'] + (avanco - col * 13 - (f % 2) * 6 + (n // fileiras) * 5) * (-1 if not vira else 1) * -1
        pos.append((x, y))
    for k, (x, y) in enumerate(pos):
        an, i = (quadros[k % len(quadros)] if quadros else (anim, k))
        P.peca(pid, x, y, an, i, var=k, vira=vira, sombra=0)
    return pos


# ---------------------------------------------------------------- quadro-chave v2: PC (tarde, rodada 4)
def chave_pc():
    P = Pintor('pc', 'afternoon'); c = P.c; T = c['terrenos']; P.fundo(((40, 26, 0), (212, 34, 1), (330, 28, 2)))
    P.peca('gate', c['portao'][0], c['portao'][1], sombra=2, z=-50); P.peca('castle', c['castelo'][0], c['castelo'][1], 'whole', sombra=3, z=-50)
    # reino: 1 Pikeman n3 · 2 Smithy n3 · 3 Frypan Cook n2 · 4 Bramble Snare · 5 Hedge Archer n2 · 6 vazio
    terreno_marcas(P, T[0], 'Pikewall', 3); terreno_marcas(P, T[1], 'Pikewall', 3); terreno_marcas(P, T[2], 'Potluck', 2)
    terreno_marcas(P, T[3], 'Thornbow', 1); terreno_marcas(P, T[4], 'Thornbow', 2); terreno_marcas(P, T[5], vazio=True)
    P.peca('B01', T[1]['x'] + 4, T[1]['base_predio'], 'n3', 1, sombra=2, z=-20)
    P.peca('M06', T[3]['x'], T[3]['estrada'][0] + 26, 'idle', 0, sombra=None)
    y0, y1 = T[0]['estrada']; X = T[0]['x']
    # no PC o invasor anda para a direita (sentido=1): invasor e aliado sao desenhados espelhados
    for k, (dx, dy, an, i) in enumerate(((-8, 11, 'attack', 1), (-2, 23, 'attack', 0), (-10, 35, 'attack', 2), (6, 45, 'idle', 0))):      # 4 pikemen seguram a frente
        P.peca('T01', X + dx, y0 + dy, an, i, var=k, vira=True, sombra=0)
    for k, (dx, dy, an, i) in enumerate(((-2, 11, 'idle', 0), (12, 21, 'idle', 1), (-4, 38, 'walk', 2), (10, 45, 'idle', 0))):            # cozinheiros no terreno 3
        P.peca('T07', T[2]['x'] + dx, y0 + dy, an, i, var=k + 1, vira=True, sombra=0)
    for k, (dx, dy, an, i) in enumerate(((0, 12, 'attack', 1), (10, 27, 'attack', 0), (-4, 42, 'attack', 1))):                           # arqueiros atras, atirando
        P.peca('T04', T[4]['x'] + dx, y0 + dy, an, i, var=k, vira=True, sombra=0)
    # horda da rodada 4: Munchers, Stilt Runners e Spud Slingers entrando pelo portao
    for k, (x, dy, pid, an, i) in enumerate(((X - 34, 10, 'muncher', 'attack', 1), (X - 28, 23, 'stilt-runner', 'attack', 1), (X - 37, 36, 'muncher', 'hit', 0), (X - 22, 46, 'muncher', 'attack', 0),
                                              (X - 64, 16, 'spud-slinger', 'attack', 1), (X - 58, 40, 'muncher', 'walk', 0), (X - 80, 30, 'stilt-runner', 'walk', 2), (X - 92, 44, 'spud-slinger', 'walk', 3), (X - 96, 14, 'muncher', 'walk', 3))):
        P.peca(pid, x, y0 + dy, an, i, var=k, vira=True, sombra=0)
    P.peca('stilt-runner', T[2]['x'] - 30, y0 + 24, 'hit', 0, var=1, vira=True, sombra=0); P.peca('T07', T[2]['x'] - 16, y0 + 26, 'attack', 1, var=0, vira=True, sombra=0)
    P.efeito('spark', T[2]['x'] - 34, y0 + 6, 0); P.numero(T[2]['x'] - 34, y0 - 10, '5')
    # efeitos do momento
    P.efeito('spark', X - 21, y0 - 4, 1); P.efeito('slash', X - 26, y0 + 22, 0, vira=True); P.efeito('dust', X - 30, y0 + 38, 2); P.efeito('dust', X - 84, y0 + 30, 1)
    P.efeito('arrow', T[3]['x'] - 8, y0 - 24, 0, vira=True); P.efeito('arrow', T[1]['x'] - 4, y0 - 8, 0, vira=True); P.efeito('spud', X - 40, y0 - 14, 1)
    P.numero(X - 30, y0 - 24, '6'); P.numero(X - 44, y0 + 6, '14!', True); P.numero(X - 6, y0 - 28, '5')
    P.desenhar(); P.frente(); P.vinheta(); im = P.im
    hud(im, 480, 4, 2, 12, 11, 9, 1)
    mao(im, 240, 190, [('T01', 3, 'x4'), ('B06', 1, '+2/s'), ('M01', 1, '30')], escolhida=0, selo=0)
    nove(im, 338, 214, 139, 54); texto(im, 407, 217, 'WIN TO PICK 1', 'mini-contorno', centro=True); espolio(im, 341, 224)
    b = A['interface']['pecas']['button-plum']; im.alpha_composite(rec('interface', b['solto']), (112, 240)); icone(im, 'reroll', 112 + 7, 240 + 6)
    icone(im, 'gold', 96, 247); texto(im, 88, 248, '2', 'reino-ouro'); texto(im, 8, 256, 'PICK 1 CARD', 'reino-contorno')
    return im


# ---------------------------------------------------------------- quadro-chave v2: celular (noite de chefe, rodada 5)
def chave_celular():
    P = Pintor('celular', 'boss-night'); c = P.c; T = c['terrenos']; P.fundo(((96, 30, 1), (20, 44, 0)))
    P.peca('castle', c['castelo'][0], c['castelo'][1], 'cracked', sombra=3, z=-60); P.peca('gate', c['portao'][0], c['portao'][1], sombra=None, z=-60)
    # reino: 1 Pikeman n3 · 2 Doorman n2 · 3 Smithy n3 · 4 Frypan Cook n2 · 5 Hedge Archer n2 · 6 Watchtower n3
    for t, fam, nv in ((T[0], 'Pikewall', 3), (T[1], 'Pikewall', 2), (T[2], 'Pikewall', 3), (T[3], 'Potluck', 2), (T[4], 'Thornbow', 2), (T[5], 'Thornbow', 3)): terreno_marcas(P, t, fam, nv)
    P.peca('B01', T[2]['x'] + 6, T[2]['base_predio'], 'n3', 2, sombra=2, z=-20)
    P.peca('B04', T[5]['x'] + 2, T[5]['base_predio'], 'n3', 0, sombra=2, z=-20)
    # patamar de baixo: o chefe entra pelo portao com 3 munchers; pikemen e doormen seguram (aqui o aliado olha para a esquerda)
    y0 = T[0]['estrada'][0]
    P.peca('gutbucket', 30, y0 + 17, 'attack', 1, vira=True, sombra=3)
    for k, (x, dy, an, i) in enumerate(((64, 6, 'attack', 1), (72, 13, 'hit', 1), (60, 17, 'attack', 2), (84, 9, 'idle', 0))): P.peca('T01', x, y0 + dy, an, i, var=k, vira=True, sombra=0)
    for k, (x, dy, an, i) in enumerate(((112, 8, 'walk', 0), (126, 16, 'walk', 3))): P.peca('T02', x, y0 + dy, an, i, var=k, vira=True, sombra=0)
    for k, (x, dy, an, i) in enumerate(((46, 4, 'attack', 1), (8, 15, 'walk', 2))): P.peca('muncher', x, y0 + dy, an, i, var=k, vira=True, sombra=0)
    P.barra_vida(30, y0 - 62, 40, 0.7); P.efeito('spark', 56, y0 - 2, 1); P.efeito('dust', 50, y0 + 14, 2); P.numero(70, y0 - 30, '14!', True); P.numero(52, y0 - 52, '6')
    # patamar do meio: cozinheiros esperando a vez
    y0 = T[3]['estrada'][0]
    for k, (dx, dy, an, i) in enumerate(((-18, 7, 'idle', 0), (-4, 14, 'idle', 1), (10, 6, 'idle', 1), (22, 15, 'idle', 0))): P.peca('T07', T[3]['x'] + dx, y0 + dy, an, i, var=k, sombra=0)
    # patamar de cima: arqueiros atirando la de cima
    y0 = T[4]['estrada'][0]
    for k, (dx, dy, an, i) in enumerate(((-12, 7, 'attack', 1), (2, 14, 'attack', 0), (14, 6, 'attack', 1))): P.peca('T04', T[4]['x'] + dx, y0 + dy, an, i, var=k, vira=True, sombra=0)
    P.efeito('arrow', 30, 168, 0, vira=True); P.efeito('arrow', 44, 222, 0, vira=True)
    P.desenhar(); P.vinheta(); im = P.im
    hud(im, 180, 5, 2, 23, 13, 4, 0, compacto=True)
    nove(im, 0, c['mesa_y'], 180, 370 - c['mesa_y'])
    mao(im, 90, c['mesa_y'] + 9, [('T04', 2, 'x3'), ('T10', 1, 'x2'), ('M06', 1, '3')], escolhida=1, selo=0)
    return im


# ---------------------------------------------------------------- elenco e tiras
VERDE = (104, 168, 98, 255); FAIXA = (43, 30, 58, 255)


def elenco():
    W = 520; im = Image.new('RGBA', (W, 760), VERDE); d = ImageDraw.Draw(im); y = 0
    def faixa(s):
        nonlocal y
        d.rectangle((0, y, W, y + 10), fill=FAIXA); texto(im, 4, y + 2, s, 'reino'); y += 12
    faixa('TROOPS - 3 FACES EACH, FAMILY COLOR')
    x = 2
    for pid in ('T01', 'T02', 'T04', 'T07', 'T10'):
        p = A['pecas'][pid]
        for v in range(3):
            q, anc = quadro(pid, 'idle', 0, v); im.alpha_composite(q, (x + v * 25 - 8, y + 2))
        d.rectangle((x + 4, y + 44, x + 74, y + 46), fill=hx(p['cor']) + (255,))
        texto(im, x + 40, y + 49, p['nome'], 'mini-contorno', centro=True); texto(im, x + 40, y + 57, pid + ' ' + p['familia'], 'mini', centro=True)
        x += 104
    y += 66; faixa('INVADERS (ROUNDS 1-6) AND FIRST BOSS - FACE LEFT'); x = 2
    for pid in ('muncher', 'stilt-runner', 'spud-slinger', 'potlid-brute', 'gutbucket'):
        p = A['pecas'][pid]; q, anc = quadro(pid, 'idle', 0, 0); h = 94
        im.alpha_composite(q, (x + (4 if q.width < 100 else -6), y + h - q.height))
        if 'variantes' in p and q.width < 60: q2, _ = quadro(pid, 'idle', 0, 1); im.alpha_composite(q2, (x + 26, y + h - q2.height))
        texto(im, x + (36 if q.width < 100 else 50), y + 97, p['nome'], 'mini-contorno', centro=True)
        x += 96 if q.width < 60 else (100 if q.width < 100 else 112)
    y += 108; faixa('BUILDINGS - LEVEL 1, 3, 5 (SMOKE, EMBERS, PENNANT ANIMATE)'); x = 0
    for pid in ('B01', 'B04', 'B06'):
        for j, nv in enumerate(('n1', 'n3', 'n5')):
            q, _ = quadro(pid, nv, 1); im.alpha_composite(q, (x + (-16, 34, 94)[j], y))
        texto(im, x + 84, y + 73, A['pecas'][pid]['nome'], 'mini-contorno', centro=True); x += 172
    y += 82; faixa('CASTLE: WHOLE, CRACKED, RUINED - GATE - EMPTY PLOT - FLAGS - MAGIC ON THE ROAD'); x = 0
    for e in ('whole', 'cracked', 'ruined'): q, _ = quadro('castle', e, 0); im.alpha_composite(q, (x - 6, y)); x += 92
    q, _ = quadro('gate', 'idle', 0); im.alpha_composite(q, (x - 2, y + 24))
    for i, fam in enumerate(A['familias']): q, _ = quadro('plot-flag', fam, i); im.alpha_composite(q, (366 + i * 18, y + 6))
    q, _ = quadro('M01', 'idle', 0); im.alpha_composite(q, (450, y + 2)); q, _ = quadro('M06', 'idle', 0); im.alpha_composite(q, (446, y + 56))
    for i, n in enumerate((1, 6)): q, _ = quadro('plot-empty', 'plot%d' % n, 1); im.alpha_composite(q, (352 + i * 44, y + 46))
    y += 98
    faixa('THE 10 PILOT CARDS (FRAME = RARITY, RIBBON = FAMILY, SEAL = TYPE, PINS = LEVEL)'); x = 2
    for i, cid in enumerate(A['cartas']['piloto']):
        im.alpha_composite(carta(cid, 1 + i % 5, ('x3', 'x2', 'x2', 'x3', 'x2', '+20%', '+0.5', '2/s', '30', '3')[i]), (2 + (i % 8) * 59, y + 2 + (i // 8) * 80))
    for j, r in enumerate(A['cartas']['molduras']):
        im.alpha_composite(rec('interface', A['cartas']['molduras'][r]), (2 + (j + 2) * 59, y + 82)); texto(im, 2 + (j + 2) * 59 + 28, y + 110, r, 'mini', centro=True, cor=AMEIXA)
    im.alpha_composite(rec('interface', A['cartas']['costas']), (2 + 7 * 59, y + 82)); y += 164
    faixa('INTERFACE: ICONS, BUTTONS, LOOT, LEVEL UP, DAMAGE NUMBERS, FONTS'); x = 3
    for n in A['icones']['quadros']: icone(im, n, x, y + 2); x += rec('interface', A['icones']['quadros'][n]).width + 2
    ui = A['interface']['pecas']; x = 3
    for n in ('button-green', 'button-red', 'button-plum'): im.alpha_composite(rec('interface', ui[n]['solto']), (x, y + 16)); im.alpha_composite(rec('interface', ui[n]['apertado']), (x + 26, y + 16)); x += 54
    im.alpha_composite(rec('interface', ui['button-wide-green']['solto']), (x, y + 16)); texto(im, x + 48, y + 23, 'PLAY AGAIN', 'reino', centro=True)
    espolio(im, 3, y + 46); im.alpha_composite(rec('interface', ui['level-up']['quadros'][1]), (144, y + 48)); im.alpha_composite(rec('interface', ui['label-to-go']), (194, y + 48)); im.alpha_composite(rec('interface', ui['label-boss']), (236, y + 48)); im.alpha_composite(rec('interface', ui['label-new']), (264, y + 48))
    texto(im, 144, y + 66, '12  7  30', 'reino-contorno'); texto(im, 204, y + 66, '40!', 'reino-ouro'); texto(im, 144, y + 80, 'ROUND 5 - VICTORY!', 'reino-contorno'); texto(im, 290, y + 48, 'KEEPMILE', 'reino-ouro')
    texto(im, 290, y + 62, 'MINI 3X5: BRAMBLE SNARE', 'mini-contorno'); texto(im, 290, y + 72, "LAST ONE STANDING!", 'mini')
    x = 264
    for e in ('coin', 'dust', 'spark', 'heal', 'level-stars', 'smoke', 'explosion'):
        q, _ = quadro(e, 'play', 2); im.alpha_composite(q, (x, y + 16 + (0 if q.height < 30 else (-6 if q.height < 60 else -22)))); x += q.width + 2
    return im.crop((0, 0, W, y + 94))


def tiras():
    ids = ['T01', 'T02', 'T04', 'T07', 'T10', 'muncher', 'stilt-runner', 'spud-slinger', 'potlid-brute', 'gutbucket']
    lin = []
    for pid in ids:
        p = A['pecas'][pid]; w, h = p['tamanho']; seq = [(a, i) for a in ('idle', 'walk', 'attack', 'hit', 'fall') for i in range(len(p['animacoes'][a]['quadros']))]
        por = max(1, 900 // (w + 2)); nl = (len(seq) + por - 1) // por
        im = Image.new('RGBA', (min(len(seq), por) * (w + 2) + 2, 10 + nl * (h + 12)), VERDE); d = ImageDraw.Draw(im)
        d.rectangle((0, 0, im.width, 9), fill=FAIXA); texto(im, 3, 1, p['nome'], 'reino')
        ult = None
        for k, (a, i) in enumerate(seq):
            x = 2 + (k % por) * (w + 2); y = 20 + (k // por) * (h + 12)
            d.rectangle((x, y, x + w - 1, y + h - 1), fill=(120, 184, 112, 255)); d.rectangle((x, y + p['ancora'][1], x + w - 1, y + h - 1), fill=(205, 160, 104, 255))
            q, _ = quadro(pid, a, i); im.alpha_composite(q, (x, y))
            if a != ult: texto(im, x + 1, y - 8, '%s %dms' % (a, p['animacoes'][a]['ms'][0]), 'mini-contorno'); ult = a
        lin.append(im)
    W = max(l.width for l in lin); H = sum(l.height for l in lin)
    o = Image.new('RGBA', (W, H), VERDE); y = 0
    for l in lin: o.alpha_composite(l, (0, y)); y += l.height
    return o


if __name__ == '__main__':
    os.makedirs(PROVA, exist_ok=True)
    quais = sys.argv[1:] or ['elenco', 'tiras', 'pc', 'celular']
    if 'elenco' in quais: amp(elenco(), 4).save(os.path.join(PROVA, 'elenco-piloto.png'), optimize=True)
    if 'tiras' in quais: amp(tiras(), 4).save(os.path.join(PROVA, 'andar-bater-x4.png'), optimize=True)
    if 'pc' in quais: amp(chave_pc(), 3).save(os.path.join(PROVA, 'quadro-chave-v2-pc.png'), optimize=True)
    if 'celular' in quais: amp(chave_celular(), 4).save(os.path.join(PROVA, 'quadro-chave-v2-celular.png'), optimize=True)
    for a in sorted(os.listdir(PROVA)): print(a, os.path.getsize(os.path.join(PROVA, a)) // 1024, 'KB')
