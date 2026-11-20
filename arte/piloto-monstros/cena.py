import sys
from pm import *
P = {
 'arena': ("pixel art background, 384x216, side view, outdoor medieval tournament yard, green grass ground strip, wooden fence, colorful pennant flags, small castle on a distant hill, clear bright sky with space at top, flat colors, 1px dark plum outlines, no characters, no text", (384, 216), False),
 'ninho': ("pixel art background, 384x216, side view, cozy straw nest on a wooden table inside a medieval stable, warm lantern light, flat colors, 1px dark plum outlines, no characters, no text", (384, 216), False),
 'mapa': ("pixel art map, 384x216, top-down view, bright medieval kingdom, winding dirt road from a village green at bottom left, past a water mill, a thorny forest edge, a stone bridge with watchtower over a river, to a castle on a hill at top right, flat colors, 1px dark plum outlines, no text", (384, 216), False),
 'ovo-inteiro': ("pixel art, 64x64, cream monster egg with small spots in green, blue, ochre, gold, lilac and red-orange, resting upright, 1px dark plum outline, 3-tone shading, transparent background, no text", (64, 64), True),
}
nome = sys.argv[1]; tent = int(sys.argv[2]); extra = sys.argv[3] if len(sys.argv) > 3 else ''
d, (w, h), nobg = P[nome]
corpo = dict(description=d + extra, image_size={'width': w, 'height': h}, no_background=nobg, outline='single color black outline', shading='basic shading', detail='medium detail', text_guidance_scale=8)
corpo['view'] = 'high top-down' if nome == 'mapa' else 'side'
if nome == 'ovo-inteiro': corpo['direction'] = 'south'
gerar('/create-image-pixflux', corpo, nome, tent, f'{nome}-{tent}.png')
