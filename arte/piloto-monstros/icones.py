import sys
from pm import *
LUG = {1: 'village well', 2: 'water mill', 3: 'thorny bush gate', 4: 'stone watchtower', 5: 'castle keep'}
ELE = {'couro': 'red-orange ember flame', 'jeans': 'green leaf with thorn', 'seda': 'blue water drop with wave', 'la': 'round brown stone', 'feltro': 'golden feather swirl', 'tule': 'lilac mist puff'}
tipo, chave, tent = sys.argv[1], sys.argv[2], int(sys.argv[3]); ex = sys.argv[4] if len(sys.argv) > 4 else ''
if tipo == 'lugar':
    d = f"pixel art icon, 32x32, top-down, {LUG[int(chave)]}, 1px dark plum outline, transparent background, no text" + ex
    c = dict(description=d, image_size={'width': 32, 'height': 32}, no_background=True, outline='single color black outline', shading='basic shading', detail='medium detail', view='high top-down', text_guidance_scale=8)
    gerar('/create-image-pixflux', c, f'lugar-{chave}', tent, f'lugar-{chave}-{tent}.png')
else:
    d = f"pixel art icon, 16x16, {ELE[chave]}, 1px dark plum outline, transparent background" + ex
    c = dict(description=d, image_size={'width': 16, 'height': 16}, no_background=True, outline='single color black outline', detail='medium detail')
    gerar('/create-image-pixen', c, f'elemento-{chave}', tent, f'elemento-{chave}-{tent}.png')
