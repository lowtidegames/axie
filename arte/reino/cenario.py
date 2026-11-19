"""Cenario do piloto (R9) em planos de paralaxe, por aparelho (pc, celular) e por hora (manha, tarde, noite de chefe).
Planos: ceu (com sol/lua e estrelas) -> longe (montanhas) -> meio (arvores) -> chao (grama, estrada, muros, escadas) -> frente (moitas).
As montanhas e as arvores vem das 2 pecas ja geradas; todo o resto e codigo. A gradacao da hora e aplicada aqui, por codigo.
Tambem devolve a geometria (onde fica cada terreno, o portao, o castelo) e a luz de cada hora para a tela pintar as pecas."""
import os, sys, math, random
sys.dont_write_bytecode = True
import numpy as np
from comum import *
from cena import Cena, CLIMAS, PAD

HORAS = ('manha', 'tarde', 'noite')
NOME_HORA = {'manha': 'morning', 'tarde': 'afternoon', 'noite': 'boss-night'}
# luz que a tela aplica nas PECAS (multiplicar), por hora
LUZ = {'manha': dict(ambiente=(255, 255, 248), filete=(255, 248, 210), sombra=dict(alfa=0.26, dx=2, estica=1.0), vinheta=0.14),
       'tarde': dict(ambiente=(255, 232, 206), filete=(255, 222, 140), sombra=dict(alfa=0.28, dx=6, estica=1.6), vinheta=0.20),
       'noite': dict(ambiente=(150, 156, 216), filete=(150, 206, 255), sombra=dict(alfa=0.38, dx=-3, estica=1.2), vinheta=0.30)}


def ceu(W, H, hora, semente=5, sol=None):
    c = CLIMAS[hora]; rnd = random.Random(semente)
    yy = np.arange(H)[:, None]; xx = np.arange(W)[None, :]
    t = np.clip(yy / float(H), 0, 1) * np.ones((1, W)); N = 14
    f = t * N; tb = np.clip((np.floor(f) + ((f - np.floor(f)) > BAYER[yy % 4, xx % 4])) / N, 0, 1)[..., None]
    top, mid, hor = [np.array(v, float) for v in c['ceu']]
    a = np.where(tb < 0.55, top + (mid - top) * (tb / 0.55), mid + (hor - mid) * ((tb - 0.55) / 0.45))
    im = Image.fromarray(a.astype(np.uint8), 'RGB').convert('RGBA'); d = ImageDraw.Draw(im); px = im.load()
    if c['estrelas']:
        for _ in range(W * H // 240):
            x, y = rnd.randrange(W), rnd.randrange(int(H * 0.8))
            d.point((x, y), rnd.choice([(255, 255, 255), (190, 200, 255), (130, 130, 200), (130, 130, 200)]))
            if rnd.random() < 0.08: d.point([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], (150, 160, 230))
    sx, sy, scor, sr = c['sol']
    if sol: sx, sy = sol
    sx, sy = int(sx * W), int(sy * H)
    for (r, k) in ((sr * 4, 0.10), (sr * 2.6, 0.20), (sr * 1.6, 0.42)):
        for y in range(max(0, int(sy - r)), min(H, int(sy + r) + 1)):
            for x in range(max(0, int(sx - r)), min(W, int(sx + r) + 1)):
                dd = math.hypot(x - sx, y - sy) / r
                if dd <= 1 and (1 - dd) * 1.6 > BAYER[y % 4, x % 4] * 1.2: px[x, y] = mix(px[x, y][:3], scor, k) + (255,)
    d.ellipse((sx - sr, sy - sr, sx + sr, sy + sr), fill=scor)
    if hora == 'noite':
        d.ellipse((sx - sr + 4, sy - sr - 2, sx + sr + 5, sy + sr - 3), fill=tuple(int(v) for v in top + (mid - top) * 0.35)); d.point([(sx - 4, sy + 2), (sx - 5, sy - 1)], (176, 190, 230))
    return im


def nuvem(hora, n):
    c = CLIMAS[hora]; rnd = random.Random(40 + n); im = tela(56, 22); d = ImageDraw.Draw(im)
    bolas = [(10 + j * 8 + rnd.randrange(-2, 3), 12 - rnd.randrange(0, 5), rnd.randrange(4, 8)) for j in range(3 + n)]
    for (x, y, r) in bolas: d.ellipse((x - r, y - r + 2, x + r, y + r + 2), fill=c['nuvem'][1] + (255,))
    for (x, y, r) in bolas: d.ellipse((x - r, y - r, x + r, y + r - 1), fill=c['nuvem'][0] + (255,))
    return im


def plano(nome, hora, W):
    """Montanhas/arvores: tinge com a nevoa da hora (perspectiva do ar) e repete espelhando, para emendar sem costura."""
    c = CLIMAS[hora]; k = c['k_longe'] if nome == 'plano-longe' else c['k_meio']
    s = np.array(Image.open(os.path.join(AQUI, 'pecas', nome + '.png')).convert('RGBA')).astype(float)
    s[..., :3] = (s[..., :3] * np.array(c['amb']) ** 0.6) * (1 - k) + np.array(c['nevoa']) * k
    sim = Image.fromarray(s.astype(np.uint8), 'RGBA'); b = sim.getbbox(); sim = sim.crop((0, b[1], sim.width, sim.height))
    im = tela(W, sim.height); x = 0; i = 0
    while x < W:
        im.alpha_composite(sim if i % 2 == 0 else sim.transpose(Image.FLIP_LEFT_RIGHT), (x, 0)); x += sim.width; i += 1
    return im


def _gradar(im, hora):
    """Aplica a luz ambiente e a saturacao da hora num plano de chao."""
    c = CLIMAS[hora]; a = np.array(im).astype(float)
    rgb = a[..., :3] * np.array(c['amb']); g = rgb.mean(axis=2, keepdims=True); rgb = g + (rgb - g) * c['sat']
    a[..., :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def _moita(d, x, y, r, V):
    d.ellipse((x - r, y - r, x + r, y + r), fill=V[2] + (255,)); d.ellipse((x - r + 1, y - r, x + r - 2, y + r - 3), fill=V[1] + (255,))
    d.point([(x - r // 2, y - r + 2), (x - r // 2 + 1, y - r + 2), (x - 1, y - r + 1)], V[0] + (255,))


def _pedra(c, x, y):
    c.ret(x, y - 3, x + 3, y, PEDRA[1]); c.ret(x, y - 3, x + 2, y - 3, PEDRA[0]); c.ret(x, y, x + 3, y, PEDRA[3]); c.pt(x + 3, y - 3, PEDRA[2])


# ---------------------------------------------------------------- PC: estrada reta
PC = dict(largura=640, ref=(480, 270), deslocamento_x=-80,           # os planos tem 640; a referencia de 480 fica no meio
          ceu_y=-60, longe_base=100, meio_base=114, chao_y=104, frente_y=238,
          predio_base=134, estrada=(138, 186), portao=(14, 139), castelo=(452, 140),
          terrenos=[dict(n=i + 1, x=98 + i * 58, largura=58, predio_base=134, estrada=(138, 186), sentido=1) for i in range(6)])


def chao_pc(hora):
    W, H = 640, 216; c = Cena(W, H, hora, semente=21); g = PC
    c.grama(0, 0, W - 1, 33, sombra_topo=3)
    c.estrada(0, 34, W - 1, 82)
    c.grama(0, 83, W - 1, H - 1, sombra_topo=2)
    for i in range(7):                                       # marcos de pedra entre os terrenos, na borda de tras da estrada
        x = 80 + g['terrenos'][0]['x'] - 29 + i * 58; _pedra(c, x, 33)
    rnd = random.Random(9)
    for _ in range(40):                                      # tufos e flores na grama da frente
        x, y = rnd.randrange(4, W - 4), rnd.randrange(92, H - 4)
        c.ret(x, y - 2, x, y, GRAMA[2]); c.pt(x - 1, y - 1, GRAMA[0]); c.pt(x + 1, y - 2, GRAMA[0])
    return _gradar(c.mundo.crop((PAD, PAD, PAD + W, PAD + H)), hora)


def frente(W, hora, semente=3):
    """Moitas escuras do primeiro plano (andam 130%)."""
    im = tela(W, 40); d = ImageDraw.Draw(im); rnd = random.Random(semente)
    V = [GRAMA[2], GRAMA[3], (28, 62, 52)]
    x = -6
    while x < W + 10:
        if rnd.random() < 0.62:
            r = rnd.randrange(7, 13); _moita(d, x, 34 + rnd.randrange(0, 5), r, V); _moita(d, x + r, 38, r - 3, V)
        x += rnd.randrange(14, 38)
    return _gradar(im, hora)


# ---------------------------------------------------------------- celular: o morro do castelo em 3 patamares
CEL = dict(largura=180, ref=(180, 370), deslocamento_x=0, ceu_y=0, longe_base=96, meio_base=112, chao_y=70, mesa_y=282,
           portao=(10, 270), castelo=(142, 114),
           terrenos=[dict(n=1, x=62, largura=62, predio_base=248, estrada=(251, 269), sentido=1), dict(n=2, x=124, largura=62, predio_base=248, estrada=(251, 269), sentido=1),
                     dict(n=3, x=118, largura=62, predio_base=180, estrada=(183, 201), sentido=-1), dict(n=4, x=56, largura=62, predio_base=180, estrada=(183, 201), sentido=-1),
                     dict(n=5, x=38, largura=56, predio_base=112, estrada=(115, 133), sentido=1), dict(n=6, x=92, largura=56, predio_base=112, estrada=(115, 133), sentido=1)],
           escadas=[dict(de=2, para=3, x=(160, 176), y=(183, 269)), dict(de=4, para=5, x=(4, 20), y=(115, 201))])


def chao_celular(hora):
    W, H = 180, 300; oy = CEL['chao_y']; c = Cena(W, H, hora, semente=33)
    Y = lambda y: y - oy
    # morro: tres degraus de grama, cada um com estrada e muro de arrimo
    c.grama(0, Y(84), W - 1, Y(114), sombra_topo=0)                      # alto do morro (o castelo fica aqui)
    for (ye0, ye1) in ((115, 133), (183, 201), (251, 269)):
        if ye0 > 115: c.grama(0, Y(ye0 - 42), W - 1, Y(ye0 - 1), sombra_topo=4)   # faixa de grama onde ficam os predios
        c.estrada(0, Y(ye0), W - 1, Y(ye1))
        c.muro(0, Y(ye1 + 1), W - 1, Y(ye1 + 8))
    c.grama(0, Y(278), W - 1, H - 1, sombra_topo=3)
    # contorno do morro no alto: borda arredondada contra o ceu
    for x in range(W):
        h = int(3 + 2 * math.sin(x / 17.0) + 1.5 * math.sin(x / 5.0))
        c.ret(x, Y(84) - h, x, Y(84), GRAMA[1]); c.pt(x, Y(84) - h, GRAMA[0]); c.pt(x, Y(84) - h - 1, GRAMA[3])
    for e in CEL['escadas']:
        c.escada(e['x'][0], Y(e['y'][0]), e['x'][1], Y(e['y'][1]))
    for t in CEL['terrenos']:                                              # marcos de pedra nos limites de cada terreno
        for x in (t['x'] - t['largura'] // 2, t['x'] + t['largura'] // 2 - 3): _pedra(c, x, Y(t['estrada'][0] - 1))
    return _gradar(c.mundo.crop((PAD, PAD, PAD + W, PAD + H)), hora)


def montar():
    """Devolve {aparelho: {hora: [(nome_do_plano, imagem, x, y, paralaxe)]}} + geometria + luz."""
    out = {'pc': {}, 'celular': {}}
    for h in HORAS:
        longe = plano('plano-longe', h, 640); meio = plano('plano-meio', h, 640)
        out['pc'][h] = [('sky', ceu(640, 180, h, sol={'manha': (0.32, 0.56), 'tarde': (0.27, 0.74), 'noite': (0.74, 0.55)}[h]), -80, PC['ceu_y'], 0.0), ('far', longe, -80, PC['longe_base'] - longe.height, 0.1), ('mid', meio, -80, PC['meio_base'] - meio.height, 0.3),
                        ('ground', chao_pc(h), -80, PC['chao_y'], 1.0), ('front', frente(640, h), -80, PC['frente_y'], 1.3)]
        l2 = longe.crop((60, 0, 240, longe.height)); m2 = meio.crop((100, 0, 280, meio.height))
        out['celular'][h] = [('sky', ceu(180, 120, h, 8, sol={'manha': (0.2, 0.5), 'tarde': (0.16, 0.66), 'noite': (0.3, 0.42)}[h]), 0, 0, 0.0), ('far', l2, 0, CEL['longe_base'] - l2.height, 0.1), ('mid', m2, 0, CEL['meio_base'] - m2.height, 0.3),
                             ('ground', chao_celular(h), 0, CEL['chao_y'], 1.0)]
    nuvens = {h: [nuvem(h, n) for n in range(3)] for h in HORAS}
    return out, nuvens


if __name__ == '__main__':
    out, nuv = montar()
    for ap, (W, H) in (('pc', (640, 290)), ('celular', (180, 370))):
        for h in HORAS:
            im = Image.new('RGBA', (W, H), (0, 0, 0, 255))
            for (nome, pl, x, y, par) in out[ap][h]: im.alpha_composite(pl, (x + (80 if ap == 'pc' else 0), y))
            ampliar(im, 2).save(os.path.join(sys.argv[1], 'cen-%s-%s.png' % (ap, h)))
