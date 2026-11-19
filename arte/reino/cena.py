"""Motor de cena do Reino (prova de direcao de arte): monta o quadro-chave por codigo a partir das pecas.
Camadas: ceu -> plano longe -> plano meio -> mundo (chao, predios, sombras, bonecos) -> luz/gradacao -> brilhos -> vinheta -> interface.
Tudo em pixel logico (1 px de arte = 2 px de tela); a ampliacao e sempre inteira e sem suavizar."""
import os, sys, math, random
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image, ImageDraw
from fonte import texto, largura

AQUI = os.path.dirname(os.path.abspath(__file__))
PEC = os.path.join(AQUI, 'pecas')
AMEIXA = (43, 30, 58)
CREME = (255, 246, 224)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 + 1 / 32.0
PAD = 48

# ---------------------------------------------------------------- paleta mestra (ver docs/reino/arte.md)
GRAMA = [(124, 201, 80), (86, 168, 66), (58, 128, 60), (40, 92, 58)]
TERRA = [(232, 196, 138), (205, 160, 104), (160, 114, 76), (112, 76, 62)]
PEDRA = [(206, 202, 216), (158, 152, 180), (110, 102, 142), (72, 62, 100)]
MADEIRA = [(196, 140, 84), (150, 98, 60), (104, 64, 48)]
FAMILIA = {'carmim': [(236, 96, 84), (204, 60, 62), (140, 36, 56)], 'folha': [(120, 200, 92), (70, 156, 72), (40, 104, 64)],
           'anil': [(104, 160, 248), (62, 110, 214), (40, 66, 150)], 'laranja': [(250, 170, 80), (232, 126, 46), (168, 78, 36)]}
RARIDADE = {'comum': [(196, 140, 84), (150, 98, 60), (104, 64, 48)], 'incomum': [(232, 160, 104), (190, 110, 70), (124, 66, 52)],
            'rara': [(236, 240, 248), (176, 186, 210), (108, 116, 150)], 'lendaria': [(255, 236, 140), (244, 190, 60), (176, 112, 36)]}
ALIADO = (72, 132, 232); INVASOR = (146, 72, 200); LIMA = (182, 240, 60); OURO = (255, 210, 72)

CLIMAS = {
 'manha': dict(ceu=[(70, 150, 232), (120, 196, 244), (196, 234, 246)], sol=(0.20, 0.30, (255, 250, 214), 8), nuvem=[(255, 255, 255), (214, 232, 248)],
               amb=(1.0, 1.0, 0.97), nevoa=(190, 228, 244), k_longe=0.55, k_meio=0.18, rim=((255, 248, 210), 0.55), luz=(-1, -1),
               sombra=(0.26, 2, 1.0), sat=1.04, vinheta=0.14, estrelas=False),
 'tarde': dict(ceu=[(84, 100, 196), (236, 140, 120), (255, 214, 140)], sol=(0.16, 0.74, (255, 236, 170), 10), nuvem=[(255, 214, 170), (226, 138, 140)],
               amb=(1.0, 0.88, 0.76), nevoa=(246, 176, 140), k_longe=0.60, k_meio=0.26, rim=((255, 222, 140), 0.75), luz=(-1, -1),
               sombra=(0.28, 6, 1.6), sat=1.10, vinheta=0.20, estrelas=False),
 'noite': dict(ceu=[(18, 16, 48), (46, 36, 100), (128, 56, 120)], sol=(0.80, 0.22, (226, 236, 255), 7), nuvem=[(74, 62, 128), (44, 38, 92)],
               amb=(0.40, 0.44, 0.74), nevoa=(52, 44, 110), k_longe=0.66, k_meio=0.40, rim=((150, 206, 255), 0.55), luz=(1, -1),
               sombra=(0.38, -3, 1.2), sat=1.0, vinheta=0.30, estrelas=True),
}


def mix(a, b, t): return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


_cache = {}
def spr(nome, espelho=False):
    k = (nome, espelho)
    if k not in _cache:
        im = Image.open(os.path.join(PEC, nome + '.png')).convert('RGBA')
        _cache[k] = im.transpose(Image.FLIP_LEFT_RIGHT) if espelho else im
    return _cache[k]


def bitmap(linhas, cores):
    im = Image.new('RGBA', (len(linhas[0]), len(linhas)), (0, 0, 0, 0)); px = im.load()
    for y, l in enumerate(linhas):
        for x, c in enumerate(l):
            if c in cores: px[x, y] = tuple(cores[c]) + (255,)
    return im


def contornar(im, cor=AMEIXA):
    a = np.array(im); a = np.pad(a, ((1, 1), (1, 1), (0, 0)))
    al = a[..., 3] > 0; p = np.pad(al, 1)
    perto = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    novo = perto & ~al
    a[novo, :3] = cor; a[novo, 3] = 255
    return Image.fromarray(a, 'RGBA')


# ---------------------------------------------------------------- icones por codigo
CORACAO = contornar(bitmap([".rr.rr.", "rRrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."], {'r': (232, 64, 76), 'R': (255, 170, 170)}))
CORACAO_VAZIO = contornar(bitmap([".rr.rr.", "rrrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."], {'r': (88, 70, 110)}))
MOEDA = contornar(bitmap([".ooo.", "oOoyo", "oOoyo", "oooyo", ".yyy."], {'o': (255, 214, 80), 'O': (255, 246, 190), 'y': (214, 150, 40)}))
CAVEIRA = contornar(bitmap([".www.", "wwwww", "wkwkw", "wwwww", ".wkw."], {'w': (240, 236, 226), 'k': AMEIXA}))
ESPADA = bitmap(["....ww", "...www", "..www.", "o.ww..", ".oo...", "m.o..."], {'w': (240, 244, 255), 'o': (255, 210, 72), 'm': (150, 98, 60)})
MARTELO = bitmap(["wwww..", "wwww..", ".wwm..", "...m..", "....m.", ".....m"], {'w': (206, 202, 216), 'm': (196, 140, 84)})
ESTRELA = bitmap(["..y..", "..y..", "yyYyy", ".yyy.", ".y.y."], {'y': (255, 236, 140), 'Y': (255, 255, 255)})
ESCUDO = contornar(bitmap(["bbbbb", "bBbbb", "bBbbb", ".bbb.", "..b.."], {'b': ALIADO, 'B': (170, 210, 255)}))
CHIFRE = contornar(bitmap(["p...p", "pp.pp", "ppppp", "plplp", ".ppp."], {'p': INVASOR, 'l': LIMA}))


class Cena:
    def __init__(self, W, H, clima='tarde', semente=7):
        self.W, self.H, self.c, self.nome_clima = W, H, CLIMAS[clima], clima
        self.rnd = random.Random(semente)
        T = (W + 2 * PAD, H + 2 * PAD)
        self.mundo = Image.new('RGBA', T, (0, 0, 0, 0))
        self.rim = Image.new('L', T, 0)
        self.emis = Image.new('RGBA', T, (0, 0, 0, 0))     # brilhos que a noite nao apaga (janela, olho, magia)
        self.fx = Image.new('RGBA', T, (0, 0, 0, 0))       # particulas e numeros, por cima da gradacao
        self.luzes = []                                    # (x, y, raio, cor, forca)
        self.d = ImageDraw.Draw(self.mundo)

    # ------------------------------------------------------------ ceu e planos
    def fundo(self, y_horizonte, y_longe, y_meio, x_meio=0, largura_meio=None):
        c = self.c; W, H = self.W, self.H
        a = np.zeros((H, W, 3))
        yy = np.arange(H)[:, None]; xx = np.arange(W)[None, :]
        t = np.clip(yy / float(y_horizonte), 0, 1) * np.ones((1, W))
        N = 16
        f = t * N; banda = np.floor(f) + ((f - np.floor(f)) > BAYER[yy % 4, xx % 4]); tb = np.clip(banda / N, 0, 1)
        top, mid, hor = [np.array(v, float) for v in c['ceu']]
        a = np.where(tb[..., None] < 0.55, top + (mid - top) * (tb[..., None] / 0.55), mid + (hor - mid) * ((tb[..., None] - 0.55) / 0.45))
        im = Image.fromarray(a.astype(np.uint8), 'RGB').convert('RGBA'); d = ImageDraw.Draw(im)
        if c['estrelas']:
            for _ in range(W * y_horizonte // 260):
                x, y = self.rnd.randrange(W), self.rnd.randrange(int(y_horizonte * 0.8))
                v = self.rnd.choice([(255, 255, 255), (190, 200, 255), (130, 130, 200), (130, 130, 200)])
                d.point((x, y), v)
                if self.rnd.random() < 0.08: d.point([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], (150, 160, 230))
        sx, sy, scor, sr = c['sol']; sx, sy = int(sx * W), int(sy * y_horizonte)
        px = im.load()
        for (r, k) in ((sr * 4, 0.10), (sr * 2.6, 0.20), (sr * 1.6, 0.42)):   # halo em faixas pontilhadas
            for y in range(max(0, int(sy - r)), min(H, int(sy + r) + 1)):
                for x in range(max(0, int(sx - r)), min(W, int(sx + r) + 1)):
                    dd = math.hypot(x - sx, y - sy) / r
                    if dd <= 1 and (1 - dd) * 1.6 > BAYER[y % 4, x % 4] * 1.2: px[x, y] = mix(px[x, y][:3], scor, k) + (255,)
        d.ellipse((sx - sr, sy - sr, sx + sr, sy + sr), fill=scor)
        if self.nome_clima == 'noite':  # crateras e lua minguante
            d.ellipse((sx - sr + 4, sy - sr - 2, sx + sr + 5, sy + sr - 3), fill=tuple(int(v) for v in top + (mid - top) * 0.35)); d.point([(sx - 4, sy + 2), (sx - 5, sy - 1)], (176, 190, 230))
        # nuvens: bolas chapadas com barriga em sombra
        for i in range(max(3, W // 70)):
            cx = self.rnd.randrange(-10, W + 10); cy = self.rnd.randrange(int(y_horizonte * 0.10), int(y_horizonte * 0.62)); n = self.rnd.randrange(3, 6)
            bolas = [(cx + j * 7 + self.rnd.randrange(-2, 3), cy - self.rnd.randrange(0, 5), self.rnd.randrange(4, 8)) for j in range(n)]
            for (x, y, r) in bolas: d.ellipse((x - r, y - r + 2, x + r, y + r + 2), fill=c['nuvem'][1])
            for (x, y, r) in bolas: d.ellipse((x - r, y - r, x + r, y + r - 1), fill=c['nuvem'][0])
        # plano longe (montanhas) e plano meio (arvores): cor puxada para a nevoa = perspectiva do ar
        for nome, y0, k, x0 in (('plano-longe', y_longe, c['k_longe'], -20), ('plano-meio', y_meio, c['k_meio'], x_meio)):
            s = np.array(spr(nome)).astype(float)
            s[..., :3] = (s[..., :3] * np.array(c['amb']) ** 0.6) * (1 - k) + np.array(c['nevoa']) * k
            sim = Image.fromarray(s.astype(np.uint8), 'RGBA'); x = x0; i = 0
            while x < W:
                tmp = Image.new('RGBA', im.size, (0, 0, 0, 0)); tmp.paste(sim if i % 2 == 0 else sim.transpose(Image.FLIP_LEFT_RIGHT), (x, y0)); im.alpha_composite(tmp)
                x += sim.width; i += 1
        self.ceu = im

    # ------------------------------------------------------------ chao
    def ret(self, x0, y0, x1, y1, cor): self.d.rectangle((x0 + PAD, y0 + PAD, x1 + PAD, y1 + PAD), fill=cor)
    def pt(self, x, y, cor): self.d.point((x + PAD, y + PAD), cor)

    def grama(self, x0, y0, x1, y1, sombra_topo=0):
        self.ret(x0, y0, x1, y1, GRAMA[1])
        if sombra_topo: self.ret(x0, y0, x1, y0 + sombra_topo - 1, GRAMA[2])
        for x in range(x0, x1 + 1):                      # borda pontilhada da sombra
            if sombra_topo and (x + y0) % 2 == 0: self.pt(x, y0 + sombra_topo, GRAMA[2])
        n = (x1 - x0) * (y1 - y0) // 26
        for _ in range(n):
            x, y = self.rnd.randrange(x0, x1), self.rnd.randrange(y0 + sombra_topo, y1 + 1); r = self.rnd.random()
            if r < 0.50: self.pt(x, y, GRAMA[2]); self.pt(x + 1, y - 1, GRAMA[2])
            elif r < 0.86: self.pt(x, y, GRAMA[0]); self.pt(x + 1, y, GRAMA[0])
            elif r < 0.95: self.pt(x, y, (255, 250, 230)); self.pt(x, y + 1, GRAMA[2])
            else: self.pt(x, y, self.rnd.choice([(255, 214, 80), (250, 150, 170)])); self.pt(x, y + 1, GRAMA[2])

    def estrada(self, x0, y0, x1, y1):
        self.ret(x0, y0, x1, y1, TERRA[1])
        for x in range(x0, x1 + 1):
            j = (x * 7 + y0) % 5
            self.pt(x, y0, TERRA[2] if j else GRAMA[2]); self.pt(x, y0 + 1, TERRA[2] if j == 2 else TERRA[1])
            self.pt(x, y1, TERRA[0] if j != 3 else GRAMA[0]); self.pt(x, y1 - 1, TERRA[0] if j in (1, 4) else TERRA[1])
        for _ in range((x1 - x0) * (y1 - y0) // 16):
            x, y = self.rnd.randrange(x0, x1), self.rnd.randrange(y0 + 2, y1 - 1); r = self.rnd.random()
            if r < 0.45: self.pt(x, y, TERRA[0]); self.pt(x + 1, y, TERRA[0])
            elif r < 0.85: self.pt(x, y, TERRA[2]); self.pt(x + 1, y, TERRA[2]); self.pt(x + 2, y, TERRA[2])
            else: self.pt(x, y, PEDRA[1]); self.pt(x + 1, y, PEDRA[0]); self.pt(x, y + 1, TERRA[3]); self.pt(x + 1, y + 1, TERRA[3])

    def muro(self, x0, y0, x1, y1):
        self.ret(x0, y0, x1, y1, PEDRA[2])
        for y in range(y0, y1 + 1, 4):
            desl = 0 if ((y - y0) // 4) % 2 == 0 else 5
            self.ret(x0, y, x1, y, PEDRA[1] if y > y0 else PEDRA[0])
            self.ret(x0, min(y1, y + 3), x1, min(y1, y + 3), PEDRA[3])
            for x in range(x0 - 10 + desl, x1 + 1, 10):
                if x >= x0: self.ret(x, y, x, min(y1, y + 3), PEDRA[3])
                if x + 1 >= x0 and x + 1 <= x1 and y + 1 <= y1: self.pt(x + 1, y + 1, PEDRA[1])
        for _ in range((x1 - x0) // 9):                   # musgo e capim pendurado
            x = self.rnd.randrange(x0, x1 - 2); h = self.rnd.randrange(1, 4)
            self.ret(x, y0, x + self.rnd.randrange(1, 3), y0 + h, GRAMA[2]); self.pt(x, y0 + h + 1, GRAMA[3])
        self.ret(x0, y1 + 1, x1, y1 + 1, AMEIXA)

    def escada(self, x0, y0, x1, y1):
        for i, y in enumerate(range(y0, y1 + 1)):
            self.ret(x0, y, x1, y, (TERRA[0], TERRA[1], TERRA[1], TERRA[3])[i % 4])
        self.ret(x0 - 1, y0, x0 - 1, y1, PEDRA[3]); self.ret(x1 + 1, y0, x1 + 1, y1, PEDRA[3])
        self.ret(x0 - 2, y0, x0 - 2, y1, PEDRA[1]); self.ret(x1 + 2, y0, x1 + 2, y1, PEDRA[1])

    # ------------------------------------------------------------ colagem com luz
    def cola(self, im, cx, base, tipo='boneco', brilho=False, branco=False):
        """Cola pela base (pe). Marca o filete de luz (rim) e os brilhos; apaga o que fica atras nas camadas de luz."""
        x, y = int(cx - im.width // 2) + PAD, int(base - im.height) + PAD
        a = np.array(im); al = a[..., 3] > 0
        if branco:
            a[al & (a[..., :3].max(axis=2) > 62), :3] = (255, 252, 236); im = Image.fromarray(a, 'RGBA')
        self.mundo.alpha_composite(im, (x, y))
        m = Image.fromarray((al * 255).astype(np.uint8), 'L')
        self.rim.paste(0, (x, y), m); self.emis.paste((0, 0, 0, 0), (x, y), m); self.fx.paste((0, 0, 0, 0), (x, y), m)
        lx, ly = self.c['luz']; p = np.pad(al, 1)
        fora_x = ~(p[1:-1, :-2] if lx < 0 else p[1:-1, 2:]); fora_y = ~p[:-2, 1:-1]
        if tipo == 'boneco': r = al & (fora_x | fora_y) & (a[..., :3].max(axis=2) < 64)
        else: r = al & (fora_x | fora_y)
        self.rim.paste(255 if tipo == 'boneco' else 150, (x, y), Image.fromarray((r * 255).astype(np.uint8), 'L'))
        if brilho:
            R, G, B = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
            if brilho == 'janela': e = al & (R > 215) & (G > 170) & (B < 150) & (R - B > 90)
            elif brilho == 'lima': e = al & (G > 200) & (R < 215) & (B < 130)
            else: e = al & (G > 190) & (B > 170) & (R < 170)
            self.emis.paste(im, (x, y), Image.fromarray((e * 255).astype(np.uint8), 'L'))
            ys, xs = np.nonzero(e)
            if len(xs): return (x - PAD + xs.mean(), y - PAD + ys.mean())
        return None

    def sombras(self, lista):
        """lista de (cx, base, largura). Elipse ameixa no chao; estica e desloca conforme a hora."""
        alfa, dx, estica = self.c['sombra']
        m = Image.new('L', self.mundo.size, 0); d = ImageDraw.Draw(m)
        for cx, base, w in lista:
            w2 = int(w * estica); d.ellipse((cx + PAD + dx - w2 // 2, base + PAD - 3, cx + PAD + dx + (w2 + 1) // 2, base + PAD + 1), fill=255)
        a = np.array(m).astype(float) / 255 * alfa
        yy, xx = np.indices(a.shape); a = np.where(((xx + yy) % 2 == 0) | (a > 0), a, 0)
        w = np.array(self.mundo).astype(float); vis = w[..., 3:4] / 255
        w[..., :3] = w[..., :3] * (1 - a[..., None] * vis) + np.array(AMEIXA) * a[..., None] * vis
        self.mundo = Image.fromarray(w.astype(np.uint8), 'RGBA'); self.d = ImageDraw.Draw(self.mundo)

    def tropa(self, lista):
        """lista de dicts: n (peca), x, y, lado ('a' aliado olha direita, 'i' invasor olha esquerda), vira (bool), branco, brilho."""
        lista = sorted(lista, key=lambda u: u['y'])
        self.sombras([(u['x'], u['y'], spr(u['n']).width * 0.62) for u in lista])
        for u in lista:
            im = spr(u['n'], u.get('vira', False))
            p = self.cola(im, u['x'], u['y'], 'boneco', brilho=u.get('brilho'), branco=u.get('branco', False))
            if p and u.get('brilho') == 'lima' and self.nome_clima == 'noite': self.luzes.append((p[0], p[1], 9, LIMA, 0.35))

    def predio(self, nome, cx, base, espelho=False, luz=True):
        self.sombras([(cx + 2, base, spr(nome).width * 0.8)])
        p = self.cola(spr(nome, espelho), cx, base, 'cenario', brilho='janela')
        if p and luz: self.luzes.append((p[0], p[1] + 2, 26, (255, 196, 110), 0.85))

    def bandeira(self, x, base, cor, nivel=0, alt=15):
        self.ret(x, base - alt, x, base, MADEIRA[2]); self.pt(x, base - alt - 1, OURO)
        self.ret(x + 1, base - alt, x + 7, base - alt + 4, cor[1]); self.ret(x + 1, base - alt, x + 7, base - alt, cor[0])
        self.ret(x + 1, base - alt + 4, x + 5, base - alt + 4, cor[2])
        for i in range(3):
            self.ret(x - 4 + i * 4, base + 2, x - 2 + i * 4, base + 4, AMEIXA); self.ret(x - 3 + i * 4, base + 3, x - 3 + i * 4, base + 3, OURO if i < nivel else (110, 96, 130))

    def vazio(self, cx, base):
        for x in range(cx - 16, cx + 17, 4):
            self.ret(x, base - 12, x + 1, base - 12, GRAMA[0]); self.ret(x, base, x + 1, base, GRAMA[0])
        for y in range(base - 12, base + 1, 4): self.pt(cx - 17, y, GRAMA[0]); self.pt(cx + 18, y, GRAMA[0])
        self.ret(cx, base - 14, cx, base - 4, MADEIRA[2]); self.ret(cx - 5, base - 20, cx + 5, base - 12, AMEIXA); self.ret(cx - 4, base - 19, cx + 4, base - 13, MADEIRA[0])
        self.ret(cx - 2, base - 16, cx + 2, base - 16, AMEIXA); self.ret(cx, base - 18, cx, base - 14, AMEIXA)

    def pas(self, cx, cy, ang=0.35, r=15):
        """Pas do moinho por codigo (giram no jogo: 8 posicoes, sem custo de geracao)."""
        d = ImageDraw.Draw(self.mundo)
        for i in range(4):
            a = ang + i * math.pi / 2; ex, ey = cx + math.cos(a) * r, cy + math.sin(a) * r
            nx, ny = -math.sin(a) * 3.2, math.cos(a) * 3.2
            mx, my = cx + math.cos(a) * 4, cy + math.sin(a) * 4
            pol = [(mx + PAD, my + PAD), (ex + PAD, ey + PAD), (ex + nx + PAD, ey + ny + PAD), (mx + nx + PAD, my + ny + PAD)]
            d.polygon(pol, fill=(250, 240, 214), outline=AMEIXA)
            d.line((cx + PAD, cy + PAD, ex + PAD, ey + PAD), fill=MADEIRA[2])
        d.rectangle((cx - 1 + PAD, cy - 1 + PAD, cx + 1 + PAD, cy + 1 + PAD), fill=OURO, outline=AMEIXA)

    # ------------------------------------------------------------ particulas e numeros (camada fx, depois da gradacao)
    def poeira(self, x, y, n=3):
        d = ImageDraw.Draw(self.fx)
        for _ in range(n):
            px, py, r = x + self.rnd.randrange(-6, 7), y - self.rnd.randrange(0, 5), self.rnd.choice([1, 1, 2])
            d.ellipse((px - r + PAD, py - r + PAD, px + r + PAD, py + r + PAD), fill=mix(TERRA[0], self.c['nevoa'], 0.3) + (230,))
            d.point((px + PAD - r, py + PAD + r), mix(TERRA[2], self.c['nevoa'], 0.3))

    def faisca(self, x, y, cor=(255, 250, 200), r=3):
        d = ImageDraw.Draw(self.fx)
        d.line((x - r + PAD, y + PAD, x + r + PAD, y + PAD), fill=cor); d.line((x + PAD, y - r + PAD, x + PAD, y + r + PAD), fill=cor)
        d.point([(x - 1 + PAD, y - 1 + PAD), (x + 1 + PAD, y + 1 + PAD), (x + 1 + PAD, y - 1 + PAD), (x - 1 + PAD, y + 1 + PAD)], OURO)
        d.point((x + PAD, y + PAD), (255, 255, 255))
        self.luzes.append((x, y, 10, (255, 220, 150), 0.5))

    def numero(self, x, y, s, critico=False):
        texto(self.fx, x + PAD, y + PAD, s, OURO if critico else CREME, contorno=AMEIXA, centro=True)

    def flecha(self, x0, y0, x1, y1, alt=18, n=1.0):
        d = ImageDraw.Draw(self.fx)
        def p(t): return (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - alt * 4 * t * (1 - t))
        a, b = p(n - 0.07), p(n)
        for t in np.arange(max(0, n - 0.5), n - 0.08, 0.035):   # rastro pontilhado
            q = p(t); d.point((int(q[0]) + PAD, int(q[1]) + PAD), (255, 255, 255, int(40 + 150 * (t - (n - 0.5)) * 2)))
        d.line((a[0] + PAD, a[1] + PAD, b[0] + PAD, b[1] + PAD), fill=AMEIXA, width=1)
        d.point((int(b[0]) + PAD, int(b[1]) + PAD), (255, 255, 255))

    def raio(self, x0, y0, x1, y1, cor=(255, 240, 150)):
        d = ImageDraw.Draw(self.fx); pts = [(x0, y0)]; n = 7
        for i in range(1, n):
            t = i / n; pts.append((x0 + (x1 - x0) * t + self.rnd.randrange(-4, 5), y0 + (y1 - y0) * t + self.rnd.randrange(-3, 4)))
        pts.append((x1, y1)); pp = [(a + PAD, b + PAD) for a, b in pts]
        d.line(pp, fill=mix(cor, (200, 90, 40), 0.6), width=3); d.line(pp, fill=cor, width=1)
        for (a, b) in pts[1::2]: d.point((a + PAD, b + PAD), (255, 255, 255)); self.luzes.append((a, b, 16, cor, 0.5))
        self.faisca(x1, y1, (255, 255, 240), 4); self.luzes.append((x1, y1, 30, cor, 0.9))

    def tempestade(self, x, y):
        d = ImageDraw.Draw(self.fx)
        for (ox, oy, r) in ((-6, 1, 3), (-1, -1, 5), (5, 0, 4), (9, 2, 3)): d.ellipse((x + ox - r + PAD, y + oy - r + 2 + PAD, x + ox + r + PAD, y + oy + r + 2 + PAD), fill=(52, 44, 92))
        for (ox, oy, r) in ((-6, 1, 3), (-1, -1, 5), (5, 0, 4), (9, 2, 3)): d.ellipse((x + ox - r + PAD, y + oy - r + PAD, x + ox + r + PAD, y + oy + r - 1 + PAD), fill=(96, 86, 150))
        d.point([(x - 4 + PAD, y - 6 + PAD), (x - 3 + PAD, y - 7 + PAD), (x + 4 + PAD, y - 4 + PAD)], (150, 142, 200))

    def orbe(self, x, y, cor=(120, 255, 230)):
        d = ImageDraw.Draw(self.fx)
        for i, (ox, oy) in enumerate(((0, 0), (5, 2), (9, 3), (12, 5))):
            if i == 0: d.ellipse((x - 2 + PAD, y - 2 + PAD, x + 2 + PAD, y + 2 + PAD), fill=cor); d.point((x + PAD, y - 1 + PAD), (255, 255, 255))
            else: d.point((x + ox + PAD, y - oy + PAD), cor)
        self.luzes.append((x, y, 18, cor, 0.8))

    def barra_vida(self, cx, y, w, frac, cor=(232, 64, 76)):
        d = ImageDraw.Draw(self.fx)
        d.rectangle((cx - w // 2 - 1 + PAD, y - 1 + PAD, cx + w // 2 + 1 + PAD, y + 3 + PAD), fill=AMEIXA)
        d.rectangle((cx - w // 2 + PAD, y + PAD, cx + w // 2 + PAD, y + 2 + PAD), fill=(80, 60, 96))
        d.rectangle((cx - w // 2 + PAD, y + PAD, cx - w // 2 + int(w * frac) + PAD, y + 2 + PAD), fill=cor)
        d.rectangle((cx - w // 2 + PAD, y + PAD, cx - w // 2 + int(w * frac) + PAD, y + PAD), fill=mix(cor, (255, 255, 255), 0.45))

    # ------------------------------------------------------------ luz, gradacao, vinheta
    def revelar(self):
        c = self.c; W, H = self.W, self.H
        cut = lambda im: im.crop((PAD, PAD, PAD + W, PAD + H))
        w = np.array(cut(self.mundo)).astype(float); al = w[..., 3:4] / 255
        yy, xx = np.indices((H, W)); by = BAYER[yy % 4, xx % 4]
        L = np.ones((H, W, 3)) * np.array(c['amb'])
        if self.nome_clima == 'noite' or True:
            forca_luz = 1.0 if self.nome_clima == 'noite' else (0.35 if self.nome_clima == 'tarde' else 0.12)
            for (lx, ly, r, cor, f) in self.luzes:
                dd = np.clip(1 - np.hypot(xx - lx, (yy - ly) * 1.25) / r, 0, 1) ** 1.5
                q = np.floor(dd * 5 + by * 0.3) / 5.0             # luz em degraus pontilhados (pixel art, nao degrade liso)
                L += q[..., None] * np.array(cor) / 255.0 * f * forca_luz
        rgb = w[..., :3] * np.clip(L, 0, 1.3)
        rim = np.array(cut(self.rim)).astype(float)[..., None] / 255 * c['rim'][1]
        rgb = rgb * (1 - rim) + np.array(c['rim'][0]) * rim
        e = np.array(cut(self.emis)).astype(float); ea = e[..., 3:4] / 255
        rgb = rgb * (1 - ea) + e[..., :3] * ea
        ceu = np.array(self.ceu.convert('RGB')).astype(float)
        out = ceu * (1 - al) + rgb * al
        f = np.array(cut(self.fx)).astype(float); fa = f[..., 3:4] / 255
        out = out * (1 - fa) + f[..., :3] * fa
        g = out.mean(axis=2, keepdims=True); out = g + (out - g) * c['sat']      # saturacao do momento
        d = np.hypot((xx - W / 2) / (W / 2), (yy - H * 0.46) / (H / 2))
        v = np.clip((d - 0.62) / 0.75, 0, 1) * c['vinheta']
        v = np.floor(v * 24 + by) / 24.0                                           # vinheta em degraus
        out = out * (1 - v[..., None]) + np.array(AMEIXA) * v[..., None] * 0.6 + out * v[..., None] * 0.4 * 0
        return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')


# ---------------------------------------------------------------- interface (por cima, sem gradacao)
def painel(im, x0, y0, x1, y1, cor=(58, 42, 78), borda=AMEIXA, luz=(98, 76, 124), ripas=True):
    d = ImageDraw.Draw(im)
    d.rectangle((x0 + 1, y0, x1 - 1, y1), fill=borda); d.rectangle((x0, y0 + 1, x1, y1 - 1), fill=borda)
    d.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=cor); d.rectangle((x0 + 2, y0 + 1, x1 - 2, y0 + 1), fill=luz)
    if ripas:   # mesa de madeira escura: ripas e pregos
        for y in range(y0 + 12, y1, 12):
            d.rectangle((x0 + 1, y, x1 - 1, y), fill=(44, 32, 62)); d.rectangle((x0 + 1, y + 1, x1 - 1, y + 1), fill=(70, 52, 92))
        for x in range(x0 + 9, x1, 37): d.point([(x, y0 + 5), (x + 1, y0 + 5)], (130, 108, 150))


def botao(im, x, y, w=22, h=22, cor=FAMILIA['folha'], icone=None):
    d = ImageDraw.Draw(im)
    d.rectangle((x + 1, y, x + w - 2, y + h - 1), fill=AMEIXA); d.rectangle((x, y + 1, x + w - 1, y + h - 2), fill=AMEIXA)
    d.rectangle((x + 1, y + 1, x + w - 2, y + h - 2), fill=cor[2]); d.rectangle((x + 1, y + 1, x + w - 2, y + h - 5), fill=cor[1])
    d.rectangle((x + 2, y + 1, x + w - 3, y + 2), fill=cor[0])
    if icone == '>>':
        for ox in (5, 11):
            for i in range(5):
                d.rectangle((x + ox + i, y + 5 + i, x + ox + i, y + 14 - i), fill=AMEIXA)
        for ox in (4, 10):
            for i in range(5):
                d.rectangle((x + ox + i, y + 4 + i, x + ox + i, y + 13 - i), fill=CREME)


def carta(nome, familia, raridade, tipo, peca, nivel=1, de=3, clima_fundo='manha', quant=None, destaque=False):
    """Carta 54x78. Moldura = raridade (material). Faixa do nome = familia (cor). Selo redondo = tipo (icone)."""
    W, H = 56, 78; im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    R = RARIDADE[raridade]; F = FAMILIA[familia]
    d.rectangle((1, 0, W - 2, H - 1), fill=AMEIXA); d.rectangle((0, 1, W - 1, H - 2), fill=AMEIXA)
    d.rectangle((1, 1, W - 2, H - 2), fill=R[1])
    d.rectangle((1, 1, W - 2, 1), fill=R[0]); d.rectangle((1, 1, 1, H - 2), fill=R[0])
    d.rectangle((2, H - 2, W - 2, H - 2), fill=R[2]); d.rectangle((W - 2, 2, W - 2, H - 2), fill=R[2])
    if raridade in ('comum', 'incomum'):
        for y in range(6, H - 4, 9): d.point([(2, y), (W - 3, y + 4)], R[2])
    else:
        for y in range(5, H - 6, 11): d.point([(2, y), (2, y + 1), (W - 3, y + 5)], (255, 255, 255))
    d.rectangle((3, 3, W - 4, H - 4), fill=AMEIXA); d.rectangle((4, 4, W - 5, H - 5), fill=(252, 238, 206))
    # faixa do nome
    d.rectangle((4, 4, W - 5, 15), fill=F[1]); d.rectangle((4, 4, W - 5, 4), fill=F[0]); d.rectangle((4, 15, W - 5, 15), fill=F[2]); d.rectangle((4, 16, W - 5, 16), fill=AMEIXA)
    texto(im, W // 2, 6, nome, CREME, sombra=F[2], centro=True)
    # janela da ilustracao: mini cena com ceu, chao e a peca
    jx0, jy0, jx1, jy1 = 5, 17, W - 6, 52
    c = CLIMAS[clima_fundo]
    for y in range(jy0, jy1 + 1):
        t = (y - jy0) / (jy1 - jy0); cor = mix(c['ceu'][0], c['ceu'][2], min(1, t * 1.5))
        for x in range(jx0, jx1 + 1):
            d.point((x, y), cor if (t * 6 % 1) < 0.5 or (x + y) % 2 else mix(c['ceu'][0], c['ceu'][2], min(1, (t + 0.08) * 1.5)))
    if tipo == 'magia':
        for y in range(jy0, jy1 + 1): d.rectangle((jx0, y, jx1, y), fill=mix((40, 30, 90), (120, 60, 140), (y - jy0) / 36))
        pts = [(34, 18), (26, 30), (31, 30), (22, 46), (36, 33), (30, 33), (38, 18)]
        d.polygon(pts, fill=(255, 240, 150), outline=(255, 255, 255)); d.line((22, 46, 20, 50), fill=(255, 255, 255))
        for (x, y) in ((12, 24), (42, 40), (10, 44), (44, 24)): d.point((x, y), (255, 255, 255)); d.point([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], (190, 170, 255))
        d.rectangle((jx0, 47, jx1, jy1), fill=GRAMA[3]); d.rectangle((jx0, 47, jx1, 47), fill=GRAMA[2])
    else:
        d.rectangle((jx0, 45, jx1, jy1), fill=GRAMA[1]); d.rectangle((jx0, 45, jx1, 45), fill=GRAMA[0]); d.rectangle((jx0, 50, jx1, jy1), fill=GRAMA[2])
        d.ellipse((12, 23, 30, 31), fill=c['nuvem'][0])
        s = spr(peca)
        if s.height > 34: s = s.crop((0, 0, s.width, 34)) if tipo != 'construcao' else s.crop(((s.width - 44) // 2 if s.width > 44 else 0, s.height - 34, s.width - ((s.width - 44) // 2 if s.width > 44 else 0), s.height))
        ox = jx0 + ((jx1 - jx0 + 1) - s.width) // 2
        d.ellipse((ox + 3, 47, ox + s.width - 3, 51), fill=GRAMA[3])
        im.alpha_composite(s, (ox, 50 - s.height))
    d.rectangle((jx0, jy1 + 1, jx1, jy1 + 1), fill=AMEIXA)
    # selo do tipo (canto de cima, esquerda)
    d.ellipse((3, 46, 15, 58), fill=AMEIXA); d.ellipse((4, 47, 14, 57), fill=R[0]); d.ellipse((5, 48, 13, 56), fill=(58, 42, 78))
    ic = {'tropa': ESPADA, 'construcao': MARTELO, 'magia': ESTRELA}[tipo]; im.alpha_composite(ic, (9 - ic.width // 2, 52 - ic.height // 2))
    # linha de forca e nivel
    if quant: texto(im, 32, 56, quant, AMEIXA, centro=True)
    for i in range(de):
        x = 28 - (de * 8 - 2) // 2 + i * 8
        d.rectangle((x, 67, x + 5, 72), fill=AMEIXA); d.rectangle((x + 1, 68, x + 4, 71), fill=OURO if i < nivel else (200, 186, 160))
        if i < nivel: d.point((x + 1, 68), (255, 255, 255))
    if destaque:   # aura de escolha: contorno dourado duplo, pontilhado por fora
        im2 = Image.new('RGBA', (W + 4, H + 4), (0, 0, 0, 0)); im2.alpha_composite(contornar(contornar(im, OURO), (255, 250, 200)), (0, 0)); return im2
    return im


def etiqueta(im, cx, y, s, cor=FAMILIA['carmim']):
    w = largura(s) + 6; d = ImageDraw.Draw(im)
    d.rectangle((cx - w // 2, y, cx + w // 2, y + 10), fill=AMEIXA); d.rectangle((cx - w // 2 + 1, y + 1, cx + w // 2 - 1, y + 9), fill=cor[1])
    d.rectangle((cx - w // 2 + 1, y + 1, cx + w // 2 - 1, y + 1), fill=cor[0])
    texto(im, cx + 1, y + 2, s, CREME, sombra=cor[2], centro=True)
    d.point([(cx - 1, y + 11), (cx, y + 11), (cx + 1, y + 11), (cx, y + 12)], AMEIXA)


def barra_forca(im, x0, y, x1, aliados, invasores):
    d = ImageDraw.Draw(im); tot = aliados + invasores; m = x0 + int((x1 - x0) * aliados / tot)
    d.rectangle((x0 - 1, y - 1, x1 + 1, y + 5), fill=AMEIXA)
    d.rectangle((x0, y, m, y + 4), fill=ALIADO); d.rectangle((x0, y, m, y), fill=(170, 210, 255)); d.rectangle((x0, y + 4, m, y + 4), fill=(40, 66, 150))
    d.rectangle((m + 1, y, x1, y + 4), fill=INVASOR); d.rectangle((m + 1, y, x1, y), fill=(200, 140, 240)); d.rectangle((m + 1, y + 4, x1, y + 4), fill=(86, 40, 130))
    d.rectangle((m, y - 2, m + 1, y + 6), fill=CREME); d.rectangle((m - 1, y - 2, m + 2, y - 2), fill=AMEIXA); d.rectangle((m - 1, y + 6, m + 2, y + 6), fill=AMEIXA)
    im.alpha_composite(ESCUDO, (x0 - 9, y - 2)); im.alpha_composite(CHIFRE, (x1 + 3, y - 2))


def ampliar(im, n): return im.resize((im.width * n, im.height * n), Image.NEAREST)
