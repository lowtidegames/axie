"""Instala a arena nova (opaca 384x216), poe 'arena' no manifesto e refaz a folha-final com os 5 monstros do manifesto."""
import os, json
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(AQUI, '..', '..', 'public', 'piloto', 'arte'))
a = Image.open(os.path.join(AQUI, 'bruto', 'arena-nova-1.png')).convert('RGBA')
px = a.load()
for y in range(a.height):
    for x in range(a.width):
        r, g, b, _ = px[x, y]; px[x, y] = (r, g, b, 255)
a.save(os.path.join(OUT, 'arena.png'))
mp = os.path.join(OUT, 'manifesto.json')
m = json.load(open(mp))
novo = {'arena': 'arena.png'}; novo.update({k: v for k, v in m.items() if k != 'arena'})
open(mp, 'w').write(json.dumps(novo, indent=2) + '\n')
ids = ['mordedor', 'cascudo', 'rasgao', 'assombrado', 'desfiado']
f = a.resize((1152, 648), Image.NEAREST)
for i, k in enumerate(ids):
    im = Image.open(os.path.join(OUT, 'monsters', f'{k}-idle.png')).convert('RGBA').resize((192, 192), Image.NEAREST)
    f.alpha_composite(im, (30 + i * 220, 648 - 192 - 14))
f.convert('RGB').save(os.path.join(AQUI, 'folha-final.png'), optimize=True)
