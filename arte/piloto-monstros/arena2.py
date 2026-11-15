import sys
from pm import *
tent = int(sys.argv[1]); extra = sys.argv[2] if len(sys.argv) > 2 else ''
d = "pixel art background, 384x216, side view, outdoor medieval tournament yard, wooden fence, small simple castle on a distant hill, long plain solid-color triangular pennants hanging on poles in red, blue, yellow and green, no symbols, no emblems, no crosses, no heraldry, no logos on flags, clear bright sky with empty space at top, flat green grass ground strip at the bottom, flat colors, 1px dark plum outlines, no characters, no text"
corpo = dict(description=d + extra, image_size={'width': 384, 'height': 216}, no_background=False, outline='single color black outline', shading='basic shading', detail='medium detail', text_guidance_scale=8, view='side')
gerar('/create-image-pixflux', corpo, 'arena-nova', tent, f'arena-nova-{tent}.png', 'pennants lisas sem simbolos')
