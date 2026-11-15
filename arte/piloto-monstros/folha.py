import sys
from PIL import Image
# uso: folha.py saida.png escala arquivo1 arquivo2 ...
out, esc, arqs = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(a).convert('RGBA') for a in arqs]
w = max(i.width for i in ims) * esc; h = max(i.height for i in ims) * esc
f = Image.new('RGBA', (len(ims) * (w + 8) + 8, h + 16), (110, 160, 200, 255))
x = 8
for i in ims:
    f.alpha_composite(i.resize((i.width * esc, i.height * esc), Image.NEAREST), (x, 8)); x += w + 8
f.save(out)
print(out, f.size)
