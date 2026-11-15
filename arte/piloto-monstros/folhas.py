import os, glob
from PIL import Image, ImageDraw
AQUI = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.abspath(os.path.join(AQUI, '..', '..', 'public', 'piloto', 'arte'))
BG = (143, 211, 240, 255)
def A(p): return Image.open(p).convert('RGBA')

# 1) todas as tentativas de monstros (linhas = monstro; idle e ataque) x3
ids = ['embolado', 'mordedor', 'cascudo', 'rasgao', 'assombrado', 'desfiado']
linhas = []
for m in ids:
    fs = sorted(glob.glob(os.path.join(AQUI, 'bruto', f'{m}-idle-[0-9].png'))) + sorted(glob.glob(os.path.join(AQUI, 'bruto', f'{m}-attack-[0-9].png')))
    linhas.append(fs)
W = max(len(l) for l in linhas) * 200 + 8
f = Image.new('RGBA', (W, len(linhas) * 200 + 8), BG)
for i, l in enumerate(linhas):
    for j, p in enumerate(l): f.alpha_composite(A(p).resize((192, 192), Image.NEAREST), (8 + j * 200, 8 + i * 200))
f.convert('RGB').save(os.path.join(AQUI, 'folha-tentativas-monstros.png'), optimize=True)

# 2) escolhidos: idle em cima, ataque embaixo, x4
f = Image.new('RGBA', (6 * 264 + 8, 2 * 264 + 8), BG)
for j, m in enumerate(ids):
    for i, k in enumerate(('idle', 'attack')):
        f.alpha_composite(A(os.path.join(OUT, 'monsters', f'{m}-{k}.png')).resize((256, 256), Image.NEAREST), (8 + j * 264, 8 + i * 264))
f.convert('RGB').save(os.path.join(AQUI, 'folha-escolhidos-x4.png'), optimize=True)

# 3) lugares, ovos e ícones x6
itens = [os.path.join(OUT, 'places', f'{i}.png') for i in range(1, 6)] + [os.path.join(OUT, n) for n in ('egg-whole.png', 'egg-cracked.png', 'egg-open.png')]
ics = [os.path.join(OUT, 'elements', f'{t}.png') for t in ('jeans', 'seda', 'la', 'feltro', 'tule', 'couro')]
f = Image.new('RGBA', (8 * 200 + 8, 200 + 112 + 24), BG)
for j, p in enumerate(itens):
    im = A(p); s = 6 if im.width == 32 else 3
    f.alpha_composite(im.resize((im.width * s, im.height * s), Image.NEAREST), (8 + j * 200, 8))
for j, p in enumerate(ics): f.alpha_composite(A(p).resize((96, 96), Image.NEAREST), (8 + j * 104, 216))
f.convert('RGB').save(os.path.join(AQUI, 'folha-lugares-ovos-icones.png'), optimize=True)

# 4) cenários lado a lado (metade do tamanho, so para ver)
cs = [A(os.path.join(OUT, n)) for n in ('arena.png', 'nest.png', 'map.png')]
f = Image.new('RGBA', (3 * 392 + 8, 224), BG)
for j, im in enumerate(cs): f.alpha_composite(im, (8 + j * 392, 4))
f.convert('RGB').save(os.path.join(AQUI, 'folha-cenarios.png'), optimize=True)

# 5) folha final: 6 monstros x3 sobre a arena x3 (1152x648); linha do pé fixa
arena = A(os.path.join(OUT, 'arena.png')).resize((1152, 648), Image.NEAREST)
for k, nome in (('idle', 'folha-final.png'), ('attack', 'folha-final-ataque.png')):
    c = arena.copy()
    for j, m in enumerate(ids):
        im = A(os.path.join(OUT, 'monsters', f'{m}-{k}.png')).resize((192, 192), Image.NEAREST)
        c.alpha_composite(im, (j * 192, 590 - 192))  # pé (linha 63 x3) em y=590
    c.convert('RGB').save(os.path.join(AQUI, nome), optimize=True)
for n in os.listdir(AQUI):
    if n.endswith('.png'): print(n, os.path.getsize(os.path.join(AQUI, n)) // 1024, 'KB')
