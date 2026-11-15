"""Tratamento: escolhidos (bruto/) -> finais (public/piloto/arte/). Só vizinho mais próximo; nada de suavizar."""
import os, json
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
OUT = os.path.join(RAIZ, 'public', 'piloto', 'arte')
for d in ['monsters', 'places', 'elements']: os.makedirs(os.path.join(OUT, d), exist_ok=True)
PLUM = (0x2B, 0x1E, 0x3A, 255)
LINHA_DO_PE = 63  # bbox termina aqui (exclusivo): último pixel de baixo = linha 62, 1 px de folga

ESCOLHA_IDLE = {'embolado': ('embolado-idle-3.png', False), 'mordedor': ('mordedor-idle-4.png', False), 'cascudo': ('cascudo-idle-3.png', False),
                'rasgao': ('rasgao-idle-3.png', False), 'assombrado': ('assombrado-idle-1.png', False), 'desfiado': ('desfiado-idle-2.png', True)}
ESCOLHA_ATK = {'embolado': 'embolado-attack-1.png', 'mordedor': 'mordedor-attack-1.png', 'cascudo': 'cascudo-attack-1.png',
               'rasgao': 'rasgao-attack-1.png', 'assombrado': 'assombrado-attack-1.png', 'desfiado': 'desfiado-attack-2.png'}

def abrir(nome): return Image.open(os.path.join(AQUI, 'bruto', nome)).convert('RGBA')

def limpar(im):
    """alfa 0/255 e contorno escuro de borda em ameixa #2B1E3A."""
    w, h = im.size; px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
    novo = im.copy(); np_ = novo.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0: continue
            borda = any(not (0 <= x+dx < w and 0 <= y+dy < h) or px[x+dx, y+dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if borda and max(r, g, b) < 90: np_[x, y] = PLUM
    return novo

def mover(im, dx, dy):
    f = Image.new('RGBA', im.size, (0, 0, 0, 0)); f.alpha_composite(im, (dx, dy)); return f

final = {}
for mid, (arq, espelhar) in ESCOLHA_IDLE.items():
    idle = limpar(abrir(arq))
    if espelhar: idle = idle.transpose(Image.FLIP_LEFT_RIGHT)
    b = idle.getchannel('A').getbbox()
    dx = 32 - (b[0] + b[2]) // 2; dy = LINHA_DO_PE - b[3]
    idle = mover(idle, dx, dy)
    atk = limpar(abrir(ESCOLHA_ATK[mid]))
    ba = atk.getchannel('A').getbbox()
    atk = mover(atk, dx, LINHA_DO_PE - ba[3])
    idle.save(os.path.join(OUT, 'monsters', f'{mid}-idle.png')); atk.save(os.path.join(OUT, 'monsters', f'{mid}-attack.png'))
    final[mid] = {'idle': f'monsters/{mid}-idle.png', 'attack': f'monsters/{mid}-attack.png'}

# ovo: mesma translação nos 3 estados
ovos = [limpar(abrir(n)) for n in ('ovo-inteiro-2.png', 'ovo-rachado-1.png', 'ovo-aberto-1.png')]
b = ovos[0].getchannel('A').getbbox(); dx = 32 - (b[0] + b[2]) // 2; dy = LINHA_DO_PE - b[3]
for im, nome in zip(ovos, ('egg-whole', 'egg-cracked', 'egg-open')): mover(im, dx, dy).save(os.path.join(OUT, nome + '.png'))

# lugares 32x32 e ícones 16x16
for n, arq in {1: 'lugar-1-2.png', 2: 'lugar-2-2.png', 3: 'lugar-3-2.png', 4: 'lugar-4-2.png', 5: 'lugar-5-3.png'}.items():
    limpar(abrir(arq)).save(os.path.join(OUT, 'places', f'{n}.png'))
for t, arq in {'jeans': 'elemento-jeans-1.png', 'seda': 'elemento-seda-1.png', 'la': 'elemento-la-1.png', 'feltro': 'elemento-feltro-1.png', 'tule': 'elemento-tule-2.png', 'couro': 'elemento-couro-1.png'}.items():
    limpar(abrir(arq)).save(os.path.join(OUT, 'elements', f'{t}.png'))

# cenários (sem fundo transparente, só copiar em RGBA->RGB opaco)
for dst, arq in {'arena.png': 'arena-1.png', 'nest.png': 'ninho-1.png', 'map.png': 'mapa-1.png'}.items():
    Image.open(os.path.join(AQUI, 'bruto', arq)).convert('RGB').save(os.path.join(OUT, dst), optimize=True)

man = {'monsters': final, 'arena': 'arena.png', 'nest': 'nest.png', 'map': 'map.png',
       'egg': {'whole': 'egg-whole.png', 'cracked': 'egg-cracked.png', 'open': 'egg-open.png'},
       'places': {str(i): f'places/{i}.png' for i in range(1, 6)},
       'elements': {t: f'elements/{t}.png' for t in ('jeans', 'seda', 'la', 'feltro', 'tule', 'couro')}}
json.dump(man, open(os.path.join(OUT, 'manifesto.json'), 'w'), indent=1)
print('ok')
