"""Mostra PNGs ampliados lado a lado sobre fundo claro. uso: python3 -I ver.py saida.png escala a.png b.png ..."""
import sys
from PIL import Image
saida, esc, arqs = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
L = 64 * esc
f = Image.new('RGB', (len(arqs) * (L + 6) + 6, L + 12), (225, 225, 220))
for i, a in enumerate(arqs):
    im = Image.open(a).convert('RGBA')
    im = im.resize((L, L), Image.NEAREST)
    f.paste(im, (6 + i * (L + 6), 6), im)
f.save(saida)
